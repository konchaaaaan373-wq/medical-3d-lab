import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRANCH_COUNT,
  DEFAULT_CONTROLS,
  DEFECT_THRESHOLD,
  GENERATIONS,
  HOMOTHETY,
  TERMINAL_COUNT,
  TREE,
  REFERENCE_CONTROLS,
  doseResponse,
  generationOf,
  isTerminal,
  leftChild,
  rightChild,
  solveAsthma,
  solveTree,
} from '../src/models/asthma.js';

/**
 * What the asthma model is required to get right.
 *
 * The claim the whole scene rests on is that **patchiness is emergent** — that
 * a stimulus reaching every airway equally produces ventilation that is not
 * equal, and that it does so because of the feedback through the parenchyma
 * rather than because the model was told to make it patchy. Several of these
 * tests exist to make that falsifiable: remove the feedback and the patchiness
 * has to disappear.
 */

/**
 * **Layer 2 — model integrity.** These check that the asthma model agrees with
 * itself: that the solver converges, that nothing leaves the range it
 * described, and that the chart, the read-out, the 3D and the teaching text
 * are all reading the same model.
 *
 * A failure here means the implementation is broken or two parts of the
 * repository have drifted apart. It says nothing about the physiology — that
 * is layer 1 — and nothing about whether a chosen constant has moved, which
 * is layer 3. See `tests/README.md`.
 */

const QUIET = { stimulus: 0 };
/** Past the knee, where the interesting things happen. */
const CHALLENGED = { stimulus: 0.8 };

// --- the tree --------------------------------------------------------------

test('the tree is a complete binary tree of the size it says', () => {
  assert.equal(BRANCH_COUNT, 2 ** GENERATIONS - 1);
  assert.equal(TERMINAL_COUNT, 2 ** (GENERATIONS - 1));
  assert.equal(TREE.length, BRANCH_COUNT);
  for (let index = 0; index < BRANCH_COUNT; index++) {
    if (isTerminal(index)) continue;
    assert.ok(leftChild(index) < BRANCH_COUNT, `branch ${index} has no left child`);
    assert.ok(rightChild(index) < BRANCH_COUNT, `branch ${index} has no right child`);
    assert.equal(generationOf(leftChild(index)), generationOf(index) + 1);
  }
  assert.equal(TREE.filter((branch) => branch.terminal).length, TERMINAL_COUNT);
});

test('each generation is narrower than the last by the homothety ratio', () => {
  // From generation three on, where there are enough branches for the seeded
  // calibre scatter to average out. Nearer the trachea there are two branches
  // and the scatter is the whole signal.
  for (let generation = 3; generation < GENERATIONS; generation++) {
    const at = (g) => {
      const branches = TREE.filter((branch) => branch.generation === g);
      return branches.reduce((sum, branch) => sum + branch.baseRadius, 0) / branches.length;
    };
    assert.ok(
      Math.abs(at(generation) / at(generation - 1) - HOMOTHETY) < 0.03,
      `generation ${generation} scaled by ${at(generation) / at(generation - 1)}, not ${HOMOTHETY}`
    );
  }
});

test('smooth muscle is present at every generation, and cartilage is what falls away', () => {
  // Two facts, kept separate on purpose. Asthma is a disease of the whole
  // airway tree; the muscle runs from the trachea to the terminal bronchioles.
  // What changes distally is how much of its shortening reaches the lumen.
  const at = (generation) => TREE.find((branch) => branch.generation === generation);
  for (let generation = 0; generation < GENERATIONS; generation++) {
    assert.ok(
      at(generation).smoothMuscleFraction > 0,
      `generation ${generation} must carry smooth muscle; asthma is not a small-airway disease`
    );
  }
  assert.ok(at(0).cartilageSupport > 0.5, 'the trachea is held open by complete cartilage rings');
  assert.equal(at(GENERATIONS - 1).cartilageSupport, 0, 'and a bronchiole has no cartilage at all');
  // The product rises distally without ever being zero centrally.
  for (let generation = 1; generation < GENERATIONS; generation++) {
    assert.ok(
      at(generation).constrictibility >= at(generation - 1).constrictibility,
      `constrictibility fell between generations ${generation - 1} and ${generation}`
    );
  }
  assert.ok(at(0).constrictibility > 0, 'the central airways still narrow, just much less');
  assert.equal(at(GENERATIONS - 1).constrictibility, 1);
});

test('the lung is heterogeneous, and it is the same heterogeneous lung every time', () => {
  const sensitivities = TREE.map((branch) => branch.sensitivity);
  assert.ok(Math.max(...sensitivities) > Math.min(...sensitivities) * 1.25, 'there is real variation');
  // Regional rather than speckled: a branch's responsiveness has to correlate
  // with its parent's, or the model produces scattered single-unit defects
  // instead of the clustered ones imaging shows.
  const pairs = [];
  for (let index = 1; index < BRANCH_COUNT; index++) {
    pairs.push([TREE[index].sensitivity, TREE[Math.floor((index - 1) / 2)].sensitivity]);
  }
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const meanChild = mean(pairs.map((pair) => pair[0]));
  const meanParent = mean(pairs.map((pair) => pair[1]));
  const covariance = mean(pairs.map(([child, parent]) => (child - meanChild) * (parent - meanParent)));
  const spread = (values, centre) => Math.sqrt(mean(values.map((value) => (value - centre) ** 2)));
  const correlation =
    covariance /
    (spread(pairs.map((pair) => pair[0]), meanChild) * spread(pairs.map((pair) => pair[1]), meanParent));
  assert.ok(correlation > 0.6, `parent-child correlation was only ${correlation}`);
});

// --- the network solve -----------------------------------------------------

test('flow is conserved at every bifurcation', () => {
  const solved = solveAsthma(CHALLENGED);
  const { flow } = solveTree(solved.calibres);
  for (let index = 0; index < BRANCH_COUNT; index++) {
    if (isTerminal(index)) continue;
    const children = flow[leftChild(index)] + flow[rightChild(index)];
    assert.ok(Math.abs(children - flow[index]) < 1e-12, `branch ${index} lost ${flow[index] - children}`);
  }
});

test('the narrower of two sister airways gets less of the flow', () => {
  const solved = solveAsthma(CHALLENGED);
  const { flow, equivalent } = solveTree(solved.calibres);
  let checked = 0;
  for (let index = 0; index < BRANCH_COUNT; index++) {
    if (isTerminal(index)) continue;
    const left = leftChild(index);
    const right = rightChild(index);
    if (Math.abs(equivalent[left] - equivalent[right]) < 1e-6) continue;
    const costlier = equivalent[left] > equivalent[right] ? left : right;
    const cheaper = costlier === left ? right : left;
    assert.ok(flow[cheaper] >= flow[costlier], `branch ${index} sent more flow to the costlier subtree`);
    checked += 1;
  }
  assert.ok(checked > 50, 'the comparison was actually made');
});

test('a unit’s share of the ventilation averages exactly one', () => {
  for (const controls of [QUIET, CHALLENGED, { stimulus: 0.6, bronchodilator: 0.5 }]) {
    const solved = solveAsthma(controls);
    const mean = solved.units.reduce((sum, unit) => sum + unit.share, 0) / solved.units.length;
    assert.ok(Math.abs(mean - 1) < 1e-9, `mean share was ${mean}`);
  }
});

// --- the quiet lung --------------------------------------------------------

test('with no stimulus the lung is nearly uniform, and remodelling alone already costs resistance', () => {
  const healthy = solveAsthma(REFERENCE_CONTROLS);
  assert.ok(Math.abs(healthy.resistanceRatio - 1) < 1e-3, 'the reference lung is the reference');

  const solved = solveAsthma(QUIET);
  // Not 1: the scene's lung carries wall thickening, which costs lumen before
  // any muscle contracts. Quoting the ratio against the reader's own resting
  // lung would have hidden that.
  assert.ok(solved.resistanceRatio > 1.02, `remodelling should cost something: ${solved.resistanceRatio}`);
  assert.ok(solved.resistanceRatio < 1.5, 'but not much, at rest');
  assert.ok(solved.heterogeneity < 0.12, `an unstimulated lung was ${solved.heterogeneity} heterogeneous`);
  assert.equal(solved.defectFraction, 0);
  assert.equal(solved.largestDefectFraction, 0);
  assert.ok(solved.converged);
});

// --- the emergent result ---------------------------------------------------

test('a stimulus that reaches every airway equally produces ventilation that is not equal', () => {
  const solved = solveAsthma(CHALLENGED);
  assert.ok(solved.heterogeneity > 0.8, `heterogeneity was only ${solved.heterogeneity}`);
  assert.ok(solved.defectFraction > 0.25, `only ${solved.defectFraction} of units were poorly ventilated`);
  // And the poorly ventilated units are in regions, not scattered one by one.
  assert.ok(
    solved.largestDefectFraction > 0.05,
    `the largest mostly-dark region was only ${solved.largestDefectFraction} of the lung`
  );
});

test('the patchiness is the feedback, not the scatter', () => {
  // The strongest claim this model makes, so it gets the strongest test.
  // Same tree, same seeded scatter, same stimulus — with the loop through the
  // parenchyma cut. If the patchiness were coming from the airways being
  // different from one another, it would survive this. It does not.
  const withFeedback = solveAsthma(CHALLENGED);
  const withoutFeedback = solveAsthma(CHALLENGED, { feedback: false });

  assert.ok(withFeedback.heterogeneity > 0.8, 'the premise: with the loop, the lung is patchy');
  assert.ok(
    withoutFeedback.heterogeneity < withFeedback.heterogeneity * 0.4,
    `cutting the loop must remove most of the heterogeneity: ${withFeedback.heterogeneity} → ${withoutFeedback.heterogeneity}`
  );
  assert.ok(
    withoutFeedback.defectFraction < 0.1,
    `and nearly all of the defects: ${withoutFeedback.defectFraction} remained`
  );
  // The airways are still narrowed — it is the *unevenness* that went.
  assert.ok(withoutFeedback.medianCalibre < 0.9, 'the stimulus was still applied');
});

test('stronger parenchymal tethering does part of what cutting the feedback does', () => {
  // A statement about the mechanical term, and only about the mechanical term.
  // It says nothing about what a deep inspiration would do to a person with
  // asthma, where the bronchodilator response to a deep breath is impaired or
  // absent — see the model card.
  const normal = solveAsthma(CHALLENGED);
  const stretched = solveAsthma({ ...CHALLENGED, lungInflation: 1.3 });
  assert.ok(
    stretched.heterogeneity < normal.heterogeneity * 0.9,
    `holding the airways stretched should reduce heterogeneity: ${normal.heterogeneity} → ${stretched.heterogeneity}`
  );
  assert.ok(stretched.defectFraction < normal.defectFraction);
});

test('the dose-response has a knee: nothing happens, then a great deal does', () => {
  const curve = doseResponse({});
  const at = (stimulus) => curve.reduce((best, point) =>
    Math.abs(point.stimulus - stimulus) < Math.abs(best.stimulus - stimulus) ? point : best
  );
  // Measured as a rise above the resting resistance, which is not 1 — this
  // lung's airway walls are already thickened before any stimulus arrives.
  const rest = at(0).resistanceRatio;
  // Flat at the bottom.
  assert.ok(at(0.3).resistanceRatio < rest * 1.15, `a third of the dose already cost ${at(0.3).resistanceRatio / rest}×`);
  // Steep at the top.
  assert.ok(at(1).resistanceRatio > rest * 5, `full dose only reached ${at(1).resistanceRatio / rest}×`);
  // And the steepness is not uniform: the rise over the second half of the
  // dose is many times the rise over the first.
  const firstHalf = at(0.5).resistanceRatio - rest;
  const secondHalf = at(1).resistanceRatio - at(0.5).resistanceRatio;
  assert.ok(secondHalf > firstHalf * 6, `the curve is not knee-shaped: ${firstHalf} then ${secondHalf}`);
});

test('resistance rises monotonically with the stimulus', () => {
  const curve = doseResponse({});
  for (let i = 1; i < curve.length; i++) {
    assert.ok(
      curve[i].resistanceRatio >= curve[i - 1].resistanceRatio - 0.02,
      `resistance fell from ${curve[i - 1].resistanceRatio} to ${curve[i].resistanceRatio}`
    );
  }
});

test('patchiness is a stage, not the end state', () => {
  // Venegas's title is "self-organized patchiness ... as a prelude to
  // catastrophic shifts", and that arc is what the model has to reproduce:
  // heterogeneity peaks partway up the dose and then falls as the whole lung
  // goes, while the air actually reaching the lung keeps falling throughout.
  const middle = solveAsthma({ stimulus: 0.8 });
  const extreme = solveAsthma({ stimulus: 1 });
  assert.ok(middle.heterogeneity > extreme.heterogeneity * 0.9, 'patchiness is greatest partway up');
  assert.ok(extreme.defectFraction < middle.defectFraction, 'a uniformly shut lung has no relative defects');
  // Which is exactly why a share-based measure alone would mislead.
  assert.ok(
    extreme.totalVentilation < middle.totalVentilation * 0.6,
    'and the absolute ventilation has to keep falling, or the read-out would say it got better'
  );
});

// --- the controls ----------------------------------------------------------

test('more lung inflation means more tethering means wider airways', () => {
  const shallow = solveAsthma({ ...CHALLENGED, lungInflation: 0.8 });
  const normal = solveAsthma(CHALLENGED);
  const deep = solveAsthma({ ...CHALLENGED, lungInflation: 1.3 });
  assert.ok(deep.resistanceRatio < normal.resistanceRatio, 'more stretch lowers resistance');
  assert.ok(normal.resistanceRatio < shallow.resistanceRatio, 'and less stretch raises it');
  assert.ok(deep.defectFraction < normal.defectFraction, 'and it recruits some of the dark regions');
});

test('a bronchodilator relaxes the muscle and the lung reopens', () => {
  const before = solveAsthma(CHALLENGED);
  const after = solveAsthma({ ...CHALLENGED, bronchodilator: 1 });
  assert.ok(after.resistanceRatio < before.resistanceRatio * 0.5);
  assert.ok(after.defectFraction < before.defectFraction);
  assert.ok(after.medianCalibre > before.medianCalibre);
});

test('wall thickening costs calibre before any muscle contracts, and amplifies what follows', () => {
  const thin = solveAsthma({ ...QUIET, wallThickening: 0 });
  const thick = solveAsthma({ ...QUIET, wallThickening: 1 });
  assert.ok(thick.medianCalibre < thin.medianCalibre, 'lumen is lost with no stimulus at all');

  const challengeThin = solveAsthma({ ...CHALLENGED, wallThickening: 0 });
  const challengeThick = solveAsthma({ ...CHALLENGED, wallThickening: 1 });
  assert.ok(
    challengeThick.resistanceRatio > challengeThin.resistanceRatio,
    'and the same contraction costs more in a thickened airway'
  );
});

test('hyperresponsiveness moves the whole dose-response to the left', () => {
  const ordinary = doseResponse({ hyperresponsiveness: 1 });
  const twitchy = doseResponse({ hyperresponsiveness: 1.6 });
  const doseFor = (curve, ratio) => curve.find((point) => point.resistanceRatio > ratio)?.stimulus ?? 1;
  assert.ok(
    doseFor(twitchy, 2) < doseFor(ordinary, 2),
    'a hyperresponsive lung has to reach the same resistance at a smaller dose'
  );
});

// --- determinism and hygiene ----------------------------------------------

test('the same controls give the same lung, every time', () => {
  const first = solveAsthma(CHALLENGED);
  const second = solveAsthma(CHALLENGED);
  assert.deepEqual(
    first.units.map((unit) => unit.share),
    second.units.map((unit) => unit.share)
  );
});

test('every solve settles, and says so', () => {
  for (let i = 0; i <= 10; i++) {
    const solved = solveAsthma({ stimulus: i / 10 });
    assert.ok(solved.converged, `the model did not settle at stimulus ${i / 10}`);
  }
});

test('nothing in the model produces a gas tension or a saturation', () => {
  // Ventilation heterogeneity causes hypoxaemia; it is not the same thing as
  // it, and there is no perfusion in this model at all. A key here is a key
  // some scene would eventually put on screen.
  const solved = solveAsthma(CHALLENGED);
  const forbidden = /(spo2|sao2|pao2|paco2|oxygen|saturation|hypox|perfusion|shunt)/i;
  for (const key of Object.keys(solved)) {
    assert.ok(!forbidden.test(key), `the asthma model must not report "${key}"`);
  }
});

test('calibres stay inside the airway they belong to', () => {
  for (let i = 0; i <= 10; i++) {
    const solved = solveAsthma({ stimulus: i / 10, wallThickening: 1, hyperresponsiveness: 2 });
    for (const calibre of solved.calibres) {
      assert.ok(calibre.radius > 0, 'an airway never fully closes in this model');
      assert.ok(calibre.openFraction <= 1 + 1e-9, `an airway opened to ${calibre.openFraction} of its baseline`);
    }
    for (const unit of solved.units) {
      assert.ok(unit.share >= 0 && Number.isFinite(unit.share));
      assert.ok(unit.ventilation >= 0 && unit.ventilation <= 1.6);
    }
  }
});

test('the defect threshold is what the reported defect fraction actually uses', () => {
  const solved = solveAsthma(CHALLENGED);
  const counted = solved.units.filter((unit) => unit.share < DEFECT_THRESHOLD).length;
  assert.ok(Math.abs(counted / solved.units.length - solved.defectFraction) < 1e-12);
});

test('the model’s defaults are the lung the scene opens on', () => {
  assert.equal(DEFAULT_CONTROLS.stimulus, 0, 'the scene opens with no stimulus given');
  assert.ok(DEFAULT_CONTROLS.hyperresponsiveness > 1, 'and on a lung that is hyperresponsive');
});
