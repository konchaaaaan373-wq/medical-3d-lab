/**
 * What the adrenal anatomy scene says, in both languages.
 *
 * The geometry is `scenes/endocrine/organs/adrenalAnatomy.js`. Two things carry
 * the copy, and both are limits as much as they are claims:
 *
 * 1. **The order of the zones is the claim; their thickness is not.** Salt,
 *    sugar, sex, then catecholamines, from the capsule inwards. In life the
 *    cortex is about nine tenths of the gland and the glomerulosa is a thin rim
 *    inside its capsule — drawn to scale, three zones are three lines.
 * 2. **The two glands are shaped differently on purpose.** The right is
 *    pyramidal and caps its kidney; the left is crescentic and leans on the
 *    medial border of its own.
 */

export const ADRENAL_SCENE_COLORS = Object.freeze({
  'zona-glomerulosa': '#e8c88a',
  'zona-fasciculata': '#d8a860',
  'zona-reticularis': '#c08a4a',
  'adrenal-medulla': '#8f4fd6',
  kidney: '#a8565c',
});

export const ADRENAL_NATURAL_COLORS = Object.freeze({
  'zona-glomerulosa': '#dcc49a',
  'zona-fasciculata': '#dcc49a',
  'zona-reticularis': '#c9a884',
  'adrenal-medulla': '#9a6a86',
  kidney: '#a8565c',
});

export const ADRENAL_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Zones', labelJa: '層別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SIDES = Object.freeze([
  { side: 'right', en: 'Right', ja: '右' },
  { side: 'left', en: 'Left', ja: '左' },
]);

const ZONES = Object.freeze([
  {
    id: 'zona-glomerulosa',
    en: 'zona glomerulosa',
    ja: '球状層',
    description:
      'The outermost zone, just inside the capsule. It makes aldosterone, which acts on the kidney to hold on to sodium — so this is the layer that has anything to do with blood pressure and potassium.',
    descriptionJa:
      '被膜のすぐ内側にある最外層です。アルドステロンを産生し、腎臓に作用してナトリウムを保持させます。血圧とカリウムに関わるのはこの層です。',
  },
  {
    id: 'zona-fasciculata',
    en: 'zona fasciculata',
    ja: '束状層',
    description:
      'The thickest zone in life, and the one that makes cortisol. It is the layer that responds to ACTH from the pituitary.',
    descriptionJa:
      '実際には最も厚い層で、コルチゾールを産生します。下垂体からのACTHに反応するのはこの層です。',
  },
  {
    id: 'zona-reticularis',
    en: 'zona reticularis',
    ja: '網状層',
    description:
      'The innermost cortical zone, against the medulla. It makes adrenal androgens.',
    descriptionJa:
      '髄質に接する最内層の皮質です。副腎アンドロゲンを産生します。',
  },
]);

export function adrenalStructureCopy() {
  const entries = [];

  for (const { side, en, ja } of SIDES) {
    for (const zone of ZONES) {
      entries.push([
        `${side}-${zone.id}`,
        {
          name: `${en} ${zone.en}`,
          nameJa: `${ja}副腎・${zone.ja}`,
          hierarchy: [`${en} adrenal gland`, 'Cortex', zone.en],
          hierarchyJa: [`${ja}副腎`, '皮質', zone.ja],
          description: zone.description,
          descriptionJa: zone.descriptionJa,
          note: 'The order of the zones is the claim; the thickness is not. In life the cortex is about nine tenths of the gland and the glomerulosa is a thin rim inside its capsule — drawn to scale, three zones would be three lines.',
          noteJa:
            '主張しているのは3層の順序であって、厚さではありません。実際には皮質が副腎の約9割を占め、球状層は被膜のすぐ内側の薄い縁です。実際の比で描くと3層は3本の線になってしまいます。',
          colorKey: zone.id,
          legendKey: 'cortex',
          tags: ['cortex'],
        },
      ]);
    }

    entries.push([
      `${side}-adrenal-medulla`,
      {
        name: `${en} adrenal medulla`,
        nameJa: `${ja}副腎髄質`,
        hierarchy: [`${en} adrenal gland`, 'Medulla', 'Medulla'],
        hierarchyJa: [`${ja}副腎`, '髄質', '髄質'],
        description:
          'Not cortex at all: it is sympathetic nervous tissue that ended up inside an endocrine gland, and it releases adrenaline directly into the blood. One organ, two entirely different tissues with two entirely different time courses.',
        descriptionJa:
          '皮質とは全く別の組織です。内分泌腺の内部に取り込まれた交感神経系の組織であり、アドレナリンを直接血中に放出します。1つの臓器のなかに、時間経過の異なる2つの別々の組織があります。',
        note: 'Drawn thicker than it is, for the same reason the zones are. Its chromaffin cells and the nerve supply that drives them are not drawn.',
        noteJa:
          '各層と同じ理由で、実際より厚く描いています。クロム親和性細胞や、それを駆動する神経支配は描いていません。',
        colorKey: 'adrenal-medulla',
        legendKey: 'medulla',
        tags: ['medulla'],
      },
    ]);

    entries.push([
      `${side}-kidney`,
      {
        name: `${en} kidney`,
        nameJa: `${ja}腎臓`,
        hierarchy: ['Neighbours', 'Kidney', `${en} kidney`],
        hierarchyJa: ['周囲の臓器', '腎臓', `${ja}腎`],
        description:
          side === 'right'
            ? 'The right gland sits as a cap on the upper pole of this kidney, which is why it is pyramidal.'
            : 'The left gland leans on the medial border of this kidney rather than capping it, which is why it is crescentic rather than pyramidal.',
        descriptionJa:
          side === 'right'
            ? '右副腎はこの腎臓の上極に帽子のように乗っており、そのため三角錐状の形をしています。'
            : '左副腎はこの腎臓の上極に乗るというより内側縁に沿っており、そのため三角錐ではなく半月状の形をしています。',
        note: 'Context only: the kidney at its own scale, with its own parts, is `kidney-anatomy`.',
        noteJa: '位置関係を示すためだけの表示です。腎臓そのものと内部構造は `kidney-anatomy` にあります。',
        colorKey: 'kidney',
        legendKey: 'neighbour',
        tags: ['neighbour'],
      },
    ]);
  }

  return new Map(entries);
}

export const ADRENAL_ANATOMY_META = Object.freeze({
  id: 'adrenal-anatomy',
  status: 'alpha',
  title: 'Interactive adrenal anatomy',
  titleJa: '触れて学ぶ副腎の解剖',
  subtitle: 'Point to identify; click or tap to pin a cortical zone or the medulla',
  subtitleJa: '触れて部位を確認・クリック／タップで皮質の各層・髄質を固定',
  inspection: { background: 'studio' },
  palette: {
    cortex: ADRENAL_SCENE_COLORS['zona-fasciculata'],
    medulla: ADRENAL_SCENE_COLORS['adrenal-medulla'],
    neighbour: ADRENAL_SCENE_COLORS.kidney,
  },
  legend: [
    { key: 'cortex', label: 'Three cortical zones', labelJa: '皮質の3層' },
    { key: 'medulla', label: 'Medulla', labelJa: '髄質', activeFrom: 0.4 },
    { key: 'neighbour', label: 'Kidneys', labelJa: '腎臓' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'Two glands, two shapes',
      nameJa: '2つの副腎、2つの形',
      at: 0,
      summary: 'The right gland caps its kidney and is pyramidal; the left leans on its kidney’s medial border and is crescentic.',
      summaryJa: '右副腎は腎上極に乗る三角錐状、左副腎は腎の内側縁に沿う半月状です。',
    },
    {
      id: 'zones',
      name: 'Four layers, from the capsule in',
      nameJa: '被膜から内側への4層',
      at: 1,
      summary:
        'The cortex becomes translucent: glomerulosa, fasciculata and reticularis, and inside them nervous tissue that is not cortex at all.',
      summaryJa:
        '皮質を半透明にすると、球状層・束状層・網状層が現れ、その内側に皮質とは全く別の神経系組織があります。',
    },
  ],
  range: { start: 'Outside', startJa: '外形', end: 'The layers', endJa: '層構造' },
  progressLabel: { label: 'Cortex transparency', labelJa: '皮質の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Shape is schematic and no dimension is measured. **The zone thicknesses are drawn so three zones can be told apart, not to scale**: in life the cortex is about nine tenths of the gland and the glomerulosa is a thin rim. No capsule, vessel or nerve is drawn, and nothing is secreted or solved here.',
  disclaimerJa:
    '教育用肉眼解剖モデル：形状は模式的で、いずれの寸法も実測値ではありません。**各層の厚さは3層を見分けられるように描いたもので、実際の比ではありません**——実際には皮質が副腎の約9割を占め、球状層は薄い縁です。被膜・血管・神経は描いておらず、分泌や計算も行っていません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
