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
} from '../../../../data/lumbarDiscHerniation.js';
import {
  DEFAULT_CONTROLS,
  TARGETS,
  solveLumbarDiscHerniation,
} from '../../../../models/lumbarDiscHerniation.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { buildSpine } from '../../organs/spine.js';

/**
 * A lumbar disc that has displaced material, drawn as three separate things.
 *
 * ### The atlas gave the scene its sentence
 *
 * `spine.js` says of its own disc: *two structures, because they are two
 * tissues and the difference between them is the difference between a bulge
 * and a rupture*. So the ring is what changes colour — once, at one threshold —
 * and the centre is what moves. Neither is a stand-in for the other.
 *
 * ### Direction is a table here and nowhere else
 *
 * Rule 1 and rule 5: the model names a direction and says what lies that way;
 * `AIM` is the only place in the repository that says which way that is in the
 * scene's coordinates, and it was measured off the atlas rather than guessed.
 *
 * ### The overlap is drawn, because that is the claim
 *
 * The model's second question is whether two drawn shapes meet. A reader
 * cannot judge that from two surfaces that interpenetrate — the nearer one
 * simply covers the further — so the place they meet gets a marker of its own,
 * sized by how much of the structure's own width the material has entered.
 */
export class LumbarDiscHerniationScene {
  static meta = {
    id: 'lumbar-disc-herniation',
    status: 'alpha',
    title: 'Lumbar disc displacement: three questions, two answers',
    titleJa: '腰椎椎間板の物質移動：3 つの問いと、2 つの答え',
    subtitle: 'How far it went, whether it reaches anything, and whether anybody feels it are three different questions',
    subtitleJa: 'どれだけ進んだか・何かに届くか・本人が感じるかは、3 つの別々の問いです',
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
    position: new THREE.Vector3(1.5, -1.0, 3.0),
    target: new THREE.Vector3(0, -1.25, 0.15),
  };

  /**
   * Which way each of the model's directions goes, in the scene's coordinates.
   *
   * **Semantic geometry**: the model says `posterolateral` and what lies that
   * way; only this table says which way that is. Each vector points from the
   * nucleus at the structure the model named, measured off the atlas — the
   * roots leave *above* the disc in this drawing, which is why the lateral
   * aims rise as well as going back.
   */
  static AIM = Object.freeze({
    central: new THREE.Vector3(0, 0, -1).normalize(),
    posterolateral: new THREE.Vector3(0.3, 0.52, -0.8).normalize(),
    'far-lateral': new THREE.Vector3(0.78, 0.3, -0.55).normalize(),
  });

  /** How solid the bone is drawn, so the disc and the root are not behind it. */
  static BONE_OPACITY = 0.24;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = LumbarDiscHerniationScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveLumbarDiscHerniation(this.progress, this.controls);
    this.anchorVectors = {
      nucleus: new THREE.Vector3(),
      annulus: new THREE.Vector3(),
      displaced: new THREE.Vector3(),
      root: new THREE.Vector3(),
      canal: new THREE.Vector3(),
      touched: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());

    this.spine = buildSpine({
      colors: { 'annulus-fibrosus': PALETTE.annulus, 'nucleus-pulposus': PALETTE.nucleus, 'nerve-root': PALETTE.root },
    });
    this.root.add(this.spine.object);

    this.nucleus = this.spine.mesh('nucleus-pulposus');
    this.annulus = this.spine.mesh('annulus-fibrosus');
    this.canal = this.spine.mesh('spinal-canal');
    this.nucleusRest = this.nucleus.position.clone();

    // Bone is context here, not subject: the disc sits between two bodies and
    // the root leaves behind a pedicle, so an opaque column hides everything
    // the scene is about.
    for (const [id, mesh] of this.spine.index) {
      if (id === 'nucleus-pulposus' || id === 'annulus-fibrosus') continue;
      if (!mesh?.material) continue;
      const bony = !['spinal-canal', 'nerve-root', 'cauda-equina'].includes(id);
      mesh.material.transparent = true;
      mesh.material.opacity = bony ? LumbarDiscHerniationScene.BONE_OPACITY : 0.6;
      mesh.material.depthWrite = false;
    }
    for (const mesh of [...(this.spine.pedicleMeshes ?? []), ...(this.spine.laminaMeshes ?? []), ...(this.spine.facetMeshes ?? [])]) {
      if (!mesh?.material) continue;
      mesh.material.transparent = true;
      mesh.material.opacity = LumbarDiscHerniationScene.BONE_OPACITY;
      mesh.material.depthWrite = false;
    }
    // The roots stay solid: one of them is what the whole scene is pointing at.
    for (const mesh of this.spine.rootMeshes ?? []) {
      mesh.material.transparent = false;
      mesh.material.opacity = 1;
      mesh.material.depthWrite = true;
    }

    // Where the two drawings meet. Drawn in front of both, because it sits at
    // the surface between them and would otherwise be inside whichever is
    // nearer to the camera.
    this.markGeometry = new THREE.SphereGeometry(1, 16, 12);
    this.markMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.touched,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    this.mark = new THREE.Mesh(this.markGeometry, this.markMaterial);
    this.mark.renderOrder = 20;
    this.mark.name = 'overlap';
    this.root.add(this.mark);

    this.applyModelToScene();
    return this.root;
  }

  /** @param {number} value 0 = the ring holds it, 1 = as far as the axis goes */
  setProgress(value) {
    this.progress = clamp(value);
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
    this.controls = { ...DEFAULT_CONTROLS };
    this.solve();
  }

  solve() {
    this.solved = solveLumbarDiscHerniation(this.progress, this.controls);
    this.applyModelToScene();
  }

  update() {}

  // --- the model on screen --------------------------------------------------

  /** The direction the material is going, or null when it is going nowhere. */
  aim() {
    return LumbarDiscHerniationScene.AIM[this.solved.controls.direction] ?? null;
  }

  applyModelToScene() {
    const solved = this.solved;
    const aim = this.aim();

    // The centre moves by exactly what the model says, along the named way.
    const moved = this.nucleusRest.clone();
    if (aim && solved.reach > 0) moved.addScaledVector(aim, solved.reach);
    this.nucleus.position.copy(moved);
    this.nucleus.material.color.set(solved.displaced ? PALETTE.displaced : PALETTE.nucleus);

    // One threshold, one colour change. The ring is a state with two values.
    // A colour of its own rather than the displaced material's: the ring giving
    // way and the material moving are two facts, and painting both the same
    // colour merges them back into the one sentence this scene exists to split.
    this.annulus.material.color.set(solved.annulus === 'breached' ? PALETTE.given : PALETTE.annulus);
    this.annulus.material.opacity = solved.annulus === 'breached' ? 0.5 : 0.85;
    this.annulus.material.transparent = true;

    // The overlap. Sized by how much of the structure's own width the material
    // has entered, so the marker is the read-out's number with a position.
    const meeting = this.meetingPoint();
    if (this.mark) {
      this.mark.visible = Boolean(meeting) && solved.touching;
      if (meeting) {
        this.mark.position.copy(meeting);
        const width = solved.meets ? TARGETS[solved.meets].width : 0.05;
        this.mark.scale.setScalar(Math.max(0.03, width * (0.55 + 0.85 * solved.indentFraction)));
      }
    }

    this.updateAnchors();
  }

  /**
   * Where the displaced material and what it met overlap: along the aim, at the
   * clearance, which is the surface of the structure by construction.
   */
  meetingPoint() {
    const aim = this.aim();
    if (!aim || !this.solved.meets) return null;
    const clearance = TARGETS[this.solved.meets].clearance;
    return this.nucleusRest.clone().addScaledVector(aim, clearance);
  }

  updateAnchors() {
    const { anchorVectors } = this;
    const rest = this.nucleusRest;
    anchorVectors.nucleus.copy(rest).add(new THREE.Vector3(-0.72, 0.12, 0.42));
    anchorVectors.annulus.copy(rest).add(new THREE.Vector3(-0.78, -0.3, 0.3));
    anchorVectors.displaced.copy(this.nucleus.position).add(new THREE.Vector3(0.34, -0.3, 0.34));
    anchorVectors.root.copy(this.spine.rootMeshes[0].position).set(0.86, -1.05, 0.36);
    anchorVectors.canal.set(-0.6, -0.9, -0.34);

    const meeting = this.meetingPoint();
    if (meeting) anchorVectors.touched.copy(meeting).add(new THREE.Vector3(0.3, 0.26, 0.2));
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    disc: Object.freeze({
      target: new THREE.Vector3(0, -1.25, 0.15),
      distance: 3.0,
      direction: new THREE.Vector3(1.5, 0.25, 3.0).normalize(),
    }),
    behind: Object.freeze({
      target: new THREE.Vector3(0.12, -1.2, 0.05),
      distance: 2.6,
      direction: new THREE.Vector3(1.2, 0.55, 1.5).normalize(),
    }),
    level: Object.freeze({
      target: new THREE.Vector3(0.1, -1.15, 0.1),
      distance: 3.6,
      direction: new THREE.Vector3(1.7, 0.3, 2.6).normalize(),
    }),
  });

  getGuideFramings() {
    return LumbarDiscHerniationScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = {
      displaced: () => this.solved.displaced,
      touched: () => this.solved.touching,
    };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const named = {
      canal: 'the canal',
      'root-shoulder': 'the nerve root, where it leaves',
      'root-lateral': 'the nerve root, further out',
    };
    const value = {
      ring: solved.annulus === 'breached' ? 'no — material is past it' : 'yes — still closed',
      meets: solved.meets ? named[solved.meets] : 'nothing that way',
      reaches: !solved.meets
        ? '—'
        : solved.touching
          ? 'yes, in this drawing'
          : 'no, not in this drawing',
      howFar: Math.round(solved.indentFraction * 100),
      // Printed rather than omitted: a missing row reads as an oversight, and
      // this absence is the thing the scene most needs to say.
      symptoms: 'not in this model',
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.markGeometry?.dispose();
    this.markMaterial?.dispose();
    this.spine?.dispose?.();
    disposeObject(this.root);
  }
}
