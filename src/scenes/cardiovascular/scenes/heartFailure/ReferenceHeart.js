import * as THREE from 'three';
import { Chamber } from './Chamber.js';
import { ValveApparatus } from './ValveApparatus.js';
import { ANATOMY } from './anatomy.js';
import { CavityOutline } from './CavityOutline.js';
import { PALETTE } from '../../../../data/heartFailure.js';
import { bloodVertexShader, bloodFragmentShader } from './shaders/blood.js';
import { APEX_PINNING, TORSION_ILLUSTRATIVE_MAX, VENTRICLE_SHAPING } from './geometry/ventricleGeometry.js';
import {
  sampleHemodynamics,
  myocardialVolumeFor,
  ventricleShape,
  cavityVolumeAt,
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
 * never a separately tuned drawing that could drift away from the model. It
 * also shares the disease heart's geometry code and motion rules (apex
 * pinning, torsion), so a comparison compares states — never two different
 * renderers.
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
  constructor(bloodGeometry, { segments = 56, profilePoints = 30 } = {}) {
    super();
    this.name = 'reference-heart';

    // Reference state is this scene's own model evaluated at progress 0.
    this.state = sampleHemodynamics(0);
    this.myocardialVolumeMl = myocardialVolumeFor(this.state);
    this.edShape = ventricleShape({
      cavityVolumeMl: this.state.edvMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: this.state.longToShortAxisRatio,
    });

    this.ventricle = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments,
      profilePoints,
      // Desaturated, so the eye reads the remodelled heart as the subject and
      // this one as the yardstick.
      variant: 'reference',
    });

    this.blood = new THREE.Points(bloodGeometry, createReferenceBloodMaterial());
    this.blood.frustumCulled = false;
    // The healthy heart ejects on its own solved timing, not the diseased one's.
    this.blood.material.uniforms.uEjectStart.value = this.state.ejectionStartPhase;
    this.blood.material.uniforms.uEjectEnd.value = this.state.ejectionEndPhase;

    // Same end-diastolic mark as the subject heart, so the two strokes can be
    // read against each other and not just the two chamber sizes.
    // Same colour as the subject's mark, deliberately: the rest of this heart is
    // desaturated so it reads as the yardstick, but the mark is the measuring
    // instrument itself. Dimming it on one side only would make the stroke
    // harder to read on exactly the side it is being compared against.
    this.outline = new CavityOutline({ cutAngle: ANATOMY.cutAngle });
    this.outline.setShape({ ...this.edShape, baseY: ANATOMY.baseY });

    // The same valve apparatus as the disease heart, so a comparison always
    // compares two states of one drawing.
    this.apparatus = new ValveApparatus({ variant: 'reference' });

    this.add(this.ventricle, this.apparatus, this.blood, this.outline);
    this.setPhase(0);
  }

  /**
   * Phase-locked to the diseased heart on purpose: comparing wall thickness and
   * chamber size is much easier when both are at the same point in the cycle.
   * The rate difference between the two is in the read-out instead.
   */
  setPhase(phase) {
    this.phase = phase;
    const cavityVolumeMl = cavityVolumeAt(phase, this.state);
    const shape = ventricleShape({
      cavityVolumeMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: this.state.longToShortAxisRatio,
    });

    // Same motion rules as the disease heart: apex pinned, annulus descends,
    // apex twists with the emptying stroke.
    const descent = (shape.outerSemiLength - this.edShape.outerSemiLength) * APEX_PINNING;
    this.ventricle.position.y = descent;
    this.blood.material.uniforms.uDescent.value = descent;
    this.ventricle.setTorsion(
      TORSION_ILLUSTRATIVE_MAX *
        this.emptiedFraction() *
        Math.min(1, this.state.ejectionFraction / 0.58)
    );

    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.apparatus.update({ ...shape, baseY: ANATOMY.baseY }, phase, this.state, descent);

    const uniforms = this.blood.material.uniforms;
    uniforms.uRadius.value = shape.cavityRadius;
    uniforms.uSemiLength.value = shape.cavitySemiLength;
    uniforms.uApexDrift.value.set(
      VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength,
      VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength
    );
    uniforms.uPhase.value = phase;
    uniforms.uEject.value = this.state.ejectionFraction;
    this.shape = shape;
  }

  /** Same presentation emphasis as the diseased heart, so a comparison matches. */
  setEmphasis({ ejection, residual }) {
    const uniforms = this.blood.material.uniforms;
    if (ejection !== undefined) uniforms.uEjectEmphasis.value = ejection;
    if (residual !== undefined) uniforms.uResidualEmphasis.value = residual;
  }

  /**
   * Presence, 0..1. Visualization only — used when the sequence needs attention
   * on the remodelled heart rather than on the comparison.
   *
   * @param {number} presence
   */
  setPresence(presence) {
    this.presence = presence;
    this.ventricle.setOpacity(presence);
    this.apparatus.materials.papillary.opacity = presence;
    this.apparatus.materials.leaflet.opacity = 0.92 * presence;
    this.apparatus.materials.chordae.opacity = 0.95 * presence;
    this.blood.material.uniforms.uOpacity.value = 0.38 * presence;
    this.visible = presence > 0.02;
  }

  /** @param {number} value 0..1 — the end-diastolic mark is a comparison aid. */
  setOutline(value) {
    this.outline.setOpacity(value * (this.presence ?? 1));
  }

  /** How far through its own stroke this heart is, 0 at ED, 1 at ES. */
  emptiedFraction() {
    const { edvMl, esvMl } = this.state;
    const volume = cavityVolumeAt(this.phase ?? 0, this.state);
    return Math.min(1, Math.max(0, (edvMl - volume) / Math.max(1, edvMl - esvMl)));
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
    // Textures are shared with the disease heart's materials, so only the
    // material objects themselves are released here.
    for (const material of this.ventricle.material) material.dispose();
    this.apparatus.dispose();
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
      uApexDrift: { value: new THREE.Vector2(0, 0) },
      uDescent: { value: 0 },
      uEject: { value: 0.58 },
      uPhase: { value: 0 },
      uEjectStart: { value: 0.06 },
      uEjectEnd: { value: 0.39 },
      uFill: { value: 1 },
      uTime: { value: 0 },
      uOpacity: { value: 0.55 },
      // The reference is only ever shown in comparison mode, where the vessels
      // are hidden, so its outflow always fades quickly.
      uExitFalloff: { value: 3.5 },
      uEjectEmphasis: { value: 0 },
      uResidualEmphasis: { value: 0 },
      uParticleScale: { value: 0.13 },
      uHeightScale: { value: 900 },
      uFlowColor: { value: muted },
      uStaticColor: { value: mutedResidual },
    },
  });
}
