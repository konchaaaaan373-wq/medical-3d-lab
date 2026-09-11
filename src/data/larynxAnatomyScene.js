/**
 * What the larynx and pharynx scene says, in both languages.
 *
 * The geometry is `scenes/respiratory/organs/larynx.js`. The copy is laid out
 * as the crossing it describes — **the shared space first, then the airway that
 * sits in the front of it, then where the two part again** — because every
 * structure here earns its place by what it does about that crossing.
 *
 * It names no infection, no cancer, no operation, no airway procedure. Disease
 * is somebody else's scene.
 */

export const LARYNX_SCENE_COLORS = Object.freeze({
  nasopharynx: '#c3bedd',
  oropharynx: '#b2b6d8',
  laryngopharynx: '#a3aad2',
  'piriform-sinus': '#8fb8d6',
  'soft-palate': '#e0a7a0',
  'palatine-tonsil': '#d98f8f',
  epiglottis: '#e7cf9e',
  'hyoid-bone': '#ece3cd',
  'thyroid-cartilage': '#e6ddc6',
  'cricoid-cartilage': '#e2d8bf',
  'arytenoid-cartilage': '#d3c49c',
  'cricothyroid-membrane': '#c9b894',
  'vestibular-fold': '#dba8a2',
  'laryngeal-ventricle': '#9ec6d8',
  'vocal-fold': '#f4ece8',
  'subglottic-space': '#a9cfe0',
  trachea: '#e0d6c2',
  oesophagus: '#cf9f8f',
  'recurrent-laryngeal-nerve': '#efe7c0',
});

export const LARYNX_NATURAL_COLORS = Object.freeze({
  nasopharynx: '#d2c6c0',
  oropharynx: '#d4c0b8',
  laryngopharynx: '#d0bcb4',
  'piriform-sinus': '#ccb8b0',
  'soft-palate': '#dca49c',
  'palatine-tonsil': '#d49490',
  epiglottis: '#e4d0a8',
  'hyoid-bone': '#ece4d0',
  'thyroid-cartilage': '#e8e0cc',
  'cricoid-cartilage': '#e6dcc8',
  'arytenoid-cartilage': '#e0d6c0',
  'cricothyroid-membrane': '#d8ccb0',
  'vestibular-fold': '#d8a8a0',
  'laryngeal-ventricle': '#c8b4ac',
  'vocal-fold': '#f2eae4',
  'subglottic-space': '#cdbcb4',
  trachea: '#e2d8c4',
  oesophagus: '#cca090',
  'recurrent-laryngeal-nerve': '#ece4c8',
});

export const LARYNX_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function larynxStructureCopy() {
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
      hierarchy: ['Larynx and pharynx', group, name],
      hierarchyJa: ['喉頭と咽頭', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const space = entry('The shared space', '共通の通り道', 'pharynx', ['pharynx']);
  const hanging = entry('The shared space', '共通の通り道', 'pharynx', ['above']);
  const skeleton = entry('The skeleton of the larynx', '喉頭の骨格', 'cartilage', ['skeleton']);
  const inlet = entry('The skeleton of the larynx', '喉頭の骨格', 'cartilage', ['inlet']);
  const glottis = entry('Around the glottis', '声門のまわり', 'glottis', ['glottis']);
  const below = entry('Where they part again', '再び分かれたあと', 'below', ['below']);
  const nerve = entry('Where they part again', '再び分かれたあと', 'nerve', ['nerve']);

  return new Map([
    space(
      'nasopharynx',
      'Nasopharynx',
      '上咽頭',
      'The top of the shared space, behind the nose. **Only air is meant to be here** — the soft palate below it closes it off during a swallow, which is why food does not normally come out of a nose.',
      '鼻の奥にある共通の通り道の最上部です。**ここを通るのは本来空気だけ**で、嚥下の際は下方の軟口蓋がこの部屋を閉じます。食物が鼻へ逆流しないのはこのためです。',
      'Drawn as the space itself, because a space cannot otherwise be pointed at. The openings of the Eustachian tubes and the adenoid in its roof are described and not drawn.',
      '空間は他に指し示す方法がないため、空間そのものとして描いています。耳管開口部と天井のアデノイドは説明にとどめています。'
    ),
    hanging(
      'soft-palate',
      'Soft palate',
      '軟口蓋',
      'The moving back half of the roof of the mouth. At rest it hangs down and nose and mouth are one space; during a swallow it lifts against the back wall and **shuts the nose off from what is coming**.',
      '口蓋の後方、動く部分です。安静時は下垂して鼻と口が1つの空間になりますが、嚥下時には挙上して咽頭後壁に接し、**鼻腔を遮断します**。',
      'Drawn hanging at rest, with the uvula as part of the same sheet. **It does not lift**: the movement it exists for is described and not animated.',
      '安静時の下垂位で描いており、口蓋垂も同じ1枚に含めています。**挙上しません**——この構造の働きそのものは説明にとどめています。'
    ),
    space(
      'oropharynx',
      'Oropharynx',
      '中咽頭',
      'The middle of the shared space, behind the mouth — the one length of the body **both air and food pass through**. Everything downstream of it exists to sort the two out again.',
      '口の奥にある共通の通り道の中間部で、**空気と食物の両方が通る**唯一の区間です。これより下流の構造は、すべてこの2つを再び分けるためにあります。',
      'Drawn as the space itself. The tongue in front of it, and the palatoglossal and palatopharyngeal arches that bound it, are not drawn.',
      '空間そのものとして描いています。前方の舌、境界となる口蓋舌弓・口蓋咽頭弓は描いていません。'
    ),
    hanging(
      'palatine-tonsil',
      'Palatine tonsils',
      '口蓋扁桃',
      'A pair of lymphoid masses in the side walls of the oropharynx, at the doorway between mouth and throat. They sit exactly where everything swallowed and everything breathed in has to pass.',
      '中咽頭の側壁、口と咽頭の境界にある1対のリンパ組織です。嚥下するものも吸い込むものも必ず通過する位置にあります。',
      'Drawn as two smooth masses at one size. Their crypts, the tonsillar bed behind them and the rest of the lymphoid ring are not drawn.',
      '1つの大きさの滑らかな塊として描いています。陰窩、背後の扁桃床、ワルダイエル咽頭輪の他の部分は描いていません。'
    ),
    space(
      'laryngopharynx',
      'Laryngopharynx',
      '下咽頭',
      'The bottom of the shared space, behind the larynx. This is where the sorting happens: the airway leaves forward through its own door, and everything else carries on down the back into the oesophagus.',
      '喉頭の後方にある共通の通り道の最下部です。ここで振り分けが起こります——気道は前方の喉頭口から分かれ、それ以外は後方をそのまま下って食道へ進みます。',
      'Drawn as the space itself, as the part of the lumen directly behind the larynx; the two gutters beside it are named separately.',
      '喉頭の真後ろにあたる部分の空間として描いています。両側の梨状陥凹は別の構造として分けています。'
    ),
    space(
      'piriform-sinus',
      'Piriform sinuses',
      '梨状陥凹',
      'The two gutters that run forward **on either side of the larynx**. A swallow does not go over the airway — it splits and goes round it, down these, and that is what the whole arrangement is for. It is also where a swallowed bone lodges.',
      '喉頭の**両側**を前方へ回り込む2本の溝です。嚥下物は気道の上を越えるのではなく、左右に分かれてこの溝を通り、気道を迂回します。この配置全体がそのためにあります。魚骨などが停留しやすい場所でもあります。',
      'Drawn as the lateral parts of the same lumen rather than as separate tubes, which is what they are. No swallow is animated.',
      '別の管ではなく、同じ内腔の外側部分として描いています。実際にそうであるためです。嚥下の動きは表現していません。'
    ),
    inlet(
      'epiglottis',
      'Epiglottis',
      '喉頭蓋',
      'A leaf of cartilage standing up behind the tongue, over the door of the airway. In a swallow it is pushed back over that door — but it is **not** what keeps food out on its own: the folds below close first, and people without an epiglottis can still swallow.',
      '舌根の後方に立ち上がる、気道の入口を覆う葉状の軟骨です。嚥下時には後方へ倒れて喉頭口を覆いますが、**単独で誤嚥を防いでいるわけではありません**——先に声帯が閉鎖します。喉頭蓋を失っても嚥下は可能です。',
      'Drawn upright, which is where it sits when nothing is being swallowed. **It does not fold**, and its stalk and the folds running from it to the arytenoids are not separately drawn.',
      '嚥下していないときの位置、すなわち立ち上がった状態で描いています。**倒れません。** 喉頭蓋茎と、披裂軟骨へ向かう披裂喉頭蓋ひだは個別には描いていません。'
    ),
    skeleton(
      'hyoid-bone',
      'Hyoid bone',
      '舌骨',
      'A horseshoe of bone above the larynx, opening backwards. It is **the only bone in the body that joins no other bone** — it hangs in muscle, and the larynx hangs from it, which is how the whole assembly is pulled upwards in a swallow.',
      '喉頭の上方にある、後方に開いた馬蹄形の骨です。**他のどの骨とも関節しない唯一の骨**で、筋によって吊られており、喉頭はこの骨から吊り下がっています。嚥下時に喉頭全体が引き上げられるのはこの仕組みによります。',
      'Drawn as one even bar. Its body, greater and lesser horns are not separated, and the muscles that hold it are not drawn.',
      '均一な1本の棒として描いています。体部・大角・小角は分けておらず、これを支える筋群も描いていません。'
    ),
    skeleton(
      'thyroid-cartilage',
      'Thyroid cartilage',
      '甲状軟骨',
      'The shield: two plates meeting in front at an angle, **open at the back**. The angle is the laryngeal prominence you can feel, and the notch at the top of it is the landmark everything in the front of the neck is measured from.',
      '前方で角をなして合わさる2枚の板からなる盾状の軟骨で、**後方は開いています**。その角が触知できる喉頭隆起（喉仏）で、上縁の切痕（甲状切痕）は前頸部の指標の基準になります。',
      'Drawn as one curved shell with a ridge and a notch rather than as two flat plates. Its superior and inferior horns are not drawn.',
      '2枚の平板ではなく、隆起と切痕をもつ1枚の湾曲した殻として描いています。上角・下角は描いていません。'
    ),
    skeleton(
      'cricoid-cartilage',
      'Cricoid cartilage',
      '輪状軟骨',
      '**The only complete ring in the whole airway** — every other level is held open by C-shaped cartilages with a gap at the back. It is a signet ring worn the other way round: narrow in front, deep behind, with the arytenoids standing on the deep part.',
      '**気道全体で唯一の完全な輪**です。他の高さはすべて後方が欠けたC字型の軟骨で支えられています。前方が細く後方が高い印章指輪（signet ring）を後ろ向きにした形で、高い後板の上に披裂軟骨が乗ります。',
      'Drawn as one smooth ring. Its joints with the thyroid and the arytenoids are not drawn, and it does not tilt.',
      '滑らかな1つの輪として描いています。甲状軟骨・披裂軟骨との関節は描いておらず、傾きません。'
    ),
    skeleton(
      'arytenoid-cartilage',
      'Arytenoid cartilages',
      '披裂軟骨',
      'Two small pyramids standing on the back of the cricoid ring. **Each carries the back end of a vocal fold**, and turning them is how a larynx opens for breath and closes for voice — which is why a nerve injury shows up as a fold that will not move.',
      '輪状軟骨後板の上に立つ2つの小さな錐体です。**それぞれが声帯の後端を担って**おり、これを回転させることで喉頭は呼吸のために開き、発声のために閉じます。神経麻痺が「動かない声帯」として現れるのはこのためです。',
      '**They do not move.** The joint they turn on, and the muscles that turn them, are not drawn.',
      '**このモデルでは動きません。** 回転の軸となる輪状披裂関節も、それを動かす筋も描いていません。'
    ),
    skeleton(
      'cricothyroid-membrane',
      'Cricothyroid membrane',
      '輪状甲状膜',
      'The gap in the front of the neck between the two big cartilages, closed by a membrane. It matters because of what is **not** in the way: no thyroid gland, no large vessel, and the airway directly behind it — which is why it is the one place an airway is reached from outside.',
      '前頸部で2つの大きな軟骨の間にある隙間を塞ぐ膜です。重要なのは**そこに何が無いか**です——甲状腺も大血管もなく、すぐ背後が気道です。体表から気道に到達できる唯一の場所とされるのはこのためです。',
      'Drawn as a plain sheet, as a landmark rather than as a structure with layers. **No route, depth, angle or technique is represented, and nothing here may be used to plan one.**',
      '層構造をもつ構造としてではなく、指標として1枚のシートで描いています。**到達経路・深さ・角度・手技はいずれも表現しておらず、これを手技の計画に用いることはできません。**'
    ),
    glottis(
      'vestibular-fold',
      'Vestibular folds',
      '前庭ひだ（仮声帯）',
      'The upper pair of shelves — the false folds. They are **not** what makes the voice; they sit above the ones that do, and the pocket between the two pairs is what proves they are two pairs and not one.',
      '上段1対のひだ（仮声帯）です。**発声しているのはこちらではありません。** 声帯のすぐ上に位置し、2対の間にある喉頭室の存在が、これらが1対ではなく2対であることを示します。',
      'Drawn as smooth shelves at one size. They neither move nor close.',
      '1つの大きさの滑らかなひだとして描いています。動きも閉鎖もしません。'
    ),
    glottis(
      'laryngeal-ventricle',
      'Laryngeal ventricles',
      '喉頭室',
      'The pocket on each side between the false fold above and the true fold below. It is small, and it is the whole reason the two pairs can be told apart at all.',
      '上の前庭ひだと下の声帯の間にある、左右1対のくぼみです。小さな空間ですが、2対のひだを区別できるのはこの存在によります。',
      'Drawn as the space itself. The saccule that opens off it is not drawn.',
      '空間そのものとして描いています。ここから上方へ伸びる喉頭小嚢は描いていません。'
    ),
    glottis(
      'vocal-fold',
      'Vocal folds',
      '声帯',
      'The lower pair, and the ones that make the voice. They **meet in front** at the midline and diverge backwards to the arytenoids, so the opening between them is a V rather than a slit — and that opening is **the narrowest part of an adult airway**.',
      '下段1対で、発声を担うのはこちらです。前方では正中で合わさり（前交連）、後方へ向かって披裂軟骨へ広がるため、その間の開きは細隙ではなくV字になります。この声門裂が**成人の気道で最も狭い部分**です。',
      '**Drawn parted, at one fixed opening** (`GLOTTIS_DISPLAY_GAP`) so that both folds and the gap between them can be seen and selected. They neither open, close nor vibrate, and **no airway calibre may be read off the gap**.',
      '**1つの固定した開き**（`GLOTTIS_DISPLAY_GAP`）で開いた状態として描いています。ひだとその間の隙間の両方を見分けて選択できるようにするためです。開閉も振動もせず、**この隙間から気道の太さを読み取ることはできません**。'
    ),
    glottis(
      'subglottic-space',
      'Subglottic space',
      '声門下腔',
      'The short length below the folds, inside the complete ring. In an adult the narrowest point is the glottis above it; **in a small child it is here**, and a ring cannot give way, which is why the same swelling does very different things at different ages.',
      '声帯の下、完全な輪の内側にある短い区間です。成人では最狭部は上方の声門ですが、**小児ではここが最狭部**で、しかも輪状軟骨は完全な輪であるため逃げ場がありません。同じ浮腫が年齢によって大きく異なる結果をもたらすのはこのためです。',
      'Drawn as a plain cylinder of the space. **No diameter here is a measurement**, and no age difference is represented in the geometry — it is stated in words only.',
      '空間を単純な円筒として描いています。**直径は実測値ではなく**、年齢による違いも形としては表現していません（文章での記述のみです）。'
    ),
    below(
      'trachea',
      'Trachea',
      '気管',
      'The airway below the larynx, held open by cartilage rings that are **open at the back** — which is what lets the oesophagus behind it bulge forward when something is swallowed.',
      '喉頭より下の気道で、**後方が欠けた**軟骨輪によって開存が保たれています。この後方の欠損があるために、嚥下時に背側の食道が前方へふくらむことができます。',
      'The rings are drawn as ridges on a smooth tube; the gap at the back and the muscle that closes it are described and not drawn. Only the upper part is in this scene.',
      '軟骨輪は滑らかな管の上の隆起として描いています。後方の欠損部とそれを閉じる膜性壁は説明にとどめています。このシーンに描いているのは上部のみです。'
    ),
    below(
      'oesophagus',
      'Oesophagus',
      '食道',
      'Where the shared space becomes food-only again, directly behind the airway. At rest it is **closed** — a collapsed tube, not an open one — and it only opens for what is passing through it.',
      '共通の通り道が再び食物専用に戻る部分で、気道のすぐ後方を走ります。安静時は**閉じており**、開いた管ではなく虚脱した管です。通過するものがあるときだけ開きます。',
      'Drawn collapsed front to back, as it is at rest. The upper oesophageal sphincter at its mouth is described and not drawn, and only the upper part is in this scene.',
      '安静時の状態、すなわち前後に虚脱した形で描いています。入口部の上部食道括約筋は説明にとどめており、このシーンに描いているのは上部のみです。'
    ),
    nerve(
      'recurrent-laryngeal-nerve',
      'Recurrent laryngeal nerves',
      '反回神経',
      'The nerves that supply the muscles which move the folds. They reach the larynx **from below**, running up the groove between the trachea and the oesophagus — so an injury anywhere along a long course in the neck and chest shows up as a voice.',
      '声帯を動かす筋を支配する神経です。**下方から**喉頭に達し、気管と食道の間の溝を上行します。頸部から胸部に及ぶ長い走行のどこで障害されても、結果は嗄声として現れます。',
      'Only the last part of each is drawn, and **the two are drawn alike**: in life they do not take the same course to get here — the left loops much lower, around the aortic arch, which is outside this scene.',
      '各神経の最終部分のみを描いており、**左右を同じ形で描いています**。実際には走行が異なり、左は大動脈弓を回り込むためはるかに低い位置まで下行します。その部分はこのシーンの範囲外です。'
    ),
  ]);
}

export const LARYNX_ANATOMY_META = Object.freeze({
  id: 'larynx-anatomy',
  status: 'alpha',
  title: 'Interactive larynx and pharynx anatomy',
  titleJa: '触れて学ぶ喉頭・咽頭の解剖',
  subtitle: 'Point to identify; click or tap to pin a cartilage, a fold or the space around them',
  subtitleJa: '触れて部位を確認・クリック／タップで軟骨・ひだ・周囲の空間を固定',
  inspection: { background: 'studio' },
  palette: {
    pharynx: LARYNX_SCENE_COLORS.oropharynx,
    cartilage: LARYNX_SCENE_COLORS['thyroid-cartilage'],
    glottis: LARYNX_SCENE_COLORS['vestibular-fold'],
    below: LARYNX_SCENE_COLORS.oesophagus,
    nerve: LARYNX_SCENE_COLORS['recurrent-laryngeal-nerve'],
  },
  legend: [
    { key: 'pharynx', label: 'The shared space', labelJa: '共通の通り道' },
    { key: 'cartilage', label: 'Skeleton of the larynx', labelJa: '喉頭の骨格' },
    { key: 'glottis', label: 'Around the glottis', labelJa: '声門のまわり' },
    { key: 'below', label: 'Airway and gullet', labelJa: '気管と食道' },
    { key: 'nerve', label: 'Nerve', labelJa: '神経' },
  ],
  stages: [
    {
      id: 'shared',
      name: 'One space',
      nameJa: '1つの空間',
      at: 0,
      summary: 'Air and food share one passage from the back of the mouth down to the top of the gullet.',
      summaryJa: '口の奥から食道の入口まで、空気と食物は1つの通り道を共有しています。',
    },
    {
      id: 'sorted',
      name: 'Sorted again',
      nameJa: '再び分かれる',
      at: 1,
      summary:
        'The pharynx steps back: a shield, a complete ring, two pairs of folds, and two gutters carrying a swallow round the outside of all of it.',
      summaryJa:
        '咽頭を薄くすると、盾状の甲状軟骨、完全な輪である輪状軟骨、2対のひだ、そしてその外側を回る2本の梨状陥凹が見えます。',
    },
  ],
  range: { start: 'Shared', startJa: '共通', end: 'Sorted', endJa: '分離' },
  progressLabel: { label: 'Pharynx transparency', labelJa: '咽頭の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — The larynx and pharynx, drawn schematically in the midline. **Nothing here moves: nothing is swallowed, the soft palate does not lift, the larynx does not rise, the epiglottis does not fold, and the vocal folds neither open, close nor vibrate** — they are drawn parted at one fixed opening so that both folds and the gap between them can be seen, and no airway calibre may be read off it. No length, calibre, angle or cartilage dimension is a measurement. The tongue, the thyroid gland, the muscles of the larynx and pharynx, the joints between the cartilages, the vessels of the neck and the lower course of the left recurrent laryngeal nerve are not drawn. **The cricothyroid membrane is drawn as a landmark only: no route, depth, angle or technique is represented and nothing here may be used to plan a procedure.** Nothing here is anyone’s larynx.',
  disclaimerJa:
    '教育用肉眼解剖モデル：喉頭と咽頭を正中で模式的に描いたものです。**このシーンでは何も動きません——嚥下も、軟口蓋の挙上も、喉頭挙上も、喉頭蓋の反転もなく、声帯は開閉も振動もしません。** 声帯は、ひだとその間の隙間の両方を見分けられるように1つの固定した開きで描いており、そこから気道の太さを読み取ることはできません。長さ・口径・角度・軟骨の寸法はいずれも実測値ではありません。舌・甲状腺・喉頭筋群・咽頭筋群・軟骨間の関節・頸部の血管・左反回神経の下方の走行は描いていません。**輪状甲状膜は指標としてのみ描いており、到達経路・深さ・角度・手技は表現していません。これを手技の計画に用いることはできません。** 特定の個人の喉頭でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
