/**
 * Everything the bowel obstruction scene says, in both languages.
 *
 * No geometry lives here and no number is asserted here: every figure a reader
 * sees comes from [`src/models/bowelObstruction.js`](../models/bowelObstruction.js)
 * at the moment they see it.
 */

export const PALETTE = {
  smallBowel: '#d99a7c',
  colon: '#c58a72',
  duodenum: '#d99a7c',
  distended: '#e0a45f',
  empty: '#7f6e72',
  transition: '#ff4d6d',
  tension: '#ffd166',
};

export const LEGEND = [
  { key: 'distended', label: 'Distended — above the blockage', labelJa: '拡張（閉塞より上流）', activeFrom: 0.12 },
  { key: 'empty', label: 'Empty — below it', labelJa: '虚脱（閉塞より下流）', activeFrom: 0.12 },
  { key: 'transition', label: 'Where the picture changes', labelJa: '移行部', activeFrom: 0.12 },
  { key: 'tension', label: 'The wall carrying the most', labelJa: '壁の負担が最も大きい部分', activeFrom: 0.35 },
];

/**
 * The axis is **how completely the path is blocked**, and nothing else.
 *
 * Where the blockage is sits on the model controls, because the four sites are
 * four alternatives. Putting them on an axis would say one becomes the next,
 * and a small-bowel obstruction does not become a sigmoid one.
 */
export const STAGES = [
  {
    id: 'patent',
    name: 'A path from end to end',
    nameJa: '端から端まで通っている',
    at: 0,
    focus: ['smallBowel', 'colon'],
    summary:
      'The gut is one path in series. What is delivered into it at the top leaves at the bottom, and every stretch of it is at its resting calibre.',
    summaryJa:
      '腸は直列の 1 本の通り道です。上から入ったものは下から出ていき、どの区間も安静時の太さのままです。',
  },
  {
    id: 'partial',
    name: 'Part of it still gets past',
    nameJa: '一部はまだ通過する',
    at: 0.5,
    focus: ['transition'],
    summary:
      'Something still crosses the blockage, so less collects above it. The two sides of the transition are already different, and the picture below it is not yet empty.',
    summaryJa:
      '閉塞部をまだ通過するものがあるため、上流に溜まる量は少なくなります。移行部の両側はすでに違って見えますが、下流はまだ空ではありません。',
  },
  {
    id: 'complete',
    name: 'Nothing crosses it',
    nameJa: '何も通過しない',
    at: 1,
    focus: ['transition', 'tension'],
    summary:
      'Everything above the blockage keeps receiving and cannot pass anything on; everything below it receives nothing. The transition is where the picture changes.',
    summaryJa:
      '閉塞より上流は受け取り続けるのに送り出せず、下流には何も届きません。移行部とは、画面の見え方が切り替わる場所です。',
  },
];

export const RANGE = { start: 'Patent', startJa: '開通', end: 'Complete', endJa: '完全閉塞' };
export const PROGRESS_LABEL = {
  label: 'How completely the path is blocked',
  labelJa: '通り道がどれだけ塞がっているか',
};

export const ANNOTATIONS = [
  { id: 'smallBowel', text: 'Small bowel', sub: '小腸', anchor: 'smallBowel', range: [0, 1], compact: false },
  { id: 'colon', text: 'Colon', sub: '結腸', anchor: 'colon', range: [0, 1], compact: false },
  { id: 'caecum', text: 'Caecum — the widest part', sub: '盲腸（最も太い）', anchor: 'caecum', range: [0, 1], compact: false },
  { id: 'valve', text: 'Ileocaecal valve', sub: '回盲弁', anchor: 'valve', range: [0, 1], compact: false },
  { id: 'transition', text: 'Where the picture changes', sub: '移行部', anchor: 'transition', range: [0.08, 1], compact: false },
  { id: 'tension', text: 'The wall carrying the most', sub: '壁の負担が最大の部分', anchor: 'tension', range: [0.3, 1], compact: false },
];

export const METRICS = [
  { id: 'distended', label: 'Length of the drawn gut that is distended', labelJa: '拡張している区間（描かれた腸に対して）', unit: '%', emphasis: true },
  { id: 'empty', label: 'Length below the blockage, receiving nothing', labelJa: '閉塞より下流で何も届かない区間', unit: '%', emphasis: true },
  { id: 'widening', label: 'Calibre of the distended bowel, against its own resting one', labelJa: '拡張部の太さ（その区間の安静時比）', unit: '×' },
  { id: 'tensionSpread', label: 'Wall tension of the worst-off distended part, against the least (same picture)', labelJa: '拡張部のうち壁の負担が最大／最小の比（同じ画面内）', unit: '×' },
  { id: 'worst', label: 'Where the wall carries the most', labelJa: '壁の負担が最も大きい部分', unit: '' },
  { id: 'loop', label: 'Shut in at both ends', labelJa: '両端が閉じているか', unit: '' },
];

export const MODEL_CONTROLS = [
  {
    id: 'site',
    kind: 'choice',
    label: 'Where the blockage is',
    labelJa: '閉塞の部位',
    options: [
      {
        value: 'none',
        label: 'Nothing blocked',
        labelJa: '閉塞なし',
        effect: 'The path runs from end to end and every stretch is at its resting calibre.',
        effectJa: '通り道は端から端まで通っており、どの区間も安静時の太さです。',
      },
      {
        value: 'proximal-small-bowel',
        label: 'High in the small bowel',
        labelJa: '小腸の上部',
        effect: 'A short length above it takes everything that arrives, so it distends the furthest. Most of the gut below is empty.',
        effectJa: '上流の短い区間がすべてを受け止めるため、最も大きく拡張します。その下のほとんどの腸は空になります。',
      },
      {
        value: 'distal-small-bowel',
        label: 'Low in the small bowel',
        labelJa: '小腸の下部',
        effect: 'Much more bowel is above it, so the same amount spread over more length distends each part less.',
        effectJa: '上流の腸がずっと長いため、同じ量がより長い区間に分かれ、1 区間あたりの拡張は小さくなります。',
      },
      {
        value: 'proximal-colon',
        label: 'In the proximal colon',
        labelJa: '近位結腸',
        effect: 'With the valve holding, only the stretch between it and the blockage can take anything — the shortest length of all.',
        effectJa: '回盲弁が保たれていれば、受け止められるのは弁と閉塞部のあいだだけで、これが最も短い区間です。',
      },
      {
        value: 'distal-colon',
        label: 'In the distal colon',
        labelJa: '遠位結腸',
        effect: 'The whole colon is above it, and this model’s gut ends at the sigmoid, so nothing is drawn below. The caecum — the widest part — is in the distended length.',
        effectJa: '結腸全体が上流になります。このモデルの腸は S 状結腸で終わるため、下流には何も描かれません。最も太い盲腸が拡張する区間に含まれます。',
      },
    ],
  },
  {
    id: 'valveCompetence',
    label: 'How well the ileocaecal valve holds',
    labelJa: '回盲弁がどれだけ保たれているか',
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => (v > 0.5 ? 'holds' : 'gives way'),
  },
];

export const MODEL_CONTROLS_COPY = {
  label: 'Where it is, and what is above it',
  labelJa: '閉塞の場所と、その上にある腸',
  hint: 'Four places, not four degrees. The valve changes how much gut is behind a colonic blockage.',
  hintJa: '4 つの「場所」であって 4 段階ではありません。弁は、結腸閉塞の上流にどれだけの腸があるかを変えます。',
};

export const MODEL_SCOPE = {
  question:
    'When the bowel is blocked, what does where it is blocked change — and where does the wall end up carrying the most?',
  questionJa:
    '腸が閉塞したとき、その場所の違いは何を変えるのか。そして壁の負担が最も大きくなるのはどこか。',
  answers: [
    {
      text: 'That the gut is one path in series, so a blockage divides it: everything above keeps receiving and cannot pass anything on, everything below receives nothing.',
      textJa:
        '腸は直列の 1 本の通り道であり、閉塞はそれを 2 つに分けること。上流は受け取り続けて送り出せず、下流には何も届きません。',
    },
    {
      text: 'That the site decides how much bowel is above it, and therefore how far each part of it distends — the same amount over a shorter length goes further.',
      textJa:
        '部位によって上流の腸の長さが決まり、それが 1 区間あたりの拡張の大きさを決めること。同じ量でも短い区間ならより大きく広がります。',
    },
    {
      text: 'That an ileocaecal valve which holds shuts a colonic blockage in at both ends, so the colon alone has to take it.',
      textJa:
        '回盲弁が保たれていると、結腸の閉塞は両端が閉じた状態になり、結腸だけがそれを受け止めること。',
    },
    {
      text: 'That wall tension follows the calibre as well as the distension, so the widest part of the *distended* bowel carries more of it than the blockage does — and which part that is depends on the site and on the valve, not on a rule. **In this model’s colonic scenarios, where a competent valve shuts the loop at its upper end, that comes out at the caecum; in a small bowel obstruction the caecum is below the blockage and not distended at all, and the distended bowel is one calibre throughout, so no segment stands out.**',
      textJa:
        '壁の負担は拡張だけでなく太さにも従うため、**拡張している**区間のうち最も太い部分が閉塞部より大きな負担を負うこと。どこがそれに当たるかは、閉塞部位と回盲弁の状態によって決まり、一般則ではありません。**回盲弁が保たれて上端が閉じる本モデルの結腸閉塞シナリオでは盲腸側が最大になりますが、小腸閉塞では盲腸は閉塞より下流で拡張せず、拡張部は全長が同じ太さのため、突出する区間はありません。**',
    },
  ],
  excludes: [
    {
      text: 'Time and rate of every kind. Nothing here is hours, and the axis is how completely the path is blocked, not how long it has been.',
      textJa:
        'あらゆる時間と速度。ここに「時間」はなく、軸は「どれだけ塞がっているか」であって経過時間ではありません。',
    },
    {
      text: 'Pain, vomiting, abdominal distension as a sign, bowel sounds and tenderness. None of them is in the model.',
      textJa:
        '腹痛・嘔吐・所見としての腹部膨満・腸雑音・圧痛。いずれもモデルには含まれません。',
    },
    {
      text: 'Ischaemia, strangulation, perforation, and any risk of any of them. There is no blood supply and no wall in this model that can fail.',
      textJa:
        '虚血・絞扼・穿孔と、それらの危険度。血流はなく、破綻しうる壁もモデルには存在しません。',
    },
    {
      text: 'Every cause — adhesion, hernia, volvulus, tumour, impaction — and every treatment. The blockage here is a place, not a thing.',
      textJa:
        'あらゆる原因（癒着・ヘルニア・軸捻転・腫瘍・糞詰まり）と、あらゆる治療。ここでの閉塞は「場所」であって「もの」ではありません。',
    },
    {
      text: 'Fluid shift, electrolytes, absorption and bacterial overgrowth. Nothing crosses the wall in this model.',
      textJa:
        '体液移動・電解質・吸収・細菌増殖。このモデルでは壁を越えて移動するものはありません。',
    },
  ],
  cautions: [
    {
      text: '**The lengths and calibres are the atlas’s drawn proportions, not anatomical ones.** In a person the small bowel is several times the length of the colon and much narrower than these make it. What is claimed is the *ordering* — that the caecum is the widest part of the large bowel — not the ratios.',
      textJa:
        '**長さも太さも、アトラスの描画上の比率であって解剖学的な比ではありません。** 実際の小腸は結腸の数倍の長さで、ここで描かれているよりずっと細いものです。主張しているのは「盲腸が大腸で最も太い」という**順序**であって、比率ではありません。',
    },
    {
      text: '**The wall tension figure is an index, not a tension and not a pressure.** It compares segments inside one picture, and which segment comes out highest is a property of that picture — the site, the valve and the calibres drawn — and not a general fact about the gut. Comparing the number between two scenarios is not something this model supports, and no value in it is a threshold. **Nothing here is perforation, ischaemia, or a risk of either, at the caecum or anywhere else.**',
      textJa:
        '**壁の負担の数値は指標であって、張力でも内圧でもありません。** 同じ画面の中で区間どうしを比べるためのものです。シナリオをまたいで数値を比べることはこのモデルでは支持されず、いかなる値も基準値ではありません。',
    },
    {
      text: 'The model takes the same amount to arrive above the blockage wherever it is, because most of what fills an obstructed bowel enters above the duodenum. That is a simplification, and the figure itself is this repository’s.',
      textJa:
        '閉塞部より上流へ届く量は、部位によらず同じとしています。閉塞腸管を満たすものの多くは十二指腸より上から入るためですが、これは単純化であり、その数値自体もこのリポジトリが選んだものです。',
    },
    {
      text: 'The drawn gut stops at the sigmoid: there is no rectum and no anal canal. A blockage there therefore has nothing below it on screen, which is a limit of the drawing and not a statement about the bowel.',
      textJa:
        '描かれている腸は S 状結腸で終わり、直腸も肛門管もありません。そのためそこでの閉塞には画面上の「下流」が存在しませんが、これは描画の限界であって腸についての主張ではありません。',
    },
    {
      text: 'A small bowel held back by a competent valve is drawn at its resting calibre and stays there. In a person it does not stay there indefinitely; this model has no time in it to show what happens next.',
      textJa:
        '弁が保たれている場合、その上流の小腸は安静時の太さのまま描かれます。実際には、いつまでもその状態が続くわけではありません。このモデルには、その先を示すための時間がありません。',
    },
  ],
  sources: [
    {
      text: 'Standard surgical descriptions of mechanical bowel obstruction: dilatation proximal to the point, collapse distal to it, and the transition point as what identifies the level.',
      textJa:
        '機械的腸閉塞の標準的な外科的記載から、閉塞部より近位の拡張、遠位の虚脱、そして高さを決めるのが移行部であること。',
      kind: 'textbook',
    },
    {
      text: 'Standard descriptions of closed-loop large bowel obstruction with a competent ileocaecal valve, in which the caecum is described as the segment that distends most. **That description belongs to that arrangement**, and this model reproduces it there rather than generalising it.',
      textJa:
        '回盲弁が保たれた閉鎖係蹄型の大腸閉塞について、盲腸が最も拡張する区間とされる標準的記載。**この記載はその配置についてのもの**であり、本モデルはそこで同じ結果を再現しているだけで、一般化していません。',
      kind: 'textbook',
    },
    {
      text: 'Laplace’s law for a cylinder, T = P·r, for why a wider tube’s wall carries more at the same pressure.',
      textJa: '円筒に対する Laplace の法則 T = P·r。同じ圧でも太い管の壁の負担が大きくなる理由です。',
      kind: 'physics',
    },
    {
      text: 'This repository’s network cannot reach the medical publishers, so no figure here was extracted from a paper by its author. No constant in this model is fitted, and none has been through clinical review.',
      textJa:
        'このリポジトリの構築環境からは医学系出版社に到達できないため、本ファイルの著者が論文から取り出した数値はありません。フィッティングも臨床レビューも経ていません。',
      kind: 'caveat',
    },
  ],
  evidence: 'docs/model-evidence/bowel-obstruction.md',
};

export const RELATED = {
  scenes: [
    {
      slug: 'intestine-anatomy',
      label: 'The same gut, named',
      labelJa: '同じ腸を、名前で',
      why: 'Caecum, ascending, transverse, descending and sigmoid as structures you can point at — nothing blocked and nothing distended.',
      whyJa: '盲腸・上行・横行・下行・S 状結腸を、名前で指せる構造として示します。閉塞も拡張もありません。',
    },
    {
      slug: 'intestinal-transit',
      label: 'What moves it along when nothing is in the way',
      labelJa: '塞がっていないとき、何が送っているのか',
      why: 'The contractions that mix and the ones that propel, on the same gut. A separate model with no blockage in it.',
      whyJa: '同じ腸の上で、混ぜる収縮と送る収縮を見ます。閉塞を含まない別のモデルです。',
    },
  ],
  note:
    'These are separate models, not stages of one patient. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa:
    'いずれも別々のモデルであり、1 人の患者の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};

/**
 * What the 3D does with the numbers, declared so it can be checked and quoted.
 */
export const VISUAL_MAPPING = [
  {
    id: 'distension',
    target: 'the bowel above the blockage',
    channel: 'geometry',
    from: 'radiusRatio',
    reading: 'illustrative',
    claim:
      'Each stretch above the blockage is drawn at the calibre ratio the model solves, applied to the calibre the atlas drew it at.',
    claimJa:
      'モデルが解いた太さの比を、アトラスが描いた各区間の太さに掛けて描いています。',
    notClaim:
      'The calibre it is multiplied into is the atlas’s drawn one, not an anatomical one. **No bowel diameter may be read off this, and this model has no intraluminal pressure and no time in it.**',
    notClaimJa:
      '掛ける相手の太さはアトラスの描画上のもので、解剖学的な値ではありません。**ここから腸管径は読み取れず、このモデルに内圧も時間もありません。**',
  },
  {
    id: 'emptied',
    target: 'the bowel below the blockage',
    channel: 'colour',
    from: 'segments',
    reading: 'thresholded',
    claim: 'A stretch the model says receives nothing is drawn drained of colour, so the two sides of the transition are different pictures.',
    claimJa: 'モデルが「何も届かない」とした区間は色を抜いて描き、移行部の両側が別の絵に見えるようにしています。',
    notClaim: 'It marks which side of the blockage a stretch is on. It is not a degree of collapse and not a finding on any image.',
    notClaimJa: '示しているのは閉塞のどちら側かということだけで、虚脱の程度でも、何らかの画像所見でもありません。',
  },
  {
    id: 'transition-marker',
    target: 'the transition point',
    channel: 'colour',
    from: 'transitionAt',
    reading: 'thresholded',
    claim: 'The place the model put the blockage is marked once anything is blocked at all.',
    claimJa: 'モデルが閉塞を置いた場所は、少しでも塞がった時点で示されます。',
    notClaim: 'It marks where this model put a blockage. Nothing here located anything in anybody, and the marker has no size.',
    notClaimJa: 'これはモデルが閉塞を置いた場所です。誰かの体で何かを見つけたわけではなく、この印に大きさはありません。',
  },
  {
    id: 'tension-highlight',
    target: 'the widest distended stretch',
    channel: 'emissive',
    from: 'highestTension',
    reading: 'thresholded',
    claim:
      'The stretch whose wall carries the most is lit, and only when one of them stands out — distended small bowel is all of one calibre and has no worst part.',
    claimJa:
      '壁の負担が最も大きい区間を光らせます。ただし差がはっきりある場合だけです。拡張した小腸は全長が同じ太さで、最悪の区間というものがありません。',
    notClaim:
      '**Lit is not at risk.** The index behind it is Laplace’s T = P·r with a distension index standing in for the pressure; it is not a tension, not a pressure, and not a probability of anything happening.',
    notClaimJa:
      '**光っていることは「危険」を意味しません。** 背後にあるのは Laplace の T = P·r で、圧の代わりに拡張の指標を用いたものです。張力でも内圧でも、何かが起きる確率でもありません。',
  },
];

export const DISCLAIMER =
  'Educational geometric model of mechanical bowel obstruction. It computes what is above a blockage and what is below it on a schematic gut whose lengths and calibres are drawn to be distinguishable, not to scale. It contains no time, no symptom, no ischaemia and no cause, and it is not for diagnosis.';
export const DISCLAIMER_JA =
  '機械的腸閉塞に関する教育用の幾何モデルです。閉塞の上流と下流を、長さと太さが実寸比ではなく「見分けられるように」描かれた模式的な腸の上で計算します。時間・症状・虚血・原因のいずれも含まず、診断には使用できません。';
export const DISCLAIMER_SHORT = 'Where it is blocked, and what is above it — no time, no symptom, not diagnosis.';
export const DISCLAIMER_SHORT_JA = 'どこで塞がり、その上に何があるか｜時間も症状もありません。診断には使用できません。';
