/**
 * What the eye anatomy scene says, in both languages.
 *
 * The geometry is `scenes/sensory/organs/eyeball.js`. One idea carries the
 * copy: **an eye is three coats around three transparent things**, and almost
 * everything anyone asks about it is a question about which layer or which
 * space. Where a structure's clinical importance is a matter of position — the
 * angle aqueous leaves by, the disc and the macula on the fundus — the copy
 * says the position and stops.
 *
 * It names no pressure, no acuity, no drug and no operation. Disease is
 * somebody else's scene.
 */

export const EYE_SCENE_COLORS = Object.freeze({
  sclera: '#f2efe6',
  choroid: '#8f4a52',
  retina: '#e8a87c',
  cornea: '#dcecf0',
  iris: '#6b4a2a',
  pupil: '#0b080c',
  lens: '#d8e8ee',
  'ciliary-body': '#a86a4e',
  'anterior-chamber': '#bcdff0',
  'vitreous-body': '#cfe0e8',
  'optic-disc': '#f0d8a8',
  macula: '#8a4a2e',
  'optic-nerve': '#e8e0c8',
  'superior-rectus': '#c2564e',
  'inferior-rectus': '#a8433c',
  'medial-rectus': '#d9705e',
  'lateral-rectus': '#e08a6a',
});

export const EYE_NATURAL_COLORS = Object.freeze({
  sclera: '#f4f2ea',
  choroid: '#8a4a4e',
  retina: '#d89a78',
  cornea: '#d6e8ec',
  iris: '#6d5236',
  pupil: '#0a070b',
  lens: '#dde9ee',
  'ciliary-body': '#a06a50',
  'anterior-chamber': '#c8e4f0',
  'vitreous-body': '#d4e2e8',
  'optic-disc': '#f0dcb0',
  macula: '#94543a',
  'optic-nerve': '#ece4cc',
  'superior-rectus': '#c0685c',
  'inferior-rectus': '#b45f54',
  'medial-rectus': '#c87264',
  'lateral-rectus': '#cf7d6c',
});

export const EYE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const COAT_NOTE = {
  note: '**The three coats are drawn far thicker than they are.** In life they are fractions of a millimetre against a globe of about 24 mm; drawn to scale they would be one line three colours wide. It is a display thickness so that each can be seen and selected, and **no thickness may be read off this model**.',
  noteJa:
    '**3層の膜は、実際よりはるかに厚く描いています。** 実際には直径約24 mmの眼球に対していずれも1 mm未満で、そのまま描けば3色の1本の線にしかなりません。各層を見分けて選択できるようにするための表示上の厚みであり、**このモデルから厚さを読み取らないでください**。',
};

export function eyeStructureCopy() {
  const entry = (group, groupJa, legendKey, tags) => (
    id,
    name,
    nameJa,
    description,
    descriptionJa,
    note = null,
    noteJa = null
  ) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Eye', group, name],
      hierarchyJa: ['眼', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const coat = entry('The three coats', '3つの膜', 'coat', ['coat']);
  const front = entry('The front of the eye', '眼球前部', 'anterior', ['anterior']);
  const space = entry('The spaces inside', '眼内の腔', 'media', ['media']);
  const fundus = entry('The back of the eye', '眼球後部', 'fundus', ['fundus']);
  const muscle = entry('Muscles that aim it', '眼球を動かす筋', 'muscle', ['muscle']);

  return new Map([
    coat(
      'sclera',
      'Sclera',
      '強膜',
      'The tough outer coat — the white of the eye. It keeps the globe a globe, and the muscles that aim the eye pull on it.',
      '外側の丈夫な膜で、いわゆる「白目」です。眼球の形を保ち、眼球を動かす筋はここに付着します。',
      COAT_NOTE.note,
      COAT_NOTE.noteJa
    ),
    coat(
      'choroid',
      'Choroid',
      '脈絡膜',
      'The middle coat, between sclera and retina, and almost entirely blood vessels. It is what feeds the outer retina — so the two cannot be considered separately.',
      '強膜と網膜の間にある中間の膜で、そのほとんどが血管です。網膜外層を栄養しているのはこの膜であり、両者は切り離して考えられません。',
      COAT_NOTE.note,
      COAT_NOTE.noteJa
    ),
    coat(
      'retina',
      'Retina',
      '網膜',
      'The inner coat, and the only part of the eye that sees. It lines the back two-thirds of the globe and is **attached at only two places** — the optic disc and the front edge — which is why it can come away from the coat behind it.',
      '最も内側の膜で、眼球のなかで光を感じるのはここだけです。眼球後方2/3の内面を覆いますが、**しっかり固着しているのは視神経乳頭と前縁の2か所だけ**であり、そのために外側の膜から剥がれうるのです。',
      COAT_NOTE.note,
      COAT_NOTE.noteJa
    ),
    front(
      'cornea',
      'Cornea',
      '角膜',
      'The clear window at the front, set into the sclera like a watch glass. It is **more steeply curved than the rest of the globe**, and that curvature does most of the eye’s focusing — more than the lens does.',
      '前面にある透明な窓で、強膜に時計のガラスのようにはめ込まれています。**眼球の他の部分より強く湾曲しており**、眼のピント合わせの大部分は水晶体ではなくこの曲率が担っています。',
      'Drawn with a smooth wall of one thickness; its five layers are not modelled and it carries no vessels or nerves here.',
      '一定の厚みの滑らかな膜として描いており、5層構造は表現していません。血管や神経も描いていません。'
    ),
    front(
      'iris',
      'Iris',
      '虹彩',
      'The coloured diaphragm in front of the lens. It sets how much light gets in, and where it meets the cornea is the **angle** — the drain the fluid in front of it leaves by.',
      '水晶体の前にある色のついた絞りで、眼内に入る光量を決めます。角膜と接する部分が**隅角**で、前方の房水はここから流出します。',
      'One even ring. The muscles inside it that open and close the pupil are not drawn, and nothing here changes size.',
      '太さの一定な1つの輪として描いています。瞳孔を開閉させる内部の筋は描いておらず、このシーンでは大きさも変わりません。'
    ),
    front(
      'pupil',
      'Pupil',
      '瞳孔',
      'The hole in the middle of the iris — **not a structure but an opening**. It looks black because almost no light comes back out of an eye.',
      '虹彩の中央の孔で、**構造ではなく開口部**です。眼に入った光がほとんど戻ってこないため、黒く見えます。',
      'Drawn as the black disc a reader sees when they look at one, because an opening cannot be pointed at.',
      '開口部そのものは指し示せないため、実際に見えるとおりの黒い円板として描いています。'
    ),
    front(
      'lens',
      'Lens',
      '水晶体',
      'Sits directly behind the iris, hung from the ciliary body all the way round. It is the part of the eye that **changes shape** to focus near — and the part that clouds with age.',
      '虹彩のすぐ後ろにあり、全周を毛様体から吊られています。近くを見るときに**形を変えて**ピントを合わせる部分であり、加齢に伴って混濁するのもここです。',
      'Drawn at one shape. **Nothing here accommodates**, and the suspensory fibres that hold it are not drawn.',
      '1つの形で描いています。**このシーンでは調節は起こらず**、水晶体を吊るチン小帯も描いていません。'
    ),
    front(
      'ciliary-body',
      'Ciliary body',
      '毛様体',
      'The ring behind the iris that the lens hangs from — and the thing that **makes** the fluid filling the front of the eye. It both produces the fluid and moves the lens.',
      '虹彩の後方で水晶体を吊る輪であり、同時に眼球前部を満たす房水を**産生**する組織でもあります。房水の産生と水晶体の調節という2つの役割を担います。',
      'One even ring. The muscle inside it and the processes that secrete are not separately drawn.',
      '太さの一定な1つの輪として描いています。内部の毛様体筋と分泌を行う毛様体突起は個別には描いていません。'
    ),
    space(
      'anterior-chamber',
      'Anterior chamber',
      '前房',
      'The space between cornea and iris, filled with a watery fluid that is made behind the iris, passes **through the pupil**, and leaves at the angle where iris meets cornea. It is a circulation, not a pool.',
      '角膜と虹彩の間の空間で、房水に満たされています。房水は虹彩の後方で産生され、**瞳孔を通って**前房に入り、虹彩と角膜のなす隅角から流出します。溜まっているのではなく循環しています。',
      'Drawn as a body, because a space cannot otherwise be pointed at. The posterior chamber behind the iris is not drawn separately, and **no pressure is represented**.',
      '空間は他に指し示す方法がないため、1つの立体として描いています。虹彩後方の後房は個別には描いておらず、**眼圧は表現していません**。'
    ),
    space(
      'vitreous-body',
      'Vitreous body',
      '硝子体',
      'The clear gel filling the back four-fifths of the eye, between lens and retina. It holds the retina against the coat behind it — and where it pulls away from the retina it can pull the retina with it.',
      '水晶体と網膜の間、眼球後方4/5を満たす透明なゲルです。網膜を外側の膜に押しつけて保持していますが、網膜から剥離する際に網膜を引っ張ることもあります。',
      'Drawn as one even body. It is not uniform in life, and nothing here moves.',
      '均一な1つの立体として描いています。実際には一様ではなく、このシーンでは動きもありません。'
    ),
    fundus(
      'optic-disc',
      'Optic disc',
      '視神経乳頭',
      'Where the nerve fibres leave the eye — **nasal to the centre of the back of the eye**, and the one place on the retina with no light-sensing cells at all. That is the blind spot, and everyone has one.',
      '神経線維が眼球を出る部位で、**眼底の中心より鼻側**にあります。網膜のなかで視細胞がまったく存在しない唯一の場所であり、これが誰にでもある盲点です。',
      'A flat patch. The cup in its centre, whose size matters in glaucoma, is not drawn.',
      '平坦な部分として描いています。緑内障で問題になる中心の陥凹（視神経乳頭陥凹）は表現していません。'
    ),
    fundus(
      'macula',
      'Macula and fovea',
      '黄斑・中心窩',
      'The small area at the centre of the back of the eye, **temporal to the disc**, with a pit in its middle. Reading, faces and fine detail all happen here; the rest of the retina does everything else.',
      '眼底の中心にある小さな領域で、**視神経乳頭より耳側**に位置し、中央にくぼみ（中心窩）があります。読字・顔の認識・細かい形の判別はすべてここで行われ、それ以外は網膜の他の部分が担います。',
      'Drawn as a patch with a dimple. Its layers, and the absence of vessels over the fovea, are not modelled.',
      'くぼみをもつ領域として描いています。層構造や、中心窩に血管がないことは表現していません。'
    ),
    fundus(
      'optic-nerve',
      'Optic nerve',
      '視神経',
      'Carries what the retina sees back towards the brain. It is not really a nerve but **a tract of the brain**, which is why it behaves like brain tissue and does not recover the way other nerves can.',
      '網膜が受け取った情報を脳へ伝えます。厳密には末梢神経ではなく**脳の一部（伝導路）**であり、そのため脳組織と同じ性質を示し、他の末梢神経のようには再生しません。',
      'Only the part just behind the eye is drawn; the chiasm and everything past it are outside this scene.',
      '眼球直後の部分のみを描いています。視交叉より先は、このシーンの範囲外です。'
    ),
    muscle(
      'superior-rectus',
      'Superior rectus',
      '上直筋',
      'Runs along the top of the eye from behind and inserts in front of the equator, so pulling on it turns the eye **upwards**.',
      '眼球後方から上面を走り、赤道より前方に停止します。この筋が収縮すると眼球は**上方**を向きます。',
      'One strap standing for a muscle and its tendon; the muscle bellies and the pulley behind are not drawn.',
      '筋とその腱を1本の帯として描いており、筋腹や後方の滑車は表現していません。'
    ),
    muscle(
      'inferior-rectus',
      'Inferior rectus',
      '下直筋',
      'The same along the bottom: it turns the eye **downwards**.',
      '同様に下面を走り、眼球を**下方**に向けます。'
    ),
    muscle(
      'medial-rectus',
      'Medial rectus',
      '内直筋',
      'Along the nasal side: it turns the eye **towards the nose**. Both eyes use theirs together to look at something close.',
      '鼻側を走り、眼球を**内側（鼻側）**に向けます。近くを見るときは左右がともに働きます。'
    ),
    muscle(
      'lateral-rectus',
      'Lateral rectus',
      '外直筋',
      'Along the temporal side: it turns the eye **outwards**. It is the one muscle of the four with a nerve of its own.',
      '耳側を走り、眼球を**外側**に向けます。4つの直筋のうち、単独の脳神経支配を受けるのはこの筋だけです。'
    ),
  ]);
}

export const EYE_ANATOMY_META = Object.freeze({
  id: 'eye-anatomy',
  status: 'alpha',
  title: 'Interactive eye anatomy',
  titleJa: '触れて学ぶ眼の解剖',
  subtitle: 'Point to identify; click or tap to pin a coat, a space or a landmark',
  subtitleJa: '触れて部位を確認・クリック／タップで各膜・腔・眼底の構造を固定',
  inspection: { background: 'studio' },
  palette: {
    coat: EYE_SCENE_COLORS.retina,
    anterior: EYE_SCENE_COLORS.iris,
    media: EYE_SCENE_COLORS['anterior-chamber'],
    fundus: EYE_SCENE_COLORS.macula,
    muscle: EYE_SCENE_COLORS['medial-rectus'],
  },
  legend: [
    { key: 'coat', label: 'The three coats', labelJa: '3つの膜' },
    { key: 'anterior', label: 'Cornea, iris and lens', labelJa: '角膜・虹彩・水晶体' },
    { key: 'media', label: 'The spaces inside', labelJa: '眼内の腔' },
    { key: 'fundus', label: 'Disc, macula and nerve', labelJa: '乳頭・黄斑・視神経' },
    { key: 'muscle', label: 'Rectus muscles', labelJa: '直筋' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'From outside',
      nameJa: '外から見る',
      at: 0,
      summary: 'White sclera, clear cornea, the coloured iris behind it and the pupil in the middle of that.',
      summaryJa: '白い強膜、透明な角膜、その奥の虹彩と、中央の瞳孔。',
    },
    {
      id: 'inside',
      name: 'From inside',
      nameJa: '中を見る',
      at: 1,
      summary:
        'The coats fade: the lens behind the iris, the gel behind the lens, and on the back wall the disc and the macula.',
      summaryJa:
        '各膜を薄くすると、虹彩の奥の水晶体、その奥の硝子体、そして後壁の視神経乳頭と黄斑が見えます。',
    },
  ],
  range: { start: 'Outside', startJa: '外側', end: 'Inside', endJa: '内部' },
  progressLabel: { label: 'Coat transparency', labelJa: '各膜の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right eye, drawn schematically. **Nothing here moves: no accommodation, no pupillary reflex, no eye movement, and no pressure.** No radius, thickness, angle or distance is a measurement, and **the three coats are drawn far thicker than they are** so each can be seen and selected. The eyelids, conjunctiva, lacrimal apparatus, the oblique muscles, the suspensory fibres of the lens, the retinal layers and vessels, the optic cup and the orbit are not drawn, and nothing here is anyone’s eye.',
  disclaimerJa:
    '教育用肉眼解剖モデル：右眼を模式的に描いたものです。**このシーンでは何も動きません——調節も対光反射も眼球運動もなく、眼圧も表現していません。** 半径・厚み・角度・距離はいずれも実測値ではなく、**3層の膜は見分けて選択できるように実際よりはるかに厚く描いています**。眼瞼・結膜・涙器・斜筋・チン小帯・網膜の層構造と血管・視神経乳頭陥凹・眼窩は描いておらず、特定の個人の眼でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
