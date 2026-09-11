/**
 * What the neck scene says, in both languages.
 *
 * The geometry is `scenes/regional/organs/neck.js`. The copy is laid out from
 * the outside in — **the wrapping, then the midline, then the gland on it,
 * then the bundle beside it, then the nerves, then the top of the chest** —
 * because a neck is only ever met in that order, whether by a hand, a needle
 * or a knife.
 *
 * It names no goitre, no cancer, no operation and no block. Disease is
 * somebody else’s scene.
 */

export const NECK_SCENE_COLORS = Object.freeze({
  'neck-surface': '#e8c4ae',
  sternocleidomastoid: '#a84f4c',
  'strap-muscles': '#b35c56',
  'scalene-muscles': '#9f4a49',
  'posterior-neck-muscles': '#8f4442',
  'cervical-vertebrae': '#d6cbb6',
  'hyoid-bone': '#ece3cd',
  'laryngeal-cartilage': '#e4dcc6',
  trachea: '#ded4bf',
  oesophagus: '#cd9a8b',
  'thyroid-lobe': '#b0565d',
  'thyroid-isthmus': '#c06a6a',
  'parathyroid-gland': '#d9a24e',
  'carotid-sheath': '#c9c6bd',
  'common-carotid-artery': '#c0403e',
  'internal-carotid-artery': '#c8504a',
  'external-carotid-artery': '#d9665c',
  'internal-jugular-vein': '#4a6ea8',
  'deep-cervical-node': '#9cb494',
  'vagus-nerve': '#dcc271',
  'recurrent-laryngeal-nerve': '#f2d63c',
  'subclavian-artery': '#c0403e',
  'aortic-arch': '#b53a39',
});

export const NECK_NATURAL_COLORS = Object.freeze({
  'neck-surface': '#e6c6b2',
  sternocleidomastoid: '#a2504c',
  'strap-muscles': '#a85450',
  'scalene-muscles': '#9c4a48',
  'posterior-neck-muscles': '#944846',
  'cervical-vertebrae': '#e8e0d2',
  'hyoid-bone': '#ece4d0',
  'laryngeal-cartilage': '#e8e0cc',
  trachea: '#e0d6c4',
  oesophagus: '#cca090',
  'thyroid-lobe': '#9c4a52',
  'thyroid-isthmus': '#9c4a52',
  'parathyroid-gland': '#c69a62',
  'carotid-sheath': '#d8d2c4',
  'common-carotid-artery': '#b83c3a',
  'internal-carotid-artery': '#b83c3a',
  'external-carotid-artery': '#b83c3a',
  'internal-jugular-vein': '#40628f',
  'deep-cervical-node': '#c8bea4',
  'vagus-nerve': '#ece0b4',
  'recurrent-laryngeal-nerve': '#ece0b4',
  'subclavian-artery': '#b83c3a',
  'aortic-arch': '#b23836',
});

export const NECK_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function neckStructureCopy() {
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
      hierarchy: ['Neck', group, name],
      hierarchyJa: ['頸部', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const surface = entry('The wrapping', '外側の層', 'surface', ['envelope']);
  const muscle = entry('The wrapping', '外側の層', 'muscle', ['muscle']);
  const frame = entry('The frame behind', '背側の支え', 'skeleton', ['skeleton']);
  const midline = entry('The midline', '正中を通るもの', 'viscera', ['viscera']);
  const strut = entry('The midline', '正中を通るもの', 'skeleton', ['viscera', 'skeleton']);
  const gland = entry('The gland on the airway', '気管に載る腺', 'gland', ['gland']);
  const sheath = entry('The bundle on each side', '両側の束', 'vessel', ['sheath']);
  const nerve = entry('The nerves', '神経', 'nerve', ['nerve']);
  const thorax = entry('The top of the chest', '胸郭の入口', 'vessel', ['thorax']);

  return new Map([
    surface(
      'neck-surface',
      'Surface of the neck',
      '頸部の表面',
      'Everything in this scene is inside this. A neck is about **12 cm across and holds the airway, the gullet, four great vessels, the nerves that run with them and a gland** — which is why nothing in it has room to be moved out of the way.',
      'このシーンの構造はすべてこの内側にあります。**直径およそ12 cmの中に、気道・食道・4本の大血管・それらに伴走する神経・そして1つの内分泌腺が収まって**います。何かを「どかす」余地がないのはこのためです。',
      'One smooth surface at one size. Skin, fat, platysma and the fascial layers that actually make up the wrapping are not separated, and no neck is this shape.',
      '1つの大きさの滑らかな面として描いています。皮膚・皮下脂肪・広頸筋・そして実際に層をなす筋膜は分けておらず、この形が実際の頸部の輪郭でもありません。'
    ),
    muscle(
      'sternocleidomastoid',
      'Sternocleidomastoid',
      '胸鎖乳突筋',
      'The strap from behind the ear to the top of the breastbone. It is the **landmark the neck is divided by**: in front of it is where the airway, the gland and the great vessels are reached, behind it is where the nerves of the shoulder and arm come through.',
      '耳の後ろ（乳様突起）から胸骨上端へ走る帯状の筋です。**頸部を区分する基準**であり、この筋より前方が気道・甲状腺・大血管に到達する領域、後方が肩と上肢へ向かう神経の通る領域になります。',
      'Drawn as one flattened belly. Its two heads, the sternal and the clavicular, are not separated, and the triangles it divides the neck into are described and not drawn.',
      '扁平な1つの筋腹として描いています。胸骨頭と鎖骨頭は分けておらず、この筋が区切る頸三角は説明にとどめています。'
    ),
    muscle(
      'strap-muscles',
      'Strap muscles',
      '舌骨下筋群',
      'The thin ribbons lying directly over the thyroid and the front of the airway. **They are the layer that has to be parted to reach either**, and they are the reason a thyroid can be felt but not seen.',
      '甲状腺と気道前面の直上にある薄い帯状の筋群です。**いずれに到達するにも、まずこの層を正中で分ける必要があり**、甲状腺が触れても見えないのはこの層があるためです。',
      'Drawn as one ribbon on each side. Sternohyoid, sternothyroid, thyrohyoid and omohyoid are not separated, and the midline raphe between the two sides is not drawn.',
      '左右1本ずつの帯として描いています。胸骨舌骨筋・胸骨甲状筋・甲状舌骨筋・肩甲舌骨筋は分けておらず、正中の白線も描いていません。'
    ),
    muscle(
      'scalene-muscles',
      'Scalene muscles',
      '斜角筋群',
      'The muscles running from the neck bones down to the first rib, behind the great vessels. The gap between the front two is **the door the nerves and the artery of the arm leave the neck through** — everything for the upper limb passes there.',
      '頸椎から第1肋骨へ向かう、大血管の後方の筋群です。前方2つの間隙（斜角筋隙）が**上肢へ向かう神経と動脈が頸部を出る出口**であり、上肢へ行くものはすべてここを通ります。',
      'Drawn as one belly on each side. Anterior, middle and posterior scalene are not separated; **the brachial plexus and the phrenic nerve, which are why the gap matters, are not drawn at all.**',
      '左右1つの筋腹として描いています。前・中・後斜角筋は分けておらず、**この間隙が重要である理由そのものである腕神経叢と横隔神経は描いていません。**'
    ),
    muscle(
      'posterior-neck-muscles',
      'Posterior neck muscles',
      '後頸筋群',
      'The mass behind the spine that holds the head up. Nothing in the front of the neck is reached through it, which is exactly why it is worth seeing: **it says how little of a neck is actually available from the front.**',
      '脊柱の後方で頭部を支える筋塊です。前頸部の構造にここから到達することはありませんが、だからこそ描く意味があります——**頸部のうち前方から扱える範囲がいかに狭いか**を示すためです。',
      'Drawn as one mass on each side. Trapezius, the splenius and the deep suboccipital muscles are not separated.',
      '左右1つの塊として描いています。僧帽筋・頭板状筋・後頭下筋群は分けていません。'
    ),
    frame(
      'cervical-vertebrae',
      'Cervical vertebrae',
      '頸椎',
      'The column everything else is stacked in front of. It is what makes the neck’s contents **reachable at all**: the gullet and the airway can be pressed against a bony back wall, which is why a cricoid can be pushed and a thyroid can be felt.',
      '他のすべてがその前方に積み重なる支柱です。頸部の内容が**そもそも到達可能である理由**でもあります——食道と気道は骨性の後壁に押しつけられるため、輪状軟骨は圧迫でき、甲状腺は触知できます。',
      'Drawn as a stack of nine simplified blocks with a spinous and two transverse processes each. **The column itself is `spine-anatomy`**; here it is one landmark and its individual levels are not separately selectable, nor is the spinal cord, the vertebral artery or any joint drawn.',
      '9個の簡略化したブロックに、それぞれ棘突起と左右の横突起をつけた積み重ねとして描いています。**脊柱そのものは`spine-anatomy`のシーンが扱います。** ここでは1つの指標であり、各椎骨は個別に選択できません。脊髄・椎骨動脈・関節も描いていません。'
    ),
    strut(
      'hyoid-bone',
      'Hyoid bone',
      '舌骨',
      'A horseshoe of bone slung above the larynx, joined to no other bone. **The whole airway hangs from it**, and it is the first hard thing a hand finds coming down the front of a neck.',
      '喉頭の上方に吊られた馬蹄形の骨で、他のどの骨とも関節しません。**気道全体がここから吊り下がって**おり、前頸部を上から触れていったときに最初に触れる硬い構造でもあります。',
      'Drawn as one even bar. Its body and horns are not separated, and the muscles slinging it are not drawn.',
      '均一な1本の棒として描いています。体部と角は分けておらず、これを吊る筋群も描いていません。'
    ),
    strut(
      'laryngeal-cartilage',
      'Laryngeal cartilages',
      '喉頭軟骨',
      'The shield and the ring in the front of the neck: the prominence you can feel, and below it the one **complete** ring in the airway. The ring is the level everything in the neck is counted from — C6, where pharynx becomes gullet and larynx becomes trachea.',
      '前頸部にある盾と輪です。触知できる喉頭隆起と、その下にある気道で唯一の**完全な**輪（輪状軟骨）からなります。この輪が頸部の高さを数える基準（C6）で、ここで咽頭は食道に、喉頭は気管に変わります。',
      'Drawn as **one** landmark shell, not as a larynx: the thyroid and cricoid cartilages are not separated here and the arytenoids, the folds and the membrane between the cartilages are not drawn. **The larynx is `larynx-anatomy`.**',
      '喉頭そのものではなく、**1つ**の指標としての殻として描いています。甲状軟骨と輪状軟骨は分けておらず、披裂軟骨・声帯・輪状甲状膜も描いていません。**喉頭は`larynx-anatomy`のシーンが扱います。**'
    ),
    midline(
      'trachea',
      'Trachea',
      '気管',
      'The airway below the cricoid, held open by cartilage rings that are **open at the back** — which is what lets the gullet behind it expand into the gap when something is swallowed.',
      '輪状軟骨より下の気道です。軟骨輪に支えられていますが、**後方は欠けて**います。嚥下時に後方の食道が膨らむ余地は、この欠損部が作っています。',
      'Drawn as a ridged tube of one calibre, closed all the way round. The gap at the back of each ring and the muscle that closes it are not drawn, and **no calibre here is a measurement.**',
      '一定の口径で、全周が閉じたリッジ付きの管として描いています。各軟骨輪後方の欠損と、それを閉じる膜様部は描いておらず、**口径は実測値ではありません。**'
    ),
    midline(
      'oesophagus',
      'Oesophagus',
      '食道',
      'Directly behind the airway, flat and closed at rest. It **leans to the patient’s left** as it goes down, which is the reason it is reached from the left side of the neck and not the right.',
      '気道のすぐ後方にあり、安静時は扁平に閉じています。下行するにつれて**やや左に偏位する**ため、頸部食道へは右ではなく左から到達します。',
      'Drawn collapsed front to back, as it is at rest. The upper oesophageal sphincter at its mouth is not drawn, and only the neck and the very top of the chest are in this scene.',
      '安静時の前後に虚脱した形で描いています。入口部の上部食道括約筋は描いておらず、このシーンに含まれるのは頸部と胸部最上端のみです。'
    ),
    gland(
      'thyroid-lobe',
      'Thyroid lobes',
      '甲状腺葉',
      'Two lobes moulded onto the sides of the airway — they are that shape **because the trachea is there**. They move when you swallow, because they are attached to the airway and the airway rises; that is what tells a thyroid lump from every other lump in a neck.',
      '気道の側面に沿って形づくられた2つの葉です。この形をしているのは、**そこに気管があるから**です。嚥下時に挙上するのは、気道に固定されており、気道自体が挙上するためで、頸部腫瘤の中で甲状腺由来のものを見分ける所見はこれです。',
      'The medial hollow of each lobe **is** the trachea’s surface, taken from the same function that builds it, so the two can neither gap nor overlap. **Nothing swallows in this scene** and the gland does not move. Its capsule, its vessels and its follicles are not drawn, and no dimension here is a measurement.',
      '各葉の内側の陥凹は、気管を作るのと**同じ関数から得た気管表面そのもの**であり、隙間も重なりも生じません。**このシーンでは嚥下は起こらず**、腺は動きません。被膜・血管・濾胞は描いておらず、寸法は実測値ではありません。'
    ),
    gland(
      'thyroid-isthmus',
      'Isthmus',
      '峡部',
      'The bridge joining the two lobes across the front of the trachea, over its **second to fourth rings**. It is the part that lies in the midline, and therefore the part that is in the way of anything done to the front of the trachea.',
      '気管前面を横切って左右の葉をつなぐ橋で、**第2〜4気管軟骨輪**の高さに位置します。正中に存在するため、気管前壁に対する操作では常にこの部分が前方に重なります。',
      'Drawn as one band at one height. A pyramidal lobe, present in a good many people, is not drawn, and **no relationship here may be used to plan an approach to the trachea.**',
      '1つの高さの帯として描いています。かなりの頻度で存在する錐体葉は描いておらず、**ここに示した位置関係を気管への到達計画に用いることはできません。**'
    ),
    gland(
      'parathyroid-gland',
      'Parathyroid glands',
      '上皮小体（副甲状腺）',
      'Four small bodies on the back of the thyroid, usually. They run the body’s calcium and **have nothing to do with the gland they are stuck to** — which is why removing a thyroid can leave somebody with a calcium problem for life.',
      '通常は甲状腺の背側にある4つの小体です。全身のカルシウム代謝を担っており、**付着している甲状腺とは機能的に無関係**です。甲状腺全摘後に持続するカルシウム異常が生じうるのはこのためです。',
      '**Drawn larger than life** so that they can be seen and clicked (`DISPLAY.parathyroidRadius`): a parathyroid is about 6 × 4 × 2 mm and **no size here may be read as one**. Four are drawn in the usual place; in life the number and the position both vary, and an inferior gland may be anywhere from the jaw to the chest.',
      '**視認と選択のために実物より大きく描いています**（`DISPLAY.parathyroidRadius`）。上皮小体は約6×4×2 mmであり、**ここに描いた大きさを寸法として読むことはできません。** 典型的な位置に4個を描いていますが、実際には個数も位置も変動し、下上皮小体は下顎から縦隔までのどこにでも存在しえます。'
    ),
    sheath(
      'carotid-sheath',
      'Carotid sheath',
      '頸動脈鞘',
      'The fascial tube that bundles the great artery, the great vein and the vagus together on each side. **The bundle is the unit**: what is in it travels together, is found together, and is put at risk together.',
      '大動脈幹（総頸動脈）・大静脈（内頸静脈）・迷走神経を左右それぞれで束ねる筋膜性の管です。**束そのものが単位**であり、内容は一緒に走行し、一緒に同定され、一緒に危険にさらされます。',
      'Drawn translucent so that its three contents can be seen inside it; **the three are placed from the sheath itself**, so the vagus is behind the vessels because the model says so once. Its attachments above and below, and the fascial planes it is continuous with, are not drawn.',
      '内容3つが見えるよう半透明で描いています。**3つはいずれも鞘そのものから位置を決めており**、迷走神経が血管の後方にあるのはモデルが1か所でそう定めているためです。上下の付着部と、連続する筋膜層は描いていません。'
    ),
    sheath(
      'common-carotid-artery',
      'Common carotid arteries',
      '総頸動脈',
      'The artery of the head, running up inside the sheath. **The two do not begin in the same place**: the right comes off a trunk in the root of the neck, the left straight off the arch of the aorta, lower and further back.',
      '頭部への動脈で、頸動脈鞘の中を上行します。**左右で起始が異なり**、右は頸部の根部で腕頭動脈から、左はより低く後方の大動脈弓から直接起始します。',
      'The brachiocephalic trunk the right one arises from is not drawn as a separate structure; each artery is drawn beginning at the arch. The carotid body and sinus at the division are not drawn.',
      '右が起始する腕頭動脈は独立した構造としては描いておらず、各動脈は大動脈弓から始まるものとして描いています。分岐部の頸動脈小体・頸動脈洞は描いていません。'
    ),
    sheath(
      'internal-carotid-artery',
      'Internal carotid arteries',
      '内頸動脈',
      'The half of the division that goes to the brain and the eye. It runs **behind and lateral** to its neighbour and gives off nothing at all in the neck — a branchless artery in the neck is an internal carotid.',
      '分岐のうち脳と眼へ向かう側です。もう一方の**後外側**を上行し、頸部では枝を一切出しません。頸部で分枝のない動脈は内頸動脈です。',
      'Drawn as a straight run to the top of the scene. Its course through the skull base, the carotid siphon and everything beyond are not drawn.',
      'シーン上端までの直走として描いています。頭蓋底の走行・海綿静脈洞部（サイフォン）・それ以遠は描いていません。'
    ),
    sheath(
      'external-carotid-artery',
      'External carotid arteries',
      '外頸動脈',
      'The half that supplies the face, the scalp and the neck itself — including the thyroid. It runs **in front of and medial** to the internal, and unlike it, it branches almost at once.',
      '顔面・頭皮・頸部（甲状腺を含む）を養う側です。内頸動脈の**前内側**を走り、内頸動脈とは対照的に、起始直後から分枝します。',
      'Drawn as a straight run with **no branches at all**; the superior thyroid artery, which is the branch this scene would most want, is not drawn.',
      '**分枝を一切描かず**、直走として示しています。このシーンで最も必要となる上甲状腺動脈も描いていません。'
    ),
    sheath(
      'internal-jugular-vein',
      'Internal jugular veins',
      '内頸静脈',
      'The great vein of the head, lateral to the artery inside the same sheath. It is **much the largest thing in the bundle** and it is soft: it collapses when empty, which is both why it is a route into the circulation and why air can be drawn into it.',
      '頭部からの大静脈で、同じ鞘の中を動脈の外側に走ります。**束の中で最も太く**、かつ軟らかい構造です。空虚になると虚脱するため、循環へのアクセス路になると同時に、空気が引き込まれる危険もあります。',
      'Drawn at one calibre, open all the way down. In life it varies with breathing and posture; **nothing here may be used to plan a puncture, a line or any approach**, and its valves and tributaries are not drawn.',
      '一定の口径で、全長にわたり開存した状態として描いています。実際には呼吸や体位で変化します。**穿刺・カテーテル留置・到達経路の計画に用いることはできません。** 弁と流入枝は描いていません。'
    ),
    sheath(
      'deep-cervical-node',
      'Deep cervical lymph nodes',
      '深頸リンパ節',
      'A chain of nodes down the great vein. **Where a node is found says where to look for what put it there** — the whole of the head and neck drains into this chain, in an order, and that order is what a level count is for.',
      '大静脈に沿って縦に並ぶリンパ節群です。**触れたリンパ節の位置は、原因を探す場所を教えます**——頭頸部全体は一定の順序でこの群へ流入しており、レベル分類はその順序を扱うためのものです。',
      'Five nodes on each side, at one size, in one line. **The levels (I–VI) are not drawn or labelled**, the superficial and posterior groups are not drawn, and no node here is enlarged, normal or abnormal — size carries no meaning in this scene.',
      '左右5個ずつ、1つの大きさで1列に描いています。**レベル（I〜VI）は描いても表示してもおらず**、浅頸群・後頸群も描いていません。腫大・正常・異常のいずれも表しておらず、大きさに意味はありません。'
    ),
    nerve(
      'vagus-nerve',
      'Vagus nerves',
      '迷走神経',
      'The nerve of the chest and belly, passing through the neck **behind the artery and the vein**, in the angle between them. It gives the neck almost nothing and is simply travelling — but what it gives off at the bottom is the subject of this scene.',
      '胸腹部の神経で、頸部では**動脈と静脈の後方**、その間の角に位置して通過します。頸部にはほとんど枝を出さず通り抜けるだけですが、その下端で分岐するものが、このシーンの主題です。',
      'Drawn **thicker than life** so it can be followed (`DISPLAY.vagusRadius`). Its branches in the neck — the pharyngeal and the superior laryngeal — are not drawn, and **the superior laryngeal nerve’s own risk in thyroid surgery is therefore not shown at all.**',
      '追跡できるよう**実物より太く**描いています（`DISPLAY.vagusRadius`）。頸部の分枝である咽頭枝・上喉頭神経は描いておらず、**甲状腺手術における上喉頭神経のリスクはこのシーンでは示されていません。**'
    ),
    nerve(
      'recurrent-laryngeal-nerve',
      'Recurrent laryngeal nerves',
      '反回神経',
      'The nerves that move the vocal folds. Both reach the larynx **from below**, up the groove between the trachea and the gullet — but they join that groove at different heights, because **the right turns round the subclavian artery and the left goes on into the chest and turns round the arch of the aorta.** A voice is therefore a sign that can come from the neck or from the chest.',
      '声帯を動かす神経です。左右とも**下方から**、気管と食道の間の溝を上行して喉頭に達しますが、**右は鎖骨下動脈を、左は胸腔内まで下降して大動脈弓を**回り込むため、溝に合流する高さが異なります。嗄声という所見が頸部由来にも胸部由来にもなりうるのは、このためです。',
      'Drawn **thicker than life** (`DISPLAY.recurrentRadius`); the nerve is about 2 mm across. The course is drawn as **one cord on each side in the usual place** — in life it branches before it enters, it may run in front of or behind the gland’s artery, and in a small number of people the right one does not loop at all. **No course here may be relied on: the point is that the two sides differ, not where either one is.**',
      '**実物より太く**描いています（`DISPLAY.recurrentRadius`）。実際の太さは約2 mmです。走行は**左右それぞれ典型例の1本**として描いていますが、実際には喉頭に入る前に分枝し、下甲状腺動脈の前方を走ることも後方を走ることもあり、少数例では右の非反回神経も存在します。**ここに描いた走行に依拠することはできません。左右が異なるという事実が主題であり、個々の走行位置ではありません。**'
    ),
    thorax(
      'subclavian-artery',
      'Subclavian arteries',
      '鎖骨下動脈',
      'The artery of the arm, leaving across the top of the first rib. **The right recurrent laryngeal nerve turns round it** — which is why an injury at the root of the neck on the right, and only on the right, can change a voice.',
      '上肢への動脈で、第1肋骨の上を越えて外側へ向かいます。**右反回神経はこの動脈を回り込みます**。右側に限って、頸部根部の病変が嗄声を生じうるのはこのためです。',
      'Drawn only as far as it needs to be for the nerve to turn round it. Its branches — the vertebral artery among them — and the first rib itself are not drawn.',
      '神経がこの動脈を回り込むのに必要な範囲のみを描いています。椎骨動脈を含む分枝も、第1肋骨そのものも描いていません。'
    ),
    thorax(
      'aortic-arch',
      'Arch of the aorta',
      '大動脈弓',
      'The top of the great vessel, in the chest and **not in the neck at all**. It is drawn here for one reason: **the left recurrent laryngeal nerve turns round it**, which is why the left nerve is so much longer than the right, and why a chest problem can present as a voice.',
      '大血管の頂部で、胸腔内にあり**頸部ではありません**。ここに描いているのは1つの理由のためです——**左反回神経がこの弓を回り込むから**です。左の神経が右よりはるかに長いのも、胸部病変が嗄声として現れうるのもこのためです。',
      'Only the arch is drawn, and only as much of it as the nerve needs. The heart, the lungs, the ligamentum arteriosum the nerve actually passes beside, and every branch of the arch are not drawn. **This scene is not a mediastinum.**',
      '弓部のみを、神経に必要な範囲だけ描いています。心臓・肺・神経が実際に接する動脈管索・弓部の各分枝は描いていません。**このシーンは縦隔のモデルではありません。**'
    ),
  ]);
}

export const NECK_ANATOMY_META = Object.freeze({
  id: 'neck-anatomy',
  status: 'alpha',
  title: 'Interactive neck anatomy',
  titleJa: '触れて学ぶ頸部の解剖',
  subtitle: 'Point to identify; click or tap to pin a muscle, a vessel, a nerve or the gland between them',
  subtitleJa: '触れて部位を確認・クリック／タップで筋・血管・神経・甲状腺を固定',
  inspection: { background: 'studio' },
  palette: {
    surface: NECK_SCENE_COLORS['neck-surface'],
    muscle: NECK_SCENE_COLORS.sternocleidomastoid,
    skeleton: NECK_SCENE_COLORS['laryngeal-cartilage'],
    viscera: NECK_SCENE_COLORS.trachea,
    gland: NECK_SCENE_COLORS['thyroid-lobe'],
    vessel: NECK_SCENE_COLORS['common-carotid-artery'],
    nerve: NECK_SCENE_COLORS['recurrent-laryngeal-nerve'],
  },
  legend: [
    { key: 'surface', label: 'Surface', labelJa: '表面' },
    { key: 'muscle', label: 'Muscle groups', labelJa: '筋群' },
    { key: 'skeleton', label: 'Bone and cartilage', labelJa: '骨・軟骨' },
    { key: 'viscera', label: 'Airway and gullet', labelJa: '気道と食道' },
    { key: 'gland', label: 'Thyroid and parathyroids', labelJa: '甲状腺・上皮小体' },
    { key: 'vessel', label: 'Vessels and nodes', labelJa: '血管・リンパ節' },
    { key: 'nerve', label: 'Nerves', labelJa: '神経' },
  ],
  stages: [
    {
      id: 'covered',
      name: 'From outside',
      nameJa: '外から',
      at: 0,
      summary: 'A neck is a smooth surface. Nothing inside it can be seen, and almost nothing can be moved.',
      summaryJa: '外から見える頸部は滑らかな面です。内部は見えず、そして内部のほとんどは動かす余地がありません。',
    },
    {
      id: 'opened',
      name: 'Layer by layer',
      nameJa: '層を外す',
      at: 1,
      summary:
        'Take the wrapping away and the arrangement is fixed: airway and gullet stacked in the midline, the gland moulded onto the airway, a bundle on each side, and a nerve in the groove between the two tubes.',
      summaryJa:
        '外側の層を外すと配置は一定です——正中に気道と食道が前後に重なり、気道に甲状腺が張りつき、両側に血管神経束があり、2本の管の間の溝を神経が走ります。',
    },
  ],
  range: { start: 'Covered', startJa: '被覆', end: 'Opened', endJa: '展開' },
  progressLabel: { label: 'Layers removed', labelJa: '層の除去' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — The neck, drawn schematically as one representative arrangement, with the top of the chest included only so that the two recurrent laryngeal nerves have something to turn round. **Nothing here moves: nothing is swallowed, the larynx does not rise, the thyroid does not move with it, no vessel pulses and no muscle contracts.** No length, calibre, angle or distance is a measurement. The parathyroid glands and both nerves are **drawn larger than life so that they can be seen and clicked**, and no size may be read off them. Muscles are drawn as four groups, not as individual bellies; the brachial plexus, the phrenic and superior laryngeal nerves, the thyroid’s own arteries and veins, the lymph node levels, the fascial planes and the skin are not drawn. Each nerve is drawn as one cord on the usual course, and **in life the course varies, branches before entering, and on the right may not loop at all**. **Nothing here may be used to plan a puncture, a line, a block, an airway procedure or an operation.** Nothing here is anyone’s neck.',
  disclaimerJa:
    '教育用肉眼解剖モデル：頸部を1つの代表的な配置として模式的に描いたものです。胸部最上端を含めているのは、左右の反回神経が回り込む対象を示すためだけです。**このシーンでは何も動きません——嚥下も、喉頭挙上も、それに伴う甲状腺の移動もなく、血管は拍動せず、筋も収縮しません。** 長さ・口径・角度・距離はいずれも実測値ではありません。上皮小体と左右の神経は、**視認と選択のために実物より大きく描いており**、そこから寸法を読み取ることはできません。筋は個々の筋腹ではなく4つの筋群として描いています。腕神経叢・横隔神経・上喉頭神経・甲状腺の動静脈・リンパ節レベル・筋膜層・皮膚は描いていません。各神経は典型的な走行の1本として描いていますが、**実際の走行は変動し、喉頭に入る前に分枝し、右では反回しない例もあります。** **穿刺・カテーテル留置・神経ブロック・気道確保手技・手術の計画に用いることはできません。** 特定の個人の頸部でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
