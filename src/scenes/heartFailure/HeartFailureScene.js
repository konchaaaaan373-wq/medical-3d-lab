import * as THREE from 'three';
import { Chamber } from './Chamber.js';
import { ValveApparatus } from './ValveApparatus.js';
import { CavityOutline } from './CavityOutline.js';
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
import {
  STORY_DURATION,
  STORY_STEPS,
  STORY_CUES,
  STORY_CHAPTERS,
  stepAt,
  cardiacPhaseAt as storyCardiacPhaseAt,
  cameraAt as storyCameraAt,
  captionAt as storyCaptionAt,
  emphasisAt as storyEmphasisAt,
  revealAt as storyRevealAt,
  outlineAt as storyOutlineAt,
  contextAt as storyContextAt,
  beatDrivenAt,
  beatNamedAt,
} from './storyboard.js';
import { ANATOMY, ANCHORS, buildCavityBlood } from './anatomy.js';
import { APEX_PINNING, TORSION_ILLUSTRATIVE_MAX, VENTRICLE_SHAPING } from './geometry/ventricleGeometry.js';
import {
  sampleHemodynamics,
  myocardialVolumeFor,
  ventricleShape,
  beatPhaseAt,
  cavityVolumeAt,
  advanceCardiacPhase,
  pressureVolumeCurves,
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
  LEARNING_LABEL,
  LEARNING_MODULES,
  PRESSURE_VOLUME_LABEL,
  PRESSURE_WAVE_LABEL,
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
    titleJa: '心不全',
    subtitle: 'Illustrative LV remodeling in HFrEF · simplified 3D model',
    subtitleJa: '左室リモデリング',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    comparison: COMPARISON_LABEL,
    reel: REEL_LABEL,
    learning: LEARNING_LABEL,
    pressureVolume: PRESSURE_VOLUME_LABEL,
    pressureWave: PRESSURE_WAVE_LABEL,
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
    /**
     * How much of the congestion the overlay is currently allowed to draw.
     *
     * Visualization only, and it can only ever scale *down* what the model
     * produced — pressure first, then fluid. The guided sequence uses it to
     * reveal the chain in the order it happens (filling pressure rises, that
     * pressure reaches the pulmonary side, fluid follows) instead of showing
     * the finished state all at once. It never creates congestion the state
     * does not have.
     */
    this.congestionReveal = { front: 1, fluid: 1 };
    /**
     * Exploratory multipliers on the circulation model's inputs. 1 is the
     * disease state as modelled; moving them scales circulating volume and
     * systemic resistance so the Frank-Starling and afterload relationships can
     * be felt directly. They are inputs to the model, not overrides of its
     * outputs — EF, stroke volume and every pressure are still solved.
     */
    this.loading = { preload: 1, afterload: 1 };
    this.state = sampleHemodynamics(0, this.loading);
    // Recomputed whenever the disease state changes, then held constant through
    // each cardiac cycle — see hemodynamics.js for why the model is two-layer.
    this.myocardialVolumeMl = myocardialVolumeFor(this.state);
  }

  build() {
    const compact = window.innerWidth < 720 || (navigator.hardwareConcurrency ?? 8) <= 4;

    this.ventricle = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments: compact ? 40 : 56,
      profilePoints: compact ? 22 : 30,
      variant: 'disease',
    });

    this.vessels = new Vessels();
    this.apparatus = new ValveApparatus({ variant: 'disease' });

    this.blood = new BloodField(buildCavityBlood(compact ? 460 : 640), {
      flowColor: PALETTE.flow,
      staticColor: PALETTE.residual,
    });
    this.congestion = new CongestionOverlay(compact ? 34 : 52);
    // The cavity is a small, densely filled volume; full opacity reads as a
    // blob, and anything above roughly a third reads as confetti scattered over
    // the endocardium once the camera comes in close.
    this.blood.material.uniforms.uOpacity.value = 0.38;

    // Everything that belongs to the diseased heart lives in one group, so
    // comparison mode can slide it aside without touching the lights.
    this.primary = new THREE.Group();
    this.primary.name = 'diseased-heart';
    // Where the cavity wall was at end-diastole. Off outside the comparison,
    // where there is nothing to compare the stroke against.
    this.outline = new CavityOutline({ cutAngle: ANATOMY.cutAngle });
    this.outline.visible = false;
    this.comparisonOutline = false;
    this.storyOutline = 0;

    this.primary.add(this.vessels, this.ventricle, this.apparatus, this.blood, this.congestion, this.outline);
    this.root.add(this._createLights(), this.primary);
    this._quality = { segments: compact ? 40 : 56, profilePoints: compact ? 22 : 30 };
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

  /**
   * Three-point studio setup around the environment light: one soft warm key
   * from the upper front-right, a faint warm fill from the lower left so the
   * shadow side keeps its colour, and a cool rim from behind-left to cut the
   * silhouette off the dark backdrop. Directional key/rim give coherent form
   * shading across the whole chamber — a nearby point light was what made the
   * old surface read as plastic.
   */
  _createLights() {
    const group = new THREE.Group();
    group.name = 'lights';
    group.add(new THREE.HemisphereLight(0xffe3de, 0x18202e, 0.45));

    const key = new THREE.DirectionalLight(0xfff1e4, 2.3);
    key.position.set(7, 10, 12);
    // Cool rim from behind, to separate the heart from the background. Turned
    // down hard from 1.15, and the measurement is why: sweeping its intensity
    // and reading the frame back, the mean brightness along the silhouette
    // barely moved (47.1 to 47.9 across the whole range) while one specular
    // spot on the basal shoulder went from 243 to 212. At full strength this
    // light was contributing almost nothing to the separation it exists for,
    // and almost all of a pure-white blowout on a piece of muscle — the
    // brightest thing in the close-up. It also hid its own first reduction,
    // because a saturated highlight looks identical at 1.15 and at 0.62.
    const rim = new THREE.DirectionalLight(0x9bc2ff, 0.28);
    rim.position.set(-10, 4, -9);
    const fill = new THREE.PointLight(0xffc5c0, 60, 60, 2);
    fill.position.set(-5, -5, 9);
    group.add(key, rim, fill);
    return group;
  }

  setProgress(value) {
    this.progress = value;
    this._resolve();
  }

  /**
   * Multipliers on the model's loading conditions, both 1 by default.
   *
   * @param {{ preload?: number, afterload?: number }} loading
   */
  setLoading(loading) {
    this.loading = { ...this.loading, ...loading };
    this._resolve();
  }

  /** Re-solves the circulation and pushes the result into everything drawn. */
  _resolve() {
    this.state = sampleHemodynamics(this.progress, this.loading);
    this.myocardialVolumeMl = myocardialVolumeFor(this.state);
    // End-diastolic geometry for this state: the anchor for apex pinning
    // (annular descent is measured against the fullest moment of the beat).
    this.edShape = ventricleShape({
      cavityVolumeMl: this.state.edvMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: this.state.longToShortAxisRatio,
    });
    // The model is usable before anything is built — `getMetrics()` and the
    // pressure-volume curves need no GPU — so the visual half is skipped until
    // there is something to push it into.
    if (!this.congestion) return;
    // Both congestion inputs are pressures the model solved for, not a level
    // read off the stage: the overlay spreads with mean pulmonary venous
    // pressure, and interstitial fluid appears only once that pressure reaches
    // the range where transudation is expected.
    this.vessels.setCongestionLevel(this.state.congestionLevel);
    this.congestion.setCongestion(
      {
        pressureFront: this.state.congestionLevel,
        interstitialFluid: this.state.interstitialFluidLevel,
        atriumDistension: this.vessels.atriumDistension,
      },
      this.congestionReveal
    );
    this._applyOutlineShape();
    this.blood.setEjectionWindow(this.state.ejectionStartPhase, this.state.ejectionEndPhase);
    this._applyCongestionVisibility();
  }

  update(dt, elapsed) {
    // The heart keeps beating even when the progression slider is paused.
    if (!this.cardiacPhaseDriven) {
      this.phase = advanceCardiacPhase(this.phase, dt, this.state.hr);
    }
    this._applyShape();
    this._applyOutlineVisibility();
    this.blood.setCycle(this.phase, this.state.ejectionFraction);
    this.blood.update(elapsed);
    this.congestion.update(elapsed);
    if (this.comparing && this.reference) {
      this.reference.setPhase(this.phase);
      this.reference.update(elapsed);
    }
  }

  /**
   * Show the end-diastolic mark, 0..1. Presentation only: the mark itself is
   * the solved end-diastolic cavity and this only decides whether it is drawn.
   *
   * @param {number} value
   */
  setOutline(value) {
    this.storyOutline = value;
    this._applyOutlineVisibility();
  }

  _applyOutlineVisibility() {
    const wanted = Math.max(this.comparisonOutline ? 1 : 0, this.storyOutline ?? 0);
    // The mark is only worth drawing once the wall has left it. At end-diastole
    // it lies exactly on the lining, where it would be a grid over the cavity
    // and nothing else; through systole it emerges as the gap opens. The
    // fraction is the model's own emptying, so what fades in is the stroke.
    this.outline?.setOpacity(wanted * this._emptiedFraction());
    this.reference?.setOutline(this.comparing ? this.reference.emptiedFraction() : 0);
  }

  /** How far through its stroke the cavity is right now, 0 at ED, 1 at ES. */
  _emptiedFraction() {
    const { edvMl, esvMl } = this.state;
    const volume = cavityVolumeAt(this.phase, this.state);
    return Math.min(1, Math.max(0, (edvMl - volume) / Math.max(1, edvMl - esvMl)));
  }

  /**
   * The end-diastolic mark, re-cut whenever the state changes. It follows the
   * solved EDV — nothing about it is drawn by hand.
   */
  _applyOutlineShape() {
    if (!this.outline) return;
    this.outline.setShape({
      ...ventricleShape({
        cavityVolumeMl: this.state.edvMl,
        myocardialVolumeMl: this.myocardialVolumeMl,
        longToShortAxisRatio: this.state.longToShortAxisRatio,
      }),
      baseY: ANATOMY.baseY,
    });
  }

  _applyShape() {
    const cavityVolumeMl = cavityVolumeAt(this.phase, this.state);
    const shape = ventricleShape({
      cavityVolumeMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: this.state.longToShortAxisRatio,
    });

    // Contraction runs base-toward-apex: the apex stays put while the annulus
    // descends. The amount of long-axis shortening is the model's; only its
    // anchor point is chosen here (APEX_PINNING). Everything at the valve
    // plane — the rings, and the blood's frame of reference — rides along.
    const descent = (shape.outerSemiLength - this.edShape.outerSemiLength) * APEX_PINNING;
    this.ventricle.position.y = descent;
    // The blood's cavity frame descends too, but its exit/entry paths are
    // world-anchored to the drawn aorta and atrium — handled in the shader.
    this.blood.setDescent(descent);
    this.vessels.setAnnularDescent(descent);

    // Apical torsion, illustrative amplitude scaled by the solved beat: it
    // follows the emptying of the stroke and shrinks with ejection fraction —
    // a low-EF ventricle both shortens and twists less.
    this.ventricle.setTorsion(
      TORSION_ILLUSTRATIVE_MAX *
        this._emptiedFraction() *
        Math.min(1, this.state.ejectionFraction / 0.58)
    );

    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.apparatus.update({ ...shape, baseY: ANATOMY.baseY }, this.phase, this.state, descent);
    this.blood.setCavity(shape.cavityRadius, shape.cavitySemiLength);
    this.blood.setApexDrift(
      VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength,
      VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength
    );
    this.shape = shape;
  }

  /**
   * Live read-out shown next to the 3D view.
   *
   * Every figure here is an output of the circulation model, including the
   * pressures: nothing is a table look-up. Precision is deliberately coarse —
   * volumes to the nearest mL, pressures to the nearest mmHg, EF to a whole
   * percent — because the chamber is a truncated-ellipsoid approximation driven
   * by a lumped-parameter circulation, and anything finer would imply accuracy
   * the model does not have. Myocardial mass is computed internally but never
   * shown, for the same reason.
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
      endDiastolicPressureMmHg,
      systolicPressureMmHg,
      diastolicPressureMmHg,
      peakVentricularPressureMmHg,
      meanPulmonaryVenousPressureMmHg,
    } = this.state;
    // While comparing, each row also carries the healthy value it is measured
    // against — the same numbers the reference heart is drawn from.
    const ref = this.comparing ? sampleHemodynamics(0) : null;
    const mmHg = (value) => Math.round(value);
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
        id: 'lvedp',
        label: 'LV end-diastolic pressure',
        labelJa: '左室拡張末期圧',
        value: mmHg(endDiastolicPressureMmHg),
        reference: ref ? mmHg(ref.endDiastolicPressureMmHg) : undefined,
        unit: 'mmHg',
        emphasis: true,
      },
      {
        id: 'pvp',
        label: 'Mean pulmonary venous pressure',
        labelJa: '平均肺静脈圧',
        value: mmHg(meanPulmonaryVenousPressureMmHg),
        reference: ref ? mmHg(ref.meanPulmonaryVenousPressureMmHg) : undefined,
        unit: 'mmHg',
      },
      {
        id: 'bp',
        label: 'Arterial pressure',
        labelJa: '動脈圧',
        value: `${mmHg(systolicPressureMmHg)}/${mmHg(diastolicPressureMmHg)}`,
        reference: ref ? `${mmHg(ref.systolicPressureMmHg)}/${mmHg(ref.diastolicPressureMmHg)}` : undefined,
        unit: 'mmHg',
      },
      {
        id: 'lvp',
        // What the ventricle has to generate, as opposed to what the artery
        // sees. The two track each other while the valve is open and separate
        // as afterload rises, which is what the afterload lesson is about.
        label: 'LV peak systolic pressure',
        labelJa: '左室収縮期最高圧',
        value: mmHg(peakVentricularPressureMmHg),
        reference: ref ? mmHg(ref.peakVentricularPressureMmHg) : undefined,
        unit: 'mmHg',
      },
      {
        id: 'wall',
        label: 'Wall thickness (ED)',
        labelJa: '壁厚（拡張末期）',
        value: wallMm.toFixed(1),
        reference: ref ? ref.wallMm.toFixed(1) : undefined,
        unit: 'mm',
      },
    ];
  }

  /**
   * The two loading conditions the viewer may vary.
   *
   * They are exposed as *model inputs*: the app sends a value back through
   * `setModelControl` and the whole circulation is re-solved, so the read-out
   * and the geometry move together. Nothing downstream is nudged directly.
   */
  getModelControls() {
    return [
      {
        id: 'preload',
        label: 'Preload (circulating volume)',
        labelJa: '前負荷（循環血液量）',
        min: 0.85,
        max: 1.15,
        step: 0.01,
        value: this.loading.preload,
        format: (value) => `×${value.toFixed(2)}`,
      },
      {
        id: 'afterload',
        label: 'Afterload (systemic resistance)',
        labelJa: '後負荷（体血管抵抗）',
        min: 0.7,
        max: 1.4,
        step: 0.01,
        value: this.loading.afterload,
        format: (value) => `×${value.toFixed(2)}`,
      },
    ];
  }

  /** @param {'preload'|'afterload'} id @param {number} value */
  setModelControl(id, value) {
    this.setLoading({ [id]: value });
  }

  /** Resets both loading conditions to the modelled disease state. */
  resetModelControls() {
    this.setLoading({ preload: 1, afterload: 1 });
  }

  /**
   * The pressure-volume loop for the current state, with the two relationships
   * that generate it.
   *
   * This is the model's own working shown directly: the loop is the solved beat
   * plotted as pressure against volume, and it meets the end-systolic elastance
   * line at its top-left corner and the end-diastolic relation at its
   * bottom-right because those are the equations that produced it — not because
   * a curve was drawn to fit.
   */
  getPressureVolume() {
    const ref = this.comparing ? pressureVolumeCurves(0) : null;
    return {
      current: pressureVolumeCurves(this.progress, this.loading),
      reference: ref,
      phase: this.phase,
      // The same four names the 3D is labelled with, from the same phase and
      // the same solved valve times — so the plot and the heart never disagree
      // about which part of the beat is on screen.
      beat: this.getBeatPhase(),
    };
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
    this.congestion.visible =
      allowed && this.state.congestionLevel * this.congestionReveal.front > 0.02;
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

  /**
   * Where the beat currently is, named.
   *
   * Read from the same phase everything else is drawn from and from the same
   * solved valve timings, so the caption cannot describe a moment the geometry
   * is not in. Shown only while the beat is the subject — a permanent readout
   * would just be another thing on screen.
   *
   * @returns {ReturnType<typeof beatPhaseAt>}
   */
  getBeatPhase() {
    return beatPhaseAt(this.phase, this.state);
  }

  /**
   * The guided sequence for this scene.
   *
   * Data only: what the model is set to at each step, where the camera goes,
   * which label is pointed at, and what the caption says. `StoryMode` supplies
   * the machinery, so another scene can ship its own sequence by returning the
   * same shape.
   */
  getStory() {
    return {
      duration: STORY_DURATION,
      steps: STORY_STEPS,
      cues: STORY_CUES,
      chapters: STORY_CHAPTERS,
      viewDirection: VIEW_DIRECTION.clone(),
      stepAt,
      cardiacPhaseAt: storyCardiacPhaseAt,
      cameraAt: storyCameraAt,
      captionAt: storyCaptionAt,
      emphasisAt: storyEmphasisAt,
      revealAt: storyRevealAt,
      outlineAt: storyOutlineAt,
      contextAt: storyContextAt,
      beatDrivenAt,
      beatNamedAt,
    };
  }

  /**
   * Presentation emphasis on the two moments of the beat that carry the
   * teaching: blood leaving, and blood that did not.
   *
   * Visualization only — no model value changes, and both hearts get the same
   * treatment so a comparison stays a comparison.
   *
   * @param {{ ejection?: number, residual?: number }} emphasis
   */
  setBeatEmphasis(emphasis) {
    this.blood.setEmphasis(emphasis);
    this.reference?.setEmphasis(emphasis);
  }

  /**
   * Reveals the congestion overlay in causal order, 0..1 each.
   *
   * Both are multipliers on what the model solved, so 1 shows exactly the
   * state's own congestion and anything less shows part of it. Raising `front`
   * alone spreads the pressure field outward along atrium → pulmonary veins →
   * vascular bed, which is what transmitted pressure does; `fluid` is what
   * follows it. Blood is not involved in either, and never moves backwards.
   *
   * @param {{ front?: number, fluid?: number }} reveal
   */
  setCongestionReveal(reveal) {
    this.congestionReveal = { ...this.congestionReveal, ...reveal };
    this._resolve();
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
   * Guided lessons for this scene.
   *
   * Pure data: what to ask, what to move, what to watch. The lesson never
   * touches the model itself — it goes back through `setModelControl` and
   * `setProgress` like any other control, and reads its figures out of
   * `getMetrics()`. So a lesson cannot show a number the rest of the UI
   * disagrees with, and cannot teach a relationship the model does not have.
   */
  getLearningModules() {
    return LEARNING_MODULES.map((module) => ({
      ...module,
      transfer: {
        ...module.transfer,
        // Resolved here rather than written into the data, so the lesson stays
        // pointed at the right state if the stage boundaries ever move.
        progress: STAGES.find((stage) => stage.id === module.transfer.atStage).at,
      },
    }));
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

    // The stroke mark earns its place where a stroke is the subject: in the
    // comparison, and in the part of the sequence that is about how little
    // leaves. Outside those it is one more thing on screen.
    this.comparisonOutline = enabled;
    this._applyOutlineVisibility();

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
    this.apparatus?.dispose();
    disposeObject(this.root);
  }
}
