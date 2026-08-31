/**
 * Copy, colours and stage text for the hepatorenal syndrome scene.
 *
 * No physiology is computed here and no number is written down that the model
 * could have produced. Everything below is language and presentation.
 */

export const PALETTE = {
  liver: '#8f5f4a',
  scarred: '#6d4436',
  kidney: '#a0555c',
  medulla: '#c9757c',
  artery: '#c8524b',
  vein: '#6f8fc4',
  portal: '#5f7fd6',
  splanchnic: '#c96a5a',
  renal: '#d2564f',
  afferent: '#d2564f',
  efferent: '#b8735f',
  capsule: '#8fb8d8',
  filtrate: '#e8d75f',
  signal: '#e0a13c',
  released: '#7ee0a8',
};

export const LEGEND = [
  { id: 'splanchnic', label: 'Splanchnic circulation', labelJa: '内臓循環', color: PALETTE.splanchnic },
  { id: 'renal', label: 'Renal circulation', labelJa: '腎循環', color: PALETTE.renal },
  { id: 'filtrate', label: 'Filtrate', labelJa: '濾液', color: PALETTE.filtrate },
  { id: 'signal', label: 'Vasoconstrictor activation', labelJa: '血管収縮系の活性化', color: PALETTE.signal },
];

export const STAGES = [
  {
    id: 'healthy',
    name: 'Two organs, one circulation',
    nameJa: '2 つの臓器と、1 つの循環',
    at: 0,
    focus: ['aorta', 'kidney'],
    summary:
      'A normal liver, a normal arterial pressure, and a kidney filtering about 120 mL a minute. The splanchnic bed takes roughly a fifth of the cardiac output and the kidneys take about the same. Nothing here is being defended against anything.',
    summaryJa:
      '正常な肝臓、正常な動脈圧、そして毎分およそ 120 mL を濾過している腎臓。内臓循環は心拍出量のおよそ 5 分の 1 を、腎臓もほぼ同程度を受け取ります。ここでは、何も代償されていません。',
  },
  {
    id: 'vasodilation',
    name: 'The arteries open',
    nameJa: '動脈が開く',
    at: 0.18,
    focus: ['splanchnic'],
    summary:
      'Portal hypertension dilates the splanchnic arterioles, and the systemic beds dilate with them. A large low-resistance path has opened in parallel with everything else, and with the other beds unable to close far enough to make up for it, systemic vascular resistance falls. Here the heart answers by raising its output — and the answer is not complete, so arterial pressure falls anyway. That rising-output path is this model’s default, not a rule: lower the cardiac reserve and the same renal failure is reached with the output falling instead.',
    summaryJa:
      '門脈圧亢進により内臓細動脈が拡張し、全身の血管床もそれに伴って拡張します。他のすべてと並列に大きな低抵抗路が開き、他の血管床の収縮では補いきれないため、体血管抵抗が低下します。ここでは心臓が心拍出量を増やして応えますが、その代償は不完全で、動脈圧は結局低下します。ただしこの「心拍出量が上がる経路」はこのモデルの既定値であって法則ではありません。心予備能を下げれば、心拍出量が下がりながら同じ腎機能低下に至ります。',
  },
  {
    id: 'defended',
    name: 'Pressure and filtration defended',
    nameJa: '血圧と濾過が守られる',
    at: 0.38,
    focus: ['aorta', 'kidney'],
    summary:
      'The fall in arterial pressure activates the renin-angiotensin-aldosterone system, the sympathetic nerves and vasopressin. They constrict the beds that remain responsive, while the splanchnic circulation stays disproportionately vasodilated despite the same signal — so much of the constriction lands elsewhere, and the kidney is one of the places it lands. Renal blood flow is already falling here, and filtration is not: the efferent arteriole constricts more than the afferent one, which holds the pressure inside the glomerulus up, so the fraction of arriving plasma that is filtered rises. The afferent arteriole meanwhile dilates to defend the flow — and that is a reserve, not a solution.',
    summaryJa:
      '動脈圧の低下により、レニン・アンジオテンシン・アルドステロン系、交感神経、バゾプレシンが活性化します。これらは反応性の残っている血管床を収縮させますが、内臓循環は同じシグナルのもとでも相対的に拡張したままです。したがって収縮の多くは他の血管床に及び、腎臓はその 1 つです。ここではすでに腎血流が低下していますが、濾過量は低下していません。輸出細動脈が輸入細動脈より強く収縮して糸球体内の圧が保たれるため、到達した血漿のうち濾過される割合が上昇します。輸入細動脈は血流を守るために拡張しますが、それは予備能であって解決ではありません。',
  },
  {
    id: 'failure',
    name: 'The reserve runs out',
    nameJa: '予備能が尽きる',
    at: 0.58,
    focus: ['kidney', 'splanchnic'],
    summary:
      'The afferent arteriole cannot dilate any further against the tone it is working under. From here the renal circulation is pressure-dependent: blood flow follows the arterial pressure down, the glomerular pressure goes with it, and filtration falls steeply. This model gives the kidney no injury at all, and filtration still ends up here — which is how far the circulation alone can take it. In a patient, injury may be present as well.',
    summaryJa:
      '輸入細動脈は、置かれた血管収縮緊張のもとでこれ以上拡張できません。ここから腎循環は圧依存性になります。腎血流は動脈圧とともに低下し、糸球体内圧もそれに従い、濾過量は急峻に低下します。このモデルは腎臓に一切の障害を与えていませんが、それでも濾過量はここまで落ちます。循環だけでどこまで到達し得るかを示したものであり、実際の患者では腎障害が併存していることもあります。',
  },
  {
    id: 'circulatory-share',
    name: 'This is the circulation’s share',
    nameJa: 'ここまでが、循環の担った分',
    at: 1,
    focus: ['kidney'],
    summary:
      'Filtration has fallen to a fraction of normal and nothing in this model has injured the kidney. That is the measure this scene exists to give: how far the circulation alone can take it. It is not a statement about how much of a patient’s renal failure is reversible — HRS-AKI may occur with tubular injury, proteinuria or pre-existing chronic kidney disease, and this model has none of them to weigh against the part it does show.',
    summaryJa:
      '濾過量は正常のごく一部まで低下しましたが、このモデルは腎臓に何の障害も与えていません。それがこのシーンの目的です。循環だけでどこまで到達し得るかを測ったものであり、実際の患者の腎機能低下のうちどれだけが可逆かを述べたものではありません。HRS-AKI は尿細管障害・蛋白尿・既存の慢性腎臓病を伴い得ますが、このモデルにはそれらが存在せず、示している部分と比較することができません。',
  },
];

export const RANGE = { start: 'Less', startJa: '軽度', end: 'More', endJa: '高度' };

export const PROGRESS_LABEL = {
  label: 'Cirrhosis and the vasodilation it induces — a chosen path, not a time course',
  labelJa: '肝硬変と、それが引き起こす血管拡張（時間経過ではなく、選んだ 1 本の経路）',
};

export const ANNOTATIONS = [
  { id: 'liver', text: 'Liver', sub: '肝臓', anchor: 'liver', range: [0, 1] },
  { id: 'splanchnic', text: 'Splanchnic bed', sub: '内臓血管床', anchor: 'splanchnic', range: [0, 1], compact: false },
  { id: 'aorta', text: 'Arterial pressure', sub: '動脈圧', anchor: 'aorta', range: [0, 1], compact: false },
  { id: 'kidney', text: 'Kidney', sub: '腎臓', anchor: 'kidney', range: [0, 1] },
  { id: 'afferent', text: 'Afferent arteriole', sub: '輸入細動脈', anchor: 'afferent', range: [0, 1], compact: false },
  { id: 'efferent', text: 'Efferent arteriole', sub: '輸出細動脈', anchor: 'efferent', range: [0, 1], compact: false },
  { id: 'filtrate', text: 'Filtrate', sub: '濾液', anchor: 'filtrate', range: [0, 1], compact: false },
  // Only while both kidneys are on screen. Without these the comparison is two
  // similar objects and no statement — and which one is which is the whole
  // content of it.
  {
    id: 'thisKidney',
    text: 'This kidney',
    sub: 'この腎臓',
    anchor: 'thisKidney',
    range: [0, 1],
    comparisonOnly: true,
    compact: false,
  },
  {
    id: 'releasedKidney',
    text: 'The same kidney, signal removed',
    sub: '同じ腎臓・シグナルを除いた場合',
    anchor: 'releasedKidney',
    range: [0, 1],
    comparisonOnly: true,
    compact: false,
  },
];

export const CHARTS = [
  {
    id: 'renal-response',
    title: 'What the kidney does as the circulation fails',
    titleJa: '循環の破綻に伴って腎臓に起きること',
    unitLabel: '% of the healthy value',
    height: 118,
    x: { unit: '', min: 0, max: 1, ticks: [0, 0.5, 1] },
    y: { unit: '%', min: 0 },
    key: [
      { id: 'flow', label: 'Renal blood flow', labelJa: '腎血流量', color: '#d2564f' },
      { id: 'gfr', label: 'Filtration rate', labelJa: '糸球体濾過量', color: '#e8d75f' },
      { id: 'fraction', label: 'Filtration fraction', labelJa: '濾過率', color: '#8fd8ff' },
    ],
  },
  {
    id: 'circulation',
    title: 'Pressure, output and the signal',
    titleJa: '血圧・心拍出量・活性化シグナル',
    unitLabel: '% of the healthy value',
    height: 118,
    x: { unit: '', min: 0, max: 1, ticks: [0, 0.5, 1] },
    y: { unit: '%', min: 0 },
    key: [
      { id: 'map', label: 'Arterial pressure', labelJa: '動脈圧', color: '#c8524b' },
      { id: 'output', label: 'Cardiac output', labelJa: '心拍出量', color: '#7ee0a8' },
      { id: 'activation', label: 'Vasoconstrictor activation', labelJa: '血管収縮系の活性化', color: '#e0a13c' },
    ],
  },
];

export const METRICS = [
  {
    id: 'gfr',
    label: 'Glomerular filtration rate',
    labelJa: '糸球体濾過量',
    unit: 'mL/min',
    emphasis: true,
  },
  {
    id: 'renalFlow',
    label: 'Renal blood flow',
    labelJa: '腎血流量',
    unit: 'mL/min',
    emphasis: true,
  },
  { id: 'filtrationFraction', label: 'Filtration fraction', labelJa: '濾過率', unit: '%' },
  { id: 'netPressure', label: 'Net filtration pressure', labelJa: '正味濾過圧', unit: 'mmHg' },
  { id: 'glomerularPressure', label: 'Glomerular pressure', labelJa: '糸球体内圧', unit: 'mmHg' },
  { id: 'map', label: 'Mean arterial pressure', labelJa: '平均動脈圧', unit: 'mmHg' },
  { id: 'output', label: 'Cardiac output', labelJa: '心拍出量', unit: 'mL/min' },
  { id: 'resistanceFall', label: 'Systemic resistance, vs healthy', labelJa: '体血管抵抗（健常比）', unit: '%' },
  {
    id: 'activation',
    label: 'Vasoconstrictor activation (index, not a concentration)',
    labelJa: '血管収縮系の活性化（指標であり、濃度ではありません）',
    unit: '',
  },
  { id: 'autoregulation', label: 'Renal autoregulation', labelJa: '腎自己調節能', unit: '' },
  {
    id: 'released',
    label: 'Same kidney, vasoconstrictor signal removed (this model’s circulatory share)',
    labelJa: '同じ腎臓・血管収縮シグナルを除いた場合（このモデルで循環が担う分）',
    unit: 'mL/min',
  },
];

export const MODEL_CONTROLS = [
  {
    id: 'splanchnicVasodilation',
    label: 'Arterial vasodilation',
    labelJa: '動脈の拡張',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    id: 'terlipressin',
    label: 'Splanchnic vasoconstrictor',
    labelJa: '内臓血管収縮薬',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v < 0.01 ? 'none' : `${Math.round(v * 100)}%`),
  },
  {
    id: 'albumin',
    label: 'Volume expansion (albumin)',
    labelJa: '血漿量の拡大（アルブミン）',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v < 0.01 ? 'none' : `${Math.round(v * 100)}%`),
  },
  {
    id: 'prostaglandinInhibition',
    label: 'Prostaglandin inhibition (an NSAID)',
    labelJa: 'プロスタグランジン阻害（NSAIDs）',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v < 0.01 ? 'none' : `${Math.round(v * 100)}%`),
  },
  {
    id: 'cardiacReserve',
    label: 'Cardiac reserve',
    labelJa: '心予備能',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v > 0.99 ? 'intact' : `${Math.round(v * 100)}%`),
  },
];

export const MODEL_SCOPE = {
  question:
    'How far can circulatory and neurohumoral changes alone take glomerular filtration, in a kidney this model gives no injury to?',
  questionJa:
    '腎臓に一切の障害を与えていないモデルで、循環と神経体液性の変化だけで、糸球体濾過量はどこまで低下し得るのか。',
  answers: [
    {
      text: 'That circulatory and neurohumoral changes alone are enough to take filtration a long way down: the kidney is being asked to filter at a perfusion pressure it can no longer autoregulate around, and the reason it cannot is the circulation’s own attempt to defend that pressure.',
      textJa:
        '循環と神経体液性の変化だけでも、濾過量は大きく低下し得るということ。腎臓はもはや自己調節できない灌流圧のもとで濾過を求められており、自己調節ができなくなった原因は、その血圧を守ろうとする循環自身の代償反応です。',
    },
    {
      text: 'Why the same signal does two opposite things: it defends the arterial pressure, and it takes the kidney’s reserve away. There is no version of the compensation that spares the kidney.',
      textJa:
        '同じシグナルがなぜ正反対の 2 つのことをするのか。動脈圧を守ると同時に、腎臓の予備能を奪います。腎臓だけを免れさせる代償の形は存在しません。',
    },
    {
      text: 'Why filtration holds up long after renal blood flow has started to fall, and why the filtration fraction rises on the way down before it collapses: the efferent arteriole constricts before the afferent one does.',
      textJa:
        '腎血流が低下し始めてからも、なぜ濾過量が長く保たれるのか。そしてなぜ濾過率がいったん上昇してから破綻するのか。輸出細動脈が輸入細動脈より先に収縮するためです。',
    },
    {
      text: 'Why inhibiting renal prostaglandin synthesis matters so much more once the vasoconstrictor systems are already activated: it is the afferent arteriole’s local defence, and there is nothing for its loss to expose until something is pressing on that arteriole.',
      textJa:
        '腎プロスタグランジン合成の阻害が、血管収縮系がすでに活性化している状況でなぜはるかに大きな意味を持つのか。それは輸入細動脈の局所的な防御であり、その細動脈に負荷がかかっていなければ、失われても現れるものがないからです。',
    },
    {
      text: 'Why the treatment is a vasoconstrictor rather than anything given to the kidney: it acts on the circulation, and in this model the renal component recovers because this model gave it nothing but the circulation to recover from.',
      textJa:
        'なぜ治療が腎臓に対する何かではなく血管収縮薬なのか。作用点は循環であり、このモデルで腎機能が回復するのは、このモデルが腎臓に循環以外の要因を与えていないからです。',
    },
  ],
  excludes: [
    {
      text: 'Any tubule. No sodium handling, no urine output, no ascites, no dilutional hyponatraemia, and no tubuloglomerular feedback as a mechanism.',
      textJa:
        '尿細管は一切含まれません。ナトリウム処理も、尿量も、腹水も、希釈性低ナトリウム血症も、機序としての尿細管糸球体フィードバックもありません。',
    },
    {
      text: 'Ascites. HRS-AKI is defined in cirrhosis **with ascites**, and there is none in this model — no hepatic lymph balance, no sinusoidal permeability, no albumin concentration, no renal sodium handling.',
      textJa:
        '腹水。HRS-AKI は**腹水を伴う**肝硬変において定義されますが、このモデルには腹水がありません。肝リンパ収支も、類洞透過性も、アルブミン濃度も、腎のナトリウム処理もありません。',
    },
    {
      text: 'Structural kidney injury of any kind — tubular injury, proteinuria, pre-existing chronic kidney disease — and therefore any way to weigh it against the haemodynamic component, or to tell HRS-AKI apart from prerenal azotaemia or acute tubular necrosis.',
      textJa:
        'あらゆる構造的腎障害（尿細管障害・蛋白尿・既存の慢性腎臓病）。したがって、それらと循環性の要素を比較することも、HRS-AKI を腎前性高窒素血症や急性尿細管壊死と区別することもできません。',
    },
    {
      text: 'Any time. This is an equilibrium: it cannot show the syndrome developing over days, or tell an acute course from a chronic one. The progression axis is a path through parameter space, not a time course.',
      textJa:
        '時間軸はありません。これは平衡状態のモデルであり、数日かけて症候群が成立する過程も、急性と慢性の経過の違いも示せません。進行スライダーはパラメータ空間の経路であって、時間経過ではありません。',
    },
    {
      text: 'Any heart. A single exponent stands in for systolic function, diastolic function, rate and contractility at once.',
      textJa:
        '心臓のモデルはありません。1 つの指数が、収縮能・拡張能・心拍数・収縮性のすべてを代表しています。',
    },
    {
      text: 'Any ceiling on volume expansion. Enough albumin will drive the pressure above normal here; in a patient it causes pulmonary oedema.',
      textJa:
        '輸液量の上限もありません。ここではアルブミンを十分に投与すれば血圧は正常を超えます。実際の患者では肺水腫を起こします。',
    },
  ],
  cautions: [
    {
      text: 'This scene deliberately isolates the haemodynamic and neurohumoral component of HRS-AKI. **Structural kidney injury is not represented in this model; that is a modelling boundary, not a claim that real HRS-AKI never contains kidney injury.** The 2024 ADQI–ICA consensus describes HRS-AKI as an AKI phenotype of advanced cirrhosis with ascites that can occur alongside tubular injury, proteinuria or pre-existing chronic kidney disease, and alongside other mechanisms of AKI.',
      textJa:
        'このシーンは、HRS-AKI のうち循環・神経体液性の機序を意図的に分離して示します。**このモデルには構造的腎障害を実装していませんが、実際の HRS-AKI で腎障害が存在しないという意味ではありません。** 2024 年の ADQI–ICA コンセンサスでは、HRS-AKI は腹水を伴う進行肝硬変に特異的な AKI phenotype であり、尿細管障害・蛋白尿・既存の慢性腎臓病を伴っていても、また他機序の AKI と併存していても成立し得るとされています。',
    },
    {
      text: 'It is not a diagnostic model. The 2024 criteria are cirrhosis with ascites, meeting AKI criteria, no improvement within 24 hours of adequate volume resuscitation **where resuscitation is clinically indicated**, and no strong alternative explanation as the primary cause. Forty-eight hours of systematic albumin is no longer required as a diagnostic step. There is no ascites in this model at all, so the defining clinical context of the phenotype is missing.',
      textJa:
        '診断のためのモデルではありません。2024 年の基準は、腹水を伴う肝硬変、AKI 基準の充足、**臨床的に適応がある場合の**適切な輸液蘇生後 24 時間以内に改善しないこと、そして主因となる有力な代替説明がないこと、です。48 時間の系統的アルブミン投与は診断の必須段階ではなくなりました。このモデルには腹水そのものが存在せず、この phenotype を定義する臨床的文脈が欠けています。',
    },
    {
      text: 'The vasoconstrictor activation is an **index between 0 and 1**, standing for renin, angiotensin, aldosterone, noradrenaline and vasopressin at once. It has no units and it is not a concentration of anything. Effective arterial blood volume is not a single measurable quantity, so the model uses the arterial pressure deficit as the observable proxy that drives it; systemic vasodilation is the upstream cause of that deficit and is reported beside it.',
      textJa:
        '血管収縮系の活性化は **0 から 1 の指標**であり、レニン・アンジオテンシン・アルドステロン・ノルアドレナリン・バゾプレシンをまとめて代表しています。単位はなく、何らかの濃度でもありません。有効循環血液量は単一の測定量ではないため、このモデルはそれを駆動する観測可能な代理として動脈圧の低下量を用いています。全身の血管拡張はその低下の上流の原因であり、並べて表示しています。',
    },
    {
      text: 'The progression axis is **a chosen path through parameter space, not a time course and not a natural history.** It moves the intrahepatic resistance and the arterial vasodilation together because that is the story the scene tells; in a patient they do not move in step, and the model has no time in it to move them through.',
      textJa:
        '進行スライダーは**パラメータ空間の中で選んだ 1 本の経路**であり、時間経過でも自然史でもありません。肝内血管抵抗と動脈拡張を同時に動かしているのはこのシーンが語る筋書きのためで、実際の患者で両者が歩調を合わせるわけではなく、そもそもこのモデルに時間軸はありません。',
    },
    {
      text: 'With cardiac reserve intact this model’s default path raises cardiac output at every step. That is the model’s parameterisation, **not a rule that cardiac output keeps rising into HRS-AKI** — at the onset of hepatorenal syndrome cardiac output has been observed to fall, and lowering the cardiac reserve here reproduces that path.',
      textJa:
        '心予備能が保たれている場合、このモデルの既定経路では心拍出量が各段階で上昇します。これはモデルのパラメータ設定であって、**HRS-AKI に至るまで心拍出量が上がり続けるという規則ではありません**。肝腎症候群の発症時には心拍出量の低下が観察されており、ここでも心予備能を下げれば同じ経路を再現できます。',
    },
    {
      text: 'In this model, the NSAID control is deliberately isolated to renal prostaglandin inhibition. The model gives it no systemic action so that the kidney’s local protective mechanism can be examined separately; **this is not a claim that real NSAIDs have no systemic effects.** They inhibit renal prostaglandin synthesis and constrict the afferent arteriole, and they also cause sodium and water retention, affect arterial pressure, and can cause haemodynamic acute kidney injury and acute interstitial nephritis. The risk of AKI is raised by volume depletion, chronic kidney disease, heart failure and renal hypoperfusion as well as by cirrhosis.',
      textJa:
        'このモデルでは、NSAIDs の作用を腎プロスタグランジン抑制だけに意図的に限定しています。腎臓の局所的な防御機構を単独で見るため、モデル上は全身作用を与えていません。**実際の NSAIDs に全身作用がないという意味ではありません。** 腎プロスタグランジン合成の阻害と輸入細動脈の収縮に加えて、ナトリウム・水の貯留、血圧への影響、血行動態性の急性腎障害、急性間質性腎炎などを起こし得ます。AKI のリスクは肝硬変だけでなく、脱水・慢性腎臓病・心不全・腎灌流低下でも上昇します。',
    },
    {
      text: 'The treatment arms demonstrate **the direction predicted by the model, not a guaranteed clinical response.** Reported resolution with a vasoconstrictor and albumin is of the order of 40–50%. Here every dose works, every time: there are no non-responders, no dose, no duration, no response probability, no mortality benefit and no adverse effects — terlipressin’s real ischaemic complications have no representation at all.',
      textJa:
        '治療のアームが示すのは**モデルが予測する変化の向きであって、確実な臨床反応ではありません**。血管収縮薬とアルブミンによる改善率は概ね 40〜50% 程度と報告されています。ここでは投与すれば必ず奏功し、無効例も、用量も、投与期間も、反応確率も、生命予後への効果も、有害事象もありません。テルリプレシンの実際の虚血性合併症は一切表現されていません。',
    },
    {
      text: 'The severity at which filtration collapses is a consequence of constants this repository invented. It is not a prediction about anybody, and there is no creatinine, no stage and no prognosis here.',
      textJa:
        '濾過量が破綻する重症度は、このリポジトリが定めた定数の帰結です。誰かについての予測ではなく、クレアチニン値も、病期も、予後もここにはありません。',
    },
    {
      text: 'Filtration rises slightly above normal early on, because efferent constriction acts while the afferent arteriole is still shielded. Hyperfiltration is described in compensated cirrhosis, but this was not calibrated to it and the size is not a claim.',
      textJa:
        '経過の初期には濾過量が正常をわずかに上回ります。輸入細動脈がまだ保護されている間に輸出細動脈の収縮が働くためです。代償期肝硬変での過剰濾過は報告されていますが、このモデルはそれに合わせて較正されておらず、その大きさは主張ではありません。',
    },
  ],
  sources: [
    {
      text: 'Nadim MK et al. Acute kidney injury in patients with cirrhosis: ADQI and ICA joint multidisciplinary consensus meeting. J Hepatol. 2024;81:163–183. PMID 38527522, DOI 10.1016/j.jhep.2024.03.031 — the source of truth for what HRS-AKI is and how it is defined here.',
      textJa:
        'Nadim MK ほか。肝硬変患者における急性腎障害：ADQI・ICA 合同コンセンサス。J Hepatol. 2024;81:163–183。PMID 38527522、DOI 10.1016/j.jhep.2024.03.031 ― HRS-AKI の定義について、本シーンが依拠する source of truth です。',
    },
    {
      text: 'Khemichian S, Nadim MK, Terrault NA. Update on Hepatorenal Syndrome: From Pathophysiology to Treatment. Annu Rev Med. 2025;76:373–387. DOI 10.1146/annurev-med-050223-112947 — pathophysiology and the treatment response rate.',
      textJa:
        'Khemichian S, Nadim MK, Terrault NA。肝腎症候群の最新知見：病態生理から治療まで。Annu Rev Med. 2025;76:373–387。DOI 10.1146/annurev-med-050223-112947 ― 病態生理と治療反応率について。',
    },
    {
      text: 'Ruiz-del-Arbol L et al. Circulatory function and hepatorenal syndrome in cirrhosis. Hepatology. 2005. PMID 15977202 — cardiac output falling at the onset of hepatorenal syndrome, which is why this scene does not treat a rising output as a rule.',
      textJa:
        'Ruiz-del-Arbol L ほか。肝硬変における循環機能と肝腎症候群。Hepatology. 2005。PMID 15977202 ― 肝腎症候群の発症時に心拍出量が低下することを示しており、本シーンが心拍出量の上昇を規則として扱わない理由です。',
    },
    {
      text: 'Schrier’s peripheral arterial vasodilation hypothesis; standard renal physiology of angiotensin II and of renal autoregulation; earlier reviews of the circulatory abnormalities of cirrhosis.',
      textJa:
        'Schrier の末梢動脈血管拡張仮説、アンジオテンシン II と腎自己調節に関する標準的な腎生理学、および肝硬変の循環動態異常に関する従来のレビュー。',
    },
    {
      text: 'None of it was reached from this network. Every source is cited for a proposition — a direction, a mechanism, an ordering, a definition — and never for a digit.',
      textJa:
        'いずれもこのネットワークからは参照できていません。すべての出典は命題（方向・機序・順序・定義）に対する引用であり、数値に対する引用ではありません。',
    },
  ],
  evidence: 'docs/model-evidence/hepatorenal-syndrome.md',
};

export const REEL_COPY = {
  hook: {
    title: 'Give the kidney no injury at all',
    titleJa: '腎臓に、障害を一切与えずに',
    subtitle: 'and the circulation alone takes filtration down',
    subtitleJa: '循環だけで、濾過量はここまで落ちます',
  },
  cards: {
    kidney: { label: 'With the signal', labelJa: 'シグナルあり' },
    released: { label: 'Signal removed', labelJa: 'シグナルを除くと' },
  },
  badge: {
    label: 'Cirrhosis and the vasodilation it induces',
    labelJa: '肝硬変と、それが引き起こす血管拡張',
  },
  /** Named so the reel cannot read as a completed model of the syndrome. */
  subject: {
    label: 'HRS-AKI · the haemodynamic mechanism',
    labelJa: 'HRS-AKI ― 循環からみる機序',
  },
  dilate: {
    caption: 'The arteries open, and the pressure falls despite a rising output',
    captionJa: '動脈が拡張し、心拍出量が増えても血圧は低下します',
  },
  defend: {
    caption: 'The body constricts every vessel that will listen — and the kidney listens',
    captionJa: '身体は反応するすべての血管を収縮させます。腎臓は、反応してしまいます',
  },
  fail: {
    caption: 'The afferent arteriole runs out of room, and filtration goes with the pressure',
    captionJa: '輸入細動脈の拡張余地が尽き、濾過量は血圧とともに落ちます',
  },
  boundary: {
    caption: 'In a patient there may be kidney injury as well — this model has none',
    captionJa: '実際の患者では腎障害が併存することもあります。このモデルには実装していません',
  },
  takeHome: {
    title: 'This is the circulation’s share alone',
    titleJa: 'これは、循環だけが担った分です',
  },
  note: {
    text: 'Conceptual model · haemodynamic mechanism only, no kidney injury modelled · not for diagnosis',
    textJa: '概念モデル｜循環の機序のみ・腎障害は未実装｜診断には使用できません',
  },
};

export const STORY_LABEL = {
  label: 'Walk through it',
  labelJa: '順に見る',
  hint: 'Five steps, each one the cause of the next. You set the pace.',
  hintJa: '5 つのステップ。それぞれが次の原因になります。進み方はあなたが決めます。',
};

export const LEARNING_LABEL = {
  label: 'Work through it',
  labelJa: '手を動かして理解する',
  hint: 'Predict, then check against the model.',
  hintJa: '予測してから、モデルで確かめます。',
};

export const DISCLAIMER =
  'Educational conceptual model. It isolates the haemodynamic and neurohumoral component of HRS-AKI; structural kidney injury is not represented, which is a boundary of the model and not a claim that real HRS-AKI never contains kidney injury. The vasoconstrictor activation is an index between 0 and 1, not a concentration. There is no ascites, no tubule, no time and no heart in this model, and it cannot distinguish HRS-AKI from prerenal azotaemia or acute tubular necrosis. Not for diagnosis or any clinical decision.';

export const DISCLAIMER_JA =
  '教育用の概念モデルです。HRS-AKI のうち循環・神経体液性の機序を分離して示しています。構造的腎障害は実装していませんが、これはモデルの境界であって、実際の HRS-AKI で腎障害が存在しないという意味ではありません。血管収縮系の活性化は 0〜1 の指標であり、濃度ではありません。このモデルには腹水も、尿細管も、時間軸も、心臓もなく、HRS-AKI を腎前性高窒素血症や急性尿細管壊死と区別することはできません。診断および臨床判断には使用できません。';

export const DISCLAIMER_SHORT =
  'Conceptual model · haemodynamic mechanism only, no kidney injury modelled · not for diagnosis';

export const DISCLAIMER_SHORT_JA = '概念モデル｜循環の機序のみ・腎障害は未実装｜診断には使用できません';
