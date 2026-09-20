import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUNCTION_STATUS,
  dominanceFor,
  lesionSiteById,
  solveHigherBrainFunction,
} from '../src/models/higherBrainFunction.js';

/**
 * The claims about people, as opposed to the claims about this model.
 *
 * Every test here is named in `HIGHER_BRAIN_FUNCTION_EVIDENCE`
 * (`src/models/evidence.js`) as what defends one row of the dossier, so a claim
 * cannot be recorded as established while nothing checks it. The claims are
 * dissociations — which task survives when another does not — because that is
 * what the model is entitled to say: it computes whether a route carries, and
 * never how much of anything.
 */

/** The solved state for one declared lesion site, taken to its full extent. */
function withLesion(id, extent = 1) {
  const site = lesionSiteById(id);
  assert.ok(site, `${id} is a declared lesion site`);
  return solveHigherBrainFunction({ lesions: [site], extent });
}

function statusOf(state, taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  assert.ok(task, `${taskId} is a declared task`);
  return task.status;
}

const affected = (state, taskId) => statusOf(state, taskId) !== FUNCTION_STATUS.INTACT;
const syndromeIds = (state) => state.syndromes.map((syndrome) => syndrome.id);

test('physiology: repetition can fail while comprehension and fluency do not', () => {
  // No cortex is damaged here at all: the lesion is the dorsal route and only
  // that. If repetition ever finds its way round through meaning, this fails —
  // and with it the whole reason conduction aphasia is a separate thing.
  const state = solveHigherBrainFunction({
    lesions: [{ id: 'dorsal-route-only', structures: [], connections: ['dorsal-phonological'] }],
  });
  assert.equal(statusOf(state, 'repetition'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(state, 'auditory-comprehension'), FUNCTION_STATUS.INTACT);
  assert.equal(statusOf(state, 'speech-fluency'), FUNCTION_STATUS.INTACT);
  assert.equal(statusOf(state, 'propositional-speech'), FUNCTION_STATUS.INTACT);
  assert.deepEqual(syndromeIds(state), ['conduction-aphasia']);
  assert.equal(state.tasks.find((task) => task.id === 'repetition').blockedAt.id, 'dorsal-phonological');

  // And the same dissociation from the lesion site that produces it on the
  // atlas, where cortex at both ends is left alone.
  const site = withLesion('dominant-arcuate');
  assert.equal(affected(site, 'repetition'), true);
  assert.equal(affected(site, 'auditory-comprehension'), false);
  assert.equal(affected(site, 'speech-fluency'), false);
});

test('physiology: an anterior lesion takes fluency and a posterior one takes comprehension', () => {
  const anterior = withLesion('dominant-inferior-frontal');
  assert.equal(affected(anterior, 'speech-fluency'), true);
  assert.equal(affected(anterior, 'auditory-comprehension'), false);
  assert.deepEqual(syndromeIds(anterior), ['broca-aphasia']);

  const posterior = withLesion('dominant-posterior-superior-temporal');
  assert.equal(affected(posterior, 'auditory-comprehension'), true);
  assert.equal(affected(posterior, 'speech-fluency'), false, 'Wernicke aphasia is fluent');
  assert.ok(syndromeIds(posterior).includes('wernicke-aphasia'));

  // Both, and the whole network between them, is the one that takes everything.
  const whole = withLesion('dominant-perisylvian');
  for (const task of ['auditory-comprehension', 'repetition', 'speech-fluency', 'naming']) {
    assert.equal(affected(whole, task), true, `${task} is gone`);
  }
  assert.ok(syndromeIds(whole).includes('global-aphasia'));
});

test('physiology: a lesion outside the perisylvian zone leaves repetition intact', () => {
  const anteriorWatershed = withLesion('dominant-anterior-watershed');
  assert.equal(affected(anteriorWatershed, 'speech-fluency'), true);
  assert.equal(affected(anteriorWatershed, 'repetition'), false, 'repetition does not pass through initiation');
  assert.equal(affected(anteriorWatershed, 'auditory-comprehension'), false);
  // And a second finding nobody put there: the medial frontal cortex this
  // lesion takes is in the initiation circuit as well as in the speech one, so
  // the model reports reduced drive alongside the aphasia — which is what a
  // medial frontal or anterior cerebral artery lesion does.
  assert.deepEqual(syndromeIds(anteriorWatershed), ['transcortical-motor-aphasia', 'abulia']);

  const posteriorWatershed = withLesion('dominant-posterior-watershed');
  assert.equal(affected(posteriorWatershed, 'auditory-comprehension'), true);
  assert.equal(affected(posteriorWatershed, 'repetition'), false, 'repetition does not pass through meaning');
  assert.equal(affected(posteriorWatershed, 'speech-fluency'), false);
  assert.ok(syndromeIds(posteriorWatershed).includes('transcortical-sensory-aphasia'));
});

test('physiology: language and praxis sit in one hemisphere in a right-handed brain', () => {
  const dominance = dominanceFor('right');
  assert.equal(dominance.language, 'left');
  assert.equal(dominance.praxis, dominance.language, 'praxis formulas sit with language');

  // Every language task is on that side and nothing on the other side touches
  // them: the mirror of the aphasia-producing lesion produces no aphasia.
  const mirrored = solveHigherBrainFunction({
    lesions: [{
      id: 'nondominant-inferior-frontal',
      structures: lesionSiteById('dominant-inferior-frontal').structures.map((structure) => ({
        ...structure, side: 'nondominant',
      })),
      connections: [],
    }],
  });
  assert.equal(mirrored.syndromes.length, 0);
  assert.ok(mirrored.tasks.every((task) => task.status === FUNCTION_STATUS.INTACT));
});

test('physiology: spatial attention is not in the language hemisphere, so one parietal lobe is not the mirror of the other', () => {
  const dominance = dominanceFor('right');
  assert.notEqual(dominance.spatialAttention, dominance.language);

  const nondominant = withLesion('nondominant-parietal');
  assert.equal(statusOf(nondominant, 'attention-left-space'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(nondominant, 'attention-right-space'), FUNCTION_STATUS.INTACT,
    'the dominant parietal still attends to the right');
  assert.ok(syndromeIds(nondominant).includes('left-hemispatial-neglect'));
  assert.ok(!syndromeIds(nondominant).some((id) => id.endsWith('aphasia')), 'language is on the other side');

  // The same structures, other hemisphere: no neglect at all, and a different
  // deficit instead — the praxis formulas that live in that gyrus.
  const mirrored = solveHigherBrainFunction({
    lesions: [{
      id: 'dominant-parietal',
      structures: lesionSiteById('nondominant-parietal').structures.map((structure) => ({
        ...structure, side: 'dominant',
      })),
      connections: [],
    }],
  });
  assert.equal(statusOf(mirrored, 'attention-left-space'), FUNCTION_STATUS.INTACT);
  assert.ok(!syndromeIds(mirrored).includes('left-hemispatial-neglect'));
  assert.equal(affected(mirrored, 'praxis-right-hand'), true);
});

test('physiology: a new memory needs a medial temporal lobe on one side or the other', () => {
  const oneSide = solveHigherBrainFunction({
    lesions: [{ id: 'one-hippocampus', structures: [{ label: 'Hippocampus', side: 'dominant' }], connections: [] }],
  });
  assert.equal(statusOf(oneSide, 'episodic-memory-formation'), FUNCTION_STATUS.INTACT);

  const both = withLesion('bilateral-medial-temporal');
  assert.equal(statusOf(both, 'episodic-memory-formation'), FUNCTION_STATUS.LOST);
  assert.deepEqual(syndromeIds(both), ['anterograde-amnesia']);
  assert.ok(
    both.tasks.filter((task) => task.id !== 'episodic-memory-formation')
      .every((task) => task.status === FUNCTION_STATUS.INTACT),
    'amnesia arrives alone here: language is nowhere near it'
  );

  // The same redundancy on the auditory side: one Heschl gyrus is not deafness.
  const oneHeschl = solveHigherBrainFunction({
    lesions: [{ id: 'one-heschl', structures: [{ label: 'Transverse temporal gyri', side: 'dominant' }], connections: [] }],
  });
  assert.equal(statusOf(oneHeschl, 'auditory-comprehension'), FUNCTION_STATUS.INTACT);
});

test('physiology: reading needs the visual route into language and writing does not', () => {
  // The dominant occipital lobe alone: the other hemisphere still sees, and the
  // callosum carries it, so reading survives.
  const occipitalOnly = solveHigherBrainFunction({
    lesions: [{
      id: 'dominant-occipital-only',
      structures: [
        { label: 'Calcarine sulcus', side: 'dominant' },
        { label: 'Cuneus', side: 'dominant' },
        { label: 'Lingual gyrus', side: 'dominant' },
      ],
      connections: [],
    }],
  });
  assert.equal(statusOf(occipitalOnly, 'reading'), FUNCTION_STATUS.INTACT, 'the callosal route still carries it');

  // Add the commissure and both routes are gone, while writing — which never
  // passes through vision — is untouched.
  const pureAlexia = withLesion('dominant-occipital-and-callosum');
  assert.equal(statusOf(pureAlexia, 'reading'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(pureAlexia, 'writing'), FUNCTION_STATUS.INTACT);
  assert.equal(statusOf(pureAlexia, 'auditory-comprehension'), FUNCTION_STATUS.INTACT);
  assert.ok(syndromeIds(pureAlexia).includes('alexia-without-agraphia'));
  // Naming fails at the visual end, where the name was never reached, so it is
  // not filed as an aphasia.
  assert.equal(affected(pureAlexia, 'naming'), true);
  assert.ok(!syndromeIds(pureAlexia).includes('anomic-aphasia'));

  // An angular gyrus lesion takes reading with writing, which is the other half
  // of the dissociation: alexia there is not pure.
  const angular = withLesion('dominant-angular');
  assert.equal(statusOf(angular, 'reading'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(angular, 'writing'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(angular, 'calculation-and-body-schema'), FUNCTION_STATUS.LOST);
  assert.ok(syndromeIds(angular).includes('gerstmann-syndrome'));
  assert.ok(!syndromeIds(angular).includes('alexia-without-agraphia'));
});

test('physiology: the callosum carries the left hand, so cutting it spares the right', () => {
  const state = withLesion('corpus-callosum');
  assert.equal(statusOf(state, 'praxis-left-hand'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(state, 'praxis-right-hand'), FUNCTION_STATUS.INTACT);
  assert.equal(statusOf(state, 'reading'), FUNCTION_STATUS.INTACT, 'the dominant visual route is untouched');
  assert.deepEqual(syndromeIds(state), ['callosal-apraxia']);

  // A lesion of the formulas themselves takes both hands, because both hands
  // are reaching for the same formulas.
  const parietal = solveHigherBrainFunction({
    lesions: [{ id: 'praxis-formulas', structures: [{ label: 'Supramarginal gyrus', side: 'dominant' }], connections: [] }],
  });
  assert.equal(affected(parietal, 'praxis-left-hand'), true);
  assert.equal(affected(parietal, 'praxis-right-hand'), true);
  assert.ok(syndromeIds(parietal).includes('ideomotor-apraxia'));
});

test('physiology: naming needs the word’s sound form, so it fails wherever that is cut off', () => {
  // The model used to route naming straight from meaning to the inferior
  // frontal gyrus, and so reported naming as intact in Wernicke aphasia and in
  // conduction aphasia. It is not intact in either: producing a word means
  // retrieving its sound form before it can be planned.
  for (const id of ['dominant-posterior-superior-temporal', 'dominant-arcuate', 'dominant-inferior-frontal']) {
    assert.equal(affected(withLesion(id), 'naming'), true, `${id} takes naming with it`);
  }
  // And the dissociation that makes it a claim rather than a blanket: a lesion
  // that leaves the whole word-production chain alone leaves naming alone.
  for (const id of ['nondominant-parietal', 'bilateral-medial-temporal', 'corpus-callosum']) {
    assert.equal(affected(withLesion(id), 'naming'), false, `${id} does not touch naming`);
  }
});

test('physiology: a frontal–subcortical circuit reads the same wherever it is cut', () => {
  // The clinically important half of the frontal circuits: the behaviour that
  // goes is the circuit's, not the cortex's. A lesion of the striatum the
  // circuit passes through produces the picture of a lesion of the cortex it
  // starts from — which is why a small deep infarct can present as a frontal
  // syndrome.
  const cortex = withLesion('bifrontal-dorsolateral');
  const deep = withLesion('striatum-head');
  assert.equal(affected(cortex, 'set-shifting-and-planning'), true);
  assert.equal(affected(deep, 'set-shifting-and-planning'), true, 'the same circuit, cut deeper');
  assert.ok(syndromeIds(cortex).includes('dysexecutive-syndrome'));
  assert.ok(syndromeIds(deep).includes('dysexecutive-syndrome'));
  // Neither is an aphasia, and neither touches memory: this is a different
  // network and the model keeps it separate.
  for (const state of [cortex, deep]) {
    assert.equal(affected(state, 'auditory-comprehension'), false);
    assert.equal(affected(state, 'repetition'), false);
    assert.equal(affected(state, 'episodic-memory-formation'), false);
  }
});

test('physiology: the three prefrontal patterns come apart', () => {
  // Dorsolateral, orbitofrontal and medial: three circuits through the same
  // pallidum and the same thalamus, and a lesion of one cortex takes one
  // behaviour.
  const dorsolateral = withLesion('bifrontal-dorsolateral');
  assert.equal(affected(dorsolateral, 'set-shifting-and-planning'), true);
  assert.equal(affected(dorsolateral, 'behavioural-inhibition'), false);
  assert.equal(affected(dorsolateral, 'initiation-and-drive'), false);

  const orbital = withLesion('orbitofrontal-cortex');
  assert.equal(affected(orbital, 'behavioural-inhibition'), true);
  assert.equal(affected(orbital, 'set-shifting-and-planning'), false);
  assert.deepEqual(syndromeIds(orbital), ['disinhibition']);

  // And the shared parts of the circuits take all three together, which is the
  // other half of the same claim.
  const shared = solveHigherBrainFunction({
    lesions: [{
      id: 'mediodorsal-thalamus-bilateral',
      structures: [{ label: 'Mediodorsal nucleus', side: 'dominant' }, { label: 'Mediodorsal nucleus', side: 'nondominant' }],
      connections: [],
    }],
  });
  assert.equal(statusOf(shared, 'set-shifting-and-planning'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(shared, 'behavioural-inhibition'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(shared, 'initiation-and-drive'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(shared, 'auditory-comprehension'), FUNCTION_STATUS.INTACT);
});

test('physiology: a frontal syndrome can arrive with the frontal cortex untouched', () => {
  // The clinical point of drawing the circuits as loops rather than as pieces
  // of cortex: cut where they close — the fibres between the thalamus and the
  // frontal lobe — and all three behaviours go while the cortex they belong to
  // is intact. A capsular genu infarct is a small lesion that does this.
  const state = withLesion('thalamocortical-disconnection');
  assert.equal(statusOf(state, 'set-shifting-and-planning'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(state, 'behavioural-inhibition'), FUNCTION_STATUS.LOST);
  assert.equal(statusOf(state, 'initiation-and-drive'), FUNCTION_STATUS.LOST);

  const cortex = ['dorsolateral-prefrontal', 'orbitofrontal', 'medial-frontal-drive'];
  for (const id of cortex) {
    assert.equal(state.nodes.find((node) => node.id === id).integrity, 1, `${id} is undamaged`);
  }
  // Language, memory and attention are elsewhere and stay where they are.
  for (const id of ['auditory-comprehension', 'repetition', 'naming', 'episodic-memory-formation', 'attention-left-space']) {
    assert.equal(statusOf(state, id), FUNCTION_STATUS.INTACT, `${id} is untouched`);
  }
});
