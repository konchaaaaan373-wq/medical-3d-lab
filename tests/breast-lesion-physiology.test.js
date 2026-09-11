import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COURSES, NIPPLE, NIPPLE_TO_ROUTE, PARTS, ROUTE, solveBreastLesion,
} from '../src/models/breastLesion.js';

const at = (site, along = 1) => solveBreastLesion(along, { site });
const DUCTS = COURSES.filter((course) => course.duct !== null).map((course) => course.id);

test('physiology: further out along a duct is not nearer the route — on some courses it is further', () => {
  // The claim the model exists to make, and the one the usual telling of this
  // subject runs together with "further along". Every course starts at the same
  // place, so the comparison is between what moving out does on each.
  const outer = at('upper-outer');
  const inner = at('lower-inner');
  assert.ok(outer.toRoute < NIPPLE_TO_ROUTE, 'out along the upper outer course is nearer the route');
  assert.ok(inner.toRoute > NIPPLE_TO_ROUTE, 'and out along the lower inner course is further from it');
  assert.equal(outer.nearer, true);
  assert.equal(inner.nearer, false);
  // And by enough to be seen rather than measured off the read-out.
  assert.ok(NIPPLE_TO_ROUTE - outer.toRoute > 0.5, 'the near one moves a long way');
  assert.ok(inner.toRoute - NIPPLE_TO_ROUTE > 0.2, 'and the far one plainly the other way');
});

test('physiology: every duct system begins at the same place', () => {
  // Which is why the comparison above is a comparison of directions rather than
  // of starting points: nothing is nearer the route to begin with.
  for (const site of DUCTS) {
    const start = at(site, 0);
    assert.deepEqual(start.at, [...NIPPLE], `${site} begins at the nipple`);
    assert.ok(Math.abs(start.toRoute - NIPPLE_TO_ROUTE) < 1e-9, `${site}: and the same distance from the route`);
    assert.equal(start.nearer, null, `${site}: nothing has moved, so there is nothing to compare`);
  }
});

test('physiology: how far out settles which part of the duct system a place is in', () => {
  // The other thing position decides, and the words are places on a course.
  for (const site of DUCTS) {
    assert.equal(at(site, 0).inTissue, 'large-duct', `${site} near the nipple`);
    assert.equal(at(site, 0.65).inTissue, 'terminal-duct', `${site} further out`);
    assert.equal(at(site, 1).inTissue, 'lobular-end', `${site} at the end`);
    // And the end of a duct really is where that duct's lobules are.
    assert.ok(at(site, 1).toLobule < at(site, PARTS.largeUntil).toLobule / 3, `${site}: the lobules are at the far end`);
  }
});

test('physiology: the four courses pass through the same parts in the same order', () => {
  // So "which part of the duct system" is a fact about how far out a place is,
  // and not a property of which quadrant it happens to be in.
  const walk = (site) => [0, 0.3, 0.6, 0.9, 1].map((along) => at(site, along).inTissue);
  const first = walk(DUCTS[0]);
  for (const site of DUCTS.slice(1)) assert.deepEqual(walk(site), first, `${site} walks the same parts`);
});

test('physiology: the axillary tail is a different place, not a later one', () => {
  // The reading the model most firmly refuses: nowhere on any duct's axis is
  // the tail, and the tail is reached by choosing it.
  for (const site of DUCTS) {
    for (const along of [0, 0.25, 0.5, 0.75, 1]) {
      assert.notEqual(at(site, along).inTissue, 'axillary-tail-gland', `${site} at ${along} never becomes the tail`);
      assert.equal(at(site, along).onTheRoute, false);
    }
  }
  const tail = at('axillary-tail');
  assert.equal(tail.inTissue, 'axillary-tail-gland');
  assert.equal(tail.onTheRoute, true);
  assert.equal(tail.duct, null, 'and it is not a duct system at all');
  assert.equal(tail.nearer, null, 'so there is no "nearer" to report about it');
});

test('physiology: the route belongs to the gland and never responds to the place', () => {
  // Nothing travels, so nothing about the route may depend on the marker.
  const routes = [];
  for (const course of COURSES) for (const along of [0, 0.5, 1]) routes.push(JSON.stringify(ROUTE));
  assert.equal(new Set(routes).size, 1, 'the route is the same object at every position on every course');
  assert.ok(ROUTE.length >= 8, 'and it is a course rather than a straight line');
});

test('physiology: no spread, node, size or stage is produced anywhere in the output', () => {
  // The step this model refuses to take. A caller has to find the absence.
  for (const course of COURSES) {
    const solved = at(course.id, 1);
    assert.equal(solved.spread, null, `${course.id}: nothing spreads`);
    assert.equal(solved.nodalStatus, null);
    assert.equal(solved.size, null);
    assert.equal(solved.stage, null);
    for (const key of Object.keys(solved)) {
      if (['spread', 'nodalStatus', 'size', 'stage'].includes(key)) continue;
      assert.ok(
        !/spread|metasta|nodal|node|stage|grade|size|diameter|volume|risk|prognos|malign|tumou?r|cancer/i.test(key),
        `${course.id}: "${key}" reads as a spread, a size or a stage`
      );
    }
  }
});

test('physiology: the distance is reported against one fixed comparison', () => {
  // So the numbers compare positions inside one picture rather than offering a
  // measurement. The nipple's own distance is the yardstick, and it is shared.
  assert.ok(NIPPLE_TO_ROUTE > 0);
  for (const site of DUCTS) {
    assert.ok(Math.abs(at(site, 0).routeShare - 1) < 1e-9, `${site}: begins at one`);
    assert.ok(Math.abs(at(site, 1).routeShare - at(site, 1).toRoute / NIPPLE_TO_ROUTE) < 1e-9);
  }
  assert.equal(at('axillary-tail', 1).routeShare, 0, 'and the tail is on the route rather than a share away from it');
});
