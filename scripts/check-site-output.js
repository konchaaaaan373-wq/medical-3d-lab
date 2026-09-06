#!/usr/bin/env node
/**
 * Verifies that the build actually emitted the crawlable surface.
 *
 * The unit tests prove the generator produces correct strings. This proves the
 * strings reached `dist/` — a plugin that silently stops running is exactly
 * the kind of failure nobody notices until a link preview is blank weeks later.
 *
 *   node scripts/check-site-output.js [dist-dir] [--origin <url>]
 *
 * Exits non-zero on a missing page, a missing robots.txt, or a Prototype scene
 * that has been published to the crawlable surface.
 *
 * `--origin` is the address the build was *meant* for, stated independently of
 * the environment it was built in. Without it this script can only prove the
 * output agrees with itself, and a build made with a stale `VITE_SITE_URL`
 * agrees with itself perfectly — every page and the sitemap name the old host
 * together. Passing the intended origin is what turns that from invisible into
 * a failure, which is why the domain-change checklist passes it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SCENES } from '../src/catalog/index.js';
import { LOCKED_SCENES, RELEASED_SCENES } from '../src/catalog/release.js';
import { scenePagePath } from './site-metadata.js';

const args = process.argv.slice(2);
const positional = [];
let requestedOrigin = '';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--origin') requestedOrigin = args[(i += 1)] ?? '';
  else if (args[i].startsWith('--origin=')) requestedOrigin = args[i].slice('--origin='.length);
  else positional.push(args[i]);
}
const distDir = positional[0] ?? 'dist';
const problems = [];
const notes = [];

/** An origin, or null — never a throw, so one bad address cannot hide the rest. */
function originOf(url) {
  try {
    return new URL(String(url)).origin;
  } catch {
    return null;
  }
}

let expectedOrigin = '';
if (requestedOrigin) {
  expectedOrigin = originOf(requestedOrigin) ?? '';
  if (!expectedOrigin) {
    console.error(`--origin "${requestedOrigin}" is not a URL. It needs a scheme: https://example.org`);
    process.exit(1);
  }
}

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
    const origin = originOf(url);
    if (origin) origins.add(origin);
    else problems.push(`a page declares itself at an unparseable address: ${url}`);
  }
  return origins;
}

if (!existsSync(distDir)) {
  console.error(`No build found at "${distDir}" — run \`npm run build\` first.`);
  process.exit(1);
}

/** Each emitted page, read once: `<name, markup>`, the shell included. */
const pages = new Map();
if (existsSync(join(distDir, 'index.html'))) {
  pages.set('the application shell', readFileSync(join(distDir, 'index.html'), 'utf8'));
}

for (const scene of RELEASED_SCENES) {
  const path = join(distDir, scenePagePath(scene));
  if (!existsSync(path)) {
    problems.push(`${scene.id}: no generated page at ${scenePagePath(scene)}`);
    continue;
  }
  const html = readFileSync(path, 'utf8');
  pages.set(scene.id, html);
  if (!html.includes(scene.titleJa)) problems.push(`${scene.id}: page does not name the scene`);
  if (!html.includes('application/ld+json')) problems.push(`${scene.id}: page carries no structured data`);
  if (!html.includes('教育目的の概念モデル')) {
    problems.push(`${scene.id}: page omits the educational-model boundary`);
  }
}

// A scene the release has not opened reaching a crawler is a claim we did not
// intend to make: for a Prototype because its shape and motion are provisional,
// and for anything else because the page would invite a reader to open a model
// that answers "to be updated".
for (const scene of LOCKED_SCENES) {
  if (existsSync(join(distDir, scenePagePath(scene)))) {
    problems.push(`${scene.id}: work the release has not opened must not be published to the crawlable surface`);
  }
}

if (!existsSync(join(distDir, 'robots.txt'))) problems.push('robots.txt was not emitted');

const sitemapPath = join(distDir, 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  for (const scene of RELEASED_SCENES) {
    if (!xml.includes(`/s/${scene.slug}/`)) problems.push(`${scene.id}: missing from the sitemap`);
  }
  for (const scene of LOCKED_SCENES) {
    if (xml.includes(`/s/${scene.slug}/`)) problems.push(`${scene.id}: work the release has not opened is in the sitemap`);
  }

  // Canonical, Open Graph and the sitemap are all baked in at build time from
  // one variable, so they normally agree by construction — and that is the
  // trap. A build carrying a stale `VITE_SITE_URL` agrees with itself while
  // every page names the host the site has left, which no browser shows and
  // every crawler believes. Only an origin stated from outside the build can
  // catch that, so `--origin` decides what these are measured against; without
  // it this is the weaker check that they at least all name one host.
  const firstLoc = xml.match(/<loc>([^<]+)<\/loc>/)?.[1];
  const sitemapOrigin = firstLoc ? originOf(firstLoc) : null;
  if (!sitemapOrigin) {
    problems.push(`sitemap.xml does not begin with a usable address (${firstLoc ?? 'no <loc> at all'})`);
  } else if (expectedOrigin && sitemapOrigin !== expectedOrigin) {
    problems.push(`sitemap.xml is built for ${sitemapOrigin}, not ${expectedOrigin}`);
  }

  const siteOrigin = expectedOrigin || sitemapOrigin;
  if (siteOrigin) {
    for (const [name, html] of pages) {
      const foreign = [...selfDeclaredOrigins(html)].filter((origin) => origin !== siteOrigin);
      if (foreign.length) {
        problems.push(`${name}: addresses ${foreign.join(', ')}, not ${siteOrigin}`);
      }
    }
  }
  if (!expectedOrigin) {
    notes.push(
      `pages were checked against each other and against the sitemap (${sitemapOrigin ?? 'unknown'}), ` +
        'not against an intended domain — pass --origin <url> to check that too.'
    );
  }
} else {
  // Not a failure: without VITE_SITE_URL a sitemap would be relative paths,
  // which is worse than none. Say so, so a misconfigured deploy is visible.
  notes.push('sitemap.xml was not emitted — VITE_SITE_URL is not configured for this build.');
}

console.log(
  `Crawlable surface — ${RELEASED_SCENES.length} of ${SCENES.length} scene pages checked in ${distDir}`
);
for (const note of notes) console.log(`  note: ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('  ok    every released scene has a page, and nothing the release holds back does');
