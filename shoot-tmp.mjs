/**
 * Representative renders of the three organ anatomy scenes.
 *
 * Serves the preview build and drives the real slider and the real viewpoint
 * buttons, so what is captured is the product rather than a state written into
 * it from outside.
 */
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const distDir = resolve('dist');
const outDir = process.argv[2] ?? '/tmp/shots';
mkdirSync(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.md': 'text/markdown', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  let file = resolve(distDir, `.${normalize(path)}`);
  if (!existsSync(file) || path === '/') file = join(distDir, 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const SCENES = (process.env.SCENES ? process.env.SCENES.split(',') : [
  'lung-anatomy', 'liver-anatomy', 'kidney-anatomy',
  'stomach-anatomy', 'intestine-anatomy', 'pancreas-anatomy',
]).map((slug) => ({ slug, section: /liver|pancreas/.test(slug) ? '横断（切断）' : '前額断（切断）' }));
const VIEWPORTS = (process.env.VIEWPORTS ? process.env.VIEWPORTS.split(',') : ['desktop', 'phone', 'phone-landscape']).map(
  (id) => ({ desktop: { id, width: 1440, height: 900 }, phone: { id, width: 375, height: 667 }, 'phone-landscape': { id, width: 844, height: 390 } }[id])
);

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport });
  for (const scene of SCENES) {
    await page.goto(`${base}?preview=1#/${scene.slug}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2500);
    // Dismiss the consent question so it is not in every frame.
    const consent = page.locator('button', { hasText: '許可しない' });
    if (await consent.count()) await consent.first().click();
    await page.waitForTimeout(400);

    const slider = page.locator('input.slider[type="range"]').first();
    for (const [name, value] of [['layer-0', '0'], ['layer-mid', '600'], ['layer-1', '1000']]) {
      if (await slider.count()) {
        await slider.evaluate((el, v) => {
          el.value = v;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
      }
      await page.waitForTimeout(1400);
      await page.screenshot({ path: join(outDir, `${scene.slug}-${viewport.id}-${name}.png`) });
    }

    if (viewport.id === 'desktop') {
      // The section view, through the real controls: Display tab, then the button.
      // Back to the outer layer first: a cut through tissue that has been
      // faded to a hint shows nothing, and the section view is about tissue.
      if (await slider.count()) {
        await slider.evaluate((el) => {
          el.value = '0';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
      await page.waitForTimeout(1200);
      const parts = page.locator('.anatomy-panel-tab', { hasText: '表示' });
      if (await parts.count()) {
        await parts.first().click();
        await page.waitForTimeout(300);
        const button = page.locator('button', { hasText: scene.section });
        if (await button.count()) {
          await button.first().click();
          await page.waitForTimeout(1600);
          await page.screenshot({ path: join(outDir, `${scene.slug}-desktop-section.png`) });
        } else {
          console.log(`${scene.slug}: no section button found`);
        }
      }
    }
  }
  await page.close();
}

await browser.close();
server.close();
console.log('shots in', outDir);
