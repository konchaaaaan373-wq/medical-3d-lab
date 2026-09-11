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
} from '../../../../data/kneeOsteoarthritis.js';
import {
  DEFAULT_CONTROLS,
  KNEE,
  solveKneeOsteoarthritis,
} from '../../../../models/kneeOsteoarthritis.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { shapedSphere } from '../../../shared/geometry/shapes.js';
import { mineralMaterial } from '../../../shared/materials.js';
import { MEDIAL, buildKneeJoint } from '../../organs/kneeJoint.js';

/**
 * Knee osteoarthritis, told as a statement about which compartment.
 *
 * ### The knee is the atlas's, including the thing that makes the scene work
 *
 * `buildKneeJoint` draws the layer over each articular surface as **four
 * meshes** — one per condyle and one per plateau — rather than as one coat over
 * the joint. That is what lets a compartment be worn while the other is not,
 * and it is why this scene is possible without a second knee.
 *
 * The layer is thinned in the two ways the atlas's own construction allows: a
 * condylar cap is an inflated copy of its condyle, so it is scaled back towards
 * it; a plateau cap is its plateau with the articular top lifted, so it is sunk
 * back into it. Both are approximations of a thickness and neither is a
 * measurement — `src/data/kneeOsteoarthritis.js` says so.
 *
 * ### Three layers
 *
 * - **The disease state** is a side, an amount and how confined it is.
 * - **The model output** is what is left of each side's layer and what follows
 *   on the side that lost it.
 * - **The drawing** thins the layer, slides the meniscus out and grows a
 *   swelling at the rim. The last of those is drawn rather than solved.
 */
export class KneeOsteoarthritisScene {
  static meta = {
    id: 'knee-osteoarthritis',
    status: 'alpha',
    title: 'Knee osteoarthritis: one compartment, not one joint',
    titleJa: '膝関節症：関節全体ではなく、1 つの区画',
    subtitle: 'One side loses its layer while the other keeps it — and what follows goes with the side',
    subtitleJa: '片側だけが層を失い、その後に起きることは「その側」に付いて回ります',
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
    position: new THREE.Vector3(0.4, 0.3, 5.6),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  /** How see-through the structures that are not the subject are drawn. */
  static SURFACE_OPACITY = Object.freeze({
    // The bones are context here, not the subject: the layer between them is,
    // and drawn at the atlas's full opacity a knee is a cream mass in which the
    // one thing this scene is about is the hardest thing to find.
    'femoral-shaft': 0.4,
    'tibial-shaft': 0.4,
    fibula: 0.35,
    'medial-femoral-condyle': 0.72,
    'lateral-femoral-condyle': 0.72,
    'medial-tibial-plateau': 0.72,
    'lateral-tibial-plateau': 0.72,
    'anterior-cruciate-ligament': 0.28,
    'posterior-cruciate-ligament': 0.22,
    'quadriceps-tendon': 0.22,
    'patellar-tendon': 0.28,
    patella: 0.24,
  });

  /** How far a meniscus is drawn out per unit of the model's own extrusion. */
  static EXTRUSION_DRAWN = 0.22;

  /** Below this much layer left, the cap is not drawn: there is nothing there. */
  static CAP_VANISHES_BELOW = 0.05;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = KneeOsteoarthritisScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveKneeOsteoarthritis(this.controls);
    this.anchorVectors = {
      cartilage: new THREE.Vector3(),
      meniscus: new THREE.Vector3(),
      other: new THREE.Vector3(),
      osteophyte: new THREE.Vector3(),
    };
  }

  build() {
    this.knee = buildKneeJoint({
      colors: { 'articular-cartilage': PALETTE.cartilage, 'medial-meniscus': PALETTE.meniscus },
    });

    // The atlas shares one material across all four caps, which is right for an
    // atlas and wrong here: the whole subject is that the two sides differ.
    this.caps = new Map();
    for (const mesh of this.knee.cartilageMeshes) {
      mesh.material = mesh.material.clone();
      const side = mesh.name.startsWith('medial') ? 'medial' : 'lateral';
      const kind = mesh.name.includes('condylar') ? 'condylar' : 'plateau';
      this.caps.set(mesh.name, { mesh, side, kind, restY: mesh.position.y });
    }

    this.menisci = new Map();
    for (const side of ['medial', 'lateral']) {
      const mesh = this.knee.mesh(`${side}-meniscus`);
      if (mesh) this.menisci.set(side, { mesh, restX: mesh.position.x });
    }

    // New bone at each rim. Drawn rather than solved, and only ever a swelling
    // of the margin: this model has no idea what shape an osteophyte is.
    this.osteophytes = new Map();
    this.osteophyteGeometry = shapedSphere({ detail: 4, scale: [0.2, 0.12, 0.3] });
    for (const [side, sign] of [
      ['medial', MEDIAL],
      ['lateral', -MEDIAL],
    ]) {
      const material = mineralMaterial({ color: PALETTE.osteophyte, roughness: 0.62 });
      const mesh = new THREE.Mesh(this.osteophyteGeometry, material);
      mesh.position.set(sign * 0.86, -0.06, -0.02);
      mesh.name = `${side}-marginal-bone`;
      this.root.add(mesh);
      this.osteophytes.set(side, { mesh, material });
    }

    this.root.add(createStudioLights(), this.knee.object);
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = both layers intact, 1 = the worst side has none */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.loss = this.progress;
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
    this.controls = { ...DEFAULT_CONTROLS, loss: this.progress };
    this.solve();
  }

  solve() {
    this.solved = solveKneeOsteoarthritis(this.controls);
    this.applyModelToScene();
  }

  update() {}

  /**
   * The scale that leaves a fraction of a condylar cap's layer.
   *
   * The cap is its condyle inflated by `condylarLayer`, so a surface at `r`
   * carries its layer at `r(1 + t)`. Scaling the cap by `(1 + t·remaining)/(1 + t)`
   * puts that surface where a layer of `t·remaining` would be. It is exact on
   * the articular part and approximate on the rest, which is sunk inside the
   * bone and not seen.
   */
  capScaleFor(remaining) {
    const layer = KNEE.condylarLayer;
    return (1 + layer * remaining) / (1 + layer);
  }

  applyModelToScene() {
    if (!this.knee) return;
    const solved = this.solved;

    for (const [id, opacity] of Object.entries(KneeOsteoarthritisScene.SURFACE_OPACITY)) {
      const material = this.knee.mesh(id)?.material;
      if (!material) continue;
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
    }

    for (const cap of this.caps.values()) {
      const compartment = solved.compartment(cap.side);
      if (cap.kind === 'condylar') {
        cap.mesh.scale.setScalar(this.capScaleFor(compartment.remaining));
      } else {
        // A plateau cap is its plateau with the articular top lifted, so what
        // has gone is taken off the top rather than off the whole shape.
        cap.mesh.position.y = cap.restY - KNEE.plateauLayer * compartment.lost;
      }
      cap.mesh.material.color
        .set(PALETTE.cartilage)
        .lerp(new THREE.Color(PALETTE.worn), clamp(compartment.lost));
      cap.mesh.material.opacity = 0.62;
      // At nothing left the cap lies exactly on the bone it was inflated from,
      // and two surfaces in the same place speckle. Gone is gone.
      cap.mesh.visible = compartment.remaining > KneeOsteoarthritisScene.CAP_VANISHES_BELOW;
    }

    for (const [side, meniscus] of this.menisci) {
      const compartment = solved.compartment(side);
      const sign = side === 'medial' ? MEDIAL : -MEDIAL;
      meniscus.mesh.position.x =
        meniscus.restX + sign * compartment.meniscalExtrusion * KneeOsteoarthritisScene.EXTRUSION_DRAWN;
      meniscus.mesh.material.color
        .set(PALETTE.meniscus)
        .lerp(new THREE.Color(PALETTE.extruded), clamp(compartment.meniscalExtrusion * 1.6));
    }

    for (const [side, spur] of this.osteophytes) {
      const grown = solved.compartment(side).osteophyte;
      spur.mesh.visible = grown > 0;
      spur.mesh.scale.setScalar(0.35 + 0.65 * grown);
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    const worst = solved.worst?.id ?? 'medial';
    const sign = worst === 'medial' ? MEDIAL : -MEDIAL;
    anchorVectors.cartilage.set(sign * 1.25, 0.15, 0.6);
    anchorVectors.meniscus.set(sign * 1.3, -0.45, 0.6);
    anchorVectors.other.set(-sign * 1.25, 0.28, 0.6);
    anchorVectors.osteophyte.set(sign * 1.35, -0.1, 0.55);
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    knee: Object.freeze({
      target: new THREE.Vector3(0, -0.05, 0),
      distance: 5.6,
      direction: new THREE.Vector3(0.4, 0.3, 5.6).normalize(),
    }),
    'joint-line': Object.freeze({
      target: new THREE.Vector3(0, -0.05, 0),
      distance: 4.4,
      direction: new THREE.Vector3(0.3, 0.18, 5.4).normalize(),
    }),
    both: Object.freeze({
      target: new THREE.Vector3(0, -0.1, 0),
      distance: 4.9,
      direction: new THREE.Vector3(0.12, 0.45, 5.2).normalize(),
    }),
  });

  getGuideFramings() {
    return KneeOsteoarthritisScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = { osteophyte: () => (this.solved.worst?.osteophyte ?? 0) > 0 };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const picture = !solved.present || solved.loss === 0
      ? 'both layers intact'
      : solved.confinedToOneCompartment
        ? 'one compartment'
        : 'both sides, evenly';
    const value = {
      medial: Math.round(solved.medial.remaining * 100),
      lateral: Math.round(solved.lateral.remaining * 100),
      difference: Math.round(solved.difference * 100),
      extrusion: Math.round((solved.worst?.meniscalExtrusion ?? 0) * 100),
      picture,
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.osteophyteGeometry?.dispose();
    for (const spur of this.osteophytes?.values() ?? []) spur.material.dispose();
    for (const cap of this.caps?.values() ?? []) cap.mesh.material.dispose();
    this.knee?.dispose();
    disposeObject(this.root);
  }
}
