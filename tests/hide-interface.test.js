import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { declaration, rulesOf } from '../scripts/lib/css.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * "Hide UI", and the two ways it has already been wrong.
 *
 * The feature is one class on `#ui` and it carries two promises that pull
 * against each other:
 *
 * 1. **A reader can get back.** The button that hid everything is the only
 *    thing in the frame that says how to undo it. It went with the panels
 *    around it for a whole release, because the rule exempted `.ui-toggle` as
 *    a *child* of `#ui` and the button is three levels down — an exemption
 *    that read as intent and matched nothing (`docs/verification-lessons.md`
 *    L-21).
 * 2. **The frame it leaves is empty.** That is what the feature is named for.
 *    Keeping the button lit to satisfy (1) would put chrome in every capture,
 *    which is the same defect wearing the other coat (L-23).
 *
 * Both promises live in a selector and a class name, and both are invisible to
 * `npm test` unless something reads them. `verify:ui` measures them in a real
 * browser, which is the honest check and a sixty-second one; this is the same
 * contract in milliseconds, so a rename cannot get past a plain `npm test`.
 */

const BASE = read('src/styles/base.css');
const APP = read('src/app/App.js');
const CAPTURE = read('scripts/capture-anatomy-views.mjs');

/** The rule with exactly this selector list, or nothing. */
const ruleFor = (css, selectors) =>
  [...rulesOf(css)].filter((rule) => rule.selectors === selectors).at(-1);

test('the interface is hidden by `visibility`, which a descendant can undo', () => {
  // The heart of L-21. `opacity: 0` on the box around the button cannot be
  // undone from inside it at any depth, so an exemption written against a
  // descendant is dead the moment the hide is written with opacity.
  const rule = ruleFor(BASE, "#ui.is-hidden > *:not(.label-layer)");
  assert.ok(rule, 'nothing hides the interface');
  assert.equal(declaration(rule.body, 'visibility'), 'hidden');
  assert.equal(
    declaration(rule.body, 'opacity'),
    null,
    'an opacity here cannot be undone by the way back inside it',
  );
});

test('the way back survives the hide', () => {
  const rule = ruleFor(BASE, "#ui.is-hidden [data-control='hideUi']");
  assert.ok(rule, 'nothing brings the way back out of the hide');
  assert.equal(declaration(rule.body, 'visibility'), 'visible');
  assert.equal(declaration(rule.body, 'pointer-events'), 'auto');

  // Addressed by the stable name, not by `.ui-toggle` — the language switch
  // wears that class too, and a capture that keeps a second button is not the
  // clean frame this feature is for.
  assert.match(APP, /dataset: \{ control: 'hideUi' \}/, 'App.js no longer names the control');
});

test('and then steps back, so the frame a capture takes is empty', () => {
  // L-23: the fix for L-21 satisfied the bug report and broke the reason the
  // feature exists. `is-quiet` is what holds both promises at once.
  const rule = ruleFor(BASE, "#ui.is-hidden.is-quiet [data-control='hideUi']");
  assert.ok(rule, 'the way back never leaves the frame');
  assert.equal(declaration(rule.body, 'opacity'), '0');

  // Faded, not removed: `visibility` or `display` here would take it out of
  // the hit test and put the reader back where L-21 left them.
  assert.equal(declaration(rule.body, 'visibility'), null);
  assert.equal(declaration(rule.body, 'display'), null);

  const lit = ruleFor(
    BASE,
    "#ui.is-hidden.is-quiet [data-control='hideUi']:hover, #ui.is-hidden.is-quiet [data-control='hideUi']:focus-visible",
  );
  assert.ok(lit, 'hover and keyboard focus do not light it again');
  assert.equal(declaration(lit.body, 'opacity'), '1');

  // And something has to put the class on and take it off again.
  assert.match(APP, /classList\.add\('is-quiet'\)/, 'App.js never lets the way back step back');
  assert.match(APP, /classList\.remove\('is-quiet'\)/, 'App.js never brings the way back');
});

test('a scripted capture takes the last control off the frame too', () => {
  const rule = ruleFor(BASE, "#ui.is-hidden.is-capture [data-control='hideUi']");
  assert.ok(rule, 'nothing clears the way back for a scripted capture');
  assert.equal(declaration(rule.body, 'visibility'), 'hidden');

  // The other half of that contract: a rename on either side and every
  // `shots:anatomy` frame silently gains a button, which the script's own
  // settle test cannot see — it compares consecutive frames, and two identical
  // contaminated frames agree with each other.
  assert.match(CAPTURE, /classList\.toggle\('is-capture'/, 'the capture script never asks for it');
  assert.match(CAPTURE, /classList\.toggle\('is-hidden'/, 'the capture script never hides the interface');
});

test('the capture escape hatch belongs to the scripts, not to the app', () => {
  // `is-capture` empties the frame completely. If the product ever set it, a
  // reader could reach the state this whole file exists to make impossible.
  assert.doesNotMatch(APP, /is-capture/, 'App.js sets the capture-only class');
});
