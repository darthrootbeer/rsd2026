# Album Art Images

Album covers are loaded from RecordStoreDay.com. The RSD site blocks automated requests (captcha), so the image map must be built from a manually captured page.

## To Get 95%+ Artwork Coverage

### Option A: Save Page (simplest)

1. Open **https://recordstoreday.com/SpecialReleases?view=all** in your browser
2. **Scroll to the bottom** so all releases load (the page may lazy-load)
3. **File → Save As** → **Web Page, Complete**
4. Save to `data/rsd_specialreleases_2026.html`
5. Run: `npm run build:rsd-images data/rsd_specialreleases_2026.html`

### Option B: Browser Console Extraction

1. Open **https://recordstoreday.com/SpecialReleases?view=all**
2. Scroll to load all releases
3. Open DevTools (F12) → **Console**
4. Paste the contents of `scripts/extract-rsd-in-browser.js` and press Enter
5. Copy the JSON output
6. Save to `data/rsd_extracted.json`
7. Run: `npm run build:rsd-images:json`

### Option C: Puppeteer with visible browser

If you can solve the captcha in a visible window:

```bash
node scripts/extract-rsd-with-puppeteer.js --headed
```

Then run: `npm run build:rsd-images:json`

## Build Commands

- `npm run build:rsd-images` — Build from a saved file (pass path as arg)
- `npm run build:rsd-images:json` — Build from `data/rsd_extracted.json`
- `npm run build:rsd-images:fetch` — Attempt automated fetch (usually blocked)

## Current State

- **Fuzzy matching** links releases to images when Artist/Title strings differ (e.g. "Moon Safari - Live..." vs "AIR Moon Safari - The Athens Concert")
- **Alternate keys** from `releases_data` are added at build time for better coverage
- **referrerpolicy="no-referrer"** on images to reduce hotlink blocking
- Placeholders (🎵) appear when a release isn’t in the image map
