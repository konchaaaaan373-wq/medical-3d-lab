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
} from '../../../../data/rotatorCuffTear.js';
import { DEFAULT_CONTROLS, solveRotatorCuffTear } from '../../../../models/rotatorCuffTear.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { MEDIAL, SITES, SUBACROMIAL_DISPLAY_GAP, buildShoulderJoint } from '../../organs/shoulderJoint.js';

/**
 * A supraspinatus tear, told as a statement about what still holds the head.
 *
 * ### The gap under the arch is the atlas's, and it is a display value
 *
 * `SUBACROMIAL_DISPLAY_GAP` is imported rather than typed here, because the
 * number this scene reports a fraction of has to be the one the atlas actually
 * drew — and because the atlas's own comment is the reason the fraction is
 * reported as a fraction. In life the space is a few millimetres against a head
 * of several centimetres; the atlas opened it up until the tendon under the
 * arch could be seen, and **a share of an opened-up gap is not a distance**.
 *
 * ### The tendon is redrawn, the pair is lit, and the head is moved
 *
 * The atlas's supraspinatus tendon is an intact one, and a tear is a defect in
 * a sheet rather than an intact sheet elsewhere — so this scene hides it and
 * draws its own along the same course, in two pieces with a gap. Everything
 * else in the cuff is the atlas's, and the two tendons that face each other
 * across the sleeve are lit while the model says they are still doing their
 * job.
 */
export class RotatorCuffTearScene {
  static meta = {
    id: 'rotator-cuff-tear',
    status: 'alpha',
    title: 'Rotator cuff tear: what still holds the head down',
    titleJa: '腱板断裂：いま骨頭を保っているもの',
    subtitle: 'The whole width of one tendon can be gone with the head exactly where it was',
    subtitleJa: '1 本の腱が全幅失われても、骨頭は元の位置のままでありえます',
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
    position: new THREE.Vector3(-1.4, 1.2, 5.2),
    target: new THREE.Vector3(-0.1, 0.3, 0),
  };

  /** The course the atlas draws the tendon along, and this scene redraws on. */
  static TENDON_PATH = Object.freeze([
    [MEDIAL * 1.1, 0.5, -0.44],
    [MEDIAL * 0.55, 0.68, -0.26],
    [MEDIAL * 0.02, 0.74, -0.06],
    [-MEDIAL * 0.42, 0.58, 0.02],
  ]);

  /** Everything that belongs to the arm bone and rises with it. */
  static HUMERAL_PARTS = Object.freeze([
    'humeral-head',
    'greater-tubercle',
    'lesser-tubercle',
    'humeral-shaft',
  ]);

  /** The two the model counts as the pair, for lighting only. */
  static FACING_PAIR = Object.freeze(['subscapularis-tendon', 'infraspinatus-tendon', 'teres-minor-tendon']);

  static CONTEXT_OPACITY = Object.freeze({
    scapula: 0.26,
    clavicle: 0.16,
    'coracoid-process': 0.45,
    acromion: 0.62,
    'acromioclavicular-ligament': 0.2,
    'coracoclavicular-ligament': 0.2,
    'inferior-glenohumeral-ligament': 0.2,
    'humeral-shaft': 0.5,
  });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = RotatorCuffTearScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveRotatorCuffTear(this.controls);
    this.anchorVectors = {
      tendon: new THREE.Vector3(),
      couple: new THREE.Vector3(),
      head: new THREE.Vector3(),
      arch: new THREE.Vector3(),
    };
  }

  build() {
    this.shoulder = buildShoulderJoint({
      colors: {
        'supraspinatus-tendon': PALETTE.tendon,
        'humeral-head': PALETTE.head,
        acromion: PALETTE.arch,
      },
    });

    // The atlas's tendon is an intact one, and a tear is a defect in a sheet
    // rather than an intact sheet somewhere else.
    const intact = this.shoulder.mesh('supraspinatus-tendon');
    if (intact) intact.visible = false;

    this.tendonMaterial = tissueMaterial({ color: PALETTE.tendon, roughness: 0.44, emissiveIntensity: 0.18 });
    this.pieces = {
      medial: this.piece('supraspinatus-medial-edge'),
      lateral: this.piece('supraspinatus-lateral-edge'),
    };

    /**
     * The room there actually is between the top of the head and the underside
     * of the arch, measured off the meshes.
     *
     * The atlas's `SUBACROMIAL_DISPLAY_GAP` is what the acromion's height was
     * *chosen* to leave; this is what the drawing ended up with, and it is the
     * gap the model's fraction is applied to — so "the head rises three
     * quarters of the gap" is true of the picture and not only of the prose.
     */
    const head = this.shoulder.mesh('humeral-head');
    head.geometry.computeBoundingBox();
    this.displayGap = SITES.acromionUnder[1] - (head.position.y + head.geometry.boundingBox.max.y);

    this.restY = new Map();
    for (const id of RotatorCuffTearScene.HUMERAL_PARTS) {
      const mesh = this.shoulder.mesh(id);
      if (mesh) this.restY.set(id, { mesh, y: mesh.position.y });
    }
    for (const mesh of this.shoulder.cartilageMeshes ?? []) {
      if (mesh.name === 'humeral-cartilage') this.restY.set(mesh.name, { mesh, y: mesh.position.y });
    }

    // The space itself, drawn as a thing.
    //
    // Without it the scene's last change is invisible: the gap under the arch
    // is a tenth of a unit on an atlas whose head is half a unit across, so a
    // head rising three quarters of it moves about eight pixels. A band that
    // *thins* is legible where a translation of that size is not, and it is the
    // space the whole claim is about.
    this.gapGeometry = new THREE.CylinderGeometry(0.26, 0.3, 1, 24, 1, true);
    this.gapMaterial = tissueMaterial({ color: PALETTE.arch, opacity: 0.34, roughness: 0.5 });
    this.gapMaterial.side = THREE.DoubleSide;
    this.gapMaterial.depthWrite = false;
    this.gapBand = new THREE.Mesh(this.gapGeometry, this.gapMaterial);
    this.gapBand.name = 'the-space-under-the-arch';

    this.root.add(createStudioLights(), this.shoulder.object, this.gapBand);
    for (const piece of Object.values(this.pieces)) this.root.add(piece.mesh);
    this.applyModelToScene();
    return this.root;
  }

  /** One redrawable strap. Flattened, because a cuff tendon is a sheet. */
  piece(name) {
    const surface = new TubeSurface(smoothCurve(RotatorCuffTearScene.TENDON_PATH.map((point) => [...point])), {
      radius: () => 0.14,
      steps: 26,
      radial: 14,
    });
    const mesh = new THREE.Mesh(surface.geometry, this.tendonMaterial);
    mesh.scale.set(1, 0.5, 1);
    mesh.name = name;
    return { surface, mesh };
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = the tendon whole, 1 = gone across its width */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.tear = this.progress;
    this.solve();
  }

  setModelControl(id, value) {
    this.controls[id] = value;
    this.solve();
  }

  getModelControls() {
    return MODEL_CONTROLS.map((control) => ({ ...control, value: this.controls[control.id] }));
  }

  resetModelControls() {
    this.controls = { ...DEFAULT_CONTROLS, tear: this.progress };
    this.solve();
  }

  solve() {
    this.solved = solveRotatorCuffTear(this.controls);
    this.applyModelToScene();
  }

  update() {}

  /** How far the head has risen, in the atlas's units. */
  rise() {
    return this.solved.riseFraction * (this.displayGap ?? SUBACROMIAL_DISPLAY_GAP);
  }

  /** The two pieces of tendon, with a gap that widens as the defect does. */
  writeTendon() {
    const solved = this.solved;
    const full = smoothCurve(RotatorCuffTearScene.TENDON_PATH.map((point) => [...point]));
    const gap = 0.62 * solved.defectFraction;
    const reach = Math.max(0.06, 0.5 - gap / 2);
    for (const [key, from, to] of [
      ['medial', 0, reach],
      ['lateral', 1 - reach, 1],
    ]) {
      const points = [];
      for (let step = 0; step <= 6; step += 1) {
        points.push(full.getPointAt(lerp(from, to, step / 6)).toArray());
      }
      const piece = this.pieces[key];
      piece.surface.curve = smoothCurve(points);
      piece.surface.resample();
      piece.surface.refresh(() => 0.14);
      piece.mesh.position.y = this.rise();
    }
    this.tendonMaterial.color.set(PALETTE.tendon).lerp(new THREE.Color(PALETTE.torn), clamp(solved.defectFraction));
  }

  /**
   * The band between the top of the head and the underside of the arch.
   *
   * Its height is what is left of the drawn gap, so it thins as the head rises
   * — and it is the reason the last step of the walk can be seen at all.
   */
  writeGapBand() {
    const under = SITES.acromionUnder[1];
    const headTop = under - this.displayGap + this.rise();
    const height = Math.max(0.008, under - headTop);
    this.gapBand.scale.set(1, height, 1);
    this.gapBand.position.set(SITES.humeralHead[0], headTop + height / 2, SITES.humeralHead[2] + 0.02);
    this.gapMaterial.color
      .set(PALETTE.arch)
      .lerp(new THREE.Color(PALETTE.torn), clamp(this.solved.riseFraction * 1.2));
    this.gapMaterial.opacity = 0.28 + 0.3 * clamp(this.solved.riseFraction);
  }

  applyModelToScene() {
    if (!this.shoulder) return;
    const solved = this.solved;

    for (const [id, opacity] of Object.entries(RotatorCuffTearScene.CONTEXT_OPACITY)) {
      const material = this.shoulder.mesh(id)?.material;
      if (!material) continue;
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
    }

    const rise = this.rise();
    for (const { mesh, y } of this.restY.values()) mesh.position.y = y + rise;

    this.writeTendon();
    this.writeGapBand();

    // The pair is lit while it is still doing its job, and this marks which
    // side of a threshold the model is on rather than anything about a tendon.
    for (const id of RotatorCuffTearScene.FACING_PAIR) {
      const mesh = this.shoulder.mesh(id);
      if (!mesh) continue;
      mesh.material.emissiveIntensity = solved.coupleHolds ? 0.6 : 0.08;
      mesh.material.color
        .set('#c25a4e')
        .lerp(new THREE.Color(PALETTE.couple), solved.coupleHolds ? 0.5 : 0);
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors } = this;
    const rise = this.rise();
    // Everything sits at or above the head's own level: the shoulder hangs in
    // the upper part of the frame in every framing this scene uses, and a label
    // level with the socket lands behind the console.
    anchorVectors.tendon.set(0.2, 1.32, 0.5);
    anchorVectors.couple.set(1.5, 0.62, 0.35);
    anchorVectors.head.set(-1.5, 0.62 + rise, 0.5);
    anchorVectors.arch.set(-1.4, 1.14, 0.45);
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    shoulder: Object.freeze({
      target: new THREE.Vector3(-0.1, 0.3, 0),
      distance: 5.2,
      direction: new THREE.Vector3(-1.4, 1.2, 5.2).normalize(),
    }),
    arch: Object.freeze({
      target: new THREE.Vector3(-0.2, 0.2, 0),
      distance: 4.2,
      direction: new THREE.Vector3(-1.5, 0.8, 5.0).normalize(),
    }),
    cuff: Object.freeze({
      target: new THREE.Vector3(0, 0.35, -0.1),
      distance: 4.8,
      direction: new THREE.Vector3(0.5, 1.5, 4.4).normalize(),
    }),
  });

  getGuideFramings() {
    return RotatorCuffTearScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const centred = solved.centred
      ? solved.torn
        ? 'still centred, because the pair is holding'
        : 'centred'
      : 'riding up towards the arch';
    const value = {
      defect: Math.round(solved.defectFraction * 100),
      centred,
      containment: Math.round(solved.containment * 100),
      couple: Math.round(solved.fromCouple * 100),
      rise: Math.round(solved.riseFraction * 100),
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.gapGeometry?.dispose();
    this.gapMaterial?.dispose();
    for (const piece of Object.values(this.pieces ?? {})) piece.surface.dispose();
    this.tendonMaterial?.dispose();
    this.shoulder?.dispose();
    disposeObject(this.root);
  }
}
