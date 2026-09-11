/**
 * Everything the achalasia scene says, in both languages.
 *
 * No physiology lives here and no number is asserted here: every figure a
 * reader sees comes from [`src/models/achalasia.js`](../models/achalasia.js) at
 * the moment they see it.
 */

export const PALETTE = {
  esophagus: '#c9a2a6',
  wave: '#7fd8c4',
  bolus: '#e0c06a',
  retained: '#d7a344',
  sphincter: '#d8703f',
  neighbour: '#cfd6dd',
};

export const LEGEND = [
  { key: 'esophagus', label: 'Oesophagus', labelJa: '食道' },
  { key: 'wave', label: 'The travelling squeeze', labelJa: '伝わる収縮波' },
  { key: 'bolus', label: 'A swallow', labelJa: '嚥下された内容' },
  { key: 'sphincter', label: 'The ring at the bottom', labelJa: '下部食道括約筋' },
  { key: 'retained', label: 'What did not get through', labelJa: '通過できなかった分', activeFrom: 0.35 },
];

/**
 * The axis is **how far the two failures have gone**, and it moves them
 * together on purpose.
 *
 * Achalasia is the loss of one thing — the inhibitory supply that both lets the
 * ring open and lets the wave propagate — so a scene that moved them
 * independently would be teaching that they are separate diseases. Each is
 * still a control of its own, because a reader should be able to take one away
 * and see what the other does alone.
 *
 * **The mapping from the axis to the two is not linear, and the scene says so.**
 * The band in which a retained column can still make up the difference is
 * narrow — a column the height of the whole oesophagus is worth only about
 * sixteen millimetres of mercury — so a linear axis would cross it in a
 * twentieth of its travel and a reader dragging it would see a switch. The
 * curve puts that band across the middle of the axis. It changes which
 * parameter values a position corresponds to and nothing about what the model
 * does with them.
 */
export const STAGES = [
  {
    id: 'normal',
    name: 'A normal swallow',
    nameJa: '正常な嚥下',
    at: 0,
    focus: ['wave', 'sphincter'],
    summary:
      'A wave carries the bolus down the whole length of the tube, and the ring at the bottom lets go while it arrives. Nothing is left behind.',
    summaryJa:
      '収縮波が内容物を管の全長にわたって運び、到達に合わせて下端の輪が緩みます。残るものはありません。',
  },
  {
    id: 'aperistaltic',
    name: 'The wave stops travelling',
    nameJa: '波が最後まで届かない',
    at: 0.35,
    focus: ['wave'],
    summary:
      'The wave no longer reaches the bottom — it fades partway down, which is a different picture from a wave that pushes gently. The ring still lets go enough, so swallows still get through and nothing is retained yet.',
    summaryJa:
      '波はもはや下端まで届かず、途中で消えます。これは「弱く押す波」とは別の見え方です。輪の弛緩はまだ十分で、嚥下は通過し、貯留もまだありません。',
  },
  {
    id: 'retaining',
    name: 'Something collects',
    nameJa: '貯留が始まる',
    at: 0.5,
    focus: ['retained', 'sphincter'],
    summary:
      'The ring lets go less, swallows stop clearing, and what was swallowed stands in the tube. The column that collects presses on the ring with its own weight.',
    summaryJa:
      '輪の弛緩が不十分になり、嚥下は通過しきれなくなって、飲み込んだものが管の中に残ります。溜まった液柱は、自らの重みで輪を押します。',
  },
  {
    id: 'balanced',
    name: 'The column does the pushing',
    nameJa: '液柱が押す役を担う',
    at: 0.65,
    focus: ['retained', 'sphincter'],
    summary:
      'It stops growing when its own weight is enough to get each swallow through. Swallowing works again — from an oesophagus that is now holding a great deal — and that balance is where it settles.',
    summaryJa:
      '1 回ぶんの嚥下を通せるだけの重みになったところで、増加は止まります。嚥下はまた通るようになりますが、それは大量に抱えた食道からです。その釣り合いが落ち着き先です。',
  },
  {
    id: 'failed',
    name: 'No balance inside the oesophagus',
    nameJa: '食道内では釣り合わない',
    at: 1,
    focus: ['retained', 'sphincter'],
    summary:
      'Past a point the column would have to be taller than the oesophagus is to open the ring, and no balance exists inside it. The model reports that rather than a height it has no room for.',
    summaryJa:
      'ある点を越えると、輪を開くのに必要な液柱は食道の長さを超えてしまい、食道内に釣り合う点は存在しません。モデルは、収まりきらない高さを報告する代わりに、その事実を返します。',
  },
];

export const RANGE = { start: 'Normal', startJa: '正常', end: 'Failed', endJa: '完全な障害' };
export const PROGRESS_LABEL = {
  label: 'How far both failures have gone',
  labelJa: '2 つの障害がどこまで進んだか',
};

export const ANNOTATIONS = [
  { id: 'wave', text: 'The travelling squeeze', sub: '伝わる収縮波', anchor: 'wave', range: [0, 1], compact: false },
  { id: 'sphincter', text: 'The ring at the bottom', sub: '下部食道括約筋', anchor: 'sphincter', range: [0, 1], compact: false },
  { id: 'retained', text: 'What did not get through', sub: '通過できなかった分', anchor: 'retained', range: [0.3, 1], compact: false },
  { id: 'hiatus', text: 'Through the diaphragm', sub: '横隔膜の食道裂孔', anchor: 'hiatus', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'cleared', label: 'A swallow that gets through', labelJa: '通過できる割合', unit: '%', emphasis: true },
  { id: 'retained', label: 'Standing in the oesophagus', labelJa: '食道内の貯留量', unit: 'mL', emphasis: true },
  { id: 'height', label: 'Height of that column', labelJa: '液柱の高さ', unit: 'cm' },
  { id: 'columnPressure', label: 'Pressure it puts on the ring', labelJa: '液柱が括約筋にかける圧', unit: 'mmHg' },
  { id: 'wave', label: 'Pressure behind the bolus', labelJa: '内容物を押す圧', unit: 'mmHg' },
  { id: 'sphincter', label: 'Ring pressure during a swallow', labelJa: '嚥下時の括約筋圧', unit: 'mmHg' },
  { id: 'reach', label: 'How far the wave travels', labelJa: '波の到達範囲', unit: '% of length' },
  { id: 'balanced', label: 'A balance exists inside the oesophagus', labelJa: '食道内で釣り合うか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'relaxationFailure',
    label: 'How completely the ring fails to let go',
    labelJa: '括約筋が弛緩しない程度',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => (v === 0 ? 'relaxes fully' : `${Math.round(v * 100)}% of resting tone kept`),
  },
  {
    id: 'peristalticVigour',
    label: 'How well the wave propagates',
    labelJa: '蠕動波の伝播の良さ',
    min: 0,
    max: 1,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    id: 'swallowVolumeMl',
    label: 'What one swallow delivers',
    labelJa: '1 回の嚥下量',
    min: 2,
    max: 15,
    step: 0.5,
    format: (v) => `${v.toFixed(1)} mL`,
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'The two failures, one at a time',
  labelJa: '2 つの障害を、別々に',
  hint: 'The axis moves both together because one loss produces both. Here you can take away one and see what the other does alone.',
  hintJa: '軸は 2 つを同時に動かします（同じ喪失が両方を生むためです）。ここでは片方だけを外して、もう片方の働きを見られます。',
};

export const MODEL_SCOPE = {
  question:
    'A swallow needs a wave to carry it and a ring that lets go. When both fail, where does what was swallowed end up — and what settles the answer?',
  questionJa:
    '嚥下には、運ぶ波と、緩む輪の両方が要ります。その両方が損なわれたとき、飲み込んだものはどこへ行き、何がその答えを決めるのか。',
  answers: [
    {
      text: 'That two different failures are needed for the picture: a wave that does not propagate and a ring that does not open, and each alone does less than the pair.',
      textJa:
        'この病態には 2 つの異なる障害が要ること。伝播しない波と、開かない輪であり、どちらか一方だけでは両方そろったときほどにはなりません。',
    },
    {
      text: 'That what is retained is not simply what failed to pass: the column that collects supplies pressure of its own, and the oesophagus settles where that makes up the difference.',
      textJa:
        '貯留するものは「通らなかった分」の単純な積み上げではないこと。溜まった液柱自体が圧を生み、その差し引きが釣り合うところで落ち着きます。',
    },
    {
      text: 'Why that balance has a limit: a column the height of the whole oesophagus is worth about sixteen millimetres of mercury, and past a point no balance exists inside the organ at all.',
      textJa:
        'その釣り合いに限界がある理由。食道の全長ぶんの液柱でも約 16 mmHg にしかならず、ある点を越えると食道内に釣り合う点は存在しなくなります。',
    },
    {
      text: 'That a feeble wave does not push gently — it stops travelling, which is a different picture and the one a reader should recognise.',
      textJa:
        '弱い波は「やさしく押す」のではなく、途中で伝わらなくなること。見え方が別物であり、そこを見分けてほしい点です。',
    },
  ],
  excludes: [
    {
      text: 'Every cause. The model has a ring that does not let go and a wave that does not propagate, not a nerve, a ganglion cell or a reason.',
      textJa:
        '原因のすべて。モデルにあるのは「緩まない輪」と「伝わらない波」であって、神経細胞も原因も扱いません。',
    },
    {
      text: 'Manometry. Nothing here is an integrated relaxation pressure, a classification subtype or any measured tracing, and no pressure it reports is a diagnostic value.',
      textJa:
        '食道内圧検査。ここにある値は統合弛緩圧でも分類の型でも実測波形でもなく、報告する圧はいずれも診断基準値ではありません。',
    },
    {
      text: 'Regurgitation, aspiration, chest pain, weight, nutrition and long-term risk of any kind.',
      textJa: '逆流・誤嚥・胸痛・体重・栄養、および長期的なリスク全般。',
    },
    { text: 'Any treatment, and every consequence of one.', textJa: '治療とその結果。' },
    {
      text: 'Real time. The balance is found by running swallows until nothing changes; the number of swallows is not a number of days.',
      textJa:
        '実時間。釣り合いは「変化しなくなるまで嚥下を繰り返す」ことで求めており、その回数は日数ではありません。',
    },
  ],
  cautions: [
    {
      text: '**The axis moves both failures together**, because one loss produces both. In a person they do not move in step, and the model has no time in it to move them through. Each is a control of its own for exactly that reason.',
      textJa:
        '**軸は 2 つの障害を同時に動かします。**同じ喪失が両方を生むためです。実際の患者で両者が歩調を合わせて進むわけではなく、このモデルに時間はありません。だからこそ、それぞれ独立した操作子も用意しています。',
    },
    {
      text: 'The axis-to-parameter mapping is deliberately not linear: the band where a column can still make up the difference is narrow, and a linear axis would cross it in a twentieth of its travel. It changes which values a position corresponds to and nothing about the model.',
      textJa:
        '軸からパラメータへの対応は意図的に非線形です。液柱が差を埋められる範囲は狭く、線形だと軸の 20 分の 1 で通り過ぎてしまいます。対応づけを変えているだけで、モデルの計算は変えていません。',
    },
    {
      text: 'The conductance across the ring and the cross-section a column stands in are numbers this repository chose so that a normal swallow clears and a failed one balances inside a human oesophagus. They are not measurements, and no figure here is a threshold.',
      textJa:
        '括約筋のコンダクタンスと液柱の断面積は、正常な嚥下が通過し、障害時の釣り合いがヒトの食道内に収まるよう当リポジトリが選んだ値です。実測値ではなく、いずれも基準値でもありません。',
    },
    {
      text: 'The tube is the oesophagus atlas’s geometry, drawn to be legible. Its calibres and lengths are not anatomical measurements, and a dilated oesophagus on screen is a volume the model solved rather than a diameter it computed.',
      textJa:
        '管は食道アトラスのジオメトリで、判読しやすさのために描かれています。径も長さも解剖学的な実測ではなく、画面上の拡張はモデルが解いた容量であって計算された径ではありません。',
    },
  ],
  sources: [
    {
      text: 'Standard gastrointestinal physiology for a resting lower-oesophageal sphincter tone of some tens of millimetres of mercury, for swallow-induced relaxation, and for peristaltic amplitudes well above that tone.',
      textJa:
        '標準的な消化管生理学から、数十 mmHg の下部食道括約筋静止圧、嚥下による弛緩、およびその静止圧を大きく上回る蠕動波の圧。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of achalasia as the loss of both swallow-induced sphincter relaxation and oesophageal peristalsis, with retention and dilatation above.',
      textJa:
        '標準的なアカラシアの記載から、嚥下時の括約筋弛緩と食道蠕動の双方の消失、およびその上流での貯留と拡張。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. Every constant is a textbook central value or a stated calibration; none is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文の図表から取り出した数値は 1 つもありません。定数はすべて教科書的な代表値か、明示した較正値であり、フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/achalasia.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'esophagus-anatomy',
      label: 'The same tube, named',
      labelJa: '同じ管を、名前で',
      why: 'The oesophagus and the three places it is narrow, as structures you can point at — no swallow, no pressure.',
      whyJa: '食道と、狭くなる 3 か所を、名前で指せる構造として示します。嚥下も圧もありません。',
    },
    {
      slug: 'upper-gi-peristalsis',
      label: 'The same squeeze, further down',
      labelJa: '同じ収縮を、その先で',
      why: 'A travelling narrowing reading as transport in the oesophagus and as mixing in the stomach.',
      whyJa: '同じ「伝わる狭窄」が、食道では輸送に、胃では撹拌に見えることを示します。',
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
 * The row that matters is the dilatation. **The tube on this screen widens as
 * the model's retained volume rises, and the model has no diameter in it** — it
 * has a volume and a height. Nothing here is an oesophageal calibre.
 */
export const VISUAL_MAPPING = [
  {
    id: 'retained-column',
    target: 'the lower oesophagus',
    channel: 'geometry',
    from: 'retainedVolumeMl',
    reading: 'illustrative',
    claim: 'The tube is drawn wider and the column drawn taller as the volume the model settles on rises, and it stops where the model stops.',
    claimJa: 'モデルが落ち着いた貯留量が増えるほど、管は太く、液柱は高く描かれ、モデルが止まるところで止まります。',
    notClaim:
      'The drawn width is not an oesophageal diameter. The model solves a volume and a height, and has no calibre in it at all — nothing here is a measurement or a threshold for dilatation.',
    notClaimJa:
      '描かれた太さは食道径ではありません。モデルが解くのは容量と高さで、径は持ちません。実測値でも拡張の基準値でもありません。',
  },
  {
    id: 'travelling-wave',
    target: 'the oesophageal wall',
    channel: 'geometry',
    from: null,
    reading: 'illustrative',
    claim:
      'A narrowing travels from the throat towards the ring and stops where the model says the wave stops. How far it gets is the model’s; the depth of the indentation is drawn to be visible.',
    claimJa:
      '狭窄が咽頭側から輪へ向かって進み、モデルが「波が止まる」とした位置で止まります。どこまで届くかはモデルの答えで、くびれの深さは見えるように描いています。',
    notClaim:
      'It is not a manometric tracing and the indentation is not a pressure. A feeble wave is drawn as one that stops travelling, which is the model’s claim about reach and not a picture of an amplitude.',
    notClaimJa:
      '内圧検査の波形ではなく、くびれは圧そのものでもありません。弱い波は「途中で伝わらなくなる」として描いており、これは到達範囲についてのモデルの主張であって振幅の図示ではありません。',
  },
  {
    id: 'sphincter-opening',
    target: 'the ring at the bottom',
    channel: 'scale',
    from: 'sphincterPressureMmHg',
    reading: 'illustrative',
    claim: 'The ring opens during the swallow window by as much as the model says it relaxes, and not at all when the model says it does not.',
    claimJa: 'モデルが解いた弛緩の程度だけ、嚥下の時間帯に輪が開きます。弛緩しないと解いたときは開きません。',
    notClaim: 'The drawn aperture is not a lumen. The model has a pressure, not an opening, and no diameter follows from it.',
    notClaimJa: '描かれた開口は内腔ではありません。モデルにあるのは圧であって開口ではなく、そこから径は導けません。',
  },
];

export const DISCLAIMER =
  'Educational conceptual model of oesophageal transport. Pressures and volumes come from a swallow model calibrated to textbook central values, not from measurements of a person. It is not manometry, it identifies no cause, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '食道輸送の教育用概念モデルです。圧と容量は教科書的代表値に較正した嚥下モデルから導いたもので、個人の実測値ではありません。食道内圧検査ではなく、原因も特定せず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Conceptual swallow model — not manometry, not diagnosis.';
export const DISCLAIMER_SHORT_JA = '嚥下の概念モデル｜内圧検査でも診断でもありません。';
