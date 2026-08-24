import * as THREE from 'three';
import { Chamber } from './Chamber.js';
import { ANATOMY } from './anatomy.js';
import { PALETTE } from '../../data/heartFailure.js';
import { bloodVertexShader, bloodFragmentShader } from './shaders/blood.js';
import {
  sampleHemodynamics,
  myocardialVolumeFor,
  ventricleShape,
  cavityVolumeAt,
  SYSTOLE_FRACTION,
} from './hemodynamics.js';

/**
 * A second, healthy ventricle shown beside the remodelled one.
 *
 * This exists for a specific reason found in the medical audit: a single
 * left-to-right slider inevitably suggests "and then this happens", however
 * carefully the captions are worded. Putting a normal ventricle next to the
 * remodelled one presents them as two *states* rather than as two points on an
 * inevitable path, which no amount of wording can do on its own.
 *
 * It reuses the disease scene's own model at progress 0, so the reference is
 * never a separately tuned drawing that could drift away from the model.
 *
 * Only the chamber and its blood are drawn — vessels and the congestion overlay
 * are context that would crowd the comparison without adding to it.
 */
export class ReferenceHeart extends THREE.Group {
  /**
   * @param {THREE.BufferGeometry} bloodGeometry shared with the disease scene's
   *   blood field: same particle slots, different material and cavity uniforms
   * @param {{ segments?: number, profilePoints?: number }} quality
   */
  constructor(bloodGeometry, { segments = 48, profilePoints = 26 } = {}) {
    super();
    this.name = 'reference-heart';

    // Reference state is this scene's own model evaluated at progress 0.
    this.state = sampleHemodynamics(0);
    this.myocardialVolumeMl = myocardialVolumeFor(this.state);

    this.ventricle = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments,
      profilePoints,
      // Desaturated, so the eye reads the remodelled heart as the subject and
      // this one as the yardstick.
      wallColor: new THREE.Color('#8d6f7c'),
      liningColor: new THREE.Color('#b9959c'),
      cutColor: new THREE.Color('#5b3d46'),
    });

    this.blood = new THREE.Points(bloodGeometry, createReferenceBloodMaterial());
    this.blood.frustumCulled = false;

    this.add(this.ventricle, this.blood);
    this.setPhase(0);
  }

  /**
   * Phase-locked to the diseased heart on purpose: comparing wall thickness and
   * chamber size is much easier when both are at the same point in the cycle.
   * The rate difference between the two is in the read-out instead.
   */
  setPhase(phase) {
    const cavityVolumeMl = cavityVolumeAt(phase, this.state);
    const shape = ventricleShape({
      cavityVolumeMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: this.state.longToShortAxisRatio,
    });
    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });

    const uniforms = this.blood.material.uniforms;
    uniforms.uRadius.value = shape.cavityRadius;
    uniforms.uSemiLength.value = shape.cavitySemiLength;
    uniforms.uPhase.value = phase;
    uniforms.uEject.value = this.state.ejectionFraction;
    this.shape = shape;
  }

  update(elapsed) {
    this.blood.material.uniforms.uTime.value = elapsed;
  }

  syncViewport(camera, renderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const fovRad = (camera.fov * Math.PI) / 180;
    this.blood.material.uniforms.uHeightScale.value = size.y / (2 * Math.tan(fovRad / 2));
  }

  dispose() {
    this.ventricle.geometry.dispose();
    this.ventricle.material.dispose();
    this.blood.material.dispose(); // geometry is shared and owned by the disease scene
  }
}

/** Same shader as the disease blood, muted to match the reference chamber. */
function createReferenceBloodMaterial() {
  const source = new THREE.Color(PALETTE.flow);
  const muted = source.clone().lerp(new THREE.Color('#ffffff'), 0.1).multiplyScalar(0.62);
  const mutedResidual = new THREE.Color(PALETTE.residual).multiplyScalar(0.55);

  // A fresh material instance, so the two hearts never share uniform objects.
  return new THREE.ShaderMaterial({
    vertexShader: bloodVertexShader,
    fragmentShader: bloodFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uRadius: { value: 2.6 },
      uSemiLength: { value: 4 },
      uEject: { value: 0.58 },
      uPhase: { value: 0 },
      uSystole: { value: SYSTOLE_FRACTION },
      uFill: { value: 1 },
      uTime: { value: 0 },
      uOpacity: { value: 0.55 },
      // The reference is only ever shown in comparison mode, where the vessels
      // are hidden, so its outflow always fades quickly.
      uExitFalloff: { value: 3.5 },
      uParticleScale: { value: 0.13 },
      uHeightScale: { value: 900 },
      uFlowColor: { value: muted },
      uStaticColor: { value: mutedResidual },
    },
  });
}
