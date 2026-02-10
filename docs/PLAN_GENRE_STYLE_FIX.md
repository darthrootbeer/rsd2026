# Plan: Fix Genre/Style Filters

**Status: Implemented (Feb 2026).** Parser merges from CSV; UI hides empty filters and drops Style 3.

**Problem (was):** Genre and Style filter dropdowns were empty because `Genre 1`, `Style 1`, and `Style 2` are never populated in `releases_data.js`. The official RSD HTML sources do not include genre or style; the parser sets these fields to empty strings.

**Root cause:** Data flow is HTML → `parse-official-rsd-sources.js` → `releases_data.js`. Genre/Style exist only in the legacy `rsd2026_master.csv` (528 rows with Genre 1, Style 1, Style 2 populated). The parser does not read the CSV.

---

## Option 1 — Merge genre/style from CSV (recommended)

**Idea:** Keep HTML as source of truth for the release list, images, and RSD IDs. Enrich each release with Genre/Style by matching against `rsd2026_master.csv` (Artist + Title).

**Steps:**

1. **In `scripts/parse-official-rsd-sources.js`:**
   - After building `allReleases` from the three HTML files, if `rsd2026_master.csv` exists, load and parse it.
   - Build a lookup map: key = normalized `Artist|Title` (e.g. lowercase, trim), value = `{ "Genre 1", "Style 1", "Style 2" }`.
   - For each release in `allReleases`, compute the same key and assign Genre 1, Style 2, Style 2 from the map when present (otherwise keep `""`).
   - Matching: normalize for robustness (trim, lowercase or case-insensitive match) so "A-Ha" / "a-ha" match.

2. **Validation:** After merge, report how many releases got at least one of Genre/Style (e.g. "Enriched: 312/357 with genre or style").

3. **Rebuild:** Run `node scripts/parse-official-rsd-sources.js` and refresh the app; Genre and Style dropdowns should show options where data exists.

**Pros:** Uses existing curated data; no new external APIs; filters work for matched releases.  
**Cons:** CSV may not cover all 357 releases (different list or older); you may need to refresh CSV from time to time.

---

## Option 2 — Hide empty filters (quick UI fix)

**Idea:** Don’t add new data; avoid showing useless controls when there’s no genre/style data.

**Steps:**

1. In `index.html`, when building the filter UI:
   - Compute `genres` and `styles` as now.
   - If `genres.length === 0`, hide the Genres dropdown (or show “Genres (no data)” and disable it).
   - If `styles.length === 0`, hide the Styles dropdown (or show “Styles (no data)” and disable it).
   - Optionally hide or adjust “Sort: Genre” when there are no genres.

2. Document in UI or tooltip that Genre/Style come from the data and are currently empty.

**Pros:** Fast; no build changes; no dependency on CSV.  
**Cons:** Genre/Style filters still don’t work until data is added (Option 1 or 3).

---

## Option 3 — External API enrichment (future)

**Idea:** For each release (Artist + Title), call an external API (e.g. MusicBrainz, Discogs, Last.fm) to get genre/style and write into the data.

**Steps (outline):** Add a separate enrichment script that reads `releases_data.js` or a JSON export, calls the API with rate limiting, and outputs an enrichment file (e.g. `genre_style_enrichment.json`). Parser then loads this file and merges by Artist|Title. Requires API keys and handling of missing/multiple matches.

**Pros:** Can fill gaps and stay up to date.  
**Cons:** More work; rate limits; keys and maintenance.

---

## Small consistency fix

- **Style 3:** The UI uses `r['Style 3']` in two places, but the data model and parser only have Style 1 and Style 2. Either remove `Style 3` from the UI (use only Style 1 and Style 2) or add `Style 3: ''` to the parser output. Recommended: remove `Style 3` from the UI to match the schema.

---

## Recommended order

1. **Do Option 1** so filters work for every release that has a match in the CSV.
2. **Apply the Style 3 fix** so the UI matches the data schema.
3. **Optionally add Option 2** as a fallback: if after merge some users still have no genre/style data, hide or disable the empty dropdowns so the UI doesn’t look broken.
4. Consider **Option 3** later if you need broader or fresher genre/style data than the CSV provides.

---

## Files to touch

| File | Change |
|------|--------|
| `scripts/parse-official-rsd-sources.js` | Load CSV (if present), build Artist\|Title → genre/style map, merge into each release; add enrichment stats to validation output. |
| `index.html` | (Optional) Hide or disable Genre/Style dropdowns when `genres.length === 0` / `styles.length === 0`. Remove or align `Style 3` references with data (only Style 1, Style 2). |
| `PROJECT_STATUS.md` | After fix: move Genre/Style from “What’s Not Working” to “What’s Working” or note “Partially fixed (via CSV merge)”. |
| `docs/PLAN_GENRE_STYLE_FIX.md` | This plan (reference only). |
