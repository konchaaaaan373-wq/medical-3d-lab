/**
 * What the skin anatomy scene says, in both languages.
 *
 * The geometry is `scenes/integumentary/organs/skinBlock.js`. Skin is a sheet
 * with a thickness rather than a thing with a shape, so the copy is written
 * about **depth**: which layer a structure is in, and what that means for what
 * can reach it and what it can reach. Two facts are repeated because everything
 * else follows from them — the epidermis has no blood supply of its own, and
 * the join beneath it is not flat.
 *
 * It names no rash, no ulcer, no burn and no dressing. Disease is somebody
 * else's scene.
 */

export const SKIN_SCENE_COLORS = Object.freeze({
  epidermis: '#e8c3a4',
  dermis: '#d98b80',
  'subcutaneous-tissue': '#f0dfa8',
  'adipose-tissue': '#f6e9b4',
  'hair-follicle': '#c9a07a',
  'sebaceous-gland': '#e8d07a',
  'sweat-gland': '#9fd0c4',
  arteriole: '#c2413c',
  venule: '#5878a8',
  'sensory-nerve': '#e5d98a',
});

export const SKIN_NATURAL_COLORS = Object.freeze({
  epidermis: '#e6c4a6',
  dermis: '#d8a094',
  'subcutaneous-tissue': '#f0e2b4',
  'adipose-tissue': '#f4ebc0',
  'hair-follicle': '#c9a888',
  'sebaceous-gland': '#e4d8a4',
  'sweat-gland': '#d8d0c0',
  arteriole: '#b8504a',
  venule: '#6e7e9c',
  'sensory-nerve': '#e8e0b8',
});

export const SKIN_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const DEPTH_NOTE = {
  note: '**The layers are deliberately not to scale.** In life the epidermis is about a tenth of a millimetre and the dermis about two — twenty times thicker. Drawn to scale the epidermis is a line, and a line cannot carry what is in it. **No thickness or ratio may be read off this model.**',
  noteJa:
    '**各層の厚みは、意図的に実際の比率にしていません。** 実際には表皮は約0.1 mm、真皮は約2 mmで、20倍の差があります。そのまま描けば表皮は1本の線になり、その中の構造を示せません。**このモデルから厚みや比率を読み取らないでください。**',
};

export function skinStructureCopy() {
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
      hierarchy: ['Skin', group, name],
      hierarchyJa: ['皮膚', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const layer = entry('The layers', '層', 'layer', ['layer']);
  const appendage = entry('What goes down through it', '皮膚を貫くもの', 'appendage', ['appendage']);
  const supply = entry('What feeds and senses it', '栄養と知覚', 'supply', ['supply']);

  return new Map([
    layer(
      'epidermis',
      'Epidermis',
      '表皮',
      'The surface layer, and the barrier. It is made of cells that are pushed up from below, flatten, die and are shed — so the outside of a person is renewed from underneath, continuously. **It contains no blood vessels at all** and is fed by diffusion from the layer below.',
      '表面の層であり、バリアそのものです。下層から押し上げられた細胞が扁平化し、死んで脱落することで、体表は絶えず下から作り替えられています。**血管はまったく含まれず**、栄養は下層からの拡散によります。',
      DEPTH_NOTE.note,
      DEPTH_NOTE.noteJa
    ),
    layer(
      'dermis',
      'Dermis',
      '真皮',
      'The layer that makes skin strong and stretchy, and the layer everything else lives in: vessels, nerves, glands and the roots of hairs. **Its join with the epidermis above is not flat** — the two interlock in ridges, which is why skin does not shear off when it is rubbed, and why a separation exactly there is a blister.',
      '皮膚に強度と伸展性を与える層であり、血管・神経・腺・毛根など、ほかのものが存在するのはこの層です。**上の表皮との境界は平坦ではなく**、互いに噛み合った凹凸をなしています。こすっても表皮がずれないのはこのためであり、まさにこの面での剥離が水疱です。',
      DEPTH_NOTE.note,
      DEPTH_NOTE.noteJa
    ),
    layer(
      'subcutaneous-tissue',
      'Subcutaneous tissue',
      '皮下組織',
      'Below the dermis, and **not part of the skin proper** — the compartment between skin and what is under it. It lets skin slide over muscle and bone, and it is where the fat is.',
      '真皮の下にあり、**厳密には皮膚には含まれません**——皮膚とその下の組織との間の区画です。皮膚が筋や骨の上を滑るのはこの層があるためで、脂肪が存在するのもここです。',
      DEPTH_NOTE.note,
      DEPTH_NOTE.noteJa
    ),
    layer(
      'adipose-tissue',
      'Adipose tissue',
      '脂肪組織',
      'The fat that fills the subcutaneous compartment, in lobules divided by fibrous partitions. It insulates, cushions, and stores — and how much of it there is decides how far anything has to go to reach muscle.',
      '皮下の区画を満たす脂肪で、線維性の隔壁に区切られた小葉をなします。断熱・緩衝・貯蔵を担い、その量が、筋に到達するまでの深さを決めます。',
      'Drawn as separate lobules inside the compartment, so that the compartment and what fills it can each be pointed at. The partitions between them are not drawn.',
      '区画と、それを満たすものの両方を指し示せるように、区画の中の独立した小葉として描いています。小葉間の隔壁は描いていません。'
    ),
    appendage(
      'hair-follicle',
      'Hair follicle',
      '毛包',
      'A tube of epidermis that has grown **down into the dermis**, with the root of the hair at the bottom of it. So a follicle is lined with the same tissue as the surface — which is why something that starts on the skin can travel down one, and why one reaching into the fat is deeper than it looks.',
      '表皮が**真皮の中へ落ち込んでできた管**で、その底に毛根があります。したがって毛包の内面は体表と同じ組織であり、皮膚表面に生じたものが毛包を伝って深部へ及びうるのも、脂肪層に達する毛包が見た目より深いのも、このためです。',
      'The follicle and the hair it makes are one structure here. The arrector muscle, the bulb’s papilla and the growth cycle are not drawn, and nothing grows.',
      '毛包とそれが作る毛を1つの構造として扱っています。立毛筋・毛乳頭・毛周期は描いておらず、伸長も表現していません。'
    ),
    appendage(
      'sebaceous-gland',
      'Sebaceous gland',
      '脂腺',
      'Opens **into the follicle**, not onto the skin. Its oil reaches the surface by running up the hair — so the gland, the duct and the pore are one system, and a blocked follicle blocks the gland too.',
      '皮膚表面ではなく、**毛包の中に**開口します。皮脂は毛に沿って上行して体表に達するため、腺・導管・開口部は1つの系をなし、毛包が詰まれば腺も詰まります。',
      'One lobulated sac. The duct into the follicle is not drawn separately.',
      '分葉した1つの袋として描いています。毛包への導管は個別には描いていません。'
    ),
    appendage(
      'sweat-gland',
      'Sweat gland',
      '汗腺',
      'A coil deep in the skin with a duct that spirals up and opens **on the surface**, nowhere near a hair. It is the other route to the outside, and confusing the two routes is the commonest mistake about skin.',
      '皮膚深部のコイルと、らせん状に上行して**体表に直接開口する**導管からなります。毛とは無関係の、もう1つの体外への経路です。この2つの経路の混同は、皮膚についてよくある誤解です。',
      'The coil and its duct are one structure. Eccrine and apocrine glands are not distinguished.',
      'コイルと導管を1つの構造として扱っています。エクリン腺とアポクリン腺は区別していません。'
    ),
    supply(
      'arteriole',
      'Arteriole',
      '細動脈',
      'Runs in the dermis and sends branches up towards the surface. It stops short of the epidermis, because **the epidermis has no vessels** — everything above the join is fed across it.',
      '真皮内を走り、表面に向かって枝を出します。**表皮には血管がない**ため、その手前で終わります。境界面より上は、すべて拡散によって養われています。',
      'One vessel standing for a plexus. The deep and superficial networks of a real dermis are not separately drawn.',
      '1本の血管が血管網を代表しています。実際の真皮にある深部と浅層の2つの網は、個別には描いていません。'
    ),
    supply(
      'venule',
      'Venule',
      '細静脈',
      'The return, running alongside. Between the two, in the upper dermis, is where skin changes colour: flushed, pale or bruised is a statement about these vessels and not about the epidermis over them.',
      '還流路で、細動脈に伴走します。皮膚の色調が変化するのは、上部真皮のこの血管系においてです。紅潮・蒼白・皮下出血はいずれも、表皮ではなくこれらの血管についての所見です。'
    ),
    supply(
      'sensory-nerve',
      'Sensory nerve',
      '知覚神経',
      'Comes up through the dermis and ends just under the surface. Skin is an organ of **sense** before it is anything else, and where a nerve ends is how finely a place can feel.',
      '真皮を上行し、表面直下で終わります。皮膚は何よりもまず**感覚器**であり、神経終末の密度がその部位の識別能を決めます。',
      'One nerve standing for several kinds of ending; the named receptors are not drawn.',
      '複数種の終末器を1本の神経で代表させています。個々の受容器は描いていません。'
    ),
  ]);
}

export const SKIN_ANATOMY_META = Object.freeze({
  id: 'skin-anatomy',
  status: 'alpha',
  title: 'Interactive skin anatomy',
  titleJa: '触れて学ぶ皮膚の解剖',
  subtitle: 'Point to identify; click or tap to pin a layer, an appendage or a vessel',
  subtitleJa: '触れて部位を確認・クリック／タップで各層・付属器・血管を固定',
  inspection: { background: 'studio' },
  palette: {
    layer: SKIN_SCENE_COLORS.dermis,
    appendage: SKIN_SCENE_COLORS['hair-follicle'],
    supply: SKIN_SCENE_COLORS.arteriole,
  },
  legend: [
    { key: 'layer', label: 'The layers', labelJa: '層' },
    { key: 'appendage', label: 'Follicle and glands', labelJa: '毛包・腺' },
    { key: 'supply', label: 'Vessels and nerve', labelJa: '血管・神経' },
  ],
  stages: [
    {
      id: 'block',
      name: 'A block of skin',
      nameJa: '皮膚の1ブロック',
      at: 0,
      summary: 'Surface, then the layer everything lives in, then the fat below it.',
      summaryJa: '表面、次にすべてが存在する層、そしてその下の脂肪。',
    },
    {
      id: 'through',
      name: 'What goes through it',
      nameJa: '皮膚を貫くもの',
      at: 1,
      summary:
        'The layers fade: a follicle down into the fat with a gland opening into it, a sweat gland opening on the surface instead, and vessels that stop at the epidermis.',
      summaryJa:
        '各層を薄くすると、脂肪層まで達する毛包とそこに開口する脂腺、体表に直接開口する汗腺、そして表皮の手前で終わる血管が見えます。',
    },
  ],
  range: { start: 'Layers', startJa: '層', end: 'Contents', endJa: '内部の構造' },
  progressLabel: { label: 'Layer transparency', labelJa: '各層の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A block of skin, drawn schematically, with the sides cut. **The layers are deliberately not to scale: the epidermis is drawn about a quarter of the dermis where in life it is about a twentieth**, so that what is in it can be seen — no thickness or ratio may be read off this model. **Nothing here moves or grows**, and no thickness is a measurement. The epidermal layers, the arrector muscle, the named sensory receptors, the lymphatics, the fibrous septa of the fat and the difference between skin from different parts of the body are not drawn, and nothing here is anyone’s skin.',
  disclaimerJa:
    '教育用肉眼解剖モデル：側面を切り出した皮膚の1ブロックを模式的に描いたものです。**各層の厚みは意図的に実際の比率にしていません**——表皮は実際には真皮の約1/20ですが、内部の構造を示せるように約1/4で描いています。このモデルから厚みや比率を読み取らないでください。**このシーンでは何も動かず、伸長もしません。** いずれの厚みも実測値ではありません。表皮の層構造・立毛筋・各種の感覚受容器・リンパ管・脂肪の線維性隔壁・部位による皮膚の違いは描いておらず、特定の個人の皮膚でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
