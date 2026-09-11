/**
 * Copy and configuration for the lesion-site scene.
 *
 * The scene has one job: to separate "further out along a duct" from "nearer
 * the route the gland drains by", which the usual telling of this subject runs
 * together. Every line below is written so that neither reads as the other.
 */

export const PALETTE = {
  gland: '#f2e2ac',
  duct: '#7fb0c4',
  lobule: '#5d8fa8',
  marker: '#e05a7a',
  route: '#8fd0b8',
  nodes: '#c46a5a',
  idle: '#5d6a72',
  backdrop: '#6f6a66',
};

export const LEGEND = [
  { key: 'marker', label: 'The place in question', labelJa: '問題にしている場所' },
  { key: 'duct', label: 'The duct system it is on', labelJa: 'その場所がある乳管系' },
  { key: 'route', label: 'The route the gland drains by', labelJa: '乳腺が流れ込む経路' },
  { key: 'nodes', label: 'The node group that route reaches', labelJa: 'その経路の先のリンパ節群' },
];

/**
 * The axis is **how far out from the nipple the place sits**.
 *
 * Not time, not size and not a progression. Which course it runs along lives on
 * the model controls, because the five courses are five places rather than five
 * amounts of one.
 */
export const STAGES = [
  {
    id: 'at-the-nipple',
    name: 'Every duct system begins at one place',
    nameJa: 'どの乳管系も 1 つの場所から始まります',
    at: 0,
    focus: ['marker', 'route'],
    summary:
      'All of them converge on the nipple and run outwards from it — in different directions. Where a place is in the gland is a matter of which of them it is on, and how far out.',
    summaryJa:
      'いずれも乳頭に集まり、そこから外へ向かいます。ただし向かう方向はそれぞれ違います。乳腺内のある場所とは、どの乳管系の、どのあたりか、ということです。',
  },
  {
    id: 'out-along-it',
    name: 'Out along the one in question',
    nameJa: '選んだ乳管系に沿って外へ',
    at: 0.5,
    focus: ['marker', 'duct'],
    summary:
      'The large duct near the nipple gives way to its narrower far part. Which part of the system a place is in is settled by how far out it is.',
    summaryJa:
      '乳頭近くの太い乳管は、外側では細い末梢部へ移ります。ある場所が乳管系のどの部分にあたるかは、どれだけ外側かで決まります。',
  },
  {
    id: 'at-the-far-end',
    name: 'At the far end, where the lobules are',
    nameJa: '末端、小葉のあるところ',
    at: 1,
    focus: ['marker', 'route'],
    summary:
      'The lobules hang off the far ends of the ducts. Whether that far end is near the gland’s drainage route or well away from it depends entirely on which course it was.',
    summaryJa:
      '小葉は乳管の末端にぶら下がっています。その末端が乳腺の流出経路の近くか、むしろ遠いかは、どの乳管系だったかで決まります。',
  },
];

export const RANGE = { start: 'At the nipple', startJa: '乳頭のところ', end: 'At the far end', endJa: '末端' };
export const PROGRESS_LABEL = { label: 'How far out from the nipple the place sits', labelJa: '乳頭からどれだけ外側の場所か' };

export const ANNOTATIONS = [
  { id: 'marker', text: 'The place in question', sub: '問題にしている場所', anchor: 'marker', range: [0, 1], compact: false },
  { id: 'duct', text: 'The duct system it is on', sub: 'その乳管系', anchor: 'duct', range: [0, 1], compact: false },
  { id: 'route', text: 'Where this gland drains', sub: '乳腺の流出先', anchor: 'route', range: [0, 1], compact: false },
  { id: 'nipple', text: 'Where every duct ends', sub: 'すべての乳管の終点', anchor: 'nipple', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'part', label: 'Which part of the duct system', labelJa: '乳管系のどの部分か', unit: '', emphasis: true },
  { id: 'route', label: 'Distance to the drainage route', labelJa: '流出経路までの距離', unit: '×', emphasis: true },
  { id: 'nearer', label: 'Nearer the route than at the nipple?', labelJa: '乳頭にあったときより経路に近いか', unit: '' },
  { id: 'site', label: 'Which course', labelJa: 'どの経路か', unit: '' },
  { id: 'spread', label: 'What has spread where', labelJa: '何がどこへ広がったか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'site',
    kind: 'choice',
    label: 'Which course the place is on',
    labelJa: '場所がある経路',
    options: [
      { value: 'upper-outer', label: 'Upper outer duct system', labelJa: '外側上部の乳管系', effect: 'Runs towards the corner the gland drains from, so moving out brings the place nearer that route.', effectJa: '乳腺が流れ出る側へ向かうため、外側へ進むほどその経路に近づきます。' },
      { value: 'upper-inner', label: 'Upper inner duct system', labelJa: '内側上部の乳管系', effect: 'Runs towards the sternum. Moving out changes the distance to the route very little.', effectJa: '胸骨側へ向かいます。外側へ進んでも経路までの距離はほとんど変わりません。' },
      { value: 'lower-outer', label: 'Lower outer duct system', labelJa: '外側下部の乳管系', effect: 'Runs down and out, away from the corner the route leaves by.', effectJa: '経路が出ていく角とは別の、外下方へ向かいます。' },
      { value: 'lower-inner', label: 'Lower inner duct system', labelJa: '内側下部の乳管系', effect: 'Runs down and in. Moving out along it takes the place further from the route, not nearer.', effectJa: '内下方へ向かいます。外側へ進むほど経路からは遠ざかります。' },
      { value: 'axillary-tail', label: 'The axillary tail itself', labelJa: '腋窩尾部そのもの', effect: 'A different place, not a later one: the tail is gland tissue lying along the route rather than a course near it.', effectJa: '「後の段階」ではなく別の場所です。尾部は経路の近くを走る乳管ではなく、経路に沿って横たわる乳腺組織です。' },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Five places, not five stages',
  labelJa: '5 つの場所であって、5 段階ではありません',
  hint: 'Nothing here says one becomes another, and the tail is reached by choosing it rather than by going further along anything.',
  hintJa: 'ある場所が別の場所になるとは述べていません。尾部はどこかを進んだ先ではなく、選ぶことで到達します。',
};

export const MODEL_SCOPE = {
  question:
    'Where in a breast is a place, and how far is that place from the route the gland drains by?',
  questionJa:
    '乳腺内のある場所はどこにあり、そこは乳腺の流出経路からどれだけ離れているか。',
  answers: [
    {
      text: '**Further out is not nearer.** Every duct system begins at the nipple and runs outwards, but in different directions — so moving out along one course brings a place towards the gland’s drainage route while moving out along another takes it further away.',
      textJa:
        '**「外側へ進む」ことは「近づく」ことではありません。** どの乳管系も乳頭から外へ向かいますが、その方向は異なります。そのため、ある経路では外側へ進むほど流出経路に近づき、別の経路では遠ざかります。',
    },
    {
      text: 'Which part of a duct system a place is in — the large duct near the nipple, its narrower far part, or the end where the lobules hang off it — and that this is **a place on a drawn course**, not a diagnosis and not a classification of anything.',
      textJa:
        'ある場所が乳管系のどの部分にあたるか（乳頭近くの太い乳管、その外側の細い部分、小葉がぶら下がる末端）。そしてこれは**描かれた経路上の位置**であって、診断でも何らかの分類でもないこと。',
    },
    {
      text: 'That the axillary tail is **a different place, not a later one**: it is gland tissue lying along the drainage route, and no position on any duct’s axis ever reaches it.',
      textJa:
        '腋窩尾部が**「後の段階」ではなく別の場所**であること。尾部は流出経路に沿って横たわる乳腺組織であり、どの乳管の軸上のどの位置からも到達しません。',
    },
  ],
  excludes: [
    {
      text: '**All spread.** Nothing travels anywhere in this model. No cell moves, no lesion advances, no node is involved and no route carries anything — the route is drawn because the *gland* drains that way, and every distance here is between two drawn points.',
      textJa:
        '**あらゆる転移・波及。** 本モデルでは何も移動しません。細胞は動かず、病変は進行せず、リンパ節への波及もなく、経路は何も運びません。経路が描かれているのは**乳腺が**そちらへ流れるからであり、ここでの距離はすべて描かれた点と点のあいだの距離です。',
    },
    {
      text: '**All size.** The marker is a place. It has no diameter, no volume, no growth, no margin and no shape, and **nothing here is a measurement of a lesion**.',
      textJa:
        '**あらゆる大きさ。** マーカーは場所です。直径も体積も、増大も、断端も、形もありません。**ここには病変の計測値は一切ありません。**',
    },
    {
      text: '**Every stage and grade, and every prognosis.** Staging rests on size, on nodes and on what is elsewhere in a person; this model has none of the three. No probability of anything is computed, and nothing here is a risk.',
      textJa:
        '**あらゆる stage・grade・予後。** staging は大きさ・リンパ節・全身の状況に基づきますが、本モデルはそのいずれも持ちません。確率も算出せず、ここにあるものはリスクでもありません。',
    },
    {
      text: 'All the biology: no cell type, no receptor, no histology, no in-situ or invasive distinction and no cause. There is no imaging, no examination, no screening and no treatment of any kind.',
      textJa:
        '生物学のすべて。細胞型・受容体・組織像・非浸潤／浸潤の区別・原因のいずれもありません。画像診断・診察・検診・治療も一切ありません。',
    },
  ],
  cautions: [
    {
      text: '**The words are parts of a duct system, not diagnoses.** `large-duct`, `terminal-duct` and `lobular-end` name where on a drawn course a point is. They are not histological types and a reader must not take them for any.',
      textJa:
        '**用語は乳管系の部位名であって診断名ではありません。**「太い乳管」「末梢の乳管」「小葉のある末端」は、描かれた経路上の位置を指します。組織型ではなく、そう読んではいけません。',
    },
    {
      text: '**Nothing here is a measurement.** Every course, point and distance is sampled off this repository’s breast atlas, which declares itself not anatomically validated and its duct and lobule counts to be **display counts**. Distances are reported against the distance the nipple itself is from the route, so they compare positions inside one picture.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 経路・点・距離はすべて、このリポジトリの乳房アトラスから取り出したものです。そのアトラスは自身を解剖学的に検証済みでないと宣言し、乳管数・小葉数を**表示用の数**としています。距離は「乳頭自身から経路までの距離」に対する比で示し、1 つの画面内で位置を比べるためのものです。',
    },
    {
      text: 'The gland has **one drainage route in this picture** — the one the atlas draws. A breast has more than one, and the absence of the others here is a property of the drawing rather than a claim that they do not exist.',
      textJa:
        'この絵で乳腺が持つ**流出経路は 1 本**です。アトラスが描いているものだけです。実際の乳房には複数あり、ここに他が無いのは図の都合であって、存在しないという主張ではありません。',
    },
    {
      text: 'Four of the atlas’s eight duct systems are offered, and the quadrant names say **where each of them happens to point** rather than dividing the breast into quadrants. Nothing about which course is offered, or which is the baseline, says anything about where anything occurs in people.',
      textJa:
        'アトラスが描く 8 本の乳管系のうち 4 本を選べます。四分円の名称は、**その乳管系がたまたま向いている方向**を示すもので、乳房を 4 分割したものではありません。どの経路を用意したか、どれを既定にしたかは、実際の発生部位について何も述べていません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of the breast as duct systems converging on the nipple, with lobules at their peripheral ends, and of the axillary tail as gland tissue extending towards the axilla.',
      textJa:
        '乳房が乳頭に収束する乳管系からなり、その末梢端に小葉があること、および腋窩尾部が腋窩へ伸びる乳腺組織であることについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of the axilla as the node group most of the breast drains to, taken here **only** as the reason a route is drawn towards it.',
      textJa:
        '乳房の大部分が腋窩リンパ節群へ流れることについての標準的記載。ここでは**そちらへ経路を描く理由としてのみ**用いています。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/breast-lesion.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'breast-anatomy',
      label: 'The same gland, named',
      labelJa: '同じ乳腺を、名前で',
      why: 'The ducts, the lobules, the ligaments that hold it up and the tail running towards the armpit, as structures you can point at, with nothing marked anywhere.',
      whyJa: '乳管・小葉・それを支える靱帯・腋窩へ伸びる尾部を、名前で指せる構造として示します。どこにも印はついていません。',
    },
    {
      slug: 'lymphatic-drainage',
      label: 'Where lymph goes, at body scale',
      labelJa: '全身のスケールで見るリンパの流れ',
      why: 'The routes and node groups of the whole body, and the asymmetry between the two ducts that empty into the veins.',
      whyJa: '全身の経路とリンパ節群、および静脈角へ注ぐ 2 本の導管の左右差を示します。',
    },
    {
      slug: 'lymph-node-anatomy',
      label: 'What a node is, inside',
      labelJa: 'リンパ節の内部',
      why: 'Many vessels in and one out, which is why lymph passes through a node rather than round it.',
      whyJa: '多数の輸入管と 1 本の輸出管。リンパがリンパ節を迂回せず通過する理由です。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-marker-is-a-place-and-has-one-size',
    target: 'where the place is',
    channel: 'geometry',
    from: 'at',
    reading: 'illustrative',
    claim:
      'A small body is drawn at the point the model computed, on the course the control named. It is drawn at **one size that never changes**, at every position and on every course.',
    claimJa:
      'モデルが計算した点に、コントロールで選んだ経路上で、小さな球を描きます。どの位置でも、どの経路でも、**大きさは常に同じ**です。',
    notClaim:
      '**The size is fixed because the model has no size in it.** A marker that grew along the axis would be a diameter, and this model does not have one. Nothing about how big it is drawn is a measurement of anything.',
    notClaimJa:
      '**大きさが固定なのは、モデルに大きさが無いからです。** 軸に沿って大きくなるマーカーは直径を意味しますが、本モデルは直径を持ちません。描かれた大きさは何の計測値でもありません。',
  },
  {
    id: 'the-route-never-changes',
    target: 'the drainage route and the node group',
    channel: 'geometry',
    from: 'ROUTE',
    reading: 'illustrative',
    claim:
      'The route and the node group beyond it are drawn identically at every position on the axis and for every course, because they belong to the gland rather than to the place in question.',
    claimJa:
      '経路とその先のリンパ節群は、軸上のどの位置でも、どの経路を選んでも同じに描かれます。それらは「問題にしている場所」ではなく乳腺に属するものだからです。',
    notClaim:
      '**Nothing about the route responds to the marker.** It does not light up, thicken, change colour or fill, because nothing in this model travels along it. A route that reacted would be saying something has spread.',
    notClaimJa:
      '**経路はマーカーに反応しません。** 光ることも、太くなることも、色が変わることも、満たされることもありません。本モデルではそこを何も移動しないからです。反応する経路は「広がった」と述べてしまいます。',
  },
  {
    id: 'the-distance-is-drawn-as-beads-between-two-points',
    target: 'how far the place is from the route',
    channel: 'geometry',
    from: 'toRoute',
    reading: 'illustrative',
    claim:
      'A row of beads runs from the marker to the nearest point on the route, so a reader can see the distance shorten on one course and lengthen on another rather than having to hold two numbers in mind.',
    claimJa:
      'マーカーから経路上の最近点まで、点の列を並べます。ある経路では距離が縮み、別の経路では伸びることを、2 つの数値を覚えずに見て取れるようにするためです。',
    notClaim:
      '**Beads rather than a cord, deliberately.** A solid line joining a place to a drainage route reads as a conduit, which is the very thing this model says is not there. A dotted measure has no direction, no arrow and carries nothing.',
    notClaimJa:
      '**あえて線ではなく点の列です。** ある場所と流出経路を結ぶ実線は「管」に読めますが、それこそ本モデルが「無い」と述べているものです。点で示した距離には向きも矢印もなく、何も運びません。',
  },
  {
    id: 'nothing-stands-for-a-stage-or-a-node',
    target: 'the whole picture',
    channel: 'colour',
    from: 'stage',
    reading: 'illustrative',
    claim:
      'Nothing anywhere in this scene changes to stand for a stage, a nodal status or a spread, because the model has no such output.',
    claimJa:
      'このシーンには、stage・リンパ節の状態・波及を表すために変化する要素は一切ありません。モデルにその出力がないためです。',
    notClaim:
      'The read-out prints "nothing spreads in this model" where such a row would go, rather than leaving the row out — an absent row reads as an oversight, and this absence is the claim.',
    notClaimJa:
      'その種の行が入る位置には、行を省くのではなく「このモデルでは何も広がりません」と表示します。欄が無いことは見落としに読めますが、この不在自体が主張だからです。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of where a place sits in a drawn breast. It computes a position along one of the atlas’s own duct systems or along its axillary tail, which part of that system the position is in, and how far that point is from the drainage route the atlas draws. It contains no size, no spread, no nodal status, no stage and no biology, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '描かれた乳房内の「場所」についての教育用の幾何モデルです。アトラス自身の乳管系または腋窩尾部に沿った位置、その位置が乳管系のどの部分にあたるか、そしてその点がアトラスの描く流出経路からどれだけ離れているかを計算します。大きさ・波及・リンパ節の状態・stage・生物学のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'A place and a distance — never a size, and never a spread.';
export const DISCLAIMER_SHORT_JA = '場所と距離であって、大きさでも波及でもありません。';
