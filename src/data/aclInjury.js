/**
 * Everything the ACL injury scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from [`src/models/aclInjury.js`](../models/aclInjury.js) at the
 * moment they see it.
 */

export const PALETTE = {
  bone: '#e6e0cd',
  ligament: '#e8e0c8',
  stretched: '#d8b06a',
  torn: '#c96a5e',
  pcl: '#d8d0b8',
  meniscus: '#dcd2b4',
  secondary: '#8fd6c4',
};

export const LEGEND = [
  { key: 'ligament', label: 'The ligament', labelJa: '前十字靱帯' },
  { key: 'stretched', label: 'Stretched and thinned', labelJa: '伸びて細くなった状態', activeFrom: 0.1 },
  { key: 'torn', label: 'Discontinuous — two ends', labelJa: '連続性が絶たれた状態（2 つの断端）', activeFrom: 0.8 },
  { key: 'meniscus', label: 'What holds it once the ligament does not', labelJa: '靱帯が担えなくなったとき支えるもの' },
];

/**
 * The axis is **how much of the ligament's restraint is gone**.
 *
 * It is not a position: a torn ligament is a different state of the same
 * structure, and the scene draws three states rather than one structure in
 * three places.
 */
export const STAGES = [
  {
    id: 'intact',
    name: 'The thing in the way',
    nameJa: '前に出るのを止めているもの',
    at: 0,
    focus: ['acl', 'tibia'],
    summary:
      'The ligament runs from the back of the femur forward and down to the front of the tibia, so when the lower bone tries to slide forward it is what stops it.',
    summaryJa:
      '靱帯は大腿骨の後方から前下方へ走り、脛骨の前方に付きます。下の骨が前へ滑ろうとするとき、それを止めているのがこの靱帯です。',
  },
  {
    id: 'stretched',
    name: 'Stretched, and holding less',
    nameJa: '伸びて、支える力が落ちる',
    at: 0.5,
    focus: ['acl'],
    summary:
      'Part of its restraint is gone. The ligament is drawn thinner and slack — not moved somewhere else — and the tibia has begun to sit further forward.',
    summaryJa:
      '支える力の一部が失われています。靱帯は別の場所へ移されるのではなく、細くたるんだ状態として描かれ、脛骨はすでに少し前に出ています。',
  },
  {
    id: 'torn',
    name: 'Two ends, and something else holding',
    nameJa: '2 つの断端と、代わりに支えるもの',
    at: 1,
    focus: ['acl', 'secondary'],
    summary:
      'The ligament is discontinuous: a stump at each end with a gap between them. What is left holding the tibia is the secondary restraints — all of it.',
    summaryJa:
      '靱帯の連続性は絶たれ、両端に断端が残って間が空いています。脛骨を支えているのは副次的な制動だけで、そのすべてがそちらにかかります。',
  },
];

export const RANGE = { start: 'Intact', startJa: '正常', end: 'Discontinuous', endJa: '断裂' };
export const PROGRESS_LABEL = {
  label: 'How much of the ligament’s restraint is gone',
  labelJa: '靱帯の制動がどれだけ失われたか',
};

export const ANNOTATIONS = [
  { id: 'acl', text: 'The ligament', sub: '前十字靱帯', anchor: 'acl', range: [0, 1], compact: false },
  { id: 'tibia', text: 'The bone that slides forward', sub: '前へ滑る骨（脛骨）', anchor: 'tibia', range: [0, 1], compact: false },
  { id: 'secondary', text: 'What holds it instead', sub: '代わりに支えるもの', anchor: 'secondary', range: [0, 1], compact: false },
  { id: 'gap', text: 'Where the two ends are', sub: '断端のあいだ', anchor: 'gap', range: [0.6, 1], compact: false },
];

export const METRICS = [
  { id: 'remaining', label: 'Restraint still there, against what there was', labelJa: '残っている制動（元の量に対して）', unit: '%', emphasis: true },
  { id: 'who', label: 'What is holding it', labelJa: '何が支えているか', unit: '', emphasis: true },
  { id: 'acl', label: 'Of the original restraint, the ligament’s part', labelJa: '元の制動のうち、靱帯が担う分', unit: '%' },
  { id: 'secondary', label: 'Of the original restraint, the secondary part', labelJa: '元の制動のうち、副次的な制動が担う分', unit: '%' },
  { id: 'translation', label: 'How far forward the tibia can sit, against this model’s own drawn plateau', labelJa: '脛骨が前に出られる量（このモデルが描いた脛骨高原に対する比）', unit: '%' },
  { id: 'state', label: 'The ligament itself', labelJa: '靱帯そのものの状態', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'secondaryRestraint',
    label: 'How much of the secondary restraint is still there',
    labelJa: '副次的な制動がどれだけ残っているか',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v > 0.7 ? 'intact' : v > 0.3 ? 'partly' : 'gone too'),
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'What else is holding it',
  labelJa: 'ほかに支えているもの',
  hint: 'The menisci, the capsule and the shape of the plateau. Small while the ligament is there; everything once it is not.',
  hintJa: '半月板・関節包・脛骨高原の形です。靱帯があるうちはわずかですが、失われればそれがすべてになります。',
};

export const MODEL_SCOPE = {
  question:
    'When the anterior cruciate ligament is torn, what is holding the tibia — and how much of what there was is that?',
  questionJa:
    '前十字靱帯が断裂したとき、脛骨を支えているのは何で、それは元の制動のどれだけにあたるのか。',
  answers: [
    {
      text: 'That the ligament runs from the back of the femur to the front of the tibia, so it is the structure in the way when the lower bone slides forward.',
      textJa:
        '靱帯は大腿骨の後方から脛骨の前方へ走るため、下の骨が前へ滑るときに立ちはだかる構造であること。',
    },
    {
      text: 'That it is the primary restraint to that movement and the menisci, capsule and plateau shape are secondary ones — which is a statement about ordering, not about numbers.',
      textJa:
        'その運動に対する主要な制動であり、半月板・関節包・高原の形は副次的であること。これは順序についての記述であって、数値についてではありません。',
    },
    {
      text: 'That once the primary one is gone the secondary ones are carrying all of what is left, which is a small part of what there was.',
      textJa:
        '主要な制動が失われれば、残っているものすべてを副次的な制動が担うこと。そしてそれは元の量のごく一部にすぎません。',
    },
    {
      text: 'That a torn ligament is a different state of the same structure — thinned, or discontinuous with a stump at each end — and not an intact one somewhere else.',
      textJa:
        '断裂した靱帯は、同じ構造の別の状態（細くなった状態、あるいは両端に断端を残して途切れた状態）であって、正常な靱帯が別の場所にあるのではないこと。',
    },
  ],
  excludes: [
    {
      text: '**Every examination.** Nothing here is a Lachman test, an anterior drawer or a pivot shift. Those are things a person does with their hands, and their grades come from what that person feels. **There is no examiner in this model and nothing in this scene is being tested.**',
      textJa:
        '**あらゆる診察手技。** ここにあるものは Lachman テストでも前方引き出しでも pivot shift でもありません。それらは人が手で行うもので、その評価は行った人の触知に基づきます。**このモデルに診察者はおらず、この画面で何かが検査されているのでもありません。**',
    },
    {
      text: 'The injury itself: how it happened, what the knee was doing, and what a person felt at the time or since. No pain, no swelling, no giving way.',
      textJa:
        '受傷そのもの。どのように起きたか、そのとき膝が何をしていたか、そして本人が当時あるいはその後に何を感じたか。痛み・腫れ・膝崩れはいずれも含みません。',
    },
    {
      text: 'Rotation. The ligament is oblique and resists more than one thing; this model has one direction in it and says nothing about the others.',
      textJa:
        '回旋。靱帯は斜走しており 1 つ以上の運動を制動しますが、このモデルにあるのは 1 方向だけで、他については何も述べません。',
    },
    {
      text: 'Time, healing, bone bruising, cartilage, and every treatment — including whether anything should be done at all.',
      textJa: '時間経過・治癒・骨挫傷・軟骨、そしてあらゆる治療。何かを行うべきかどうかも含みます。',
    },
  ],
  cautions: [
    {
      text: '**The distance here is not a millimetre and not a side-to-side difference.** It is a fraction of a tibial plateau this repository drew, on an atlas whose proportions are legible rather than measured.',
      textJa:
        '**ここでの距離は mm でも左右差でもありません。** このリポジトリが描いた脛骨高原に対する割合であり、そのアトラス自体が実測ではなく「見分けられるように」描かれています。',
    },
    {
      text: 'How the restraint divides between the ligament and everything else is this repository’s reading of the word “primary”. The model claims the ordering — the ligament first, the rest second — and never the split.',
      textJa:
        '制動が靱帯とそれ以外にどう分かれるかは、「主要な」という語に対するこのリポジトリの解釈です。モデルが主張するのは順序（靱帯が主、他が副）であって、その比ではありません。',
    },
    {
      text: 'The collateral ligaments and the tendon across the front are drawn as context and are **not re-solved** when the tibia moves. Only the two cruciates follow it, because only they are the subject.',
      textJa:
        '側副靱帯と前面を走る腱は文脈として描いており、脛骨が動いても**解き直していません。** 追従するのは主題である 2 本の十字靱帯だけです。',
    },
    {
      text: 'The knee is drawn in extension and nothing in this scene moves by itself. The tibia sits where the model says it can sit, which is not the same as a knee doing it.',
      textJa:
        '膝は伸展位で描かれ、このシーンで自律的に動くものはありません。脛骨はモデルが「そこまで出られる」とした位置にあり、膝が実際にそう動くこととは別です。',
    },
  ],
  sources: [
    {
      text: 'Standard knee anatomy for the ligament’s course, and standard descriptions of it as the primary restraint to anterior tibial translation with the menisci, capsule and plateau shape as secondary restraints.',
      textJa:
        '標準的な膝関節解剖から靱帯の走行を、また脛骨前方移動に対する主要な制動であり、半月板・関節包・高原形状が副次的制動であるという標準的記載を用いています。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/acl-injury.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'knee-anatomy',
      label: 'The same knee, named',
      labelJa: '同じ膝を、名前で',
      why: 'Both cruciates in the notch, the collaterals and the menisci, as structures you can point at — with nothing torn.',
      whyJa: '顆間窩の 2 本の十字靱帯、側副靱帯、半月板を、名前で指せる構造として示します。断裂はありません。',
    },
    {
      slug: 'knee-osteoarthritis',
      label: 'The same knee, losing its layer',
      labelJa: '同じ膝が、層を失うとき',
      why: 'A different subject on the same joint: what happens to one compartment when the surface between the bones goes.',
      whyJa: '同じ関節の別の主題です。骨の間の面が失われたとき、片方の区画に何が起きるかを扱います。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'injury-state',
    target: 'the ligament',
    channel: 'geometry',
    from: 'state',
    reading: 'illustrative',
    claim:
      'The ligament is drawn in the state the model is in: intact, thinned and slack, or discontinuous with a stump at each end. **The scene draws its own ligament rather than moving the atlas’s intact one.**',
    claimJa:
      '靱帯はモデルの状態のとおりに描かれます。正常・細くたるんだ状態・両端に断端を残して途切れた状態の 3 つです。**シーンはアトラスの正常な靱帯を動かすのではなく、自前の靱帯を描いています。**',
    notClaim:
      'How a torn ligament actually looks — where it fails along its length, what the stumps do, whether anything remains in continuity — is not in this model. The gap is drawn, not solved.',
    notClaimJa:
      '断裂した靱帯が実際にどう見えるか——長さのどこで破綻するか、断端がどうなるか、一部が連続性を保つか——はこのモデルにありません。断端の間隔は解いたものではなく描いたものです。',
  },
  {
    id: 'anterior-translation',
    target: 'the tibia',
    channel: 'position',
    from: 'translationFraction',
    reading: 'illustrative',
    claim: 'The lower bone and everything that belongs to it are moved forward by the fraction of the drawn plateau the model reports.',
    claimJa: '下の骨とそれに属するものは、モデルが示す「描かれた高原に対する割合」だけ前へ移動します。',
    notClaim:
      '**It is not millimetres, not a side-to-side difference, and not a Lachman grade.** There is no examiner in this model, and the collaterals and the tendon across the front are context that is not re-solved when the bone moves.',
    notClaimJa:
      '**mm でも左右差でも Lachman の評価でもありません。** このモデルに診察者はおらず、側副靱帯と前面の腱は解き直していない文脈です。',
  },
  {
    id: 'who-is-holding',
    target: 'the secondary restraints',
    channel: 'emissive',
    from: 'secondaryCarriesIt',
    reading: 'thresholded',
    claim: 'The menisci are lit once the model says the secondary restraints are holding more of it than the ligament is.',
    claimJa: 'モデルが「副次的な制動のほうが靱帯より多くを担っている」と判定した時点で、半月板を光らせます。',
    notClaim:
      'It marks which side of a comparison the model is on. **It is not a prediction that anything will happen to a meniscus**, and nothing in this model says one fails.',
    notClaimJa:
      '示しているのは比較の向きだけです。**半月板に何かが起きるという予測ではなく、**このモデルは半月板が破綻するとは述べていません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of an anterior cruciate ligament injury. It draws three states of one ligament and computes how much of the restraint to the tibia sliding forward is left and what is carrying it. It contains no examination, no symptom, no rotation, no time and no treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '前十字靱帯損傷についての教育用の幾何モデルです。1 本の靱帯の 3 つの状態を描き、脛骨の前方移動に対する制動がどれだけ残り、何がそれを担っているかを計算します。診察手技・症状・回旋・時間・治療のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'What is holding it now — no examination, no grade, not diagnosis.';
export const DISCLAIMER_SHORT_JA = 'いま何が支えているか｜診察手技も評価段階もありません。診断には使用できません。';
