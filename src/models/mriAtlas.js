/**
 * The MRI atlas's geometry: where a voxel is, which way a slice faces, and
 * which side of the screen is the patient's left.
 *
 * Pure JavaScript — no `three`, no DOM — so every statement about orientation
 * in the atlas is a statement `node --test` can check. That matters more here
 * than anywhere else in the product: a mirrored brain looks exactly as
 * convincing as a correct one, and on a *symmetric* template (which this is)
 * no amount of looking at the picture can tell them apart. The only defence is
 * to derive every left/right the reader is shown from one mapping, and to test
 * that mapping against the label volume's own hemisphere assignment
 * (`tests/mri-atlas-model.test.js`, `tests/mri-atlas-assets.test.js`).
 *
 * ## Four coordinate systems, named
 *
 * 1. **Voxel** `[i, j, k]` — integer indices into the volume. The build script
 *    (`scripts/build-mri-atlas.mjs`) reorients every input to RAS+, so `i`
 *    increases toward the subject's Right, `j` toward Anterior, `k` toward
 *    Superior, and the flat index is `i + j·nx + k·nx·ny`.
 * 2. **MNI millimetres** `[x, y, z]` — world space of the ICBM 152 2009c
 *    template. With a RAS+ 1 mm grid the affine is a pure translation:
 *    `mm = voxel · spacing + origin`. +x is the subject's **right**.
 * 3. **Scene** `[x, y, z]` — three.js space, y up, z toward the viewer.
 *    `mniToScene` is a proper rotation (determinant +1), never a reflection:
 *    scene x = MNI x (right), scene y = MNI z (up), scene z = −MNI y. The
 *    front of the head is therefore at −z, and a camera that should open on
 *    the face stands at −z; where the camera stands is the scene's business,
 *    the handedness is decided here.
 * 4. **Slice pixels** `(u, v)` — u rightward and v downward on the screen, as
 *    a canvas has them. Which anatomical direction each of those is depends on
 *    the plane and on the display convention, and `slicePlane` is the one
 *    place that decides.
 *
 * ## Two display conventions, and why radiological is the default
 *
 * - `radiological`: axial and coronal images are drawn as if viewed from the
 *   patient's feet / from in front — the patient's **left is on the screen's
 *   right**. This is how clinical MRI is read, in Japan as elsewhere, and a
 *   learner who will read real scans should build the habit on this one.
 * - `neurological`: left is on the left, as most neuroscience figures and the
 *   3D view (seen from behind/above) have it.
 *
 * Neither is "correct", so the atlas never relies on the reader knowing which
 * is on: the edge letters (R/L, A/P, S/I) are computed here from the same
 * mapping that draws the pixels, and are always on screen.
 */

export const PLANES = Object.freeze(['axial', 'coronal', 'sagittal']);
export const CONVENTIONS = Object.freeze(['radiological', 'neurological']);
export const DEFAULT_CONVENTION = 'radiological';

/** The axis a plane is perpendicular to: the one a scroll moves along. */
export const PLANE_AXIS = Object.freeze({ sagittal: 0, coronal: 1, axial: 2 });

/**
 * @typedef {{dims: readonly number[], originMm: readonly number[], spacingMm: readonly number[]}} Grid
 */

export function assertGrid(grid) {
  const ok = (list) => Array.isArray(list) && list.length === 3 && list.every(Number.isFinite);
  if (!grid || !ok(grid.dims) || !ok(grid.originMm) || !ok(grid.spacingMm)) {
    throw new Error('mri atlas: a grid needs dims, originMm and spacingMm, three numbers each');
  }
  if (grid.orientation && grid.orientation !== 'RAS+') {
    throw new Error(`mri atlas: the volume is ${grid.orientation}, and everything here assumes RAS+`);
  }
  if (grid.spacingMm.some((value) => value <= 0)) throw new Error('mri atlas: spacing must be positive');
  return grid;
}

export const voxelCount = (grid) => grid.dims[0] * grid.dims[1] * grid.dims[2];

export const voxelIndex = (grid, [i, j, k]) => i + j * grid.dims[0] + k * grid.dims[0] * grid.dims[1];

export const inGrid = (grid, [i, j, k]) =>
  i >= 0 && j >= 0 && k >= 0 && i < grid.dims[0] && j < grid.dims[1] && k < grid.dims[2];

/** The centre of a voxel, in MNI millimetres. */
export const voxelToMm = (grid, voxel) => voxel.map((value, axis) => value * grid.spacingMm[axis] + grid.originMm[axis]);

/** The voxel a point in MNI millimetres falls in (nearest centre), clamped to the volume. */
export function mmToVoxel(grid, mm) {
  return mm.map((value, axis) => {
    const index = Math.round((value - grid.originMm[axis]) / grid.spacingMm[axis]);
    return Math.min(grid.dims[axis] - 1, Math.max(0, index));
  });
}

export const clampVoxel = (grid, voxel) =>
  voxel.map((value, axis) => Math.min(grid.dims[axis] - 1, Math.max(0, Math.round(value))));

/** −v without a negative zero: a coordinate of −0 compares unequal to 0 in a strict test and prints as "-0". */
const negate = (value) => (value === 0 ? 0 : -value);

/** MNI (x right, y anterior, z superior) → three.js (x right, y up, z toward the viewer). A rotation. */
export const mniToScene = ([x, y, z]) => [x, z, negate(y)];
/** Its inverse. */
export const sceneToMni = ([x, y, z]) => [x, negate(z), y];

/** Which side of the midline a point in MNI space is on. The one definition of "right". */
export function sideOfMm([x], { midlineToleranceMm = 0 } = {}) {
  if (Math.abs(x) <= midlineToleranceMm) return 'midline';
  return x > 0 ? 'right' : 'left';
}

/**
 * How one plane is laid on the screen.
 *
 * Each screen axis is described as `{axis, sign}`: moving one pixel along it
 * moves `sign` voxels along volume axis `axis`. From those two facts the slice
 * extraction, the pixel↔voxel mapping, the crosshair and the edge letters are
 * all derived — there is no second table to keep in step.
 *
 * - axial (looking along z): anterior is up; left/right by convention.
 * - coronal (looking along y): superior is up; left/right by convention.
 * - sagittal (looking along x): superior is up, **anterior on the left** — the
 *   face looks left, as a lateral view is conventionally printed. It has no
 *   left/right on screen, so the convention does not change it.
 *
 * @param {'axial'|'coronal'|'sagittal'} plane
 * @param {Grid} grid
 * @param {'radiological'|'neurological'} [convention]
 */
export function slicePlane(plane, grid, convention = DEFAULT_CONVENTION) {
  if (!PLANES.includes(plane)) throw new Error(`mri atlas: not a plane: ${plane}`);
  if (!CONVENTIONS.includes(convention)) throw new Error(`mri atlas: not a display convention: ${convention}`);
  assertGrid(grid);
  // +i is the patient's right. Radiological puts the patient's right on the
  // screen's left, so u runs against i; neurological runs with it.
  const lateral = { axis: 0, sign: convention === 'radiological' ? -1 : 1 };
  const layout = {
    axial: { u: lateral, v: { axis: 1, sign: -1 } },
    coronal: { u: lateral, v: { axis: 2, sign: -1 } },
    sagittal: { u: { axis: 1, sign: -1 }, v: { axis: 2, sign: -1 } },
  }[plane];
  const through = PLANE_AXIS[plane];
  const width = grid.dims[layout.u.axis];
  const height = grid.dims[layout.v.axis];
  const along = (pixel, size, sign) => (sign > 0 ? pixel : size - 1 - pixel);

  /** The letters at the four edges, read off the mapping rather than written beside it. */
  const POSITIVE = ['R', 'A', 'S'];
  const NEGATIVE = ['L', 'P', 'I'];
  const end = (screenAxis, far) => {
    const towardPositive = far ? screenAxis.sign > 0 : screenAxis.sign < 0;
    return (towardPositive ? POSITIVE : NEGATIVE)[screenAxis.axis];
  };

  return Object.freeze({
    plane,
    convention,
    throughAxis: through,
    width,
    height,
    slices: grid.dims[through],
    /** Physical size of one pixel, for an aspect-correct canvas. */
    pixelMm: Object.freeze([grid.spacingMm[layout.u.axis], grid.spacingMm[layout.v.axis]]),
    edges: Object.freeze({
      left: end(layout.u, false),
      right: end(layout.u, true),
      top: end(layout.v, false),
      bottom: end(layout.v, true),
    }),
    /** Screen pixel (u, v) on slice `slice` → voxel [i, j, k]. */
    toVoxel(u, v, slice) {
      const voxel = [0, 0, 0];
      voxel[layout.u.axis] = along(u, width, layout.u.sign);
      voxel[layout.v.axis] = along(v, height, layout.v.sign);
      voxel[through] = slice;
      return voxel;
    },
    /** Voxel → where it is drawn on this plane, and on which slice. */
    fromVoxel(voxel) {
      return {
        u: along(voxel[layout.u.axis], width, layout.u.sign),
        v: along(voxel[layout.v.axis], height, layout.v.sign),
        slice: voxel[through],
      };
    },
  });
}

/**
 * One slice of a volume, in screen order (row by row, u fastest).
 *
 * @param {ArrayLike<number>} volume flat, x-fastest
 * @param {ReturnType<typeof slicePlane>} plane
 * @param {Grid} grid
 * @param {number} slice
 * @param {Uint8Array} [out] reused between frames
 */
export function extractSlice(volume, plane, grid, slice, out = new Uint8Array(plane.width * plane.height)) {
  const [nx, ny] = grid.dims;
  const strides = [1, nx, nx * ny];
  // The voxel at the top-left pixel, and the flat-index step per pixel along
  // each screen axis. Two multiplications per row instead of a function call
  // per pixel: this runs on every scroll tick, three planes at a time.
  const origin = plane.toVoxel(0, 0, slice);
  const right = plane.toVoxel(1, 0, slice);
  const down = plane.toVoxel(0, 1, slice);
  const flat = (voxel) => voxel[0] * strides[0] + voxel[1] * strides[1] + voxel[2] * strides[2];
  const start = flat(origin);
  const du = flat(right) - start;
  const dv = flat(down) - start;
  let target = 0;
  for (let v = 0; v < plane.height; v += 1) {
    let source = start + v * dv;
    for (let u = 0; u < plane.width; u += 1) {
      out[target] = volume[source];
      target += 1;
      source += du;
    }
  }
  return out;
}

/**
 * A window/level lookup table for 8-bit intensities.
 *
 * `level` is the centre and `width` the span, both in stored units (0–255):
 * values at or below `level − width/2` are black, at or above `level + width/2`
 * white. These are display settings on a quantised template, **not** Hounsfield
 * units or any calibrated signal — MRI intensity has no absolute scale, and the
 * interface never prints a unit beside them.
 */
export function windowLut(level, width, out = new Uint8Array(256)) {
  const span = Math.max(1, width);
  const low = level - span / 2;
  for (let value = 0; value < 256; value += 1) {
    const scaled = ((value - low) / span) * 255;
    out[value] = scaled <= 0 ? 0 : scaled >= 255 ? 255 : Math.round(scaled);
  }
  return out;
}

export const DEFAULT_WINDOW = Object.freeze({ level: 110, width: 220 });

/** Clamp a window to something a slider can show and a reader can recover from. */
export function clampWindow({ level, width }) {
  return {
    level: Math.min(255, Math.max(0, Math.round(level))),
    width: Math.min(510, Math.max(8, Math.round(width))),
  };
}

/**
 * Fit a slice into a box and say where its pixels land — the one transform the
 * drawing and the pointer both use, so a click and a pixel cannot disagree.
 *
 * `zoom` ≥ 1 magnifies about `focus` (slice pixels) — normally the crosshair —
 * and the result is clamped so the slice never leaves the box entirely.
 */
export function sliceViewport(plane, boxWidth, boxHeight, { zoom = 1, focus = null } = {}) {
  const mmWidth = plane.width * plane.pixelMm[0];
  const mmHeight = plane.height * plane.pixelMm[1];
  const fit = Math.min(boxWidth / mmWidth, boxHeight / mmHeight);
  const scale = fit * Math.max(1, zoom);
  const sx = scale * plane.pixelMm[0];
  const sy = scale * plane.pixelMm[1];
  const drawnWidth = plane.width * sx;
  const drawnHeight = plane.height * sy;
  let offsetX = (boxWidth - drawnWidth) / 2;
  let offsetY = (boxHeight - drawnHeight) / 2;
  if (zoom > 1 && focus) {
    // Keep the focus where it was at zoom 1.
    const restX = (boxWidth - plane.width * fit * plane.pixelMm[0]) / 2 + (focus.u + 0.5) * fit * plane.pixelMm[0];
    const restY = (boxHeight - plane.height * fit * plane.pixelMm[1]) / 2 + (focus.v + 0.5) * fit * plane.pixelMm[1];
    offsetX = restX - (focus.u + 0.5) * sx;
    offsetY = restY - (focus.v + 0.5) * sy;
    offsetX = Math.min(0, Math.max(boxWidth - drawnWidth, offsetX));
    offsetY = Math.min(0, Math.max(boxHeight - drawnHeight, offsetY));
    if (drawnWidth <= boxWidth) offsetX = (boxWidth - drawnWidth) / 2;
    if (drawnHeight <= boxHeight) offsetY = (boxHeight - drawnHeight) / 2;
  }
  return {
    offsetX,
    offsetY,
    scaleX: sx,
    scaleY: sy,
    /** Box position → slice pixel, or null outside the slice. */
    toPixel(x, y) {
      const u = Math.floor((x - offsetX) / sx);
      const v = Math.floor((y - offsetY) / sy);
      return u >= 0 && v >= 0 && u < plane.width && v < plane.height ? { u, v } : null;
    },
    /** Slice pixel centre → box position. */
    toBox(u, v) {
      return { x: offsetX + (u + 0.5) * sx, y: offsetY + (v + 0.5) * sy };
    },
  };
}

/**
 * Check an atlas index against the claims the interface makes from it.
 *
 * Returns problems rather than throwing, because the same list is what the
 * asset test prints and what the scene refuses to start on.
 *
 * @param {{grid: Grid, structures: Array<object>}} atlas
 * @param {ArrayLike<number>|null} [labels] the label volume, when it is loaded
 */
export function atlasProblems(atlas, labels = null) {
  const problems = [];
  let grid;
  try {
    grid = assertGrid(atlas?.grid);
  } catch (error) {
    return [error.message];
  }
  if (labels && labels.length !== voxelCount(grid)) {
    problems.push(`the label volume has ${labels.length} voxels and the grid says ${voxelCount(grid)}`);
  }
  for (const structure of atlas.structures ?? []) {
    const name = `label ${structure.label} (${structure.name} ${structure.hemi})`;
    const expected = structure.hemi === 'R' ? 'right' : structure.hemi === 'L' ? 'left' : null;
    if (!expected) problems.push(`${name} has no hemisphere`);
    // The centroid of a structure the atlas calls "right" must be at x > 0.
    // This is the line a mirrored build fails.
    const measured = sideOfMm(structure.centroidMm);
    if (expected && measured !== expected) {
      problems.push(`${name} is called ${expected} and its centroid is on the ${measured} (x = ${structure.centroidMm[0]} mm)`);
    }
    const voxel = mmToVoxel(grid, structure.interiorPointMm);
    if (labels && labels[voxelIndex(grid, voxel)] !== structure.label) {
      problems.push(`${name}: its interior point lands on label ${labels[voxelIndex(grid, voxel)]}, not inside it`);
    }
  }
  return problems;
}
