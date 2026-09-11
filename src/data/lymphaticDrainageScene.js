/**
 * What the lymphatic drainage scene says, in both languages.
 *
 * The geometry is `scenes/hematologic/organs/lymphaticRoutes.js`. One fact
 * carries the copy and every entry leads back to it: **lymph does not drain
 * symmetrically.** One small duct takes a quarter of the body and one long one
 * takes the rest, and knowing which side a thing drains to is the difference
 * between looking in the right place and the wrong one.
 *
 * The nodes here are markers for **groups**, not models of nodes. One node,
 * drawn at its own scale, is `lymph-node-anatomy`.
 */

export const DRAINAGE_SCENE_COLORS = Object.freeze({
  'thoracic-duct': '#6fa8c4',
  'right-lymphatic-duct': '#8fbfd8',
  'cisterna-chyli': '#4f8ea8',
  'cervical-nodes': '#c2884e',
  'axillary-nodes': '#c46a5a',
  'inguinal-nodes': '#b0803c',
  'left-drainage-route': '#8fb8c8',
  'right-drainage-route': '#a8cddc',
});

export const DRAINAGE_NATURAL_COLORS = Object.freeze({
  'thoracic-duct': '#a8c4cf',
  'right-lymphatic-duct': '#b4ccd8',
  'cisterna-chyli': '#9cb8c4',
  'cervical-nodes': '#c8a880',
  'axillary-nodes': '#c49888',
  'inguinal-nodes': '#c0a878',
  'left-drainage-route': '#bcccd4',
  'right-drainage-route': '#c4d4dc',
});

export const DRAINAGE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By route', labelJa: '経路別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const GROUP_NOTE = {
  note: '**A marker for a group, not a model of a node.** Each group is drawn as a handful of beads large enough to see and click; a real group is a dozen or more nodes of a few millimetres. **No node size or count may be read off this model** — one node at its own scale is `lymph-node-anatomy`.',
  noteJa:
    '**リンパ節そのものではなく、群の位置を示すマーカーです。** 各群は、見えて選択できる大きさの数個のビーズとして描いています。実際には数ミリのリンパ節が十数個以上集まっています。**このモデルから節の大きさや個数を読み取らないでください**——1つのリンパ節を節自身の縮尺で描いたものは `lymph-node-anatomy` にあります。',
};

export function drainageStructureCopy() {
  const entry = (group, groupJa, legendKey, tags) => (
    id, name, nameJa, description, descriptionJa, note = null, noteJa = null
  ) => [
    id,
    {
      name, nameJa,
      hierarchy: ['Lymphatic system', group, name],
      hierarchyJa: ['リンパ系', groupJa, nameJa],
      description, descriptionJa, note, noteJa,
      colorKey: id, legendKey, tags,
    },
  ];

  const duct = entry('Where it empties', '最終的な流出路', 'duct', ['duct']);
  const nodes = entry('Node groups', 'リンパ節群', 'nodes', ['nodes']);
  const route = entry('Routes', '経路', 'route', ['route']);

  return new Map([
    duct(
      'thoracic-duct',
      'Thoracic duct',
      '胸管',
      'The big one. It starts in the abdomen, runs up behind the chest, crosses to the left and empties into the veins at the root of the neck — and on the way it collects **both legs, the abdomen, the left arm and the left side of the head**. Three quarters of the body drains here.',
      '主要な流出路です。腹部から始まり胸部の後方を上行し、左側へ移って頸部の根元で静脈に注ぎます。その途中で**両下肢・腹部・左上肢・頭部左側**からのリンパを集めます。体の約3/4がここへ流れ込みます。',
      'One vessel of even calibre; its valves, its branches and the variation in its course are not drawn.',
      '口径の一定な1本の管として描いています。弁・分枝・走行の個人差は表現していません。'
    ),
    duct(
      'right-lymphatic-duct',
      'Right lymphatic duct',
      '右リンパ本幹',
      'The small one, and short. It takes the **right arm, the right side of the head and the right side of the chest** — and nothing else. That asymmetry is the most useful thing on this screen: which duct a place drains to decides where something spreading in lymph turns up.',
      '短く小さいほうの本幹です。**右上肢・頭部右側・胸部右側**からのリンパのみを受けます。この左右差がこのシーンで最も有用な事実であり、どちらの本幹に流れる部位かによって、リンパ行性に広がるものが現れる場所が決まります。'
    ),
    duct(
      'cisterna-chyli',
      'Cisterna chyli',
      '乳び槽',
      'The sac in the abdomen the thoracic duct begins at, where the drainage from both legs and from the gut arrives. Lymph from the intestine carries fat, which is why what collects here is not clear.',
      '胸管が始まる腹部の袋で、両下肢と腸管からのリンパが合流します。腸管からのリンパは脂肪を含むため、ここに集まるリンパは透明ではありません。'
    ),
    nodes(
      'cervical-nodes',
      'Cervical nodes',
      '頸部リンパ節',
      'The groups in the neck, draining the head and throat. They are the ones a person can feel on themselves, and the ones examined first — which is why "where in the neck" is a question worth asking.',
      '頭頸部からのリンパを受ける頸部の節群です。自分で触れられる節であり、最初に診察される節でもあります。「頸部のどこか」が意味をもつのはこのためです。',
      GROUP_NOTE.note,
      GROUP_NOTE.noteJa
    ),
    nodes(
      'axillary-nodes',
      'Axillary nodes',
      '腋窩リンパ節',
      'The groups in the armpit, draining the arm and **most of the breast on that side**. That second job is why they are examined and sampled when they are.',
      '腋窩にある節群で、上肢と**同側の乳房の大部分**からのリンパを受けます。乳房のリンパを受けるという役割が、これらの節が診察・生検の対象となる理由です。',
      GROUP_NOTE.note,
      GROUP_NOTE.noteJa
    ),
    nodes(
      'inguinal-nodes',
      'Inguinal nodes',
      '鼠径リンパ節',
      'The groups in the groin, draining the leg, the lower abdominal wall and the outside of the genitals and anus. Everything they collect goes on to the cisterna chyli and up the thoracic duct.',
      '鼠径部の節群で、下肢・下腹壁・外陰部および肛門周囲からのリンパを受けます。ここに集まったものはすべて乳び槽を経て胸管を上行します。',
      GROUP_NOTE.note,
      GROUP_NOTE.noteJa
    ),
    route(
      'left-drainage-route',
      'The long way up',
      '長い経路（左・下半身）',
      'From the groin to the sac in the abdomen and on up the thoracic duct: the route that everything below the diaphragm takes, whichever side it started on.',
      '鼠径部から腹部の乳び槽へ、そして胸管を上行する経路です。横隔膜より下のリンパは、左右どちらから始まってもこの経路をとります。',
      'A representative route, not a map. The lymphatics of the body are far denser than the few vessels drawn here.',
      '代表的な経路であり、地図ではありません。実際のリンパ管網は、ここに描いた数本よりはるかに密です。'
    ),
    route(
      'right-drainage-route',
      'The short way in',
      '短い経路（右上半身）',
      'From the right armpit straight to the right lymphatic duct. A quarter of the body, and a journey of a few centimetres.',
      '右腋窩から右リンパ本幹へ直接向かう経路です。体の約1/4を担いながら、距離はわずか数センチです。',
      'A representative route, not a map.',
      '代表的な経路であり、地図ではありません。'
    ),
  ]);
}

export const LYMPHATIC_DRAINAGE_META = Object.freeze({
  id: 'lymphatic-drainage',
  status: 'alpha',
  title: 'Where lymph drains',
  titleJa: 'リンパはどこへ流れるか',
  subtitle: 'Point to identify; click or tap to pin a duct or a group of nodes',
  subtitleJa: '触れて部位を確認・クリック／タップで本幹・リンパ節群を固定',
  inspection: { background: 'studio' },
  palette: {
    duct: DRAINAGE_SCENE_COLORS['thoracic-duct'],
    nodes: DRAINAGE_SCENE_COLORS['axillary-nodes'],
    route: DRAINAGE_SCENE_COLORS['left-drainage-route'],
  },
  legend: [
    { key: 'duct', label: 'The two ducts', labelJa: '2つの本幹' },
    { key: 'nodes', label: 'Node groups', labelJa: 'リンパ節群' },
    { key: 'route', label: 'Representative routes', labelJa: '代表的な経路' },
  ],
  stages: [
    {
      id: 'groups',
      name: 'Where the nodes are',
      nameJa: 'リンパ節群の位置',
      at: 0,
      summary: 'Neck, armpit and groin — the three groups that can be felt, in a body for scale.',
      summaryJa: '頸部・腋窩・鼠径——触れることのできる3つの節群を、全身の中で示します。',
    },
    {
      id: 'ducts',
      name: 'And where it all ends up',
      nameJa: 'そして最終的な行き先',
      at: 1,
      summary:
        'One short duct on the right for a quarter of the body, and one long one for the other three quarters.',
      summaryJa:
        '右の短い本幹が体の約1/4を、左の長い胸管が残りの約3/4を受け持ちます。',
    },
  ],
  range: { start: 'Nodes', startJa: '節群', end: 'Ducts', endJa: '本幹' },
  progressLabel: { label: 'Body transparency', labelJa: '体の輪郭の透過' },
  disclaimer:
    'EDUCATIONAL SCHEMATIC MODEL — The lymphatic system as routes and groups, in a body silhouette for scale. **Each node group is a marker, not a model of a node**: a real group is a dozen or more nodes of a few millimetres, and no node size or count may be read off this model. One node at its own scale is the separate scene `lymph-node-anatomy`. **Nothing flows**, and no length, calibre or position is a measurement. The great majority of lymphatic vessels and node groups — mediastinal, abdominal, pelvic, popliteal and the rest — the spleen, the thymus, the tonsils and the valves in the vessels are not drawn, and nothing here is anyone’s lymphatic system.',
  disclaimerJa:
    '教育用模式モデル：リンパ系を経路と節群として、縮尺の目安となる全身の輪郭の中に描いたものです。**各リンパ節群はマーカーであり、リンパ節そのもののモデルではありません**——実際には数ミリの節が十数個以上集まっており、このモデルから節の大きさや個数を読み取ることはできません。1つのリンパ節を節自身の縮尺で描いたものは別シーン `lymph-node-anatomy` にあります。**このシーンでは流れは表現しておらず**、長さ・口径・位置のいずれも実測値ではありません。縦隔・腹部・骨盤・膝窩をはじめとする大多数のリンパ管と節群、脾臓・胸腺・扁桃・リンパ管の弁は描いておらず、特定の個人のリンパ系でもありません。',
  disclaimerShort: 'Educational schematic — not for clinical use',
  disclaimerShortJa: '教育用模式図 — 臨床使用不可',
});
