import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANNULUS_BEHIND,
  DIRECTIONS,
  MAX_REACH,
  TARGETS,
  solveLumbarDiscHerniation,
} from '../src/models/lumbarDiscHerniation.js';

const at = (direction, displacement = 1) => solveLumbarDiscHerniation(displacement, { direction });
const WAYS = DIRECTIONS.filter((d) => d.meets).map((d) => d.id);

test('physiology: the ring closing behind it is one threshold, not a degree', () => {
  // The atlas draws two tissues so that "deformed" and "material has left it"
  // can be told apart. That is a state with two values, and it must not drift
  // into being a reading of how far something has gone.
  for (const direction of WAYS) {
    assert.equal(at(direction, 0).annulus, 'intact', `${direction}: at rest the ring is closed`);
    assert.equal(at(direction, 1).annulus, 'breached', `${direction}: and at the top it is not`);
    assert.equal(at(direction, 0).beyondAnnulus, 0);

    // It turns over exactly where the reach passes the annulus behind it.
    for (let step = 0; step <= 20; step += 1) {
      const solved = at(direction, step / 20);
      assert.equal(
        solved.annulus === 'breached',
        solved.reach > ANNULUS_BEHIND,
        `${direction} at ${step / 20}: the state is the reach against the ring and nothing else`
      );
    }
  }
  assert.equal(at('none', 1).annulus, 'intact', 'material that has gone nowhere has not left anything');
});

test('physiology: what it can reach is decided by the direction, not by how far it went', () => {
  // The claim the control exists for. The canal is wide and near; the root is
  // narrow, and further along it is further away — so the same travel means a
  // different thing each way.
  const clearances = WAYS.map((direction) => TARGETS[at(direction).meets].clearance);
  assert.equal(new Set(clearances).size, WAYS.length, 'the three ways are three different distances');

  // Far-lateral is the furthest to travel, so at a displacement that has
  // already reached the others it has not arrived.
  const part = 0.6;
  assert.equal(at('posterolateral', part).touching, true, 'the nearest thing is reached first');
  assert.equal(at('far-lateral', part).touching, false, 'and the furthest is not');
  assert.equal(at('far-lateral', 1).touching, true, 'though it is reached by the top of the axis');

  // Nothing is reached when nothing has moved, and `none` reaches nothing ever.
  for (const direction of WAYS) assert.equal(at(direction, 0).touching, false);
  assert.equal(at('none', 1).touching, false);
  assert.equal(at('none', 1).meets, null);
});

test('physiology: passing the ring and reaching something are two separate events', () => {
  // The distinction the whole scene exists for. There has to be a state where
  // material is past the ring and has reached nothing — otherwise the picture
  // says the two words mean the same thing.
  const between = [];
  for (let step = 0; step <= 40; step += 1) {
    const solved = at('far-lateral', step / 40);
    if (solved.annulus === 'breached' && !solved.touching) between.push(step / 40);
  }
  assert.ok(between.length > 4, 'there is a real span where it is past the ring and reaches nothing');

  // And for the canal the two events are also distinct rather than simultaneous.
  const canal = [];
  for (let step = 0; step <= 40; step += 1) {
    const solved = at('central', step / 40);
    if (solved.annulus === 'breached' && !solved.touching) canal.push(step / 40);
  }
  assert.ok(canal.length > 0, 'the same holds going straight back');
});

test('physiology: how far in is reported against the structure’s own width, and is bounded', () => {
  // A root is narrow, so a distance means nothing without what it is a distance
  // into. And past the structure's width the model stops measuring rather than
  // reporting a number it cannot defend.
  for (const direction of WAYS) {
    const solved = at(direction, 1);
    assert.ok(solved.indentFraction >= 0 && solved.indentFraction <= 1, `${direction}: bounded to the width`);
    assert.equal(solved.indent <= TARGETS[solved.meets].width + 1e-12, true);
  }

  // The narrow targets saturate and say so; the wide one does not.
  assert.equal(at('posterolateral', 1).pastItsWidth, true);
  assert.equal(at('central', 1).pastItsWidth, false, 'the canal is wide enough that it does not saturate');
  assert.ok(at('central', 1).indentFraction < 1);

  // It rises monotonically from the moment of contact and is zero before it.
  let previous = -1;
  for (let step = 0; step <= 20; step += 1) {
    const solved = at('central', step / 20);
    assert.ok(solved.indentFraction >= previous, 'it never goes backwards');
    if (!solved.touching) assert.equal(solved.indentFraction, 0, 'and is nothing before they meet');
    previous = solved.indentFraction;
  }
});

test('physiology: there is no symptom anywhere in the output', () => {
  // The third question, and the one this model must be unable to answer. A
  // caller reading the output has to find an explicit absence rather than a
  // field they might mistake for one.
  for (const direction of [...WAYS, 'none']) {
    const solved = at(direction, 1);
    assert.equal(solved.symptoms, null, `${direction}: no symptom is produced`);
    const numbers = Object.entries(solved).filter(([, v]) => typeof v === 'number');
    for (const [key] of numbers) {
      assert.ok(
        !/pain|sciatic|weak|numb|reflex|severity|grade|risk/i.test(key),
        `${direction}: "${key}" reads as a symptom or a grade`
      );
    }
  }
  assert.ok(MAX_REACH > 0);
});
