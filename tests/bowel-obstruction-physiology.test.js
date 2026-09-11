import test from 'node:test';
import assert from 'node:assert/strict';
import { SEGMENTS, solveBowelObstruction } from '../src/models/bowelObstruction.js';

/**
 * Layer 1 — what this model asserts about obstructed bowel rather than about
 * itself. None of these reads a constant this repository chose; each is a
 * proposition that would be true if this repository did not exist.
 */

const complete = (site, extra = {}) => solveBowelObstruction({ site, completeness: 1, ...extra });

test('physiology: a blockage fills what is above it and empties what is below it', () => {
  // The whole mechanism, and the reason a transition point is a landmark.
  const solved = complete('distal-small-bowel');
  const at = SEGMENTS.findIndex((segment) => segment.id === 'distal-small-bowel');

  for (const [index, segment] of solved.segments.entries()) {
    if (index <= at) {
      assert.equal(segment.above, true, `${segment.id} is above the blockage`);
      assert.equal(segment.empty, false, `${segment.id} is not empty`);
      assert.ok(segment.radiusRatio > 1, `${segment.id} is distended`);
    } else {
      assert.equal(segment.empty, true, `${segment.id} receives nothing`);
      assert.equal(segment.radiusRatio, 1, `${segment.id} is not distended`);
    }
  }

  // The transition is where the two meet, and the model names both sides of it.
  assert.equal(solved.transitionAt, 'distal-small-bowel');
  assert.equal(solved.belowTransition, 'caecum');

  // An unobstructed gut has no two sides.
  const patent = solveBowelObstruction({ site: 'none', completeness: 1 });
  assert.equal(patent.blocked, false);
  assert.equal(patent.emptyLengthShare, 0);
  assert.equal(patent.distendedLengthShare, 0);
  assert.equal(patent.radiusRatio, 1);
});

test('physiology: the same amount over a shorter length distends it further', () => {
  // Conservation, and the reason the site is worth a scene: a high blockage
  // distends a short length a great deal and leaves most of the gut empty; a
  // low one has far more bowel above it and distends each part of it less.
  const high = complete('proximal-small-bowel');
  const low = complete('distal-small-bowel');

  assert.ok(low.distendedLengthShare > high.distendedLengthShare * 1.5, 'more bowel is above the lower one');
  assert.ok(high.radiusRatio > low.radiusRatio, 'and the higher one distends what it has further');
  assert.ok(high.emptyLengthShare > low.emptyLengthShare, 'while leaving more of the gut empty');

  // Monotone in the same direction all the way down, with the valve out of the
  // way so the comparison is about length and nothing else.
  let previousLength = 0;
  let previousRadius = Infinity;
  for (const site of ['proximal-small-bowel', 'distal-small-bowel', 'proximal-colon', 'distal-colon']) {
    const solved = complete(site, { valveCompetence: 0 });
    assert.ok(solved.distendedLengthShare > previousLength, `${site}: more bowel above it`);
    assert.ok(solved.radiusRatio < previousRadius, `${site}: and less distension in each part of it`);
    previousLength = solved.distendedLengthShare;
    previousRadius = solved.radiusRatio;
  }
});

test('physiology: a valve that holds shuts a colonic blockage in at both ends', () => {
  const held = complete('distal-colon', { valveCompetence: 1 });
  const given = complete('distal-colon', { valveCompetence: 0 });

  assert.equal(held.closedLoop, true, 'the colon is shut at both ends');
  assert.equal(given.closedLoop, false, 'and with the valve gone it is not');

  // Nothing decompresses back into the ileum, so the small bowel is not
  // distended even though it is above the blockage.
  const ileum = held.segment('distal-small-bowel');
  assert.equal(ileum.above, true, 'the ileum is above the blockage either way');
  assert.equal(ileum.distended, false, 'but the valve keeps it out of it');
  assert.ok(given.segment('distal-small-bowel').distended, 'and with the valve gone it shares it');

  // The same obstruction, a much shorter length to take it, so much further.
  assert.ok(held.radiusRatio > given.radiusRatio * 1.1, 'the shut-in colon distends further');
  assert.ok(held.distendedLengthShare < given.distendedLengthShare, 'over less bowel');

  // A valve above a *small bowel* blockage has nothing to shut in: the
  // blockage is already below it.
  assert.equal(complete('distal-small-bowel', { valveCompetence: 1 }).closedLoop, false);
});

test('physiology: at one pressure the widest distended part carries the most wall tension', () => {
  // T = P·r. The point of the scene: in a distended colon the wall carrying
  // the most is the caecum, which is neither the blockage nor beside it.
  const solved = complete('distal-colon');
  assert.equal(solved.highestTension.id, 'caecum');
  assert.ok(solved.tensionStandsOut, 'and it stands out from the rest of the colon');

  // It is the calibre that puts it there, not the distension: every distended
  // segment is distended by the same ratio.
  const distended = solved.segments.filter((segment) => segment.distended);
  const ratios = new Set(distended.map((segment) => segment.radiusRatio.toFixed(9)));
  assert.equal(ratios.size, 1, 'they are all distended by the same amount');
  const caecum = solved.segment('caecum');
  const sigmoid = solved.segment('sigmoid-colon');
  assert.ok(caecum.wallTensionIndex > sigmoid.wallTensionIndex, 'and the wider one carries more');

  // Where the caecum is below the blockage it is not in the running at all,
  // and the answer is the widest thing that *is* above it.
  const small = complete('distal-small-bowel');
  assert.equal(small.segment('caecum').empty, true);
  assert.notEqual(small.highestTension.id, 'caecum');
  assert.equal(small.tensionStandsOut, false, 'small bowel is drawn at one calibre and has no worst part');
});
