import test from 'node:test';
import assert from 'node:assert/strict';

import { rulesOf } from '../scripts/lib/css.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The sentence that says what a model may be used for does not have a width.
 *
 * `ControlPanel.js` has always carried this promise in a comment — "the notice
 * must always be visible, so a shorter wording is swapped in on narrow screens
 * rather than the notice being dropped" — and `.disclaimer-short` exists to
 * keep it, swapped in at 860px. One rule broke it anyway: `.disclaimer` was
 * listed alongside `.stage-summary` in a `max-width: 720px` block, so below
 * that width the one scene this beta publishes showed no "educational, not
 * clinical" statement at all. Measured at 390px before the fix: no 教育用, no
 * 臨床使用不可, nothing.
 *
 * A long description belongs in a Detail tab on a phone. A caveat is not a
 * description — it is the limit on what the thing on screen is allowed to be
 * used for, and a narrow screen does not narrow that.
 */

const STYLES = fileURLToPath(new URL('../src/styles/', import.meta.url));
const sheets = readdirSync(STYLES).filter((name) => name.endsWith('.css'));

/**
 * Every `@media` block whose condition mentions a width, as `[condition, body]`.
 *
 * Brace-matched rather than regex-matched: a media block contains rules, which
 * contain braces, and `[^}]*` would end the block at the first rule inside it.
 */
function widthMediaBlocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  const opener = /@media([^{]*)\{/g;
  let match;
  while ((match = opener.exec(clean)) !== null) {
    if (!/width/.test(match[1])) continue;
    let depth = 1;
    let i = opener.lastIndex;
    while (i < clean.length && depth > 0) {
      if (clean[i] === '{') depth += 1;
      else if (clean[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push([match[1].trim(), clean.slice(opener.lastIndex, i - 1)]);
  }
  return blocks;
}

/** `[selectorText, body]` for each rule in a chunk of CSS. */
const rulesIn = (css) => [...rulesOf(css)].map((rule) => [rule.selectors, rule.body]);

/** Whether a selector list names the notice itself, not one of its two wordings. */
const namesTheNotice = (selectors) =>
  selectors
    .split(',')
    .some((one) => /\.disclaimer(?![\w-])/.test(one));

test('no width ever hides the clinical-use notice', () => {
  const offenders = [];
  for (const name of sheets) {
    const css = readFileSync(`${STYLES}${name}`, 'utf8');
    for (const [condition, body] of widthMediaBlocks(css)) {
      for (const [selectors, declarations] of rulesIn(body)) {
        if (!namesTheNotice(selectors)) continue;
        if (!/display:\s*none/.test(declarations)) continue;
        offenders.push(`${name} — @media ${condition} { ${selectors} { display: none } }`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'a caveat is not a description; swap `.disclaimer-short` in instead of dropping the notice:\n  '
      + offenders.join('\n  ')
  );
});

test('hiding the long wording always shows the short one in the same breath', () => {
  // The pair, not each half. Asserting "somewhere in this sheet a rule shows
  // `.disclaimer-short`" passed against a rule in a completely different
  // context, so a mutation that stopped the swap at 860px went unnoticed: what
  // matters is that *this* block, the one hiding the long wording, is also the
  // one showing the short.
  const shows = (declarations) => /display:\s*(?:block|flex|inline|inline-flex|grid)/.test(declarations);
  const checked = [];

  for (const name of sheets) {
    const css = readFileSync(`${STYLES}${name}`, 'utf8');
    for (const [condition, body] of widthMediaBlocks(css)) {
      const rules = rulesIn(body);
      const hidesLong = rules.some(([selectors, declarations]) =>
        /\.disclaimer-full(?![\w-])/.test(selectors) && /display:\s*none/.test(declarations));
      if (!hidesLong) continue;
      const showsShort = rules.some(([selectors, declarations]) =>
        /\.disclaimer-short(?![\w-])/.test(selectors) && shows(declarations));
      assert.ok(showsShort, `${name} — @media ${condition} hides the long notice and never shows the short one`);
      checked.push(`${name} @media ${condition}`);
    }
  }

  // And the pairing has to actually occur somewhere, or this test is vacuous —
  // which is how its first version passed while the swap was broken.
  assert.ok(checked.length > 0, 'no width block swaps the notice at all; the narrow wording is unreachable');
});

test('the component still says the notice is unconditional', () => {
  // The comment is the thing the CSS broke. If somebody decides the notice may
  // be dropped after all, this is where that decision has to be written down
  // first — and then this test and the one above are the ones to change.
  const panel = readFileSync(new URL('../src/components/ControlPanel.js', import.meta.url), 'utf8');
  assert.match(panel, /notice must always be visible/);
  assert.match(panel, /class: 'disclaimer-short lang-ja'/);
});
