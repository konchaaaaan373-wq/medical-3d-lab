#!/usr/bin/env node
/**
 * Sweeps the cardiac-output experiment's input domain and reports what settles.
 *
 *   node scripts/sweep-cardiac-output.mjs             # the declared domain
 *   node scripts/sweep-cardiac-output.mjs --probe     # wider, to find the edge
 *   node scripts/sweep-cardiac-output.mjs --rate      # the rate axis, walked
 *   node scripts/sweep-cardiac-output.mjs --steps     # does the step size matter
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
const stepStudy = process.argv.includes('--steps');
const recordAt = process.argv.indexOf('--record');
/** Filled by whichever modes ran, and written out at the end when asked. */
let rateRecord = null;
let sweepRecord = null;

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
// The two balances, at scale. The window tolerance is chosen from the gap
// between these and the mis-wiring residuals, so the number it is chosen from
// has to be measured over the whole domain rather than a corner or two.
let worstWholeBalance = 0;
let worstWholeAt = null;
let worstWindowBalance = 0;
let worstWindowAt = null;

for (const input of cases) {
  const t0 = Date.now();
  const result = solveCardiacOutput(input, probe ? { domain } : {});
  slowestMs = Math.max(slowestMs, Date.now() - t0);
  worstBeats = Math.max(worstBeats, result.diagnostics.beats ?? 0);
  worstPeriodic = Math.max(worstPeriodic, result.diagnostics.periodicResidualMl ?? 0);
  if ((result.diagnostics.balanceResidualMl ?? 0) > worstWholeBalance) {
    worstWholeBalance = result.diagnostics.balanceResidualMl;
    worstWholeAt = { ...input, compartment: result.diagnostics.worstBalanceCompartment };
  }
  if ((result.diagnostics.windowResidualMl ?? 0) > worstWindowBalance) {
    worstWindowBalance = result.diagnostics.windowResidualMl;
    worstWindowAt = { ...input, compartment: result.diagnostics.worstWindowCompartment };
  }
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
const at = (row) =>
  row
    ? ` (${row.compartment}, ` +
      CONTROL_IDS.map((id) => `${id}=${typeof row[id] === 'number' ? row[id].toFixed(2) : row[id]}`).join(' ') +
      ')'
    : '';
console.log(`largest whole-beat balance residual: ${worstWholeBalance.toFixed(4)} mL${at(worstWholeAt)}`);
console.log(`largest window balance residual: ${worstWindowBalance.toFixed(4)} mL${at(worstWindowAt)}`);
sweepRecord = {
  conditions: cases.length,
  failures: failures.length,
  largestPeriodicResidualMl: worstPeriodic,
  largestWholeBeatBalanceMl: worstWholeBalance,
  largestWindowBalanceMl: worstWindowBalance,
  largestWindowBalanceAt: worstWindowAt,
};
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

  // A run that measured less than it set out to is not a run that found
  // nothing. Without this, a refused solve or a narrowed grid would print
  // "falls found: 0" and exit 0, and the card would go on quoting a record
  // that no longer had anything behind it.
  const expectedStates = EES.length * FILL.length * SVR.length * rates.length;
  const expectedComparisons = EES.length * FILL.length * SVR.length * (rates.length - 1);
  if (nonValid > 0) {
    console.error(`\n${nonValid} state(s) did not settle; the record below is incomplete.`);
    process.exitCode = 1;
  }
  if (states !== expectedStates || comparisons !== expectedComparisons) {
    console.error(
      `\nexpected ${expectedStates} states and ${expectedComparisons} comparisons, ` +
        `walked ${states} and ${comparisons}.`
    );
    process.exitCode = 1;
  }
  if (decreases.length > 0) process.exitCode = 1;

  rateRecord = {
    axes: { contractilityEesMmHgPerMl: EES, fillingVolumeMl: FILL, systemicResistanceMmHgSPerMl: SVR },
    rate: { min: rateMin, max: rateMax, step: RATE_STEP, values: rates.length },
    combination: 'the full product of the four axes',
    states,
    nonValid,
    comparisons,
    toleranceLMin: DECREASE_TOLERANCE_L_MIN,
    fallsFound: decreases.length,
    smallestChange: smallest
      ? {
          deltaLMin: smallest.delta,
          contractilityEesMmHgPerMl: smallest.contractilityEesMmHgPerMl,
          fillingVolumeMl: smallest.fillingVolumeMl,
          systemicResistanceMmHgSPerMl: smallest.systemicResistanceMmHgSPerMl,
          fromPerMin: smallest.from,
          toPerMin: smallest.to,
        }
      : null,
  };
}


/**
 * Does the answer depend on how finely it was integrated?
 *
 * The boundary walks a **closing** beat at 960 steps to check periodicity, and
 * an external reviewer pointed out that this establishes less than it looks
 * like: checking a 240-step solution with a 960-step pass says the 240-step
 * state is periodic, not that the figures it produced are converged. Those are
 * different questions and only one of them was being asked.
 *
 * So this solves each condition to steady state **independently** at each
 * resolution and compares what a reader would be shown. Absolute and relative
 * together, because stroke volume and filling pressure do not share a scale
 * and a relative tolerance on a quantity near zero says nothing.
 */
if (stepStudy) {
  const RESOLUTIONS = [240, 480, 960];
  const WATCHED = [
    { key: 'cardiacOutputLMin', absolute: 0.05, relative: 0.01 },
    { key: 'strokeVolumeMl', absolute: 0.5, relative: 0.01 },
    { key: 'ejectionFraction', absolute: 0.005, relative: 0.01 },
    { key: 'meanArterialPressureMmHg', absolute: 0.5, relative: 0.01 },
    { key: 'endDiastolicPressureMmHg', absolute: 0.5, relative: 0.02 },
    { key: 'meanPulmonaryVenousPressureMmHg', absolute: 0.5, relative: 0.02 },
    { key: 'edvMl', absolute: 0.5, relative: 0.01 },
    { key: 'esvMl', absolute: 0.5, relative: 0.01 },
    { key: 'ejectionStartPhase', absolute: 0.01, relative: 0.05 },
    { key: 'ejectionEndPhase', absolute: 0.01, relative: 0.05 },
  ];
  // Corners and centre, so the cases where the integrator has most to do are
  // in it rather than a comfortable middle.
  const cases = [];
  for (const contractilityEesMmHgPerMl of [0.8, 2.74, 4.0])
    for (const fillingVolumeMl of [540, 710, 980])
      for (const systemicResistanceMmHgSPerMl of [0.7, 1.1, 1.8])
        for (const heartRatePerMin of [50, 70, 110])
          cases.push({
            contractilityEesMmHgPerMl,
            fillingVolumeMl,
            systemicResistanceMmHgSPerMl,
            heartRatePerMin,
          });

  const worst = new Map(WATCHED.map((w) => [w.key, { absolute: 0, relative: 0, at: null }]));
  const outside = [];
  let solved = 0;
  let refused = 0;

  for (const input of cases) {
    const byResolution = RESOLUTIONS.map((stepsPerBeat) =>
      solveCardiacOutput(input, { stepsPerBeat, diagnosticSteps: stepsPerBeat * 4 })
    );
    solved += byResolution.length;
    if (byResolution.some((result) => result.status !== RESULT_STATUS.VALID)) {
      refused += 1;
      const which = byResolution
        .map((result, i) => (result.status === RESULT_STATUS.VALID ? null : `${RESOLUTIONS[i]}: ${result.status}`))
        .filter(Boolean);
      outside.push({ input, key: 'status', note: which.join(', ') });
      continue;
    }
    // Against the finest, which is the best answer available here — not
    // against each other, which would hide a drift that is monotonic.
    const finest = byResolution[byResolution.length - 1].metrics;
    for (const { key, absolute, relative } of WATCHED) {
      for (let i = 0; i < RESOLUTIONS.length - 1; i++) {
        const value = byResolution[i].metrics[key];
        const reference = finest[key];
        const absoluteGap = Math.abs(value - reference);
        const relativeGap = Math.abs(reference) > 0 ? absoluteGap / Math.abs(reference) : 0;
        const record = worst.get(key);
        if (absoluteGap > record.absolute) {
          record.absolute = absoluteGap;
          record.relative = relativeGap;
          record.at = { ...input, steps: RESOLUTIONS[i] };
        }
        // Outside only when **both** are exceeded: an absolute gap on a small
        // quantity and a relative gap on a large one are each fine alone.
        if (absoluteGap > absolute && relativeGap > relative) {
          outside.push({ input, key, note: `${RESOLUTIONS[i]} steps: ${value} vs ${reference} at 960` });
        }
      }
    }
  }

  console.log('\n--- does the step size change the answer ---');
  console.log(`resolutions: ${RESOLUTIONS.join(', ')} steps per beat, each solved to steady state on its own`);
  console.log(`conditions : ${cases.length} (corners and centre of all four axes), ${solved} solves`);
  console.log(`refused    : ${refused}`);
  console.log('worst gap against the 960-step solve, per figure:');
  for (const { key } of WATCHED) {
    const record = worst.get(key);
    const at = record.at
      ? ` at ${record.at.steps} steps, Ees ${record.at.contractilityEesMmHgPerMl}, ` +
        `filling ${record.at.fillingVolumeMl}, SVR ${record.at.systemicResistanceMmHgSPerMl}, ` +
        `${record.at.heartRatePerMin}/min`
      : '';
    console.log(
      `  ${key.padEnd(34)} ${record.absolute.toExponential(2)} absolute, ` +
        `${(record.relative * 100).toFixed(4)}%${at}`
    );
  }
  console.log(`\noutside both tolerances: ${outside.length}`);
  for (const row of outside.slice(0, 12)) {
    const where = CONTROL_IDS.map((id) => `${id}=${row.input[id]}`).join(' ');
    console.log(`  ${row.key}  ${where}\n      ${row.note}`);
  }
  if (outside.length > 0) process.exitCode = 1;
}


/**
 * The numbers the documents quote, written where a test can read them.
 *
 * Not a reporting framework: one file, the figures this script measured, and
 * `tests/cardiac-output-claims.test.js` checking that the model card quotes
 * these and not something a previous run produced. The card carried "85 mL/s"
 * and "1.4 mmHg" long after neither was reproducible, and a guard that only
 * pins the card's own strings cannot notice that.
 */
if (recordAt >= 0) {
  const { writeFileSync } = await import('node:fs');
  const path = process.argv[recordAt + 1] ?? 'docs/model-evidence/cardiac-output-measurements.json';
  const existing = await import('node:fs').then(({ existsSync, readFileSync }) =>
    existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
  );
  const record = {
    ...existing,
    recordedAt: new Date().toISOString().slice(0, 10),
    ...(sweepRecord ? { sweep: sweepRecord } : {}),
    ...(rateRecord ? { rateWalk: rateRecord } : {}),
  };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\nrecorded to ${path}`);
}
