#!/usr/bin/env node
/**
 * The MRI atlas, driven in a real browser.
 *
 *   npm run build:preview
 *   npm run verify:mri -- --dist dist-preview --preview
 *   npm run build && npm run verify:mri          # once the scene is published
 *
 * ## What only a browser can say
 *
 * `tests/mri-atlas-*.test.js` hold the arithmetic: which voxel a pixel is,
 * which letter goes on which edge, that the files are what the manifest
 * hashed. What they cannot see is whether the *page* agrees with that
 * arithmetic — whether the picture a reader looks at has the patient's left
 * where the letters say, whether clicking a surface in 3D moves the planes
 * to the structure that was clicked, whether clicking a plane lights the
 * same structure in 3D. Those are the product's central claim, and on a
 * symmetric template a mirrored page looks exactly as good as a correct one.
 * So every check here reads a side, a label or a coordinate **from the page**
 * and compares it with the atlas index, never with the picture.
 *
 * Waits for states (`data-ready`), not for time (`CLAUDE.md`).
 *
 * Options:
 *   --dist <dir>   built site to serve (default: dist)
 *   --preview      unlock an unpublished scene (needs a preview build)
 *   --shots <dir>  also write screenshots of the states checked
 *   --headed       show the browser
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serveDist } from './lib/serve-dist.mjs';
import { chromiumExecutable } from './lib/browser.mjs';
import { waitForCameraToSettle } from './lib/camera.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const distDir = value('--dist', 'dist');
const shotsDir = value('--shots', null);
const preview = flag('--preview');

if (!existsSync(distDir)) {
  console.error(`No build at "${distDir}". Run \`npm run build\` (or build:preview) first.`);
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
  console.error('Playwright is not installed, so nothing was driven.\n  npm i --no-save playwright\n  npx playwright install --with-deps chromium');
  process.exit(1);
}

const atlas = JSON.parse(readFileSync(resolve('public/assets/mri/atlas.json'), 'utf8'));
const structure = (name, hemi) => atlas.structures.find((entry) => entry.name === name && entry.hemi === hemi);

const { base, close } = await serveDist(distDir);
const browser = await chromium.launch({
  headless: !flag('--headed'),
  executablePath: chromiumExecutable(chromium),
  args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--no-proxy-server', '--no-first-run', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'ok   ' : 'FAIL '} ${name}${detail ? `\n         ${detail}` : ''}`);
  return ok;
};

const url = (query = '') => `${base}${preview ? '?preview=1' : ''}#/mri-atlas${query}`;
const READY = (states) => `(${JSON.stringify(states)}).includes(document.querySelector('.mri-workbench')?.dataset.ready)`;
const state = (page) => page.evaluate(() => window.__app.atlas.state());
/** Two frames: the workbench paints on the next animation frame after a change. */
const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
const labelAtCrosshair = (page) => page.evaluate(async () => {
  // Read from the label volume the page itself loaded, at the page's own crosshair.
  const { voxel } = window.__app.atlas.state();
  const response = await fetch(new URL('assets/mri/labels.u8.gz', document.baseURI));
  const raw = new Uint8Array(await response.arrayBuffer());
  const bytes = raw[0] === 0x1f && raw[1] === 0x8b
    ? new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
    : raw;
  return bytes[voxel[0] + voxel[1] * 193 + voxel[2] * 193 * 229];
});
/** Where the crosshair is drawn on a plane, as a fraction of the canvas, read from the pixels. */
const crosshairX = (page, plane) => page.evaluate((name) => {
  const canvas = document.querySelector(`.mri-slice-canvas[data-plane="${name}"]`);
  const context = canvas.getContext('2d');
  const row = context.getImageData(0, 2, canvas.width, 1).data; // a row near the top: only the vertical line crosses it
  let best = -1;
  for (let x = 0; x < canvas.width; x += 1) {
    const [r, g, b] = [row[x * 4], row[x * 4 + 1], row[x * 4 + 2]];
    if (r > 180 && g > 150 && b < 160 && r - b > 60) { best = x; break; }
  }
  return best < 0 ? null : best / canvas.width;
}, plane);

async function open(page, query = '', ready = ['all']) {
  await page.goto(url(query));
  await page.waitForSelector('.mri-workbench', { timeout: 60000 });
  await page.waitForFunction(READY([...ready, 'failed']), null, { timeout: 120000 });
  await settle(page);
  return page.evaluate(() => document.querySelector('.mri-workbench').dataset.ready);
}

try {
  // ------------------------------------------------------------ desktop
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const t0 = Date.now();
  const ready = await open(page);
  record('the atlas opens: volumes, labels and 3D surfaces all load', ready === 'all', `ready = ${ready}, ${Date.now() - t0} ms on software GL`);

  const edges = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.mri-slice-canvas')].map((canvas) => [canvas.dataset.plane, canvas.dataset.edges])));
  record('edge letters: radiological by default — R on the left of axial and coronal, face left on sagittal',
    edges.axial === 'RLAP' && edges.coronal === 'RLSI' && edges.sagittal === 'APSI', JSON.stringify(edges));
  const shown = await page.evaluate(() => [...document.querySelectorAll('.mri-slice.is-axial .mri-slice-edge')].map((node) => node.textContent).join(''));
  record('the letters on screen are the ones the mapping computed', shown === 'RLAP', `on screen: ${shown}`);

  const painted = await page.evaluate(() => [...document.querySelectorAll('.mri-slice-canvas')].map((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 16) if (data[i] + data[i + 1] + data[i + 2] > 90) lit += 1;
    return lit / (data.length / 16);
  }));
  record('all three planes draw an image, not a black box', painted.every((share) => share > 0.08), painted.map((share) => share.toFixed(2)).join(' / '));

  // --- list → planes: the crosshair lands inside the structure, on its side ---
  for (const [name, hemi, id] of [['Hippocampus', 'L', 'hippocampus-l'], ['Caudate', 'R', 'caudate-r'], ['Lateral Ventricle', 'L', 'lateral-ventricle-l'], ['Precentral', 'R', 'precentral-r']]) {
    const expected = structure(name, hemi);
    await page.click(`.mri-structure[data-structure="${id}"]`);
    await settle(page);
    const now = await state(page);
    const label = await labelAtCrosshair(page);
    const x = await crosshairX(page, 'axial');
    // Radiological: the patient's left is on the screen's right.
    const sideOk = hemi === 'L' ? x > 0.5 : x < 0.5;
    record(`list → MRI: ${id} moves the crosshair inside the structure, on the correct side of the screen`,
      now.selected === id && label === expected.label && JSON.stringify(now.mm) === JSON.stringify(expected.interiorPointMm) && sideOk,
      `selected ${now.selected}; crosshair ${now.mm} mm on label ${label} (want ${expected.label}); drawn at ${(x * 100).toFixed(0)}% of the axial width`);
  }
  const address = await page.evaluate(() => location.hash);
  record('the address follows the selection, so a structure can be linked to', address.includes('structure=precentral-r'), address);

  // --- the convention toggle moves the picture and the letters together ---
  await page.click('.mri-structure[data-structure="hippocampus-l"]');
  await settle(page);
  const before = await crosshairX(page, 'axial');
  await page.evaluate(() => { const details = document.querySelector('.mri-settings'); if (!details.open) details.open = true; });
  await page.click('[data-control="convention"]');
  await settle(page);
  const after = await crosshairX(page, 'axial');
  const flipped = await page.evaluate(() => document.querySelector('.mri-slice-canvas[data-plane="axial"]').dataset.edges);
  record('neurological view: the left hippocampus moves to the screen\'s left and the letters swap with it',
    before > 0.5 && after < 0.5 && flipped === 'LRAP', `axial crosshair ${(before * 100).toFixed(0)}% → ${(after * 100).toFixed(0)}%, edges ${flipped}`);
  await page.click('[data-control="convention"]');
  await settle(page);

  // --- plane → 3D: clicking a voxel selects its structure and 3D shows it ---
  const putamen = structure('Putamen', 'R');
  const click = await page.evaluate((mm) => {
    window.__app.atlas.moveToMm(mm, { select: false });
    return null;
  }, putamen.interiorPointMm);
  void click;
  await settle(page);
  const box = await page.locator('.mri-slice-canvas[data-plane="coronal"]').boundingBox();
  const cx = await crosshairX(page, 'coronal');
  // Click exactly where the crosshair is drawn on the coronal plane: its row is found the same way.
  const cy = await page.evaluate(() => {
    const canvas = document.querySelector('.mri-slice-canvas[data-plane="coronal"]');
    const column = canvas.getContext('2d').getImageData(2, 0, 1, canvas.height).data;
    for (let y = 0; y < canvas.height; y += 1) {
      const [r, g, b] = [column[y * 4], column[y * 4 + 1], column[y * 4 + 2]];
      if (r > 180 && g > 150 && b < 160 && r - b > 60) return y / canvas.height;
    }
    return null;
  });
  await page.evaluate(() => window.__app.atlas.select('hippocampus-l'));
  await settle(page);
  await page.evaluate((mm) => window.__app.atlas.moveToMm(mm, { select: false }), [putamen.interiorPointMm[0] + 40, putamen.interiorPointMm[1], putamen.interiorPointMm[2] + 30]);
  await settle(page);
  // The plane is still on the putamen's y; click where the putamen was drawn.
  await page.mouse.click(box.x + cx * box.width, box.y + cy * box.height);
  await settle(page);
  const afterClick = await state(page);
  const display = await page.evaluate((label) => window.__app.atlas.view3d.displayOf(label), putamen.label);
  record('MRI → 3D: clicking the right putamen on the coronal plane selects it and the 3D model highlights it',
    afterClick.selected === 'putamen-r' && display === 'selected', `selected ${afterClick.selected}; 3D draws it as "${display}"`);

  // --- 3D → planes: which hemisphere faces the camera ---
  for (const [view, hemi] of [['left', 'L'], ['right', 'R']]) {
    await page.evaluate(() => window.__app.atlas.moveToMm([0, -18, 14], { select: true }));
    await page.evaluate((name) => window.__app.atlas.view3d.setView(name), view);
    await settle(page);
    await waitForCameraToSettle(page, { stillMs: 300 });
    const stage = await page.locator('.mri-3d-stage').boundingBox();
    await page.mouse.click(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await settle(page);
    const picked = await state(page);
    const label = await labelAtCrosshair(page);
    const found = atlas.structures.find((entry) => entry.label === label);
    record(`3D → MRI: from the ${view}, a click on the model selects a ${hemi === 'L' ? 'left' : 'right'}-hemisphere structure and the crosshair lands in it`,
      Boolean(picked.selected) && picked.selected.endsWith(`-${hemi.toLowerCase()}`) && found?.hemi === hemi && Math.sign(picked.mm[0]) === (hemi === 'L' ? -1 : 1),
      `picked ${picked.selected} at ${picked.mm} mm; label under crosshair ${label} (${found?.name} ${found?.hemi})`);
  }
  if (shotsDir) await page.screenshot({ path: resolve(shotsDir, 'mri-desktop-linked.png') });

  // --- scrolling, zoom, sequence, window ---
  const sliceBefore = await page.evaluate(() => [...document.querySelectorAll('.mri-slice-canvas')].map((canvas) => Number(canvas.dataset.slice)));
  const axialBox = await page.locator('.mri-slice-canvas[data-plane="axial"]').boundingBox();
  await page.mouse.move(axialBox.x + axialBox.width / 2, axialBox.y + axialBox.height / 2);
  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, -100);
  await settle(page);
  const sliceAfter = await page.evaluate(() => [...document.querySelectorAll('.mri-slice-canvas')].map((canvas) => Number(canvas.dataset.slice)));
  record('the wheel steps through axial slices and leaves the other two planes on their slice',
    sliceAfter[0] === sliceBefore[0] + 2 && sliceAfter[1] === sliceBefore[1] && sliceAfter[2] === sliceBefore[2], `${sliceBefore} → ${sliceAfter}`);

  await page.click('.mri-chip[aria-label="拡大"], .mri-chip[aria-label="Zoom in"]');
  await settle(page);
  record('zoom is a display setting the state owns', (await state(page)).zoom === 1.5);
  await page.click('[data-control="reset"]');
  await settle(page);

  const sample = () => page.evaluate(() => {
    const canvas = document.querySelector('.mri-slice-canvas[data-plane="axial"]');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
    return sum / (data.length / 4);
  });
  const t1 = await sample();
  await page.click('[data-modality="t2"]');
  await page.waitForFunction(() => window.__app.atlas.state().modality === 't2', null, { timeout: 60000 });
  await settle(page);
  const t2 = await sample();
  record('T2 loads on request and the picture changes', Math.abs(t1 - t2) > 3, `mean pixel ${t1.toFixed(1)} → ${t2.toFixed(1)}`);
  await page.click('[data-modality="t1"]');
  await settle(page);
  await page.locator('#mri-level').fill('230');
  await settle(page);
  const brighter = await sample();
  record('brightness changes the display, not the data', brighter > t1 + 5, `mean pixel ${t1.toFixed(1)} → ${brighter.toFixed(1)}`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record('desktop: nothing overflows the page sideways', overflow <= 0, `${overflow}px`);
  record('no script error while it was driven', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();

  // ------------------------------------------------- opening on a structure
  const deep = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await open(deep, '?structure=hippocampus-l');
  const opened = await state(deep);
  record('a link to a structure opens on it', opened.selected === 'hippocampus-l' && JSON.stringify(opened.mm) === JSON.stringify(structure('Hippocampus', 'L').interiorPointMm), `${opened.selected} at ${opened.mm}`);
  await deep.close();

  // ---------------------------------------------------------------- phone
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await open(phone, '?structure=caudate-r');
  const phoneState = await state(phone);
  const phoneOverflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const planeSizes = await phone.evaluate(() => [...document.querySelectorAll('.mri-slice-canvas')].map((canvas) => { const r = canvas.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
  record('phone: opens on the MRI planes, each large enough to read, with no sideways overflow',
    phoneState.mode === 'mri' && phoneOverflow <= 0 && planeSizes.every((size) => size >= 110), `mode ${phoneState.mode}; overflow ${phoneOverflow}px; plane sizes ${planeSizes}px`);
  const small = await phone.evaluate(() => [...document.querySelectorAll('.mri-mode, .mri-controls .mri-chip')].filter((node) => node.offsetParent).map((node) => { const r = node.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }).filter((size) => size < 44));
  record('phone: every control on screen is a 44 px target', small.length === 0, small.length ? `smaller: ${small}` : '');
  await phone.click('.mri-mode.is-list');
  await phone.waitForFunction(() => document.querySelector('.mri-workbench').dataset.list === 'open');
  // The sheet slides in; wait until it has stopped rather than for its nominal duration.
  await phone.waitForFunction(() => {
    const list = document.querySelector('.mri-list');
    const style = getComputedStyle(list);
    return style.visibility === 'visible' && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  });
  await phone.click('.mri-structure[data-structure="thalamus-l"]');
  await settle(phone);
  const picked = await state(phone);
  const sheet = await phone.evaluate(() => document.querySelector('.mri-workbench').dataset.list);
  record('phone: the structure list is a sheet; choosing from it selects and closes it', picked.selected === 'thalamus-l' && sheet === 'closed', `${picked.selected}, sheet ${sheet}`);
  if (shotsDir) await phone.screenshot({ path: resolve(shotsDir, 'mri-phone.png') });
  await phone.close();

  // -------------------------------------------------- a browser with no WebGL
  const flat = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await flat.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  const flatReady = await open(flat, '?structure=hippocampus-r', ['all', 'slices-only']);
  const flatState = await state(flat);
  const flatPainted = await flat.evaluate(() => {
    const canvas = document.querySelector('.mri-slice-canvas[data-plane="axial"]');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 16) if (data[i] > 40) lit += 1;
    return lit;
  });
  record('without WebGL the MRI planes still open, selected and painted, and the page says 3D is unavailable',
    flatReady === 'slices-only' && flatState.mode === 'mri' && flatState.selected === 'hippocampus-r' && flatPainted > 500, `ready ${flatReady}; mode ${flatState.mode}; selected ${flatState.selected}`);
  await flat.close();
} finally {
  await browser.close();
  await close();
}

const failed = results.filter((result) => !result.ok);
console.log(failed.length ? `\n${failed.length} of ${results.length} check(s) failed.` : `\nMRI atlas: all ${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
