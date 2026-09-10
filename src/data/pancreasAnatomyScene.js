/**
 * What the pancreas anatomy scene says, in both languages.
 *
 * The gland is `organs/pancreas.js` and the division into head, neck, body and
 * tail is `organs/pancreasParts.js`. The copy is careful about one thing above
 * all: **the islets say that endocrine tissue is scattered through an exocrine
 * gland, and nothing more.** Fourteen spheres are not a count of anything, and
 * their size is chosen so they can be seen.
 *
 * The gallbladder and the biliary tree are not here. The gallbladder is part of
 * `liver-anatomy`, where it hangs in its fossa on the organ it belongs to, and
 * no bile duct is modelled anywhere in this repository yet.
 */

export const PANCREAS_SCENE_COLORS = Object.freeze({
  head: '#e6b184',
  neck: '#cf9b74',
  body: '#e5bc95',
  tail: '#d3a276',
  duct: '#57bda4',
  islets: '#5f96e8',
  duodenum: '#d99a7c',
});

export const PANCREAS_NATURAL_COLORS = Object.freeze({
  head: '#deb18c',
  neck: '#deb18c',
  body: '#deb18c',
  tail: '#deb18c',
  duct: '#b7c8c1',
  islets: '#c9a98c',
  duodenum: '#d0947f',
});

export const PANCREAS_COLOR_MODES = Object.freeze([
  { id: 'parts', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const part = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
  id,
  {
    name,
    nameJa,
    hierarchy: ['Pancreas', 'Gland', 'Part'],
    hierarchyJa: ['膵臓', '膵実質', '部位'],
    description,
    descriptionJa,
    note,
    noteJa,
    colorKey: id,
    legendKey: 'gland',
    tags: ['gland'],
  },
];

export function pancreasStructureCopy() {
  return new Map([
    part(
      'head',
      'Head',
      '膵頭部',
      'The bulkiest part, sitting inside the C of the duodenum — which is why a mass here obstructs the bile duct and the duodenum before it does anything else.',
      '最も厚みのある部分で、十二指腸のC字の内側に収まります。ここの腫瘤がまず胆管と十二指腸を圧迫するのはこのためです。',
      'No uncinate process and no common bile duct running through it are modelled.',
      '鉤状突起や、膵頭部を貫く総胆管は表現していません。'
    ),
    part(
      'neck',
      'Neck',
      '膵頸部',
      'The narrow waist between head and body, lying in front of the superior mesenteric and portal veins — which are not drawn here.',
      '膵頭部と膵体部の間のくびれた部分で、上腸間膜静脈・門脈の腹側にあたります（これらの血管はここでは描いていません）。'
    ),
    part(
      'body',
      'Body',
      '膵体部',
      'The long stretch running to the left and slightly backwards, across the front of the aorta and the left kidney.',
      '左方やや背側へ向かう長い部分で、大動脈と左腎の腹側を横切ります。'
    ),
    part(
      'tail',
      'Tail',
      '膵尾部',
      'Thins to a point as it reaches towards the hilum of the spleen. It is the only part of the pancreas with a mesentery, and the part a splenectomy is nearest to.',
      '脾門に向かって先細りになります。膵臓で唯一腸間膜を持つ部分であり、脾摘の際に最も近接する部分です。'
    ),
    [
      'pancreatic-duct',
      {
        name: 'Main pancreatic duct',
        nameJa: '主膵管',
        hierarchy: ['Pancreas', 'Duct', 'Duct'],
        hierarchyJa: ['膵臓', '膵管', '膵管'],
        description:
          'Runs the length of the gland from the tail to the head, gathering what the exocrine tissue makes. Everything the gland secretes leaves this way.',
        descriptionJa:
          '膵尾部から膵頭部まで膵実質を貫いて走り、外分泌液を集めます。膵液はすべてこの経路を通って出ていきます。',
        note: 'A single tube of constant calibre. No side branches, no accessory duct, and no ampulla where it opens.',
        noteJa: '一定の口径の1本の管として描いています。側枝・副膵管・開口部の乳頭は表現していません。',
        colorKey: 'duct',
        legendKey: 'duct',
        tags: ['duct'],
      },
    ],
    [
      'islets',
      {
        name: 'Pancreatic islets',
        nameJa: '膵島（ランゲルハンス島）',
        hierarchy: ['Pancreas', 'Endocrine tissue', 'Islets'],
        hierarchyJa: ['膵臓', '内分泌組織', '膵島'],
        description:
          'Endocrine tissue scattered through an exocrine gland: what they make — insulin, glucagon — leaves in the blood rather than down the duct beside them.',
        descriptionJa:
          '外分泌腺の中に散在する内分泌組織です。インスリンやグルカゴンは、隣の膵管ではなく血流へ分泌されます。',
        note: 'The arrangement is the claim, not the count or the size. Fourteen spheres placed from a fixed seed stand for around a million islets, which together are one or two per cent of the gland.',
        noteJa:
          '主張しているのは「散在している」という配置だけで、数や大きさではありません。固定した乱数で配置した14個の球は、実際には約100万個・膵重量の1〜2%にあたる膵島を象徴しています。',
        colorKey: 'islets',
        legendKey: 'islets',
        tags: ['islets'],
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
          'The C-shaped loop the pancreatic head sits inside. It is here because that relationship is most of what the head’s position means.',
        descriptionJa:
          '膵頭部が収まるC字型のループです。膵頭部の位置関係を示すうえで欠かせないため、ここに表示しています。',
        note: 'Context only: one tube of constant calibre, with no papilla where the duct would open into it.',
        noteJa: '位置関係を示すためだけの表示です。一定の口径の管で、膵管が開口する乳頭部も描いていません。',
        colorKey: 'duodenum',
        legendKey: 'duodenum',
        tags: ['neighbour'],
      },
    ],
  ]);
}

export const PANCREAS_ANATOMY_META = Object.freeze({
  id: 'pancreas-anatomy',
  status: 'alpha',
  title: 'Interactive pancreatic anatomy',
  titleJa: '触れて学ぶ膵臓の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the gland, its duct or its islets',
  subtitleJa: '触れて部位を確認・クリック／タップで膵実質・膵管・膵島を固定',
  inspection: { background: 'studio' },
  palette: {
    gland: PANCREAS_SCENE_COLORS.body,
    duct: PANCREAS_SCENE_COLORS.duct,
    islets: PANCREAS_SCENE_COLORS.islets,
    duodenum: PANCREAS_SCENE_COLORS.duodenum,
  },
  legend: [
    { key: 'gland', label: 'Head, neck, body, tail', labelJa: '頭部・頸部・体部・尾部' },
    { key: 'duct', label: 'Main pancreatic duct', labelJa: '主膵管', activeFrom: 0.4 },
    { key: 'islets', label: 'Islets', labelJa: '膵島', activeFrom: 0.4 },
    { key: 'duodenum', label: 'Duodenum', labelJa: '十二指腸' },
  ],
  stages: [
    {
      id: 'gland',
      name: 'The gland from outside',
      nameJa: '外側から見た膵臓',
      at: 0,
      summary: 'Head, neck, body and tail, and the duodenal C the head sits inside.',
      summaryJa: '膵頭部・頸部・体部・尾部と、膵頭部が収まる十二指腸のCループです。',
    },
    {
      id: 'inside',
      name: 'Duct and islets',
      nameJa: '膵管と膵島',
      at: 1,
      summary: 'The gland becomes translucent: one duct running its whole length, and endocrine tissue scattered through the exocrine.',
      summaryJa: '膵実質を半透明にすると、全長を走る1本の膵管と、外分泌組織の中に散在する内分泌組織が見えます。',
    },
  ],
  range: { start: 'Gland', startJa: '膵実質', end: 'Duct and islets', endJa: '膵管と膵島' },
  progressLabel: { label: 'Gland transparency', labelJa: '膵実質の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Islet number and size are illustrative, no uncinate process, accessory duct, bile duct or papilla is modelled, and nothing here is a measurement.',
  disclaimerJa:
    '教育用肉眼解剖モデル：膵島の数と大きさは図式的です。鉤状突起・副膵管・総胆管・乳頭部は表現しておらず、いずれの寸法も実測値ではありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
