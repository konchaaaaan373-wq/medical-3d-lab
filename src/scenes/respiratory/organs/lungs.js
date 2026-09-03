import * as THREE from 'three';
import { bump, flattenSide, ripple, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';
import {
  carveInside,
  carvePart,
  nearestSite,
  partCentroid,
  radialClamp,
  radialSurface,
  planeThrough,
  radialField,
  surfaceSamples,
} from '../../shared/geometry/carve.js';
import {
  FISSURES,
  HILUM,
  LOBES,
  SEGMENTS,
  SIDES,
  anatomicalFrame,
  lobesOfSide,
  segmentsOfLobe,
  segmentsOfSide,
} from './lungAnatomy.js';

/**
 * The lungs, as anatomy rather than as a silhouette.
 *
 * **NAMED STRUCTURE, SCHEMATIC SHAPE.** What is right here is the structure:
 * three lobes on the right and two on the left, cut apart by an oblique fissure
 * on both sides and a horizontal fissure on the right; each lobe carrying the
 * bronchopulmonary segments it actually carries, named and in the arrangement
 * their names describe; a bronchial tree that divides trachea → main → lobar →
 * segmental; an artery running with every bronchus and veins running *between*
 * the segments rather than with them; and a hilum whose structures sit in the
 * order each side puts them in. Every one of those is a claim, and every one is
 * fixed by a test in `tests/lung-anatomy.test.js`.
 *
 * What is **not** right is any individual dimension. The outer shape is still
 * built from the features that make a lung recognisable rather than from a
 * scan, the fissures are flat where real ones are curved and often incomplete,
 * and the segment boundaries are a distance rule rather than a dissection. The
 * lobar volume fractions were calibrated to roughly 35 / 12 / 53 on the right
 * and half and half on the left, which makes them a target this repository hit
 * rather than a measurement it made — and the target itself is uncited, being
 * the approximate shares taught with the lobes rather than figures read out of
 * a series. `docs/medical-notes.md` records that gap.
 *
 * The lobes are **separate closed meshes whose union is the lung**, not grooves
 * scratched into one surface, which is what lets one be hidden, moved, coloured
 * or measured on its own. How they are cut is `shared/geometry/carve.js`; what
 * is cut and what everything is called is `lungAnatomy.js`.
 *
 * This file knows nothing about breathing, asthma or oedema — a disease scene
 * builds the same lungs and changes what it does with them.
 */

/**
 * @param {{ medial?: 1|-1, cardiacNotch?: boolean }} options
 *   `medial` is the sign of the side the mediastinal surface faces in the
 *   *unwarped* sphere's x — the opposite of the anatomical `lateralX`, which is
 *   why the two are never used interchangeably.
 * @returns {(v: THREE.Vector3) => void}
 */
export function lungWarp({ medial = 1, cardiacNotch = false }) {
  return (v) => {
    const seedX = v.x;
    const seedY = v.y;
    const seedZ = v.z;

    // Apex narrows to a rounded point; the lower half spreads instead, so the
    // lung ends in a broad base rather than in a second point.
    const taper = 1 - 0.62 * Math.pow(Math.max(0, seedY), 1.5) + 0.26 * Math.pow(Math.max(0, -seedY), 1.4);
    v.x *= taper;
    v.z *= taper;

    // Diaphragmatic surface: scooped upwards in the middle, not a round bottom.
    const low = smoothstep(-0.35, -1, seedY);
    const rho = Math.min(1, Math.hypot(v.x, v.z));
    v.y += 0.62 * low * (1 - rho * rho * 0.85);

    // Mediastinal surface: flat where the lung meets the middle of the chest.
    flattenSide(v, { sign: medial, edge: 0.3, strength: 0.55 });

    // Hilum: where the bronchus and vessels enter, pressed into that flat face.
    if (v.x * medial < 0) {
      v.x += medial * 0.24 * bump(seedY, seedZ, { atY: 0.08, atZ: -0.18, spreadY: 0.3, spreadZ: 0.36 });
    }

    // Cardiac notch: the left lung gives way to the heart, anteriorly and low.
    if (cardiacNotch && v.x * medial < 0.15) {
      v.x += medial * 0.58 * bump(seedY, seedZ, { atY: -0.3, atZ: 0.52, spreadY: 0.46, spreadZ: 0.46 });
    }

    // Enough surface irregularity that it does not look injection-moulded.
    v.multiplyScalar(1 + 0.018 * ripple(seedX, seedY, seedZ, 3.1, 1.4));
  };
}

/**
 * How each side is built, before anything is cut out of it.
 *
 * The fissures are **not** here any more. They used to be shallow grooves in
 * this warp, which made a lung that looked lobed and had no lobes in it: there
 * was nothing to hide, nothing to colour, and nothing whose volume could be
 * asked for. They are planes now, in `lungAnatomy.js`, and they cut.
 */
export const SIDE_SHAPE = {
  right: { scale: [0.92, 1.85, 1.0], warp: { medial: -1 }, at: [-1.24, 0.3, 0] },
  left: { scale: [0.86, 1.9, 0.98], warp: { medial: 1, cardiacNotch: true }, at: [1.24, 0.3, 0] },
};

/**
 * Where the sample regions sit inside one lung, in the lung's own normalised
 * coordinates. Kept for the scenes that model the lung as a set of
 * compartments and need somewhere to put them; the segments below are the
 * anatomical division, and these are not it.
 */
const REGION_SITES = [
  [0.0, 0.62, 0.1],
  [0.34, 0.2, 0.3],
  [-0.3, 0.16, -0.28],
  [0.18, -0.26, -0.1],
  [-0.24, -0.5, 0.24],
  [0.1, -0.78, -0.06],
];

/** Distinct enough that five lobes can be told apart, muted enough to be tissue. */
export const LOBE_COLORS = {
  'right-upper': '#d98d95',
  'right-middle': '#c9737f',
  'right-lower': '#b9636f',
  'left-upper': '#d98d95',
  'left-lower': '#b9636f',
};

/**
 * The four hilar structures, placed **on** the mediastinal surface.
 *
 * `HILUM` says where the hilum is and how the structures are arranged around
 * it — RALS — as fractions of the lung's extents. Fractions of the extents put
 * a point on an ellipsoid, and a lung is not one: written that way, seven of
 * the eight points sat outside the pleura, so every vessel at the hilum poked
 * visibly through the lung surface in the rendered scene while every unit test
 * passed. The declaration supplies the direction and the arrangement; the
 * surface supplies the distance.
 *
 * @param {ReturnType<typeof radialField>} field
 * @param {ReturnType<typeof anatomicalFrame>} frame
 * @param {'right' | 'left'} side
 */
function hilumOf(field, frame, side) {
  const at = frame.toLocal(HILUM.at);
  const arrangement = HILUM[side];
  const place = (key) =>
    radialSurface(
      field,
      at.clone().add(
        new THREE.Vector3(
          arrangement[key][0] * frame.lateralX * frame.half.x,
          arrangement[key][1] * frame.half.y,
          arrangement[key][2] * frame.half.z
        )
      ),
      { inset: HILUM_INSET }
    );
  return {
    bronchus: place('bronchus'),
    artery: place('artery'),
    superiorVein: place('superiorVein'),
    inferiorVein: place('inferiorVein'),
  };
}

/**
 * How far inside the pleura a segment's centre is kept, in lung units.
 *
 * A segmental bronchus ends at its segment's centre and is drawn with a radius
 * that tapers to about 0.032, so the margin has to cover the tube as well as
 * the point. 0.18 in a lung 2.9 long clears it and still leaves the three
 * corrected segments recognisably where they belong.
 */
const SEGMENT_MARGIN = 0.18;

/**
 * How far inside the pleura the hilar structures are brought.
 *
 * They belong *on* the mediastinal surface, so this is small — it exists only
 * because the lung is scaled about the hilum, which means deflating draws the
 * surface inward past a point that is exactly on it.
 */
const HILUM_INSET = 0.06;

/**
 * Both lungs, with their lobes, segments, airways and vessels.
 *
 * `bronchi` and `vessels` are **opt-in**. A lung has a bronchial tree, but three
 * scenes were already drawing this organ and two of them build their own
 * `buildAirway`: defaulting the tree on gave COPD and `breathing-lungs` a
 * second trachea at a different position and colour, and gave all three a
 * pulmonary vascular tree nothing in them models — visible at a glance, and
 * missed here because the render was checked by counting meshes instead of by
 * looking at it. A caller that wants the tree says so.
 *
 * @param {{ color?: string, detail?: number, opacity?: number, excursion?: number,
 *           lobeColors?: Record<string, string>, referenceSamples?: number,
 *           bronchi?: boolean, vessels?: boolean }} [options]
 */
export function buildLungs({
  color = '#d98d95',
  /**
   * How finely each lobe is tessellated.
   *
   * Higher than a smooth surface would need, because of the *cut* faces rather
   * than the curved ones: each vertex independently takes whichever comes
   * first, the lung's surface or the fissure, so the rim between them zigzags
   * at the spacing of the tessellation. At detail 6 that zigzag was plainly
   * visible along every fissure. Raising it is nearly free here — the cost of
   * building a lung is dominated by sampling the surface once, not by carving
   * five parts out of it.
   */
  detail = 12,
  opacity = 1,
  excursion = 1,
  lobeColors = LOBE_COLORS,
  /**
   * How densely the outer surface is sampled to build the field the lobes are
   * cut from. Not the detail of the drawn meshes — the resolution of the shape
   * they are cut out of.
   */
  referenceSamples = 24000,
  bronchi = false,
  vessels = false,
} = {}) {
  const object = new THREE.Group();
  object.name = 'lungs';

  const material = tissueMaterial({ color, roughness: 0.62, emissiveIntensity: 0.06, opacity });
  const disposables = [];
  const lobes = [];
  const segments = [];
  const sides = {};

  for (const side of ['right', 'left']) {
    const shape = SIDE_SHAPE[side];
    const warp = lungWarp(shape.warp);

    // The surface the lobes are cut out of, as points. No mesh: welding a
    // reference dense enough to carve from cost more than every other step of
    // building this organ put together, for a table that never looks at which
    // vertices were shared.
    const samples = surfaceSamples(warp, shape.scale, referenceSamples);
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    for (let i = 0; i < samples.length; i += 3) {
      bounds.expandByPoint(point.set(samples[i], samples[i + 1], samples[i + 2]));
    }
    const centre = bounds.getCenter(new THREE.Vector3());
    const field = radialField(samples, centre);
    const frame = anatomicalFrame(side, bounds);

    const group = new THREE.Group();
    group.name = `${side}-lung`;
    group.position.set(...shape.at);

    /** A fissure as a cutting plane: the normal points at what is discarded. */
    const cutFor = ({ fissure, keepAbove }) => {
      const definition = FISSURES[fissure];
      const normal = frame.toLocalNormal(definition.normal);
      const through = frame.toLocal(definition.through[side]);
      return planeThrough(through, keepAbove ? normal.negate() : normal);
    };

    // A segment's declared position is normalised in the anatomical frame, so
    // multiplying it by the half-extents places it on an ellipsoid rather than
    // in the lung. Where the lung tapers — the apex, the posterior segments —
    // that lands outside the surface: RS2, LS1+2 and LS6 all did, so their
    // bronchi ended in mid-air and they seeded the segment partition from
    // outside the solid they were partitioning. Kept inside by a margin wide
    // enough that the segmental bronchus stops short of the pleura.
    const sideSegments = segmentsOfSide(side).map((segment) => ({
      ...segment,
      position: radialClamp(field, frame.toLocal(segment.at), { margin: SEGMENT_MARGIN }),
    }));

    for (const lobe of lobesOfSide(side)) {
      const planes = lobe.bounded.map(cutFor);
      // The centre is found rather than written down. A carve is star-shaped
      // about its centre, so a centre outside its own lobe does not make a
      // smaller lobe — it makes a different solid, and the right middle lobe's
      // hand-written one was outside its own horizontal fissure.
      const found = partCentroid({ field, bounds, planes, samples: 6000, seed: side === 'right' ? 11 : 13 });
      const lobeCentre = found ? found.centroid : frame.toLocal(lobe.centre);
      const geometry = carvePart({
        field,
        centre: lobeCentre,
        planes,
        detail,
        // The field is fixed by the side and how densely its surface was
        // sampled; everything else the carve depends on is folded in by
        // `carvePart` itself.
        cacheKey: `lung:${side}:${referenceSamples}`,
      });

      const lobeSegments = segmentsOfLobe(lobe.id).map((segment) =>
        sideSegments.find((entry) => entry.id === segment.id)
      );
      paintSegments(geometry, lobeSegments);

      const lobeMaterial = material.clone();
      lobeMaterial.color.set(lobeColors[lobe.id] ?? color);
      const mesh = new THREE.Mesh(geometry, lobeMaterial);
      mesh.name = lobe.id;
      group.add(mesh);

      lobes.push({
        ...lobe,
        mesh,
        material: lobeMaterial,
        geometry,
        centre: lobeCentre.clone(),
        planes,
        /** Where this lobe's own bronchus has to arrive. */
        hilumSide: frame.toLocal(HILUM.at),
      });
      disposables.push(geometry, lobeMaterial);
      for (const segment of lobeSegments) segments.push(segment);
    }

    object.add(group);
    sides[side] = {
      group,
      frame,
      field,
      bounds,
      centre,
      segments: sideSegments,
      warp,
      scale: shape.scale,
      /**
       * Where each structure crosses the mediastinal surface, in this lung's
       * own coordinates — computed here rather than in the tree builder so the
       * point the lung is tethered at and the point its bronchus enters at are
       * the same point by construction, and so a lung built without a tree
       * still has a hilum to breathe about.
       */
      hilumAt: hilumOf(field, frame, side),
      /** Where the lung is tethered, in its own coordinates. */
      hilum: hilumOf(field, frame, side).bronchus,
    };
  }

  // --- airways and vessels -------------------------------------------------

  const tree =
    bronchi || vessels ? buildBronchovascular({ sides, lobes, bronchi, vessels }) : null;
  if (tree) {
    if (bronchi) object.add(tree.bronchi.object);
    if (vessels) object.add(tree.arteries.object, tree.veins.object);
    disposables.push(...tree.disposables);
  }

  // --- the interface the existing scenes already use -----------------------

  const rest = {
    right: sides.right.group.position.clone(),
    left: sides.left.group.position.clone(),
  };
  const baseOfGeometry = Math.min(
    ...lobes.filter((lobe) => lobe.side === 'right').map((lobe) => {
      lobe.geometry.computeBoundingBox();
      return lobe.geometry.boundingBox.min.y;
    })
  );
  let lowestPoint = rest.right.y + baseOfGeometry;

  const regions = [];
  for (const side of ['right', 'left']) {
    const { group, bounds } = sides[side];
    const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const centre = bounds.getCenter(new THREE.Vector3());
    REGION_SITES.forEach(([x, y, z], index) => {
      const mount = new THREE.Group();
      mount.name = `region-${side}-${index}`;
      mount.position.set(centre.x + x * half.x * 0.82, centre.y + y * half.y * 0.82, centre.z + z * half.z * 0.82);
      group.add(mount);
      regions.push({ side, index, object: mount });
    });
  }

  const segmentIndex = new Map(segments.map((segment) => [segment.id, segment]));

  return {
    object,
    material,
    /** Five closed meshes whose union is the parenchyma. */
    lobes,
    /** Eighteen named bronchopulmonary segments: ten right, eight left. */
    segments,
    segmentById: (id) => segmentIndex.get(id) ?? null,
    bronchi: tree?.bronchi ?? null,
    arteries: tree?.arteries ?? null,
    veins: tree?.veins ?? null,
    hilum: tree?.hilum ?? null,
    regions,
    anchors: {
      rightLung: new THREE.Vector3(-1.95, 0.9, 0.7),
      leftLung: new THREE.Vector3(1.95, 0.9, 0.7),
      base: new THREE.Vector3(0, -1.5, 0.9),
      hilum: new THREE.Vector3(-0.62, 0.45, -0.2),
      carina: new THREE.Vector3(0, 2.05, 0.5),
    },
    /**
     * Which segment a point in a lung's own coordinates belongs to.
     *
     * The definition, applied: the segment whose bronchus is nearest. Restricted
     * to one lobe, because a segment never crosses a fissure.
     *
     * @param {THREE.Vector3} point
     * @param {string} [lobeId]
     */
    segmentAt(point, lobeId) {
      const candidates = lobeId ? segments.filter((segment) => segment.lobe === lobeId) : segments;
      if (candidates.length === 0) return null;
      // The same rule the vertex colouring uses, from the same function, so the
      // colour a vertex is painted and the segment this call names cannot drift
      // apart.
      return candidates[nearestSite(point, candidates)];
    },
    /** @param {string} id @param {boolean} visible */
    setLobeVisible(id, visible) {
      const lobe = lobes.find((entry) => entry.id === id);
      if (lobe) lobe.mesh.visible = visible;
    },
    /**
     * Colour the parenchyma by segment instead of by lobe.
     *
     * The same geometry, read a second way: the vertex colours are baked at
     * build time, so this switches how the material reads them and moves
     * nothing. Two readings of one unmoved mesh.
     *
     * @param {boolean} enabled
     */
    setSegmentColoring(enabled) {
      for (const lobe of lobes) {
        lobe.material.vertexColors = Boolean(enabled);
        lobe.material.color.set(enabled ? '#ffffff' : lobeColors[lobe.id] ?? color);
        lobe.material.needsUpdate = true;
      }
    },
    /** Whether a point is inside this lung at all. */
    contains(side, point) {
      return carveInside(point, { field: sides[side].field });
    },
    /** How low the lung bases currently reach, for whatever sits under them. */
    baseY: () => lowestPoint,
    /**
     * Inflation, 0 at the shape the lung was modelled at and 1 at the top of
     * the modelled breath. A shape change and not a volume: the excursion is
     * larger than life so that a breath is legible, and it is presentation.
     */
    setInflation(value) {
      const v = Math.max(-0.4, Math.min(1, value));
      const sx = 1 + 0.07 * excursion * v;
      const sy = 1 + 0.13 * excursion * v;
      const sz = 1 + 0.09 * excursion * v;
      for (const side of ['right', 'left']) {
        const group = sides[side].group;
        const home = rest[side];
        const anchor = sides[side].hilum;
        group.scale.set(sx, sy, sz);
        // **Anchored at the hilum**, which is where a lung is actually tethered:
        // the bronchus and the vessels hold it there and it is the least mobile
        // part of it, while the base — sitting on the diaphragm — moves most.
        //
        // It used to scale about the group's origin and translate downwards,
        // which moved the hilum. That was survivable while the airways were a
        // separate static object and is not now that they are inside the lung:
        // the point where the main bronchus hands over to the lobar bronchi has
        // to be the one point that does not move.
        group.position.set(
          home.x + (1 - sx) * anchor.x,
          home.y + (1 - sy) * anchor.y,
          home.z + (1 - sz) * anchor.z
        );
      }
      for (const region of regions) region.object.scale.set(1 / sx, 1 / sy, 1 / sz);
      lowestPoint = rest.right.y + (1 - sy) * sides.right.hilum.y + baseOfGeometry * sy;
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
      material.dispose();
    },
  };
}

/**
 * Paint each vertex with the colour of the segment it falls in.
 *
 * Baked once rather than recomputed, and stored as a colour attribute so that
 * showing segments costs a material flag rather than a rebuild. Vertices on a
 * boundary take the nearer segment, so the seam is where the rule puts it and
 * not where the tessellation happens to fall.
 */
function paintSegments(geometry, lobeSegments) {
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  const palette = lobeSegments.map((segment, index) =>
    new THREE.Color().setHSL((index * 0.27 + 0.03) % 1, 0.46, 0.62)
  );
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    const colour = palette[nearestSite(point, lobeSegments)];
    colors[i * 3] = colour.r;
    colors[i * 3 + 1] = colour.g;
    colors[i * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Recorded on the geometry so a scene can ask which segment a vertex is in
  // without redoing the nearest-site search.
  geometry.userData.segmentIds = lobeSegments.map((segment) => segment.id);
}

/**
 * The airways and the vessels that run with them.
 *
 * Three claims are built in here rather than described:
 *
 * 1. **The right main bronchus is wider, shorter and steeper than the left**,
 *    which is why an inhaled object goes right.
 * 2. **An artery runs with every bronchus** — the bronchoarterial pair, the
 *    unit a segment is supplied by — and the two stay together all the way to
 *    the segment.
 * 3. **The veins do not.** They run *between* segments, and that is why a
 *    surgeon looking for the plane of a segmentectomy looks for the vein.
 *
 * And at the hilum, the arrangement everyone is taught to check: **RALS** —
 * on the right the artery is anterior to the bronchus, on the left it is
 * superior to it.
 */
/**
 * `bronchi` and `vessels` gate what is built, not only what is mounted.
 *
 * The intrapulmonary branches are parented to the lungs so they breathe with
 * them, which means they are on screen the moment the lung is — the two
 * top-level groups the caller chooses not to mount are the extrapulmonary part
 * only. Gating the mount alone left every lobar and segmental branch drawn for
 * a caller that asked for neither.
 */
function buildBronchovascular({ sides, lobes, bronchi = true, vessels = true }) {
  const disposables = [];
  const bronchusMaterial = tissueMaterial({ color: '#9fb0c8', roughness: 0.45, emissiveIntensity: 0.06 });
  const arteryMaterial = tissueMaterial({ color: '#7f9fd6', roughness: 0.4, emissiveIntensity: 0.05 });
  const veinMaterial = tissueMaterial({ color: '#c96a7a', roughness: 0.4, emissiveIntensity: 0.05 });
  disposables.push(bronchusMaterial, arteryMaterial, veinMaterial);

  const bronchiGroup = new THREE.Group();
  bronchiGroup.name = 'bronchial-tree';
  const arteryGroup = new THREE.Group();
  arteryGroup.name = 'pulmonary-arteries';
  const veinGroup = new THREE.Group();
  veinGroup.name = 'pulmonary-veins';

  // One registry per tree, holding every branch of it wherever it is parented.
  // A tree is split across two parents — the part outside the lung is tethered
  // at the hilum and the part inside it breathes — so the group alone is no
  // longer the whole tree, and a caller that walked the group would silently
  // miss everything intrapulmonary. `mesh` is carried so a caller can take a
  // curve point into world space through `mesh.matrixWorld`; `curve` is in the
  // coordinates of whatever the branch is parented to.
  const branches = { bronchi: [], arteries: [], veins: [] };
  /**
   * A tube. `group` decides whether it breathes: anything added to a side's own
   * group inherits that lung's inflation, and anything added to the top-level
   * groups does not.
   */
  /** Whether this tree was asked for at all. */
  const wanted = { bronchi, arteries: vessels, veins: vessels };
  const tube = (tree, group, material, name, points, radius) => {
    if (!wanted[tree]) return null;
    const curve = smoothCurve(points.map((p) => [p.x, p.y, p.z]));
    const surface = new TubeSurface(curve, { radius, steps: 24, radial: 10 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    group.add(mesh);
    disposables.push(surface);
    branches[tree].push({ name, curve, surface, mesh });
    return { curve, surface, mesh };
  };

  // --- trachea and carina ---------------------------------------------------
  //
  // A little to the **right** of the midline, which is where the lower trachea
  // sits: the aortic arch pushes it that way. It is also what makes the right
  // main bronchus the shorter and the more vertical of the two — the fact
  // behind an inhaled object going right, and behind aspiration pneumonia
  // being a right-sided disease.
  //
  // In life the difference is larger still, roughly 2.5 cm against 5 cm, and
  // most of that comes from the heart occupying the left mediastinum and
  // pushing the left hilum further out. These two lungs are placed
  // symmetrically, so that displacement is not in the model and the ratio here
  // comes out at about 1 : 1.13 rather than 1 : 2. The **ordering** is the
  // claim; the ratio is understated, and `docs/medical-notes.md` says so.
  const carina = new THREE.Vector3(-0.15, 2.05, 0);
  tube(
    'bronchi',
    bronchiGroup,
    bronchusMaterial,
    'trachea',
    [new THREE.Vector3(0, 3.4, 0), new THREE.Vector3(0, 2.7, 0), carina],
    () => 0.17
  );

  const hilum = {};
  for (const side of ['right', 'left']) {
    const { group, frame, hilumAt } = sides[side];
    const world = (local) => local.clone().add(group.position);

    // Everything inside the lung is parented to the lung, so that it moves when
    // the lung does. Built in the side group's own coordinates rather than in
    // world ones — the whole tree used to sit in the top-level group with world
    // positions baked in at the rest pose, so inflating the lungs moved the
    // parenchyma a quarter of a unit and left every airway and vessel exactly
    // where it was. Failure mode G, and three scenes animate this every frame.
    const innerBronchi = new THREE.Group();
    innerBronchi.name = `${side}-intrapulmonary-bronchi`;
    const innerArteries = new THREE.Group();
    innerArteries.name = `${side}-intrapulmonary-arteries`;
    const innerVeins = new THREE.Group();
    innerVeins.name = `${side}-intrapulmonary-veins`;
    group.add(innerBronchi, innerArteries, innerVeins);

    // The hilum, and the order the structures cross it — RALS, stated once in
    // `lungAnatomy.js` and landed on the mediastinal surface by `hilumOf`.
    hilum[side] = {
      bronchus: world(hilumAt.bronchus),
      artery: world(hilumAt.artery),
      superiorVein: world(hilumAt.superiorVein),
      inferiorVein: world(hilumAt.inferiorVein),
    };

    // --- main bronchus -----------------------------------------------------
    // The right is shorter, wider and set at a steeper angle to the trachea.
    const main = hilum[side].bronchus;
    const wide = side === 'right';
    tube(
      'bronchi',
      bronchiGroup,
      bronchusMaterial,
      `${side}-main-bronchus`,
      [carina, carina.clone().lerp(main, wide ? 0.5 : 0.45).add(new THREE.Vector3(0, wide ? -0.1 : 0.02, 0)), main],
      () => (wide ? 0.125 : 0.1)
    );
    // The artery arrives beside it, from the pulmonary trunk.
    const arteryHilum = hilum[side].artery;
    tube(
      'arteries',
      arteryGroup,
      arteryMaterial,
      `${side}-pulmonary-artery`,
      [
        new THREE.Vector3(0, 1.55, 0.42),
        new THREE.Vector3(arteryHilum.x * 0.45, 1.72, 0.34),
        arteryHilum,
      ],
      () => 0.11
    );

    // In the lung's own coordinates from here down, because everything below is
    // inside the lung and has to breathe with it. The same four points as the
    // world ones above, before the side group's offset — not a second
    // derivation of them, which is how the two used to disagree.
    const localAt = hilumAt.bronchus;
    const localArtery = hilumAt.artery;
    const localVein = (key) => hilumAt[key];

    for (const lobe of lobes.filter((entry) => entry.side === side)) {
      const lobeCentre = lobe.centre.clone();
      const lobeBronchusEnd = localAt.clone().lerp(lobeCentre, 0.55);
      tube(
        'bronchi',
        innerBronchi,
        bronchusMaterial,
        `${lobe.id}-lobar-bronchus`,
        [localAt, localAt.clone().lerp(lobeBronchusEnd, 0.5), lobeBronchusEnd],
        (u) => 0.082 - 0.018 * u
      );
      tube(
        'arteries',
        innerArteries,
        arteryMaterial,
        `${lobe.id}-lobar-artery`,
        [
          localArtery,
          localArtery.clone().lerp(lobeBronchusEnd, 0.5).add(pairOffset(side, 0.5)),
          lobeBronchusEnd.clone().add(pairOffset(side, 1)),
        ],
        (u) => 0.07 - 0.016 * u
      );

      const lobeSegments = sides[side].segments.filter((segment) => segment.lobe === lobe.id);
      for (const segment of lobeSegments) {
        const tip = segment.position.clone();
        segment.bronchusTip = world(segment.position);
        tube(
          'bronchi',
          innerBronchi,
          bronchusMaterial,
          `${segment.id}-segmental-bronchus`,
          [lobeBronchusEnd, lobeBronchusEnd.clone().lerp(tip, 0.55), tip],
          (u) => 0.05 - 0.018 * u
        );
        // The artery that goes with it. Offset by a fixed distance so the pair
        // reads as a pair rather than as one vessel drawn twice.
        tube(
          'arteries',
          innerArteries,
          arteryMaterial,
          `${segment.id}-segmental-artery`,
          [
            lobeBronchusEnd.clone().add(pairOffset(side, 1)),
            lobeBronchusEnd.clone().lerp(tip, 0.55).add(pairOffset(side, 1)),
            tip.clone().add(pairOffset(side, 1)),
          ],
          (u) => 0.042 - 0.016 * u
        );
      }

      // --- the veins, running between the segments --------------------------
      //
      // Not with the bronchi. Each tributary starts at the midpoint between two
      // neighbouring segments — the intersegmental plane — and runs back to the
      // vein that drains this part of the lung.
      const draining = lobe.id.includes('lower') ? 'inferiorVein' : 'superiorVein';
      const target = localVein(draining);
      // Neighbouring segments, taken as **unordered** pairs around the cycle.
      // With `(i + 1) % n` alone a two-segment lobe pairs 0 with 1 and then 1
      // with 0, which is the same plane: the right middle lobe drew its one
      // tributary twice, in the same place, and two translucent tubes in one
      // place composite to something darker than either.
      const pairs = [];
      const seen = new Set();
      for (let i = 0; i < lobeSegments.length; i++) {
        const j = (i + 1) % lobeSegments.length;
        if (i === j) continue;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push([i, j]);
      }
      for (const [index, [first, second]] of pairs.entries()) {
        const i = index;
        const a = lobeSegments[first].position.clone();
        const b = lobeSegments[second].position.clone();
        const between = a.clone().lerp(b, 0.5);
        tube(
          'veins',
          innerVeins,
          veinMaterial,
          `${lobe.id}-intersegmental-vein-${i}`,
          [between, between.clone().lerp(target, 0.5), target],
          (u) => 0.03 + 0.028 * u
        );
      }
    }

    // The two pulmonary veins leaving the hilum for the left atrium.
    for (const key of ['superiorVein', 'inferiorVein']) {
      tube(
        'veins',
        veinGroup,
        veinMaterial,
        `${side}-${key === 'superiorVein' ? 'superior' : 'inferior'}-pulmonary-vein`,
        [hilum[side][key], hilum[side][key].clone().lerp(new THREE.Vector3(0, 1.2, 0.3), 0.55), new THREE.Vector3(0, 1.2, 0.3)],
        () => 0.075
      );
    }
  }

  // `object` is the extrapulmonary part of each tree, which mounts at the scene
  // root and stays put; the intrapulmonary part is parented to the lungs so it
  // breathes with them. `branches` is the tree entire, either way.
  return {
    bronchi: { object: bronchiGroup, material: bronchusMaterial, branches: branches.bronchi },
    arteries: { object: arteryGroup, material: arteryMaterial, branches: branches.arteries },
    veins: { object: veinGroup, material: veinMaterial, branches: branches.veins },
    hilum,
    disposables,
  };
}

/**
 * How far an artery sits from the bronchus it runs with.
 *
 * A presentation offset: the two are drawn side by side so the pair is legible,
 * and in life they are wrapped in one sheath and touching. It is not a distance
 * between anything.
 */
function pairOffset(side, scale) {
  const lateral = SIDES[side].lateralX;
  return new THREE.Vector3(0.055 * lateral * scale, 0.02 * scale, 0.055 * scale);
}

export { FISSURES, LOBES, SEGMENTS, HILUM } from './lungAnatomy.js';
