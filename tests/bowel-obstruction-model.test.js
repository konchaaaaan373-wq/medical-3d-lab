import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTROLS, SEGMENTS, SITES, solveBowelObstruction } from '../src/models/bowelObstruction.js';
import { BowelObstructionScene } from '../src/scenes/gastrointestinal/scenes/bowelObstruction/BowelObstructionScene.js';
import { STAGES, VISUAL_MAPPING } from '../src/data/bowelObstruction.js';

/** Model integrity, and the axis the scene owns. */

test('bowel obstruction model: it is deterministic, and every segment is accounted for', () => {
  const a = solveBowelObstruction();
  const b = solveBowelObstruction({ ...DEFAULT_CONTROLS });
  assert.deepEqual(
    a.segments.map((segment) => segment.radiusRatio),
    b.segments.map((segment) => segment.radiusRatio)
  );
  assert.equal(a.segments.length, SEGMENTS.length);
  assert.ok(Math.abs(SEGMENTS.reduce((sum, segment) => sum + segment.lengthShare, 0) - 1) < 0.005);
});

test('bowel obstruction model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'sideways']) {
    const solved = solveBowelObstruction({ site: value, completeness: value, valveCompetence: value });
    assert.ok(Number.isFinite(solved.radiusRatio), String(value));
    assert.ok(solved.radiusRatio >= 1, String(value));
    assert.ok(Number.isFinite(solved.tensionSpread), String(value));
    for (const segment of solved.segments) {
      assert.ok(Number.isFinite(segment.radiusRatio) && segment.radiusRatio >= 1, `${segment.id} / ${String(value)}`);
      assert.ok(Number.isFinite(segment.wallTensionIndex), `${segment.id} / ${String(value)}`);
    }
  }
  // An unknown site is nothing blocked, not a blockage nowhere.
  assert.equal(solveBowelObstruction({ site: 'the-appendix' }).blocked, false);
});

test('bowel obstruction model: the axis is how complete, and it is not where', () => {
  // The distinction the scene is built on. Moving the axis changes how much is
  // retained; it never moves the blockage, and it never turns one site into
  // another.
  const site = 'proximal-colon';
  let previous = 0;
  for (const completeness of [0, 0.25, 0.5, 0.75, 1]) {
    const solved = solveBowelObstruction({ site, completeness });
    assert.equal(solved.transitionAt, completeness > 0 ? 'transverse-colon' : 'transverse-colon');
    assert.ok(solved.radiusRatio >= previous, `${completeness}: distension does not go backwards`);
    previous = solved.radiusRatio;
  }
  assert.equal(solveBowelObstruction({ site, completeness: 0 }).blocked, false, 'nothing blocked at the near end');
  assert.equal(solveBowelObstruction({ site, completeness: 0 }).radiusRatio, 1);

  // Every site the scene offers is a site the model knows, and each names a
  // different segment — four alternatives, not four degrees.
  const blocks = SITES.filter((candidate) => candidate.blocks).map((candidate) => candidate.blocks);
  assert.equal(new Set(blocks).size, blocks.length);
  for (const id of blocks) assert.ok(SEGMENTS.some((segment) => segment.id === id), id);
});

test('bowel obstruction scene: the axis, the calibres and the read-out come from one solve', () => {
  const scene = new BowelObstructionScene({});
  scene.build();
  scene.setModelControl('site', 'distal-colon');
  scene.setProgress(1);

  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(rows.widening, scene.solved.radiusRatio.toFixed(2));
  assert.equal(Number(rows.distended), Math.round(scene.solved.distendedLengthShare * 100));

  // Each colon mesh carries its own segment's ratio, read back off the tube.
  const caecum = scene.colon.part('caecum');
  const restingCaecum = caecum.surface.baseRadius(0.5);
  assert.ok(
    Math.abs(scene.colonRadiusAt('caecum') / restingCaecum - scene.solved.segment('caecum').radiusRatio) < 1e-6,
    'the caecum is drawn at the ratio the model gave it'
  );

  // And the empty side is not.
  scene.setModelControl('site', 'proximal-small-bowel');
  assert.equal(scene.solved.segment('caecum').empty, true);
  assert.ok(Math.abs(scene.colonRadiusAt('caecum') - restingCaecum) < 1e-9, 'an empty caecum is at its resting calibre');

  scene.dispose();
});

test('bowel obstruction scene: every stage the copy names is a state the model reaches', () => {
  const scene = new BowelObstructionScene({});
  scene.build();
  scene.setModelControl('site', 'distal-colon');
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };

  const [patent, partial, complete] = STAGES.map((stage) => at(stage.at));
  assert.equal(patent.blocked, false, 'a path from end to end');
  assert.equal(patent.radiusRatio, 1);

  assert.equal(partial.blocked, true, 'part of it still gets past');
  assert.ok(partial.radiusRatio > 1 && partial.radiusRatio < complete.radiusRatio, 'and less has collected');

  assert.ok(complete.radiusRatio > partial.radiusRatio, 'nothing crosses it');
  assert.equal(complete.closedLoop, true, 'and with the valve holding it is shut at both ends');

  // The marker is only drawn when something is blocked, and it moves with the
  // site rather than staying where the last one was.
  at(1);
  const first = scene.transitionPoint().clone();
  scene.setModelControl('site', 'proximal-small-bowel');
  assert.ok(scene.transitionPoint().distanceTo(first) > 0.5, 'the transition moved with the site');
  at(0);
  assert.equal(scene.marker.visible, false, 'and nothing is marked on an unobstructed gut');

  scene.dispose();
});

test('bowel obstruction scene: what the drawing does with the numbers is declared', () => {
  // The three the copy could be read past: a calibre that is not a diameter, a
  // drained colour that is not a degree, and a lit segment that is not a risk.
  const distension = VISUAL_MAPPING.find((entry) => entry.id === 'distension');
  assert.match(distension.notClaim, /no bowel diameter may be read off this/i);
  assert.match(distension.notClaim, /no intraluminal pressure and no time/i);

  const tension = VISUAL_MAPPING.find((entry) => entry.id === 'tension-highlight');
  assert.match(tension.notClaim, /not a tension, not a pressure/i);
  assert.match(tension.notClaim, /not a probability/i);

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
