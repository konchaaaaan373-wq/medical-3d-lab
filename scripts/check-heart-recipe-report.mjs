#!/usr/bin/env node
/**
 * Drives the heart scene in a real browser and checks that the fixed view's
 * measurement report retires exactly when it should (B4-N2).
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:recipe-report
 *
 * ## Why this is a script and not a unit test
 *
 * `tests/anatomy-recipe-report.test.js` drives the real panel against a fake
 * DOM and checks each call site in `App.js`, which is where most of this is
 * pinned. What it cannot see is the wiring in between: whether the button a
 * reader actually presses reaches `zoomBy`, whether a keypress reaches it,
 * whether OrbitControls emits `start` for a drag on the real canvas. Those are
 * the paths that were missing when B4-N2 was raised, and a test with a fake DOM
 * passed the whole time they were missing.
 *
 * ## What the report claims, and why it has to retire
 *
 * The report under the fixed views describes **one moment**: this recipe, from
 * that viewpoint, with that display. It has to survive the recipe's own camera
 * move — the recipe is turning to the viewpoint it is about to measure from —
 * and retire the instant the reader changes the view, because from a different
 * viewpoint the number is simply wrong. So both halves are checked here, and
 * the first half is as much a failure as the second.
 *
 * ## This is a check, not a photo shoot
 *
 * Every step asserts on the DOM and on camera state. `--shots` is optional and
 * off by default: an image records what a run looked like, it does not
 * establish that the report was hidden. A selector that matches nothing is a
 * failure, never a skip — the earlier untracked version of this driver fell
 * back silently when its zoom-button selector missed, which would have reported
 * a path as exercised that was never pressed.
 *
 * Exit codes are three, because "the check failed" and "the check did not run"
 * are different answers:
 *
 *   0  every step behaved
 *   1  a step did not
 *   2  it could not run at all — no build, no Playwright, no candidate assets
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --shots <dir>   also write screenshots here (default: none)
 *   --log <file>    machine-readable result (default: docs/screenshots/b4-next/recipe-report-run.json)
 *   --headed        show the browser
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { chromiumExecutable } from './lib/browser.mjs';
import { DEV_ASSETS, DEV_ASSET_ROOT } from '../src/catalog/devAssets.js';

const EXIT = { OK: 0, FAILED: 1, CANNOT_RUN: 2 };

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const shotsDir = value('--shots');
const logFile = value('--log', 'docs/screenshots/b4-next/recipe-report-run.json');

const cannotRun = (message) => {
  console.error(`CANNOT RUN — ${message}`);
  process.exit(EXIT.CANNOT_RUN);
};

if (!existsSync(join(distDir, 'index.html'))) {
  cannotRun(`no build at "${distDir}". Run: VITE_ALLOW_PREVIEW=1 npm run build`);
}

// The heart scene is not published, so it is only in a preview build, and it
// reads candidate GLBs that are git-ignored and fetched separately. Both are
// "could not run", not "failed".
const missingAssets = DEV_ASSETS
  .map((asset) => join(DEV_ASSET_ROOT, asset.file))
  .filter((path) => !existsSync(path));
if (missingAssets.length) {
  cannotRun(`candidate assets are not fetched: ${missingAssets.join(', ')}. Run: npm run assets:dev`);
}

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
  cannotRun(
    'Playwright is not installed.\n' +
      '  npm i --no-save playwright\n' +
      '  npx playwright install --with-deps chromium\n' +
      'It is deliberately not a dependency: `npm test` stays a plain `node --test` run.'
  );
}

// --- serving the build -----------------------------------------------------
// Same shape as check-anatomy-interaction.mjs, with one addition: `/dev-assets/`
// is served from the repository root, because the candidate GLBs are not copied
// into a build and must never be.

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
};

const distRoot = resolve(distDir);
const repoRoot = resolve('.');

function fileFor(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const root = decoded.startsWith(`/${DEV_ASSET_ROOT}/`) ? repoRoot : distRoot;
  const candidate = resolve(root, `.${normalize(decoded)}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return existsSync(candidate) ? candidate : null;
}

const requested = [];
const server = createServer((request, response) => {
  const url = request.url ?? '/';
  const file = fileFor(url);
  requested.push({ url, served: Boolean(file) });
  const send = file ?? join(distRoot, 'index.html');
  response.writeHead(file ? 200 : 404, {
    'content-type': MIME[extname(send)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(send).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

// --- the run ---------------------------------------------------------------

const steps = [];
const failures = [];

/** An assertion that is recorded whether it holds or not. */
function expect(step, ok, detail) {
  steps.push({ step, ok: Boolean(ok), detail });
  if (!ok) failures.push(`${step}: ${detail}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({
  executablePath: chromiumExecutable(chromium),
  headless: !flag('--headed'),
});
let exitCode = EXIT.OK;

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto(`${origin}/?preview=1#/heart-anatomy`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__app?.scene?.getAnatomyStatus?.().state === 'ready',
    null,
    { timeout: 180000 }
  );

  // The consent card, if this build shows one, sits over the console.
  const consent = page.locator('.consent-button').first();
  if (await consent.isVisible().catch(() => false)) {
    await consent.click({ noWaitAfter: true });
    await page.waitForTimeout(500);
  }

  /**
   * Click exactly one visible element, or fail.
   *
   * The point of the whole check is which reader paths reach the invalidation,
   * so a selector that matches nothing has to stop the run. Falling through to
   * "something like it" is how a path gets reported as exercised without ever
   * being pressed.
   */
  async function press(what, selector) {
    const found = page.locator(selector);
    const count = await found.count();
    if (count !== 1) {
      throw new Error(`${what}: expected exactly one "${selector}", found ${count}`);
    }
    if (!(await found.isVisible())) throw new Error(`${what}: "${selector}" is not visible`);
    await found.click({ noWaitAfter: true });
  }

  const reportState = () => page.evaluate(() => {
    const el = document.querySelector('.anatomy-recipe-status');
    if (!el) return { present: false, shown: false, text: '' };
    return {
      present: true,
      shown: !el.hidden && el.textContent.trim().length > 0,
      text: el.textContent.replace(/\s+/g, ' ').trim(),
    };
  });
  const camera = () => page.evaluate(() => {
    const p = window.__app.viewer.camera.position;
    return [Number(p.x.toFixed(4)), Number(p.y.toFixed(4)), Number(p.z.toFixed(4))];
  });
  const moved = (a, b) => a.some((n, i) => Math.abs(n - b[i]) > 1e-3);

  /**
   * Run the recipe from the same starting display every time.
   *
   * Without the reset, the second run finds the chambers already hidden and
   * reports "Hid 0", so the measurements would differ for a reason that has
   * nothing to do with what is being tested. This is setup, not the path under
   * test, so it goes through the scene rather than through the UI.
   */
  const runRecipe = async () => {
    await page.evaluate(() => window.__app.scene.showAllHiddenStructures?.());
    await page.waitForTimeout(400);
    await press('open the Display tab', '#anatomy-tab-display');
    await page.waitForTimeout(300);
    await press('run the recipe', '.anatomy-recipe[data-recipe="inside-the-chambers"]');
    await page.waitForTimeout(1600);
  };

  /**
   * One reader gesture: run the recipe, confirm the report is there, do the
   * thing, confirm it is gone. Written as a pair because "it is gone" only
   * means something if it was there first.
   */
  async function retiredBy(name, act) {
    await runRecipe();
    const before = await reportState();
    expect(`${name}: the report is present first`, before.shown, before.text.slice(0, 90));
    await act();
    await page.waitForTimeout(900);
    const after = await reportState();
    expect(`${name}: retires the report`, !after.shown, after.shown ? `still shows "${after.text}"` : 'cleared');
    return before;
  }

  // --- the half that must NOT retire ---------------------------------------
  // The recipe turns to the viewpoint it is about to measure from. If its own
  // camera move cleared the report, the report could never be shown at all.
  const parked = await camera();
  await runRecipe();
  const afterRecipe = await reportState();
  const posed = await camera();
  expect('the recipe writes a report', afterRecipe.shown, afterRecipe.text.slice(0, 110));
  expect('the recipe moves the camera', moved(parked, posed), `${JSON.stringify(parked)} -> ${JSON.stringify(posed)}`);
  expect(
    "the recipe's own camera move does not retire it",
    afterRecipe.shown,
    'still shown after the tween it started'
  );
  const firstMeasurement = afterRecipe.text;
  if (shotsDir) {
    mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: join(shotsDir, '01-report-after-recipe-1280.png') });
  }

  // --- the half that must retire -------------------------------------------

  // 1. The zoom-in button, addressed by `data-control` rather than by its
  //    label, its title or its position in the row — a scene retitles these
  //    ("Zoom in — fill the frame with the chamber (+)") and the row's order
  //    depends on which controls the scene asked for.
  await retiredBy('the zoom-in button', () => press('zoom in', 'button.btn[data-control="zoomIn"]'));
  if (shotsDir) await page.screenshot({ path: join(shotsDir, '02-report-cleared-by-zoom-1280.png') });

  // 2. The '+' key, which shares zoomBy with the button but arrives by a
  //    different route and was missed by the same omission.
  //
  //    Deliberately no click on the canvas first: a pointer press on the canvas
  //    is itself an OrbitControls `start`, which retires the report — so a
  //    check that clicked to take focus would pass whether or not the key path
  //    works. Blurring is enough to get the key to the window handler.
  await retiredBy('the "+" key', async () => {
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('+');
  });

  // 3. "Go to it". The structure is selected BEFORE the recipe runs, so that
  //    the selection's own repaint is not what clears the report and the focus
  //    path is the thing being measured. An earlier run had these the other way
  //    round and proved nothing about focus.
  await page.evaluate(() => window.__app.scene.selectStructure('VH_M_aortic_valve'));
  await page.waitForTimeout(600);
  const beforeFocus = await camera();
  await retiredBy('"Go to it"', () => press('go to it', '.anatomy-panel-action[data-action="focus"]:visible'));
  const afterFocus = await camera();
  expect('"Go to it" moved the camera', moved(beforeFocus, afterFocus), `${JSON.stringify(beforeFocus)} -> ${JSON.stringify(afterFocus)}`);

  // 4. A named viewpoint the reader presses. `byReader` defaults true here,
  //    which is the difference from the recipe applying the same view itself.
  await retiredBy('a viewpoint button', async () => {
    const views = page.locator('.inspection-view');
    const count = await views.count();
    if (count < 2) throw new Error(`a viewpoint button: expected at least two, found ${count}`);
    await views.nth(1).click({ noWaitAfter: true });
  });

  // 5. A real drag on the canvas — the OrbitControls `start` path, which is the
  //    only one of these that does not go through App's own functions.
  await retiredBy('a drag on the canvas', async () => {
    await page.mouse.move(430, 420);
    await page.mouse.down();
    await page.mouse.move(520, 450, { steps: 8 });
    await page.mouse.up();
  });

  // 6. Re-running measures again and says the same thing, which is what makes
  //    the retirement a retirement rather than a one-way switch.
  await runRecipe();
  const again = await reportState();
  expect('re-running restores the report', again.shown, again.text.slice(0, 110));
  expect(
    're-running measures the same thing',
    again.text === firstMeasurement,
    again.text === firstMeasurement ? 'identical' : `"${firstMeasurement}" -> "${again.text}"`
  );

  expect('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | ') || 'none');

  const notServed = requested.filter((r) => !r.served).map((r) => r.url);
  const result = {
    scope: 'implementer\'s own verification of B4-N2 in a real browser; not a third party\'s, and not a medical review',
    route: '/?preview=1#/heart-anatomy',
    viewport: { width: 1280, height: 800 },
    origin: 'ephemeral local static server over the local build; no production, preview deploy or verify:live',
    steps,
    failures,
    pageErrors,
    // Reported in full and classified rather than filtered away.
    consoleErrors: {
      total: consoleErrors.length,
      messages: consoleErrors,
      unservedRequests: notServed,
      note: 'requests the local static server had no file for are listed above; they are the shell\'s own optional fetches, not assertions',
    },
    ranAt: new Date().toISOString(),
  };
  mkdirSync(dirname(logFile), { recursive: true });
  writeFileSync(logFile, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nlog: ${logFile}`);

  exitCode = failures.length ? EXIT.FAILED : EXIT.OK;
  console.log(
    failures.length
      ? `\nFAIL — ${failures.length} of ${steps.length} steps did not behave`
      : `\nOK — ${steps.length} steps, all as specified`
  );
} catch (error) {
  // A selector that matched nothing, a timeout, a crash: the check ran and did
  // not pass. That is a failure, and it is not the same as "could not run".
  console.error(`\nFAIL — ${error?.message ?? error}`);
  exitCode = EXIT.FAILED;
} finally {
  await browser.close();
  server.close();
}

process.exit(exitCode);
