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
      'By the time a liver has sat at a gradient of this size, a portosystemic collateral network has become established — pre-existing channels dilated, vessels remodelled, new ones grown, over months to years — and it carries a large share of the portal blood straight to the systemic veins. It takes a real bite out of the pressure and leaves it far above normal, because the hepatic resistance behind it and the inflow in front of it are both still there.',
    summaryJa:
      'この程度の圧較差が続いた肝臓では、門脈大循環短絡の血管網がすでに確立しています（既存の側副路の拡張、血管リモデリング、新生血管形成が数か月から数年かけて進んだ結果です）。この血管網は門脈血のかなりの部分を直接体循環静脈へ運びます。圧はたしかに下がりますが、正常には到底戻りません。背後の肝内抵抗も、手前の流入増加も、どちらも残ったままだからです。',
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

/**
 * The names shown for the haemodynamic-pattern control. Kept in step with
 * `HAEMODYNAMIC_PATTERNS` in the model by `tests/portal-hypertension-scene.test.js`.
 */
const PATTERN_NAMES = ['Sinusoidal', 'Mixed', 'Presinusoidal'];

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
    /**
     * A named state, not a share. Which pattern is being modelled is a
     * question about which disease this is, and answering it with a number
     * would put an implementation constant on screen dressed as a clinical
     * criterion. The three positions are the three patterns; no percentage is
     * ever shown.
     */
    id: 'haemodynamicPattern',
    label: 'Which portal hypertension',
    labelJa: 'どの門脈圧亢進症か',
    min: 0,
    max: 2,
    step: 1,
    format: (v) => PATTERN_NAMES[Math.round(v)] ?? PATTERN_NAMES[0],
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
      text: 'That increased intrahepatic resistance is the **initiating** mechanism and increased splanchnic inflow is the **perpetuating** one — a feed-forward loop, not two parallel causes. The scene answers "what does more resistance do?" and "what does more inflow do at a fixed resistance?" separately, so that the two roles can be told apart.',
      textJa:
        '肝内血管抵抗の上昇が**起点となる機序**であり、内臓循環からの流入増加が**維持・増悪させる機序**であること。2 つの並列した原因ではなく、フィードフォワードのループです。このシーンは「抵抗が増えると何が起きるか」と「抵抗を固定したまま流入が増えると何が起きるか」を別々に答えられるようにしてあります。',
    },
    {
      text: 'Why collaterals redistribute a great deal of portal flow and still leave the pressure high: they remove neither the raised hepatic resistance behind them nor the raised inflow in front of them.',
      textJa:
        '側副血行路が門脈血の多くを再分配してもなお圧が高いままである理由。背後にある肝内抵抗の上昇も、手前にある流入の増加も、側副血行路は取り除かないためです。',
    },
    {
      text: 'Why HVPG tracks the portal pressure gradient in sinusoidal disease and under-reads it badly when a substantial part of the resistance lies upstream of the sinusoids.',
      textJa:
        '類洞性の疾患では HVPG が門脈圧較差をよく反映し、抵抗のかなりの部分が類洞より上流にある場合には大きく過小評価する理由。',
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
      text: 'Following Baveno VII: an HVPG above 5 mmHg is portal hypertension, and ≥10 mmHg is clinically significant portal hypertension — HVPG being the gold standard above all in viral and alcohol-related cirrhosis. These are defined on HVPG and were established in compensated advanced chronic liver disease of sinusoidal aetiology, so the scene withholds them outside the sinusoidal pattern rather than extending them where they would be wrong.',
      textJa:
        'Baveno VII に従っています。HVPG が 5 mmHg を超えれば門脈圧亢進、10 mmHg 以上で臨床的に有意な門脈圧亢進 (CSPH) です。HVPG は、とくにウイルス性・アルコール性の肝硬変において gold standard とされます。これらは HVPG に対して定義され、類洞性の代償性進行性慢性肝疾患で確立された値であるため、類洞性以外のパターンでは、誤った外挿をせずに表示そのものを控えます。',
    },
    {
      text: '12 mmHg is **not** used here as a general decompensation threshold, because it is not one. It belongs to two specific contexts: the classic association between an HVPG of 12 mmHg or more and variceal bleeding, and the post-TIPS target of a portosystemic gradient below 12 mmHg for a shunt placed to treat variceal bleeding. The scene’s HVPG bands therefore have no boundary there.',
      textJa:
        '12 mmHg は一般的な「非代償化の閾値」としては使っていません。そのようなものではないからです。この値が属するのは 2 つの限られた文脈です。HVPG 12 mmHg 以上と静脈瘤出血との古典的な関連、および静脈瘤出血に対して留置した TIPS の術後目標である圧較差 12 mmHg 未満です。したがって、このシーンの HVPG 区分にはそこに境界がありません。',
    },
    {
      text: 'Presinusoidal intrahepatic and prehepatic portal hypertension are not the same thing, although HVPG under-reads in both. This model represents the presinusoidal intrahepatic pattern — schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders. Portal vein thrombosis is prehepatic, outside the liver, and is not modelled at all.',
      textJa:
        '前類洞性（肝内）門脈圧亢進と肝前性門脈圧亢進は、どちらも HVPG が過小評価するとはいえ、同じものではありません。このモデルが表現しているのは前類洞性（肝内）のパターン、すなわち住血吸虫症、門脈・類洞血管疾患 (PSVD)、一部の胆汁うっ滞性疾患の前類洞性要素です。門脈血栓症は肝前性であり肝外の病態で、モデル化していません。',
    },
    {
      text: 'The resistances are calibration constants, not measurements. No such measurement exists for a person; they are the numbers that put the healthy liver’s gradient and flow where the textbooks put them.',
      textJa:
        '各抵抗値は較正定数であって実測値ではありません。個人についてそのような測定値は存在しません。健常肝の圧較差と血流を教科書的な値に合わせるための数値です。',
    },
    {
      text: 'Two different questions about hepatic portal perfusion, and the model answers them differently on purpose. Along this scene’s axis — progressive intrahepatic scarring — the blood reaching the liver falls, which is the clinical direction. Turn splanchnic vasodilation up on its own, holding the hepatic resistance fixed, and it rises instead: a larger gradient across an unchanged resistance is more flow, and that is arithmetic rather than a bug. What the model does not carry is what makes perfusion fall in a real cirrhotic liver *despite* the hyperdynamic circulation — progressive obliteration of the intrahepatic vascular bed, and collaterals growing faster than the inflow.',
      textJa:
        '肝門脈血流については 2 つの異なる問いがあり、モデルは意図的に別々に答えます。このシーンの軸である肝内線維化の進行に沿っては、肝臓に届く血流は低下します。これは臨床的な方向と一致します。一方、肝内抵抗を固定したまま内臓血管拡張だけを上げると、血流は増加します。抵抗が変わらないまま圧較差が大きくなれば流量は増えるという算術であり、バグではありません。モデルに含まれていないのは、実際の肝硬変肝で hyperdynamic circulation があってもなお灌流が低下する要因、すなわち肝内血管床の進行性の閉塞と、流入の増加を上回る速度での側副血行路の発達です。',
    },
  ],
  sources: [
    {
      text: 'Baveno VII (PMC11090185) for the thresholds — HVPG above 5 mmHg is portal hypertension, ≥10 mmHg is clinically significant portal hypertension, HVPG the gold standard above all in viral and alcohol-related cirrhosis — and for the caution against extrapolating them to predominantly presinusoidal disorders.',
      textJa:
        '閾値は Baveno VII (PMC11090185) から。HVPG 5 mmHg 超で門脈圧亢進、10 mmHg 以上で臨床的に有意な門脈圧亢進 (CSPH)。HVPG は、とくにウイルス性・アルコール性肝硬変において gold standard です。主として前類洞性の病態に外挿すべきでないという注意も同文献から。',
      kind: 'guideline',
    },
    {
      text: 'Reviews of the pathophysiology of portal hypertension (PMC2999290, PMC3971388, PMC3000670) for the causal order: increased intrahepatic vascular resistance is the initiating event, portal hypertension then induces splanchnic vasodilation and a hyperdynamic circulation, and the resulting increase in portal inflow maintains and worsens the pressure.',
      textJa:
        '門脈圧亢進の病態生理に関する総説 (PMC2999290, PMC3971388, PMC3000670) から因果の順序を採用しています。肝内血管抵抗の上昇が起点となり、門脈圧亢進が内臓血管の拡張と hyperdynamic circulation を誘導し、その結果の門脈流入増加が圧を維持・増悪させます。',
      kind: 'review',
    },
    {
      text: 'The same reviews for the dynamic, reversible component of the intrahepatic resistance — activated stellate cell contraction, reduced intrahepatic nitric oxide, increased endothelin — classically quoted as roughly a fifth to a third of the total.',
      textJa:
        '肝内抵抗のうち可逆的・動的な成分（活性化星細胞の収縮、肝内一酸化窒素の低下、エンドセリンの増加）が全体の約 20–30% とされる点も同じ総説群から。',
      kind: 'review',
    },
    {
      text: 'HVPG measurement literature for HVPG = WHVP − FHVP, for WHVP approximating sinusoidal pressure in sinusoidal portal hypertension, and for the systematic under-reading when a substantial part of the resistance lies upstream of the sinusoids.',
      textJa:
        'HVPG = WHVP − FHVP であること、類洞性門脈圧亢進では WHVP が類洞圧を近似すること、抵抗のかなりの部分が類洞より上流にある場合に系統的な過小評価が生じることは、HVPG 測定に関する文献から。',
      kind: 'review',
    },
    {
      text: 'TIPS literature for the post-shunt haemodynamic target of a portosystemic gradient below 12 mmHg when a shunt is placed for variceal bleeding — the one context, alongside the classic HVPG ≥ 12 mmHg association with variceal bleeding, in which 12 mmHg belongs.',
      textJa:
        '静脈瘤出血に対する TIPS 留置後の血行動態的目標（門脈大循環圧較差 12 mmHg 未満）は TIPS の文献から。HVPG 12 mmHg 以上と静脈瘤出血との古典的な関連とあわせて、12 mmHg という値が属するのはこの文脈のみです。',
      kind: 'review',
    },
    {
      text: 'Every resistance in this model is a calibration constant chosen to put a healthy liver’s gradient and flow where the textbooks put them. Reading a source in full does not turn a calibration into a measurement, and none of these has become one.',
      textJa:
        'このモデルの各抵抗値は、健常肝の圧較差と血流を教科書的な値に合わせるために選んだ較正定数です。原著を読めたからといって較正値が実測値になるわけではなく、いずれもそうはなっていません。',
      kind: 'caveat',
    },
    {
      text: 'No guideline figure, table or algorithm has been reproduced. What is used is a small number of thresholds and the causal ordering, both of which are stated in prose in the sources above.',
      textJa:
        'ガイドラインの図・表・アルゴリズムは一切複製していません。用いているのは少数の閾値と因果の順序であり、いずれも上記の出典中で文章として述べられているものです。',
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
