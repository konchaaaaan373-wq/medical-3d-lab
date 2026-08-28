import * as THREE from 'three';
import { latheFromProfile, shapedSphere } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { lerp } from '../../../utils/math.js';
import { mucosaMaterial, tissueMaterial } from '../../shared/materials.js';

/**
 * The uterus, in half section, with the tubes and ovaries alongside.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Cut open along the midline, because
 * the thing worth seeing is inside: a thick muscular wall with a lining that
 * changes. The cavity is a potential space — in life the walls lie against each
 * other — and it is drawn here as the gap the lining grows into, which is a
 * schematic convenience.
 *
 * `setLining` is a shape, not a thickness in millimetres.
 */
export function buildUterus({
  myometrium = '#8f4a55',
  endometrium = '#f2a3ac',
  ovary = '#d9b06a',
  tube = '#c99aa0',
} = {}) {
  const object = new THREE.Group();
  object.name = 'uterus';

  // radius, height — fundus at the top, cervix below.
  const wall = [
    [0.03, 1.22],
    [0.42, 1.16],
    [0.66, 0.86],
    [0.7, 0.34],
    [0.6, -0.16],
    [0.42, -0.52],
    [0.32, -0.78],
    [0.3, -1.02],
    [0.03, -1.1],
  ];

  // Half a revolution — and it is the *far* half that is kept, so the front of
  // the organ is open and the lining inside it is what the camera sees. Keeping
  // the near half would look like a whole uterus and hide the subject.
  const arc = Math.PI;
  const arcStart = Math.PI / 2;

  const body = new THREE.Mesh(
    latheFromProfile(wall, { segments: 56, radial: 36, arc, arcStart }),
    tissueMaterial({ color: myometrium, roughness: 0.55, side: THREE.DoubleSide })
  );
  body.name = 'myometrium';

  const lining = new THREE.Mesh(
    latheFromProfile(
      wall.map(([r, y]) => [r * 0.82, y * 0.94]),
      { segments: 56, radial: 36, arc, arcStart }
    ),
    mucosaMaterial({ color: endometrium })
  );
  lining.material.side = THREE.DoubleSide;
  lining.name = 'endometrium';

  // Tubes and ovaries: not the subject, but without them this is just a pear.
  const tubeMaterial = tissueMaterial({ color: tube, roughness: 0.5 });
  const tubes = new THREE.Group();
  tubes.name = 'tubes';
  const tubeSurfaces = [];
  for (const sign of [-1, 1]) {
    const curve = smoothCurve([
      [sign * 0.36, 1.05, 0],
      [sign * 0.85, 1.2, -0.05],
      [sign * 1.35, 1.05, -0.1],
      [sign * 1.6, 0.7, -0.12],
    ]);
    const surface = new TubeSurface(curve, { radius: (u) => 0.06 + 0.05 * u * u, steps: 40, radial: 10 });
    tubeSurfaces.push(surface);
    tubes.add(new THREE.Mesh(surface.geometry, tubeMaterial));

    const gonad = new THREE.Mesh(
      shapedSphere({ detail: 5, scale: [0.26, 0.17, 0.17] }),
      tissueMaterial({ color: ovary, roughness: 0.45 })
    );
    gonad.position.set(sign * 1.72, 0.58, -0.12);
    tubes.add(gonad);
  }

  object.add(body, lining, tubes);

  return {
    object,
    anchors: {
      fundus: new THREE.Vector3(0.2, 1.5, 0.6),
      myometrium: new THREE.Vector3(-1.15, 0.55, 0.5),
      endometrium: new THREE.Vector3(0.75, 0.05, 0.75),
      cervix: new THREE.Vector3(0.5, -1.15, 0.5),
      ovary: new THREE.Vector3(1.95, 0.95, 0.3),
    },
    /**
     * 0 = just shed and thin, 1 = at its thickest.
     *
     * The upper bound matters medically: the myometrium is much the thicker
     * layer at every point in the cycle, and a lining drawn out to the wall
     * teaches that the uterus is mostly endometrium. Even at its thickest it
     * stays well inside the muscle.
     */
    setLining(value) {
      const v = Math.max(0, Math.min(1, value));
      const radial = lerp(0.3, 0.66, v);
      lining.scale.set(radial, lerp(0.94, 1, v), radial);
      // The lining is not just thicker but more vascular by then; the shift is
      // presentational and small on purpose.
      lining.material.emissiveIntensity = lerp(0.08, 0.22, v);
    },
    dispose() {
      for (const surface of tubeSurfaces) surface.dispose();
    },
  };
}
