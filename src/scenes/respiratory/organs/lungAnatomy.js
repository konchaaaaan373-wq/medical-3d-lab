import * as THREE from 'three';

/**
 * What is in a lung, named — the structure the geometry is built from.
 *
 * Separated from the geometry so that the anatomy can be read, checked and
 * tested without building a mesh, and so that the names are in one place rather
 * than spread through the builder as string literals.
 *
 * ## The frame
 *
 * Everything here is in **anatomical coordinates**, not in x/y/z. Each position
 * is `[lateral, vertical, anterior]`, each running −1 to +1:
 *
 * - `lateral`  −1 at the mediastinal (medial) surface, +1 at the costal surface
 * - `vertical` −1 at the diaphragmatic surface, +1 at the apex
 * - `anterior` −1 at the vertebral (posterior) border, +1 at the sternal border
 *
 * A lung is then the same lung on either side, and which way `lateral` points
 * in x is a fact about the side, applied once, in one place. Written directly in
 * x, every segment position would have to be written twice and one of the two
 * would eventually be wrong — which is the mirroring defect
 * `docs/architecture-rules.md` rule 5 exists to prevent.
 *
 * ## What this is and is not
 *
 * **Schematic but correctly arranged.** No specimen, scan or atlas plate was
 * traced. What is right is the *structure*: how many lobes on each side, which
 * fissure separates which, how many segments each lobe carries, what each is
 * called, and where each one sits relative to the others — every segment here
 * is placed where its own name says it is, because that is what the names mean.
 * What is not right is any individual position, boundary or volume. Real
 * fissures are curved, frequently incomplete, and vary between people; real
 * segments have irregular boundaries that no plane and no distance rule
 * reproduces.
 */

/** −1 at the medial surface, +1 at the costal surface, per side. */
export const SIDES = {
  right: { id: 'right', label: 'Right', labelJa: '右', lateralX: -1 },
  left: { id: 'left', label: 'Left', labelJa: '左', lateralX: 1 },
};

/**
 * The lobes, and the fissures that separate them.
 *
 * A fissure is stated as a plane in the anatomical frame: a normal pointing
 * towards the lobe on its far side, and a position along that normal. The
 * **oblique fissure** runs from high and posterior to low and anterior, so a
 * normal pointing antero-superiorly separates the antero-superior lobe from the
 * postero-inferior one. The **horizontal fissure**, on the right only, is very
 * nearly level and cuts the antero-superior part again into an upper and a
 * middle lobe.
 *
 * `keepAbove` names the side of the plane the lobe occupies: `true` for the
 * lobe the normal points at.
 */
export const FISSURES = {
  /**
   * Both lungs. Steeply set — from about the level of the third or fourth
   * thoracic vertebra behind to the sixth costal cartilage in front — which is
   * why so much of what looks like "upper lung" on a frontal film is lower lobe.
   */
  oblique: {
    normal: [0, 0.82, 0.57],
    /**
     * Set per side, and **calibrated rather than measured**: the position that
     * makes each lower lobe come out at about 53% of its lung on the right and
     * about half on the left. The angle above is the anatomy; this is the
     * number that had to be chosen to land the anatomy in this particular pair
     * of lungs.
     *
     * **Those two targets are uncited.** They are the approximate shares taught
     * with the lobes, not figures read out of a series — see the note in
     * `docs/medical-notes.md`. They are wide enough to be safe as a shape
     * constraint and are not offered as measurements.
     */
    through: { right: [0, -0.2, 0], left: [0, -0.25, 0] },
  },
  /**
   * Right lung only. Runs forward from the oblique fissure at about the fourth
   * rib. The reason the right lung has three lobes and the left has two.
   */
  horizontal: { normal: [0, 0.97, 0.24], through: { right: [0, -0.1, 0], left: [0, -0.1, 0] } },
};

/**
 * Five lobes: three on the right, two on the left.
 *
 * `bounded` lists the fissures that cut this lobe and which side of each it
 * keeps. `centre` is a point that has to lie inside the finished lobe — the
 * carving is star-shaped about it, so it is structural rather than decorative.
 */
export const LOBES = [
  {
    id: 'right-upper',
    side: 'right',
    label: 'Right upper lobe',
    labelJa: '右上葉',
    short: 'RUL',
    centre: [0.1, 0.75, 0.15],
    bounded: [
      { fissure: 'oblique', keepAbove: true },
      { fissure: 'horizontal', keepAbove: true },
    ],
  },
  {
    id: 'right-middle',
    side: 'right',
    label: 'Right middle lobe',
    labelJa: '右中葉',
    short: 'RML',
    // A small anterior wedge between the two fissures — the only lobe that is
    // bounded above as well as below, and the smallest of the five.
    centre: [0.05, -0.2, 0.5],
    bounded: [
      { fissure: 'oblique', keepAbove: true },
      { fissure: 'horizontal', keepAbove: false },
    ],
  },
  {
    id: 'right-lower',
    side: 'right',
    label: 'Right lower lobe',
    labelJa: '右下葉',
    short: 'RLL',
    centre: [0.15, -0.35, -0.4],
    bounded: [{ fissure: 'oblique', keepAbove: false }],
  },
  {
    id: 'left-upper',
    side: 'left',
    label: 'Left upper lobe',
    labelJa: '左上葉',
    short: 'LUL',
    // Carries the lingula, which is the left lung's answer to a middle lobe
    // and is part of this lobe rather than a lobe of its own.
    centre: [0.05, 0.5, 0.3],
    bounded: [{ fissure: 'oblique', keepAbove: true }],
  },
  {
    id: 'left-lower',
    side: 'left',
    label: 'Left lower lobe',
    labelJa: '左下葉',
    short: 'LLL',
    centre: [0.15, -0.35, -0.4],
    bounded: [{ fissure: 'oblique', keepAbove: false }],
  },
];

/**
 * The bronchopulmonary segments, by the Jackson–Huber numbering.
 *
 * A segment is **the lung one segmental bronchus ventilates** — a unit of
 * ventilation with its own bronchus and its own artery, which is why it can be
 * removed on its own. `at` is where that segmental bronchus ends, and the
 * territory is the lung nearer to it than to any other, inside its own lobe.
 * That is a model of the definition rather than a tracing of a specimen, and it
 * is why the boundaries here are smooth where real ones are not.
 *
 * Each one is placed where its name says it is. `apical` is at the top,
 * `posterior basal` is at the back of the base, `medial` faces the mediastinum.
 * That is not a shortcut: the names are positional, and a segment drawn
 * somewhere its name does not describe is simply wrong.
 *
 * The left lung has eight rather than ten. Its apical and posterior segments
 * arise from one bronchus and are named together, and it has no medial basal
 * segment — the heart is there.
 */
export const SEGMENTS = [
  // --- right upper lobe ---
  { id: 'RS1', side: 'right', lobe: 'right-upper', number: 'S1', label: 'Apical', labelJa: '肺尖区', at: [0.0, 0.82, -0.05] },
  { id: 'RS2', side: 'right', lobe: 'right-upper', number: 'S2', label: 'Posterior', labelJa: '後上葉区', at: [0.35, 0.42, -0.55] },
  { id: 'RS3', side: 'right', lobe: 'right-upper', number: 'S3', label: 'Anterior', labelJa: '前上葉区', at: [0.0, 0.42, 0.55] },
  // --- right middle lobe ---
  { id: 'RS4', side: 'right', lobe: 'right-middle', number: 'S4', label: 'Lateral', labelJa: '外側中葉区', at: [0.5, -0.15, 0.3] },
  { id: 'RS5', side: 'right', lobe: 'right-middle', number: 'S5', label: 'Medial', labelJa: '内側中葉区', at: [-0.45, -0.3, 0.45] },
  // --- right lower lobe ---
  { id: 'RS6', side: 'right', lobe: 'right-lower', number: 'S6', label: 'Superior', labelJa: '上-下葉区', at: [0.15, 0.2, -0.7] },
  { id: 'RS7', side: 'right', lobe: 'right-lower', number: 'S7', label: 'Medial basal', labelJa: '内側肺底区', at: [-0.5, -0.65, -0.15] },
  { id: 'RS8', side: 'right', lobe: 'right-lower', number: 'S8', label: 'Anterior basal', labelJa: '前肺底区', at: [0.05, -0.75, 0.35] },
  { id: 'RS9', side: 'right', lobe: 'right-lower', number: 'S9', label: 'Lateral basal', labelJa: '外側肺底区', at: [0.6, -0.7, -0.1] },
  { id: 'RS10', side: 'right', lobe: 'right-lower', number: 'S10', label: 'Posterior basal', labelJa: '後肺底区', at: [0.1, -0.65, -0.6] },
  // --- left upper lobe, including the lingula ---
  {
    id: 'LS1+2',
    side: 'left',
    lobe: 'left-upper',
    number: 'S1+2',
    label: 'Apicoposterior',
    labelJa: '肺尖後区',
    at: [0.2, 0.72, -0.3],
  },
  { id: 'LS3', side: 'left', lobe: 'left-upper', number: 'S3', label: 'Anterior', labelJa: '前上葉区', at: [0.0, 0.45, 0.55] },
  {
    id: 'LS4',
    side: 'left',
    lobe: 'left-upper',
    number: 'S4',
    label: 'Superior lingular',
    labelJa: '上舌区',
    at: [0.1, -0.1, 0.55],
  },
  {
    id: 'LS5',
    side: 'left',
    lobe: 'left-upper',
    number: 'S5',
    label: 'Inferior lingular',
    labelJa: '下舌区',
    at: [-0.05, -0.45, 0.5],
  },
  // --- left lower lobe ---
  { id: 'LS6', side: 'left', lobe: 'left-lower', number: 'S6', label: 'Superior', labelJa: '上-下葉区', at: [0.15, 0.2, -0.7] },
  { id: 'LS8', side: 'left', lobe: 'left-lower', number: 'S8', label: 'Anterior basal', labelJa: '前肺底区', at: [0.05, -0.75, 0.3] },
  { id: 'LS9', side: 'left', lobe: 'left-lower', number: 'S9', label: 'Lateral basal', labelJa: '外側肺底区', at: [0.6, -0.7, -0.1] },
  { id: 'LS10', side: 'left', lobe: 'left-lower', number: 'S10', label: 'Posterior basal', labelJa: '後肺底区', at: [0.1, -0.65, -0.6] },
];

/**
 * The hilum, and the one arrangement everybody is taught to check.
 *
 * **RALS** — on the **R**ight the pulmonary **A**rtery is **A**nterior to the
 * main bronchus; on the **L**eft it is **S**uperior to it. It is encoded here
 * rather than described, so that it is a property of the geometry and a test
 * can hold it.
 *
 * Two pulmonary veins leave each hilum: a superior vein draining the upper lung
 * and an inferior vein draining the lower, both **anterior and inferior** to the
 * artery and bronchus.
 */
export const HILUM = {
  /** Where the structures cross the mediastinal surface, in the anatomical frame. */
  at: [-0.86, 0.18, -0.14],
  /**
   * How much higher one hilum sits than the other, as a fraction of the lung's
   * own half-height.
   *
   * **The left hilum is higher than the right**, by roughly a vertebral level:
   * the left pulmonary artery has to arch over the left main bronchus, and the
   * right hilum is pushed down by the more horizontally-set right main
   * bronchus. It is a relation `docs/anatomy-specs.md` §1 asks for by name.
   *
   * It is declared here because it was not declared anywhere: both sides
   * carried the same offsets, and the left hilum still came out 0.032 above the
   * right — 1% of the lung's height — as a side effect of the left lung's
   * slightly larger `scale.y` and of where the surface projection happened to
   * land. A relation that holds by 1% because of arithmetic it does not depend
   * on is not held at all, and this branch already found one such assertion
   * passing at 0.7%. Playbook §2.5 G.
   *
   * Applied to the whole hilum rather than to the bronchus alone, so RALS —
   * which is written relative to the hilum below — is unaffected by it.
   */
  elevation: { right: 0, left: 0.16 },
  right: {
    bronchus: [0, 0, 0],
    artery: [0, 0.02, 0.3],
    superiorVein: [0, -0.16, 0.34],
    inferiorVein: [0, -0.48, 0.2],
  },
  left: {
    bronchus: [0, 0, 0],
    artery: [0, 0.3, 0.02],
    superiorVein: [0, -0.2, 0.3],
    inferiorVein: [0, -0.5, 0.18],
  },
};

/** @param {string} side */
export const segmentsOfSide = (side) => SEGMENTS.filter((segment) => segment.side === side);
/** @param {string} lobeId */
export const segmentsOfLobe = (lobeId) => SEGMENTS.filter((segment) => segment.lobe === lobeId);
/** @param {string} side */
export const lobesOfSide = (side) => LOBES.filter((lobe) => lobe.side === side);
/** @param {string} id */
export const segmentById = (id) => SEGMENTS.find((segment) => segment.id === id) ?? null;
/** @param {string} id */
export const lobeById = (id) => LOBES.find((lobe) => lobe.id === id) ?? null;

/**
 * A frame that turns anatomical coordinates into one lung's own local ones.
 *
 * The single place that knows which way a side faces. Everything above is
 * written once, for a lung, and this is what makes it a right lung or a left
 * one.
 *
 * @param {'right'|'left'} side
 * @param {THREE.Box3} bounds the finished lung's local bounding box
 */
export function anatomicalFrame(side, bounds) {
  const lateralX = SIDES[side].lateralX;
  const centre = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);

  return {
    side,
    lateralX,
    centre: centre.clone(),
    half: half.clone(),
    /**
     * @param {[number, number, number]} at `[lateral, vertical, anterior]`
     * @param {THREE.Vector3} [target]
     */
    toLocal([lateral, vertical, anterior], target = new THREE.Vector3()) {
      return target.set(
        centre.x + lateral * lateralX * half.x,
        centre.y + vertical * half.y,
        centre.z + anterior * half.z
      );
    },
    /**
     * A plane normal, carried into local coordinates.
     *
     * **Divided by the half-extents, not multiplied.** The anatomical frame is
     * an anisotropic scaling — a lung is twice as tall as it is wide — and under
     * one of those a normal does not transform like a point: it transforms by
     * the inverse transpose. Scaled like a point, the oblique fissure arrived
     * in the lung at a different angle from the one it was written at, the
     * lobes stopped meeting along it, and their volumes summed to twice the
     * lung they were cut from.
     *
     * @param {[number, number, number]} normal
     * @param {THREE.Vector3} [target]
     */
    toLocalNormal([lateral, vertical, anterior], target = new THREE.Vector3()) {
      return target
        .set((lateral * lateralX) / half.x, vertical / half.y, anterior / half.z)
        .normalize();
    },
  };
}
