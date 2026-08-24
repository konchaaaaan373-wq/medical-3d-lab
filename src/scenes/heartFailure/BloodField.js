import * as THREE from 'three';
import { bloodVertexShader, bloodFragmentShader } from './shaders/blood.js';
import { SYSTOLE_FRACTION } from './hemodynamics.js';

/**
 * Blood inside the left ventricle.
 *
 * Normalised slots follow the beating chamber, and the share given by the
 * ejection fraction loops out through the aorta and back in through the mitral
 * valve each cycle — always in the physiological direction. Pulmonary
 * congestion is a separate component (CongestionOverlay) and is not blood.
 */
export class BloodField extends THREE.Points {
  /**
   * @param {{
   *   slots: Float32Array, exits: Float32Array, entries: Float32Array,
   *   ranks: Float32Array, appear: Float32Array, seeds: Float32Array, sizes: Float32Array,
   * }} buffers
   * @param {{ flowColor: string, staticColor: string, normalised?: boolean }} options
   */
  constructor(buffers, { flowColor, staticColor, normalised = true }) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.slots, 3));
    geometry.setAttribute('aExit', new THREE.BufferAttribute(buffers.exits, 3));
    geometry.setAttribute('aEntry', new THREE.BufferAttribute(buffers.entries, 3));
    geometry.setAttribute('aRank', new THREE.BufferAttribute(buffers.ranks, 1));
    geometry.setAttribute('aAppear', new THREE.BufferAttribute(buffers.appear, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(buffers.sizes, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 18);

    const material = new THREE.ShaderMaterial({
      vertexShader: bloodVertexShader,
      fragmentShader: bloodFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uRadius: { value: normalised ? 2.6 : 1 },
        uSemiLength: { value: normalised ? 4 : 1 },
        uEject: { value: 0 },
        uPhase: { value: 0 },
        uSystole: { value: SYSTOLE_FRACTION },
        uFill: { value: 1 },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uParticleScale: { value: 0.13 },
        uHeightScale: { value: 900 },
        uFlowColor: { value: new THREE.Color(flowColor) },
        uStaticColor: { value: new THREE.Color(staticColor) },
      },
    });

    super(geometry, material);
    this.frustumCulled = false;
  }

  setCavity(radius, semiLength) {
    this.material.uniforms.uRadius.value = radius;
    this.material.uniforms.uSemiLength.value = semiLength;
  }

  setCycle(phase, ejectionFraction) {
    this.material.uniforms.uPhase.value = phase;
    this.material.uniforms.uEject.value = ejectionFraction;
  }

  setFill(value) {
    this.material.uniforms.uFill.value = value;
  }

  update(elapsed) {
    this.material.uniforms.uTime.value = elapsed;
  }

  syncViewport(camera, renderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const fovRad = (camera.fov * Math.PI) / 180;
    this.material.uniforms.uHeightScale.value = size.y / (2 * Math.tan(fovRad / 2));
  }
}
