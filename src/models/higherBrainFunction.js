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
 * A lesion damages structures and connections. Everything else — which tasks
 * survive, which syndrome that pattern is called, and where along the route the
 * signal stops — is **solved from the routes**. Cut the dorsal route between
 * the posterior superior temporal gyrus and the inferior frontal gyrus and
 * repetition fails while comprehension and fluency do not, because repetition
 * is the one task whose route uses it; nothing here contains the words
 * "conduction aphasia" as a cause.
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
 * not measured in any: `integrity` and `transmission` are on 0–1, and what is
 * claimed about them is **direction and order** — more damage transmits less,
 * a route is no better than its worst link, and a task fails when every route
 * it has fails. The two thresholds that turn a transmission into
 * intact / impaired / lost are choices of where to draw a line on that
 * ordering, not measured cut-offs, and no output of this model is a score, a
 * severity scale or a test result. See `docs/model-evidence/higher-brain-function.md`.
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
export const FUNCTION_STATUS = Object.freeze({
  INTACT: 'intact',
  IMPAIRED: 'impaired',
  LOST: 'lost',
});

/**
 * Where the line is drawn on the transmission ordering.
 *
 * Choices, and stated as such: nothing measured says a route carrying 0.8 of
 * its signal is "impaired". What is claimed is that these two numbers are
 * ordered and fixed, so that a heavier lesion is never reported as a lighter
 * deficit.
 */
export const TRANSMISSION_INTACT = 0.85;
export const TRANSMISSION_LOST = 0.25;

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
    label: 'Primary auditory cortex',
    labelJa: '一次聴覚野（横側頭回）',
    substrate: NODE_SUBSTRATE.PAIRED,
    structures: Object.freeze(bilateral('Transverse temporal gyri')),
    note: 'Each ear reaches both sides, so one-sided damage here takes nothing away.',
    noteJa: '片耳の入力は両側に届くので、片側だけの障害では何も失われません。',
  },
  {
    id: 'phonological-analysis',
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
    label: 'Lexical and semantic store',
    labelJa: '語彙・意味の貯蔵（中側頭回〜側頭極）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Middle temporal gyrus'), dominant('Temporal pole')]),
  },
  {
    id: 'cross-modal-integration',
    label: 'Cross-modal integration (angular gyrus)',
    labelJa: '多感覚の統合（角回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Angular gyrus')]),
  },
  {
    id: 'speech-initiation',
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
    label: 'Visual cortex, dominant hemisphere',
    labelJa: '優位半球の一次視覚野（対側＝右視野を受ける）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Calcarine sulcus'), dominant('Cuneus'), dominant('Lingual gyrus')]),
  },
  {
    id: 'visual-input-nondominant',
    label: 'Visual cortex, non-dominant hemisphere',
    labelJa: '非優位半球の一次視覚野（左視野を受ける）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([
      nondominant('Calcarine sulcus'), nondominant('Cuneus'), nondominant('Lingual gyrus'),
    ]),
  },
  {
    id: 'ventral-visual-form',
    label: 'Ventral visual form (fusiform gyrus)',
    labelJa: '腹側視覚路の形態表現（外側後頭側頭回＝紡錘状回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Lateral occipitotemporal gyrus')]),
    note: 'One node for word form and object form together; this model does not separate them.',
    noteJa: '語形と物体形態を 1 つのノードにまとめています。本模型はこの 2 つを区別しません。',
  },
  {
    id: 'praxis-formula',
    label: 'Praxis formulas (dominant supramarginal gyrus)',
    labelJa: '行為の図式（優位半球 縁上回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Supramarginal gyrus')]),
  },
  {
    id: 'premotor-dominant',
    label: 'Premotor cortex, dominant hemisphere',
    labelJa: '優位半球の運動前野（中前頭回後部）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Middle frontal gyrus')]),
  },
  {
    id: 'premotor-nondominant',
    label: 'Premotor cortex, non-dominant hemisphere',
    labelJa: '非優位半球の運動前野（中前頭回後部）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([nondominant('Middle frontal gyrus')]),
  },
  {
    id: 'hand-motor-dominant',
    label: 'Motor cortex for the right hand',
    labelJa: '右手の運動野（優位半球 中心前回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([dominant('Precentral gyrus')]),
  },
  {
    id: 'hand-motor-nondominant',
    label: 'Motor cortex for the left hand',
    labelJa: '左手の運動野（非優位半球 中心前回）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([nondominant('Precentral gyrus')]),
  },
  {
    id: 'spatial-attention-nondominant',
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
    label: 'Dorsolateral prefrontal cortex',
    labelJa: '背外側前頭前野',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Middle frontal gyrus')]),
    note: 'Both sides, combined rather than paired: one-sided damage here impairs without abolishing.',
    noteJa: '両側を合算しています（paired ではありません）。片側だけの障害でも完全には失われず、低下します。',
  },
  {
    id: 'orbitofrontal',
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
    label: 'Dorsal striatum (caudate nucleus)',
    labelJa: '背側線条体（尾状核）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Caudate nucleus')]),
  },
  {
    id: 'ventral-striatum',
    label: 'Ventral striatum (nucleus accumbens)',
    labelJa: '腹側線条体（側坐核）',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Nucleus accumbens')]),
  },
  {
    id: 'pallidal-outflow',
    label: 'Pallidal outflow',
    labelJa: '淡蒼球からの出力',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Globus pallidus internal')]),
  },
  {
    id: 'mediodorsal-thalamus',
    label: 'Mediodorsal thalamic nucleus',
    labelJa: '視床背内側核',
    substrate: NODE_SUBSTRATE.COMPOSITE,
    structures: Object.freeze([...bilateral('Mediodorsal nucleus')]),
  },
  {
    id: 'medial-temporal-memory',
    label: 'Medial temporal memory formation',
    labelJa: '内側側頭葉（海馬）での記憶形成',
    substrate: NODE_SUBSTRATE.PAIRED,
    structures: Object.freeze(bilateral('Hippocampus')),
  },
  {
    id: 'limbic-memory-relay',
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
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'phonological-to-semantic', from: 'phonological-analysis', to: 'lexical-semantic',
    label: 'Phonological analysis to meaning', labelJa: '音韻の分析 → 意味',
    within: Object.freeze([dominant('Middle longitudinal fasciculus')]),
  },
  {
    id: 'dorsal-phonological', from: 'phonological-analysis', to: 'phonological-output',
    label: 'Dorsal route (arcuate fasciculus)', labelJa: '背側経路（弓状束）',
    within: Object.freeze([dominant('Arcuate fasciculus')]),
  },
  {
    id: 'semantic-to-initiation', from: 'lexical-semantic', to: 'speech-initiation',
    label: 'Meaning to speech initiation', labelJa: '意味 → 発話の起動',
    // The ventral association bundle running from the temporal lobe forward.
    // It ends in the frontal convexity rather than on the medial surface where
    // the supplementary motor area is, so this is the nearest named bundle
    // rather than the tract itself.
    within: Object.freeze([dominant('Inferior fronto-occipital fasciculus')]),
  },
  {
    id: 'initiation-to-output', from: 'speech-initiation', to: 'phonological-output',
    label: 'Speech initiation to output planning', labelJa: '発話の起動 → 出力計画',
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
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'visual-to-form', from: 'visual-input-dominant', to: 'ventral-visual-form',
    label: 'Dominant visual cortex to ventral form', labelJa: '優位半球視覚野 → 腹側の形態表現',
    within: Object.freeze([dominant('Inferior longitudinal fasciculus')]),
  },
  {
    id: 'callosal-visual', from: 'visual-input-nondominant', to: 'ventral-visual-form',
    label: 'Callosal crossing for vision', labelJa: '視覚情報の脳梁交叉（膨大部）',
    within: Object.freeze([median('Corpus callosum')]),
  },
  {
    id: 'form-to-integration', from: 'ventral-visual-form', to: 'cross-modal-integration',
    label: 'Ventral form to cross-modal integration', labelJa: '腹側の形態表現 → 角回',
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'form-to-semantic', from: 'ventral-visual-form', to: 'lexical-semantic',
    label: 'Ventral form to meaning', labelJa: '腹側の形態表現 → 意味',
    within: Object.freeze([dominant('Inferior longitudinal fasciculus')]),
  },
  {
    id: 'integration-to-semantic', from: 'cross-modal-integration', to: 'lexical-semantic',
    label: 'Cross-modal integration to meaning', labelJa: '角回 → 意味',
    within: Object.freeze([dominant('Middle longitudinal fasciculus')]),
  },
  {
    id: 'semantic-to-integration', from: 'lexical-semantic', to: 'cross-modal-integration',
    label: 'Meaning to cross-modal integration', labelJa: '意味 → 角回',
    within: Object.freeze([dominant('Middle longitudinal fasciculus')]),
  },
  {
    id: 'integration-to-premotor', from: 'cross-modal-integration', to: 'premotor-dominant',
    label: 'Cross-modal integration to premotor cortex', labelJa: '角回 → 運動前野',
    within: Object.freeze([dominant('Superior longitudinal fasciculus II')]),
  },
  {
    id: 'praxis-to-premotor', from: 'praxis-formula', to: 'premotor-dominant',
    label: 'Praxis formulas to dominant premotor cortex', labelJa: '行為の図式 → 優位半球 運動前野',
    within: Object.freeze([dominant('Superior longitudinal fasciculus III')]),
  },
  {
    id: 'callosal-praxis', from: 'praxis-formula', to: 'premotor-nondominant',
    label: 'Callosal crossing for praxis', labelJa: '行為の図式の脳梁交叉（体部）',
    within: Object.freeze([median('Corpus callosum')]),
  },
  {
    id: 'premotor-to-hand-dominant', from: 'premotor-dominant', to: 'hand-motor-dominant',
    label: 'Dominant premotor to right hand', labelJa: '優位半球 運動前野 → 右手',
    within: Object.freeze([dominant('White matter of telencephalon')]),
  },
  {
    id: 'premotor-to-hand-nondominant', from: 'premotor-nondominant', to: 'hand-motor-nondominant',
    label: 'Non-dominant premotor to left hand', labelJa: '非優位半球 運動前野 → 左手',
    within: Object.freeze([nondominant('White matter of telencephalon')]),
  },
  {
    id: 'dlpfc-to-striatum', from: 'dorsolateral-prefrontal', to: 'dorsal-striatum',
    label: 'Dorsolateral prefrontal cortex to caudate', labelJa: '背外側前頭前野 → 尾状核',
    within: Object.freeze([...bilateral('Corticostriatal tract (anterior)')]),
  },
  {
    id: 'orbitofrontal-to-striatum', from: 'orbitofrontal', to: 'ventral-striatum',
    label: 'Orbitofrontal cortex to ventral striatum', labelJa: '眼窩前頭皮質 → 腹側線条体',
    within: Object.freeze([...bilateral('Corticostriatal tract (anterior)')]),
  },
  {
    id: 'medial-frontal-to-striatum', from: 'medial-frontal-drive', to: 'ventral-striatum',
    label: 'Medial frontal cortex to ventral striatum', labelJa: '内側前頭葉 → 腹側線条体',
    within: Object.freeze([...bilateral('Corticostriatal tract (anterior)')]),
  },
  {
    id: 'dorsal-striatum-to-pallidum', from: 'dorsal-striatum', to: 'pallidal-outflow',
    label: 'Caudate to pallidum', labelJa: '尾状核 → 淡蒼球',
    // The striatopallidal fibres run between two grey structures the atlas has
    // and through white matter it does not divide; this is the mesh that
    // contains them, not the bundle itself.
    within: Object.freeze([...bilateral('White matter of telencephalon')]),
  },
  {
    id: 'ventral-striatum-to-pallidum', from: 'ventral-striatum', to: 'pallidal-outflow',
    label: 'Ventral striatum to pallidum', labelJa: '腹側線条体 → 淡蒼球',
    within: Object.freeze([...bilateral('White matter of telencephalon')]),
  },
  {
    id: 'pallidum-to-thalamus', from: 'pallidal-outflow', to: 'mediodorsal-thalamus',
    label: 'Pallidum to mediodorsal thalamus', labelJa: '淡蒼球 → 視床背内側核',
    within: Object.freeze([...bilateral('White matter of telencephalon')]),
  },
  {
    id: 'thalamus-to-dlpfc', from: 'mediodorsal-thalamus', to: 'dorsolateral-prefrontal',
    label: 'Thalamus back to dorsolateral prefrontal cortex', labelJa: '視床 → 背外側前頭前野（環の閉じ）',
    within: Object.freeze([...bilateral('Anterior thalamic radiation')]),
  },
  {
    id: 'thalamus-to-orbitofrontal', from: 'mediodorsal-thalamus', to: 'orbitofrontal',
    label: 'Thalamus back to orbitofrontal cortex', labelJa: '視床 → 眼窩前頭皮質（環の閉じ）',
    within: Object.freeze([...bilateral('Anterior thalamic radiation')]),
  },
  {
    id: 'thalamus-to-medial-frontal', from: 'mediodorsal-thalamus', to: 'medial-frontal-drive',
    label: 'Thalamus back to medial frontal cortex', labelJa: '視床 → 内側前頭葉（環の閉じ）',
    within: Object.freeze([...bilateral('Anterior thalamic radiation')]),
  },
  {
    id: 'fornix-outflow', from: 'medial-temporal-memory', to: 'limbic-memory-relay',
    label: 'Hippocampal outflow', labelJa: '海馬からの出力（脳弓）',
    within: Object.freeze([...bilateral('Fornix')]),
  },
]);

/**
 * The clinical tasks, each declared as the route or routes it needs.
 *
 * **The routes are the claim.** Nothing here searches the network for another
 * way round: repetition does not quietly reroute itself through meaning when
 * the dorsal route is cut, because in a person it does not either — that
 * failure with comprehension and fluency intact is the whole of conduction
 * aphasia. Where an alternative route is real it is written down, and there is
 * exactly one such place: printed words reaching the dominant hemisphere either
 * directly or across the corpus callosum.
 *
 * @type {readonly {id:string,label:string,labelJa:string,routes:readonly (readonly string[])[]}[]}
 */
export const FUNCTION_TASKS = Object.freeze([
  {
    id: 'auditory-comprehension',
    label: 'Understanding speech', labelJa: '聴覚的理解',
    routes: Object.freeze([Object.freeze(['auditory-input', 'phonological-analysis', 'lexical-semantic'])]),
  },
  {
    id: 'repetition',
    label: 'Repeating what is heard', labelJa: '復唱',
    routes: Object.freeze([
      Object.freeze(['auditory-input', 'phonological-analysis', 'phonological-output', 'speech-motor']),
    ]),
  },
  {
    id: 'speech-fluency',
    label: 'Producing fluent speech', labelJa: '発話の流暢性',
    routes: Object.freeze([Object.freeze(['speech-initiation', 'phonological-output', 'speech-motor'])]),
  },
  {
    id: 'propositional-speech',
    label: 'Saying something with content', labelJa: '内容のある自発話',
    routes: Object.freeze([
      Object.freeze(['lexical-semantic', 'speech-initiation', 'phonological-output', 'speech-motor']),
    ]),
  },
  {
    id: 'naming',
    label: 'Naming what is seen', labelJa: '呼称',
    routes: Object.freeze([
      Object.freeze(['visual-input-dominant', 'ventral-visual-form', 'lexical-semantic',
        'phonological-analysis', 'phonological-output', 'speech-motor']),
      Object.freeze(['visual-input-nondominant', 'ventral-visual-form', 'lexical-semantic',
        'phonological-analysis', 'phonological-output', 'speech-motor']),
    ]),
  },
  {
    id: 'reading',
    label: 'Reading', labelJa: '読字',
    routes: Object.freeze([
      Object.freeze(['visual-input-dominant', 'ventral-visual-form', 'cross-modal-integration', 'lexical-semantic']),
      Object.freeze(['visual-input-nondominant', 'ventral-visual-form', 'cross-modal-integration', 'lexical-semantic']),
    ]),
  },
  {
    id: 'writing',
    label: 'Writing', labelJa: '書字',
    routes: Object.freeze([
      Object.freeze(['lexical-semantic', 'cross-modal-integration', 'premotor-dominant', 'hand-motor-dominant']),
    ]),
  },
  {
    id: 'calculation-and-body-schema',
    label: 'Calculation, fingers, left and right', labelJa: '計算・手指認知・左右の識別',
    routes: Object.freeze([Object.freeze(['cross-modal-integration'])]),
  },
  {
    id: 'praxis-right-hand',
    label: 'Using a tool with the right hand', labelJa: '右手での道具使用（模倣・パントマイム）',
    routes: Object.freeze([Object.freeze(['praxis-formula', 'premotor-dominant', 'hand-motor-dominant'])]),
  },
  {
    id: 'praxis-left-hand',
    label: 'Using a tool with the left hand', labelJa: '左手での道具使用（模倣・パントマイム）',
    routes: Object.freeze([Object.freeze(['praxis-formula', 'premotor-nondominant', 'hand-motor-nondominant'])]),
  },
  {
    id: 'attention-left-space',
    label: 'Attending to the left of space', labelJa: '左空間への注意',
    routes: Object.freeze([Object.freeze(['spatial-attention-nondominant'])]),
  },
  {
    id: 'attention-right-space',
    label: 'Attending to the right of space', labelJa: '右空間への注意',
    routes: Object.freeze([
      Object.freeze(['spatial-attention-nondominant']),
      Object.freeze(['spatial-attention-dominant']),
    ]),
  },
  {
    id: 'set-shifting-and-planning',
    label: 'Changing tack, and planning ahead', labelJa: '遂行機能（セットの転換・計画）',
    routes: Object.freeze([Object.freeze([
      'dorsolateral-prefrontal', 'dorsal-striatum', 'pallidal-outflow',
      'mediodorsal-thalamus', 'dorsolateral-prefrontal',
    ])]),
  },
  {
    id: 'behavioural-inhibition',
    label: 'Holding a response back', labelJa: '行動の抑制（社会的なふるまい）',
    routes: Object.freeze([Object.freeze([
      'orbitofrontal', 'ventral-striatum', 'pallidal-outflow',
      'mediodorsal-thalamus', 'orbitofrontal',
    ])]),
  },
  {
    id: 'initiation-and-drive',
    label: 'Starting something without being asked', labelJa: '発動性（自分から始めること）',
    routes: Object.freeze([Object.freeze([
      'medial-frontal-drive', 'ventral-striatum', 'pallidal-outflow',
      'mediodorsal-thalamus', 'medial-frontal-drive',
    ])]),
  },
  {
    id: 'episodic-memory-formation',
    label: 'Laying down a new memory', labelJa: 'エピソード記憶の形成',
    routes: Object.freeze([Object.freeze(['medial-temporal-memory', 'limbic-memory-relay'])]),
  },
]);

/**
 * Lesion sites, as sets of atlas structures and interrupted connections.
 *
 * A site is **anatomy and its usual cause**, not a syndrome: none of these
 * entries knows what deficit it produces, and changing a route above changes
 * what they produce without any of them being edited. `share` is how much of
 * that structure the lesion takes at full extent, so that a site can say "the
 * white matter under the supramarginal gyrus" without claiming the whole
 * hemisphere's white matter.
 *
 * @type {readonly {id:string,label:string,labelJa:string,usualCause:string,usualCauseJa:string,
 *   structures:readonly {label:string,side:string,share?:number}[],
 *   connections:readonly string[]}[]}
 */
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
    connections: Object.freeze([]),
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
    connections: Object.freeze([]),
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
    connections: Object.freeze(['dorsal-phonological']),
  },
  {
    id: 'dominant-perisylvian',
    label: 'Whole dominant perisylvian territory', labelJa: '優位半球 シルビウス裂周囲の全域',
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
    connections: Object.freeze(['dorsal-phonological']),
  },
  {
    id: 'dominant-anterior-watershed',
    label: 'Dominant anterior watershed', labelJa: '優位半球 前方分水嶺（上前頭回・前部帯状回）',
    usualCause: 'Border zone between the anterior and middle cerebral arteries, in systemic hypoperfusion',
    usualCauseJa: '前大脳動脈と中大脳動脈の境界領域（全身性の低灌流）',
    structures: Object.freeze([
      dominant('Superior frontal gyrus'),
      dominant('Cingulate gyrus and sulcus (Middle anterior part)'),
    ]),
    connections: Object.freeze([]),
  },
  {
    id: 'dominant-posterior-watershed',
    label: 'Dominant posterior watershed', labelJa: '優位半球 後方分水嶺（中側頭回後部・角回）',
    usualCause: 'Border zone between the middle and posterior cerebral arteries, in systemic hypoperfusion',
    usualCauseJa: '中大脳動脈と後大脳動脈の境界領域（全身性の低灌流）',
    structures: Object.freeze([
      dominant('Middle temporal gyrus'),
      dominant('Angular gyrus'),
      { ...dominant('Temporal pole'), share: 0.3 },
    ]),
    connections: Object.freeze([]),
  },
  {
    id: 'dominant-angular',
    label: 'Dominant angular gyrus', labelJa: '優位半球 角回',
    usualCause: 'Angular branch of the middle cerebral artery',
    usualCauseJa: '中大脳動脈 角回枝',
    structures: Object.freeze([dominant('Angular gyrus')]),
    connections: Object.freeze([]),
  },
  {
    id: 'dominant-occipital-and-callosum',
    label: 'Dominant occipital lobe with the corpus callosum',
    labelJa: '優位半球 後頭葉＋脳梁（膨大部を含む）',
    usualCause: 'Posterior cerebral artery',
    usualCauseJa: '後大脳動脈',
    structures: Object.freeze([
      dominant('Calcarine sulcus'), dominant('Cuneus'), dominant('Lingual gyrus'),
      { ...median('Corpus callosum'), share: 0.4 },
    ]),
    connections: Object.freeze(['callosal-visual']),
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
    connections: Object.freeze([]),
  },
  {
    id: 'corpus-callosum',
    label: 'Corpus callosum', labelJa: '脳梁',
    usualCause: 'Anterior cerebral artery territory infarct, or surgical section',
    usualCauseJa: '前大脳動脈領域の梗塞、あるいは外科的離断',
    structures: Object.freeze([median('Corpus callosum')]),
    connections: Object.freeze(['callosal-visual', 'callosal-praxis']),
  },
  {
    id: 'bifrontal-dorsolateral',
    label: 'Both dorsolateral prefrontal convexities', labelJa: '両側 背外側前頭前野（凸面）',
    usualCause: 'Traumatic brain injury, or a frontal tumour',
    usualCauseJa: '外傷性脳損傷、前頭葉腫瘍',
    structures: Object.freeze([...bilateral('Middle frontal gyrus')]),
    connections: Object.freeze([]),
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
    connections: Object.freeze([]),
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
    connections: Object.freeze([]),
  },
  {
    id: 'thalamocortical-disconnection',
    label: 'Thalamus cut off from the frontal cortex', labelJa: '視床–前頭連絡の遮断（内包膝部など）',
    usualCause: 'Capsular genu infarct, or a lesion of the anterior thalamic peduncle',
    usualCauseJa: '内包膝部の梗塞、視床前脚の病変',
    structures: Object.freeze([...bilateral('Anterior thalamic radiation')]),
    // Connections in this model are not sided — there is one of each, standing
    // for both — so cutting these stands for a bilateral interruption. Stated
    // here because a one-sided capsular lesion is the commoner event, and this
    // model will read it as heavier than it is.
    connections: Object.freeze(['thalamus-to-dlpfc', 'thalamus-to-orbitofrontal', 'thalamus-to-medial-frontal']),
  },
  {
    id: 'bilateral-medial-temporal',
    label: 'Both medial temporal lobes', labelJa: '両側 内側側頭葉（海馬）',
    usualCause: 'Bilateral posterior cerebral artery territory, herpes simplex encephalitis, or hypoxia',
    usualCauseJa: '両側後大脳動脈領域の梗塞、単純ヘルペス脳炎、低酸素',
    structures: Object.freeze([...bilateral('Hippocampus')]),
    connections: Object.freeze([]),
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

/** @param {string} id */
export function lesionSiteById(id) {
  return LESION_SITES.find((site) => site.id === id) ?? null;
}

/** @param {string} id */
export function functionNodeById(id) {
  return FUNCTION_NODES.find((node) => node.id === id) ?? null;
}

const EDGE_BY_PAIR = new Map(FUNCTION_EDGES.map((edge) => [`${edge.from}→${edge.to}`, edge]));

/** The connection a route uses between two consecutive nodes, or null. */
export function edgeBetween(from, to) {
  return EDGE_BY_PAIR.get(`${from}→${to}`) ?? null;
}

function statusFor(transmission) {
  if (transmission >= TRANSMISSION_INTACT) return FUNCTION_STATUS.INTACT;
  if (transmission >= TRANSMISSION_LOST) return FUNCTION_STATUS.IMPAIRED;
  return FUNCTION_STATUS.LOST;
}

/** True for `impaired` and `lost` alike — "not normal", whatever the degree. */
export function isAffected(status) {
  return status !== FUNCTION_STATUS.INTACT;
}

/**
 * Solve the network for a set of lesions.
 *
 * @param {object} [input]
 * @param {string} [input.handedness] {@link HANDEDNESS}
 * @param {readonly object[]} [input.lesions] entries of {@link LESION_SITES}, or the same shape
 * @param {number} [input.extent] 0–1, how far the lesions have been taken. Scales every severity,
 *   so 0 is an intact brain and 1 is the site as declared. It is an input, never a prediction.
 */
export function solveHigherBrainFunction({
  handedness = HANDEDNESS.RIGHT,
  lesions = [],
  extent = 1,
} = {}) {
  const dominance = dominanceFor(handedness);
  const reach = clamp01(extent);

  /** @type {Map<string, number>} structureKey → 0–1 destroyed */
  const structureDamage = new Map();
  /** @type {Map<string, number>} edge id → 0–1 interrupted */
  const connectionDamage = new Map();

  for (const lesion of lesions) {
    if (!lesion) continue;
    const severity = clamp01(lesion.severity ?? 1) * reach;
    for (const structure of lesion.structures ?? []) {
      const key = structureKey(structure.label, resolveSide(structure.side, dominance));
      const damage = severity * clamp01(structure.share ?? 1);
      structureDamage.set(key, Math.max(structureDamage.get(key) ?? 0, damage));
    }
    for (const id of lesion.connections ?? []) {
      connectionDamage.set(id, Math.max(connectionDamage.get(id) ?? 0, severity));
    }
  }

  const damageOf = (label, side) => structureDamage.get(structureKey(label, side)) ?? 0;

  const nodes = FUNCTION_NODES.map((node) => {
    const structures = node.structures.map((structure) => {
      const side = resolveSide(structure.side, dominance);
      return { label: structure.label, side, damage: damageOf(structure.label, side) };
    });
    const integrity = node.substrate === NODE_SUBSTRATE.PAIRED
      ? bestSideIntegrity(structures)
      : 1 - mean(structures.map((structure) => structure.damage));
    return {
      id: node.id,
      label: node.label,
      labelJa: node.labelJa,
      integrity: round(clamp01(integrity)),
      structures,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const edges = FUNCTION_EDGES.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    labelJa: edge.labelJa,
    within: edge.within.map((structure) => ({
      label: structure.label,
      side: resolveSide(structure.side, dominance),
    })),
    integrity: round(clamp01(1 - (connectionDamage.get(edge.id) ?? 0))),
  }));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  const tasks = FUNCTION_TASKS.map((task) => {
    const solved = task.routes
      .map((route) => solveRoute(route, nodeById, edgeById))
      .sort((a, b) => b.transmission - a.transmission);
    const best = solved[0];
    return {
      id: task.id,
      label: task.label,
      labelJa: task.labelJa,
      transmission: best.transmission,
      status: statusFor(best.transmission),
      /** The surviving route, in order, and what each step is worth. */
      route: best.steps,
      /** The first step that stops the signal outright, or null. */
      blockedAt: best.steps.find((step) => step.integrity < TRANSMISSION_LOST) ?? null,
      /** The worst step, whether or not it blocks. */
      weakestLink: best.steps.reduce((worst, step) => (step.integrity < worst.integrity ? step : worst), best.steps[0]),
    };
  });

  return {
    dominance,
    extent: round(reach),
    nodes,
    edges,
    tasks,
    syndromes: classifySyndromes(tasks),
    /** Every structure this lesion set touches, for a view that has to draw it. */
    affectedStructures: [...structureDamage.entries()]
      .map(([key, damage]) => {
        const separator = key.lastIndexOf('|');
        return { label: key.slice(0, separator), side: key.slice(separator + 1), damage: round(damage) };
      })
      .filter((structure) => structure.damage > 0)
      .sort((a, b) => b.damage - a.damage || a.label.localeCompare(b.label)),
    affectedConnections: edges.filter((edge) => edge.integrity < 1).map((edge) => edge.id),
  };
}

/**
 * Name the pattern of surviving tasks.
 *
 * Every entry here is a **reading of the solved state**, and the reading is the
 * only place a syndrome name appears in this model. Change a route and these
 * change with it; there is no table mapping a lesion to a name.
 *
 * It reads *where* a route broke as well as whether it broke, because the two
 * are different findings. A person who cannot name a thing they are shown is
 * only anomic **if the naming failed in or after the lexical store**: when it
 * failed at the visual end, the name was never reached, and calling that
 * anomic aphasia would file a visual disconnection as a language disorder.
 *
 * @param {readonly object[]} tasks solved tasks from {@link solveHigherBrainFunction}
 */
function classifySyndromes(tasks) {
  const syndromes = [];
  const taskById = (id) => tasks.find((task) => task.id === id);
  const bad = (id) => isAffected(taskById(id)?.status);
  /** Did this task's best route break at or after the given node? */
  const brokeAtOrAfter = (id, nodeId) => {
    const route = taskById(id)?.route ?? [];
    const node = route.findIndex((step) => step.kind === 'node' && step.id === nodeId);
    if (node < 0) return true;
    const broke = route.findIndex((step) => step.integrity < TRANSMISSION_INTACT);
    return broke < 0 || broke >= node;
  };

  const comprehension = bad('auditory-comprehension');
  const repetition = bad('repetition');
  const nonfluent = bad('speech-fluency');
  const naming = bad('naming');

  const aphasia = (() => {
    if (comprehension && repetition && nonfluent) return ['global-aphasia', 'Global aphasia', '全失語'];
    if (comprehension && repetition) return ['wernicke-aphasia', 'Wernicke aphasia', 'Wernicke 失語'];
    if (comprehension && nonfluent) return ['mixed-transcortical-aphasia', 'Mixed transcortical aphasia', '混合型超皮質性失語'];
    if (comprehension) return ['transcortical-sensory-aphasia', 'Transcortical sensory aphasia', '超皮質性感覚失語'];
    if (repetition && nonfluent) return ['broca-aphasia', 'Broca aphasia', 'Broca 失語'];
    if (repetition) return ['conduction-aphasia', 'Conduction aphasia', '伝導失語'];
    if (nonfluent) return ['transcortical-motor-aphasia', 'Transcortical motor aphasia', '超皮質性運動失語'];
    if (naming && brokeAtOrAfter('naming', 'lexical-semantic')) {
      return ['anomic-aphasia', 'Anomic aphasia', '健忘失語'];
    }
    return null;
  })();
  if (aphasia) {
    syndromes.push({
      id: aphasia[0], label: aphasia[1], labelJa: aphasia[2],
      because: ['auditory-comprehension', 'repetition', 'speech-fluency', 'naming'],
    });
  }

  if (bad('reading') && !bad('writing') && !comprehension) {
    syndromes.push({
      id: 'alexia-without-agraphia', label: 'Alexia without agraphia', labelJa: '純粋失読（失書を伴わない失読）',
      because: ['reading', 'writing'],
    });
  }
  if (bad('calculation-and-body-schema') && bad('writing')) {
    syndromes.push({
      id: 'gerstmann-syndrome', label: 'Gerstmann syndrome', labelJa: 'Gerstmann 症候群',
      because: ['calculation-and-body-schema', 'writing', 'reading'],
    });
  }
  if (bad('attention-left-space') && !bad('attention-right-space')) {
    syndromes.push({
      id: 'left-hemispatial-neglect', label: 'Left hemispatial neglect', labelJa: '左半側空間無視',
      because: ['attention-left-space', 'attention-right-space'],
    });
  }
  if (bad('praxis-left-hand') && !bad('praxis-right-hand')) {
    syndromes.push({
      id: 'callosal-apraxia', label: 'Callosal (left-hand) apraxia', labelJa: '脳梁離断による左手の失行',
      because: ['praxis-left-hand', 'praxis-right-hand'],
    });
  } else if (bad('praxis-left-hand') && bad('praxis-right-hand')) {
    syndromes.push({
      id: 'ideomotor-apraxia', label: 'Ideomotor apraxia, both hands', labelJa: '両手の観念運動失行',
      because: ['praxis-left-hand', 'praxis-right-hand'],
    });
  }
  // The frontal--subcortical circuits. Each is named for the behaviour it
  // takes away, and a lesion anywhere along one -- cortex, striatum, pallidum
  // or thalamus -- reads the same way, which is the whole reason they are
  // drawn as circuits rather than as three pieces of cortex.
  if (bad('set-shifting-and-planning')) {
    syndromes.push({
      id: 'dysexecutive-syndrome', label: 'Dysexecutive syndrome', labelJa: '遂行機能障害',
      because: ['set-shifting-and-planning'],
    });
  }
  if (bad('behavioural-inhibition')) {
    syndromes.push({
      id: 'disinhibition', label: 'Disinhibition', labelJa: '脱抑制（社会的行動の障害）',
      because: ['behavioural-inhibition'],
    });
  }
  if (bad('initiation-and-drive')) {
    syndromes.push({
      id: 'abulia', label: 'Abulia', labelJa: '発動性低下（アパシー）',
      because: ['initiation-and-drive'],
    });
  }
  if (bad('episodic-memory-formation')) {
    syndromes.push({
      id: 'anterograde-amnesia', label: 'Anterograde amnesia', labelJa: '前向性健忘',
      because: ['episodic-memory-formation'],
    });
  }
  return syndromes;
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
  for (const [index, nodeId] of route.entries()) {
    if (index > 0) {
      const edge = edgeBetween(route[index - 1], nodeId);
      if (!edge) throw new Error(`higherBrainFunction: no connection declared from ${route[index - 1]} to ${nodeId}`);
      const solvedEdge = edgeById.get(edge.id);
      steps.push({
        kind: 'connection', id: edge.id, label: edge.label, labelJa: edge.labelJa,
        integrity: solvedEdge.integrity,
      });
    }
    const node = nodeById.get(nodeId);
    if (!node) throw new Error(`higherBrainFunction: route names an unknown node ${nodeId}`);
    steps.push({ kind: 'node', id: node.id, label: node.label, labelJa: node.labelJa, integrity: node.integrity });
  }
  // A closed loop — the frontal–subcortical circuits return to the cortex they
  // started from — passes its first node twice. It is one structure, and
  // counting its integrity twice would make a cortical lesion weigh double for
  // no reason anybody could defend. Distinct things only.
  const counted = new Set();
  const transmission = round(steps.reduce((carried, step) => {
    const key = `${step.kind}:${step.id}`;
    if (counted.has(key)) return carried;
    counted.add(key);
    return carried * step.integrity;
  }, 1));
  return { steps, transmission };
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
