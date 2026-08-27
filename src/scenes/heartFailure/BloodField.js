import * as THREE from 'three';
import { bloodVertexShader, bloodFragmentShader } from './shaders/blood.js';

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
        uApexDrift: { value: new THREE.Vector2(0, 0) },
        uDescent: { value: 0 },
        uEject: { value: 0 },
        uPhase: { value: 0 },
        uEjectStart: { value: 0.06 },
        uEjectEnd: { value: 0.39 },
        uFill: { value: 1 },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        // 1 ≈ linear fade along the outflow; higher makes blood vanish sooner.
        uExitFalloff: { value: 1.2 },
        uEjectEmphasis: { value: 0 },
        uResidualEmphasis: { value: 0 },
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

  /** Lateral apex drift, so the blood tracks the leaning long axis. */
  setApexDrift(x, z) {
    this.material.uniforms.uApexDrift.value.set(x, z);
  }

  /** Annular descent of the chamber frame; exit/entry paths stay put. */
  setDescent(descent) {
    this.material.uniforms.uDescent.value = descent;
  }

  setCycle(phase, ejectionFraction) {
    this.material.uniforms.uPhase.value = phase;
    this.material.uniforms.uEject.value = ejectionFraction;
  }

  /**
   * When the aortic valve opens and closes, as fractions of the cycle.
   *
   * Both come from the circulation model rather than from a fixed systolic
   * fraction, so the gap before `start` is the isovolumic contraction the
   * pressures actually produce, and it lengthens as contractility falls.
   *
   * @param {number} start
   * @param {number} end
   */
  setEjectionWindow(start, end) {
    this.material.uniforms.uEjectStart.value = start;
    this.material.uniforms.uEjectEnd.value = end;
  }

  /**
   * Presentation emphasis, 0..1 each. Visualization only — neither changes what
   * the model produced, only how easy it is to read.
   *
   * `ejection` brightens and lengthens blood while the aortic valve is open, so
   * the outflow is recognisable by its motion rather than by its colour.
   * `residual` picks out what is still in the chamber, which is what a failing
   * ventricle leaves behind.
   *
   * @param {{ ejection?: number, residual?: number }} emphasis
   */
  setEmphasis({ ejection, residual }) {
    const uniforms = this.material.uniforms;
    if (ejection !== undefined) uniforms.uEjectEmphasis.value = ejection;
    if (residual !== undefined) uniforms.uResidualEmphasis.value = residual;
  }

  /**
   * How quickly ejected blood fades on its way out. Raised in comparison mode,
   * where the vessels are hidden and a long outflow trail would float in empty
   * space away from either heart.
   */
  setExitFalloff(value) {
    this.material.uniforms.uExitFalloff.value = value;
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
