/**
 * What the biliary anatomy scene says, in both languages.
 *
 * The geometry is `scenes/hepatobiliary/organs/biliaryTree.js`. The copy is
 * organised around the one thing this model is for: **where an obstruction has
 * to be for a particular thing to go wrong.** A stone in the cystic duct and a
 * stone in the common bile duct are the same stone in two places and two
 * completely different illnesses, and the difference is the order of the
 * junctions — which is exactly what the geometry holds.
 *
 * The copy never names a treatment and never gives a threshold. It says which
 * duct is upstream of which, and stops.
 */

export const BILIARY_SCENE_COLORS = Object.freeze({
  'gallbladder-fundus': '#d8c45a',
  'gallbladder-body': '#c9b23c',
  'gallbladder-neck': '#a89230',
  'right-hepatic-duct': '#5fa86f',
  'left-hepatic-duct': '#7cbd86',
  'common-hepatic-duct': '#3f8f58',
  'cystic-duct': '#9ccf8f',
  'common-bile-duct': '#2f6b45',
  'pancreatic-duct': '#57bda4',
  'major-duodenal-papilla': '#c8603f',
  duodenum: '#d99a7c',
  'pancreatic-head': '#deb18c',
});

export const BILIARY_NATURAL_COLORS = Object.freeze({
  'gallbladder-fundus': '#c9b23c',
  'gallbladder-body': '#c9b23c',
  'gallbladder-neck': '#c9b23c',
  'right-hepatic-duct': '#8ca88a',
  'left-hepatic-duct': '#8ca88a',
  'common-hepatic-duct': '#8ca88a',
  'cystic-duct': '#8ca88a',
  'common-bile-duct': '#8ca88a',
  'pancreatic-duct': '#b7c8c1',
  'major-duodenal-papilla': '#c08878',
  duodenum: '#d0947f',
  'pancreatic-head': '#deb18c',
});

export const BILIARY_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function biliaryStructureCopy() {
  const gallbladder = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Gallbladder', 'Gallbladder', name],
      hierarchyJa: ['胆嚢', '胆嚢', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'gallbladder',
      tags: ['gallbladder'],
    },
  ];

  const duct = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Bile ducts', 'Duct', name],
      hierarchyJa: ['胆管', '胆管', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'duct',
      tags: ['duct'],
    },
  ];

  return new Map([
    gallbladder(
      'gallbladder-fundus',
      'Fundus',
      '胆嚢底部',
      'The blind, rounded end. It is the part that reaches past the edge of the liver, which is why it is the part that can be felt — and why a tender gallbladder is felt where it is.',
      '丸く行き止まりになっている端です。肝臓の縁を越えて前方へ出る部分なので、触知できるのはここであり、胆嚢の圧痛が体表のその位置で現れる理由でもあります。'
    ),
    gallbladder(
      'gallbladder-body',
      'Body',
      '胆嚢体部',
      'The main store. Bile made continuously by the liver is held here between meals and concentrated.',
      '胆汁を蓄える主要部分です。肝臓が持続的に作る胆汁を食間に貯留し、濃縮します。',
      'Nothing is stored or concentrated in this model — no volume and no contents are represented.',
      'このモデルでは貯留も濃縮も表現していません。容量も内容物も持っていません。'
    ),
    gallbladder(
      'gallbladder-neck',
      'Neck',
      '胆嚢頸部',
      'Narrows towards the cystic duct. It is the narrowest part of the gallbladder, so it is where a stone leaving it gets stuck first.',
      '胆嚢管へ向かって細くなる部分です。胆嚢のなかで最も狭いため、出ていく結石が最初に嵌頓する部位になります。',
      'Hartmann’s pouch — the outpouching of the neck a stone often sits in — is not drawn.',
      'ハルトマン嚢（結石が留まりやすい頸部の膨隆）は描いていません。'
    ),
    duct(
      'right-hepatic-duct',
      'Right hepatic duct',
      '右肝管',
      'Drains the right liver. Everything made by segments V to VIII leaves this way.',
      '右肝からの胆汁を集めます。V〜VIII区域で作られた胆汁はすべてここを通って出ていきます。',
      'Drawn as one duct beginning at the edge of the model. The liver it comes out of is not drawn here; the segments it drains are `liver-anatomy`.',
      'モデルの端から始まる1本の管として描いています。由来する肝臓そのものはここでは描いておらず、支配区域は `liver-anatomy` にあります。'
    ),
    duct(
      'left-hepatic-duct',
      'Left hepatic duct',
      '左肝管',
      'Drains the left liver — segments II, III and IV. It runs a longer horizontal course than the right before the two meet.',
      '左肝（II・III・IV区域）からの胆汁を集めます。合流するまでの水平方向の走行が右肝管より長いのが特徴です。'
    ),
    duct(
      'common-hepatic-duct',
      'Common hepatic duct',
      '総肝管',
      'What the two hepatic ducts become where they meet. Everything from the whole liver is in this one duct, and the gallbladder has not joined yet — so an obstruction here causes jaundice **and** a gallbladder that cannot fill.',
      '左右の肝管が合流してできる管です。肝臓全体の胆汁が1本にまとまっており、まだ胆嚢は合流していません。ここでの閉塞は、黄疸に加えて「胆嚢が張らない」状態を起こします。'
    ),
    duct(
      'cystic-duct',
      'Cystic duct',
      '胆嚢管',
      'Joins the gallbladder to the rest of the system. It is the only way in and the only way out of the gallbladder — so a stone stuck here blocks the gallbladder alone, and the liver drains on past it without jaundice.',
      '胆嚢と胆道系をつなぐ管です。胆嚢の出入口はここだけなので、結石がここで詰まると胆嚢だけが閉塞し、肝臓からの胆汁はその先を素通りするため黄疸は起こりません。',
      'The spiral valve of Heister inside it is not drawn, and its highly variable length and insertion are drawn one way only.',
      '内部のらせんヒダ（Heister弁）は描いていません。長さと合流位置は個人差が大きい部分ですが、1通りの形でのみ描いています。'
    ),
    duct(
      'common-bile-duct',
      'Common bile duct',
      '総胆管',
      'Below the cystic junction. Everything — liver and gallbladder — is now in one duct, so an obstruction here causes jaundice *and* a gallbladder that distends behind it. It descends **behind** the first part of the duodenum and through the back of the pancreatic head, which is why a mass in that head obstructs it.',
      '胆嚢管合流部より下流の管です。肝臓と胆嚢の両方の胆汁が1本になっているため、ここでの閉塞は黄疸を起こし、同時にその手前の胆嚢が腫大します。十二指腸球部の**背側**を下行し、膵頭部の背側を貫きます。膵頭部の腫瘤がこの管を閉塞させるのは、この位置関係によります。',
      'Drawn where it runs, so it is behind the bowel and inside the gland for much of its course. Use the "Ducts alone" viewpoint, or the slider, to see it — it is not moved forward to be seen.',
      '実際の走行のまま描いているため、走行の多くが腸管の背側・膵実質の内部にあります。見るときは「胆道だけを見る」視点かスライダーを使ってください。見やすくするために手前へ動かすことはしていません。'
    ),
    duct(
      'pancreatic-duct',
      'Main pancreatic duct',
      '主膵管',
      'Arrives from the pancreas and meets the common bile duct at the end. Two secretions with nothing to do with each other share the last few millimetres and the same opening — which is why a stone at that opening can inflame a pancreas.',
      '膵臓から来て、最後に総胆管と合流します。互いに無関係な2つの分泌液が最後の数ミリと開口部を共有しており、その開口部の結石が膵炎を起こしうるのはこのためです。',
      'Only the last stretch is drawn. The gland it comes from is `pancreas-anatomy`. The common channel and the sphincter of Oddi around it are not modelled as structures.',
      '最後の部分だけを描いています。由来する膵臓は `pancreas-anatomy` にあります。共通管とその周囲のOddi括約筋は構造としては表現していません。'
    ),
    [
      'major-duodenal-papilla',
      {
        name: 'Major duodenal papilla',
        nameJa: '大十二指腸乳頭（ファーター乳頭）',
        hierarchy: ['Bile ducts', 'Outlet', 'Major duodenal papilla'],
        hierarchyJa: ['胆管', '出口', '大十二指腸乳頭'],
        description:
          'Where both ducts open into the second part of the duodenum. It is the one place in the body where the biliary and the pancreatic systems share a door, and it is the door an endoscope is aimed at.',
        descriptionJa:
          '胆管と膵管がそろって十二指腸下行部に開口する部位です。胆道系と膵管系が出口を共有する唯一の場所であり、内視鏡的に狙われるのもここです。',
        note: 'Drawn as a marker on the duodenal wall, not as a lumen. The sphincter of Oddi, the minor papilla and the variations in how the two ducts join are not modelled.',
        noteJa:
          '十二指腸壁上のマーカーとして描いており、内腔としては表現していません。Oddi括約筋・小十二指腸乳頭・2管の合流形式の個人差は表現していません。',
        colorKey: 'major-duodenal-papilla',
        legendKey: 'duct',
        tags: ['duct'],
      },
    ],
    [
      'pancreatic-head',
      {
        name: 'Head of the pancreas',
        nameJa: '膵頭部',
        hierarchy: ['Neighbours', 'Pancreas', 'Head'],
        hierarchyJa: ['周囲の臓器', '膵臓', '膵頭部'],
        description:
          'Sits inside the duodenal C, behind the bowel. The common bile duct runs through the back of it on its way to the papilla, and the pancreatic duct runs through it the other way — which is why one mass here can obstruct both.',
        descriptionJa:
          '十二指腸のC字の内側、腸管の背側にあります。総胆管は乳頭へ向かう途中でこの背側を貫き、主膵管は逆向きにこれを貫きます。1つの腫瘤が両方を閉塞させうるのはこのためです。',
        note: 'Context only: one lump standing for the head. The uncinate process is not drawn, and the whole gland is `pancreas-anatomy`.',
        noteJa: '位置関係を示すためだけの表示です。膵頭部を1つの塊で代表させており、鉤状突起は描いていません。膵臓の全体は `pancreas-anatomy` にあります。',
        colorKey: 'pancreatic-head',
        legendKey: 'neighbour',
        tags: ['neighbour'],
      },
    ],
    [
      'duodenum',
      {
        name: 'Duodenum',
        nameJa: '十二指腸',
        hierarchy: ['Neighbours', 'Duodenum', 'Duodenum'],
        hierarchyJa: ['周囲の臓器', '十二指腸', '十二指腸'],
        description:
          'The C the bile arrives in, with the pancreatic head inside it. Its second part is a little to the patient’s right of the midline, and the papilla is on the wall facing the midline — so the duct reaches it from behind and from the pancreatic side.',
        descriptionJa:
          '胆汁が到達するC字型の管で、その内側に膵頭部が収まります。下行部は正中よりやや右側にあり、乳頭は正中側を向いた壁にあります。そのため総胆管は背側・膵側から乳頭に達します。',
        note: 'Context only: one tube of constant calibre, the same loop the pancreas scenes borrow. It is drawn in front of the common bile duct because that is where it is; "Ducts alone" removes it.',
        noteJa: '位置関係を示すためだけの表示です。膵臓のシーンが用いているのと同じ、口径一定のループです。総胆管の腹側に描いているのは実際にそうだからで、「胆道だけを見る」で非表示にできます。',
        colorKey: 'duodenum',
        legendKey: 'neighbour',
        tags: ['neighbour'],
      },
    ],
  ]);
}

export const BILIARY_ANATOMY_META = Object.freeze({
  id: 'biliary-anatomy',
  status: 'alpha',
  title: 'Interactive biliary anatomy',
  titleJa: '触れて学ぶ胆道の解剖',
  subtitle: 'Point to identify; click or tap to pin the gallbladder or one of the bile ducts',
  subtitleJa: '触れて部位を確認・クリック／タップで胆嚢・各胆管を固定',
  inspection: { background: 'studio' },
  palette: {
    gallbladder: BILIARY_SCENE_COLORS['gallbladder-body'],
    duct: BILIARY_SCENE_COLORS['common-bile-duct'],
    neighbour: BILIARY_SCENE_COLORS.duodenum,
  },
  legend: [
    { key: 'gallbladder', label: 'Gallbladder', labelJa: '胆嚢' },
    { key: 'duct', label: 'Bile and pancreatic ducts', labelJa: '胆管・膵管' },
    { key: 'neighbour', label: 'Duodenum and pancreatic head', labelJa: '十二指腸・膵頭部' },
  ],
  stages: [
    {
      id: 'tree',
      name: 'The tree, end to end',
      nameJa: '胆道全体',
      at: 0,
      summary: 'Two hepatic ducts meet, the cystic duct joins, and the common bile duct reaches the duodenum.',
      summaryJa: '左右の肝管が合流し、胆嚢管が加わり、総胆管が十二指腸に達します。',
    },
    {
      id: 'outlet',
      name: 'Where both ducts open',
      nameJa: '2つの管が開く場所',
      at: 1,
      summary:
        'The duodenum and the pancreatic head fade: the common bile duct comes down behind them and meets the main pancreatic duct at the same papilla.',
      summaryJa:
        '十二指腸と膵頭部を薄くすると、その背側を下ってきた総胆管が、主膵管と同じ乳頭で合流しているのが見えます。',
    },
  ],
  range: { start: 'Whole tree', startJa: '胆道全体', end: 'The outlet', endJa: '出口' },
  progressLabel: { label: 'Duodenum and pancreatic head', labelJa: '十二指腸・膵頭部の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Calibres, lengths and angles are drawn to be legible and none is a measurement. What is claimed is the order of the junctions. The liver is not drawn; the spiral valve, the sphincter of Oddi, Hartmann’s pouch and the minor papilla are not modelled, and the well-known variations in cystic and hepatic duct anatomy are drawn one way only.',
  disclaimerJa:
    '教育用肉眼解剖モデル：口径・長さ・角度は見やすさのために描いたもので、いずれも実測値ではありません。主張しているのは合流の順序です。肝臓は描いていません。らせんヒダ・Oddi括約筋・ハルトマン嚢・小十二指腸乳頭は表現しておらず、胆嚢管や肝管の走行の個人差も1通りでのみ描いています。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
