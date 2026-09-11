/**
 * What the skeleton overview says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/skeleton.js`. The copy is laid
 * out as the two skeletons it describes — **the column, then the two girdles
 * and what hangs off each** — because the whole point of looking at a skeleton
 * whole is the difference between the two joins.
 *
 * **Every entry says what this model is not**: an overview of a bone is not a
 * model of that bone, and the scenes that do model one are named in the copy so
 * a reader goes there instead.
 */

export const SKELETON_SCENE_COLORS = Object.freeze({
  skull: '#ece4d0',
  mandible: '#e6ddc6',
  'cervical-spine': '#e2d6ba',
  'thoracic-spine': '#e6dcc2',
  'lumbar-spine': '#eae2cc',
  'sacrum-and-coccyx': '#e8e0c8',
  ribs: '#e9e1cb',
  sternum: '#f0e8d4',
  clavicle: '#d8b978',
  scapula: '#e0c98e',
  humerus: '#ece4d0',
  'radius-and-ulna': '#e6ddc6',
  'hand-bones': '#e4dac2',
  pelvis: '#c79a6a',
  femur: '#ece4d0',
  patella: '#e8e0c8',
  'tibia-and-fibula': '#e6ddc6',
  'foot-bones': '#e4dac2',
});

export const SKELETON_NATURAL_COLORS = Object.freeze({
  skull: '#ece4d0',
  mandible: '#e8e0cc',
  'cervical-spine': '#e8e0cc',
  'thoracic-spine': '#eae2ce',
  'lumbar-spine': '#eae2ce',
  'sacrum-and-coccyx': '#e8e0cc',
  ribs: '#eae2cc',
  sternum: '#ece4d0',
  clavicle: '#ece4d0',
  scapula: '#e8e0cc',
  humerus: '#ece4d0',
  'radius-and-ulna': '#e8e0cc',
  'hand-bones': '#e6dec8',
  pelvis: '#eae2ce',
  femur: '#ece4d0',
  patella: '#e8e0cc',
  'tibia-and-fibula': '#e8e0cc',
  'foot-bones': '#e6dec8',
});

export const SKELETON_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function skeletonStructureCopy() {
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
      hierarchy: ['Skeleton', group, name],
      hierarchyJa: ['骨格', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const axial = entry('The column', '体軸骨格', 'axial', ['axial']);
  const shoulderGirdle = entry('The shoulder girdle', '上肢帯', 'shoulder', ['shoulder', 'appendicular']);
  const arm = entry('The arm', '上肢', 'arm', ['arm', 'appendicular']);
  const pelvicGirdle = entry('The pelvic girdle', '下肢帯', 'pelvis', ['pelvis-girdle', 'appendicular']);
  const leg = entry('The leg', '下肢', 'leg', ['leg', 'appendicular']);

  const overview = (where, whereJa) => [
    `An overview. **This is not a model of that bone** — ${where}.`,
    `概観です。**この形はその骨のモデルではありません**——${whereJa}。`,
  ];

  return new Map([
    axial(
      'skull',
      'Skull',
      '頭蓋',
      'The top of the column: a vault for the brain with a face on the front of it. It sits on the first vertebra and nods on it, and everything else in the body hangs below.',
      '体軸の最上部で、脳を容れる円蓋とその前面の顔面からなります。第1頸椎の上に載って前後に頷き、体の他のすべてはこれより下に連なります。',
      ...overview(
        'it is one smooth shell with no sutures, no orbits and no base, and the brain inside it is `brain-anatomy`',
        '縫合・眼窩・頭蓋底のない滑らかな1つの殻で、内部の脳は `brain-anatomy` にあります'
      )
    ),
    axial(
      'mandible',
      'Mandible',
      '下顎骨',
      'The only bone of the skull that moves, hung from a joint just in front of each ear.',
      '頭蓋で唯一動く骨で、左右の耳の前にある顎関節から吊り下がっています。',
      ...overview('the mouth it belongs to is `oral-anatomy`', '所属する口腔は `oral-anatomy` にあります')
    ),
    axial(
      'cervical-spine',
      'Cervical spine',
      '頸椎',
      'Seven vertebrae carrying the head. They are the smallest and the most mobile of the column, which is the trade every part of a spine makes in one direction or the other.',
      '頭部を支える7個の椎骨です。脊柱の中で最も小さく最も可動性が高く、脊柱の各部が可動性と支持性のどちらに寄っているかを示す一方の端にあたります。',
      ...overview('the vertebrae are not drawn separately — `spine-anatomy` does that', '個々の椎骨は分けていません。`spine-anatomy` がそれを行います')
    ),
    axial(
      'thoracic-spine',
      'Thoracic spine',
      '胸椎',
      'Twelve vertebrae, each carrying a pair of ribs. It is the least mobile length of the column **because** of the cage attached to it.',
      '12個の椎骨からなり、それぞれに1対の肋骨が付着します。脊柱で最も可動性が低いのは、まさにこの胸郭が付着しているためです。',
      ...overview('the vertebrae and the joints with the ribs are not drawn — `spine-anatomy` draws a vertebra', '個々の椎骨と肋椎関節は描いていません。椎骨そのものは `spine-anatomy` にあります')
    ),
    axial(
      'lumbar-spine',
      'Lumbar spine',
      '腰椎',
      'Five large vertebrae between the cage and the pelvis, with nothing attached to the sides of them. They are the biggest in the column and they carry the most.',
      '胸郭と骨盤の間にある5個の大きな椎骨で、側方には何も付着しません。脊柱で最大であり、最も大きな荷重を受けます。',
      ...overview('the discs, the canal and the nerve roots are `spine-anatomy`', '椎間板・脊柱管・神経根は `spine-anatomy` にあります')
    ),
    axial(
      'sacrum-and-coccyx',
      'Sacrum and coccyx',
      '仙骨・尾骨',
      'The bottom of the column, and **the place the legs are attached to it**. Five vertebrae fused into one wedge, locked into the pelvis on both sides — a joint built not to move.',
      '脊柱の最下部であり、**下肢が体軸に接続する場所**です。5個の椎骨が癒合した楔状の骨で、左右で骨盤に固定されています。動かないようにつくられた関節です。',
      ...overview('the floor slung across the ring below it is `pelvic-floor-anatomy`', 'その下に張られる骨盤底は `pelvic-floor-anatomy` にあります')
    ),
    axial(
      'ribs',
      'Ribs',
      '肋骨',
      'Twelve pairs, each from a thoracic vertebra round to the front. **The lower ones do not reach the sternum**, which is why the cage is open below and why a chest can change shape at all.',
      '12対あり、それぞれ胸椎から前方へ回り込みます。**下位の肋骨は胸骨に届かず**、そのため胸郭は下方で開いており、胸郭の形が変化できます。',
      ...overview('drawn as twelve plain hoops a side, without their heads, necks, angles or cartilages', '頭・頸・角・肋軟骨のない、片側12本の単純な弓として描いています')
    ),
    axial(
      'sternum',
      'Sternum',
      '胸骨',
      'The plate down the front of the chest that the upper ribs arrive at — and the bone the **only** joint between an arm and the trunk sits on top of.',
      '胸部前面の板状の骨で、上位肋骨がここに集まります。そして、**腕と体幹をつなぐ唯一の関節**が載っている骨でもあります。',
      ...overview('its three parts and the angle between two of them are not drawn', '3つの部分と、その境界の胸骨角は描いていません')
    ),
    shoulderGirdle(
      'clavicle',
      'Clavicle',
      '鎖骨',
      '**The only bone that attaches an arm to the trunk.** It runs from the top corner of the sternum out to the point of the shoulder, and everything the arm does is transmitted through that one small joint at its inner end.',
      '**腕を体幹につないでいる唯一の骨です。** 胸骨の上外側角から肩の先端まで走り、腕が受けるすべての力が内側端の小さな胸鎖関節を通ります。',
      ...overview('the joint at each end is not drawn — the shoulder itself is `shoulder-anatomy`', '両端の関節は描いていません。肩関節そのものは `shoulder-anatomy` にあります')
    ),
    shoulderGirdle(
      'scapula',
      'Scapula',
      '肩甲骨',
      'A triangle lying on the back of the cage that **touches no other bone except through the clavicle**. It is held on by muscle, and it slides. That is why an arm can reach where it can — and why a shoulder comes apart in ways a hip does not.',
      '胸郭の後面に載る三角形の骨で、**鎖骨を介する以外はどの骨とも接していません**。筋のみで保持され、胸郭上を滑走します。上肢の可動域が広いのはこのためであり、肩が脱臼しやすい理由でもあります。',
      ...overview('its spine, acromion, glenoid and coracoid are not drawn — `shoulder-anatomy` draws them', '肩甲棘・肩峰・関節窩・烏口突起は描いていません。`shoulder-anatomy` がそれらを描きます')
    ),
    arm(
      'humerus',
      'Humerus',
      '上腕骨',
      'One bone from shoulder to elbow. Its top end sits in a socket so shallow that the joint depends on soft tissue rather than on bone.',
      '肩から肘までの1本の骨です。上端は非常に浅い関節窩に収まっており、この関節の安定は骨ではなく軟部組織に依存します。',
      ...overview('its head, tubercles and condyles are not drawn', '骨頭・結節・顆は描いていません')
    ),
    arm(
      'radius-and-ulna',
      'Radius and ulna',
      '橈骨・尺骨',
      'Two bones from elbow to wrist, and **two is the point**: one rolls over the other, and that is how a palm is turned up and down without the shoulder moving.',
      '肘から手首までの2本の骨で、**2本であることに意味があります**。一方が他方の周りを回旋することで、肩を動かさずに手掌を上下に返すことができます。',
      ...overview('they are drawn side by side and do not cross — the wrist itself is `hand-anatomy`', '並列に描いており交差しません。手関節そのものは `hand-anatomy` にあります')
    ),
    arm(
      'hand-bones',
      'Bones of the hand',
      '手の骨',
      'Twenty-seven bones in each hand — a quarter of every bone in the body, in the two things on the ends of the arms.',
      '片手あたり27個の骨からなります。全身の骨の約4分の1が、両手に集まっています。',
      ...overview('drawn as five rays and nothing else: the twenty-seven bones are `hand-anatomy`', '5本の ray のみとして描いています。27個の骨は `hand-anatomy` にあります')
    ),
    pelvicGirdle(
      'pelvis',
      'Hip bones',
      '寛骨',
      'Two bones, each **locked to the sacrum behind and to its fellow in front**. There is no sliding and no muscle suspension here: the leg’s girdle is a closed ring continuous with the spine, and that is the whole difference from the shoulder.',
      '左右2個の骨からなり、**後方で仙骨に、前方で互いに固定**されています。滑走も筋による吊り下げもありません。下肢帯は脊柱と連続した閉じた輪であり、この点が肩とのすべての違いです。',
      ...overview(
        'each is drawn as one blade with no wing detail, no acetabulum and no obturator foramen — the hip joint is `hip-anatomy` and the floor across the ring is `pelvic-floor-anatomy`',
        '腸骨翼の細部・寛骨臼・閉鎖孔のない1枚の板として描いています。股関節は `hip-anatomy`、輪に張られる骨盤底は `pelvic-floor-anatomy` にあります'
      )
    ),
    leg(
      'femur',
      'Femur',
      '大腿骨',
      'The longest and strongest bone in the body, and the one that carries the most. It slopes **inwards** from hip to knee, which brings the knees under the middle of the body.',
      '人体で最も長く強く、最も大きな荷重を受ける骨です。股関節から膝へ**内側に向かって**傾斜し、そのため膝は体の中心線の下に位置します。',
      ...overview('its head, neck, trochanters and condyles are not drawn — `hip-anatomy` and `knee-anatomy` draw its two ends', '骨頭・頸部・転子・顆は描いていません。両端は `hip-anatomy` と `knee-anatomy` にあります')
    ),
    leg(
      'patella',
      'Patella',
      '膝蓋骨',
      'A bone formed inside a tendon, in front of the knee. It is there to hold the tendon away from the joint, which is what gives the thigh muscle something to pull against.',
      '膝の前面、腱の中にできた骨（種子骨）です。腱を関節から前方へ離す役割をもち、これによって大腿四頭筋の作用効率が高まります。',
      ...overview('the joint behind it is `knee-anatomy`', 'その後方の関節は `knee-anatomy` にあります')
    ),
    leg(
      'tibia-and-fibula',
      'Tibia and fibula',
      '脛骨・腓骨',
      'Two bones again, but **not for the same reason**: here one carries nearly all the weight and the other is a strut on the outside. A leg does not turn its foot over the way a forearm turns a hand.',
      'ここでも2本ですが、**前腕とは理由が異なります**。一方がほぼすべての荷重を担い、他方は外側の支柱です。下腿は前腕のような回旋を行いません。',
      ...overview('the ankle they make at the bottom is `foot-anatomy`', '下端でつくる足関節は `foot-anatomy` にあります')
    ),
    leg(
      'foot-bones',
      'Bones of the foot',
      '足の骨',
      'Twenty-six in each foot — nearly as many as in a hand, arranged not to grip but to make an arch.',
      '片足あたり26個の骨からなります。手とほぼ同数ですが、その配列は把持のためではなくアーチをつくるためのものです。',
      ...overview('drawn as a heel and five rays: the twenty-six bones and the arch are `foot-anatomy`', '踵と5本の ray のみとして描いています。26個の骨とアーチは `foot-anatomy` にあります')
    ),
  ]);
}

export const SKELETON_ANATOMY_META = Object.freeze({
  id: 'skeleton-overview',
  status: 'alpha',
  title: 'The skeleton, whole',
  titleJa: '全身の骨格を俯瞰する',
  subtitle: 'Point to identify; click or tap to pin a part of the column or of a limb',
  subtitleJa: '触れて部位を確認・クリック／タップで体軸骨格・四肢の各部を固定',
  inspection: { background: 'studio' },
  palette: {
    axial: SKELETON_SCENE_COLORS.ribs,
    shoulder: SKELETON_SCENE_COLORS.clavicle,
    arm: SKELETON_SCENE_COLORS.humerus,
    pelvis: SKELETON_SCENE_COLORS.pelvis,
    leg: SKELETON_SCENE_COLORS.femur,
  },
  legend: [
    { key: 'axial', label: 'The column', labelJa: '体軸骨格' },
    { key: 'shoulder', label: 'The shoulder girdle', labelJa: '上肢帯' },
    { key: 'arm', label: 'The arm', labelJa: '上肢' },
    { key: 'pelvis', label: 'The pelvic girdle', labelJa: '下肢帯' },
    { key: 'leg', label: 'The leg', labelJa: '下肢' },
  ],
  stages: [
    {
      id: 'whole',
      name: 'One skeleton',
      nameJa: '1つの骨格',
      at: 0,
      summary: 'Two hundred and six bones, standing.',
      summaryJa: '206個の骨が立っています。',
    },
    {
      id: 'column',
      name: 'Two skeletons',
      nameJa: '2つの骨格',
      at: 1,
      summary:
        'The limbs step back: what is left is one continuous column, and the two girdles the limbs hang off it by are joined to it in completely different ways.',
      summaryJa:
        '四肢を薄くすると、連続した1本の体軸が残ります。四肢を吊り下げる2つの肢帯は、体軸への付き方がまったく異なります。',
    },
  ],
  range: { start: 'Whole', startJa: '全体', end: 'Column', endJa: '体軸' },
  progressLabel: { label: 'Limb transparency', labelJa: '四肢の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY OVERVIEW — A whole skeleton at the scale where the question is how it is put together. **No bone here is a model of that bone**: every one is a smooth shaft or block with no joint surfaces, no processes, no sutures and no foramina, and the vertebrae, the carpal and tarsal bones and the bones of the hands and feet are not drawn individually at all. The scenes that do model a region — `spine-anatomy`, `shoulder-anatomy`, `hip-anatomy`, `knee-anatomy`, `hand-anatomy`, `foot-anatomy`, `pelvic-floor-anatomy`, `brain-anatomy` — are separate, and any detail belongs there. **Nothing here moves and nothing bears weight.** No bone length, proportion, joint angle or bone count is a measurement; the figure is one representative adult of no particular sex, age or size. Cartilage, ligaments, muscle, marrow and every soft tissue are absent, and nothing here is anyone’s skeleton.',
  disclaimerJa:
    '教育用肉眼解剖の概観：全身の骨格を「どう組み立てられているか」を問う縮尺で描いたものです。**ここにあるどの骨も、その骨のモデルではありません**——いずれも関節面・突起・縫合・孔をもたない滑らかな骨幹またはブロックであり、椎骨・手根骨・足根骨・手足の骨は個別に描いてすらいません。各部位を実際にモデル化したシーン——`spine-anatomy`・`shoulder-anatomy`・`hip-anatomy`・`knee-anatomy`・`hand-anatomy`・`foot-anatomy`・`pelvic-floor-anatomy`・`brain-anatomy`——は別にあり、細部はそちらに属します。**このシーンでは何も動かず、荷重もかかりません。** 骨の長さ・比率・関節角度・骨の数はいずれも実測値ではなく、性別・年齢・体格を特定しない代表的な成人1体です。軟骨・靭帯・筋・骨髄をはじめ軟部組織はすべて描いておらず、特定の個人の骨格でもありません。',
  disclaimerShort: 'Educational overview — not for clinical use',
  disclaimerShortJa: '教育用の概観 — 臨床使用不可',
});
