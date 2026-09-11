import * as THREE from 'three';
import { latheFromProfile, shapedSphere, shellOfRevolution, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The eye: three coats, three transparent media, and the one place the brain
 * reaches the outside world.
 *
 * A globe is the easiest shape in the repository to draw and one of the hardest
 * to make useful, because **everything worth pointing at is inside it**. So the
 * coats are drawn as real shells with walls rather than as nested balls: the
 * sclera, the choroid and the retina each have an inner surface, and a section
 * through the eye shows three layers where a reader expects three layers.
 *
 * Nothing is moved to be seen. The fundus is reached by putting the front of
 * the eye away (a tag), not by pulling the lens out of it, and the sagittal
 * section cuts rather than opens.
 *
 * ## A right eye, looking at the reader
 *
 * `+z` is anterior — the cornea faces the camera. Screen-left is the patient's
 * right (`docs/architecture-rules.md` rule 5), so in a right eye **nasal** is
 * +x and **temporal** is −x; the optic disc is nasal to the macula, which is
 * the relation a fundus photograph is read by.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No radius, thickness, angle or
 * distance here is a measurement**, and nothing moves: no accommodation, no
 * pupillary reflex, no eye movement.
 */

/** Which way nasal is, in a right eye seen from in front. */
export const NASAL = 1;

/** The globe's radius. Everything else is placed as a fraction of it. */
export const GLOBE_RADIUS = 1;

/**
 * How thick the three coats are drawn.
 *
 * **Display values.** In life the retina, choroid and sclera are fractions of a
 * millimetre against a globe of about 24 mm, and drawn to scale they are one
 * line three colours wide. They are opened up until a reader can tell the three
 * apart and click each one, and every place this model is described says so.
 * **No thickness may be read off this model.**
 */
export const COAT_DISPLAY_THICKNESS = Object.freeze({
  sclera: [1.0, 0.95],
  choroid: [0.944, 0.918],
  retina: [0.912, 0.888],
});

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The centre of the pupil, on the visual axis. */
  pupil: [0, 0, 0.7],
  /** The centre of the lens — behind the iris, never through it. */
  lens: [0, 0, 0.5],
  /** Where the iris meets the cornea: the angle aqueous leaves through. */
  iridocornealAngle: [0, 0.62, 0.72],
  /** The back of the eye, on the axis. */
  posteriorPole: [0, 0, -0.9],
  /** Nasal to the pole: where the nerve leaves and there is no retina. */
  opticDisc: [NASAL * 0.3, 0, -0.85],
  /** Temporal to the disc, on the axis: where the detail is. */
  fovea: [-NASAL * 0.06, 0, -0.898],
});

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildEyeball({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'eyeball';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, position, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, opacity, ...extra });
    disposables.push(geometry, built);
    const mesh = add(id, new THREE.Mesh(geometry, built));
    if (position) mesh.position.set(...position);
    return mesh;
  };

  /** A coat: a shell swept back from the front, opening towards the cornea. */
  const coat = (id, [outer, inner], sweep, color, material = tissueMaterial, extra = {}) => {
    const geometry = shellOfRevolution({ outer, inner, sweep });
    // Swept about +y with its closed pole at −y; the eye's closed pole is the
    // back of the globe, so the axis turns to lie along z.
    geometry.rotateX(Math.PI / 2);
    return solid(id, geometry, null, color, material, extra);
  };

  // --- the three coats ------------------------------------------------------
  //
  // Outside in. Each one stops short of the next so no two surfaces sit in the
  // same place: coincident shells fight for pixels along every rim.
  coat('sclera', COAT_DISPLAY_THICKNESS.sclera, (135 * Math.PI) / 180, '#f2efe6', mineralMaterial);
  coat('choroid', COAT_DISPLAY_THICKNESS.choroid, (128 * Math.PI) / 180, '#8f4a52');
  coat('retina', COAT_DISPLAY_THICKNESS.retina, (122 * Math.PI) / 180, '#e8a87c', mucosaMaterial);

  // --- the front of the eye -------------------------------------------------
  //
  // The cornea is a steeper dome set into the front of the sclera, meeting it at
  // the limbus. Its own centre is in front of the globe's, which is what makes
  // it bulge — and that is a fact about the eye, not a drawing convenience.
  const CORNEA_CENTRE = 0.32;
  const CORNEA_RADIUS = 0.806;
  const cornea = shellOfRevolution({
    outer: CORNEA_RADIUS,
    inner: CORNEA_RADIUS - 0.05,
    sweep: (61 * Math.PI) / 180,
  });
  // Opening backwards, towards the inside of the eye.
  cornea.rotateX(-Math.PI / 2);
  // How see-through it is belongs to the scene, not here: `OrganAnatomyScene`
  // owns every structure's opacity (architecture rule 3), and an opacity set on
  // a material in a builder is overwritten on the first frame. What the builder
  // says about the cornea is that it is smooth.
  solid('cornea', cornea, [0, 0, CORNEA_CENTRE], '#dcecf0', tissueMaterial, { roughness: 0.06 });

  /** A flat ring: an annulus with a front face and a back one. */
  const ring = (id, innerRadius, outerRadius, thickness, z, color, material = tissueMaterial, extra = {}) => {
    const geometry = latheFromProfile(
      [
        [innerRadius, thickness / 2],
        [outerRadius, thickness / 2],
        [outerRadius, -thickness / 2],
        [innerRadius, -thickness / 2],
      ],
      { segments: 24, radial: 48 }
    );
    geometry.rotateX(Math.PI / 2);
    return solid(id, geometry, [0, 0, z], color, material, extra);
  };

  ring('iris', 0.18, 0.62, 0.05, SITES.pupil[2], '#6b4a2a', mucosaMaterial);
  // The pupil is a hole, and a hole cannot be clicked. It is drawn as the black
  // disc a reader sees when they look at one, which is what the hole looks like:
  // the inside of an eye, unlit.
  // Matte and very dark: a smooth dark surface under a key light reads as grey,
  // and a grey pupil is the one thing in an eye nobody would accept.
  solid('pupil', shapedSphere({ detail: 4, scale: [0.175, 0.175, 0.02] }), [0, 0, SITES.pupil[2] - 0.01], '#0b080c', tissueMaterial, {
    roughness: 0.98,
    metalness: 0,
    emissiveIntensity: 0,
  });

  // The lens: biconvex, just behind the iris, and the only part of the eye that
  // changes shape in life. Nothing here changes shape.
  solid(
    'lens',
    shapedSphere({
      detail: 5,
      scale: [0.44, 0.44, 0.17],
      warp: (v) => {
        // Flatter in front than behind, which is how a lens sits in an eye.
        v.z *= 1 - 0.22 * smoothstep(0, 1, v.z);
      },
    }),
    [0, 0, SITES.lens[2]],
    '#d8e8ee',
    tissueMaterial,
    { roughness: 0.1 }
  );

  // The ciliary body: the ring the lens hangs from and the aqueous comes from.
  const ciliary = [];
  for (let i = 0; i <= 64; i += 1) {
    const t = (i / 64) * Math.PI * 2;
    ciliary.push([Math.cos(t) * 0.66, Math.sin(t) * 0.66, 0.6]);
  }
  const ciliarySurface = new TubeSurface(smoothCurve(ciliary), { radius: () => 0.12, steps: 72, radial: 12 });
  flattenTube(ciliarySurface, 'z', 0.7);
  const ciliaryMaterial = mucosaMaterial({ color: colors['ciliary-body'] ?? '#a86a4e', opacity });
  disposables.push(ciliarySurface, ciliaryMaterial);
  add('ciliary-body', new THREE.Mesh(ciliarySurface.geometry, ciliaryMaterial));

  // --- the two spaces -------------------------------------------------------
  //
  // Drawn as bodies because that is the only way to point at a space. Both are
  // nearly transparent, so what a reader sees is a shape with an edge.
  solid(
    'anterior-chamber',
    shapedSphere({
      detail: 5,
      scale: [0.6, 0.6, 0.22],
      warp: (v) => {
        // Domed in front where the cornea is, flat behind where the iris is.
        v.z *= 1 - 0.55 * smoothstep(0, -1, v.z);
      },
    }),
    [0, 0, 0.84],
    '#bcdff0',
    tissueMaterial,
    { roughness: 0.05 }
  );
  solid(
    'vitreous-body',
    shapedSphere({
      detail: 5,
      scale: [0.87, 0.87, 0.87],
      warp: (v) => {
        // Stopped where the lens is: the vitreous fills the back of the eye and
        // nothing in front of it.
        if (v.z > 0.55) v.z = 0.55 + 0.12 * (v.z - 0.55);
      },
    }),
    null,
    '#cfe0e8',
    tissueMaterial,
    { roughness: 0.05 }
  );

  // --- the back of the eye --------------------------------------------------
  //
  // The two landmarks a fundus is read by. Nasal disc, temporal macula, and the
  // relation between them is what tells a reader which eye they are looking at.
  solid(
    'optic-disc',
    shapedSphere({ detail: 4, scale: [0.12, 0.12, 0.05] }),
    SITES.opticDisc,
    '#f0d8a8',
    mucosaMaterial
  );
  solid(
    'macula',
    shapedSphere({
      detail: 4,
      scale: [0.15, 0.15, 0.04],
      warp: (v) => {
        // The fovea: the pit in the middle of it.
        v.z += 0.5 * Math.exp(-Math.pow(Math.hypot(v.x, v.y) / 0.35, 2));
      },
    }),
    SITES.fovea,
    '#8a4a2e',
    mucosaMaterial
  );

  const nerve = new TubeSurface(
    smoothCurve([
      [NASAL * 0.3, 0, -0.86],
      [NASAL * 0.42, 0.01, -1.2],
      [NASAL * 0.62, 0.03, -1.8],
      [NASAL * 0.84, 0.06, -2.4],
    ]),
    { radius: (u) => 0.18 + 0.05 * smoothstep(0.7, 0, u), steps: 30, radial: 16 }
  );
  const nerveMaterial = tissueMaterial({ color: colors['optic-nerve'] ?? '#e8e0c8', opacity, roughness: 0.5 });
  disposables.push(nerve, nerveMaterial);
  add('optic-nerve', new THREE.Mesh(nerve.geometry, nerveMaterial));

  // --- the muscles that aim it ---------------------------------------------
  //
  // Four straps from one ring behind the eye to the sclera in front of the
  // equator. Which one is which is a question about direction, so each is drawn
  // between a named origin and a named insertion rather than by eye.
  const rectus = (id, insertion, color) => {
    const origin = [NASAL * 0.34, 0, -2.1];
    const middle = [
      origin[0] * 0.4 + insertion[0] * 0.6,
      origin[1] * 0.3 + insertion[1] * 0.7,
      -0.6,
    ];
    const surface = new TubeSurface(smoothCurve([origin, middle, insertion]), {
      radius: (u) => 0.13 + 0.06 * smoothstep(0.5, 1, u),
      steps: 36,
      radial: 14,
    });
    // A rectus is a flat ribbon lying on the globe, not a cable.
    flattenTube(surface, Math.abs(insertion[1]) > Math.abs(insertion[0]) ? 'y' : 'x', 0.45);
    const material = tissueMaterial({ color: colors[id] ?? color, opacity, roughness: 0.55 });
    disposables.push(surface, material);
    return add(id, new THREE.Mesh(surface.geometry, material));
  };
  rectus('superior-rectus', [0, 0.86, 0.24], '#c2564e');
  rectus('inferior-rectus', [0, -0.86, 0.24], '#a8433c');
  rectus('medial-rectus', [NASAL * 0.86, 0, 0.24], '#d9705e');
  rectus('lateral-rectus', [-NASAL * 0.86, 0, 0.24], '#e08a6a');

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    anchorPoints: Object.fromEntries(Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
