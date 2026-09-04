#!/usr/bin/env node
/**
 * Measures a real browser against the viewport matrix in `src/app/viewports.js`.
 *
 *   npm run build
 *   npm run verify:ui
 *
 * What this is and is not
 * -----------------------
 * Gate 1 asks for the product to be tested on current Safari, Chrome and
 * Firefox and on real iPhone and Android hardware. **This script is not that
 * test.** It drives one engine, headless, on a desktop machine. It cannot see
 * a Safari-only flexbox bug, an Android font-inflation surprise, a notch, or a
 * software keyboard eating the viewport.
 *
 * What it can do is measure the failures that are identical everywhere and are
 * found by looking rather than by feeling: a layout that scrolls sideways at
 * 320 px, a control the flexbox crushed below a thumb's width, a keyboard user
 * who cannot reach the content, a console full of errors. Those are most of
 * what a device pass actually finds, and finding them here means the person
 * doing the device pass spends their time on the half only a person can do.
 *
 * The manual half is written down in `docs/accessibility.md`; this script
 * prints the same list at the end so the two cannot drift apart silently.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --json <file>    write the full measurement table as JSON
 *   --viewport <id>  check one viewport (repeatable)
 *   --surface <id>   check one surface (repeatable)
 *   --headed         show the browser
 */
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

import {
  INLINE_LINK_EXEMPTION,
  MEASURED_TARGET,
  OVERFLOW_TOLERANCE_PX,
  SURFACES,
  TARGET_EXEMPTIONS,
  TRANSIENT_OVERLAYS,
  VIEWPORTS,
  deviceClassOf,
  validateViewportMatrix,
} from '../src/app/viewports.js';

// --- arguments -------------------------------------------------------------

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
const onlyViewports = values('--viewport');
const onlySurfaces = values('--surface');
const headed = flag('--headed');

const viewports = onlyViewports.length
  ? VIEWPORTS.filter((viewport) => onlyViewports.includes(viewport.id))
  : VIEWPORTS;
const surfaces = onlySurfaces.length
  ? SURFACES.filter((surface) => onlySurfaces.includes(surface.id))
  : SURFACES;

// --- preconditions ---------------------------------------------------------

const die = (message) => {
  console.error(message);
  process.exit(1);
};

const matrixProblems = validateViewportMatrix();
if (matrixProblems.length) {
  die(`The viewport matrix is inconsistent before any browser ran:\n  ${matrixProblems.join('\n  ')}`);
}
if (!viewports.length || !surfaces.length) die('No viewport or surface selected.');
if (!existsSync(join(distDir, 'index.html'))) {
  die(`No build at "${distDir}" — run \`npm run build\` first.`);
}

/**
 * Playwright is not a dependency of this repository.
 *
 * The runtime dependency is `three` and nothing else, and a browser automation
 * stack is a large thing to make every contributor download to run `npm test`.
 * The UI check installs it on demand instead, in its own CI job, and says so
 * plainly here rather than passing quietly when it is absent — a check that
 * succeeds because it did not run is worse than no check.
 */
async function loadChromium() {
  for (const pkg of ['playwright', 'playwright-core']) {
    try {
      const mod = await import(pkg);
      return mod.chromium ?? mod.default?.chromium;
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    }
  }
  return null;
}

const chromium = await loadChromium();
if (!chromium) {
  die(
    [
      'Playwright is not installed, so nothing was measured.',
      '',
      '  npm i --no-save playwright',
      '  npx playwright install --with-deps chromium',
      '  npm run verify:ui',
      '',
      'It is deliberately not a dependency: `npm test` must stay a plain',
      '`node --test` run with no browser download.',
    ].join('\n'),
  );
}

// --- serving the build -----------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const root = resolve(distDir);

/** Resolve a URL path inside the build, refusing anything that escapes it. */
function fileFor(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = resolve(root, `.${normalize(decoded)}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return existsSync(candidate) ? candidate : null;
}

const server = createServer((request, response) => {
  // Every route in this product is a hash, so a path that is not a file is the
  // application shell — the same single-page fallback a static host does.
  const file = fileFor(request.url ?? '/') ?? join(root, 'index.html');
  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;

// --- the measurement, run inside the page ----------------------------------

/**
 * What counts as something a person can operate.
 *
 * Native controls plus the ARIA roles that claim to be one, plus anything that
 * put itself in the tab ring. `tabindex="-1"` is excluded from the ring but not
 * from the size rule: a skip target is not a control, but a `-1` button that
 * only a mouse can reach is still a control.
 */
const INTERACTIVE_SELECTOR =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary,' +
  ' [role="button"], [role="tab"], [role="switch"], [role="link"],' +
  ' [tabindex]:not([tabindex="-1"])';

/**
 * A hard stop on the Tab walk.
 *
 * The walk normally ends by itself — focus leaves the document, or comes back
 * to a stop it has already marked. This is the guard for the case it does not,
 * which is the focus trap the walk exists to find.
 */
const MAX_TAB_STEPS = 240;


/**
 * Everything measured on one loaded surface, in one round trip.
 *
 * Written as a string-free function passed to `page.evaluate`: it runs in the
 * browser, so it may only use what the browser has, and every threshold is
 * handed in rather than duplicated here.
 */
function measureInPage({ tolerance, floor, intent, exemptions, inlineLinks, interactiveSelector, overlays }) {
  const doc = document.documentElement;
  const describe = (element) => {
    const id = element.id ? `#${element.id}` : '';
    const classes = String(element.className || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => `.${name}`)
      .join('');
    const text = (element.textContent ?? '').trim().slice(0, 32);
    return `${element.tagName.toLowerCase()}${id}${classes}${text ? ` “${text}”` : ''}`;
  };

  const visible = (element) => {
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  // --- horizontal overflow
  const overflowPx = doc.scrollWidth - doc.clientWidth;
  const overflowing = [];
  if (overflowPx > tolerance) {
    for (const element of document.body.querySelectorAll('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || !visible(element)) continue;
      // Only the right edge: `scrollWidth` grows there, and an element parked
      // at `left: -9999px` is the visually-hidden idiom, not an overflow.
      if (rect.right > doc.clientWidth + tolerance) {
        overflowing.push(`${describe(element)} → ${Math.round(rect.left)}…${Math.round(rect.right)}px`);
      }
      if (overflowing.length >= 4) break;
    }
  }

  // --- target sizes
  const INTERACTIVE = interactiveSelector;
  const isInlineLink = (element) => {
    if (element.tagName !== 'A') return false;
    if (!getComputedStyle(element).display.startsWith('inline')) return false;
    const parent = element.parentElement;
    if (!parent) return false;
    // Inline only counts when there is surrounding prose fixing the line box.
    const own = (element.textContent ?? '').trim();
    const around = (parent.textContent ?? '').trim();
    return around.length > own.length + 4;
  };
  /**
   * Is the point a finger would land on actually this control?
   *
   * `elementFromPoint` answers the question the layout cannot: a control can
   * be the right size, in the right place, inside the viewport, and still have
   * something sitting on top of it. That is a different failure from every
   * other one measured here, and the one that found it was a person looking at
   * a screenshot — the consent banner was landing on the scene console and
   * covering every control on it, including all four stage buttons on a phone.
   *
   * A hit on a descendant is a hit: a button's own label is what the pointer
   * usually lands on. A hit on an ancestor is not — that means something was
   * painted over the control.
   */
  /**
   * Is the control cut out of an ancestor's overflow box, and can it be reached?
   *
   * A control can be laid out correctly, be the right size, and still have been
   * clipped out of a scrolling region's visible box. `elementFromPoint` at its
   * centre then answers with whatever is painted there instead — sometimes that
   * ancestor, but just as often a sibling subtree such as the 3D canvas, which
   * reads as occlusion and is not.
   *
   * The distinction that decides whether it is a defect is the axis's own
   * `overflow`. A region that scrolls on the escaping axis can be scrolled to
   * the control, so it is reachable and merely undiscoverable. A region that
   * hides that axis never can: the control is painted, measured, and
   * permanently untouchable. Both used to be read the same way, which is how a
   * phone-sized panel shipped with half its controls untappable while this
   * check reported the surface clean.
   */
  /**
   * What an ancestor has to do to become the containing block of a *fixed*
   * descendant. Position alone never does it — only the properties that pull
   * the viewport-anchored box back into the ancestor's own coordinate space.
   */
  const containsFixed = (style) =>
    style.transform !== 'none' ||
    style.filter !== 'none' ||
    style.perspective !== 'none' ||
    (style.backdropFilter && style.backdropFilter !== 'none') ||
    /transform|filter|perspective/.test(style.willChange) ||
    /paint|layout|strict|content/.test(style.contain) ||
    (style.containerType && style.containerType !== 'normal');

  /** And for an absolutely positioned one, which any positioning also does. */
  const createsContainingBlock = (style) => style.position !== 'static' || containsFixed(style);

  const clippedOutOf = (element, rect) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Overflow only clips descendants an ancestor is the containing block for.
    // A fixed bar is anchored to the viewport, so the column it happens to sit
    // inside in the DOM does not clip it — reading it as clipped reported the
    // whole global navigation as unreachable on three viewports. A fixed box
    // *is* clipped once an ancestor transforms or contains, which is why this
    // tracks what the element is anchored to rather than assuming.
    let mode = getComputedStyle(element).position;
    for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      const anchors =
        mode === 'fixed'
          ? containsFixed(style)
          : mode === 'absolute'
            ? createsContainingBlock(style)
            : true;
      if (!anchors) {
        if (style.position === 'fixed') mode = 'fixed';
        continue;
      }
      // Past this ancestor the element sits in its flow, unless the ancestor is
      // itself anchored to the viewport.
      mode = style.position === 'fixed' ? 'fixed' : 'static';
      const clipsX = style.overflowX !== 'visible';
      const clipsY = style.overflowY !== 'visible';
      if (!clipsX && !clipsY) continue;
      const box = node.getBoundingClientRect();
      const outX = clipsX && (cx < box.left - 1 || cx > box.right + 1);
      const outY = clipsY && (cy < box.top - 1 || cy > box.bottom + 1);
      if (!outX && !outY) continue;
      const scrollsX = /auto|scroll/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
      const scrollsY = /auto|scroll/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      return {
        node,
        axis: outX ? 'horizontally' : 'vertically',
        stuck: (outX && !scrollsX) || (outY && !scrollsY),
      };
    }
    return null;
  };

  const blockedBy = (element, rect) => {
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    if (x < 0 || y < 0 || x >= doc.clientWidth || y >= doc.clientHeight) return null;
    // Clipping is answered before occlusion. A control cut out of a scrolling
    // region is not "covered by" whatever the point happens to land on.
    const clipped = clippedOutOf(element, rect);
    if (clipped) {
      return clipped.stuck
        ? {
            bucket: 'covered',
            text: `${describe(element)} ← clipped ${clipped.axis} out of ${describe(clipped.node)}, which cannot scroll to it`,
          }
        : {
            bucket: 'scrolled',
            text: `${describe(element)} ← scrolled out of ${describe(clipped.node)}`,
          };
    }
    const hit = document.elementFromPoint(x, y);
    if (!hit || hit === element || element.contains(hit)) return null;
    if (hit.contains(element)) return null;
    // Something a pointer passes straight through is not covering anything.
    if (getComputedStyle(hit).pointerEvents === 'none') return null;

    // A declared transient may cover, up to the limit it declares.
    for (const overlay of overlays) {
      if (!hit.closest(overlay.selector)) continue;
      const forbidden = overlay.mustNotCover.some(
        (selector) => element.matches(selector) || element.closest(selector),
      );
      return forbidden
        ? { bucket: 'covered', text: `${describe(element)} ← ${overlay.selector} is covering the console` }
        : { bucket: 'transient', text: `${describe(element)} ← ${overlay.selector}` };
    }
    return { bucket: 'covered', text: `${describe(element)} ← covered by ${describe(hit)}` };
  };

  const belowFloor = [];
  const belowIntent = [];
  const unreachable = [];
  const covered = [];
  const coveredByTransient = [];
  const scrolledOut = [];
  for (const element of document.querySelectorAll(INTERACTIVE)) {
    if (!visible(element)) continue;
    if (exemptions.some((selector) => element.closest(selector))) continue;
    if (element.getAttribute('tabindex') !== '-1' && !element.hasAttribute('data-vp-focus')) {
      unreachable.push(describe(element));
    }
    const rect = element.getBoundingClientRect();
    const blocker = blockedBy(element, rect);
    if (blocker) {
      const bucket = { covered, transient: coveredByTransient, scrolled: scrolledOut }[blocker.bucket];
      bucket.push(blocker.text);
    }
    if (inlineLinks && isInlineLink(element)) continue;
    const smallest = Math.min(rect.width, rect.height);
    const size = `${describe(element)} → ${Math.round(rect.width)}×${Math.round(rect.height)}px`;
    if (smallest + 0.5 < floor) belowFloor.push(size);
    else if (smallest + 0.5 < intent) belowIntent.push(size);
  }

  return {
    overflowPx,
    overflowing,
    belowFloor,
    belowIntent,
    unreachable,
    covered,
    coveredByTransient,
    scrolledOut,
    interactiveCount: [...document.querySelectorAll(INTERACTIVE)].filter(visible).length,
    scrollHeight: doc.scrollHeight,
    hasCanvas: Boolean(document.querySelector('canvas')),
  };
}

/**
 * Put the browser's sequential-focus starting point back at the top.
 *
 * `blur()` is not enough. Chromium remembers where tabbing should resume, and
 * following the skip link sets that point to the content element — so a Tab
 * walk started afterwards continues *past* the content and never re-enters it.
 * That looked exactly like a broken tab order on five surfaces that were fine.
 */
const resetFocus = (page) =>
  page.evaluate(() => {
    document.activeElement?.blur?.();
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });

/**
 * Walk the whole focus ring with the Tab key, marking every stop.
 *
 * The first thing this was written to check — "does Tab eventually reach the
 * main content" — turned out to mean nothing. A terms page's content is prose;
 * it contains no focusable element, so the answer is no on a page with a
 * perfect tab order. What is worth knowing is the opposite: **is there a
 * visible control the keyboard cannot get to at all**, which is what a focus
 * trap, a stray `tabindex` or an overlay that swallows the ring actually does.
 *
 * Each stop is marked in the DOM rather than compared by a description string,
 * so the measurement afterwards can name the elements the ring missed. The
 * walk ends when focus leaves the document (the browser chrome has it) or
 * returns to something already marked (the ring has closed).
 */
async function walkTabOrder(page, { steps }) {
  await resetFocus(page);
  let stops = 0;
  let closed = false;
  let stuck = false;
  for (let step = 0; step < steps; step += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) return null;
      const already = active.hasAttribute('data-vp-focus');
      active.setAttribute('data-vp-focus', '');
      return { already };
    });
    if (!stop) break;
    if (stop.already) {
      closed = true;
      break;
    }
    stops += 1;
  }
  if (stops >= steps) stuck = true;
  return { stops, closed, stuck };
}

// --- the run ---------------------------------------------------------------

const exemptionSelectors = TARGET_EXEMPTIONS.map((exemption) => exemption.selector);
const IGNORED_CONSOLE = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/, /net::ERR_/];

/**
 * The browser is not allowed off the machine.
 *
 * Nothing outside the build is part of a layout question, and letting the
 * browser reach the network makes the run both slower and less repeatable: the
 * page asks Google for a webfont, and Chromium itself asks for autofill data,
 * component updates and optimisation hints before it has drawn anything.
 * Request interception covers none of that — it happens below the page.
 *
 * `--no-proxy-server` matters more than it looks: with a proxy configured in
 * the environment, Chromium stops resolving host names itself and hands them
 * to the proxy, which walks straight past `--host-resolver-rules`. The two
 * flags only work together.
 */
const BROWSER_ARGS = [
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  '--no-proxy-server',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-client-side-phishing-detection',
  '--disable-sync',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=OptimizationHints,Translate,MediaRouter,AutofillServerCommunication,InterestFeedContentSuggestions',
];

const browser = await chromium.launch({
  headless: !headed,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: BROWSER_ARGS,
});

const engine = `Chromium ${browser.version()}`;
const problems = [];
const notes = [];
const shortfalls = [];
const rows = [];

const narrowest = Math.min(...viewports.map((viewport) => viewport.width));
const widest = Math.max(...viewports.map((viewport) => viewport.width));

try {
  for (const viewport of viewports) {
    process.stdout.write(`${viewport.id} (${viewport.width}×${viewport.height}, ${deviceClassOf(viewport)})\n`);
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const fullTabWalk = viewport.width === narrowest || viewport.width === widest;
    // The build asks Google for a webfont. CI has no reason to reach the
    // internet to answer a layout question, and the fallback stack is what a
    // reader with a blocked font sees anyway.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    for (const surface of surfaces) {
      const where = `${viewport.id} · ${surface.label}`;
      // Printed as it goes: the run takes minutes, and a silent process is
      // indistinguishable from a hung one.
      process.stdout.write(`  ${where}${' '.repeat(Math.max(1, 42 - where.length))}`);
      const startedAt = Date.now();
      const console_ = [];
      const onConsole = (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
        console_.push(text);
      };
      const onError = (error) => console_.push(`uncaught: ${error.message}`);
      page.on('console', onConsole);
      page.on('pageerror', onError);

      try {
        // A full load per surface, not a hash change: a defect that only
        // appears on a cold start is exactly the one a user meets first.
        await page.goto('about:blank');
        await page.goto(`${base}${surface.route}`, { waitUntil: 'load', timeout: 30_000 });
        // `attached`, not the default `visible`: the first child of `#ui` is
        // the skip link, which is deliberately invisible until it is focused.
        // Waiting for it to be seen waits forever.
        await page.waitForSelector('#ui > *', { state: 'attached', timeout: 20_000 });
        // The loading veil covers the whole frame between navigation and the
        // first drawn frame. Measuring through it reports the veil, not the
        // scene, so wait for it to go rather than guessing at a duration.
        if (surface.needsRenderer) {
          await page.waitForFunction(() => !document.querySelector('.loading'), null, { timeout: 30_000 })
            .catch(() => notes.push(`${where}: the loading veil never cleared`));
        }
        await page.waitForTimeout(surface.needsRenderer ? 800 : 300);

        const measuredSkip = await page.evaluate(() => {
          const target = document.querySelector('[data-skip-target]');
          return {
            hasSkipLink: Boolean(document.querySelector('.skip-link')),
            hasSkipTarget: Boolean(target),
            skipTargetId: target?.id ?? null,
          };
        });

        const kind = surface.needsRenderer ? 'scene' : 'reading';

        // The inspection surface ships closed, so nothing inside it was ever
        // measured: its controls were untappable on a phone for a whole
        // release while this check called the scene clean. A viewer who opens
        // it is looking at the same surface, so measure it opened too, and walk its
        // controls with the keyboard like any others.
        if (surface.needsRenderer) {
          const opened = await page.evaluate(() => {
            const button = [...document.querySelectorAll('.controls button')].find(
              (candidate) => candidate.getAttribute('aria-controls') === 'spatial-inspection-panel',
            );
            if (!button) return false;
            if (button.getAttribute('aria-expanded') !== 'true') button.click();
            return true;
          });
          if (!opened) notes.push(`${where}: no inspection control to open`);
          await page.waitForTimeout(250);
        }

        // The keyboard walk runs first, because it marks each stop in the DOM
        // and the measurement reads those marks to name what the ring missed.
        let tab = null;
        if (fullTabWalk) {
          const controls = await page.evaluate(
            (selector) => document.querySelectorAll(selector).length,
            INTERACTIVE_SELECTOR,
          );
          tab = await walkTabOrder(page, { steps: Math.min(controls + 8, MAX_TAB_STEPS) });
          if (tab.stuck) {
            problems.push(
              `${where}: the focus ring never closed in ${tab.stops} Tab presses — focus is trapped or looping`,
            );
          }
        }

        // Then the skip link, which moves focus into the content and with it
        // the browser's idea of where tabbing resumes.
        if (!surface.needsRenderer) {
          if (!measuredSkip.hasSkipLink) problems.push(`${where}: no skip link on a reading surface`);
          if (!measuredSkip.hasSkipTarget) problems.push(`${where}: nothing marked as the skip target`);
          if (measuredSkip.hasSkipLink && measuredSkip.hasSkipTarget) {
            await resetFocus(page);
            await page.keyboard.press('Tab');
            const isSkipLink = await page.evaluate(() =>
              Boolean(document.activeElement?.classList.contains('skip-link')),
            );
            if (!isSkipLink) {
              problems.push(`${where}: the first Tab stop is not the skip link`);
            } else {
              const before = page.url();
              await page.keyboard.press('Enter');
              await page.waitForTimeout(150);
              const after = await page.evaluate((targetId) => {
                const active = document.activeElement;
                const target = targetId ? document.getElementById(targetId) : null;
                return {
                  onTarget: Boolean(target && (active === target || target.contains(active))),
                  url: location.href,
                };
              }, measuredSkip.skipTargetId);
              if (!after.onTarget) {
                problems.push(`${where}: the skip link did not move focus to the content`);
              }
              // The defect this check exists for: an in-page anchor the router
              // read as navigation and reloaded a 3D scene over.
              if (after.url.replace(/#.*$/, '') !== before.replace(/#.*$/, '')) {
                problems.push(`${where}: activating the skip link navigated away`);
              }
              const stillHere = await page.evaluate(() => location.hash);
              if (surface.route !== '#/' && stillHere !== surface.route) {
                problems.push(
                  `${where}: the route became "${stillHere}" when the skip link was used`,
                );
              }
            }
          }
        }

        const measured = await page.evaluate(measureInPage, {
          tolerance: OVERFLOW_TOLERANCE_PX,
          floor: MEASURED_TARGET.floor,
          intent: MEASURED_TARGET.intent[kind],
          exemptions: exemptionSelectors,
          inlineLinks: Boolean(INLINE_LINK_EXEMPTION),
          interactiveSelector: INTERACTIVE_SELECTOR,
          overlays: TRANSIENT_OVERLAYS,
        });

        if (measured.overflowPx > OVERFLOW_TOLERANCE_PX) {
          const what = viewport.reflow
            ? 'reflow (WCAG 1.4.10): content requires two-dimensional scrolling'
            : 'horizontal overflow';
          problems.push(
            `${where}: ${what} — ${Math.round(measured.overflowPx)}px\n    ${measured.overflowing.join('\n    ')}`,
          );
        }
        if (measured.belowFloor.length) {
          problems.push(
            `${where}: ${measured.belowFloor.length} target(s) below the ${MEASURED_TARGET.floor}px ` +
              `WCAG 2.5.8 floor\n    ${measured.belowFloor.slice(0, 8).join('\n    ')}`,
          );
        }
        if (measured.covered.length) {
          problems.push(
            `${where}: ${measured.covered.length} control(s) with something painted over them` +
              `\n    ${measured.covered.slice(0, 6).join('\n    ')}`,
          );
        }
        if (measured.coveredByTransient.length) {
          // Not a failure, and not silent either: a one-time notice over part
          // of a page is ordinary, but how much of it it covers is worth being
          // able to see in the report.
          notes.push(
            `${where}: ${measured.coveredByTransient.length} control(s) under a one-time overlay` +
              ` (${measured.coveredByTransient.slice(0, 3).join('; ')})`,
          );
        }
        if (measured.scrolledOut.length) {
          // Reachable, but only by scrolling a region whose scrollability the
          // viewer has to discover. Worth seeing in the report; not a failure,
          // because the control can be scrolled to.
          notes.push(
            `${where}: ${measured.scrolledOut.length} control(s) scrolled out of a panel` +
              ` (${measured.scrolledOut.slice(0, 3).join('; ')})`,
          );
        }
        if (fullTabWalk && measured.unreachable.length) {
          problems.push(
            `${where}: ${measured.unreachable.length} visible control(s) the Tab key never reached` +
              `\n    ${measured.unreachable.slice(0, 6).join('\n    ')}`,
          );
        }
        if (measured.belowIntent.length) {
          shortfalls.push({
            viewport: viewport.id,
            surface: surface.id,
            intent: MEASURED_TARGET.intent[kind],
            elements: measured.belowIntent,
          });
        }

        if (surface.needsRenderer && !measured.hasCanvas) {
          // Not a failure: a headless browser may have no GPU, and the product
          // is designed to stay usable without one. It is recorded, because a
          // scene check that silently measured the fallback every time would
          // be reporting on something else.
          notes.push(`${where}: no WebGL canvas — the renderer fallback was measured instead`);
        }
        if (console_.length) {
          problems.push(`${where}: ${console_.length} console error(s)\n    ${console_.slice(0, 3).join('\n    ')}`);
        }

        rows.push({
          viewport: viewport.id,
          width: viewport.width,
          height: viewport.height,
          deviceClass: deviceClassOf(viewport),
          surface: surface.id,
          overflowPx: Math.round(measured.overflowPx * 10) / 10,
          belowFloor: measured.belowFloor.length,
          belowIntent: measured.belowIntent.length,
          covered: measured.covered.length,
          controls: measured.interactiveCount,
          unreachable: fullTabWalk ? measured.unreachable.length : null,
          tabStops: tab?.stops ?? null,
          scrollHeight: measured.scrollHeight,
          canvas: measured.hasCanvas,
          consoleErrors: console_.length,
        });
        process.stdout.write(
          `overflow ${String(Math.round(measured.overflowPx)).padStart(4)}px  ` +
            `<24px ${String(measured.belowFloor.length).padStart(2)}  ` +
            `<${MEASURED_TARGET.intent[kind]}px ${String(measured.belowIntent.length).padStart(3)}  ` +
            `${String(Date.now() - startedAt).padStart(5)}ms\n`,
        );
      } catch (error) {
        process.stdout.write(`failed: ${error.message.split('\n')[0]}\n`);
        problems.push(`${where}: ${error.message.split('\n')[0]}`);
        rows.push({ viewport: viewport.id, surface: surface.id, error: error.message.split('\n')[0] });
      } finally {
        page.off('console', onConsole);
        page.off('pageerror', onError);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

// --- report ----------------------------------------------------------------

const pad = (text, width) => String(text).padEnd(width);
console.log(`Measured ${rows.length} combinations in headless ${engine}.`);
console.log('');
console.log(
  `  ${pad('viewport', 18)}${pad('surface', 12)}${pad('overflow', 10)}${pad('<24px', 7)}` +
    `${pad('<intent', 9)}${pad('controls', 10)}${pad('tab', 6)}console`,
);
for (const row of rows) {
  if (row.error) {
    console.log(`  ${pad(row.viewport, 18)}${pad(row.surface, 12)}failed: ${row.error}`);
    continue;
  }
  console.log(
    `  ${pad(row.viewport, 18)}${pad(row.surface, 12)}${pad(`${row.overflowPx}px`, 10)}` +
      `${pad(row.belowFloor, 7)}${pad(row.belowIntent, 9)}${pad(row.controls, 10)}` +
      `${pad(row.tabStops ?? '—', 6)}${row.consoleErrors}`,
  );
}

if (jsonOut) {
  writeFileSync(
    jsonOut,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), engine, rows, problems, shortfalls, notes }, null, 2)}\n`,
  );
  console.log(`\nWrote ${jsonOut}`);
}

if (notes.length) {
  console.log('\nNotes:');
  for (const note of notes) console.log(`  - ${note}`);
}

/**
 * The gap between the WCAG floor the build enforces and the size the product
 * would prefer. Published, not enforced — see `MEASURED_TARGET`.
 */
if (shortfalls.length) {
  const worst = new Map();
  for (const entry of shortfalls) {
    for (const element of entry.elements) {
      const name = element.split(' → ')[0].split(' “')[0];
      worst.set(name, (worst.get(name) ?? 0) + 1);
    }
  }
  const total = shortfalls.reduce((sum, entry) => sum + entry.elements.length, 0);
  console.log(
    `\nAbove the ${MEASURED_TARGET.floor}px floor but below the product's own preference:` +
      ` ${total} measurement(s) across ${worst.size} kind(s) of control.`,
  );
  for (const [name, count] of [...worst].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(count).padStart(4)}×  ${name}`);
  }
}

console.log('\nStill only a person can do these, on real hardware:');
for (const line of [
  'Safari (iOS and macOS) and Firefox — this script drives Chromium only.',
  'A screen reader: VoiceOver and TalkBack reading each surface end to end.',
  'Pinch zoom to 400% and the software keyboard covering the viewport.',
  'Orbiting a scene by touch, and whether the gesture fights the page scroll.',
  'Whether the thing is actually understandable, which no assertion measures.',
]) {
  console.log(`  - ${line}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nEvery declared viewport and surface met the declared rules.');
