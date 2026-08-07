#!/usr/bin/env node
import { isMain } from './lib/cli.mjs';
/**
 * Fetches a Quran verse (Arabic Uthmani text + Diyanet Turkish translation)
 * from api.alquran.cloud and caches it in data/verses-cache.json.
 *
 * This is the ONLY code path allowed to put verse text into the system.
 * Content JSON may only ever reference a verse by "sure:ayet" — the actual
 * text always comes from here, never from free-form generation.
 *
 * Usage: node scripts/fetch-verse.mjs 2:153 [36:1] [...]
 *        import { fetchVerse } from './fetch-verse.mjs'
 */
import path from 'node:path';
import { DATA_DIR } from './lib/paths.mjs';
import { readJSON, writeJSON } from './lib/json-store.mjs';

const CACHE_PATH = path.join(DATA_DIR, 'verses-cache.json');
const API_BASE = 'https://api.alquran.cloud/v1/ayah';

function isValidRef(ref) {
  return /^\d{1,3}:\d{1,3}$/.test(ref);
}

export async function fetchVerse(ref, { force = false } = {}) {
  if (!isValidRef(ref)) {
    throw new Error(`Invalid verse reference "${ref}" — expected "sure:ayet", e.g. "2:153"`);
  }

  const cache = readJSON(CACHE_PATH);

  if (!force && cache.verses[ref]) {
    return cache.verses[ref];
  }

  const url = `${API_BASE}/${ref}/editions/quran-uthmani,tr.diyanet`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`Quran API request failed for ${ref}: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data) || json.data.length !== 2) {
    throw new Error(`Quran API returned an unexpected shape for ${ref}: ${JSON.stringify(json).slice(0, 300)}`);
  }

  const arabicEntry = json.data.find((d) => d.edition?.identifier === 'quran-uthmani');
  const turkishEntry = json.data.find((d) => d.edition?.identifier === 'tr.diyanet');
  if (!arabicEntry || !turkishEntry) {
    throw new Error(`Quran API response for ${ref} is missing an expected edition`);
  }

  const entry = {
    ref,
    surah_number: arabicEntry.surah.number,
    surah_name_arabic: arabicEntry.surah.name,
    surah_name_english: arabicEntry.surah.englishName,
    ayah_number: arabicEntry.numberInSurah,
    arabic: arabicEntry.text,
    tr_diyanet: turkishEntry.text,
    source: 'api.alquran.cloud (quran-uthmani + tr.diyanet)',
    fetched_at: new Date().toISOString()
  };

  cache.verses[ref] = entry;
  writeJSON(CACHE_PATH, cache);
  return entry;
}

export async function fetchVerses(refs, opts) {
  const out = {};
  for (const ref of refs) {
    out[ref] = await fetchVerse(ref, opts);
  }
  return out;
}

// CLI entrypoint
if (isMain(import.meta.url)) {
  const refs = process.argv.slice(2);
  if (refs.length === 0) {
    console.error('Usage: node scripts/fetch-verse.mjs <sure:ayet> [more refs...]');
    process.exit(1);
  }
  try {
    for (const ref of refs) {
      const verse = await fetchVerse(ref);
      console.log(`✓ ${ref} — ${verse.surah_name_english} ${verse.ayah_number}: "${verse.tr_diyanet.slice(0, 60)}${verse.tr_diyanet.length > 60 ? '…' : ''}"`);
    }
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
