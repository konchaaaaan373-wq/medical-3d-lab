#!/usr/bin/env node
/**
 * Are the committed link-preview cards still the ones the catalogue asks for?
 *
 *   npm run cards:check
 *
 * **No browser.** The first version of this compared the SHA-256 of freshly
 * rendered PNGs against the committed ones, which cannot work: the cards are
 * drawn with whatever fonts the drawing machine has — the module that draws
 * them says so — so a CI runner with a different font set would fail every
 * pull request, including the ones that changed nothing. A check that fails
 * for a reason unrelated to the change is a check people learn to ignore.
 *
 * What is comparable on any machine is what the card was asked to *say*.
 * `npm run cards` records that as a digest of the markup, per slug, in
 * `cards.json`; this recomputes it from the catalogue and compares. A title, a
 * maturity, a review state or a description that changed shows up here; a
 * hinting difference does not.
 *
 * Exported as a function as well as a CLI so the test suite runs the same
 * check rather than a second implementation of it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PUBLIC_SCENES } from '../src/catalog/index.js';
import { SYSTEMS } from '../src/catalog/taxonomy.js';
import { clinicalReviewPresentation } from '../src/catalog/clinicalReview.js';
import { CARD_HEIGHT, CARD_WIDTH, cardDigest, siteCardHtml, socialCardHtml } from './social-card.js';

/** Where the record of what each card says lives, beside the cards. */
export const MANIFEST_FILE = 'cards.json';

/** The slug for the card used when a link points at the site rather than a scene. */
export const SITE_CARD = 'site';

const systemById = new Map(SYSTEMS.map((system) => [system.id, system]));

/** The markup a scene's card would be drawn from, at a given description length. */
export const htmlForScene = (scene, bodyChars) =>
  socialCardHtml(scene, {
    system: systemById.get(scene.system) ?? null,
    reviewStatus: clinicalReviewPresentation(scene).status,
    bodyChars,
  });

/**
 * Everything wrong with the committed card set, as readable lines.
 *
 * @param {string} [dir] where the cards live
 * @returns {string[]}
 */
export function socialCardProblems(dir = join('public', 'social')) {
  const problems = [];
  const manifestPath = join(dir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return [`no ${manifestPath} — run \`npm run cards\``];
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return [`${manifestPath} is not readable JSON: ${error.message}`];
  }
  const recorded = manifest?.cards ?? {};

  const expected = [
    ...PUBLIC_SCENES.map((scene) => ({ slug: scene.slug, html: (n) => htmlForScene(scene, n) })),
    { slug: SITE_CARD, html: () => siteCardHtml({ sceneCount: PUBLIC_SCENES.length }) },
  ];

  for (const { slug, html } of expected) {
    const entry = recorded[slug];
    if (!entry) {
      problems.push(`${slug}: no card recorded — run \`npm run cards\``);
      continue;
    }
    if (!existsSync(join(dir, `${slug}.png`))) {
      problems.push(`${slug}: recorded in ${MANIFEST_FILE} but the PNG is missing`);
      continue;
    }
    const digest = cardDigest(html(entry.bodyChars));
    if (digest !== entry.html) {
      problems.push(
        `${slug}: the catalogue no longer matches the committed card ` +
          `(${entry.html} recorded, ${digest} now) — run \`npm run cards\``
      );
    }
  }

  // And nothing advertised for something the catalogue no longer publishes: a
  // card left behind for a scene moved to the Lab would keep being served.
  const wanted = new Set(expected.map((card) => card.slug));
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.png'))) {
    const slug = name.replace(/\.png$/, '');
    if (!wanted.has(slug)) problems.push(`${slug}: a card for something the catalogue does not publish`);
  }
  for (const slug of Object.keys(recorded)) {
    if (!wanted.has(slug)) problems.push(`${slug}: recorded in ${MANIFEST_FILE} but not in the catalogue`);
  }

  return problems;
}

/** PNG signature plus the width and height from the IHDR chunk. */
export function pngSize(buffer) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((byte, index) => buffer[index] !== byte)) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = socialCardProblems(process.argv[2]);
  console.log(`Link-preview cards — ${PUBLIC_SCENES.length + 1} expected at ${CARD_WIDTH}x${CARD_HEIGHT}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('  ok    every card still says what the catalogue says');
}
