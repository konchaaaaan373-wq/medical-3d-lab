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
 *   --layer <0..1>   set the anatomical-layer slider before rendering
 *   --no-labels      turn the structure labels off before rendering
 *   --preview        unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --headed         show the browser
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { chromiumExecutable } from './lib/browser.mjs';
import { differingPixels, settledPixels } from './lib/frames.mjs';
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
const layer = value('--layer') === null ? null : Number(value('--layer'));
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

  /**
   * Put the anatomical-layer slider where the caller asked before shooting.
   *
   * Without this every set is the state the scene opens in, which for a scene
   * whose structures arrive with depth is a picture of the outside of it. The
   * oesophagus was the case that made it obvious: its "where the arch and
   * bronchus cross" viewpoint is named after two structures that appear at a
   * quarter of the way along the slider, so a set shot at rest showed a
   * viewpoint with its subject missing — and nothing in the picture said why.
   */
  if (layer !== null) {
    if (!(layer >= 0 && layer <= 1)) die('--layer takes a number between 0 and 1');
    const slider = page.locator('.console .slider, .slider').first();
    if (!(await slider.count())) die('the scene offers no anatomical-layer slider to set');
    await slider.evaluate((element, value) => {
      const max = Number(element.max || 1);
      element.value = String(Math.round(value * max));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, layer);
    // The layer eases like everything else; the settle below still decides.
    await page.waitForTimeout(600);
  }

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
   * are identical and worthless.
   *
   * "Painted" used to mean "the PNG is over 40 kB", on the reasoning that a
   * frame of a model compresses to hundreds of kilobytes and an empty one to
   * under twenty. That is a proxy for the thing, and it threw away real
   * pictures: a cut liver is mostly large flat fields of one colour, which is
   * exactly what PNG compresses best, and its two section frames came in at
   * 29 kB and were dropped as empty every single run. The frame is decoded and
   * measured now — what fraction of it is not the background colour — which is
   * the question the floor was standing in for.
   *
   * Both limits are hard: at most `ATTEMPTS` shots and at most `PATIENCE`
   * milliseconds. Whatever has not settled by then is reported as not settled
   * and the run fails. It never keeps shooting until something looks right, and
   * it never picks the frame it likes out of the ones it took: the frame it
   * writes is the one that repeated.
   */
  const ATTEMPTS = 20;
  const PATIENCE = 60000;
  /** Share of the frame that has to be something other than the background. */
  const PAINTED_FRACTION = 0.01;

  /**
   * How much of this frame is not the background, measured by decoding it.
   *
   * The background is read from a corner rather than assumed: the scene offers
   * three of them (black, light grey, white) and a test that knew only one
   * would call the other two empty.
   */
  const paintedFraction = (bytes) =>
    page.evaluate(async (dataUrl) => {
      const image = await new Promise((done, fail) => {
        const element = new Image();
        element.onload = () => done(element);
        element.onerror = fail;
        element.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const at = (x, y) => (y * canvas.width + x) * 4;
      const background = at(2, 2);
      let painted = 0;
      let counted = 0;
      // Every fourth pixel each way: sixteen times faster, and the answer is a
      // fraction rather than a count.
      for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) {
          const i = at(x, y);
          counted += 1;
          const delta = Math.max(
            Math.abs(data[i] - data[background]),
            Math.abs(data[i + 1] - data[background + 1]),
            Math.abs(data[i + 2] - data[background + 2])
          );
          if (delta > 6) painted += 1;
        }
      }
      return counted ? painted / counted : 0;
    }, `data:image/png;base64,${bytes.toString('base64')}`);

  const captureSettled = async (path) => {
    const deadline = Date.now() + PATIENCE;
    let previous = null;
    let closest = null;
    for (let attempt = 0; attempt < ATTEMPTS && Date.now() < deadline; attempt += 1) {
      const bytes = await page.screenshot({ clip: box });
      if (previous) {
        const differing = await differingPixels(page, previous, bytes);
        closest = closest === null ? differing : Math.min(closest, differing);
        if (differing <= settledPixels(box) && (await paintedFraction(bytes)) > PAINTED_FRACTION) {
          writeFileSync(path, bytes);
          return attempt;
        }
      }
      previous = bytes;
      await page.waitForTimeout(400);
    }
    if (closest !== null) console.error(`    closest two frames still differed by ${closest} pixel(s)`);
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
  const at = layer === null ? 'the layer the scene opens at' : `layer ${layer}`;
  console.log(
    `\n${sceneSlug} at ${width}x${height}, ${at}: ${views.length} viewpoint(s) x ${modes.length} colour mode(s) -> ${outDir}`
  );
  if (unsettled) die(`${unsettled} frame(s) never settled; the set is not comparable.`);
} finally {
  await browser.close();
  server.close();
}
