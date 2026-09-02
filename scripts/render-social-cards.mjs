#!/usr/bin/env node
/**
 * Rasterises the link-preview cards into `public/social/`.
 *
 *   npm i --no-save playwright && npx playwright install --with-deps chromium
 *   npm run cards
 *
 * The PNGs are **committed**, not built. A link preview is a static asset that
 * a crawler fetches once and caches for weeks, and making every build depend on
 * a browser download to produce nine images that change perhaps twice a year is
 * the wrong trade. `npm run verify:site` checks the committed set is complete;
 * this is what refreshes it when a title, a maturity or a review state changes.
 *
 * The consequence of not building them is that they can go stale, so
 * `--check` re-renders into a temporary directory and compares, which is what
 * CI runs: a card that no longer matches the catalogue fails the build without
 * needing the build to draw it.
 *
 * Options:
 *   --check         render and compare against what is committed; write nothing
 *   --out <dir>     where to write (default: public/social)
 *   --only <slug>   one card (repeatable)
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { PUBLIC_SCENES } from '../src/catalog/index.js';
import { SYSTEMS } from '../src/catalog/taxonomy.js';
import { clinicalReviewPresentation } from '../src/catalog/clinicalReview.js';
import { BODY_BUDGET, CARD_HEIGHT, CARD_WIDTH, siteCardHtml, socialCardHtml } from './social-card.js';

const argv = process.argv.slice(2);
const has = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const only = argv.reduce(
  (all, item, at) => (item === '--only' && argv[at + 1] ? [...all, argv[at + 1]] : all),
  []
);

const check = has('--check');
const outDir = value('--out', check ? '.social-check' : join('public', 'social'));

async function loadChromium() {
  for (const pkg of ['playwright', 'playwright-core']) {
    try {
      const mod = await import(pkg);
      return mod.chromium ?? mod.default?.chromium;
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    }
  }
  return null;
}

const chromium = await loadChromium();
if (!chromium) {
  console.error(
    [
      'Playwright is not installed, so no card was drawn.',
      '',
      '  npm i --no-save playwright',
      '  npx playwright install --with-deps chromium',
      '',
      'It is deliberately not a dependency: the cards are committed assets and',
      '`npm test` must stay a plain `node --test` run with no browser download.',
    ].join('\n')
  );
  process.exit(1);
}

const systemById = new Map(SYSTEMS.map((system) => [system.id, system]));

/** Everything to draw: one card per public scene, plus one for the site. */
const cards = [
  ...PUBLIC_SCENES.map((scene) => ({
    slug: scene.slug,
    // A function of the description length, because the rasteriser retries
    // with a shorter one until the browser says the card fits.
    html: (bodyChars) =>
      socialCardHtml(scene, {
        system: systemById.get(scene.system) ?? null,
        reviewStatus: clinicalReviewPresentation(scene).status,
        bodyChars,
      }),
  })),
  { slug: 'site', html: () => siteCardHtml({ sceneCount: PUBLIC_SCENES.length }) },
].filter((card) => only.length === 0 || only.includes(card.slug));

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  // Nothing here is allowed off the machine: the card must be reproducible
  // from the catalogue alone, and a webfont fetched at draw time is not.
  args: ['--host-resolver-rules=MAP * ~NOTFOUND', '--no-proxy-server', '--disable-background-networking'],
});

const overflowed = [];
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 12);
const drawn = [];

try {
  const context = await browser.newContext({
    viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  /** Draw once and ask the browser what happened. */
  const attempt = async (html) => {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts?.ready);
    // Measured, not eyeballed. A card is a fixed 1200x630, and the first
    // version of this check asked whether anything ran past the bottom edge —
    // which the card's own `overflow: hidden` had already made impossible, so
    // it could never fire. It was verified by making a card far too tall and
    // watching it pass.
    //
    // What is actually worth knowing is whether the clip *did anything*: the
    // head is the part allowed to shrink, so content taller than the space it
    // has means a description was cut off mid-line. The boundary line is
    // separately confirmed to be inside the frame, because it is the one thing
    // that may never be lost.
    const fit = await page.evaluate((height) => {
      const head = document.querySelector('.head');
      const foot = document.querySelector('.foot');
      return {
        clipped: head ? Math.max(0, head.scrollHeight - head.clientHeight) : 0,
        footBottom: foot ? Math.round(foot.getBoundingClientRect().bottom) : null,
        footInside: foot ? foot.getBoundingClientRect().bottom <= height + 1 : false,
      };
    }, CARD_HEIGHT);
    return fit;
  };

  for (const card of cards) {
    let bodyChars = BODY_BUDGET.start;
    let fit = await attempt(card.html(bodyChars));
    while (fit.clipped > 1 && bodyChars > BODY_BUDGET.floor) {
      bodyChars -= BODY_BUDGET.step;
      fit = await attempt(card.html(bodyChars));
    }
    if (fit.clipped > 1) {
      overflowed.push(
        `${card.slug}: ${fit.clipped}px still cut off with the description at its ` +
          `${BODY_BUDGET.floor}-character floor — the title itself does not fit`
      );
    }
    if (!fit.footInside) {
      overflowed.push(
        `${card.slug}: the boundary line ends at ${fit.footBottom}px of ${CARD_HEIGHT}`
      );
    }
    const png = await page.screenshot({ type: 'png' });
    drawn.push({ slug: card.slug, png, bodyChars });
  }
  await context.close();
} finally {
  await browser.close();
}

if (overflowed.length) {
  console.error(`${overflowed.length} card(s) do not fit and were not written:`);
  for (const line of overflowed) console.error(`  - ${line}`);
  process.exit(1);
}

if (!check) {
  for (const { slug, png } of drawn) writeFileSync(join(outDir, `${slug}.png`), png);
  console.log(`Drew ${drawn.length} card(s) at ${CARD_WIDTH}x${CARD_HEIGHT} into ${outDir}/`);
  for (const { slug, png, bodyChars } of drawn) {
    console.log(`  ${slug.padEnd(24)}${String(bodyChars).padStart(3)} chars  ${String(Math.round(png.length / 1024)).padStart(4)} kB  ${digest(png)}`);
  }
  process.exit(0);
}

// --- --check ---------------------------------------------------------------

const committedDir = join('public', 'social');
const problems = [];
for (const { slug, png } of drawn) {
  const path = join(committedDir, `${slug}.png`);
  if (!existsSync(path)) {
    problems.push(`${slug}: no committed card at ${path}`);
    continue;
  }
  const committed = readFileSync(path);
  if (digest(committed) !== digest(png)) {
    problems.push(
      `${slug}: the committed card no longer matches the catalogue ` +
        `(${digest(committed)} vs ${digest(png)}) — run \`npm run cards\``
    );
  }
}
const expected = new Set(drawn.map((card) => card.slug));
if (existsSync(committedDir) && only.length === 0) {
  for (const name of readdirSync(committedDir).filter((file) => file.endsWith('.png'))) {
    const slug = name.replace(/\.png$/, '');
    if (!expected.has(slug)) problems.push(`${slug}: a card for a scene that is no longer public`);
  }
}
rmSync(outDir, { recursive: true, force: true });

console.log(`Link-preview cards — ${drawn.length} checked`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('  ok    every card matches the catalogue it was drawn from');
