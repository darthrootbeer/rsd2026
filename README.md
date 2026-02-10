# RSD 2026 – Shopping List Helper

This repo contains a **single–page web app** for exploring the official Record Store Day 2026 releases and building a personal **shopping list**.

The app runs entirely in the browser from a static site (hosted on GitHub Pages), fed by pre‑built data files parsed from the official RSD listings.

Live site: `https://darthrootbeer.github.io/rsd2026/`

---

## Features

- **Browse all releases**
  - Card view with large artwork, genre/style tags, and pressing quantity.
  - Compact row view with artist, title, quantity, format/label, and a short “More Info” snippet.

- **Fast search & filters**
  - Text search across artist, title, and label.
  - Tag‑based filters for **Genres**, **Styles**, and **Formats** (including an explicit `Unknown` genre).
  - “Hide filters” toggle for a cleaner browsing view.

- **Left‑hand detail panel**
  - Click any release to open a fixed left sidebar with:
    - Hi‑res square artwork (clickable to the full‑size RSD image).
    - Label, format, RSD date, release type, genre/style.
    - Official **More Info** block and **Tracklist** (cleaned up from mojibake / bad quotes).
    - Links out to RecordStoreDay.com, Spotify, YouTube, and Discogs (with a cleaned, alphanumeric query).

- **Shopping List on the right**
  - Click the cart icon 🛒 on any card or row to add/remove a release.
  - Right‑hand Shopping List panel floats while you scroll and is visible by default.
  - Each entry shows **Title, Artist, Format • Quantity**, cover art, and a quick link back to RSD.
  - Items already in the list are highlighted with a gold border in the main grid/rows.

- **Exports**
  - Export your Shopping List as:
    - **Markdown** (`rsd2026-shopping-list.md`)
    - **CSV** (`rsd2026-shopping-list.csv`)
    - **Plain text** (`rsd2026-shopping-list.txt`)

- **Extras**
  - Live countdown to **April 18, 2026 08:00 local time** under the title.
  - “How to use this page” panel explaining the UI and a clear note that this is **unofficial / fan‑made**.

---

## Quick start (development)

Requirements:

- Node.js 18+ (LTS recommended)
- npm

Install dependencies and run a dev server:

```bash
npm install
npm run serve
```

Then open the URL printed by the dev script (often `http://localhost:4173` or similar, depending on the tooling) and point it at `index.html`.

The production deployment is just the static files:

- `index.html`
- `releases_data.js`
- `rsd_images.js`
- `rsd2026_master.csv` (source reference only; not loaded by the browser)

On GitHub Pages, these are served directly from the `master` branch root.

---

## Data pipeline (very high level)

The front‑end reads from two generated files:

- `releases_data.js` – array of release objects with:
  - Artist, Title, Label, Format
  - Genre / Style 1 / Style 2
  - Description, MoreInfo (HTML), Tracklist (HTML)
  - `Pressing Quantity`, `Release Type`, `Is Reissue`, `RSD Date`
- `rsd_images.js` – `RSD_IMAGE_MAP` from `Artist|Title` → hi‑res art URL and RSD ID helper.

These are built by scripts in `scripts/` from **saved official RSD HTML/JSON** (see `ARCHITECTURE.md` and `BUILD_NOTES.md` for details).

---

## Important files

- `index.html` – All front‑end HTML, CSS and JavaScript (single‑file app).
- `releases_data.js` – Generated release data consumed by the UI.
- `rsd_images.js` – Generated image/ID map for artwork and RSD links.
- `rsd2026_master.csv` – Source CSV used during genre/style/quantity enrichment.
- `scripts/`
  - `parse-official-rsd-sources.js` – Parse official RSD HTML/JSON into `releases_data.js`.
  - `build-rsd-images.js` – Build `rsd_images.js` from RSD artwork/HTML.
  - Additional helpers for fetching and extracting RSD content.
- `AGENTS.md` / `PROJECT_STATUS.md` / `docs/` – Meta‑docs and running notes used during development.

---

## For the next RSD

This codebase is intended to be **re‑used for future Record Store Day events** (fall drops, 2027, etc.).

- See **`ARCHITECTURE.md`** for how the app is structured.
- See **`BUILD_NOTES.md`** for a **step‑by‑step checklist** and a list of past mistakes and lessons learned.

