import { chromium } from 'playwright';
const slugs = process.argv.slice(2);
const out = process.env.SHOT_DIR;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
for (const slug of slugs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const issues = [];
  page.on('console', (m) => {
    const t = m.text();
    if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('GPU stall') && !t.includes('ERR_CONNECTION_RESET')) issues.push(`[${m.type()}] ${t.slice(0, 160)}`);
  });
  page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message.slice(0, 240)}`));
  await page.goto(`http://127.0.0.1:4173/#/${slug}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.loading') || document.documentElement.dataset.route === 'explorer', null, { timeout: 60000 }).catch(() => issues.push('[timeout] still loading'));
  await page.waitForTimeout(1400);
  if (slug !== 'organs') { await page.evaluate(() => window.__app?.playback?.set(0.6)); await page.waitForTimeout(1500); }
  await page.screenshot({ path: `${out}/${slug}.png` });
  console.log(slug.padEnd(22), issues.length ? 'ISSUES: ' + issues.slice(0, 2).join(' | ') : 'clean');
  await page.close();
}
await browser.close();
