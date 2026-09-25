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
    short: 'Reference',
    shortJa: '基準',
    effect: 'a representative teaching condition',
    effectJa: '教育用の代表条件',
  },
  {
    value: PRESET_IDS.REDUCED_CONTRACTILITY,
    label: 'Reduced contractility',
    labelJa: '収縮力低下',
    short: 'Reduced contractility',
    shortJa: '収縮力低下',
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
    // "Circulating filling, in the model" rather than "stressed volume".
    // The conserved quantity is not a physiological stressed blood volume and
    // must not be compared with one: it is the passive compartments' stressed
    // volumes plus the *whole* volume of the three chambers, which is a sum
    // over two different zero-pressure references. See MODEL_SCOPE.
    id: 'fillingVolumeMl',
    // A name short enough for a read-out row. The full label belongs on the
    // control, where there is a line to spend on it.
    short: 'Filling',
    shortJa: '充満量',
    label: 'Circulating filling (model quantity, mL)',
    labelJa: '循環充満量（モデル内の量・mL）',
    unit: '',
  },
  {
    // "the model's lumped resistance" — it is not a calibrated SVR, and the
    // pressure it is measured across is this model's systemic venous pressure,
    // which is not a central venous pressure.
    id: 'systemicResistanceMmHgSPerMl',
    // A name short enough for a read-out row. The full label belongs on the
    // control, where there is a line to spend on it.
    short: 'Resistance',
    shortJa: '血管抵抗',
    label: 'Systemic resistance (the model’s lumped resistance, mmHg·s/mL)',
    labelJa: '体血管抵抗（モデル内の集中抵抗・mmHg·s/mL）',
    unit: '',
  },
  {
    id: 'contractilityEesMmHgPerMl',
    // A name short enough for a read-out row. The full label belongs on the
    // control, where there is a line to spend on it.
    short: 'Contractility',
    shortJa: '収縮力',
    label: 'Contractility (LV elastance Ees, mmHg/mL)',
    labelJa: '収縮力（左室エラスタンス Ees・mmHg/mL）',
    unit: '',
  },
  {
    // The clause is on the control, not only in the model card: a reader who
    // moves this and watches output rise is one sentence away from taking
    // "faster is more" home, and nothing in the declared range contradicts
    // them (see §14 of the card).
    id: 'heartRatePerMin',
    // A name short enough for a read-out row. The full label belongs on the
    // control, where there is a line to spend on it.
    short: 'Rate',
    shortJa: '心拍数',
    label: 'Heart rate (/min) — not a model of tachycardia',
    labelJa: '心拍数（/min）— 頻脈の評価ではありません',
    unit: '',
  },
];

/**
 * The console's copy.
 *
 * No subtitle any more. The sentence that used to sit here — every figure is
 * re-solved, nothing is scaled — is true and belongs to the reader who opens
 * the four inputs, so it moved into the note that opens with them. On the face
 * of the console it was the fourth line of small print before the first
 * button, and the two step captions say what to do in fewer words.
 */
export const MODEL_CONTROLS = {
  primary: true,
  placement: 'console',
  // No heading. 「状態を選び、介入を 1 つ加える」 was an instruction written as
  // a title, and it read as one: the two captioned rows already say what they
  // are, and the title card says what the screen is for.
  title: '',
  titleJa: '',
  reset: true,
  // Back to where the *chosen condition* started — not to the page's opening
  // state. "Start over" read as the second, and it does not do that.
  resetLabel: 'Undo changes',
  resetLabelJa: '元に戻す',
  // The option cards carry only their names. What each does is said where it
  // is read against the figures — the first row of the read-out — and in the
  // button's title, so the console is a row of choices rather than a grid of
  // paragraphs.
  hideChoiceEffects: true,
  advanced: {
    // Short: it shares a line with the toolbar, and at 1024 px the longer
    // 「（4 つを自分で動かす）」 pushed the toolbar's labels onto one character
    // per line. The note inside says what the four are.
    label: 'Adjust the inputs',
    labelJa: '詳細パラメータ',
    // What a reader needs before dragging: one quantity per slider, and that
    // dragging clears the intervention. "Nothing is scaled afterwards" was an
    // assurance about the implementation; it stays in the model card.
    note: 'Each slider changes only the quantity named on it. Moving one clears the selected intervention.',
    noteJa: '各スライダーは、書かれている量だけを変えます。動かすと、選んでいた介入は解除されます。',
  },
};

/**
 * Which console buttons are the experiment and which are the rest.
 *
 * Kept in view: the comparison with where this state started, the loop and
 * waveform, and the lessons — the three things that are about the question.
 * Behind "More": the camera, the display options, the reel and the image
 * export, which serve other purposes and were competing with the choices at
 * the same weight.
 */
export const CONSOLE_LAYOUT = {
  overflow: ['zoom', 'inspection', 'reel', 'capture'],
};

export const COMPARISON_LABEL = {
  label: 'Compare with before',
  labelJa: '変更前と並べる',
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
/**
 * The first lesson: one factor, one question.
 *
 * Systemic vascular resistance, because it is where the two quantities this
 * scene is about come apart. Raise it and the pressure goes up while the output
 * goes down, at the same moment, on the same screen — which is the thing a
 * reader cannot get from memorising "cardiac output" and "blood pressure" as
 * two separate facts.
 *
 * **Every stored answer here is re-derived from the model by
 * `tests/cardiac-output-learning.test.js`.** The lesson is a claim about the
 * circulation, so the claim is checked; if the physics ever stopped producing
 * it, the build fails rather than the page teaching something false.
 */
export const LEARNING_MODULES = [
  {
    id: 'resistance-pressure-and-flow',
    title: 'Resistance: pressure up, flow down',
    titleJa: '血管抵抗 — 圧は上がり、流れは減る',
    /** Where the model starts. The reader's own condition is restored on exit. */
    setup: { progress: 0, preset: PRESET_IDS.REFERENCE, systemicResistanceMmHgSPerMl: 1.1 },

    question: {
      text: 'Raise systemic vascular resistance, and leave filling, contractility and rate alone. What happens to stroke volume?',
      textJa: '体血管抵抗だけを上げて、充満・収縮力・心拍数はそのままにします。1回拍出量はどうなりますか？',
      options: [
        { id: 'up', label: '↑  It rises', labelJa: '↑  増える' },
        { id: 'same', label: '→  Unchanged', labelJa: '→  変わらない' },
        { id: 'down', label: '↓  It falls', labelJa: '↓  減る' },
      ],
      answer: 'down',
    },

    manipulation: {
      control: 'systemicResistanceMmHgSPerMl',
      to: 1.6,
      seconds: 1.4,
      text: 'Raise the resistance and watch the pressure and the stroke volume at the same time.',
      textJa: '体血管抵抗を上げて、血圧と 1回拍出量を同時に見てください。',
      action: 'Raise resistance to 1.6',
      actionJa: '体血管抵抗を 1.6 にする',
      hint: 'You can drag the resistance slider yourself instead.',
      hintJa: '自分で体血管抵抗のスライダーを動かしても構いません。',
    },

    /** Rows to show before and after, and to highlight in the read-out. */
    watch: ['sv', 'map', 'esv'],
    observation: {
      text: 'Two of these moved in opposite directions.',
      textJa: '2 つが逆向きに動きました。',
    },

    explanation: {
      text:
        'A higher resistance means the ventricle has to reach a higher pressure before the ' +
        'aortic valve opens, and keeps working against a higher pressure while it is open. ' +
        'With contractility unchanged it cannot empty as far, so more blood is left at end ' +
        'systole and stroke volume falls. Mean arterial pressure rises all the same, because ' +
        'pressure is flow times resistance and the resistance rose by more than the flow fell.',
      textJa:
        '抵抗が上がると、大動脈弁が開くまでに心室が到達しなければならない圧が高くなり、開いてからも ' +
        'より高い圧に逆らって押し出すことになります。収縮力が同じなら、そこまで小さくなれません。' +
        '収縮末期に残る血液が増え、1回拍出量は減ります。それでも平均動脈圧は上がります——' +
        '圧は血流と抵抗の積で、抵抗の上がり幅が血流の下がり幅を上回るからです。',
      footnote:
        'So a rising blood pressure here is not a circulation doing better. The same screen ' +
        'is showing less blood leaving the heart each beat.',
      footnoteJa:
        'つまり、ここで血圧が上がったことは循環が良くなったことではありません。同じ画面が、' +
        '1 拍ごとに心臓から出ていく血液が減ったことを示しています。',
    },

    transfer: {
      /** The same rise, on the ventricle whose elastance is lower. */
      atPreset: PRESET_IDS.REDUCED_CONTRACTILITY,
      controls: { preset: PRESET_IDS.REDUCED_CONTRACTILITY },
      /** The row the comparison is measured on. */
      metric: 'sv',
      text: 'On the reduced-contractility heart, does the same rise in resistance cost more stroke volume or less?',
      textJa: '収縮力を下げた心臓では、同じ抵抗上昇で失う 1回拍出量は多い？ 少ない？',
      options: [
        { id: 'larger', label: 'More', labelJa: '多い' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'smaller', label: 'Less', labelJa: '少ない' },
      ],
      answer: 'larger',
      explanation: {
        text:
          'The weaker the ventricle, the larger the share of its stroke volume the same rise in ' +
          'resistance takes. Nothing in the model encodes that — it falls out of a lower ' +
          'end-systolic elastance, which is the only thing this preset changed.',
        textJa:
          '収縮力（Ees）が低い心室ほど、同じ抵抗上昇で失う 1回拍出量の割合は大きくなります。' +
          'これはモデルに書き込まれた挙動ではなく、Ees が低いことだけから出てくる帰結です——' +
          'このプリセットが変えているのは Ees だけです。',
      },
    },

    outro: {
      text: 'Now try the filling control, and watch what the end-diastolic pressure charges you for the output it buys.',
      textJa: '次は循環充満を動かして、増えた拍出量の代わりに拡張末期圧が何を要求するか見てください。',
    },
  },
];

/**
 * What the fifteen-second sequence says.
 *
 * **No number is written here.** `{co}`, `{map}` and the card figures are
 * interpolated from the scene's own read-out every frame, so a video cannot
 * quote a figure the interactive page would not show. A hand-written number in
 * this file would be a second source of truth with no test behind it, and it
 * would still be there after the model moved.
 */
export const REEL_COPY = {
  hook: {
    title: 'Same heart. One thing changes.',
    titleJa: '同じ心臓。変えるのは 1 つだけ。',
    subtitle: 'Systemic vascular resistance goes up — and nothing else.',
    subtitleJa: '上げるのは体血管抵抗だけ。他は何も変えません。',
  },
  cards: {
    before: { label: 'Before', labelJa: '操作前' },
    after: { label: 'Resistance raised', labelJa: '抵抗を上げたあと' },
  },
  raise: {
    caption: 'Raising the resistance',
    captionJa: '体血管抵抗を上げています',
  },
  compare: {
    caption: 'Pressure up. Output down. At the same moment.',
    captionJa: '血圧は上がり、拍出は減る。同じ瞬間に。',
  },
  residual: {
    label: 'Blood left behind at end systole',
    labelJa: '収縮末期に残る血液',
  },
  release: {
    caption: 'Put the resistance back, and both return.',
    captionJa: '抵抗を戻すと、どちらも戻ります。',
  },
  takeHome: {
    title: 'A higher blood pressure can mean less blood leaving the heart.',
    titleJa: '血圧が高いことは、心臓から出ていく血液が減っていることでもありえる。',
  },
  note: {
    text: 'Educational model · two settled conditions, not a treatment over time',
    textJa: '教育用モデル ・ 落ち着いた 2 条件の比較であって、治療の経過ではありません',
  },
};

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
 * Shown only side by side, where the two hearts are moved apart and the
 * ordinary annotations would point at the space between them. Without these the
 * comparison was two unnamed hearts, and which one was "before" had to be
 * inferred from the read-out.
 */
export const COMPARISON_ANNOTATIONS = [
  {
    id: 'before-heart',
    text: 'Before',
    sub: '変更前',
    anchor: 'comparisonBefore',
    comparisonOnly: true,
  },
  {
    id: 'current-heart',
    text: 'After',
    sub: '変更後',
    anchor: 'comparisonNow',
    comparisonOnly: true,
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
      text: 'Central venous pressure — there is no right atrium in this model. The systemic venous pressure shown is this model’s reservoir pressure and nothing more.',
      textJa: '中心静脈圧。このモデルに右房区画はありません。表示している体静脈圧は、このモデルのリザーバの圧であってそれ以上のものではありません。',
    },
    {
      text: 'Pulmonary capillary wedge pressure. The pulmonary venous compartment’s pressure is not a wedge pressure and not a capillary pressure, and no threshold in it is read as oedema.',
      textJa: '肺動脈楔入圧。肺静脈区画の圧は楔入圧でも毛細血管圧でもなく、その閾値から肺水腫を判定することもありません。',
    },
  ],
  cautions: [
    {
      text: '**“Circulating filling” is a quantity inside this model, not a blood volume and not a volume of fluid to give.** It is the passive compartments’ stressed volumes plus the whole volume of the three chambers — a sum over two different zero-pressure references — so it has no direct correspondence to a measured stressed blood volume. There is nowhere in this model for fluid to leave to.',
      textJa: '**「循環充満量」はこのモデル内部の量であって、総血液量でも投与する輸液量でもありません。** 受動血管区画の stressed volume と、心腔 3 つの全容積の和です——基準の異なる 2 種類の容積を足しているので、実測の stressed blood volume と直接対応しません。このモデルに液体が出ていく先はありません。',
    },
    {
      text: '**The resistance is this model’s lumped systemic resistance, and the pressure it works against is this model’s systemic venous pressure.** That is not a central venous pressure — there is no right atrium here — so the number is not a calibrated SVR and not a normal range.',
      textJa: '**この抵抗はモデルの集中抵抗で、その下流はモデルの体静脈圧です。** 中心静脈圧ではありません（右房区画がありません）ので、臨床で測る SVR に較正された値でも、正常範囲の代表でもありません。',
    },
    {
      text: '**Raising the rate shortens systole and diastole equally here.** A real heart shortens systole proportionally less, so the loss of filling time with tachycardia is under-represented. Across the grid that has been swept, output never fell as the rate rose — so this scene will not contradict a reader who concludes “faster is more”, and it is not evidence for it.',
      textJa: '**このモデルは心拍数を上げると収縮期と拡張期が同じ比率で短縮します。** 実際の心臓では収縮期の短縮はより小さいので、頻脈で失われる充満時間は過小評価されています。掃引した範囲では心拍数を上げて拍出が下がった条件はありません——**この画面は「速いほど多い」を否定しません。肯定する根拠でもありません。**',
    },
    {
      text: '**Holding one input fixed does not hold the outputs fixed.** Move the rate and the filling volume stays where it was; end-diastolic volume, filling pressure and arterial pressure all move, because they are what the loop settled on.',
      textJa: '**1 つの入力を固定することは、出力まで固定することではありません。** 心拍数を動かしても循環充満量はそのままですが、拡張末期容積・充満圧・動脈圧は動きます——それらは閉ループが落ち着いた結果だからです。',
    },
    {
      text: '**A rise in output alone does not tell you the circulation improved.** Nothing here measures oxygen delivery or consumption, and filling pressure can rise with it. Read both.',
      textJa: '**拍出の増加だけでは、循環状態の改善とは判断できません。** 酸素の需給はこのモデルにありませんし、充満圧が一緒に上がることもあります。両方を読んでください。',
    },
    {
      text: '**A change in ejection fraction alone does not tell you contractility changed**, and it is not a diagnosis. It moves when filling or resistance moves, with elastance untouched.',
      textJa: '**駆出率の変化だけから、収縮力の変化は判断できません。** 診断でもありません。エラスタンスを触らずに充満や抵抗を動かしても変わります。',
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
// Said once: the earlier line read 「教育用モデル — …教育用の循環です」.
export const DISCLAIMER_SHORT = 'Educational model. Reflex regulation is not included.';
export const DISCLAIMER_SHORT_JA = '教育用モデルです。反射による調節は含みません。';

/** Shown in place of the read-out when a requested condition has no settled solution. */
export const UNSOLVED_NOTICE = {
  label: 'Showing the previous condition',
  labelJa: '表示は 1 つ前の条件です',
  value: 'the change was not applied',
  valueJa: '変更は反映されていません',
};
