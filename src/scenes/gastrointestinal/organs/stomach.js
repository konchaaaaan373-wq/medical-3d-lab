import * as THREE from 'three';
import { TubeSurface, smoothCurve, smoothProfile } from '../../shared/geometry/tube.js';
import { wallMaterial } from '../../shared/materials.js';
import { travellingWave } from '../../shared/motion/rhythm.js';

/**
 * Stomach and lower oesophagus.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Built as a tube of varying calibre
 * along the greater curvature, because that is what makes peristalsis
 * expressible: a wave is a local narrowing of that calibre, travelling. The
 * fundus, body, incisura, antrum and pylorus are recognisable; volumes, wall
 * layers and rugae are not modelled.
 *
 * Frontal view, so screen-right is the patient's left: the fundus sits high on
 * the right of the screen and the pylorus points to the left.
 */
export function buildStomach({ color = '#d08a86', pylorusColor = '#f0b9ae' } = {}) {
  const object = new THREE.Group();
  object.name = 'stomach';

  // Fundus apex → body → incisura → antrum → pylorus.
  const curve = smoothCurve([
    [1.02, 1.62, 0],
    [1.24, 0.86, 0.02],
    [1.05, 0.06, 0.04],
    [0.55, -0.56, 0.04],
    [-0.16, -0.78, 0.02],
    [-0.78, -0.52, 0],
    [-1.12, -0.28, 0],
  ]);

  /** Calibre along the stomach; the antrum is a genuinely narrower tube. */
  const baseRadius = smoothProfile([
    [0, 0.5], // fundus
    [0.14, 0.62],
    [0.42, 0.54], // body
    [0.62, 0.38], // incisura
    [0.82, 0.24], // antrum
    [1, 0.11], // pyloric canal
  ]);

  const surface = new TubeSurface(curve, { radius: baseRadius, steps: 132, radial: 26 });
  // Translucent enough to see what is inside it: a stomach whose contents are
  // hidden is a stomach that only appears to be doing something.
  const body = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.84 }));
  body.name = 'gastric-body';

  // A ring at the pylorus: the sphincter is the reason emptying is a trickle
  // rather than a pour, so it is drawn rather than implied.
  const pylorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.055, 10, 24),
    wallMaterial({ color: pylorusColor, opacity: 1 })
  );
  const pylorusPoint = curve.getPointAt(0.97);
  pylorus.position.copy(pylorusPoint);
  pylorus.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(0.97).normalize());
  pylorus.name = 'pylorus';

  object.add(body, pylorus);

  return {
    object,
    surface,
    curve,
    anchors: {
      fundus: new THREE.Vector3(1.7, 1.75, 0.3),
      cardia: new THREE.Vector3(0.42, 1.5, 0.4),
      antrum: new THREE.Vector3(-0.2, -1.35, 0.4),
      pylorus: new THREE.Vector3(-1.5, -0.15, 0.3),
    },
    /**
     * Redraws the wall with a peristaltic wave on it.
     *
     * `phase` is where the wave is (0..1 along the stomach), `amplitude` how
     * deep, and the depth is scaled towards the antrum: proximally these waves
     * mix, distally they pump. Presentation values — no volume is being
     * conserved here.
     */
    setWave(phase, amplitude, { count = 2 } = {}) {
      surface.refresh((u, base) => {
        const distal = Math.pow(Math.max(0, (u - 0.25) / 0.75), 1.4);
        const depth = amplitude * (0.14 + 0.62 * distal);
        // Wider than it is deep: a narrow, deep notch reads as a crease in the
        // surface rather than as a ring of muscle closing.
        return base * (1 - depth * travellingWave(u, phase, { width: 0.11, count }));
      });
    },
    dispose() {
      surface.dispose();
    },
  };
}

/**
 * The oesophagus, entering the stomach at the cardia.
 *
 * PROTOTYPE. A straight muscular tube; the sphincters are not drawn.
 */
export function buildEsophagus({ color = '#c9a2a6', top = 2.9 } = {}) {
  // The last stretch runs backwards as well as down, so the tube passes behind
  // the fundus and into it. Ending it in front of the stomach made a tube that
  // stopped short of an organ it is continuous with.
  const curve = smoothCurve([
    [0.24, top, -0.24],
    [0.3, top - 0.8, -0.2],
    [0.4, 1.75, -0.14],
    [0.66, 1.5, -0.16],
    [0.92, 1.24, -0.2],
    [1.05, 1.06, -0.26],
  ]);
  const surface = new TubeSurface(curve, { radius: () => 0.17, steps: 90, radial: 18 });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.9 }));
  mesh.name = 'esophagus';

  return {
    object: mesh,
    surface,
    curve,
    anchors: { esophagus: new THREE.Vector3(-0.45, top - 0.9, 0.3) },
    /** One ring of contraction, travelling down. `amplitude` 0 leaves it at rest. */
    setWave(phase, amplitude) {
      surface.refresh((u, base) => base * (1 - amplitude * 0.72 * travellingWave(u, phase, { width: 0.06 })));
    },
    dispose() {
      surface.dispose();
    },
  };
}
