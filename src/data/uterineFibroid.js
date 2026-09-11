/**
 * Everything the uterine fibroid scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from [`src/models/uterineFibroid.js`](../models/uterineFibroid.js)
 * at the moment they see it.
 */

export const PALETTE = {
  wall: '#c07f95',
  fundus: '#d193a6',
  cervix: '#8f566c',
  cavity: '#e8b06a',
  cavityPressed: '#ff4a2e',
  fibroid: '#e6dcc4',
  neighbour: '#d9a0ad',
};

export const LEGEND = [
  { key: 'fibroid', label: 'The fibroid', labelJa: '筋腫' },
  { key: 'cavity', label: 'The cavity', labelJa: '子宮腔' },
  { key: 'wall', label: 'The wall it sits in', labelJa: '筋層' },
  { key: 'cavityPressed', label: 'Where the cavity is pressed into', labelJa: '子宮腔が押されている部分', activeFrom: 0.1 },
];

/**
 * The axis is **how big the fibroid is**, at whichever depth the reader chose.
 *
 * Where it sits lives on the model controls, because submucosal, intramural and
 * subserosal are three places and not three degrees. A fibroid does not travel
 * from one to the next, and an axis between them would say it does.
 */
export const STAGES = [
  {
    id: 'small',
    name: 'One fibroid, somewhere in the wall',
    nameJa: '筋層のどこかに、筋腫が 1 つ',
    at: 0,
    focus: ['fibroid', 'wall'],
    summary:
      'A fibroid is a lump of muscle growing inside the wall of the uterus. Where in the thickness of that wall it sits is chosen, not reached: it is not a stage.',
    summaryJa:
      '筋腫は子宮の壁の中で育つ筋肉の塊です。壁の厚みのどこに位置するかは「選ぶ」もので、順に到達する段階ではありません。',
  },
  {
    id: 'reaching',
    name: 'Big enough to reach past the wall',
    nameJa: '壁を越えて届く大きさ',
    at: 0.6,
    focus: ['fibroid', 'cavity'],
    summary:
      'A fibroid in the middle of the wall reaches neither boundary until it is about as wide as the wall is deep — and then it reaches both at once.',
    summaryJa:
      '壁の中央にある筋腫は、壁の厚みほどの大きさになるまでどちらの境界にも届きません。そして届くときは、両側に同時に届きます。',
  },
  {
    id: 'large',
    name: 'The same volume, three different pictures',
    nameJa: '同じ体積でも、3 通りの姿',
    at: 1,
    focus: ['fibroid', 'cavity'],
    summary:
      'At this size the uterus is the same volume wherever the fibroid sits. What differs is what it is against: the cavity, the outline, or both.',
    summaryJa:
      'この大きさでは、筋腫がどこにあっても子宮の体積は同じです。違うのは何に接しているか——子宮腔か、外形か、その両方か——です。',
  },
];

export const RANGE = { start: 'Small', startJa: '小さい', end: 'Large', endJa: '大きい' };
export const PROGRESS_LABEL = {
  label: 'How big the fibroid is',
  labelJa: '筋腫の大きさ',
};

export const ANNOTATIONS = [
  { id: 'fibroid', text: 'The fibroid', sub: '筋腫', anchor: 'fibroid', range: [0, 1], compact: false },
  { id: 'cavity', text: 'The cavity', sub: '子宮腔', anchor: 'cavity', range: [0, 1], compact: false },
  { id: 'wall', text: 'The wall', sub: '筋層', anchor: 'wall', range: [0, 1], compact: false },
  { id: 'serosa', text: 'The outer surface', sub: '漿膜（外表面）', anchor: 'serosa', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'uterineVolume', label: 'The uterus, against its own volume — the same at every location', labelJa: '子宮の体積（自身の安静時比）｜どの位置でも同じ', unit: '×', emphasis: true },
  { id: 'cavityContact', label: 'Share of the cavity the fibroid presses into', labelJa: '筋腫が押し込んでいる子宮腔の割合', unit: '%', emphasis: true },
  { id: 'bulge', label: 'How far it reaches past the outer surface, against the wall’s depth', labelJa: '外表面を越えて出ている量（壁の厚み比）', unit: '%' },
  { id: 'wall', label: 'Wall depth where it sits, against its depth elsewhere', labelJa: 'その位置での壁の厚み（他部位比）', unit: '×' },
  { id: 'reaches', label: 'What it reaches', labelJa: '何に届いているか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'location',
    kind: 'choice',
    label: 'Where in the wall it sits',
    labelJa: '壁のどこにあるか',
    options: [
      {
        value: 'none',
        label: 'No fibroid',
        labelJa: '筋腫なし',
        effect: 'The wall is one thickness all the way round and the cavity is untouched.',
        effectJa: '壁はどこも同じ厚みで、子宮腔にも何も接していません。',
      },
      {
        value: 'submucosal',
        label: 'Just under the cavity',
        labelJa: '子宮腔のすぐ下（粘膜下）',
        effect: 'It presses into the cavity from the smallest size upward, and never reaches the outer surface.',
        effectJa: '最も小さい段階から子宮腔を押し込み、外表面には届きません。',
      },
      {
        value: 'intramural',
        label: 'In the middle of the wall',
        labelJa: '壁の中央（筋層内）',
        effect: 'It reaches neither boundary until it is about as wide as the wall is deep, and then it reaches both.',
        effectJa: '壁の厚みほどの大きさになるまでどちらにも届かず、届くときは両側に同時です。',
      },
      {
        value: 'subserosal',
        label: 'Just under the outer surface',
        labelJa: '外表面のすぐ下（漿膜下）',
        effect: 'It pushes the outline outward from the smallest size upward, and never reaches the cavity.',
        effectJa: '最も小さい段階から外形を押し出し、子宮腔には届きません。',
      },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Three places in one wall',
  labelJa: '1 つの壁の、3 つの位置',
  hint: 'Three alternatives, not three degrees. A fibroid does not travel from one to the next.',
  hintJa: '3 つの選択肢であって 3 段階ではありません。筋腫が順に移動するわけではありません。',
};

export const MODEL_SCOPE = {
  question:
    'A fibroid of a given size — what does the depth in the wall at which it sits change?',
  questionJa:
    '同じ大きさの筋腫でも、壁のどの深さにあるかで何が変わるのか。',
  answers: [
    {
      text: 'That the uterus is the same volume wherever the fibroid sits, so a figure for how big the uterus has become says nothing about what the fibroid is against.',
      textJa:
        '筋腫がどこにあっても子宮の体積は同じであること。つまり「子宮がどれだけ大きくなったか」という数値は、筋腫が何に接しているかを何も語りません。',
    },
    {
      text: 'That one just under the cavity presses into it from the smallest size upward, and one just under the outer surface pushes the outline out and never touches the cavity.',
      textJa:
        '子宮腔のすぐ下にあるものは最小の段階から子宮腔を押し込み、外表面のすぐ下にあるものは外形を押し出して子宮腔には触れないこと。',
    },
    {
      text: 'That the middle of the wall is the one place that reaches nothing — until a size at which it reaches the cavity and the outer surface in the same moment.',
      textJa:
        '壁の中央は「どこにも届かない」唯一の位置であり、ある大きさを境に子宮腔と外表面へ同時に届くこと。',
    },
    {
      text: 'That the cavity is a flattened plane rather than a bag, so what presses into it is measured as a share of a surface.',
      textJa:
        '子宮腔は袋ではなく扁平な面であり、そこへの押し込みは「面のどれだけか」として測られること。',
    },
  ],
  excludes: [
    {
      text: 'Bleeding of every kind, pain, pressure symptoms, fertility and pregnancy. **Nothing in this model makes any of them follow from size**, and that they do not follow from size in any simple way is the reason the scene is about location.',
      textJa:
        'あらゆる出血・痛み・圧迫症状・妊孕性・妊娠。**このモデルはそれらが大きさから導かれるとはしません。** 単純に大きさで決まらないことこそ、このシーンが「位置」を主題にしている理由です。',
    },
    {
      text: 'Time and growth. The axis is how big it is, not how long it has been there, and nothing here says a fibroid grows, shrinks or stays.',
      textJa:
        '時間と増大。軸は「どれだけ大きいか」であって経過時間ではなく、筋腫が大きくなる・小さくなる・変わらないといったことは何も述べていません。',
    },
    {
      text: 'Hormones, degeneration, sarcoma and every distinction between one lump and another. There is no tissue in this model, only a shape in a wall.',
      textJa:
        'ホルモン・変性・肉腫、そして腫瘤どうしの鑑別。このモデルに組織はなく、壁の中の形があるだけです。',
    },
    { text: 'Every treatment, and every consequence of one.', textJa: '治療とその結果。' },
    {
      text: 'More than one fibroid. There is exactly one here, and most uteruses that have them have several.',
      textJa:
        '複数の筋腫。ここにあるのはちょうど 1 つですが、実際には複数あることのほうが多いものです。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The wall’s depth, the cavity’s area and the organ’s volume are measured off this repository’s uterine atlas, whose own proportions are drawn to be legible rather than to scale. No centimetre and no millilitre follows from any of it.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 壁の厚み・子宮腔の面積・臓器の体積は、このリポジトリの子宮アトラスから測ったものです。そのアトラス自体が実寸比ではなく「見分けられるように」描かれています。cm も mL も導けません。',
    },
    {
      text: '**The uterus is not redrawn around the fibroid.** What is drawn is where the fibroid sits and what it crosses; the wall it displaces keeps the shape the atlas gave it. The bulge you see is the fibroid itself reaching past the surface, not a deformed organ.',
      textJa:
        '**子宮は筋腫に合わせて描き直されていません。** 描かれているのは筋腫の位置と、それが何を越えているかです。押しのけられる壁はアトラスの形のままです。見えている膨らみは筋腫そのものであって、変形した臓器ではありません。',
    },
    {
      text: 'The three depths are this repository’s reading of three standard names. Real fibroids sit anywhere in the wall, including on a stalk, and the boundaries between the three names are not sharp.',
      textJa:
        '3 つの深さは、標準的な 3 つの名称に対するこのリポジトリの解釈です。実際の筋腫は有茎性のものも含め壁のどこにでもあり、3 者の境界は明確ではありません。',
    },
    {
      text: 'The uterus is drawn upright, as the anatomy atlas draws it. A uterus is normally tipped and bent forward, and “front” and “back” in this picture are the atlas’s.',
      textJa:
        '子宮は解剖アトラスに合わせて直立して描かれています。実際には前傾前屈しているのが通常で、この絵の「前」「後ろ」はアトラスのものです。',
    },
  ],
  sources: [
    {
      text: 'Standard gynaecological descriptions of leiomyoma location — submucosal, intramural and subserosal — and of the uterine cavity as a flattened triangular space.',
      textJa:
        '平滑筋腫の位置分類（粘膜下・筋層内・漿膜下）と、子宮腔が扁平な三角形の空間であることについての標準的な婦人科の記載。',
      kind: 'textbook',
    },
    {
      text: 'Solid geometry for the rest: a sphere crossing a plane makes a disc, and volume goes as the cube of the radius.',
      textJa: '残りは立体幾何です。球が平面を横切れば円板ができ、体積は半径の 3 乗に比例します。',
      kind: 'physics',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/uterine-fibroid.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'uterus-anatomy',
      label: 'The same uterus, named',
      labelJa: '同じ子宮を、名前で',
      why: 'Fundus, body, isthmus and cervix, and the cavity inside them — as structures you can point at, with nothing in the wall.',
      whyJa: '底部・体部・峡部・頸部と、その中の子宮腔を、名前で指せる構造として示します。壁の中には何もありません。',
    },
    {
      slug: 'uterine-cycle',
      label: 'What the lining does over a month',
      labelJa: '内膜が 1 か月で行うこと',
      why: 'The endometrium thickening and shedding, on a sectioned uterus. A separate model with no fibroid in it.',
      whyJa: '断面で見た子宮の内膜が厚くなり脱落する様子です。筋腫を含まない別のモデルです。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'fibroid-size',
    target: 'the fibroid',
    channel: 'scale',
    from: 'diameter',
    reading: 'illustrative',
    claim: 'The fibroid is drawn at the diameter the axis sets, in the atlas’s own units.',
    claimJa: '筋腫は、軸が定めた直径どおりに、アトラスと同じ単位で描かれます。',
    notClaim:
      'Those units are a uterus drawn to be legible rather than to scale, so **no centimetre follows from the size on screen**, and no figure here is a size at which anything is indicated.',
    notClaimJa:
      'その単位は実寸比ではなく「見分けられるように」描かれた子宮のものです。**画面上の大きさから cm は導けません。** ここにある値は、何かの適応となる大きさでもありません。',
  },
  {
    id: 'fibroid-depth',
    target: 'the fibroid',
    channel: 'position',
    from: 'centreDepth',
    reading: 'illustrative',
    claim: 'It is placed at the depth in the wall the chosen location gives it, measured from the cavity outward.',
    claimJa: '選んだ位置に応じた壁の深さへ、子宮腔側から測って配置されます。',
    notClaim:
      'The three depths are this repository’s reading of three standard names, and the boundaries between those names are not sharp. Real fibroids sit anywhere in the wall.',
    notClaimJa:
      '3 つの深さは標準的な 3 つの名称に対するこのリポジトリの解釈で、その境界は明確ではありません。実際の筋腫は壁のどこにでもあります。',
  },
  {
    id: 'wall-not-redrawn',
    target: 'the uterus around it',
    channel: 'geometry',
    from: null,
    reading: 'illustrative',
    claim:
      'The wall keeps the shape the atlas gave it. What is drawn is where the fibroid sits and what it crosses, so a fibroid reaching past the surface is seen as the fibroid itself standing beyond it.',
    claimJa:
      '壁はアトラスが与えた形のままです。描かれるのは筋腫の位置と、それが何を越えているかなので、外表面を越えた筋腫は「筋腫そのものが外に出ている」ものとして見えます。',
    notClaim:
      '**It is not a deformed organ.** This model has no tissue mechanics and does not work out how a uterus takes the shape of what is inside it.',
    notClaimJa:
      '**変形した臓器ではありません。** このモデルに組織力学はなく、子宮が中身に合わせてどう形を変えるかは扱いません。',
  },
  {
    id: 'cavity-pressed',
    target: 'the cavity',
    channel: 'colour',
    from: 'cavityContactFraction',
    reading: 'thresholded',
    claim: 'The cavity changes colour once the model says the fibroid is pressing into more than a touch of it.',
    claimJa: 'モデルが「触れている以上に押し込んでいる」と判定した時点で、子宮腔の色が変わります。',
    notClaim:
      'It marks a shape crossing a surface. **It is not bleeding, not a lesion seen on any scan, and not a symptom of any kind.**',
    notClaimJa:
      '示しているのは、形が面を横切っていることだけです。**出血でも、何らかの画像所見でも、症状でもありません。**',
  },
];

export const DISCLAIMER =
  'Educational geometric model of one uterine fibroid. It computes what a sphere at a chosen depth in a schematic uterine wall reaches, on an atlas drawn to be distinguishable rather than to scale. It contains no bleeding, no pain, no fertility, no time and no treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '子宮筋腫 1 つについての教育用の幾何モデルです。実寸比ではなく「見分けられるように」描かれたアトラス上で、選んだ深さに置いた球が何に届くかを計算します。出血・痛み・妊孕性・時間・治療のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Where it sits, and what it reaches — no bleeding, no symptom, not diagnosis.';
export const DISCLAIMER_SHORT_JA = 'どこにあり、何に届くか｜出血も症状もありません。診断には使用できません。';
