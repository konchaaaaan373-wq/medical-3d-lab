#!/usr/bin/env node
/**
 * Browser-first visual audit for the five next-publication candidates.
 *
 * This is deliberately a real Chromium drive, not a DOM/unit substitute. It
 * opens the preview build, manipulates the rendered canvas, opens product
 * navigation, enters/exits the authored patient explanation when one exists,
 * and writes screenshots plus a small machine-readable geometry report.
 *
 * It never changes the release gate. Locked candidates are reached only through
 * a build compiled with VITE_ALLOW_PREVIEW=1 and the existing ?preview=1 gate.
 *
 * Usage:
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   node scripts/audit-release-candidates.mjs --dist dist --out dist/browser-audit
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { patientGuideFor } from '../src/data/patientGuides.js';

const argv = process.argv.slice(2);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const outDir = value('--out', join(distDir, 'browser-audit'));
const headed = argv.includes('--headed');

const TARGETS = Object.freeze([
  { id: 'brain-anatomy', slug: 'brain-anatomy' },
  { id: 'amyloid-beta', slug: 'amyloid-beta' },
  { id: 'heart-failure', slug: 'heart-failure' },
  { id: 'copd-hyperinflation', slug: 'copd' },
  { id: 'myocardial-ischemia', slug: 'myocardial-ischemia' },
]);

const DEVICES = Object.freeze([
  { id: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { id: 'phone', width: 375, height: 812, isMobile: true, hasTouch: true },
]);

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`No build at ${distDir}; run VITE_ALLOW_PREVIEW=1 npm run build first.`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

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
  console.error('Playwright is required for the browser-first audit.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const root = resolve(distDir);
function fileFor(urlPath) {
  const decoded = decodeURIComponent((urlPath ?? '/').split('?')[0]);
  const candidate = resolve(root, `.${normalize(decoded)}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return existsSync(candidate) ? candidate : null;
}

const server = createServer((request, response) => {
  const file = fileFor(request.url) ?? join(root, 'index.html');
  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ headless: !headed });
const FAKE_USER = { id: 'release-candidate-audit', email: 'audit@example.invalid' };
const FAKE_GRANTS = ['free', 'patient', 'education'];
const report = [];

function roundRect(rect) {
  if (!rect) return null;
  return Object.fromEntries(
    Object.entries(rect).map(([key, number]) => [key, Math.round(number * 10) / 10])
  );
}

async function installReviewSession(page, guide) {
  await page.route('**/.netlify/functions/entitlements*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entitlements: FAKE_GRANTS, subscriptions: [], user: FAKE_USER }),
    })
  );
  await page.route('**/.netlify/functions/paid-content*', (route) => {
    const type = new URL(route.request().url()).searchParams.get('type');
    if (type !== 'patient' || !guide) return route.fulfill({ status: 404, body: '{}' });
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ guide }),
    });
  });
  for (const path of ['billing-status', 'plan-catalog']) {
    await page.route(`**/.netlify/functions/${path}*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"billingConfigured":false}',
      })
    );
  }
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem('medical-3d-lab:lang', 'ja');
      localStorage.setItem(
        'medical3dlab.auth.v1',
        JSON.stringify({
          access_token: 'audit-token',
          refresh_token: 'audit-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
          user,
        })
      );
    },
    { user: FAKE_USER }
  );
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    };
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const style = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const canvas = document.querySelector('canvas');
    const r = canvas?.getBoundingClientRect();
    let canvasHit = null;
    if (r && r.width > 0 && r.height > 0) {
      const x = Math.max(r.left + 2, Math.min(r.right - 2, r.left + r.width * 0.5));
      const y = Math.max(r.top + 2, Math.min(r.bottom - 2, r.top + r.height * 0.45));
      const hit = document.elementFromPoint(x, y);
      canvasHit = hit === canvas || Boolean(hit?.closest?.('#viewer, .viewer, .canvas-wrap'));
    }
    return {
      frame: { width: innerWidth, height: innerHeight },
      bodyScrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      canvas: box('canvas'),
      header: box('.global-scene-nav'),
      console: box('.console'),
      anatomyPanel: box('.anatomy-panel'),
      patientGuide: box('.patient-guide'),
      navPanel: box('.global-nav-panel'),
      patientButtonVisible: visible('.patient-mode-button'),
      navTriggerVisible: visible('.global-nav-trigger'),
      canvasHit,
      title: document.querySelector('.scene-title, h1')?.textContent?.trim() ?? document.title,
    };
  });
}

async function cameraPose(page) {
  return page.evaluate(() => ({
    camera: window.__app?.viewer?.camera?.position?.toArray?.() ?? null,
    target: window.__app?.viewer?.controls?.target?.toArray?.() ?? null,
  }));
}

function poseMoved(before, after) {
  if (!before?.camera || !after?.camera) return false;
  const values = [...before.camera, ...(before.target ?? [])];
  const next = [...after.camera, ...(after.target ?? [])];
  return values.some((value, index) => Math.abs(value - next[index]) > 1e-3);
}

for (const target of TARGETS) {
  const manifest = SCENE_MANIFEST.find((scene) => scene.id === target.id || scene.slug === target.slug);
  if (!manifest) {
    report.push({ scene: target.id, fatal: 'scene missing from manifest' });
    continue;
  }
  const guide = patientGuideFor(target.id);

  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      locale: 'ja-JP',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await installReviewSession(page, guide);
    const issues = [];
    const prefix = `${target.slug}-${device.id}`;

    page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') issues.push(`console: ${message.text()}`);
    });

    try {
      await page.goto(`${base}?preview=1#/` + target.slug, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(
        (expected) => window.__app?.scene && (window.__app?.scene?.id === expected || location.hash.endsWith(expected) || Boolean(document.querySelector('canvas'))),
        target.id,
        { timeout: 30000 }
      );
      await page.waitForTimeout(1200);

      // If an older consent implementation is present, decline rather than
      // hiding it in CSS: this audit must use the same controls a reader gets.
      for (const label of ['No thanks', '許可しない']) {
        const consent = page.getByRole('button', { name: label, exact: false }).first();
        if (await consent.isVisible().catch(() => false)) {
          await consent.click().catch(() => {});
          await page.waitForTimeout(250);
          break;
        }
      }

      const before = await cameraPose(page);
      const canvas = page.locator('canvas').first();
      const canvasBox = await canvas.boundingBox();
      if (!canvasBox || canvasBox.width < 80 || canvasBox.height < 80) {
        issues.push('canvas has no usable on-screen area');
      } else {
        const x = canvasBox.x + canvasBox.width * 0.52;
        const y = canvasBox.y + canvasBox.height * 0.46;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + Math.min(90, canvasBox.width * 0.18), y + 20, { steps: 8 });
        await page.mouse.up();
        await page.mouse.wheel(0, -180);
        await page.waitForTimeout(450);
      }
      const after = await cameraPose(page);
      if (before.camera && !poseMoved(before, after)) issues.push('canvas drag/zoom did not move the camera');

      const proGeometry = await geometry(page);
      if (proGeometry.horizontalOverflow > 1) issues.push(`horizontal overflow ${proGeometry.horizontalOverflow}px`);
      if (proGeometry.canvasHit === false) issues.push('rendered canvas is not reachable at its visual center');
      await page.screenshot({ path: join(outDir, `${prefix}-pro.png`) });

      const navTrigger = page.locator('.global-nav-trigger').first();
      let navGeometry = null;
      if (await navTrigger.isVisible().catch(() => false)) {
        await navTrigger.click();
        await page.waitForSelector('.global-nav-panel:not([hidden])', { timeout: 5000 });
        await page.waitForTimeout(200);
        navGeometry = await geometry(page);
        await page.screenshot({ path: join(outDir, `${prefix}-navigation.png`) });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(180);
      } else {
        issues.push('model navigation trigger is not visible in preview');
      }

      let patientGeometry = null;
      let restoredGeometry = null;
      const patientButton = page.locator('.patient-mode-button').first();
      const patientAvailable = await patientButton.isVisible().catch(() => false);
      if (guide && patientAvailable) {
        await patientButton.click();
        await page.waitForSelector('#ui.is-patient-guide .patient-guide', { timeout: 10000 });
        await page.waitForTimeout(450);
        patientGeometry = await geometry(page);
        if (patientGeometry.horizontalOverflow > 1) issues.push(`patient mode horizontal overflow ${patientGeometry.horizontalOverflow}px`);
        await page.screenshot({ path: join(outDir, `${prefix}-patient.png`) });

        const next = page.locator('.patient-guide-nav.primary').first();
        if (await next.isVisible().catch(() => false)) {
          await next.click().catch(() => {});
          await page.waitForTimeout(500);
        }
        const close = page.locator('.patient-guide-close').first();
        if (await close.isVisible().catch(() => false)) {
          await close.click();
          await page.waitForTimeout(500);
          restoredGeometry = await geometry(page);
          await page.screenshot({ path: join(outDir, `${prefix}-pro-restored.png`) });
        } else {
          issues.push('patient explanation has no visible close control');
        }
      } else if (guide && !patientAvailable) {
        issues.push('authored patient guide exists but Patient entry is not visible');
      }

      report.push({
        scene: target.id,
        slug: target.slug,
        device: device.id,
        viewport: { width: device.width, height: device.height },
        patientGuide: Boolean(guide),
        cameraMoved: poseMoved(before, after),
        pro: {
          ...proGeometry,
          canvas: roundRect(proGeometry.canvas),
          header: roundRect(proGeometry.header),
          console: roundRect(proGeometry.console),
          anatomyPanel: roundRect(proGeometry.anatomyPanel),
        },
        navigation: navGeometry
          ? { ...navGeometry, navPanel: roundRect(navGeometry.navPanel) }
          : null,
        patient: patientGeometry
          ? { ...patientGeometry, patientGuide: roundRect(patientGeometry.patientGuide) }
          : null,
        restored: restoredGeometry
          ? { ...restoredGeometry, patientGuide: roundRect(restoredGeometry.patientGuide) }
          : null,
        issues: [...new Set(issues)],
      });
    } catch (error) {
      report.push({
        scene: target.id,
        slug: target.slug,
        device: device.id,
        viewport: { width: device.width, height: device.height },
        fatal: error?.stack ?? String(error),
        issues: [...new Set(issues)],
      });
      await page.screenshot({ path: join(outDir, `${prefix}-fatal.png`) }).catch(() => {});
    } finally {
      await context.close();
    }
  }
}

await browser.close();
server.close();

writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const cards = report
  .filter((row) => row.slug && row.device)
  .map((row) => {
    const files = ['pro', 'navigation', 'patient', 'pro-restored']
      .map((kind) => `${row.slug}-${row.device}-${kind}.png`)
      .filter((file) => existsSync(join(outDir, file)));
    const issueText = row.fatal
      ? `<strong>FATAL</strong><pre>${String(row.fatal).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</pre>`
      : row.issues?.length
        ? `<ul>${row.issues.map((issue) => `<li>${issue}</li>`).join('')}</ul>`
        : '<p>No automated interaction/geometry issue.</p>';
    return `<section><h2>${row.scene} · ${row.device}</h2>${issueText}<div class="shots">${files
      .map((file) => `<figure><img src="./${file}" alt="${file}"><figcaption>${file}</figcaption></figure>`)
      .join('')}</div></section>`;
  })
  .join('\n');

writeFileSync(
  join(outDir, 'index.html'),
  `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Medical 3D Lab browser audit</title><style>body{font:14px/1.5 system-ui;margin:24px;background:#111;color:#eee}section{margin:0 0 48px}h2{font-size:18px}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #444;background:#000}figcaption{margin-top:6px;color:#aaa;word-break:break-all}li{color:#ffb3a7}pre{white-space:pre-wrap}</style><body><h1>Browser-first release candidate audit</h1><p>Real Chromium, generated from this deploy preview. Production release gates are unchanged.</p>${cards}</body></html>`
);

const fatal = report.filter((row) => row.fatal);
const issues = report.flatMap((row) => row.issues ?? []);
console.log(`Browser-first audit: ${report.length} scene/device runs, ${fatal.length} fatal, ${issues.length} issue(s).`);
for (const row of report) {
  console.log(`  ${row.scene ?? 'unknown'} / ${row.device ?? 'unknown'}: ${row.fatal ? 'FATAL' : row.issues?.length ? row.issues.join('; ') : 'ok'}`);
}
if (fatal.length) process.exit(1);
