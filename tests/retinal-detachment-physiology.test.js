import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_ARC, ORIGINS, solveRetinalDetachment } from '../src/models/retinalDetachment.js';

const at = (origin, extent = 1) => solveRetinalDetachment(extent, { origin });
const STARTS = ORIGINS.filter((o) => o.toMacula !== null).map((o) => o.id);

test('physiology: whether the macula is in it is decided by position, not by size', () => {
  // The claim the whole scene exists for. A separation covering a twentieth of
  // the drawn globe has the macula in it; one covering nearly half does not.
  const small = at('posterior', 0.2);
  const large = at('superior', 0.8);
  assert.equal(small.macula, 'off', 'a small one at the back has it');
  assert.equal(large.macula, 'on', 'and a large one at the edge does not');
  assert.ok(large.areaFraction > small.areaFraction * 8, 'the larger one is much larger');
});

test('physiology: a peripheral start has a long way to go and a posterior one does not', () => {
  // The reason the first claim holds: the macula is one place at the back, and
  // the periphery is the better part of a right angle away from it.
  for (const origin of ['superior', 'temporal', 'inferior']) {
    assert.ok(at(origin).toMacula > 70, `${origin}: it starts far from the macula`);
    assert.equal(at(origin, 0.5).macula, 'on', `${origin}: halfway along it is still outside`);
    assert.equal(at(origin, 1).macula, 'off', `${origin}: and by the top of the axis it is in`);
  }
  assert.ok(at('posterior').toMacula < 20, 'the posterior start is close to it');
  assert.equal(at('posterior', 0.15).macula, 'off', 'so it is in almost at once');
});

test('physiology: the area is a cap on a sphere and rises with the reach alone', () => {
  // Same extent, same area, whichever way it started — which is what makes the
  // area useless for answering the question the scene asks.
  for (const extent of [0.25, 0.6, 1]) {
    const areas = STARTS.map((origin) => at(origin, extent).areaFraction);
    for (const area of areas) assert.ok(Math.abs(area - areas[0]) < 1e-12, 'the area does not depend on where it started');
  }
  let previous = -1;
  for (const extent of [0, 0.25, 0.5, 0.75, 1]) {
    const area = at('superior', extent).areaFraction;
    assert.ok(area > previous, 'it grows with the reach');
    previous = area;
  }
  assert.equal(at('superior', 0).areaFraction, 0);
  assert.ok(at('superior', 1).areaFraction < 1, 'and never becomes the whole retina');
});

test('physiology: nothing has separated when nothing has separated', () => {
  assert.equal(at('none', 1).separated, false);
  assert.equal(at('none', 1).macula, 'on');
  assert.equal(at('none', 1).areaFraction, 0);
  assert.equal(at('none', 1).lift, 0);
  for (const origin of STARTS) {
    assert.equal(at(origin, 0).separated, false, `${origin}: at the bottom of the axis nothing has gone`);
    assert.equal(at(origin, 0).macula, 'on');
  }
});

test('physiology: how much further it has to reach is reported, and reaches zero exactly once', () => {
  // The number that makes the position claim checkable rather than assertable.
  let crossed = null;
  for (let step = 0; step <= 100; step += 1) {
    const solved = at('temporal', step / 100);
    assert.equal(solved.maculaInside, solved.degreesShort === 0, 'short-by-zero and inside are the same fact');
    if (solved.maculaInside && crossed === null) crossed = step / 100;
  }
  assert.ok(crossed !== null && crossed > 0.6, 'a peripheral start crosses late');
  assert.ok(MAX_ARC > 0);
});

test('physiology: there is no vision anywhere in the output', () => {
  // The absence that the subject most needs. A caller must find it stated.
  for (const origin of [...STARTS, 'none']) {
    const solved = at(origin, 1);
    assert.equal(solved.vision, null, `${origin}: no vision is produced`);
    for (const key of Object.keys(solved)) {
      assert.ok(
        !/acuity|vision|sight|prognos|recover|outcome|severity|grade/i.test(key) || key === 'vision',
        `${origin}: "${key}" reads as sight or a prognosis`
      );
    }
  }
});
