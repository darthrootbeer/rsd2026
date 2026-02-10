# Architecture Overview – RSD 2026 App

This document explains how the Record Store Day 2026 app is structured so it can be maintained and reused for future RSD events.

At a high level:

- **Static front‑end** – a single HTML file (`index.html`) with embedded CSS and JavaScript.
- **Generated data** – two JavaScript bundles (`releases_data.js`, `rsd_images.js`) built from official RecordStoreDay.com sources.
- **Deployment** – static hosting via GitHub Pages (or any static file host).

---

## 1. Front‑end (index.html)

`index.html` is a self‑contained SPA (single‑page app) that:

- Loads `RELEASES_DATA` from `releases_data.js`.
- Loads image/ID helpers from `rsd_images.js`.
- Renders:
  - **Header** with title, date, and live countdown.
  - **“How to use this page”** collapsible help panel.
  - **Controls row**:
    - Search box.
    - Sort controls (Artist / Title / Genre / Quantity) with reversible order.
    - View toggle (cards vs rows).
    - Clear filters and Shopping List toggle.
  - **Top filter rows** for Genres, Styles, and Formats (pills).
  - **Stats bar** (“Showing N of M releases”).
  - **Main grid / rows**.
  - **Modal dialog** (legacy quick‑view).
  - **Left‑hand detail sidebar**.
  - **Right‑hand Shopping List panel**.

### 1.1 Data model

Each release in `RELEASES_DATA` is a plain JS object. Key fields used by the UI include:

- `Artist`, `Title`, `Label`, `Format`
- `Genre 1`, `Style 1`, `Style 2`
- `Description`, `MoreInfo`, `Tracklist` (HTML from RSD, cleaned at render time)
- `Pressing Quantity`
- `Release Type` (e.g. “RSD Exclusive”, “RSD First”)
- `RSD Date`
- `Is Reissue` (“Yes” / “No” / empty)
- `rsdId` (if known; used for deep links)

The UI never mutates this data – it keeps:

- `allReleases` – original array.
- `filteredReleases` – current subset after search and filters.
- Ancillary sets/maps: selected genres/styles/formats, favorites (Shopping List), etc.

### 1.2 Key UI components (in code)

All of these live inside the `<script>` tag of `index.html` as plain functions:

- **Filtering & search**
  - `filterAndRender()` – orchestrates search + filter + sort then calls `renderGrid()`.
  - `populateFilters()` – builds genre/style/format pill lists and hides genre sort when no genres exist.

- **Sorting**
  - Sort state: `sortKey` (artist/title/genre/quantity) and `sortDir` (asc/desc), persisted in `localStorage`.
  - Sort controls: pill‑shaped `.sort-btn` buttons wired inside `init()`.
  - Sorting logic inside `filterAndRender()`:
    - For `artist` / `title` / `genre`: uses `localeCompare`.
    - For `quantity`: numeric compare on `Pressing Quantity`.

- **Rendering**
  - `renderGrid()`:
    - **Row mode** (`viewMode === 'rows'`):
      - 7‑column CSS grid:
        1. Thumb
        2. Artist
        3. Title
        4. Quantity
        5. Format • Label
        6. MoreInfo/Description snippet (first ~128 chars, cleaned)
        7. Cart icon
    - **Card mode**:
      - Artwork, artist, title, format • label, genre/style tags, quantity, and bottom‑right cart icon.
  - `openDetailSidebar(index)`:
    - Uses `filteredReleases[index]`.
    - Renders big art, meta rows, More Info, Tracklist, and link chips.
    - Builds a contextual “Add to / In Shopping List” CTA button.
  - `openModal(index)`:
    - Older modal view kept for completeness; similar fields to the sidebar.

- **Shopping List (favorites)**
  - State:
    - `favorites` – `Set` of indices into `allReleases`.
    - Persisted via both `localStorage` and a cookie (`rsd2026_favorites`) for durability.
  - Helpers:
    - `toggleFavorite(index, event)` – add/remove from favorites, re‑render grid and list, animate fly‑to‑cart, open list when adding.
    - `updateFavoritesCart()` – rebuilds the right‑hand Shopping List contents.
    - `exportFavorites(format)` – writes Markdown / CSV / text exports.

- **Styling helpers**
  - `cleanDisplayText()` – removes mojibake, weird quote/dash bytes, and excessive whitespace from plain text.
  - `cleanRichHtml()` – runs similar cleaning on HTML fields while preserving `<br>` structure and normalizing paragraph breaks.

- **External links**
  - `getAlbumArt(artist, title)` – uses `getRSDImageUrl()` from `rsd_images.js` and prefers `:800` resolution.
  - `openHiResArt(url)` – opens the original art without the `:800` suffix.
  - `getRSDUrl(artist, title)` – builds an official RSD deep link, using an ID when available.
  - `getDiscogsMasterUrl(artist, title)` – cleans artist/title to **alphanumeric only** before building a Discogs master search URL.
  - `getPlayUrls(artist, title, isReissue)` – builds Spotify/YouTube search URLs (suppressed for confirmed “new releases” where links are unlikely to exist yet).

- **State & initialization**
  - `init()`:
    - Binds all UI event handlers.
    - Restores Shopping List open state (now defaults to open).
    - Restores help panel and filter collapse preferences.
    - Restores sort key/direction and view mode.
    - Kicks off `filterAndRender()` and `initCountdown()`.
  - Document readiness check at the bottom ensures `init()` runs in both cold and already‑loaded HTML cases.

---

## 2. Data generation pipeline

The browser never hits RecordStoreDay.com directly; instead we pre‑build local JS bundles from scraped content.

All pipeline logic lives in `scripts/`:

- `parse-official-rsd-sources.js`
  - Reads one or more saved HTML/JSON sources from RecordStoreDay.com.
  - Handles two main layouts:
    - Historical **table‑based** listing.
    - Newer **product card** layout.
  - Extracts:
    - Artist, Title, Label, Format
    - Description, MoreInfo (HTML), Tracklist (HTML)
    - `Pressing Quantity`, `Release Type`
    - `Is Reissue` (heuristic based on text in Description/MoreInfo)
    - RSD ID and artwork URLs
  - Deduplicates multiple appearances of the same release, merging richer fields when found later.
  - Writes a canonical JSON/JS bundle (`releases_data.js`) consumed by the front‑end.

- `build-rsd-images.js`
  - Builds `rsd_images.js` by:
    - Enumerating releases.
    - Resolving artwork URLs (usually `img.broadtime.com/Photo/...:800`).
    - Capturing the RSD “SpecialRelease” ID when possible.
  - Exposes:
    - `RSD_IMAGE_MAP` (map of `Artist|Title` → art URL).
    - `getRSDImageUrl(artist, title)` and possibly a `getRSDReleaseId` helper.

- Other helpers
  - `fetch-rsd-*` and `extract-rsd-*` scripts:
    - Use curl‑impersonate, Playwright, Puppeteer, or manual browser scripts to **save HTML/JSON snapshots** of RSD listings.
    - These are largely “once per event” tools and can change as RSD changes their site or add WAF/captcha.

The typical flow is:

1. Fetch/save the official RSD listing pages for the year/event.
2. Run `parse-official-rsd-sources.js` to produce or update `releases_data.js`.
3. Run `build-rsd-images.js` to refresh `rsd_images.js`.
4. Optionally run additional enrichment against `rsd2026_master.csv` to fill in missing genre/style/quantity data.

See `BUILD_NOTES.md` for concrete commands and ordering.

---

## 3. Persistence & settings

The app uses a combination of `localStorage` and cookies for persistence:

- **Favorites / Shopping List**
  - Cookie: `rsd2026_favorites` – JSON array of indices.
  - `localStorage['rsd2026_favorites']` – same content as backup.

- **UI preferences**
  - `localStorage['rsd2026_viewMode']` – `'cards'` or `'rows'`.
  - `localStorage['rsd2026_helpCollapsed']` – `'true'` / `'false'`.
  - `localStorage['rsd2026_filtersCollapsed']` – `'true'` / `'false'`.
  - `localStorage['rsd2026_favoritesCartOpen']` – now always set to `'true'` on load but kept for future flexibility.
  - `localStorage['rsd2026_sortKey']` / `['rsd2026_sortDir']` – current sort key + direction.

This makes the app “sticky” between visits without any backend.

---

## 4. Deployment

The app is designed for **static hosting**:

- On GitHub Pages, the `master` branch root is served as a static site.
- No build step is strictly necessary for the front‑end; the critical step is regenerating the **data files** whenever the RSD sources change.

For other hosts (Netlify, Cloudflare Pages, S3, etc.), you can:

- Point them at this repo (or a built export) and serve `/index.html` as the root document.

---

## 5. Adapting to the next RSD

For a new event (fall drop, RSD 2027, etc.), the architecture remains the same:

1. **Update the data pipeline** to parse the new official pages into `releases_data.js`.
2. **Rebuild `rsd_images.js`** from the new artwork.
3. **Adjust year‑specific text** in:
   - Header title + date + countdown target.
   - Any hard‑coded copy in `index.html`, README, and exports.
4. Re‑run the app locally, sanity‑check with a few spot releases, then redeploy static files.

`BUILD_NOTES.md` contains a more detailed, chronological checklist with known pitfalls.

