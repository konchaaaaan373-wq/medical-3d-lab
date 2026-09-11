import * as THREE from 'three';
import { carveNamedParts } from '../../shared/anatomy/organParts.js';
import { shapedSphere } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';
import { BLADDER_SCALE, bladderWarp } from './kidney.js';

/**
 * The urinary bladder, cut into the parts anatomy names, with what is on the
 * inside of it.
 *
 * `kidney.js` draws one bladder that fills and empties, because that is what a
 * scene about the tract needs. This is the other scale: the organ as a thing a
 * reader points at. The shape is read from there so the two are one bladder.
 *
 * ## The trigone is why this scene exists
 *
 * Apex, body, fundus and neck are four names for four stretches of the same
 * wall, and on their own they would not be worth a scene. The **trigone** is:
 * a smooth triangle of mucosa on the inside of the base, between the two
 * ureteric orifices and the internal urethral orifice, fixed to the wall
 * beneath it where the rest of the lining is thrown into folds. It is where
 * infection and tumour are looked for, and it is invisible from outside — so
 * the slider fades the wall and it appears.
 *
 * It is drawn as a **patch on the inner surface**, which is what it is: a
 * region of lining, not a solid. The copy says so.
 */

/** Where the wall stops being one named stretch and becomes the next. */
export const BLADDER_LEVELS = Object.freeze({
  /** Apex above this. */
  apex: 0.3,
  /** Neck below this. */
  neck: -0.34,
  /** Behind this is the fundus (the base); in front of it, the body. */
  fundus: -0.12,
});

/** The three corners of the trigone, in the organ's own coordinates. */
export const TRIGONE_CORNERS = Object.freeze({
  'right-ureteric-orifice': [-0.28, -0.02, -0.55],
  'left-ureteric-orifice': [0.28, -0.02, -0.55],
  'internal-urethral-orifice': [0, -0.61, -0.06],
});

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildBladderParts({ colors = {}, opacity = 0.94, detail = 7 } = {}) {
  const object = new THREE.Group();
  object.name = 'bladder-parts';
  const disposables = [];

  // The wall, in four named stretches. The planes are horizontal except the one
  // between body and fundus, which is the front/back division the base means.
  const wall = carveNamedParts({
    warp: bladderWarp,
    scale: [...BLADDER_SCALE],
    cacheKey: 'bladder',
    detail,
    opacity,
    parts: [
      {
        id: 'apex',
        color: colors.apex ?? '#d8aec2',
        planes: [{ through: [0, BLADDER_LEVELS.apex, 0], normal: [0, -1, 0] }],
      },
      {
        id: 'body',
        color: colors.body ?? '#c8a6b8',
        planes: [
          { through: [0, BLADDER_LEVELS.apex, 0], normal: [0, 1, 0] },
          { through: [0, BLADDER_LEVELS.neck, 0], normal: [0, -1, 0] },
          // Keeps the front: the normal points backwards, at the fundus.
          { through: [0, 0, BLADDER_LEVELS.fundus], normal: [0, 0, -1] },
        ],
      },
      {
        id: 'fundus',
        color: colors.fundus ?? '#b88fa6',
        planes: [
          { through: [0, BLADDER_LEVELS.apex, 0], normal: [0, 1, 0] },
          { through: [0, BLADDER_LEVELS.neck, 0], normal: [0, -1, 0] },
          { through: [0, 0, BLADDER_LEVELS.fundus], normal: [0, 0, 1] },
        ],
      },
      {
        id: 'neck',
        color: colors.neck ?? '#a87a93',
        planes: [{ through: [0, BLADDER_LEVELS.neck, 0], normal: [0, 1, 0] }],
      },
    ],
  });
  object.add(wall.object);

  // The trigone: a triangular patch of mucosa on the inside of the base. Drawn
  // as a flat triangle between the three orifices, pushed very slightly into
  // the organ so it does not z-fight the wall behind it.
  const corner = (id) => new THREE.Vector3(...TRIGONE_CORNERS[id]);
  const right = corner('right-ureteric-orifice');
  const left = corner('left-ureteric-orifice');
  const urethral = corner('internal-urethral-orifice');
  const inward = 0.97;
  const trigoneGeometry = new THREE.BufferGeometry();
  trigoneGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [right, left, urethral].flatMap((point) => point.clone().multiplyScalar(inward).toArray()),
      3
    )
  );
  trigoneGeometry.computeVertexNormals();
  const trigoneMaterial = mucosaMaterial({ color: colors.trigone ?? '#e6c17a' });
  // Seen from either side: a reader who comes at the base from behind is
  // looking at its back face, and a one-sided triangle is not there at all.
  trigoneMaterial.side = THREE.DoubleSide;
  const trigone = new THREE.Mesh(trigoneGeometry, trigoneMaterial);
  trigone.name = 'trigone';
  disposables.push(trigoneGeometry, trigoneMaterial);
  object.add(trigone);

  // The three openings at its corners.
  const orifices = [];
  for (const id of Object.keys(TRIGONE_CORNERS)) {
    const geometry = shapedSphere({ detail: 3, scale: [0.055, 0.045, 0.055] });
    const material = tissueMaterial({
      color: colors[id] ?? colors.orifice ?? '#c8603f',
      roughness: 0.3,
      emissiveIntensity: 0.22,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(corner(id).multiplyScalar(inward));
    mesh.name = id;
    disposables.push(geometry, material);
    object.add(mesh);
    orifices.push([id, mesh]);
  }

  // The two ureters arriving and the urethra leaving. Each meets the wall at
  // the orifice it belongs to, read from `TRIGONE_CORNERS` rather than typed
  // again — a ureter that ends somewhere else is the failure this avoids.
  const tube = (id, points, radius, color, opacityValue) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps: 34, radial: 14 });
    const material = wallMaterial({ color: colors[id] ?? color, opacity: opacityValue });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = id;
    disposables.push(surface, material);
    object.add(mesh);
    return mesh;
  };

  const ureter = (id, sign) => {
    const end = corner(sign > 0 ? 'left-ureteric-orifice' : 'right-ureteric-orifice');
    return tube(
      id,
      [
        [sign * 0.62, 1.5, -0.62],
        [sign * 0.55, 0.9, -0.6],
        [sign * 0.46, 0.34, -0.52],
        end.toArray(),
      ],
      0.05,
      '#8fd6c4',
      0.95
    );
  };
  const rightUreter = ureter('right-ureter', -1);
  const leftUreter = ureter('left-ureter', 1);

  const urethra = tube(
    'urethra',
    [urethral.toArray(), [0, -0.72, -0.02], [0, -1.15, 0.02]],
    0.07,
    '#b9879b',
    0.95
  );

  const index = new Map([
    ...wall.parts.map((part) => [part.id, part.mesh]),
    ['trigone', trigone],
    ...orifices,
    ['right-ureter', rightUreter],
    ['left-ureter', leftUreter],
    ['urethra', urethra],
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    wall,
    anchors: {
      apex: new THREE.Vector3(0, 1.05, 0.5),
      trigone: new THREE.Vector3(0, -0.2, -1.2),
      neck: new THREE.Vector3(0, -0.95, 0.45),
    },
    dispose() {
      wall.dispose();
      for (const item of disposables) item.dispose?.();
    },
  };
}
