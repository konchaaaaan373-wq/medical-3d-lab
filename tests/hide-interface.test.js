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
 *    L-31).
 * 2. **The frame a capture takes is empty.** That is what the feature is for.
 *    The first answer to this was a fade: the way back dimmed after a couple
 *    of seconds of stillness (L-33). It satisfied both promises on paper and
 *    failed the reader in practice — a control that leaves on its own reads as
 *    one that is gone, and nothing on screen says a mouse move brings it back.
 *    A person reported the interface as unrecoverable *after* that fix. So the
 *    empty frame belongs to `is-capture`, which only a program sets, and the
 *    reader keeps a control that is simply always there.
 *
 * Both promises live in a selector and a class name, and both are invisible to
 * `npm test` unless something reads them. `verify:ui` measures them in a real
 * browser, which is the honest check and a sixty-second one; this is the same
 * contract in milliseconds, so a rename cannot get past a plain `npm test`.
 */

const BASE = read('src/styles/base.css');
const APP = read('src/app/App.js');
/**
 * `App.js` with its comments taken off.
 *
 * L-06: a `doesNotMatch` that matched the comment explaining why the thing it
 * forbids is forbidden. `App.js` explains in prose that `is-capture` belongs
 * to the capture script — the assertion below is about what the code does, so
 * it reads the code.
 */
const APP_CODE = APP.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((line) => line.replace(/\/\/.*$/, ''))
  .join('\n');
const CAPTURE = read('scripts/capture-anatomy-views.mjs');

/** The rule with exactly this selector list, or nothing. */
const ruleFor = (css, selectors) =>
  [...rulesOf(css)].filter((rule) => rule.selectors === selectors).at(-1);

test('the interface is hidden by `visibility`, which a descendant can undo', () => {
  // The heart of L-31. `opacity: 0` on the box around the button cannot be
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

test('the way back does not fade, and nothing schedules it away', () => {
  // The other direction of L-33, learned the hard way a second time. A rule
  // that takes this to `opacity: 0` on its own — or a timer in `App.js` that
  // adds a class doing so — puts the reader back in front of a frame with no
  // visible way out.
  for (const rule of rulesOf(BASE)) {
    if (!rule.selectors.includes("[data-control='hideUi']")) continue;
    if (rule.selectors.includes('is-capture')) continue;
    const opacity = declaration(rule.body, 'opacity');
    assert.ok(
      opacity === null || Number(opacity) > 0.5,
      `${rule.selectors} takes the way back to opacity ${opacity}`,
    );
  }
  assert.doesNotMatch(APP_CODE, /is-quiet/, 'App.js schedules the way back off the screen again');
  assert.doesNotMatch(
    APP_CODE,
    /setTimeout\([^)]*classList\.add/,
    'App.js puts a class on the interface on a timer',
  );
});

test('the way back is pinned out of the way, not left where its bar was', () => {
  // Asked for by the reader who hit the defect above: keep it, and keep it
  // unobtrusive. Fixed to the bottom corner, inside the safe area, so it is
  // neither over the organ nor under a notch.
  const rule = ruleFor(BASE, "#ui.is-hidden [data-control='hideUi']");
  assert.equal(declaration(rule.body, 'position'), 'fixed');
  for (const side of ['right', 'bottom']) {
    assert.match(
      declaration(rule.body, side) ?? '',
      /env\(safe-area-inset-/,
      `the way back ignores the safe area on the ${side}`,
    );
  }
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
  assert.doesNotMatch(APP_CODE, /is-capture/, 'App.js sets the capture-only class');
});
