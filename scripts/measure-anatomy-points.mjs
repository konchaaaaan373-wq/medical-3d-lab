#!/usr/bin/env node
/**
 * Measures the click points `check-anatomy-interaction.mjs` drives each scene
 * with, and prints them as the table to paste into it.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run points:anatomy -- --preview                # every scene it knows
 *   npm run points:anatomy -- --preview --scene hip-anatomy
 *
 * ## Why this is a script and not a person with a screenshot
 *
 * `SCENE_POINTS` is four fractions of the canvas per scene, each one on a
 * different structure, and the check uses them to ask the one question a unit
 * test cannot: does a click land on the thing the reader aimed at. They are
 * therefore **measurements of a particular render** — when the opening pose,
 * the geometry or the framing moves, every one of them is stale, and a stale
 * point produces a failure that reads like a selection bug.
 *
 * That happened: the day the organ scenes started being fitted to the visible
 * band, all thirty-seven scenes moved and the table had to be remeasured. By
 * hand that is thirty-seven screenshots and a hundred and fifty guesses; here
 * it is a grid of hovers, read back through the product's own panel.
 *
 * ## What makes a point worth keeping
 *
 * Four things, in order:
 *
 *  1. it resolves to a structure at all;
 *  2. it is **inside** that structure, not on its edge — checked by sampling
 *     four points around it and requiring the same answer. The first version
 *     skipped this and put two of the elbow's points on nerves a few pixels
 *     wide: they resolved while measuring and missed when the camera ease
 *     settled a frame differently, and the check then reported four failures
 *     about selection that were really one about aim;
 *  3. it is far enough from the points already chosen to be a second test
 *     rather than the same one twice;
 *  4. it is on a structure none of the others hit, where the scene offers one.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --scene <slug>  measure one scene (repeatable; default: all of them)
 *   --preview       unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --dense         four times as many samples, for scenes made of thin parts
 *   --json <file>   also write the raw measurement, hits included
 */
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const values = (name) =>
  argv.reduce((all, item, at) => (item === name && argv[at + 1] ? [...all, argv[at + 1]] : all), []);

const distDir = value('--dist', 'dist');
const jsonOut = value('--json');

const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (!existsSync(join(distDir, 'index.html'))) die(`No build at "${distDir}" — run \`npm run build\` first.`);

/** The scenes the check knows about, read from the check rather than repeated. */
function knownScenes() {
  const source = readFileSync(new URL('./check-anatomy-interaction.mjs', import.meta.url), 'utf8');
  const table = source.slice(source.indexOf('const SCENE_POINTS = {'), source.indexOf('const clickPoints'));
  return [...table.matchAll(/'([a-z-]+)':/g)].map((match) => match[1]);
}

const scenes = values('--scene').length ? values('--scene') : knownScenes();

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
    'Playwright is not installed, so nothing was measured.\n\n' +
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
const server = createServer((request, response) => {
  const decoded = decodeURIComponent((request.url ?? '/').split('?')[0]);
  let file = resolve(root, `.${normalize(decoded)}`);
  const inside = file === root || file.startsWith(root + sep);
  if (!inside || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;

// --- the measurement -------------------------------------------------------

/**
 * The grid, in fractions of the canvas. Coarse enough to be quick, fine enough
 * to find a stomach — and `--dense` for the scenes it is not fine enough for.
 *
 * A hand is tendons and phalanges, a foot is ligaments between small bones, a
 * lymphatic network is ducts: on the coarse grid those scenes offer nine or
 * ten hits, most of them a few pixels from a neighbour, and almost nothing
 * survives the margin. Sampling four times as many points finds the middles.
 */
const DENSE = flag('--dense');
const COLUMNS = DENSE ? 17 : 9;
const ROWS = DENSE ? 13 : 7;
const FIRST = { x: 0.14, y: 0.18 };
const STEP = DENSE ? { x: 0.0375, y: 0.0475 } : { x: 0.075, y: 0.095 };
/**
 * How far off a kept point is re-clicked to prove it is not on an edge.
 *
 * Seven pixels at this viewport. Wider was tried and is wrong for what these
 * scenes are made of — a hand is tendons and small bones, and asking every
 * point to be 15 px clear of its neighbour left the hand with one usable
 * point out of sixteen hits. It has to be bigger than the couple of pixels a
 * camera ease moves and smaller than the structures being named.
 */
const MARGIN = 0.006;
/** How far apart two kept points have to be to be two tests. */
const APART = 0.1;
const EMPTY = 'Select a structure on the model or in the list.';

const browser = await chromium.launch({ executablePath: chromiumExecutable(chromium), headless: !flag('--headed') });
const measured = {};

for (const slug of scenes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', () => {});
  try {
    const url = flag('--preview') ? `${base}?preview=1#/${slug}` : `${base}#/${slug}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    if (await page.locator('.locked-copy').count()) {
      die(`The build does not open ${slug}: build with VITE_ALLOW_PREVIEW=1 and pass --preview.`);
    }
    await page.waitForFunction(() => document.querySelectorAll('.anatomy-tree-leaf').length > 0, { timeout: 120000 });
    // **After** the scene is ready, which is where the check dismisses it too.
    // That is not a detail: the banner is an element, the framing is fitted to
    // the band the elements leave, and dismissing it before the fit rather
    // than after moves the model. Measured one way and clicked the other, the
    // hand and the foot resolved one point in four — the same model, framed
    // twice.
    const consent = page.locator('.consent-banner button').last();
    if (await consent.count()) {
      await consent.click({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    const box = await page.locator('canvas').first().boundingBox();
    if (!box) die(`${slug}: rendered no canvas`);

    // The camera eases into the viewpoint after the tree exists. Measuring
    // through that ease is how a point ends up a few pixels off the structure
    // it was measured on, so this waits for two identical frames — the same
    // definition of settled the check clicks against.
    let previous = null;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const frame = await page.screenshot({ clip: box });
      if (previous?.equals(frame)) break;
      previous = frame;
      await page.waitForTimeout(250);
    }

    /**
     * What is under a point, asked by **hovering** rather than by clicking.
     *
     * This clicked, and a click selects. Selecting a structure that names a
     * `preferredView` takes the scene to that viewpoint — which may hide whole
     * tags — so the sweep was moving the model it was measuring, from its own
     * first hit onwards. Every sample after that was taken of a different
     * picture, and `inside()` re-sampled under a third one: twenty of the
     * thirty-seven scenes came back with fewer than four points, nineteen of
     * them scenes that declare a preferred view. "Many hits, none of them
     * inside anything" is what that looks like from here.
     *
     * The card reads `selected ?? hovered`, and nothing is ever selected here,
     * so hovering answers the same question and moves nothing. It is also what
     * `check-anatomy-interaction.mjs` does when it looks for the model.
     */
    const nameAt = async (fx, fy) => {
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(110);
      const name = (await page.locator('.anatomy-panel-name.lang-en').textContent()).trim();
      return name && name !== EMPTY ? name : null;
    };

    const hits = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const fx = Number((FIRST.x + column * STEP.x).toFixed(3));
        const fy = Number((FIRST.y + row * STEP.y).toFixed(3));
        const name = await nameAt(fx, fy);
        if (name) hits.push({ fx, fy, name });
      }
    }

    const inside = async (candidate) => {
      for (const [dx, dy] of [[MARGIN, 0], [-MARGIN, 0], [0, MARGIN], [0, -MARGIN]]) {
        if ((await nameAt(candidate.fx + dx, candidate.fy + dy)) !== candidate.name) return false;
      }
      return true;
    };

    const chosen = [];
    const seen = new Set();
    for (const distinct of [true, false]) {
      for (const candidate of hits) {
        if (chosen.length >= 4) break;
        if (chosen.includes(candidate)) continue;
        if (distinct && seen.has(candidate.name)) continue;
        if (!chosen.every((kept) => Math.hypot(kept.fx - candidate.fx, kept.fy - candidate.fy) > APART)) continue;
        if (!(await inside(candidate))) continue;
        chosen.push(candidate);
        seen.add(candidate.name);
      }
    }

    measured[slug] = { hits, chosen };
    const short = chosen.length === 4 ? '' : `  ← only ${chosen.length} of 4`;
    console.error(`${slug}: ${hits.length}/${COLUMNS * ROWS} hit, ${chosen.length} kept${short}`);
  } catch (error) {
    measured[slug] = { error: String(error).split('\n')[0] };
    console.error(`${slug}: FAILED ${measured[slug].error}`);
  }
  await page.close();
}

await browser.close();
server.close();

// The table, on stdout, so it can be read or redirected.
//
// **Each point carries the name the click resolved to**, because that is the
// only part of a measurement that stays checkable. `check-anatomy-interaction`
// holds a point to a third element and asks nothing of a bare pair, so a table
// emitted as coordinates alone is one a later layout or framing change can
// slide onto other structures with the run still green — which is F-123, and
// the 35 coordinate-only rows in `SCENE_POINTS` came out of this loop.
// Printing the name in a comment beside the row is not the same thing: a
// comment is not read by anything, and the brain's drifted for a week.
const quoted = (name) => `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
for (const slug of scenes) {
  const entry = measured[slug];
  if (!entry?.chosen?.length) continue;
  const points = entry.chosen.map((point) => `[${point.fx}, ${point.fy}, ${quoted(point.name)}]`);
  console.log(`  '${slug}': [\n    ${points.join(',\n    ')},\n  ],`);
}

if (jsonOut) writeFileSync(jsonOut, `${JSON.stringify(measured, null, 1)}\n`);

const short = scenes.filter((slug) => (measured[slug]?.chosen?.length ?? 0) < 4);
if (short.length) {
  console.error(
    `\n${short.length} scene(s) gave fewer than four points: ${short.join(', ')}.\n` +
      'A scene drawn as a thin network can be genuinely hard to hit — read the hits in --json and ' +
      'place the rest by hand rather than loosening what counts as inside.'
  );
}
