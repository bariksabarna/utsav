# Security

## Overview
This repo follows a conservative security posture for a challenge app.

## Principles
- Keep secrets in local environment variables and never commit them.
- Validate inputs and trust boundaries.
- Restrict AI tool usage to explicit user-confirmed patches.
- Do not log sensitive plan or user content.

## Threat model
- Untrusted user input is allowed in conversation and import flows.
- AI outputs are treated as untrusted until schema validation succeeds.
- Local persistence must remain safe and portable without exposing secrets.

## Current bootstrap status
This is the initial governance and scaffolding stage. Production-grade security hardening remains planned for the next implementation phases.
