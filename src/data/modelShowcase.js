/**
 * How a disease model introduces itself on a card: a picture, its name, and
 * one question.
 *
 * BYOKI MOTION's model cards carry three things and no more (ADR 2026-09-30):
 * what the model looks like, what it is called, and the one question it lets a
 * reader answer by moving it. No maturity badge, no review pill, no description
 * paragraph — those belong to 「このモデルについて」 inside the model, where the
 * reader is deciding whether to trust a figure, not whether to open a model.
 *
 * ## The question is a claim, so it is written sparingly
 *
 * A card's question is read before the model's scope panel, so it must be
 * true *of the model*, not of the disease in general. Each one here was
 * checked against the model's own output:
 *
 * - `cardiac-output`: raising systemic resistance alone raises the mean
 *   arterial pressure and lowers the cardiac output (89 → 126 mmHg,
 *   4.7 → 4.1 L/min across the control's range), while raising the filling
 *   raises both. So "does pumping rise with pressure?" has the answer the
 *   model shows: not necessarily. `tests/model-showcase.test.js` solves the
 *   model and fails if that stops being true.
 *
 * Every other model falls back to the catalogue's own `storyTitleJa` — a line
 * the scene's authors already wrote and review — and, without one, to no
 * question at all rather than an invented one.
 *
 * `poster` is a photograph of the real model (`npm run posters`), never an
 * illustration of what the model might look like. Without one the card shows
 * a quiet typographic panel; it does not borrow the link-preview card, which
 * is a caption, not a picture (`publicManifest.js`).
 *
 * Pure data.
 */
export const MODEL_SHOWCASE = Object.freeze({
  'cardiac-output': Object.freeze({
    question: Object.freeze({
      ja: '血圧が上がれば、送り出す血液も増えるのか。',
      en: 'When the pressure rises, does the heart pump more?',
    }),
    poster: 'posters/cardiac-output.jpg',
  }),
  'amyloid-beta': Object.freeze({
    question: Object.freeze({
      ja: '分子は、どのように老人斑へ変わるのか。',
      en: 'How does a molecule become a plaque?',
    }),
  }),
});

/** The system a model belongs to, in the words a card uses (循環, not 循環器系). */
export const SHOWCASE_SYSTEM_LABELS = Object.freeze({
  cardiovascular: Object.freeze({ ja: '循環', en: 'Circulation' }),
  respiratory: Object.freeze({ ja: '呼吸', en: 'Respiration' }),
  nervous: Object.freeze({ ja: '神経', en: 'Nervous system' }),
  renal: Object.freeze({ ja: '腎', en: 'Kidney' }),
  hepatobiliary: Object.freeze({ ja: '肝胆道', en: 'Liver & biliary' }),
  gastrointestinal: Object.freeze({ ja: '消化管', en: 'Digestive tract' }),
  musculoskeletal: Object.freeze({ ja: '運動器', en: 'Musculoskeletal' }),
  sensory: Object.freeze({ ja: '感覚器', en: 'Sensory' }),
  endocrine: Object.freeze({ ja: '内分泌', en: 'Endocrine' }),
  reproductive: Object.freeze({ ja: '生殖器', en: 'Reproductive' }),
  integumentary: Object.freeze({ ja: '皮膚', en: 'Skin' }),
});

/**
 * Everything a card needs about one scene.
 *
 * @param {{id: string, system?: string, titleJa?: string, titleEn?: string, storyTitleJa?: string|null, storyTitleEn?: string|null}} scene
 * @returns {{ id: string, name: {ja: string, en: string}, system: {ja: string, en: string}|null,
 *   question: {ja: string, en: string}|null, poster: string|null }}
 */
export function showcaseFor(scene) {
  const entry = MODEL_SHOWCASE[scene.id] ?? null;
  const story = scene.storyTitleJa
    ? { ja: scene.storyTitleJa, en: scene.storyTitleEn ?? scene.storyTitleJa }
    : null;
  return {
    id: scene.id,
    name: { ja: scene.titleJa ?? scene.id, en: scene.titleEn ?? scene.titleJa ?? scene.id },
    system: SHOWCASE_SYSTEM_LABELS[scene.system] ?? null,
    question: entry?.question ?? story,
    poster: entry?.poster ?? null,
  };
}
