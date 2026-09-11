import * as THREE from 'three';
import { clamp, latheFromProfile, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The elbow: one hinge and one pivot, sharing a capsule.
 *
 * The fourth joint here, and the one that is two joints in the same room. The
 * ulna hinges on a spool and can do nothing else; the radius spins on a ball
 * and rolls round the ulna at the same time, which is how a hand turns over.
 * **Both of those happen inside one capsule**, which is why a swelling, a
 * bleed or an infection in an elbow stiffens flexion and rotation together.
 *
 * ## One axis, and everything hung off it
 *
 * The hinge axis runs across the joint through the middle of the trochlea and
 * the middle of the capitellum. Almost every claim this scene makes is a claim
 * about that line: the trochlea and the capitellum are turned about it, the
 * ulna's notch wraps the spool it makes, the radial head sits under its lateral
 * end — and **both collateral ligaments start on it**, at the epicondyles,
 * which is why they stay tight through the whole range rather than slackening
 * halfway. Written as separate coordinates those facts would be coincidences.
 *
 * ## A right elbow, from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right elbow **medial** — the little-finger side, where the trochlea, the
 * ulna, the ulnar collateral ligament and the ulnar nerve are — is `+x`, as it
 * is in `organs/shoulderJoint.js` and `organs/hand.js`. `+y` is proximal and
 * `+z` anterior. Every side here comes from `MEDIAL`.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, angle, thickness or
 * attachment footprint is a measurement**, and nothing here moves: the joint is
 * drawn extended, in one position, and neither flexion nor rotation happens.
 */

/** Which way medial is, in a right elbow seen from in front. */
export const MEDIAL = 1;

/**
 * The flexion axis, and the two surfaces turned about it.
 *
 * `y` and `z` are the line's height and depth; everything articular in this
 * file is placed against them rather than against a number of its own.
 */
export const HINGE = Object.freeze({
  y: 0,
  z: 0,
  /** The spool the ulna runs on: two flanges with a groove between them. */
  trochlea: Object.freeze({
    medialX: MEDIAL * 0.94,
    lateralX: MEDIAL * 0.08,
    flangeRadius: 0.47,
    grooveRadius: 0.27,
  }),
  /** The ball the radius turns on, at the lateral end of the same line. */
  capitellum: Object.freeze({ x: -MEDIAL * 0.46, radius: 0.34 }),
});

/**
 * How far the distal humerus' articular surface is from the hinge axis, at a
 * point along it.
 *
 * **One function, four uses** — the trochlea is lathed about it, the cartilage
 * on it is lathed about it, **the ulna's trochlear notch is pressed against
 * it**, and the capsule is sized from it. Written four times these would agree
 * until the first time the spool changed shape
 * (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} x along the axis, in world units
 */
export function trochleaRadiusAt(x) {
  const { medialX, lateralX, flangeRadius, grooveRadius } = HINGE.trochlea;
  const t = clamp((x - lateralX) / (medialX - lateralX), 0, 1);
  // A spool: a flange at each end and a waist between them, where the notch
  // rides. The medial flange is the deeper of the two, which is what stops an
  // ulna sliding off the inside of the joint.
  const waist = Math.exp(-Math.pow((t - 0.46) / 0.3, 2));
  const outer = flangeRadius * (0.94 + 0.06 * t);
  return outer - (outer - grooveRadius) * waist;
}

/**
 * Where a collateral ligament starts, on the axis itself.
 *
 * **This is the scene's second claim**: both ligaments come off the epicondyles,
 * which sit on the line the joint turns about, so neither of them lengthens or
 * shortens as the elbow bends. Derived from `HINGE` rather than written twice.
 *
 * @param {number} side `MEDIAL` or `-MEDIAL`
 * @returns {[number, number, number]}
 */
export function collateralOrigin(side) {
  const x =
    side === MEDIAL
      ? HINGE.trochlea.medialX + 0.22
      : HINGE.capitellum.x - HINGE.capitellum.radius * 0.62;
  return [x, HINGE.y + 0.16, HINGE.z - 0.08];
}

/** The outline of the humerus at a height: a round shaft that flares into a
 *  triangle just above the joint, which is what the epicondyles sit on. */
export function humerusSection(y) {
  const down = clamp((HUMERUS.top - y) / (HUMERUS.top - HUMERUS.bottom), 0, 1);
  const flare = smoothstep(0.5, 1.02, down) ** 1.3;
  return {
    halfWidth: 0.29 + 0.66 * flare,
    halfDepth: 0.29 - 0.11 * flare,
    centreZ: -0.02 - 0.06 * flare,
    centreX: MEDIAL * (0.03 + 0.09 * flare),
  };
}

export const HUMERUS = Object.freeze({ top: 3.1, bottom: 0.46 });

/** The two forearm bones, as the lines their shafts follow. */
export const FOREARM = Object.freeze({
  bottom: -2.5,
  /** The ulna hangs straight off the hinge; the radius bows away from it, which
   *  is the space the two of them cross in when a hand turns over. */
  ulna: Object.freeze({ x: MEDIAL * 0.5, z: 0.06 }),
  radius: Object.freeze({ x: -MEDIAL * 0.52, z: 0.08, bow: 0.2 }),
  /** The disc that spins under the capitellum. */
  radialHead: Object.freeze({ y: -0.46, radius: 0.31, height: 0.26 }),
  /** Where the biceps ends, on the far side of the radius from the thumb. */
  tuberosityY: -1.02,
});

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The middle of the trochlear groove: the hinge itself. */
  hinge: [MEDIAL * 0.5, HINGE.y, HINGE.z],
  /** The middle of the capitellum: the pivot. */
  capitellum: [HINGE.capitellum.x, HINGE.y, HINGE.z],
  /** The bump you knock, with the nerve behind it. */
  medialEpicondyle: [MEDIAL * 1.09, 0.2, -0.1],
  /** The bump a tennis elbow hurts over. */
  lateralEpicondyle: [-MEDIAL * 0.86, 0.24, -0.08],
  /** The point of the elbow. */
  olecranonTip: [MEDIAL * 0.46, 0.72, -0.52],
  /** The groove behind the medial epicondyle the ulnar nerve runs in. */
  cubitalTunnel: [MEDIAL * 1.26, 0.04, -0.46],
  /** The middle of the cubital fossa, in front of the joint. */
  cubitalFossa: [MEDIAL * 0.04, 0.5, 0.72],
  /** Where the biceps ends. */
  radialTuberosity: [-MEDIAL * 0.28, FOREARM.tuberosityY, 0.2],
});

/** Move every vertex of a finished geometry, then fix the normals. */
function warpGeometry(geometry, fn) {
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    fn(v);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A surface of revolution about the **hinge axis**, which runs along `x`.
 *
 * `latheFromProfile` turns about `+y`, so the profile is written along the axis
 * and the finished geometry is rotated a quarter turn. Doing it this way rather
 * than warping a sphere keeps the spool's silhouette exact, which matters here:
 * the notch that wraps it is measured from the same radius.
 */
function aboutHinge({ from, to, radius, steps = 30, radial = 40, inflate = 0 }) {
  const profile = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = lerp(from, to, i / steps);
    profile.push([Math.max(0.01, radius(x) + inflate), x]);
  }
  const geometry = latheFromProfile(profile, { segments: steps, radial });
  // `+y` becomes `+x`, so the profile's own coordinate is now along the axis.
  geometry.rotateZ(-Math.PI / 2);
  geometry.translate(0, HINGE.y, HINGE.z);
  return geometry;
}

/**
 * Push a vertex out of the trochlea, if it is inside it.
 *
 * This is what makes the ulna's trochlear notch: the proximal ulna is built as
 * a simple hook and then pressed onto the spool, so the concavity it grips with
 * **is** the trochlea's surface and cannot drift from it.
 */
function clearTrochlea(v, clearance = 0.04) {
  const { medialX, lateralX } = HINGE.trochlea;
  if (v.x < Math.min(lateralX, medialX) - 0.1 || v.x > Math.max(lateralX, medialX) + 0.1) return;
  const dy = v.y - HINGE.y;
  const dz = v.z - HINGE.z;
  const r = Math.hypot(dy, dz);
  const want = trochleaRadiusAt(v.x) + clearance;
  if (r < want && r > 1e-5) {
    v.y = HINGE.y + (dy / r) * want;
    v.z = HINGE.z + (dz / r) * want;
  }
}

/** A closed shell whose cross-section at every height is given by `section`. */
function shellGeometry({ y0, y1, section, detail = 5 }) {
  return shapedSphere({
    detail,
    warp: (v) => {
      const down = (1 - v.y) / 2;
      const y = lerp(y0, y1, down);
      const at = section(y);
      const ring = Math.hypot(v.x, v.z);
      const girth = Math.min(1, ring * 2.6);
      const unitX = ring > 1e-5 ? v.x / ring : 0;
      const unitZ = ring > 1e-5 ? v.z / ring : 1;
      v.x = (at.centreX ?? 0) + unitX * girth * at.halfWidth;
      v.y = y;
      v.z = at.centreZ + unitZ * girth * at.halfDepth;
    },
  });
}

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildElbowJoint({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'elbow-joint';
  const disposables = [];
  const index = new Map();
  const groups = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, color, material = mineralMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    return add(id, new THREE.Mesh(geometry, built));
  };

  /** One structure drawn as several meshes — cartilage, a two-band ligament. */
  const several = (id, geometries, color, material = mineralMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(built);
    const meshes = geometries.map((geometry, i) => {
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, built);
      mesh.name = `${id}-${i + 1}`;
      object.add(mesh);
      return mesh;
    });
    groups.set(id, meshes);
    index.set(id, meshes[0]);
    return meshes;
  };

  const cord = (points, radius, { steps = 44, radial = 14, flatten = null } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten) flattenTube(surface, flatten[0], flatten[1]);
    disposables.push(surface);
    return surface.geometry;
  };

  // --- the humerus ----------------------------------------------------------
  //
  // A round shaft that flares into a triangle just above the joint. The flare
  // is what carries the two epicondyles, and the two epicondyles are what the
  // forearm muscles and both collateral ligaments hang off.
  solid(
    'humerus-shaft',
    warpGeometry(
      shellGeometry({ y0: HUMERUS.top, y1: HUMERUS.bottom, section: humerusSection, detail: 5 }),
      (v) => {
        // The olecranon fossa: a real hollow in the back of the flare, deep
        // enough that the bone there is almost translucent in life. It is why
        // an elbow straightens fully and why a fracture through it is common.
        const low = smoothstep(1.2, 0.5, v.y);
        const mid = Math.exp(-Math.pow((v.x - MEDIAL * 0.34) / 0.42, 2));
        if (v.z < -0.06) v.z += 0.26 * low * mid;
      }
    ),
    '#e7e0cd'
  );

  solid(
    'trochlea',
    aboutHinge({
      from: HINGE.trochlea.lateralX,
      to: HINGE.trochlea.medialX,
      radius: trochleaRadiusAt,
    }),
    '#e0c48a'
  );

  solid(
    'capitellum',
    (() => {
      const geometry = shapedSphere({
        detail: 5,
        scale: [HINGE.capitellum.radius * 0.92, HINGE.capitellum.radius, HINGE.capitellum.radius],
      });
      geometry.translate(HINGE.capitellum.x, HINGE.y, HINGE.z);
      return geometry;
    })(),
    '#dcbd84'
  );

  for (const [id, site, scale, color] of [
    ['medial-epicondyle', SITES.medialEpicondyle, [0.26, 0.31, 0.24], '#e2d9c0'],
    ['lateral-epicondyle', SITES.lateralEpicondyle, [0.21, 0.26, 0.2], '#e2d9c0'],
  ]) {
    const geometry = shapedSphere({ detail: 4, scale });
    geometry.translate(...site);
    solid(id, geometry, color);
  }

  // --- the forearm ----------------------------------------------------------
  //
  // The proximal ulna is built as a hook and then **pressed onto the spool**,
  // so the notch it grips with is the trochlea's own surface.
  solid(
    'olecranon',
    warpGeometry(
      shapedSphere({
        detail: 6,
        warp: (v) => {
          // A C **opening forwards and upwards**: from the tip of the
          // olecranon, which is behind and above, round the back of the spool,
          // under it, and up in front to the coronoid. Angles are measured from
          // the axis: 0 is behind the spool, +π/2 above it, π in front of it.
          // Swept the other way — over the top — the ulna becomes a cap sitting
          // on the trochlea rather than a hook holding it.
          const along = (v.y + 1) / 2;
          const angle = lerp(0.9, -2.45, along);
          const thick = 0.3 + 0.22 * Math.sin(Math.PI * along) - 0.1 * smoothstep(0.8, 1, along);
          const ring = Math.hypot(v.x, v.z);
          const girth = Math.min(1, ring * 2.4);
          const unitX = ring > 1e-5 ? v.x / ring : 0;
          const unitZ = ring > 1e-5 ? v.z / ring : 1;
          const reach = trochleaRadiusAt(MEDIAL * 0.5) + 0.26;
          v.x = MEDIAL * 0.5 + unitX * girth * 0.58;
          v.y = HINGE.y + Math.sin(angle) * reach + unitZ * girth * thick * Math.sin(angle);
          v.z = HINGE.z - Math.cos(angle) * reach - unitZ * girth * thick * Math.cos(angle);
        },
      }),
      (v) => clearTrochlea(v, 0.05)
    ),
    '#e7e0cd'
  );

  solid(
    'ulna-shaft',
    cord(
      [
        [FOREARM.ulna.x, -0.34, FOREARM.ulna.z + 0.2],
        [FOREARM.ulna.x - MEDIAL * 0.02, -1.1, FOREARM.ulna.z],
        [FOREARM.ulna.x - MEDIAL * 0.08, FOREARM.bottom, FOREARM.ulna.z - 0.04],
      ],
      (u) => 0.28 - 0.09 * smoothstep(0, 0.7, u),
      { radial: 16 }
    ),
    '#e7e0cd'
  );

  // The radial head: a disc, dished on top, that spins under the capitellum.
  // **It is not attached to the ulna** — it is held against it by a ring.
  solid(
    'radial-head',
    (() => {
      const r = FOREARM.radialHead.radius;
      const h = FOREARM.radialHead.height;
      const profile = [
        [0, -h * 0.5],
        [r * 0.94, -h * 0.5],
        [r, h * 0.2],
        [r * 0.9, h * 0.5],
        [r * 0.5, h * 0.24],
        [0, h * 0.16],
      ];
      const geometry = latheFromProfile(profile, { segments: 26, radial: 34 });
      geometry.translate(FOREARM.radius.x + MEDIAL * 0.04, FOREARM.radialHead.y, FOREARM.radius.z);
      return geometry;
    })(),
    '#e0c48a'
  );

  solid(
    'radius-shaft',
    warpGeometry(
      cord(
        [
          [FOREARM.radius.x + MEDIAL * 0.04, FOREARM.radialHead.y - 0.14, FOREARM.radius.z],
          [FOREARM.radius.x, FOREARM.tuberosityY, FOREARM.radius.z + 0.04],
          [FOREARM.radius.x - MEDIAL * FOREARM.radius.bow, -2.0, FOREARM.radius.z],
          [FOREARM.radius.x - MEDIAL * FOREARM.radius.bow * 0.8, FOREARM.bottom, FOREARM.radius.z - 0.04],
        ],
        (u) => 0.16 + 0.09 * smoothstep(0.4, 1, u),
        { radial: 16 }
      ),
      (v) => {
        // The tuberosity: a lump on the side of the radius **away from the
        // thumb**, which is the whole reason the biceps can turn a palm up.
        const at = Math.exp(-Math.pow((v.y - FOREARM.tuberosityY) / 0.22, 2));
        const facing = smoothstep(-0.2, 0.6, (v.x - FOREARM.radius.x) * MEDIAL + (v.z - FOREARM.radius.z));
        v.x += MEDIAL * 0.16 * at * facing;
        v.z += 0.12 * at * facing;
      }
    ),
    '#e7e0cd'
  );

  // --- what covers the bone -------------------------------------------------
  //
  // Cartilage, drawn as one structure over four surfaces: the spool, the ball,
  // the notch that grips the spool and the dish that sits on the ball.
  several(
    'articular-cartilage',
    [
      aboutHinge({
        from: HINGE.trochlea.lateralX,
        to: HINGE.trochlea.medialX,
        radius: trochleaRadiusAt,
        inflate: 0.045,
      }),
      (() => {
        const r = HINGE.capitellum.radius + 0.045;
        const geometry = shapedSphere({ detail: 5, scale: [r * 0.92, r, r] });
        geometry.translate(HINGE.capitellum.x, HINGE.y, HINGE.z);
        return geometry;
      })(),
      (() => {
        const r = FOREARM.radialHead.radius + 0.04;
        const h = FOREARM.radialHead.height;
        const geometry = latheFromProfile(
          [
            [0, h * 0.2],
            [r * 0.92, h * 0.26],
            [r, h * 0.54],
            [r * 0.5, h * 0.28],
            [0, h * 0.2],
          ],
          { segments: 18, radial: 30 }
        );
        geometry.translate(FOREARM.radius.x + MEDIAL * 0.04, FOREARM.radialHead.y, FOREARM.radius.z);
        return geometry;
      })(),
    ],
    '#dff0f2',
    tissueMaterial,
    { roughness: 0.22 }
  );

  // The capsule: **one bag over both joints**, which is why a swollen elbow
  // loses bending and turning together.
  solid(
    'joint-capsule',
    shellGeometry({
      y0: 0.92,
      y1: -0.96,
      section: (y) => ({
        halfWidth: 1.12 - 0.14 * Math.abs(y),
        halfDepth: 0.62 - 0.1 * Math.abs(y),
        centreZ: 0.02,
        centreX: MEDIAL * 0.1,
      }),
      detail: 5,
    }),
    '#cfd6d2',
    wallMaterial,
    { opacity: 0.26 }
  );

  // --- the ligaments --------------------------------------------------------
  //
  // Both collaterals come off the axis (`collateralOrigin`), which is why
  // neither of them changes length as the elbow bends.
  const medialOrigin = collateralOrigin(MEDIAL);
  several(
    'ulnar-collateral-ligament',
    [
      // The anterior band, to the coronoid: the one that is torn by throwing
      // and the one that is reconstructed.
      cord([medialOrigin, [MEDIAL * 0.98, -0.3, 0.06], [MEDIAL * 0.7, -0.5, 0.26]], 0.1, {
        radial: 12,
        flatten: ['x', 0.55],
      }),
      // The posterior band, to the olecranon.
      cord([medialOrigin, [MEDIAL * 1.02, 0.16, -0.42], [MEDIAL * 0.66, 0.34, -0.62]], 0.09, {
        radial: 12,
        flatten: ['x', 0.5],
      }),
    ],
    '#d9cba8',
    wallMaterial
  );

  const lateralOrigin = collateralOrigin(-MEDIAL);
  solid(
    'radial-collateral-ligament',
    cord(
      [lateralOrigin, [-MEDIAL * 0.92, -0.22, -0.06], [-MEDIAL * 0.82, -0.44, 0.14]],
      0.1,
      { radial: 12, flatten: ['x', 0.55] }
    ),
    '#d9cba8',
    wallMaterial
  );

  // The ring the radial head spins inside. It is attached to the **ulna** at
  // both ends and to the radius at neither.
  solid(
    'annular-ligament',
    (() => {
      const centre = [FOREARM.radius.x + MEDIAL * 0.04, FOREARM.radialHead.y - 0.02, FOREARM.radius.z];
      const ring = FOREARM.radialHead.radius + 0.09;
      const points = [];
      for (let i = 0; i <= 20; i += 1) {
        // **Not a closed circle.** It runs from the front of the ulna, round
        // the outside of the radial head, and back to the ulna behind — which
        // is why it holds the head against the ulna rather than gripping it.
        const a = lerp(-0.62, Math.PI * 2 - 0.9, i / 20);
        const toUlna = smoothstep(0.5, 0, Math.abs(Math.sin(a)));
        points.push([
          centre[0] + Math.cos(a) * ring * (1 + 1.8 * toUlna * Math.max(0, Math.cos(a))),
          centre[1],
          centre[2] + Math.sin(a) * ring,
        ]);
      }
      return cord(points, 0.075, { radial: 10, steps: 60, flatten: ['y', 0.7] });
    })(),
    '#cfbe98',
    wallMaterial
  );

  // --- the tendons ----------------------------------------------------------
  solid(
    'biceps-tendon',
    cord(
      [
        [-MEDIAL * 0.08, 2.5, 0.7],
        [-MEDIAL * 0.08, 1.3, 0.78],
        [-MEDIAL * 0.12, 0.3, 0.66],
        [-MEDIAL * 0.24, -0.62, 0.42],
        [...SITES.radialTuberosity],
      ],
      (u) => 0.19 - 0.07 * smoothstep(0.3, 1, u),
      { radial: 14, flatten: ['x', 0.8] }
    ),
    '#e4dcc6',
    tissueMaterial
  );

  solid(
    'triceps-tendon',
    cord(
      [
        [MEDIAL * 0.2, 2.5, -0.66],
        [MEDIAL * 0.3, 1.5, -0.74],
        [MEDIAL * 0.4, 0.95, -0.68],
        [...SITES.olecranonTip],
      ],
      (u) => 0.3 - 0.09 * smoothstep(0.3, 1, u),
      { radial: 14, flatten: ['z', 0.55] }
    ),
    '#e4dcc6',
    tissueMaterial
  );

  // The two common origins: every forearm flexor from one bump, every extensor
  // from the other. Two bumps, two names, two entirely separate complaints.
  solid(
    'common-flexor-origin',
    cord(
      [
        [...SITES.medialEpicondyle],
        [MEDIAL * 1.16, -0.4, 0.2],
        [MEDIAL * 0.98, -1.1, 0.28],
      ],
      (u) => 0.16 + 0.18 * u,
      { radial: 14 }
    ),
    '#b8565a',
    tissueMaterial
  );

  solid(
    'common-extensor-origin',
    cord(
      [
        [...SITES.lateralEpicondyle],
        [-MEDIAL * 1.0, -0.4, -0.02],
        [-MEDIAL * 1.04, -1.1, -0.1],
      ],
      (u) => 0.15 + 0.17 * u,
      { radial: 14 }
    ),
    '#b8565a',
    tissueMaterial
  );

  // --- the nerves and the artery -------------------------------------------
  //
  // The ulnar nerve goes **behind** the medial epicondyle, in a groove with
  // nothing over it but skin. That is the whole reason an elbow can be knocked
  // and a little finger can feel it.
  solid(
    'ulnar-nerve',
    cord(
      [
        [MEDIAL * 0.92, 2.3, -0.42],
        [MEDIAL * 1.16, 1.1, -0.5],
        [...SITES.cubitalTunnel],
        [MEDIAL * 1.02, -0.62, -0.3],
        [MEDIAL * 0.82, -1.7, -0.12],
      ],
      0.085,
      { radial: 10, steps: 60 }
    ),
    '#f0e08a',
    mucosaMaterial
  );

  // In front, in the hollow of the elbow: tendon, artery, nerve, in that order
  // from the thumb side inwards.
  solid(
    'brachial-artery',
    cord(
      [
        [MEDIAL * 0.16, 2.4, 0.66],
        [MEDIAL * 0.18, 1.2, 0.78],
        [MEDIAL * 0.2, 0.42, 0.78],
        [MEDIAL * 0.1, -0.2, 0.66],
        [-MEDIAL * 0.06, -0.8, 0.52],
      ],
      0.12,
      { radial: 12 }
    ),
    '#c0403e',
    tissueMaterial
  );

  solid(
    'median-nerve',
    cord(
      [
        [MEDIAL * 0.44, 2.4, 0.6],
        [MEDIAL * 0.46, 1.2, 0.72],
        [MEDIAL * 0.44, 0.42, 0.72],
        [MEDIAL * 0.38, -0.4, 0.56],
        [MEDIAL * 0.3, -1.4, 0.4],
      ],
      0.1,
      { radial: 10 }
    ),
    '#f0e08a',
    mucosaMaterial
  );

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => groups.get(id) ?? (index.has(id) ? [index.get(id)] : []),
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [key, new THREE.Vector3(...point)])
    ),
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
