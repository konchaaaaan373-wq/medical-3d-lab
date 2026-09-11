import * as THREE from 'three';
import { carveNamedParts } from '../../shared/anatomy/organParts.js';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The prostate by zone, with the urethra through it and what joins it there.
 *
 * `prostate.js` draws one gland with a urethra through it, because
 * `prostate-outflow` needs gland volume and urethral calibre to be the same
 * thing. This is the other scale, and it makes the division that decides what
 * prostate disease *is*: **the zones**. Cancer arises in the peripheral zone,
 * which is the one a finger reaches; benign enlargement arises in the
 * transition zone, which is the one wrapped round the urethra. Those are two
 * different parts of one organ and nothing about the outside distinguishes them.
 *
 * ## The zones as a partition
 *
 * McNeal's scheme, drawn as the simplest arrangement that keeps the relations:
 *
 * - **Anterior fibromuscular stroma** — the front of the gland, no glandular
 *   tissue in it. A coronal plane takes it off the front.
 * - **Transition and central zones** — the *inner* gland, around the urethra
 *   and the ejaculatory ducts. One scaled copy of the gland's own surface,
 *   split by an oblique plane at the level of the verumontanum: what is in
 *   front of and below it is transition, what is behind and above is central.
 * - **Peripheral zone** — the *outside* of the gland behind that stroma, which
 *   is a shell rather than a wedge. It is about seventy per cent of the
 *   glandular tissue and it is what a rectal examination is feeling.
 *
 * **The boundaries are surfaces of revolution and planes; real ones are
 * neither.** The proportions are drawn so four zones can be told apart, and the
 * copy says so. What the model claims is which zone is where, relative to the
 * urethra, the ejaculatory ducts and the rectum.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. No dimension here is a measurement,
 * and no volume may be read off it.
 */

/** The gland's proportions, before the warp. */
export const PROSTATE_SCALE = Object.freeze([0.64, 0.58, 0.6]);

/**
 * Where the inner gland stops and the peripheral zone starts, as a fraction of
 * the gland's own radius.
 *
 * A display value, not a dimension: at the real proportions the peripheral zone
 * is about seventy per cent of the glandular tissue and the transition zone
 * five, so drawn to scale the inner zones are a speck. This spreads them so
 * each is a surface that can be selected. Only the arrangement is claimed.
 */
export const INNER_GLAND_FRACTION = 0.56;

/**
 * How far back the anterior fibromuscular stroma reaches.
 *
 * It is a shield over the front of the gland, not a third of it. At 0.2 it took
 * the whole anterior third and the opening frame was a cream lid with a rim of
 * prostate around it — true in that the stroma is the front, useless in that
 * the scene is about the zones behind it.
 */
export const STROMA_PLANE_Z = 0.3;

/**
 * The level of the verumontanum, where the ejaculatory ducts open and where the
 * urethra bends forward. Everything about the inner gland is placed from it.
 */
export const VERUMONTANUM = Object.freeze([0, -0.06, -0.09]);

/** Where the urethra enters at the bladder neck and leaves at the apex. */
export const URETHRA_PATH = Object.freeze([
  [0, 0.78, 0.04],
  [0, 0.36, 0.02],
  [0, -0.04, -0.02],
  [0, -0.38, 0.08],
  [0, -0.82, 0.16],
]);

/** A chestnut: broader at the base, tapering to the apex, grooved behind. */
function prostateWarp(v) {
  const down = smoothstep(0.15, -1, v.y);
  v.x *= 1 - 0.36 * down;
  v.z *= 1 - 0.36 * down;
  // The median sulcus: the midline groove a finger feels on the back.
  if (v.z < -0.25) v.z += 0.14 * Math.exp(-Math.pow(v.x / 0.2, 2));
  // Flatter behind than in front, which is what makes the rectal surface flat.
  if (v.z < 0) v.z *= 0.9;
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildProstateZones({ colors = {}, opacity = 0.95, detail = 7 } = {}) {
  const object = new THREE.Group();
  object.name = 'prostate-zones';
  const disposables = [];

  const verumontanum = new THREE.Vector3(...VERUMONTANUM);

  // The plane through the verumontanum that separates the two inner zones. It
  // tips back and up, because the central zone is the cone the ejaculatory
  // ducts run down and it reaches the base behind the transition zone.
  const innerSplit = { through: [...VERUMONTANUM], normal: [0, -0.55, 0.84] };

  const zones = carveNamedParts({
    warp: prostateWarp,
    scale: [...PROSTATE_SCALE],
    cacheKey: 'prostate',
    detail,
    opacity,
    parts: [
      {
        id: 'anterior-fibromuscular-stroma',
        color: colors['anterior-fibromuscular-stroma'] ?? '#c9b6a8',
        planes: [{ through: [0, 0, STROMA_PLANE_Z], normal: [0, 0, -1] }],
      },
      {
        id: 'peripheral-zone',
        color: colors['peripheral-zone'] ?? '#c76b6f',
        // The outside of the gland, behind the stroma. A shell, not a wedge.
        radial: { from: INNER_GLAND_FRACTION, to: 1 },
        planes: [{ through: [0, 0, STROMA_PLANE_Z], normal: [0, 0, 1] }],
      },
      {
        id: 'transition-zone',
        color: colors['transition-zone'] ?? '#e0a14e',
        // The inner gland in front of and below the verumontanum plane: the
        // part wrapped round the urethra above it.
        radial: { to: INNER_GLAND_FRACTION },
        planes: [{ through: innerSplit.through, normal: innerSplit.normal.map((n) => -n) }],
      },
      {
        id: 'central-zone',
        color: colors['central-zone'] ?? '#8f6bbd',
        // The inner gland behind and above it: the cone the ejaculatory ducts
        // run down, reaching the base.
        radial: { to: INNER_GLAND_FRACTION },
        planes: [innerSplit],
      },
    ],
  });
  object.add(zones.object);

  // --- what runs through it -------------------------------------------------
  const urethraCurve = smoothCurve(URETHRA_PATH.map((point) => [...point]));
  const urethraSurface = new TubeSurface(urethraCurve, { radius: () => 0.075, steps: 50, radial: 14 });
  const urethraMaterial = mucosaMaterial({ color: colors['prostatic-urethra'] ?? '#8fd6c4' });
  const urethra = new THREE.Mesh(urethraSurface.geometry, urethraMaterial);
  urethra.name = 'prostatic-urethra';
  disposables.push(urethraSurface, urethraMaterial);
  object.add(urethra);

  // The verumontanum: the ridge on the back wall of the urethra where the
  // ejaculatory ducts open. It is the landmark everything inside is placed from.
  const crestGeometry = shapedSphere({ detail: 3, scale: [0.055, 0.085, 0.04] });
  const crestMaterial = tissueMaterial({
    color: colors.verumontanum ?? '#d8703f',
    roughness: 0.32,
    emissiveIntensity: 0.22,
  });
  const crest = new THREE.Mesh(crestGeometry, crestMaterial);
  crest.position.copy(verumontanum);
  crest.name = 'verumontanum';
  disposables.push(crestGeometry, crestMaterial);
  object.add(crest);

  // --- what joins it at the base -------------------------------------------
  const tube = (id, points, radius, color, tubeOpacity = opacity) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps: 36, radial: 12 });
    const material = wallMaterial({ color: colors[id] ?? color, opacity: tubeOpacity });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = id;
    disposables.push(surface, material);
    object.add(mesh);
    return mesh;
  };

  const ducts = [];
  const vesicles = [];
  const vasa = [];
  for (const side of [
    { name: 'right', sign: -1 },
    { name: 'left', sign: 1 },
  ]) {
    const { name, sign } = side;
    // The ejaculatory duct: from the base, behind the central zone, down to the
    // verumontanum. It is *inside* the gland for its whole course, which is why
    // the central zone is the shape it is.
    ducts.push([
      `${name}-ejaculatory-duct`,
      tube(
        `${name}-ejaculatory-duct`,
        [
          [sign * 0.2, 0.6, -0.3],
          [sign * 0.14, 0.3, -0.24],
          [sign * 0.06, 0.06, -0.15],
          verumontanum.toArray(),
        ],
        0.036,
        '#b05a8f'
      ),
    ]);

    // The seminal vesicle: a lobulated sac behind the bladder and above the
    // prostate, lateral to the ampulla of the vas.
    const geometry = shapedSphere({
      detail: 5,
      scale: [0.16, 0.3, 0.14],
      warp: (v) => {
        // Lobulated rather than smooth: it is a coiled tube in a bag.
        v.multiplyScalar(1 + 0.16 * Math.sin(v.y * 9) * Math.cos(v.x * 6));
      },
    });
    const material = tissueMaterial({
      color: colors[`${name}-seminal-vesicle`] ?? colors['seminal-vesicle'] ?? '#b58ac4',
      roughness: 0.45,
      opacity: 0.95,
    });
    const vesicle = new THREE.Mesh(geometry, material);
    vesicle.position.set(sign * 0.52, 0.92, -0.42);
    vesicle.rotation.z = sign * 0.5;
    vesicle.name = `${name}-seminal-vesicle`;
    disposables.push(geometry, material);
    object.add(vesicle);
    vesicles.push([`${name}-seminal-vesicle`, vesicle]);

    // The vas deferens, medial to it, widening into its ampulla before the two
    // join to make the ejaculatory duct.
    vasa.push([
      `${name}-vas-deferens`,
      tube(
        `${name}-vas-deferens`,
        [
          [sign * 0.5, 1.55, -0.5],
          [sign * 0.32, 1.2, -0.46],
          [sign * 0.24, 0.82, -0.38],
          [sign * 0.2, 0.6, -0.3],
        ],
        0.052,
        '#9c6aa8'
      ),
    ]);
  }

  // --- the two things it is between ----------------------------------------
  const neckSurface = new TubeSurface(
    smoothCurve([
      [0, 1.5, 0.12],
      [0, 1.05, 0.08],
      // Down to the top of the gland, not to a point above it: the urethra
      // continues straight out of the bladder into the prostate, and a gap
      // between them says the opposite.
      [0, 0.52, 0.04],
    ]),
    { radius: (u) => 0.4 - 0.22 * u * u, steps: 26, radial: 18 }
  );
  const neckMaterial = wallMaterial({ color: colors['bladder-neck'] ?? '#c8a6b8', opacity: 0.7 });
  const bladderNeck = new THREE.Mesh(neckSurface.geometry, neckMaterial);
  bladderNeck.name = 'bladder-neck';
  disposables.push(neckSurface, neckMaterial);
  object.add(bladderNeck);

  const rectumSurface = new TubeSurface(
    smoothCurve([
      [0, 1.2, -1.02],
      [0, 0.3, -0.94],
      [0, -0.6, -0.86],
      [0, -1.3, -0.78],
    ]),
    { radius: () => 0.3, steps: 30, radial: 18 }
  );
  const rectumMaterial = wallMaterial({ color: colors.rectum ?? '#c68f72', opacity: 0.62 });
  const rectum = new THREE.Mesh(rectumSurface.geometry, rectumMaterial);
  rectum.name = 'rectum';
  disposables.push(rectumSurface, rectumMaterial);
  object.add(rectum);

  const index = new Map([
    ...zones.parts.map((part) => [part.id, part.mesh]),
    ['prostatic-urethra', urethra],
    ['verumontanum', crest],
    ...ducts,
    ...vesicles,
    ...vasa,
    ['bladder-neck', bladderNeck],
    ['rectum', rectum],
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    zones,
    urethraCurve,
    /**
     * The points a disease scene should read rather than retype. Moving the
     * gland moves these; a scene that typed its own copy would not notice.
     */
    anchorPoints: {
      verumontanum: verumontanum.clone(),
      bladderNeck: urethraCurve.getPointAt(0),
      apex: urethraCurve.getPointAt(1),
      /** The face a rectal examination reaches, in the gland's own frame. */
      rectalSurface: new THREE.Vector3(0, -0.05, -PROSTATE_SCALE[2] * 0.9),
    },
    anchors: {
      prostate: new THREE.Vector3(-1.25, 0.1, 0.5),
      urethra: new THREE.Vector3(0.85, -0.95, 0.5),
      vesicle: new THREE.Vector3(1.35, 1.25, -0.3),
    },
    dispose() {
      zones.dispose();
      for (const item of disposables) item.dispose?.();
    },
  };
}
