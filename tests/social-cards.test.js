/**
 * What a link-preview card says.
 *
 * The rasteriser needs a browser and is not run here; what is checked is the
 * markup it draws, which is a pure function of the catalogue. The one thing a
 * card must never lose — the line saying this is an educational model and not
 * for patient care — is checked on every card, because a card travels without
 * the page it came from.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { PUBLIC_SCENES, LAB_SCENES } from '../src/catalog/index.js';
import { SYSTEMS } from '../src/catalog/taxonomy.js';
import {
  CLINICAL_REVIEW_PRESENTABLE_STATUSES,
  clinicalReviewPresentation,
} from '../src/catalog/clinicalReview.js';
import {
  BODY_BUDGET,
  CARD_HEIGHT,
  CARD_WIDTH,
  clip,
  siteCardHtml,
  socialCardHtml,
  subtitleSize,
  titleSize,
} from '../scripts/social-card.js';
import { renderScenePage } from '../scripts/site-metadata.js';
import { pngSize, socialCardProblems } from '../scripts/check-social-cards.js';

const systemById = new Map(SYSTEMS.map((system) => [system.id, system]));
const cardFor = (scene) =>
  socialCardHtml(scene, {
    system: systemById.get(scene.system) ?? null,
    reviewStatus: clinicalReviewPresentation(scene).status,
  });

const social = (path) => new URL(`../public/social/${path}`, import.meta.url);

// --- what every card must carry --------------------------------------------

test('cards: every public scene gets a card that names it in both languages', () => {
  for (const scene of PUBLIC_SCENES) {
    const html = cardFor(scene);
    assert.ok(html.includes(clip(scene.titleJa, 30)), `${scene.slug}: no Japanese title`);
    assert.ok(html.includes(clip(scene.titleEn, 56)), `${scene.slug}: no English title`);
  }
});

test('cards: the educational boundary is on every card, in both languages', () => {
  for (const scene of PUBLIC_SCENES) {
    const html = cardFor(scene);
    assert.match(html, /教育目的の概念モデル/, `${scene.slug}: no Japanese boundary`);
    assert.match(html, /not for patient diagnosis or treatment/, `${scene.slug}: no English boundary`);
  }
  // And on the site card, which is the one most likely to be shared.
  assert.match(siteCardHtml(), /教育目的の概念モデル/);
  assert.match(siteCardHtml(), /not for patient diagnosis or treatment/);
});

test('cards: maturity and clinical review are shown as two separate claims', () => {
  // The whole point of the Trust surface is that "the engineering is finished"
  // and "a clinician signed it" are different sentences. A card that collapsed
  // them would undo that at the moment a reader is deciding whether to click.
  const copd = PUBLIC_SCENES.find((scene) => scene.slug === 'copd');
  assert.ok(copd);
  const html = cardFor(copd);
  assert.equal(copd.status, 'reviewed');
  assert.equal(clinicalReviewPresentation(copd).status, 'stale');
  assert.match(html, /Reviewed/, 'the catalogue maturity is missing');
  assert.match(html, /Re-review required/, 'the review being stale is missing');
});

test('cards: every review state a surface can meet has copy of its own', () => {
  const scene = PUBLIC_SCENES[0];
  for (const status of CLINICAL_REVIEW_PRESENTABLE_STATUSES) {
    if (status === 'pending') continue;
    const html = socialCardHtml(scene, { reviewStatus: status });
    // The fallback is `pending`, so a state with no copy of its own is caught
    // by finding pending's wording where it does not belong. `unrecorded` is
    // in this list for the same reason `stale` had to be: it is not a registry
    // state, it is what a scene with no registry entry resolves to, and saying
    // "pending" for it claims a review nobody has started.
    assert.doesNotMatch(
      html,
      /Clinical review pending/,
      `"${status}" falls back to the pending wording instead of having its own`
    );
  }
  // And the same on the page the card links to.
  for (const status of CLINICAL_REVIEW_PRESENTABLE_STATUSES) {
    if (status === 'pending') continue;
    const page = renderScenePage(scene, { review: { reviewStatus: status } });
    assert.doesNotMatch(page, /Clinical review pending/, `the page falls back for "${status}"`);
  }
});

test('cards: a card is never drawn for a scene the catalogue does not publish', () => {
  const labSlugs = new Set(LAB_SCENES.map((scene) => scene.slug));
  for (const slug of labSlugs) {
    assert.ok(!existsSync(social(`${slug}.png`)), `${slug} is a Lab scene and must not be advertised`);
  }
});

// --- the committed rasters -------------------------------------------------

test('cards: the committed set still says what the catalogue says', () => {
  // The same function `npm run cards:check` runs, rather than a second
  // implementation of it. It compares the markup each card was drawn from, not
  // the pixels: the cards are drawn with the fonts of whichever machine drew
  // them, so comparing images would fail on any other machine — including
  // every CI runner — for a reason unrelated to the change.
  const problems = socialCardProblems();
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('cards: every committed card is a 1200x630 PNG within its size cap', () => {
  let total = 0;
  for (const scene of [...PUBLIC_SCENES.map((s) => s.slug), 'site']) {
    const png = readFileSync(social(`${scene}.png`));
    const size = pngSize(png);
    assert.ok(size, `${scene} is not a PNG`);
    assert.deepEqual(size, { width: CARD_WIDTH, height: CARD_HEIGHT }, `${scene} is the wrong size`);
    // A card is fetched by crawlers rather than by readers, so it is not part
    // of the app's ship weight and `npm run budget` does not see it. That is
    // the reason to bound it here instead: an unbounded set of committed
    // images is how a repository quietly gains a megabyte a year.
    assert.ok(png.length < 400_000, `${scene} is ${Math.round(png.length / 1024)}kB, over the 400kB cap`);
    total += png.length;
  }
  assert.ok(total < 3_000_000, `the card set is ${Math.round(total / 1024)}kB, over the 3MB cap`);
});

test('cards: the generated page advertises the card that exists', () => {
  const scene = PUBLIC_SCENES[0];
  const withCard = renderScenePage(scene, {
    baseUrl: 'https://example.test',
    socialCards: new Set([scene.slug]),
  });
  assert.match(withCard, new RegExp(`og:image[^>]*social/${scene.slug}\\.png`));
  // And says nothing when there is none: a preview that cannot render the
  // image shows a broken card, which is worse than showing no card.
  const without = renderScenePage(scene, { baseUrl: 'https://example.test', socialCards: new Set() });
  assert.doesNotMatch(without, /og:image/);
});

// --- the layout budget -----------------------------------------------------

test('cards: the type scale shrinks as a title grows', () => {
  assert.ok(titleSize('COPD') > titleSize('Cirrhosis and portal hypertension'));
  assert.ok(
    titleSize('Cirrhosis and portal hypertension') >
      titleSize('Hepatorenal syndrome — the haemodynamic mechanism')
  );
  assert.ok(subtitleSize('心不全') > subtitleSize('肝腎症候群（HRS-AKI）— 循環からみる腎機能低下'));
});

test('cards: clipping keeps a word boundary where there is one, and marks the cut', () => {
  assert.equal(clip('short', 20), 'short');
  // A space close enough to the limit is where it breaks...
  assert.equal(clip('a much longer sentence than fits', 20), 'a much longer…');
  // ...and one too far back is not, because breaking there would throw away
  // most of the room the card has.
  assert.equal(clip('a much longer sentence than fits', 12), 'a much longe…');
  // Japanese has no spaces to break on, so it is cut hard rather than dropped.
  assert.equal(clip('あいうえおかきくけこ', 5), 'あいうえお…');
  assert.equal(clip(null, 10), '');
});

test('cards: the description budget can shrink but never to nothing', () => {
  assert.ok(BODY_BUDGET.start > BODY_BUDGET.floor);
  assert.ok(BODY_BUDGET.step > 0);
  // A floor low enough to be useless would let the rasteriser "fit" a card by
  // deleting the description entirely rather than reporting a title that does
  // not fit.
  assert.ok(BODY_BUDGET.floor >= 20);
  const html = socialCardHtml(PUBLIC_SCENES[0], { bodyChars: BODY_BUDGET.floor });
  assert.ok(html.includes('class="body"'));
});
