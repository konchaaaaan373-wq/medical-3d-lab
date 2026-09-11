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
} from '../../../../data/aclInjury.js';
import { DEFAULT_CONTROLS, KNEE, solveAclInjury } from '../../../../models/aclInjury.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { ATTACHMENTS, buildKneeJoint } from '../../organs/kneeJoint.js';

/**
 * An anterior cruciate ligament injury, told as a state of the ligament.
 *
 * ### The scene draws its own ligament, on purpose
 *
 * The atlas's cruciates are intact ones, and an injured ligament is **not an
 * intact one somewhere else**. So both cruciates here are drawn by this file,
 * between the atlas's own attachment points, in whatever state the model is in:
 * a continuous cord, a thinned and slack one, or two stumps with a gap. The
 * atlas's pair is hidden rather than edited.
 *
 * The attachment points are the atlas's, which is the whole reason the drawn
 * ligament is in the right place: `ATTACHMENTS.aclFemoral` is the back of the
 * lateral condyle's inner wall and `aclTibial` is the front of the tibia, and
 * a ligament between them runs the way an ACL runs without this file deciding
 * anything about knees.
 *
 * ### What moves with the tibia, and what does not
 *
 * The lower bone, its cartilage and its menisci move forward together. The
 * collaterals and the tendon across the front do not: they are context, they
 * would need solving rather than moving, and `src/data/aclInjury.js` says in as
 * many words that they are not re-solved.
 */
export class AclInjuryScene {
  static meta = {
    id: 'acl-injury',
    status: 'alpha',
    title: 'ACL injury: what is holding the tibia now',
    titleJa: '前十字靱帯損傷：いま脛骨を支えているもの',
    subtitle: 'Three states of one ligament, and what carries the load in each',
    subtitleJa: '1 本の靱帯の 3 つの状態と、それぞれで荷重を担うもの',
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
    position: new THREE.Vector3(3.4, 0.9, 3.8),
    target: new THREE.Vector3(0, 0.05, -0.05),
  };

  /** Everything that belongs to the lower bone and moves with it. */
  static TIBIAL_PARTS = Object.freeze([
    'medial-tibial-plateau',
    'lateral-tibial-plateau',
    'tibial-shaft',
    'fibula',
    'medial-meniscus',
    'lateral-meniscus',
    'medial-plateau-cartilage',
    'lateral-plateau-cartilage',
  ]);

  /** Drawn as context, and not re-solved when the bone moves. */
  static CONTEXT_OPACITY = Object.freeze({
    // The cruciates run in the notch, which is *behind* the condyles: from any
    // view a reader would call "the front of the knee" the subject of this
    // scene is inside the bone. So the bone is a ghost here, not a solid.
    'medial-collateral-ligament': 0.12,
    'lateral-collateral-ligament': 0.12,
    'quadriceps-tendon': 0.1,
    'patellar-tendon': 0.12,
    patella: 0.1,
    'femoral-shaft': 0.24,
    'tibial-shaft': 0.24,
    fibula: 0.2,
    'medial-femoral-condyle': 0.26,
    'lateral-femoral-condyle': 0.26,
    'medial-tibial-plateau': 0.3,
    'lateral-tibial-plateau': 0.3,
  });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = AclInjuryScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveAclInjury(this.controls);
    this.anchorVectors = {
      acl: new THREE.Vector3(),
      tibia: new THREE.Vector3(),
      secondary: new THREE.Vector3(),
      gap: new THREE.Vector3(),
    };
  }

  build() {
    this.knee = buildKneeJoint({ colors: { 'articular-cartilage': '#cfe6ea' } });

    // The atlas's cruciates are intact ones. This scene needs an injured one,
    // which is a different structure and not a moved one, so both are redrawn.
    for (const id of ['anterior-cruciate-ligament', 'posterior-cruciate-ligament']) {
      const mesh = this.knee.mesh(id);
      if (mesh) mesh.visible = false;
    }

    this.restPosition = new Map();
    for (const id of AclInjuryScene.TIBIAL_PARTS) {
      const mesh = this.knee.mesh(id) ?? this.knee.cartilageMeshes.find((cap) => cap.name === id);
      if (mesh) this.restPosition.set(id, { mesh, z: mesh.position.z });
    }

    // Lit from within, because it is seen through two condyles however the
    // camera is placed.
    this.aclMaterial = tissueMaterial({ color: PALETTE.ligament, roughness: 0.46, emissiveIntensity: 0.42 });
    this.pclMaterial = tissueMaterial({ color: PALETTE.pcl, roughness: 0.5, opacity: 0.9, emissiveIntensity: 0.22 });
    this.cords = {
      aclFemoral: this.cord(this.aclMaterial, 'acl-femoral-end'),
      aclTibial: this.cord(this.aclMaterial, 'acl-tibial-end'),
      pcl: this.cord(this.pclMaterial, 'posterior-cruciate'),
    };

    this.root.add(createStudioLights(), this.knee.object);
    for (const cord of Object.values(this.cords)) this.root.add(cord.mesh);
    this.applyModelToScene();
    return this.root;
  }

  /** One redrawable cord. Its path and calibre are rewritten on every solve. */
  cord(material, name) {
    const surface = new TubeSurface(
      smoothCurve([
        [0, 0.2, 0],
        [0, 0, 0],
        [0, -0.2, 0],
      ]),
      { radius: () => 0.07, steps: 26, radial: 12 }
    );
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    return { surface, mesh };
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = the ligament intact, 1 = none of its restraint left */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.disruption = this.progress;
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
    this.controls = { ...DEFAULT_CONTROLS, disruption: this.progress };
    this.solve();
  }

  solve() {
    this.solved = solveAclInjury(this.controls);
    this.applyModelToScene();
  }

  update() {}

  /** Where the tibia sits, in the atlas's units. */
  translation() {
    return this.solved.translationFraction * KNEE.plateauDepth;
  }

  /**
   * The ligament, as two ends that may or may not meet.
   *
   * At rest each end reaches the middle and the two read as one cord. As the
   * restraint goes they thin, they sag, and past the point the model calls
   * discontinuous they stop reaching each other — which is the injury drawn as
   * a state rather than as a displacement.
   */
  writeAcl() {
    const solved = this.solved;
    const femoral = new THREE.Vector3(...ATTACHMENTS.aclFemoral);
    const tibial = new THREE.Vector3(...ATTACHMENTS.aclTibial).add(new THREE.Vector3(0, 0, this.translation()));

    const gap = solved.continuous ? 0 : 0.3 * ((solved.disruption - 0.82) / 0.18);
    const reach = 0.52 - gap / 2;
    const sag = 0.26 * solved.disruption;
    const radius = 0.075 * (1 - 0.55 * solved.disruption);

    const along = (t) => femoral.clone().lerp(tibial, t).add(new THREE.Vector3(0.06 * sag, -sag * Math.sin(Math.PI * t), 0));
    for (const [key, from, to] of [
      ['aclFemoral', 0, reach],
      ['aclTibial', 1 - reach, 1],
    ]) {
      const points = [];
      for (let step = 0; step <= 6; step += 1) points.push(along(lerp(from, to, step / 6)).toArray());
      const cord = this.cords[key];
      cord.surface.curve = smoothCurve(points);
      cord.surface.resample();
      cord.surface.refresh(() => radius);
    }
    this.aclMaterial.color
      .set(PALETTE.ligament)
      .lerp(new THREE.Color(PALETTE.stretched), clamp(solved.disruption * 1.4))
      .lerp(new THREE.Color(PALETTE.torn), solved.continuous ? 0 : 0.7);
  }

  /** The other cruciate, which follows the bone it is attached to. */
  writePcl() {
    const femoral = new THREE.Vector3(...ATTACHMENTS.pclFemoral);
    const tibial = new THREE.Vector3(...ATTACHMENTS.pclTibial).add(new THREE.Vector3(0, 0, this.translation()));
    const points = [];
    for (let step = 0; step <= 6; step += 1) {
      points.push(femoral.clone().lerp(tibial, step / 6).toArray());
    }
    this.cords.pcl.surface.curve = smoothCurve(points);
    this.cords.pcl.surface.resample();
    this.cords.pcl.surface.refresh(() => 0.08);
  }

  applyModelToScene() {
    if (!this.knee) return;
    const solved = this.solved;

    for (const [id, opacity] of Object.entries(AclInjuryScene.CONTEXT_OPACITY)) {
      const material = this.knee.mesh(id)?.material;
      if (!material) continue;
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
    }

    const forward = this.translation();
    for (const { mesh, z } of this.restPosition.values()) mesh.position.z = z + forward;

    this.writeAcl();
    this.writePcl();

    // The menisci are lit when the model says they are the ones holding it.
    for (const side of ['medial', 'lateral']) {
      const mesh = this.knee.mesh(`${side}-meniscus`);
      if (!mesh) continue;
      mesh.material.emissiveIntensity = solved.secondaryCarriesIt ? 0.7 : 0.12;
      mesh.material.color
        .set(PALETTE.meniscus)
        .lerp(new THREE.Color(PALETTE.secondary), solved.secondaryCarriesIt ? 0.45 : 0);
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors } = this;
    anchorVectors.acl.set(1.45, 0.75, 0.3);
    // Level with the joint rather than down the shaft: the tibia is tall, and a
    // label beside its middle lands behind the console in both the framings the
    // steps that point at it use.
    anchorVectors.tibia.set(1.4, -0.22, 0.65);
    anchorVectors.secondary.set(-1.45, -0.35, 0.55);
    anchorVectors.gap.set(1.35, 0.15, 0.55);
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    knee: Object.freeze({
      target: new THREE.Vector3(0, 0.05, -0.05),
      distance: 5.8,
      direction: new THREE.Vector3(3.4, 0.9, 3.8).normalize(),
    }),
    notch: Object.freeze({
      target: new THREE.Vector3(0, 0.15, -0.1),
      distance: 4.7,
      direction: new THREE.Vector3(2.6, 1.2, 3.4).normalize(),
    }),
    side: Object.freeze({
      target: new THREE.Vector3(0, -0.05, 0),
      distance: 5.2,
      direction: new THREE.Vector3(4.4, 0.5, 1.1).normalize(),
    }),
  });

  getGuideFramings() {
    return AclInjuryScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = { gap: () => !this.solved.continuous };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const who = solved.nothingHolding
      ? 'nothing, in this model'
      : solved.secondaryCarriesIt
        ? 'the secondary restraints, all of it'
        : 'the ligament, mostly';
    const state =
      solved.state === 'intact'
        ? 'intact'
        : solved.state === 'stretched'
          ? 'stretched and thinned'
          : 'discontinuous — two ends';
    const value = {
      remaining: Math.round(solved.restraintRemaining * 100),
      who,
      acl: Math.round(solved.aclOfOriginal * 100),
      secondary: Math.round(solved.secondaryOfOriginal * 100),
      translation: Math.round(solved.translationFraction * 100),
      state,
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    for (const cord of Object.values(this.cords ?? {})) cord.surface.dispose();
    this.aclMaterial?.dispose();
    this.pclMaterial?.dispose();
    this.knee?.dispose();
    disposeObject(this.root);
  }
}
