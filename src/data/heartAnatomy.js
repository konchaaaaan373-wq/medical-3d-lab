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

/**
 * How a structure is grouped, for the tree, the legend and the colour bands.
 *
 * **A group is a place to look, not a statement about what a structure is.**
 * The interventricular septum is filed under the chambers because that is where
 * a reader looks for it; it is not a chamber, and its own description says so.
 * The two are kept apart deliberately: a group shared for navigation used to
 * carry the chambers' description onto the septum, which was a real error made
 * by a convenience.
 *
 * The brachiocephalic veins are their own group for the opposite reason. They
 * were filed with the aortic arch's branches — the two are together only in
 * being long and out of the chest — and inherited a description saying they
 * join the arch. They do not: they unite to form the superior vena cava.
 */
export const HEART_GROUPS = Object.freeze({
  chamber: Object.freeze(['Chambers and septum', '心腔・心室中隔']),
  valve: Object.freeze(['Heart valves', '心臓弁']),
  papillary: Object.freeze(['Papillary muscles', '乳頭筋']),
  greatVessel: Object.freeze(['Great vessels', '大血管']),
  coronary: Object.freeze(['Coronary arteries', '冠動脈']),
  cardiacVein: Object.freeze(['Cardiac veins', '心臓静脈']),
  archBranch: Object.freeze(['Branches of the aortic arch', '大動脈弓の分枝']),
  cavalTributary: Object.freeze(['Tributaries of the superior vena cava', '上大静脈へ合流する静脈']),
});

/**
 * The fourteen parts.
 *
 * `enclosedMl` is the volume of each closed surface, measured from the mesh, and
 * it is recorded as that and nothing more. This comment used to add that it is
 * "what settles what a chamber mesh *is* — a left ventricle enclosing 122 mL is
 * a chamber cavity, not a cavity plus its myocardium". **That is withdrawn**
 * (B4-G1): a normal left ventricular myocardial volume is of the same order as
 * a normal cavity volume, so the figure does not choose between them.
 *
 * **It is not a clinical measurement** either: one fixed cadaveric specimen, at
 * whatever state it was fixed in, is not an end-diastolic volume and must never
 * be shown as one.
 */
export const HEART_PARTS = Object.freeze([
  part('VH_M_heart_left_ventricle', 'Left ventricle', '左心室', 'UBERON:0002084', 'chamber', 121.6, true),
  part('VH_M_heart_right_ventricle', 'Right ventricle', '右心室', 'UBERON:0002080', 'chamber', 74.0, true),
  part('VH_M_left_cardiac_atrium', 'Left atrium', '左心房', 'UBERON:0002079', 'chamber', 31.3, true),
  part('VH_M_right_cardiac_atrium', 'Right atrium', '右心房', 'UBERON:0002078', 'chamber', 27.7, false),
  // Filed with the chambers because that is where it is looked for; described
  // as what it is, which is a wall. See HEART_GROUPS.
  part('VH_M_interventricular_septum', 'Interventricular septum', '心室中隔', 'UBERON:0002094', 'chamber', 28.1, true, { descriptionKey: 'septum' }),
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

function part(node, name, nameJa, ontologyId, group, enclosedMl, closed, extra = {}) {
  return Object.freeze({
    id: node, node, name, nameJa, ontologyId, group, enclosedMl, closed,
    descriptionKey: extra.descriptionKey ?? null,
  });
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
      identityConflict: true,
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
  vessel('VH_M_brachiocephalic_vein_L', ['VH_M_brachiocephalic_vein_L'], 'Left brachiocephalic vein', '左腕頭静脈', 'FMA:4761', 'cavalTributary', 'vein', 'Left brachiocephalic vein', { distal: true }),
  vessel('VH_M_brachiocephalic_vein_R', ['VH_M_brachiocephalic_vein_R'], 'Right brachiocephalic vein', '右腕頭静脈', 'FMA:4751', 'cavalTributary', 'vein', 'Right brachiocephalic vein', { distal: true }),
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
    descriptionKey: extra.descriptionKey ?? null,
    /**
     * The source's own records for this mesh do not agree with each other.
     *
     * Not a doubt of ours and not an anatomical opinion: the file's node name
     * and its label/ontology id name different vessels. Surfaced wherever the
     * structure is named so a reader does not take the name as settled.
     */
    identityConflict: Boolean(extra.identityConflict),
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
    description: describe(entry).en,
    descriptionJa: describe(entry).ja,
    // Three different notes, and only one of them can apply: a per-structure
    // note the table wrote by hand (today, the one mesh whose source record
    // disagrees with itself), or the open-surface note, or nothing.
    note: entry.note ?? (entry.closed === false ? OPEN_SURFACE.en : null),
    noteJa: entry.noteJa ?? (entry.closed === false ? OPEN_SURFACE.ja : null),
    sourceLabel: entry.sourceLabel ?? null,
    vesselType: entry.vesselType ?? null,
    /**
     * `'source-conflict'` when the source file's own records for this mesh name
     * different things, and null otherwise.
     *
     * Deliberately a state rather than a corrected name: the original node
     * name, `sourceLabel` and `ontologyId` are all still here untouched, and
     * nothing in this repository decides which of them is right. The surfaces
     * read this to mark the name as unsettled where it is shown.
     */
    identity: entry.identityConflict ? 'source-conflict' : null,
    identityNote: entry.identityConflict ? IDENTITY_UNSETTLED.en : null,
    identityNoteJa: entry.identityConflict ? IDENTITY_UNSETTLED.ja : null,
  };
}

/** The short form, for a heading or a row where a paragraph will not fit. */
const IDENTITY_UNSETTLED = Object.freeze({ en: 'name unverified', ja: '名称要確認' });

/**
 * The description a structure gets: its own key if it has one, else its group's.
 *
 * The default is the group because most structures are ordinary members of
 * theirs. The exception is the point: a structure that is filed somewhere for
 * navigation and is not that thing says what it is here rather than inheriting
 * a sentence written about its neighbours.
 */
function describe(entry) {
  return DESCRIPTION[entry.descriptionKey ?? entry.group];
}

const OPEN_SURFACE = Object.freeze({
  en: 'This part is an open surface in the source file rather than a closed one.',
  ja: '出典ファイルではこの部位は閉じていない面として収録されています。',
});

/**
 * What each group *is*, said at the level the file supports.
 *
 * A chamber here is a surface the source named for that chamber. Nine of the
 * fourteen parts are closed and manifold and five are not — measured, not
 * inferred from the word "chamber". What such a surface *represents* — the
 * cavity, the wall around it, or something between — is **not** established:
 * see rule 1 below. The wording therefore describes the surface, and neither
 * asserts a myocardial wall nor rules one out.
 */
/**
 * What each kind of structure is, said at the level the files support.
 *
 * Keyed by `descriptionKey`, which defaults to the group but does not have to
 * be it — see `HEART_GROUPS`. Three rules this table has to keep:
 *
 * 1. **It does not assert what has not been measured**, and that has now caught
 *    this table out twice, with a third attempt caught before it reached this
 *    file. The vessels were first described as lumen surfaces, which nobody had
 *    measured. They were then described as single surfaces with no wall
 *    thickness, which *had* been measured — with an instrument that could not
 *    tell the two apart. A ray cast outward from inside a shape crosses one
 *    surface if the shape is solid and two if it is a shell, and the rule that
 *    was applied ("two means one surface, four would mean a wall") is the count
 *    for a ray crossing the whole shape from outside. The third attempt read
 *    the surface's genus, which fails in both directions: a cup has a wall and
 *    genus 0, a loop of solid rod has none and genus 1. **All three are
 *    withdrawn, and nothing in this repository measures wall thickness.** What
 *    is written here is the confidence the evidence actually supports: still
 *    being checked.
 * 2. **It does not contradict the row it describes.** Nine of the fourteen
 *    heart parts are closed surfaces and five are not; a description that says
 *    "closed" and a note that says "open" cannot both be about the same mesh.
 *    So the description says what the surface encloses and the `closed` flag
 *    says whether it is closed.
 * 3. **A shared group is not a shared meaning.** See `HEART_GROUPS`.
 */
const DESCRIPTION = Object.freeze({
  greatVessel: Object.freeze({
    en: 'A great vessel at the heart, from the same release\'s whole-body vasculature file, in that file\'s own position. It is a surface model of the vessel as the source recorded it. Whether it represents a wall with a thickness, and whether the surface corresponds to the lumen or to the outside of the vessel, is still being checked.',
    ja: '心臓につながる大血管です。同じリリースの全身血管ファイルから、その位置のまま置いています。出典に収録された血管の表面モデルです。壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。',
  }),
  coronary: Object.freeze({
    en: 'A coronary artery on the surface of the heart, from the same release\'s vasculature file. A surface model as the source recorded it; whether it represents a wall with a thickness, and whether it corresponds to the lumen or the outside, is still being checked. No stenosis, no flow and no territory is modelled.',
    ja: '心表面の冠動脈です。出典に収録された血管の表面モデルで、壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。狭窄・血流・支配領域はモデル化していません。',
  }),
  cardiacVein: Object.freeze({
    en: 'A vein draining the heart wall, from the same release\'s vasculature file. A surface model as the source recorded it; wall thickness, and lumen versus outside, are still being checked.',
    ja: '心臓の壁から血液を集める静脈です。出典に収録された表面モデルで、壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。',
  }),
  archBranch: Object.freeze({
    en: 'An arterial branch of the aortic arch, present in the source and reaching well beyond the chest. Hidden by default so the frame stays a heart. A surface model as the source recorded it; wall thickness, and lumen versus outside, are still being checked.',
    ja: '大動脈弓から分かれる動脈です。出典に収録されており、胸郭の外まで伸びるため、既定では非表示にしています。出典に収録された表面モデルで、壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。',
  }),
  cavalTributary: Object.freeze({
    en: 'A brachiocephalic vein. The left and right brachiocephalic veins unite to form the superior vena cava — they are not branches of the aortic arch, which they run beside. Reaches beyond the chest, so it is hidden by default. A surface model as the source recorded it; wall thickness, and lumen versus outside, are still being checked.',
    ja: '腕頭静脈です。左右の腕頭静脈が合流して上大静脈になります——大動脈弓の分枝ではなく、その傍らを走る別系統です。胸郭の外まで伸びるため既定では非表示にしています。出典に収録された表面モデルで、壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。',
  }),
  chamber: Object.freeze({
    en: 'A surface the source recorded under this chamber\'s name. Whether it represents the chamber\'s space or the wall around it is still being checked. Whether this particular surface is closed is recorded on the structure itself.',
    ja: '出典がこの心腔の名前で収録した表面モデルです。心腔の空間と周囲の壁のどちらを表すかは確認中です。この面が閉じているかどうかは部位ごとに記録しています。',
  }),
  septum: Object.freeze({
    en: 'The muscular wall between the two ventricles. The source records it as a separate closed surface enclosing 28.1 mL. It is listed with the chambers because that is where a reader looks for it, not because it is one.',
    ja: '左右の心室を隔てる筋性の壁です。出典では 28.1 mL を囲む独立した閉じた面として収録されています。一覧で心腔と同じ場所にあるのは探しやすさのためで、心腔だからではありません。',
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
  cavalTributary: Object.freeze([196, 226]),
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
/**
 * What this model answers, what it does not represent, and where it came from.
 *
 * Every line here is taken from `docs/model-cards/heart-anatomy.md` and
 * `docs/model-evidence/heart-anatomy.md` as they now stand. **Nothing is
 * asserted here that is not already established there** — in particular the two
 * things this scene is repeatedly tempted to say and cannot: what a chamber
 * surface represents, and whether a vessel meets a chamber.
 *
 * An anatomy scene at `alpha` is required to carry a scope panel alongside its
 * model layer, evidence dossier and model card (`CLAUDE.md`). This one had the
 * other three; the panel was missing, which a browser run of the reader's own
 * path is what surfaced.
 */
export const HEART_MODEL_SCOPE = Object.freeze({
  question: 'Which named parts of one specimen\'s heart and its great vessels are these, and where is each one?',
  questionJa: 'ある 1 体の心臓と大血管について、収録されている部位はどれで、それぞれどこにあるのか。',
  answers: [
    {
      text: 'Forty-six structures from two files of one release, each selectable and named in English and Japanese.',
      textJa: '同じリリースの 2 ファイルから 46 構造。1 つずつ選べて、英語と日本語の名前が付いています。',
    },
    {
      text: 'Where each part sits relative to the others, in the source\'s own whole-body frame with neither file moved.',
      textJa: '各部位が互いにどの位置関係にあるか。出典の全身座標のまま、どちらのファイルも動かしていません。',
    },
  ],
  excludes: [
    {
      text: 'Any physiology: no beat, no flow, no pressure, no conduction, and no change over time.',
      textJa: '生理は一切扱いません。拍動・血流・圧・興奮伝導・時間変化のいずれもありません。',
    },
    {
      text: 'Chordae tendineae, pericardium, conduction system, and any separately identified myocardial free wall — none is in the source.',
      textJa: '腱索・心膜・刺激伝導系、および独立に同定された心筋自由壁。いずれも出典にありません。',
    },
    {
      text: 'One fixed cadaveric specimen. Not a patient, not an average, and not a range of normal variation.',
      textJa: '固定された 1 体の標本です。患者でも平均でもなく、正常変異の幅でもありません。',
    },
  ],
  cautions: [
    {
      text: '**What a chamber surface represents is still being checked** — the space, or the wall around it. Two attempts to settle it, from a ray count and from the surface genus, were both withdrawn.',
      textJa: '**心腔の面が「空間」と「周りの壁」のどちらを表すかは確認中です。** ray の数と genus による判定を 2 度試み、どちらも撤回しました。',
    },
    {
      text: 'The same question is open for every one of the thirty-seven vessel surfaces: lumen or wall is not established.',
      textJa: '同じ問いが血管 37 本すべてで未確定です。内腔か壁かは決まっていません。',
    },
    {
      text: 'The figures across the two files are a **sampled-vertex** distance and a frame diagnostic. They do not establish that a vessel and a chamber are joined, continuous or watertight.',
      textJa: '2 ファイル間の数値は**採用頂点間の距離**で、座標系が一致していることの診断です。血管と心腔が接合・連続・水密であることは示しません。',
    },
    {
      text: 'One structure carries a name the source itself disagrees on, and is marked as unverified rather than resolved here.',
      textJa: '出典内で名称が一致しない部位が 1 つあり、こちらで決めずに「名称要確認」と表示しています。',
    },
  ],
  sources: [
    {
      text: 'HuBMAP Human Reference Atlas CCF release v1.2 — VH_M_Heart.glb and VH_M_Blood_Vasculature.glb, pinned by commit, byte count and hash. Candidate assets: recorded, not adopted.',
      textJa: 'HuBMAP Human Reference Atlas CCF v1.2 の VH_M_Heart.glb と VH_M_Blood_Vasculature.glb。commit・バイト数・hash で固定。候補 asset であって採用済みではありません。',
      kind: 'dataset',
    },
    {
      text: 'Both files fail glTF validation by a recorded amount (408 errors and 33), which is kept as a failed gate rather than an unrun one.',
      textJa: '両ファイルとも glTF 検証に不合格で、その件数（408 と 33）を記録しています。未実施ではなく不合格として保持しています。',
      kind: 'qa',
    },
    {
      text: 'No anatomist and no clinician has reviewed this geometry or these labels, and the licences are recorded rather than discharged.',
      textJa: '解剖学者・臨床家によるレビューは受けていません。ライセンスは記録のみで、義務の履行は済んでいません。',
      kind: 'limitation',
    },
  ],
  /**
   * Where the physiology is, given that this model has none.
   *
   * "No beat, no flow, no pressure" is true and leaves the reader nowhere. The
   * next question after "what is this part called" is "what happens to it", and
   * the answer is two other scenes in this app — so the panel that says what is
   * missing also says where it is shown.
   *
   * **They are not this heart later.** Both are schematic models built from
   * their own geometry and their own solved state; nothing there is this
   * specimen changing, and `nextNote` says so beside the links rather than in a
   * document. Keeping that sentence attached is the whole reason these live
   * here and not in a generic "related scenes" list.
   */
  next: [
    {
      slug: 'heart-failure',
      label: 'Heart failure — what a ventricle under load becomes',
      labelJa: '心不全 — 負荷のかかった心室がどう変わるか',
      why: 'Wall thickness, cavity size and what one beat manages, changing over a course. **A different model**, not this specimen.',
      whyJa: '壁の厚さ、内腔の大きさ、1 拍で送れる量が、経過とともに変わります。**別のモデル**であって、この標本ではありません。',
    },
    {
      slug: 'myocardial-ischemia',
      label: 'Myocardial ischaemia — which muscle a narrowed artery starves',
      labelJa: '心筋虚血 — 細くなった血管がどの筋肉を飢えさせるか',
      why: 'The coronary arteries you can name here, supplying territories downstream. **A different model**, not this specimen.',
      whyJa: 'ここで名前を確かめられる冠動脈が、下流のどの領域を養っているか。**別のモデル**であって、この標本ではありません。',
    },
  ],
  nextNote:
    '**Neither is this heart at a later date.** Each is a separate schematic model with its own '
    + 'geometry, built to show a mechanism rather than a specimen. Nothing here is deformed, cut or '
    + 'joined to make one look like the other, and no measurement crosses between them.',
  nextNoteJa:
    '**どちらも「この心臓のその後」ではありません。** それぞれ独自の形状を持つ別の模式モデルで、'
    + '標本ではなく仕組みを見せるために作られています。片方をもう片方に似せるための変形・切断・接合は'
    + 'していませんし、計測値がまたいで使われることもありません。',
  evidence: 'docs/model-evidence/heart-anatomy.md',
});

export const HEART_ANATOMY_META = Object.freeze({
  id: 'heart-anatomy',
  status: 'alpha',
  title: 'Heart anatomy',
  titleJa: '心臓の解剖',
  subtitle: 'Point to identify; click or tap to pin any named part',
  subtitleJa: '触れて部位を確認・クリック／タップで固定',
  inspection: Object.freeze({ background: 'studio' }),
  /**
   * The scope panel. An `alpha` scene owes one alongside its model layer,
   * evidence dossier and model card; this scene had the other three.
   */
  modelScope: HEART_MODEL_SCOPE,
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
    Object.freeze({ key: 'cavalTributary', label: 'Brachiocephalic veins', labelJa: '腕頭静脈' }),
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
 * Fixed ways of looking, each one made only of things the scene can already do.
 *
 * A recipe hides whole structures and turns the model. **It never cuts, thins,
 * sections or opens anything** — the file supports none of those, and a recipe
 * that faked one would be the "shell's back face standing in for an interior"
 * this scene refuses. What each one shows is structures the source actually
 * contains, listed by name so a reader can check the claim against the model.
 *
 * One to begin with, because one that is honest is worth more than four that
 * gesture. `restoreDisplay` puts back whatever a recipe changed.
 */
/**
 * Ways of looking at this heart, in the order a reader works through it.
 *
 * Whole → pick something → clear what is in front of it → look inside → back to
 * whole. Each one is a **destination, not a further step**: `resets: true` puts
 * the display back to how the scene opens before the recipe's own hides go on,
 * so pressing one after another gives the one that was pressed rather than the
 * union of both.
 *
 * **Every id below is a structure the source actually contains and this scene
 * actually draws** — `tests/heart-anatomy.test.js` holds them to the part
 * table. Nothing here invents a vessel or a wall to make a view look tidier,
 * and no recipe shows a structure the file does not have.
 */
export const HEART_RECIPES = Object.freeze([
  Object.freeze({
    id: 'whole-heart',
    // **Not "the whole heart".** It was called that, and it overstated what a
    // reader gets: this model has no myocardial free wall as a named part, no
    // chordae, no pericardium and no conduction system (`HEART_MISSING`), and
    // this view keeps the arch branches and the brachiocephalic veins out of
    // the way. What it really is is the heart and the vessels on and around it,
    // as the scene opens — so that is what it says.
    label: 'The heart and its vessels',
    labelJa: '心臓と血管',
    summary:
      'Everything the scene draws, from the front: the chambers and septum, the valves and papillary '
      + 'muscles, the great vessels and the coronary vessels. The arch branches and the brachiocephalic '
      + 'veins stay out of the way, as they do when the scene opens — they reach far beyond the chest.',
    summaryJa:
      'このシーンが描くものすべてを前から見ます——心腔と心室中隔、弁と乳頭筋、大血管、冠血管。'
      + '大動脈弓の分枝と腕頭静脈は、シーンを開いたときと同じく出したままにしません（胸郭の外まで伸びるためです）。',
    resets: true,
    hide: Object.freeze([]),
    shows: Object.freeze([
      'VH_M_heart_left_ventricle',
      'VH_M_heart_right_ventricle',
      'VH_M_left_cardiac_atrium',
      'VH_M_right_cardiac_atrium',
      'VH_M_ascending_aorta',
      'VH_M_pulmonary_trunk',
    ]),
    view: 'anterior',
    note:
      'This is where the scene starts, and where the way back returns to. It shows every '
      + 'structure again; it does not move or rebuild anything.',
    noteJa:
      'シーンの初期表示であり、戻り先です。非表示をすべて解除するだけで、'
      + '形を動かしたり作り直したりはしません。',
  }),
  Object.freeze({
    id: 'great-vessels',
    label: 'The great vessels',
    labelJa: '大血管を見る',
    summary:
      'The vessels entering and leaving the heart, with the coronary vessels on the surface taken out of '
      + 'the way so the trunks read clearly: aorta and arch, pulmonary trunk and both pulmonary arteries, '
      + 'both venae cavae and the four pulmonary veins.',
    summaryJa:
      '心臓に出入りする血管です。手前の冠血管を非表示にして、幹がはっきり見えるようにします——'
      + '上行大動脈・大動脈弓、肺動脈幹と左右肺動脈、上下大静脈、4 本の肺静脈。',
    resets: true,
    hide: Object.freeze([
      'VH_M_left_coronary_artery',
      'VH_M_left_anterior_descending_artery',
      'VH_M_diagonal_branch_of_anterior_descending_branch_of_left_coronary_artery',
      'VH_M_diagonal_branch_of_left_anterior_descending_artery',
      'VH_M_left_marginal_branch',
      'VH_M_right_coronary_artery',
      'VH_M_right_marginal_artery',
      'VH_M_right_posterior_descending_artery',
      'VH_M_coronary_sinus',
      'VH_M_great_cardiac_vein',
      'VH_M_middle_cardiac_vein',
      'VH_M_small_cardiac_vein',
      'VH_M_anterior_cardiac_vein',
      'VH_M_oblique_vein_of_left_atrium',
      'VH_M_posterior_vein_of_left_ventricle',
    ]),
    shows: Object.freeze([
      'VH_M_ascending_aorta',
      'VH_M_aortic_arch',
      'VH_M_pulmonary_trunk',
      'VH_M_pulmonary_artery_L',
      'VH_M_pulmonary_artery_R',
      'VH_M_superior_vena_cava',
      'VH_M_inferior_vena_cava',
      'VH_M_pulmonary_vein_L_sup',
      'VH_M_pulmonary_vein_L_inf',
      'VH_M_pulmonary_vein_R_sup',
      'VH_M_pulmonary_vein_R_inf',
    ]),
    view: 'anterior',
    note:
      'The chambers stay: these vessels are being shown where they meet the heart, not on their own. '
      + 'Whether a vessel surface is a lumen or a wall is still being checked.',
    noteJa:
      '心腔は残します。血管だけを取り出すのではなく、心臓と接する位置で見るためです。'
      + '血管の面が内腔と壁のどちらを表すかは確認中です。',
  }),
  Object.freeze({
    id: 'coronary-vessels',
    label: 'The coronary vessels',
    labelJa: '冠血管を見る',
    summary:
      'The arteries and veins on the heart\'s own surface, with the great vessels that stand in front of '
      + 'them taken out of the way. Eight coronary arteries and seven cardiac veins, as the source names '
      + 'them.',
    summaryJa:
      '心臓自身の表面を走る動脈と静脈です。手前に立つ大血管を非表示にします。'
      + '出典の名づけで冠動脈 8 本、心臓静脈 7 本。',
    resets: true,
    hide: Object.freeze([
      'VH_M_ascending_aorta',
      'VH_M_aortic_arch',
      'VH_M_pulmonary_trunk',
      'VH_M_pulmonary_artery_L',
      'VH_M_pulmonary_artery_R',
      'VH_M_superior_vena_cava',
      'VH_M_pulmonary_vein_L_sup',
      'VH_M_pulmonary_vein_L_inf',
      'VH_M_pulmonary_vein_R_sup',
      'VH_M_pulmonary_vein_R_inf',
    ]),
    shows: Object.freeze([
      'VH_M_left_coronary_artery',
      'VH_M_left_anterior_descending_artery',
      'VH_M_left_marginal_branch',
      'VH_M_right_coronary_artery',
      'VH_M_right_marginal_artery',
      'VH_M_right_posterior_descending_artery',
      'VH_M_coronary_sinus',
      'VH_M_great_cardiac_vein',
      'VH_M_middle_cardiac_vein',
    ]),
    view: 'anterior',
    note:
      'One of these carries a name the source itself disagrees on, and it is marked where it is shown '
      + 'rather than resolved here. No mesh in the file is named "circumflex".',
    noteJa:
      'このうち 1 本は出典内で名称が一致しておらず、表示側に留保を出しています（こちらでは決めません）。'
      + 'ファイルに「回旋枝」という名の mesh はありません。',
  }),
  Object.freeze({
    id: 'inside-the-chambers',
    label: 'Inside the chambers',
    labelJa: '心腔の中を見る',
    resets: true,
    summary:
      'Hides the four chamber surfaces and looks from the front. What is left is what the source puts inside them: '
      + 'the four valves, the five papillary muscles and the interventricular septum.',
    summaryJa:
      '四腔の面を非表示にして前から見ます。残るのは出典がその内側に収録しているもの——4 つの弁、'
      + '5 つの乳頭筋、心室中隔です。',
    hide: Object.freeze([
      'VH_M_heart_left_ventricle',
      'VH_M_heart_right_ventricle',
      'VH_M_left_cardiac_atrium',
      'VH_M_right_cardiac_atrium',
    ]),
    /** What the reader is being shown, named so the claim is checkable. */
    shows: Object.freeze([
      'VH_M_mitral_valve',
      'VH_M_tricuspid_valve',
      'VH_M_aortic_valve',
      'VH_M_pulmonary_valve',
      'VH_M_interventricular_septum',
      'VH_M_papillary_muscle_of_heart_anterior',
      'VH_M_papillary_muscle_of_heart_anterolateral',
      'VH_M_papillary_muscle_of_heart_medial',
      'VH_M_papillary_muscle_of_heart_posterior',
      'VH_M_papillary_muscle_of_heart_posteromedial',
    ]),
    view: 'anterior',
    note:
      'This is not a section. It hides the four chamber parts whole, so that the valves, papillary muscles '
      + 'and interventricular septum are left in view. Nothing here cuts a surface or builds a wall.',
    noteJa:
      '断面ではありません。四腔の部位を丸ごと非表示にして、弁・乳頭筋・心室中隔を残して見ています。'
      + 'ここで面を切ったり壁を作ったりする処理はしていません。',
  }),
]);

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
    'No part of the source is separately identified as the myocardial free wall — the interventricular septum ' +
      'and the papillary muscles are named, the free wall around the chambers is not — so there is nothing here ' +
      'to select as one. What the chamber surfaces themselves represent, the space or the wall around it, is ' +
      'still being checked, so no wall thickness is given and no cut through one is offered.',
    '出典に、心筋自由壁として独立に同定された部位はありません（心室中隔と乳頭筋は名前が付いていますが、' +
      '心腔の周りの自由壁には付いていません）。そのため、自由壁として選べるものがありません。' +
      '心腔の面が空間そのものを表すのか、その周りの壁を表すのかは確認中です。したがって壁厚も、壁を切った断面も出しません。'
  ),
  missing('chordae-tendineae', 'Chordae tendineae', '腱索', 'noted'),
  missing('pericardium', 'Pericardium', '心膜', 'noted'),
  missing('conduction-system', 'Conduction system', '刺激伝導系', 'noted'),
]);

function missing(id, name, nameJa, standing, why = null, whyJa = null) {
  return Object.freeze({ id, name, nameJa, standing, why, whyJa });
}
