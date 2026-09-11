import * as THREE from 'three';

import {
  ANNOTATIONS, DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, METRICS, MODEL_CONTROLS, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, VISUAL_MAPPING,
} from '../../../../data/cataract.js';
import { DEFAULT_CONTROLS, LENS, solveCataract } from '../../../../models/cataract.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { NASAL, SITES, buildEyeball } from '../../organs/eyeball.js';

/**
 * A clouded lens, drawn as two circles and their overlap.
 *
 * ### The lens is drawn from in front, because the claim is an area
 *
 * The model's answer is the intersection of two discs — the clouded band and
 * the open aperture — and an intersection of two rings cannot be judged by eye
 * from an oblique view of a lens buried in an eyeball. So the scene draws the
 * lens face-on, as flat rings on the lens's own front, and puts the aperture on
 * the same surface: the reader compares two shapes that share a plane.
 *
 * ### The overlap is its own shape
 *
 * Not a tint of the cloud and not a tint of the aperture. What the model solves
 * is the part of one inside the other, so that part is built as a ring of its
 * own at the radii where they meet — which means the coloured area on screen
 * *is* the number in the read-out.
 */
export class CataractScene {
  static meta = {
    id: 'cataract',
    status: 'alpha',
    title: 'Lens opacity: in the way, or beside it',
    titleJa: '水晶体混濁：通り道にあるのか、その外なのか',
    subtitle: 'A cloud over most of the lens can be outside the light’s way, and a twelfth of it can fill it',
    subtitleJa: '水晶体の大部分を覆う混濁が通り道の外にあることも、1/12 の混濁が通り道を埋めることもあります',
    stages: STAGES, related: RELATED, visualMapping: VISUAL_MAPPING, legend: LEGEND,
    range: RANGE, progressLabel: PROGRESS_LABEL, palette: PALETTE,
    modelScope: MODEL_SCOPE, modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER, disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT, disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    position: new THREE.Vector3(0.35, 0.25, 3.1),
    target: new THREE.Vector3(0, 0.05, 0.5),
  };

  /** Where the flat rings sit in front of the lens, so nothing z-fights it. */
  static FACE_Z = 0.66;

  /** How solid everything that is not the lens is drawn. */
  static CONTEXT_OPACITY = 0.14;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = CataractScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveCataract(this.progress, this.controls);
    this.anchorVectors = {
      lens: new THREE.Vector3(), opacity: new THREE.Vector3(),
      aperture: new THREE.Vector3(), retina: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());
    this.eye = buildEyeball({ colors: { lens: PALETTE.lens, iris: PALETTE.iris, retina: PALETTE.retina, sclera: PALETTE.sclera } });
    this.root.add(this.eye.object);

    // The lens is the subject; everything else is where it is. An opaque iris
    // in front of it would hide the very disc the scene is comparing against.
    for (const [id, mesh] of this.eye.index) {
      if (id === 'lens' || !mesh?.material) continue;
      mesh.material.transparent = true;
      mesh.material.opacity = CataractScene.CONTEXT_OPACITY;
      mesh.material.depthWrite = false;
    }
    const lens = this.eye.mesh('lens');
    if (lens) { lens.material.transparent = true; lens.material.opacity = 0.45; lens.material.depthWrite = false; }

    // Three flat rings on one plane in front of the lens: the cloud, the
    // aperture's edge, and the part of the cloud inside it. Comparing two areas
    // by eye needs them coplanar, which an oblique view of a lens is not.
    this.cloudMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.opacity, transparent: true, side: THREE.DoubleSide, depthTest: false });
    this.overlapMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.inPath, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false });
    this.apertureMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.aperture, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false });

    this.cloud = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.02, 48), this.cloudMaterial);
    this.overlap = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.02, 48), this.overlapMaterial);
    this.aperture = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.02, 64), this.apertureMaterial);
    this.cloud.name = 'clouded-band';
    this.overlap.name = 'in-the-path';
    this.aperture.name = 'aperture-edge';
    for (const [index, mesh] of [this.cloud, this.overlap, this.aperture].entries()) {
      mesh.position.set(0, 0, CataractScene.FACE_Z);
      mesh.renderOrder = 14 + index;
      this.root.add(mesh);
    }

    this.applyModelToScene();
    return this.root;
  }

  setProgress(value) { this.progress = clamp(value); this.solve(); }
  setModelControl(id, value) { this.controls[id] = value; this.solve(); }
  getModelControls() { return MODEL_CONTROLS.map((c) => ({ ...c, value: this.controls[c.id] })); }
  resetModelControls() { this.controls = { ...DEFAULT_CONTROLS }; this.solve(); }
  solve() { this.solved = solveCataract(this.progress, this.controls); this.applyModelToScene(); }
  update() {}

  // --- the model on screen --------------------------------------------------

  /** Rebuild a flat ring between two radii of the lens, in scene units. */
  setRing(mesh, from, to) {
    const inner = Math.max(0, from) * LENS.radius;
    const outer = Math.max(inner + 1e-4, to * LENS.radius);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.RingGeometry(inner, outer, 64);
  }

  applyModelToScene() {
    const solved = this.solved;
    const [from, to] = solved.band;

    if (this.cloud) {
      this.cloud.visible = solved.clouded;
      if (solved.clouded) {
        this.setRing(this.cloud, from, to);
        // Opacity is the one thing the axis moves here, and it is the model's
        // own density rather than a separate emphasis.
        this.cloudMaterial.opacity = 0.25 + 0.6 * solved.density;
      }
    }

    // The aperture drawn as a thin edge on the same plane, so the reader is
    // comparing two shapes that share a surface.
    if (this.aperture) this.setRing(this.aperture, solved.apertureRadius - 0.035, solved.apertureRadius);

    // The overlap: exactly the radii where the two rings meet.
    if (this.overlap) {
      const overlapFrom = Math.min(from, solved.apertureRadius);
      const overlapTo = Math.min(to, solved.apertureRadius);
      this.overlap.visible = solved.clouded && overlapTo > overlapFrom + 1e-6;
      if (this.overlap.visible) this.setRing(this.overlap, overlapFrom, overlapTo);
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    anchorVectors.lens.set(NASAL * 0.95, 0.62, 0.62);
    anchorVectors.aperture.set(-NASAL * 1.0, 0.5, 0.72);
    anchorVectors.retina.set(NASAL * 0.5, 0.72, -0.75);
    // On the clouded band itself, and **above** the lens's centre: the
    // explanation panel takes the lower third of the screen, so a label hung
    // below a band that reaches the rim lands behind it.
    const middle = ((solved.band[0] + solved.band[1]) / 2) * LENS.radius;
    anchorVectors.opacity.set(-NASAL * (middle + 0.2), middle + 0.28, CataractScene.FACE_Z + 0.1);
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    front: Object.freeze({ target: new THREE.Vector3(0, 0.05, 0.5), distance: 3.1, direction: new THREE.Vector3(0.35, 0.2, 3.1).normalize() }),
    lens: Object.freeze({ target: new THREE.Vector3(0, 0.02, 0.58), distance: 2.3, direction: new THREE.Vector3(0.2, 0.12, 2.3).normalize() }),
    path: Object.freeze({ target: new THREE.Vector3(0, 0.05, 0.1), distance: 3.8, direction: new THREE.Vector3(1.6, 0.35, 2.6).normalize() }),
  });

  getGuideFramings() { return CataractScene.guideFramings; }
  getVisualMapping() { return VISUAL_MAPPING; }

  getAnnotations() {
    const drawn = { opacity: () => this.solved.clouded };
    return ANNOTATIONS.map((a) => ({ ...a, position: this.anchorVectors[a.anchor], isDrawn: drawn[a.id] }));
  }

  getMetrics() {
    const solved = this.solved;
    const value = {
      ofLens: Math.round(solved.ofTheLens * 100),
      inPath: Math.round(solved.inPath * 100),
      blocked: Math.round(solved.blocked * 100),
      pupil: solved.pupil === 'wide' ? 'wide' : 'small',
      // Printed rather than omitted: the absence is the claim.
      vision: 'not in this model',
    };
    return METRICS.map((m) => ({ ...m, value: value[m.id] }));
  }

  dispose() {
    for (const mesh of [this.cloud, this.overlap, this.aperture]) mesh?.geometry.dispose();
    this.cloudMaterial?.dispose();
    this.overlapMaterial?.dispose();
    this.apertureMaterial?.dispose();
    this.eye?.dispose?.();
    disposeObject(this.root);
  }
}
