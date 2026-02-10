# Interface Design (this project)

Adapted from [interface-design](https://github.com/Dammyjay93/interface-design) for use in **Cursor**. Design decisions are stored here so UI stays consistent across sessions.

## What this is

- **Craft** — Principle-based UI (depth, spacing, tokens, patterns).
- **Memory** — Save choices to `system.md`; the AI loads it when working on UI.
- **Consistency** — Same spacing, colors, and component patterns across the app.

## Files

| File | Purpose |
|------|--------|
| `system.md` | **Your design system** — direction, tokens, patterns. Create this when you start defining UI; the AI will read and apply it. |
| `system-template.md` | Blank template to copy when creating `system.md`. |
| `examples/system-precision.md` | Example: dense, technical (dashboards/admin). |
| `examples/system-warmth.md` | Example: warm, approachable (consumer/collab). |

## How it works in Cursor

1. When you (or the AI) work on UI (e.g. `index.html`, CSS, catalog components), the project’s Cursor rule (`.cursor/rules/interface-design.mdc`) applies.
2. **If `system.md` exists** — The AI reads it and uses your direction, tokens, and patterns.
3. **If `system.md` doesn’t exist** — The AI proposes a direction, you confirm, then it builds and **offers to save** a new `system.md`.
4. After any UI work, the AI should offer: *“Want me to save these patterns to `.interface-design/system.md`?”* Say yes to persist choices.

## This project

The catalog (`index.html`) uses Genre and Style filters; options come from `releases_data.js` (enriched from `rsd2026_master.csv` by the parser). Genre and Style dropdowns are **hidden when there are no options**, and "Sort: Genre" is hidden when there’s no genre data, so the UI stays consistent when data is partial.

## Quick prompts you can use

- **“Interface design status”** — Summarize what’s in `system.md`.
- **“Save interface design”** — Update `system.md` with current patterns.
- **“Check UI against design system”** — Compare code to `system.md` and report mismatches.

## Design directions (reference)

- **Precision & Density** — Tight, technical (dev tools, admin).
- **Warmth & Approachability** — Generous spacing, soft shadows (consumer, collab).
- **Sophistication & Trust** — Cool, layered (finance, B2B).
- **Boldness & Clarity** — High contrast (dashboards, data).
- **Utility & Function** — Muted, dense (GitHub-style tools).
- **Data & Analysis** — Chart-first (analytics, BI).

More detail: `docs/interface-design/PRINCIPLES.md` and the [interface-design repo](https://github.com/Dammyjay93/interface-design).
