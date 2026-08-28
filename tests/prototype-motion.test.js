import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { SCENES } from '../src/catalog/index.js';

/**
 * Two invariants that a still frame cannot check and that both went wrong in
 * review: animation that jumps when the slider moves, and label anchors that
 * describe an organ the scene has since moved.
 */
const PROTOTYPES = SCENES.filter((scene) => scene.status === 'prototype');
const viewer = { onResize: () => () => {}, onFrame: () => () => {} };

/**
 * Every number the scene has put into the graph, as one flat array — except
 * the particle streams. Those advance every frame whichever way the scene is
 * written, and their motion is large enough to bury the signal this is looking
 * for.
 */
function sample(root) {
  const values = [];
  root.traverse((object) => {
    if (object.isPoints) return;
    values.push(object.position.x, object.position.y, object.position.z);
    values.push(object.scale.x, object.scale.y, object.scale.z);
    const position = object.geometry?.attributes?.position;
    if (!position) return;
    // Every 37th vertex: enough of the surface to notice a shape change,
    // cheap enough to do for every scene.
    for (let i = 0; i < position.count; i += 37) {
      values.push(position.getX(i), position.getY(i), position.getZ(i));
    }
  });
  return values;
}

const distance = (a, b) => {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total;
};

for (const entry of PROTOTYPES) {
  test(`${entry.id}: the animation does not read the wall clock`, async () => {
    const SceneClass = (await entry.load()).default;

    /** Ten frames of the same scene, differing only in what time it is told. */
    const run = (offset) => {
      const scene = new SceneClass({ viewer });
      const root = scene.build();
      scene.setProgress(0.55);
      for (let frame = 0; frame < 10; frame++) scene.update(1 / 60, offset + frame / 60);
      const state = sample(root);
      scene.dispose();
      return state;
    };

    // A scene that carries its own phase gives the same ten frames whenever
    // they happen; one that derives phase from `elapsed` does not.
    //
    // The rule is uniform rather than "only where the rate moves", because the
    // two scenes that broke in review broke exactly here: phase read from the
    // clock and multiplied by a rate the slider changes, so moving the slider
    // snapped the lungs from full to empty and the muscle to an unrelated
    // length. A scene that never reads the clock cannot do that.
    assert.equal(
      distance(run(0), run(1000)),
      0,
      'the scene animates differently depending on the absolute time it is given — ' +
        'accumulate a phase (`phase += dt * rate`) instead of reading `elapsed`'
    );
  });

}

test('an organ that exposes a curve places the curve, not the mesh', async () => {
  // A tube placed by transforming its *mesh* leaves its curve behind, and
  // everything that reads the curve — particle paths, label anchors — then
  // describes a tube that is not where it is drawn. That is what put the
  // gastric contents outside the bowel, and it is invisible in a still frame
  // of a densely folded organ, where a displaced centre line still passes
  // close to some other loop.
  //
  // So the rule is structural: an organ builder that publishes a curve returns
  // its geometry unmoved, and moves the curve instead (`placeCurve`).
  const { buildSmallIntestine, buildColon, buildDuodenum } = await import(
    '../src/scenes/gastrointestinal/organs/intestine.js'
  );
  const { buildStomach, buildEsophagus } = await import('../src/scenes/gastrointestinal/organs/stomach.js');
  const { buildPancreas } = await import('../src/scenes/hepatobiliary/organs/pancreas.js');
  const { buildUreter } = await import('../src/scenes/renal/organs/kidney.js');

  const built = [
    ['small intestine', buildSmallIntestine({})],
    ['colon', buildColon({ offset: [0, 0, -0.35] })],
    ['duodenum', buildDuodenum({})],
    ['stomach', buildStomach({})],
    ['oesophagus', buildEsophagus({})],
    ['pancreas', buildPancreas({})],
    ['ureter', buildUreter([[0, 1, 0], [0.2, 0, 0], [0, -1, 0]], {})],
  ];

  for (const [name, organ] of built) {
    assert.ok(organ.curve, `${name} publishes a curve`);
    const identity = new Matrix4();
    organ.object.updateMatrix();
    assert.deepEqual(
      [...organ.object.matrix.elements],
      [...identity.elements],
      `${name}: its geometry has been moved but its curve has not — place the curve instead (placeCurve)`
    );
  }

  // And the placed curve really is where the geometry is: the colon's offset
  // reaches its curve and its anchors, not just its mesh.
  const colon = buildColon({ offset: [0, 0, -0.35] });
  assert.ok(Math.abs(colon.curve.getPointAt(0).z - 0) < 1e-9, 'the colon curve carries the offset');
  assert.ok(Math.abs(colon.anchors.ileocecal.z - 0.25) < 1e-9, 'and so do its anchors');
});
