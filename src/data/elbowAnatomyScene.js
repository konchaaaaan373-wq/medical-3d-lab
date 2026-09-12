/**
 * What the elbow scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/elbowJoint.js`. The copy is
 * laid out as the joint is built: **the bone it hangs off, the bones that hang
 * off it, what covers them, what holds them, what moves them, and what merely
 * passes through** — because the last group is the one that gets hurt.
 *
 * It names no fracture, no dislocation, no epicondylitis and no entrapment.
 * Disease is somebody else’s scene.
 */

export const ELBOW_SCENE_COLORS = Object.freeze({
  'humerus-shaft': '#e7e0cd',
  trochlea: '#e0c48a',
  capitellum: '#dcbd84',
  'medial-epicondyle': '#e2d9c0',
  'lateral-epicondyle': '#e2d9c0',
  olecranon: '#e7e0cd',
  'ulna-shaft': '#e7e0cd',
  'radial-head': '#e0c48a',
  'radius-shaft': '#e7e0cd',
  'articular-cartilage': '#dff0f2',
  'joint-capsule': '#cfd6d2',
  'ulnar-collateral-ligament': '#d9cba8',
  'radial-collateral-ligament': '#d9cba8',
  'annular-ligament': '#cfbe98',
  'biceps-tendon': '#e4dcc6',
  'triceps-tendon': '#e4dcc6',
  'common-flexor-origin': '#b8565a',
  'common-extensor-origin': '#b8565a',
  'ulnar-nerve': '#f0e08a',
  'median-nerve': '#e6d67e',
  'brachial-artery': '#c0403e',
});

export const ELBOW_NATURAL_COLORS = Object.freeze({
  'humerus-shaft': '#ece4d2',
  trochlea: '#e8e0cc',
  capitellum: '#e8e0cc',
  'medial-epicondyle': '#ece4d2',
  'lateral-epicondyle': '#ece4d2',
  olecranon: '#ece4d2',
  'ulna-shaft': '#ece4d2',
  'radial-head': '#e8e0cc',
  'radius-shaft': '#ece4d2',
  'articular-cartilage': '#eaf4f2',
  'joint-capsule': '#d8d2c4',
  'ulnar-collateral-ligament': '#e0d4b4',
  'radial-collateral-ligament': '#e0d4b4',
  'annular-ligament': '#dccdaa',
  'biceps-tendon': '#eae2cc',
  'triceps-tendon': '#eae2cc',
  'common-flexor-origin': '#a4504e',
  'common-extensor-origin': '#a4504e',
  'ulnar-nerve': '#ece0b4',
  'median-nerve': '#ece0b4',
  'brachial-artery': '#b83c3a',
});

export const ELBOW_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function elbowStructureCopy() {
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
      hierarchy: ['Elbow', group, name],
      hierarchyJa: ['肘関節', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const arm = entry('The arm bone', '上腕骨', 'bone', ['humerus']);
  const surface = entry('The arm bone', '上腕骨', 'cartilage', ['humerus', 'articular']);
  const forearm = entry('The forearm bones', '前腕の骨', 'bone', ['forearm']);
  const forearmJoint = entry('The forearm bones', '前腕の骨', 'cartilage', ['forearm', 'articular']);
  const cover = entry('What covers it', '関節を覆うもの', 'cartilage', ['cartilage']);
  const bag = entry('What covers it', '関節を覆うもの', 'ligament', ['capsule']);
  const hold = entry('What holds it', '関節を保つもの', 'ligament', ['ligament']);
  const move = entry('What moves it', '動かすもの', 'tendon', ['tendon']);
  const origin = entry('What moves it', '動かすもの', 'muscle', ['muscle']);
  const nerve = entry('What only passes through', '通り抜けるだけのもの', 'nerve', ['nerve']);
  const vessel = entry('What only passes through', '通り抜けるだけのもの', 'vessel', ['vessel']);

  return new Map([
    arm(
      'humerus-shaft',
      'Humerus',
      '上腕骨',
      'The one bone of the arm. Just above the joint it **flares from a round shaft into a flat triangle**, and that flare is what carries the two bumps every forearm muscle and both collateral ligaments hang off.',
      '上腕の唯一の骨です。関節のすぐ上で**円柱状の骨幹から扁平な三角形へと広がり**、この広がった部分が、前腕のすべての筋と左右の側副靱帯が起始する2つの隆起（上顆）を支えています。',
      'The olecranon fossa — the hollow in the back that the point of the elbow drops into when the arm straightens — is drawn as a dish in this one body rather than as a separate structure. The bone there is paper-thin in life, which is not represented.',
      '肘頭窩（伸展時に肘頭が入る背側の窪み）は、独立した構造ではなくこの1つの形状の窪みとして描いています。実際にはこの部分の骨は紙のように薄いですが、それは表現していません。'
    ),
    surface(
      'trochlea',
      'Trochlea',
      '滑車',
      'A **spool**: a flange at each end and a groove between them. The ulna runs in that groove and can do nothing but bend and straighten — no rotation, no side-to-side. The medial flange is the deeper of the two, which is what stops the forearm sliding off the inside.',
      '**糸巻き状**の構造で、両端に隆起（縁）があり、その間に溝があります。尺骨はこの溝を走るため、屈曲・伸展以外の運動——回旋も側方移動も——ができません。内側の縁が外側より深く、これが前腕が内側へ滑り落ちるのを防いでいます。',
      'Drawn as a true surface of revolution about the joint’s own axis, and **the ulna’s notch is pressed onto it** rather than drawn to match, so the two cannot drift apart. Its true shape is slightly helical, which is not drawn.',
      '関節軸そのものを中心とした真の回転体として描いており、**尺骨の切痕はこれに押し当てて生成**しているため、両者がずれることはありません。実際の滑車はわずかに螺旋状ですが、それは描いていません。'
    ),
    surface(
      'capitellum',
      'Capitellum',
      '小頭',
      'A **ball** at the outer end of the same axis, and the radius sits on it like a cup on a doorknob. That is why a forearm can turn over without the elbow bending: one bone hinges, the other spins.',
      '同じ軸の外側端にある**球**で、橈骨はドアノブに載せたカップのようにこの上に乗ります。肘を曲げずに前腕を回せるのはこのためです——一方の骨は蝶番運動を、他方は回旋を行います。',
      'Drawn as a whole sphere. In life it faces forward and downward only, and there is no articular surface on the back of it; a radial head therefore has nothing under it when the elbow is fully straight, which is not shown.',
      '完全な球として描いています。実際には前下方のみを向いており、背側には関節面がありません。したがって完全伸展位では橈骨頭の下に関節面がありませんが、それは表現していません。'
    ),
    arm(
      'medial-epicondyle',
      'Medial epicondyle',
      '内側上顆',
      'The bump on the inner side. **Everything that bends the wrist and fingers starts here**, and the ulnar nerve runs in a groove immediately behind it — which is why this is the bump you knock and the one that hurts when you have thrown too much.',
      '内側の隆起です。**手首と手指を屈曲させる筋はすべてここから起始し**、そのすぐ背側の溝を尺骨神経が走ります。ぶつけて痛む隆起であり、投球過多で痛む隆起でもあるのはこのためです。',
      'Drawn as one knob. In a growing skeleton it is a separate centre of ossification that fuses late; **no growth plate is drawn**, and nothing here says anything about skeletal age.',
      '1つの隆起として描いています。成長期には独立した骨化中心であり、癒合は遅い時期になりますが、**骨端線は描いておらず**、骨年齢について何も述べていません。'
    ),
    arm(
      'lateral-epicondyle',
      'Lateral epicondyle',
      '外側上顆',
      'The bump on the outer side, smaller than its opposite. **Everything that straightens the wrist and fingers starts here.** Two bumps, two groups of muscle, two entirely separate complaints — and neither of them is a joint problem.',
      '外側の隆起で、内側上顆より小さい構造です。**手首と手指を伸展させる筋はすべてここから起始します。** 2つの隆起、2つの筋群、そして互いにまったく別の愁訴があり、そのいずれも関節そのものの問題ではありません。',
      'Drawn as one knob, without the supinator crest below it or the separate footprints of the muscles taking origin from it.',
      '1つの隆起として描いており、その下方の回外筋稜も、起始する各筋の付着範囲の区別も描いていません。'
    ),
    forearmJoint(
      'olecranon',
      'Olecranon and trochlear notch',
      '肘頭と滑車切痕',
      'The point of the elbow, and the **C-shaped notch** under it that grips the spool. The C wraps past half a circle, so the ulna is held on the humerus by its own shape — this is the one part of the elbow that does not need a ligament to stay put.',
      '肘の尖った部分と、その下で滑車を挟み込む**C字型の切痕**です。このCは半円を超えて回り込むため、尺骨は自らの形状によって上腕骨に保持されます。肘のなかで、靱帯に頼らず安定している唯一の部分です。',
      'The notch **is** the trochlea’s surface, taken from the same function that builds it. The coronoid process at the front end of the C is part of this one body and is not separately selectable, and the ridge that divides the notch is not drawn.',
      '切痕は、滑車を作るのと**同じ関数から得た滑車表面そのもの**です。Cの前端にあたる鉤状突起はこの1つの形状に含まれ、個別には選択できません。切痕を二分する稜も描いていません。'
    ),
    forearm(
      'ulna-shaft',
      'Ulna',
      '尺骨',
      'The forearm bone on the little-finger side. It is **thick at the elbow and thin at the wrist** — the opposite of the radius — because at this end it is the bone that carries the joint, and at the other end it carries almost nothing.',
      '小指側の前腕骨です。橈骨とは逆に、**肘側で太く手首側で細い**形をしています。肘では関節を担う骨であり、手首側ではほとんど荷重を担わないためです。',
      'Drawn as a plain tapering shaft. The interosseous border and the membrane that runs between the two bones are not drawn — **and that membrane is how load actually gets from the hand to the elbow**, so its absence matters.',
      '単純に先細りする骨幹として描いています。骨間縁と、2骨の間に張る骨間膜は描いていません——**手から肘へ荷重が伝わる経路はこの骨間膜**であるため、これを描いていないことには意味があります。'
    ),
    forearmJoint(
      'radial-head',
      'Radial head',
      '橈骨頭',
      'A **disc, dished on top**, that spins on the capitellum and rolls round the side of the ulna at the same time. Both movements happen at once every time a palm turns over, and both happen inside one ring of ligament.',
      '**上面が皿状に窪んだ円板**で、小頭の上で回旋しつつ、同時に尺骨の側面を転がります。手のひらを返すたびにこの2つの運動が同時に起こり、いずれも1つの輪状靱帯の内側で起こります。',
      'Drawn as a circular disc at one size. In life it is slightly oval, which is part of why rotation is not perfectly concentric; that is not represented, and the head does not turn in this scene.',
      '1つの大きさの円形の円板として描いています。実際にはやや楕円形で、回旋が完全な同心円運動でない理由の一部ですが、それは表現しておらず、このシーンで橈骨頭は回旋しません。'
    ),
    forearm(
      'radius-shaft',
      'Radius',
      '橈骨',
      'The forearm bone on the thumb side, **thin at the elbow and broad at the wrist**. It bows away from the ulna, and that bow is the space the two bones need to cross in when a hand turns over. The lump on it is where the biceps ends.',
      '母指側の前腕骨で、**肘側で細く手首側で太い**形をしています。尺骨から離れる方向に弯曲しており、この弯曲が、手のひらを返す際に2骨が交差するための空間になります。骨幹上の隆起（橈骨粗面）が上腕二頭筋の停止部です。',
      'The tuberosity is drawn as a lump on the side of the shaft **away from the thumb**, which is what lets the biceps turn a palm up; the exact footprint is not a measurement. The bow is drawn to read rather than measured.',
      '橈骨粗面は骨幹の**母指と反対側**の隆起として描いています。上腕二頭筋が回外できるのはこの位置関係によります。付着範囲は実測値ではなく、弯曲も読み取れるように描いたもので実測ではありません。'
    ),
    cover(
      'articular-cartilage',
      'Articular cartilage',
      '関節軟骨',
      'The layer over every surface that moves on another: the spool, the ball, the notch that grips the spool and the dish that sits on the ball. It has **no nerves and no blood supply**, which is why it can be worn away without being felt and why it does not grow back.',
      '互いに動くすべての面——滑車、小頭、滑車を挟む切痕、小頭に乗る皿状の面——を覆う層です。**神経も血管もない**ため、摩耗しても痛みとして自覚されにくく、また再生もしません。',
      'Drawn as one structure over three surfaces, at an even thickness that is **thicker than life so that it can be seen and clicked**. No thickness here is a measurement.',
      '3つの面にまたがる1つの構造として、均一な厚みで描いています。この厚みは**視認と選択のために実物より厚く**しており、寸法ではありません。'
    ),
    bag(
      'joint-capsule',
      'Joint capsule',
      '関節包',
      '**One bag over both joints.** The hinge and the pivot are not separate rooms — so a swelling, a bleed or an infection in an elbow stiffens bending and turning together, and a joint held still swells into the position it is least able to straighten from.',
      '**蝶番関節と車軸関節を1つの袋が覆っています。** この2つは別々の空間ではないため、肘の腫脹・関節血症・感染では屈伸と回内外が同時に制限されます。また固定された関節は、最も伸展しにくい肢位で腫脹します。',
      'Drawn as one smooth sleeve, translucent so that what is inside stays visible. The synovial lining, the fat pads at the front and back, and the recesses the capsule folds into are not drawn.',
      '滑らかな1つの被膜として、内部が見えるよう半透明で描いています。滑膜、前後の脂肪体、関節包が折り返してつくる陥凹は描いていません。'
    ),
    hold(
      'ulnar-collateral-ligament',
      'Ulnar collateral ligament',
      '内側側副靱帯',
      'The ligament on the inner side, in two bands. It starts **on the joint’s own axis**, at the medial epicondyle, which is why it does not slacken as the elbow bends. Its front band is what a throwing arm tears and what is reconstructed when it does.',
      '内側の靱帯で、2本の線維束からなります。**関節軸そのものの上**——内側上顆——から起始するため、屈曲しても弛緩しません。投球動作で損傷するのは前斜走線維で、再建術の対象となるのもこの線維束です。',
      'Two bands are drawn, to the coronoid in front and the olecranon behind; the transverse band is not drawn. **The origin is taken from the joint axis**, not written as a coordinate, so the claim that it stays tight is a property of the model.',
      '前方の鉤状突起へ向かう束と後方の肘頭へ向かう束の2本を描いており、横走線維は描いていません。**起始は関節軸から取得**しており座標として書いていないため、「屈曲しても緊張が保たれる」という主張はモデルの性質になっています。'
    ),
    hold(
      'radial-collateral-ligament',
      'Radial collateral ligament',
      '外側側副靱帯',
      'The ligament on the outer side, starting on the same axis at the other end — and it **does not reach the radius at all**. It blends into the ring around the radial head instead, so the head can spin inside a ligament that never has to move with it.',
      '外側の靱帯で、同じ軸の反対端から起始します。そして**橈骨には一切付着しません。** 橈骨頭を取り巻く輪状靱帯に移行するため、橈骨頭は、それに追随する必要のない靱帯の内側で回旋できます。',
      'Drawn as one band into the annular ligament. The lateral ulnar collateral ligament — the band behind it that posterolateral rotatory instability is about — is not drawn separately.',
      '輪状靱帯へ移行する1本の束として描いています。後外側回旋不安定症の主体である外側尺側側副靱帯は、個別には描いていません。'
    ),
    hold(
      'annular-ligament',
      'Annular ligament',
      '輪状靱帯',
      'A ring round the radial head, fixed to the **ulna** at both ends and to the radius at neither. The head is therefore held against the ulna and free to spin inside the ring — and in a small child the ring is shallow enough that a pull on the arm can let the head slip out of it.',
      '橈骨頭を取り巻く輪で、両端は**尺骨**に固着し、橈骨には付着しません。橈骨頭は尺骨に押しつけられつつ、輪の中で自由に回旋できます。小児ではこの輪が浅いため、腕を引かれると橈骨頭が輪から抜けることがあります。',
      'Drawn as an open ring with both ends reaching the ulna, which is what it is. Its funnel shape — narrower below than above, which is part of what holds the head — is drawn only slightly, and **nothing here may be used to judge or perform any reduction.**',
      '両端が尺骨に達する開いた輪として描いており、実際にその形です。下方が上方より狭いという漏斗状の形状（橈骨頭の保持に関与します）はわずかにしか描いていません。**整復の判断や手技に用いることはできません。**'
    ),
    move(
      'biceps-tendon',
      'Biceps tendon',
      '上腕二頭筋腱',
      'It crosses the front of the joint and ends on the far side of the radius from the thumb. Because it pulls the radius round rather than straight, **the biceps is a supinator before it is a flexor** — which is why a right-handed screw turns the way it does.',
      '関節前面を越え、橈骨の母指と反対側に停止します。橈骨をまっすぐではなく回す方向に引くため、**上腕二頭筋は屈筋である前に回外筋**です。右ねじの回転方向がこの向きである理由でもあります。',
      'Drawn as a tendon only: the muscle belly above it is not drawn, nor is the flat expansion that leaves it to blend into the forearm fascia. **The tendon does not move or shorten in this scene.**',
      '腱のみを描いており、上方の筋腹も、前腕筋膜へ広がる腱膜も描いていません。**このシーンで腱は動かず、短縮もしません。**'
    ),
    move(
      'triceps-tendon',
      'Triceps tendon',
      '上腕三頭筋腱',
      'The one thing that straightens an elbow, ending on the point of it. There is no second muscle for the job — which is why a torn triceps tendon or a broken olecranon costs extension outright, while a torn biceps costs some flexion and not all of it.',
      '肘を伸展させる唯一の構造で、肘頭に停止します。この役割を担う第2の筋はありません。上腕三頭筋腱断裂や肘頭骨折で伸展が完全に失われるのに対し、上腕二頭筋腱断裂では屈曲が一部しか失われないのはこのためです。',
      'Drawn as one broad tendon; the three heads it comes from and the bursa between it and the skin are not drawn.',
      '1本の幅広い腱として描いており、起始となる3つの頭も、腱と皮膚の間の滑液包も描いていません。'
    ),
    origin(
      'common-flexor-origin',
      'Common flexor origin',
      '屈筋群共同腱',
      'Every muscle that bends the wrist and fingers, starting from one small area on the inner bump. **A whole forearm hangs off a patch of bone the size of a fingernail** — which is what makes that patch, and not the joint, the thing that hurts.',
      '手首と手指を屈曲させるすべての筋が、内側上顆の小さな一点から起始します。**前腕全体が爪ほどの広さの骨に付着している**ことが、関節ではなくこの部位が疼痛源になる理由です。',
      'Drawn as one cone leaving the epicondyle. The individual muscles, their bellies and the two heads of flexor carpi ulnaris the ulnar nerve passes between are not drawn.',
      '上顆から出る1つの円錐として描いています。個々の筋・筋腹、そして尺骨神経が通過する尺側手根屈筋の2頭は描いていません。'
    ),
    origin(
      'common-extensor-origin',
      'Common extensor origin',
      '伸筋群共同腱',
      'The same arrangement on the other bump, for every muscle that straightens the wrist and fingers. It is the commoner of the two to hurt, and what hurts is a few millimetres of tendon where it meets bone — not the joint under it.',
      '反対側の隆起における同じ配置で、手首と手指を伸展させるすべての筋が起始します。2つのうち疼痛をきたす頻度が高いのはこちらで、痛むのは腱の骨付着部のわずか数ミリであり、その下の関節ではありません。',
      'Drawn as one cone leaving the epicondyle; no individual muscle is drawn, and no part of this model represents inflammation, degeneration or a tear.',
      '上顆から出る1つの円錐として描いており、個々の筋は描いていません。炎症・変性・断裂のいずれもこのモデルは表現していません。'
    ),
    nerve(
      'ulnar-nerve',
      'Ulnar nerve',
      '尺骨神経',
      'It passes **behind** the medial epicondyle, in a groove with nothing over it but skin. That is the whole reason an elbow can be knocked and a little finger can feel it — and the reason a nerve that is not part of the joint is the thing an elbow problem most often damages.',
      '内側上顆の**背側**を、皮膚以外に覆うものがない溝の中を通ります。肘をぶつけると小指にしびれが走るのはこのためであり、関節の構成体でない神経が肘の障害で最も損傷されやすい理由でもあります。',
      'Drawn as one cord on the usual course. It branches, and in some people it slips forward over the epicondyle when the elbow bends; **neither is drawn, and the nerve does not move in this scene.**',
      '典型的な走行の1本として描いています。実際には分枝し、一部の人では屈曲時に上顆を越えて前方へ亜脱臼します。**いずれも描いておらず、このシーンで神経は動きません。**'
    ),
    nerve(
      'median-nerve',
      'Median nerve',
      '正中神経',
      'It crosses the front of the joint, on the inner side of the artery, and passes straight on into the forearm. **It has no groove and no bump of its own here**, which is exactly why it is the one of the two that is usually spared.',
      '関節前面を、動脈の内側で越え、そのまま前腕へ入ります。**この高さでは固有の溝も隆起もなく**、だからこそ2本の神経のうち通常は障害を免れる側になります。',
      'Drawn as one cord with no branches. The two heads of pronator teres it passes between, and the bicipital aponeurosis that crosses in front of it, are not drawn.',
      '分枝のない1本として描いています。通過する円回内筋の2頭も、その前面を横切る上腕二頭筋腱膜も描いていません。'
    ),
    vessel(
      'brachial-artery',
      'Brachial artery',
      '上腕動脈',
      'The artery of the arm, running down the front of the joint between the biceps tendon outside it and the median nerve inside it. **That order — tendon, artery, nerve — is the map of the hollow in front of an elbow**, and it is the same in everybody.',
      '上腕の動脈で、外側の上腕二頭筋腱と内側の正中神経の間を、関節前面に沿って下行します。**外側から腱・動脈・神経というこの順序が肘窩の地図**であり、これは誰においても同じです。',
      'Drawn as one vessel, undivided. It divides into the radial and ulnar arteries just below the joint; that division, the veins in front of it and the aponeurosis over it are not drawn, and **nothing here may be used to plan a puncture or a line.**',
      '分岐しない1本の血管として描いています。実際には関節のすぐ下方で橈骨動脈と尺骨動脈に分かれますが、その分岐も、前面の静脈も、覆う腱膜も描いていません。**穿刺やカテーテル留置の計画に用いることはできません。**'
    ),
  ]);
}

export const ELBOW_ANATOMY_META = Object.freeze({
  id: 'elbow-anatomy',
  status: 'alpha',
  title: 'Interactive elbow anatomy',
  titleJa: '触れて学ぶ肘関節の解剖',
  subtitle: 'Point to identify; click or tap to pin a bone, a ligament, a tendon or a nerve',
  subtitleJa: '触れて部位を確認・クリック／タップで骨・靱帯・腱・神経を固定',
  inspection: { background: 'studio' },
  palette: {
    bone: ELBOW_SCENE_COLORS['humerus-shaft'],
    cartilage: ELBOW_SCENE_COLORS['articular-cartilage'],
    ligament: ELBOW_SCENE_COLORS['ulnar-collateral-ligament'],
    tendon: ELBOW_SCENE_COLORS['biceps-tendon'],
    muscle: ELBOW_SCENE_COLORS['common-flexor-origin'],
    nerve: ELBOW_SCENE_COLORS['ulnar-nerve'],
    vessel: ELBOW_SCENE_COLORS['brachial-artery'],
  },
  legend: [
    { key: 'bone', label: 'Bone', labelJa: '骨' },
    { key: 'cartilage', label: 'Joint surfaces', labelJa: '関節面' },
    { key: 'ligament', label: 'Capsule and ligaments', labelJa: '関節包・靱帯' },
    { key: 'tendon', label: 'Tendons', labelJa: '腱' },
    { key: 'muscle', label: 'Muscle origins', labelJa: '筋の起始' },
    { key: 'nerve', label: 'Nerves', labelJa: '神経' },
    { key: 'vessel', label: 'Artery', labelJa: '動脈' },
  ],
  stages: [
    {
      id: 'covered',
      name: 'Closed',
      nameJa: '閉じた状態',
      at: 0,
      summary: 'One capsule over two joints, with the soft tissue that crosses it lying on the outside.',
      summaryJa: '2つの関節を1つの関節包が覆い、それを越える軟部組織が外側に重なっています。',
    },
    {
      id: 'opened',
      name: 'Opened',
      nameJa: '開いた状態',
      at: 1,
      summary:
        'Take the capsule away and there is a spool for the ulna, a ball for the radius, one axis through both, and a ligament at each end of that axis.',
      summaryJa:
        '関節包を外すと、尺骨のための糸巻き（滑車）、橈骨のための球（小頭）、その両方を貫く1本の軸、そして軸の両端にある側副靱帯が現れます。',
    },
  ],
  range: { start: 'Closed', startJa: '閉', end: 'Opened', endJa: '開' },
  progressLabel: { label: 'Capsule transparency', labelJa: '関節包の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right elbow, drawn schematically in one position. **Nothing here moves: the joint does not bend, the forearm does not turn, the radial head does not spin and no tendon shortens** — the movements every structure here exists for are described and not shown. No length, angle, thickness or attachment footprint is a measurement. The articular cartilage is **drawn thicker than life so that it can be seen and clicked**. Muscles are drawn as two common origins, not as individual bellies; the interosseous membrane, the growth plates, the bursae, the fat pads, the synovium, the veins of the cubital fossa, the bicipital aponeurosis, the lateral ulnar collateral ligament and every branch of every nerve and vessel are not drawn. Each nerve is drawn as one cord on the usual course, and **in life the course varies — an ulnar nerve may slip forward over the epicondyle when the elbow bends.** **Nothing here may be used to plan or perform any puncture, line, block, reduction, injection or operation.** Nothing here is anyone’s elbow.',
  disclaimerJa:
    '教育用肉眼解剖モデル：右肘関節を1つの肢位で模式的に描いたものです。**このシーンでは何も動きません——関節は屈曲せず、前腕は回旋せず、橈骨頭は回転せず、腱も短縮しません。** ここにあるすべての構造が存在する目的である運動そのものは、説明にとどめています。長さ・角度・厚み・付着範囲はいずれも実測値ではありません。関節軟骨は**視認と選択のために実物より厚く**描いています。筋は個々の筋腹ではなく2つの共同腱として描いています。骨間膜・骨端線・滑液包・脂肪体・滑膜・肘窩の静脈・上腕二頭筋腱膜・外側尺側側副靱帯、および神経と血管のすべての分枝は描いていません。各神経は典型的な走行の1本として描いていますが、**実際の走行は変動し、尺骨神経は屈曲時に上顆を越えて前方へ亜脱臼することがあります。** **穿刺・カテーテル留置・神経ブロック・整復・注射・手術の計画や実施に用いることはできません。** 特定の個人の肘でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
