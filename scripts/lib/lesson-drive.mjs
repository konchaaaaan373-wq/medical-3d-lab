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
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { waitForCameraToSettle } from './camera.mjs';

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
    const tags = [...document.querySelectorAll('.lesson-tags .lesson-tag-item:not([hidden])')].map((item) => {
      const box = item.querySelector(':scope > .lesson-tag, :scope > .lesson-unit-chip').getBoundingClientRect();
      // The points it names, as drawn: the dot at the end of each line.
      const dots = [...item.querySelectorAll(':scope > .lesson-tag-dot:not([hidden])')].map((dot) => {
        const r = dot.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      return { key: item.dataset.tag, top: box.top, bottom: box.bottom, left: box.left, right: box.right, dots };
    });
    const text = (selector) => document.querySelector(selector)?.innerText?.trim() ?? '';
    return {
      state: window.__app.lesson.state(),
      band: window.__app.lesson.band(),
      question: rect('.lesson-question'),
      readout: rect('.lesson-readout'),
      play: rect('[data-lesson="play"]'),
      tryIt: rect('[data-lesson="try"]'),
      caption: text('.lesson-caption-heading'),
      // What the vasoconstrictor action is and is not, under the results.
      caveat: text('.lesson-readout .lesson-caveat'),
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

/**
 * Wait for the lesson to arrive somewhere — a state, never a time (L-123,
 * L-143). The walk from A to B is 1.4 s of the lesson's own clock, and on
 * software GL at three frames a second that is several seconds of wall time.
 */
const arrive = (page, { primaryId, showOther }) =>
  page
    .waitForFunction(
      ({ primaryId, showOther }) => {
        const state = window.__app.lesson.state();
        return state.primaryId === primaryId && (showOther == null || state.showOther === showOther);
      },
      { primaryId, showOther },
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);

/**
 * Wait for what the lesson says to be true — never for a time. Resolves true
 * or false; the checks that follow say what was wrong.
 */
const until = (page, predicate, arg) =>
  page
    .waitForFunction(predicate, arg, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

/**
 * The camera at rest before anything is measured: showing or hiding C refits
 * and tweens it, and a band, a tag or a pixel read mid-tween is a reading of
 * nothing (CLAUDE.md, the 124 px vs 0 px example). A camera that never
 * settles is reported, not waited through.
 */
async function settled(page, where, problems) {
  const ok = await waitForCameraToSettle(page)
    .then(() => true)
    .catch(() => false);
  if (!ok) problems.push(`${where}: the camera never came to rest, so nothing here was measured at rest`);
}

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
    // A tag pushed back into the band can land on the very point it names —
    // at 1440×900 「一斉に細くなる＝血管抵抗↑」 did, and on the edge of the
    // vessels with it, with every other check here green.
    if (tag.dots.some((dot) => dot.x > tag.left + 1 && dot.x < tag.right - 1 && dot.y > tag.top + 1 && dot.y < tag.bottom - 1)) {
      problems.push(`${where}: the tag "${tag.key}" covers the point it names`);
    }
    for (const other of seen.tags.slice(i + 1)) {
      const overlap = Math.min(tag.right, other.right) - Math.max(tag.left, other.left) > 2 && Math.min(tag.bottom, other.bottom) - Math.max(tag.top, other.top) > 2;
      if (overlap) problems.push(`${where}: two tags on the model overlap`);
    }
  });
}

/**
 * How much of each word on the model stands over the model itself. The tags
 * are hidden, the page is photographed, and every pixel under each tag's box
 * is sorted into model or background: the circulations are drawn in warm or
 * bright colours on a blue-black ground, so "red clearly above blue, or bright"
 * is the model. The glow round a highlighted part counts as model, which errs
 * towards reporting. Decoded in the page, as `lib/frames.mjs` does.
 *
 * A tag may reach over the model a little — its line has to start somewhere —
 * but one that stands on what it is about hides it (L-146).
 */
const MODEL_UNDER_TAG = 0.2;
async function checkCover(page, seen, where, problems) {
  const boxes = seen.tags.map(({ key, left, top, right, bottom }) => ({ key, left, top, right, bottom }));
  if (!boxes.length) return;
  await page.evaluate(() => document.querySelector('.lesson-tags')?.style.setProperty('visibility', 'hidden'));
  const shot = await page.screenshot({ type: 'png' });
  await page.evaluate(() => document.querySelector('.lesson-tags')?.style.removeProperty('visibility'));
  const shares = await page.evaluate(
    async ({ url, boxes }) => {
      const image = await new Promise((done, fail) => {
        const img = new Image();
        img.onload = () => done(img);
        img.onerror = fail;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const scale = image.width / innerWidth;
      return boxes.map(({ key, left, top, right, bottom }) => {
        const x = Math.max(0, Math.round(left * scale));
        const y = Math.max(0, Math.round(top * scale));
        const w = Math.min(image.width, Math.round(right * scale)) - x;
        const h = Math.min(image.height, Math.round(bottom * scale)) - y;
        if (w <= 0 || h <= 0) return { key, share: 0 };
        const data = context.getImageData(x, y, w, h).data;
        let model = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          if ((r > 60 && r > b + 12) || r + g + b > 330) model += 1;
        }
        return { key, share: model / (w * h) };
      });
    },
    { url: `data:image/png;base64,${shot.toString('base64')}`, boxes }
  );
  for (const { key, share } of shares) {
    if (share > MODEL_UNDER_TAG) problems.push(`${where}: the tag "${key}" stands over the model (${Math.round(share * 100)}% of it)`);
  }
}

/**
 * @param {import('playwright').Browser} browser
 * @param {{ url: string, slug: string, outDir: string, record?: boolean, windows?: object[] }} options
 * @returns {Promise<string[]>} problems
 */
export async function driveLesson(browser, { url, slug, outDir, record = false, windows = LESSON_WINDOWS }) {
  const problems = [];
  if (record) {
    // Ask the encoder first, with one real frame: the drive and the recordings
    // take half an hour, and an encoder that cannot read the frames used to
    // say so only at the end of it (L-144).
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
    await settled(page, where('first screen'), problems);

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
    if (seen.caveat) problems.push(where('first screen: the caveat about the vasoconstrictor action is shown before it is applied'));
    if (seen.state.problems.length) problems.push(where(`the lesson's claims do not hold: ${seen.state.problems.join('; ')}`));
    checkBand(seen, where('first screen'), problems);
    await checkCover(page, seen, where('first screen'), problems);

    // --- the explanation, scene by scene ---------------------------------------
    await page.click('[data-lesson="play"]');
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
          return state.step === id && state.primaryId === primaryId && state.showOther === showOther;
        },
        { id: step.id, primaryId: step.id === 'start' ? 'A' : 'B', showOther: pair }
      );
      await settled(page, where(`scene ${index + 1}`), problems);
      seen = await read(page);
      if (seen.state.step !== step.id) problems.push(where(`scene ${index + 1}: showed "${seen.state.step}", expected "${step.id}"`));
      if (!seen.caption) problems.push(where(`scene ${index + 1}: no words under the model`));
      if (seen.state.showOther !== pair) problems.push(where(`scene ${index + 1}: C ${pair ? 'missing' : 'shown too early'}`));
      if (pair && !seen.rows.includes('C')) problems.push(where(`scene ${index + 1}: C has no row in the results`));
      if (step.id === 'result' && !seen.rows.includes('before')) problems.push(where('scene 3: B is not read against "before (A)"'));
      if (pair && seen.rows.includes('before')) problems.push(where(`scene ${index + 1}: "before (A)" is shown beside C`));
      // Beside every result the action made, in the explanation too (owner's review, 2026-09-30).
      const applied = step.id !== 'start';
      if (applied && !/模式実験/.test(seen.caveat)) problems.push(where(`scene ${index + 1}: B is on screen and nothing under the results says it is a schematic experiment`));
      if (!applied && seen.caveat) problems.push(where(`scene ${index + 1}: the caveat is shown for A`));
      checkBand(seen, where(`scene ${index + 1}`), problems);
      await checkCover(page, seen, where(`scene ${index + 1}`), problems);
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
    // Half way through the walk: between A and B, which is the point of the check.
    await until(page, () => window.__app.lesson.state().step === 'constrict' && window.__app.lesson.state().primaryId === null);
    await page.click('[data-lesson="try-from-player"]');
    await arrive(page, { primaryId: 'B' });
    seen = await read(page);
    if (seen.state.mode !== 'manual') problems.push(where('hand-over: the buttons did not take over'));
    if (seen.state.primaryId !== 'B') problems.push(where(`hand-over: left at ${seen.state.primaryId}, expected B`));
    if (!/説明を止めました|stopped/i.test(seen.guide)) problems.push(where('hand-over: nothing says the explanation stopped and what is on screen'));
    await page.screenshot({ path: join(outDir, `${tag}-2-handover.png`) });

    // --- the reader's buttons ---------------------------------------------------
    await page.click('[data-lesson="reset"]');
    await arrive(page, { primaryId: 'A', showOther: false });
    seen = await read(page);
    if (seen.state.primaryId !== 'A' || seen.state.showOther) problems.push(where('start over: not back at A alone'));
    await page.click('[data-lesson="constrict"]');
    await arrive(page, { primaryId: 'B' });
    await settled(page, where('buttons, B'), problems);
    seen = await read(page);
    if (seen.state.primaryId !== 'B') problems.push(where('buttons: the vasoconstrictor action did not arrive at B'));
    if (!seen.rows.includes('before')) problems.push(where('buttons: B alone is not read against "before (A)"'));
    if (!/模式実験/.test(seen.caveat) || !/全作用は再現しません/.test(seen.caveat)) {
      problems.push(where(`buttons: B's results do not say what the action is and is not (“${seen.caveat}”)`));
    }
    checkBand(seen, where('buttons, B'), problems);
    await checkCover(page, seen, where('buttons, B'), problems);
    await page.screenshot({ path: join(outDir, `${tag}-3-B.png`) });
    await page.click('[data-lesson="other"]');
    await arrive(page, { primaryId: 'B', showOther: true });
    await settled(page, where('buttons, B and C'), problems);
    seen = await read(page);
    if (!seen.state.showOther || !seen.rows.includes('C')) problems.push(where('buttons: C did not appear'));
    if (seen.rows.includes('before')) problems.push(where('buttons: "before (A)" is shown beside C'));
    if (!/模式実験/.test(seen.caveat)) problems.push(where('buttons: beside C, B\'s results lost the caveat'));
    checkBand(seen, where('buttons, B and C'), problems);
    await checkCover(page, seen, where('buttons, B and C'), problems);
    await page.screenshot({ path: join(outDir, `${tag}-4-BC.png`) });
    await page.click('[data-lesson="constrict"]');
    await arrive(page, { primaryId: 'A' });
    seen = await read(page);
    if (seen.state.primaryId !== 'A') problems.push(where('buttons: taking the action away did not return to A'));
    if (seen.caveat) problems.push(where('buttons: back at A, the caveat is still shown'));

    // --- the keyboard ------------------------------------------------------------
    await page.click('[data-lesson="reset"]');
    await page.evaluate(() => document.querySelector('[data-lesson="play-from-manual"]').focus());
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
    await waitForCameraToSettle(page).catch(() => {});
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
  } finally {
    encoder.stdin.end();
    await done;
    await page.close();
  }
  if (failed) throw failed;
}
