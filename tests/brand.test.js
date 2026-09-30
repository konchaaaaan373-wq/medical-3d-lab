import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRAND, pageTitle } from '../src/data/brand.js';
import { SITE_NAME, SITE_TAGLINE_EN, SITE_TAGLINE_JA, headTags, siteJsonLd } from '../scripts/site-metadata.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

/** Every file under `dir` with one of `extensions`, repository-relative. */
function filesUnder(dir, extensions) {
  const out = [];
  const walk = (at) => {
    for (const entry of readdirSync(at)) {
      const full = join(at, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (extensions.some((ext) => entry.endsWith(ext))) out.push(relative(ROOT, full));
    }
  };
  walk(join(ROOT, dir));
  return out;
}

/**
 * The old name as something a reader would see: inside a string literal or
 * markup text, not in a comment that records history. Comments may say
 * "Medical 3D Lab" — the product was called that, and `docs/` keeps saying so.
 */
const OLD_NAME_AS_TEXT = /['"`>][^'"`<\n]*Medical 3D Lab/;

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/<!--[\s\S]*?-->/g, '');

test('brand: one name, read from one place', () => {
  assert.equal(BRAND.name, 'BYOKI MOTION');
  assert.equal(BRAND.tagline.ja, '病態を、動かして理解する。');
  assert.equal(BRAND.description, 'Interactive models for understanding pathophysiology.');
  assert.equal(BRAND.words.join(' '), BRAND.name, 'the wordmark sets the same two words');
  // The crawler, the link preview and the header cannot disagree about it.
  assert.equal(SITE_NAME, BRAND.name);
  assert.equal(SITE_TAGLINE_JA, BRAND.tagline.ja);
  assert.equal(SITE_TAGLINE_EN, BRAND.description);
  assert.equal(siteJsonLd().name, BRAND.name);
  assert.ok(headTags({ title: pageTitle('x'), description: 'y' }).some((line) => line.includes('og:site_name" content="BYOKI MOTION"')));
  assert.equal(pageTitle('Models'), 'Models — BYOKI MOTION');
});

test('brand: no public surface still shows the old name', () => {
  // What a reader can see: the application, the shell document, and what the
  // build writes for crawlers and link previews. Not `docs/` — history stays.
  const sources = [
    ...filesUnder('src', ['.js', '.css']),
    'index.html',
    'scripts/site-metadata.js',
    'scripts/social-card.js',
  ];
  // One place may say it, and only as the former name: the terms tell an
  // existing account holder that the renamed service is the one they agreed to.
  const FORMER_NAME = /旧名称 Medical 3D Lab|formerly Medical 3D Lab/g;
  const offenders = sources.filter((path) => {
    const text = stripComments(read(path));
    return OLD_NAME_AS_TEXT.test(path === 'src/data/legal.js' ? text.replace(FORMER_NAME, '') : text);
  });
  assert.deepEqual(offenders, [], 'these still show "Medical 3D Lab" to a reader — read BRAND.name instead');
  // The shell document's own title, which a crawler without JavaScript reads.
  assert.match(read('index.html'), /<title>BYOKI MOTION — /);
});

test('brand: the operator is named in the footer and on About, not in the header or the hero', () => {
  const footer = read('src/components/SiteFooter.js');
  assert.match(footer, /BRAND\.operator/);
  const about = read('src/app/About.js');
  assert.match(about, /Neco Inc\./);
  for (const path of ['src/components/ShellHeader.js', 'src/components/SceneSwitcher.js']) {
    assert.doesNotMatch(stripComments(read(path)), /Neco/, `${path} puts the operator in the header`);
  }
  const landing = stripComments(read('src/app/Landing.js'));
  assert.doesNotMatch(landing, /NECO_LINKS/, 'the front door does not introduce the operator');
});

test('brand: no pictorial logo — the mark is two states and a change, not an organ', () => {
  const icon = read('src/components/brandIcon.js');
  // Two points and one stroke; no letters, no cube faces.
  assert.equal((icon.match(/<circle /g) ?? []).length, 2);
  assert.equal((icon.match(/<path /g) ?? []).length, 1);
  assert.doesNotMatch(icon, /<text/);
});

test('brand: no custom property is defined as itself', () => {
  // \`--accent: var(--accent)\` is a cycle: invalid at computed-value time, so
  // the element silently loses the colour and inherits nothing. A bulk swap of
  // a literal for its token wrote exactly that into the model header during
  // the rebrand (L-141). Stylesheets only; the check is cheap and total.
  const offenders = [];
  for (const path of filesUnder('src/styles', ['.css'])) {
    const text = stripComments(read(path));
    for (const match of text.matchAll(/--([a-z0-9-]+)\s*:\s*var\(\s*--([a-z0-9-]+)\s*[,)]/gi)) {
      if (match[1] === match[2]) offenders.push(`${path}: --${match[1]}`);
    }
  }
  assert.deepEqual(offenders, []);
});
