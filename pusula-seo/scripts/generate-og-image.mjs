#!/usr/bin/env node
/**
 * Generates a simple, templated 1200x630 OpenGraph image for an article:
 * Pusula teal/gold branding + the article title, word-wrapped. No AI image
 * generation — a plain SVG rasterized with sharp, deterministic and free.
 *
 * Usage: node scripts/generate-og-image.mjs content/dua/sabir-duasi.json
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { isMain } from './lib/cli.mjs';
import { outputDirFor } from './lib/paths.mjs';
import { readJSON } from './lib/json-store.mjs';

const WIDTH = 1200;
const HEIGHT = 630;

const CONTENT_TYPE_LABELS = {
  dua: 'DUA', ayet: 'AYET', sure: 'SURE', 'esmaul-husna': 'ESMAÜL HÜSNA', kissa: 'KISSA', blog: 'REHBER'
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy word-wrap by approximate character width — good enough for a title-only OG card. */
function wrapText(text, maxCharsPerLine, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines - 1) break;
  }
  if (current) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/.{0,3}$/, '…');
  }
  return lines.slice(0, maxLines);
}

export function buildOgSvg({ title, badge }) {
  const lines = wrapText(title, 26, 4);
  const lineHeight = 76;
  const startY = HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2 + 10;

  const titleTspans = lines.map((line, i) =>
    `<tspan x="90" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1e1b"/>
      <stop offset="100%" stop-color="#112a26"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d4af8a"/>
      <stop offset="100%" stop-color="#f3e3c4"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="260" fill="#5fb8a6" opacity="0.08"/>
  <circle cx="60" cy="600" r="220" fill="#d4af8a" opacity="0.07"/>
  <rect x="90" y="70" width="230" height="52" rx="26" fill="rgba(212,175,138,0.12)" stroke="rgba(212,175,138,0.35)"/>
  <text x="205" y="104" font-family="Outfit, Arial, sans-serif" font-size="22" font-weight="600" fill="#e8caa0" text-anchor="middle" letter-spacing="1">${escapeXml(badge)}</text>
  <text font-family="'Instrument Serif', Georgia, serif" font-size="58" font-weight="400" fill="#f3ede2">${titleTspans}</text>
  <text x="90" y="${HEIGHT - 56}" font-family="Outfit, Arial, sans-serif" font-size="30" font-weight="700" fill="url(#gold)">🧭 Pusula</text>
  <text x="90" y="${HEIGHT - 26}" font-family="Outfit, Arial, sans-serif" font-size="17" fill="#aec2bc">Kur'an, Ayet ve Dua — centaurstudios.online/pusula</text>
</svg>`;
}

export async function generateOgImage(contentPath) {
  const content = readJSON(contentPath);
  const svg = buildOgSvg({
    title: content.title,
    badge: CONTENT_TYPE_LABELS[content.content_type] || 'PUSULA'
  });

  const outDir = outputDirFor(content.content_type, content.slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'og-image.png');

  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return outPath;
}

if (isMain(import.meta.url)) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/generate-og-image.mjs <content.json path>');
    process.exit(1);
  }
  const outPath = await generateOgImage(path.resolve(filePath));
  console.log(`✓ OG image written to ${outPath}`);
}
