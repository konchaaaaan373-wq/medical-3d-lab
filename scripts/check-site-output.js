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
 * Exits non-zero on a missing page, a missing robots.txt, a Prototype scene
 * that has been published to the crawlable surface, or anything in `dist/` that
 * belongs to a model the release does not open.
 *
 * That last one is the check `public/` needs. Everything under `public/` is
 * copied into `dist/` wholesale, so a link-preview card, a mesh or a stale page
 * for a withheld model ships with the site unless somebody notices — and
 * "nobody noticed" is not a delivery boundary. The scene chunks are checked for
 * the same reason: a dynamic import that is code-split is still downloadable,
 * so `scripts/scene-loaders-plugin.js` keeps the locked ones out of the bundle
 * and this proves it worked.
 *
 * The assets are checked the same way and for the same reason: `public/` is
 * copied wholesale, so a mesh or a texture belonging to a withheld model ships
 * unless something looks. `scripts/asset-delivery.js` derives what is allowed
 * from the asset manifest rather than from filenames.
 *
 * This is also where the publication decisions are checked against the disk.
 * The release gate runs in the browser and takes a recorded path at its word,
 * because it has no filesystem; here there is one, so a decision citing a
 * record or a piece of evidence that does not exist fails the build.
 *
 * Run it against a **production** build. A preview build (`VITE_ALLOW_PREVIEW=1`)
 * deliberately keeps every scene, so it fails here — which is the right answer:
 * a preview build is not what gets deployed.
 *
 * `--origin` is the address the build was *meant* for, stated independently of
 * the environment it was built in. Without it this script can only prove the
 * output agrees with itself, and a build made with a stale `VITE_SITE_URL`
 * agrees with itself perfectly — every page and the sitemap name the old host
 * together. Passing the intended origin is what turns that from invisible into
 * a failure, which is why the domain-change checklist passes it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { SCENES } from '../src/catalog/index.js';
import { ASSET_MANIFEST } from '../src/catalog/assetManifest.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { CRAWLABLE_SCENES, RELEASED_SCENES, betaPublicationProblems } from '../src/catalog/release.js';
import { assetDeliveryProblems, requiredAssetIdsFor } from './asset-delivery.js';
import { originOf, selfDeclaredUrls } from './read-page-metadata.js';
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

let expectedOrigin = '';
if (requestedOrigin) {
  expectedOrigin = originOf(requestedOrigin) ?? '';
  if (!expectedOrigin) {
    console.error(`--origin "${requestedOrigin}" is not a URL. It needs a scheme: https://example.org`);
    process.exit(1);
  }
}

/** The distinct origins a page names itself at, bad addresses reported. */
function selfDeclaredOrigins(html) {
  const origins = new Set();
  for (const url of selfDeclaredUrls(html)) {
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

for (const scene of CRAWLABLE_SCENES) {
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
for (const scene of SCENES) {
  if (CRAWLABLE_SCENES.includes(scene)) continue;
  if (existsSync(join(distDir, scenePagePath(scene)))) {
    problems.push(`${scene.id}: neither open nor public, so it must not be on the crawlable surface`);
  }
}

if (!existsSync(join(distDir, 'robots.txt'))) problems.push('robots.txt was not emitted');

/** Every file under `dist/`, as paths relative to it, with `/` separators. */
function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

const emitted = walk(distDir);

/**
 * The chunk basename Rollup derives for a scene's module.
 *
 * `src/scenes/nervous/scenes/brainAnatomy/index.js` becomes
 * `brainAnatomy-<hash>.js`, because Rollup names an `index` chunk after the
 * directory holding it. Read from the manifest's own loader source so it stays
 * true when a scene moves.
 */
const chunkBaseFor = (scene) => {
  const specifier = String(scene.load).match(/import\('([^']+)'\)/)?.[1] ?? '';
  const parts = specifier.split('/').filter(Boolean);
  const leaf = parts.at(-1) === 'index.js' ? parts.at(-2) : parts.at(-1)?.replace(/\.js$/, '');
  return leaf ?? null;
};

const releasedChunkBases = new Set(RELEASED_SCENES.map(chunkBaseFor).filter(Boolean));

for (const scene of SCENES) {
  if (RELEASED_SCENES.includes(scene)) continue;

  // A card is an advertisement for a page. No page, no card.
  const card = `social/${scene.slug}.png`;
  if (emitted.includes(card)) {
    problems.push(`${scene.id}: the release does not open it, but ${card} shipped`);
  }

  // And its code is not in the bundle at all. Skipped when another scene that
  // *is* open compiles to the same chunk name, which would make this ambiguous
  // rather than wrong.
  const base = chunkBaseFor(scene);
  if (!base || releasedChunkBases.has(base)) continue;
  const shipped = emitted.filter((file) => file.startsWith(`assets/${base}-`) && file.endsWith('.js'));
  if (shipped.length) {
    problems.push(`${scene.id}: the release does not open it, but its code shipped as ${shipped.join(', ')}`);
  }
}

// Source maps name every original file and inline their contents; a service
// worker keeps serving what a previous deploy cached, which is how a withheld
// page comes back after it was withdrawn. Neither is configured here, so
// finding one means something changed upstream of this check.
for (const file of emitted) {
  if (file.endsWith('.map')) problems.push(`a source map shipped: ${file}`);
  if (/^(sw|service-worker|workbox-[^/]*)\.js$/.test(file)) problems.push(`a service worker shipped: ${file}`);
}

// Everything `public/` copied into the build, judged against the asset manifest.
// The subject is the public tree itself, not the files that happen to sit near
// a registered asset: an unregistered mesh has never needed to hide among the
// accounted files when it could simply be put in a directory of its own.
const publicDir = 'public';
const publicFiles = existsSync(publicDir) ? walk(publicDir) : [];
if (!publicFiles.length) {
  notes.push(`no ${publicDir}/ directory was found, so nothing was checked against the asset manifest.`);
}
problems.push(
  ...assetDeliveryProblems({
    emitted,
    publicFiles,
    assets: ASSET_MANIFEST,
    requiredAssetIds: requiredAssetIdsFor(RELEASED_SCENES, modelProfileForScene),
  })
);

// The gate again, this time with a filesystem. In the browser a recorded path
// is taken at its word; here a publication decision that cites a record or a
// piece of evidence which does not exist is a build failure.
for (const scene of RELEASED_SCENES) {
  for (const problem of betaPublicationProblems(scene, { fileExists: existsSync })) {
    problems.push(`${scene.id}: ${problem}`);
  }
}

// The number a visitor reads and the number the build emits are the same
// number, or one of the two surfaces is lying about the size of the product.
const emittedPages = emitted.filter((file) => file.startsWith('s/') && file.endsWith('/index.html')).length;
if (PUBLIC_MANIFEST.count !== emittedPages) {
  problems.push(
    `the public manifest publishes ${PUBLIC_MANIFEST.count} model(s) and the build emitted ${emittedPages} page(s)`
  );
}

const sitemapPath = join(distDir, 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  for (const scene of CRAWLABLE_SCENES) {
    if (!xml.includes(`/s/${scene.slug}/`)) problems.push(`${scene.id}: missing from the sitemap`);
  }
  for (const scene of SCENES) {
    if (CRAWLABLE_SCENES.includes(scene)) continue;
    if (xml.includes(`/s/${scene.slug}/`)) problems.push(`${scene.id}: not crawlable, but in the sitemap`);
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
  `Crawlable surface — ${CRAWLABLE_SCENES.length} of ${SCENES.length} scene pages checked in ${distDir}; ` +
    `public manifest ${PUBLIC_MANIFEST.revision} publishes ${PUBLIC_MANIFEST.count}`
);
for (const note of notes) console.log(`  note: ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  '  ok    every crawlable scene has a page; no withheld page, card, chunk or asset reached the build; ' +
    'every publication decision cites records that exist'
);
