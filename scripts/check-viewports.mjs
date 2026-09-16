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
 *   --engine <name>  chromium (default), firefox or webkit
 *   --viewport <id>  check one viewport (repeatable)
 *   --surface <id>   check one surface (repeatable)
 *   --headed         show the browser
 *   --evidence-dir <dir>  save B1 Chromium screenshots and capture metadata
 *   --diagnostics-dir <dir>  record lifecycle/network events for a targeted run
 *   --diagnostics-wait-detail  wait for Explorer detail to settle in a direct-open control
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';

import {
  INLINE_LINK_EXEMPTION,
  MEASURED_TARGET,
  OVERFLOW_TOLERANCE_PX,
  PHONE_TARGET,
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

/**
 * The width at which this product lays a scene out as one column — the same
 * number `product-shell-b6.css` and `App.js` use, so a run of this matrix and
 * the layout it is measuring cannot disagree about what a phone is.
 */
const PHONE_LAYOUT_WIDTH = PHONE_TARGET.maxWidth;

/**
 * What a control in the phone's bottom bar must measure.
 *
 * Higher than `MEASURED_TARGET.intent.scene` (32), which is the ambition for
 * scene chrome at any size. A bar a thumb uses while the other hand holds the
 * phone is the case that asks for the full 44, and it is what the device pass
 * asked for by name.
 */
const PHONE_CONTROL_TARGET = PHONE_TARGET.floor;

const distDir = value('--dist', 'dist');
const jsonOut = value('--json');
const onlyViewports = values('--viewport');
const onlySurfaces = values('--surface');
const headed = flag('--headed');
const evidenceDir = value('--evidence-dir', process.env.VIEWPORT_EVIDENCE_DIR || null);
const diagnosticsDir = value('--diagnostics-dir', process.env.VIEWPORT_DIAGNOSTICS_DIR || null);
const diagnosticsWaitDetail = flag('--diagnostics-wait-detail');
const ENGINES = ['chromium', 'firefox', 'webkit'];
const engineName = value('--engine', 'chromium');

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
async function loadEngine(name) {
  for (const pkg of ['playwright', 'playwright-core']) {
    try {
      const mod = await import(pkg);
      return (mod[name] ?? mod.default?.[name]) || null;
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    }
  }
  return null;
}

if (!ENGINES.includes(engineName)) {
  die(`Unknown --engine "${engineName}". Choose one of: ${ENGINES.join(', ')}.`);
}

const browserType = await loadEngine(engineName);
if (!browserType) {
  die(
    [
      `Playwright is not installed, so nothing was measured (${engineName}).`,
      '',
      '  npm i --no-save playwright',
      `  npx playwright install --with-deps ${engineName}`,
      '  npm run verify:ui',
      '',
      'It is deliberately not a dependency: `npm test` must stay a plain',
      '`node --test` run with no browser download.',
    ].join('\n'),
  );
}

// --- serving the build -----------------------------------------------------

const { base, close: closeServer } = await serveDist(distDir);

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
 * to a stop it has already marked. This is the guard against pressing Tab
 * forever in a real trap, and **nothing else**: reaching it is not evidence of
 * one.
 *
 * It used to be both, at 240, and that was a bug rather than a threshold. The
 * budget is `controls + 8` clamped to this number, so once a page grew past
 * 232 focusable controls the clamp bit on every run and the walk was reported
 * as "focus is trapped or looping" no matter how good the tab order was. The
 * Trust page has 295 — every citation in every model's source list is a link —
 * so it failed this check on `phone-320` and `desktop-1280` for being large,
 * and took 46 links and the feedback button down with it as "never reached",
 * which they were not: the walk had simply stopped 63 steps early.
 *
 * Now the budget is twice the controls plus a margin (see `tabBudget`), and
 * this is the ceiling on that. A ring that has not closed after visiting every
 * control twice is not going to.
 */
const MAX_TAB_STEPS = 1200;

/**
 * How many Tab presses a surface is worth.
 *
 * Twice the controls, because a ring that closes does so on its second visit
 * to its first stop, plus a margin for the browser chrome the ring passes
 * through on the way out.
 *
 * @param {number} controls visible focusable elements on the page
 */
const tabBudget = (controls) => Math.min(controls * 2 + 8, MAX_TAB_STEPS);


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
    // A closed `<details>` is not on screen, and a browser says so by not
    // painting it — but Chromium keeps the boxes its content last had, so
    // `getBoundingClientRect` still answers with a rectangle. Measured as
    // visible, the consent card inside the scene's information disclosure was
    // reported as "clipped out of a panel that cannot scroll to it" on every
    // run, about controls nobody could see at all. Whether that disclosure's
    // *contents* behave is a question for a run that opens it.
    if (element.closest('details:not([open])')) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  /**
   * Attributes written in English while the interface is in Japanese.
   *
   * Everywhere else both languages are in the DOM and CSS hides one. An
   * `aria-label`, a `title` and a `placeholder` hold one string, so each is a
   * place where somebody has to remember to ask which language is on screen —
   * and a device pass found a Japanese interface whose login button announced
   * itself to a screen reader as "Sign in".
   *
   * Latin letters and no kana or kanji at all: a string that mixes them is a
   * Japanese string containing a product name, which is not the defect.
   */
  function englishOnlyAttributes() {
    if (document.getElementById('ui')?.dataset?.lang !== 'ja') return [];
    // Proper nouns and file formats are the same word in both languages.
    const SAME_IN_BOTH = /^(PNG|JPEG|JPG|SVG|WebP|GLB|CSV|Medical 3D Lab)$/i;
    const found = [];
    const seen = new Set();
    for (const element of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
      if (!visible(element)) continue;
      for (const attribute of ['aria-label', 'title', 'placeholder']) {
        const value = element.getAttribute(attribute);
        if (!value || !/[A-Za-z]/.test(value)) continue;
        if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(value)) continue;
        if (SAME_IN_BOTH.test(value.trim())) continue;
        const key = `${attribute}=${value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(`${describe(element)} [${attribute}]="${value}"`);
      }
    }
    return found;
  }

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
    // The case #37 named here — a rail too small to still be under the point,
    // so the hit finds the canvas behind it — is answered by `clippedOutOf`
    // above, before the point is consulted at all. Asking the axis's own
    // overflow rather than whether the ancestor scrolls at all is what keeps a
    // control stranded by `overflow-x: hidden` a failure: the rail that hid it
    // horizontally was scrolling vertically the whole time, so a test for
    // "scrolls, and the point is outside it" excuses exactly the defect this
    // has to catch.
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
  const unreachableLinks = [];
  const covered = [];
  const coveredByTransient = [];
  const scrolledOut = [];
  // Links are counted apart from the rest. Safari does not move focus to a link
  // on Tab unless full keyboard access is on, so on a WebKit run "no link was
  // ever focused" is a fact about the engine, while "this button was never
  // focused" is a fact about the page. Reported as one thing they are
  // indistinguishable, and the engine's convention would bury every real
  // finding under a list of every link on the surface.
  let linksPresent = 0;
  let linksReached = 0;
  let controlsReached = 0;
  for (const element of document.querySelectorAll(INTERACTIVE)) {
    if (!visible(element)) continue;
    if (exemptions.some((selector) => element.closest(selector))) continue;
    const isLink = element.tagName === 'A' && element.hasAttribute('href');
    const reached = element.hasAttribute('data-vp-focus');
    if (isLink) {
      linksPresent += 1;
      if (reached) linksReached += 1;
    } else if (reached) {
      controlsReached += 1;
    }
    if (element.getAttribute('tabindex') !== '-1' && !reached) {
      (isLink ? unreachableLinks : unreachable).push(describe(element));
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
    unreachableLinks,
    // Tab reached other controls but not one single link: the engine does not
    // tab to links, rather than the page having lost all of them at once.
    engineSkipsLinks: linksPresent > 0 && linksReached === 0 && controlsReached > 0,
    covered,
    coveredByTransient,
    scrolledOut,
    interactiveCount: [...document.querySelectorAll(INTERACTIVE)].filter(visible).length,
    scrollHeight: doc.scrollHeight,
    hasCanvas: Boolean(document.querySelector('canvas')),
    englishOnlyAttributes: englishOnlyAttributes(),
  };
}

/**
 * The phone layout of a 3D scene, measured rather than looked at.
 *
 * A device pass on an iPhone 13 found three things a screenshot shows and no
 * assertion caught: a console two thirds of the width with its button row
 * scrolling sideways, so the camera control was off the end of it; a selection
 * card whose actions wrapped under that console; and the two of them together
 * leaving the model a strip. The viewport matrix already measures overflow and
 * target sizes — these are the questions it did not ask, and they are asked
 * here rather than in a second harness.
 *
 * Runs on the scene surface at a phone width, which is where the layout the
 * stylesheet writes for a phone actually applies.
 *
 * The second question it asks is about the whole page, not the scene: at a
 * phone width **every** visible control has to measure `target` in both
 * dimensions. The 24px floor `measureInPage` enforces is WCAG 2.5.8 and applies
 * at every width; this is the ambition for the width where a thumb is the only
 * pointer, and the shipped CSS was answering it six different ways.
 *
 * @param {{phoneWidth: number, target: number, interactiveSelector: string,
 *   exemptions: string[]}} options
 */
function measurePhoneLayoutInPage({ phoneWidth, target, interactiveSelector, exemptions }) {
  const problems = [];
  // "Two boxes must not sit on top of each other" and "the bar must be on
  // screen" are true at every width, and the landscape phone — 844 wide — is
  // exactly where the console and the gesture hint collided. Only the 44px
  // sweep is about a phone's *width*, so only that is gated.
  const narrow = window.innerWidth <= phoneWidth;

  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0 ? box : null;
  };
  const describe = (node) => {
    const label = (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return `${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]}${label ? ` "${label}"` : ''}`;
  };
  const inside = (box) =>
    box.left >= -1 && box.top >= -1 &&
    box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1;

  const console_ = rect('.console');
  const row = document.querySelector('.button-row');
  const card = rect('.anatomy-panel');

  if (console_ && !inside(console_)) {
    problems.push(`the control bar is not inside the viewport (${Math.round(console_.left)}…${Math.round(console_.right)} of ${window.innerWidth})`);
  }

  // The first-use gesture hint floats over the model and is `pointer-events:
  // none`, so no "control is covered" rule sees it — it just prints a sentence
  // across whatever is behind it, which for one release was the slider.
  const hint = rect('.anatomy-shell-gesture-hint');
  if (hint && console_) {
    const overlap = !(hint.bottom <= console_.top || hint.top >= console_.bottom ||
      hint.right <= console_.left || hint.left >= console_.right);
    if (overlap) problems.push('the gesture hint is printed over the control bar');
  }

  if (row) {
    // Every control in the bar, not the bar's own box: a row that scrolls
    // sideways has a box inside the viewport and buttons outside it.
    for (const button of row.querySelectorAll('button')) {
      const box = button.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // On screen at every width; 44px only at a phone's. A desktop bar draws
      // the same controls at 36 deliberately — `TOUCH_TARGET.dense` — and
      // asking a mouse for a thumb's target is how a real rule gets switched
      // off for being noisy.
      if (!inside(box)) problems.push(`${describe(button)} is outside the viewport`);
      else if (narrow && Math.min(box.width, box.height) + 0.5 < target) {
        problems.push(`${describe(button)} is ${Math.round(box.width)}×${Math.round(box.height)}, under ${target}px`);
      }
    }
    const rowBox = row.getBoundingClientRect();
    if (row.scrollWidth > row.clientWidth + 1) {
      problems.push(`the control bar scrolls sideways (${row.scrollWidth}px of content in ${Math.round(rowBox.width)}px)`);
    }
  }

  // The selection card and the control bar are the two things that grew into
  // each other on the device: the card's actions wrapped, and the bottom row
  // went under the bar.
  if (card && console_) {
    const overlap = !(card.bottom <= console_.top || card.top >= console_.bottom ||
      card.right <= console_.left || card.left >= console_.right);
    if (overlap) problems.push('the selection card and the control bar overlap');
  }

  // --- every control on the page, not only the ones in the bar
  if (!narrow) return { skipped: false, problems };
  const exempt = (node) => exemptions.some((selector) => node.closest(selector));
  // The same rule `measureInPage` uses: WCAG 2.5.8 exempts a link inside a
  // sentence, because the line box already fixes its height and a 44px box
  // around it would overlap the lines above and below.
  const inlineInProse = (node) => {
    if (node.tagName !== 'A') return false;
    if (!getComputedStyle(node).display.startsWith('inline')) return false;
    const parent = node.parentElement;
    if (!parent) return false;
    const own = (node.textContent ?? '').trim();
    return (parent.textContent ?? '').trim().length > own.length + 4;
  };
  const small = [];
  for (const node of document.querySelectorAll(interactiveSelector)) {
    if (node.closest('details:not([open])')) continue;
    const style = getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (Math.min(box.width, box.height) + 0.5 >= target) continue;
    if (exempt(node) || inlineInProse(node)) continue;
    small.push(`${describe(node)} is ${Math.round(box.width)}×${Math.round(box.height)}`);
  }
  if (small.length) {
    problems.push(
      `${small.length} control(s) under ${target}px at a phone width\n    ${small.slice(0, 8).join('\n    ')}`
    );
  }

  return { skipped: false, problems };
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
 * Does the interface come back?
 *
 * "Hide UI" empties the frame for a screen capture, and the button that did it
 * is the only thing on screen that says how to undo it — the H shortcut is
 * written in a code comment, not anywhere a reader can see. So that one button
 * has to survive the state it creates.
 *
 * It did not, and the way it failed is one nothing else here would catch. The
 * rule that clears the frame exempted `.ui-toggle`, but as a *child* of `#ui`,
 * and the button lives three levels down in `.top-bar > .rail > .rail-buttons`
 * — so the exemption matched nothing and the button faded out with the panels
 * around it. `opacity: 0` keeps an element laid out and hit-testable, which is
 * why Playwright's own `isVisible()` answers yes on a button no one can see:
 * the question has to be asked of the boxes above it, not only of the button.
 *
 * Measured as a round trip, and only where the control is offered to begin
 * with, so a viewport that does not show it is not failed for not showing it.
 */
async function hideUiRoundTrip(page) {
  const toggle = page.locator('#ui [data-control="hideUi"]');
  if ((await toggle.count()) !== 1) return { control: false };

  const uiHidden = (want) =>
    page
      .waitForFunction(
        (expected) => document.getElementById('ui')?.classList.contains('is-hidden') === expected,
        want,
        { timeout: 5_000 },
      )
      .then(() => true, () => false);

  // What a person would see, in the browser's own terms.
  const look = () =>
    toggle.evaluate((node) => {
      const name = (element) => {
        if (!element) return 'nothing';
        const classes = String(element.className ?? '').trim().split(/\s+/).filter(Boolean);
        return `${element.tagName.toLowerCase()}${classes.length ? `.${classes.join('.')}` : ''}`;
      };
      const box = node.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return { seen: false, why: 'it has no box' };
      // Its own `visibility`, not its ancestors': the whole point of the
      // property is that a descendant may turn it back on, and the computed
      // value here already accounts for whatever the boxes above it said.
      const own = getComputedStyle(node);
      if (own.visibility !== 'visible') return { seen: false, why: `its visibility is ${own.visibility}` };
      // `opacity` is the opposite case. It composites down the tree and no
      // descendant can undo it, so every box above this one has to be asked.
      let opacity = 1;
      for (let element = node; element; element = element.parentElement) {
        opacity *= Number(getComputedStyle(element).opacity);
      }
      if (opacity < 0.1) {
        return { seen: false, why: `the boxes above it multiply out to opacity ${opacity.toFixed(2)}` };
      }
      const at = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (!(at === node || node.contains(at))) {
        return { seen: false, why: `a click at its centre would land on ${name(at)}` };
      }
      return { seen: true };
    });

  const before = await look();
  if (!before.seen) return { control: true, offered: false, why: before.why };

  await toggle.click({ noWaitAfter: true });
  const hid = await uiHidden(true);
  const during = await look();

  if (during.seen) {
    await toggle.click({ noWaitAfter: true });
    return { control: true, offered: true, hid, during, back: await uiHidden(false) };
  }
  // The rest of the run measures this page, so put it back the way the reader
  // cannot: through the shortcut, which is also what repaints the button.
  await page.keyboard.press('h');
  await uiHidden(false);
  return { control: true, offered: true, hid, during, back: null };
}

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
 *
 * It reports **which of the three endings it got**, because they mean
 * different things and conflating two of them is what made this check lie for
 * a while:
 *
 * - `closed` — the ring came back to a stop it had already marked. Normal.
 * - `left`   — focus went to the browser chrome. Also normal, and the usual
 *              ending on a page whose last control is its last element.
 * - `cut`    — the budget ran out. **Not a finding about the page.** Either
 *              the ring really is looping without repeating (which the budget
 *              above is set high enough to make implausible) or the budget is
 *              wrong. Either way it says nothing about a control being
 *              unreachable, so the caller must not read the marks afterwards.
 */
async function walkTabOrder(page, { steps }) {
  await resetFocus(page);
  let stops = 0;
  let ending = 'cut';
  for (let step = 0; step < steps; step += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) return null;
      const already = active.hasAttribute('data-vp-focus');
      active.setAttribute('data-vp-focus', '');
      return { already };
    });
    if (!stop) {
      ending = 'left';
      break;
    }
    if (stop.already) {
      ending = 'closed';
      break;
    }
    stops += 1;
  }
  return { stops, steps, ending, closed: ending === 'closed', complete: ending !== 'cut' };
}


const B1_EVIDENCE_CASES = [
  { id: 'landing-1280x720', route: '#/', width: 1280, height: 720 },
  { id: 'landing-375x667', route: '#/', width: 375, height: 667 },
  { id: 'organs-1280x720', route: '#/organs', width: 1280, height: 720 },
  { id: 'organs-375x667', route: '#/organs', width: 375, height: 667 },
];

async function measureEvidenceFrame(page) {
  return page.evaluate(() => {
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      };
    };
    const isVisible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' &&
        style.pointerEvents !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const cta = [...document.querySelectorAll('a.landing-cta')]
      .find((element) => isVisible(element) && element.textContent?.includes('脳を見る')) ?? null;
    const canvas = document.querySelector('.landing-demo-viewport canvas');
    const header = document.querySelector('.landing-nav') ??
      document.querySelector('.public-models-appbar') ??
      document.querySelector('.explorer-header');
    const h1 = document.querySelector('h1');
    const feedback = document.querySelector('.feedback-trigger.is-floating');
    const ctaRect = rectOf(cta);
    const feedbackRect = rectOf(feedback);
    const overlaps = (a, b) => Boolean(
      a && b &&
      Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
    );
    const hit = ctaRect
      ? document.elementFromPoint(
          Math.max(0, Math.min(innerWidth - 1, (ctaRect.left + ctaRect.right) / 2)),
          Math.max(0, Math.min(innerHeight - 1, (ctaRect.top + ctaRect.bottom) / 2)),
        )
      : null;
    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      viewport: { width: innerWidth, height: innerHeight },
      activeElement: document.activeElement
        ? {
            tag: document.activeElement.tagName,
            id: document.activeElement.id || null,
            className: typeof document.activeElement.className === 'string'
              ? document.activeElement.className
              : null,
          }
        : null,
      rects: {
        header: rectOf(header),
        h1: rectOf(h1),
        cta: ctaRect,
        canvas: rectOf(canvas),
        feedback: feedbackRect,
      },
      ctaFullyInViewport: Boolean(
        ctaRect && ctaRect.left >= 0 && ctaRect.top >= 0 &&
        ctaRect.right <= innerWidth && ctaRect.bottom <= innerHeight
      ),
      ctaHitTest: Boolean(cta && hit && (cta === hit || cta.contains(hit) || hit.contains(cta))),
      ctaFeedbackOverlap: overlaps(ctaRect, feedbackRect),
      headerH1Overlap: overlaps(rectOf(header), rectOf(h1)),
    };
  });
}

async function settleEvidencePageTop(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    let stableFrames = 0;
    const deadline = performance.now() + 2_000;
    while (performance.now() < deadline) {
      await new Promise((done) => requestAnimationFrame(done));
      if (window.scrollX === 0 && window.scrollY === 0) stableFrames += 1;
      else {
        stableFrames = 0;
        window.scrollTo(0, 0);
      }
      if (stableFrames >= 3) return;
    }
    throw new Error(`page did not settle at the top: ${window.scrollX},${window.scrollY}`);
  });
}

/**
 * Capture the B1 evidence after the detailed brain atlas—not the procedural
 * first stage—has loaded, decoded and replaced the first stage.
 *
 * This is intentionally separate from the viewport matrix. It adds evidence;
 * it does not change any matrix size, surface, threshold or engine coverage.
 */
async function captureB1Evidence(browser) {
  if (!evidenceDir || engineName !== 'chromium') return;

  const outputDir = resolve(evidenceDir);
  mkdirSync(outputDir, { recursive: true });
  const captures = [];

  for (const evidence of B1_EVIDENCE_CASES) {
    const context = await browser.newContext({
      viewport: { width: evidence.width, height: evidence.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      locale: 'ja-JP',
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const requestFailures = [];
    const glbResponses = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      requestFailures.push({
        url: request.url(),
        error: request.failure()?.errorText ?? 'unknown request failure',
      });
    });
    page.on('response', (response) => {
      if (/\/assets\/brain\/brain\.glb(?:\?|$)/.test(response.url())) {
        glbResponses.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok(),
        });
      }
    });
    await page.route(
      (url) => (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '127.0.0.1',
      (route) => route.abort(),
    );

    const imagePath = resolve(outputDir, `${evidence.id}.png`);
    const failurePath = resolve(outputDir, `${evidence.id}-failure.png`);
    try {
      await page.goto(`${base}${evidence.route}`, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForSelector('#ui > *', { state: 'attached', timeout: 20_000 });

      const consentBanner = page.locator('.consent-banner');
      await consentBanner.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
      const consentButton = consentBanner.locator('button').first();
      if (await consentButton.isVisible().catch(() => false)) {
        await consentButton.click();
        await consentBanner.waitFor({ state: 'detached', timeout: 5_000 });
      }

      await page.waitForFunction(
        () => {
          const viewport = document.querySelector('.landing-demo-viewport');
          return (
            document.documentElement.lang === 'ja' &&
            document.querySelector('#ui')?.dataset.lang === 'ja' &&
            viewport?.dataset.organ === 'brain' &&
            viewport?.dataset.detail === 'ready' &&
            Boolean(viewport.querySelector('canvas'))
          );
        },
        null,
        { timeout: 45_000 },
      );

      const fontStatus = await page.evaluate(async () => {
        if (!document.fonts) return 'unsupported';
        await document.fonts.ready;
        return document.fonts.status;
      });
      if (fontStatus !== 'loaded' && fontStatus !== 'unsupported') {
        throw new Error(`document fonts did not settle: ${fontStatus}`);
      }

      const detailResponse = glbResponses.find((response) => response.ok);
      if (!detailResponse) {
        throw new Error('brain.glb did not return a successful response');
      }

      const viewport = page.locator('.landing-demo-viewport');
      const beforeHome = await measureEvidenceFrame(page);
      await viewport.press('Home');
      const afterHome = await measureEvidenceFrame(page);
      await settleEvidencePageTop(page);
      const afterTopReset = await measureEvidenceFrame(page);

      const primaryCta = page.locator('a.landing-cta').filter({ hasText: '脳を見る' }).first();
      await primaryCta.click({ trial: true, timeout: 5_000 });
      await settleEvidencePageTop(page);
      const beforeScreenshot = await measureEvidenceFrame(page);

      const state = await page.evaluate(() => {
        const viewport = document.querySelector('.landing-demo-viewport');
        const canvas = viewport?.querySelector('canvas');
        const visibleJapaneseCta = [...document.querySelectorAll('.landing-cta .lang-ja')]
          .find((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          });
        const canvasRect = canvas?.getBoundingClientRect();
        return {
          lang: document.documentElement.lang,
          uiLang: document.querySelector('#ui')?.dataset.lang ?? null,
          detail: viewport?.dataset.detail ?? null,
          organ: viewport?.dataset.organ ?? null,
          cta: visibleJapaneseCta?.textContent?.trim() ?? null,
          loadingVisible: Boolean(document.querySelector('.landing-demo-loading:not([aria-hidden="true"])')),
          canvas: canvas && canvasRect
            ? {
                cssWidth: Math.round(canvasRect.width),
                cssHeight: Math.round(canvasRect.height),
                pixelWidth: canvas.width,
                pixelHeight: canvas.height,
              }
            : null,
        };
      });
      state.position = { beforeHome, afterHome, afterTopReset, beforeScreenshot };
      state.homeMovedPage = beforeHome.scrollX !== afterHome.scrollX || beforeHome.scrollY !== afterHome.scrollY;
      state.ctaTrialPassed = true;

      if (!state.canvas || state.canvas.pixelWidth < 2 || state.canvas.pixelHeight < 2) {
        throw new Error('the detailed model canvas has no drawable buffer');
      }
      if (!state.cta?.includes('脳を見る')) {
        throw new Error('the Japanese brain action is not visible');
      }
      if (state.position.beforeScreenshot.scrollX !== 0 || state.position.beforeScreenshot.scrollY !== 0) {
        throw new Error('the evidence page is not at its initial scroll position');
      }
      if (!state.position.beforeScreenshot.ctaFullyInViewport ||
          !state.position.beforeScreenshot.ctaHitTest) {
        throw new Error('the primary brain action is not fully visible and actionable');
      }
      if (state.position.beforeScreenshot.ctaFeedbackOverlap) {
        throw new Error('the feedback trigger overlaps the primary brain action');
      }
      if (state.loadingVisible) {
        throw new Error('the loading state is still visible');
      }
      if (await consentBanner.isVisible().catch(() => false)) {
        throw new Error('the consent banner still obscures the evidence viewport');
      }

      await page.screenshot({ path: imagePath, fullPage: false });
      captures.push({
        ...evidence,
        status: 'captured',
        file: `${evidence.id}.png`,
        fontStatus,
        glbResponses,
        state,
        consoleErrors,
        requestFailures,
      });
    } catch (error) {
      await page.screenshot({ path: failurePath, fullPage: false }).catch(() => {});
      const record = {
        ...evidence,
        status: 'failed',
        file: `${evidence.id}-failure.png`,
        error: error?.message ?? String(error),
        glbResponses,
        consoleErrors,
        requestFailures,
      };
      captures.push(record);
      writeFileSync(
        resolve(outputDir, `${evidence.id}-failure.json`),
        `${JSON.stringify(record, null, 2)}\n`,
      );
      problems.push(`B1 evidence ${evidence.id}: ${record.error}`);
    } finally {
      await context.close();
    }
  }

  writeFileSync(
    resolve(outputDir, 'evidence.json'),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      engine,
      build: 'npm run build (production capability; preview unlock disabled)',
      prHeadSha: process.env.PR_HEAD_SHA ?? null,
      checkedOutSha: process.env.CHECKED_OUT_SHA ?? process.env.GITHUB_SHA ?? null,
      captures,
    }, null, 2)}\n`,
  );
}

/**
 * Targeted lifecycle trace for the WebKit atlas-load investigation.
 *
 * It records only navigation and the brain/Draco delivery chain. Console
 * failures keep their original text and get an immediate screenshot plus the
 * URL/detail state at the time they were observed.
 */
function createLifecycleTrace(page, viewport) {
  if (!diagnosticsDir) return null;
  const outputDir = resolve(diagnosticsDir);
  mkdirSync(outputDir, { recursive: true });
  const events = [];
  const pending = [];
  let phase = 'context-created';
  let failureIndex = 0;
  const started = Date.now();
  const relevant = (url) => /\/assets\/brain\/(?:brain\.glb|draco\/)/.test(url);
  const record = (type, details = {}) => {
    events.push({
      elapsedMs: Date.now() - started,
      at: new Date().toISOString(),
      phase,
      type,
      pageUrl: page.url(),
      ...details,
    });
  };
  const snapshot = async (label) => {
    const state = await page.evaluate(() => ({
      url: location.href,
      detail: document.querySelector('.landing-demo-viewport')?.dataset.detail ?? null,
      organ: document.querySelector('.landing-demo-viewport')?.dataset.organ ?? null,
      activeElement: document.activeElement
        ? {
            tag: document.activeElement.tagName,
            id: document.activeElement.id || null,
            className: typeof document.activeElement.className === 'string'
              ? document.activeElement.className
              : null,
          }
        : null,
    })).catch((error) => ({ snapshotError: error?.message ?? String(error) }));
    record('page-state', { label, state });
    return state;
  };
  const onRequest = (request) => {
    if (relevant(request.url())) record('request', {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
  };
  const onResponse = (response) => {
    if (!relevant(response.url())) return;
    record('response', { url: response.url(), status: response.status(), ok: response.ok() });
    if (/\/brain\.glb(?:\?|$)/.test(response.url())) {
      const body = response.body()
        .then((buffer) => record('response-body', { url: response.url(), bytes: buffer.length }))
        .catch((error) => record('response-body-failed', {
          url: response.url(),
          error: error?.message ?? String(error),
        }));
      pending.push(body);
    }
  };
  const onRequestFinished = (request) => {
    if (relevant(request.url())) record('requestfinished', { url: request.url() });
  };
  const onRequestFailed = (request) => {
    if (relevant(request.url())) record('requestfailed', {
      url: request.url(),
      error: request.failure()?.errorText ?? 'unknown request failure',
    });
  };
  const onFrameNavigated = (frame) => {
    if (frame === page.mainFrame()) record('navigation-committed', { url: frame.url() });
  };
  const onConsole = (message) => {
    if (message.type() !== 'error') return;
    record('console-error', { text: message.text() });
    const index = ++failureIndex;
    pending.push(snapshot(`console-error-${index}`));
    pending.push(
      page.screenshot({
        path: resolve(outputDir, `failure-${viewport.id}-${index}.png`),
        fullPage: false,
      }).catch((error) => record('failure-screenshot-error', {
        error: error?.message ?? String(error),
      })),
    );
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfinished', onRequestFinished);
  page.on('requestfailed', onRequestFailed);
  page.on('framenavigated', onFrameNavigated);
  page.on('console', onConsole);
  record('trace-started');

  return {
    setPhase(next) {
      phase = next;
      record('phase');
    },
    record,
    snapshot,
    async finish() {
      await Promise.allSettled(pending);
      await snapshot('trace-finished');
      writeFileSync(
        resolve(outputDir, `trace-${viewport.id}.json`),
        `${JSON.stringify({
          generatedAt: new Date().toISOString(),
          engine,
          viewport,
          prHeadSha: process.env.PR_HEAD_SHA ?? null,
          checkedOutSha: process.env.CHECKED_OUT_SHA ?? process.env.GITHUB_SHA ?? null,
          events,
        }, null, 2)}\n`,
      );
      page.off('request', onRequest);
      page.off('response', onResponse);
      page.off('requestfinished', onRequestFinished);
      page.off('requestfailed', onRequestFailed);
      page.off('framenavigated', onFrameNavigated);
      page.off('console', onConsole);
    },
  };
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

/**
 * Firefox's own reasons for refusing a WebGL2 context, answered where we can.
 *
 * On a CI runner with no GPU, Firefox's gfx layer refuses the context outright
 * — `AllowWebgl2:false restricts context creation on this system` — and three.js
 * has required WebGL2 since r163, so every 3D surface drops to the renderer
 * fallback. These ask it to allow a software context instead of declining.
 *
 * They are a *try*, not a guarantee: whether a given runner honours them
 * depends on its blocklist, which is why the run also has to survive the case
 * where it still says no. That is what `engineHasWebgl2` below is for.
 */
const FIREFOX_PREFS = {
  'webgl.force-enabled': true,
  'webgl.disabled': false,
  'webgl.forbid-software': false,
  'gfx.webrender.software': true,
};

// `BROWSER_ARGS` are Chromium switches; Firefox and WebKit neither accept nor
// need them, and the network isolation they provide is done for every engine by
// the route below instead.
// The package can be present while the engine's binary was never downloaded —
// `playwright install chromium` does not fetch Firefox. That fails here rather
// than at import, and Playwright's own stack trace buries the one line worth
// reading, so it is answered with the command that fixes it.
let browser;
try {
  browser = await browserType.launch({
    headless: !headed,
    ...(engineName === 'chromium'
      ? { executablePath: chromiumExecutable(browserType), args: BROWSER_ARGS }
      : {}),
    ...(engineName === 'firefox' ? { firefoxUserPrefs: FIREFOX_PREFS } : {}),
  });
} catch (error) {
  const missing = /Executable doesn't exist|playwright install/i.test(error?.message ?? '');
  die(
    missing
      ? [
          `The ${engineName} browser is not installed, so nothing was measured.`,
          '',
          `  npx playwright install --with-deps ${engineName}`,
          '  npm run verify:ui' + (engineName === 'chromium' ? '' : ` -- --engine ${engineName}`),
        ].join('\n')
      : `Could not start ${engineName}: ${error?.message ?? error}`,
  );
}

const ENGINE_LABEL = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'WebKit' };
const engine = `${ENGINE_LABEL[engineName]} ${browser.version()}`;

/**
 * Can this engine, on this machine, make a WebGL2 context at all?
 *
 * Asked once, of a blank page, before any surface is measured — so the answer
 * is a fact about the engine and the runner, not about anything the product
 * does. On a GitHub runner Firefox answers no: its gfx layer declines with
 * `AllowWebgl2:false restricts context creation on this system`, and three.js
 * has required WebGL2 since r163, so every 3D surface drops to the renderer
 * fallback and three.js logs its refusal as a console error.
 *
 * Without this the run reported that refusal as twelve page defects — two
 * surfaces on every viewport, on every scene — which is a job painted red by
 * the machine it runs on. With it, the same console lines become one note per
 * surface naming the engine, and the run says at the end which coverage it
 * therefore lacked. Everything that does not need a renderer — layout,
 * overflow, target sizes, the Tab walk — is measured exactly as before.
 *
 * The distinction is earned rather than assumed, the same way the Tab-to-links
 * one is: an engine that *can* make a context still has its renderer errors
 * counted as failures, because then they are the page's.
 */
const engineHasWebgl2 = await (async () => {
  const page = await browser.newPage();
  try {
    return await page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2'));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  } finally {
    await page.close();
  }
})();

/**
 * three.js refusing to start, in its own words.
 *
 * Only consulted when the engine has already said it has no WebGL2, so these
 * cannot excuse a renderer that failed for some other reason on an engine that
 * has one. What they identify is the *surface* that hit the refusal — the
 * errors that follow are the product's own handling of it, and cannot be
 * recognised by their text.
 */
const RENDERER_CONSOLE = [
  /WebGL context could not be created/i,
  /Error creating WebGL context/i,
  /WebGL creation failed/i,
  /WebGL 1 is not supported/i,
  /AllowWebgl2/i,
];
let engineRendererNote = false;
const problems = [];
const notes = [];
// Set when an engine turned out not to tab to links at all, so the summary can
// say which coverage this run did not have rather than implying it did.
let engineLinkNote = false;
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
    const lifecycleTrace = createLifecycleTrace(page, viewport);
    const fullTabWalk = viewport.width === narrowest || viewport.width === widest;
    // The build asks Google for a webfont. CI has no reason to reach the
    // internet to answer a layout question, and the fallback stack is what a
    // reader with a blocked font sees anyway. Chromium is additionally sealed
    // by `--host-resolver-rules`; this is the part that holds on every engine,
    // so a Firefox or WebKit run is isolated the same way rather than quietly
    // reaching the network.
    await page.route(
      (url) => (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '127.0.0.1',
      (route) => route.abort(),
    );

    for (const surface of surfaces) {
      const where = `${viewport.id} · ${surface.label}`;
      // Printed as it goes: the run takes minutes, and a silent process is
      // indistinguishable from a hung one.
      process.stdout.write(`  ${where}${' '.repeat(Math.max(1, 42 - where.length))}`);
      const startedAt = Date.now();
      const console_ = [];
      const rendererConsole = [];
      const onConsole = (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
        // An engine with no WebGL2 says so through three.js, once per attempt.
        // That is the runner talking, not the page.
        if (!engineHasWebgl2 && RENDERER_CONSOLE.some((pattern) => pattern.test(text))) {
          rendererConsole.push(text);
          return;
        }
        console_.push(text);
      };
      // Everything else logged on a surface whose renderer just failed is the
      // product handling that failure — `landingCirculationDemo`'s catch and
      // the scene bootstrap's — and it cannot be told apart by its text. On
      // Chromium those handlers log the message three.js gave them, which the
      // patterns above match; on Firefox the same handlers log an Error object
      // the console renders as the bare word `Error`. Matching harder is the
      // wrong answer to that: a pattern loose enough to catch `Error` catches
      // everything. So the question asked is which surface, not which words.
      const rendererDown = () => !engineHasWebgl2 && rendererConsole.length > 0;
      const onError = (error) => console_.push(`uncaught: ${error.message}`);
      page.on('console', onConsole);
      page.on('pageerror', onError);

      try {
        // A full load per surface, not a hash change: a defect that only
        // appears on a cold start is exactly the one a user meets first.
        lifecycleTrace?.setPhase(`${surface.id}:about-blank`);
        lifecycleTrace?.record('navigation-start', { to: 'about:blank' });
        await page.goto('about:blank');
        lifecycleTrace?.record('navigation-end', { to: 'about:blank' });
        lifecycleTrace?.setPhase(`${surface.id}:route`);
        lifecycleTrace?.record('navigation-start', { to: `${base}${surface.route}` });
        await page.goto(`${base}${surface.route}`, { waitUntil: 'load', timeout: 30_000 });
        lifecycleTrace?.record('navigation-end', { to: page.url() });
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
        await lifecycleTrace?.snapshot('surface-ready-for-measurement');

        if (lifecycleTrace && diagnosticsWaitDetail && surface.id === 'explorer') {
          await page.waitForFunction(() => {
            const detail = document.querySelector('.landing-demo-viewport')?.dataset.detail;
            return detail === 'ready' || detail === 'unavailable';
          }, null, { timeout: 30_000 }).catch((error) => {
            lifecycleTrace.record('detail-settle-timeout', {
              error: error?.message ?? String(error),
            });
          });
          await lifecycleTrace.snapshot('direct-explorer-detail-settled');
        }

        const measuredSkip = await page.evaluate(() => {
          const target = document.querySelector('[data-skip-target]');
          return {
            hasSkipLink: Boolean(document.querySelector('.skip-link')),
            hasSkipTarget: Boolean(target),
            skipTargetId: target?.id ?? null,
          };
        });

        const kind = surface.needsRenderer ? 'scene' : 'reading';

        // Before anything else opens a panel: the frame has to be the one a
        // reader arrives at, and this check leaves it exactly as it found it.
        if (surface.needsRenderer) {
          const hideUi = await hideUiRoundTrip(page);
          if (!hideUi.control) {
            problems.push(`${where}: a scene surface with no "hide interface" control`);
          } else if (!hideUi.offered) {
            notes.push(`${where}: the "hide interface" control is not offered here — ${hideUi.why}`);
          } else if (!hideUi.hid) {
            problems.push(`${where}: pressing "hide interface" did not hide the interface`);
          } else if (!hideUi.during.seen) {
            problems.push(
              `${where}: hiding the interface hid the only control that brings it back — ` +
                `${hideUi.during.why}`,
            );
          } else if (hideUi.back === false) {
            problems.push(`${where}: the interface did not come back when the control was pressed again`);
          }
        }

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
          tab = await walkTabOrder(page, { steps: tabBudget(controls) });
          if (tab.ending === 'cut') {
            // Only reachable now if a ring cycles without ever repeating a
            // stop, which is what a trap looks like from the outside. Said as
            // what was actually observed rather than as a diagnosis.
            problems.push(
              `${where}: the focus ring visited ${tab.stops} stops without closing or leaving the ` +
                `document, on a page with ${controls} control(s) — focus is trapped or looping`,
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

        // Every surface, not only the ones with a canvas: the console and the
        // selection card parts measure nothing when they are not on the page,
        // and the target sweep is about the landing page and the footers too.
        {
          const phone = await page.evaluate(measurePhoneLayoutInPage, {
            phoneWidth: PHONE_LAYOUT_WIDTH,
            target: PHONE_CONTROL_TARGET,
            interactiveSelector: INTERACTIVE_SELECTOR,
            // Both lists: what is exempt from the 24px floor at any width is
            // exempt from the 44px ambition on a phone, and `PHONE_TARGET`
            // adds the ones that are only exempt from the ambition.
            exemptions: [
              ...exemptionSelectors,
              ...PHONE_TARGET.exemptions.map((exemption) => exemption.selector),
            ],
          });
          for (const problem of phone.problems) problems.push(`${where}: ${problem}`);
        }

        if (measured.englishOnlyAttributes?.length) {
          problems.push(
            `${where}: ${measured.englishOnlyAttributes.length} attribute(s) in English while the ` +
              `interface is Japanese\n    ${measured.englishOnlyAttributes.slice(0, 6).join('\n    ')}`,
          );
        }

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
        // Only when the walk finished. A walk that ran out of budget marked
        // the stops it got to and no more, so every control after that point
        // reads as "never reached" when the truth is "never visited". That is
        // how 46 links and the feedback button were reported as unreachable on
        // a page whose tab order is fine.
        const tabWalkTrustworthy = fullTabWalk && tab?.complete;
        if (tabWalkTrustworthy && measured.unreachable.length) {
          problems.push(
            `${where}: ${measured.unreachable.length} visible control(s) the Tab key never reached` +
              `\n    ${measured.unreachable.slice(0, 6).join('\n    ')}`,
          );
        }
        if (tabWalkTrustworthy && measured.unreachableLinks.length) {
          if (measured.engineSkipsLinks) {
            // Not this page's defect and not silently dropped: link reachability
            // is simply not measurable on an engine that does not tab to links,
            // and the other two engines in the matrix do measure it.
            engineLinkNote = true;
            notes.push(
              `${where}: link focus not measured — ${engine} moved focus to none of ` +
                `${measured.unreachableLinks.length} link(s) while reaching other controls`,
            );
          } else {
            problems.push(
              `${where}: ${measured.unreachableLinks.length} visible link(s) the Tab key never reached` +
                `\n    ${measured.unreachableLinks.slice(0, 6).join('\n    ')}`,
            );
          }
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
          notes.push(
            engineHasWebgl2
              ? `${where}: no WebGL canvas — the renderer fallback was measured instead`
              : `${where}: no WebGL canvas — ${engine} makes no WebGL2 context on this machine, ` +
                'so the renderer fallback was measured instead',
          );
        }
        if (rendererDown()) {
          // Named rather than swallowed, so a run that could not exercise the
          // renderer never looks like one that did — and every line it did not
          // count is printed, including the product's own.
          //
          // The cost, stated: a page error on this surface that had nothing to
          // do with the renderer is noted here instead of failing. It is still
          // shown, and Chromium and WebKit still fail on it — which is the
          // whole reason the matrix drives three engines.
          engineRendererNote = true;
          const downstream = [...rendererConsole, ...console_];
          notes.push(
            `${where}: ${downstream.length} error(s) not counted — ` +
              `${engine} has no WebGL2 here, so the renderer and everything that ` +
              `handled its failure could not be measured\n    ${downstream.slice(0, 3).join('\n    ')}`,
          );
        } else if (console_.length) {
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
          unreachable: tabWalkTrustworthy
            ? measured.unreachable.length + (measured.engineSkipsLinks ? 0 : measured.unreachableLinks.length)
            : null,
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
    await lifecycleTrace?.finish();
    await context.close();
  }
  await captureB1Evidence(browser);
} finally {
  await browser.close();
  closeServer();
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
  engineName === 'chromium'
    ? 'Safari and Firefox — this run drove Chromium. CI runs all three engines.'
    : 'Safari on real iOS: WebKit here is the engine, not the browser or the OS.',
  ...(engineLinkNote
    ? [`Tabbing to links: ${engine} does not, so this run could not measure it.`]
    : []),
  ...(engineRendererNote
    ? [`Anything drawn by the renderer: ${engine} makes no WebGL2 context on this machine.`]
    : []),
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
