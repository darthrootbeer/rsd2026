#!/usr/bin/env node
/**
 * Parse official RSD 2026 HTML sources and build authoritative dataset
 * Sources: rsd2026_1.html, rsd2026_2.html, rsd2026_images.html
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

function parseReleaseFromHTML(htmlPath) {
  console.log(`Parsing ${path.basename(htmlPath)}...`);
  const content = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(content);
  const releases = [];
  const seen = new Set();

  // Check if this file uses table format (rsd2026_1, rsd2026_2) or div format (rsd2026_images)
  const hasTable = $('table tr[data-index]').length > 0;

  if (hasTable) {
    // Parse table format (rsd2026_1, rsd2026_2)
    $('table tr[data-index]').each((i, row) => {
      try {
        const cells = $(row).find('td');
        if (cells.length < 5) return;

        // Table format: [0]=thumbnail, [1]=title+link, [2]=artist, [3]=label, [4]=format, [5]=description, [6]=quantity
        const titleLink = $(cells[1]).find('a').first();
        const title = titleLink.text().trim();
        const href = titleLink.attr('href') || '';
        const rsdIdMatch = href.match(/SpecialRelease\/(\d+)/);
        const rsdId = rsdIdMatch ? rsdIdMatch[1] : null;

        const artist = $(cells[2]).text().trim().replace(/&amp;/g, '&');
        const label = $(cells[3]).text().trim();
        const format = $(cells[4]).text().trim();
        // In table views, this cell is the release type ("RSD Exclusive", "'RSD First'", etc.)
        const releaseTypeCell = $(cells[5]).text().trim();
        const quantityCell = cells[6] ? $(cells[6]).text().trim() : '';
        const quantityNumeric = quantityCell.replace(/[^0-9]/g, '');
        const pressingQty = quantityNumeric ? quantityNumeric : '';

        // For table rows, the real long-form description lives in the quickview "More Info" block.
        // Keep a short placeholder description here (release type), but store the rich HTML in MoreInfo.
        const description = releaseTypeCell;

        // Look for the in-row quickview block to extract MORE INFO + Tracklist HTML
        let moreInfoHtml = '';
        let tracklistHtml = '';
        const quick = $(row).find('.quickview_description');
        if (quick.length) {
          const paras = quick.find('p');
          if (paras.length) {
            moreInfoHtml = $(paras[0]).html().trim();
            // Find a paragraph that looks like the tracklist
            paras.each((_, p) => {
              const txt = $(p).text().trim().toLowerCase();
              if (!tracklistHtml && txt.startsWith('tracklist')) {
                tracklistHtml = $(p).html().trim();
              }
            });
          }
        }

        // Determine if reissue based on short description + MORE INFO text
        const descCombined = `${description} ${moreInfoHtml}`.toLowerCase();
        let isReissue = 'Unknown';
        if (descCombined.includes('reissue') || descCombined.includes('originally released') ||
            descCombined.includes('first time on vinyl') || descCombined.includes('re-release') ||
            descCombined.includes('anniversary') || descCombined.includes('expanded edition')) {
          isReissue = 'Yes';
        } else if (descCombined.includes('new album') || descCombined.includes('debut album') ||
                   descCombined.includes('brand new') || descCombined.includes('new release')) {
          isReissue = 'No';
        }

        if (!artist || !title) return;

        const key = `${artist}|${title}`;
        if (seen.has(key)) return;
        seen.add(key);

        releases.push({
          Artist: artist,
          Title: title,
          Label: label || 'Unknown',
          Format: format || 'LP',
          Description: description || '',
          MoreInfo: moreInfoHtml || '',
          Tracklist: tracklistHtml || '',
          'Release Type': releaseTypeCell || '',
          'Pressing Quantity': pressingQty,
          'RSD Date': 'April 18, 2026',
          'Is Reissue': isReissue,
          Price: 'Unknown',
          'Price Source': 'Not Available',
          'Genre 1': '',
          'Style 1': '',
          'Style 2': '',
          rsdId: rsdId,
          imageUrl: null  // Table format doesn't have images inline
        });

      } catch (e) {
        console.error('Error parsing table row:', e.message);
      }
    });
  } else {
    // Parse .product-layout format (rsd2026_images.html / rsd_specialreleases_2026)
    $('.product-layout').each((i, elem) => {
      try {
        // Extract artist
        const artist = $(elem).find('.caption > .name:not(.title), h2').first().text().trim().replace(/&amp;/g, '&');

        // Extract title
        let title = $(elem).find('.caption .name.title em, .caption .name.title a').first().text().trim().replace(/&amp;/g, '&');
        if (!title) {
          const titleLink = $(elem).find('a[href*="SpecialRelease/"]').first();
          title = titleLink.text().trim().replace(/&amp;/g, '&');
        }

        // Extract RSD release ID
        let rsdId = null;
        const linkElem = $(elem).find('a[href*="SpecialRelease/"]').first();
        if (linkElem.length) {
          const href = linkElem.attr('href') || '';
          const idMatch = href.match(/SpecialRelease\/(\d+)/);
          if (idMatch) rsdId = idMatch[1];
        }

        // Extract image URL (use higher resolution for detail view)
        let imageUrl = null;
        const imgElem = $(elem).find('img[src*="broadtime"], img[data-src*="broadtime"]').first();
        if (imgElem.length) {
          const imgSrc = imgElem.attr('data-src') || imgElem.attr('src') || '';
          const photoMatch = imgSrc.match(/https:\/\/img\.broadtime\.com\/Photo\/(\d+)/);
          if (photoMatch) {
            imageUrl = `https://img.broadtime.com/Photo/${photoMatch[1]}:800`;
          }
        }

        // Extract label
        let label = '';
        const labelTd = $(elem).parents('tr').find('td').eq(3);
        if (labelTd.length) {
          label = labelTd.text().trim();
        }

        // Extract format
        let format = '';
        const formatSpan = $(elem).find('span:contains("Format")').parent();
        if (formatSpan.length) {
          format = formatSpan.text().replace('Format:', '').trim();
        } else {
          const formatTd = $(elem).parents('tr').find('td').eq(4);
          if (formatTd.length) {
            format = formatTd.text().trim();
          }
        }

        // Extract release type & pressing quantity from the parent table row
        let releaseTypeCell = '';
        let pressingQty = '';
        const rowTds = $(elem).parents('tr').find('td');
        if (rowTds.length >= 7) {
          releaseTypeCell = rowTds.eq(5).text().trim();
          const quantityCell = rowTds.eq(6).text().trim();
          const quantityNumeric = quantityCell.replace(/[^0-9]/g, '');
          pressingQty = quantityNumeric ? quantityNumeric : '';
        }

        // Extract MORE INFO + Tracklist HTML from quickview_description
        let description = '';
        let moreInfoHtml = '';
        let tracklistHtml = '';
        const quick = $(elem).find('.quickview_description');
        if (quick.length) {
          const paras = quick.find('p');
          if (paras.length) {
            description = $(paras[0]).text().trim();
            moreInfoHtml = $(paras[0]).html().trim();
            paras.each((_, p) => {
              const txt = $(p).text().trim().toLowerCase();
              if (!tracklistHtml && txt.startsWith('tracklist')) {
                tracklistHtml = $(p).html().trim();
              }
            });
          }
        } else {
          // Fallback: original behavior (first paragraph text)
          description = $(elem).find('.quickview_description p').first().text().trim();
        }

        // Determine if reissue based on combined description + MORE INFO
        const descCombined = `${description} ${moreInfoHtml}`.toLowerCase();
        let isReissue = 'Unknown';
        if (descCombined.includes('reissue') || descCombined.includes('originally released') ||
            descCombined.includes('first time on vinyl') || descCombined.includes('re-release') ||
            descCombined.includes('anniversary') || descCombined.includes('expanded edition')) {
          isReissue = 'Yes';
        } else if (descCombined.includes('new album') || descCombined.includes('debut album') ||
                   descCombined.includes('brand new') || descCombined.includes('new release')) {
          isReissue = 'No';
        }

        if (!artist || !title) return;

        const key = `${artist}|${title}`;
        if (seen.has(key)) return;
        seen.add(key);

        releases.push({
          Artist: artist,
          Title: title,
          Label: label || 'Unknown',
          Format: format || 'LP',
          Description: description || '',
          MoreInfo: moreInfoHtml || '',
          Tracklist: tracklistHtml || '',
          'Release Type': releaseTypeCell || '',
          'Pressing Quantity': pressingQty,
          'RSD Date': 'April 18, 2026',
          'Is Reissue': isReissue,
          Price: 'Unknown',
          'Price Source': 'Not Available',
          'Genre 1': '',
          'Style 1': '',
          'Style 2': '',
          rsdId: rsdId,
          imageUrl: imageUrl
        });

      } catch (e) {
        console.error('Error parsing release:', e.message);
      }
    });
  }  // end if/else for table vs div format

  console.log(`  Found ${releases.length} releases`);
  return releases;
}

/** Normalize "Artist|Title" for matching (trim, lowercase). */
function normalizeKey(artist, title) {
  return `${(artist || '').trim()}|${(title || '').trim()}`.toLowerCase();
}

/** Parse a single CSV line respecting quoted fields (handles "April 18, 2026"). */
function parseCSVLine(line) {
  const row = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') { field += '"'; i++; }
          else break;
        } else {
          field += line[i];
          i++;
        }
      }
      row.push(field.trim());
      if (line[i] === ',') i++;
    } else {
      let field = '';
      while (i < line.length && line[i] !== ',') {
        field += line[i];
        i++;
      }
      row.push(field.trim());
      if (line[i] === ',') i++;
    }
  }
  return row;
}

/**
 * Load rsd2026_master.csv and return a Map: normalizedKey -> { 'Genre 1', 'Style 1', 'Style 2' }.
 * Uses parseCSVLine so quoted fields (e.g. "April 18, 2026") don't break column indices.
 */
function loadGenreStyleFromCSV(csvPath) {
  const map = new Map();
  if (!fs.existsSync(csvPath)) return map;
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return map;
  const headerRow = parseCSVLine(lines[0]);
  const idx = {
    artist: headerRow.findIndex(c => c.trim() === 'Artist'),
    title: headerRow.findIndex(c => c.trim() === 'Title'),
    genre1: headerRow.findIndex(c => c.trim() === 'Genre 1'),
    style1: headerRow.findIndex(c => c.trim() === 'Style 1'),
    style2: headerRow.findIndex(c => c.trim() === 'Style 2'),
  };
  if ([idx.artist, idx.title, idx.genre1, idx.style1, idx.style2].some(i => i < 0)) return map;
  const maxCol = Math.max(idx.artist, idx.title, idx.genre1, idx.style1, idx.style2);
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length <= maxCol) continue;
    const artist = row[idx.artist]?.trim() || '';
    const title = row[idx.title]?.trim() || '';
    const g1 = row[idx.genre1]?.trim() || '';
    const s1 = row[idx.style1]?.trim() || '';
    const s2 = row[idx.style2]?.trim() || '';
    if (!artist || !title) continue;
    const key = normalizeKey(artist, title);
    map.set(key, { 'Genre 1': g1, 'Style 1': s1, 'Style 2': s2 });
  }
  return map;
}

/** Very simple heuristic genre inference when no structured genre/style exists. */
function inferGenreFromRelease(release) {
  const desc = (release.Description || '').toLowerCase();
  const label = (release.Label || '').toLowerCase();

  if (!desc && !label) return '';

  if (/reggae|dub\b/.test(desc) || /real rock|trojan|vp records/.test(label)) return 'Reggae';
  if (/jazz/.test(desc) || /blue note|impulse!|verve/.test(label)) return 'Jazz';
  if (/metal/.test(desc) || /metal blade|nuclear blast/.test(label)) return 'Metal';
  if (/punk/.test(desc)) return 'Punk';
  if (/hip[- ]?hop|\\brap\\b/.test(desc)) return 'Hip Hop';
  if (/soul|r&b|rnb|funk/.test(desc)) return 'Soul/Funk';
  if (/electronic|house|techno|synth/.test(desc)) return 'Electronic';
  if (/soundtrack|original score/.test(desc)) return 'Soundtrack';
  if (/country/.test(desc)) return 'Country';
  if (/pop\\b/.test(desc)) return 'Pop';
  if (/rock/.test(desc)) return 'Rock';

  return '';
}

function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const projectRoot = path.join(__dirname, '..');

  // Parse all three source files
  const sources = [
    path.join(dataDir, 'rsd2026_1.html'),
    path.join(dataDir, 'rsd2026_2.html'),
    path.join(dataDir, 'rsd2026_images.html')
  ];

  let allReleases = [];
  const seenKeys = new Set();

  for (const source of sources) {
    if (!fs.existsSync(source)) {
      console.warn(`Warning: ${path.basename(source)} not found`);
      continue;
    }
    const releases = parseReleaseFromHTML(source);

    // Deduplicate across files
    for (const release of releases) {
      const key = `${release.Artist}|${release.Title}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allReleases.push(release);
      } else {
        // Update existing release if this one has more data
        const existing = allReleases.find(r => `${r.Artist}|${r.Title}` === key);
        if (existing) {
          if (!existing.imageUrl && release.imageUrl) existing.imageUrl = release.imageUrl;
          if (!existing.rsdId && release.rsdId) existing.rsdId = release.rsdId;
          // Prefer the longer, more descriptive text when merging descriptions
          if (release.Description && (!existing.Description || release.Description.length > existing.Description.length)) {
            existing.Description = release.Description;
          }
          // Merge MORE INFO and tracklist HTML if present
          if (release.MoreInfo && !existing.MoreInfo) existing.MoreInfo = release.MoreInfo;
          if (release.Tracklist && !existing.Tracklist) existing.Tracklist = release.Tracklist;
          // Merge release type and pressing quantity
          if (release['Release Type'] && !existing['Release Type']) existing['Release Type'] = release['Release Type'];
          if (release['Pressing Quantity'] && !existing['Pressing Quantity']) existing['Pressing Quantity'] = release['Pressing Quantity'];
          if (existing.Label === 'Unknown' && release.Label) existing.Label = release.Label;
        }
      }
    }
  }

  // Sort by artist
  allReleases.sort((a, b) => a.Artist.localeCompare(b.Artist));

  // Merge genre/style from rsd2026_master.csv when present
  const csvPath = path.join(projectRoot, 'rsd2026_master.csv');
  const genreStyleMap = loadGenreStyleFromCSV(csvPath);
  let enrichedGenreStyle = 0;
  for (const release of allReleases) {
    const key = normalizeKey(release.Artist, release.Title);
    const row = genreStyleMap.get(key);
    if (row && (row['Genre 1'] || row['Style 1'] || row['Style 2'])) {
      release['Genre 1'] = row['Genre 1'];
      release['Style 1'] = row['Style 1'];
      release['Style 2'] = row['Style 2'];
      enrichedGenreStyle++;
    }
  }
  if (genreStyleMap.size > 0) {
    console.log(`\nGenre/Style: enriched ${enrichedGenreStyle}/${allReleases.length} from rsd2026_master.csv`);
  }

  // Heuristically infer Genre 1 for releases still missing it
  let inferredGenre = 0;
  for (const release of allReleases) {
    if (!release['Genre 1']) {
      const g = inferGenreFromRelease(release);
      if (g) {
        release['Genre 1'] = g;
        inferredGenre++;
      }
    }
  }
  if (inferredGenre > 0) {
    console.log(`Genre heuristic: inferred Genre 1 for ${inferredGenre} releases`);
  }

  // Validation
  console.log('\n=== VALIDATION REPORT ===');
  const withImages = allReleases.filter(r => r.imageUrl).length;
  const withIds = allReleases.filter(r => r.rsdId).length;
  const totalReleases = allReleases.length;
  const withGenreOrStyle = allReleases.filter(r => r['Genre 1'] || r['Style 1'] || r['Style 2']).length;

  console.log(`Total releases: ${totalReleases}`);
  console.log(`With images: ${withImages}/${totalReleases} (${((withImages/totalReleases)*100).toFixed(1)}%)`);
  console.log(`With RSD IDs: ${withIds}/${totalReleases} (${((withIds/totalReleases)*100).toFixed(1)}%)`);
  console.log(`With genre/style: ${withGenreOrStyle}/${totalReleases} (${((withGenreOrStyle/totalReleases)*100).toFixed(1)}%)`);

  // Check for conflicts
  let conflicts = 0;
  const conflictKeys = new Map();
  for (const r of allReleases) {
    const key = `${r.Artist}|${r.Title}`;
    if (conflictKeys.has(key)) {
      const existing = conflictKeys.get(key);
      if (existing.imageUrl !== r.imageUrl || existing.rsdId !== r.rsdId) {
        console.warn(`CONFLICT: ${key}`);
        console.warn(`  First: img=${existing.imageUrl}, id=${existing.rsdId}`);
        console.warn(`  Second: img=${r.imageUrl}, id=${r.rsdId}`);
        conflicts++;
      }
    }
    conflictKeys.set(key, r);
  }
  console.log(`Conflicts: ${conflicts}`);
  console.log('=========================\n');

  if (withImages < totalReleases * 0.95) {
    console.error('⚠️  WARNING: Less than 95% have images!');
  }
  if (withIds < totalReleases * 0.95) {
    console.error('⚠️  WARNING: Less than 95% have RSD IDs!');
  }

  // Write releases_data.js
  const releasesPath = path.join(__dirname, '..', 'releases_data.js');
  const releasesForExport = allReleases.map(r => {
    const copy = {...r};
    delete copy.rsdId;
    delete copy.imageUrl;
    return copy;
  });

  const releasesContent = `// RSD 2026 Official Releases - Parsed from recordstoreday.com
// Generated: ${new Date().toISOString()}
// Total releases: ${allReleases.length}

const RELEASES_DATA = ${JSON.stringify(releasesForExport, null, 2)};
`;

  fs.writeFileSync(releasesPath, releasesContent);
  console.log(`\nWrote ${releasesPath}`);

  // Write rsd_images.js with both image map and ID map
  const imageMap = {};
  const idMap = {};

  for (const release of allReleases) {
    const key = `${release.Artist}|${release.Title}`;
    const keyLower = key.toLowerCase();

    if (release.imageUrl) {
      imageMap[key] = release.imageUrl;
      if (keyLower !== key) imageMap[keyLower] = release.imageUrl;
    }

    if (release.rsdId) {
      idMap[key] = release.rsdId;
      if (keyLower !== key) idMap[keyLower] = release.rsdId;
    }
  }

  const imagesPath = path.join(__dirname, '..', 'rsd_images.js');
  const lines = ['/** RSD 2026 album art and release IDs - built from official sources */', ''];

  lines.push('const RSD_IMAGE_MAP = {');
  for (const [k, v] of Object.entries(imageMap)) {
    const keyEscaped = k.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    lines.push(`  '${keyEscaped}': '${v}',`);
  }
  lines.push('};');
  lines.push('');

  lines.push('const RSD_RELEASE_ID_MAP = {');
  for (const [k, v] of Object.entries(idMap)) {
    const keyEscaped = k.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    lines.push(`  '${keyEscaped}': '${v}',`);
  }
  lines.push('};');
  lines.push('');

  // Add helper functions with fuzzy matching
  lines.push('function _normalize(s) {');
  lines.push('  if (!s || typeof s !== \'string\') return \'\';');
  lines.push('  return s.toLowerCase()');
  lines.push('    .replace(/^the\\s+/i, \'\')');
  lines.push('    .replace(/\\s+feat\\.?\\s+/g, \' & \')');
  lines.push('    .replace(/\\s+featuring\\s+/g, \' & \')');
  lines.push('    .replace(/\\s+and\\s+/g, \' & \')');
  lines.push('    .replace(/[\\\'\\u2019]/g, \'\')');
  lines.push('    .replace(/[-\\u2013\\u2014]/g, \' \')');
  lines.push('    .replace(/\\s+/g, \' \')');
  lines.push('    .replace(/\\(deluxe[^)]*\\)|\\(expanded[^)]*\\)|\\(remastered[^)]*\\)|\\(rsd[^)]*\\)| ep\\b| \\d+th anniversary[^)]*\\)?/gi, \'\')');
  lines.push('    .replace(/[^\\w\\s&-]/g, \' \')');
  lines.push('    .replace(/\\s+/g, \' \')');
  lines.push('    .trim();');
  lines.push('}');
  lines.push('');

  lines.push('function _coreTitle(t) {');
  lines.push('  const n = _normalize(t);');
  lines.push('  const dash = n.indexOf(\' - \');');
  lines.push('  const paren = n.indexOf(\' (\');');
  lines.push('  const cut = Math.min(dash >= 0 ? dash : 999, paren >= 0 ? paren : 999);');
  lines.push('  return (cut < 999 ? n.slice(0, cut) : n).slice(0, 50);');
  lines.push('}');
  lines.push('');

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

  fs.writeFileSync(imagesPath, lines.join('\n'));
  console.log(`Wrote ${imagesPath}`);
  console.log(`  Image map entries: ${Object.keys(imageMap).length}`);
  console.log(`  ID map entries: ${Object.keys(idMap).length}`);

  console.log('\n✓ Done! Official RSD 2026 data rebuilt from authoritative sources.');
}

main();
