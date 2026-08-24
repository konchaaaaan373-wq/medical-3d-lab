import * as THREE from 'three';
import { Chamber } from './Chamber.js';
import { BloodField } from './BloodField.js';
import { Vessels } from './Vessels.js';
import { CongestionOverlay } from './CongestionOverlay.js';
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
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
} from '../../data/heartFailure.js';
import { disposeObject } from '../../utils/dispose.js';

/** Direction the hero shot looks from — into the cut wedge. */
const VIEW_DIRECTION = new THREE.Vector3(0.4, 0.24, 0.88).normalize();

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

    this.root.add(this._createLights(), this.vessels, this.ventricle, this.blood, this.congestion);

    this._offResize = this.viewer.onResize((camera, renderer) => {
      this.blood.syncViewport(camera, renderer);
      this.congestion.syncViewport(camera, renderer);
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
    this.congestion.setPressure(this.state.fillingPressureIndex);
    this.vessels.setFillingPressure(this.state.fillingPressureIndex);
  }

  update(dt, elapsed) {
    // The heart keeps beating even when the progression slider is paused.
    this.phase = advanceCardiacPhase(this.phase, dt, this.state.hr);
    this._applyShape();
    this.blood.setCycle(this.phase, this.state.ejectionFraction);
    this.blood.update(elapsed);
    this.congestion.update(elapsed);
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
      fillingPressureIndex,
    } = this.state;
    const pressure = fillingPressureLabel(fillingPressureIndex);
    return [
      {
        id: 'ef',
        label: 'Ejection fraction',
        labelJa: '駆出率 (EF)',
        value: Math.round(ejectionFraction * 100),
        unit: '%',
        emphasis: true,
      },
      { id: 'edv', label: 'End-diastolic volume', labelJa: '拡張末期容積', value: Math.round(edvMl), unit: 'mL' },
      { id: 'esv', label: 'End-systolic volume', labelJa: '収縮末期容積', value: Math.round(esvMl), unit: 'mL' },
      { id: 'sv', label: 'Stroke volume', labelJa: '1回拍出量', value: Math.round(strokeVolumeMl), unit: 'mL' },
      { id: 'hr', label: 'Heart rate', labelJa: '心拍数', value: Math.round(hr), unit: '/min' },
      {
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量',
        value: cardiacOutputLMin.toFixed(1),
        unit: 'L/min',
      },
      {
        id: 'wall',
        label: 'Wall thickness (ED)',
        labelJa: '壁厚（拡張末期）',
        value: wallMm.toFixed(1),
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

  getStageView(stageId) {
    switch (stageId) {
      case 'concentric-remodeling':
        return framing(new THREE.Vector3(1.6, -0.6, 0.6), 19);
      case 'dilation':
        return framing(new THREE.Vector3(0.1, -1.2, 0.3), 23);
      case 'systolic-dysfunction':
        return framing(new THREE.Vector3(0.2, -0.8, 0.4), 24);
      case 'congestion':
        // Keep the ventricle in frame: the pressure has to be seen coming FROM
        // the left ventricle, not floating in the lung on its own.
        return framing(new THREE.Vector3(-1.7, 1.2, -0.4), 24);
      default:
        return null;
    }
  }

  getAnnotations() {
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: ANCHORS[annotation.anchor].clone(),
    }));
  }

  dispose() {
    this._offResize?.();
    disposeObject(this.root);
  }
}
