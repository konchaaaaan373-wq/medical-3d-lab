import test from 'node:test';
import assert from 'node:assert/strict';
import { solveKneeOsteoarthritis } from '../src/models/kneeOsteoarthritis.js';

/**
 * Layer 1 — what this model asserts about knees rather than about itself.
 *
 * The scene is geometry and a distribution, and each of these is a proposition
 * a reader is meant to leave with in place of "the cartilage wore out".
 */

const at = (loss, confinement = 1, side = 'medial') =>
  solveKneeOsteoarthritis({ side, loss, confinement });

test('physiology: a knee loses a compartment rather than a joint', () => {
  // The correction the scene exists for. One side can be gone while the other
  // is untouched, and the model has to be able to say so at every amount.
  for (const loss of [0.25, 0.6, 1]) {
    const solved = at(loss);
    assert.equal(solved.lateral.remaining, 1, `${loss}: the other side is untouched`);
    assert.ok(solved.medial.remaining < 1, `${loss}: and this one is not`);
    assert.equal(solved.confinedToOneCompartment, true);
    assert.equal(solved.worst.id, 'medial');
  }

  // Either side can be the one, and the picture is the mirror of it.
  const medial = at(1, 1, 'medial');
  const lateral = at(1, 1, 'lateral');
  assert.equal(medial.medial.remaining, lateral.lateral.remaining);
  assert.equal(medial.lateral.remaining, lateral.medial.remaining);

  // And a knee with nothing wrong with it has two intact layers.
  const intact = solveKneeOsteoarthritis({ side: 'none', loss: 1 });
  assert.equal(intact.medial.remaining, 1);
  assert.equal(intact.lateral.remaining, 1);
  assert.equal(intact.worst, null);
});

test('physiology: what follows appears on the side that lost the layer and not on the other', () => {
  // The consequences belong to the compartment. A model that put them on the
  // joint would be teaching the picture the scene is correcting.
  const solved = at(1);
  assert.ok(solved.medial.meniscalExtrusion > 0, 'the meniscus on that side is pushed out');
  assert.equal(solved.lateral.meniscalExtrusion, 0, 'and the one on the other side is not');
  assert.ok(solved.medial.osteophyte > 0, 'new bone grows at that rim');
  assert.equal(solved.lateral.osteophyte, 0, 'and not at the other');
  assert.equal(solved.medial.surfacesMeet, true, 'and there the surfaces meet');
  assert.equal(solved.lateral.surfacesMeet, false, 'while on the other side they do not');
});

test('physiology: a wedge between converging surfaces is pushed outward', () => {
  // Geometry, and the reason extrusion belongs in a scene about narrowing at
  // all: it is not a separate disease of the meniscus.
  let previous = -1;
  for (const loss of [0, 0.25, 0.5, 0.75, 1]) {
    const extrusion = at(loss).medial.meniscalExtrusion;
    assert.ok(extrusion > previous || loss === 0, `${loss}: further out`);
    assert.ok(extrusion >= 0, 'and never inward');
    previous = extrusion;
  }
  assert.equal(at(0).medial.meniscalExtrusion, 0, 'an intact compartment pushes nothing out');

  // It follows the loss in that compartment and nothing else: the same loss
  // spread over both sides pushes both out.
  const even = at(1, 0);
  assert.equal(even.medial.meniscalExtrusion, even.lateral.meniscalExtrusion);
  assert.ok(even.lateral.meniscalExtrusion > 0);
});

test('physiology: the same amount lost is two pictures, not two severities', () => {
  // The distinction the second control exists for. At the same position on the
  // axis, confined loss has a side and even loss does not — and no amount of
  // moving the axis turns one into the other.
  const confined = at(1, 1);
  const even = at(1, 0);

  assert.equal(confined.medial.remaining, even.medial.remaining, 'the same amount is gone from the worst side');
  assert.notEqual(confined.lateral.remaining, even.lateral.remaining, 'and the other side is the difference');
  assert.equal(confined.confinedToOneCompartment, true);
  assert.equal(even.confinedToOneCompartment, false);
  assert.equal(even.difference, 0, 'even loss has no side');

  // Every position on the axis keeps that distinction rather than converging.
  for (const loss of [0.3, 0.6, 0.9]) {
    assert.ok(at(loss, 1).difference > at(loss, 0).difference, `${loss}: confined still has a side`);
    assert.equal(at(loss, 0).difference, 0, `${loss}: even still has none`);
  }
});
