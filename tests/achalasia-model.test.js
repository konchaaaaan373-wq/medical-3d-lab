import test from 'node:test';
import assert from 'node:assert/strict';

import { CAPACITY_ML, DEFAULT_CONTROLS, solveAchalasia } from '../src/models/achalasia.js';
import { AchalasiaScene } from '../src/scenes/gastrointestinal/scenes/achalasia/AchalasiaScene.js';
import { STAGES } from '../src/data/achalasia.js';

/** Model integrity, and the axis mapping the scene owns. */

test('achalasia model: it is deterministic, and the defaults are a normal swallow', () => {
  const a = solveAchalasia();
  const b = solveAchalasia({ ...DEFAULT_CONTROLS });
  assert.equal(a.retainedVolumeMl, b.retainedVolumeMl);
  assert.equal(a.clearedFraction.toFixed(6), '1.000000');
  assert.equal(a.retainedVolumeMl, 0);
  assert.equal(a.balanced, true);
});

test('achalasia model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 9, Infinity, undefined, null]) {
    const state = solveAchalasia({ relaxationFailure: value, peristalticVigour: value, swallowVolumeMl: value });
    assert.ok(Number.isFinite(state.retainedVolumeMl), String(value));
    assert.ok(state.retainedVolumeMl >= 0 && state.retainedVolumeMl <= CAPACITY_ML, String(value));
    assert.ok(Number.isFinite(state.clearedFraction), String(value));
  }
});

test('achalasia model: it converges rather than stopping at a round number', () => {
  // Each swallow closes only a few per cent of the gap, so a fixed sixty of
  // them leaves the answer a fifth of the way out — which reads as "it clears
  // ninety-two per cent of a swallow" when the truth is that it clears all of
  // one from a taller column. The tolerance is the point.
  const converged = solveAchalasia({ relaxationFailure: 0.74, peristalticVigour: 0.3 });
  const truncated = solveAchalasia({ relaxationFailure: 0.74, peristalticVigour: 0.3 }, { maxSwallows: 60 });
  assert.ok(converged.retainedVolumeMl > truncated.retainedVolumeMl, 'sixty swallows is not enough');
  assert.equal(converged.clearedFraction.toFixed(2), '1.00', 'at the balance, a swallow gets through');
});

test('achalasia scene: the axis spends its middle inside the band a column can balance', () => {
  // The mapping exists because the band is narrow: a column the height of the
  // oesophagus is worth about sixteen millimetres of mercury, so a linear axis
  // crosses the whole of it in a twentieth of its travel and a reader dragging
  // it sees a switch rather than a filling. The corners of the curve are the
  // band's own edges.
  const scene = new AchalasiaScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };
  assert.equal(at(0).retainedVolumeMl, 0, 'a normal swallow clears');
  const middle = at(0.5);
  assert.ok(middle.retainedVolumeMl > 10, `the middle of the axis holds something: ${middle.retainedVolumeMl}`);
  assert.ok(middle.balanced, 'and it has settled');
  assert.ok(middle.retainedVolumeMl < CAPACITY_ML * 0.9, 'without being full');
  assert.equal(at(1).balanced, false, 'the end of the axis has no balance inside the organ');

  // Every stage the copy names lands where it says it does.
  for (const stage of STAGES) {
    const state = at(stage.at);
    // Each stage names a state the model actually reaches at that position, and
    // each has to be distinguishable from the one before it — otherwise two
    // captions describe one picture.
    if (stage.id === 'normal') {
      assert.equal(state.retainedVolumeMl, 0, stage.id);
      assert.ok(state.wavePressureMmHg > 60, `${stage.id}: the wave is intact`);
    }
    if (stage.id === 'aperistaltic') {
      assert.equal(state.retainedVolumeMl, 0, `${stage.id}: nothing is retained yet`);
      assert.ok(state.wavePressureMmHg < 40, `${stage.id}: and the wave has already failed`);
    }
    if (stage.id === 'retaining') assert.ok(state.retainedVolumeMl > 0 && state.balanced, stage.id);
    if (stage.id === 'balanced') {
      assert.ok(state.balanced, stage.id);
      assert.ok(
        state.retainedVolumeMl > at(0.5).retainedVolumeMl * 1.5,
        `${stage.id}: holding more than the stage before it`
      );
    }
    if (stage.id === 'failed') assert.equal(state.balanced, false, stage.id);
  }
  scene.dispose();
});

test('achalasia scene: the read-out and the tube come from the same solve', () => {
  const scene = new AchalasiaScene({});
  scene.build();
  scene.setProgress(0.5);
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(Number(rows.retained), Math.round(scene.solved.retainedVolumeMl));
  assert.equal(Number(rows.height), Number(scene.solved.columnHeightCm.toFixed(1)));

  // The column's top is where the model's filled fraction puts it, and the tube
  // is wider below it than a resting one is.
  const top = scene.columnTopU();
  assert.ok(top > 0 && top < scene.sphincterAt, `column top at ${top}`);
  scene.setProgress(0);
  const restingLow = scene.radiusAt(0.8);
  scene.setProgress(1);
  assert.ok(scene.radiusAt(0.8) > restingLow * 1.2, 'a filled oesophagus is drawn wider than a resting one');
  scene.dispose();
});
