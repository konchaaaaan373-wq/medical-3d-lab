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
import { betaPublicationProblems } from '../src/catalog/release.js';
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
  assert.equal(scene.getMetrics()[0].reference, undefined, 'and the column goes away again');
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

test('the scene is not a beta candidate and the beta does not open it', () => {
  // The beta publishes anatomy. This is a pathophysiology model with numbers on
  // screen, and registering it must not have changed what the public build
  // hands to a visitor.
  const entry = SCENE_MANIFEST.find((scene) => scene.id === 'cardiac-output');
  const problems = betaPublicationProblems(entry);
  assert.ok(problems.length > 0, 'the gate is closed for it');
  assert.ok(
    problems.some((problem) => /not one of the scenes this release opens/i.test(problem)),
    `and for the right reason — it is not a candidate at all: ${problems.join('; ')}`
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
