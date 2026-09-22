import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AVAILABILITY_HIGH,
  AVAILABILITY_LOW,
  COMPUTATION,
  FUNCTION_EDGES,
  FUNCTION_NODES,
  FUNCTION_TASKS,
  MODE,
  PATHWAY_STATE,
  STIMULUS,
  lesionSiteById,
  resolveTaskResult,
  routeIsEligible,
  solveHigherBrainFunction,
} from '../src/models/higherBrainFunction.js';

/**
 * The computation contract, as opposed to the anatomy or the dissociations.
 *
 * Every case here is a way this model could report something it has no warrant
 * for: a task with no route reported as abolished, an unknown route reported as
 * blocked, a bad input silently repaired into a healthy brain, a conceptual
 * knockout leaking into an atlas result. `resolveTaskResult` is exported and
 * pure precisely so the conservative rules can be checked against constructed
 * route sets rather than only against whatever the production graph happens to
 * produce today.
 */

/** A solved route as the resolver consumes one. */
const route = (id, availability, { evaluable = true, zero = false } = {}) => ({
  id,
  steps: [
    { kind: 'node', id: `${id}-a`, label: id, labelJa: id, integrity: zero ? 0 : availability, evaluable },
    { kind: 'node', id: `${id}-b`, label: id, labelJa: id, integrity: 1, evaluable },
  ],
  availability,
  evaluable,
});

// --- T01, T03, T06: the bands ----------------------------------------------

test('contract: a fully intact graph reports the top band and no diagnosis', () => {
  const state = solveHigherBrainFunction({ lesions: [] });
  for (const task of state.tasks.filter((candidate) => candidate.modelled)) {
    assert.equal(task.availability, 1);
    assert.equal(task.state, PATHWAY_STATE.HIGH);
  }
  // And nothing the model *decides* says "normal". Checked on the fields that
  // carry a verdict rather than over the whole result — the coverage
  // limitations say "not that a person with this lesion writes normally", and a
  // blunt search over the JSON matches the sentence that denies the thing.
  for (const task of state.tasks) {
    const decided = [task.computationStatus, task.state, task.label, task.labelJa].filter(Boolean).join(' ');
    for (const word of ['normal', 'Normal', '正常', 'healthy', 'intact', 'preserved']) {
      assert.ok(!decided.includes(word), `${task.id} does not decide "${word}"`);
    }
  }
});

test('contract: the band boundaries are where they are declared, and both sides of each', () => {
  const at = (availability) => resolveTaskResult({ routes: [route('r', availability)] }).state;
  assert.equal(at(AVAILABILITY_HIGH), PATHWAY_STATE.HIGH, 'the high cut point is inclusive');
  assert.equal(at(AVAILABILITY_HIGH - 1e-6), PATHWAY_STATE.INTERMEDIATE);
  assert.equal(at(AVAILABILITY_LOW), PATHWAY_STATE.INTERMEDIATE, 'the low cut point is inclusive');
  assert.equal(at(AVAILABILITY_LOW - 1e-6), PATHWAY_STATE.LOW);
  assert.equal(at(0), PATHWAY_STATE.LOW);
  assert.equal(at(1), PATHWAY_STATE.HIGH);
});

test('contract: the bottom band is not a blockade', () => {
  // 0.2 is not 0, and the difference is the whole reason the old "lost" label
  // was retired. A route can be in the bottom band with nothing on it at zero.
  const dim = resolveTaskResult({ routes: [route('r', 0.2)] });
  assert.equal(dim.state, PATHWAY_STATE.LOW);
  assert.equal(dim.declaredBlock, false, 'nothing on it is at zero');

  const stopped = resolveTaskResult({ routes: [route('r', 0, { zero: true })] });
  assert.equal(stopped.declaredBlock, true);
});

// --- T02: one element counted once -----------------------------------------

test('contract: a step named twice on one route is counted once', () => {
  // The executive circuits return to the cortex they start from, and the
  // lexical repetition route passes its analysis node twice. Counting a
  // structure twice would make a lesion of it weigh double.
  const loop = FUNCTION_TASKS.find((task) => task.id === 'set-shifting-and-planning');
  const nodes = loop.routes[0].nodes;
  assert.equal(nodes[0], nodes.at(-1), 'the circuit is a closed loop');

  const state = solveHigherBrainFunction({
    lesions: [{ id: 'one-cortex', structures: [{ label: 'Middle frontal gyrus', side: 'dominant' }] }],
  });
  const task = state.tasks.find((candidate) => candidate.id === 'set-shifting-and-planning');
  const cortex = state.nodes.find((node) => node.id === 'dorsolateral-prefrontal');
  // One appearance, so the availability is that integrity times the rest — not
  // its square.
  const others = task.route
    .filter((step) => step.id !== 'dorsolateral-prefrontal')
    .reduce((carried, step) => carried * step.integrity, 1);
  assert.ok(
    Math.abs(task.availability - cortex.integrity * others) < 1e-3,
    `counted once (${task.availability} vs ${cortex.integrity * others})`
  );
});

// --- T04, T05: bad input is refused, never repaired ------------------------

test('contract: a bad input is an error, not a quietly healthy brain', () => {
  for (const extent of [NaN, Infinity, -Infinity, -0.5, 1.5, 'lots', null]) {
    assert.throws(
      () => solveHigherBrainFunction({ lesions: [], extent }),
      /extent/,
      `extent ${JSON.stringify(extent)} is refused`
    );
  }
  for (const severity of [NaN, Infinity, -1, 2]) {
    assert.throws(
      () => solveHigherBrainFunction({ lesions: [{ id: 'bad', structures: [], severity }] }),
      /severity/,
      `severity ${JSON.stringify(severity)} is refused`
    );
  }
  for (const share of [NaN, Infinity, -1, 2]) {
    assert.throws(
      () => solveHigherBrainFunction({
        lesions: [{ id: 'bad', structures: [{ label: 'Angular gyrus', side: 'dominant', share }] }],
      }),
      /share/,
      `share ${JSON.stringify(share)} is refused`
    );
  }
  assert.throws(() => solveHigherBrainFunction({ mode: 'something-else' }), /unknown mode/);
  assert.throws(
    () => solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions: ['not-a-process'] }),
    /nothing to switch off/
  );
  assert.throws(() => solveHigherBrainFunction({ handedness: 'left' }), /right-handedness/);
});

test('contract: the old connection channel is refused rather than ignored', () => {
  // It had no side, so selecting one internal capsule interrupted the pathway
  // on both. A lesion that still declares one is an error: silently ignoring
  // the field would make such a lesion look harmless.
  assert.throws(
    () => solveHigherBrainFunction({
      lesions: [{ id: 'old-shape', structures: [], connections: ['dorsal-phonological'] }],
    }),
    /still declares/
  );
});

test('contract: an element claiming an atlas mapping and naming no structure is an error', () => {
  for (const node of FUNCTION_NODES) {
    if (node.mapping === 'conceptual') continue;
    assert.ok(node.structures.length > 0, `${node.id} names at least one structure`);
  }
  for (const edge of FUNCTION_EDGES) {
    if (edge.mapping === 'conceptual') continue;
    assert.ok(edge.within.length > 0, `${edge.id} runs within at least one structure`);
  }
});

// --- T07: eligibility by stimulus ------------------------------------------

test('contract: a route declared for known words is not eligible for a nonword', () => {
  const lexical = { id: 'lexical', stimuli: [STIMULUS.KNOWN_WORD], nodes: [] };
  const any = { id: 'any', nodes: [] };
  assert.equal(routeIsEligible(lexical, STIMULUS.KNOWN_WORD), true);
  assert.equal(routeIsEligible(lexical, STIMULUS.NONWORD), false);
  assert.equal(routeIsEligible(any, STIMULUS.NONWORD), true, 'a route with no declaration serves any');

  // And the ineligible route is reported as declared-and-refused rather than
  // silently dropped, so a reader can see that it exists.
  const state = solveHigherBrainFunction({ lesions: [] });
  const nonword = state.tasks.find((task) => task.id === 'writing-to-dictation-nonword');
  assert.deepEqual(nonword.ineligibleRouteIds, ['dictation-lexical']);
});

// --- T08, T09, T10, T11: the four conservative rules ----------------------

test('contract: no eligible route is not availability zero', () => {
  const none = resolveTaskResult({ routes: [] });
  assert.equal(none.computationStatus, COMPUTATION.NOT_MODELLED);
  assert.equal(none.availability, null, 'not 0');
  assert.equal(none.state, null, 'and not a band');
  assert.equal(none.declaredBlock, false, 'and not a blockade');

  // Every declared route ineligible is the same answer, with the reason kept.
  const allIneligible = resolveTaskResult({ routes: [], ineligibleRouteIds: ['a', 'b'] });
  assert.equal(allIneligible.computationStatus, COMPUTATION.NOT_MODELLED);
  assert.deepEqual(allIneligible.ineligibleRouteIds, ['a', 'b']);
});

test('contract: every evaluated route blocked plus an unknown one is not "all blocked"', () => {
  const result = resolveTaskResult({
    routes: [route('known', 0, { zero: true }), route('unknown', 1, { evaluable: false })],
  });
  assert.equal(result.computationStatus, COMPUTATION.INDETERMINATE);
  assert.equal(result.availability, null);
  assert.equal(result.state, null);
  assert.equal(result.declaredBlock, false, 'a blockade is not concluded');
  assert.deepEqual(result.unevaluatedRouteIds, ['unknown']);
});

test('contract: a known value is not the best route while an eligible route is unknown', () => {
  // 0.6 with an unknown sibling is 0.6 of one route. Reporting it as the
  // task's value claims the unknown one is worse, which is not known.
  const mixed = resolveTaskResult({
    routes: [route('known', 0.6), route('unknown', 1, { evaluable: false })],
  });
  assert.notEqual(mixed.availability, 0.6, 'not reported as the task value');
  assert.equal(mixed.computationStatus, COMPUTATION.INDETERMINATE);

  // The top band does settle it: an unknown route can only be equal or better,
  // so "there is a way through" survives not knowing what it is worth.
  const reaching = resolveTaskResult({
    routes: [route('known', 0.9), route('unknown', 1, { evaluable: false })],
  });
  assert.equal(reaching.computationStatus, COMPUTATION.COMPUTED);
  assert.equal(reaching.availability, 0.9);
  assert.deepEqual(reaching.unevaluatedRouteIds, ['unknown'], 'and the unknown one is still reported');
});

test('contract: every route unknown is indeterminate, not intact', () => {
  const result = resolveTaskResult({ routes: [route('unknown', 1, { evaluable: false })] });
  assert.equal(result.computationStatus, COMPUTATION.INDETERMINATE);
  assert.equal(result.availability, null, 'an unevaluated 1 is not a reported 1');
});

test('contract: a task with no declared route is not modelled, and cannot be compared against', () => {
  const state = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-angular')] });
  for (const id of ['calculation-and-body-schema', 'reading-aloud', 'connected-speech-fluency']) {
    const task = state.tasks.find((candidate) => candidate.id === id);
    assert.equal(task.computationStatus, COMPUTATION.NOT_MODELLED);
    assert.equal(task.availability, null);
    assert.equal(task.state, null);
    assert.deepEqual(task.evaluatedRouteIds, []);
    // And it says, in its own words, that it is absent rather than fine.
    assert.ok(task.excludesJa.length > 0, `${id} says what it does not cover`);
  }
});

// --- T12, T13: order and monotonicity --------------------------------------

test('contract: the answer does not depend on the order things are declared in', () => {
  const site = lesionSiteById('dominant-perisylvian');
  const forward = solveHigherBrainFunction({ lesions: [site] });
  const reversed = solveHigherBrainFunction({
    lesions: [{ ...site, structures: [...site.structures].reverse() }],
  });
  assert.deepEqual(
    forward.tasks.map((task) => [task.id, task.computationStatus, task.availability]),
    reversed.tasks.map((task) => [task.id, task.computationStatus, task.availability])
  );

  // Two lesions in either order are the same two lesions.
  const a = { id: 'a', structures: [{ label: 'Angular gyrus', side: 'dominant' }] };
  const b = { id: 'b', structures: [{ label: 'Supramarginal gyrus', side: 'dominant' }] };
  const ab = solveHigherBrainFunction({ lesions: [a, b] });
  const ba = solveHigherBrainFunction({ lesions: [b, a] });
  assert.deepEqual(
    ab.tasks.map((task) => task.availability),
    ba.tasks.map((task) => task.availability)
  );

  // And a tie between two routes is broken the same way every time.
  const tie = () => resolveTaskResult({ routes: [route('first', 0.5), route('second', 0.5)] }).route[0].id;
  assert.equal(tie(), 'first-a');
  assert.equal(tie(), 'first-a');
});

test('contract: more damage never raises availability, for every task and every site', () => {
  for (const site of [lesionSiteById('dominant-perisylvian'), lesionSiteById('dominant-arcuate')]) {
    const previous = new Map();
    for (const extent of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      for (const task of solveHigherBrainFunction({ lesions: [site], extent }).tasks) {
        if (task.availability === null) continue;
        const before = previous.get(task.id);
        if (before !== undefined) {
          assert.ok(
            task.availability <= before + 1e-9,
            `${site.id}/${task.id} rose from ${before} to ${task.availability} at extent ${extent}`
          );
        }
        previous.set(task.id, task.availability);
      }
    }
  }
});

// --- T14: the graph is walkable --------------------------------------------

test('contract: a route naming something undeclared is an error, not a silent skip', () => {
  // Both of these used to be possible to write and would have produced a task
  // that quietly evaluated fewer steps than it declared.
  const nodeIds = new Set(FUNCTION_NODES.map((node) => node.id));
  for (const task of FUNCTION_TASKS) {
    for (const declared of task.routes) {
      for (const nodeId of declared.nodes) {
        assert.ok(nodeIds.has(nodeId), `${task.id}/${declared.id} names a declared process (${nodeId})`);
      }
    }
  }
  // Every route id is unique within its task, so `evaluatedRouteIds` can be read.
  for (const task of FUNCTION_TASKS) {
    const ids = task.routes.map((declared) => declared.id);
    assert.equal(new Set(ids).size, ids.length, `${task.id} has distinct route ids`);
  }
});

// --- the two modes ---------------------------------------------------------

test('contract: the two modes refuse to be mixed', () => {
  assert.throws(
    () => solveHigherBrainFunction({ mode: MODE.ATLAS_LESION, interventions: ['auditory-input'] }),
    /conceptual intervention was passed in atlas-lesion mode/
  );
  assert.throws(
    () => solveHigherBrainFunction({
      mode: MODE.CONCEPTUAL,
      lesions: [lesionSiteById('dominant-arcuate')],
    }),
    /atlas lesion was passed in conceptual mode/
  );
});

test('contract: the mode a result came from is on the result', () => {
  const lesion = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-arcuate')] });
  assert.equal(lesion.mode, MODE.ATLAS_LESION);
  assert.deepEqual(lesion.interventions, []);

  const conceptual = solveHigherBrainFunction({
    mode: MODE.CONCEPTUAL,
    interventions: ['orthographic-visual-form'],
  });
  assert.equal(conceptual.mode, MODE.CONCEPTUAL);
  assert.deepEqual(conceptual.interventions, ['orthographic-visual-form']);
  assert.equal(conceptual.affectedStructures.length, 0, 'a knockout damages no structure');
});

test('contract: a process with no mesh is assumed available, and says so', () => {
  const state = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-angular')] });
  const buffer = state.nodes.find((node) => node.id === 'graphemic-buffer');
  assert.equal(buffer.integrity, 1);
  assert.equal(buffer.assumed, true, 'and it is marked as an assumption');

  // Every task whose route passes through it carries that as a limitation, so
  // "no mesh" can never be read as evidence of health.
  const writing = state.tasks.find((task) => task.id === 'writing-to-dictation-nonword');
  assert.ok(
    writing.coverageLimitationsJa.some((limit) => /仮定/.test(limit)),
    `the assumption reaches the result (${writing.coverageLimitationsJa.join(' / ')})`
  );
});

test('contract: the same input gives the same output, twice running', () => {
  const once = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-watershed-both')], extent: 0.6 });
  const twice = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-watershed-both')], extent: 0.6 });
  assert.deepEqual(JSON.parse(JSON.stringify(once)), JSON.parse(JSON.stringify(twice)));
});

test('contract: no declared process is inert, and no route is strictly dominated', () => {
  // Two ways to carry a claim the model never makes. A node nothing can ever
  // be changed by is decoration on the diagram; a route that can never be the
  // best one is a way round that never opens. The angular gyrus was both: it
  // was on a third reading route that added steps to the ventral one and so
  // could never beat it, and with the Gerstmann task declared not-modelled
  // that node could not change any answer at all.
  const baseline = solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions: [] });
  const modelled = baseline.tasks.filter((task) => task.modelled).map((task) => task.id);
  const changedBy = (interventions) => {
    const state = solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions });
    return modelled.filter((id) => {
      const before = baseline.tasks.find((task) => task.id === id);
      const after = state.tasks.find((task) => task.id === id);
      return before.availability !== after.availability
        || before.computationStatus !== after.computationStatus;
    });
  };

  // These three change nothing on their own *by declaration*: each is one half
  // of an alternative the model states — two visual fields into the same form
  // process, and two parietal lobes attending to the right of space. Knocking
  // out the pair has to change something, or the alternative is fiction.
  const alternatives = {
    'visual-input-dominant': ['visual-input-nondominant'],
    'visual-input-nondominant': ['visual-input-dominant'],
    'spatial-attention-dominant': ['spatial-attention-nondominant'],
  };
  for (const node of FUNCTION_NODES) {
    const alone = changedBy([node.id]);
    if (alone.length > 0) continue;
    const pair = alternatives[node.id];
    assert.ok(pair, `${node.id} changes nothing and is not a declared alternative`);
    assert.ok(
      changedBy([node.id, ...pair]).length > 0,
      `${node.id} and its alternative change nothing together either`
    );
  }

  // And every declared route can be the reported one under some single
  // knockout, so no route is a way round that never opens.
  const reported = new Set();
  const record = (state) => {
    for (const task of state.tasks) {
      for (const id of task.evaluatedRouteIds) {
        if (task.route && task.route.length > 0) reported.add(`${task.id}:${task.evaluatedRouteIds[0]}`);
      }
    }
  };
  const bestRouteOf = (state, taskId) => {
    const task = state.tasks.find((candidate) => candidate.id === taskId);
    if (!task?.route) return null;
    return task.route.map((step) => step.id).join('>');
  };
  for (const task of FUNCTION_TASKS.filter((candidate) => candidate.modelled && candidate.routes.length > 1)) {
    const shapes = new Set();
    shapes.add(bestRouteOf(baseline, task.id));
    // Connections as well as nodes: the way round through meaning only becomes
    // the reported route when the *bundle* between analysis and output is cut,
    // and no single node does that.
    for (const element of [...FUNCTION_NODES, ...FUNCTION_EDGES]) {
      const state = solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions: [element.id] });
      const shape = bestRouteOf(state, task.id);
      if (shape) shapes.add(shape);
    }
    const eligible = task.routes.filter((route) => routeIsEligible(route, task.stimulus));
    assert.ok(
      shapes.size >= eligible.length,
      `${task.id} reports ${shapes.size} distinct routes for ${eligible.length} eligible ones — `
      + 'one of them can never be the best'
    );
  }
  record(baseline);
});
