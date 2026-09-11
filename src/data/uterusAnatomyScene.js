/**
 * What the uterus anatomy scene says, in both languages.
 *
 * The geometry is `scenes/reproductive/organs/uterusParts.js`. Two limits are
 * repeated where a reader is looking at the thing they apply to, because both
 * are departures a diagram normally makes silently:
 *
 * 1. **The organ is drawn upright.** A uterus is normally anteverted and
 *    anteflexed; drawn straight up, "above" and "below" are unambiguous, which
 *    is what a scene about which part is which needs.
 * 2. **The cavity is a region, not a bag.** It is drawn as a flat triangle with
 *    no thickness, because a flattened slit is what it is.
 */

export const UTERUS_SCENE_COLORS = Object.freeze({
  fundus: '#d193a6',
  body: '#c07f95',
  isthmus: '#a96b81',
  cervix: '#8f566c',
  'uterine-cavity': '#e8b06a',
  'cervical-canal': '#e0a45f',
  'right-fallopian-tube': '#d9a0ad',
  'left-fallopian-tube': '#d9a0ad',
  'right-ovary': '#e0cdb4',
  'left-ovary': '#e0cdb4',
  vagina: '#c9909b',
});

export const UTERUS_NATURAL_COLORS = Object.freeze({
  fundus: '#c08a9c',
  body: '#c08a9c',
  isthmus: '#c08a9c',
  cervix: '#b47f92',
  'uterine-cavity': '#d8a888',
  'cervical-canal': '#d8a888',
  'right-fallopian-tube': '#cc99a6',
  'left-fallopian-tube': '#cc99a6',
  'right-ovary': '#dccbb6',
  'left-ovary': '#dccbb6',
  vagina: '#c2929c',
});

export const UTERUS_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function uterusStructureCopy() {
  const wall = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Uterus', 'Wall', name],
      hierarchyJa: ['子宮', '子宮壁', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'wall',
      tags: ['wall'],
    },
  ];

  const inside = (id, name, nameJa, description, descriptionJa, note, noteJa) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Inside the uterus', 'Cavity', name],
      hierarchyJa: ['子宮の内腔', '内腔', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'inside',
      tags: ['inside'],
    },
  ];

  const adnexa = (id, name, nameJa, description, descriptionJa, note, noteJa) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Adnexa', name, name],
      hierarchyJa: ['子宮付属器', nameJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'adnexa',
      tags: ['adnexa'],
    },
  ];

  return new Map([
    wall(
      'fundus',
      'Fundus',
      '子宮底',
      'The dome above the level where the tubes come in. It is the part a hand feels above the pubic bone when the uterus is enlarged.',
      '卵管が入る高さより上のドーム状の部分です。子宮が増大したときに恥骨上で触れるのはこの部分です。'
    ),
    wall(
      'body',
      'Body',
      '子宮体部',
      'The thick-walled main part. Almost all of the wall is muscle, and it is the muscle that both holds a pregnancy and ends one.',
      '壁の厚い主要部分です。壁のほとんどが筋層で、妊娠を維持するのも、分娩で終わらせるのも同じ筋層です。',
      'The wall is drawn as one tissue. Endometrium, myometrium and perimetrium are not separated here; the lining that thickens and sheds is `uterine-cycle`.',
      '壁は1つの組織として描いています。内膜・筋層・漿膜は分けていません。周期的に厚くなり脱落する内膜は `uterine-cycle` にあります。'
    ),
    wall(
      'isthmus',
      'Isthmus',
      '子宮峡部',
      'The short waist between body and cervix. In pregnancy it becomes the lower segment — the part a caesarean section is made through.',
      '子宮体部と頸部の間の短いくびれです。妊娠時にはここが子宮下節となり、帝王切開の切開部位になります。'
    ),
    wall(
      'cervix',
      'Cervix',
      '子宮頸部',
      'The lower, firmer part that projects into the vagina. It is the part that is examined and sampled, and the canal through it is the way in and the way out.',
      '腟内に突出する、下方の硬い部分です。診察と細胞診の対象となる部分であり、その中の頸管が出入口になります。',
      'The portio and the transformation zone — where a smear is actually taken from — are not drawn as their own structures.',
      '腟部と、実際に細胞診が行われる移行帯は、独立した構造としては描いていません。'
    ),
    inside(
      'uterine-cavity',
      'Uterine cavity',
      '子宮腔',
      'A flattened triangle, not a bag: its two upper corners are where the tubes open in and its lower corner is where the cervical canal starts. That shape is what an intrauterine device sits in and what a hysterosalpingogram outlines.',
      '袋ではなく、扁平な三角形の空間です。上2角に卵管が開口し、下角から頸管が始まります。子宮内避妊具が収まるのも、子宮卵管造影で描出されるのも、この形です。',
      'Drawn as a flat patch with no thickness, because a slit is what it is. The endometrium lining it is not drawn as tissue here.',
      '厚みのない面として描いています。実際にすき間状の空間だからです。これを覆う子宮内膜は、ここでは組織としては描いていません。'
    ),
    inside(
      'cervical-canal',
      'Cervical canal',
      '子宮頸管',
      'Runs from the internal os at the cavity’s lower corner to the external os in the vagina. It is the only route between the uterus and the outside.',
      '子宮腔の下角にある内子宮口から、腟内の外子宮口まで続きます。子宮と外界を結ぶ唯一の経路です。',
      'Drawn as a tube of constant calibre. The plicae palmatae and the mucus plug are not modelled.',
      '口径一定の管として描いています。頸管ヒダや頸管粘液栓は表現していません。'
    ),
    adnexa(
      'right-fallopian-tube',
      'Right fallopian tube',
      '右卵管',
      'Narrow where it leaves the uterus, wide in the middle, and open at the far end. Fertilisation happens in the wide part, and so does an ectopic pregnancy.',
      '子宮から出る部分は細く、中央部で太くなり、末端は開放しています。受精が起こるのはこの太い部分であり、子宮外妊娠が生じるのも同じ場所です。',
      'Drawn as one structure with a changing calibre. Its named lengths — interstitial, isthmus, ampulla, infundibulum — and the fimbriae are not separately selectable.',
      '口径が変化する1つの構造として描いています。間質部・峡部・膨大部・漏斗部という区分や采は、個別には選べません。'
    ),
    adnexa(
      'left-fallopian-tube',
      'Left fallopian tube',
      '左卵管',
      'The same on the patient’s left.',
      '患者左側の同じ卵管です。',
      'Drawn as one structure with a changing calibre, as on the other side.',
      '反対側と同様、口径が変化する1つの構造として描いています。'
    ),
    adnexa(
      'right-ovary',
      'Right ovary',
      '右卵巣',
      'Sits near the open end of the tube but is **not joined to it**. An egg crosses a gap to get into the tube, and that gap is why an egg can end up outside it.',
      '卵管の開放端の近くにありますが、**卵管とはつながっていません**。卵子はすき間を越えて卵管に入ります。卵子が卵管の外に出うるのは、このすき間があるためです。',
      'Follicles, corpora lutea and the ovarian ligaments are not drawn. The cycle is `uterine-cycle`.',
      '卵胞・黄体・卵巣の各靱帯は描いていません。周期は `uterine-cycle` にあります。'
    ),
    adnexa(
      'left-ovary',
      'Left ovary',
      '左卵巣',
      'The same on the patient’s left, also separate from its tube.',
      '患者左側の同じ卵巣で、こちらも卵管とは離れています。',
      'Follicles, corpora lutea and the ovarian ligaments are not drawn.',
      '卵胞・黄体・卵巣の各靱帯は描いていません。'
    ),
    [
      'vagina',
      {
        name: 'Vagina',
        nameJa: '腟',
        hierarchy: ['Neighbours', 'Vagina', 'Vagina'],
        hierarchyJa: ['周囲の構造', '腟', '腟'],
        description:
          'The cuff the cervix projects into. It is drawn so that the lower end of the cervical canal is an opening into somewhere rather than a stump.',
        descriptionJa:
          '子宮頸部が突出している部分です。頸管の下端が「切り株」ではなく「どこかへの開口」として読めるように描いています。',
        note: 'Context only: a short cuff, with no fornices, wall layers or rugae.',
        noteJa: '位置関係を示すためだけの表示です。腟円蓋・壁の層構造・腟ヒダは描いていません。',
        colorKey: 'vagina',
        legendKey: 'neighbour',
        tags: ['neighbour'],
      },
    ],
  ]);
}

export const UTERUS_ANATOMY_META = Object.freeze({
  id: 'uterus-anatomy',
  status: 'alpha',
  title: 'Interactive uterine anatomy',
  titleJa: '触れて学ぶ子宮の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the uterus, the cavity, a tube or an ovary',
  subtitleJa: '触れて部位を確認・クリック／タップで子宮の部位・子宮腔・卵管・卵巣を固定',
  inspection: { background: 'studio' },
  palette: {
    wall: UTERUS_SCENE_COLORS.body,
    inside: UTERUS_SCENE_COLORS['uterine-cavity'],
    adnexa: UTERUS_SCENE_COLORS['right-fallopian-tube'],
    neighbour: UTERUS_SCENE_COLORS.vagina,
  },
  legend: [
    { key: 'wall', label: 'Fundus, body, isthmus, cervix', labelJa: '子宮底・体部・峡部・頸部' },
    { key: 'inside', label: 'Cavity and cervical canal', labelJa: '子宮腔・頸管', activeFrom: 0.35 },
    { key: 'adnexa', label: 'Tubes and ovaries', labelJa: '卵管・卵巣' },
    { key: 'neighbour', label: 'Vagina', labelJa: '腟' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'The organ and what is beside it',
      nameJa: '子宮と付属器',
      at: 0,
      summary: 'Fundus, body, isthmus and cervix, with a tube on each side reaching towards — but not touching — an ovary.',
      summaryJa: '子宮底・体部・峡部・頸部と、左右の卵管、そして卵管が触れずに向かい合う卵巣です。',
    },
    {
      id: 'cavity',
      name: 'The cavity inside',
      nameJa: '内腔',
      at: 1,
      summary:
        'The wall becomes translucent: a flattened triangle with a tube opening at each upper corner and the cervical canal leaving the lower one.',
      summaryJa:
        '子宮壁を半透明にすると、扁平な三角形の内腔が現れます。上2角に卵管が開口し、下角から頸管が出ていきます。',
    },
  ],
  range: { start: 'Outside', startJa: '外形', end: 'The cavity', endJa: '内腔' },
  progressLabel: { label: 'Wall transparency', labelJa: '子宮壁の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Shape is schematic and no dimension is measured. The uterus is drawn **upright**, not anteverted and anteflexed as it usually lies. The cavity is a flat patch with no thickness; endometrium, myometrium and perimetrium are not separated; follicles, ligaments, fornices, the transformation zone and the vessels are not drawn, and nothing here changes with the cycle.',
  disclaimerJa:
    '教育用肉眼解剖モデル：形状は模式的で、いずれの寸法も実測値ではありません。子宮は通常の前傾前屈位ではなく、**直立位**で描いています。子宮腔は厚みのない面として描いており、内膜・筋層・漿膜は分けていません。卵胞・靱帯・腟円蓋・移行帯・血管は描いておらず、周期による変化も表現していません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
