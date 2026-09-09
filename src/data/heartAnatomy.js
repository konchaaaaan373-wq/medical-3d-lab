/**
 * The heart candidate's parts, as the source names them.
 *
 * Every row here comes from the file: the node name it is keyed by, the label
 * and the ontology id are read out of the GLB's own `extras`, and the counts and
 * relationships in the comments were measured rather than assumed
 * (`docs/asset-qa/heart-hubmap-vh-m-heart.md`). What this file adds is a
 * Japanese name and a place in a two-level hierarchy — nothing else, because
 * nothing else is ours to add.
 *
 * **An ontology id is a vocabulary, not an identifier for a mesh.** Two parts
 * could in principle carry the same UBERON term; the id a scene selects by is
 * the source's node name, which is unique in this file and opaque to everything
 * outside the adapter. The five papillary muscles are five structures and the
 * two atria are two, and none of them is collapsed into a shared term.
 *
 * Pure data and pure functions. No `three`, no DOM.
 */

/**
 * The anatomical axes of this model, in its own coordinates.
 *
 * Architecture rule 5: a scene says where its directions are rather than
 * leaving each reader to infer them from `+x`. These were **measured**, from
 * three relationships that cannot be the other way round in a normal heart:
 * the left atrium is to the left of the right atrium (+x is the patient's
 * left); the apex is below the valve plane (+y is superior); the right ventricle
 * is in front of the left atrium (+z is anterior).
 *
 * Note this is not the brain atlas's convention — there, +x is the patient's
 * right. Two scenes, two source files, two answers, which is exactly why each
 * one has to say.
 */
export const HEART_AXES = Object.freeze({
  left: Object.freeze([1, 0, 0]),
  superior: Object.freeze([0, 1, 0]),
  anterior: Object.freeze([0, 0, 1]),
});

/** How a part is grouped, for the tree and for the display recipes. */
export const HEART_GROUPS = Object.freeze({
  chamber: Object.freeze(['Cardiac chambers', '心腔']),
  valve: Object.freeze(['Heart valves', '心臓弁']),
  papillary: Object.freeze(['Papillary muscles', '乳頭筋']),
});

/**
 * The fourteen parts.
 *
 * `enclosedMl` is the volume of each closed surface, measured from the mesh. It
 * is recorded because it is what settles what a "chamber" mesh *is* — a left
 * ventricle enclosing 122 mL is a chamber cavity, not a cavity plus its
 * myocardium — and for no other purpose. **It is not a clinical measurement**:
 * one fixed cadaveric specimen, at whatever state it was fixed in, is not an
 * end-diastolic volume and must never be shown as one.
 */
export const HEART_PARTS = Object.freeze([
  part('VH_M_heart_left_ventricle', 'Left ventricle', '左心室', 'UBERON:0002084', 'chamber', 121.6, true),
  part('VH_M_heart_right_ventricle', 'Right ventricle', '右心室', 'UBERON:0002080', 'chamber', 74.0, true),
  part('VH_M_left_cardiac_atrium', 'Left atrium', '左心房', 'UBERON:0002079', 'chamber', 31.3, true),
  part('VH_M_right_cardiac_atrium', 'Right atrium', '右心房', 'UBERON:0002078', 'chamber', 27.7, false),
  part('VH_M_interventricular_septum', 'Interventricular septum', '心室中隔', 'UBERON:0002094', 'chamber', 28.1, true),
  part('VH_M_mitral_valve', 'Mitral valve', '僧帽弁', 'UBERON:0002135', 'valve', 3.1, true),
  part('VH_M_tricuspid_valve', 'Tricuspid valve', '三尖弁', 'UBERON:0002134', 'valve', 4.2, true),
  part('VH_M_aortic_valve', 'Aortic valve', '大動脈弁', 'UBERON:0002137', 'valve', 16.3, false),
  part('VH_M_pulmonary_valve', 'Pulmonary valve', '肺動脈弁', 'UBERON:0002146', 'valve', 1.2, true),
  part('VH_M_papillary_muscle_of_heart_anterior', 'Anterior papillary muscle of the left ventricle', '左室前乳頭筋', 'FMA:7264', 'papillary', 3.4, false),
  part('VH_M_papillary_muscle_of_heart_anterolateral', 'Anterolateral head of the lateral papillary muscle of the left ventricle', '左室外側乳頭筋・前外側頭', 'FMA:7265', 'papillary', 1.1, true),
  part('VH_M_papillary_muscle_of_heart_medial', 'Septal papillary muscle of the right ventricle', '右室中隔乳頭筋', 'FMA:7262', 'papillary', 3.2, false),
  part('VH_M_papillary_muscle_of_heart_posterior', 'Posterior papillary muscle of the right ventricle', '右室後乳頭筋', 'FMA:7261', 'papillary', 3.6, false),
  part('VH_M_papillary_muscle_of_heart_posteromedial', 'Posteromedial head of the posterior papillary muscle of the left ventricle', '左室後乳頭筋・後内側頭', 'FMA:7267', 'papillary', 1.2, true),
]);

function part(node, name, nameJa, ontologyId, group, enclosedMl, closed) {
  return Object.freeze({ id: node, node, name, nameJa, ontologyId, group, enclosedMl, closed });
}

const BY_ID = new Map(HEART_PARTS.map((entry) => [entry.id, entry]));

/** @param {string} id */
export const heartPartById = (id) => BY_ID.get(id) ?? null;

/**
 * What the scene tells the panels about one part.
 *
 * The same shape the brain adapter produces, because the panels read one shape.
 */
export function heartStructureInfo(id) {
  const entry = heartPartById(id);
  if (!entry) return null;
  const [groupEn, groupJa] = HEART_GROUPS[entry.group];
  return {
    id: entry.id,
    name: entry.name,
    nameJa: entry.nameJa,
    atlasName: entry.node,
    // Nothing in this file is paired left/right as a *structure*: a left
    // ventricle is not the mirror of a right one, and saying "Left" beside its
    // name would read as a side rather than as part of the name it already has.
    side: 'Heart',
    sideJa: '心臓',
    region: groupEn,
    regionJa: groupJa,
    category: entry.group,
    categoryName: groupEn,
    categoryNameJa: groupJa,
    ontologyId: entry.ontologyId,
    preferredView: null,
    hierarchy: ['Heart', groupEn, entry.name],
    hierarchyJa: ['心臓', groupJa, entry.nameJa],
    breadcrumb: ['Heart', groupEn].join(' › '),
    breadcrumbJa: ['心臓', groupJa].join(' › '),
    description: DESCRIPTION[entry.group].en,
    descriptionJa: DESCRIPTION[entry.group].ja,
    note: entry.closed
      ? null
      : 'This part is an open surface in the source file rather than a closed one.',
    noteJa: entry.closed
      ? null
      : '出典ファイルではこの部位は閉じていない面として収録されています。',
  };
}

/**
 * What each group *is*, said at the level the file supports.
 *
 * A chamber here is a closed surface around the chamber's space — measured, not
 * inferred from the word "chamber" — and the wording says that rather than
 * implying a myocardial wall the file does not contain.
 */
const DESCRIPTION = Object.freeze({
  chamber: Object.freeze({
    en: 'A closed surface enclosing the space of this chamber. The source file contains no separate myocardial free wall, so this is the chamber, not the muscle around it.',
    ja: 'この心腔の空間を囲む閉じた面です。出典ファイルには心筋の自由壁が別部位として収録されていないため、これは心腔であって周囲の筋ではありません。',
  }),
  valve: Object.freeze({
    en: 'A valve surface at the boundary between two chambers, or between a chamber and its outflow.',
    ja: '心腔どうし、または心腔と流出路の境界にある弁の面です。',
  }),
  papillary: Object.freeze({
    en: 'A papillary muscle, which in life anchors the chordae tendineae. The chordae are not in this file.',
    ja: '乳頭筋です。生体では腱索が付着しますが、腱索はこのファイルに収録されていません。',
  }),
});

/**
 * Two readings of the same unmoved geometry, as the brain has.
 *
 * The natural mode is the one material the source ships, varied only in
 * lightness so that adjacent parts stay apart. The parts mode gives each group
 * its own hue. **Neither encodes anything functional** — not oxygenation, not
 * pressure, not flow. Colouring a chamber by the blood it would carry is the
 * mistake `05-HEART-ACCEPTANCE.md` names, and it is not made here.
 */
export const HEART_COLOR_MODES = Object.freeze([
  Object.freeze({ id: 'parts', label: 'Parts', labelJa: '部位別' }),
  Object.freeze({ id: 'natural', label: 'Natural', labelJa: '自然色' }),
]);

/**
 * Where each group's hues sit on the wheel, and how far they spread.
 *
 * Three bands far enough apart that a chamber, a valve and a papillary muscle
 * are never mistaken for each other, and wide enough inside each band that the
 * four chambers are four colours. **Reds are left to the natural mode**: a red
 * chamber beside a blue one is the oxygenation map this scene refuses to draw,
 * so the parts mode does not use that axis at all — every chamber is in the
 * same teal band, and left and right differ the way any two parts differ.
 */
const GROUP_HUE = Object.freeze({
  chamber: Object.freeze([158, 214]),
  valve: Object.freeze([36, 62]),
  papillary: Object.freeze([288, 322]),
});

/**
 * A part's colour. Deterministic from its id, so the same part is the same
 * colour every run and nothing depends on load order.
 *
 * @param {string} id
 * @param {'parts'|'natural'} mode
 */
export function heartColor(id, mode = 'parts') {
  const entry = heartPartById(id);
  if (!entry) return '#8a5a52';
  const spread = GROUP_SPREAD.get(entry.id) ?? 0;
  if (mode === 'natural') {
    // The source's own single material, with a little lightness between parts so
    // a boundary is still a boundary. Spread across the whole table rather than
    // within a group, or a papillary muscle would come out the same colour as
    // the ventricle it sits in — which is exactly the boundary that matters.
    const place = ORDER_SPREAD.get(entry.id) ?? 0;
    return hslToHex(6, 44 + place * 8, 31 + place * 16);
  }
  const [from, to] = GROUP_HUE[entry.group];
  const hue = from + spread * (to - from);
  return hslToHex(hue, 44 + spread * 22, 42 + spread * 20);
}

/** Representative swatches for the legend. */
const midHue = (group) => (GROUP_HUE[group][0] + GROUP_HUE[group][1]) / 2;

/** Representative swatches for the legend: the middle of each group's band. */
export const HEART_PALETTE = Object.freeze({
  chamber: hslToHex(midHue('chamber'), 54, 52),
  valve: hslToHex(midHue('valve'), 54, 52),
  papillary: hslToHex(midHue('papillary'), 54, 52),
});

/**
 * Where each part sits inside its group's band, 0 to 1.
 *
 * Spread evenly by position rather than by a hash of the name. A hash is stable
 * and looked like the safer choice, and it put the four valves within four
 * degrees of hue of each other — stable and unreadable. Position is just as
 * deterministic and guarantees the separation, which is the property that was
 * actually wanted: rule "accuracy you cannot see is not accuracy" applies to
 * telling two parts apart as much as to the geometry.
 */
const ORDER_SPREAD = new Map(
  HEART_PARTS.map((entry, at) => [entry.id, at / (HEART_PARTS.length - 1)])
);

const GROUP_SPREAD = new Map(
  Object.keys(HEART_GROUPS).flatMap((group) => {
    const members = HEART_PARTS.filter((entry) => entry.group === group);
    return members.map((entry, at) => [entry.id, members.length > 1 ? at / (members.length - 1) : 0.5]);
  })
);

function hslToHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * value).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * What the scene is, for the surfaces that describe it.
 *
 * The public name is simply "heart"; what is and is not in the model belongs in
 * the model information, not in the title.
 */
export const HEART_ANATOMY_META = Object.freeze({
  id: 'heart-anatomy',
  status: 'alpha',
  title: 'Heart anatomy',
  titleJa: '心臓の解剖',
  subtitle: 'Point to identify; click or tap to pin any named part',
  subtitleJa: '触れて部位を確認・クリック／タップで固定',
  inspection: Object.freeze({ background: 'studio' }),
  /**
   * **Nothing moves, and the console says so.** `enabled: false` removes the
   * progression slider and the play button rather than leaving a control that
   * looks like it should do something. This scene has one state — a still,
   * normal heart — and a slider that changed nothing would be a promise of a
   * physiology this model does not have.
   */
  progression: Object.freeze({ enabled: false }),
  palette: HEART_PALETTE,
  legend: Object.freeze([
    Object.freeze({ key: 'chamber', label: 'Chambers and septum', labelJa: '心腔・心室中隔' }),
    Object.freeze({ key: 'valve', label: 'Valves', labelJa: '心臓弁' }),
    Object.freeze({ key: 'papillary', label: 'Papillary muscles', labelJa: '乳頭筋' }),
  ]),
  stages: Object.freeze([
    Object.freeze({
      id: 'anatomy',
      name: 'Named parts',
      nameJa: '名前で指せる部位',
      at: 0,
      focus: Object.freeze([]),
      summary:
        'Fourteen parts from one reference heart. Point to name one, click to pin it, search for it in either ' +
        'language, and hide what is in front of it. The great vessels are not in this model.',
      summaryJa:
        '出典モデルの 14 部位です。触れて名前を確認し、クリックで固定、日本語でも英語でも検索できます。' +
        '手前の部位は非表示にできます。大血管はこのモデルに含まれていません。',
    }),
  ]),
  range: Object.freeze({ start: 'Named parts', startJa: '名前で指せる部位', end: 'Named parts', endJa: '名前で指せる部位' }),
  progressLabel: Object.freeze({ label: 'Anatomy', labelJa: '解剖' }),
  summary: 'A still, normal heart: the four chambers, the septum, the four valves and the papillary muscles, each selectable by name.',
  summaryJa: '静止した正常心です。四腔・心室中隔・4 つの弁・乳頭筋を、名前で個別に選択できます。',
  annotations: Object.freeze([]),
  disclaimer: 'EDUCATIONAL GROSS-ANATOMY MODEL — under development, incomplete, and not for clinical use.',
  disclaimerJa: '教育用肉眼解剖モデル：開発中で未完成です。臨床使用不可。',
  disclaimerShort: 'Educational gross anatomy — in development',
  disclaimerShortJa: '教育用肉眼解剖 — 開発中',
});

/**
 * What the beta asks for and this file does not have.
 *
 * Kept as data rather than prose so the scene can show it and a test can hold
 * it: an absence that is only written in a document is an absence that gets
 * forgotten, and this is the list that decides the scene cannot be published.
 */
export const HEART_MISSING = Object.freeze([
  missing('aorta', 'Aorta', '大動脈', 'required'),
  missing('pulmonary-trunk', 'Pulmonary trunk', '肺動脈幹', 'required'),
  missing('superior-vena-cava', 'Superior vena cava', '上大静脈', 'required'),
  missing('inferior-vena-cava', 'Inferior vena cava', '下大静脈', 'required'),
  missing('pulmonary-veins', 'Pulmonary veins', '肺静脈', 'required'),
  missing('coronary-arteries', 'Coronary arteries', '冠動脈', 'optional'),
  missing('myocardial-wall', 'Myocardial free wall', '心筋自由壁', 'noted'),
  missing('chordae-tendineae', 'Chordae tendineae', '腱索', 'noted'),
  missing('pericardium', 'Pericardium', '心膜', 'noted'),
  missing('conduction-system', 'Conduction system', '刺激伝導系', 'noted'),
]);

function missing(id, name, nameJa, standing) {
  return Object.freeze({ id, name, nameJa, standing });
}
