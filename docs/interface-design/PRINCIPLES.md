# Interface Design — Craft Principles

Condensed from [interface-design](https://github.com/Dammyjay93/interface-design). Apply when building dashboards, apps, tools, admin panels. Quality floor regardless of direction.

---

## Token architecture

- **Primitives:** foreground, background, border, brand, semantic (destructive, warning, success). No random hex; map everything to these.
- **Text hierarchy:** Primary → secondary → tertiary → muted. Use all four.
- **Borders:** Scale by importance — default, subtle, strong, focus. Low opacity rgba (e.g. 0.05–0.12 alpha).
- **Controls:** Dedicated tokens for control background, border, focus — not reuse of surface tokens.

## Surface elevation

- Level 0: base canvas → Level 1: cards/panels → Level 2: dropdowns/popovers → Level 3+: overlays.
- Dark: higher = slightly lighter. Light: higher = slightly lighter or shadow.
- **Subtlety:** A few % lightness between levels. Sidebar same background as canvas; border for separation. Inputs slightly darker (inset).

## Spacing & padding

- Base unit (4px or 8px) and multiples only. Scale: micro → component → section → major.
- Symmetrical padding (e.g. 16px all sides); asymmetric only when content demands it.

## Depth (pick one)

- **Borders-only** — Technical, dense.
- **Subtle shadows** — One light shadow (e.g. `0 1px 3px rgba(0,0,0,0.08)`).
- **Layered shadows** — Multiple layers for premium depth.
- **Surface color shifts** — Tints only, no shadows.

## Typography

- Clear levels: headline (weight + tracking), body, labels, data (mono + tabular-nums).
- Data/numbers: monospace, `tabular-nums`.

## Controls & states

- Custom selects/dropdowns/date pickers — not native form elements for styled UI.
- Every interactive: default, hover, active, focus, disabled. Data: loading, empty, error.

## Navigation & dark mode

- Give screens context: nav, location, user. Sidebar same base as content; border to separate.
- Dark: prefer borders over shadows; desaturate semantic colors slightly.

## Avoid

- Harsh borders, dramatic surface jumps, random spacing, mixed depth strategies.
- Missing states, heavy shadows, large radius on small elements.
- Multiple accent colors; different hues per surface (same hue, shift lightness only).
