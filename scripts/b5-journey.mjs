#!/usr/bin/env node
/**
 * B5 local browser journey. Intended to live in the Medical 3D Lab repository.
 * Does not start a server, does not call GitHub, and does not trigger Actions.
 *
 * Usage by the integrating developer: node scripts/b5-journey.mjs <local-url>
 * Default local URL: http://127.0.0.1:4173/
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173/';
const outDir = process.env.B5_RESULTS_DIR || 'artifacts/b5-journey';
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ja-JP' });
const page = await context.newPage();
const events = [];
const record = async (label) => {
  const snapshot = await page.evaluate(() => ({
    route: `${location.pathname}${location.hash}`,
    hash: location.hash,
    title: document.title,
    lang: document.documentElement.lang,
    hero: (() => {
      const node = document.querySelector('[data-ready][data-organ], .landing-organ-viewport, [data-organ-hero]');
      if (!node) return null;
      return {
        ready: node.getAttribute('data-ready'),
        detail: node.getAttribute('data-detail'),
        organ: node.getAttribute('data-organ'),
        loading: node.getAttribute('data-loading'),
      };
    })(),
    scene: window.__app?.scene ? {
      id: window.__app.scene.id ?? window.__app.scene.constructor?.id ?? null,
      ready: true,
    } : null,
    active: document.activeElement?.outerHTML?.slice(0, 240) ?? null,
    scroll: { x: scrollX, y: scrollY },
  }));
  events.push({ label, at: new Date().toISOString(), ...snapshot });
};

const waitHeroReady = async () => page.waitForFunction(() => {
  const node = document.querySelector('.landing-demo-viewport[data-ready="true"][data-lifecycle="ready"], [data-ready="true"][data-organ][data-lifecycle="ready"]');
  return Boolean(node);
}, null, { timeout: 45000 });

const waitSceneReady = async () => page.waitForFunction(() => {
  const canvas = document.querySelector('canvas');
  const appReady = Boolean(window.__app?.scene);
  if (!canvas || !appReady) return false;
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return Boolean(gl && gl.drawingBufferWidth > 0 && gl.drawingBufferHeight > 0);
}, null, { timeout: 45000 });

const clickFirst = async (selectors) => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.click();
      return selector;
    }
  }
  throw new Error(`no target found: ${selectors.join(', ')}`);
};

try {
  // J2 / old history path, limited to the known failure sequence.
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await waitHeroReady();
  await record('landing-ready');

  await clickFirst([
    '.landing-model-action[href^="#/"]',
    '.landing-demo-link[href^="#/"]',
    'a[href*="brain-anatomy"]',
  ]);
  await waitSceneReady();
  await record('scene-ready-after-cta');

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitHeroReady();
  await record('landing-ready-after-browser-back');

  await page.goForward({ waitUntil: 'domcontentloaded' });
  await waitSceneReady();
  await record('scene-ready-after-browser-forward');

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await waitHeroReady();
  await record('landing-ready-before-model-info');

  const infoSelector = await clickFirst([
    'a[href="#/trust"]',
    'a:has-text("モデル情報")',
    'a:has-text("Model info")',
    'button:has-text("モデル情報")',
    'button:has-text("Model info")',
  ]);
  await record(`model-info-opened-via:${infoSelector}`);

  if (!page.url().includes('#/trust')) {
    const trust = page.locator('a[href="#/trust"]').first();
    if (await trust.count()) await trust.click();
  }
  await page.waitForFunction(() => location.hash === '#/trust' || document.querySelector('.trust-page'), null, { timeout: 15000 });
  await record('trust-ready');

  await page.goBack({ waitUntil: 'domcontentloaded' });
  // This is the historic failure checkpoint. Do not mask it with a fixed sleep.
  let recovered = true;
  try { await waitHeroReady(); } catch { recovered = false; }
  await record(recovered ? 'historic-path-recovered' : 'historic-path-still-failing');

  // J5: if B5 diagnostics are connected, verify explicit copy surface exists.
  const diagnostic = page.locator('[data-public-diagnostic]').first();
  events.push({ label: 'diagnostic-control-present', present: Boolean(await diagnostic.count()) });

  await fs.writeFile(path.join(outDir, 'journey.json'), JSON.stringify(events, null, 2));
  if (!recovered) process.exitCode = 2;
} finally {
  await browser.close();
}
