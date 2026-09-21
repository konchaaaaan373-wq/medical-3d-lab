#!/usr/bin/env node
/**
 * Renders a scene's fifteen-second sequence as stills, one per moment asked for.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run shots:reel -- --scene higher-brain-function --preview
 *
 * ## Why this exists
 *
 * A sequence's tests measure the *state* at a second: which lesion is set, what
 * the read-out says, where the run stopped. None of that is the thing a viewer
 * gets, which is a picture — and a claim a picture cannot carry is not a claim
 * the video makes ("Accuracy you cannot see is not accuracy"). The reel of the
 * higher-function scene says the aphasias differ by *where the word stopped*;
 * whether two of those stopping places are twenty pixels apart on screen is not
 * something any test here can answer.
 *
 * So: the same frames a recording would show, written out as files, at seconds
 * chosen by the caller or at the middle of each of the sequence's own cues.
 *
 * It is scene-agnostic and names no scene: the moments come from the reel's own
 * cue list, so any scene with a `getReel()` can be shot with it.
 *
 * ## What makes the frames reproducible
 *
 * The sequence is a pure function of elapsed seconds, and the app exposes
 * `reel.seek(t)`, which **stops the clock** before rendering — without that the
 * render loop carries the sequence forward between the seek and the screenshot
 * and the frame written out is not the frame asked for.
 *
 * ## What it is not
 *
 * It is not a pass/fail check and prints no verdict. It renders one engine
 * headless; what the pictures then show is a judgement.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --scene <slug>   scene route to drive (default: higher-brain-function)
 *   --out <dir>      where to write the images (default: shots/reel)
 *   --at <seconds>   a moment to shoot (repeatable; default: each cue's middle)
 *   --format <id>    9:16 `reel`, `portrait`, `square`, `wide` (default: reel)
 *   --width <px>     viewport width (default: 900)
 *   --height <px>    viewport height (default: 1200)
 *   --preview        unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --headed         show the browser
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { differingPixels, settledPixels } from './lib/frames.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { DEV_ASSET_ROOT } from '../src/catalog/devAssets.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const values = (name) =>
  argv.reduce((all, item, at) => (item === name && argv[at + 1] ? [...all, argv[at + 1]] : all), []);

const distDir = value('--dist', 'dist');
const sceneSlug = value('--scene', 'higher-brain-function');
const outDir = value('--out', 'shots/reel');
const formatId = value('--format', 'reel');
const width = Number(value('--width', '900'));
const height = Number(value('--height', '1200'));
const askedAt = values('--at').map(Number);

const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (askedAt.some((t) => !Number.isFinite(t) || t < 0)) die('--at takes a number of seconds');
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

const { base, close: closeServer } = await serveDist(distDir, {
  mounts: { [`/${DEV_ASSET_ROOT}/`]: '.' },
});

const browser = await chromium.launch({
  executablePath: chromiumExecutable(chromium),
  headless: !flag('--headed'),
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (error) => console.error(`uncaught error: ${error}`));

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
        '  VITE_ALLOW_PREVIEW=1 npm run build\n  npm run shots:reel -- --preview'
    );
  }
  await page.waitForFunction(() => Boolean(window.__app?.scene), { timeout: 90000 });

  const cues = await page.evaluate(() => window.__app?.scene?.getReel?.()?.cues ?? null);
  if (!cues) die(`${sceneSlug} has no sequence: its scene does not implement getReel()`);

  // A moment per cue, in the middle of it, unless the caller named their own.
  const moments = askedAt.length
    ? askedAt.map((at, index) => ({ id: `at-${index + 1}`, at }))
    : cues.map((cue) => ({ id: cue.id, at: (cue.at + cue.until) / 2 }));

  await page.evaluate((format) => {
    window.__app.reel.enter();
    window.__app.reel.setFormat(format);
  }, formatId);
  // Entering resizes the canvas to the target aspect on the next frame.
  await page.waitForTimeout(600);

  /**
   * The format buttons are out-of-frame controls — a person recording the
   * frame rectangle positions the window so they fall outside it. A still has
   * no outside, so they are taken off for the shot. Nothing else is hidden:
   * everything remaining is what the video shows.
   */
  await page.addStyleTag({ content: '.reel-chrome { display: none !important; }' });

  const box = await page.locator('canvas').first().boundingBox();
  if (!box) die('the sequence rendered no canvas');
  // The overlay is DOM drawn over the canvas, and it is half of what the video
  // says, so the frame written out is the whole composed picture.
  const clip = {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };

  const ATTEMPTS = 12;
  /**
   * Shoot the held frame until two in a row agree.
   *
   * The sequence itself does not move while it is held, but the rasteriser
   * jitters on edges and the atlas is still settling into place for the first
   * frames after entering, so the same rule the other capture tools use
   * applies: keep the frame that repeated, never the one that looked best.
   */
  const captureHeld = async (path) => {
    let previous = null;
    let closest = null;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const bytes = await page.screenshot({ clip });
      if (previous) {
        const differing = await differingPixels(page, previous, bytes);
        closest = closest === null ? differing : Math.min(closest, differing);
        if (differing <= settledPixels(clip)) {
          writeFileSync(path, bytes);
          return attempt;
        }
      }
      previous = bytes;
      await page.waitForTimeout(250);
    }
    if (closest !== null) console.error(`    closest two frames still differed by ${closest} pixel(s)`);
    return null;
  };

  console.log(`${sceneSlug}: ${moments.length} moment(s) of a ${cues.at(-1).until}s sequence, ${formatId}`);
  let written = 0;
  for (const moment of moments) {
    await page.evaluate((t) => window.__app.reel.seek(t), moment.at);
    await page.waitForTimeout(250);
    const held = await page.evaluate(() => window.__app.reel.elapsed);
    if (Math.abs(held - moment.at) > 1e-6) die(`the sequence would not hold at ${moment.at}s (it is at ${held}s)`);
    const name = `${String(moment.at.toFixed(1)).padStart(4, '0')}s-${moment.id}.png`;
    const attempts = await captureHeld(join(outDir, name));
    if (attempts === null) {
      console.error(`  ${name}: the frame never settled`);
      continue;
    }
    written += 1;
    console.log(`  ${name}`);
  }
  await page.evaluate(() => window.__app.reel.exit());
  if (!written) die('nothing was written');
  console.log(`\n${written} frame(s) in ${outDir}`);
} finally {
  await browser.close();
  await closeServer();
}
