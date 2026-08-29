/**
 * Everything the COPD scene says, in both languages.
 *
 * No physiology lives here and no numbers are asserted here: every figure the
 * reader sees comes from [`src/models/copd.js`](../models/copd.js) at the
 * moment they see it. What this file holds is the wording, the palette, the
 * axes of the plots, and the boundary of the claim.
 */

export const PALETTE = {
  lung: '#d68f97',
  trapped: '#e0a04a',
  airway: '#8d9bb2',
  cartilage: '#aab6c6',
  diaphragm: '#c2707a',
  air: '#8fd8ff',
  ceiling: '#ff9c6b',
  tidal: '#8fd8ff',
  capacity: '#9fb0c8',
  relaxed: '#7ee0a8',
};

export const LEGEND = [
  { key: 'lung', label: 'Lung', labelJa: '肺' },
  { key: 'airway', label: 'Airway', labelJa: '気道' },
  { key: 'diaphragm', label: 'Diaphragm', labelJa: '横隔膜' },
  { key: 'air', label: 'Airflow', labelJa: '気流' },
  { key: 'trapped', label: 'Gas not given back', labelJa: '吐き切れなかった空気', activeFrom: 0.12 },
  { key: 'ceiling', label: 'At the flow ceiling', labelJa: '流量上限に達した状態', activeFrom: 0.3 },
];

/**
 * The scene's axis is what the body is asking for, from rest to hard work.
 *
 * Not a severity slider. Severity is a property of the lung and lives on the
 * model controls; this is a property of the moment, and it is the axis along
 * which dynamic hyperinflation actually develops — which is why it is the one
 * the reader drags.
 */
export const STAGES = [
  {
    id: 'rest',
    name: 'At rest',
    nameJa: '安静時',
    at: 0,
    focus: ['lungs', 'diaphragm'],
    summary:
      'Sitting still, about six and a half litres a minute. Expiration has nearly three seconds, and even a slow lung gets most of the way back down.',
    summaryJa:
      '安静時、分時換気量はおよそ 6.5 L。呼気に約 3 秒あり、時定数の長い肺でもほぼ元の容量まで戻れます。',
  },
  {
    id: 'light',
    name: 'Light exertion',
    nameJa: '軽い運動',
    at: 0.3,
    focus: ['lungs', 'trapped'],
    summary:
      'Eighteen litres a minute. The rate has risen, so expiratory time has fallen — and the lung is now being asked to empty in fewer time constants than it needs.',
    summaryJa:
      '分時換気量 18 L。呼吸数が上がった分だけ呼気時間が短くなり、肺は必要な時定数の数を下回る時間で吐き切ることを求められます。',
  },
  {
    id: 'moderate',
    name: 'Moderate work',
    nameJa: '中等度の運動',
    at: 0.6,
    focus: ['trapped', 'diaphragm'],
    summary:
      'Thirty litres a minute asked for. End-expiratory volume has climbed, inspiratory capacity has fallen, and the diaphragm is being held flat by a chest that never empties.',
    summaryJa:
      '要求換気量 30 L。呼気終末肺気量が上昇し、最大吸気量が低下します。吐き切れない胸郭に押されて横隔膜は平坦化します。',
  },
  {
    id: 'heavy',
    name: 'The ceiling',
    nameJa: '限界',
    at: 1,
    focus: ['trapped', 'airway'],
    summary:
      'Forty-five litres a minute asked for, and it is not being produced. The drive is at its maximum, the breath is being taken near total lung capacity, and pushing harder on the way out moves nothing.',
    summaryJa:
      '要求換気量 45 L に対し、実際には届きません。呼吸ドライブは上限に達し、一回換気は全肺気量の近くで行われ、呼気をどれだけ強くしても流量は増えません。',
  },
];

export const RANGE = { start: 'Rest', startJa: '安静', end: 'Hard work', endJa: '強い運動' };
export const PROGRESS_LABEL = { label: 'Ventilation being asked for', labelJa: '要求換気量' };

export const ANNOTATIONS = [
  { id: 'lungs', text: 'Lungs', sub: '肺', anchor: 'lungs', range: [0, 1] },
  { id: 'airway', text: 'Airways', sub: '気道', anchor: 'airway', range: [0, 1] },
  { id: 'diaphragm', text: 'Diaphragm', sub: '横隔膜', anchor: 'diaphragm', range: [0, 1], compact: false },
  {
    id: 'trapped',
    text: 'Gas not given back',
    sub: '吐き切れなかった空気',
    anchor: 'trapped',
    range: [0.15, 1],
    compact: false,
  },
];

/**
 * The plots.
 *
 * Two, because the mechanism has two halves and neither shows both. The
 * flow-volume loop shows *why* — the tidal breath running along a ceiling it
 * cannot cross. The volume-time trace shows *what happens as a result* — the
 * resting volume climbing, breath after breath, and the room to breathe in
 * closing from above.
 */
export const CHARTS = [
  {
    id: 'flow-volume',
    title: 'Flow against volume',
    titleJa: '流量-容量曲線',
    unitLabel: 'L/s against L',
    height: 116,
    x: { unit: 'L', ticks: [1, 2, 3, 4, 5, 6, 7], invert: true },
    y: { unit: 'L/s' },
    key: [
      { id: 'ceiling', label: 'Flow ceiling', labelJa: '流量上限', color: '#ff9c6b', dash: true },
      { id: 'tidal', label: 'This breath', labelJa: 'この呼吸', color: '#8fd8ff' },
    ],
  },
  {
    id: 'volume-time',
    title: 'Lung volume over time',
    titleJa: '肺気量の時間経過',
    unitLabel: 'L against s',
    height: 116,
    x: { unit: 's' },
    y: { unit: 'L' },
    key: [
      { id: 'tidal', label: 'Lung volume', labelJa: '肺気量', color: '#8fd8ff' },
      { id: 'capacity', label: 'Total capacity', labelJa: '全肺気量', color: '#9fb0c8', dash: true },
      { id: 'relaxed', label: 'Relaxed volume', labelJa: '弛緩位', color: '#7ee0a8', dash: true },
    ],
  },
];

/** Read-out rows. The values come from the model; only the wording is here. */
export const METRICS = [
  { id: 'ic', label: 'Inspiratory capacity', labelJa: '最大吸気量 (IC)', unit: 'L', emphasis: true },
  { id: 'eelv', label: 'End-expiratory volume', labelJa: '呼気終末肺気量', unit: 'L', emphasis: true },
  { id: 'vt', label: 'Tidal volume', labelJa: '一回換気量', unit: 'L' },
  { id: 've', label: 'Ventilation', labelJa: '分時換気量', unit: 'L/min' },
  { id: 'demand', label: 'Ventilation asked for', labelJa: '要求換気量', unit: 'L/min' },
  { id: 'te', label: 'Expiratory time', labelJa: '呼気時間', unit: 's' },
  { id: 'tau', label: 'Time constant τ = R·C', labelJa: '時定数 τ = R·C', unit: 's' },
  { id: 'tauCount', label: 'Time constants available', labelJa: '呼気時間 ÷ τ', unit: '×' },
  { id: 'limited', label: 'Expired at the ceiling', labelJa: '流量上限での呼出割合', unit: '%' },
  { id: 'pmus', label: 'Inspiratory pressure', labelJa: '吸気筋圧', unit: 'cmH₂O' },
  { id: 'tlc', label: 'Total lung capacity', labelJa: '全肺気量', unit: 'L' },
  { id: 'rv', label: 'Residual volume', labelJa: '残気量', unit: 'L' },
];

export const MODEL_CONTROLS = [
  {
    id: 'airwayResistance',
    label: 'Airway resistance',
    labelJa: '気道抵抗',
    min: 1,
    max: 4,
    step: 0.05,
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    id: 'elasticRecoil',
    label: 'Elastic recoil',
    labelJa: '弾性収縮力',
    min: 0.45,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    id: 'expiratoryEffort',
    label: 'Expiratory effort',
    labelJa: '呼気努力',
    min: 0,
    max: 2,
    step: 0.05,
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    id: 'bronchodilation',
    label: 'Bronchodilator',
    labelJa: '気管支拡張薬',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v === 0 ? 'none' : `${Math.round(v * 100)}%`),
  },
];

export const MODEL_SCOPE = {
  question: 'Why does an obstructed lung end up breathing at a higher volume, and why does that get worse with work?',
  questionJa:
    '閉塞のある肺は、なぜ高い肺気量で呼吸することになるのか。そしてなぜ、働くほど悪化するのか。',
  answers: [
    {
      text: 'How long a lung takes to empty, as the product of its resistance and its compliance.',
      textJa: '肺が吐き切るのにかかる時間を、抵抗とコンプライアンスの積として扱います。',
    },
    {
      text: 'Where end-expiratory volume settles when expiration is not given enough time — found by running the breaths, not set.',
      textJa:
        '呼気時間が足りないときに呼気終末肺気量がどこで落ち着くかを、呼吸を実際に回して求めます（値を決め打ちしていません）。',
    },
    {
      text: 'Why expiratory effort stops helping: the flow ceiling is set by elastic recoil and the collapsible airway, and contains no effort term.',
      textJa:
        '呼気努力が効かなくなる理由。流量上限は弾性収縮力と虚脱しうる気道で決まり、式の中に努力の項がありません。',
    },
    {
      text: 'Why a bronchodilator helps hyperinflation more than it abolishes flow limitation.',
      textJa: '気管支拡張薬が、流量制限の解消よりも過膨張の改善に効く理由。',
    },
  ],
  excludes: [
    {
      text: 'Gas exchange of any kind — no PaO₂, no PaCO₂, no SpO₂. None of them follows from lung volumes.',
      textJa:
        'ガス交換を一切扱いません（PaO₂・PaCO₂・SpO₂ を出しません）。いずれも肺気量からは導けないためです。',
    },
    {
      text: 'Airway inflammation, mucus and the small-airway pathology. The model has a resistance, not a reason for it.',
      textJa: '気道の炎症・粘液・末梢気道病変。モデルにあるのは抵抗の値であって、その原因ではありません。',
    },
    { text: 'The work of breathing, and dyspnoea.', textJa: '呼吸仕事量と呼吸困難感。' },
    { text: 'Any time course longer than a breath: no progression, no exacerbation.', textJa: '1 呼吸より長い時間経過（進行・増悪）。' },
  ],
  cautions: [
    {
      text: 'The flow ceiling understates flow near total lung capacity, where real maximal flow is wave-speed limited. Do not read a peak expiratory flow off it.',
      textJa:
        '全肺気量付近では流量上限を過小評価します（実際の最大流量は wave-speed 律速）。ピークフローの値としては読めません。',
    },
    {
      text: 'Effort here can never make trapping worse. In a real flow-limited lung, forced expiration can.',
      textJa:
        'このモデルでは努力がエアトラッピングを悪化させることはありません。実際の流量制限肺では、努力呼気が悪化させ得ます。',
    },
    {
      text: 'This is one obstructed lung, not a typical one. COPD is not a single phenotype.',
      textJa: 'これは 1 つの閉塞性肺であって、代表例ではありません。COPD は単一の表現型ではありません。',
    },
  ],
  sources: [
    {
      text: 'Standard respiratory mechanics (West; Nunn) for τ = R·C, the equal-pressure-point account of flow limitation, and reference lung volumes.',
      textJa:
        '標準的な呼吸生理学（West / Nunn）から、τ = R·C、equal pressure point による流量制限の説明、基準肺気量。',
      kind: 'textbook',
    },
    {
      text: 'Reviews of hyperinflation and exercise in COPD (ERS European Respiratory Review; COPD Research and Practice; Experimental Physiology) for the mechanism and for inspiratory capacity as its measure.',
      textJa:
        'COPD の過膨張と運動に関する総説（ERS ERR / COPD Research and Practice / Experimental Physiology）から、機序と、その指標としての最大吸気量。',
      kind: 'review',
    },
    {
      text: 'Expiratory time constant literature for 0.5–0.7 s normal and ~2.5 s in severe COPD.',
      textJa: '呼気時定数に関する文献から、正常 0.5–0.7 秒、重症 COPD で約 2.5 秒。',
      kind: 'review',
    },
    {
      text: 'Consulted through search-result summaries, not full text — the medical publishers were unreachable from the network this was built on. Every constant is a textbook central value or a stated calibration; none is fitted.',
      textJa:
        '出典はいずれも検索結果の要約を通じて確認したもので、本文は参照していません（構築環境から医学系出版社に到達できないため）。定数はすべて教科書的な代表値か、明示した較正値であり、実測へのフィッティングは行っていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/copd.md',
};

export const STORY_LABEL = {
  label: 'Walk through it',
  labelJa: '順に見る',
  hint: 'Eight steps, each one the cause of the next. You set the pace.',
};

export const LEARNING_LABEL = {
  label: 'Challenge',
  labelJa: 'チャレンジ',
  hint: 'Predict what the model will do, then make it do it',
};

export const DISCLAIMER =
  'Educational conceptual model of respiratory mechanics. Volumes, flows and times come from a twelve-unit ' +
  'lung model calibrated to textbook central values, not from measurements of a person. No gas exchange is ' +
  'modelled. Not for diagnosis, staging or prediction.';
export const DISCLAIMER_JA =
  '呼吸メカニクスの教育用概念モデルです。容量・流量・時間はいずれも、教科書的代表値に較正した 12 単位の肺モデル' +
  'から導いたもので、個人の実測値ではありません。ガス交換はモデル化していません。診断・重症度判定・予測には使用できません。';
export const DISCLAIMER_SHORT = 'Conceptual model of lung mechanics — no gas exchange, not for diagnosis.';
export const DISCLAIMER_SHORT_JA = '肺メカニクスの概念モデル｜ガス交換は扱いません。診断には使用できません。';
