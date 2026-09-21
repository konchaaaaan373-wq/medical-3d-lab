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
 * Options: the scene slugs to drive, as arguments, after an optional output
 * directory for the screenshots.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { videoExportOffered } from '../src/app/videoExport.js';

const distDir = resolve('dist');
const outDir = process.argv[2] ?? '/tmp/disease-shots';
mkdirSync(outDir, { recursive: true });

// One static server, shared with every other browser check. This file used to
// carry its own, and that copy had no containment check at all: any path that
// resolved outside the build was served. See `lib/serve-dist.mjs`.
const { base: origin, close: closeServer } = await serveDist(distDir);
const base = origin.replace(/\/$/, '');

const SLUGS = process.argv.slice(3);
// Same resolver as every other browser check; `CHROMIUM_PATH` still wins.
const browser = await chromium.launch({ executablePath: chromiumExecutable(chromium) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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
for (const slug of SLUGS) {
  await page.goto(`${base}?preview=1#/${slug}`, { waitUntil: 'networkidle' });
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
  const shouldOffer = videoExportOffered(slug, { animated });
  const reelButton = page.locator('button[data-control="reel"]');
  if (animated && (await reelButton.count())) {
    await reelButton.first().click();
    await page.waitForTimeout(1200);
    const downloadButton = page.locator('button[data-control="video-download"]');
    const offered = (await downloadButton.count()) > 0;
    if (offered !== shouldOffer) {
      problems.push(`the download button is ${offered ? 'offered' : 'absent'} but the rule says ${shouldOffer ? 'offered' : 'absent'}`);
    }
    if (offered) {
      await downloadButton.first().click();
      await page.waitForSelector('.video-consent-panel', { timeout: 5000 });
      await page.screenshot({ path: join(outDir, `${slug}-video-consent.png`) });

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
          writeFileSync(join(outDir, `${slug}-video-frame.png`), Buffer.from(decoded.frame.split(',')[1], 'base64'));
          if (!decoded.width || !decoded.height) problems.push('the file decodes to a frame with no size');
          if (decoded.distinctColours < 24) {
            problems.push(`the decoded frame is flat (${decoded.distinctColours} colours): the recording caught nothing`);
          }
          console.log(
            `  ${slug}: ${name} — ${(size / 1024).toFixed(0)} kB, ${decoded.width}×${decoded.height}, `
              + `${Number.isFinite(decoded.duration) ? `${decoded.duration.toFixed(1)}s` : 'duration not written by the recorder'}`
          );
        }
      }
      await page.screenshot({ path: join(outDir, `${slug}-video-recorded.png`) });
    }
    // Back out of the sequence so the page is where the next scene expects it.
    const exit = page.locator('.reel-chip.is-exit');
    if (await exit.count()) await exit.first().click();
    await page.waitForTimeout(600);
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
        URL.revokeObjectURL(url);
        return { duration: video.duration, width: video.videoWidth, height: video.videoHeight, distinctColours: seen.size, frame };
      } catch (error) {
        return { error: String(error?.message ?? error) };
      }
    },
    { base64, mimeType }
  );
}
