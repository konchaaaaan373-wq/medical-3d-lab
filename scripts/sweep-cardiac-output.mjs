#!/usr/bin/env node
/**
 * Sweeps the cardiac-output experiment's input domain and reports what settles.
 *
 *   node scripts/sweep-cardiac-output.mjs             # the declared domain
 *   node scripts/sweep-cardiac-output.mjs --probe     # wider, to find the edge
 *   node scripts/sweep-cardiac-output.mjs --rate      # the rate axis, walked
 *
 * This is where `CONTROL_DOMAIN` came from. The ranges in
 * `src/models/cardiacOutput.js` are not a judgement about what a reader should
 * be allowed to try: they are the region this script found to settle, conserve
 * its volume and close its beat inside the declared tolerances, at every corner
 * and at a seeded sample of interior points.
 *
 * It is kept rather than thrown away because widening a control means running
 * it again — and because the failure it is guarding against (a range that was
 * plausible, never measured, and quietly produced an unsettled beat at one
 * corner) is exactly the kind that a green test suite does not show.
 *
 * `tests/cardiac-output-physiology.test.js` walks the corners on every `npm
 * test`; this script is the wider, slower survey behind the numbers.
 */
import {
  CONTROL_DOMAIN,
  CONTROL_IDS,
  RESULT_STATUS,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';

const probe = process.argv.includes('--probe');
const rateWalk = process.argv.includes('--rate');

/** Deterministic sampler: a survey that differs between runs cannot be cited. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const domain = probe
  ? {
      fillingVolumeMl: { min: 420, max: 1200 },
      systemicResistanceMmHgSPerMl: { min: 0.5, max: 2.6 },
      contractilityEesMmHgPerMl: { min: 0.45, max: 5.0 },
      heartRatePerMin: { min: 38, max: 160 },
    }
  : CONTROL_DOMAIN;

const axisPoints = (id) => {
  const { min, max } = domain[id];
  return [min, min + (max - min) / 4, (min + max) / 2, max - (max - min) / 4, max];
};

const cases = [];
// Full product of the five points on each axis: 625 conditions, corners
// included. The corners are the whole reason — a domain that only holds in its
// middle is a domain nobody has checked.
const [a, b, c, d] = CONTROL_IDS;
for (const av of axisPoints(a))
  for (const bv of axisPoints(b))
    for (const cv of axisPoints(c))
      for (const dv of axisPoints(d)) cases.push({ [a]: av, [b]: bv, [c]: cv, [d]: dv });

// Plus a seeded interior sample, because a grid can walk between two problems.
const random = seededRandom(20260921);
for (let i = 0; i < 240; i++) {
  const sample = {};
  for (const id of CONTROL_IDS) {
    const { min, max } = domain[id];
    sample[id] = min + random() * (max - min);
  }
  cases.push(sample);
}

const started = Date.now();
const failures = [];
const extremes = {
  cardiacOutputLMin: { min: Infinity, max: -Infinity },
  meanArterialPressureMmHg: { min: Infinity, max: -Infinity },
  strokeVolumeMl: { min: Infinity, max: -Infinity },
  endDiastolicPressureMmHg: { min: Infinity, max: -Infinity },
  ejectionFraction: { min: Infinity, max: -Infinity },
};
let worstPeriodic = 0;
let worstBeats = 0;
let slowestMs = 0;

for (const input of cases) {
  const t0 = Date.now();
  const result = solveCardiacOutput(input, probe ? { domain } : {});
  slowestMs = Math.max(slowestMs, Date.now() - t0);
  worstBeats = Math.max(worstBeats, result.diagnostics.beats ?? 0);
  worstPeriodic = Math.max(worstPeriodic, result.diagnostics.periodicResidualMl ?? 0);
  if (result.status !== RESULT_STATUS.VALID) {
    failures.push({ input, status: result.status, problems: result.problems });
    continue;
  }
  for (const key of Object.keys(extremes)) {
    extremes[key].min = Math.min(extremes[key].min, result.metrics[key]);
    extremes[key].max = Math.max(extremes[key].max, result.metrics[key]);
  }
}

console.log(`${probe ? 'probe' : 'declared'} domain`);
for (const id of CONTROL_IDS) console.log(`  ${id}: ${domain[id].min} .. ${domain[id].max}`);
console.log(`\n${cases.length} conditions, ${Date.now() - started} ms total, slowest solve ${slowestMs} ms`);
console.log(`most beats to settle: ${worstBeats}`);
console.log(`largest periodic residual: ${worstPeriodic.toFixed(4)} mL`);
console.log(`\nfailures: ${failures.length}`);
for (const failure of failures.slice(0, 24)) {
  const where = CONTROL_IDS.map((id) => `${id}=${failure.input[id].toFixed(2)}`).join(' ');
  console.log(`  ${failure.status}  ${where}`);
  for (const problem of failure.problems) console.log(`      ${problem}`);
}
if (failures.length > 24) console.log(`  ... and ${failures.length - 24} more`);

console.log('\nrange of the read-out over everything that settled');
for (const [key, range] of Object.entries(extremes)) {
  if (!Number.isFinite(range.min)) continue;
  console.log(`  ${key}: ${range.min.toFixed(2)} .. ${range.max.toFixed(2)}`);
}

process.exitCode = failures.length > 0 && !probe ? 1 : 0;

/**
 * The rate axis, walked, and reported as what it is: a finite grid.
 *
 * ## Why this mode exists
 *
 * The model card once asserted that somewhere inside the declared range,
 * raising the heart rate lowered cardiac output. Nothing had measured it, and
 * measuring it found no such point (L-95). The first correction then
 * overshot in the other direction and said output "is monotonically
 * increasing in rate" — which is a statement about the whole continuous
 * domain, and a finite sweep cannot make it.
 *
 * So this mode reports the sweep and nothing beyond it: which values each axis
 * took, how they were combined, how many states were solved, how many adjacent
 * pairs in rate were compared, the tolerance a decrease had to exceed to
 * count, and — the number the card quotes — the **smallest** increase seen and
 * where. A later run that finds a decrease prints it.
 *
 * It does not, and cannot, say there is no such point between the samples.
 */
if (rateWalk) {
  const EES = [0.8, 1.2, 1.6, 2.0, 2.4, 2.74, 3.2, 4.0];
  const FILL = [540, 650, 710, 830, 980];
  const SVR = [0.7, 1.0, 1.1, 1.4, 1.8];
  const RATE_STEP = 5;
  const { min: rateMin, max: rateMax } = CONTROL_DOMAIN.heartRatePerMin;
  /**
   * How much a fall has to be before it is a fall.
   *
   * The solver stops on a relative tolerance, so two neighbouring solutions
   * carry integration noise. Anything smaller than this is not a turn-over, it
   * is the last digit moving; anything larger is reported.
   */
  const DECREASE_TOLERANCE_L_MIN = 1e-6;

  const rates = [];
  for (let rate = rateMin; rate <= rateMax; rate += RATE_STEP) rates.push(rate);

  let states = 0;
  let comparisons = 0;
  let nonValid = 0;
  let smallest = null;
  const decreases = [];

  for (const contractilityEesMmHgPerMl of EES) {
    for (const fillingVolumeMl of FILL) {
      for (const systemicResistanceMmHgSPerMl of SVR) {
        let previous = null;
        for (const heartRatePerMin of rates) {
          const result = solveCardiacOutput({
            contractilityEesMmHgPerMl,
            fillingVolumeMl,
            systemicResistanceMmHgSPerMl,
            heartRatePerMin,
          });
          states += 1;
          if (result.status !== RESULT_STATUS.VALID) {
            nonValid += 1;
            previous = null;
            continue;
          }
          const output = result.metrics.cardiacOutputLMin;
          if (previous) {
            comparisons += 1;
            const delta = output - previous.output;
            const where = {
              contractilityEesMmHgPerMl,
              fillingVolumeMl,
              systemicResistanceMmHgSPerMl,
              from: previous.rate,
              to: heartRatePerMin,
              delta,
            };
            if (delta < -DECREASE_TOLERANCE_L_MIN) decreases.push(where);
            if (!smallest || delta < smallest.delta) smallest = where;
          }
          previous = { rate: heartRatePerMin, output };
        }
      }
    }
  }

  const describe = (row) =>
    `Ees ${row.contractilityEesMmHgPerMl}, filling ${row.fillingVolumeMl} mL, ` +
    `SVR ${row.systemicResistanceMmHgSPerMl}, ${row.from} → ${row.to}/min: ` +
    `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(6)} L/min`;

  console.log('\n--- the rate axis, walked ---');
  console.log(`Ees        : ${EES.join(', ')} mmHg/mL`);
  console.log(`filling    : ${FILL.join(', ')} mL`);
  console.log(`SVR        : ${SVR.join(', ')} mmHg·s/mL`);
  console.log(`rate       : ${rateMin} .. ${rateMax} /min in steps of ${RATE_STEP} (${rates.length} values)`);
  console.log('combination: the full product of the four axes');
  console.log(`states     : ${states} solved, ${nonValid} not valid`);
  console.log(`comparisons: ${comparisons} adjacent pairs in rate, at fixed everything else`);
  console.log(`tolerance  : a fall counts at more than ${DECREASE_TOLERANCE_L_MIN} L/min`);
  console.log(`smallest change: ${smallest ? describe(smallest) : 'none measured'}`);
  console.log(`falls found: ${decreases.length}`);
  for (const row of decreases.slice(0, 12)) console.log(`  ${describe(row)}`);
  console.log(
    '\nThis is a finite grid. It says no fall was found at these points; it says' +
      '\nnothing about the points between them, and nothing about why.'
  );
  if (decreases.length > 0) process.exitCode = 1;
}
