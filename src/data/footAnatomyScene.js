/**
 * What the foot and ankle scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/foot.js`. The copy is laid out
 * from the leg down and then forwards — **the socket, the bones under it, the
 * rays, and then what holds the arch** — because the arch is the conclusion
 * rather than the starting point: it is a relationship between the bones, not
 * one of them.
 *
 * It names no sprain, no fracture, no fasciitis, no operation. Disease is
 * somebody else's scene.
 */

export const FOOT_SCENE_COLORS = Object.freeze({
  tibia: '#ece4d0',
  fibula: '#e6ddc6',
  calcaneus: '#eae2cc',
  talus: '#f0e6cc',
  navicular: '#e8e0c8',
  cuboid: '#e4dcc4',
  cuneiforms: '#e6dec6',
  metatarsals: '#ece4d0',
  'proximal-phalanges': '#e9e1cb',
  'middle-phalanges': '#e6ddc6',
  'distal-phalanges': '#e4dac2',
  'plantar-fascia': '#d4b978',
  'spring-ligament': '#d8c8a0',
  'achilles-tendon': '#e8dfc6',
  'tibialis-posterior-tendon': '#dcc98c',
  'peroneal-tendons': '#c9b98a',
  'deltoid-ligament': '#cfc08e',
  'lateral-ligaments': '#c08a5a',
  'ankle-joint': '#8fc0d8',
  'subtalar-joint': '#a9cfe0',
});

export const FOOT_NATURAL_COLORS = Object.freeze({
  tibia: '#ece4d0',
  fibula: '#e8e0cc',
  calcaneus: '#eae2ce',
  talus: '#ece4d0',
  navicular: '#e8e0cc',
  cuboid: '#e6dec8',
  cuneiforms: '#e8e0ca',
  metatarsals: '#ece4d0',
  'proximal-phalanges': '#eae2cc',
  'middle-phalanges': '#e8e0c8',
  'distal-phalanges': '#e6dec6',
  'plantar-fascia': '#dcd0b0',
  'spring-ligament': '#dcd0b4',
  'achilles-tendon': '#e8e0cc',
  'tibialis-posterior-tendon': '#e0d8c0',
  'peroneal-tendons': '#dcd4bc',
  'deltoid-ligament': '#d8ccac',
  'lateral-ligaments': '#d4c8a4',
  'ankle-joint': '#cdd9e0',
  'subtalar-joint': '#cdd9e0',
});

export const FOOT_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function footStructureCopy() {
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
      hierarchy: ['Foot and ankle', group, name],
      hierarchyJa: ['足と足関節', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const leg = entry('The leg above it', '下腿', 'leg', ['leg']);
  const tarsus = entry('The back of the foot', '足根骨', 'tarsus', ['tarsus']);
  const ray = entry('The rays', '中足骨と趾骨', 'rays', ['rays']);
  const arch = entry('What holds the arch', 'アーチを支えるもの', 'arch', ['arch']);
  const soft = entry('Tendons and ligaments', '腱と靭帯', 'soft', ['soft']);
  const joint = entry('The two joints', '2つの関節', 'joint', ['joint']);

  return new Map([
    leg(
      'tibia',
      'Tibia',
      '脛骨',
      'The weight-bearing bone of the leg. Its lower end is the **roof** of the ankle socket, and the spur running down the inside of the ankle — the medial malleolus — is part of it.',
      '下腿の荷重を担う骨です。その遠位端が足関節の**天井**をなし、足関節内側に下る突起（内果）もこの骨の一部です。',
      'Only the lower part is drawn. Its joint surface, its shaft shape and its joints with the fibula are not drawn.',
      '下部のみを描いています。関節面・骨幹の形態・脛腓関節は描いていません。'
    ),
    leg(
      'fibula',
      'Fibula',
      '腓骨',
      'The thin bone on the outside, which carries almost no weight. Its lower end — the lateral malleolus — reaches **further down than the medial one does**, and that asymmetry is why a foot turns inwards more easily than outwards.',
      '外側の細い骨で、荷重はほとんど担いません。その遠位端（外果）は**内果よりも下方まで達しており**、この左右差が、足が外反より内反しやすい理由です。',
      'Only the lower part is drawn; the joint surface and the ligaments binding it to the tibia are not drawn.',
      '下部のみを描いています。関節面や脛腓靭帯は描いていません。'
    ),
    tarsus(
      'talus',
      'Talus',
      '距骨',
      'The bone in the socket. **No muscle is attached to it at all** — nothing pulls on it directly; it moves because the bones around it move, and it passes the whole weight of the body from the leg into the foot.',
      '足関節の臼蓋に収まる骨です。**筋が1つも付着していません**——直接引かれることはなく、周囲の骨が動くことで動きます。体重の全てを下腿から足へ伝えます。',
      'A smooth block; its dome, its head and its three joint surfaces are not drawn, and **its blood supply — which is the reason it is spoken about the way it is — is not represented**.',
      '滑らかなブロックとして描いています。距骨滑車・距骨頭・3つの関節面は描いておらず、**この骨が特別視される理由である血行も表現していません**。'
    ),
    tarsus(
      'calcaneus',
      'Calcaneus',
      '踵骨',
      'The heel: the largest bone of the foot and the one that hits the ground first. The Achilles tendon pulls on the back of it and the long band under the arch pulls forwards from the bottom of it — **two ropes on one post, pulling opposite ways**.',
      '踵をなす、足で最も大きく、最初に接地する骨です。後方をアキレス腱が引き、下面からは足底腱膜が前方へ引きます——**1本の支柱に、逆向きに引く2本の綱**がついている形です。',
      'A smooth block, flattened underneath. Its tuberosity, the shelf that holds the talus up and its joint surfaces are not drawn.',
      '下面を平らにした滑らかなブロックとして描いています。踵骨隆起・載距突起・関節面は描いていません。'
    ),
    tarsus(
      'navicular',
      'Navicular',
      '舟状骨',
      'In front of the talus on the **inside** of the foot, riding high. It is the keystone of the medial arch, and the tendon that holds that arch up while a foot is moving is attached to it.',
      '距骨の前方、足の**内側**の高い位置にあります。内側縦アーチの要石であり、運動中にアーチを支える後脛骨筋腱がここに付着します。',
      'A smooth block; its tuberosity and the accessory bone some people have beside it are not drawn.',
      '滑らかなブロックとして描いています。舟状骨粗面や、人によって存在する外脛骨は描いていません。'
    ),
    tarsus(
      'cuboid',
      'Cuboid',
      '立方骨',
      'The same position on the **outside** of the foot — and it sits far lower than the navicular does. That difference in height between the two sides **is** the arch.',
      '足の**外側**で舟状骨と同じ位置にありますが、舟状骨よりはるかに低い位置にあります。この内外の高さの差こそがアーチです。',
      'A smooth block; the groove for the peroneal tendon under it is not drawn.',
      '滑らかなブロックとして描いています。下面を走る腓骨筋腱溝は描いていません。'
    ),
    tarsus(
      'cuneiforms',
      'Cuneiforms',
      '楔状骨',
      'Three wedge-shaped bones in a row in front of the navicular, wide on top and narrow underneath. Set side by side, **three wedges make an arch across the foot** as well as along it.',
      '舟状骨の前方に並ぶ3個の楔形の骨で、上面が広く下面が狭い形をしています。この楔を並べることで、縦方向だけでなく**横方向のアーチ**も形成されます。',
      'Drawn as one block for three, so the wedge shape that makes the transverse arch is described and not shown. They are one selectable structure rather than three.',
      '3個を1つのブロックとして描いており、横アーチをつくる楔形は説明にとどめています。3個ではなく1つの選択単位です。'
    ),
    ray(
      'metatarsals',
      'Metatarsals',
      '中足骨',
      'The five long bones of the forefoot, sloping **down** from the tarsus to the ground. Their heads are the second point of contact — the ball of the foot — and the far end of the band that holds the arch.',
      '前足部の5本の長い骨で、足根骨から地面へ向かって**下方に傾斜**します。その骨頭が母趾球・小趾球にあたる第2の接地点であり、足底腱膜の前方付着部でもあります。',
      'Five smooth shafts from one table of rays. Heads, bases, the sesamoids under the first one and the joints between them are not drawn, and **no bone length is a measurement**.',
      '1つの ray の表から生成した5本の滑らかな骨幹です。骨頭・骨底・第1中足骨頭下の種子骨・骨間関節は描いておらず、**骨の長さは実測値ではありません**。'
    ),
    ray(
      'proximal-phalanges',
      'Proximal phalanges',
      '基節骨',
      'The first bone of each toe — five of them. Bending the toes **up** is what tightens the band under the arch, which is how a foot stiffens itself at the moment it pushes off.',
      '各趾の第1の骨で、5本あります。趾を**背屈**させると足底腱膜が巻き上げられて緊張し、蹴り出しの瞬間に足が硬くなります（windlass 機構）。',
      '**Drawn flat, at rest.** The movement this note describes is not animated.',
      '**安静位、平らな状態で描いています。** ここで述べた動きは表現していません。'
    ),
    ray(
      'middle-phalanges',
      'Middle phalanges',
      '中節骨',
      '**Four, not five.** The great toe has no middle phalanx — two bones where every other toe has three, exactly as the thumb has.',
      '**5本ではなく4本です。** 母趾には中節骨がなく、他の趾が3本の骨をもつのに対し母趾は2本です。母指とまったく同じ構成です。',
      'Built from the same table of rays as the others, where the great toe’s entry is simply absent.',
      '他と同じ ray の表から生成しており、母趾の項目が存在しないだけです。'
    ),
    ray(
      'distal-phalanges',
      'Distal phalanges',
      '末節骨',
      'The last bone of each toe. Five again — the great toe catches up here, and its one is much the largest.',
      '各趾の最後の骨で、再び5本になります。母趾の末節骨は他よりはるかに大きい骨です。',
      'Five smooth shafts; the nails and the pulp are not drawn.',
      '5本の滑らかな骨幹として描いています。爪や趾腹は描いていません。'
    ),
    arch(
      'plantar-fascia',
      'Plantar fascia',
      '足底腱膜',
      'The bowstring: a band from the heel, **under the whole arch**, to the heads of the metatarsals. The bones make the arch but nothing about them keeps it from spreading — **this does**, and the place it pulls on the heel is the place that hurts.',
      'アーチの弦にあたる構造です。踵骨から**アーチ全体の下**を通って中足骨頭へ張る腱膜で、骨はアーチをつくりますが、広がるのを止めているのはこの腱膜です。踵骨付着部が疼痛の好発部位となります。',
      'One flat band. Its three parts, its attachments into the toes and the fat pad under the heel are not drawn, and **no tension or load is represented**.',
      '平らな1枚の帯として描いています。3つの部分・趾への付着・踵部脂肪体は描いておらず、**張力も荷重も表現していません**。'
    ),
    arch(
      'spring-ligament',
      'Spring ligament',
      '底側踵舟靭帯',
      'The short one, from the shelf on the heel bone forward to the navicular, **directly under the head of the talus**. The long band is the string under the whole bow; this is the sling right at the top of it.',
      '踵骨の載距突起から舟状骨へ前方に張る短い靭帯で、**距骨頭の真下**にあります。足底腱膜が弓全体の弦だとすれば、これは頂点のすぐ下で受け止める吊り紐です。',
      'One plain cord. It is drawn as a cord where it is really a broad sheet with cartilage in it.',
      '単純なひも状に描いています。実際には軟骨を含む幅のある板状構造です。'
    ),
    soft(
      'achilles-tendon',
      'Achilles tendon',
      'アキレス腱',
      'The thickest tendon in the body, into the back of the heel. It pulls the heel **up**, which levers the front of the foot **down** — the whole of push-off, through one rope on one bone.',
      '人体で最も太い腱で、踵骨後面に付着します。踵を**上に**引くことで前足部を**下に**押し下げます。蹴り出しの動作全体が、1本の骨につく1本の綱で行われています。',
      'One plain cord. The three muscles that join to make it, its twist and its sheath are not drawn, and **it does not pull**.',
      '単純なひも状に描いています。これを構成する3つの筋・腱のねじれ・パラテノンは描いておらず、**牽引もしません**。'
    ),
    soft(
      'tibialis-posterior-tendon',
      'Tibialis posterior tendon',
      '後脛骨筋腱',
      'Down behind the **inside** of the ankle and forward to the navicular. It is the muscle that holds the arch up while a foot is moving — the dynamic half of the answer, where the band underneath is the static half.',
      '足関節の**内側**後方を下り、前方の舟状骨へ向かいます。運動中にアーチを支えるのがこの筋で、静的に支える足底腱膜に対する動的な支持です。',
      'One plain cord to its main attachment. Its many other attachments, its sheath and the tunnel it runs through behind the malleolus are not drawn.',
      '主要な付着部までの単純なひもとして描いています。多数の他の付着部・腱鞘・内果後方の足根管は描いていません。'
    ),
    soft(
      'peroneal-tendons',
      'Peroneal tendons',
      '腓骨筋腱',
      'The pair behind the **outside** of the ankle, turning forward under the foot. They pull the opposite way from the tendon on the inside, and between them the two sides hold the foot level.',
      '足関節の**外側**後方を通り、前方へ回り込む1対の腱です。内側の後脛骨筋腱とは逆方向に働き、両者の釣り合いが足部の傾きを保っています。',
      'Two plain cords. Which is which, their sheaths, and the groove in the cuboid one of them runs in are not drawn.',
      '2本の単純なひもとして描いています。どちらがどの腱か・腱鞘・立方骨溝は描いていません。'
    ),
    soft(
      'deltoid-ligament',
      'Deltoid ligament',
      '三角靭帯',
      'One strong fan on the **inside** of the ankle, from the medial malleolus down onto three bones. It is a single sheet, and it is the reason the ankle gives way outwards much less readily than it gives way inwards.',
      '足関節**内側**にある1枚の強靭な扇状の靭帯で、内果から3つの骨へ広がります。一体のシートであり、足関節が外反方向には容易に破綻しない理由です。',
      'One smooth fan; its named parts and its layers are not drawn.',
      '滑らかな1枚の扇として描いています。各部分や層構造は分けていません。'
    ),
    soft(
      'lateral-ligaments',
      'Lateral ligaments',
      '外側靭帯',
      '**Three separate bands** on the outside, not one sheet — and that is exactly why this is the side that tears. The front one is the weakest and it is the one that goes first.',
      '外側は1枚のシートではなく**3本の独立した帯**です。捻挫が外側に多いのはこの構造のためで、最も弱い前距腓靭帯が最初に損傷します。',
      'Three plain cords at one size. Which is which is described and not labelled in the model, and **no strength or order of failure is represented**.',
      '1つの太さの3本のひもとして描いています。どれがどの靭帯かは説明にとどめ、**強度や断裂の順序は表現していません**。'
    ),
    joint(
      'ankle-joint',
      'Ankle joint',
      '足関節（距腿関節）',
      'The socket: the tibia above and the two malleoli on either side, gripping the talus. It is a **hinge** — it only goes up and down, and everything else a foot does happens somewhere else.',
      '脛骨が上から、両側の内果・外果が左右から距骨を挟み込む臼蓋（ほぞ穴）です。**蝶番関節**であり、背屈と底屈しか行いません。足の他の動きはすべて別の関節で起こります。',
      'Drawn as the space between the bones, because a joint is a relationship and not an object. **No range of movement is represented**, and nothing here bends.',
      '関節は物ではなく関係であるため、骨の間の空間として描いています。**可動域は表現しておらず**、屈曲もしません。'
    ),
    joint(
      'subtalar-joint',
      'Subtalar joint',
      '距骨下関節',
      'The joint **under** the talus, between it and the heel bone. Turning the sole inwards and outwards happens here, not at the ankle above it — which is why a sprain and a stiff ankle are different complaints.',
      '距骨の**下**、距骨と踵骨の間の関節です。足底を内外に向ける運動（内返し・外返し）はここで起こり、上方の距腿関節では起こりません。捻挫と足関節可動域制限が別の問題である理由です。',
      'Drawn as the space between the two bones. Its three separate facets are not drawn and **no range of movement is represented**.',
      '2つの骨の間の空間として描いています。3つの関節面は分けておらず、**可動域も表現していません**。'
    ),
  ]);
}

export const FOOT_ANATOMY_META = Object.freeze({
  id: 'foot-anatomy',
  status: 'alpha',
  title: 'Interactive foot and ankle anatomy',
  titleJa: '触れて学ぶ足・足関節の解剖',
  subtitle: 'Point to identify; click or tap to pin a bone, a joint or what holds the arch up',
  subtitleJa: '触れて部位を確認・クリック／タップで骨・関節・アーチを支える構造を固定',
  inspection: { background: 'studio' },
  palette: {
    leg: FOOT_SCENE_COLORS.tibia,
    tarsus: FOOT_SCENE_COLORS.talus,
    rays: FOOT_SCENE_COLORS.metatarsals,
    arch: FOOT_SCENE_COLORS['plantar-fascia'],
    soft: FOOT_SCENE_COLORS['lateral-ligaments'],
    joint: FOOT_SCENE_COLORS['ankle-joint'],
  },
  legend: [
    { key: 'leg', label: 'The leg above it', labelJa: '下腿' },
    { key: 'tarsus', label: 'The back of the foot', labelJa: '足根骨' },
    { key: 'rays', label: 'The rays', labelJa: '中足骨と趾骨' },
    { key: 'arch', label: 'What holds the arch', labelJa: 'アーチを支えるもの' },
    { key: 'soft', label: 'Tendons and ligaments', labelJa: '腱と靭帯' },
    { key: 'joint', label: 'The two joints', labelJa: '2つの関節' },
  ],
  stages: [
    {
      id: 'bones',
      name: 'Bones',
      nameJa: '骨',
      at: 0,
      summary: 'A leg, a bone in a socket, a heel, and five rays out to the toes.',
      summaryJa: '下腿、臼蓋に収まる距骨、踵骨、そして趾へ向かう5本の ray です。',
    },
    {
      id: 'arch',
      name: 'And the arch',
      nameJa: 'そしてアーチ',
      at: 1,
      summary:
        'The bones step back: a band slung from the heel to the heads of the metatarsals, under an arch that is high on the inside and low on the outside.',
      summaryJa:
        '骨を薄くすると、内側が高く外側が低いアーチと、その下を踵から中足骨頭へ張る足底腱膜が見えます。',
    },
  ],
  range: { start: 'Bones', startJa: '骨', end: 'Arch', endJa: 'アーチ' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A **right** foot standing on a flat ground line, drawn schematically. **Nothing here moves or bears weight**: no joint bends, no arch flattens, no tendon pulls, no toe lifts and no load is represented, so the windlass mechanism the copy describes is described and not shown. No bone length, arch height, joint angle or ligament strength is a measurement. Bones are smooth blocks and shafts: joint surfaces, capsules, the sesamoids, the fat pad under the heel and the tarsal tunnel are not drawn; the three cuneiforms are drawn as one block, so the wedge shape that makes the transverse arch is described and not shown; and **the blood supply of the talus — the reason that bone is spoken about the way it is — is not represented at all**. The muscles, the skin, the nails and the nerves are not drawn, and nothing here is anyone’s foot.',
  disclaimerJa:
    '教育用肉眼解剖モデル：平坦な地面に立つ**右足**を模式的に描いたものです。**このシーンでは何も動かず、荷重もかかりません**——関節は屈曲せず、アーチも低下せず、腱も牽引せず、趾も背屈しません。荷重も表現していないため、本文で述べた windlass 機構も説明にとどめています。骨の長さ・アーチ高・関節角度・靭帯強度はいずれも実測値ではありません。骨は滑らかなブロックと骨幹として描いており、関節面・関節包・種子骨・踵部脂肪体・足根管は描いていません。3個の楔状骨は1つのブロックとして描いているため、横アーチをつくる楔形も説明にとどめています。**距骨の血行——この骨が特別視される理由そのもの——は一切表現していません。** 筋・皮膚・爪・神経も描いておらず、特定の個人の足でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
