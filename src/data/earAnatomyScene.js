/**
 * What the ear anatomy scene says, in both languages.
 *
 * The geometry is `scenes/sensory/organs/ear.js`. The copy is laid out as the
 * chain it describes — **air, then bone, then fluid** — because that is what an
 * ear is, and because where a problem sits in that chain is the first question
 * anybody asks about one. Each entry says what the structure receives and what
 * it passes on.
 *
 * It names no infection, no hearing loss, no test and no operation. Disease is
 * somebody else's scene.
 */

export const EAR_SCENE_COLORS = Object.freeze({
  auricle: '#e8b49a',
  'external-auditory-canal': '#d9a98f',
  'tympanic-membrane': '#e2d6c0',
  'middle-ear-cavity': '#bcd8e0',
  malleus: '#efe6cd',
  incus: '#e0cfa4',
  stapes: '#f2ead6',
  'eustachian-tube': '#c98f72',
  cochlea: '#e0c07a',
  vestibule: '#cfa8d8',
  'semicircular-canals': '#b07ec4',
  'vestibulocochlear-nerve': '#e8e0c8',
});

export const EAR_NATURAL_COLORS = Object.freeze({
  auricle: '#e6b49c',
  'external-auditory-canal': '#d8a890',
  'tympanic-membrane': '#ded2bc',
  'middle-ear-cavity': '#cfe0e4',
  malleus: '#ece2c8',
  incus: '#e6dcc0',
  stapes: '#f0e8d4',
  'eustachian-tube': '#cc9478',
  cochlea: '#e4d4b0',
  vestibule: '#dcc8b8',
  'semicircular-canals': '#d4c0b0',
  'vestibulocochlear-nerve': '#ece4cc',
});

export const EAR_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SCALE_NOTE = {
  note: '**Everything medial to the drum is drawn far larger than life.** An ossicle is a few millimetres against an auricle of sixty; at one scale the whole middle ear is a speck. It is a display scale so each part can be seen and clicked, and **no size relation across the drum may be read off this model**.',
  noteJa:
    '**鼓膜より内側の構造は、実際よりはるかに大きく描いています。** 耳小骨は数ミリ、耳介は約60ミリで、同じ縮尺では中耳全体が点にしかなりません。各部位を見分けて選択できるようにするための表示上の縮尺であり、**鼓膜をまたぐ大きさの比をこのモデルから読み取らないでください**。',
};

export function earStructureCopy() {
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
      hierarchy: ['Ear', group, name],
      hierarchyJa: ['耳', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const outer = entry('Outer ear', '外耳', 'outer', ['outer']);
  const middle = entry('Middle ear', '中耳', 'middle', ['middle']);
  const inner = entry('Inner ear', '内耳', 'inner', ['inner']);

  return new Map([
    outer(
      'auricle',
      'Auricle',
      '耳介',
      'The part of an ear anybody means by "ear": a dish of cartilage standing off the side of the head, with a hollow in the middle that the canal opens out of. It collects sound and tells the brain **which direction it came from**.',
      '一般に「耳」と呼ばれる部分で、頭部の側面から立ち上がる軟骨の皿です。中央のくぼみ（耳甲介）から外耳道が始まります。音を集めるとともに、**音がどの方向から来たか**の手がかりを与えます。',
      'One smooth shell. The named hollows and folds of an auricle are not separately drawn.',
      '滑らかな1枚の殻として描いています。耳介の各部（耳甲介・対輪など）は個別には描いていません。'
    ),
    outer(
      'external-auditory-canal',
      'External auditory canal',
      '外耳道',
      'The passage from the hollow of the auricle to the drum. It is **not straight** — it turns on the way in, which is why an ear has to be pulled to see down it, and why what is at the far end is hard to look at.',
      '耳介のくぼみから鼓膜へ至る管です。**まっすぐではなく**途中で曲がっており、鼓膜を観察するには耳介を引っ張る必要があるのはそのためです。',
      'Drawn as the passage itself, because a space cannot otherwise be pointed at. Its cartilaginous and bony parts are not separated, and it carries no hair or wax.',
      '空間は他に指し示す方法がないため、管そのものとして描いています。軟骨部と骨部は分けておらず、耳毛や耳垢も表現していません。'
    ),
    middle(
      'tympanic-membrane',
      'Tympanic membrane',
      '鼓膜',
      'The boundary between air outside and air inside — and the first thing in the chain that moves. It is **drawn inwards at its centre** by the bone attached to it, and that point, the umbo, is the landmark everything else on the drum is described from.',
      '外側の空気と内側の空気を隔てる境界であり、音の伝達経路で最初に動く構造です。付着する耳小骨によって**中央が内側に引き込まれて**おり、その点（臍＝umbo）が鼓膜所見の基準になります。',
      'One even cone. Its layers, its two parts and the vessels on it are not drawn, and **it does not move**.',
      '厚みの一定な円錐として描いています。層構造・緊張部と弛緩部の区別・表面の血管は描いておらず、**このシーンでは振動しません**。'
    ),
    middle(
      'middle-ear-cavity',
      'Middle ear cavity',
      '鼓室',
      'An air space in bone, between the drum and the inner ear, with the three bones crossing it. **It has to contain air at the same pressure as the outside**, or the drum cannot move freely — and its only supply is one tube.',
      '鼓膜と内耳の間にある骨内の含気腔で、3つの耳小骨がここを横切ります。**外気と同じ圧の空気で満たされている必要があり**、そうでなければ鼓膜は自由に動けません。空気の供給路は1本の管だけです。',
      SCALE_NOTE.note,
      SCALE_NOTE.noteJa
    ),
    middle(
      'malleus',
      'Malleus',
      'ツチ骨',
      'The first of the three. Its handle is **attached along the drum** and its head sits above, so when the drum moves this bone moves with it. It is the one ossicle whose position can be read from outside.',
      '3つの耳小骨の最初のものです。柄（つか）が**鼓膜に接着**し、頭部はその上方にあるため、鼓膜が動けばこの骨も動きます。外から位置を読み取れる唯一の耳小骨です。',
      SCALE_NOTE.note,
      SCALE_NOTE.noteJa
    ),
    middle(
      'incus',
      'Incus',
      'キヌタ骨',
      'The middle link, between malleus and stapes. Its long process reaches down to the stapes, and being the thinnest part of the chain it is the part that gives way first.',
      'ツチ骨とアブミ骨をつなぐ中間の骨です。長脚が下方へ伸びてアブミ骨に達します。連鎖のなかで最も細い部分であり、最初に破綻するのもここです。',
      SCALE_NOTE.note,
      SCALE_NOTE.noteJa
    ),
    middle(
      'stapes',
      'Stapes',
      'アブミ骨',
      'The smallest bone in the body, and the last link before fluid. Its footplate sits **in the oval window**, so it does not strike the inner ear — it pushes on it, and the three bones together are a lever that makes that push strong enough to move liquid.',
      '人体で最も小さい骨で、液体に至る直前の最後の連結です。底板が**前庭窓（卵円窓）にはまっており**、内耳を叩くのではなく押します。3つの耳小骨はてこをなし、液体を動かすのに十分な力に変換します。',
      SCALE_NOTE.note,
      SCALE_NOTE.noteJa
    ),
    middle(
      'eustachian-tube',
      'Eustachian tube',
      '耳管',
      'Runs forward, down and inwards from the cavity to the back of the nose. It is the **only** way air gets into the middle ear, and the only way anything in the throat gets out of it — which is the whole of why a cold and an ear are connected.',
      '鼓室から前下内方へ走り、鼻の奥（上咽頭）に開きます。中耳に空気が入る**唯一の**経路であり、咽頭側のものが中耳に及ぶ経路でもあります。かぜと耳の問題がつながるのはこのためです。',
      'Only the part near the ear is drawn; where it opens into the pharynx is outside this scene, and it neither opens nor closes here.',
      '耳に近い部分のみを描いており、上咽頭への開口部はこのシーンの範囲外です。開閉も表現していません。'
    ),
    inner(
      'cochlea',
      'Cochlea',
      '蝸牛',
      'A tube wound about two and a half turns, and the organ of hearing. Where along that spiral a sound moves the fluid is **which pitch it is** — high near the window, low at the far end — so a spiral is not decoration, it is the map.',
      '約2回転半巻いた管で、聴覚を担う器官です。らせんのどこで内リンパが動くかが**音の高さ**に対応しており——窓に近いほど高音、奥ほど低音——らせん構造そのものが周波数の地図になっています。',
      SCALE_NOTE.note,
      SCALE_NOTE.noteJa
    ),
    inner(
      'vestibule',
      'Vestibule',
      '前庭',
      'The chamber between the cochlea and the canals, and what the stapes pushes on. It senses **which way is down** and whether you are speeding up in a straight line.',
      '蝸牛と半規管の間にある部屋で、アブミ骨が押すのはここです。**どちらが下か**、そして直線的な加速を感じ取ります。',
      SCALE_NOTE.note,
      SCALE_NOTE.noteJa
    ),
    inner(
      'semicircular-canals',
      'Semicircular canals',
      '半規管',
      'Three loops, one organ — and the three lie in **three different planes**, which is how a head knows it is turning whichever way it turns. One structure here, because which of the three is which is a question about plane rather than about identity.',
      '3つのループからなる1つの器官で、それぞれが**異なる3つの平面**に位置しています。これにより、どの向きの回転も感知できます。3つのうちどれかという問いは平面についての問いであるため、ここでは1つの構造として扱っています。',
      'Drawn as three even loops, one structure with three meshes. The ampullae at their ends and the fluid in them are not drawn, and nothing moves.',
      '太さの一定な3つのループ（1構造・3メッシュ）として描いています。膨大部と内部のリンパ液は描いておらず、動きもありません。'
    ),
    inner(
      'vestibulocochlear-nerve',
      'Vestibulocochlear nerve',
      '内耳神経',
      'Two bundles in one sheath — one from the cochlea and one from the vestibule and the canals — running inwards towards the brainstem. Hearing and balance leave the ear together, which is why they are so often lost together.',
      '1つの鞘の中の2つの神経束——蝸牛からのものと、前庭・半規管からのもの——が内側へ走り、脳幹に向かいます。聴覚と平衡覚が同じ神経で出ていくため、両者はしばしば同時に障害されます。',
      'Drawn as one trunk; the two divisions are described and not separated.',
      '1本の幹として描いています。2つの神経束は説明にとどめ、形としては分けていません。'
    ),
  ]);
}

export const EAR_ANATOMY_META = Object.freeze({
  id: 'ear-anatomy',
  status: 'alpha',
  title: 'Interactive ear anatomy',
  titleJa: '触れて学ぶ耳の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the outer, middle or inner ear',
  subtitleJa: '触れて部位を確認・クリック／タップで外耳・中耳・内耳の各部を固定',
  inspection: { background: 'studio' },
  palette: {
    outer: EAR_SCENE_COLORS.auricle,
    middle: EAR_SCENE_COLORS['eustachian-tube'],
    inner: EAR_SCENE_COLORS.cochlea,
  },
  legend: [
    { key: 'outer', label: 'Outer ear', labelJa: '外耳' },
    { key: 'middle', label: 'Middle ear', labelJa: '中耳' },
    { key: 'inner', label: 'Inner ear', labelJa: '内耳' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'Air',
      nameJa: '空気',
      at: 0,
      summary: 'The auricle collects, the canal carries, and the drum at the end of it is the first thing that moves.',
      summaryJa: '耳介が集め、外耳道が伝え、その奥の鼓膜が最初に動きます。',
    },
    {
      id: 'inside',
      name: 'Bone, then fluid',
      nameJa: '骨、そして液体',
      at: 1,
      summary:
        'The outer ear fades: three bones crossing an air space, the smallest of them in a window, and behind it a spiral and three loops.',
      summaryJa:
        '外耳を薄くすると、含気腔を横切る3つの耳小骨、窓にはまったアブミ骨、その奥のらせんと3つのループが見えます。',
    },
  ],
  range: { start: 'Outer', startJa: '外耳', end: 'Inner', endJa: '内耳' },
  progressLabel: { label: 'Outer ear transparency', labelJa: '外耳の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A right ear, drawn schematically along one line. **Nothing here moves: nothing vibrates, nothing conducts, and there is no fluid.** No length, calibre or angle is a measurement, and **everything medial to the drum is drawn far larger than life** so that each part can be seen and selected — no size relation across the drum may be read off this model. The temporal bone around it, the mastoid air cells, the facial nerve, the muscles of the ossicles, the ampullae, the endolymph and perilymph and the organ of Corti are not drawn, and nothing here is anyone’s ear.',
  disclaimerJa:
    '教育用肉眼解剖モデル：右耳を1本の経路に沿って模式的に描いたものです。**このシーンでは何も動きません——振動も伝導もなく、液体も表現していません。** 長さ・口径・角度はいずれも実測値ではなく、**鼓膜より内側の構造は、各部を見分けて選択できるように実際よりはるかに大きく描いています**——鼓膜をまたぐ大きさの比を読み取らないでください。周囲の側頭骨・乳突蜂巣・顔面神経・耳小骨筋・膨大部・内リンパと外リンパ・コルチ器は描いておらず、特定の個人の耳でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
