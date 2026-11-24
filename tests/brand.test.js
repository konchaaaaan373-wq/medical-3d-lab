import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRAND, pageTitle } from '../src/data/brand.js';
import {
  BRAND_FAVICON_SVG,
  BRAND_ICON_SVG,
  BRAND_PINK,
  BRAND_PINK_DEEP,
  BRAND_PINK_PALE,
  brandTileSvg,
} from '../src/components/brandIcon.js';
import { createWordmark } from '../src/components/Wordmark.js';
import { CONTRAST_MINIMUM, contrastRatio } from '../src/styles/palette.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';
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
 * A former name as something a reader would see: inside a string literal or
 * markup text, not in a comment that records history. Comments may say
 * "Medical 3D Lab" or "BYOKI MOTION" — the product was called both, and
 * `docs/` keeps saying so.
 *
 * Two of them now. Medical 3D Lab → BYOKI MOTION on 2026-09-30, and
 * BYOKI MOTION → 3Dモデルラボ on 2026-11-24 (ADR `adr-2026-11-24-brain-launch.md`).
 */
const FORMER_NAMES = ['Medical 3D Lab', 'BYOKI MOTION'];
const asReaderText = (name) => new RegExp(`['"\`>][^'"\`<\\n]*${name}`);

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/<!--[\s\S]*?-->/g, '');

test('brand: one name, read from one place', () => {
  assert.equal(BRAND.name, '3Dモデルラボ');
  assert.equal(BRAND.nameEn, '3D Model Lab');
  assert.equal(BRAND.tagline.ja, '脳を、立体的に理解する。');
  assert.equal(BRAND.tagline.en, 'Understand the brain in three dimensions.');
  assert.equal(BRAND.description, 'Brain anatomy, neural circuits and higher brain function, learned by linking 3D models with MRI.');
  assert.equal(BRAND.descriptionJa, '脳の解剖、神経回路、高次脳機能を、3DモデルとMRIでつなげて学ぶ。');
  // The wordmark sets the same name in two parts, and they join with **no
  // space**: 「3Dモデルラボ」 is one word. The name before it was two words
  // joined by one, and a wordmark that still put a gap between its parts — or
  // a surface that rebuilt the name as `words.join(' ')` — would print
  // 「3D モデルラボ」, which is not the product's name.
  assert.deepEqual([...BRAND.words], ['3D', 'モデルラボ']);
  assert.equal(BRAND.words.join(''), BRAND.name, 'the wordmark sets the same name, with no space in it');
  assert.doesNotMatch(BRAND.name, /\s/);
  // The crawler, the link preview and the header cannot disagree about it.
  assert.equal(SITE_NAME, BRAND.name);
  assert.equal(SITE_TAGLINE_JA, BRAND.tagline.ja);
  assert.equal(SITE_TAGLINE_EN, BRAND.description);
  assert.equal(siteJsonLd().name, BRAND.name);
  assert.ok(headTags({ title: pageTitle('x'), description: 'y' }).some((line) => line.includes(`og:site_name" content="${BRAND.name}"`)));
  assert.equal(pageTitle('Models'), `Models — ${BRAND.name}`);
  assert.equal(pageTitle(), `${BRAND.name} — ${BRAND.tagline.ja}`);
});

test('brand: the wordmark is the name once for a screen reader, and its two parts with no gap for the eye', () => {
  const restore = installFakeDocument();
  try {
    for (const withMark of [false, true]) {
      const mark = createWordmark({ size: 'sm', withMark });
      const spoken = findByClass(mark, 'visually-hidden').map((node) => node.textContent);
      assert.deepEqual(spoken, [BRAND.name], 'said once, whole');
      const [type] = findByClass(mark, 'wordmark-type');
      assert.equal(type.getAttribute('aria-hidden'), 'true', 'the set type is not read a second time');
      assert.equal(type.children.map((part) => part.textContent).join(''), BRAND.name);
      assert.equal(type.children.length, BRAND.words.length);
      // The mark, when asked for, is one drawing and is decoration.
      const icons = findByClass(mark, 'brand-icon');
      assert.equal(icons.length, withMark ? 1 : 0);
      for (const icon of icons) assert.equal(icon.getAttribute('aria-hidden'), 'true');
    }
  } finally {
    restore();
  }
  // And the stylesheets do not put the space back between the two parts. The
  // rule that set one is still in `brand.css` (BYOKI and MOTION were two
  // words, 0.34em apart) and `lab.css` closes it — so what a reader sees
  // depends on which is loaded last. Resolved here the way the browser does:
  // the stylesheets in `main.js`'s import order, the last declaration wins.
  const order = [...read('src/main.js').matchAll(/^import '\.\/styles\/([a-z0-9-]+\.css)';/gm)].map((match) => match[1]);
  assert.ok(order.includes('brand.css') && order.includes('lab.css'), 'main.js imports both stylesheets');
  const gaps = [];
  for (const file of order) {
    const css = stripComments(read(`src/styles/${file}`));
    for (const [, body] of css.matchAll(/(?:^|\})\s*\.wordmark-type\s*\{([^}]*)\}/g)) {
      const gap = body.match(/(?:^|[;\s])(?:column-)?gap:\s*([^;]+);/)?.[1]?.trim();
      if (gap != null) gaps.push({ file, gap });
    }
  }
  assert.ok(gaps.length > 0, 'no stylesheet states the gap between the two parts, so it is whatever a browser defaults to');
  assert.match(
    gaps.at(-1).gap,
    /^0(?:px|em)?$/,
    `${gaps.at(-1).file} is the last to set the gap between 「${BRAND.words[0]}」 and 「${BRAND.words[1]}」, and sets ${gaps.at(-1).gap}: the name prints as two words`
  );
});

test('brand: no public surface still shows a former name', () => {
  // What a reader can see: the application, the shell document, the web
  // manifest, and what the build writes for crawlers and link previews. Not
  // `docs/` — history stays.
  const sources = [
    ...filesUnder('src', ['.js', '.css']),
    'index.html',
    'public/site.webmanifest',
    'scripts/site-metadata.js',
    'scripts/social-card.js',
    'scripts/render-brand-icons.mjs',
  ];
  // One file may say them, in two sentences: the terms name the service as a
  // legal party, and changing what they call it needs notice to the people who
  // agreed to them (F-252). So `legal.js` still opens its first article with
  // the name the account holders agreed under — and with the name before
  // that, as the former name. Those two sentences are matched whole; a former
  // name anywhere else in the file is as wrong as anywhere else in the product.
  const TERMS_NAME_THE_PARTY = [
    'BYOKI MOTION（以下「本サービス」。旧名称 Medical 3D Lab）',
    'BYOKI MOTION (formerly Medical 3D Lab)',
  ];
  const legal = read('src/data/legal.js');
  for (const sentence of TERMS_NAME_THE_PARTY) {
    assert.equal(legal.split(sentence).length - 1, 1, `the terms no longer say "${sentence}" exactly once — if they were amended (with notice), amend this list with them`);
  }
  const readerText = (path) => {
    let text = stripComments(read(path));
    if (path === 'src/data/legal.js') for (const sentence of TERMS_NAME_THE_PARTY) text = text.replace(sentence, '');
    return text;
  };
  for (const name of FORMER_NAMES) {
    const offenders = sources.filter((path) => asReaderText(name).test(readerText(path)));
    assert.deepEqual(offenders, [], `these still show "${name}" to a reader — read BRAND.name instead`);
  }
  // The shell document's own title and description, which a crawler without
  // JavaScript reads. Typed into the HTML, so compared with the one place.
  const html = read('index.html');
  assert.ok(html.includes(`<title>${pageTitle()}</title>`), 'index.html\'s <title> is not the product\'s');
  assert.ok(html.includes(BRAND.descriptionJa) || html.includes(BRAND.description), 'index.html does not carry the product description');
  // And the installable name.
  const manifest = JSON.parse(read('public/site.webmanifest'));
  assert.equal(manifest.name, BRAND.name);
  assert.equal(manifest.short_name, BRAND.name);
  assert.equal(manifest.description, BRAND.descriptionJa);
});

test('brand: the application never writes the new name out either — it reads BRAND.name', () => {
  // The rule in CLAUDE.md is "one place". The old-name test above could not
  // see a copy of the *new* name, and the landing page's concept paragraph
  // carried two ("In BYOKI MOTION you move…", 「BYOKI MOTIONでは…」): a rename
  // would have left them behind with every test green.
  const NEW_NAME_AS_TEXT = new RegExp(`['"\`>][^'"\`<\\n]*${BRAND.name}`);
  const sources = filesUnder('src', ['.js']).filter((path) =>
    // The source itself, and the terms — which name the service as a legal
    // party, and change only with a notice to account holders (F-252).
    path !== 'src/data/brand.js' && path !== 'src/data/legal.js'
  );
  const offenders = sources.filter((path) => NEW_NAME_AS_TEXT.test(stripComments(read(path))));
  assert.deepEqual(offenders, [], 'these write the product name out — read BRAND.name instead');
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

/** The absolute x coordinates a path's `d` visits (M/C/L/Z only, absolute). */
function xsOf(d) {
  assert.doesNotMatch(d, /[a-z]/, `a relative or unsupported path command in "${d}" — this reader takes absolute M, L, C, Z`);
  assert.doesNotMatch(d, /[HVSQTA]/, `"${d}" uses a command whose numbers are not x,y pairs`);
  const numbers = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  assert.equal(numbers.length % 2, 0, `"${d}" does not parse into x,y pairs`);
  return numbers.filter((_, index) => index % 2 === 0);
}

test('brand: the mark is the brain — two mirrored hemispheres, no text, no fill, no ids', () => {
  // Until 2026-11-24 this test said the opposite: "no pictorial logo — the mark
  // is two states and a change, not an organ". That was right for a product
  // about every organ. The launch is the brain and the mark is the brain, on
  // purpose (ADR `adr-2026-11-24-brain-launch.md`). What is held now is what
  // makes it *this* drawing and a mark at all, for each of its three forms.
  const forms = {
    header: BRAND_ICON_SVG,
    'tab icon': BRAND_FAVICON_SVG,
    tile: brandTileSvg({ size: 512 }),
    'small tile': brandTileSvg({ size: 180, small: true }),
  };
  for (const [name, svg] of Object.entries(forms)) {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+"/, `${name}: not a standalone SVG`);
    assert.ok(svg.endsWith('</svg>'), name);

    // Two hemispheres: the same half twice, the second reflected about the
    // midline of the 64-unit drawing. Not two drawings that could drift apart.
    const halves = [...svg.matchAll(/<g( transform="matrix\(-1 0 0 1 64 0\)")?>((?:<path d="[^"]*"\/>)+)<\/g>/g)];
    assert.equal(halves.length, 2, `${name}: the mark is not two hemispheres`);
    assert.equal(halves[0][1], undefined, `${name}: the first hemisphere is drawn as it is`);
    assert.ok(halves[1][1], `${name}: the second is the first, mirrored`);
    assert.equal(halves[1][2], halves[0][2], `${name}: the two hemispheres are not the same drawing`);

    // Each stays on its own side of the longitudinal fissure — a half that
    // crossed x = 32 would overlap its mirror image and read as one blob.
    const paths = [...halves[0][2].matchAll(/<path d="([^"]*)"\/>/g)].map((match) => match[1]);
    assert.ok(paths.length >= 3, `${name}: an outline with no sulci is a bean, not a brain`);
    assert.ok(paths[0].endsWith('Z'), `${name}: the hemisphere's outline is not closed`);
    for (const d of paths) {
      const xs = xsOf(d);
      assert.ok(Math.max(...xs) < 32, `${name}: a hemisphere reaches x=${Math.max(...xs)}, across the midline`);
      assert.ok(Math.min(...xs) >= 2, `${name}: a stroke at x=${Math.min(...xs)} is clipped by the edge`);
    }
    // Every path in the SVG belongs to a hemisphere: nothing else is drawn.
    assert.equal((svg.match(/<path /g) ?? []).length, paths.length * 2, `${name}: a path outside the two hemispheres`);

    // No letters: the name is set as type beside it, never inside the picture.
    assert.doesNotMatch(svg, /<text|<tspan|font-/, `${name}: the mark carries text`);
    // Line-drawn: the hemispheres are stroked and never filled.
    assert.match(svg, /fill="none"/, `${name}: the hemispheres are not line-drawn`);
    assert.match(svg, /stroke-linecap="round"/, name);
    // No ids at all. An inline SVG's ids are document-global, and this one is
    // inlined once per header and again in every wordmark that asks for it —
    // two elements with one id, and `url(#…)` resolving to whichever came first.
    assert.doesNotMatch(svg, /\sid=|<use|url\(#|<defs/, `${name}: an id (or a reference to one) in a drawing that is inlined many times`);
    // No raster, no script, nothing fetched.
    assert.doesNotMatch(svg, /<image|<script|href=/, name);
  }

  // The header mark takes its colour from where it is put — pink on the page,
  // the same pink in the model header — so it names no colour of its own.
  assert.match(BRAND_ICON_SVG, /stroke="currentColor"/);
  assert.doesNotMatch(BRAND_ICON_SVG, /#[0-9a-f]{3,8}\b|rgb\(|<style|<rect|<circle/i, 'the header mark carries a colour or a shape of its own');
  assert.equal((BRAND_ICON_SVG.match(/fill=/g) ?? []).length, 1, 'one fill attribute, and it is "none"');

  // A tab icon has no page to inherit from, so it states its pink — the deeper
  // one on a light tab strip, the brand pink on a dark one — and nothing else.
  assert.doesNotMatch(BRAND_FAVICON_SVG, /currentColor/, 'a favicon has no `color` to inherit; currentColor would be black');
  assert.ok(BRAND_FAVICON_SVG.includes(`g{stroke:${BRAND_PINK_DEEP}}`));
  assert.ok(BRAND_FAVICON_SVG.includes(`@media (prefers-color-scheme:dark){g{stroke:${BRAND_PINK}}}`));
  assert.doesNotMatch(BRAND_FAVICON_SVG, /<rect|<circle/, 'the tab icon is the mark on a transparent ground');
  // Fewer sulci and a heavier line than the header's: it is read at 16 px.
  const count = (svg) => (svg.match(/<path /g) ?? []).length;
  assert.ok(count(BRAND_FAVICON_SVG) < count(BRAND_ICON_SVG), 'the small form is not simpler than the full one');
  assert.match(BRAND_FAVICON_SVG, /stroke-width="4"/);
  assert.match(BRAND_ICON_SVG, /stroke-width="3"/);

  // The tile is the one form with a ground: the pale pink, flat, edge to edge,
  // and the deeper pink on it — measured, because a home-screen icon is the
  // mark with no page around it.
  const tile = forms.tile;
  assert.ok(tile.includes(`<rect width="512" height="512" fill="${BRAND_PINK_PALE}"/>`));
  assert.ok(tile.includes(`stroke="${BRAND_PINK_DEEP}"`));
  assert.doesNotMatch(tile, /gradient|filter|opacity/i, 'the tile is flat');
  assert.ok(
    contrastRatio(BRAND_PINK_DEEP, BRAND_PINK_PALE) >= CONTRAST_MINIMUM.ui,
    `the mark is ${contrastRatio(BRAND_PINK_DEEP, BRAND_PINK_PALE).toFixed(2)}:1 on its tile; a graphic needs ${CONTRAST_MINIMUM.ui}:1`
  );
  // Inside the maskable safe zone (the central 80 %): the mark is scaled to
  // 66 % and centred, so a launcher that crops to a circle does not cut it.
  const [, offset, scale] = tile.match(/translate\(([\d.]+) [\d.]+\) scale\(([\d.]+)\)/).map(Number);
  assert.ok(offset >= 512 * 0.1 && offset + 64 * scale <= 512 * 0.9, 'the mark leaves the maskable safe zone');
});

test('brand: no custom property is defined as itself', () => {
  // \`--accent: var(--accent)\` is a cycle: invalid at computed-value time, so
  // the element silently loses the colour and inherits nothing. A bulk swap of
  // a literal for its token wrote exactly that into the model header during
  // the rebrand (L-153). Stylesheets only; the check is cheap and total.
  const offenders = [];
  for (const path of filesUnder('src/styles', ['.css'])) {
    const text = stripComments(read(path));
    for (const match of text.matchAll(/--([a-z0-9-]+)\s*:\s*var\(\s*--([a-z0-9-]+)\s*[,)]/gi)) {
      if (match[1] === match[2]) offenders.push(`${path}: --${match[1]}`);
    }
  }
  assert.deepEqual(offenders, []);
});
