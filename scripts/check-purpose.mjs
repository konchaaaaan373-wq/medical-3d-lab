#!/usr/bin/env node
/**
 * Drives the two purposes — patient explanation and medical education — in a
 * real browser: the entrances, the header, the switch, the address, and the
 * gates.
 *
 *   npm run build:preview && npm run verify:purpose -- --dist dist-preview --preview
 *   npm run build         && npm run verify:purpose            # the released product
 *
 * ## What it holds
 *
 * **On a preview build** (where authored patient explanations can be read):
 *
 * - `#/patient` lists questions, and each opens its model with `?purpose=patient`;
 * - the model opens in patient explanation: the header reads 患者説明 › the
 *   question, its switch has 患者説明 pressed, the explanation is open, and it
 *   sits *beside or under* the model — not over the header, and not over the
 *   middle of the model;
 * - the switch, pressed from the keyboard, goes to medical education on the
 *   same model: the address loses `?purpose=`, the explanation closes, the
 *   header reads 医学教育 › …, and the camera has not moved;
 * - a condition changed in medical education does not come along into patient
 *   explanation: the model goes back to where it starts, and a notice says so;
 * - Back returns to patient explanation, and a reload keeps it;
 * - without the entitlement (`?entitled=0`) patient explanation shows its lock
 *   and opens the plan, never the explanation;
 * - a model with no patient explanation, asked for one, opens in education,
 *   says so, and corrects its address.
 *
 * **On the released build**: no purpose appears anywhere — no 患者説明 in any
 * header, no purpose chooser on the landing page, `#/patient` says that none
 * is open — and a released model asked for patient explanation refuses. That
 * is the gate this check exists to watch: *a header switch must never open a
 * patient explanation the release and the clinical review have not opened.*
 *
 * Viewports: 1280×800, 390×844, 375×667. One run at a time (software GL).
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --preview       the build has VITE_ALLOW_PREVIEW=1; unlock it
 *   --scene <slug>  the dual-purpose model to drive (default: heart-failure)
 *   --shots <dir>   write a screenshot at each state
 *   --headed        show the browser
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { stubPaidSurfaces } from './lib/stub-paid-surfaces.mjs';
import { waitForCameraToSettle } from './lib/camera.mjs';

import { patientExplanationScenes } from '../src/access/patientPurpose.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const preview = flag('--preview');
const sceneSlug = value('--scene', 'heart-failure');
const shotsDir = value('--shots');
if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`No build at "${distDir}".`);
  process.exit(1);
}
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
  console.error('Playwright is not installed, so nothing was driven.  npm i --no-save playwright');
  process.exit(1);
}

const { base, close: closeServer } = await serveDist(distDir);
const browser = await chromium.launch({ executablePath: chromiumExecutable(chromium), headless: !flag('--headed') });

const problems = [];
const observed = [];
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
];

const url = (hash, extra = '') => {
  const query = [preview ? 'preview=1' : '', extra].filter(Boolean).join('&');
  return `${base}/${query ? `?${query}` : ''}${hash}`;
};

async function declineConsent(page) {
  const consent = page.locator('button:has-text("No thanks"), button:has-text("同意しない")').first();
  await consent.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await consent.isVisible().catch(() => false)) await consent.click().catch(() => {});
}

async function openScene(page, hash, extra) {
  await page.goto(url(hash, extra), { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__app?.scene), null, { timeout: 60000 });
  await declineConsent(page);
}

/** Wait for the purpose controller to have answered the address. */
const waitForPurpose = (page, purpose) =>
  page
    .waitForFunction((want) => document.getElementById('ui')?.dataset.purpose === want, purpose, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

const readState = (page) =>
  page.evaluate(() => {
    const ui = document.getElementById('ui');
    const rect = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || node.closest('[hidden]')) return null;
      const box = node.getBoundingClientRect();
      return box.width && box.height ? { left: box.left, top: box.top, right: box.right, bottom: box.bottom } : null;
    };
    const pressed = document.querySelector('.global-nav-purpose-option[aria-pressed="true"]');
    const patientCrumb = document.querySelector('.global-nav-current.is-patient');
    const guide = document.querySelector('.patient-guide');
    const canvas = document.querySelector('canvas');
    return {
      hash: location.hash,
      purpose: ui?.dataset.purpose ?? null,
      pressed: pressed?.dataset.purpose ?? null,
      // Where the location is said: the header on a wide screen, the title
      // card on a phone (the header there is the mark, the switch, the menu).
      patientCrumb: (() => {
        const titlePurpose = document.querySelector('.title-purpose');
        const shown = [patientCrumb, titlePurpose].find((node) => node && rect(node));
        return shown ? shown.innerText.replace(/\s+/g, ' ').trim() : null;
      })(),
      guideOpen: ui?.classList.contains('is-patient-guide') ?? false,
      header: rect(document.querySelector('.global-scene-nav')),
      guide: rect(guide),
      titleCard: rect(document.querySelector('.title-card')),
      canvas: rect(canvas),
      notice: (() => {
        const notice = document.querySelector('.purpose-notice');
        return notice && !notice.hidden ? notice.innerText.trim() : null;
      })(),
      bar: rect(document.querySelector('.purpose-patient-bar')),
      lockShown: Boolean(rect(document.querySelector('.purpose-patient-open .feature-lock'))),
      purchaseOpen: Boolean(document.querySelector('.access-modal:not([hidden])')),
      controls: (window.__app.scene.getModelControls?.() ?? []).map(({ id, value }) => [id, value]),
      camera: window.__app.viewer.camera.position.toArray(),
      target: window.__app.viewer.controls.target.toArray(),
    };
  });

const overlaps = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

async function shot(page, name) {
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) });
}

function expect(condition, message) {
  if (!condition) problems.push(message);
  return condition;
}

// ------------------------------------------------------------ preview build

async function drivePreview(viewport) {
  const tag = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await stubPaidSurfaces(page);

  // 1. The patient entrance lists questions, and each opens its model in
  //    patient explanation.
  await page.goto(url('#/patient'), { waitUntil: 'load' });
  await page.waitForSelector('.patient-question, .explorer-empty', { timeout: 20000 });
  const cards = await page.$$eval('.patient-question', (links) => links.map((link) => link.getAttribute('href')));
  expect(cards.length > 0, `${tag}: #/patient lists no question on a preview build`);
  expect(
    cards.every((href) => /\?purpose=patient$/.test(href)),
    `${tag}: a question on #/patient does not open its model in patient explanation`
  );
  const target = cards.find((href) => href.startsWith(`#/${sceneSlug}?`));
  expect(Boolean(target), `${tag}: #/patient does not list ${sceneSlug}`);
  await shot(page, `${tag}-patient-index`);

  // 2. Arrive by the entrance: patient explanation, open, beside the model.
  await openScene(page, target ?? `#/${sceneSlug}?purpose=patient`);
  expect(await waitForPurpose(page, 'patient'), `${tag}: the model did not open in patient explanation`);
  await page.waitForFunction(() => document.getElementById('ui')?.classList.contains('is-patient-guide'), null, { timeout: 15000 }).catch(() => {});
  let state = await readState(page);
  expect(state.pressed === 'patient', `${tag}: the header's switch does not say 患者説明 is on (${state.pressed})`);
  expect(Boolean(state.patientCrumb?.startsWith('患者説明') || state.patientCrumb?.startsWith('Patient')), `${tag}: the location does not read 患者説明 › … (${state.patientCrumb})`);
  expect(state.guideOpen, `${tag}: an entitled reader's patient explanation did not open`);
  expect(!overlaps(state.header, state.guide), `${tag}: the explanation covers the header`);
  if (state.canvas && state.guide) {
    const centre = { x: (state.canvas.left + state.canvas.right) / 2, y: (state.canvas.top + state.canvas.bottom) / 2 };
    // The model is framed a little above the middle on a phone; the guide may
    // take the lower part of the frame but not its middle.
    const middle = { left: centre.x - 20, right: centre.x + 20, top: centre.y - 120, bottom: centre.y - 80 };
    expect(!overlaps(middle, state.guide), `${tag}: the explanation sits over the middle of the model`);
  }
  if (viewport.width > 900) {
    expect(!overlaps(state.titleCard, state.guide), `${tag}: the explanation covers the title card`);
  }
  await shot(page, `${tag}-patient`);
  observed.push(`${tag}: #/patient → ${sceneSlug} opens in patient explanation (${state.patientCrumb})`);

  // 3. The switch, from the keyboard: medical education, the same model and
  //    the same viewpoint.
  await waitForCameraToSettle(page).catch(() => {});
  // A viewpoint of the reader's own — closer and higher than any framing the
  // scene or the explanation declares. Without it this measured nothing: the
  // explanation's first step frames the model exactly as the scene does, so a
  // switch that threw the reader's view away and one that kept it read the
  // same (L-128).
  //
  // Taken the way a reader takes it — a drag on the model — because the scene
  // re-frames a camera nobody has touched whenever the panels change size,
  // and only a drag (or a pinch, a wheel) tells it the view is the reader's.
  const grab = await page.evaluate(() => {
    const canvas = document.querySelector('canvas').getBoundingClientRect();
    const guide = document.querySelector('.patient-guide')?.getBoundingClientRect();
    const right = guide && guide.left > canvas.width / 2 ? guide.left : canvas.right;
    const bottom = guide && guide.top > canvas.height / 3 ? guide.top : canvas.bottom;
    return { x: (canvas.left + right) / 2, y: Math.max(canvas.top + 140, (canvas.top + bottom) / 2 - 40) };
  });
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x - 40, grab.y + 30, { steps: 6 });
  await page.mouse.up();
  await page.evaluate(() => {
    const { camera, controls } = window.__app.viewer;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(0.7);
    offset.y += offset.length() * 0.35;
    camera.position.copy(controls.target).add(offset);
    controls.update?.();
  });
  const viewBefore = await readState(page);
  await page.focus('.global-nav-purpose-option[data-purpose="education"]');
  await page.keyboard.press('Enter');
  expect(await waitForPurpose(page, 'education'), `${tag}: the switch did not change the purpose`);
  // State, not time: the camera stops moving before it is measured, so a
  // reset that tweens back to the scene's framing has arrived by then.
  await page.waitForTimeout(200);
  await waitForCameraToSettle(page, { stillMs: 500 }).catch(() => {});
  state = await readState(page);
  expect(!/purpose=/.test(state.hash), `${tag}: medical education kept a purpose in the address (${state.hash})`);
  expect(!state.guideOpen, `${tag}: the patient explanation stayed open in medical education`);
  expect(state.pressed === 'education', `${tag}: the switch does not say 医学教育 is on`);
  expect(state.patientCrumb === null, `${tag}: the location still reads 患者説明 in medical education`);
  // "The same viewpoint" is how far away and from how high, not the exact
  // position: the model's idle turn (auto-rotate) goes on in both purposes,
  // and the console coming back re-fits the frame by a few percent. A jump to
  // another view — the explanation's camera being reset to the scene's own —
  // changes the distance or the elevation, and that is what is caught.
  const pose = ({ camera, target }) => {
    const d = camera.map((v, i) => v - target[i]);
    const distance = Math.hypot(...d);
    return { distance, elevation: (Math.asin(d[1] / distance) * 180) / Math.PI };
  };
  const a = pose(viewBefore);
  const b = pose(state);
  const zoomChange = Math.abs(b.distance / a.distance - 1);
  const elevationChange = Math.abs(b.elevation - a.elevation);
  const keptView = expect(
    zoomChange < 0.12 && elevationChange < 6,
    `${tag}: switching purpose changed the viewpoint (distance ${(zoomChange * 100).toFixed(0)}%, elevation ${elevationChange.toFixed(1)}°)`
  );
  if (keptView) observed.push(`${tag}: patient → education kept the view (distance ${(zoomChange * 100).toFixed(1)}%, elevation ${elevationChange.toFixed(1)}°)`);
  await shot(page, `${tag}-education`);

  // 4. Something only education offers, changed — then patient explanation.
  const changedControl = await page.evaluate(() => {
    const scene = window.__app.scene;
    const control = scene.getModelControls?.()[0];
    if (!control || !scene.setModelControl) return null;
    scene.setModelControl(control.id, control.max);
    return control.id;
  });
  await page.focus('.global-nav-purpose-option[data-purpose="patient"]');
  await page.keyboard.press('Enter');
  expect(await waitForPurpose(page, 'patient'), `${tag}: the switch did not go back to patient explanation`);
  state = await readState(page);
  if (changedControl) {
    const defaults = await page.evaluate(() => {
      const scene = window.__app.scene;
      const now = (scene.getModelControls?.() ?? []).map(({ id, value }) => [id, value]);
      return now;
    });
    const atMax = await page.evaluate((id) => {
      const control = window.__app.scene.getModelControls().find((row) => row.id === id);
      return control.value === control.max;
    }, changedControl);
    expect(!atMax, `${tag}: a condition changed in medical education came along into patient explanation (${JSON.stringify(defaults)})`);
    expect(Boolean(state.notice), `${tag}: the model was put back without anything on screen saying so`);
  }
  expect(/purpose=patient/.test(state.hash), `${tag}: patient explanation is not in the address (${state.hash})`);

  // 5. Back, and reload.
  await page.goBack();
  expect(await waitForPurpose(page, 'education'), `${tag}: Back did not return to medical education`);
  await page.goForward();
  expect(await waitForPurpose(page, 'patient'), `${tag}: Forward did not return to patient explanation`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__app?.scene), null, { timeout: 60000 });
  expect(await waitForPurpose(page, 'patient'), `${tag}: a reload lost patient explanation`);

  // 6. A model without patient explanation, asked for it.
  await openScene(page, '#/brain-anatomy?purpose=patient');
  await page.waitForSelector('.purpose-notice:not([hidden])', { timeout: 15000 }).catch(() => {});
  state = await readState(page);
  expect(Boolean(state.notice), `${tag}: a model without patient explanation ignored the request silently`);
  expect(!/purpose=/.test(state.hash), `${tag}: the refused purpose stayed in the address (${state.hash})`);
  expect(state.pressed === null, `${tag}: a one-purpose model grew a purpose switch`);

  await context.close();

  // 7. Without the entitlement: the lock, and the plan — never the explanation.
  const unentitled = await browser.newContext({ viewport });
  const locked = await unentitled.newPage();
  await openScene(locked, `#/${sceneSlug}?purpose=patient`, 'entitled=0');
  expect(await waitForPurpose(locked, 'patient'), `${tag}: unentitled, the model did not open in patient explanation`);
  state = await readState(locked);
  expect(!state.guideOpen, `${tag}: an unentitled reader was shown the paid explanation`);
  expect(Boolean(state.bar) && state.lockShown, `${tag}: unentitled, patient explanation shows no lock on its way in`);
  await shot(locked, `${tag}-patient-locked`);
  await locked.click('.purpose-patient-open');
  await locked.waitForSelector('.access-modal:not([hidden])', { timeout: 5000 }).catch(() => {});
  state = await readState(locked);
  expect(state.purchaseOpen && !state.guideOpen, `${tag}: the locked button did not open the plan`);
  await unentitled.close();
}

// ----------------------------------------------------------- released build

/**
 * What the released product is allowed to offer — the gate's own answer,
 * asked of the same function every surface asks. Not "nothing": on the day a
 * model's patient explanation passes its review and the release opens it, it
 * belongs on these surfaces, and a check that said "none, ever" would go red
 * on exactly the change it exists to allow.
 */
const RELEASED_PATIENT = patientExplanationScenes({ unlocked: false }).map((scene) => scene.id);

async function driveReleased(viewport) {
  const tag = `${viewport.width}x${viewport.height}`;
  const offered = RELEASED_PATIENT.length > 0;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(url('#/'), { waitUntil: 'load' });
  await page.waitForSelector('.shell-header', { timeout: 20000 });
  const landing = await page.evaluate(() => ({
    chooser: Boolean(document.querySelector('.landing-purposes')),
    purposeLinks: [...document.querySelectorAll('.shell-nav-link.is-purpose')].map((a) => a.textContent),
  }));
  expect(
    landing.chooser === offered,
    offered
      ? `${tag}: the release offers patient explanation on ${RELEASED_PATIENT.join(', ')}, and the landing page has no way to it`
      : `${tag}: the released landing page offers a purpose chooser with no patient explanation behind it`
  );
  expect(
    (landing.purposeLinks.length > 0) === offered,
    `${tag}: the released header ${offered ? 'does not offer' : 'offers'} 患者説明 (${landing.purposeLinks})`
  );

  await page.goto(url('#/patient'), { waitUntil: 'load' });
  await page.waitForSelector('.patient-question, .explorer-empty', { timeout: 20000 });
  const listed = await page.$$eval('.patient-question', (links) => links.map((link) => link.dataset.scene).sort());
  expect(
    JSON.stringify(listed) === JSON.stringify([...RELEASED_PATIENT].sort()),
    `${tag}: the released #/patient lists [${listed}], the gate opens [${RELEASED_PATIENT}]`
  );

  // A released model the gate does not offer patient explanation on.
  await openScene(page, '#/heart-anatomy?purpose=patient');
  await page.waitForSelector('.purpose-notice:not([hidden])', { timeout: 15000 }).catch(() => {});
  const state = await readState(page);
  expect(state.pressed === null, `${tag}: a released model offers a purpose switch`);
  expect(!state.guideOpen, `${tag}: a released model opened a patient explanation`);
  expect(Boolean(state.notice), `${tag}: a released model asked for patient explanation did not say it has none`);
  expect(!/purpose=/.test(state.hash), `${tag}: the refused purpose stayed in the address`);
  observed.push(
    `${tag}: released — patient explanation offered on [${RELEASED_PATIENT.join(', ') || 'none'}], #/patient agrees, a patient link to heart-anatomy refused`
  );
  await context.close();
}

for (const viewport of VIEWPORTS) {
  try {
    if (preview) await drivePreview(viewport);
    else await driveReleased(viewport);
  } catch (error) {
    problems.push(`${viewport.width}x${viewport.height}: ${error.message.split('\n')[0]}`);
  }
}

await browser.close();
await closeServer();

for (const line of observed) console.log(`  ${line}`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length})`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}
console.log(`\n  ok    ${preview ? 'both purposes drove end to end' : 'the released product offers no unreviewed patient explanation'}`);
