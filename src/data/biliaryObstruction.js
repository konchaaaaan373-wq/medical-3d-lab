/**
 * Everything the biliary-obstruction scene says, in both languages.
 *
 * No physiology lives here and no number is asserted here: every figure a
 * reader sees comes from [`src/models/biliaryObstruction.js`](../models/biliaryObstruction.js)
 * at the moment they see it. What this file holds is the wording, the palette,
 * the axes and the boundary of the claim.
 *
 * **The scene is a set of alternatives, not a course.** `site` chooses where
 * the blockage is and the axis says how complete it is — the same shape the
 * renal scene uses, and for the same reason: a stone in the cystic duct is not
 * an early version of a stone in the common bile duct.
 */

export const PALETTE = {
  duct: '#3f7d52',
  gallbladder: '#c9b23c',
  pancreaticDuct: '#57bda4',
  bile: '#d8c25a',
  pressure: '#e0713f',
  papilla: '#c8603f',
  blocked: '#d84a3f',
};

export const LEGEND = [
  { key: 'duct', label: 'Bile duct', labelJa: '胆管' },
  { key: 'gallbladder', label: 'Gallbladder', labelJa: '胆嚢' },
  { key: 'pancreaticDuct', label: 'Pancreatic duct', labelJa: '膵管' },
  { key: 'bile', label: 'Bile reaching the gut', labelJa: '腸へ届く胆汁' },
  { key: 'pressure', label: 'Behind the blockage', labelJa: '閉塞の上流', activeFrom: 0.1 },
  { key: 'blocked', label: 'Where the blockage is', labelJa: '閉塞部位', activeFrom: 0.1 },
];

/**
 * The axis is **how complete the blockage is**, not which one it is.
 *
 * Which one lives on the model controls, where it can be changed without
 * implying that the previous one turned into it. What the three stages mean
 * therefore depends on the site selected — `partial` at the cystic duct is a
 * gallbladder that has stopped keeping up, and at the ampulla it is two ducts
 * losing their way out at once.
 */
export const STAGES = [
  {
    id: 'patent',
    name: 'Open',
    nameJa: '開通',
    at: 0,
    focus: ['gallbladder', 'papilla'],
    summary:
      'Bile is secreted continuously, crosses the ducts against a few centimetres of water, and leaves at the papilla. The gallbladder sits on the side of that path and keeps up with it.',
    summaryJa:
      '胆汁は持続的に分泌され、数 cmH₂O の圧に抗して胆管を通り、乳頭から出ていきます。胆嚢はその経路の脇にあり、遅れずに追従しています。',
  },
  {
    id: 'partial',
    name: 'Partly blocked',
    nameJa: '部分閉塞',
    at: 0.5,
    focus: ['blockage', 'gallbladder'],
    summary:
      'The chosen resistance has risen. What that costs depends on where it is: on the bile path the pressure above it climbs and less arrives at the gut; off it, the flow to the gut is untouched.',
    summaryJa:
      '選んだ部位の抵抗が上がりました。その代償は場所によって違います。胆汁の経路上なら上流の圧が上がり腸へ届く量が減りますが、経路外なら腸への流量は変わりません。',
  },
  {
    id: 'complete',
    name: 'Blocked',
    nameJa: '完全閉塞',
    at: 1,
    focus: ['blockage', 'papilla'],
    summary:
      'The pressure above the blockage has climbed to the ceiling secretion works against, and flow past it has all but stopped. Nothing here ruptures and nothing bursts: the liver stops pushing.',
    summaryJa:
      '閉塞の上流の圧は、分泌が抗しうる上限まで上がり、通過する流量はほぼ止まります。ここでは破裂は起きません。肝臓が押すのをやめるためです。',
  },
];

export const RANGE = { start: 'Open', startJa: '開通', end: 'Blocked', endJa: '完全閉塞' };
export const PROGRESS_LABEL = {
  label: 'How complete the blockage is — not which one',
  labelJa: '閉塞の程度（部位ではありません）',
};

export const ANNOTATIONS = [
  { id: 'gallbladder', text: 'Gallbladder', sub: '胆嚢', anchor: 'gallbladder', range: [0, 1], compact: false },
  { id: 'cystic', text: 'Cystic duct', sub: '胆嚢管', anchor: 'cystic', range: [0, 1], compact: false },
  { id: 'commonBile', text: 'Common bile duct', sub: '総胆管', anchor: 'commonBile', range: [0, 1], compact: false },
  { id: 'pancreaticDuct', text: 'Pancreatic duct', sub: '膵管', anchor: 'pancreaticDuct', range: [0, 1], compact: false },
  { id: 'papilla', text: 'Where both open into the gut', sub: '十二指腸乳頭', anchor: 'papilla', range: [0, 1], compact: false },
  { id: 'blockage', text: 'The blockage', sub: '閉塞部位', anchor: 'blockage', range: [0.08, 1], compact: false },
];

/** Read-out rows. The values come from the model; only the wording is here. */
export const METRICS = [
  { id: 'bile', label: 'Bile reaching the gut', labelJa: '腸へ届く胆汁', unit: '% of normal', emphasis: true },
  { id: 'pancreatic', label: 'Pancreatic juice reaching the gut', labelJa: '腸へ届く膵液', unit: '% of normal', emphasis: true },
  { id: 'cbd', label: 'Common bile duct pressure', labelJa: '総胆管内圧', unit: 'cmH₂O' },
  { id: 'chd', label: 'Common hepatic duct pressure', labelJa: '総肝管内圧', unit: 'cmH₂O' },
  { id: 'pancreaticPressure', label: 'Pancreatic duct pressure', labelJa: '膵管内圧', unit: 'cmH₂O' },
  { id: 'gallbladderVolume', label: 'Gallbladder volume', labelJa: '胆嚢容量', unit: 'mL' },
  { id: 'gallbladderTau', label: 'Gallbladder time constant (R·C across the cystic duct)', labelJa: '胆嚢の時定数（胆嚢管の R·C）', unit: 'min' },
  { id: 'connected', label: 'Gallbladder keeping up over a meal', labelJa: '食事の時間内に胆嚢が追従できるか', unit: '' },
  { id: 'behind', label: 'Segments behind the blockage', labelJa: '閉塞より上流の区間', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'site',
    kind: 'choice',
    label: 'Where the blockage is',
    labelJa: '閉塞の部位',
    options: [
      {
        value: 'none',
        label: 'Nothing blocked',
        labelJa: '閉塞なし',
        effect: 'Bile crosses the ducts and leaves at the papilla; the gallbladder keeps up with it.',
        effectJa: '胆汁は胆管を通って乳頭から出ていき、胆嚢もそれに追従します。',
      },
      {
        value: 'cystic-duct',
        label: 'Cystic duct',
        labelJa: '胆嚢管',
        effect: 'Off the bile path. The gallbladder stops keeping up; what reaches the gut does not change.',
        effectJa: '胆汁の経路上にはありません。胆嚢は追従できなくなりますが、腸へ届く量は変わりません。',
      },
      {
        value: 'common-bile-duct',
        label: 'Common bile duct',
        labelJa: '総胆管',
        effect: 'On the bile path, above the papilla. Everything above it is pressurised — the gallbladder included — and the pancreatic duct is not.',
        effectJa: '胆汁の経路上、乳頭より上流です。上流はすべて圧が上がり（胆嚢を含む）、膵管は影響を受けません。',
      },
      {
        value: 'ampulla',
        label: 'At the papilla',
        labelJa: '乳頭部',
        effect: 'The one place the two ducts share. Both lose their way out together.',
        effectJa: '2 本の管が唯一共有する場所です。両方が同時に出口を失います。',
      },
    ],
  },
  {
    id: 'pancreaticSecretion',
    label: 'Pancreatic secretion (rest → a meal)',
    labelJa: '膵外分泌（安静時→食後）',
    min: 1,
    max: 4,
    step: 0.1,
    format: (v) => `×${v.toFixed(1)}`,
  },
  {
    id: 'hepaticSecretion',
    label: 'Bile secretion',
    labelJa: '胆汁分泌量',
    min: 0.5,
    max: 1.6,
    step: 0.05,
    format: (v) => `×${v.toFixed(2)}`,
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Where the blockage is',
  labelJa: '閉塞の部位',
  hint: 'Choosing a different site is choosing a different problem, not a later one.',
  hintJa: '部位を変えることは、別の問題を選ぶことであって、進行した状態を選ぶことではありません。',
};

export const MODEL_SCOPE = {
  question: 'Given a blockage at one place in the biliary tree, which parts of the tree are behind it — and which are not?',
  questionJa:
    '胆道のある一点が詰まったとき、上流になるのはどの部分で、どの部分はそうでないのか。',
  answers: [
    {
      text: 'That the answer is decided by where the blockage sits, not by how severe it is: the pressure at a point is the flow times the resistance still downstream of it.',
      textJa:
        '答えを決めるのは重症度ではなく部位であること。ある点の圧は、流量とその点より下流に残る抵抗の積です。',
    },
    {
      text: 'That a cystic-duct blockage leaves the flow to the gut untouched, because the gallbladder is a dead end and is not on the path.',
      textJa: '胆嚢管の閉塞では腸へ届く量が変わらないこと。胆嚢は行き止まりで、経路上にないためです。',
    },
    {
      text: 'That a common-bile-duct blockage distends the gallbladder as well, because an open cystic duct puts it at the same pressure as the duct it hangs off.',
      textJa:
        '総胆管の閉塞では胆嚢も膨らむこと。胆嚢管が開いていれば、胆嚢は接続先の胆管と同じ圧に置かれるためです。',
    },
    {
      text: 'That only a blockage at the papilla reaches the pancreatic duct, because the sphincter is the only resistance the two paths share.',
      textJa:
        '膵管に及ぶのは乳頭部の閉塞だけであること。2 つの経路が共有する抵抗は括約筋だけだからです。',
    },
    {
      text: 'Why a complete blockage does not produce an unbounded pressure: bile secretion falls as duct pressure rises and stops at a ceiling, so the liver gives up before anything bursts.',
      textJa:
        '完全閉塞でも圧が無限に上がらない理由。胆汁分泌は胆管内圧の上昇とともに低下し、ある上限で止まります。破裂の前に肝臓が押すのをやめます。',
    },
    {
      text: 'Why a cystic duct does not have to be nearly shut before the gallbladder stops keeping up: what matters is its resistance times the gallbladder’s compliance, against the time a meal takes.',
      textJa:
        '胆嚢管がほぼ閉じる前から胆嚢が追従できなくなる理由。効くのは「胆嚢管の抵抗 × 胆嚢のコンプライアンス」と、食事にかかる時間との比です。',
    },
  ],
  excludes: [
    {
      text: 'Bilirubin, jaundice, pale stools and dark urine. The model has pressures and flows; it does not carry a pigment.',
      textJa: 'ビリルビン、黄疸、便・尿の色調。このモデルにあるのは圧と流量であり、色素は扱いません。',
    },
    {
      text: 'Pain, inflammation, infection and every diagnosis. Nothing here becomes cholecystitis, cholangitis or pancreatitis.',
      textJa:
        '疼痛、炎症、感染、および一切の診断名。ここから胆嚢炎・胆管炎・膵炎になることはありません。',
    },
    {
      text: 'The stone itself. There is no object in this model — only a resistance that rose at a named place.',
      textJa: '結石そのもの。このモデルに物体はなく、あるのは特定の部位で上がった抵抗だけです。',
    },
    {
      text: 'Time. Every state is an equilibrium, so nothing here can show a duct dilating over days or a gallbladder filling over hours. The one time in the model is the cystic duct’s time constant, which is a ratio and not a course.',
      textJa:
        '時間経過。すべての状態は平衡であり、胆管が日単位で拡張する様子も胆嚢が時間単位で充満する様子も示せません。モデル内の唯一の時間は胆嚢管の時定数で、これは比であって経過ではありません。',
    },
    {
      text: 'Any treatment, and every consequence of one. No drainage, no stone removal, no sphincter.',
      textJa: '介入とその結果。ドレナージ、結石除去、括約筋処置はいずれも扱いません。',
    },
  ],
  cautions: [
    {
      text: '**The resistances are calibration constants, not measurements.** They are the numbers that put an unobstructed common bile duct near ten centimetres of water at an ordinary bile flow. No such measurement exists for a person.',
      textJa:
        '**抵抗値は較正定数であって実測値ではありません。** 通常の胆汁流量で非閉塞の総胆管が約 10 cmH₂O になるよう選んだ値です。個人についてのそのような実測値は存在しません。',
    },
    {
      text: 'The geometry is a schematic biliary tree drawn to be legible. Calibres, lengths and angles are not anatomical measurements, and the model claims the **order** of the segments, not their sizes.',
      textJa:
        'ジオメトリは判読しやすさのために描いた模式的な胆道です。径・長さ・角度は解剖学的な実測ではなく、モデルが主張するのは区間の**順序**であって寸法ではありません。',
    },
    {
      text: 'A pancreatic duct and a common bile duct that share a channel is one of several arrangements. Where they open separately, an ampullary blockage does not behave as it does here.',
      textJa:
        '膵管と総胆管が共通管をなす配置は、いくつかある型の一つです。別々に開口する型では、乳頭部の閉塞はここで示すようには振る舞いません。',
    },
    {
      text: 'The four sites are four alternatives. Choosing one after another is a reader comparing mechanisms, not a patient progressing, and nothing in this scene should be read as one becoming the next.',
      textJa:
        '4 つの部位は 4 つの選択肢です。順に選ぶのは機序を見比べているのであって、患者が進行しているのではありません。一方が他方になると読まないでください。',
    },
  ],
  sources: [
    {
      text: 'Standard biliary physiology for continuous hepatic bile secretion, for its fall against rising duct pressure, and for the maximum secretory pressure of a few tens of centimetres of water.',
      textJa:
        '標準的な胆道生理学から、肝臓による持続的な胆汁分泌、胆管内圧の上昇に伴う分泌低下、および数十 cmH₂O の最大分泌圧。',
      kind: 'textbook',
    },
    {
      text: 'Standard surgical and radiological anatomy for the order of the segments: right and left hepatic ducts to the common hepatic duct, the cystic duct joining it to make the common bile duct, and the common bile duct meeting the main pancreatic duct at the papilla.',
      textJa:
        '標準的な外科・画像解剖から区間の順序。左右肝管が総肝管を作り、そこへ胆嚢管が合流して総胆管となり、総胆管は乳頭部で主膵管と合します。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. Every constant is a textbook central value or a stated calibration; none is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文の図表から取り出した数値は 1 つもありません。定数はすべて教科書的な代表値か、明示した較正値であり、フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/biliary-obstruction.md',
};

/**
 * The other models that draw these structures, and the sentence that goes with
 * them.
 *
 * The biliary atlas is where the same ducts are named without anything flowing
 * through them; this scene borrows that atlas's geometry builder outright
 * rather than drawing a second biliary tree, so the names point at the same
 * meshes. That does not make them one model: the atlas has no pressure in it
 * and this has no anatomy claim in it.
 */
export const RELATED = {
  scenes: [
    {
      slug: 'biliary-anatomy',
      label: 'The same ducts, named',
      labelJa: '同じ胆道を、名前で',
      why: 'The gallbladder and the ducts as structures you can point at — no flow, no pressure, no blockage.',
      whyJa: '胆嚢と胆管を、名前で指せる構造として示します。流れも圧も閉塞もありません。',
    },
    {
      slug: 'portal-hypertension',
      label: 'The liver’s other outflow problem',
      labelJa: '肝臓のもう一つの流出障害',
      why: 'Blood rather than bile, and a resistance inside the liver rather than a blockage below it.',
      whyJa: '胆汁ではなく血液、肝臓より下流の閉塞ではなく肝内の抵抗を扱います。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

/**
 * What the 3D does with the numbers, declared so it can be checked and quoted.
 *
 * The row that matters is the duct calibre. **Ducts on this screen swell when
 * the pressure behind them rises, and the model has no diameter in it at all** —
 * it has a resistance and a pressure. A reader, or a slide made from a
 * screenshot, must not come away with a duct measurement. See
 * `src/data/visualMapping.js`.
 */
export const VISUAL_MAPPING = [
  {
    id: 'duct-distension',
    target: 'ducts behind the blockage',
    channel: 'scale',
    from: 'pressure',
    reading: 'illustrative',
    claim: 'A segment is drawn wider when the model says the pressure in it has risen above its unobstructed value, and not otherwise.',
    claimJa: 'モデルが「非閉塞時より圧が上がった」と解いた区間だけが、太く描かれます。',
    notClaim:
      'The drawn calibre is not a duct diameter. This model has a resistance and a pressure; it has no lumen, and nothing here is a measurement or a threshold for dilatation.',
    notClaimJa:
      '描かれた太さは胆管径ではありません。このモデルにあるのは抵抗と圧であって内腔はなく、拡張の実測値でも基準値でもありません。',
  },
  {
    id: 'gallbladder-volume',
    target: 'gallbladder',
    channel: 'scale',
    from: 'gallbladderVolumeMl',
    reading: 'illustrative',
    claim: 'The gallbladder is drawn larger as the volume the model solves for it rises, and stays put when the model says it is cut off from the duct.',
    claimJa: 'モデルが解いた容量が増えるほど胆嚢は大きく描かれ、胆管から切り離されたと解いたときは変化しません。',
    notClaim: 'The drawn size is scaled for legibility. Do not read millilitres off the screen — the read-out has them.',
    notClaimJa: '描画上の大きさは判読のために調整しています。画面から mL を読み取らないでください（数値は読み出しにあります）。',
  },
  {
    id: 'bile-stream',
    target: 'bile',
    channel: 'motion',
    from: 'bileToDuodenumMlPerMin',
    reading: 'illustrative',
    claim: 'The stream runs along the path bile actually takes in the model and thins as the flow the model solves falls.',
    claimJa: 'ストリームはモデル上で胆汁が実際に通る経路を流れ、解かれた流量が落ちると細くなります。',
    notClaim: 'The speed and density are presentation. Read the flow from the read-out, not from the animation.',
    notClaimJa: '速さと濃さは演出です。流量はアニメーションではなく読み出しから読んでください。',
  },
  {
    id: 'blockage-marker',
    target: 'the obstructed segment',
    channel: 'colour',
    from: null,
    reading: 'thresholded',
    claim: 'The segment the reader selected is marked once the blockage is more than nominal, so it is clear which resistance rose.',
    claimJa: '閉塞が名目以上になった時点で、選択した区間に印がつきます。どの抵抗が上がったのかを示すためです。',
    notClaim: 'It marks a choice the reader made. It is not a stone, and nothing here located anything.',
    notClaimJa: '示しているのは読者が選んだ部位です。結石ではありませんし、何かを見つけたわけでもありません。',
  },
];

export const DISCLAIMER =
  'Educational conceptual model of biliary outflow. Pressures and flows come from a four-resistance duct model calibrated to textbook central values, not from measurements of a person. It does not represent bilirubin, jaundice, pain, inflammation or infection, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '胆汁流出の教育用概念モデルです。圧と流量は教科書的代表値に較正した 4 抵抗の胆管モデルから導いたもので、個人の実測値ではありません。ビリルビン・黄疸・疼痛・炎症・感染は表現しておらず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Conceptual duct model — no bilirubin, no diagnosis.';
export const DISCLAIMER_SHORT_JA = '胆管の概念モデル｜ビリルビンは扱いません。診断には使用できません。';
