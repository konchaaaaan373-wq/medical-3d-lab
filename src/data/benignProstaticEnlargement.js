/**
 * Everything the benign prostatic enlargement scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from
 * [`src/models/prostaticEnlargement.js`](../models/prostaticEnlargement.js) at
 * the moment they see it.
 */

export const PALETTE = {
  transition: '#d99a4e',
  central: '#9a7fc0',
  peripheral: '#c98f8f',
  stroma: '#d8cfb6',
  urethra: '#7fd8e6',
  neighbour: '#b0898c',
  // Deliberately not another warm tone: this marks the narrowed channel, and
  // the channel is seen *through* the transition zone, whose own colour is
  // orange. A narrowing drawn in orange on orange is a colour change nobody
  // can see.
  emphasis: '#ff4d9a',
};

export const LEGEND = [
  { key: 'transition', label: 'Transition zone', labelJa: '移行域' },
  { key: 'peripheral', label: 'Peripheral zone', labelJa: '末梢域' },
  { key: 'central', label: 'Central zone', labelJa: '中心域' },
  { key: 'urethra', label: 'The channel through it', labelJa: '前立腺部尿道' },
  { key: 'emphasis', label: 'Where the channel is narrowed', labelJa: '狭くなっている部分', activeFrom: 0.12 },
];

/**
 * The axis is **how much the transition zone has grown**, and nothing else.
 *
 * Not a severity and not a grade: this model has no symptom in it and no
 * threshold anywhere. The three stages are three arrangements of one gland, and
 * what makes them worth separating is the arithmetic between them — the zone
 * grows several times over while the gland grows by half.
 */
export const STAGES = [
  {
    id: 'normal',
    name: 'Four zones, at rest',
    nameJa: '4 つの領域（安静時）',
    at: 0,
    focus: ['transition', 'peripheral'],
    summary:
      'The peripheral zone is most of the glandular tissue and lies on the outside, against the rectum. The transition zone is a small thing wrapped round the channel through the gland.',
    summaryJa:
      '末梢域は腺組織の大半を占め、直腸側の外側にあります。移行域は小さく、腺を貫く尿道を取り巻いています。',
  },
  {
    id: 'inner-gland',
    name: 'The inner gland grows',
    nameJa: '内腺が大きくなる',
    at: 0.45,
    focus: ['transition', 'urethra'],
    summary:
      'The transition zone is several times what it was. The gland as a whole is about half as big again — because nothing has been added to the peripheral zone, which is being pushed outward instead.',
    summaryJa:
      '移行域は数倍になっています。腺全体は 1.5 倍程度にしかなりません。末梢域には何も加わっておらず、外へ押しやられているだけだからです。',
  },
  {
    id: 'rim',
    name: 'The outside becomes a rim',
    nameJa: '外側が縁になる',
    at: 1,
    focus: ['peripheral', 'urethra'],
    summary:
      'The inner gland is now most of the organ and the peripheral zone is a compressed rim around it — thinner than it was, with nothing taken out of it. The channel through the middle is narrowed along its length.',
    summaryJa:
      '内腺が臓器の大半を占め、末梢域はその周りの圧排された縁になります。何も失われていないのに薄くなっています。中央を貫く通り道は、その全長にわたって狭くなっています。',
  },
];

export const RANGE = { start: 'At rest', startJa: '安静時', end: 'Enlarged', endJa: '腫大' };
export const PROGRESS_LABEL = {
  label: 'How much the transition zone has grown',
  labelJa: '移行域がどれだけ大きくなったか',
};

export const ANNOTATIONS = [
  { id: 'transition', text: 'Transition zone', sub: '移行域', anchor: 'transition', range: [0, 1], compact: false },
  { id: 'peripheral', text: 'Peripheral zone', sub: '末梢域', anchor: 'peripheral', range: [0, 1], compact: false },
  { id: 'central', text: 'Central zone', sub: '中心域', anchor: 'central', range: [0, 1], compact: false },
  { id: 'urethra', text: 'The channel through it', sub: '前立腺部尿道', anchor: 'urethra', range: [0, 1], compact: false },
  { id: 'bladderNeck', text: 'Where it leaves the bladder', sub: '膀胱頸部', anchor: 'bladderNeck', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'transitionRatio', label: 'Transition zone, against its own resting size', labelJa: '移行域（安静時比）', unit: '×', emphasis: true },
  { id: 'glandRatio', label: 'The whole gland, against its own resting size', labelJa: '腺全体（安静時比）', unit: '×', emphasis: true },
  { id: 'rim', label: 'Peripheral rim thickness, against its own', labelJa: '末梢域の厚み（安静時比）', unit: '%' },
  { id: 'lumen', label: 'Channel through the gland, against this model’s own resting one', labelJa: '腺内の通り道（このモデルの安静時比）', unit: '%' },
  { id: 'neck', label: 'Channel at the bladder neck, against the same', labelJa: '膀胱頸部の通り道（同上）', unit: '%' },
  { id: 'shareTransition', label: 'Transition zone, as a share of the gland', labelJa: '移行域が腺に占める割合', unit: '%' },
  { id: 'sharePeripheral', label: 'Peripheral zone, as a share of the gland', labelJa: '末梢域が腺に占める割合', unit: '%' },
];

export const MODEL_CONTROLS = [
  {
    id: 'medianLobeShare',
    label: 'Median lobe rather than lateral lobes',
    labelJa: '側葉ではなく中葉として',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v === 0 ? 'lateral lobes' : `${Math.round(v * 100)}% at the neck`),
  },
  {
    id: 'transitionGrowth',
    label: 'Transition zone, against its resting size',
    labelJa: '移行域の大きさ（安静時比）',
    min: 1,
    max: 14,
    step: 0.25,
    format: (v) => `×${v.toFixed(2)}`,
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'The same tissue, in two arrangements',
  labelJa: '同じ量の組織を、2 通りの配置で',
  hint: 'Where the growth sits changes what it does. Neither arrangement is a severity.',
  hintJa: '大きくなった場所が違えば、起きることも違います。どちらも重症度ではありません。',
};

export const MODEL_SCOPE = {
  question:
    'When the prostate enlarges, which part of it is enlarging — and what does that do to the parts that are not?',
  questionJa:
    '前立腺が大きくなるとき、大きくなっているのはどの部分で、大きくなっていない部分には何が起きるのか。',
  answers: [
    {
      text: 'That the enlargement is of the transition zone, which is the small part wrapped round the channel — not of the gland uniformly.',
      textJa:
        '大きくなるのは、尿道を取り巻く小さな部分である移行域であって、腺全体が一様に大きくなるのではないこと。',
    },
    {
      text: 'That the gland as a whole therefore grows far less than that zone does: ten times the transition zone is under twice the gland.',
      textJa:
        'そのため腺全体の大きさは、その領域の増大に比べてはるかに小さくしか変わらないこと。移行域が 10 倍でも、腺全体は 2 倍未満です。',
    },
    {
      text: 'That the peripheral zone — most of the glandular tissue, and the part a rectal examination reaches — is displaced and compressed into a rim, with nothing taken out of it.',
      textJa:
        '腺組織の大半を占め、直腸診で触れるのが末梢域であること。そこは何も失われないまま、押しやられて縁のように圧排されること。',
    },
    {
      text: 'That where the growth sits changes what it does: tissue in the lateral lobes narrows the channel along its length, and a median lobe acts at the bladder neck instead.',
      textJa:
        '大きくなった場所によって結果が違うこと。側葉の組織は通り道をその全長にわたって狭め、中葉は代わりに膀胱頸部に作用します。',
    },
  ],
  excludes: [
    {
      text: 'Urine, flow rate, post-void residual, bladder wall and detrusor. There is no fluid in this model and nothing in it flows.',
      textJa:
        '尿・尿流率・残尿量・膀胱壁・排尿筋。このモデルに液体はなく、何も流れません。',
    },
    {
      text: 'Every symptom and every score. Nothing here is a symptom index, and no figure in it is a threshold for anything.',
      textJa:
        'すべての症状とスコア。ここにあるものは症状スコアではなく、いかなる値も何かの基準値ではありません。',
    },
    {
      text: 'Prostate-specific antigen, cancer, inflammation and infection. Cancer arises mostly in a different zone and is a different scene’s subject.',
      textJa:
        'PSA・癌・炎症・感染。癌の多くは別の領域から生じ、別のシーンの主題です。',
    },
    { text: 'Any treatment, and every consequence of one.', textJa: '治療とその結果。' },
    {
      text: 'Time. `growth` is how far into an enlarged gland the reader has gone, not how many years.',
      textJa: '時間経過。軸は「どこまで大きくなった状態か」であって、年数ではありません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The proportions are the anatomy atlas’s display proportions, which are themselves drawn so four zones can be told apart rather than to scale. No volume, no ratio and no fraction may be read off this model as a prostate volume.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 比率は解剖アトラスの表示上の比率であり、それ自体が「4 領域を見分けられるように」描いたものです。このモデルから前立腺容積を読み取らないでください。',
    },
    {
      text: '**The channel is reported as a fraction of this model’s own resting one, and is not a calibre.** This model has no tissue mechanics and cannot derive how a lumen deforms; how much it narrows per unit of growth is an assumed relation, stated as one.',
      textJa:
        '**通り道は「このモデルの安静時に対する割合」であって、径ではありません。** このモデルに組織力学はなく、内腔がどう変形するかを導けません。増大あたりの狭窄量は仮定した関係であり、そう明示しています。',
    },
    {
      text: 'Lateral lobes and a median lobe are two described arrangements, and which one a gland takes is not something a volume can tell you. The control is a shape, not a severity.',
      textJa:
        '側葉型と中葉型は記載されている 2 つの配置で、どちらになるかは容積からは分かりません。この操作子は形であって重症度ではありません。',
    },
    {
      text: 'The zones are drawn as surfaces of revolution and planes. Real boundaries are neither, and the peripheral zone is not a sphere with a hole in it.',
      textJa:
        '各領域は回転面と平面として描いています。実際の境界はそのどちらでもなく、末梢域は穴の開いた球でもありません。',
    },
  ],
  sources: [
    {
      text: 'McNeal’s zonal anatomy of the prostate for the four zones and their relations to the urethra and the ejaculatory ducts.',
      textJa: 'McNeal の前立腺領域解剖から、4 領域と、尿道・射精管との位置関係。',
      kind: 'textbook',
    },
    {
      text: 'Standard urological descriptions of benign prostatic hyperplasia as arising in the transition zone, with the peripheral zone compressed into a surgical capsule, and of lateral-lobe and median-lobe patterns.',
      textJa:
        '標準的な泌尿器科の記載から、前立腺肥大症が移行域から生じること、末梢域が外科的被膜として圧排されること、側葉型・中葉型があること。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/benign-prostatic-enlargement.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'prostate-anatomy',
      label: 'The same zones, named',
      labelJa: '同じ領域を、名前で',
      why: 'The four zones and what runs through them, as structures you can point at — nothing enlarged, nothing narrowed.',
      whyJa: '4 つの領域とそこを貫くものを、名前で指せる構造として示します。腫大も狭窄もありません。',
    },
    {
      slug: 'bladder-anatomy',
      label: 'What sits above it',
      labelJa: 'その上にあるもの',
      why: 'The bladder and its neck, which is where a median lobe acts — drawn as anatomy, with nothing flowing.',
      whyJa: '膀胱とその頸部です。中葉が作用するのはここですが、解剖として描かれており、流れは扱いません。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

/**
 * What the 3D does with the numbers, declared so it can be checked and quoted.
 *
 * Three layers and they are named apart, because this scene is the clearest
 * case of the distinction in the product: the **disease state** is that the
 * transition zone has grown; the **model output** is the arithmetic that
 * follows; and the **exaggeration** is what the drawing does on top so a
 * channel a few hundredths of a unit wide can be seen at all.
 */
export const VISUAL_MAPPING = [
  {
    id: 'inner-gland-growth',
    target: 'transition and central zones',
    channel: 'scale',
    from: 'innerRadiusRatio',
    reading: 'illustrative',
    claim: 'The inner gland is drawn at the radius ratio the model solves from the transition zone’s growth, with the central zone carried out on it.',
    claimJa: '内腺は、移行域の増大からモデルが解いた半径比のとおりに描かれ、中心域もそれに乗って動きます。',
    notClaim:
      'The proportions it grows from are the atlas’s display proportions, drawn so four zones can be told apart rather than to scale. No prostate volume may be read off this.',
    notClaimJa:
      '出発点の比率はアトラスの表示上の比率で、実寸比ではなく「4 領域を見分けられるように」描いたものです。ここから前立腺容積は読み取れません。',
  },
  {
    id: 'peripheral-rim',
    target: 'peripheral zone',
    channel: 'scale',
    from: 'outerRadiusRatio',
    reading: 'illustrative',
    claim:
      'The outside of the gland is drawn at the radius the model gets by conserving the peripheral zone’s tissue, so the rim thins without anything being removed from it.',
    claimJa:
      '腺の外面は、末梢域の組織量を保存してモデルが求めた半径で描かれます。何も取り除かれないまま縁が薄くなります。',
    notClaim: 'A thinning rim on screen is a displacement the model computed. It is not atrophy and it is not a measured thickness.',
    notClaimJa: '画面上で薄くなる縁は、モデルが計算した圧排です。萎縮ではなく、厚みの実測値でもありません。',
  },
  {
    id: 'channel-narrowing',
    target: 'prostatic urethra',
    channel: 'geometry',
    from: 'urethralLumenFraction',
    reading: 'illustrative',
    claim:
      'The channel narrows by the fraction the model reports, and narrows at the bladder neck instead when the growth is set as a median lobe.',
    claimJa:
      '通り道はモデルが報告する割合だけ狭くなり、中葉として設定した場合は代わりに膀胱頸部で狭くなります。',
    notClaim:
      'It is drawn several times wider than that fraction of the gland would be, so it can be seen at all. **The drawn calibre is not a urethral diameter, and this model has no flow, no flow rate and no residual volume in it.**',
    notClaimJa:
      '見えるようにするため、実際の割合よりかなり太く描いています。**描かれた太さは尿道径ではなく、このモデルに流れも尿流率も残尿量もありません。**',
  },
  {
    id: 'narrowed-marker',
    target: 'the narrowed length',
    channel: 'colour',
    from: null,
    reading: 'thresholded',
    claim: 'The part of the channel the model has narrowed is marked once the narrowing is more than nominal.',
    claimJa: 'モデルが狭めた区間は、狭窄が名目以上になった時点で色で示されます。',
    notClaim: 'It marks where this model put the narrowing. Nothing here located anything in anybody.',
    notClaimJa: 'これはモデルが狭窄を置いた場所を示すものです。誰かの体で何かを見つけたわけではありません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of prostatic zonal enlargement. It computes proportions of a schematic gland whose zone sizes are drawn to be distinguishable, not to scale. It contains no urine, no flow, no symptom, no score and no PSA, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '前立腺の領域別腫大に関する教育用の幾何モデルです。計算しているのは模式的な腺の比率であり、その領域の大きさは実寸比ではなく「見分けられるように」描かれています。尿・流れ・症状・スコア・PSA はいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Geometric zone model — no flow, no symptom score, not diagnosis.';
export const DISCLAIMER_SHORT_JA = '領域の幾何モデル｜流れも症状スコアもありません。診断には使用できません。';
