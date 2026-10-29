# Utsav — AI Celebration & Event Planner
## Product Requirements Document (PRD) v1.0

**Challenge:** [Challenge 5] Celebration & Event Planner
**Event:** Prompt Wars: Build with AI — Hack2Skill × Google for Developers
**Repo name (suggested):** `utsav-ai-event-planner`
**Target outcome:** composite score ≥ 99 / 100 across Code Quality, Security, Efficiency, Testing, Accessibility, Problem Statement Alignment

> *Utsav* (उत्सव / উৎসব) = "celebration". The product helps anyone — not just professional planners — turn "I need to organise a wedding / birthday / community event" into a concrete, costed, scheduled, vendor-ready plan in under two minutes, then keep it on track with an AI assistant.

---

## 1. Problem, vision, and positioning

### 1.1 Problem
Planning a celebration is a multi-variable decision problem (date, guests, money, culture, season, vendors) that most people solve with scattered WhatsApp threads, spreadsheets, and guesswork. The result: blown budgets, missed bookings, last-minute panic, and forgotten basics (permits, rain backup, dietary needs).

### 1.2 Vision
A **context-aware planning assistant** that:
1. Understands the user's situation (event type, culture, guests, money, date, location tier, season, dietary needs).
2. Makes **explainable decisions** (budget split, task timing, vendor checklists) with a deterministic rules engine — so it works instantly, offline, and without an API key.
3. Uses **Gemini** for what only GenAI does well: personalised ideas, natural-language planning chat, and plan review.
4. Always lets the human confirm any AI-proposed change.

### 1.3 Design principle: "Rules first, AI second"
Everything that must be correct (money adds up, dates make sense, checklists are complete) is computed by pure, tested TypeScript. Gemini enriches; it never silently mutates the plan. If AI is down, rate-limited, or unconfigured, the product degrades to curated content — it never breaks.

### 1.4 Non-goals
- No payments, ticketing, or vendor marketplace.
- No guest-list/RSVP management (out of scope; noted as future work).
- No real-time multi-user collaboration (future work).
- No storage of guests' personal data (phones, emails). Privacy by minimisation.

---

## 2. Users and personas

| Persona | Context | Core need | Key scenario |
|---|---|---|---|
| **Riya (28), sibling-of-the-bride** | Bengali wedding in Kolkata, 250 guests, ₹15 L, 4 months out | "Tell me where the money should go and what to book first." | S1 |
| **Arjun (34), parent** | 7th birthday, tier-2 city, 40 guests (20 kids), ₹60 K, 3 weeks out, vegetarian | Fast, kid-safe, low-stress plan with fresh theme ideas | S2 |
| **Mr. Das (55), society secretary** | Community Durga Puja in a tier-3 town, ~1,500 footfall, ₹4 L, outdoors, 90 days | Permits, volunteers, transparent accounts, rain plan | S3 |
| **Meera (41), screen-reader user** | Plans family functions using NVDA/TalkBack, Hindi UI | Fully keyboard/screen-reader operable, announcements for dynamic changes | all |
| **Low-bandwidth user** | Android phone on 3G/4G, data-conscious | Fast first load, offline-tolerant | all |

---

## 3. Goals and success metrics

### 3.1 Product goals
| ID | Goal | Metric / target |
|---|---|---|
| G1 | Fast first plan | Onboarding → full plan ≤ 90 s, ≤ 8 inputs required |
| G2 | Trustworthy numbers | Budget allocation sums exactly to total in 100 % of generated plans (property-tested) |
| G3 | Context sensitivity | ≥ 22 documented rules; every rule has "fires" and "does not fire" tests |
| G4 | AI that helps, not hijacks | 100 % of AI plan changes require explicit user confirmation + Undo |
| G5 | Works without AI | 100 % of P0 features usable with AI disabled |
| G6 | Inclusive | WCAG 2.2 AA; Lighthouse a11y = 100; zero axe violations on all routes/themes |
| G7 | Lightweight | Initial JS ≤ 90 kB gzip; LCP < 2.0 s on mobile 4G profile |

### 3.2 Competition scorecard (the real KPI)
| Criterion | Target | How the product is designed to hit it |
|---|---|---|
| Code Quality | ≥ 99 | Strict TS, ESLint `--max-warnings 0`, mandatory TSDoc, file headers, comment-density gate, complexity limits, no circular deps, rich README + ARCHITECTURE |
| Security | ≥ 99 | Helmet + strict CSP, rate limiting (default key generator!), Zod validation, CORS allow-list, Secret Manager, prompt-injection defences, Firestore rules, non-root container, CI audit + CodeQL |
| Efficiency | ≥ 99 | Local-first engines, lazy routes, < 5 font files, inline SVG icons, hashed immutable assets, plain-`node` server, slim multistage image, Gemini caching/backoff, warm-keeping ping |
| Testing | ≥ 99 | 100 % coverage thresholds, unit + property + integration + component + a11y tests, FR-ID-tagged tests with automated traceability check |
| Accessibility | ≥ 99 | Skip link, landmarks, one `<h1>`, `aria-live` on dynamic regions, focus management, chart table alternatives, reduced-motion, forced-colors, 3 languages |
| Problem Statement Alignment | 100 | Every verb in the problem statement → visible, tested feature (matrix below) |

---

## 4. Problem-statement traceability matrix

> *"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."*

| Phrase in problem statement | Feature | Where it lives | Proof (test/doc) |
|---|---|---|---|
| "GenAI-powered" | Gemini ideas, planning chat with tool-calling, plan review | F6, F7 | `server/llm/*.test.ts`, API tests with mocked Gemini |
| "planning assistant" | Conversational assistant that can *propose* budget/task/vendor changes (user confirms) | F7 | component + reducer tests |
| "smart, dynamic" | Plan recomputes live when inputs change (what-if, date shift, guest change) | F3, F4 | property tests |
| "weddings" | 7 wedding sub-types with ritual/function-aware templates | F1, F2 | template tests |
| "birthdays" | Kids / milestone / surprise templates, age-aware rules | F1, F2 | rule tests |
| "community events" | Puja/society fest/fundraiser/college fest; permits, volunteers, safety, transparent ledger | F1, F2, F5 | rule + checklist tests |
| "budgets" | Allocation engine, feasibility check, tracking (planned vs actual), what-if | F3 | 100 % coverage + property tests |
| "timelines" | Backward-scheduled tasks, rush mode, phases, day-of run-of-show, calendar export | F4, F10 | scheduler tests |
| "vendor checklists" | Per-category must-ask questions, contract checklist, status pipeline, quote comparison | F5 | checklist tests |
| "personalized ideas" | Gemini ideas shaped by culture, vibe, age, diet, season, budget; save/lock/regenerate | F6 | schema + fallback tests |
| "Logical decision making based on user context" | Rules engine + "Why this plan?" explainer | F2 | one test pair per rule |
| "Practical and real-world usability" | INR/lakh formatting, Indian festival/season awareness, permits, offline PWA, 3 languages | F11, F12 | e2e smoke, i18n tests |

---

## 5. Feature specification

Priority: **P0** = must ship, **P1** = should ship, **P2** = only after every gate is green.

### F1 — Smart onboarding & context capture (P0)
**Story:** As a user, I answer a few friendly questions and get a complete starter plan.
**Inputs:** event type → sub-type; date; guest count; total budget (+ currency); city tier (1/2/3) or city name; venue type (indoor hall / outdoor / home / community ground); vibe tags; dietary needs; top-3 priorities; language.
**Acceptance:**
- Given a missing required field, when the user presses *Next*, then focus moves to the first invalid field and an error summary is announced (`role="alert"`).
- Given valid inputs, when the user finishes, then a plan (budget + timeline + vendor checklist + 6 ideas seed) is generated locally in < 300 ms with no network call.
- Every step is keyboard operable, with a visible progress indicator (`aria-current="step"`).

### F2 — Rules engine & "Why this plan?" explainer (P0)
**Story:** As a user, I want to understand why the plan looks this way.
**Acceptance:** each rule that fires is listed in plain language (translated) with its effect ("Added rain backup because outdoor + monsoon"); rules are pure functions with IDs `R-001…`.

### F3 — Budget planner (P0)
**Capabilities:** category allocation from template + context; priority boost; contingency reserve; feasibility check with actionable suggestions; per-head view; planned/estimated/actual tracking; status badges (not colour-only); what-if sliders for budget and guests; donut + stacked bar with data-table alternative.
**Acceptance:**
- Σ allocations = total budget exactly (integer currency units).
- Infeasible budget shows the **gap** and ≥ 2 concrete options (e.g., "Reduce to ≈ 180 guests", "Switch to community hall").
- Editing an actual amount updates totals and announces "Catering is 8 % over plan" via `aria-live="polite"`.

### F4 — Timeline planner (P0)
**Capabilities:** backward scheduling from event date with lead times and dependencies; phases (Foundation → Booking → Detailing → Final Countdown → Event Day → Post-event); overdue / due-soon states; **rush mode** if the date is too close; day-of run-of-show; mark done; export.
**Acceptance:**
- No task is scheduled after a task that depends on it.
- If days-remaining < critical path, rush mode activates, flags at-risk tasks, and offers a "skip / compress" list.
- Each task has "Add to Google Calendar" link and the whole timeline exports as `.ics`.

### F5 — Vendor checklist manager (P0)
**Capabilities:** categories relevant to the context (caterer, venue, photographer, decorator, entertainment, permits, etc.); per category: must-ask questions, contract/document checklist, red flags, typical lead time, budget share; pipeline status (To shortlist → Contacted → Quote received → Booked → Paid); quote comparison with price-per-head normalisation; "Find on Google Maps" deep link (no API key).
**Acceptance:** status change is announced; booked vendors count feeds readiness score; quote table sortable via buttons (not drag).

### F6 — Personalised ideas (Gemini) (P0)
**Capabilities:** idea cards for theme, menu, decor, entertainment, favours/games; shaped by culture, vibe, age, dietary needs, season, budget tier, language; save / lock / regenerate; each idea shows a rough cost band and "why this fits you".
**Acceptance:**
- Response validated against a Zod schema; invalid → one repair attempt → curated fallback ideas (labelled "Curated suggestions").
- Locked ideas persist across regeneration.
- Loading state announced; errors have a retry button.

### F7 — AI planning assistant (P0)
**Capabilities:** streaming chat; knows a compact digest of the plan; can **propose** patches via Gemini function calling (`propose_budget_change`, `propose_task`, `propose_reschedule`, `propose_vendor_category`, `propose_idea_shortlist`); user sees a diff-style card with **Apply / Dismiss** and a global **Undo**.
**Acceptance:** no patch applies without confirmation; prompt-injection attempts in user text or imported data never trigger tools outside the allow-list; stream is announced politely and not read token-by-token (buffered by sentence).

### F8 — Dashboard & readiness score (P0)
Event countdown; readiness score (0–100) with explanation; budget health; next 5 tasks; vendors booked; risk flags (from rules); "What should I do next?" card (deterministic, with optional AI plan review).

### F9 — Persistence & optional sync (P0 local, P1 cloud)
Local-first (IndexedDB with localStorage fallback). Optional **Sign in with Google** (Firebase Auth) to sync to Firestore; Firebase SDK is lazy-loaded only when the user opts in. Import/export JSON backup.

### F10 — Export & share (P0)
`.ics` calendar, CSV (opens in Google Sheets/Excel) for budget and vendors, print-optimised view ("Save as PDF"), JSON backup. Google Calendar "add event" template links per task.

### F11 — Preferences & inclusivity (P0)
Language: English / हिन्दी / বাংলা. Currency: INR default (lakh/crore grouping via `Intl`), plus USD/EUR/GBP. Theme: light / dark / system / high-contrast. Text size and reduced-motion toggles. All stored locally.

### F12 — PWA / offline (P1)
Installable, offline shell + local plan; online/offline status announced.

### F13 — Resilience (P0)
AI client uses timeout, retry with jitter, model fallback chain, circuit breaker, in-memory cache; failures degrade to curated content with a clear, non-alarming message.

### P2 / stretch (only after all gates are green)
- Firebase AI Logic adapter as alternative provider.
- Gemini grounding with Google Search for "current local trends" (quota-aware).
- Vendor shortlist sharing via read-only link.

---

## 6. Experience & information architecture

**Routes:** `/` (landing + start) · `/plan/new` (wizard) · `/plan` (dashboard) · `/plan/budget` · `/plan/timeline` · `/plan/vendors` · `/plan/ideas` · `/plan/assistant` · `/settings` · `/about` (privacy, how decisions are made).
**Shell:** skip link → header (logo, language, theme) → primary nav (bottom tab bar on mobile, side rail on desktop) → `<main id="main-content">` → footer.
**Tone:** warm, celebratory, plain language; no jargon; inclusive of all cultures and family structures.
**Empty / loading / error states** are designed for every screen (see Stitch prompt).

---

## 7. Google ecosystem usage (all free tier)

| Google product | Use | Notes |
|---|---|---|
| **Gemini API (Google AI Studio free tier)** via `@google/genai` | Ideas (structured JSON), assistant (streaming + function calling), plan review | Server-side only; key in Secret Manager; verify current model IDs and limits at build time |
| **Google AI Studio** | Obtain API key; prompt prototyping | — |
| **Google Antigravity** | Build the project agentically | Kickoff prompt provided |
| **Stitch (Google Labs)** | UI design generation → HTML/CSS reference | Prompts provided |
| **Cloud Run** | Express API container (scale-to-zero) | Free tier; region `asia-south1`; billing account required (stay within free tier; set budget alert) |
| **Secret Manager** | `GEMINI_API_KEY` | Free tier covers a few secrets |
| **Cloud Build / Artifact Registry** | Source deploys | Within free allowances |
| **Cloud Scheduler** | Keep-warm ping to `/healthz` | 3 free jobs |
| **Cloud Logging / Error Reporting** | Structured JSON logs (no PII) | Free allotment |
| **Firebase Hosting** | Static CDN for the SPA; rewrites `/api/**` to Cloud Run | Spark plan |
| **Firebase Auth** | Optional Google sign-in / anonymous | Lazy-loaded |
| **Firestore** | Optional cloud sync with strict rules | Free quota |
| **Firebase App Check** | Abuse protection (stretch) | — |
| **Google Calendar (template links + .ics)** | Add tasks to calendar | No OAuth, no key |
| **Google Maps (deep links)** | "Find vendors near me" | No API key, no cost |
| **Google Sheets (via CSV)** | Budget/vendor export | No API |
| **Google Fonts (self-hosted subset)** | One variable Latin font | Self-hosted to avoid third-party requests |
| **Lighthouse CI** | Perf/a11y/best-practice/SEO budgets in CI | Open source |
| **Workbox** | PWA service worker | Via `vite-plugin-pwa` |
| **Chrome DevTools / axe-core** | Manual + automated a11y checks | — |

---

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Gemini free-tier rate limits / model ID changes | AI features fail during judging | Model fallback chain from env; `check:gemini` script; cache; circuit breaker; curated fallback so UX never breaks |
| Prior-round lesson: deployed AI failing (bad key/model) | Efficiency/PSA deductions | Deployment gate: live `curl` of `/api/v1/ideas` must return `source:"gemini"` before submit |
| Prior-round lesson: cold starts | Efficiency deduction | Static SPA on Firebase Hosting CDN; Cloud Run with CPU boost + Scheduler ping; slim image |
| Prior-round lesson: heavy fonts/icons | Efficiency deduction | One Latin font; Indic scripts via system stack; inline SVG icons |
| Prior-round lesson: low comment density | Code Quality deduction | Automated doc-density + TSDoc gates in CI and pre-commit |
| Scope creep | Unfinished features | Strict P0/P1/P2 tiers; Antigravity must not start P2 until all gates green |
| Repo rules (single branch, < 10 MB, public) | Disqualification | `check:repo` script; **do not enable Dependabot** (it opens branches); no screenshots > 60 kB |
| Prompt injection | Security deduction | Instruction/data separation, schema validation, tool allow-list, human confirmation |
| Indicative cost data being wrong | Trust | Clearly labelled "indicative benchmarks, editable"; all numbers user-overridable |

---

## 9. Release plan (build phases)

| Phase | Output | Exit gate |
|---|---|---|
| P0 Bootstrap | Repo, tooling, CI, docs skeleton, thresholds | `npm run verify` passes on empty app |
| P1 Domain core | Types, schemas, data tables, 4 engines + rules | 100 % coverage, property tests green |
| P2 Server | API, middleware, Gemini provider + fallback | API tests green, security headers verified |
| P3 Design system | Tokens, UI kit, shell, i18n, preferences | axe clean on kit stories/routes |
| P4 Features | F1–F8, F10 | All FR-tagged tests green |
| P5 Persistence & PWA | Local + optional Firebase sync, offline | Offline test + rules tests |
| P6 Hardening | Security, a11y, efficiency, docs passes | Scorecard ≥ 99 each |
| P7 Deploy | Docker, Firebase, Cloud Run, Scheduler | Live checks pass |
| P8 Freeze | Red-team audit, README polish | Final checklist 100 % |

---

## 10. Assumptions (also restated in README)

1. Cost benchmarks (per-plate, venue, vendor shares) are **indicative** for Indian city tiers and editable by the user; other currencies use a documented approximate scaling factor.
2. Dates and seasons use the Northern-Hemisphere / Indian season calendar (summer, monsoon, autumn/festive, winter).
3. Regulatory items (police/municipal permission, fire safety, alcohol, loudspeaker rules) are presented as **"verify with local authority"** reminders, not legal advice.
4. No personal data of guests is collected; plan data stays on-device unless the user opts into sync.
5. AI output is advisory; the user always confirms changes.
6. Gemini free-tier quotas are limited; the product must remain fully usable without them.

---

## 11. Golden scenarios (used as test fixtures)

| ID | Scenario | Expected highlights |
|---|---|---|
| **S1** | Bengali wedding, tier-1 city, 250 guests, ₹15,00,000, 120 days, priorities: catering, photography, decor | Multi-function categories; photography/catering boosted; 7–10 % contingency; peak-season lead-time uplift rule fires |
| **S2** | 7th birthday, tier-2, 40 guests (20 kids), ₹60,000, 21 days, vegetarian, theme interest "dinosaurs" | Kid-safety + entertainer tasks; no alcohol items; frugal rules may fire; ideas honour dietary + age |
| **S3** | Community Durga Puja, tier-3, ~1,500 footfall, ₹4,00,000, 90 days, outdoor, autumn | Permits/NOC, volunteers, sanitation, first aid, rain backup, transparent donation ledger |
| **S4** | Wedding, 500 guests, ₹2,00,000 | Infeasible → gap + options; no crash |
| **S5** | Wedding in 20 days | Rush mode, at-risk flags, compress/skip list |
| **S6** | AI unavailable (no key / 429 / timeout) | Fallback ideas + clear message; everything else works |
| **S7** | Prompt-injection text in assistant input | No tool outside allow-list; no secret leakage; safe refusal |
