/**
 * Copy and configuration for the retinal detachment scene.
 *
 * The scene exists to break one habit: reading a detachment's size as its
 * answer. So the read-out puts the area and the macula state side by side, and
 * the walk shows a small separation that includes the macula next to a large
 * one that does not.
 */

export const PALETTE = {
  sclera: '#f0e6d8',
  choroid: '#8d4a52',
  retina: '#e8b9a0',
  separated: '#ff7a4d',
  macula: '#ffd166',
  maculaOff: '#ff2e6b',
  vitreous: '#bcd8e0',
};

export const LEGEND = [
  { key: 'retina', label: 'The retina, lying against the layer behind it', labelJa: '後ろの層に接している網膜' },
  { key: 'separated', label: 'Where it has come away', labelJa: '剥がれている部分', activeFrom: 0.08 },
  { key: 'macula', label: 'The macula, at the back on the axis', labelJa: '黄斑（眼軸上、後極）' },
  { key: 'maculaOff', label: 'The macula, inside the separation', labelJa: '剥離範囲に入った黄斑', activeFrom: 0.2 },
];

/**
 * The axis is **how far the separation reaches from where it started**.
 *
 * Not time and not severity. Where it started lives on the model controls,
 * because four positions are four arrangements: a detachment does not travel
 * from one origin to another.
 */
export const STAGES = [
  {
    id: 'attached',
    name: 'One surface against another',
    nameJa: '面と面が接している',
    at: 0,
    focus: ['retina', 'macula'],
    summary:
      'The retina lies against the layer behind it, all the way round. The macula is one small place on it, at the back, on the axis of the eye.',
    summaryJa:
      '網膜は全周にわたって後ろの層に接しています。黄斑はその上の 1 か所、眼軸上の後極にある小さな部分です。',
  },
  {
    id: 'lifting',
    name: 'A patch has come away',
    nameJa: '一部が剥がれる',
    at: 0.45,
    focus: ['separated'],
    summary:
      'One region of retina is no longer against what it was against. How much there is of it, and where it is, are two different things.',
    summaryJa:
      '網膜の一部が、接していたものから離れました。その「広さ」と「位置」は、別々のことがらです。',
  },
  {
    id: 'reaching',
    name: 'Whether the macula is in it',
    nameJa: '黄斑がその中にあるかどうか',
    // Not at the very top of the axis: the comparison the scene exists for
    // needs a large separation that has *not* reached the macula, and past
    // this point every peripheral start has.
    at: 0.8,
    focus: ['separated', 'macula'],
    summary:
      'The only question anyone asks is answered by position. A small separation at the back includes it; a large one at the edge may not.',
    summaryJa:
      '誰もが尋ねる問いの答えを決めるのは、位置です。後極の小さな剥離は黄斑を含み、周辺の大きな剥離は含まないことがあります。',
  },
];

export const RANGE = { start: 'Attached', startJa: '接している', end: 'Far-reaching', endJa: '広範囲' };
export const PROGRESS_LABEL = {
  label: 'How far the separation reaches from where it started',
  labelJa: '起点からどこまで剥離が広がっているか',
};

export const ANNOTATIONS = [
  { id: 'retina', text: 'The retina', sub: '網膜', anchor: 'retina', range: [0, 1], compact: false },
  { id: 'macula', text: 'The macula', sub: '黄斑', anchor: 'macula', range: [0, 1], compact: false },
  { id: 'separated', text: 'Where it has come away', sub: '剥離している部分', anchor: 'separated', range: [0.06, 1], compact: false },
  { id: 'origin', text: 'Where it started', sub: '剥離の起点', anchor: 'origin', range: [0.06, 1], compact: false },
  { id: 'lens', text: 'The lens, in front', sub: '前方の水晶体', anchor: 'lens', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'macula', label: 'Is the macula inside the separation', labelJa: '黄斑は剥離範囲に入っているか', unit: '', emphasis: true },
  { id: 'area', label: 'How much of the retina has come away', labelJa: '網膜のうち剥がれている割合', unit: '%', emphasis: true },
  { id: 'reach', label: 'How far it reaches from where it started', labelJa: '起点からの広がり', unit: '°' },
  { id: 'short', label: 'How much further it would have to reach', labelJa: '黄斑まであとどれだけ広がる必要があるか', unit: '°' },
  { id: 'vision', label: 'What anybody can see', labelJa: '本人に何が見えるか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'origin',
    kind: 'choice',
    label: 'Where the separation started',
    labelJa: '剥離が始まった場所',
    options: [
      { value: 'none', label: 'Nowhere', labelJa: 'なし', effect: 'The retina is against the layer behind it all the way round.', effectJa: '網膜は全周で後ろの層に接しています。' },
      { value: 'superior', label: 'Above, at the edge', labelJa: '上方の周辺部', effect: 'About eighty degrees from the macula, so it has a long way to go before the macula is in it.', effectJa: '黄斑まで約 80 度あり、黄斑が含まれるまでには大きく広がる必要があります。' },
      { value: 'temporal', label: 'To the side, at the edge', labelJa: '耳側の周辺部', effect: 'The nearest of the peripheral starts, and still far from it.', effectJa: '周辺部の起点では黄斑に最も近いものですが、それでも離れています。' },
      { value: 'inferior', label: 'Below, at the edge', labelJa: '下方の周辺部', effect: 'The same distance as above. This model has no gravity in it, so below behaves like above.', effectJa: '上方と同じ距離です。本モデルに重力はないため、下方も上方と同じように振る舞います。' },
      { value: 'posterior', label: 'At the back, near the macula', labelJa: '後極（黄斑の近く）', effect: 'A dozen degrees away, so the macula is inside it almost at once — at any size.', effectJa: '黄斑まで十数度しかないため、ほぼ即座に黄斑が含まれます。広さにかかわらず起こります。' },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Five starts, and how far each is from the macula',
  labelJa: '5 つの起点と、黄斑までの距離',
  hint: 'Five positions, not five degrees. Where it started decides what it reaches; the slider decides how far.',
  hintJa: '5 通りの位置であって 5 段階ではありません。起点が「何に届くか」を、スライダーが「どこまで広がるか」を決めます。',
};

export const MODEL_SCOPE = {
  question:
    'When the retina separates, what decides whether the macula is in it?',
  questionJa:
    '網膜が剥離したとき、黄斑がその中に入るかどうかを決めるのは何か。',
  answers: [
    {
      text: '**Position, and not size.** The macula is one small place at the back of the eye on its axis, and the periphery is some eighty degrees away from it — so a separation that started at the back includes it almost at once, and one that started at the edge has a long way to go.',
      textJa:
        '**広さではなく位置。** 黄斑は眼軸上の後極にある 1 か所であり、周辺部はそこから約 80 度離れています。後極から始まった剥離はほぼ即座に黄斑を含み、周辺から始まった剥離は黄斑に届くまで大きく広がる必要があります。',
    },
    {
      text: 'That the two facts are independent, which is what the read-out shows by printing them side by side: **a separation covering a twentieth of the retina can have the macula in it, and one covering nearly half can not.**',
      textJa:
        'この 2 つは独立しており、読み出しはそれを並べて示します。**網膜の 1/20 の剥離でも黄斑を含むことがあり、半分近い剥離でも含まないことがあります。**',
    },
    {
      text: 'That macula-on and macula-off are **two pictures rather than two stages**. Nothing here says one becomes the other.',
      textJa:
        'macula-on と macula-off は **2 段階ではなく 2 つの像**であること。一方が他方になるとは述べていません。',
    },
  ],
  excludes: [
    {
      text: '**All vision.** No acuity, no field, no contrast, no distortion and no perception of any kind. A retina separated here is a surface that has moved, and **nothing in this model says what anybody can see.**',
      textJa:
        '**視覚のすべて。** 視力・視野・コントラスト・歪視、およびあらゆる知覚がありません。ここで剥離した網膜は「動いた面」であり、**本モデルは本人に何が見えるかについて何も述べていません。**',
    },
    {
      text: '**All prognosis.** Nothing here says what recovers, how much, or whether the macula being in it changes that. That is the most common thing said about this subject and the thing this model most firmly does not compute.',
      textJa:
        '**予後のすべて。** 何がどれだけ回復するか、黄斑が含まれることでそれが変わるかについて、ここでは何も述べていません。この主題で最もよく語られる事柄であり、本モデルが最も明確に計算しないものです。',
    },
    {
      text: 'The cause and the kind: no tear, no traction, no exudate, no myopia, no trauma, and no distinction between the mechanisms a detachment can have.',
      textJa:
        '原因と病型（裂孔・牽引・滲出、近視、外傷のいずれもなく、剥離の機序の区別もありません）。',
    },
    {
      text: 'Time, fluid, gravity and surgery. The axis is how far the separation reaches, not how long it has been reaching, and **below behaves exactly like above here**.',
      textJa:
        '時間・液体・重力・手術。軸は「どこまで広がったか」であって経過時間ではなく、**ここでは下方も上方と全く同じように振る舞います。**',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The globe, its coats and the macula’s position are this repository’s own eye atlas’s. The area is a spherical cap as a share of a sphere, and the degrees are degrees of that drawing.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 眼球・各層・黄斑の位置は、このリポジトリ自身の眼のアトラスのものです。面積は球帽の球全体に対する割合であり、角度はその図の中の角度です。',
    },
    {
      text: '**The height the retina is drawn lifted is illustrative and much larger than the atlas’s own gap between the coats.** Drawn at the real spacing a separation is a few pixels and invisible. The height says *separated*; it does not say *how high*.',
      textJa:
        '**網膜が持ち上がって描かれる高さは説明用であり、アトラス自身の層間の隙間よりずっと大きく描いています。** 実際の間隔で描くと剥離は数ピクセルとなり見えません。この高さは「剥がれている」ことを示すもので、「どれだけ高いか」を示すものではありません。',
    },
    {
      text: 'The separation is drawn as a circular patch spreading evenly from one point. A real detachment is not circular and does not spread evenly, and **this model has no gravity**, so the inferior start behaves exactly like the superior one.',
      textJa:
        '剥離は 1 点から均等に広がる円形の領域として描いています。実際の剥離は円形でも均等でもなく、**本モデルには重力がない**ため、下方起点は上方起点と全く同じ挙動になります。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of retinal detachment as separation of the neurosensory retina from the retinal pigment epithelium, and of the macula as a discrete region at the posterior pole.',
      textJa:
        '網膜剥離が神経網膜と網膜色素上皮の分離であること、および黄斑が後極にある限局した領域であることについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'The standard clinical distinction between macula-on and macula-off detachment, taken here **only** as a statement about whether the macula lies inside the separated area.',
      textJa:
        'macula-on / macula-off という標準的な臨床上の区別。ここでは**「黄斑が剥離範囲の内側にあるか」という記述としてのみ**用いています。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/retinal-detachment.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'eye-anatomy',
      label: 'The same eye, named',
      labelJa: '同じ眼を、名前で',
      why: 'The coats, the retina, the macula and the optic disc as structures you can point at, with the retina against what it should be against.',
      whyJa: '各層・網膜・黄斑・視神経乳頭を、名前で指せる構造として示します。網膜は本来接しているものに接した状態です。',
    },
    {
      slug: 'cataract',
      label: 'The other thing in the way of light',
      labelJa: '光の通り道にあるもう 1 つのもの',
      why: 'A separate model, at the front of the same eye. Both are about the path light takes and neither computes what anybody sees.',
      whyJa: '同じ眼の前方についての、独立したモデルです。どちらも光の通り道を扱い、どちらも「何が見えるか」を計算しません。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-cap-is-the-extent',
    target: 'the separated retina',
    channel: 'geometry',
    from: 'halfAngle',
    reading: 'proportional',
    claim:
      'The separated region is drawn as the spherical cap the model solved — the same half-angle, centred on the same named origin — so the patch on screen is the model’s answer rather than a picture of it.',
    claimJa:
      '剥離部分は、モデルが解いた球帽としてそのまま描かれます。同じ半頂角で、同じ名前の起点を中心とします。画面上の領域はモデルの答えそのものであって、その図解ではありません。',
  },
  {
    id: 'the-lift-says-separated-not-how-high',
    target: 'how far the retina is drawn off the layer behind it',
    channel: 'geometry',
    from: 'lift',
    reading: 'illustrative',
    claim:
      'The detached patch is drawn standing off the layer behind it, so that "separated" is a shape a reader can see rather than a colour they have to be told about.',
    claimJa:
      '剥離部分は後ろの層から浮き上がって描かれ、「剥がれている」ことが説明を要する色ではなく、見て分かる形になるようにしています。',
    notClaim:
      '**The height is illustrative and much larger than the atlas’s own spacing between the coats.** At the real spacing a separation is a few pixels. It says *separated*; it does not say *how high*, and it is not a measurement.',
    notClaimJa:
      '**この高さは説明用であり、アトラス自身の層間の間隔よりずっと大きく描いています。** 実際の間隔では剥離は数ピクセルです。「剥がれている」ことを示すもので、「高さ」を示すものでも、測定値でもありません。',
  },
  {
    id: 'the-macula-has-two-colours',
    target: 'the macula',
    channel: 'colour',
    from: 'macula',
    reading: 'thresholded',
    claim:
      'The macula is drawn in one colour while it is outside the separation and another once it is inside, because that is a state with two values rather than a quantity.',
    claimJa:
      '黄斑は、剥離範囲の外にあるあいだは 1 つの色で、内側に入ると別の色で描かれます。これは量ではなく 2 値の状態だからです。',
    notClaim:
      '**Neither colour is a prognosis, an acuity or a severity.** It says where the macula is with respect to an edge, and that is all it says.',
    notClaimJa:
      '**どちらの色も予後でも視力でも重症度でもありません。** 黄斑が境界に対してどちら側にあるかを示すだけです。',
  },
  {
    id: 'area-and-macula-are-printed-together',
    target: 'the read-out',
    channel: 'colour',
    from: 'areaFraction',
    reading: 'illustrative',
    claim:
      'The area and the macula state are given equal weight and printed next to each other, because the scene’s whole point is that the first does not tell you the second.',
    claimJa:
      '面積と黄斑の状態は同じ重みで隣り合わせに表示されます。「前者から後者は分からない」ことが、このシーンの主眼だからです。',
    notClaim:
      'Neither is a measurement: the area is a share of a drawn sphere and the macula state is a position against a drawn edge.',
    notClaimJa:
      'どちらも測定値ではありません。面積は描かれた球に対する割合であり、黄斑の状態は描かれた境界に対する位置です。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of retinal detachment. It computes how far a separation reaches from a chosen origin, what share of the drawn retina that is, and whether the macula lies inside it. It contains no vision, no prognosis, no cause, no time and no gravity, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '網膜剥離についての教育用の幾何モデルです。選ばれた起点から剥離がどこまで広がるか、それが描かれた網膜の何割にあたるか、黄斑がその内側に入るかを計算します。視覚・予後・原因・時間・重力のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Where, not how much — and never what anybody can see.';
export const DISCLAIMER_SHORT_JA = '広さではなく位置｜「何が見えるか」は述べません。';
