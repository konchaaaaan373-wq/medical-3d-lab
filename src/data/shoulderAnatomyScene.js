/**
 * What the shoulder anatomy scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/shoulderJoint.js`. One idea
 * carries the copy: **the shoulder is not held together by its bones.** The
 * socket takes about a third of the head, the capsule is loose, and what keeps
 * the head where it belongs is a sleeve of four tendons — under an arch of bone
 * and ligament with very little room to spare. Each entry says what a structure
 * runs between and what that arrangement costs.
 *
 * The copy names no tear, no impingement, no test and no operation. Disease is
 * somebody else's scene.
 */

export const SHOULDER_SCENE_COLORS = Object.freeze({
  scapula: '#e6dcc4',
  glenoid: '#c78f5e',
  acromion: '#cdbf9c',
  'coracoid-process': '#bfae86',
  clavicle: '#e6e0cd',
  'humeral-head': '#e2b06a',
  'humeral-shaft': '#ece7d8',
  'greater-tubercle': '#d69a54',
  'lesser-tubercle': '#c4853f',
  'articular-cartilage': '#9fd8e2',
  'glenoid-labrum': '#c9a3d8',
  'supraspinatus-tendon': '#d9705e',
  'infraspinatus-tendon': '#c25a4e',
  'teres-minor-tendon': '#a8483e',
  'subscapularis-tendon': '#e08a6a',
  'long-head-of-biceps-tendon': '#e8c04a',
  'coracoacromial-ligament': '#8fbf96',
  'acromioclavicular-ligament': '#6ea87a',
  'coracoclavicular-ligament': '#6ea87a',
  'inferior-glenohumeral-ligament': '#9ec8e8',
});

export const SHOULDER_NATURAL_COLORS = Object.freeze({
  scapula: '#e6e0cd',
  glenoid: '#ded5bc',
  acromion: '#e2dbc4',
  'coracoid-process': '#ded7c0',
  clavicle: '#e6e0cd',
  'humeral-head': '#e6e0cd',
  'humeral-shaft': '#ece7d8',
  'greater-tubercle': '#ded5bc',
  'lesser-tubercle': '#ded5bc',
  'articular-cartilage': '#cfe6ea',
  'glenoid-labrum': '#d8cdb8',
  'supraspinatus-tendon': '#e0d2b8',
  'infraspinatus-tendon': '#dccdb0',
  'teres-minor-tendon': '#d6c6a8',
  'subscapularis-tendon': '#e4d8bd',
  'long-head-of-biceps-tendon': '#e8dcb4',
  'coracoacromial-ligament': '#ddd0a4',
  'acromioclavicular-ligament': '#ddd0a4',
  'coracoclavicular-ligament': '#ddd0a4',
  'inferior-glenohumeral-ligament': '#d9d4c0',
});

export const SHOULDER_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SHAPE_NOTE = {
  note: 'Schematic solids, not scanned or measured ones. No length, width, thickness or angle in this model is a measurement.',
  noteJa:
    '模式的な立体であり、スキャンや実測に基づくものではありません。このモデルの長さ・幅・厚み・角度は、いずれも実測値ではありません。',
};

export function shoulderStructureCopy() {
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
      hierarchy: ['Shoulder', group, name],
      hierarchyJa: ['肩関節', groupJa, nameJa],
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
  const humerus = entry('Bones', '骨', 'bone', ['bone', 'humerus']);
  const socket = entry('The socket and what deepens it', '関節窩とそれを深くするもの', 'socket', ['socket']);
  const cuff = entry('The rotator cuff', '回旋筋腱板', 'cuff', ['cuff']);
  const ligament = entry('Ligaments', '靱帯', 'ligament', ['ligament']);

  return new Map([
    bone(
      'scapula',
      'Scapula',
      '肩甲骨',
      'A thin triangular plate lying on the back of the chest, joined to the trunk by muscle almost everywhere and by bone in only one place. Nearly everything in this scene is attached to it.',
      '胸郭の背側に乗る薄い三角形の板状の骨で、体幹とは大部分が筋でつながり、骨で連結しているのは1か所だけです。このシーンのほとんどの構造がここに付着しています。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    socket(
      'glenoid',
      'Glenoid fossa',
      '関節窩',
      'The socket, at the outer angle of the scapula — and it is **shallow and small**: only about a third of the humeral head is ever on it. That is the price the shoulder pays for the range of movement it has.',
      '肩甲骨の外側角にある受け皿ですが、**浅く小さい**——上腕骨頭のうちここに接しているのは常におよそ1/3にすぎません。肩関節の大きな可動域は、この構造と引き換えに得られています。',
      'Drawn as its own dish rather than as a face of the scapula, so that it can be pointed at. The glenoid version — how far it faces backwards — is not represented.',
      '指し示せるようにするため、肩甲骨の一面ではなく独立した皿として描いています。関節窩の後方への傾き（version）は表現していません。'
    ),
    socket(
      'glenoid-labrum',
      'Glenoid labrum',
      '関節唇',
      'A rim of fibrocartilage round the socket, deepening it and widening the surface the head sits on. The long head of biceps grows out of its upper part, which is why that tendon begins inside the joint.',
      '関節窩を取り囲む線維軟骨の縁で、窩を深くし、骨頭が接する面を広げています。上腕二頭筋長頭腱はその上部から起始しており、この腱が関節内から始まるのはそのためです。',
      'One even ring. Its attachment to the capsule and the variation at its upper part are not modelled.',
      '太さの一定な1つの輪として描いています。関節包との連続や上方部分の個人差は表現していません。'
    ),
    socket(
      'articular-cartilage',
      'Articular cartilage',
      '関節軟骨',
      'Covers the head of the humerus where it faces the socket, and the face of the socket itself, so that the two bones never touch.',
      '上腕骨頭の関節窩に面する部分と、関節窩そのものの面を覆っており、2つの骨が直接触れることはありません。',
      'One structure drawn as two slightly enlarged translucent copies. Its **thickness here is drawn to be visible and is not a measurement**.',
      '1つの構造を、わずかに拡大した半透明の2つのコピーとして描いています。**ここでの厚みは見えるように描いたもので、実測値ではありません。**'
    ),
    humerus(
      'humeral-head',
      'Head of the humerus',
      '上腕骨頭',
      'A large smooth ball facing up and towards the midline. Set against a socket a third of its size, it is held in place by the cuff rather than by the bone around it.',
      '上方かつ内側を向く大きな滑らかな球です。自身の1/3ほどの大きさの関節窩に対しており、位置を保っているのは周囲の骨ではなく腱板です。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    humerus(
      'greater-tubercle',
      'Greater tubercle',
      '大結節',
      'The bump on the outer side of the upper humerus. **Three of the four cuff tendons end here** — supraspinatus on top, infraspinatus and teres minor behind it.',
      '上腕骨上端の外側にある隆起です。**腱板4筋のうち3つがここに停止します**——上に棘上筋、その後方に棘下筋と小円筋。'
    ),
    humerus(
      'lesser-tubercle',
      'Lesser tubercle',
      '小結節',
      'The bump on the front. **Subscapularis ends here**, and the groove between this and the greater tubercle is the one the biceps tendon runs down.',
      '前面にある隆起で、**肩甲下筋がここに停止します**。この結節と大結節の間の溝を、上腕二頭筋長頭腱が下行します。'
    ),
    humerus(
      'humeral-shaft',
      'Humerus (shaft)',
      '上腕骨（骨幹部）',
      'The bone of the upper arm, hanging from the head. Everything the shoulder does is this bone moving on the scapula.',
      '骨頭から続く上腕の骨です。肩関節の運動は、すべてこの骨が肩甲骨に対して動くこととして起こります。',
      SHAPE_NOTE.note,
      SHAPE_NOTE.noteJa
    ),
    bone(
      'acromion',
      'Acromion and scapular spine',
      '肩峰・肩甲棘',
      'The ridge across the back of the scapula, running out into a shelf that stands **over** the head of the humerus. The gap between that shelf and the cuff below it is small, and it is the space the shoulder’s troubles happen in.',
      '肩甲骨の背面を横切る隆起が、外側で棚状に広がり、上腕骨頭の**上に**張り出した部分です。この棚とその下の腱板との間隙は狭く、肩の障害はこの空間で起こります。',
      '**The space under it is drawn wider than it is**, so that the tendon passing through can be seen and selected: it is a display decision, not a dimension, and no clearance may be read off this model. Drawn as one piece with the spine it continues from; the subacromial bursa that lies in that gap is not drawn.',
      '**その下の間隙は、実際より広く描いています**——下を通る腱を見て選択できるようにするための表示上の措置であり、解剖学的な寸法ではありません。このモデルから間隙の広さを読み取らないでください。連続する肩甲棘と一体のものとして描いており、この間隙にある肩峰下滑液包も描いていません。'
    ),
    bone(
      'coracoid-process',
      'Coracoid process',
      '烏口突起',
      'A hook off the front of the scapula, pointing forward and outwards. It is the other end of the arch over the joint, and the anchor for three of the ligaments here.',
      '肩甲骨の前面から前外方に突出する鉤状の突起です。関節の上を渡すアーチのもう一端であり、このシーンの3本の靱帯の付着部でもあります。'
    ),
    bone(
      'clavicle',
      'Clavicle',
      '鎖骨',
      'The **only** bone joining the whole shoulder to the trunk — sternum at one end, acromion at the other. Its S-curve is why it is drawn as a curve and not a strut.',
      '肩全体を体幹につなぐ**唯一の**骨で、一端は胸骨、他端は肩峰に連結します。S字状に湾曲しているため、直線の支柱ではなく曲線として描いています。',
      'The sternal end and the joint it makes there are outside this scene.',
      '胸骨側の端と胸鎖関節は、このシーンの範囲外です。'
    ),
    cuff(
      'supraspinatus-tendon',
      'Supraspinatus tendon',
      '棘上筋腱',
      'From above the spine of the scapula, **under the acromion**, to the top of the greater tubercle. It starts the arm moving away from the side — and its route under a bony shelf is why it is the cuff tendon that gives trouble.',
      '肩甲棘の上方から**肩峰の下を通って**大結節上面に停止します。腕を側方へ挙げ始める働きをします。骨の棚の下を通るという走行が、腱板のなかでこの腱に障害が多い理由です。',
      'One strap standing for a muscle and its tendon. Where the tendon becomes muscle is not drawn, and its footprint is not a measured one.',
      '筋とその腱を1本の帯として描いています。腱と筋の移行部は表現しておらず、停止部の広がりも実測値ではありません。'
    ),
    cuff(
      'infraspinatus-tendon',
      'Infraspinatus tendon',
      '棘下筋腱',
      'From the back of the scapula below the spine, round the back of the head, to the greater tubercle behind supraspinatus. It turns the arm outwards.',
      '肩甲棘より下方の肩甲骨背面から、骨頭の後方を回って、棘上筋の後方で大結節に停止します。腕を外旋させます。'
    ),
    cuff(
      'teres-minor-tendon',
      'Teres minor tendon',
      '小円筋腱',
      'The lowest of the three behind, from the outer border of the scapula to the lowest facet of the greater tubercle. It turns the arm outwards with infraspinatus.',
      '後方の3筋のうち最も下方にあり、肩甲骨外側縁から大結節の最下部に停止します。棘下筋とともに腕を外旋させます。'
    ),
    cuff(
      'subscapularis-tendon',
      'Subscapularis tendon',
      '肩甲下筋腱',
      'The only one of the four in **front** of the joint: from the surface of the scapula that faces the ribs, across the front of the head, to the lesser tubercle. It turns the arm inwards, and it is the front wall of the sleeve.',
      '4筋のうち唯一、関節の**前方**にあります。肋骨に面する肩甲骨前面から骨頭の前を横切り、小結節に停止します。腕を内旋させるとともに、腱板という「袖」の前壁をなします。'
    ),
    cuff(
      'long-head-of-biceps-tendon',
      'Long head of biceps tendon',
      '上腕二頭筋長頭腱',
      'Begins **inside the joint**, on the rim of the socket, crosses the top of the head, and turns down the groove between the two tubercles. Nothing else in the body takes that route.',
      '**関節の内部**、関節窩の縁から起こり、骨頭の上を越えて、2つの結節の間の溝を下行します。このような走行をとる腱は他にありません。',
      'It is not part of the rotator cuff, and is grouped with it here only because it runs through the same place.',
      'この腱は腱板には含まれません。同じ場所を通るという理由だけで、ここでは同じ組にまとめています。'
    ),
    ligament(
      'coracoacromial-ligament',
      'Coracoacromial ligament',
      '烏口肩峰靱帯',
      'Coracoid to acromion, completing an **arch of bone and ligament over the joint**. The cuff passes underneath it, and the space between the two is narrow.',
      '烏口突起と肩峰を結び、**関節の上に骨と靱帯のアーチ**を完成させます。腱板はその下を通り、両者の間隙は狭いままです。',
      'The subacromial space under the arch is a gap, not a structure, and the bursa in it is not drawn.',
      'アーチの下の肩峰下間隙は構造ではなく空隙であり、その中にある滑液包も描いていません。'
    ),
    ligament(
      'acromioclavicular-ligament',
      'Acromioclavicular ligament',
      '肩鎖靱帯',
      'The short band over the joint between the clavicle and the acromion — the one joint between the arm and the trunk, and a small one.',
      '鎖骨と肩峰の間の関節をまたぐ短い靱帯です。腕と体幹をつなぐ唯一の関節であり、しかも小さな関節です。'
    ),
    ligament(
      'coracoclavicular-ligament',
      'Coracoclavicular ligament',
      '烏口鎖骨靱帯',
      'Coracoid up to the clavicle. It is this pair, not the joint capsule, that carries the weight of the arm across to the clavicle.',
      '烏口突起から鎖骨へ向かう靱帯です。腕の重量を鎖骨へ伝えているのは、関節包ではなくこの靱帯です。',
      'Drawn as one band; in life it is two, the conoid and the trapezoid.',
      '1本の帯として描いていますが、実際には菱形靱帯と円錐靱帯の2本からなります。'
    ),
    ligament(
      'inferior-glenohumeral-ligament',
      'Inferior glenohumeral ligament',
      '下関節上腕靱帯',
      'A sling under the head, from the lower rim of the socket to the neck of the humerus. Slack with the arm at the side and tight with the arm overhead — which is the position it matters in.',
      '関節窩の下縁から上腕骨頸部へ張る、骨頭を下から支える吊り紐です。腕を下ろしているときは弛緩し、挙上時に緊張します。この靱帯が働くのはその肢位です。',
      'The rest of the capsule and the superior and middle glenohumeral ligaments are not drawn.',
      '関節包の他の部分と、上・中関節上腕靱帯は描いていません。'
    ),
  ]);
}

export const SHOULDER_ANATOMY_META = Object.freeze({
  id: 'shoulder-anatomy',
  status: 'alpha',
  title: 'Interactive shoulder anatomy',
  titleJa: '触れて学ぶ肩関節の解剖',
  subtitle: 'Point to identify; click or tap to pin a bone, a cuff tendon or a ligament',
  subtitleJa: '触れて部位を確認・クリック／タップで骨・腱板・靱帯を固定',
  inspection: { background: 'studio' },
  palette: {
    bone: SHOULDER_SCENE_COLORS['humeral-head'],
    socket: SHOULDER_SCENE_COLORS['glenoid-labrum'],
    cuff: SHOULDER_SCENE_COLORS['supraspinatus-tendon'],
    ligament: SHOULDER_SCENE_COLORS['coracoacromial-ligament'],
  },
  legend: [
    { key: 'bone', label: 'Bones', labelJa: '骨' },
    { key: 'socket', label: 'Socket, labrum and cartilage', labelJa: '関節窩・関節唇・軟骨' },
    { key: 'cuff', label: 'Rotator cuff and biceps', labelJa: '腱板・二頭筋長頭' },
    { key: 'ligament', label: 'Ligaments', labelJa: '靱帯' },
  ],
  stages: [
    {
      id: 'ball-and-socket',
      name: 'A ball on a shallow socket',
      nameJa: '浅い受け皿の上の球',
      at: 0,
      summary:
        'A large humeral head against a small glenoid, with the labrum round its rim and an arch of bone and ligament above.',
      summaryJa:
        '大きな上腕骨頭と小さな関節窩、その縁を取り巻く関節唇、そして上方に渡る骨と靱帯のアーチ。',
    },
    {
      id: 'the-sleeve',
      name: 'The sleeve that holds it on',
      nameJa: '骨頭を保持する「袖」',
      at: 1,
      summary:
        'The bones fade: four cuff tendons wrapping the head from four directions, and the biceps tendon crossing it from inside the joint.',
      summaryJa:
        '骨を薄くすると、四方から骨頭を包む腱板4筋の腱と、関節内から骨頭を越える上腕二頭筋長頭腱が見えます。',
    },
  ],
  range: { start: 'Bones', startJa: '骨', end: 'Cuff', endJa: '腱板' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right shoulder with the arm at the side, drawn schematically. **Nothing here moves, and no length, angle, thickness or attachment footprint is a measurement.** **The subacromial space is drawn wider than it is** so that the tendon under the arch can be seen — a display decision, and no clearance may be read off this model. Bone shapes are simplified solids; cartilage thickness is drawn to be visible; each cuff tendon is one strap standing for a muscle and its tendon. The joint capsule apart from one ligament, the subacromial and other bursae, deltoid, the remaining scapular muscles, the vessels and the brachial plexus are not drawn, and nothing here is anyone’s shoulder.',
  disclaimerJa:
    '教育用肉眼解剖モデル：腕を下ろした状態の右肩を模式的に描いたものです。**このシーンでは何も動かず、長さ・角度・厚み・付着部の広がりは、いずれも実測値ではありません。** **肩峰下の間隙は、下を通る腱が見えるように実際より広く描いています**——表示上の措置であり、このモデルから間隙の広さを読み取らないでください。骨の形状は単純化した立体で、軟骨の厚みは見えるように描いており、腱板の各腱は筋と腱を1本の帯で表しています。1本の靱帯を除く関節包・肩峰下滑液包などの滑液包・三角筋・その他の肩甲骨周囲筋・血管・腕神経叢は描いておらず、特定の個人の肩でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
