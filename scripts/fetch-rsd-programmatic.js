#!/usr/bin/env node
/**
 * Programmatic fetch of RSD SpecialReleases - tries multiple strategies.
 *
 * Strategies (in order):
 * 1. curl-impersonate (Chrome TLS fingerprint) - x64 only
 * 2. Puppeteer + Stealth plugin (headless)
 * 3. Playwright with Chrome channel
 * 4. Puppeteer headed (--headed) - user can solve captcha
 *
 * Run: node scripts/fetch-rsd-programmatic.js [--headed]
 * Or:  npm run fetch:rsd
 */
const fs = require('fs');
const path = require('path');
const url = 'https://recordstoreday.com/SpecialReleases?view=all';

function isValidContent(html) {
  if (!html || typeof html !== 'string') return false;
  const count = (html.match(/broadtime\.com\/Photo\/\d+/g) || []).length;
  return count >= 20;
}

async function tryCurlImpersonate() {
  if (process.arch !== 'x64') return null;
  try {
    const { RequestBuilder } = require('@qnaplus/node-curl-impersonate');
    const response = await new RequestBuilder()
      .url(url)
      .preset({ name: 'chrome', version: '110' })
      .send();
    return response.getBody().toString();
  } catch (e) {
    return null;
  }
}

async function tryPuppeteerStealth(headed) {
  try {
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({
      headless: headed ? false : 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    if (headed) await page.waitForTimeout(5000);
    const content = await page.content();
    await browser.close();
    return content;
  } catch (e) {
    return null;
  }
}

async function tryPlaywright() {
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);
    const content = await page.content();
    await browser.close();
    return content;
  } catch (e) {
    return null;
  }
}

async function tryBrowserless() {
  const key = process.env.BROWSERLESS_API_KEY;
  if (!key) return null;
  try {
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${key}`,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const content = await page.content();
    await browser.close();
    return content;
  } catch (e) {
    return null;
  }
}

async function main() {
  const headed = process.argv.includes('--headed');
  const outPath = path.join(__dirname, '..', 'data', 'rsd_specialreleases_2026.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const strategies = [
    { name: 'curl-impersonate (Chrome TLS)', fn: () => tryCurlImpersonate() },
    { name: 'Browserless (BROWSERLESS_API_KEY)', fn: () => tryBrowserless() },
    { name: 'Puppeteer + Stealth', fn: () => tryPuppeteerStealth(headed) },
    { name: 'Playwright Chrome', fn: () => tryPlaywright() },
  ];

  for (const s of strategies) {
    if (s.name.includes('curl-impersonate') && process.arch !== 'x64') continue;
    if (s.name.includes('Browserless') && !process.env.BROWSERLESS_API_KEY) continue;
    process.stderr.write('Trying ' + s.name + '... ');
    try {
      const html = await s.fn();
      if (html && isValidContent(html)) {
        fs.writeFileSync(outPath, html);
        const count = (html.match(/broadtime\.com\/Photo\/\d+/g) || []).length;
        console.log('OK – saved', count, 'image refs to', outPath);
        console.log('Run: npm run build:rsd-images data/rsd_specialreleases_2026.html');
        return;
      }
    } catch (e) {
      process.stderr.write('failed\n');
    }
    process.stderr.write('failed\n');
  }

  console.error('\nAll strategies failed (AWS WAF captcha). Options:');
  console.error('  1. node scripts/fetch-rsd-programmatic.js --headed  (solve captcha in visible browser)');
  console.error('  2. BROWSERLESS_API_KEY=xxx node scripts/fetch-rsd-programmatic.js  (free tier at browserless.io)');
  console.error('  3. Manually save the page: File → Save As → Web Page, Complete');
  process.exit(1);
}

main();
