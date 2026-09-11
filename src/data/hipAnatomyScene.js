/**
 * What the hip anatomy scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/hipJoint.js`. Two ideas carry
 * the copy, and every entry is one of them. **The socket is deep** — it grips
 * past the equator of the head, which is why this joint keeps both range and
 * stability where the shoulder and the knee each give one up. And **the head is
 * held out on a neck**, so the weight of the body does not pass down the middle
 * of the bone carrying it; the neck is where that shows.
 *
 * The copy names no fracture, no arthritis, no impingement and no replacement.
 * Disease is somebody else's scene.
 */

export const HIP_SCENE_COLORS = Object.freeze({
  'hip-bone': '#e0d3b0',
  acetabulum: '#c78f5e',
  'acetabular-labrum': '#c9a3d8',
  'articular-cartilage': '#9fd8e2',
  'femoral-head': '#f2c887',
  'femoral-neck': '#cf9440',
  'greater-trochanter': '#d69a54',
  'lesser-trochanter': '#c4853f',
  'femoral-shaft': '#ece7d8',
  'ligament-of-the-head': '#9ec8e8',
  'iliofemoral-ligament': '#7fb98a',
  'pubofemoral-ligament': '#5ea06c',
  'ischiofemoral-ligament': '#4f8f60',
  'gluteus-medius-tendon': '#d9705e',
  'iliopsoas-tendon': '#e08a6a',
});

export const HIP_NATURAL_COLORS = Object.freeze({
  'hip-bone': '#e6e0cd',
  acetabulum: '#ded5bc',
  'acetabular-labrum': '#d8cdb8',
  'articular-cartilage': '#cfe6ea',
  'femoral-head': '#e6e0cd',
  'femoral-neck': '#e2dbc4',
  'greater-trochanter': '#ded5bc',
  'lesser-trochanter': '#ded5bc',
  'femoral-shaft': '#ece7d8',
  'ligament-of-the-head': '#d9d4c0',
  'iliofemoral-ligament': '#ddd0a4',
  'pubofemoral-ligament': '#ddd0a4',
  'ischiofemoral-ligament': '#ddd0a4',
  'gluteus-medius-tendon': '#e0d2b8',
  'iliopsoas-tendon': '#e4d8bd',
});

export const HIP_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SHAPE_NOTE = {
  note: 'A schematic solid, not a scanned or measured one. No length, width, thickness or angle in this model is a measurement.',
  noteJa:
    '模式的な立体であり、スキャンや実測に基づくものではありません。このモデルの長さ・幅・厚み・角度は、いずれも実測値ではありません。',
};

export function hipStructureCopy() {
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
      hierarchy: ['Hip', group, name],
      hierarchyJa: ['股関節', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const pelvis = entry('Bones', '骨', 'bone', ['bone']);
  const femur = entry('Bones', '骨', 'bone', ['bone', 'femur']);
  const socket = entry('The socket and what lines it', '臼蓋とそれを覆うもの', 'socket', ['socket']);
  const ligament = entry('Ligaments', '靱帯', 'ligament', ['ligament']);
  const tendon = entry('Tendons', '腱', 'tendon', ['tendon']);

  return new Map([
    pelvis(
      'hip-bone',
      'Hip bone',
      '寛骨',
      'Ilium above, pubis in front and below, ischium behind and below — three bones that fuse into one, and they meet **in the socket**. Weight from the trunk comes down through it into the head of the femur.',
      '上方の腸骨、前下方の恥骨、後下方の坐骨——3つが癒合して1つになった骨で、その合流点が**臼蓋**です。体幹からの荷重はここを通って大腿骨頭へ伝わります。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    socket(
      'acetabulum',
      'Acetabulum',
      '臼蓋（寛骨臼）',
      '**A cup, not a dish.** Its rim reaches past the widest part of the head, so the head cannot come straight out — it has to be levered out or the rim has to break. That is why this joint keeps a usable range of movement *and* stays where it is, which neither the shoulder nor the knee manages.',
      '皿ではなく、**深い受け皿**です。縁が骨頭の最大径より先まで達しているため、骨頭はまっすぐには抜けません——てこの力で外れるか、縁が壊れるかのどちらかです。肩関節にも膝関節にもない、可動域と安定性の両立はこの形によります。',
      'Drawn as its own shell so that the rim and the inside can be pointed at. The acetabular notch in its lower rim and the transverse ligament across it are not drawn, and the depth here is not a measured one.',
      '縁と内面を指し示せるように、独立した殻として描いています。下縁の臼蓋切痕とそれを渡す横靱帯は描いておらず、深さも実測値ではありません。'
    ),
    socket(
      'acetabular-labrum',
      'Acetabular labrum',
      '関節唇',
      'A rim of fibrocartilage round the mouth of the cup, deepening it further and sealing it. It is what makes the grip past the equator a grip rather than a shape.',
      '受け皿の口を取り巻く線維軟骨の縁で、深さを増すとともに関節を封じています。骨頭の最大径を越えて把持する構造を、形だけでなく実際の「把持」にしているのがこの関節唇です。',
      'One even ring. The variation round its circumference and its seal against the head are not modelled.',
      '太さの一定な1つの輪として描いています。周方向の差や骨頭との密着（シール）は表現していません。'
    ),
    socket(
      'articular-cartilage',
      'Articular cartilage',
      '関節軟骨',
      'Covers the head almost all over — it lives inside a cup — and lines the inside of the cup itself, so that the two bones never touch.',
      '骨頭のほぼ全面——受け皿の中にあるためです——と、受け皿の内面を覆っており、2つの骨が直接触れることはありません。',
      'One structure drawn as two slightly enlarged translucent copies. Its **thickness here is drawn to be visible and is not a measurement**, and the horseshoe shape of the acetabular surface is not represented.',
      '1つの構造を、わずかに拡大した半透明の2つのコピーとして描いています。**ここでの厚みは見えるように描いたもので、実測値ではありません。** 臼蓋側の軟骨が馬蹄形であることも表現していません。'
    ),
    femur(
      'femoral-head',
      'Head of the femur',
      '大腿骨頭',
      'A ball, and more than half of it is inside the socket at all times. Its blood supply runs up the neck from below — which is the fact everything about a broken neck of femur follows from.',
      '球状で、常にその半分以上が臼蓋の中にあります。栄養血管は下方から頸部を上行しており、大腿骨頸部骨折にまつわる事柄はすべてこの事実に由来します。',
      'The vessels are not drawn. The dimple on its medial surface — the fovea — is drawn, because the ligament of the head comes out of it.',
      '血管は描いていません。内側面のくぼみ（骨頭窩）は、大腿骨頭靱帯がそこから出るため描いています。'
    ),
    femur(
      'femoral-neck',
      'Neck of the femur',
      '大腿骨頸部',
      'Holds the head **out to the side** of the shaft, at an angle. So the weight of the body does not run down the middle of the bone carrying it: it comes down the pelvis, across the neck, and only then into the shaft.',
      '骨頭を骨幹から**側方に離して**、角度をつけて支えています。そのため体重は、それを支える骨の中心をまっすぐ下りるのではなく、骨盤から頸部を横切って、はじめて骨幹に伝わります。',
      '**The neck–shaft angle here is drawn to read, not measured.** It is not this model’s place to say what that angle is in anyone.',
      '**ここでの頸体角は、見やすさのために描いたもので、実測値ではありません。** このモデルが個々人の頸体角について述べることはできません。'
    ),
    femur(
      'greater-trochanter',
      'Greater trochanter',
      '大転子',
      'The lump you can feel on the side of the hip, where the neck meets the shaft. The muscles that hold the pelvis level when you stand on one leg end here.',
      '頸部と骨幹の移行部にある、股関節の外側で触れることのできる隆起です。片脚立ちのときに骨盤を水平に保つ筋がここに停止します。'
    ),
    femur(
      'lesser-trochanter',
      'Lesser trochanter',
      '小転子',
      'A smaller bump on the inner and back side, below the neck. One tendon ends here, and it is the one that lifts the thigh.',
      '頸部の下方、内側かつ後方にある小さな隆起です。ここに停止する腱は1本で、大腿を挙上させる筋の腱です。'
    ),
    femur(
      'femoral-shaft',
      'Femur (shaft)',
      '大腿骨（骨幹部）',
      'The thigh bone, hanging from the neck and running down to the knee.',
      '頸部から続き、膝へ向かって下行する大腿の骨です。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    ligament(
      'ligament-of-the-head',
      'Ligament of the head of the femur',
      '大腿骨頭靱帯',
      'Runs across the floor of the socket to the dimple on the head. **It holds nothing** — it carries a small artery, and in a child that artery matters.',
      '臼蓋の底から骨頭のくぼみへ渡る靱帯です。**関節を保持する働きはありません**——小さな動脈を通しており、小児期にはその動脈が重要な意味をもちます。',
      'The artery it carries is not drawn.',
      '通っている動脈は描いていません。'
    ),
    ligament(
      'iliofemoral-ligament',
      'Iliofemoral ligament',
      '腸骨大腿靱帯',
      '**The strongest ligament in the body**, across the front of the joint from the pelvis to the femur. It tightens as the hip straightens — which is why a person can stand still without using the hip muscles: standing hangs on this.',
      '骨盤から大腿骨へ関節の前面を渡る、**人体で最も強い靱帯**です。股関節が伸展すると緊張するため、ヒトは股関節の筋を使わずに立っていられます。直立位はこの靱帯に支えられています。',
      'Drawn as one band. It is really an inverted Y with two limbs, and the capsule it is a thickening of is not drawn.',
      '1本の帯として描いていますが、実際には2本の脚をもつ逆Y字形です。この靱帯が肥厚部をなす関節包そのものも描いていません。'
    ),
    ligament(
      'pubofemoral-ligament',
      'Pubofemoral ligament',
      '恥骨大腿靱帯',
      'From the pubis below and in front, limiting how far the leg goes out to the side.',
      '前下方の恥骨から起こり、下肢が外側へ開く範囲を制限します。'
    ),
    ligament(
      'ischiofemoral-ligament',
      'Ischiofemoral ligament',
      '坐骨大腿靱帯',
      'From the ischium behind, the weakest of the three — which is part of why a hip that dislocates usually goes backwards.',
      '後方の坐骨から起こる、3本のうち最も弱い靱帯です。股関節の脱臼が多くの場合後方に起こる理由の一つがここにあります。'
    ),
    tendon(
      'gluteus-medius-tendon',
      'Gluteus medius tendon',
      '中殿筋腱',
      'From the outer surface of the ilium down to the greater trochanter. When you stand on one leg, this is what stops the other side of the pelvis dropping.',
      '腸骨の外面から大転子へ向かう腱です。片脚立ちのとき、反対側の骨盤が落ちるのを防いでいるのがこの筋です。',
      'One strap standing for a muscle and its tendon; the muscle belly is not drawn.',
      '筋とその腱を1本の帯として描いており、筋腹は表現していません。'
    ),
    tendon(
      'iliopsoas-tendon',
      'Iliopsoas tendon',
      '腸腰筋腱',
      'Comes down across the front of the joint from inside the abdomen and the pelvis, and ends on the lesser trochanter. It is what lifts the thigh, and it crosses in front of the capsule on the way.',
      '腹腔内および骨盤内から関節の前面を横切って下行し、小転子に停止します。大腿を挙上させる筋で、途中で関節包の前を越えます。',
      'Only the part near the joint is drawn; the muscle it comes from is outside this scene.',
      '関節付近の部分のみを描いており、起始となる筋はこのシーンの範囲外です。'
    ),
  ]);
}

export const HIP_ANATOMY_META = Object.freeze({
  id: 'hip-anatomy',
  status: 'alpha',
  title: 'Interactive hip anatomy',
  titleJa: '触れて学ぶ股関節の解剖',
  subtitle: 'Point to identify; click or tap to pin a bone, a ligament or a tendon',
  subtitleJa: '触れて部位を確認・クリック／タップで骨・靱帯・腱を固定',
  inspection: { background: 'studio' },
  palette: {
    bone: HIP_SCENE_COLORS['femoral-head'],
    socket: HIP_SCENE_COLORS['acetabular-labrum'],
    ligament: HIP_SCENE_COLORS['iliofemoral-ligament'],
    tendon: HIP_SCENE_COLORS['gluteus-medius-tendon'],
  },
  legend: [
    { key: 'bone', label: 'Bones', labelJa: '骨' },
    { key: 'socket', label: 'Socket, labrum and cartilage', labelJa: '臼蓋・関節唇・軟骨' },
    { key: 'ligament', label: 'Ligaments', labelJa: '靱帯' },
    { key: 'tendon', label: 'Tendons', labelJa: '腱' },
  ],
  stages: [
    {
      id: 'ball-in-a-cup',
      name: 'A ball in a deep cup',
      nameJa: '深い受け皿の中の球',
      at: 0,
      summary:
        'A rim that reaches past the widest part of the head, a labrum round its mouth, and a neck holding the head out to the side.',
      summaryJa:
        '骨頭の最大径より先まで達する縁、その口を取り巻く関節唇、そして骨頭を側方に支える頸部。',
    },
    {
      id: 'what-crosses-it',
      name: 'What crosses it',
      nameJa: '関節をまたぐもの',
      at: 1,
      summary:
        'The bones fade: three capsular ligaments round the joint, the ligament of the head inside it, and the two tendons that explain the two trochanters.',
      summaryJa:
        '骨を薄くすると、関節を囲む3本の関節包靱帯、関節内の大腿骨頭靱帯、そして2つの転子の意味を説明する2本の腱が見えます。',
    },
  ],
  range: { start: 'Bones', startJa: '骨', end: 'Ligaments', endJa: '靱帯' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right hip, standing, drawn schematically. **Nothing here moves, and no length, angle, thickness or attachment footprint is a measurement — the neck–shaft angle included.** Bone shapes are simplified solids; cartilage thickness is drawn to be visible; each tendon is one strap standing for a muscle and its tendon. The joint capsule itself, the acetabular notch and transverse ligament, the horseshoe shape of the acetabular cartilage, the bursae, the remaining hip muscles, the vessels of the head and neck and the sciatic nerve are not drawn, and nothing here is anyone’s hip.',
  disclaimerJa:
    '教育用肉眼解剖モデル：立位の右股関節を模式的に描いたものです。**このシーンでは何も動かず、長さ・角度・厚み・付着部の広がりは、頸体角を含めていずれも実測値ではありません。** 骨の形状は単純化した立体で、軟骨の厚みは見えるように描いており、各腱は筋と腱を1本の帯で表しています。関節包そのもの・臼蓋切痕と横靱帯・臼蓋軟骨の馬蹄形・滑液包・その他の股関節周囲筋・骨頭と頸部の血管・坐骨神経は描いておらず、特定の個人の股関節でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
