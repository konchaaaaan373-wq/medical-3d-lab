import * as THREE from 'three';
import { bump, ripple, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve, smoothProfile } from '../../shared/geometry/tube.js';
import {
  carveInside,
  carvePart,
  partCentroid,
  planeThrough,
  radialField,
  scaledField,
  shellBetween,
  surfaceSamples,
} from '../../shared/geometry/carve.js';
import { mucosaMaterial, tissueMaterial } from '../../shared/materials.js';
import { createRandom } from '../../../utils/math.js';
import {
  CORTEX_THICKNESS_FRACTION,
  LOBES,
  MAJOR_CALYCES,
  SINUS_CENTRE,
  anatomicalFrame,
  fanDirection,
  majorCalyxAt,
  medullaryParts,
  minorCalyxPath,
  papillaAt,
} from './kidneyAnatomy.js';

/** The unit sphere's scaling into a kidney: taller than it is wide or deep. */
export const KIDNEY_SCALE = Object.freeze([0.62, 0.98, 0.6]);

/**
 * Two palettes, because the two builds have to make different things visible.
 *
 * The landmark build has one nested shape standing for the medulla, and its
 * job is to read as a kidney at thumbnail size, so the two tones are close.
 * The lobed build has to make the pyramids tell themselves apart from the
 * cortex that runs between them — a division nobody can see is not a division
 * (docs/grand-design.md §4.5 rule 4) — so the medulla is pale against a deep
 * cortex, which is also how a cut kidney looks.
 */
export const KIDNEY_PALETTE = Object.freeze({
  landmark: Object.freeze({ cortex: '#a0555c', medulla: '#c9757c' }),
  lobed: Object.freeze({ cortex: '#93454f', medulla: '#e2a9ad' }),
});

/**
 * A kidney, with its hilum and collecting system.
 *
 * Two builds of one organ, chosen by `parts`:
 *
 * - **`parts: false`** (default) — the bean, with cortex and medulla as two
 *   nested shapes. A landmark: enough to place a kidney in a whole-body view or
 *   a thumbnail, and explicitly nothing more. Pyramids, columns and calyces are
 *   not in it.
 * - **`parts: true`** — the parenchyma cut into its renal lobes: seven cortical
 *   caps, seven medullary pyramids and the six columns between them, each a
 *   closed mesh, together exactly the parenchyma. The anatomy it is cut by is
 *   described in `kidneyAnatomy.js`; this function only builds it.
 *
 * Two builders rather than one because they answer different questions at
 * different sizes, the way `heart.js` and heart failure's ventricle do. The
 * cheap one is not a draft of the other and is not going away.
 *
 * @param {{ side?: 'left'|'right', color?: string, medullaColor?: string,
 *           opacity?: number, parts?: boolean, detail?: number,
 *           referenceSamples?: number }} [options]
 */
export function buildKidney({
  side = 'left',
  color = null,
  medullaColor = null,
  opacity = 0.82,
  parts = false,
  /**
   * How finely each part is tessellated — the curved faces now, not the cuts.
   *
   * It was eighteen, and eighteen was not enough. Every vertex took whichever
   * came first, the surface or an interlobar plane, so the rim between them
   * zigzagged at the tessellation's spacing and the pyramids showed a feathered
   * edge through the cortex at any resolution worth shipping. `carvePart` cuts
   * the mesh along that rim now, so the cut faces are exact and no longer the
   * thing setting this number: twelve is cleaner than eighteen used to be, at
   * a little over half the triangles.
   */
  detail = 12,
  referenceSamples = 14000,
} = {}) {
  const palette = parts ? KIDNEY_PALETTE.lobed : KIDNEY_PALETTE.landmark;
  const cortexColor = color ?? palette.cortex;
  const medullaTone = medullaColor ?? palette.medulla;
  // `medial` is the sign of the side the hilum faces: the left kidney (screen
  // right) has its hilum towards screen-left, and vice versa.
  const medial = side === 'left' ? 1 : -1;

  const warp = (v) => {
    const { x, y, z } = v;
    // Poles taper: a kidney is not an ellipsoid, it is narrower top and bottom.
    const taper = 1 - 0.3 * Math.pow(Math.abs(y), 3);
    v.x *= taper;
    v.z *= taper;

    // Medial concavity, deepest at mid height: this is what makes it a bean
    // rather than an egg, so it is worth overdoing slightly.
    if (v.x * medial < 0) {
      const depth = bump(y, z, { atY: 0, atZ: 0, spreadY: 0.58, spreadZ: 0.9 });
      v.x += medial * 0.78 * depth * Math.min(1, -v.x * medial);
    }

    v.multiplyScalar(1 + 0.012 * ripple(x, y, z, 3.6, 2.1));
  };

  const object = new THREE.Group();
  object.name = `kidney-${side}`;

  if (parts) {
    return buildLobedKidney({
      object,
      side,
      medial,
      warp,
      color: cortexColor,
      medullaColor: medullaTone,
      opacity,
      detail,
      referenceSamples,
    });
  }

  const cortex = new THREE.Mesh(
    shapedSphere({ detail: 8, scale: [0.62, 0.98, 0.6], warp }),
    tissueMaterial({ color: cortexColor, roughness: 0.5, opacity })
  );
  cortex.name = 'cortex';

  const medulla = new THREE.Mesh(
    shapedSphere({ detail: 6, scale: [0.42, 0.66, 0.4], warp }),
    tissueMaterial({ color: medullaTone, roughness: 0.55, emissiveIntensity: 0.08 })
  );
  medulla.name = 'medulla';

  // Renal pelvis: the funnel in the hilum that the ureter leaves from.
  const pelvis = new THREE.Mesh(
    shapedSphere({ detail: 5, scale: [0.2, 0.26, 0.16] }),
    mucosaMaterial({ color: '#8fd6c4', opacity: 0.9 })
  );
  pelvis.position.set(-medial * 0.24, -0.05, 0);
  pelvis.name = 'pelvis';

  object.add(cortex, medulla, pelvis);

  /**
   * Paths from the cortex inwards to the pelvis.
   *
   * A stand-in for the *route*: filtration begins in the cortical glomeruli,
   * and what leaves the kidney leaves through the collecting system — papilla,
   * calyx, pelvis, ureter. Everything between those two ends is missing. The
   * tubule is where almost all of the filtrate is reabsorbed and where the
   * urine is actually made, and none of that is drawn here; a particle that
   * enters at the cortex and arrives at the pelvis in this scene has skipped
   * the entire process. Neither the number of paths nor the number of
   * particles means anything.
   */
  const random = createRandom(side === 'left' ? 71 : 72);
  const filtrationPaths = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + random() * 0.4;
    const outer = new THREE.Vector3(
      Math.cos(angle) * 0.5 * (medial > 0 ? 1 : -1) + medial * 0.12,
      Math.sin(angle) * 0.72,
      Math.cos(angle * 1.7) * 0.36
    );
    filtrationPaths.push(
      smoothCurve([
        [outer.x, outer.y, outer.z],
        [outer.x * 0.6, outer.y * 0.6, outer.z * 0.5],
        [-medial * 0.24, -0.05, 0],
      ])
    );
  }

  return {
    object,
    filtrationPaths,
    /** Where the ureter leaves, in the kidney's own coordinates. */
    hilum: new THREE.Vector3(-medial * 0.32, -0.12, 0),
    anchors: {
      cortex: new THREE.Vector3(medial * 0.9, 0.85, 0.5),
      hilum: new THREE.Vector3(-medial * 0.95, -0.1, 0.4),
    },
  };
}

/**
 * The parenchyma cut into its renal lobes, with the collecting system that
 * drains them.
 *
 * Every part is carved out of one distance field built from the organ's own
 * surface, so the parts are pieces of the kidney rather than shapes placed near
 * it: whatever the warp does to the bean, the parts follow.
 */
function buildLobedKidney({
  object,
  side,
  medial,
  warp,
  color,
  medullaColor,
  opacity,
  detail,
  referenceSamples,
}) {
  const samples = surfaceSamples(warp, KIDNEY_SCALE, referenceSamples);
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let i = 0; i < samples.length; i += 3) {
    bounds.expandByPoint(point.set(samples[i], samples[i + 1], samples[i + 2]));
  }
  const centre = bounds.getCenter(new THREE.Vector3());
  const field = radialField(samples, centre);
  // `lateral` is +x on the side the convex border is, which is the side the
  // hilum is not. One description in `kidneyAnatomy.js` then serves both
  // kidneys and only this line knows which way round they are.
  const frame = anatomicalFrame(bounds, medial);

  /**
   * The corticomedullary junction: the organ's own surface, shrunk towards its
   * centre by the cortex's share of the radius.
   *
   * Two earlier versions were worse. A fixed depth along each lobe's axis falls
   * outside the organ near the poles, because the parenchyma is thick laterally
   * and thin at the hilum. A plane per lobe is flat, and this boundary is not:
   * it follows the capsule, notch for notch, which is what a junction does.
   */
  const inner = scaledField(field, 1 - CORTEX_THICKNESS_FRACTION);

  const disposables = [];
  const built = [];
  const parenchyma = new THREE.Group();
  parenchyma.name = 'parenchyma';

  // The cortex is one part, not a ring of caps: a cortex is continuous, and
  // cutting it into wedges to make the arithmetic work would be inventing a
  // boundary the organ does not have.
  const capsule = carvePart({ field, centre: field.centre.clone(), planes: [], detail, cacheKey: `kidney:${side}:${referenceSamples}:outer` });
  const junction = carvePart({ field: inner, centre: field.centre.clone(), planes: [], detail, cacheKey: `kidney:${side}:${referenceSamples}:inner` });
  const cortexGeometry = shellBetween(capsule, junction);
  capsule.dispose();
  junction.dispose();
  const cortexMaterial = tissueMaterial({ color, roughness: 0.5, opacity, emissiveIntensity: 0.04 });
  const cortexMesh = new THREE.Mesh(cortexGeometry, cortexMaterial);
  cortexMesh.name = 'cortex';
  parenchyma.add(cortexMesh);
  built.push({
    id: 'cortex',
    kind: 'cortex',
    label: 'Renal cortex',
    labelJa: '腎皮質',
    mesh: cortexMesh,
    material: cortexMaterial,
    geometry: cortexGeometry,
    centre: field.centre.clone(),
    planes: [],
    field,
    /** A shell, so "inside every plane" cannot describe it. */
    inside: (point) => carveInside(point, { field }) && !carveInside(point, { field: inner }),
  });
  disposables.push(cortexGeometry, cortexMaterial);

  /**
   * Each lobe's axis, measured on the inner solid: where the junction is along
   * it, and where its papilla sits.
   *
   * Bisected rather than solved: the field is anchored at the organ's centre
   * and this ray starts at the sinus, so the two do not share a
   * parameterisation, and a fixed-point iteration converges only when they
   * nearly do — the defect that once made a lung's lobes sum to 182% of the
   * lung.
   */
  const sinusLocal = frame.toLocal(SINUS_CENTRE);
  const axes = new Map();
  for (const lobe of LOBES) {
    const direction = frame
      .toLocal(SINUS_CENTRE.map((value, axis) => value + fanDirection(lobe.angle)[axis]))
      .sub(sinusLocal)
      .normalize();
    const probe = new THREE.Vector3();
    const offset = sinusLocal.clone().sub(field.centre);
    const crossing = (radiusAt) => {
      const outside = (t) => {
        probe.copy(direction).multiplyScalar(t).add(offset);
        return probe.length() - radiusAt(probe);
      };
      let low = 0;
      let high = Math.max(1e-6, radiusAt(direction) + offset.length()) * 2;
      for (let grow = 0; grow < 8 && outside(high) < 0; grow += 1) high *= 1.6;
      for (let step = 0; step < 24; step += 1) {
        const mid = (low + high) / 2;
        if (outside(mid) < 0) low = mid;
        else high = mid;
      }
      return direction.clone().multiplyScalar((low + high) / 2).add(sinusLocal);
    };
    axes.set(lobe.id, {
      direction,
      surface: crossing((v) => field.radiusAt(v)),
      junction: crossing((v) => inner.radiusAt(v)),
      papilla: frame.toLocal(papillaAt(lobe)),
    });
  }

  /** An interlobar plane as a cut: the normal points at what is discarded. */
  const cutFor = ({ normal, through, keep }) => {
    const localNormal = frame.toLocalNormal(normal);
    return planeThrough(
      frame.toLocal(through),
      keep === 'positive' ? localNormal.negate() : localNormal
    );
  };


  for (const part of medullaryParts()) {
    const planes = part.cuts.map(cutFor);
    // Found, not written down: a carve is star-shaped about its centre, and a
    // centre outside its own part produces a different solid rather than a
    // smaller one.
    const found = partCentroid({ field: inner, bounds, planes, samples: 9000, seed: 23 });
    // A part that carved empty is a broken partition, not something to skip
    // past: the cuts describe the whole inner solid, so every one of them has
    // to find tissue. Skipping is how five missing cortical caps went
    // unnoticed through a build that reported success.
    if (!found) throw new Error(`kidney: the part "${part.id}" carved empty`);
    const geometry = carvePart({
      field: inner,
      centre: found.centroid,
      planes,
      detail,
      cacheKey: `kidney:${side}:${referenceSamples}:inner`,
    });
    const material = tissueMaterial({
      // A column and the hilar lips are cortex, so they are the cortex's own
      // colour: what has to be visible here is pyramid against cortex, not
      // column against cap.
      color: part.kind === 'medulla' ? medullaColor : color,
      roughness: part.kind === 'medulla' ? 0.55 : 0.5,
      opacity,
      emissiveIntensity: part.kind === 'medulla' ? 0.08 : 0.04,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.id;
    parenchyma.add(mesh);
    built.push({
      ...part,
      mesh,
      material,
      geometry,
      centre: found.centroid.clone(),
      planes,
      field: inner,
      // The sector planes alone do not describe this part: they say which wedge
      // of the fan it is, and the inner surface says it stops at the
      // corticomedullary junction. Without the second half, every point in the
      // cortex satisfies some wedge and the parts overlap threefold.
      inside: (point) => carveInside(point, { field: inner, planes }),
    });
    disposables.push(geometry, material);
  }

  object.add(parenchyma);

  // The collecting system, from the papilla outwards: a minor calyx cups each
  // papilla, the infundibula run to the pelvis, and the pelvis leaves at the
  // hilum as the ureter. This is the route urine takes once the tubule has
  // finished with it, and nothing about the tubule is drawn here.
  const collecting = new THREE.Group();
  collecting.name = 'collecting-system';
  const pelvisCentre = frame.toLocal([-0.30, -0.04, 0]);
  const calyces = [];

  const urothelium = () => mucosaMaterial({ color: '#8fd6c4', opacity: 0.9 });

  /** One length of the collecting system, as the cast of its lumen. */
  const duct = (name, points, profile) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: profile, steps: 24, radial: 12 });
    const mesh = new THREE.Mesh(surface.geometry, urothelium());
    mesh.name = name;
    collecting.add(mesh);
    disposables.push(surface, mesh.material);
    return mesh;
  };

  // A minor calyx flares at the papilla and narrows into its major calyx, so
  // the papilla is received rather than merely marked. It was a sphere centred
  // on the papilla — which swallows it — and the seven of them then ran
  // straight to one coordinate at the middle of the sinus. Neither is what a
  // collecting system does, and the second is the reason the sinus read as a
  // spider rather than a tree.
  for (const calyx of MAJOR_CALYCES) {
    const gather = frame.toLocal(majorCalyxAt(calyx));
    for (const id of calyx.lobes) {
      const lobe = LOBES.find((entry) => entry.id === id);
      const path = minorCalyxPath(lobe, calyx).map((point) => frame.toLocal(point));
      const papilla = frame.toLocal(papillaAt(lobe));
      const mesh = duct(
        `minor-calyx-${lobe.id}`,
        path.map((point) => [point.x, point.y, point.z]),
        smoothProfile([[0, 0.050], [0.55, 0.025], [1, 0.020]])
      );
      calyces.push({
        lobe: lobe.id,
        major: calyx.id,
        papilla: papilla.clone(),
        path: path.map((point) => point.clone()),
        mesh,
      });
    }

    // The trunk the group drains through. Anatomically this *is* the
    // infundibulum — the two words name one thing — so there is one per group
    // rather than one per papilla.
    duct(
      `major-calyx-${calyx.id}`,
      [
        [gather.x, gather.y, gather.z],
        [(gather.x + pelvisCentre.x) / 2, (gather.y + pelvisCentre.y) / 2, (gather.z + pelvisCentre.z) / 2],
        [pelvisCentre.x, pelvisCentre.y, pelvisCentre.z],
      ],
      smoothProfile([[0, 0.026], [1, 0.040]])
    );
  }

  // Sized to the sinus it sits in, not to the organ. The landmark build's
  // pelvis is three times this because it stands for the whole collecting
  // system on its own; here the calyces and infundibula are drawn, so the
  // pelvis is only the funnel they join into. At the landmark size it pushed
  // out between the pyramids, which is the render saying the parts are now
  // real and a stand-in for them is not.
  const pelvis = new THREE.Mesh(
    shapedSphere({ detail: 5, scale: [0.062, 0.088, 0.052] }),
    mucosaMaterial({ color: '#8fd6c4', opacity: 0.9 })
  );
  pelvis.position.copy(pelvisCentre);
  pelvis.name = 'pelvis';
  collecting.add(pelvis);
  disposables.push(pelvis.geometry, pelvis.material);
  object.add(collecting);

  const hilum = new THREE.Vector3(-medial * 0.32, -0.12, 0);
  const partIndex = new Map(built.map((part) => [part.id, part]));

  /**
   * Where one nephron sits inside one lobe — the join between the three scales
   * this organ is drawn at.
   *
   * A nephron is not drawn here and `nephron.js` does not know about lobes, so
   * without this the two scales are two pictures with nothing holding them
   * together. The arrangement is the physiology: **the glomerulus is in the
   * cortex** — that is where filtration happens and why the cortex is where the
   * blood goes — and **the loop of Henle descends into the medulla**, towards
   * the papilla, which is what the medulla's gradient is for. A nephron placed
   * the other way round would be a different organ.
   */
  const nephronSites = LOBES.map((lobe) => {
    const axis = axes.get(lobe.id);
    return {
      lobe: lobe.id,
      glomerulus: axis.junction.clone().lerp(axis.surface, 0.45),
      loopTip: axis.papilla.clone().lerp(axis.junction, 0.55),
      papilla: axis.papilla.clone(),
      corticomedullaryJunction: axis.junction.clone(),
      surface: axis.surface.clone(),
    };
  });

  return {
    object,
    parenchyma,
    collecting,
    parts: built,
    calyces,
    field,
    frame,
    bounds,
    /** @param {string} id */
    innerField: inner,
    part: (id) => partIndex.get(id) ?? null,
    partsOfKind: (kind) => built.filter((part) => part.kind === kind),
    nephronSites,
    /** Is this point inside the whole kidney? The partition check needs it. */
    contains: (point) => carveInside(point, { field }),
    /** Where the ureter leaves, in the kidney's own coordinates. */
    hilum,
    pelvisCentre: pelvisCentre.clone(),
    filtrationPaths: built
      .filter((part) => part.kind === 'cortex')
      .map((part) =>
        smoothCurve([
          [part.centre.x, part.centre.y, part.centre.z],
          [
            (part.centre.x + pelvisCentre.x) / 2,
            (part.centre.y + pelvisCentre.y) / 2,
            (part.centre.z + pelvisCentre.z) / 2,
          ],
          [pelvisCentre.x, pelvisCentre.y, pelvisCentre.z],
        ])
      ),
    anchors: {
      cortex: new THREE.Vector3(medial * 0.9, 0.85, 0.5),
      hilum: new THREE.Vector3(-medial * 0.95, -0.1, 0.4),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}

/**
 * A ureter: a narrow muscular tube that moves urine by peristalsis, not by
 * gravity. PROTOTYPE — calibre and course are illustrative.
 */
export function buildUreter(points, { color = '#8fd6c4' } = {}) {
  const curve = smoothCurve(points);
  const surface = new TubeSurface(curve, { radius: () => 0.055, steps: 80, radial: 10 });
  const mesh = new THREE.Mesh(surface.geometry, mucosaMaterial({ color, opacity: 0.9 }));
  mesh.name = 'ureter';
  return { object: mesh, curve, surface, dispose: () => surface.dispose() };
}

/**
 * The bladder: a hollow organ whose shape changes with what is in it.
 *
 * PROTOTYPE. Empty it sits low and flattened in the pelvis; as it fills it
 * becomes rounder and rises. The wall is drawn translucent with the contents
 * inside it, so "filling" is something you can see rather than infer.
 * `setFill` is a shape, not a volume in millilitres.
 */
export function buildBladder({ color = '#c8a6b8', fluidColor = '#e8d75f' } = {}) {
  const object = new THREE.Group();
  object.name = 'bladder';

  const wall = new THREE.Mesh(
    shapedSphere({
      detail: 7,
      scale: [0.7, 0.68, 0.64],
      warp: (v) => {
        // Domed above, tapering to the neck below. Flattened much further than
        // this it stops reading as a container and starts reading as a disc.
        v.y -= 0.06 * smoothstep(0.35, 1, v.y);
        // Only the last of it narrows towards the neck: taper the whole lower
        // half and the organ reads as a bowl with a lip.
        const low = smoothstep(-0.55, -1, v.y);
        v.x *= 1 - 0.4 * low;
        v.z *= 1 - 0.4 * low;
      },
    }),
    tissueMaterial({ color, roughness: 0.45, opacity: 0.5 })
  );
  wall.name = 'bladder-wall';

  const fluid = new THREE.Mesh(
    shapedSphere({ detail: 6, scale: [0.62, 0.5, 0.53] }),
    tissueMaterial({ color: fluidColor, roughness: 0.25, emissiveIntensity: 0.22, opacity: 0.7 })
  );
  fluid.name = 'bladder-contents';

  object.add(wall, fluid);

  return {
    object,
    anchors: { bladder: new THREE.Vector3(0.95, -0.35, 0.6) },
    /** 0 = empty and flattened, 1 = full and round. */
    setFill(value) {
      const v = Math.max(0, Math.min(1, value));
      wall.scale.set(0.84 + 0.26 * v, 0.7 + 0.42 * v, 0.84 + 0.26 * v);
      wall.position.y = -0.1 + 0.18 * v;
      // The contents grow faster than the wall early on: the bladder becomes
      // round before it becomes big.
      const fill = Math.pow(v, 0.7);
      // Kept inside the wall: the contents must never reach it, or the organ
      // stops reading as a container and starts reading as a solid.
      fluid.scale.set(0.44 + 0.44 * fill, 0.36 + 0.56 * fill, 0.44 + 0.44 * fill);
      fluid.position.y = -0.2 + 0.24 * fill;
      fluid.visible = v > 0.02;
    },
  };
}
