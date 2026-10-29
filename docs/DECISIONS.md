# Utsav Decisions Log

## ADR-001: Use a lean React + TypeScript Vite skeleton for the bootstrap phase
- Context: The project needs to satisfy a full P0 governance pass with a working verify pipeline before domain features are implemented.
- Decision: Create a minimal but valid React + TypeScript app with strict linting, test coverage thresholds, and repo checks as the foundation for later feature work.
- Consequence: The repo starts with a working developer scaffold, while more advanced planning, AI, and server features remain for subsequent phases.

## ADR-002: Keep the bootstrap repo intentionally lightweight
- Context: The challenge requires a repo under 10 MB and a single main branch without extra automation.
- Decision: Avoid heavy frameworks or branch-creating automation at this stage and focus on the smallest clean stack that can satisfy verification.
- Consequence: We stay aligned with the challenge constraints while preserving a path to the later domain and deployment layers.

## ADR-003: Pure deterministic engines are the source of truth
- Context: The app must stay fully usable without Gemini, and every number must be explainable.
- Decision: Add `src/engine` with typed context, 23 rules, integer budget allocation, dependency-aware scheduling, vendor planning, and readiness scoring. All functions are pure and receive `today` by injection.
- Consequence: Core planning is testable, fast, and works offline. AI can only propose changes on top of this deterministic base.

## ADR-004: Integer budgets use largest-remainder rounding with floor enforcement
- Context: Floating-point splits can lose rupees and break the "sum equals total" invariant.
- Decision: Allocate whole rupees with largest-remainder rounding, reserve contingency first, enforce catering and venue floors, and report infeasibility with a gap and at least two options.
- Consequence: Every generated plan sums exactly to the budget and low budgets fail honestly instead of silently underfunding essentials.

## ADR-005: Keep Zod out of the client planning path
- Context: Validation is required at external trust boundaries, but shipping Zod in the initial client bundle costs roughly 13 kB gzip.
- Decision: Split strict schemas into `src/engine/schema.ts` and import them only for external input parsing. The browser planning path imports the pure engine modules directly.
- Consequence: The initial bundle stays under the 90 kB gzip budget while server and import validation still use strict schemas.

## ADR-006: Replace the raw-byte bundle check with gzip budgets
- Context: The original 250 kB raw check did not match the product requirement, which is an initial JS budget of 90 kB gzip.
- Decision: `check-size` now enforces 90 kB gzip total, 10 kB CSS gzip, and a 300 kB raw ceiling.
- Consequence: The gate measures the user-facing transfer budget instead of an arbitrary uncompressed size.
