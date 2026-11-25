#!/usr/bin/env node
/**
 * Every raster of the product mark, rendered from the one drawing.
 *
 *   npm run icons            # write public/favicon.svg, the PNGs, favicon.ico, the manifest
 *   npm run icons -- --check # fail if public/favicon.svg or the manifest drifted (no browser)
 *
 * The drawing lives in `src/components/brandIcon.js`. A PNG that was exported
 * by hand from some other file is how a tab ends up wearing last year's logo,
 * so nothing here is drawn twice: the SVG tab icon is written from the string
 * the header inlines, and the rasters are screenshots of those same strings.
 *
 * `favicon.ico` is a PNG-in-ICO container holding the 32 px render — every
 * browser that still asks for `/favicon.ico` reads that form, and Safari, which
 * ignores SVG tab icons, falls back to it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BRAND_FAVICON_SVG, BRAND_PINK_PALE, brandTileSvg } from '../src/components/brandIcon.js';
import { BRAND } from '../src/data/brand.js';

const PUBLIC = resolve(new URL('../public', import.meta.url).pathname);
const check = process.argv.includes('--check');

export const WEB_MANIFEST = {
  name: BRAND.name,
  short_name: BRAND.name,
  description: BRAND.descriptionJa,
  lang: 'ja',
  start_url: './',
  display: 'browser',
  background_color: '#FAF9FC',
  theme_color: '#FAF9FC',
  icons: [
    { src: './icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: './icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
const manifestText = `${JSON.stringify(WEB_MANIFEST, null, 2)}\n`;

if (check) {
  const problems = [];
  if (readFileSync(resolve(PUBLIC, 'favicon.svg'), 'utf8').trim() !== BRAND_FAVICON_SVG) problems.push('public/favicon.svg is not BRAND_FAVICON_SVG');
  if (readFileSync(resolve(PUBLIC, 'site.webmanifest'), 'utf8') !== manifestText) problems.push('public/site.webmanifest drifted');
  if (problems.length) {
    console.error(problems.map((line) => `  ✗ ${line}`).join('\n'));
    console.error('run `npm run icons`');
    process.exit(1);
  }
  console.log('brand icons: the tab icon and the manifest match the drawing');
  process.exit(0);
}

const { chromium } = await import('playwright');
const { chromiumExecutable } = await import('./lib/browser.mjs');
const browser = await chromium.launch({ executablePath: chromiumExecutable() });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(svg, size, { background = 'transparent' } = {}) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:${background}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  return page.screenshot({ omitBackground: background === 'transparent', clip: { x: 0, y: 0, width: size, height: size } });
}

/** A one-image ICO whose payload is the PNG itself (Vista and later, every current browser). */
function ico(pngBytes, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header.writeUInt8(size, 6); header.writeUInt8(size, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBytes.length, 14); header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBytes]);
}

// The tab icon on a light tab: emulate the scheme so the media query resolves.
await page.emulateMedia({ colorScheme: 'light' });
writeFileSync(resolve(PUBLIC, 'favicon.svg'), `${BRAND_FAVICON_SVG}\n`);
writeFileSync(resolve(PUBLIC, 'favicon.ico'), ico(await png(BRAND_FAVICON_SVG, 32), 32));
writeFileSync(resolve(PUBLIC, 'apple-touch-icon.png'), await png(brandTileSvg({ size: 180 }), 180, { background: BRAND_PINK_PALE }));
writeFileSync(resolve(PUBLIC, 'icon-192.png'), await png(brandTileSvg({ size: 192 }), 192, { background: BRAND_PINK_PALE }));
writeFileSync(resolve(PUBLIC, 'icon-512.png'), await png(brandTileSvg({ size: 512 }), 512, { background: BRAND_PINK_PALE }));
// Maskable: the same tile; `brandTileSvg` already keeps the mark inside the safe zone.
writeFileSync(resolve(PUBLIC, 'icon-maskable-512.png'), await png(brandTileSvg({ size: 512 }), 512, { background: BRAND_PINK_PALE }));
writeFileSync(resolve(PUBLIC, 'site.webmanifest'), manifestText);
await browser.close();
console.log('brand icons: wrote favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512, icon-maskable-512, site.webmanifest');
