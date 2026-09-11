import * as THREE from 'three';
import { nearestU, tubeParts } from '../../shared/anatomy/tubeParts.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { shapedSphere } from '../../shared/geometry/shapes.js';
import { tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The oesophagus, cut into the parts anatomy names, with the three places it
 * is narrow.
 *
 * `stomach.js` draws the last stretch of oesophagus arriving at the cardia,
 * because that is what a stomach scene needs. This is the whole tube at its own
 * scale, and it exists for one thing: **the three constrictions**. A swallowed
 * object lodges at one of them, a stricture forms at one of them, and a scope
 * meets resistance at one of them — and each is narrow for a different reason,
 * which is why each has a different neighbour drawn beside it.
 *
 * ## The calibre is the content
 *
 * The parts below are stretches of one tube. What makes them worth naming is
 * where that tube narrows, so the calibre profile is not decoration: it is the
 * claim, and the three named rings are placed *at the minima of the profile*
 * rather than at three numbers typed beside it.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Lengths and calibres are drawn to be
 * legible. What the model claims is the **order and the neighbours**: the
 * cricopharyngeal narrowing at the top, the aortic and bronchial one in the
 * chest, the diaphragmatic one where it passes the hiatus.
 */

/** Where the tube runs, top to bottom. Screen-left is the patient's right. */
export const ESOPHAGUS_PATH = Object.freeze([
  [0, 2.5, -0.1],
  [0.02, 1.6, -0.14],
  // Pushed forward a little where the arch crosses behind-left of it.
  [0.06, 0.75, -0.08],
  [0.04, -0.1, -0.12],
  [0.0, -0.95, -0.16],
  // Through the hiatus and turning left towards the cardia.
  [0.06, -1.7, -0.12],
  [0.26, -2.25, -0.02],
]);

/**
 * Where the three constrictions sit along the tube, as fractions of its length.
 *
 * Named by what makes each one narrow, because that is the whole reason the
 * three are taught apart: a ring of muscle, two structures crossing it, and a
 * hole in a sheet of muscle.
 */
export const CONSTRICTIONS = Object.freeze([
  { id: 'cricopharyngeal-constriction', at: 0.06 },
  { id: 'aortobronchial-constriction', at: 0.46 },
  { id: 'diaphragmatic-constriction', at: 0.86 },
]);

/** The named lengths, in the order the tube runs. */
export const ESOPHAGUS_PART_IDS = Object.freeze(['cervical', 'thoracic', 'abdominal']);

/** Where the tube leaves the neck and where it passes the diaphragm. */
const CERVICAL_TO = 0.16;
const ABDOMINAL_FROM = 0.88;

/**
 * The calibre along the tube: a resting lumen with three narrowings on it.
 *
 * @param {number} [narrowing] how deep the three constrictions are, 0–1
 */
export const esophagusCalibre = (narrowing = 1) => (u) => {
  const base = 0.17;
  let dip = 0;
  for (const { at } of CONSTRICTIONS) {
    dip = Math.max(dip, Math.exp(-Math.pow((u - at) / 0.045, 2)));
  }
  return base * (1 - 0.34 * narrowing * dip);
};

/** @param {[number, number, number]} [offset] */
export const esophagusPath = (offset = [0, 0, 0]) =>
  smoothCurve(ESOPHAGUS_PATH.map(([x, y, z]) => [x + offset[0], y + offset[1], z + offset[2]]));

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, offset?: [number, number, number] }} [options]
 */
export function buildEsophagusParts({ colors = {}, opacity = 0.95, offset = [0, 0, 0] } = {}) {
  const object = new THREE.Group();
  object.name = 'esophagus-parts';
  const disposables = [];

  const curve = esophagusPath(offset);
  const calibre = esophagusCalibre();

  const tube = tubeParts(
    curve,
    calibre,
    [
      { id: 'cervical', from: 0, to: CERVICAL_TO },
      { id: 'thoracic', from: CERVICAL_TO, to: ABDOMINAL_FROM },
      { id: 'abdominal', from: ABDOMINAL_FROM, to: 1 },
    ],
    {
      radial: 20,
      steps: 260,
      // Both ends are continuations — pharynx above, stomach below — so they
      // close as domes rather than reading as cut pipe. Neither is a blind end
      // and the copy says so.
      roundEnds: 0.03,
      material: (part) => wallMaterial({ color: colors[part.id] ?? '#c9a2a6', opacity }),
    }
  );
  for (const part of tube.parts) object.add(part.mesh);
  disposables.push(tube);

  // The three narrowings, drawn as rings *at the minima of the same profile*
  // the tube is built from. A ring placed at a number typed beside the profile
  // would drift the moment the profile changed.
  const constrictions = [];
  for (const { id, at } of CONSTRICTIONS) {
    const radius = calibre(at);
    const ring = new THREE.TorusGeometry(radius * 1.16, radius * 0.28, 10, 26);
    const material = tissueMaterial({
      color: colors[id] ?? colors.constriction ?? '#d8703f',
      roughness: 0.35,
      emissiveIntensity: 0.2,
    });
    const mesh = new THREE.Mesh(ring, material);
    mesh.position.copy(curve.getPointAt(at));
    // Lying across the tube, not along it.
    const tangent = curve.getTangentAt(at);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent.normalize());
    mesh.name = id;
    disposables.push(ring, material);
    object.add(mesh);
    constrictions.push([id, mesh]);
  }

  // What makes each constriction narrow. Each is context, and each is the
  // reason one of the three is where it is.
  const neighbour = (id, geometry, position, rotation, color) => {
    const material = tissueMaterial({ color: colors[id] ?? color, roughness: 0.5, opacity: 0.88 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.name = id;
    disposables.push(geometry, material);
    object.add(mesh);
    return mesh;
  };

  // The trachea in front of it, ending at the carina above the second narrowing.
  const tracheaSurface = new TubeSurface(
    smoothCurve([
      [0, 2.5, 0.34],
      [0.02, 1.5, 0.3],
      [0.04, 0.72, 0.26],
    ]),
    { radius: () => 0.22, steps: 30, radial: 18 }
  );
  const tracheaMaterial = wallMaterial({ color: colors.trachea ?? '#cfd6dd', opacity: 0.82 });
  const trachea = new THREE.Mesh(tracheaSurface.geometry, tracheaMaterial);
  trachea.name = 'trachea';
  disposables.push(tracheaSurface, tracheaMaterial);
  object.add(trachea);

  // The left main bronchus, crossing in front of the oesophagus.
  const bronchusSurface = new TubeSurface(
    smoothCurve([
      [0.04, 0.7, 0.26],
      [0.4, 0.55, 0.2],
      [0.78, 0.44, 0.1],
    ]),
    { radius: () => 0.12, steps: 22, radial: 14 }
  );
  const bronchusMaterial = wallMaterial({ color: colors['left-main-bronchus'] ?? '#cfd6dd', opacity: 0.88 });
  const bronchus = new THREE.Mesh(bronchusSurface.geometry, bronchusMaterial);
  bronchus.name = 'left-main-bronchus';
  disposables.push(bronchusSurface, bronchusMaterial);
  object.add(bronchus);

  // The aortic arch, crossing behind and to the left of it.
  const archSurface = new TubeSurface(
    smoothCurve([
      [0.05, 0.05, -0.62],
      [0.18, 0.62, -0.6],
      [0.5, 0.95, -0.48],
      [0.88, 0.72, -0.34],
      [1.0, 0.05, -0.3],
    ]),
    { radius: () => 0.2, steps: 40, radial: 18 }
  );
  const archMaterial = tissueMaterial({ color: colors['aortic-arch'] ?? '#b0413c', roughness: 0.4, opacity: 0.9 });
  const arch = new THREE.Mesh(archSurface.geometry, archMaterial);
  arch.name = 'aortic-arch';
  disposables.push(archSurface, archMaterial);
  object.add(arch);

  // The diaphragm, as a sheet with a hole the tube passes through. Drawn as a
  // flattened ring so that "it goes through a hole in a muscle" is visible.
  const hiatusPoint = curve.getPointAt(CONSTRICTIONS[2].at);
  const hiatusGeometry = new THREE.TorusGeometry(0.62, 0.13, 10, 34);
  const hiatusMaterial = tissueMaterial({ color: colors.diaphragm ?? '#c46f6a', roughness: 0.55, opacity: 0.72 });
  const diaphragm = new THREE.Mesh(hiatusGeometry, hiatusMaterial);
  diaphragm.position.copy(hiatusPoint);
  diaphragm.rotation.x = Math.PI / 2;
  diaphragm.scale.set(1, 1, 0.42);
  diaphragm.name = 'diaphragm';
  disposables.push(hiatusGeometry, hiatusMaterial);
  object.add(diaphragm);

  // The cardia the tube ends at.
  const cardiaGeometry = shapedSphere({ detail: 4, scale: [0.34, 0.22, 0.26] });
  const cardia = neighbour('gastric-cardia', cardiaGeometry, [0.36, -2.42, 0.02], null, '#d98f93');

  const index = new Map([
    ...tube.parts.map((part) => [part.id, part.mesh]),
    ...constrictions,
    ['trachea', trachea],
    ['left-main-bronchus', bronchus],
    ['aortic-arch', arch],
    ['diaphragm', diaphragm],
    ['gastric-cardia', cardia],
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    curve,
    parts: tube.parts,
    /** Where along the tube a point lies. */
    along: (point) => nearestU(curve, point, 300),
    /** Each constriction's position on the tube, read from the curve. */
    constrictionAt: (id) => {
      const found = CONSTRICTIONS.find((entry) => entry.id === id);
      return found ? curve.getPointAt(found.at) : null;
    },
    anchors: {
      cervical: new THREE.Vector3(-0.85, 2.0, 0.3),
      thoracic: new THREE.Vector3(-0.9, 0.1, 0.3),
      abdominal: new THREE.Vector3(-0.8, -2.0, 0.3),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
