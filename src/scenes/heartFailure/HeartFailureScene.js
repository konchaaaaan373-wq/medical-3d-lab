import * as THREE from 'three';
import { Chamber } from './Chamber.js';
import { BloodField } from './BloodField.js';
import { Vessels } from './Vessels.js';
import { CongestionOverlay } from './CongestionOverlay.js';
import { ReferenceHeart } from './ReferenceHeart.js';
import {
  REEL_DURATION,
  REEL_CUES,
  cardiacPhaseAt,
  cameraAt,
  congestionVisibleAt,
  congestionEmphasisAt,
  overlayAt,
} from './reelStoryboard.js';
import { ANATOMY, ANCHORS, buildCavityBlood } from './anatomy.js';
import {
  sampleHemodynamics,
  myocardialVolumeFor,
  ventricleShape,
  cavityVolumeAt,
  advanceCardiacPhase,
  fillingPressureLabel,
} from './hemodynamics.js';
import {
  STAGES,
  LEGEND,
  RANGE,
  PROGRESS_LABEL,
  PALETTE,
  ANNOTATIONS,
  COMPARISON_ANNOTATIONS,
  COMPARISON_LABEL,
  REEL_LABEL,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
} from '../../data/heartFailure.js';
import { disposeObject } from '../../utils/dispose.js';

/** Direction the hero shot looks from — into the cut wedge. */
const VIEW_DIRECTION = new THREE.Vector3(0.4, 0.24, 0.88).normalize();

/**
 * Head-on direction used by the social sequence.
 *
 * The interactive comparison looks in from one side, which puts the right-hand
 * heart closer to the camera and makes it project larger. For a video whose
 * whole point is "these two differ", that is a visual bias: both hearts must be
 * the same distance from the camera, so the sequence looks straight down the
 * cut instead.
 */
const REEL_VIEW_DIRECTION = new THREE.Vector3(0, 0.2, 1).normalize();

/**
 * Where the sequence looks from during the congestion beat.
 *
 * That beat is not a comparison, so it is free to leave the head-on axis. It
 * rises above the heart rather than swinging to the side: the pulmonary veins
 * run backwards and away in a near-horizontal plane, so from above their whole
 * course is laid out, while a lateral view would both foreshorten them and
 * stack the two hearts one behind the other.
 */
const REEL_CONGESTION_DIRECTION = new THREE.Vector3(0.16, 0.5, 0.85).normalize();

/**
 * How far each heart moves aside in comparison mode, in scene units (cm).
 * Must leave clearance between the two chambers at every point on the slider —
 * asserted by tests/hemodynamics.test.js.
 */
export const COMPARISON_OFFSET = 5.4;

function framing(target, distance) {
  return {
    position: target.clone().addScaledVector(VIEW_DIRECTION, distance),
    target: target.clone(),
  };
}

/**
 * Scene module: "Heart failure".
 *
 * Implements the same interface as the amyloid-β scene (see
 * `docs/adding-a-scene.md`), plus the optional `getMetrics()` hook that the UI
 * uses to show a live haemodynamic read-out.
 *
 * The distinctive thing here is that nothing is animated by hand: the wall
 * thickness, chamber size, beat and the numbers on screen all come out of one
 * small haemodynamic model, so the picture and the read-out cannot disagree.
 */
export class HeartFailureScene {
  static meta = {
    id: 'heart-failure',
    title: 'Heart Failure',
    titleJa: '心不全 — 左室リモデリング',
    subtitle: 'Illustrative LV remodeling in HFrEF · simplified 3D model',
    subtitleJa: 'HFrEFでみられる左室リモデリングの一例 ｜ 教育用3Dモデル',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    comparison: COMPARISON_LABEL,
    reel: REEL_LABEL,
    palette: PALETTE,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    // The scene is tall (apex to aortic arch), so it needs more distance than
    // its width alone would suggest.
    position: new THREE.Vector3(-0.3, -1.8, 0.3).addScaledVector(VIEW_DIRECTION, 28),
    target: new THREE.Vector3(-0.3, -1.8, 0.3),
  };

  constructor({ viewer }) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = HeartFailureScene.meta.id;
    this.progress = 0;
    this.phase = 0; // position in the cardiac cycle, 0..1
    // When true the phase is supplied from outside (the reel drives it from
    // elapsed time so a recording is reproducible) instead of being integrated.
    this.cardiacPhaseDriven = false;
    /** Whether the congestion overlay may show while comparing. */
    this.congestionInComparison = true;
    /** Visualization-only presentation emphasis on the congestion story, 0..1. */
    this.congestionEmphasis = 0;
    this.state = sampleHemodynamics(0);
    // Recomputed whenever the disease state changes, then held constant through
    // each cardiac cycle — see hemodynamics.js for why the model is two-layer.
    this.myocardialVolumeMl = myocardialVolumeFor(this.state);
  }

  build() {
    const compact = window.innerWidth < 720 || (navigator.hardwareConcurrency ?? 8) <= 4;

    this.ventricle = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments: compact ? 36 : 48,
      profilePoints: compact ? 20 : 26,
      wallColor: new THREE.Color(PALETTE.myocardium),
      liningColor: new THREE.Color('#dd8c96'),
      cutColor: new THREE.Color('#7d2f3d'),
    });

    this.vessels = new Vessels();

    this.blood = new BloodField(buildCavityBlood(compact ? 1400 : 2000), {
      flowColor: PALETTE.flow,
      staticColor: PALETTE.residual,
    });
    this.congestion = new CongestionOverlay(compact ? 380 : 700);
    // The cavity is a small, densely filled volume; full opacity reads as a blob.
    this.blood.material.uniforms.uOpacity.value = 0.8;

    // Everything that belongs to the diseased heart lives in one group, so
    // comparison mode can slide it aside without touching the lights.
    this.primary = new THREE.Group();
    this.primary.name = 'diseased-heart';
    this.primary.add(this.vessels, this.ventricle, this.blood, this.congestion);
    this.root.add(this._createLights(), this.primary);
    this._quality = { segments: compact ? 36 : 48, profilePoints: compact ? 20 : 26 };
    this.comparing = false;

    this._offResize = this.viewer.onResize((camera, renderer) => {
      this.blood.syncViewport(camera, renderer);
      this.congestion.syncViewport(camera, renderer);
      this.reference?.syncViewport(camera, renderer);
    });

    this.setProgress(0);
    this._applyShape();
    return this.root;
  }

  _createLights() {
    const group = new THREE.Group();
    group.name = 'lights';
    group.add(new THREE.HemisphereLight(0xffd9dd, 0x141c2e, 0.9));

    const key = new THREE.PointLight(0xfff0e8, 220, 90, 2);
    key.position.set(7, 9, 14);
    const rim = new THREE.PointLight(0x8fc0ff, 120, 80, 2);
    rim.position.set(-10, 3, -9);
    const fill = new THREE.PointLight(0xffc2c8, 90, 60, 2);
    fill.position.set(-3, -6, 9);
    group.add(key, rim, fill);
    return group;
  }

  setProgress(value) {
    this.progress = value;
    this.state = sampleHemodynamics(value);
    this.myocardialVolumeMl = myocardialVolumeFor(this.state);
    this.congestion.setCongestionLevel(this.state.congestionLevel);
    this.vessels.setCongestionLevel(this.state.congestionLevel);
    this._applyCongestionVisibility();
  }

  update(dt, elapsed) {
    // The heart keeps beating even when the progression slider is paused.
    if (!this.cardiacPhaseDriven) {
      this.phase = advanceCardiacPhase(this.phase, dt, this.state.hr);
    }
    this._applyShape();
    this.blood.setCycle(this.phase, this.state.ejectionFraction);
    this.blood.update(elapsed);
    this.congestion.update(elapsed);
    if (this.comparing && this.reference) {
      this.reference.setPhase(this.phase);
      this.reference.update(elapsed);
    }
  }

  _applyShape() {
    const cavityVolumeMl = cavityVolumeAt(this.phase, this.state);
    const shape = ventricleShape({
      cavityVolumeMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: this.state.longToShortAxisRatio,
    });
    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.blood.setCavity(shape.cavityRadius, shape.cavitySemiLength);
    this.shape = shape;
  }

  /**
   * Live read-out shown next to the 3D view.
   *
   * Precision is deliberately coarse: volumes to the nearest mL, wall thickness
   * to 0.1 mm, EF to a whole percent. The chamber is a truncated-ellipsoid
   * approximation, so anything finer would imply accuracy the model lacks.
   * Myocardial mass is computed internally but not shown, for the same reason.
   */
  getMetrics() {
    const {
      edvMl,
      esvMl,
      strokeVolumeMl,
      ejectionFraction,
      cardiacOutputLMin,
      hr,
      wallMm,
      congestionLevel,
    } = this.state;
    const pressure = fillingPressureLabel(congestionLevel);
    // While comparing, each row also carries the healthy value it is measured
    // against — the same numbers the reference heart is drawn from.
    const ref = this.comparing ? sampleHemodynamics(0) : null;
    return [
      {
        id: 'ef',
        label: 'Ejection fraction',
        labelJa: '駆出率 (EF)',
        value: Math.round(ejectionFraction * 100),
        reference: ref ? Math.round(ref.ejectionFraction * 100) : undefined,
        unit: '%',
        emphasis: true,
      },
      { id: 'edv', label: 'End-diastolic volume', labelJa: '拡張末期容積', value: Math.round(edvMl), reference: ref ? Math.round(ref.edvMl) : undefined, unit: 'mL' },
      { id: 'esv', label: 'End-systolic volume', labelJa: '収縮末期容積', value: Math.round(esvMl), reference: ref ? Math.round(ref.esvMl) : undefined, unit: 'mL' },
      { id: 'sv', label: 'Stroke volume', labelJa: '1回拍出量', value: Math.round(strokeVolumeMl), reference: ref ? Math.round(ref.strokeVolumeMl) : undefined, unit: 'mL' },
      { id: 'hr', label: 'Heart rate', labelJa: '心拍数', value: Math.round(hr), reference: ref ? Math.round(ref.hr) : undefined, unit: '/min' },
      {
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量',
        value: cardiacOutputLMin.toFixed(1),
        reference: ref ? ref.cardiacOutputLMin.toFixed(1) : undefined,
        unit: 'L/min',
      },
      {
        id: 'wall',
        label: 'Wall thickness (ED)',
        labelJa: '壁厚（拡張末期）',
        value: wallMm.toFixed(1),
        reference: ref ? ref.wallMm.toFixed(1) : undefined,
        unit: 'mm',
      },
      {
        id: 'filling',
        label: 'LV filling pressure',
        labelJa: '左室充満圧',
        value: pressure.value,
        valueJa: pressure.valueJa,
        unit: '',
      },
    ];
  }

  /**
   * Hands the cardiac phase over to an external driver.
   *
   * SNS comparison visualization uses synchronized phase for side-by-side
   * interpretability: the reel computes one phase from elapsed time and both
   * hearts follow it, so they reach end-diastole and end-systole together even
   * though the model gives them different heart rates. The physiological model
   * itself is unchanged — normal interactive playback still integrates the
   * state's own rate.
   *
   * @param {boolean} driven
   */
  setCardiacPhaseDriven(driven) {
    this.cardiacPhaseDriven = driven;
  }

  /** @param {number} phase 0..1 */
  setCardiacPhase(phase) {
    this.phase = phase;
  }

  /**
   * Whether the congestion overlay is allowed while the comparison is on.
   * Off by default in comparison mode because it crowds a two-heart frame, but
   * the reel turns it on for the congestion beat.
   */
  setCongestionVisibleInComparison(visible) {
    this.congestionInComparison = visible;
    this._applyCongestionVisibility();
  }

  _applyCongestionVisibility() {
    const allowed = this.comparing ? this.congestionInComparison : true;
    this.congestion.visible = allowed && this.state.congestionLevel > 0.02;
    // Outside comparison the vessels are always drawn. Inside it they are
    // normally hidden to keep two hearts legible — but while the congestion
    // story is being emphasised they come back, because the pressure field is
    // only interpretable when the atrium and pulmonary veins it fills are
    // visible around it.
    this.vessels.visible = !this.comparing || this.congestionEmphasis > 0.02;
  }

  /**
   * Presentation emphasis on the pulmonary congestion story, 0..1.
   *
   * Visualization only. It changes nothing the model produces: `congestionLevel`
   * is untouched, no extra interstitial fluid is created, and blood still moves
   * only in the physiological direction. What it changes is legibility — the
   * pressure field brightens and its outward wave deepens, the atrium and
   * pulmonary veins become visible around it, and the healthy heart steps back
   * so attention lands on the side the pressure belongs to.
   *
   * @param {number} emphasis
   */
  setCongestionEmphasis(emphasis) {
    this.congestionEmphasis = emphasis;
    this.congestion.setPresentationEmphasis(emphasis);
    this.vessels.setPresentationEmphasis(emphasis);
    this.reference?.setPresence(1 - emphasis * 0.62);
    this._applyCongestionVisibility();
  }

  /** @returns {number} current position in the cardiac cycle, 0..1 */
  getCardiacPhase() {
    return this.phase;
  }

  /**
   * The 15-second social sequence for this scene.
   *
   * Everything specific to the content lives here; `ReelMode` supplies the
   * generic machinery, so another scene can add its own sequence by returning
   * the same shape.
   */
  getReel() {
    return {
      durationSeconds: REEL_DURATION,
      cues: REEL_CUES,
      // The state the video is about: the HFrEF stage, held for all 15 seconds
      // so the EF on screen never changes mid-video.
      progress: STAGES.find((stage) => stage.id === 'systolic-dysfunction').at,
      viewDirection: REEL_VIEW_DIRECTION.clone(),
      alternateViewDirection: REEL_CONGESTION_DIRECTION.clone(),
      framing: {
        // World half-extents the base framing must hold. Wider than the two
        // hearts actually are (about 9.8 either side) so the sequence's dolly-in
        // has somewhere to go: at its closest the pair fills the frame, and at
        // its widest there is breathing room for the opening headline.
        halfWidth: 12.4,
        halfHeight: 6.6,
        minimumDistance: 18,
        target: new THREE.Vector3(0, -2.2, 0.3),
      },
      cardiacPhaseAt,
      cameraAt,
      congestionVisibleAt,
      congestionEmphasisAt,
      overlayAt,
    };
  }

  /**
   * Side-by-side with a healthy ventricle.
   *
   * Built on first use rather than up front: it doubles the chamber geometry and
   * most viewers never turn it on, so phones should not pay for it by default.
   *
   * Vessels and the congestion overlay are hidden while comparing — the point of
   * the comparison is chamber geometry and emptying, and the surrounding anatomy
   * would only crowd two hearts into the same frame.
   *
   * @param {boolean} enabled
   */
  setComparison(enabled) {
    this.comparing = enabled;

    if (enabled && !this.reference) {
      this.reference = new ReferenceHeart(this.blood.geometry, this._quality);
      this.reference.syncViewport(this.viewer.camera, this.viewer.renderer);
      this.root.add(this.reference);
    }

    if (this.reference) {
      this.reference.setPresence(enabled ? 1 - this.congestionEmphasis * 0.62 : 0);
      this.reference.visible = enabled;
      this.reference.position.x = enabled ? -COMPARISON_OFFSET : 0;
      if (enabled) this.reference.setPhase(this.phase);
    }

    this.primary.position.x = enabled ? COMPARISON_OFFSET : 0;
    this.blood.setExitFalloff(enabled ? 3.5 : 1.2);
    // Comparison hides the overlay by default; the reel re-enables it for the
    // congestion beat via setCongestionVisibleInComparison().
    this.congestionInComparison = enabled ? false : true;
    this._applyCongestionVisibility();
  }

  /**
   * Wider framing that holds both hearts clear of the control panel.
   * Two hearts side by side are much wider than one, so a portrait phone needs
   * more distance than the app's usual aspect adjustment alone provides.
   */
  getComparisonView() {
    const portrait = this.viewer.camera.aspect < 0.85;
    return framing(new THREE.Vector3(0, portrait ? -2.6 : -3.8, 0.3), portrait ? 33 : 29);
  }

  getStageView(stageId) {
    switch (stageId) {
      case 'concentric-hypertrophy':
        return framing(new THREE.Vector3(1.6, -0.6, 0.6), 19);
      case 'dilation':
        return framing(new THREE.Vector3(0.1, -1.2, 0.3), 23);
      case 'systolic-dysfunction':
        // Framed to hold the ventricle *and* the atrium/pulmonary region, so the
        // congestion overlay is visible as something arising from the raised
        // filling pressure of this ventricle rather than as a separate scene.
        return framing(new THREE.Vector3(-1.0, -0.2, 0.2), 26);
      default:
        return null;
    }
  }

  getAnnotations() {
    return [...ANNOTATIONS, ...COMPARISON_ANNOTATIONS].map((annotation) => ({
      ...annotation,
      position: ANCHORS[annotation.anchor].clone(),
    }));
  }

  dispose() {
    this._offResize?.();
    this.reference?.dispose();
    disposeObject(this.root);
  }
}
