/**
 * Copy, palette, stages and control definitions for the pulmonary-oedema scene.
 *
 * Nothing here computes anything. Every number the reader sees is a reading of
 * `src/models/pulmonaryEdema.js`; this file says what to call it, what unit to
 * print it in, and how many digits the model can honestly carry.
 */

/**
 * The situations the reader can step into.
 *
 * They are settings of the same equations, never separate models, and the copy
 * says so — the whole point of the scene is that cardiogenic and
 * non-cardiogenic oedema are told apart by which term is abnormal.
 */
export const SITUATIONS = [
  {
    id: 'risingPressure',
    labelEn: 'A rising left atrium',
    labelJa: '左房圧が上がっていく',
    questionEn: 'A previously normal lung, and a left atrium climbing to 30 mmHg. Where does the water go?',
    questionJa: 'それまで正常だった肺で、左房圧が 30 mmHg まで上がっていきます。水はどこへ行くのか。',
    controls: { leftAtrialPressureMmHg: 30, chronicity: 0 },
  },
  {
    id: 'chronicAdaptation',
    labelEn: 'The same pressure, for years',
    labelJa: '同じ圧を、何年も',
    questionEn: 'The same climb to 30 mmHg, in a lung that has lived with it. Why is this one still dry?',
    questionJa: '同じく 30 mmHg まで上がりますが、長く付き合ってきた肺です。なぜこちらは乾いたままなのか。',
    controls: { leftAtrialPressureMmHg: 30, chronicity: 1 },
  },
  {
    id: 'permeabilityInjury',
    labelEn: 'Injured barrier',
    labelJa: '透過性の亢進',
    questionEn: 'A normal filling pressure, and a lung that floods anyway. Will albumin help?',
    questionJa: '充満圧は正常なのに浸水します。アルブミンは効くのか。',
    controls: { permeability: 3.2 },
  },
  {
    id: 'exertion',
    labelEn: 'On exertion',
    labelJa: '労作時',
    questionEn: 'Dry at rest, then three times the flow. The atrium has barely moved — what has?',
    questionJa: '安静時は乾いていて、そこから流量が 3 倍に。左房圧はほとんど動いていません。変わったのは何か。',
    controls: { leftAtrialPressureMmHg: 20, pulmonaryFlowLPerMin: 15 },
  },
  {
    id: 'hypoalbuminaemic',
    labelEn: 'Low albumin',
    labelJa: '低アルブミン血症',
    questionEn: 'Half the plasma protein, and the lung is wetter but not flooded. Why not?',
    questionJa: '血漿蛋白が半分。肺は湿っていますが浸水はしていません。なぜか。',
    controls: { plasmaOncoticPressureMmHg: 14 },
  },
];

/** @param {string} id */
export const situation = (id) => SITUATIONS.find((entry) => entry.id === id) ?? SITUATIONS[0];

/**
 * The read-out.
 *
 * Digits are chosen against what the model can carry, not against what the
 * number looks like: lung water to the nearest 10 mL because the interstitial
 * curve is invented, pressures to one decimal because they are the quantities
 * the equation is actually about.
 */
export const METRICS = [
  {
    id: 'water',
    key: 'lungWaterMl',
    label: 'Extravascular lung water',
    labelJa: '血管外肺水分量',
    unit: 'mL',
    digits: 0,
    emphasis: true,
  },
  {
    id: 'capillary',
    key: 'capillaryPressureMmHg',
    label: 'Capillary pressure',
    labelJa: '毛細血管圧',
    unit: 'mmHg',
    digits: 1,
    emphasis: true,
  },
  {
    id: 'net',
    key: 'netAccumulationMlPerHour',
    label: 'Net accumulation',
    labelJa: '正味の貯留',
    unit: 'mL/h',
    digits: 0,
    emphasis: true,
  },
  { id: 'filtration', key: 'filtrationMlPerHour', label: 'Filtration', labelJa: '濾過', unit: 'mL/h', digits: 0 },
  {
    id: 'lymph',
    key: 'lymphaticClearanceMlPerHour',
    label: 'Lymphatic clearance',
    labelJa: 'リンパ排出',
    unit: 'mL/h',
    digits: 0,
  },
  {
    id: 'interstitialPressure',
    key: 'interstitialPressureMmHg',
    label: 'Interstitial pressure',
    labelJa: '間質圧',
    unit: 'mmHg',
    digits: 1,
  },
  {
    id: 'alveolar',
    key: 'alveolarWaterMl',
    label: 'Water in alveoli',
    labelJa: '肺胞内の水',
    unit: 'mL',
    digits: 0,
  },
  { id: 'shunt', key: 'shuntFraction', label: 'Shunt', labelJa: 'シャント', unit: '%', scale: 100, digits: 0 },
  {
    id: 'pao2',
    key: 'arterialOxygenMmHg',
    label: 'PaO₂',
    labelJa: 'PaO₂',
    unit: 'mmHg',
    digits: 0,
    emphasis: true,
  },
  {
    id: 'aa',
    key: 'alveolarArterialDifferenceMmHg',
    label: 'A–a difference',
    labelJa: 'A-a 較差',
    unit: 'mmHg',
    digits: 0,
  },
];

export const SCOPE = {
  answersEn: [
    'Why a healthy lung filters continuously and still stays dry.',
    'Which space fills first, and why breathlessness comes before hypoxaemia.',
    'Why the same left atrial pressure floods one lung and not another.',
    'Why a lung dry at rest can flood on exertion with an unchanged atrial pressure.',
    'Why raising plasma protein protects an intact barrier and not an injured one.',
    'Why oxygen widens the A–a difference in a flooded lung instead of closing it.',
  ],
  answersJa: [
    '健常な肺が常に濾過していながら乾いたままでいられる理由。',
    'どの層から先に満ちるのか。そしてなぜ息切れが低酸素より先に来るのか。',
    '同じ左房圧が、ある肺を浸し、別の肺を浸さない理由。',
    '安静時に乾いている肺が、左房圧が変わらないまま労作で浸水する理由。',
    '血漿蛋白を上げることが、健常な壁は守り、傷んだ壁は守らない理由。',
    '浸水した肺で、酸素が A-a 較差を縮めるのではなく広げる理由。',
  ],
  notAnsweredEn: [
    'Where in the lung the water goes. There is no gravity here, so the model fills the lung evenly and real oedema is basal.',
    'How hard the person is breathing. There is no ventilation, no respiratory rate and no CO₂ in this model at all.',
    'What any real pressure or volume is. The threshold shown is this reference lung’s, and individual thresholds vary widely.',
    'What treatment would do. Nothing here models a diuretic, a vasodilator or positive pressure.',
  ],
  notAnsweredJa: [
    '肺のどこに水が溜まるか。重力を扱っていないため均一に満ちますが、実際の肺水腫は下肺野優位です。',
    '呼吸がどれだけ苦しいか。換気・呼吸数・CO₂ はこのモデルに一切含まれていません。',
    '実際の圧や量そのもの。表示される閾値はこの基準肺のものであり、個人差は非常に大きいものです。',
    '治療が何をするか。利尿薬・血管拡張薬・陽圧換気はいずれもモデル化していません。',
  ],
};

export const MODEL_SCOPE = {
  question: 'Above what pressure does water cross into the lung, and which space does it fill first?',
  questionJa: 'どの圧を超えると水は肺に染み出すのか。そして、どの層から満ちるのか。',
  answers: SCOPE.answersEn.map((text, index) => ({ text, textJa: SCOPE.answersJa[index] })),
  limits: SCOPE.notAnsweredEn.map((text, index) => ({ text, textJa: SCOPE.notAnsweredJa[index] })),
  sources: [
    'docs/model-cards/pulmonary-edema.md',
    'docs/model-evidence/pulmonary-edema.md',
    'src/models/pulmonaryEdema.js',
  ],
};

export const MODEL_CONTROLS_COPY = {
  title: 'What is pushing the water?',
  titleJa: '水を押しているのは何か',
  subtitle: 'Each control is a different term in one equation, not a severity',
  subtitleJa: 'どれも「重症度」ではなく、1 つの式の別々の項です',
  placement: 'console',
  reset: true,
};

export const CONTROLS = [
  {
    id: 'situation',
    kind: 'choice',
    label: 'Situation',
    labelJa: '状態',
    options: SITUATIONS.map((entry) => ({
      value: entry.id,
      label: entry.labelEn,
      labelJa: entry.labelJa,
      effect: entry.questionEn,
      effectJa: entry.questionJa,
    })),
  },
  {
    id: 'leftAtrialPressureMmHg',
    label: 'Left atrial pressure',
    labelJa: '左房圧',
    min: 4,
    max: 40,
    step: 0.5,
    unit: 'mmHg',
    format: (v) => `${v.toFixed(1)} mmHg`,
    effect: 'What a wedge pressure estimates',
    effectJa: '楔入圧が推定している圧',
  },
  {
    id: 'plasmaOncoticPressureMmHg',
    label: 'Plasma oncotic pressure',
    labelJa: '血漿膠質浸透圧',
    min: 8,
    max: 34,
    step: 0.5,
    unit: 'mmHg',
    format: (v) => `${v.toFixed(1)} mmHg`,
    effect: 'Falls with albumin — and takes the interstitial protein with it',
    effectJa: 'アルブミンとともに下がり、間質の蛋白も一緒に下げます',
  },
  {
    id: 'permeability',
    label: 'Barrier permeability',
    labelJa: '血管壁の透過性',
    min: 1,
    max: 6,
    step: 0.1,
    format: (v) => `×${v.toFixed(1)}`,
    effect: 'Above 1 leaks more water and reflects less protein',
    effectJa: '1 を超えると水は漏れやすく、蛋白は跳ね返せなくなります',
  },
  {
    id: 'chronicity',
    label: 'Lymphatic adaptation',
    labelJa: 'リンパの適応',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v < 0.05 ? 'none' : `${Math.round(v * 100)} %`),
    effect: 'Months at a raised pressure. An adaptation, and it protects',
    effectJa: '高い圧と過ごした月日。重症度ではなく適応で、肺を守ります',
  },
  {
    id: 'pulmonaryFlowLPerMin',
    label: 'Pulmonary blood flow',
    labelJa: '肺血流量',
    min: 2,
    max: 20,
    step: 0.5,
    unit: 'L/min',
    format: (v) => `${v.toFixed(1)} L/min`,
    effect: 'The capillary sits upstream of a resistance, so flow raises its pressure',
    effectJa: '毛細血管は抵抗の上流にあるため、流量が上がると圧も上がります',
  },
  {
    id: 'inspiredOxygenFraction',
    label: 'Inspired oxygen',
    labelJa: '吸入酸素濃度',
    min: 0.21,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)} %`,
    effect: 'Try it against a shunt',
    effectJa: 'シャントに対して試してみてください',
  },
];

export const PALETTE = {
  lung: '#d6949c',
  interstitial: '#6fb6d8',
  alveolar: '#e8d75f',
  capillary: '#c9564f',
  lymph: '#8fd6c4',
  dry: '#b9c6db',
};

export const LEGEND = [
  { key: 'lung', label: 'Lung', labelJa: '肺' },
  { key: 'capillary', label: 'Pulmonary capillary', labelJa: '肺毛細血管' },
  { key: 'interstitial', label: 'Interstitial water', labelJa: '間質の水' },
  { key: 'alveolar', label: 'Water in alveoli', labelJa: '肺胞内の水' },
  { key: 'lymph', label: 'Lymphatic clearance', labelJa: 'リンパ排出' },
];

/**
 * The one plot: filtration against lymphatic clearance, across pressure.
 *
 * The model's working shown rather than a picture of it — where the two curves
 * cross is where the lung stops being able to keep up, and that crossing is the
 * threshold the read-out reports. Both are solved from the same `solveSteadyState`
 * the 3D reads, so the plot cannot disagree with the lung beside it.
 */
export const CHARTS = [
  {
    id: 'filtration-balance',
    title: 'Filtration against clearance',
    titleJa: '濾過とリンパ排出',
    unitLabel: 'mL/h against left atrial pressure',
    height: 116,
    x: { unit: 'mmHg', ticks: [4, 10, 20, 30, 40] },
    y: { unit: 'mL/h', min: 0 },
    key: [
      { id: 'filtration', label: 'Filtration', labelJa: '濾過', color: PALETTE.capillary },
      { id: 'lymph', label: 'Lymphatic clearance', labelJa: 'リンパ排出', color: PALETTE.lymph },
    ],
  },
];

export const RANGE = { min: 0, max: 1, step: 0.01 };

export const PROGRESS_LABEL = {
  label: 'Left atrial pressure',
  labelJa: '左房圧',
  start: 'normal',
  startJa: '正常',
  end: 'flooded',
  endJa: '浸水',
};

export const STAGES = [
  {
    id: 'dry',
    name: 'Dry, and filtering',
    nameJa: '乾いていて、濾過している',
    at: 0,
    focus: ['capillary', 'lymphatic'],
    summary:
      'A normal lung filters about 20 mL an hour, every hour, and stays dry because the lymphatics carry exactly that away. The leak is not a fault; it is what feeds them.',
    summaryJa:
      '正常な肺は毎時およそ 20 mL を濾過し続け、それでも乾いています。リンパがちょうど同じ量を運び去っているからです。この漏れは欠陥ではなく、リンパを養っているものです。',
  },
  {
    id: 'buffered',
    name: 'The buffers are spending',
    nameJa: '緩衝がはたらいている',
    at: 0.4,
    focus: ['interstitium', 'lymphatic'],
    summary:
      'The pressure has risen and the lung is gaining water — quietly. Interstitial pressure is climbing off its subatmospheric floor, lymph flow is rising, and the protein is washing down. Nothing has reached an alveolus.',
    summaryJa:
      '圧が上がり、肺は静かに水を蓄え始めています。間質圧は陰圧から上がり、リンパ流は増え、蛋白は洗い流されています。まだ肺胞には何も届いていません。',
  },
  {
    id: 'interstitial',
    name: 'Interstitial oedema',
    nameJa: '間質性肺水腫',
    at: 0.68,
    focus: ['interstitium'],
    summary:
      'The interstitium is filling. This is the stage the chest radiograph changes in and the saturation does not — the gas exchange surface is still dry.',
    summaryJa:
      '間質が満ちてきています。胸部 X 線が変化しはじめ、しかし酸素飽和度はまだ動かない段階です。ガス交換面はまだ乾いています。',
  },
  {
    id: 'alveolar',
    name: 'Water in the alveoli',
    nameJa: '肺胞に水が入る',
    at: 1,
    focus: ['alveolar', 'shunt'],
    summary:
      'The buffers are spent and fluid is crossing into alveoli. Each flooded alveolus is perfused and not ventilated — a shunt — and now the saturation falls, and oxygen does not fix it.',
    summaryJa:
      '緩衝は使い切られ、水が肺胞に入り始めます。満ちた肺胞は灌流されていて換気されていない、つまりシャントです。ここで初めて飽和度が下がり、酸素では戻せません。',
  },
];

export const STORY_LABEL = { en: 'Walk through it', ja: '順に見る' };
export const LEARNING_LABEL = { en: 'Predict it', ja: '予測してみる' };

export const DISCLAIMER =
  'Educational conceptual model. One Starling equation and three buffers, solved for a reference adult lung. ' +
  'It has no ventilation and no gravity: it cannot say how hard someone is breathing, and it fills the lung evenly ' +
  'where real oedema is basal. Not for diagnosis, measurement or any decision about a person.';
export const DISCLAIMER_JA =
  '教育目的の概念モデルです。基準となる成人の肺について、1 つの Starling 式と 3 つの緩衝機構を解いています。' +
  '換気と重力を扱っていないため、呼吸のつらさは表現できず、実際には下肺野優位となる分布も均一に描かれます。' +
  '診断・計測・個人に関する判断には使用できません。';
export const DISCLAIMER_SHORT =
  'Conceptual model — no ventilation, no gravity. The threshold shown is this reference lung’s, not a person’s.';
export const DISCLAIMER_SHORT_JA =
  '概念モデル｜換気も重力も扱っていません。表示される閾値はこの基準肺のもので、個人の値ではありません。';
