#!/usr/bin/env node
/**
 * Extract RSD album art data using Puppeteer (runs in page context, avoids captcha in some cases).
 * Run: node scripts/extract-rsd-with-puppeteer.js [--headed]
 * Then: node scripts/build-rsd-images.js --from-json data/rsd_extracted.json
 */
const fs = require('fs');
const path = require('path');

const extractInPage = () => {
  const out = [];
  const seen = new Set();
  const imgs = document.querySelectorAll('img[src*="broadtime.com/Photo/"]');
  for (const img of imgs) {
    const m = img.src.match(/broadtime\.com\/Photo\/(\d+)/);
    if (!m) continue;
    const imgUrl = `https://img.broadtime.com/Photo/${m[1]}:250`;

    const row = img.closest('tr') || img.closest('[role="row"]');
    let artist = '';
    let title = '';

    if (row) {
      const cells = row.querySelectorAll('td, [role="cell"]');
      const link = row.querySelector('a[href*="SpecialRelease/"]');
      if (link) title = (link.textContent || '').trim();
      if (cells.length >= 3) {
        const c1 = (cells[1]?.textContent || '').trim();
        const c2 = (cells[2]?.textContent || '').trim();
        if (!artist) artist = c2 || c1;
        if (!title) title = c1 || link?.textContent?.trim();
      }
    }
    if (!title && img.alt) title = img.alt.trim();
    if (!artist) {
      const block = img.closest('div, section, tr');
      if (block) {
        const h2 = block.querySelector('h2');
        if (h2) artist = (h2.textContent || '').trim();
      }
    }
    if (!artist) {
      const prev = img.closest('tr')?.previousElementSibling;
      if (prev?.querySelector('h2')) artist = (prev.querySelector('h2').textContent || '').trim();
    }

    if (!artist || !title || title.length < 2) continue;
    const key = (artist + '|' + title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ artist, title, url: imgUrl });
  }

  if (out.length < 20) {
    const rows = document.querySelectorAll('tr');
    for (const row of rows) {
      const img = row.querySelector('img[src*="broadtime.com/Photo/"]');
      const link = row.querySelector('a[href*="SpecialRelease/"]');
      if (!img || !link) continue;
      const m = img.src.match(/broadtime\.com\/Photo\/(\d+)/);
      if (!m) continue;
      const title = (link.textContent || '').trim();
      if (!title) continue;
      const cells = row.querySelectorAll('td');
      const artist = (cells[2]?.textContent || cells[1]?.textContent || '').trim();
      if (!artist) continue;
      const key = (artist + '|' + title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ artist, title, url: `https://img.broadtime.com/Photo/${m[1]}:250` });
    }
  }
  return out;
};

async function main() {
  const headed = process.argv.includes('--headed');
  const useProfile = process.argv.includes('--profile');
  console.log('Launching browser with stealth' + (headed ? ' (visible)' : '') + (useProfile ? ' (Chrome profile)' : '') + '...');
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
  const launchOpts = {
    headless: headed || useProfile ? false : 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  };
  if (useProfile && process.platform === 'darwin') {
    const profilePath = path.join(process.env.HOME || '', 'Library', 'Application Support', 'Google', 'Chrome', 'Default');
    if (require('fs').existsSync(profilePath)) {
      launchOpts.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      launchOpts.userDataDir = path.join(process.env.HOME || '', '.cursor-rsd-chrome-profile');
    }
  }
  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('https://recordstoreday.com/SpecialReleases?view=all', { waitUntil: 'networkidle2', timeout: 60000 });
    if (headed || useProfile) {
      console.log('Waiting 5s for page to settle (solve captcha if visible)...');
      await new Promise(r => setTimeout(r, 5000));
    }
    await page.waitForSelector('img[src*="broadtime.com"]', { timeout: 15000 }).catch(() => {});

    const data = await page.evaluate(extractInPage);
    const outPath = path.join(__dirname, '..', 'data', 'rsd_extracted.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log('Extracted', data.length, 'releases to', outPath);
    if (data.length < 50) {
      console.error('Low count - you may have gotten a captcha page. Try: node scripts/extract-rsd-with-puppeteer.js --headed');
    } else {
      console.log('Run: node scripts/build-rsd-images.js --from-json data/rsd_extracted.json');
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
