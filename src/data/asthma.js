/**
 * Everything the asthma scene says, in both languages.
 *
 * No physiology here. Every figure comes from
 * [`src/models/asthma.js`](../models/asthma.js) at the moment the reader sees
 * it; this file holds the wording, the palette, the axes and the boundary of
 * the claim.
 */

export const PALETTE = {
  airway: '#a9b8cf',
  lung: '#c98d95',
  open: '#7ee0a8',
  narrowed: '#ff8e6b',
  ventilated: '#8fd8ff',
  defect: '#b8492c',
  curve: '#ffc48f',
  marker: '#ffffff',
};

export const LEGEND = [
  { key: 'airway', label: 'Airway', labelJa: '気道' },
  { key: 'ventilated', label: 'Ventilated region', labelJa: '換気されている領域' },
  { key: 'defect', label: 'Region receiving almost nothing', labelJa: 'ほとんど換気されていない領域', activeFrom: 0.5 },
  { key: 'narrowed', label: 'Narrowed airway', labelJa: '狭窄した気道', activeFrom: 0.45 },
];

/**
 * The axis is the strength of the bronchoconstrictor stimulus.
 *
 * Not a severity slider: how twitchy the airways are and how thick their walls
 * are live on the model controls, one property at a time. This is the dose,
 * and it is the axis along which the model's knee sits — which is the entire
 * subject.
 */
export const STAGES = [
  {
    id: 'quiet',
    name: 'No stimulus',
    nameJa: '刺激なし',
    at: 0,
    focus: ['tree', 'units'],
    summary:
      'An asthmatic airway tree with nothing provoking it. The walls are already thicker than they should be, but every region is getting its share.',
    summaryJa:
      '刺激のない喘息の気道です。壁はすでに正常より厚くなっていますが、各領域はきちんと換気されています。',
  },
  {
    id: 'held',
    name: 'Stimulus, no effect',
    nameJa: '刺激はあるが、変化しない',
    at: 0.4,
    focus: ['tree'],
    summary:
      'The smooth muscle is being activated everywhere and almost nothing has happened. The parenchyma is holding the airways open, and the muscle is not winning.',
    summaryJa:
      '平滑筋は全体で活性化していますが、ほとんど何も起きていません。実質が気道を開いた状態に保っており、筋は勝てていません。',
  },
  {
    id: 'patchy',
    name: 'The lung goes patchy',
    nameJa: '不均一化',
    at: 0.75,
    focus: ['units'],
    summary:
      'Past the knee. Some regions have tipped and gone dark; the rest have inherited their air and are being held open by it. The stimulus is still perfectly even.',
    summaryJa:
      '変曲点を越えました。一部の領域は限界を越えて暗くなり、残りはその分の空気を受け取って開いた状態を保っています。刺激そのものは依然として完全に均一です。',
  },
  {
    id: 'shift',
    name: 'The whole lung goes',
    nameJa: '全体の転移',
    at: 1,
    focus: ['tree', 'units'],
    summary:
      'The patchiness was the prelude. At full stimulus almost every region has tipped: the lung is uniform again, and uniformly poorly ventilated, with many times the resistance it started with.',
    summaryJa:
      '不均一化は前段階でした。最大刺激ではほとんどの領域が限界を越え、肺は再び均一になります。ただし均一に「換気されていない」状態であり、抵抗は当初の何倍にもなっています。',
  },
];

export const RANGE = { start: 'None', startJa: 'なし', end: 'Strong', endJa: '強い' };
export const PROGRESS_LABEL = { label: 'Bronchoconstrictor stimulus', labelJa: '気道収縮刺激の強さ' };

export const ANNOTATIONS = [
  { id: 'trachea', text: 'Trachea', sub: '気管', anchor: 'trachea', range: [0, 1] },
  { id: 'tree', text: 'Airway tree', sub: '気道樹', anchor: 'tree', range: [0, 1], compact: false },
  { id: 'units', text: 'Ventilation units', sub: '換気単位', anchor: 'units', range: [0, 1], compact: false },
  { id: 'defect', text: 'A region that has tipped', sub: '限界を越えた領域', anchor: 'defect', range: [0.55, 1], compact: false },
];

/**
 * Shown only in comparison mode, where the two trees are moved apart and the
 * ordinary annotations would point at empty space between them. The wording is
 * the reel's cards, so the interactive comparison and the social sequence name
 * the two lungs the same way.
 */
export const COMPARISON_ANNOTATIONS = [
  {
    id: 'reference-tree',
    text: 'Normal',
    sub: '正常（比較用）',
    anchor: 'comparisonReference',
    range: [0, 1],
    comparisonOnly: true,
  },
  {
    id: 'asthmatic-tree',
    text: 'Asthma',
    sub: '喘息',
    anchor: 'comparisonDisease',
    range: [0, 1],
    comparisonOnly: true,
  },
];

export const CHARTS = [
  {
    id: 'ventilation-distribution',
    title: 'Where the air went',
    titleJa: '空気がどこへ行ったか',
    unitLabel: 'units against share',
    height: 108,
    x: { unit: '', ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] },
    y: { unit: 'units', min: 0 },
    key: [
      { id: 'ventilated', label: 'Ventilation units', labelJa: '換気単位', color: '#8fd8ff' },
      { id: 'threshold', label: 'Defect threshold', labelJa: '欠損の閾値', color: '#ff8e6b', dash: true },
    ],
  },
  {
    id: 'dose-response',
    title: 'Resistance against dose',
    titleJa: '刺激量に対する気道抵抗',
    unitLabel: '× baseline against dose',
    height: 108,
    x: { unit: '', min: 0, max: 1, ticks: [0, 0.5, 1] },
    y: { unit: '×', min: 0 },
    key: [
      { id: 'curve', label: 'This lung', labelJa: 'この肺', color: '#ffc48f' },
      { id: 'now', label: 'Where you are', labelJa: '現在の位置', color: '#ffffff' },
    ],
  },
];

export const METRICS = [
  { id: 'resistance', label: 'Airway resistance', labelJa: '気道抵抗', unit: '× healthy', emphasis: true },
  { id: 'heterogeneity', label: 'Ventilation heterogeneity (CV)', labelJa: '換気の不均一性 (CV)', unit: '', emphasis: true },
  { id: 'defects', label: 'Regions below the threshold', labelJa: '閾値未満の領域', unit: '%' },
  { id: 'cluster', label: 'Largest region that is mostly dark', labelJa: '最大の低換気領域', unit: '%' },
  { id: 'ventilation', label: 'Air reaching the lung', labelJa: '肺全体に届く空気', unit: '% of baseline' },
  { id: 'calibre', label: 'Median small-airway calibre', labelJa: '末梢気道の内径（中央値）', unit: '% of baseline' },
  { id: 'stimulus', label: 'Stimulus given', labelJa: '与えた刺激', unit: '%' },
  { id: 'settled', label: 'Solution settled', labelJa: '解の収束', unit: '', valueJa: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'hyperresponsiveness',
    label: 'Airway hyperresponsiveness',
    labelJa: '気道過敏性',
    min: 0.8,
    max: 1.8,
    step: 0.02,
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    id: 'wallThickening',
    label: 'Airway wall thickening',
    labelJa: '気道壁の肥厚',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    /**
     * The mechanical tethering term, named for the mechanism rather than for
     * the manoeuvre. Calling it "a deep breath" invited the reader to take the
     * number it produces as a prediction of what a deep inspiration does to a
     * person with asthma, which it is not — see the note in `cautions` below.
     */
    id: 'lungInflation',
    label: 'Global lung inflation (parenchymal stretch)',
    labelJa: '肺全体の伸展（実質の牽引）',
    min: 0.7,
    max: 1.3,
    step: 0.01,
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    id: 'bronchodilator',
    label: 'Bronchodilator',
    labelJa: '気管支拡張薬',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v === 0 ? 'none' : `${Math.round(v * 100)}%`),
  },
];

export const MODEL_SCOPE = {
  question: 'Why does a stimulus that reaches every airway equally produce ventilation that is anything but equal?',
  questionJa: 'すべての気道に均等に届く刺激が、なぜまったく均等でない換気を生むのか。',
  answers: [
    {
      text: 'How a stimulus distributes itself through a branching network, solved rather than assumed: each subtree costs what its branch plus its children in parallel cost, and flow divides in inverse proportion.',
      textJa:
        '分岐ネットワークの中で刺激がどう分布するかを、仮定ではなく解いて求めます。各部分木のコストは自身の枝と 2 つの子の並列であり、流れはその逆比で分かれます。',
    },
    {
      text: 'Why patchiness appears at all: airway narrowing is self-reinforcing through the parenchyma that tethers the airway open.',
      textJa:
        '不均一性が生じる理由。気道の狭窄は、気道を開いて保つ実質を介して自己増幅します。',
    },
    {
      text: 'Why the dose-response has a knee — almost nothing, then a great deal — rather than a slope.',
      textJa: '刺激量-反応関係が傾斜ではなく変曲点をもつ理由（ほとんど何も起きない状態から、一気に進む）。',
    },
    {
      text: 'Why increasing lung volume increases the parenchymal tethering force that opposes airway narrowing — a purely mechanical statement about the load the smooth muscle is shortening against.',
      textJa:
        '肺気量が増えると、気道の狭窄に抗する実質の牽引力が増える理由。平滑筋が短縮する際の負荷についての、純粋に力学的な主張です。',
    },
    {
      text: 'Why relaxing the smooth muscle itself does more than stretching the lung around it.',
      textJa: '平滑筋そのものを弛緩させることが、周囲の肺を伸展させること以上に効く理由。',
    },
  ],
  excludes: [
    {
      text: 'Gas exchange, perfusion and any blood value. Ventilation heterogeneity causes hypoxaemia; it is not the same thing as it, and there is no blood in this model.',
      textJa:
        'ガス交換・血流・血液の値。換気の不均一は低酸素血症の原因ですが、同一のものではありません。このモデルに血液はありません。',
    },
    {
      text: 'Inflammation, mucus plugging, eosinophils and everything else that makes asthma asthma. The model has a smooth muscle and a wall thickness, not a disease.',
      textJa:
        '炎症・粘液栓・好酸球など、喘息を喘息たらしめる要素。このモデルにあるのは平滑筋と壁厚であって、疾患そのものではありません。',
    },
    { text: 'Time. Every state here is an equilibrium; nothing takes minutes or hours.', textJa: '時間経過。ここでの状態はすべて平衡状態であり、分・時間の単位の変化はありません。' },
    { text: 'Expiratory flow limitation and air trapping — the neighbouring COPD scene’s subject, and a different model.', textJa: '呼気流量制限とエアトラッピング（隣の COPD シーンの主題であり、別のモデルです）。' },
  ],
  cautions: [
    {
      text: 'Everything is relative. Poiseuille’s law is used as a relative statement about the fourth power, not as the resistance of a real airway — flow in the large airways is not laminar.',
      textJa:
        'すべて相対値です。Poiseuille の式は「4 乗に効く」という相対的な主張として使っており、実際の気道抵抗の値ではありません（太い気道の流れは層流ではありません）。',
    },
    {
      text: 'Eight generations, symmetric branching, one shared tree. A lung has twenty-three and branches markedly asymmetrically.',
      textJa: '8 世代・対称分岐の 1 本の樹です。実際の肺は 23 世代で、分岐は明確に非対称です。',
    },
    {
      text: 'Contiguity is defined on the tree, not in space: a "region" is what one airway feeds. Two regions adjacent in the lung may be far apart in the tree.',
      textJa:
        '「隣接」は樹構造上の定義であり、空間的な隣接ではありません。ここでの「領域」は 1 本の気道が支配する範囲です。肺の中で隣り合う 2 領域が、樹の上では遠いこともあります。',
    },
    {
      text: 'At full stimulus the defect count falls, because a uniformly shut lung has no *relative* defects. Read the air reaching the lung, not the defect count, there.',
      textJa:
        '最大刺激では欠損領域の割合が下がります。均一に閉じた肺には「相対的な」欠損が存在しないためです。その領域では欠損割合ではなく、肺全体に届く空気の量を見てください。',
    },
    {
      text: 'The lung-inflation control isolates the mechanical tethering effect. It does not predict the bronchodilator response to a real deep inspiration in a person with asthma — that response is impaired or lost in asthma, most of all where hyperresponsiveness is strong, and the smooth-muscle dynamics that account for it are not in this model.',
      textJa:
        '肺の伸展の操作項は、力学的な牽引効果だけを取り出したものです。喘息患者が実際に深吸気をしたときの気管支拡張反応を予測するものではありません。その反応は喘息では減弱ないし消失しており（とくに気道過敏性が強い場合）、それを説明する平滑筋の動的性質はこのモデルに含まれていません。',
    },
    {
      text: 'Airway smooth muscle is present from the trachea to the terminal bronchioles, and this model keeps it there. What falls away distally is the cartilage that resists it — which is why the same shortening changes a small airway’s calibre far more. Asthma is a disease of the whole airway tree, not of the small airways alone.',
      textJa:
        '気道平滑筋は気管から終末細気管支まで存在し、このモデルでもそう扱っています。末梢に向かって失われるのは、それに抗する軟骨のほうです。同じ短縮量でも末梢気道の内径がはるかに大きく変わるのはそのためです。喘息は末梢気道だけの疾患ではなく、気道樹全体の疾患です。',
    },
  ],
  sources: [
    {
      text: 'Venegas et al., "Self-organized patchiness in asthma as a prelude to catastrophic shifts", Nature 434:777–82 (2005) — for the feedback mechanism and for the clustered defects it explains.',
      textJa:
        'Venegas ら「Self-organized patchiness in asthma as a prelude to catastrophic shifts」Nature 434:777–82 (2005)。フィードバック機構と、それが説明するクラスター状の換気欠損。',
      kind: 'paper',
    },
    {
      text: 'Weibel’s model A and the Hess–Murray law for the branching: symmetric dichotomy with a diameter ratio of 2^(−1/3) ≈ 0.79.',
      textJa:
        '分岐構造は Weibel model A と Hess–Murray 則から。対称二分岐で、直径比は 2^(−1/3) ≈ 0.79。',
      kind: 'textbook',
    },
    {
      text: 'Winkler & Venegas, "Mathematical Modeling of Ventilation Defects in Asthma" (PMC4698910), and "The role of heterogeneity in asthma: a structure-to-function perspective" (PMC5543015), for how the feedback and the network interact.',
      textJa:
        'Winkler & Venegas「Mathematical Modeling of Ventilation Defects in Asthma」(PMC4698910)、および「The role of heterogeneity in asthma: a structure-to-function perspective」(PMC5543015)。フィードバックとネットワークの相互作用について。',
      kind: 'review',
    },
    {
      text: 'Reviews of airway smooth muscle distribution (PMC9581182) for muscle present from the trachea — as trachealis in the posterior membranous wall — to the terminal bronchioles, with cartilage support falling away distally.',
      textJa:
        '気道平滑筋の分布に関する総説 (PMC9581182)。平滑筋は気管（後壁膜様部の trachealis）から終末細気管支まで存在し、軟骨による支持は末梢ほど失われます。',
      kind: 'review',
    },
    {
      text: 'Reviews of deep inspiration in asthma (PMC10585885) for the impairment or loss of deep-inspiration bronchodilation and bronchoprotection — which is why this scene’s lung-inflation control is described as a tethering term and not as a deep breath.',
      textJa:
        '喘息における深吸気の総説 (PMC10585885)。深吸気による気管支拡張・気管支保護作用の減弱ないし消失について。このシーンで肺伸展の操作項を「深呼吸」ではなく牽引の項として説明しているのは、このためです。',
      kind: 'review',
    },
    {
      text: 'GINA 2026 for the clinical framing of asthma as a heterogeneous disease of the whole airway tree.',
      textJa: 'GINA 2026。気道樹全体にわたる不均一な疾患としての喘息の臨床的位置づけ。',
      kind: 'guideline',
    },
    {
      text: 'Every constant here is illustrative or a stated calibration; none is fitted to data, and none of the published models has been reproduced. Reading a source in full does not turn a calibration into a measurement.',
      textJa:
        'ここでの定数はすべて説明用か、明示した較正値です。データへのフィッティングは行っておらず、既発表のモデルを再現したものでもありません。原著を読めたからといって、較正値が実測値になるわけではありません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/asthma.md',
};

/**
 * Every word the fifteen-second social sequence puts on screen.
 *
 * Here rather than in the storyboard for the same reason the stage summaries
 * are here: the sequence is drawing code, and drawing code should not contain
 * sentences. No figure appears in this file — anything numeric is a `{token}`
 * the storyboard fills from the model, so a caption cannot drift away from the
 * lung it is describing.
 */
export const REEL_COPY = {
  hook: {
    title: 'One stimulus. Two lungs.',
    titleJa: '同じ刺激。ちがう肺。',
    subtitle: 'Both trees get exactly the same dose',
    subtitleJa: '2 本の気道樹に、まったく同じ量の刺激',
  },
  cards: {
    normal: { label: 'Normal', labelJa: '正常' },
    asthma: { label: 'Asthma', labelJa: '喘息' },
  },
  /** The small tag beside the trees while the doses are equal. */
  badge: {
    label: 'Same dose, both trees',
    labelJa: '刺激量は両者とも同じ',
  },
  knee: {
    caption: 'One has tipped. The other has not.',
    captionJa: '片方だけが限界を越えました',
  },
  full: {
    caption: 'Push hard enough and a normal lung tips too',
    captionJa: '十分に強くすれば、正常な肺も限界を越えます',
  },
  takeHome: {
    title: 'Hyperresponsiveness moves the knee',
    titleJa: '気道過敏性とは、変曲点が手前に来ること',
  },
  note: {
    text: 'Conceptual model · relative values · not for diagnosis',
    textJa: '概念モデル｜すべて相対値｜診断には使用できません',
  },
};

export const STORY_LABEL = {
  label: 'Walk through it',
  labelJa: '順に見る',
  hint: 'Seven steps, each one the cause of the next. You set the pace.',
};

export const LEARNING_LABEL = {
  label: 'Challenge',
  labelJa: 'チャレンジ',
  hint: 'Predict what the model will do, then make it do it',
};

export const DISCLAIMER =
  'Educational conceptual model of airway mechanics in a branching tree. Everything is relative — resistances are ' +
  'ratios to a healthy reference tree and calibres are fractions of their own baseline — because the absolute ' +
  'resistance of a real airway is not Poiseuille’s. No gas exchange, no blood, no perfusion is modelled. ' +
  'Not for diagnosis, staging or prediction.';
export const DISCLAIMER_JA =
  '分岐気道におけるメカニクスの教育用概念モデルです。実際の気道抵抗は Poiseuille 則には従わないため、値はすべて相対値' +
  '（抵抗は健常な基準気道樹との比、内径は自身のベースラインに対する割合）です。ガス交換・血流・灌流はモデル化して' +
  'いません。診断・重症度判定・予測には使用できません。';
export const DISCLAIMER_SHORT = 'Conceptual airway model — relative values only, no gas exchange, not for diagnosis.';
export const DISCLAIMER_SHORT_JA = '気道の概念モデル｜すべて相対値。ガス交換は扱いません。診断には使用できません。';
