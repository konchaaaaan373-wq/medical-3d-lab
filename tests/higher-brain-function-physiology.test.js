import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPUTATION,
  MODE,
  PATHWAY_STATE,
  dominanceFor,
  lesionSiteById,
  solveHigherBrainFunction,
} from '../src/models/higherBrainFunction.js';

/**
 * The dissociations this model declares, as opposed to the contract it obeys.
 *
 * Every test here is named in `HIGHER_BRAIN_FUNCTION_EVIDENCE`
 * (`src/models/evidence.js`) as what defends one row of the dossier, so a claim
 * cannot be recorded as established while nothing checks it.
 *
 * **What these tests are not.** A selective knockout in {@link MODE.CONCEPTUAL}
 * is a statement about this model's declared graph. It is not a prediction that
 * a real lesion produces the dissociation, and the atlas-mode tests further
 * down are deliberately weaker about the same anatomy for exactly that reason:
 * where one mesh carries two processes, a lesion takes both, and the test says
 * so rather than asserting the clean result.
 */

/** The solved state for one declared lesion site, taken to its full extent. */
function withLesion(id, extent = 1) {
  const site = lesionSiteById(id);
  assert.ok(site, `${id} is a declared lesion site`);
  return solveHigherBrainFunction({ lesions: [site], extent });
}

/** The solved state with one declared process switched off directly. */
function withProcessOff(...ids) {
  return solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions: ids });
}

function taskOf(state, taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  assert.ok(task, `${taskId} is a declared task`);
  return task;
}

/** The band, and an assertion that there is one at all. */
function stateOf(state, taskId) {
  const task = taskOf(state, taskId);
  assert.equal(task.computationStatus, COMPUTATION.COMPUTED, `${taskId} has a value to read`);
  return task.state;
}

const reaches = (state, taskId) => stateOf(state, taskId) === PATHWAY_STATE.HIGH;
const barely = (state, taskId) => stateOf(state, taskId) === PATHWAY_STATE.LOW;

test('physiology: the two writing routes come apart, and a nonword may not take the lexical one', () => {
  // The dissociation the pair of case series describes: nonwords cannot be
  // spelled while real words can, and the mirror image of it. This model used
  // to route all writing through the phonological stages and the oral output
  // planner, so cutting the dorsal bundle abolished every kind of writing.
  const conversionOff = withProcessOff('phoneme-grapheme-conversion');
  assert.ok(reaches(conversionOff, 'writing-from-meaning'), 'whole-word spelling is untouched');
  assert.ok(reaches(conversionOff, 'writing-to-dictation-word'), 'and a known word can still be written down');
  assert.ok(barely(conversionOff, 'writing-to-dictation-nonword'), 'a nonword cannot');

  // The other half: whole-word spelling gone, and a nonword still spellable
  // from its sound.
  const lexiconOff = withProcessOff('orthographic-output-lexicon');
  assert.ok(barely(lexiconOff, 'writing-from-meaning'));
  assert.ok(reaches(lexiconOff, 'writing-to-dictation-nonword'), 'the phonological route is still there');

  // And the eligibility rule that makes the first case possible: the lexical
  // route is declared for the nonword task and refused for it, so it can never
  // be the route a nonword is rescued by.
  const nonword = taskOf(conversionOff, 'writing-to-dictation-nonword');
  assert.ok(nonword.ineligibleRouteIds.includes('dictation-lexical'), 'declared, and not eligible');
  assert.ok(!nonword.evaluatedRouteIds.includes('dictation-lexical'));
});

test('physiology: writing from meaning does not depend on speaking', () => {
  // Cutting the way out through the mouth used to abolish writing, because
  // writing ran through the oral output planner. It does not now.
  const outputOff = withProcessOff('phonological-output');
  assert.ok(barely(outputOff, 'repetition-word'), 'the spoken route is gone');
  assert.ok(reaches(outputOff, 'writing-from-meaning'), 'and the written one is not');

  const motorOff = withProcessOff('speech-motor');
  assert.ok(reaches(motorOff, 'writing-from-meaning'));
});

test('physiology: the language of writing and the hand that writes are separate', () => {
  // A hand that will not move is not agraphia, so the pen is its own stage and
  // switching it off leaves the spelling routes alone.
  const penOff = withProcessOff('graphomotor-output');
  assert.ok(barely(penOff, 'graphomotor-route'));
  assert.ok(reaches(penOff, 'writing-from-meaning'));
  assert.ok(reaches(penOff, 'writing-to-dictation-nonword'));

  // And the buffer they converge on, which is the other claim: switching it
  // off affects every kind of writing at once, whichever route composed the
  // letters. That is what makes it a convergence rather than a decoration.
  const bufferOff = withProcessOff('graphemic-buffer');
  assert.ok(barely(bufferOff, 'graphomotor-route'));
  assert.ok(barely(bufferOff, 'writing-from-meaning'), 'both routes run through it');
  assert.ok(barely(bufferOff, 'writing-to-dictation-nonword'));
  // Upstream of it, the spelling processes themselves are untouched.
  assert.equal(bufferOff.nodes.find((node) => node.id === 'orthographic-output-lexicon').integrity, 1);
});

test('physiology: letters and objects come apart when the processes do', () => {
  const lettersOff = withProcessOff('orthographic-visual-form');
  assert.ok(barely(lettersOff, 'reading-comprehension-word'));
  assert.ok(reaches(lettersOff, 'naming-object'), 'the object route does not use it');

  const objectsOff = withProcessOff('object-visual-form');
  assert.ok(barely(objectsOff, 'naming-object'));
  assert.ok(reaches(objectsOff, 'reading-comprehension-word'), 'and the mirror image holds');

  // The shared visual input, to show the selectivity is not invented: take the
  // input both of them enter by and both go.
  const visionOff = withProcessOff('visual-input-dominant', 'visual-input-nondominant');
  assert.ok(barely(visionOff, 'reading-comprehension-word'));
  assert.ok(barely(visionOff, 'naming-object'));
});

test('physiology: the atlas cannot separate letters from objects, and the result says so', () => {
  // The honest other half of the test above. One occipitotemporal mesh carries
  // both processes, so a lesion drawn on it takes reading and object naming
  // together — and that limit is on the result rather than in a document.
  const state = withLesion('dominant-occipital-and-whole-callosum');
  const reading = taskOf(state, 'reading-comprehension-word');
  const naming = taskOf(state, 'naming-object');
  assert.ok(reading.coverageLimitations.length > 0, 'the shared mesh is reported');
  assert.ok(naming.coverageLimitations.length > 0);
  assert.ok(
    reading.coverageLimitations.some((limit) => /shares one atlas mesh/.test(limit)),
    'and it says what the limit is'
  );
  // No syndrome is produced, and object naming is not rescued to fit one.
  assert.equal(naming.state, reading.state, 'they move together under a lesion');
});

test('physiology: the way in from hearing is separate from the way out and from meaning', () => {
  const earOff = withProcessOff('auditory-input');
  assert.ok(barely(earOff, 'auditory-comprehension'));
  assert.ok(barely(earOff, 'repetition-word'));
  assert.ok(barely(earOff, 'writing-to-dictation-word'), 'dictation needs the ear');
  assert.ok(barely(earOff, 'writing-to-dictation-nonword'));
  assert.ok(reaches(earOff, 'writing-from-meaning'), 'writing from meaning does not');
  assert.ok(reaches(earOff, 'naming-object'), 'nor does naming what is seen');
  assert.ok(reaches(earOff, 'reading-comprehension-word'));
});

test('physiology: a known word can be repeated round through meaning, and a nonword cannot', () => {
  // The dual route for repetition. Cutting the dorsal bundle leaves a known
  // word a way round and leaves a nonword none, which is the stimulus effect
  // the conduction-aphasia descriptions report.
  const dorsalOff = withProcessOff('dorsal-phonological');
  assert.notEqual(stateOf(dorsalOff, 'repetition-word'), PATHWAY_STATE.LOW, 'a way round exists');
  assert.ok(barely(dorsalOff, 'repetition-nonword'), 'and a nonword has none');

  const word = taskOf(dorsalOff, 'repetition-word');
  const nonword = taskOf(dorsalOff, 'repetition-nonword');
  assert.ok(word.evaluatedRouteIds.includes('lexical-semantic-repetition'));
  assert.ok(nonword.ineligibleRouteIds.includes('lexical-semantic-repetition'));
});

test('physiology: an anterior lesion takes the output routes and a posterior one takes comprehension', () => {
  const anterior = withLesion('dominant-inferior-frontal');
  assert.ok(reaches(anterior, 'auditory-comprehension'), 'the way in is untouched');
  assert.ok(barely(anterior, 'repetition-word'));
  assert.ok(barely(anterior, 'speech-initiation-route'));

  const posterior = withLesion('dominant-posterior-superior-temporal');
  assert.ok(barely(posterior, 'auditory-comprehension'));
  assert.ok(reaches(posterior, 'speech-initiation-route'), 'the output route is untouched');

  // Both of them leave writing from meaning reaching, and both of them say why
  // that is a statement about the declared route and not about a person.
  for (const state of [anterior, posterior]) {
    const writing = taskOf(state, 'writing-from-meaning');
    assert.ok(
      writing.coverageLimitations.some((limit) => /accompanies the perisylvian aphasias/.test(limit)),
      'the agraphia this model does not produce is declared on the result'
    );
  }
});

test('physiology: a lesion outside the perisylvian zone leaves the repetition route reaching', () => {
  for (const id of ['dominant-anterior-watershed', 'dominant-posterior-watershed', 'dominant-watershed-both']) {
    const state = withLesion(id);
    assert.ok(reaches(state, 'repetition-word'), `${id} leaves word repetition reaching`);
    assert.ok(reaches(state, 'repetition-nonword'), `${id} leaves nonword repetition reaching`);
  }
  // And the anterior one takes the self-initiation route while leaving the
  // route that responds to something outside.
  const anterior = withLesion('dominant-anterior-watershed');
  assert.ok(barely(anterior, 'speech-initiation-route'));
  assert.ok(reaches(anterior, 'repetition-word'));
});

test('physiology: a watershed preset is a set of structures, not a perfusion territory', () => {
  for (const id of ['dominant-anterior-watershed', 'dominant-posterior-watershed', 'dominant-watershed-both']) {
    const site = lesionSiteById(id);
    assert.ok(site.granularityLimitJa, `${id} says what it is not`);
    assert.match(site.granularityLimitJa, /灌流領域ではありません/);
  }
});

test('physiology: language and praxis sit in one hemisphere in a right-handed brain', () => {
  const dominance = dominanceFor('right');
  assert.equal(dominance.language, 'left');
  assert.equal(dominance.praxis, 'left');
  assert.equal(dominance.spatialAttention, 'right');
  assert.throws(() => dominanceFor('left'), /only right-handedness is modelled/);
  assert.throws(() => dominanceFor('ambidextrous'), /only right-handedness is modelled/);
});

test('physiology: spatial attention is not in the language hemisphere', () => {
  const nondominant = withLesion('nondominant-parietal');
  assert.ok(barely(nondominant, 'attention-left-space'));
  assert.ok(reaches(nondominant, 'attention-right-space'), 'the other side has two routes');
  assert.ok(reaches(nondominant, 'auditory-comprehension'), 'and language is elsewhere');

  // The same parietal lobe on the language side is a different finding.
  const dominant = withLesion('dominant-angular');
  assert.ok(reaches(dominant, 'attention-left-space'));
});

test('physiology: a new memory needs a medial temporal lobe on one side or the other', () => {
  const bilateral = withLesion('bilateral-medial-temporal');
  assert.ok(barely(bilateral, 'episodic-memory-formation'));

  const oneSide = solveHigherBrainFunction({
    lesions: [{ id: 'one-hippocampus', structures: [{ label: 'Hippocampus', side: 'dominant' }] }],
  });
  assert.ok(reaches(oneSide, 'episodic-memory-formation'), 'one side is enough');
});

test('physiology: the callosum carries the left hand, so cutting it spares the right', () => {
  const state = withLesion('corpus-callosum');
  assert.ok(barely(state, 'praxis-left-hand'));
  assert.ok(reaches(state, 'praxis-right-hand'));
  assert.ok(reaches(state, 'auditory-comprehension'));
  assert.ok(reaches(state, 'episodic-memory-formation'));
});

test('physiology: a frontal–subcortical circuit reads the same wherever it is cut', () => {
  const cortex = withLesion('bifrontal-dorsolateral');
  const deep = withLesion('striatum-head');
  assert.ok(!reaches(cortex, 'set-shifting-and-planning'), 'from the cortex');
  assert.ok(!reaches(deep, 'set-shifting-and-planning'), 'and from the striatum');
  // The cortex is untouched in the second one, which is the teaching point.
  const frontalCortex = deep.nodes.find((node) => node.id === 'dorsolateral-prefrontal');
  assert.equal(frontalCortex.integrity, 1);
});

test('physiology: a unilateral lesion does not cut the other side’s connection', () => {
  // The defect this replaced: lesions used to name connections by id, and an
  // id has no side, so selecting one anterior thalamic radiation zeroed the
  // frontal circuits on both sides at once.
  const state = withLesion('dominant-anterior-thalamic-radiation');
  const { dominance } = state;
  const opposite = dominance.language === 'left' ? 'right' : 'left';
  for (const edge of state.edges) {
    const onlyOpposite = edge.within.length > 0 && edge.within.every((s) => s.side === opposite);
    if (onlyOpposite) {
      assert.equal(edge.integrity, 1, `${edge.id} runs on the untouched side and is untouched`);
    }
  }
  // The circuit it does touch is partly down, not abolished: one side of a
  // bilateral pathway is half of it.
  const touched = state.edges.find((edge) => edge.id === 'thalamus-to-dlpfc');
  assert.ok(touched.integrity > 0 && touched.integrity < 1, `half a bilateral tract, got ${touched.integrity}`);
  // And no structure on the untouched side took any damage at all.
  assert.ok(state.affectedStructures.every((structure) => structure.side !== opposite));
});

test('physiology: the thalamus is not an obligatory gate, and its absence is not "no effect"', () => {
  const state = withLesion('dominant-thalamus');
  // No forced zero. Naming used to be abolished by this lesion because the
  // production routes ran through a thalamic node placed there to produce that
  // result; the chronic-phase evidence does not support it.
  const naming = taskOf(state, 'naming-object');
  assert.equal(naming.computationStatus, COMPUTATION.COMPUTED);
  assert.notEqual(naming.state, PATHWAY_STATE.LOW);
  assert.equal(naming.declaredBlock, false);

  // And it is not silence either: the influence this model does not compute is
  // on the result, and on every language task the site declares it for.
  assert.ok(state.unmodelledInfluences.length > 0, 'the state carries it');
  for (const id of ['naming-object', 'propositional-output-route', 'auditory-comprehension', 'repetition-word']) {
    assert.ok(taskOf(state, id).unmodelledInfluences.length > 0, `${id} carries it too`);
  }
  // A task the site does not name it for does not get it for free.
  assert.equal(taskOf(state, 'praxis-left-hand').unmodelledInfluences.length, 0);
});

test('physiology: bilateral auditory cortex affects what is heard and nothing else', () => {
  const state = withLesion('bilateral-auditory-cortex');
  assert.ok(barely(state, 'auditory-comprehension'));
  assert.ok(barely(state, 'repetition-word'));
  assert.ok(barely(state, 'writing-to-dictation-word'), 'dictation goes in through the ear');
  assert.ok(reaches(state, 'reading-comprehension-word'));
  assert.ok(reaches(state, 'writing-from-meaning'));
  assert.ok(reaches(state, 'naming-object'));

  // And the model does not get to call it pure word deafness: it has no
  // audiometry and no non-speech sounds, so it cannot separate that from
  // cortical deafness. The task says so itself.
  const comprehension = taskOf(state, 'auditory-comprehension');
  assert.ok(comprehension.excludes.some((item) => /hearing itself/.test(item)));
  assert.ok(comprehension.excludesJa.some((item) => /皮質聾/.test(item)));

  // One side is not enough, which is why the node is paired.
  const oneSide = solveHigherBrainFunction({
    lesions: [{ id: 'one-heschl', structures: [{ label: 'Transverse temporal gyri', side: 'dominant' }] }],
  });
  assert.ok(reaches(oneSide, 'auditory-comprehension'));
});

test('physiology: the insula preset affects the spoken route and claims nothing about speech quality', () => {
  const state = withLesion('dominant-insula');
  assert.ok(!reaches(state, 'repetition-word'), 'the spoken route is affected');
  assert.ok(reaches(state, 'writing-from-meaning'), 'and the written one is not');
  // The quality of the articulation is what the diagnosis turns on, and this
  // model has none of it.
  assert.ok(taskOf(state, 'repetition-word').excludes.some((item) => /quality of the articulation/.test(item)));
  // The mesh is the whole insula, and the preset says that.
  const site = lesionSiteById('dominant-insula');
  assert.match(site.granularityLimitJa, /前部島を分けて持っていない/);
});

test('physiology: the angular gyrus does not produce a tetrad', () => {
  // It used to: calculation-and-body-schema was one node on the angular gyrus,
  // writing ran through it as well, and the pair of them was read out as
  // Gerstmann syndrome. The four deficits are not separately implemented, so
  // the task is declared not-modelled and cannot enter any comparison.
  const state = withLesion('dominant-angular');
  const tetrad = taskOf(state, 'calculation-and-body-schema');
  assert.equal(tetrad.computationStatus, COMPUTATION.NOT_MODELLED);
  assert.equal(tetrad.availability, null);
  assert.equal(tetrad.state, null);
  assert.ok(tetrad.excludesJa.some((item) => /Gerstmann 四徴を出せません/.test(item)));

  // What the lesion does reach is the whole-word spelling route, and that is
  // reported as itself.
  assert.ok(barely(state, 'writing-from-meaning'));
  assert.ok(reaches(state, 'writing-to-dictation-nonword'), 'the phonological route is elsewhere');
});

test('physiology: the perisylvian preset reports its reading route rather than being overwritten', () => {
  const state = withLesion('dominant-perisylvian');
  for (const id of ['auditory-comprehension', 'repetition-word', 'speech-initiation-route', 'naming-object']) {
    assert.ok(barely(state, id), `${id} is barely available`);
  }
  // Reading survives on a ventral route the preset does not touch. That is a
  // statement about the declared route, and the value is not pushed to zero to
  // match a label — there is no label.
  assert.ok(reaches(state, 'reading-comprehension-word'));
  const site = lesionSiteById('dominant-perisylvian');
  assert.match(site.granularityLimitJa, /体部位局在はない/);
});

test('physiology: the whole-commissure preset does not claim to be a splenial lesion', () => {
  const site = lesionSiteById('dominant-occipital-and-whole-callosum');
  assert.match(site.labelJa, /膨大部だけは選べません/);
  assert.match(site.granularityLimitJa, /脳梁後方の病変ではありません/);
  // And it takes the whole commissure rather than an invented share of one.
  const callosum = site.structures.find((structure) => structure.label === 'Corpus callosum');
  assert.equal(callosum.share, undefined, 'no share: all of it');
});

test('physiology: the same input gives the same answer, and a name is not an input', () => {
  const site = lesionSiteById('dominant-arcuate');
  const first = solveHigherBrainFunction({ lesions: [site] });
  // The same structures under a different id and label. Nothing about the name
  // may reach the arithmetic.
  const renamed = solveHigherBrainFunction({
    lesions: [{ ...site, id: 'something-else', label: 'Anything', labelJa: '何でも' }],
  });
  assert.deepEqual(
    first.tasks.map((task) => [task.id, task.computationStatus, task.availability]),
    renamed.tasks.map((task) => [task.id, task.computationStatus, task.availability])
  );
});
