import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AVAILABILITY_HIGH,
  AVAILABILITY_LOW,
  COMPUTATION,
  FUNCTION_EDGES,
  FUNCTION_NODES,
  FUNCTION_TASKS,
  MAPPING,
  MODE,
  MODELLED_STRUCTURE_LABELS,
  MODULATORY_NETWORKS,
  NOT_MODELLED_REASON,
  PATHWAY_STATE,
  STIMULUS,
  functionsOfStructure,
  isBelowDisplayFloor,
  lesionSiteById,
  resolveTaskResult,
  roundForDisplay,
  routeIsEligible,
  solveHigherBrainFunction,
} from '../src/models/higherBrainFunction.js';
import { APHASIA_LIBRARY } from '../src/data/aphasiaReference.js';
import { ROUTE_DISPLAY_TEXT } from '../src/data/higherBrainFunction.js';
import HigherBrainFunctionScene from '../src/scenes/nervous/scenes/higherBrainFunction/index.js';
import { functionNoteForSelection } from '../src/scenes/nervous/scenes/higherBrainFunction/structureFunctions.js';
import { fixtureAtlas } from './fixtures/brainAtlas.js';

/**
 * The second audit's counter-examples, one test each.
 *
 * Every case in this file is something the model or the picture *said* at the
 * audited head and should not have. They are kept together rather than spread
 * through the other four files because what they have in common is the shape of
 * the mistake: a value the model does not have, reported as one — a lower bound
 * as a maximum, a rounding as a zero, a display anchor as a dependency, a
 * declared route as an available one, a preset's prose as the model's own
 * knowledge. The sixth is the same mistake made by the renderer, which is the
 * one place a caveat in a read-out cannot reach.
 */

/** A solved route as the resolver consumes one. `zero` is a *true* zero. */
const route = (id, availability, { evaluable = true, zero = false } = {}) => ({
  id,
  steps: [
    {
      kind: 'node', id: `${id}-a`, label: id, labelJa: id,
      integrity: zero ? 0 : availability, evaluable, blocked: zero,
    },
    { kind: 'node', id: `${id}-b`, label: id, labelJa: id, integrity: 1, evaluable, blocked: false },
  ],
  availability,
  evaluable,
});

// --- AR2-T01, T02, T03, T05: a band is not a number -------------------------

test('AR2-T01: an evaluated 0.6 beside an unknown route settles nothing', () => {
  const result = resolveTaskResult({ routes: [route('known', 0.6), route('unknown', 0, { evaluable: false })] });
  assert.equal(result.computationStatus, COMPUTATION.INDETERMINATE);
  assert.equal(result.availability, null);
  assert.equal(result.state, null);
  assert.deepEqual(result.availabilityBounds, { lower: 0.6, upper: 1 });
  assert.equal(result.establishedBand, null, '0.6-to-1 crosses a band boundary');
});

test('AR2-T02: 0.85, 0.9 and 0.9999 with an unknown route establish a band and not a value', () => {
  for (const known of [AVAILABILITY_HIGH, 0.9, 0.9999]) {
    const result = resolveTaskResult({
      routes: [route('known', known), route('unknown', 0, { evaluable: false })],
    });
    assert.equal(result.computationStatus, COMPUTATION.INDETERMINATE, `${known}`);
    assert.equal(result.availability, null, `${known} is not the task's value`);
    assert.equal(result.establishedBand, PATHWAY_STATE.HIGH, `${known}-to-1 is one band`);
    assert.deepEqual(result.availabilityBounds, { lower: known, upper: 1 });
  }
  // And the same shape in the bottom band: 0.1-to-1 spans everything.
  const dim = resolveTaskResult({ routes: [route('known', 0.1), route('unknown', 0, { evaluable: false })] });
  assert.equal(dim.establishedBand, null);
  assert.deepEqual(dim.availabilityBounds, { lower: 0.1, upper: 1 });
});

test('AR2-T03: an evaluated 1 settles the maximum and erases nothing', () => {
  const result = resolveTaskResult({
    routes: [route('known', 1), route('unknown', 0, { evaluable: false })],
    ineligibleRouteIds: ['refused'],
  });
  assert.equal(result.computationStatus, COMPUTATION.COMPUTED);
  assert.equal(result.availability, 1);
  assert.deepEqual(result.unevaluatedRouteIds, ['unknown']);
  assert.deepEqual(result.ineligibleRouteIds, ['refused']);
  assert.equal(result.declaredBlock, false, 'an unknown route is outstanding');
});

test('AR2-T04: every eligible route evaluated and each at a true zero is a blockade', () => {
  const result = resolveTaskResult({
    routes: [route('a', 0, { zero: true }), route('b', 0, { zero: true })],
  });
  assert.equal(result.computationStatus, COMPUTATION.COMPUTED);
  assert.equal(result.declaredBlock, true);
  assert.equal(result.state, PATHWAY_STATE.LOW);
});

test('AR2-T05: a blocked route beside an unknown one is not a blockade', () => {
  const result = resolveTaskResult({
    routes: [route('known', 0, { zero: true }), route('unknown', 0, { evaluable: false })],
  });
  assert.equal(result.computationStatus, COMPUTATION.INDETERMINATE);
  assert.equal(result.declaredBlock, false, 'the task is not concluded blocked');
  assert.equal(result.routeDeclaredBlock, true, 'the route that was evaluated is');
});

test('AR2-T06: no eligible route is a stated state, and says which of the two it is', () => {
  const none = resolveTaskResult({ routes: [] });
  assert.equal(none.computationStatus, COMPUTATION.NOT_MODELLED);
  assert.equal(none.notModelledReason, NOT_MODELLED_REASON.NO_ROUTE_DECLARED);
  assert.equal(none.availability, null);
  assert.equal(none.state, null);

  const refused = resolveTaskResult({ routes: [], ineligibleRouteIds: ['lexical'] });
  assert.equal(refused.notModelledReason, NOT_MODELLED_REASON.NO_ELIGIBLE_ROUTE);
  assert.deepEqual(refused.ineligibleRouteIds, ['lexical']);
  // Neither of them is 0, 1 or -Infinity.
  for (const result of [none, refused]) {
    assert.notEqual(result.availability, 0);
    assert.notEqual(result.availability, 1);
    assert.ok(!Number.isFinite(result.availability));
  }
});

// --- AR2-T07: rounding is display, and a true zero is an input --------------

test('AR2-T07: a structure destroyed to 0.99996 leaves a positive route, not a severed one', () => {
  const solved = solveHigherBrainFunction({
    lesions: [{ id: 'nearly', severity: 0.99996, structures: [{ label: 'Arcuate fasciculus', side: 'dominant' }] }],
  });
  const task = solved.tasks.find((candidate) => candidate.id === 'repetition-nonword');
  assert.equal(task.computationStatus, COMPUTATION.COMPUTED);
  assert.ok(task.availability > 0, `still positive (${task.availability})`);
  assert.equal(task.declaredBlock, false, 'a rounding is not a blockade');
  // It would round to zero on a panel, and that is a fact about the panel.
  assert.equal(roundForDisplay(task.availability), 0);
  assert.ok(isBelowDisplayFloor(task.availability), 'and the read-out can say so rather than print 0');
  // No step of it is blocked, which is what `declaredBlock` rests on.
  assert.ok(!task.route.some((step) => step.blocked), 'nothing on the route is at a true zero');

  // Taken all the way, the same lesion *is* a blockade.
  const whole = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-arcuate')] });
  const cut = whole.tasks.find((candidate) => candidate.id === 'repetition-nonword');
  assert.equal(cut.declaredBlock, true);
  assert.ok(cut.route.some((step) => step.blocked));
});

// --- AR2-T08, T09, T10: the helper's own contract ---------------------------

test('AR2-T08: an evaluable route with an impossible value is refused, not sorted', () => {
  for (const bad of [Number.NaN, Infinity, -Infinity, -0.1, 1.5]) {
    assert.throws(
      () => resolveTaskResult({ routes: [route('bad', bad)] }),
      /availability/,
      `${bad} is refused`
    );
  }
  // An *unevaluable* route carries no value by definition, and is not refused
  // for not having one.
  assert.doesNotThrow(() => resolveTaskResult({
    routes: [route('known', 0.5), { id: 'unknown', steps: [], availability: null, evaluable: false }],
  }));
});

test('AR2-T09: no return branch loses a route-id list', () => {
  const cases = [
    resolveTaskResult({ routes: [], ineligibleRouteIds: ['x'] }),
    resolveTaskResult({ routes: [route('u', 0, { evaluable: false })], ineligibleRouteIds: ['x'] }),
    resolveTaskResult({ routes: [route('k', 0.5), route('u', 0, { evaluable: false })], ineligibleRouteIds: ['x'] }),
    resolveTaskResult({ routes: [route('k', 0.5)], ineligibleRouteIds: ['x'] }),
  ];
  for (const result of cases) {
    assert.ok(Array.isArray(result.evaluatedRouteIds), 'evaluated ids');
    assert.ok(Array.isArray(result.unevaluatedRouteIds), 'unevaluated ids');
    assert.deepEqual(result.ineligibleRouteIds, ['x'], 'ineligible ids survive every branch');
    assert.ok('notModelledReason' in result);
    assert.ok('availabilityBounds' in result);
  }
});

test('AR2-T10: the order routes are declared in does not change the answer', () => {
  const forward = resolveTaskResult({ routes: [route('a', 0.4), route('b', 0.9), route('c', 0.2)] });
  const backward = resolveTaskResult({ routes: [route('c', 0.2), route('b', 0.9), route('a', 0.4)] });
  assert.equal(forward.availability, backward.availability);
  assert.equal(forward.state, backward.state);
  assert.equal(forward.routeId, 'b');
  assert.equal(backward.routeId, 'b');
  // A tie goes to the earlier declaration, which is stated rather than left to
  // whatever `reduce` happens to do.
  const tie = resolveTaskResult({ routes: [route('first', 0.5), route('second', 0.5)] });
  assert.equal(tie.routeId, 'first');
});

// --- AR2-T11 … T15: what the picture says -----------------------------------

const ATLAS = fixtureAtlas();
const scenes = [];

function buildScene(controls = {}, progress = 1) {
  const scene = new HigherBrainFunctionScene({ atlas: ATLAS.clone(true) });
  scene.build();
  for (const [id, value] of Object.entries(controls)) scene.setModelControl(id, value);
  scene.setProgress(progress);
  scenes.push(scene);
  return scene;
}

test.after(() => {
  for (const scene of scenes) scene.dispose?.();
});

test('AR2-T11: a positive route reaches the end and answers, however dim', () => {
  const { DISPLAY } = HigherBrainFunctionScene;
  // Three-quarters of the arcuate, which leaves nonword repetition positive and
  // well below the top band.
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 0.8);
  const task = scene.tracedTask();
  assert.equal(task.computationStatus, COMPUTATION.COMPUTED);
  assert.ok(task.availability > 0 && task.availability < AVAILABILITY_LOW, `${task.availability}`);

  const display = scene.routeDisplay();
  assert.equal(display.kind, DISPLAY.WEAK);
  assert.equal(display.reach, 1, 'a positive route is not stopped part-way');
  assert.equal(display.stop, null, 'and there is no stopping place to draw');
  assert.ok(display.strength > 0, 'something comes back');
  assert.equal(scene.blockedFraction(), 1);

  // And the same lesion taken all the way is a different picture.
  const cut = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const stopped = cut.routeDisplay();
  assert.equal(stopped.kind, DISPLAY.BLOCKED);
  assert.ok(stopped.reach < 1);
  assert.equal(cut.answerStrength(), 0);
  assert.ok(display.strength > cut.answerStrength(), 'weak answers; severed does not');
});

test('AR2-T12: where it stops is the step that is at zero', () => {
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const stop = scene.blockingStep();
  assert.ok(stop, 'there is a stopping place');
  assert.equal(stop.integrity, 0);
  assert.equal(stop.blocked, true);
  assert.equal(stop.id, 'dorsal-phonological', 'the connection the lesion destroyed');
});

test('AR2-T13: indeterminate and not-modelled are not drawn as a stop', () => {
  const { DISPLAY } = HigherBrainFunctionScene;
  const scene = buildScene({ task: 'reading-aloud' });
  // `reading-aloud` is declared with no route at all.
  const absent = scene.solved.tasks.find((task) => task.id === 'reading-aloud');
  assert.equal(absent.computationStatus, COMPUTATION.NOT_MODELLED);

  const displays = new Set();
  for (const task of scene.solved.tasks) {
    const display = scene.routeDisplay(task);
    displays.add(display.kind);
    if (display.kind === DISPLAY.NOT_MODELLED || display.kind === DISPLAY.INDETERMINATE) {
      assert.equal(display.stop, null, `${task.id} has no stopping place`);
    }
  }
  assert.ok(displays.has(DISPLAY.NOT_MODELLED));
  // Each state has its own sentence, and no two of them share one.
  const sentences = Object.values(ROUTE_DISPLAY_TEXT).map((entry) => entry.labelJa);
  assert.equal(new Set(sentences).size, sentences.length);
  for (const kind of Object.values(DISPLAY)) assert.ok(ROUTE_DISPLAY_TEXT[kind], `${kind} has copy`);
});

test('AR2-T14: one route stopping is not the task being unable', () => {
  // Repeating a *known* word has a way round through its meaning, so cutting
  // the dorsal route leaves the task with another route.
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-word' }, 1);
  const task = scene.tracedTask();
  assert.equal(task.computationStatus, COMPUTATION.COMPUTED);
  assert.equal(task.declaredBlock, false, 'the task is not blocked');
  assert.ok(task.evaluatedRouteIds.length > 1, 'it declares more than one eligible route');
  const display = scene.routeDisplay();
  assert.ok(display.reach > 0, 'the route the scene traces is the surviving one');
  // The read-out says how many others there are, so the one drawn line is not
  // mistaken for the whole task.
  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  assert.ok(rows.get('other-routes'), 'the other routes are named');
  assert.match(rows.get('other-routes').valueJa, /描いているのはそのうちの 1 本/);
});

test('AR2-T15: the read-out and the sequence say the same thing about the same state', () => {
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  const reel = scene.getReel().readMetrics();
  for (const id of Object.keys(reel)) {
    assert.equal(reel[id].ja, rows.get(id).valueJa, `${id} reads the same in both`);
  }
});

// --- AR2-T16 … T20: the same lesion, however it was entered -----------------

test('AR2-T16: a preset and the raw structures behind it give the same answer', () => {
  const preset = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-thalamus')] });
  const raw = solveHigherBrainFunction({
    lesions: [{ id: 'by-hand', structures: [{ label: 'Ventral anterior nucleus', side: 'dominant' }] }],
  });
  assert.deepEqual(
    preset.unmodelledInfluences.map((influence) => influence.id),
    raw.unmodelledInfluences.map((influence) => influence.id)
  );
  assert.ok(preset.unmodelledInfluences.length > 0, 'and it is not empty on both sides');
  for (const task of preset.tasks) {
    const other = raw.tasks.find((candidate) => candidate.id === task.id);
    assert.equal(task.availability, other.availability, `${task.id} value`);
    assert.equal(task.computationStatus, other.computationStatus, `${task.id} status`);
    assert.deepEqual(
      task.unmodelledInfluences.map((influence) => influence.id),
      other.unmodelledInfluences.map((influence) => influence.id),
      `${task.id} influence`
    );
  }
});

test('AR2-T17: renaming the input changes nothing about the influence', () => {
  const one = solveHigherBrainFunction({
    lesions: [{ id: 'a', label: 'One', structures: [{ label: 'Pulvinar', side: 'dominant' }] }],
  });
  const two = solveHigherBrainFunction({
    lesions: [{ id: 'quite-different', label: 'Another', structures: [{ label: 'Pulvinar', side: 'dominant' }] }],
  });
  assert.deepEqual(
    one.unmodelledInfluences.map((influence) => influence.id),
    two.unmodelledInfluences.map((influence) => influence.id)
  );
  assert.equal(one.unmodelledInfluences.length, 1);
});

test('AR2-T18: extent 0 and severity 0 report no influence as occurring', () => {
  for (const input of [
    { lesions: [lesionSiteById('dominant-thalamus')], extent: 0 },
    { lesions: [{ id: 'nothing', severity: 0, structures: [{ label: 'Pulvinar', side: 'dominant' }] }] },
  ]) {
    const solved = solveHigherBrainFunction(input);
    assert.deepEqual(solved.unmodelledInfluences, [], 'nothing is happening');
    for (const task of solved.tasks) assert.deepEqual(task.unmodelledInfluences, []);
  }
  // A fixed limitation of the model is still declared: the two are different
  // kinds of statement and only one of them is about the current lesion.
  const idle = solveHigherBrainFunction({ lesions: [], extent: 0 });
  const writing = idle.tasks.find((task) => task.id === 'writing-from-meaning');
  assert.ok(writing.coverageLimitations.length > 0, 'the model still says what it does not settle');
});

test('AR2-T19: a structure that only modulates is not a structure with no part in this', () => {
  const found = functionsOfStructure('Pulvinar', 'left');
  assert.equal(found.carries, false, 'no route of the model runs through it');
  assert.equal(found.modulatesOnly, true);
  assert.equal(found.modulates.length, 1);
  assert.ok(found.modulates[0].whatIsNotComputedJa.length > 20);

  const note = functionNoteForSelection({ atlasName: 'Pulvinar', side: 'Left' });
  assert.ok(note, 'and the panel says something rather than nothing');
  assert.match(note.carries.textJa, /「関与が無い」ということではありません/);
  assert.ok(note.modulates, 'the uncomputed involvement is its own line');
});

test('AR2-T20: "every route still reaches" is not said while a task is unsettled', () => {
  // A structure whose removal lowers nothing, and leaves tasks this mode
  // cannot evaluate. The sentence has to say which of the two it is.
  const sentences = [];
  for (const node of FUNCTION_NODES) {
    for (const structure of node.structures) {
      const side = structure.side === 'nondominant' ? 'right' : 'left';
      const found = functionsOfStructure(structure.label, side);
      if (!found.carries) continue;
      const lowered = found.ifLost.low.length + found.ifLost.intermediate.length;
      if (lowered > 0) continue;
      const note = functionNoteForSelection({ atlasName: structure.label, side: side === 'left' ? 'Left' : 'Right' });
      if (!note) continue;
      sentences.push({ label: structure.label, note, unsettled: found.ifLost.indeterminate.length });
    }
  }
  assert.ok(sentences.length > 0, 'there is at least one such structure to check');
  for (const entry of sentences) {
    if (entry.unsettled > 0) {
      assert.match(entry.note.ifLost.textJa, /評価そのものができていない/, entry.label);
    } else {
      assert.match(entry.note.ifLost.textJa, /宣言したどの経路も届きます/, entry.label);
    }
  }
});

// --- AR2-T21 … T26: what the model depends on, and what it only draws -------

test('AR2-T21: a display anchor is not a dependency', () => {
  const anchored = FUNCTION_EDGES.filter((edge) => edge.displayAnchor);
  assert.ok(anchored.length >= 2, 'there are anchors to check');
  for (const edge of anchored) {
    assert.equal(edge.mapping, MAPPING.CONCEPTUAL, `${edge.id} has no structural dependency`);
    assert.deepEqual(edge.within, [], `${edge.id} depends on no structure`);
    // Destroying the mesh the line is drawn along changes nothing.
    for (const structure of edge.displayAnchor) {
      const side = structure.side === 'nondominant' ? 'right' : 'left';
      const solved = solveHigherBrainFunction({
        lesions: [{ id: `anchor:${structure.label}`, structures: [{ label: structure.label, side }] }],
      });
      const drawn = solved.edges.find((candidate) => candidate.id === edge.id);
      assert.equal(drawn.integrity, 1, `${edge.id} is untouched by a lesion of ${structure.label}`);
    }
  }
});

test('AR2-T22: whole-word spelling does not depend on the optic radiation', () => {
  // The connection from meaning to the orthographic output lexicon was anchored
  // in the posterior thalamic radiation because it was the nearest named mesh.
  // The radiation is the visual relay: with that anchor, destroying it stopped
  // a reader from spelling a word they were thinking of.
  const solved = solveHigherBrainFunction({
    lesions: [{
      id: 'radiation',
      structures: [{ label: 'Posterior thalamic radiation', side: 'dominant' }],
    }],
    atlasStructures: ['Posterior thalamic radiation'],
  });
  const writing = solved.tasks.find((task) => task.id === 'writing-from-meaning');
  assert.equal(writing.computationStatus, COMPUTATION.COMPUTED);
  assert.equal(writing.state, PATHWAY_STATE.HIGH, 'spelling from meaning is untouched by it');
  const edge = FUNCTION_EDGES.find((candidate) => candidate.id === 'semantic-to-orthographic-lexicon');
  assert.deepEqual(edge.within, []);
  assert.deepEqual(edge.displayAnchor.map((structure) => structure.label), ['Posterior thalamic radiation']);
});

test('AR2-T23: an element with a missing or invalid mapping is refused, not computed', () => {
  // The declaration is checked at load. What this pins is that the check is
  // real: every node and connection has a mapping from the enum, a conceptual
  // one names no structures, a structure-backed one names some, and a coarse
  // one says what it leaves out.
  const mappings = new Set(Object.values(MAPPING));
  for (const element of [...FUNCTION_NODES, ...FUNCTION_EDGES]) {
    const structures = element.structures ?? element.within;
    assert.ok(mappings.has(element.mapping), `${element.id} declares a mapping from the enum`);
    if (element.mapping === MAPPING.CONCEPTUAL) assert.equal(structures.length, 0, element.id);
    else assert.ok(structures.length > 0, element.id);
    if (element.mapping === MAPPING.COARSE) {
      assert.ok(element.omits || element.note, `${element.id} says what the coarse mesh omits`);
    }
  }
  // Ids are unique across both lists, which is what lets a step name one.
  const ids = [...FUNCTION_NODES, ...FUNCTION_EDGES].map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('AR2-T07b: a positive value that rounds to zero says so, rather than reading as zero', () => {
  const scene = buildScene({ task: 'repetition-nonword' });
  // A near-total lesion of the arcuate, entered as a raw structure so the
  // severity can be the one that exposes the difference.
  scene.solved = solveHigherBrainFunction({
    lesions: [{ id: 'nearly', severity: 0.99996, structures: [{ label: 'Arcuate fasciculus', side: 'dominant' }] }],
  });
  const row = scene.getMetrics().find((candidate) => candidate.id === 'route-state');
  assert.match(row.valueJa, /0\.0001 未満/, 'the read-out distinguishes it from zero');
  assert.match(row.valueJa, /0 ではありません/);
  // And an ordinary low value does not get that sentence.
  const ordinary = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 0.8);
  const plain = ordinary.getMetrics().find((candidate) => candidate.id === 'route-state');
  assert.ok(!plain.valueJa.includes('0.0001'), 'only when it would round to zero');
});

test('AR2-T24: a misspelt structure is an input error; an unmodelled one is out of scope', () => {
  const atlas = ['Angular gyrus', 'Fourth ventricle'];
  // In the atlas, and this model computes nothing from it: reported, and not
  // as "no effect".
  const outOfScope = solveHigherBrainFunction({
    lesions: [{ id: 'ventricle', structures: [{ label: 'Fourth ventricle', side: 'median' }] }],
    atlasStructures: atlas,
  });
  assert.deepEqual(outOfScope.outOfScopeStructures, ['Fourth ventricle']);
  assert.ok(!MODELLED_STRUCTURE_LABELS.has('Fourth ventricle'));

  // Not in the atlas at all: an input error, which is not the same answer.
  assert.throws(
    () => solveHigherBrainFunction({
      lesions: [{ id: 'typo', structures: [{ label: 'Angualr gyrus', side: 'dominant' }] }],
      atlasStructures: atlas,
    }),
    /no atlas structure called/
  );

  // With no atlas list to check against, the model says it could not check
  // rather than guessing which of the two it was.
  const unchecked = solveHigherBrainFunction({
    lesions: [{ id: 'ventricle', structures: [{ label: 'Fourth ventricle', side: 'median' }] }],
  });
  assert.deepEqual(unchecked.uncheckedStructures, ['Fourth ventricle']);
  assert.deepEqual(unchecked.outOfScopeStructures, []);
});

test('AR2-T25: a missing stimulus is not evidence that a restricted route is eligible', () => {
  const lexical = { id: 'lexical', stimuli: [STIMULUS.KNOWN_WORD] };
  assert.equal(routeIsEligible(lexical, STIMULUS.KNOWN_WORD), true);
  assert.equal(routeIsEligible(lexical, STIMULUS.NONWORD), false);
  assert.equal(routeIsEligible(lexical, null), false, 'not knowing is not permission');
  // A route with no restriction is unrestricted, and stays so.
  assert.equal(routeIsEligible({ id: 'open' }, null), true);
  // Which is safe only because every modelled task says what it is asked with.
  for (const task of FUNCTION_TASKS.filter((candidate) => candidate.modelled)) {
    assert.ok(task.stimulus, `${task.id} declares its stimulus`);
  }
});

test('AR2-T26: the corpus callosum is one mesh, and the display says so', () => {
  const callosal = FUNCTION_EDGES.filter((edge) => edge.within.some((w) => w.label === 'Corpus callosum'));
  assert.ok(callosal.length >= 2);
  for (const edge of callosal) {
    assert.equal(edge.mapping, MAPPING.COARSE);
    assert.match(edge.labelJa, /脳梁全体/, `${edge.id} names the mesh a reader selects`);
    assert.ok(edge.conceptualRegion, `${edge.id} keeps the part name as a concept`);
    assert.ok(edge.omits.includes('whole commissure') || edge.omits.includes('same single mesh'), edge.id);
  }
  // And selecting it takes every crossing at once, which is the limit.
  const solved = solveHigherBrainFunction({
    lesions: [{ id: 'callosum', structures: [{ label: 'Corpus callosum', side: 'median' }] }],
  });
  const cut = callosal.map((edge) => solved.edges.find((candidate) => candidate.id === edge.id));
  assert.ok(cut.every((edge) => edge.integrity === 0), 'all of them, together');
});

// --- AR2-T27 … T30: the conceptual experiments stay operable ----------------

const conceptual = (interventions) => solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions });
const valueOf = (solved, id) => solved.tasks.find((task) => task.id === id);

test('AR2-T27: cutting phoneme-to-grapheme conversion dissociates the two writing routes', () => {
  const solved = conceptual(['phoneme-grapheme-conversion']);
  const nonword = valueOf(solved, 'writing-to-dictation-nonword');
  const known = valueOf(solved, 'writing-to-dictation-word');
  assert.equal(nonword.computationStatus, COMPUTATION.COMPUTED);
  assert.equal(nonword.state, PATHWAY_STATE.LOW, 'the nonword has no way round');
  assert.equal(known.state, PATHWAY_STATE.HIGH, 'the known word takes the lexical route');
});

test('AR2-T28: cutting letter-form processing does not take object form with it', () => {
  const solved = conceptual(['orthographic-visual-form']);
  assert.equal(valueOf(solved, 'reading-comprehension-word').state, PATHWAY_STATE.LOW);
  assert.equal(valueOf(solved, 'naming-object').state, PATHWAY_STATE.HIGH, 'objects are a separate route');
});

test('AR2-T29: cutting auditory input takes dictation and not writing from meaning', () => {
  const solved = conceptual(['auditory-input']);
  assert.equal(valueOf(solved, 'writing-to-dictation-word').state, PATHWAY_STATE.LOW);
  assert.equal(valueOf(solved, 'writing-from-meaning').state, PATHWAY_STATE.HIGH);
  assert.equal(valueOf(solved, 'auditory-comprehension').state, PATHWAY_STATE.LOW);
});

test('AR2-T30: an assumption is not dropped on the way to a consumer', () => {
  const scene = buildScene({ task: 'writing-from-meaning' });
  const task = scene.tracedTask();
  assert.ok(task.route.some((step) => step.assumed), 'the route rests on an assumption');
  assert.ok(
    task.coverageLimitationsJa.some((limit) => limit.includes('仮定')),
    'and the result says so'
  );
  const display = scene.routeDisplay();
  assert.equal(display.assumed, true, 'the view model carries it');
  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  assert.ok(rows.get('assumed'), 'and the read-out has a row for it');
  assert.match(rows.get('assumed').valueJa, /解剖学的な温存は評価していません/);
  assert.ok(
    !rows.get('assumed').valueJa.includes('温存されています'),
    'which is not a claim that it is spared'
  );
});

test('AR2-T21b: a step drawn outside the brain is labelled as having no structure', () => {
  const scene = buildScene({ task: 'writing-to-dictation-word' });
  const schematic = scene.routePoints().filter((point) => point.schematic);
  assert.ok(schematic.length > 0);
  const ids = new Set(schematic.filter((point) => point.step.kind === 'node').map((point) => point.step.id));
  assert.ok(ids.size > 0, 'at least one of them is a process a label is drawn for');
  for (const note of scene.getAnnotations()) {
    if (!ids.has(note.id)) continue;
    assert.match(note.text, /no atlas structure/, `${note.id} says where it is not`);
    assert.match(note.sub, /アトラス上の構造なし/);
  }
  // And a step that does have a mesh is labelled plainly.
  const anchored = scene.getAnnotations().find((note) => note.id === 'phonological-analysis');
  assert.ok(anchored && !anchored.text.includes('no atlas structure'));
});

// --- AR2-T31, T33, T34, T36, T41 -------------------------------------------

test('AR2-T31: every coverage limitation is on the read-out, not only the first', () => {
  const scene = buildScene({ task: 'writing-from-meaning' });
  const task = scene.tracedTask();
  assert.ok(task.coverageLimitations.length > 1, 'a result with more than one limitation');
  const row = scene.getMetrics().find((candidate) => candidate.id === 'coverage');
  assert.deepEqual(row.details, [...task.coverageLimitations], 'all of them, in the row');
  assert.deepEqual(row.detailsJa, [...task.coverageLimitationsJa]);
  assert.equal(row.details.length, row.detailsJa.length, 'and the two languages match in count');
  assert.match(row.value, /\(1 of \d+\)/, 'the summary says how many are behind the control');
  // The last one is a real sentence, not an empty slot.
  assert.ok(row.detailsJa.at(-1).length > 10);
});

test('AR2-T33: changing the reference text changes nothing the model computes', () => {
  const before = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-arcuate')] });
  // The library is frozen data a panel renders. Nothing the solver does reads
  // it, so a different word in it cannot move a number — which is the whole
  // reason the names live outside the model.
  const entry = APHASIA_LIBRARY.groups[0].entries[0];
  assert.throws(() => { entry.name = 'changed'; }, TypeError);
  const after = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-arcuate')] });
  assert.deepEqual(
    before.tasks.map((task) => [task.id, task.availability, task.computationStatus]),
    after.tasks.map((task) => [task.id, task.availability, task.computationStatus])
  );
});

test('AR2-T34: the three line types reach the renderer, and the legend has all three', () => {
  const scene = buildScene({ task: 'writing-to-dictation-nonword' });
  const kinds = scene.routeLineKinds();
  assert.ok(kinds.length > 0, 'the route is drawn in pieces');
  for (const kind of kinds) {
    assert.ok(['tract', 'coarse', 'conceptual'].includes(kind.lineType), `${kind.id}: ${kind.lineType}`);
    assert.equal(kind.dashed, kind.lineType !== 'tract', `${kind.id} is dashed unless it is a real tract`);
  }
  // A route that mixes all three, so this is not a test of one kind repeated:
  // dictating a known word runs through bulk white matter (coarse), the arcuate
  // fasciculus (a real tract mesh) and two connections with no structure at all.
  const mixed = buildScene({ task: 'writing-to-dictation-word' });
  const types = new Set(mixed.routeLineKinds().map((kind) => kind.lineType));
  assert.deepEqual([...types].sort(), ['coarse', 'conceptual', 'tract']);

  // And a step with no structure is placed schematically rather than dropped.
  // The audited version left it off the line, so the drawn route was shorter
  // than the one the model solved with nothing to say that it was.
  const schematic = mixed.routePoints().filter((point) => point.schematic);
  assert.ok(schematic.length > 0, 'the conceptual steps are on the line');
  for (const point of schematic) {
    assert.equal(point.step.mapping, MAPPING.CONCEPTUAL);
  }
  // Placed outside the brain, not on the nearest structure: putting it on one
  // would be a localisation claim made by the renderer.
  const anchored = mixed.routePoints().filter((point) => !point.schematic);
  for (const point of schematic) {
    const nearest = Math.min(...anchored.map((other) => other.position.distanceTo(point.position)));
    assert.ok(nearest > 0.2, `a schematic step sits off the anatomy (${nearest.toFixed(2)})`);
  }
  // And none of it reaches the solver: the same task solved from the model
  // alone agrees with the scene's.
  const solved = solveHigherBrainFunction({ lesions: [] })
    .tasks.find((task) => task.id === 'writing-to-dictation-word');
  assert.equal(solved.availability, mixed.tracedTask().availability);

  // And the gaps are in the geometry rather than in the colour: a dotted piece
  // has vertices at alpha zero, a solid one has none. Painted first, because an
  // unpainted buffer is zeroes and would pass this by accident.
  mixed.renderAtSeconds(2.0);
  for (const segment of mixed.routeSegments) {
    const colours = segment.mesh.geometry.attributes.color;
    let transparent = 0;
    for (let index = 0; index < colours.count; index += 1) if (colours.getW(index) === 0) transparent += 1;
    if (segment.lineType === 'tract') assert.equal(transparent, 0, `${segment.id} is solid`);
    else assert.ok(transparent > 0, `${segment.id} has gaps`);
  }

  // The dash is a fixed length in the world, not a fraction of the segment: a
  // fraction gives a short connection short dashes and a long one long dashes,
  // and the same line type then looks like two different ones.
  const dashed = mixed.routeSegments.filter((segment) => segment.dash);
  assert.ok(dashed.length >= 2, 'more than one dashed piece to compare');
  const dashLengths = dashed.map((segment) => {
    const span = mixed.routeCurve.getPoint(segment.toAt).distanceTo(mixed.routeCurve.getPoint(segment.fromAt));
    return (span / (segment.rings - 1)) * segment.dash.on;
  });
  for (const length of dashLengths) {
    assert.ok(
      length > HigherBrainFunctionScene.DASH_RING * 0.5 && length < HigherBrainFunctionScene.DASH_RING * 6,
      `a dash is a plausible length in the world (${length.toFixed(3)})`
    );
  }

  const legend = HigherBrainFunctionScene.meta.legend.filter((entry) => entry.lineType);
  assert.deepEqual(legend.map((entry) => entry.lineType), ['tract', 'coarse', 'conceptual']);
});

test('AR2-T36: the read-out says the same things in both languages', () => {
  const scene = buildScene({ lesion: 'dominant-thalamus', task: 'auditory-comprehension' });
  for (const row of scene.getMetrics()) {
    assert.ok(row.value, `${row.id} has English`);
    assert.ok(row.valueJa, `${row.id} has Japanese`);
    assert.notEqual(row.value, row.valueJa, `${row.id} is not one language twice`);
    if (row.details) {
      assert.equal(row.details.length, row.detailsJa.length, `${row.id}: the counts match`);
      for (const [index, item] of row.details.entries()) {
        assert.ok(row.detailsJa[index], `${row.id}[${index}] has Japanese`);
        assert.notEqual(item, row.detailsJa[index], `${row.id}[${index}] is not the English again`);
      }
    }
  }
});

test('AR2-T41: an ineligible route does not put a task on a structure’s list', () => {
  // The semantic store is on the lexical repetition route, which a *nonword*
  // may not take. It was listed as a task running through the middle temporal
  // gyrus all the same.
  const found = functionsOfStructure('Middle temporal gyrus', 'left');
  const listed = found.tasks.map((task) => task.id);
  assert.ok(!listed.includes('repetition-nonword'), 'a nonword does not route through meaning');
  assert.ok(!listed.includes('writing-to-dictation-nonword'));
  assert.ok(listed.includes('repetition-word'), 'a known word does');
  // Kept, and kept separate: "declared and not available for this stimulus".
  assert.deepEqual(
    found.tasksByIneligibleRoute.map((task) => task.id).sort(),
    ['repetition-nonword', 'writing-to-dictation-nonword']
  );
  const note = functionNoteForSelection({ atlasName: 'Middle temporal gyrus', side: 'Left' });
  assert.ok(note.byIneligibleRoute, 'and the panel keeps the two apart');
  assert.match(note.byIneligibleRoute.textJa, /その刺激では使えない経路/);
});

// --- the declaration that makes AR2-03 possible -----------------------------

test('AR2: a lesion preset cannot carry its own uncomputed influence any more', () => {
  assert.throws(
    () => solveHigherBrainFunction({
      lesions: [{
        id: 'smuggled',
        structures: [{ label: 'Angular gyrus', side: 'dominant' }],
        unmodelledInfluences: [{ what: 'something', onTasks: ['naming-object'] }],
      }],
    }),
    /MODULATORY_NETWORKS/
  );
  for (const network of MODULATORY_NETWORKS) {
    assert.ok(network.what && network.whatJa, `${network.id} names the influence`);
    assert.ok(network.onTasks.length > 0, `${network.id} says which tasks it bears on`);
    for (const structure of network.structures) {
      assert.ok(MODELLED_STRUCTURE_LABELS.has(structure.label), `${structure.label} is a structure of the model`);
    }
  }
});
