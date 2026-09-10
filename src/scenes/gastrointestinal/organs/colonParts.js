import * as THREE from 'three';
import { wallMaterial } from '../../shared/materials.js';
import { nearestU, tubeParts } from '../../shared/anatomy/tubeParts.js';
import { COLON_LANDMARKS, COLON_PATH, colonCalibre, colonPath } from './intestine.js';

/**
 * The same colon, cut into the parts anatomy names.
 *
 * `intestine.js` owns the frame — where the colon runs and how its calibre
 * changes along it — and this reads both from there. What is different is the
 * purpose: `buildColon` returns one tube because a mass movement travels along
 * one tube, and this returns one per named part because a reader pointing at
 * the transverse colon has to hit the transverse colon.
 *
 * ## Where the boundaries come from
 *
 * From the path itself. Each control point in `COLON_PATH` is a place — the
 * caecum, the ascending colon, the right colic flexure — and `COLON_LANDMARKS`
 * says which. A boundary is the midpoint along the path between two
 * neighbouring landmarks, found by measuring, so moving a corner of the colon
 * moves the parts either side of it rather than leaving them where a typed
 * number put them.
 *
 * ## What this does not claim
 *
 * The two flexures are drawn as short lengths of tube at the corners; a flexure
 * is a bend rather than a segment, and calling one selectable is a convenience
 * for pointing at the bend. There is no appendix, no taenia coli, no
 * mesentery, no rectum and no anal canal: the path stops where `buildColon`'s
 * stops, which is at the sigmoid.
 */

/** The named parts, in the order the colon runs. */
export const COLON_PART_IDS = Object.freeze([
  'caecum',
  'ascending-colon',
  'right-colic-flexure',
  'transverse-colon',
  'left-colic-flexure',
  'descending-colon',
  'sigmoid-colon',
]);

export const COLON_PART_COLORS = Object.freeze({
  caecum: '#c98f6f',
  'ascending-colon': '#c58a72',
  'right-colic-flexure': '#b57b6b',
  'transverse-colon': '#cf9478',
  'left-colic-flexure': '#b57b6b',
  'descending-colon': '#bd8270',
  'sigmoid-colon': '#ad7468',
});

/**
 * @param {{colors?: Record<string, string>, opacity?: number, sacculations?: number,
 *          offset?: [number, number, number]}} [options]
 */
export function buildColonParts({
  colors = COLON_PART_COLORS,
  opacity = 0.96,
  sacculations = 22,
  offset = [0, 0, 0],
} = {}) {
  const object = new THREE.Group();
  object.name = 'colon-parts';

  const curve = colonPath(offset);
  const radiusAt = colonCalibre(sacculations);

  // Each landmark's position along the path, measured rather than assumed: a
  // Catmull-Rom curve does not put its control points at even fractions of its
  // own arc length, and treating index/count as a fraction put the splenic
  // flexure in the middle of the transverse colon.
  const at = {};
  for (const [name, index] of Object.entries(COLON_LANDMARKS)) {
    const [x, y, z] = COLON_PATH[index];
    at[name] = nearestU(curve, new THREE.Vector3(x + offset[0], y + offset[1], z + offset[2]), 400);
  }
  /**
   * How much of the path a flexure takes.
   *
   * A flexure is a bend, not a segment, so it gets a short length centred on
   * its corner. Splitting at the midpoints between landmarks instead — which is
   * the obvious rule and was the first one here — gave the splenic flexure a
   * sixth of the whole colon and left the transverse colon shorter than the
   * bend at the end of it.
   */
  const FLEXURE_HALF = 0.045;
  /**
   * Where the caecum ends. Schematic, and the one boundary here that is: the
   * caecum ends at the ileocaecal junction and no ileum is drawn arriving, so
   * there is nothing in the geometry to measure it from.
   */
  const CAECUM_TO = 0.1;

  const rf = at.rightColicFlexure;
  const lf = at.leftColicFlexure;
  const sigmoidFrom = (at.descending + at.sigmoid) / 2;

  const regions = [
    { id: 'caecum', from: 0, to: CAECUM_TO },
    { id: 'ascending-colon', from: CAECUM_TO, to: rf - FLEXURE_HALF },
    { id: 'right-colic-flexure', from: rf - FLEXURE_HALF, to: rf + FLEXURE_HALF },
    { id: 'transverse-colon', from: rf + FLEXURE_HALF, to: lf - FLEXURE_HALF },
    { id: 'left-colic-flexure', from: lf - FLEXURE_HALF, to: lf + FLEXURE_HALF },
    { id: 'descending-colon', from: lf + FLEXURE_HALF, to: sigmoidFrom },
    { id: 'sigmoid-colon', from: sigmoidFrom, to: 1 },
  ];

  const built = tubeParts(curve, radiusAt, regions, {
    radial: 18,
    steps: 340,
    material: (part) => wallMaterial({ color: colors[part.id], opacity }),
  });
  for (const part of built.parts) object.add(part.mesh);

  const index = new Map(built.parts.map((part) => [part.id, part]));

  return {
    object,
    curve,
    parts: built.parts,
    part: (id) => index.get(id) ?? null,
    /** Where each landmark sits along the path, for anything that has to point. */
    landmarksAt: at,
    dispose: built.dispose,
  };
}
