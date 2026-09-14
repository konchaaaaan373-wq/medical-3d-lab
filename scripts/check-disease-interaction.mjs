#!/usr/bin/env node
/**
 * Drives disease scenes through baseline → disease → reset, in a real browser.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:disease -- copd asthma pulmonary-edema
 *
 * ## What it checks, and why it is a script
 *
 * The promise a disease scene makes to a reader is that they can move the model
 * off its baseline, see the difference, and put it back. Every part of that is
 * invisible to `node --test`: the model's own tests check the physiology, and a
 * scene test checks that the scene agrees with the model, but neither can see
 * whether the console's Reset button actually returns the *scene* to where it
 * started. It does not always. This found a COPD Reset that put the four
 * sliders back and left the lung sitting where the reader had driven it,
 * handing back several breaths of negative tidal volume while it emptied.
 *
 * Everything compared is read out of the product's own panels — the stage
 * read-out, the metric figures, the control values — so what is checked is what
 * a reader is shown rather than a state written in from outside.
 *
 * ## What it cannot check
 *
 * That the change is the *right* change. It knows that the numbers moved, not
 * that they moved the way the disease does; that is the model's own tests and a
 * clinical reviewer. And it drives every control to its maximum, which for a
 * scene whose controls include a treatment is not the worst state — read the
 * scene's own tests for the states that matter.
 *
 * Options: the scene slugs to drive, as arguments, after an optional output
 * directory for the screenshots.
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';

const distDir = resolve('dist');
const outDir = process.argv[2] ?? '/tmp/disease-shots';
mkdirSync(outDir, { recursive: true });

// One static server, shared with every other browser check. This file used to
// carry its own, and that copy had no containment check at all: any path that
// resolved outside the build was served. See `lib/serve-dist.mjs`.
const { base: origin, close: closeServer } = await serveDist(distDir);
const base = origin.replace(/\/$/, '');

const SLUGS = process.argv.slice(3);
// Same resolver as every other browser check; `CHROMIUM_PATH` still wins.
const browser = await chromium.launch({ executablePath: chromiumExecutable(chromium) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const state = () =>
  page.evaluate(() => {
    const text = (selector) =>
      [...document.querySelectorAll(selector)].map((node) => node.textContent.trim()).join(' | ');
    return {
      stage: text('.stage-name.lang-en'),
      metrics: text('.metrics .metric-figure'),
      controls: [...document.querySelectorAll('.model-control input[type="range"]')].map((el) => el.value).join(','),
      // The progression slider, not a model control. Both carry `slider`; only
      // the small ones inside the model panel carry `slider-sm`, and matching
      // on the shared class drove a respiratory rate while believing it was
      // driving the disease.
      slider: document.querySelector('input.slider:not(.slider-sm)')?.value ?? '',
    };
  });

const setSlider = async (value) => {
  const slider = page.locator('input.slider:not(.slider-sm)').first();
  if (!(await slider.count())) return false;
  await slider.evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(1600);
  return true;
};

const report = [];
for (const slug of SLUGS) {
  await page.goto(`${base}?preview=1#/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2600);
  const consent = page.locator('button', { hasText: '許可しない' });
  if (await consent.count()) await consent.first().click().catch(() => {});
  await page.waitForTimeout(300);

  const problems = [];
  // Read before touching anything: the baseline is the state the scene opens
  // in, not a state this script put it into.
  const baseline = await state();
  const hasSlider = (await page.locator('input.slider:not(.slider-sm)').count()) > 0;
  await page.screenshot({ path: join(outDir, `${slug}-baseline.png`) });

  if (!hasSlider) problems.push('no progression slider');
  await setSlider('1000');

  // Push every model control to its far end as well, where there is one: a
  // scene whose slider is its whole story and a scene whose controls are the
  // story both have to end up somewhere different from where they started.
  const controls = page.locator('.model-control input[type="range"]');
  const controlCount = await controls.count();
  for (let i = 0; i < controlCount; i += 1) {
    await controls.nth(i).evaluate((el) => {
      el.value = el.max;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  await page.waitForTimeout(1800);
  const diseased = await state();
  await page.screenshot({ path: join(outDir, `${slug}-disease.png`) });

  if (JSON.stringify(baseline) === JSON.stringify(diseased)) {
    problems.push('nothing the product displays changed between baseline and disease');
  } else {
    if (hasSlider && baseline.stage === diseased.stage) problems.push('the stage read-out did not move');
    if (baseline.metrics && baseline.metrics === diseased.metrics) problems.push('no metric changed');
  }

  const reset = page.locator('button', { hasText: 'モデル初期化' });
  if (!(await reset.count())) problems.push('no reset control');
  else {
    await reset.first().click();
    // Long enough for a scene with a clock to wash out. COPD's trapped gas
    // leaves over several breaths, which is the physiology and not a failure
    // to reset: what has to be true is that it *does* leave.
    await page.waitForTimeout(12000);
    const back = await state();
    // The progression is damped towards its target, so "back at the start"
    // is a small number rather than exactly the string it started as.
    if (Math.abs(Number(back.slider) - Number(baseline.slider)) > 5) {
      problems.push(`reset left the progression at ${back.slider}, not ${baseline.slider}`);
    }
    if (controlCount && back.controls !== baseline.controls) problems.push('reset did not restore the model controls');
    if (baseline.metrics && back.metrics !== baseline.metrics) {
      problems.push(`reset did not restore the numbers (${baseline.metrics} -> ${back.metrics})`);
    }
  }

  report.push({ slug, controlCount, problems, baseline, diseased });
  if (process.env.VERBOSE) console.log(JSON.stringify({ slug, baseline, diseased }, null, 1));
  console.log(
    `${slug}: ${controlCount} control(s), ${problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'baseline → disease → reset all observed'}`
  );
}

await browser.close();
closeServer();
