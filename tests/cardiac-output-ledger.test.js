import test from 'node:test';
import assert from 'node:assert/strict';

import { createFlowLedger, solveCardiacOutput, referenceInput } from '../src/models/cardiacOutput.js';

/**
 * The books, driven with inputs whose right answer is arithmetic.
 *
 * `createFlowLedger` exists as its own function because the thing it gets
 * wrong is invisible in the circulation: `walkBeat` calls its visitor *before*
 * integrating the step, so a window closed with the volumes that visit was
 * given compares an integral over `[t_a, t_b]` with a volume difference over
 * `[t_a, t_b − dt]`. One step of slip, in every window, and the residual it
 * produced was reported as quadrature error. An external reviewer found it by
 * reading the two functions together; nothing measured it.
 *
 * So here it is measured. Two compartments in a line, flows a test chooses,
 * volumes a test computes — and the answer known in advance.
 */

/** A → B → out, with A fed from outside. Volume indices 0 and 1. */
const WIRING = Object.freeze({
  flows: Object.freeze([
    Object.freeze({ in: 'feed', out: 'middle' }),
    Object.freeze({ in: 'middle', out: 'drain' }),
  ]),
  names: Object.freeze(['a', 'b']),
  indices: Object.freeze([0, 1]),
  keys: Object.freeze(['feed', 'middle', 'drain']),
});

/**
 * Walks a ledger the way `walkBeat` does: each visit is handed the volumes at
 * the **start** of the interval its flows act over, and the state one step on
 * is returned rather than visited.
 *
 * @param {(step:number) => {feed:number, middle:number, drain:number}} flowAt
 * @param {{steps:number, windowSteps:number, dt?:number, slipSteps?:number}} options
 */
function walk(flowAt, { steps, windowSteps, dt = 1, slipSteps = 0 }) {
  const ledger = createFlowLedger({ ...WIRING, windowSteps });
  // Exact volumes: V(t_n) is the running sum of (in − out)·dt before t_n.
  //
  // One past the end, so a slipped walk can be slipped all the way through
  // rather than running out of trajectory at the last window. The first
  // version of this stopped short, and the extra residual that produced at the
  // closing window was mine, not the ledger's.
  const volumes = [new Float64Array([0, 0])];
  for (let i = 0; i <= steps; i++) {
    const q = flowAt(i);
    const previous = volumes[i];
    volumes.push(
      new Float64Array([
        previous[0] + (q.feed - q.middle) * dt,
        previous[1] + (q.middle - q.drain) * dt,
      ])
    );
  }
  for (let i = 0; i < steps; i++) {
    // `slipSteps` hands the ledger the volumes from a different instant, which
    // is what the bug did. Zero is the honest walk.
    ledger.observe({ dt, flows: flowAt(i), volumes: volumes[i + slipSteps] });
  }
  ledger.finish(volumes[steps + slipSteps]);
  return ledger;
}

/** A flow that changes, so a shift in time is not invisible. */
const ramp = (i) => ({ feed: i, middle: i * 0.5, drain: 0 });
/** Constant flow: a shift in time *is* invisible here, which is the point. */
const steady = () => ({ feed: 2, middle: 1, drain: 0.25 });

test('ledger: with the intervals lined up, the books close exactly', () => {
  const ledger = walk(ramp, { steps: 96, windowSteps: 4 });
  assert.equal(ledger.balanceResidualMl, 0, 'the whole beat balances to the bit');
  assert.equal(ledger.windowResidualMl, 0, 'and so does every window');
});

test('ledger: one step of slip is detected, and its size is the one arithmetic predicts', () => {
  // The bug, reproduced as data. With the ramp, shifting the volumes one step
  // later adds (in − out)·dt of the *next* step to each window's difference
  // and removes the first step's — so the window residual is the change in
  // net flow across the window, times dt.
  const slipped = walk(ramp, { steps: 96, windowSteps: 4, slipSteps: 1 });
  assert.ok(slipped.windowResidualMl > 0, 'a slipped walk does not balance');

  // Compartment a's net flow is feed − middle = i − 0.5i = 0.5i, so over a
  // four-step window starting at i the slip costs 0.5·((i+4) − i) = 2.
  assert.ok(
    Math.abs(slipped.windowResidualMl - 2) < 1e-9,
    `expected a residual of 2, got ${slipped.windowResidualMl}`
  );

  // And the same walk with a flow that does not change is *not* detected —
  // which is why the minimal example had to ramp. A check whose sensitivity
  // depends on the input has to be exercised with the input that shows it.
  const invisible = walk(steady, { steps: 96, windowSteps: 4, slipSteps: 1 });
  assert.equal(invisible.windowResidualMl, 0, 'constant flow hides a shift in time');
});

test('ledger: the windows tile the walk, evenly divisible or not', () => {
  for (const [steps, windowSteps, expectedWindows] of [
    [96, 4, 24],
    [960, 40, 24],
    [100, 40, 3],
    [7, 3, 3],
    [5, 8, 1],
    [1, 1, 1],
  ]) {
    const ledger = walk(ramp, { steps, windowSteps });
    assert.equal(ledger.steps, steps, `${steps}/${windowSteps}: every step observed`);
    assert.equal(
      ledger.coveredSteps,
      steps,
      `${steps}/${windowSteps}: the windows cover ${ledger.coveredSteps} of ${steps} steps`
    );
    assert.equal(
      ledger.windowsClosed,
      expectedWindows,
      `${steps}/${windowSteps}: ${ledger.windowsClosed} windows closed`
    );
    assert.equal(ledger.windowResidualMl, 0, `${steps}/${windowSteps}: a remainder window still balances`);
  }
});

test('ledger: a walk with no steps in it reports nothing rather than zero', () => {
  // "Nothing was measured" and "the measurement came out at zero" are the same
  // number and not the same fact. `finish` on an unused ledger must not
  // manufacture a clean bill.
  const ledger = createFlowLedger({ ...WIRING, windowSteps: 4 });
  ledger.finish(new Float64Array([0, 0]));
  assert.equal(ledger.steps, 0);
  assert.equal(ledger.windowsClosed, 0, 'no window was closed, so none is reported');
  assert.equal(ledger.coveredSteps, 0);
});

test('ledger: several kinds of mis-wiring, and what each one costs', () => {
  // The separation the tolerance rests on. Each of these is a plausible
  // editing mistake, driven through the real circulation.
  const wrong = (mutate) => {
    const ledger = createFlowLedger({
      ...WIRING,
      flows: mutate(WIRING.flows.map((entry) => ({ ...entry }))),
      windowSteps: 4,
    });
    const volumes = [new Float64Array([0, 0])];
    for (let i = 0; i < 96; i++) {
      const q = ramp(i);
      const previous = volumes[i];
      volumes.push(
        new Float64Array([
          previous[0] + (q.feed - q.middle) * 1,
          previous[1] + (q.middle - q.drain) * 1,
        ])
      );
    }
    for (let i = 0; i < 96; i++) ledger.observe({ dt: 1, flows: ramp(i), volumes: volumes[i] });
    return ledger.finish(volumes[96]).windowResidualMl;
  };

  // Outflow taken from the wrong place.
  assert.ok(wrong((flows) => { flows[0].out = 'drain'; return flows; }) > 0);
  // Inflow and outflow swapped.
  assert.ok(wrong((flows) => { const t = flows[1].in; flows[1].in = flows[1].out; flows[1].out = t; return flows; }) > 0);
  // A compartment wired to itself.
  assert.ok(wrong((flows) => { flows[0].out = flows[0].in; return flows; }) > 0);
});

test('ledger: the circulation closes its books, and every step is in exactly one window', () => {
  const result = solveCardiacOutput(referenceInput());
  assert.equal(result.status, 'valid');
  const { diagnostics } = result;
  assert.equal(diagnostics.windowsClosed, 24, 'twenty-four windows');
  assert.equal(
    diagnostics.windowCoveredSteps,
    diagnostics.diagnosticSteps,
    'covering the whole closing beat, once'
  );
});
