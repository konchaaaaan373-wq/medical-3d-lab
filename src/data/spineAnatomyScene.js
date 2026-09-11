/**
 * What the spine anatomy scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/spine.js`. The copy answers
 * the two questions a spine is actually asked. **Which region** — a neck, a
 * chest and a low back do different jobs and fail differently — and **what is
 * one segment made of**, because a disc, a facet and a nerve root all live in
 * one, and which of them is involved is the question.
 *
 * It names no herniation, no stenosis and no fracture. Disease is somebody
 * else's scene.
 */

export const SPINE_SCENE_COLORS = Object.freeze({
  'cervical-spine': '#e8c98a',
  'thoracic-spine': '#d9a94e',
  'lumbar-spine': '#c4883c',
  sacrum: '#ded7c0',
  'vertebral-body': '#e8c98a',
  pedicle: '#c98f4e',
  lamina: '#a8c46a',
  'facet-joint': '#6aa8c4',
  'spinous-process': '#8fbf96',
  'annulus-fibrosus': '#d88f7a',
  'nucleus-pulposus': '#f0dfa8',
  'spinal-canal': '#bcd8e0',
  'spinal-cord': '#e8d8b0',
  'cauda-equina': '#e0c07a',
  'nerve-root': '#e8b45a',
});

export const SPINE_NATURAL_COLORS = Object.freeze({
  'cervical-spine': '#e6e0cd',
  'thoracic-spine': '#e2dbc4',
  'lumbar-spine': '#ded5bc',
  sacrum: '#ded7c0',
  'vertebral-body': '#e6e0cd',
  pedicle: '#ded5bc',
  lamina: '#ded5bc',
  'facet-joint': '#cfe6ea',
  'spinous-process': '#e2dbc4',
  'annulus-fibrosus': '#d8c0b0',
  'nucleus-pulposus': '#f0e6c8',
  'spinal-canal': '#dce6ea',
  'spinal-cord': '#ece0c4',
  'cauda-equina': '#e4d4b0',
  'nerve-root': '#e8dcb4',
});

export const SPINE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const BLOCK_NOTE = {
  note: '**Drawn as blocks.** A region here is a stack of simplified vertebrae — enough to show how many there are and which way the column bends. One level is drawn properly, in the lumbar spine, and that is the one to look at for what a vertebra is made of.',
  noteJa:
    '**簡略化した椎骨の積み重ねとして描いています。** 椎骨の数と脊柱の弯曲が分かる程度の形です。腰椎の1椎間だけを詳しく描いており、椎骨の構成はそちらで確認してください。',
};

export function spineStructureCopy() {
  const entry = (group, groupJa, legendKey, tags) => (
    id, name, nameJa, description, descriptionJa, note = null, noteJa = null
  ) => [
    id,
    {
      name, nameJa,
      hierarchy: ['Spine', group, name],
      hierarchyJa: ['脊柱', groupJa, nameJa],
      description, descriptionJa, note, noteJa,
      colorKey: id, legendKey, tags,
    },
  ];

  const region = entry('The whole column', '脊柱全体', 'region', ['region']);
  const bone = entry('One segment: the bone', '1椎間：骨', 'segment', ['segment']);
  const disc = entry('One segment: the disc', '1椎間：椎間板', 'disc', ['segment', 'disc']);
  const neural = entry('What is in the canal', '脊柱管の中', 'neural', ['neural']);

  return new Map([
    region(
      'cervical-spine',
      'Cervical spine',
      '頸椎',
      'Seven, at the top, and the most mobile part of the column — which is the same reason it is the least protected. It curves **forwards**.',
      '上端の7個の椎骨で、脊柱のなかで最も可動性が高く、それゆえ最も保護が乏しい部分でもあります。**前方**に弯曲しています。',
      BLOCK_NOTE.note,
      BLOCK_NOTE.noteJa
    ),
    region(
      'thoracic-spine',
      'Thoracic spine',
      '胸椎',
      'Twelve, each carrying a pair of ribs, and the least mobile part of the column for that reason. It curves **backwards**.',
      '12個の椎骨からなり、それぞれが1対の肋骨を支えます。そのため脊柱のなかで最も可動性が低い部分です。**後方**に弯曲しています。',
      BLOCK_NOTE.note,
      BLOCK_NOTE.noteJa
    ),
    region(
      'lumbar-spine',
      'Lumbar spine',
      '腰椎',
      'Five, at the bottom, with the largest bodies because they carry the most. It curves **forwards** again — and the segment drawn in full in this scene is one of these.',
      '下部の5個の椎骨で、最も大きな荷重を担うため椎体も最大です。再び**前方**に弯曲しており、このシーンで詳しく描いている椎間もこの部分にあります。',
      BLOCK_NOTE.note,
      BLOCK_NOTE.noteJa
    ),
    region(
      'sacrum',
      'Sacrum',
      '仙骨',
      'Five bones fused into one wedge, joining the column to the pelvis. Nothing moves between its levels, which is why it is drawn as one piece.',
      '5個の椎骨が癒合した1つのくさび状の骨で、脊柱と骨盤をつなぎます。各分節の間に動きはないため、1つの塊として描いています。',
      'The coccyx below it and the joints with the pelvis are not drawn.',
      'その下の尾骨と、骨盤との関節は描いていません。'
    ),
    bone(
      'vertebral-body',
      'Vertebral body',
      '椎体',
      'The drum at the front that takes the weight. Everything else on a vertebra is behind it, and everything behind it is reached through the two struts on either side.',
      '前方にあって荷重を受ける円柱状の部分です。椎骨のほかの構造はすべてその後方にあり、そこへ至る経路は両側の2本の柱だけです。'
    ),
    bone(
      'pedicle',
      'Pedicles',
      '椎弓根',
      'The two short struts from the back of the body to the arch. **They are the only bridge between the front of a vertebra and the back of it** — which is why a screw placed in a spine goes through one, and why their width is a thing that matters.',
      '椎体の後方から椎弓へ伸びる2本の短い柱です。**椎骨の前方部と後方部をつなぐ唯一の橋であり**、脊椎に挿入するスクリューがここを通るのも、その太さが問題になるのもそのためです。'
    ),
    bone(
      'lamina',
      'Laminae',
      '椎弓板',
      'The two plates that close the arch behind, meeting at the spinous process. **They are the back wall of the canal** — so removing them is what makes room in a canal that has run out of it.',
      '後方で椎弓を閉じ、棘突起で合流する2枚の板です。**脊柱管の後壁そのもの**であり、これを切除することが、狭くなった脊柱管に余地をつくる操作になります。'
    ),
    bone(
      'facet-joint',
      'Facet joints',
      '椎間関節',
      'The small paired joints between one level and the next, behind the canal. **They decide which way a level can move** — and being real joints, they wear like real joints.',
      '脊柱管の後方で、上下の椎骨をつなぐ左右1対の小さな関節です。**その椎間がどの方向に動けるかを決めており**、真の関節であるため、関節と同じように摩耗します。'
    ),
    bone(
      'spinous-process',
      'Spinous process',
      '棘突起',
      'The projection you can feel down somebody’s back. It is the part of a vertebra a hand can find, which makes it how a level is counted from outside.',
      '背中で触れることのできる後方への突起です。外から触知できる唯一の部分であり、椎骨の高位を数える基準になります。'
    ),
    disc(
      'annulus-fibrosus',
      'Annulus fibrosus',
      '線維輪',
      'The tough ring round the outside of a disc, in layers running in alternating directions. It is the **container** — and while it holds, whatever is inside stays inside.',
      '椎間板の外周をなす強靱な輪で、走行方向の異なる線維層が重なっています。内容物を保持する**容器**であり、これが保たれている限り、内部のものは内部にとどまります。'
    ),
    disc(
      'nucleus-pulposus',
      'Nucleus pulposus',
      '髄核',
      'The soft centre, mostly water, which is what lets a disc act as a cushion. **It is the thing the ring is containing** — and the difference between it bulging and it getting out is the difference between two different words.',
      '椎間板の中心にある軟らかい部分で、大部分が水分です。椎間板が緩衝材として働けるのはこの性質によります。**線維輪が保持しているのはこの構造であり**、膨隆と脱出の違いはここで決まります。'
    ),
    neural(
      'spinal-canal',
      'Spinal canal',
      '脊柱管',
      'The tunnel the arches make, running the length of the column behind the bodies. It is a **space**, and everything about it is a question of how much room is in it.',
      '各椎弓が連なってできる、椎体の後方を縦走するトンネルです。**空間**であり、これに関する問題はすべて、その余裕がどれだけあるかという問いに帰着します。',
      'Drawn as a body, because a space cannot otherwise be pointed at. The ligaments lining it and the fat and veins in it are not drawn.',
      '空間は他に指し示す方法がないため、1つの立体として描いています。内面を覆う靱帯や、内部の脂肪・静脈叢は描いていません。'
    ),
    neural(
      'spinal-cord',
      'Spinal cord',
      '脊髄',
      '**It does not run the whole way down.** The cord ends around the top of the lumbar spine; below that the canal holds a bundle of roots instead. That single fact is why a needle low down is a different proposition from a needle high up.',
      '**脊髄は脊柱管の全長には及びません。** 腰椎上部のあたりで終わり、それより下では神経根の束が脊柱管を占めます。腰部での穿刺が上位での穿刺と性質を異にするのは、この1点によります。'
    ),
    neural(
      'cauda-equina',
      'Cauda equina',
      '馬尾',
      'The bundle of roots filling the canal below the end of the cord, on their way to the levels they leave at. Loose strands rather than one structure — which is why they move out of the way of a needle, and why pressure on them is described differently from pressure on a cord.',
      '脊髄が終わった下方の脊柱管を満たす神経根の束で、それぞれが出ていく高位へ向かいます。1本の構造ではなく緩い束であるため、穿刺針を避けて動きます。これらの圧迫が脊髄の圧迫と区別して記述されるのもこのためです。'
    ),
    neural(
      'nerve-root',
      'Nerve roots',
      '神経根',
      'The pair leaving the canal at this level, passing out beneath the pedicles. **A disc at a level is in a position to press on a root**, and which root it is decides where the trouble is felt.',
      'この高位で脊柱管を出る左右1対の神経根で、椎弓根の下を通って外へ向かいます。**その高位の椎間板は神経根を圧迫しうる位置にあり**、どの神経根かによって症状の出る部位が決まります。',
      'One pair is drawn, at the detailed level only. The roots of every other level are not drawn.',
      '詳細に描いた高位の1対のみを描いています。他の高位の神経根は描いていません。'
    ),
  ]);
}

export const SPINE_ANATOMY_META = Object.freeze({
  id: 'spine-anatomy',
  status: 'alpha',
  title: 'Interactive spine anatomy',
  titleJa: '触れて学ぶ脊柱の解剖',
  subtitle: 'Point to identify; click or tap to pin a region, a part of one vertebra, or what is in the canal',
  subtitleJa: '触れて部位を確認・クリック／タップで各部位・1椎骨の構成・脊柱管の内容を固定',
  inspection: { background: 'studio' },
  palette: {
    region: SPINE_SCENE_COLORS['thoracic-spine'],
    segment: SPINE_SCENE_COLORS.lamina,
    disc: SPINE_SCENE_COLORS['annulus-fibrosus'],
    neural: SPINE_SCENE_COLORS['nerve-root'],
  },
  legend: [
    { key: 'region', label: 'The four regions', labelJa: '4つの部位' },
    { key: 'segment', label: 'One vertebra', labelJa: '1つの椎骨' },
    { key: 'disc', label: 'The disc', labelJa: '椎間板' },
    { key: 'neural', label: 'What is in the canal', labelJa: '脊柱管の中' },
  ],
  stages: [
    {
      id: 'column',
      name: 'The whole column',
      nameJa: '脊柱全体',
      at: 0,
      summary: 'Neck forward, chest back, low back forward, and a wedge at the bottom joining it to the pelvis.',
      summaryJa: '前弯する頸椎、後弯する胸椎、再び前弯する腰椎、そして骨盤につながる仙骨。',
    },
    {
      id: 'inside',
      name: 'What is inside it',
      nameJa: '内部にあるもの',
      at: 1,
      summary:
        'The bone fades: a tunnel behind the bodies, a cord that stops partway down, and a bundle of roots below that.',
      summaryJa:
        '骨を薄くすると、椎体の後方を走るトンネル、途中で終わる脊髄、そしてその下の神経根の束が見えます。',
    },
  ],
  range: { start: 'Bone', startJa: '骨', end: 'Canal', endJa: '脊柱管' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A spine drawn schematically, with **one lumbar level drawn in full and the rest as blocks**. **Nothing moves and nothing bends**, and no height, width, angle or curve is a measurement. The detailed level is in its place in the column at the same scale as everything else — it is not enlarged and not lifted out. The ribs, the ligaments of the column, the muscles, the intervertebral foramina as openings, the ligamentum flavum, the epidural fat and veins, the coccyx and the roots of every other level are not drawn, and nothing here is anyone’s spine.',
  disclaimerJa:
    '教育用肉眼解剖モデル：脊柱を模式的に描いたもので、**腰椎の1椎間のみを詳細に、他は簡略化した積み木として**描いています。**このシーンでは何も動かず、屈伸もしません。** 高さ・幅・角度・弯曲のいずれも実測値ではありません。詳細に描いた椎間は、他と同じ縮尺のまま脊柱内の本来の位置にあり、拡大も取り出しもしていません。肋骨・脊柱の靱帯・筋・椎間孔・黄色靱帯・硬膜外脂肪と静脈叢・尾骨・他高位の神経根は描いておらず、特定の個人の脊柱でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
