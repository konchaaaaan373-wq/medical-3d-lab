/**
 * What the pelvis scene says, in both languages.
 *
 * The geometry is `scenes/regional/organs/pelvis.js`. The copy is laid out as
 * the region divides — **the ring, the floor, the peritoneum above it, the
 * three passages through it, the vessels, and then the two sets of organs that
 * differ** — because everything except that last group is the same in
 * everybody.
 *
 * It names no prolapse, no incontinence, no fibroid and no obstruction. Disease
 * is somebody else’s scene.
 */

export const PELVIS_SCENE_COLORS = Object.freeze({
  'pelvic-ring': '#e4dbc6',
  'pubic-symphysis': '#dfe6dd',
  'levator-ani': '#b8565a',
  'levator-hiatus': '#8fb6cc',
  'pelvic-peritoneum': '#a8c4d8',
  'peritoneal-pouch': '#7fa8c4',
  bladder: '#c8a0b4',
  ureters: '#c9b4a0',
  urethra: '#b49ac0',
  rectum: '#c9a06e',
  'anal-canal': '#b0855c',
  'sigmoid-colon': '#c9a06e',
  'common-iliac-arteries': '#b53a39',
  'internal-iliac-artery': '#c0403e',
  'external-iliac-vessels': '#8f5e8f',
  uterus: '#c06a80',
  'ovaries-and-tubes': '#d9a2a8',
  vagina: '#c48e9e',
  'uterine-artery': '#c0403e',
  prostate: '#a8707f',
  'seminal-vesicles': '#b08a9a',
  'vas-deferens': '#e0d2a8',
});

export const PELVIS_NATURAL_COLORS = Object.freeze({
  'pelvic-ring': '#ece4d2',
  'pubic-symphysis': '#e4ece2',
  'levator-ani': '#a4504e',
  'levator-hiatus': '#c8bcb0',
  'pelvic-peritoneum': '#d8d2c4',
  'peritoneal-pouch': '#ccc2b4',
  bladder: '#c8a8b0',
  ureters: '#d0c0ac',
  urethra: '#c0a8b8',
  rectum: '#c8a478',
  'anal-canal': '#b48c64',
  'sigmoid-colon': '#c8a478',
  'common-iliac-arteries': '#b23836',
  'internal-iliac-artery': '#b23836',
  'external-iliac-vessels': '#8a5a7c',
  uterus: '#b46878',
  'ovaries-and-tubes': '#d4a0a4',
  vagina: '#bc8c98',
  'uterine-artery': '#b23836',
  prostate: '#a4707c',
  'seminal-vesicles': '#ac8894',
  'vas-deferens': '#dcd0ac',
});

export const PELVIS_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function pelvisStructureCopy() {
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
      hierarchy: ['Pelvis', group, name],
      hierarchyJa: ['骨盤', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const ring = entry('The ring', '骨盤輪', 'bone', ['bone']);
  const floor = entry('The floor', '骨盤底', 'floor', ['floor']);
  const drape = entry('The peritoneum', '腹膜', 'peritoneum', ['peritoneum']);
  const urinary = entry('The passages', '通過するもの', 'urinary', ['urinary']);
  const gut = entry('The passages', '通過するもの', 'gut', ['gut']);
  const vessel = entry('The vessels', '血管', 'vessel', ['vessel']);
  const female = entry('One set: a woman’s', '一方の組：女性', 'genital', ['female']);
  const femaleVessel = entry('One set: a woman’s', '一方の組：女性', 'vessel', ['female', 'vessel']);
  const male = entry('The other set: a man’s', 'もう一方の組：男性', 'genital', ['male']);

  return new Map([
    ring(
      'pelvic-ring',
      'Pelvic ring',
      '骨盤輪',
      'Two hip bones and a sacrum, closed in front at one joint. **It is a funnel, not a bowl**: wide at the brim where it meets the abdomen, narrow at the outlet where it meets the floor. Everything below the brim is the true pelvis.',
      '2つの寛骨と仙骨からなり、前方は1つの関節で閉じます。**鉢ではなく漏斗**であり、腹部と接する骨盤上口では広く、骨盤底と接する下口では狭くなります。骨盤上口より下が小骨盤（真骨盤）です。',
      'Drawn as the funnel it makes rather than as three bones. The sacroiliac joints, the sciatic notches, the acetabulum and the obturator foramen are **not** drawn, and `hip-anatomy` is the joint.',
      '3つの骨としてではなく、それらが作る漏斗として描いています。仙腸関節・坐骨切痕・寛骨臼・閉鎖孔は描いておらず、股関節そのものは`hip-anatomy`が扱います。'
    ),
    ring(
      'pubic-symphysis',
      'Pubic symphysis',
      '恥骨結合',
      'The joint at the front, and **the landmark everything below the belly is felt from**. It is a joint that does not move much and is not meant to, except once.',
      '前方の関節であり、**下腹部以下のすべてを触診で位置づける基準点**です。本来ほとんど動かない関節ですが、出産時だけは例外です。',
      'Drawn as one small body between the two bones. The disc in it and the ligaments round it are not drawn, and **no width or mobility is represented.**',
      '左右の骨の間の1つの小さな形状として描いています。恥骨間板と周囲の靱帯は描いておらず、**間隙の幅も可動性も表現していません。**'
    ),
    floor(
      'levator-ani',
      'Levator ani',
      '肛門挙筋',
      'The muscular floor slung across the outlet, and **the boundary between two countries**: above it is pelvis, below it is perineum, and the two have different nerves, different lymphatics and different rules. It is a funnel, which is why what fails in it descends rather than tears.',
      '骨盤下口に張られた筋性の底であり、**2つの領域の境界**です——上は骨盤腔、下は会陰であり、両者は神経支配もリンパ流も異なります。漏斗状であるため、機能が破綻したときには断裂ではなく下垂として現れます。',
      'Drawn as one sheet. **`pelvic-floor-anatomy` separates the three parts of the sling**, the sphincters and the perineal body; here it is one boundary, and **it does not contract.**',
      '1枚の膜として描いています。**挙筋の3部分・括約筋・会陰体の分離は`pelvic-floor-anatomy`が行います。** ここでは1つの境界であり、**収縮しません。**'
    ),
    floor(
      'levator-hiatus',
      'Levator hiatus',
      '肛門挙筋裂孔',
      'The gap in the floor — **and there is only one**. Three things go through it in a woman and two in a man, and nothing else does. Every organ in the true pelvis rests on the sheet around it.',
      '骨盤底にある唯一の間隙です。女性では3つ、男性では2つの構造がここを通り、それ以外は通りません。小骨盤内のすべての臓器は、その周囲の筋膜性の面に載っています。',
      'Drawn as a body filling the gap, because a gap cannot otherwise be pointed at. Its shape at rest and the way it changes are not represented, and **its size here is not a measurement.**',
      '間隙は他に指し示す方法がないため、そこを満たす形状として描いています。安静時の形状も、その変化も表現しておらず、**ここに描いた大きさは実測値ではありません。**'
    ),
    drape(
      'pelvic-peritoneum',
      'Pelvic peritoneum',
      '骨盤腹膜',
      'The bottom of the abdomen’s bag, draped over the tops of the pelvic organs rather than round them. **It does not reach the floor** — the lower half of the bladder, the rectum and everything in front of the sacrum below it are outside the bag, which is why they can be reached without opening it.',
      '腹部の袋の最下部で、骨盤臓器を包むのではなく、その上面に垂れかかります。**骨盤底には達しません**——膀胱の下半、直腸、その下方で仙骨前面にあるものはいずれも袋の外にあり、開腹せずに到達できる理由がこれです。',
      'Drawn as one sheet with a dip in it. The ligaments it forms round the uterus and the fascia below it are not drawn, and **it is continuous with `abdomen-anatomy`’s bag**, which is where the rest of it is.',
      '窪みをもつ1枚の膜として描いています。子宮周囲でこの膜が形成する靱帯も、その下方の筋膜も描いていません。**`abdomen-anatomy`の腹膜腔と連続しており**、それ以外の部分はそちらにあります。'
    ),
    drape(
      'peritoneal-pouch',
      'Peritoneal pouch',
      '腹膜の陥凹（ダグラス窩／直腸膀胱窩）',
      'The dip behind the bladder, and **the lowest point of the whole peritoneal cavity**. Fluid anywhere in an abdomen ends up here, which is why it is the one place the cavity can be reached from below. Behind the uterus in a woman, behind the bladder in a man — the same dip with two names.',
      '膀胱の背側の窪みで、**腹膜腔全体の最低点**です。腹腔内のどこに生じた液体も最終的にここに貯留するため、下方から腹腔に到達できる唯一の場所になります。女性では子宮の背側（ダグラス窩）、男性では膀胱の背側（直腸膀胱窩）——名前が2つある同じ窪みです。',
      'Drawn as one body at the lowest point, the same for both sets. **The size drawn is not a capacity**, and how far it dips depends on what is in front of it, which this scene does not vary.',
      '最低点に置いた1つの形状として、いずれの組でも同じものを描いています。**描いた大きさは容量ではなく**、陥凹の深さは前方にある構造によりますが、このシーンではそれを変化させていません。'
    ),
    urinary(
      'bladder',
      'Bladder',
      '膀胱',
      'Sitting on the floor behind the pubis. **Empty it is below the brim and cannot be felt**; full it rises out of the pelvis and can be — and then it is in front of the peritoneum, which is why a needle can reach it above the pubis without entering the bag.',
      '恥骨の背側で骨盤底に載ります。**空虚時は骨盤上口より下にあり触知できません**が、充満すると骨盤から上方へ突出し触知可能になります。そのとき膀胱は腹膜の前方にあるため、恥骨上から穿刺しても腹腔に入りません。',
      'Drawn **empty**, as one outline: no wall layer, no trigone, no ureteric orifice, no muscle. **It does not fill or empty in this scene**, so the one thing that makes its position interesting is described and not shown. `bladder-anatomy` is the bladder.',
      '**空虚な状態**の1つの輪郭として描いており、壁層構造・膀胱三角・尿管口・排尿筋はありません。**このシーンでは充満も排出も起こらない**ため、位置が変わるというこの臓器の要点は説明にとどめています。膀胱そのものは`bladder-anatomy`が扱います。'
    ),
    urinary(
      'ureters',
      'Ureters',
      '尿管',
      'Down from the abdomen, over the brim, and **under the structure that crosses them** on each side, to enter the bladder from behind. That crossing is the reason a ureter is injured in pelvic surgery: it runs under something that has to be tied.',
      '腹部から下行して骨盤上口を越え、左右それぞれで**それを横切る構造の下**を通り、膀胱に後方から入ります。骨盤内手術で尿管が損傷されるのは、この交差のためです——結紮すべき構造の下を通っているからです。',
      'Drawn as one cord on each side at one calibre, on the usual course. **The crossing is drawn from the same point as the structure that makes it**, so the model cannot claim it of one set and not the other. The three narrowings and the oblique entry into the bladder wall are not drawn.',
      '左右1本ずつ、一定の口径の索として典型的な走行で描いています。**交差点は、それを作る構造と同じ点から生成しており**、一方の組でのみ主張するということが起こりません。3か所の生理的狭窄と、膀胱壁への斜め貫通は描いていません。'
    ),
    urinary(
      'urethra',
      'Urethra',
      '尿道',
      'Out through the gap in the floor, in front. **This is the one passage whose length differs most between the two sets** — a few centimetres in a woman and far longer in a man, through a gland that can close round it.',
      '骨盤底の間隙を前方から通って外へ出ます。**2つの組で長さが最も異なる通路**であり、女性では数センチ、男性ではそれよりはるかに長く、途中で前立腺を貫きます。',
      'Drawn as one cord for both sets, on the shared part of the course. Its sphincters, its length difference and its course through the prostate are described and **not** drawn.',
      '両方の組に共通する部分を、1本の索として描いています。括約筋・長さの差・前立腺内の走行はいずれも説明にとどめ、描いていません。'
    ),
    gut(
      'rectum',
      'Rectum',
      '直腸',
      'Down the hollow of the sacrum behind everything else, and **the peritoneum covers only its top**. That is why it is the one pelvic organ that can be reached along most of its length from below without entering the bag — and why what lies in front of it can be felt through it.',
      '他のすべての背側で、仙骨の彎曲に沿って下行します。**腹膜が覆うのは上部のみ**です。腹腔に入らずに下方からその大部分に到達できる唯一の骨盤臓器であり、前方にある構造を経直腸的に触知できる理由でもあります。',
      'Drawn as one tube with no wall layer, no valve and no ampulla. `colon` scenes elsewhere are the bowel itself, and nothing here fills, empties or contracts.',
      '壁層構造・ヒダ・膨大部のない1本の管として描いています。腸管そのものは他のシーンが扱い、ここでは充満も排出も収縮も起こりません。'
    ),
    gut(
      'anal-canal',
      'Anal canal',
      '肛門管',
      'The last passage, through the gap and **below the floor** — which puts it in the perineum, with a different nerve supply and a different lymphatic drainage from everything above it.',
      '最後の通路で、間隙を抜けて**骨盤底より下**にあります。したがって会陰に属し、それより上のすべてとは神経支配もリンパ流も異なります。',
      'Drawn as one short tube. **The two sphincters round it are not drawn** — they are in `pelvic-floor-anatomy` — and the line where its lining and its drainage change is named and not drawn.',
      '1本の短い管として描いています。**周囲の2つの括約筋は描いておらず**、それらは`pelvic-floor-anatomy`にあります。粘膜と流入域が変わる境界（歯状線）も名前のみで描いていません。'
    ),
    gut(
      'sigmoid-colon',
      'Sigmoid colon',
      'S状結腸',
      'The last mobile length of bowel, hanging on a fold of its own and entering the pelvis over the brim on the left before it becomes rectum. **It moves, and the rectum below it does not.**',
      '可動性をもつ最後の腸管で、固有の間膜に吊られ、左側から骨盤上口を越えて骨盤内に入り、直腸へ移行します。**S状結腸は可動で、その下の直腸は固定されています。**',
      'Drawn as one length of tube. Its mesentery, which is what makes it mobile and is why it can twist, is named and **not** drawn.',
      '1区間の管として描いています。可動性の理由であり捻転しうる理由でもある固有の間膜は、名前のみで描いていません。'
    ),
    vessel(
      'common-iliac-arteries',
      'Common iliac arteries',
      '総腸骨動脈',
      'Where the aorta ends, at the brim. Each divides almost at once into one branch that stays in the pelvis and one that leaves it — **and the ureter crosses that division**, which is the one place a ureter can be found reliably.',
      '大動脈の終末で、骨盤上口の高さにあります。各枝はほぼ直ちに、骨盤内に留まる枝と骨盤を出る枝に分かれます。**尿管はこの分岐部を越えて走行しており**、尿管を確実に同定できる唯一の場所です。',
      'Drawn as two vessels with the division at one point. The veins beside them are not drawn, and no calibre is a measurement.',
      '1点で分岐する2本の血管として描いています。並走する静脈は描いておらず、口径は実測値ではありません。'
    ),
    vessel(
      'internal-iliac-artery',
      'Internal iliac artery',
      '内腸骨動脈',
      'The branch that stays: everything in the pelvis is supplied from it, and in a woman the artery that crosses the ureter is one of its branches. **It is what is tied when a pelvis bleeds and cannot be reached.**',
      '骨盤内に留まる枝で、骨盤内のすべてがここから栄養されます。女性で尿管を横切る動脈も、この枝の1つです。**到達困難な骨盤内出血に対して結紮の対象となる血管です。**',
      'Drawn as one trunk with **none of its branches** except, in one set, the artery that makes the crossing. What it supplies is stated and not drawn.',
      '1本の幹として描いており、**分枝は一方の組における交差を作る動脈を除いて描いていません。** 灌流域は説明にとどめています。'
    ),
    vessel(
      'external-iliac-vessels',
      'External iliac vessels',
      '外腸骨動静脈',
      'The branch that leaves, running forward along the brim and out under the inguinal ligament to become the vessels of the thigh. **Nothing in the pelvis is supplied by it** — it is passing through.',
      '骨盤を出る枝で、骨盤上口に沿って前方へ走り、鼠径靱帯の下を通って大腿の血管になります。**骨盤内のどの構造もこの血管からは栄養されません**——通過するだけです。',
      'Drawn as one vessel each side for artery and vein together. The inguinal ligament it passes under is not drawn, and neither is the femoral canal medial to it.',
      '動脈と静脈をまとめて左右1本ずつとして描いています。その下を通る鼠径靱帯も、その内側の大腿管も描いていません。'
    ),
    female(
      'uterus',
      'Uterus',
      '子宮',
      'Lying **forward over the bladder**, not standing upright. That is what puts the peritoneal dip behind it rather than in front, and it is why the lowest point of the whole abdominal cavity is reached through the back wall of the vagina.',
      '直立しているのではなく、**膀胱の上に前傾して**乗っています。腹膜の陥凹が前方ではなく背側にできるのはこのためであり、腹腔全体の最低点に膣後壁から到達できる理由でもあります。',
      'Drawn as one outline leaning forward: no cavity, no wall layer, no cervix as its own structure. **`uterus-anatomy` is the uterus.** Its position varies a great deal between people and with a full bladder, which this scene does not vary.',
      '前傾した1つの輪郭として描いており、内腔・壁層構造・独立した構造としての子宮頸部はありません。**子宮そのものは`uterus-anatomy`が扱います。** 実際の位置は個人差と膀胱充満度で大きく変わりますが、このシーンでは変化しません。'
    ),
    female(
      'ovaries-and-tubes',
      'Ovaries and uterine tubes',
      '卵巣と卵管',
      'The one place in the body where **the inside of the peritoneal cavity opens to the outside world**: a tube ends in a free opening beside an ovary rather than attaching to it. That is why the cavity in a woman is not quite a closed bag.',
      '体内で唯一、**腹膜腔の内部が外界に開いている**場所です。卵管は卵巣に付着して終わるのではなく、その傍らで自由端として開口します。女性の腹膜腔が完全な閉鎖腔でない理由がこれです。',
      'Drawn as one ovary and one tube on each side, at one size and one position. The fimbriae, the ligaments that suspend them and the fact that an ovary moves are named and **not** drawn.',
      '左右1つずつの卵巣と卵管を、1つの大きさと位置で描いています。卵管采・支持靱帯・卵巣の可動性はいずれも名前のみで描いていません。'
    ),
    female(
      'vagina',
      'Vagina',
      '腟',
      'The middle of the three passages through the floor, flattened front to back so that it lies **between the urethra in front and the rectum behind**. Both can be felt through it, and so can the pouch above and behind it.',
      '骨盤底を通る3つの通路の中央で、前後に扁平なため、**前方の尿道と後方の直腸の間**に位置します。そのいずれも経腟的に触知でき、上後方の陥凹も同様です。',
      'Drawn as one flattened tube. Its fornices, its wall and its relationship to the cervix are not drawn, and **nothing here may be used for any examination or procedure.**',
      '扁平な1本の管として描いています。腟円蓋・壁構造・子宮頸部との関係は描いておらず、**診察や手技に用いることはできません。**'
    ),
    femaleVessel(
      'uterine-artery',
      'Uterine artery',
      '子宮動脈',
      '**"Water under the bridge."** It crosses over the ureter on its way to the uterus, so the ureter runs under it — and a clamp put on this artery without seeing the ureter is how a ureter is injured.',
      '**"water under the bridge"（橋の下を水が流れる）。** 子宮へ向かう途中で尿管の上を横切るため、尿管はその下を通ります。尿管を確認せずにこの動脈を結紮することが、尿管損傷の典型的な機序です。',
      'Drawn from the same `bridgeAt` point as the vas deferens in the other set, because it is the same crossing at the same place. **The model cannot make the claim for one set and not the other.**',
      'もう一方の組の精管と同じ`bridgeAt`の点から生成しています。同じ場所の同じ交差だからです。**一方の組でのみ主張することが、モデル上できません。**'
    ),
    male(
      'prostate',
      'Prostate',
      '前立腺',
      'Sitting on the floor under the bladder, **with the urethra running through it**. That is the whole of why it matters where it is: anything that enlarges it closes the one passage that goes through it. It is directly in front of the rectum, which is how it is felt.',
      '膀胱の下で骨盤底に載り、**その内部を尿道が貫きます。** この位置関係だけで、この臓器の重要性は説明できます——腫大すれば、それを貫く唯一の通路が閉じるからです。直腸のすぐ前方にあり、経直腸的に触知されます。',
      'Drawn as one outline: **no zone, no capsule and no urethra drawn through it.** `prostate-anatomy` separates the zones, which is what makes the difference between one kind of enlargement and another.',
      '1つの輪郭として描いており、**領域区分も被膜も、内部を貫く尿道も描いていません。** 領域の分離は`prostate-anatomy`が行い、それが腫大の種類を分ける鍵になります。'
    ),
    male(
      'seminal-vesicles',
      'Seminal vesicles',
      '精嚢',
      'A pair behind the bladder and above the prostate, **between the bladder and the rectum** — which is what puts them within reach of a finger and in the way of anything spreading backwards out of the prostate.',
      '膀胱の背側、前立腺の上方にある1対の構造で、**膀胱と直腸の間**に位置します。経直腸的に到達しうる位置であり、前立腺から後方へ進展するものの経路にもあたります。',
      'Drawn as two smooth bodies. They are coiled tubes rather than sacs, and the duct each joins is not drawn.',
      '2つの滑らかな形状として描いています。実際には嚢ではなく蛇行した管であり、それぞれが合流する管も描いていません。'
    ),
    male(
      'vas-deferens',
      'Vas deferens',
      '精管',
      '**"Water under the bridge", the other name for it.** It crosses over the ureter at the same place the uterine artery does in the other set, on its way from the wall of the pelvis to behind the bladder. One crossing, two structures, and the ureter is underneath in both.',
      '**同じ交差の、もう1つの呼び名です。** 骨盤壁から膀胱背側へ向かう途中で、女性の子宮動脈とまったく同じ場所で尿管の上を越えます。1つの交差、2つの構造、そしていずれの場合も尿管が下を通ります。',
      'Drawn from the same `bridgeAt` point as the uterine artery in the other set. Its course through the inguinal canal, which is where it comes from, is named and **not** drawn.',
      'もう一方の組の子宮動脈と同じ`bridgeAt`の点から生成しています。由来である鼠径管内の走行は、名前のみで描いていません。'
    ),
  ]);
}

export const PELVIS_ANATOMY_META = Object.freeze({
  id: 'pelvis-anatomy',
  status: 'alpha',
  title: 'Interactive pelvic anatomy',
  titleJa: '触れて学ぶ骨盤の解剖',
  subtitle: 'Point to identify; click or tap to pin the floor, a passage through it, or an organ resting on it',
  subtitleJa: '触れて部位を確認・クリック／タップで骨盤底・通路・その上に載る臓器を固定',
  inspection: { background: 'studio' },
  palette: {
    bone: PELVIS_SCENE_COLORS['pelvic-ring'],
    floor: PELVIS_SCENE_COLORS['levator-ani'],
    peritoneum: PELVIS_SCENE_COLORS['pelvic-peritoneum'],
    urinary: PELVIS_SCENE_COLORS.bladder,
    gut: PELVIS_SCENE_COLORS.rectum,
    genital: PELVIS_SCENE_COLORS.uterus,
    vessel: PELVIS_SCENE_COLORS['common-iliac-arteries'],
  },
  legend: [
    { key: 'bone', label: 'The ring', labelJa: '骨盤輪' },
    { key: 'floor', label: 'The floor and its gap', labelJa: '骨盤底と裂孔' },
    { key: 'peritoneum', label: 'Peritoneum', labelJa: '腹膜' },
    { key: 'urinary', label: 'Urinary', labelJa: '尿路' },
    { key: 'gut', label: 'Bowel', labelJa: '腸管' },
    { key: 'genital', label: 'Reproductive organs', labelJa: '生殖器' },
    { key: 'vessel', label: 'Vessels', labelJa: '血管' },
  ],
  stages: [
    {
      id: 'closed',
      name: 'The ring',
      nameJa: '骨盤輪',
      at: 0,
      summary: 'A funnel of bone, closed in front at one joint and slung across below by one muscle.',
      summaryJa: '骨性の漏斗で、前方は1つの関節で閉じ、下方は1つの筋で張り渡されています。',
    },
    {
      id: 'opened',
      name: 'What rests on the floor',
      nameJa: '骨盤底に載るもの',
      at: 1,
      summary:
        'One gap, two or three passages through it, the bladder in front and the rectum behind, and a dip of peritoneum between them that is the lowest point of the whole abdominal cavity.',
      summaryJa:
        '1つの裂孔と、そこを通る2〜3の通路、前方の膀胱と後方の直腸、そしてその間にある腹膜の陥凹——腹腔全体の最低点——が現れます。',
    },
  ],
  range: { start: 'Ring', startJa: '骨盤輪', end: 'Contents', endJa: '内容' },
  progressLabel: { label: 'Ring transparency', labelJa: '骨盤輪の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — The pelvis, drawn schematically as one representative arrangement. **This one model carries both sets of reproductive organs, and no body has both**: everything else in it is the same in both sexes and is drawn once, the scene opens on those shared parts, and each set has a viewpoint that shows it with the other put away. That is a display arrangement and not an anatomy; nothing about either set’s position is changed to make them coexist. **Nothing here moves: nothing fills or empties, no sphincter opens or closes, the floor does not contract, and no pressure exists anywhere in this model** — so the bladder is drawn empty and the one thing that makes its position interesting is described and not shown. No length, calibre, angle or volume is a measurement, and the size of the peritoneal pouch is not a capacity. Every organ is an outline in its place and none is an atlas: `bladder-anatomy`, `uterus-anatomy`, `prostate-anatomy` and `pelvic-floor-anatomy` are those structures. Not drawn: the sacroiliac joints, the acetabulum, the ligaments of the pelvis, the three parts of the levator sling, both anal sphincters and the perineal body, the pelvic fascia, the nerves and the lymphatics, the veins beside every artery here, and every branch of every artery. **Nothing here may be used for any examination, or to plan or perform any puncture, catheter, incision or operation.** Nothing here is anyone’s pelvis.',
  disclaimerJa:
    '教育用肉眼解剖モデル：骨盤を1つの代表的な配置として模式的に描いたものです。**この1つのモデルには男女両方の生殖器を含めており、両方をもつ身体は存在しません。** それ以外の構造は男女で同一であるため1つだけ描いており、シーンはその共通部分から始まります。各組には、他方を非表示にして示す視点を用意しています。これは表示上の配置であって解剖ではなく、共存させるためにいずれかの位置を変えてはいません。**このシーンでは何も動きません——充満も排出も、括約筋の開閉も、骨盤底の収縮もなく、圧も存在しません。** したがって膀胱は空虚な状態で描いており、位置が変わるというこの臓器の要点は説明にとどめています。長さ・口径・角度・容積はいずれも実測値ではなく、腹膜陥凹の大きさも容量ではありません。各臓器は所定の位置の輪郭でありアトラスではありません——`bladder-anatomy`・`uterus-anatomy`・`prostate-anatomy`・`pelvic-floor-anatomy`がそれぞれを扱います。仙腸関節・寛骨臼・骨盤の靱帯・肛門挙筋の3部分・内外肛門括約筋と会陰体・骨盤筋膜・神経とリンパ・各動脈に伴走する静脈・すべての動脈の分枝は描いていません。**診察に用いることはできず、穿刺・カテーテル・切開・手術の計画や実施に用いることもできません。** 特定の個人の骨盤でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
