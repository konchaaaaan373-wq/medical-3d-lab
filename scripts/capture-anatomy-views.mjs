#!/usr/bin/env node
/**
 * Renders an anatomy scene at each of its own fixed viewpoints, in each of its
 * own colour modes, and writes one image per combination.
 *
 *   npm run build
 *   npm run shots:anatomy -- --out docs/screenshots/b3-1/after
 *
 * ## Why this exists
 *
 * A shape problem is not a behaviour problem, and `verify:anatomy` cannot see
 * one: it checks that a click resolves to the structure the panel then names,
 * which stays true whether the model reads as a brain or as a hollow shell.
 * Judging the shape needs pictures, and pictures are only evidence if the two
 * being compared differ in one thing. That is what this does: the same
 * viewpoints, the same colour modes, the same viewport, the same browser, the
 * interface hidden so nothing but the model is in the frame — so a before and
 * an after taken with it differ by the change and by nothing else.
 *
 * The viewpoints and colour modes are read from the scene's own controls rather
 * than listed here, so a scene that gains a view gains a picture.
 *
 * ## What it is not
 *
 * It is not a pass/fail check and prints no verdict. It renders one engine
 * headless on a desktop machine; what the images then show is a judgement, and
 * for anatomy it is an anatomist's judgement, recorded elsewhere.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --scene <slug>   scene route to drive (default: brain-anatomy)
 *   --out <dir>      where to write the images (default: shots)
 *   --view <id>      only this viewpoint (repeatable)
 *   --mode <id>      only this colour mode (repeatable)
 *   --width <px>     viewport width (default: 1280)
 *   --height <px>    viewport height (default: 720)
 *   --no-labels      turn the structure labels off before rendering
 *   --preview        unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --headed         show the browser
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { chromiumExecutable } from './lib/browser.mjs';
import { DEV_ASSET_ROOT } from '../src/catalog/devAssets.js';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const values = (name) =>
  argv.reduce((all, item, at) => (item === name && argv[at + 1] ? [...all, argv[at + 1]] : all), []);

const distDir = value('--dist', 'dist');
const sceneSlug = value('--scene', 'brain-anatomy');
const outDir = value('--out', 'shots');
const onlyViews = values('--view');
const onlyModes = values('--mode');
const width = Number(value('--width', '1280'));
const height = Number(value('--height', '720'));

const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (!existsSync(join(distDir, 'index.html'))) die(`No build at "${distDir}" — run \`npm run build\` first.`);
mkdirSync(outDir, { recursive: true });

let chromium = null;
for (const pkg of ['playwright', 'playwright-core']) {
  try {
    ({ chromium } = await import(pkg));
    break;
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
}
if (!chromium) {
  die(
    'Playwright is not installed, so nothing was rendered.\n\n' +
      '  npm i --no-save playwright\n  npx playwright install --with-deps chromium\n\n' +
      'It is deliberately not a dependency: `npm test` must stay a plain `node --test` run.'
  );
}

// --- serving the build (same shape as check-anatomy-interaction.mjs) -------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};
const root = resolve(distDir);
const repoRoot = resolve('.');
/**
 * The candidate GLBs are not copied into a build and must never be, so the
 * scene asks for them at `/dev-assets/` and the dev server answers from the
 * repository root. Without the same rule here this could not shoot the heart at
 * all: every frame came back as "Atlas could not be loaded", which is a picture
 * of a 404 rather than of the model. Same addition, same reason, as
 * `check-heart-recipe-report.mjs`.
 */
function fileFor(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const base = decoded.startsWith(`/${DEV_ASSET_ROOT}/`) ? repoRoot : root;
  const candidate = resolve(base, `.${normalize(decoded)}`);
  if (candidate !== base && !candidate.startsWith(base + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return existsSync(candidate) ? candidate : null;
}
const server = createServer((request, response) => {
  const file = fileFor(request.url ?? '/') ?? join(root, 'index.html');
  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;

// --- the render ------------------------------------------------------------

const browser = await chromium.launch({
  executablePath: chromiumExecutable(chromium),
  headless: !flag('--headed'),
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (error) => console.error(`uncaught error: ${error}`));

const slug = (text) => text.trim().split('\n')[0].toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

try {
  const url = flag('--preview') ? `${base}?preview=1#/${sceneSlug}` : `${base}#/${sceneSlug}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.consent-banner button').last().waitFor({ timeout: 20000 }).catch(() => {});
  await page
    .locator('.consent-banner button')
    .last()
    .click({ timeout: 10000, noWaitAfter: true })
    .catch(() => {});

  if (await page.locator('.locked-copy').count()) {
    die(
      `The build does not open ${sceneSlug}: it answered with the "to be updated" page.\n\n` +
        '  VITE_ALLOW_PREVIEW=1 npm run build\n  npm run shots:anatomy -- --preview'
    );
  }
  await page.waitForFunction(() => document.querySelectorAll('.anatomy-tree-leaf').length > 0, {
    timeout: 90000,
  });
  // The viewpoint and colour controls live in the panel's Display tab.
  await page.locator('#anatomy-tab-display').click({ noWaitAfter: true });
  await page.waitForTimeout(400);
  // The labels are a DOM overlay, not part of the model. Turning them off is
  // how a pair of frames can be compared on the geometry alone.
  if (flag('--no-labels')) {
    await page.locator('.inspection-label-toggle').click({ noWaitAfter: true });
    await page.waitForTimeout(300);
  }

  const views = (await page.locator('.inspection-choice.inspection-view').allTextContents()).map(slug);
  const modes = (await page.locator('.inspection-choice.inspection-mode').allTextContents()).map(slug);
  if (!views.length || !modes.length) die('the scene offered no viewpoints or no colour modes');

  const box = await page.locator('canvas').first().boundingBox();
  if (!box) die('the scene rendered no canvas');
  const hideUi = () => page.locator('.ui-toggle[title^="Hide interface"]').click({ noWaitAfter: true });

  /**
   * Shoot until the frame stops changing, and stop either way.
   *
   * A fixed wait is not good enough for a comparison. The camera eases towards
   * a viewpoint and the layer opacities ease with it, and headless frames are
   * scheduled irregularly, so two runs of the *same* build sampled at a fixed
   * delay catch the ease at slightly different points — enough, measured here,
   * to move a fifth of the pixels of a medial view. A before and an after taken
   * that way differ by the change *and* by where the ease happened to be, which
   * is exactly what the pair is supposed to rule out.
   *
   * Two frames are kept only when they are identical **and** painted. Headless
   * WebGL sometimes hands back a frame with nothing drawn — the model gone and
   * only the DOM annotations over the background — and two of those in a row
   * are identical and worthless. A frame of this model compresses to hundreds
   * of kilobytes and an empty one to under twenty, so the floor separates them;
   * it is a coarse test and it is the only one available from outside the
   * canvas, so it is a floor rather than a judgement of the picture.
   *
   * Both limits are hard: at most `ATTEMPTS` shots and at most `PATIENCE`
   * milliseconds. Whatever has not settled by then is reported as not settled
   * and the run fails. It never keeps shooting until something looks right, and
   * it never picks the frame it likes out of the ones it took: the frame it
   * writes is the one that repeated.
   */
  const ATTEMPTS = 20;
  const PATIENCE = 60000;
  const PAINTED_BYTES = 40000;
  const captureSettled = async (path) => {
    const deadline = Date.now() + PATIENCE;
    let previous = null;
    for (let attempt = 0; attempt < ATTEMPTS && Date.now() < deadline; attempt += 1) {
      const bytes = await page.screenshot({ clip: box });
      if (bytes.length > PAINTED_BYTES && previous?.equals(bytes)) {
        writeFileSync(path, bytes);
        return attempt;
      }
      previous = bytes;
      await page.waitForTimeout(400);
    }
    return null;
  };

  let unsettled = 0;
  for (const mode of modes) {
    if (onlyModes.length && !onlyModes.includes(mode)) continue;
    await page.locator('.inspection-choice.inspection-mode').nth(modes.indexOf(mode)).click({ noWaitAfter: true });
    await page.waitForTimeout(400);
    for (const view of views) {
      if (onlyViews.length && !onlyViews.includes(view)) continue;
      await page.locator('.inspection-choice.inspection-view').nth(views.indexOf(view)).click({ noWaitAfter: true });
      await page.mouse.move(4, 4);
      await hideUi();
      const name = `${view}--${mode}`;
      const frames = await captureSettled(join(outDir, `${name}.png`));
      if (frames == null) {
        console.error(`  ${name}: no painted frame repeated within ${ATTEMPTS} shots / ${PATIENCE} ms`);
        unsettled += 1;
      } else {
        console.log(`  ${name}.png (settled after ${frames} frame(s))`);
      }
      await hideUi();
      await page.waitForTimeout(300);
    }
  }
  console.log(`\n${sceneSlug} at ${width}x${height}: ${views.length} viewpoint(s) x ${modes.length} colour mode(s) -> ${outDir}`);
  if (unsettled) die(`${unsettled} frame(s) never settled; the set is not comparable.`);
} finally {
  await browser.close();
  server.close();
}
