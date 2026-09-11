/**
 * What the nose and paranasal sinus scene says, in both languages.
 *
 * The geometry is `scenes/respiratory/organs/nose.js`. The copy is laid out the
 * way air goes — **in at the nostril, past the shelves, out at the back** —
 * with the sinuses hung off the middle of that, because where a sinus opens is
 * the whole reason this anatomy is worth looking at in three dimensions.
 *
 * It names no infection, no allergy, no polyp, no operation. Disease is
 * somebody else's scene.
 */

export const NOSE_SCENE_COLORS = Object.freeze({
  'external-nose': '#e9bda4',
  'nasal-vestibule': '#d9a58c',
  'nasal-septum': '#d8c2bb',
  'lateral-nasal-wall': '#ddd0b6',
  'hard-palate': '#f0e8d4',
  'inferior-turbinate': '#dc9c88',
  'middle-turbinate': '#d48f9e',
  'superior-turbinate': '#cc8a9a',
  'inferior-meatus': '#a9cfe0',
  'middle-meatus': '#8fc0d8',
  'superior-meatus': '#7aafd0',
  'maxillary-sinus': '#bcd9dd',
  'maxillary-ostium': '#4f9bb8',
  'frontal-sinus': '#c8dfe2',
  'ethmoid-air-cells': '#d3e4df',
  'sphenoid-sinus': '#cfd9ea',
  'nasolacrimal-duct': '#9fc7b0',
  'olfactory-region': '#d8b6d6',
  nasopharynx: '#c3bedd',
});

export const NOSE_NATURAL_COLORS = Object.freeze({
  'external-nose': '#e8bda6',
  'nasal-vestibule': '#d8a68e',
  'nasal-septum': '#e2c4b2',
  'lateral-nasal-wall': '#e6dcc8',
  'hard-palate': '#ece4d0',
  'inferior-turbinate': '#d8988a',
  'middle-turbinate': '#d49a8c',
  'superior-turbinate': '#d09c8e',
  'inferior-meatus': '#cddfe2',
  'middle-meatus': '#cddfe2',
  'superior-meatus': '#cddfe2',
  'maxillary-sinus': '#d6e2e0',
  'maxillary-ostium': '#c8b8a8',
  'frontal-sinus': '#d6e2e0',
  'ethmoid-air-cells': '#d8e2dc',
  'sphenoid-sinus': '#d6dce6',
  'nasolacrimal-duct': '#ccc0a8',
  'olfactory-region': '#d0b0b8',
  nasopharynx: '#d2c6c0',
});

export const NOSE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function noseStructureCopy() {
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
      hierarchy: ['Nose and sinuses', group, name],
      hierarchyJa: ['鼻と副鼻腔', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const outside = entry('External nose', '外鼻', 'frame', ['midline', 'outer']);
  const wall = entry('Walls of the cavity', '鼻腔の壁', 'frame', ['wall']);
  const midline = entry('Walls of the cavity', '鼻腔の壁', 'frame', ['midline']);
  const shelf = entry('Turbinates', '鼻甲介', 'turbinate', ['turbinate']);
  const airway = entry('Nasal airway', '鼻腔（気道）', 'airway', ['space']);
  const sinus = entry('Paranasal sinuses', '副鼻腔', 'sinus', ['sinus']);
  const opening = entry('Openings into the nose', '鼻腔へ開く経路', 'special', ['opening']);

  return new Map([
    outside(
      'external-nose',
      'External nose',
      '外鼻',
      'The part of a nose you can see: a wedge of cartilage and bone standing off the face, narrow at the root between the eyes and broad at the base. It is **one midline structure**, and the two cavities behind it are separated by the septum, not by anything out here.',
      '顔から張り出した、軟骨と骨でできたくさび形の部分です。眼の間の鼻根では細く、下方の鼻翼では広がります。**正中の1つの構造**であり、その奥の2つの鼻腔を分けているのは鼻中隔であって、外鼻ではありません。',
      'One smooth shell. The named cartilages of an external nose are not separately drawn, and it is part-transparent at rest so that the space inside it can be seen.',
      '滑らかな1枚の殻として描いています。外鼻を構成する各軟骨は個別には描いておらず、内部の空間が見えるよう既定で半透明にしています。'
    ),
    outside(
      'nasal-vestibule',
      'Nasal vestibule',
      '鼻前庭',
      'The first room inside the nostril — and the only part of the inside of a nose that is **lined with skin** rather than mucosa. It carries hairs, and it is where a nose stops being outside.',
      '鼻孔のすぐ内側の空間で、鼻の内部で唯一**粘膜ではなく皮膚に覆われた**部分です。鼻毛が生えており、ここまでが「外」にあたります。',
      'Drawn as the space itself, because a space cannot otherwise be pointed at. No hairs, no glands, and the change of lining is described rather than shown.',
      '空間は他に指し示す方法がないため、空間そのものとして描いています。鼻毛や腺は描いておらず、皮膚から粘膜への移行は説明にとどめています。'
    ),
    midline(
      'nasal-septum',
      'Nasal septum',
      '鼻中隔',
      'The plate down the middle that makes two cavities out of one. It is **part bone and part cartilage**, and it is very often not exactly central — which is normal, and only matters when it narrows one side enough to be felt.',
      '鼻腔を左右に分ける正中の板で、**骨部と軟骨部**からなります。完全に正中にあることはむしろ少なく、わずかな弯曲は正常です。片側が狭くなって自覚症状が出るときだけ問題になります。',
      'Drawn straight and in the midline, as one plate. Its bony and cartilaginous parts are not separated, and **no deviation is modelled**.',
      'まっすぐな正中の1枚の板として描いています。骨部と軟骨部は分けておらず、**弯曲は表現していません**。'
    ),
    wall(
      'lateral-nasal-wall',
      'Lateral nasal wall',
      '鼻腔外側壁',
      'The outer wall of one cavity, and the one with everything on it: the three turbinates hang from it, the gutters under them run along it, and every sinus and the tear duct open through it. It is the wall this scene is built to let you look at.',
      '片側の鼻腔の外側の壁で、鼻の解剖のほとんどはここにあります。3つの鼻甲介がここから張り出し、その下の鼻道がここを走り、すべての副鼻腔と鼻涙管はこの壁を通って開口します。',
      'One sheet. The bones that make it up — maxilla, ethmoid, palatine, sphenoid, lacrimal, inferior concha — are not separated, and it is hidden in the views that look at the sinuses behind it.',
      '1枚のシートとして描いています。これを構成する上顎骨・篩骨・口蓋骨・蝶形骨・涙骨・下鼻甲介骨は分けていません。副鼻腔を見る視点では非表示にしています。'
    ),
    wall(
      'hard-palate',
      'Hard palate',
      '硬口蓋',
      'The floor of the nose, which is the same plate as the roof of the mouth. It is **flat, not sloped**: the floor of a nasal cavity runs backwards horizontally, which is why a tube passed along it goes into the throat rather than up into the head.',
      '鼻腔の底であり、同時に口腔の天井でもある1枚の板です。**斜めではなく水平**で、鼻腔底は後方へまっすぐ走ります。経鼻的にチューブを入れるとき、上方ではなく水平に進めるのはこのためです。',
      'Drawn across the midline as one plate, without its sutures, without the soft palate behind it and without the mouth below it.',
      '正中をまたぐ1枚の板として描いています。縫合線、後方に続く軟口蓋、下方の口腔は描いていません。'
    ),
    shelf(
      'inferior-turbinate',
      'Inferior turbinate',
      '下鼻甲介',
      'The lowest and largest of the three shelves, and the one you see when you look into a nostril. Its lining **swells and shrinks by the hour** in life, which is what makes a nose feel blocked on one side and then the other.',
      '3つの鼻甲介のうち最も下方で最も大きく、鼻孔から覗いて見えるのはこの構造です。粘膜は生理的に**数時間単位で腫脹と収縮を繰り返し**、左右交代性に鼻閉を感じる（nasal cycle）原因になっています。',
      'A single smooth shelf, drawn at one size. **Nothing here swells**: the cycle is described and not animated.',
      '滑らかな1枚の棚として、1つの大きさで描いています。**このモデルでは腫脹しません**——鼻サイクルは説明にとどめています。'
    ),
    shelf(
      'middle-turbinate',
      'Middle turbinate',
      '中鼻甲介',
      'The middle shelf, and the landmark everything surgical is described from. What matters about it is **what is underneath**: the gutter it roofs is where the maxillary, frontal and anterior ethmoid sinuses all arrive.',
      '中段の棚で、鼻内手術のほとんどはこの構造を基準に記述されます。重要なのは**その下**です——中鼻甲介が覆う中鼻道に、上顎洞・前頭洞・前部篩骨洞がすべて開口します。',
      'Drawn as a plain shelf. Its attachment to the skull base, and the variant in which it is itself air-filled, are not modelled.',
      '単純な棚として描いています。頭蓋底への付着や、含気化する変異（concha bullosa）は表現していません。'
    ),
    shelf(
      'superior-turbinate',
      'Superior turbinate',
      '上鼻甲介',
      'The smallest shelf, at the back and top. It is short, it covers only the posterior part of the wall, and the recess above and behind it is where the sphenoid sinus opens.',
      '最も小さく、後上方にある棚です。短く、外側壁の後方部だけを覆います。その上後方のくぼみ（蝶篩陥凹）に蝶形骨洞が開口します。',
      'Drawn as a smaller copy of the others. The supreme turbinate, present in some people, is not drawn.',
      '他の2つを小さくした形で描いています。人によって存在する最上鼻甲介は描いていません。'
    ),
    airway(
      'inferior-meatus',
      'Inferior meatus',
      '下鼻道',
      'The gutter under the lowest shelf. **Only one thing opens into it** — the tear duct — and nothing drains here from a sinus, which is what separates it from the gutter above.',
      '最下段の棚の下の空間です。ここに開口するのは**鼻涙管ただ1つ**で、副鼻腔はどれもここには開きません。その点が中鼻道との違いです。',
      'Drawn as the space itself, bounded above by the turbinate and below by the floor. Its lining, and the fold over the tear duct’s opening, are not drawn.',
      '上を下鼻甲介、下を鼻腔底で区切られた空間そのものとして描いています。粘膜や鼻涙管開口部のひだは描いていません。'
    ),
    airway(
      'middle-meatus',
      'Middle meatus',
      '中鼻道',
      'The busiest few millimetres in the head. The **maxillary, frontal and anterior ethmoid** sinuses all open into this one gutter, so a swelling here closes three sinuses at once rather than one.',
      '頭部で最も重要な数ミリの空間です。**上顎洞・前頭洞・前部篩骨洞**がすべてこの1つの鼻道に開口するため、ここが腫脹すると3つの副鼻腔が同時に閉塞します。',
      'Drawn as the space itself. The uncinate process, the ethmoid bulla and the hiatus semilunaris that shape it are not drawn, so **the arrangement within it cannot be read off this model** — only that the three arrive here.',
      '空間そのものとして描いています。鉤状突起・篩骨胞・半月裂孔は描いていないため、**中鼻道内部の細かい配置はこのモデルからは読み取れません**。3つがここに集まることだけを示しています。'
    ),
    airway(
      'superior-meatus',
      'Superior meatus',
      '上鼻道',
      'The short gutter under the top shelf, at the back. The **posterior ethmoid** cells open into it, and the sphenoid opens just above and behind it.',
      '最上段の棚の下にある、後方の短い空間です。**後部篩骨洞**がここに開口し、蝶形骨洞はそのすぐ上後方に開きます。',
      'Drawn as the space itself. The sphenoethmoidal recess above it is described and not separately drawn.',
      '空間そのものとして描いています。その上方の蝶篩陥凹は説明にとどめ、形としては分けていません。'
    ),
    airway(
      'nasopharynx',
      'Nasopharynx',
      '上咽頭',
      'Where both cavities arrive. Air turns downwards here into the throat, and the tube from each middle ear opens on its side wall — which is why the ear and the nose are one problem rather than two.',
      '左右の鼻腔が合流する場所です。空気はここで下方の咽頭へ向きを変えます。側壁には左右の耳管が開口しており、耳と鼻の問題がしばしば一続きになるのはこのためです。',
      'Drawn as one shared space across the midline. The openings of the Eustachian tubes, the adenoid and the soft palate below are described and not drawn; the tube itself is a structure in the ear scene.',
      '正中をまたぐ1つの共有空間として描いています。耳管開口部・アデノイド・下方の軟口蓋は説明にとどめ、形としては描いていません。耳管そのものは耳のシーンにあります。'
    ),
    sinus(
      'maxillary-sinus',
      'Maxillary sinus',
      '上顎洞',
      'The largest sinus, filling the bone of the cheek beside and below the cavity. Its **opening is near its roof, not its floor**, so what collects in it has to be carried upwards to leave — the single most consequential fact in this scene.',
      '最も大きな副鼻腔で、鼻腔の外側下方、頬部の骨の中を占めます。**自然孔は底ではなく天井近くにあり**、内容物は上方へ運ばれなければ排出されません。このシーンで最も重要な事実です。',
      'One smooth room. Its relations to the teeth below and the orbit above, and the septa some people have inside it, are not drawn.',
      '滑らかな1つの空洞として描いています。下方の歯根や上方の眼窩との関係、人によって内部にある隔壁は描いていません。'
    ),
    sinus(
      'maxillary-ostium',
      'Maxillary ostium',
      '上顎洞自然孔',
      'The sinus’s own way out, high on the wall it shares with the nose, leading into the middle meatus. It is a few millimetres across; **mucus leaves through it uphill**, moved by cilia rather than by gravity.',
      '上顎洞が鼻腔と共有する壁の高い位置にある自然の開口部で、中鼻道へ通じます。直径は数ミリで、**粘液は重力ではなく線毛運動によって上方へ運ばれて**排出されます。',
      'Drawn as a short straight passage. The infundibulum it actually opens through, and the accessory openings many people have, are not drawn.',
      'まっすぐな短い通路として描いています。実際に経由する篩骨漏斗や、多くの人に見られる副孔は描いていません。'
    ),
    sinus(
      'frontal-sinus',
      'Frontal sinus',
      '前頭洞',
      'The sinus in the forehead, above the root of the nose. It drains **down** a narrow channel into the middle meatus, and it is the one sinus that is often unequal between the two sides or missing altogether.',
      '鼻根部の上方、前頭骨の中にある副鼻腔です。細い通路を通って**下方へ**中鼻道に排出されます。左右差が大きく、片側または両側が欠損していることも珍しくありません。',
      'Drawn on one side at one size, with its drainage channel described rather than modelled. **No sinus volume here is a measurement**, and the normal variation between people is not shown.',
      '片側を1つの大きさで描いており、排出路は説明にとどめて形としては描いていません。**このモデルの副鼻腔の容積は実測値ではなく**、個人差も表現していません。'
    ),
    sinus(
      'ethmoid-air-cells',
      'Ethmoid air cells',
      '篩骨洞（篩骨蜂巣）',
      'Not one room but a **honeycomb of small ones**, between the cavity and the eye socket. The wall between them and the orbit is paper-thin, which is why what happens in them is spoken about in the same breath as the eye.',
      '1つの空洞ではなく、鼻腔と眼窩の間にある**小さな蜂巣の集合**です。眼窩との間の骨壁は紙のように薄く（紙様板）、篩骨洞の病変が眼窩と関連して語られるのはそのためです。',
      'Six cells stand for a honeycomb whose number and arrangement differ in everybody. They are drawn as one selectable structure; the anterior and posterior groups, which drain to different places, are described and not separated.',
      '6つの房で蜂巣を代表させています。実際の数と配置は個人差が大きい構造です。1つの選択単位として描いており、開口先の異なる前部と後部は説明にとどめて分けていません。'
    ),
    sinus(
      'sphenoid-sinus',
      'Sphenoid sinus',
      '蝶形骨洞',
      'The deepest sinus, right in the middle of the skull behind everything else. The pituitary gland sits **directly above it**, which is the reason a route to the pituitary runs through a nose at all.',
      '最も深部にある副鼻腔で、他のすべての構造の後方、頭蓋のほぼ中央にあります。**すぐ上方に下垂体**があり、下垂体への到達経路が鼻を通るのはこのためです。',
      'One room on one side. The septum inside it, the carotid artery and optic nerve in its walls, and the pituitary above it are described and not drawn.',
      '片側の1つの空洞として描いています。内部の隔壁、壁を走る内頸動脈と視神経、上方の下垂体は説明にとどめ、描いていません。'
    ),
    opening(
      'nasolacrimal-duct',
      'Nasolacrimal duct',
      '鼻涙管',
      'The channel from the inner corner of the eye down into the lowest gutter. Tears do not evaporate; they run down here, which is why crying makes a nose run and why an eye drop can be tasted.',
      '眼の内眼角から下鼻道へ下る管です。涙は蒸発するのではなくここを流れ落ちます。泣くと鼻水が出るのも、点眼薬の味を感じることがあるのも、この経路によります。',
      'Drawn as a plain tube. The puncta, canaliculi and lacrimal sac above it, and the fold at its opening, are not drawn.',
      '単純な管として描いています。上方の涙点・涙小管・涙嚢、および開口部のひだ（Hasner弁）は描いていません。'
    ),
    opening(
      'olfactory-region',
      'Olfactory region',
      '嗅部',
      'A patch of the roof and the top of the septum — **a small area, high up and out of the main stream of air**, which is why sniffing helps and why a blocked nose takes smell with it. Its nerve filaments pass straight up through the bone into the skull.',
      '鼻腔の天井と鼻中隔上部の限られた領域です。**面積は小さく、空気の主流路から外れた高い位置**にあるため、においを嗅ぐときに強く吸い込むと届きやすく、鼻閉で嗅覚が落ちるのもこのためです。嗅神経の線維は骨（篩板）を貫いて直上の頭蓋内へ入ります。',
      'The patch is drawn at one size and the filaments are drawn as five threads standing for many. The cribriform plate they pass through, and the olfactory bulb above it, are not drawn.',
      '嗅部は1つの大きさで、嗅糸は多数を代表する5本として描いています。貫通する篩板と、その上の嗅球は描いていません。'
    ),
  ]);
}

export const NOSE_ANATOMY_META = Object.freeze({
  id: 'nose-anatomy',
  status: 'alpha',
  title: 'Interactive nose and sinus anatomy',
  titleJa: '触れて学ぶ鼻・副鼻腔の解剖',
  subtitle: 'Point to identify; click or tap to pin a turbinate, a gutter or a sinus',
  subtitleJa: '触れて部位を確認・クリック／タップで鼻甲介・鼻道・副鼻腔を固定',
  inspection: { background: 'studio' },
  palette: {
    frame: NOSE_SCENE_COLORS['external-nose'],
    turbinate: NOSE_SCENE_COLORS['inferior-turbinate'],
    airway: NOSE_SCENE_COLORS['middle-meatus'],
    sinus: NOSE_SCENE_COLORS['maxillary-sinus'],
    special: NOSE_SCENE_COLORS['olfactory-region'],
  },
  legend: [
    { key: 'frame', label: 'Nose and its walls', labelJa: '外鼻と鼻腔の壁' },
    { key: 'turbinate', label: 'Turbinates', labelJa: '鼻甲介' },
    { key: 'airway', label: 'Nasal airway', labelJa: '鼻腔（気道）' },
    { key: 'sinus', label: 'Paranasal sinuses', labelJa: '副鼻腔' },
    { key: 'special', label: 'Openings into the nose', labelJa: '鼻腔へ開く経路' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'From outside',
      nameJa: '外から',
      at: 0,
      summary: 'A wedge on the face, and the septum behind it dividing one space into two.',
      summaryJa: '顔から張り出したくさびと、その奥で空間を左右に分ける鼻中隔です。',
    },
    {
      id: 'inside',
      name: 'The lateral wall',
      nameJa: '外側壁',
      at: 1,
      summary:
        'The septum steps back: three shelves on the outer wall, a gutter under each, and the sinuses arriving in the middle one.',
      summaryJa:
        '鼻中隔を薄くすると外側壁が現れます。3つの鼻甲介と、その下の3つの鼻道、そして中鼻道に集まる副鼻腔の開口です。',
    },
  ],
  range: { start: 'Outside', startJa: '外から', end: 'Lateral wall', endJa: '外側壁' },
  progressLabel: { label: 'Septum transparency', labelJa: '鼻中隔の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right nasal cavity with a whole external nose, septum, palate and nasopharynx; **the left cavity, its turbinates and its sinuses are not drawn**. Nothing here moves: no air flows, no mucus is cleared, and **nothing swells** — the hourly cycle of turbinate swelling is described and not animated. No length, calibre, angle or sinus volume is a measurement, and the normal variation between people — a deviated septum, an absent frontal sinus, an air-filled middle turbinate — is not shown. The uncinate process, ethmoid bulla, cribriform plate, olfactory bulb, teeth, orbit, soft palate and Eustachian tube openings are not drawn, and nothing here is anyone’s nose.',
  disclaimerJa:
    '教育用肉眼解剖モデル：右の鼻腔に、正中の外鼻・鼻中隔・硬口蓋・上咽頭を添えて描いたものです。**左の鼻腔・鼻甲介・副鼻腔は描いていません。** このシーンでは何も動きません——空気は流れず、粘液も運ばれず、**腫脹も起こりません**（鼻甲介の生理的な腫脹周期は説明にとどめています）。長さ・口径・角度・副鼻腔の容積はいずれも実測値ではなく、鼻中隔弯曲・前頭洞の欠損・含気化した中鼻甲介といった個人差も表現していません。鉤状突起・篩骨胞・篩板・嗅球・歯・眼窩・軟口蓋・耳管開口部は描いておらず、特定の個人の鼻でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
