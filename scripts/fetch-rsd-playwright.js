#!/usr/bin/env node
/**
 * Programmatic fetch of RSD SpecialReleases using Playwright.
 * Uses system Chrome when available; tries multiple strategies.
 * Run: node scripts/fetch-rsd-playwright.js
 * Output: data/rsd_specialreleases_2026.html
 */
const fs = require('fs');
const path = require('path');

async function fetchWithPlaywright() {
  const { chromium } = require('playwright');
  const url = 'https://recordstoreday.com/SpecialReleases?view=all';
  const strategies = [
    { channel: 'chrome', headless: true },
    { channel: 'chrome', headless: false },
    { headless: true, args: ['--disable-blink-features=AutomationControlled'] },
  ];
  for (const opts of strategies) {
    console.log('Trying:', JSON.stringify(opts));
    const browser = await chromium.launch({
      ...opts,
      args: opts.args || ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      timeout: 60000,
    });
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!res || res.status() !== 200) continue;
      await page.waitForTimeout(5000);
      const hasImages = await page.locator('img[src*="broadtime.com/Photo/"]').count() > 10;
      if (hasImages) {
        const content = await page.content();
        await browser.close();
        return content;
      }
    } catch (e) {
      console.log('  Failed:', e.message);
    }
    await browser.close();
  }
  return null;
}

async function main() {
  console.log('Fetching RSD page with Playwright...');
  const content = await fetchWithPlaywright();
  const outPath = path.join(__dirname, '..', 'data', 'rsd_specialreleases_2026.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (content && content.includes('broadtime.com/Photo/')) {
    fs.writeFileSync(outPath, content);
    const count = (content.match(/broadtime\.com\/Photo\/\d+/g) || []).length;
    console.log('Saved', outPath, 'with ~' + count, 'image refs');
    console.log('Run: npm run build:rsd-images data/rsd_specialreleases_2026.html');
  } else {
    console.error('Failed to fetch valid content (captcha?). Try --headed or manual save.');
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
