import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The neck: a short tube with everything in it, and nothing to spare.
 *
 * This is a **regional** model, not an organ one. Its subject is not any one
 * structure but **what lies next to what** — the airway and the gullet stacked
 * in the middle, the thyroid wrapped round the airway, a great artery, a great
 * vein and a nerve bundled together on each side, a nerve running back up the
 * groove behind the thyroid to reach the larynx, and four muscle groups laid
 * over all of it. Every clinical question about the neck is a question about
 * that arrangement.
 *
 * ## The one thing this scene is really for
 *
 * **The two recurrent laryngeal nerves do not take the same road.** Both end in
 * the same place — the larynx, reached from below, up the groove between the
 * trachea and the oesophagus — but the right turns round the subclavian artery
 * at the root of the neck and the left carries on into the chest and turns
 * round the aortic arch. That is why they are drawn differently here, why the
 * top of the thorax is drawn at all, and why the larynx scene, which stops at
 * the neck, says its own pair are drawn alike.
 *
 * ## The frame
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior. Every
 * paired structure is built from the single `LEFT` constant below.
 *
 * **One world unit is one centimetre**, with `y = 0` at the cricoid cartilage
 * — the level a neck is measured from in life, and the level at which both the
 * airway and the gullet change their name.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle or
 * distance here is a measurement**, and nothing moves: nothing is swallowed,
 * the larynx does not rise, no vessel pulses and no muscle contracts.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * Centimetres to world units.
 *
 * Everything below is written in centimetres, because a neck is a region whose
 * whole subject is distances between things and those distances are worth
 * being able to read off the code. The finished group is then scaled, because
 * the shared viewer's orbit controls clamp the camera to 55 units and a subject
 * this tall cannot be framed at 1 cm to the unit on a phone, where the framing
 * asks for more than twice the distance a desktop does (`docs/follow-ups.md`
 * F-90). **This is a viewer constraint, not an anatomical one**, and it is
 * applied in one place: the group, and the anchor points taken from it.
 */
export const WORLD_SCALE = 0.62;

/**
 * The heights everything in the neck is placed against.
 *
 * Ordered down the neck. Nothing else in this file may place itself at a number
 * that duplicates one of these: a structure that belongs at the cricoid is
 * written at `LEVELS.cricoid`, so that moving the cricoid moves it too.
 */
export const LEVELS = Object.freeze({
  /** The angle of the jaw: the top of what this scene draws. */
  mandible: 6.4,
  /** The hyoid bone, slung in muscle above the larynx. */
  hyoid: 3.7,
  /** Where the common carotid divides. Upper border of the thyroid cartilage. */
  carotidBifurcation: 2.6,
  /** The notch you can feel at the top of the thyroid cartilage. */
  thyroidNotch: 2.2,
  /** The bottom of the thyroid cartilage, where the gland's poles reach up. */
  thyroidCartilageBase: 0.8,
  /** The cricoid ring, at C6. Larynx becomes trachea; pharynx becomes gullet. */
  cricoid: 0,
  /** The isthmus of the thyroid, lying across the top tracheal rings. */
  isthmus: -1.7,
  /** The lower poles of the gland. */
  thyroidLowerPole: -3.2,
  /** The jugular notch of the sternum: the bottom of the neck proper. */
  sternalNotch: -6.4,
  /** Where the right vagus crosses the subclavian artery and gives off its nerve. */
  subclavian: -7.8,
  /** Where the left vagus crosses the aortic arch and gives off its nerve. */
  aorticArch: -9.8,
  /** The bottom of what this scene draws. */
  floor: -11.0,
});

/**
 * **Display sizes, not measurements** (`CLAUDE.md` §12).
 *
 * Three structures here are too small to see or to click at the scale the rest
 * of the neck has to be drawn at. They are drawn larger, and the amount is
 * written here rather than buried in the geometry, so that nothing in this file
 * can be mistaken for a calibre. A parathyroid gland is about 6 × 4 × 2 mm and
 * a recurrent laryngeal nerve is about 2 mm across; **no size below may be read
 * as either.**
 */
export const DISPLAY = Object.freeze({
  /** A parathyroid, drawn as a bead big enough to find and to click. */
  parathyroidRadius: 0.33,
  /** The vagus, thickened so it can be followed the length of the neck. */
  vagusRadius: 0.2,
  /** The recurrent laryngeal nerve, thickened for the same reason. */
  recurrentRadius: 0.17,
  /** A deep cervical node, drawn at one size for all of them. */
  nodeRadius: 0.38,
});

/**
 * The outside of the neck at a given height.
 *
 * **One function, two uses**: the skin envelope is built from it, and every
 * muscle group is held inside it, so no belly can push through the surface of
 * the neck it is supposed to be inside (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} y world height
 */
export function neckSection(y) {
  const down = clamp((LEVELS.mandible - y) / (LEVELS.mandible - LEVELS.sternalNotch), 0, 1);
  // A neck is narrowest in its middle: it flares upward into the jaw and
  // downward into the shoulders, and the flare at the bottom is the larger.
  // The lower flare is spread over most of the lower half rather than the last
  // tenth of it, because a step at the end reads as a brim rather than as a
  // shoulder — the model ends in a flat cut, and where that cut is made is a
  // presentation choice, not an anatomical boundary.
  const shoulders = smoothstep(0.46, 1.1, down) ** 1.6;
  const jaw = smoothstep(0.18, -0.06, down);
  return {
    halfWidth: 5.0 + 2.6 * shoulders + 0.45 * jaw,
    halfDepth: 4.7 + 1.1 * shoulders + 0.3 * jaw,
    centreZ: -0.55 - 0.45 * shoulders,
  };
}

/** How far forward the air column runs, at the cricoid. */
export const AIRWAY_Z = 2.2;

/**
 * The air column at a given height: where its centre is, and how wide it is.
 *
 * **One function, four uses** — the trachea is built round it, the laryngeal
 * cartilages are built round it, each thyroid lobe is hollowed against it, and
 * the groove the recurrent nerve climbs is measured from it. Written four
 * times these would agree until the first time the airway moved
 * (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} y world height
 */
export function airwayAt(y) {
  // The larynx is wider than the trachea and stands slightly further forward:
  // the prominence you can feel is the front of it.
  const larynx = smoothstep(LEVELS.cricoid, LEVELS.thyroidNotch, y);
  return {
    z: AIRWAY_Z + 0.42 * larynx,
    radius: 0.94 + 0.62 * larynx,
  };
}

/**
 * The gullet at a given height: directly behind the airway, and flattened.
 *
 * It leans to the patient's left as it descends, which is why a left-sided
 * approach reaches it and a right-sided one does not.
 *
 * @param {number} y world height
 */
export function oesophagusAt(y) {
  const down = clamp((LEVELS.cricoid - y) / (LEVELS.cricoid - LEVELS.floor), 0, 1);
  return {
    x: LEFT * 0.62 * smoothstep(0, 0.55, down),
    z: AIRWAY_Z - 1.5,
    halfWidth: 0.9,
    halfDepth: 0.44,
  };
}

/**
 * The groove between the trachea and the oesophagus, on one side.
 *
 * **This is where the recurrent laryngeal nerve is**, and it is the reason the
 * nerve is at risk in thyroid surgery: the gland's own blood supply enters a
 * centimetre away. Derived from the two structures that form the groove rather
 * than written as a coordinate, so the nerve cannot end up inside either of
 * them (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} y world height
 * @param {number} side `LEFT` or `-LEFT`
 * @returns {[number, number, number]}
 */
export function grooveAt(y, side) {
  const airway = airwayAt(y);
  const gullet = oesophagusAt(y);
  return [
    side * airway.radius * 0.76 + gullet.x * 0.45,
    y,
    (airway.z - airway.radius + gullet.z + gullet.halfDepth) / 2,
  ];
}

/**
 * The carotid sheath: one bundle on each side, and what is inside it.
 *
 * The offsets are written **medial-first** and multiplied by the side, so the
 * artery is medial on both sides rather than medial on one and lateral on the
 * other. The relationship this encodes is the one that matters at the bedside:
 * **artery medial, vein lateral, nerve behind and between them.**
 */
export const SHEATH = Object.freeze({
  /** How far from the midline the bundle runs, at the cricoid. */
  x: 3.05,
  /** How far forward, at the cricoid. */
  z: 0.85,
  /** The bundle's half-width; it is flattened front to back by `depthFactor`. */
  radius: 1.3,
  depthFactor: 0.78,
  contents: Object.freeze({
    /** Medial, and slightly forward. */
    artery: Object.freeze({ dx: -0.5, dz: 0.12, radius: 0.42 }),
    /** Lateral, forward, and much the largest of the three. */
    vein: Object.freeze({ dx: 0.58, dz: 0.18, radius: 0.6 }),
    /** Behind the other two, in the angle between them. */
    nerve: Object.freeze({ dx: 0.02, dz: -0.52, radius: DISPLAY.vagusRadius }),
  }),
});

/**
 * The centre of the carotid sheath at a height, on one side.
 *
 * @param {number} y world height
 * @param {number} side `LEFT` or `-LEFT`
 * @returns {[number, number, number]}
 */
export function sheathAt(y, side) {
  const up = clamp((y - LEVELS.sternalNotch) / (LEVELS.mandible - LEVELS.sternalNotch), 0, 1);
  // The bundle leans in and forward as it climbs towards the skull base.
  return [side * SHEATH.x * (1 - 0.1 * up), y, SHEATH.z + 0.65 * up];
}

/**
 * Where one of the three things inside the sheath runs, at a height.
 *
 * **One function, four uses**: the sheath and each of its three contents are
 * placed from it, so the vagus is behind the vessels because this says so once,
 * not because three separate curves happen to agree.
 *
 * @param {number} y world height
 * @param {number} side `LEFT` or `-LEFT`
 * @param {'artery' | 'vein' | 'nerve'} key
 * @returns {[number, number, number]}
 */
export function sheathContentAt(y, side, key) {
  const [x, , z] = sheathAt(y, side);
  const { dx, dz } = SHEATH.contents[key];
  return [x + side * dx, y, z + dz];
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The laryngeal prominence, in the front of the neck. */
  prominence: [0, LEVELS.thyroidNotch - 0.5, AIRWAY_Z + 1.9],
  /** The cricoid ring: the landmark everything in the neck is counted from. */
  cricoid: [0, LEVELS.cricoid, AIRWAY_Z + 1.2],
  /** The isthmus of the thyroid, over the trachea. */
  isthmus: [0, LEVELS.isthmus, AIRWAY_Z + 1.25],
  /** The middle of the patient's left thyroid lobe. */
  thyroidLobe: [LEFT * 2.05, LEVELS.cricoid - 1.0, AIRWAY_Z + 0.1],
  /** Where the left recurrent nerve reaches the larynx. */
  nerveEntry: grooveAt(LEVELS.cricoid + 0.3, LEFT),
  /** The carotid bifurcation on the patient's left. */
  bifurcation: sheathContentAt(LEVELS.carotidBifurcation, LEFT, 'artery'),
  /** Where the left recurrent nerve turns, under the aortic arch. */
  aorticTurn: [LEFT * 1.4, LEVELS.aorticArch - 0.5, -0.6],
  /** Where the right recurrent nerve turns, under the subclavian artery. */
  subclavianTurn: [-LEFT * 2.6, LEVELS.subclavian - 0.4, 0.2],
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
 * Push a vertex out of the air column, if it is inside it.
 *
 * This is what makes the thyroid lobes fit the trachea: they are built as
 * simple bodies and then pressed against the airway, so the hollow in their
 * medial face **is** the airway's surface and cannot drift from it.
 */
function clearAirway(v, clearance = 0.03) {
  const { z, radius } = airwayAt(v.y);
  const dx = v.x;
  const dz = v.z - z;
  const r = Math.hypot(dx, dz);
  const want = radius + clearance;
  if (r < want && r > 1e-5) {
    v.x = (dx / r) * want;
    v.z = z + (dz / r) * want;
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
      // Nearly flat ends, so a shell can be stacked on another without a gap.
      const girth = Math.min(1, ring * 2.6);
      const unitX = ring > 1e-5 ? v.x / ring : 0;
      const unitZ = ring > 1e-5 ? v.z / ring : 1;
      v.x = (at.centreX ?? 0) + unitX * girth * at.halfWidth;
      v.y = y;
      v.z = at.centreZ + unitZ * girth * at.halfDepth;
    },
  });
}

/** A tube along a written path, in world coordinates. */
function cordGeometry(points, radius, { steps = 60, radial = 14, flatten = null } = {}) {
  const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps, radial });
  if (flatten) flattenTube(surface, flatten[0], flatten[1]);
  return surface;
}

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildNeck({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'neck';
  const disposables = [];
  const index = new Map();
  const pairs = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    return add(id, new THREE.Mesh(geometry, built));
  };

  /** One structure on both sides. `build` is given the side, so a pair whose
   *  two halves differ — and in this scene three of them do — is written here
   *  and not as a mirror of one of them. */
  const paired = (id, build, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(built);
    const meshes = [];
    for (const side of [LEFT, -LEFT]) {
      const geometry = build(side);
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, built);
      mesh.name = `${id}-${side === LEFT ? 'left' : 'right'}`;
      object.add(mesh);
      meshes.push(mesh);
    }
    pairs.set(id, meshes);
    index.set(id, meshes[0]);
    return meshes;
  };

  const cord = (points, radius, options) => {
    const surface = cordGeometry(points, radius, options);
    disposables.push(surface);
    return surface.geometry;
  };

  // --- the outside of the neck --------------------------------------------
  //
  // Drawn so that everything else has somewhere to be. It is what the layer
  // slider takes away, because a neck is a thing you cannot see into.
  solid(
    'neck-surface',
    shellGeometry({ y0: LEVELS.mandible, y1: LEVELS.sternalNotch - 0.3, section: neckSection, detail: 5 }),
    '#e8c4ae',
    wallMaterial
  );

  // --- the muscles, as four groups ----------------------------------------
  //
  // Groups, not individual bellies: the point here is which layer a structure
  // is under, and that is a property of the group.
  paired(
    'sternocleidomastoid',
    (side) =>
      cord(
        [
          [side * 3.7, LEVELS.mandible - 0.1, -1.7],
          [side * 4.45, LEVELS.cricoid + 0.2, 1.9],
          [side * 1.25, LEVELS.sternalNotch - 0.1, 3.3],
        ],
        1.05,
        { flatten: ['z', 0.52] }
      ),
    '#a84f4c'
  );

  paired(
    'strap-muscles',
    (side) =>
      cord(
        [
          [side * 0.9, LEVELS.hyoid, AIRWAY_Z + 1.35],
          [side * 1.0, LEVELS.isthmus, AIRWAY_Z + 1.45],
          [side * 0.8, LEVELS.sternalNotch - 0.1, AIRWAY_Z + 0.85],
        ],
        0.58,
        { flatten: ['z', 0.5] }
      ),
    '#b35c56'
  );

  paired(
    'scalene-muscles',
    (side) =>
      cord(
        [
          [side * 2.5, LEVELS.hyoid - 0.5, -1.6],
          [side * 3.25, LEVELS.isthmus, -0.8],
          [side * 3.95, LEVELS.sternalNotch - 0.5, 0.1],
        ],
        0.74,
        { flatten: ['z', 0.8] }
      ),
    '#9f4a49'
  );

  paired(
    'posterior-neck-muscles',
    (side) =>
      cord(
        [
          [side * 1.7, LEVELS.mandible - 0.2, -4.1],
          [side * 2.45, LEVELS.cricoid, -4.7],
          [side * 2.9, LEVELS.sternalNotch + 0.1, -4.0],
        ],
        1.5,
        { flatten: ['z', 0.52] }
      ),
    '#8f4442'
  );

  // --- the column behind everything ---------------------------------------
  //
  // A landmark, at the depth a neck's contents are actually pressed against.
  // The column itself is `scenes/musculoskeletal/scenes/spineAnatomy`; here it
  // is drawn as a stack of blocks and named as one structure.
  {
    const parts = [];
    for (let i = 0; i < 9; i += 1) {
      const y = 5.9 - i * 1.65;
      const body = new THREE.BoxGeometry(2.7, 1.15, 2.1);
      body.translate(0, y, -2.35);
      parts.push(body);
      const spine = new THREE.BoxGeometry(0.62, 0.62, 1.7);
      spine.translate(0, y - 0.42, -4.0);
      parts.push(spine);
      for (const side of [LEFT, -LEFT]) {
        const transverse = new THREE.BoxGeometry(1.3, 0.55, 0.8);
        transverse.translate(side * 2.0, y, -2.7);
        parts.push(transverse);
      }
    }
    for (const part of parts) {
      part.deleteAttribute('uv');
      part.deleteAttribute('normal');
    }
    const merged = mergeGeometries(parts);
    merged.computeVertexNormals();
    for (const part of parts) part.dispose();
    solid('cervical-vertebrae', merged, '#d6cbb6', mineralMaterial);
  }

  // --- the two tubes in the middle ----------------------------------------
  solid(
    'laryngeal-cartilage',
    warpGeometry(
      shellGeometry({
        y0: LEVELS.thyroidNotch + 0.35,
        y1: LEVELS.cricoid - 0.7,
        section: (y) => {
          const airway = airwayAt(y);
          const t = clamp(
            (y - (LEVELS.cricoid - 0.7)) / (LEVELS.thyroidNotch + 0.35 - (LEVELS.cricoid - 0.7)),
            0,
            1
          );
          // A ring at the bottom, a shield above it, and an edge at the top:
          // without the last, the shell ends in a flat disc and the larynx
          // reads as a cup rather than as a shield seen from in front.
          const ring = 0.1 * Math.exp(-Math.pow((t - 0.16) / 0.12, 2));
          const close = 1 - 0.62 * smoothstep(0.84, 1, t);
          const half = (airway.radius + 0.24 + ring) * close;
          return { halfWidth: half, halfDepth: half, centreZ: airway.z };
        },
        detail: 5,
      }),
      (v) => {
        // The prominence: the front of the shield juts forward in the midline,
        // and it is the one part of the larynx anybody can find from outside.
        const near = Math.exp(-Math.pow(v.x / 0.75, 2));
        const high = smoothstep(LEVELS.cricoid, LEVELS.thyroidNotch, v.y);
        if (v.z > airwayAt(v.y).z) v.z += 0.55 * near * high;
      }
    ),
    '#e4dcc6',
    wallMaterial
  );

  solid(
    'trachea',
    warpGeometry(
      shellGeometry({
        y0: LEVELS.cricoid - 0.55,
        y1: LEVELS.aorticArch + 0.4,
        section: (y) => {
          const airway = airwayAt(y);
          return { halfWidth: airway.radius, halfDepth: airway.radius * 0.94, centreZ: airway.z };
        },
        detail: 5,
      }),
      (v) => {
        // The rings, as ridges: they are the only reason a trachea looks like
        // a trachea rather than a hose.
        const airway = airwayAt(v.y);
        const dx = v.x;
        const dz = v.z - airway.z;
        const r = Math.hypot(dx, dz);
        if (r > 1e-4) {
          const ridge = 0.05 * Math.cos(v.y * 5.6);
          v.x += (dx / r) * ridge;
          v.z += (dz / r) * ridge;
        }
      }
    ),
    '#ded4bf',
    wallMaterial
  );

  solid(
    'oesophagus',
    shellGeometry({
      y0: LEVELS.cricoid + 0.1,
      y1: LEVELS.aorticArch - 0.2,
      section: (y) => {
        const gullet = oesophagusAt(y);
        return {
          halfWidth: gullet.halfWidth,
          halfDepth: gullet.halfDepth,
          centreZ: gullet.z,
          centreX: gullet.x,
        };
      },
      detail: 5,
    }),
    '#cd9a8b',
    wallMaterial
  );

  solid(
    'hyoid-bone',
    cord(
      [
        [LEFT * 2.4, LEVELS.hyoid + 0.2, AIRWAY_Z - 0.7],
        [LEFT * 1.6, LEVELS.hyoid, AIRWAY_Z + 0.9],
        [0, LEVELS.hyoid - 0.1, AIRWAY_Z + 1.5],
        [-LEFT * 1.6, LEVELS.hyoid, AIRWAY_Z + 0.9],
        [-LEFT * 2.4, LEVELS.hyoid + 0.2, AIRWAY_Z - 0.7],
      ],
      0.26,
      { radial: 12, flatten: ['y', 0.8] }
    ),
    '#ece3cd',
    mineralMaterial
  );

  // --- the thyroid, wrapped round the airway -------------------------------
  //
  // The lobes are built as simple bodies and then pressed against the air
  // column, so the hollow in each one **is** the trachea's surface.
  paired(
    'thyroid-lobe',
    (side) =>
      warpGeometry(
        shapedSphere({
          detail: 6,
          warp: (v) => {
            const down = (1 - v.y) / 2;
            const y = lerp(LEVELS.thyroidCartilageBase + 0.5, LEVELS.thyroidLowerPole, down);
            // Superior pole tapers to a point; the inferior pole is blunt.
            const taper =
              1 - 0.64 * smoothstep(0.34, 0, down) - 0.2 * smoothstep(0.76, 1, down);
            const ring = Math.hypot(v.x, v.z);
            const girth = Math.min(1, ring * 2.2);
            const unitX = ring > 1e-5 ? v.x / ring : 0;
            const unitZ = ring > 1e-5 ? v.z / ring : 1;
            // The taper narrows the lobe **away from the airway**, not about
            // its own centre: a superior pole is thin and still pressed
            // against the larynx, and scaling about the centre pulled it off.
            v.x = side * (0.66 + 1.06 * taper) + unitX * girth * 1.18 * taper;
            v.y = y;
            v.z = AIRWAY_Z + 0.05 + unitZ * girth * 0.96 * taper;
          },
        }),
        (v) => clearAirway(v, 0.04)
      ),
    '#b0565d'
  );

  solid(
    'thyroid-isthmus',
    (() => {
      const y = LEVELS.isthmus;
      const airway = airwayAt(y);
      const reach = 1.3;
      // The band follows the front of the air column and stops **inside** the
      // lobes rather than beyond them: an isthmus joins the two lobes, and a
      // bar sticking out past both of them is not one.
      const front = (x) =>
        airway.z + 0.32 + 0.88 * airway.radius * Math.cos((Math.PI / 2) * (Math.abs(x) / reach) ** 1.3);
      return cord(
        [-reach, -0.72, 0, 0.72, reach].map((x) => [x, y, front(x)]),
        0.5,
        { radial: 16, flatten: ['y', 0.6] }
      );
    })(),
    '#b0565d'
  );

  // Four beads on the back of the gland. **Drawn larger than life** — see
  // `DISPLAY` — because a 6 mm gland at this scale cannot be found or clicked.
  {
    const parts = [];
    for (const side of [LEFT, -LEFT]) {
      for (const y of [LEVELS.cricoid + 0.15, LEVELS.thyroidLowerPole + 0.65]) {
        const bead = shapedSphere({ detail: 3, scale: [1, 1, 1] });
        bead.scale(DISPLAY.parathyroidRadius, DISPLAY.parathyroidRadius * 0.8, DISPLAY.parathyroidRadius * 0.7);
        bead.translate(side * 2.02, y, airwayAt(y).z - 1.0);
        bead.deleteAttribute('uv');
        bead.deleteAttribute('normal');
        parts.push(bead);
      }
    }
    const merged = mergeGeometries(parts);
    merged.computeVertexNormals();
    for (const part of parts) part.dispose();
    solid('parathyroid-gland', merged, '#d9a24e');
  }

  // --- the bundle on each side ---------------------------------------------
  paired(
    'carotid-sheath',
    (side) => {
      const points = [];
      for (let y = LEVELS.mandible - 0.3; y >= LEVELS.sternalNotch - 0.5; y -= 1.2) points.push(sheathAt(y, side));
      return cord(points, SHEATH.radius, { radial: 20, flatten: ['z', SHEATH.depthFactor] });
    },
    '#c9c6bd',
    wallMaterial,
    { opacity: 0.3 }
  );

  /** A run of points along one thing inside the sheath, either way up. */
  const along = (y0, y1, side, key, offset = [0, 0, 0], step = 1.1) => {
    const points = [];
    const count = Math.max(1, Math.round(Math.abs(y1 - y0) / step));
    for (let i = 0; i <= count; i += 1) {
      const y = lerp(y0, y1, i / count);
      const [x, , z] = sheathContentAt(y, side, key);
      points.push([x + side * offset[0], y + offset[1], z + offset[2]]);
    }
    return points;
  };

  // The common carotids do not begin in the same place: the right comes off
  // the brachiocephalic trunk in the root of the neck, the left straight off
  // the arch, lower and further back. This is the first asymmetry of three.
  paired(
    'common-carotid-artery',
    (side) =>
      cord(
        [
          side === LEFT ? [0.1, LEVELS.aorticArch + 0.5, 0.2] : [-0.95, LEVELS.aorticArch + 0.2, 0.95],
          side === LEFT ? [0.8, LEVELS.aorticArch + 1.6, 0.35] : [-1.6, LEVELS.subclavian + 0.3, 0.75],
          ...along(LEVELS.sternalNotch, LEVELS.carotidBifurcation, side, 'artery'),
          sheathContentAt(LEVELS.carotidBifurcation, side, 'artery'),
        ],
        SHEATH.contents.artery.radius,
        { radial: 16 }
      ),
    '#c0403e'
  );

  // Above the division: the internal runs back and out, the external forward
  // and in. That order — external in front — is how they are told apart.
  paired(
    'internal-carotid-artery',
    (side) =>
      cord(
        [
          sheathContentAt(LEVELS.carotidBifurcation, side, 'artery'),
          ...along(LEVELS.carotidBifurcation + 0.9, LEVELS.mandible - 0.2, side, 'artery', [0.3, 0, -0.55]),
        ],
        SHEATH.contents.artery.radius * 0.82,
        { radial: 14 }
      ),
    '#c8504a'
  );

  paired(
    'external-carotid-artery',
    (side) =>
      cord(
        [
          sheathContentAt(LEVELS.carotidBifurcation, side, 'artery'),
          ...along(LEVELS.carotidBifurcation + 0.9, LEVELS.mandible - 0.4, side, 'artery', [-0.38, 0, 0.6]),
        ],
        SHEATH.contents.artery.radius * 0.74,
        { radial: 14 }
      ),
    '#d9665c'
  );

  paired(
    'internal-jugular-vein',
    (side) =>
      cord(
        [
          ...along(LEVELS.mandible - 0.2, LEVELS.sternalNotch + 0.2, side, 'vein'),
          [side * 1.5, LEVELS.sternalNotch - 0.6, SHEATH.z + 0.7],
        ],
        SHEATH.contents.vein.radius,
        { radial: 18 }
      ),
    '#4a6ea8'
  );

  // A chain of nodes down the sheath. Where a neck lump is found, and why the
  // level it is found at says where to look for what put it there.
  {
    const parts = [];
    for (const side of [LEFT, -LEFT]) {
      for (const y of [4.6, 2.8, 0.8, -1.4, -3.6]) {
        const [x, , z] = sheathContentAt(y, side, 'vein');
        const node = shapedSphere({ detail: 3 });
        node.scale(DISPLAY.nodeRadius * 0.76, DISPLAY.nodeRadius, DISPLAY.nodeRadius * 0.7);
        node.translate(x + side * 0.78, y, z + 0.3);
        node.deleteAttribute('uv');
        node.deleteAttribute('normal');
        parts.push(node);
      }
    }
    const merged = mergeGeometries(parts);
    merged.computeVertexNormals();
    for (const part of parts) part.dispose();
    solid('deep-cervical-node', merged, '#8fae86');
  }

  // --- the nerves -----------------------------------------------------------
  //
  // The vagus runs the length of the neck inside the sheath, behind the two
  // vessels, and then leaves it — and the two sides leave at different heights,
  // which is the second asymmetry and the reason for the third.
  paired(
    'vagus-nerve',
    (side) =>
      cord(
        [
          ...along(LEVELS.mandible - 0.2, LEVELS.sternalNotch, side, 'nerve'),
          side === LEFT ? [2.55, LEVELS.subclavian + 0.6, 0.1] : [-2.35, LEVELS.subclavian + 0.4, 0.25],
          side === LEFT ? [2.05, LEVELS.aorticArch + 1.0, -0.45] : [-2.25, LEVELS.subclavian - 0.1, 0.3],
          side === LEFT ? [1.55, LEVELS.aorticArch - 0.05, -0.7] : [-2.4, LEVELS.subclavian - 0.35, 0.3],
        ],
        DISPLAY.vagusRadius,
        { radial: 12 }
      ),
    '#dcc271'
  );

  // **The scene's subject.** Both nerves end in the same place by the same
  // road — up the groove between trachea and gullet — but they join that road
  // at different heights, because each turns round a different vessel.
  paired(
    'recurrent-laryngeal-nerve',
    (side) =>
      cord(
        side === LEFT
          ? [
              // Left: on into the chest, under the arch, and back up.
              [1.55, LEVELS.aorticArch - 0.05, -0.7],
              [1.45, LEVELS.aorticArch - 0.75, -0.35],
              [1.1, LEVELS.aorticArch - 0.85, -1.15],
              [0.85, LEVELS.aorticArch + 0.5, -1.5],
              [1.05, LEVELS.subclavian - 0.2, -0.2],
              grooveAt(LEVELS.sternalNotch, side),
              grooveAt(LEVELS.thyroidLowerPole, side),
              grooveAt(LEVELS.isthmus, side),
              grooveAt(LEVELS.cricoid + 0.35, side),
            ]
          : [
              // Right: it turns at the root of the neck, two levels higher.
              [-2.4, LEVELS.subclavian - 0.35, 0.3],
              [-2.6, LEVELS.subclavian - 0.75, 0.05],
              [-2.35, LEVELS.subclavian - 0.7, -0.55],
              [-1.75, LEVELS.subclavian + 0.35, -0.6],
              [-1.15, LEVELS.sternalNotch - 0.6, 0.35],
              grooveAt(LEVELS.sternalNotch, side),
              grooveAt(LEVELS.thyroidLowerPole, side),
              grooveAt(LEVELS.isthmus, side),
              grooveAt(LEVELS.cricoid + 0.35, side),
            ],
        DISPLAY.recurrentRadius,
        { radial: 12, steps: 90 }
      ),
    '#f2d63c'
  );

  // --- the two vessels the nerves turn round -------------------------------
  //
  // Drawn because without them the courses above are two arbitrary loops. Only
  // as much of the top of the chest is drawn as those loops need.
  paired(
    'subclavian-artery',
    (side) =>
      cord(
        side === LEFT
          ? [
              [0.95, LEVELS.aorticArch - 0.3, -0.85],
              [1.7, LEVELS.subclavian - 0.4, -0.55],
              [3.3, LEVELS.subclavian - 0.05, 0.05],
              [5.2, LEVELS.subclavian - 0.35, 0.25],
            ]
          : [
              [-0.85, LEVELS.aorticArch + 0.35, 0.9],
              [-1.9, LEVELS.subclavian - 0.05, 0.6],
              [-3.4, LEVELS.subclavian + 0.05, 0.75],
              [-5.2, LEVELS.subclavian - 0.3, 0.55],
            ],
        0.46,
        { radial: 14 }
      ),
    '#c0403e'
  );

  solid(
    'aortic-arch',
    cord(
      [
        [-1.5, LEVELS.floor, 1.25],
        [-1.0, LEVELS.aorticArch + 0.2, 1.0],
        [0.15, LEVELS.aorticArch + 0.65, 0.1],
        [1.3, LEVELS.aorticArch + 0.15, -1.0],
        [1.5, LEVELS.floor, -1.35],
      ],
      0.92,
      { radial: 20 }
    ),
    '#b53a39'
  );

  // Centimetres to world units, in one place. See `WORLD_SCALE`.
  object.scale.setScalar(WORLD_SCALE);

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => pairs.get(id) ?? (index.has(id) ? [index.get(id)] : []),
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [
        key,
        new THREE.Vector3(...point).multiplyScalar(WORLD_SCALE),
      ])
    ),
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
