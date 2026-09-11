/**
 * Everything the multinodular goitre scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from
 * [`src/models/multinodularGoitre.js`](../models/multinodularGoitre.js) at the
 * moment they see it.
 */

export const PALETTE = {
  gland: '#b4565f',
  nodular: '#cf7a6a',
  trachea: '#cfd6dd',
  narrowed: '#ff5a6e',
  nerve: '#e8e08a',
  parathyroid: '#d8a14a',
  bone: '#ded4c2',
  oesophagus: '#c9a2a6',
};

export const LEGEND = [
  { key: 'gland', label: 'The gland', labelJa: '甲状腺' },
  { key: 'trachea', label: 'The airway', labelJa: '気管' },
  { key: 'nerve', label: 'The nerve behind it', labelJa: '後方を走る反回神経' },
  { key: 'parathyroid', label: 'The parathyroid glands', labelJa: '副甲状腺' },
  { key: 'bone', label: 'The thoracic inlet — the one rigid boundary', labelJa: '胸郭上口｜唯一の硬い境界' },
  { key: 'narrowed', label: 'Where the airway is narrowed', labelJa: '気管が狭くなっている部分', activeFrom: 0.15 },
];

/**
 * The axis is **how much nodular tissue there is**, in whichever direction the
 * reader chose.
 *
 * Which way it goes lives on the model controls, because the four directions are
 * four arrangements. A goitre does not pass from one to the next, and an axis
 * between them would say it does.
 */
export const STAGES = [
  {
    id: 'nodular',
    name: 'A gland with nodules in it',
    nameJa: '結節のある甲状腺',
    at: 0,
    focus: ['gland', 'trachea'],
    summary:
      'The thyroid is wrapped round the front and sides of the airway. Nodules make it bigger; which way that extra goes is chosen, not reached.',
    summaryJa:
      '甲状腺は気道の前面と側面を取り巻いています。結節はそれを大きくしますが、増えた分がどちらへ向かうかは「選ぶ」ものであって、順に到達するものではありません。',
  },
  {
    id: 'grown',
    name: 'Enough to reach what is next to it',
    nameJa: '隣のものに届く量',
    at: 0.55,
    focus: ['trachea'],
    summary:
      'The neck is soft in every direction but one, so most of this pushes rather than presses. Whether the airway is moved or made narrower depends entirely on where the extra went.',
    summaryJa:
      '頸部は 1 方向を除いて軟らかいため、多くは「押しのける」ことになります。気道が動くのか狭くなるのかは、増えた分がどこへ行ったかだけで決まります。',
  },
  {
    id: 'large',
    name: 'The same gland, four different neighbours',
    nameJa: '同じ大きさの腺、4 通りの隣人',
    at: 1,
    focus: ['trachea', 'nerve'],
    summary:
      'At this size the gland is the same volume in all four directions. What differs is what it is against — and only one of the four has a boundary that will not move.',
    summaryJa:
      'この大きさでは、4 方向のどれでも腺の体積は同じです。違うのは何に接しているかで、動かない境界を持つのは 4 つのうち 1 つだけです。',
  },
];

export const RANGE = { start: 'Few nodules', startJa: '結節が少ない', end: 'Large goitre', endJa: '大きな甲状腺腫' };
export const PROGRESS_LABEL = {
  label: 'How much nodular tissue there is',
  labelJa: '結節性組織がどれだけあるか',
};

export const ANNOTATIONS = [
  { id: 'gland', text: 'The thyroid', sub: '甲状腺', anchor: 'gland', range: [0, 1], compact: false },
  { id: 'trachea', text: 'The airway', sub: '気管', anchor: 'trachea', range: [0, 1], compact: false },
  { id: 'nerve', text: 'Recurrent laryngeal nerve', sub: '反回神経', anchor: 'nerve', range: [0, 1], compact: false },
  { id: 'parathyroid', text: 'Parathyroid glands', sub: '副甲状腺', anchor: 'parathyroid', range: [0, 1], compact: false },
  { id: 'inlet', text: 'The thoracic inlet', sub: '胸郭上口', anchor: 'inlet', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'glandVolume', label: 'The gland, against its own volume — the same in every direction', labelJa: '腺の体積（自身の安静時比）｜どの方向でも同じ', unit: '×', emphasis: true },
  { id: 'airway', label: 'What the airway is getting', labelJa: '気道に起きていること', unit: '', emphasis: true },
  { id: 'width', label: 'Width across the airway, against this model’s own resting one', labelJa: '気道の幅（このモデルの安静時比）', unit: '%' },
  { id: 'deviation', label: 'How far the airway has been pushed aside, in its own radii', labelJa: '気道が押しやられた距離（自身の半径を単位として）', unit: '×' },
  { id: 'behind', label: 'How far the gland now reaches back past the nerve and the parathyroids, as a share of its own depth', labelJa: '神経・副甲状腺より後方へ伸びた量（腺自身の奥行き比）', unit: '%' },
];

export const MODEL_CONTROLS = [
  {
    id: 'direction',
    kind: 'choice',
    label: 'Which way it enlarges',
    labelJa: 'どちらへ大きくなるか',
    options: [
      {
        value: 'none',
        label: 'Not enlarged',
        labelJa: '腫大なし',
        effect: 'The gland sits round the airway and nothing is displaced.',
        effectJa: '腺は気道を取り巻いており、何も押しやられていません。',
      },
      {
        value: 'anterior',
        label: 'Forward, into the neck',
        labelJa: '前方（頸部へ）',
        effect: 'The one direction with nothing in the way. The neck is fuller and the airway is untouched.',
        effectJa: '何も邪魔のない唯一の方向です。頸部は太くなりますが、気道には何も起きません。',
      },
      {
        value: 'medial',
        label: 'Toward the airway, in the neck',
        labelJa: '気道側（頸部内）',
        effect: 'The airway is pushed across and stays open, because nothing on the far side of it refuses to move.',
        effectJa: '気道は横へ押しやられますが、開存は保たれます。反対側に動かないものがないためです。',
      },
      {
        value: 'posterior',
        label: 'Backward, past the nerve',
        labelJa: '後方（神経の奥へ）',
        effect: 'The nerve and the parathyroid glands end up on or inside the enlargement rather than behind it.',
        effectJa: '神経と副甲状腺は、腫大した腺の後方ではなく、その表面または内部に位置することになります。',
      },
      {
        value: 'retrosternal',
        label: 'Down behind the sternum',
        labelJa: '下方（胸骨の裏へ）',
        effect: 'Into the thoracic inlet, which is a ring of bone. Here the same tissue narrows the airway instead of moving it.',
        effectJa: '胸郭上口は骨の輪です。ここでは同じ組織が気道を動かすのではなく、狭くします。',
      },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Four directions, one of them boxed in',
  labelJa: '4 つの方向、うち 1 つは囲まれている',
  hint: 'Four arrangements, not four degrees. The direction decides what the extra tissue is against.',
  hintJa: '4 通りの配置であって 4 段階ではありません。方向によって、増えた組織が何に接するかが決まります。',
};

export const MODEL_SCOPE = {
  question:
    'A nodular thyroid of a given size — what does the direction it has enlarged in decide?',
  questionJa:
    '同じ大きさの結節性甲状腺でも、どちらへ大きくなったかで何が決まるのか。',
  answers: [
    {
      text: 'That the neck is soft in every direction but one, so most enlargement pushes the airway aside rather than narrowing it — a deviated trachea with a normal lumen.',
      textJa:
        '頸部は 1 方向を除いて軟らかく、多くの腫大は気道を狭めるのではなく押しやること。気管は偏位しても内腔は保たれます。',
    },
    {
      text: 'That the one rigid boundary is the thoracic inlet, so a gland that has followed the airway down behind the sternum narrows it with the same amount of tissue that would otherwise only have moved it.',
      textJa:
        '唯一の硬い境界が胸郭上口であること。気道に沿って胸骨の裏へ下がった腺は、本来なら押しやるだけだったのと同じ量の組織で気道を狭めます。',
    },
    {
      text: 'That the recurrent laryngeal nerve and the parathyroid glands lie against the gland’s posterior surface, so an enlargement that goes backwards passes them rather than approaching them.',
      textJa:
        '反回神経と副甲状腺は腺の後面に接しており、後方への腫大はそれらに「近づく」のではなく「追い越す」こと。',
    },
    {
      text: 'That the volume of the gland is the same in all four directions, so a figure for how big it has become says nothing about what it is against.',
      textJa:
        '4 方向のどれでも腺の体積は同じであり、「どれだけ大きくなったか」という数値は、それが何に接しているかを語らないこと。',
    },
  ],
  excludes: [
    {
      text: '**All thyroid function.** No hormone, no TSH, no uptake and no autonomy. A goitre of any shape here may be euthyroid, overactive or underactive, and **nothing about the shape says which** — a scene that let that be inferred would be teaching something false.',
      textJa:
        '**甲状腺機能のすべて。** ホルモンも TSH も摂取率も自律性もありません。ここに描かれたどの形の甲状腺腫も、機能は正常・亢進・低下のいずれでもありえます。**形から機能は分かりません。** それを推測させる画面は、誤ったことを教えることになります。',
    },
    {
      text: 'Malignancy, cytology, calcification, and every distinction between one nodule and another. There is no tissue in this model, only a volume and a direction.',
      textJa:
        '悪性・細胞診・石灰化、そして結節どうしの鑑別。このモデルに組織はなく、体積と方向があるだけです。',
    },
    {
      text: 'Every symptom: swallowing, breathing, voice, and how any of them feels. **The nerve relation here is anatomy and not injury** — nothing in this model says a nerve is damaged or at risk.',
      textJa:
        'あらゆる症状（嚥下・呼吸・声、およびその感じ方）。**ここでの神経との関係は解剖であって損傷ではありません。** 神経が傷ついているとも、危険であるとも述べていません。',
    },
    {
      text: 'Time, growth rate and every treatment, surgical or otherwise.',
      textJa: '時間・増大速度、そして外科的なものを含むあらゆる治療。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The lobe’s volume and depth and the airway’s calibre are measured off this repository’s thyroid atlas, whose own proportions are drawn to be legible rather than to scale. The width across the airway is reported against this model’s own resting width and **is not a tracheal diameter**.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 葉の体積・奥行き・気道の太さは、このリポジトリの甲状腺アトラスから測ったものです。そのアトラス自体が実寸比ではなく「見分けられるように」描かれています。気道の幅は「このモデルの安静時に対する割合」であって、**気管径ではありません。**',
    },
    {
      text: 'The four directions and how much of each one meets a boundary are this repository’s reading of four standard pictures. A real goitre goes several ways at once, and the four are not exclusive.',
      textJa:
        '4 つの方向と、それぞれがどれだけ境界に当たるかは、標準的な 4 つの像に対するこのリポジトリの解釈です。実際の甲状腺腫は同時に複数の方向へ広がり、4 者は排他的ではありません。',
    },
    {
      text: 'The thoracic inlet is drawn as a ring. The atlas has no skeleton, so this is a structure the scene adds — and it is the boundary the whole claim rests on, which is why it is drawn at all.',
      textJa:
        '胸郭上口は輪として描いています。アトラスに骨格はないため、これはシーンが付け加えた構造です。主張全体が依拠する境界であるからこそ描いています。',
    },
    {
      text: 'The parathyroid glands are drawn in four plausible places. Their position varies more than almost anything else in the neck, which is the reason a surgeon looks for them rather than knowing where they are.',
      textJa:
        '副甲状腺は「ありうる 4 か所」に描いています。その位置は頸部の中でも特に変異が大きく、だからこそ術者は「知っている」のではなく「探す」のです。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of multinodular goitre: tracheal deviation in the neck, tracheal compression where the gland is retrosternal, and the thoracic inlet as the point at which a goitre is confined.',
      textJa:
        '多結節性甲状腺腫の標準的な記載から、頸部での気管偏位、胸骨後方に及ぶ場合の気管圧排、そして甲状腺腫が絞扼される部位としての胸郭上口。',
      kind: 'textbook',
    },
    {
      text: 'Standard thyroid surgical anatomy for the recurrent laryngeal nerve in the tracheo-oesophageal groove and the parathyroid glands on the posterior surface.',
      textJa:
        '標準的な甲状腺外科解剖から、気管食道溝を走る反回神経と、後面にある副甲状腺。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/multinodular-goitre.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'thyroid-anatomy',
      label: 'The same gland, named',
      labelJa: '同じ腺を、名前で',
      why: 'Lobes, isthmus, the parathyroids behind and the nerves in the groove — as structures you can point at, with nothing enlarged.',
      whyJa: '葉・峡部・後方の副甲状腺・溝を走る神経を、名前で指せる構造として示します。腫大はありません。',
    },
    {
      slug: 'thyroid-hormone',
      label: 'What the gland makes',
      labelJa: '腺が作っているもの',
      why: 'The follicles and the loop they sit in — which is the part of thyroid disease this scene deliberately contains none of.',
      whyJa: '濾胞と、それが組み込まれた制御ループです。このシーンが意図的に一切含めていない側面にあたります。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'gland-growth',
    target: 'the thyroid lobes',
    channel: 'scale',
    from: 'advance',
    reading: 'illustrative',
    claim: 'The lobes are extended along the direction chosen, by the distance the model gets from the volume added.',
    claimJa: '葉は、加わった体積からモデルが求めた距離だけ、選ばれた方向へ伸ばされます。',
    notClaim:
      'The shape it grows into is drawn, not solved: this model has one distance in it and no nodules. **No volume on screen is a millilitre and nothing here is a nodule anybody could see.**',
    notClaimJa:
      '広がった形は解いたものではなく描いたものです。このモデルにあるのは 1 つの距離だけで、結節は含まれていません。**画面上の体積は mL ではなく、ここにあるものは誰かに見える結節でもありません。**',
  },
  {
    id: 'airway-deviation',
    target: 'the trachea',
    channel: 'position',
    from: 'deviation',
    reading: 'illustrative',
    claim: 'The airway is bent across by the distance the model says it has been pushed, at the level of the gland.',
    claimJa: '気道は、腺の高さで、モデルが「押しやられた」とする距離だけ横へ曲げられます。',
    notClaim: 'A displaced airway on screen is a distance this model computed from a volume. It is not a radiological measurement and it is not a degree of anything.',
    notClaimJa: '画面上で偏位した気道は、体積からこのモデルが計算した距離です。画像上の実測値でも、何かの重症度でもありません。',
  },
  {
    id: 'airway-narrowing',
    target: 'the trachea at the inlet',
    channel: 'geometry',
    from: 'tracheaWidthFraction',
    reading: 'illustrative',
    claim: 'Where the model says the gland is confined, the airway is drawn narrowed by the fraction it reports, and marked.',
    claimJa: 'モデルが「囲まれている」とした場合、気道はその割合だけ細く描かれ、色で示されます。',
    notClaim:
      '**The fraction is against this model’s own resting width and is not a tracheal diameter.** There is no airflow in this model, no breathing and no symptom of any kind.',
    notClaimJa:
      '**その割合は「このモデルの安静時に対する比」であって気管径ではありません。** このモデルに気流も呼吸も症状もありません。',
  },
  {
    id: 'posterior-structures',
    target: 'the nerve and the parathyroid glands',
    channel: 'emissive',
    from: 'envelopsPosterior',
    reading: 'thresholded',
    claim: 'They are lit once the model says the enlargement now reaches back past them.',
    claimJa: 'モデルが「腫大がそれらより後方まで達した」と判定した時点で、それらを光らせます。',
    notClaim:
      '**Lit is where they are, not what has happened to them.** Nothing in this model says a nerve is damaged, at risk, or anything else about it, and nothing says a parathyroid gland has stopped working.',
    notClaimJa:
      '**光っているのは「位置」であって、そこに何かが起きたという意味ではありません。** 神経が傷ついたとも、危険であるとも述べておらず、副甲状腺の機能についても何も述べていません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of an enlarging nodular thyroid. It computes whether the airway is moved or narrowed from the direction the gland has grown in, on an atlas drawn to be distinguishable rather than to scale. It contains no thyroid function of any kind, no malignancy, no symptom and no treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '結節性甲状腺腫大についての教育用の幾何モデルです。実寸比ではなく「見分けられるように」描かれたアトラス上で、腺がどちらへ大きくなったかから、気道が動くのか狭くなるのかを計算します。甲状腺機能・悪性・症状・治療はいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Moved or narrowed — no thyroid function anywhere, not diagnosis.';
export const DISCLAIMER_SHORT_JA = '動くか、狭くなるか｜甲状腺機能は一切含みません。診断には使用できません。';
