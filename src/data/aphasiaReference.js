/**
 * The classical aphasia syndromes, as **reference reading**.
 *
 * ## Why this is a data file and not a function
 *
 * An earlier version of this scene computed the syndrome. It ran the solved
 * tasks through a chain of conditions — comprehension and repetition and
 * fluency, in that order, first match wins — and printed the name it landed on,
 * together with a verdict of "not aphasia" for two patterns it had rules to
 * exclude. Three things were wrong with that, and all three are why this file
 * cannot be reached from the model:
 *
 * 1. **A first-match chain is a diagnosis.** It took a handful of dimensionless
 *    route values and returned a clinical category, with no way for a reader to
 *    see that the answer came from the order the conditions happened to be
 *    written in.
 * 2. **The features that actually separate these syndromes are not computed.**
 *    Paraphasia, agrammatism, prosody, effort, the length of a phrase, the
 *    stimulus a task was probed with — the model has none of them. A classifier
 *    standing on the four values it does have was substituting the initiation
 *    route for clinical fluency, which is a different thing with a similar name.
 * 3. **"Not aphasia" is a stronger claim than "aphasia".** Ruling a language
 *    disorder out needs the modalities this model does not test and the
 *    examination it does not perform.
 *
 * So the names live here, next to what this model does not evaluate about each
 * of them, and a reader compares. Nothing in this file is imported by
 * `src/models/higherBrainFunction.js`, and `tests/aphasia-reference.test.js`
 * fails if it ever is.
 *
 * ## How the cells are written
 *
 * Not `○ / △ / ✕`. A fixed symbol per feature would be a necessary-condition
 * table, and these syndromes are not that: what is described is *relative*
 * sparing, features that vary with time and lesion size, and findings that
 * depend on which stimulus was used. So each feature says what is typically
 * described and how much it varies — and `notEvaluatedHere` says, per syndrome,
 * which of its defining features this model cannot speak to at all.
 *
 * Every entry is a textbook-level description this repository is restating. The
 * build environment cannot reach the medical publishers, so no row here rests
 * on a paper whose full text was read; `docs/model-evidence/higher-brain-function.md`
 * records what was and was not verified, and to what depth.
 */

/** How firmly a feature is described, rather than whether it is present. */
export const FEATURE_TENDENCY = Object.freeze({
  /** Described as characteristically affected. */
  CHARACTERISTIC: 'characteristically-affected',
  /** Described as relatively preserved compared with the rest of the picture. */
  RELATIVELY_SPARED: 'relatively-spared',
  /** Reported both ways; varies with lesion, stimulus or time. */
  VARIABLE: 'variable',
  /** This model has no value for it at all. */
  NOT_EVALUATED: 'not-evaluated-here',
});

const feature = (id, label, labelJa, tendency, note, noteJa) =>
  Object.freeze({ id, label, labelJa, tendency, note, noteJa });

export const APHASIA_REFERENCE = Object.freeze([
  {
    id: 'broca',
    name: 'Broca aphasia',
    nameJa: 'Broca 失語',
    gist: 'Effortful, non-fluent output with comprehension relatively spared.',
    gistJa: '努力性で非流暢な発話。理解は相対的に保たれます。',
    features: Object.freeze([
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.CHARACTERISTIC,
        'Non-fluent and effortful, classically agrammatic.', '非流暢・努力性で、古典的には失文法を伴います。'),
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.RELATIVELY_SPARED,
        'Relatively spared for single words; grammatically complex sentences are often not.',
        '単語レベルでは相対的に保たれます。文法的に複雑な文はしばしば保たれません。'),
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.CHARACTERISTIC,
        'Impaired, and in the classical description not better than spontaneous output.',
        '障害されます。古典的記載では自発話より良くはなりません。'),
      feature('writing', 'Writing', '書字', FEATURE_TENDENCY.CHARACTERISTIC,
        'Agraphia accompanies it. This model’s two spelling routes do not pass through the inferior '
        + 'frontal gyrus, so it does not produce that and says so.',
        '失書を伴います。本モデルの 2 つの綴りの経路は下前頭回を通らないので、これを出せません（明示しています）。'),
      feature('reading-aloud', 'Reading aloud', '音読', FEATURE_TENDENCY.NOT_EVALUATED,
        '', ''),
    ]),
    notEvaluatedHere: Object.freeze([
      'agrammatism and the effort of the output — the model has no speech quality at all',
      'the extent of a real lesion, which reaches well beyond the two gyri named here',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '失文法と発話の努力性（本モデルは発話の質を一切持ちません）',
      '実際の病変の広がり（ここで名指す 2 つの脳回よりはるかに大きいのが普通です）',
    ]),
  },
  {
    id: 'wernicke',
    name: 'Wernicke aphasia',
    nameJa: 'Wernicke 失語',
    gist: 'Fluent but empty output with comprehension characteristically affected.',
    gistJa: '流暢だが内容の乏しい発話。理解が特徴的に障害されます。',
    features: Object.freeze([
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.CHARACTERISTIC,
        'Affected, and this is the defining feature.', '障害され、これが定義的な特徴です。'),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.VARIABLE,
        'Fluent in rate and phrase length, with paraphasia and little content. Fluency and content '
        + 'come apart here, and this model measures neither.',
        '発話速度と句の長さは流暢で、錯語が多く内容は乏しい。ここで「流暢性」と「内容」は別のもので、'
        + '本モデルはそのどちらも測っていません。'),
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('reading-comprehension', 'Reading comprehension', '読解', FEATURE_TENDENCY.VARIABLE,
        'Commonly affected too, and not always to the same degree as listening.',
        '同様に障害されることが多く、聴覚的理解と同程度とは限りません。'),
      feature('writing', 'Writing', '書字', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
    ]),
    notEvaluatedHere: Object.freeze([
      'paraphasia, and whether the fluent output is empty — the two features it is recognised by',
      'how far reading comprehension follows listening, which this model computes by a different route '
      + 'and should not be read as a prediction',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '錯語、および流暢な発話の内容が乏しいこと（この症候を見分ける 2 つの特徴そのもの）',
      '読解が聴覚的理解にどこまで連動するか（本モデルは別経路で計算しており、予測として読まないでください）',
    ]),
  },
  {
    id: 'conduction',
    name: 'Conduction aphasia',
    nameJa: '伝導失語',
    gist: 'Repetition disproportionately affected, with comprehension and fluent output spared.',
    gistJa: '理解と流暢な発話が保たれるなか、復唱が不釣り合いに障害されます。',
    features: Object.freeze([
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.CHARACTERISTIC,
        'Disproportionately affected, and described as worse for nonwords and function words than for '
        + 'familiar content words — a stimulus effect, not a single value.',
        '不釣り合いに障害されます。非語や機能語で、なじみのある内容語より悪いと記載されます'
        + '——刺激による差であって、1 つの値ではありません。'),
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.RELATIVELY_SPARED,
        '', ''),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.RELATIVELY_SPARED,
        'Fluent, with phonemic paraphasia and self-correction.', '流暢ですが、音韻性錯語と自己修正を伴います。'),
      feature('naming', 'Naming', '呼称', FEATURE_TENDENCY.VARIABLE,
        'Often affected, with phonemic errors.', 'しばしば障害され、音韻性の誤りを伴います。'),
      feature('writing', 'Writing', '書字', FEATURE_TENDENCY.VARIABLE,
        'Reported variably, and commonly better than repetition. A model that abolished all writing '
        + 'here would be overstating it.',
        '報告は一定せず、復唱より良いことが多い。ここで書字を一律に失わせるモデルは言い過ぎです。'),
    ]),
    notEvaluatedHere: Object.freeze([
      'phonemic paraphasia and conduite d’approche, which are how it is recognised',
      'auditory-verbal short-term memory, which one account makes the primary deficit',
      'whether a single bundle was cut: the syndrome is reported with cortical lesions too, so reducing '
      + 'it to one tract is a simplification this model makes deliberately',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '音韻性錯語と接近行為（これで見分ける特徴です）',
      '聴覚的言語性短期記憶（これを一次的な障害とする説明があります）',
      '1 本の束が切れたかどうか。この症候は皮質病変でも報告されるので、1 本の線維に還元するのは'
      + '本モデルが意図的に行っている単純化です',
    ]),
  },
  {
    id: 'global',
    name: 'Global aphasia',
    nameJa: '全失語',
    gist: 'All modalities affected together.',
    gistJa: 'すべてのモダリティが同時に障害されます。',
    features: Object.freeze([
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('reading-comprehension', 'Reading comprehension', '読解', FEATURE_TENDENCY.VARIABLE,
        'Commonly affected. This model computes reading by a ventral route that a perisylvian lesion '
        + 'need not touch, so a high reading value there is a statement about the declared route.',
        'ふつう障害されます。本モデルはシルビウス裂周囲の病変が触れなくてもよい腹側経路で読解を'
        + '計算するので、そこで読解の値が高いのは「宣言した経路について」の記述です。'),
    ]),
    notEvaluatedHere: Object.freeze([
      'severity, and recovery — global aphasia commonly evolves, and nothing here has time in it',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '重症度と回復（全失語はふつう経過とともに変化しますが、本モデルに時間はありません）',
    ]),
  },
  {
    id: 'transcortical-motor',
    name: 'Transcortical motor aphasia',
    nameJa: '超皮質性運動失語',
    gist: 'Sparse self-initiated output with repetition strikingly preserved.',
    gistJa: '自発話が乏しい一方、復唱が際立って保たれます。',
    features: Object.freeze([
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.RELATIVELY_SPARED,
        'Strikingly preserved, and the feature the syndrome turns on.',
        '際立って保たれ、この症候の要になる特徴です。'),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.CHARACTERISTIC,
        'Sparse, with reduced initiation.', '乏しく、起動が低下します。'),
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.RELATIVELY_SPARED, '', ''),
      feature('naming', 'Naming', '呼称', FEATURE_TENDENCY.VARIABLE,
        'Variably affected. This model leaves it available, which is an artefact of its routes rather '
        + 'than a claim.',
        '変動性に障害されます。本モデルは保たれるままにしていますが、これは経路の作りの帰結であって主張ではありません。'),
    ]),
    notEvaluatedHere: Object.freeze([
      'the distinction between reduced initiation and reduced motivation',
      'whether a border-zone infarct occurred at all: this model has no perfusion and no vascular '
      + 'territory, and the preset is a set of structures chosen for teaching',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '起動の低下と意欲の低下の区別',
      '分水嶺梗塞が起きたかどうか。本モデルは灌流も血管支配領域も持たず、プリセットは'
      + '教材として選んだ構造の集合です',
    ]),
  },
  {
    id: 'transcortical-sensory',
    name: 'Transcortical sensory aphasia',
    nameJa: '超皮質性感覚失語',
    gist: 'Comprehension affected with repetition preserved.',
    gistJa: '理解が障害される一方、復唱が保たれます。',
    features: Object.freeze([
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.RELATIVELY_SPARED,
        'Preserved, sometimes with echolalia.', '保たれ、反響言語を伴うことがあります。'),
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.VARIABLE,
        'Fluent, with semantic paraphasia.', '流暢ですが、意味性錯語を伴います。'),
      feature('naming', 'Naming', '呼称', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
    ]),
    notEvaluatedHere: Object.freeze([
      'echolalia, and semantic paraphasia',
      'the severity, which is reported as varying widely and changing over the first weeks',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '反響言語、意味性錯語',
      '重症度（幅が大きく、発症後数週で変化すると報告されています）',
    ]),
  },
  {
    id: 'mixed-transcortical',
    name: 'Mixed transcortical aphasia',
    nameJa: '混合型超皮質性失語',
    gist: 'Comprehension and output both affected, repetition preserved.',
    gistJa: '理解と発話がともに障害され、復唱は保たれます。',
    features: Object.freeze([
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.RELATIVELY_SPARED, '', ''),
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
    ]),
    notEvaluatedHere: Object.freeze([
      'the rarity of it, and that it is described in more than one lesion pattern — losing both border '
      + 'zones is not the only way it is reported',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '稀であること、および複数の病変パターンで記載されること（前後の分水嶺を同時に失うのが'
      + '唯一の成立条件ではありません）',
    ]),
  },
  {
    id: 'anomic',
    name: 'Anomic aphasia',
    nameJa: '健忘失語',
    gist: 'Word-finding affected with the rest of language relatively spared.',
    gistJa: '語想起が障害される一方、他の言語機能は相対的に保たれます。',
    features: Object.freeze([
      feature('naming', 'Naming', '呼称', FEATURE_TENDENCY.CHARACTERISTIC, '', ''),
      feature('repetition', 'Repetition', '復唱', FEATURE_TENDENCY.RELATIVELY_SPARED, '', ''),
      feature('auditory-comprehension', 'Auditory comprehension', '聴覚的理解', FEATURE_TENDENCY.RELATIVELY_SPARED, '', ''),
      feature('spoken-output', 'Spoken output', '発話', FEATURE_TENDENCY.VARIABLE,
        'Fluent, with pauses and circumlocution.', '流暢ですが、間や迂言を伴います。'),
    ]),
    notEvaluatedHere: Object.freeze([
      'circumlocution and the tip-of-the-tongue quality of it',
      'the localisation: it is the least localising of the aphasias, and is reported after lesions in '
      + 'many places and as the end state of recovery from others',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '迂言、喉まで出かかる感じ',
      '局在。失語のなかで最も局在性に乏しく、多くの部位の病変で、また他の失語の回復後の状態として'
      + '報告されます',
    ]),
  },
]);

/**
 * Pictures that are **described as not being aphasia**, kept here for the same
 * reason and with the same status: reference reading, never an output.
 *
 * The model will not tell a reader that a picture is one of these. Doing so was
 * the single worst thing the old classifier did, because ruling out a language
 * disorder needs an examination this model does not perform.
 */
export const APHASIA_MIMICS = Object.freeze([
  {
    id: 'pure-word-deafness',
    name: 'Pure word deafness',
    nameJa: '純粋語聾',
    gist: 'Speech cannot be understood or repeated; reading, writing and spontaneous speech are described as normal.',
    gistJa: '話し言葉が理解も復唱もできず、読み書きと自発話は正常と記載されます。',
    whyNotAphasia: 'The way in from one sense is lost, not language: the same words on a page are understood.',
    whyNotAphasiaJa: '失われるのは 1 つの感覚からの入口であって言語ではありません。同じ語が紙の上では理解できます。',
    notEvaluatedHere: Object.freeze([
      'hearing, and the recognition of non-speech sounds — with neither, this model cannot separate it '
      + 'from cortical deafness, and must not be read as doing so',
      'that it is reported after unilateral left temporal damage as well as bilateral, and is attributed '
      + 'to disconnection of the posterior temporal cortex from both auditory cortices rather than to '
      + 'destruction of both',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '聴力と環境音の認知。そのどちらも持たないので、本モデルは皮質聾と区別できません（していると読まないでください）',
      '両側病変だけでなく**片側（左）側頭葉**の損傷でも報告され、両側聴覚野の破壊ではなく'
      + '後部側頭皮質と両側聴覚野との離断に帰されていること',
    ]),
  },
  {
    id: 'apraxia-of-speech',
    name: 'Apraxia of speech',
    nameJa: '発語失行',
    gist: 'Speech will not come out in the right shape; the same sentence can be written.',
    gistJa: '発話が正しい形にならない一方、同じ文を書くことはできます。',
    whyNotAphasia: 'The way out through one channel is affected, not the language behind it.',
    whyNotAphasiaJa: '障害されるのは 1 つの出力チャネルであって、その背後の言語ではありません。',
    notEvaluatedHere: Object.freeze([
      'the quality of the articulation, which is the whole of the diagnosis',
      'its localisation. The anterior insula was proposed from lesion overlap; a later series using '
      + 'acute imaging and perfusion found no association with insular damage and associated it with '
      + 'the posterior inferior frontal gyrus instead. This model has one undivided insula mesh and '
      + 'cannot take a position on it.',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '構音の質（診断のすべてがそこにあります）',
      '局在。前部島は病変重複から提唱されましたが、急性期画像と灌流を用いた後の研究では'
      + '島の損傷との関連が見られず、代わりに下前頭回後部と関連づけられています。'
      + '本モデルは分割されていない島のメッシュを 1 つしか持たず、この点について立場を取れません。',
    ]),
  },
  {
    id: 'alexia-without-agraphia',
    name: 'Alexia without agraphia',
    nameJa: '純粋失読（失書を伴わない失読）',
    gist: 'Written words cannot be read; the same words can be written and understood when heard.',
    gistJa: '書かれた語が読めない一方、同じ語を書くことはでき、聞けば理解できます。',
    whyNotAphasia: 'One way in is cut off from language, which is intact behind it.',
    whyNotAphasiaJa: '1 つの入口が言語から切り離されているだけで、その背後の言語は保たれています。',
    notEvaluatedHere: Object.freeze([
      'the splenium: this atlas has one undivided corpus callosum, so the classical posterior callosal '
      + 'lesion cannot be drawn and the preset takes the whole commissure',
      'whether object naming is spared, which in the classical description separates it from a wider '
      + 'visual disorder. Letter and object form share one mesh here.',
    ]),
    notEvaluatedHereJa: Object.freeze([
      '脳梁膨大部。このアトラスは分割されていない脳梁を 1 つしか持たないので、古典的な'
      + '脳梁後方の病変は描けず、プリセットは交連全体を取ります',
      '物品呼称が保たれるかどうか（古典的記載ではこれがより広い視覚障害との区別点です）。'
      + 'ここでは文字と物体の形態が 1 つのメッシュを共有しています。',
    ]),
  },
]);

/** What a tendency means, for a feature that carries no sentence of its own. */
const TENDENCY_TEXT = Object.freeze({
  [FEATURE_TENDENCY.CHARACTERISTIC]: Object.freeze({
    text: 'Characteristically affected.', textJa: '特徴的に障害されます。',
  }),
  [FEATURE_TENDENCY.RELATIVELY_SPARED]: Object.freeze({
    text: 'Relatively spared, compared with the rest of the picture.',
    textJa: '像全体と比べて相対的に保たれます。',
  }),
  [FEATURE_TENDENCY.VARIABLE]: Object.freeze({
    text: 'Reported both ways; varies with lesion, stimulus or time.',
    textJa: '両方向に報告があり、病変・刺激・時期で変わります。',
  }),
  [FEATURE_TENDENCY.NOT_EVALUATED]: Object.freeze({
    text: 'This model has no value for it at all.', textJa: 'このモデルはこれについて値を持ちません。',
  }),
});

/**
 * The same entries in the shape a reference panel renders.
 *
 * A view adapter, and nothing more: it reorders and renames fields and adds no
 * claim. It lives here rather than in the panel so that the panel stays a
 * component that renders whatever a scene hands it, and so that the one place
 * that decides *what a reader is shown* is the same file the entries are
 * written in.
 *
 * The tone of a feature comes from {@link FEATURE_TENDENCY} and is a grouping,
 * not a verdict: the sentence beside it is what carries the claim.
 */
export const APHASIA_LIBRARY = Object.freeze({
  title: 'Classical syndromes, for comparison',
  titleJa: '古典的な症候（比較のための参照）',
  intro: 'This model computes route availability and stops. These are the pictures the names describe, '
    + 'next to what the model does not evaluate about each one. Nothing here is matched against the '
    + 'current result, scored or ranked — several may fit, and none may.',
  introJa: 'このモデルが計算するのは経路の利用可能性までです。ここにあるのは各症候名が指す像と、'
    + 'そのうち**このモデルが評価していないもの**です。現在の結果との照合・点数付け・順位付けは'
    + '行いません——複数当てはまることも、どれも当てはまらないこともあります。',
  groups: Object.freeze([
    Object.freeze({
      id: 'aphasias',
      title: 'Aphasia syndromes',
      titleJa: '失語の症候',
      note: 'Each feature says what is typically described and how much it varies. A fixed symbol per '
        + 'cell would be a necessary-condition table, and these are not that.',
      noteJa: '各項目は「典型的にどう記載されるか」と「どれだけ揺れるか」を述べます。'
        + '記号 1 つで埋める表は必要条件の表になりますが、これらはそういうものではありません。',
      entries: Object.freeze(APHASIA_REFERENCE.map((entry) => Object.freeze({
        id: entry.id,
        name: entry.name,
        nameJa: entry.nameJa,
        gist: entry.gist,
        gistJa: entry.gistJa,
        lines: Object.freeze(entry.features.map((item) => Object.freeze({
          label: item.label,
          labelJa: item.labelJa,
          tone: item.tendency,
          text: item.note || TENDENCY_TEXT[item.tendency].text,
          textJa: item.noteJa || TENDENCY_TEXT[item.tendency].textJa,
        }))),
        notEvaluated: Object.freeze(entry.notEvaluatedHere.map((text, index) => Object.freeze({
          text, textJa: entry.notEvaluatedHereJa[index],
        }))),
      }))),
    }),
    Object.freeze({
      id: 'mimics',
      title: 'Described as not aphasia',
      titleJa: '「失語ではない」とされる像',
      note: 'Ruling a language disorder out is a stronger claim than naming one, and it needs an '
        + 'examination this model does not perform. These are here to be read, not to be concluded.',
      noteJa: '言語障害を**否定する**ことは、名前を付けることより強い主張で、'
        + 'このモデルが行わない診察を要します。読むために置いてあり、結論するためではありません。',
      entries: Object.freeze(APHASIA_MIMICS.map((entry) => Object.freeze({
        id: entry.id,
        name: entry.name,
        nameJa: entry.nameJa,
        gist: entry.gist,
        gistJa: entry.gistJa,
        lines: Object.freeze([Object.freeze({
          label: 'Why it is described as not aphasia',
          labelJa: '失語ではないとされる理由',
          tone: FEATURE_TENDENCY.VARIABLE,
          text: entry.whyNotAphasia,
          textJa: entry.whyNotAphasiaJa,
        })]),
        notEvaluated: Object.freeze(entry.notEvaluatedHere.map((text, index) => Object.freeze({
          text, textJa: entry.notEvaluatedHereJa[index],
        }))),
      }))),
    }),
  ]),
});
