import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { serveDist } from '../scripts/lib/serve-dist.mjs';

/* The static server the browser checks share. It was eight copies of the same
   block, which is eight versions of one containment rule and one media table —
   and they had already drifted: the disease check's copy resolved a path and
   served whatever came back, with no containment check at all.

   This is not a browser test. It is the server itself, over a directory made
   here, because the rule worth pinning is "what does it serve, and what does it
   refuse" and that needs no Chromium. */

/** A tiny build, plus a sibling directory that is not part of it. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'serve-dist-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<!doctype html>shell');
  writeFileSync(join(dist, 'assets', 'app.js'), 'export const x = 1;');
  writeFileSync(join(root, 'secret.txt'), 'not in the build');
  mkdirSync(join(root, 'dev-assets'), { recursive: true });
  writeFileSync(join(root, 'dev-assets', 'candidate.glb'), 'glb');
  // A sibling whose name begins with the build's: `startsWith(root)` alone
  // would call this inside the build.
  mkdirSync(join(root, 'dist-old'), { recursive: true });
  writeFileSync(join(root, 'dist-old', 'stale.js'), 'stale');
  return { root, dist };
}

test('serve-dist: a build is served, and a hash route falls back to the shell', async () => {
  const { dist } = fixture();
  const server = await serveDist(dist);
  try {
    const asset = await fetch(`${server.base}assets/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('content-type'), 'text/javascript; charset=utf-8');
    // A check must never measure a stale build.
    assert.equal(asset.headers.get('cache-control'), 'no-store');
    assert.equal(await asset.text(), 'export const x = 1;');

    // Every route in this product is a hash, so a path that is not a file is
    // the application shell — the same answer a static host gives.
    assert.equal(await (await fetch(`${server.base}`)).text(), '<!doctype html>shell');
    assert.equal(await (await fetch(`${server.base}anything/at/all`)).text(), '<!doctype html>shell');
  } finally {
    server.close();
  }
});

test('serve-dist: nothing outside the build is served', async () => {
  const { dist } = fixture();
  const server = await serveDist(dist);
  try {
    for (const path of [
      '../secret.txt',
      '..%2Fsecret.txt',
      'assets/../../secret.txt',
      '../dist-old/stale.js',
    ]) {
      const response = await fetch(`${server.base}${path}`);
      const body = await response.text();
      assert.equal(body, '<!doctype html>shell', `${path} escaped the build`);
    }
  } finally {
    server.close();
  }
});

test('serve-dist: a mount serves what a build deliberately does not carry', async () => {
  const { root, dist } = fixture();
  // The candidate 3D assets live in the repository and are never copied into a
  // build; a check that drives them has to serve them from where they are.
  const server = await serveDist(dist, { mounts: { '/dev-assets/': root } });
  try {
    const asset = await fetch(`${server.base}dev-assets/candidate.glb`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('content-type'), 'model/gltf-binary');
    assert.equal(await asset.text(), 'glb');

    // The mount is contained exactly as the build is.
    assert.equal(
      await (await fetch(`${server.base}dev-assets/../secret.txt`)).text(),
      '<!doctype html>shell'
    );
    // And it does not take over anything else.
    assert.equal(await (await fetch(`${server.base}assets/app.js`)).text(), 'export const x = 1;');
  } finally {
    server.close();
  }
});

test('serve-dist: a directory that is not a build is refused before a browser starts', async () => {
  await assert.rejects(() => serveDist(join(tmpdir(), 'no-such-build-here')), /No build at/);
});
