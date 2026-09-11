# MediKiosk — Design System

Persisted spec for the AarogyaVaani · MediKiosk UI (SIH26047). Tokens live in
`:root` in `styles.css`; this document is the reference. Mood: calm,
trustworthy, clinical-but-warm — teal on white, generous whitespace, no
gradients, no neon, light mode only (daylit OPD kiosks).

## Color

| Token | Hex | Used for | Contrast on its bg |
| --- | --- | --- | --- |
| `--ink` | `#23272A` | body text | 14.7:1 on white |
| `--ink-2` | `#6C7278` | secondary text | 4.85:1 on white |
| `--ink-3` | `#5C636A` | tertiary text (hints, meta) | 6.0:1 on white |
| `--brand` | `#0E7C6B` | primary actions, progress, teal accents | 5.1:1 on white; white text on it 5.1:1 |
| `--brand-dark` | `#0A5B4E` | pressed states, on `--brand-soft` | 6.8:1 |
| `--blue` | `#1D6FBE` | info pills, focus ring | 5.2:1 white / 4.7:1 `--blue-soft` |
| `--green` | `#2F7A53` | success pills, live dot | 5.3:1 white / 4.5:1 `--green-soft` |
| `--amber` | `#9E5615` | warning pills, low-confidence | 5.5:1 white / 4.7:1 `--amber-soft` |
| `--red` | `#C0392D` | errors, alerts, red flags | 5.4:1 white / 4.6:1 `--red-soft` |

Every pair is ≥ 4.5:1 (WCAG AA). Status colors were darkened from the original
palette (`#98A0A6`, `#D2483C`, `#C4752F`, `#3F9468`, `#2783DE`) to get there.

## Typography

- Base 16px / 1.5, `--sans` includes Noto Sans Devanagari for Hindi/regional scripts.
- Display: `clamp(26px → 34px)`; question: `clamp(24px → 31px)`.
- Text never uses fixed-width labels: flex rows use `min-width: 0`, labels wrap
  freely (Hindi strings are longer than English; nothing clips or overflows).
- Mono (`--mono`) for OTP entry and FHIR preview only.

## Spacing & shape

- 8px spacing scale (8/12/16/24/32) via padding/margin values throughout.
- Radii: `--radius 12px` (controls, cards), `--radius-lg 18px` (kiosk card, token badge).
- Shadows: `--shadow-sm` (lifted controls), `--shadow-md` (kiosk card).

## Interaction

- **Touch targets**: kiosk primaries ≥ 48px (`.btn`, `.choice` 62px, `.lang-tile`
  104px, `.scale` 58px, `.mic-btn` 60px, `.seg` 48px, consent `.toggle` 48px).
  Dense dashboard controls ≥ 40px (`.btn.sm`, `.tiny`, `.section-acts`, mode
  switch) — an accepted exception for physician/admin desktop use, noted in the
  pre-delivery checklist.
- **Focus**: global `:focus-visible` 3px solid `--blue` + 2px offset; inputs get
  a 3px `--brand-soft` ring on focus.
- **Motion**: only ambient motion — mic pulse, voice wave, OCR spinner, toast
  slide. Global `prefers-reduced-motion: reduce` rule kills all animation and
  transition durations.

## Icons

Stroke-based SVG set in `data.js` (`ICONS`, 1.9px stroke, round caps),
rendered via `icon(name, size)` with text labels always beside them. No
emoji-as-icons anywhere (complaint tiles use `heartpulse`/`wind`/
`thermometer`/`stomach`/`brain`/`bone`/`bandage`/`utensils`/`chat`).

## Components

Buttons (primary/secondary/ghost/danger + `.sm`/`.tiny`), segmented controls,
choice cards (tap targets with tick state), toggles (switch, aria-checked),
form fields (label + input + hint/error), voice zone (mic + wave + repeat),
consent list, cards, kiosk frame (secure header, progress rail, footer), pill
badges, meters, tables, banners, timeline, toasts, code block, charts
(CSS-only bar charts — zero dependencies).

## Pre-delivery checklist (SIH26047 UI review)

| Rule | How it is satisfied |
| --- | --- |
| WCAG AA text contrast ≥ 4.5:1 | All token pairs verified numerically (`node` luminance script, 16/16 pass; values in the color table above). Status colors darkened to pass on white **and** on their soft backgrounds. |
| Large touch targets | Kiosk controls ≥ 48px: `.btn` 48, `.choice` 62, `.lang-tile` 104, `.scale` 58, `.mic-btn` 60, `.seg` + `.seg.compact` 48, `.toggle` 48, `.otp-input` 48. Dense dashboard controls ≥ 40px (`.btn.sm`, `.tiny`, `.section-acts`, mode switch) — deliberate exception for physician/admin desktop tables; rows themselves are ≥ 44px hit areas. |
| Visible keyboard focus | Global `:focus-visible` 3px `--blue` outline + 2px offset on every interactive element; inputs add a 3px `--brand-soft` ring. |
| `prefers-reduced-motion` | Global rule zeroes animation/transition durations (covers mic pulse, voice wave, OCR spinner, toast). |
| Browser zoom / text scaling | Layout uses `clamp()` headings, `min-width: 0` flex text, and fluid `minmax()` grids; nothing depends on a fixed viewport width. |
| Responsive 375 / 768 / 1024 / 1440 | Breakpoints at 900 (detail/form/lang/choice/scale collapse) and 640 (topbar wraps, kiosk footer stacks full-width, dash padding shrinks); `two-col` auto-stacks; verified no horizontal overflow at preview width. |
| Resilient label wrapping (Hindi/regional) | No `white-space: nowrap` on content labels; `--sans` includes Noto Sans Devanagari; pills reserve nowrap only for short status chips. |
| No emoji-as-icons | Complaint tiles, departments and all actions use the stroke-SVG `ICONS` set (heartpulse, wind, thermometer, stomach, brain, bone, bandage, utensils, chat…) with visible text labels; 0 emoji glyphs in complaint tiles (verified in live DOM). |
| No AI-purple/neon, no harsh animation, light mode default | Teal-on-white palette, ambient motion only (pulse/wave/spinner), no gradients; `body` background is light (`--soft`) — kiosk-daylight safe. |
| Icon-only buttons always labelled | Every `data-act` control renders a text label or `aria-label` next to its SVG (mic button is the single exception, 60px circular with text caption beside it). |