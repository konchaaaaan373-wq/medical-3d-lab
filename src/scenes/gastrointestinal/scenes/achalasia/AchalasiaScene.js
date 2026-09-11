import * as THREE from 'three';

import {
  ANNOTATIONS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEGEND,
  METRICS,
  MODEL_CONTROLS,
  MODEL_CONTROLS_COPY,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  RELATED,
  STAGES,
  VISUAL_MAPPING,
} from '../../../../data/achalasia.js';
import {
  CAPACITY_ML,
  DEFAULT_CONTROLS,
  solveAchalasia,
  waveAt,
} from '../../../../models/achalasia.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { wallMaterial, tissueMaterial } from '../../../shared/materials.js';
import {
  CONSTRICTIONS,
  ESOPHAGUS_PATH,
  buildEsophagusParts,
  esophagusCalibre,
  esophagusPath,
} from '../../organs/esophagusParts.js';

/**
 * A swallow that does not get through.
 *
 * ### The geometry is not this scene's
 *
 * `buildEsophagusParts` belongs to the oesophagus **atlas** and is used here as
 * it stands, for the neighbours that make the tube legible — the trachea in
 * front, the arch crossing behind, the diaphragm it passes through — and for
 * the path itself. What this scene adds on top is a second tube built from the
 * *same curve*, whose calibre the model writes: the travelling squeeze, the
 * dilatation above a column, and the ring at the bottom opening or not.
 *
 * Two tubes rather than one because the atlas's is cut into named parts and
 * must stay that way; a disease is not entitled to redraw an atlas.
 *
 * ### The one axis, and why it moves two things
 *
 * `setProgress` moves the failure of the ring and the failure of the wave
 * together, because one loss produces both. The mapping is not linear and the
 * data file says why: the band in which a retained column can still make up the
 * difference is narrow, and a linear axis would cross it in a twentieth of its
 * travel. Each failure is also a control of its own.
 */
export class AchalasiaScene {
  static meta = {
    id: 'achalasia',
    status: 'alpha',
    title: 'Achalasia: a wave that stops and a ring that does not open',
    titleJa: 'アカラシア：途中で止まる波と、開かない輪',
    subtitle: 'One swallow model · what is retained supplies the pressure the wave no longer does',
    subtitleJa: '1 つの嚥下モデル ｜ 貯留した内容物が、波の失った圧を肩代わりします',
    stages: STAGES,
    related: RELATED,
    visualMapping: VISUAL_MAPPING,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    modelScope: MODEL_SCOPE,
    modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    position: new THREE.Vector3(1.4, 0.5, 9.0),
    target: new THREE.Vector3(0.05, -0.1, 0),
  };

  /**
   * Where the axis puts the two failures.
   *
   * Piecewise linear, with the middle of the axis spent inside the band where a
   * column can still balance the swallow. The corners are the band's own edges,
   * read off the model rather than picked: below 0.52 nothing is retained and
   * above 0.70 nothing balances.
   */
  static FAILURE_CURVE = Object.freeze([
    { at: 0, failure: 0 },
    { at: 0.3, failure: 0.64 },
    { at: 0.8, failure: 0.84 },
    { at: 1, failure: 1 },
  ]);

  /** How much of the wave is lost for each unit of relaxation failure. */
  static VIGOUR_LOSS = 0.95;

  /** How long one swallow takes on screen, in seconds. */
  static SWALLOW_PERIOD_S = 5.5;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = AchalasiaScene.meta.id;
    this.progress = 0;
    this.controls = { ...DEFAULT_CONTROLS };
    this.phase = 0;
    this.solved = solveAchalasia(this.controls);
  }

  build() {
    // The atlas, for the neighbours and the path. Its own tube is kept — it is
    // what the named parts are — and made quiet, because the tube this scene
    // animates is drawn over it.
    this.atlas = buildEsophagusParts({ colors: { trachea: PALETTE.neighbour }, opacity: 0.18 });
    this.curve = esophagusPath();

    /**
     * The tube the model writes, built on the atlas's own curve.
     *
     * Rebuilt every frame the calibre changes, because that is the subject: the
     * squeeze travels, the lower end widens, and both are a radius as a function
     * of position along the same path the atlas uses.
     */
    this.lumen = new TubeSurface(this.curve, { radius: (u) => esophagusCalibre()(u), steps: 220, radial: 20 });
    // Half-transparent, because the subject is what is standing *inside* it.
    // At full opacity the column was drawn and then hidden by the tube around
    // it, and the step that says "watch the column" pointed at a wall.
    this.lumenMaterial = wallMaterial({ color: PALETTE.esophagus, opacity: 0.46 });
    this.lumenMesh = new THREE.Mesh(this.lumen.geometry, this.lumenMaterial);
    this.lumenMesh.name = 'oesophageal-wall';

    // What is standing in it. A second tube along the lower part of the same
    // path, as tall as the model's column.
    this.columnSurface = new TubeSurface(this.curve, { radius: (u) => esophagusCalibre()(u), steps: 180, radial: 16 });
    this.columnMaterial = tissueMaterial({
      color: PALETTE.retained,
      roughness: 0.3,
      emissive: PALETTE.retained,
      emissiveIntensity: 0.16,
      opacity: 0.8,
    });
    this.columnMesh = new THREE.Mesh(this.columnSurface.geometry, this.columnMaterial);
    this.columnMesh.name = 'retained-column';

    // The ring at the bottom, at the diaphragmatic narrowing the atlas places.
    const sphincterAt = CONSTRICTIONS[2].at;
    this.sphincterAt = sphincterAt;
    this.sphincterGeometry = new THREE.TorusGeometry(0.2, 0.055, 12, 30);
    this.sphincterMaterial = tissueMaterial({
      color: PALETTE.sphincter,
      roughness: 0.34,
      emissive: PALETTE.sphincter,
      emissiveIntensity: 0.22,
    });
    this.sphincter = new THREE.Mesh(this.sphincterGeometry, this.sphincterMaterial);
    this.sphincter.name = 'lower-oesophageal-sphincter';
    this.sphincter.position.copy(this.curve.getPointAt(sphincterAt));
    this.sphincter.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      this.curve.getTangentAt(sphincterAt).normalize()
    );

    this.root.add(createStudioLights(), this.atlas.object, this.lumenMesh, this.columnMesh, this.sphincter);
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = a normal swallow, 1 = neither works */
  setProgress(value) {
    this.progress = clamp(value);
    const failure = AchalasiaScene.failureAt(this.progress);
    this.controls.relaxationFailure = failure;
    this.controls.peristalticVigour = Math.max(0, 1 - AchalasiaScene.VIGOUR_LOSS * failure);
    this.solve();
  }

  /** The axis's own mapping. Exported as a static so a test can read it. */
  static failureAt(progress) {
    const curve = AchalasiaScene.FAILURE_CURVE;
    const at = clamp(progress);
    for (let index = 1; index < curve.length; index += 1) {
      const previous = curve[index - 1];
      const next = curve[index];
      if (at <= next.at) {
        const span = next.at - previous.at;
        const t = span > 0 ? (at - previous.at) / span : 0;
        return lerp(previous.failure, next.failure, t);
      }
    }
    return 1;
  }

  setModelControl(id, value) {
    this.controls[id] = value;
    this.solve();
  }

  getModelControls() {
    return MODEL_CONTROLS.map((control) => ({ ...control, value: this.controls[control.id] }));
  }

  resetModelControls() {
    this.controls = { ...DEFAULT_CONTROLS };
    this.setProgress(this.progress);
  }

  solve() {
    this.solved = solveAchalasia(this.controls);
    this.applyModelToScene();
  }

  update(dt) {
    this.phase = (this.phase + dt / AchalasiaScene.SWALLOW_PERIOD_S) % 1;
    this.applyModelToScene();
  }

  // --- reading the model into the scene --------------------------------------

  /**
   * The wall's radius along the tube.
   *
   * Three things, and they are three separate readings of the solve. The
   * resting calibre is the atlas's. The travelling squeeze narrows it where the
   * model says the wave currently is. And everything below the top of the
   * retained column is widened, because that is where the tube has given.
   */
  radiusAt(u) {
    const base = esophagusCalibre()(u);
    const wave = waveAt(this.phase, this.controls.peristalticVigour);
    const nearWave = Math.exp(-Math.pow((u - wave.at) / 0.07, 2));
    const squeezed = base * (1 - 0.55 * wave.depth * nearWave);

    const solved = this.solved;
    const columnTop = this.columnTopU();
    // Dilated between the column's top and the ring, tapering off at both ends
    // so the tube does not step. **It stops at the ring**: what is past the
    // sphincter is not holding anything, and an earlier version widened it too,
    // which drew a bulge below the blockage — the opposite of the claim.
    const above = u > columnTop ? 1 : Math.exp(-Math.pow((columnTop - u) / 0.1, 2));
    const withinTube = u < this.sphincterAt ? 1 : Math.exp(-Math.pow((u - this.sphincterAt) / 0.03, 2));
    const dilated = 1 + 1.15 * solved.filledFraction * above * withinTube;
    return squeezed * dilated;
  }

  /** Where the top of the retained column sits along the tube, 0..1. */
  columnTopU() {
    const filled = this.solved?.filledFraction ?? 0;
    if (filled <= 0) return 1.2;
    // The column stands on the sphincter and rises towards the throat.
    return this.sphincterAt - filled * this.sphincterAt;
  }

  columnRadiusAt(u) {
    const top = this.columnTopU();
    if (u < top || u > this.sphincterAt) return 0.0001;
    return this.radiusAt(u) * 0.82;
  }

  applyModelToScene() {
    if (!this.lumen) return;
    // `refresh` rewrites the surface from the same path, which is what these
    // two are: one radius profile that the model and the swallow phase write
    // together, and one that is the column standing in it.
    this.lumen.refresh((u) => this.radiusAt(u));
    this.columnSurface.refresh((u) => this.columnRadiusAt(u));

    // The ring opens by as much as the model says it relaxes, during the part
    // of the cycle a swallow is arriving. Presentation of a pressure, and the
    // visual mapping says so — the model has no aperture in it.
    const relaxed = 1 - this.solved.sphincterPressureMmHg / 25;
    const arriving = this.phase > 0.45 && this.phase < 0.8 ? 1 : 0;
    const open = 1 + 0.5 * clamp(relaxed) * arriving;
    this.sphincter.scale.set(open, open, 1);
    this.sphincterMaterial.emissiveIntensity = 0.12 + 0.3 * (1 - clamp(relaxed));
    this.columnMaterial.opacity = this.solved.filledFraction > 0.01 ? 0.82 : 0;
  }

  // --- what the interface reads --------------------------------------------

  /**
   * Framings a guided explanation may ask for. Presentation only.
   *
   * The tube is five world units tall and two of the steps are about one end of
   * it, so `ring` comes in on the bottom third. `whole` is the scene's own shot
   * pulled back far enough that the console and the nav do not take the ends of
   * it — measured, not guessed.
   */
  static guideFramings = Object.freeze({
    whole: Object.freeze({
      target: new THREE.Vector3(0.05, -0.35, 0),
      distance: 12.8,
      direction: new THREE.Vector3(1.35, 0.6, 9.0).normalize(),
    }),
    ring: Object.freeze({
      target: new THREE.Vector3(0.1, -1.1, 0),
      distance: 10.0,
      direction: new THREE.Vector3(1.35, 0.6, 9.0).normalize(),
    }),
  });

  getGuideFramings() {
    return AchalasiaScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const wave = waveAt(this.phase, this.controls.peristalticVigour);
    const positions = {
      // Follows the wave, but not all the way to either end: a label that runs
      // off the top of the frame points at nothing, and the wave spends part of
      // every cycle up there.
      wave: this.curve.getPointAt(clamp(wave.at, 0.15, 0.88)).clone().add(new THREE.Vector3(-1.15, 0.1, 0.4)),
      sphincter: this.curve.getPointAt(this.sphincterAt).clone().add(new THREE.Vector3(1.15, -0.1, 0.4)),
      // The middle of what is standing there, not its top. The top is the right
      // place to *look* and the wrong place to put a label: as the tube fills,
      // the top rises to the throat and a shot framed on the ring has left it
      // behind. Clamped so it stays on the column rather than running off it.
      retained: this.curve
        .getPointAt(clamp((Math.max(0, this.columnTopU()) + this.sphincterAt) / 2, 0.58, this.sphincterAt))
        .clone()
        .add(new THREE.Vector3(-1.25, 0.05, 0.45)),
      hiatus: this.curve.getPointAt(this.sphincterAt).clone().add(new THREE.Vector3(-1.3, 0.35, 0.3)),
    };
    return ANNOTATIONS.flatMap((annotation) => {
      const position = positions[annotation.anchor];
      return position ? [{ ...annotation, position: position.clone() }] : [];
    });
  }

  getMetrics() {
    const solved = this.solved;
    const reach = waveAt(1, this.controls.peristalticVigour).at;
    const value = {
      cleared: Math.round(solved.clearedFraction * 100),
      retained: Math.round(solved.retainedVolumeMl),
      height: solved.columnHeightCm.toFixed(1),
      columnPressure: solved.columnPressureMmHg.toFixed(1),
      wave: solved.wavePressureMmHg.toFixed(0),
      sphincter: solved.sphincterPressureMmHg.toFixed(1),
      reach: Math.round(reach * 100),
      balanced: solved.balanced ? 'yes' : 'no',
    };
    const valueJa = { balanced: solved.balanced ? 'する' : 'しない' };
    return METRICS.map((metric) => ({
      ...metric,
      value: value[metric.id],
      ...(valueJa[metric.id] != null ? { valueJa: valueJa[metric.id] } : {}),
    }));
  }

  dispose() {
    this.lumen?.dispose();
    this.columnSurface?.dispose();
    this.lumenMaterial?.dispose();
    this.columnMaterial?.dispose();
    this.sphincterGeometry?.dispose();
    this.sphincterMaterial?.dispose();
    this.atlas?.dispose();
    disposeObject(this.root);
  }
}

/** Kept so the path constant is reachable from a test without the atlas. */
export { ESOPHAGUS_PATH, smoothCurve, CAPACITY_ML };
