import * as THREE from 'three';
import { PALETTE } from '../../data/heartFailure.js';
import { ANATOMY, AORTA, PULMONARY_VEINS } from './anatomy.js';
import { lerp, smoothstep } from '../../utils/math.js';

/**
 * The vessels and the left atrium around the ventricle.
 *
 * All translucent and non-depth-writing, so the blood particles inside stay
 * visible — the vessels are context, not the subject.
 */
export class Vessels extends THREE.Group {
  constructor() {
    super();
    this.name = 'vessels';

    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.vessel),
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.valveMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e8eef8'),
      roughness: 0.4,
      emissive: new THREE.Color(PALETTE.vessel),
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.75,
    });

    this.add(new THREE.Mesh(new THREE.TubeGeometry(AORTA, 72, 0.62, 14, false), this.wallMaterial));
    for (const vein of PULMONARY_VEINS) {
      this.add(new THREE.Mesh(new THREE.TubeGeometry(vein, 48, 0.4, 10, false), this.wallMaterial));
    }

    // Left atrium: not the subject, so a simple squashed sphere is enough.
    this.atrium = new THREE.Mesh(
      new THREE.SphereGeometry(ANATOMY.atriumRadius * 0.92, 32, 24),
      this.wallMaterial
    );
    this.atrium.position.copy(ANATOMY.atriumCentre);
    this.atrium.scale.set(1, 0.86, 1);
    this.add(this.atrium);

    this.add(valveRing(ANATOMY.aorticValve, 0.5, this.valveMaterial));
    this.add(valveRing(ANATOMY.mitralValve, 0.62, this.valveMaterial));
  }

  /**
   * The atrium distends as filling pressure rises. This is chamber distension
   * under pressure, not blood arriving from the wrong direction — the pressure
   * itself is drawn by CongestionOverlay.
   *
   * @param {number} fillingPressureIndex 0..1 model index
   */
  setFillingPressure(fillingPressureIndex) {
    const distension = lerp(1, 1.3, smoothstep(0, 1, fillingPressureIndex));
    this.atrium.scale.set(distension, 0.86 * distension, distension);
    this.wallMaterial.opacity = lerp(0.2, 0.28, smoothstep(0.4, 1, fillingPressureIndex));
  }
}

function valveRing(position, radius, material) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 10, 28), material);
  ring.position.copy(position);
  ring.rotation.x = Math.PI / 2; // lie flat in the valve plane
  return ring;
}
