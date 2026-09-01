/**
 * Copy for the renal filtration scene — the words, and nothing that computes.
 *
 * Every number a reader sees is derived from `src/models/renalFiltration.js`
 * at run time. Nothing here is a stored result: the moment a value is written
 * down in this file, it is a second source of truth that will disagree with
 * the model on the day somebody changes a constant.
 *
 * Japanese first, as everywhere else in the product.
 */

/**
 * The situations the scene can be put in, keyed by the ids in the model's
 * `PRESET_CONTROLS`. The model holds the controls; this holds what they mean.
 */
export const SITUATIONS = [
  {
    id: 'normal',
    labelJa: '正常',
    labelEn: 'Normal kidney',
    questionJa: '濾過には何が必要で、尿細管は何を取り戻しているのか。',
    questionEn: 'What does filtration cost, and what does the tubule take back?',
    noteJa:
      '毎分 125 mL——1 日 180 L が濾過され、その 99% 以上が再吸収されて戻ります。腎臓の仕事の大半は「濾すこと」ではなく「濾しすぎたものを取り戻すこと」です。',
    noteEn:
      'About 125 mL a minute — 180 litres a day — is filtered, and more than 99 % of it is taken back. Most of the kidney\'s work is not filtering; it is recovering what filtering threw away.',
  },
  {
    id: 'prerenal',
    labelJa: '腎前性 — 灌流低下、尿細管は健常',
    labelEn: 'Pre-renal — perfusion lost, tubule intact',
    questionJa: '尿細管が無傷なのに、なぜナトリウムを手放さなくなるのか。',
    questionEn: 'Why does an intact kidney with a low blood pressure hold on to sodium?',
    noteJa:
      '輸入細動脈は拡張し、アンジオテンシン II が輸出細動脈を締めて濾過圧を支えます。濾過率（FF）が保たれるため、輸出血液の膠質浸透圧が上がり、近位尿細管の再吸収が増えます。FENa が 1% を下回るのは、覚えるべき規則ではなく、この結果です。',
    noteEn:
      'The afferent arteriole dilates and angiotensin II tightens the efferent one, holding filtration pressure up. Filtration fraction is defended, so the blood leaving the glomerulus is more concentrated, the peritubular oncotic pressure rises, and the proximal tubule reabsorbs more. FENa below 1 % is not a rule to memorise — it is that.',
  },
  {
    id: 'tubularInjury',
    labelJa: '急性尿細管障害',
    labelEn: 'Acute tubular injury',
    questionJa: '上皮が傷むと、なぜ同じ指標が逆転するのか。',
    questionEn: 'Why do the same numbers invert once the epithelium is damaged?',
    noteJa:
      '再吸収できない上皮からはナトリウムも尿素も漏れ、FENa は上がり BUN/Cr 比は下がります。さらに、遠位に届くナトリウムが「濾過しすぎ」と読まれて輸入細動脈が締まり（尿細管糸球体フィードバック）、脱落した上皮の円柱が Bowman 腔圧を上げます。だから GFR も落ちます。',
    noteEn:
      'An epithelium that cannot reabsorb leaks sodium and urea alike, so FENa rises and the urea-to-creatinine ratio falls. On top of that, the sodium arriving distally is read as too much filtration and the afferent arteriole constricts, while sloughed cells obstruct tubules and raise the pressure in Bowman\'s space. That is why the GFR falls too.',
  },
  {
    id: 'obstruction',
    labelJa: '腎後性閉塞',
    labelEn: 'Obstruction below the kidney',
    questionJa: '下流の閉塞は、どの項を通して濾過を止めるのか。',
    questionEn: 'How does a blockage downstream reach into the Starling equation?',
    noteJa:
      'Bowman 腔の静水圧です。糸球体より下流の閉塞が濾過に触れる経路はここしかありません——そしてそれで十分で、糸球体毛細血管圧に届けば濾過は止まります。',
    noteEn:
      "The hydrostatic pressure in Bowman's space. It is the only term a blockage below the glomerulus can reach — and it is enough: when it meets the capillary pressure, filtration stops.",
  },
  {
    id: 'chronic',
    labelJa: '慢性腎臓病 — ネフロン喪失',
    labelEn: 'Chronic disease — nephrons lost',
    questionJa: 'ネフロンを 4 分の 3 失っても、なぜ GFR は 4 分の 1 にならないのか。',
    questionEn: 'Why does losing three quarters of the nephrons not cost three quarters of the GFR?',
    noteJa:
      '残ったネフロンが拡張し、1 個あたりの濾過量が増えるからです。だから慢性腎臓病は長く無症状で、そして同じ代償が糸球体を高血圧に晒し続けます。代償は保護であると同時に、次の傷害でもあります。',
    noteEn:
      'The survivors dilate and each filters more. That is why chronic kidney disease is silent for so long — and why the same compensation keeps the remaining glomeruli under a raised pressure. The compensation is also the injury.',
  },
  {
    id: 'nephrotic',
    labelJa: 'ネフローゼ — バリアの選択性喪失',
    labelEn: 'Nephrotic — the barrier stops selecting',
    questionJa: '濾過量はほぼ正常なのに、なぜ大量の蛋白が失われるのか。',
    questionEn: 'Why can filtration be almost normal while grams of protein are lost?',
    noteJa:
      '壊れているのは濾過の量ではなく、選択性です。アルブミンのふるい係数がわずかに上がるだけで、1 日 180 L という濾過量に掛かれば数グラムになります。近位尿細管の再吸収能はすぐ飽和します。',
    noteEn:
      'What broke is not how much is filtered but what is let through. A small rise in the albumin sieving coefficient, multiplied by 180 litres a day, is grams — and the proximal tubule\'s capacity to take it back saturates almost immediately.',
  },
  {
    id: 'efferentSupportWithdrawn',
    labelJa: '輸出細動脈の支持を外す',
    labelEn: 'Efferent support withdrawn',
    questionJa: '腎保護薬が、灌流の悪い腎ではなぜ GFR を落とすのか。',
    questionEn: 'Why does a drug that protects kidneys drop the GFR of a poorly perfused one?',
    noteJa:
      '腎前性の状態と同じ腎で、輸出細動脈の収縮だけを外したものです。腎血流はむしろ増えるのに GFR は下がります——支えていたのは流量ではなく、輸出側の抵抗が作っていた濾過圧だったからです。',
    noteEn:
      'The same poorly perfused kidney as the pre-renal case, with only the efferent constriction removed. Renal blood flow actually rises while the GFR falls — because what was holding filtration up was not flow, it was the pressure the efferent resistance created.',
  },
];

/** @param {string} id */
export const situation = (id) => SITUATIONS.find((entry) => entry.id === id) ?? SITUATIONS[0];

/**
 * The read-out.
 *
 * `key` names a field of the model's solved state; nothing here stores a
 * value. `digits` is a claim about precision, and it is deliberately mean:
 * quoting a GFR to two decimal places would assert an accuracy this model
 * does not have.
 *
 * `emphasis` marks the rows that answer the scene's question. The rest are
 * there so the answer can be checked rather than believed.
 */
export const METRICS = [
  { id: 'gfr', key: 'gfrMlPerMin', label: 'GFR', labelJa: 'GFR', unit: 'mL/min', digits: 0, emphasis: true },
  {
    id: 'fena',
    key: 'fractionalSodiumExcretion',
    label: 'FENa',
    labelJa: 'FENa',
    unit: '%',
    scale: 100,
    digits: 2,
    emphasis: true,
  },
  {
    id: 'ratio',
    key: 'bunToCreatinineRatio',
    label: 'BUN : creatinine',
    labelJa: 'BUN/Cr 比',
    unit: '',
    digits: 0,
    emphasis: true,
  },
  {
    id: 'uosm',
    key: 'urineOsmolalityMosmKg',
    label: 'Urine osmolality',
    labelJa: '尿浸透圧',
    unit: 'mOsm/kg',
    digits: 0,
    emphasis: true,
  },
  {
    id: 'sngfr',
    key: 'singleNephronGfrNlPerMin',
    label: 'Single-nephron GFR',
    labelJa: '1 ネフロンあたり GFR',
    unit: 'nL/min',
    digits: 0,
  },
  { id: 'rbf', key: 'renalBloodFlowMlPerMin', label: 'Renal blood flow', labelJa: '腎血流量', unit: 'mL/min', digits: 0 },
  {
    id: 'pgc',
    key: 'glomerularCapillaryPressureMmHg',
    label: 'Glomerular capillary pressure',
    labelJa: '糸球体毛細血管圧',
    unit: 'mmHg',
    digits: 0,
  },
  {
    id: 'pbs',
    key: 'bowmanPressureMmHg',
    label: "Bowman's space pressure",
    labelJa: 'Bowman 腔圧',
    unit: 'mmHg',
    digits: 0,
  },
  {
    id: 'puf',
    key: 'netFiltrationPressureMmHg',
    label: 'Net filtration pressure',
    labelJa: '正味濾過圧',
    unit: 'mmHg',
    digits: 1,
  },
  {
    id: 'ff',
    key: 'filtrationFraction',
    label: 'Filtration fraction',
    labelJa: '濾過率 FF',
    unit: '%',
    scale: 100,
    digits: 1,
  },
  {
    id: 'feurea',
    key: 'fractionalUreaExcretion',
    label: 'FEurea',
    labelJa: 'FEurea',
    unit: '%',
    scale: 100,
    digits: 0,
  },
  { id: 'una', key: 'urineSodiumMmolL', label: 'Urine sodium', labelJa: '尿中 Na', unit: 'mmol/L', digits: 0 },
  { id: 'uvol', key: 'urineVolumeLPerDay', label: 'Urine volume', labelJa: '尿量', unit: 'L/day', digits: 2 },
  {
    id: 'protein',
    key: 'urinaryProteinGPerDay',
    label: 'Urinary protein',
    labelJa: '尿蛋白',
    unit: 'g/day',
    digits: 2,
  },
  {
    id: 'creatinine',
    key: 'steadyStatePlasmaCreatinineMgDl',
    label: 'Plasma creatinine (steady state)',
    labelJa: '血清 Cr（定常状態）',
    unit: 'mg/dL',
    digits: 2,
  },
];

/**
 * What the scene must say about itself before it is allowed to show a number.
 *
 * The scope panel is one of the four things an `alpha` scene has to have, and
 * it is the one a reader actually sees. Everything in `notAnswered` is
 * something this model genuinely cannot do — not a disclaimer added for
 * safety, but the boundary of the maths.
 */
export const SCOPE = {
  answersJa: [
    '濾過が落ちるとき、ネフロンのどこで落ちているのか',
    'FENa・FEurea・BUN/Cr 比・尿浸透圧が、なぜその向きに動くのか',
    '輸入・輸出細動脈の緊張が、濾過量と腎血流を逆向きに動かしうる理由',
    'ネフロンを失った腎で、残りが何をしているのか',
  ],
  answersEn: [
    'Where in the nephron filtration has failed, when it has',
    'Why FENa, FEurea, the urea-to-creatinine ratio and urine osmolality move the way they do',
    'How afferent and efferent tone can move filtration and blood flow in opposite directions',
    'What the surviving nephrons are doing in a kidney that has lost some',
  ],
  notAnsweredJa: [
    '**いまの血清クレアチニン値**。本モデルは定常状態を解きます。急性の GFR 低下後、実際のクレアチニンが新しい定常値に達するまでには数日かかります——臨床でクレアチニンが遅れて上がるのは、まさにこの差です。',
    '個々の患者の予後・薬剤投与量・輸液量。教育用の概念モデルであり、患者シミュレーターではありません。',
    '酸塩基平衡、カリウム、リン、カルシウム、ビタミン D、エリスロポエチン。腎不全の臨床像の大部分はここにありますが、本モデルには入っていません。',
    '腎臓の外側。体液量そのもの、心拍出量、肝腎連関。アルドステロンと ADH は「体からの指示」として外から与える制御であって、本モデルが導くものではありません。',
    '時間経過。ネフロン喪失の進行速度も、急性障害からの回復も扱いません。',
  ],
  notAnsweredEn: [
    "**Today's plasma creatinine.** This model solves a steady state. After a sudden fall in GFR, real creatinine takes days to reach the value the new GFR implies — that lag is exactly why creatinine understates acute injury on the first morning.",
    'Prognosis, drug dosing or fluid prescription for an individual. It is an educational conceptual model, not a patient simulator.',
    'Acid–base, potassium, phosphate, calcium, vitamin D, erythropoietin. Much of what makes kidney failure a clinical problem lives there, and none of it is in here.',
    'Anything outside the kidney. Volume status itself, cardiac output, the liver. Aldosterone and ADH are inputs standing in for a body that is not modelled, not conclusions the model reaches.',
    'Time. Neither the rate at which nephrons are lost nor recovery from acute injury is modelled.',
  ],
};

/**
 * The learning module: predict, act, observe, explain.
 *
 * The answer is not stored as a number. It is stored as the comparison the
 * model must satisfy, and `tests/renal-filtration-teaching.test.js` re-derives
 * it from the model — so a lesson cannot outlive the physiology it teaches.
 */
export const LEARNING = {
  id: 'efferent-support',
  titleJa: '輸出細動脈の支持を外すと、GFR はどうなるか',
  titleEn: 'What happens to GFR when efferent support is withdrawn?',
  questionJa:
    '灌流が悪く、アンジオテンシン II が輸出細動脈を締めて濾過を支えている腎があります。この収縮だけを外すと、腎血流と GFR はそれぞれどうなりますか。',
  questionEn:
    'A poorly perfused kidney is holding its filtration up with angiotensin II constricting the efferent arteriole. Remove only that constriction. What happens to renal blood flow, and what happens to GFR?',
  options: [
    { id: 'both-fall', labelJa: '両方とも下がる', labelEn: 'Both fall' },
    { id: 'both-rise', labelJa: '両方とも上がる', labelEn: 'Both rise' },
    { id: 'flow-up-gfr-down', labelJa: '腎血流は上がり、GFR は下がる', labelEn: 'Blood flow rises, GFR falls' },
    { id: 'flow-down-gfr-up', labelJa: '腎血流は下がり、GFR は上がる', labelEn: 'Blood flow falls, GFR rises' },
  ],
  answer: 'flow-up-gfr-down',
  explanationJa:
    '輸出細動脈は糸球体の**下流**にあります。締めれば下流の抵抗が増えて流れは減りますが、その抵抗が糸球体毛細血管に圧を溜めるので濾過は増えます。外せば逆——流れは増え、圧は抜け、濾過は落ちます。GFR を支えていたのは流量ではなく圧でした。',
  explanationEn:
    'The efferent arteriole is **downstream** of the glomerulus. Constricting it adds downstream resistance, so flow falls — but that resistance dams pressure up in the glomerular capillary, so filtration rises. Removing it does the reverse: flow rises, the pressure drains away, and filtration falls. What was holding the GFR up was pressure, not flow.',
  /** The comparison the model must satisfy, checked in CI. */
  assertion: {
    from: 'prerenal',
    to: 'efferentSupportWithdrawn',
    expect: { renalBloodFlowMlPerMin: 'rises', gfrMlPerMin: 'falls' },
  },
};

// ---------------------------------------------------------------------------
// Scene copy
// ---------------------------------------------------------------------------

export const PALETTE = {
  tubule: '#d8b46a',
  medulla: '#8a6f9c',
  filtrate: '#e8d75f',
  afferent: '#d2564f',
  efferent: '#b8735f',
};

/**
 * The one axis the progression slider drives: **how far into the selected
 * situation the kidney is**, 0 (intact) to 1 (established).
 *
 * The scene interpolates the *controls* between normal and the situation's
 * settings and re-solves at every point, so every intermediate state is a real
 * solve rather than a blend of two answers.
 */
export const RANGE = { min: 0, max: 1, step: 0.01 };

export const PROGRESS_LABEL = {
  en: 'How far into this situation',
  ja: 'この状態の進行度',
};

export const STAGES = [
  {
    id: 'intact',
    name: 'Intact kidney',
    nameJa: '健常な腎臓',
    at: 0,
    focus: ['glomerulus', 'proximalConvoluted'],
    summary:
      'Filtration, and then the recovery of almost all of it. 180 litres a day is filtered and more than 99 % comes back.',
    summaryJa:
      '濾過し、そのほとんどを取り戻している状態。1 日 180 L を濾過し、99% 以上を再吸収して戻します。',
  },
  {
    id: 'compensating',
    name: 'Compensating',
    nameJa: '代償している',
    at: 0.5,
    focus: ['glomerulus', 'maculaDensa'],
    summary:
      'The mechanism is acting, and something is holding the numbers up. What is compensating, and what will it cost?',
    summaryJa:
      '機序は働き始めていますが、何かが数値を支えています。何が代償しているのか、その代償は何を犠牲にしているのか。',
  },
  {
    id: 'established',
    name: 'Established',
    nameJa: '確立した状態',
    at: 1,
    focus: ['glomerulus', 'collectingDuct'],
    summary:
      'The compensation has run out or become the injury. This is where the bedside numbers separate one mechanism from another.',
    summaryJa:
      '代償が尽きたか、代償そのものが傷害になった段階。ベッドサイドの数値が機序を見分けられるのはここです。',
  },
];

export const LEGEND = [
  { color: PALETTE.afferent, label: 'Afferent arteriole', labelJa: '輸入細動脈' },
  { color: PALETTE.efferent, label: 'Efferent arteriole', labelJa: '輸出細動脈' },
  { color: PALETTE.tubule, label: 'Cortical tubule', labelJa: '皮質の尿細管' },
  { color: PALETTE.medulla, label: 'Medullary segments', labelJa: '髄質を通る部分' },
  { color: PALETTE.filtrate, label: 'Filtrate', labelJa: '濾液' },
];

/**
 * The scope panel — one of the four things an `alpha` scene must have, and the
 * only one the reader actually sees. Built from `SCOPE` so the panel and the
 * tests cannot describe different boundaries.
 */
export const MODEL_SCOPE = {
  question: 'When filtration fails, where in the nephron did it fail, and how would you tell from the outside?',
  questionJa: '濾過が落ちるとき、ネフロンのどこで落ちているのか。そして外からどう見分けるのか。',
  answers: SCOPE.answersEn.map((text, index) => ({ text, textJa: SCOPE.answersJa[index] })),
  limits: SCOPE.notAnsweredEn.map((text, index) => ({ text, textJa: SCOPE.notAnsweredJa[index] })),
  sources: [
    'docs/model-cards/renal-filtration.md',
    'docs/model-evidence/renal-filtration.md',
    'src/models/renalFiltration.js',
  ],
};

export const MODEL_CONTROLS_COPY = {
  title: 'Where is it failing?',
  titleJa: 'どこで落ちているのか',
  subtitle: 'Each control is a different place in the nephron, not a severity',
  subtitleJa: 'それぞれ「重症度」ではなく、ネフロンの別の場所です',
  placement: 'console',
  reset: true,
};

/**
 * The controls the reader gets.
 *
 * One per mechanism, because that is the whole design of the model: a single
 * severity slider would give the same numbers for a dehydrated kidney and a
 * poisoned one.
 */
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
    id: 'meanArterialPressureMmHg',
    label: 'Perfusion pressure',
    labelJa: '灌流圧',
    min: 45,
    max: 130,
    step: 1,
    unit: 'mmHg',
    effect: 'What the kidney is being offered',
    effectJa: '腎臓に与えられている圧',
  },
  {
    id: 'afferentToneMultiplier',
    label: 'Afferent tone',
    labelJa: '輸入細動脈の緊張',
    min: 0.5,
    max: 2.5,
    step: 0.05,
    unit: '×',
    effect: 'Above 1 constricts: less flow and less filtration',
    effectJa: '1 より大きいと収縮：流量も濾過も落ちます',
  },
  {
    id: 'efferentToneMultiplier',
    label: 'Efferent tone',
    labelJa: '輸出細動脈の緊張',
    min: 0.5,
    max: 2.5,
    step: 0.05,
    unit: '×',
    effect: 'Above 1 constricts: less flow, more filtration',
    effectJa: '1 より大きいと収縮：流量は落ち、濾過は上がります',
  },
  {
    id: 'functioningNephronFraction',
    label: 'Nephrons still working',
    labelJa: '機能しているネフロン',
    min: 0.05,
    max: 1,
    step: 0.01,
    unit: '',
    effect: 'The survivors take on more, at a price',
    effectJa: '残ったネフロンが引き受けます。代償には代償があります',
  },
  {
    id: 'tubularHealth',
    label: 'Tubular epithelium',
    labelJa: '尿細管上皮',
    min: 0.1,
    max: 1,
    step: 0.01,
    unit: '',
    effect: 'Reabsorption and concentration both depend on it',
    effectJa: '再吸収も濃縮も、ここに依存します',
  },
  {
    id: 'barrierPermeability',
    label: 'Barrier permeability',
    labelJa: 'バリアの透過性',
    min: 1,
    max: 40,
    step: 0.5,
    unit: '×',
    effect: 'Selectivity, not quantity, is what breaks',
    effectJa: '壊れるのは濾過量ではなく選択性です',
  },
  {
    id: 'outflowObstruction',
    label: 'Obstruction downstream',
    labelJa: '下流の閉塞',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    effect: "It reaches filtration through Bowman's space pressure",
    effectJa: 'Bowman 腔圧を通じて濾過に届きます',
  },
];

export const STORY_LABEL = { en: 'Walk through it', ja: '順に見る' };
export const LEARNING_LABEL = { en: 'Predict it', ja: '予測してみる' };

export const DISCLAIMER =
  'Educational conceptual model of glomerular filtration and tubular mass balance. It solves a STEADY STATE: ' +
  'the creatinine shown is where creatinine is heading at this filtration rate, never where it is today. ' +
  'Not a patient simulator, not a diagnostic algorithm, and not validated against measured data.';

export const DISCLAIMER_JA =
  '糸球体濾過と尿細管の物質収支に関する教育目的の概念モデルです。**定常状態**を解いており、表示されるクレアチニンは' +
  '「この濾過量が続いたときに向かう値」であって、現時点の値ではありません。患者シミュレーターでも診断アルゴリズムでもなく、' +
  '実測データによる検証も受けていません。';

export const DISCLAIMER_SHORT = 'Steady-state educational model — the creatinine is where it is heading, not where it is.';
export const DISCLAIMER_SHORT_JA = '定常状態の教育モデル｜クレアチニンは「向かう値」であり、現在値ではありません。';
