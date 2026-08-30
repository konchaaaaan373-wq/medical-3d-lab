/**
 * Everything the cirrhosis / portal hypertension scene says, in both languages.
 *
 * No physiology here. Every figure comes from
 * [`src/models/portalHypertension.js`](../models/portalHypertension.js) at the
 * moment the reader sees it.
 */

export const PALETTE = {
  liver: '#8f3f43',
  scarred: '#8a6a5e',
  portal: '#5f7fd6',
  splanchnic: '#c96a5a',
  hepaticVein: '#6f8fc4',
  collateral: '#c98adf',
  tips: '#7ee0a8',
  blood: '#7fb2ff',
  gradient: '#ffb066',
  measured: '#8fd8ff',
};

export const LEGEND = [
  { key: 'liver', label: 'Liver', labelJa: '肝臓' },
  { key: 'portal', label: 'Portal vein', labelJa: '門脈' },
  { key: 'splanchnic', label: 'Splanchnic inflow', labelJa: '内臓循環からの流入' },
  { key: 'hepaticVein', label: 'Hepatic vein', labelJa: '肝静脈' },
  { key: 'collateral', label: 'Portosystemic collaterals', labelJa: '門脈大循環短絡', activeFrom: 0.3 },
  { key: 'tips', label: 'TIPS', labelJa: 'TIPS', activeFrom: 0 },
];

/**
 * The axis is the structural intrahepatic resistance — fibrosis, nodules,
 * sinusoidal remodelling — as a multiple of a healthy liver's.
 *
 * One physical quantity, not a blend of several. Everything else that changes
 * along the course of the disease lives on the model controls, where it can be
 * moved on its own.
 */
export const STAGES = [
  {
    id: 'healthy',
    name: 'A healthy liver',
    nameJa: '健常な肝臓',
    at: 0,
    focus: ['liver', 'portal'],
    summary:
      'About a litre of splanchnic blood a minute crosses the liver for a gradient of a few mmHg. The sinusoids are a very low-resistance bed, and that is the whole reason the portal system works at the pressures it does.',
    summaryJa:
      '毎分およそ 1 L の内臓循環血が、数 mmHg の圧較差で肝臓を通過します。類洞は非常に低抵抗な血管床であり、門脈系がこの程度の圧で機能できるのはそのためです。',
  },
  {
    id: 'scarring',
    name: 'Resistance rises',
    nameJa: '抵抗の上昇',
    at: 0.35,
    focus: ['liver'],
    summary:
      'Fibrosis and regenerative nodules raise the resistance the portal blood has to be pushed across, and the gradient climbs. This axis moves that resistance and nothing else — splanchnic vasodilation, the second half of the story, is a control of its own.',
    summaryJa:
      '線維化と再生結節により、門脈血を押し通すべき抵抗が上昇し、圧較差が上がります。この軸が動かすのはその抵抗だけです。もう半分の要因である内臓血管の拡張は、独立したコントロールになっています。',
  },
  {
    id: 'collaterals',
    name: 'Collaterals open',
    nameJa: '側副血行路の開通',
    at: 0.6,
    focus: ['collateral', 'portal'],
    summary:
      'Past a gradient of about ten, portosystemic collaterals open and carry a large share of the portal blood straight to the systemic veins. They take a real bite out of the pressure — and leave it far above normal.',
    summaryJa:
      '圧較差が約 10 を超えると門脈大循環短絡が開通し、門脈血のかなりの部分が直接体循環静脈へ流れます。圧はたしかに下がりますが、正常には到底戻りません。',
  },
  {
    id: 'advanced',
    name: 'Established portal hypertension',
    nameJa: '確立した門脈圧亢進症',
    at: 1,
    focus: ['collateral', 'liver'],
    summary:
      'A large share of the splanchnic blood now reaches the systemic circulation without passing through liver tissue, and the gradient is still high. Add splanchnic vasodilation on top and it climbs further: the liver will not let blood through, and more blood keeps arriving.',
    summaryJa:
      '内臓循環血のかなりの部分が、肝組織を通らずに体循環へ到達しています。それでも圧較差は高いままです。ここに内臓血管の拡張を加えるとさらに上がります。肝臓が血液を通さず、しかもより多くの血液が届き続けるからです。',
  },
];

export const RANGE = { start: 'Healthy', startJa: '健常', end: 'Cirrhotic', endJa: '肝硬変' };
export const PROGRESS_LABEL = {
  label: 'Structural intrahepatic resistance',
  labelJa: '構造的な肝内血管抵抗',
};

export const ANNOTATIONS = [
  { id: 'liver', text: 'Liver', sub: '肝臓', anchor: 'liver', range: [0, 1] },
  { id: 'portal', text: 'Portal vein', sub: '門脈', anchor: 'portal', range: [0, 1], compact: false },
  { id: 'splanchnic', text: 'From the gut and spleen', sub: '腸管・脾臓から', anchor: 'splanchnic', range: [0, 1], compact: false },
  { id: 'hepaticVein', text: 'Hepatic vein', sub: '肝静脈', anchor: 'hepaticVein', range: [0, 1], compact: false },
  { id: 'collateral', text: 'Collaterals', sub: '側副血行路', anchor: 'collateral', range: [0.35, 1], compact: false },
];

export const CHARTS = [
  {
    id: 'pressure-profile',
    title: 'Where the pressure is lost',
    titleJa: '圧はどこで失われるか',
    unitLabel: 'mmHg along the pathway',
    height: 112,
    x: { unit: '', min: 0, max: 2, ticks: [0, 1, 2] },
    y: { unit: 'mmHg', min: 0 },
    key: [
      { id: 'profile', label: 'Portal → sinusoid → hepatic vein', labelJa: '門脈 → 類洞 → 肝静脈', color: '#7fb2ff' },
      { id: 'measured', label: 'What HVPG sees', labelJa: 'HVPG が見ている範囲', color: '#8fd8ff', dash: true },
    ],
  },
  {
    id: 'flow-destinations',
    title: 'Where the splanchnic blood goes',
    titleJa: '内臓循環血の行き先',
    unitLabel: 'mL/min',
    height: 112,
    x: { unit: '', min: 0, max: 3, ticks: [0, 1, 2, 3] },
    y: { unit: 'mL/min', min: 0 },
    key: [
      { id: 'liver', label: 'Through the liver', labelJa: '肝臓を通る', color: '#8f3f43' },
      { id: 'collateral', label: 'Through collaterals', labelJa: '側副血行路を通る', color: '#c98adf' },
      { id: 'tips', label: 'Through a shunt', labelJa: '短絡路を通る', color: '#7ee0a8' },
    ],
  },
];

export const METRICS = [
  {
    id: 'ppg',
    label: 'Portal pressure gradient (this model)',
    labelJa: '門脈圧較差（このモデル）',
    unit: 'mmHg',
    emphasis: true,
  },
  {
    id: 'hvpg',
    label: 'What HVPG would read',
    labelJa: 'HVPG として測れる値',
    unit: 'mmHg',
    emphasis: true,
  },
  { id: 'missed', label: 'Gradient HVPG cannot see', labelJa: 'HVPG が捉えられない圧較差', unit: 'mmHg' },
  { id: 'band', label: 'HVPG band', labelJa: 'HVPG の区分', unit: '', valueJa: '' },
  { id: 'portalPressure', label: 'Portal pressure', labelJa: '門脈圧', unit: 'mmHg' },
  { id: 'inflow', label: 'Splanchnic inflow', labelJa: '内臓循環からの流入', unit: 'mL/min' },
  { id: 'liverFlow', label: 'Portal blood through the liver', labelJa: '肝臓を通る門脈血', unit: 'mL/min' },
  { id: 'collateralFlow', label: 'Through collaterals', labelJa: '側副血行路を通る血流', unit: 'mL/min' },
  { id: 'tipsFlow', label: 'Through the shunt', labelJa: '短絡路を通る血流', unit: 'mL/min' },
  { id: 'shunt', label: 'Bypassing liver tissue', labelJa: '肝組織を迂回する割合', unit: '%' },
  { id: 'resistance', label: 'Intrahepatic resistance', labelJa: '肝内血管抵抗', unit: '× healthy' },
];

export const MODEL_CONTROLS = [
  {
    id: 'splanchnicVasodilation',
    label: 'Splanchnic vasodilation',
    labelJa: '内臓血管の拡張',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    id: 'dynamicTone',
    label: 'Dynamic (reversible) tone',
    labelJa: '動的（可逆性）緊張',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    id: 'collateralPropensity',
    label: 'Collateral formation',
    labelJa: '側副血行路の形成',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v === 0 ? 'none' : `${Math.round(v * 100)}%`),
  },
  {
    id: 'tips',
    label: 'TIPS (shunt)',
    labelJa: 'TIPS（短絡路）',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v === 0 ? 'none' : `${Math.round(v * 100)}%`),
  },
  {
    id: 'presinusoidalShare',
    label: 'Resistance sitting presinusoidally',
    labelJa: '抵抗のうち類洞前にある割合',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
];

export const MODEL_SCOPE = {
  question:
    'Why does portal pressure rise in cirrhosis, why do the collaterals that open fail to bring it down, and what does HVPG actually measure?',
  questionJa:
    '肝硬変でなぜ門脈圧が上がるのか。開通した側副血行路がなぜ圧を戻せないのか。そして HVPG は実際に何を測っているのか。',
  answers: [
    {
      text: 'ΔP = Q·R applied to a network with flow conserved at the portal vein: inflow through the splanchnic arterioles, outflow through the liver, the collaterals and any shunt.',
      textJa:
        '門脈で流量保存が成り立つネットワークに ΔP = Q·R を適用します。内臓細動脈からの流入と、肝臓・側副血行路・短絡路への流出です。',
    },
    {
      text: 'That portal hypertension has two causes at once — resistance to outflow and increased inflow — and that they add.',
      textJa: '門脈圧亢進には「流出抵抗の上昇」と「流入の増加」という 2 つの原因が同時にあり、両者が加算されること。',
    },
    {
      text: 'Why collaterals divert a great deal of blood and still leave the pressure high: they are a high-resistance path, not a low-resistance one.',
      textJa:
        '側副血行路が大量の血液を迂回させても圧が高いままである理由。それらは低抵抗路ではなく高抵抗路だからです。',
    },
    {
      text: 'Why HVPG and the portal pressure gradient are the same number in sinusoidal disease and very different numbers in presinusoidal disease.',
      textJa:
        '類洞性の疾患では HVPG と門脈圧較差がほぼ一致し、類洞前性の疾患では大きく食い違う理由。',
    },
    {
      text: 'What a shunt does that collaterals cannot, and what it costs in hepatic perfusion.',
      textJa: '短絡路が側副血行路にできないことを成し遂げる仕組みと、それが肝血流の面で払う代償。',
    },
  ],
  excludes: [
    {
      text: 'Ascites. It does not follow from portal pressure alone — hepatic lymph balance, sinusoidal permeability, hypoalbuminaemia and renal sodium handling are all needed, and none of them is here.',
      textJa:
        '腹水。門脈圧だけからは導けません。肝リンパのバランス・類洞透過性・低アルブミン血症・腎でのナトリウム処理が必要ですが、そのいずれもこのモデルにはありません。',
    },
    {
      text: 'Varices as structures, bleeding risk, and encephalopathy. The model has flows, not consequences.',
      textJa: '構造としての静脈瘤、出血リスク、肝性脳症。モデルにあるのは血流であって、その帰結ではありません。',
    },
    { text: 'Liver function of any kind — no Child-Pugh, no MELD, no albumin, no bilirubin.', textJa: '肝機能に関するもの全般（Child-Pugh・MELD・アルブミン・ビリルビンなど）。' },
    { text: 'Cardiac output, systemic haemodynamics, and the hepatic arterial buffer response.', textJa: '心拍出量、全身循環動態、肝動脈バッファー応答。' },
    { text: 'Time. Every state is an equilibrium; nothing here takes years, or minutes.', textJa: '時間経過。ここでの状態はすべて平衡状態であり、年単位・分単位の変化はありません。' },
  ],
  cautions: [
    {
      text: 'This model computes a portal pressure gradient. Calling that an HVPG is the error the scene exists to prevent — so it reports both, and they are not the same number.',
      textJa:
        'このモデルが計算しているのは門脈圧較差です。それを HVPG と呼ぶことこそ、このシーンが防ごうとしている誤りです。だから両方を表示しており、両者は同じ値ではありません。',
    },
    {
      text: 'The Baveno thresholds (≥10 mmHg clinically significant, ≥12 mmHg higher risk) are defined on HVPG and were established in compensated advanced chronic liver disease of sinusoidal aetiology. Move the resistance presinusoidally and the scene stops applying them, because there they would be wrong.',
      textJa:
        'Baveno の閾値（≥10 mmHg で臨床的に有意、≥12 mmHg でより高リスク）は HVPG に対して定義され、類洞性の代償性進行性慢性肝疾患で確立されたものです。抵抗を類洞前に移すとシーンは閾値の適用をやめます。そこでは誤りになるからです。',
    },
    {
      text: 'The resistances are calibration constants, not measurements. No such measurement exists for a person; they are the numbers that put the healthy liver’s gradient and flow where the textbooks put them.',
      textJa:
        '各抵抗値は較正定数であって実測値ではありません。個人についてそのような測定値は存在しません。健常肝の圧較差と血流を教科書的な値に合わせるための数値です。',
    },
    {
      text: 'Hepatic portal perfusion here can rise with splanchnic vasodilation, because a higher gradient across a fixed resistance drives more flow. In a real cirrhotic liver it usually falls. The model does not carry what would make it fall.',
      textJa:
        'このモデルでは内臓血管拡張により肝門脈血流が増えることがあります。固定された抵抗にかかる圧較差が上がるためです。実際の肝硬変肝では通常は低下します。低下させる要因をこのモデルは持っていません。',
    },
  ],
  sources: [
    {
      text: 'Standard hepatology for the two-hit account of portal hypertension (raised intrahepatic resistance plus increased splanchnic inflow) and for the roughly 20–30% dynamic, reversible component of the intrahepatic resistance.',
      textJa:
        '門脈圧亢進の two-hit 説（肝内抵抗の上昇＋内臓循環流入の増加）と、肝内抵抗のうち可逆的・動的な成分が約 20–30% であることは標準的な肝臓病学から。',
      kind: 'textbook',
    },
    {
      text: 'HVPG measurement literature: normal 1–5 mmHg, ≥10 mmHg clinically significant, ≥12 mmHg associated with decompensating events; WHVP reflects sinusoidal and not portal pressure, so HVPG systematically under-reads presinusoidal portal hypertension.',
      textJa:
        'HVPG 測定に関する文献：正常 1–5 mmHg、≥10 mmHg で臨床的に有意、≥12 mmHg で非代償性イベントと関連。WHVP は門脈圧ではなく類洞圧を反映するため、HVPG は類洞前性門脈圧亢進を系統的に過小評価します。',
      kind: 'review',
    },
    {
      text: 'Baveno VII, for the thresholds and for the statement that they should not be extrapolated to predominantly presinusoidal disorders.',
      textJa:
        '閾値、および主として類洞前性の病態へ外挿すべきでないという点は Baveno VII から。',
      kind: 'guideline',
    },
    {
      text: 'TIPS literature for the target of a post-shunt gradient below 12 mmHg.',
      textJa: '短絡路作成後の圧較差 12 mmHg 未満という目標値は TIPS に関する文献から。',
      kind: 'review',
    },
    {
      text: 'Consulted through search-result summaries and abstracts, not full text — the medical publishers were unreachable from the network this was built on. No guideline figure or table has been reproduced; only numerical thresholds that are stated in ordinary prose in many places.',
      textJa:
        '出典はいずれも検索結果の要約・抄録を通じて確認したもので、本文は参照していません（構築環境から医学系出版社に到達できないため）。ガイドラインの図表は一切複製しておらず、多くの文献で文章として述べられている数値の閾値のみを用いています。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/cirrhosis-portal-hypertension.md',
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
  'Educational conceptual model of the portal circulation as a resistive network. It computes a portal pressure ' +
  'gradient, which is not the same measurement as HVPG — both are shown. Resistances are calibration constants, ' +
  'not measurements. No ascites, no bleeding risk, no liver function, no encephalopathy is modelled. ' +
  'Not for diagnosis, staging or prediction.';
export const DISCLAIMER_JA =
  '門脈循環を抵抗ネットワークとして扱う教育用概念モデルです。計算しているのは門脈圧較差であり、HVPG とは別の測定量です' +
  '（両方を表示しています）。各抵抗値は較正定数であって実測値ではありません。腹水・出血リスク・肝機能・肝性脳症は' +
  'モデル化していません。診断・重症度判定・予測には使用できません。';
export const DISCLAIMER_SHORT =
  'Conceptual network model — a portal pressure gradient, not an HVPG. No ascites. Not for diagnosis.';
export const DISCLAIMER_SHORT_JA =
  '概念的なネットワークモデル｜HVPG ではなく門脈圧較差です。腹水は扱いません。診断には使用できません。';
