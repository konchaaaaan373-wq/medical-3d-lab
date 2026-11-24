/**
 * The learning themes of the higher-brain-function area.
 *
 * ## These are questions, not answers — on purpose
 *
 * This file is read by the front page and by `#/functions`, both of which are
 * open in a production build while the function model itself
 * (`higher-brain-function`, alpha, medical review pending) is not. So nothing
 * here says which structure does what. Each theme states **the question the
 * model lets a learner work out**, and the answer stays where the evidence
 * dossier, the model card and the release gate govern it — in the model.
 * `tests/mri-atlas-data.test.js` holds the line: no lobe, gyrus, nucleus, tract
 * or eponymous area is named in this file's copy, and every theme ends as a
 * question. ("Hemisphere" is allowed: asking whether the two sides differ is
 * not saying which side does what.)
 *
 * `tasks` are ids of `FUNCTION_TASKS` in `src/models/higherBrainFunction.js`,
 * written as strings because the application shell must not import a medical
 * model (it would put an unpublished model into the production bundle). The
 * same test checks every id exists. An empty list means the model does not
 * cover the theme yet, and the page says "planned" rather than implying it does.
 *
 * `priority` themes are the four the launch promises first.
 */
export const FUNCTION_THEMES = Object.freeze([
  {
    id: 'language',
    priority: true,
    en: 'Language and aphasia',
    ja: '言語・失語',
    questionEn: 'Speaking, understanding and repeating are all "language" — do they travel the same route?',
    questionJa: '話す・聞いて理解する・復唱する。同じ「言語」でも、通る経路は同じでしょうか。',
    tasks: ['auditory-comprehension', 'repetition', 'speech-fluency', 'propositional-speech', 'naming'],
  },
  {
    id: 'memory',
    priority: true,
    en: 'Memory',
    ja: '記憶',
    questionEn: 'Does laying down a new memory depend on one place in the brain?',
    questionJa: '新しい出来事を覚える働きは、脳のどこか 1 か所に頼っているのでしょうか。',
    tasks: ['episodic-memory-formation'],
  },
  {
    id: 'attention',
    priority: true,
    en: 'Attention and hemispatial neglect',
    ja: '注意・半側空間無視',
    questionEn: 'Is attention to the left and right halves of space shared evenly between the two hemispheres?',
    questionJa: '左右の空間への注意は、左右の半球に同じように割り当てられているのでしょうか。',
    tasks: ['attention-left-space', 'attention-right-space'],
  },
  {
    id: 'executive',
    priority: true,
    en: 'Executive function',
    ja: '遂行機能',
    questionEn: 'Planning, inhibition and drive: do they fail together, or can one fail without the others?',
    questionJa: '計画・抑制・発動性は、まとまって障害されるのでしょうか。それとも、別々に障害されうるのでしょうか。',
    tasks: ['set-shifting-and-planning', 'behavioural-inhibition', 'initiation-and-drive'],
  },
  {
    id: 'praxis',
    priority: false,
    en: 'Praxis and apraxia',
    ja: '行為・失行',
    questionEn: 'Does the instruction for a learned movement reach the right hand and the left hand by the same path?',
    questionJa: '習熟した動作の指示は、右手と左手に同じ道筋で届くのでしょうか。',
    tasks: ['praxis-right-hand', 'praxis-left-hand'],
  },
  {
    id: 'literacy',
    priority: false,
    en: 'Reading, writing and calculation',
    ja: '読字・書字・計算',
    questionEn: 'Why can reading be lost while writing is kept?',
    questionJa: '書けるのに読めない、ということがなぜ起こりうるのでしょうか。',
    tasks: ['reading', 'writing', 'calculation-and-body-schema'],
  },
  {
    id: 'visual',
    priority: false,
    en: 'Visual cognition and agnosia',
    ja: '視覚認知・失認',
    questionEn: 'Seeing a thing and knowing what it is — where do the two part ways?',
    questionJa: '「見えている」ことと「何か分かる」ことは、どこで分かれるのでしょうか。',
    tasks: [],
  },
  {
    id: 'networks',
    priority: false,
    en: 'Large-scale brain networks',
    ja: '大規模脳機能ネットワーク',
    questionEn: 'What changes when function is read as a property of a network rather than of a place?',
    questionJa: '機能を「場所」ではなく「ネットワーク」の性質として読むと、何が変わるのでしょうか。',
    tasks: [],
  },
].map((theme) => Object.freeze({ ...theme, tasks: Object.freeze(theme.tasks) })));

export const PRIORITY_THEMES = FUNCTION_THEMES.filter((theme) => theme.priority);

export const functionThemeById = (id) => FUNCTION_THEMES.find((theme) => theme.id === id) ?? null;
