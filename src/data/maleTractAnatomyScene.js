/**
 * What the male genital tract scene says, in both languages.
 *
 * The geometry is `scenes/reproductive/organs/maleTract.js`. The scene answers
 * one question — **what connects to what, in what order** — and the copy is
 * organised so that every structure says what is upstream and what is
 * downstream of it. That is what makes each one a place something can be
 * interrupted, and it is the only claim the model is strong enough to make.
 *
 * The prostate here is a single translucent gland. Its zones are
 * `prostate-anatomy`; drawing them twice would be two prostates.
 */

export const MALE_TRACT_SCENE_COLORS = Object.freeze({
  testis: '#d6c3a8',
  epididymis: '#c8a37c',
  'vas-deferens': '#9c6aa8',
  'seminal-vesicle': '#b58ac4',
  'ejaculatory-duct': '#b05a8f',
  prostate: '#c76b6f',
  'prostatic-urethra': '#8fd6c4',
  'membranous-urethra': '#3fa891',
  'spongy-urethra': '#6ec9b4',
  'corpus-spongiosum': '#c98d8d',
  'right-corpus-cavernosum': '#b8686c',
  'left-corpus-cavernosum': '#b8686c',
  'external-urethral-orifice': '#c8603f',
  bladder: '#c8a6b8',
});

export const MALE_TRACT_NATURAL_COLORS = Object.freeze({
  testis: '#d6c3a8',
  epididymis: '#cbb094',
  'vas-deferens': '#c0aab0',
  'seminal-vesicle': '#b8a0ba',
  'ejaculatory-duct': '#b09098',
  prostate: '#c08a7a',
  'prostatic-urethra': '#b7c8c1',
  'membranous-urethra': '#b7c8c1',
  'spongy-urethra': '#b7c8c1',
  'corpus-spongiosum': '#c09090',
  'right-corpus-cavernosum': '#b58486',
  'left-corpus-cavernosum': '#b58486',
  'external-urethral-orifice': '#c08878',
  bladder: '#c8a6b8',
});

export const MALE_TRACT_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Along the route', labelJa: '経路別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function maleTractStructureCopy() {
  const entry = (id, group, groupJa, name, nameJa, description, descriptionJa, note, noteJa, legendKey, tags) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Male genital tract', group, name],
      hierarchyJa: ['男性生殖路', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const onTheRoute = (id, group, groupJa, name, nameJa, description, descriptionJa, note = null, noteJa = null) =>
    entry(id, group, groupJa, name, nameJa, description, descriptionJa, note, noteJa, 'route', ['route']);

  const around = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) =>
    entry(id, 'Around it', '周囲の構造', name, nameJa, description, descriptionJa, note, noteJa, 'around', ['around']);

  return new Map([
    onTheRoute(
      'testis',
      'Gonad',
      '性腺',
      'Testis',
      '精巣',
      'Where sperm is made, and where testosterone is made. It is outside the body cavity because the temperature inside is too high for the first of those.',
      '精子が作られ、テストステロンが作られる場所です。体腔の外にあるのは、体内の温度では精子形成が成り立たないためです。',
      'One smooth ovoid. The seminiferous tubules, the rete testis, the tunica albuginea and the scrotum around it are not drawn — nothing here is a histological model.',
      '滑らかな卵円形として描いています。精細管・精巣網・白膜、そして周囲の陰嚢は描いておらず、組織学的モデルではありません。'
    ),
    onTheRoute(
      'epididymis',
      'Duct',
      '導管',
      'Epididymis',
      '精巣上体',
      'Sits on the back of the testis: head at the top, body down the posterior border, tail at the bottom where it turns into the vas. Sperm leaving the testis is not yet motile — it becomes so crossing this.',
      '精巣の背側に乗っています。上端が頭部、後縁に沿って体部、下端が尾部で、そこから精管に移行します。精巣を出た精子はまだ運動能を持たず、ここを通過する間に獲得します。',
      'Drawn as one tube of three named lengths. Inside it is a single coiled duct several metres long, and that is not modelled: head, body and tail are not separately selectable here.',
      '3つの部位からなる1本の管として描いています。内部は数メートルに及ぶ1本の屈曲した管ですが、それは表現していません。頭部・体部・尾部を個別に選ぶことはできません。'
    ),
    onTheRoute(
      'vas-deferens',
      'Duct',
      '導管',
      'Vas deferens',
      '精管',
      'Runs up from the tail of the epididymis, through the inguinal canal, over the pubic bone and down behind the bladder. It is the only part of the route that is reachable through the skin of the scrotum, which is the whole of why a vasectomy is done where it is.',
      '精巣上体尾部から上行し、鼠径管を通り、恥骨を越えて膀胱の背側へ下ります。経路のなかで唯一、陰嚢の皮膚から到達できる部分であり、精管結紮術がその位置で行われるのはこのためです。',
      'Drawn much shorter and straighter than it is: a real vas is about 45 cm, most of it coiled. The spermatic cord’s other contents — the pampiniform plexus, the artery, the nerves — are not drawn.',
      '実際よりはるかに短く、まっすぐに描いています。実際の精管は約45cmで、その多くは屈曲しています。精索の他の内容（蔓状静脈叢・動脈・神経）も描いていません。'
    ),
    onTheRoute(
      'seminal-vesicle',
      'Gland',
      '付属腺',
      'Seminal vesicle',
      '精嚢',
      'Joins the vas just before the prostate. It makes most of the volume of semen and it does **not** store sperm, which is what its name suggests and is not what it does.',
      '前立腺の直前で精管と合流します。精液の容量の大半を産生しますが、名前に反して精子を貯蔵する場所では**ありません**。',
      'One of the pair is drawn, on the side the rest of this route is on. Both are in `prostate-anatomy`.',
      'この経路と同じ側の1つだけを描いています。左右両方は `prostate-anatomy` にあります。'
    ),
    onTheRoute(
      'ejaculatory-duct',
      'Duct',
      '導管',
      'Ejaculatory duct',
      '射精管',
      'What the vas and the seminal vesicle become where they meet. It runs **inside** the prostate to open on the verumontanum — so the last part of the genital route is inside a gland, and the urinary and genital routes share everything downstream of that point.',
      '精管と精嚢が合流してできる管です。前立腺の**内部**を走って精丘に開口します。生殖路の最後の部分は腺の中にあり、そこから下流は尿路と生殖路が共通になります。',
      'Short and straight here. Its course through the central zone is `prostate-anatomy`.',
      'ここでは短く直線的に描いています。中心域を貫く走行は `prostate-anatomy` にあります。'
    ),
    onTheRoute(
      'prostatic-urethra',
      'Urethra',
      '尿道',
      'Prostatic urethra',
      '前立腺部尿道',
      'The first of the three lengths, and the widest. It is where the genital route joins the urinary one.',
      '尿道3部のうち最初の部分で、最も太い部分です。ここで生殖路が尿路に合流します。',
      'The zones of the gland around it are `prostate-anatomy`.',
      'これを取り巻く腺の各領域は `prostate-anatomy` にあります。'
    ),
    onTheRoute(
      'membranous-urethra',
      'Urethra',
      '尿道',
      'Membranous urethra',
      '膜様部尿道',
      'The short stretch between the apex of the prostate and the bulb, through the pelvic floor. It is the narrowest and the least mobile part, which is why a catheter meets its resistance here and why this is the part that tears in a pelvic fracture.',
      '前立腺尖部と尿道球部の間の短い区間で、骨盤底を貫きます。最も細く、最も可動性のない部分であり、カテーテル挿入時に抵抗を感じるのも、骨盤骨折で断裂するのもここです。',
      'The external urethral sphincter around it is not drawn as a structure.',
      'これを取り巻く外尿道括約筋は、構造としては描いていません。'
    ),
    onTheRoute(
      'spongy-urethra',
      'Urethra',
      '尿道',
      'Spongy urethra',
      '海綿体部尿道',
      'The long last stretch, running inside the corpus spongiosum to the outside. It is the only part of the urethra that moves with the organ around it.',
      '尿道海綿体の内部を走って体外へ達する、最も長い最後の区間です。周囲の組織とともに動く唯一の部分です。',
      'Drawn straight, at one state. The bulbourethral glands that open into it and the navicular fossa at its end are not modelled.',
      'ひとつの状態で直線的に描いています。ここに開口する尿道球腺も、末端の舟状窩も表現していません。'
    ),
    onTheRoute(
      'external-urethral-orifice',
      'Urethra',
      '尿道',
      'External urethral orifice',
      '外尿道口',
      'Where the route ends. Everything above it — testis, epididymis, vas, ejaculatory duct, three lengths of urethra — is one continuous channel.',
      '経路の終点です。ここより上流の精巣・精巣上体・精管・射精管・尿道3部は、すべて1本の連続した管です。'
    ),
    around(
      'prostate',
      'Prostate',
      '前立腺',
      'The gland the genital route passes through and the urinary route starts in. Drawn translucent here so the two routes meeting inside it can be seen; its four zones are `prostate-anatomy`.',
      '生殖路が貫き、尿路が始まる腺です。ここでは内部で2つの経路が合流する様子が見えるように半透明で描いています。4つの領域は `prostate-anatomy` にあります。',
      'One undivided gland here. Zones, verumontanum and the rest are the other scene.',
      'ここでは分割していない1つの腺として描いています。領域・精丘などは別のシーンにあります。'
    ),
    around(
      'corpus-spongiosum',
      'Corpus spongiosum',
      '尿道海綿体',
      'The column of erectile tissue the spongy urethra runs inside. It is the one of the three that carries the urethra, which is why it stays softer than the other two.',
      '海綿体部尿道が内部を走る勃起組織の柱です。3つの柱のうち尿道を含むのはこれで、他の2つより硬くならないのはそのためです。',
      'Drawn translucent so the urethra inside it is visible. Its internal structure is not modelled and nothing here changes state.',
      '内部の尿道が見えるように半透明で描いています。内部構造は表現しておらず、状態変化もしません。'
    ),
    around(
      'right-corpus-cavernosum',
      'Right corpus cavernosum',
      '右陰茎海綿体',
      'One of the pair above the spongiosum. These two are what fill; the urethra is not in either of them.',
      '尿道海綿体の背側にある1対のうちの一方です。充血するのはこの2本で、尿道はどちらにも含まれていません。',
      'Drawn translucent, at one state. No erectile mechanism is modelled.',
      '半透明・単一の状態で描いています。勃起の機序は表現していません。'
    ),
    around(
      'left-corpus-cavernosum',
      'Left corpus cavernosum',
      '左陰茎海綿体',
      'The other of the pair.',
      '1対のもう一方です。',
      'Drawn translucent, at one state.',
      '半透明・単一の状態で描いています。'
    ),
    around(
      'bladder',
      'Bladder',
      '膀胱',
      'Where the urinary route starts. It sits directly on the prostate, and the urethra continues straight out of it.',
      '尿路の起点です。前立腺の直上にあり、尿道はここからそのまま続きます。',
      'Context only: the organ itself, with its parts, is `bladder-anatomy`.',
      '位置関係を示すためだけの表示です。膀胱そのものと部位は `bladder-anatomy` にあります。'
    ),
  ]);
}

export const MALE_TRACT_ANATOMY_META = Object.freeze({
  id: 'male-tract-anatomy',
  status: 'alpha',
  title: 'The male genital tract, end to end',
  titleJa: '男性生殖路の全体像',
  subtitle: 'Point to identify; click or tap to pin any part of the route from testis to outside',
  subtitleJa: '触れて部位を確認・クリック／タップで精巣から外尿道口までの各部を固定',
  inspection: { background: 'studio' },
  palette: {
    route: MALE_TRACT_SCENE_COLORS['vas-deferens'],
    around: MALE_TRACT_SCENE_COLORS['corpus-spongiosum'],
  },
  legend: [
    { key: 'route', label: 'The route, testis to outside', labelJa: '精巣から外尿道口までの経路' },
    { key: 'around', label: 'What it runs through', labelJa: '経路が通る構造' },
  ],
  stages: [
    {
      id: 'route',
      name: 'The whole route',
      nameJa: '経路の全体',
      at: 0,
      summary:
        'Testis, epididymis, vas, ejaculatory duct and three lengths of urethra — one continuous channel with a gland part way along it.',
      summaryJa:
        '精巣・精巣上体・精管・射精管・尿道3部が、途中に腺を挟んで1本につながっています。',
    },
    {
      id: 'inside',
      name: 'Where the two routes meet',
      nameJa: '2つの経路が合流する場所',
      at: 1,
      summary:
        'The prostate and the erectile columns fade: the genital route ends inside the gland, and everything downstream of that is shared with the urinary one.',
      summaryJa:
        '前立腺と海綿体を薄くすると、生殖路が腺の内部で終わり、それより下流は尿路と共通であることが見えます。',
    },
  ],
  range: { start: 'The route', startJa: '経路', end: 'Inside', endJa: '内部' },
  progressLabel: { label: 'Surrounding structures', labelJa: '周囲の構造の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Lengths and calibres are drawn to be legible and none is a measurement; the vas in particular is drawn far shorter and straighter than it is, and the epididymal duct inside the epididymis is not modelled at all. One side of a paired route is drawn. The scrotum, the spermatic cord’s coverings and vessels, the seminiferous tubules, the sphincters, the bulbourethral glands and the erectile mechanism are not drawn, and nothing here changes state.',
  disclaimerJa:
    '教育用肉眼解剖モデル：長さと口径は見やすさのために描いたもので、いずれも実測値ではありません。とくに精管は実際よりはるかに短く直線的で、精巣上体内部の管は表現していません。対になっている経路のうち片側のみを描いています。陰嚢・精索の被膜と血管・精細管・括約筋・尿道球腺・勃起の機序は描いておらず、状態変化もしません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
