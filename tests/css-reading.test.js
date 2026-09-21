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

  // Nor by a descendant: `.copy span` styles the span. An earlier draft
  // accepted those, so this sheet answered 16 and a floor check passed while
  // the copy itself stayed at 10px.
  const nested = '.copy { font-size: 10px; }\n.copy span { font-size: 16px; }';
  assert.equal(fontSizePx(nested, '.copy'), 10);
  assert.deepEqual(rulesNaming(nested, '.copy').map((rule) => rule.selectors), ['.copy']);
});

test('an at-rule does not swallow the rules nested inside it', () => {
  // `[^}]*` for the body lets `@media (...) {` run to the first `}`, so an
  // override inside a media query is read as part of one enormous declaration
  // list — and the override is exactly the interesting value.
  const css = '.copy { font-size: 16px; }\n@media (max-width: 720px) {\n  .copy { font-size: 12px; }\n}';
  assert.equal(fontSizePx(css, '.copy'), 12, 'the media override is a size the class reaches');
  assert.deepEqual([...rulesOf(css)].map((rule) => rule.selectors), ['.copy', '.copy']);
});

test('a top-level at-rule does not take the next rule down with it', () => {
  // `@import` ends in a semicolon and has no block, so it folds into the
  // following rule's selector chunk. Dropping chunks that start with `@` threw
  // that rule away: `browser-first-release-polish.css` opens with two imports
  // and lost its first real rule outright.
  const css = "@import './a.css';\n@import './b.css';\n.copy { font-size: 13px; }";
  assert.deepEqual([...rulesOf(css)].map((rule) => rule.selectors), ['.copy']);
  assert.equal(fontSizePx(css, '.copy'), 13);

  // And the real sheet that opens with two imports keeps its first rule. Named
  // rather than counted, because counting it needs the tokenizer this module
  // exists to be the only copy of — and the guard below catches that.
  const sheet = read('src/styles/browser-first-release-polish.css');
  const rules = [...rulesOf(sheet)];
  assert.ok(sheet.startsWith('@import'), 'this sheet is the fixture because it opens with imports');
  assert.ok(
    rules.some((rule) => rule.selectors.startsWith("#ui[data-view='learning']")),
    'the rule the imports were folded into was dropped',
  );
  assert.deepEqual(rules.filter((rule) => rule.selectors.includes('@import')), []);
});

test('a size marked !important is still a size', () => {
  // `!important` is about the cascade, not the value. Carrying it into the
  // value made a `px` unit test reject the declaration, so a below-floor size
  // slipped past the type floor — hidden by the very thing that makes it
  // harder to override.
  assert.equal(declaration('font-size: 10px !important;', 'font-size'), '10px');
  assert.equal(fontSizePx('.copy { font-size: 10px !important; }', '.copy'), 10);
});

test('a property name must start at a declaration boundary', () => {
  // `z-index` otherwise matches inside `--overlay-z-index`, and a custom
  // property declared after a real one answers in its place — which in the
  // departure guard would hide the layer sitting above the veil.
  assert.equal(declaration('z-index: 999; --overlay-z-index: 1;', 'z-index'), '999');
  assert.equal(declaration('--overlay-z-index: 1;', 'z-index'), null);
  assert.equal(declaration('font-size: 12px; --x-font-size: 9px;', 'font-size'), '12px');
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

test('the video frame hides the application by default, not by a list of names', () => {
  // The chrome that leaked into every scene's video: clean mode named the
  // three pieces that existed when it was written, and the global navigation
  // was later moved to sit beside one of them. It became a child of `#ui` that
  // the rule did not name, so a breadcrumb and a sign-in button rode across
  // the top of the frame for as long as it took somebody to look at a rendered
  // one (`docs/verification-lessons.md` L-56).
  //
  // A list of what to hide is maintained by whoever adds chrome, who has no
  // reason to think about a video. This pins the inversion: everything is
  // hidden, and the video's own parts are named back in.
  const css = read('src/styles/reel.css');
  const hidden = [...rulesOf(css)].filter((rule) => declaration(rule.body, 'display') === 'none');
  assert.ok(
    hidden.some((rule) => /^#ui\.is-reel\s*>\s*\*$/.test(rule.selectors.trim())),
    'clean mode hides every direct child of #ui, whatever it is called'
  );

  // And what is named back in is only the video's own furniture. A rule that
  // let a piece of application chrome back would be a rule naming something
  // that is not part of the frame.
  const shown = [...rulesOf(css)]
    .filter((rule) => /#ui\.is-reel\s*>/.test(rule.selectors))
    .filter((rule) => {
      const display = declaration(rule.body, 'display');
      return display !== null && display !== 'none';
    })
    .map((rule) => rule.selectors.trim());
  assert.ok(shown.length, 'the frame and its controls are shown again');
  for (const selector of shown) {
    assert.match(selector, /^#ui\.is-reel\s*>\s*\.reel-[a-z-]+$/, `${selector} is part of the video`);
  }
});
