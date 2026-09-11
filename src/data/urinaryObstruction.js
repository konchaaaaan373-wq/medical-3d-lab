/**
 * Copy and configuration for the urinary obstruction scene.
 *
 * The scene's subject is **where**, and its awkward job is to keep "where" from
 * being read as "how bad". So the level is a model control with five places on
 * it, and the axis underneath is how much has backed up — two things that a
 * single slider would have silently merged.
 */

export const PALETTE = {
  capsule: '#d9c3a6',
  parenchyma: '#cf6f62',
  collecting: '#63d3c0',
  tract: '#7fd8c8',
  distended: '#ffb02e',
  spared: '#8e6f6c',
  blockage: '#ff3d6e',
};

export const LEGEND = [
  { key: 'collecting', label: 'The collecting system and the tract below it', labelJa: '腎盂と、その下の尿路' },
  { key: 'distended', label: 'Above the blockage, and filling', labelJa: '閉塞より上流｜溜まっている部分' },
  { key: 'spared', label: 'The side that is not behind it', labelJa: '閉塞の上流にない側' },
  { key: 'parenchyma', label: 'The filtering tissue, between the two', labelJa: '両者のあいだの腎実質' },
];

/**
 * The axis is **how much has backed up behind the blockage**.
 *
 * Not time and not severity of disease. Where the blockage is lives on the
 * model controls, because five places are five arrangements: a blockage does
 * not travel down the tract, and an axis between the levels would say it does.
 */
export const STAGES = [
  {
    id: 'draining',
    name: 'Two tubes that join at the bladder',
    nameJa: '膀胱で合流する 2 本の管',
    at: 0,
    focus: ['leftKidney', 'rightKidney', 'bladder'],
    summary:
      'Each kidney drains through a tube of its own, and the two meet only at the bladder. Everything the scene claims follows from that arrangement.',
    summaryJa:
      '左右の腎はそれぞれ自分の管で排出し、2 本は膀胱で初めて合流します。このシーンの主張はすべて、この配置から導かれます。',
  },
  {
    id: 'backing-up',
    name: 'What is above it fills',
    nameJa: '上流が満たされる',
    at: 0.5,
    focus: ['blockage', 'leftKidney'],
    summary:
      'The stretch the blockage is in and everything above it takes what cannot get past. How much of the tract that is, and how many kidneys, is settled by the place.',
    summaryJa:
      '閉塞のある区間とその上流が、通過できなかった分を受け止めます。それが尿路のどこまでか、腎がいくつかは、場所によって決まります。',
  },
  {
    id: 'taken-from-the-kidney',
    name: 'The room comes out of the kidney',
    nameJa: '広がる場所は腎実質から出てくる',
    at: 1,
    focus: ['parenchyma', 'leftKidney'],
    summary:
      'A kidney is inside a capsule that barely stretches. So a collecting system that has filled is a parenchyma that has thinned — the same volume, counted from the other side.',
    summaryJa:
      '腎は、ほとんど伸びない被膜の中にあります。したがって「腎盂が広がった」ことと「腎実質が薄くなった」ことは、同じ体積を反対側から数えたものです。',
  },
];

export const RANGE = { start: 'Draining', startJa: '流れている', end: 'Backed up', endJa: '溜まりきっている' };
export const PROGRESS_LABEL = {
  label: 'How much has backed up behind it',
  labelJa: '閉塞より上流にどれだけ溜まったか',
};

export const ANNOTATIONS = [
  { id: 'leftKidney', text: 'One kidney', sub: '一方の腎', anchor: 'leftKidney', range: [0, 1], compact: false },
  { id: 'rightKidney', text: 'The other kidney', sub: 'もう一方の腎', anchor: 'rightKidney', range: [0, 1], compact: false },
  { id: 'bladder', text: 'The bladder', sub: '膀胱', anchor: 'bladder', range: [0, 1], compact: false },
  { id: 'blockage', text: 'Where the picture changes', sub: '閉塞部', anchor: 'blockage', range: [0.06, 1], compact: false },
  { id: 'parenchyma', text: 'The filtering tissue', sub: '腎実質', anchor: 'parenchyma', range: [0.2, 1], compact: false },
  { id: 'spared', text: 'Not behind the blockage', sub: '閉塞の上流にない側', anchor: 'spared', range: [0.2, 1], compact: false },
];

export const METRICS = [
  { id: 'kidneys', label: 'How many kidneys are behind the blockage', labelJa: '閉塞より上流にある腎の数', unit: '', emphasis: true },
  { id: 'parenchyma', label: 'What is left of the parenchyma’s thickness there, against this model’s own resting one', labelJa: 'その腎に残る実質の厚み（このモデルの安静時に対する比）', unit: '%', emphasis: true },
  { id: 'pelvis', label: 'The collecting system, against its own resting size', labelJa: '腎盂の大きさ（自身の安静時に対する比）', unit: '×' },
  { id: 'capsule', label: 'And the kidney’s outside, against its own', labelJa: '腎の外形（自身の安静時に対する比）', unit: '×' },
  { id: 'tract', label: 'How much of the drawn tract is distended', unit: '%', labelJa: '描かれた尿路のうち拡張している割合' },
];

export const MODEL_CONTROLS = [
  {
    id: 'level',
    kind: 'choice',
    label: 'Where the blockage is',
    labelJa: '閉塞の場所',
    options: [
      {
        value: 'none',
        label: 'Nowhere',
        labelJa: 'なし',
        effect: 'Both kidneys drain and nothing is distended.',
        effectJa: '左右とも流れており、どこも拡張していません。',
      },
      {
        value: 'pelviureteric',
        label: 'Where the pelvis becomes the ureter',
        labelJa: '腎盂尿管移行部',
        effect: 'One kidney is above it, and the ureter below it is not. The collecting system fills and the tube stays as it was.',
        effectJa: '上流にあるのは片方の腎だけで、その下の尿管は含まれません。腎盂が満たされ、管はそのままです。',
      },
      {
        value: 'mid-ureter',
        label: 'Partway down one ureter',
        labelJa: '片側の尿管の途中',
        effect: 'One kidney and the upper half of its tube. The same kidney as before, with more of the tract behind it.',
        effectJa: '片方の腎と、その管の上半分です。腎は同じで、上流に含まれる尿路が増えます。',
      },
      {
        value: 'vesicoureteric',
        label: 'Where that ureter meets the bladder',
        labelJa: '尿管膀胱移行部',
        effect: 'One kidney and the whole of its tube. Still one side: the bladder is below it and so is the other ureter.',
        effectJa: '片方の腎と、その管の全長です。それでも片側のままで、膀胱ももう一方の尿管も下流側にあります。',
      },
      {
        value: 'bladder-outlet',
        label: 'At the way out of the bladder',
        labelJa: '膀胱の出口',
        effect: 'The bladder, both tubes and both kidneys. This is the one place where the number of kidneys behind it changes.',
        effectJa: '膀胱・左右の管・左右の腎のすべてです。上流にある腎の数が変わるのは、この場所だけです。',
      },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Five places, and only one of them takes both kidneys',
  labelJa: '5 つの場所、そのうち両腎を含むのは 1 つだけ',
  hint: 'Five arrangements, not five degrees. The place decides what is above it; the slider decides how full it is.',
  hintJa: '5 通りの配置であって 5 段階ではありません。場所は「何が上流にあるか」を、スライダーは「どれだけ溜まったか」を決めます。',
};

export const MODEL_SCOPE = {
  question:
    'A urinary tract blocked at one place — what does the place decide that the amount cannot?',
  questionJa:
    '尿路が 1 か所で塞がれたとき、「量」では決まらず「場所」で決まるものは何か。',
  answers: [
    {
      text: 'That the tract is two tubes joining at the bladder, so **how many kidneys are behind the blockage** is a property of where it is. Above the bladder it is one; at the way out of the bladder it is both.',
      textJa:
        '尿路は膀胱で合流する 2 本の管であるため、**閉塞より上流にある腎がいくつか**は「場所」の性質であること。膀胱より上なら 1 つ、膀胱の出口なら両方です。',
    },
    {
      text: 'That how much of the tract is distended is also the place’s doing: the same kidney sits behind a blockage at the top of its ureter and behind one at the bottom, with a different length of tube between.',
      textJa:
        '尿路のどこまでが拡張するかも「場所」で決まること。尿管の上端で塞がれても下端で塞がれても上流にあるのは同じ腎ですが、あいだにある管の長さは違います。',
    },
    {
      text: 'That a kidney is inside a capsule which barely stretches, so a collecting system that fills takes its room from the parenchyma next to it. The dilated pelvis and the thinned parenchyma are the same volume counted twice.',
      textJa:
        '腎はほとんど伸びない被膜の中にあるため、満たされた腎盂は隣の実質から場所を得ること。広がった腎盂と薄くなった実質は、同じ体積を二度数えたものです。',
    },
    {
      text: 'That the side which is not behind the blockage is not in the picture the blockage makes — it is drawn unchanged because this model changes nothing about it.',
      textJa:
        '閉塞の上流にない側は、その閉塞が作る像に含まれないこと。本モデルはその側に何もしないため、変化なしで描かれます。',
    },
  ],
  excludes: [
    {
      text: '**All kidney function.** No filtration, no creatinine, no urine output, no recovery and no loss. A parenchyma drawn thinner here is a thickness in a drawing and **says nothing about what the kidney is doing** — `renal-filtration` is a separate model with its own scope, and nothing here is coupled to it.',
      textJa:
        '**腎機能のすべて。** 濾過も、クレアチニンも、尿量も、回復も、喪失もありません。ここで薄く描かれた実質は「図の中の厚み」であって、**腎が何をしているかについては何も述べていません。** `renal-filtration` は独立したモデルであり、ここの値とは一切結びついていません。',
    },
    {
      text: '**Every grade and stage.** This model does not grade hydronephrosis. No output here is a grade, a stage or a threshold, and a geometry cannot be one.',
      textJa:
        '**あらゆる grade と stage。** 本モデルは水腎症の grading を行いません。ここの出力はどれも grade でも stage でも閾値でもなく、幾何形状がそれになることはありません。',
    },
    {
      text: 'The cause of the obstruction: no stone, no tumour, no stricture, no prostate and no pregnancy. The scene says where, and nothing about what is there.',
      textJa:
        '閉塞の原因（結石・腫瘍・狭窄・前立腺・妊娠のいずれもありません）。このシーンが述べるのは「どこか」だけで、「そこに何があるか」は述べません。',
    },
    {
      text: 'Time, and every symptom. Nothing here is hours or days, the axis is how much has backed up rather than how long, and there is no pain, no fever, no infection and no treatment.',
      textJa:
        '時間、そしてあらゆる症状。ここに時間の単位はなく、軸は「どれだけ溜まったか」であって経過時間ではありません。痛み・発熱・感染・治療のいずれも含みません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** Every volume is measured off this repository’s own kidney, ureter and bladder builders, whose proportions are drawn to be legible. The parenchymal thickness is reported against **this model’s own resting thickness** and is not a millimetre of cortex on anybody’s scan.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** すべての体積は、このリポジトリ自身の腎・尿管・膀胱のビルダーから測ったもので、それらの比率は「見分けられるように」描かれています。実質の厚みは**このモデル自身の安静時の厚み**に対する比であり、誰かの画像上の皮質の mm ではありません。',
    },
    {
      text: 'The thickness falls faster than the volume does, because a thin shell around a large cavity still holds a good deal. Both are in the read-out for that reason, and neither is a measure of how much kidney is left to work with.',
      textJa:
        '厚みは体積よりも速く減ります。大きな空洞を包む薄い殻でも、体積そのものは相応に残るためです。読み出しに両方を出しているのはそのためであり、どちらも「働ける腎がどれだけ残っているか」の指標ではありません。',
    },
    {
      text: 'The obstruction is drawn on the left side in every one-sided level, because the scene has to draw it somewhere. **Left is an arbitrary choice of this drawing** and carries no claim about which side anything happens on.',
      textJa:
        '片側性のすべての level で、閉塞は左側に描いています。どこかに描かねばならないためです。**左であることはこの図の任意の選択**であって、どちらの側に起こりやすいかについては何も述べていません。',
    },
    {
      text: 'The ureter is drawn as three named stretches of one tube so that "above the blockage" can be said at all. They are divisions of a drawing, not anatomical segments, and none of them has a length.',
      textJa:
        '尿管は、「閉塞より上流」と言えるようにするために、1 本の管を 3 つの名前のついた区間として描いています。これは図の上の区分であって解剖学的な分節ではなく、いずれも長さを持ちません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of urinary tract obstruction: that obstruction above the bladder affects the tract above it on that side alone, that obstruction at the bladder outlet affects both, and that the collecting system dilates above the level of the blockage.',
      textJa:
        '尿路閉塞についての標準的記載から、膀胱より上位の閉塞はその側の上流のみに及ぶこと、膀胱出口部の閉塞は両側に及ぶこと、そして腎盂尿管系は閉塞部より上流で拡張すること。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of the renal capsule as a layer that does not stretch readily, and of parenchymal thinning accompanying a dilated collecting system.',
      textJa:
        '腎被膜が容易には伸展しない層であること、および腎盂拡張に伴って実質が菲薄化することについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/urinary-obstruction.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'kidney-anatomy',
      label: 'The same kidney, named',
      labelJa: '同じ腎を、名前で',
      why: 'Cortex, medulla, pyramids, calyces and pelvis as structures you can point at, with the collecting system at rest.',
      whyJa: '皮質・髄質・錐体・腎杯・腎盂を、名前で指せる構造として示します。腎盂は安静時のままです。',
    },
    {
      slug: 'bladder-anatomy',
      label: 'The bladder this one drains into',
      labelJa: 'この尿路が注ぐ膀胱',
      why: 'The wall in its named stretches, and the trigone with the two ureteric orifices and the way out between them.',
      whyJa: '名前のついた区分に分けた壁と、2 つの尿管口およびその間の出口からなる膀胱三角を示します。',
    },
    {
      slug: 'benign-prostatic-enlargement',
      label: 'One thing that can sit at the way out',
      labelJa: '膀胱の出口に位置しうるものの一例',
      why: 'A separate model of the prostate’s inner zone and the channel through it. It is a cause a bladder outlet can have — not this model’s bladder outlet level with a name attached.',
      whyJa: '前立腺の内腺とそこを通る尿道についての、独立したモデルです。膀胱出口部の閉塞が持ちうる原因の一例であって、本モデルの bladder-outlet に名前を付けたものではありません。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-tract-above-it',
    target: 'every stretch above the blockage',
    channel: 'geometry',
    from: 'stretches[].ratio',
    reading: 'proportional',
    claim:
      'Each named stretch of the tract is drawn at the calibre the model gives it, so a stretch above the blockage is wider than the same stretch below one and the boundary between them is where the blockage is.',
    claimJa:
      '尿路の各区間は、モデルが与えた太さで描かれます。閉塞より上流の区間は下流の同じ区間より太く、その境界が閉塞部です。',
  },
  {
    id: 'the-parenchyma-as-a-space',
    target: 'the filtering tissue',
    channel: 'geometry',
    from: 'kidneys[side].parenchymaRatio',
    reading: 'illustrative',
    claim:
      'The parenchyma is drawn as the space between two surfaces — the capsule outside and the collecting system inside — and the inner surface is the outer one inset by exactly the thickness the model reports. So the gap a reader measures on any axis is the number the read-out prints.',
    claimJa:
      '腎実質は、外側の被膜と内側の腎盂という 2 つの面のあいだの空間として描かれます。内側の面は、外側の面をモデルの示す厚みのぶんだけ内側へ入れたものです。したがって、どの向きで測っても画面上の隙間は読み出しの数値そのものです。',
    notClaim:
      '**The thickness is against this model’s own resting thickness and is not a cortical thickness on any scan.** A real kidney thins unevenly and this one does not; the drawing has one thickness where a kidney has many.',
    notClaimJa:
      '**この厚みは本モデル自身の安静時に対する比であって、画像上の皮質厚ではありません。** 実際の腎は不均一に薄くなりますが、このモデルはそうしません。実際の腎に多数ある厚みが、ここでは 1 つです。',
  },
  {
    id: 'the-side-left-out',
    target: 'the kidney that is not behind the blockage',
    channel: 'colour',
    from: 'sparedSide',
    reading: 'thresholded',
    claim:
      'The side with nothing above it is drawn in a colour of its own and does not move, because "the other one is unchanged" is half of what the level decides and a reader will otherwise assume both sides are the same.',
    claimJa:
      '上流に閉塞を持たない側は独自の色で描かれ、動きません。「もう一方は変化しない」ことが level の決めることの半分であり、そう示さなければ読み手は左右が同じだと考えるためです。',
    notClaim:
      'Unchanged here means **this model changes nothing about it**. It is not a claim that the other kidney is unaffected in a person, and nothing in this model is doing anything on that side at all.',
    notClaimJa:
      'ここでの「変化しない」は、**本モデルがその側に何もしない**という意味です。実際の患者でもう一方の腎が影響を受けないという主張ではなく、このモデルはその側について何も計算していません。',
  },
  {
    id: 'the-blockage-itself',
    target: 'the place the blockage is',
    channel: 'position',
    from: 'blockedAt',
    reading: 'illustrative',
    claim:
      'A marker sits at the boundary between the last stretch that fills and the first that does not, so the subject of the scene has a position on screen.',
    claimJa:
      '満たされる最後の区間と、満たされない最初の区間との境界に印を置きます。このシーンの主題が画面上の位置を持つようにするためです。',
    notClaim:
      '**The marker has no size and is not a thing.** It is not a stone, a tumour or a stricture, and its position is a boundary between two drawn stretches rather than a level in anybody.',
    notClaimJa:
      '**この印に大きさはなく、実体でもありません。** 結石でも腫瘍でも狭窄でもなく、その位置は描かれた 2 区間の境界であって、誰かの体内の高さではありません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of urinary tract obstruction. It computes which stretches of a drawn tract lie above a blockage, how many kidneys do, and what a filled collecting system leaves of the parenchyma beside it. It contains no kidney function, no time, no cause and no treatment, it does not grade hydronephrosis, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '尿路閉塞についての教育用の幾何モデルです。描かれた尿路のどの区間が閉塞より上流にあるか、腎がいくつ上流にあるか、そして満たされた腎盂の隣に実質がどれだけ残るかを計算します。腎機能・時間・原因・治療のいずれも含まず、水腎症の grading も行わず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'A place, not a severity — a drawn thickness, not a cortical thickness.';
export const DISCLAIMER_SHORT_JA = '重症度ではなく場所｜描かれた厚みであって皮質厚ではありません。';
