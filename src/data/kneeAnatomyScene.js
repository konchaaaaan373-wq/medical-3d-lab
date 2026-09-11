/**
 * What the knee anatomy scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/kneeJoint.js`. This is the
 * first **joint** in the repository, and a joint is a different kind of subject
 * from an organ: an organ has parts, a joint has *relations*. Almost every
 * question anybody asks about a knee is a question about one of them — which
 * ligament stops which movement, what is between the two bones, what crosses
 * the front. So the copy for each structure says what it is attached to at both
 * ends, and what that arrangement means.
 *
 * The copy names no injury, no test, no grade and no operation. The ACL entry
 * says where it runs and what it stops; it does not say what tears it. Disease
 * is somebody else's scene.
 */

export const KNEE_SCENE_COLORS = Object.freeze({
  'femoral-shaft': '#ece7d8',
  'medial-femoral-condyle': '#e8c06a',
  'lateral-femoral-condyle': '#d79a52',
  'medial-tibial-plateau': '#d98f8a',
  'lateral-tibial-plateau': '#bb6f6b',
  'tibial-shaft': '#ece7d8',
  fibula: '#cdbf9c',
  patella: '#e2ddc6',
  'articular-cartilage': '#9fd8e2',
  'medial-meniscus': '#c9a3d8',
  'lateral-meniscus': '#a882c4',
  'anterior-cruciate-ligament': '#e0654f',
  'posterior-cruciate-ligament': '#b8433a',
  'medial-collateral-ligament': '#7fc08a',
  'lateral-collateral-ligament': '#5ea06c',
  'quadriceps-tendon': '#d8b46a',
  'patellar-tendon': '#c59c55',
});

export const KNEE_NATURAL_COLORS = Object.freeze({
  'femoral-shaft': '#ece7d8',
  'medial-femoral-condyle': '#e6e0cd',
  'lateral-femoral-condyle': '#e6e0cd',
  'medial-tibial-plateau': '#e6e0cd',
  'lateral-tibial-plateau': '#e6e0cd',
  'tibial-shaft': '#ece7d8',
  fibula: '#d6ccb0',
  patella: '#e6e0cd',
  'articular-cartilage': '#cfe6ea',
  'medial-meniscus': '#dcd2b4',
  'lateral-meniscus': '#dcd2b4',
  'anterior-cruciate-ligament': '#d8c98a',
  'posterior-cruciate-ligament': '#c4b06a',
  'medial-collateral-ligament': '#e0d09a',
  'lateral-collateral-ligament': '#e0d09a',
  'quadriceps-tendon': '#e8e0c8',
  'patellar-tendon': '#e8e0c8',
});

export const KNEE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SHAPE_NOTE = {
  note: 'The bone shapes are schematic solids, not scanned or measured ones. No length, width, thickness or angle in this model is a measurement.',
  noteJa:
    '骨の形状は模式的な立体で、スキャンや実測に基づくものではありません。このモデルの長さ・幅・厚み・角度は、いずれも実測値ではありません。',
};

const SIDE_NOTE = {
  note: 'A **right** knee. Screen-left is the patient’s right, so the medial side is towards the far side of the frame and the fibula is on the near one.',
  noteJa:
    '**右膝**です。画面左が患者の右側なので、内側は画面の奥側、腓骨は手前側になります。',
};

export function kneeStructureCopy() {
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
      hierarchy: ['Knee', group, name],
      hierarchyJa: ['膝関節', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const bone = entry('Bones', '骨', 'bone', ['bone']);
  const between = entry('Between the surfaces', '関節面の間', 'cushion', ['cushion']);
  const ligament = entry('Ligaments', '靱帯', 'ligament', ['ligament']);
  const extensor = entry('Extensor mechanism', '伸展機構', 'tendon', ['tendon']);

  return new Map([
    bone(
      'femoral-shaft',
      'Femur (shaft)',
      '大腿骨（骨幹部）',
      'The thigh bone, arriving from above and widening as it reaches the joint. Everything the knee does is this bone moving on the tibia below it.',
      '上方から下行し、関節に近づくにつれて太くなる大腿の骨です。膝の運動は、すべてこの骨が下の脛骨の上で動くこととして起こります。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    bone(
      'medial-femoral-condyle',
      'Medial femoral condyle',
      '内側大腿骨顆',
      'The inner of the two rollers the femur ends in. It is the longer of the pair, which is part of why the knee does not simply hinge — it rolls and turns as it straightens.',
      '大腿骨の下端をなす2つのローラーのうち内側のものです。外側より前後に長く、膝が単純な蝶番ではなく、伸展の際に転がりと回旋を伴う理由の一つがここにあります。',
      SIDE_NOTE.note,
      SIDE_NOTE.noteJa
    ),
    bone(
      'lateral-femoral-condyle',
      'Lateral femoral condyle',
      '外側大腿骨顆',
      'The outer roller. The gap between the two condyles is the intercondylar notch, and it is not drawn as a structure because it is not one: it is the space both cruciate ligaments run in.',
      '外側のローラーです。2つの顆の間の空間が顆間窩で、これは構造として描いていません——構造ではなく、左右の十字靱帯が走る「場所」だからです。',
      SIDE_NOTE.note,
      SIDE_NOTE.noteJa
    ),
    bone(
      'medial-tibial-plateau',
      'Medial tibial plateau',
      '内側脛骨高原',
      'The inner half of the flat table the femur stands on. It is slightly dished, which with the meniscus on it is what keeps a round condyle from sliding off a flat top.',
      '大腿骨が乗る平らな面の内側半分です。わずかに皿状にくぼんでおり、その上の半月板とあわせて、丸い顆が平らな面から滑り落ちないようにしています。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    bone(
      'lateral-tibial-plateau',
      'Lateral tibial plateau',
      '外側脛骨高原',
      'The outer half. It is the flatter, more convex of the two, so the lateral side of the knee relies more on its meniscus and less on the shape of the bone.',
      '外側の半分です。内側よりも平坦でむしろ凸に近く、外側では骨の形よりも半月板に依存する度合いが高くなります。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    bone(
      'tibial-shaft',
      'Tibia (shaft)',
      '脛骨（骨幹部）',
      'The shin bone, and the one that carries the weight. Its front edge just below the joint is the tibial tuberosity, where the patellar tendon ends.',
      '下腿の骨で、荷重を支えるのはこちらです。関節のすぐ下の前面の隆起が脛骨粗面で、膝蓋腱はここに終わります。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    bone(
      'fibula',
      'Fibula',
      '腓骨',
      'Lateral, slender, and it carries almost no weight. It is in this scene because the lateral collateral ligament ends on its head, and nothing else explains why that ligament goes where it goes.',
      '外側にある細い骨で、ほとんど荷重を担いません。このシーンにあるのは、外側側副靱帯が腓骨頭に終わるからで、その走行を説明できるのはこの骨だけです。',
      'Only the upper part is drawn; the ankle end is outside the scene.',
      '上部のみを描いています。足関節側は、このシーンの範囲外です。'
    ),
    bone(
      'patella',
      'Patella',
      '膝蓋骨',
      'A bone inside a tendon — the largest sesamoid in the body. It rides in the groove between the two condyles and holds the quadriceps pull away from the joint, so the muscle straightens the knee with more leverage than it would have alone.',
      '腱の中にある骨で、体内最大の種子骨です。左右の顆の間の溝に沿って動き、大腿四頭筋の張力を関節から前方に離すことで、同じ筋力でより大きなてこ比を生みます。',
      'Drawn in the position it takes with the knee straight. It is not shown tracking as the knee bends, because nothing in this scene moves.',
      '膝を伸ばした位置で描いています。屈曲に伴う膝蓋骨の軌道は表現していません——このシーンでは何も動かないためです。'
    ),
    between(
      'articular-cartilage',
      'Articular cartilage',
      '関節軟骨',
      'The layer over every surface that meets another: both condyles, both plateaus, and the back of the patella. What it does is the reason the joint is silent — **the two bones never touch each other.**',
      'ほかの骨と接するすべての面——左右の大腿骨顆、左右の脛骨高原、膝蓋骨の後面——を覆う層です。この層があるために、**2つの骨は互いに直接触れていません。**',
      'One structure drawn as four slightly enlarged translucent copies of the bone surfaces. Its **thickness here is drawn to be visible and is not a measurement**, and the patellar surface is not separately drawn.',
      '1つの構造を、骨表面をわずかに拡大した半透明の4つのコピーとして描いています。**ここでの厚みは見えるように描いたもので、実測値ではありません。** 膝蓋骨側の軟骨は個別には描いていません。'
    ),
    between(
      'medial-meniscus',
      'Medial meniscus',
      '内側半月板',
      'A wedge of fibrocartilage, thick at the rim and thin at its free edge, deepening the plateau into a socket for the condyle. It is the wider, more open C of the two, and it is **attached to the medial collateral ligament** — so it is far less free to move than the lateral one.',
      '辺縁が厚く内縁が薄い線維軟骨のくさびで、平らな脛骨高原を大腿骨顆に合う受け皿に変えています。左右のうち開いた幅の広いC字で、**内側側副靱帯と結合している**ため、外側よりも可動性が大きく制限されています。',
      'The horns and the attachments to the tibia are not separately drawn.',
      '前後の角（つの）と脛骨への付着部は、個別には描いていません。'
    ),
    between(
      'lateral-meniscus',
      'Lateral meniscus',
      '外側半月板',
      'The same wedge on the outer side, but a nearly closed ring, and **not tied to the lateral collateral ligament**. It moves much more than the medial one during flexion, which is the difference between how the two are loaded.',
      '外側の同じくさびですが、ほぼ閉じた輪の形をしており、**外側側副靱帯とは結合していません**。屈曲時の移動量は内側よりはるかに大きく、これが両者の負荷のされ方の違いです。',
      'The horns and the attachments to the tibia are not separately drawn.',
      '前後の角（つの）と脛骨への付着部は、個別には描いていません。'
    ),
    ligament(
      'anterior-cruciate-ligament',
      'Anterior cruciate ligament (ACL)',
      '前十字靱帯（ACL）',
      'Runs from the inner wall of the **lateral** femoral condyle, forward and down, to the front of the tibia between the plateaus. It stops the tibia sliding forwards under the femur, and it limits the knee rotating inwards.',
      '**外側**大腿骨顆の内壁から前下方に走り、左右の高原の間で脛骨の前方に付着します。脛骨が大腿骨の下で前方へ滑り出るのを止め、内旋も制限します。',
      'Drawn as one band. It is really two bundles that tighten at different angles of the knee, and none of that is shown.',
      '1本の帯として描いています。実際には屈曲角度によって緊張する部分が異なる2つの線維束からなりますが、それは表現していません。'
    ),
    ligament(
      'posterior-cruciate-ligament',
      'Posterior cruciate ligament (PCL)',
      '後十字靱帯（PCL）',
      'Runs from the inner wall of the **medial** femoral condyle, backwards and down, to the back of the tibia — crossing the ACL, which is what "cruciate" means. It stops the tibia sliding backwards, and it is the thicker and stronger of the two.',
      '**内側**大腿骨顆の内壁から後下方に走り、脛骨の後方に付着します。ACLと交叉しており、それが「十字」の名の由来です。脛骨が後方へ滑るのを止める靱帯で、2本のうち太く強いのはこちらです。',
      'Drawn as one band, without its meniscofemoral ligaments.',
      '1本の帯として描いており、半月大腿靱帯は含めていません。'
    ),
    ligament(
      'medial-collateral-ligament',
      'Medial collateral ligament (MCL)',
      '内側側副靱帯（MCL）',
      'A flat band down the inner side, femur to tibia, well below the joint line. It resists a force pushing the knee inwards — and on its way past the joint it is joined to the medial meniscus.',
      '内側面を、大腿骨から関節裂隙よりかなり下方の脛骨まで下行する平たい帯です。膝を内側へ押す力に抵抗します。関節を通過する部分で内側半月板と結合しています。',
      'Drawn as a cord. It is really a flat band with a deep layer continuous with the capsule, and the two layers are not separated here.',
      '紐状に描いていますが、実際には関節包と連続する深層をもつ平たい帯です。ここでは浅層と深層を分けていません。'
    ),
    ligament(
      'lateral-collateral-ligament',
      'Lateral collateral ligament (LCL)',
      '外側側副靱帯（LCL）',
      'A round cord down the outer side, femur to the **head of the fibula** — not to the tibia. It stands clear of the capsule and of the lateral meniscus, which is why that meniscus is the mobile one.',
      '外側面を、大腿骨から**腓骨頭**まで下行する円柱状の索です——脛骨には付きません。関節包からも外側半月板からも離れており、外側半月板の可動性が大きいのはこのためです。',
      'The rest of the posterolateral corner it belongs to is not drawn.',
      'この靱帯が属する後外側支持機構の他の構造は描いていません。'
    ),
    extensor(
      'quadriceps-tendon',
      'Quadriceps tendon',
      '大腿四頭筋腱',
      'The four muscles of the front of the thigh converge into one tendon and end on the top of the patella. This is the pull that straightens the knee; the muscles themselves are above the top of the scene.',
      '大腿前面の4つの筋が1本の腱に集まり、膝蓋骨の上縁に終わります。膝を伸ばす力はここから伝わります。筋そのものはこのシーンの上端より外にあります。',
      'One cord standing for four muscles and their layered tendon.',
      '4つの筋とその層状の腱を、1本の索として描いています。'
    ),
    extensor(
      'patellar-tendon',
      'Patellar tendon',
      '膝蓋腱',
      'Continues from the bottom of the patella to the tibial tuberosity. With the quadriceps tendon above it, it makes one continuous pull from thigh to shin — the patella is a bone in the middle of it.',
      '膝蓋骨の下極から脛骨粗面へ続きます。上方の大腿四頭筋腱とあわせて、大腿から下腿への1本の連続した張力の経路をなします。膝蓋骨はその途中にある骨です。',
      'Called a ligament by some texts, since both its ends are on bone. The name here follows its function as the continuation of the quadriceps.',
      '両端が骨に付くことから靱帯（膝蓋靱帯）と呼ぶ文献もあります。ここでは大腿四頭筋腱の続きという機能に従って腱としています。'
    ),
  ]);
}

export const KNEE_ANATOMY_META = Object.freeze({
  id: 'knee-anatomy',
  status: 'alpha',
  title: 'Interactive knee anatomy',
  titleJa: '触れて学ぶ膝関節の解剖',
  subtitle: 'Point to identify; click or tap to pin a bone, a ligament or a meniscus',
  subtitleJa: '触れて部位を確認・クリック／タップで骨・靱帯・半月板を固定',
  inspection: { background: 'studio' },
  palette: {
    bone: KNEE_SCENE_COLORS['medial-femoral-condyle'],
    cushion: KNEE_SCENE_COLORS['medial-meniscus'],
    ligament: KNEE_SCENE_COLORS['anterior-cruciate-ligament'],
    tendon: KNEE_SCENE_COLORS['quadriceps-tendon'],
  },
  legend: [
    { key: 'bone', label: 'Bones', labelJa: '骨' },
    { key: 'cushion', label: 'Cartilage and menisci', labelJa: '軟骨・半月板' },
    { key: 'ligament', label: 'Ligaments', labelJa: '靱帯' },
    { key: 'tendon', label: 'Extensor mechanism', labelJa: '伸展機構' },
  ],
  stages: [
    {
      id: 'bones',
      name: 'The bones that meet',
      nameJa: '出会う骨',
      at: 0,
      summary:
        'Femur above, tibia below, fibula to the side and the patella in front — with cartilage over every surface that meets another.',
      summaryJa:
        '上に大腿骨、下に脛骨、外側に腓骨、前に膝蓋骨。接するすべての面は軟骨に覆われています。',
    },
    {
      id: 'holding',
      name: 'What holds them together',
      nameJa: '骨をつなぐもの',
      at: 1,
      summary:
        'The bones fade: the two cruciates crossing inside the notch, the two collaterals down the sides, and the menisci between the surfaces.',
      summaryJa:
        '骨を薄くすると、顆間窩の中で交叉する2本の十字靱帯、左右の側副靱帯、そして関節面の間の半月板が見えます。',
    },
  ],
  range: { start: 'Bones', startJa: '骨', end: 'Ligaments', endJa: '靱帯' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right knee, drawn schematically in full extension. **Nothing here moves, and no length, angle, thickness or attachment footprint is a measurement.** Bone shapes are simplified solids; cartilage thickness is drawn to be visible. The joint capsule, the synovium and its bursae, the popliteus, the posterolateral corner, the hamstring and iliotibial attachments, the vessels and the nerves are not drawn, and nothing here is anyone’s knee.',
  disclaimerJa:
    '教育用肉眼解剖モデル：右膝を、完全伸展位で模式的に描いたものです。**このシーンでは何も動かず、長さ・角度・厚み・付着部の広がりは、いずれも実測値ではありません。** 骨の形状は単純化した立体で、軟骨の厚みは見えるように描いています。関節包・滑膜と滑液包・膝窩筋・後外側支持機構・ハムストリングや腸脛靱帯の付着・血管・神経は描いておらず、特定の個人の膝でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
