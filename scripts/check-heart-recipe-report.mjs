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
 * ## Viewports, and pressing what a reader can actually press
 *
 * `--viewport` takes one or more `WxH`. Below the panel's own breakpoint
 * (`max-width: 820px` or `max-height: 560px`) the tabbed body stops being
 * docked and becomes a sheet behind a **Parts** button, so the same reader
 * gesture is a different sequence of real clicks. The check follows that
 * sequence rather than reaching past it: a control that is off screen or
 * covered is a control the reader cannot use, and clicking it programmatically
 * would report a path as working when it is not reachable.
 *
 * For the same reason the canvas drag does not use fixed coordinates. It asks
 * the page which element is topmost at a candidate point and only drags where
 * that is the canvas, so a drag can never land on a panel and be counted.
 *
 * Options:
 *   --dist <dir>       built site to serve (default: dist)
 *   --viewport <WxH>   repeatable; default 1280x800
 *   --shots <dir>      also write screenshots here (default: none)
 *   --log <file>       machine-readable result (default: docs/screenshots/b4-next/recipe-report-run.json)
 *   --headed           show the browser
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

/** Every `--viewport WxH`, in order. Defaults to the desktop size alone. */
const viewports = argv
  .flatMap((arg, at) => (arg === '--viewport' && argv[at + 1] ? [argv[at + 1]] : []))
  .map((spec) => {
    const match = /^(\d+)x(\d+)$/.exec(spec);
    if (!match) {
      console.error(`--viewport wants WxH, got "${spec}"`);
      process.exit(2);
    }
    return { width: Number(match[1]), height: Number(match[2]), label: spec };
  });
if (!viewports.length) viewports.push({ width: 1280, height: 800, label: '1280x800' });

const cannotRun = (message) => {
  console.error(`CANNOT RUN — ${message}`);
  process.exit(EXIT.CANNOT_RUN);
};

if (!existsSync(join(distDir, 'index.html'))) {
  cannotRun(`no build at "${distDir}". Run: VITE_ALLOW_PREVIEW=1 npm run build`);
}

/**
 * A production build does not contain the heart scene, and must not.
 *
 * The gate is shut, so `npm run build` leaves the scene's chunk out entirely —
 * which is the behaviour `verify:site` exists to confirm. Driving that build
 * gives a page that never becomes ready, and without this check the run spent
 * three minutes timing out and called it a failure. **It is not a failure, it
 * is the wrong build**, and running `npm run build` between two runs of this
 * check is an easy way to get there.
 */
const builtScenes = readdirSync(join(distDir, 'assets')).join(' ');
if (!/heartAnatomy/.test(builtScenes)) {
  cannotRun(
    `the build at "${distDir}" has no heart scene in it, which is what a production build should look like ` +
      'while the publication gate is shut.\n' +
      '  VITE_ALLOW_PREVIEW=1 npm run build'
  );
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

/**
 * What the run was against, recorded so a log cannot be read as being about a
 * different tree later. `dirty` matters as much as the SHA: a run over a
 * modified working tree is not a run of that commit.
 */
const gitOrNull = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};
const headSha = gitOrNull('rev-parse', 'HEAD');
const worktreeDirty = gitOrNull('status', '--porcelain') !== '';
/** The pinned identity of each candidate asset, quoted rather than re-derived. */
const assetPins = DEV_ASSETS.map((asset) => ({
  id: asset.id,
  file: asset.file,
  bytes: asset.bytes ?? null,
  sha256: asset.sha256 ?? null,
}));

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
/** Blocked URL substrings, used to make a load fail on purpose. */
const blocked = new Set();

/** An assertion that is recorded whether it holds or not. */
function expect(viewport, step, ok, detail) {
  const label = `[${viewport}] ${step}`;
  steps.push({ viewport, step, ok: Boolean(ok), detail });
  if (!ok) failures.push(`${label}: ${detail}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/**
 * One browser per viewport, not one browser for the run.
 *
 * Three WebGL contexts and three copies of a 47 MB model in one Chromium, in a
 * container, made the later viewports slow enough that the panel was still
 * being painted over the console when the next click went out — the check
 * reported an occlusion that a solo run of the same viewport never sees. That
 * is the harness running out of room, not the product misbehaving, so each
 * viewport gets a fresh process and the run stops measuring its own pressure.
 */
const withBrowser = async (run) => {
  const browser = await chromium.launch({
    executablePath: chromiumExecutable(chromium),
    headless: !flag('--headed'),
  });
  try {
    return await run(browser);
  } finally {
    await browser.close();
  }
};
let exitCode = EXIT.OK;
const pageErrors = [];
const consoleErrors = [];

/**
 * One page, one viewport, driven through the whole set.
 *
 * A fresh context per viewport rather than a resize: the panel picks its layout
 * from a media query at construction and on change, and the point of running at
 * 844x390 and 375x667 is to exercise the layout a reader on that device
 * actually gets, from load.
 */
async function runViewport({ width, height, label }) {
  return withBrowser(async (browser) => {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(`[${label}] ${error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`[${label}] ${message.text()}`);
  });
  // Used by the failure phase to make one request fail on purpose.
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if ([...blocked].some((fragment) => url.includes(fragment))) return route.abort('failed');
    return route.continue();
  });

  const say = (step, ok, detail) => expect(label, step, ok, detail);

  /**
   * Wait for the scene to come up, and tell the two failures apart.
   *
   * The heart scene loads a 47 MB candidate and a second vasculature file into
   * a software renderer. Running several viewports back to back in a container
   * has run out of room here: the third scene never reached `ready` inside
   * three minutes, and a plain timeout reported that as the product failing.
   *
   * **It is not.** A scene that never finishes loading in the harness means the
   * check could not run, which is what exit 2 is for. Every viewport passes on
   * its own; the sequence is what exhausts the machine.
   */
  const ready = async (timeout = 180000) => {
    try {
      await page.waitForFunction(
        () => window.__app?.scene?.getAnatomyStatus?.().state === 'ready',
        null,
        { timeout }
      );
    } catch {
      const state = await page
        .evaluate(() => window.__app?.scene?.getAnatomyStatus?.().state ?? 'no app')
        .catch(() => 'unreadable');
      const stuck = new Error(
        `[${label}] the scene never became ready within ${Math.round(timeout / 1000)}s (state: ${state}). ` +
          'That is this harness running out of room, not a finding about the product — ' +
          'each viewport passes when run on its own. Run one --viewport at a time.'
      );
      stuck.cannotRun = true;
      throw stuck;
    }
  };

  /**
   * Answer the usage-data card, the way a reader has to before anything else.
   *
   * It is a declared transient overlay (`TRANSIENT_OVERLAYS` in
   * `src/app/viewports.js`): it removes itself once answered, and until then it
   * legitimately covers things. It is also mounted *after* the scene reports
   * ready, so answering once at load missed it on the slower small-viewport
   * runs and it then intercepted a click later on. Answered whenever it is
   * there, and never worked around.
   */
  const dismissConsent = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const banner = page.locator('.consent-banner');
      if (!(await banner.count())) return;
      const button = banner.locator('.consent-button').first();
      if (!(await button.isVisible().catch(() => false))) {
        await page.waitForTimeout(400);
        continue;
      }
      // **Only if a reader could actually hit it.** `isVisible()` is true for a
      // button that is CSS-visible and completely covered, and with the parts
      // sheet open the card sits behind that modal — so this spent thirty
      // seconds clicking at something underneath the panel. The card is
      // answered at the start, when nothing is over it; anywhere else this is
      // a defensive call and skipping is the right answer, not a failure.
      const reachable = await button.evaluate((node) => {
        const box = node.getBoundingClientRect();
        if (!box.width || !box.height) return false;
        const top = document.elementFromPoint(
          Math.round(box.left + box.width / 2),
          Math.round(box.top + box.height / 2)
        );
        return Boolean(top && (top === node || node.contains(top) || top.contains(node)));
      }).catch(() => false);
      if (!reachable) return;
      await button.click({ noWaitAfter: true });
      await page.waitForTimeout(400);
      if (!(await page.locator('.consent-banner').count())) return;
      await page.waitForTimeout(600);
    }
  };

  await page.goto(`${origin}/?preview=1#/heart-anatomy`, { waitUntil: 'load' });
  await ready();
  await dismissConsent();

  /**
   * Click exactly one element that a reader could click, or fail.
   *
   * `count !== 1` and "not visible" both stop the run. The point of the check
   * is which reader paths reach the invalidation, so falling through to
   * something similar — or reaching past the DOM with a programmatic click — is
   * how a path gets reported as exercised without ever being pressed.
   */
  /**
   * Click a located element once it is genuinely the topmost thing at its own
   * centre — the same question for every control, however it was located.
   *
   * `press` names a control by selector; this takes a locator, so the ones
   * reached by position (`nth(1)`) or by being first go through the same gate.
   * They used to call `.click()` directly, and those were the clicks that timed
   * out when Work's sheet transition was still painting over them.
   */
  async function pressLocator(what, locator) {
    if (!(await locator.isVisible())) throw new Error(`${what}: not visible`);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const reachable = async () => locator.evaluate((node) => {
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height) return false;
      const top = document.elementFromPoint(
        Math.round(box.left + box.width / 2),
        Math.round(box.top + box.height / 2)
      );
      return Boolean(top && (top === node || node.contains(top) || top.contains(node)));
    });
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await reachable()) break;
      await page.waitForTimeout(150);
    }
    if (!(await reachable())) {
      const covering = await locator.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const top = document.elementFromPoint(
          Math.round(box.left + box.width / 2),
          Math.round(box.top + box.height / 2)
        );
        return top ? `${top.tagName}.${top.className}`.slice(0, 70) : 'nothing — its centre is outside the viewport';
      });
      throw new Error(`${what}: stayed covered by ${covering}`);
    }
    await locator.click({ noWaitAfter: true });
  }

  async function press(what, selector) {
    const found = page.locator(selector);
    const count = await found.count();
    if (count !== 1) throw new Error(`${what}: expected exactly one "${selector}", found ${count}`);
    if (!(await found.isVisible())) throw new Error(`${what}: "${selector}" is not visible`);

    // Bring it into view first, the way a reader scrolls to it and the way
    // Playwright's own click does. `elementFromPoint` answers null for a point
    // outside the viewport, so without this the check below reads "covered by
    // nothing" for a control that is merely further down the sheet.
    await found.scrollIntoViewIfNeeded().catch(() => {});

    // Wait until the control is really the topmost thing at its own centre.
    //
    // Work's presentation adapter transitions the sheet, so `data-sheet` flips
    // to "closed" while the panel is still painted over the console: a click
    // sent then lands on the panel. Waiting for the *state* was not enough and
    // waiting a fixed number of milliseconds was worse — it passed on an idle
    // machine and failed on a busy one. This waits for the thing that actually
    // matters, and it is the same question the check asks everywhere else: can
    // a reader press this right now?
    const clear = await page
      .waitForFunction(
        (css) => {
          const target = document.querySelector(css);
          if (!target) return false;
          const box = target.getBoundingClientRect();
          if (!box.width || !box.height) return false;
          const top = document.elementFromPoint(
            Math.round(box.left + box.width / 2),
            Math.round(box.top + box.height / 2)
          );
          return Boolean(top && (top === target || target.contains(top) || top.contains(target)));
        },
        selector.replace(/:visible$/, ''),
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!clear) {
      const covering = await page.evaluate((css) => {
        const target = document.querySelector(css);
        const box = target?.getBoundingClientRect();
        if (!box) return 'nothing drawn';
        const top = document.elementFromPoint(
          Math.round(box.left + box.width / 2),
          Math.round(box.top + box.height / 2)
        );
        if (!top) return 'nothing — its centre is outside the viewport';
        return `${top.tagName}.${top.className}`.slice(0, 70);
      }, selector.replace(/:visible$/, ''));
      throw new Error(`${what}: "${selector}" stayed covered by ${covering}`);
    }
    await found.click({ noWaitAfter: true });
  }

  /** Which layout the panel decided on, read from the panel itself. */
  const layout = () => page.evaluate(
    () => document.querySelector('.anatomy-panel')?.dataset.layout ?? 'unknown'
  );

  /**
   * Open the panel body the way a reader on this device has to.
   *
   * Docked, it is already there. As a sheet it is behind the Parts button, and
   * that button is the only way in — so the check presses it rather than
   * showing the sheet itself, which would pass whether or not the button works.
   */
  async function openPanelBody() {
    if ((await layout()) !== 'sheet') return 'docked';
    const open = page.locator('.anatomy-panel[data-sheet="closed"] .anatomy-panel-open');
    if (await open.count()) {
      await pressLocator('the Parts button', open.first());
      await page.waitForFunction(
        () => document.querySelector('.anatomy-panel')?.dataset.sheet === 'open',
        null,
        { timeout: 15000 }
      ).catch(() => {});
      await page.waitForTimeout(200);
    }
    const state = await page.evaluate(
      () => document.querySelector('.anatomy-panel')?.dataset.sheet ?? 'unknown'
    );
    if (state !== 'open') throw new Error(`the Parts button did not open the sheet (data-sheet=${state})`);
    return 'sheet';
  }

  async function closePanelBody() {
    if ((await layout()) !== 'sheet') return;
    const close = page.locator('.anatomy-panel-sheet-head button.anatomy-panel-close');
    if (await close.count()) await pressLocator('the sheet close button', close.first());
    else await page.keyboard.press('Escape');
    // Wait for the sheet to actually be shut rather than for a fixed number of
    // milliseconds. Work's presentation adapter transitions it, so a fixed
    // 400ms was long enough on an idle machine and not on a busy one — the
    // panel was still over the console when the next click went out, and the
    // check reported an occlusion that a reader would never see.
    await page.waitForFunction(
      () => document.querySelector('.anatomy-panel')?.dataset.sheet === 'closed',
      null,
      { timeout: 15000 }
    );
    await page.waitForTimeout(200);
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
   * A point where the canvas is really the top element.
   *
   * The old driver dragged at a fixed (430, 420). At 375x667 that is inside the
   * console, and at 844x390 it can be under the panel — so the drag would have
   * been counted while landing on something else entirely. This asks the page
   * what is topmost and only returns a point that is the canvas.
   */
  const canvasPoint = () => page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    for (const fy of [0.5, 0.35, 0.65, 0.25, 0.75]) {
      for (const fx of [0.5, 0.35, 0.65, 0.25, 0.75]) {
        const x = Math.round(box.left + box.width * fx);
        const y = Math.round(box.top + box.height * fy);
        if (x < 2 || y < 2 || x > window.innerWidth - 2 || y > window.innerHeight - 2) continue;
        const top = document.elementFromPoint(x, y);
        if (top === canvas) return { x, y };
      }
    }
    return null;
  });

  /**
   * Run the recipe from the same starting display every time.
   *
   * Without the reset, the second run finds the chambers already hidden and
   * reports "Hid 0", so measurements would differ for a reason unrelated to
   * what is being tested. That reset is setup, so it goes through the scene;
   * everything the check is actually about goes through the UI.
   */
  const runRecipe = async () => {
    // A reader answers the usage-data card before they get to do anything, and
    // it is mounted after the scene reports ready — so answering it here rather
    // than only at load keeps the run faithful, and keeps it out of any
    // screenshot taken afterwards.
    await dismissConsent();
    await page.evaluate(() => window.__app.scene.showAllHiddenStructures?.());
    await page.waitForTimeout(300);
    await openPanelBody();
    await press('open the Display tab', '#anatomy-tab-display');
    await page.waitForTimeout(300);
    await press('run the recipe', '.anatomy-recipe[data-recipe="inside-the-chambers"]');
    await page.waitForTimeout(1600);
  };

  /**
   * One reader gesture: run the recipe, confirm the report is there, do the
   * thing, confirm it is gone. A pair, because "it is gone" means nothing
   * unless it was there first.
   */
  async function retiredBy(name, act) {
    await runRecipe();
    const before = await reportState();
    say(`${name}: the report is present first`, before.shown, before.text.slice(0, 80));
    await act();
    await page.waitForTimeout(900);
    const after = await reportState();
    say(`${name}: retires the report`, !after.shown, after.shown ? `still shows "${after.text}"` : 'cleared');
    return before;
  }

  say('the panel chose a layout for this viewport', ['docked', 'sheet'].includes(await layout()), await layout());

  // --- the half that must NOT retire ---------------------------------------
  // The recipe turns to the viewpoint it is about to measure from. If its own
  // camera move cleared the report, the report could never be shown at all.
  const parked = await camera();
  await runRecipe();
  const afterRecipe = await reportState();
  const posed = await camera();
  say('the recipe writes a report', afterRecipe.shown, afterRecipe.text.slice(0, 100));
  say('the recipe moves the camera', moved(parked, posed), `${JSON.stringify(parked)} -> ${JSON.stringify(posed)}`);
  say("the recipe's own camera move does not retire it", afterRecipe.shown, 'still shown after the tween it started');
  const firstMeasurement = afterRecipe.text;
  if (shotsDir) {
    mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: join(shotsDir, `report-after-recipe-${label}.png`) });
  }

  // --- the half that must retire -------------------------------------------

  // 1. The zoom-in button, addressed by `data-control` rather than by its label,
  //    its title or its position — a scene retitles these ("Zoom in — fill the
  //    frame with the chamber (+)") and the row's order depends on which
  //    controls the scene asked for.
  await retiredBy('the zoom-in button', async () => {
    await closePanelBody();
    await press('zoom in', 'button.btn[data-control="zoomIn"]');
  });
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `report-cleared-by-zoom-${label}.png`) });

  // 2. The '+' key, which shares zoomBy with the button but arrives by a
  //    different route and was missed by the same omission.
  //
  //    Deliberately no click on the canvas first: a pointer press on the canvas
  //    is itself an OrbitControls `start`, which retires the report — so a
  //    check that clicked to take focus would pass whether or not the key path
  //    works. Blurring is enough to reach the window handler.
  await retiredBy('the "+" key', async () => {
    await closePanelBody();
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('+');
  });

  // 3. "Go to it". The structure is selected BEFORE the recipe runs, so the
  //    selection's own repaint is not what clears the report and the focus path
  //    is the thing being measured. An earlier run had these the other way round
  //    and proved nothing about focus.
  await page.evaluate(() => window.__app.scene.selectStructure('VH_M_aortic_valve'));
  await page.waitForTimeout(500);
  const beforeFocus = await camera();
  await retiredBy('"Go to it"', async () => {
    await openPanelBody();
    await press('go to it', '.anatomy-panel-action[data-action="focus"]:visible');
  });
  const afterFocus = await camera();
  say('"Go to it" moved the camera', moved(beforeFocus, afterFocus), `${JSON.stringify(beforeFocus)} -> ${JSON.stringify(afterFocus)}`);

  // 4. A named viewpoint the reader presses. `byReader` defaults true here,
  //    which is the difference from the recipe applying the same view itself.
  await retiredBy('a viewpoint button', async () => {
    await openPanelBody();
    const views = page.locator('.inspection-view:visible');
    const count = await views.count();
    if (count < 2) throw new Error(`a viewpoint button: expected at least two visible, found ${count}`);
    await pressLocator('a viewpoint button', views.nth(1));
  });

  // 5. A real drag on the canvas — the OrbitControls `start` path, and the only
  //    one of these that does not go through App's own functions.
  await retiredBy('a drag on the canvas', async () => {
    await closePanelBody();
    const at = await canvasPoint();
    if (!at) throw new Error('no point on this viewport where the canvas is the topmost element');
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 60, at.y + 30, { steps: 8 });
    await page.mouse.up();
  });

  // 6. Re-running measures again and says the same thing, which is what makes
  //    the retirement a retirement rather than a one-way switch.
  await runRecipe();
  const again = await reportState();
  say('re-running restores the report', again.shown, again.text.slice(0, 100));
  say(
    're-running measures the same thing',
    again.text === firstMeasurement,
    again.text === firstMeasurement ? 'identical' : `"${firstMeasurement}" -> "${again.text}"`
  );

  // --- the journey: open, explore, read about it, come back ----------------

  await closePanelBody();
  await openPanelBody();
  await press('open the Parts tab', '#anatomy-tab-parts');
  await page.waitForTimeout(300);
  const leaf = page.locator('.anatomy-tree-leaf:visible').first();
  const leafCount = await leaf.count();
  if (!leafCount) throw new Error('no selectable structure is reachable in the parts list');
  await pressLocator('a row in the parts list', leaf);
  await page.waitForTimeout(600);
  const selection = await page.evaluate(() => window.__app.scene.getAnatomySelection()?.id ?? null);
  say('exploring: picking a row in the list selects a structure', Boolean(selection), selection ?? 'nothing selected');

  // "Model scope & sources" is the information surface: what the model answers,
  // what it does not represent, where the numbers came from.
  //
  // **The parts sheet has to be shut first, and that is the product being
  // right.** As a sheet the panel is a modal over the whole screen, so a reader
  // cannot reach anything behind it — including this panel — until they close
  // it. An earlier version of this check reached for the toggle with the sheet
  // still open and timed out with the canvas intercepting the click, which was
  // this script skipping a step of the reader's path, not a defect in the app.
  await closePanelBody();
  await dismissConsent();
  const scopeToggle = page.locator('.scope-toggle');
  const hasScope = (await scopeToggle.count()) === 1;
  say('information: the model scope panel is present', hasScope, hasScope ? 'one toggle' : 'not found');
  if (hasScope) {
    const reachable = await scopeToggle.isVisible();
    say('information: and a reader can reach it at this size', reachable, reachable ? 'visible' : 'present but not visible');
    if (reachable) {
      await pressLocator('the model scope toggle', scopeToggle);
      await page.waitForTimeout(300);
      const opened = await page.evaluate(() => {
        const body = document.querySelector('.model-scope .scope-body');
        return { open: body ? !body.hidden : false, text: (body?.textContent ?? '').replace(/\s+/g, ' ').trim().length };
      });
      say('information: it opens with content', opened.open && opened.text > 40, `${opened.text} characters`);
      await pressLocator('the model scope toggle again', scopeToggle);
      await page.waitForTimeout(300);
      const closed = await page.evaluate(() => document.querySelector('.model-scope .scope-body')?.hidden === true);
      say('back: it closes again', closed, closed ? 'closed' : 'still open');
    }
  }

  // Coming back must leave the observation as it was: the same structure still
  // selected, and the model still on screen.
  const stillSelected = await page.evaluate(() => window.__app.scene.getAnatomySelection()?.id ?? null);
  say('back: the selection survived the detour', stillSelected === selection, `${selection} -> ${stillSelected}`);
  const stillReady = await page.evaluate(() => window.__app.scene.getAnatomyStatus().state);
  say('back: the model is still loaded', stillReady === 'ready', stillReady);

  // And the reader can still work: the recipe runs again after all of that.
  await runRecipe();
  const afterJourney = await reportState();
  say('back: the fixed view still runs and measures', afterJourney.shown, afterJourney.text.slice(0, 100));

  await context.close();
  });
}

/**
 * The failure path, and what recovering from it actually takes today.
 *
 * The heart's candidate GLB is aborted, so the scene takes the branch it has
 * for a candidate that is not fetched. This is driven rather than assumed,
 * because what the product does here is a question about the product, not about
 * this script.
 */
async function runFailureAndRetry({ width, height, label }) {
  return withBrowser(async (browser) => {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(`[${label} failure] ${error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`[${label} failure] ${message.text()}`);
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if ([...blocked].some((fragment) => url.includes(fragment))) return route.abort('failed');
    return route.continue();
  });
  const say = (step, ok, detail) => expect(`${label} failure`, step, ok, detail);

  blocked.add('VH_M_Heart.glb');
  await page.goto(`${origin}/?preview=1#/heart-anatomy`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__app?.scene?.getAnatomyStatus?.().state === 'error',
    null,
    { timeout: 120000 }
  ).catch(() => {});
  const consent = page.locator('.consent-button').first();
  if (await consent.isVisible().catch(() => false)) await consent.click({ noWaitAfter: true });
  await page.waitForTimeout(800);

  const failed = await page.evaluate(() => window.__app?.scene?.getAnatomyStatus?.() ?? null);
  say('a missing model reports an error state', failed?.state === 'error', failed?.state ?? 'no status');
  say('and it says what to do about it', Boolean(failed?.hint), failed?.hint ?? 'no hint');

  const shown = await page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ');
    return {
      saysSo: /could not be loaded|読み込めませんでした/.test(text),
      retryControls: document.querySelectorAll('.scene-fallback-retry, [data-action="retry"]').length,
      // What a reader must never be handed.
      leaks: /npm run|Error:|TypeError/.test(text),
    };
  });
  say('the screen says so, not just the object', shown.saysSo, shown.saysSo ? 'the failure is on screen' : 'nothing on screen says it failed');
  say(
    'a developer hint never reaches the reader',
    !shown.leaks,
    shown.leaks ? 'an npm command or a raw Error is on screen' : 'no npm command, no raw Error'
  );

  // This used to be recorded as `ok: true` whatever it found, on the grounds
  // that the failure UI was Work's design. That padded the assertion count with
  // an observation that could not fail. There is a real button now, so this is
  // an assertion — and the recovery below goes through it rather than through
  // `page.reload()`, because a check that reloads on the product's behalf
  // passes whether or not the button works.
  const retry = page.locator('.anatomy-panel-retry');
  const retryCount = await retry.count();
  say('a failed load offers exactly one retry button', retryCount === 1, `${retryCount} found`);
  if (retryCount === 1) {
    say('and a reader can see it', await retry.isVisible(), 'visible');
  }

  // Let the file through, then press what the reader would press.
  blocked.delete('VH_M_Heart.glb');
  if (retryCount === 1) await retry.click();
  else await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__app?.scene?.getAnatomyStatus?.().state === 'ready',
    null,
    { timeout: 180000 }
  );
  const recovered = await page.evaluate(() => window.__app.scene.getAnatomyStatus());
  say(
    retryCount === 1 ? 'pressing it brings the model back' : 'a manual reload recovers the model',
    recovered.state === 'ready',
    `${recovered.selectableCount} selectable structures`
  );
  const cleared = await page.evaluate(() => ({
    retry: document.querySelector('.anatomy-panel-retry')?.hidden !== false,
    status: document.querySelector('.anatomy-panel-status')?.hidden !== false,
  }));
  say('and the failure leaves no trace behind it', cleared.retry && cleared.status,
    `retry hidden ${cleared.retry}, status hidden ${cleared.status}`);
  if (shotsDir) {
    mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: join(shotsDir, `recovered-after-retry-${label}.png`) });
  }
  await context.close();
  });
}

try {
  for (const viewport of viewports) {
    console.log(`\n--- ${viewport.label} ---`);
    await runViewport(viewport);
  }
  console.log(`\n--- ${viewports[0].label}: failure and manual retry ---`);
  await runFailureAndRetry(viewports[0]);

  expect('all', 'no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | ') || 'none');

  const notServed = [...new Set(requested.filter((r) => !r.served).map((r) => r.url))];
  const result = {
    scope: "implementer's own verification in a real browser; not a third party's, and not a medical review",
    head: headSha,
    dirty: worktreeDirty,
    route: '/?preview=1#/heart-anatomy',
    build: 'VITE_ALLOW_PREVIEW=1 npm run build — the heart scene is not published, so it is only in a preview build',
    viewports: viewports.map((v) => v.label),
    origin: 'ephemeral local static server over the local build; no production, preview deploy or verify:live',
    candidateAssets: assetPins,
    steps,
    failures,
    // Two different things, kept apart: a pageerror is an uncaught exception in
    // the page, a console error is anything logged at error level.
    pageErrors,
    consoleErrors: {
      total: consoleErrors.length,
      messages: consoleErrors,
      unservedRequests: notServed,
      note: "requests the local static server had no file for; the shell's own optional fetches, not assertions",
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
      : `\nOK — ${steps.length} steps across ${viewports.length} viewport(s), all as specified`
  );
} catch (error) {
  // A selector that matched nothing, a crash, a control that stayed covered:
  // the check ran and did not pass. That is a failure. A scene that never came
  // up at all is a different answer, and `ready()` marks it.
  if (error?.cannotRun) {
    console.error(`\nCANNOT RUN — ${error.message}`);
    exitCode = EXIT.CANNOT_RUN;
  } else {
    console.error(`\nFAIL — ${error?.message ?? error}`);
    exitCode = EXIT.FAILED;
  }
} finally {
  server.close();
}

process.exit(exitCode);
