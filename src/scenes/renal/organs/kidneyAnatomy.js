/**
 * The kidney, by renal lobe — the structure the geometry is built from.
 *
 * ## The frame
 *
 * Positions are `[lateral, superior, anterior]`, each −1 to +1, in the organ's
 * own axes rather than in x/y/z. `lateral` runs from the hilum at −1 to the
 * convex border at +1, so one description serves both kidneys and the builder
 * is the only thing that has to know which way the hilum faces.
 *
 * ## What a renal lobe actually is
 *
 * A kidney is a fused collection of **lobes**, and a lobe is one medullary
 * pyramid together with the cortex covering it. That is not a diagram's
 * convenience: it is how the organ develops, it is why a foetal kidney is
 * visibly lumpy, and it is why the parenchyma divides this way and no other.
 *
 * Each pyramid points its **papilla** at the renal sinus, where a minor calyx
 * cups it; the calyces join into major calyces and then the pelvis, which
 * leaves at the hilum as the ureter. Between adjacent pyramids the cortex dips
 * inward as a **renal column** — column tissue is cortex, not a third kind of
 * tissue, which is why the columns here run the full depth from the surface to
 * the sinus rather than stopping at the corticomedullary junction.
 *
 * That arrangement is the whole point of the division:
 *
 * - everything filtered is filtered in the **cortex** (the glomeruli are there,
 *   and so are the convoluted tubules)
 * - everything concentrated is concentrated in the **medulla** (the loops of
 *   Henle and the collecting ducts run down the pyramid towards the papilla)
 * - so the corticomedullary junction is not a decoration; it is the line the
 *   nephron crosses twice, and a model that cannot point at it cannot show what
 *   a loop of Henle is for
 *
 * ## The fan
 *
 * The pyramids are laid out in the **coronal plane**, fanned about an
 * anteroposterior axis through the sinus, because that is the section a kidney
 * is taught in: seven pyramids, apices converging medially, cortex outside them
 * and columns between them.
 *
 * ## What this is and is not
 *
 * **Schematic but correctly arranged.** No specimen or scan was traced. What is
 * right is which part borders which, that cortex is outside medulla everywhere,
 * that each papilla points at the sinus, that the columns are continuous with
 * the cortex, and what each part is called. What is not right is any boundary.
 *
 * Accepted simplifications, each recorded in `docs/medical-notes.md`:
 *
 * - **One row of pyramids.** A real kidney has an anterior and a posterior row,
 *   and 7–18 pyramids in total; this has seven in one coronal fan. Seven is the
 *   number a coronal section is usually drawn with and the arrangement is the
 *   teaching one, but a kidney is not planar and this model is.
 * - **Planar boundaries.** Real interlobar boundaries are not flat, and the
 *   corticomedullary junction is a curved surface, not a plane per lobe.
 * - **The sinus is not carved out.** The parenchyma fills the organ and the
 *   pyramids converge where the sinus is; the calyces, pelvis and vessels are
 *   drawn in that convergence rather than cut from it. A cavity cannot be cut
 *   from half-spaces, and taking "everything medial of a plane" as sinus takes
 *   a quarter of the organ with it, because the bean wraps medially at both
 *   poles.
 * - **The medial margin is not a lobe.** Past the poles there is hilum rather
 *   than a pyramid, so the parenchyma there — the lips the vessels and the
 *   pelvis pass between — is cortex in three parts of its own.
 * - **The renal columns are not cut out as meshes.** A column is cortex, and
 *   here the two pyramids meet along the plane it would occupy. Cutting one is
 *   what a half-space carve does worst: a column is the thinnest part in the
 *   organ, and a mesh built star-shaped about its own centroid could not
 *   resolve it — with columns the parts summed to 95% of the kidney they were
 *   cut from and without them 98%, and the missing 3% is a gap along every
 *   boundary on screen. `COLUMNS` still says where each one is, so a scene can
 *   point at a column; it just cannot hide one. This is the kidney's caudate
 *   slab: the same trade, for the same reason, recorded the same way.
 */
import * as THREE from 'three';

/**
 * Where the sinus sits, as a fraction of the half-width from the centre
 * towards the hilum, and the axis the lobes fan about.
 *
 * The fan's centre is inside the sinus, not at the organ's centre: pyramids
 * point at the calyces, and the calyces are medial.
 */
export const SINUS_CENTRE = Object.freeze([-0.30, 0, 0]);

/**
 * How much of the parenchyma, measured from the sinus out to the surface, is
 * cortex.
 *
 * **A fraction, not a distance.** The first version of this was a fixed depth
 * along each lobe's own axis, and it does not work: the parenchyma is thick
 * laterally and thin at the hilum, so a depth that puts the junction sensibly
 * under the convex border puts it *outside* the organ superomedially, and the
 * two cortical caps nearest the hilum carved empty. The cortex is about a third
 * of the parenchymal thickness wherever you measure it, which is a statement
 * about proportion and survives the organ being thinner in one direction.
 */
export const CORTEX_THICKNESS_FRACTION = 0.36;

/**
 * The fallback depth used when nobody measures the surface for us, so that this
 * module can be read, reasoned about and tested on its own. The builder passes
 * a measured junction instead — see `parenchymaParts`.
 */
export const CORTICOMEDULLARY_DEPTH = 0.62;

/**
 * Half-width of a lobe's own sector, in degrees of the coronal fan.
 *
 * Half the pitch, so the lobes tile the fan with nothing between them. The
 * first version left a narrow sector between each pair and carved it as a
 * renal column of its own; the columns came out as ten-degree wedges running
 * the whole depth of the organ, and a mesh built star-shaped about its own
 * centroid cannot resolve a part that thin — the twenty-one parts summed to
 * 91% of the kidney they were cut from at a tessellation anyone would ship,
 * which on screen is a gap along every boundary. A column is cortex, not a
 * third tissue, so it is now where it belongs: inside the cortical part, named
 * by an anchor rather than cut out as a mesh.
 */
export const LOBE_HALF_ANGLE = 15;

/** How many parts the medial margin is cut into. */
export const MEDIAL_MARGIN_PARTS = 3;

/**
 * The seven lobes, by where each one sits in the coronal fan.
 *
 * `angle` is measured in the coronal plane, from the lateral direction towards
 * superior, so 0° is the lobe on the convex border and ±90° are the poles.
 * They are 30° apart, which puts all seven in the lateral half where the
 * parenchyma is thick.
 *
 * The fan stops at the poles because past them is the hilum, and the hilum is
 * an opening, not tissue. What parenchyma remains on the medial side — the lips
 * the vessels and the pelvis pass between — is one part of its own, below. The
 * first version of this ran the fan to ±135° and left the two end lobes
 * unbounded on their outer sides; a single plane splits space in two, so both
 * of them claimed the medial sliver and the parts overlapped instead of
 * partitioning.
 */
export const LOBES = Object.freeze([
  { id: 'superior', angle: 90, label: 'Superior (upper pole) lobe', labelJa: '上極の腎葉' },
  { id: 'superolateral', angle: 60, label: 'Superolateral lobe', labelJa: '上外側の腎葉' },
  { id: 'upper', angle: 30, label: 'Upper lobe', labelJa: '上部の腎葉' },
  { id: 'lateral', angle: 0, label: 'Lateral (mid) lobe', labelJa: '中央外側の腎葉' },
  { id: 'lower', angle: -30, label: 'Lower lobe', labelJa: '下部の腎葉' },
  { id: 'inferolateral', angle: -60, label: 'Inferolateral lobe', labelJa: '下外側の腎葉' },
  { id: 'inferior', angle: -90, label: 'Inferior (lower pole) lobe', labelJa: '下極の腎葉' },
].map(Object.freeze));

/**
 * The six renal columns, one between each adjacent pair of lobes.
 *
 * A column is named for the two pyramids it separates, because that is what it
 * is: **cortex** reaching in between them towards the sinus. It is not a third
 * kind of tissue and it is not carved as a part of its own — it is the cortical
 * part's tissue at the boundary, and `angle` is where to point at it.
 */
export const COLUMNS = Object.freeze(
  LOBES.slice(0, -1).map((lobe, index) => {
    const next = LOBES[index + 1];
    return Object.freeze({
      id: `column-${lobe.id}-${next.id}`,
      between: Object.freeze([lobe.id, next.id]),
      angle: (lobe.angle + next.angle) / 2,
      label: `Renal column, ${lobe.id} to ${next.id}`,
      labelJa: `腎柱（${lobe.labelJa}と${next.labelJa}のあいだ）`,
    });
  })
);

const RADIANS = Math.PI / 180;

/** A unit direction in the coronal fan, in anatomical coordinates. */
export function fanDirection(angleDegrees) {
  const angle = angleDegrees * RADIANS;
  return [Math.cos(angle), Math.sin(angle), 0];
}

/**
 * The angular boundaries of the fan, in order, as `{ angle, kind }`.
 *
 * Thirteen sectors alternate lobe, column, lobe, … so twelve boundaries sit
 * between them. The two end lobes are left open: a sector that is not bounded
 * on its outer side sweeps round to the sinus plane and closes there, which is
 * what makes the parts cover the parenchyma exactly rather than leaving a
 * sliver at the back of the hilum belonging to nothing.
 */
export function fanBoundaries() {
  const boundaries = [];
  for (const column of COLUMNS) {
    boundaries.push({ angle: column.angle + COLUMN_HALF_ANGLE, id: `${column.id}-upper` });
    boundaries.push({ angle: column.angle - COLUMN_HALF_ANGLE, id: `${column.id}-lower` });
  }
  return boundaries.sort((a, b) => a.angle - b.angle);
}

/**
 * Every part the parenchyma is cut into, with the cuts that bound it.
 *
 * A cut is `{ normal, through, keep }` in anatomical coordinates: `keep` is the
 * side of the plane the part is on, `'positive'` meaning the side the normal
 * points at.
 *
 * The three kinds:
 *
 * - **cortex** — a lobe's sector, outside its corticomedullary plane
 * - **medulla** — the same sector, inside it: the pyramid, whose apex is the
 *   papilla and whose base is the corticomedullary junction
 * - **column** — the full depth of a column sector, from the surface to the
 *   sinus, because a column is cortex reaching between two pyramids
 */
/**
 * @param {{ junctionAt?: (lobe: typeof LOBES[number]) => [number, number, number] }} [options]
 *   `junctionAt` returns the point the lobe's corticomedullary plane passes
 *   through, in anatomical coordinates. The builder measures it — cast a ray
 *   from the sinus along the lobe's axis, find where it leaves the organ, and
 *   take `CORTEX_THICKNESS_FRACTION` of the way back from there — because only
 *   the builder knows the surface. The default is a fixed depth, which is
 *   wrong near the hilum and is here so this module stands on its own.
 */
export function parenchymaParts({ junctionAt = null } = {}) {
  const parts = [];

  /** The plane between two fan sectors: it contains the fan axis. */
  const sectorCut = (angle, keep) => ({
    // Perpendicular to the boundary direction, within the coronal plane. The
    // normal points towards increasing angle.
    normal: [-Math.sin(angle * RADIANS), Math.cos(angle * RADIANS), 0],
    through: [...SINUS_CENTRE],
    keep,
  });

  /**
   * A closed angular sector of the fan. Nothing bounds it on the inside.
   *
   * The renal sinus is **not** cut out of the parenchyma. It was, in the first
   * version — everything medial of one plane — and the plane took 27% of the
   * organ with it, tissue that then belonged to no part at all: the bean wraps
   * medially at both poles, so "medial of a line" is not "sinus". A cavity
   * cannot be cut from half-spaces (the complement of one is a union, not an
   * intersection), which is the same reason the liver's caudate is a slab. So
   * the sectors fill the organ, the pyramids converge where the sinus is, and
   * the collecting system is drawn in that convergence rather than carved from
   * it. `docs/medical-notes.md` records it.
   */
  const sector = (fromAngle, toAngle) => [
    sectorCut(fromAngle, 'positive'),
    sectorCut(toAngle, 'negative'),
  ];

  for (const lobe of LOBES) {
    const direction = fanDirection(lobe.angle);
    const junction = {
      normal: direction,
      through:
        junctionAt?.(lobe) ??
        SINUS_CENTRE.map((value, axis) => value + direction[axis] * CORTICOMEDULLARY_DEPTH),
    };
    const bounds = sector(lobe.angle - LOBE_HALF_ANGLE, lobe.angle + LOBE_HALF_ANGLE);

    parts.push({
      id: `cortex-${lobe.id}`,
      kind: 'cortex',
      lobe: lobe.id,
      angle: lobe.angle,
      label: `${lobe.label} — cortex`,
      labelJa: `${lobe.labelJa}・皮質`,
      cuts: [...bounds, { ...junction, keep: 'positive' }],
    });
    parts.push({
      id: `pyramid-${lobe.id}`,
      kind: 'medulla',
      lobe: lobe.id,
      angle: lobe.angle,
      label: `${lobe.label} — medullary pyramid`,
      labelJa: `${lobe.labelJa}・髄質錐体`,
      cuts: [...bounds, { ...junction, keep: 'negative' }],
    });
  }

  // The medial margin: what is left of the fan once the seven lobes have taken
  // the lateral half. It is cortex — the lips of the hilum, which the vessels
  // and the pelvis pass between — and it has no pyramid under it because past
  // the poles there is an opening rather than tissue.
  //
  // Cut into three rather than left as one sector of a hundred and sixty
  // degrees: the kidney is concave on this side, a carve is star-shaped about
  // its own centre, and one part that wraps a concavity is the shape a carve
  // represents worst. Three smaller ones each stay close to convex.
  const outermost = LOBES[0].angle + LOBE_HALF_ANGLE;
  const span = (360 - 2 * outermost) / MEDIAL_MARGIN_PARTS;
  for (let index = 0; index < MEDIAL_MARGIN_PARTS; index += 1) {
    const from = outermost + span * index;
    parts.push({
      id: index === 1 ? 'medial-margin' : `medial-margin-${index === 0 ? 'superior' : 'inferior'}`,
      kind: 'cortex',
      angle: from + span / 2,
      label: 'Medial margin (hilar lips)',
      labelJa: '内側縁（腎門の唇部）',
      cuts: sector(from, from + span),
    });
  }

  return parts;
}

/**
 * Where each papilla is: the tip of a pyramid, at the sinus end of its axis.
 *
 * This is the point a minor calyx cups, so it is also where the collecting
 * system starts. Returned in anatomical coordinates.
 */
export function papillaAt(lobe, reach = 0.16) {
  const direction = fanDirection(lobe.angle);
  return SINUS_CENTRE.map((value, axis) => value + direction[axis] * reach);
}

/**
 * A frame that turns anatomical coordinates into the organ's local ones.
 *
 * Points scale with the organ's half-extents; **plane normals divide by them**,
 * because the frame is an anisotropic scaling and under one of those a normal
 * transforms by the inverse transpose. A kidney is half again as tall as it is
 * wide, so getting this backwards tips every interlobar plane by degrees.
 *
 * `lateral` is `+x` for a kidney whose hilum faces `−x`, and the builder passes
 * the sign, so one description serves both sides.
 *
 * @param {THREE.Box3} bounds the finished kidney's local bounding box
 * @param {number} lateralSign `+1` when the convex border is at `+x`
 */
export function anatomicalFrame(bounds, lateralSign = 1) {
  const centre = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);

  return {
    centre: centre.clone(),
    half: half.clone(),
    lateralSign,
    /** @param {[number, number, number]} at `[lateral, superior, anterior]` */
    toLocal([lateral, superior, anterior], target = new THREE.Vector3()) {
      return target.set(
        centre.x + lateral * lateralSign * half.x,
        centre.y + superior * half.y,
        centre.z + anterior * half.z
      );
    },
    /** The inverse of `toLocal`: a local point back in anatomical coordinates. */
    toAnatomical(point) {
      return [
        ((point.x - centre.x) / half.x) * lateralSign,
        (point.y - centre.y) / half.y,
        (point.z - centre.z) / half.z,
      ];
    },
    /** @param {[number, number, number]} normal */
    toLocalNormal([lateral, superior, anterior], target = new THREE.Vector3()) {
      return target
        .set((lateral * lateralSign) / half.x, superior / half.y, anterior / half.z)
        .normalize();
    },
  };
}

/** @param {string} id */
export const lobeById = (id) => LOBES.find((lobe) => lobe.id === id) ?? null;
