#!/usr/bin/env bash
# Deploy the Utsav API to Cloud Run and the static client to Firebase Hosting.
# Usage: ./scripts/deploy.sh <gcp-project-id>
set -euo pipefail

PROJECT_ID="${1:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-utsav-api}"
SECRET_NAME="${SECRET_NAME:-gemini-api-key}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: $0 <gcp-project-id>" >&2
  exit 1
fi

for command in gcloud firebase npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [[ ! -f .firebaserc ]]; then
  echo "Missing .firebaserc. Copy .firebaserc.example and set the project id." >&2
  exit 1
fi

npm ci
npm run build
npm run check:pwa
npm run check:security

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 40 \
  --timeout 60 \
  --set-env-vars "NODE_ENV=production,ALLOWED_ORIGINS=https://${PROJECT_ID}.web.app,https://${PROJECT_ID}.firebaseapp.com,GEMINI_MODEL=gemini-2.5-flash,GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite,AI_RPM_BUDGET=10,AI_CACHE_TTL_MS=300000" \
  --set-secrets "GEMINI_API_KEY=${SECRET_NAME}:latest"

API_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
if [[ -z "$API_URL" ]]; then
  echo "Could not resolve the Cloud Run service URL." >&2
  exit 1
fi

node -e "fetch(process.argv[1] + '/api/health').then(async (response) => { if (!response.ok) throw new Error(await response.text()); console.log('API health OK:', await response.text()); }).catch((error) => { console.error(error.message); process.exit(1); });" "$API_URL"

firebase deploy --only hosting --project "$PROJECT_ID"
echo "Deployed API: $API_URL"
echo "Deployed client: https://${PROJECT_ID}.web.app"
