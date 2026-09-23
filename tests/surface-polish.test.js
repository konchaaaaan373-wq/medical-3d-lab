import test from 'node:test';
import assert from 'node:assert/strict';

import { customProperties, fontSizePx, rulesOf } from '../scripts/lib/css.mjs';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function relativeLuminance(hex) {
  const channels = [1, 3, 5]
    .map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  assert.ok(foreground, 'contrast token must exist');
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function routeTokens(css, route) {
  // Through the shared reader rather than a hand-built `[^}]+` body: that
  // spelling lets an at-rule's opening brace swallow the first rule nested
  // inside it, so a token overridden inside a `@media` block was read as part
  // of one enormous declaration list.
  const selects = (selectors) => new RegExp(`html\\[data-route=['"]${route}['"]\\]`).test(selectors);
  assert.ok([...rulesOf(css)].some((rule) => selects(rule.selectors)), `${route} route token block must exist`);
  const tokens = customProperties(css, selects);
  return Object.fromEntries(
    Object.entries(tokens).filter(([, value]) => /^#[0-9a-f]{6}$/i.test(value))
  );
}

test('surface polish is the last visual layer, after the B6 integration', () => {
  const main = read('src/main.js');
  const b6 = main.indexOf("./styles/product-shell-b6.css");
  const polish = main.indexOf("./styles/surface-polish.css");

  assert.ok(b6 >= 0, 'B6 stylesheet is still mounted');
  assert.ok(polish > b6, 'cross-surface polish must resolve the final computed style');
});

test('the four public surfaces share one restrained typography contract', () => {
  const base = read('src/styles/base.css');
  const css = read('src/styles/surface-polish.css');

  assert.match(base, /--weight-regular:\s*400/);
  assert.match(base, /--weight-medium:\s*500/);
  assert.match(base, /--weight-semibold:\s*600/);
  assert.match(base, /--weight-bold:\s*700/);
  for (const route of ['landing', 'explorer', 'trust', 'legal']) {
    assert.match(css, new RegExp(`data-route=['"]${route}['"]`));
  }
  assert.doesNotMatch(css, /border-radius:\s*999px/);
});

test('reading routes use direct headings and legal prose remains body-sized', () => {
  const landing = read('src/app/Landing.js');
  const trust = read('src/app/Trust.js');
  const legal = read('src/app/Legal.js');
  const css = read('src/styles/surface-polish.css');

  assert.match(landing, /Public beta/);
  assert.match(landing, /3D anatomy model/);
  assert.match(trust, /Model status and medical review/);
  assert.match(trust, /モデルの公開状態と医学レビュー/);
  assert.doesNotMatch(trust, /Maturity and medical review are different claims/);
  // The legal pages reach the publication record through the shared header
  // rather than through a nav of their own. The label changed with it: "Model
  // information", pressed with a model on screen, promised something about
  // that model and arrived at a ledger of seventy.
  assert.match(legal, /createShellHeader\(/);
  const shell = read('src/components/ShellHeader.js');
  assert.match(shell, /ja: '公開とレビュー'/);
  assert.match(shell, /route: MODEL_INFO_ROUTE/);
  // The size `.legal-body p` ends up with, not "somewhere after that selector
  // there is a 16px": the anchored form reads the first `font-size` it finds
  // after one spelling of the selector, which is two of this repo's recorded
  // ways to measure the wrong rule (L-02, L-03).
  assert.equal(fontSizePx(css, '.legal-body p'), 16);
});

test('new light-route tokens clear small-text contrast', () => {
  const css = read('src/styles/surface-polish.css');
  const legal = routeTokens(css, 'legal');
  const trust = routeTokens(css, 'trust');

  for (const [name, foreground] of Object.entries({
    'legal ink': legal.ink,
    'legal dim': legal['ink-dim'],
    'legal faint': legal['ink-faint'],
    'trust ink': trust.ink,
    'trust dim': trust['ink-dim'],
    'trust faint': trust['ink-faint'],
  })) {
    const background = name.startsWith('legal') ? '#f4f6f5' : '#f4f5f2';
    assert.ok(contrast(foreground, background) >= 4.5, `${name} must clear 4.5:1`);
  }
});

test('mixed light and dark model surfaces keep small text and focus visible', () => {
  const css = read('src/styles/surface-polish.css');
  assert.ok(contrast('#263a42', '#f4f6f5') >= 4.5, 'pale-preset gesture hint must clear 4.5:1');
  assert.match(
    css,
    /#ui\[data-background='studio'\] \.anatomy-shell-gesture-hint,[\s\S]*?background:\s*#f4f6f5;[\s\S]*?color:\s*#263a42;/
  );
  assert.match(
    css,
    /html\[data-route='explorer'\] \.public-models \.landing-demo :focus-visible\s*\{[^}]*outline-color:\s*#38e1ef;/s
  );
});
