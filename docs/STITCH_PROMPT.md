# Utsav — Stitch (Google Labs) Prompt Pack

Use at **stitch.withgoogle.com**. Stitch works best with **one design-system prompt first, then one prompt per screen** in the same project. Pick the highest-quality Gemini model option Stitch offers (UI labels change; choose the "pro / experimental" style option if present).

## How to use this pack
1. Create a new project → platform **Web** (desktop-first). Paste **MASTER PROMPT** and generate the first screen (Screen 1).
2. For each next screen, paste the **SCREEN prompt** (they all re-state the design system in one line so Stitch stays consistent).
3. After all screens exist, switch to **Mobile** and regenerate Screens 1, 2, 3, 5 using the **MOBILE VARIANT** prompt.
4. Run the **REFINEMENT PROMPTS** (accessibility, dark mode, states) on the screens that need them.
5. Export: **Copy code / Download HTML+CSS** for each screen → save into `design/stitch/` in the repo (keep the folder < 500 kB; no big PNGs; optionally one ≤ 60 kB WebP preview per screen).
6. Tell Antigravity: *"Use `design/stitch/*` as visual reference only; re-implement as React components using tokens in `client/src/styles/tokens.css`. Do not copy inline styles, external fonts, icon fonts, or CDN scripts."*

> **Hard constraints for anything Stitch generates (we will re-implement, but keep the design compatible):** no icon fonts (use simple outline icons that can be inline SVG), no more than **one font family**, no gradients behind text, no text inside images, no tiny text, every interactive element ≥ 44 px, all text ≥ 4.5:1 contrast.

---

## MASTER PROMPT (paste first)

```
Design a responsive web app called "Utsav" — an AI Celebration & Event Planner that helps people organise weddings, birthdays and community events (like Durga Puja or society festivals) with budgets, timelines, vendor checklists and personalised ideas. Audience: ordinary families and community organisers in India, ages 20–65, many on mid-range Android phones, some using screen readers, UI available in English, Hindi and Bengali.

BRAND & MOOD: warm, celebratory, trustworthy, calm — never childish, never cluttered. Think "a very organised, kind friend". Subtle festive touches (a small marigold-petal motif, soft rounded shapes) but the interface itself is clean and spacious.

DESIGN TOKENS (use exactly):
- Font: one family only — "Plus Jakarta Sans" (headings 700–800, body 400–500). Sizes: 14 caption, 16 body (base), 18 lead, 24 h3, 32 h2, 44 h1. Line-height 1.5 body, 1.2 headings. Minimum body size 16px.
- Light theme: background #FFFBF5 (ivory), surface #FFFFFF, surface-alt #F6EFE6, border #D9CFC2, text #1F1630, text-muted #5B5470, primary #4A2C82 (deep indigo; white text on it), primary-hover #3B2268, accent #F5A623 (marigold; use #1F1630 text on it), success #166534, warning #92400E, danger #B91C1C, info #1D4ED8, focus-ring #1D4ED8 (3px, 2px offset).
- Dark theme: background #130F1F, surface #1D1730, surface-alt #271F3F, border #4A4166, text #F4F0FA, text-muted #C4BBD6, primary #B9A4F5 (dark text #130F1F on it), accent #F5B94A, success #4ADE80, warning #FBBF24, danger #F87171.
- Radius: 12px cards, 999px chips/pills, 10px inputs. Spacing scale 4/8/12/16/24/32/48. Shadows very soft (0 1px 2px / 0 4px 12px at 8% opacity).
- Status is NEVER colour-only: always an icon + a text label.
- Icons: simple 2px-stroke outline icons (lucide style), 20–24px, always paired with text labels for primary actions.

LAYOUT: desktop = left navigation rail (240px) + content (max 1100px) + optional right "Assistant" drawer (360px). Mobile = top app bar + content + bottom tab bar (5 tabs: Home, Budget, Timeline, Vendors, Ideas) with a floating "Ask Utsav" button. First element on every page is a visible-on-focus "Skip to main content" link. Footer with privacy note.

COMPONENT LIBRARY to include: primary/secondary/ghost/danger buttons (min 44px tall), text input with label above + helper + error state, select, segmented control, chips (selectable), checkbox/radio with large hit areas, toggle switch with text state, stepper (wizard progress), progress bar with numeric label, card, stat tile, badge with icon+text, data table with sortable column buttons, accordion, tabs, toast (polite), modal dialog, empty state, skeleton loader, confirm-change card (diff style: Before → After, buttons "Apply" and "Dismiss"), chat bubbles, donut chart WITH a legend that includes values AND a "View as table" toggle.

TONE OF COPY: friendly, plain, short sentences. Use realistic Indian sample data (₹ with lakh grouping, e.g. ₹15,00,000), names like Riya, Arjun, Mr. Das.

Generate Screen 1 now: the LANDING page — hero with headline "Plan your celebration in two minutes", sub-text "Budget, timeline, vendors and ideas — tailored to your event and your city.", three event-type cards (Wedding, Birthday, Community event) as large selectable buttons with icon + one-line description, a primary button "Start planning", secondary "Try a sample plan", a 3-step "How Utsav decides" strip (1 Tell us about your event → 2 We apply smart rules → 3 You get an explainable plan), a small trust row ("Works offline • Your data stays on your device • Free"), and a language switcher (English / हिन्दी / বাংলা) and theme toggle in the header.
```

---

## SCREEN 2 — Onboarding wizard

```
Utsav design system as defined (indigo #4A2C82, marigold #F5A623, ivory #FFFBF5, Plus Jakarta Sans, 44px targets, status never colour-only).
Design the PLAN WIZARD screen, step 2 of 5 ("Your event details"), desktop. 
Top: stepper with 5 steps (1 Event type, 2 Details, 3 Budget & place, 4 Preferences, 5 Review), current step highlighted with number + label, completed steps with check icon + text "Done".
Form (single column, max 640px): 
- "Event name" text input with helper "e.g. Riya & Arjun's Wedding".
- "Event date" date input with helper showing "128 days to go" (live).
- "Event type details" as selectable chips (for Wedding: Bengali, North Indian, South Indian, Christian, Muslim, Court, Destination).
- "Number of guests" number input with +/- buttons, and an optional "Children" input.
- "Start time" time input.
Show an ERROR STATE for the date field ("Please choose a date from today onwards") with an error icon, red text AND an error summary banner at the top of the form listing the problem with a link that jumps to the field. 
Bottom bar: "Back" (secondary) and "Next" (primary). Right side on desktop: a sticky "Your plan so far" summary card (event type, date, guests) that updates live and is announced politely. 
Include a "Skip to main content" link at the very top.
```

## SCREEN 3 — Wizard steps 3–5 (budget, preferences, review)

```
Utsav design system as defined.
Design three compact wizard states in one frame group:
(3) "Budget & place": total budget input with ₹ prefix and lakh formatting preview ("₹15,00,000 — fifteen lakh"), city tier segmented control (Metro / Large city / Town) with a "How do we use this?" info disclosure, venue type radio cards (Indoor hall, Outdoor, Home, Community ground, Destination), currency select.
(4) "Preferences": dietary chips (Vegetarian, Vegan, Jain, Halal, No beef, No pork, Gluten-free, Nut-free), vibe chips (Traditional, Modern, Rustic, Royal, Minimal, Fun), "Top 3 priorities" ranked picker with up/down buttons (NOT drag-and-drop) from categories (Catering, Photography, Decor, Music & entertainment, Venue, Attire), toggles for "Serving alcohol", "Elderly guests attending", "Live music / DJ", "Multi-day event".
(5) "Review": two-column read-only summary with "Edit" links per section and a primary "Create my plan" button, plus a short note "Everything is calculated on your device. AI ideas are optional."
```

## SCREEN 4 — Dashboard

```
Utsav design system as defined. Design the DASHBOARD for "Riya & Arjun's Wedding" (Bengali wedding, 250 guests, ₹15,00,000, 128 days to go).
Header row: event title (h1), date + location, large countdown tile "128 days to go".
Row of 4 stat tiles: Readiness score 42/100 (with progress ring AND the text "Getting started"), Budget used ₹2,10,000 of ₹15,00,000 (14%) with progress bar + text, Tasks done 6 of 41 (15%), Vendors booked 1 of 9.
Left column: "Next 5 tasks" list — each row has a checkbox-style toggle button, task title, due date, and a badge with icon+text (Overdue / Due soon / On track / At risk). Include one "At risk" item: "Book venue — recommended 150 days before".
Right column: "Why this plan?" card listing 4 fired rules in plain language with a small rule-ID chip (e.g. R-012 "Peak wedding season: we added +30% lead time for venue and caterer"), and "Risk flags" card with 2 flags (icon + text + suggested fix).
Bottom: "What should I do next?" highlighted card with one recommended action and a primary button "Do it now", plus a secondary "Ask Utsav" button that opens the assistant drawer.
```

## SCREEN 5 — Budget

```
Utsav design system as defined. Design the BUDGET screen.
Top: total budget ₹15,00,000, per-guest ₹6,000, contingency reserve ₹1,05,000 (7%), a live region note "Budget is balanced" with a check icon.
Main: a donut chart (categories: Venue, Catering, Decor, Photography, Attire & beauty, Music & entertainment, Rituals & priest, Invitations, Transport, Gifts, Contingency) with a legend that lists each category, amount and % — and a "View as table" toggle button that switches the chart to an accessible table. Use distinguishable patterns/labels, not only colours.
Below: a category table with columns Category | Planned | Estimated | Actual | Status. Status badges: "On track" (check), "Near limit" (alert-triangle), "Over by ₹12,000" (alert-circle). Numeric cells are editable inline inputs with labels. Column headers are sort buttons.
Right panel "What if?": two sliders with numeric inputs (Budget, Guests) showing deltas ("+₹1,20,000 for Catering if guests drop to 200") and buttons "Preview" and "Apply changes".
Also show an INFEASIBLE state card variant: "Your budget is ₹3,10,000 short for 500 guests in a Metro" with two option cards: "Reduce to about 310 guests" and "Switch to a community hall", each with an "Apply" button.
```

## SCREEN 6 — Timeline

```
Utsav design system as defined. Design the TIMELINE screen.
Top: phase tabs (Foundation, Booking, Detailing, Final countdown, Event day, Post-event) with task counts. A banner variant for RUSH MODE: "Your event is 20 days away — we compressed the schedule" with an info icon, plus a collapsible "Skip or compress" list.
Main: vertical timeline list grouped by month; each task card shows title, category chip, due date (e.g. "Due 12 Dec"), duration, dependency note ("After: Book venue"), status badge (icon+text), a "Mark done" toggle button, and actions "Add to Google Calendar" and "Edit". 
Right/top actions: "Export calendar (.ics)", "Print / Save as PDF", "Add custom task".
Second tab "Day-of run-of-show": a table of times (e.g. 08:00 Venue access, 10:00 Decor final check, 17:30 Guest arrival, 19:00 Ceremony, 21:00 Dinner) with owner column.
Show an overdue task, a due-soon task, an at-risk task and a done task in the list.
```

## SCREEN 7 — Vendors

```
Utsav design system as defined. Design the VENDORS screen.
Top: progress "3 of 9 categories booked" with progress bar + text.
Left: category list (Venue, Caterer, Photographer, Decorator, Priest/Purohit, Music/DJ, Makeup artist, Transport, Invitations) each with a status badge (icon+text) and the budget share.
Right (selected: Caterer): tabs "Checklist", "Quotes", "Questions".
- Checklist: fieldset with checkboxes (Tasting done, Menu finalised, Diet needs confirmed — Vegetarian/Jain, Staff count agreed, Cancellation policy in writing, Advance % agreed, Overtime rate, Backup plan) + progress "5 of 8 done".
- Quotes: comparison table with 3 vendors (name, quote, per-head price normalised, notes, status select with Contacted / Quote received / Booked / Paid) and sort buttons.
- Questions: "Must-ask questions" and "Red flags" lists.
Buttons: "Add vendor", "Find caterers near me" (opens Google Maps in a new tab, with an external-link icon and visually-hidden text "opens in a new tab").
```

## SCREEN 8 — Ideas

```
Utsav design system as defined. Design the IDEAS screen (AI-generated, personalised).
Top: filter segmented control (All, Theme, Menu, Decor, Entertainment, Favours), a "Generate fresh ideas" primary button, and a small badge "Powered by Gemini • Suggestions are advisory". 
Grid (2–3 columns) of idea cards: title, category chip, 2-line description, "Why it fits you" line (e.g. "Matches your traditional vibe and vegetarian guests"), cost band (₹ / ₹₹ / ₹₹₹ with text "Low / Medium / High"), effort (Easy/Moderate/Involved), and buttons "Save", "Lock" (toggle with pressed state), "Add steps to timeline".
States to show: LOADING (skeleton cards + text "Finding ideas for you…"), ERROR ("We couldn't reach the AI right now" with "Try again" button and a note that curated suggestions are shown instead), and a small label "Curated suggestions" for fallback.
```

## SCREEN 9 — Assistant drawer / page

```
Utsav design system as defined. Design the ASSISTANT as (a) a right-hand drawer on desktop and (b) a full screen on mobile.
Header: "Ask Utsav" with close button and a "Stop" button when streaming. 
Body: chat bubbles (user right, assistant left), assistant messages stream in sentence by sentence. Under one assistant message show a CONFIRM-CHANGE CARD: title "Suggested change", "Before: Photography ₹1,50,000 → After: ₹1,80,000", reason text, buttons "Apply" (primary) and "Dismiss" (secondary), and after applying a toast "Applied. Undo". 
Quick action chips above the input: "What should I do next?", "Where am I overspending?", "Suggest a rain backup", "Shorten my timeline".
Input: multiline text area with label "Message", character counter "0/1000", Send button, and a note "Utsav only suggests changes — you approve them."
Include an OFFLINE/AI-UNAVAILABLE state: banner "AI is unavailable — quick actions still work".
```

## SCREEN 10 — Settings & Privacy

```
Utsav design system as defined. Design SETTINGS: Language (radio cards English / हिन्दी / বাংলা), Currency (select), Theme (Light / Dark / System / High contrast), Text size (100% / 115% / 130% segmented), Reduce motion toggle, Data section ("Export my plan (JSON)", "Import", "Delete all my data" with a confirm dialog), Sync section ("Sign in with Google to sync across devices — optional"), About & privacy text ("Your plan stays on this device unless you sign in. We never store your guests' personal details."). Include the confirm-delete dialog with focus on the safe "Cancel" button.
```

---

## MOBILE VARIANT PROMPT (use on Screens 1, 4, 5, 6)

```
Create the mobile (390×844) version of this screen using the same Utsav design system. Single column, top app bar with page title (h1) and language/theme menu, bottom tab bar with 5 labelled tabs (Home, Budget, Timeline, Vendors, Ideas) with a visible active state (indicator + bold label, not colour-only), floating "Ask Utsav" button above the tab bar that never overlaps content (add bottom padding). All tap targets ≥ 44px. Tables become stacked cards with label/value pairs. Charts keep the legend below with values and a "View as table" button. Content must not scroll horizontally at 320px width.
```

---

## REFINEMENT PROMPTS (run as needed)

**Accessibility pass**
```
Review this screen for WCAG 2.2 AA. Ensure: a visible "Skip to main content" link, exactly one h1, logical heading order, all form fields have visible labels, error messages sit next to fields with icon+text, focus ring (3px #1D4ED8, 2px offset) is visible on every interactive element and never hidden behind sticky bars, no information conveyed by colour alone, text contrast ≥ 4.5:1 and UI contrast ≥ 3:1, touch targets ≥ 44px, no drag-and-drop-only interactions. Fix any issues without changing the visual style.
```

**Dark + high-contrast**
```
Create the dark theme of this screen using the dark tokens from the design system, then a high-contrast variant (pure #000 background, #FFF text, 2px solid borders on all controls, #FFD400 focus ring). Keep layouts identical.
```

**States pass**
```
For this screen, add designs for: empty state (friendly illustration made only of simple shapes + helpful text + primary action), loading skeletons, error state with retry, and offline state banner. Keep illustrations lightweight (simple vector shapes, no photos).
```

**Hindi / Bengali stress test**
```
Replace all visible text on this screen with Hindi (हिन्दी), then Bengali (বাংলা). Keep the layout intact with longer strings: allow wrapping, no truncation, no fixed-width buttons. Use the system font stack for these scripts.
```

**Print view**
```
Create a print-friendly (A4) version of the plan: black on white, no navigation, sections for Summary, Budget table, Timeline table, Vendor checklist, with page-break-friendly blocks and a footer "Made with Utsav".
```

---

## Hand-off checklist for Antigravity
- [ ] Exported HTML saved in `design/stitch/<screen>.html` (≤ 500 kB total)
- [ ] Tokens transcribed into `client/src/styles/tokens.css` (CSS variables for light, dark, high-contrast)
- [ ] `scripts/check-contrast.mjs` verifies every text/background token pair
- [ ] Only one font file + system stack for Indic scripts
- [ ] All icons re-implemented as inline SVG (lucide named imports)
- [ ] No third-party CDN, no inline `style=` for dynamic values, no icon fonts
