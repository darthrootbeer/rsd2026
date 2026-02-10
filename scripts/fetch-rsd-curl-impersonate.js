#!/usr/bin/env node
/**
 * Fetch RSD SpecialReleases using curl-impersonate (Chrome TLS fingerprint).
 * Bypasses many bot blocks by mimicking real Chrome's TLS/HTTP2 handshake.
 * Run: node scripts/fetch-rsd-curl-impersonate.js
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const { RequestBuilder } = require('@qnaplus/node-curl-impersonate');
  const url = 'https://recordstoreday.com/SpecialReleases?view=all';
  console.log('Fetching with Chrome TLS fingerprint...');
  const response = await new RequestBuilder()
    .url(url)
    .preset({ name: 'chrome', version: '110' })
    .send();
  const content = response.getBody().toString();
  const count = (content.match(/broadtime\.com\/Photo\/\d+/g) || []).length;
  if (count < 10) {
    console.error('Got', count, 'images - likely captcha page.');
    process.exit(1);
  }
  const outPath = path.join(__dirname, '..', 'data', 'rsd_specialreleases_2026.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
  console.log('Saved', outPath, 'with ~' + count, 'image refs');
  console.log('Run: npm run build:rsd-images data/rsd_specialreleases_2026.html');
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
