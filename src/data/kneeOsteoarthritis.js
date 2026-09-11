/**
 * Everything the knee osteoarthritis scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from
 * [`src/models/kneeOsteoarthritis.js`](../models/kneeOsteoarthritis.js) at the
 * moment they see it.
 */

export const PALETTE = {
  bone: '#e6e0cd',
  cartilage: '#cfe6ea',
  worn: '#b5773a',
  meniscus: '#dcd2b4',
  extruded: '#d2965e',
  osteophyte: '#f0e6c8',
  ligament: '#e8e0c8',
};

export const LEGEND = [
  { key: 'cartilage', label: 'The layer on each surface', labelJa: '関節面を覆う層' },
  { key: 'worn', label: 'Where it has been lost', labelJa: '失われた側', activeFrom: 0.12 },
  { key: 'meniscus', label: 'The meniscus', labelJa: '半月板' },
  { key: 'extruded', label: 'Pushed out from between the surfaces', labelJa: '関節面の間から押し出された部分', activeFrom: 0.3 },
  { key: 'osteophyte', label: 'New bone at the rim', labelJa: '辺縁の新生骨', activeFrom: 0.5 },
];

/**
 * The axis is **how much of the layer is gone**, in whichever compartment the
 * reader chose.
 *
 * How confined that is to one compartment lives on the model controls, because
 * confined loss and even loss are two pictures rather than two severities.
 */
export const STAGES = [
  {
    id: 'intact',
    name: 'Two surfaces that never touch',
    nameJa: '触れ合わない 2 つの面',
    at: 0,
    focus: ['cartilage', 'meniscus'],
    summary:
      'Each bone end carries a layer, and between them on each side sits a wedge of fibrocartilage. Nothing in a working knee is bone against bone.',
    summaryJa:
      'それぞれの骨端は層に覆われ、左右それぞれの側で、その間に線維軟骨の楔が挟まっています。機能している膝に「骨と骨が接する」場所はありません。',
  },
  {
    id: 'thinning',
    name: 'One side is losing it',
    nameJa: '片側が失われていく',
    at: 0.55,
    focus: ['cartilage'],
    summary:
      'The layer goes from one compartment while the other still has its own. The wedge on that side is being squeezed out from between two surfaces that are coming together.',
    summaryJa:
      '一方の区画から層が失われていく一方、もう一方はまだ保たれています。その側の楔は、近づいてくる 2 つの面の間から押し出されていきます。',
  },
  {
    id: 'gone',
    name: 'One compartment, not one joint',
    nameJa: '関節全体ではなく、1 つの区画',
    at: 1,
    focus: ['cartilage', 'osteophyte'],
    summary:
      'On that side the two surfaces are drawn touching and new bone has grown at the rim. On the other side the layer is where it was. This is the difference between a compartment and a joint.',
    summaryJa:
      'その側では 2 つの面が接して描かれ、辺縁に新生骨ができています。反対側の層は元のままです。これが「区画」と「関節」の違いです。',
  },
];

export const RANGE = { start: 'Intact', startJa: '保たれている', end: 'Gone', endJa: '失われた' };
export const PROGRESS_LABEL = {
  label: 'How much of the layer is gone',
  labelJa: '層がどれだけ失われたか',
};

export const ANNOTATIONS = [
  { id: 'cartilage', text: 'The layer on each surface', sub: '関節面を覆う層', anchor: 'cartilage', range: [0, 1], compact: false },
  { id: 'meniscus', text: 'The meniscus between them', sub: '半月板', anchor: 'meniscus', range: [0, 1], compact: false },
  { id: 'other', text: 'The other compartment', sub: 'もう一方の区画', anchor: 'other', range: [0, 1], compact: false },
  { id: 'osteophyte', text: 'New bone at the rim', sub: '辺縁の新生骨', anchor: 'osteophyte', range: [0.4, 1], compact: false },
];

export const METRICS = [
  { id: 'medial', label: 'Layer left on the medial side, against this model’s own drawn layer', labelJa: '内側に残る層（このモデルの描画層に対する比）', unit: '%', emphasis: true },
  { id: 'lateral', label: 'Layer left on the lateral side, against the same', labelJa: '外側に残る層（同上）', unit: '%', emphasis: true },
  { id: 'difference', label: 'How far apart the two sides are', labelJa: '左右の差', unit: 'pt' },
  { id: 'extrusion', label: 'Meniscus pushed out from between the surfaces, as a share of its own width', labelJa: '関節面の間から押し出された半月板（自身の幅に対する割合）', unit: '%' },
  { id: 'picture', label: 'Which picture this is', labelJa: 'どちらの像か', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'side',
    kind: 'choice',
    label: 'Which compartment carries it',
    labelJa: 'どちらの区画が担うか',
    options: [
      { value: 'none', label: 'Neither', labelJa: 'どちらでもない', effect: 'Both layers are intact.', effectJa: '両側の層が保たれています。' },
      {
        value: 'medial',
        label: 'The medial side',
        labelJa: '内側',
        effect: 'The inner half of the joint. This is the commoner of the two.',
        effectJa: '関節の内側半分です。2 つのうちではこちらのほうが多く見られます。',
      },
      {
        value: 'lateral',
        label: 'The lateral side',
        labelJa: '外側',
        effect: 'The outer half. The same picture, mirrored — and the meniscus there is a different shape.',
        effectJa: '外側半分です。同じ像の鏡像ですが、そこにある半月板は形が違います。',
      },
    ],
  },
  {
    id: 'confinement',
    label: 'How confined to that compartment the loss is',
    labelJa: 'その区画にどれだけ限局しているか',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v > 0.7 ? 'one compartment' : v > 0.3 ? 'mostly one side' : 'both sides evenly'),
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'A compartment, or a joint',
  labelJa: '区画なのか、関節なのか',
  hint: 'At the same amount lost, confined loss and even loss are two different pictures.',
  hintJa: '失われた量が同じでも、限局した消失と均等な消失は別の像です。',
};

export const MODEL_SCOPE = {
  question:
    'When a knee loses its articular layer, what does it change that "the cartilage wore out" does not say?',
  questionJa:
    '膝の関節面の層が失われるとき、「軟骨がすり減った」では言えていないことは何か。',
  answers: [
    {
      text: 'That it is usually one compartment of the joint and not the joint: one side loses its layer while the other still has its own.',
      textJa:
        '多くの場合それは関節そのものではなく「片方の区画」であること。一方が層を失う一方で、もう一方は保たれています。',
    },
    {
      text: 'That what follows goes with the side rather than with the joint — the meniscus on that side, the new bone at that rim.',
      textJa:
        'その後に起きることは関節全体ではなく「その側」に付いて回ること。その側の半月板、その側の辺縁の新生骨です。',
    },
    {
      text: 'That a wedge between two surfaces which are coming together has one way to go, so the meniscus on the worn side is pushed outward from between them.',
      textJa:
        '近づいてくる 2 つの面の間にある楔には行き場が 1 つしかないこと。そのため消耗側の半月板は、その間から外へ押し出されます。',
    },
    {
      text: 'That at the same amount lost, confined loss and even loss are two different pictures rather than two severities.',
      textJa:
        '失われた量が同じでも、限局した消失と均等な消失は 2 段階の重症度ではなく、2 つの別の像であること。',
    },
  ],
  excludes: [
    {
      text: '**Pain of every kind**, stiffness, function and what a person can do. None of it is in the model, and nothing here makes any of it follow from how much layer is left.',
      textJa:
        '**あらゆる痛み**・こわばり・機能・できることの範囲。いずれもモデルには含まれず、残っている層の量からそれらが導かれることもありません。',
    },
    {
      text: 'Time and progression. The axis is how much is gone, not how long it has taken, and nothing here says a knee moves along it.',
      textJa:
        '時間と進行。軸は「どれだけ失われたか」であって経過時間ではなく、膝がその軸上を進むとも述べていません。',
    },
    {
      text: '**The loop that matters most.** Uneven loss loads the worn side harder, which is thought to be part of why it continues. This model has no loading in it at all and does not close that loop.',
      textJa:
        '**最も重要なループ。** 不均等な消失は消耗側により大きな負荷をかけ、それが進行の一因と考えられています。このモデルに荷重は一切なく、そのループは閉じていません。',
    },
    {
      text: 'Inflammation, subchondral bone, synovium, effusion, crystals, every grading system and every treatment.',
      textJa: '炎症・軟骨下骨・滑膜・関節液貯留・結晶、あらゆる分類と、あらゆる治療。',
    },
  ],
  cautions: [
    {
      text: '**The layer here is not a joint space width.** Joint space width is measured between two bone surfaces on a weight-bearing radiograph in millimetres, and it includes the meniscus. What this model reports is a fraction of its own drawn layer. Nothing here is measured, nothing here bears weight, and nothing here is millimetres.',
      textJa:
        '**ここでいう層は、X 線の関節裂隙幅ではありません。** 関節裂隙幅は荷重位の X 線で 2 つの骨面の間を mm で測ったもので、半月板を含みます。このモデルが示すのは「自身が描いた層に対する割合」です。実測でも、荷重下でも、mm でもありません。',
    },
    {
      text: 'The joint is drawn in one position, in extension, and nothing in this scene moves. A knee’s compartments load differently through the range, and none of that is here.',
      textJa:
        '関節は伸展位の 1 肢位で描かれ、このシーンでは何も動きません。膝の区画は可動域の中で異なる荷重を受けますが、それは含まれていません。',
    },
    {
      text: 'New bone at the rim is drawn as a swelling of the margin. Where osteophytes grow, in what shape and in what order is not something this model contains.',
      textJa:
        '辺縁の新生骨は、縁の膨らみとして描いています。骨棘がどこに、どのような形で、どの順に生じるかは、このモデルには含まれていません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of knee osteoarthritis as predominantly compartmental, most often medial, with marginal osteophytes and meniscal extrusion on the affected side.',
      textJa:
        '膝 OA が主として区画性であり、多くは内側であること、患側に辺縁骨棘と半月板の逸脱を伴うことについての標準的な記載。',
      kind: 'textbook',
    },
    {
      text: 'Solid geometry for the extrusion: a wedge between two surfaces that are converging has one direction available to it.',
      textJa: '逸脱については立体幾何です。近づき合う 2 面の間の楔が動ける方向は 1 つしかありません。',
      kind: 'physics',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/knee-osteoarthritis.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'knee-anatomy',
      label: 'The same knee, named',
      labelJa: '同じ膝を、名前で',
      why: 'Condyles, plateaux, menisci and the four ligaments as structures you can point at, with both layers intact.',
      whyJa: '顆部・脛骨高原・半月板・4 本の靱帯を、名前で指せる構造として示します。層は両側とも保たれています。',
    },
    {
      slug: 'hip-anatomy',
      label: 'The other weight-bearing joint',
      labelJa: 'もう一方の荷重関節',
      why: 'A ball in a socket rather than two compartments — which is why the same disease does not look the same there.',
      whyJa: '2 区画ではなく臼蓋にはまった球です。同じ病態がそこでは同じようには見えない理由になります。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'layer-thinning',
    target: 'the layer on each articular surface',
    channel: 'geometry',
    from: 'remaining',
    reading: 'illustrative',
    claim:
      'Each side’s layer is drawn at the fraction the model leaves of it: the femoral cap is drawn closer to its condyle and the tibial cap sinks into its plateau by what has gone.',
    claimJa:
      'それぞれの側の層は、モデルが残した割合で描かれます。大腿骨側の覆いは顆部へ近づき、脛骨側の覆いは失われた分だけ高原に沈みます。',
    notClaim:
      '**The fraction is of this model’s own drawn layer and is not a joint space width.** Joint space width is millimetres between bone surfaces on a weight-bearing film, and it includes the meniscus; nothing here is measured, weight-bearing or millimetres.',
    notClaimJa:
      '**この割合は「モデル自身が描いた層」に対するものであって、関節裂隙幅ではありません。** 関節裂隙幅は荷重位の写真で骨面間を mm で測るもので、半月板を含みます。ここにあるものは実測でも荷重下でも mm でもありません。',
  },
  {
    id: 'worn-colour',
    target: 'the layer on the worn side',
    channel: 'colour',
    from: 'lost',
    reading: 'proportional',
    claim: 'The layer on each side is tinted by how much of it that side has lost, so which compartment this is can be seen without reading a number.',
    claimJa: 'それぞれの側の層は、その側が失った量に応じて着色されます。数値を読まなくてもどちらの区画かが分かるようにするためです。',
  },
  {
    id: 'meniscal-extrusion',
    target: 'the meniscus on the worn side',
    channel: 'position',
    from: 'meniscalExtrusion',
    reading: 'illustrative',
    claim: 'It is moved outward from between the surfaces by the fraction of its own width the model reports.',
    claimJa: 'モデルが示す「自身の幅に対する割合」だけ、関節面の間から外側へ移動します。',
    notClaim:
      'The direction is geometry; the amount is a coefficient this repository chose. **No millimetre of extrusion follows from it**, and the meniscus is moved rather than deformed.',
    notClaimJa:
      '方向は幾何ですが、量はこのリポジトリが選んだ係数です。**そこから mm 単位の逸脱量は導けません。** また半月板は変形ではなく移動として描かれます。',
  },
  {
    id: 'marginal-bone',
    target: 'the rim of the worn compartment',
    channel: 'geometry',
    from: 'osteophyte',
    reading: 'thresholded',
    claim: 'New bone is drawn at that rim once the model says enough of the layer has gone.',
    claimJa: 'モデルが「層が十分に失われた」と判定した時点で、その辺縁に新生骨が描かれます。',
    notClaim:
      'It marks the rim of the compartment the model wore. Where osteophytes grow, in what shape and in what order is not in this model, and no size on screen is a grade.',
    notClaimJa:
      '示しているのは、モデルが消耗させた区画の辺縁です。骨棘がどこに・どんな形で・どの順に生じるかはこのモデルにはなく、画面上の大きさは重症度でもありません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of compartmental knee osteoarthritis. It computes what is left of a drawn articular layer on each side of one knee, and what follows on the side that has lost it. It contains no pain, no loading, no time and no treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '区画性の膝関節症についての教育用の幾何モデルです。1 つの膝の左右それぞれで、描かれた関節面の層がどれだけ残っているかと、失われた側に何が続くかを計算します。痛み・荷重・時間・治療のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'One compartment, not one joint — no pain, no loading, not diagnosis.';
export const DISCLAIMER_SHORT_JA = '関節全体ではなく 1 区画｜痛みも荷重もありません。診断には使用できません。';
