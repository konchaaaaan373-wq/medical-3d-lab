import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { ExperimentSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/experimentSession.js';
import {
  CONTROL_DOMAIN,
  CONTROL_IDS,
  PRESET_IDS,
  REFERENCE_GEOMETRY,
  presetInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import { myocardialVolumeFor } from '../src/models/cardiacMechanics.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import {
  BETA_ANATOMY_CANDIDATES,
  BETA_MECHANISM_CANDIDATES,
  BETA_PUBLICATION_DECISIONS,
  betaPublicationProblems,
  mechanismClaimProblems,
} from '../src/catalog/release.js';
import { MODEL_PROFILES } from '../src/catalog/modelProfiles.js';
import { CONTROLS, PRESET_OPTIONS } from '../src/data/cardiacOutput.js';

/**
 * The cardiac-output scene against the contract the App actually calls it with.
 *
 * Two kinds of thing are checked here and nowhere else. The first is that what
 * the panels read is the model's own solution and not a second calculation —
 * the read-out, the loop and the geometry all have to come from one solve. The
 * second is the set of failures that are invisible to both the model tests and
 * a passing build: a preset that leaves the other preset's slider positions
 * behind, a reset that moves the numbers and not the ventricle, and myocardium
 * that grows because somebody raised the filling.
 */

/** The scene reads `window` and `navigator` while deciding its mesh density. */
function withBrowserGlobals(run) {
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;
  globalThis.window = { innerWidth: 1280, innerHeight: 900 };
  if (previousNavigator === undefined) globalThis.navigator = { hardwareConcurrency: 8 };
  try {
    return run();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousNavigator === undefined) delete globalThis.navigator;
  }
}

const fakeViewer = () => ({
  onResize: () => () => {},
  camera: Object.assign(new THREE.PerspectiveCamera(50, 1.6, 0.1, 100), { aspect: 1.6 }),
  renderer: {
    getPixelRatio: () => 1,
    getSize: (v) => v.set(1280, 900),
    getDrawingBufferSize: (v) => v.set(1280, 900),
  },
});

async function buildScene() {
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  return withBrowserGlobals(() => {
    const scene = new CardiacOutputScene({ viewer: fakeViewer() });
    scene.build();
    return scene;
  });
}

// ---------------------------------------------------------------------------
// The session
// ---------------------------------------------------------------------------

test('a session starts on its preset and knows what it started from', () => {
  const session = new ExperimentSession();
  assert.equal(session.presetId, PRESET_IDS.REFERENCE);
  assert.deepEqual({ ...session.input }, presetInput(PRESET_IDS.REFERENCE));
  assert.equal(session.baseline, session.view, 'before and now are the same solve at the start');
  assert.equal(session.moved, false);
  assert.ok(session.view.metrics.cardiacOutputLMin > 0);
});

test('the snapshot a comparison is measured against does not follow the reader', () => {
  // The failure this is written against: a baseline held as a reference to the
  // live condition, so "before" silently becomes "now" and the comparison
  // shows nothing whatever the reader does.
  const session = new ExperimentSession();
  const baselineOutput = session.baseline.metrics.cardiacOutputLMin;
  session.setControl('systemicResistanceMmHgSPerMl', 1.7);
  assert.equal(session.baseline.metrics.cardiacOutputLMin, baselineOutput);
  assert.notEqual(session.view.metrics.cardiacOutputLMin, baselineOutput);
  assert.equal(session.moved, true);
});

test('reset goes back to the condition the preset started at, exactly', () => {
  const session = new ExperimentSession();
  const before = session.baseline;
  for (const id of CONTROL_IDS) session.setControl(id, CONTROL_DOMAIN[id].max);
  assert.notEqual(session.view.revision, before.revision);
  session.reset();
  assert.equal(session.view, before, 'the same solve, not a re-solve that might differ');
  assert.deepEqual({ ...session.input }, { ...before.input });
  assert.equal(session.moved, false);
});

test('switching preset leaves nothing of the other one behind', () => {
  // An input a reader cannot see is the one thing an experiment cannot have.
  const session = new ExperimentSession();
  session.setControl('fillingVolumeMl', 960);
  session.setControl('heartRatePerMin', 105);

  session.selectPreset(PRESET_IDS.REDUCED_CONTRACTILITY);
  assert.deepEqual({ ...session.input }, presetInput(PRESET_IDS.REDUCED_CONTRACTILITY));
  assert.equal(session.moved, false, 'and the new preset counts as unmoved');
  assert.equal(
    session.baseline.input.fillingVolumeMl,
    CONTROL_DOMAIN.fillingVolumeMl.default,
    'the new before-snapshot is the new preset, not the old condition'
  );

  session.selectPreset(PRESET_IDS.REFERENCE);
  assert.equal(session.input.heartRatePerMin, CONTROL_DOMAIN.heartRatePerMin.default);
});

test('a condition with no solution keeps the previous view and says it did', () => {
  const session = new ExperimentSession();
  const before = session.view;
  // Out of the verified domain: the boundary refuses it, so there is nothing
  // to show. Not reachable from a slider — the sliders are bounded by the same
  // domain — which is why it is reached here directly.
  session.setInput({ heartRatePerMin: CONTROL_DOMAIN.heartRatePerMin.max + 60 });
  assert.equal(session.view, before, 'the last good beat is still on screen');
  assert.equal(session.applied, false, 'and the session says the change was not applied');
  assert.ok(session.problems.join(' ').includes('heartRatePerMin'));

  session.setInput({ heartRatePerMin: 80 });
  assert.equal(session.applied, true);
  assert.equal(session.view.metrics.heartRatePerMin, 80);
});

test('the same condition reached twice is the same object, and A→B→A comes home', () => {
  const session = new ExperimentSession();
  const a = session.view;
  session.setControl('contractilityEesMmHgPerMl', 1.4);
  const b = session.view;
  session.setControl('contractilityEesMmHgPerMl', CONTROL_DOMAIN.contractilityEesMmHgPerMl.default);
  assert.equal(session.view, a, 'the cache returned the identical view for the identical input');
  assert.notEqual(b, a);
  // Every input is in the key, so no two conditions can share an answer.
  const seen = new Set();
  for (const id of CONTROL_IDS) {
    session.reset();
    session.setControl(id, CONTROL_DOMAIN[id].max);
    seen.add(session.view.revision);
  }
  assert.equal(seen.size, CONTROL_IDS.length, 'four different conditions, four different solves');
});

// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------

test('the class carries every static the shell reads off it', async () => {
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  assert.ok(CardiacOutputScene.cameraPose?.position);
  assert.ok(CardiacOutputScene.cameraPose?.target);
  const meta = CardiacOutputScene.meta;
  assert.equal(meta.id, 'cardiac-output');
  assert.equal(meta.progression.enabled, false, 'there is no progression axis to slide along');
  assert.equal(meta.stages.length, 1);
  for (const key of [
    'title', 'titleJa', 'subtitle', 'subtitleJa',
    'legend', 'palette', 'modelControls', 'modelScope', 'comparison',
    'pressureVolume', 'pressureWave',
    'disclaimer', 'disclaimerJa', 'disclaimerShort', 'disclaimerShortJa',
  ]) {
    assert.ok(meta[key], `meta.${key} is present`);
  }
  // Read as before-and-after: a camera that turns on its own shows the second
  // look from a different side than the first, and a change in the ventricle
  // cannot be told from a change in the angle.
  assert.equal(CardiacOutputScene.allowAutoRotate, false, 'the camera holds still between conditions');
  assert.equal(meta.layout, 'experiment', 'the shell lays it out as an experiment, not a dashboard');
  const entry = SCENE_MANIFEST.find((scene) => scene.id === 'cardiac-output');
  assert.ok(entry, 'and the scene is registered');
  assert.equal(entry.status, 'alpha');
  assert.equal(entry.modelCard, 'docs/model-cards/cardiac-output.md');
});

test('the preset comes first in the controls, because restoring replays them in order', async () => {
  // `sessionState.js` replays `getModelControls()` in the order it was given,
  // and selecting a preset resets the four sliders. Restored last, the preset
  // would wipe the values being restored — a reader coming back from the reel
  // would find their condition gone. Ordering is the whole guard.
  const scene = await buildScene();
  const controls = scene.getModelControls();
  assert.equal(controls[0].id, 'preset', 'the preset resets everything, so it lands first');
  assert.equal(controls[1].id, 'intervention', 'the intervention is computed from the preset, so it lands next');
  // And the sliders last, which is right: a slider position is a manual
  // condition and clears any intervention anyway, so it has to win.
  assert.deepEqual(controls.slice(2).map((c) => c.id), CONTROLS.map((c) => c.id));
  assert.deepEqual(controls.slice(2).map((c) => c.id).sort(), [...CONTROL_IDS].sort());

  // And replaying a captured snapshot in that order really does restore it.
  scene.setModelControl('preset', PRESET_IDS.REDUCED_CONTRACTILITY);
  scene.setModelControl('fillingVolumeMl', 900);
  scene.setModelControl('heartRatePerMin', 96);
  const captured = scene.getModelControls().map(({ id, value }) => ({ id, value }));

  scene.setModelControl('preset', PRESET_IDS.REFERENCE);
  for (const { id, value } of captured) scene.setModelControl(id, value);
  assert.equal(scene.session.presetId, PRESET_IDS.REDUCED_CONTRACTILITY);
  assert.equal(scene.session.input.fillingVolumeMl, 900);
  assert.equal(scene.session.input.heartRatePerMin, 96);
});

test('coming back from the sequence keeps the intervention that was selected', async () => {
  // `restoreSessionState` puts a reader back by replaying every control at its
  // captured value. With an intervention selected, those values *are* the
  // intervention's — so a replay that counted as four manual moves handed back
  // the right numbers with the chip silently reading "none": the sliders
  // holding a drug's condition under a label saying nothing was applied, which
  // is a state nobody could reach by hand.
  //
  // Setting a control to the value it already has is not moving it.
  const { captureSessionState, restoreSessionState } = await import('../src/app/sessionState.js');
  const scene = await buildScene();
  const viewer = {
    camera: new THREE.PerspectiveCamera(50, 1.6, 0.1, 100),
    controls: { target: new THREE.Vector3(), autoRotate: false, enabled: true, update() {} },
  };
  const playback = {
    value: 0,
    playing: false,
    play() { this.playing = true; },
    pause() { this.playing = false; },
    set(v) { this.value = v; },
  };

  scene.setModelControl('intervention', 'dobutamine');
  const wanted = { ...scene.session.input };
  const snapshot = captureSessionState({ playback, viewer, scene, comparing: false });

  // What the sequence does on the way in, and the app on the way out.
  scene.resetModelControls();
  scene.setModelControl('systemicResistanceMmHgSPerMl', 1.6);
  restoreSessionState(snapshot, { playback, viewer, scene, setComparison: (v) => scene.setComparison(v) });

  assert.deepEqual({ ...scene.session.input }, wanted, 'the condition comes back');
  assert.equal(scene.session.interventionId, 'dobutamine', 'and so does what it was called');
  assert.equal(
    scene.getModelControls().find((c) => c.id === 'intervention').value,
    'dobutamine',
    'which is what the reader sees selected'
  );
});

test('every control offered is one the model declares, at the model’s own range', async () => {
  const scene = await buildScene();
  for (const control of scene.getModelControls().slice(2)) {
    const domain = CONTROL_DOMAIN[control.id];
    assert.ok(domain, `${control.id} is a model input`);
    assert.equal(control.min, domain.min);
    assert.equal(control.max, domain.max);
    assert.equal(control.step, domain.step);
    // Nothing a slider can produce is outside the verified domain, which is why
    // the unsolved notice should never be reachable from the UI.
    for (const value of [domain.min, domain.max]) {
      scene.setModelControl(control.id, value);
      assert.equal(scene.session.applied, true, `${control.id} at ${value} solves`);
    }
    scene.resetModelControls();
  }
  const presetControl = scene.getModelControls()[0];
  assert.deepEqual(presetControl.options.map((o) => o.value), PRESET_OPTIONS.map((o) => o.value));
});

test('the read-out is the solved beat, digit for digit, with nothing scaled afterwards', async () => {
  const scene = await buildScene();
  for (const overrides of [{}, { systemicResistanceMmHgSPerMl: 1.6 }, { heartRatePerMin: 100 }]) {
    scene.resetModelControls();
    for (const [id, value] of Object.entries(overrides)) scene.setModelControl(id, value);
    const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
    const truth = solveCardiacOutput({ ...scene.session.input });
    assert.equal(rows.co.value, truth.metrics.cardiacOutputLMin.toFixed(1));
    assert.equal(rows.sv.value, Math.round(truth.metrics.strokeVolumeMl));
    assert.equal(rows.map.value, Math.round(truth.metrics.meanArterialPressureMmHg));
    assert.equal(rows.edv.value, Math.round(truth.metrics.edvMl));
    assert.equal(rows.esv.value, Math.round(truth.metrics.esvMl));
    assert.equal(rows.lvedp.value, Math.round(truth.metrics.endDiastolicPressureMmHg));
    assert.equal(rows.svr.value, Math.round(truth.metrics.systemicResistanceDynSCm5));
    assert.equal(rows.unsolved, undefined, 'and no “previous condition” notice while it is solving');
  }
});

test('the read-out never reports a central venous pressure', async () => {
  // There is no right atrium in this model. The systemic venous reservoir has
  // a mean pressure; calling it a CVP would be the single most misleading
  // relabelling available here.
  const scene = await buildScene();
  const labels = scene.getMetrics().map((row) => `${row.label} ${row.labelJa}`).join(' ');
  assert.ok(!/central venous|CVP|中心静脈/i.test(labels), labels);
});

test('an unsolved condition is announced rather than shown as the current one', async () => {
  const scene = await buildScene();
  scene.session.setInput({ heartRatePerMin: CONTROL_DOMAIN.heartRatePerMin.max + 60 });
  const rows = scene.getMetrics();
  assert.equal(rows[0].id, 'unsolved', 'and it is the first thing on the panel');
  assert.ok(rows[0].valueJa, 'in both languages, because it is words rather than a number');
});

test('the loop, the waveform and the ventricle all read one solved beat', async () => {
  const scene = await buildScene();
  scene.setModelControl('contractilityEesMmHgPerMl', 1.3);
  const view = scene.session.view;
  const pv = scene.getPressureVolume();
  assert.equal(pv.current, view.curves, 'the plot is the view’s own curves');
  assert.equal(pv.current.waveform.ejection.from, view.metrics.ejectionStartPhase);
  // The 3D reads the same cycle: the cavity at end-diastole is the EDV in the
  // read-out, so the picture and the number cannot disagree.
  scene.setCardiacPhase(view.metrics.endDiastolePhase);
  scene.update(0, 0);
  assert.ok(
    Math.abs(scene.shape.cavityRadius ** 3 * (4 / 3) * Math.PI * REFERENCE_GEOMETRY.longToShortAxisRatio - view.metrics.edvMl) < 0.5,
    'the drawn cavity at end-diastole holds the solved end-diastolic volume'
  );
  assert.equal(pv.beat.id, scene.getBeatPhase().id);
});

test('an acute manipulation does not grow myocardium', async () => {
  // The heart-failure scene recomputes muscle volume whenever its state moves,
  // and is right to: there, the state moving means the disease progressed.
  // Here it means a slider moved. Recomputing from the new end-diastolic
  // volume would grow muscle out of a fluid shift.
  const scene = await buildScene();
  const fixed = scene.myocardialVolumeMl;
  const reference = myocardialVolumeFor({
    edvMl: scene.session.baseline.metrics.edvMl,
    wallMm: REFERENCE_GEOMETRY.wallMm,
    longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
  });
  assert.ok(Math.abs(fixed - reference) < 1e-9, 'it is the reference condition’s, computed once');

  const wallsAtEndDiastole = [];
  for (const [id, value] of [
    ['fillingVolumeMl', CONTROL_DOMAIN.fillingVolumeMl.max],
    ['contractilityEesMmHgPerMl', CONTROL_DOMAIN.contractilityEesMmHgPerMl.min],
    ['systemicResistanceMmHgSPerMl', CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.max],
    ['heartRatePerMin', CONTROL_DOMAIN.heartRatePerMin.max],
  ]) {
    scene.setModelControl(id, value);
    assert.equal(scene.myocardialVolumeMl, fixed, `${id} did not change the muscle`);
    scene.setCardiacPhase(scene.state.endDiastolePhase);
    scene.update(0, 0);
    wallsAtEndDiastole.push(scene.shape.wallThickness);
  }
  scene.setModelControl('preset', PRESET_IDS.REDUCED_CONTRACTILITY);
  assert.equal(scene.myocardialVolumeMl, fixed, 'and neither did the preset');

  // What must still move is wall thickness within a beat: the same muscle
  // around a smaller cavity is a thicker wall, and that is incompressibility
  // rather than growth.
  scene.resetModelControls();
  scene.setCardiacPhase(scene.state.endDiastolePhase);
  scene.update(0, 0);
  const diastolicWall = scene.shape.wallThickness;
  scene.setCardiacPhase(scene.state.endSystolePhase);
  scene.update(0, 0);
  assert.ok(scene.shape.wallThickness > diastolicWall, 'the wall thickens through systole');
  // A ventricle filled to its maximum has a thinner wall than one at rest,
  // from the same fixed muscle — the geometric consequence, not a new volume.
  assert.ok(Math.max(...wallsAtEndDiastole) > 0);
});

test('comparison is against this preset’s own before-condition, from the same model', async () => {
  const scene = await buildScene();
  scene.setModelControl('systemicResistanceMmHgSPerMl', 1.7);
  scene.setComparison(true);
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
  const baseline = solveCardiacOutput(presetInput(PRESET_IDS.REFERENCE));
  assert.equal(rows.co.reference, baseline.metrics.cardiacOutputLMin.toFixed(1));
  assert.equal(rows.map.reference, Math.round(baseline.metrics.meanArterialPressureMmHg));
  assert.ok(Number(rows.map.value) > Number(rows.map.reference), 'pressure up');
  assert.ok(Number(rows.co.value) < Number(rows.co.reference), 'output down');
  // The reference heart is drawn from the baseline solve, not from a separately
  // tuned "normal-looking" ventricle.
  assert.equal(scene.reference.metrics, scene.session.baseline.metrics);

  // And it is actually drawable. `BloodField` takes particle *buffers*; handed
  // a geometry instead it builds attributes wrapping `undefined`, which throws
  // nothing here and draws nothing in a browser — the comparison came up as one
  // heart with the metrics panel insisting there were two, and this file passed.
  // So the attributes are inspected rather than the constructor merely survived.
  for (const field of [scene.blood, scene.reference.blood]) {
    for (const name of ['position', 'aExit', 'aEntry', 'aRank']) {
      const attribute = field.geometry.getAttribute(name);
      assert.ok(attribute, `the blood field has a ${name} attribute`);
      assert.ok(attribute.array?.length > 0, `and ${name} has values in it`);
      assert.ok(Number.isFinite(attribute.array[0]), `and ${name} is finite`);
    }
  }
  assert.ok(scene.reference.position.x !== 0, 'and the two hearts are drawn apart');
  assert.equal(scene.getPressureVolume().reference, scene.session.baseline.curves);

  scene.setComparison(false);
  // Without the second heart the moved condition still carries its "before"
  // and its signed change, from the same baseline — the reader should not have
  // to remember what the number was.
  const off = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
  assert.equal(off.co.reference, rows.co.reference, 'the before value stays while the condition is moved');
  assert.equal(
    off.co.delta,
    (() => {
      const d = Math.round((Number(off.co.value) - Number(off.co.reference)) * 10) / 10;
      return d > 0 ? `+${d.toFixed(1)}` : d < 0 ? `\u2212${Math.abs(d).toFixed(1)}` : '±0';
    })(),
    'and the change is the difference of the two figures on the row, at their precision'
  );
  assert.equal(off.co.deltaSign, 'down');
  assert.equal(off.map.deltaSign, 'up');

  scene.resetModelControls();
  const back = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
  assert.equal(back.co.reference, undefined, 'and with nothing changed the column goes away again');
  assert.equal(back.co.delta, undefined);
});

test('the heart being compared against follows the baseline, not the button', async () => {
  // Found by review, not by a test, and it is the failure this scene exists to
  // make impossible: the read-out and the picture disagreeing about the same
  // condition.
  //
  // The comparison heart used to be refreshed only in `setComparison`, which
  // runs when the *button* is pressed. The baseline moves when a *control* is
  // pressed — selecting a preset takes a new "before" snapshot, and so does
  // choosing an intervention that belongs to the other preset. Switching preset
  // while comparing therefore left the "before" column on the new baseline and
  // the heart drawn beside it on the old one. Nothing threw.
  const scene = await buildScene();
  scene.setComparison(true);
  assert.equal(scene.reference.metrics, scene.session.baseline.metrics);

  scene.setModelControl('preset', PRESET_IDS.REDUCED_CONTRACTILITY);
  assert.equal(
    scene.reference.metrics,
    scene.session.baseline.metrics,
    'the drawn heart is the baseline the numbers are measured against'
  );
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
  assert.equal(Number(rows.edv.reference), Math.round(scene.reference.metrics.edvMl));

  // And the same through the door an intervention opens, which switches the
  // preset underneath the reader.
  scene.setModelControl('preset', PRESET_IDS.REFERENCE);
  scene.setModelControl('intervention', 'dobutamine');
  assert.equal(scene.session.presetId, PRESET_IDS.REDUCED_CONTRACTILITY);
  assert.equal(scene.reference.metrics, scene.session.baseline.metrics);
  const after = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
  assert.equal(after.co.reference, scene.reference.metrics.cardiacOutputLMin.toFixed(1));

  // Reset does not move the baseline, so nothing should change hands there.
  scene.resetModelControls();
  assert.equal(scene.reference.metrics, scene.session.baseline.metrics);
});

test('the circuit shows a change in output once, not twice', async () => {
  // Raising particle count and speed together would exaggerate a change in
  // cardiac output by showing it in two channels at once. Count is fixed.
  const scene = await buildScene();
  const low = scene.circuit.presentationState();
  scene.setModelControl('contractilityEesMmHgPerMl', CONTROL_DOMAIN.contractilityEesMmHgPerMl.max);
  const high = scene.circuit.presentationState();
  assert.equal(low.particleCount, high.particleCount, 'the count never moves');
  assert.ok(high.particleSpeed > low.particleSpeed, 'rate rides on speed alone');

  // And the calibre cue follows resistance only — it is arteriolar tone, not a
  // diameter and not a response to flow.
  const beforeCalibre = scene.circuit.presentationState().calibre;
  scene.setModelControl('systemicResistanceMmHgSPerMl', CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.max);
  assert.ok(scene.circuit.presentationState().calibre < beforeCalibre);
});

test('playback speed is presentation, and does not touch the rate the model solved', async () => {
  const scene = await buildScene();
  const before = scene.state.heartRatePerMin;
  scene.setCardiacPhaseDriven(true);
  scene.setCardiacPhase(0.4);
  scene.update(1 / 30, 3.2);
  assert.equal(scene.getCardiacPhase(), 0.4, 'a driven phase is not advanced');
  assert.equal(scene.state.heartRatePerMin, before, 'and the rate is untouched');
  scene.setCardiacPhaseDriven(false);
  scene.update(0.1, 3.3);
  assert.ok(scene.getCardiacPhase() !== 0.4);
  assert.equal(scene.state.heartRatePerMin, before);
});

test('every annotation hangs off an anchor the scene actually has', async () => {
  const scene = await buildScene();
  for (const annotation of scene.getAnnotations()) {
    assert.ok(annotation.position instanceof THREE.Vector3, `${annotation.id} has a position`);
    assert.ok(Number.isFinite(annotation.position.x), `${annotation.id} is finite`);
    // `text` is the English name and `sub` is the Japanese one — the layer's
    // contract, not a subtitle. Written the other way the model wore four lines
    // of English on a Japanese interface and nothing failed.
    assert.ok(annotation.text, `${annotation.id} has an English name`);
    assert.ok(annotation.sub, `${annotation.id} has a Japanese name`);
    assert.ok(!/[.!?]$/.test(annotation.sub), `${annotation.id}: a label is a name, not a sentence`);
    assert.ok(/[\u3040-\u30ff\u4e00-\u9faf]/.test(annotation.sub), `${annotation.id}: the Japanese line is Japanese`);
  }
});

test('nothing in the scene produces a NaN across the whole domain and the whole beat', async () => {
  const scene = await buildScene();
  for (const id of CONTROL_IDS) {
    for (const value of [CONTROL_DOMAIN[id].min, CONTROL_DOMAIN[id].max]) {
      scene.resetModelControls();
      scene.setModelControl(id, value);
      for (let i = 0; i <= 12; i++) {
        scene.setCardiacPhase(i / 12);
        scene.update(0, i / 12);
        for (const key of ['cavityRadius', 'outerRadius', 'wallThickness', 'cavitySemiLength']) {
          assert.ok(Number.isFinite(scene.shape[key]), `${id}=${value} phase ${i}: ${key}`);
        }
        assert.ok(Number.isFinite(scene.ventricle.position.y));
      }
    }
  }
});

test('the beta opens this scene, and on the record it was decided with', () => {
  // This test used to assert the opposite, and was right to: the beta
  // published anatomy, this is a mechanism model with numbers on screen, and
  // registering it changed nothing about the public build. On 2026-09-22 the
  // repository owner decided to publish it and to stop the beta being
  // anatomy-only — see `docs/architecture/adr-2026-09-22-mechanism-scene-in-beta.md`.
  //
  // What is asserted now is the thing that decision did **not** include: that
  // it opened because the gate was satisfied, not because the gate was
  // removed. Each line below is a condition that would close it again.
  const entry = SCENE_MANIFEST.find((scene) => scene.id === 'cardiac-output');
  assert.deepEqual(betaPublicationProblems(entry), []);
  assert.ok(BETA_MECHANISM_CANDIDATES.includes('cardiac-output'), 'named, one at a time');
  assert.ok(!BETA_ANATOMY_CANDIDATES.includes('cardiac-output'), 'and not by being called anatomy');

  const decision = BETA_PUBLICATION_DECISIONS.find((row) => row.sceneId === 'cardiac-output');
  assert.ok(decision, 'a publication decision is on file');
  assert.equal(decision.decidedBy.role, 'engineering', 'not a clinical sign-off, and it does not claim to be');
  assert.match(decision.record, /^docs\/beta-publication\//);
  assert.ok(
    decision.unverified.some((line) => /no clinical review/.test(line)),
    'the record states, in its own words, that no clinician has read the model'
  );

  // The rule the widening did not touch: a mechanism addressed to a patient
  // still needs a current clinical review, and this scene is not addressed to
  // one. Declare `patient-explanation` and the gate closes again.
  const profile = MODEL_PROFILES.find((row) => row.profileId === entry.modelProfile);
  assert.ok(!profile.intendedUses.includes('patient-explanation'));
  assert.deepEqual(
    mechanismClaimProblems({ ...entry, patient: true }),
    [
      'its clinical review is "pending", and it explains a mechanism to a patient, ' +
        'which a scene cannot do on a review that is not current',
    ],
    'a patient view on this scene would close the gate until a clinician had read it'
  );
});

test('a scene with plots is offered Data view even when its controls are primary', async () => {
  // The rule that decides whether the Data button exists, and with it whether
  // the pressure-volume loop and the waveform can be reached at all. It used to
  // ask about the controls; `cardiac-output` has primary controls *and* two
  // plots, so both panels were built, mounted, updated every frame and
  // unreachable. Nothing threw. There was just no loop.
  const { hasDataOnlySurface } = await import('../src/app/dataView.js');
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  const meta = CardiacOutputScene.meta;
  assert.equal(meta.modelControls.primary, true, 'the controls stay in front of the reader');
  assert.equal(
    hasDataOnlySurface({ getMetrics: () => [], getPressureVolume: () => ({}) }, meta),
    true,
    'and the plots are still reachable'
  );

  // The case the old rule was written for is unchanged: a tactile scene with
  // three read-outs and nothing else gets no button, because Data view would
  // show exactly what is already on screen.
  assert.equal(
    hasDataOnlySurface({ getMetrics: () => [] }, { modelControls: { primary: true } }),
    false
  );
  // And a scene with a read-out and ordinary controls still gets one.
  assert.equal(hasDataOnlySurface({ getMetrics: () => [] }, {}), true);
  assert.equal(hasDataOnlySurface({ getMetrics: () => [] }, { charts: [] }), true);
  assert.equal(hasDataOnlySurface(null, {}), false);
  assert.equal(hasDataOnlySurface({}, { modelControls: { primary: true } }), false);
});

// ---------------------------------------------------------------------------
// Combinations
//
// Both defects this file's earlier tests missed were "A and B at the same
// time": comparing *and* switching preset, restoring *and* holding an
// intervention. Each test above moves one thing. So the invariants that must
// hold whatever the reader has done are swept over the product of the modes
// instead of being asserted once per path — a new mode joins the sweep by
// being listed, rather than by somebody remembering to pair it with every
// other one.
// ---------------------------------------------------------------------------

/** Every state a reader can put the scene into with the controls it has. */
function* everyCombination() {
  for (const comparing of [false, true]) {
    for (const preset of [PRESET_IDS.REFERENCE, PRESET_IDS.REDUCED_CONTRACTILITY]) {
      for (const intervention of ['none', 'volume-loading', 'dobutamine']) {
        for (const moved of [null, ['fillingVolumeMl', 880], ['heartRatePerMin', 96]]) {
          yield { comparing, preset, intervention, moved };
        }
      }
    }
  }
}

const describeState = (s) =>
  `comparing=${s.comparing} preset=${s.preset} intervention=${s.intervention} moved=${s.moved ? s.moved.join('=') : 'no'}`;

/** Drives the scene into a state the way a reader would: through the controls. */
function drive(scene, state) {
  scene.setComparison(state.comparing);
  scene.setModelControl('preset', state.preset);
  scene.setModelControl('intervention', state.intervention);
  if (state.moved) scene.setModelControl(state.moved[0], state.moved[1]);
}

test('whatever the reader has done, every panel is reading one solved beat', async () => {
  const scene = await buildScene();
  let checked = 0;

  for (const state of everyCombination()) {
    drive(scene, state);
    const where = describeState(state);
    checked += 1;

    // The condition on screen solves, and the read-out is that solve — not a
    // number left over from the condition before it.
    assert.equal(scene.session.applied, true, `${where}: the condition did not apply`);
    const truth = solveCardiacOutput({ ...scene.session.input });
    assert.equal(truth.status, 'valid', `${where}: a reachable state does not solve`);
    const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
    assert.equal(rows.unsolved, undefined, `${where}: an unsolved notice on a reachable state`);
    assert.equal(rows.co.value, truth.metrics.cardiacOutputLMin.toFixed(1), `${where}: CO`);
    assert.equal(rows.map.value, Math.round(truth.metrics.meanArterialPressureMmHg), `${where}: MAP`);
    assert.equal(rows.edv.value, Math.round(truth.metrics.edvMl), `${where}: EDV`);

    // The plots are that same solve, by identity rather than by value.
    const pv = scene.getPressureVolume();
    assert.equal(pv.current, scene.session.view.curves, `${where}: the loop is a different beat`);

    // Muscle is never grown by anything a reader can press.
    assert.equal(scene.myocardialVolumeMl, scene.reference?.myocardialVolumeMl ?? scene.myocardialVolumeMl,
      `${where}: the two hearts were given different muscle`);

    // And the comparison — the pair that both earlier defects lived in.
    if (state.comparing) {
      assert.equal(
        scene.reference.metrics,
        scene.session.baseline.metrics,
        `${where}: the drawn "before" heart is not the baseline the numbers cite`
      );
      assert.equal(pv.reference, scene.session.baseline.curves, `${where}: the reference loop is stale`);
      assert.equal(
        Number(rows.edv.reference),
        Math.round(scene.reference.metrics.edvMl),
        `${where}: the "before" column and the "before" heart disagree`
      );
    } else {
      // Without the second heart, the read-out still says where the numbers
      // started — whenever they have moved from it — because that is the
      // comparison a reader makes after pressing anything. It is the same
      // baseline the comparison uses, so the two cannot disagree; and with
      // nothing moved there is no column, because "3.7 → 3.7" is not one.
      const moved = CONTROL_IDS.some((id) => scene.session.view.input[id] !== scene.session.baseline.input[id]);
      if (moved) {
        assert.equal(
          Number(rows.edv.reference),
          Math.round(scene.session.baseline.metrics.edvMl),
          `${where}: the "before" column is not this condition's starting point`
        );
        assert.match(rows.co.delta, /^(\+|\u2212|±)\d/, `${where}: a moved condition without its change`);
      } else {
        assert.equal(rows.edv.reference, undefined, `${where}: a comparison column with nothing to compare`);
        assert.equal(rows.co.delta, undefined, `${where}: a change with nothing changed`);
      }
      assert.equal(pv.reference, null, `${where}: a reference loop with nothing to compare`);
    }
  }
  assert.equal(checked, 36, 'the whole product was walked');
});

test('the first row says what was done, in the reader\'s words: which inputs, which way, what was held', async () => {
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  // D-12 of the external review. Two hearts side by side show that something
  // differs; they do not show *which* of the four it was, and "I changed one
  // thing" is the claim the whole scene rests on.
  //
  // The row used to say it in the model's vocabulary — 「2 つ: 抵抗・収縮力（他 2
  // 固定）」 — which counted inputs instead of saying what happened to them. It
  // now names each moved input with its direction, and the held ones while
  // there are few enough to name. What it guarantees is unchanged.
  const session = new ExperimentSession();
  const scene = { session, comparing: false, state: session.view.metrics };

  const rowsFor = (comparing) => {
    scene.comparing = comparing;
    scene.state = session.view.metrics;
    return CardiacOutputScene.prototype.getMetrics.call(scene);
  };

  // Emitted whether or not the second heart is drawn, and first: the figures
  // under it are read against it.
  const off = rowsFor(false).find((row) => row.id === 'changed');
  assert.ok(off, 'the row is there without the comparison');
  assert.match(off.valueJa, /^なし/);
  assert.equal(rowsFor(false)[0].id, 'changed', 'and it leads the panel');
  assert.match(rowsFor(true).find((row) => row.id === 'changed').valueJa, /^なし/);

  // One slider: named, with its direction, both values and the number held.
  session.setControl('systemicResistanceMmHgSPerMl', 1.6);
  const one = rowsFor(false).find((row) => row.id === 'changed');
  assert.equal(one.labelJa, '手動で変更');
  assert.equal(one.valueJa, '血管抵抗 ↑ 1.1 → 1.6（他 3 つは固定）', 'one moved control is spelled out, with the rest counted');
  assert.equal(one.unit, '', 'the unit slot renders one language only, so nothing bilingual goes in it');

  // Two sliders: both named with their directions, so a multi-input condition
  // never reads as a one-factor comparison.
  session.setControl('heartRatePerMin', 90);
  const two = rowsFor(false).find((row) => row.id === 'changed');
  assert.equal(two.valueJa, '血管抵抗 ↑・心拍数 ↑（収縮力・充満量は固定）', 'two moved, two held, all four named');
  assert.equal(two.value, 'Resistance ↑ · Rate ↑ (Contractility, Filling held)');

  // The drug is a multi-input change by construction, and is reported as one:
  // its full name (the long name is where its caveat lives), both moved inputs
  // with their directions, the primary action first — and the rate named as
  // held, because that is the assumption most easily taken for a fact about
  // the drug.
  session.selectPreset(PRESET_IDS.REDUCED_CONTRACTILITY);
  session.selectIntervention('dobutamine');
  const drug = rowsFor(false).find((row) => row.id === 'changed');
  assert.equal(drug.labelJa, 'ドブタミン作用の模式例（心拍数は固定）');
  assert.equal(drug.valueJa, '収縮力 ↑・血管抵抗 ↓（充満量・心拍数は固定）');
  assert.doesNotMatch(drug.valueJa, /\d/, 'an intervention is described, not quoted in model units');

  // And the filling step names its caveat through its label, not a volume.
  session.selectIntervention('volume-loading');
  const volume = rowsFor(false).find((row) => row.id === 'changed');
  assert.match(volume.labelJa, /モデル入力/);
  assert.equal(volume.valueJa, '充満量 ↑（他 3 つは固定）');
});

test('a refused condition never leaves the previous answer standing as the current one', async () => {
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  // 6.5 of the external review. Every reachable slider position is inside the
  // verified domain, so this is the path that "should never" run — which is
  // exactly why it is exercised rather than assumed.
  const session = new ExperimentSession();
  const solved = session.view.metrics;
  assert.ok(solved, 'the opening condition solves');

  session.setInput({ ...session.input, heartRatePerMin: 400 });
  assert.equal(session.applied, false, 'the requested condition was refused');
  assert.ok(session.problems.length > 0, 'and the session says why');

  // The design is not to blank the screen: the previous beat stays drawn, and
  // the panel says in its first row that this is what a reader is looking at.
  // What must never happen is the previous numbers standing unlabelled as the
  // current ones.
  const scene = { session, comparing: false, state: session.view.metrics };
  const rows = CardiacOutputScene.prototype.getMetrics.call(scene);
  const notice = rows[0];
  assert.equal(notice.id, 'unsolved', 'the notice leads the panel');
  assert.match(notice.labelJa, /1 つ前の条件/);
  assert.match(notice.valueJa, /反映されていません/);
  assert.equal(notice.emphasis, true);

  // And the comparison describes the condition the figures came from, not the
  // one that was asked for and refused.
  scene.comparing = true;
  const changed = CardiacOutputScene.prototype.getMetrics.call(scene).find((row) => row.id === 'changed');
  assert.doesNotMatch(changed.valueJa, /400|心拍数 ↑/, 'a refused request is not reported as a change that happened');

  // Solving again clears it rather than leaving the notice stuck.
  session.setInput({ ...session.baseline.input });
  assert.equal(session.applied, true);
  const after = CardiacOutputScene.prototype.getMetrics.call({ session, comparing: false, state: session.view.metrics });
  assert.ok(!after.some((row) => row.id === 'unsolved'));
  assert.equal(after.find((row) => row.id === 'co').value, Number(solved.cardiacOutputLMin.toFixed(1)).toFixed(1));
});

test('every one of those states survives being captured and restored', async () => {
  // The second defect was here: the medical state came back and the mode did
  // not. Round-tripping every combination is what makes that a property rather
  // than a case somebody thought of.
  const { captureSessionState, restoreSessionState } = await import('../src/app/sessionState.js');
  const scene = await buildScene();
  const viewer = {
    camera: new THREE.PerspectiveCamera(50, 1.6, 0.1, 100),
    controls: { target: new THREE.Vector3(), autoRotate: false, enabled: true, update() {} },
  };
  const playback = {
    value: 0,
    playing: false,
    play() { this.playing = true; },
    pause() { this.playing = false; },
    set(v) { this.value = v; },
  };

  for (const state of everyCombination()) {
    drive(scene, state);
    const where = describeState(state);
    const wanted = { ...scene.session.input };
    const wantedPreset = scene.session.presetId;
    const wantedIntervention = scene.session.interventionId;
    const snapshot = captureSessionState({ playback, viewer, scene, comparing: state.comparing });

    // Somewhere else entirely, the way the sequence and a lesson both leave it.
    scene.resetModelControls();
    scene.setModelControl('preset', PRESET_IDS.REFERENCE);
    scene.setModelControl('systemicResistanceMmHgSPerMl', 1.55);

    restoreSessionState(snapshot, { playback, viewer, scene, setComparison: (v) => scene.setComparison(v) });

    assert.deepEqual({ ...scene.session.input }, wanted, `${where}: the condition did not come back`);
    assert.equal(scene.session.presetId, wantedPreset, `${where}: the preset did not come back`);
    assert.equal(
      scene.session.interventionId,
      wantedIntervention,
      `${where}: the condition came back but not what it was called`
    );
    if (state.comparing) {
      assert.equal(scene.reference.metrics, scene.session.baseline.metrics, `${where}: stale after restore`);
    }
  }
});
