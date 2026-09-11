import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The knee: the bones, what covers their articular surfaces, and what holds
 * them together.
 *
 * The first joint in this repository. `bone.js` and `muscle.js` draw one bone
 * and one muscle as tissue; a joint is a different subject — it is a set of
 * **relations**, and every question asked about a knee is a question about one
 * of them. Which ligament stops which movement, which structure is between the
 * two bones, which tendon crosses the front.
 *
 * ## A right knee, from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right knee the **medial** side is +x and the **lateral** side is −x, and
 * the fibula is on the lateral one. Every side in this file is derived from
 * `MEDIAL` rather than from a sign somebody remembered.
 *
 * ## The notch is the gap, and it is only behind
 *
 * The two femoral condyles are separate solids, and the space between them is
 * the intercondylar notch — which is not drawn as a structure because it is not
 * one: it is where the cruciates are. Both run in it, which is why they are
 * where they are and why a notch too narrow is a thing that matters.
 *
 * In *front* the two run together into one surface, and the patella slides in
 * the groove between them. Drawing the gap the whole way through — which is
 * what the first version of this file did — makes a distal femur read as two
 * balls on a stick, and puts a hole where the trochlea is.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Every shape here is simplified to the
 * point where the relation reads. **No length, angle, thickness or attachment
 * footprint is a measurement**, and nothing here moves: the joint is drawn at
 * one position, in extension.
 */

/** Which way medial is, in a right knee seen from in front. */
export const MEDIAL = 1;

/** The joint line — everything above it is femur, below it tibia. */
export const JOINT_LINE_Y = 0;

/** Where the two condyles sit, and how far apart the notch puts them. */
export const CONDYLE_SITES = Object.freeze({
  medial: [MEDIAL * 0.37, 0.36, -0.12],
  lateral: [-MEDIAL * 0.37, 0.36, -0.08],
});

/** Where the two halves of the tibial table sit. */
export const PLATEAU_SITES = Object.freeze({
  medial: [MEDIAL * 0.44, -0.3, -0.02],
  lateral: [-MEDIAL * 0.44, -0.3, -0.02],
});

/** The attachment points the ligaments are drawn between. */
export const ATTACHMENTS = Object.freeze({
  /** ACL: back of the lateral condyle's inner wall to the front of the tibia. */
  aclFemoral: [-MEDIAL * 0.18, 0.62, -0.5],
  aclTibial: [MEDIAL * 0.05, -0.16, 0.28],
  /** PCL: front of the medial condyle's inner wall to the back of the tibia. */
  pclFemoral: [MEDIAL * 0.18, 0.56, -0.16],
  pclTibial: [-MEDIAL * 0.04, -0.2, -0.5],
  /** The collaterals, on the outside of each side — sunk into the bone at both
   *  ends, because a ligament that stops at the surface floats beside it. */
  mclFemoral: [MEDIAL * 0.84, 0.5, -0.04],
  mclTibial: [MEDIAL * 0.64, -1.3, 0],
  lclFemoral: [-MEDIAL * 0.84, 0.5, -0.08],
  lclTibial: [-MEDIAL * 0.8, -0.62, -0.12],
  /** The extensor mechanism, crossing the front. */
  quadriceps: [0, 2.0, 0.36],
  patellaTop: [0, 0.8, 0.64],
  patellaBottom: [0, 0.1, 0.64],
  tibialTuberosity: [0, -0.86, 0.42],
});

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildKneeJoint({ colors = {}, opacity = 1, detail = 5 } = {}) {
  const object = new THREE.Group();
  object.name = 'knee-joint';
  const disposables = [];
  const index = new Map();
  const point = (id) => new THREE.Vector3(...ATTACHMENTS[id]);

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const bone = (id, geometry, position, color = '#ece7d8') => {
    const material = mineralMaterial({ color: colors[id] ?? color, roughness: 0.68 });
    disposables.push(geometry, material);
    const mesh = add(id, new THREE.Mesh(geometry, material));
    if (position) mesh.position.set(...position);
    return mesh;
  };

  /**
   * A cord between named points.
   *
   * `flatten` squeezes the finished tube towards its own middle in x. A
   * collateral ligament is a flat band against the side of the joint, and a
   * round rod of the same width reads as a dowel somebody glued on. Scaling
   * about the tube's own centre rather than the origin is what keeps the band
   * where it was put.
   */
  const cord = (id, points, radius, color, cordOpacity = opacity, material = wallMaterial, flatten = 1) => {
    const curve = smoothCurve(points);
    const surface = new TubeSurface(curve, {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps: 40,
      radial: 12,
    });
    if (flatten !== 1) {
      surface.geometry.computeBoundingBox();
      const middle = surface.geometry.boundingBox.getCenter(new THREE.Vector3()).x;
      surface.geometry.translate(-middle, 0, 0);
      surface.geometry.scale(flatten, 1, 1);
      surface.geometry.translate(middle, 0, 0);
      surface.geometry.computeVertexNormals();
    }
    const built = material({ color: colors[id] ?? color, opacity: cordOpacity });
    disposables.push(surface, built);
    const mesh = add(id, new THREE.Mesh(surface.geometry, built));
    return { mesh, curve };
  };

  // --- the bones ------------------------------------------------------------
  //
  // The shaft is narrow and the condyles are wide: a femur flares at the end it
  // articulates with. It stops inside them rather than above them, so the two
  // read as one bone and not as a ball on a stick.
  const shaftSurface = new TubeSurface(
    smoothCurve([
      [0, 2.62, 0.02],
      [0, 1.9, 0],
      [0, 1.2, -0.03],
      [0, 0.62, -0.06],
    ]),
    { radius: (u) => 0.29 + 0.23 * smoothstep(0.45, 1, u), steps: 32, radial: 20 }
  );
  const shaftMaterial = mineralMaterial({ color: colors['femoral-shaft'] ?? '#ece7d8', roughness: 0.68 });
  disposables.push(shaftSurface, shaftMaterial);
  add('femoral-shaft', new THREE.Mesh(shaftSurface.geometry, shaftMaterial));

  /**
   * Square a sphere's cross-section up into a roller.
   *
   * A condyle is a drum, not a ball, and a ball is what a warped sphere stays
   * unless something pushes its profile out to the rim. Raising the radius of
   * the cross-section perpendicular to `axis` to a power below one does that:
   * the surface keeps its rounded edges and gains a straight side.
   */
  const asRoller = (v, axis, power) => {
    const [a, b] = axis === 'x' ? ['y', 'z'] : ['x', 'z'];
    const radius = Math.hypot(v[a], v[b]);
    if (radius < 1e-6) return;
    const spread = Math.pow(radius, power) / radius;
    v[a] *= spread;
    v[b] *= spread;
  };

  /**
   * The articular aspect of a condyle: distal and posterior, and *not* the
   * front of the shaft above it. `inflate` lifts only that part of the surface,
   * so the cartilage layer is a glaze on the joint rather than a coat of paint
   * over the whole bone — which is what hid every condyle the first time.
   */
  const articularOnCondyle = (v) => Math.max(smoothstep(0.55, -0.2, v.y), smoothstep(0.1, -0.8, v.z));

  /** A femoral condyle: a roller, deeper behind than in front. */
  const condyleGeometry = (sign, inflate = 0) =>
    shapedSphere({
      detail: 6,
      scale: [0.44, 0.62, 0.66],
      warp: (v) => {
        asRoller(v, 'x', 0.55);
        const inward = -v.x * sign;
        if (inward > 0) {
          // Flattened towards the notch — and the notch is behind.
          const behind = smoothstep(0.18, -0.45, v.z);
          v.x += sign * 0.52 * inward * behind * Math.exp(-Math.pow(v.y / 0.95, 2));
          // In front it is the other way about: each condyle reaches across the
          // midline, the two overlap into one mass, and that mass is the
          // trochlea. Without this the femur ends in two balloons with a hole
          // between them and the patella sitting in the hole.
          const anterior = smoothstep(-0.1, 0.5, v.z);
          v.x -= sign * 0.38 * inward * anterior;
          // The groove down the middle of that surface — a dip, not a gap.
          v.z -= 0.16 * smoothstep(0.3, 1, inward) * smoothstep(0.05, 0.8, v.z);
        }
        // The articular surface curls further round behind than in front.
        v.z -= 0.1 * smoothstep(0, -1, v.z);
        // Where the layer is not articular it is pulled *inside* the bone, not
        // left level with it: two surfaces at the same place fight for pixels
        // and the translucent one wins, which paints the whole bone blue.
        if (inflate) v.multiplyScalar(1 + inflate * articularOnCondyle(v) - 0.04 * (1 - articularOnCondyle(v)));
      },
    });
  bone('medial-femoral-condyle', condyleGeometry(MEDIAL), CONDYLE_SITES.medial, '#e6e0cd');
  bone('lateral-femoral-condyle', condyleGeometry(-MEDIAL), CONDYLE_SITES.lateral, '#e6e0cd');

  // The tibial plateau: a flat table on top of the shaft, in two halves. The
  // eminence between them is where the cruciates and the menisci attach.
  const plateauGeometry = (sign, inflate = 0) =>
    shapedSphere({
      detail: 5,
      scale: [0.46, 0.24, 0.62],
      warp: (v) => {
        // A table, not a saucer: the sides are straight and the top is flat.
        asRoller(v, 'y', 0.5);
        v.y *= 1 - 0.45 * smoothstep(0.1, 1, v.y);
        // Rising towards the midline, where the intercondylar eminence is.
        const inward = v.x * sign;
        if (inward < 0) v.y += 0.42 * Math.abs(inward) * Math.exp(-Math.pow(v.z / 0.55, 2));
        // The only articular surface a plateau has is its top; below it the
        // layer is sunk inside the bone rather than left level with it.
        if (inflate) {
          const top = smoothstep(-0.2, 0.5, v.y);
          v.multiplyScalar(1 - 0.05 * (1 - top));
          v.y += inflate * top;
        }
      },
    });
  bone('medial-tibial-plateau', plateauGeometry(MEDIAL), PLATEAU_SITES.medial, '#e6e0cd');
  bone('lateral-tibial-plateau', plateauGeometry(-MEDIAL), PLATEAU_SITES.lateral, '#e6e0cd');

  // The tibia flares under its plateau the way the femur flares above its
  // condyles, so the table has a bone under it rather than a pole.
  const tibiaSurface = new TubeSurface(
    smoothCurve([
      [0, -0.3, -0.02],
      [0, -0.9, 0.02],
      [0, -1.7, 0.04],
      [0, -2.5, 0.04],
    ]),
    { radius: (u) => 0.56 - 0.28 * smoothstep(0, 0.5, u), steps: 32, radial: 20 }
  );
  const tibiaMaterial = mineralMaterial({ color: colors['tibial-shaft'] ?? '#ece7d8', roughness: 0.68 });
  disposables.push(tibiaSurface, tibiaMaterial);
  add('tibial-shaft', new THREE.Mesh(tibiaSurface.geometry, tibiaMaterial));

  // The fibula: lateral, and it takes no weight. It is here because the lateral
  // collateral ligament ends on its head and nothing else explains that.
  const fibulaSurface = new TubeSurface(
    smoothCurve([
      [-MEDIAL * 0.8, -0.5, -0.16],
      [-MEDIAL * 0.78, -1.3, -0.1],
      [-MEDIAL * 0.74, -1.9, -0.04],
      [-MEDIAL * 0.72, -2.5, 0],
    ]),
    { radius: (u) => 0.23 - 0.1 * smoothstep(0, 0.3, u), steps: 28, radial: 14 }
  );
  const fibulaMaterial = mineralMaterial({ color: colors.fibula ?? '#d6ccb0', roughness: 0.68 });
  disposables.push(fibulaSurface, fibulaMaterial);
  add('fibula', new THREE.Mesh(fibulaSurface.geometry, fibulaMaterial));

  // The patella: a sesamoid in the extensor tendon, sitting in the groove on
  // the front of the condyles. Pointed downwards, which is why its lower pole
  // is called the apex.
  bone(
    'patella',
    shapedSphere({
      detail: 5,
      scale: [0.36, 0.42, 0.15],
      warp: (v) => {
        // Wide at the top, drawn down to a point: the apex is the lower pole.
        v.x *= 1 - 0.72 * smoothstep(0.25, -1, v.y);
        // Ridged behind, where it sits in the groove between the condyles.
        if (v.z < -0.2) v.z -= 0.55 * Math.exp(-Math.pow(v.x / 0.3, 2));
      },
    }),
    [0, 0.44, 0.68],
    '#e6e0cd'
  );

  // --- what covers the articular surfaces ----------------------------------
  //
  // One structure, four meshes: a layer over each condyle and one over each
  // plateau. It is drawn as a slightly larger translucent copy of the bone
  // rather than as a measured thickness, because the thing worth seeing is that
  // the two bones never touch.
  const cartilageMaterial = tissueMaterial({
    color: colors['articular-cartilage'] ?? '#cfe6ea',
    roughness: 0.25,
    opacity: 0.26,
    emissiveIntensity: 0.1,
  });
  disposables.push(cartilageMaterial);
  const cartilage = [];
  for (const [side, sign] of [
    ['medial', MEDIAL],
    ['lateral', -MEDIAL],
  ]) {
    const geometry = condyleGeometry(sign, 0.04);
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, cartilageMaterial);
    mesh.position.set(...CONDYLE_SITES[side]);
    mesh.name = `${side}-condylar-cartilage`;
    object.add(mesh);
    cartilage.push(mesh);

    const plateau = plateauGeometry(sign, 0.09);
    disposables.push(plateau);
    const cap = new THREE.Mesh(plateau, cartilageMaterial);
    cap.position.set(...PLATEAU_SITES[side]);
    cap.name = `${side}-plateau-cartilage`;
    object.add(cap);
    cartilage.push(cap);
  }
  index.set('articular-cartilage', cartilage[0]);

  // --- the menisci ----------------------------------------------------------
  //
  // Two wedges of fibrocartilage between the surfaces, thick at the rim and
  // thin at the free edge. The medial one is a wider C and is tethered to the
  // medial collateral ligament; the lateral one is a nearly closed ring and is
  // not. That difference is why they are injured differently.
  const meniscus = (id, sign, radius, sweep) => {
    const points = [];
    const steps = 16;
    for (let i = 0; i <= steps; i += 1) {
      const t = -sweep / 2 + sweep * (i / steps);
      points.push([
        PLATEAU_SITES.medial[0] * sign * MEDIAL + Math.sin(t) * radius * sign,
        -0.16,
        Math.cos(t) * radius - 0.02,
      ]);
    }
    return cord(id, points, (u) => 0.17 - 0.07 * Math.exp(-Math.pow((u - 0.5) / 0.45, 2)), '#dcd2b4', 1, tissueMaterial);
  };
  meniscus('medial-meniscus', MEDIAL, 0.37, Math.PI * 1.35);
  meniscus('lateral-meniscus', -MEDIAL, 0.32, Math.PI * 1.62);

  // --- the ligaments --------------------------------------------------------
  const ligament = (id, from, to, radius, color, flatten = 1) =>
    cord(
      id,
      [
        point(from).toArray(),
        point(from).lerp(point(to), 0.5).toArray(),
        point(to).toArray(),
      ],
      radius,
      color,
      1,
      wallMaterial,
      flatten
    );

  ligament('anterior-cruciate-ligament', 'aclFemoral', 'aclTibial', 0.1, '#d8c98a');
  ligament('posterior-cruciate-ligament', 'pclFemoral', 'pclTibial', 0.12, '#c4b06a');
  // Flat bands against the side of the joint, not dowels.
  ligament('medial-collateral-ligament', 'mclFemoral', 'mclTibial', 0.13, '#e0d09a', 0.4);
  ligament('lateral-collateral-ligament', 'lclFemoral', 'lclTibial', 0.1, '#e0d09a');

  // --- the extensor mechanism ----------------------------------------------
  cord(
    'quadriceps-tendon',
    [point('quadriceps').toArray(), [0, 1.4, 0.5], point('patellaTop').toArray()],
    (u) => 0.13 - 0.03 * u,
    '#e8e0c8',
    1,
    wallMaterial,
    1.35
  );
  cord(
    'patellar-tendon',
    [point('patellaBottom').toArray(), [0, -0.36, 0.58], point('tibialTuberosity').toArray()],
    0.11,
    '#e8e0c8',
    1,
    wallMaterial,
    1.35
  );

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    /** The layer over both bones, as its own list: one structure, four meshes. */
    cartilageMeshes: cartilage,
    attachmentPoints: Object.fromEntries(
      Object.keys(ATTACHMENTS).map((key) => [key, new THREE.Vector3(...ATTACHMENTS[key])])
    ),
    anchors: {
      femur: new THREE.Vector3(-1.5, 2.0, 0.6),
      joint: new THREE.Vector3(1.7, 0.05, 0.7),
      tibia: new THREE.Vector3(-1.4, -1.8, 0.6),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
