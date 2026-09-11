import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BURDEN_RANGE,
  DEFAULT_CONTROLS,
  DIRECTIONS,
  solveMultinodularGoitre,
} from '../src/models/multinodularGoitre.js';
import { MultinodularGoitreScene } from '../src/scenes/endocrine/scenes/multinodularGoitre/MultinodularGoitreScene.js';
import { STAGES, VISUAL_MAPPING, MODEL_SCOPE } from '../src/data/multinodularGoitre.js';

/** Model integrity, and the axis the scene owns. */

test('goitre model: it is deterministic, and an unenlarged gland is untouched anatomy', () => {
  const a = solveMultinodularGoitre();
  const b = solveMultinodularGoitre({ ...DEFAULT_CONTROLS });
  assert.equal(a.advance, b.advance);

  const none = solveMultinodularGoitre({ direction: 'none', burden: BURDEN_RANGE.max });
  assert.equal(none.advance, 0);
  assert.equal(none.tracheaWidthFraction, 1);
  assert.equal(none.deviationRadii, 0);
  assert.equal(none.envelopsPosterior, false);
  assert.equal(none.airwayEffect, 'neither');
});

test('goitre model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'upwards']) {
    const solved = solveMultinodularGoitre({ direction: value, burden: value });
    for (const [key, number] of Object.entries(solved)) {
      if (typeof number !== 'number') continue;
      assert.ok(Number.isFinite(number), `${key} with ${String(value)}`);
    }
    assert.ok(solved.tracheaWidthFraction > 0 && solved.tracheaWidthFraction <= 1, String(value));
    assert.ok(solved.glandVolumeRatio >= 1, String(value));
  }
  assert.equal(solveMultinodularGoitre({ direction: 'sideways' }).direction, 'none');
});

test('goitre scene: the axis is how much, and it is not which way', () => {
  const scene = new MultinodularGoitreScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };

  for (const progress of [0, 0.4, 0.55, 1]) {
    assert.equal(at(progress).direction, 'medial', 'the axis never turns it');
  }
  assert.equal(at(0).burden, BURDEN_RANGE.min);
  assert.equal(at(1).burden, BURDEN_RANGE.max);

  // The stages the copy names are three states the model reaches.
  const [nodular, grown, large] = STAGES.map((stage) => at(stage.at));
  assert.equal(nodular.advance, 0, 'the first stage has not enlarged');
  assert.equal(nodular.airwayEffect, 'neither');
  assert.ok(grown.deviationRadii > 0.5, 'the second has reached the airway');
  assert.ok(large.deviationRadii > grown.deviationRadii, 'and the third has gone further');

  // Every direction the scene offers is one the model knows, and each has a way
  // of growing that the scene can draw.
  for (const direction of DIRECTIONS) {
    if (direction.id === 'none') continue;
    assert.ok(MultinodularGoitreScene.GROWTH[direction.id], `${direction.id} has a drawn shape`);
  }
  scene.dispose();
});

test('goitre scene: the airway, the lobes and the read-out come from one solve', () => {
  const scene = new MultinodularGoitreScene({});
  scene.build();
  scene.setModelControl('direction', 'retrosternal');
  scene.setProgress(1);

  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(Number(rows.width), Math.round(scene.solved.tracheaWidthFraction * 100));
  assert.equal(rows.deviation, scene.solved.deviationRadii.toFixed(2));
  assert.match(rows.airway, /narrowed/);

  // The airway is actually narrower at the inlet, and not anywhere else.
  const atInlet = scene.airwayRadiusAt(0.22);
  const inTheNeck = scene.airwayRadiusAt(0.8);
  assert.ok(atInlet < inTheNeck * 0.75, `narrowed at the inlet: ${atInlet} vs ${inTheNeck}`);

  // A gland in the neck leaves the same place alone.
  scene.setModelControl('direction', 'medial');
  assert.ok(scene.airwayRadiusAt(0.22) > atInlet * 1.4, 'and a gland in the neck does not narrow it');

  // The lobes grow down into the inlet in one picture and not in the other.
  scene.setModelControl('direction', 'retrosternal');
  const low = scene.thyroid.mesh('left-lobe').position.y;
  scene.setModelControl('direction', 'anterior');
  assert.ok(scene.thyroid.mesh('left-lobe').position.y > low, 'only the retrosternal one goes down');

  scene.dispose();
});

test('goitre scene: function is refused in the data as well as in the copy', () => {
  // The sharpest rule this scene has. It is not enough for the prose to avoid
  // hormones: the scope has to say, in both languages, that the shape does not
  // tell you the function — because that is the inference a reader will make.
  const functional = MODEL_SCOPE.excludes.find((entry) => /thyroid function/i.test(entry.text));
  assert.ok(functional, 'the scope excludes thyroid function explicitly');
  assert.match(functional.text, /euthyroid, overactive or underactive/i);
  assert.match(functional.text, /nothing about the shape says which/i);
  assert.match(functional.textJa, /形から機能は分かりません/);

  // And nothing anywhere in the scene's own copy names a hormone or a level.
  const words = JSON.stringify(MODEL_SCOPE.answers) + JSON.stringify(STAGES);
  assert.doesNotMatch(words, /thyroxine|TSH|hyperthyroid|hypothyroid/i);

  // The posterior highlight says what it is not, which is the other inference.
  const posterior = VISUAL_MAPPING.find((entry) => entry.id === 'posterior-structures');
  assert.match(posterior.notClaim, /not what has happened to them/i);
  assert.match(posterior.notClaim, /damaged, at risk/i);

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
