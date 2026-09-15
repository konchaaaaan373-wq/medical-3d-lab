#!/usr/bin/env node
/**
 * Opens the surfaces nobody could look at.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:gated
 *
 * ## Why this exists
 *
 * The patient guide and the education guide are behind billing entitlements, so
 * until now there was no way to see them in a browser without a subscription —
 * and no way to measure them. That is how a 9px medical boundary statement came
 * to ship: `.patient-guide-boundary` states what the model on screen may be
 * used for, and it is the smallest type in the product (F-113). Nobody put it
 * there on purpose. Nobody could see it.
 *
 * Two gates, two answers. The presentation gate is opened by the build — the
 * paid entitlements are granted to `VITE_ALLOW_PREVIEW=1` + `?preview=1` and to
 * nothing else (`src/access/previewGrants.js`). The content gate stays where it
 * is: the guides come from a server function that checks a real subscription,
 * so this check answers that request itself, from the repository's own authored
 * data, through the function's own `entitledGuide()`.
 *
 * ## What it reports
 *
 * Every text node the surface renders, with the size it renders at, sorted
 * smallest first — because the question that brought this into existence was
 * "what is the smallest type on a paid surface, and is it a caveat?".
 *
 * It fails when a sentence naming a limit on use is set below the product's
 * 12px floor. It does not fail on small type generally: that is a baseline
 * (`npm run type-floor`), and this is the one category where being hard to read
 * is a claim about the medicine rather than about the design.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --scene <id>     one scene instead of the default pair
 *   --shots <dir>    save a screenshot per surface
 *   --headed         show the browser
 *   --all            every scene with a paid surface, not just the sample
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { stubPaidSurfaces } from './lib/stub-paid-surfaces.mjs';
import { authoredFeaturesForScene } from '../src/access/features.js';
import { SCENES, sceneRoute } from '../src/catalog/index.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const shotsDir = value('--shots', null);
const onlyScene = value('--scene', null);
const everyScene = flag('--all');
const headed = flag('--headed');

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

if (!existsSync(distDir)) die(`No build at "${distDir}". Run \`npm run build\` first.`);
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

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
    'Playwright is not installed, so nothing was opened.\n\n' +
      '  npm i --no-save playwright\n  npx playwright install --with-deps chromium\n\n' +
      'It is deliberately not a dependency: `npm test` must stay a plain `node --test` run.'
  );
}

/** The product's floor, and the reason this check has an opinion about it. */
const FLOOR_PX = 12;

/**
 * A sentence that limits what the thing on screen may be used for.
 *
 * Matched on the class rather than on the words: the copy is authored per
 * scene and in two languages, and a check that greps for 「診断」 would pass the
 * day somebody rephrased it. These class names are the product's own word for
 * "this is a boundary statement".
 */
const CAVEAT_CLASSES = [
  'patient-guide-boundary',
  'patient-guide-educational',
  'patient-guide-certainty',
  'education-guide-boundary',
  'disclaimer',
  'landing-demo-boundary',
];

const { base: origin, close: closeServer } = await serveDist(distDir);

const paidScenes = SCENES.filter((scene) => {
  const features = authoredFeaturesForScene(scene.id);
  return features.patient === true || features.education === true;
});

const chosen = onlyScene
  ? paidScenes.filter((scene) => scene.id === onlyScene)
  : everyScene
    ? paidScenes
    // Two is the sample: one with both surfaces and one with the patient guide
    // only, so both code paths are opened without driving thirty scenes.
    : paidScenes.filter((scene) => ['copd-hyperinflation', 'renal-filtration'].includes(scene.id));

if (chosen.length === 0) die(`No scene with a paid surface matched${onlyScene ? ` "${onlyScene}"` : ''}.`);

const browser = await chromium.launch({
  headless: !headed,
  executablePath: chromiumExecutable(chromium),
});

const problems = [];
const opened = [];

/** Every visible text node with the size it renders at, smallest first. */
const MEASURE = `(() => {
  const caveat = ${JSON.stringify(CAVEAT_CLASSES)};
  const rows = [];
  for (const node of document.querySelectorAll('*')) {
    if (!node.offsetParent) continue;
    if (node.children.length > 0) continue;
    const text = (node.innerText || '').replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const classes = (node.className || '').toString().split(/\\s+/).filter(Boolean);
    const owner = [node, node.parentElement, node.parentElement?.parentElement].filter(Boolean);
    const isCaveat = owner.some((up) =>
      caveat.some((name) => (up.className || '').toString().split(/\\s+/).includes(name)));
    rows.push({
      px: parseFloat(getComputedStyle(node).fontSize),
      where: classes[0] || node.tagName.toLowerCase(),
      isCaveat,
      text: text.slice(0, 48),
    });
  }
  return rows.sort((a, b) => a.px - b.px);
})()`;

try {
  console.log(`\nPaid surfaces — what they look like, and how small (${origin})\n`);

  for (const scene of chosen) {
    const features = authoredFeaturesForScene(scene.id);
    for (const mode of ['patient', 'education']) {
      if (features[mode] !== true) {
        console.log(`  ${scene.id} · ${mode}: not authored for this scene, skipped`);
        continue;
      }

      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const stub = await stubPaidSurfaces(page);

      // `?preview=1` is what grants the entitlement. Without it the button is
      // a lock and this check has nothing to look at — which is the assertion
      // in `tests/preview-grants.test.js`, not here.
      await page.goto(`${origin}/?preview=1${sceneRoute(scene)}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!document.querySelector('canvas'), null, { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2500);

      const button = page.locator(`[data-paid-mode="${mode === 'education' ? 'education-guide' : mode}"]`).first();
      const present = await button.count().then((count) => count > 0);
      if (!present) {
        problems.push(`${scene.id} · ${mode}: no control to open it, in a preview build`);
        await context.close();
        continue;
      }

      await button.click({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2500);

      const panel = await page.locator('.patient-guide, .education-guide').first().count();
      if (panel === 0) {
        problems.push(
          `${scene.id} · ${mode}: the control was there and the panel did not open`
            + ` (served ${stub.served.length}, refused ${stub.refused.join(', ') || 'none'})`
        );
        await context.close();
        continue;
      }

      const rows = await page.evaluate(MEASURE);
      const caveats = rows.filter((row) => row.isCaveat);
      const belowFloor = caveats.filter((row) => row.px < FLOOR_PX);
      opened.push({ scene: scene.id, mode, smallest: rows[0], caveats, belowFloor });

      if (shotsDir) {
        await page.screenshot({ path: join(shotsDir, `${scene.id}-${mode}.png`), fullPage: true }).catch(() => {});
      }

      console.log(`  ${scene.id} · ${mode}`);
      console.log(`    smallest text on screen: ${rows[0]?.px}px  .${rows[0]?.where}  "${rows[0]?.text}"`);
      for (const row of caveats) {
        const mark = row.px < FLOOR_PX ? 'BELOW' : '  ok ';
        console.log(`    ${mark} ${String(row.px).padStart(5)}px  .${row.where}  "${row.text}"`);
      }
      for (const row of belowFloor) {
        problems.push(
          `${scene.id} · ${mode}: .${row.where} is ${row.px}px — a limit on use, below the ${FLOOR_PX}px floor`
        );
      }
      console.log('');
      await context.close();
    }
  }

  console.log('Still only a person can do these:');
  console.log('  - Whether the explanation is one a patient would follow.');
  console.log('  - The purchase and lock surfaces, which a reviewer never sees.');
  console.log('  - Safari and Firefox — this run drove Chromium.\n');

  // Problems first, always. The first version reported "nothing opened" and
  // returned before printing them, so the run said the build was wrong while
  // holding the sentence that said what had actually happened.
  if (problems.length) {
    console.error(`${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  }

  if (opened.length === 0) {
    console.error(
      `\nNo paid surface opened, out of ${chosen.length} scene(s) asked for.`
        + ' A build without `VITE_ALLOW_PREVIEW=1` will do this, and so will a scene'
        + ' whose paid modes are not authored.'
    );
    process.exitCode = 1;
  } else if (!problems.length) {
    console.log(`${opened.length} paid surface(s) opened; every limit on use is at or above ${FLOOR_PX}px.`);
  }
} finally {
  await browser.close().catch(() => {});
  await closeServer?.();
}
