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
  assert.deepEqual(syndromeIds(anteriorWatershed), ['transcortical-motor-aphasia']);

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
