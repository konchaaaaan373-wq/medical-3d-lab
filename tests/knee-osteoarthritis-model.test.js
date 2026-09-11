import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTROLS, KNEE, solveKneeOsteoarthritis } from '../src/models/kneeOsteoarthritis.js';
import { KneeOsteoarthritisScene } from '../src/scenes/musculoskeletal/scenes/kneeOsteoarthritis/KneeOsteoarthritisScene.js';
import { STAGES, VISUAL_MAPPING, MODEL_SCOPE } from '../src/data/kneeOsteoarthritis.js';

/** Model integrity, and the axis the scene owns. */

test('knee model: it is deterministic, and an untouched knee has two layers', () => {
  const a = solveKneeOsteoarthritis();
  const b = solveKneeOsteoarthritis({ ...DEFAULT_CONTROLS });
  assert.equal(a.medial.remaining, b.medial.remaining);

  const none = solveKneeOsteoarthritis({ side: 'none', loss: 1, confinement: 1 });
  assert.equal(none.present, false);
  assert.equal(none.loss, 0);
  assert.equal(none.difference, 0);
  assert.equal(none.confinedToOneCompartment, false);
});

test('knee model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'behind']) {
    const solved = solveKneeOsteoarthritis({ side: value, loss: value, confinement: value });
    for (const side of ['medial', 'lateral']) {
      const compartment = solved.compartment(side);
      assert.ok(Number.isFinite(compartment.remaining), `${side} / ${String(value)}`);
      assert.ok(compartment.remaining >= 0 && compartment.remaining <= 1, `${side} / ${String(value)}`);
      assert.ok(compartment.meniscalExtrusion >= 0, `${side} / ${String(value)}`);
    }
  }
  assert.equal(solveKneeOsteoarthritis({ side: 'patellofemoral' }).present, false);
});

test('knee scene: the axis is how much, and it is not which side', () => {
  const scene = new KneeOsteoarthritisScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };

  for (const progress of [0, 0.55, 1]) assert.equal(at(progress).side, 'medial', 'the axis never swaps sides');

  const [intact, thinning, gone] = STAGES.map((stage) => at(stage.at));
  assert.equal(intact.medial.remaining, 1, 'the first stage has both layers');
  assert.equal(intact.medial.osteophyte, 0);
  assert.ok(thinning.medial.remaining < 0.5 && thinning.medial.remaining > 0, 'the second is losing one');
  assert.equal(thinning.lateral.remaining, 1, 'while the other keeps its own');
  assert.equal(gone.medial.surfacesMeet, true, 'and by the third that side has none');
  assert.ok(gone.medial.osteophyte > 0, 'with new bone at that rim');
});

test('knee scene: the drawing thins the layer the model thinned, and only that one', () => {
  const scene = new KneeOsteoarthritisScene({});
  scene.build();
  scene.setModelControl('confinement', 1);
  scene.setProgress(1);

  const cap = (name) => scene.caps.get(name);
  // The condylar cap is scaled back towards its condyle; the plateau cap sinks.
  assert.ok(
    Math.abs(cap('medial-condylar-cartilage').mesh.scale.x - scene.capScaleFor(0)) < 1e-9,
    'the worn condyle has no layer left'
  );
  assert.equal(cap('lateral-condylar-cartilage').mesh.scale.x, 1, 'the other one is untouched');
  assert.ok(
    Math.abs(
      cap('medial-plateau-cartilage').mesh.position.y -
        (cap('medial-plateau-cartilage').restY - KNEE.plateauLayer)
    ) < 1e-9,
    'the worn plateau cap has sunk by the whole layer'
  );
  assert.equal(
    cap('lateral-plateau-cartilage').mesh.position.y,
    cap('lateral-plateau-cartilage').restY,
    'and the other has not moved'
  );

  // The meniscus and the marginal bone follow the same side.
  const worn = scene.menisci.get('medial');
  assert.ok(Math.abs(worn.mesh.position.x - worn.restX) > 0.05, 'the meniscus on that side has moved out');
  const intact = scene.menisci.get('lateral');
  assert.equal(intact.mesh.position.x, intact.restX, 'and the other has not');
  assert.equal(scene.osteophytes.get('medial').mesh.visible, true);
  assert.equal(scene.osteophytes.get('lateral').mesh.visible, false);

  // The read-out is the same solve.
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(Number(rows.medial), Math.round(scene.solved.medial.remaining * 100));
  assert.equal(rows.picture, 'one compartment');

  // Even loss is a different picture, and the scene draws it as one.
  scene.setModelControl('confinement', 0);
  assert.equal(scene.caps.get('lateral-condylar-cartilage').mesh.scale.x, scene.capScaleFor(0));
  assert.equal(scene.osteophytes.get('lateral').mesh.visible, true);
  assert.equal(
    Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value])).picture,
    'both sides, evenly'
  );

  scene.dispose();
});

test('knee scene: the layer is never called a joint space width', () => {
  // The one thing this scene must not let slide. The figure it reports looks
  // exactly like the number a radiograph gives, and it is not that number.
  const layer = VISUAL_MAPPING.find((entry) => entry.id === 'layer-thinning');
  assert.match(layer.notClaim, /not a joint space width/i);
  assert.match(layer.notClaim, /weight-bearing/i);
  assert.match(layer.notClaimJa, /関節裂隙幅ではありません/);

  const caution = MODEL_SCOPE.cautions.find((entry) => /joint space width/i.test(entry.text));
  assert.ok(caution, 'the scope panel says it too');
  assert.match(caution.text, /millimetres/i);

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
