/**
 * Copy and configuration for the canal particle scene.
 *
 * Two things have to stay apart here. What the model solves is a particle in a
 * loop and the part of gravity that can move it; what a reader arrives wanting
 * is an eye movement and a diagnosis. The read-out prints the first and says in
 * as many words that the second is not here.
 */

export const PALETTE = {
  bone: '#e8dcc8',
  canal: '#b07ec4',
  active: '#63d6ff',
  particle: '#fff0b0',
  ampulla: '#ff9a4d',
  gravity: '#8ad6a0',
  idle: '#6b5a78',
};

export const LEGEND = [
  { key: 'canal', label: 'The three loops, each in its own plane', labelJa: '3 つのループ（それぞれ別の平面）' },
  { key: 'active', label: 'The loop this is about', labelJa: 'いま扱っているループ' },
  { key: 'particle', label: 'The loose particles', labelJa: '遊離した耳石' },
  { key: 'gravity', label: 'Which way is down, for the head as held', labelJa: 'その頭位での「下」の向き' },
];

/**
 * The axis is **how far back the head has gone**.
 *
 * Not time and not severity. Which loop, and which way the head is turned, live
 * on the model controls: they are arrangements, and nothing here says one
 * becomes another.
 */
export const STAGES = [
  {
    id: 'upright',
    name: 'Three loops, three planes',
    nameJa: '3 つのループ、3 つの平面',
    at: 0,
    focus: ['canal', 'particle'],
    summary:
      'Each loop lies in a plane of its own. Only the part of gravity lying in a loop’s plane can move anything along it — the rest presses against the wall.',
    summaryJa:
      '各ループはそれぞれ独自の平面上にあります。ループに沿って何かを動かせるのは、その平面内にある重力の成分だけで、残りは壁に押しつけるだけです。',
  },
  {
    id: 'tipping',
    name: 'The head goes back, and the planes turn with it',
    nameJa: '頭が後ろへ倒れ、平面もともに向きを変える',
    at: 0.5,
    focus: ['gravity', 'active'],
    summary:
      'Gravity does not move; the head does. So how much of it lies in each loop’s plane changes, and a loop that could drive nothing can start to.',
    summaryJa:
      '動くのは重力ではなく頭です。そのため各ループの平面に含まれる重力の量が変わり、何も動かせなかったループが動かし始めることがあります。',
  },
  {
    id: 'settled',
    name: 'Where the particles end up',
    nameJa: '耳石が落ち着く場所',
    at: 1,
    focus: ['particle', 'active'],
    summary:
      'They travel round to the lowest point of the loop. How far that is, and whether it runs towards the ampulla, is a fact about the arc.',
    summaryJa:
      '耳石はループの最も低い位置まで移動します。それがどれだけの距離か、膨大部へ向かうのかどうかは、弧についての事実です。',
  },
];

export const RANGE = { start: 'Upright', startJa: '坐位', end: 'Head well back', endJa: '頭部を大きく後屈' };
export const PROGRESS_LABEL = { label: 'How far back the head has gone', labelJa: '頭部をどれだけ後ろへ倒したか' };

export const ANNOTATIONS = [
  { id: 'canal', text: 'The three loops', sub: '3 つの半規管', anchor: 'canal', range: [0, 1], compact: false },
  { id: 'active', text: 'The loop this is about', sub: '対象のループ', anchor: 'active', range: [0, 1], compact: false },
  { id: 'particle', text: 'The loose particles', sub: '遊離した耳石', anchor: 'particle', range: [0, 1], compact: false },
  { id: 'gravity', text: 'Which way is down', sub: '「下」の向き', anchor: 'gravity', range: [0, 1], compact: false },
  { id: 'ampulla', text: 'The ampulla', sub: '膨大部', anchor: 'ampulla', range: [0, 1], compact: false },
];

export const METRICS = [
  { id: 'inPlane', label: 'How much of gravity lies in this loop’s plane', labelJa: 'このループの平面に含まれる重力の割合', unit: '%', emphasis: true },
  { id: 'drives', label: 'Can this loop move anything at all', labelJa: 'このループは何かを動かせるか', unit: '', emphasis: true },
  { id: 'travel', label: 'How far round the loop the particles have gone', labelJa: '耳石がループに沿って移動した距離', unit: '%' },
  { id: 'towards', label: 'Whether that runs towards the ampulla', labelJa: 'その移動が膨大部へ向かうか', unit: '' },
  { id: 'nystagmus', label: 'Which way the eyes would move', labelJa: '眼がどちらへ動くか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'canal',
    kind: 'choice',
    label: 'Which loop the particles are in',
    labelJa: '耳石が入っているループ',
    options: [
      { value: 'none', label: 'None of them', labelJa: 'なし', effect: 'Nothing loose is anywhere, and nothing moves.', effectJa: '遊離したものはどこにもなく、何も動きません。' },
      { value: 'posterior', label: 'The posterior loop', labelJa: '後半規管', effect: 'Its plane already holds gravity with the head upright, so the particles are already at its lowest point.', effectJa: 'この平面は坐位でもすでに重力を含むため、耳石はすでに最下点にあります。' },
      { value: 'lateral', label: 'The lateral loop', labelJa: '外側半規管', effect: 'Its plane is level with the head upright, so upright gravity runs along its normal and can drive nothing at all.', effectJa: 'この平面は坐位では水平で、重力はその法線方向に沿うため、何も動かすことができません。' },
    ],
  },
  {
    id: 'side',
    kind: 'choice',
    label: 'Which way the head is turned',
    labelJa: '頭をどちらへ向けるか',
    options: [
      { value: 'left', label: 'Turned one way', labelJa: '一方へ', effect: 'The turn is what makes the two sides different pictures — for the lateral loop.', effectJa: '左右で像が変わるのは、この回旋によります（外側半規管の場合）。' },
      { value: 'right', label: 'Turned the other', labelJa: 'もう一方へ', effect: 'The same loop, the other way. In this drawing the posterior loop answers the same either way.', effectJa: '同じループを逆向きに。この図では、後半規管はどちらでも同じ答えになります。' },
    ],
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'A loop, and a way to turn',
  labelJa: 'ループと、回旋の向き',
  hint: 'Neither is a degree. The loop decides which plane is in question; the turn decides how gravity meets it.',
  hintJa: 'どちらも段階ではありません。ループが「どの平面の話か」を、回旋が「重力がそれとどう交わるか」を決めます。',
};

export const MODEL_SCOPE = {
  question:
    'When loose particles are in a canal, what decides whether they move?',
  questionJa:
    '半規管の中に遊離した耳石があるとき、それが動くかどうかを決めるのは何か。',
  answers: [
    {
      text: '**The angle between gravity and that canal’s plane.** A loop can only be driven along by the part of gravity lying in its plane; the part along its normal presses the particle against the wall and moves it nowhere.',
      textJa:
        '**重力とその半規管の平面との角度。** ループに沿って動かせるのは平面内の重力成分だけで、法線方向の成分は耳石を壁に押しつけるだけで、どこへも動かしません。',
    },
    {
      text: 'That the head’s position is therefore the whole of it — and that **two loops in the same ear, with the head in the same place, are in completely different states**. The lateral loop is level when the head is upright, so upright gravity can drive nothing in it at all; the posterior loop’s plane already holds gravity.',
      textJa:
        'したがって頭位がすべてを決めること。そして**同じ耳の 2 つのループが、同じ頭位でまったく異なる状態にある**こと。外側半規管は坐位で水平なので、坐位の重力では何も動かせません。後半規管の平面は坐位でもすでに重力を含みます。',
    },
    {
      text: 'How far round the loop the particles travel to reach its lowest point, and whether that path runs **towards the ampulla or away from it** — which is a fact about the arc and where the ampulla sits on it.',
      textJa:
        '耳石がループの最下点まで進む距離と、その経路が**膨大部へ向かうのか、そこから離れるのか**。これは弧の形と、その上で膨大部がどこにあるかについての事実です。',
    },
  ],
  excludes: [
    {
      text: '**Every eye movement.** The direction of any nystagmus is **not derived here**: nothing in this model is an eye, a muscle or a direction of gaze. A canal’s plane is related to the plane of the response it drives, and this model does not make that step.',
      textJa:
        '**あらゆる眼球運動。** 眼振の方向は**ここでは導出していません。** このモデルに眼も筋も注視方向もありません。半規管の平面と、それが駆動する応答の平面には関係がありますが、本モデルはその段階に進みません。',
    },
    {
      text: '**Every symptom and every manoeuvre.** No vertigo, no nausea, no latency, no duration, no fatigue, and no effect of any repositioning procedure.',
      textJa:
        '**あらゆる症状と手技。** めまいも吐き気も潜時も持続時間も疲労現象もなく、いかなる整復手技の効果もありません。',
    },
    {
      text: 'All the physics beyond gravity and a plane: no inertia, no fluid, no drag, no cupula and no time. The particle is taken to be **already at the lowest point** for whatever position the head is in.',
      textJa:
        '重力と平面以外の物理のすべて。慣性・流体・抵抗・クプラ・時間のいずれもありません。耳石は、その頭位における**最下点にすでにある**ものとして扱われます。',
    },
    {
      text: 'Cause, recurrence and which ear is affected in anybody. The two loops and the two turns are four arrangements, not a diagnosis.',
      textJa:
        '原因・再発、そして実際にどちらの耳が罹患しているか。2 つのループと 2 つの回旋は 4 通りの配置であって、診断ではありません。',
    },
  ],
  cautions: [
    {
      text: '**Nothing here is a measurement.** The canals’ planes and the loop’s radius are this repository’s own ear atlas’s, and the share of gravity is a share of a unit vector in a drawing.',
      textJa:
        '**ここにあるものはすべて実測値ではありません。** 半規管の平面とループの半径はこのリポジトリ自身の耳のアトラスのものであり、重力の割合は図の中の単位ベクトルに対する割合です。',
    },
    {
      text: '**The head’s path is one chosen rotation, and its extent is a calibration** — it is not the angle of any named manoeuvre, and no position on the axis corresponds to a step of one.',
      textJa:
        '**頭の動きは 1 つの選ばれた回転であり、その大きさは較正値です。** これは特定の手技の角度ではなく、軸上のどの位置も手技のどの段階にも対応しません。',
    },
    {
      text: '**In this drawing the posterior loop answers a turn either way identically**, because the atlas draws one ear and the turn is symmetric about that loop’s plane. The two sides are genuinely different pictures for the lateral loop only. That is a property of this drawing, not a claim about ears.',
      textJa:
        '**この図では、後半規管は回旋の向きによらず同じ答えになります。** アトラスが片耳のみを描いており、回旋がそのループの平面に対して対称であるためです。左右で像が実際に変わるのは外側半規管だけです。これはこの図の性質であって、耳についての主張ではありません。',
    },
    {
      text: 'The particle is drawn as a single body. Real otoconia are many, and nothing here says how many there are or whether they move together.',
      textJa:
        '耳石は 1 つの塊として描いています。実際の耳石は多数であり、その個数やまとまって動くかどうかについて、ここでは何も述べていません。',
    },
  ],
  sources: [
    {
      text: 'Standard descriptions of the semicircular canals as three loops in three planes, and of the lateral canal lying approximately level with the head upright.',
      textJa:
        '半規管が 3 つの平面にある 3 つのループであること、および坐位で外側半規管がほぼ水平であることについての標準的記載。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of benign paroxysmal positional vertigo as loose particles within a canal moving under gravity when the head changes position, taken here **only** as far as the geometry.',
      textJa:
        '良性発作性頭位めまい症が、頭位変換により半規管内の遊離耳石が重力で移動する病態であることについての標準的記載。ここでは**幾何学の範囲まで**のみ用いています。',
      kind: 'textbook',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'repository',
    },
  ],
  evidence: 'docs/model-evidence/bppv.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'ear-anatomy',
      label: 'The same ear, named',
      labelJa: '同じ耳を、名前で',
      why: 'The canals, the vestibule and the cochlea as structures you can point at, with nothing loose in any of them.',
      whyJa: '半規管・前庭・蝸牛を、名前で指せる構造として示します。遊離したものはどこにもありません。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

export const VISUAL_MAPPING = [
  {
    id: 'the-particle-sits-where-the-model-puts-it',
    target: 'the loose particles',
    channel: 'position',
    from: 'restsAt',
    reading: 'proportional',
    claim:
      'The particle is drawn at the angle on the loop the model solved, so where it is on screen is the model’s answer and the distance it has moved is the number in the read-out.',
    claimJa:
      '耳石は、モデルが解いたループ上の角度に描かれます。画面上の位置はモデルの答えそのものであり、移動距離は読み出しの数値です。',
    notClaim:
      '**Quasi-static.** It is drawn where it would end up, not where it is on the way — there is no inertia, no fluid and no time in this model.',
    notClaimJa:
      '**準静的な扱いです。** 途中の位置ではなく、最終的に落ち着く位置に描かれます。本モデルに慣性・流体・時間はありません。',
  },
  {
    id: 'down-is-drawn',
    target: 'which way is down',
    channel: 'geometry',
    from: 'gravity',
    reading: 'illustrative',
    claim:
      'An arrow in the head’s own frame shows which way gravity points for the position the head is in, because the scene’s whole claim is about an angle between that direction and a plane, and an angle needs both of its arms drawn.',
    claimJa:
      '頭の座標系における重力の向きを矢印で示します。このシーンの主張はその向きと平面との角度についてのものであり、角度を示すには両辺を描く必要があるためです。',
    notClaim:
      'The head does not move on screen; gravity does. That is the same relation drawn the other way round, and it is chosen so the canals stay in one place to be compared.',
    notClaimJa:
      '画面上で動くのは頭ではなく重力です。同じ関係を逆向きに描いたもので、半規管の位置を固定して比較できるようにするための選択です。',
  },
  {
    id: 'the-loop-in-question-is-lit',
    target: 'the three loops',
    channel: 'colour',
    from: 'canal',
    reading: 'thresholded',
    claim:
      'The loop the particles are in is drawn in a colour of its own and the other two are dimmed, because the claim is about one plane among three and a reader must be able to see which.',
    claimJa:
      '耳石が入っているループは独自の色で描かれ、他の 2 つは暗く落とされます。主張は 3 つのうち 1 つの平面についてのものであり、どれかが見て分かる必要があるためです。',
    notClaim:
      'Lit means *this is the one in question*. It does not mean the loop is active, damaged, stimulated or firing.',
    notClaimJa:
      '明るいことは「いま扱っている対象である」という意味です。そのループが働いている・傷んでいる・刺激されている・発火している、という意味ではありません。',
  },
  {
    id: 'nothing-stands-for-an-eye',
    target: 'the whole picture',
    channel: 'colour',
    from: 'nystagmus',
    reading: 'illustrative',
    claim:
      'Nothing anywhere in this scene moves, turns or changes colour to stand for an eye movement, because the model does not derive one.',
    claimJa:
      'このシーンには、眼球運動を表すために動く・回る・色が変わる要素は一切ありません。モデルがそれを導出していないためです。',
    notClaim:
      'The read-out prints "not derived here" where a nystagmus would go, rather than leaving the row out — an absent row reads as an oversight, and this absence is the claim.',
    notClaimJa:
      '眼振が入る位置には、行を省くのではなく「ここでは導出していません」と表示します。欄が無いことは見落としに読めますが、この不在自体が主張だからです。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of loose particles in a semicircular canal. It computes how much of gravity lies in a chosen canal’s plane for a given head position, where in the loop a particle would settle, and whether that path runs towards the ampulla. It derives no eye movement, contains no symptom, no manoeuvre, no fluid and no time, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '半規管内の遊離耳石についての教育用の幾何モデルです。ある頭位で、選ばれた半規管の平面に重力がどれだけ含まれるか、耳石がループのどこに落ち着くか、その経路が膨大部へ向かうかを計算します。眼球運動は導出せず、症状・手技・流体・時間のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'An angle between gravity and a plane — never an eye movement.';
export const DISCLAIMER_SHORT_JA = '重力と平面のなす角であって、眼球運動ではありません。';
