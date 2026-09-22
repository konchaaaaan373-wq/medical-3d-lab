/**
 * Higher cortical function, as a claim about **routes through named anatomy**.
 *
 * The question this model exists to answer: **why does a lesion of one size
 * take away one set of higher functions and not another, and why is the left
 * side of the brain not the mirror of the right in a right-handed person?**
 *
 * The usual way this is taught is a table — Broca's aphasia is non-fluent with
 * repetition impaired, conduction aphasia is fluent with repetition impaired,
 * and so on — and the table is memorised because nothing in it explains
 * anything. Here **no syndrome is stored**. What is stored is:
 *
 * 1. a set of **processing nodes**, each one pinned to structures the brain
 *    atlas can actually display by name (`structures` below are `bx_label`
 *    values of `public/assets/brain/brain.glb`; `tests/higher-brain-function-anatomy.test.js`
 *    refuses any node naming a structure the atlas does not carry),
 * 2. the **connections** between them, each one anchored in the named mesh a
 *    lesion of that tract would sit inside, and
 * 3. one or more **routes** per clinical task — what has to work, in order, for
 *    a person to repeat a word, name an object, read, write, use a tool with
 *    either hand, attend to one side of space, or lay down a new memory.
 *
 * A lesion damages structures and connections. Everything else — which routes
 * still carry, and where along a route the signal stops — is **solved from the
 * routes**. Cut the dorsal route between the posterior superior temporal gyrus
 * and the inferior frontal gyrus and the repetition route stops while the
 * comprehension route does not, because repetition is the one task whose route
 * uses it.
 *
 * ## What this model does not decide: the diagnosis
 *
 * It computes **route availability**, and it stops there. It does not name a
 * syndrome, and it does not rule one out. There is no classifier in this file
 * and nothing here returns "Broca aphasia" or "not aphasia" — an earlier
 * version did both, by running the solved tasks through a first-match chain,
 * and that was wrong twice over: a first-match chain turns a list of route
 * values into a clinical verdict it has no standing to give, and the features
 * that actually separate the aphasias (the quality of speech, paraphasia,
 * agrammatism, the stimulus a task was probed with) are not computed here at
 * all. The classical syndromes now live in `src/data/aphasiaReference.js` as
 * **reference reading**, next to the list of what this model does not evaluate,
 * and nothing in that file can reach this one.
 *
 * ## Two kinds of intervention, and they do not mix
 *
 * {@link MODE.ATLAS_LESION} damages named structures of the atlas.
 * {@link MODE.CONCEPTUAL} switches off a declared cognitive process directly,
 * which is how the dissociations this model is built to teach — lexical versus
 * phonological writing, letters versus objects, the auditory way in — can be
 * operated even where the atlas has no mesh that separates them. A conceptual
 * result is **not** a prediction about any real lesion, and the solver refuses
 * to be given both at once so that one cannot be read as the other.
 *
 * ## Handedness is an input, and this model takes only one value
 *
 * Every side in the network below is written as `dominant` / `nondominant`
 * relative to the **language-dominant hemisphere**, and that hemisphere is
 * derived from handedness by {@link dominanceFor}. This model is built for the
 * representative **right-handed** case and refuses any other value, because
 * left-handedness is *not* the mirror image of it: most left-handers are also
 * left-dominant for language, and the minority who are not are split between
 * right-dominant and bilateral. A model that flipped the brain when handedness
 * flipped would teach something false, so it declines to answer instead.
 * `docs/medical-notes.md` carries the numbers this paragraph stands on.
 *
 * Spatial attention is deliberately **not** tied to the language-dominant
 * hemisphere: it is declared on the non-dominant side, which is what makes a
 * lesion of one parietal lobe produce neglect and the same lesion on the other
 * produce none. That asymmetry is the reason handedness is worth stating.
 *
 * ## The only quantity here is dimensionless, and it is an ordering
 *
 * There are no clinical units in this model, because the thing it computes is
 * not measured in any: `integrity` and `availability` are on 0–1, and what is
 * claimed about them is **direction and order** — more damage transmits less,
 * a route is no better than its worst link, and a task's availability is that
 * of the best route it is *eligible* to use. The two thresholds that turn an
 * availability into high / intermediate / low are choices of where to draw a
 * line on that ordering, not measured cut-offs, and no output of this model is
 * a score, a severity scale or a test result.
 *
 * The words are chosen to say that. `low` is **not** "the patient cannot do
 * this": it is the bottom band of a dimensionless number, and a route at 0.2
 * is not a route at zero. Only when every eligible route has an element at
 * exactly zero does the result say so, as `declaredBlock`, and even then what
 * is blocked is a route in this model. See
 * `docs/model-evidence/higher-brain-function.md`.
 *
 * ## What this is not
 *
 * An educational conceptual model. It is not a lesion localiser: it will not
 * tell anybody where a patient's lesion is, and the atlas it points at is one
 * normal specimen, not anybody's brain. It has no time course of recovery, no
 * diaschisis, no plasticity, no oedema and no penumbra — the extent of a lesion
 * is an input, never a prediction. Paraphasia, prosody, agrammatism, dysarthria
 * and every other *quality* of speech are outside it: this model says whether a
 * route carries, not what comes out of it.
 */

/** The handedness this model is built for. Anything else is refused. */
export const HANDEDNESS = Object.freeze({ RIGHT: 'right' });

/**
 * How a side is written in the network. Sides are stated **relative to the
 * language-dominant hemisphere**, never as left/right, so that the anatomy is
 * resolved in one place from one assumption.
 */
export const SIDE = Object.freeze({
  DOMINANT: 'dominant',
  NONDOMINANT: 'nondominant',
  MEDIAN: 'median',
});

/** How a task's route is doing. Three steps, because that is what is claimed. */
export const PATHWAY_STATE = Object.freeze({
  HIGH: 'high',
  INTERMEDIATE: 'intermediate',
  LOW: 'low',
});

/**
 * Whether there is a number at all, and why not when there is not.
 *
 * The three are not degrees of the same thing. `NOT_MODELLED` means this model
 * has no route for the task — reading aloud, copying, connected-speech fluency
 * — and a task in that state must never be read as normal, or used to tell one
 * syndrome from another. `INDETERMINATE` means the routes that *were* evaluated
 * do not settle the answer: an eligible route exists whose availability this
 * model cannot compute, so "every route is blocked" is not something it may
 * conclude.
 */
export const COMPUTATION = Object.freeze({
  COMPUTED: 'computed',
  INDETERMINATE: 'indeterminate',
  NOT_MODELLED: 'not_modeled',
});

/** Which kind of intervention produced a result. They are never mixed. */
export const MODE = Object.freeze({
  ATLAS_LESION: 'atlas_lesion',
  CONCEPTUAL: 'conceptual_intervention',
});

/**
 * How firmly a process is tied to something the atlas can draw.
 *
 * Adding a cognitive process to this file does not create a mesh. `ATLAS` is a
 * named structure whose identity is not in dispute for the purpose it is used
 * for; `COARSE` is a real mesh standing in for something finer than the atlas
 * divides; `CONCEPTUAL` has no structure at all and can only be operated in
 * {@link MODE.CONCEPTUAL}. A process that is `CONCEPTUAL` is not thereby
 * immune to lesions — it is **unevaluated** by them, which is a different
 * thing and is reported as {@link COMPUTATION.INDETERMINATE} rather than as
 * health.
 */
export const MAPPING = Object.freeze({
  ATLAS: 'atlas-structure',
  COARSE: 'coarse-educational',
  CONCEPTUAL: 'conceptual',
});

/**
 * What a task was probed with. This is what makes route eligibility possible.
 *
 * A nonword has no entry in any lexicon, so a route through the lexical store
 * is not a route it may take — which is the whole of what separates
 * phonological from lexical agraphia, and the reason `max()` in this model is
 * taken over *eligible* routes rather than over all declared ones.
 */
export const STIMULUS = Object.freeze({
  KNOWN_WORD: 'known-word',
  NONWORD: 'nonword',
  OBJECT: 'object',
  TEXT: 'text',
  MEANING: 'meaning',
});

/**
 * Where the line is drawn on the availability ordering.
 *
 * Choices, and stated as such: nothing measured says a route carrying 0.8 of
 * its signal is "intermediate". What is claimed is that these two numbers are
 * ordered and fixed, so that a heavier lesion is never reported as a lighter
 * one.
 */
export const AVAILABILITY_HIGH = 0.85;
export const AVAILABILITY_LOW = 0.25;

/**
 * The hemispheric assignment a handedness implies.
 *
 * @param {string} handedness one of {@link HANDEDNESS}
 * @returns {{handedness:string, language:'left'|'right', praxis:'left'|'right',
 *   spatialAttention:'left'|'right', writingHand:'left'|'right', typicalShare:string}}
 */
export function dominanceFor(handedness) {
  if (handedness !== HANDEDNESS.RIGHT) {
    throw new Error(
      `higherBrainFunction: only right-handedness is modelled (got ${JSON.stringify(handedness)}). `
      + 'Left-handedness is not the mirror image of it — most left-handers are also left-dominant '
      + 'for language — so this model declines rather than flipping the brain.'
    );
  }
  return Object.freeze({
    handedness: HANDEDNESS.RIGHT,
    /** The hemisphere every `dominant` side below resolves to. */
    language: 'left',
    /** Praxis formulas sit with language in the representative right-hander. */
    praxis: 'left',
    /** Not with language, and that is the point of stating handedness at all. */
    spatialAttention: 'right',
    writingHand: 'right',
    typicalShare: 'representative case; roughly 19 of 20 right-handers are left-dominant for language',
  });
}

/**
 * Resolve a network side against a dominance.
 *
 * @param {string} side one of {@link SIDE}
 * @param {{language:string}} dominance from {@link dominanceFor}
 * @returns {'left'|'right'|'median'}
 */
export function resolveSide(side, dominance) {
  if (side === SIDE.MEDIAN) return 'median';
  const opposite = dominance.language === 'left' ? 'right' : 'left';
  if (side === SIDE.DOMINANT) return dominance.language;
  if (side === SIDE.NONDOMINANT) return opposite;
  throw new Error(`higherBrainFunction: unknown side ${JSON.stringify(side)}`);
}

/** The key a damaged structure is accumulated under. */
export function structureKey(label, side) {
  return `${label}|${side}`;
}

const dominant = (label) => ({ label, side: SIDE.DOMINANT });
const nondominant = (label) => ({ label, side: SIDE.NONDOMINANT });
const median = (label) => ({ label, side: SIDE.MEDIAN });
const bilateral = (label) => [dominant(label), nondominant(label)];

/**
 * How a node's structures combine into one integrity.
 *
 * `composite` — the structures are parts of one functional area, so damage to
 * any of them takes part of it: integrity falls with the **mean** damage.
 *
 * `paired` — the same job is done on both sides, so the node survives on
 * whichever side is left: integrity is the **best** side. This is what makes a
 * one-sided lesion of Heschl's gyrus or of one hippocampus produce nothing,
 * and bilateral damage produce everything.
 */
export const NODE_SUBSTRATE = Object.freeze({ COMPOSITE: 'composite', PAIRED: 'paired' });

/**
 * The nodes `paired` applies to, and why each one.
 *
 * `paired` says the job survives on one side, which is a strong claim and not
 * a general rule about the brain — so it is enumerated here rather than left
 * to whoever adds the next node. Each entry is a case where one-sided damage
 * is *described* as producing nothing: each ear reaches both auditory
 * cortices, and an amnesic syndrome needs both medial temporal lobes.
 */
export const PAIRED_NODE_RATIONALE = Object.freeze({
  'auditory-input': 'Each ear projects to both hemispheres, so one auditory cortex carries the input.',
  'medial-temporal-memory': 'One medial temporal lobe is enough to form new memories; the amnesic syndrome needs both.',
  'limbic-memory-relay': 'The same, one relay downstream.',
});

/**
 * The processing nodes, each one pinned to atlas structures by name.
 *
 * Two nodes may name the same mesh: the atlas has one `Precentral gyrus` per
 * side and no somatotopy inside it, so the face/articulator part and the hand
 * part are two nodes over one structure. That is a limitation of the substrate
 * and it is written down rather than hidden — a lesion drawn on the precentral
 * gyrus here takes the mouth and the hand together, which a real superior-division
 * lesion often does and a small hand-knob lesion does not.
 *
 * @type {readonly {id:string,label:string,labelJa:string,substrate:string,
 *   structures:readonly {label:string,side:string}[],note?:string,noteJa?:string}[]}
 */
export const FUNCTION_NODES = Object.freeze([
  {
    id: 'auditory-input',
    mapping: MAPPING.ATLAS,
    label: 'Primary auditory cortex',
    labelJa: '一次聴覚野（横側頭回）',
    substrate: NODE_SUBSTRATE.PAIRED,
    structures: Object.freeze(bilateral('Transverse temporal gyri')),
    note: 'Each ear reaches both sides, so one-sided damage here takes nothing away.',
    noteJa: '片耳の入力は両側に届くので、片側だけの障害では何も失われません。',
  },
  {
    id: 'phonological-analysis',
    mapping: MAPPING.ATLAS,
    label: 'Phonological analysis (Wernicke area)',
    labelJa: '音韻の分析（Wernicke 野：上側頭回後部・側頭平面）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      dominant('Superior temporal gyrus (Lateral part)'),
      dominant('Temporal plane'),
    ]),
  },
  {
    id: 'lexical-semantic',
    mapping: MAPPING.ATLAS,
    label: 'Lexical and semantic store',
    labelJa: '語彙・意味の貯蔵（中側頭回〜側頭極）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Middle temporal gyrus'), dominant('Temporal pole')]),
  },
  {
    id: 'speech-initiation',
    mapping: MAPPING.COARSE,
    label: 'Speech initiation (supplementary motor and anterior cingulate)',
    labelJa: '発話の起動（補足運動野・前部帯状回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      dominant('Superior frontal gyrus'),
      dominant('Cingulate gyrus and sulcus (Middle anterior part)'),
    ]),
    note: 'The supplementary motor area is the medial part of the superior frontal gyrus; the atlas does not divide it out.',
    noteJa: '補足運動野は上前頭回の内側部ですが、このアトラスはそこを別の区画として持っていません。',
  },
  {
    id: 'phonological-output',
    mapping: MAPPING.ATLAS,
    label: 'Phonological output planning (Broca area)',
    labelJa: '音韻の出力計画（Broca 野：下前頭回弁蓋部・三角部）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      dominant('Opercular part of inferior frontal gyrus'),
      dominant('Triangular part of inferior frontal gyrus'),
    ]),
  },
  {
    id: 'speech-motor',
    mapping: MAPPING.COARSE,
    label: 'Articulatory motor output',
    labelJa: '発語の運動出力（中心前回下部・島）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      dominant('Precentral gyrus'),
      dominant('Insula (Subcentral gyrus and ant. and post. sulci)'),
    ]),
  },
  {
    id: 'visual-input-dominant',
    mapping: MAPPING.ATLAS,
    label: 'Visual cortex, dominant hemisphere',
    labelJa: '優位半球の一次視覚野（対側＝右視野を受ける）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Calcarine sulcus'), dominant('Cuneus'), dominant('Lingual gyrus')]),
  },
  {
    id: 'visual-input-nondominant',
    mapping: MAPPING.ATLAS,
    label: 'Visual cortex, non-dominant hemisphere',
    labelJa: '非優位半球の一次視覚野（左視野を受ける）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      nondominant('Calcarine sulcus'), nondominant('Cuneus'), nondominant('Lingual gyrus'),
    ]),
  },
  {
    id: 'orthographic-visual-form',
    mapping: MAPPING.COARSE,
    label: 'Visual form of letters and words',
    labelJa: '文字・語形の視覚処理（外側後頭側頭回内）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Lateral occipitotemporal gyrus')]),
    sharesMeshWith: Object.freeze(['object-visual-form']),
    note:
      'A distinct process, on a mesh it shares with object form: the atlas has one occipitotemporal '
      + 'gyrus and does not divide word-responsive from object-responsive cortex inside it. So the two '
      + 'come apart when they are switched off directly, and a lesion drawn here takes both.',
    noteJa:
      '物体形態とは別の処理ですが、載っているメッシュは同じです——アトラスは外側後頭側頭回を 1 つしか持たず、'
      + 'その中を「文字に応じる部分」と「物体に応じる部分」に分けていません。したがって直接遮断すれば 2 つは'
      + '分かれますが、ここに病変を置けば両方が落ちます。',
  },
  {
    id: 'object-visual-form',
    mapping: MAPPING.COARSE,
    label: 'Visual form of objects',
    labelJa: '物体形態の視覚処理（外側後頭側頭回内）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Lateral occipitotemporal gyrus')]),
    sharesMeshWith: Object.freeze(['orthographic-visual-form']),
  },
  {
    id: 'orthographic-output-lexicon',
    mapping: MAPPING.COARSE,
    label: 'Orthographic output lexicon (whole-word spelling)',
    labelJa: '正書法出力語彙（語まるごとの綴り）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Angular gyrus')]),
    note:
      'Placed on the angular gyrus because the cases of lexical agraphia — irregular words misspelled, '
      + 'nonwords spelled correctly — were reported with angular lesions sparing the supramarginal gyrus. '
      + 'The mesh is the whole gyrus, so this is the gyrus standing in for a part of it.',
    noteJa:
      '語彙性失書（不規則語は綴れず、非語は綴れる）の症例が、縁上回を避けた角回病変で報告されているため'
      + '角回に置いています。メッシュは角回全体なので、その一部の代わりに角回を置いた形です。',
  },
  {
    id: 'phoneme-grapheme-conversion',
    mapping: MAPPING.COARSE,
    label: 'Phoneme-to-grapheme conversion',
    labelJa: '音韻—文字変換',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Supramarginal gyrus')]),
    note:
      'The complementary half of the same pair of case series: phonological agraphia — nonwords cannot be '
      + 'spelled, real words can — was reported with supramarginal lesions sparing the angular gyrus. It '
      + 'shares the mesh with the praxis formulas, which is why a supramarginal lesion here takes both.',
    noteJa:
      '同じ症例群の対になる半分です。音韻性失書（非語が綴れず、実在語は綴れる）は角回を避けた縁上回病変で'
      + '報告されています。行為の図式と同じメッシュに載るため、縁上回の病変は両方を奪います。',
  },
  {
    id: 'graphemic-buffer',
    mapping: MAPPING.CONCEPTUAL,
    assumedAvailable: true,
    label: 'Graphemic buffer (holding and ordering the letters)',
    labelJa: '書記素の保持と配列',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([]),
    note:
      'No atlas structure, so no lesion can be drawn on it: it is taken as available, and every task '
      + 'whose route passes through it carries that assumption as a stated limitation rather than as a '
      + 'finding. Both spelling routes converge here, which is the claim — switching it off affects '
      + 'every kind of writing at once, whichever route composed the letters, and leaves the routes '
      + 'above it untouched.',
    noteJa:
      'アトラスに対応する構造がないので、**病変は置けません**。利用可能として扱い、'
      + 'ここを通る課題はその仮定を「所見」ではなく「明示した限界」として結果に載せます。'
      + '2 つの綴りの経路がここで合流することがこのノードの主張で、遮断すれば'
      + '**どの経路で綴ったかに関係なく書字全体**が影響を受け、上流の経路は影響を受けません。',
  },
  {
    id: 'graphomotor-output',
    mapping: MAPPING.COARSE,
    label: 'Graphomotor output (moving the pen)',
    labelJa: '筆記の運動出力',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Precentral gyrus')]),
    note:
      'Deliberately downstream of, and not part of, any writing task in this model. The atlas precentral '
      + 'gyrus has no somatotopy, so this is not "the hand area"; and a hand that will not move is not '
      + 'agraphia. Kept as its own stage so the two cannot be reported as one finding.',
    noteJa:
      'このモデルのどの書字課題にも**含めていません**（下流の別段階です）。アトラスの中心前回に体部位局在は'
      + 'ないので、これは「手の領域」ではありません。そして動かない手は失書ではありません。2 つを 1 つの'
      + '所見として報告しないために、独立した段階として持っています。',
  },
  {
    id: 'praxis-formula',
    mapping: MAPPING.ATLAS,
    label: 'Praxis formulas (dominant supramarginal gyrus)',
    labelJa: '行為の図式（優位半球 縁上回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Supramarginal gyrus')]),
  },
  {
    id: 'premotor-dominant',
    mapping: MAPPING.COARSE,
    label: 'Premotor cortex, dominant hemisphere',
    labelJa: '優位半球の運動前野（中前頭回後部）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Middle frontal gyrus')]),
  },
  {
    id: 'premotor-nondominant',
    mapping: MAPPING.COARSE,
    label: 'Premotor cortex, non-dominant hemisphere',
    labelJa: '非優位半球の運動前野（中前頭回後部）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([nondominant('Middle frontal gyrus')]),
  },
  {
    id: 'hand-motor-dominant',
    mapping: MAPPING.COARSE,
    label: 'Motor cortex for the right hand',
    labelJa: '右手の運動野（優位半球 中心前回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Precentral gyrus')]),
  },
  {
    id: 'hand-motor-nondominant',
    mapping: MAPPING.COARSE,
    label: 'Motor cortex for the left hand',
    labelJa: '左手の運動野（非優位半球 中心前回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([nondominant('Precentral gyrus')]),
  },
  {
    id: 'spatial-attention-nondominant',
    mapping: MAPPING.ATLAS,
    label: 'Spatial attention, non-dominant parietal',
    labelJa: '非優位半球 頭頂葉の空間性注意',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      nondominant('Supramarginal gyrus'),
      nondominant('Intraparietal sulcus'),
      nondominant('Superior parietal lobule'),
    ]),
    note: 'Declared to attend to both halves of space; the dominant parietal is declared to attend to one.',
    noteJa: '両側の空間に注意を向けると宣言しています。優位半球側は片側のみです。',
  },
  {
    id: 'spatial-attention-dominant',
    mapping: MAPPING.ATLAS,
    label: 'Spatial attention, dominant parietal',
    labelJa: '優位半球 頭頂葉の空間性注意',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      dominant('Supramarginal gyrus'),
      dominant('Intraparietal sulcus'),
      dominant('Superior parietal lobule'),
    ]),
  },
  {
    id: 'dorsolateral-prefrontal',
    mapping: MAPPING.COARSE,
    label: 'Dorsolateral prefrontal cortex',
    labelJa: '背外側前頭前野',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Middle frontal gyrus')]),
    note: 'Both sides, combined rather than paired: one-sided damage here impairs without abolishing.',
    noteJa: '両側を合算しています（paired ではありません）。片側だけの障害でも完全には失われず、低下します。',
  },
  {
    id: 'orbitofrontal',
    mapping: MAPPING.ATLAS,
    label: 'Orbitofrontal cortex',
    labelJa: '眼窩前頭皮質',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      ...bilateral('Orbital gyri'),
      ...bilateral('Straight gyrus (Gyrus rectus)'),
      ...bilateral('Orbital part of inferior frontal gyrus'),
    ]),
  },
  {
    id: 'medial-frontal-drive',
    mapping: MAPPING.COARSE,
    label: 'Medial frontal cortex and anterior cingulate',
    labelJa: '内側前頭葉・前部帯状回',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      ...bilateral('Superior frontal gyrus'),
      ...bilateral('Cingulate gyrus and sulcus (Middle anterior part)'),
    ]),
  },
  {
    id: 'dorsal-striatum',
    mapping: MAPPING.ATLAS,
    label: 'Dorsal striatum (caudate nucleus)',
    labelJa: '背側線条体（尾状核）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Caudate nucleus')]),
  },
  {
    id: 'ventral-striatum',
    mapping: MAPPING.ATLAS,
    label: 'Ventral striatum (nucleus accumbens)',
    labelJa: '腹側線条体（側坐核）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Nucleus accumbens')]),
  },
  {
    id: 'pallidal-outflow',
    mapping: MAPPING.ATLAS,
    label: 'Pallidal outflow',
    labelJa: '淡蒼球からの出力',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Globus pallidus internal')]),
  },
  {
    id: 'mediodorsal-thalamus',
    mapping: MAPPING.ATLAS,
    label: 'Mediodorsal thalamic nucleus',
    labelJa: '視床背内側核',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Mediodorsal nucleus')]),
  },
  {
    id: 'medial-temporal-memory',
    mapping: MAPPING.ATLAS,
    label: 'Medial temporal memory formation',
    labelJa: '内側側頭葉（海馬）での記憶形成',
    substrate: NODE_SUBSTRATE.PAIRED,
    structures: Object.freeze(bilateral('Hippocampus')),
  },
  {
    id: 'limbic-memory-relay',
    mapping: MAPPING.ATLAS,
    label: 'Limbic relay (fornix, mamillary body, anterior thalamus)',
    labelJa: '辺縁系の中継（脳弓・乳頭体・視床前核群）',
    substrate: NODE_SUBSTRATE.PAIRED,
    structures: Object.freeze([
      ...bilateral('Fornix'),
      ...bilateral('Mamillary body'),
      ...bilateral('Anterior nuclei of thalamus'),
    ]),
  },
]);

/**
 * Networks this model **names but does not compute**.
 *
 * The cortico-thalamic language network is the case this exists for. An earlier
 * version of this file put the dominant ventral anterior nucleus and the
 * pulvinar on the word-production routes as an obligatory serial gate, so that
 * a thalamic lesion took naming to zero and the reading came out "anomic
 * aphasia". Three things were wrong with it. A single node counted once in a
 * static product is not selection, competition or gating — calling it that
 * claimed a mechanism the arithmetic does not contain. The nuclei were chosen
 * from a description of the syndrome rather than from a lesion study, and the
 * study that maps thalamic aphasia most directly implicates the ventral
 * anterior **and ventrolateral** nuclei, of which the atlas carries only the
 * first, and associates them with verbal-fluency tasks and complex
 * comprehension rather than with confrontation naming. And a large chronic-phase
 * series found that thalamic lesion load did not independently predict naming
 * at all once the neighbouring subcortical and temporoparietal damage was
 * accounted for.
 *
 * So the thalamus is off the routes. What replaces it is not silence: a lesion
 * site may declare `unmodelledInfluenceOn`, and every task named there carries
 * the influence in its result, so that "not on a route" can never be read as
 * "no effect". What this model does not do is put a number on it.
 *
 * @type {readonly {id:string,label:string,labelJa:string,
 *   structures:readonly {label:string,side:string}[],whatIsNotComputed:string,
 *   whatIsNotComputedJa:string}[]}
 */
export const MODULATORY_NETWORKS = Object.freeze([
  {
    id: 'cortico-thalamic-language',
    label: 'Cortico-thalamic language network',
    labelJa: '皮質—視床の言語ネットワーク',
    structures: Object.freeze([
      dominant('Ventral anterior nucleus'),
      dominant('Anterior nuclei of thalamus'),
      dominant('Pulvinar'),
      dominant('Anterior thalamic radiation'),
    ]),
    whatIsNotComputed:
      'How much of which language task a thalamic lesion takes, and for how long. The syndrome is '
      + 'described; the mechanism is not agreed, and the reported picture varies by task, by nucleus '
      + 'and with time since onset. None of that is computed here.',
    whatIsNotComputedJa:
      '視床の病変がどの言語課題をどれだけ、どのくらいの期間奪うか。症候は記載されていますが、機序は'
      + '定まっておらず、報告される像は課題・核・発症からの時間で変わります。そのどれも計算していません。',
  },
]);

/**
 * The connections between nodes.
 *
 * `within` names the mesh a lesion of that connection sits inside, so that a
 * disconnection can be shown on the same atlas as everything else — **and it
 * names the real tract wherever the atlas has one.** The distributed file
 * carries fifty-four tract meshes that no scene in this repository has ever
 * displayed, the arcuate fasciculus among them, so the dorsal language route
 * points at the arcuate itself rather than at a bundle of white matter said to
 * contain it.
 *
 * Where the atlas has no mesh the approximation is stated instead of hidden:
 * short association fibres (premotor to motor cortex, planning to articulation)
 * are anchored in the telencephalic white matter, and every callosal crossing
 * is anchored in the one undivided corpus callosum, because the atlas has no
 * splenium, body or genu as separate meshes. That is why `within` is a field
 * on every connection rather than something a reader is left to assume, and
 * `tests/higher-brain-function-anatomy.test.js` pins down which connections are
 * in which of the two groups.
 *
 * @type {readonly {id:string,from:string,to:string,label:string,labelJa:string,
 *   within:readonly {label:string,side:string}[]}[]}
 */
export const FUNCTION_EDGES = Object.freeze([
  {
    id: 'auditory-to-phonological', from: 'auditory-input', to: 'phonological-analysis',
    label: 'Auditory cortex to phonological analysis', labelJa: '聴覚野 → 音韻の分析',
    mapping: MAPPING.COARSE,
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'phonological-to-semantic', from: 'phonological-analysis', to: 'lexical-semantic',
    label: 'Phonological analysis to meaning', labelJa: '音韻の分析 → 意味',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Middle longitudinal fasciculus')]),
  },
  {
    id: 'dorsal-phonological', from: 'phonological-analysis', to: 'phonological-output',
    label: 'Dorsal route (arcuate fasciculus)', labelJa: '背側経路（弓状束）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Arcuate fasciculus')]),
  },
  {
    id: 'semantic-to-initiation', from: 'lexical-semantic', to: 'speech-initiation',
    label: 'Meaning to speech initiation', labelJa: '意味 → 発話の起動',
    // The ventral association bundle running from the temporal lobe forward.
    // It ends in the frontal convexity rather than on the medial surface where
    // the supplementary motor area is, so this is the nearest named bundle
    // rather than the tract itself.
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Inferior fronto-occipital fasciculus')]),
  },
  {
    id: 'initiation-to-output', from: 'speech-initiation', to: 'phonological-output',
    label: 'Speech initiation to output planning', labelJa: '発話の起動 → 出力計画',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Frontal aslant tract')]),
  },
  {
    // Producing a word is not "meaning, then articulation": the word's sound
    // form has to be retrieved before it can be planned, and that store is the
    // posterior temporal one. Routing naming straight from meaning to the
    // inferior frontal gyrus is what made this model report naming as intact in
    // Wernicke aphasia and in conduction aphasia, which it is not in either.
    id: 'semantic-to-phonological', from: 'lexical-semantic', to: 'phonological-analysis',
    label: 'Meaning to the word’s sound form', labelJa: '意味 → 語の音韻形',
    within: Object.freeze([dominant('Middle longitudinal fasciculus')]),
  },
  {
    id: 'output-to-motor', from: 'phonological-output', to: 'speech-motor',
    label: 'Output planning to articulation', labelJa: '出力計画 → 構音',
    mapping: MAPPING.COARSE,
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'visual-to-orthographic-form', from: 'visual-input-dominant', to: 'orthographic-visual-form',
    label: 'Dominant visual cortex to letter form', labelJa: '優位半球視覚野 → 文字の形態',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Inferior longitudinal fasciculus')]),
  },
  {
    id: 'callosal-visual', from: 'visual-input-nondominant', to: 'orthographic-visual-form',
    label: 'Callosal crossing for vision', labelJa: '視覚情報の脳梁交叉（膨大部）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([median('Corpus callosum')]),
  },
  {
    id: 'object-form-to-semantic', from: 'object-visual-form', to: 'lexical-semantic',
    label: 'Object form to meaning', labelJa: '物体の形態 → 意味',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Inferior longitudinal fasciculus')]),
  },
  {
    id: 'praxis-to-premotor', from: 'praxis-formula', to: 'premotor-dominant',
    label: 'Praxis formulas to dominant premotor cortex', labelJa: '行為の図式 → 優位半球 運動前野',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Superior longitudinal fasciculus III')]),
  },
  {
    id: 'callosal-praxis', from: 'praxis-formula', to: 'premotor-nondominant',
    label: 'Callosal crossing for praxis', labelJa: '行為の図式の脳梁交叉（体部）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([median('Corpus callosum')]),
  },
  {
    id: 'premotor-to-hand-dominant', from: 'premotor-dominant', to: 'hand-motor-dominant',
    label: 'Dominant premotor to right hand', labelJa: '優位半球 運動前野 → 右手',
    mapping: MAPPING.COARSE,
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'premotor-to-hand-nondominant', from: 'premotor-nondominant', to: 'hand-motor-nondominant',
    label: 'Non-dominant premotor to left hand', labelJa: '非優位半球 運動前野 → 左手',
    mapping: MAPPING.COARSE,
    within: Object.freeze([nondominant('White matter of telencephalon')]),
  },
  {
    id: 'dlpfc-to-striatum', from: 'dorsolateral-prefrontal', to: 'dorsal-striatum',
    label: 'Dorsolateral prefrontal cortex to caudate', labelJa: '背外側前頭前野 → 尾状核',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Corticostriatal tract (anterior)')]),
  },
  {
    id: 'orbitofrontal-to-striatum', from: 'orbitofrontal', to: 'ventral-striatum',
    label: 'Orbitofrontal cortex to ventral striatum', labelJa: '眼窩前頭皮質 → 腹側線条体',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Corticostriatal tract (anterior)')]),
  },
  {
    id: 'medial-frontal-to-striatum', from: 'medial-frontal-drive', to: 'ventral-striatum',
    label: 'Medial frontal cortex to ventral striatum', labelJa: '内側前頭葉 → 腹側線条体',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Corticostriatal tract (anterior)')]),
  },
  {
    id: 'dorsal-striatum-to-pallidum', from: 'dorsal-striatum', to: 'pallidal-outflow',
    label: 'Caudate to pallidum', labelJa: '尾状核 → 淡蒼球',
    // The striatopallidal fibres run between two grey structures the atlas has
    // and through white matter it does not divide; this is the mesh that
    // contains them, not the bundle itself.
    mapping: MAPPING.COARSE,
    within: Object.freeze([...bilateral('White matter of telencephalon')]),
  },
  {
    id: 'ventral-striatum-to-pallidum', from: 'ventral-striatum', to: 'pallidal-outflow',
    label: 'Ventral striatum to pallidum', labelJa: '腹側線条体 → 淡蒼球',
    mapping: MAPPING.COARSE,
    within: Object.freeze([...bilateral('White matter of telencephalon')]),
  },
  {
    id: 'pallidum-to-thalamus', from: 'pallidal-outflow', to: 'mediodorsal-thalamus',
    label: 'Pallidum to mediodorsal thalamus', labelJa: '淡蒼球 → 視床背内側核',
    mapping: MAPPING.COARSE,
    within: Object.freeze([...bilateral('White matter of telencephalon')]),
  },
  {
    id: 'thalamus-to-dlpfc', from: 'mediodorsal-thalamus', to: 'dorsolateral-prefrontal',
    label: 'Thalamus back to dorsolateral prefrontal cortex', labelJa: '視床 → 背外側前頭前野（環の閉じ）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Anterior thalamic radiation')]),
  },
  {
    id: 'thalamus-to-orbitofrontal', from: 'mediodorsal-thalamus', to: 'orbitofrontal',
    label: 'Thalamus back to orbitofrontal cortex', labelJa: '視床 → 眼窩前頭皮質（環の閉じ）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Anterior thalamic radiation')]),
  },
  {
    id: 'thalamus-to-medial-frontal', from: 'mediodorsal-thalamus', to: 'medial-frontal-drive',
    label: 'Thalamus back to medial frontal cortex', labelJa: '視床 → 内側前頭葉（環の閉じ）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Anterior thalamic radiation')]),
  },
  {
    id: 'visual-to-object-form', from: 'visual-input-dominant', to: 'object-visual-form',
    label: 'Dominant visual cortex to object form', labelJa: '優位半球 視覚野 → 物体の形態',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Inferior longitudinal fasciculus')]),
  },
  {
    id: 'callosal-object-form', from: 'visual-input-nondominant', to: 'object-visual-form',
    label: 'Across the commissure, for object form', labelJa: '交連を越えて（物体の形態へ）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([median('Corpus callosum')]),
  },
  {
    id: 'orthographic-form-to-semantic', from: 'orthographic-visual-form', to: 'lexical-semantic',
    label: 'Letter form to meaning', labelJa: '文字の形態 → 意味',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Inferior longitudinal fasciculus')]),
  },
  {
    id: 'semantic-to-orthographic-lexicon', from: 'lexical-semantic', to: 'orthographic-output-lexicon',
    label: 'Meaning to whole-word spelling', labelJa: '意味 → 語まるごとの綴り',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Posterior thalamic radiation')]),
    note: 'The atlas has no temporal-to-angular association bundle of its own; this is the nearest named '
      + 'mesh the route passes through rather than the tract itself.',
    noteJa: 'アトラスは側頭—角回の連合線維を単独では持ちません。経路が通る最も近い名前つきメッシュで、'
      + '線維そのものではありません。',
  },
  {
    id: 'phonological-to-conversion', from: 'phonological-analysis', to: 'phoneme-grapheme-conversion',
    label: 'Phonological analysis to phoneme-grapheme conversion', labelJa: '音韻の分析 → 音韻—文字変換',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([dominant('Arcuate fasciculus')]),
    note: 'Anchored in the same bundle as the dorsal speech route, which is why a lesion there affects '
      + 'both the repetition route and nonword dictation — and not the lexical writing route.',
    noteJa: '背側の発話経路と同じ束に載せています。だからそこの病変は復唱経路と非語の書き取りの両方に'
      + '効き、**語彙的な書字経路には効きません**。',
  },
  {
    id: 'lexicon-to-buffer', from: 'orthographic-output-lexicon', to: 'graphemic-buffer',
    label: 'Whole-word spelling into the graphemic buffer', labelJa: '語の綴り → 書記素の保持',
    within: Object.freeze([]),
    mapping: MAPPING.CONCEPTUAL,
    assumedAvailable: true,
  },
  {
    id: 'conversion-to-buffer', from: 'phoneme-grapheme-conversion', to: 'graphemic-buffer',
    label: 'Converted letters into the graphemic buffer', labelJa: '変換された文字 → 書記素の保持',
    within: Object.freeze([]),
    mapping: MAPPING.CONCEPTUAL,
    assumedAvailable: true,
  },
  {
    id: 'buffer-to-graphomotor', from: 'graphemic-buffer', to: 'graphomotor-output',
    label: 'Letters to the moving hand', labelJa: '文字列 → 手の運動',
    within: Object.freeze([]),
    mapping: MAPPING.CONCEPTUAL,
    assumedAvailable: true,
  },
  {
    id: 'fornix-outflow', from: 'medial-temporal-memory', to: 'limbic-memory-relay',
    label: 'Hippocampal outflow', labelJa: '海馬からの出力（脳弓）',
    mapping: MAPPING.ATLAS,
    within: Object.freeze([...bilateral('Fornix')]),
  },
]);

/**
 * The tasks, each declared as the routes it is **eligible** to use.
 *
 * Two changes from the first version of this file are load-bearing.
 *
 * **A task says what it was probed with.** "Writing" is not one task: writing a
 * known word from its meaning, writing one down from dictation, and writing
 * down a nonword are three, and they dissociate in described cases. A nonword
 * has no entry in a lexicon, so the lexical route is not a route it may take —
 * `stimuli` on each route is what makes `max()` a maximum over *eligible*
 * routes rather than over everything declared. Without that, adding the lexical
 * writing route would have quietly rescued nonword dictation through it.
 *
 * **A task says what it does not cover.** `excludes` is not decoration: a task
 * whose name a reader will over-read — "fluency", "reading" — carries the list
 * of things its value is not evidence about, and those lists reach the screen.
 *
 * Nothing here searches the network for another way round. Where an alternative
 * route is real it is written down.
 *
 * @type {readonly {id:string,label:string,labelJa:string,modelled:boolean,
 *   input:string,output:string,stimulus?:string,
 *   routes:readonly {id:string,nodes:readonly string[],stimuli?:readonly string[],
 *     label?:string,labelJa?:string}[],
 *   excludes:readonly string[],excludesJa:readonly string[]}[]}
 */
export const FUNCTION_TASKS = Object.freeze([
  {
    id: 'auditory-comprehension',
    label: 'Understanding a heard word',
    labelJa: '聞いた語の理解',
    modelled: true,
    input: 'spoken known word',
    output: 'meaning reached',
    stimulus: STIMULUS.KNOWN_WORD,
    routes: Object.freeze([
      Object.freeze({
        id: 'auditory-ventral',
        nodes: Object.freeze(['auditory-input', 'phonological-analysis', 'lexical-semantic']),
      }),
    ]),
    excludes: Object.freeze([
      'sentence and discourse comprehension',
      'recognition of non-speech sounds',
      'hearing itself — no audiometry is modelled, so cortical deafness is not excluded',
    ]),
    excludesJa: Object.freeze([
      '文・談話の理解',
      '環境音の認知',
      '聴力そのもの（聴力検査を持たないので、皮質聾を除外できません）',
    ]),
  },
  {
    id: 'repetition-word',
    label: 'Repeating a heard known word',
    labelJa: '聞いた既知語の復唱',
    modelled: true,
    input: 'spoken known word',
    output: 'spoken',
    stimulus: STIMULUS.KNOWN_WORD,
    routes: Object.freeze([
      Object.freeze({
        id: 'dorsal-phonological-repetition',
        label: 'Straight through, without meaning',
        labelJa: '意味を経由しない直接経路',
        nodes: Object.freeze(['auditory-input', 'phonological-analysis', 'phonological-output', 'speech-motor']),
      }),
      Object.freeze({
        id: 'lexical-semantic-repetition',
        label: 'Round through the lexicon, not the dorsal bundle',
        labelJa: '語彙を経由する経路（背側の束を通らない）',
        stimuli: Object.freeze([STIMULUS.KNOWN_WORD]),
        nodes: Object.freeze([
          'auditory-input', 'phonological-analysis', 'lexical-semantic',
          'speech-initiation', 'phonological-output', 'speech-motor',
        ]),
      }),
    ]),
    excludes: Object.freeze([
      'repeating sentences, and the span a person can hold',
      'the quality of the articulation that comes out',
    ]),
    excludesJa: Object.freeze([
      '文の復唱、保持できる長さ',
      '出てくる構音の質',
    ]),
  },
  {
    id: 'repetition-nonword',
    label: 'Repeating a heard nonword',
    labelJa: '聞いた非語の復唱',
    modelled: true,
    input: 'spoken nonword',
    output: 'spoken',
    stimulus: STIMULUS.NONWORD,
    routes: Object.freeze([
      Object.freeze({
        id: 'dorsal-phonological-repetition',
        nodes: Object.freeze(['auditory-input', 'phonological-analysis', 'phonological-output', 'speech-motor']),
      }),
      Object.freeze({
        id: 'lexical-semantic-repetition',
        stimuli: Object.freeze([STIMULUS.KNOWN_WORD]),
        nodes: Object.freeze([
          'auditory-input', 'phonological-analysis', 'lexical-semantic',
          'speech-initiation', 'phonological-output', 'speech-motor',
        ]),
      }),
    ]),
    excludes: Object.freeze([
      'how a real patient scores on a nonword repetition test',
      'whether the nonword is well formed in the reader\u2019s own language',
    ]),
    excludesJa: Object.freeze([
      '実際の患者の非語復唱課題の成績',
      'その非語が読者の言語で成立する形かどうか',
    ]),
  },
  {
    id: 'speech-initiation-route',
    label: 'The route a self-started utterance needs',
    labelJa: '自発的に話し始めるための経路',
    modelled: true,
    input: 'a condition requiring self-initiation',
    output: 'spoken',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'initiation-output',
        nodes: Object.freeze(['speech-initiation', 'phonological-output', 'speech-motor']),
      }),
    ]),
    excludes: Object.freeze([
      'clinical fluency: words per minute, phrase length, agrammatism, prosody',
      'motivation, and any judgement about why somebody is not speaking',
    ]),
    excludesJa: Object.freeze([
      '臨床的な流暢性（発話速度・句の長さ・失文法・韻律）',
      '意欲、および「なぜ話さないのか」についての判断',
    ]),
  },
  {
    id: 'propositional-output-route',
    label: 'The route from a meaning to a spoken word',
    labelJa: '意味から発話への出力経路',
    modelled: true,
    input: 'a meaning, given',
    output: 'spoken',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'semantic-to-speech',
        nodes: Object.freeze([
          'lexical-semantic', 'speech-initiation', 'phonological-output', 'speech-motor',
        ]),
      }),
    ]),
    excludes: Object.freeze([
      'whether what is said is apt, grammatical or on the point',
      'the content of connected speech',
    ]),
    excludesJa: Object.freeze([
      '話した内容が適切か、文法的か、要点を外していないか',
      '談話としての内容',
    ]),
  },
  {
    id: 'naming-object',
    label: 'Naming a seen object',
    labelJa: '見た物品の呼称',
    modelled: true,
    input: 'a common object, seen',
    output: 'spoken',
    stimulus: STIMULUS.OBJECT,
    routes: Object.freeze([
      Object.freeze({
        id: 'object-naming-dominant-field',
        nodes: Object.freeze([
          'visual-input-dominant', 'object-visual-form', 'lexical-semantic',
          'phonological-analysis', 'phonological-output', 'speech-motor',
        ]),
      }),
      Object.freeze({
        id: 'object-naming-crossed',
        nodes: Object.freeze([
          'visual-input-nondominant', 'object-visual-form', 'lexical-semantic',
          'phonological-analysis', 'phonological-output', 'speech-motor',
        ]),
      }),
    ]),
    coverageLimitations: Object.freeze([
      'Object form and letter form share one atlas mesh; see the reading task.',
    ]),
    coverageLimitationsJa: Object.freeze([
      '物体の形態と文字の形態は 1 つのメッシュを共有しています（読解の課題を参照）。',
    ]),
    excludes: Object.freeze([
      'naming to definition, to sound, or to touch',
      'visual agnosia as a diagnosis',
    ]),
    excludesJa: Object.freeze([
      '説明・音・触覚からの呼称',
      '視覚失認という診断',
    ]),
  },
  {
    id: 'reading-comprehension-word',
    label: 'Understanding a written known word',
    labelJa: '書かれた既知語の読解',
    modelled: true,
    input: 'a written known word',
    output: 'meaning reached',
    stimulus: STIMULUS.TEXT,
    routes: Object.freeze([
      Object.freeze({
        id: 'reading-dominant-field-ventral',
        nodes: Object.freeze(['visual-input-dominant', 'orthographic-visual-form', 'lexical-semantic']),
      }),
      Object.freeze({
        id: 'reading-crossed-ventral',
        nodes: Object.freeze(['visual-input-nondominant', 'orthographic-visual-form', 'lexical-semantic']),
      }),
    ]),
    coverageLimitations: Object.freeze([
      'Letter form and object form share one atlas mesh, so a lesion drawn on the occipitotemporal gyrus '
      + 'takes reading and object naming together. The two come apart only when they are switched off '
      + 'directly, in conceptual mode.',
    ]),
    coverageLimitationsJa: Object.freeze([
      '文字の形態と物体の形態は 1 つのメッシュを共有しているので、外側後頭側頭回に置いた病変は'
      + '読解と物品呼称を同時に奪います。2 つが分かれるのは概念モードで直接遮断したときだけです。',
    ]),
    excludes: Object.freeze([
      'reading aloud — not modelled here at all',
      'sentence and text comprehension, reading speed, letter-by-letter reading',
      'which script this is: no kanji/kana or regular/irregular distinction is modelled',
    ]),
    excludesJa: Object.freeze([
      '音読（このモデルには入っていません）',
      '文・文章の読解、読字速度、逐字読み',
      '文字体系の違い（漢字／仮名、規則／不規則の区別は持っていません）',
    ]),
  },
  {
    id: 'writing-from-meaning',
    label: 'Writing a known word from its meaning',
    labelJa: '意味からの既知語の書字',
    modelled: true,
    input: 'a meaning, given',
    output: 'a written letter string',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'lexical-writing',
        label: 'Whole-word spelling',
        labelJa: '語まるごとの綴り（語彙経路）',
        stimuli: Object.freeze([STIMULUS.KNOWN_WORD, STIMULUS.MEANING]),
        nodes: Object.freeze(['lexical-semantic', 'orthographic-output-lexicon', 'graphemic-buffer']),
      }),
    ]),
    coverageLimitations: Object.freeze([
      'The agraphia that accompanies the perisylvian aphasias is not explained by these two routes. A '
      + 'high value here says the declared route reaches, not that a person with this lesion writes '
      + 'normally — and real lesions are larger than the structures named here.',
    ]),
    coverageLimitationsJa: Object.freeze([
      'シルビウス裂周囲の失語に伴う失書は、この 2 経路では説明できません。値が高いことは'
      + '**宣言した経路が届く**という意味で、「この病変の人が正常に書ける」という予測ではありません'
      + '——実際の病変はここに挙げた構造より大きいのが普通です。',
    ]),
    excludes: Object.freeze([
      'moving the pen — that is a separate stage here, on purpose',
      'holding and ordering the letters (the graphemic buffer): declared, and not computed',
      'free composition, and writing to a picture',
      'handwriting, letter shapes, and spelling error types',
    ]),
    excludesJa: Object.freeze([
      'ペンを動かすこと（意図的に別段階にしています）',
      '書記素の保持と配列（宣言はしていますが、計算していません）',
      '自由作文、絵からの書称',
      '筆跡・字形・誤りの種類',
    ]),
  },
  {
    id: 'writing-to-dictation-word',
    label: 'Writing down a heard known word',
    labelJa: '聞いた既知語の書き取り',
    modelled: true,
    input: 'a spoken known word',
    output: 'a written letter string',
    stimulus: STIMULUS.KNOWN_WORD,
    routes: Object.freeze([
      Object.freeze({
        id: 'dictation-lexical',
        label: 'Through meaning, then whole-word spelling',
        labelJa: '意味を経由して語彙的に綴る',
        stimuli: Object.freeze([STIMULUS.KNOWN_WORD]),
        nodes: Object.freeze([
          'auditory-input', 'phonological-analysis', 'lexical-semantic',
          'orthographic-output-lexicon', 'graphemic-buffer',
        ]),
      }),
      Object.freeze({
        id: 'dictation-phonological',
        label: 'Sound to letters, without meaning',
        labelJa: '意味を経由せず音から文字へ',
        nodes: Object.freeze([
          'auditory-input', 'phonological-analysis', 'phoneme-grapheme-conversion', 'graphemic-buffer',
        ]),
      }),
    ]),
    coverageLimitations: Object.freeze([
      'The agraphia that accompanies the perisylvian aphasias is not explained by these routes, and real '
      + 'lesions are larger than the structures named here.',
    ]),
    coverageLimitationsJa: Object.freeze([
      'シルビウス裂周囲の失語に伴う失書は、この経路では説明できません。'
      + '実際の病変はここに挙げた構造より大きいのが普通です。',
    ]),
    excludes: Object.freeze([
      'moving the pen',
      'which of the two routes a given person would in fact use',
    ]),
    excludesJa: Object.freeze([
      'ペンを動かすこと',
      '実際の人がどちらの経路を使うか',
    ]),
  },
  {
    id: 'writing-to-dictation-nonword',
    label: 'Writing down a heard nonword',
    labelJa: '聞いた非語の書き取り',
    modelled: true,
    input: 'a spoken nonword',
    output: 'a written letter string',
    stimulus: STIMULUS.NONWORD,
    routes: Object.freeze([
      Object.freeze({
        id: 'dictation-lexical',
        stimuli: Object.freeze([STIMULUS.KNOWN_WORD]),
        nodes: Object.freeze([
          'auditory-input', 'phonological-analysis', 'lexical-semantic',
          'orthographic-output-lexicon', 'graphemic-buffer',
        ]),
      }),
      Object.freeze({
        id: 'dictation-phonological',
        nodes: Object.freeze([
          'auditory-input', 'phonological-analysis', 'phoneme-grapheme-conversion', 'graphemic-buffer',
        ]),
      }),
    ]),
    coverageLimitations: Object.freeze([
      'The agraphia that accompanies the perisylvian aphasias is not explained by these routes, and real '
      + 'lesions are larger than the structures named here.',
    ]),
    coverageLimitationsJa: Object.freeze([
      'シルビウス裂周囲の失語に伴う失書は、この経路では説明できません。'
      + '実際の病変はここに挙げた構造より大きいのが普通です。',
    ]),
    excludes: Object.freeze([
      'moving the pen',
      'how a real patient scores on a nonword spelling test',
    ]),
    excludesJa: Object.freeze([
      'ペンを動かすこと',
      '実際の患者の非語書き取りの成績',
    ]),
  },
  {
    id: 'graphomotor-route',
    label: 'The route that moves the pen',
    labelJa: '筆記の運動出力の経路',
    modelled: true,
    input: 'a letter string, already composed',
    output: 'pen movement',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'buffer-to-hand',
        nodes: Object.freeze(['graphemic-buffer', 'graphomotor-output']),
      }),
    ]),
    excludes: Object.freeze([
      'agraphia — a hand that will not move is not a language disorder',
      'hemiparesis, and any somatotopy: the atlas precentral gyrus has none',
    ]),
    excludesJa: Object.freeze([
      '失書（動かない手は言語の障害ではありません）',
      '片麻痺、および体部位局在（アトラスの中心前回は持っていません）',
    ]),
  },
  {
    id: 'calculation-and-body-schema',
    label: 'Written calculation, finger and left-right knowledge',
    labelJa: '計算・手指認知・左右の識別',
    modelled: false,
    input: 'not implemented',
    output: 'not implemented',
    routes: Object.freeze([]),
    excludes: Object.freeze([
      'all four of it: acalculia, finger agnosia, left-right disorientation and agraphia are not '
      + 'separately implemented, so this model cannot produce the Gerstmann tetrad and must not be '
      + 'read as producing it',
    ]),
    excludesJa: Object.freeze([
      '4 徴すべて。失算・手指失認・左右識別障害・失書を個別に実装していないので、本モデルは '
      + 'Gerstmann 四徴を出せません。出していると読まないでください',
    ]),
  },
  {
    id: 'reading-aloud',
    label: 'Reading aloud',
    labelJa: '音読',
    modelled: false,
    input: 'not implemented',
    output: 'not implemented',
    routes: Object.freeze([]),
    excludes: Object.freeze([
      'everything: reading aloud needs the orthography-to-phonology route, which is not declared here. '
      + 'A low reading-comprehension value says nothing about it.',
    ]),
    excludesJa: Object.freeze([
      'すべて。音読には正書法—音韻の変換経路が必要で、ここには宣言していません。'
      + '読解の値が低いことは音読について何も言いません。',
    ]),
  },
  {
    id: 'connected-speech-fluency',
    label: 'Clinical fluency of connected speech',
    labelJa: '連続発話の臨床的流暢性',
    modelled: false,
    input: 'not implemented',
    output: 'not implemented',
    routes: Object.freeze([]),
    excludes: Object.freeze([
      'everything: words per minute, phrase length, agrammatism, paraphasia, prosody and effort are '
      + 'not computed. The initiation route is not a substitute for any of them.',
    ]),
    excludesJa: Object.freeze([
      'すべて。発話速度・句の長さ・失文法・錯語・韻律・努力性は計算していません。'
      + '起動の経路はそのどれの代わりにもなりません。',
    ]),
  },
  {
    id: 'praxis-right-hand',
    label: 'Using a tool with the right hand',
    labelJa: '右手での道具使用（模倣・パントマイム）',
    modelled: true,
    input: 'a gesture to imitate or pantomime',
    output: 'right-hand movement',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'praxis-dominant',
        nodes: Object.freeze(['praxis-formula', 'premotor-dominant', 'hand-motor-dominant']),
      }),
    ]),
    excludes: Object.freeze(['weakness, ataxia and the quality of the movement']),
    excludesJa: Object.freeze(['筋力低下・失調・動作の質']),
  },
  {
    id: 'praxis-left-hand',
    label: 'Using a tool with the left hand',
    labelJa: '左手での道具使用（模倣・パントマイム）',
    modelled: true,
    input: 'a gesture to imitate or pantomime',
    output: 'left-hand movement',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'praxis-crossed',
        nodes: Object.freeze(['praxis-formula', 'premotor-nondominant', 'hand-motor-nondominant']),
      }),
    ]),
    excludes: Object.freeze(['weakness, ataxia and the quality of the movement']),
    excludesJa: Object.freeze(['筋力低下・失調・動作の質']),
  },
  {
    id: 'attention-left-space',
    label: 'Attending to the left of space',
    labelJa: '左空間への注意',
    modelled: true,
    input: 'a target in the left hemifield',
    output: 'attention reaches it',
    stimulus: STIMULUS.OBJECT,
    routes: Object.freeze([
      Object.freeze({ id: 'attention-left', nodes: Object.freeze(['spatial-attention-nondominant']) }),
    ]),
    excludes: Object.freeze(['hemianopia, and the severity or kind of neglect']),
    excludesJa: Object.freeze(['半盲、無視の重症度や型']),
  },
  {
    id: 'attention-right-space',
    label: 'Attending to the right of space',
    labelJa: '右空間への注意',
    modelled: true,
    input: 'a target in the right hemifield',
    output: 'attention reaches it',
    stimulus: STIMULUS.OBJECT,
    routes: Object.freeze([
      Object.freeze({ id: 'attention-right-nondominant', nodes: Object.freeze(['spatial-attention-nondominant']) }),
      Object.freeze({ id: 'attention-right-dominant', nodes: Object.freeze(['spatial-attention-dominant']) }),
    ]),
    excludes: Object.freeze(['hemianopia, and the severity or kind of neglect']),
    excludesJa: Object.freeze(['半盲、無視の重症度や型']),
  },
  {
    id: 'set-shifting-and-planning',
    label: 'Changing tack, and planning',
    labelJa: '遂行機能（セットの転換・計画）',
    modelled: true,
    input: 'a rule that has to change',
    output: 'behaviour changes with it',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'dorsolateral-circuit',
        nodes: Object.freeze([
          'dorsolateral-prefrontal', 'dorsal-striatum', 'pallidal-outflow',
          'mediodorsal-thalamus', 'dorsolateral-prefrontal',
        ]),
      }),
    ]),
    excludes: Object.freeze(['any score on any executive test, and insight']),
    excludesJa: Object.freeze(['遂行機能検査の点数、病識']),
  },
  {
    id: 'behavioural-inhibition',
    label: 'Holding a response back',
    labelJa: '行動の抑制（社会的なふるまい）',
    modelled: true,
    input: 'a response that has to be withheld',
    output: 'it is withheld',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'orbitofrontal-circuit',
        nodes: Object.freeze([
          'orbitofrontal', 'ventral-striatum', 'pallidal-outflow', 'mediodorsal-thalamus', 'orbitofrontal',
        ]),
      }),
    ]),
    excludes: Object.freeze(['personality, mood, social cognition and any psychiatric diagnosis']),
    excludesJa: Object.freeze(['人格・気分・社会的認知、精神科的診断']),
  },
  {
    id: 'initiation-and-drive',
    label: 'Starting something unprompted',
    labelJa: '発動性（自分から始めること）',
    modelled: true,
    input: 'nothing prompting it',
    output: 'action begins',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'medial-frontal-circuit',
        nodes: Object.freeze([
          'medial-frontal-drive', 'ventral-striatum', 'pallidal-outflow',
          'mediodorsal-thalamus', 'medial-frontal-drive',
        ]),
      }),
    ]),
    excludes: Object.freeze(['mood, apathy as a diagnosis, and motivation']),
    excludesJa: Object.freeze(['気分、診断としてのアパシー、意欲']),
  },
  {
    id: 'episodic-memory-formation',
    label: 'Laying down a new memory',
    labelJa: 'エピソード記憶の形成',
    modelled: true,
    input: 'something to remember',
    output: 'it can be recalled later',
    stimulus: STIMULUS.MEANING,
    routes: Object.freeze([
      Object.freeze({
        id: 'medial-temporal-limbic',
        nodes: Object.freeze(['medial-temporal-memory', 'limbic-memory-relay']),
      }),
    ]),
    excludes: Object.freeze(['retrograde memory, semantic memory and working memory']),
    excludesJa: Object.freeze(['逆向性記憶・意味記憶・作業記憶']),
  },
]);

export const LESION_SITES = Object.freeze([
  {
    id: 'dominant-inferior-frontal',
    label: 'Dominant inferior frontal gyrus', labelJa: '優位半球 下前頭回（弁蓋部・三角部）',
    usualCause: 'Superior division of the middle cerebral artery',
    usualCauseJa: '中大脳動脈 上枝',
    structures: Object.freeze([
      dominant('Opercular part of inferior frontal gyrus'),
      dominant('Triangular part of inferior frontal gyrus'),
    ]),
  },
  {
    id: 'dominant-posterior-superior-temporal',
    label: 'Dominant posterior superior temporal gyrus', labelJa: '優位半球 上側頭回後部・側頭平面',
    usualCause: 'Inferior division of the middle cerebral artery',
    usualCauseJa: '中大脳動脈 下枝',
    structures: Object.freeze([
      dominant('Superior temporal gyrus (Lateral part)'),
      dominant('Temporal plane'),
    ]),
  },
  {
    id: 'dominant-arcuate',
    label: 'Dominant subcortical white matter under the supramarginal gyrus',
    labelJa: '優位半球 縁上回下の白質（弓状束）',
    usualCause: 'Small cortical–subcortical middle cerebral artery branch infarct',
    usualCauseJa: '中大脳動脈の皮質枝〜皮質下の小梗塞',
    structures: Object.freeze([
      dominant('Arcuate fasciculus'),
      { ...dominant('White matter of telencephalon'), share: 0.12 },
      { ...dominant('Supramarginal gyrus'), share: 0.35 },
    ]),
  },
  {
    id: 'dominant-perisylvian',
    label: 'Whole dominant perisylvian territory', labelJa: '優位半球 シルビウス裂周囲の全域',
    granularityLimit:
      'Includes a share of the precentral gyrus, which the atlas carries with no somatotopy: this '
      + 'preset cannot take the articulators without also taking the hand.',
    granularityLimitJa:
      '中心前回の一部を含みます。アトラスの中心前回に体部位局在はないので、'
      + 'このプリセットは構音器官だけを取ることができません（手も一緒に取ります）。',
    usualCause: 'Middle cerebral artery stem occlusion',
    usualCauseJa: '中大脳動脈 本幹の閉塞',
    structures: Object.freeze([
      dominant('Opercular part of inferior frontal gyrus'),
      dominant('Triangular part of inferior frontal gyrus'),
      dominant('Superior temporal gyrus (Lateral part)'),
      dominant('Temporal plane'),
      dominant('Supramarginal gyrus'),
      dominant('Insula (Subcentral gyrus and ant. and post. sulci)'),
      { ...dominant('Precentral gyrus'), share: 0.6 },
      { ...dominant('Arcuate fasciculus'), share: 0.8 },
      { ...dominant('White matter of telencephalon'), share: 0.3 },
    ]),
  },
  {
    id: 'dominant-anterior-watershed',
    label: 'Dominant anterior watershed', labelJa: '優位半球 前方分水嶺（上前頭回・前部帯状回）',
    usualCause: 'Border zone between the anterior and middle cerebral arteries, in systemic hypoperfusion',
    usualCauseJa: '前大脳動脈と中大脳動脈の境界領域（全身性の低灌流）',
    granularityLimit:
      'A set of structures chosen for teaching, not a perfusion territory. This model has no blood '
      + 'flow, no vascular anatomy and no individual variation in where a border zone falls, so '
      + 'selecting this is not reproducing a border-zone infarct in anybody.',
    granularityLimitJa:
      '教材として選んだ構造の集合であって、灌流領域ではありません。本モデルは血流も血管解剖も'
      + '分水嶺の位置の個人差も持たないので、これを選ぶことは誰かの分水嶺梗塞を再現することではありません。',
    structures: Object.freeze([
      dominant('Superior frontal gyrus'),
      dominant('Cingulate gyrus and sulcus (Middle anterior part)'),
    ]),
  },
  {
    id: 'dominant-posterior-watershed',
    label: 'Dominant posterior watershed', labelJa: '優位半球 後方分水嶺（中側頭回後部・角回）',
    usualCause: 'Border zone between the middle and posterior cerebral arteries, in systemic hypoperfusion',
    usualCauseJa: '中大脳動脈と後大脳動脈の境界領域（全身性の低灌流）',
    granularityLimit:
      'A set of structures chosen for teaching, not a perfusion territory. This model has no blood '
      + 'flow, no vascular anatomy and no individual variation in where a border zone falls, so '
      + 'selecting this is not reproducing a border-zone infarct in anybody.',
    granularityLimitJa:
      '教材として選んだ構造の集合であって、灌流領域ではありません。本モデルは血流も血管解剖も'
      + '分水嶺の位置の個人差も持たないので、これを選ぶことは誰かの分水嶺梗塞を再現することではありません。',
    structures: Object.freeze([
      dominant('Middle temporal gyrus'),
      dominant('Angular gyrus'),
      { ...dominant('Temporal pole'), share: 0.3 },
    ]),
  },
  {
    id: 'dominant-watershed-both',
    label: 'Both dominant watersheds at once', labelJa: '優位半球 前後の分水嶺（同時）',
    usualCause: 'Global hypoperfusion — cardiac arrest, or a critical carotid stenosis',
    usualCauseJa: '全脳性の低灌流（心停止、頸動脈の高度狭窄）',
    granularityLimit:
      'A set of structures chosen for teaching, not a perfusion territory. This model has no blood '
      + 'flow, no vascular anatomy and no individual variation in where a border zone falls, so '
      + 'selecting this is not reproducing a border-zone infarct in anybody.',
    granularityLimitJa:
      '教材として選んだ構造の集合であって、灌流領域ではありません。本モデルは血流も血管解剖も'
      + '分水嶺の位置の個人差も持たないので、これを選ぶことは誰かの分水嶺梗塞を再現することではありません。',
    structures: Object.freeze([
      dominant('Superior frontal gyrus'),
      dominant('Cingulate gyrus and sulcus (Middle anterior part)'),
      dominant('Middle temporal gyrus'),
      dominant('Angular gyrus'),
      { ...dominant('Temporal pole'), share: 0.3 },
    ]),
  },
  {
    id: 'bilateral-auditory-cortex',
    label: 'Both auditory cortices', labelJa: '両側 横側頭回（Heschl 回）',
    usualCause: 'Two temporal infarcts, usually years apart',
    usualCauseJa: '両側側頭葉の梗塞（多くは時期を隔てて 2 回）',
    structures: Object.freeze([...bilateral('Transverse temporal gyri')]),
  },
  {
    id: 'dominant-insula',
    label: 'Dominant insula, whole', labelJa: '優位半球 島皮質（全体）',
    granularityLimit:
      'The whole insular mesh. The atlas does not divide the anterior insula out, so this is not the '
      + 'restricted anterior region that was proposed for apraxia of speech — and this model has no '
      + 'speech quality to test that proposal against in any case.',
    granularityLimitJa:
      '島のメッシュ全体です。アトラスは前部島を分けて持っていないので、これは発語失行に関して'
      + '提唱された限定領域ではありません。そもそも本モデルはその提唱を検証できる発話の質を持ちません。',
    usualCause: 'Insular branch of the middle cerebral artery (M2)',
    usualCauseJa: '中大脳動脈 島枝（M2）の梗塞',
    structures: Object.freeze([dominant('Insula (Subcentral gyrus and ant. and post. sulci)')]),
  },
  {
    id: 'dominant-thalamus',
    label: 'Dominant anterior thalamus', labelJa: '優位半球 視床（前腹側核）',
    usualCause: 'Thalamoperforating artery infarct, or a thalamic haemorrhage',
    usualCauseJa: '視床穿通枝の梗塞、視床出血',
    structures: Object.freeze([dominant('Ventral anterior nucleus')]),
    // The nucleus most directly implicated alongside the ventrolateral nucleus,
    // which this atlas does not carry as a mesh. The pulvinar was in this list
    // and is gone: it was chosen to make a route work, not from a lesion study.
    unmodelledInfluences: Object.freeze([
      Object.freeze({
        what: 'cortico-thalamic language network modulation',
        whatJa: '皮質—視床の言語ネットワークによる調節',
        network: 'cortico-thalamic-language',
        onTasks: Object.freeze([
          'auditory-comprehension', 'naming-object', 'propositional-output-route',
          'speech-initiation-route', 'repetition-word', 'writing-from-meaning',
        ]),
      }),
    ]),
  },
  {
    id: 'dominant-angular',
    label: 'Dominant angular gyrus', labelJa: '優位半球 角回',
    usualCause: 'Angular branch of the middle cerebral artery',
    usualCauseJa: '中大脳動脈 角回枝',
    structures: Object.freeze([dominant('Angular gyrus')]),
  },
  {
    id: 'dominant-occipital-and-whole-callosum',
    label: 'Dominant occipital lobe with the whole corpus callosum',
    labelJa: '優位半球 後頭葉＋脳梁（全体。膨大部だけは選べません）',
    granularityLimit:
      'The classical lesion is of the splenium. This atlas carries one undivided corpus callosum, so '
      + 'this preset takes the whole commissure — a much larger lesion than the one being taught, and '
      + 'not a posterior callosal lesion.',
    granularityLimitJa:
      '古典的な病変は脳梁**膨大部**のものです。このアトラスは分割されていない脳梁を 1 つしか持たないため、'
      + 'このプリセットは交連**全体**を取ります——教えている病変よりはるかに大きく、脳梁後方の病変ではありません。',
    usualCause: 'Posterior cerebral artery',
    usualCauseJa: '後大脳動脈',
    structures: Object.freeze([
      dominant('Calcarine sulcus'), dominant('Cuneus'), dominant('Lingual gyrus'),
      // The whole commissure, not a share of it. The share used to be 0.4, an
      // invented number standing in for the splenium — which made the preset
      // look like a posterior callosal lesion while actually being a fraction
      // of an undivided mesh. If the atlas cannot show the splenium, the honest
      // preset is the one that says it takes all of the callosum.
      median('Corpus callosum'),
    ]),
  },
  {
    id: 'nondominant-parietal',
    label: 'Non-dominant parietal lobe', labelJa: '非優位半球 頭頂葉',
    usualCause: 'Parietal branches of the middle cerebral artery',
    usualCauseJa: '中大脳動脈 頭頂枝',
    structures: Object.freeze([
      nondominant('Supramarginal gyrus'),
      nondominant('Intraparietal sulcus'),
      nondominant('Superior parietal lobule'),
    ]),
  },
  {
    id: 'corpus-callosum',
    label: 'Corpus callosum', labelJa: '脳梁',
    usualCause: 'Anterior cerebral artery territory infarct, or surgical section',
    usualCauseJa: '前大脳動脈領域の梗塞、あるいは外科的離断',
    structures: Object.freeze([median('Corpus callosum')]),
  },
  {
    id: 'bifrontal-dorsolateral',
    label: 'Both dorsolateral prefrontal convexities', labelJa: '両側 背外側前頭前野（凸面）',
    usualCause: 'Traumatic brain injury, or a frontal tumour',
    usualCauseJa: '外傷性脳損傷、前頭葉腫瘍',
    structures: Object.freeze([...bilateral('Middle frontal gyrus')]),
  },
  {
    id: 'orbitofrontal-cortex',
    label: 'Both orbitofrontal cortices', labelJa: '両側 眼窩前頭皮質',
    usualCause: 'Frontobasal trauma, an olfactory groove meningioma, or frontotemporal degeneration',
    usualCauseJa: '前頭蓋底の外傷、嗅溝髄膜腫、前頭側頭型変性症',
    structures: Object.freeze([
      ...bilateral('Orbital gyri'),
      ...bilateral('Straight gyrus (Gyrus rectus)'),
      ...bilateral('Orbital part of inferior frontal gyrus'),
    ]),
  },
  {
    id: 'striatum-head',
    label: 'Head of the striatum on one side', labelJa: '片側 線条体（尾状核頭部〜腹側線条体）',
    usualCause: 'Lenticulostriate branch infarct',
    usualCauseJa: 'レンズ核線条体動脈の梗塞',
    structures: Object.freeze([
      dominant('Caudate nucleus'),
      { ...dominant('Nucleus accumbens'), share: 0.6 },
    ]),
  },
  {
    id: 'dominant-anterior-thalamic-radiation',
    label: 'Dominant anterior thalamic radiation',
    labelJa: '優位側 視床前脚・前放線（内包膝部など）',
    usualCause: 'Capsular genu infarct, or a lesion of the anterior thalamic peduncle',
    usualCauseJa: '内包膝部の梗塞、視床前脚の病変',
    // One side. It used to be declared on both, and on top of that the old
    // connection channel was keyed by id with no side at all, so selecting this
    // zeroed all three frontal circuits bilaterally — heavier than the
    // unilateral infarct the preset is named after.
    structures: Object.freeze([dominant('Anterior thalamic radiation')]),
    // Connections in this model are not sided — there is one of each, standing
    // for both — so cutting these stands for a bilateral interruption. Stated
    // here because a one-sided capsular lesion is the commoner event, and this
    // model will read it as heavier than it is.
  },
  {
    id: 'bilateral-medial-temporal',
    label: 'Both medial temporal lobes', labelJa: '両側 内側側頭葉（海馬）',
    usualCause: 'Bilateral posterior cerebral artery territory, herpes simplex encephalitis, or hypoxia',
    usualCauseJa: '両側後大脳動脈領域の梗塞、単純ヘルペス脳炎、低酸素',
    structures: Object.freeze([...bilateral('Hippocampus')]),
  },
]);

/**
 * A `paired` node claims that one side can do the job when the other cannot.
 * A node with structures on only one side cannot make that claim, and filing
 * one as paired would quietly turn "needs both sides gone" into "needs this one
 * gone" — the difference between amnesia and no amnesia. Checked here, at
 * import, so it fails on the way in rather than in a scene nobody is looking at.
 */
for (const node of FUNCTION_NODES) {
  if (node.substrate !== NODE_SUBSTRATE.PAIRED) continue;
  const sides = new Set(node.structures.map((structure) => structure.side).filter((side) => side !== SIDE.MEDIAN));
  if (sides.size < 2) {
    throw new Error(`higherBrainFunction: "${node.id}" is paired but has structures on ${sides.size} side(s)`);
  }
}

/**
 * The mesh that stands for "white matter that is not a named bundle".
 *
 * A lesion of a named bundle interrupts what runs inside it. This one is not a
 * bundle — it is the whole hemisphere's white matter, and every short
 * connection in the model is anchored in it for want of anywhere better — so
 * asking what a lesion of *it* would interrupt would answer "everything", which
 * is true of a hemispherectomy and useless as a reading of a structure.
 */
export const BULK_WHITE_MATTER = 'White matter of telencephalon';

/**
 * What one named structure of the atlas does, and what is lost without it.
 *
 * This is the question a reader asks by touching a gyrus: *what is this for?*
 * The answer is not a lookup table — there is no per-structure list of
 * functions anywhere in this model. It is produced by **destroying that one
 * structure and solving**, so it says exactly what the rest of the model says
 * and cannot drift away from it. A structure no route uses answers with
 * nothing, which is the honest answer for most of the atlas.
 *
 * @param {string} label the atlas label (`bx_label`)
 * @param {'left'|'right'|'median'} side the atlas side (`bx_side`)
 * @param {{handedness?: string}} [options]
 * @returns {{
 *   label: string, side: string, dominance: object,
 *   nodes: {id:string,label:string,labelJa:string}[],
 *   connections: {id:string,label:string,labelJa:string}[],
 *   tasks: {id:string,label:string,labelJa:string}[],
 *   ifLost: {lost:string[], impaired:string[], syndromes:{id:string,label:string,labelJa:string}[]},
 *   carries: boolean
 * }}
 */
export function functionsOfStructure(label, side, { handedness = HANDEDNESS.RIGHT } = {}) {
  const dominance = dominanceFor(handedness);
  const matches = (structure) => structure.label === label && resolveSide(structure.side, dominance) === side;

  const nodes = FUNCTION_NODES.filter((node) => node.structures.some(matches))
    .map((node) => ({ id: node.id, label: node.label, labelJa: node.labelJa, mapping: node.mapping }));
  // A named bundle carries connections; the bulk white matter does not (above).
  const connections = label === BULK_WHITE_MATTER
    ? []
    : FUNCTION_EDGES.filter((edge) => edge.within.some(matches))
      .map((edge) => ({ id: edge.id, label: edge.label, labelJa: edge.labelJa }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const connectionIds = new Set(connections.map((connection) => connection.id));
  const tasks = FUNCTION_TASKS.filter((task) => task.routes.some((route) => route.nodes.some((nodeId, index) => {
    if (nodeIds.has(nodeId)) return true;
    if (index === 0) return false;
    const edge = edgeBetween(route.nodes[index - 1], nodeId);
    return edge ? connectionIds.has(edge.id) : false;
  }))).map((task) => ({ id: task.id, label: task.label, labelJa: task.labelJa }));

  // The reading: this one structure gone, and the model solved for it. What
  // comes back is route availability, and it is deliberately not turned into a
  // syndrome, a diagnosis or a statement about a person.
  const solved = solveHigherBrainFunction({
    handedness,
    lesions: [{ id: `structure:${label}|${side}`, structures: [{ label, side }] }],
  });
  const banded = (state) => solved.tasks
    .filter((task) => task.computationStatus === COMPUTATION.COMPUTED && task.state === state)
    .map((task) => task.id);

  return {
    label,
    side,
    dominance,
    nodes,
    connections,
    tasks,
    carries: tasks.length > 0,
    ifLost: {
      /** Route availability in the bottom band. Not "the patient cannot do this". */
      low: banded(PATHWAY_STATE.LOW),
      intermediate: banded(PATHWAY_STATE.INTERMEDIATE),
      /** Tasks this model has no route for, which is not the same as unaffected. */
      notModelled: solved.tasks
        .filter((task) => task.computationStatus === COMPUTATION.NOT_MODELLED)
        .map((task) => task.id),
      indeterminate: solved.tasks
        .filter((task) => task.computationStatus === COMPUTATION.INDETERMINATE)
        .map((task) => task.id),
    },
  };
}

/** @param {string} id */
export function lesionSiteById(id) {
  return LESION_SITES.find((site) => site.id === id) ?? null;
}

/** @param {string} id */
export function functionNodeById(id) {
  return FUNCTION_NODES.find((node) => node.id === id) ?? null;
}

const EDGE_BY_PAIR = new Map(FUNCTION_EDGES.map((edge) => [`${edge.from}→${edge.to}`, edge]));

/** The connection a route uses between two consecutive processes, or null. */
export function edgeBetween(from, to) {
  return EDGE_BY_PAIR.get(`${from}→${to}`) ?? null;
}

/** Which band an availability falls in. Bands, not abilities. */
function stateFor(availability) {
  if (availability >= AVAILABILITY_HIGH) return PATHWAY_STATE.HIGH;
  if (availability >= AVAILABILITY_LOW) return PATHWAY_STATE.INTERMEDIATE;
  return PATHWAY_STATE.LOW;
}

/** True for anything below the top band — "not the top band", nothing more. */
export function isBelowHigh(state) {
  return state != null && state !== PATHWAY_STATE.HIGH;
}

/**
 * Is this route one the task may use for the stimulus it was probed with?
 *
 * A route with no `stimuli` serves any stimulus. A route that declares them
 * serves only those, which is the whole of what keeps a nonword out of the
 * lexicon: `max()` below is taken over the eligible subset, so an ineligible
 * route cannot rescue a task by being the best one.
 */
export function routeIsEligible(route, stimulus) {
  if (!route.stimuli) return true;
  if (stimulus == null) return true;
  return route.stimuli.includes(stimulus);
}

/**
 * Turn a set of solved routes into the result contract.
 *
 * Pure, and separate from the solver, because this is where the conservative
 * rules live and each of them is a way the first version of this model could
 * have lied:
 *
 * - **No eligible route is not availability zero.** `max([])` has no value.
 *   Giving it 0 reports a task as abolished; giving it 1 reports it as normal;
 *   giving it `-Infinity` propagates. It is {@link COMPUTATION.NOT_MODELLED}.
 * - **An unevaluated route is not a blocked one.** If every route this mode
 *   could evaluate is in the bottom band and an eligible route remains whose
 *   availability cannot be computed, the answer is
 *   {@link COMPUTATION.INDETERMINATE} — "all routes are blocked" is not a
 *   conclusion available here.
 * - **A known value is not "the best route" while an eligible route is
 *   unknown.** 0.6 with an unknown sibling is 0.6 of *one route*, not the
 *   task's value, so it is not reported as one.
 * - **The bottom band is not a blockade.** `declaredBlock` is set only when
 *   every evaluated route carries an element at exactly zero.
 *
 * @param {{routes:readonly object[], ineligibleRouteIds:readonly string[]}} input
 */
export function resolveTaskResult({ routes, ineligibleRouteIds = [] }) {
  const empty = {
    availability: null,
    state: null,
    route: null,
    evaluatedRouteIds: Object.freeze([]),
    ineligibleRouteIds: Object.freeze([...ineligibleRouteIds]),
    unevaluatedRouteIds: Object.freeze([]),
    limitingSteps: Object.freeze([]),
    declaredBlock: false,
  };
  if (routes.length === 0) {
    return Object.freeze({ ...empty, computationStatus: COMPUTATION.NOT_MODELLED });
  }
  const evaluated = routes.filter((route) => route.evaluable);
  const unevaluatedRouteIds = Object.freeze(routes.filter((route) => !route.evaluable).map((route) => route.id));
  if (evaluated.length === 0) {
    return Object.freeze({
      ...empty,
      computationStatus: COMPUTATION.INDETERMINATE,
      unevaluatedRouteIds,
    });
  }
  // Ties go to declaration order rather than to sort stability, so the same
  // input always explains itself with the same route.
  const best = evaluated.reduce(
    (winner, route) => (route.availability > winner.availability ? route : winner),
    evaluated[0]
  );
  // An unknown sibling route makes the maximum unknown too, *unless* the best
  // evaluated route already reaches the top band: an unknown route can only be
  // equal or better, so "there is a way through" survives not knowing. Anything
  // below that — 0.6 with an unknown sibling — is 0.6 of one route and is not
  // reported as the task's value.
  const settled = unevaluatedRouteIds.length === 0
    || evaluated.some((route) => route.availability >= AVAILABILITY_HIGH);
  if (!settled) {
    return Object.freeze({
      ...empty,
      computationStatus: COMPUTATION.INDETERMINATE,
      evaluatedRouteIds: Object.freeze(evaluated.map((route) => route.id)),
      unevaluatedRouteIds,
      route: best.steps,
    });
  }
  return Object.freeze({
    computationStatus: COMPUTATION.COMPUTED,
    availability: best.availability,
    state: stateFor(best.availability),
    route: best.steps,
    evaluatedRouteIds: Object.freeze(evaluated.map((route) => route.id)),
    ineligibleRouteIds: Object.freeze([...ineligibleRouteIds]),
    unevaluatedRouteIds,
    limitingSteps: Object.freeze(
      best.steps.filter((step) => step.integrity < AVAILABILITY_HIGH).map((step) => step.id)
    ),
    declaredBlock: evaluated.every((route) => route.steps.some((step) => step.integrity === 0)),
  });
}

/**
 * Solve the network.
 *
 * Two modes, and never both at once. In {@link MODE.ATLAS_LESION} the input is
 * named structures of the atlas; in {@link MODE.CONCEPTUAL} it is process ids
 * switched off directly. Passing both is an error rather than a merge, because
 * a conceptual dissociation reported as the consequence of a lesion would be
 * the single most misleading thing this model could do.
 *
 * @param {object} [input]
 * @param {string} [input.handedness] {@link HANDEDNESS}
 * @param {string} [input.mode] {@link MODE}
 * @param {readonly object[]} [input.lesions] entries of {@link LESION_SITES}, or the same shape
 * @param {readonly string[]} [input.interventions] node or connection ids to switch off
 * @param {number} [input.extent] 0–1, how far the lesions have been taken. An input, never a prediction.
 */
export function solveHigherBrainFunction({
  handedness = HANDEDNESS.RIGHT,
  mode = MODE.ATLAS_LESION,
  lesions = [],
  interventions = [],
  extent = 1,
} = {}) {
  const dominance = dominanceFor(handedness);
  if (mode !== MODE.ATLAS_LESION && mode !== MODE.CONCEPTUAL) {
    throw new Error(`higherBrainFunction: unknown mode ${JSON.stringify(mode)}`);
  }
  if (mode === MODE.ATLAS_LESION && interventions.length > 0) {
    throw new Error(
      'higherBrainFunction: a conceptual intervention was passed in atlas-lesion mode. '
      + 'The two are separate on purpose — a process switched off by hand is not something a lesion did.'
    );
  }
  if (mode === MODE.CONCEPTUAL && lesions.length > 0) {
    throw new Error(
      'higherBrainFunction: an atlas lesion was passed in conceptual mode. Switch mode, or clear the lesion.'
    );
  }
  if (!Number.isFinite(extent)) {
    throw new Error(`higherBrainFunction: extent must be a finite number (got ${JSON.stringify(extent)})`);
  }
  if (extent < 0 || extent > 1) {
    throw new Error(`higherBrainFunction: extent is a fraction between 0 and 1 (got ${extent})`);
  }
  const reach = extent;

  const knownProcessIds = new Set([
    ...FUNCTION_NODES.map((node) => node.id),
    ...FUNCTION_EDGES.map((edge) => edge.id),
  ]);
  for (const id of interventions) {
    if (!knownProcessIds.has(id)) {
      throw new Error(`higherBrainFunction: nothing to switch off called ${JSON.stringify(id)}`);
    }
  }
  const switchedOff = new Set(interventions);

  /** @type {Map<string, number>} structureKey → 0–1 destroyed */
  const structureDamage = new Map();
  /** @type {string[]} what the chosen lesions say they do not compute */
  const unmodelledInfluences = [];
  /** @type {Map<string, string[]>} task id → influences this model does not compute */
  const unmodelledByTask = new Map();

  for (const lesion of lesions) {
    if (!lesion) continue;
    const declared = lesion.severity ?? 1;
    if (!Number.isFinite(declared) || declared < 0 || declared > 1) {
      throw new Error(`higherBrainFunction: lesion ${lesion.id} has severity ${JSON.stringify(declared)}`);
    }
    const severity = declared * reach;
    for (const structure of lesion.structures ?? []) {
      // A lesion may name a side the way the network does (`dominant`) or the
      // way the atlas does (`left`). The second is what a reader's tap gives.
      const side = structure.side === 'left' || structure.side === 'right' || structure.side === 'median'
        ? structure.side
        : resolveSide(structure.side, dominance);
      const share = structure.share ?? 1;
      if (!Number.isFinite(share) || share < 0 || share > 1) {
        throw new Error(`higherBrainFunction: lesion ${lesion.id} names a share of ${JSON.stringify(share)}`);
      }
      const key = structureKey(structure.label, side);
      structureDamage.set(key, Math.max(structureDamage.get(key) ?? 0, severity * share));
    }
    if (lesion.connections) {
      throw new Error(
        `higherBrainFunction: lesion ${lesion.id} still declares \`connections\`. Connections take their `
        + 'integrity from the structures they run within, so that damaging one side cannot zero the other.'
      );
    }
    if (severity > 0) {
      for (const influence of lesion.unmodelledInfluences ?? []) {
        unmodelledInfluences.push(influence.what);
        for (const taskId of influence.onTasks) {
          if (!unmodelledByTask.has(taskId)) unmodelledByTask.set(taskId, []);
          unmodelledByTask.get(taskId).push(influence.what);
        }
      }
    }
  }

  const damageOf = (label, side) => structureDamage.get(structureKey(label, side)) ?? 0;

  /**
   * One element's integrity, and whether this mode can evaluate it at all.
   *
   * A `CONCEPTUAL` element has no structure, so in atlas-lesion mode there is
   * nothing for a lesion to hit — and that is reported as `evaluable: false`,
   * not as integrity 1. The difference matters: "no mesh" is missing
   * information, and a result that rests on it is indeterminate rather than
   * healthy.
   */
  const resolveElement = (element, structures) => {
    if (switchedOff.has(element.id)) return { integrity: 0, evaluable: true };
    if (element.mapping === MAPPING.CONCEPTUAL) {
      // A process with no mesh is available unless it is switched off, *and*
      // every task whose route passes through it carries that as a coverage
      // limitation. `assumedAvailable` is the declaration of that assumption;
      // without it the element is simply not evaluable by a lesion, which is
      // reported as indeterminate rather than as health.
      if (element.assumedAvailable) return { integrity: 1, evaluable: true, assumed: true };
      return { integrity: 1, evaluable: mode === MODE.CONCEPTUAL };
    }
    if (structures.length === 0) {
      throw new Error(`higherBrainFunction: ${element.id} claims an atlas mapping and names no structure`);
    }
    const integrity = element.substrate === NODE_SUBSTRATE.PAIRED
      ? bestSideIntegrity(structures)
      : 1 - mean(structures.map((structure) => structure.damage));
    return { integrity: round(clamp01(integrity)), evaluable: true };
  };

  const nodes = FUNCTION_NODES.map((node) => {
    const structures = node.structures.map((structure) => {
      const side = resolveSide(structure.side, dominance);
      return { label: structure.label, side, damage: damageOf(structure.label, side) };
    });
    const { integrity, evaluable, assumed } = resolveElement(node, structures);
    return {
      id: node.id,
      label: node.label,
      labelJa: node.labelJa,
      mapping: node.mapping,
      integrity,
      evaluable,
      /** True when this is a process no lesion can reach, taken as available. */
      assumed: Boolean(assumed),
      structures,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  // A connection's integrity comes from the structures it runs within, on the
  // side it runs on — the same rule the nodes obey. It used to be a channel of
  // its own that a lesion set by id, and because an id has no side, selecting
  // one internal capsule zeroed the connection on both. There is one damage
  // input now, and it is sided.
  const edges = FUNCTION_EDGES.map((edge) => {
    const structures = edge.within.map((structure) => {
      const side = resolveSide(structure.side, dominance);
      return { label: structure.label, side, damage: damageOf(structure.label, side) };
    });
    const substrate = edge.substrate ?? NODE_SUBSTRATE.COMPOSITE;
    const { integrity, evaluable, assumed } = resolveElement({ ...edge, substrate }, structures);
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      labelJa: edge.labelJa,
      mapping: edge.mapping,
      within: structures.map(({ label, side }) => ({ label, side })),
      integrity,
      evaluable,
      assumed: Boolean(assumed),
    };
  });
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  const tasks = FUNCTION_TASKS.map((task) => {
    const declaredLimits = [...(task.coverageLimitations ?? [])];
    const declaredLimitsJa = [...(task.coverageLimitationsJa ?? [])];
    const base = {
      id: task.id,
      label: task.label,
      labelJa: task.labelJa,
      modelled: task.modelled,
      stimulus: task.stimulus ?? null,
      excludes: task.excludes,
      excludesJa: task.excludesJa,
      unmodelledInfluences: Object.freeze([...(unmodelledByTask.get(task.id) ?? [])]),
    };
    if (!task.modelled) {
      return Object.freeze({
        ...base,
        ...resolveTaskResult({ routes: [], ineligibleRouteIds: [] }),
        coverageLimitations: Object.freeze(declaredLimits),
        coverageLimitationsJa: Object.freeze(declaredLimitsJa),
      });
    }
    const eligible = task.routes.filter((route) => routeIsEligible(route, task.stimulus));
    const ineligibleRouteIds = task.routes
      .filter((route) => !routeIsEligible(route, task.stimulus))
      .map((route) => route.id);
    const solved = eligible.map((route) => solveRoute(route, nodeById, edgeById));
    const resolved = resolveTaskResult({ routes: solved, ineligibleRouteIds });
    // A coarse mesh standing in for something finer, or two processes sharing
    // one mesh, is a limit of *this* result and belongs next to it rather than
    // in a document a reader may not open.
    const meshLimits = new Set();
    const meshLimitsJa = new Set();
    for (const route of solved) {
      for (const step of route.steps) {
        if (step.assumed) {
          meshLimits.add(
            `${step.label} has no atlas structure, so it is taken as available: no lesion here can `
            + 'affect it, and that is an assumption rather than a finding'
          );
          meshLimitsJa.add(
            `${step.labelJa}にはアトラス上の構造がないため、利用可能として扱っています。`
            + 'ここに置いたどの病変もこれには影響せず、それは所見ではなく仮定です'
          );
        }
        const node = step.kind === 'node' ? functionNodeById(step.id) : null;
        if (node?.sharesMeshWith?.length) {
          const siblings = node.sharesMeshWith.map((id) => functionNodeById(id));
          meshLimits.add(
            `${node.label} shares one atlas mesh with ${siblings.map((n) => n?.label ?? '?').join(', ')}, `
            + 'so a lesion cannot take one without the other'
          );
          meshLimitsJa.add(
            `${node.labelJa}は${siblings.map((n) => n?.labelJa ?? '?').join('、')}と同じメッシュに載るので、`
            + '病変で一方だけを奪うことはできません'
          );
        }
      }
    }
    return Object.freeze({
      ...base,
      ...resolved,
      coverageLimitations: Object.freeze([...declaredLimits, ...meshLimits]),
      coverageLimitationsJa: Object.freeze([...declaredLimitsJa, ...meshLimitsJa]),
    });
  });

  return {
    dominance,
    mode,
    extent: round(reach),
    nodes,
    edges,
    tasks,
    interventions: Object.freeze([...interventions]),
    unmodelledInfluences: Object.freeze([...new Set(unmodelledInfluences)]),
    /** Every structure this lesion set touches, for a view that has to draw it. */
    affectedStructures: [...structureDamage.entries()]
      .map(([key, damage]) => {
        const separator = key.lastIndexOf('|');
        return { label: key.slice(0, separator), side: key.slice(separator + 1), damage: round(damage) };
      })
      .filter((structure) => structure.damage > 0)
      .sort((a, b) => b.damage - a.damage || a.label.localeCompare(b.label)),
    affectedConnections: edges.filter((edge) => edge.evaluable && edge.integrity < 1).map((edge) => edge.id),
  };
}

/**
 * One route, as the product of everything it passes through.
 *
 * A product, and not an average, because a route is a chain: a step that
 * carries nothing leaves nothing for the rest of the route to carry, however
 * well the other steps are doing.
 */
function solveRoute(route, nodeById, edgeById) {
  const steps = [];
  for (const [index, nodeId] of route.nodes.entries()) {
    if (index > 0) {
      const from = route.nodes[index - 1];
      const edge = edgeBetween(from, nodeId);
      if (!edge) {
        throw new Error(
          `higherBrainFunction: route ${route.id} steps from ${from} to ${nodeId} with no connection declared`
        );
      }
      const solvedEdge = edgeById.get(edge.id);
      steps.push({
        kind: 'connection', id: edge.id, label: edge.label, labelJa: edge.labelJa,
        integrity: solvedEdge.integrity, evaluable: solvedEdge.evaluable, assumed: solvedEdge.assumed,
      });
    }
    const node = nodeById.get(nodeId);
    if (!node) throw new Error(`higherBrainFunction: route ${route.id} names an unknown process ${nodeId}`);
    steps.push({
      kind: 'node', id: node.id, label: node.label, labelJa: node.labelJa,
      integrity: node.integrity, evaluable: node.evaluable, assumed: node.assumed,
    });
  }
  // A closed loop — the frontal–subcortical circuits return to the cortex they
  // started from — passes its first node twice, and so does the route that
  // repeats a word by way of its meaning. It is one structure, and counting it
  // twice would make a lesion of it weigh double for no reason anybody could
  // defend. Distinct things only.
  const counted = new Set();
  const availability = round(steps.reduce((carried, step) => {
    const key = `${step.kind}:${step.id}`;
    if (counted.has(key)) return carried;
    counted.add(key);
    return carried * step.integrity;
  }, 1));
  return {
    id: route.id,
    label: route.label ?? null,
    labelJa: route.labelJa ?? null,
    steps,
    availability,
    /** False when any step is something this mode cannot evaluate. */
    evaluable: steps.every((step) => step.evaluable),
  };
}

/**
 * The best side of a paired node: the side whose structures are least damaged.
 *
 * `median` structures count towards every side, because a midline structure is
 * on neither side and available to both.
 */
function bestSideIntegrity(structures) {
  const sides = new Set(structures.map((structure) => structure.side));
  let best = 0;
  for (const side of sides) {
    const own = structures.filter((structure) => structure.side === side || structure.side === 'median');
    best = Math.max(best, 1 - mean(own.map((structure) => structure.damage)));
  }
  return best;
}

function mean(values) {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** Four places: enough that a product of five steps does not drift, and no claim of precision. */
function round(value) {
  return Math.round(value * 1e4) / 1e4;
}
