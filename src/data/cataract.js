/**
 * Copy and configuration for the cataract scene.
 *
 * The read-out prints two shares next to each other — how much of the lens the
 * opacity covers, and how much of the open pupil it stands in — because the
 * scene exists to show that the first is not the second, and that the pupil
 * decides which of two opacities is in the way.
 */

export const PALETTE = {
  sclera: '#f0e6d8',
  cornea: '#cfe4ef',
  iris: '#8a6a4a',
  lens: '#cfe9f2',
  opacity: '#f3efe0',
  inPath: '#ffcb45',
  aperture: '#63d6ff',
  retina: '#e8b9a0',
};

export const LEGEND = [
  { key: 'lens', label: 'The lens', labelJa: '水晶体' },
  { key: 'opacity', label: 'The clouded part of it', labelJa: '混濁している部分', activeFrom: 0.08 },
  { key: 'inPath', label: 'The part of it the pupil is letting light through', labelJa: '瞳孔が光を通している範囲にある部分', activeFrom: 0.12 },
  { key: 'aperture', label: 'The opening light comes through', labelJa: '光が通る開口部' },
];

/**
 * The axis is **how opaque the clouded part is**.
 *
 * Not time and not a stage. Where the cloudiness is, and how open the pupil is,
 * live on the model controls: three places and two apertures are arrangements,
 * and nothing here says one becomes another.
 */
export const STAGES = [
  {
    id: 'clear',
    name: 'A clear lens, and a hole in front of it',
    nameJa: '透明な水晶体と、その前の穴',
    at: 0,
    focus: ['lens', 'aperture'],
    summary:
      'Light reaches the back of the eye through an opening that changes size. Only the part of the lens behind that opening is in the way of anything.',
    summaryJa:
      '光は、大きさの変わる開口部を通って眼の奥へ届きます。その開口部の後ろにある部分だけが、光の通り道にあります。',
  },
  {
    id: 'clouding',
    name: 'One part of it is no longer clear',
    nameJa: '一部が透明でなくなる',
    at: 0.5,
    focus: ['opacity', 'inPath'],
    summary:
      'A region of the lens has clouded. How much of the lens that is, and how much of the light’s way it stands in, are two different numbers.',
    summaryJa:
      '水晶体の一部が混濁しました。それが水晶体のどれだけを占めるかと、光の通り道のどれだけを塞ぐかは、別々の数値です。',
  },
  {
    id: 'in-the-way',
    name: 'Whether it is in the way at all',
    nameJa: 'そもそも通り道にあるのかどうか',
    at: 1,
    focus: ['inPath', 'aperture'],
    summary:
      'A small cloud at the centre can fill the opening; a much larger one at the rim can be entirely outside it. Opening the pupil swaps which is which.',
    summaryJa:
      '中心の小さな混濁が開口部を埋めることもあれば、縁のずっと大きな混濁が完全にその外にあることもあります。瞳孔が開くと、この関係が入れ替わります。',
  },
];

export const RANGE = { start: 'Clear', startJa: '透明', end: 'Opaque', endJa: '不透明' };
export const PROGRESS_LABEL = { label: 'How opaque the clouded part is', labelJa: '混濁部分がどれだけ不透明か' };

export const ANNOTATIONS = [
  { id: 'lens', text: 'The lens', sub: '水晶体', anchor: 'lens', range: [0, 1], compact: false },
  { id: 'opacity', text: 'The clouded part', sub: '混濁部分', anchor: 'opacity', range: [0.06, 1], compact: false },
  { id: 'aperture', text: 'The opening', sub: '瞳孔（開口部）', anchor: 'aperture', range: [0, 1], compact: false },
  { id: 'retina', text: 'Where light is going', sub: '光が向かう先', anchor: 'retina', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'ofLens', label: 'How much of the lens has clouded', labelJa: '水晶体のうち混濁している割合', unit: '%', emphasis: true },
  { id: 'inPath', label: 'How much of the open pupil that cloud stands in', labelJa: '開いた瞳孔のうち、その混濁が占める割合', unit: '%', emphasis: true },
  { id: 'blocked', label: 'That share, weighted by how opaque it is', labelJa: 'その割合に不透明度を掛けたもの', unit: '%' },
  { id: 'pupil', label: 'How open the pupil is', labelJa: '瞳孔の開き', unit: '' },
  { id: 'vision', label: 'What anybody can see', labelJa: '本人に何が見えるか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'kind',
    kind: 'choice',
    label: 'Where the cloudiness is',
    labelJa: '混濁の場所',
    options: [
      { value: 'none', label: 'Nowhere', labelJa: 'なし', effect: 'The lens is clear all the way across.', effectJa: '水晶体は全体が透明です。' },
      { value: 'nuclear', label: 'In the middle of the lens', labelJa: '水晶体の中心部（核）', effect: 'A fifth of the lens, and all of it is behind a small pupil.', effectJa: '水晶体の約 1/5 を占め、そのすべてが小さな瞳孔の後ろにあります。' },
      { value: 'cortical', label: 'Around the rim', labelJa: '周辺部（皮質）', effect: 'Most of the lens by area, and none of it behind a small pupil.', effectJa: '面積では水晶体の大部分ですが、小さな瞳孔の後ろには一切ありません。' },
      { value: 'posterior-subcapsular', label: 'A small patch at the back', labelJa: '後嚢下の小さな部分', effect: 'A twelfth of the lens, and most of a small pupil. The clearest case of place beating size.', effectJa: '水晶体の約 1/12 ですが、小さな瞳孔の大部分を占めます。「広さより場所」が最もはっきり現れる例です。' },
    ],
  },
  {
    id: 'pupil',
    kind: 'choice',
    label: 'How open the pupil is',
    labelJa: '瞳孔の開き',
    options: [
      { value: 'narrow', label: 'Small', labelJa: '小さい', effect: 'Only the middle of the lens is in the way of anything.', effectJa: '水晶体の中心部だけが光の通り道にあります。' },
      { value: 'wide', label: 'Wide', labelJa: '大きい', effect: 'Nearly all of the lens is, so the rim starts to matter and the middle matters less.', effectJa: '水晶体のほぼ全体が通り道に入るため、周辺部が効いてきて中心部の比重は下がります。' },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'A place, and an opening',
  labelJa: '場所と、開口部',
  hint: 'Neither is a degree. The place decides where the cloud is; the opening decides whether that place is being used.',
  hintJa: 'どちらも段階ではありません。場所が「混濁がどこにあるか」を、開口部が「その場所が使われているか」を決めます。',
};

export const MODEL_SCOPE = {
  question:
    'When part of the lens clouds, what decides whether it is in the way?',
  questionJa:
    '水晶体の一部が濁ったとき、それが光の通り道にあるかどうかを決めるのは何か。',
  answers: [
    {
      text: '**Where it is, and how open the pupil is — not how much of the lens it covers.** Light only passes through the part of the lens behind the opening, so a cloud outside that part is not in the way of anything.',
      textJa:
        '**混濁の場所と、瞳孔の開き。水晶体のどれだけを覆うかではありません。** 光は開口部の後ろにある部分しか通らないため、その外側にある混濁は何の妨げにもなりません。',
    },
    {
      text: 'That the two numbers come apart sharply: a cloud over **most of the lens by area** can stand in **none** of a small pupil, while one over a twelfth of it can stand in most.',
      textJa:
        'この 2 つの数値は大きく食い違うこと。**面積では水晶体の大部分**を占める混濁が、小さな瞳孔の**まったく外**にあることもあれば、1/12 の混濁がその大部分を占めることもあります。',
    },
    {
      text: 'That opening the pupil **reverses which one matters**, because it changes which part of the lens is being used — which is a fact about an aperture and not about either cloud.',
      textJa:
        '瞳孔が開くと**どちらが効くかが入れ替わる**こと。使われる水晶体の部分が変わるためで、これは開口部についての事実であって、どちらの混濁についての事実でもありません。',
    },
  ],
  excludes: [
    {
      text: '**All vision.** No acuity, no contrast sensitivity, no glare, no colour and no refraction. A clouded lens here is an area in an aperture, and **nothing converts the share this model reports into anything about sight.**',
      textJa:
        '**視覚のすべて。** 視力・コントラスト感度・グレア・色覚・屈折のいずれもありません。ここでの混濁は「開口部の中の面積」であり、**本モデルが示す割合を見え方に変換するものは一切ありません。**',
    },
    {
      text: '**Every indication for treatment.** Nothing here says when a lens should be replaced, treated or left alone, and no output is a threshold for any of that.',
      textJa:
        '**治療適応のすべて。** どの時点で手術すべきか、何もしないべきかについて、ここでは何も述べておらず、どの出力もその閾値ではありません。',
    },
    {
      text: 'All light physics: nothing is scattered, refracted or absorbed here. A ray either crosses the clouded area or it does not.',
      textJa:
        '光の物理のすべて。ここでは散乱も屈折も吸収も起こりません。光線は混濁部分を横切るか、横切らないかのどちらかです。',
    },
    {
      text: 'Time, progression and cause: no age, no steroid, no diabetes and no trauma. The three places are **not** three stages, and the axis is how opaque one place is, not how far along anything is.',
      textJa:
        '時間・進行・原因（加齢・ステロイド・糖尿病・外傷のいずれもありません）。3 つの場所は **3 段階ではなく**、軸は「ある場所がどれだけ不透明か」であって進行度ではありません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The lens and the pupil are this repository’s own eye atlas’s. Both shares are shares of drawn circles.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 水晶体と瞳孔は、このリポジトリ自身の眼のアトラスのものです。2 つの割合は、いずれも描かれた円に対する割合です。',
    },
    {
      text: 'The two pupil sizes are **two apertures, not two light levels.** This model has no light in it, and nothing here says what made the pupil that size or what it is responding to.',
      textJa:
        '2 つの瞳孔サイズは **2 つの開口部であって、2 つの明るさではありません。** 本モデルに光はなく、瞳孔がその大きさになった理由や、何に反応しているかについても何も述べていません。',
    },
    {
      text: 'Each opacity is drawn as an even band of the lens at one depth. A real opacity is neither even nor confined to a band, and the depth is carried **for the drawing only** — nothing in the arithmetic depends on it.',
      textJa:
        '各混濁は、ある深さにおける水晶体の均一な帯として描かれます。実際の混濁は均一でも帯状でもなく、深さは**描画のためだけ**に保持されており、計算には一切用いていません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of nuclear, cortical and posterior subcapsular lens opacity as distinct locations within the lens.',
      textJa:
        '核性・皮質性・後嚢下混濁が、水晶体内の異なる部位であることについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'The standard observation that the pupil is the aperture through which light reaches the retina, so that the part of the lens in the optical path depends on its size.',
      textJa:
        '瞳孔が光の通る開口部であり、光路に入る水晶体の範囲がその大きさに依存することについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/cataract.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'eye-anatomy',
      label: 'The same eye, named',
      labelJa: '同じ眼を、名前で',
      why: 'The cornea, the iris, the lens behind it and the retina at the back, as structures you can point at, with the lens clear.',
      whyJa: '角膜・虹彩・その後ろの水晶体・眼底の網膜を、名前で指せる構造として示します。水晶体は透明な状態です。',
    },
    {
      slug: 'retinal-detachment',
      label: 'The other end of the same path',
      labelJa: '同じ通り道の、反対の端',
      why: 'A separate model, at the back of the same eye. Both are about the path light takes, and neither computes what anybody sees.',
      whyJa: '同じ眼の後方についての、独立したモデルです。どちらも光の通り道を扱い、どちらも「何が見えるか」を計算しません。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-cloud-is-a-band-of-the-lens',
    target: 'the clouded part of the lens',
    channel: 'geometry',
    from: 'band',
    reading: 'proportional',
    claim:
      'The opacity is drawn as the band of the lens the model names — the same inner and outer radii — so where it is on screen is where the model put it.',
    claimJa:
      '混濁は、モデルが指定した水晶体の帯としてそのまま描かれます。内側と外側の半径は同じで、画面上の位置はモデルが置いた位置です。',
    notClaim:
      'A real opacity is neither an even band nor confined to one depth. **The depth it is drawn at is for the drawing only** — nothing in the arithmetic depends on it.',
    notClaimJa:
      '実際の混濁は均一な帯でも、1 つの深さに限られたものでもありません。**描かれる深さは描画のためだけ**であり、計算には一切用いていません。',
  },
  {
    id: 'the-aperture-is-drawn-over-it',
    target: 'the opening light comes through',
    channel: 'geometry',
    from: 'apertureRadius',
    reading: 'proportional',
    claim:
      'A ring at the model’s aperture radius is drawn on the lens itself, so a reader can see which part of the lens is in use and compare the cloud against it directly.',
    claimJa:
      'モデルの示す開口半径の輪を水晶体そのものの上に描きます。水晶体のどの部分が使われているかが見え、混濁と直接比べられるようにするためです。',
    notClaim:
      '**Two apertures, not two light levels.** This model has no light in it and says nothing about what made the pupil that size.',
    notClaimJa:
      '**2 つの開口部であって、2 つの明るさではありません。** 本モデルに光はなく、瞳孔がその大きさになった理由についても何も述べていません。',
  },
  {
    id: 'the-part-in-the-way-is-its-own-shape',
    target: 'the part of the cloud inside the aperture',
    channel: 'colour',
    from: 'inPath',
    reading: 'illustrative',
    claim:
      'Where the cloud and the opening overlap is drawn in a colour of its own, because that overlap is the model’s answer and a reader cannot compute an intersection of two rings by eye.',
    claimJa:
      '混濁と開口部が重なる部分は独自の色で描かれます。その重なりこそがモデルの答えであり、2 つの輪の交わりを目で計算することはできないためです。',
    notClaim:
      'The colour marks an area in an aperture. **It is not light, not a transmission, and not a loss of anything.**',
    notClaimJa:
      'この色は「開口部の中の面積」を示すものです。**光でも、透過率でも、何かの損失でもありません。**',
  },
  {
    id: 'both-shares-are-printed',
    target: 'the read-out',
    channel: 'colour',
    from: 'ofTheLens',
    reading: 'illustrative',
    claim:
      'How much of the lens has clouded and how much of the open pupil it stands in are given equal weight side by side, because the scene’s point is that the first does not give you the second.',
    claimJa:
      '「水晶体のどれだけが濁ったか」と「開いた瞳孔のどれだけを占めるか」は、同じ重みで並べて表示されます。前者から後者は分からない、というのがこのシーンの主眼だからです。',
    notClaim:
      'Neither is a measurement, and neither is a visual measure. The read-out prints "not in this model" where sight would go.',
    notClaimJa:
      'どちらも測定値ではなく、視覚の指標でもありません。見え方が入る場所には「このモデルにはありません」と表示されます。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of lens opacity. It computes which band of a drawn lens has clouded, how much of a drawn pupil that band stands in, and how those two change with the aperture. It contains no vision, no light physics, no cause, no time and no indication for treatment, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '水晶体混濁についての教育用の幾何モデルです。描かれた水晶体のどの帯が混濁しているか、それが描かれた瞳孔のどれだけを占めるか、開口部の大きさでそれがどう変わるかを計算します。視覚・光の物理・原因・時間・治療適応のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'An area in an aperture — never a measure of sight.';
export const DISCLAIMER_SHORT_JA = '開口部の中の面積であって、見え方の指標ではありません。';
