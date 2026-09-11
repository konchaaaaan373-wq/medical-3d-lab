/**
 * Everything the rotator cuff tear scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from
 * [`src/models/rotatorCuffTear.js`](../models/rotatorCuffTear.js) at the moment
 * they see it.
 */

export const PALETTE = {
  bone: '#e6e0cd',
  tendon: '#d9705e',
  torn: '#a8443c',
  couple: '#5fb8a8',
  arch: '#ded4c2',
  head: '#ece7d8',
};

export const LEGEND = [
  { key: 'tendon', label: 'The tendon over the top', labelJa: '上を通る腱' },
  { key: 'torn', label: 'The hole in the sleeve', labelJa: '袖にあいた穴', activeFrom: 0.1 },
  { key: 'couple', label: 'The pair that keeps the head centred', labelJa: '骨頭を中央に保つ 2 本' },
  { key: 'arch', label: 'The space under the arch — a drawn gap', labelJa: 'アーチ下の隙間｜描かれた隙間' },
];

/** The axis is **how far the tear extends across the tendon**. */
export const STAGES = [
  {
    id: 'intact',
    name: 'A sleeve, not a strap',
    nameJa: 'ひもではなく、袖',
    at: 0,
    focus: ['tendon', 'couple'],
    summary:
      'Four tendons wrap the head of the arm bone. They do not lift the arm — they hold the head on its socket while something else does.',
    summaryJa:
      '4 本の腱が上腕骨の骨頭を包んでいます。腕を持ち上げるのはこれらではありません。別のものが持ち上げるあいだ、骨頭を臼蓋に保つのが役目です。',
  },
  {
    id: 'partial',
    name: 'A hole in the top of it',
    nameJa: '袖の上部にあいた穴',
    at: 0.5,
    focus: ['tendon'],
    summary:
      'The tendon over the top is parting. It is a defect in a sheet rather than a cord snapping, and the rest of the sleeve is still there.',
    summaryJa:
      '上を通る腱が裂けていきます。索が切れるのではなく、シートに欠損ができることであり、袖の残りはまだそこにあります。',
  },
  {
    id: 'full',
    name: 'Gone across, and the head has not moved',
    nameJa: '全幅に及んでも、骨頭は動かない',
    at: 1,
    focus: ['tendon', 'head'],
    summary:
      'The whole width of it has gone, and the head is still centred — because the two tendons facing each other across the sleeve are still pulling against one another.',
    summaryJa:
      '全幅が失われても骨頭は中央のままです。袖を挟んで向かい合う 2 本の腱が、まだ互いに引き合っているからです。',
  },
];

export const RANGE = { start: 'Intact', startJa: '正常', end: 'Across its width', endJa: '全幅' };
export const PROGRESS_LABEL = {
  label: 'How far the tear extends across the tendon',
  labelJa: '断裂が腱の幅のどこまで及んでいるか',
};

export const ANNOTATIONS = [
  { id: 'tendon', text: 'The tendon over the top', sub: '棘上筋腱', anchor: 'tendon', range: [0, 1], compact: false },
  { id: 'couple', text: 'The pair across the sleeve', sub: '前後で向かい合う 2 本', anchor: 'couple', range: [0, 1], compact: false },
  { id: 'head', text: 'The head of the arm bone', sub: '上腕骨頭', anchor: 'head', range: [0, 1], compact: false },
  { id: 'arch', text: 'The arch above it', sub: '烏口肩峰アーチ', anchor: 'arch', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'defect', label: 'How much of the tendon’s width has gone', labelJa: '腱の幅のうち失われた割合', unit: '%', emphasis: true },
  { id: 'centred', label: 'Where the head is sitting', labelJa: '骨頭の位置', unit: '', emphasis: true },
  { id: 'containment', label: 'What is left holding the head on its socket', labelJa: '骨頭を臼蓋に保つ力の残り', unit: '%' },
  { id: 'couple', label: 'Of that, the part the facing pair provides', labelJa: 'そのうち、向かい合う 2 本が担う分', unit: '%' },
  { id: 'rise', label: 'How far the head has risen, as a share of this drawing’s gap under the arch', labelJa: '骨頭が上がった量（この絵のアーチ下の隙間に対する割合）', unit: '%' },
];

export const MODEL_CONTROLS = [
  {
    id: 'couple',
    label: 'How much of the facing pair is still there',
    labelJa: '向かい合う 2 本がどれだけ残っているか',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v > 0.7 ? 'intact' : v > 0.3 ? 'partly' : 'gone too'),
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'What the tear reaches',
  labelJa: '断裂がどこまで及ぶか',
  hint: 'The tendon in front and the one behind pull against each other. The size of the hole is not what decides it; whether they still face each other is.',
  hintJa: '前の腱と後ろの腱は互いに引き合っています。決めるのは穴の大きさではなく、その 2 本がまだ向かい合っているかどうかです。',
};

export const MODEL_SCOPE = {
  question:
    'When the tendon over the top of the shoulder tears, what decides whether the head of the arm bone stays where it was?',
  questionJa:
    '肩の上を通る腱が断裂したとき、上腕骨頭が元の位置に留まるかどうかを決めているのは何か。',
  answers: [
    {
      text: 'That the cuff does not lift the arm. It holds the head on its socket while the large muscle over the shoulder lifts it.',
      textJa:
        '腱板は腕を持ち上げるものではないこと。肩の大きな筋が持ち上げるあいだ、骨頭を臼蓋に保つのが役目です。',
    },
    {
      text: 'That the tendon in front and the tendon behind pull against one another across the sleeve, and that pairing is what keeps the head centred.',
      textJa:
        '前の腱と後ろの腱が袖を挟んで互いに引き合っており、その対が骨頭を中央に保っていること。',
    },
    {
      text: 'That the whole width of the top tendon can be gone with the head still centred, so long as that pair is intact — and that the head rises when the tear reaches one of them.',
      textJa:
        'その対が保たれていれば、上の腱が全幅失われても骨頭は中央のままでありうること。そして断裂がその対に及んだとき、骨頭は上がること。',
    },
    {
      text: 'That "how big is the tear" is therefore the wrong first question, and "what is left of the pair" is the right one.',
      textJa:
        'したがって「断裂はどれだけ大きいか」は最初に問うべきことではなく、「対がどれだけ残っているか」こそがそれであること。',
    },
  ],
  excludes: [
    {
      text: '**Everything a person experiences.** No pain, no weakness, no arc of movement, no range and nothing anybody can or cannot do. **Nothing in this model moves an arm.**',
      textJa:
        '**人が経験するもののすべて。** 痛み・筋力低下・可動域・痛みの弧、そしてできること・できないこと。**このモデルに腕を動かすものはありません。**',
    },
    {
      text: 'Impingement as a syndrome, the bursa, tendinopathy, calcium, retraction, muscle quality and cuff tear arthropathy.',
      textJa: '症候群としてのインピンジメント・滑液包・腱症・石灰沈着・退縮・筋の質、そして腱板断裂性関節症。',
    },
    {
      text: 'Cause, time, healing and every treatment — including whether anything should be done at all.',
      textJa: '原因・時間経過・治癒、そしてあらゆる治療。何かを行うべきかどうかも含みます。',
    },
    {
      text: 'The other three tendons as separate structures. What the model has is the tendon over the top and one number for the pair facing each other across the sleeve.',
      textJa:
        '他の 3 本の腱を個別の構造としては扱いません。モデルにあるのは上を通る腱と、袖を挟んで向かい合う対を表す 1 つの数値だけです。',
    },
  ],
  cautions: [
    {
      text: '**The gap under the arch is a drawn gap, and the rise is a share of it.** The shoulder atlas says so itself: in life the space is a few millimetres against a head of several centimetres, and drawn to scale the tendon under the arch would be a line nobody could see. **A share of that gap is not an acromiohumeral distance and is not millimetres.**',
      textJa:
        '**アーチ下の隙間は「描かれた隙間」であり、上昇量はそれに対する割合です。** 肩のアトラス自身がそう記しています。実際の空間は数 cm の骨頭に対して数 mm であり、実寸比で描けばアーチ下の腱は誰にも見えない線になります。**その割合は肩峰骨頭間距離でも mm でもありません。**',
    },
    {
      text: 'The facing pair is one number, not two tendons. Which of them is involved, and how far round, is not something this model represents.',
      textJa:
        '向かい合う対は 2 本の腱ではなく 1 つの数値です。どちらがどこまで巻き込まれているかは、このモデルでは表現していません。',
    },
    {
      text: 'The shoulder is drawn with the arm at the side and nothing in this scene moves. Where the head sits is where the model says it can sit, which is not the same as a shoulder doing it.',
      textJa:
        '肩は腕を体側につけた肢位で描かれ、このシーンで動くものはありません。骨頭の位置はモデルが「そこに来る」とした位置であり、実際の肩がそうすることとは別です。',
    },
    {
      text: 'The tendons that are not redrawn by this scene stay where the atlas put them while the head moves. They are context and are **not re-solved**.',
      textJa:
        'このシーンが描き直していない腱は、骨頭が動いてもアトラスの位置のままです。それらは文脈であって、**解き直していません。**',
    },
  ],
  sources: [
    {
      text: 'Standard shoulder anatomy for the four cuff tendons and their attachments, and standard descriptions of the cuff as a head depressor and stabiliser rather than an elevator.',
      textJa:
        '標準的な肩関節解剖から 4 本の腱板腱とその停止部を、また腱板が挙上筋ではなく骨頭の下制・安定化に働くという標準的記載を用いています。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of the transverse force couple — subscapularis in front against infraspinatus and teres minor behind — and of a tear that spares it leaving the head centred.',
      textJa:
        '横断面の force couple（前方の肩甲下筋と、後方の棘下筋・小円筋）と、それが保たれた断裂では骨頭が中央に留まるという標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/rotator-cuff-tear.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'shoulder-anatomy',
      label: 'The same shoulder, named',
      labelJa: '同じ肩を、名前で',
      why: 'The four cuff tendons, the arch above them and the socket below, as structures you can point at — with nothing torn.',
      whyJa: '4 本の腱板腱、その上のアーチ、下の臼蓋を、名前で指せる構造として示します。断裂はありません。',
    },
    {
      slug: 'acl-injury',
      label: 'The other ligament that was holding something',
      labelJa: '何かを支えていたもう 1 つの構造',
      why: 'A knee, and the same question: with the first restraint gone, what is carrying it and how much of it is there.',
      whyJa: '膝における同じ問いです。最初の制動が失われたとき、何がそれを担い、どれだけ残っているのか。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'defect',
    target: 'the tendon over the top',
    channel: 'geometry',
    from: 'defectFraction',
    reading: 'illustrative',
    claim:
      'The tendon is redrawn as two pieces with a gap between them, widening by the fraction of its width the model says is gone. **The scene draws its own tendon rather than moving the atlas’s intact one.**',
    claimJa:
      '腱は 2 つの部分として描き直され、モデルが「失われた」とする幅の割合だけ、そのあいだが広がります。**シーンはアトラスの正常な腱を動かすのではなく、自前の腱を描いています。**',
    notClaim:
      'Where a cuff tear starts, which way it runs and what the torn edge does are not in this model. The gap is drawn, not solved, and its width is a share of a drawn tendon rather than a size.',
    notClaimJa:
      '腱板断裂がどこから始まり、どちらへ広がり、断端がどうなるかはこのモデルにありません。間隔は解いたものではなく描いたもので、その幅も「描かれた腱に対する割合」であって大きさではありません。',
  },
  {
    id: 'head-rise',
    target: 'the head of the arm bone',
    channel: 'position',
    from: 'riseFraction',
    reading: 'illustrative',
    claim:
      'The head is moved up towards the arch by the fraction of the drawn gap the model reports, and it is moved only when the model says the pair has stopped holding it.',
    claimJa:
      '骨頭は、モデルが示す「描かれた隙間に対する割合」だけアーチへ向かって上がります。動くのは、モデルが「対がもう支えていない」と判定したときだけです。',
    notClaim:
      '**The gap it is a fraction of is a display gap the shoulder atlas opened up so the tendon could be seen, and a share of it is not an acromiohumeral distance and not millimetres.** The tendons this scene does not redraw stay where the atlas put them.',
    notClaimJa:
      '**基準となる隙間は、腱が見えるように肩のアトラスが広げた表示用の隙間です。その割合は肩峰骨頭間距離でも mm でもありません。** このシーンが描き直していない腱は、アトラスの位置のままです。',
  },
  {
    id: 'the-space-itself',
    target: 'the space under the arch',
    channel: 'geometry',
    from: 'riseFraction',
    reading: 'illustrative',
    claim:
      'The gap between the top of the head and the underside of the arch is drawn as a band, and the band thins by exactly what the head has risen.',
    claimJa:
      '骨頭の上端とアーチの下面のあいだの隙間を帯として描き、骨頭が上がった分だけその帯が薄くなります。',
    notClaim:
      '**The gap it is showing is the atlas’s display gap**, opened up until the tendon under the arch could be seen. The band is drawn so a change of a few pixels can be read; **its height is not a distance in anybody.**',
    notClaimJa:
      '**示している隙間はアトラスの表示用の隙間**で、アーチ下の腱が見えるように広げられたものです。帯は数ピクセルの変化を読み取れるように描いており、**その高さは誰かの体での距離ではありません。**',
  },
  {
    id: 'the-pair',
    target: 'the tendons in front and behind',
    channel: 'emissive',
    from: 'coupleHolds',
    reading: 'thresholded',
    claim: 'They are lit while the model says they are still holding the head centred, and not once it says they are not.',
    claimJa: 'モデルが「まだ骨頭を中央に保っている」としているあいだ点灯し、そうでなくなると消えます。',
    notClaim:
      'It marks which side of a threshold the model is on. **It is not a statement about any particular tendon**, and the model has one number for both of them rather than two structures.',
    notClaimJa:
      '示しているのは、モデルが閾値のどちら側にいるかだけです。**特定の腱についての主張ではなく、**モデルは 2 つの構造ではなく両者を表す 1 つの数値を持っています。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of a supraspinatus tear. It computes what is left holding the head of the humerus on its socket and whether that is enough to keep it centred, on an atlas whose subacromial gap is a display value. It contains no pain, no weakness, no movement, no time and no treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '棘上筋腱断裂についての教育用の幾何モデルです。肩峰下の隙間が表示用の値であるアトラス上で、骨頭を臼蓋に保つ力がどれだけ残り、それで中央に留まるかを計算します。痛み・筋力低下・運動・時間・治療のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'What still holds the head down — a drawn gap, no movement, not diagnosis.';
export const DISCLAIMER_SHORT_JA = '何が骨頭を保っているか｜隙間は描画上の値です。診断には使用できません。';
