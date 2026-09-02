import * as THREE from 'three';

import { TubeSurface, coilCurve, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';
import { buildGlomerulus } from './glomerulus.js';

/**
 * A whole nephron: the glomerulus, and the tubule that follows it.
 *
 * PROTOTYPE-GRADE ANATOMY, NAMED STRUCTURE. What is right, and what the shape
 * exists to carry, is the **order and the geometry of the segments**: a
 * filtering tuft, a long convoluted proximal tubule in the cortex, a hairpin
 * that descends into the medulla and comes back, a shorter distal convolution
 * that returns to touch its own glomerulus, and a collecting duct running down
 * and out. Lengths, calibres and the number of convolutions are illustrative.
 *
 * Two pieces of that arrangement are the reason it is worth drawing at all
 * rather than diagramming:
 *
 *   - **The loop goes somewhere.** It descends into a different environment
 *     and comes back, which is what a counter-current arrangement *is*, and
 *     which no side-on diagram of a tube shows.
 *   - **The distal tubule comes back and touches its own glomerulus.** That
 *     contact is the juxtaglomerular apparatus, and it is the whole anatomical
 *     basis of tubuloglomerular feedback: the segment that measures what the
 *     tubule failed to reabsorb is in physical contact with the arteriole that
 *     controls what gets filtered. A learner who has seen the tube come back
 *     and touch its own beginning does not have to be told that the feedback
 *     loop exists.
 *
 * **The builder knows nothing about any disease**, and nothing about a model.
 * It exposes segments by anatomical name and lets a scene say how much each is
 * reabsorbing and how present the filtrate in it should be. Which of those
 * happens, and by how much, is a reading of a model somewhere else.
 *
 * Local coordinates throughout (architecture rule 2): the segment curves are
 * authored in the nephron's own frame, with the cortex at the top and the
 * medulla below, so the whole thing can be placed anywhere without any caller
 * needing to know where a loop tip "really" is.
 *
 * @param {{ tubule?: string, filtrate?: string, medulla?: string,
 *           afferent?: string, efferent?: string }} [colors]
 */
export function buildNephron(colors = {}) {
  const {
    tubule = '#d8b46a',
    filtrate = '#e8d75f',
    medulla = '#8a6f9c',
    duct = '#6fa3a8',
    afferent = '#d2564f',
    efferent = '#b8735f',
  } = colors;

  const object = new THREE.Group();
  object.name = 'nephron';

  // The glomerulus is reused rather than redrawn. It already knows how to
  // narrow an arteriole and how to look like it is filtering, and the rule is
  // that an organ is modelled once (`CLAUDE.md`: Organ と Disease を混ぜない).
  const glomerulus = buildGlomerulus({ afferent, efferent, filtrate });
  glomerulus.object.position.set(-1.9, 2.35, 0);
  glomerulus.object.scale.setScalar(0.55);
  object.add(glomerulus.object);

  /** Where the corpuscle hands over to the tubule, in nephron coordinates. */
  const origin = new THREE.Vector3(-0.95, 1.95, 0.1);

  const segments = {};

  /**
   * One named tubular segment.
   *
   * @param {string} name anatomical, never positional — architecture rule 1
   * @param {THREE.Curve} curve
   */
  function segment(name, curve, { radius, color = tubule, radial = 12, steps = 90 }) {
    const surface = new TubeSurface(curve, { radius, steps, radial });
    const material = tissueMaterial({ color, roughness: 0.42, opacity: 1, emissiveIntensity: 0.05 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    object.add(mesh);
    segments[name] = { name, curve, surface, mesh, material, baseColor: new THREE.Color(color) };
    return segments[name];
  }

  // --- proximal convoluted tubule ------------------------------------------
  // Convoluted, and packed against the corpuscle it drains. It is the longest
  // segment and it does about two thirds of the reabsorption, so it is given
  // the most length on screen — the one place where drawn size is allowed to
  // track physiological importance, because here they genuinely agree.
  const proximalCoil = coilCurve({ loops: 5, inner: 0.28, outer: 0.62, depth: 0.5, height: 0.85, seed: 13 });
  // Offset clear of the corpuscle: drawn concentric with it the coil sat on
  // top of the tuft and hid the one structure the reader most needs to see.
  const proximalPoints = proximalCoil.getSpacedPoints(70).map((point) =>
    new THREE.Vector3(point.x + origin.x + 1.15, point.y + origin.y - 0.5, point.z + origin.z)
  );
  segment('proximalConvoluted', smoothCurve(proximalPoints, { tension: 0.5 }), {
    radius: () => 0.11,
  });

  const proximalEnd = proximalPoints[proximalPoints.length - 1];

  // --- the loop -------------------------------------------------------------
  // Down into the medulla and back. The two limbs are separate segments
  // because they do opposite things — one is permeable to water and not to
  // salt, the other the reverse — and a scene that wanted to say so could not
  // if they were one tube.
  const loopTip = new THREE.Vector3(0.55, -2.35, 0.05);
  segment(
    'descendingLimb',
    smoothCurve(
      [
        [proximalEnd.x, proximalEnd.y, proximalEnd.z],
        [0.28, 0.55, 0.06],
        [0.36, -0.75, 0.04],
        [0.42, -1.7, 0.05],
        [loopTip.x - 0.14, loopTip.y, loopTip.z],
      ],
      { tension: 0.45 }
    ),
    { radius: () => 0.085, color: medulla, steps: 70 }
  );

  segment(
    'ascendingLimb',
    smoothCurve(
      [
        [loopTip.x - 0.14, loopTip.y, loopTip.z],
        [loopTip.x + 0.16, loopTip.y - 0.06, loopTip.z],
        [0.92, -1.7, 0.05],
        [0.98, -0.75, 0.04],
        [0.9, 0.55, 0.06],
        [0.6, 1.62, 0.08],
      ],
      { tension: 0.45 }
    ),
    { radius: () => 0.095, steps: 70 }
  );

  // --- distal convoluted tubule --------------------------------------------
  // It returns to the vascular pole of its own glomerulus. The last point is
  // deliberately close to where the arterioles are: that contact is the
  // juxtaglomerular apparatus, and it is the anatomy the whole feedback story
  // rests on.
  const macula = new THREE.Vector3(-1.42, 2.02, 0.12);
  segment(
    'distalConvoluted',
    smoothCurve(
      [
        [0.6, 1.62, 0.08],
        [0.05, 2.05, 0.2],
        [-0.55, 1.72, 0.26],
        [-1.05, 2.12, 0.2],
        [macula.x, macula.y, macula.z],
      ],
      { tension: 0.5 }
    ),
    { radius: () => 0.085, steps: 60 }
  );

  // --- collecting duct ------------------------------------------------------
  // Not part of this nephron — many nephrons drain into one — but drawn,
  // because it is where the filtrate finally becomes urine and where the
  // concentrating happens. It runs back down through the medulla.
  segment(
    'collectingDuct',
    smoothCurve(
      [
        [macula.x, macula.y, macula.z],
        [-1.55, 1.35, 0.05],
        [-1.35, 0.2, -0.02],
        [-1.2, -1.2, -0.04],
        [-1.08, -2.6, -0.05],
      ],
      { tension: 0.5 }
    ),
    // Its own colour, not the medulla's. Drawn in the medullary purple it was
    // indistinguishable from the descending limb running beside it, and "which
    // of these two tubes am I looking at" is not a question the scene should
    // make the reader answer.
    { radius: (u) => 0.13 + 0.03 * u, color: duct, steps: 60 }
  );

  /** The order filtrate travels, so a scene can drive a stream along it. */
  const flowOrder = [
    'proximalConvoluted',
    'descendingLimb',
    'ascendingLimb',
    'distalConvoluted',
    'collectingDuct',
  ];

  return {
    object,
    glomerulus,
    segments,
    flowOrder,

    /**
     * The paths a particle stream can walk, in the order filtrate takes them.
     *
     * **The blood paths are in the glomerulus's own frame**, not the nephron's:
     * the corpuscle is a scaled, offset child, and a stream built from these
     * curves has to be added under `glomerulus.object` or it draws a cloud of
     * particles in empty space beside the vessels. `bloodParent` is that
     * object, so a caller cannot get it wrong by reading the paths alone.
     */
    paths: {
      blood: glomerulus.paths.afferent.concat(glomerulus.paths.efferent),
      filtrate: flowOrder.map((name) => segments[name].curve),
    },
    bloodParent: glomerulus.object,

    /**
     * Where labels hang. Anatomical names, in nephron coordinates — a caller
     * asking for "the loop tip" must never have to know it is at u = 0.5 of
     * some curve (architecture rule 1).
     */
    anchors: {
      glomerulus: new THREE.Vector3(-1.9, 3.05, 0.2),
      proximalConvoluted: new THREE.Vector3(1.0, 1.15, 0.4),
      loopTip: loopTip.clone().add(new THREE.Vector3(0, -0.35, 0)),
      ascendingLimb: new THREE.Vector3(1.35, -0.6, 0.15),
      maculaDensa: macula.clone().add(new THREE.Vector3(-0.05, 0.32, 0.25)),
      collectingDuct: new THREE.Vector3(-1.75, -2.15, 0.2),
    },

    /**
     * How strongly a segment reads as reabsorbing.
     *
     * **Presentation, and named as such.** Reabsorption is a rate and there is
     * no honest way to draw a rate; what this does is warm the segment towards
     * the colour of active tissue and thicken it slightly, so that "this part
     * has stopped working" is visible beside the number that says so. The
     * physiological value never comes from here and never goes back into it.
     *
     * @param {string} name an anatomical segment name
     * @param {number} fraction 0 (doing nothing) to 1 (working normally)
     */
    setSegmentActivity(name, fraction) {
      const found = segments[name];
      if (!found) throw new Error(`nephron: no segment "${name}"`);
      const shown = Math.min(1, Math.max(0, fraction));
      found.material.emissiveIntensity = 0.02 + 0.22 * shown;
      // A segment that has given up loses its warmth rather than its shape.
      found.material.color.copy(found.baseColor).lerp(new THREE.Color('#6b6f78'), (1 - shown) * 0.6);
      found.surface.refresh((u, base) => base * (0.9 + 0.15 * shown));
    },

    /**
     * How much filtrate is passing, as an opacity on the tubule walls.
     *
     * Also presentation: an obstructed nephron and an unperfused one both stop
     * flowing, and the scene distinguishes them with words and numbers, not by
     * inventing two different ways of looking empty.
     *
     * @param {number} fraction
     */
    setFiltrateVolume(fraction) {
      const shown = Math.min(1.4, Math.max(0, fraction));
      for (const name of flowOrder) {
        segments[name].material.opacity = 0.5 + 0.5 * Math.min(1, shown);
        segments[name].material.transparent = true;
      }
      glomerulus.setFiltration(Math.min(1, shown));
    },

    dispose() {
      for (const found of Object.values(segments)) {
        found.surface.dispose();
        found.material.dispose();
      }
      glomerulus.dispose();
    },
  };
}
