/**
 * What the abdomen scene says, in both languages.
 *
 * The geometry is `scenes/regional/organs/abdomen.js`. The copy is laid out
 * around the one distinction the scene exists for — **the wall, the bag, what
 * is in the bag, and what is behind it** — because every question a reader has
 * about this region turns out to be that question.
 *
 * It names no obstruction, no ischaemia, no stone and no tumour. Disease is
 * somebody else’s scene.
 */

export const ABDOMEN_SCENE_COLORS = Object.freeze({
  'abdominal-wall': '#d9a793',
  'rectus-abdominis': '#b8565a',
  'lumbar-vertebrae': '#d8cfbc',
  'psoas-muscle': '#a84f4c',
  'peritoneal-cavity': '#a8c4d8',
  'greater-omentum': '#e8d09c',
  mesentery: '#e0c39a',
  retroperitoneum: '#c9bf9a',
  liver: '#8f4a42',
  stomach: '#c07f6a',
  spleen: '#7f4f6a',
  'small-bowel': '#d49a86',
  colon: '#c9a06e',
  pancreas: '#d8b070',
  duodenum: '#cf9f8f',
  kidneys: '#a8555a',
  'adrenal-glands': '#d9b25c',
  ureters: '#c9b4a0',
  aorta: '#b53a39',
  'inferior-vena-cava': '#4a6ea8',
  'coeliac-trunk': '#c0403e',
  'superior-mesenteric-vessels': '#c9535f',
  'inferior-mesenteric-artery': '#c0403e',
  'renal-vessels': '#8f5e8f',
});

export const ABDOMEN_NATURAL_COLORS = Object.freeze({
  'abdominal-wall': '#d8b49e',
  'rectus-abdominis': '#a4504e',
  'lumbar-vertebrae': '#e8e0d2',
  'psoas-muscle': '#a2504c',
  'peritoneal-cavity': '#d8d2c4',
  'greater-omentum': '#e6d2a4',
  mesentery: '#e0c8a0',
  retroperitoneum: '#ddd4bc',
  liver: '#8a4238',
  stomach: '#c08874',
  spleen: '#6f4258',
  'small-bowel': '#d29c88',
  colon: '#c8a478',
  pancreas: '#d4b484',
  duodenum: '#cca090',
  kidneys: '#9c4c50',
  'adrenal-glands': '#d6be8c',
  ureters: '#d0c0ac',
  aorta: '#b23836',
  'inferior-vena-cava': '#40628f',
  'coeliac-trunk': '#b23836',
  'superior-mesenteric-vessels': '#b23836',
  'inferior-mesenteric-artery': '#b23836',
  'renal-vessels': '#8a5a7c',
});

export const ABDOMEN_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function abdomenStructureCopy() {
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
      hierarchy: ['Abdomen', group, name],
      hierarchyJa: ['腹部', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const wall = entry('The wall', '腹壁と後壁', 'wall', ['wall']);
  const bag = entry('The bag', '腹膜腔', 'cavity', ['cavity']);
  const inBag = entry('In the bag', '腹膜腔の中', 'gut', ['gut', 'in-the-bag']);
  const inBagOrgan = entry('In the bag', '腹膜腔の中', 'organ', ['organ', 'in-the-bag']);
  const fold = entry('In the bag', '腹膜腔の中', 'cavity', ['cavity', 'in-the-bag']);
  const behind = entry('Behind the bag', '後腹膜', 'behind', ['behind-the-bag']);
  const behindOrgan = entry('Behind the bag', '後腹膜', 'organ', ['organ', 'behind-the-bag']);
  const behindGut = entry('Behind the bag', '後腹膜', 'gut', ['gut', 'behind-the-bag']);
  const behindUrinary = entry('Behind the bag', '後腹膜', 'urinary', ['urinary', 'behind-the-bag']);
  const vessel = entry('The vessels', '血管', 'vessel', ['vessel', 'behind-the-bag']);

  return new Map([
    wall(
      'abdominal-wall',
      'Abdominal wall',
      '腹壁',
      'Muscle and fascia all the way round, with **no bone below the ribs and above the pelvis**. That is why a belly can swell where a chest cannot, and why what is inside it is felt through the wall rather than seen.',
      '全周が筋と筋膜からなり、**肋骨より下・骨盤より上には骨がありません。** 腹部が胸部と違って膨隆しうる理由であり、内部の状態を視認ではなく触診で捉える理由でもあります。',
      'Drawn as one translucent sleeve. The three flat muscles, the fascial layers between them, the linea alba and the inguinal canal are **not** drawn.',
      '半透明の1つの被膜として描いています。3層の側腹筋、その間の筋膜層、白線、鼠径管はいずれも描いていません。'
    ),
    wall(
      'rectus-abdominis',
      'Rectus abdominis',
      '腹直筋',
      'The two straps down the front, one on each side of the midline. The midline between them is **the one place a belly can be opened without cutting muscle**, which is why so many incisions are made there.',
      '正中の左右にある2本の帯状の筋です。両者の間の正中線は、**筋を切らずに開腹できる唯一の場所**であり、多くの切開がここに置かれる理由です。',
      'Drawn as two flattened straps. The tendinous intersections, the sheath round them and the arcuate line where that sheath changes are not drawn, and **nothing here may be used to plan an incision.**',
      '2本の扁平な帯として描いています。腱画・腹直筋鞘・鞘の構成が変わる弓状線は描いておらず、**切開の計画に用いることはできません。**'
    ),
    wall(
      'lumbar-vertebrae',
      'Lumbar vertebrae',
      '腰椎',
      'The back wall, and the ruler the whole region is measured against: the aorta divides at one level, the kidneys sit at another, the three ventral branches leave at three more.',
      '後壁であり、この領域全体を測る物差しでもあります——大動脈の分岐、腎臓の位置、3本の腹側枝の起始は、すべて椎体の高さで指定されます。',
      'Drawn as five simplified blocks. **The column itself is `spine-anatomy`**; here it is a landmark, its levels are not separately selectable, and the cord, the roots and the psoas attachments are not drawn.',
      '5個の簡略化したブロックとして描いています。**脊柱そのものは`spine-anatomy`が扱います。** ここでは指標であり、各椎骨は個別に選択できません。脊髄・神経根・大腰筋の付着も描いていません。'
    ),
    wall(
      'psoas-muscle',
      'Psoas muscle',
      '大腰筋',
      'The shelf everything behind the bag lies on. **A kidney sits on it and a ureter runs down its front**, which is why a psoas that is irritated hurts when a hip is extended and why the muscle is the landmark for both.',
      '後腹膜のすべてが載る台です。**腎臓はこの上に乗り、尿管はその前面を下行します。** 大腰筋が刺激されると股関節伸展で疼痛が生じ、この筋が腎・尿管いずれの指標にもなるのはこのためです。',
      'Drawn as one belly on each side. Its origin on the vertebrae, iliacus beside it and the tendon they share are not drawn.',
      '左右1つずつの筋腹として描いています。椎体への起始、隣接する腸骨筋、両者が共有する腱は描いていません。'
    ),
    bag(
      'peritoneal-cavity',
      'Peritoneal cavity',
      '腹膜腔',
      '**A closed bag**, reaching from under the diaphragm to the pelvis. Everything about this region is a question about it: an organ is either inside it, hanging on a fold and able to move — or behind it, fixed to the back wall. Nothing is both.',
      '横隔膜下から骨盤まで達する**閉じた袋**です。この領域の問いはすべてこの袋についての問いです——臓器は、この中にあって腸間膜に吊られ可動であるか、あるいは後方にあって後壁に固定されているかのどちらかで、両方であることはありません。',
      'Drawn as the space itself, translucent, because a space cannot otherwise be pointed at. The two layers of peritoneum, the lesser sac behind the stomach and the omental foramen into it are **not** drawn — and in a woman the bag is not quite closed, which is not represented.',
      '空間そのものを、指し示すために半透明で描いています。腹膜の2葉、胃の背側の網嚢、そこへの網嚢孔は描いていません。また女性ではこの袋は完全な閉鎖腔ではありませんが、それも表現していません。'
    ),
    fold(
      'greater-omentum',
      'Greater omentum',
      '大網',
      'An apron of fat hanging from the stomach down over everything else — **the first thing seen when a belly is opened**, and the thing that wraps itself round whatever is inflamed and walls it off.',
      '胃から垂れ下がり、他のすべてを覆う脂肪のエプロンです。**開腹して最初に見えるもの**であり、炎症巣を包み込んで限局化させる構造でもあります。',
      'Drawn as one sheet at one size. Its four layers, the fat in it and the vessels it carries are not drawn, and **it does not move or wrap round anything in this scene.**',
      '1つの大きさの1枚の膜として描いています。4層構造・脂肪組織・走行する血管は描いておらず、**このシーンでは移動も被覆も起こりません。**'
    ),
    fold(
      'mesentery',
      'Mesentery',
      '腸間膜',
      'The fan the small bowel hangs on: **a short root on the back wall and a long free border out in the bag**, with the superior mesenteric vessels running down inside it. It is why small bowel moves, why it can twist, and why one vessel supplies metres of it.',
      '小腸を吊る扇です。**後壁に短い根をもち、腹膜腔内に長い自由縁をもち**、その中を上腸間膜動静脈が走ります。小腸が可動であること、捻転しうること、そして1本の血管が数メートルを養えることの理由がこれです。',
      'Drawn as one sheet from root to free border. The vessels are drawn as separate structures rather than inside it, and the fat, lymph nodes and lymphatics it carries are not drawn.',
      '根から自由縁までの1枚として描いています。血管は膜の中ではなく別の構造として描いており、脂肪・リンパ節・リンパ管は描いていません。'
    ),
    behind(
      'retroperitoneum',
      'Retroperitoneum',
      '後腹膜',
      'Not an organ: **the space behind the bag**, between it and the back wall. What is here is fixed, is reached from the back or the side without opening the bag, and bleeds or leaks into a space that can hold a great deal before anything shows.',
      '臓器ではなく、**袋の後方**、腹膜と後壁の間の空間です。ここにあるものは固定されており、袋を開けずに背側・側方から到達でき、出血や漏出は、かなりの量に達するまで所見として現れない空間に広がります。',
      'Drawn as the space itself, sharing its front wall with the back of the peritoneal cavity — **they are the same surface in the model**, so nothing can be in both or in neither. Its fascial layers, in which the spread of a leak actually follows a pattern, are not drawn.',
      '空間そのものとして描いており、その前壁は腹膜腔の後壁と**モデル上は同一の面**です。したがって両方に属することも、どちらにも属さないこともありません。漏出の広がりが従う筋膜層構造は描いていません。'
    ),
    inBagOrgan(
      'liver',
      'Liver',
      '肝臓',
      'The largest organ here, filling the right upper corner under the diaphragm and reaching across the midline. **It is why the right kidney sits lower than the left.**',
      'この領域で最大の臓器で、横隔膜下の右上を占め、正中を越えて左へ達します。**右腎が左腎より低い位置にあるのは、この臓器があるためです。**',
      'Drawn as an outline in its place: no lobe, segment, fissure, gallbladder or portal structure. **`liver-anatomy` is the liver**, and it answers a different question at a different scale.',
      '所定の位置の輪郭として描いており、葉・区域・裂・胆嚢・肝門部構造のいずれも描いていません。**肝臓そのものは`liver-anatomy`**が、別の縮尺で別の問いに答えます。'
    ),
    inBag(
      'stomach',
      'Stomach',
      '胃',
      'In the left upper corner, hanging in the bag with a fold above it and the apron below. Its outlet is at the transpyloric plane — the same level as the neck of the pancreas and both renal hila.',
      '左上を占め、上方を小網、下方を大網に連なる形で腹膜腔に吊られています。出口である幽門は、膵頸部および左右の腎門と同じ「幽門横断面」の高さにあります。',
      'Drawn as an outline in its place. No wall layer, sphincter, rugae or blood supply is drawn, and **nothing fills, empties or contracts.**',
      '所定の位置の輪郭として描いています。壁層構造・括約筋・皺襞・血管支配は描いておらず、**充満も排出も収縮も起こりません。**'
    ),
    inBagOrgan(
      'spleen',
      'Spleen',
      '脾臓',
      'Tucked high on the left behind the stomach, against the ribs — **which is why a blow to the lower left ribs can rupture it** and why it is not normally felt. The tail of the pancreas reaches it.',
      '胃の背側、左上方で肋骨に接して位置します。**左下位肋骨への打撃で破裂しうる理由**であり、通常は触知されない理由でもあります。膵尾部がここまで達します。',
      'Drawn as an outline in its place, with no hilum, no vessels and no relationship to the ribs drawn — the ribs are in `thorax-anatomy`.',
      '所定の位置の輪郭として描いており、脾門・血管・肋骨との関係はいずれも描いていません。肋骨は`thorax-anatomy`が扱います。'
    ),
    inBag(
      'small-bowel',
      'Small bowel',
      '小腸',
      'Metres of it, coiled in the middle of the bag and hanging on the mesentery. **Because it hangs, it moves** — and because it hangs on a narrow root, it can turn about that root.',
      '数メートルにわたり、腹膜腔の中央で腸間膜に吊られて蟠踞しています。**吊られているために可動であり**、根が狭いために、その根を軸に回転しうる構造でもあります。',
      'Drawn as one coiled mass, not as a tube: no lumen, no wall, no valvulae, and **no length may be read off it.** Jejunum and ileum are not distinguished, and nothing peristalses.',
      '管ではなく1つの蟠踞した塊として描いています。内腔・壁・輪状ひだはなく、**そこから長さを読み取ることはできません。** 空腸と回腸を区別しておらず、蠕動も起こりません。'
    ),
    inBag(
      'colon',
      'Colon',
      '結腸',
      'A frame round the small bowel — and **the clearest example in the body of the distinction this scene is about**: the ascending and descending lengths are stuck to the back wall behind the bag, while the transverse and sigmoid hang in it on folds of their own. Two of four are fixed; two are not.',
      '小腸を囲む枠であり、**このシーンが扱う区別の、体内で最も明快な例**でもあります——上行結腸と下行結腸は後壁に固定されて袋の後方にあり、横行結腸とS状結腸はそれぞれの間膜で袋の中に吊られています。4つのうち2つは固定され、2つは可動です。',
      'Drawn as four lengths of one tube. The caecum, appendix, rectum, the flexures, the taeniae and the haustra are **not** drawn, and no length or calibre is a measurement.',
      '1本の管の4区間として描いています。盲腸・虫垂・直腸・結腸曲・結腸ヒモ・ハウストラは描いておらず、長さも口径も実測値ではありません。'
    ),
    behindOrgan(
      'pancreas',
      'Pancreas',
      '膵臓',
      'Lying across the back wall behind the bag, from a head in the curve of the duodenum to **a tail that leaves the back wall and reaches into the bag towards the spleen**. It is the organ that straddles the line, which is why it is felt nowhere and reached from nowhere easily.',
      '袋の後方、後壁を横切って横たわります。頭部は十二指腸の彎入部にあり、**尾部は後壁を離れて腹膜腔内に入り、脾臓へ達します。** この境界をまたぐ臓器であるため、触知されず、到達も容易ではありません。',
      'Drawn as one body with no duct, no islets and no lobules. The tail is the only part drawn in the bag, which is the claim; **`pancreas` scenes elsewhere are the organ itself.**',
      '管・膵島・小葉のない1つの形状として描いています。腹膜腔内に描いているのは尾部のみで、それがここでの主張です。**膵臓そのものは他のシーンが扱います。**'
    ),
    behindGut(
      'duodenum',
      'Duodenum',
      '十二指腸',
      'A C round the head of the pancreas, and the other organ that straddles the line: **only its first part is in the bag**, the rest is stuck to the back wall behind it. Its third part runs across the midline, and the superior mesenteric artery crosses in front of it.',
      '膵頭部を囲むC字で、境界をまたぐもう1つの臓器です——**腹膜腔内にあるのは第1部のみ**で、残りは後壁に固定されています。第3部は正中を横切り、その前面を上腸間膜動脈が越えます。',
      'Drawn as one tube in four lengths. The papilla where the bile and pancreatic ducts open, the suspensory muscle at its end and the wall layers are not drawn.',
      '4区間からなる1本の管として描いています。胆管・膵管が開口する乳頭、終端の十二指腸提筋、壁層構造は描いていません。'
    ),
    behindOrgan(
      'kidneys',
      'Kidneys',
      '腎臓',
      'Behind the bag, on psoas, one on each side — and **the right sits lower than the left because the liver is above it**. Both hila face the midline and both are at the transpyloric plane.',
      '袋の後方、大腰筋上に左右1つずつ位置します。**右腎が左腎より低いのは、上方に肝臓があるため**です。両者の腎門は正中を向き、いずれも幽門横断面の高さにあります。',
      'Drawn as outlines with a hollow facing the midline for the hilum. No cortex, medulla, pyramid, calyx or pelvis is drawn — **`kidney-anatomy` is the kidney**, and the nephron is elsewhere again.',
      '正中を向く陥凹（腎門）をもつ輪郭として描いています。皮質・髄質・錐体・腎杯・腎盂は描いていません。**腎臓そのものは`kidney-anatomy`**が、ネフロンはさらに別のシーンが扱います。'
    ),
    behindOrgan(
      'adrenal-glands',
      'Adrenal glands',
      '副腎',
      'Capping each kidney, and **not part of it**: different origin, different blood supply, different job. Taking a kidney out does not take one out, and an adrenal problem is not a kidney problem.',
      '各腎の上端に載りますが、**腎の一部ではありません**——発生も血管支配も機能も異なります。腎摘出で副腎が失われるわけではなく、副腎の異常は腎の異常ではありません。',
      'Drawn as two small bodies at one size. The cortex and medulla, which are two organs in one and are what make the point, are named and **not** drawn; `adrenal-anatomy` separates them.',
      '1つの大きさの2つの小体として描いています。「1つの臓器の中の2つの臓器」である皮質と髄質——この臓器の要点そのもの——は名前のみで描いておらず、分離は`adrenal-anatomy`が行います。'
    ),
    behindUrinary(
      'ureters',
      'Ureters',
      '尿管',
      'Down the front of psoas, behind the bag the whole way, crossing the brim of the pelvis to reach the bladder. **They are the one structure here that can be found reliably**, because they cross the iliac vessels at the brim and nothing else does.',
      '大腰筋前面を、全長にわたり袋の後方を下行し、骨盤縁を越えて膀胱に至ります。**この領域で確実に同定できる唯一の構造**です——骨盤縁で腸骨血管を越えるのはこれだけだからです。',
      'Drawn as one cord on each side at one calibre. Their three narrowings, their blood supply and their entry into the bladder are not drawn; the pelvic part is in `pelvis-anatomy`.',
      '左右1本ずつ、一定の口径の索として描いています。3か所の生理的狭窄部・血管支配・膀胱への入口は描いておらず、骨盤内の走行は`pelvis-anatomy`が扱います。'
    ),
    vessel(
      'aorta',
      'Abdominal aorta',
      '腹部大動脈',
      'Down the back wall a little to the patient’s left of the midline, dividing at the level of the umbilicus. **It is felt through the wall in a thin person**, and because it is behind the bag, what leaks from it leaks into a space rather than into a cavity.',
      '後壁を、正中よりやや左寄りに下行し、臍の高さで分岐します。**痩せた人では腹壁越しに拍動を触知でき**、袋の後方にあるため、そこからの漏出は腔ではなく後腹膜腔に広がります。',
      'Drawn as one vessel with the three ventral branches and the renal arteries as separate structures. The lumbar and gonadal branches and the division into common iliac arteries are not drawn.',
      '1本の血管として描き、3本の腹側枝と腎動脈は別の構造として扱っています。腰動脈・性腺動脈・総腸骨動脈への分岐は描いていません。'
    ),
    vessel(
      'inferior-vena-cava',
      'Inferior vena cava',
      '下大静脈',
      'Beside the aorta and **to the patient’s right of it** — the two are not both in the midline, and which is which matters for every approach to the back wall. It is thin-walled and collapses; the aorta does not.',
      '大動脈と並走し、**その右側**にあります。両者はどちらも正中にはなく、後壁への到達ではこの左右関係が常に問題になります。壁が薄く虚脱しますが、大動脈は虚脱しません。',
      'Drawn as one vessel at one calibre, with no tributaries. **It does not collapse or distend in this scene**, and the renal veins are drawn separately.',
      '流入枝のない1本の血管を、一定の口径で描いています。**このシーンでは虚脱も拡張も起こりません。** 腎静脈は別の構造として描いています。'
    ),
    vessel(
      'coeliac-trunk',
      'Coeliac trunk',
      '腹腔動脈',
      'The first of the three that leave the front of the aorta, at the top. Short, and it supplies everything that came from the foregut — stomach, liver, spleen, and the upper half of the duodenum.',
      '大動脈前面から出る3本のうち最上位の第1枝です。短く、前腸由来のすべて——胃・肝・脾および十二指腸上半——を養います。',
      'Drawn as a stub with **none of its three branches**. What it supplies is stated and not drawn.',
      '**3本の分枝をいずれも描かない**短い幹として描いています。灌流域は説明にとどめています。'
    ),
    vessel(
      'superior-mesenteric-vessels',
      'Superior mesenteric artery and vein',
      '上腸間膜動静脈',
      'The second of the three, and the one that matters most for where things are: it leaves just below the first, **crosses in front of the third part of the duodenum**, and runs down inside the mesentery to supply everything from the lower duodenum to most of the colon. The vein runs beside it, on its right.',
      '3本のうち第2枝であり、位置関係の上で最も重要な血管です。第1枝のすぐ下方から起こり、**十二指腸第3部の前面を横切り**、腸間膜内を下行して、十二指腸下半から結腸の大部分までを養います。静脈はその右側を伴走します。',
      'Drawn as two vessels with **no branches at all** — the jejunal, ileal and colic branches, which are what make the mesentery a fan, are not drawn. The vein is drawn beside the artery and its junction with the splenic vein is not drawn.',
      '**分枝を一切もたない**2本の血管として描いています。腸間膜を扇状にしている空腸枝・回腸枝・結腸枝は描いていません。静脈は動脈の側方に描いており、脾静脈との合流も描いていません。'
    ),
    vessel(
      'inferior-mesenteric-artery',
      'Inferior mesenteric artery',
      '下腸間膜動脈',
      'The last of the three, low down and small, supplying the left side of the colon and the rectum. **Three branches, three levels, three territories, in the order the gut developed.**',
      '3本のうち最下位で細い枝であり、結腸左側と直腸を養います。**3本の枝、3つの高さ、3つの灌流域が、腸管の発生順序どおりに並びます。**',
      'Drawn as a stub with none of its branches, and the anastomosis along the colon that joins its territory to the one above is **not** drawn.',
      '分枝をもたない短い幹として描いており、上位の灌流域と結ぶ結腸沿いの吻合も描いていません。'
    ),
    vessel(
      'renal-vessels',
      'Renal arteries and veins',
      '腎動静脈',
      'One pair to each kidney — and they are not symmetrical. **The left renal vein has to cross the midline in front of the aorta** to reach the cava, and it passes under the superior mesenteric artery to do it. The right renal artery has to pass behind the cava.',
      '各腎に1対ずつありますが、左右対称ではありません。**左腎静脈は大動脈の前面を横切って正中を越え**、上腸間膜動脈の下をくぐって下大静脈に至ります。右腎動脈は下大静脈の背側を通ります。',
      'Drawn as one artery and one vein each, on the usual course. **Accessory renal arteries, which are common, are not drawn**, and no calibre is a measurement.',
      '各側に動脈1本・静脈1本を、典型的な走行で描いています。**頻度の高い副腎動脈（過剰腎動脈）は描いておらず**、口径は実測値ではありません。'
    ),
  ]);
}

export const ABDOMEN_ANATOMY_META = Object.freeze({
  id: 'abdomen-anatomy',
  status: 'alpha',
  title: 'Interactive abdominal anatomy',
  titleJa: '触れて学ぶ腹部の解剖',
  subtitle: 'Point to identify; click or tap to pin an organ, and see which side of the peritoneum it is on',
  subtitleJa: '触れて部位を確認・クリック／タップで臓器を固定し、腹膜のどちら側にあるかを見る',
  inspection: { background: 'studio' },
  palette: {
    wall: ABDOMEN_SCENE_COLORS['rectus-abdominis'],
    cavity: ABDOMEN_SCENE_COLORS['peritoneal-cavity'],
    behind: ABDOMEN_SCENE_COLORS.retroperitoneum,
    gut: ABDOMEN_SCENE_COLORS.colon,
    organ: ABDOMEN_SCENE_COLORS.kidneys,
    vessel: ABDOMEN_SCENE_COLORS.aorta,
    urinary: ABDOMEN_SCENE_COLORS.ureters,
  },
  legend: [
    { key: 'wall', label: 'Wall and back wall', labelJa: '腹壁と後壁' },
    { key: 'cavity', label: 'The bag and its folds', labelJa: '腹膜腔と間膜' },
    { key: 'behind', label: 'Behind the bag', labelJa: '後腹膜' },
    { key: 'gut', label: 'Gut', labelJa: '消化管' },
    { key: 'organ', label: 'Solid organs', labelJa: '実質臓器' },
    { key: 'vessel', label: 'Vessels', labelJa: '血管' },
    { key: 'urinary', label: 'Ureters', labelJa: '尿管' },
  ],
  stages: [
    {
      id: 'closed',
      name: 'The wall',
      nameJa: '腹壁',
      at: 0,
      summary: 'Muscle and fascia all the way round, with no bone between the ribs and the pelvis.',
      summaryJa: '肋骨と骨盤の間には骨がなく、全周が筋と筋膜からなります。',
    },
    {
      id: 'opened',
      name: 'One bag, and what is behind it',
      nameJa: '袋と、その後ろ',
      at: 1,
      summary:
        'Every organ here is either inside the peritoneal bag, hanging on a fold and able to move, or behind it, fixed to the back wall. Two of the four lengths of colon are one; two are the other.',
      summaryJa:
        'ここにある臓器はすべて、腹膜腔の中で間膜に吊られ可動であるか、後方で後壁に固定されているかのどちらかです。結腸は4区間のうち2つが前者、2つが後者です。',
    },
  ],
  range: { start: 'Wall', startJa: '腹壁', end: 'Inside', endJa: '内部' },
  progressLabel: { label: 'Wall transparency', labelJa: '腹壁の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — The abdomen, drawn schematically as one representative arrangement, to show which side of the peritoneum each structure is on. **Nothing here moves: nothing is digested, nothing peristalses, no organ fills or empties, and no pressure exists anywhere in this model.** No length, calibre, angle or volume is a measurement. Every organ is an outline in its place and none of them is an atlas — the liver, kidney, pancreas, stomach, colon and adrenal each have their own scene at their own scale, and nothing about their internal structure is drawn here. Not drawn: the two layers of peritoneum, the lesser sac, the fascial layers of the retroperitoneum, the three flat muscles of the wall, the inguinal canal, the gallbladder and biliary tree, the caecum, appendix and rectum, the portal vein, the lymphatics and nodes, the nerves, and every branch of every artery drawn here. **Nothing here may be used to plan or perform any incision, puncture, drain or operation, and no organ position here may be used to interpret an image.** Nothing here is anyone’s abdomen.',
  disclaimerJa:
    '教育用肉眼解剖モデル：腹部を1つの代表的な配置として模式的に描き、各構造が腹膜のどちら側にあるかを示すものです。**このシーンでは何も動きません——消化も蠕動もなく、臓器の充満・排出もなく、圧も存在しません。** 長さ・口径・角度・容積はいずれも実測値ではありません。各臓器は所定の位置に置いた輪郭であり、アトラスではありません——肝・腎・膵・胃・結腸・副腎にはそれぞれ固有のシーンがあり、内部構造はここには一切描いていません。腹膜の2葉・網嚢・後腹膜の筋膜層・側腹筋3層・鼠径管・胆嚢と胆道・盲腸と虫垂と直腸・門脈・リンパ管とリンパ節・神経、およびここに描いたすべての動脈の分枝は描いていません。**切開・穿刺・ドレーン・手術の計画や実施に用いることはできず、ここでの臓器位置を画像の読影に用いることもできません。** 特定の個人の腹部でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
