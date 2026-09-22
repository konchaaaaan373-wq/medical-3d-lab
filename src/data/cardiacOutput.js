/**
 * Everything the cardiac-output scene says, in both languages.
 *
 * No physiology is computed here and no number that appears on screen is
 * stored here. The model solves; this file names. That separation is why a
 * reviewer can read one file to check the wording without reading the
 * mechanics, and why a wording change cannot move a value.
 *
 * The one rule this file exists to keep: **a control is named after the
 * quantity it moves.** "Preload" is not "how much fluid", "afterload" is not
 * "blood pressure", and "contractility" is not "ejection fraction". Where the
 * teaching word is the familiar one, it is offered as the subtitle beneath the
 * quantity, not in place of it.
 */
import { PRESET_IDS } from '../models/cardiacOutput.js';

export const PALETTE = {
  myocardium: '#b4505f',
  cavity: '#5e1d2a',
  flow: '#ff8a9c',
  residual: '#7d3a4a',
  artery: '#d2607a',
  vein: '#5a7098',
  resistance: '#ffc46b',
  outline: '#7ff0ff',
};

export const LEGEND = [
  { key: 'myocardium', label: 'Myocardium', labelJa: '心筋' },
  { key: 'cavity', label: 'Cavity', labelJa: '内腔' },
  { key: 'flow', label: 'Blood leaving', labelJa: '駆出される血液' },
  { key: 'residual', label: 'Blood left behind', labelJa: '残存する血液' },
  // Two colours, one meaning: red is oxygenated and blue is not. The run from
  // the lungs back to the left atrium is red for that reason and not because of
  // what it is called — pulmonary veins carry oxygenated blood, and a diagram
  // that paints them blue teaches the opposite.
  { key: 'artery', label: 'Oxygenated (schematic)', labelJa: '酸素化された血液（模式）' },
  { key: 'vein', label: 'Deoxygenated (schematic)', labelJa: '脱酸素化された血液（模式）' },
  { key: 'resistance', label: 'Where the resistance is', labelJa: '血管抵抗のある場所' },
];

/**
 * One stage, because there is no progression axis. The scene is about four
 * independent conditions, not a trajectory through one.
 */
export const STAGES = [
  {
    id: 'experiment',
    name: 'One factor at a time',
    nameJa: '1 つずつ変える',
    at: 0,
    summary: 'Change one thing and watch what the circulation does with it.',
    summaryJa: '1 つだけ変えて、循環がどう応えるかを見ます。',
  },
];

export const PRESET_OPTIONS = [
  {
    value: PRESET_IDS.REFERENCE,
    label: 'Reference heart',
    labelJa: '基準心',
    effect: 'a representative teaching condition',
    effectJa: '教育用の代表条件',
  },
  {
    value: PRESET_IDS.REDUCED_CONTRACTILITY,
    label: 'Reduced contractility',
    labelJa: '収縮力低下',
    effect: 'end-systolic elastance lowered · nothing else changed',
    effectJa: '左室 Ees のみ低下・他は同一',
  },
];

/**
 * The four controls.
 *
 * `label` is the quantity. `sublabel` is what it is actually parameterised as,
 * with its unit, and it is never left off — a reader who takes "circulating
 * filling" to mean a bag of saline has been misled by the label, and the
 * subtitle is where that is prevented.
 */
/**
 * The four controls.
 *
 * **The unit is part of the name.** "Contractility · 2.74" is a word that could
 * mean ejection fraction next to a number with nothing attached to it, and a
 * reader who takes "circulating filling" for a bag of saline has been misled by
 * a label. So each one carries the quantity it actually moves and the unit it
 * is in, on the control itself.
 *
 * It goes in the label rather than in a second line under it, and rather than
 * in the slider's read-out. A second line would need a smaller type size than
 * the label already uses, and the product has a 12px floor with a test that
 * enforces it (`tests/type-floor.test.js`); a long unit in the read-out
 * ("mmHg·s/mL") pushes the slider itself off a phone.
 */
export const CONTROLS = [
  {
    id: 'fillingVolumeMl',
    label: 'Circulating filling · stressed volume, mL',
    labelJa: '循環充満 ・ stressed volume（mL）',
    unit: '',
  },
  {
    id: 'systemicResistanceMmHgSPerMl',
    label: 'Systemic vascular resistance · mmHg·s/mL',
    labelJa: '体血管抵抗 ・ mmHg·s/mL',
    unit: '',
  },
  {
    id: 'contractilityEesMmHgPerMl',
    label: 'Contractility · LV elastance Ees, mmHg/mL',
    labelJa: '収縮力 ・ 左室エラスタンス Ees（mmHg/mL）',
    unit: '',
  },
  {
    id: 'heartRatePerMin',
    label: 'Heart rate · beats per minute',
    labelJa: '心拍数 ・ /min',
    unit: '',
  },
];

export const MODEL_CONTROLS = {
  primary: true,
  placement: 'console',
  title: 'Change one thing, and read what the circulation does',
  titleJa: '1 つ変えて、循環の答えを読む',
  subtitle:
    'Each control moves the quantity named under it. Every figure on screen is re-solved from the result; nothing is scaled afterwards.',
  subtitleJa:
    '各操作は、その下に書いてある量を動かします。画面の数値はすべて結果から解き直したもので、あとから倍率をかけてはいません。',
  reset: true,
};

export const COMPARISON_LABEL = {
  label: 'Before',
  labelJa: '操作前',
  description: 'Side by side with this preset’s starting condition — the same scale, the same phase.',
  descriptionJa: 'このプリセットの操作前の条件と並べます。縮尺も位相も同じです。',
};

export const PRESSURE_VOLUME_LABEL = {
  title: 'Pressure-volume loop',
  titleJa: '圧-容積ループ',
  subtitle: 'The solved beat, with the two relationships that produced it.',
  subtitleJa: '解かれた 1 拍と、それを生んだ 2 本の関係式。',
};

export const PRESSURE_WAVE_LABEL = {
  title: 'Pressure over the beat',
  titleJa: '1 拍の圧',
  subtitle: 'Ventricular, arterial and atrial. The shaded band is when the aortic valve is open.',
  subtitleJa: '左室・動脈・左房。網掛けは大動脈弁が開いている区間です。',
};

export const REEL_LABEL = {
  label: 'Reel',
  labelJa: 'リール',
  description: 'Fifteen seconds: raise the resistance, and watch pressure and output part company.',
  descriptionJa: '15 秒。抵抗を上げると、血圧と拍出が逆を向きます。',
};

export const LEARNING_LABEL = {
  label: 'Learn',
  labelJa: '学ぶ',
  description: 'Predict, move the control, compare, explain.',
  descriptionJa: '予測して、操作して、比べて、説明する。',
};

/**
 * Labels floating on the 3D.
 *
 * `text` is the English name and **`sub` is the Japanese one** — not a subtitle.
 * That is the layer's contract (`components/LabelLayer.js`), and getting it
 * wrong is silent: an English sentence in `sub` renders as the Japanese label,
 * so a Japanese reader gets four lines of English over the model and nothing
 * fails. It is what happened here, and it was visible only in a render.
 *
 * They are names, not explanations. What a thing means belongs on the scope
 * panel and in the legend, where there is room for a sentence; a label is for
 * pointing at something and saying what it is called.
 *
 * `compact: false` drops a label on a phone, where three is the limit.
 */
export const ANNOTATIONS = [
  { id: 'cavity', text: 'Left ventricular cavity', sub: '左室内腔', anchor: 'cavity', lead: [-190, 40] },
  { id: 'aorta', text: 'Out to the body', sub: '体循環へ', anchor: 'aorta', lead: [140, -60] },
  {
    id: 'resistance',
    text: 'Systemic vascular resistance',
    sub: '体血管抵抗（模式）',
    anchor: 'resistance',
    lead: [-150, -40],
  },
  {
    id: 'return',
    text: 'Venous return',
    sub: '静脈還流',
    anchor: 'return',
    compact: false,
    lead: [-40, 90],
  },
  {
    // The one label that is doing more than naming: without it the node is an
    // unexplained blob, and a reader is entitled to know that four compartments
    // of the model are standing behind it.
    id: 'node',
    text: 'Right heart and lungs (schematic)',
    sub: '右心と肺（模式）',
    anchor: 'node',
    compact: false,
    lead: [110, 60],
  },
];

/**
 * The scope panel: what this screen answers, what it does not, and where it
 * could mislead. Alongside the 3D, because a screen that shows numbers has to
 * carry the boundary of those numbers on the same screen.
 */
export const MODEL_SCOPE = {
  primary: true,
  question:
    'When filling, systemic resistance, contractility or rate changes, what happens to stroke volume, cardiac output and arterial pressure — and why?',
  questionJa:
    '循環充満・体血管抵抗・収縮力・心拍数を変えると、1回拍出量・心拍出量・動脈圧はどうなり、それはなぜか。',
  answers: [
    {
      text: 'Cardiac output and arterial pressure are results of a pump and a vascular bed interacting, not two separate facts.',
      textJa: '心拍出量と血圧は、ポンプと血管床の相互作用の結果であって、別々の事実ではありません。',
    },
    {
      text: 'Each condition is shown as the beat the circulation settles into once that condition is held.',
      textJa: 'どの条件も、その条件を保ったときに落ち着いた 1 拍として示します。',
    },
  ],
  excludes: [
    {
      text: 'Any reflex response. No baroreflex, no chemoreflex, no neurohormonal axis, no autoregulation — each control acts alone.',
      textJa: '反射性調節は一切ありません。圧受容体反射・化学受容体反射・神経体液性調節・自己調節はモデルにありません。',
    },
    {
      text: 'Oxygen delivery and consumption, lactate, arrhythmia, valve disease, the right heart as a subject, and drug time course.',
      textJa: '酸素供給・消費、乳酸、不整脈、弁膜症、右心そのもの、薬物の時間経過。',
    },
    {
      text: 'Central venous pressure — there is no right atrium in this model.',
      textJa: '中心静脈圧。このモデルに右房区画はありません。',
    },
  ],
  cautions: [
    {
      text: '**“Circulating filling” is stressed volume, not blood volume and not a volume of fluid to give.** There is nowhere in this model for fluid to leave to.',
      textJa: '**「循環充満」は stressed volume であって、総血液量でも投与する輸液量でもありません。** このモデルに液体が出ていく先はありません。',
    },
    {
      text: '**Raising the rate shortens systole and diastole equally here.** A real heart shortens systole proportionally less, so the loss of filling time with tachycardia is under-represented.',
      textJa: '**このモデルは心拍数を上げると収縮期と拡張期が同じ比率で短縮します。** 実際の心臓では収縮期の短縮はより小さいので、頻脈で失われる充満時間は過小評価されています。',
    },
    {
      text: '**The reduced-contractility preset is one parameter lowered, not the heart-failure syndrome** — no remodelling, no fluid retention, no neurohormonal activation.',
      textJa: '**「収縮力低下」は Ees を 1 つ下げただけで、心不全という症候群ではありません** ——リモデリングも体液貯留も神経体液性活性化もありません。',
    },
    {
      text: 'Two conditions side by side are two settled states. The time between them on screen is the browser’s, not a drug’s.',
      textJa: '並んだ 2 条件は、落ち着いた 2 つの状態です。画面が切り替わるまでの時間は薬の効果発現時間ではありません。',
    },
  ],
  sources: [
    {
      text: 'Time-varying elastance (Suga & Sagawa 1974) as a framework; record confirmed, full text not read for this work and no coefficient fitted to it. Everything else is standard haemodynamic definitions.',
      textJa: '枠組みとして time-varying elastance（Suga & Sagawa 1974）。書誌情報のみ確認し本文は参照していません。係数の較正にも用いていません。他は標準的な血行動態の定義です。',
      kind: 'framework',
    },
  ],
};

export const DISCLAIMER =
  'Educational model. A representative teaching circulation with no reflex regulation — it shows why the relationships point the way they do, and predicts nothing about any patient.';
export const DISCLAIMER_JA =
  '教育用モデルです。反射性調節を持たない代表的な循環で、関係の向きと理由を示すものであり、個々の患者について何も予測しません。';
export const DISCLAIMER_SHORT = 'Educational model — a teaching circulation with no reflex regulation.';
export const DISCLAIMER_SHORT_JA = '教育用モデル — 反射性調節を持たない教育用の循環です。';

/** Shown in place of the read-out when a requested condition has no settled solution. */
export const UNSOLVED_NOTICE = {
  label: 'Showing the previous condition',
  labelJa: '表示は 1 つ前の条件です',
  value: 'the change was not applied',
  valueJa: '変更は反映されていません',
};
