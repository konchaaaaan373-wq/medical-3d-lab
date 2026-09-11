/**
 * Copy and configuration for the tissue-under-load scene.
 *
 * The scene's job is to unseat one picture and put another in its place. A
 * reader arrives with injury running downwards from the skin; what the read-out
 * puts in front of them is a profile with its peak at the bottom.
 */

export const PALETTE = {
  epidermis: '#f2c9a8',
  dermis: '#d98d7a',
  subcutis: '#f0d98a',
  bone: '#e8e0cc',
  load: '#9fb0c8',
  squeezed: '#ff5d4d',
  easy: '#5f7a86',
};

export const LEGEND = [
  { key: 'load', label: 'What is pressing, and from where', labelJa: '何が、どこから押しているか' },
  { key: 'bone', label: 'What is underneath it', labelJa: 'その下にあるもの' },
  { key: 'squeezed', label: 'The depth being squeezed hardest', labelJa: '最も強く圧迫されている深さ', activeFrom: 0.1 },
  { key: 'easy', label: 'Depths taking less of it', labelJa: '圧迫の少ない深さ' },
];

/**
 * The axis is **how hard the surface is being pressed**.
 *
 * Not time, not duration, and not a stage. What lies under the load lives on
 * the model controls, because the two grounds are two shapes of answer rather
 * than two amounts of one.
 */
export const STAGES = [
  {
    id: 'unloaded',
    name: 'Layers, and something under them',
    nameJa: '層と、その下にあるもの',
    at: 0,
    focus: ['bone', 'load'],
    summary:
      'Skin is layers, and what lies beneath them is not always more tissue. Whether there is bone under the load is the question this scene turns on.',
    summaryJa:
      '皮膚は層でできており、その下にあるのが常に組織とは限りません。荷重の下に骨があるかどうかが、このシーンの分かれ目です。',
  },
  {
    id: 'pressed',
    name: 'Pressed from above',
    nameJa: '上から押される',
    at: 0.5,
    focus: ['squeezed'],
    summary:
      'A load at the surface is felt at every depth, but not equally. Which depth takes the most of it is what the picture is for.',
    summaryJa:
      '表面への荷重はどの深さにも及びますが、均等ではありません。どの深さが最も受け止めるのかが、この図の主題です。',
  },
  {
    id: 'caught',
    name: 'Caught between two things',
    nameJa: '2 つのものに挟まれる',
    at: 1,
    focus: ['squeezed', 'bone'],
    summary:
      'Tissue with bone beneath it is squeezed from both sides at once, and the worst of it is down there — not at the skin.',
    summaryJa:
      '下に骨がある組織は、両側から同時に圧迫されます。そして最も強く圧迫されるのは深部であって、皮膚ではありません。',
  },
];

export const RANGE = { start: 'Unloaded', startJa: '無負荷', end: 'Pressed hard', endJa: '強く圧迫' };
export const PROGRESS_LABEL = { label: 'How hard the surface is being pressed', labelJa: '表面がどれだけ強く押されているか' };

export const ANNOTATIONS = [
  { id: 'load', text: 'What is pressing', sub: '圧迫しているもの', anchor: 'load', range: [0, 1], compact: false },
  { id: 'bone', text: 'What is underneath', sub: '下にあるもの', anchor: 'bone', range: [0, 1], compact: false },
  { id: 'squeezed', text: 'Squeezed hardest here', sub: '圧迫が最大の深さ', anchor: 'squeezed', range: [0.08, 1], compact: false },
  { id: 'skin', text: 'The skin at the top', sub: '最上層の皮膚', anchor: 'skin', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'worst', label: 'Which depth is squeezed hardest', labelJa: '最も強く圧迫されている深さ', unit: '', emphasis: true },
  { id: 'ratio', label: 'How much more than the skin at the top', labelJa: '最上層の皮膚に対する倍率', unit: '×', emphasis: true },
  { id: 'skin', label: 'The skin, against the hardest-squeezed depth', labelJa: '皮膚（最大の深さに対する比）', unit: '%' },
  { id: 'ground', label: 'What is under the load', labelJa: '荷重の下にあるもの', unit: '' },
  { id: 'stage', label: 'What stage this is', labelJa: 'これがどの stage か', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'ground',
    kind: 'choice',
    label: 'What lies under the load',
    labelJa: '荷重の下にあるもの',
    options: [
      { value: 'none', label: 'Nothing is pressing', labelJa: '圧迫なし', effect: 'Every depth is as it was.', effectJa: 'どの深さも元のままです。' },
      { value: 'soft-tissue', label: 'More soft tissue', labelJa: '軟部組織', effect: 'The squeeze spreads downwards and fades. The skin at the top takes the most of it.', effectJa: '圧迫は下方へ広がりながら弱まります。最も受け止めるのは最上層の皮膚です。' },
      { value: 'bony-prominence', label: 'Bone, close underneath', labelJa: 'すぐ下に骨', effect: 'Tissue is caught between the load and the bone, so the deep layer takes more of it than the skin does.', effectJa: '組織が荷重と骨に挟まれるため、深層は皮膚より強く圧迫されます。' },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Two grounds, two shapes of answer',
  labelJa: '2 つの下地、2 通りの答えの形',
  hint: 'Not two amounts. What is underneath changes where the worst of it is, not how much there is.',
  hintJa: '2 段階ではありません。下にあるものが変えるのは「最悪の場所」であって「量」ではありません。',
};

export const MODEL_SCOPE = {
  question:
    'When a surface is pressed, which depth takes the most of it?',
  questionJa:
    '表面が圧迫されたとき、最も強く受け止めるのはどの深さか。',
  answers: [
    {
      text: '**Not always the skin.** Tissue caught between a load above and a bone below is squeezed from both sides at once, so the profile has its peak at that interface — which is deep.',
      textJa:
        '**常に皮膚とは限りません。** 上の荷重と下の骨に挟まれた組織は両側から同時に圧迫されるため、分布の最大値はその境界、すなわち深部にあります。',
    },
    {
      text: 'That this is **a different shape of answer, not a worse one**: over soft tissue the squeeze fades downwards from the skin, and over bone it rises again at depth. The two grounds are two profiles, not two amounts.',
      textJa:
        'これは**「より重い答え」ではなく「異なる形の答え」**であること。軟部組織の上では圧迫は皮膚から下方へ弱まり、骨の上では深部で再び強くなります。2 つの下地は 2 通りの分布であって、2 段階ではありません。',
    },
    {
      text: 'That a model in which deformation only ever decreased with depth **could not represent an injury that begins deep at all** — which is the reason this one is built the way it is.',
      textJa:
        '深さとともに圧迫が減る一方のモデルでは、**深部から始まる損傷を表現できない**こと。このモデルがこの形で作られているのは、そのためです。',
    },
  ],
  excludes: [
    {
      text: '**Every clinical stage.** This model does not stage a pressure injury and cannot be made to: staging rests on what tissue is visible and what has been lost, and this model has neither. **No output here is a stage, a grade or a threshold.**',
      textJa:
        '**あらゆる臨床 stage。** 本モデルは褥瘡の staging を行わず、行えるようにもなっていません。staging は「何が見えているか」「何が失われたか」に基づきますが、本モデルはそのどちらも持ちません。**ここの出力はどれも stage でも grade でも閾値でもありません。**',
    },
    {
      text: '**All damage.** No death, no loss, no depth of loss, no ulcer and no wound. **Tissue deforms in this model and nothing else happens to it**, and nothing converts a deformation into an injury.',
      textJa:
        '**あらゆる損傷。** 壊死も、組織欠損も、その深さも、潰瘍も、創傷もありません。**本モデルでは組織は変形するだけで、それ以外は何も起こらず**、変形を損傷に変換するものもありません。',
    },
    {
      text: 'All the mechanics and all the biology: no stress, no strain, no modulus, no blood, no perfusion, no ischaemia, no inflammation and no repair.',
      textJa:
        '力学と生物学のすべて。応力・ひずみ・弾性率・血液・灌流・虚血・炎症・修復のいずれもありません。',
    },
    {
      text: 'Time, duration and relief — the axis is how hard it is loaded, not how long it has been. Temperature, moisture, friction and continence. And there is no person, no position and no support surface.',
      textJa:
        '時間・持続・除圧（軸は「どれだけ強く」であって「どれだけ長く」ではありません）。温度・湿潤・摩擦・失禁。そして人も体位も支持面もありません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The layer depths are this repository’s own skin atlas’s **display values, which that atlas declares are deliberately not to scale** — the epidermis is drawn some twenty times too thick because a line cannot carry what a reader needs to see in it.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 各層の深さは、このリポジトリ自身の皮膚アトラスの**表示用の値であり、そのアトラス自身が「意図的に実寸比ではない」と宣言しています。** 表皮は線では必要な情報を示せないため、実際の約 20 倍の厚みで描かれています。',
    },
    {
      text: '**The bone is a structure this scene adds.** The atlas is a specimen of skin and has no skeleton in it, so the prominence beneath is drawn here — and it is the thing the whole claim rests on, which is why it is drawn at all.',
      textJa:
        '**骨はこのシーンが付け加えた構造です。** アトラスは皮膚の標本であり骨格を含まないため、下方の骨隆起はここで描いています。主張全体が依拠する構造であるからこそ描いています。',
    },
    {
      text: 'The two terms of the profile are **shapes chosen to be the two shapes**, not a mechanics. How far a squeeze reaches, and how much harder trapped tissue is squeezed, are calibrations — and what they have to deliver is that the deep peak exists, which is what a test fixes rather than the values.',
      textJa:
        '分布の 2 つの項は、**その 2 つの形になるように選ばれた関数**であって力学ではありません。圧迫がどこまで及ぶか、挟まれた組織がどれだけ強く圧迫されるかは較正値であり、それらが満たすべきなのは「深部のピークが存在すること」です。テストが固定しているのは値ではなくその帰結です。',
    },
    {
      text: 'Each depth is reported **as a share of this profile’s own peak**, so the numbers compare depths inside one picture. Comparing them between two grounds, or between two positions on the axis, is not something this model supports.',
      textJa:
        '各深さは**この分布自身の最大値に対する割合**として示されるため、数値は 1 つの画面内で深さどうしを比べるためのものです。2 つの下地の間や、軸上の 2 点の間で比べることは、本モデルの支えるところではありません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of pressure injury as deformation of soft tissue between an external surface and underlying bone, and of injury that begins in deep tissue rather than at the skin.',
      textJa:
        '褥瘡が、外部の面と下床の骨とのあいだで軟部組織が変形することであること、および皮膚ではなく深部組織から始まる損傷があることについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of bony prominences as the sites at which such injuries arise, taken here **only** as the reason a prominence is under the load.',
      textJa:
        '骨突出部がこうした損傷の好発部位であることについての標準的記載。ここでは**荷重の下に骨隆起を置く理由としてのみ**用いています。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/pressure-injury.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'skin-anatomy',
      label: 'The same block, named',
      labelJa: '同じ皮膚を、名前で',
      why: 'The epidermis, the dermis, the fat beneath and what runs through them, as structures you can point at, with nothing pressing on any of it.',
      whyJa: '表皮・真皮・その下の脂肪・そこを通る構造を、名前で指せる構造として示します。どこにも圧迫はかかっていません。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-profile-is-drawn-down-the-side',
    target: 'how hard each depth is squeezed',
    channel: 'geometry',
    from: 'layers[].share',
    reading: 'illustrative',
    claim:
      'A bar at each named depth, as long as that depth’s share of the profile’s own peak, is drawn down the side of the block — so the shape of the answer is a shape rather than four numbers a reader has to hold in mind.',
    claimJa:
      '各深さに、その深さが分布の最大値に占める割合の長さの棒を、ブロックの側面に描きます。答えの「形」が、読み手が覚えておくべき 4 つの数値ではなく、形として見えるようにするためです。',
    notClaim:
      '**Each bar is a share of this picture’s own peak**, so bars may be compared down one block and not between two. No bar is a stress, a strain or an amount of anything.',
    notClaimJa:
      '**各棒はこの画面自身の最大値に対する割合**であり、1 つのブロック内で比べるためのものです。2 つのブロック間では比べられません。どの棒も応力・ひずみ・何かの量ではありません。',
  },
  {
    id: 'the-worst-depth-is-coloured',
    target: 'the layer squeezed hardest',
    channel: 'colour',
    from: 'worstAt',
    reading: 'thresholded',
    claim:
      'The depth taking the most of it is drawn in a colour of its own, because the scene’s entire claim is about which one that is and a reader must be able to see it without counting bars.',
    claimJa:
      '最も強く圧迫されている深さは独自の色で描かれます。「それがどの深さか」がこのシーンの主張そのものであり、棒を数えずに見て分かる必要があるためです。',
    notClaim:
      'Coloured means *this depth is being squeezed most*. **It does not mean the tissue there is damaged, dying or lost** — nothing in this model does anything to tissue but deform it.',
    notClaimJa:
      '色がつくのは「その深さが最も圧迫されている」という意味です。**そこの組織が損傷した・壊死した・失われたという意味ではありません。** 本モデルが組織にすることは変形だけです。',
  },
  {
    id: 'the-bone-is-declared',
    target: 'what is underneath',
    channel: 'geometry',
    from: 'overBone',
    reading: 'illustrative',
    claim:
      'A prominence is drawn under the block when the ground is bone and nothing is drawn when it is not, so the two arrangements are two pictures rather than one picture with a different read-out.',
    claimJa:
      '下地が骨のときはブロックの下に隆起を描き、そうでないときは何も描きません。2 つの配置が、読み出しだけ違う 1 つの絵ではなく、2 つの絵になるようにするためです。',
    notClaim:
      '**The skin atlas has no skeleton in it.** This prominence is a structure the scene adds, and it is declared because the whole claim rests on it.',
    notClaimJa:
      '**皮膚アトラスに骨格はありません。** この隆起はシーンが付け加えた構造であり、主張全体がそこに依拠しているため明示しています。',
  },
  {
    id: 'nothing-stands-for-a-stage',
    target: 'the whole picture',
    channel: 'colour',
    from: 'stage',
    reading: 'illustrative',
    claim:
      'Nothing anywhere in this scene changes to stand for a stage, a grade or a depth of tissue loss, because the model has no such output.',
    claimJa:
      'このシーンには、stage・grade・組織欠損の深さを表すために変化する要素は一切ありません。モデルにその出力がないためです。',
    notClaim:
      'The read-out prints "not in this model" where a stage would go, rather than leaving the row out — an absent row reads as an oversight, and this absence is the claim.',
    notClaimJa:
      'stage が入る位置には、行を省くのではなく「このモデルにはありません」と表示します。欄が無いことは見落としに読めますが、この不在自体が主張だからです。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of tissue under a surface load. It computes how hard each named depth of a drawn skin block is squeezed, and which depth takes the most of it, for a load over soft tissue or over a bony prominence. It contains no damage, no time, no blood and no mechanics, it does not stage a pressure injury, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '表面荷重下の組織についての教育用の幾何モデルです。描かれた皮膚ブロックの各深さがどれだけ圧迫されるか、どの深さが最も受け止めるかを、軟部組織上・骨隆起上のそれぞれについて計算します。損傷・時間・血流・力学のいずれも含まず、褥瘡の staging も行わず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'A profile of squeezing — never damage, and never a stage.';
export const DISCLAIMER_SHORT_JA = '圧迫の分布であって、損傷でも stage でもありません。';
