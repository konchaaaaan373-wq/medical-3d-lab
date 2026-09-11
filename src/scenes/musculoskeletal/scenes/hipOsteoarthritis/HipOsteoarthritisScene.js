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
} from '../../../../data/hipOsteoarthritis.js';
import { DEFAULT_CONTROLS, HIP, solveHipOsteoarthritis } from '../../../../models/hipOsteoarthritis.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { MEDIAL, SITES, buildHipJoint } from '../../organs/hipJoint.js';

/**
 * Hip osteoarthritis, told as two centres coming apart.
 *
 * ### The atlas gave the scene its sentence
 *
 * `hipJoint.js` says of its own two sites: *the centre of the socket and the
 * centre of the ball are the same point — they are the same point, which is the
 * difference between this joint and the shoulder*. Everything here follows from
 * taking that literally: osteoarthritis in a ball-and-socket joint is what
 * happens when that stops being true, and it is visible as a separation rather
 * than as a thinning.
 *
 * ### The scene draws the space, and hides the atlas's layer while it does
 *
 * The atlas glazes both surfaces with an even layer, which is right for an
 * atlas and is the one thing this scene is about not being true. So the layer
 * is hidden and the **space** is drawn instead: a ring of segments round the
 * socket, each as thick as the model says the space is in that direction. A
 * reader looking at the ring is looking at the model's answer directly, which
 * is also the only way a change of a few hundredths of a unit is legible at all.
 */
export class HipOsteoarthritisScene {
  static meta = {
    id: 'hip-osteoarthritis',
    status: 'alpha',
    title: 'Hip osteoarthritis: a centre that stopped being shared',
    titleJa: '股関節症：共有されなくなった中心',
    subtitle: 'A ball in a socket does not narrow all round — it narrows in a direction',
    subtitleJa: '臼蓋にはまった球は全周で狭くなるのではなく、1 つの方向で狭くなります',
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
    position: new THREE.Vector3(0.1, 0.55, 4.4),
    target: new THREE.Vector3(-0.05, 0.1, 0),
  };

  /** Everything that belongs to the femur and settles with the ball. */
  static FEMORAL_PARTS = Object.freeze([
    'femoral-head',
    'femoral-neck',
    'greater-trochanter',
    'lesser-trochanter',
    'femoral-shaft',
  ]);

  /** How far round the socket the ring is drawn, and in how many pieces. */
  static RING = Object.freeze({ sweep: (116 * Math.PI) / 180, segments: 30, depth: 0.34 });

  static CONTEXT_OPACITY = Object.freeze({
    'hip-bone': 0.3,
    acetabulum: 0.36,
    'femoral-head': 0.5,
    'femoral-neck': 0.6,
    'femoral-shaft': 0.45,
    'greater-trochanter': 0.5,
    'lesser-trochanter': 0.45,
    'iliofemoral-ligament': 0.14,
    'pubofemoral-ligament': 0.14,
    'ischiofemoral-ligament': 0.14,
    'gluteus-medius-tendon': 0.14,
    'iliopsoas-tendon': 0.14,
    'ligament-of-the-head': 0.3,
  });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = HipOsteoarthritisScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveHipOsteoarthritis(this.controls);
    this.anchorVectors = {
      space: new THREE.Vector3(),
      head: new THREE.Vector3(),
      socket: new THREE.Vector3(),
      opposite: new THREE.Vector3(),
    };
  }

  build() {
    this.hip = buildHipJoint({
      colors: { 'femoral-head': PALETTE.head, acetabulum: PALETTE.socket, 'acetabular-labrum': PALETTE.labrum },
    });

    // The atlas's even layer is the one thing this scene is about not being
    // true, so it comes off and the space goes on instead.
    for (const mesh of this.hip.cartilageMeshes ?? []) mesh.visible = false;

    this.ringGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.ring = [];
    const { segments } = HipOsteoarthritisScene.RING;
    for (let index = 0; index < segments; index += 1) {
      const material = tissueMaterial({ color: PALETTE.space, roughness: 0.3, emissiveIntensity: 0.32 });
      // Drawn over the bone. The ring sits *between* two surfaces that are
      // wrapped round it, so seen through both it is a pale smudge — and it is
      // not a structure competing for depth with them, it is the model's answer
      // laid over the joint. `src/data/hipOsteoarthritis.js` says as much.
      material.transparent = true;
      material.depthTest = false;
      material.depthWrite = false;
      const mesh = new THREE.Mesh(this.ringGeometry, material);
      mesh.renderOrder = 12;
      mesh.name = `joint-space-${index}`;
      this.root.add(mesh);
      this.ring.push({ mesh, material });
    }

    this.restPosition = new Map();
    for (const id of HipOsteoarthritisScene.FEMORAL_PARTS) {
      const mesh = this.hip.mesh(id);
      if (mesh) this.restPosition.set(id, { mesh, at: mesh.position.clone() });
    }

    this.root.add(createStudioLights(), this.hip.object);
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = the layer intact all round, 1 = gone where it goes */
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
    this.solved = solveHipOsteoarthritis(this.controls);
    this.applyModelToScene();
  }

  update() {}

  /**
   * A direction round the socket, in the scene's own coordinates.
   *
   * The angle is measured from the floor of the socket — which is medial, so
   * `+x` in a right hip — towards its roof. Rule 5: the side comes from
   * `MEDIAL` rather than from a sign somebody remembered.
   */
  directionAt(angle) {
    return new THREE.Vector3(MEDIAL * Math.cos(angle), Math.sin(angle), 0);
  }

  applyModelToScene() {
    if (!this.hip) return;
    const solved = this.solved;

    for (const [id, opacity] of Object.entries(HipOsteoarthritisScene.CONTEXT_OPACITY)) {
      const material = this.hip.mesh(id)?.material;
      if (!material) continue;
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
    }

    // The ball settles along the direction the layer went, by what has gone.
    const shift = this.directionAt(Math.atan2(solved.migration.y, solved.migration.x))
      .multiplyScalar(solved.offset * (solved.offsetFraction > 0 ? 1 : 0));
    for (const { mesh, at } of this.restPosition.values()) mesh.position.copy(at).add(shift);

    this.writeRing();
    this.updateAnchors();
  }

  /** The space, as a ring of segments each as thick as the model says. */
  writeRing() {
    const { sweep, segments, depth } = HipOsteoarthritisScene.RING;
    const centre = new THREE.Vector3(...SITES.acetabulum);
    const arc = (sweep / segments) * (HIP.headRadius + HIP.layer / 2) * 1.08;
    const open = new THREE.Color(PALETTE.space);
    const tight = new THREE.Color(PALETTE.narrowed);
    const wide = new THREE.Color(PALETTE.widened);

    for (let index = 0; index < segments; index += 1) {
      const angle = (sweep * (index + 0.5)) / segments;
      const gap = this.solved.gapAt(angle);
      const fraction = gap / HIP.layer;
      const direction = this.directionAt(angle);
      const { mesh, material } = this.ring[index];

      // A floor, so a space the model has closed is drawn as a line rather than
      // as nothing: "closed to a hairline" is a picture and "absent" is not.
      mesh.scale.set(Math.max(0.022, gap), arc, depth);
      mesh.position.copy(centre).addScaledVector(direction, HIP.headRadius + gap / 2);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.clone().normalize());

      material.color
        .set(open)
        .lerp(tight, clamp((1 - fraction) * 1.15))
        .lerp(wide, clamp((fraction - 1) * 3.2));
    }
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    const centre = new THREE.Vector3(...SITES.acetabulum);
    // Kept below the top of the frame: the socket's roof is already high in
    // every framing this scene uses, and a label hung a unit and a quarter
    // above it lands off the top of the screen.
    const worst = this.directionAt(solved.narrowest.angle).multiplyScalar(1.0);
    const best = this.directionAt(solved.widest.angle).multiplyScalar(1.15);
    anchorVectors.space.copy(centre).add(worst).setZ(0.7);
    anchorVectors.space.setY(Math.min(anchorVectors.space.y, 0.92));
    anchorVectors.head.set(-MEDIAL * 1.25, 0.05, 0.7);
    anchorVectors.socket.set(MEDIAL * 1.35, 0.95, 0.6);
    anchorVectors.opposite.copy(centre).add(best).setZ(0.7);
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    hip: Object.freeze({
      target: new THREE.Vector3(-0.05, 0.1, 0),
      distance: 4.4,
      direction: new THREE.Vector3(0.1, 0.55, 4.4).normalize(),
    }),
    socket: Object.freeze({
      target: new THREE.Vector3(MEDIAL * 0.2, 0.34, 0),
      distance: 3.3,
      direction: new THREE.Vector3(0.05, 0.3, 4.2).normalize(),
    }),
    round: Object.freeze({
      target: new THREE.Vector3(MEDIAL * 0.28, 0.36, 0),
      distance: 3.6,
      direction: new THREE.Vector3(0.5, 0.55, 3.9).normalize(),
    }),
  });

  getGuideFramings() {
    return HipOsteoarthritisScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = { opposite: () => this.solved.apparentWidening };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const named = (id) =>
      MODEL_CONTROLS[0].options.find((option) => option.value === id)?.label ?? id.replace(/-/g, ' ');
    const shape = !solved.present || solved.loss === 0
      ? 'the layer is intact all round'
      : solved.concentric
        ? 'closing all round, centres still shared'
        : `closing ${named(solved.narrowest.id).toLowerCase()}`;
    const value = {
      narrowest: solved.present && solved.loss > 0 ? named(solved.narrowest.id) : '—',
      atNarrowest: Math.round(solved.narrowest.gapFraction * 100),
      atWidest: Math.round(solved.widest.gapFraction * 100),
      offset: Math.round(solved.offsetFraction * 100),
      shape,
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.ringGeometry?.dispose();
    for (const segment of this.ring ?? []) segment.material.dispose();
    this.hip?.dispose();
    disposeObject(this.root);
  }
}
