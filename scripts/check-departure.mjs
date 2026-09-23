#!/usr/bin/env node
/**
 * Drives the ways a page stops leaving.
 *
 *   npm run build
 *   npm run verify:departure
 *
 * ## Why this exists
 *
 * Changing the hash to another route reloads the page, and the browser keeps
 * painting the old document until the next one commits — so a link to `#/copd`
 * from the brain viewer used to leave the brain on screen under a COPD URL.
 * `src/app/departure.js` covers the document while it is being replaced.
 *
 * A veil that cannot come down is worse than the bug it covers, and the takedown
 * paths are the half that unit tests can only pretend to exercise. All three
 * involve a browser doing something a stand-in `window` cannot: restoring a page
 * from the back/forward cache, firing a `hashchange` for a Back press that never
 * left the document, and failing to land a reload at all. F-114 recorded them as
 * unverified; this is what closes it.
 *
 * ## What it does that a unit test cannot
 *
 * It widens the window. The gap between "reload requested" and "reload
 * committed" is tens of milliseconds locally, which is why the same-document
 * Back was never driven by hand. CDP's network emulation stretches it to
 * seconds, so the Back press lands inside it every time rather than once in
 * twenty tries.
 *
 * ## What it is not
 *
 * Chromium, headless, on a desktop machine. It is not a device pass and not a
 * second engine.
 *
 * Where the browser will not cooperate — a back/forward cache that declines to
 * engage in this configuration, say — the path is reported as not driven rather
 * than as a pass, and the run stays green. A check that can never go green is a
 * check nobody puts in CI, and that would cost the other paths their watch as
 * well; the unverified ones stay written down in `docs/follow-ups.md` instead.
 * `--strict` is for a run that means to prove all of them.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --shots <dir>    save a screenshot per step
 *   --headed         show the browser
 *   --strict         treat a path the browser would not reach as a failure
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const shotsDir = value('--shots', null);
const headed = flag('--headed');
const strict = flag('--strict');

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
    'Playwright is not installed, so nothing was driven.\n\n' +
      '  npm i --no-save playwright\n  npx playwright install --with-deps chromium\n\n' +
      'It is deliberately not a dependency: `npm test` must stay a plain `node --test` run.'
  );
}

const { base: origin, close: closeServer } = await serveDist(distDir);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * `page.evaluate`, but it gives up.
 *
 * Playwright puts no timeout on `evaluate`, and it will not run one while a
 * navigation is pending. The backstop path deliberately leaves a navigation
 * pending forever, so the plain call waits forever too — which is how this
 * check came to hang instead of reporting. Timing out is an answer here, and
 * the answer it gives is the one the caller needs: nothing could be read.
 *
 * @param {any} page
 * @param {string} script
 * @param {number} [ms]
 */
const ask = (page, script, ms = 8000) =>
  Promise.race([
    page.evaluate(script),
    sleep(ms).then(() => ({ unreadable: `the page did not answer within ${ms}ms` })),
  ]).catch((error) => ({ unreadable: String(error).slice(0, 110) }));

/** The published scene, and a route the release does not open. */
const OPEN = '#/brain-anatomy';
const LOCKED = '#/copd';

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const mark = ok === true ? 'ok   ' : ok === null ? 'skip ' : 'FAIL ';
  console.log(`  ${mark} ${name}`);
  if (detail) console.log(`         ${detail}`);
  return ok;
};

/** What the page can say about the veil, from inside it. */
const VEIL = `(() => {
  const veil = document.querySelector('.loading[data-leaving]');
  const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return {
    veil: !!veil,
    veilText: veil ? veil.innerText.replace(/\\s+/g, ' ').trim() : null,
    retry: !!(veil && veil.querySelector('.loading-retry')),
    hash: location.hash,
    route: document.documentElement.dataset.route || null,
    centre: mid ? mid.tagName : null,
    canvas: !!document.querySelector('canvas'),
  };
})()`;

const browser = await chromium.launch({
  headless: !headed,
  executablePath: chromiumExecutable(chromium),
  // The back/forward cache is what the `pageshow` takedown is for, and headless
  // Chromium does not always enter it on its own. Asked for explicitly; if it
  // still declines, the check says so rather than reporting a path it did not
  // drive.
  args: ['--enable-features=BackForwardCache,BackForwardCacheNoTimeEviction'],
});

/** A fresh page on the open scene, with the model actually up. */
async function openScene(context) {
  const page = await context.newPage();
  await page.goto(`${origin}/${OPEN}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!document.querySelector('canvas'), null, { timeout: 30_000 });
  await page.waitForTimeout(2000);
  return page;
}

const shot = async (page, name) => {
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) }).catch(() => {});
};

/**
 * The budget, and why it is not three minutes any more.
 *
 * A check that can hang is a check that stops being run, and the backstop path
 * here deliberately holds a request open — so the failure mode this guards is
 * real rather than hypothetical. That part has not changed.
 *
 * What changed is the work. This script was written with eight checks; it now
 * drives sixteen, and **two of them load a real 3D model**: "a model still gets
 * a document of its own" and the veil-naming pair. Under a software rasteriser
 * that is 54 s locally and 65 s on a GitHub runner, for one of them — a third
 * of the old budget in a single check.
 *
 * The result was a watchdog that fired *while the last check was reading*, so
 * the run reported `veil said undefined` — a made-up product defect — and then
 * timed out 90 ms later. It failed that way on CI and had already done it once
 * locally. A deadline that turns "the machine is slow" into "the veil is
 * broken" is worse than no deadline, because somebody then goes looking for
 * the veil.
 *
 * Seven minutes is not a target: a healthy run is about three. It is the
 * headroom a slow runner needs before a hang and a queue become
 * indistinguishable. The elapsed time is printed with the timeout so the next
 * person can see which it was rather than guess.
 */
const BUDGET_MS = 420_000;
const startedAt = Date.now();
const watchdog = setTimeout(() => {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.error(`\nTimed out after ${elapsed}s (budget ${BUDGET_MS / 1000}s) with the run unfinished.`);
  console.error('What had been driven:');
  for (const entry of results) console.error(`  ${entry.ok === true ? 'ok' : entry.ok === null ? 'skip' : 'FAIL'}  ${entry.name}`);
  process.exit(1);
}, BUDGET_MS);
watchdog.unref?.();

try {
  console.log(`\nDeparture — the ways a page stops leaving (${origin})\n`);

  // ---------------------------------------------------------------- covered
  // The bug itself, and the baseline the other three are takedowns of.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await openScene(context);

    // The measurement is written into `sessionStorage` by the page and read
    // back out of the *next* document, rather than returned to the driver.
    //
    // Returning it is a race the driver loses on a fast machine: the promise
    // resolves inside the page, the value then has to be serialized back, and
    // if the reload commits in that window the execution context is gone and
    // the call rejects with "Execution context was destroyed". Locally the
    // reload took long enough and this passed every time; on a CI runner it
    // failed on the first attempt. `sessionStorage` survives a same-origin
    // navigation, so the value is already safe before the document goes.
    await page.evaluate(`(() => {
      sessionStorage.removeItem('__departure');
      addEventListener('hashchange', () => {
        try { sessionStorage.setItem('__departure', JSON.stringify(${VEIL})); } catch { /* full or blocked */ }
      }, { once: true });
      // Asynchronous: this call returns before the handler above runs, so
      // nothing is waiting on the page when the reload commits.
      location.hash = '${LOCKED}';
      return true;
    })()`);

    // Wait for the destination to be *rendered*, not for the network to fall
    // quiet. The evaluate above returns before the hashchange even fires, so
    // `networkidle` resolves against the page that is still there and the read
    // lands in the middle of the reload — which is how this came to report
    // `route null` on a page that arrives correctly a moment later.
    await page
      .waitForFunction(() => document.documentElement.dataset.route === 'locked', null, { timeout: 30_000 })
      .catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, 'leaving');

    const recorded = await ask(page, `JSON.parse(sessionStorage.getItem('__departure') || 'null')`);
    const during = recorded ?? {};
    record(
      'leaving: the old model is covered before anything can be painted',
      during.veil === true && during.centre !== 'CANVAS',
      recorded === null || recorded?.unreadable
        ? 'the page never recorded what it saw at the hashchange'
        : `hash ${during.hash}, centre ${during.centre}, veil ${during.veil}`
    );

    const arrived = await ask(page, VEIL);
    record(
      'arrived: the veil is gone and the destination is what is on screen',
      arrived.veil === false && arrived.route === 'locked' && arrived.canvas === false,
      `route ${arrived.route}, canvas ${arrived.canvas}, veil ${arrived.veil}`
    );
    await context.close();
  }

  // ------------------------------------------------- same-document Back
  // The path that has no `pageshow`. The document never goes away, so the only
  // signal is another `hashchange`. The whole sequence runs inside one
  // `evaluate`: a round trip to the driver between "leave" and "read" is long
  // enough for the reload to commit, and then there is no page left to ask.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await openScene(context);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    // Widen the window the Back press has to land in. Not strictly required now
    // that nothing leaves the page mid-sequence, but a reload that commits
    // during the sequence would end it, and this makes that vanishingly rare.
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 8000,
      downloadThroughput: 20_000,
      uploadThroughput: 20_000,
    });

    const seen = await page.evaluate(`new Promise((resolve) => {
      const read = () => ${VEIL};
      const out = {};
      addEventListener('hashchange', () => {
        out.leaving = read();
        /* Back, while the reload is still in flight. A hashchange, and never a
           pageshow, because the document never went away. */
        addEventListener('hashchange', () => {
          out.back = read();
          resolve(out);
        }, { once: true });
        history.back();
      }, { once: true });
      location.hash = '${LOCKED}';
      setTimeout(() => resolve({ ...out, timedOut: true }), 10000);
    })`).catch((error) => ({ error: String(error).slice(0, 110) }));

    await shot(page, 'same-document-back');
    const leaving = seen.leaving ?? {};
    const back = seen.back ?? {};
    record(
      'same-document Back: the veil comes down without a pageshow',
      leaving.veil === true && back.veil === false && back.hash === OPEN,
      seen.error
        ? `the page went away mid-sequence: ${seen.error}`
        : seen.timedOut
          ? 'the second hashchange never arrived within 10s'
          : `covered at ${leaving.hash} (veil ${leaving.veil}) -> back at ${back.hash} (veil ${back.veil}, centre ${back.centre})`
    );
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    }).catch(() => {});
    await context.close();
  }

  // ------------------------------------------------------- the backstop
  // A reload that never lands. The veil must become a retry rather than lift:
  // revealing a model that does not match the URL after a wait is the original
  // bug on a timer, not a recovery.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await openScene(context);

    // **204 No Content**, not a hang and not a failure. This took three wrong
    // methods to arrive at, and each was wrong in its own way:
    //
    //   - `route.abort()` sends Chromium to its network-error page, which
    //     replaces the document. The veil then reads as missing because the
    //     whole page is, and the check reported the code broken.
    //   - A route left pending does keep the document alive, but Chromium
    //     defers script for a navigation in flight — `page.evaluate` will not
    //     run, and neither will `Runtime.evaluate` over CDP. The page is there
    //     and cannot be asked anything, so the check could only time out.
    //   - And a pending route that is never released hangs teardown.
    //
    // A 204 answers the navigation by abandoning it: the browser keeps the
    // document it has, nothing is deferred, and the page stays fully
    // scriptable. Which is precisely "the reload was asked for and never
    // arrived" — the situation the backstop exists for.
    let asked = 0;
    await page.route('**/*', (route) => {
      if (route.request().isNavigationRequest()) {
        asked += 1;
        return route.fulfill({ status: 204 });
      }
      return route.continue().catch(() => {});
    });

    await page.evaluate(`new Promise((resolve) => {
      addEventListener('hashchange', () => resolve(true), { once: true });
      location.hash = '${LOCKED}';
    })`);

    const working = await ask(page, VEIL);
    record(
      'backstop: before it fires, the veil is still saying it is working',
      working.veil === true && working.retry === false && working.centre !== 'CANVAS',
      `veil ${working.veil}, retry ${working.retry}, centre ${working.centre}, text "${working.veilText}"`
    );

    // Past the backstop. 14s for a 12s timer.
    await sleep(14_000);
    const stalled = await ask(page, VEIL);
    await shot(page, 'backstop');
    record(
      'backstop: a reload that never lands becomes a retry, not a reveal',
      stalled.veil === true && stalled.retry === true && stalled.centre !== 'CANVAS',
      stalled.unreadable
        ? `could not read the page: ${stalled.unreadable}`
        : `${asked} reload(s) answered with 204; veil ${stalled.veil}, retry ${stalled.retry}, `
          + `centre ${stalled.centre}, text "${stalled.veilText}"`
    );

    // And the retry has to ask again, or it is a button that says "try again"
    // and does not.
    if (stalled.retry === true) {
      const before = asked;
      await page.evaluate(`document.querySelector('.loading-retry').click()`).catch(() => {});
      await sleep(1500);
      const after = await ask(page, VEIL);
      record(
        'backstop: the retry asks again, and the veil goes back to working',
        asked > before && after.veil === true && after.retry === false,
        `reloads asked ${before} -> ${asked}, veil ${after.veil}, retry ${after.retry}, text "${after.veilText}"`
      );
    }

    await page.unroute('**/*').catch(() => {});
    await context.close();
  }

  // ---------------------------------------------------------- BFCache
  // A restored page arrives with the veil still in its DOM, and `pageshow` with
  // `persisted` is the only thing that says so.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await openScene(context);
    await page.evaluate(`window.__persisted = null;
      addEventListener('pageshow', (event) => { window.__persisted = !!event.persisted; });`);

    await page.evaluate(`location.hash = '${LOCKED}'`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    await page.goBack({ waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(2500);
    const restored = await ask(page, `({ ...${VEIL}, persisted: window.__persisted })`);
    await shot(page, 'bfcache-back');

    if (restored.persisted !== true) {
      record(
        'BFCache restore: the veil is not left behind',
        null,
        'the back/forward cache did not engage in this configuration, so the `pageshow` '
          + 'takedown was not the thing under test. The page came back clean by reloading '
          + `(veil ${restored.veil}), which is correct but proves something else.`
      );
    } else {
      record(
        'BFCache restore: the veil is not left behind',
        restored.veil === false,
        `persisted ${restored.persisted}, veil ${restored.veil}, centre ${restored.centre}`
      );
    }
    await context.close();
  }

  // ------------------------------------------------- what a transition costs
  //
  // The rest of this file is about the veil: that it goes up, and that every
  // way out of it works. This section is about the transitions that no longer
  // raise one.
  //
  // Reading surfaces — the landing page, the model index, the publication
  // record, the legal documents — used to cost a full document load each,
  // which tore `#ui` down to nothing in the middle of every one. They are
  // swapped in place now. That is a claim with three halves, and all three are
  // easy to lose to a later change: no new document, no frame with nothing on
  // screen, and the page that ends up on screen matching the address bar.
  //
  // Measured here rather than in `node --test` because the failure is a real
  // browser's: the unit tests drive the policy with a stand-in `window`, and a
  // stand-in cannot tell you that a document was replaced.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let documents = 0;
    page.on('load', () => { documents += 1; });
    await page.goto(`${origin}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    let stacked = false;
    /** Follow a hash and report what the reader saw on the way. */
    const move = async (hash, expected = null) => {
      const before = documents;
      const started = Date.now();
      await page.evaluate((next) => { window.location.hash = next; }, hash);
      // What "arrived" means for a swap is the *content* changing, not a veil
      // going away — a swap never raises one, so "no veil" is true from the
      // first sample and a loop that waits for it measures nothing. The first
      // version of this check did exactly that and then read `data-route`
      // before the swap had committed, reporting the surface it had left.
      let blank = false;
      for (let i = 0; i < 100; i += 1) {
        await sleep(60);
        const state = await ask(page, `(() => ({
          ui: document.getElementById('ui') ? document.getElementById('ui').children.length : 0,
          mains: document.querySelectorAll('#ui > main').length,
          root: document.documentElement.dataset.route || null,
          veil: !!document.querySelector('.loading:not(.is-done)'),
          busy: document.documentElement.hasAttribute('data-navigating'),
        }))()`, 4000);
        if (state.unreadable) continue;
        if (state.ui === 0 && !state.veil) blank = true;
        // Two at once would mean the outgoing page is still stacked under the
        // incoming one, which is its own defect and is asserted below.
        if (state.mains > 1) stacked = true;
        if (state.root === expected && state.mains === 1 && !state.veil && !state.busy) break;
      }
      const settled = Date.now() - started;
      const after = await ask(page, `(() => ({
        hash: location.hash,
        route: document.documentElement.dataset.route || null,
      }))()`);
      return { reloaded: documents > before, blank, settled, ...after };
    };

    // `#/organs` is deliberately not in this list any more: in the beta it is
    // not a surface, it is a correction (`src/app/routeRedirects.js`), and it
    // gets its own check below. `#/terms` and `#/privacy` are two routes that
    // share a `kind`, which is the case `sameRoute` has to get right.
    const READING = [
      ['#/trust', 'trust'],
      ['#/terms', 'legal'],
      ['#/', 'landing'],
      ['#/privacy', 'legal'],
    ];
    const costs = [];
    let clean = true;
    let detail = '';
    for (const [hash, expected] of READING) {
      const seen = await move(hash, expected);
      costs.push(`${hash} ${seen.settled}ms`);
      if (seen.reloaded) { clean = false; detail = `${hash} replaced the document`; break; }
      if (seen.blank) { clean = false; detail = `${hash} showed an empty #ui`; break; }
      if (seen.route !== expected) {
        clean = false;
        detail = `${hash} settled on data-route="${seen.route}", expected "${expected}"`;
        break;
      }
      if (seen.hash !== hash) {
        clean = false;
        detail = `the address bar says ${seen.hash} but the page rendered ${hash}`;
        break;
      }
    }
    record(
      'reading surfaces swap in place: no new document, no blank frame',
      clean,
      clean ? costs.join(', ') : detail
    );
    // The outgoing surface must be off the page by the time the incoming one
    // is on it. It was not: a surface's own teardown disposes a WebGL hero
    // before removing its element, so the old page sat under the new one for
    // 870 ms with the page height going 1061 → 2495 → 1434 px.
    // A route with no page of its own, followed *during* a swap. The unit
    // tests fix the rule; this is the part they cannot see — that the address
    // bar and the page agree afterwards. A swap that rendered the landing page
    // while the hash still said `#/organs` would leave every later navigation
    // asking the wrong question, because the shell decides what is still
    // wanted by reading the address bar.
    {
      const seen = await move('#/organs', 'landing');
      const landed = seen.hash === '#/' && seen.route === 'landing' && !seen.reloaded && !seen.blank;
      record(
        'a route with no page of its own corrects itself, address bar included',
        landed,
        landed
          ? `#/organs -> ${seen.hash} in ${seen.settled}ms, no document load`
          : `settled at hash ${seen.hash} with data-route="${seen.route}"` +
            `${seen.reloaded ? ', and replaced the document' : ''}`
      );
    }
    record(
      'the outgoing surface is never left stacked under the incoming one',
      stacked === false,
      stacked ? 'two <main> elements were in the document at once' : 'one <main> throughout'
    );

    // And the other half of the same rule: a model still gets its own
    // document, because `App.js` owns a WebGL context with no teardown to
    // trust. If this ever stops reloading, something has started carrying a
    // renderer across a route change.
    const toScene = await move('#/brain-anatomy', 'scene');
    record(
      'a model still gets a document of its own',
      toScene.reloaded === true && toScene.route === 'scene',
      `reloaded ${toScene.reloaded}, route ${toScene.route}, ${toScene.settled}ms`
    );
    await shot(page, 'transition-scene');
    await context.close();
  }

  // ------------------------------------------- the shell outlives the surfaces
  //
  // A swap replaces the page inside a document that keeps running. Everything
  // the *shell* owns has to survive that: the account dialog (which lives in
  // `#ui` for the life of the page), the feedback panel, the language toggle,
  // and the one account button that is moved from surface to surface rather
  // than rebuilt.
  //
  // Checked after ten navigations rather than one, because the failure this
  // guards against is cumulative — a teardown that removes one node too many,
  // or a mount that leaves one behind, shows up as a second feedback button on
  // the third navigation and a missing sign-in dialog on the tenth.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await sleep(2000);

    for (const hash of ['#/trust', '#/organs', '#/terms', '#/', '#/privacy',
                        '#/trust', '#/organs', '#/', '#/support', '#/trust']) {
      await page.evaluate((next) => { window.location.hash = next; }, hash);
      await sleep(900);
    }
    // Long enough for the last swap to commit: counting mid-swap reports the
    // account button as missing, because it is moved from one surface's header
    // into the next one's rather than rebuilt.
    await sleep(2500);

    const counted = await ask(page, `(() => ({
      accountModals: document.querySelectorAll('.access-modal').length,
      accountButtons: document.querySelectorAll('.account-trigger').length,
      feedbackTriggers: document.querySelectorAll('.feedback-trigger').length,
      feedbackOverlays: document.querySelectorAll('.feedback-overlay').length,
      skipLinks: document.querySelectorAll('.skip-link').length,
      shellHeaders: document.querySelectorAll('.shell-header').length,
      announcers: document.querySelectorAll('body > .visually-hidden[role="status"]').length,
      roots: document.querySelectorAll('#ui > main').length,
    }))()`);
    const singles = Object.entries(counted).filter(([key]) => key !== 'unreadable');
    const duplicated = singles.filter(([, howMany]) => howMany !== 1);
    record(
      'ten swaps later there is still exactly one of everything the shell owns',
      duplicated.length === 0,
      duplicated.length
        ? duplicated.map(([what, howMany]) => `${what}: ${howMany}`).join(', ')
        : singles.map(([what]) => what).join(', ')
    );

    // And they still work, which is a different question from being present.
    await page.click('.account-trigger').catch(() => {});
    await sleep(900);
    const signIn = await ask(page, `(() => {
      const modal = document.querySelector('.access-modal');
      return { open: !!(modal && !modal.hidden) };
    })()`);
    record('the sign-in dialog still opens after them', signIn.open === true, `open ${signIn.open}`);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);

    const before = await ask(page, `document.getElementById('ui').dataset.lang`);
    await page.click('.shell-actions .ui-toggle').catch(() => {});
    await sleep(700);
    const after = await ask(page, `document.getElementById('ui').dataset.lang`);
    record(
      'the language toggle still changes the language after them',
      typeof after === 'string' && after !== before,
      `${before} -> ${after}`
    );
    await shot(page, 'after-ten-swaps');
    await context.close();
  }

  // ------------------------------------------------- the veil says where to
  {
    const context = await browser.newContext();
    const page = await openScene(context);
    // Raised, and read before the reload commits.
    await page.evaluate(() => { window.location.hash = '#/heart-anatomy'; });
    await sleep(160);
    const during = await ask(page, VEIL);
    const named = typeof during.veilText === 'string' && during.veilText.includes('心臓');
    record(
      'the veil names the model it is opening, not just that it is opening one',
      // `null` — skipped — when the page could not be read at all, rather than
      // `false`. `ask()` answers `{unreadable}` on a timeout or a destroyed
      // context, which leaves `veilText` undefined; reporting that as a failure
      // printed `veil said undefined` and sent somebody looking for a broken
      // veil when what had actually happened was the run hitting its own
      // deadline on a slow runner. Same class as L-102 and L-103: a check that
      // reports a defect the product does not have.
      during.unreadable ? null : named,
      during.unreadable
        ? `the page could not be read: ${during.unreadable}`
        : `veil said ${JSON.stringify(during.veilText)}`
    );

    // And the arriving document says the same thing, from `index.html`, before
    // the bundle has run. Two documents, one sentence: a veil that changed its
    // wording half a second in reads as a false start.
    await page.waitForTimeout(900);
    const arriving = await ask(page, `(() => {
      const veil = document.querySelector('.loading');
      return { text: veil ? veil.innerText.replace(/\\s+/g, ' ').trim() : null };
    })()`);
    record(
      'the arriving document carries the same sentence',
      arriving.unreadable ? null : typeof arriving.text === 'string' && arriving.text.includes('心臓'),
      arriving.unreadable
        ? `the page could not be read: ${arriving.unreadable}`
        : `arriving veil said ${JSON.stringify(arriving.text)}`
    );
    await context.close();
  }

  // ------------------------------------------------------------- report
  const failed = results.filter((entry) => entry.ok === false);
  const skipped = results.filter((entry) => entry.ok === null);

  console.log('\nStill only a person can do these, on real hardware:');
  console.log('  - Safari and Firefox — this run drove Chromium.');
  console.log('  - A reload interrupted by the reader closing the tab.');
  console.log('  - Whether the sentence the veil shows is the right thing to read for five seconds.\n');

  if (skipped.length) {
    // Loud, and not a failure by default. A path this browser will not enter is
    // a fact about the browser, and a check that can never be green is a check
    // nobody puts in CI — which would cost the other paths their watch too.
    // `--strict` is for a run that means to prove all of them.
    console.log(`${skipped.length} path(s) this browser would not enter, so they were not driven:`);
    for (const entry of skipped) console.log(`  - ${entry.name}`);
    console.log('  These stay recorded as unverified in docs/follow-ups.md (F-114).\n');
  }

  if (failed.length) {
    console.error(`${failed.length} problem(s):`);
    for (const entry of failed) console.error(`  - ${entry.name}: ${entry.detail}`);
    process.exitCode = 1;
  } else if (skipped.length && strict) {
    console.error('Nothing failed, but --strict was asked for and not every path was driven.');
    process.exitCode = 1;
  } else {
    const drove = results.filter((entry) => entry.ok === true).length;
    console.log(`${drove} way(s) out of a departure were driven, and taken.`);
  }
} finally {
  clearTimeout(watchdog);
  await browser.close().catch(() => {});
  await closeServer?.();
}
