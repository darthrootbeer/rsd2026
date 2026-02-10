# RSD 2026 — AI Agent Context

> **Purpose:** This file gives AI coding assistants project context. Read `PROJECT_STATUS.md` for detailed current status, blockers, and known issues.

## Project

Record Store Day 2026 release catalog: browse, filter, favorite, export. Album artwork comes from RecordStoreDay.com, looked up by `artist|title`.

## Data Flow

- **Releases:** `rsd2026_master.csv` → `releases_data.js` (Artist, Title, Label, Format, etc.)
- **Images:** `rsd_images.js` (`RSD_IMAGE_MAP`) via `getRSDImageUrl(artist, title)`
- **Build:** `scripts/build-rsd-images.js` builds the image map from RSD page HTML or JSON

## Key Commands

```bash
npm run serve                    # Start dev server
npm run build:rsd-images -- FILE # Build images from saved HTML (use -- before path)
npm run build:rsd-images:json    # Build from data/rsd_extracted.json
npm run build:rsd-images:fetch   # Attempt automated fetch (often blocked by captcha)
```

## Status Summary

- **Working:** Image display, fuzzy matching, build from saved page/JSON
- **Blocked:** Automated RSD fetch (AWS WAF captcha), low image coverage due to parsing errors

See **PROJECT_STATUS.md** for full status, file reference, and improvement steps.

## Interface design (UI consistency)

When building or editing UI (catalog, filters, layout), follow the **interface-design** workflow so decisions stay consistent across sessions.

- **Design system:** `.interface-design/system.md` — read when present and apply its Direction, Tokens, Patterns.
- **Template & examples:** `.interface-design/system-template.md`, `.interface-design/examples/`.
- **Cursor rule:** `.cursor/rules/interface-design.mdc` (workflow, directions, checks).
- **Principles:** `docs/interface-design/PRINCIPLES.md`.
- **Usage:** `.interface-design/README.md`.
