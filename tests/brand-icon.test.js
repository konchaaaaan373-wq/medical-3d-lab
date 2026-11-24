import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BRAND_FAVICON_SVG, BRAND_ICON_SVG } from '../src/components/brandIcon.js';
import { BRAND } from '../src/data/brand.js';
import { createShellHeader } from '../src/components/ShellHeader.js';
import { SURFACES } from '../src/styles/palette.js';
import { pngSize } from '../scripts/check-social-cards.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';
import { accountIdentity } from '../src/access/AccessManager.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The product's icon, and the header pieces decided with it (2026-09-27).
 */

test('the tab icon is the drawing in brandIcon.js, byte for byte', () => {
  // Two copies of a drawing is how one of them changes and the other does not.
  //
  // Until 2026-11-24 the tab icon *was* the header mark, one string for both.
  // The brain has two forms — the header's, with its sulci, and a simpler,
  // heavier one that survives 16 px — and the tab takes the small one
  // (`BRAND_FAVICON_SVG`). They are still one module, and
  // `tests/brand.test.js` holds that both are the same mirrored hemisphere
  // construction; what is held here is that the file on disk is the string.
  assert.equal(read('public/favicon.svg').trim(), BRAND_FAVICON_SVG);
  assert.notEqual(BRAND_FAVICON_SVG, BRAND_ICON_SVG, 'the tab icon is the small form, not the header mark shrunk');
  const html = read('index.html');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/apple-touch-icon\.png" \/>/);
  assert.doesNotMatch(html, /rel="icon" href="data:/, 'the placeholder dot is gone');

  // The rasters are rendered from the same module by `npm run icons`, whose
  // `--check` compares the SVG and the web manifest without a browser. Every
  // file the manifest and the shell name has to exist, at the size it claims.
  // (`scripts/render-brand-icons.mjs` draws when it is imported, so its
  // manifest is read from disk here; `tests/brand.test.js` holds its name and
  // description to `BRAND`, and `npm run icons -- --check` the whole file.)
  const manifest = JSON.parse(read('public/site.webmanifest'));
  assert.deepEqual(manifest.icons.map((icon) => icon.purpose), ['any', 'any', 'maskable']);
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL(`../public/${icon.src.replace(/^\.\//, '')}`, import.meta.url));
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(png), { width, height }, `${icon.src} is not ${icon.sizes}`);
  }
  assert.deepEqual(pngSize(readFileSync(new URL('../public/apple-touch-icon.png', import.meta.url))), { width: 180, height: 180 });
  // The ground a browser paints behind the page while it loads is the paper.
  assert.equal(manifest.background_color.toLowerCase(), SURFACES.trust);
  assert.equal(manifest.theme_color.toLowerCase(), SURFACES.trust);
  assert.match(html, new RegExp(`<meta name="theme-color" content="${SURFACES.trust}" />`, 'i'));
});

test('every header wears the mark and the name: the reading header as one wordmark, the model header side by side', () => {
  // 3Dモデルラボ (2026-11-24): the reading header's way home is the wordmark
  // *with* its mark — the pink brain is the brand, and a header without it was
  // the name in a system font. The model header keeps the mark and the name as
  // two pieces, because on a phone with an organ row the name gives way and the
  // mark stays. No typed `M/3`, no `3D` tile, no "← home" text.
  const shell = read('src/components/ShellHeader.js');
  assert.match(shell, /return brandIcon\(el, className\)/);
  assert.match(shell, /createWordmark\(\{ size: 'sm', className: 'shell-brand-name', withMark: true \}\)/);
  const scene = read('src/components/SceneSwitcher.js');
  assert.match(
    scene,
    /\[brandMark\('global-nav-brand-mark'\), createWordmark\(\{ size: 'sm', className: 'global-nav-brand-name' \}\)\]/,
    'the model header carries the mark and the name'
  );
  assert.doesNotMatch(scene, /global-nav-brand-back|global-nav-brand-home/);

  // Rendered: one mark in the way home, not two (the wordmark's own and a
  // second beside it), and the link says where it goes.
  const restore = installFakeDocument();
  try {
    const header = createShellHeader({ current: 'home', showLab: false, showPurposes: false });
    const [home] = findByClass(header, 'shell-brand');
    assert.equal(home.getAttribute('href'), '#/');
    assert.equal(findByClass(home, 'brand-icon').length, 1, 'the way home carries the mark exactly once');
    assert.equal(findByClass(home, 'wordmark')[0].classList.contains('has-mark'), true);
    assert.ok(home.getAttribute('aria-label').includes(BRAND.name));
  } finally {
    restore();
  }
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
