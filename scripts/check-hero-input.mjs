#!/usr/bin/env node
/**
 * Drives the landing hero with the inputs that are not a mouse.
 *
 *   npm run build
 *   npm run verify:hero-input
 *
 * ## Why this exists as a script rather than as a note
 *
 * The hero names the structure a reader picks, and how they pick it is not one
 * thing. On a phone it is the only thing they touch: the model is turned by
 * swiping across it and a structure is named by tapping it. With a keyboard
 * there is no pointer at all, so the model is asked about the middle of the
 * frame. Neither is reachable from `node --test`, and neither behaves like the
 * mouse. A pointer has a hover and a finger does not, so the name card is only
 * ever reached by a tap; `touch-action: pan-y pinch-zoom` hands vertical swipes
 * and pinches back to the page, so the model can only be turned one way; and a
 * press that goes out and comes back — which is how a model is turned and
 * turned back — ends where it started.
 *
 * That last one is not hypothetical. It is what this check was written to catch,
 * and it caught it: releasing a rotate-and-return drag used to pin whatever had
 * rotated under the thumb, because a click was measured by where the release
 * landed and not by how far the pointer had travelled. See
 * `src/scenes/shared/anatomy/tapGesture.js`.
 *
 * ## What it is not
 *
 * **It is not a device pass.** This is Chromium on a desktop machine with touch
 * emulation: the same event path (real touch events through CDP, the device's
 * viewport, DPR and `hasTouch`), not the same hardware and not the same engine.
 * It cannot see iOS Safari's tap delay, a finger's contact patch, a software
 * keyboard, or a thumb that covers the card it is trying to read. The manual
 * half stays manual and is recorded in `docs/follow-ups.md` (F-101). The
 * keyboard half *is* a real keyboard driving a real browser, and is not
 * emulating anything.
 *
 * Options:
 *   --dist <dir>   built site to serve (default: dist)
 *   --preview      unlock a `VITE_ALLOW_PREVIEW=1` build, for a model the
 *                  release has not opened yet
 *   --shots <dir>  save one screenshot per device and step
 *   --headed       show the browser
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';

// --- arguments -------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const shotsDir = value('--shots', null);
const preview = flag('--preview');

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

if (!existsSync(distDir)) die(`No build at "${distDir}". Run \`npm run build\` first.`);
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

let chromium = null;
let devices = null;
for (const pkg of ['playwright', 'playwright-core']) {
  try {
    ({ chromium, devices } = await import(pkg));
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

// --- serving the build -----------------------------------------------------

const { base: origin, close: closeServer } = await serveDist(distDir);
const base = `${origin}${preview ? '?preview=1' : ''}`;

// --- the finger ------------------------------------------------------------

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * One finger: down, along a path, up.
 *
 * Through CDP rather than Playwright's `tap()`, because the interesting
 * gestures are the ones with a path — a tap is the degenerate case of this.
 *
 * @param {any} cdp
 * @param {{x:number,y:number}[]} path
 */
async function finger(cdp, path, { holdMs = 60, steps = 12 } = {}) {
  const [start, ...rest] = path;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 1 }],
  });
  let from = start;
  for (const to of rest) {
    for (let index = 1; index <= steps; index += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * index) / steps,
            y: from.y + ((to.y - from.y) * index) / steps,
            id: 1,
          },
        ],
      });
      await sleep(8);
    }
    from = to;
  }
  await sleep(holdMs);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Two fingers moving apart. */
async function pinch(cdp, centre, { from = 40, to = 140, steps = 14 } = {}) {
  const points = (spread) => [
    { x: centre.x - spread, y: centre.y, id: 1 },
    { x: centre.x + spread, y: centre.y, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from) });
  for (let index = 1; index <= steps; index += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: points(from + ((to - from) * index) / steps),
    });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// --- the drive -------------------------------------------------------------

const DEVICES = ['iPhone 13', 'Pixel 5', 'iPad Mini'];

const browser = await chromium.launch({
  headless: !flag('--headed'),
  executablePath: chromiumExecutable(chromium),
});
const problems = [];
const observed = [];

try {
  for (const name of DEVICES) {
    const descriptor = devices[name];
    if (!descriptor) {
      problems.push(`${name}: Playwright does not describe this device`);
      continue;
    }
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const context = await browser.newContext({ ...descriptor, isMobile: true, hasTouch: true });
    try {
      await drive(context, name, id);
    } catch (error) {
      // One device that throws is one device's finding. Without this the loop
      // unwinds, the remaining devices are never driven, and CI shows a stack
      // trace where the list of what actually broke should be.
      problems.push(`${name}: the drive could not finish — ${error.message}`);
    } finally {
      await context.close();
    }
  }
  // Once per published organ, not once. The hero opens on the first organ in
  // the rotation, so a single run only ever exercised that one — and on
  // 2026-09-15 that let a published heart reach the hero without
  // `selectAtCanvasPoint`, which is the method Enter here calls. The drive was
  // green the whole time because it never opened the heart. F-121.
  for (const organ of await publishedOrgans()) await driveKeyboard(organ);
} finally {
  await browser.close();
  closeServer();
}

/**
 * The third input: no pointer at all.
 *
 * A keyboard cannot hover and cannot aim, so the model is asked about the
 * middle of the frame and the focused viewport draws that spot. What this
 * checks is that the reader can get there with the Tab key from the top of the
 * page, that Enter names something, that Escape lets go of it, and that the aim
 * is actually drawn — an aim nobody can see is not an aim.
 */
/**
 * The organs the hero actually offers, read off the page rather than assumed.
 *
 * With one published model the chooser is not drawn at all — there is nothing
 * to choose between — so an empty list means "one organ, whichever the hero
 * opened on", and the keyboard runs once against that.
 */
async function publishedOrgans() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForSelector(".landing-demo[data-viewport='ready']", { timeout: 120_000 });
    const organs = await page.$$eval('.landing-demo-state', (nodes) =>
      nodes.map((node) => node.dataset.organ).filter(Boolean)
    );
    return organs.length ? organs : [null];
  } finally {
    await context.close();
  }
}

/** @param {string|null} organ which organ to put up first, or null for the default */
async function driveKeyboard(organ) {
  const who = organ ? `keyboard (desktop, ${organ})` : 'keyboard (desktop)';
  // Evidence from one organ must not overwrite another's. Without this every
  // iteration wrote `keyboard-1-enter.png`, so with two published organs only
  // the last organ's frames survived — and the F-121 record said the opposite.
  const shotName = (step) => (organ ? `keyboard-${organ}-${step}.png` : `keyboard-${step}.png`);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`${who}: page error: ${error.message}`));
  try {
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForSelector(".landing-demo[data-viewport='ready']", { timeout: 120_000 });
    if (organ) {
      const chooser = page.locator(`.landing-demo-state[data-organ="${organ}"]`);
      if (await chooser.count()) {
        await chooser.first().click();
        // Wait for *this* organ to be ready, not for "something is ready".
        //
        // The first version waited on `.landing-demo[data-viewport='ready']`
        // again, which the organ that was already on screen still satisfies:
        // the swap is asynchronous, so the wait could return before the click
        // had taken effect at all and the fixed delay below was the only thing
        // standing between the check and pressing Enter on the previous organ.
        // A check that names the wrong organ's structures, or a slower build
        // that makes it flaky, is exactly what F-121 was about — and CLAUDE.md
        // already says to wait for the state rather than for a duration.
        //
        // `data-organ` is written on the viewport only once a build has
        // succeeded, so the conjunction cannot be satisfied by the outgoing
        // organ: either the attribute still names the old one and this blocks,
        // or it names the new one and the frame really is showing it.
        await page.waitForSelector(
          `.landing-demo-viewport[data-organ="${organ}"]`,
          { timeout: 120_000 }
        );
        await page.waitForSelector(".landing-demo[data-viewport='ready']", { timeout: 120_000 });
      }
    }
    await sleep(600);

    const card = page.locator('.landing-demo-structure').first();
    const named = async () =>
    (await page.locator('.landing-demo-structure-body').first().innerText())
      .replace(/\s+/g, ' ')
      .trim();

    // Tab from the top of the document rather than focusing the element
    // directly: a control a reader cannot reach is not reachable, however well
    // it behaves once focused.
    let reached = false;
    for (let press = 0; press < 30 && !reached; press += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() =>
        document.activeElement?.classList?.contains('landing-demo-viewport') ?? false);
    }
    if (!reached) {
      problems.push(`${who}: the 3D viewport is not reachable with the Tab key`);
      return;
    }

    // The aim, drawn only for keyboard focus.
    const aim = await page.evaluate(() => {
      const node = document.querySelector('.landing-demo-viewport');
      const style = getComputedStyle(node, '::after');
      return { content: style.content, width: style.width };
    });
    if (aim.content === 'none') problems.push(`${who}: the focused viewport draws no aim`);

    await page.keyboard.press('Enter');
    await sleep(400);
    const pinned = await named();
    const state = await card.getAttribute('data-state');
    if (state !== 'pinned') {
      problems.push(`${who}: Enter did not name the structure in the middle (${state})`);
    }
    if (shotsDir) await page.screenshot({ path: join(shotsDir, shotName('1-enter')) });

    await page.keyboard.press('Escape');
    await sleep(400);
    if ((await card.getAttribute('data-state')) !== 'hint') {
      problems.push(`${who}: Escape did not clear the name Enter gave`);
    }

    // Turning the model with the arrows and asking again is the whole loop: a
    // keyboard reader reaches a second structure by moving the model, not the
    // pointer. It must name *something*, and it may well be something else.
    for (let press = 0; press < 6; press += 1) await page.keyboard.press('ArrowLeft');
    await sleep(400);
    await page.keyboard.press('Enter');
    await sleep(400);
    const afterTurning = await named();
    if ((await card.getAttribute('data-state')) !== 'pinned') {
      problems.push(`${who}: Enter named nothing after the model was turned`);
    }
    if (shotsDir) await page.screenshot({ path: join(shotsDir, shotName('2-turned')) });

    // The way out. A reader who found a part on the small model arrives at the
    // full one already looking at it — or the hand-off is a link that opens a
    // whole brain and asks them to find it again.
    await page.keyboard.press('Enter');
    await sleep(400);
    const carried = await named();
    const href = await page.locator('.landing-demo-structure-link').first().getAttribute('href');
    await page.locator('.landing-demo-structure-link').first().click();
    await page.waitForSelector('.anatomy-panel', { timeout: 120_000 });
    await sleep(2500);
    const arrivedAt = await page.evaluate(() => {
      const name = document.querySelector('.anatomy-panel-name.lang-ja')
        ?? document.querySelector('.anatomy-panel-name');
      return (name?.textContent ?? '').trim();
    });
    if (!arrivedAt) {
      problems.push(`hand-off: the full model named nothing after following ${href}`);
    } else if (!carried.startsWith(arrivedAt)) {
      problems.push(
        `hand-off: the hero named "${carried}" and the full model opened on "${arrivedAt}"`
      );
    }
    if (shotsDir) await page.screenshot({ path: join(shotsDir, shotName('3-handoff')) });

    observed.push({
      device: who,
      handedOver: arrivedAt,
      tapped: pinned,
      afterRotate: afterTurning,
      afterReturnDrag: '—',
      scrolledBy: 0,
      viewportScale: 1,
    });
  } catch (error) {
    problems.push(`keyboard: the drive could not finish — ${error.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Everything one device is asked to do.
 *
 * @param {any} context
 * @param {string} name the device as Playwright names it
 * @param {string} id the same, as a filename
 */
async function drive(context, name, id) {
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`${name}: page error: ${error.message}`));
  const cdp = await context.newCDPSession(page);
  const shot = async (step) => {
    if (shotsDir) await page.screenshot({ path: join(shotsDir, `${id}-${step}.png`) });
  };

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector(".landing-demo[data-viewport='ready']", { timeout: 120_000 });
  await sleep(600);

  const card = page.locator('.landing-demo-structure').first();
  const canvas = page.locator('.landing-demo-viewport canvas').first();
  const state = () => card.getAttribute('data-state');
  const named = async () =>
    (await page.locator('.landing-demo-structure-body').first().innerText())
      .replace(/\s+/g, ' ')
      .trim();
  const centre = async () => {
    const box = await canvas.boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const record = { device: name };

  // 1. A tap names a structure. Nothing hovered first: a finger cannot.
  if ((await state()) !== 'hint') problems.push(`${name}: the ready model does not invite a tap`);
  await finger(cdp, [await centre()]);
  await sleep(400);
  record.tapped = await named();
  if ((await state()) !== 'pinned') problems.push(`${name}: a tap did not name a structure`);
  await shot('1-tap');

  // 2. Turning the model is not choosing something else.
  const before = await canvas.screenshot();
  const from = await centre();
  await finger(cdp, [{ x: from.x - 60, y: from.y }, { x: from.x + 70, y: from.y + 6 }]);
  await sleep(400);
  record.afterRotate = await named();
  if (!record.afterRotate || record.afterRotate !== record.tapped) {
    problems.push(`${name}: a rotate drag changed the name to "${record.afterRotate}"`);
  }
  if ((await canvas.screenshot()).equals(before)) {
    problems.push(`${name}: a horizontal drag did not turn the model`);
  }
  await shot('2-rotate');

  // 3. And neither is turning it back. This is the case the mouse hides: the
  //    release lands on the press, so by displacement alone it stood still.
  const at = await centre();
  await finger(cdp, [at, { x: at.x + 110, y: at.y }, { x: at.x + 1, y: at.y + 1 }]);
  await sleep(400);
  record.afterReturnDrag = await named();
  if (record.afterReturnDrag !== record.tapped) {
    problems.push(
      `${name}: a drag that returned to where it began selected "${record.afterReturnDrag}"`
    );
  }
  // The regression this check exists for. Its screenshot is the one a reader
  // of a failed run needs most: a bad selection and a raycast landing on a
  // neighbouring mesh read the same in a message and not in a picture.
  await shot('3-return-drag');

  // 4. A vertical swipe belongs to the page. The hero is inside an article.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  const swipe = await centre();
  await finger(cdp, [swipe, { x: swipe.x, y: swipe.y - 220 }], { steps: 18 });
  await sleep(500);
  record.scrolledBy = await page.evaluate(() => Math.round(window.scrollY));
  if (record.scrolledBy <= 0) {
    problems.push(`${name}: a vertical swipe over the model did not scroll the page`);
  }

  // 5. A pinch is the page's too, by the same `touch-action`. Recorded rather
  //    than asserted about the model: what it must not do is throw.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await pinch(cdp, await centre());
  await sleep(500);
  record.viewportScale = await page.evaluate(() => window.visualViewport?.scale ?? null);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('4-pinch');

  // 6. The card is a caption, not a control: it must not take the touch, and
  //    it must not sit on top of the action underneath the hero.
  record.geometry = await page.evaluate(() => {
    const node = document.querySelector('.landing-demo-structure');
    const stage = document.querySelector('.landing-demo-stage');
    const action = document.querySelector('.landing-cta');
    // A card that is absent or hidden measures as a zero-sized box at the
    // origin, and every question below then answers about the top-left corner
    // of the page: "the card takes the touch (html)" for a card that is not
    // there. Say the true thing instead.
    if (!node || !stage) return { missing: true };
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { hidden: true };
    const stageRect = stage.getBoundingClientRect();
    const actionRect = action?.getBoundingClientRect() ?? null;
    const under = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      shareOfStage: Number((rect.height / stageRect.height).toFixed(2)),
      hitAtCentre: under?.tagName?.toLowerCase() ?? null,
      overlapsAction: actionRect
        ? !(rect.bottom < actionRect.top || rect.top > actionRect.bottom)
        : false,
    };
  });
  if (record.geometry.missing || record.geometry.hidden) {
    problems.push(
      `${name}: the name card is ${record.geometry.missing ? 'not in the page' : 'not shown'} ` +
        'on a ready model that reports named structures'
    );
  } else if (record.geometry.hitAtCentre !== 'canvas') {
    problems.push(`${name}: the card takes the touch (${record.geometry.hitAtCentre})`);
  }
  if (record.geometry.overlapsAction) problems.push(`${name}: the card covers the call to action`);
  if (record.geometry.shareOfStage > 0.34) {
    problems.push(`${name}: the card covers ${record.geometry.shareOfStage * 100}% of the model`);
  }

  // 7. Tapping past the model puts the card back to its invitation.
  const box = await canvas.boundingBox();
  await finger(cdp, [{ x: box.x + 8, y: box.y + 8 }]);
  await sleep(400);
  if ((await state()) !== 'hint') problems.push(`${name}: tapping empty space did not clear the name`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 1) problems.push(`${name}: the page scrolls sideways by ${overflow}px`);

  observed.push(record);
}

console.log(
  `Landing hero under a finger and a keyboard — ${observed.length} run(s)`
);
for (const record of observed) {
  if (record.device.startsWith('keyboard')) {
    console.log(
      `  ${record.device}: Tab reaches the model, Enter named "${record.tapped}", ` +
        `Escape cleared it, after turning Enter named "${record.afterRotate}", ` +
        `and the card's link opened the full model on "${record.handedOver}"`
    );
    continue;
  }
  console.log(
    `  ${record.device}: tap named "${record.tapped}"; ` +
      `after a rotate "${record.afterRotate}"; after a rotate-and-return "${record.afterReturnDrag}"; ` +
      `swipe scrolled ${record.scrolledBy}px; pinch left the page at ${record.viewportScale}×`
  );
}
console.log('  note: emulated touch on desktop Chromium. Not a device pass — see docs/follow-ups.md F-101.');

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  '  ok    a tap names a structure, a drag turns the model without naming one, the page ' +
    'keeps its scroll and pinch, the card never takes the touch, a keyboard can reach the ' +
    'model, name what is in front of it and let go again, and the card hands that structure ' +
    'to the full model'
);
