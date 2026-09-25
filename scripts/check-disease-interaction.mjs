#!/usr/bin/env node
/**
 * Drives disease scenes through baseline → disease → reset, in a real browser.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:disease -- disease-shots copd asthma pulmonary-edema
 *
 * The first argument is the screenshot directory, and it is not optional in
 * practice: the line above used to start at `copd`, which made `copd` the
 * output directory and drove the other two. A run that silently covers one
 * scene fewer than it was asked for reads exactly like a run that passed.
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
 * ## The video export
 *
 * A second phase, on the scenes that carry a 15-second sequence: enter the
 * sequence, ask for the file, and check that the consent screen refuses until
 * every clause is ticked and that a file with bytes in it actually arrives.
 *
 * It is here rather than in `node --test` because nothing below a real browser
 * can answer the question. `MediaRecorder` over `canvas.captureStream()` is the
 * whole mechanism; a unit test can check which container was asked for and
 * whether the right frames were composited, and cannot check that the browser
 * encoded anything at all. It is here rather than in its own script because
 * these are the same scenes, in the same session, and a second browser check
 * costs four cores and ten minutes of somebody's afternoon.
 *
 * Options:
 *   --engine <name>  chromium (default), firefox or webkit
 *   --dpr <number>   device scale factor (default 1)
 *   --dist <path>    build directory (default dist)
 *   the scene slugs to drive, as arguments, after an optional output directory
 *   for the screenshots.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as playwright from 'playwright';
import { chromiumExecutable } from './lib/browser.mjs';
import { pressConsoleControl } from './lib/console-controls.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { videoExportOffered } from '../src/app/videoExport.js';
import { VIDEO_MIME_CANDIDATES } from '../src/app/videoRecorder.js';

/**
 * `--engine chromium|firefox|webkit`, stripped before the positional
 * arguments are read.
 *
 * The export is the reason this exists. `MediaRecorder` over
 * `canvas.captureStream()` is a browser feature, and "it works" was measured
 * on exactly one engine until this flag (F-169). The other two cannot be
 * downloaded in every environment, so the default stays Chromium and the
 * matrix lives in `final-browser-validation.yml`, where the runner can fetch
 * them.
 */
const argv = process.argv.slice(2);
const dprAt = argv.indexOf('--dpr');
const dpr = dprAt >= 0 ? Number(argv[dprAt + 1]) : 1;
if (dprAt >= 0) argv.splice(dprAt, 2);
if (!Number.isFinite(dpr) || dpr <= 0 || dpr > 4) {
  console.error('--dpr must be a number greater than 0 and at most 4.');
  process.exit(1);
}
const engineAt = argv.indexOf('--engine');
const engineName = engineAt >= 0 ? argv[engineAt + 1] : 'chromium';
if (engineAt >= 0) argv.splice(engineAt, 2);
if (!['chromium', 'firefox', 'webkit'].includes(engineName)) {
  console.error(`Unknown --engine "${engineName}". Choose one of: chromium, firefox, webkit.`);
  process.exit(1);
}

const distAt = argv.indexOf('--dist');
const distDir = resolve(distAt >= 0 ? argv[distAt + 1] : 'dist');
if (distAt >= 0) argv.splice(distAt, 2);
const outDir = argv[0] ?? '/tmp/disease-shots';
mkdirSync(outDir, { recursive: true });

// One static server, shared with every other browser check. This file used to
// carry its own, and that copy had no containment check at all: any path that
// resolved outside the build was served. See `lib/serve-dist.mjs`.
const { base: origin, close: closeServer } = await serveDist(distDir);
const base = origin.replace(/\/$/, '');

const SLUGS = argv.slice(1);
const engine = playwright[engineName];
// The fallback resolver is Chromium's alone — it exists for images that ship a
// Chromium under `PLAYWRIGHT_BROWSERS_PATH`. Firefox and WebKit are launched
// the way Playwright wants to launch them.
const browser = await engine.launch(
  engineName === 'chromium' ? { executablePath: chromiumExecutable(engine) } : {}
);
if (engineName !== 'chromium') console.log(`engine: ${engineName}`);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
console.log(`deviceScaleFactor: ${dpr}`);

/**
 * Anything the page threw, kept for the report.
 *
 * An uncaught error inside the render loop stops the loop, and everything
 * downstream of it — a lesson step that advances from `tick()`, the reel, the
 * export — then fails as "nothing happened" rather than as "this threw". That
 * cost a day once already (L-86). One listener is the whole fix.
 */
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));

/**
 * Whether this engine can make a WebGL2 context *here*.
 *
 * Every scene in this check is a 3D scene, so an engine that cannot is not a
 * product failure — it is a machine that cannot run the measurement. Measured
 * (2026-09-21): headless Firefox on a GitHub runner refuses the context, and
 * the run died thirty seconds later saying only that it could not find a
 * canvas. `check-viewports.mjs` answers the same refusal the same way, and
 * says at the end what it therefore did not measure.
 */
const hasWebgl2 = await page.evaluate(() => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
});
if (!hasWebgl2) {
  console.log(
    `\n  note: ${engineName} cannot create a WebGL2 context on this machine, so no scene was driven`
      + ' and no export was measured. Nothing here says anything about the product.'
  );
  await browser.close();
  closeServer();
  process.exit(dpr > 1 ? 1 : 0);
}

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
/** How many scenes offered an export, and how many produced a file this engine could play. */
let exportsOffered = 0;
let exportsRecorded = 0;
for (const slug of SLUGS) {
  await page.goto(`${base}?preview=1#/${slug}`, { waitUntil: 'networkidle' });
  // And refuse the locked page rather than timing out on a canvas that is not
  // coming. `?preview=1` unlocks a build made with `VITE_ALLOW_PREVIEW=1` and
  // nothing else; against a production build every disease scene answers with
  // "to be updated", and the run used to die 30 seconds later saying only that
  // it could not find a canvas. `capture-phone-states.mjs` refuses the same
  // surface for the same reason.
  if (await page.locator('.locked-copy').count()) {
    console.error(
      `\nThe build does not open ${slug}: it answered with the "to be updated" page.\n\n`
        + '  VITE_ALLOW_PREVIEW=1 npm run build\n'
        + `  npm run verify:disease -- ${outDir} ${SLUGS.join(' ')}\n\n`
        + 'A production build cannot be unlocked by a query parameter — the scene is not in it.'
    );
    await browser.close();
    closeServer();
    process.exit(1);
  }
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

  // --- the experiment layout: one viewport, and a camera that holds still ---
  //
  // A scene laid out as an experiment (`meta.layout = 'experiment'`) is read
  // as before-and-after: press an intervention, look at the heart, look at the
  // figures. Two things only a browser can see break that. The camera is
  // refitted whenever the console or the rail changes size, so a choice that
  // changed either would move the heart between the two looks; and a choice
  // row or a headline figure below the fold is a step the reader cannot take.
  // Measured at the desktop size this check runs at, before anything else has
  // touched the page.
  if (await page.locator("#ui[data-layout='experiment']").count()) {
    const viewport = page.viewportSize();
    const outside = await page.evaluate(({ width, height }) => {
      const nodes = [
        ...document.querySelectorAll('button.model-choice-button'),
        ...document.querySelectorAll(".metrics .metric.is-key"),
      ];
      return nodes
        .map((node) => ({ node, rect: node.getBoundingClientRect() }))
        .filter(({ rect }) => !(rect.width > 0 && rect.top >= 0 && rect.bottom <= height && rect.left >= 0 && rect.right <= width))
        .map(({ node }) => node.textContent.trim().replace(/\s+/g, ' ').slice(0, 40));
    }, viewport);
    for (const label of outside) problems.push(`experiment layout: “${label}” is not inside the first viewport`);

    const camera = () =>
      page.evaluate(() => window.__app?.viewer?.camera.position.toArray().map((v) => v.toFixed(2)).join(',') ?? null);
    // `button`: the row also carries the "adjusted by hand" status, which shares
    // the class and is not pressable.
    const choices = page.locator('.model-control[data-control="intervention"] button.model-choice-button');
    if ((await choices.count()) > 1) {
      // An intervention may bring its own condition with it (dobutamine's
      // evidence belongs to the reduced-contractility preset, and choosing it
      // switches there), so the condition is put back as well as the
      // intervention — otherwise the reset check below compares against a
      // baseline this block quietly changed.
      const presets = page.locator('.model-control[data-control="preset"] button.model-choice-button');
      const selectedPreset = await presets.evaluateAll((nodes) => nodes.findIndex((node) => node.classList.contains('is-selected')));
      const before = await camera();
      await choices.last().click();
      await page.waitForTimeout(1500);
      const after = await camera();
      // Compared with a tolerance, and why: with no input at all the camera
      // still creeps about 0.002 world units a second (measured 2026-09-25 at
      // 1440×900, distance 33) — the shell's easing converging, not a reframe.
      // Compared exactly at two decimals, the check went red whenever a
      // rounding boundary fell inside its 1.5 s window. A reframe moves whole
      // units: the one this guards against moved 0.24.
      const moved = before && after
        ? Math.hypot(...before.split(',').map((value, i) => Number(value) - Number(after.split(',')[i])))
        : 0;
      if (moved > 0.05) {
        problems.push(`experiment layout: pressing an intervention moved the camera (${before} -> ${after})`);
      }
      if (selectedPreset >= 0) await presets.nth(selectedPreset).click();
      await choices.first().click();
      await page.waitForTimeout(900);
    }

    // Nothing on the screen may cover the model — not the read-out, not the
    // console, not the title. The owner's rule (2026-09-25): the heart may be
    // drawn small, it may not be hidden. Found on the device, not here: on an
    // iPhone in Safari (390×664 of page) the framing fell under its floor and
    // drew the heart at twice its size behind both panels, and the phone
    // layout then put the figures over it. 844 px tall — the only phone height
    // this check used to open — never showed either.
    //
    // Measured at rest and again after an intervention, because the read-out's
    // first row grows a line when something has been done. 375×553 (an SE with
    // Safari's toolbars) is reported, not enforced: the band there is tens of
    // pixels and a 2 px touch is not the failure this is for (F-212).
    const desktopSize = page.viewportSize();
    const covered = () =>
      page.evaluate(() => {
        const { viewer, scene } = window.__app ?? {};
        if (!viewer || !scene?.root) return null;
        const probe = viewer.camera.position.clone();
        const box = [Infinity, Infinity, -Infinity, -Infinity];
        scene.root.updateWorldMatrix(true, true);
        scene.root.traverse((object) => {
          const position = object.geometry?.attributes?.position;
          if (!position || object.isPoints || !object.visible) return;
          for (let i = 0; i < position.count; i += 9) {
            probe.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).project(viewer.camera);
            if (Math.abs(probe.z) > 1) continue;
            const x = ((probe.x + 1) / 2) * innerWidth;
            const y = ((1 - probe.y) / 2) * innerHeight;
            box[0] = Math.min(box[0], x);
            box[1] = Math.min(box[1], y);
            box[2] = Math.max(box[2], x);
            box[3] = Math.max(box[3], y);
          }
        });
        const hits = [];
        for (const [name, selector] of [['read-out', '.metrics'], ['console', '.console'], ['title', '.title-card']]) {
          const node = document.querySelector(selector);
          const rect = node?.getBoundingClientRect();
          if (!rect?.width) continue;
          const dx = Math.min(box[2], rect.right) - Math.max(box[0], rect.left);
          const dy = Math.min(box[3], rect.bottom) - Math.max(box[1], rect.top);
          // A 4 px margin: the box is of vertices, and a curve's silhouette
          // sits inside it.
          if (dx > 4 && dy > 4) hits.push(`${name} ${Math.round(dy)}px`);
        }
        return { box: box.map(Math.round), hits };
      });
    const interventions = page.locator('.model-control[data-control="intervention"] button.model-choice-button');
    const presetButtons = page.locator('.model-control[data-control="preset"] button.model-choice-button');
    const startPreset = await presetButtons.evaluateAll((nodes) => nodes.findIndex((node) => node.classList.contains('is-selected')));
    for (const [width, height, enforced] of [
      [1440, 900, true], [1280, 720, true], [1024, 768, true],
      [390, 844, true], [390, 664, true], [375, 667, true], [375, 553, false],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1500);
      for (const moment of ['at rest', 'after an intervention']) {
        if (moment !== 'at rest') {
          await interventions.last().click();
          await page.waitForTimeout(1500);
        }
        const result = await covered();
        if (!result || result.hits.length === 0) continue;
        const line = `experiment layout ${width}x${height} ${moment}: the model (${result.box.join(',')}) is covered by ${result.hits.join(', ')}`;
        if (enforced) problems.push(line);
        else console.log(`  ${slug}: ${line} [reported, not enforced — F-212]`);
      }
      if (startPreset >= 0) await presetButtons.nth(startPreset).click();
      await interventions.first().click();
      await page.waitForTimeout(600);
    }
    if (desktopSize) await page.setViewportSize(desktopSize);
    await page.waitForTimeout(900);
  }

  // --- the read-out on a phone ------------------------------------------
  //
  // A scene may declare which read-out rows are worth a small screen's space
  // (`compact: true` on a metric row). Where one does, those rows and the way
  // to the rest have to be **in the viewport** — not merely in the document,
  // and not behind a scroll a reader has no reason to try.
  //
  // This is here rather than in `verify:ui` because that check drives one
  // fixed scene (`#/brain-anatomy`) and would not have seen this one. It was
  // green while `cardiac-output` showed a reader cardiac output with the
  // filling pressure below the fold — which is the wrong half of what the
  // scene exists to teach (R152-04).
  const compactRows = await page.locator(".metrics.has-compact .metric[data-compact='key']").count();
  if (compactRows > 0) {
    const desktop = page.viewportSize();
    // Portrait is what the product currently meets and must not regress.
    // Landscape is reported and not enforced — see the note where it is
    // handled below; the reason is recorded as F-192 rather than hidden in a
    // tolerance.
    for (const [label, width, height, enforced] of [
      ['portrait 390x844', 390, 844, true],
      ['portrait 375x667', 375, 667, true],
      ['landscape 844x390', 844, 390, false],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(900);
      const report = await page.evaluate(({ width, height }) => {
        const inside = (rect) =>
          rect.top >= 0 && rect.left >= 0 && rect.bottom <= height && rect.right <= width;
        const describe = (node) => {
          const rect = node.getBoundingClientRect();
          const label = node.querySelector('.metric-label')?.textContent?.trim().slice(0, 24) ?? node.className;
          // Occlusion, asked only where the answer means anything.
          //
          // `elementFromPoint` is a **hit test**, and the scene overlay is
          // `pointer-events: none` so that a reader can drag the model through
          // it. Under that, the hit at a row's midpoint is the canvas behind
          // it however plainly the row is painted on top — the first version
          // of this reported all four rows "covered" at every width, which is
          // a property of the overlay rather than of the layout.
          //
          // So the test runs only where the element takes pointer events, and
          // a hit on the row, a descendant or an ancestor counts as clear.
          const takesPointer = getComputedStyle(node).pointerEvents !== 'none';
          const hit = takesPointer
            ? document.elementFromPoint(
                Math.min(width - 1, Math.max(0, rect.left + rect.width / 2)),
                Math.min(height - 1, Math.max(0, rect.top + rect.height / 2))
              )
            : null;
          return {
            label,
            visible: inside(rect) && rect.width > 0 && rect.height > 0,
            covered: takesPointer ? !(hit && (node.contains(hit) || hit.contains(node))) : false,
            occlusionTested: takesPointer,
            rect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom) },
          };
        };
        const rows = [...document.querySelectorAll(".metrics.has-compact .metric[data-compact='key']")].map(describe);
        // Geometry, so a failure says what to change rather than only that
        // something is wrong.
        const panel = document.querySelector('.metrics.has-compact');
        const rail = panel?.closest('.rail');
        const box = (node) => {
          if (!node) return null;
          const r = node.getBoundingClientRect();
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        };
        const geometry = {
          panel: box(panel),
          rail: box(rail),
          railScrollHeight: rail ? Math.round(rail.scrollHeight) : null,
          console: box(document.querySelector('.model-controls.is-primary') ?? document.querySelector('.console')),
        };
        const more = document.querySelector('.metrics.has-compact .metrics-more');
        const canvas = document.querySelector('canvas');
        const canvasRect = canvas?.getBoundingClientRect();
        return {
          rows,
          more: more ? describe(more) : null,
          geometry,
          // How much of the 3D a reader can actually see: the panels sit over
          // it, so "the model is not under the read-out" is part of this.
          canvasVisibleHeight: canvasRect
            ? Math.max(0, Math.min(height, canvasRect.bottom) - Math.max(0, canvasRect.top))
            : 0,
          viewportHeight: height,
        };
      }, { width, height });

      const where = JSON.stringify(report.geometry);
      // On a landscape phone the top bar collapses to nothing — the rail
      // measured 0px tall while the panel inside it was 162 — so the read-out
      // is clipped whatever it declares. That is the shared layout rather than
      // this scene, and fixing it is a decision about where a console and a
      // read-out go when the screen is 390px tall. Reported every run so it
      // cannot be forgotten, not enforced so the instrument stays honest about
      // what it is asking of whom.
      const note = (line) => console.log(`  ${slug}: ${line} [reported, not enforced — F-192]`);
      const report_ = enforced ? (line) => problems.push(line) : note;
      for (const row of report.rows) {
        if (!row.visible) {
          report_(
            `${label}: the read-out row “${row.label}” is outside the viewport ` +
              `(${row.rect.top}..${row.rect.bottom}) — ${where}`
          );
        } else if (row.covered) {
          report_(
            `${label}: the read-out row “${row.label}” is clipped or covered ` +
              `(${row.rect.top}..${row.rect.bottom}) — ${where}`
          );
        }
      }
      if (report.more && !report.more.visible) {
        report_(`${label}: the way to the rest of the figures is outside the viewport`);
      }
      if (report.canvasVisibleHeight < report.viewportHeight * 0.25) {
        report_(
          `${label}: only ${Math.round(report.canvasVisibleHeight)}px of the model is on screen` +
            ` out of ${report.viewportHeight}`
        );
      }
      await page.screenshot({ path: join(outDir, `${slug}-readout-${width}x${height}.png`) });
    }
    if (desktop) await page.setViewportSize(desktop);
    await page.waitForTimeout(700);
  }


  const controlLocator = page.locator('.model-control input[type="range"]');
  const hasModelControls = (await controlLocator.count()) > 0;
  // A scene whose subject is a set of independent conditions rather than a
  // trajectory declares `meta.progression.enabled = false` and is *right* not
  // to have a progression slider — `circulation` and `cardiac-output` are both
  // this shape. What must never be true is that there is nothing to move at
  // all, so the check is "one of the two", not "the slider".
  if (!hasSlider && !hasModelControls) problems.push('nothing on the page moves the model');
  await setSlider('1000');

  // Push every model control to its far end as well, where there is one: a
  // scene whose slider is its whole story and a scene whose controls are the
  // story both have to end up somewhere different from where they started.
  const controls = controlLocator;
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

  // Two resets, because there are two panels that can carry one. A scene with a
  // progression axis gets "モデル初期化" on the console; a scene whose model
  // controls are the whole story gets "戻す" on the controls panel instead
  // (`ModelControls`, `copy.reset`). Looking for only the first reported
  // `circulation` and `cardiac-output` as having no reset at all, which is the
  // kind of false red that teaches people to ignore a checker.
  const consoleReset = page.locator('button', { hasText: 'モデル初期化' });
  const reset = (await consoleReset.count()) ? consoleReset : page.locator('.model-control-reset');
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

  // --- the plots, and the comparison --------------------------------------
  //
  // A scene can build a pressure-volume panel, mount it, update it every frame
  // and never show it: the plots live in Data view, and whether that view is
  // reachable is a separate decision. So this asks for the view the way a
  // reader does, and then asks the canvas whether anything was actually drawn
  // on it — a blank plot and a plot nobody can reach look identical from here
  // and from every unit test.
  const dataButton = page.locator('button[data-control="data"]');
  if (await dataButton.count()) {
    await dataButton.first().click();
    await page.waitForFunction(() => document.querySelector('#ui')?.dataset.view === 'data');
    await page.waitForTimeout(1400);
    await page.screenshot({ path: join(outDir, `${slug}-data-view.png`) });
    const plots = await page.evaluate(() =>
      [...document.querySelectorAll('.pv canvas, .wave canvas, .chart canvas')].map((canvas) => {
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return { name: canvas.parentElement?.className ?? '?', drawn: 0, visible: false };
        const context = canvas.getContext('2d');
        if (!context) return { name: canvas.parentElement?.className ?? '?', drawn: 0, visible: true };
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        const colours = new Set();
        for (let i = 0; i < data.length; i += 4 * 37) {
          colours.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
        }
        return { name: canvas.parentElement?.className ?? '?', drawn: colours.size, visible: true };
      })
    );
    for (const plot of plots) {
      if (!plot.visible) problems.push(`a plot in ${plot.name} is mounted with no size`);
      else if (plot.drawn < 3) problems.push(`the plot in ${plot.name} is blank (${plot.drawn} colours)`);
    }
    if (plots.length) console.log(`  ${slug}: ${plots.length} plot(s) drawn in Data view`);
  } else if (await page.locator('.pv canvas').count()) {
    problems.push('the scene draws a pressure-volume plot that Data view is the only way to reach, and offers no Data button');
  }

  const compareButton = page.locator('button[data-control="compare"]');
  if (await compareButton.count()) {
    await compareButton.first().click();
    await page.waitForTimeout(2200);
    await page.screenshot({ path: join(outDir, `${slug}-compare.png`) });
    const referenced = await page.evaluate(() =>
      [...document.querySelectorAll('.metrics .metric-reference')].filter((node) => node.textContent.trim()).length
    );
    if (!referenced) problems.push('comparison is on and no row shows what it is compared against');
    await compareButton.first().click();
    await page.waitForTimeout(900);
  }

  // --- the lesson, end to end ---------------------------------------------
  //
  // A lesson is content that makes a claim about the model, and its tests check
  // the claim. What they cannot check is that a reader can get through it: the
  // panel drives the model through the scene's own setters, and a lesson that
  // names a control the scene does not have, or a row the read-out does not
  // carry, renders a dead button or a table of `undefined` and throws nothing.
  // The pulmonary-oedema scene shipped a lesson that failed on the first click.
  //
  // So this walks it — predict, apply, and on to the end — and then checks the
  // thing only a browser can: that leaving it puts the model back where the
  // reader had it.
  const learnButton = page.locator('button[data-control="learn"]');
  if (await learnButton.count()) {
    const before = await state();
    await learnButton.first().click();
    await page.waitForSelector('.learn-body', { timeout: 5000 });
    await page.waitForTimeout(600);

    /**
     * The control on this step that carries a reader *forward*.
     *
     * Forward is the whole of it. An earlier version of this walk asked for
     * the first visible button in the nav row, and the nav row puts **Back**
     * first — so it pressed Back on every observe step, bounced to manipulate,
     * pressed apply, came back, and pressed Back again. It never reached
     * explain or transfer, and whether it happened to stop on a step that has
     * a table decided whether this check passed. On `cardiac-output` it did,
     * on `copd` it did not, and the report blamed the copd lesson for it.
     *
     * So: choices, then an action that is still pressable, then the primary
     * nav button only (`Next` / `Done` carry `.primary`; `Back` does not).
     * Asked for by visibility as well, because a step keeps the previous
     * step's nodes in the DOM and clicking a hidden one waits thirty seconds
     * and then fails as a timeout rather than as "the lesson is stuck".
     */
    const pressable = async () => {
      for (const selector of [
        '.learn-step .learn-choice',
        '.learn-step .learn-action:not([disabled])',
        '.learn-step .learn-nav-btn.primary',
      ]) {
        const all = page.locator(selector);
        for (let i = 0; i < (await all.count()); i += 1) {
          const candidate = all.nth(i);
          if (await candidate.isVisible().catch(() => false)) return candidate;
        }
      }
      return null;
    };

    // Read while walking, not at the end. The last step's own button is
    // `Done`, which closes the panel — so anything measured after the loop is
    // measured on a lesson that is no longer on screen.
    let sawRows = 0;
    let blank = false;
    let shot = false;
    const readTable = async () => {
      const rows = await page.locator('.learn-row-label').count();
      if (!rows) return;
      sawRows = Math.max(sawRows, rows);
      blank =
        blank ||
        (await page.evaluate(() =>
          [...document.querySelectorAll('.learn-row-figure')].some((node) => /undefined|NaN/.test(node.textContent))
        ));
      if (!shot) {
        shot = true;
        await page.screenshot({ path: join(outDir, `${slug}-lesson.png`) });
      }
    };

    /**
     * Which step the lesson is on, by its own kicker.
     *
     * The walk needs this because a click that *failed* looks exactly like a
     * click that worked if all you count is clicks — and on a slow runner
     * Playwright's own stability wait times out rather than pressing. Counting
     * attempts said "4 steps" for a walk that had not left the first one, and
     * the report then blamed the lesson for having no table. What is counted
     * here is where the lesson actually got to.
     */
    const kicker = async () =>
      (await page
        .locator('.learn-step .learn-kicker .lang-en')
        .first()
        .textContent()
        .catch(() => null)) ?? '';

    const trail = [await kicker()];
    // `idle` is the tween, not a stuck lesson: apply disables itself and the
    // step only advances once the manipulation has been driven into the model,
    // which for a scene with `settleModel` is a dozen breaths rather than a
    // second. Waiting is how this walk tells the two apart.
    //
    // The budget is generous on purpose. The tween is timed on the wall clock
    // but only advanced from the render loop, and the render loop is what a
    // high device pixel ratio slows down: at `--dpr 2` on software GL this
    // scene's manipulate step took longer than a ten-second budget, and the
    // walk reported it as a lesson with no table. Waiting is cheap and only
    // paid by a lesson that really is stuck.
    const IDLE_WAIT_MS = 1500;
    const IDLE_LIMIT = 30;
    let idle = 0;
    let clicked = 0;
    let refused = 0;
    const note = async () => {
      const now = await kicker();
      if (now && now !== trail[trail.length - 1]) trail.push(now);
    };
    for (let guard = 0; guard < 44 && idle < IDLE_LIMIT; guard += 1) {
      await readTable();
      const target = await pressable();
      if (!target) {
        idle += 1;
        await page.waitForTimeout(IDLE_WAIT_MS);
        if (!(await page.locator('.learn-body').count())) break;
        await note();
        continue;
      }
      idle = 0;
      // A refusal is recorded, not swallowed. `.catch(() => {})` alone is how
      // a walk that pressed nothing reported four steps.
      const pressed = await target
        .click({ timeout: 6000 })
        .then(() => true)
        .catch(() => false);
      if (pressed) clicked += 1;
      else refused += 1;
      // The manipulation is tweened into the model over about a second and a
      // half, and the transfer step solves the model four times.
      await page.waitForTimeout(1700);
      if (!(await page.locator('.learn-body').count())) break;
      await note();
      await readTable();
    }
    // Steps reached, not buttons pressed. `Predict → Manipulate → Observe →
    // Explain` is the loop this project's lessons are built on; a lesson that
    // ships `Transfer` adds a fifth.
    const steps = trail.filter(Boolean).length;
    const walked = `walked ${trail.filter(Boolean).join(' → ') || 'nowhere'}`
      + `, ${clicked} press(es)${refused ? `, ${refused} refused` : ''}`
      + `${idle >= IDLE_LIMIT ? `, then nothing to press for ${(IDLE_LIMIT * IDLE_WAIT_MS) / 1000}s` : ''}`;
    if (steps < 4) problems.push(`the lesson stopped after ${steps} step(s) — ${walked}`);
    if (!sawRows) problems.push(`the lesson never showed a before/after row — ${walked}`);
    if (blank) problems.push('the lesson read `undefined` into its own table');
    if (!shot) await page.screenshot({ path: join(outDir, `${slug}-lesson.png`) });

    // The lesson may already have closed itself — its last button is `Done`,
    // and the panel's nodes stay in the DOM after it does, so `count()` is not
    // an answer to "is it still open".
    const close = page.locator('.learn-close').first();
    if (await close.isVisible().catch(() => false)) await close.click();
    await page.waitForTimeout(1200);
    const reset = page.locator('.model-control-reset');
    if (await reset.count()) await reset.first().click();
    await page.waitForTimeout(1500);
    const back = await state();
    if (back.controls !== before.controls) {
      problems.push(`after the lesson and a reset the controls are ${back.controls}, not ${before.controls}`);
    }
  }

  // --- the sequence as a file ---------------------------------------------
  //
  // `videoExportOffered` is the product's own rule, imported rather than
  // restated: whether this scene may hand out a file is decided in one place,
  // and this check reads it instead of keeping a list that would drift.
  const animated = await page.evaluate(() => Boolean(window.__app?.reel));
  // Both halves, the way the app decides it. The release rule is imported from
  // the product; whether this engine can encode at all is asked of the engine.
  // Without the second half, a browser with no usable container would fail
  // here as "the rule says offered" — blaming the release rule for a gap in
  // the browser, which is the kind of report that gets a rule changed.
  const canEncode = await page.evaluate(
    (types) =>
      typeof MediaRecorder !== 'undefined' &&
      typeof document.querySelector('canvas')?.captureStream === 'function' &&
      types.some((type) => MediaRecorder.isTypeSupported?.(type)),
    [...VIDEO_MIME_CANDIDATES]
  );
  const shouldOffer = videoExportOffered(slug, { animated }) && canEncode;
  if (animated && !canEncode) console.log(`  ${slug}: this browser cannot encode a canvas — the download is not offered`);
  const reelButton = page.locator('button[data-control="reel"]');
  if (animated && (await reelButton.count())) {
    await pressConsoleControl(page, 'button[data-control="reel"]');
    await page.waitForTimeout(1200);

    // The sequence's own controls, measured on a phone.
    //
    // `verify:ui` never opens this surface — it measures the app's layouts, and
    // reel mode replaces them (F-170). The row gained a control and ran off
    // both edges of a 390px screen; a photograph found that, and a photograph
    // is not a measurement. This is, and it is here because this is the check
    // that is already inside the sequence.
    problems.push(...(await reachableAt(page, 390, 844, '.reel-chrome', 'the sequence controls')));

    const downloadButton = page.locator('button[data-control="video-download"]');
    const offered = (await downloadButton.count()) > 0;
    if (offered !== shouldOffer) {
      problems.push(`the download button is ${offered ? 'offered' : 'absent'} but the rule says ${shouldOffer ? 'offered' : 'absent'}`);
    }
    if (offered) {
      exportsOffered += 1;
      await downloadButton.first().click();
      await page.waitForSelector('.video-consent-panel', { timeout: 5000 });
      await page.screenshot({ path: join(outDir, `${slug}-video-consent.png`) });
      problems.push(...(await reachableAt(page, 390, 844, '.video-consent-panel', 'the consent screen')));

      // The agree button must be shut until every clause is ticked. This is the
      // half a unit test can also check; it is checked again here because the
      // attribute and the rule are two different things, and what a reader can
      // press is the attribute.
      const agree = page.locator('.video-consent-agree');
      if (!(await agree.isDisabled())) problems.push('the consent screen can be agreed to with nothing ticked');
      const boxes = page.locator('.video-consent-box');
      const boxCount = await boxes.count();
      if (!boxCount) problems.push('the consent screen has no clauses');
      for (let i = 0; i < boxCount; i += 1) await boxes.nth(i).check();
      if (await agree.isDisabled()) problems.push('the consent screen stayed shut with every clause ticked');

      // What the page itself was drawing, just before the recording starts.
      //
      // The first version of this check had an absolute frame-rate floor, and
      // it measured the machine rather than the export: on a software
      // rasteriser the heart runs at 4 frames a second and the brain atlas at
      // 1.5, so their recordings are *faithful* at those rates. The question
      // worth asking is whether the export cost the motion that was there —
      // which is exactly what asking for 1080×1920 on a slow machine does.
      const drawnPerSecond = await page.evaluate(
        () =>
          new Promise((resolve) => {
            let frames = 0;
            const started = performance.now();
            const tick = () => {
              frames += 1;
              if (performance.now() - started < 1500) requestAnimationFrame(tick);
              else resolve(Number((frames / ((performance.now() - started) / 1000)).toFixed(1)));
            };
            requestAnimationFrame(tick);
          })
      );

      // Observe the actual Three.js targets during the probe, not only the
      // encoded file (which can have the right size despite oversized passes).
      await page.evaluate(() => {
        const viewer = window.__app.viewer;
        const capture = viewer.captureSize.bind(viewer);
        window.__captureProbe = [];
        viewer.captureSize = (size) => {
          const release = capture(size);
          const targets = [viewer.composer.renderTarget1, viewer.composer.renderTarget2];
          window.__captureProbe.push({
            requested: size,
            rendererRatio: viewer.renderer.getPixelRatio(),
            targets: targets.map(({width, height}) => ({width, height})),
          });
          return release;
        };
      });
      const downloadPromise = page.waitForEvent('download', { timeout: 90_000 }).catch(() => null);
      await agree.click();
      const download = await downloadPromise;
      const probes = await page.evaluate(() => window.__captureProbe);
      if (!probes.length) problems.push('no capture-size probe was observed');
      for (const probe of probes) {
        if (probe.rendererRatio !== 1 || probe.targets.some(
          (target) => target.width !== probe.requested.width || target.height !== probe.requested.height
        )) problems.push(`capture targets exceed the requested size: ${JSON.stringify(probe)}`);
        console.log(`  DPR ${dpr} capture probe: ${JSON.stringify(probe)}`);
      }
      if (!download) problems.push('no file arrived within 90s of agreeing');
      else {
        const name = download.suggestedFilename();
        const saved = join(outDir, `${slug}-${name}`);
        await download.saveAs(saved);
        const { size } = statSync(saved);
        // A container with headers and no frames is a few hundred bytes. A
        // 15-second recording is tens of kilobytes at the very least, so a
        // small file is an empty one however successfully it downloaded.
        if (size < 20_000) problems.push(`the file is ${size} bytes, which is a container with nothing in it`);
        problems.push(...containerProblems(saved, name));
        // Then make the browser open what it just wrote. Size and magic bytes
        // say a file arrived; only decoding it says there are pictures in it,
        // and the extracted frame is the only place anybody can *see* that the
        // captions and the provenance footer were composited in.
        const decoded = await decodeRecording(page, saved, name);
        if (decoded.error) problems.push(`the browser could not play back its own file: ${decoded.error}`);
        else {
          exportsRecorded += 1;
          writeFileSync(join(outDir, `${slug}-video-frame.png`), Buffer.from(decoded.frame.split(',')[1], 'base64'));
          if (!decoded.width || !decoded.height) problems.push('the file decodes to a frame with no size');
          if (decoded.distinctColours < 24) {
            problems.push(`the decoded frame is flat (${decoded.distinctColours} colours): the recording caught nothing`);
          }
          console.log(
            `  ${slug}: ${name} — ${(size / 1024).toFixed(0)} kB, ${decoded.width}×${decoded.height}, `
              + `${decoded.frames} frames (${decoded.fps} fps, page drew ${drawnPerSecond}), `
              + `${Number.isFinite(decoded.duration) ? `${decoded.duration.toFixed(1)}s` : 'duration not written by the recorder'}`
          );
          // Did the export cost the motion that was on screen?
          //
          // Not an absolute floor — that measures the machine, and on a
          // software rasteriser the heart draws at 4 frames a second and the
          // brain atlas at 1.5 whether anything is recording or not.
          //
          // A share of what the page was drawing a moment earlier is the
          // honest line. Measured here, recording at the canvas's own size:
          //
          //   copd            8.6 drawn → 8.2 recorded   0.95
          //   heart failure   8.6 drawn → 4.3 recorded   0.50
          //   brain routes    3.3 drawn → 1.6 recorded   0.48
          //   copd, forced to 1080×1920  8 → 2.4         0.30
          //
          // Compositing costs about half a frame on the heavy scenes, because
          // `drawImage` from a WebGL canvas is a readback without a GPU. So
          // the line goes under that and above the regression worth catching:
          // a threshold at 0.5 would be a coin flip on two of these three.
          if (decoded.frames && drawnPerSecond > 0 && decoded.fps < drawnPerSecond * 0.35) {
            problems.push(
              `the file runs at ${decoded.fps} frames a second while the page was drawing ${drawnPerSecond}`
                + ' — the recording cost the motion that was on screen'
            );
          }
        }
      }
      await page.screenshot({ path: join(outDir, `${slug}-video-recorded.png`) });
    }
    // Back out of the sequence, and check that it actually left.
    //
    // The sequence's caption layer and its control row were appended on the
    // first entry and never removed, so leaving it used to leave both drawn
    // over the interactive scene — cards quoting the last frame's numbers, and
    // a live download button sitting on top of the console. Nothing in CSS hid
    // them and no unit test could see them; this is the level that can.
    const exit = page.locator('.reel-chip.is-exit');
    if (await exit.count()) await exit.first().click();
    await page.waitForTimeout(800);
    const leftOver = await page.evaluate(() =>
      ['.reel-chrome', '.reel-frame']
        .filter((selector) => {
          const node = document.querySelector(selector);
          if (!node) return false;
          const box = node.getBoundingClientRect();
          return getComputedStyle(node).display !== 'none' && box.width > 0 && box.height > 0;
        })
    );
    if (leftOver.length) problems.push(`leaving the sequence left ${leftOver.join(' and ')} on the page`);
    await page.screenshot({ path: join(outDir, `${slug}-after-reel.png`) });
  } else if (shouldOffer) {
    problems.push('the rule offers a video file but the scene has no sequence to record');
  }

  // Said once per scene, and said even on a green run: a page that threw and
  // carried on is a finding, and a page that threw and stopped is the reason
  // everything after it looks like "nothing happened".
  if (pageErrors.length) {
    const unique = [...new Set(pageErrors)];
    problems.push(`the page threw: ${unique.slice(0, 3).join(' · ')}`);
    pageErrors.length = 0;
  }

  report.push({ slug, controlCount, problems, baseline, diseased });
  if (process.env.VERBOSE) console.log(JSON.stringify({ slug, baseline, diseased }, null, 1));
  console.log(
    `${slug}: ${controlCount} control(s), ${problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'baseline → disease → reset all observed'}`
  );
}

await browser.close();
closeServer();

// And fail when something failed.
//
// Every other browser check in this repository ends this way; this one printed
// `PROBLEMS: …` and exited 0, so a run that found a scene whose Reset did not
// reset — or, since the export landed, one that produced no file, an empty
// container or a frame that would not decode — was green in CI. A check that
// cannot go red is not a check (L-09), and this one had been unable to since
// it was written.
const failed = report.filter((entry) => entry.problems.length);
if (failed.length) {
  console.error(`\n${failed.reduce((total, entry) => total + entry.problems.length, 0)} problem(s) across ${failed.length} scene(s):`);
  for (const entry of failed) {
    for (const problem of entry.problems) console.error(`  - ${entry.slug}: ${problem}`);
  }
  process.exit(1);
}
// A run that drove nothing is not a pass.
//
// Found by running this file against an ordinary `npm run build`: disease
// scenes are withheld from a production build, so every slug resolved to a
// locked page, the loop skipped all of them, and the line below printed
// `ok    0 scene(s)` and exited 0. "Nothing failed" and "nothing happened"
// are the same sentence to a CI log (L-49, L-61).
if (report.length === 0) {
  console.error(
    `\n  no scene was driven, so nothing here was measured.`
      + ` Disease scenes are not in a production build: rebuild with`
      + ` \`VITE_ALLOW_PREVIEW=1 npm run build\`, and check that the slugs given exist.`
  );
  await browser.close();
  closeServer();
  process.exit(1);
}

if (dpr > 1 && exportsRecorded === 0) {
  console.error('DPR validation requires at least one recorded and decoded export.');
  process.exit(1);
}

// What was measured, not only that nothing failed.
//
// `webkit` was green on a run where it recorded nothing at all: the engine
// cannot encode a canvas, so the product does not offer the download, and
// "every export that was offered produced a file" is true of none of them.
// A count is the difference between a green that measured something and a
// green that measured the absence of something.
//
// The exit above is what makes the encoder a defensible explanation below:
// with no scene driven, "no export was offered" says nothing about the engine,
// and this line said it anyway — a cause reported without being established
// (L-15).
console.log(
  `\n  ok    ${report.length} scene(s) drove baseline → disease → reset; `
    + `${exportsRecorded} export(s) recorded and played back`
    + (exportsOffered === 0
      ? ` (no scene offered one — ${engineName} cannot encode a canvas here)`
      : exportsRecorded < exportsOffered
        ? ` of ${exportsOffered} offered`
        : '')
);

/**
 * What the first bytes say the file is, against what its name claims.
 *
 * Found by looking: Chromium answers `isTypeSupported('video/mp4')` with
 * `true` on a build with no H.264 encoder and then writes VP9 into an MP4
 * container — a file branded `.mp4` that QuickTime will not open, and which
 * every size check in the world would have passed.
 */
function containerProblems(path, name) {
  const head = readFileSync(path).subarray(0, 64);
  const ascii = head.toString('latin1');
  const problems = [];
  const isMp4 = ascii.slice(4, 8) === 'ftyp';
  const isWebm = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  if (name.endsWith('.mp4') && !isMp4) problems.push('the file is named .mp4 and is not one');
  if (name.endsWith('.webm') && !isWebm) problems.push('the file is named .webm and is not one');
  if (isMp4 && /vp0?9|vp08/.test(ascii)) {
    problems.push('the file is an MP4 holding VP9, which most players refuse — name the codec when claiming MP4');
  }
  return problems;
}

/**
 * Plays the file back in the browser that wrote it and returns one frame.
 *
 * The file goes in as bytes rather than by URL: it has already left the page,
 * and the point is to make the decoder read exactly what landed on disk.
 *
 * `duration` is often not finite — `MediaRecorder` writes WebM without a
 * duration in the header — which is a property of the format, not a fault in
 * the recording, so it is reported rather than judged.
 */
async function decodeRecording(page, path, name) {
  const base64 = readFileSync(path).toString('base64');
  const mimeType = name.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
  return page.evaluate(
    async ({ base64: bytes, mimeType: type }) => {
      try {
        const binary = atob(bytes);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) buffer[i] = binary.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([buffer], { type }));
        const video = document.createElement('video');
        video.muted = true;
        video.src = url;
        await new Promise((resolve, reject) => {
          video.onloadeddata = resolve;
          video.onerror = () => reject(new Error('decode failed'));
          setTimeout(() => reject(new Error('the file never loaded')), 20000);
        });
        // Mid-sequence rather than the first frame: the opening of every reel
        // is a fade from black, which is exactly what a broken recording looks
        // like.
        const target = Number.isFinite(video.duration) ? video.duration / 2 : 7;
        await new Promise((resolve) => {
          video.onseeked = resolve;
          video.currentTime = target;
          setTimeout(resolve, 4000);
        });
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const seen = new Set();
        for (let i = 0; i < data.length; i += 4 * 97) {
          seen.add((data[i] >> 3) * 1024 + (data[i + 1] >> 3) * 32 + (data[i + 2] >> 3));
        }
        const frame = canvas.toDataURL('image/png');

        // How many frames are actually in it.
        //
        // Size and dimensions say nothing about motion: a fifteen-second file
        // of 38 frames decodes, plays, and is a slideshow. `requestVideoFrame`
        // counts what the decoder presents, which is the only honest measure of
        // what was recorded.
        let frames = 0;
        let lastMediaTime = 0;
        if (typeof video.requestVideoFrameCallback === 'function') {
          video.currentTime = 0;
          video.muted = true;
          const counted = new Promise((resolve) => {
            const tick = (_now, meta) => {
              frames += 1;
              lastMediaTime = meta.mediaTime;
              if (!video.ended) video.requestVideoFrameCallback(tick);
            };
            video.requestVideoFrameCallback(tick);
            video.onended = () => resolve();
            setTimeout(resolve, 30000);
          });
          await video.play().catch(() => {});
          await counted;
          video.pause();
        }
        URL.revokeObjectURL(url);
        return {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          distinctColours: seen.size,
          frames,
          fps: lastMediaTime > 0 ? Number((frames / lastMediaTime).toFixed(1)) : 0,
          frame,
        };
      } catch (error) {
        return { error: String(error?.message ?? error) };
      }
    },
    { base64, mimeType }
  );
}

/**
 * Is every control on this surface on the screen, and big enough to hit?
 *
 * Measured at a viewport the caller names, then put back. Two rules, both the
 * product's own: nothing may extend past the viewport's edges, and a button is
 * at least 44px tall. A checkbox is exempt because the row it sits in is the
 * target — `.video-consent-clause` is what a finger lands on, and that is what
 * is measured.
 *
 * `verify:ui` owns these rules everywhere else and cannot reach reel mode,
 * which is why they are also here (F-170).
 */
async function reachableAt(page, width, height, selector, what) {
  const previous = page.viewportSize();
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(700);
  const found = await page.evaluate(
    ({ root, floor }) => {
      const surface = document.querySelector(root);
      if (!surface) return ['is not on the page at all'];
      const out = [];
      const edge = surface.getBoundingClientRect();
      if (edge.left < -0.5 || edge.right > window.innerWidth + 0.5) {
        out.push(`runs from ${Math.round(edge.left)} to ${Math.round(edge.right)} across a ${window.innerWidth}px screen`);
      }
      for (const node of surface.querySelectorAll('button, a[href], .video-consent-clause')) {
        const box = node.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        const name = (node.textContent || node.getAttribute('aria-label') || node.className).trim().slice(0, 28);
        if (box.left < -0.5 || box.right > window.innerWidth + 0.5) {
          out.push(`"${name}" is off the side (${Math.round(box.left)}–${Math.round(box.right)} of ${window.innerWidth})`);
        }
        // A panel that scrolls is allowed to be taller than the screen; its
        // controls are reached by scrolling, so only what cannot scroll counts.
        if ((box.top < -0.5 || box.bottom > window.innerHeight + 0.5) && !node.closest('.video-consent-panel')) {
          out.push(`"${name}" is off the top or bottom (${Math.round(box.top)}–${Math.round(box.bottom)} of ${window.innerHeight})`);
        }
        if (node.tagName === 'BUTTON' && box.height > 0 && box.height < floor) {
          out.push(`"${name}" is ${Math.round(box.height)}px tall, under the ${floor}px floor`);
        }
      }
      return out;
    },
    { root: selector, floor: 44 }
  );
  if (previous) await page.setViewportSize(previous);
  await page.waitForTimeout(500);
  return found.map((problem) => `${what} at ${width}px: ${problem}`);
}
