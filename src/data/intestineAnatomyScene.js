/**
 * What the intestine anatomy scene says, in both languages.
 *
 * The frame is `organs/intestine.js` and the division into named parts is
 * `organs/colonParts.js`. Two things this copy is careful about, because the
 * model is:
 *
 * - **The small bowel is one structure here.** Jejunum and ileum differ in
 *   wall, calibre and mesentery, and there is no line where one becomes the
 *   other — nothing in this coil marks a boundary, so the scene does not offer
 *   one to select.
 * - **A flexure is a bend.** The two colic flexures are selectable so a reader
 *   can point at the corner; they are drawn as the short lengths of tube at
 *   those corners and are not segments of colon in their own right.
 */

export const INTESTINE_SCENE_COLORS = Object.freeze({
  caecum: '#c98f6f',
  'ascending-colon': '#c58a72',
  'right-colic-flexure': '#a9705f',
  'transverse-colon': '#d69a78',
  'left-colic-flexure': '#a9705f',
  'descending-colon': '#bd8270',
  'sigmoid-colon': '#a97060',
  'small-intestine': '#d9a98c',
  duodenum: '#d99a7c',
});

export const INTESTINE_NATURAL_COLORS = Object.freeze({
  caecum: '#c58a72',
  'ascending-colon': '#c58a72',
  'right-colic-flexure': '#c58a72',
  'transverse-colon': '#c58a72',
  'left-colic-flexure': '#c58a72',
  'descending-colon': '#c58a72',
  'sigmoid-colon': '#c58a72',
  'small-intestine': '#d99a7c',
  duodenum: '#d99a7c',
});

export const INTESTINE_COLOR_MODES = Object.freeze([
  { id: 'parts', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const colon = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
  id,
  {
    name,
    nameJa,
    hierarchy: ['Large intestine', 'Colon', 'Part'],
    hierarchyJa: ['大腸', '結腸', '部位'],
    description,
    descriptionJa,
    note,
    noteJa,
    colorKey: id,
    legendKey: 'colon',
    tags: ['colon'],
  },
];

export function intestineStructureCopy() {
  return new Map([
    colon(
      'caecum',
      'Caecum',
      '盲腸',
      'The blind pouch the large intestine begins as, below the level of the ileocaecal opening.',
      '回盲部の開口より下にある、大腸の始まりの盲端です。',
      'Where it ends is schematic: no ileum is drawn arriving, so there is nothing here to measure the junction from. No appendix is modelled.',
      '終端の位置は模式的です。回腸が到達する様子を描いていないため、接合部を測る手がかりがモデル内にありません。虫垂も表現していません。'
    ),
    colon(
      'ascending-colon',
      'Ascending colon',
      '上行結腸',
      'Runs up the right side of the abdomen — screen left, because this is a frontal view — from the caecum to the right colic flexure.',
      '腹部の右側（前面から見た図なので画面では左）を、盲腸から右結腸曲まで上行します。'
    ),
    colon(
      'right-colic-flexure',
      'Right colic (hepatic) flexure',
      '右結腸曲（肝弯曲）',
      'The bend under the liver where the colon turns from running upwards to running across.',
      '肝臓の下で、上行から横行へと向きを変える屈曲部です。',
      'Drawn as the short length of tube at the corner. A flexure is a bend, not a segment of bowel.',
      '屈曲部の短い管として描いています。結腸曲は屈曲であり、独立した腸管の区分ではありません。'
    ),
    colon(
      'transverse-colon',
      'Transverse colon',
      '横行結腸',
      'The longest single run, crossing the abdomen between the two flexures. It is the mobile part, slung on its own mesentery.',
      '2つの結腸曲の間を横切る、最も長い1本の走行部分です。固有の腸間膜に吊られた可動性の部分です。'
    ),
    colon(
      'left-colic-flexure',
      'Left colic (splenic) flexure',
      '左結腸曲（脾弯曲）',
      'The bend beside the spleen, higher and sharper than the right, where the colon turns downwards.',
      '脾臓の傍らにある屈曲部で、右結腸曲より高位で鋭角です。ここで結腸は下行に転じます。',
      'Drawn as the short length of tube at the corner.',
      '屈曲部の短い管として描いています。'
    ),
    colon(
      'descending-colon',
      'Descending colon',
      '下行結腸',
      'Runs down the left side of the abdomen to the brim of the pelvis, where it becomes the sigmoid.',
      '腹部の左側を骨盤の入口まで下行し、そこでS状結腸に移行します。'
    ),
    colon(
      'sigmoid-colon',
      'Sigmoid colon',
      'S状結腸',
      'The S-shaped last stretch, on a mesentery of its own — which is what lets it twist, and what a volvulus is.',
      '固有の腸間膜を持つ、S字状の最後の部分です。この可動性が捻転（volvulus）を起こしうる理由です。',
      'The path stops here: no rectum and no anal canal are modelled.',
      'モデルはここまでです。直腸・肛門管は表現していません。'
    ),
    [
      'small-intestine',
      {
        name: 'Small intestine (jejunum and ileum)',
        nameJa: '小腸（空腸・回腸）',
        hierarchy: ['Small intestine', 'Jejunum and ileum', 'Small bowel'],
        hierarchyJa: ['小腸', '空腸・回腸', '小腸'],
        description:
          'The folded coil that fills the middle of the abdomen, inside the frame the colon makes around it.',
        descriptionJa:
          '結腸が周囲に作る枠の内側で、腹部の中央を満たす折り畳まれた腸管です。',
        note: 'One structure, deliberately: jejunum and ileum differ gradually and there is no boundary in this model to select. Loop count, length and arrangement are illustrative.',
        noteJa:
          'あえて1つの構造として扱っています。空腸と回腸は連続的に移行し、このモデルには選択できる境界がありません。ループの数・長さ・配置は図式的です。',
        colorKey: 'small-intestine',
        legendKey: 'small',
        tags: ['small-bowel'],
      },
    ],
    [
      'duodenum',
      {
        name: 'Duodenum',
        nameJa: '十二指腸',
        hierarchy: ['Small intestine', 'Duodenum', 'Duodenum'],
        hierarchyJa: ['小腸', '十二指腸', '十二指腸'],
        description:
          'The C-shaped first part of the small intestine, taking what the stomach empties. Shown here for where it sits relative to the rest of the bowel.',
        descriptionJa:
          '胃からの排出を受ける、C字型の小腸最初の部分です。ここでは他の腸管との位置関係を示すために表示しています。',
        note: 'One tube of constant calibre: the four parts and the papilla are not modelled.',
        noteJa: '一定の口径の1本の管です。十二指腸の4部・乳頭部は表現していません。',
        colorKey: 'duodenum',
        legendKey: 'small',
        tags: ['small-bowel'],
      },
    ],
  ]);
}

export const INTESTINE_ANATOMY_META = Object.freeze({
  id: 'intestine-anatomy',
  status: 'alpha',
  title: 'Interactive intestinal anatomy',
  titleJa: '触れて学ぶ腸の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the colon',
  subtitleJa: '触れて部位を確認・クリック／タップで結腸の部位を固定',
  inspection: { background: 'studio' },
  palette: {
    colon: INTESTINE_SCENE_COLORS['transverse-colon'],
    flexure: INTESTINE_SCENE_COLORS['right-colic-flexure'],
    small: INTESTINE_SCENE_COLORS['small-intestine'],
  },
  legend: [
    { key: 'colon', label: 'Colon', labelJa: '結腸' },
    { key: 'flexure', label: 'Colic flexures', labelJa: '結腸曲' },
    { key: 'small', label: 'Small intestine', labelJa: '小腸' },
  ],
  stages: [
    {
      id: 'whole',
      name: 'Bowel in place',
      nameJa: '腸管の全体',
      at: 0,
      summary: 'The small bowel fills the middle; the colon frames it. Pick any part of either.',
      summaryJa: '中央を小腸が満たし、その周囲を結腸が枠のように取り囲みます。どちらの部位も選択できます。',
    },
    {
      id: 'frame',
      name: 'The colonic frame',
      nameJa: '結腸の枠',
      at: 1,
      summary: 'The small bowel steps back and the colon is left as the frame it is: caecum, up, across, down, sigmoid.',
      summaryJa: '小腸を薄くすると、結腸が枠として残ります。盲腸から上行・横行・下行・S状結腸へと続く経路です。',
    },
  ],
  range: { start: 'Bowel in place', startJa: '腸管の全体', end: 'Colon alone', endJa: '結腸のみ' },
  progressLabel: { label: 'Small bowel transparency', labelJa: '小腸の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Lengths, loop counts and positions are illustrative; no appendix, rectum, mesentery or wall layers are modelled.',
  disclaimerJa:
    '教育用肉眼解剖モデル：長さ・ループ数・位置は図式的です。虫垂・直腸・腸間膜・壁の層構造は表現していません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
