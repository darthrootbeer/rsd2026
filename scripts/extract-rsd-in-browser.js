/**
 * Run this in the browser console on https://recordstoreday.com/SpecialReleases
 * 1. Open the page, wait for it to load fully
 * 2. Open DevTools (F12) → Console
 * 3. Paste this entire script and press Enter
 * 4. Copy the JSON output
 * 5. Save to data/rsd_extracted.json
 * 6. Run: node scripts/build-rsd-images.js --from-json data/rsd_extracted.json
 */
(function() {
  const out = [];
  const seen = new Set();

  // Find all img with broadtime Photo (exclude Animation like RSD MRKT logo)
  const imgs = document.querySelectorAll('img[src*="broadtime.com/Photo/"]');
  for (const img of imgs) {
    const m = img.src.match(/broadtime\.com\/Photo\/(\d+)/);
    if (!m) continue;
    const photoId = m[1];
    const imgUrl = `https://img.broadtime.com/Photo/${photoId}:250`;

    // Find containing row - could be tr or a parent div
    let row = img.closest('tr') || img.closest('[role="row"]') || img.closest('li') || img.closest('.product');
    if (!row) {
      row = img.closest('table') ? img.closest('tbody')?.querySelector('tr') : null;
    }
    // Fallback: walk up to find a block that has both artist and title
    if (!row) {
      let el = img.parentElement;
      for (let i = 0; i < 15 && el; i++) {
        const text = el.textContent || '';
        if (text.length > 20 && text.length < 2000) {
          row = el;
          break;
        }
        el = el.parentElement;
      }
    }

    let artist = '';
    let title = '';

    if (row) {
      const cells = row.querySelectorAll('td, [role="cell"]');
      if (cells.length >= 3) {
        // Table: often Title | Artist | ...
        const t1 = (cells[1]?.textContent || '').trim();
        const t2 = (cells[2]?.textContent || '').trim();
        // Check which looks like title vs artist (title often has more words, artist is shorter)
        if (t1 && t2) {
          const link = row.querySelector('a[href*="SpecialRelease/"]');
          const linkText = (link?.textContent || '').trim();
          if (linkText) title = linkText;
          if (!title && t1.length >= 2) title = t1;
          if (!artist && t2.length >= 2) artist = t2;
          if (!title) title = t1;
          if (!artist) artist = t2;
        }
      }
      if (!title) {
        const link = row.querySelector('a[href*="SpecialRelease/"]');
        if (link) title = (link.textContent || '').trim();
      }
      if (!artist) {
        const h2 = row.querySelector('h2, .artist, [class*="artist"]');
        if (h2) artist = (h2.textContent || '').trim();
      }
    }

    if (!title && img.alt) title = img.alt.trim();
    if (!artist) {
      const prev = img.closest('tr')?.previousElementSibling;
      if (prev) {
        const h2 = prev.querySelector('h2');
        if (h2) artist = (h2.textContent || '').trim();
      }
    }
    if (!artist) {
      const block = img.closest('div, section, article') || img.parentElement?.parentElement;
      if (block) {
        const h2 = block.querySelector('h2');
        if (h2) artist = (h2.textContent || '').trim();
      }
    }

    if (!artist || !title || title.length < 2) continue;
    const key = artist + '|' + title;
    if (seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());

    out.push({ artist, title, url: imgUrl });
  }

  // Alternative: parse from table rows that have SpecialRelease links
  if (out.length < 10) {
    const links = document.querySelectorAll('a[href*="SpecialRelease/"]');
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const releaseId = href.match(/SpecialRelease\/(\d+)/)?.[1];
      if (!releaseId) continue;
      const title = (a.textContent || '').trim();
      if (!title || title.length < 2) continue;

      const row = a.closest('tr') || a.closest('[role="row"]');
      if (!row) continue;
      const cells = row.querySelectorAll('td, [role="cell"]');
      let artist = '';
      if (cells.length >= 3) {
        artist = (cells[2]?.textContent || cells[1]?.textContent || '').trim();
        if (!artist && cells[0]) {
          const prevCell = cells[0].querySelector('img');
          if (prevCell) artist = (cells[1]?.textContent || '').trim();
        }
      }
      if (!artist) continue;

      const img = row.querySelector('img[src*="broadtime.com/Photo/"]');
      const m = img?.src?.match(/broadtime\.com\/Photo\/(\d+)/);
      const imgUrl = m ? `https://img.broadtime.com/Photo/${m[1]}:250` : null;
      if (!imgUrl) continue;

      const key = artist + '|' + title;
      if (seen.has(key.toLowerCase())) continue;
      seen.add(key.toLowerCase());
      out.push({ artist, title, url: imgUrl });
    }
  }

  console.log(JSON.stringify(out, null, 2));
  console.log('\n--- Copy the JSON above and save to data/rsd_extracted.json ---');
  console.log('Then run: node scripts/build-rsd-images.js --from-json data/rsd_extracted.json');
  return out;
})();
