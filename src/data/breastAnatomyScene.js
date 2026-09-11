/**
 * What the breast anatomy scene says, in both languages.
 *
 * The geometry is `scenes/reproductive/organs/breast.js`. The copy answers the
 * three questions a breast is actually asked, and nothing else: **which tissue**
 * (duct or lobule — the two things disease is named after), **how deep** (skin,
 * fat, gland, muscle: what a hand or a needle passes through), and **where does
 * it drain** (the axilla).
 *
 * It names no lump, no screening interval, no stage and no operation. Disease
 * is somebody else's scene.
 */

export const BREAST_SCENE_COLORS = Object.freeze({
  skin: '#e8c3a4',
  nipple: '#9c5a50',
  areola: '#b06a5c',
  'lactiferous-ducts': '#7fb0c4',
  lobules: '#5d8fa8',
  'adipose-tissue': '#f2e2ac',
  'cooper-ligaments': '#e0d4b0',
  'pectoralis-major': '#b4514a',
  'axillary-tail': '#e8d59c',
  'axillary-nodes': '#c46a5a',
});

export const BREAST_NATURAL_COLORS = Object.freeze({
  skin: '#e6c4a6',
  nipple: '#a4665c',
  areola: '#b87a6c',
  'lactiferous-ducts': '#ddd0c0',
  lobules: '#d4c4b4',
  'adipose-tissue': '#f2e6bc',
  'cooper-ligaments': '#e4dcc4',
  'pectoralis-major': '#b8645c',
  'axillary-tail': '#eee0b4',
  'axillary-nodes': '#c49080',
});

export const BREAST_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const COUNT_NOTE = {
  note: '**The number drawn is a display count.** A breast has fifteen to twenty duct systems, each ending in dozens of lobules; drawn in full they are a thicket nobody can click. **No count may be read off this model.**',
  noteJa:
    '**描いてある数は表示用の数です。** 実際には15〜20の乳管系があり、それぞれが多数の小葉に終わります。すべて描けば互いに重なって選択できません。**このモデルから数を読み取らないでください。**',
};

export function breastStructureCopy() {
  const entry = (group, groupJa, legendKey, tags) => (
    id, name, nameJa, description, descriptionJa, note = null, noteJa = null
  ) => [
    id,
    {
      name, nameJa,
      hierarchy: ['Breast', group, name],
      hierarchyJa: ['乳房', groupJa, nameJa],
      description, descriptionJa, note, noteJa,
      colorKey: id, legendKey, tags,
    },
  ];

  const surface = entry('The surface', '体表', 'surface', ['surface']);
  const gland = entry('The gland', '乳腺', 'gland', ['gland']);
  // The fat gets a tag of its own: it is what the ducts and lobules are inside,
  // so a view about them has to be able to put it away without putting them
  // away too.
  const filler = entry('The gland', '乳腺', 'gland', ['gland', 'filler']);
  const ductal = entry('The gland', '乳腺', 'gland', ['gland', 'ductal']);
  const lobular = entry('The gland', '乳腺', 'gland', ['gland', 'lobular']);
  const support = entry('What holds it', '支持組織', 'support', ['support']);
  const deep = entry('What it sits on', '深部', 'chest', ['chest-wall']);
  const drainage = entry('Where it drains', 'リンパ流', 'drainage', ['axillary']);

  return new Map([
    surface(
      'skin',
      'Skin',
      '皮膚',
      'The covering, and the first thing anyone looks at. It is attached to the gland beneath it by strands — so something pulling on those strands **shows on the surface** as a dimple, long before it can be seen any other way.',
      '乳房を覆う、最初に観察される部分です。下の乳腺とは索状の組織でつながっているため、それが引っ張られると**体表に陥凹として現れます**——他のどの方法よりも早く。'
    ),
    surface(
      'nipple',
      'Nipple',
      '乳頭',
      'Where **every** duct system in the breast ends. Fifteen to twenty separate systems open here, which is why a discharge from a nipple is news about a duct and why its retraction is news about what is pulling on one.',
      '乳房内の**すべて**の乳管系が終わる場所です。15〜20の独立した系がここに開口するため、乳頭からの分泌は乳管についての情報であり、乳頭の陥凹は乳管を引く何かについての情報です。'
    ),
    surface(
      'areola',
      'Areola',
      '乳輪',
      'The darker ring round the nipple, and the target the whole gland points at. Describing where something is in a breast is describing where it is **relative to this**.',
      '乳頭を取り巻く濃い色の輪で、乳腺全体が向かう的です。乳房内の位置を記述するとは、**これを基準とした位置**を記述することです。'
    ),
    ductal(
      'lactiferous-ducts',
      'Lactiferous ducts',
      '乳管',
      'Branching tubes running from the nipple back into the gland. **They all converge on one place**, so a duct system is a tree with its trunk at the nipple — and "ductal" names everything that starts in one of these tubes.',
      '乳頭から乳腺の奥へ分枝しながら伸びる管です。**すべてが1か所に収束する**ため、乳管系は乳頭を幹とする樹状構造をなします。「乳管由来（ductal）」とは、この管の中から始まるもののことです。',
      COUNT_NOTE.note,
      COUNT_NOTE.noteJa
    ),
    lobular(
      'lobules',
      'Lobules',
      '小葉',
      'The clusters at the **far end** of each duct, where milk is actually made. "Lobular" names everything that starts here rather than in the tube leading to it — which is the other half of the division the whole subject is built on.',
      '各乳管の**末端**にある房状の構造で、乳汁が実際に産生されるのはここです。「小葉由来（lobular）」とは、管ではなくこの末端から始まるもののことで、この区別が主題全体の基礎になります。',
      COUNT_NOTE.note,
      COUNT_NOTE.noteJa
    ),
    filler(
      'adipose-tissue',
      'Adipose tissue',
      '脂肪組織',
      'What most of a breast is, and what gives it its shape. How much fat there is relative to gland changes with age — and it is why the same breast is easy to examine at one age and hard at another.',
      '乳房の大部分を占め、その形を決めているものです。脂肪と乳腺の比は加齢とともに変化し、同じ乳房でも年齢によって診察のしやすさが変わるのはこのためです。'
    ),
    support(
      'cooper-ligaments',
      'Cooper’s ligaments',
      'クーパー靱帯',
      'Strands running from the chest wall through the gland to the skin. They hold the breast’s shape — and because they reach the skin, **something tethering one of them puts a dimple on the surface**.',
      '胸壁から乳腺内を通って皮膚へ至る索状の組織です。乳房の形を保つとともに、皮膚に達しているため、**これが牽引されると体表に陥凹が生じます**。',
      COUNT_NOTE.note,
      COUNT_NOTE.noteJa
    ),
    deep(
      'pectoralis-major',
      'Pectoralis major',
      '大胸筋',
      'The muscle the breast lies on, and **not part of it**. The gland slides over this muscle — so whether something moves with the muscle or independently of it is a question with an answer, and the answer is about depth.',
      '乳房が乗っている筋であり、**乳房の一部ではありません**。乳腺はこの筋の上を滑動します。したがって「筋とともに動くか、独立して動くか」は答えのある問いであり、その答えは深さについてのものです。',
      'Drawn as a sheet. Its origins and insertion, the muscles behind it and the ribs are not drawn.',
      '筋のシートとして描いています。起始・停止、その深部の筋、肋骨は描いていません。'
    ),
    drainage(
      'axillary-tail',
      'Axillary tail',
      '腋窩尾部',
      'The gland does not stop at the round part. A tail of it runs up and out towards the armpit — **it is breast tissue, in the axilla**, which is why breast can be found where a reader would not think to look for it.',
      '乳腺は円形の部分で終わりません。一部が上外側へ、腋窩へ向かって伸びています——**腋窩にある乳腺組織**であり、乳腺が予想外の場所に見つかりうるのはこのためです。'
    ),
    drainage(
      'axillary-nodes',
      'Axillary nodes',
      '腋窩リンパ節',
      '**Most of the breast drains here.** That single fact is why the armpit is examined whenever a breast is, and why these nodes are the ones sampled. They belong to the armpit, not to the breast, and the breast sends its lymph to them.',
      '**乳房の大部分はここへ流れます。** この1点により、乳房の診察時には必ず腋窩も診察され、生検の対象となるのもこれらの節です。これらは腋窩の構造であり、乳房がそこへリンパを送っています。',
      'Markers for a group, not models of nodes; one node at its own scale is `lymph-node-anatomy`. The internal mammary and other routes are not drawn.',
      'リンパ節群の位置を示すマーカーであり、リンパ節そのもののモデルではありません。1つのリンパ節を節自身の縮尺で描いたものは `lymph-node-anatomy` にあります。内胸リンパ節などの他の経路は描いていません。'
    ),
  ]);
}

export const BREAST_ANATOMY_META = Object.freeze({
  id: 'breast-anatomy',
  status: 'alpha',
  title: 'Interactive breast anatomy',
  titleJa: '触れて学ぶ乳房の解剖',
  subtitle: 'Point to identify; click or tap to pin a duct, a lobule or a node group',
  subtitleJa: '触れて部位を確認・クリック／タップで乳管・小葉・リンパ節群を固定',
  inspection: { background: 'studio' },
  palette: {
    surface: BREAST_SCENE_COLORS.areola,
    gland: BREAST_SCENE_COLORS['lactiferous-ducts'],
    support: BREAST_SCENE_COLORS['cooper-ligaments'],
    chest: BREAST_SCENE_COLORS['pectoralis-major'],
    drainage: BREAST_SCENE_COLORS['axillary-nodes'],
  },
  legend: [
    { key: 'surface', label: 'Skin, nipple and areola', labelJa: '皮膚・乳頭・乳輪' },
    { key: 'gland', label: 'Ducts, lobules and fat', labelJa: '乳管・小葉・脂肪' },
    { key: 'support', label: 'What holds it', labelJa: '支持組織' },
    { key: 'chest', label: 'The chest wall', labelJa: '胸壁' },
    { key: 'drainage', label: 'Where it drains', labelJa: 'リンパ流' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'From outside',
      nameJa: '外から見る',
      at: 0,
      summary: 'Skin, areola and nipple, on a chest wall, with the gland running out towards the armpit.',
      summaryJa: '胸壁の上の皮膚・乳輪・乳頭と、腋窩へ向かって伸びる乳腺。',
    },
    {
      id: 'inside',
      name: 'Ducts and lobules',
      nameJa: '乳管と小葉',
      at: 1,
      summary:
        'The skin and fat fade: every duct converging on one place, and the lobules at the far end of each.',
      summaryJa:
        '皮膚と脂肪を薄くすると、1か所に収束するすべての乳管と、その末端の小葉が見えます。',
    },
  ],
  range: { start: 'Outside', startJa: '外側', end: 'Gland', endJa: '乳腺' },
  progressLabel: { label: 'Skin and fat transparency', labelJa: '皮膚・脂肪の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right breast, drawn schematically. **The shape is deliberately plain: what this model is for is the arrangement inside it, not the outline.** No size is a measurement, and **the numbers of ducts, lobules and ligaments drawn are display counts** — a breast has fifteen to twenty duct systems and far more lobules. **Nothing moves and nothing changes with age or the cycle.** The node markers are markers for a group, not models of nodes. The internal mammary drainage, the ribs and the muscles behind the pectoralis, the retromammary space, the blood supply and the nerves are not drawn, and nothing here is anyone’s breast.',
  disclaimerJa:
    '教育用肉眼解剖モデル：右乳房を模式的に描いたものです。**形状は意図的に単純化しています——このモデルの目的は外形ではなく内部の配置です。** 大きさは実測値ではなく、**描いてある乳管・小葉・靱帯の数は表示用の数です**——実際には15〜20の乳管系と、はるかに多数の小葉があります。**このシーンでは何も動かず、加齢や月経周期による変化も表現していません。** リンパ節のマーカーは節群の位置を示すもので、リンパ節のモデルではありません。内胸リンパ流・肋骨と大胸筋深部の筋・乳房後隙・血管・神経は描いておらず、特定の個人の乳房でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
