import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TERRITORIES } from '../src/models/coronaryTerritories.js';
import {
  BASELINE_SUPPLY_DEMAND,
  advanceIschemia,
  episodeAt,
  restingMyocardium,
  supplyDemandRatios,
  solveIschemicCirculation,
  ventricularContractility,
  wallMotionAmplitude,
} from '../src/models/myocardialIschemia.js';
import { circulationParameters } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';

/**
 * Myocardial ischemia, checked against the behaviour the spec asks for.
 *
 * Every threshold below is quoted from `docs/anatomy-specs.md` §2 A3-a, which
 * was written before any of this existed. That order matters: a calibration
 * checked against numbers chosen afterwards is checked against itself.
 *
 * These are **behavioural** criteria, not measurements — a deficit that
 * accumulates rather than appearing, an ordering by severity that holds by a
 * margin, and a recovery that lags its own blood supply. The model card carries
 * the line between what published work gives the direction of and what is
 * fitted shape.
 */

/** The severe deficit the spec's acceptance criteria are written against. */
const SEVERE = { supplyFactor: { lad: 0.35 } };
const NON_LAD = TERRITORIES.filter((territory) => territory !== 'lad');

/** Roughly how much of the left ventricle each territory supplies. */
const MASS_FRACTION = { lad: 0.42, rca: 0.28, lcx: 0.3 };

test('at rest every territory is supplied, with nothing accumulated', () => {
  const rest = restingMyocardium();
  for (const territory of TERRITORIES) {
    assert.ok(
      rest.supplyDemandRatio[territory] >= 1.2,
      `${territory}: supply/demand is ${rest.supplyDemandRatio[territory]}, which is not the reserve a resting coronary circulation has`
    );
    assert.ok(rest.ischemicBurden[territory] <= 0.02, `${territory}: nothing accumulated at rest`);
  }

  // And no territory contracts differently from any other, which is what makes
  // a later difference attributable to the deficit rather than to the setup.
  const multipliers = TERRITORIES.map((territory) => rest.contractilityMultiplier[territory]);
  const spread = Math.max(...multipliers) - Math.min(...multipliers);
  assert.ok(spread <= 0.02, `contractility is even at rest, spread ${spread}`);
});

test('a baseline episode stays a baseline episode', () => {
  // Running the clock with every artery open must not drift. A model whose
  // resting state slowly accumulated burden would show ischemia in a heart
  // nothing was done to, and it would look like physiology.
  const held = episodeAt({ progress: 1 });
  for (const territory of TERRITORIES) {
    assert.ok(held.supplyDemandRatio[territory] >= 1.2, `${territory}: still supplied`);
    assert.ok(held.ischemicBurden[territory] <= 0.02, `${territory}: still nothing accumulated`);
    assert.ok(
      Math.abs(held.contractilityMultiplier[territory] - 1) <= 0.02,
      `${territory}: still contracting normally`
    );
  }
});

test('a severe anterior deficit starves its own territory and no other', () => {
  const ratios = supplyDemandRatios(SEVERE);
  assert.ok(ratios.lad <= 0.7, `the anterior descending is starved: supply/demand ${ratios.lad.toFixed(3)}`);
  for (const territory of NON_LAD) {
    assert.ok(
      ratios[territory] >= 1.1,
      `${territory} keeps its supply: ${ratios[territory].toFixed(3)}`
    );
  }
});

test('burden accumulates through the episode rather than appearing', () => {
  // The prohibition in the spec, as a measurement. If burden were a function of
  // supply rather than an integral of it, these three would be equal.
  const points = [0.25, 0.5, 1].map((progress) => ({
    progress,
    state: episodeAt({ ...SEVERE, progress }),
  }));
  const burdens = points.map(({ state }) => state.ischemicBurden.lad);

  for (let i = 1; i < burdens.length; i++) {
    assert.ok(
      burdens[i] > burdens[i - 1],
      `burden rises: ${burdens[i - 1].toFixed(3)} then ${burdens[i].toFixed(3)}`
    );
    assert.ok(
      burdens[i] - burdens[i - 1] >= 0.15,
      `and rises by a margin, not a rounding: ${(burdens[i] - burdens[i - 1]).toFixed(3)} between ` +
        `progress ${points[i - 1].progress} and ${points[i].progress}`
    );
  }
  assert.ok(burdens[2] >= 0.65, `by the end of the episode the burden is unmistakable: ${burdens[2].toFixed(3)}`);

  // And the territories that kept their supply stay clear, so what is drawn
  // discoloured is the anterior wall and not the whole heart.
  const end = points[2].state;
  for (const territory of NON_LAD) {
    assert.ok(
      end.ischemicBurden[territory] <= 0.1,
      `${territory} accumulates nothing: ${end.ischemicBurden[territory].toFixed(3)}`
    );
  }
});

test('the integration does not depend on the step size', () => {
  // A scene advances by a frame and a test advances in one jump; if those
  // disagreed, the physiology would depend on the frame rate — and it would
  // disagree by more on a slower machine, which is the worst kind of bug to
  // find.
  const oneJump = episodeAt({ ...SEVERE, progress: 0.6 });
  let stepped = restingMyocardium();
  for (let i = 0; i < 600; i++) {
    stepped = advanceIschemia(stepped, { ...SEVERE, deltaProgress: 0.001 });
  }
  for (const territory of TERRITORIES) {
    assert.ok(
      Math.abs(oneJump.ischemicBurden[territory] - stepped.ischemicBurden[territory]) < 1e-3,
      `${territory}: ${oneJump.ischemicBurden[territory]} against ${stepped.ischemicBurden[territory]}`
    );
  }
});

test('the wall stops moving where the burden is, by the amount the spec asks', () => {
  const end = episodeAt({ ...SEVERE, progress: 1 });
  assert.ok(end.ischemicBurden.lad >= 0.65, 'the precondition the spec states this against');

  const lost = 1 - wallMotionAmplitude(end, 'lad');
  assert.ok(
    lost >= 0.35 && lost <= 0.6,
    `the anterior wall loses 35–60% of its excursion: lost ${(lost * 100).toFixed(0)}%`
  );
  for (const territory of NON_LAD) {
    const change = Math.abs(1 - wallMotionAmplitude(end, territory));
    assert.ok(change <= 0.1, `${territory} keeps moving: changed ${(change * 100).toFixed(0)}%`);
  }
});

test('severity orders the outcome, by a margin', () => {
  // Three lesions the scene offers, compared under identical conditions. The
  // ordering is the claim; the margin is what makes it an ordering rather than
  // a coin toss, which is the failure this repository has now made twice.
  const factors = [0.75, 0.55, 0.35];
  const finals = factors.map(
    (factor) => episodeAt({ supplyFactor: { lad: factor }, progress: 1 }).ischemicBurden.lad
  );
  for (let i = 1; i < finals.length; i++) {
    assert.ok(finals[i] > finals[i - 1], `a tighter lesion hurts more: ${finals[i - 1]} then ${finals[i]}`);
    assert.ok(
      finals[i] - finals[i - 1] >= 0.15,
      `and by a margin: ${(finals[i] - finals[i - 1]).toFixed(3)} between supply ${factors[i - 1]} and ${factors[i]}`
    );
  }
});

test('reperfusion restores the blood supply first and the wall afterwards', () => {
  // The single most misleading thing this scene could show is a wall that comes
  // back the moment flow does. Every assertion here is about that gap.
  const injured = episodeAt({ ...SEVERE, progress: 1 });
  const peak = injured.ischemicBurden.lad;
  assert.ok(peak >= 0.65, 'there is something to recover from');

  // Supply is back immediately — that is what reperfusion is.
  const firstStep = advanceIschemia(injured, { deltaProgress: 0.02 });
  assert.ok(
    firstStep.supplyDemandRatio.lad >= 1.2,
    `flow is restored at once: ${firstStep.supplyDemandRatio.lad.toFixed(3)}`
  );

  // The burden is not.
  assert.ok(firstStep.ischemicBurden.lad > 0, 'burden does not reset when flow returns');
  assert.ok(
    peak - firstStep.ischemicBurden.lad <= 0.1,
    `and barely moves in one step: fell ${(peak - firstStep.ischemicBurden.lad).toFixed(3)}`
  );

  // Over a full normalized recovery it clears most of the way, and not all.
  const recovered = episodeAt({ progress: 1, from: injured });
  const cleared = (peak - recovered.ischemicBurden.lad) / peak;
  assert.ok(
    cleared >= 0.4 && cleared <= 0.8,
    `recovery clears 40–80% of the peak: cleared ${(cleared * 100).toFixed(0)}%`
  );

  // And this is stunning, stated as the gap between the two recoveries: the
  // oxygen debt clears most of the way while the wall barely improves.
  const impairedBefore = 1 - wallMotionAmplitude(injured, 'lad');
  const impairedAfter = 1 - wallMotionAmplitude(recovered, 'lad');
  const wallRecovered = (impairedBefore - impairedAfter) / impairedBefore;
  assert.ok(
    wallRecovered < cleared / 2,
    `the wall recovers far less than the supply does: wall ${(wallRecovered * 100).toFixed(0)}% ` +
      `against burden ${(cleared * 100).toFixed(0)}%`
  );
  assert.ok(
    impairedAfter > 0.25,
    `and is still clearly hypokinetic with normal flow: ${(impairedAfter * 100).toFixed(0)}% impaired`
  );

  // From the crossover onward, contractility trails burden outright. It starts
  // *below* it — at the moment flow returns the wall is still catching up to an
  // injury that has stopped growing — and is overtaken within a few steps, once
  // burden begins falling faster than the wall recovers. Asserting the lag from
  // the first step would have been asserting the wrong thing.
  let walked = injured;
  let crossed = false;
  for (let i = 0; i < 50; i++) {
    walked = advanceIschemia(walked, { deltaProgress: 0.02 });
    if (walked.contractilityBurden.lad > walked.ischemicBurden.lad) crossed = true;
    else if (crossed) {
      assert.fail(`contractility fell back below burden at step ${i}, after having trailed it`);
    }
  }
  assert.ok(crossed, 'contractility comes to trail burden during the recovery');
});

test('the whole ventricle is weighed by how much muscle each territory holds', () => {
  const rest = restingMyocardium();
  assert.ok(
    Math.abs(ventricularContractility(rest, MASS_FRACTION) - 1) < 1e-9,
    'a rested ventricle contracts normally'
  );

  const injured = episodeAt({ ...SEVERE, progress: 1 });
  const global = ventricularContractility(injured, MASS_FRACTION);
  assert.ok(global < 1, 'an ischemic territory costs the whole ventricle');

  // Losing the anterior descending's share costs more than losing the
  // circumflex's, because it supplies more muscle — which is why the proximal
  // LAD lesion is the one with a name.
  const anterior = ventricularContractility(
    episodeAt({ supplyFactor: { lad: 0.35 }, progress: 1 }),
    MASS_FRACTION
  );
  const circumflex = ventricularContractility(
    episodeAt({ supplyFactor: { lcx: 0.35 }, progress: 1 }),
    MASS_FRACTION
  );
  assert.ok(
    anterior < circumflex,
    `the same lesion in the larger territory costs more: ${anterior.toFixed(3)} against ${circumflex.toFixed(3)}`
  );

  assert.throws(() => ventricularContractility(rest, { lad: 0, rca: 0, lcx: 0 }), RangeError);
});

test('the model refuses inputs that would make its answer meaningless', () => {
  assert.throws(() => supplyDemandRatios({ demandFactor: 0 }), RangeError, 'demand cannot be nothing');
  assert.throws(() => supplyDemandRatios({ supplyFactor: { lad: -1 } }), RangeError, 'supply cannot be negative');
  assert.throws(() => advanceIschemia(restingMyocardium(), { deltaProgress: 0 }), RangeError, 'time has to pass');
  assert.throws(() => episodeAt({ progress: -0.5 }), RangeError, 'an episode does not run backwards');
  assert.throws(() => wallMotionAmplitude(restingMyocardium(), 'lima'), Error, 'and there are three territories');
});

test('the model is pure, deterministic, and says what its time axis is not', () => {
  const source = readFileSync(new URL('../src/models/myocardialIschemia.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from 'three'/, 'no three');
  assert.doesNotMatch(source, /\bdocument\.|\bwindow\./, 'no DOM');
  assert.doesNotMatch(source, /scenes\//, 'no scene');
  assert.doesNotMatch(source, /Math\.random/, 'deterministic');

  // The spec requires the time axis to be named for what it is when seconds
  // cannot be justified, and this model cannot justify seconds.
  assert.match(source, /normalized episode progress/i, 'the axis is named');
  assert.match(source, /not minutes/i, 'and says what it is not');

  // Running it twice gives the same answer, which a model that fed a scene had
  // better do.
  const a = episodeAt({ ...SEVERE, progress: 0.7 });
  const b = episodeAt({ ...SEVERE, progress: 0.7 });
  assert.deepEqual(a.ischemicBurden, b.ischemicBurden);
});

test('the whole circulation is solved from the same state, and the loop matches its own numbers', () => {
  // The join the design exists for. One number crosses from the regional model
  // to the global one — how hard the ventricle can still contract — and every
  // whole-heart consequence comes out of a single solve. Nothing is computed a
  // second way for a read-out, which is what would let the pressure-volume loop
  // and the ejection fraction beside it disagree.
  const MASS = MASS_FRACTION;
  const parameters = circulationParameters(0);
  const rest = solveIschemicCirculation(restingMyocardium(), { parameters, massFraction: MASS });
  const injured = episodeAt({ ...SEVERE, progress: 1 });
  const ischemic = solveIschemicCirculation(injured, { parameters, massFraction: MASS });

  assert.ok(injured.ischemicBurden.lad >= 0.65, 'the precondition the spec states this against');

  // Preload and afterload are untouched — the same circulating volume and the
  // same systemic resistance — so the fall is the contractility and not the
  // loading.
  assert.equal(ischemic.parameters.circulatingVolume, parameters.circulatingVolume);
  assert.equal(ischemic.parameters.systemicResistance, parameters.systemicResistance);
  assert.ok(
    ischemic.parameters.lv.ees < parameters.lv.ees,
    'what changed is end-systolic elastance, which is what contractility means here'
  );

  const drop =
    100 * (rest.solution.cycle.ejectionFraction - ischemic.solution.cycle.ejectionFraction);
  assert.ok(
    drop >= 3 && drop <= 15,
    `ejection fraction falls 3–15 absolute points: ${drop.toFixed(1)}`
  );

  // The loop and the numbers are the same solve, so they cannot disagree: end
  // systole holds more blood, and the stroke volume is the difference.
  const cycle = ischemic.solution.cycle;
  assert.ok(cycle.esv > rest.solution.cycle.esv, 'more blood is left behind at end systole');
  assert.ok(
    Math.abs(cycle.strokeVolume - (cycle.edv - cycle.esv)) < 1e-6,
    'stroke volume is the difference the loop draws'
  );
  assert.ok(
    Math.abs(cycle.ejectionFraction - cycle.strokeVolume / cycle.edv) < 1e-9,
    'and ejection fraction is that stroke volume over that filling'
  );

  assert.throws(() => solveIschemicCirculation(injured, { massFraction: MASS }), TypeError);
});

test('a bigger territory costs the whole heart more, at the same lesion', () => {
  // Why a proximal anterior-descending lesion is the one with a name. The same
  // supply deficit in the larger territory costs more ejection fraction, and it
  // does so through the solve rather than by anything saying so.
  const parameters = circulationParameters(0);
  const efFor = (territory) =>
    solveIschemicCirculation(episodeAt({ supplyFactor: { [territory]: 0.35 }, progress: 1 }), {
      parameters,
      massFraction: MASS_FRACTION,
    }).solution.cycle.ejectionFraction;
  assert.ok(
    efFor('lad') < efFor('lcx'),
    `the anterior descending costs more: ${efFor('lad').toFixed(4)} against ${efFor('lcx').toFixed(4)}`
  );
});
