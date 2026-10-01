import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BRAND_ICON_SVG } from '../src/components/brandIcon.js';
import { accountIdentity } from '../src/access/AccessManager.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The product's icon, and the header pieces decided with it (2026-09-27).
 */

test('the tab icon is the header icon, byte for byte', () => {
  // Two copies of a drawing is how one of them changes and the other does not.
  assert.equal(read('public/favicon.svg').trim(), BRAND_ICON_SVG);
  const html = read('index.html');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/apple-touch-icon\.png" \/>/);
  assert.doesNotMatch(html, /rel="icon" href="data:/, 'the placeholder dot is gone');
});

test('every header wears the name as type, and the model header the mark beside it', () => {
  // BYOKI MOTION (2026-09-30): the reading header is the wordmark; the model
  // header is the mark and the wordmark, the name giving way on a phone with
  // an organ row. No typed `M/3`, no `3D` tile, no "← home" text.
  const shell = read('src/components/ShellHeader.js');
  assert.match(shell, /return brandIcon\(el, className\)/);
  assert.match(shell, /createWordmark\(\{ size: 'sm', className: 'shell-brand-name' \}\)/);
  const scene = read('src/components/SceneSwitcher.js');
  assert.match(
    scene,
    /\[brandMark\('global-nav-brand-mark'\), createWordmark\(\{ size: 'sm', className: 'global-nav-brand-name' \}\)\]/,
    'the model header carries the mark and the name'
  );
  assert.doesNotMatch(scene, /global-nav-brand-back|global-nav-brand-home/);
});

test('signed out says ログイン and nothing else; signed in is an initial', () => {
  const source = read('src/access/AccessManager.js');
  // ○ / ● read as a radio button, and "signed out" needs no symbol.
  assert.doesNotMatch(source, /text: state\.user \? '●' : '○'/);
  assert.doesNotMatch(source, /account-icon/);
  assert.match(source, /class: 'account-avatar'/);

  assert.deepEqual(accountIdentity({ email: 'neco.oncall@example.com' }), { name: 'neco.oncall', initial: 'N' });
  assert.deepEqual(
    accountIdentity({ email: 'x@example.com', user_metadata: { full_name: '山田 太郎' } }),
    { name: '山田 太郎', initial: '山' },
    'a given name wins over the address, and a Japanese name gives its first character'
  );
  assert.equal(accountIdentity({ email: '😀a@example.com' }).initial, '😀', 'a whole character, not half a surrogate pair');
  assert.equal(accountIdentity({}).initial, '?', 'never an empty circle');
});

test('the publication ledger is linked from nowhere a reader browses', () => {
  // Owner's decision, 2026-09-27. A model's own record (`#/trust?model=…`) is
  // still linked from that model; the bare ledger is not linked at all.
  for (const file of ['src/components/ShellHeader.js', 'src/components/SceneSwitcher.js', 'src/app/Landing.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /'#\/trust'/, `${file} links the ledger`);
    assert.doesNotMatch(source, /href: MODEL_INFO_ROUTE[,\s]/, `${file} links the ledger`);
    assert.doesNotMatch(source, /公開とレビュー'/, `${file} names the ledger as a destination`);
  }
});
