import * as THREE from 'three';

/**
 * The liver, by Couinaud — the structure the geometry is built from.
 *
 * ## The frame
 *
 * Positions are `[left, superior, anterior]`, each −1 to +1, in the body's own
 * axes rather than in x/y/z. The liver is a midline organ, so unlike a lung
 * there is no "lateral": `left` runs from the patient's right (−1, the bulky
 * right lobe) to the patient's left (+1, the thin left lobe).
 *
 * ## What Couinaud's division actually is
 *
 * Eight segments, each **the territory of one portal pedicle** — a branch of
 * the portal vein with its artery and bile duct — and each therefore removable
 * on its own. That is why the division exists and why it is worth drawing.
 *
 * The boundaries are the **hepatic veins**, which run *between* segments while
 * the portal pedicles run *within* them. It is the same arrangement the lung
 * has, and for the same reason: the thing that supplies a unit sits inside it,
 * and the thing that drains a region sits on its edge, so the edge is what a
 * surgeon finds a plane by.
 *
 * Three planes and one more:
 *
 * - the **middle hepatic vein** divides the liver into right and left. This is
 *   Cantlie's line, and it is **not the falciform ligament** — the commonest
 *   mistake about liver anatomy. The falciform is well to the left of it and
 *   divides segment IV from II and III.
 * - the **right hepatic vein** divides the right liver into an anterior sector
 *   (V, VIII) and a posterior one (VI, VII).
 * - the **left hepatic vein**, along the falciform, divides the left liver into
 *   a medial sector (IV) and a lateral one (II, III).
 * - the **portal plane**, through the right and left portal branches, cuts each
 *   sector into a superior and an inferior segment.
 *
 * Segment I, the caudate lobe, obeys none of it: it sits behind the porta
 * against the inferior vena cava, takes blood from both sides, and **drains
 * straight into the cava** by its own short veins rather than through any
 * hepatic vein. That is why it is the part that survives — and hypertrophies —
 * when the hepatic veins occlude.
 *
 * ## What this is and is not
 *
 * **Schematic but correctly arranged.** No specimen or scan was traced. What is
 * right is which segment borders which, which vein separates them, what each is
 * called, and where each sits relative to the others. What is not right is any
 * boundary: real Couinaud planes are curved, the veins wander, and the
 * territories vary enough between people that surgical planning is done on the
 * patient's own imaging and never on a diagram like this one.
 */

/**
 * The planes the segments are cut by, in the anatomical frame.
 *
 * A normal points towards the part on its far side. Each **normal is the
 * anatomy** — the orientation of the vein or ligament the plane is named for.
 * Each `through` is **fitted**: it is the offset that makes the carved
 * segments take the volume shares in `SEGMENT_VOLUME_SHARES`, and it is the
 * only kind of number in this file chosen rather than described.
 *
 * The fit is a coordinate descent on six offsets — Cantlie, the right hepatic
 * vein, the falciform, the portal plane, the umbilical portion and the front
 * of the caudate — against the nine measured mesh volumes, run once and the
 * result written down. `tests/liver-anatomy.test.js` re-measures it, so an
 * offset edited by hand fails rather than drifting.
 *
 * A fitted offset is **not** a measurement of anything. It says where a plane
 * had to sit in *this* organ's shape to reproduce the reference specimen's
 * volumes; a different liver shape would need different offsets for the same
 * anatomy. `docs/medical-notes.md` records that distinction.
 */
export const PLANES = {
  /**
   * Cantlie's line: the plane of the middle hepatic vein, from the gallbladder
   * fossa below and in front to the inferior vena cava above and behind. It is
   * the real division between right and left liver, and it is oblique — not
   * the vertical line a diagram usually draws.
   */
  cantlie: { normal: [1, 0, -0.22], through: [-0.02, 0, 0] },
  /** The right hepatic vein, between the anterior and posterior right sectors. */
  rightHepaticVein: { normal: [1, 0, 0.42], through: [-0.494, 0, 0] },
  /**
   * The left hepatic vein, running with the falciform ligament: segment IV on
   * its right, segments II and III on its left.
   */
  falciform: { normal: [1, 0, -0.1], through: [0.21, 0, 0] },
  /**
   * The portal plane, through the right and left portal branches. Nearly
   * transverse, tipped a little because the left branch runs higher than the
   * right. It divides segments IV to VIII into their superior and inferior
   * halves; the left lateral sector has its own plane, below.
   */
  portal: { normal: [-0.12, 1, 0], through: [0, -0.326, 0] },
  /**
   * The umbilical portion of the left portal vein, which is what separates
   * segment II from segment III.
   *
   * **Not the transverse portal plane.** In the left lateral sector the two
   * segments are divided as much front-to-back as top-to-bottom — II is
   * posterosuperior, III anteroinferior — so a purely transverse cut leaves
   * almost nothing above it in a lobe this thin, and segment II came out at
   * 1% of the liver instead of eight. The tilt is the anatomy, not a fudge to
   * make a number land.
   */
  leftPortal: { normal: [0.25, 1, -0.62], through: [0, -0.126, 0.05] },
  /**
   * The back of the porta hepatis. Everything behind it is taken as the caudate
   * lobe, which is not part of either the right or the left liver.
   *
   * **A simplification, and the largest one here.** The real caudate is a
   * central mass between the porta and the cava, narrow from side to side. A
   * box would describe it better and a box cannot be cut from half-spaces — the
   * complement of one is a union, not an intersection — so bounding it sideways
   * left slivers at the back of segments II and VII that belonged to no segment
   * at all. Taken as a slab it partitions cleanly, at the cost of calling a
   * thin posterior shaving of its neighbours "caudate".
   */
  caudateFront: { normal: [0, 0, 1], through: [0, 0, -0.747] },
};

/**
 * The nine parts this liver is cut into: the eight Couinaud segments, with IV
 * split into its superior and inferior halves the way a surgeon refers to them.
 *
 * `bounded` lists the planes and which side of each the part keeps: `positive`
 * for the side the normal points at.
 */
export const SEGMENTS = [
  {
    id: 'I',
    number: 'I',
    label: 'Caudate lobe',
    labelJa: '尾状葉',
    sector: 'caudate',
    at: [0.0, 0.05, -0.72],
    note: 'Drains straight into the cava, from both sides of the liver.',
    noteJa: '左右両方から血液を受け、肝静脈を経ずに直接下大静脈へ注ぎます。',
    bounded: [{ plane: 'caudateFront', positive: false }],
  },
  {
    id: 'II',
    number: 'II',
    label: 'Left lateral superior',
    labelJa: '左外側上区域',
    sector: 'left-lateral',
    at: [0.78, 0.45, -0.2],
    bounded: [
      { plane: 'falciform', positive: true },
      { plane: 'leftPortal', positive: true },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'III',
    number: 'III',
    label: 'Left lateral inferior',
    labelJa: '左外側下区域',
    sector: 'left-lateral',
    at: [0.78, -0.45, 0.3],
    bounded: [
      { plane: 'falciform', positive: true },
      { plane: 'leftPortal', positive: false },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'IVa',
    number: 'IVa',
    label: 'Left medial superior',
    labelJa: '左内側上区域',
    sector: 'left-medial',
    at: [0.24, 0.45, -0.05],
    bounded: [
      { plane: 'cantlie', positive: true },
      { plane: 'falciform', positive: false },
      { plane: 'portal', positive: true },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'IVb',
    number: 'IVb',
    label: 'Left medial inferior',
    labelJa: '左内側下区域',
    sector: 'left-medial',
    at: [0.24, -0.45, 0.3],
    bounded: [
      { plane: 'cantlie', positive: true },
      { plane: 'falciform', positive: false },
      { plane: 'portal', positive: false },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'V',
    number: 'V',
    label: 'Right anterior inferior',
    labelJa: '右前下区域',
    sector: 'right-anterior',
    at: [-0.3, -0.45, 0.4],
    bounded: [
      { plane: 'cantlie', positive: false },
      { plane: 'rightHepaticVein', positive: true },
      { plane: 'portal', positive: false },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'VI',
    number: 'VI',
    label: 'Right posterior inferior',
    labelJa: '右後下区域',
    sector: 'right-posterior',
    at: [-0.76, -0.45, -0.1],
    bounded: [
      { plane: 'cantlie', positive: false },
      { plane: 'rightHepaticVein', positive: false },
      { plane: 'portal', positive: false },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'VII',
    number: 'VII',
    label: 'Right posterior superior',
    labelJa: '右後上区域',
    sector: 'right-posterior',
    at: [-0.76, 0.45, -0.4],
    bounded: [
      { plane: 'cantlie', positive: false },
      { plane: 'rightHepaticVein', positive: false },
      { plane: 'portal', positive: true },
      { plane: 'caudateFront', positive: true },
    ],
  },
  {
    id: 'VIII',
    number: 'VIII',
    label: 'Right anterior superior',
    labelJa: '右前上区域',
    sector: 'right-anterior',
    at: [-0.3, 0.45, 0.15],
    bounded: [
      { plane: 'cantlie', positive: false },
      { plane: 'rightHepaticVein', positive: true },
      { plane: 'portal', positive: true },
      { plane: 'caudateFront', positive: true },
    ],
  },
];

/**
 * The share of the liver each Couinaud segment takes, in the reference
 * specimen this organ is.
 *
 * **Source.** Mise Y, Satou S, Shindoh J, Conrad C, Aoki T, Hasegawa K,
 * Sugawara Y, Kokudo N. *Three-dimensional volumetry in 107 normal livers
 * reveals clinically relevant inter-segment variation in size.* HPB (Oxford)
 * 2014;16(5):439–447. doi:10.1111/hpb.12157. Perfusion-based 3D volumetry of
 * 107 normal livers, segments defined by the portal branch each is fed by —
 * the same definition this file cuts by.
 *
 * **Derivation.** The paper's per-segment medians are taken and summed; because
 * medians of eight distributions do not sum to the median of their total, the
 * printed values come to 98.4% rather than 100%. They are scaled by 100/98.4
 * and rounded to whole percentage points, which is the resolution the geometry
 * can hold. Segment IV is one number here and is cut into IVa and IVb below.
 *
 * **What this is not.** One internally consistent reference specimen, not a
 * normal range and not a prediction for any person. Mise's own finding is that
 * these vary widely between people — segment VIII ran from 11.1% to 38.0% of
 * the liver across the 107 — and that is why a resection is planned on the
 * patient's own volumetry. `docs/medical-notes.md` records the rest.
 */
export const SEGMENT_VOLUME_SHARES = Object.freeze({
  I: 0.04,
  II: 0.08,
  III: 0.1,
  IV: 0.14,
  V: 0.13,
  VI: 0.08,
  VII: 0.17,
  VIII: 0.26,
});

/**
 * How segment IV is split between its superior and inferior halves.
 *
 * **Not from Mise.** The paper reports segment IV whole, so there is no
 * published IVa/IVb ratio to take. Halving it is a stated simplification and
 * must not be quoted as a literature ratio.
 */
export const SEGMENT_IV_SPLIT = Object.freeze({ IVa: 0.5, IVb: 0.5 });

/**
 * The sectors, and the resections they correspond to.
 *
 * A sector is what a hepatic vein bounds, and it is the unit an anatomical
 * resection is planned in — which is the whole reason the segments are grouped
 * this way rather than by which lobe they look like they are in.
 *
 * `share` is **derived** from `SEGMENT_VOLUME_SHARES` rather than typed, so a
 * sector target and its segments' targets cannot drift apart.
 */
export const SECTORS = [
  { id: 'caudate', label: 'Caudate', labelJa: '尾状葉', segments: ['I'], liver: 'independent' },
  { id: 'left-lateral', label: 'Left lateral', labelJa: '左外側区域', segments: ['II', 'III'], liver: 'left' },
  { id: 'left-medial', label: 'Left medial', labelJa: '左内側区域', segments: ['IVa', 'IVb'], liver: 'left' },
  {
    id: 'right-anterior',
    label: 'Right anterior',
    labelJa: '右前区域',
    segments: ['V', 'VIII'],
    liver: 'right',
  },
  {
    id: 'right-posterior',
    label: 'Right posterior',
    labelJa: '右後区域',
    segments: ['VI', 'VII'],
    liver: 'right',
  },
].map((sector) => Object.freeze({ ...sector, share: sector.segments.reduce((sum, id) => sum + shareOfSegment(id), 0) }));

/**
 * The reference share of one carved part, which is a segment or half of IV.
 *
 * @param {string} id a key of `SEGMENTS`, so `'IVa'` and `'IVb'` as well as `'I'`…`'VIII'`
 * @returns {number} its share of the whole liver, 0–1
 */
export function shareOfSegment(id) {
  if (id === 'IVa' || id === 'IVb') return SEGMENT_VOLUME_SHARES.IV * SEGMENT_IV_SPLIT[id];
  const share = SEGMENT_VOLUME_SHARES[id];
  if (share === undefined) throw new Error(`No reference share for liver segment "${id}"`);
  return share;
}

/**
 * The three hepatic veins, as the boundaries they are.
 *
 * Each runs in the plane it separates, from its territory towards the inferior
 * vena cava behind and above the liver. They are drawn on the plane rather than
 * inside a segment, because being on the boundary is the fact about them.
 */
export const HEPATIC_VEINS = [
  { id: 'right-hepatic-vein', label: 'Right hepatic vein', labelJa: '右肝静脈', plane: 'rightHepaticVein', from: [-0.72, -0.15, 0.4] },
  { id: 'middle-hepatic-vein', label: 'Middle hepatic vein', labelJa: '中肝静脈', plane: 'cantlie', from: [-0.05, -0.2, 0.55] },
  { id: 'left-hepatic-vein', label: 'Left hepatic vein', labelJa: '左肝静脈', plane: 'falciform', from: [0.72, -0.1, 0.35] },
];

/**
 * Where a hepatic vein starts, projected onto the plane it runs in.
 *
 * The nominal point in `from` says roughly where in the liver the vein begins;
 * this puts it exactly on its own plane. Typed as a coordinate instead, the
 * middle hepatic vein started a quarter of the organ off Cantlie's line — the
 * plane it *is* — because the plane is oblique and the point was not adjusted
 * for the tilt. Being on the boundary is the fact about a hepatic vein, so it
 * is derived rather than written down.
 *
 * @param {ReturnType<typeof anatomicalFrame>} frame
 * @param {{ plane: string, from: [number, number, number] }} vein
 */
export function veinOrigin(frame, vein) {
  const definition = PLANES[vein.plane];
  const normal = frame.toLocalNormal(definition.normal);
  const through = frame.toLocal(definition.through);
  const point = frame.toLocal(vein.from);
  return point.addScaledVector(normal, normal.dot(through) - normal.dot(point));
}

/** Where the veins converge: the inferior vena cava, behind and above. */
export const CAVA = [0.0, 0.62, -0.72];

/**
 * The porta hepatis, where the portal vein, hepatic artery and bile duct enter.
 *
 * They enter *together*, and the portal pedicle they form runs on into the
 * middle of a segment rather than along its edge — the opposite of a hepatic
 * vein, and the reason a segment can be taken out without cutting anything that
 * belongs to its neighbours.
 */
export const PORTA = [-0.05, -0.55, 0.22];

/** @param {string} id */
export const segmentById = (id) => SEGMENTS.find((segment) => segment.id === id) ?? null;
/** @param {string} sectorId */
export const segmentsOfSector = (sectorId) => SEGMENTS.filter((segment) => segment.sector === sectorId);
/** @param {'right'|'left'|'independent'} liver */
export const segmentsOfLiver = (liver) =>
  SEGMENTS.filter((segment) => SECTORS.find((sector) => sector.id === segment.sector)?.liver === liver);

/**
 * A frame that turns anatomical coordinates into the liver's local ones.
 *
 * Points scale with the organ's half-extents; **plane normals divide by them**,
 * because the frame is an anisotropic scaling and under one of those a normal
 * transforms by the inverse transpose. The liver is three times as wide as it
 * is tall, so getting this backwards tips every Couinaud plane by tens of
 * degrees.
 *
 * @param {THREE.Box3} bounds the finished liver's local bounding box
 */
export function anatomicalFrame(bounds) {
  const centre = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);

  return {
    centre: centre.clone(),
    half: half.clone(),
    /** @param {[number, number, number]} at `[left, superior, anterior]` */
    toLocal([left, superior, anterior], target = new THREE.Vector3()) {
      return target.set(centre.x + left * half.x, centre.y + superior * half.y, centre.z + anterior * half.z);
    },
    /** @param {[number, number, number]} normal */
    toLocalNormal([left, superior, anterior], target = new THREE.Vector3()) {
      return target.set(left / half.x, superior / half.y, anterior / half.z).normalize();
    },
  };
}
