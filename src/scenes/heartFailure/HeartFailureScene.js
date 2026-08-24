import * as THREE from 'three';
import { Chamber } from './Chamber.js';
import { BloodField } from './BloodField.js';
import { Vessels } from './Vessels.js';
import { ANATOMY, ANCHORS, buildCavityBlood, buildCongestionPool } from './anatomy.js';
import {
  sampleHemodynamics,
  muscleVolumeFor,
  ventricleShape,
  cavityVolumeAt,
} from './hemodynamics.js';
import {
  STAGES,
  LEGEND,
  RANGE,
  PALETTE,
  ANNOTATIONS,
  DISCLAIMER,
  DISCLAIMER_JA,
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
    subtitle: 'Left ventricular remodelling · simplified 3D model',
    subtitleJa: '左室リモデリングとうっ血 ｜ 教育用3Dモデル',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    palette: PALETTE,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
  };

  static cameraPose = {
    // The scene is tall (apex to aortic arch), so it needs more distance than
    // its width alone would suggest.
    position: new THREE.Vector3(0.0, -2.2, 0.3).addScaledVector(VIEW_DIRECTION, 26.5),
    target: new THREE.Vector3(0.0, -2.2, 0.3),
  };

  constructor({ viewer }) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = HeartFailureScene.meta.id;
    this.progress = 0;
    this.phase = 0; // position in the cardiac cycle, 0..1
    this.state = sampleHemodynamics(0);
    this.muscleVolume = muscleVolumeFor(this.state);
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
    this.congestion = new BloodField(buildCongestionPool(compact ? 450 : 800), {
      flowColor: PALETTE.congestion,
      staticColor: PALETTE.congestion,
      normalised: false,
    });
    this.congestion.setFill(0);
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
    this.muscleVolume = muscleVolumeFor(this.state);
    this.congestion.setFill(this.state.congestion);
    this.vessels.setProgress(value, this.state.congestion);
  }

  update(dt, elapsed) {
    // The heart keeps beating even when the progression slider is paused.
    this.phase = (this.phase + (dt * this.state.heartRate) / 60) % 1;
    this._applyShape();
    this.blood.setCycle(this.phase, this.state.ejectionFraction);
    this.blood.update(elapsed);
    this.congestion.update(elapsed);
  }

  _applyShape() {
    const cavityVolume = cavityVolumeAt(this.phase, this.state);
    const shape = ventricleShape({
      cavityVolume,
      muscleVolume: this.muscleVolume,
      sphericity: this.state.sphericity,
    });
    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.blood.setCavity(shape.cavityRadius, shape.cavitySemiLength);
    this.shape = shape;
  }

  /** Live read-out shown next to the 3D view. */
  getMetrics() {
    const { edv, esv, strokeVolume, ejectionFraction, heartRate } = this.state;
    return [
      {
        id: 'ef',
        label: 'Ejection fraction',
        labelJa: '駆出率 (EF)',
        value: Math.round(ejectionFraction * 100),
        unit: '%',
        emphasis: true,
      },
      { id: 'edv', label: 'End-diastolic volume', labelJa: '拡張末期容積', value: Math.round(edv), unit: 'mL' },
      { id: 'esv', label: 'End-systolic volume', labelJa: '収縮末期容積', value: Math.round(esv), unit: 'mL' },
      { id: 'sv', label: 'Stroke volume', labelJa: '1回拍出量', value: Math.round(strokeVolume), unit: 'mL' },
      {
        id: 'wall',
        label: 'Wall thickness',
        labelJa: '壁厚（拡張末期）',
        value: this.state.wall.toFixed(1),
        unit: 'mm',
      },
      { id: 'hr', label: 'Heart rate', labelJa: '心拍数', value: Math.round(heartRate), unit: '/min' },
    ];
  }

  getStageView(stageId) {
    switch (stageId) {
      case 'hypertrophy':
        return framing(new THREE.Vector3(1.6, -0.4, 0.6), 16);
      case 'dilation':
        return framing(new THREE.Vector3(0.1, -1.0, 0.3), 21);
      case 'reduced-ef':
        return framing(new THREE.Vector3(0.2, -0.4, 0.4), 22);
      case 'congestion':
        return framing(new THREE.Vector3(-2.4, 3.4, -1.0), 18);
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
