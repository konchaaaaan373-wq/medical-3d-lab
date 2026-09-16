import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { customProperties, declaration, fontSizePx, rulesOf, rulesNaming } from '../scripts/lib/css.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Reading a stylesheet as rules instead of searching it as text.
 *
 * Every case here is one of this repository's recorded ways of measuring the
 * wrong rule (`docs/verification-lessons.md`, L-02 / L-03 / L-04), written as
 * the smallest stylesheet that produces it.
 */

test('a comment above a rule does not glue itself to the selector', () => {
  // L-04's root: an exact-name match skips precisely the rules somebody
  // bothered to explain, because the comment is part of the selector chunk.
  const css = '/* why this exists */\n.copy { font-size: 13px; }';
  assert.equal(fontSizePx(css, '.copy'), 13);
  assert.deepEqual([...rulesOf(css)].map((rule) => rule.selectors), ['.copy']);
});

test('the second line of a group selector is not read as its own rule', () => {
  // L-02, exactly: `\n\.copy \{` matches inside `.summary,\n.copy {` and reads
  // that rule's body. Here the group sets 11px and `.copy` alone later sets
  // 14px, so a reader that stops at the group answers 11.
  const css = '.summary,\n.copy { font-size: 11px; }\n.copy { font-size: 14px; }';
  assert.equal(fontSizePx(css, '.copy'), 14, 'the later rule wins, as the cascade does');
  assert.equal(fontSizePx(css, '.summary'), 11);
  assert.equal(rulesNaming(css, '.copy').length, 2, 'both rules name it');
});

test('the last declaration in a body wins, not the first', () => {
  // L-03. A reader taking the first reports a size nothing renders at.
  const css = '.copy { font-size: 10px; font-size: 14px; }';
  assert.equal(fontSizePx(css, '.copy'), 14);
  assert.equal(declaration('font-size: 10px; font-size: 14px;', 'font-size'), '14px');
});

test('a selector naming a longer class is not a match', () => {
  // `.copy` is not named by `.copy-inner`, and is named by `.copy:hover` and
  // `.copy.is-open`. A substring test gets both directions wrong — which is
  // how every entitled control came to be reported as locked (L-08).
  // `.copy-inner` comes *last* on purpose. With substring matching both rules
  // are collected and the later one answers — so writing them the other way
  // round, the assertion passes whether the match is exact or not. It did, and
  // the mutation walked straight through it (L-17's shape: an assertion whose
  // outcome does not depend on the thing it names).
  const css = '.copy:hover { font-size: 15px; }\n.copy-inner { font-size: 9px; }';
  assert.equal(fontSizePx(css, '.copy'), 15, '.copy-inner is a different class');
  assert.equal(fontSizePx(css, '.copy-inner'), 9);
  assert.deepEqual(rulesNaming(css, '.copy').map((rule) => rule.selectors), ['.copy:hover']);
});

test('an at-rule does not swallow the rules nested inside it', () => {
  // `[^}]*` for the body lets `@media (...) {` run to the first `}`, so an
  // override inside a media query is read as part of one enormous declaration
  // list — and the override is exactly the interesting value.
  const css = '.copy { font-size: 16px; }\n@media (max-width: 720px) {\n  .copy { font-size: 12px; }\n}';
  assert.equal(fontSizePx(css, '.copy'), 12, 'the media override is a size the class reaches');
  assert.deepEqual([...rulesOf(css)].map((rule) => rule.selectors), ['.copy', '.copy']);
});

test('a class that sets no size answers null, not zero', () => {
  // Zero would pass a floor check the wrong way round, and a throw would make
  // "this class sets no size" impossible to ask about.
  assert.equal(fontSizePx('.copy { color: red; }', '.copy'), null);
  // A non-px last value is also not a px answer: reporting the earlier 10px
  // would name a size the browser does not use.
  assert.equal(fontSizePx('.copy { font-size: 10px; font-size: 1rem; }', '.copy'), null);
});

test('custom properties are collected from every matching rule', () => {
  const css = 'html[data-route="legal"] { --fg: #111111; }\nhtml[data-route="legal"] { --bg: #ffffff; }';
  const tokens = customProperties(css, (selectors) => selectors.includes('data-route="legal"'));
  assert.deepEqual(tokens, { fg: '#111111', bg: '#ffffff' });
});

test('the reader agrees with the whole product, not just these fixtures', () => {
  // The equivalence check that made the migration safe: the type-floor
  // baseline is 209 declarations across 33 sheets, measured by the old
  // hand-rolled tokenizer. Reading them through this module reproduces it.
  const baseline = JSON.parse(read('tests/type-floor-baseline.json'));
  const counted = Object.values(baseline.below).reduce((total, sheet) => total + Object.keys(sheet).length, 0);
  assert.ok(counted > 100, `the baseline has only ${counted} entries; this test is measuring nothing`);

  // By unique selector per sheet, which is the baseline's own shape — a
  // selector declared twice below the floor is one entry there, keeping the
  // smallest it reaches. Counting raw declarations answers 232 against 209 and
  // would have been a test measuring a different thing than the file it names.
  let below = 0;
  for (const name of readdirSync(new URL('../src/styles/', import.meta.url)).filter((file) => file.endsWith('.css'))) {
    const selectors = new Set();
    for (const rule of rulesOf(read(`src/styles/${name}`))) {
      const size = declaration(rule.body, 'font-size');
      if (size !== null && /^[0-9.]+px$/.test(size) && Number.parseFloat(size) < 12) selectors.add(rule.selectors);
    }
    below += selectors.size;
  }
  assert.equal(below, counted, 'the shared reader and the recorded baseline disagree');
});

test('nobody hand-rolls the rule tokenizer a fourth time', () => {
  // The guard that makes L-04 mechanical rather than a thing to remember.
  // Two copies of this regex already existed before it was extracted; a third
  // would be written the same way, with the same two bugs, and pass review the
  // same way.
  //
  // Comments are stripped before searching, because the paragraph above
  // contains the regex it is looking for, and matching your own explanation of
  // why something is wrong is L-06.
  const offenders = [];
  for (const dir of ['tests', 'scripts']) {
    for (const name of readdirSync(new URL(`../${dir}/`, import.meta.url))) {
      if (!/\.(m?js)$/.test(name)) continue;
      if (`${dir}/${name}` === 'scripts/lib/css.mjs') continue;
      const code = read(`${dir}/${name}`)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      if (/\[\^\{\}\]\+\\\{/.test(code) || /matchAll\(\s*\/\(\[\^\{\}\]/.test(code)) {
        offenders.push(`${dir}/${name}`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'use rulesOf() from scripts/lib/css.mjs instead');
});
