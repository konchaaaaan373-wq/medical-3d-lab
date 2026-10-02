/**
 * The introductory lesson, driven in a real browser (`layout: 'lesson'`,
 * `src/app/LessonShell.js`). Called by `check-disease-interaction.mjs` for any
 * route that opens a lesson, before it drives that model's `?view=detail`.
 *
 * ## What it checks
 *
 * What a first-time reader meets, at the three windows the owner named
 * (1440×900, 390×844, 375×667), in the lesson's 3D figure (`LessonStage3D`):
 *
 * - the first screen shows the question, the figure, the note on what the
 *   experiment is, and the two things to press — and "compare" is not one of
 *   them yet — without scrolling, and no modal stands over it; on a phone the
 *   heart is drawn at least `HEART_FLOOR_PX` tall;
 * - **one viewpoint, one scale, nothing moves**: the heart, the dial, the jug
 *   and the bundle of small vessels are boxed on the page at A and again at
 *   every scene of the explanation and every state of the buttons — the same
 *   place, the same size — and so are the canvas and the bottom panel. When C
 *   stands beside B, its parts are the same size as B's, at the same height;
 * - **nothing restarts from zero**: while the vessels widen back from B to A
 *   the level never leaves the range between B's and A's, and C arrives
 *   already at its own level — it does not fill from empty (owner's review,
 *   2026-10-02: a length growing again from zero reads as the blood having
 *   stopped);
 * - **C stands beside B and nothing else**: pressed at A and half way to B,
 *   "compare" does nothing; taking the action away while C is shown closes C
 *   at once and returns to A; and C's name says it is not after a drug;
 * - **what is drawn is what was solved**: the level and the needle are read
 *   back **off the screen** — the level's height over the jug's in litres, the
 *   needle's angle in mmHg — and compared with the solver's own results, run
 *   here in Node; so are the vessels' width, the cream marks for A, and the
 *   two numbers on each circulation;
 * - the note on what the experiment is stands on screen in the explanation
 *   and under the buttons alike;
 * - no word in the figure stands on another, or outside it, and the smallest
 *   is drawn at the product's 12 px floor;
 * - the explanation plays every scene in order, its player pauses, steps back
 *   and forward and starts again, and leaving it for the buttons hands over
 *   the state and says what it is;
 * - the heart pumps and the cells flow on the first screen; with reduced
 *   motion asked for, neither moves and the values are still drawn;
 * - a browser that cannot make a WebGL context opens the lesson with the
 *   same circulations drawn flat (`LessonFigure`).
 *
 * It also photographs the figure **with every word and number hidden**, for
 * a person to answer the owner's question by eye: can the place that changed,
 * and that B and C send out different amounts, be read without them?
 *
 * ## Recordings
 *
 * `record` writes two videos per window — the explanation played through, and
 * the reader's buttons — **frame by frame on a fixed clock** (L-172): each
 * frame steps the lesson's clock by 1/30 s, so the recording plays at the speed a
 * reader sees, whatever the machine that made it.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { solveLessonConditions } from '../../src/models/cardiacOutputLesson.js';
import { TEXT_FLOOR } from '../../src/scenes/cardiovascular/scenes/cardiacOutput/lessonFigureGeometry.js';
import { calibreFor } from '../../src/scenes/cardiovascular/scenes/cardiacOutput/lessonModel3D.js';

export const LESSON_WINDOWS = Object.freeze([
  Object.freeze({ width: 1440, height: 900 }),
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 375, height: 667 }),
]);

/** The product's smallest text, in px (`tests/type-floor.test.js`). */
const TEXT_FLOOR_PX = TEXT_FLOOR;

/** How far a box may drift and still be "the same", in px: sub-pixel layout. */
const SAME_SIZE_PX = 0.6;

/**
 * The heart's least height on a phone's first screen, in px. At 375×667 the
 * figure's box is set by what stands under it — the guide and two rows of
 * 44 px buttons — and the two circulations share its width; every row added
 * above or below it shrinks both hearts, and "the same size all the way
 * through" cannot see a row that was there from the first frame. Measured
 * 76 px there on 2026-10-02; the floor is set just under it, so a row that
 * takes the figure's room is said. (At 60 it let a heart drawn 13% smaller
 * through — 66 px — when the check was first broken on purpose.)
 */
const HEART_FLOOR_PX = 72;

/**
 * How much higher C's level stands than B's, at least, in px — the difference
 * the lesson ends on, which a reader is meant to see without the numbers.
 */
const LEVEL_GAP_FLOOR_PX = 10;

/** How close a level read off the screen must be to the solved output, L/min; and a needle to the solved pressure, mmHg. */
const LITRES_READ = 0.06;
const MMHG_READ = 1;

const ready = (page) =>
  page.waitForFunction(() => window.__app?.lesson && !document.getElementById('boot-veil'), null, { timeout: 60000 });

/** The lesson's own view of itself, what the figure says it drew, and what is on the page. */
const read = (page) =>
  page.evaluate(() => {
    const rect = (node) => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height };
    };
    const shown = (selector) => {
      const node = document.querySelector(selector);
      if (!node || node.closest('[hidden], .is-away, [inert]')) return null;
      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') return null;
      const box = rect(node);
      return box.width && box.height ? box : null;
    };
    const figureNode = document.querySelector('[data-lesson-figure]');
    // Every word on the figure, as the box its text is drawn in (not the
    // label's box: the legend's spans the whole width), with the smallest
    // size of any of its text in the language on screen.
    const words = [...figureNode.querySelectorAll('.ls-label')]
      .filter((node) => !node.closest('[hidden]') && node.innerText.trim())
      .map((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sizes = [];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          if (text.textContent.trim() && text.parentElement.getClientRects().length) sizes.push(Number.parseFloat(getComputedStyle(text.parentElement).fontSize));
        }
        return {
          text: node.innerText.trim().replace(/\s+/g, ' '),
          box: rect(range),
          size: Math.min(...sizes),
          slot: node.dataset.slot ?? null,
          part: node.dataset.part ?? null,
          lit: node.classList.contains('is-lit'),
        };
      });
    const said = (slot, part) => words.find((word) => word.slot === slot && word.part === part)?.text ?? null;
    const text = (selector) => {
      const node = document.querySelector(selector);
      return node && !node.closest('.is-away, [inert]') ? node.innerText?.trim() ?? '' : '';
    };
    return {
      state: window.__app.lesson.state(),
      kind: figureNode?.dataset.lessonFigure ?? null,
      figure: rect(figureNode),
      calm: figureNode?.dataset.calm === 'true',
      strips: Number(figureNode?.dataset.strips),
      probe: window.__app.lesson.probe(),
      words,
      said: {
        primary: { title: said('primary', 'title'), map: said('primary', 'gauge'), co: said('primary', 'jug') },
        other: { title: said('other', 'title'), map: said('other', 'gauge'), co: said('other', 'jug') },
      },
      legend: Boolean(shown('.ls-legend')),
      placeholder: Boolean(shown('.ls-placeholder')),
      bottom: rect(document.querySelector('.lesson-bottom')),
      question: shown('.lesson-question'),
      note: shown('.lesson-note'),
      noteText: text('.lesson-note'),
      constrict: shown('[data-lesson="constrict"]'),
      compare: shown('[data-lesson="other"]'),
      compareDisabled: document.querySelector('[data-lesson="other"]')?.disabled ?? null,
      play: shown('.lesson-manual [data-lesson="play"]'),
      caption: text('.lesson-caption-live .lesson-caption-heading'),
      guide: text('.lesson-guide-stack > .lesson-guide:not(.lesson-sizer)'),
      modal: Boolean(document.querySelector('.scene-intro:not([hidden])')),
      detail: document.querySelector('[data-lesson="detail"]')?.getAttribute('href') ?? null,
      scrolls: document.documentElement.scrollHeight > innerHeight + 1,
      width: innerWidth,
      height: innerHeight,
    };
  });

/**
 * Wait for what the lesson says to be true — never for a time (L-123,
 * L-175). Resolves true or false; the checks that follow say what was wrong.
 */
const until = (page, predicate, arg) =>
  page
    .waitForFunction(predicate, arg, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

/**
 * Wait for the lesson to arrive somewhere **and for the figure to have drawn
 * it**: the session is set by a press at once, and the figure eases the
 * vessels, the needle and the level over the frames after — so "at B" is true
 * for a while with the figure still half way, and a check that waited for the
 * session alone read that moment. The beat and the cells never rest; "calm"
 * is the three that ease.
 */
const arrive = (page, { primaryId, showOther, step = undefined }) =>
  until(
    page,
    ({ primaryId, showOther, step }) => {
      const state = window.__app.lesson.state();
      const figure = document.querySelector('[data-lesson-figure]');
      return (
        figure?.dataset.calm === 'true' &&
        (step === undefined || state.step === step) &&
        state.primaryId === primaryId &&
        (showOther == null || state.showOther === showOther) &&
        Number(figure.dataset.strips) === (state.showOther ? 2 : 1)
      );
    },
    { primaryId, showOther, step }
  );

/**
 * The main circulation's level and vessels, every frame, until a walk the
 * reader started has ended and the figure is calm: the least and the most it
 * was drawn at on the way.
 */
const sampleWalk = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const seen = { frames: 0, litres: [Infinity, -Infinity], calibre: [Infinity, -Infinity], heart: [Infinity, -Infinity] };
        const started = performance.now();
        const widen = (pair, value) => [Math.min(pair[0], value), Math.max(pair[1], value)];
        const tick = () => {
          const unit = window.__app.lesson.probe()?.primary;
          if (unit) {
            seen.frames += 1;
            seen.litres = widen(seen.litres, unit.litres);
            seen.calibre = widen(seen.calibre, unit.calibre);
            seen.heart = widen(seen.heart, unit.parts.heart.height);
          }
          const state = window.__app.lesson.state();
          const calm = document.querySelector('[data-lesson-figure]')?.dataset.calm === 'true';
          if ((!state.walking && calm && seen.frames > 2) || performance.now() - started > 15000) resolve(seen);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );

/**
 * Whether the main circulation is alive: over about thirty frames (or eight
 * seconds, on a slow machine), the deepest the heart was squeezed and how far
 * the cells moved. A beat at 70 a minute is 0.86 s of the lesson's clock, and
 * the heart is squeezed for about half of it, so thirty frames see it.
 */
const sampleMotion = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const first = window.__app.lesson.probe()?.primary;
        const seen = { frames: 0, squeeze: 0, moved: 0 };
        const started = performance.now();
        const tick = () => {
          const unit = window.__app.lesson.probe()?.primary;
          if (unit && first) {
            seen.frames += 1;
            seen.squeeze = Math.max(seen.squeeze, unit.squeeze);
            seen.moved = unit.travelled - first.travelled;
          }
          if (seen.frames >= 30 || performance.now() - started > 8000) resolve(seen);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );

const inside = (box, width, height) => box && box.top >= 0 && box.left >= 0 && box.bottom <= height + 1 && box.right <= width + 1;
const sameBox = (a, b) =>
  a && b && ['top', 'left', 'width', 'height'].every((key) => Math.abs(a[key] - b[key]) <= SAME_SIZE_PX);
const sameSize = (a, b) => a && b && Math.abs(a.width - b.width) <= SAME_SIZE_PX && Math.abs(a.height - b.height) <= SAME_SIZE_PX;
const size = (box) => (box ? `${Math.round(box.width)}×${Math.round(box.height)} at ${Math.round(box.left)},${Math.round(box.top)}` : 'nowhere');

/** The boxes that must never change: the figure, its canvas, the main circulation's fixed parts, and the panel under them. */
function boxesOf(seen) {
  const parts = seen.probe?.primary?.parts ?? {};
  return {
    figure: seen.figure,
    canvas: seen.probe?.canvas ?? null,
    bottom: seen.bottom,
    heart: parts.heart ?? null,
    dial: parts.gauge ?? null,
    jug: parts.jug ?? null,
    'small vessels': parts.bed ?? null,
  };
}

function checkSizes(seen, reference, where, problems) {
  const now = boxesOf(seen);
  for (const [name, box] of Object.entries(now)) {
    // The panel under the figure keeps its size; where it stands is the page's.
    const same = name === 'bottom' ? sameSize : sameBox;
    if (!same(box, reference[name])) problems.push(`${where}: the ${name} is drawn ${size(box)}, not the ${size(reference[name])} it is at the start`);
  }
}

/** The words on the figure: inside it, clear of one another, at the floor or above, and only for what is shown. */
function checkWords(seen, where, problems) {
  const { figure, words } = seen;
  if (!words.length) {
    problems.push(`${where}: no words on the figure`);
    return;
  }
  const smallest = Math.min(...words.map((word) => word.size));
  if (smallest < TEXT_FLOOR_PX - 0.25) problems.push(`${where}: the smallest word on the figure is drawn at ${smallest.toFixed(1)} px (floor ${TEXT_FLOOR_PX})`);
  words.forEach((word, i) => {
    if (word.slot === 'other' && word.part !== 'placeholder' && seen.strips < 2) problems.push(`${where}: "${word.text}" is shown although C is not`);
    if (word.part === 'placeholder' && seen.strips > 1) problems.push(`${where}: "${word.text}" still stands where C is`);
    const box = word.box;
    if (box.left < figure.left - 1 || box.right > figure.right + 1 || box.top < figure.top - 1 || box.bottom > figure.bottom + 1) {
      problems.push(`${where}: "${word.text}" stands outside the figure`);
    }
    for (const other of words.slice(i + 1)) {
      const w = Math.min(box.right, other.box.right) - Math.max(box.left, other.box.left);
      const h = Math.min(box.bottom, other.box.bottom) - Math.max(box.top, other.box.top);
      if (w > 1.5 && h > 1.5) problems.push(`${where}: "${word.text}" and "${other.text}" overlap`);
    }
  });
}

/**
 * One circulation as drawn against what was solved: its level and needle read
 * off the screen, its vessels' width, its two numbers, and — when B is
 * compared with A — the cream marks for A.
 */
function checkAgainstSolver(seen, slot, id, solved, where, problems, { before = null } = {}) {
  const unit = seen.probe?.[slot];
  const said = seen.said[slot];
  if (!unit) {
    problems.push(`${where}: ${id} is not drawn`);
    return;
  }
  const m = solved[id].metrics;
  if (!said.title?.startsWith(id)) problems.push(`${where}: the ${slot} circulation is named "${said.title}", expected ${id}`);
  if (said.map !== `${Math.round(m.meanArterialPressureMmHg)} mmHg`) problems.push(`${where}: ${id}'s pressure reads "${said.map}", solved ${m.meanArterialPressureMmHg.toFixed(1)}`);
  if (said.co !== `${m.cardiacOutputLMin.toFixed(1)} L`) problems.push(`${where}: ${id}'s output reads "${said.co}", solved ${m.cardiacOutputLMin.toFixed(2)}`);
  if (!(Math.abs(unit.litres - m.cardiacOutputLMin) <= LITRES_READ)) {
    problems.push(`${where}: ${id}'s jug is filled to ${unit.litres?.toFixed(2)} L on screen, solved ${m.cardiacOutputLMin.toFixed(2)} L`);
  }
  if (!(Math.abs(unit.mmHg - m.meanArterialPressureMmHg) <= MMHG_READ)) {
    problems.push(`${where}: ${id}'s needle points at ${unit.mmHg?.toFixed(1)} mmHg on screen, solved ${m.meanArterialPressureMmHg.toFixed(1)}`);
  }
  const calibre = calibreFor(m.systemicResistanceMmHgSPerMl);
  if (!(Math.abs(unit.calibre - calibre) <= 0.002)) problems.push(`${where}: ${id}'s small vessels are drawn at ${unit.calibre?.toFixed(3)}, not their resistance's ${calibre.toFixed(3)}`);
  if (before) {
    const a = solved[before].metrics;
    if (!(Math.abs(unit.before.litres - a.cardiacOutputLMin) <= LITRES_READ)) problems.push(`${where}: the start (${before}) mark on the jug is missing or not at ${before}'s solved output`);
    if (!(Math.abs(unit.before.mmHg - a.meanArterialPressureMmHg) <= MMHG_READ)) problems.push(`${where}: the start (${before}) needle is missing or not at ${before}'s solved pressure`);
    if (!(Math.abs(unit.before.calibre - calibreFor(a.systemicResistanceMmHgSPerMl)) <= 0.002)) problems.push(`${where}: the small vessels' width at the start (${before}) is not drawn round them`);
  } else if (unit.before.litres != null || unit.before.mmHg != null || unit.before.calibre != null) {
    problems.push(`${where}: ${id} carries marks for a start that is not being compared`);
  }
  if (id === 'C' && !/薬を加えた後ではありません/.test(said.title ?? '')) {
    problems.push(`${where}: C's name does not say it is not after a drug ("${said.title}")`);
  }
}

/** B and C side by side: one scale, one height, and the difference in output there to see. */
function checkSideBySide(seen, where, problems) {
  const b = seen.probe?.primary;
  const c = seen.probe?.other;
  if (!b || !c) {
    problems.push(`${where}: B and C are not both drawn`);
    return;
  }
  for (const part of ['heart', 'gauge', 'jug', 'bed']) {
    const [one, two] = [b.parts[part], c.parts[part]];
    if (!sameSize(one, two) || Math.abs(one.top - two.top) > SAME_SIZE_PX) {
      problems.push(`${where}: B's ${part} (${size(one)}) and C's (${size(two)}) are not drawn to one scale at one height`);
    }
  }
  const gap = c.levelPx - b.levelPx;
  if (gap < LEVEL_GAP_FLOOR_PX) problems.push(`${where}: C's level stands only ${gap.toFixed(1)} px above B's (floor ${LEVEL_GAP_FLOOR_PX})`);
}

/** The note on what the experiment is: on screen, and saying it. */
function checkNote(seen, where, problems) {
  if (!seen.note) problems.push(`${where}: the note on what the experiment is is not on screen`);
  else if (!/模式実験/.test(seen.noteText) || !/全作用/.test(seen.noteText) || !/患者の反応も再現しません/.test(seen.noteText)) {
    problems.push(
      `${where}: the note does not say it is a schematic experiment that is neither the whole drug nor any patient ("${seen.noteText}")`
    );
  }
}

/**
 * Open 「このモデルについて」, photograph it, close it, and say what is wrong
 * with it: the sheet off screen, the lesson's scope not in it, no way to the
 * anatomy anywhere on the page, the figure moved to make room (the sheet lies
 * over the page), or 閉じる that cannot be pressed or does not close.
 *
 * 閉じる is pressed as a reader presses it — at its place on screen — so a
 * panel standing over it is a problem said here rather than a click that
 * waits out its timeout: on a phone the lesson's bottom panel stood over the
 * sheet and took the press (L-166).
 *
 * @param {import('playwright').Page} page
 * @param {() => Promise<unknown>} photograph
 * @returns {Promise<string[]>}
 */
async function checkAbout(page, photograph) {
  const figureBox = () => page.evaluate(() => {
    const box = document.querySelector('[data-lesson-figure]').getBoundingClientRect();
    return { top: box.top, left: box.left, width: box.width, height: box.height };
  });
  const before = await figureBox();
  await page.click('.title-about > .title-trust-summary');
  const problems = [];
  if (!(await until(page, () => document.querySelector('.title-about')?.open))) return ['the line did not open'];
  // Its place is set when it opens (`place()` in TitleCard.js): wait for a box.
  await until(page, () => {
    const box = document.querySelector('.title-about-body')?.getBoundingClientRect();
    return box && box.width > 0 && box.height > 0;
  });
  const seen = await page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      for (let at = node; at && at !== document.body; at = at.parentElement) {
        const style = getComputedStyle(at);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
      }
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const body = document.querySelector('.title-about-body');
    const box = body.getBoundingClientRect();
    return {
      body: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
      scope: Boolean(body.querySelector('.model-scope')) && visible(body.querySelector('.model-scope')),
      anatomy: [...document.querySelectorAll('.title-anatomy-link')].filter(visible).map((node) => node.getAttribute('href')),
      width: innerWidth,
      height: innerHeight,
    };
  });
  const { body } = seen;
  if (body.top < 0 || body.left < 0 || body.right > seen.width + 1 || body.bottom > seen.height + 1) {
    problems.push(`the sheet is not on screen (${Math.round(body.left)},${Math.round(body.top)}–${Math.round(body.right)},${Math.round(body.bottom)})`);
  }
  if (!seen.scope) problems.push('the lesson’s scope is not in the sheet');
  if (!seen.anatomy.some((href) => /heart-anatomy/.test(href ?? ''))) problems.push('no way to the heart’s anatomy is shown, on the title line or in the sheet');
  const after = await figureBox();
  if (['top', 'left', 'width', 'height'].some((key) => Math.abs(after[key] - before[key]) > SAME_SIZE_PX)) {
    problems.push(`the figure moved to make room (${Math.round(before.width)}×${Math.round(before.height)} at ${Math.round(before.top)} → ${Math.round(after.width)}×${Math.round(after.height)} at ${Math.round(after.top)})`);
  }
  await photograph();
  const pressed = await page
    .click('.title-about-close', { timeout: 5000 })
    .then(() => null)
    .catch((error) => (/intercepts pointer events/.test(error.message) ? error.message.match(/<[^>]+>[^\n]*?intercepts pointer events/)?.[0] ?? 'something stands over it' : error.message.split('\n')[0]));
  if (pressed) {
    problems.push(`閉じる cannot be pressed: ${pressed}`);
    // Closed for the rest of the drive, as a reader could still do with Escape.
    await page.keyboard.press('Escape');
    return problems;
  }
  if (!(await until(page, () => !document.querySelector('.title-about')?.open))) problems.push('閉じる did not close it');
  return problems;
}


/** The figure with every word and number hidden, for a person to read by eye. */
async function photographWithoutWords(page, path) {
  const style = await page.addStyleTag({
    content: `.lesson-stage-labels, .lesson-figure-svg text, .lesson-figure-svg .lf-legend { visibility: hidden !important; }
              .lesson-bottom, .lesson-top { visibility: hidden !important; }`,
  });
  await page.screenshot({ path });
  await style.evaluate((node) => node.remove());
}

/**
 * @param {import('playwright').Browser} browser
 * @param {{ url: string, slug: string, outDir: string, record?: boolean, windows?: object[],
 *   drawn?: Array<{ window: string, heart: number, pxPerUnit: number, levelGap: number|null }> }} options
 *   `drawn`, when given, is filled with how big the heart is drawn on each
 *   window's first screen, and how far apart B's and C's levels stand —
 *   printed by the caller, so a change to what stands around the figure (a
 *   header row, a longer note) shows up as a number in the next run rather
 *   than as a guess read off two screenshots.
 * @returns {Promise<string[]>} problems
 */
export async function driveLesson(browser, { url, slug, outDir, record = false, windows = LESSON_WINDOWS, drawn = null }) {
  const problems = [];
  const solved = solveLessonConditions();
  if (record) {
    // Ask the encoder first, with one real frame: an encoder that cannot read
    // the frames used to say so only at the end of a long run (L-176).
    const refused = await probeEncoder(browser, outDir);
    if (refused) {
      problems.push(`recording: the encoder refused a frame before anything was recorded: ${refused}`);
      record = false;
    }
  }
  // --- without WebGL --------------------------------------------------------
  // A browser that cannot make a WebGL context must still open the lesson —
  // with the same circulations drawn flat — rather than the renderer-failure
  // page. Asked of a page whose canvases refuse every WebGL context — what a
  // blocklisted GPU or a hardened browser gives — once, at the first window.
  {
    const page = await browser.newPage({ viewport: windows[0] });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/i.test(String(type)) ? null : getContext.call(this, type, ...rest);
      };
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    const opened = await page
      .waitForFunction(() => window.__app?.lesson && !document.getElementById('boot-veil'), null, { timeout: 30000 })
      .then(() => true, () => false);
    if (!opened) {
      const shown = await page.evaluate(() => (document.querySelector('.scene-fallback') ? 'the renderer-failure page' : 'neither the lesson nor a failure page'));
      problems.push(`without WebGL: the lesson did not open — ${shown} did`);
    } else {
      const figure = await page.evaluate(() => {
        const node = document.querySelector('[data-lesson-figure]');
        const box = node?.getBoundingClientRect();
        return { kind: node?.dataset.lessonFigure ?? null, drawn: Boolean(box?.width && box?.height), strips: Number(node?.dataset.strips) };
      });
      if (figure.kind !== '2d' || !figure.drawn || figure.strips !== 1) {
        problems.push(`without WebGL: the lesson opened without its flat figure (${figure.kind ?? 'none'}, ${figure.strips} drawn)`);
      }
    }
    await page.close();
  }

  // --- with motion reduced ------------------------------------------------------
  // The heart rests and the cells stand; the needle, the level and the vessels
  // still say what the lesson says. Asked once, at the first window, of a page
  // that tells the lesson the reader prefers reduced motion.
  {
    const page = await browser.newPage({ viewport: windows[0], reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle' });
    await ready(page);
    await arrive(page, { primaryId: 'A', showOther: false });
    const motion = await sampleMotion(page);
    if (motion.squeeze > 0 || motion.moved > 0) {
      problems.push(`with motion reduced: the heart squeezed (${motion.squeeze.toFixed(2)}) or the cells moved (${motion.moved.toFixed(3)}) over ${motion.frames} frames`);
    }
    const seen = await read(page);
    if (seen.kind === '3d') checkAgainstSolver(seen, 'primary', 'A', solved, 'with motion reduced', problems);
    await page.close();
  }

  for (const { width, height } of windows) {
    const tag = `${slug}-lesson-${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error?.message ?? error)));
    await page.goto(url, { waitUntil: 'networkidle' });
    await ready(page);
    const where = (moment) => `${width}×${height} ${moment}`;

    // --- the first screen: the buttons, at A ------------------------------------
    await arrive(page, { primaryId: 'A', showOther: false });
    let seen = await read(page);
    await page.screenshot({ path: join(outDir, `${tag}-0-first.png`) });
    if (seen.kind !== '3d' || !seen.probe) {
      problems.push(where(`first screen: the figure is "${seen.kind}", not the 3D circulation`));
      await page.close();
      continue;
    }
    const heartPx = seen.probe.primary.parts.heart.height;
    const measured = { window: `${width}×${height}`, heart: Math.round(heartPx), pxPerUnit: seen.probe.pxPerUnit, levelGap: null };
    drawn?.push(measured);
    if (width <= 430 && heartPx < HEART_FLOOR_PX) {
      problems.push(where(`first screen: the heart is drawn ${Math.round(heartPx)} px tall (floor ${HEART_FLOOR_PX}) — a row above or below the figure took its room`));
    }
    if (seen.modal) problems.push(where('first screen: a modal stands over the lesson'));
    if (seen.scrolls) problems.push(where('first screen: the page scrolls'));
    if (seen.state.mode !== 'manual') problems.push(where(`first screen: opens in "${seen.state.mode}", not at the buttons`));
    for (const [name, box] of Object.entries({ question: seen.question, figure: seen.figure, note: seen.note, constrict: seen.constrict, play: seen.play })) {
      if (!inside(box, width, height)) problems.push(where(`first screen: the ${name} is not on screen without scrolling`));
    }
    for (const [name, box] of Object.entries({ constrict: seen.constrict, play: seen.play })) {
      if (box && box.height < 44) problems.push(where(`first screen: "${name}" is ${Math.round(box.height)} px tall, under 44`));
    }
    if (seen.compare || !seen.compareDisabled) problems.push(where('first screen: "compare with a different circulation" is offered before B'));
    if (!/view=detail/.test(seen.detail ?? '')) problems.push(where('first screen: no way to the full model'));
    if (seen.state.problems.length) problems.push(where(`the lesson's claims do not hold: ${seen.state.problems.join('; ')}`));
    if (seen.strips !== 1 || !seen.legend || !seen.placeholder) problems.push(where('first screen: not one circulation, with its legend and the place kept for C'));
    checkNote(seen, where('first screen'), problems);
    checkWords(seen, where('first screen'), problems);
    checkAgainstSolver(seen, 'primary', 'A', solved, where('first screen'), problems);
    // The heart pumps and the blood flows — what the lesson shows first.
    const motion = await sampleMotion(page);
    if (!(motion.squeeze > 0.2) || !(motion.moved > 0)) {
      problems.push(where(`first screen: the heart is not pumping (deepest squeeze ${motion.squeeze.toFixed(2)}) or the cells are not flowing (moved ${motion.moved.toFixed(3)}) over ${motion.frames} frames`));
    }
    const reference = boxesOf(seen);
    const calibreAtA = seen.probe.primary.calibre;

    // --- C is refused anywhere but at B ------------------------------------------
    await page.evaluate(() => document.querySelector('[data-lesson="other"]').click());
    seen = await read(page);
    if (seen.state.showOther) problems.push(where('buttons: "compare" put C beside A'));

    // --- the reader's buttons -----------------------------------------------------
    await page.click('[data-lesson="constrict"]');
    await until(page, () => window.__app.lesson.state().walking);
    await page.evaluate(() => document.querySelector('[data-lesson="other"]').click());
    seen = await read(page);
    if (seen.state.showOther) problems.push(where('buttons: "compare" put C beside a circulation half way to B'));
    checkSizes(seen, reference, where('buttons, while the vessels narrow'), problems);
    await arrive(page, { primaryId: 'B', showOther: false });
    seen = await read(page);
    if (seen.state.primaryId !== 'B') problems.push(where('buttons: the action did not arrive at B'));
    if (!seen.compare) problems.push(where('buttons: at B, "compare with a different circulation" is not offered'));
    checkNote(seen, where('buttons, B'), problems);
    checkSizes(seen, reference, where('buttons, B'), problems);
    checkWords(seen, where('buttons, B'), problems);
    checkAgainstSolver(seen, 'primary', 'B', solved, where('buttons, B'), problems, { before: 'A' });
    if (!(seen.probe.primary.calibre < calibreAtA)) problems.push(where('buttons, B: the small vessels are not drawn narrower than at A'));
    await page.screenshot({ path: join(outDir, `${tag}-3-B.png`) });

    // C comes in as it is: at its own level from the first frame it is drawn.
    await page.click('[data-lesson="other"]');
    await until(page, () => document.querySelector('[data-lesson-figure]')?.dataset.strips === '2');
    seen = await read(page);
    const first = seen.probe?.other;
    const solvedC = solved.C.metrics.cardiacOutputLMin;
    if (!first || !(Math.abs(first.litres - solvedC) <= LITRES_READ)) {
      problems.push(where(`buttons: C arrived with its jug at ${first?.litres?.toFixed(2)} L, not already at its ${solvedC.toFixed(2)} L — it filled from empty`));
    }
    await arrive(page, { primaryId: 'B', showOther: true });
    seen = await read(page);
    if (!seen.state.showOther || seen.strips !== 2) problems.push(where('buttons: C did not come in beside B'));
    checkNote(seen, where('buttons, B and C'), problems);
    checkSizes(seen, reference, where('buttons, B and C'), problems);
    checkWords(seen, where('buttons, B and C'), problems);
    checkAgainstSolver(seen, 'primary', 'B', solved, where('buttons, B and C'), problems);
    checkAgainstSolver(seen, 'other', 'C', solved, where('buttons, B and C'), problems);
    checkSideBySide(seen, where('buttons, B and C'), problems);
    if (seen.probe?.other && seen.probe?.primary) measured.levelGap = Number((seen.probe.other.levelPx - seen.probe.primary.levelPx).toFixed(1));
    await page.screenshot({ path: join(outDir, `${tag}-4-BC.png`) });
    await photographWithoutWords(page, join(outDir, `${tag}-4-BC-no-words.png`));

    // Taking the action away with C shown: C goes at once, and the vessels
    // widen back to A — the level moving from B's to A's, never through zero.
    await page.click('[data-lesson="constrict"]');
    seen = await read(page);
    if (seen.state.showOther) problems.push(where('buttons: taking the action away left C on screen'));
    const walk = await sampleWalk(page);
    const [coA, coB] = [solved.A.metrics.cardiacOutputLMin, solved.B.metrics.cardiacOutputLMin];
    if (walk.litres[0] < Math.min(coA, coB) - LITRES_READ || walk.litres[1] > Math.max(coA, coB) + LITRES_READ) {
      problems.push(where(`buttons, back to A: the level went to ${walk.litres[0].toFixed(2)}–${walk.litres[1].toFixed(2)} L on the way, outside B's ${coB.toFixed(2)} and A's ${coA.toFixed(2)}`));
    }
    if (walk.heart[1] - walk.heart[0] > SAME_SIZE_PX) problems.push(where(`buttons, back to A: the heart's box changed size on the way (${walk.heart[0].toFixed(1)}–${walk.heart[1].toFixed(1)} px)`));
    await arrive(page, { primaryId: 'A', showOther: false });
    seen = await read(page);
    if (seen.state.primaryId !== 'A' || seen.state.showOther) problems.push(where('buttons: taking the action away did not return to A alone'));
    if (seen.compare) problems.push(where('buttons: back at A, "compare" is offered again'));
    checkSizes(seen, reference, where('buttons, back at A'), problems);
    checkAgainstSolver(seen, 'primary', 'A', solved, where('buttons, back at A'), problems);

    // --- the explanation, scene by scene ---------------------------------------
    await page.click('.lesson-manual [data-lesson="play"]');
    await until(page, () => window.__app.lesson.state().mode === 'explaining');
    seen = await read(page);
    if (seen.state.mode !== 'explaining' || !seen.state.playing) problems.push(where('play: the explanation did not start'));
    const timeline = await page.evaluate(() => window.__app.lesson.timeline);
    for (const [index, step] of timeline.entries()) {
      // Held a second before the scene ends: its change has happened and its
      // words have been up for most of their time.
      await page.evaluate((at) => {
        window.__app.lesson.seek(at);
        window.__app.lesson.pause();
      }, step.until - 1);
      const pair = ['other', 'conclusion'].includes(step.id);
      await arrive(page, { primaryId: step.id === 'start' ? 'A' : 'B', showOther: pair, step: step.id });
      const moment = where(`scene ${index + 1}`);
      seen = await read(page);
      if (seen.state.step !== step.id) problems.push(`${moment}: showed "${seen.state.step}", expected "${step.id}"`);
      if (!seen.caption) problems.push(`${moment}: no words under the figure`);
      if (seen.state.showOther !== pair) problems.push(`${moment}: C ${pair ? 'missing' : 'shown too early'}`);
      checkNote(seen, moment, problems);
      checkSizes(seen, reference, moment, problems);
      checkWords(seen, moment, problems);
      if (step.id === 'start') checkAgainstSolver(seen, 'primary', 'A', solved, moment, problems);
      else if (!pair) checkAgainstSolver(seen, 'primary', 'B', solved, moment, problems, { before: 'A' });
      else {
        checkAgainstSolver(seen, 'primary', 'B', solved, moment, problems);
        checkAgainstSolver(seen, 'other', 'C', solved, moment, problems);
        checkSideBySide(seen, moment, problems);
      }
      await page.screenshot({ path: join(outDir, `${tag}-1-${index + 1}-${step.id}.png`) });
      if (step.id === 'result' || step.id === 'other') {
        await photographWithoutWords(page, join(outDir, `${tag}-1-${index + 1}-${step.id}-no-words.png`));
      }
    }

    // --- the player -----------------------------------------------------------
    // Each press is read once the lesson has drawn the frame after it: the
    // scene a press lands on is set by the next frame, not by the click.
    const step = () => page.evaluate(() => window.__app.lesson.state());
    const landed = (id) => until(page, (wanted) => window.__app.lesson.state().step === wanted, id);
    await page.evaluate((at) => window.__app.lesson.seek(at), timeline[1].at + 1);
    await landed(timeline[1].id);
    await page.click('[data-lesson="toggle"]');
    if (!(await until(page, () => window.__app.lesson.state().playing))) problems.push(where('player: ▶ did not resume'));
    await page.click('[data-lesson="toggle"]');
    if (!(await until(page, () => !window.__app.lesson.state().playing))) problems.push(where('player: ❚❚ did not pause'));
    await page.click('[data-lesson="next"]');
    if (!(await landed(timeline[2].id))) problems.push(where(`player: "next" went to ${(await step()).step}`));
    await page.evaluate((at) => window.__app.lesson.seek(at), timeline[2].at + 0.5);
    await landed(timeline[2].id);
    await page.click('[data-lesson="previous"]');
    if (!(await landed(timeline[1].id))) problems.push(where(`player: "previous" went to ${(await step()).step}`));
    await page.click('[data-lesson="restart"]');
    if (!(await until(page, () => window.__app.lesson.state().t < 1 && window.__app.lesson.state().playing))) {
      problems.push(where('player: "from the start" did not restart'));
    }
    let state;

    // --- handing over, half way through the change -----------------------------
    const constrict = timeline.find((step) => step.id === 'constrict');
    await page.evaluate((at) => {
      window.__app.lesson.seek(at);
      window.__app.lesson.pause();
    }, constrict.at + 2.2);
    await until(page, () => window.__app.lesson.state().step === 'constrict' && window.__app.lesson.state().primaryId === null);
    await page.click('[data-lesson="try-from-player"]');
    await arrive(page, { primaryId: 'B' });
    seen = await read(page);
    if (seen.state.mode !== 'manual') problems.push(where('hand-over: the buttons did not take over'));
    if (seen.state.primaryId !== 'B') problems.push(where(`hand-over: left at ${seen.state.primaryId}, expected B`));
    if (!/説明を止めました|stopped/i.test(seen.guide)) problems.push(where('hand-over: nothing says the explanation stopped and what is on screen'));
    checkSizes(seen, reference, where('hand-over'), problems);
    await page.screenshot({ path: join(outDir, `${tag}-2-handover.png`) });

    // --- 「このモデルについて」 ----------------------------------------------------
    // The lesson's scope and its review state live in the one sheet every
    // disease model opens from its title line (main's rebrand, 2026-09-30); on
    // a phone the way to the heart's anatomy moves in there too (L-165). Opened
    // here because nothing else opens it: `verify:ui` measures closed folds.
    const about = await checkAbout(page, () => page.screenshot({ path: join(outDir, `${tag}-5-about.png`) }));
    for (const problem of about) problems.push(where(`「このモデルについて」: ${problem}`));

    // --- the keyboard ------------------------------------------------------------
    await page.evaluate(() => document.querySelector('.lesson-manual [data-lesson="play"]').focus());
    await page.keyboard.press('Enter');
    await until(page, () => window.__app.lesson.state().mode === 'explaining');
    state = (await read(page)).state;
    if (state.mode !== 'explaining') problems.push(where('keyboard: Enter on "play" did not start the explanation'));

    for (const error of errors) problems.push(where(`page error: ${error}`));
    await page.close();

    if (record) {
      for (const part of ['explanation', 'buttons']) {
        // A recording that fails is reported, not thrown: the checks above
        // have already run, and one missing video must not hide them.
        await recordLesson(browser, { url, width, height, file: join(outDir, `${tag}-${part}.webm`), part }).catch((error) =>
          problems.push(`${width}×${height} recording (${part}) failed: ${error.message}`)
        );
      }
    }
  }
  return problems;
}

/**
 * The encoder Playwright ships. It decodes JPEG and VP8 and nothing else — no
 * PNG — and reads from `file` and `pipe` only, so frames go in as JPEG on
 * `pipe:0`, which is what Playwright's own recorder feeds it.
 */
function ffmpegPath() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '';
  if (!root || !existsSync(root)) return 'ffmpeg';
  const found = readdirSync(root).filter((name) => name.startsWith('ffmpeg')).sort().pop();
  return found ? join(root, found, 'ffmpeg-linux') : 'ffmpeg';
}

/**
 * One setting for the encoder, so the probe asks exactly what the recording
 * will. `pipe:0`, not `-`: the bundled build has the `file` and `pipe`
 * protocols only, and `-` is the `fd` protocol (L-176).
 */
const FPS = 30;
function encoderArgs(file) {
  return ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0', '-c:v', 'libvpx', '-b:v', '2500k', '-auto-alt-ref', '0', file];
}

/** What a frame is taken as: the one format the bundled encoder decodes. */
const FRAME = Object.freeze({ type: 'jpeg', quality: 90 });

function encode(file) {
  const encoder = spawn(ffmpegPath(), encoderArgs(file), { stdio: ['pipe', 'inherit', 'pipe'] });
  let said = '';
  encoder.stderr.on('data', (chunk) => (said += chunk));
  const done = new Promise((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}${said ? `: ${said.trim().split('\n').pop()}` : ''}`))
    );
  });
  // An encoder that has gone away makes every further write an EPIPE; the
  // caller stops feeding it rather than throwing out of its frame loop.
  encoder.stdin.on('error', () => {});
  return { encoder, done };
}

/**
 * Encode two frames of a blank page the way a recording will, and throw them
 * away. Resolves to null when the encoder took them, or to what it said.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} outDir
 */
export async function probeEncoder(browser, outDir) {
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  const file = join(outDir, '.encoder-probe.webm');
  try {
    const { encoder, done } = encode(file);
    // Caught at once: an encoder that refuses the first frame exits while the
    // second is still being taken.
    const said = done.then(
      () => null,
      (error) => error.message
    );
    for (let i = 0; i < 2; i++) encoder.stdin.write(await page.screenshot(FRAME));
    encoder.stdin.end();
    return await said;
  } catch (error) {
    return error.message;
  } finally {
    await page.close();
    rmSync(file, { force: true });
  }
}

/**
 * One recording, frame by frame at 30 per second of the lesson's own clock.
 *
 * @param {import('playwright').Browser} browser
 * @param {{ url: string, width: number, height: number, file: string, part: 'explanation'|'buttons' }} options
 */
export async function recordLesson(browser, { url, width, height, file, part }) {
  const page = await browser.newPage({ viewport: { width, height } });
  const encoding = encode(file);
  const { encoder } = encoding;
  let failed = null;
  const done = encoding.done.catch((error) => {
    failed = error;
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await ready(page);
    // Take the clock: the lesson's own loop stops, and each frame is stepped by
    // exactly 1/30 s (the shell makes no viewer; the figure draws on this clock).
    await page.evaluate((fps) => {
      const clock = window.__app.lesson.clock;
      clock.stop();
      window.__step = () => clock.step(1 / fps);
    }, FPS);

    const frames = async (seconds) => {
      for (let i = 0; i < Math.round(seconds * FPS) && !failed; i++) {
        await page.evaluate(() => window.__step());
        const frame = await page.screenshot(FRAME);
        // A full pipe waits for the encoder to drain it — or to have gone: an
        // encoder that died with the pipe full never drains, and the run would
        // wait for the CI's timeout instead of saying the recording failed.
        if (!encoder.stdin.write(frame)) {
          await new Promise((resolve) => {
            encoder.stdin.once('drain', resolve);
            encoder.once('close', resolve);
          });
        }
      }
    };
    const press = (selector) => page.evaluate((target) => document.querySelector(target).click(), selector);

    await frames(1.5);
    if (part === 'explanation') {
      await press('.lesson-manual [data-lesson="play"]');
      const duration = await page.evaluate(() => window.__app.lesson.duration);
      await frames(duration + 1.5);
    } else {
      // A, the action, B; C beside B; the action taken away (C closes, back to
      // A); and once more to B.
      await frames(1.5);
      await press('[data-lesson="constrict"]');
      await frames(5);
      await press('[data-lesson="other"]');
      await frames(6);
      await press('[data-lesson="constrict"]');
      await frames(4);
      await press('[data-lesson="constrict"]');
      await frames(4.5);
    }
  } finally {
    encoder.stdin.end();
    await done;
    await page.close();
  }
  if (failed) throw failed;
}
