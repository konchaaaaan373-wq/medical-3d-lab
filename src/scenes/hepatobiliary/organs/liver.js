import * as THREE from 'three';
import { bump, ripple, shapedSphere, lerp, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';
import { carvePart, carveInside, partCentroid, planeThrough, radialField, surfaceSamples } from '../../shared/geometry/carve.js';
import {
  CAVA,
  HEPATIC_VEINS,
  PLANES,
  PORTA,
  SECTORS,
  SEGMENTS,
  anatomicalFrame,
  veinOrigin,
} from './liverAnatomy.js';

/**
 * The liver, divided the way surgery divides it.
 *
 * **NAMED PARTS, SCHEMATIC SHAPE.** What is right is the structure: eight
 * Couinaud segments as separate closed meshes whose union is the parenchyma,
 * grouped into the five sectors a resection is planned in; the three hepatic
 * veins lying **on** the planes that separate them; the portal pedicles running
 * **inside** the segments they supply; and a caudate lobe that belongs to
 * neither the right nor the left liver and drains straight into the cava.
 * Every one of those is fixed by a test in `tests/liver-anatomy.test.js`.
 *
 * The sector volumes were **calibrated** to the shares the literature reports —
 * about 2% caudate, 17% each for the two left sectors, and about a third each
 * for the two right ones — so they are a target this repository hit, not a
 * measurement it made. Everything else about the shape is unchanged and is
 * still not from a scan: real Couinaud planes are curved, the veins wander, and
 * the territories vary enough between people that no operation is planned on a
 * diagram like this one.
 *
 * The parenchyma is drawn slightly translucent so that flow inside it can be
 * seen. That is a visualisation choice, not a property of liver.
 */

/** The outer shape, unchanged: a wedge with a bulky right lobe. */
export function liverWarp(v) {
  const { x, y, z } = v;

  // The left lobe thins to an edge towards the patient's left (screen right).
  // Without this the liver is a dome, and a dome is a mushroom.
  const left = smoothstep(-0.25, 1, x);
  v.y *= 1 - 0.56 * left;
  v.z *= 1 - 0.6 * left;
  v.x += 0.16 * left;

  // The superior surface is domed on the right and falls away to the left,
  // which is what gives a liver its wedge profile from the front.
  if (v.y > 0) v.y *= 1 - 0.3 * left;

  // Visceral (inferior) surface: flat, not round.
  if (v.y < -0.24) v.y = lerp(v.y, -0.3, 0.78);

  // Falciform ligament: the groove that divides segment IV from II and III.
  // It is **not** the division between the right and left liver — that is
  // Cantlie's line, well to the right of this, and the commonest mistake about
  // liver anatomy. The groove is on the surface; the division is a plane.
  const groove = Math.exp(-Math.pow((x - 0.24) / 0.11, 2)) * smoothstep(-0.15, 0.45, y);
  v.multiplyScalar(1 - 0.17 * groove);

  // Gallbladder fossa, on the underside of the right lobe.
  if (v.y < -0.1) v.y += 0.16 * bump(x, z, { atY: -0.5, atZ: 0.42, spreadY: 0.3, spreadZ: 0.34 });

  v.multiplyScalar(1 + 0.016 * ripple(x, y, z, 2.7, 0.9));
}

export const LIVER_SCALE = [1.85, 0.92, 0.95];

/** Muted, and close together: eight segments of one organ, not eight organs. */
export const SEGMENT_COLORS = {
  I: '#7c4a52',
  II: '#a3505a',
  III: '#93474f',
  IVa: '#9c4c56',
  IVb: '#8d4650',
  V: '#8f3f43',
  VI: '#a24a4e',
  VII: '#984449',
  VIII: '#a75056',
};

/**
 * The liver, its segments, its hepatic veins and its portal pedicles.
 *
 * @param {{ color?: string, opacity?: number, detail?: number,
 *           segmentColors?: Record<string, string>, referenceSamples?: number,
 *           vessels?: boolean }} [options]
 */
export function buildLiver({
  color = '#8f3f43',
  opacity = 0.82,
  /**
   * How finely each segment is tessellated. High for the same reason the lung's
   * is: the cut faces, not the curved ones. Each vertex takes whichever comes
   * first, the surface or a Couinaud plane, so the rim between them zigzags at
   * the tessellation's spacing. Lower than the lung's, because there are nine
   * parts rather than five and each is correspondingly smaller: the zigzag
   * scales with the size of the part, not with the size of the organ.
   */
  detail = 10,
  segmentColors = SEGMENT_COLORS,
  referenceSamples = 24000,
  vessels = true,
} = {}) {
  const object = new THREE.Group();
  object.name = 'liver';

  const samples = surfaceSamples(liverWarp, LIVER_SCALE, referenceSamples);
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let i = 0; i < samples.length; i += 3) {
    bounds.expandByPoint(point.set(samples[i], samples[i + 1], samples[i + 2]));
  }
  const centre = bounds.getCenter(new THREE.Vector3());
  const field = radialField(samples, centre);
  const frame = anatomicalFrame(bounds);

  /** A Couinaud plane as a cut: the normal points at what is discarded. */
  const cutFor = ({ plane, positive }) => {
    const definition = PLANES[plane];
    const normal = frame.toLocalNormal(definition.normal);
    return planeThrough(frame.toLocal(definition.through), positive ? normal.negate() : normal);
  };

  const disposables = [];
  const segments = [];
  const parenchyma = new THREE.Group();
  parenchyma.name = 'parenchyma';

  for (const segment of SEGMENTS) {
    const planes = segment.bounded.map(cutFor);
    // Found, not written down: a carve is star-shaped about its centre, and a
    // centre outside its own segment produces a different solid rather than a
    // smaller one.
    const found = partCentroid({ field, bounds, planes, samples: 9000, seed: 17 });
    const segmentCentre = found ? found.centroid : frame.toLocal(segment.at);
    const geometry = carvePart({ field, centre: segmentCentre, planes, detail });
    const material = tissueMaterial({
      color: segmentColors[segment.id] ?? color,
      roughness: 0.5,
      opacity,
      emissiveIntensity: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `segment-${segment.id}`;
    parenchyma.add(mesh);
    segments.push({
      ...segment,
      mesh,
      material,
      geometry,
      centre: segmentCentre.clone(),
      planes,
      /** Where this segment's portal pedicle ends, inside it. */
      pedicle: segmentCentre.clone(),
    });
    disposables.push(geometry, material);
  }

  object.add(parenchyma);

  const tree = vessels ? buildHepaticVessels({ frame, segments }) : null;
  if (tree) {
    object.add(tree.hepaticVeins.object, tree.portal.object);
    disposables.push(...tree.disposables);
  }

  const segmentIndex = new Map(segments.map((segment) => [segment.id, segment]));
  const sectorIndex = new Map(
    SECTORS.map((sector) => [sector.id, { ...sector, parts: sector.segments.map((id) => segmentIndex.get(id)) }])
  );

  return {
    object,
    /** The parenchyma alone, without the vessels. */
    parenchyma,
    /** Nine closed meshes whose union is the liver. */
    segments,
    sectors: [...sectorIndex.values()],
    segmentById: (id) => segmentIndex.get(id) ?? null,
    sectorById: (id) => sectorIndex.get(id) ?? null,
    hepaticVeins: tree?.hepaticVeins ?? null,
    portal: tree?.portal ?? null,
    frame,
    anchors: {
      rightLobe: new THREE.Vector3(-1.8, 0.8, 0.6),
      leftLobe: new THREE.Vector3(1.5, 0.35, 0.5),
      porta: new THREE.Vector3(-0.15, -0.75, 0.7),
      cava: frame.toLocal(CAVA).add(new THREE.Vector3(0, 0.55, -0.4)),
      // Derived from the plane it names rather than typed beside it. Written by
      // hand at x 0.35 it was nearest segment VIII — the right anterior
      // superior segment, on the far side of Cantlie's line from the ligament.
      falciform: frame.toLocal(PLANES.falciform.through).add(new THREE.Vector3(0, 0.75, 0.35)),
    },
    /** Which segment a point in the liver's own coordinates falls in. */
    segmentAt(local) {
      for (const segment of segments) {
        if (segment.planes.every((plane) => plane.normal.dot(local) - plane.constant <= 0)) return segment;
      }
      return null;
    },
    /** Whether a point is inside the liver at all. */
    contains: (local) => carveInside(local, { field }),
    /** @param {string} id @param {boolean} visible */
    setSegmentVisible(id, visible) {
      const segment = segmentIndex.get(id);
      if (segment) segment.mesh.visible = visible;
    },
    /** @param {string} id @param {boolean} visible */
    setSectorVisible(id, visible) {
      for (const segment of sectorIndex.get(id)?.parts ?? []) segment.mesh.visible = visible;
    },
    /**
     * Colour the whole parenchyma one colour.
     *
     * The segments carry their own materials now, so a scene that used to reach
     * for `object.material` has to say what it means instead. Cirrhosis colours
     * the whole liver; a resection view colours one segment.
     *
     * @param {THREE.Color | string} next
     */
    setParenchymaColor(next) {
      for (const segment of segments) segment.material.color.set(next);
    },
    /** @param {string} id @param {THREE.Color | string} next */
    setSegmentColor(id, next) {
      segmentIndex.get(id)?.material.color.set(next);
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}

/**
 * The two vascular trees, and the fact that tells them apart.
 *
 * **Hepatic veins run between segments; portal pedicles run inside them.** The
 * veins are drawn on the very planes that divide the segments and converge on
 * the inferior vena cava behind and above; the portal branches leave the porta
 * hepatis below and in front and run out to the middle of each segment. That
 * difference is the whole reason a segment can be removed without cutting
 * anything belonging to its neighbours, and it is why a surgeon finds a
 * resection plane by following a hepatic vein.
 */
function buildHepaticVessels({ frame, segments }) {
  const disposables = [];
  const veinMaterial = tissueMaterial({ color: '#6f8fc4', roughness: 0.4, emissiveIntensity: 0.05 });
  const portalMaterial = tissueMaterial({ color: '#5f7fd6', roughness: 0.42, emissiveIntensity: 0.06 });
  disposables.push(veinMaterial, portalMaterial);

  const veinGroup = new THREE.Group();
  veinGroup.name = 'hepatic-veins';
  const portalGroup = new THREE.Group();
  portalGroup.name = 'portal-pedicles';
  const branches = [];

  const tube = (group, material, name, points, radius) => {
    const curve = smoothCurve(points.map((p) => [p.x, p.y, p.z]));
    const surface = new TubeSurface(curve, { radius, steps: 22, radial: 10 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    group.add(mesh);
    disposables.push(surface);
    branches.push({ name, curve, surface, mesh });
    return curve;
  };

  const cava = frame.toLocal(CAVA);
  const porta = frame.toLocal(PORTA);

  // The cava itself, running up behind the liver.
  tube(
    veinGroup,
    veinMaterial,
    'inferior-vena-cava',
    [cava.clone().add(new THREE.Vector3(0, -0.75, 0)), cava, cava.clone().add(new THREE.Vector3(0, 0.7, 0))],
    () => 0.1
  );

  // The three hepatic veins, each running up its own plane to the cava.
  for (const vein of HEPATIC_VEINS) {
    // On its own plane by construction, not by a coordinate that has to be
    // kept in step with one.
    const from = veinOrigin(frame, vein);
    tube(
      veinGroup,
      veinMaterial,
      vein.id,
      [from, from.clone().lerp(cava, 0.55), cava],
      (u) => 0.028 + 0.05 * u
    );
  }

  // Segment I is the exception that proves the arrangement: it drains straight
  // into the cava by its own short veins rather than through any of the three.
  const caudate = segments.find((segment) => segment.id === 'I');
  if (caudate) {
    tube(
      veinGroup,
      veinMaterial,
      'caudate-veins',
      [caudate.centre, caudate.centre.clone().lerp(cava, 0.6), cava],
      () => 0.026
    );
  }

  // The portal vein, its two branches, and a pedicle into every segment.
  const rightBranch = porta.clone().add(new THREE.Vector3(-0.5, 0.06, -0.05));
  const leftBranch = porta.clone().add(new THREE.Vector3(0.5, 0.1, 0.05));
  tube(
    portalGroup,
    portalMaterial,
    'portal-vein',
    [porta.clone().add(new THREE.Vector3(0, -0.5, 0.45)), porta.clone().add(new THREE.Vector3(0, -0.2, 0.2)), porta],
    () => 0.085
  );
  tube(portalGroup, portalMaterial, 'right-portal-branch', [porta, porta.clone().lerp(rightBranch, 0.6), rightBranch], () => 0.062);
  tube(portalGroup, portalMaterial, 'left-portal-branch', [porta, porta.clone().lerp(leftBranch, 0.6), leftBranch], () => 0.055);

  for (const segment of segments) {
    if (segment.id === 'I') continue;
    const from = segment.centre.x < porta.x ? rightBranch : leftBranch;
    tube(
      portalGroup,
      portalMaterial,
      `portal-pedicle-${segment.id}`,
      [from, from.clone().lerp(segment.pedicle, 0.55), segment.pedicle],
      (u) => 0.04 - 0.016 * u
    );
  }
  // The caudate takes blood from both branches, which is the other half of why
  // it survives what kills the rest of the liver.
  if (caudate) {
    for (const [side, from] of [['right', rightBranch], ['left', leftBranch]]) {
      tube(
        portalGroup,
        portalMaterial,
        `portal-pedicle-I-${side}`,
        [from, from.clone().lerp(caudate.pedicle, 0.6), caudate.pedicle],
        () => 0.026
      );
    }
  }

  return {
    hepaticVeins: { object: veinGroup, material: veinMaterial },
    portal: { object: portalGroup, material: portalMaterial },
    branches,
    disposables,
  };
}

/**
 * The gallbladder, hanging off the underside of the right lobe.
 *
 * PROTOTYPE. Pear-shaped: rounded fundus, tapering neck towards the cystic
 * duct. `setFill` is a shape change only — it is not a volume in millilitres.
 */
export function buildGallbladder({ color = '#c9b23c' } = {}) {
  const geometry = shapedSphere({
    detail: 7,
    scale: [0.42, 0.56, 0.4],
    warp: (v) => {
      // Taper towards the neck (+y), round at the fundus (-y).
      // Rounded fundus, narrowing to the neck — but not to a blade: tapered
      // this hard from a flat shape it read as a leaf hanging off the liver.
      const t = smoothstep(-0.15, 1, v.y);
      v.x *= 1 - 0.5 * t;
      v.z *= 1 - 0.5 * t;
      v.y += 0.14 * t;
    },
  });
  const mesh = new THREE.Mesh(geometry, tissueMaterial({ color, roughness: 0.36, emissiveIntensity: 0.08 }));
  mesh.name = 'gallbladder';
  // Hanging off the underside of the right lobe, fundus pointing down and
  // forwards — the direction it is felt from in life.
  mesh.position.set(-0.62, -0.66, 0.6);
  mesh.rotation.z = -0.22;
  mesh.rotation.x = -0.42;

  return {
    object: mesh,
    anchors: { gallbladder: new THREE.Vector3(-1.15, -1.25, 0.9) },
    /** 1 = distended (fasting), 0 = contracted after a meal. */
    setFill(value) {
      const v = Math.max(0, Math.min(1, value));
      mesh.scale.set(lerp(0.62, 1.06, v), lerp(0.82, 1.02, v), lerp(0.62, 1.06, v));
    },
  };
}
