import test from 'node:test';
import assert from 'node:assert/strict';

import { KINDS, PUPILS, solveCataract } from '../src/models/cataract.js';

const at = (kind, pupil = 'narrow', density = 1) => solveCataract(density, { kind, pupil });
const PLACES = KINDS.filter((k) => k.id !== 'none').map((k) => k.id);

test('physiology: how much of the lens has clouded does not say how much is in the way', () => {
  // The scene's whole claim, in one comparison. The rim covers most of the
  // lens and none of a small pupil; the small patch at the back covers a
  // twelfth of it and most of the same pupil.
  const rim = at('cortical');
  const patch = at('posterior-subcapsular');
  assert.ok(rim.ofTheLens > patch.ofTheLens * 6, 'the rim is much the larger cloud');
  assert.equal(rim.inPath, 0, 'and stands in none of a small pupil');
  assert.ok(patch.inPath > 0.6, 'while the small one stands in most of it');
});

test('physiology: opening the pupil reverses which one is in the way', () => {
  // A fact about an aperture, not about either cloud: neither changed.
  const rimNarrow = at('cortical', 'narrow');
  const rimWide = at('cortical', 'wide');
  const patchNarrow = at('posterior-subcapsular', 'narrow');
  const patchWide = at('posterior-subcapsular', 'wide');

  assert.ok(patchNarrow.inPath > rimNarrow.inPath, 'with a small pupil the central patch matters more');
  assert.ok(rimWide.inPath > patchWide.inPath, 'and with a wide one the rim does');

  // Neither cloud changed while that happened.
  assert.equal(rimNarrow.ofTheLens, rimWide.ofTheLens);
  assert.equal(patchNarrow.ofTheLens, patchWide.ofTheLens);
});

test('physiology: only the part of the lens behind the opening is in the way of anything', () => {
  // The geometry the two claims above rest on. A band entirely outside the
  // aperture contributes nothing, at any density.
  for (const density of [0.3, 1]) {
    assert.equal(at('cortical', 'narrow', density).inPath, 0, 'the rim is outside a small pupil at any density');
    assert.equal(at('cortical', 'narrow', density).blocked, 0);
  }
  // And a band entirely inside it is all of it.
  assert.ok(Math.abs(at('nuclear', 'narrow').inPath - 1) < 1e-12, 'a small pupil is entirely over the middle');
  assert.ok(PUPILS.narrow < PUPILS.wide, 'the two apertures are two sizes');
});

test('physiology: the share in the way is weighted by how opaque it is, and by nothing else', () => {
  for (const kind of PLACES) {
    const full = at(kind, 'wide', 1);
    for (const density of [0, 0.25, 0.5, 1]) {
      const solved = at(kind, 'wide', density);
      assert.ok(Math.abs(solved.blocked - full.inPath * density) < 1e-12, `${kind} at ${density}`);
      assert.equal(solved.inPath, full.inPath, 'the geometry does not move with the density');
    }
    assert.equal(at(kind, 'wide', 0).blocked, 0, `${kind}: a clear lens blocks nothing`);
  }
});

test('physiology: a clear lens is clear, and three places are not three stages', () => {
  const clear = at('none', 'wide', 1);
  assert.equal(clear.clouded, false);
  assert.equal(clear.ofTheLens, 0);
  assert.equal(clear.inPath, 0);
  assert.equal(clear.blocked, 0);

  // The bands do not nest or follow one another: the rim starts outside where
  // the middle ends, so neither is a larger version of the other.
  const middle = KINDS.find((k) => k.id === 'nuclear');
  const rim = KINDS.find((k) => k.id === 'cortical');
  assert.ok(rim.from > middle.to, 'the rim begins outside where the middle ends');
});

test('physiology: there is no vision anywhere in the output', () => {
  for (const kind of [...PLACES, 'none']) {
    const solved = at(kind, 'wide', 1);
    assert.equal(solved.vision, null, `${kind}: no sight is produced`);
    for (const key of Object.keys(solved)) {
      assert.ok(
        !/acuity|contrast|glare|sight|severity|grade|indication/i.test(key),
        `${kind}: "${key}" reads as a visual measure or an indication`
      );
    }
  }
});
