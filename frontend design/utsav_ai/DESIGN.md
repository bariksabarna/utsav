---
name: Utsav AI
colors:
  surface: '#fef7ff'
  surface-dim: '#e2d4f8'
  surface-bright: '#fef7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f1ff'
  surface-container: '#f4eaff'
  surface-container-high: '#f0e3ff'
  surface-container-highest: '#ebdcff'
  on-surface: '#201731'
  on-surface-variant: '#494551'
  inverse-surface: '#352c47'
  inverse-on-surface: '#f7edff'
  outline: '#7b7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6b4ea5'
  primary: '#33116b'
  on-primary: '#ffffff'
  primary-container: '#4a2c82'
  on-primary-container: '#b99af7'
  inverse-primary: '#d3bbff'
  secondary: '#835500'
  on-secondary: '#ffffff'
  secondary-container: '#feae2c'
  on-secondary-container: '#6b4500'
  tertiary: '#3c2300'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a3700'
  on-tertiary-container: '#d4a162'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ebddff'
  primary-fixed-dim: '#d3bbff'
  on-primary-fixed: '#250059'
  on-primary-fixed-variant: '#53358b'
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#ffb955'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#ffddb7'
  tertiary-fixed-dim: '#f3bd7b'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#633f07'
  background: '#fef7ff'
  on-background: '#201731'
  surface-variant: '#ebdcff'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52.8px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38.4px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38.4px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 31.2px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28.8px
    letterSpacing: -0.01em
  body-lead:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 27px
  body-base:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-base-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 21px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system expresses the warmth, majesty, and organized hospitality of cultural celebration. Conceived as a dignified, calm, and deeply trustworthy community organizer, the interface tempers high-stress event coordination with graceful serenity. It balances the joyful vibrancy of traditional gatherings with modern AI-driven utility, avoiding cluttered festive kitsch in favor of an airy, welcoming sanctuary.

The aesthetic philosophy draws on contemporary warm minimalism layered with gentle organic forms. Geometry balances structured layouts with delicate, petal-inspired curvatures. Touchpoints exude understated craftsmanship: warm ivory backdrops create a gentle base, rich ceremonial indigo confers dignity and focus, while sunlit marigold sparks delight across moments of accomplishment and milestone discovery.

## Colors

The palette establishes an emotional rhythm moving between reverent focus and celebratory light. 

### Light Theme (Default)
- **Canvas (`background`):** `#FFFBF5` — Soft, breathable ivory that relieves screen fatigue.
- **Card Surface (`surface`):** `#FFFFFF` — Crisp, pure white foundation for interactive cards and modals.
- **Alternate Surface (`surface-alt`):** `#F6EFE6` — Subtle warmth for nested containers, table headers, and sidebars.
- **Structural Border (`border`):** `#D9CFC2` — Gentle earthen outline providing definition without harsh breaks.
- **Primary Typography (`text`):** `#1F1630` — Deep nocturnal purple providing a soft, high-contrast alternative to stark black.
- **Secondary Typography (`text-muted`):** `#5B5470` — Muted slate-plum, tested strictly above 4.5:1 against surfaces.
- **Primary Brand (`primary`):** `#4A2C82` — Deep royal indigo, paired strictly with `#FFFFFF` text.
- **Primary Hover (`primary-hover`):** `#3B2268` — Deepened indigo for tactile pointer states.
- **Celebration Accent (`accent`):** `#F5A623` — Radiant marigold; interactive states must pair with `#1F1630` text for guaranteed contrast.
- **Semantic Feedback:**
  - `success`: `#166534` (Forest green)
  - `warning`: `#92400E` (Earthen amber)
  - `danger`: `#B91C1C` (Deep vermilion)
  - `info`: `#1D4ED8` (Clear royal blue)
- **Focus Indicator (`focus-ring`):** `#1D4ED8` — Rendered as a distinct 3px outline with a 2px offset.

### Dark Theme
- **Canvas (`background`):** `#130F1F`
- **Surface (`surface`):** `#1D1730`
- **Surface Alt (`surface-alt`):** `#271F3F`
- **Border (`border`):** `#4A4166`
- **Text (`text`):** `#F4F0FA`
- **Text Muted (`text-muted`):** `#C4BBD6`
- **Primary Brand (`primary`):** `#B9A4F5` (paired with `#1F1630` text)
- **Celebration Accent (`accent`):** `#F5B94A` (paired with `#1F1630` text)
- **Semantic Feedback:**
  - `success`: `#4ADE80`
  - `warning`: `#FBBF24`
  - `danger`: `#F87171`

## Typography

The typography system exclusively leverages **Plus Jakarta Sans**, utilizing its geometric clarity, friendly open counters, and humanist proportions to maintain both warmth and high functional utility.

- **Headlines (H1–H3):** Tight line height (`1.2`) with subtle negative tracking creates clear visual landmarks without feeling severe.
- **Body & Editorial Copy:** Balanced line height (`1.5`) prioritizes sustained reading comfort for complex schedules, vendor contracts, and guest notes.
- **Financial & Numerical Display:** When rendering estimates, guest counts, and budgets, numerical values follow the Indian Lakh/Crore numbering format (e.g., `₹15,00,000`, `₹2,50,000`) paired with tabular figures where applicable to preserve vertical visual alignment.

## Layout & Spacing

A 12-column responsive fluid grid aligns content across varying display sizes, ensuring effortless scanning across complex planning canvases, itinerary boards, and vendor lists.

### Screen Adaptations
- **Desktop (1024px+):** 12 columns, 24px (`space-lg`) gutters, 32px (`space-xl`) canvas margins. Max layout bounding box is constrained to 1280px for optimal line lengths.
- **Tablet (768px – 1023px):** 8 columns, 16px (`space-md`) gutters, 24px (`space-lg`) outer margins.
- **Mobile (320px – 767px):** 4 columns, 16px (`space-md`) gutters, 16px (`space-md`) screen padding.

### Spacing Scale
Layouts adhere to an absolute 4px/8px rhythm:
- `4px` (`space-2xs`): Micro gaps, icon-to-label inline offsets.
- `8px` (`space-xs`): Compact badge padding, tight stack spacing.
- `12px` (`space-sm`): Input vertical padding, component intra-groupings.
- `16px` (`space-md`): Standard card interior padding, base modular gap.
- `24px` (`space-lg`): Generous section separation, list block padding.
- `32px` (`space-xl`): Module separation, major container spacing.
- `48px` (`space-2xl`): Major page sections, narrative boundaries.

## Elevation & Depth

Depth is established primarily through warm layered surfaces and quiet ambient diffusion rather than high-contrast structural borders or heavy drops.

- **Level 0 (Flat / Canvas):** Plain `#FFFBF5` canvas; backdrop for cards and layout blocks.
- **Level 1 (Subtle Rest):** `#FFFFFF` surfaces with a 1px border of `#D9CFC2` alongside an ultra-soft ambient shadow: `0 1px 2px rgba(31, 22, 48, 0.04)`. Used for resting event cards, timeline rows, and inputs.
- **Level 2 (Hover / Active Overlay):** `0 4px 12px rgba(31, 22, 48, 0.08)` with border `#D9CFC2`. Used for elevated card hover transitions, dropdown menus, filter popovers, and sticky sub-navigation.
- **Level 3 (Modals / Drawers):** `0 12px 32px rgba(31, 22, 48, 0.12)`. Confined strictly to modal overlays, floating action surfaces, and primary bottom sheets on mobile devices.

## Shapes

The shape vocabulary takes visual cues from organic arches and the soft apex of a marigold petal, balanced by clean geometric utility:

- **Cards & Major Panels:** Fixed at `12px` border radius, creating clean frames that look tailored rather than industrial.
- **Form Fields & Interactive Controls:** Set to `10px` radius, aligning with hand ergonomics and touch targets.
- **Chips, Badges, & Action Pills:** Full pill contour at `999px`, communicating status and categorizations with fluid clarity.
- **Decorative Accent Details:** Subtle marigold corner motifs and section dividers use curvature ratios matching the 12px and 999px geometry to ground celebratory details within systemic rules.

## Components

### General Usability & Accessibility Rules
- **Interactive Sizing:** All touch targets maintain a minimum dimension of `44px × 44px`.
- **Focus Rings:** All focused controls display a `3px` solid `#1D4ED8` ring with a `2px` offset.
- **Non-Color Status Cues:** Status is never communicated by color alone. Every badge, validation notice, and alert combines a dedicated SVG icon (2px stroke) alongside explicit text.
- **Iconography:** Handcrafted SVG line icons using a strict `2px` stroke weight; icon fonts are prohibited.
- **Skip Navigation:** An accessible, high-contrast "Skip to main content" link sits as the very first keyboard-accessible node on all pages.

### Buttons
- **Primary:** Background `#4A2C82`, text `#FFFFFF`, border none, radius `10px`, min height `44px`, horizontal padding `24px` (`space-lg`). Hover shifts to `#3B2268`.
- **Secondary / Accent:** Background `#F5A623`, text `#1F1630`, radius `10px`, min height `44px`. For landmark celebratory triggers (e.g., "Generate Itinerary", "Confirm Booking").
- **Tertiary / Ghost:** Background transparent, text `#4A2C82`, border `1px solid #D9CFC2`, radius `10px`. Hover initiates `#F6EFE6` fill.

### Chips & Filter Pills
- Fully rounded (`999px`), minimum height `36px` (with `44px` invisible tap bounds), padding `6px 16px`.
- Resting: `#F6EFE6` fill, `#1F1630` text, subtle `1px solid #D9CFC2`.
- Selected: `#4A2C82` fill, `#FFFFFF` text.

### Form Inputs
- Height `44px`, radius `10px`, border `1px solid #D9CFC2`, background `#FFFFFF`, text `#1F1630`.
- Padding: `0 12px` (`space-sm`).
- Helper/Label structure: Floating or top-stacked labels with explicit `14px` caption styling; error messages pair an inline exclamation-circle icon with vermilion (`#B91C1C`) copy.

### Cards
- Radius `12px`, background `#FFFFFF`, border `1px solid #D9CFC2`, ambient shadow `0 1px 2px rgba(31, 22, 48, 0.04)`.
- Internal padding matches `16px` (`space-md`) on mobile and `24px` (`space-lg`) on desktop.
- Interactive states gently elevate with a `0 4px 12px rgba(31, 22, 48, 0.08)` shadow.

### Checkboxes & Radio Controls
- Minimum bounding box `44px × 44px` containing a `20px` visible mark element.
- Radius: `4px` for checkboxes, `999px` for radio controls.
- Active state fills with `#4A2C82` displaying crisp white glyphs (`#FFFFFF`).

### Specialized Domain Components
- **Budget / Expense Row:** Displays currency items adhering strictly to Indian grouping conventions (e.g., "Catering: ₹4,50,000").
- **AI Recommendation Banner:** Pale ivory-marigold gradient wash (`#FFFBF5` to `#F6EFE6`), `#D9CFC2` border, decorated with an outline starburst/marigold SVG indicator.
- **Milestone Timeline Item:** Vertical rail with an anchored `12px` circular pip filled with `#4A2C82` for completed events and `#F5A623` for active steps.