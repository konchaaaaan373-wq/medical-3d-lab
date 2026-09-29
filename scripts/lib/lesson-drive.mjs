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
 * - the first screen shows the question, the model, both results and both
 *   ways in, without scrolling, and no modal stands over it;
 * - the explanation plays every scene in order on the same model, and its
 *   player pauses, steps back and forward, and starts again;
 * - the model keeps a band at every scene — a band that collapsed to a
 *   hundred pixels on a 375×667 phone while two circulations were side by
 *   side is what this was written after — and every tag on it stays inside
 *   that band and clear of the other tags;
 * - leaving the explanation for the buttons hands over the state and says
 *   what it is; the two buttons and "start over" do what they say, and "before"
 *   is shown only while B stands alone;
 * - the way to the full model is there and says where it goes.
 *
 * ## Recordings
 *
 * `record` writes two videos per window — the explanation played through, and
 * the reader's buttons — **frame by frame on a fixed clock**. Headless software
 * GL draws this scene at 3–5 frames a second on a desktop window, and the
 * viewer clamps a frame's time step to 0.1 s, so a live screen recording plays
 * the beat at under half speed and the explanation takes twice as long as it
 * does for a reader. Stepping the viewer at 1/30 s and encoding each frame
 * gives the timing a reader sees; what it cannot show is how smooth a real
 * device is, which is a different question.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const LESSON_WINDOWS = Object.freeze([
  Object.freeze({ width: 1440, height: 900 }),
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 375, height: 667 }),
]);

/** The smallest band, in px, the model may be left in on each kind of window. */
const MIN_BAND = { phone: 150, desktop: 360 };

const ready = (page) =>
  page.waitForFunction(() => window.__app?.lesson && !document.getElementById('boot-veil'), null, { timeout: 60000 });

/** The lesson's own view of itself, and what is on the page. */
const read = (page) =>
  page.evaluate(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node || node.hidden || node.closest('[hidden]')) return null;
      const box = node.getBoundingClientRect();
      return box.width && box.height ? { top: box.top, bottom: box.bottom, left: box.left, right: box.right, height: box.height } : null;
    };
    const tags = [...document.querySelectorAll('.lesson-tags .lesson-tag-item:not([hidden]) > .lesson-tag, .lesson-tags .lesson-tag-item:not([hidden]) > .lesson-unit-chip')]
      .map((node) => node.getBoundingClientRect())
      .map((box) => ({ top: box.top, bottom: box.bottom, left: box.left, right: box.right }));
    const text = (selector) => document.querySelector(selector)?.innerText?.trim() ?? '';
    return {
      state: window.__app.lesson.state(),
      band: window.__app.lesson.band(),
      question: rect('.lesson-question'),
      readout: rect('.lesson-readout'),
      play: rect('[data-lesson="play"]'),
      tryIt: rect('[data-lesson="try"]'),
      caption: text('.lesson-caption-heading'),
      guide: text('.lesson-guide'),
      rows: [...document.querySelectorAll('.lesson-row')].map((row) => row.dataset.card),
      modal: Boolean(document.querySelector('.scene-intro:not([hidden])')),
      detail: document.querySelector('[data-lesson="detail"]')?.getAttribute('href') ?? null,
      scrolls: document.documentElement.scrollHeight > innerHeight + 1,
      tags,
      width: innerWidth,
      height: innerHeight,
    };
  });

const inside = (box, width, height) => box && box.top >= 0 && box.left >= 0 && box.bottom <= height + 1 && box.right <= width + 1;

function checkBand(seen, where, problems) {
  const phone = seen.width <= 430;
  const height = seen.band.bottom - seen.band.top;
  const floor = phone ? MIN_BAND.phone : MIN_BAND.desktop;
  if (height < floor) problems.push(`${where}: the model is left a ${Math.round(height)} px band (at least ${floor} px expected)`);
  seen.tags.forEach((tag, i) => {
    if (tag.top < seen.band.top - 2 || tag.bottom > seen.band.bottom + 2 || tag.left < -1 || tag.right > seen.width + 1) {
      problems.push(`${where}: a tag on the model stands outside the band the panels leave`);
    }
    for (const other of seen.tags.slice(i + 1)) {
      const overlap = Math.min(tag.right, other.right) - Math.max(tag.left, other.left) > 2 && Math.min(tag.bottom, other.bottom) - Math.max(tag.top, other.top) > 2;
      if (overlap) problems.push(`${where}: two tags on the model overlap`);
    }
  });
}

/**
 * @param {import('playwright').Browser} browser
 * @param {{ url: string, slug: string, outDir: string, record?: boolean, windows?: object[] }} options
 * @returns {Promise<string[]>} problems
 */
export async function driveLesson(browser, { url, slug, outDir, record = false, windows = LESSON_WINDOWS }) {
  const problems = [];
  for (const { width, height } of windows) {
    const tag = `${slug}-lesson-${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error?.message ?? error)));
    await page.goto(url, { waitUntil: 'networkidle' });
    await ready(page);
    await page.waitForTimeout(1200);
    const where = (moment) => `${width}×${height} ${moment}`;

    // --- the first screen -----------------------------------------------------
    let seen = await read(page);
    await page.screenshot({ path: join(outDir, `${tag}-0-first.png`) });
    if (seen.modal) problems.push(where('first screen: a modal stands over the lesson'));
    if (seen.scrolls) problems.push(where('first screen: the page scrolls'));
    for (const [name, box] of Object.entries({ question: seen.question, results: seen.readout, play: seen.play, 'try it': seen.tryIt })) {
      if (!inside(box, width, height)) problems.push(where(`first screen: ${name} is not on screen without scrolling`));
    }
    for (const [name, box] of Object.entries({ play: seen.play, 'try it': seen.tryIt })) {
      if (box && box.height < 44) problems.push(where(`first screen: "${name}" is ${Math.round(box.height)} px tall, under 44`));
    }
    if (!/view=detail/.test(seen.detail ?? '')) problems.push(where('first screen: no way to the full model'));
    if (seen.state.problems.length) problems.push(where(`the lesson's claims do not hold: ${seen.state.problems.join('; ')}`));
    checkBand(seen, where('first screen'), problems);

    // --- the explanation, scene by scene ---------------------------------------
    await page.click('[data-lesson="play"]');
    await page.waitForTimeout(400);
    seen = await read(page);
    if (seen.state.mode !== 'explaining' || !seen.state.playing) problems.push(where('play: the explanation did not start'));
    const timeline = await page.evaluate(() => window.__app.lesson.timeline);
    for (const [index, step] of timeline.entries()) {
      await page.evaluate((at) => window.__app.lesson.seek(at), step.until - 1);
      await page.waitForTimeout(1600);
      await page.evaluate((at) => {
        window.__app.lesson.seek(at);
        window.__app.lesson.pause();
      }, step.until - 1);
      await page.waitForTimeout(700);
      seen = await read(page);
      if (seen.state.step !== step.id) problems.push(where(`scene ${index + 1}: showed "${seen.state.step}", expected "${step.id}"`));
      if (!seen.caption) problems.push(where(`scene ${index + 1}: no words under the model`));
      const pair = ['other', 'conclusion'].includes(step.id);
      if (seen.state.showOther !== pair) problems.push(where(`scene ${index + 1}: C ${pair ? 'missing' : 'shown too early'}`));
      if (pair && !seen.rows.includes('C')) problems.push(where(`scene ${index + 1}: C has no row in the results`));
      if (step.id === 'result' && !seen.rows.includes('before')) problems.push(where('scene 3: B is not read against "before (A)"'));
      if (pair && seen.rows.includes('before')) problems.push(where(`scene ${index + 1}: "before (A)" is shown beside C`));
      checkBand(seen, where(`scene ${index + 1}`), problems);
      await page.screenshot({ path: join(outDir, `${tag}-1-${index + 1}-${step.id}.png`) });
    }

    // --- the player -----------------------------------------------------------
    await page.evaluate(() => window.__app.lesson.seek(10));
    await page.click('[data-lesson="toggle"]');
    let state = (await read(page)).state;
    if (!state.playing) problems.push(where('player: ▶ did not resume'));
    await page.click('[data-lesson="toggle"]');
    state = (await read(page)).state;
    if (state.playing) problems.push(where('player: ❚❚ did not pause'));
    await page.click('[data-lesson="next"]');
    state = (await read(page)).state;
    if (state.step !== timeline[2].id) problems.push(where(`player: "next" went to ${state.step}`));
    await page.evaluate(() => window.__app.lesson.seek(window.__app.lesson.timeline[2].at + 0.5));
    await page.click('[data-lesson="previous"]');
    state = (await read(page)).state;
    if (state.step !== timeline[1].id) problems.push(where(`player: "previous" went to ${state.step}`));
    await page.click('[data-lesson="restart"]');
    state = (await read(page)).state;
    if (!(state.t < 1 && state.playing)) problems.push(where('player: "from the start" did not restart'));

    // --- handing over, half way through the change -----------------------------
    const constrict = timeline.find((step) => step.id === 'constrict');
    await page.evaluate((at) => {
      window.__app.lesson.seek(at);
      window.__app.lesson.pause();
    }, constrict.at + 3.1);
    await page.waitForTimeout(300);
    await page.click('[data-lesson="try-from-player"]');
    await page.waitForTimeout(2200);
    seen = await read(page);
    if (seen.state.mode !== 'manual') problems.push(where('hand-over: the buttons did not take over'));
    if (seen.state.primaryId !== 'B') problems.push(where(`hand-over: left at ${seen.state.primaryId}, expected B`));
    if (!/説明を止めました|stopped/i.test(seen.guide)) problems.push(where('hand-over: nothing says the explanation stopped and what is on screen'));
    await page.screenshot({ path: join(outDir, `${tag}-2-handover.png`) });

    // --- the reader's buttons ---------------------------------------------------
    await page.click('[data-lesson="reset"]');
    await page.waitForTimeout(400);
    seen = await read(page);
    if (seen.state.primaryId !== 'A' || seen.state.showOther) problems.push(where('start over: not back at A alone'));
    await page.click('[data-lesson="constrict"]');
    await page.waitForTimeout(2200);
    seen = await read(page);
    if (seen.state.primaryId !== 'B') problems.push(where('buttons: the vasoconstrictor action did not arrive at B'));
    if (!seen.rows.includes('before')) problems.push(where('buttons: B alone is not read against "before (A)"'));
    checkBand(seen, where('buttons, B'), problems);
    await page.screenshot({ path: join(outDir, `${tag}-3-B.png`) });
    await page.click('[data-lesson="other"]');
    await page.waitForTimeout(2200);
    seen = await read(page);
    if (!seen.state.showOther || !seen.rows.includes('C')) problems.push(where('buttons: C did not appear'));
    if (seen.rows.includes('before')) problems.push(where('buttons: "before (A)" is shown beside C'));
    checkBand(seen, where('buttons, B and C'), problems);
    await page.screenshot({ path: join(outDir, `${tag}-4-BC.png`) });
    await page.click('[data-lesson="constrict"]');
    await page.waitForTimeout(2200);
    seen = await read(page);
    if (seen.state.primaryId !== 'A') problems.push(where('buttons: taking the action away did not return to A'));

    // --- the keyboard ------------------------------------------------------------
    await page.click('[data-lesson="reset"]');
    await page.evaluate(() => document.querySelector('[data-lesson="play-from-manual"]').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    state = (await read(page)).state;
    if (state.mode !== 'explaining') problems.push(where('keyboard: Enter on "play" did not start the explanation'));

    for (const error of errors) problems.push(where(`page error: ${error}`));
    await page.close();

    if (record) {
      await recordLesson(browser, { url, width, height, file: join(outDir, `${tag}-explanation.webm`), part: 'explanation' });
      await recordLesson(browser, { url, width, height, file: join(outDir, `${tag}-buttons.webm`), part: 'buttons' });
    }
  }
  return problems;
}

/** The encoder Playwright ships, which reads PNG frames and writes VP8. */
function ffmpegPath() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '';
  if (!root || !existsSync(root)) return 'ffmpeg';
  const found = readdirSync(root).filter((name) => name.startsWith('ffmpeg')).sort().pop();
  return found ? join(root, found, 'ffmpeg-linux') : 'ffmpeg';
}

/**
 * One recording, frame by frame at 30 per second of the lesson's own clock.
 *
 * @param {import('playwright').Browser} browser
 * @param {{ url: string, width: number, height: number, file: string, part: 'explanation'|'buttons' }} options
 */
export async function recordLesson(browser, { url, width, height, file, part }) {
  const FPS = 30;
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready(page);
  await page.waitForTimeout(800);
  // Take the clock: the viewer's own loop stops, and each frame is stepped by
  // exactly 1/30 s.
  await page.evaluate((fps) => {
    const viewer = window.__app.viewer;
    viewer.stop();
    viewer.clock.getDelta = () => 1 / fps;
    window.__step = () => viewer._tick();
  }, FPS);

  const encoder = spawn(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libvpx', '-b:v', '2500k', '-auto-alt-ref', '0', file], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const done = new Promise((resolve, reject) => {
    encoder.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  const frames = async (seconds) => {
    for (let i = 0; i < Math.round(seconds * FPS); i++) {
      await page.evaluate(() => window.__step());
      const png = await page.screenshot({ type: 'png' });
      if (!encoder.stdin.write(png)) await new Promise((resolve) => encoder.stdin.once('drain', resolve));
    }
  };
  const press = (selector) => page.evaluate((target) => document.querySelector(target).click(), selector);

  await frames(1.5);
  if (part === 'explanation') {
    await press('[data-lesson="play"]');
    const duration = await page.evaluate(() => window.__app.lesson.duration);
    await frames(duration + 1.5);
  } else {
    await press('[data-lesson="try"]');
    await frames(2.5);
    await press('[data-lesson="constrict"]');
    await frames(5);
    await press('[data-lesson="other"]');
    await frames(6);
    await press('[data-lesson="constrict"]');
    await frames(4);
    await press('[data-lesson="constrict"]');
    await frames(4);
    await press('[data-lesson="reset"]');
    await frames(2);
  }
  encoder.stdin.end();
  await done;
  await page.close();
}
