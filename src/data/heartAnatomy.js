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

/** How a structure is grouped, for the tree and for the display recipes. */
export const HEART_GROUPS = Object.freeze({
  chamber: Object.freeze(['Cardiac chambers', '心腔']),
  valve: Object.freeze(['Heart valves', '心臓弁']),
  papillary: Object.freeze(['Papillary muscles', '乳頭筋']),
  greatVessel: Object.freeze(['Great vessels', '大血管']),
  coronary: Object.freeze(['Coronary arteries', '冠動脈']),
  cardiacVein: Object.freeze(['Cardiac veins', '心臓静脈']),
  archBranch: Object.freeze(['Branches of the aortic arch', '大動脈弓の分枝']),
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

/**
 * The vessels, from the second file of the same release.
 *
 * `VH_M_Blood_Vasculature.glb` is the whole torso and head; what is taken from
 * it is the subtree the **source itself** groups as
 * `VH_M_blood_vasculature_of_heart` — 37 meshes of 104. That is a semantic
 * selection made by the people who segmented it, not a box drawn round the
 * heart by us, which is the difference between "the vessels of the heart" and
 * "whatever was near the heart".
 *
 * ## Both files are in the same whole-body frame, and that was checked
 *
 * Neither file is re-centred. The ascending aorta sits 20 mm above the aortic
 * valve at the same depth; the pulmonary trunk sits above the pulmonary valve;
 * the superior vena cava is above and to the right of the right atrium and the
 * inferior vena cava below it; the four pulmonary veins meet the left atrium
 * from behind, the left pair on the +x side and the right pair on the −x side.
 * Those relationships come out of the two files as they are — measured in
 * `docs/asset-qa/heart-hubmap-vh-m-heart.md` — and they are the evidence that
 * the frames agree. One display transform is applied to the pair together.
 *
 * ## `meshNames`, because a structure is not a mesh
 *
 * Five vessels arrive split in two (`_a`/`_b`): the descending aorta, the
 * inferior vena cava, the brachiocephalic artery, the left common carotid and
 * the left subclavian. They are **one structure each**, drawn from two meshes,
 * exactly as the brain's split gyri are.
 *
 * ## `distal` is about framing, not about importance
 *
 * The arch branches, the descending aorta and the brachiocephalic veins run far
 * out of the chest — the subtree is 51 cm tall against the heart's 10 cm. They
 * start hidden so the default frame is a heart, and they are one click away in
 * the parts list. Nothing is removed.
 */
export const HEART_VESSELS = Object.freeze([
  vessel('VH_M_ascending_aorta', ['VH_M_ascending_aorta'], 'Ascending aorta', '上行大動脈', 'UBERON:0001496', 'greatVessel', 'artery', 'ascending aorta'),
  vessel('VH_M_aortic_arch', ['VH_M_aortic_arch'], 'Arch of the aorta', '大動脈弓', 'UBERON:0001508', 'greatVessel', 'artery', 'arch of aorta'),
  vessel('VH_M_descending_aorta', ['VH_M_descending_aorta_a', 'VH_M_descending_aorta_b'], 'Descending aorta', '下行大動脈', 'UBERON:0001514', 'greatVessel', 'artery', 'descending aorta', { distal: true }),
  vessel('VH_M_pulmonary_trunk', ['VH_M_pulmonary_trunk'], 'Pulmonary trunk', '肺動脈幹', 'UBERON:0002333', 'greatVessel', 'artery', 'pulmonary trunk'),
  vessel('VH_M_pulmonary_artery_L', ['VH_M_pulmonary_artery_L'], 'Left pulmonary artery', '左肺動脈', 'UBERON:0001652', 'greatVessel', 'artery', 'left pulmonary artery'),
  vessel('VH_M_pulmonary_artery_R', ['VH_M_pulmonary_artery_R'], 'Right pulmonary artery', '右肺動脈', 'UBERON:0001651', 'greatVessel', 'artery', 'right pulmonary artery'),
  vessel('VH_M_superior_vena_cava', ['VH_M_superior_vena_cava'], 'Superior vena cava', '上大静脈', 'FMA:4720', 'greatVessel', 'vein', 'superior vena cava'),
  vessel('VH_M_inferior_vena_cava', ['VH_M_inferior_vena_cava_a', 'VH_M_inferior_vena_cava_b'], 'Inferior vena cava', '下大静脈', 'FMA:10951', 'greatVessel', 'vein', 'inferior vena cava'),
  vessel('VH_M_pulmonary_vein_L_sup', ['VH_M_pulmonary_vein_L_sup'], 'Left superior pulmonary vein', '左上肺静脈', 'FMA:49916', 'greatVessel', 'vein', 'left superior pulmonary vein'),
  vessel('VH_M_pulmonary_vein_L_inf', ['VH_M_pulmonary_vein_L_inf'], 'Left inferior pulmonary vein', '左下肺静脈', 'FMA:49913', 'greatVessel', 'vein', 'left inferior pulmonary vein'),
  vessel('VH_M_pulmonary_vein_R_sup', ['VH_M_pulmonary_vein_R_sup'], 'Right superior pulmonary vein', '右上肺静脈', 'FMA:49914', 'greatVessel', 'vein', 'right superior pulmonary vein'),
  vessel('VH_M_pulmonary_vein_R_inf', ['VH_M_pulmonary_vein_R_inf'], 'Right inferior pulmonary vein', '右下肺静脈', 'FMA:49911', 'greatVessel', 'vein', 'right inferior pulmonary vein'),

  vessel('VH_M_left_coronary_artery', ['VH_M_left_coronary_artery'], 'Left coronary artery', '左冠動脈', 'UBERON:0001626', 'coronary', 'artery', 'left coronary artery'),
  vessel(
    'VH_M_left_anterior_descending_artery',
    ['VH_M_left_anterior_descending_artery'],
    'Left anterior descending artery',
    '左前下行枝',
    'FMA:8636',
    'coronary',
    'artery',
    'Anterior descending branch of left pulmonary artery',
    {
      note:
        'The source file disagrees with itself about this mesh: its node name calls it the left anterior descending ' +
        'artery, and the label and ontology id on the same node say "anterior descending branch of left pulmonary ' +
        'artery". Both are recorded here and neither is corrected. The mesh sits on the anterior surface of the ' +
        'ventricles, below the valve plane, in the group the file calls "arteries of the heart".',
      noteJa:
        '出典ファイルの記載が一致していません。node 名は左前下行枝ですが、同じ node の label と ontology id は' +
        '「左肺動脈の前下行枝」です。両方をそのまま記録し、こちらでの修正はしていません。' +
        'この mesh は弁の高さより下、心室の前面にあり、ファイル上は「心臓の動脈」の group に置かれています。',
    }
  ),
  vessel('VH_M_diagonal_branch_of_anterior_descending_branch_of_left_coronary_artery', ['VH_M_diagonal_branch_of_anterior_descending_branch_of_left_coronary_artery'], 'Diagonal branch of the anterior descending artery', '前下行枝の対角枝', 'FMA:3860', 'coronary', 'artery', 'Diagonal branch of anterior descending branch of left coronary artery'),
  vessel('VH_M_diagonal_branch_of_left_anterior_descending_artery', ['VH_M_diagonal_branch_of_left_anterior_descending_artery'], 'Second diagonal branch of the anterior descending artery', '前下行枝の第 2 対角枝', 'FMA:3860', 'coronary', 'artery', 'Diagonal branch of anterior descending branch of left coronary artery'),
  vessel('VH_M_left_marginal_branch', ['VH_M_left_marginal_branch'], 'Left marginal artery', '左縁枝（鈍縁枝）', 'FMA:3902', 'coronary', 'artery', 'Left marginal artery'),
  vessel('VH_M_right_coronary_artery', ['VH_M_right_coronary_artery'], 'Right coronary artery', '右冠動脈', 'UBERON:0001625', 'coronary', 'artery', 'right coronary artery'),
  vessel('VH_M_right_marginal_artery', ['VH_M_right_marginal_artery'], 'Right marginal artery', '右縁枝（鋭縁枝）', 'FMA:3818', 'coronary', 'artery', 'marginal branch of right coronary artery'),
  vessel('VH_M_right_posterior_descending_artery', ['VH_M_right_posterior_descending_artery'], 'Posterior interventricular artery', '後下行枝（後室間枝）', 'FMA:3840', 'coronary', 'artery', 'Posterior interventricular branch of right coronary artery'),

  vessel('VH_M_coronary_sinus', ['VH_M_coronary_sinus'], 'Coronary sinus', '冠状静脈洞', 'UBERON:0005438', 'cardiacVein', 'vein', 'coronary sinus'),
  vessel('VH_M_great_cardiac_vein', ['VH_M_great_cardiac_vein'], 'Great cardiac vein', '大心臓静脈', 'UBERON:0006958', 'cardiacVein', 'vein', 'great vein of heart'),
  vessel('VH_M_middle_cardiac_vein', ['VH_M_middle_cardiac_vein'], 'Middle cardiac vein', '中心臓静脈', 'UBERON:0009687', 'cardiacVein', 'vein', 'middle cardiac vein'),
  vessel('VH_M_small_cardiac_vein', ['VH_M_small_cardiac_vein'], 'Small cardiac vein', '小心臓静脈', 'UBERON:0035374', 'cardiacVein', 'vein', 'small cardiac vein'),
  vessel('VH_M_anterior_cardiac_vein', ['VH_M_anterior_cardiac_vein'], 'Anterior cardiac vein', '前心臓静脈', 'FMA:76767', 'cardiacVein', 'vein', 'Anterior cardiac vein'),
  vessel('VH_M_oblique_vein_of_left_atrium', ['VH_M_oblique_vein_of_left_atrium'], 'Oblique vein of the left atrium', '左房斜静脈', 'FMA:4715', 'cardiacVein', 'vein', 'Oblique vein of left atrium'),
  vessel('VH_M_posterior_vein_of_left_ventricle', ['VH_M_posterior_vein_of_left_ventricle'], 'Posterior vein of the left ventricle', '左室後静脈', 'FMA:4712', 'cardiacVein', 'vein', 'Posterior vein of left ventricle'),

  vessel('VH_M_brachiocephalic_artery', ['VH_M_brachiocephalic_artery_a', 'VH_M_brachiocephalic_artery_b'], 'Brachiocephalic artery', '腕頭動脈', 'UBERON:0001529', 'archBranch', 'artery', 'brachiocephalic artery', { distal: true }),
  vessel('VH_M_left_common_carotid_artery', ['VH_M_left_common_carotid_artery_a', 'VH_M_left_common_carotid_artery_b'], 'Left common carotid artery and its branches', '左総頸動脈とその分枝', 'UBERON:0001536', 'archBranch', 'artery', 'left common carotid artery plus branches', { distal: true }),
  vessel('VH_M_left_subclavian_artery', ['VH_M_left_subclavian_artery_a', 'VH_M_left_subclavian_artery_b'], 'Left subclavian artery', '左鎖骨下動脈', 'UBERON:0001584', 'archBranch', 'artery', 'left subclavian artery', { distal: true }),
  vessel('VH_M_brachiocephalic_vein_L', ['VH_M_brachiocephalic_vein_L'], 'Left brachiocephalic vein', '左腕頭静脈', 'FMA:4761', 'archBranch', 'vein', 'Left brachiocephalic vein', { distal: true }),
  vessel('VH_M_brachiocephalic_vein_R', ['VH_M_brachiocephalic_vein_R'], 'Right brachiocephalic vein', '右腕頭静脈', 'FMA:4751', 'archBranch', 'vein', 'Right brachiocephalic vein', { distal: true }),
]);

function vessel(id, meshNames, name, nameJa, ontologyId, group, vesselType, sourceLabel, extra = {}) {
  return Object.freeze({
    id,
    meshNames: Object.freeze(meshNames),
    name,
    nameJa,
    ontologyId,
    group,
    vesselType,
    sourceLabel,
    distal: Boolean(extra.distal),
    note: extra.note ?? null,
    noteJa: extra.noteJa ?? null,
    enclosedMl: null,
    closed: null,
  });
}

/** Everything the scene can name: the heart's own parts, then the vessels. */
export const HEART_STRUCTURES = Object.freeze([...HEART_PARTS, ...HEART_VESSELS]);

const BY_ID = new Map(HEART_STRUCTURES.map((entry) => [entry.id, entry]));

/**
 * Mesh name → the structure it belongs to.
 *
 * The one lookup the scene does when it adopts a file. A structure may own
 * several meshes; a mesh belongs to at most one structure; a mesh nobody claims
 * gets no identity at all.
 */
const OWNER = new Map(
  HEART_STRUCTURES.flatMap((entry) => (entry.meshNames ?? [entry.id]).map((mesh) => [mesh, entry.id]))
);

/** @param {string} id */
export const heartPartById = (id) => BY_ID.get(id) ?? null;

/** @param {string} meshName */
export const heartMeshOwner = (meshName) => OWNER.get(meshName) ?? null;

/** The vessels that start hidden so the default frame is a heart. */
export const HEART_DEFAULT_HIDDEN = Object.freeze(
  HEART_VESSELS.filter((entry) => entry.distal).map((entry) => entry.id)
);

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
    // Nothing here is paired left/right as a *structure*: a left ventricle is
    // not the mirror of a right one, and the paired vessels carry their side in
    // the name they already have. So this field says which file a structure
    // came out of, which is the fact a reader of a two-source model needs.
    side: entry.meshNames ? 'Vessels' : 'Heart',
    sideJa: entry.meshNames ? '血管' : '心臓',
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
    // Three different notes, and only one of them can apply: a per-structure
    // note the table wrote by hand (today, the one mesh whose source record
    // disagrees with itself), or the open-surface note, or nothing.
    note: entry.note ?? (entry.closed === false ? OPEN_SURFACE.en : null),
    noteJa: entry.noteJa ?? (entry.closed === false ? OPEN_SURFACE.ja : null),
    sourceLabel: entry.sourceLabel ?? null,
    vesselType: entry.vesselType ?? null,
  };
}

const OPEN_SURFACE = Object.freeze({
  en: 'This part is an open surface in the source file rather than a closed one.',
  ja: '出典ファイルではこの部位は閉じていない面として収録されています。',
});

/**
 * What each group *is*, said at the level the file supports.
 *
 * A chamber here is a closed surface around the chamber's space — measured, not
 * inferred from the word "chamber" — and the wording says that rather than
 * implying a myocardial wall the file does not contain.
 */
const DESCRIPTION = Object.freeze({
  greatVessel: Object.freeze({
    en: 'A great vessel at the heart, from the same release\'s whole-body vasculature file, in that file\'s own position. It is a lumen surface, not a wall with a thickness.',
    ja: '心臓につながる大血管です。同じリリースの全身血管ファイルから、その位置のまま置いています。壁の厚みではなく内腔の面です。',
  }),
  coronary: Object.freeze({
    en: 'A coronary artery on the surface of the heart, from the same release\'s vasculature file. A lumen surface; no stenosis, no flow and no territory is modelled.',
    ja: '心表面の冠動脈です。同じリリースの血管ファイル由来で、内腔の面です。狭窄・血流・支配領域はモデル化していません。',
  }),
  cardiacVein: Object.freeze({
    en: 'A vein draining the heart wall, from the same release\'s vasculature file.',
    ja: '心臓の壁から血液を集める静脈です。同じリリースの血管ファイル由来です。',
  }),
  archBranch: Object.freeze({
    en: 'A branch of the aortic arch or a vein joining it, present in the source and reaching well beyond the chest. Hidden by default so the frame stays a heart.',
    ja: '大動脈弓の分枝、またはそこへ合流する静脈です。出典に収録されており、胸郭の外まで伸びるため、既定では非表示にしています。',
  }),
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
  greatVessel: Object.freeze([18, 44]),
  coronary: Object.freeze([340, 372]),
  cardiacVein: Object.freeze([232, 268]),
  archBranch: Object.freeze([70, 104]),
});

/**
 * What the source's own two materials say, softened enough to look at.
 *
 * The vasculature file ships `artery_mat7` as pure red and `vein_mat8` as pure
 * blue, and assigns every mesh to one of them. In natural mode this scene
 * reports that assignment rather than inventing a colouring — but pure #f00 and
 * #00f are unreadable against each other, so the saturation and lightness are
 * brought into the same range as the tissue colours beside them.
 *
 * **It is a vessel-type map, not an oxygenation map, and the model contains the
 * counterexample**: the pulmonary arteries carry deoxygenated blood and the
 * pulmonary veins carry oxygenated blood, and here they are red and blue
 * respectively — because that is what "artery" and "vein" mean, which is not
 * what red and blue are usually taken to mean.
 */
const VESSEL_HUE = Object.freeze({ artery: 2, vein: 218 });

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
    // A vessel takes the source's own artery/vein assignment; a part of the
    // heart takes the source's own single tissue material, with a little
    // lightness between parts so a boundary is still a boundary. Spread across
    // the whole table rather than within a group, or a papillary muscle would
    // come out the same colour as the ventricle it sits in — which is exactly
    // the boundary that matters.
    const place = ORDER_SPREAD.get(entry.id) ?? 0;
    if (entry.vesselType) return hslToHex(VESSEL_HUE[entry.vesselType], 52 + place * 8, 34 + place * 12);
    return hslToHex(6, 44 + place * 8, 31 + place * 16);
  }
  const [from, to] = GROUP_HUE[entry.group];
  const hue = from + spread * (to - from);
  return hslToHex(hue, 44 + spread * 22, 42 + spread * 20);
}

/** Representative swatches for the legend. */
const midHue = (group) => (GROUP_HUE[group][0] + GROUP_HUE[group][1]) / 2;

/** Representative swatches for the legend: the middle of each group's band. */
export const HEART_PALETTE = Object.freeze(
  Object.fromEntries(Object.keys(GROUP_HUE).map((group) => [group, hslToHex(midHue(group) % 360, 54, 52)]))
);

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
  HEART_STRUCTURES.map((entry, at) => [entry.id, at / (HEART_STRUCTURES.length - 1)])
);

const GROUP_SPREAD = new Map(
  Object.keys(HEART_GROUPS).flatMap((group) => {
    const members = HEART_STRUCTURES.filter((entry) => entry.group === group);
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
    Object.freeze({ key: 'greatVessel', label: 'Great vessels', labelJa: '大血管' }),
    Object.freeze({ key: 'coronary', label: 'Coronary arteries', labelJa: '冠動脈' }),
    Object.freeze({ key: 'cardiacVein', label: 'Cardiac veins', labelJa: '心臓静脈' }),
    Object.freeze({ key: 'archBranch', label: 'Arch branches', labelJa: '弓部分枝' }),
  ]),
  stages: Object.freeze([
    Object.freeze({
      id: 'anatomy',
      name: 'Named parts',
      nameJa: '名前で指せる部位',
      at: 0,
      focus: Object.freeze([]),
      summary:
        'Forty-six structures from two files of one reference release: the heart itself, and the vessels the ' +
        'source groups as the vessels of the heart. Point to name one, click to pin it, search for it in either ' +
        'language, and hide what is in front of it.',
      summaryJa:
        '同じリリースの 2 ファイルから 46 構造です。心臓そのものと、出典が「心臓の血管」としてまとめている血管。' +
        '触れて名前を確認し、クリックで固定、日本語でも英語でも検索でき、手前の部位は非表示にできます。',
    }),
  ]),
  range: Object.freeze({ start: 'Named parts', startJa: '名前で指せる部位', end: 'Named parts', endJa: '名前で指せる部位' }),
  progressLabel: Object.freeze({ label: 'Anatomy', labelJa: '解剖' }),
  summary: 'A still, normal heart: chambers, septum, valves and papillary muscles, with the great vessels, the coronary arteries and the cardiac veins from the same release, each selectable by name.',
  summaryJa: '静止した正常心です。心腔・心室中隔・弁・乳頭筋に、同じリリースの大血管・冠動脈・心臓静脈を加え、名前で個別に選択できます。',
  annotations: Object.freeze([]),
  disclaimer: 'EDUCATIONAL GROSS-ANATOMY MODEL — under development, incomplete, and not for clinical use.',
  disclaimerJa: '教育用肉眼解剖モデル：開発中で未完成です。臨床使用不可。',
  disclaimerShort: 'Educational gross anatomy — in development',
  disclaimerShortJa: '教育用肉眼解剖 — 開発中',
});

/**
 * What is still not in the model, and what standing each absence has.
 *
 * Kept as data rather than prose so the scene can show it and a test can hold
 * it: an absence that is only written in a document is an absence that gets
 * forgotten.
 *
 * **Nothing here is `required` any more.** The five great vessels the beta asks
 * for — aorta, pulmonary trunk, both venae cavae and the pulmonary veins — were
 * absent from the heart file and are present in the vasculature file of the same
 * release, in the same coordinates, and are now drawn. So are the coronary
 * arteries and the cardiac veins, which were the optional ask. What is left is
 * what the source does not contain at all, and it is listed with the reason.
 *
 * **This does not open the release gate**, and the gate does not read this list.
 * The files are still candidates that have been through no asset pipeline, and
 * no publication decision exists — `src/catalog/release.js` says both.
 */
export const HEART_MISSING = Object.freeze([
  missing(
    'left-circumflex',
    'Left circumflex artery, named as such',
    '左回旋枝（その名で分離された mesh）',
    'noted',
    'The file names a left coronary artery, an anterior descending artery, two diagonal branches and a left ' +
      'marginal artery. No mesh is named "circumflex". Which of the named meshes carries the circumflex course is ' +
      'not something this repository decides.',
    '出典には左冠動脈・前下行枝・対角枝 2 本・左縁枝があり、「回旋枝」という名の mesh はありません。' +
      'どの mesh が回旋枝の走行にあたるかは、こちらでは判断しません。'
  ),
  missing(
    'myocardial-wall',
    'Myocardial free wall',
    '心筋自由壁',
    'noted',
    'The chamber meshes enclose the chambers\' spaces. There is no wall between them, so no wall thickness is ' +
      'shown and no cut through one is offered.',
    '心腔の mesh は心腔の空間を囲む面です。その間に壁はないため、壁厚も、壁を切った断面も出しません。'
  ),
  missing('chordae-tendineae', 'Chordae tendineae', '腱索', 'noted'),
  missing('pericardium', 'Pericardium', '心膜', 'noted'),
  missing('conduction-system', 'Conduction system', '刺激伝導系', 'noted'),
]);

function missing(id, name, nameJa, standing, why = null, whyJa = null) {
  return Object.freeze({ id, name, nameJa, standing, why, whyJa });
}
