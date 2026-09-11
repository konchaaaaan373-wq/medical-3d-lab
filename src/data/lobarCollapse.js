/**
 * Copy and configuration for the lobar collapse scene.
 *
 * The scene's subject is **volume**, and its hardest job is to stop a reader
 * reading it as density. So the contrast with consolidation is not a footnote
 * here: it is in the subtitle, in the scope panel, in the related list and in
 * the patient walk, because "a lobe that looks wrong on a picture" is the
 * sentence both pathologies share and the only one they share.
 */

export const PALETTE = {
  lung: '#d98d95',
  collapsed: '#7a3f5e',
  expanded: '#ffb94f',
  spared: '#9a7176',
  bronchus: '#9fb0c8',
  blockage: '#ff3d6e',
  midline: '#63d6ff',
};

export const LEGEND = [
  { key: 'collapsed', label: 'The lobe that has lost its air', labelJa: '空気を失った肺葉', activeFrom: 0.1 },
  { key: 'expanded', label: 'The lobes that took the room', labelJa: 'その場所を引き受けた肺葉', activeFrom: 0.2 },
  { key: 'midline', label: 'Where the middle was, and where it is', labelJa: '正中がもとあった位置と、いまの位置' },
  { key: 'spared', label: 'The other side, which takes none of it', labelJa: '何も引き受けない反対側' },
];

/**
 * The axis is **how much of the blocked lobe's air has gone**.
 *
 * Not time, and not severity of illness. Which bronchus is blocked lives on the
 * model controls, because six arrangements are not six degrees: a blockage does
 * not move from one lobe to the next.
 */
export const STAGES = [
  {
    id: 'aerated',
    name: 'Five lobes, each with its own way in',
    nameJa: '5 つの肺葉と、それぞれの入口',
    at: 0,
    focus: ['rightLung', 'leftLung', 'midline'],
    summary:
      'Every lobe is reached through a bronchus of its own. Block one and only that lobe stops being refilled — which is where everything else here starts.',
    summaryJa:
      'どの肺葉にも、それぞれ自分の気管支から空気が届きます。1 本を塞げばその肺葉だけが満たされなくなり、ここから先のすべてが始まります。',
  },
  {
    id: 'absorbing',
    name: 'The air in it goes, and is not replaced',
    nameJa: '中の空気は去り、補われない',
    at: 0.5,
    focus: ['collapsed', 'blockage'],
    summary:
      'What is already in the lobe is taken up and nothing comes in behind it, so the lobe gets smaller. It does not get denser in place: it shrinks.',
    summaryJa:
      'もともと肺葉にあった空気は取り込まれ、その後に何も入ってこないため、肺葉は小さくなります。その場で濃くなるのではなく、縮みます。',
  },
  {
    id: 'taken-up',
    name: 'The room it left is taken, twice over',
    nameJa: '空いた場所は、2 通りに引き受けられる',
    at: 1,
    focus: ['expanded', 'midline'],
    summary:
      'A chest does not get a hole in it. The rest of that lung expands into the room, and what is left over is taken by the side itself getting smaller.',
    summaryJa:
      '胸の中に空洞はできません。同じ肺の残りの肺葉がその場所へ広がり、残った分はその側自体が小さくなることで引き受けられます。',
  },
];

export const RANGE = { start: 'Full of air', startJa: '空気で満たされている', end: 'Airless', endJa: '空気が失われた' };
export const PROGRESS_LABEL = {
  label: 'How much of that lobe’s air has gone',
  labelJa: 'その肺葉の空気がどれだけ失われたか',
};

export const ANNOTATIONS = [
  { id: 'rightLung', text: 'Right lung — three lobes', sub: '右肺（3 葉）', anchor: 'rightLung', range: [0, 1], compact: false },
  { id: 'leftLung', text: 'Left lung — two lobes', sub: '左肺（2 葉）', anchor: 'leftLung', range: [0, 1], compact: false },
  { id: 'blockage', text: 'The bronchus that is blocked', sub: '塞がれた気管支', anchor: 'blockage', range: [0.05, 1], compact: false },
  { id: 'collapsed', text: 'Smaller, not denser', sub: '濃くなるのではなく小さくなる', anchor: 'collapsed', range: [0.1, 1], compact: false },
  { id: 'expanded', text: 'Where the room went', sub: '空いた場所が向かった先', anchor: 'expanded', range: [0.2, 1], compact: false },
  { id: 'midline', text: 'The middle, drawn across', sub: '引き寄せられた正中', anchor: 'midline', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'lobe', label: 'What is left of that lobe, against its own resting volume', labelJa: 'その肺葉に残る容積（自身の安静時に対する比）', unit: '%', emphasis: true },
  { id: 'where', label: 'Where the room it left went', labelJa: '空いた場所が向かった先', unit: '', emphasis: true },
  { id: 'rest', label: 'The rest of that lung, against its own', labelJa: '同じ肺の残りの肺葉（自身の安静時比）', unit: '×' },
  { id: 'shift', label: 'How far the middle is drawn across, in this drawing’s own units', labelJa: '正中が引き寄せられた距離（この図の単位）', unit: '' },
  { id: 'otherSide', label: 'The other lung', labelJa: '反対側の肺', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'bronchus',
    kind: 'choice',
    label: 'Which bronchus is blocked',
    labelJa: 'どの気管支が塞がれるか',
    options: [
      {
        value: 'none',
        label: 'None',
        labelJa: 'なし',
        effect: 'Every lobe is reached and nothing has moved.',
        effectJa: 'すべての肺葉に空気が届いており、何も動いていません。',
      },
      {
        value: 'right-lower',
        label: 'To the right lower lobe',
        labelJa: '右下葉へ',
        effect: 'The largest lobe of that lung, so the most room is vacated and the most is taken.',
        effectJa: 'その肺で最も大きな肺葉です。空く場所が最も大きく、引き受けられる量も最大になります。',
      },
      {
        value: 'right-middle',
        label: 'To the right middle lobe',
        labelJa: '右中葉へ',
        effect: 'The smallest lobe of the five. The same picture, and much less of it — which is the point of trying it.',
        effectJa: '5 葉のうち最小です。像は同じで、量がはるかに小さくなります。それを確かめるための選択肢です。',
      },
      {
        value: 'right-upper',
        label: 'To the right upper lobe',
        labelJa: '右上葉へ',
        effect: 'Two lobes are left below it to take the room, rather than one above and one below.',
        effectJa: '下方に 2 つの肺葉が残り、それらが場所を引き受けます。',
      },
      {
        value: 'left-upper',
        label: 'To the left upper lobe',
        labelJa: '左上葉へ',
        effect: 'The other side, and only two lobes on it — so the one that is left takes all of the room at once.',
        effectJa: '反対側で、しかも肺葉は 2 つしかありません。残る 1 つが空いた場所をすべて引き受けます。',
      },
      {
        value: 'left-lower',
        label: 'To the left lower lobe',
        labelJa: '左下葉へ',
        effect: 'The same, the other way up. The middle is drawn towards the left instead of the right.',
        effectJa: '同じことが上下逆に起こります。正中は右ではなく左へ引き寄せられます。',
      },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Six arrangements, one of them with nothing blocked',
  labelJa: '6 通りの配置、うち 1 つは閉塞なし',
  hint: 'Six places, not six degrees. Which bronchus decides how much room is vacated and who is left to take it.',
  hintJa: '6 つの場所であって 6 段階ではありません。どの気管支かによって、空く場所の大きさと、それを引き受ける肺葉が決まります。',
};

export const MODEL_SCOPE = {
  question:
    'When a lobe loses its air, where does the room it was occupying go?',
  questionJa:
    '肺葉が空気を失ったとき、それが占めていた場所はどこへ行くのか。',
  answers: [
    {
      text: 'That the lobe gets **smaller** rather than denser in place, because nothing comes in behind the air that is taken up.',
      textJa:
        '肺葉はその場で濃くなるのではなく**小さくなる**こと。取り込まれた空気の後に、何も入ってこないためです。',
    },
    {
      text: 'That the room it vacates is taken twice over: the rest of that lung expands into it, and what is left over is taken by the hemithorax itself getting smaller, which draws the structures at the middle across.',
      textJa:
        '空いた場所は 2 通りに引き受けられること。同じ肺の残りの肺葉がそこへ広がり、残った分はその側の胸郭自体が小さくなることで引き受けられ、正中の構造が引き寄せられます。',
    },
    {
      text: 'That the three amounts add up — what was vacated, what the rest took, and what the side took — which is the only thing this model actually asserts.',
      textJa:
        '「空いた量」「残りの肺葉が引き受けた量」「その側が引き受けた量」が加算的に一致すること。本モデルが実際に主張しているのはこれだけです。',
    },
    {
      text: '**That this is the opposite of consolidation, not a worse version of it.** A consolidated lobe is full of something other than air and keeps its volume, so nothing moves towards it. Two lobes that look equally wrong on a picture of density are opposite on a picture of volume.',
      textJa:
        '**これは consolidation の重症型ではなく、逆の像であること。** 硬化した肺葉は空気以外のもので満たされていて容積を保つため、そこへ何も引き寄せられません。濃度の像では同じように見える 2 つの肺葉が、容積の像では正反対になります。',
    },
    {
      text: 'That the other lung takes none of it, because the two sides are two hemithoraces. **Not a claim that it is unaffected in a person** — a volume lost on one side is simply not offered to the other.',
      textJa:
        '反対側の肺は何も引き受けないこと。左右は 2 つの胸腔だからです。**実際の患者で反対側が影響を受けないという主張ではなく**、一方の側で失われた容積が他方へ回ることはない、というだけです。',
    },
  ],
  excludes: [
    {
      text: '**All gas exchange.** No oxygen, no shunt, no saturation, no blood flow and no hypoxic vasoconstriction. A collapsed lobe here is a volume, and **nothing in this model says what anybody’s blood is doing**.',
      textJa:
        '**ガス交換のすべて。** 酸素も、シャントも、飽和度も、血流も、低酸素性肺血管収縮もありません。ここでの虚脱した肺葉は容積であり、**血液に何が起きているかについては何も述べていません。**',
    },
    {
      text: 'The cause: no tumour, no mucus plug, no foreign body, no aspiration and nothing post-operative. The scene says which bronchus, and nothing about what is in it.',
      textJa:
        '原因（腫瘍・粘液栓・異物・誤嚥・術後のいずれもありません）。このシーンが述べるのは「どの気管支か」だけで、「そこに何があるか」は述べません。',
    },
    {
      text: 'Time and breathing. The axis is how much of the air has gone, not how long it has been going, and nothing here inflates or deflates with a cycle. There is no recovery and no re-expansion.',
      textJa:
        '時間と呼吸。軸は「空気がどれだけ失われたか」であって経過時間ではなく、ここでは何も呼吸周期に合わせて動きません。回復も再膨張もありません。',
    },
    {
      text: '**Every sign, grade and image.** This model does not grade collapse and does not read a chest radiograph. No output here is a sign, a degree or a threshold, and there are no symptoms, no auscultation and no treatment.',
      textJa:
        '**あらゆる所見・grade・画像。** 本モデルは虚脱の grading を行わず、胸部 X 線を読みません。ここの出力はどれも所見でも程度でも閾値でもなく、症状・聴診・治療も含みません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The lobe shares are this repository’s lung atlas’s own. What the read-out gives is each lobe against **its own resting volume**, and the shift is a distance in this drawing arrived at by spreading a volume over a chosen face — **it is not a tracheal deviation and not millimetres of anything.**',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 肺葉の容積比はこのリポジトリの肺アトラス自身のものです。読み出しが示すのは各肺葉の**自身の安静時に対する比**であり、偏位量は「容積を任意に選んだ面で割って距離にした」この図の中の値です。**気管偏位でもなければ、何かの mm でもありません。**',
    },
    {
      text: 'How the vacated room divides between the rest of the lung and the side itself is a calibration this repository chose, so that both halves of the answer are legible at once. **The split is not a measured proportion**, and a real chest divides it differently from case to case.',
      textJa:
        '空いた場所が「残りの肺葉」と「その側自体」にどう分かれるかは、両方が同時に読み取れるようにこのリポジトリが選んだ較正値です。**測定された比率ではなく**、実際の胸腔では症例ごとに異なります。',
    },
    {
      text: 'The lobes expand in proportion to what each already had, which is the only division this model has any basis for. A real lung does not expand evenly, and neither the shape nor the direction of compensatory expansion is claimed here.',
      textJa:
        '残る肺葉は、もともと持っていた容積に比例して広がります。本モデルが根拠を持てる分け方はこれだけです。実際の肺は一様に広がるわけではなく、代償性拡張の形や方向についてここでは何も主張していません。',
    },
    {
      text: 'A lobe that has lost all the air this model lets it lose still has an eighth of its volume drawn, because a lobe collapsed to nothing would be a lobe the scene had deleted and there would be nothing left to point at. **That eighth is not a residual volume anybody measured.**',
      textJa:
        '本モデルで失いうる空気をすべて失った肺葉にも、容積の 1/8 を描いています。完全に消した肺葉は「シーンが削除した肺葉」であって、指し示すものが残らないためです。**この 1/8 は誰かが測定した残気量ではありません。**',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of lobar collapse: absorption of the gas distal to an obstructed bronchus, loss of volume in the affected lobe, compensatory expansion of the remaining lobes of the same lung, and displacement of structures towards the affected side.',
      textJa:
        '肺葉性無気肺についての標準的記載から、閉塞した気管支より末梢のガス吸収、その肺葉の容積減少、同側の残存肺葉の代償性拡張、および患側への構造の偏位。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of consolidation as a process that fills the airspaces while the lobe keeps its volume — the contrast this scene is built around.',
      textJa:
        'consolidation が、肺葉の容積を保ったまま含気腔を満たす過程であるという標準的記載。このシーンはこの対比を軸に構成されています。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/lobar-collapse.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'pneumonia-consolidation',
      label: 'The lobe that keeps its volume',
      labelJa: '容積を保つほうの肺葉',
      why: 'Consolidation fills the airspaces and leaves the volume alone, so nothing moves towards it. Seeing both is what makes either of them a volume rather than a shadow.',
      whyJa: 'consolidation は含気腔を満たしますが容積は変えないため、そこへ何も引き寄せられません。両方を見ることが、どちらをも「影」ではなく「容積」にします。',
    },
    {
      slug: 'lung-anatomy',
      label: 'The same five lobes, named',
      labelJa: '同じ 5 つの肺葉を、名前で',
      why: 'The lobes, the fissures between them and the bronchi that reach them, as structures you can point at, with every lobe full of air.',
      whyJa: '肺葉、その間の葉間裂、そしてそこへ達する気管支を、名前で指せる構造として示します。すべての肺葉に空気が入った状態です。',
    },
    {
      slug: 'copd-hyperinflation',
      label: 'A lung that cannot get air out',
      labelJa: '空気を出せないほうの肺',
      why: 'The opposite failure at the same scale: air that stays rather than air that goes, and a chest that gets larger rather than smaller.',
      whyJa: '同じ尺度における逆の破綻です。空気が去るのではなく留まり、胸郭は小さくなるのではなく大きくなります。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-lobe-shrinks',
    target: 'the lobe whose bronchus is blocked',
    channel: 'scale',
    from: 'lobes[].volumeRatio',
    reading: 'proportional',
    claim:
      'The lobe is drawn at the volume the model gives it, shrinking towards its own hilum — so what changes on screen is its size and not its shade.',
    claimJa:
      '肺葉はモデルが与えた容積で、自身の肺門へ向かって縮むように描かれます。画面上で変わるのは色の濃さではなく大きさです。',
  },
  {
    id: 'the-rest-expands',
    target: 'the other lobes of the same lung',
    channel: 'scale',
    from: 'lobes[].volumeRatio',
    reading: 'proportional',
    claim:
      'They are drawn larger by exactly what the model says they took, so the room is seen arriving somewhere rather than simply leaving.',
    claimJa:
      '残りの肺葉は、モデルが「引き受けた」とする分だけ大きく描かれます。場所が失われるだけでなく、どこかへ到着するのが見えるようにするためです。',
  },
  {
    id: 'the-middle-and-where-it-was',
    target: 'the midline',
    channel: 'position',
    from: 'shift',
    reading: 'illustrative',
    claim:
      'The midline moves towards the collapsed side by the model’s distance, and **a second marker stays where it began** — so what a reader sees is a gap between two lines rather than a memory of where one of them used to be.',
    claimJa:
      '正中はモデルの示す距離だけ虚脱側へ移動し、**もう 1 本の印はもとの位置に留まります。** 読み手が見るのは、片方が以前どこにあったかの記憶ではなく、2 本の線のあいだの隙間です。',
    notClaim:
      '**The distance is a volume spread over a face this repository chose**, and the face was chosen so the gap is legible. It is not a tracheal deviation, not a mediastinal shift anybody measured, and not millimetres.',
    notClaimJa:
      '**この距離は、このリポジトリが選んだ面で容積を割って得た値**であり、その面は隙間が読み取れるように選ばれています。気管偏位でも、誰かが測定した縦隔偏位でもなく、mm でもありません。',
  },
  {
    id: 'solid-is-the-subject',
    target: 'how solid each lobe is drawn',
    channel: 'opacity',
    from: 'lobes[].collapsed',
    reading: 'illustrative',
    claim:
      'Once something has collapsed, the lobes that are not the subject are drawn translucent and **the collapsed one is the solid one** — so it can be seen behind the lobes that expanded over it.',
    claimJa:
      '何かが虚脱した後は、主題でない肺葉が半透明に描かれ、**虚脱した肺葉のほうが不透明**になります。その上に広がった肺葉の向こうにあっても見えるようにするためです。',
    notClaim:
      '**Opacity here is visibility and never airlessness.** It is the inverse of the convention a reader arrives with, deliberately: a lobe faded to show it had lost its air would be this scene drawing density, which is the one thing it exists not to do. Nothing about how solid a lobe is drawn is a model output.',
    notClaimJa:
      '**ここでの不透明度は「見えやすさ」であって「空気の少なさ」ではありません。** 読み手が持ち込む慣習とは意図的に逆にしてあります。空気を失ったことを示すために薄く描けば、それはこのシーンが描くまいとしている「濃度」を描くことになるためです。描画の不透明度はモデルの出力ではありません。',
  },
  {
    id: 'the-other-side-holds-still',
    target: 'the lung that is not on the blocked side',
    channel: 'colour',
    from: 'sparedSide',
    reading: 'thresholded',
    claim:
      'The other lung is drawn in a colour of its own and does not change size, because "the other side takes none of it" is part of the answer and a reader will otherwise assume both sides compensate.',
    claimJa:
      '反対側の肺は独自の色で描かれ、大きさを変えません。「反対側は何も引き受けない」ことが答えの一部であり、そう示さなければ読み手は左右が代償し合うと考えるためです。',
    notClaim:
      'Unchanged here means **this model changes nothing about it**, and nothing in the model is doing anything on that side at all.',
    notClaimJa:
      'ここでの「変化しない」は、**本モデルがその側に何もしない**という意味であり、そちら側について何も計算していません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of lobar collapse. It computes what is left of one lobe’s volume when its bronchus is blocked, how much of the room it vacated the rest of that lung takes, and how far the middle is drawn across by the remainder. It contains no gas exchange, no cause, no time and no treatment, it does not grade collapse, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '肺葉性無気肺についての教育用の幾何モデルです。気管支が塞がれたとき 1 つの肺葉にどれだけ容積が残るか、空いた場所を同じ肺の残りがどれだけ引き受けるか、残りの分だけ正中がどれだけ引き寄せられるかを計算します。ガス交換・原因・時間・治療のいずれも含まず、虚脱の grading も行わず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Volume, not density — a drawn distance, not a mediastinal shift.';
export const DISCLAIMER_SHORT_JA = '濃度ではなく容積｜描かれた距離であって縦隔偏位ではありません。';
