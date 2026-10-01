/**
 * The introductory lesson, driven in a real browser (`layout: 'lesson'`,
 * `src/app/LessonShell.js`). Called by `check-disease-interaction.mjs` for any
 * route that opens a lesson, before it drives that model's `?view=detail`.
 *
 * ## What it checks
 *
 * What a first-time reader meets, at the three windows the owner named
 * (1440×900, 390×844, 375×667):
 *
 * - the first screen shows the question, the figure, the note on what the
 *   experiment is, and the two things to press — and "compare" is not one of
 *   them yet — without scrolling, and no modal stands over it;
 * - **the figure keeps one size**: the heart, the dial, the tube and the
 *   vessels are measured at A and again at every scene of the explanation and
 *   every state of the buttons, and so is the bottom panel. A figure that
 *   shrank as a caption grew is what the owner's review of 2026-10-01 found;
 *   B and C, one above the other, are measured to be drawn at one scale;
 * - **C stands beside B and nothing else**: pressed at A and half way to B,
 *   "compare" does nothing; taking the action away while C is shown closes C
 *   at once and returns to A;
 * - **what is drawn is what was solved**: each strip's numbers, arrows and
 *   drawn lengths are compared with the solver's own results, run here in
 *   Node — the tube's filled length is measured on screen in pixels and read
 *   back as litres;
 * - the note on what the experiment is stands on screen in the explanation
 *   and under the buttons alike;
 * - no word in the figure stands on another, or outside it, and the smallest
 *   is drawn at the product's 12 px floor;
 * - the explanation plays every scene in order, its player pauses, steps back
 *   and forward and starts again, and leaving it for the buttons hands over
 *   the state and says what it is.
 *
 * It also photographs the figure **with every word and number hidden**, for
 * a person to answer the owner's question by eye: can the place that changed,
 * and that B and C send out different amounts, be read without them?
 *
 * ## Recordings
 *
 * `record` writes two videos per window — the explanation played through, and
 * the reader's buttons — **frame by frame on a fixed clock** (L-140): each
 * frame steps the viewer by 1/30 s, so the recording plays at the speed a
 * reader sees, whatever the machine that made it.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { solveLessonConditions } from '../../src/models/cardiacOutputLesson.js';
import { TEXT_FLOOR, TUBE, needleAngle, tubeLength } from '../../src/scenes/cardiovascular/scenes/cardiacOutput/lessonFigureGeometry.js';

export const LESSON_WINDOWS = Object.freeze([
  Object.freeze({ width: 1440, height: 900 }),
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 375, height: 667 }),
]);

/**
 * The product's smallest text, in px (`tests/type-floor.test.js`). The figure
 * is drawn about one unit to one pixel on a phone, so its floor in units is
 * the same number, and one constant holds both.
 */
const TEXT_FLOOR_PX = TEXT_FLOOR;

/** How far a size may drift and still be "the same size", in px: sub-pixel layout. */
const SAME_SIZE_PX = 0.6;

const ready = (page) =>
  page.waitForFunction(() => window.__app?.lesson && !document.getElementById('boot-veil'), null, { timeout: 60000 });

/** The lesson's own view of itself, and what is on the page. */
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
    const svg = document.querySelector('.lesson-figure-svg');
    const figure = rect(svg);
    const strip = (slot) => {
      const group = svg.querySelector(`.lf-strip[data-slot="${slot}"]`);
      if (!group || getComputedStyle(group).display === 'none') return null;
      const part = (selector) => rect(group.querySelector(selector));
      return {
        id: group.dataset.id,
        map: group.dataset.map,
        co: group.dataset.co,
        lumen: Number(group.dataset.lumen),
        needleAngle: Number(group.dataset.needleAngle),
        tube: Number(group.dataset.tube),
        beforeTube: group.dataset.beforeTube ? Number(group.dataset.beforeTube) : null,
        mapArrow: group.querySelector('.lf-map-value .lf-value-arrow')?.textContent ?? '',
        coArrow: group.querySelector('.lf-co-value .lf-value-arrow')?.textContent ?? '',
        // The heart's outline beats; its name does not, and stands at its middle.
        heart: part('.lf-heart-label'),
        dial: part('.lf-dial-face'),
        tubeBox: part('.lf-tube'),
        fill: part('.lf-tube-fill'),
        bed: part('.lf-bed'),
        disc: part('.lf-name-disc'),
      };
    };
    // Every word drawn in the figure, as boxes on screen — and whether the
    // strip it belongs to is one the figure shows. An SVG child set `visible`
    // is drawn through a hidden parent (L-153), so "drawn" is asked of the
    // word itself and "shown" of its strip, separately.
    const words = [...svg.querySelectorAll('text')]
      .filter((node) => {
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && node.textContent.trim() && !node.closest('[display="none"]');
      })
      .map((node) => {
        const group = node.closest('.lf-strip');
        const groupStyle = group ? getComputedStyle(group) : null;
        return {
          text: node.textContent.trim(),
          box: rect(node),
          size: Number.parseFloat(getComputedStyle(node).fontSize),
          strip: group?.dataset.slot ?? null,
          stripShown: !group || (groupStyle.display !== 'none' && groupStyle.visibility !== 'hidden'),
        };
      });
    const scale = figure.width / svg.viewBox.baseVal.width;
    const text = (selector) => {
      const node = document.querySelector(selector);
      return node && !node.closest('.is-away, [inert]') ? node.innerText?.trim() ?? '' : '';
    };
    return {
      state: window.__app.lesson.state(),
      figure,
      scale: Math.min(scale, figure.height / svg.viewBox.baseVal.height),
      strips: Number(svg.dataset.strips),
      legend: getComputedStyle(svg.querySelector('.lf-legend')).display !== 'none',
      primary: strip('primary'),
      other: strip('other'),
      words,
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
 * L-143). Resolves true or false; the checks that follow say what was wrong.
 */
const until = (page, predicate, arg) =>
  page
    .waitForFunction(predicate, arg, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

/**
 * Wait for the lesson to arrive somewhere **and for the figure to have drawn
 * it**. The press that brings C in sets the session at once, before the next
 * frame has drawn anything or started C's tube filling — so "C shown, tube
 * full" was true for one moment with the figure still showing B alone, and a
 * check that waited for the session alone read that moment.
 */
const arrive = (page, { primaryId, showOther }) =>
  until(
    page,
    ({ primaryId, showOther }) => {
      const state = window.__app.lesson.state();
      const svg = document.querySelector('.lesson-figure-svg');
      const drawn = Number(svg?.dataset.strips);
      return (
        svg?.dataset.calm === 'true' &&
        state.primaryId === primaryId &&
        (showOther == null || state.showOther === showOther) &&
        drawn === (state.showOther ? 2 : 1) &&
        state.refill === 1
      );
    },
    { primaryId, showOther }
  );

const inside = (box, width, height) => box && box.top >= 0 && box.left >= 0 && box.bottom <= height + 1 && box.right <= width + 1;
const same = (a, b) => a && b && Math.abs(a.width - b.width) <= SAME_SIZE_PX && Math.abs(a.height - b.height) <= SAME_SIZE_PX;

/** The sizes that must never change: of the figure, its fixed parts, and the panel under it. */
function sizesOf(seen) {
  return {
    figure: seen.figure,
    bottom: seen.bottom,
    heart: seen.primary?.heart,
    name: seen.primary?.disc,
    dial: seen.primary?.dial,
    tube: seen.primary?.tubeBox,
    bed: seen.primary?.bed,
  };
}

function checkSizes(seen, reference, where, problems) {
  const now = sizesOf(seen);
  for (const [name, box] of Object.entries(now)) {
    if (!same(box, reference[name])) {
      problems.push(
        `${where}: the ${name} is drawn ${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'nowhere'}, ` +
          `not the ${Math.round(reference[name].width)}×${Math.round(reference[name].height)} it is at the start`
      );
    }
  }
  // The main circulation never moves either.
  if (seen.primary && reference.name && Math.abs(seen.primary.disc.top - reference.nameTop) > SAME_SIZE_PX) {
    problems.push(`${where}: the main circulation moved (${Math.round(reference.nameTop)} → ${Math.round(seen.primary.disc.top)} px)`);
  }
}

/** The words in the figure: inside it, clear of one another, at the floor or above. */
function checkWords(seen, where, problems) {
  const { figure, words, scale } = seen;
  const smallest = Math.min(...words.map((word) => word.size)) * scale;
  if (seen.width <= 430 && smallest < TEXT_FLOOR_PX - 0.25) {
    problems.push(`${where}: the smallest word in the figure is drawn at ${smallest.toFixed(1)} px (floor ${TEXT_FLOOR_PX})`);
  }
  words.forEach((word, i) => {
    if (!word.stripShown) problems.push(`${where}: "${word.text}" is drawn although its circulation (${word.strip}) is not shown`);
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
 * What is drawn against what was solved: the numbers, the arrows, and the
 * lengths as the screen has them.
 */
function checkAgainstSolver(strip, id, solved, where, problems, { before = null } = {}) {
  if (!strip) {
    problems.push(`${where}: no strip for ${id}`);
    return;
  }
  const m = solved[id].metrics;
  if (strip.id !== id) problems.push(`${where}: the strip shows "${strip.id}", expected ${id}`);
  if (strip.map !== String(Math.round(m.meanArterialPressureMmHg))) problems.push(`${where}: ${id}'s pressure reads ${strip.map}, solved ${m.meanArterialPressureMmHg.toFixed(1)}`);
  if (strip.co !== m.cardiacOutputLMin.toFixed(1)) problems.push(`${where}: ${id}'s output reads ${strip.co}, solved ${m.cardiacOutputLMin.toFixed(2)}`);
  if (Math.abs(strip.tube - tubeLength(m.cardiacOutputLMin)) > 0.02) problems.push(`${where}: ${id}'s tube is drawn ${strip.tube} units, not its solved output's length`);
  if (Math.abs(strip.needleAngle - needleAngle(m.meanArterialPressureMmHg)) > 0.01) problems.push(`${where}: ${id}'s needle is not at its solved pressure`);
  // Read back off the screen: the filled length over the tube's, in litres.
  const shownLitres = (strip.fill.width / strip.tubeBox.width) * TUBE.maxLitres;
  if (Math.abs(shownLitres - m.cardiacOutputLMin) > 0.06) {
    problems.push(`${where}: ${id}'s tube is filled to ${shownLitres.toFixed(2)} L on screen, solved ${m.cardiacOutputLMin.toFixed(2)} L`);
  }
  if (before) {
    const a = solved[before].metrics;
    const mapArrow = m.meanArterialPressureMmHg > a.meanArterialPressureMmHg ? '↑' : '↓';
    const coDirection = Math.round(m.cardiacOutputLMin * 10) - Math.round(a.cardiacOutputLMin * 10);
    const coArrow = coDirection > 0 ? '↑' : coDirection < 0 ? '↓' : '→';
    if (strip.mapArrow !== mapArrow) problems.push(`${where}: the pressure's arrow says "${strip.mapArrow}", the solver went ${mapArrow}`);
    if (strip.coArrow !== coArrow) problems.push(`${where}: the output's arrow says "${strip.coArrow}", the solver went ${coArrow}`);
    if (strip.beforeTube == null || Math.abs(strip.beforeTube - tubeLength(a.cardiacOutputLMin)) > 0.02) {
      problems.push(`${where}: the start (A) mark on the tube is missing or not at A's solved output`);
    }
  } else if (strip.mapArrow || strip.coArrow || strip.beforeTube != null) {
    problems.push(`${where}: ${id} carries a comparison with the start that is not on screen`);
  }
}

/** The note on what the experiment is: on screen, and saying it. */
function checkNote(seen, where, problems) {
  if (!seen.note) problems.push(`${where}: the note on what the experiment is is not on screen`);
  else if (!/模式実験/.test(seen.noteText) || !/全作用は再現しません/.test(seen.noteText)) {
    problems.push(`${where}: the note does not say it is a schematic experiment that is not the whole drug ("${seen.noteText}")`);
  }
}

/** The figure with every word and number hidden, for a person to read by eye. */
async function photographWithoutWords(page, path) {
  const style = await page.addStyleTag({
    content: `.lesson-figure-svg text, .lesson-figure-svg .lf-legend { visibility: hidden !important; }
              .lesson-bottom, .lesson-top { visibility: hidden !important; }`,
  });
  await page.screenshot({ path });
  await style.evaluate((node) => node.remove());
}

/**
 * @param {import('playwright').Browser} browser
 * @param {{ url: string, slug: string, outDir: string, record?: boolean, windows?: object[] }} options
 * @returns {Promise<string[]>} problems
 */
export async function driveLesson(browser, { url, slug, outDir, record = false, windows = LESSON_WINDOWS }) {
  const problems = [];
  const solved = solveLessonConditions();
  if (record) {
    // Ask the encoder first, with one real frame: an encoder that cannot read
    // the frames used to say so only at the end of a long run (L-144).
    const refused = await probeEncoder(browser, outDir);
    if (refused) {
      problems.push(`recording: the encoder refused a frame before anything was recorded: ${refused}`);
      record = false;
    }
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
    let seen = await read(page);
    await page.screenshot({ path: join(outDir, `${tag}-0-first.png`) });
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
    if (seen.strips !== 1 || !seen.legend) problems.push(where('first screen: not one circulation with the legend under it'));
    checkNote(seen, where('first screen'), problems);
    checkWords(seen, where('first screen'), problems);
    checkAgainstSolver(seen.primary, 'A', solved, where('first screen'), problems);
    const reference = { ...sizesOf(seen), nameTop: seen.primary.disc.top, lumen: seen.primary.lumen };

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
    checkAgainstSolver(seen.primary, 'B', solved, where('buttons, B'), problems, { before: 'A' });
    if (seen.primary.lumen >= reference.lumen) problems.push(where('buttons, B: the vessels are not drawn narrower than at A'));
    await page.screenshot({ path: join(outDir, `${tag}-3-B.png`) });

    await page.click('[data-lesson="other"]');
    await arrive(page, { primaryId: 'B', showOther: true });
    seen = await read(page);
    if (!seen.state.showOther || seen.strips !== 2) problems.push(where('buttons: C did not come in beside B'));
    if (seen.legend) problems.push(where('buttons: the legend still stands where C should be'));
    checkNote(seen, where('buttons, B and C'), problems);
    checkSizes(seen, reference, where('buttons, B and C'), problems);
    checkWords(seen, where('buttons, B and C'), problems);
    checkAgainstSolver(seen.primary, 'B', solved, where('buttons, B and C'), problems);
    checkAgainstSolver(seen.other, 'C', solved, where('buttons, B and C'), problems);
    // One scale for both: the same parts at the same size.
    for (const part of ['heart', 'dial', 'tubeBox', 'bed', 'disc']) {
      if (!same(seen.primary?.[part], seen.other?.[part])) problems.push(where(`buttons, B and C: B's ${part} and C's are not drawn to one scale`));
    }
    if (seen.other && seen.primary && seen.other.fill.width - seen.primary.fill.width < 25) {
      problems.push(where(`buttons, B and C: C's tube is only ${Math.round(seen.other.fill.width - seen.primary.fill.width)} px longer than B's`));
    }
    await page.screenshot({ path: join(outDir, `${tag}-4-BC.png`) });
    await photographWithoutWords(page, join(outDir, `${tag}-4-BC-no-words.png`));

    // Taking the action away with C shown: C goes at once, and the walk ends at A.
    await page.click('[data-lesson="constrict"]');
    seen = await read(page);
    if (seen.state.showOther) problems.push(where('buttons: taking the action away left C on screen'));
    await arrive(page, { primaryId: 'A', showOther: false });
    seen = await read(page);
    if (seen.state.primaryId !== 'A' || seen.state.showOther) problems.push(where('buttons: taking the action away did not return to A alone'));
    if (seen.compare) problems.push(where('buttons: back at A, "compare" is offered again'));
    checkSizes(seen, reference, where('buttons, back at A'), problems);

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
      await until(
        page,
        ({ id, primaryId, showOther }) => {
          const state = window.__app.lesson.state();
          const svg = document.querySelector('.lesson-figure-svg');
          const drawn = Number(svg?.dataset.strips);
          return svg?.dataset.calm === 'true' && state.step === id && state.primaryId === primaryId && state.showOther === showOther && drawn === (showOther ? 2 : 1) && state.refill === 1;
        },
        { id: step.id, primaryId: step.id === 'start' ? 'A' : 'B', showOther: pair }
      );
      const moment = where(`scene ${index + 1}`);
      seen = await read(page);
      if (seen.state.step !== step.id) problems.push(`${moment}: showed "${seen.state.step}", expected "${step.id}"`);
      if (!seen.caption) problems.push(`${moment}: no words under the figure`);
      if (seen.state.showOther !== pair) problems.push(`${moment}: C ${pair ? 'missing' : 'shown too early'}`);
      checkNote(seen, moment, problems);
      checkSizes(seen, reference, moment, problems);
      checkWords(seen, moment, problems);
      if (step.id === 'start') checkAgainstSolver(seen.primary, 'A', solved, moment, problems);
      else if (!pair) checkAgainstSolver(seen.primary, 'B', solved, moment, problems, { before: 'A' });
      else {
        checkAgainstSolver(seen.primary, 'B', solved, moment, problems);
        checkAgainstSolver(seen.other, 'C', solved, moment, problems);
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
 * protocols only, and `-` is the `fd` protocol (L-144).
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
    // Take the clock: the viewer's own loop stops, and each frame is stepped by
    // exactly 1/30 s.
    await page.evaluate((fps) => {
      const viewer = window.__app.viewer;
      viewer.stop();
      viewer.clock.getDelta = () => 1 / fps;
      window.__step = () => viewer._tick();
    }, FPS);

    const frames = async (seconds) => {
      for (let i = 0; i < Math.round(seconds * FPS) && !failed; i++) {
        await page.evaluate(() => window.__step());
        const frame = await page.screenshot(FRAME);
        if (!encoder.stdin.write(frame)) await new Promise((resolve) => encoder.stdin.once('drain', resolve));
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
