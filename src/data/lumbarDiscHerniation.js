/**
 * Copy and configuration for the lumbar disc herniation scene.
 *
 * The scene's job is a separation rather than a story. Three things get said as
 * though they were one — how far the material has gone, whether it reaches the
 * nerve, and whether anybody hurts — so the copy keeps them in three different
 * sentences and the last of them is marked as not coming from the model at all.
 */

export const PALETTE = {
  bone: '#e8c98a',
  annulus: '#d88f7a',
  nucleus: '#f0dfa8',
  displaced: '#ff5d7a',
  given: '#8c4a60',
  canal: '#bcd8e0',
  root: '#e8b45a',
  touched: '#ff2e6b',
};

export const LEGEND = [
  { key: 'nucleus', label: 'The soft centre of the disc', labelJa: '椎間板の柔らかい中心（髄核）' },
  { key: 'annulus', label: 'The ring around it', labelJa: 'それを囲む線維輪' },
  { key: 'displaced', label: 'Material that has moved', labelJa: '移動した部分', activeFrom: 0.12 },
  { key: 'given', label: 'A ring that no longer closes', labelJa: '閉じなくなった輪', activeFrom: 0.36 },
  { key: 'root', label: 'The nerve root leaving here', labelJa: 'ここを出る神経根' },
  { key: 'touched', label: 'Where the two drawings overlap', labelJa: '2 つの描画が重なっている部分', activeFrom: 0.45 },
];

/**
 * The axis is **how far the material has gone**.
 *
 * Not time, not severity, and not a grade. Which way it goes lives on the model
 * controls, because three directions are three arrangements: material does not
 * travel from one direction to the next.
 */
export const STAGES = [
  {
    id: 'held',
    name: 'A ring, and something soft inside it',
    nameJa: '線維輪と、その中の柔らかいもの',
    at: 0,
    focus: ['nucleus', 'annulus', 'root'],
    summary:
      'The disc is two tissues: a soft centre and a ring holding it. Everything this scene says follows from the ring either holding or not.',
    summaryJa:
      '椎間板は 2 つの組織でできています。柔らかい中心と、それを抑える輪です。このシーンの主張はすべて、輪が保たれているかどうかから導かれます。',
  },
  {
    id: 'pressing',
    name: 'The ring is deformed, and still closed',
    nameJa: '輪は変形し、まだ閉じている',
    at: 0.35,
    focus: ['annulus', 'displaced'],
    summary:
      'The centre has moved and the ring is stretched around it. Nothing has left the disc, and nothing has reached anything.',
    summaryJa:
      '中心が移動し、輪はその周りで引き伸ばされています。椎間板から出たものはなく、何かに届いてもいません。',
  },
  {
    id: 'through',
    name: 'Past the ring, and towards what is there',
    nameJa: '輪を越え、その先にあるものへ',
    at: 1,
    focus: ['displaced', 'root', 'canal'],
    summary:
      'Material is beyond the ring. Whether it reaches anything, and what, is decided by the direction it went — not by how far it has gone.',
    summaryJa:
      '物質が輪の外へ出ています。何かに届くかどうか、届くとすれば何かは、進んだ「方向」が決めます。「どれだけ進んだか」ではありません。',
  },
];

export const RANGE = { start: 'Held', startJa: '保たれている', end: 'Well past it', endJa: '大きく越えている' };
export const PROGRESS_LABEL = {
  label: 'How far the material has gone',
  labelJa: '物質がどれだけ移動したか',
};

export const ANNOTATIONS = [
  { id: 'nucleus', text: 'The soft centre', sub: '髄核', anchor: 'nucleus', range: [0, 1], compact: false },
  { id: 'annulus', text: 'The ring holding it', sub: '線維輪', anchor: 'annulus', range: [0, 1], compact: false },
  { id: 'displaced', text: 'Where the material went', sub: '物質が移動した先', anchor: 'displaced', range: [0.1, 1], compact: false },
  { id: 'root', text: 'The nerve root', sub: '神経根', anchor: 'root', range: [0, 1], compact: false },
  { id: 'canal', text: 'The canal behind it', sub: '後方の脊柱管', anchor: 'canal', range: [0, 1], compact: false },
  { id: 'touched', text: 'Where the drawings overlap', sub: '描画が重なる部分', anchor: 'touched', range: [0.3, 1], compact: false },
];

export const METRICS = [
  { id: 'ring', label: 'Is the ring still closed behind it', labelJa: '輪は後方で閉じたままか', unit: '', emphasis: true },
  { id: 'meets', label: 'What lies the way it went', labelJa: '進んだ方向にあるもの', unit: '', emphasis: true },
  { id: 'reaches', label: 'Do the two drawings overlap', labelJa: '2 つの描画は重なっているか', unit: '' },
  { id: 'howFar', label: 'How far in, as a share of that structure’s own width', labelJa: 'その構造自身の幅に対して、どれだけ入り込んでいるか', unit: '%' },
  { id: 'symptoms', label: 'What anybody feels', labelJa: '本人が何を感じるか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'direction',
    kind: 'choice',
    label: 'Which way the material goes',
    labelJa: '物質が進む方向',
    options: [
      {
        value: 'none',
        label: 'Nowhere',
        labelJa: 'なし',
        effect: 'The disc keeps its shape and nothing is near anything.',
        effectJa: '椎間板は形を保ち、何も他の構造に近づきません。',
      },
      {
        value: 'central',
        label: 'Straight back, into the canal',
        labelJa: '真後ろ（脊柱管へ）',
        effect: 'The canal is the widest thing it can meet, so a lot of travel buys a small share of it.',
        effectJa: '脊柱管は最も幅の広い相手です。大きく進んでも、その幅に占める割合は小さくなります。',
      },
      {
        value: 'posterolateral',
        label: 'Back and to the side',
        labelJa: '後外側へ',
        effect: 'The shortest way to the nerve root in this drawing, and the narrowest thing it can meet.',
        effectJa: 'この図で神経根へ至る最短の方向であり、相手は最も細い構造です。',
      },
      {
        value: 'far-lateral',
        label: 'Further out, along the root',
        labelJa: 'さらに外側（神経根に沿って）',
        effect: 'The same root, further along it — and further for the material to travel to get there.',
        effectJa: '同じ神経根の、より外側の部分です。そこへ届くには、より長く進む必要があります。',
      },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Three directions, and what is each way',
  labelJa: '3 つの方向と、その先にあるもの',
  hint: 'Three arrangements, not three degrees. The direction decides what it can reach; the slider decides how far it has gone.',
  hintJa: '3 通りの配置であって 3 段階ではありません。方向が「何に届きうるか」を、スライダーが「どれだけ進んだか」を決めます。',
};

export const MODEL_SCOPE = {
  question:
    'When disc material moves, what has actually been said — and what has not?',
  questionJa:
    '椎間板の物質が移動したとき、実際に述べられたのは何で、述べられていないのは何か。',
  answers: [
    {
      text: '**How far it has gone, and whether the ring still closes behind it.** The disc is two tissues, and the difference between them is the difference between a deformed disc and material that has left one.',
      textJa:
        '**どれだけ進んだか、そして輪が後方でまだ閉じているか。** 椎間板は 2 つの組織でできており、その違いが「変形した椎間板」と「そこから出た物質」の違いです。',
    },
    {
      text: '**Whether the drawn material reaches the drawn structure**, and how much of that structure’s own width it has gone into. The direction decides what is reachable at all: the canal is wide and the nerve root is narrow, so the same travel means something different each way.',
      textJa:
        '**描かれた物質が描かれた構造に届くか**、そしてその構造自身の幅のどれだけに入り込んでいるか。何に届きうるかは方向が決めます。脊柱管は幅が広く神経根は細いため、同じだけ進んでも意味が変わります。',
    },
    {
      text: '**That these are two different questions, and that a third one is not answered here at all.** Material past the ring may reach nothing; material that reaches something may be a picture nobody feels. This model has no nerve in it in any sense beyond a drawn tube with a position.',
      textJa:
        '**この 2 つが別の問いであり、さらに第 3 の問いはここでは一切答えられていないこと。** 輪を越えた物質が何にも届かないこともあれば、何かに届いていても本人が何も感じないこともあります。本モデルにある「神経」は、位置を持つ描かれた管以上のものではありません。',
    },
  ],
  excludes: [
    {
      text: '**Every symptom and every sign.** Sciatica, numbness, weakness, reflex change and how any of them feels are **not outputs of this model** and cannot be read off any of its numbers. The steps that mention them say on screen that they are not drawn from the model.',
      textJa:
        '**あらゆる症状と所見。** 坐骨神経痛・しびれ・筋力低下・反射の変化、およびその感じ方は**本モデルの出力ではなく**、どの数値からも読み取れません。それらに触れる段階には、モデル由来ではないことを画面上に明記しています。',
    },
    {
      text: '**The radiological classification.** Bulge, protrusion, extrusion and sequestration are defined on measured geometry in a chosen plane, with rules this model does not have. `intact` and `breached` here are **not** those words.',
      textJa:
        '**画像上の分類。** bulge・protrusion・extrusion・sequestration は、選ばれた断面上の計測された形態に対して定義されるもので、本モデルはその規則を持ちません。ここでの「閉じている／越えている」は**それらの用語ではありません。**',
    },
    {
      text: 'All imaging: no plane, no sequence, no window and no measurement. **Nothing here is millimetres**, and nothing is a canal or foraminal stenosis ratio.',
      textJa:
        'あらゆる画像（断面・撮像法・条件・計測のいずれもありません）。**ここに mm はなく**、脊柱管狭窄率も椎間孔狭窄率もありません。',
    },
    {
      text: 'Time, cause and mechanism; inflammation and every chemical process; treatment, natural history and resorption. The axis is how far the material has gone, not how it got there.',
      textJa:
        '時間・原因・受傷機転、炎症をはじめとするあらゆる化学的過程、治療・自然経過・吸収。軸は「どれだけ進んだか」であって「どうやってそこへ至ったか」ではありません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** Every distance is measured off this repository’s own spine atlas, which declares itself not anatomically validated. The read-out gives a share of the structure’s **own drawn width**, never a distance.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** すべての距離は、このリポジトリ自身の脊椎アトラス（解剖学的検証を経ていないと自ら宣言しています）から測ったものです。読み出しが示すのは、その構造の**描かれた幅**に対する割合であって、距離ではありません。',
    },
    {
      text: '**"Overlapping" is contact in a drawing.** It is not a radiological report of root contact, not a finding in anybody, and not a cause of anything. Two drawn shapes overlap on screen; that is the whole of the claim.',
      textJa:
        '**「重なっている」とは、図の中での接触です。** 画像所見としての神経根接触でも、誰かの体内の所見でも、何かの原因でもありません。2 つの描画が画面上で重なっている、というだけです。',
    },
    {
      text: '**The atlas draws one pair of roots at this level, leaving above the disc.** So the traversing/exiting distinction a clinician would want is not available here and is not claimed: the two lateral directions reach the same drawn root at two places along it.',
      textJa:
        '**このアトラスはこの高位に 1 対の神経根のみを、椎間板より上方から出る形で描いています。** そのため臨床で問われる traversing / exiting の区別はここでは扱えず、主張もしていません。2 つの外側方向は、同じ神経根の異なる位置に届きます。',
    },
    {
      text: 'Past the width of what it meets, the model stops measuring rather than the picture getting worse. It does not push a root aside, deform it, or follow it anywhere.',
      textJa:
        '相手の幅を越えた先では、像が悪化するのではなく、モデルが測るのをやめます。神経根を押しのけたり、変形させたり、追いかけたりはしません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of the intervertebral disc as an annulus fibrosus enclosing a nucleus pulposus, and of displacement of nuclear material through a defect in the annulus.',
      textJa:
        '線維輪が髄核を包む構造としての椎間板、および線維輪の破綻部を通じた髄核物質の移動についての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of the posterolateral direction as the one in which displaced material most often approaches a nerve root, and of central displacement approaching the canal instead.',
      textJa:
        '移動した物質が神経根に接近しやすい方向としての後外側、および正中方向では脊柱管へ向かうことについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/lumbar-disc-herniation.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'spine-anatomy',
      label: 'The same column, named',
      labelJa: '同じ脊柱を、名前で',
      why: 'The vertebrae, the disc as its two tissues, the canal and the roots leaving it, as structures you can point at — with the ring intact.',
      whyJa: '椎骨、2 つの組織からなる椎間板、脊柱管、そこを出る神経根を、名前で指せる構造として示します。輪は保たれた状態です。',
    },
    {
      slug: 'bone-remodeling',
      label: 'What bone does over time',
      labelJa: '骨が時間をかけて行うこと',
      why: 'This scene has no time in it at all. That one is about what a skeleton does with time, which is the axis this subject is usually told along and the one missing here.',
      whyJa: 'このシーンには時間がありません。あちらは骨格が時間をかけて何をするかを扱っており、この主題が通常語られる軸であり、ここに欠けている軸でもあります。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-material-moves',
    target: 'the soft centre of the disc',
    channel: 'position',
    from: 'reach',
    reading: 'proportional',
    claim:
      'The nucleus is drawn displaced along the chosen direction by exactly the distance the model gives it, so what moves on screen is the model’s answer rather than an illustration of it.',
    claimJa:
      '髄核は、選ばれた方向へモデルの示す距離だけ移動して描かれます。画面上で動くのはモデルの答えそのものであって、その図解ではありません。',
    notClaim:
      '**The distance is in the atlas’s own units and is not millimetres.** Nothing about how far it goes is a measurement, and the axis is not a rate, a grade or a time.',
    notClaimJa:
      '**この距離はアトラス自身の単位であり、mm ではありません。** 進む距離は測定値ではなく、軸も速度でも grade でも時間でもありません。',
  },
  {
    id: 'the-ring-changes-colour-once',
    target: 'the ring around it',
    channel: 'colour',
    from: 'annulus',
    reading: 'thresholded',
    claim:
      'The ring is drawn in one colour while it still closes behind the material and another once it does not, because that is a state with two values rather than a quantity.',
    claimJa:
      '輪は、物質の後方でまだ閉じているあいだは 1 つの色で、閉じなくなると別の色で描かれます。これは量ではなく 2 値の状態だからです。',
    notClaim:
      '**The two colours are not two radiological categories.** Bulge, protrusion, extrusion and sequestration are defined on geometry this model does not have, and neither colour is any of them.',
    notClaimJa:
      '**この 2 色は画像上の 2 つの分類ではありません。** bulge・protrusion・extrusion・sequestration は本モデルが持たない形態計測に基づく定義であり、いずれの色もそれらではありません。',
  },
  {
    id: 'the-overlap-is-drawn-as-a-space',
    target: 'where the material and the structure meet',
    channel: 'geometry',
    from: 'indentFraction',
    reading: 'illustrative',
    claim:
      'A marker is drawn at the point where the two shapes overlap, sized by how much of the structure’s own width the material has gone into — so the thing being claimed has a place and an extent on screen.',
    claimJa:
      '2 つの形が重なる位置に印を描き、その大きさは「相手の幅のどれだけに入り込んでいるか」で決まります。主張されている事柄が、画面上の位置と広がりを持つようにするためです。',
    notClaim:
      '**Overlap in a drawing is not root contact in anybody**, and it is not a cause of any symptom. The marker has no tissue in it and represents no process.',
    notClaimJa:
      '**図の中の重なりは、誰かの体内での神経根接触ではなく**、いかなる症状の原因でもありません。この印に組織はなく、どんな過程も表していません。',
  },
  {
    id: 'nothing-stands-for-a-symptom',
    target: 'the whole picture',
    channel: 'colour',
    from: 'symptoms',
    reading: 'illustrative',
    claim:
      'Nothing anywhere in the scene changes colour, size, brightness or position to stand for pain, numbness or weakness — the model has no such output, so the drawing has no such channel.',
    claimJa:
      'このシーンでは、痛み・しびれ・筋力低下を表すために色・大きさ・明るさ・位置が変わる要素は一切ありません。モデルにその出力がないため、描画にもその経路がありません。',
    notClaim:
      'The read-out prints "not in this model" where a symptom would go, rather than leaving the field out — an absent row reads as an oversight, and this absence is the claim.',
    notClaimJa:
      '症状が入る位置には、欄を省略するのではなく「このモデルにはありません」と表示します。欄が無いことは見落としに読めますが、この不在自体が主張だからです。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of lumbar disc displacement. It computes how far drawn disc material has moved, whether the drawn ring still closes behind it, and whether the drawn material overlaps the drawn canal or nerve root. It contains no symptoms, no imaging, no time and no treatment, its containment states are not the radiological classification, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '腰椎椎間板の物質移動についての教育用の幾何モデルです。描かれた物質がどれだけ移動したか、描かれた輪がその後方でまだ閉じているか、描かれた物質が描かれた脊柱管や神経根と重なるかを計算します。症状・画像・時間・治療のいずれも含まず、ここでの「閉じている／越えている」は画像上の分類ではなく、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Overlap in a drawing, not root contact — and never a symptom.';
export const DISCLAIMER_SHORT_JA = '図の中の重なりであって神経根接触ではなく、症状でもありません。';
