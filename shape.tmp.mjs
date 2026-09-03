import { chromium } from 'playwright';

const OUT = '/tmp/claude-0/-home-user-medical-3d-lab/6fcf86a7-864b-576b-bde5-3b6941878162/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
page.route('**', (route) =>
  /googleapis|gstatic|accounts\.google/.test(route.request().url()) ? route.abort() : route.continue()
);
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => {
  if (m.type() === 'error' && !/net::|404 \(Not Found\)|ERR_FAILED/.test(m.text())) errs.push(m.text().slice(0, 200));
});

for (const [name, route] of [
  ['copd2', '#/copd'],
  ['breathing2', '#/breathing-lungs'],
  ['edema2', '#/pulmonary-edema'],
  ['asthma2', '#/asthma'],
  ['body2', '#/body-overview'],
]) {
  await page.goto(`http://localhost:4173/?qa${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /許可しない|Decline/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);

  // The drawing buffer is not preserved, so force a render and read that frame.
  const lit = await page.evaluate(() => {
    const viewer = window.__lab?.viewer;
    const canvas = viewer?.renderer?.domElement ?? document.querySelector('canvas');
    if (!canvas) return null;
    if (viewer) {
      viewer.composer ? viewer.composer.render() : viewer.renderer.render(viewer.scene, viewer.camera);
    }
    const flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    const ctx = flat.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    const d = ctx.getImageData(0, 0, flat.width, flat.height).data;
    let n = 0;
    let peak = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (l > 24) n++;
      if (l > peak) peak = l;
    }
    return { lit: n, peak: +peak.toFixed(1), hasLab: Boolean(viewer) };
  });
  console.log(name.padEnd(12), JSON.stringify(lit));
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
