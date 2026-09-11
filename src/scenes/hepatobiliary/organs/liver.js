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

/**
 * How big a liver is, in this repository's units.
 *
 * One unit is about 5.5 cm, which is the scale every other organ is drawn at
 * (a kidney is 11 cm and two units tall). A liver is roughly 22 cm across, 15
 * cm from the dome of the right lobe to its inferior border, and 11 cm from
 * front to back — so 3.7 : 2.6 : 2.0 in these units.
 *
 * **It used to be 3.7 : 1.3 : 1.9**, which is a liver half its own height: the
 * flat visceral surface was made by crushing the whole lower half of the
 * organ, so what was left was deeper than it was tall. That is most of why it
 * read as a sausage rather than a liver, and it is why the gallbladder hanging
 * off it looked like a second organ — the gallbladder was the right size and
 * the liver was not.
 */
export const LIVER_SCALE = [2.3, 1.42, 1.0];

/**
 * Where the gallbladder fossa is, as `[x, z]` on the unit sphere.
 *
 * Exported because the gallbladder has to hang *in* it, and a gallbladder
 * positioned by a coordinate typed beside it floats away the moment the liver's
 * shape changes — which is exactly what happened when the liver was given its
 * proper height.
 */
export const GALLBLADDER_FOSSA = Object.freeze([-0.5, 0.42]);

/**
 * How far the warp slides the organ along x, on the unit sphere.
 *
 * Exported because anything positioned from a place *on* the liver has to know
 * about it: the gallbladder fossa is declared in the sphere's coordinates and
 * the finished organ is not where the sphere was.
 */
export const MIDLINE_SHIFT = 0.17;

/**
 * The outer shape: a blunt, tall right lobe tapering to a thin left one.
 *
 * ## What was wrong with it
 *
 * A sphere tapers to a point at *both* ends. Scaled long and warped a little,
 * that is a rugby ball, and the rendered liver was one: the tallest part was
 * in the middle and the right lobe came to a tip as surely as the left. A
 * liver does the opposite — the right lobe is the bulk of the organ and its
 * lateral border is nearly a wall, and only the left lobe tapers.
 *
 * So the cross-section along the long axis is *designed* here rather than
 * inherited from the sphere: blunt on the right, tapering to a rounded tip on
 * the left. Everything else — the wedge in profile, the flat visceral surface,
 * the falciform groove, the gallbladder fossa — is applied on top of that
 * silhouette rather than fighting it.
 *
 * ## What it still is not
 *
 * Not a specimen and not a scan. There is no porta hepatis notch, no bare
 * area, no ligamentous attachment and no caudate process; the inferior border
 * is an edge rather than the notched margin a liver actually has.
 */
export function liverWarp(v) {
  const { x, y, z } = v;

  // The warp runs on the **unit** sphere: `shapedSphere` and `surfaceSamples`
  // both apply `LIVER_SCALE` after it. Every threshold below is therefore in
  // units of the sphere, not of the finished organ.
  /** Along the long axis: -1 at the patient's right, +1 at the left. */
  const u = Math.max(-1, Math.min(1, x));

  // --- the silhouette from the front --------------------------------------
  //
  // `sphere` is the cross-section the unit sphere would have here; `designed`
  // is the one a liver has. Dividing gives what to multiply the section by,
  // clamped because the ratio is unbounded at the poles and a pole is one
  // point.
  const sphere = Math.sqrt(Math.max(1e-6, 1 - u * u));
  const designed =
    u <= 0
      ? // Right: fuller than a sphere for most of the lobe, then rounding off.
        // Pushed further than this it stops being blunt and becomes a wall,
        // and the organ reads as a loaf.
        Math.pow(Math.max(0, 1 - Math.pow(-u, 2.8)), 0.4)
      : // Left: a steady taper to a tip that closes vertically, so the end is
        // rounded rather than a blade.
        Math.pow(Math.max(0, 1 - Math.pow(u, 2.0)), 0.55);
  const profile = Math.min(2.2, designed / sphere);
  v.y *= profile;
  v.z *= profile;

  const left = smoothstep(-0.25, 0.95, x);

  // The left lobe is about a quarter of the organ, not half of it. A sphere is
  // symmetric about its middle and a liver is not: the falciform groove sits
  // well to the left of centre, and the right lobe is the bulk.
  v.x -= 0.52 * left * left;

  // It is also thinner front-to-back than it is tall — it is a flap. Thinned
  // harder than this the segments carved out of it come out as slivers, and a
  // sliver renders as a fin with a notch in it rather than as a lobe.
  v.z *= 1 - 0.14 * left;

  // The superior surface is domed over the right lobe and falls away to the
  // left, which is what gives a liver its wedge profile from the front.
  v.y *= 1 - 0.36 * left * smoothstep(-0.1, 0.25, v.y);

  // Visceral (inferior) surface: flat, not round — but flattened *at* the
  // organ's own floor rather than by pulling the whole underside up to the
  // middle, which is what used to take half the height with it.
  //
  // **Blended, not switched.** Written as `if (v.y < threshold)` this leaves a
  // crease exactly where the condition flips, and the ripple below makes the
  // crease wander: the rendered inferior border came out as a ruffled band
  // running the length of the organ. A smoothstep has no such edge.
  const floor = -0.68 + 0.26 * left;
  v.y = lerp(v.y, floor, 0.55 * smoothstep(floor + 0.55, floor + 0.02, v.y));

  // Falciform ligament: the groove that divides segment IV from II and III.
  // It is **not** the division between the right and left liver — that is
  // Cantlie's line, well to the right of this, and the commonest mistake about
  // liver anatomy. The groove is on the surface; the division is a plane.
  const groove = Math.exp(-Math.pow((x - 0.24) / 0.11, 2)) * smoothstep(-0.15, 0.45, y);
  v.multiplyScalar(1 - 0.15 * groove);

  // Gallbladder fossa, on the underside of the right lobe. Faded in over the
  // lower half rather than switched on below a line, for the same reason.
  v.y +=
    0.18 *
    smoothstep(-0.12, -0.45, v.y) *
    bump(x, z, { atY: GALLBLADDER_FOSSA[0], atZ: GALLBLADDER_FOSSA[1], spreadY: 0.3, spreadZ: 0.34 });

  v.multiplyScalar(1 + 0.011 * ripple(x, y, z, 2.7, 0.9));

  // Sit the organ where the repository's midline convention expects it.
  //
  // The left lobe was shortened above, which moved the whole organ leftwards
  // about the sphere's centre — and with it the falciform groove and Cantlie's
  // line, until the left-medial segments straddled x = 0 and IVa read as right
  // liver. This is a translation of everything, so the anatomical frame, the
  // carve and the volume shares are untouched: it moves where the liver is,
  // not what it is.
  v.x += MIDLINE_SHIFT;
}

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
 * The liver, its segments, and optionally its hepatic veins and portal pedicles.
 *
 * `vessels` is **opt-in**, for the same reason the lung's tree is. Four scenes
 * already drew this liver and three of them draw vessels of their own: portal
 * hypertension and the hepatorenal scene both build a portal tree whose calibre
 * and visibility are solved from the disease state, and `liver-portal-flow`
 * draws its own trunk with a flow stream along it. Defaulting these on put a
 * second, fixed portal tree inside the same liver as the modelled one — in the
 * two scenes whose entire subject is what the portal pressure does to it.
 *
 * Which of the two trees owns the portal vein, the portal branches, the hepatic
 * vein and the cava — the four structures both build — is written once, in
 * `organs/portalVasculature.js`. Short version: that file owns the solved
 * circulation, this one owns the anatomy, and no scene may draw both.
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
  vessels = false,
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
    const geometry = carvePart({
      field,
      centre: segmentCentre,
      planes,
      detail,
      // The field is fixed by how densely the liver's surface was sampled;
      // everything else the carve depends on is folded in by `carvePart`.
      cacheKey: `liver:${referenceSamples}`,
    });
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
      /**
       * The distance field this segment was cut out of — the whole liver.
       * Carried so the solid a segment is a piece of can be reconstructed from
       * the segment, which is what checking a partition needs.
       */
      field,
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
      /**
       * The floor of the gallbladder fossa, measured on the parenchyma.
       *
       * A scene hangs the gallbladder here rather than at a coordinate of its
       * own, so the two stay together whatever the liver's shape is.
       */
      gallbladderFossa: undersideAt(
        segments,
        (GALLBLADDER_FOSSA[0] + MIDLINE_SHIFT) * LIVER_SCALE[0],
        GALLBLADDER_FOSSA[1] * LIVER_SCALE[2]
      ),
      cava: frame.toLocal(CAVA).add(new THREE.Vector3(0, 0.55, -0.4)),
      // Derived from the plane it names rather than typed beside it. Written by
      // hand at x 0.35 it was nearest segment VIII — the right anterior
      // superior segment, on the far side of Cantlie's line from the ligament.
      //
      // Its height is derived too, and for the same kind of reason: written as
      // a fixed 0.75 above the plane it ended up *inside* the organ the moment
      // the liver was given its proper height, which is a label buried in the
      // thing it points at. `domeAbove` measures where the superior surface
      // actually is at the ligament and clears it.
      falciform: domeAbove(segments, frame.toLocal(PLANES.falciform.through), 0.3).add(
        new THREE.Vector3(0, 0, 0.35)
      ),
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
 * A point clear of the superior surface, above a place on the organ.
 *
 * For anchoring a label to a landmark whose height is a consequence of the
 * shape rather than a number of its own: the falciform ligament runs over the
 * dome, and where the dome is depends on how tall the liver is drawn.
 *
 * @param {Array<{geometry: THREE.BufferGeometry}>} parts the parenchyma
 * @param {THREE.Vector3} at a point in the liver's own coordinates
 * @param {number} clearance how far above the surface to sit
 */
function domeAbove(parts, at, clearance) {
  const vertex = new THREE.Vector3();
  let top = at.y;
  for (const part of parts) {
    const position = part.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      // A column around the landmark, not the whole organ: the dome over the
      // ligament is lower than the dome over the right lobe.
      if (Math.abs(vertex.x - at.x) > 0.28) continue;
      if (vertex.y > top) top = vertex.y;
    }
  }
  return new THREE.Vector3(at.x, top + clearance, at.z);
}

/**
 * The lowest point of the parenchyma near a place on it.
 *
 * The counterpart of `domeAbove`, for something that hangs underneath rather
 * than sits on top.
 *
 * @param {Array<{geometry: THREE.BufferGeometry}>} parts
 * @param {number} x
 * @param {number} z
 */
function undersideAt(parts, x, z) {
  const vertex = new THREE.Vector3();
  let bottom = Infinity;
  for (const part of parts) {
    const position = part.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      if (Math.abs(vertex.x - x) > 0.3 || Math.abs(vertex.z - z) > 0.3) continue;
      if (vertex.y < bottom) bottom = vertex.y;
    }
  }
  return new THREE.Vector3(x, Number.isFinite(bottom) ? bottom : 0, z);
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
