#!/usr/bin/env node
/**
 * Fetch RSD SpecialReleases page and save to data/rsd_specialreleases_2026.txt
 * Use this if npm run build:rsd-images:fetch fails (e.g. captcha).
 * Alternative: Open https://recordstoreday.com/SpecialReleases in your browser,
 * Save Page As → Web Page, Complete, save to data/rsd_specialreleases_2026.txt
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://recordstoreday.com/SpecialReleases';
const outPath = path.join(__dirname, '..', 'data', 'rsd_specialreleases_2026.txt');

const opts = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  }
};

https.get(url, opts, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, d);
    const bc = (d.match(/broadtime/g) || []).length;
    console.log('Saved', d.length, 'bytes to', outPath);
    console.log('broadtime URLs found:', bc);
    if (bc === 0) {
      console.error('\nNo images found - you may have received a captcha page.');
      console.error('Manually save the page: Open the URL in your browser,');
      console.error('then File → Save As → Web Page, Complete');
    }
  });
}).on('error', e => {
  console.error('Fetch error:', e.message);
  process.exit(1);
});
