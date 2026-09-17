#!/usr/bin/env node
/**
 * The states a phone device pass asks about, photographed.
 *
 *   npm run build
 *   npm run shots:phone -- --out docs/screenshots/phone
 *
 * ## Why this exists
 *
 * `verify:ui` measures the phone layout — the control bar inside the viewport,
 * every button over 44px, the selection card and the bar not overlapping — and
 * a measurement is the right thing to gate a build on. It is not the right
 * thing to answer "does this look like a product on my phone", which is the
 * question a device pass actually asks and which only a picture answers.
 *
 * The five states are the ones F-101's checklist walks: what a phone shows on
 * arrival, what it shows after a part is picked, the sheet behind 詳しく見る,
 * the bottom control bar on its own, and the account dialog. Taken together
 * they are the evidence a reviewer needs without a phone in their hand — and
 * they are taken the same way every time, so a before and an after differ by
 * the change rather than by how somebody held the device.
 *
 * It is not a pass/fail check and prints no verdict: `verify:ui` does that.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --scene <slug>  scene route to drive (default: brain-anatomy)
 *   --out <dir>     where to write the images (default: shots/phone)
 *   --width <px>    viewport width (default: 390 — iPhone 13)
 *   --height <px>   viewport height (default: 844)
 *   --lang <en|ja>  interface language (default: ja)
 *   --preview       unlock scenes the release has not opened (needs a build
 *                   made with VITE_ALLOW_PREVIEW=1)
 *   --headed        show the browser
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist.mjs';
import { chromiumExecutable } from './lib/browser.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const scene = value('--scene', 'brain-anatomy');
const outDir = resolve(value('--out', 'shots/phone'));
const width = Number(value('--width', '390'));
const height = Number(value('--height', '844'));
const language = value('--lang', 'ja');

// The same switches the viewport matrix uses: no network beyond the loopback
// server, and a software rasteriser, because a CI runner has no GPU and a scene
// that silently fell back to the no-WebGL surface would photograph as a bug
// that is not there.
const BROWSER_ARGS = [
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  '--no-proxy-server',
  '--no-first-run',
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
];

mkdirSync(outDir, { recursive: true });
const server = await serveDist(distDir);
const browser = await chromium.launch({
  headless: !flag('--headed'),
  executablePath: chromiumExecutable(chromium),
  args: BROWSER_ARGS,
});

// `deviceScaleFactor: 2` for the same reason a phone has one: a 1x shot of a
// 390px viewport is unreadable at the size anybody will look at it.
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});

const shot = async (name) => {
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${name}.png`);
};

/** The first frame is drawn asynchronously; nothing is worth photographing before it. */
const settle = async (ms = 1200) => {
  await page.waitForTimeout(ms);
};

console.log(`${width}x${height} — ${scene}`);
// A scene the release has not opened is not in a production build, so the route
// answers with the "to be updated" page and every shot below is of that page.
// `--preview` unlocks a build made with `VITE_ALLOW_PREVIEW=1`, the same way
// `verify:anatomy` does — which is what makes this usable for the scenes a
// device pass most needs pictures of: the ones not published yet.
await page.goto(flag('--preview') ? `${server.base}?preview=1#/${scene}` : `${server.base}#/${scene}`, {
  waitUntil: 'load',
});
await page.waitForTimeout(4000);
await page.evaluate((lang) => {
  const ui = document.getElementById('ui');
  if (ui) ui.dataset.lang = lang;
}, language);
await settle();
await shot('1-initial');

// --- a part, picked the way a finger picks one
//
// Through the scene's own hit test rather than a click at a guessed coordinate:
// the point that lands on a structure depends on the camera, and a tap on empty
// space photographs as "selection is broken".
const picked = await page.evaluate(() => {
  // `window.__app` is what the app exposes and what `check-anatomy-interaction`
  // drives; there is no second handle to invent here.
  const scene = window.__app?.scene;
  if (!scene?.selectAtCanvasPoint) return null;
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const box = canvas.getBoundingClientRect();
  // A short spiral out from the middle of the canvas: the first point that
  // resolves to a structure is the one a finger aiming at the model would find.
  for (let radius = 0; radius <= 120; radius += 12) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7]]) {
      const x = box.width / 2 + dx * radius;
      const y = box.height / 2 + dy * radius;
      if (scene.selectAtCanvasPoint(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
  }
  return null;
});
if (!picked) console.log('  (no structure was hit — 2 and 3 will show the unselected state)');
await settle();
await shot('2-structure-selected');

// --- the sheet behind 詳しく見る / More
const open = page.locator('.anatomy-panel-open');
if (await open.count()) {
  await open.first().click();
  await settle(900);
}
await shot('3-detail-sheet');
const closeSheet = page.locator('.anatomy-sheet-close, .anatomy-panel-close');
if (await closeSheet.count()) {
  await closeSheet.first().click().catch(() => {});
  await settle(600);
} else {
  await page.keyboard.press('Escape');
  await settle(600);
}

// --- the bottom control bar, on its own
//
// Clipped to the bar's own box plus a margin, so the picture answers "is any of
// it off the bottom or the side" rather than "is it somewhere in this page".
const bar = await page.evaluate(() => {
  const node = document.querySelector('.console');
  if (!node) return null;
  const box = node.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
});
if (bar) {
  const margin = 12;
  await page.screenshot({
    path: resolve(outDir, '4-control-bar.png'),
    clip: {
      x: Math.max(0, bar.x - margin),
      y: Math.max(0, bar.y - margin),
      width: Math.min(width - Math.max(0, bar.x - margin), bar.width + margin * 2),
      height: Math.min(height - Math.max(0, bar.y - margin), bar.height + margin * 2),
    },
  });
  console.log('  4-control-bar.png');
} else {
  console.log('  (no .console on this surface — 4 not taken)');
}

// --- the account dialog
const account = page.locator('.account-trigger');
if (await account.count()) {
  await account.first().click();
  await settle(900);
}
await shot('5-login-modal');

await browser.close();
server.close();
console.log(`written to ${outDir}`);
