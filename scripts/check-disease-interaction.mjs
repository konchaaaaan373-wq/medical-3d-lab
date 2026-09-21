#!/usr/bin/env node
/**
 * Drives disease scenes through baseline → disease → reset, in a real browser.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:disease -- disease-shots copd asthma pulmonary-edema
 *
 * The first argument is the screenshot directory, and it is not optional in
 * practice: the line above used to start at `copd`, which made `copd` the
 * output directory and drove the other two. A run that silently covers one
 * scene fewer than it was asked for reads exactly like a run that passed.
 *
 * ## What it checks, and why it is a script
 *
 * The promise a disease scene makes to a reader is that they can move the model
 * off its baseline, see the difference, and put it back. Every part of that is
 * invisible to `node --test`: the model's own tests check the physiology, and a
 * scene test checks that the scene agrees with the model, but neither can see
 * whether the console's Reset button actually returns the *scene* to where it
 * started. It does not always. This found a COPD Reset that put the four
 * sliders back and left the lung sitting where the reader had driven it,
 * handing back several breaths of negative tidal volume while it emptied.
 *
 * Everything compared is read out of the product's own panels — the stage
 * read-out, the metric figures, the control values — so what is checked is what
 * a reader is shown rather than a state written in from outside.
 *
 * ## What it cannot check
 *
 * That the change is the *right* change. It knows that the numbers moved, not
 * that they moved the way the disease does; that is the model's own tests and a
 * clinical reviewer. And it drives every control to its maximum, which for a
 * scene whose controls include a treatment is not the worst state — read the
 * scene's own tests for the states that matter.
 *
 * ## The video export
 *
 * A second phase, on the scenes that carry a 15-second sequence: enter the
 * sequence, ask for the file, and check that the consent screen refuses until
 * every clause is ticked and that a file with bytes in it actually arrives.
 *
 * It is here rather than in `node --test` because nothing below a real browser
 * can answer the question. `MediaRecorder` over `canvas.captureStream()` is the
 * whole mechanism; a unit test can check which container was asked for and
 * whether the right frames were composited, and cannot check that the browser
 * encoded anything at all. It is here rather than in its own script because
 * these are the same scenes, in the same session, and a second browser check
 * costs four cores and ten minutes of somebody's afternoon.
 *
 * Options:
 *   --engine <name>  chromium (default), firefox or webkit
 *   the scene slugs to drive, as arguments, after an optional output directory
 *   for the screenshots.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as playwright from 'playwright';
import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { videoExportOffered } from '../src/app/videoExport.js';
import { VIDEO_MIME_CANDIDATES } from '../src/app/videoRecorder.js';

/**
 * `--engine chromium|firefox|webkit`, stripped before the positional
 * arguments are read.
 *
 * The export is the reason this exists. `MediaRecorder` over
 * `canvas.captureStream()` is a browser feature, and "it works" was measured
 * on exactly one engine until this flag (F-169). The other two cannot be
 * downloaded in every environment, so the default stays Chromium and the
 * matrix lives in `final-browser-validation.yml`, where the runner can fetch
 * them.
 */
const argv = process.argv.slice(2);
const engineAt = argv.indexOf('--engine');
const engineName = engineAt >= 0 ? argv[engineAt + 1] : 'chromium';
if (engineAt >= 0) argv.splice(engineAt, 2);
if (!['chromium', 'firefox', 'webkit'].includes(engineName)) {
  console.error(`Unknown --engine "${engineName}". Choose one of: chromium, firefox, webkit.`);
  process.exit(1);
}

const distDir = resolve('dist');
const outDir = argv[0] ?? '/tmp/disease-shots';
mkdirSync(outDir, { recursive: true });

// One static server, shared with every other browser check. This file used to
// carry its own, and that copy had no containment check at all: any path that
// resolved outside the build was served. See `lib/serve-dist.mjs`.
const { base: origin, close: closeServer } = await serveDist(distDir);
const base = origin.replace(/\/$/, '');

const SLUGS = argv.slice(1);
const engine = playwright[engineName];
// The fallback resolver is Chromium's alone — it exists for images that ship a
// Chromium under `PLAYWRIGHT_BROWSERS_PATH`. Firefox and WebKit are launched
// the way Playwright wants to launch them.
const browser = await engine.launch(
  engineName === 'chromium' ? { executablePath: chromiumExecutable(engine) } : {}
);
if (engineName !== 'chromium') console.log(`engine: ${engineName}`);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

/**
 * Whether this engine can make a WebGL2 context *here*.
 *
 * Every scene in this check is a 3D scene, so an engine that cannot is not a
 * product failure — it is a machine that cannot run the measurement. Measured
 * (2026-09-21): headless Firefox on a GitHub runner refuses the context, and
 * the run died thirty seconds later saying only that it could not find a
 * canvas. `check-viewports.mjs` answers the same refusal the same way, and
 * says at the end what it therefore did not measure.
 */
const hasWebgl2 = await page.evaluate(() => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
});
if (!hasWebgl2) {
  console.log(
    `\n  note: ${engineName} cannot create a WebGL2 context on this machine, so no scene was driven`
      + ' and no export was measured. Nothing here says anything about the product.'
  );
  await browser.close();
  closeServer();
  process.exit(0);
}

const state = () =>
  page.evaluate(() => {
    const text = (selector) =>
      [...document.querySelectorAll(selector)].map((node) => node.textContent.trim()).join(' | ');
    return {
      stage: text('.stage-name.lang-en'),
      metrics: text('.metrics .metric-figure'),
      controls: [...document.querySelectorAll('.model-control input[type="range"]')].map((el) => el.value).join(','),
      // The progression slider, not a model control. Both carry `slider`; only
      // the small ones inside the model panel carry `slider-sm`, and matching
      // on the shared class drove a respiratory rate while believing it was
      // driving the disease.
      slider: document.querySelector('input.slider:not(.slider-sm)')?.value ?? '',
    };
  });

const setSlider = async (value) => {
  const slider = page.locator('input.slider:not(.slider-sm)').first();
  if (!(await slider.count())) return false;
  await slider.evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(1600);
  return true;
};

const report = [];
/** How many scenes offered an export, and how many produced a file this engine could play. */
let exportsOffered = 0;
let exportsRecorded = 0;
for (const slug of SLUGS) {
  await page.goto(`${base}?preview=1#/${slug}`, { waitUntil: 'networkidle' });
  // And refuse the locked page rather than timing out on a canvas that is not
  // coming. `?preview=1` unlocks a build made with `VITE_ALLOW_PREVIEW=1` and
  // nothing else; against a production build every disease scene answers with
  // "to be updated", and the run used to die 30 seconds later saying only that
  // it could not find a canvas. `capture-phone-states.mjs` refuses the same
  // surface for the same reason.
  if (await page.locator('.locked-copy').count()) {
    console.error(
      `\nThe build does not open ${slug}: it answered with the "to be updated" page.\n\n`
        + '  VITE_ALLOW_PREVIEW=1 npm run build\n'
        + `  npm run verify:disease -- ${outDir} ${SLUGS.join(' ')}\n\n`
        + 'A production build cannot be unlocked by a query parameter — the scene is not in it.'
    );
    await browser.close();
    closeServer();
    process.exit(1);
  }
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2600);
  const consent = page.locator('button', { hasText: '許可しない' });
  if (await consent.count()) await consent.first().click().catch(() => {});
  await page.waitForTimeout(300);

  const problems = [];
  // Read before touching anything: the baseline is the state the scene opens
  // in, not a state this script put it into.
  const baseline = await state();
  const hasSlider = (await page.locator('input.slider:not(.slider-sm)').count()) > 0;
  await page.screenshot({ path: join(outDir, `${slug}-baseline.png`) });

  if (!hasSlider) problems.push('no progression slider');
  await setSlider('1000');

  // Push every model control to its far end as well, where there is one: a
  // scene whose slider is its whole story and a scene whose controls are the
  // story both have to end up somewhere different from where they started.
  const controls = page.locator('.model-control input[type="range"]');
  const controlCount = await controls.count();
  for (let i = 0; i < controlCount; i += 1) {
    await controls.nth(i).evaluate((el) => {
      el.value = el.max;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  await page.waitForTimeout(1800);
  const diseased = await state();
  await page.screenshot({ path: join(outDir, `${slug}-disease.png`) });

  if (JSON.stringify(baseline) === JSON.stringify(diseased)) {
    problems.push('nothing the product displays changed between baseline and disease');
  } else {
    if (hasSlider && baseline.stage === diseased.stage) problems.push('the stage read-out did not move');
    if (baseline.metrics && baseline.metrics === diseased.metrics) problems.push('no metric changed');
  }

  const reset = page.locator('button', { hasText: 'モデル初期化' });
  if (!(await reset.count())) problems.push('no reset control');
  else {
    await reset.first().click();
    // Long enough for a scene with a clock to wash out. COPD's trapped gas
    // leaves over several breaths, which is the physiology and not a failure
    // to reset: what has to be true is that it *does* leave.
    await page.waitForTimeout(12000);
    const back = await state();
    // The progression is damped towards its target, so "back at the start"
    // is a small number rather than exactly the string it started as.
    if (Math.abs(Number(back.slider) - Number(baseline.slider)) > 5) {
      problems.push(`reset left the progression at ${back.slider}, not ${baseline.slider}`);
    }
    if (controlCount && back.controls !== baseline.controls) problems.push('reset did not restore the model controls');
    if (baseline.metrics && back.metrics !== baseline.metrics) {
      problems.push(`reset did not restore the numbers (${baseline.metrics} -> ${back.metrics})`);
    }
  }

  // --- the sequence as a file ---------------------------------------------
  //
  // `videoExportOffered` is the product's own rule, imported rather than
  // restated: whether this scene may hand out a file is decided in one place,
  // and this check reads it instead of keeping a list that would drift.
  const animated = await page.evaluate(() => Boolean(window.__app?.reel));
  // Both halves, the way the app decides it. The release rule is imported from
  // the product; whether this engine can encode at all is asked of the engine.
  // Without the second half, a browser with no usable container would fail
  // here as "the rule says offered" — blaming the release rule for a gap in
  // the browser, which is the kind of report that gets a rule changed.
  const canEncode = await page.evaluate(
    (types) =>
      typeof MediaRecorder !== 'undefined' &&
      typeof document.querySelector('canvas')?.captureStream === 'function' &&
      types.some((type) => MediaRecorder.isTypeSupported?.(type)),
    [...VIDEO_MIME_CANDIDATES]
  );
  const shouldOffer = videoExportOffered(slug, { animated }) && canEncode;
  if (animated && !canEncode) console.log(`  ${slug}: this browser cannot encode a canvas — the download is not offered`);
  const reelButton = page.locator('button[data-control="reel"]');
  if (animated && (await reelButton.count())) {
    await reelButton.first().click();
    await page.waitForTimeout(1200);

    // The sequence's own controls, measured on a phone.
    //
    // `verify:ui` never opens this surface — it measures the app's layouts, and
    // reel mode replaces them (F-170). The row gained a control and ran off
    // both edges of a 390px screen; a photograph found that, and a photograph
    // is not a measurement. This is, and it is here because this is the check
    // that is already inside the sequence.
    problems.push(...(await reachableAt(page, 390, 844, '.reel-chrome', 'the sequence controls')));

    const downloadButton = page.locator('button[data-control="video-download"]');
    const offered = (await downloadButton.count()) > 0;
    if (offered !== shouldOffer) {
      problems.push(`the download button is ${offered ? 'offered' : 'absent'} but the rule says ${shouldOffer ? 'offered' : 'absent'}`);
    }
    if (offered) {
      exportsOffered += 1;
      await downloadButton.first().click();
      await page.waitForSelector('.video-consent-panel', { timeout: 5000 });
      await page.screenshot({ path: join(outDir, `${slug}-video-consent.png`) });
      problems.push(...(await reachableAt(page, 390, 844, '.video-consent-panel', 'the consent screen')));

      // The agree button must be shut until every clause is ticked. This is the
      // half a unit test can also check; it is checked again here because the
      // attribute and the rule are two different things, and what a reader can
      // press is the attribute.
      const agree = page.locator('.video-consent-agree');
      if (!(await agree.isDisabled())) problems.push('the consent screen can be agreed to with nothing ticked');
      const boxes = page.locator('.video-consent-box');
      const boxCount = await boxes.count();
      if (!boxCount) problems.push('the consent screen has no clauses');
      for (let i = 0; i < boxCount; i += 1) await boxes.nth(i).check();
      if (await agree.isDisabled()) problems.push('the consent screen stayed shut with every clause ticked');

      // What the page itself was drawing, just before the recording starts.
      //
      // The first version of this check had an absolute frame-rate floor, and
      // it measured the machine rather than the export: on a software
      // rasteriser the heart runs at 4 frames a second and the brain atlas at
      // 1.5, so their recordings are *faithful* at those rates. The question
      // worth asking is whether the export cost the motion that was there —
      // which is exactly what asking for 1080×1920 on a slow machine does.
      const drawnPerSecond = await page.evaluate(
        () =>
          new Promise((resolve) => {
            let frames = 0;
            const started = performance.now();
            const tick = () => {
              frames += 1;
              if (performance.now() - started < 1500) requestAnimationFrame(tick);
              else resolve(Number((frames / ((performance.now() - started) / 1000)).toFixed(1)));
            };
            requestAnimationFrame(tick);
          })
      );

      const downloadPromise = page.waitForEvent('download', { timeout: 90_000 }).catch(() => null);
      await agree.click();
      const download = await downloadPromise;
      if (!download) problems.push('no file arrived within 90s of agreeing');
      else {
        const name = download.suggestedFilename();
        const saved = join(outDir, `${slug}-${name}`);
        await download.saveAs(saved);
        const { size } = statSync(saved);
        // A container with headers and no frames is a few hundred bytes. A
        // 15-second recording is tens of kilobytes at the very least, so a
        // small file is an empty one however successfully it downloaded.
        if (size < 20_000) problems.push(`the file is ${size} bytes, which is a container with nothing in it`);
        problems.push(...containerProblems(saved, name));
        // Then make the browser open what it just wrote. Size and magic bytes
        // say a file arrived; only decoding it says there are pictures in it,
        // and the extracted frame is the only place anybody can *see* that the
        // captions and the provenance footer were composited in.
        const decoded = await decodeRecording(page, saved, name);
        if (decoded.error) problems.push(`the browser could not play back its own file: ${decoded.error}`);
        else {
          exportsRecorded += 1;
          writeFileSync(join(outDir, `${slug}-video-frame.png`), Buffer.from(decoded.frame.split(',')[1], 'base64'));
          if (!decoded.width || !decoded.height) problems.push('the file decodes to a frame with no size');
          if (decoded.distinctColours < 24) {
            problems.push(`the decoded frame is flat (${decoded.distinctColours} colours): the recording caught nothing`);
          }
          console.log(
            `  ${slug}: ${name} — ${(size / 1024).toFixed(0)} kB, ${decoded.width}×${decoded.height}, `
              + `${decoded.frames} frames (${decoded.fps} fps, page drew ${drawnPerSecond}), `
              + `${Number.isFinite(decoded.duration) ? `${decoded.duration.toFixed(1)}s` : 'duration not written by the recorder'}`
          );
          // Did the export cost the motion that was on screen?
          //
          // Not an absolute floor — that measures the machine, and on a
          // software rasteriser the heart draws at 4 frames a second and the
          // brain atlas at 1.5 whether anything is recording or not.
          //
          // A share of what the page was drawing a moment earlier is the
          // honest line. Measured here, recording at the canvas's own size:
          //
          //   copd            8.6 drawn → 8.2 recorded   0.95
          //   heart failure   8.6 drawn → 4.3 recorded   0.50
          //   brain routes    3.3 drawn → 1.6 recorded   0.48
          //   copd, forced to 1080×1920  8 → 2.4         0.30
          //
          // Compositing costs about half a frame on the heavy scenes, because
          // `drawImage` from a WebGL canvas is a readback without a GPU. So
          // the line goes under that and above the regression worth catching:
          // a threshold at 0.5 would be a coin flip on two of these three.
          if (decoded.frames && drawnPerSecond > 0 && decoded.fps < drawnPerSecond * 0.35) {
            problems.push(
              `the file runs at ${decoded.fps} frames a second while the page was drawing ${drawnPerSecond}`
                + ' — the recording cost the motion that was on screen'
            );
          }
        }
      }
      await page.screenshot({ path: join(outDir, `${slug}-video-recorded.png`) });
    }
    // Back out of the sequence, and check that it actually left.
    //
    // The sequence's caption layer and its control row were appended on the
    // first entry and never removed, so leaving it used to leave both drawn
    // over the interactive scene — cards quoting the last frame's numbers, and
    // a live download button sitting on top of the console. Nothing in CSS hid
    // them and no unit test could see them; this is the level that can.
    const exit = page.locator('.reel-chip.is-exit');
    if (await exit.count()) await exit.first().click();
    await page.waitForTimeout(800);
    const leftOver = await page.evaluate(() =>
      ['.reel-chrome', '.reel-frame']
        .filter((selector) => {
          const node = document.querySelector(selector);
          if (!node) return false;
          const box = node.getBoundingClientRect();
          return getComputedStyle(node).display !== 'none' && box.width > 0 && box.height > 0;
        })
    );
    if (leftOver.length) problems.push(`leaving the sequence left ${leftOver.join(' and ')} on the page`);
    await page.screenshot({ path: join(outDir, `${slug}-after-reel.png`) });
  } else if (shouldOffer) {
    problems.push('the rule offers a video file but the scene has no sequence to record');
  }

  report.push({ slug, controlCount, problems, baseline, diseased });
  if (process.env.VERBOSE) console.log(JSON.stringify({ slug, baseline, diseased }, null, 1));
  console.log(
    `${slug}: ${controlCount} control(s), ${problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'baseline → disease → reset all observed'}`
  );
}

await browser.close();
closeServer();

// And fail when something failed.
//
// Every other browser check in this repository ends this way; this one printed
// `PROBLEMS: …` and exited 0, so a run that found a scene whose Reset did not
// reset — or, since the export landed, one that produced no file, an empty
// container or a frame that would not decode — was green in CI. A check that
// cannot go red is not a check (L-09), and this one had been unable to since
// it was written.
const failed = report.filter((entry) => entry.problems.length);
if (failed.length) {
  console.error(`\n${failed.reduce((total, entry) => total + entry.problems.length, 0)} problem(s) across ${failed.length} scene(s):`);
  for (const entry of failed) {
    for (const problem of entry.problems) console.error(`  - ${entry.slug}: ${problem}`);
  }
  process.exit(1);
}
// What was measured, not only that nothing failed.
//
// `webkit` was green on a run where it recorded nothing at all: the engine
// cannot encode a canvas, so the product does not offer the download, and
// "every export that was offered produced a file" is true of none of them.
// A count is the difference between a green that measured something and a
// green that measured the absence of something.
console.log(
  `\n  ok    ${report.length} scene(s) drove baseline → disease → reset; `
    + `${exportsRecorded} export(s) recorded and played back`
    + (exportsOffered === 0
      ? ` (no scene offered one — ${engineName} cannot encode a canvas here)`
      : exportsRecorded < exportsOffered
        ? ` of ${exportsOffered} offered`
        : '')
);

/**
 * What the first bytes say the file is, against what its name claims.
 *
 * Found by looking: Chromium answers `isTypeSupported('video/mp4')` with
 * `true` on a build with no H.264 encoder and then writes VP9 into an MP4
 * container — a file branded `.mp4` that QuickTime will not open, and which
 * every size check in the world would have passed.
 */
function containerProblems(path, name) {
  const head = readFileSync(path).subarray(0, 64);
  const ascii = head.toString('latin1');
  const problems = [];
  const isMp4 = ascii.slice(4, 8) === 'ftyp';
  const isWebm = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  if (name.endsWith('.mp4') && !isMp4) problems.push('the file is named .mp4 and is not one');
  if (name.endsWith('.webm') && !isWebm) problems.push('the file is named .webm and is not one');
  if (isMp4 && /vp0?9|vp08/.test(ascii)) {
    problems.push('the file is an MP4 holding VP9, which most players refuse — name the codec when claiming MP4');
  }
  return problems;
}

/**
 * Plays the file back in the browser that wrote it and returns one frame.
 *
 * The file goes in as bytes rather than by URL: it has already left the page,
 * and the point is to make the decoder read exactly what landed on disk.
 *
 * `duration` is often not finite — `MediaRecorder` writes WebM without a
 * duration in the header — which is a property of the format, not a fault in
 * the recording, so it is reported rather than judged.
 */
async function decodeRecording(page, path, name) {
  const base64 = readFileSync(path).toString('base64');
  const mimeType = name.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
  return page.evaluate(
    async ({ base64: bytes, mimeType: type }) => {
      try {
        const binary = atob(bytes);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) buffer[i] = binary.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([buffer], { type }));
        const video = document.createElement('video');
        video.muted = true;
        video.src = url;
        await new Promise((resolve, reject) => {
          video.onloadeddata = resolve;
          video.onerror = () => reject(new Error('decode failed'));
          setTimeout(() => reject(new Error('the file never loaded')), 20000);
        });
        // Mid-sequence rather than the first frame: the opening of every reel
        // is a fade from black, which is exactly what a broken recording looks
        // like.
        const target = Number.isFinite(video.duration) ? video.duration / 2 : 7;
        await new Promise((resolve) => {
          video.onseeked = resolve;
          video.currentTime = target;
          setTimeout(resolve, 4000);
        });
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const seen = new Set();
        for (let i = 0; i < data.length; i += 4 * 97) {
          seen.add((data[i] >> 3) * 1024 + (data[i + 1] >> 3) * 32 + (data[i + 2] >> 3));
        }
        const frame = canvas.toDataURL('image/png');

        // How many frames are actually in it.
        //
        // Size and dimensions say nothing about motion: a fifteen-second file
        // of 38 frames decodes, plays, and is a slideshow. `requestVideoFrame`
        // counts what the decoder presents, which is the only honest measure of
        // what was recorded.
        let frames = 0;
        let lastMediaTime = 0;
        if (typeof video.requestVideoFrameCallback === 'function') {
          video.currentTime = 0;
          video.muted = true;
          const counted = new Promise((resolve) => {
            const tick = (_now, meta) => {
              frames += 1;
              lastMediaTime = meta.mediaTime;
              if (!video.ended) video.requestVideoFrameCallback(tick);
            };
            video.requestVideoFrameCallback(tick);
            video.onended = () => resolve();
            setTimeout(resolve, 30000);
          });
          await video.play().catch(() => {});
          await counted;
          video.pause();
        }
        URL.revokeObjectURL(url);
        return {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          distinctColours: seen.size,
          frames,
          fps: lastMediaTime > 0 ? Number((frames / lastMediaTime).toFixed(1)) : 0,
          frame,
        };
      } catch (error) {
        return { error: String(error?.message ?? error) };
      }
    },
    { base64, mimeType }
  );
}

/**
 * Is every control on this surface on the screen, and big enough to hit?
 *
 * Measured at a viewport the caller names, then put back. Two rules, both the
 * product's own: nothing may extend past the viewport's edges, and a button is
 * at least 44px tall. A checkbox is exempt because the row it sits in is the
 * target — `.video-consent-clause` is what a finger lands on, and that is what
 * is measured.
 *
 * `verify:ui` owns these rules everywhere else and cannot reach reel mode,
 * which is why they are also here (F-170).
 */
async function reachableAt(page, width, height, selector, what) {
  const previous = page.viewportSize();
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(700);
  const found = await page.evaluate(
    ({ root, floor }) => {
      const surface = document.querySelector(root);
      if (!surface) return ['is not on the page at all'];
      const out = [];
      const edge = surface.getBoundingClientRect();
      if (edge.left < -0.5 || edge.right > window.innerWidth + 0.5) {
        out.push(`runs from ${Math.round(edge.left)} to ${Math.round(edge.right)} across a ${window.innerWidth}px screen`);
      }
      for (const node of surface.querySelectorAll('button, a[href], .video-consent-clause')) {
        const box = node.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        const name = (node.textContent || node.getAttribute('aria-label') || node.className).trim().slice(0, 28);
        if (box.left < -0.5 || box.right > window.innerWidth + 0.5) {
          out.push(`"${name}" is off the side (${Math.round(box.left)}–${Math.round(box.right)} of ${window.innerWidth})`);
        }
        // A panel that scrolls is allowed to be taller than the screen; its
        // controls are reached by scrolling, so only what cannot scroll counts.
        if ((box.top < -0.5 || box.bottom > window.innerHeight + 0.5) && !node.closest('.video-consent-panel')) {
          out.push(`"${name}" is off the top or bottom (${Math.round(box.top)}–${Math.round(box.bottom)} of ${window.innerHeight})`);
        }
        if (node.tagName === 'BUTTON' && box.height > 0 && box.height < floor) {
          out.push(`"${name}" is ${Math.round(box.height)}px tall, under the ${floor}px floor`);
        }
      }
      return out;
    },
    { root: selector, floor: 44 }
  );
  if (previous) await page.setViewportSize(previous);
  await page.waitForTimeout(500);
  return found.map((problem) => `${what} at ${width}px: ${problem}`);
}
