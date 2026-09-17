import * as THREE from 'three';
import { shapedSphere, shellOfRevolution, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The ear: a funnel, three bones on a lever, and two organs in a maze.
 *
 * Laid out along one line, because that is what an ear is — sound goes in at
 * one end and comes out as nerve traffic at the other, and every structure on
 * the way is doing one job in that chain. The scene is built so a reader can
 * walk it: outer, then middle, then inner.
 *
 * The ossicles and the labyrinth are **small**, and this file does not make
 * them bigger to be clickable. They are reached by framing — a viewpoint that
 * comes close — and by putting the outer ear away by tag. Moving a stapes out
 * of an oval window to make it easier to hit would be a different organ.
 *
 * ## A right ear, from in front and a little lateral
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right ear **medial** — into the head, where the cochlea is — is +x, and
 * the auricle is at −x.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle or
 * turn-count here is a measurement**, and nothing moves: nothing vibrates,
 * nothing conducts, and there is no fluid.
 */

/** Which way medial is, in a right ear seen from in front. */
export const MEDIAL = 1;

/**
 * How much bigger than life the middle and inner ear are drawn.
 *
 * **A display value.** An ossicle is a few millimetres against an auricle of
 * sixty, and at one scale the whole middle ear is a speck three structures
 * deep. The chain and the labyrinth are drawn large enough that each part can
 * be seen and clicked; **no size relation between the outer ear and anything
 * medial to the drum may be read off this model**.
 */
export const DEEP_EAR_VISUAL_SCALE = 3.2;

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The opening of the canal, at the bottom of the concha. */
  meatus: [-MEDIAL * 2.3, 0, 0.1],
  /** The umbo: the centre of the drum, pulled medially by the bone on it. */
  umbo: [MEDIAL * 0.12, -0.05, 0],
  /** The window the stapes sits in: the way into the inner ear. */
  ovalWindow: [MEDIAL * 0.78, 0.06, -0.12],
  /** The other window, below it, that lets the fluid move at all. */
  roundWindow: [MEDIAL * 0.8, -0.34, -0.06],
  /** Where the Eustachian tube leaves the cavity for the throat. */
  eustachianOrigin: [MEDIAL * 0.32, -0.42, 0.36],
  /** The centre of the cochlear spiral. */
  cochlea: [MEDIAL * 1.32, -0.18, -0.1],
  /** The chamber between cochlea and canals. */
  vestibule: [MEDIAL * 0.98, 0.14, -0.38],
});

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildEar({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'ear';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, position, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    const mesh = add(id, new THREE.Mesh(geometry, built));
    if (position) mesh.position.set(...position);
    return mesh;
  };

  const cord = (
    id,
    points,
    radius,
    color,
    { material = wallMaterial, flatten = 1, axis = 'x', radial = 14, steps = 40 } = {}
  ) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten !== 1) flattenTube(surface, axis, flatten);
    const built = material({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  // --- the outer ear --------------------------------------------------------
  //
  // The auricle: a dish standing off the side of the head, with a rim rolled
  // over at the top and back, and a hollow in the middle that the canal opens
  // out of. Drawn flat in x, because that is what it is.
  solid(
    'auricle',
    shapedSphere({
      detail: 6,
      scale: [0.22, 1.3, 0.9],
      warp: (v) => {
        // Narrowed below into the lobe, and fuller above: an ear is not an oval.
        v.z *= 1 - 0.5 * smoothstep(-0.15, -1, v.y);
        v.z *= 1 + 0.16 * smoothstep(0.1, 1, v.y);
        // The concha: a hollow scooped deep into the lateral face, in front of
        // and below the middle, where the canal begins. Without this an auricle
        // is a plate, and a plate is not what anybody means by an ear.
        const hollow = Math.exp(-Math.pow((v.y + 0.08) / 0.42, 2) - Math.pow((v.z - 0.2) / 0.42, 2));
        v.x += MEDIAL * 2.6 * hollow * smoothstep(0, -1, v.x * MEDIAL);
        // The helix: the rim rolled over, thick at the top and the back and
        // fading out towards the lobe.
        const rim = Math.hypot(v.y, v.z);
        if (rim > 0.74) v.x *= 1 + 3.4 * (rim - 0.74) * smoothstep(-0.75, -0.1, v.y);
      },
    }),
    [-MEDIAL * 2.45, 0.1, -0.15],
    '#e8b49a'
  );

  // The canal: drawn as the passage it is, which is the only way to point at
  // one. It is not straight — it turns on its way in, which is why a doctor
  // pulls an ear to look down it.
  cord(
    'external-auditory-canal',
    [
      [...SITES.meatus],
      [-MEDIAL * 1.7, 0.08, 0.16],
      [-MEDIAL * 1.0, 0.12, 0.04],
      [-MEDIAL * 0.4, 0.02, -0.04],
      [-MEDIAL * 0.06, -0.04, -0.02],
    ],
    (u) => 0.21 - 0.05 * smoothstep(0.5, 1, u),
    '#d9a98f',
    { material: mucosaMaterial, radial: 18, steps: 44 }
  );

  // --- the drum -------------------------------------------------------------
  //
  // A shallow cone pulled inwards at its centre by the bone attached to it.
  // Transparent, because everything the scene is about is behind it.
  const drum = shellOfRevolution({ outer: 0.42, inner: 0.4, sweep: (52 * Math.PI) / 180 });
  // Apex medial, rim lateral: the drum is pulled *inwards* at its centre by the
  // bone attached to it, which is what makes the umbo a landmark at all.
  drum.rotateZ((MEDIAL * Math.PI) / 2);
  solid('tympanic-membrane', drum, [-MEDIAL * 0.28, -0.05, 0], '#e2d6c0', tissueMaterial, { roughness: 0.35 });

  // --- the middle ear -------------------------------------------------------
  //
  // The cavity: an air space in bone, drawn as a body because a space cannot
  // otherwise be pointed at. Everything in this paragraph sits inside it.
  solid(
    'middle-ear-cavity',
    shapedSphere({
      detail: 5,
      scale: [0.46, 0.62, 0.5],
      warp: (v) => {
        // Taller above than below: the attic, where the head of the malleus and
        // the body of the incus sit.
        v.y *= 1 + 0.35 * smoothstep(0.2, 1, v.y);
      },
    }),
    [MEDIAL * 0.38, 0.04, -0.02],
    '#bcd8e0',
    tissueMaterial,
    { roughness: 0.15 }
  );

  /** One ossicle: a small bone with a body and a process. */
  const ossicle = (id, points, radius, color) =>
    cord(id, points, radius, color, { material: mineralMaterial, radial: 12, steps: 26 });

  // Malleus: handle on the drum, head up in the attic. It is the one bone of
  // the three that a reader can see the position of from outside.
  ossicle(
    'malleus',
    [
      [...SITES.umbo],
      [MEDIAL * 0.14, 0.18, 0.02],
      [MEDIAL * 0.18, 0.46, 0.02],
      [MEDIAL * 0.3, 0.56, 0.0],
    ],
    (u) => 0.07 + 0.07 * smoothstep(0.7, 1, u),
    '#efe6cd'
  );
  // Incus: from the malleus head back and down, with a long process reaching
  // the stapes. The middle link, and the one that takes the strain.
  ossicle(
    'incus',
    [
      [MEDIAL * 0.34, 0.56, -0.02],
      [MEDIAL * 0.48, 0.46, -0.14],
      [MEDIAL * 0.5, 0.24, -0.14],
      [MEDIAL * 0.52, 0.12, -0.13],
    ],
    (u) => 0.09 - 0.035 * smoothstep(0.2, 1, u),
    '#e8dcc0'
  );
  // Stapes: two arches and a footplate, and the footplate is in the window.
  // The smallest bone there is, and the last link before fluid.
  ossicle(
    'stapes',
    [
      [MEDIAL * 0.54, 0.12, -0.13],
      [MEDIAL * 0.66, 0.1, -0.13],
      [...SITES.ovalWindow],
    ],
    (u) => 0.05 + 0.05 * smoothstep(0.6, 1, u),
    '#f2ead6'
  );

  // The Eustachian tube: the middle ear's only way to the outside air, and it
  // goes forward, down and towards the midline — to the back of the nose.
  cord(
    'eustachian-tube',
    [
      [...SITES.eustachianOrigin],
      [MEDIAL * 0.72, -0.72, 0.62],
      [MEDIAL * 1.3, -1.1, 0.95],
      [MEDIAL * 1.85, -1.38, 1.2],
    ],
    (u) => 0.1 + 0.05 * smoothstep(0.6, 1, u),
    '#c98f72',
    { material: mucosaMaterial, radial: 14, steps: 36 }
  );

  // --- the inner ear --------------------------------------------------------
  //
  // The cochlea: a tube wound about an axis, tapering as it goes. Two and a
  // half turns, which is a fact about cochleas and not a drawing choice —
  // though how big it is drawn certainly is.
  const TURNS = 2.5;
  /** How thick the spiral canal is drawn, base to apex. */
  const canalRadius = (u) => 0.095 - 0.035 * u;
  /**
   * How far the spiral climbs in total.
   *
   * **The turns of a cochlea touch.** They are one canal wound about the
   * modiolus with nothing between them, which is why the thing looks like a
   * snail shell rather than like a spring. This climbed 0.62 over two and a
   * half turns — a quarter of a unit per turn against a canal about 0.15
   * across — so there was daylight between every whorl and the render was a
   * coil spring with a rod through it (F-132).
   *
   * So the climb is the canal's own average thickness, two and a half times
   * over: each turn lands on top of the one below it. It is a consequence of
   * the calibre, not a number chosen to look right, which is why it is written
   * as one.
   */
  const CLIMB = TURNS * (canalRadius(0) + canalRadius(1));
  const spiral = [];
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const angle = t * TURNS * Math.PI * 2;
    const radius = 0.5 * (1 - 0.55 * t);
    spiral.push([
      SITES.cochlea[0] + MEDIAL * (CLIMB * t),
      SITES.cochlea[1] + Math.sin(angle) * radius,
      SITES.cochlea[2] + Math.cos(angle) * radius,
    ]);
  }
  cord('cochlea', spiral, canalRadius, '#e0c07a', {
    material: mucosaMaterial,
    radial: 12,
    steps: 130,
  });

  // The vestibule: the chamber the windows open into and the canals come off.
  solid(
    'vestibule',
    shapedSphere({ detail: 5, scale: [0.26, 0.26, 0.24] }),
    SITES.vestibule,
    '#cfa8d8',
    mucosaMaterial
  );

  // Three canals, one structure: they are one organ doing one job, and which of
  // the three is which is a question about plane, not about identity.
  const canalMeshes = [];
  //
  // **These are circles about the vestibule, and they have to stay that way.**
  // Drawn, the three of them read as a cage with the chamber suspended inside
  // it, and a canal in life leaves the vestibule and returns to it — so the
  // obvious fix is to swing each loop out and draw an arc. It was tried, and
  // `tests/calibration.test.js` caught it: **this loop is shared with the BPPV
  // model**, which treats a canal as a circle about the vestibule of a stated
  // radius and puts a particle at an angle on it. The atlas draws the model's
  // canal, not a picture of one.
  //
  // So the cage stays until the model and the atlas move together, which is a
  // change to a medical model and not to a drawing (F-132).
  const canal = (name, normal) => {
    const centre = new THREE.Vector3(...SITES.vestibule).addScaledVector(new THREE.Vector3(...normal), 0);
    const axis = new THREE.Vector3(...normal).normalize();
    const first = new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(axis, Math.abs(axis.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : first).normalize();
    const w = new THREE.Vector3().crossVectors(axis, u).normalize();
    const points = [];
    for (let i = 0; i <= 44; i += 1) {
      const t = (i / 44) * Math.PI * 2;
      points.push(
        centre
          .clone()
          .addScaledVector(u, Math.cos(t) * 0.32)
          .addScaledVector(w, Math.sin(t) * 0.32)
          .addScaledVector(axis, 0.12)
          .toArray()
      );
    }
    const surface = new TubeSurface(smoothCurve(points), { radius: () => 0.055, steps: 60, radial: 10 });
    disposables.push(surface);
    const mesh = new THREE.Mesh(surface.geometry, canalMaterial);
    mesh.name = `${name}-semicircular-canal`;
    object.add(mesh);
    canalMeshes.push(mesh);
  };
  const canalMaterial = mucosaMaterial({ color: colors['semicircular-canals'] ?? '#b07ec4' });
  disposables.push(canalMaterial);
  canal('lateral', [0, 1, 0]);
  canal('superior', [0, 0, 1]);
  canal('posterior', [1, 0, 0]);
  index.set('semicircular-canals', canalMeshes[0]);

  // The nerve: two bundles in one sheath, one from the cochlea and one from the
  // vestibule, going medially towards the brainstem.
  cord(
    'vestibulocochlear-nerve',
    [
      [MEDIAL * 1.2, -0.05, -0.2],
      [MEDIAL * 1.85, 0.0, -0.32],
      [MEDIAL * 2.5, 0.06, -0.46],
    ],
    // Thinner than it was. At 0.16 it was as thick as the cochlea it runs in
    // the middle of and it carried the picture: a rod with a spring on it.
    (u) => 0.095 + 0.03 * u,
    '#e8e0c8',
    { material: tissueMaterial, radial: 14, steps: 26 }
  );

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    /** One structure, three meshes: the canals are one organ in three planes. */
    canalMeshes,
    anchorPoints: Object.fromEntries(Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
