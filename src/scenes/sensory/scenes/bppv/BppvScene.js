import * as THREE from 'three';

import {
  ANNOTATIONS, DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, METRICS, MODEL_CONTROLS, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, VISUAL_MAPPING,
} from '../../../../data/bppv.js';
import { CANAL, CANALS, DEFAULT_CONTROLS, solveBppv } from '../../../../models/bppv.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { MEDIAL, SITES, buildEar } from '../../organs/ear.js';

/**
 * Loose particles in a canal, drawn as an angle between a direction and a plane.
 *
 * ### Gravity moves and the head does not
 *
 * The claim is about the angle between the two, which can be drawn either way
 * round. Turning the head would be the truer animation and the worse picture:
 * the three loops would swing out of comparison with each other every time the
 * axis moved. So the head is still, the arrow turns, and the canals stay where
 * a reader can keep looking at them. The visual mapping says so.
 *
 * ### The loop's own frame is built the way the atlas builds it
 *
 * A particle's position is an angle on a loop, and an angle needs two axes. The
 * scene derives them from the canal's normal with the same construction
 * `buildEar()` uses, so the angle the model solves and the place the scene
 * draws are the same angle — `tests/calibration.test.js` measures that against
 * the atlas's own tube.
 */
export class BppvScene {
  static meta = {
    id: 'bppv',
    status: 'alpha',
    title: 'Particles in a canal: an angle between gravity and a plane',
    titleJa: '半規管内の耳石：重力と平面のなす角',
    subtitle: 'Two loops in one ear, with the head in the same place, are in completely different states',
    subtitleJa: '同じ耳の 2 つのループは、同じ頭位でもまったく異なる状態にあります',
    stages: STAGES, related: RELATED, visualMapping: VISUAL_MAPPING, legend: LEGEND,
    range: RANGE, progressLabel: PROGRESS_LABEL, palette: PALETTE,
    modelScope: MODEL_SCOPE, modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER, disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT, disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    position: new THREE.Vector3(-1.1, 1.0, 2.4),
    target: new THREE.Vector3(MEDIAL * 1.0, 0.05, -0.25),
  };

  /** Which atlas mesh is which of the model's loops. */
  static LOOP_MESH = Object.freeze({ posterior: 'posterior-semicircular-canal', lateral: 'lateral-semicircular-canal' });

  /** How dim the loops that are not in question are drawn. */
  static IDLE_OPACITY = 0.3;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = BppvScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveBppv(this.progress, this.controls);
    this.anchorVectors = {
      canal: new THREE.Vector3(), active: new THREE.Vector3(), particle: new THREE.Vector3(),
      gravity: new THREE.Vector3(), ampulla: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());
    this.ear = buildEar({ colors: { 'semicircular-canals': PALETTE.canal } });
    this.root.add(this.ear.object);

    // The canals are the subject; the rest of the ear is where they are.
    for (const [id, mesh] of this.ear.index) {
      if (id === 'semicircular-canals' || !mesh?.material) continue;
      mesh.material.transparent = true;
      mesh.material.opacity = 0.12;
      mesh.material.depthWrite = false;
    }
    // Each loop gets a material of its own, because one of the three is lit.
    this.loopMaterials = new Map();
    for (const mesh of this.ear.canalMeshes ?? []) {
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      this.loopMaterials.set(mesh.name, mesh.material);
    }

    this.centre = new THREE.Vector3(...SITES.vestibule);

    this.particleGeometry = new THREE.SphereGeometry(CANAL.bore * 0.8, 14, 10);
    this.particleMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.particle, depthTest: false });
    this.particle = new THREE.Mesh(this.particleGeometry, this.particleMaterial);
    this.particle.renderOrder = 20;
    this.particle.name = 'otoconia';
    this.root.add(this.particle);

    this.ampullaGeometry = new THREE.SphereGeometry(CANAL.bore * 1.25, 12, 8);
    this.ampullaMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.ampulla, transparent: true, opacity: 0.85, depthTest: false });
    this.ampulla = new THREE.Mesh(this.ampullaGeometry, this.ampullaMaterial);
    this.ampulla.renderOrder = 18;
    this.ampulla.name = 'ampulla';
    this.root.add(this.ampulla);

    // Which way is down, in the head's own frame. An angle needs both its arms.
    this.arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 1.5, PALETTE.gravity, 0.28, 0.16);
    this.arrow.name = 'down';
    this.root.add(this.arrow);

    this.applyModelToScene();
    return this.root;
  }

  setProgress(value) { this.progress = clamp(value); this.solve(); }
  setModelControl(id, value) { this.controls[id] = value; this.solve(); }
  getModelControls() { return MODEL_CONTROLS.map((c) => ({ ...c, value: this.controls[c.id] })); }
  resetModelControls() { this.controls = { ...DEFAULT_CONTROLS }; this.solve(); }
  solve() { this.solved = solveBppv(this.progress, this.controls); this.applyModelToScene(); }
  update() {}

  // --- the model on screen --------------------------------------------------

  /**
   * The two in-plane axes of a loop, built the way `buildEar()` builds them, so
   * an angle the model solves is the angle the scene draws.
   */
  loopFrame(normal) {
    const axis = new THREE.Vector3(...normal).normalize();
    const seed = Math.abs(axis.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(axis, seed).normalize();
    const w = new THREE.Vector3().crossVectors(axis, u).normalize();
    return { axis, u, w };
  }

  /** Where on the loop a given angle is, in the scene's coordinates. */
  pointOnLoop(normal, angle) {
    const { axis, u, w } = this.loopFrame(normal);
    return this.centre
      .clone()
      .addScaledVector(u, Math.cos(angle) * CANAL.radius)
      .addScaledVector(w, Math.sin(angle) * CANAL.radius)
      .addScaledVector(axis, 0.12);
  }

  applyModelToScene() {
    const solved = this.solved;
    const entry = CANALS.find((c) => c.id === solved.canal);
    const lit = BppvScene.LOOP_MESH[solved.canal];

    for (const [name, material] of this.loopMaterials ?? []) {
      const isLit = name === lit;
      material.color.set(isLit ? PALETTE.active : PALETTE.idle);
      material.opacity = isLit ? 1 : BppvScene.IDLE_OPACITY;
      material.depthWrite = isLit;
    }

    const has = Boolean(entry?.normal);
    if (this.particle) {
      this.particle.visible = has;
      if (has) this.particle.position.copy(this.pointOnLoop(entry.normal, solved.restsAt));
    }
    if (this.ampulla) {
      this.ampulla.visible = has;
      if (has) this.ampulla.position.copy(this.pointOnLoop(entry.normal, entry.ampullaAt));
    }

    // Gravity in the head's frame. The head does not move; this does.
    if (this.arrow) {
      const down = new THREE.Vector3(...solved.gravity).normalize();
      this.arrow.position.copy(this.centre).addScaledVector(down, -1.05);
      this.arrow.setDirection(down);
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    anchorVectors.canal.copy(this.centre).add(new THREE.Vector3(MEDIAL * -0.2, 0.62, 0.5));
    anchorVectors.gravity.copy(this.arrow.position).add(new THREE.Vector3(0, 0.2, 0.35));
    const entry = CANALS.find((c) => c.id === solved.canal);
    if (entry?.normal) {
      anchorVectors.active.copy(this.pointOnLoop(entry.normal, entry.ampullaAt + Math.PI)).add(new THREE.Vector3(0, 0.28, 0.3));
      anchorVectors.particle.copy(this.particle.position).add(new THREE.Vector3(0, 0.24, 0.3));
      // Above the ampulla rather than below it: the explanation panel takes the
      // lower third of the screen, and this loop's ampulla already sits low.
      anchorVectors.ampulla.copy(this.ampulla.position).add(new THREE.Vector3(0.26, 0.24, 0.3));
    } else {
      anchorVectors.active.copy(this.centre).add(new THREE.Vector3(0, 0.4, 0.4));
      anchorVectors.particle.copy(this.centre).add(new THREE.Vector3(0, -0.4, 0.4));
      anchorVectors.ampulla.copy(this.centre).add(new THREE.Vector3(0.35, -0.2, 0.4));
    }
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    labyrinth: Object.freeze({ target: new THREE.Vector3(MEDIAL * 1.0, 0.05, -0.25), distance: 2.9, direction: new THREE.Vector3(-1.1, 0.85, 2.4).normalize() }),
    loop: Object.freeze({ target: new THREE.Vector3(MEDIAL * 1.0, 0.1, -0.3), distance: 2.2, direction: new THREE.Vector3(-0.6, 0.55, 2.0).normalize() }),
    down: Object.freeze({ target: new THREE.Vector3(MEDIAL * 0.95, -0.1, -0.2), distance: 3.4, direction: new THREE.Vector3(-1.4, 0.6, 2.6).normalize() }),
  });

  getGuideFramings() { return BppvScene.guideFramings; }
  getVisualMapping() { return VISUAL_MAPPING; }

  getAnnotations() {
    const has = () => Boolean(CANALS.find((c) => c.id === this.solved.canal)?.normal);
    const drawn = { particle: has, ampulla: has, active: has };
    return ANNOTATIONS.map((a) => ({ ...a, position: this.anchorVectors[a.anchor], isDrawn: drawn[a.id] }));
  }

  getMetrics() {
    const solved = this.solved;
    const value = {
      inPlane: Math.round(solved.inPlane * 100),
      drives: solved.canal === 'none' ? 'nothing is loose' : solved.drives ? 'yes' : 'no — gravity is along its normal',
      travel: Math.round(solved.travelFraction * 100),
      towards: solved.towardsAmpulla === null ? '—' : solved.towardsAmpulla ? 'towards it' : 'away from it',
      // Printed rather than omitted: the absence is the claim.
      nystagmus: 'not derived here',
    };
    return METRICS.map((m) => ({ ...m, value: value[m.id] }));
  }

  dispose() {
    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();
    this.ampullaGeometry?.dispose();
    this.ampullaMaterial?.dispose();
    for (const material of this.loopMaterials?.values() ?? []) material.dispose();
    this.ear?.dispose?.();
    disposeObject(this.root);
  }
}
