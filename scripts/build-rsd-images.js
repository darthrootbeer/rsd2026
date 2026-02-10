#!/usr/bin/env node
/**
 * Build rsd_images.js from RecordStoreDay.com SpecialReleases.
 * Run: node scripts/build-rsd-images.js --fetch   (fetches from RSD website)
 * Run: node scripts/build-rsd-images.js --from-json data/rsd_extracted.json
 * Or: node scripts/build-rsd-images.js [input.txt or .html]
 * Or: cat data/rsd_*.txt | node scripts/build-rsd-images.js
 */

const fs = require('fs');
const path = require('path');
async function fetchRSDPage(headed = false, useProfile = false) {
  console.error('Note: RSD site may block automated requests. If fetch fails, save the page manually.');
  try {
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
    const launchOpts = {
      headless: headed ? false : 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
      ],
    };
    if (useProfile && process.platform === 'darwin') {
      const profilePath = path.join(process.env.HOME || '', 'Library', 'Application Support', 'Google', 'Chrome', 'Default');
      if (fs.existsSync(profilePath)) {
        launchOpts.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        launchOpts.userDataDir = path.join(process.env.HOME || '', '.cursor-rsd-chrome-profile');
        launchOpts.headless = false;
      }
    }
    const browser = await puppeteer.launch(launchOpts);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
      await page.goto('https://recordstoreday.com/SpecialReleases?view=all', { waitUntil: 'networkidle2', timeout: 60000 });
      if (headed || useProfile) {
        await new Promise(r => setTimeout(r, 3000));
      }
      await page.waitForSelector('img[src*="broadtime.com/Photo/"]', { timeout: 15000 }).catch(() => {});
      const content = await page.content();
      return content;
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error('Fetch failed:', e.message);
    return '';
  }
}

function normalizeKey(artist, title) {
  const a = String(artist || '').trim().replace(/\s+/g, ' ').replace(/&amp;/g, '&');
  const t = String(title || '').trim().replace(/\s+/g, ' ').replace(/&amp;/g, '&');
  return `${a}|${t}`;
}

function parseContent(content) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(content);
  const map = {};
  const idMap = {};
  const seen = new Set();

  // Find all product containers
  $('.product-layout').each((i, elem) => {
    try {
      // Extract image URL from .image img
      const imgElem = $(elem).find('.image img[src*="broadtime"], .image img[data-src*="broadtime"]').first();
      if (!imgElem.length) return;

      const imgSrc = imgElem.attr('data-src') || imgElem.attr('src') || '';
      const photoMatch = imgSrc.match(/https:\/\/img\.broadtime\.com\/Photo\/(\d+)/);
      if (!photoMatch) return;

      const photoId = photoMatch[1];
      const imgUrl = `https://img.broadtime.com/Photo/${photoId}:250`;

      // Extract artist from .caption .name (first one, not .title)
      const artist = $(elem).find('.caption > .name:not(.title)').first().text().trim().replace(/&amp;/g, '&');

      // Extract title from .caption .name.title em
      const title = $(elem).find('.caption .name.title em').text().trim().replace(/&amp;/g, '&');

      // Extract RSD release ID from any link to SpecialRelease
      let rsdId = null;
      const linkElem = $(elem).find('a[href*="SpecialRelease/"]').first();
      if (linkElem.length) {
        const href = linkElem.attr('href') || '';
        const idMatch = href.match(/SpecialRelease\/(\d+)/);
        if (idMatch) rsdId = idMatch[1];
      }

      if (!artist || !title || title.length < 2) return;

      const key = normalizeKey(artist, title);
      if (seen.has(key)) return;
      seen.add(key);

      if (!map[key]) map[key] = imgUrl;
      const keyLower = key.toLowerCase();
      if (keyLower !== key && !map[keyLower]) map[keyLower] = imgUrl;

      // Store RSD ID if found
      if (rsdId) {
        if (!idMap[key]) idMap[key] = rsdId;
        if (keyLower !== key && !idMap[keyLower]) idMap[keyLower] = rsdId;
      }

    } catch (e) {
      // Skip malformed entries
    }
  });

  return { map, idMap };
}

function parseFromJson(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const arr = JSON.parse(raw);
  const map = {};
  for (const item of arr) {
    if (!item.artist || !item.title || !item.url) continue;
    const key = normalizeKey(item.artist, item.title);
    if (!map[key]) map[key] = item.url.replace(/:(\d+)$/, ':250');
    const keyLower = key.toLowerCase();
    if (keyLower !== key && !map[keyLower]) map[keyLower] = map[key];
  }
  return map;
}

function parseContentMarkdown(content) {
  const map = {};
  const blocks = content.split(/\[\]\(#quickview__\d+\)|\[View More\]\(#quickview_\d+_\d+\)/);
  for (const block of blocks) {
    const imgMatch = block.match(/\[!\[([^\]]*)\]\((https:\/\/img\.broadtime\.com\/Photo\/\d+):\d+[^)]*\)\]/);
    if (!imgMatch) continue;
    if (imgMatch[2].includes('preload') || imgMatch[2].includes('Animation')) continue;
    const [, titleFromAlt, imgUrlBase] = imgMatch;
    const photoMatch = imgUrlBase.match(/(https:\/\/img\.broadtime\.com\/Photo\/\d+)/);
    if (!photoMatch) continue;
    const imgUrl = photoMatch[1] + ':250';  // Use 250px for consistency

    // Extract artist from ## Artist
    const artistMatch = block.match(/\n## ([^\n#]+)/);
    const artist = artistMatch ? artistMatch[1].trim().replace(/&amp;/g, '&') : '';

    // Extract title from [*Title*](link), *[Title](link)*, or table row
    let title = titleFromAlt?.trim() || '';
    const italicMatch = block.match(/\[\*([^*\n]+)\*\]\(https:\/\/recordstoreday\.com\/SpecialRelease\/\d+\)/);
    if (italicMatch) title = italicMatch[1].trim();
    const altItalicMatch = block.match(/\*\[([^\]]+)\]\(https:\/\/recordstoreday\.com\/SpecialRelease\/\d+\)\*/);
    if (altItalicMatch && !title) title = altItalicMatch[1].trim();
    const tableMatch = block.match(/\|\[([^\]]+)\]\(https:\/\/recordstoreday\.com\/SpecialRelease\/\d+\)\|[^|]+\|/);
    if (tableMatch && !title) title = tableMatch[1].trim();

    if (!artist || !title) continue;

    const key = normalizeKey(artist, title);
    // Prefer exact key; store both for flexible lookup
    if (!map[key]) map[key] = imgUrl;
    const keyLower = key.toLowerCase();
    if (keyLower !== key && !map[keyLower]) map[keyLower] = imgUrl;
  }
  return map;
}

function addAlternateKeysFromReleases(map) {
  const releasesPath = path.join(__dirname, '..', 'data', 'rsd_releases_parsed.json');
  if (!fs.existsSync(releasesPath)) return map;
  const releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
  const keys = Object.keys(map).filter(k => k !== k.toLowerCase());
  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s&-]/g, ' ').trim();
  const coreTitle = (t) => {
    const n = norm(t);
    const i = Math.min(n.indexOf(' - ') >= 0 ? n.indexOf(' - ') : 999, n.indexOf(' (') >= 0 ? n.indexOf(' (') : 999);
    return (i < 999 ? n.slice(0, i) : n).slice(0, 50);
  };
  let added = 0;
  for (const r of releases) {
    const rArtist = (r.artist || r.Artist || '').trim();
    const rTitle = (r.title || r.Title || '').trim();
    if (!rArtist || !rTitle) continue;
    const rKey = normalizeKey(rArtist, rTitle);
    if (map[rKey]) continue;
    const rNorm = norm(rArtist);
    const rCore = coreTitle(rTitle);
    for (const key of keys) {
      if (key === key.toLowerCase()) continue;
      const [mArtist, mTitle] = key.split('|');
      if (!mArtist || !mTitle) continue;
      if (norm(mArtist) !== rNorm) continue;
      const mCore = coreTitle(mTitle);
      if (rCore === mCore || rCore.includes(mCore) || mCore.includes(rCore)) {
        map[rKey] = map[key];
        added++;
        break;
      }
      const rWords = rCore.split(/\s+/).filter(w => w.length >= 4);
      const mWords = mCore.split(/\s+/).filter(w => w.length >= 4);
      if (rWords.some(w => mWords.includes(w)) && rWords.length >= 1) {
        map[rKey] = map[key];
        added++;
        break;
      }
    }
  }
  if (added > 0) console.error('Added', added, 'alternate keys from releases_data');
  return map;
}

async function main() {
  let content;
  const args = process.argv.slice(2);
  const doFetch = args.includes('--fetch') || args.includes('-f');
  const jsonIdx = args.indexOf('--from-json');
  const fromJson = jsonIdx >= 0 && args[jsonIdx + 1] ? args[jsonIdx + 1] : null;
  const input = args.find((a, i) => !a.startsWith('-') && a !== fromJson && (i === 0 || args[i - 1] !== '--from-json'));

  if (fromJson && fs.existsSync(fromJson)) {
    console.log('Building from JSON:', fromJson);
  } else   if (doFetch) {
    console.log('Fetching RecordStoreDay.com/SpecialReleases...');
    const dataPath = path.join(__dirname, '..', 'data', 'rsd_specialreleases_2026.html');
    try {
      const { execSync } = require('child_process');
      const fetchScript = path.join(__dirname, 'fetch-rsd-programmatic.js');
      execSync(`node "${fetchScript}" ${args.includes('--headed') ? '--headed' : ''}`, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
      });
      content = fs.readFileSync(dataPath, 'utf8');
    } catch (_) {
      content = await fetchRSDPage(args.includes('--headed'), args.includes('--profile'));
      if (content && content.includes('broadtime')) {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        fs.writeFileSync(dataPath, content);
        console.log('Saved to', dataPath);
      }
    }
  } else if (input && (input.startsWith('http://') || input.startsWith('https://'))) {
    console.log('Fetching from URL...');
    try {
      const res = await fetch(input, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } });
      content = await res.text();
      if (!content || !content.includes('broadtime')) {
        console.error('Fetched content has no images (captcha?). Try saving the page manually in your browser.');
        process.exit(1);
      }
    } catch (e) {
      console.error('Fetch failed:', e.message);
      process.exit(1);
    }
  } else if (input && fs.existsSync(input)) {
    content = fs.readFileSync(input, 'utf8');
  } else if (!process.stdin.isTTY) {
    content = await new Promise((res, rej) => {
      const chunks = [];
      process.stdin.on('data', c => chunks.push(c));
      process.stdin.on('end', () => res(chunks.join('')));
      process.stdin.on('error', rej);
    });
  } else if (!(fromJson && fs.existsSync(fromJson))) {
    console.error('Usage: node build-rsd-images.js --fetch [--headed]');
    console.error('       node build-rsd-images.js --from-json data/rsd_extracted.json');
    console.error('       node build-rsd-images.js [input.txt or .html]');
    console.error('       cat data/rsd_*.txt | node build-rsd-images.js');
    process.exit(1);
  }

  let map, idMap = {};
  if (fromJson && fs.existsSync(fromJson)) {
    map = parseFromJson(fromJson);
  } else {
    const hasQuickview = /#quickview(_\d+)?(_\d+)?\)/.test(content);
    if (hasQuickview && content.includes('broadtime')) {
      map = parseContentMarkdown(content);
    } else {
      const result = parseContent(content);
      map = result.map;
      idMap = result.idMap;
    }
  }

  map = addAlternateKeysFromReleases(map);

  if (Object.keys(map).length < 100) {
    console.warn(`WARNING: Only ${Object.keys(map).length} entries parsed. Expected ~350+.`);
    console.warn('Check HTML structure or parsing logic.');
  }

  if (Object.keys(map).length === 0) {
    console.error('ERROR: Parsed 0 image entries. Refusing to overwrite rsd_images.js.');
    if (doFetch) console.error('The RSD site may have returned a captcha/block page. Save the page manually in your browser.');
    process.exit(1);
  }

  const outPath = path.join(__dirname, '..', 'rsd_images.js');
  const lines = ['/** RSD 2026 album art from RecordStoreDay.com - built by scripts/build-rsd-images.js */', ''];
  lines.push('const RSD_IMAGE_MAP = {');
  const deduped = Object.entries(map);
  for (const [k, v] of deduped) {
    const keyEscaped = k.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`  '${keyEscaped}': '${v}',`);
  }
  lines.push('};');
  lines.push('');
  lines.push('const RSD_RELEASE_ID_MAP = {');
  const dedupedIds = Object.entries(idMap);
  for (const [k, v] of dedupedIds) {
    const keyEscaped = k.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`  '${keyEscaped}': '${v}',`);
  }
  lines.push('};');
  lines.push('');
  lines.push('function _normalize(s) {');
  lines.push('  if (!s || typeof s !== \'string\') return \'\';');
  lines.push('  return s.toLowerCase()');
  lines.push('    .replace(/^the\\s+/i, \'\')  // Remove "The" prefix');
  lines.push('    .replace(/\\s+feat\\.?\\s+/g, \' & \')  // Normalize collaborations');
  lines.push('    .replace(/\\s+featuring\\s+/g, \' & \')');
  lines.push('    .replace(/\\s+and\\s+/g, \' & \')');
  lines.push('    .replace(/[\\\'\\u2019]/g, \'\')  // Remove apostrophes');
  lines.push('    .replace(/[-\\u2013\\u2014]/g, \' \')  // Normalize dashes');
  lines.push('    .replace(/\\s+/g, \' \')');
  lines.push('    .replace(/\\(deluxe[^)]*\\)|\\(expanded[^)]*\\)|\\(remastered[^)]*\\)|\\(rsd[^)]*\\)| ep\\b| \\d+th anniversary[^)]*\\)?/gi, \'\')');
  lines.push('    .replace(/[^\\w\\s&-]/g, \' \')');
  lines.push('    .replace(/\\s+/g, \' \')');
  lines.push('    .trim();');
  lines.push('}');
  lines.push('function _coreTitle(t) {');
  lines.push('  const n = _normalize(t);');
  lines.push('  const dash = n.indexOf(\' - \');');
  lines.push('  const paren = n.indexOf(\' (\');');
  lines.push('  const cut = Math.min(dash >= 0 ? dash : 999, paren >= 0 ? paren : 999);');
  lines.push('  return (cut < 999 ? n.slice(0, cut) : n).slice(0, 50);');
  lines.push('}');
  lines.push('function _titleOverlap(a, b) {');
  lines.push('  if (!a || !b) return false;');
  lines.push('  if (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;');
  lines.push('  const aWords = a.split(/\\s+/).filter(w => w.length > 2);');
  lines.push('  const bWords = b.split(/\\s+/).filter(w => w.length > 2);');
  lines.push('  for (let i = 0; i < aWords.length; i++) {');
  lines.push('    for (let j = 0; j < bWords.length; j++) {');
  lines.push('      if (aWords[i].length >= 4 && aWords[i] === bWords[j]) return true;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return a.length >= 10 && b.length >= 10 && (a.slice(0, 12) === b.slice(0, 12) || a.slice(0, 15).indexOf(b.slice(0, 15)) >= 0 || b.slice(0, 15).indexOf(a.slice(0, 15)) >= 0);');
  lines.push('}');
  lines.push('');
  lines.push('function getRSDImageUrl(artist, title) {');
  lines.push('  const k = (artist || \'\').trim() + \'|\' + (title || \'\').trim();');
  lines.push('  let url = RSD_IMAGE_MAP[k] || RSD_IMAGE_MAP[k.toLowerCase()] || null;');
  lines.push('  if (url) return url;');
  lines.push('  const nArtist = _normalize(artist);');
  lines.push('  const nTitle = _normalize(title);');
  lines.push('  const coreT = _coreTitle(title);');
  lines.push('  if (!nArtist || coreT.length < 3) return null;');
  lines.push('  const keys = Object.keys(RSD_IMAGE_MAP);');
  lines.push('  for (let i = 0; i < keys.length; i++) {');
  lines.push('    const key = keys[i];');
  lines.push('    if (key === key.toLowerCase()) continue;');
  lines.push('    const pipe = key.indexOf(\'|\');');
  lines.push('    if (pipe < 0) continue;');
  lines.push('    const mArtist = key.slice(0, pipe);');
  lines.push('    const mTitle = key.slice(pipe + 1);');
  lines.push('    if (!mArtist || !mTitle) continue;');
  lines.push('    const nMArtist = _normalize(mArtist);');
  lines.push('    const nmTitle = _normalize(mTitle);');
  lines.push('    const mCore = _coreTitle(mTitle);');
  lines.push('    if (nMArtist !== nArtist) continue;');
  lines.push('    if (nTitle === nmTitle || coreT === mCore) return RSD_IMAGE_MAP[key];');
  lines.push('    if (_titleOverlap(coreT, mCore)) return RSD_IMAGE_MAP[key];');
  lines.push('    if (coreT.length >= 8 && nmTitle.indexOf(coreT.slice(0, 18)) >= 0) return RSD_IMAGE_MAP[key];');
  lines.push('    if (mCore.length >= 8 && nTitle.indexOf(mCore.slice(0, 18)) >= 0) return RSD_IMAGE_MAP[key];');
  lines.push('  }');
  lines.push('  return null;');
  lines.push('}');
  lines.push('');
  lines.push('function getRSDReleaseId(artist, title) {');
  lines.push('  const k = (artist || \'\').trim() + \'|\' + (title || \'\').trim();');
  lines.push('  let id = RSD_RELEASE_ID_MAP[k] || RSD_RELEASE_ID_MAP[k.toLowerCase()] || null;');
  lines.push('  if (id) return id;');
  lines.push('  const nArtist = _normalize(artist);');
  lines.push('  const nTitle = _normalize(title);');
  lines.push('  const coreT = _coreTitle(title);');
  lines.push('  if (!nArtist || coreT.length < 3) return null;');
  lines.push('  const keys = Object.keys(RSD_RELEASE_ID_MAP);');
  lines.push('  for (let i = 0; i < keys.length; i++) {');
  lines.push('    const key = keys[i];');
  lines.push('    if (key === key.toLowerCase()) continue;');
  lines.push('    const pipe = key.indexOf(\'|\');');
  lines.push('    if (pipe < 0) continue;');
  lines.push('    const mArtist = key.slice(0, pipe);');
  lines.push('    const mTitle = key.slice(pipe + 1);');
  lines.push('    if (!mArtist || !mTitle) continue;');
  lines.push('    const nMArtist = _normalize(mArtist);');
  lines.push('    const nmTitle = _normalize(mTitle);');
  lines.push('    const mCore = _coreTitle(mTitle);');
  lines.push('    if (nMArtist !== nArtist) continue;');
  lines.push('    if (nTitle === nmTitle || coreT === mCore) return RSD_RELEASE_ID_MAP[key];');
  lines.push('    if (_titleOverlap(coreT, mCore)) return RSD_RELEASE_ID_MAP[key];');
  lines.push('    if (coreT.length >= 8 && nmTitle.indexOf(coreT.slice(0, 18)) >= 0) return RSD_RELEASE_ID_MAP[key];');
  lines.push('    if (mCore.length >= 8 && nTitle.indexOf(mCore.slice(0, 18)) >= 0) return RSD_RELEASE_ID_MAP[key];');
  lines.push('  }');
  lines.push('  return null;');
  lines.push('}');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${outPath} with ${Object.keys(map).length} entries`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
