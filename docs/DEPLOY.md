# Deployment Guide

Utsav has two deployable parts: the Vite client (`dist/`) and the Express API
(`dist-server/index.js`). The API also serves `dist/` when present, so a single
Cloud Run container is a complete deployment. Firebase Hosting is the preferred
edge for the static client and proxies `/api/**` to Cloud Run.

## Prerequisites

- Node.js 20+ and npm (see `.nvmrc`)
- Docker for local container testing
- `gcloud`, `firebase-tools`, and a Google Cloud project with billing enabled
- A Gemini API key stored in Secret Manager (optional; fallback content works
  without one)

## Local Development

```bash
npm install
npm run dev:server
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8080`. Copy
`.env.example` to `.env` for server overrides. Never commit `.env`.

## Build And Verify

```bash
npm run build
npm run verify
```

`build` typechecks the client and server, builds the Vite bundle, and bundles
the API with esbuild. `verify` includes lint, tests, docs/trace checks, bundle
budgets, PWA checks, repository checks, WCAG contrast checks, and security
checks.

## Container

```bash
docker build -t utsav .
docker run --rm -p 8080:8080 --env-file .env utsav
curl http://localhost:8080/api/health
```

The image runs as the non-root `node` user, exposes port 8080, and has a
container health check against `/api/health`.

## Google Cloud Setup

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=asia-south1
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com firebase.googleapis.com

printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- --replication-policy=automatic
```

If the secret already exists, add a new version:

```bash
printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
```

Grant the Cloud Run runtime service account access to the secret. With the
default compute service account:

```bash
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## One-Command Deploy

```bash
cp .firebaserc.example .firebaserc
# set the default project id in .firebaserc
./scripts/deploy.sh "$PROJECT_ID"
```

The script builds and runs local gates, deploys `utsav-api` to Cloud Run with
`GEMINI_API_KEY` from Secret Manager, checks `/api/health`, then deploys the
client to Firebase Hosting.

### Manual API Deploy

```bash
gcloud run deploy utsav-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 40 \
  --timeout 60 \
  --set-env-vars "NODE_ENV=production,ALLOWED_ORIGINS=https://PROJECT_ID.web.app,https://PROJECT_ID.firebaseapp.com" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest"
```

### Manual Hosting Deploy

```bash
npm run build
firebase deploy --only hosting --project "$PROJECT_ID"
```

`firebase.json` rewrites `/api/**` to the `utsav-api` Cloud Run service in
`asia-south1`. Update both service name and region there if you rename them.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Enables production behavior and HSTS |
| `PORT` | `8080` | API listen port |
| `ALLOWED_ORIGINS` | localhost dev origins | Comma-separated CORS allow-list |
| `GEMINI_API_KEY` | empty | Optional Gemini access; never commit it |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Primary model |
| `GEMINI_FALLBACK_MODEL` | `gemini-2.5-flash-lite` | Retry/fallback model |
| `AI_RPM_BUDGET` | `10` | Per-client AI requests per minute |
| `AI_CACHE_TTL_MS` | `300000` | AI response cache lifetime |

## Verification After Deploy

```bash
curl -fsS https://PROJECT_ID.web.app/api/health
curl -fsSI https://PROJECT_ID.web.app/
npx lighthouse https://PROJECT_ID.web.app --only-categories=pwa,performance,accessibility,best-practices,seo
```

Confirm the response includes CSP, HSTS, `X-Content-Type-Options`, and
`Referrer-Policy`; confirm `/manifest.webmanifest` and `/sw.js` return 200; and
confirm the app loads once, then reloads with the network disabled.

## Rollback

```bash
gcloud run revisions list --service utsav-api --region asia-south1
gcloud run services update-traffic utsav-api \
  --region asia-south1 \
  --to-revisions REVISION_NAME=100
firebase hosting:rollback --project "$PROJECT_ID"
```

## Operations Notes

- Keep the Gemini key in Secret Manager, rotate it there, and never expose it to
  the client or build output.
- Cloud Run scales to zero; use Cloud Scheduler only if cold-start latency is a
  problem for a demo.
- Monitor `/api/health`, Cloud Run request latency/error rate, and AI fallback
  frequency. The API never requires Gemini to return a plan.
- The repository target is under 10 MB and the only long-lived branch is `main`.
