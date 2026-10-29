# Utsav project rules (non-negotiable)
1. Single branch `main`. Repo < 10 MB. No secrets. No Dependabot/bots creating branches.
2. Rules first, AI second: every P0 feature works without Gemini; AI only *proposes* patches; user confirms; Undo exists.
3. TypeScript strict, no `any`. Money is integers. Clock/LLM/repository injected.
4. TSDoc on every export, header on every file, comment density ≥ 12 % (non-test files > 30 lines). Write docs before code.
5. 100 % coverage thresholds; tests tagged with FR IDs; sad paths always.
6. A11y: skip link, landmarks, one h1, focus on route change, aria-live for dynamic values, tables for charts, ≥ 44 px targets, 4.5:1 contrast, reduced-motion, forced-colors.
7. Security: Helmet strict CSP, CORS allow-list, default rate-limit keyGenerator + trust proxy, Zod `.strict()` everywhere, no dangerouslySetInnerHTML, charCodeAt control-char stripping, secrets via env/Secret Manager, no content in logs.
8. Efficiency: ≤ 90 kB gz initial JS, ≤ 2 font files (≤ 60 kB), inline SVG icons, lazy routes, immutable hashed assets, compression, plain `node` server, slim non-root image, Gemini cache + backoff.
9. Never lower thresholds or add blanket disables. Record decisions in docs/DECISIONS.md; progress in docs/PROGRESS.md; honest scoring in docs/SCORECARD.md.
10. Verify Gemini model IDs/quotas with `npm run check:gemini` — never trust memory.
