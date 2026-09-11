import test from 'node:test';
import assert from 'node:assert/strict';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { guideProblems, guideStepProblems } from '../src/data/guideContract.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';

/**
 * The same promises, held for every disease by one set of rules.
 *
 * The heart-failure guide worked the shape out; `src/data/guideContract.js` is
 * that shape written down, and this is where each guide is measured against it.
 *
 * **The list is the catalogue, not a list kept here.** It used to name three
 * diseases, and ten more guides arrived with the scenes that needed them —
 * every one of them unchecked, because nothing added their row. A guide is now
 * covered the moment its scene exists, and a disease that ships a guide without
 * a scene fails rather than going quiet.
 *
 * Guides are keyed by scene **id**, which is not always the slug (`copd` is
 * `copd-hyperinflation` here), so the lookup accepts either.
 */

/** The stages and guide framings a scene actually offers, read from the scene. */
async function sceneContract(id) {
  const entry = SCENE_MANIFEST.find((scene) => scene.id === id || scene.slug === id);
  if (!entry) return null;
  const module = await entry.load();
  const Scene = module.default
    ?? module.Scene
    ?? Object.values(module).find((value) => typeof value === 'function' && value.meta);
  const stages = Scene?.meta?.stages ?? [];
  // Framings come from an instance because that is where the scene computes
  // them; a scene with none simply has none.
  let framings = [];
  try {
    framings = Object.keys(new Scene({}).getGuideFramings?.() ?? {});
  } catch {
    framings = [];
  }
  return { id, stages, framings };
}

const GUIDES = (await Promise.all(Object.keys(PATIENT_GUIDES).map(sceneContract))).filter(Boolean);

test('guide contract: every authored guide belongs to a scene in the catalogue', () => {
  const orphans = Object.keys(PATIENT_GUIDES).filter(
    (id) => !GUIDES.some((guide) => guide.id === id)
  );
  assert.deepEqual(orphans, [], 'a guide whose scene does not exist can never be shown');
  assert.ok(GUIDES.length >= 13, `every guide is measured, not a hand-kept few (${GUIDES.length})`);
});

for (const { id, stages, framings } of GUIDES) {
  test(`guide contract: ${id} keeps every promise the shape makes`, () => {
    const problems = guideProblems(PATIENT_GUIDES[id], { stages, framings });
    assert.deepEqual(problems, []);
  });

  test(`guide contract: ${id} marks what the model does not produce`, () => {
    // Every guide ends somewhere the model does not go. A reader cannot tell
    // that from looking, so it is marked — and the marked steps are the last
    // ones, so the walk through the model is not interrupted by them.
    const steps = PATIENT_GUIDES[id].steps;
    const marked = steps.filter((step) => step.educationalOnly);
    assert.ok(marked.length >= 1, `${id}: at least one general-explanation step`);
    assert.deepEqual(marked, steps.slice(steps.length - marked.length), `${id}: and they are the last ones`);
    for (const step of marked) {
      // Its "where to look" line has to say what the screen is *not* showing.
      // Wording differs a lot — 「何も新しく描かれていません」「この画面にはありません」
      // 「神経は描かれていません」 — so what is matched is the polite negative
      // itself, which is the denial. Matching 「ありません」 alone was matching
      // three guides' habits: 「描かれていません」 is the same denial and was
      // failing. A step that quietly pointed at something is the failure here,
      // and an affirmative "where to look" line has no 〜ません in it.
      assert.match(step.lookJa, /ません/, `${step.stage}: ${step.lookJa}`);
      assert.equal(step.frame, marked[0].frame, `${step.stage}: shows nothing the step before it did not`);
    }
  });
}

test('guide contract: the rules actually reject a step that breaks them', () => {
  // A contract nothing can fail is not a contract. Each of these is a defect
  // the two guides above would otherwise be free to acquire.
  const stages = [{ id: 'baseline', at: 0 }, { id: 'later', at: 0.5 }];
  const good = {
    stage: 'baseline', progress: 0,
    title: 'A', titleJa: 'あ', body: 'B', bodyJa: 'い', look: 'C', lookJa: 'う',
  };
  assert.deepEqual(guideStepProblems(good, { stages }), []);

  const rejects = (step, pattern) => {
    const problems = guideStepProblems({ ...good, ...step }, { stages, framings: ['wall'] });
    assert.ok(problems.some((problem) => pattern.test(problem)), `expected ${pattern}, got ${problems.join('; ')}`);
  };
  rejects({ stage: 'nowhere' }, /stage the scene does not have/);
  rejects({ progress: 0.9 }, /sits at 0\.9/);
  rejects({ lookJa: '' }, /carries no lookJa/);
  rejects({ bodyJa: 'あ'.repeat(200) }, /over 110/);
  rejects({ body: 'This can be treated with a drug.' }, /matches/);
  rejects({ bodyJa: '診断がつきます。' }, /matches/);
  rejects({ frame: 'nowhere' }, /does not declare/);
});

test('guide contract: a guide that skips a stage or walks backwards is rejected', () => {
  const stages = [{ id: 'a', at: 0 }, { id: 'b', at: 0.5 }];
  const step = (stage, progress) => ({
    stage, progress,
    title: 'A', titleJa: 'あ', body: 'B', bodyJa: 'い', look: 'C', lookJa: 'う',
  });

  assert.deepEqual(guideProblems({ steps: [step('a', 0), step('b', 0.5)] }, { stages }), []);
  assert.ok(
    guideProblems({ steps: [step('a', 0)] }, { stages }).some((problem) => /no step covers stage "b"/.test(problem))
  );
  assert.ok(
    guideProblems({ steps: [step('b', 0.5), step('a', 0)] }, { stages })
      .some((problem) => /goes backwards/.test(problem))
  );
  // Two steps at one position is allowed: the chain turns from one organ to the
  // next without the model moving.
  assert.deepEqual(
    guideProblems({ steps: [step('a', 0), step('b', 0.5), step('b', 0.5)] }, { stages }),
    []
  );
});

test('guide contract: a guide may not mark some steps and leave others bare', () => {
  // An unmarked step among marked ones is read as the safest of them.
  const stages = [{ id: 'a', at: 0 }, { id: 'b', at: 1 }];
  const step = (stage, progress, extra = {}) => ({
    stage, progress, title: 'A', titleJa: 'あ', body: 'B', bodyJa: 'い', look: 'C', lookJa: 'う', ...extra,
  });
  const problems = guideProblems(
    { steps: [step('a', 0, { certainty: 'established' }), step('b', 1)] },
    { stages }
  );
  assert.ok(problems.some((problem) => /some steps say how sure the field is/.test(problem)), problems.join('; '));

  // All marked is fine, and so is none marked.
  assert.deepEqual(
    guideProblems({ steps: [step('a', 0, { certainty: 'established' }), step('b', 1, { certainty: 'uncertain' })] }, { stages }),
    []
  );
  assert.deepEqual(guideProblems({ steps: [step('a', 0), step('b', 1)] }, { stages }), []);

  // And a word nobody defined is not a certainty.
  assert.ok(
    guideStepProblems(step('a', 0, { certainty: 'probably' }), { stages })
      .some((problem) => /is not one of/.test(problem))
  );
});

test('guide contract: the amyloid guide does not close the causal chain', () => {
  // This is the one guide whose subject is contested, and the marking is the
  // content rather than a hedge. Four things have to stay true of it.
  const steps = PATIENT_GUIDES['amyloid-beta'].steps;

  // 1. Every step says how sure the field is.
  for (const step of steps) assert.ok(step.certainty, `${step.stage}: unmarked`);

  // 2. The oligomer step is "seen together", never a cause.
  const oligomer = steps.find((step) => step.stage === 'oligomer');
  assert.equal(oligomer.certainty, 'associated');
  assert.doesNotMatch(oligomer.bodyJa, /引き起こ|原因|によって/);
  assert.match(oligomer.bodyJa, /並んで|一緒|報告/);

  // 3. It ends on two open questions, as steps rather than footnotes: how much
  //    is on screen says nothing about a person, and the route from the
  //    build-up to that person's symptoms is not fully known.
  //
  //    **What is open is the route, not the involvement.** An earlier version
  //    marked the last step `hypothesised` and called the whole thing "one
  //    explanation researchers have put forward", which reads as though Aβ's
  //    part in the disease were itself unsettled — more doubt than the field
  //    has. Both are `uncertain` now, and the fourth check below is what keeps
  //    that from sliding the other way into a stated cause.
  const uncertain = steps.filter((step) => step.certainty === 'uncertain');
  assert.equal(uncertain.length, 2, 'the amount and the route are both open, and both are steps');
  assert.ok(
    uncertain.some((step) => /記憶の問題がない人|測ったものではありません/.test(step.bodyJa)),
    'one says the amount says nothing about a person'
  );
  assert.ok(
    uncertain.some((step) => /道筋|分かっていない/.test(step.bodyJa)),
    'and one says the route to symptoms is not fully known'
  );
  // And the build-up's part in the disease is stated rather than doubted: the
  // correction that produced this test was that the guide had made it sound
  // like an open question.
  const last = steps.at(-1);
  assert.match(last.bodyJa, /アルツハイマー病でみられる重要な脳の変化|重要な脳の変化の一つ/);
  assert.equal(last.certainty, 'uncertain');
  assert.equal(last.educationalOnly, true);

  // 4. No step anywhere states the cascade as fact.
  for (const step of steps) {
    for (const text of [step.titleJa, step.bodyJa, step.lookJa]) {
      assert.doesNotMatch(text, /アルツハイマー病を引き起こ|認知症になります|原因です/, text);
    }
  }
});

test('guide contract: the ischaemia guide says what the colour is, and never says infarction', () => {
  // What this checks is the *copy*, not what a reader ends up believing. The
  // model has no infarction in it — no necrosis, no scar, no infarct expansion
  // — and the colour is an educational emphasis of the ischaemic region. A
  // patient looking at a discoloured wall may still reach for "dead muscle";
  // whether the words are enough to stop them is a clinical-review question,
  // and no test here settles it.
  const steps = PATIENT_GUIDES['myocardial-ischemia'].steps;
  const colour = steps.find((step) => step.stage === 'burden');
  assert.match(colour.bodyJa, /壊死ではありません/);
  assert.match(colour.body, /not dead/i);

  for (const step of steps) {
    for (const text of [step.title, step.titleJa, step.body, step.bodyJa, step.look, step.lookJa]) {
      assert.doesNotMatch(text, /梗塞|壊死し|心筋梗塞|発作/, text);
      assert.doesNotMatch(text, /\binfarct|necrosis|heart attack/i, text);
    }
  }
});

test('guide contract: the ischaemia guide keeps the neighbouring region in the sentence', () => {
  // The whole point of drawing territories is the comparison. Three steps rest
  // on it, and a framing that filled the screen with one wall cropped it — so
  // the copy names the neighbour and the steps that do share one framing.
  const steps = PATIENT_GUIDES['myocardial-ischemia'].steps;
  const comparing = steps.filter((step) => /隣|境目|見比べ/.test(`${step.bodyJa} ${step.lookJa}`));
  assert.ok(comparing.length >= 2, 'the comparison is made more than once');
  for (const step of comparing) assert.equal(step.frame, 'wall', `${step.stage}: framed to hold both regions`);
});
