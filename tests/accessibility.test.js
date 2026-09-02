import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PUBLIC_SCENES } from '../src/catalog/index.js';
import { renderScenePage } from '../scripts/site-metadata.js';
import {
  CONTRAST_MINIMUM,
  CONTRAST_PAIRS,
  SURFACES,
  TOKENS,
  TOUCH_TARGET,
  TRUST_INK,
  composite,
  contrastFailures,
  contrastRatio,
  contrastReport,
  parseHex,
  relativeLuminance,
} from '../src/styles/palette.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const baseCss = read('src/styles/base.css');
const readingCss = read('src/styles/reading-surface.css');
const domSource = read('src/utils/dom.js');

/** Every route that is a document rather than a viewport. */
const READING_ROUTES = ['landing', 'explorer', 'trust', 'legal'];

// --- colour ----------------------------------------------------------------

test('contrast: the maths matches the WCAG reference values', () => {
  assert.equal(Number(contrastRatio('#ffffff', '#000000').toFixed(2)), 21);
  assert.equal(Number(contrastRatio('#000000', '#000000').toFixed(2)), 1);
  assert.equal(Number(relativeLuminance('#ffffff').toFixed(4)), 1);
  assert.equal(relativeLuminance('#000000'), 0);
  // Order does not change a ratio.
  assert.equal(contrastRatio('#38e1ef', '#04060c'), contrastRatio('#04060c', '#38e1ef'));
});

test('contrast: a colour that is not a colour is rejected rather than measured', () => {
  assert.throws(() => parseHex('cornflower'));
  assert.throws(() => parseHex('#12345'));
  assert.deepEqual(parseHex('#fff'), { r: 255, g: 255, b: 255 });
});

test('contrast: a translucent panel is measured as composited, not as declared', () => {
  // The declared panel colour is darker than what a reader actually sees.
  assert.equal(composite('#0a101c', 0.62, '#04060c'), SURFACES.panel);
  assert.notEqual(SURFACES.panel, '#0a101c');
  assert.equal(composite('#ffffff', 1, '#000000'), '#ffffff');
  assert.equal(composite('#ffffff', 0, '#000000'), '#000000');
});

test('contrast: every declared pairing meets WCAG AA', () => {
  const failures = contrastFailures();
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('contrast: the pairings that carry small text are held to 4.5:1', () => {
  const body = CONTRAST_PAIRS.filter((pair) => pair.size === 'body');
  assert.ok(body.length >= 8, 'the declared set should cover the product, not a sample');
  for (const pair of body) {
    assert.ok(contrastRatio(pair.fg, pair.bg) >= CONTRAST_MINIMUM.body, pair.name);
  }
});

test('contrast: the faintest ink is the one closest to the line, and still over it', () => {
  const report = contrastReport();
  const faint = report.filter((row) => row.name.startsWith('faint'));
  assert.ok(faint.length > 0);
  for (const row of faint) {
    assert.ok(row.ratio >= 4.5, `${row.name} is ${row.ratio}:1`);
    assert.ok(row.ratio < 6, 'if this rises, the palette changed and the declaration did not');
  }
});

test('contrast: the light Trust surface is declared, not only the dark shell', () => {
  // It is a different palette with the same obligation, and it had none of
  // these pairings declared until the review-drift notice was added to it.
  const trust = contrastReport().filter((row) => row.name.startsWith('Trust'));
  assert.ok(trust.length >= 5, 'the Trust surface should be covered, not sampled');
  for (const row of trust) assert.ok(row.ratio >= row.needs, `${row.name} is ${row.ratio}:1`);
});

test('contrast: the Trust ink declared here is the ink its stylesheets use', () => {
  // Two files paint on this surface: the page itself, and the product chrome
  // that gets a light variant on it.
  const css = read('src/styles/trust.css') + read('src/styles/telemetry.css');
  for (const value of Object.values(TRUST_INK)) {
    assert.ok(css.toLowerCase().includes(value), `${value} is declared but not used on the light surface`);
  }
  assert.ok(css.includes(SURFACES.trust), 'the declared Trust background is not the one it paints');
});

test('contrast: dark overlay chrome gets a light variant on the light routes', () => {
  // Dropped onto a near-white page unchanged, the consent banner and the
  // feedback trigger read as something the page did not mean to contain.
  const css = read('src/styles/telemetry.css');
  for (const route of ['trust', 'legal']) {
    assert.match(css, new RegExp(`html\\[data-route='${route}'\\] \\.consent-banner`), route);
    assert.match(css, new RegExp(`html\\[data-route='${route}'\\] \\.feedback-trigger`), route);
  }
  // And that variant is measured, not eyeballed.
  const declared = contrastReport().filter((row) => row.name.includes('light surface'));
  assert.ok(declared.length >= 2);
  for (const row of declared) assert.ok(row.ratio >= row.needs, `${row.name} is ${row.ratio}:1`);
});

test('overlay: a dialog hidden by attribute is actually hidden', () => {
  // `display: grid` outranks the user-agent's `[hidden] { display: none }`, so
  // without an explicit rule the feedback dialog is open on every page load.
  // The oldest trap in `hidden`, and invisible to every test that does not render.
  const css = read('src/styles/telemetry.css');
  assert.match(css, /\.feedback-overlay\[hidden\]\s*\{[^}]*display:\s*none/);
});

test('contrast: base.css and the declared palette cannot drift apart', () => {
  for (const [name, value] of Object.entries(TOKENS)) {
    assert.match(
      baseCss,
      new RegExp(`--${name}:\\s*${value};`, 'i'),
      `--${name} in base.css does not match the declared ${value}`
    );
  }
});

// --- keyboard and focus ----------------------------------------------------

test('focus: there is one visible focus style for the whole product', () => {
  assert.match(readingCss, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/);
  assert.match(readingCss, /outline-offset/);
});

test('focus: the light Trust surface gets a focus ring it can actually show', () => {
  // The luminous accent disappears on a near-white background.
  assert.match(readingCss, /html\[data-route='trust'\] :focus-visible[^}]*outline-color/);
});

test('focus: every reading surface offers a way past its navigation', () => {
  assert.match(domSource, /export const skipLink/);
  for (const path of ['src/app/Landing.js', 'src/app/Trust.js', 'src/app/Legal.js', 'src/app/Explorer.js']) {
    const source = read(path);
    assert.match(source, /skipLink\(/, `${path} has no skip link`);
    assert.match(source, /data-skip-target/, `${path} marks no skip target`);
  }
});

test('focus: the skip link moves focus itself and never changes the hash', () => {
  // `#content` is not `#/content`. This product routes on the hash, so an
  // unhandled skip link resolved to a *scene* and reloaded the page into the
  // default 3D model — an accessibility affordance throwing the reader out of
  // the page they were reading.
  assert.match(domSource, /event\.preventDefault\(\)/);
  assert.match(domSource, /target\.focus\(\{ preventScroll: true \}\)/);
});

test('focus: a skip target never steals an anchor another link depends on', () => {
  // The Explorer's sections already carry `system-<id>`, which their own jump
  // pills scroll to. Overwriting the first one made the first system in the
  // catalogue the one system you could not jump to.
  const explorer = read('src/app/Explorer.js');
  assert.ok(!/sections\[0\]\.id = /.test(explorer), 'the skip target must not rename a section');
  assert.match(explorer, /skipTargetId = sections\[0\]\?\.id/);
});

test('focus: the skip target does not land on the navigation it was meant to skip', () => {
  // The id belongs to the first content element, never to the landmark that
  // still contains the header.
  for (const [path, landmark] of [
    ['src/app/Landing.js', "el('main', { class: 'landing' }"],
    ['src/app/Trust.js', "el('main', { class: 'trust-page' }"],
    ['src/app/Legal.js', "el('main', { class: 'legal-page' }"],
  ]) {
    assert.ok(read(path).includes(landmark), `${path}: the skip target moved back onto the landmark`);
  }
});

test('focus: a skip target does not draw a focus ring around half the page', () => {
  // Keyed on the marker rather than on the id, so a surface whose skip target
  // has to keep its own id still gets the rule.
  assert.match(readingCss, /\[data-skip-target\]:focus[\s\S]*?outline: none/);
});

// --- structure -------------------------------------------------------------

test('structure: every reading surface is a landmark, not a div', () => {
  for (const [path, tag] of [
    ['src/app/Landing.js', "el('main'"],
    ['src/app/Trust.js', "el('main'"],
    ['src/app/Legal.js', "el('main'"],
    ['src/app/Explorer.js', "el('main'"],
    ['src/app/SceneFailureFallback.js', "el('main'"],
  ]) {
    assert.ok(read(path).includes(tag), `${path} has no main landmark`);
  }
});

test('structure: bilingual text is marked with the language it is in', () => {
  // Announced with the wrong phonemes, a Japanese string inside an English
  // document is unintelligible — and the reverse is equally true.
  assert.match(domSource, /classes\.includes\('lang-ja'\)/);
  assert.match(domSource, /setAttribute\('lang', 'ja'\)/);
  assert.match(domSource, /setAttribute\('lang', 'en'\)/);
});

test('structure: the language marking is derived, not repeated at call sites', () => {
  // If it were repeated it would be missing somewhere, and there are several
  // hundred of these spans.
  const callSites = (read('src/app/Trust.js').match(/class: 'lang-(en|ja)'/g) ?? []).length;
  assert.ok(callSites > 10);
  assert.ok(!read('src/app/Trust.js').includes("lang: 'ja'"), 'lang is set by el(), not by hand');
});

// --- zoom and reflow -------------------------------------------------------

test('reflow: the viewport pin the 3D view needs is released on every document route', () => {
  // The 3D view pins html/body and turns scrolling off. A reading surface that
  // does not undo it loses everything below the fold — which is what happened
  // to the Trust page before this rule existed.
  for (const route of READING_ROUTES) {
    assert.match(
      readingCss,
      new RegExp(`html\\[data-route='${route}'\\] body`),
      `the "${route}" route never releases the viewport pin`
    );
    assert.match(readingCss, new RegExp(`html\\[data-route='${route}'\\] #ui`), `"${route}" #ui stays fixed`);
  }
  assert.match(readingCss, /overflow: visible/);
});

test('reflow: no reading route re-pins the viewport in its own stylesheet', () => {
  for (const path of ['src/styles/landing.css', 'src/styles/explorer.css', 'src/styles/trust.css', 'src/styles/legal.css']) {
    const css = read(path);
    assert.ok(!/overflow:\s*hidden/.test(css), `${path} re-hides overflow on a reading surface`);
  }
});

test('motion: chrome on a reading surface stops when the reader asks it to', () => {
  assert.match(readingCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(readingCss, /animation-duration: 0\.01ms !important/);
});

// --- targets ---------------------------------------------------------------

test('targets: the declared minimum sizes are the ones the CSS applies', () => {
  assert.equal(TOUCH_TARGET.primary, 44);
  assert.ok(TOUCH_TARGET.dense >= TOUCH_TARGET.absoluteMinimum);
  assert.match(readingCss, new RegExp(`min-height: ${TOUCH_TARGET.primary}px`));
});

// --- the generated pages ---------------------------------------------------

test('generated pages: declare a language, a viewport and one heading', () => {
  for (const scene of PUBLIC_SCENES) {
    const html = renderScenePage(scene, { baseUrl: 'https://x.example' });
    assert.match(html, /<html lang="ja">/, `${scene.id}: no document language`);
    assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/, scene.id);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1, `${scene.id}: not exactly one h1`);
  }
});

test('zoom: the application shell does not take pinch zoom away', () => {
  // The tag itself, not the comment above it explaining what used to be there.
  const viewport = read('index.html').match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? '';
  assert.ok(viewport, 'no viewport meta tag');
  assert.ok(!viewport.includes('user-scalable=no'), 'a reader must be able to zoom the product');
  assert.ok(!viewport.includes('maximum-scale'), 'a reader must be able to zoom the product');
  assert.match(viewport, /width=device-width, initial-scale=1\.0/);
  // The canvas suppresses browser gestures where they actually conflict.
  assert.match(baseCss, /#stage canvas \{[^}]*touch-action: none/);
});

test('generated pages: do not disable pinch zoom', () => {
  const html = renderScenePage(PUBLIC_SCENES[0], {});
  assert.ok(!html.includes('user-scalable=no'), 'a reader must be able to zoom');
  assert.ok(!html.includes('maximum-scale'), 'a reader must be able to zoom');
});

test('generated pages: mark the English text inside a Japanese document', () => {
  const html = renderScenePage(PUBLIC_SCENES[0], {});
  assert.match(html, /lang="en"/);
});

test('generated pages: state their colours explicitly rather than inheriting', () => {
  // They are standalone documents: without an explicit scheme a reader with a
  // light-mode browser gets dark text on a dark background.
  const html = renderScenePage(PUBLIC_SCENES[0], {});
  assert.match(html, /color-scheme: dark/);
  assert.match(html, /background: #04060c/);
  assert.match(html, /color: #eaf2ff/);
});

test('generated pages: their body text clears AA against their own background', () => {
  assert.ok(contrastRatio('#eaf2ff', '#04060c') >= CONTRAST_MINIMUM.body);
  assert.ok(contrastRatio('#c9d6ea', '#04060c') >= CONTRAST_MINIMUM.body);
  assert.ok(contrastRatio('#a7b6ce', '#04060c') >= CONTRAST_MINIMUM.body);
});
