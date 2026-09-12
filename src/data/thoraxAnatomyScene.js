/**
 * What the chest scene says, in both languages.
 *
 * The geometry is `scenes/regional/organs/thorax.js`. The copy is laid out from
 * the outside in — **the cage, the spaces in it, the floor, the two bags, the
 * lungs in them, the slab between them, and the things that cross it** —
 * because that is the order a chest is met in, by a hand, a needle or a knife.
 *
 * It names no pneumothorax, no effusion, no infarct and no tumour. Disease is
 * somebody else’s scene.
 */

export const THORAX_SCENE_COLORS = Object.freeze({
  manubrium: '#e9e2d0',
  'sternal-body': '#ece5d4',
  'xiphoid-process': '#e4dcc8',
  ribs: '#e9e2d0',
  'costal-cartilages': '#dfe6dd',
  'thoracic-vertebrae': '#d8cfbc',
  'intercostal-space': '#d9b6a8',
  'intercostal-bundle': '#c8536a',
  diaphragm: '#b8656a',
  'parietal-pleura': '#cfd8d6',
  'costodiaphragmatic-recess': '#8fb6cc',
  'right-lung': '#d99aa0',
  'left-lung': '#d99aa0',
  mediastinum: '#c4bcd4',
  heart: '#b8444c',
  pericardium: '#ded6c4',
  'trachea-and-bronchi': '#ded4bf',
  oesophagus: '#cd9a8b',
  aorta: '#b53a39',
  'venae-cavae': '#4a6ea8',
  'pulmonary-arteries': '#7f6fb0',
  'phrenic-nerve': '#efe2ab',
  'vagus-nerve': '#ddc472',
});

export const THORAX_NATURAL_COLORS = Object.freeze({
  manubrium: '#ece4d2',
  'sternal-body': '#ece4d2',
  'xiphoid-process': '#e8e0cc',
  ribs: '#ece4d2',
  'costal-cartilages': '#e4ece2',
  'thoracic-vertebrae': '#e8e0d2',
  'intercostal-space': '#b8605c',
  'intercostal-bundle': '#b04858',
  diaphragm: '#a85450',
  'parietal-pleura': '#dcd6c8',
  'costodiaphragmatic-recess': '#c8bcb0',
  'right-lung': '#d0969c',
  'left-lung': '#d0969c',
  mediastinum: '#d4ccc0',
  heart: '#a43c46',
  pericardium: '#dcd2bc',
  'trachea-and-bronchi': '#e0d6c4',
  oesophagus: '#cca090',
  aorta: '#b23836',
  'venae-cavae': '#40628f',
  'pulmonary-arteries': '#5f74a0',
  'phrenic-nerve': '#ece0b4',
  'vagus-nerve': '#ece0b4',
});

export const THORAX_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function thoraxStructureCopy() {
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
      hierarchy: ['Chest', group, name],
      hierarchyJa: ['胸部', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const cage = entry('The cage', '胸郭', 'bone', ['cage']);
  const space = entry('The spaces in it', '肋間', 'wall', ['space']);
  const bundle = entry('The spaces in it', '肋間', 'vessel', ['space', 'vessel']);
  const floor = entry('The floor', '底', 'wall', ['floor']);
  const bag = entry('The two bags', '2つの胸膜腔', 'pleura', ['pleura']);
  const lung = entry('The lungs', '肺', 'lung', ['lung']);
  const slab = entry('The slab between them', '縦隔', 'mediastinum', ['mediastinum']);
  const organ = entry('The slab between them', '縦隔', 'mediastinum', ['mediastinum', 'heart']);
  const airway = entry('The slab between them', '縦隔', 'mediastinum', ['mediastinum', 'airway']);
  const vessel = entry('The great vessels', '大血管', 'vessel', ['mediastinum', 'vessel']);
  const nerve = entry('The two nerves', '2本の神経', 'nerve', ['nerve']);

  return new Map([
    cage(
      'manubrium',
      'Manubrium',
      '胸骨柄',
      'The top of the breastbone. Its upper border is the notch you can feel at the base of the neck, and its lower border is **the landmark the whole chest is counted from**.',
      '胸骨の上部です。上縁は頸部基部で触知できる頸切痕で、下縁は**胸部の高さを数える基準となる指標**です。',
      'Drawn as one block. The joints with the clavicles and the first ribs are not drawn, and no dimension is a measurement.',
      '1つのブロックとして描いています。鎖骨・第1肋骨との関節は描いておらず、寸法は実測値ではありません。'
    ),
    cage(
      'sternal-body',
      'Body of the sternum',
      '胸骨体',
      'Where it meets the manubrium there is a ridge you can feel through the skin: **the sternal angle**. The second rib joins there, the trachea divides there, the arch of the aorta begins and ends there, and the mediastinum is divided into upper and lower there. One ridge, four answers.',
      '胸骨柄との接合部には、皮膚の上から触れる隆起——**胸骨角**——があります。ここに第2肋骨が付着し、気管が分岐し、大動脈弓が始まって終わり、縦隔が上下に分けられます。1つの隆起が4つの答えを持ちます。',
      'The angle is drawn as a slight step at the joint. Its usefulness is that it is **palpable**, which a model cannot represent; the level it marks is what is drawn.',
      '胸骨角は接合部のわずかな段差として描いています。この指標の価値は**触知できる**ことにありますが、それはモデルでは表現できません。描いているのは、それが示す高さだけです。'
    ),
    cage(
      'xiphoid-process',
      'Xiphoid process',
      '剣状突起',
      'The small tip at the bottom of the breastbone, cartilage for much of life. It is where the two costal margins meet, and it is the landmark chest compressions are placed **above**.',
      '胸骨下端の小さな突起で、人生の長い期間は軟骨です。左右の肋骨弓が合流する点であり、胸骨圧迫の位置を決める際に「**この上**」とされる指標でもあります。',
      'Drawn as one small body. Its ossification, which varies with age, is not represented, and **nothing here may be used to place a compression, a needle or an incision.**',
      '1つの小さな形状として描いています。年齢によって異なる骨化の程度は表現しておらず、**圧迫・穿刺・切開の位置決めに用いることはできません。**'
    ),
    cage(
      'ribs',
      'Ribs',
      '肋骨',
      'Twelve pairs, and **every one of them slopes downwards as it comes forward**. That is the single most useful thing about them: a space counted at the front is not level with the same space counted at the back, and anything aimed into a chest has to be aimed with that in mind.',
      '12対あり、**そのすべてが前方へ向かうにつれて下降します**。これが肋骨について最も重要な点です——前方で数えた肋間は、背側で数えた同じ肋間と同じ高さにはありません。胸腔へ何かを刺入する際は、この傾きを前提にする必要があります。',
      'Each rib is a run round the chest’s own section rather than a shape written out, so the slope is one number per level rather than twelve drawn curves. The head, neck, tubercle and angle of each rib are not separated, and **no rib is that rib**.',
      '各肋骨は、書き下ろした形状ではなく胸郭断面を巡る軌跡として生成しています。したがって傾きは高さごとの1つの数値で決まり、12本の曲線を個別に描いたものではありません。肋骨頭・頸・結節・肋骨角は分けておらず、**個々の肋骨は特定の肋骨ではありません。**'
    ),
    cage(
      'costal-cartilages',
      'Costal cartilages',
      '肋軟骨',
      'What joins a rib to the breastbone — for the ones that reach it. The upper seven do; **the eighth, ninth and tenth do not**, and instead turn up and join the cartilage above, and the line the three of them make together is the costal margin you can feel. The lowest two reach nothing at all.',
      '肋骨と胸骨をつなぐ部分です——胸骨に到達する肋骨に限ります。上位7対は到達しますが、**第8・9・10肋骨は到達せず**、上位の肋軟骨に合流します。この3本が作る線が、触知できる肋骨弓です。最下位の2対はどこにも到達しません。',
      'Drawn continuing from the same run the ribs are built on. The joints at both ends, and the calcification that comes with age, are not drawn.',
      '肋骨と同じ軌跡の続きとして描いています。両端の関節も、加齢に伴う石灰化も描いていません。'
    ),
    cage(
      'thoracic-vertebrae',
      'Thoracic vertebrae',
      '胸椎',
      'The column the whole cage is hung from, and the reason a chest is flattened rather than round: the bodies bulge forward into it. **The mediastinum is in front of them, not between them.**',
      '胸郭全体が吊られる支柱であり、胸部断面が円ではなく扁平である理由でもあります——椎体が前方へ張り出しているためです。**縦隔はこの前方にあり、椎体の間にあるのではありません。**',
      'Drawn as twelve simplified blocks with a spinous process each. **The column itself is `spine-anatomy`**; here it is a landmark, its levels are not separately selectable, and the costovertebral joints, the cord and the sympathetic chain are not drawn.',
      '12個の簡略化したブロックに棘突起をつけた形で描いています。**脊柱そのものは`spine-anatomy`が扱います。** ここでは指標であり、各椎骨は個別に選択できません。肋椎関節・脊髄・交感神経幹も描いていません。'
    ),
    space(
      'intercostal-space',
      'Intercostal spaces',
      '肋間',
      'Eleven on each side, each named for the rib above it. They are the way into a chest — and because the ribs slope, **a space is not a level**: it runs downhill from the spine to the sternum.',
      '片側11ずつあり、それぞれ上位の肋骨の番号で呼ばれます。胸腔への到達路ですが、肋骨が傾いているため、**肋間は「高さ」ではありません**——脊柱から胸骨へ向かって下降します。',
      'Drawn as the space itself, as a sheet stretched between two ribs. **The three layers of intercostal muscle that actually fill it are not drawn**, and neither is the pleura immediately deep to them.',
      '空間そのものを、2本の肋骨の間に張った面として描いています。**実際にこの空間を満たす3層の肋間筋は描いておらず**、その深層にある胸膜も描いていません。'
    ),
    bundle(
      'intercostal-bundle',
      'Intercostal vessels and nerve',
      '肋間動静脈・神経',
      'Vein, artery and nerve, in that order downwards, tucked under the **lower** border of each rib. **This is why anything entering a chest is aimed at the top of a space and not the bottom** — the bundle is sheltered by the rib above it and exposed at the bottom of the space.',
      '静脈・動脈・神経が上から順に並び、各肋骨の**下縁**に沿って走ります。**胸腔穿刺が肋間の上縁（下位肋骨の上）を狙う理由がこれです**——神経血管束は上位肋骨に守られており、肋間の下部では露出しています。',
      'Drawn as one cord for all three, in the usual place. In life the order is not always kept, the bundle is less sheltered towards the back, and there are collateral branches along the lower border of the space. **Nothing here may be used to plan or perform a puncture or a drain.**',
      '3者を1本の索として、典型的な位置に描いています。実際には順序が保たれないこともあり、背側では遮蔽が乏しく、肋間下縁には側副枝も走ります。**穿刺やドレーン挿入の計画・実施に用いることはできません。**'
    ),
    floor(
      'diaphragm',
      'Diaphragm',
      '横隔膜',
      'The floor, and the only muscle a quiet breath needs. **It is a dome, not a shelf** — so the top of the abdomen is inside the lower ribs, and a wound below the nipple can be a wound in the belly. The right side sits higher than the left, because a liver is under one and a heart sits on the other.',
      '胸腔の底であり、安静呼吸に必要な唯一の筋です。**棚ではなくドーム状**であるため、腹腔上部は下位肋骨の内側に入り込みます。乳頭より下の創が腹腔内損傷になりうるのはこのためです。右側は左より高く位置します——右下には肝臓があり、左には心臓が乗っているためです。',
      'Drawn as one sheet. **The three openings are not drawn as openings**: the structures that cross it are drawn passing through the sheet, and the three levels they cross at — caval highest, then oesophageal, then aortic lowest and behind rather than through — are described here and in each of those structures. The crura, the central tendon and the muscle fibres are not drawn, and **nothing breathes in this scene.**',
      '1枚の膜として描いています。**3つの裂孔は開口として描いていません**——貫通する構造は膜を通り抜ける形で描いており、その3つの高さ（大静脈孔が最も高く、次いで食道裂孔、大動脈裂孔は最も低く、かつ膜を「貫通」せず背側を通る）は、ここと各構造の説明で述べています。横隔膜脚・腱中心・筋線維は描いておらず、**このシーンでは呼吸は起こりません。**'
    ),
    bag(
      'parietal-pleura',
      'Parietal pleura',
      '壁側胸膜',
      'The lining of each cavity, stuck to the wall rather than to the lung. **There are two cavities and they do not communicate**, which is why one lung can collapse and the other carry on — and why a hole in one side is not a hole in both.',
      '各胸膜腔の裏打ちで、肺ではなく胸壁に密着しています。**胸膜腔は左右2つあり、互いに交通しません。** 一側の肺が虚脱しても他側が機能を保つ理由であり、一側の損傷が両側の損傷にならない理由でもあります。',
      'Drawn as the lining of the cavity, translucent, so that what is inside stays visible. **The visceral layer on the lung itself is not drawn separately**, and neither is the film of fluid between them — which is what actually holds a lung out against the wall.',
      '腔の裏打ちとして、内部が見えるよう半透明で描いています。**肺表面の臓側胸膜は個別には描いておらず**、両層の間の液体層も描いていません。実際に肺を胸壁側へ引き留めているのは、この液体層です。'
    ),
    bag(
      'costodiaphragmatic-recess',
      'Costodiaphragmatic recess',
      '肋骨横隔膜洞',
      'The bottom of each cavity, in the angle between the wall and the dome — **and the lung does not reach it, even at full breath.** It is where a chest fills up, which is why fluid is looked for at the bottom and behind, and why a lung is out of the way of a drain put in low.',
      '各胸膜腔の最下部、胸壁とドームの間の鋭角部です——**最大吸気でも肺はここに達しません。** 胸腔に液体が溜まるのはこの部位で、胸水を背側下方に探す理由であり、下方から挿入するドレーンが肺を避けられる理由でもあります。',
      'Drawn as the space itself, at one size. **In life its depth changes with every breath**, and nothing in this scene breathes; the size drawn is not a capacity and **no volume may be read off it.**',
      '空間そのものを、1つの大きさで描いています。**実際には呼吸ごとに深さが変化しますが**、このシーンでは呼吸は起こりません。描いた大きさは容量ではなく、**そこから体積を読み取ることはできません。**'
    ),
    lung(
      'right-lung',
      'Right lung',
      '右肺',
      'The larger of the two, with three lobes. Its main bronchus is wider, shorter and much more upright than the left, which is why **what is inhaled goes down this side**.',
      '左より大きく、3葉からなります。右主気管支は左より太く、短く、はるかに垂直に近いため、**誤嚥した異物はこちら側に落ちます**。',
      'Drawn as a silhouette in its place, **not as an atlas**: the three lobes and the fissures between them are named here and drawn in `lung-anatomy`, which carves twenty segments out of them. Nothing here breathes or changes volume.',
      '所定の位置に置いたシルエットとして描いており、**アトラスではありません**——3葉と葉間裂はここでは名前のみで、`lung-anatomy`が20区域まで分けて描きます。呼吸も容積変化も表現していません。'
    ),
    lung(
      'left-lung',
      'Left lung',
      '左肺',
      'The smaller, with two lobes — and with **a notch in its front edge that is the shape of the heart**. The notch is not a feature of the lung; it is what is left where the heart is, which is the whole idea this scene is built on.',
      '右より小さく2葉からなり、**前縁に心臓の形をした切痕**があります。この切痕は肺そのものの特徴ではなく、心臓が占める場所の「残り」です。このシーン全体が、その考え方の上に成り立っています。',
      '**The notch is not drawn as a notch.** The lung is built filling its side of the chest and then pressed out of the mediastinum, so the notch is the mediastinum’s own boundary and cannot drift from what is inside it. The lingula, the lobes and the fissure are named and not separated; `lung-anatomy` separates them.',
      '**切痕は切痕として描いていません。** 肺は胸腔の片側を満たす形で生成したうえで縦隔から押し出しており、切痕は縦隔の境界そのものです。したがって内容物とずれることがありません。舌区・肺葉・葉間裂は名前のみで分けておらず、分離は`lung-anatomy`が行います。'
    ),
    slab(
      'mediastinum',
      'Mediastinum',
      '縦隔',
      'Not an organ: **the space left between the two pleural cavities**, from the inlet above to the diaphragm below and from the sternum in front to the column behind. Everything in a chest that is not lung is in here, which is why it is crowded and why anything that grows in it presses on something.',
      '臓器ではなく、**左右の胸膜腔の間に残された空間**です。上は胸郭上口から下は横隔膜まで、前は胸骨から後は脊柱までの範囲を占めます。胸腔内で肺でないものはすべてここにあり、そのため過密であり、ここで何かが増大すれば必ず何かを圧迫します。',
      'Drawn as the space itself, because a space cannot otherwise be pointed at. **Its four named divisions are not drawn** — superior, anterior, middle and posterior — and the plane that separates the first from the other three is the sternal angle, which is drawn.',
      '空間は他に指し示す方法がないため、空間そのものとして描いています。**上・前・中・後の4区分は描いていません。** 上縦隔と他の3区分を分ける平面は胸骨角の高さで、その高さは描いています。'
    ),
    organ(
      'heart',
      'Heart',
      '心臓',
      'In the middle of the chest and **mostly to the patient’s left**, lying on the diaphragm with its apex pointing down, forward and outwards — which is where it can be felt and where it is listened to. Two-thirds of it is left of the midline; the notch in the left lung is its impression.',
      '胸部の中央にあり、**大部分は患者の左側**に位置します。横隔膜上に乗り、心尖は下・前・外方を向きます。心尖拍動を触知し聴診するのはこの位置です。約3分の2が正中より左にあり、左肺の心切痕はその圧痕です。',
      'Drawn as an **outline in its place**, not as a heart: no chamber, valve, coronary vessel or wall is drawn. `cardiovascular/organs/heart.js` is the landmark outline used elsewhere and the heart-failure scene has one generated from a haemodynamic model; **this is neither, and it does not beat.**',
      '**所定の位置に置いた輪郭**として描いており、心臓そのものではありません。心腔・弁・冠動脈・壁のいずれも描いていません。`cardiovascular/organs/heart.js`は他シーンで用いる指標としての輪郭、心不全シーンのものは血行動態モデルから生成したものです。**これはそのどちらでもなく、拍動しません。**'
    ),
    organ(
      'pericardium',
      'Pericardium',
      '心膜',
      'The bag the heart is in. It is **tough and does not stretch quickly**, which is the whole of why a small amount of fluid appearing fast is dangerous and a large amount appearing slowly may not be.',
      '心臓を包む袋です。**強靱で、急には伸展しません。** 少量の液体が急速に貯留すれば危険であり、大量でも緩徐であれば耐えうるのは、この性質によります。',
      'Drawn as one translucent sleeve. Its fibrous and serous layers, the reflections where the great vessels enter, and the sinuses those reflections make are not drawn — and **no pressure, volume or compliance exists anywhere in this model.**',
      '半透明の1つの被膜として描いています。線維性心膜と漿膜性心膜の区別、大血管流入部の移行部、そこに生じる心膜洞は描いていません。**このモデルには圧・容積・コンプライアンスのいずれも存在しません。**'
    ),
    airway(
      'trachea-and-bronchi',
      'Trachea and main bronchi',
      '気管と主気管支',
      'The airway divides at the level of the sternal angle. **The two sides are not alike**: the right main bronchus is wider, shorter and much closer to vertical, so what is inhaled tends to go down it — and a tube pushed in too far tends to go down it too.',
      '気道は胸骨角の高さで分岐します。**左右は同じではありません**——右主気管支は太く、短く、垂直に近いため、誤嚥した異物はこちらに落ちやすく、気管チューブを深く挿入しすぎた場合も同様です。',
      'The difference between the two sides is one table of three numbers, so it cannot be lost. Below the main bronchi nothing is drawn; **the bronchial tree is `lung-anatomy`.** The rings and the membranous back wall are not drawn.',
      '左右差は3つの数値からなる1つの表で決めており、失われることはありません。主気管支より末梢は描いていません——**気管支樹は`lung-anatomy`が扱います。** 軟骨輪と後壁の膜様部も描いていません。'
    ),
    airway(
      'oesophagus',
      'Oesophagus',
      '食道',
      'The one structure that runs the whole length of the chest, behind everything: behind the trachea above, behind the heart below, and then through the diaphragm with a vagus nerve on each side of it. **It is the reason a chest is examined from behind as well as in front.**',
      '胸部を全長にわたって走行し、常に他の構造の背側に位置する唯一の構造です——上部では気管の後方、下部では心臓の後方を走り、左右の迷走神経を伴って横隔膜を貫きます。**胸部を前面だけでなく背面からも観察する理由がこれです。**',
      'Drawn collapsed front to back, as it is at rest. Its three natural narrowings, its blood supply and the plexus the two vagus nerves form on it are not drawn, and only the thoracic part is here.',
      '安静時の状態、すなわち前後に虚脱した形で描いています。3か所の生理的狭窄部・血管支配・両迷走神経が形成する食道神経叢は描いておらず、含まれるのは胸部食道のみです。'
    ),
    vessel(
      'aorta',
      'Aorta',
      '大動脈',
      'One vessel crossing the whole chest in three lengths: up out of the heart, over to the left and back, then down the left of the column to the diaphragm. **It passes behind the diaphragm rather than through it**, which is why it is the lowest of the three things leaving the chest and why breathing does not squeeze it.',
      '3つの区間で胸部全体を横断する1本の血管です——心臓から上行し、左後方へ弓を描き、脊柱の左側を下行して横隔膜に至ります。**横隔膜を貫通せず、その背側を通過する**ため、胸部を出る3構造のうち最も低位にあり、呼吸によって圧迫されません。',
      'Drawn as one vessel, undivided. **Every branch is missing** — the three off the arch, the bronchial and the intercostal arteries — and the ligamentum arteriosum, which is where the left recurrent laryngeal nerve turns and is drawn in `neck-anatomy`, is not drawn here.',
      '分岐のない1本の血管として描いています。**分枝はすべて描いていません**——弓部3分枝・気管支動脈・肋間動脈のいずれもありません。左反回神経が回り込む動脈管索も描いていません（`neck-anatomy`が描いています）。'
    ),
    vessel(
      'venae-cavae',
      'Superior and inferior venae cavae',
      '上大静脈・下大静脈',
      'The two veins returning to the heart, and they could hardly be more different lengths: the superior runs the height of the upper chest, the inferior is **barely a centimetre** inside it before it arrives. Where the superior runs is why a blockage there swells a face and an arm and not a leg.',
      '心臓へ還流する2本の静脈ですが、胸腔内の長さは大きく異なります。上大静脈は上胸部の高さを縦に走りますが、下大静脈は横隔膜を越えて**わずか1 cm ほど**で心臓に到達します。上大静脈の走行位置が、その閉塞で顔面と上肢が腫脹し下肢は腫脹しない理由です。',
      'Drawn as two vessels with no tributaries. The azygos vein, which arches over the right main bronchus to join the superior cava and is the route that opens when it is blocked, is **not drawn** — a real gap in this scene.',
      '流入枝のない2本の血管として描いています。右主気管支の上をまたいで上大静脈に注ぐ奇静脈——上大静脈閉塞時に開通する側副路——は**描いていません。** このシーンの明らかな欠落です。'
    ),
    vessel(
      'pulmonary-arteries',
      'Pulmonary trunk and arteries',
      '肺動脈幹と肺動脈',
      'The only arteries in the body carrying blood **away** from the heart and towards a lung rather than away from one. The trunk leaves in front of everything else and divides almost at once, and each branch runs to its own hilum.',
      '心臓から出る動脈でありながら、**肺へ向かう**（肺から出るのではない）唯一の動脈です。肺動脈幹は他のすべての前方から出て直ちに分岐し、各枝はそれぞれの肺門へ向かいます。',
      'Drawn as a trunk and two branches, with **no pulmonary veins at all** — four of them return to the heart and none is here. The relationship of each artery to its bronchus at the hilum is not drawn; `lung-anatomy` has it.',
      '幹と2本の枝として描いており、**肺静脈は一切描いていません**——実際には4本が心臓へ還流しますが、ここにはありません。肺門における動脈と気管支の位置関係も描いておらず、それは`lung-anatomy`が扱います。'
    ),
    nerve(
      'phrenic-nerve',
      'Phrenic nerves',
      '横隔神経',
      'The nerve of the diaphragm, from the neck to the floor of the chest. It passes **in front of** the root of the lung, on the pericardium — and that one fact is most of what separates it from the nerve beside it. It comes from the neck, which is why a problem at the neck stops a diaphragm.',
      '横隔膜を支配する神経で、頸部から胸腔底まで走ります。肺根の**前方**を、心膜上を通ります。この1点が、隣を走る神経との違いのほとんどを説明します。起始が頸部にあるため、頸部の病変で横隔膜が動かなくなります。',
      'Drawn as one cord on each side, in front of the hilum. Its origin in the neck, its branches on the diaphragm and the sensory territory that makes shoulder-tip pain a sign of something under the diaphragm are described and **not drawn**.',
      '左右1本ずつ、肺門の前方を通る索として描いています。頸部での起始、横隔膜上の分枝、横隔膜下の病変で肩への放散痛を生じる知覚領域は、説明にとどめ**描いていません**。'
    ),
    nerve(
      'vagus-nerve',
      'Vagus nerves',
      '迷走神経',
      'The other nerve down the same side of the same chest — and it passes **behind** the root of the lung, where the phrenic passes in front. It carries on onto the oesophagus and out of the chest with it. Two nerves, one structure between them, and everything each of them reaches follows from which side of it they are on.',
      '同じ胸腔の同じ側を下行するもう1本の神経です。横隔神経が肺根の前方を通るのに対し、こちらは**後方**を通ります。そのまま食道上に達し、食道とともに胸腔を出ます。2本の神経の間に1つの構造があり、それぞれが到達する先は、どちら側を通るかで決まります。',
      'Drawn as one cord on each side, behind the hilum. **The plexus the two of them form on the oesophagus is not drawn**, nor is the left recurrent laryngeal nerve turning under the arch — that is drawn in `neck-anatomy`, which is where this chest’s nerves are picked up from.',
      '左右1本ずつ、肺門の後方を通る索として描いています。**両者が食道上に形成する食道神経叢は描いておらず**、大動脈弓を回り込む左反回神経も描いていません。それは`neck-anatomy`が描いており、この胸部の神経はそこから続いています。'
    ),
  ]);
}

export const THORAX_ANATOMY_META = Object.freeze({
  id: 'thorax-anatomy',
  status: 'alpha',
  title: 'Interactive chest anatomy',
  titleJa: '触れて学ぶ胸部の解剖',
  subtitle: 'Point to identify; click or tap to pin a rib, a space, a lung or what lies between them',
  subtitleJa: '触れて部位を確認・クリック／タップで肋骨・肋間・肺・縦隔の構造を固定',
  inspection: { background: 'studio' },
  palette: {
    bone: THORAX_SCENE_COLORS.ribs,
    wall: THORAX_SCENE_COLORS.diaphragm,
    pleura: THORAX_SCENE_COLORS['costodiaphragmatic-recess'],
    lung: THORAX_SCENE_COLORS['right-lung'],
    mediastinum: THORAX_SCENE_COLORS.heart,
    vessel: THORAX_SCENE_COLORS.aorta,
    nerve: THORAX_SCENE_COLORS['phrenic-nerve'],
  },
  legend: [
    { key: 'bone', label: 'Cage', labelJa: '胸郭' },
    { key: 'wall', label: 'Spaces and floor', labelJa: '肋間と底' },
    { key: 'pleura', label: 'Pleural cavities', labelJa: '胸膜腔' },
    { key: 'lung', label: 'Lungs', labelJa: '肺' },
    { key: 'mediastinum', label: 'Mediastinum', labelJa: '縦隔' },
    { key: 'vessel', label: 'Vessels', labelJa: '血管' },
    { key: 'nerve', label: 'Nerves', labelJa: '神経' },
  ],
  stages: [
    {
      id: 'closed',
      name: 'The cage',
      nameJa: '胸郭',
      at: 0,
      summary: 'Twelve pairs of ribs, all of them sloping downwards as they come forward, and eleven spaces between them.',
      summaryJa: '12対の肋骨——そのすべてが前方へ向かうにつれて下降します——と、その間の11の肋間です。',
    },
    {
      id: 'opened',
      name: 'What is inside',
      nameJa: '内部',
      at: 1,
      summary:
        'Two cavities take almost all of it. Everything that is not lung has to fit in the slab left between them, and two nerves pass that slab on opposite faces of the same structure.',
      summaryJa:
        '2つの胸膜腔がその大半を占めます。肺でないものはすべて、その間に残された縦隔に収まるほかなく、2本の神経は同じ構造の前後を分かれて通過します。',
    },
  ],
  range: { start: 'Cage', startJa: '胸郭', end: 'Inside', endJa: '内部' },
  progressLabel: { label: 'Chest wall transparency', labelJa: '胸壁の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — The chest, drawn schematically as one representative arrangement. **Nothing here moves: nothing breathes, the ribs do not rise, the diaphragm does not descend, the heart does not beat, and no pressure, volume or compliance exists anywhere in this model.** No length, calibre, angle, rib spacing or volume is a measurement, and the size of the costodiaphragmatic recess is not a capacity. The lungs are silhouettes in their place, not an atlas — the lobes and fissures are named and not separated, and the twenty segments are in `lung-anatomy`; the heart is an outline with no chamber, valve or coronary vessel. Not drawn: the intercostal muscles, the visceral pleura and the fluid between the layers, the azygos vein, the pulmonary veins, every branch of the aorta, the bronchial tree below the main bronchi, the thoracic duct, the sympathetic chain, the thymus, the breast and the muscles of the chest wall. The diaphragm’s three openings are described rather than drawn as openings. **Nothing here may be used to plan or perform any puncture, drain, line, compression, incision or operation.** Nothing here is anyone’s chest.',
  disclaimerJa:
    '教育用肉眼解剖モデル：胸部を1つの代表的な配置として模式的に描いたものです。**このシーンでは何も動きません——呼吸も、肋骨の挙上も、横隔膜の下降も、心拍もなく、圧・容積・コンプライアンスのいずれも存在しません。** 長さ・口径・角度・肋間の間隔・容積はいずれも実測値ではなく、肋骨横隔膜洞の大きさも容量ではありません。肺は所定の位置のシルエットでありアトラスではありません——肺葉と葉間裂は名前のみで分けておらず、20区域は`lung-anatomy`が扱います。心臓は輪郭であり、心腔・弁・冠動脈は描いていません。肋間筋・臓側胸膜と胸膜液・奇静脈・肺静脈・大動脈のすべての分枝・主気管支より末梢の気管支樹・胸管・交感神経幹・胸腺・乳房・胸壁の筋は描いていません。横隔膜の3つの裂孔は、開口としてではなく説明として扱っています。**穿刺・ドレーン・カテーテル留置・胸骨圧迫・切開・手術の計画や実施に用いることはできません。** 特定の個人の胸部でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
