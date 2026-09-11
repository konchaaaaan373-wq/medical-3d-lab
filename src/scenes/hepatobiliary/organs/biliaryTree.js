import * as THREE from 'three';
import { nearestU, tubeParts } from '../../shared/anatomy/tubeParts.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { shapedSphere } from '../../shared/geometry/shapes.js';
import { tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The biliary tree: the gallbladder and the ducts bile leaves the liver by.
 *
 * Nothing in this repository drew a bile duct until now. `liver-anatomy` hangs
 * a gallbladder in its fossa, because that is where a gallbladder is, but the
 * duct system it drains into did not exist — which meant the model could not
 * say the one thing biliary anatomy is for: **where an obstruction has to be
 * for a particular thing to go wrong.**
 *
 * ## The frame
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the right hepatic duct comes in from −x and the gallbladder hangs on that
 * side too. The confluence of the two hepatic ducts is the origin of the
 * layout: every other point below is placed relative to it, and the junctions
 * are read from the curves rather than typed twice.
 *
 * ## The common bile duct goes where it goes
 *
 * It descends **behind** the first part of the duodenum and through the back of
 * the **pancreatic head**, and it reaches the duodenum's second part on its
 * posteromedial wall. An earlier version of this file ran it in front of both,
 * so that it could be clicked on — which is changing the anatomy to suit the
 * camera, and it is not how this project shows a structure that is hidden. The
 * scene has a viewpoint that takes the neighbours away and a slider that fades
 * them; the duct stays where it is.
 *
 * That relationship is the reason a mass in the pancreatic head obstructs the
 * bile duct, so drawing it the easy way also threw away the one thing the
 * arrangement explains.
 *
 * ## What is schematic, and it is most of it
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Calibres, lengths and angles are
 * drawn to be legible. What the model claims is **order** and **which side of
 * what**: right and left hepatic ducts join to make the common hepatic duct;
 * the cystic duct joins that to make the common bile duct; the common bile duct
 * passes behind the duodenum and through the pancreatic head to meet the main
 * pancreatic duct, and the two open into the duodenum together. That order is
 * what decides which obstruction causes which picture, and it is what the tests
 * fix.
 */

/** Where the two hepatic ducts meet. Everything else is placed from here. */
export const CONFLUENCE = Object.freeze([0, 0.9, 0]);

/** Where the cystic duct joins the common hepatic duct. */
export const CYSTIC_JUNCTION = Object.freeze([-0.15, 0.05, 0]);

/**
 * The centre of the duodenum's descending limb, and how wide it is.
 *
 * The second part of the duodenum lies a little to the patient's **right** of
 * the midline, with its concavity facing the midline — which is where the
 * pancreatic head sits. The papilla below is derived from these two numbers
 * rather than typed beside them, so the opening stays on the wall when the
 * bowel moves.
 */
export const DESCENDING_LIMB = Object.freeze([-0.42, -1.02, -0.3]);
export const DESCENDING_LIMB_RADIUS = 0.144;

/**
 * Where the common bile duct and the pancreatic duct open into the duodenum:
 * the **posteromedial** wall of the second part, facing the pancreatic head.
 */
export const PAPILLA = Object.freeze([
  DESCENDING_LIMB[0] + DESCENDING_LIMB_RADIUS,
  DESCENDING_LIMB[1],
  DESCENDING_LIMB[2],
]);

/** Where the pancreatic head sits: inside the duodenal C, behind the bowel. */
export const PANCREATIC_HEAD = Object.freeze([0.18, -0.95, -0.3]);

/** The gallbladder's axis, fundus first. */
export const GALLBLADDER_PATH = Object.freeze([
  [-1.52, -0.62, 0.6],
  [-1.24, -0.3, 0.52],
  [-0.96, -0.02, 0.4],
  [-0.72, 0.18, 0.28],
]);

/** The three named lengths of the gallbladder, as fractions of that axis. */
export const GALLBLADDER_PARTS = Object.freeze([
  { id: 'gallbladder-fundus', from: 0, to: 0.34 },
  { id: 'gallbladder-body', from: 0.34, to: 0.76 },
  { id: 'gallbladder-neck', from: 0.76, to: 1 },
]);

const DUCT_IDS = Object.freeze([
  'right-hepatic-duct',
  'left-hepatic-duct',
  'common-hepatic-duct',
  'cystic-duct',
  'common-bile-duct',
  'pancreatic-duct',
]);

export const BILIARY_PART_IDS = Object.freeze([
  ...GALLBLADDER_PARTS.map((part) => part.id),
  ...DUCT_IDS,
  'major-duodenal-papilla',
]);

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, sacculations?: number }} [options]
 */
export function buildBiliaryTree({ colors = {}, opacity = 0.95 } = {}) {
  const object = new THREE.Group();
  object.name = 'biliary-tree';
  const disposables = [];

  const confluence = new THREE.Vector3(...CONFLUENCE);
  const cystic = new THREE.Vector3(...CYSTIC_JUNCTION);
  const papilla = new THREE.Vector3(...PAPILLA);

  // --- the gallbladder ------------------------------------------------------
  //
  // One tube of falling calibre, cut into the three lengths anatomy names. The
  // fundus is a *blind* end and closes as a dome; the neck is not, and stays
  // full width because the cystic duct continues out of it.
  const gallbladderCurve = smoothCurve(GALLBLADDER_PATH.map((point) => [...point]));
  const dome = (t) => (t >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))));
  const gallbladderCalibre = (u) => (0.3 - 0.21 * Math.pow(u, 1.4)) * dome(u / 0.16);

  const gallbladder = tubeParts(gallbladderCurve, gallbladderCalibre, [...GALLBLADDER_PARTS], {
    radial: 20,
    steps: 200,
    material: (part) =>
      wallMaterial({ color: colors[part.id] ?? colors.gallbladder ?? '#c9b23c', opacity }),
  });
  for (const part of gallbladder.parts) object.add(part.mesh);
  disposables.push(gallbladder);

  // --- the ducts ------------------------------------------------------------
  const duct = (id, points, radius, color) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps: 44, radial: 14 });
    const material = wallMaterial({ color: colors[id] ?? color, opacity });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = id;
    disposables.push(surface, material);
    object.add(mesh);
    return { id, mesh, surface };
  };

  // The two hepatic ducts leave the liver at the porta hepatis and meet. The
  // liver itself is not drawn here — see the model card — so they begin at the
  // edge of the model.
  const rightHepatic = duct(
    'right-hepatic-duct',
    [
      [-1.25, 1.52, 0.18],
      [-0.62, 1.18, 0.08],
      confluence.toArray(),
    ],
    0.058,
    '#4f8f5f'
  );
  const leftHepatic = duct(
    'left-hepatic-duct',
    [
      [1.3, 1.46, 0.12],
      [0.6, 1.15, 0.06],
      confluence.toArray(),
    ],
    0.058,
    '#4f8f5f'
  );
  const commonHepatic = duct(
    'common-hepatic-duct',
    [confluence.toArray(), [-0.08, 0.5, 0.0], cystic.toArray()],
    0.075,
    '#3f7d52'
  );
  // Out of the gallbladder's neck — read off the gallbladder's own curve, so
  // moving the gallbladder moves the duct that leaves it.
  const neckEnd = gallbladderCurve.getPointAt(1);
  const cysticDuct = duct(
    'cystic-duct',
    [neckEnd.toArray(), [-0.46, 0.16, 0.13], cystic.toArray()],
    0.055,
    '#6aa86f'
  );
  // Down and **back**: behind the first part of the duodenum, then through the
  // back of the pancreatic head, reaching the second part on its posteromedial
  // wall. Both of those structures are drawn, and both are in front of it.
  const commonBile = duct(
    'common-bile-duct',
    [
      cystic.toArray(),
      [-0.14, -0.34, -0.14],
      [-0.17, -0.6, -0.34],
      [-0.24, -0.85, -0.38],
      papilla.toArray(),
    ],
    0.09,
    '#2f6b45'
  );
  // The pancreatic duct arrives from the patient's left, through the head, and
  // joins it at the end.
  const pancreaticDuct = duct(
    'pancreatic-duct',
    [
      [1.2, -1.02, -0.32],
      [0.6, -1.0, -0.32],
      [0.08, -1.0, -0.32],
      papilla.toArray(),
    ],
    0.055,
    '#57bda4'
  );

  // The pancreatic head, inside the duodenal C and behind the bowel. It is
  // built here rather than in the scene because the duct's course *through* it
  // is a claim this file makes, and a claim needs the two things it is about in
  // one place.
  const headGeometry = shapedSphere({
    detail: 5,
    scale: [0.46, 0.38, 0.3],
    warp: (v) => {
      // Scooped on the side the duodenal C wraps round it.
      const outward = -v.x;
      if (outward > 0) v.x -= 0.26 * outward * Math.exp(-Math.pow(v.y / 0.8, 2));
    },
  });
  const headMaterial = tissueMaterial({
    color: colors['pancreatic-head'] ?? '#deb18c',
    roughness: 0.5,
    opacity: 0.9,
  });
  const pancreaticHead = new THREE.Mesh(headGeometry, headMaterial);
  pancreaticHead.position.set(...PANCREATIC_HEAD);
  pancreaticHead.name = 'pancreatic-head';
  disposables.push(headGeometry, headMaterial);
  object.add(pancreaticHead);

  // Where the two open into the duodenum together.
  const papillaGeometry = shapedSphere({ detail: 3, scale: [0.1, 0.085, 0.09] });
  const papillaMaterial = tissueMaterial({
    color: colors['major-duodenal-papilla'] ?? '#c8603f',
    roughness: 0.32,
    emissiveIntensity: 0.22,
  });
  const papillaMesh = new THREE.Mesh(papillaGeometry, papillaMaterial);
  papillaMesh.position.copy(papilla);
  papillaMesh.name = 'major-duodenal-papilla';
  disposables.push(papillaGeometry, papillaMaterial);
  object.add(papillaMesh);

  const index = new Map([
    ...gallbladder.parts.map((part) => [part.id, part.mesh]),
    ['pancreatic-head', pancreaticHead],
    [rightHepatic.id, rightHepatic.mesh],
    [leftHepatic.id, leftHepatic.mesh],
    [commonHepatic.id, commonHepatic.mesh],
    [cysticDuct.id, cysticDuct.mesh],
    [commonBile.id, commonBile.mesh],
    [pancreaticDuct.id, pancreaticDuct.mesh],
    ['major-duodenal-papilla', papillaMesh],
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    gallbladderCurve,
    /** The junctions, for a scene or a test that needs to point at one. */
    junctions: {
      confluence: confluence.clone(),
      cystic: cystic.clone(),
      papilla: papilla.clone(),
    },
    /** Where the neighbours go, so a scene places them from the tree. */
    sites: {
      descendingLimb: new THREE.Vector3(...DESCENDING_LIMB),
      descendingLimbRadius: DESCENDING_LIMB_RADIUS,
      pancreaticHead: new THREE.Vector3(...PANCREATIC_HEAD),
    },
    /** Where along the gallbladder's axis a point lies. */
    along: (point) => nearestU(gallbladderCurve, point, 200),
    anchors: {
      gallbladder: new THREE.Vector3(-2.1, -0.95, 0.9),
      confluence: confluence.clone().add(new THREE.Vector3(0, 0.45, 0.5)),
      papilla: papilla.clone().add(new THREE.Vector3(0.55, -0.35, 0.35)),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
