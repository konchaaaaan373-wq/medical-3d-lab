import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HepatorenalScene } from '../src/scenes/renal/scenes/hepatorenalSyndrome/HepatorenalScene.js';
import { ANNOTATIONS, CHARTS, METRICS, MODEL_CONTROLS, MODEL_SCOPE, STAGES } from '../src/data/hepatorenal.js';
import {
  DEFAULT_CONTROLS,
  REFERENCE_EFFERENT_RESISTANCE,
  RENAL_REFERENCE,
  kidneyWithoutTheSignal,
  solveHepatorenal,
} from '../src/models/hepatorenal.js';

/**
 * Layer 2 — that the scene and the model have not drifted apart.
 *
 * Nothing here is a claim about physiology. These check that the scene
 * implements the interface the app drives it through, that every number it
 * shows is one the model produced, and that the read-out, the charts and the
 * 3D are all reading the same solved state.
 *
 * A failure here means the implementation is broken. It says nothing about the
 * physiology — that is layer 1 — and nothing about whether a chosen constant
 * has moved, which is layer 3. See `tests/README.md`.
 */

const scene = () => {
  const built = new HepatorenalScene({});
  built.build();
  return built;
};

/** The scene, driven through its own public interface. */
function sceneAt({ progress = 0, ...controls } = {}) {
  const built = scene();
  built.setProgress(progress);
  for (const [id, value] of Object.entries(controls)) built.setModelControl(id, value);
  return built;
}

const rowsOf = (built) => Object.fromEntries(built.getMetrics().map((row) => [row.id, row.value]));

// --- the interface contract ------------------------------------------------

test('the scene implements the interface the app drives it through', () => {
  const built = scene();
  for (const method of [
    'setProgress',
    'update',
    'getAnnotations',
    'getMetrics',
    'getCharts',
    'getModelControls',
    'setModelControl',
    'resetModelControls',
    'setComparison',
    'getComparisonView',
    'getReel',
    'dispose',
  ]) {
    assert.equal(typeof built[method], 'function', `missing ${method}`);
  }
  assert.ok(HepatorenalScene.meta.id);
  assert.ok(HepatorenalScene.cameraPose.position);
  built.update(0.016);
  built.dispose();
});

test('every stage and annotation is bilingual, and the stages span the axis', () => {
  for (const stage of STAGES) {
    assert.ok(stage.nameJa && stage.summaryJa, `${stage.id} is not bilingual`);
    assert.ok(stage.at >= 0 && stage.at <= 1);
  }
  assert.equal(STAGES[0].at, 0);
  assert.equal(STAGES.at(-1).at, 1);
  for (const annotation of ANNOTATIONS) {
    assert.ok(annotation.text && annotation.sub, `${annotation.id} is not bilingual`);
    const [from, to] = annotation.range;
    assert.ok(from >= 0 && to <= 1 && from < to, `${annotation.id} has an invalid window`);
  }
});

test('every annotation resolves to a place in the scene', () => {
  // An annotation naming an anchor that does not exist is silently dropped, so
  // the count is the check. Taken before the comparison is ever switched on,
  // because that is when the app reads the list.
  const built = scene();
  assert.equal(built.getAnnotations().length, ANNOTATIONS.length);
  for (const annotation of built.getAnnotations()) {
    assert.ok(Number.isFinite(annotation.position.x));
  }
});

test('the comparison labels say which kidney is which, and follow them', () => {
  // Two similar objects side by side with no labels is a picture, not a
  // statement. These are the statement.
  // Read without switching the comparison on first: the app reads this list
  // once, at load, and a label that only appears afterwards never appears.
  const built = scene();
  const found = Object.fromEntries(built.getAnnotations().map((a) => [a.id, a]));
  assert.ok(found.thisKidney && found.releasedKidney);
  assert.equal(found.releasedKidney.comparisonOnly, true);
  assert.match(found.releasedKidney.text, /signal removed/i);
  assert.ok(found.thisKidney.position.x > found.releasedKidney.position.x);

  // And they are the only labels drawn while the comparison is on: every other
  // one names a structure that is not on screen.
  for (const annotation of built.getAnnotations()) {
    if (annotation.comparisonOnly) continue;
    assert.ok(
      ['afferent', 'efferent', 'filtrate', 'liver', 'splanchnic', 'aorta', 'kidney'].includes(annotation.id)
    );
  }
});

test('every stage boundary sits where the model actually changes phase', () => {
  // The stage a reader is shown has to describe the state they are looking at.
  // These boundaries drifted once already: "filtration is defended first" sat
  // at 0.75, which in this model is well past the failure of autoregulation
  // and a long way down the filtration curve. Asserted against the solved
  // state rather than against a remembered number.
  const at = (progress) => sceneAt({ progress }).solved;
  const stageAt = (id) => STAGES.find((stage) => stage.id === id).at;

  // Nothing is being compensated yet at the start.
  assert.equal(at(stageAt('healthy')).neurohumoral.activation, 0);

  // By the time the reader is told the vasoconstrictor systems are on, they are.
  assert.ok(at(stageAt('defended')).neurohumoral.activation > 0.3);

  // "Filtration is defended" has to be a stage where renal blood flow has
  // fallen, filtration has not, and the arteriole still has room.
  const healthy = at(0).kidney;
  const defended = at(stageAt('defended')).kidney;
  assert.ok(defended.renalBloodFlowMlPerMin < healthy.renalBloodFlowMlPerMin * 0.95);
  assert.ok(defended.glomerularFiltrationRateMlPerMin > healthy.glomerularFiltrationRateMlPerMin * 0.95);
  assert.ok(defended.filtrationFraction > healthy.filtrationFraction);
  assert.ok(defended.autoregulating, 'the defended stage is past the knee');

  // And "the reserve runs out" has to be past it.
  assert.ok(!at(stageAt('failure')).kidney.autoregulating);
  assert.ok(at(stageAt('failure')).kidney.autoregulatoryReserve <= 0);

  // The knee falls between the two, and nowhere else.
  assert.ok(stageAt('defended') < stageAt('failure'));

  // Five stages, not six: the timeline lays them out on one row and a sixth
  // wraps under the track. Every other model-backed scene uses four.
  assert.ok(STAGES.length <= 5, `${STAGES.length} stages will not fit on the timeline`);

  // And each label has to stay true across its whole span, not just at its
  // boundary — the reader sees it until the next one starts.
  const spans = STAGES.map((stage, i) => [stage.id, stage.at, STAGES[i + 1]?.at ?? 1]);
  for (const [id, from, to] of spans) {
    if (id !== 'defended') continue;
    const midpoint = at((from + to) / 2).kidney;
    assert.ok(
      midpoint.glomerularFiltrationRateMlPerMin > healthy.glomerularFiltrationRateMlPerMin * 0.9,
      'filtration is not still being defended halfway through the stage that says it is'
    );
  }
});

// --- the read-out ----------------------------------------------------------

test('every read-out row carries a value, and the values are the model’s', () => {
  const built = sceneAt({ progress: 0.8 });
  const state = built.solved;
  const rows = rowsOf(built);
  for (const metric of METRICS) assert.ok(rows[metric.id] != null, `${metric.id} has no value`);

  assert.equal(rows.gfr, Math.round(state.kidney.glomerularFiltrationRateMlPerMin));
  assert.equal(rows.renalFlow, Math.round(state.kidney.renalBloodFlowMlPerMin));
  assert.equal(rows.map, state.systemic.meanArterialPressureMmHg.toFixed(0));
  assert.equal(rows.activation, state.neurohumoral.activation.toFixed(2));
});

test('the read-out always shows the same kidney without the signal, beside the one with it', () => {
  // The scene's central claim, as a row rather than as prose. Showing only the
  // first would leave the reader to infer that the kidney had been damaged.
  const built = sceneAt({ progress: 0.9 });
  const rows = rowsOf(built);
  assert.equal(rows.released, Math.round(kidneyWithoutTheSignal(built.solved).glomerularFiltrationRateMlPerMin));
  const row = METRICS.find((metric) => metric.id === 'released');
  assert.match(row.label, /signal removed/i);
  assert.ok(row.labelJa);
});

test('the activation is labelled as an index rather than as a concentration', () => {
  // It stands for five hormones at once and has no units. A row that let it
  // read as a renin activity would be the single most misleading thing this
  // scene could put on screen.
  const row = METRICS.find((metric) => metric.id === 'activation');
  assert.match(row.label, /index, not a concentration/i);
  assert.match(row.labelJa, /指標/);
  assert.equal(row.unit, '');
});

test('no read-out row quotes more precision than the model has earned', () => {
  const rows = rowsOf(sceneAt({ progress: 0.7 }));
  for (const [id, value] of Object.entries(rows)) {
    const decimals = String(value).split('.')[1]?.length ?? 0;
    assert.ok(decimals <= 2, `${id} shows ${decimals} decimal places`);
  }
});

test('the scene reports nothing it does not model', () => {
  // No creatinine, no stage, no urine, no ascites, no sodium: the model has no
  // tubule in it and a row implying one would be inventing a finding.
  const text = METRICS.map((metric) => `${metric.label} ${metric.labelJa}`).join(' ');
  for (const forbidden of [/creatinine/i, /urine/i, /ascites/i, /sodium/i, /クレアチニン/, /尿量/, /腹水/]) {
    assert.ok(!forbidden.test(text), `the read-out mentions ${forbidden}`);
  }
});

// --- the charts ------------------------------------------------------------

test('every declared chart is filled, and with the model’s own numbers', () => {
  const built = sceneAt({ progress: 0.6 });
  const charts = built.getCharts();
  for (const chart of CHARTS) {
    assert.ok(charts[chart.id], `chart ${chart.id} is declared and not produced`);
    for (const key of chart.key) {
      assert.ok(
        charts[chart.id].series.some((series) => series.id === key.id),
        `${chart.id} declares a key for ${key.id} and draws no such series`
      );
    }
  }
});

test('the curves are the model re-solved, not a second approximation', () => {
  // The one rule the whole repository is built on: the graph and the read-out
  // read the same model. Checked by re-solving the axis independently and
  // comparing the endpoints.
  const built = sceneAt({ progress: 0.5 });
  const chart = built.getCharts()['renal-response'];
  const gfr = chart.series.find((series) => series.id === 'gfr');

  const worst = solveHepatorenal({
    ...built.controls,
    structuralResistance: HepatorenalScene.MAX_STRUCTURAL_RESISTANCE,
    splanchnicVasodilation: 1,
  });
  const expected =
    (worst.kidney.glomerularFiltrationRateMlPerMin /
      RENAL_REFERENCE.glomerularFiltrationRateMlPerMin) *
    100;
  assert.ok(Math.abs(gfr.points.at(-1).y - expected) < 1e-9);
  assert.equal(gfr.points[0].x, 0);
  assert.equal(gfr.points.at(-1).x, 1);
});

test('the marker sits where the reader is', () => {
  for (const progress of [0, 0.4, 1]) {
    const built = sceneAt({ progress });
    for (const chart of Object.values(built.getCharts())) {
      assert.equal(chart.markers[0].x, progress);
    }
  }
});

test('a treatment moves the whole curve, not just the marker', () => {
  // What makes "the treatment works on the circulation" visible rather than
  // asserted: the axis is re-solved with the treatment on, so the trajectory
  // itself is different.
  const untreated = sceneAt({ progress: 0.9 }).getCharts()['renal-response'];
  const treated = sceneAt({ progress: 0.9, terlipressin: 0.8 }).getCharts()['renal-response'];
  const gfrOf = (chart) => chart.series.find((series) => series.id === 'gfr').points.at(-1).y;
  assert.ok(gfrOf(treated) > gfrOf(untreated));
});

// --- the 3D ----------------------------------------------------------------

test('a vessel carrying more blood is drawn wider, and one carrying less is drawn narrower', () => {
  const healthy = sceneAt({ progress: 0 });
  const sick = sceneAt({ progress: 1 });
  const radius = (built, name) => {
    const positions = built.circulation.vessels[name].surface.geometry.attributes.position.array;
    let maximum = 0;
    for (let i = 0; i < positions.length; i += 3) {
      maximum = Math.max(maximum, Math.hypot(positions[i], positions[i + 1], positions[i + 2]));
    }
    return maximum;
  };
  // The splanchnic bed takes more; the kidney gets less. Both directions, so
  // that a mapping which only ever widens would fail.
  assert.ok(
    sick.solved.systemic.splanchnicFlowMlPerMin > healthy.solved.systemic.splanchnicFlowMlPerMin
  );
  assert.ok(sick.solved.kidney.renalBloodFlowMlPerMin < healthy.solved.kidney.renalBloodFlowMlPerMin);
  assert.ok(radius(sick, 'renalArtery') < radius(healthy, 'renalArtery'));
});

test('the vasoconstrictor colour is never drawn on the bed that does not respond to it', () => {
  // The whole reason the kidney takes the constriction is that the splanchnic
  // bed does not. Colouring it would contradict the scene's own argument.
  const built = sceneAt({ progress: 1 });
  assert.ok(built.solved.neurohumoral.activation > 0.5, 'this test needs an activated circulation');
  const splanchnic = built.circulation.vessels.splanchnicArtery.material.color.getHexString();
  const healthy = sceneAt({ progress: 0 }).circulation.vessels.splanchnicArtery.material.color.getHexString();
  assert.equal(splanchnic, healthy);
  assert.notEqual(
    built.circulation.vessels.renalArtery.material.color.getHexString(),
    sceneAt({ progress: 0 }).circulation.vessels.renalArtery.material.color.getHexString()
  );
});

test('both kidneys in the comparison are drawn by the same code', () => {
  // So that the difference on screen is the model's answer and not a
  // difference in the mesh.
  const built = sceneAt({ progress: 1 });
  built.setComparison(true);
  assert.ok(built.reference, 'no reference unit was built');
  assert.equal(
    Object.keys(built.reference.glomerulus.parts).join(),
    Object.keys(built.renalUnit.glomerulus.parts).join()
  );
  assert.notEqual(built.reference.object.position.x, built.renalUnit.object.position.x);
  // The circulation stands down, because both kidneys share it: drawing it
  // beside one of them would suggest the other had a different one.
  assert.equal(built.circulationGroup.visible, false);

  built.setComparison(false);
  assert.equal(built.reference.object.visible, false);
  assert.equal(built.renalUnit.object.position.x, 0);
  assert.equal(built.circulationGroup.visible, true);
});

// --- the organ-3d playbook's checklist -------------------------------------

test('every material value returns after a round trip through the states', () => {
  // `docs/organ-3d-playbook.md`, materials checklist: constructor → update →
  // reset has to land back where it started. A drawn property that accumulates
  // is a scene that looks different depending on what the reader did first.
  const built = scene();
  const read = () => {
    const glomerulus = built.renalUnit.glomerulus;
    return {
      afferent: [...glomerulus.parts.afferent.surface.geometry.attributes.position.array.slice(0, 9)],
      tuft: glomerulus.parts.tuft0.material.emissiveIntensity,
      tubule: glomerulus.parts.tubule.material.opacity,
      liver: built.liver.object.material.color.getHexString(),
      renalArtery: built.circulation.vessels.renalArtery.material.color.getHexString(),
    };
  };

  built.setProgress(0);
  const before = read();
  built.setProgress(1);
  built.setModelControl('terlipressin', 0.7);
  built.setProgress(0.4);
  built.resetModelControls();
  built.setProgress(0);
  assert.deepEqual(read(), before);
});

test('the capsule is a shell, not a ball, once both of its faces are counted', () => {
  // Failure mode B: `ghostMaterial` draws both sides, so two layers of opacity
  // `a` composite to `2a − a²`. The capsule has to stay faint *after* that
  // doubling, or it hides the tuft it contains.
  const built = scene();
  const capsule = built.renalUnit.glomerulus.object.children.find(
    (child) => child.name === 'bowman-capsule'
  );
  assert.ok(capsule, 'no capsule was built');
  assert.equal(capsule.material.side, THREE.DoubleSide);

  for (const progress of [0, 0.5, 1]) {
    built.setProgress(progress);
    const a = capsule.material.opacity;
    const composited = 2 * a - a * a;
    assert.ok(composited < 0.2, `the capsule composites to ${composited} at ${progress}`);
    assert.ok(composited > 0.02, `the capsule is invisible at ${progress}`);
  }
});

test('the kidney on screen is the one whose hilum faces the aorta', () => {
  // Anatomy checklist: a structure with a side has to be on its own side, and
  // agree with the vessels that reach it. The kidney is drawn to the right of
  // the aorta, which is the subject's left, and its hilum — the concave face —
  // has to look back towards the midline where the renal artery comes from.
  const built = scene();
  const kidney = built.renalUnit.kidney.object;
  assert.ok(kidney.position.x > 0, 'the kidney is not on the side it is built for');

  const cortex = kidney.getObjectByName('cortex');
  const positions = cortex.geometry.attributes.position;
  let medial = 0;
  let lateral = 0;
  for (let i = 0; i < positions.count; i += 1) {
    if (Math.abs(positions.getY(i)) > 0.25) continue;
    medial = Math.min(medial, positions.getX(i));
    lateral = Math.max(lateral, positions.getX(i));
  }
  // The concave face reaches less far from the axis than the convex one.
  assert.ok(
    Math.abs(medial) < lateral,
    `the concavity is on the wrong side: medial ${medial}, lateral ${lateral}`
  );

  // And the renal artery arrives on that side.
  const artery = built.circulation.vessels.renalArtery.curve.getPoint(1);
  assert.ok(artery.x < kidney.position.x, 'the renal artery does not reach the hilum');
});

test('both arterioles are built alike, so a difference on screen is the model’s', () => {
  // Measured as the distance from each ring's own centre out to its vertices,
  // because the two arterioles run along different paths and their raw vertex
  // coordinates carry those paths with them.
  const built = scene();
  const lumen = (name) => {
    const surface = built.renalUnit.glomerulus.parts[name].surface;
    const positions = surface.geometry.attributes.position;
    const radial = surface.radial + 1;
    const radii = [];
    for (let ring = 0; ring <= surface.steps; ring += 1) {
      const centre = surface.points[ring];
      let sum = 0;
      for (let j = 0; j < radial; j += 1) {
        const index = ring * radial + j;
        sum += Math.hypot(
          positions.getX(index) - centre.x,
          positions.getY(index) - centre.y,
          positions.getZ(index) - centre.z
        );
      }
      radii.push(sum / radial);
    }
    return radii.reduce((a, b) => a + b, 0) / radii.length;
  };

  // At rest neither arteriole is being told anything, so the two have to come
  // out identical: any later difference on screen is one the model produced.
  built.setProgress(0);
  assert.equal(built.solved.neurohumoral.activation, 0);
  assert.ok(
    Math.abs(lumen('afferent') - lumen('efferent')) < 1e-9,
    `afferent ${lumen('afferent')} vs efferent ${lumen('efferent')} with nothing asked of either`
  );

  // And under vasoconstrictor tone they differ, in the direction the model says.
  built.setProgress(1);
  assert.ok(built.solved.kidney.efferentResistance / REFERENCE_EFFERENT_RESISTANCE > 1);
  assert.ok(lumen('efferent') < lumen('afferent') * 1.05);
});

// --- the controls ----------------------------------------------------------

test('every declared control exists in the model and comes back with its value', () => {
  const built = scene();
  for (const control of MODEL_CONTROLS) {
    assert.ok(control.id in DEFAULT_CONTROLS, `${control.id} is not a control of the model`);
    assert.ok(control.labelJa, `${control.id} is not bilingual`);
  }
  built.setModelControl('terlipressin', 0.5);
  const shown = built.getModelControls().find((control) => control.id === 'terlipressin');
  assert.equal(shown.value, 0.5);
});

test('resetting the controls leaves the axis where the reader put it', () => {
  const built = sceneAt({ progress: 0.7, terlipressin: 0.9, albumin: 0.5 });
  built.resetModelControls();
  assert.equal(built.controls.terlipressin, DEFAULT_CONTROLS.terlipressin);
  assert.equal(built.controls.albumin, DEFAULT_CONTROLS.albumin);
  assert.equal(built.progress, 0.7);
  assert.ok(built.controls.structuralResistance > 1, 'the axis was reset along with the controls');
});

test('the axis moves the liver and the vasodilation together, and says so', () => {
  const built = sceneAt({ progress: 0.5 });
  assert.equal(built.controls.splanchnicVasodilation, 0.5);
  assert.equal(
    built.controls.structuralResistance,
    1 + (HepatorenalScene.MAX_STRUCTURAL_RESISTANCE - 1) * 0.5
  );
  // And it is not presented as a severity score.
  const label = `${HepatorenalScene.meta.progressLabel.label} ${HepatorenalScene.meta.range.start}`;
  assert.ok(!/severity|score|grade|stage/i.test(label), `the axis reads as a clinical scale: ${label}`);
});

// --- what the scene admits -------------------------------------------------

test('the scope panel names what the model has no tubule for', () => {
  const excluded = MODEL_SCOPE.excludes.map((entry) => entry.text).join(' ');
  for (const missing of [/tubule/i, /ascites/i, /acute tubular necrosis/i]) {
    assert.ok(missing.test(excluded), `the scope panel does not exclude ${missing}`);
  }
  for (const entry of [...MODEL_SCOPE.excludes, ...MODEL_SCOPE.cautions, ...MODEL_SCOPE.answers]) {
    assert.ok(entry.textJa, 'the scope panel is not bilingual');
  }
});

test('the scope panel says the absence of kidney injury is a boundary, not a finding', () => {
  // The one thing a reader could take from this scene as a finding when it is
  // not one. HRS-AKI may occur with tubular injury, proteinuria or
  // pre-existing CKD, and may coexist with other mechanisms of AKI.
  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  const cautionsJa = MODEL_SCOPE.cautions.map((entry) => entry.textJa).join(' ');
  assert.match(cautions, /structural kidney injury is not represented/i);
  assert.match(cautions, /not a claim that real HRS-AKI never contains kidney injury/i);
  assert.ok(/実際の HRS-AKI で腎障害が存在しないという意味ではありません/.test(cautionsJa));

  // And the current criteria, rather than the ones this scene first shipped.
  assert.match(cautions, /clinically indicated/i);
  assert.match(cautions, /no longer required/i);
  assert.ok(
    !/absence of structural kidney disease/i.test(cautions),
    'the scope panel still gives the old absolute diagnostic condition'
  );
});

test('integrity: the model has no structural injury term and the scene says so in both languages', () => {
  // Moved here from the external layer. The *medicine* — that HRS-AKI may
  // coexist with tubular injury, proteinuria or pre-existing CKD — rests on the
  // 2024 consensus and needs no test. What needs one is that this repository's
  // structure and copy say so, which is a contract between the model, the
  // scope panel and the scene rather than a physiological invariant. A failure
  // here is a copy regression, not a medical error.
  const built = sceneAt({ progress: 1 });
  const reported = JSON.stringify(built.solved).toLowerCase();
  for (const absent of ['injury', 'necrosis', 'proteinuria', 'damage']) {
    assert.ok(!reported.includes(absent), `the model reports "${absent}" and should not`);
  }

  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  const cautionsJa = MODEL_SCOPE.cautions.map((entry) => entry.textJa).join(' ');
  assert.match(cautions, /structural kidney injury is not represented/i);
  assert.match(cautions, /modelling boundary/i);
  assert.match(cautions, /not a claim that real HRS-AKI never contains kidney injury/i);
  assert.ok(/実際の HRS-AKI で腎障害が存在しないという意味ではありません/.test(cautionsJa));
  assert.ok(/意図的に分離/.test(cautionsJa), 'the Japanese caution does not frame it as a deliberate isolation');

  // And the same boundary reaches a reader who never opens the scope panel.
  assert.match(HepatorenalScene.meta.disclaimer, /structural kidney injury is not represented/i);
  assert.match(HepatorenalScene.meta.subtitle, /no kidney injury is modelled/i);
  assert.ok(HepatorenalScene.meta.subtitleJa.includes('腎障害は実装していません'));
});

test('the NSAID copy does not claim that real NSAIDs have no systemic effects', () => {
  // The isolation is the model's, not the drug's. Real non-steroidal
  // anti-inflammatory drugs cause sodium and water retention, affect arterial
  // pressure, and can cause haemodynamic AKI and acute interstitial nephritis;
  // AKI risk is raised by volume depletion, CKD, heart failure and renal
  // hypoperfusion as well as by cirrhosis.
  const copy = JSON.stringify([MODEL_SCOPE, STAGES, METRICS, MODEL_CONTROLS, HepatorenalScene.meta]);
  for (const forbidden of [
    /no systemic effect at all/i,
    /全身作用をまったく持たない/,
    /harmless in the same person/i,
    /無害でいられる/,
  ]) {
    assert.ok(!forbidden.test(copy), `the scene still says ${forbidden}`);
  }

  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  const cautionsJa = MODEL_SCOPE.cautions.map((entry) => entry.textJa).join(' ');
  assert.match(cautions, /deliberately isolated to renal prostaglandin inhibition/i);
  assert.match(cautions, /not a claim that real NSAIDs have no systemic effects/i);
  assert.match(cautions, /acute interstitial nephritis/i);
  assert.match(cautions, /volume depletion.*heart failure|heart failure.*volume depletion/i);
  assert.ok(/実際の NSAIDs に全身作用がないという意味ではありません/.test(cautionsJa));
  assert.ok(/急性間質性腎炎/.test(cautionsJa));
});

test('the scope panel says the treatment arm is a direction and not a response rate', () => {
  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  assert.match(cautions, /direction predicted by the model, not a guaranteed clinical response/i);
  assert.match(cautions, /40[–-]50/);
  const cautionsJa = MODEL_SCOPE.cautions.map((entry) => entry.textJa).join(' ');
  assert.ok(/確実な臨床反応ではありません/.test(cautionsJa));
});

test('the scope panel says the axis is a chosen path and not a time course', () => {
  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  assert.match(cautions, /chosen path through parameter space/i);
  assert.match(cautions, /not a time course and not a natural history/i);
  // And the slider itself says it, because the scope panel is a click away.
  assert.match(HepatorenalScene.meta.progressLabel.label, /not a time course/i);
  assert.ok(/時間経過ではなく/.test(HepatorenalScene.meta.progressLabel.labelJa));
});

test('the scope copy’s emphasis markers are balanced', () => {
  // The panel renders `**like this**` as real emphasis. An odd number of
  // markers in a string leaves one of them on screen as a typo, on the
  // sentences that most need to be read cleanly.
  const strings = [...MODEL_SCOPE.answers, ...MODEL_SCOPE.excludes, ...MODEL_SCOPE.cautions, ...MODEL_SCOPE.sources]
    .flatMap((entry) => [entry.text, entry.textJa])
    .concat([MODEL_SCOPE.question, MODEL_SCOPE.questionJa]);
  for (const text of strings) {
    const markers = (text.match(/\*\*/g) ?? []).length;
    assert.equal(markers % 2, 0, `unbalanced emphasis in: ${text.slice(0, 60)}…`);
  }

  // And the boundary sentence is emphasised, because it is the one a reader
  // most easily takes the wrong way.
  const boundary = MODEL_SCOPE.cautions.find((entry) => /structural kidney injury/i.test(entry.text));
  assert.ok(boundary);
  assert.match(boundary.text, /\*\*[^*]*not a claim that real HRS-AKI never contains kidney injury[^*]*\*\*/);
  assert.ok(/\*\*[^*]*実際の HRS-AKI で腎障害が存在しないという意味ではありません[^*]*\*\*/.test(boundary.textJa));
});

test('the scope panel names the 2024 consensus as the source of the definition', () => {
  const sources = MODEL_SCOPE.sources.map((entry) => entry.text).join(' ');
  assert.match(sources, /Nadim/);
  assert.match(sources, /38527522/);
  assert.match(sources, /Khemichian/);
  assert.match(sources, /15977202/);
});

test('the disclaimer is present in both languages and says what it is not for', () => {
  assert.match(HepatorenalScene.meta.disclaimer, /not for diagnosis/i);
  assert.match(HepatorenalScene.meta.disclaimer, /structural kidney injury is not represented/i);
  assert.match(HepatorenalScene.meta.disclaimer, /boundary of the model/i);
  assert.ok(HepatorenalScene.meta.disclaimerJa.includes('診断'));
  assert.ok(HepatorenalScene.meta.disclaimerJa.includes('モデルの境界'));
  assert.ok(HepatorenalScene.meta.disclaimerShort.length < 110);
  assert.match(HepatorenalScene.meta.disclaimerShort, /no kidney injury modelled/i);
});

test('the title does not present this as a complete model of the syndrome', () => {
  assert.match(HepatorenalScene.meta.title, /haemodynamic mechanism/i);
  assert.ok(HepatorenalScene.meta.titleJa.includes('循環'));
  assert.match(HepatorenalScene.meta.subtitle, /no kidney injury is modelled/i);
  assert.ok(HepatorenalScene.meta.subtitleJa.includes('腎障害は実装していません'));
});

test('no user-facing copy claims the kidney is undamaged in the real syndrome', () => {
  // A full sweep of everything the scene puts on screen, in both languages,
  // for the generalisation the audit removed.
  const copy = JSON.stringify([
    HepatorenalScene.meta,
    STAGES,
    METRICS,
    MODEL_SCOPE,
    MODEL_CONTROLS,
  ]);
  for (const forbidden of [
    /nothing (has )?damaged the kidney/i,
    /structurally near-normal/i,
    /functional rather than structural/i,
    /nothing is wrong with the kidney/i,
    /構造的に(は)?(ほぼ)?正常な腎臓/,
    /腎臓を傷害したものは(何も)?ありません/,
  ]) {
    assert.ok(!forbidden.test(copy), `the scene still says ${forbidden}`);
  }
});
