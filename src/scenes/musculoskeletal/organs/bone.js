import * as THREE from 'three';
import { latheFromProfile } from '../../shared/geometry/shapes.js';
import { mineralMaterial, tissueMaterial } from '../../shared/materials.js';

/**
 * A long bone, cut open.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. A narrow shaft with flared ends, and
 * a wedge left out of the revolution so the inside is visible: dense cortex at
 * the outside, marrow cavity in the middle. This is the shape that makes the
 * cortical/medullary distinction obvious; it is not a femur, and no dimension
 * here is real.
 *
 * `setCavity` widens the marrow cavity and thins the cortex, which is what
 * endosteal resorption does — expressed as geometry rather than as a number.
 */
export function buildBone({ color = '#ece7d8', marrowColor = '#c26b6b', cut = 0.74 } = {}) {
  const object = new THREE.Group();
  object.name = 'bone';

  const arc = Math.PI * 2 * cut;
  // The wedge that is left out is centred on the front, so the camera looks
  // straight into the cavity. Anywhere else and this is just a bone.
  const arcStart = ((1 - cut) / 2) * Math.PI * 2;

  // radius, height — flared metaphyses top and bottom, narrow diaphysis.
  const outerProfile = [
    [0.02, -2.2],
    [0.52, -2.1],
    [0.6, -1.75],
    [0.4, -1.35],
    [0.31, -0.6],
    [0.3, 0.2],
    [0.34, 1.1],
    [0.46, 1.5],
    [0.62, 1.85],
    [0.5, 2.15],
    [0.02, 2.25],
  ];

  const cortex = new THREE.Mesh(
    latheFromProfile(outerProfile, { segments: 64, radial: 44, arc, arcStart }),
    mineralMaterial({ color })
  );
  cortex.material.side = THREE.DoubleSide;
  cortex.name = 'cortex';

  const marrow = new THREE.Mesh(
    latheFromProfile(
      outerProfile.map(([r, y]) => [r * 0.55, y * 0.94]),
      { segments: 64, radial: 40, arc, arcStart }
    ),
    tissueMaterial({ color: marrowColor, roughness: 0.7, emissiveIntensity: 0.08, side: THREE.DoubleSide })
  );
  marrow.name = 'marrow';

  object.add(cortex, marrow);

  return {
    object,
    anchors: {
      cortex: new THREE.Vector3(0.95, 0.35, 0.55),
      marrow: new THREE.Vector3(-0.8, -0.4, 0.75),
      metaphysis: new THREE.Vector3(1.1, 1.85, 0.4),
    },
    /**
     * Points on the cortical surface where remodelling is shown happening —
     * spread around the shaft as well as along it, because turnover is not a
     * property of one side of a bone.
     */
    surfacePoints: [-1.4, -0.7, 0, 0.7, 1.35].map((y, index) => {
      const angle = (index / 5) * Math.PI * 2 + Math.PI * 0.75;
      return new THREE.Vector3(Math.sin(angle) * 0.32, y, Math.cos(angle) * 0.32);
    }),
    /**
     * 0 leaves the cavity as built; 1 widens it and thins the cortex.
     * A shape change standing in for a balance, not a measurement of density.
     */
    setCavity(value) {
      const v = Math.max(0, Math.min(1, value));
      marrow.scale.set(1 + 0.34 * v, 1, 1 + 0.34 * v);
      // Periosteal apposition: the outside gains a little as the inside is
      // lost, which is why an older bone can be wider and still weaker.
      cortex.scale.set(1 + 0.05 * v, 1, 1 + 0.05 * v);
    },
  };
}
