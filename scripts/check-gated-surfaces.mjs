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
 * ## Both sides of the gate
 *
 * `--locked` measures what a reader *without* the entitlement meets instead:
 * the lock on the control, and whatever opens when they press it. A reviewer
 * holding the grants never sees those, which is how they came to be the
 * unmeasured half the moment this check existed (F-119). `?entitled=0`
 * withholds the grants and changes nothing else.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --scene <id>     one scene instead of the default pair
 *   --shots <dir>    save a screenshot per surface
 *   --headed         show the browser
 *   --all            every scene with a paid surface, not just the sample
 *   --locked         the surfaces a reader *without* the entitlement meets
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
const lockedView = flag('--locked');
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
  console.log(
    `\nPaid surfaces — ${lockedView ? 'what a reader without the entitlement meets' : 'what they look like, and how small'}`
      + ` (${origin})\n`
  );

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

      // `?preview=1` opens the scene; the paid grants come with it unless
      // `?entitled=0` says otherwise. The query string is not stripped, so it
      // survives the reload a hash navigation causes.
      const query = `?preview=1${lockedView ? '&entitled=0' : ''}`;
      await page.goto(`${origin}/${query}${sceneRoute(scene)}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!document.querySelector('canvas'), null, { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2500);

      const button = page.locator(`[data-paid-mode="${mode === 'education' ? 'education-guide' : mode}"]`).first();
      const present = await button.count().then((count) => count > 0);
      if (!present) {
        problems.push(`${scene.id} · ${mode}: no control to open it, in a preview build`);
        await context.close();
        continue;
      }

      // The lock is on the control before anything is pressed, so it is read
      // here rather than after.
      //
      // The product's own signal — `is-locked` on the button, set from the
      // grants — rather than "is there an element whose class contains lock".
      // The padlock is always in the DOM and merely `hidden` when entitled, so
      // asking whether it exists reported every entitled control as locked.
      const locked = await button.evaluate((node) =>
        node.classList.contains('is-locked')
          && !!node.querySelector('.feature-lock:not([hidden])'));
      if (lockedView && !locked) {
        problems.push(`${scene.id} · ${mode}: no lock on the control, with the entitlement withheld`);
      }
      if (!lockedView && locked) {
        problems.push(`${scene.id} · ${mode}: the control is locked, in an entitled preview`);
      }

      await button.click({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2500);

      // Entitled, the guide opens. Unentitled, the account surface does — and
      // that is the thing being measured, so it is not a failure here.
      const wanted = lockedView ? '.access-dialog' : '.patient-guide, .education-guide';
      const panel = await page.locator(wanted).first().count();
      if (panel === 0) {
        problems.push(
          `${scene.id} · ${mode}: the control was there and ${lockedView ? 'nothing opened' : 'the panel did not open'}`
            + ` (served ${stub.served.length}, refused ${stub.refused.join(', ') || 'none'})`
        );
        await context.close();
        continue;
      }

      // In the unentitled view the thing under test is the offer, so a deploy
      // that cannot make one is measuring its own configuration again. The
      // stub answers `billing-status` and `plan-catalog`, so a missing price
      // here means the surface changed shape, not that billing is off.
      if (lockedView) {
        const priced = await page.evaluate(() =>
          /¥|\$|€/.test(document.querySelector('.access-dialog')?.innerText ?? ''));
        if (!priced) {
          problems.push(`${scene.id} · ${mode}: the account surface opened with no offer on it`);
        }
      }

      const rows = await page.evaluate(MEASURE);
      const caveats = rows.filter((row) => row.isCaveat);
      const belowFloor = caveats.filter((row) => row.px < FLOOR_PX);
      opened.push({ scene: scene.id, mode, smallest: rows[0], caveats, belowFloor });

      if (shotsDir) {
        const suffix = lockedView ? `${mode}-locked` : mode;
        await page.screenshot({ path: join(shotsDir, `${scene.id}-${suffix}.png`), fullPage: true }).catch(() => {});
      }

      console.log(`  ${scene.id} · ${mode}${lockedView ? ' · not entitled' : ''}`);
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
  if (lockedView) {
    console.log('  - Whether the offer is one anybody would take.');
    console.log('  - Stripe itself: checkout opens somewhere this run cannot follow.');
  } else {
    console.log('  - Whether the explanation is one a patient would follow.');
    console.log('  - The purchase and lock surfaces — `--locked` measures those.');
  }
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
