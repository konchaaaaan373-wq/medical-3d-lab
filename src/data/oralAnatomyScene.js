/**
 * What the oral cavity scene says, in both languages.
 *
 * The geometry is `scenes/gastrointestinal/organs/oralCavity.js`. The copy is
 * laid out the way a mouth is looked into — **roof, then the doorway at the
 * back, then the tongue, then what is under it** — and the glands come last
 * because the fact about them is not where they are but where they open.
 *
 * It names no infection, no cancer, no stone, no operation. Disease is somebody
 * else's scene.
 */

export const ORAL_SCENE_COLORS = Object.freeze({
  lips: '#cf8478',
  'hard-palate': '#eec3b4',
  'soft-palate': '#e5a79c',
  'palatoglossal-arch': '#dd9a92',
  'palatine-tonsil': '#d5827e',
  'upper-teeth': '#f6f2e6',
  'lower-teeth': '#f4efe2',
  mandible: '#eae2cd',
  'tongue-oral-part': '#dd8f85',
  'tongue-root': '#cf7f7c',
  'vallate-papillae': '#b85a58',
  'lingual-tonsil': '#c0787e',
  'floor-of-mouth': '#dfa79c',
  'lingual-frenulum': '#e6b3a8',
  'sublingual-gland': '#e0c38e',
  'submandibular-gland': '#d9b579',
  'submandibular-duct': '#c8a25e',
  'parotid-gland': '#e4cb9c',
  'parotid-duct': '#cfae68',
});

export const ORAL_NATURAL_COLORS = Object.freeze({
  lips: '#cc8074',
  'hard-palate': '#e8bcae',
  'soft-palate': '#e0a298',
  'palatoglossal-arch': '#dc9c94',
  'palatine-tonsil': '#d48884',
  'upper-teeth': '#f6f2e6',
  'lower-teeth': '#f4efe2',
  mandible: '#ece4d0',
  'tongue-oral-part': '#d88c84',
  'tongue-root': '#cc8080',
  'vallate-papillae': '#c06864',
  'lingual-tonsil': '#c07c80',
  'floor-of-mouth': '#dca498',
  'lingual-frenulum': '#e0aca4',
  'sublingual-gland': '#dcc0a0',
  'submandibular-gland': '#d8bc98',
  'submandibular-duct': '#d0b894',
  'parotid-gland': '#e0c8a8',
  'parotid-duct': '#d4bc98',
});

export const ORAL_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function oralStructureCopy() {
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
      hierarchy: ['Mouth', group, name],
      hierarchyJa: ['口腔', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const roof = entry('Roof and doorway', '口蓋と口峡', 'roof', ['roof']);
  const bone = entry('Teeth and jaw', '歯と顎', 'bone', ['bone']);
  const tongue = entry('Tongue', '舌', 'tongue', ['tongue']);
  const floor = entry('Under the tongue', '舌の下', 'floor', ['floor']);
  const gland = entry('Salivary glands', '唾液腺', 'gland', ['gland']);

  return new Map([
    bone(
      'lips',
      'Lips',
      '口唇',
      'The way in, and a moving one: a ring of muscle under skin outside and mucosa inside. Where those two meet is the vermilion border, and it is the line every cleft and every lesion of a lip is described against.',
      '口腔への入口であり、それ自体が動く構造です。外側は皮膚、内側は粘膜に覆われた筋の輪で、両者の移行部が赤唇縁（vermilion border）です。口唇裂や口唇の病変はこの線を基準に記述されます。',
      'Drawn as one closed ring at rest. The muscle in it is not drawn, the vermilion border is described and not shown, and **the lips do not move**.',
      '安静時の閉じた1つの輪として描いています。内部の筋は描いておらず、赤唇縁も説明にとどめています。**口唇は動きません。**'
    ),
    roof(
      'hard-palate',
      'Hard palate',
      '硬口蓋',
      'The bony front of the roof: a vault, higher in the midline than at the sides. It is the floor of the nose as well as the roof of the mouth, which is the whole of why a cleft in it joins the two.',
      '口蓋の前方、骨性の部分です。正中が高く側方が低い円蓋をなします。同時に鼻腔の底でもあり、ここに裂ができると口腔と鼻腔がつながるのはそのためです。',
      'One smooth vault. Its sutures, the incisive papilla and the transverse ridges on it are not drawn, and the nose above it is a different scene.',
      '滑らかな1つの円蓋として描いています。縫合線・切歯乳頭・横口蓋ヒダは描いておらず、上方の鼻腔は別のシーンです。'
    ),
    roof(
      'soft-palate',
      'Soft palate',
      '軟口蓋',
      'The roof carrying on backwards as something that moves, with the uvula hanging off the end. It lifts in a swallow and shuts the nose off, and it drops in sleep — which is why it is the first thing named when an airway closes at night.',
      '口蓋が後方へ、動く構造として続く部分で、末端に口蓋垂が下がります。嚥下時には挙上して鼻腔を遮断し、睡眠時には弛緩して下垂します。夜間の気道閉塞でまず名前が挙がるのはこのためです。',
      'Drawn hanging at rest, with the uvula as part of the same sheet. **It does not lift**, and the muscles in it are not drawn.',
      '安静時の下垂位で描き、口蓋垂も同じ1枚に含めています。**挙上しません。** 内部の筋も描いていません。'
    ),
    roof(
      'palatoglossal-arch',
      'Palatoglossal arches',
      '口蓋舌弓',
      'The two folds running down from the soft palate onto the sides of the tongue. They are the **doorway** from mouth to throat — the frame of the fauces — and the tonsil sits in the bed behind each one.',
      '軟口蓋から舌の側面へ下る2本のひだです。口腔から咽頭への**入口（口峡）の枠**であり、その後方のくぼみ（扁桃窩）に口蓋扁桃が収まります。',
      'Drawn as plain cords. The muscle inside each fold, and the palatopharyngeal arch behind it, are described and not drawn.',
      '単純なひも状に描いています。各ひだの中の筋と、その後方の口蓋咽頭弓は説明にとどめています。'
    ),
    roof(
      'palatine-tonsil',
      'Palatine tonsils',
      '口蓋扁桃',
      'A pair of lymphoid masses in the bed behind each arch — **the only part of the lymphoid ring you can see by asking someone to open their mouth**, which is why it is the one everybody means by "tonsils".',
      '各口蓋舌弓の後方のくぼみにある1対のリンパ組織です。**口を開けてもらうだけで見えるワルダイエル咽頭輪の唯一の部分**で、一般に「扁桃」と呼ばれるのはこれです。',
      'Two smooth masses at one size. Their crypts, the bed behind them and the rest of the lymphoid ring are not drawn.',
      '1つの大きさの滑らかな塊2つとして描いています。陰窩・扁桃床・咽頭輪の他の部分は描いていません。'
    ),
    bone(
      'upper-teeth',
      'Upper teeth',
      '上顎歯列',
      'The upper arch, standing in bone that is part of the face rather than a separate bone that moves. The row is drawn as one band: **this model says where the arch is, not what any individual tooth is.**',
      '上顎の歯列です。歯が立つ骨は、動く独立した骨ではなく顔面骨の一部です。歯列は1本の帯として描いており、**このモデルが示すのは歯列弓の位置であって、個々の歯ではありません。**',
      'One continuous band following the arch. No individual tooth, root, crown shape or number is represented, and no eruption stage.',
      '歯列弓に沿う連続した1本の帯として描いています。個々の歯・歯根・歯冠形態・本数・萌出段階はいずれも表現していません。'
    ),
    bone(
      'lower-teeth',
      'Lower teeth',
      '下顎歯列',
      'The lower arch, which is on the jaw that moves. It is **narrower than the upper one**, which is why the upper teeth normally overlap it rather than meeting it edge to edge.',
      '下顎の歯列で、動く顎の上にあります。上顎歯列より**わずかに小さく**、そのため上の歯が下の歯を覆う（オーバーバイト）のが通常の咬合です。',
      'One continuous band, as above. **The arch is drawn open by a display amount** (`JAW_DISPLAY_OPENING`) and no occlusal relationship may be read off the model.',
      '上と同じく連続した1本の帯です。**顎は表示上の量だけ開いた位置**（`JAW_DISPLAY_OPENING`）で描いており、咬合関係をこのモデルから読み取ることはできません。'
    ),
    bone(
      'mandible',
      'Mandible',
      '下顎骨',
      'The only bone of the skull that moves. A horseshoe body carrying the lower teeth, with a ramus rising from each end towards the joint in front of the ear — and the parotid gland lying against the outside of each ramus.',
      '頭蓋で唯一動く骨です。下顎歯列を載せた馬蹄形の体部と、その両端から耳の前の関節へ向かって立ち上がる下顎枝からなります。各下顎枝の外側面に耳下腺が接します。',
      'Body and rami only. The condyle, the joint it makes, the coronoid process, the canal inside the bone and the muscles on it are not drawn, and **the jaw does not move**.',
      '体部と下顎枝のみを描いています。下顎頭・顎関節・筋突起・下顎管・咀嚼筋は描いておらず、**顎は動きません。**'
    ),
    tongue(
      'tongue-oral-part',
      'Tongue — oral part',
      '舌（前2/3）',
      'The front two-thirds: the part you can stick out, and the part that moves food around. It came from the floor of the mouth in development, and **it has its own nerves for touch and for taste** — different ones from the third behind it.',
      '舌の前2/3で、突き出すことができ、食塊を動かすのはこの部分です。発生学的には口腔底に由来し、**触覚と味覚のいずれについても後方1/3とは別の神経**に支配されます。',
      'One smooth dome. The papillae over its surface, the muscles inside it and the midline septum are not drawn, and **it does not move**.',
      '滑らかな1つのドームとして描いています。表面の舌乳頭、内部の筋、正中の舌中隔は描いておらず、**動きません。**'
    ),
    tongue(
      'tongue-root',
      'Tongue — root',
      '舌根（後1/3）',
      'The back third, facing backwards into the throat rather than upwards into the mouth. It came from the pharynx in development and **is supplied by different nerves for both touch and taste** — which is why numbing the front of a tongue leaves the back of it feeling.',
      '舌の後1/3で、上方の口腔ではなく後方の咽頭に面しています。発生学的には咽頭に由来し、**触覚・味覚とも前2/3とは異なる神経**に支配されます。前方を麻酔しても後方の感覚が残るのはそのためです。',
      'Drawn as a separate part meeting the oral part at the boundary line; the difference between them is a difference of origin and nerve supply, not of the tissue drawn here.',
      '境界線で前2/3と接する別の部分として描いています。両者の違いは発生と神経支配の違いであり、ここで描いている組織そのものの違いではありません。'
    ),
    tongue(
      'vallate-papillae',
      'Vallate papillae',
      '有郭乳頭',
      'A row of eight to twelve large papillae lying in a V across the tongue, opening forwards. **They are the only thing on the surface that marks the boundary** between the two parts — the sulcus terminalis runs along behind them.',
      '舌を横切ってV字に並ぶ、8〜12個の大きな乳頭です。**表面で前2/3と後1/3の境界を示す唯一の目印**で、その後方に分界溝（sulcus terminalis）が走ります。',
      'Nine drawn for eight to twelve, at one size, and **they are drawn because the line they mark cannot otherwise be pointed at**. The foramen cecum at the apex of the V is not drawn, and no other papillae are.',
      '8〜12個を代表して9個を1つの大きさで描いています。**この乳頭列を描いているのは、境界線そのものが他に指し示せないためです。** V字の頂点にある舌盲孔は描いておらず、他の乳頭も描いていません。'
    ),
    tongue(
      'lingual-tonsil',
      'Lingual tonsil',
      '舌扁桃',
      'The lumpy lymphoid surface of the root, behind the boundary. With the palatine tonsils and the adenoid it makes the ring of lymphoid tissue round the entrance to the throat.',
      '境界より後方、舌根の表面をなす凹凸のあるリンパ組織です。口蓋扁桃・咽頭扁桃（アデノイド）とともに咽頭入口を取り巻くワルダイエル咽頭輪を構成します。',
      'Drawn as ten mounds standing for many. It is one selectable structure rather than separate nodules, and the rest of the ring is described and not drawn.',
      '多数を代表する10個の隆起として描いています。個々の小結節ではなく1つの選択単位としており、咽頭輪の他の部分は説明にとどめています。'
    ),
    floor(
      'floor-of-mouth',
      'Floor of the mouth',
      '口腔底',
      'The sheet slung between the two sides of the jaw that the tongue sits on. Everything under the tongue — the glands, their ducts, the vessels and the nerves — is either in it or immediately below it.',
      '顎の左右をつなぐように張られ、舌を支えるシートです。舌下の構造——唾液腺・導管・血管・神経——はすべてこの中か、すぐ下にあります。',
      'Drawn as one smooth sheet. The mylohyoid muscle it is named after, and the geniohyoid and hyoglossus around it, are not drawn.',
      '滑らかな1枚のシートとして描いています。その名の由来である顎舌骨筋も、周囲のオトガイ舌骨筋・舌骨舌筋も描いていません。'
    ),
    floor(
      'lingual-frenulum',
      'Lingual frenulum',
      '舌小帯',
      'The fold in the midline tethering the tongue to the floor. How far forward it reaches is what decides how far a tongue can be lifted and put out — which is the whole of what "tongue-tie" means.',
      '正中で舌を口腔底につなぎ止めるひだです。これがどこまで前方に付着しているかが、舌をどこまで挙上・突出できるかを決めます。舌小帯短縮症（tongue-tie）はこの一点の問題です。',
      'Drawn at one length, as one sheet. **No degree of tethering is represented**, and the openings of the submandibular ducts on either side of it are described and not drawn as openings.',
      '1つの長さの1枚のひだとして描いています。**付着の程度は表現していません。** 両側の顎下腺管開口部（舌下小丘）も、開口部としては描いていません。'
    ),
    gland(
      'sublingual-gland',
      'Sublingual glands',
      '舌下腺',
      'The smallest pair, lying **in** the floor of the mouth on either side of the frenulum. They are the only one of the three that opens more or less where it sits — through many small ducts straight up into the floor.',
      '3対のうち最も小さく、舌小帯の両側の**口腔底の中**にあります。3対のうち唯一、ほぼその場に開口する腺で、多数の小導管が口腔底へ直接開きます。',
      'Drawn as two smooth masses. Their many small ducts are described and not drawn.',
      '滑らかな塊2つとして描いています。多数の小導管は説明にとどめています。'
    ),
    gland(
      'submandibular-gland',
      'Submandibular glands',
      '顎下腺',
      'A pair hanging **below the jaw**, behind and outside the floor of the mouth — nowhere near where their saliva arrives. They make most of the saliva in a resting mouth.',
      '**下顎の下**に、口腔底の後外側に位置する1対の腺です。唾液が出てくる場所とはまったく離れています。安静時唾液の大部分はこの腺が産生します。',
      'Drawn as two smooth masses at one size, without the way each wraps round the back edge of the floor of the mouth.',
      '1つの大きさの滑らかな塊2つとして描いています。口腔底後縁を回り込む形態は表現していません。'
    ),
    gland(
      'submandibular-duct',
      'Submandibular ducts',
      '顎下腺管',
      'The long way round: **forwards under the tongue**, the whole length of the floor of the mouth, to open at a point beside the frenulum. It runs uphill and it is long, which is why this is the gland that forms stones.',
      '遠回りの経路です——**舌の下を前方へ**、口腔底の全長を走り、舌小帯の脇（舌下小丘）に開口します。上り勾配で長い経路であることが、唾石が顎下腺に最も多い理由です。',
      'Drawn as a plain tube to the point it opens at; the opening itself, and the nerve that crosses under it, are not drawn.',
      '開口点までの単純な管として描いています。開口部そのものや、その下を交差する舌神経は描いていません。'
    ),
    gland(
      'parotid-gland',
      'Parotid glands',
      '耳下腺',
      'The largest pair, lying against the outside of each mandibular ramus in front of the ear. **It is outside the mouth altogether** — which is why it swells as a lump on the side of the face, not in the mouth.',
      '3対で最も大きく、耳の前方、下顎枝の外側面に接します。**口腔の完全に外側**にあるため、腫脹すると口の中ではなく顔面側方の腫瘤として現れます。',
      'Two smooth masses at one size. The facial nerve running through it, which is the reason its surgery is described the way it is, is not drawn.',
      '1つの大きさの滑らかな塊2つとして描いています。腺内を貫く顔面神経——耳下腺手術の記述がああである理由——は描いていません。'
    ),
    gland(
      'parotid-duct',
      'Parotid ducts',
      '耳下腺管',
      'Forwards **across the cheek**, to open opposite an upper back tooth. Saliva from the side of the face arrives in the mouth at a point nowhere near it, and that point is the one a reader has to be able to find.',
      '**頬を横切って**前方へ走り、上顎の臼歯に向かい合う位置に開口します。顔の側方でつくられた唾液は、そこからまったく離れた場所で口腔内に出てきます。この開口点こそが押さえるべき点です。',
      'Drawn as a plain tube to the point it opens at; the opening itself, and the muscle of the cheek it pierces, are not drawn.',
      '開口点までの単純な管として描いています。開口部そのものと、貫通する頬筋は描いていません。'
    ),
  ]);
}

export const ORAL_ANATOMY_META = Object.freeze({
  id: 'oral-anatomy',
  status: 'alpha',
  title: 'Interactive mouth and tongue anatomy',
  titleJa: '触れて学ぶ口腔・舌の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the roof, the tongue or what is under it',
  subtitleJa: '触れて部位を確認・クリック／タップで口蓋・舌・舌下の各部を固定',
  inspection: { background: 'studio' },
  palette: {
    roof: ORAL_SCENE_COLORS['soft-palate'],
    bone: ORAL_SCENE_COLORS.mandible,
    tongue: ORAL_SCENE_COLORS['tongue-oral-part'],
    floor: ORAL_SCENE_COLORS['floor-of-mouth'],
    gland: ORAL_SCENE_COLORS['parotid-gland'],
  },
  legend: [
    { key: 'roof', label: 'Roof and doorway', labelJa: '口蓋と口峡' },
    { key: 'bone', label: 'Teeth and jaw', labelJa: '歯と顎' },
    { key: 'tongue', label: 'Tongue', labelJa: '舌' },
    { key: 'floor', label: 'Under the tongue', labelJa: '舌の下' },
    { key: 'gland', label: 'Salivary glands', labelJa: '唾液腺' },
  ],
  stages: [
    {
      id: 'inside',
      name: 'Looking in',
      nameJa: '口の中',
      at: 0,
      summary: 'The roof, the doorway at the back of it, and the tongue on the floor between them.',
      summaryJa: '口蓋と、その奥の口峡、そして両者の間の口腔底に載る舌です。',
    },
    {
      id: 'around',
      name: 'And around it',
      nameJa: 'その周囲',
      at: 1,
      summary:
        'The jaw and the tongue step back: three pairs of glands outside the mouth, and the ducts that carry saliva to places nowhere near them.',
      summaryJa:
        '顎と舌を薄くすると、口腔の外にある3対の唾液腺と、そこから遠く離れた位置へ唾液を運ぶ導管が見えます。',
    },
  ],
  range: { start: 'Inside', startJa: '口の中', end: 'Around', endJa: '周囲' },
  progressLabel: { label: 'Jaw and tongue transparency', labelJa: '顎と舌の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A mouth **drawn open by a display amount** (`JAW_DISPLAY_OPENING`), because a closed mouth shows nothing; it is a position rather than a change of shape, and no measurement of opening or of occlusion may be read off it. **Nothing here moves: nothing is chewed or swallowed, the tongue does not move, the soft palate does not lift, the jaw does not close and no saliva flows.** The two rows of teeth are drawn as bands following the arch: **no individual tooth, root, crown shape or number is represented.** No length, angle or gland volume is a measurement. The muscles of the tongue, the floor and the jaw, the joint of the jaw, the facial and lingual and hypoglossal nerves, the vessels of the mouth, the cheeks and the papillae other than the vallate row are not drawn, and nothing here is anyone’s mouth.',
  disclaimerJa:
    '教育用肉眼解剖モデル：**表示上の量だけ顎を開いた状態**（`JAW_DISPLAY_OPENING`）で描いています。閉じた口では何も見えないためで、これは形を変えたのではなく位置です。開口量や咬合関係をこのモデルから読み取ることはできません。**このシーンでは何も動きません——咀嚼も嚥下もなく、舌も動かず、軟口蓋も挙上せず、顎も閉じず、唾液も流れません。** 上下の歯列は歯列弓に沿う帯として描いており、**個々の歯・歯根・歯冠形態・本数は表現していません。** 長さ・角度・腺の容積はいずれも実測値ではありません。舌筋・口腔底の筋・咀嚼筋・顎関節・顔面神経・舌神経・舌下神経・口腔内の血管・頬・有郭乳頭以外の舌乳頭は描いておらず、特定の個人の口腔でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
