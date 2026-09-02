#!/usr/bin/env node
/**
 * Verifies that the build actually emitted the crawlable surface.
 *
 * The unit tests prove the generator produces correct strings. This proves the
 * strings reached `dist/` — a plugin that silently stops running is exactly
 * the kind of failure nobody notices until a link preview is blank weeks later.
 *
 *   node scripts/check-site-output.js [dist-dir]
 *
 * Exits non-zero on a missing page, a missing robots.txt, or a Prototype scene
 * that has been published to the crawlable surface.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB_SCENES, PUBLIC_SCENES } from '../src/catalog/index.js';
import { scenePagePath } from './site-metadata.js';

const distDir = process.argv[2] ?? 'dist';
const problems = [];
const notes = [];

if (!existsSync(distDir)) {
  console.error(`No build found at "${distDir}" — run \`npm run build\` first.`);
  process.exit(1);
}

for (const scene of PUBLIC_SCENES) {
  const path = join(distDir, scenePagePath(scene));
  if (!existsSync(path)) {
    problems.push(`${scene.id}: no generated page at ${scenePagePath(scene)}`);
    continue;
  }
  const html = readFileSync(path, 'utf8');
  if (!html.includes(scene.titleJa)) problems.push(`${scene.id}: page does not name the scene`);
  if (!html.includes('application/ld+json')) problems.push(`${scene.id}: page carries no structured data`);
  if (!html.includes('教育目的の概念モデル')) {
    problems.push(`${scene.id}: page omits the educational-model boundary`);
  }
}

// A Prototype scene reaching a crawler is a claim we did not intend to make.
for (const scene of LAB_SCENES) {
  if (existsSync(join(distDir, scenePagePath(scene)))) {
    problems.push(`${scene.id}: Prototype work must not be published to the crawlable surface`);
  }
}

if (!existsSync(join(distDir, 'robots.txt'))) problems.push('robots.txt was not emitted');

const sitemapPath = join(distDir, 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  for (const scene of PUBLIC_SCENES) {
    if (!xml.includes(`/s/${scene.slug}/`)) problems.push(`${scene.id}: missing from the sitemap`);
  }
  for (const scene of LAB_SCENES) {
    if (xml.includes(`/s/${scene.slug}/`)) problems.push(`${scene.id}: Prototype work is in the sitemap`);
  }
} else {
  // Not a failure: without VITE_SITE_URL a sitemap would be relative paths,
  // which is worse than none. Say so, so a misconfigured deploy is visible.
  notes.push('sitemap.xml was not emitted — VITE_SITE_URL is not configured for this build.');
}

console.log(`Crawlable surface — ${PUBLIC_SCENES.length} scene pages checked in ${distDir}`);
for (const note of notes) console.log(`  note: ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('  ok    every public scene has a page, and no Prototype does');
