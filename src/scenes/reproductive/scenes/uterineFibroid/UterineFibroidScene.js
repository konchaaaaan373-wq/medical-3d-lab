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
} from '../../../../data/uterineFibroid.js';
import {
  DEFAULT_CONTROLS,
  DIAMETER_RANGE,
  solveUterineFibroid,
} from '../../../../models/uterineFibroid.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { shapedSphere } from '../../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { buildUterusParts } from '../../organs/uterusParts.js';

/**
 * A uterine fibroid, told as a statement about where in the wall.
 *
 * ### The uterus is not this scene's
 *
 * `buildUterusParts` is the atlas's and is used as it stands — including, and
 * especially, its **cavity**: a flattened triangle in one plane rather than a
 * bag. That is what makes the scene expressible at all, because "presses into
 * the cavity" is a sphere crossing a plane, and the plane has to be somebody
 * else's for the crossing to mean anything.
 *
 * ### Seen from the side, on purpose
 *
 * The depth in the wall is the whole subject, and depth runs front-to-back. Seen
 * from in front it is the one axis a reader cannot judge; seen from the side it
 * is the horizontal one. So the opening pose is lateral-oblique and the cavity
 * is seen nearly edge-on — which is what turns "just under the cavity" and
 * "just under the surface" into two visibly different pictures.
 *
 * ### Three layers
 *
 * - **The disease state** is a depth and a diameter. That is all the reader sets.
 * - **The model output** is what the sphere reaches: the share of the cavity it
 *   presses into, how far past the surface it stands, and the volume — which is
 *   the same wherever it sits, and is reported for exactly that reason.
 * - **The drawing** places a sphere of that diameter at that depth and does
 *   nothing else. `src/data/uterineFibroid.js` says in as many words that the
 *   uterus is not redrawn around it.
 */
export class UterineFibroidScene {
  static meta = {
    id: 'uterine-fibroid',
    status: 'alpha',
    title: 'Uterine fibroid: what the depth in the wall decides',
    titleJa: '子宮筋腫：壁のどの深さかが何を決めるのか',
    subtitle: 'The same volume against the cavity, against the outline, or against neither',
    subtitleJa: '同じ体積が、子宮腔に接するか、外形を押すか、どちらにも触れないか',
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
    position: new THREE.Vector3(3.3, 0.45, 1.7),
    target: new THREE.Vector3(0, 0.05, 0),
  };

  /** Where along the body the fibroid sits. Depth is the model's; this is not. */
  static SITE = Object.freeze({ x: 0, y: 0.12 });

  /**
   * How see-through each surface is, and the only place that decides it.
   *
   * The subject is inside the wall, so the wall cannot be opaque. The cavity is
   * the plane the fibroid is measured against and stays the most solid thing in
   * the picture after the fibroid itself.
   */
  static SURFACE_OPACITY = Object.freeze({
    fundus: 0.3,
    body: 0.26,
    isthmus: 0.3,
    cervix: 0.45,
    'uterine-cavity': 0.95,
    'cervical-canal': 0.8,
    'right-fallopian-tube': 0.18,
    'left-fallopian-tube': 0.18,
    'right-ovary': 0.2,
    'left-ovary': 0.2,
    vagina: 0.14,
  });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = UterineFibroidScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveUterineFibroid(this.controls);
    /** The label layer keeps these vectors; the scene writes into them. */
    this.anchorVectors = {
      fibroid: new THREE.Vector3(),
      cavity: new THREE.Vector3(),
      wall: new THREE.Vector3(),
      serosa: new THREE.Vector3(),
    };
  }

  build() {
    this.uterus = buildUterusParts({
      colors: {
        fundus: PALETTE.fundus,
        body: PALETTE.wall,
        isthmus: PALETTE.wall,
        cervix: PALETTE.cervix,
        'uterine-cavity': PALETTE.cavity,
        'cervical-canal': PALETTE.cavity,
        'right-fallopian-tube': PALETTE.neighbour,
        'left-fallopian-tube': PALETTE.neighbour,
        vagina: PALETTE.neighbour,
      },
    });

    // A unit sphere, scaled to the model's diameter. Round rather than whorled:
    // the shape this model has is a sphere, and drawing texture it does not
    // compute would be drawing a claim it does not make.
    this.fibroidGeometry = shapedSphere({ detail: 5, scale: [1, 1, 1] });
    // Translucent, and not writing depth. The cavity it is measured against is
    // directly behind it in every framing this scene uses, and an opaque lump
    // in front of the surface it is pressing into hides the one thing the step
    // says to look at.
    this.fibroidMaterial = tissueMaterial({ color: PALETTE.fibroid, roughness: 0.62, opacity: 0.8 });
    this.fibroidMaterial.depthWrite = false;
    this.fibroid = new THREE.Mesh(this.fibroidGeometry, this.fibroidMaterial);
    this.fibroid.name = 'fibroid';

    this.root.add(createStudioLights(), this.uterus.object, this.fibroid);
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = the smallest the scene draws, 1 = the largest */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.diameter = lerp(DIAMETER_RANGE.min, DIAMETER_RANGE.max, this.progress);
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
    this.setProgress(this.progress);
  }

  solve() {
    this.solved = solveUterineFibroid(this.controls);
    this.applyModelToScene();
  }

  update() {}

  setOpacity(id, opacity) {
    const material = this.uterus?.mesh(id)?.material;
    if (!material) return;
    material.transparent = opacity < 1;
    material.opacity = opacity;
    // Nothing translucent writes depth: the subject is *inside* these shells,
    // and a shell that writes depth culls the thing it is wrapped around.
    material.depthWrite = opacity >= 1;
  }

  applyModelToScene() {
    if (!this.uterus) return;
    const solved = this.solved;

    for (const [id, opacity] of Object.entries(UterineFibroidScene.SURFACE_OPACITY)) {
      this.setOpacity(id, opacity);
    }

    this.fibroid.visible = solved.present;
    this.fibroid.scale.setScalar(solved.radius);
    this.fibroid.position.set(
      UterineFibroidScene.SITE.x,
      UterineFibroidScene.SITE.y,
      solved.centreDepth
    );

    // The cavity marks where the model says it is being pressed into, and only
    // once that is more than a touch. The threshold is the model's.
    const cavity = this.uterus.mesh('uterine-cavity');
    if (cavity) {
      cavity.material.color
        .set(PALETTE.cavity)
        .lerp(new THREE.Color(PALETTE.cavityPressed), clamp(solved.cavityContactFraction * 1.6));
    }

    this.updateAnchors();
  }

  /** Where every label hangs, written into the vectors the layer is holding. */
  updateAnchors() {
    const { anchorVectors, solved } = this;
    const { x, y } = UterineFibroidScene.SITE;
    anchorVectors.fibroid.set(x, y + Math.max(0.42, solved.radius + 0.2), solved.centreDepth + 0.2);
    anchorVectors.cavity.set(-0.95, 0.46, -0.55);
    anchorVectors.wall.set(0.95, -0.3, -0.35);
    // Just outside the front of the body, below the fibroid: the outer surface
    // is the thing a subserosal one stands past, and a label parked above the
    // fundus named a place the reader was not being asked to look at.
    anchorVectors.serosa.set(0, -0.34, 0.56);
  }

  // --- what the interface reads --------------------------------------------

  /**
   * Framings a guided explanation may ask for. Presentation only.
   *
   * All three keep a line of sight from the side, because the depth in the wall
   * is the subject and depth is the one axis a frontal view flattens. `cavity`
   * turns far enough to see the cavity as a surface rather than as an edge.
   */
  static guideFramings = Object.freeze({
    whole: Object.freeze({
      target: new THREE.Vector3(0, 0.05, 0),
      distance: 3.9,
      direction: new THREE.Vector3(3.3, 0.45, 1.7).normalize(),
    }),
    wall: Object.freeze({
      target: new THREE.Vector3(0, 0.16, 0.08),
      distance: 3.1,
      direction: new THREE.Vector3(3.4, 0.3, 1.2).normalize(),
    }),
    cavity: Object.freeze({
      target: new THREE.Vector3(0, 0.16, 0),
      distance: 3.6,
      direction: new THREE.Vector3(1.5, 0.4, 3.4).normalize(),
    }),
  });

  getGuideFramings() {
    return UterineFibroidScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = { fibroid: () => this.solved.present };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const reaches = !solved.present
      ? '—'
      : solved.reachesCavity && solved.reachesSerosa
        ? 'the cavity and the outer surface'
        : solved.reachesCavity
          ? 'the cavity'
          : solved.reachesSerosa
            ? 'the outer surface'
            : 'neither boundary';
    const value = {
      uterineVolume: solved.uterineVolumeRatio.toFixed(3),
      cavityContact: Math.round(solved.cavityContactFraction * 100),
      bulge: Math.round(solved.serosalBulgeFraction * 100),
      wall: solved.wallThickeningRatio.toFixed(2),
      reaches,
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.fibroidGeometry?.dispose();
    this.fibroidMaterial?.dispose();
    this.uterus?.dispose();
    disposeObject(this.root);
  }
}
