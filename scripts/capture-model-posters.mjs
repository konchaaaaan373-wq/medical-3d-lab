#!/usr/bin/env node
/**
 * The picture on a model's card, photographed from the model itself.
 *
 *   npm run build
 *   npm run posters            # every poster `src/data/modelShowcase.js` names
 *   npm run posters -- --check # fail if one is missing
 *
 * ## Why a photograph and not an illustration
 *
 * A model card's picture is read as "this is what you will be moving". An
 * illustration drawn for the card would be a second, unreviewed picture of the
 * model; the link-preview card (`public/social/`) is a caption, not a picture
 * (`publicManifest.js`). So the poster is the real render: the built site,
 * the model's own opening state, the interface hidden, the camera allowed to
 * finish its framing tween before the shutter (`scripts/lib/camera.mjs` — a
 * fixed wait photographs the tween, `CLAUDE.md`).
 *
 * Re-run it when a model's opening look changes. The output is a JPEG at the
 * card's 16:10, small enough that a list of them is not the page's weight.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --only <slug>   one model (repeatable)
 *   --preview       unlock unpublished scenes (build with VITE_ALLOW_PREVIEW=1)
 *   --check         write nothing; exit 1 if a named poster file is missing
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { MODEL_SHOWCASE } from '../src/data/modelShowcase.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const values = (name) => argv.flatMap((item, i) => (item === name && argv[i + 1] ? [argv[i + 1]] : []));

const only = values('--only');
const wanted = Object.entries(MODEL_SHOWCASE)
  .filter(([slug, entry]) => entry.poster && (!only.length || only.includes(slug)))
  .map(([slug, entry]) => ({ slug, file: resolve('public', entry.poster) }));

if (flag('--check')) {
  const missing = wanted.filter((item) => !existsSync(item.file));
  for (const item of missing) console.error(`missing poster: ${item.slug} → ${item.file}`);
  console.log(`${wanted.length - missing.length}/${wanted.length} posters present`);
  process.exit(missing.length ? 1 : 0);
}

const { chromium } = await import('playwright');
const { serveDist } = await import('./lib/serve-dist.mjs');
const { chromiumExecutable } = await import('./lib/browser.mjs');
const { waitForFramingToSettle } = await import('./lib/camera.mjs');

const BROWSER_ARGS = [
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  '--no-proxy-server',
  '--no-first-run',
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
];

const server = await serveDist(value('--dist', 'dist'));
const browser = await chromium.launch({ executablePath: chromiumExecutable(chromium), args: BROWSER_ARGS });
try {
  for (const { slug, file } of wanted) {
    // The card's own proportion, at twice its largest displayed width.
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 });
    await page.goto(`${server.base}${flag('--preview') ? '?preview=1' : ''}#/${slug}`, { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 60000 });
    // Hide the interface first: the framing fits the model into the room the
    // panels leave, and with them gone it fits the whole frame.
    await page.addStyleTag({ content: '#ui, .build-marker, #boot-veil { display: none !important; }' });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await waitForFramingToSettle(page).catch(() => console.warn(`  ${slug}: framing did not report settling`));
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    mkdirSync(dirname(file), { recursive: true });
    await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    console.log(`  ${slug} → ${file}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
