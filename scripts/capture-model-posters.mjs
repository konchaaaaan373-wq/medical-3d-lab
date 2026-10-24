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
 * fixed wait photographs the tween, `CLAUDE.md`). A route that opens a lesson
 * (`#/cardiac-output`) is photographed as the lesson's own figure, because that
 * is what its card opens: the shell makes no viewer for it, and the figure
 * draws itself (in 3D, or flat where WebGL is refused).
 *
 * Re-run it when a model's opening look changes. The output is a JPEG at the
 * card's 16:10, small enough that a list of them is not the page's weight.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --only <id>     one model, by scene id or slug (repeatable)
 *   --preview       unlock unpublished scenes (build with VITE_ALLOW_PREVIEW=1)
 *   --check         write nothing; exit 1 if a named poster file is missing
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { posterTargets } from './lib/posters.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const values = (name) => argv.flatMap((item, i) => (item === name && argv[i + 1] ? [argv[i + 1]] : []));

// By scene id, opened at the scene's own route — the two are not always the
// same word (`scripts/lib/posters.mjs`).
const wanted = posterTargets({ only: values('--only') }).map(({ id, route, poster }) => ({
  slug: id,
  route,
  file: resolve('public', poster),
}));

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
  for (const { slug, route, file } of wanted) {
    // The card's own proportion, at twice its largest displayed width.
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 });
    await page.goto(`${server.base}${flag('--preview') ? '?preview=1' : ''}${route}`, { waitUntil: 'load' });
    // A model's viewer — or a lesson (`layout: 'lesson'`), for which the shell
    // makes no viewer: what the card opens is its figure, which draws itself. The
    // viewer exists before the scene and its asset are, and
    // `waitForFramingToSettle` reads a missing app as "nothing to wait for",
    // so the app itself is waited for, not a canvas.
    await page.waitForFunction(() => Boolean(window.__app?.viewer || window.__app?.lesson), null, { timeout: 60000 });
    const lesson = await page.evaluate(() => Boolean(window.__app?.lesson));
    if (lesson) {
      // The lesson's figure, alone and centred in the card's frame: the
      // question, the buttons and the header are the page's, not the picture.
      await page.addStyleTag({
        content: `#ui > :not(.lesson-figure), .build-marker, #boot-veil { display: none !important; }
                  #ui[data-layout='lesson'] .lesson-figure { position: fixed !important; inset: 6% 8% !important; }`,
      });
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      // Refitted to the frame and at rest: the vessels, the needle and the level arrived.
      await page.waitForFunction(() => document.querySelector('[data-lesson-figure]')?.dataset.calm === 'true', null, { timeout: 20000 });
    } else {
      // Hide the interface first: the framing fits the model into the room the
      // panels leave, and with them gone it fits the whole frame.
      await page.addStyleTag({ content: '#ui, .build-marker, #boot-veil { display: none !important; }' });
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await waitForFramingToSettle(page).catch(() => console.warn(`  ${slug}: framing did not report settling`));
    }
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
