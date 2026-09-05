import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { hasOrganPreview, mountOrganPreview } from '../src/app/organPreview.js';

const source = readFileSync(new URL('../src/app/organPreview.js', import.meta.url), 'utf8');

test('organ preview: only reusable organ builders are advertised', () => {
  for (const organ of ['brain', 'heart', 'lungs', 'liver', 'kidney']) {
    assert.equal(hasOrganPreview(organ), true, organ);
  }
  assert.equal(hasOrganPreview('whole-body'), false);
  assert.equal(hasOrganPreview('invented-organ'), false);
});

test('organ preview: an unsupported organ is a no-op without browser globals', () => {
  const dispose = mountOrganPreview({}, 'invented-organ');
  assert.equal(typeof dispose, 'function');
  assert.doesNotThrow(dispose);
});

test('organ preview: rotation is slow and all pause boundaries are explicit', () => {
  assert.match(source, /model\.rotation\.y \+= dt \* 0\.34/);
  assert.match(source, /inView &&\s*!pausedByPointer/);
  assert.match(source, /document\.visibilityState !== 'hidden'/);
  assert.match(source, /!motion\?\.matches/);
  assert.match(source, /pointerenter[\s\S]*pointerleave/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /rootMargin: '240px 0px'/);
});

test('organ preview: Three and organ geometry stay lazy and cleanup releases WebGL', () => {
  assert.doesNotMatch(source, /^import .* from 'three';/m);
  assert.match(source, /await import\('three'\)/);
  assert.match(source, /renderer\?\.dispose\(\)/);
  assert.match(source, /renderer\?\.forceContextLoss\?\.\(\)/);
  assert.match(source, /resizeObserver\?\.disconnect\(\)/);
  assert.match(source, /observer\?\.disconnect\(\)/);
});
