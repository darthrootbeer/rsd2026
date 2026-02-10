# RSD 2026 Project Status

> **For AI assistants:** Read this file to understand current project state, what works, and what is blocked. Updated as the project evolves.

## Overview

This project is a browseable catalog of Record Store Day 2026 releases with album artwork, filtering, favorites, and export. Data comes from `rsd2026_master.csv` / `releases_data.js`. Album art is looked up by `artist|title` from RecordStoreDay.com.

---

## What's Working

| Component | Status | Notes |
|-----------|--------|------|
| Image display | ✅ FIXED | 100% coverage (357/357 releases) - all show album artwork |
| RSD release IDs | ✅ FIXED | 100% coverage (357/357 releases) - all card links work |
| RSD image map | ✅ OK | `rsd_images.js` has `RSD_IMAGE_MAP` and `getRSDImageUrl()` |
| RSD ID map | ✅ OK | `rsd_images.js` has `RSD_RELEASE_ID_MAP` and `getRSDReleaseId()` |
| Fuzzy matching | ✅ OK | Handles minor artist/title variations |
| Parser validation | ✅ OK | Parser outputs validation report (100% coverage, 0 conflicts) |
| Official data sources | ✅ OK | Parses 3 HTML files from recordstoreday.com |
| Card links | ✅ OK | Click cards to open `https://recordstoreday.com/SpecialRelease/{ID}` |
| Cache busting | ✅ OK | Version query strings prevent stale data |
| Genre/Style filters | ✅ FIXED | Enriched from `rsd2026_master.csv` on build; dropdowns hidden when no data (see `.interface-design`) |

---

## What's Not Working

_None at this time._

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main app UI; uses `getRSDImageUrl()` and `getRSDReleaseId()` |
| `rsd_images.js` | Image/ID maps + `getRSDImageUrl()` + `getRSDReleaseId()` functions |
| `releases_data.js` | Release list (357 releases with Artist, Title, Label, Format, etc.) |
| `rsd2026_master.csv` | Original source CSV (legacy) |
| `scripts/parse-official-rsd-sources.js` | **MAIN BUILDER** - Parses official RSD HTML files, generates both data files |
| `data/rsd2026_1.html` | Official RSD source - table format (196 releases) |
| `data/rsd2026_2.html` | Official RSD source - table format (161 releases) |
| `data/rsd2026_images.html` | Official RSD source - grid format (357 releases, primary source) |
| `test-images-simple.html` | Test page to verify data loading and function output |
| `FIX_SUMMARY.md` | Documentation of recent image/ID fix (Feb 2026) |

---

## Rebuild Data (When Needed)

To rebuild both `rsd_images.js` and `releases_data.js` from official RSD sources:

```bash
node scripts/parse-official-rsd-sources.js
```

**Expected output:**
```
Parsing rsd2026_1.html...
  Found 196 releases
...
Genre/Style: enriched N/357 from rsd2026_master.csv

=== VALIDATION REPORT ===
Total releases: 357
With images: 357/357 (100.0%)
With RSD IDs: 357/357 (100.0%)
With genre/style: N/357 (...%)
Conflicts: 0
=========================
```

**Important:** After rebuilding, users must hard-refresh browsers (Cmd+Shift+R / Ctrl+Shift+R) due to cache-busting query strings.

---

## Interface design (UI consistency)

When editing UI (e.g. `index.html`, catalog layout), use the **interface-design** workflow so spacing, depth, and patterns stay consistent. Design system lives in `.interface-design/system.md` (create when you define UI). See `.interface-design/README.md` and `.cursor/rules/interface-design.mdc`.

---

## Recent Fixes (Feb 2026)

**Images & Links Fixed** - See `FIX_SUMMARY.md` for details
- Fixed JavaScript syntax error (unescaped newlines in map keys)
- Added validation reporting to parser
- Enhanced test suite
- Implemented cache-busting
- Achieved 100% image and RSD ID coverage

**Genre/Style filters fixed**
- Parser merges Genre 1, Style 1, Style 2 from `rsd2026_master.csv` (match by Artist|Title, CSV parsing handles quoted fields).
- UI: Genre and Style dropdowns are hidden when no options; Sort: Genre option hidden when no genre data. Style 3 removed from data/UI (schema is Style 1, Style 2 only).
- See `docs/PLAN_GENRE_STYLE_FIX.md` for the plan; `.interface-design` and `.cursor/rules/interface-design.mdc` for UI consistency.

---

## Known Issues

_None._

---

*Last updated: 2026-02-09*
