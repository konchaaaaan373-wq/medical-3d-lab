/**
 * Everything the hip osteoarthritis scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from
 * [`src/models/hipOsteoarthritis.js`](../models/hipOsteoarthritis.js) at the
 * moment they see it.
 */

export const PALETTE = {
  bone: '#e0d3b0',
  head: '#e2b06a',
  socket: '#c78f5e',
  space: '#4ec3d6',
  narrowed: '#ff2e4e',
  widened: '#8a63e8',
  labrum: '#c9a3d8',
};

export const LEGEND = [
  { key: 'space', label: 'The space between the two bones', labelJa: '2 つの骨のあいだの空間' },
  { key: 'narrowed', label: 'Where it has closed', labelJa: '閉じてしまった側', activeFrom: 0.12 },
  { key: 'widened', label: 'Where it looks wider than it was', labelJa: '元より広く見える側', activeFrom: 0.3 },
  { key: 'head', label: 'The ball', labelJa: '大腿骨頭' },
];

/** The axis is **how much of the layer is gone where it is thinnest**. */
export const STAGES = [
  {
    id: 'shared',
    name: 'One centre, shared',
    nameJa: '共有された 1 つの中心',
    at: 0,
    focus: ['space', 'head'],
    summary:
      'The centre of the ball and the centre of the socket are the same point. The space between the two bones is the same all the way round.',
    summaryJa:
      '骨頭の中心と臼蓋の中心は同じ点です。2 つの骨のあいだの空間は、全周で同じ厚さです。',
  },
  {
    id: 'parting',
    name: 'The two centres come apart',
    nameJa: '2 つの中心が離れていく',
    at: 0.55,
    focus: ['space'],
    summary:
      'The layer goes in one direction, so the ball settles that way. The space closes where it went — and on the far side it looks wider than it was.',
    summaryJa:
      '層は一方向で失われるため、骨頭はその方向へ沈み込みます。失われた側では空間が閉じ、反対側では元より広く見えます。',
  },
  {
    id: 'closed',
    name: 'Closed on one side, open on the other',
    nameJa: '片側は閉じ、反対側は開いて見える',
    at: 1,
    focus: ['space', 'head'],
    summary:
      'A ball in a socket does not narrow all round. It narrows in a direction, and which direction that is is the thing worth reading.',
    summaryJa:
      '臼蓋にはまった球は、全周で狭くなるのではありません。狭くなるのは 1 つの方向であり、どの方向かこそが読み取るべきものです。',
  },
];

export const RANGE = { start: 'Intact', startJa: '保たれている', end: 'Closed', endJa: '消失' };
export const PROGRESS_LABEL = {
  label: 'How much of the layer is gone where it is thinnest',
  labelJa: '最も薄い方向で層がどれだけ失われたか',
};

export const ANNOTATIONS = [
  { id: 'space', text: 'The space between the bones', sub: '骨のあいだの空間', anchor: 'space', range: [0, 1], compact: false },
  { id: 'head', text: 'The ball', sub: '大腿骨頭', anchor: 'head', range: [0, 1], compact: false },
  { id: 'socket', text: 'The socket', sub: '臼蓋', anchor: 'socket', range: [0, 1], compact: false },
  { id: 'opposite', text: 'The side it moved away from', sub: '骨頭が離れていった側', anchor: 'opposite', range: [0.3, 1], compact: false },
];

export const METRICS = [
  { id: 'narrowest', label: 'Where the space has closed most', labelJa: '空間が最も狭くなっている方向', unit: '', emphasis: true },
  { id: 'atNarrowest', label: 'What is left of the space there, against this model’s own drawn layer', labelJa: 'その方向に残る空間（このモデルの描画層に対する比）', unit: '%', emphasis: true },
  { id: 'atWidest', label: 'And in the direction it has most space', labelJa: '最も空間が広い方向では', unit: '%' },
  { id: 'offset', label: 'How far the two centres have come apart, against the layer’s own thickness', labelJa: '2 つの中心が離れた距離（層の厚みに対する比）', unit: '%' },
  { id: 'shape', label: 'Which picture this is', labelJa: 'どちらの像か', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'direction',
    kind: 'choice',
    label: 'Which way the layer goes',
    labelJa: 'どの方向で層が失われるか',
    options: [
      { value: 'none', label: 'Nowhere', labelJa: '失われない', effect: 'The space is the same all the way round.', effectJa: '空間は全周で同じ厚さです。' },
      {
        value: 'superolateral',
        label: 'Up and out',
        labelJa: '上外側',
        effect: 'The commonest of the described patterns. The ball settles up and out, and the floor of the socket looks wide.',
        effectJa: '記載されている型の中で最も多いものです。骨頭は上外側へ沈み、臼蓋の底側は広く見えます。',
      },
      {
        value: 'superior',
        label: 'Straight up',
        labelJa: '上方',
        effect: 'The ball settles straight up under the roof of the socket.',
        effectJa: '骨頭は臼蓋の天蓋の直下へ沈みます。',
      },
      {
        value: 'medial',
        label: 'Into the floor of the socket',
        labelJa: '臼蓋の底へ',
        effect: 'The ball settles inward, and the roof is where the space looks wide.',
        effectJa: '骨頭は内側へ沈み、天蓋側の空間が広く見えます。',
      },
      {
        value: 'concentric',
        label: 'Evenly, all round',
        labelJa: '全周で均等に',
        effect: 'With nowhere thinner than anywhere else the ball cannot settle. The space closes all round and the centres stay shared.',
        effectJa: 'どこも同じ厚さであれば骨頭は沈む先を持ちません。空間は全周で狭くなり、中心は共有されたままです。',
      },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Which way, or no way',
  labelJa: 'どの方向か、あるいは方向なしか',
  hint: 'Four described patterns. The one with no direction in it is not a milder version of the others.',
  hintJa: '記載されている 4 つの型です。方向を持たない型は、他の型の軽いものではありません。',
};

export const MODEL_SCOPE = {
  question:
    'When a hip loses its articular layer, what does a ball in a socket do that a knee does not?',
  questionJa:
    '股関節が関節面の層を失うとき、臼蓋にはまった球は膝と何が違うのか。',
  answers: [
    {
      text: 'That the centre of the ball and the centre of the socket are the same point to begin with, and that osteoarthritis here is what happens when they stop being.',
      textJa:
        '骨頭の中心と臼蓋の中心は、はじめ同じ点であること。そして股関節の変形性関節症とは、それが同じでなくなることであること。',
    },
    {
      text: 'That the layer goes in a direction rather than in a compartment, so the ball settles that way and the two centres come apart by what has gone.',
      textJa:
        '層は「区画」ではなく「方向」で失われるため、骨頭はその方向へ沈み、2 つの中心は失われた分だけ離れること。',
    },
    {
      text: 'That on the far side the space then looks wider than it was, because the ball has moved away from a wall whose own layer is still there.',
      textJa:
        'その結果、反対側の空間は元より広く見えること。骨頭が、層の残っている壁から離れていったためです。',
    },
    {
      text: 'That the pattern with no direction in it — the layer going evenly — leaves the centres shared and the space closing all round, which is a different picture rather than a milder one.',
      textJa:
        '方向を持たない型——層が全周で均等に失われる場合——では中心は共有されたまま、空間が全周で狭くなること。これは軽い型ではなく、別の像です。',
    },
  ],
  excludes: [
    {
      text: '**Pain of every kind**, stiffness, limp, range and what a person can do. None of it is in the model, and nothing here makes any of it follow from how much layer is left.',
      textJa:
        '**あらゆる痛み**・こわばり・跛行・可動域・できること。いずれもモデルには含まれず、残っている層の量からそれらが導かれることもありません。',
    },
    {
      text: 'Time, progression and cause. The axis is how much is gone, not how long it took or why.',
      textJa: '時間・進行・原因。軸は「どれだけ失われたか」であって、経過時間でも理由でもありません。',
    },
    {
      text: '**All loading.** No weight, no alignment, no gait — so the loop by which where the ball sits changes what it loads is left open rather than represented.',
      textJa:
        '**荷重のすべて。** 体重も配列も歩行もないため、「骨頭の位置が荷重の場所を変える」というループは表現されず、開いたままです。',
    },
    {
      text: 'Cysts, sclerosis, osteophytes, dysplasia, impingement, avascular necrosis, every grading system and every treatment.',
      textJa: '嚢胞・骨硬化・骨棘・臼蓋形成不全・インピンジメント・大腿骨頭壊死、あらゆる分類と、あらゆる治療。',
    },
  ],
  cautions: [
    {
      text: '**What is reported is a fraction of a layer this repository drew, and it is not a joint space width.** Joint space width is millimetres between two bone surfaces on a weight-bearing radiograph, measured by somebody in a direction they chose. Nothing here is measured, nothing bears weight, and nothing is millimetres.',
      textJa:
        '**示しているのはこのリポジトリが描いた層に対する割合であり、関節裂隙幅ではありません。** 関節裂隙幅は荷重位 X 線で、誰かが選んだ方向について 2 つの骨面の間を mm で測ったものです。ここにあるものは実測でも荷重下でも mm でもありません。',
    },
    {
      text: 'The space is drawn as a ring of its own, and the atlas’s even layer is hidden while it is shown. An even layer is the one thing this scene is about not being true, and two of them on screen at once would say otherwise.',
      textJa:
        '空間は独立した環として描き、それを表示しているあいだアトラスの均等な層は隠しています。「層が均等である」ことこそこのシーンが否定している点であり、両方を同時に出せば逆のことを言ってしまいます。',
    },
    {
      text: 'Four patterns for something that is a continuum of directions, and the ring is drawn in one plane. A hip is not a disc.',
      textJa:
        '方向の連続体に対して 4 つの型を置いています。また環は 1 つの平面内に描いています。股関節は円盤ではありません。',
    },
    {
      text: 'The joint is drawn at one position and nothing in this scene moves. Where the ball sits is where the model says it settles, which is not the same as a hip doing it.',
      textJa:
        '関節は 1 肢位で描かれ、このシーンで動くものはありません。骨頭の位置はモデルが「そこへ沈む」とした位置であり、実際の股関節がそうすることとは別です。',
    },
  ],
  sources: [
    {
      text: 'Standard hip anatomy for a spherical head concentric with its socket, and standard descriptions of the patterns of joint space narrowing — superolateral, superior, medial and concentric — in hip osteoarthritis.',
      textJa:
        '標準的な股関節解剖から、臼蓋と同心の球状骨頭を、また股関節症における関節裂隙狭小化の型（上外側・上方・内側・全周性）についての標準的記載を用いています。',
      kind: 'textbook',
    },
    {
      text: 'Solid geometry for the rest: a sphere that settles against one side of a shell is no longer concentric with it, and the clearance on the far side goes up by what it moved.',
      textJa:
        '残りは立体幾何です。殻の片側に寄った球はもはや同心ではなく、反対側の隙間は移動した分だけ増えます。',
      kind: 'physics',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/hip-osteoarthritis.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'hip-anatomy',
      label: 'The same hip, named',
      labelJa: '同じ股関節を、名前で',
      why: 'The socket, the ball in it, the rim and the ligaments, as structures you can point at — with the layer intact all round.',
      whyJa: '臼蓋・そこにはまる骨頭・辺縁・靱帯を、名前で指せる構造として示します。層は全周で保たれています。',
    },
    {
      slug: 'knee-osteoarthritis',
      label: 'The same disease in a joint with compartments',
      labelJa: '区画を持つ関節での同じ病態',
      why: 'A knee loses a compartment. A hip loses a direction. Seeing both is what makes either of them a shape rather than a word.',
      whyJa: '膝は区画を失い、股関節は方向を失います。両方を見ることが、どちらをも「言葉」ではなく「形」にします。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-space-itself',
    target: 'the space between the two bones',
    channel: 'geometry',
    from: 'gapAt',
    reading: 'illustrative',
    claim:
      'The space is drawn as a ring of segments round the socket, each as thick as the model says the space is in that direction and coloured by how much of it is left.',
    claimJa:
      '空間は臼蓋を巡る分割された環として描かれます。各区画の厚みはその方向の空間の厚みで、色は残っている割合を表します。',
    notClaim:
      'The ring is drawn over the bone rather than inside it, because it is the model’s answer laid over the joint rather than a structure competing for depth with two surfaces wrapped round it. **Each thickness is a fraction of a layer this repository drew and is not a joint space width**, which is millimetres on a weight-bearing radiograph in a direction somebody chose. The ring is drawn in one plane, and a hip is not a disc.',
    notClaimJa:
      '**各区画の厚みはこのリポジトリが描いた層に対する割合であって、関節裂隙幅ではありません。** それは荷重位 X 線で、誰かが選んだ方向について mm で測るものです。環は 1 つの平面内に描かれており、股関節は円盤ではありません。',
  },
  {
    id: 'centres-apart',
    target: 'the ball',
    channel: 'position',
    from: 'offset',
    reading: 'illustrative',
    claim:
      'The ball and everything below it are moved along the direction the layer went, by exactly what has gone there — so the two centres come apart on screen by what the model says.',
    claimJa:
      '骨頭とその下の構造は、層が失われた方向へ、そこで失われた分だけ移動します。画面上で 2 つの中心は、モデルが示すとおりに離れます。',
    notClaim:
      'It is a fraction of a drawn layer, so the distance on screen is not a migration anybody measured. Nothing in this model loads the joint, and nothing says a hip arrives here or how.',
    notClaimJa:
      '描かれた層に対する割合であり、画面上の距離は誰かが測定した移動量ではありません。このモデルは関節に荷重をかけておらず、股関節がどのようにここへ至るかも述べていません。',
  },
  {
    id: 'apparent-widening',
    target: 'the far side of the ring',
    channel: 'colour',
    from: 'apparentWidening',
    reading: 'thresholded',
    claim: 'Segments where the space is wider than it began are drawn in a colour of their own, because that half of the picture is the one a reader does not expect.',
    claimJa: '空間が元より広くなった区画は別の色で描かれます。読み手が予期しないのは、この半分だからです。',
    notClaim:
      'It marks where the ball has moved away from. **It is not a claim that anything has grown or been added**, and the layer on that side is the layer that was always there.',
    notClaimJa:
      '示しているのは、骨頭が離れていった側です。**何かが増えた・加わったという主張ではなく、**その側の層は元からあったものです。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of hip osteoarthritis. It computes what is left of a drawn articular layer in each direction round one socket, and how far the two centres have come apart. It contains no pain, no loading, no time and no treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '股関節症についての教育用の幾何モデルです。1 つの臼蓋の各方向で、描かれた関節面の層がどれだけ残っているかと、2 つの中心がどれだけ離れたかを計算します。痛み・荷重・時間・治療のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'A direction, not a whole joint — a drawn layer, not a joint space width.';
export const DISCLAIMER_SHORT_JA = '関節全体ではなく 1 方向｜描かれた層であって関節裂隙幅ではありません。';
