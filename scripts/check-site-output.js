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

/**
 * The addresses by which a page names *itself* — canonical, Open Graph and
 * the preview image. Deliberately not every absolute URL in the markup: a
 * page also links to a font host and to sources, and those are supposed to
 * be somewhere else.
 */
function selfDeclaredOrigins(html) {
  const origins = new Set();
  const tags = html.match(/<(?:link|meta)[^>]*>/g) ?? [];
  for (const tag of tags) {
    if (!/rel="canonical"|og:url|og:image|twitter:image/.test(tag)) continue;
    const url = tag.match(/(?:href|content)="(https?:\/\/[^"]+)"/)?.[1];
    if (!url) continue;
    try {
      origins.add(new URL(url).origin);
    } catch {
      problems.push(`a page declares itself at an unparseable address: ${url}`);
    }
  }
  return origins;
}

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

  // A domain change is the one moment these can disagree: canonical, Open
  // Graph and the sitemap are all baked at build time from `VITE_SITE_URL`,
  // so a deploy that moved to a new domain without rebuilding — or rebuilt
  // with the variable still holding the old one — publishes pages that name a
  // host the sitemap does not. That is invisible in the browser and decisive
  // to a crawler, which is exactly the failure worth a check.
  const siteOrigin = new URL(xml.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? 'https://invalid.invalid').origin;
  const pages = [
    ['the application shell', join(distDir, 'index.html')],
    ...PUBLIC_SCENES.map((scene) => [scene.id, join(distDir, scenePagePath(scene))]),
  ];
  for (const [name, path] of pages) {
    if (!existsSync(path)) continue;
    const foreign = [...selfDeclaredOrigins(readFileSync(path, 'utf8'))].filter(
      (origin) => origin !== siteOrigin
    );
    if (foreign.length) {
      problems.push(`${name}: addresses ${foreign.join(', ')} but the sitemap says ${siteOrigin}`);
    }
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
