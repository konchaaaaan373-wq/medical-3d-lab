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
    at: 0.3,
    focus: ['splanchnic'],
    summary:
      'Portal hypertension dilates the splanchnic arterioles, and the systemic beds dilate with them. A large low-resistance path has opened in parallel with everything else, so systemic vascular resistance falls. The heart answers by raising its output — and the answer is not complete, so arterial pressure falls anyway.',
    summaryJa:
      '門脈圧亢進により内臓細動脈が拡張し、全身の血管床もそれに伴って拡張します。他のすべてと並列に、大きな低抵抗路が開いたことになり、体血管抵抗が低下します。心臓は心拍出量を増やして応えますが、その代償は不完全であり、動脈圧は結局低下します。',
  },
  {
    id: 'activation',
    name: 'The body defends the pressure',
    nameJa: '身体が血圧を守る',
    at: 0.55,
    focus: ['aorta', 'systemic'],
    summary:
      'The fall in arterial pressure activates the renin-angiotensin-aldosterone system, the sympathetic nerves and vasopressin. They constrict every bed that will respond to them. The splanchnic bed will not — it is held open by local vasodilators — so the constriction lands on the beds that are still listening. The kidney is one of them.',
    summaryJa:
      '動脈圧の低下により、レニン・アンジオテンシン・アルドステロン系、交感神経、バゾプレシンが活性化します。これらは反応するすべての血管床を収縮させます。内臓循環は局所の血管拡張因子によって開いたままで反応しません。したがって収縮は、まだ反応する血管床に集中します。腎臓はその 1 つです。',
  },
  {
    id: 'defended',
    name: 'Filtration is defended first',
    nameJa: 'まず濾過が守られる',
    at: 0.75,
    focus: ['kidney'],
    summary:
      'Renal blood flow is already falling, and filtration is not. The efferent arteriole constricts more than the afferent one, which holds the pressure inside the glomerulus up, and the fraction of arriving plasma that is filtered rises. Meanwhile the afferent arteriole dilates to defend the flow — and that is a reserve, not a solution.',
    summaryJa:
      '腎血流はすでに低下していますが、濾過量は低下していません。輸出細動脈が輸入細動脈より強く収縮し、糸球体内の圧が保たれるため、到達した血漿のうち濾過される割合が上昇します。同時に輸入細動脈は血流を守るために拡張しますが、それは予備能であって、解決ではありません。',
  },
  {
    id: 'failure',
    name: 'The reserve runs out',
    nameJa: '予備能が尽きる',
    at: 1,
    focus: ['kidney', 'splanchnic'],
    summary:
      'The afferent arteriole cannot dilate any further against the tone it is working under. From here the renal circulation is pressure-dependent: blood flow follows the arterial pressure down, the glomerular pressure goes with it, and filtration falls steeply. Nothing has damaged the kidney. It has run out of room to compensate.',
    summaryJa:
      '輸入細動脈は、置かれた血管収縮緊張のもとでこれ以上拡張できません。ここから腎循環は圧依存性になります。腎血流は動脈圧とともに低下し、糸球体内圧もそれに従い、濾過量は急峻に低下します。腎臓を傷害したものは何もありません。代償する余地が尽きたのです。',
  },
];

export const RANGE = { start: 'Compensated', startJa: '代償期', end: 'Decompensated', endJa: '非代償期' };

export const PROGRESS_LABEL = {
  label: 'Cirrhosis and the vasodilation it induces',
  labelJa: '肝硬変と、それが引き起こす血管拡張',
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
  { id: 'released', label: 'The same kidney, signal removed', labelJa: '同じ腎臓・シグナルを除いた場合', unit: 'mL/min' },
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
    'If the kidney in hepatorenal syndrome is structurally near-normal, and recovers when it is transplanted into somebody else, what is actually stopping it from filtering?',
  questionJa:
    '肝腎症候群の腎臓が構造的にはほぼ正常で、他者に移植すれば機能を回復するのなら、いったい何が濾過を妨げているのか。',
  answers: [
    {
      text: 'That the kidney is being asked to filter at a perfusion pressure it can no longer autoregulate around — and that the reason it cannot is the circulation’s own attempt to stay alive.',
      textJa:
        '腎臓は、もはや自己調節できない灌流圧のもとで濾過を求められている、ということ。そしてその自己調節ができなくなった原因が、循環自身の生き延びようとする代償反応そのものである、ということです。',
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
      text: 'Why a drug with no systemic effect at all — a non-steroidal anti-inflammatory — can precipitate renal failure here and be harmless in the same person without the liver disease.',
      textJa:
        '全身作用をまったく持たない薬剤 — NSAIDs — が、なぜここでは腎不全を誘発し、同じ人が肝疾患を持たなければ無害でいられるのか。',
    },
    {
      text: 'Why the treatment is a vasoconstrictor rather than anything given to the kidney: it treats the circulation, and the kidney recovers because there was never anything wrong with it.',
      textJa:
        'なぜ治療が腎臓に対する何かではなく血管収縮薬なのか。治療の対象は循環であり、腎臓が回復するのは、そもそも腎臓に異常がなかったからです。',
    },
  ],
  excludes: [
    {
      text: 'Any tubule. No sodium handling, no urine output, no ascites, no dilutional hyponatraemia, and no tubuloglomerular feedback as a mechanism.',
      textJa:
        '尿細管は一切含まれません。ナトリウム処理も、尿量も、腹水も、希釈性低ナトリウム血症も、機序としての尿細管糸球体フィードバックもありません。',
    },
    {
      text: 'Any way to tell hepatorenal syndrome from prerenal azotaemia or from acute tubular necrosis — which is the distinction the diagnosis actually turns on.',
      textJa:
        '肝腎症候群を腎前性高窒素血症や急性尿細管壊死と区別する手段はありません。診断が実際に依拠しているのは、まさにその区別です。',
    },
    {
      text: 'Any time. This is an equilibrium: it cannot show the syndrome developing over days, or tell an acute course from a chronic one.',
      textJa:
        '時間軸はありません。これは平衡状態のモデルであり、数日かけて症候群が成立する過程も、急性と慢性の経過の違いも示せません。',
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
      text: 'The vasoconstrictor activation is an **index between 0 and 1**, standing for renin, angiotensin, aldosterone, noradrenaline and vasopressin at once. It has no units and it is not a concentration of anything.',
      textJa:
        '血管収縮系の活性化は **0 から 1 の指標**であり、レニン・アンジオテンシン・アルドステロン・ノルアドレナリン・バゾプレシンをまとめて代表しています。単位はなく、何らかの濃度でもありません。',
    },
    {
      text: 'The severity at which filtration collapses is a consequence of constants this repository invented. It is not a prediction about anybody, and there is no creatinine, no stage and no prognosis here.',
      textJa:
        '濾過量が破綻する重症度は、このリポジトリが定めた定数の帰結です。誰かについての予測ではなく、クレアチニン値も、病期も、予後もここにはありません。',
    },
    {
      text: 'The treatment controls have no dose in them. Both arms work every time here, with no non-responders and no adverse effects — terlipressin’s real ischaemic complications have no representation at all.',
      textJa:
        '治療のコントロールに用量の概念はありません。ここでは両方の治療が必ず奏功し、無効例も有害事象もありません。テルリプレシンの実際の虚血性合併症は一切表現されていません。',
    },
    {
      text: 'That the syndrome is functional rather than structural is a **design decision** of this model, not something it discovered: it has no way to represent structural kidney damage at all.',
      textJa:
        '本症候群が構造的でなく機能的であるという点は、このモデルが発見したことではなく、**設計上の決定**です。構造的な腎障害を表現する手段そのものがありません。',
    },
    {
      text: 'Filtration rises slightly above normal early on, because efferent constriction acts while the afferent arteriole is still shielded. Hyperfiltration is described in compensated cirrhosis, but this was not calibrated to it and the size is not a claim.',
      textJa:
        '経過の初期には濾過量が正常をわずかに上回ります。輸入細動脈がまだ保護されている間に輸出細動脈の収縮が働くためです。代償期肝硬変での過剰濾過は報告されていますが、このモデルはそれに合わせて較正されておらず、その大きさは主張ではありません。',
    },
  ],
  sources: [
    {
      text: 'Reviews of the circulatory abnormalities of cirrhosis and of hepatorenal syndrome; Schrier’s peripheral arterial vasodilation hypothesis; International Club of Ascites criteria; EASL and AASLD guidance on decompensated cirrhosis; standard renal physiology of angiotensin II and of renal autoregulation.',
      textJa:
        '肝硬変の循環動態異常および肝腎症候群のレビュー、Schrier の末梢動脈血管拡張仮説、International Club of Ascites の診断基準、非代償性肝硬変に関する EASL・AASLD のガイダンス、アンジオテンシン II と腎自己調節に関する標準的な腎生理学。',
    },
    {
      text: 'None of it was reached from this network. Every source is cited for a proposition — a direction, a mechanism, an ordering — and never for a digit.',
      textJa:
        'いずれもこのネットワークからは参照できていません。すべての出典は命題（方向・機序・順序）に対する引用であり、数値に対する引用ではありません。',
    },
  ],
  evidence: 'docs/model-evidence/hepatorenal-syndrome.md',
};

export const REEL_COPY = {
  hook: {
    title: 'The kidney is fine',
    titleJa: '腎臓に、異常はありません',
    subtitle: 'and it has stopped filtering',
    subtitleJa: 'それでも、濾過は止まりかけています',
  },
  cards: {
    kidney: { label: 'This kidney', labelJa: 'この腎臓' },
    released: { label: 'Same kidney, signal removed', labelJa: '同じ腎臓・シグナルを除くと' },
  },
  badge: {
    label: 'Cirrhosis and the vasodilation it induces',
    labelJa: '肝硬変と、それが引き起こす血管拡張',
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
  takeHome: {
    title: 'Nothing damaged the kidney',
    titleJa: '腎臓を傷害したものは、ありません',
  },
  note: {
    text: 'Conceptual model · an index, not a concentration · not for diagnosis',
    textJa: '概念モデル｜濃度ではなく指標｜診断には使用できません',
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
  'Educational conceptual model. The vasoconstrictor activation is an index between 0 and 1, not a concentration. There is no tubule, no time and no heart in this model, and it cannot distinguish hepatorenal syndrome from prerenal azotaemia or acute tubular necrosis. Not for diagnosis or any clinical decision.';

export const DISCLAIMER_JA =
  '教育用の概念モデルです。血管収縮系の活性化は 0〜1 の指標であり、濃度ではありません。このモデルには尿細管も、時間軸も、心臓もなく、肝腎症候群を腎前性高窒素血症や急性尿細管壊死と区別することはできません。診断および臨床判断には使用できません。';

export const DISCLAIMER_SHORT = 'Conceptual model · an index, not a concentration · not for diagnosis';

export const DISCLAIMER_SHORT_JA = '概念モデル｜濃度ではなく指標｜診断には使用できません';
