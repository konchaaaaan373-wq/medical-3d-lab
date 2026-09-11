/**
 * What the lymph node scene says, in both languages.
 *
 * The geometry is `scenes/hematologic/organs/lymphNode.js`. One sentence
 * carries the copy: **many vessels in, one out**. Everything a node does
 * follows from lymph having to pass through it rather than round it, and every
 * entry here is written to lead back to that.
 *
 * The scale is the node's own. The body-scale routes are a different scene,
 * `lymphatic-drainage`, because one model cannot draw a millimetre and half a
 * metre at the same time and stay honest.
 */

export const NODE_SCENE_COLORS = Object.freeze({
  capsule: '#cfc3b0',
  cortex: '#8f6bbd',
  medulla: '#d8a8c8',
  'lymphoid-follicle': '#5c3f8c',
  'afferent-vessels': '#8fc4a8',
  'efferent-vessel': '#5c9c7c',
  hilum: '#c46a5a',
});

export const NODE_NATURAL_COLORS = Object.freeze({
  capsule: '#d8cec0',
  cortex: '#c8a8b8',
  medulla: '#dcc0cc',
  'lymphoid-follicle': '#b490a8',
  'afferent-vessels': '#cfd8c8',
  'efferent-vessel': '#c4cfc0',
  hilum: '#c89888',
});

export const NODE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By region', labelJa: '領域別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SCHEMATIC_NOTE = {
  note: '**A schematic node, not a magnified one.** The regions are drawn as three depths of one outline so that they can be told apart and clicked; a real node’s cortex, paracortex and medulla are not arranged as even shells. No size, proportion or count may be read off this model.',
  noteJa:
    '**拡大した実構造ではなく、模式的なリンパ節です。** 各領域は、見分けて選択できるように1つの外形を3つの深さで描いたものです。実際の皮質・傍皮質・髄質は、均一な殻状には配置されていません。大きさ・比率・数のいずれも、このモデルから読み取らないでください。',
};

export function lymphNodeStructureCopy() {
  const entry = (group, groupJa, legendKey, tags) => (
    id, name, nameJa, description, descriptionJa, note = null, noteJa = null
  ) => [
    id,
    {
      name, nameJa,
      hierarchy: ['Lymph node', group, name],
      hierarchyJa: ['リンパ節', groupJa, nameJa],
      description, descriptionJa, note, noteJa,
      colorKey: id, legendKey, tags,
    },
  ];

  const region = entry('Inside the node', 'リンパ節の内部', 'region', ['region']);
  const vessel = entry('In and out', '出入りする管', 'vessel', ['vessel']);

  return new Map([
    region(
      'capsule',
      'Capsule',
      '被膜',
      'The fibrous coat round the node. Lymph arriving from outside collects just inside it before it goes any further, so the capsule is both the boundary and the first thing anything arriving meets.',
      'リンパ節を包む線維性の膜です。外部から到達したリンパはまずこの直下に集まってから先へ進むため、被膜は境界であると同時に、到達したものが最初に触れる構造でもあります。',
      SCHEMATIC_NOTE.note,
      SCHEMATIC_NOTE.noteJa
    ),
    region(
      'cortex',
      'Cortex',
      '皮質',
      'The outer region, just inside the capsule, and where the nests of cells that respond to something new are. **A node that is working gets bigger here first** — which is why a node that has started to swell is telling you something about what reached it.',
      '被膜の直下にある外側の領域で、新たな異物に反応する細胞の集簇があるのはここです。**働いているリンパ節はまずこの部分が大きくなります**——腫脹の始まりは、そこに到達したものについての情報です。',
      SCHEMATIC_NOTE.note,
      SCHEMATIC_NOTE.noteJa
    ),
    region(
      'medulla',
      'Medulla',
      '髄質',
      'The inner region, reaching towards the hilum. Lymph passes through it last, on its way out — so what leaves a node has been through the cortex *and* the medulla, in that order.',
      '門に向かって広がる内側の領域です。リンパは最後にここを通って外へ出ます。したがって、リンパ節から出ていくものは皮質と髄質を、この順に通過しています。',
      SCHEMATIC_NOTE.note,
      SCHEMATIC_NOTE.noteJa
    ),
    region(
      'lymphoid-follicle',
      'Lymphoid follicles',
      'リンパ濾胞',
      'Rounded nests in the cortex — the part that actually enlarges when a node responds. One structure here, with several drawn, because which follicle is which is not a question anybody asks.',
      '皮質にある球形の細胞集簇で、リンパ節が反応したときに実際に大きくなるのはこの部分です。個々の濾胞を区別して問うことはないため、複数描いて1つの構造として扱っています。',
      SCHEMATIC_NOTE.note,
      SCHEMATIC_NOTE.noteJa
    ),
    vessel(
      'afferent-vessels',
      'Afferent vessels',
      '輸入リンパ管',
      '**Several**, arriving anywhere on the convex surface. They are how everything travelling in lymph — from an infection, from a wound, from a tumour — arrives, and there is no way past.',
      '**複数**あり、凸側の表面のどこからでも入ります。感染巣・創部・腫瘍から、リンパに乗って運ばれるものはすべてここから到達し、リンパ節を迂回する経路はありません。',
      'One structure with several vessels drawn. Their valves and the sinus just inside the capsule are not drawn.',
      '複数の管を描いて1つの構造として扱っています。弁と被膜下の洞は描いていません。'
    ),
    vessel(
      'efferent-vessel',
      'Efferent vessel',
      '輸出リンパ管',
      '**One**, leaving at the hilum. Many in and one out is the whole shape of a node: lymph has to pass *through* it, which is why a node is where things get stopped — and why the node downstream of a tumour is the one that is sampled.',
      '門から出る**1本**の管です。「多数が入り、1本が出る」がリンパ節の構造そのものであり、リンパは必ず節の中を通過します。異物がここで捕捉されるのも、腫瘍の下流のリンパ節が生検の対象になるのも、この構造によります。'
    ),
    vessel(
      'hilum',
      'Hilum',
      '門',
      'The dent on the concave side, and **the only way out** — the efferent vessel leaves here, and the artery and vein enter here. Everything that is not lymph uses this door.',
      '凹側のくぼみで、**唯一の出口**です。輸出リンパ管はここから出て、動脈と静脈はここから入ります。リンパ以外のものはすべてこの1か所を通ります。',
      'Drawn as a marker at the dent, so that the place can be pointed at without pointing at a vessel. The artery and vein are not drawn.',
      'くぼみの位置を、血管を指さずに示せるようにマーカーとして描いています。動脈・静脈は描いていません。'
    ),
  ]);
}

export const LYMPH_NODE_ANATOMY_META = Object.freeze({
  id: 'lymph-node-anatomy',
  status: 'alpha',
  title: 'Interactive lymph node anatomy',
  titleJa: '触れて学ぶリンパ節の解剖',
  subtitle: 'Point to identify; click or tap to pin a region or a vessel',
  subtitleJa: '触れて部位を確認・クリック／タップで各領域・管を固定',
  inspection: { background: 'studio' },
  palette: {
    region: NODE_SCENE_COLORS.cortex,
    vessel: NODE_SCENE_COLORS['afferent-vessels'],
  },
  legend: [
    { key: 'region', label: 'Inside the node', labelJa: 'リンパ節の内部' },
    { key: 'vessel', label: 'In and out', labelJa: '出入りする管' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'Many in, one out',
      nameJa: '多数が入り、1本が出る',
      at: 0,
      summary: 'Several vessels arrive on the convex side; a single one leaves at the dent on the other.',
      summaryJa: '凸側から複数の管が入り、反対側のくぼみから1本だけが出ます。',
    },
    {
      id: 'inside',
      name: 'What lymph passes through',
      nameJa: 'リンパが通り抜けるもの',
      at: 1,
      summary: 'The capsule fades: cortex with its follicles outside, medulla reaching towards the way out.',
      summaryJa: '被膜を薄くすると、外側に濾胞をもつ皮質、そして出口へ向かう髄質が見えます。',
    },
  ],
  range: { start: 'Outside', startJa: '外側', end: 'Inside', endJa: '内部' },
  progressLabel: { label: 'Capsule transparency', labelJa: '被膜の透過' },
  disclaimer:
    'EDUCATIONAL SCHEMATIC MODEL — One lymph node, drawn at its own scale. **This is a schematic node, not a magnified one**: the regions are three depths of one outline so that each can be seen and selected, and a real node is not arranged as even shells. **Nothing flows and nothing swells**, and no size, proportion or count is a measurement. The subcapsular and medullary sinuses, the paracortex, the germinal centres, the reticular framework, the artery and vein at the hilum and the valves in the vessels are not drawn. The body-scale routes are a separate scene, and nothing here is anyone’s lymph node.',
  disclaimerJa:
    '教育用模式モデル：1つのリンパ節を、その節自身の縮尺で描いたものです。**拡大した実構造ではなく模式図です**——各領域は、見分けて選択できるように1つの外形を3つの深さで描いたもので、実際のリンパ節は均一な殻状の構造ではありません。**このシーンでは流れも腫脹も起こらず**、大きさ・比率・数のいずれも実測値ではありません。被膜下洞・髄洞・傍皮質・胚中心・細網構造・門の動静脈・リンパ管の弁は描いていません。全身のリンパ路は別シーンにあり、特定の個人のリンパ節でもありません。',
  disclaimerShort: 'Educational schematic — not for clinical use',
  disclaimerShortJa: '教育用模式図 — 臨床使用不可',
});
