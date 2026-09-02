/**
 * Everything the minimal circulation scene says, in both languages.
 *
 * The medical values are produced by src/models/circulation.js. This file owns
 * wording, palette and the boundary of the claim.
 */

export const PALETTE = {
  output: '#ff6f86',
  pressure: '#58d9f2',
  resistance: '#7de3f1',
  delivery: '#ffd166',
};

export const LEGEND = [
  { key: 'output', label: 'Blood flow / cardiac output', labelJa: '血流・心拍出量' },
  { key: 'resistance', label: 'Distributed vascular tone / SVR', labelJa: '全身の血管トーン・SVR' },
  { key: 'delivery', label: 'O2 carried per minute (calculated global DO2)', labelJa: '動脈血が運ぶ酸素/分（計算上のglobal DO₂）' },
];

export const STAGES = [
  {
    id: 'map-trap',
    name: 'MAP 70 — what is holding it up?',
    nameJa: 'MAP 70。何が支えている？',
    at: 0,
    focus: ['co', 'svr', 'do2'],
    summary:
      'High SVR supports MAP 70 in this constructed low-flow case. Choose one state and compare MAP, CO and calculated global DO2 with baseline. The yellow stream is oxygen carried in arterial blood — not measured tissue oxygenation or oxygen use.',
    summaryJa:
      'この低血流の概念症例では、高いSVRがMAP 70を支えています。状態を1つ選び、MAP・CO・計算上のglobal DO₂を基準と比較します。黄色い流れは動脈血が運ぶ酸素であり、組織酸素化や酸素利用の実測ではありません。',
  },
];

export const ANNOTATIONS = [
  { id: 'co', text: 'Flow / cardiac output', sub: '血流・心拍出量 CO', anchor: 'co', range: [0, 1], lead: [-34, -76] },
  { id: 'map', text: 'Arterial pressure', sub: '平均血圧 MAP', anchor: 'map', range: [0, 1], lead: [-5, -82] },
  { id: 'svr', text: 'Distributed vascular tone', sub: '全身血管抵抗 SVR', anchor: 'svr', range: [0, 1], lead: [28, -78] },
  { id: 'do2', text: 'Calculated global DO2', sub: '計算上の全身DO₂', anchor: 'do2', range: [0, 1], lead: [56, -68] },
];

export const MODEL_CONTROLS = {
  primary: true,
  placement: 'console',
  title: 'Choose one state, then compare with baseline',
  titleJa: '状態を1つ選び、基準と比べる',
  subtitle: 'These are not doses and cannot be combined. CaO2 is fixed; global DO2 is calculated from CO.',
  subtitleJa: '用量ではなく、併用もできません。CaO₂固定で、global DO₂はCOから算出します。',
  reset: false,
};

export const INTERVENTION_OPTIONS = [
  {
    value: 'baseline',
    label: 'Baseline',
    labelJa: '基準',
    effect: 'MAP 70 · low unindexed flow',
    effectJa: 'MAP 70・低い非補正CO',
  },
  {
    value: 'fluid',
    label: 'Fluid-responsive state',
    labelJa: '輸液反応',
    effect: 'preload/SV up · SVR unchanged',
    effectJa: '前負荷・SV↑／SVR不変',
  },
  {
    value: 'dobutamine',
    label: 'Dobutamine state',
    labelJa: 'DOB反応',
    effect: 'contractile SV up · SVR down',
    effectJa: '収縮性SV↑／SVR↓',
  },
];

export const MODEL_SCOPE = {
  primary: true,
  question:
    'In one constructed low-flow case, can MAP remain near 70 while CO and calculated global oxygen delivery rise?',
  questionJa:
    '1つの低血流概念症例で、COと計算上のglobal DO₂が増えても、MAPが70付近に見えることがあるか。',
  answers: [
    {
      text: 'MAP depends on both flow and resistance; it cannot reveal either one by itself.',
      textJa: 'MAPは血流と血管抵抗の両方で決まり、単独ではどちらも判定できません。',
    },
    {
      text: 'With CaO2 fixed, calculated global DO2 changes in direct proportion to CO.',
      textJa: 'CaO₂固定では、計算上のglobal DO₂はCOに比例して変化します。',
    },
  ],
  excludes: [
    {
      text: 'Tissue oxygen tension, microcirculation, oxygen extraction, VO2, lactate and organ-specific perfusion.',
      textJa: '組織酸素分圧、微小循環、酸素抽出、VO₂、乳酸、臓器別灌流。',
    },
    {
      text: 'Dose, combined treatment, adverse effects, congestion, arrhythmia and treatment selection.',
      textJa: '用量、併用治療、有害事象、うっ血、不整脈、治療選択。',
    },
  ],
  cautions: [
    {
      text: '**Calculated global DO2 is not measured tissue oxygenation.** The neutral tissue stays neutral on purpose.',
      textJa: '**計算上のglobal DO₂は、組織酸素化の実測ではありません。** そのため組織は発光させません。',
    },
    {
      text: 'CO and DO2 are unindexed. “Low” describes this constructed comparison and is not a universal threshold.',
      textJa: 'COとDO₂は体格補正していません。「低い」はこの概念症例内の比較で、普遍的閾値ではありません。',
    },
  ],
  sources: [
    {
      text: 'Standard haemodynamic and oxygen-content definitions; ESICM 2025 guidance for the need to assess tissue perfusion, fluid responsiveness and flow beyond arterial pressure.',
      textJa: '標準的な血行動態・酸素含量の定義、および動脈圧だけでなく組織灌流・輸液反応性・血流を評価するESICM 2025。',
      kind: 'guideline',
    },
    {
      text: 'Small historical clinical studies support only the direction of the two selected responses. Every magnitude here is illustrative.',
      textJa: '小規模な既報は2つの反応の方向のみを支持します。画面上の変化量はすべて例示です。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/circulation.md',
};

export const DISCLAIMER =
  'CONCEPTUAL MODEL — three illustrative states, not doses or treatment predictions. Global DO2 is calculated from fixed CaO2 and does not measure tissue oxygenation. Not for diagnosis or clinical decisions.';
export const DISCLAIMER_JA =
  '概念モデル｜3つの例示状態であり、用量・治療予測ではありません。global DO₂は固定CaO₂からの計算値で、組織酸素化の実測ではありません。診断・臨床判断には使用できません。';
export const DISCLAIMER_SHORT = 'Conceptual model · calculated global DO2 · not tissue oxygenation or treatment guidance.';
export const DISCLAIMER_SHORT_JA = '概念モデル｜global DO₂は計算値｜組織酸素化・治療判断には使用不可';
