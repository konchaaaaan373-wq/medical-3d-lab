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
  abdominalBranch: Object.freeze(['Branches of the abdominal aorta', '腹部大動脈の分枝']),
  cavalTributary: Object.freeze(['Tributaries of the superior vena cava', '上大静脈へ合流する静脈']),
});

/**
 * The two ways of looking this scene is built around, and which structures
 * each one draws.
 *
 * - **`aorta`** — the heart with the whole aorta the source draws, from the
 *   valve to the bifurcation, and the first centimetres of every major branch.
 *   Where the heart sits against the vessel it empties into. The scene opens
 *   here.
 * - **`heart`** — the heart on its own: every chamber, valve, papillary muscle,
 *   coronary artery and cardiac vein, and **the roots** of the great vessels —
 *   short enough that the heart is what fills the frame, long enough that the
 *   base of the heart is not left with holes where they leave it, and that the
 *   coronary arteries still arise from an aorta rather than from nothing.
 *
 * Which roots are trimmed was decided from the file and from pictures of all
 * six sides. The ascending aorta, the pulmonary trunk and arteries and the
 * four pulmonary veins end in the source within 15 mm of the heart's box, in
 * their own ends — a closed cap, or the ring where the arch joins — and are
 * drawn whole (`heart`): trimming them sliced a single surface obliquely and
 * left see-through holes in the right pulmonary artery and open rings on the
 * veins. Only the two venae cavae run on far beyond the heart (37 and 23 mm
 * and more) and are trimmed (`root`).
 *
 * So every structure has one of three extents, and the pair above is nothing
 * more than which extents are drawn and whether the roots are trimmed:
 *
 * | extent   | `aorta`      | `heart`                            |
 * | -------- | ------------ | ---------------------------------- |
 * | `heart`  | drawn        | drawn                              |
 * | `root`   | drawn whole  | drawn to just past the heart, fading out |
 * | `beyond` | drawn        | not drawn, not clickable, no label |
 *
 * It is a **display range**, not a statement about anatomy: nothing here
 * says the arch is less part of the circulation than the ascending aorta.
 */
export const HEART_SCOPES = Object.freeze({
  aorta: Object.freeze({
    id: 'aorta',
    label: 'Heart and aorta',
    labelJa: '心臓＋大動脈',
  }),
  heart: Object.freeze({
    id: 'heart',
    label: 'Heart only',
    labelJa: '心臓だけ',
  }),
});

/** Where the scene opens, and where "reset display" returns to. */
export const HEART_DEFAULT_SCOPE = 'aorta';

/**
 * The one switch between the two, as the panel shows it: on is `aorta`.
 *
 * One switch, not a checkbox per vessel. Hiding one vessel at a time is what
 * the part tree is for; this is the choice between two framings of the organ.
 */
export const HEART_SCOPE_SWITCH = Object.freeze({
  on: 'aorta',
  off: 'heart',
  label: 'Aorta and main branches',
  labelJa: '大動脈・主要分枝を表示',
  hint: 'Off shows the heart on its own, larger, turning about its own centre.',
  hintJa: 'オフにすると心臓だけを大きく表示し、心臓の中心で回転します。',
});

/**
 * How far past the heart the roots are drawn when only the heart is shown.
 *
 * Measured outward from the box around the fourteen heart parts, in the
 * source's millimetres: a root is drawn fully up to `marginMm` beyond that box
 * and fades out over the next `fadeMm`. **A composition, not anatomy** — it is
 * chosen so that the base of the heart reads as a base (the vessels visibly
 * leave it, and the coronary arteries arise from an aorta) while the inferior
 * vena cava, which the source draws down to the pelvis, stops being the
 * tallest thing in the frame. Re-judge it from pictures if it changes.
 *
 * **The fade is short on purpose.** Over 10 mm, the band where both walls of
 * the inferior vena cava are half drawn showed the background through it as a
 * white oval — from the right and from below it read as a hole in the vein.
 * Over 3 mm it reads as where the vein is cut, and the double-sided surface
 * shows its inside there, as a transected vessel does.
 */
export const HEART_ONLY_TRIM = Object.freeze({ marginMm: 1, fadeMm: 3 });

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
    extent: 'heart',
    reach: null,
    schematic: false,
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
 * ## `extent` is about framing, not about importance
 *
 * Which of the scene's two ways of looking draws a vessel — see
 * `HEART_SCOPES`. The roots of the great vessels are drawn in both; the arch,
 * the descending aorta, every branch of the aorta and the brachiocephalic
 * veins are drawn with the aorta and not in the heart on its own.
 *
 * ## `distal` is now only the brachiocephalic veins
 *
 * It used to hide the arch branches and the descending aorta too, so the
 * scene opened on a heart with an arch that had three holes in its top and
 * no aorta below it. They are part of the opening view now, because the
 * opening view is the heart **and** its aorta. The two brachiocephalic veins
 * still start hidden: they are veins, they stand in front of the origins of
 * the arch branches from the anterior view, and they are one click away.
 *
 * ## `reach` — where a branch is drawn to
 *
 * A branch is shown for its first few centimetres and **fades out** where the
 * display range ends, rather than being cut square or capped: a vessel that
 * ends in a rounded tip reads as a vessel that ends, and none of these do.
 * `from` is where the branch leaves its parent and `toward` a point further
 * along it, both in the source file's own millimetres and both measured from
 * the file (`docs/model-evidence/heart-anatomy.md`, "The aorta and its
 * branches"); the branch is drawn fully for `visibleMm − fadeMm` along that
 * line and fades to nothing at `visibleMm`. Where `visibleMm` is the branch's
 * own length the fade is simply its end; where it is shorter — the left common
 * carotid, which the source draws a further five centimetres up the neck — it
 * is the display range, matched to where the schematic right common carotid
 * ends so the two sides are drawn to the same height.
 */
export const HEART_VESSELS = Object.freeze([
  vessel('VH_M_ascending_aorta', ['VH_M_ascending_aorta'], 'Ascending aorta', '上行大動脈', 'UBERON:0001496', 'greatVessel', 'artery', 'ascending aorta', { extent: 'heart' }),
  vessel('VH_M_aortic_arch', ['VH_M_aortic_arch'], 'Arch of the aorta', '大動脈弓', 'UBERON:0001508', 'greatVessel', 'artery', 'arch of aorta', { extent: 'beyond' }),
  vessel('VH_M_descending_aorta', ['VH_M_descending_aorta_a', 'VH_M_descending_aorta_b'], 'Descending aorta', '下行大動脈', 'UBERON:0001514', 'greatVessel', 'artery', 'descending aorta', { extent: 'beyond' }),
  vessel('VH_M_pulmonary_trunk', ['VH_M_pulmonary_trunk'], 'Pulmonary trunk', '肺動脈幹', 'UBERON:0002333', 'greatVessel', 'artery', 'pulmonary trunk', { extent: 'heart' }),
  vessel('VH_M_pulmonary_artery_L', ['VH_M_pulmonary_artery_L'], 'Left pulmonary artery', '左肺動脈', 'UBERON:0001652', 'greatVessel', 'artery', 'left pulmonary artery', { extent: 'heart' }),
  vessel('VH_M_pulmonary_artery_R', ['VH_M_pulmonary_artery_R'], 'Right pulmonary artery', '右肺動脈', 'UBERON:0001651', 'greatVessel', 'artery', 'right pulmonary artery', { extent: 'heart' }),
  vessel('VH_M_superior_vena_cava', ['VH_M_superior_vena_cava'], 'Superior vena cava', '上大静脈', 'FMA:4720', 'greatVessel', 'vein', 'superior vena cava', { extent: 'root' }),
  vessel('VH_M_inferior_vena_cava', ['VH_M_inferior_vena_cava_a', 'VH_M_inferior_vena_cava_b'], 'Inferior vena cava', '下大静脈', 'FMA:10951', 'greatVessel', 'vein', 'inferior vena cava', {
    extent: 'root',
    // The source draws it down to where the common iliac veins join it, and
    // has no iliac vein in what this scene takes: faded there, like the
    // aorta's branches, rather than left as two cut rings beside the aortic
    // bifurcation.
    reach: reach([-20.0, 450.0, 5.0], [-3.0, 172.0, 19.0], 272, 16),
    // With only the heart shown: a short root below the right atrium. It runs
    // up the back of the heart *inside* the heart's box (the box reaches down
    // to the apex, y 423), so trimmed at the box it kept 35 mm of vein, and a
    // hollow in its own surface there showed the background through it from
    // the right and from below once the vein behind was trimmed away. Its top
    // is at y 457.
    heartOnlyFloorMm: 447,
  }),
  vessel('VH_M_pulmonary_vein_L_sup', ['VH_M_pulmonary_vein_L_sup'], 'Left superior pulmonary vein', '左上肺静脈', 'FMA:49916', 'greatVessel', 'vein', 'left superior pulmonary vein', { extent: 'heart' }),
  vessel('VH_M_pulmonary_vein_L_inf', ['VH_M_pulmonary_vein_L_inf'], 'Left inferior pulmonary vein', '左下肺静脈', 'FMA:49913', 'greatVessel', 'vein', 'left inferior pulmonary vein', { extent: 'heart' }),
  vessel('VH_M_pulmonary_vein_R_sup', ['VH_M_pulmonary_vein_R_sup'], 'Right superior pulmonary vein', '右上肺静脈', 'FMA:49914', 'greatVessel', 'vein', 'right superior pulmonary vein', { extent: 'heart' }),
  vessel('VH_M_pulmonary_vein_R_inf', ['VH_M_pulmonary_vein_R_inf'], 'Right inferior pulmonary vein', '右下肺静脈', 'FMA:49911', 'greatVessel', 'vein', 'right inferior pulmonary vein', { extent: 'heart' }),

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

  vessel('VH_M_brachiocephalic_artery', ['VH_M_brachiocephalic_artery_a', 'VH_M_brachiocephalic_artery_b'], 'Brachiocephalic artery', '腕頭動脈', 'UBERON:0001529', 'archBranch', 'artery', 'brachiocephalic artery', {
    extent: 'beyond',
    // Only its last few millimetres: the rounded tip the source closes it
    // with, at the level where it divides. The two schematic branches begin
    // inside it **before** that, at its full calibre, so they carry on from
    // it with no gap; left drawn, the tip stood out round them as a collar.
    reach: reach([-4.5, 562.9, 22.6], [-27.0, 606.8, 25.0], 46.5, 4.5),
  }),
  vessel('VH_M_left_common_carotid_artery', ['VH_M_left_common_carotid_artery_a', 'VH_M_left_common_carotid_artery_b'], 'Left common carotid artery and its branches', '左総頸動脈とその分枝', 'UBERON:0001536', 'archBranch', 'artery', 'left common carotid artery plus branches', {
    extent: 'beyond',
    reach: reach([8.3, 569.0, 16.3], [31.4, 683.1, 29.3], 65, 14),
  }),
  vessel('VH_M_left_subclavian_artery', ['VH_M_left_subclavian_artery_a', 'VH_M_left_subclavian_artery_b'], 'Left subclavian artery', '左鎖骨下動脈', 'UBERON:0001584', 'archBranch', 'artery', 'left subclavian artery', {
    extent: 'beyond',
    reach: reach([14.5, 567.8, 4.7], [26.7, 614.0, 8.3], 48, 14),
  }),

  // --- the abdominal aorta's branches, kept from outside the heart subtree ---
  //
  // In the order they leave the aorta, top to bottom, and each at the opening
  // the source's own descending aorta has for it (measured; see the evidence
  // dossier). Filed by the publisher under the organs they supply — liver,
  // kidney, large intestine — and carried here with those names and ids.
  vessel('VH_M_celiac_trunk', ['VH_M_celiac_trunk'], 'Coeliac trunk', '腹腔動脈', 'FMA:14812', 'abdominalBranch', 'artery', 'Celiac trunk', {
    extent: 'beyond',
    reach: reach([12.5, 331.7, 4.9], [15.1, 354.9, 15.1], 25, 8),
  }),
  vessel('VH_M_superior_mesenteric_artery', ['VH_M_superior_mesenteric_artery'], 'Superior mesenteric artery', '上腸間膜動脈', 'UBERON:0001182', 'abdominalBranch', 'artery', 'superior mesenteric artery', {
    extent: 'beyond',
    reach: reach([12.5, 317.7, 10.7], [12.8, 274.3, 52.1], 59, 16),
  }),
  /**
   * **The two renal arteries are shown under the names their position gives
   * them**, which are not the names the file records.
   *
   * The mesh the file records as `VH_M_left_renal_artery` (label "left renal
   * artery", UBERON:0001186) leaves the **right** side of the aorta, runs to
   * the right for the longer distance and ends beside the vessel the same file
   * records as the right renal vein; the one it records as right does the
   * mirror of that, shorter, on the left. That this is the two labels and not a
   * mirrored file was checked (`docs/model-evidence/heart-anatomy.md`, claim
   * 16): nothing in the file or the scene mirrors anything, and every
   * independent left/right marker in the file puts the body's left at +x. The
   * ids stay the node names, because an id is opaque; the reader sees the
   * standard name, and the detail tab says what the file records and keeps its
   * label and term — without telling the reader the file is wrong.
   */
  vessel('VH_M_left_renal_artery', ['VH_M_left_renal_artery'], 'Right renal artery', '右腎動脈', 'UBERON:0001185', 'abdominalBranch', 'artery', 'left renal artery', {
    extent: 'beyond',
    reach: reach([3.2, 302.9, 9.2], [-50.6, 313.1, -10.2], 58, 14),
    sideSwapped: { sourceOntologyId: 'UBERON:0001186' },
  }),
  vessel('VH_M_right_renal_artery', ['VH_M_right_renal_artery'], 'Left renal artery', '左腎動脈', 'UBERON:0001186', 'abdominalBranch', 'artery', 'right renal artery', {
    extent: 'beyond',
    reach: reach([21.2, 300.1, 6.0], [53.1, 312.2, -19.4], 43, 12),
    sideSwapped: { sourceOntologyId: 'UBERON:0001185' },
  }),
  vessel('VH_M_inferior_mesenteric_artery', ['VH_M_inferior_mesenteric_artery'], 'Inferior mesenteric artery', '下腸間膜動脈', 'UBERON:0001183', 'abdominalBranch', 'artery', 'inferior mesenteric artery', {
    extent: 'beyond',
    reach: reach([15.2, 198.8, 27.9], [20.9, 172.1, 29.2], 27, 10),
  }),

  vessel('VH_M_brachiocephalic_vein_L', ['VH_M_brachiocephalic_vein_L'], 'Left brachiocephalic vein', '左腕頭静脈', 'FMA:4761', 'cavalTributary', 'vein', 'Left brachiocephalic vein', { extent: 'beyond', distal: true }),
  vessel('VH_M_brachiocephalic_vein_R', ['VH_M_brachiocephalic_vein_R'], 'Right brachiocephalic vein', '右腕頭静脈', 'FMA:4751', 'cavalTributary', 'vein', 'Right brachiocephalic vein', { extent: 'beyond', distal: true }),
]);

/**
 * A display range, in the source file's own millimetres. See `HEART_VESSELS`.
 *
 * @param {number[]} from where the branch leaves its parent
 * @param {number[]} toward a point further along it, setting the direction
 * @param {number} visibleMm how far along that direction it is drawn
 * @param {number} fadeMm over how much of that it fades out
 */
function reach(from, toward, visibleMm, fadeMm) {
  return Object.freeze({ from: Object.freeze(from), toward: Object.freeze(toward), visibleMm, fadeMm });
}

/** The note a side-swapped renal artery carries. A declaration, so the table above can use it. */
function sideSwappedNote(source) {
  const other = source === 'left' ? 'right' : 'left';
  const ja = (side) => (side === 'left' ? '左' : '右');
  return {
    en:
      `In the source file this vessel is recorded under the name "${source} renal artery". This model shows it as ` +
      `the ${other} renal artery, from where it lies: it leaves the ${other} side of the aorta and runs towards the ` +
      `${other} kidney, beside the vessel the same file records as the ${other} renal vein. The source\'s own label ` +
      'and ontology id are kept unchanged. What that judgement rests on — the file\'s axes, checked against the ' +
      'heart, the aortic arch, the venae cavae, the liver\'s and spleen\'s vessels and the renal veins — is in the ' +
      'model\'s evidence record.',
    ja:
      `出典ファイルでは、この血管は「${ja(source)}腎動脈」という名前で収録されています。このモデルでは位置関係から` +
      `${ja(other)}腎動脈として表示しています——大動脈の${ja(other)}側から出て${ja(other)}の腎臓の方へ向かい、同じファイルが` +
      `「${ja(other)}腎静脈」としている血管と並んでいます。出典の名前（label）と ontology id は変えずに残しています。` +
      '判断の根拠（ファイルの座標軸を、心臓・大動脈弓・上下大静脈・肝臓と脾臓の血管・腎静脈と照らし合わせた結果）は、' +
      'モデルの根拠資料に記録しています。',
  };
}

function vessel(id, meshNames, name, nameJa, ontologyId, group, vesselType, sourceLabel, extra = {}) {
  const swapped = extra.sideSwapped ? sideSwappedNote(/left/.test(sourceLabel) ? 'left' : 'right') : null;
  return Object.freeze({
    id,
    meshNames: Object.freeze(meshNames),
    name,
    nameJa,
    ontologyId,
    group,
    vesselType,
    sourceLabel,
    /** The term the source put on this mesh, when this table had to name it otherwise. */
    sourceOntologyId: extra.sideSwapped?.sourceOntologyId ?? null,
    distal: Boolean(extra.distal),
    extent: extra.extent ?? 'heart',
    reach: extra.reach ?? null,
    /** With only the heart shown, drawn no lower than this (source mm) — see `_heartTrim`. */
    heartOnlyFloorMm: extra.heartOnlyFloorMm ?? null,
    schematic: false,
    descriptionKey: extra.descriptionKey ?? null,
    /**
     * The source's own records for this mesh do not agree with each other.
     *
     * Not a doubt of ours and not an anatomical opinion: the file's node name
     * and its label/ontology id name different vessels. Surfaced wherever the
     * structure is named so a reader does not take the name as settled.
     */
    identityConflict: Boolean(extra.identityConflict),
    /**
     * The source's name for this mesh contradicts where the mesh goes, and it
     * is named here by where it goes. A different state from the one above:
     * there the name is left unsettled, here it is settled and the source is
     * reported as disagreeing with it.
     */
    sideSwapped: Boolean(extra.sideSwapped),
    note: extra.note ?? swapped?.en ?? null,
    noteJa: extra.noteJa ?? swapped?.ja ?? null,
    enclosedMl: null,
    closed: null,
  });
}

/**
 * Four arteries the source does not contain, drawn **schematically** for their
 * first two or three centimetres.
 *
 * The source's brachiocephalic trunk ends, rounded off, at the level where it
 * divides — with nothing leaving it. Its descending aorta ends at the level of
 * its bifurcation with **two openings**, one each side, and no iliac artery in
 * the file at all (its pelvic vessels are veins only). Drawn as they are, both
 * read as vessels that end; neither does.
 *
 * So each of these is a short tube that begins **inside** the end or opening
 * the source leaves — on that vessel's centreline, measured from its
 * cross-sections, and running the parent's own way for its first few
 * millimetres before it turns, so the ring it starts with stays inside the
 * parent's wall — its calibre taken from that opening, or from the source's
 * left-sided counterpart at the same height — and runs the way standard
 * anatomy says it runs, routed clear of the source's own vessels (the right
 * subclavian behind the right brachiocephalic vein; the right common iliac in
 * front of the inferior vena cava). Its length, angle and course are **not**
 * this specimen's: nothing was measured from the Visible Human for them, and
 * each is marked as schematic wherever it is named.
 *
 * `path` is the centreline in the source's millimetres. `radiusMm` is its
 * radius where it starts (a few millimetres inside the vessel it leaves,
 * flared to the opening so no ring shows where the two meet — an ostium is
 * wider than the vessel beyond it), along its body, and at its end; `flareMm`
 * is how far along it the flare lasts. The fade is the same `reach` every
 * branch has.
 */
export const HEART_SCHEMATIC = Object.freeze([
  schematic('schematic_right_common_carotid_artery', 'Right common carotid artery (start)', '右総頸動脈（起始部）', 'archBranch', {
    parent: 'VH_M_brachiocephalic_artery',
    path: [[-18.1, 592.0, 23.9], [-23.3, 600.3, 24.0], [-26.0, 609.0, 25.0], [-28.0, 620.0, 26.0], [-29.8, 632.0, 27.4]],
    radiusMm: { start: 3.0, body: 2.5, end: 2.3, flareMm: 14 },
    reach: reach([-25.6, 606.0, 24.8], [-29.8, 632.0, 27.4], 26, 11),
    course: 'ascends into the neck',
    courseJa: '頸部を上行する',
  }),
  schematic('schematic_right_subclavian_artery', 'Right subclavian artery (start)', '右鎖骨下動脈（起始部）', 'archBranch', {
    parent: 'VH_M_brachiocephalic_artery',
    path: [[-18.1, 592.0, 23.9], [-23.3, 600.3, 23.9], [-30.5, 604.5, 18.0], [-39.0, 606.5, 11.5], [-48.0, 605.0, 7.5]],
    radiusMm: { start: 3.1, body: 2.9, end: 2.7, flareMm: 12 },
    reach: reach([-27.5, 603.5, 20.5], [-48.0, 605.0, 7.5], 24, 11),
    course: 'arches laterally, behind the right brachiocephalic vein',
    courseJa: '右腕頭静脈の後ろを外側へ弓状に走る',
  }),
  schematic('schematic_right_common_iliac_artery', 'Right common iliac artery (start)', '右総腸骨動脈（起始部）', 'abdominalBranch', {
    parent: 'VH_M_descending_aorta',
    path: [[7.2, 193.0, 25.1], [2.8, 188.0, 28.0], [-2.5, 182.5, 30.0], [-8.5, 175.5, 30.2], [-14.0, 167.5, 29.0]],
    radiusMm: { start: 4.1, body: 3.5, end: 3.3, flareMm: 6 },
    reach: reach([5.2, 190.8, 25.0], [-14.0, 167.5, 29.0], 30, 12),
    course: 'runs down and to the right, in front of the inferior vena cava',
    courseJa: '下大静脈の前を右下へ走る',
  }),
  schematic('schematic_left_common_iliac_artery', 'Left common iliac artery (start)', '左総腸骨動脈（起始部）', 'abdominalBranch', {
    parent: 'VH_M_descending_aorta',
    path: [[14.25, 190.9, 23.3], [15.76, 184.1, 22.8], [18.5, 176.5, 22.3], [22.8, 168.0, 21.5], [27.0, 160.5, 20.5]],
    radiusMm: { start: 3.1, body: 2.8, end: 2.7, flareMm: 6 },
    reach: reach([14.9, 188.0, 23.1], [27.0, 160.5, 20.5], 30, 12),
    course: 'runs down and to the left',
    courseJa: '左下へ走る',
  }),
]);

function schematic(id, name, nameJa, group, spec) {
  return Object.freeze({
    id,
    name,
    nameJa,
    // No ontology id is quoted for a structure the source does not contain:
    // the term would be ours, and it would look exactly like one of theirs.
    ontologyId: null,
    group,
    vesselType: 'artery',
    sourceLabel: null,
    sourceOntologyId: null,
    distal: false,
    extent: 'beyond',
    reach: spec.reach,
    schematic: true,
    parent: spec.parent,
    path: Object.freeze(spec.path.map((point) => Object.freeze(point))),
    radiusMm: Object.freeze({ ...spec.radiusMm }),
    course: spec.course,
    courseJa: spec.courseJa,
    descriptionKey: 'schematic',
    identityConflict: false,
    sideSwapped: false,
    note: null,
    noteJa: null,
    enclosedMl: null,
    closed: null,
  });
}

/**
 * What the scene takes from the vasculature file: the publisher's own subtree
 * of the vessels of the heart, and the five abdominal branches by name.
 */
export const HEART_VESSEL_SUBTREE = 'VH_M_blood_vasculature_of_heart';
export const HEART_VESSEL_NODES_OUTSIDE_SUBTREE = Object.freeze([
  'VH_M_celiac_trunk',
  'VH_M_superior_mesenteric_artery',
  'VH_M_left_renal_artery',
  'VH_M_right_renal_artery',
  'VH_M_inferior_mesenteric_artery',
]);

/** Everything the scene can name: the heart's own parts, the vessels, then what is drawn schematically. */
export const HEART_STRUCTURES = Object.freeze([...HEART_PARTS, ...HEART_VESSELS, ...HEART_SCHEMATIC]);

const BY_ID = new Map(HEART_STRUCTURES.map((entry) => [entry.id, entry]));

/**
 * The order a reader meets the structures in, in the parts tree and the lists
 * built from it.
 *
 * Not the tables' order, which the colours are spread along and so must not
 * move, and not the file's, which is what the tree used to follow: it listed
 * the coronary arteries as left anterior descending, right marginal, posterior
 * descending, diagonal, **then** left coronary, and put the two right-sided arch
 * branches after the left ones. The heart comes first, its chambers and valves
 * in the order blood passes through them; then the vessels on its surface; then
 * the aorta from the valve down, each group top to bottom. A schematic segment
 * follows the vessel it continues — the right common carotid and subclavian
 * straight after the brachiocephalic trunk, as they are on the arch.
 */
const READING_GROUPS = Object.freeze([
  'chamber', 'valve', 'papillary', 'coronary', 'cardiacVein', 'greatVessel', 'archBranch', 'abdominalBranch', 'cavalTributary',
]);
const FLOW_ORDER = Object.freeze([
  'VH_M_right_cardiac_atrium',
  'VH_M_heart_right_ventricle',
  'VH_M_left_cardiac_atrium',
  'VH_M_heart_left_ventricle',
  'VH_M_interventricular_septum',
  'VH_M_tricuspid_valve',
  'VH_M_pulmonary_valve',
  'VH_M_mitral_valve',
  'VH_M_aortic_valve',
  // The right ventricle's, then the left's.
  'VH_M_papillary_muscle_of_heart_medial',
  'VH_M_papillary_muscle_of_heart_posterior',
  'VH_M_papillary_muscle_of_heart_anterior',
  'VH_M_papillary_muscle_of_heart_anterolateral',
  'VH_M_papillary_muscle_of_heart_posteromedial',
]);
export const HEART_READING_ORDER = Object.freeze(
  READING_GROUPS.flatMap((group) => {
    const members = [...HEART_PARTS, ...HEART_VESSELS]
      .filter((entry) => entry.group === group)
      .sort((a, b) => flowRank(a.id) - flowRank(b.id));
    const order = [];
    for (const member of members) {
      order.push(member.id);
      for (const segment of HEART_SCHEMATIC) if (segment.group === group && segment.parent === member.id) order.push(segment.id);
    }
    for (const segment of HEART_SCHEMATIC) if (segment.group === group && !order.includes(segment.id)) order.push(segment.id);
    return order;
  })
);
function flowRank(id) {
  const at = FLOW_ORDER.indexOf(id);
  return at < 0 ? FLOW_ORDER.length : at;
}
const READING_RANK = new Map(HEART_READING_ORDER.map((id, at) => [id, at]));
/** Where a structure comes in `HEART_READING_ORDER`; anything unknown goes last. */
export const heartReadingRank = (id) => READING_RANK.get(id) ?? HEART_READING_ORDER.length;

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
    // came out of, which is the fact a reader of a two-source model needs —
    // and, for the four drawn here rather than taken from either file, that
    // they came out of neither.
    side: entry.schematic ? 'Schematic' : entry.meshNames ? 'Vessels' : 'Heart',
    sideJa: entry.schematic ? '模式' : entry.meshNames ? '血管' : '心臓',
    /** `heart`, `root` or `beyond` — which of the two ways of looking draws it (`HEART_SCOPES`). */
    extent: entry.extent,
    schematic: entry.schematic,
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
    // What the structure is, then what this model does with it — two
    // paragraphs, so a reader who came for the anatomy finds it first.
    description: [ANATOMY[entry.id]?.en, describe(entry).en].filter(Boolean).join('\n\n'),
    descriptionJa: [ANATOMY[entry.id]?.ja, describe(entry).ja].filter(Boolean).join('\n\n'),
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
    identity: entry.identityConflict ? 'source-conflict' : entry.sideSwapped ? 'side-corrected' : entry.schematic ? 'schematic' : null,
    // No short mark for a name given by position: the name shown is the
    // standard one, and what the source calls the mesh is said in the detail
    // tab (`note`), not beside the name.
    identityNote: entry.identityConflict
      ? IDENTITY_UNSETTLED.en
      : entry.schematic ? SCHEMATIC_MARK.en : null,
    identityNoteJa: entry.identityConflict
      ? IDENTITY_UNSETTLED.ja
      : entry.schematic ? SCHEMATIC_MARK.ja : null,
    /** The source's own term, when the name above is not the one the source gave this mesh. */
    sourceOntologyId: entry.sourceOntologyId ?? null,
  };
}

/** Not in either file: drawn here to show where an artery begins and which way it runs. */
const SCHEMATIC_MARK = Object.freeze({ en: 'schematic', ja: '模式' });

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

/**
 * What a structure **is**, in the words of a textbook — for the aorta and its
 * branches, which a reader comes to this view to learn.
 *
 * Found on the real screen: selecting the coeliac trunk or a renal artery gave
 * only where the mesh came from and what is still being checked, and not one
 * word about the vessel.
 *
 * **Every statement here was checked against a source that was actually
 * opened**: OpenStax, *Anatomy and Physiology 2e*, §20.5 "Circulatory
 * Pathways" (and the sections on the heart and fetal circulation), read from
 * the publisher's own source at commit `5ae32b3` — the table of what was
 * checked, where, and what was not is in `docs/model-evidence/heart-anatomy.md`
 * ("Reference check"). The first draft of this table was written from memory
 * of other textbooks; everything in it that the opened source does not say —
 * most vertebral levels, the distances between branches, relations to the
 * trachea and the veins, variants — was taken out rather than kept on
 * trust. **These are the textbook's account, not measurements of this
 * specimen**, and a level is written "typically" wherever one is given. Where
 * the source model's shape and that account differ, the text says which is
 * which and does not call the difference a variant.
 */
const ANATOMY = Object.freeze({
  VH_M_ascending_aorta: Object.freeze({
    en: 'The first part of the aorta. It rises from the left ventricle for about 5 cm and ends at the level of the sternal angle, where the arch begins. The right and left coronary arteries arise from its root, from two of the three aortic sinuses just above the aortic valve.',
    ja: '大動脈の最初の部分です。左心室から上方へ約 5 cm 上り、胸骨角の高さで大動脈弓に続きます。左右の冠動脈は、大動脈弁のすぐ上にある 3 つの大動脈洞のうち 2 つから出ます。',
  }),
  VH_M_aortic_arch: Object.freeze({
    en: 'Continues the ascending aorta as an arc to the left and becomes the descending aorta, typically at the level of the disc between the fourth and fifth thoracic vertebrae. It gives off three major branches: the brachiocephalic trunk first, then the left common carotid and the left subclavian arteries. The ligamentum arteriosum — the remnant of the fetal ductus arteriosus, which joined the pulmonary trunk to the aorta — is not in this model.',
    ja: '上行大動脈に続いて左へ弓なりに曲がり、典型的には第 4・第 5 胸椎の間の椎間円板の高さで下行大動脈に続きます。3 本の主要な分枝を出し、最初が腕頭動脈、続いて左総頸動脈、左鎖骨下動脈です。胎生期の動脈管（肺動脈幹と大動脈を結んでいた血管）の遺残である動脈管索は、このモデルにありません。',
  }),
  VH_M_descending_aorta: Object.freeze({
    en: 'Continues the arch downward close to the bodies of the vertebrae and passes through the aortic hiatus of the diaphragm. Above the hiatus it is called the thoracic aorta and below it the abdominal aorta, which runs to the left of the vertebral column and typically divides into the two common iliac arteries at the level of the fourth lumbar vertebra. The source records the whole length as one structure, so it is selected as one here. Its smaller branches — intercostal, lumbar and others — are not in the source and are not drawn.',
    ja: '大動脈弓に続いて椎体の近くを下り、横隔膜の大動脈裂孔を通ります。裂孔より上を胸部大動脈、下を腹部大動脈と呼びます。腹部大動脈は脊柱の左側を下り、典型的には第 4 腰椎の高さで左右の総腸骨動脈に分かれます。出典は全長を 1 つの構造として収録しているため、ここでも 1 つとして選びます。肋間動脈・腰動脈などの細い枝は出典になく、描いていません。',
  }),
  VH_M_brachiocephalic_artery: Object.freeze({
    en: 'The first branch of the arch, on the right side only — there is no left counterpart. It divides into the right subclavian and right common carotid arteries, which supply the head and neck, the upper limb and the chest wall on the right.',
    ja: '大動脈弓の最初の分枝で、右側にだけあります（左側に対応する血管はありません）。右鎖骨下動脈と右総頸動脈に分かれ、右側の頭頸部・上肢・胸壁へ血液を送ります。',
  }),
  schematic_right_common_carotid_artery: Object.freeze({
    en: 'Arises from the brachiocephalic trunk. Like the left one, it divides into the external and internal carotid arteries and supplies its own side of the head and neck.',
    ja: '腕頭動脈から出ます。左と同じく外頸動脈と内頸動脈に分かれ、頭頸部の右側を栄養します。',
  }),
  schematic_right_subclavian_artery: Object.freeze({
    en: 'Arises from the brachiocephalic trunk. It gives off the internal thoracic, vertebral and thyrocervical arteries and continues as the axillary artery towards the arm.',
    ja: '腕頭動脈から出ます。内胸動脈・椎骨動脈・甲状頸動脈を出し、腋窩動脈となって上肢へ続きます。',
  }),
  VH_M_left_common_carotid_artery: Object.freeze({
    en: 'Arises directly from the arch — the right common carotid comes from the brachiocephalic trunk instead. It divides into the external and internal carotid arteries and supplies the left side of the head and neck. The source carries it on into its branches in the neck; here it fades out at the height the right one does.',
    ja: '大動脈弓から直接出ます（右総頸動脈は腕頭動脈から出ます）。外頸動脈と内頸動脈に分かれ、頭頸部の左側を栄養します。出典は頸部の分枝まで含めて収録していますが、ここでは右と同じ高さで薄れて消えます。',
  }),
  VH_M_left_subclavian_artery: Object.freeze({
    en: 'Arises directly from the arch — the right subclavian comes from the brachiocephalic trunk instead. It gives off the internal thoracic, vertebral and thyrocervical arteries and continues as the axillary artery towards the arm; those branches are not in the source.',
    ja: '大動脈弓から直接出ます（右鎖骨下動脈は腕頭動脈から出ます）。内胸動脈・椎骨動脈・甲状頸動脈を出し、腋窩動脈となって上肢へ続きます。これらの枝は出典にありません。',
  }),
  VH_M_celiac_trunk: Object.freeze({
    en: 'A single (unpaired) branch of the abdominal aorta, above the superior mesenteric artery. It divides into the left gastric, splenic and common hepatic arteries, which supply the stomach and oesophagus, the spleen, the liver and gallbladder, and parts of the duodenum and pancreas.',
    ja: '腹部大動脈の不対の枝で、上腸間膜動脈より上から出ます。左胃動脈・脾動脈・総肝動脈に分かれ、胃と食道、脾臓、肝臓と胆嚢、十二指腸と膵臓の一部を栄養します。',
  }),
  VH_M_superior_mesenteric_artery: Object.freeze({
    en: 'A single (unpaired) branch of the abdominal aorta, below the coeliac trunk. It supplies the small intestine (duodenum, jejunum and ileum), the pancreas and most of the large intestine.',
    ja: '腹部大動脈の不対の枝で、腹腔動脈の下から出ます。小腸（十二指腸・空腸・回腸）、膵臓、大腸の大部分を栄養します。',
  }),
  // Keyed by node id: this mesh is shown as the right renal artery (see HEART_VESSELS).
  VH_M_left_renal_artery: Object.freeze({
    en: 'One of the paired renal arteries, below the superior mesenteric artery; it supplies the right kidney. Because the aorta lies to the left of the vertebral column, the right renal artery is the longer of the two.',
    ja: '上腸間膜動脈より下で出る左右一対の腎動脈のうち右側で、右の腎臓を栄養します。大動脈が脊柱の左側にあるため、右腎動脈は左より長くなります。',
  }),
  // Keyed by node id: this mesh is shown as the left renal artery (see HEART_VESSELS).
  VH_M_right_renal_artery: Object.freeze({
    en: 'One of the paired renal arteries, below the superior mesenteric artery; it supplies the left kidney. Because the aorta lies to the left of the vertebral column, it is shorter than the right.',
    ja: '上腸間膜動脈より下で出る左右一対の腎動脈のうち左側で、左の腎臓を栄養します。大動脈が脊柱の左側にあるため、右より短くなります。',
  }),
  VH_M_inferior_mesenteric_artery: Object.freeze({
    en: 'The lowest single (unpaired) branch of the abdominal aorta, arising above the point where the aorta divides into the common iliac arteries (about 5 cm above it, in OpenStax\'s account). It supplies the distal part of the large intestine and the rectum. In this model, the source\'s own shape has it leaving just above that division — lower than that account. Whether that reflects this body or how the model was made is not established.',
    ja: '腹部大動脈の不対の枝のうち最も下にあり、総腸骨動脈に分かれる位置より上から出ます（OpenStax の記載では約 5 cm 上）。大腸の遠位部と直腸を栄養します。このモデルでは、出典の形状のまま分岐部のすぐ上から出ており、この記載より低い位置です。それがこの人の体の特徴なのか、モデル作成上のものなのかは確認できていません。',
  }),
  schematic_right_common_iliac_artery: Object.freeze({
    en: 'The right of the two arteries the abdominal aorta divides into, typically at the level of the fourth lumbar vertebra. It divides in turn into the external and internal iliac arteries at about the level of the lumbosacral joint, supplying the pelvis and the lower limb.',
    ja: '腹部大動脈が典型的には第 4 腰椎の高さで分かれてできる 2 本のうち右側です。腰仙関節のあたりの高さで外腸骨動脈と内腸骨動脈に分かれ、骨盤と下肢へ血液を送ります。',
  }),
  schematic_left_common_iliac_artery: Object.freeze({
    en: 'The left of the two arteries the abdominal aorta divides into, typically at the level of the fourth lumbar vertebra. It divides in turn into the external and internal iliac arteries at about the level of the lumbosacral joint, supplying the pelvis and the lower limb.',
    ja: '腹部大動脈が典型的には第 4 腰椎の高さで分かれてできる 2 本のうち左側です。腰仙関節のあたりの高さで外腸骨動脈と内腸骨動脈に分かれ、骨盤と下肢へ血液を送ります。',
  }),
});

/** A structure's textbook anatomy, when this table has written one. */
export const heartAnatomyNote = (id) => ANATOMY[id] ?? null;

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
    en: 'An arterial branch of the aortic arch, present in the source. It is drawn for its first few centimetres and fades out where the display range ends — it continues into the neck or the arm. Shown with the aorta, not in the heart on its own. A surface model as the source recorded it; wall thickness, and lumen versus outside, are still being checked.',
    ja: '大動脈弓から分かれる動脈で、出典に収録されています。起始から数 cm を描き、表示範囲の終わりで薄れて消えます（実際には頸部や上肢へ続きます）。大動脈と一緒に表示し、心臓だけの表示では隠します。出典に収録された表面モデルで、壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。',
  }),
  abdominalBranch: Object.freeze({
    en: 'An artery leaving the abdominal aorta, present in the source and filed there under the organ it supplies. It is drawn from where it leaves the aorta and fades out before that organ — the organ itself is not in this model. Shown with the aorta, not in the heart on its own. A surface model as the source recorded it; wall thickness, and lumen versus outside, are still being checked.',
    ja: '腹部大動脈から出る動脈で、出典では栄養する臓器の項目に収録されています。大動脈から出るところから描き、臓器に届く手前で薄れて消えます（臓器そのものはこのモデルにありません）。大動脈と一緒に表示し、心臓だけの表示では隠します。出典に収録された表面モデルで、壁厚の表現と、内腔・外表面のどちらに対応するかは確認中です。',
  }),
  schematic: Object.freeze({
    en: 'Not in the source file. A short schematic segment, drawn here so the vessel it leaves does not appear to end: it begins inside the end or opening the source leaves for it, takes its calibre from that opening, and runs the way standard anatomy describes. Its length, angle and course are not measured from this specimen. It fades out where the display range ends.',
    ja: '出典ファイルには含まれていません。分かれ元の血管が行き止まりに見えないよう、ここで描き足した短い模式的な区間です。出典が残している末端・開口の内側から始まり、太さはその開口に合わせ、走行は標準的な解剖の記載に従っています。長さ・角度・走行はこの標本から計測したものではありません。表示範囲の終わりで薄れて消えます。',
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
  abdominalBranch: Object.freeze([110, 146]),
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
      text: 'Fifty-five structures, each selectable and named in English and Japanese: fifty-one from two files of one release, and four short arterial segments drawn schematically where the source stops.',
      textJa: '55 構造。1 つずつ選べて、英語と日本語の名前が付いています。51 は同じリリースの 2 ファイルから、4 つは出典が途切れるところに模式的に描き足した短い動脈の区間です。',
    },
    {
      text: 'Two ways of looking, one switch apart: the heart with its whole aorta and the first centimetres of every major branch, or the heart on its own with the roots of its great vessels.',
      textJa: '2 つの見方をスイッチ 1 つで切り替えます。心臓と大動脈の全体（主要分枝の起始部を含む）か、大血管の付け根を残した心臓だけか。',
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
      text: 'The same question is open for every one of the forty-two vessel surfaces taken from the source: lumen or wall is not established.',
      textJa: '同じ問いが出典の血管 42 本すべてで未確定です。内腔か壁かは決まっていません。',
    },
    {
      text: 'The figures across the two files are a **sampled-vertex** distance and a frame diagnostic. They do not establish that a vessel and a chamber are joined, continuous or watertight.',
      textJa: '2 ファイル間の数値は**採用頂点間の距離**で、座標系が一致していることの診断です。血管と心腔が接合・連続・水密であることは示しません。',
    },
    {
      text: 'One structure carries a name the source itself disagrees on, and is marked as unverified rather than resolved here.',
      textJa: '出典内で名称が一致しない部位が 1 つあり、こちらで決めずに「名称要確認」と表示しています。',
    },
    {
      text: 'The two renal arteries are shown under the names their position gives them, which are not the names the source file records for them. What the file calls each one, and what the judgement rests on, are in its detail tab and the evidence record.',
      textJa: '左右の腎動脈は、位置関係にもとづく名前で表示しています。出典ファイルでの名前とは左右が一致しません。出典での名前と判断の根拠は、各血管の「詳細」と根拠資料にあります。',
    },
    {
      text: '**Four segments are schematic, not specimen**: the start of the right common carotid and right subclavian arteries, and of both common iliac arteries. The source has none of them; each begins at the end or opening the source leaves, but its length, angle and course follow textbook anatomy, and each is marked "schematic".',
      textJa: '**4 つの区間は標本ではなく模式です。** 右総頸動脈・右鎖骨下動脈・左右の総腸骨動脈の起始部で、出典にはありません。出典が残す末端・開口から始まりますが、長さ・角度・走行は教科書的な解剖に従っており、「模式」と表示しています。',
    },
    {
      text: 'What the aorta\'s and its branches\' descriptions say about their course, level and territory is a textbook\'s general account (OpenStax, Anatomy and Physiology 2e, §20.5), kept to what could be checked against it — not a measurement of this specimen. No anatomist has reviewed it.',
      textJa: '大動脈と分枝の説明にある走行・高さ・栄養域は、教科書（OpenStax Anatomy and Physiology 2e、§20.5）の一般的な記載のうち照合できたものだけで、この標本を計測したものではありません。解剖学者による確認は受けていません。',
    },
    {
      text: 'A branch fades out where the display range ends. The fade is a way of saying "it continues", not a place where the vessel stops.',
      textJa: '分枝は表示範囲の終わりで薄れて消えます。これは「この先へ続く」ことを示す描き方で、血管がそこで終わっているわけではありません。',
    },
  ],
  sources: [
    {
      text: 'HuBMAP Human Reference Atlas CCF release v1.2 — VH_M_Heart.glb and VH_M_Blood_Vasculature.glb (CC BY 4.0), pinned by commit, byte count and hash. What is served is a derivative of each, pinned by its own hash.',
      textJa: 'HuBMAP Human Reference Atlas CCF v1.2 の VH_M_Heart.glb と VH_M_Blood_Vasculature.glb（CC BY 4.0）。commit・バイト数・hash で固定。表示しているのはそれぞれの派生ファイルで、その hash でも固定しています。',
      kind: 'dataset',
    },
    {
      text: 'Both source files fail glTF validation on degenerate vertex normals (408 errors and 33). The derivatives replace those normals and drop the zero-area triangles behind them, keep five more of the source\'s own aortic branches, and are compressed (no vertex moves more than 0.013 mm); they validate clean.',
      textJa: '出典の 2 ファイルは頂点法線の縮退で glTF 検証に不合格です（408 件と 33 件）。派生ファイルはその法線を置き換えて面積 0 の三角形を除き、出典自身が持つ大動脈の分枝 5 本を残し、圧縮したもの（頂点の移動は 0.013 mm 以内）で、検証を通ります。',
      kind: 'qa',
    },
    {
      text: 'No anatomist and no clinician has reviewed this geometry or these labels. The licence reading is an engineering one, not a legal review.',
      textJa: '解剖学者・臨床家によるレビューは受けていません。ライセンスの判断は技術者による読み取りで、法的な確認ではありません。',
      kind: 'limitation',
    },
  ],
  evidence: 'docs/model-evidence/heart-anatomy.md',
});

export const HEART_RELATED = Object.freeze({
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
  scenes: [
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
  note:
    '**Neither is this heart at a later date.** Each is a separate schematic model with its own '
    + 'geometry, built to show a mechanism rather than a specimen. Nothing here is deformed, cut or '
    + 'joined to make one look like the other, and no measurement crosses between them.',
  noteJa:
    '**どちらも「この心臓のその後」ではありません。** それぞれ独自の形状を持つ別の模式モデルで、'
    + '標本ではなく仕組みを見せるために作られています。片方をもう片方に似せるための変形・切断・接合は'
    + 'していませんし、計測値がまたいで使われることもありません。',
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
  related: HEART_RELATED,
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
    Object.freeze({ key: 'abdominalBranch', label: 'Abdominal branches', labelJa: '腹部分枝' }),
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
        'Fifty-five structures: the heart itself, its vessels, and the whole aorta the source draws with the first ' +
        'centimetres of each major branch — fifty-one from two files of one reference release and four drawn ' +
        'schematically. Point to name one, click to pin it, search for it in either language, hide what is in ' +
        'front of it, and switch the aorta off to look at the heart on its own.',
      summaryJa:
        '55 構造です。心臓そのもの、心臓の血管、そして出典が描く大動脈の全体と主要分枝の起始部（51 は同じリリースの ' +
        '2 ファイルから、4 つは模式）。触れて名前を確認し、クリックで固定、日本語でも英語でも検索でき、手前の部位は' +
        '非表示にでき、大動脈をオフにすると心臓だけを見られます。',
    }),
  ]),
  range: Object.freeze({ start: 'Named parts', startJa: '名前で指せる部位', end: 'Named parts', endJa: '名前で指せる部位' }),
  progressLabel: Object.freeze({ label: 'Anatomy', labelJa: '解剖' }),
  summary: 'A still, normal heart: chambers, septum, valves and papillary muscles, with the great vessels, the coronary arteries, the cardiac veins and the aorta with its major branches, each selectable by name.',
  summaryJa: '静止した正常心です。心腔・心室中隔・弁・乳頭筋に、大血管・冠動脈・心臓静脈と、主要分枝を含む大動脈を加え、名前で個別に選択できます。',
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
    // this view keeps the brachiocephalic veins out of the way. What it really
    // is is the heart and its aorta, as the scene opens — so that is what it
    // says.
    label: 'The heart and the aorta',
    labelJa: '心臓と大動脈',
    summary:
      'Where the scene opens, from the front: the chambers and septum, the valves and papillary muscles, the '
      + 'coronary vessels, the roots of the great vessels, and the whole aorta the source draws — the arch with '
      + 'its three branches and the abdominal aorta with its five, down to where it divides. The brachiocephalic '
      + 'veins stay out of the way, as they do when the scene opens.',
    summaryJa:
      'シーンを開いたときの表示を前から見ます——心腔と心室中隔、弁と乳頭筋、冠血管、大血管の付け根、そして出典が描く'
      + '大動脈の全体（3 本の分枝を出す大動脈弓から、5 本の分枝を出して左右に分かれるまでの腹部大動脈）。'
      + '腕頭静脈はシーンを開いたときと同じく出したままにしません。',
    resets: true,
    scope: 'aorta',
    hide: Object.freeze([]),
    shows: Object.freeze([
      'VH_M_heart_left_ventricle',
      'VH_M_heart_right_ventricle',
      'VH_M_left_cardiac_atrium',
      'VH_M_right_cardiac_atrium',
      'VH_M_ascending_aorta',
      'VH_M_pulmonary_trunk',
      'VH_M_aortic_arch',
      'VH_M_descending_aorta',
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
    // The arch is among what it shows, so the aorta stays on…
    scope: 'aorta',
    // …but the camera frames the heart and the arch, where these vessels meet
    // it. Framed on everything drawn — the aorta down to its bifurcation —
    // every one of them was a few pixels across. What runs on beyond the arch
    // runs out of frame, as it does leaving a heart in a body.
    frame: Object.freeze(['VH_M_aortic_arch']),
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
    // On the heart's own surface, so framed on the heart rather than on the
    // aorta, where they would be a few pixels across.
    scope: 'heart',
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
    // Inside the heart: framed on the heart.
    scope: 'heart',
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
 * **This list does not open or close the release gate**, and the gate does not
 * read it: publication rests on the pinned files and the decision record in
 * `src/catalog/release.js`.
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
  missing(
    'aortic-branches-beyond-their-start',
    'The aorta\'s branches beyond their first centimetres, and the organs they supply',
    '大動脈の分枝の起始部より先と、それが栄養する臓器',
    'noted',
    'Each branch is drawn from where it leaves the aorta and fades out a few centimetres on: the display range of ' +
      'this scene is the heart and its aorta, not the arterial tree. The source does contain some of what lies ' +
      'beyond — the hepatic, splenic and colic arteries among them — and does not contain the iliac arteries, the ' +
      'right common carotid or the right subclavian at all; the first centimetres of those four are drawn ' +
      'schematically and marked so.',
    '各分枝は大動脈から出るところから描き、数 cm 先で薄れて消えます。このシーンの表示範囲は心臓と大動脈で、' +
      '動脈の樹全体ではありません。出典には先の一部（肝動脈・脾動脈・結腸動脈など）が含まれていますが、' +
      '腸骨動脈・右総頸動脈・右鎖骨下動脈はまったく含まれていないため、その 4 本の起始部は模式として描き、そう表示しています。'
  ),
  missing(
    'aortic-small-branches',
    'The aorta\'s smaller branches',
    '大動脈の細い分枝',
    'noted',
    'The source has none of them: from the thoracic aorta the intercostal, bronchial, oesophageal, pericardial, ' +
      'mediastinal and superior phrenic arteries; from the abdominal aorta the inferior phrenic, adrenal, ' +
      'gonadal (testicular) and lumbar arteries, and the median sacral artery that continues it. The aorta here ' +
      'shows its major branches only — which is not the same as an aorta with only those branches.',
    '出典にはいずれもありません——胸部大動脈の肋間動脈・気管支動脈・食道動脈・心膜枝・縦隔枝・上横隔動脈、' +
      '腹部大動脈の下横隔動脈・副腎動脈・性腺動脈（精巣動脈）・腰動脈と、その続きの正中仙骨動脈。' +
      'ここに描いた大動脈は主要な分枝だけを見せています。' +
      '大動脈の分枝がそれだけだという意味ではありません。'
  ),
  missing(
    'ligamentum-arteriosum',
    'Ligamentum arteriosum',
    '動脈管索',
    'noted',
    'The remnant of the fetal ductus arteriosus, which joined the pulmonary trunk to the aorta. Not in the source.',
    '胎生期に肺動脈幹と大動脈を結んでいた動脈管の遺残です。出典にありません。'
  ),
  missing('chordae-tendineae', 'Chordae tendineae', '腱索', 'noted'),
  missing('pericardium', 'Pericardium', '心膜', 'noted'),
  missing('conduction-system', 'Conduction system', '刺激伝導系', 'noted'),
]);

function missing(id, name, nameJa, standing, why = null, whyJa = null) {
  return Object.freeze({ id, name, nameJa, standing, why, whyJa });
}
