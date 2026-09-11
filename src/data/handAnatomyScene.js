/**
 * What the hand and wrist scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/hand.js`. The copy is laid out
 * from the forearm outwards — **the two bones, the eight in the wrist, the
 * five rays** — and then doubles back to the tunnel, because the tunnel is not
 * a structure you reach by going outwards: it is the space left over when the
 * arch of the carpus has a lid put on it.
 *
 * It names no fracture, no entrapment, no operation. Disease is somebody else's
 * scene.
 */

export const HAND_SCENE_COLORS = Object.freeze({
  radius: '#ece4d0',
  ulna: '#e6ddc6',
  scaphoid: '#f2e4b8',
  lunate: '#e8e0c8',
  triquetrum: '#e4dcc4',
  pisiform: '#e0d8c0',
  trapezium: '#e8e0c8',
  trapezoid: '#e4dcc4',
  capitate: '#ece4cc',
  hamate: '#e4dcc4',
  'hamate-hook': '#dcd4bc',
  metacarpals: '#ece4d0',
  'proximal-phalanges': '#e9e1cb',
  'middle-phalanges': '#e6ddc6',
  'distal-phalanges': '#e4dac2',
  'flexor-retinaculum': '#d4c08c',
  'carpal-tunnel': '#8fc0d8',
  'flexor-tendons': '#e5dcc4',
  'median-nerve': '#f0e27c',
  'extensor-tendons': '#ddd2b4',
  'thenar-muscles': '#c4816f',
});

export const HAND_NATURAL_COLORS = Object.freeze({
  radius: '#ece4d0',
  ulna: '#e8e0cc',
  scaphoid: '#eae2ce',
  lunate: '#e8e0cc',
  triquetrum: '#e6dec8',
  pisiform: '#e4dcc6',
  trapezium: '#e8e0cc',
  trapezoid: '#e6dec8',
  capitate: '#eae2ce',
  hamate: '#e6dec8',
  'hamate-hook': '#e2dac4',
  metacarpals: '#ece4d0',
  'proximal-phalanges': '#eae2cc',
  'middle-phalanges': '#e8e0c8',
  'distal-phalanges': '#e6dec6',
  'flexor-retinaculum': '#dcd0b0',
  'carpal-tunnel': '#cdd9e0',
  'flexor-tendons': '#e8e0cc',
  'median-nerve': '#e8e0b8',
  'extensor-tendons': '#e4dcc4',
  'thenar-muscles': '#c07c6c',
});

export const HAND_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function handStructureCopy() {
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
      hierarchy: ['Hand and wrist', group, name],
      hierarchyJa: ['手と手関節', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const forearm = entry('Forearm', '前腕', 'forearm', ['forearm']);
  const carpus = entry('The eight carpal bones', '手根骨', 'carpus', ['carpus']);
  const ray = entry('The five rays', '中手骨と指骨', 'rays', ['rays']);
  const tunnel = entry('The tunnel', '手根管', 'tunnel', ['tunnel']);
  const soft = entry('Tendons and muscle', '腱と筋', 'soft', ['soft']);
  // Soft tissue that is **not** in the tunnel, and is in front of it or behind
  // it from the one viewpoint the tunnel can be seen from. Tagged separately so
  // that view can put it away; it is the same group in the tree.
  const outside = entry('Tendons and muscle', '腱と筋', 'soft', ['soft', 'outside-tunnel']);

  const carpalBone = (id, name, nameJa, description, descriptionJa, note, noteJa) =>
    carpus(id, name, nameJa, description, descriptionJa, note, noteJa);

  return new Map([
    forearm(
      'radius',
      'Radius',
      '橈骨',
      'The thumb-side bone of the forearm, and **the one the hand actually sits on**: almost the whole weight of the wrist joint is taken by its lower end, which is why that end is the most commonly broken bone in the body.',
      '前腕の母指側の骨で、**手はこの骨に載っています**。手関節の荷重のほとんどは橈骨遠位端が受けるため、ここは全身で最も骨折しやすい部位です。',
      'Only the lower part is drawn. Its styloid, the joint surface on its end and its joints with the ulna are not drawn.',
      '下部のみを描いています。茎状突起・関節面・橈尺関節は描いていません。'
    ),
    forearm(
      'ulna',
      'Ulna',
      '尺骨',
      'The little-finger side of the forearm. Its lower end **does not reach the carpal bones**: a disc of cartilage sits between them, so the ulna is separated from the wrist by a gap the model leaves as a gap.',
      '前腕の小指側の骨です。その遠位端は**手根骨に直接は接しません**——間に三角線維軟骨が介在するため、このモデルでも隙間として描いています。',
      'Only the lower part is drawn, and the disc between it and the carpus is described and not drawn.',
      '下部のみを描いており、手根骨との間の関節円板は説明にとどめています。'
    ),
    carpalBone(
      'scaphoid',
      'Scaphoid',
      '舟状骨',
      'The one on the thumb side, bridging both rows. It is **the carpal bone that gets broken**, and the one whose blood comes in from the far end — so a break across the middle can leave the near half with no supply at all.',
      '母指側にあり、近位列と遠位列の両方にまたがる骨です。**手根骨で最も骨折しやすく**、栄養血管が遠位端から入るため、中央での骨折では近位骨片への血流が途絶えることがあります。',
      'A smooth block at one size. Its waist, its tubercle and the artery that enters it are described and not drawn — **nothing here shows a blood supply**.',
      '1つの大きさの滑らかなブロックとして描いています。腰部・結節・栄養血管は説明にとどめており、**血流はこのモデルでは表現していません**。'
    ),
    carpalBone(
      'lunate',
      'Lunate',
      '月状骨',
      'The middle of the near row, directly under the radius. It is the one that **dislocates** — pushed forward out of its place towards the palm, into the tunnel.',
      '近位列の中央、橈骨の真下にある骨です。**脱臼する**のはこの骨で、掌側へ押し出されて手根管内に飛び出します。',
      'A smooth block at one size; its crescent shape and its joint surfaces are not drawn.',
      '1つの大きさの滑らかなブロックとして描いています。半月形や関節面は表現していません。'
    ),
    carpalBone(
      'triquetrum',
      'Triquetrum',
      '三角骨',
      'The little-finger end of the near row, sitting under the disc rather than under a bone.',
      '近位列の小指側にあり、骨ではなく関節円板の下に位置します。',
      'A smooth block at one size.',
      '1つの大きさの滑らかなブロックとして描いています。'
    ),
    carpalBone(
      'pisiform',
      'Pisiform',
      '豆状骨',
      'A pea sitting **on** the triquetrum on the palm side — not between two bones at all, but a bone formed inside a tendon. It is one of the two pillars the roof of the tunnel is stretched between.',
      '三角骨の掌側に**載っている**小さな骨で、骨と骨の間にあるのではなく腱の中にできた種子骨です。手根管の屋根が張られる2本の柱の一方でもあります。',
      'A small sphere. The tendon it sits in is not drawn.',
      '小さな球として描いています。これを含む腱は描いていません。'
    ),
    carpalBone(
      'trapezium',
      'Trapezium',
      '大菱形骨',
      'The far row, thumb side. Its joint with the thumb is a **saddle** — two curves at right angles to one another — and it is that shape, not muscle, that lets a thumb be brought across to the other fingers.',
      '遠位列の母指側の骨です。母指中手骨との関節は**鞍関節**——互いに直交する2つの曲面——で、母指を他の指へ対立させられるのは筋ではなくこの形によります。',
      'A smooth block; **the saddle shape is described and not drawn**, and the joint does not move.',
      '滑らかなブロックとして描いています。**鞍関節の形は説明にとどめており**、関節は動きません。'
    ),
    carpalBone(
      'trapezoid',
      'Trapezoid',
      '小菱形骨',
      'The smallest of the far row, wedged between the trapezium and the capitate and barely moving against either.',
      '遠位列で最も小さく、大菱形骨と有頭骨の間に楔状に挟まり、いずれに対してもほとんど動きません。',
      'A smooth block at one size.',
      '1つの大きさの滑らかなブロックとして描いています。'
    ),
    carpalBone(
      'capitate',
      'Capitate',
      '有頭骨',
      'The largest of the eight, in the middle of the far row. Everything in the wrist turns around it, which is why it is the one every description starts from.',
      '8個の手根骨で最大で、遠位列の中央にあります。手関節の運動はこの骨を中心に起こるため、手根骨の記述はここから始まります。',
      'A smooth block; its rounded head, and the joints all round it, are not drawn.',
      '滑らかなブロックとして描いています。丸い骨頭や周囲の関節面は描いていません。'
    ),
    carpalBone(
      'hamate',
      'Hamate',
      '有鉤骨',
      'The far row, little-finger side. What matters about it is what sticks out of it towards the palm.',
      '遠位列の小指側の骨です。重要なのは、そこから掌側へ突き出す突起です。',
      'A smooth block; the hook is drawn separately so it can be pointed at.',
      '滑らかなブロックとして描いています。鉤は指し示せるように別に描いています。'
    ),
    carpalBone(
      'hamate-hook',
      'Hook of the hamate',
      '有鉤骨鉤',
      'A post standing up from the hamate towards the palm. With the pisiform beside it, it is **the ulnar pillar the roof of the tunnel is anchored to** — and it is the other thing in the wrist that breaks and does not heal.',
      '有鉤骨から掌側へ立ち上がる突起です。隣の豆状骨とともに、**手根管の屋根が固定される尺側の柱**をなします。骨折して癒合しにくい構造としても知られます。',
      'Drawn as a separate post so it can be selected. It is part of the hamate, not a ninth carpal bone.',
      '選択できるように別の突起として描いていますが、有鉤骨の一部であって9番目の手根骨ではありません。'
    ),
    ray(
      'metacarpals',
      'Metacarpals',
      '中手骨',
      'The five bones of the palm. **They are not five of the same thing**: the thumb’s is shorter and set at an angle to the rest, which is what puts the thumb where it can meet the other fingers.',
      '手掌をつくる5本の骨です。**同じものが5本あるのではありません**——母指の中手骨は短く、他と角度をなして位置しており、これが母指を対立位に置いています。',
      'Five smooth shafts from one table of rays. Their heads, bases and the joints between them are not drawn, and **no bone length is a measurement**.',
      '1つの ray の表から生成した5本の滑らかな骨幹です。骨頭・骨底・骨間関節は描いておらず、**骨の長さは実測値ではありません**。'
    ),
    ray(
      'proximal-phalanges',
      'Proximal phalanges',
      '基節骨',
      'The first bone of each finger and of the thumb — five of them, one on every ray.',
      '各指および母指の第1の骨で、5本のすべての ray に1つずつあります。',
      'Five smooth shafts. Joints, capsules and the volar plates are not drawn.',
      '5本の滑らかな骨幹として描いています。関節・関節包・掌側板は描いていません。'
    ),
    ray(
      'middle-phalanges',
      'Middle phalanges',
      '中節骨',
      '**Four, not five.** The thumb has no middle phalanx — it has two bones in it where every other digit has three, and that is the plainest structural difference between a thumb and a finger.',
      '**5本ではなく4本です。** 母指には中節骨がなく、他の指が3本の骨をもつのに対し母指は2本です。母指と指の最も明快な構造上の違いです。',
      'Built from the same table of rays as the others, where the thumb’s entry is simply absent — so the model cannot accidentally grow a fifth.',
      '他と同じ ray の表から生成しており、母指の項目が存在しないだけです。誤って5本目が生えることはありません。'
    ),
    ray(
      'distal-phalanges',
      'Distal phalanges',
      '末節骨',
      'The last bone of each digit, carrying the nail and the pulp. Five again — the thumb catches up here.',
      '各指の最後の骨で、爪と指腹を支えます。ここでは再び5本になります。',
      'Five smooth shafts; the tufts at their ends, the nails and the pulp are not drawn.',
      '5本の滑らかな骨幹として描いています。末節粗面・爪・指腹は描いていません。'
    ),
    tunnel(
      'flexor-retinaculum',
      'Flexor retinaculum',
      '屈筋支帯',
      'A short, **inelastic** band across the two pillars of the carpal arch. It is what turns a groove into a tunnel, and because it does not stretch, anything that takes up more room inside has to displace something else.',
      '手根アーチの2本の柱の間に張られた、短く**伸びない**線維性の帯です。これが溝を管に変えています。伸びないため、内部で場所を取るものが増えれば、何かが押しのけられることになります。',
      'One smooth band. Its layers, its attachments and the structures that pass **over** rather than under it are not drawn.',
      '滑らかな1枚の帯として描いています。層構造・付着・支帯の**上**を通る構造は描いていません。'
    ),
    tunnel(
      'carpal-tunnel',
      'Carpal tunnel',
      '手根管',
      'The space left between the arch of the carpal bones and the band across it. **Nine tendons and one nerve share it**, and none of them can move sideways — which is the whole of why this space has a name.',
      '手根骨のアーチとその上の屈筋支帯の間に残る空間です。**9本の腱と1本の神経がここを共有**しており、いずれも横へ逃げられません。この空間に名前がある理由はその一点です。',
      'Drawn as the space itself, bounded above by the band and below by the arch, because a space cannot otherwise be pointed at. **No cross-sectional area or pressure is represented.**',
      '空間は他に指し示す方法がないため、上を屈筋支帯・下を手根骨アーチで区切られた空間そのものとして描いています。**断面積や内圧は表現していません。**'
    ),
    soft(
      'flexor-tendons',
      'Flexor tendons',
      '屈筋腱',
      'The tendons that bend the fingers, passing through the tunnel on their way from the forearm to the fingers. Nine go through; **the muscles that pull them are all in the forearm**, which is why a hand can be strong without being bulky.',
      '指を曲げる腱で、前腕から指へ向かう途中で手根管を通ります。管内を通るのは9本です。**これらを引く筋はすべて前腕にあり**、手そのものが太くならずに強い力を出せるのはこのためです。',
      'Seven cords stand for nine, as a bundle: **which tendon is which is not represented**, and their sheaths are not drawn.',
      '9本を代表する7本の束として描いています。**どの腱がどれかは表現しておらず**、腱鞘も描いていません。'
    ),
    soft(
      'median-nerve',
      'Median nerve',
      '正中神経',
      'Through the tunnel with the tendons, and **the most palmar thing in it** — lying directly against the underside of the band. It is the softest thing in a space that cannot give, which is why it is the one that suffers.',
      '腱とともに手根管を通り、**管内で最も掌側**、すなわち屈筋支帯の裏面に接して走ります。逃げ場のない空間の中で最も柔らかい構造であるため、障害を受けるのはこの神経です。',
      'One plain cord. Its branches, its fascicles and everything it supplies are described and not drawn.',
      '単純な1本のひもとして描いています。分枝・神経束・支配領域は説明にとどめています。'
    ),
    outside(
      'extensor-tendons',
      'Extensor tendons',
      '伸筋腱',
      'On the **back** of the hand, where there is no tunnel at all — just skin over them. That is why they can be seen and felt moving under it, and the flexors cannot.',
      '手の**背側**を走ります。ここには管はなく、皮膚のすぐ下を通るだけです。手背で腱の動きが透けて見えるのはそのためで、屈筋腱ではそうはいきません。',
      'Four cords for the fingers; the thumb’s extensors, the extensor retinaculum over them and the hoods over the knuckles are not drawn.',
      '手指の4本のみを描いています。母指の伸筋腱、その上の伸筋支帯、指背腱膜は描いていません。'
    ),
    outside(
      'thenar-muscles',
      'Thenar muscles',
      '母指球筋',
      'The mound at the base of the thumb, and the muscles that bring it across to the other fingers. Most of them are supplied by the nerve in the tunnel — so **this is the part of a hand that wastes** when that nerve stops working.',
      '母指基部の膨らみをなす筋群で、母指を他指へ対立させる働きをもちます。その大部分は手根管を通る正中神経に支配されるため、**この神経が障害されると萎縮するのはここです**。',
      'Drawn as one mass. The individual muscles in it are not separated, and **nothing contracts**.',
      '1つの塊として描いています。個々の筋は分けておらず、**収縮もしません**。'
    ),
  ]);
}

export const HAND_ANATOMY_META = Object.freeze({
  id: 'hand-anatomy',
  status: 'alpha',
  title: 'Interactive hand and wrist anatomy',
  titleJa: '触れて学ぶ手・手関節の解剖',
  subtitle: 'Point to identify; click or tap to pin a carpal bone, a ray or what runs through the tunnel',
  subtitleJa: '触れて部位を確認・クリック／タップで手根骨・指の骨・手根管の内容を固定',
  inspection: { background: 'studio' },
  palette: {
    forearm: HAND_SCENE_COLORS.radius,
    carpus: HAND_SCENE_COLORS.scaphoid,
    rays: HAND_SCENE_COLORS.metacarpals,
    tunnel: HAND_SCENE_COLORS['carpal-tunnel'],
    soft: HAND_SCENE_COLORS['median-nerve'],
  },
  legend: [
    { key: 'forearm', label: 'Forearm', labelJa: '前腕' },
    { key: 'carpus', label: 'The eight carpal bones', labelJa: '手根骨' },
    { key: 'rays', label: 'The five rays', labelJa: '中手骨と指骨' },
    { key: 'tunnel', label: 'The tunnel', labelJa: '手根管' },
    { key: 'soft', label: 'Tendons and muscle', labelJa: '腱と筋' },
  ],
  stages: [
    {
      id: 'bones',
      name: 'Bones',
      nameJa: '骨',
      at: 0,
      summary: 'Two bones in the forearm, eight in the wrist, and five rays out to the fingertips.',
      summaryJa: '前腕の2本、手関節の8個、そして指先へ向かう5本の ray です。',
    },
    {
      id: 'tunnel',
      name: 'And the tunnel',
      nameJa: 'そして手根管',
      at: 1,
      summary:
        'The bones step back: an arch with a band across it, and nine tendons and a nerve sharing the space underneath.',
      summaryJa:
        '骨を薄くすると、アーチとその上に張られた支帯、そして下の空間を分け合う9本の腱と1本の神経が見えます。',
    },
  ],
  range: { start: 'Bones', startJa: '骨', end: 'Tunnel', endJa: '手根管' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A **right** hand in anatomical position, drawn schematically. **Nothing here moves**: no joint bends, no tendon slides, no thumb opposes and no grip is represented. No bone length, joint angle, tendon calibre or tunnel dimension is a measurement, and **no cross-sectional area or pressure is represented**. Bones are smooth blocks and shafts: heads, bases, styloids, joint surfaces, capsules and ligaments are not drawn, the saddle shape of the thumb’s joint is described and not drawn, and the blood supply of the scaphoid — which is the reason it is spoken about the way it is — is not represented at all. Seven cords stand for the nine flexor tendons and which is which is not represented; the sheaths, the extensor retinaculum, the extensor hoods, the thumb’s extensors, the ulnar nerve and artery, the intrinsic muscles other than the thenar mass, the skin and the nails are not drawn. Nothing here is anyone’s hand.',
  disclaimerJa:
    '教育用肉眼解剖モデル：解剖学的正位における**右手**を模式的に描いたものです。**このシーンでは何も動きません**——関節は屈曲せず、腱は滑走せず、母指の対立も把持も表現していません。骨の長さ・関節角度・腱の太さ・手根管の寸法はいずれも実測値ではなく、**断面積も内圧も表現していません**。骨は滑らかなブロックと骨幹として描いており、骨頭・骨底・茎状突起・関節面・関節包・靭帯は描いていません。母指 CM 関節の鞍関節構造は説明にとどめ、舟状骨の血行——この骨が特別視される理由そのもの——は一切表現していません。屈筋腱9本は7本の束で代表させており、どの腱がどれかは表現していません。腱鞘・伸筋支帯・指背腱膜・母指の伸筋腱・尺骨神経と尺骨動脈・母指球以外の手内在筋・皮膚・爪も描いておらず、特定の個人の手でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
