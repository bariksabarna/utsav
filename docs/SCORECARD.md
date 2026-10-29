# Utsav — Scorecard

This is the honest state after the P1 domain-core pass. Server, AI, persistence, and deployment are still pending, so the final submission targets are not claimed yet.

| Criterion | Target | Status | Evidence |
|---|---|---|---|
| Code Quality | ≥ 99 | 90 | Strict TypeScript, ESLint `--max-warnings 0`, typed engine, TSDoc and file headers; `npm run verify` passes |
| Security | ≥ 99 | 72 | No secrets, strict Zod schema added, no `dangerouslySetInnerHTML`; Helmet, CORS, rate limits, and server validation are still pending |
| Efficiency | ≥ 99 | 95 | `check:size` passes at 278,360 bytes raw / 85,751 bytes gzip / 1,932 bytes CSS gzip; no heavy UI library; route splitting and PWA still pending |
| Testing | ≥ 99 | 82 | 30 passing tests, 100% rule fire/does-not-fire coverage, budget invariants, timeline dependencies, vendor planning, readiness; coverage and API/component sad-path suites still pending |
| Accessibility | ≥ 99 | 82 | Skip link, landmarks, one `h1`, labelled inputs, `aria-live`, text status labels, run-of-show table, 44 px targets; axe, dark/high-contrast, and keyboard audit still pending |
| Problem Statement Alignment | 100 | 78 | Budgets, timelines, vendor checklists, explainable rules, 3 event types, sub-types, Indian context, priorities, and offline-safe rules are working; GenAI ideas/assistant are still pending |

**Overall (current):** 83/100 (P1 domain core)

## Verification evidence
- `npm run verify` exits 0.
- Tests: 3 files, 30 tests passing.
- Build: 271.57 kB JS / 83.48 kB gzip; CSS 6.12 kB / 1.93 kB gzip.
- `check:size`: 278,360 bytes raw, 85,751 bytes gzip, 1,932 bytes CSS gzip.
- `check:repo`: no `.env*` files present; git not initialized in this workspace.
- `check:gemini`: skipped without an API key; manual deployment step.

## Deductions still open
- Security: no Express/Helmet/CORS/rate-limit layer yet.
- Testing: no coverage thresholds enforced yet, no property tests, API tests, or axe tests.
- Accessibility: no automated axe run or theme matrix yet.
- Alignment: GenAI ideas, streaming assistant, and plan review are not implemented yet.
- Efficiency: no route-level code splitting or PWA yet.
