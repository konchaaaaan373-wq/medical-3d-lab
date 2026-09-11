/**
 * What the pelvic floor scene says, in both languages.
 *
 * The geometry is `scenes/musculoskeletal/organs/pelvicFloor.js`. The copy is
 * laid out as the sheet is read — **the frame, then the sheet, then the gap in
 * it, then what goes through** — because the gap and the sling are the two
 * things this anatomy is about, and both of them are absences or shapes rather
 * than organs.
 *
 * It names no prolapse, no incontinence, no tear, no operation. Disease is
 * somebody else's scene.
 */

export const PELVIC_SCENE_COLORS = Object.freeze({
  'pelvic-ring': '#e8e0cb',
  sacrum: '#ece4d0',
  coccyx: '#e6ddc6',
  'obturator-internus': '#c4816f',
  'tendinous-arch': '#ded2b0',
  pubococcygeus: '#cf8878',
  iliococcygeus: '#c47d70',
  coccygeus: '#b8756c',
  puborectalis: '#d9756a',
  'urogenital-hiatus': '#8fc0d8',
  'perineal-body': '#e7dba6',
  'perineal-membrane': '#dccf9c',
  'external-anal-sphincter': '#c4685f',
  urethra: '#d8b96f',
  vagina: '#d69a95',
  rectum: '#cf8f7c',
  'anal-canal': '#c07c6e',
});

export const PELVIC_NATURAL_COLORS = Object.freeze({
  'pelvic-ring': '#ece4d0',
  sacrum: '#eee6d2',
  coccyx: '#e8e0cc',
  'obturator-internus': '#c07c6c',
  'tendinous-arch': '#ded4b8',
  pubococcygeus: '#c47c6c',
  iliococcygeus: '#c07868',
  coccygeus: '#bc7464',
  puborectalis: '#c87868',
  'urogenital-hiatus': '#cdd9e0',
  'perineal-body': '#e0d4b0',
  'perineal-membrane': '#dcd0ac',
  'external-anal-sphincter': '#bc7060',
  urethra: '#d0b894',
  vagina: '#d09890',
  rectum: '#cc9080',
  'anal-canal': '#c48474',
});

export const PELVIC_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'By structure', labelJa: '構造別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function pelvicFloorStructureCopy() {
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
      hierarchy: ['Pelvic floor', group, name],
      hierarchyJa: ['骨盤底', groupJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey,
      tags,
    },
  ];

  const frame = entry('The frame', '骨盤の枠', 'frame', ['frame']);
  const sheet = entry('The sheet of muscle', '骨盤底の筋', 'floor', ['muscle']);
  const gap = entry('The gap in it', '裂孔', 'gap', ['space']);
  const perineum = entry('Below it', '会陰', 'perineum', ['perineum']);
  const through = entry('What goes through', '通過する器官', 'through', ['viscus']);

  return new Map([
    frame(
      'pelvic-ring',
      'Pelvic ring',
      '骨盤輪',
      'The bony frame the floor is slung across: the brim above, the side walls, and the rami that close the outlet in front. **The bones here are a frame, not the subject** — what matters about them is where the muscle attaches.',
      '骨盤底が張られる骨の枠です。上方の骨盤上口、側壁、前方で骨盤下口を囲む恥骨・坐骨枝からなります。**このシーンでの骨は枠であって主題ではありません**——重要なのは筋がどこに付着するかです。',
      'Drawn as the ring itself. **There is no iliac wing, no acetabulum and no obturator foramen here**, the two hip bones and the symphysis between them are not separated, and no bone dimension is a measurement.',
      '輪そのものとして描いています。**腸骨翼・寛骨臼・閉鎖孔は描いておらず**、左右の寛骨と恥骨結合も分けていません。骨の寸法は実測値ではありません。'
    ),
    frame(
      'sacrum',
      'Sacrum',
      '仙骨',
      'The back wall of the ring: five fused vertebrae, wide above and narrow below, curved so that the hollow of it faces forwards into the pelvis.',
      '骨盤輪の後壁をなす、5個の椎骨が癒合した骨です。上方が広く下方が狭く、前方（骨盤腔側）に凹の弯曲をもちます。',
      'One smooth wedge. Its segments, the foramina through it and its joints with the hip bones are not drawn.',
      '滑らかな1つのくさびとして描いています。各分節・仙骨孔・仙腸関節は描いていません。'
    ),
    frame(
      'coccyx',
      'Coccyx',
      '尾骨',
      'The small tail on the end of the sacrum. Its use here is as an attachment: **the back end of the floor is anchored to it**, which is why a sheet that ought to be slack is not.',
      '仙骨の末端にある小さな骨です。ここでの意味は付着部であることで、**骨盤底の後端がこの骨に固定されて**います。本来たるむはずのシートがたるまないのはこのためです。',
      'One smooth taper; its segments and its joint with the sacrum are not drawn.',
      '滑らかに細くなる1つの形として描いています。分節と仙尾関節は描いていません。'
    ),
    frame(
      'obturator-internus',
      'Obturator internus',
      '内閉鎖筋',
      'The muscle lining the side wall of the pelvis. It belongs to the hip rather than to the floor, but **the floor hangs off a thickening on its surface** — so it is here because of what is attached to it.',
      '骨盤側壁を裏打ちする筋です。機能的には股関節の筋ですが、**骨盤底はこの筋の表面の肥厚部から吊り下がって**います。付着される側としてこのシーンにあります。',
      'Drawn as a plain sheet on the wall. Its tendon, the canal it leaves through and everything it does at the hip are not drawn.',
      '壁の上の単純なシートとして描いています。腱・小坐骨孔からの走行・股関節での作用は描いていません。'
    ),
    sheet(
      'tendinous-arch',
      'Tendinous arch',
      '腱弓',
      'The line on the side wall the sheet is attached to, running from the back of the pubis to the ischial spine. **It is where the floor hangs from**, and it is drawn because a line of attachment is a thing a reader has to be able to point at.',
      '恥骨後面から坐骨棘へ走る、側壁上の付着線です。**骨盤底はここから吊り下がって**います。付着線そのものを指し示せるようにするために描いています。',
      'Drawn as a plain cord along exactly the line the sheet starts at (`levatorOrigin`), so the two cannot disagree.',
      'シートの起始線（`levatorOrigin`）そのものに沿う単純なひもとして描いています。両者が食い違わないようにするためです。'
    ),
    sheet(
      'pubococcygeus',
      'Pubococcygeus',
      '恥骨尾骨筋',
      'The front part of the sheet, from the back of the pubis backwards. **Its two sides do not meet in front** — the gap between them is the urogenital hiatus, and that is not a defect but how the floor is built.',
      'シートの前方部で、恥骨後面から後方へ走ります。**左右が前方で合わさることはなく**、その間の隙間が尿生殖裂孔です。これは欠損ではなく、骨盤底の構造そのものです。',
      'Drawn as one smooth slice of the sheet. Its named subdivisions — pubovaginalis, puboperinealis, puboanalis — are not separated, and **it does not contract**.',
      'シートの滑らかな1区画として描いています。恥骨腟筋・恥骨会陰筋・恥骨肛門筋といった細分は分けておらず、**収縮もしません**。'
    ),
    sheet(
      'iliococcygeus',
      'Iliococcygeus',
      '腸骨尾骨筋',
      'The middle of the sheet, running from the tendinous arch inwards to meet its opposite number in the midline. This is the part that is genuinely a **sheet** — a flat shelf across the back half of the outlet.',
      'シートの中間部で、腱弓から内側へ走り、正中で反対側と合します。ここが文字どおりの**シート**で、骨盤下口の後半を覆う平らな棚になっています。',
      'One smooth slice. The raphe where the two sides meet is where they meet in the model, and is not drawn as a separate structure.',
      '滑らかな1区画として描いています。左右が合する縫線は、モデル上で両側が接する場所そのものであり、別の構造としては描いていません。'
    ),
    sheet(
      'coccygeus',
      'Coccygeus',
      '尾骨筋',
      'The back corner of the floor, from the ischial spine to the side of the coccyx and sacrum. It closes the sheet off behind, so that the funnel has a back as well as sides.',
      '骨盤底の後方部で、坐骨棘から尾骨・仙骨の側縁へ張ります。後方でシートを閉じ、漏斗に側壁だけでなく後壁を与えます。',
      'Drawn as the back slice of the same sheet. The ligament it lies on is not drawn.',
      '同じシートの後方区画として描いています。その上にある仙棘靭帯は描いていません。'
    ),
    sheet(
      'puborectalis',
      'Puborectalis',
      '恥骨直腸筋',
      '**The one part of the floor that is not a sheet.** It leaves the back of the pubis on each side, passes *behind* the bowel, and comes back — a sling. Pulling on it bends the bowel forwards, and **that bend, not a ring of muscle, is what holds.**',
      '**骨盤底で唯一シートではない部分です。** 左右の恥骨後面から起こり、腸管の*後方*を回って戻る吊り輪（sling）をなします。これが収縮すると腸管が前方へ屈曲し、**輪状の括約筋ではなくこの角度こそが保持を担っています。**',
      'Drawn as a plain strap at one thickness, in one position. **It does not contract**, and the angle it makes is drawn at one value which is not a measurement.',
      '1つの太さ・1つの位置の単純なストラップとして描いています。**収縮しません。** つくる角度も1つの値で描いており、実測値ではありません。'
    ),
    gap(
      'urogenital-hiatus',
      'Urogenital hiatus',
      '尿生殖裂孔',
      'The gap in the front of the sheet, between the two sides of the pubococcygeus. **The urethra and the vagina pass through it and nothing closes it** — the floor is a sheet with a hole in the front of it, and everything about how this region fails starts there.',
      'シートの前方、左右の恥骨尾骨筋の間にある隙間です。**尿道と腟がここを通り、閉じる構造はありません。** 骨盤底は前方に穴の開いたシートであり、この領域の破綻はすべてここから始まります。',
      'Drawn as the space itself, because the thing worth pointing at here is an **absence**. It is a real gap and not a display one: its edges are the medial edges of the sheet on either side (`levatorInsertion`).',
      '指し示すべきものが**欠如**であるため、空間そのものとして描いています。表示上の隙間ではなく実在する隙間で、その縁は左右のシートの内側縁（`levatorInsertion`）そのものです。'
    ),
    perineum(
      'perineal-body',
      'Perineal body',
      '会陰体',
      'A knot of fibrous tissue between the vagina in front and the anal canal behind. **Everything in the perineum is tied into it** — the sphincter, the membrane, the floor — which is why something the size of a grape matters as much as it does.',
      '前方の腟と後方の肛門管の間にある線維性の結節です。**会陰のあらゆる構造がここに集まって**います——外肛門括約筋・会陰膜・骨盤底のいずれもです。ブドウ粒ほどの大きさの構造がこれほど重要なのはそのためです。',
      'Drawn as one small mass at one size. What attaches to it is described and not drawn as attachments.',
      '1つの大きさの小さな塊として描いています。ここに付着する各構造は説明にとどめ、付着として描いてはいません。'
    ),
    perineum(
      'perineal-membrane',
      'Perineal membrane',
      '会陰膜',
      'A sheet stretched across the front half of the outlet, **below** the floor. It is a second, lower storey: the urethra and vagina pass through the floor and then through this.',
      '骨盤下口の前半に張られ、骨盤底の**下方**に位置するシートです。いわば2階建ての下の階で、尿道と腟は骨盤底を貫いたあとさらにこれを貫きます。',
      'One flat sheet. The muscles on and under it, and the openings through it, are described and not drawn.',
      '平らな1枚のシートとして描いています。その上下の筋や貫通部は説明にとどめています。'
    ),
    perineum(
      'external-anal-sphincter',
      'External anal sphincter',
      '外肛門括約筋',
      'A ring of voluntary muscle around the end of the bowel, below the sling. It is the part that can be squeezed on purpose — but **it is the sling above it that does most of the holding**, which is the point of drawing both.',
      '腸管末端を取り巻く随意筋の輪で、恥骨直腸筋の吊り輪より下方にあります。意識的に締められるのはこちらですが、**保持の大部分は上方の吊り輪が担っています。** 両方を描いているのはその対比のためです。',
      'One even ring. Its parts, and the internal sphincter inside it, are not drawn, and **it does not contract**.',
      '均一な1つの輪として描いています。各部分や内側の内肛門括約筋は描いておらず、**収縮もしません**。'
    ),
    through(
      'urethra',
      'Urethra',
      '尿道',
      'Down through the front of the hiatus, in front of the vagina. It is **short**, and it crosses a gap in the floor rather than a hole in a muscle — which is the whole of why support here matters to it.',
      '裂孔の前部を、腟の前方で下行します。**短く**、しかも筋にあいた孔ではなくシートの隙間を横切ります。ここの支持が尿道にとって重要なのは、この一点によります。',
      'Drawn as a plain tube of even calibre. Its sphincters and its wall are not drawn, and **no length or calibre is a measurement**.',
      '口径の一定な単純な管として描いています。括約筋や壁の構造は描いておらず、**長さも口径も実測値ではありません**。'
    ),
    through(
      'vagina',
      'Vagina',
      '腟',
      'Through the hiatus behind the urethra, flattened front to back. Because it shares that one gap with the urethra, **what supports one supports the other**, and the front wall of it is what the urethra rests on.',
      '尿道の後方で裂孔を通り、前後に扁平です。尿道と同じ1つの隙間を共有するため、**一方を支える構造は他方も支えます**。尿道はこの前壁の上に載っています。',
      'Drawn as a flattened tube at rest. Its walls, the fornices at the top and the cervix above are not drawn — the uterus is a different scene.',
      '安静時の扁平な管として描いています。壁の構造・上方の腟円蓋・子宮頸部は描いていません。子宮は別のシーンです。'
    ),
    through(
      'rectum',
      'Rectum',
      '直腸',
      'Coming down the hollow of the sacrum to the floor. It does not pass through the urogenital hiatus — **it goes through its own gap, behind the sling**, which is why the two halves of this floor fail in different ways.',
      '仙骨の凹面に沿って下行し、骨盤底に達します。尿生殖裂孔は通らず、**吊り輪の後方にある自分自身の隙間**を通ります。骨盤底の前半と後半で破綻の仕方が異なるのはこのためです。',
      'Drawn as a plain tube; its curves, its wall and its contents are not drawn.',
      '単純な管として描いています。弯曲・壁の構造・内容は描いていません。'
    ),
    through(
      'anal-canal',
      'Anal canal',
      '肛門管',
      'The short last length, **angled forwards** where the sling passes behind it. That angle is drawn because it is the thing the sling exists to make.',
      '最後の短い区間で、吊り輪が後方を通る位置で**前方へ屈曲**しています。この角度は、吊り輪が存在する目的そのものであるため描いています。',
      'Drawn at one fixed angle, which **is not a measurement**; it does not change, because nothing here contracts.',
      '1つの固定した角度で描いており、**実測値ではありません**。何も収縮しないため、角度も変化しません。'
    ),
  ]);
}

export const PELVIC_ANATOMY_META = Object.freeze({
  id: 'pelvic-floor-anatomy',
  status: 'alpha',
  title: 'Interactive pelvic floor anatomy',
  titleJa: '触れて学ぶ骨盤底の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the sheet, the gap in it or what passes through',
  subtitleJa: '触れて部位を確認・クリック／タップで骨盤底の筋・裂孔・通過する器官を固定',
  inspection: { background: 'studio' },
  palette: {
    frame: PELVIC_SCENE_COLORS['pelvic-ring'],
    floor: PELVIC_SCENE_COLORS.puborectalis,
    gap: PELVIC_SCENE_COLORS['urogenital-hiatus'],
    perineum: PELVIC_SCENE_COLORS['perineal-body'],
    through: PELVIC_SCENE_COLORS.rectum,
  },
  legend: [
    { key: 'frame', label: 'The frame', labelJa: '骨盤の枠' },
    { key: 'floor', label: 'The sheet of muscle', labelJa: '骨盤底の筋' },
    { key: 'gap', label: 'The gap in it', labelJa: '裂孔' },
    { key: 'perineum', label: 'Below it', labelJa: '会陰' },
    { key: 'through', label: 'What goes through', labelJa: '通過する器官' },
  ],
  stages: [
    {
      id: 'frame',
      name: 'A ring',
      nameJa: '骨の輪',
      at: 0,
      summary: 'A bony ring with a funnel of muscle slung across it.',
      summaryJa: '骨の輪と、そこに張られた漏斗状の筋のシートです。',
    },
    {
      id: 'floor',
      name: 'A sheet with a gap',
      nameJa: '隙間のあるシート',
      at: 1,
      summary:
        'The frame steps back: a sheet that stops short of the midline in front, and a sling behind the bowel that bends it forwards.',
      summaryJa:
        '骨を薄くすると、前方で正中に届かないシートと、腸管の後方を回ってそれを前方へ屈曲させる吊り輪が見えます。',
    },
  ],
  range: { start: 'Frame', startJa: '骨の輪', end: 'Floor', endJa: '骨盤底' },
  progressLabel: { label: 'Bone transparency', labelJa: '骨の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — A **female** pelvic floor, drawn schematically. **The bones are a frame rather than a subject**: there is no iliac wing, no acetabulum and no obturator foramen, and the two hip bones and the symphysis are not separated. **Nothing here moves or contracts**: no muscle shortens, nothing descends, no pressure is represented and the anorectal angle is drawn at one fixed value. No length, angle, thickness or bone dimension is a measurement. The subdivisions of the levator, the fascia, the ligaments, the uterus, the bladder, the pudendal nerve and the vessels are not drawn, and nothing here is anyone’s pelvis. **Nothing in this scene supports any claim about childbirth, continence, prolapse or any procedure.**',
  disclaimerJa:
    '教育用肉眼解剖モデル：**女性**の骨盤底を模式的に描いたものです。**骨は主題ではなく枠として**描いており、腸骨翼・寛骨臼・閉鎖孔はなく、左右の寛骨と恥骨結合も分けていません。**このシーンでは何も動かず、収縮もしません**——筋は短縮せず、下垂も起こらず、圧も表現しておらず、直腸肛門角も1つの固定値で描いています。長さ・角度・厚み・骨の寸法はいずれも実測値ではありません。肛門挙筋の細分・筋膜・靭帯・子宮・膀胱・陰部神経・血管は描いておらず、特定の個人の骨盤でもありません。**分娩・尿禁制・骨盤臓器脱・手技に関するいかなる主張も、このシーンは支えません。**',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
