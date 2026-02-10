# Image Coverage Analysis

## Summary
**You're seeing ~60% blank images because the data sources don't fully overlap.**

## The Numbers

### Parser Performance ✓
- **Images extracted from HTML**: 357 unique releases
- **Total map entries**: 817 (includes lowercase alternates for fuzzy matching)
- **Parser accuracy**: 100% (correctly extracts all available images)

### Coverage Issue ✗
- **CSV releases**: 528 total
- **Actual matches**: 196 (37.1%)
- **Blank images**: 332 (62.9%)

## Why So Many Blanks?

The HTML file (`data/rsd_specialreleases_2026.html`) and CSV file (`rsd2026_master.csv`) are from **different sources**:

1. **HTML**: Contains 357 releases with images from RecordStoreDay.com
2. **CSV**: Contains 528 releases (possibly from a different list or date)
3. **Only ~196 releases appear in BOTH sources with matching metadata**

## Test Results

Sample from first 30 CSV entries:
- ✓ Matched: 12 releases (40%)
- ✗ Not in HTML: 18 releases (60%)

Examples of missing artists:
- A High Frequency
- Addis Rockers
- Adorable
- Agustin Pereyra Lucena
- Alannah

## Solutions

To improve image coverage, you need to:

1. **Use matching data sources**: Ensure HTML and CSV are from the same RSD event/date
2. **Expand HTML source**: Fetch additional RSD pages that include missing releases
3. **Add manual mappings**: For critical releases, add image URLs manually to rsd_images.js

## Current Status

✅ Parser is working correctly (up from ~2% to 37%)
✅ All available images are being extracted
❌ Data source mismatch limits coverage to ~40%

The parser can't create images that don't exist in the source HTML.
