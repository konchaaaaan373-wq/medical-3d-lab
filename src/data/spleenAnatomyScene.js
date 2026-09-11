/**
 * What the spleen anatomy scene says, in both languages.
 *
 * The shape is `scenes/hematologic/organs/spleen.js` and the division is
 * `organs/spleenParts.js`. One distinction carries this scene and the copy
 * repeats it where a reader is looking at either side of it:
 *
 * **The two segments are territories of blood supply, not layers of tissue.**
 * Red and white pulp are histology and are not drawn. What is drawn is what a
 * splenic artery makes of the organ — two territories with little crossing
 * between them, which is why part of a spleen can be removed and the rest live.
 */

export const SPLEEN_SCENE_COLORS = Object.freeze({
  'superior-segment': '#a85068',
  'inferior-segment': '#6f3247',
  'splenic-artery': '#c0453f',
  'superior-terminal-branch': '#d86a52',
  'inferior-terminal-branch': '#e08a62',
  'splenic-vein': '#4a6fc0',
  'pancreatic-tail': '#deb18c',
});

export const SPLEEN_NATURAL_COLORS = Object.freeze({
  'superior-segment': '#7c3f52',
  'inferior-segment': '#7c3f52',
  'splenic-artery': '#a8423c',
  'superior-terminal-branch': '#a8423c',
  'inferior-terminal-branch': '#a8423c',
  'splenic-vein': '#4f5f88',
  'pancreatic-tail': '#deb18c',
});

export const SPLEEN_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Arterial segments', labelJa: '動脈区域別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function spleenStructureCopy() {
  const vessel = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Splenic vessels', 'Vessel', name],
      hierarchyJa: ['脾動静脈', '脈管', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'vessel',
      tags: ['vessel'],
    },
  ];

  return new Map([
    [
      'superior-segment',
      {
        name: 'Superior segment',
        nameJa: '上区域',
        hierarchy: ['Spleen', 'Parenchyma', 'Superior segment'],
        hierarchyJa: ['脾臓', '脾実質', '上区域'],
        description:
          'The territory of the superior terminal branch of the splenic artery. Little blood crosses between this and the segment below it, which is why part of a spleen can be taken and the rest survive.',
        descriptionJa:
          '脾動脈の上終枝が支配する領域です。下区域との間で血流がほとんど交通しないため、脾臓の一部だけを切除しても残りが生き残ります。',
        note: 'A territory of blood supply, not a layer of tissue. Red and white pulp are histology and are not drawn here.',
        noteJa:
          '血流の支配領域であって、組織の層ではありません。赤脾髄・白脾髄は組織学的な構造で、ここでは描いていません。',
        colorKey: 'superior-segment',
        legendKey: 'parenchyma',
        tags: ['parenchyma'],
      },
    ],
    [
      'inferior-segment',
      {
        name: 'Inferior segment',
        nameJa: '下区域',
        hierarchy: ['Spleen', 'Parenchyma', 'Inferior segment'],
        hierarchyJa: ['脾臓', '脾実質', '下区域'],
        description:
          'The territory of the inferior terminal branch. The plane between the two segments is close to avascular, which is what makes a partial splenectomy possible at all.',
        descriptionJa:
          '脾動脈の下終枝が支配する領域です。2つの区域の境界面はほぼ無血管で、部分脾摘が成り立つのはこのためです。',
        note: 'The plane drawn here is flat and passes through the hilum. A real one is neither flat nor in the same place in two people, and two segments is the usual number rather than the only one — three and four occur.',
        noteJa:
          'ここでは脾門を通る平面として描いていますが、実際の境界面は平面ではなく、位置も個人差があります。区域数も「2つ」が最も多いだけで、3つ・4つの例もあります。',
        colorKey: 'inferior-segment',
        legendKey: 'parenchyma',
        tags: ['parenchyma'],
      },
    ],
    vessel(
      'splenic-artery',
      'Splenic artery',
      '脾動脈',
      'Reaches the spleen along the top of the pancreas and divides before it arrives. Where it divides is what makes the organ two territories rather than one.',
      '膵臓の上縁に沿って脾臓へ向かい、脾門に達する前に分岐します。この分岐位置こそが、脾臓を2つの支配領域に分けているものです。',
      'Drawn as one tortuous-free tube. The real artery is markedly tortuous, and its short gastric and left gastroepiploic branches are not drawn.',
      '蛇行のない1本の管として描いています。実際の脾動脈は強く蛇行し、短胃動脈・左胃大網動脈といった分枝もここでは描いていません。'
    ),
    vessel(
      'superior-terminal-branch',
      'Superior terminal branch',
      '上終枝',
      'Supplies the superior segment. It enters the hilum as its own vessel rather than as a branch given off inside the organ.',
      '上区域を支配します。臓器内部で分かれるのではなく、独立した血管として脾門に入ります。'
    ),
    vessel(
      'inferior-terminal-branch',
      'Inferior terminal branch',
      '下終枝',
      'Supplies the inferior segment.',
      '下区域を支配します。'
    ),
    vessel(
      'splenic-vein',
      'Splenic vein',
      '脾静脈',
      'Leaves the hilum behind the artery and runs back along the pancreas to join the superior mesenteric vein and become the portal vein — which is why a spleen enlarges when portal pressure rises.',
      '脾門から動脈の背側を通って出て、膵臓に沿って走り、上腸間膜静脈と合流して門脈になります。門脈圧が上がると脾臓が腫れるのはこのためです。',
      'Stops at the edge of this model. The portal confluence it forms is in `portal-hypertension`.',
      'このモデルの端で途切れています。門脈への合流は `portal-hypertension` のシーンにあります。'
    ),
    [
      'pancreatic-tail',
      {
        name: 'Tail of the pancreas',
        nameJa: '膵尾部',
        hierarchy: ['Neighbours', 'Pancreas', 'Tail'],
        hierarchyJa: ['周囲の臓器', '膵臓', '膵尾部'],
        description:
          'Reaches the splenic hilum. It is drawn because it is the reason a splenectomy can injure a pancreas.',
        descriptionJa:
          '脾門まで達しています。脾摘の際に膵臓を損傷しうる理由そのものなので、ここに描いています。',
        note: 'Context only: the rest of the gland is `pancreas-anatomy`.',
        noteJa: '位置関係を示すためだけの表示です。膵臓の全体は `pancreas-anatomy` にあります。',
        colorKey: 'pancreatic-tail',
        legendKey: 'neighbour',
        tags: ['neighbour'],
      },
    ],
  ]);
}

export const SPLEEN_ANATOMY_META = Object.freeze({
  id: 'spleen-anatomy',
  status: 'alpha',
  title: 'Interactive splenic anatomy',
  titleJa: '触れて学ぶ脾臓の解剖',
  subtitle: 'Point to identify; click or tap to pin a segment or one of the splenic vessels',
  subtitleJa: '触れて部位を確認・クリック／タップで区域・脾動静脈を固定',
  inspection: { background: 'studio' },
  palette: {
    parenchyma: SPLEEN_SCENE_COLORS['superior-segment'],
    vessel: SPLEEN_SCENE_COLORS['splenic-artery'],
    neighbour: SPLEEN_SCENE_COLORS['pancreatic-tail'],
  },
  legend: [
    { key: 'parenchyma', label: 'Arterial segments', labelJa: '動脈区域' },
    { key: 'vessel', label: 'Splenic artery and vein', labelJa: '脾動脈・脾静脈', activeFrom: 0.35 },
    { key: 'neighbour', label: 'Tail of the pancreas', labelJa: '膵尾部' },
  ],
  stages: [
    {
      id: 'segments',
      name: 'Two segments',
      nameJa: '2つの区域',
      at: 0,
      summary: 'The parenchyma, divided at the hilum into the territories of the artery’s two terminal branches.',
      summaryJa: '脾実質を、脾門で上下2つの終枝支配領域に分けて示しています。',
    },
    {
      id: 'vessels',
      name: 'Where the division comes from',
      nameJa: '区域を決めているもの',
      at: 1,
      summary:
        'The parenchyma fades: the splenic artery divides before the hilum, and each branch supplies one segment.',
      summaryJa:
        '脾実質を薄くすると、脾門の手前で分岐する脾動脈と、各区域を支配する終枝が見えます。',
    },
  ],
  range: { start: 'Segments', startJa: '区域', end: 'Vessels', endJa: '脈管' },
  progressLabel: { label: 'Parenchyma transparency', labelJa: '脾実質の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Shape is schematic and no dimension is measured. The segment plane is flat and passes through the hilum; real ones are neither flat nor identical between people, and two segments is the usual number rather than the only one. Red and white pulp are not drawn.',
  disclaimerJa:
    '教育用肉眼解剖モデル：形状は模式的で、いずれの寸法も実測値ではありません。区域境界は脾門を通る平面として描いていますが、実際の境界面は平面ではなく個人差があり、区域数も2つとは限りません。赤脾髄・白脾髄は描いていません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
