#!/usr/bin/env node
/**
 * Any route, at the widths that matter, photographed the same way every time.
 *
 *   npm run build
 *   npm run shots:surfaces -- --route '#/' --route '#/cardiac-output' --out shots/surfaces
 *
 * ## Why this exists
 *
 * `shots:phone` walks one scene's phone states and `shots:anatomy` walks an
 * organ's views. Neither photographs a reading surface — the home page, the
 * model list, a model's header at desktop width — and a change to the product
 * shell (the BYOKI MOTION rebrand, 2026-09-30) is judged on exactly those.
 * `verify:ui` measures them; this shows them. It prints no verdict.
 *
 * Waits for a state, not a time: the boot veil gone, no loading indicator on
 * screen, and — for a route with a renderer — one animation frame after the
 * canvas exists. A fixed wait photographs whatever happened to be mid-tween
 * (`CLAUDE.md`, "待つときは、時間ではなく状態を待つ").
 *
 * Options:
 *   --dist <dir>        built site to serve (default: dist)
 *   --route <hash>      route to photograph (repeatable; default: '#/')
 *   --width <px>        viewport width (repeatable; default: 1280 and 390)
 *   --out <dir>         where to write the images (default: shots/surfaces)
 *   --lang <en|ja>      interface language (default: ja)
 *   --full              photograph the whole page, not only the first screen
 *   --preview           unlock unpublished scenes (build with VITE_ALLOW_PREVIEW=1)
 *   --click <selector>  press this before the shot (repeatable, in order)
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
const values = (name) => argv.flatMap((item, i) => (item === name && argv[i + 1] ? [argv[i + 1]] : []));

const distDir = value('--dist', 'dist');
const routes = values('--route').length ? values('--route') : ['#/'];
const widths = values('--width').length ? values('--width').map(Number) : [1280, 390];
const outDir = resolve(value('--out', 'shots/surfaces'));
const language = value('--lang', 'ja');
const clicks = values('--click');

const HEIGHT_FOR = (width) => (width <= 500 ? 844 : 800);

const BROWSER_ARGS = [
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  '--no-proxy-server',
  '--no-first-run',
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
];

const nameFor = (route, width) =>
  `${route.replace(/^#\/?/, '').replace(/[^a-z0-9-]+/gi, '_') || 'home'}-${width}`;

mkdirSync(outDir, { recursive: true });
const server = await serveDist(distDir);
const browser = await chromium.launch({
  headless: !flag('--headed'),
  executablePath: chromiumExecutable(chromium),
  args: BROWSER_ARGS,
});

try {
  for (const width of widths) {
    const phone = width <= 500;
    const context = await browser.newContext({
      viewport: { width, height: HEIGHT_FOR(width) },
      deviceScaleFactor: phone ? 2 : 1,
      hasTouch: phone,
      isMobile: phone,
    });
    await context.addInitScript((lang) => {
      try {
        localStorage.setItem('medical-3d-lab:lang', lang);
      } catch {
        /* storage may be unavailable; the default language is Japanese anyway */
      }
    }, language);
    for (const route of routes) {
      const page = await context.newPage();
      const url = `${server.base}${flag('--preview') ? '?preview=1' : ''}${route}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(
        () => {
          const veil = document.getElementById('boot-veil');
          const veiled = veil && !veil.hidden;
          const loading = [...document.querySelectorAll('.loading')].some(
            (node) => node.offsetParent !== null && !node.hidden
          );
          return !veiled && !loading && document.querySelector('#ui')?.childElementCount > 0;
        },
        null,
        { timeout: 30000 }
      ).catch(() => console.warn(`  ${route} @${width}: still loading after 30 s — photographed anyway`));
      for (const selector of clicks) {
        await page.locator(selector).first().click({ timeout: 5000 }).catch(() => {
          console.warn(`  ${route} @${width}: nothing to press at ${selector}`);
        });
      }
      // Two frames: one for the layout the last step caused, one for the paint.
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      const file = resolve(outDir, `${nameFor(route, width)}.png`);
      await page.screenshot({ path: file, fullPage: flag('--full') });
      console.log(`  ${nameFor(route, width)}.png`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
