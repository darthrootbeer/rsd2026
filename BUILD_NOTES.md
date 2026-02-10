# Build & Process Notes – RSD 2026 App

This file documents **how this project was built**, the steps to rebuild it for future Record Store Days, and the main mistakes and lessons learned along the way.

Use it as the **playbook** for:

- The next fall RSD drop.
- RSD 2027, 2028, etc.

For an architectural view of how everything fits together, see `ARCHITECTURE.md`.

---

## 1. High‑level workflow

For each new RSD event:

1. **Capture official RSD data**
   - Save the official RecordStoreDay.com listings (HTML and/or JSON).
   - Optionally export or reconstruct a CSV “master” file for enrichment.

2. **Parse into a canonical data file**
   - Use `scripts/parse-official-rsd-sources.js` to produce `releases_data.js`.

3. **Build artwork and ID map**
   - Use `scripts/build-rsd-images.js` to produce `rsd_images.js` with hi‑res art URLs and RSD IDs.

4. **Enrich & clean**
   - Fill missing **genres/styles** and **quantities** using CSV/NLP heuristics.
   - Normalize text to remove mojibake and weird quote characters.

5. **Run and test the front‑end**
   - `npm install`
   - `npm run serve` → open `index.html`.
   - Sanity‑check several random releases in both card and row view.

6. **Deploy static files**
   - Commit `index.html`, `releases_data.js`, `rsd_images.js` and supporting files.
   - Push to GitHub → GitHub Pages updates automatically.
   - Always verify the live site with browser devtools open.

---

## 2. Step‑by‑step: new RSD event

### 2.1. Create a new branch / clone (optional but recommended)

For a new year or drop:

- Clone this repo or create a new branch (`rsd2027`, `rsd-fall-2026`, etc.).
- Update any year‑specific references **after** data is refreshed.

### 2.2. Capture official RSD listings

RecordStoreDay.com changes its layout and WAF behavior from year to year. In 2026 we used a combination of:

- Manual browser saves of the listings HTML.
- Programmatic attempts using:
  - `scripts/fetch-rsd-page.js`
  - `scripts/fetch-rsd-*.js` (Playwright, Puppeteer, curl‑impersonate)
  - `scripts/extract-rsd-in-browser.js` (runs in dev tools to dump data structures).

For a new event:

1. Visit the official RSD listings page(s).
2. Use **View Source / Save Page As** or a scripted approach to capture HTML/JSON snapshots.
3. Save them under `data/` (e.g. `data/rsd2027-page-01.html`, `data/rsd2027_extracted.json`).

> Tip: assume that fully automated scraping may break due to WAF/captcha. Always keep at least one **manual HTML snapshot** per page as a fallback.

### 2.3. Parse into `releases_data.js`

`scripts/parse-official-rsd-sources.js` knows how to interpret the HTML/JSON formats seen so far:

- Table‑based layouts.
- Product‑card layouts with hidden “quick view” content.

What it does:

- Extracts:
  - Artist, Title, Label, Format.
  - Description, MoreInfo, Tracklist.
  - Pressing Quantity, Release Type, RSD Date, Is Reissue.
  - Artwork URL and RSD ID where possible.
- Merges duplicates: when the same release appears multiple times, later passes can fill in missing fields.
- Outputs a JS file that defines `RELEASES_DATA` consumed by the front‑end.

Usage pattern (approximate):

```bash
node scripts/parse-official-rsd-sources.js \
  --html data/rsd2026-page-*.html \
  --json data/rsd_extracted.json \
  --out releases_data.js
```

> Exact CLI flags may evolve – check the top of `parse-official-rsd-sources.js` for the current interface before running.

After parsing:

- Open `releases_data.js`.
- Spot‑check several entries for:
  - Valid `Pressing Quantity`.
  - Non‑empty `MoreInfo` / `Tracklist` where present on the RSD page.
  - Reasonable `Is Reissue` classification.

### 2.4. Build `rsd_images.js`

`scripts/build-rsd-images.js` maps `Artist|Title` → hi‑res art URL and RSD ID.

The script:

- Reads saved HTML/JSON or a pre‑extracted list of artwork URLs.
- Normalizes them to use the `:800` suffix from `img.broadtime.com/Photo/...`.
- Writes `rsd_images.js` with:
  - `RSD_IMAGE_MAP`
  - A helper like `getRSDImageUrl(artist, title)` and possibly `getRSDReleaseId`.

Typical commands (from `AGENTS.md` at the time of writing):

```bash
npm run build:rsd-images -- data/rsd2026-page-01.html
npm run build:rsd-images:json
```

Re‑run these whenever the source HTML/JSON changes.

### 2.5. Enrich genres, styles, quantities

For RSD 2026 we:

- Merged data from a CSV master (`rsd2026_master.csv`) into `releases_data.js`.
- Fixed a CSV parsing bug where quoted fields with commas caused columns to shift.
- Created heuristics to fill missing genre/style fields and added an explicit `Unknown` genre bucket.

When doing this again:

1. Make sure `parse-official-rsd-sources.js` understands the **current CSV layout**.
2. Explicitly test edge cases:
   - Quoted fields with commas (e.g. `"April 18, 2026"`).
   - Rows with missing genres, styles, or quantities.
3. Regenerate `releases_data.js` and re‑run the front‑end tests.

### 2.6. Run the app locally

```bash
npm install
npm run serve
```

Then:

1. Open the printed URL.
2. Verify:
   - Cards and row view both render all releases.
   - Sorting works for **Artist / Title / Genre / Quantity** (including ascending/descending toggles).
   - Filters behave correctly, especially `Unknown` genre and format pills.
   - Left sidebar shows:
     - Correct hi‑res art, quantities, and release types.
     - Cleaned MoreInfo and Tracklist.
   - Shopping List:
     - Cart icon adds/removes items.
     - Right panel opens automatically when adding.
     - Exports include format and quantity.
3. Watch the **browser console** for any runtime errors.

### 2.7. Deploy

Once local tests pass:

1. Commit updated `index.html`, `releases_data.js`, `rsd_images.js`, and any new `data/` snapshots/scripts as appropriate.
2. Push to GitHub.
3. Wait for GitHub Pages to redeploy.
4. Visit the live URL with devtools open:
   - Hard reload (Cmd/Ctrl+Shift+R) to break any caching.
   - Confirm there are **no console errors**.
   - Re‑run a quick smoke test (search, filters, sidebar, Shopping List).

---

## 3. Mistakes & lessons learned

### 3.1. CSV parsing & column shifts

**Issue:** The initial CSV parser didn’t correctly handle quoted fields with commas (e.g. `"April 18, 2026"`). This caused the column indices to shift so that “Genre 1” ended up containing values like “Estimated” from the price column.

**Fix:**

- Updated the CSV parsing logic to treat quoted fields as atomic and skip the trailing comma correctly.

**Lesson:**

- When creating a custom CSV parser, **test**:
  - Quoted fields with commas.
  - Empty fields.
  - Fields with embedded quotes.
- Or better, use a battle‑tested CSV library wherever possible.

### 3.2. Mojibake & “smart” punctuation

**Issue:** Text pulled from RSD contained:

- Mojibake (`â€™`, `â€“`, `Ã©`, etc.).
- CP‑1252 control bytes used as quotes/dashes.
- Replacement characters (`�`) sprinkled throughout.

This looked especially bad in MoreInfo/Tracklist.

**Fix:**

- Implemented `cleanDisplayText()` and `cleanRichHtml()`:
  - Replace CP‑1252 bytes with correct Unicode.
  - Normalize common mojibake sequences.
  - Strip replacement characters and collapse excessive whitespace.
  - Treat runs of `<br>` as paragraph breaks where no `<p>` tags exist.

**Lesson:**

- Always run scraped text through a **normalization step** before displaying it.
- Keep the cleaning logic in **one place** (helpers) so you can evolve it safely.

### 3.3. Inline JS inside template literals

**Issue:** A first attempt at wiring hi‑res artwork clicks embedded a complex `onclick="..."` attribute directly inside a template literal, along with nested quotes and regex replacements. This produced a **syntax error** in the combined JS:

- Result: the entire script failed to load and the page showed only “Error: …” from the stats bar.

**Fix:**

- Simplified the HTML to a plain `<div class="detail-sidebar-art">…</div>`.
- Attached the click handler **after** injection:

  - Find the element via `querySelector`.
  - Set `title`, `style.cursor`, and `onclick` in normal JS.

**Lesson:**

- Avoid complex inline event handlers inside template literals.
- Prefer DOM event listeners set in code over `onclick="..."` strings, especially when URLs and escaping are involved.

### 3.4. Undefined variables in templates (`qtyDisplay`)

**Issue:** During incremental refactors, `qtyDisplay` was declared in one branch of `renderGrid()` (rows) but referenced in another (cards) before being added there. On GitHub Pages, this surfaced as:

- `ReferenceError: qtyDisplay is not defined` and the main grid failed to render.

**Fix:**

- Added `qtyDisplay` in the cards branch and consolidated the logic so both branches are explicit and parallel.

**Lesson:**

- After refactors that introduce new per‑release fields, always:
  - Check **both** card and row rendering branches.
  - Hard‑reload the deployed site and watch for runtime errors.

### 3.5. Discogs search pollution

**Issue:** The Discogs master search originally used the full title string, including:

- Parenthetical notes, edition details, extra punctuation.

This produced noisy or incorrect Discogs results.

**Fix:**

- In `getDiscogsMasterUrl()`:
  - Clean artist + title with `cleanDisplayText`.
  - Strip anything that isn’t **alphanumeric or space** via a regex.
  - Collapse whitespace and URL‑encode the result.

**Lesson:**

- When building search URLs for third‑party sites, **sanitize aggressively** to avoid over‑constraining the results.

### 3.6. GitHub Pages caching / deployment checks

**Issue:** A few times, changes looked broken because:

- The browser cached old JS.
- Deployment succeeded but we hadn’t hard‑reloaded.

**Fix:**

- Got into the habit of:
  - Doing a **hard refresh** (Cmd/Ctrl+Shift+R) on the live site.
  - Keeping devtools open and checking the **Console** after every push.

**Lesson:**

- Treat GitHub Pages as a separate environment:
  - Always test there, not just locally.

---

## 4. Best practices for future iterations

1. **Keep data and UI separate**
   - Don’t mutate the `RELEASES_DATA` objects.
   - Use derived state (`filteredReleases`, sets, maps) for UI concerns.

2. **Evolve the parser alongside RSD**
   - When RSD changes layout, update `parse-official-rsd-sources.js` in **small, well‑tested increments**.
   - Keep input snapshots under `data/` as fixtures.

3. **Guard the front‑end against missing data**
   - Always treat fields like `Genre 1`, `Style 1`, `Pressing Quantity` as optional.
   - Provide explicit fallbacks (`Unknown`, `Q:0`, empty strings) to avoid undefined errors.

4. **Centralize transformations**
   - Any text massaging (quotes, mojibake, spacing) should go through shared helpers (`cleanDisplayText`, `cleanRichHtml`).

5. **Test both views and all sorts**
   - After any change, manually:
     - Switch between cards/rows.
     - Try each sort key (Artist/Title/Genre/Quantity) in both directions.
     - Toggle filters and Shopping List interactions.

6. **Document year‑specific changes**
   - When you bump the app to a new year:
     - Update header text, countdown target, and any year‑specific copy.
     - Note any structural changes in RSD data or layout here for the next iteration.

If you follow this checklist, you should be able to recreate and evolve this project smoothly for each new Record Store Day.

