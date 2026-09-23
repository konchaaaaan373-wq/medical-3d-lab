import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { customProperties, declaration, rulesOf } from '../scripts/lib/css.mjs';

/**
 * The header's ink and the page's ground, kept on the same side of the fence.
 *
 * ## What went wrong
 *
 * One header now serves five surfaces, and it takes its colours from four
 * custom properties resolved per route. The landing page keeps a near-black
 * ground and gets pale ink; the reading surfaces get a pale ground and dark
 * ink. Two lists, and a surface has to be in exactly one of them.
 *
 * The locked surface — the page 67 of the 71 models actually show — was put in
 * *neither*. `locked.css` paints `.locked-surface` with `var(--bg)`, which no
 * one changed, while the shared stylesheet added `data-route='locked'` to the
 * pale-ground rule and left its ink dark. The result shipped: a wordmark at
 * 1.44:1 against the panel behind it, a nav at 3.26:1, and a horizontal seam
 * across the page where the dark panel ended and the new pale ground began.
 *
 * Nothing failed. `npm test` was green, and `verify:ui` printed "Every declared
 * viewport and surface met the declared rules" — it measures overflow, target
 * size, occlusion and tab order, and has never measured contrast. The bug was
 * found by a person opening the page, and it was the one surface of the five
 * that had not been opened.
 *
 * ## What this fixes in place
 *
 * Two halves, in the two places that can answer.
 *
 * Here, statically: the pairing this stylesheet *can* see — that the locked
 * surface's own sheet still paints the dark ground the shared one assumes, and
 * that the dark-ground block sets all four colours rather than three. A first
 * version of this file tried to derive every route's effective ground from
 * these selectors alone and was wrong within a minute: the landing page's
 * ground is declared in `landing.css`, not here, so "every route takes a
 * ground from this file" is simply false. A guard built on a wrong model of
 * the cascade fails for the wrong reason, which is worse than no guard.
 *
 * And in `scripts/check-viewports.mjs`, in a real browser, where the cascade is
 * real: the shell header's own text is measured against whatever is actually
 * painted behind it, on every surface. That is the half that would have caught
 * this, and it is why `verify:ui` now measures contrast at all.
 */

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/styles/shell-header.css');

/**
 * The routes named by a rule that sets `background` on `html`/`body`.
 *
 * Read off the selectors rather than assumed, because the whole failure was a
 * route being added to one list and not the other.
 */
function groundedRoutes(css) {
  const pale = new Set();
  const dark = new Set();
  for (const rule of rulesOf(css)) {
    const background = declaration(rule.body, 'background');
    if (!background) continue;
    if (!/html\[data-route=/.test(rule.selectors)) continue;
    const routes = [...rule.selectors.matchAll(/data-route='([a-z]+)'/g)].map((m) => m[1]);
    const target = background.includes('--reading-bg') ? pale : background.includes('--bg') ? dark : null;
    if (!target) continue;
    for (const route of routes) target.add(route);
  }
  return { pale, dark };
}

test('the locked surface is on the dark side, because its own stylesheet puts it there', () => {
  // Named rather than left to the general rule above, because this is the one
  // that shipped wrong and the reason is in a different file: `locked.css`
  // paints `.locked-surface` with `var(--bg)` and nothing in the shared
  // stylesheet can see that. If the locked surface is ever moved to the pale
  // ground, this fails until `locked.css` moves with it.
  const locked = read('src/styles/locked.css');
  const surface = [...rulesOf(locked)].find((rule) => rule.names.includes('.locked-surface'));
  assert.ok(surface, '.locked-surface must declare its own ground');
  const background = declaration(surface.body, 'background') ?? '';
  assert.match(
    background,
    /var\(--bg\)/,
    'locked.css no longer paints the dark ground — move data-route="locked" to the pale block too'
  );

  const { dark } = groundedRoutes(shell);
  assert.equal(dark.has('locked'), true);
});

test('the shell declares every colour the header reads, so no route falls back to a guess', () => {
  const root = customProperties(shell, (selectors) => selectors.trim() === ':root');
  for (const token of ['shell-ink', 'shell-muted', 'shell-rule', 'shell-accent']) {
    assert.ok(root[token], `--${token} must have a :root default`);
  }
  // And the dark-ground block sets all four, not a subset: three of four leaves
  // one colour resolved against the other ground.
  const darkBlock = [...rulesOf(shell)].find(
    (rule) => /data-route='landing'/.test(rule.selectors) && /--shell-ink:/.test(rule.body)
  );
  assert.ok(darkBlock, 'the dark-ground token block');
  for (const token of ['--shell-ink', '--shell-muted', '--shell-rule', '--shell-accent']) {
    assert.match(darkBlock.body, new RegExp(`${token}:`), `${token} is missing from the dark block`);
  }
});
