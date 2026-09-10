import * as THREE from 'three';
import { TubeSurface, coilCurve, placeCurve, smoothCurve } from '../../shared/geometry/tube.js';
import { wallMaterial } from '../../shared/materials.js';
import { travellingWave } from '../../shared/motion/rhythm.js';

/**
 * Small bowel and colon.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The small bowel is a folded coil of
 * narrow tube; the colon is a wider tube on a fixed frame — caecum, ascending,
 * transverse, descending, sigmoid — with haustral sacculations modelled as a
 * periodic change in calibre. Lengths, loop counts and positions are
 * illustrative. Screen-left is the patient's right, so the ascending colon is
 * on the left of the frame.
 */
export function buildSmallIntestine({ color = '#d99a7c', seed = 12, radius = 0.21 } = {}) {
  // Loops radiating from the middle of the abdomen, overlapping each other,
  // turned a little off-axis so the rosette is not seen dead on and sitting
  // where the loops actually lie — below the transverse colon.
  //
  // The placement is baked into the curve rather than applied to the mesh: the
  // curve is what the contents follow, and a mesh moved out from under it puts
  // the particles outside the bowel.
  const curve = placeCurve(
    coilCurve({ loops: 8, inner: 0.5, outer: 1.62, depth: 1.1, height: 0.95, seed, jitter: 0.4 }),
    { rotation: [0.06, 0.24, 0.1], position: [0, -0.18, 0] }
  );
  const surface = new TubeSurface(curve, { radius: () => radius, steps: 300, radial: 16 });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.96 }));
  mesh.name = 'small-intestine';

  return {
    object: mesh,
    surface,
    curve,
    anchors: { small: new THREE.Vector3(0, 1.5, 1.2) },
    /**
     * Segmentation and propulsion are the same machinery at different
     * settings: many shallow standing constrictions, or few deep travelling
     * ones. `propulsion` (0..1) moves between them.
     */
    setMotility(phase, propulsion) {
      const count = Math.round(9 - 7 * propulsion);
      const depth = 0.16 + 0.3 * propulsion;
      surface.refresh((u, base) => base * (1 - depth * travellingWave(u, phase, { width: 0.02, count })));
    },
    dispose() {
      surface.dispose();
    },
  };
}

/**
 * The colon's frame, from the caecum round to the sigmoid.
 *
 * Exported with the corners named, because a second builder cuts this same
 * colon into those named lengths and the two have to be one colon. The comment
 * beside each point is what that point *is*, and `colonParts.js` finds its
 * boundaries from these rather than from numbers of its own.
 */
export const COLON_PATH = Object.freeze([
  [-1.75, -2.05, 0.35], // caecum
  [-1.95, -1.2, 0.25],
  [-1.98, 0.35, 0.1], // ascending
  [-1.74, 1.3, 0.05], // right colic (hepatic) flexure
  // The transverse colon hangs between the two flexures. It is the mobile part,
  // slung on a mesentery of its own, and it is the *longest* stretch of the
  // large bowel — in most descriptions about twice the descending colon. Drawn
  // as a shallow bridge between the flexures it was neither: it read as a shelf
  // and it measured shorter than the descending colon, which is the relation
  // the wrong way round. What buys the length back is the dip, not a longer
  // frame: the colon still crosses the same abdomen.
  [-0.72, 0.52, -0.05], // transverse, descending into the sag
  [0.5, 0.56, -0.05], // and coming back up out of it
  // **Higher than the hepatic flexure, and sharper.** It was drawn 0.45 lower,
  // which is the relation the wrong way round: the spleen sits higher than the
  // liver's inferior surface, so the colon turns down at a more acute angle and
  // from further up on the left than it turned across on the right.
  [1.86, 1.72, 0.05], // left colic (splenic) flexure
  [1.95, -0.6, 0.15], // descending
  // The sigmoid is a loop, not a diagonal. It was drawn as a short sweep to the
  // midline, which made it the shortest named length in the model; in an adult
  // it is comparable to the transverse colon and longer than the descending.
  // The loop is what makes it that long, and it is also what makes the sigmoid
  // the part that twists — so drawing it straight loses the shape the name is
  // about. Where the loop goes varies from person to person; this is one.
  [1.66, -1.74, 0.25],
  [0.66, -2.14, 0.3], // sigmoid
  [-0.15, -1.83, 0.3], // the loop turns back up before the rectum
  [-0.36, -2.42, 0.2],
  [0.04, -2.86, 0.1],
]);

/** Which control point each named part is centred on, by index into the path. */
export const COLON_LANDMARKS = Object.freeze({
  caecum: 0,
  ascending: 2,
  rightColicFlexure: 3,
  transverse: 4,
  leftColicFlexure: 6,
  descending: 7,
  sigmoid: 9,
});

/** @param {[number, number, number]} [offset] */
export const colonPath = (offset = [0, 0, 0]) =>
  smoothCurve(COLON_PATH.map(([x, y, z]) => [x + offset[0], y + offset[1], z + offset[2]]));

/**
 * Calibre along the colon: it narrows towards the sigmoid, and the haustra are
 * a periodic rise and fall on top of that.
 *
 * @param {number} sacculations
 */
export const colonCalibre = (sacculations = 22) => (u) =>
  (0.34 - 0.12 * Math.pow(u, 1.6)) * (1 + 0.15 * Math.cos(u * sacculations * Math.PI * 2));

/**
 * A label point just clear of the top of the transverse colon.
 *
 * The transverse colon is the one part of the frame that moves when the sag is
 * retuned, so its label is measured from the curve — a little above the highest
 * point of the middle third, which is the stretch the name refers to.
 */
function transverseLabel(curve) {
  // The curve already carries the scene's offset, so nothing is added here.
  let best = curve.getPointAt(0.3);
  for (let i = 0; i <= 40; i += 1) {
    const point = curve.getPointAt(0.3 + 0.22 * (i / 40));
    if (point.y > best.y) best = point;
  }
  // Clear of the tube's own calibre, not of the frame: `colonCalibre` is about
  // 0.3 here and the sacculations ride on top of it.
  return best.clone().setY(best.y + 0.55);
}

export function buildColon({ color = '#c58a72', sacculations = 22, offset = [0, 0, 0] } = {}) {
  // `offset` moves the colon *and* its curve and anchors together, so a scene
  // that sets it back behind the small bowel does not have to remember to
  // apply the same shift to everything that reads them.
  const [ox, oy, oz] = offset;
  const curve = colonPath(offset);

  // Haustra: the calibre rises and falls along the tube, which is what gives
  // the colon its segmented outline at a glance.
  const surface = new TubeSurface(curve, {
    radius: colonCalibre(sacculations),
    steps: 320,
    radial: 16,
  });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.96 }));
  mesh.name = 'colon';

  return {
    object: mesh,
    surface,
    curve,
    anchors: {
      ileocecal: new THREE.Vector3(-2.4 + ox, -2.0 + oy, 0.6 + oz),
      ascending: new THREE.Vector3(-2.7 + ox, 0.3 + oy, 0.4 + oz),
      // Read off the colon rather than typed above where the transverse colon
      // used to be drawn: when the sag was deepened the label stayed at the old
      // height and ended up a whole tube-width away from the thing it names.
      transverse: transverseLabel(curve),
      sigmoid: new THREE.Vector3(0.9 + ox, -2.5 + oy, 0.5 + oz),
    },
    /** Slow, intermittent mass movements rather than a continuous train. */
    setMotility(phase, strength) {
      surface.refresh((u, base) => base * (1 - 0.22 * strength * travellingWave(u, phase, { width: 0.05, count: 2 })));
    },
    dispose() {
      surface.dispose();
    },
  };
}

/**
 * The duodenal C-loop.
 *
 * PROTOTYPE. It exists mostly as context: the pancreatic head sits inside this
 * curve and the bile duct ends in it, so the neighbouring scenes borrow it
 * rather than each drawing their own approximation of "somewhere over there".
 */
export function buildDuodenum({ color = '#d99a7c' } = {}) {
  const curve = smoothCurve([
    [-1.05, 0.95, 0.1],
    [-1.62, 0.55, 0.05],
    [-1.78, -0.15, 0],
    [-1.52, -0.78, 0.02],
    [-0.85, -0.95, 0.05],
    [-0.2, -0.72, 0.08],
  ]);
  // Closed at both ends rather than left as flat discs. Neither end is a blind
  // end — one continues from the pylorus and one into the jejunum — but a lit
  // disc facing the camera reads as a cut pipe, which is what the pancreas
  // scene was showing on either side of the head. Rolling the calibre off over
  // the last twentieth closes it as a dome instead. It is a drawing decision
  // about the edge of the model, not a claim that the duodenum ends there.
  const cap = (t) => (t >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))));
  const surface = new TubeSurface(curve, {
    radius: (u) => 0.2 * cap(u / 0.05) * cap((1 - u) / 0.05),
    steps: 90,
    radial: 16,
  });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.9 }));
  mesh.name = 'duodenum';
  return {
    object: mesh,
    surface,
    curve,
    anchors: { duodenum: new THREE.Vector3(-2.3, -0.35, 0.4) },
    dispose() {
      surface.dispose();
    },
  };
}
