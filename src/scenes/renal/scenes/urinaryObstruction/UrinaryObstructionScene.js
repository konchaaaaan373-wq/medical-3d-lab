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
} from '../../../../data/urinaryObstruction.js';
import {
  DEFAULT_CONTROLS,
  STRETCHES,
  solveUrinaryObstruction,
} from '../../../../models/urinaryObstruction.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { buildBladder, buildKidney, buildUreter } from '../../organs/kidney.js';

/**
 * Urinary obstruction, told as **what is above it**.
 *
 * ### Why both kidneys are on screen at once
 *
 * Every other scene in this repository that has a paired organ shows one of
 * them. This one cannot: its first claim is that the number of kidneys behind a
 * blockage is a property of where the blockage is, and a claim about *how many*
 * needs both in the frame. The side that is not behind it is drawn in its own
 * colour and does not move, because a reader who sees one kidney change will
 * assume the other did too.
 *
 * ### The parenchyma is drawn as a space, not as a tissue
 *
 * The landmark kidney has three nested shapes — cortex, medulla, pelvis — and
 * for this scene the middle one is in the way. What the model computes is the
 * **thickness left between the capsule and the collecting system**, so the
 * scene draws exactly those two surfaces and lets the parenchyma be the gap:
 * the outer one translucent, the inner one solid and growing inside it. The
 * medulla is hidden while that happens. Drawing a third shell would have put a
 * surface across the very space the claim is about.
 *
 * The dilating pelvis expands **inwards from the hilum**, which is why its
 * centre moves as it grows: an inner shape that simply scaled about its resting
 * centre would push out through the medial border, and the hilum is the one
 * place the capsule does not close.
 *
 * ### The tract is redrawn, not recoloured
 *
 * Each named stretch is drawn at the calibre the model gives it, so the step
 * from a distended stretch to an undistended one *is* the blockage. That is
 * the only way the picture can say "above" and "below" rather than "affected"
 * and "not affected".
 */
export class UrinaryObstructionScene {
  static meta = {
    id: 'urinary-obstruction',
    status: 'alpha',
    title: 'Urinary obstruction: what is above it',
    titleJa: '尿路閉塞：その上流にあるもの',
    subtitle: 'Two tubes join at the bladder — so where the blockage is decides how many kidneys are behind it',
    subtitleJa: '2 本の管は膀胱で合流します。だから閉塞の場所が、上流にある腎の数を決めます',
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
    position: new THREE.Vector3(0.2, -1.02, 10),
    target: new THREE.Vector3(0, -1.02, 0),
  };

  /**
   * Where each organ sits, in the scene's own coordinates.
   *
   * Rule 5: the scene's left and right are defined here once, and every part
   * that has a side reads its position from this table rather than from a sign
   * somebody remembered. Screen-left is the model's `left` throughout.
   */
  static PLACES = Object.freeze({
    left: Object.freeze({ x: -1.45, y: 0.92 }),
    right: Object.freeze({ x: 1.45, y: 1.0 }),
    bladder: Object.freeze({ x: 0, y: -1.45, z: 0.15 }),
  });

  /** How opaque the capsule is, so the collecting system inside it is visible. */
  static CAPSULE_OPACITY = 0.44;

  /**
   * The collecting system is drawn as **the capsule inset by the thickness the
   * model reports**, on every axis, rather than as one ratio scaled evenly.
   *
   * The first version scaled it by the model's volume ratio. That escapes
   * through the hilum, because a bean is not an ellipsoid; splitting the ratio
   * between the axes stopped the escape and then drew the parenchyma at a
   * fourteenth of its resting thickness where the model said a half, because
   * the split spent nearly all of the growth along the long axis. Neither is
   * the claim. So the gap itself is what is drawn: on each axis the inner
   * surface sits one resting gap times `parenchymaRatio` inside the outer one,
   * and what a reader measures on screen is the number the read-out prints.
   */

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = UrinaryObstructionScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveUrinaryObstruction(this.progress, this.controls);
    this.anchorVectors = {
      leftKidney: new THREE.Vector3(),
      rightKidney: new THREE.Vector3(),
      bladder: new THREE.Vector3(),
      blockage: new THREE.Vector3(),
      parenchyma: new THREE.Vector3(),
      spared: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());

    const { PLACES } = UrinaryObstructionScene;
    this.kidneys = {};
    for (const side of ['left', 'right']) {
      const kidney = buildKidney({
        side,
        color: PALETTE.capsule,
        medullaColor: PALETTE.parenchyma,
        opacity: UrinaryObstructionScene.CAPSULE_OPACITY,
      });
      kidney.object.position.set(PLACES[side].x, PLACES[side].y, 0);

      const cortex = kidney.object.children.find((child) => child.name === 'cortex');
      const medulla = kidney.object.children.find((child) => child.name === 'medulla');
      const pelvis = kidney.object.children.find((child) => child.name === 'pelvis');

      // The capsule has to be seen through, or the thing the claim is about —
      // the gap between it and the collecting system — is behind it.
      if (cortex) {
        cortex.material.transparent = true;
        cortex.material.depthWrite = false;
        cortex.renderOrder = 2;
      }
      // The middle shell would sit across the space the model computes.
      if (medulla) medulla.visible = false;
      if (pelvis) {
        pelvis.material.color.set(PALETTE.collecting);
        pelvis.material.emissive?.set(PALETTE.collecting);
        if ('emissiveIntensity' in pelvis.material) pelvis.material.emissiveIntensity = 0.28;
        pelvis.geometry.computeBoundingBox();
        cortex?.geometry.computeBoundingBox();
        // Both resting shapes, measured off the meshes rather than copied from
        // the builder, so the inset below is a gap in this drawing and not an
        // arithmetic that has drifted from it. The hilum is the side the
        // resting pelvis already reaches out of — the landmark builder draws
        // its funnel emerging there, which is where the ureter leaves.
        const rest = pelvis.position.clone();
        this.pelvisRest = this.pelvisRest ?? {
          position: rest,
          pelvis: pelvis.geometry.boundingBox.max.clone(),
          capsule: cortex.geometry.boundingBox.max.clone(),
          towardsHilum: Math.sign(rest.x) || -1,
        };
      }

      this.kidneys[side] = { ...kidney, cortex, medulla, pelvis };
      this.root.add(kidney.object);
    }

    this.bladder = buildBladder({ color: PALETTE.tract, fluidColor: PALETTE.collecting });
    this.bladder.object.position.set(PLACES.bladder.x, PLACES.bladder.y, PLACES.bladder.z);
    this.root.add(this.bladder.object);

    this.ureters = {};
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1;
      const hilum = this.kidneys[side].hilum;
      const ureter = buildUreter(
        [
          [PLACES[side].x + hilum.x, PLACES[side].y + hilum.y, 0],
          [sign * 1.0, 0.28, 0.05],
          [sign * 0.74, -0.42, 0.1],
          [sign * 0.4, -1.06, 0.15],
          [sign * 0.12, -1.4, 0.15],
        ],
        { color: PALETTE.tract }
      );
      ureter.object.renderOrder = 3;
      this.ureters[side] = ureter;
      this.root.add(ureter.object);
    }

    // The blockage. Drawn in front of everything, because it sits where two
    // stretches meet and would otherwise be inside whichever is nearer.
    this.markerGeometry = new THREE.TorusGeometry(0.16, 0.035, 8, 24);
    this.markerMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.blockage,
      transparent: true,
      depthTest: false,
    });
    this.marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
    this.marker.renderOrder = 20;
    this.marker.name = 'blockage';
    this.root.add(this.marker);

    this.applyModelToScene();
    return this.root;
  }

  /** @param {number} value 0 = draining, 1 = as backed up as the axis goes */
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
    this.solved = solveUrinaryObstruction(this.progress, this.controls);
    this.applyModelToScene();
  }

  update() {}

  // --- the model on screen --------------------------------------------------

  /**
   * Where along a ureter each of its three named stretches lies.
   *
   * The tube is one curve and the stretches are equal divisions of it, which is
   * what the data file says they are. Semantic geometry: callers ask for a
   * stretch by name and this is the only place a fraction of the curve appears.
   */
  static URETER_STRETCHES = Object.freeze(['upper-ureter', 'mid-ureter', 'lower-ureter']);

  stretchAt(side, u) {
    const index = Math.min(2, Math.floor(u * 3));
    const id = `${side}-${UrinaryObstructionScene.URETER_STRETCHES[index]}`;
    return this.solved.stretch(id);
  }

  applyModelToScene() {
    const solved = this.solved;

    for (const side of ['left', 'right']) {
      const kidney = this.kidneys?.[side];
      if (!kidney) continue;
      const state = solved.kidneys[side];
      // Behind the blockage *and* something has actually backed up. Colouring
      // by the level alone painted the blocked side as filling at the bottom of
      // the axis, where nothing has happened to it yet.
      const behind = solved.blocked && solved.sidesBehind.includes(side);

      if (kidney.cortex) {
        kidney.cortex.scale.setScalar(state.capsuleRatio);
        // **Both capsules keep the tissue's own colour.** Colouring the blocked
        // side differently would say its parenchyma had become something else,
        // when what the scene is claiming is that there is less of it — so the
        // side is told by the tract and the label, and the spared one is only
        // muted so the two are distinguishable at a glance.
        kidney.cortex.material.color.set(behind ? PALETTE.parenchyma : PALETTE.spared);
      }
      if (kidney.pelvis) {
        const rest = this.pelvisRest;
        const inset = (axis) => {
          const outer = rest.capsule[axis] * state.capsuleRatio;
          const restingGap = rest.capsule[axis] - rest.pelvis[axis];
          return (outer - restingGap * state.parenchymaRatio) / rest.pelvis[axis];
        };
        const wide = inset('x');
        kidney.pelvis.scale.set(wide, inset('y'), inset('z'));
        // **The hilar edge is pinned and the growth goes inwards.** The resting
        // collecting system already reaches out of the hilum, because that is
        // where the funnel leaves; what must not happen is that dilating it
        // pushes further out through a border the capsule does not close, which
        // would draw the room as escaping rather than as taken from the
        // parenchyma. So the edge that sits at the hilum stays put.
        const edge = rest.position.x + rest.towardsHilum * rest.pelvis.x;
        kidney.pelvis.position.set(
          edge - rest.towardsHilum * rest.pelvis.x * wide,
          rest.position.y,
          rest.position.z
        );
        kidney.pelvis.material.color.set(behind ? PALETTE.distended : PALETTE.collecting);
      }

      const ureter = this.ureters?.[side];
      if (ureter) {
        ureter.surface.refresh((u, base) => base * (this.stretchAt(side, u)?.ratio ?? 1));
        ureter.object.material.color.set(behind ? PALETTE.distended : PALETTE.tract);
      }
    }

    const bladderState = solved.stretch('bladder');
    // The builder's fill takes 0 to 1; the model's ratio is a calibre against
    // rest, so it is mapped onto the room the builder actually offers.
    const filled = bladderState ? (bladderState.ratio - 1) / 0.45 : 0;
    this.bladder?.setFill(0.28 + 0.72 * clamp(filled));
    const bladderWall = this.bladder?.object.children.find((child) => child.name === 'bladder-wall');
    bladderWall?.material.color.set(bladderState?.distended ? PALETTE.distended : PALETTE.tract);

    this.updateAnchors();

    const at = this.blockagePoint();
    if (this.marker) {
      this.marker.visible = Boolean(at) && solved.blocked;
      if (at) this.marker.position.copy(at);
    }
  }

  /**
   * Where the blockage sits: the boundary between the last stretch that fills
   * and the first that does not.
   */
  blockagePoint() {
    const blockedAt = this.solved.blockedAt;
    if (!blockedAt) return null;
    if (blockedAt === 'bladder') {
      const { bladder } = UrinaryObstructionScene.PLACES;
      return new THREE.Vector3(bladder.x, bladder.y - 0.5, bladder.z);
    }
    const side = blockedAt.startsWith('left') ? 'left' : 'right';
    const ureter = this.ureters?.[side];
    if (!ureter) return null;
    const index = UrinaryObstructionScene.URETER_STRETCHES.findIndex((name) =>
      blockedAt.endsWith(name)
    );
    // The pelviureteric level blocks the pelvis, so its boundary is the top of
    // the tube; every other level ends its own third of it.
    const u = index < 0 ? 0.02 : Math.min(0.98, (index + 1) / 3);
    return ureter.curve.getPointAt(u);
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    const { PLACES } = UrinaryObstructionScene;
    // Every anchor is tucked towards the middle of the frame rather than hung
    // outside its organ: the tract is tall, and the readable band of the screen
    // is not. `npm run verify:patient` measures that, and it is the only thing
    // that catches a label sitting behind the explanation panel.
    anchorVectors.leftKidney.set(PLACES.left.x - 0.92, PLACES.left.y + 0.08, 0.5);
    anchorVectors.rightKidney.set(PLACES.right.x + 0.92, PLACES.right.y, 0.5);
    anchorVectors.bladder.set(PLACES.bladder.x + 1.0, PLACES.bladder.y + 0.3, 0.6);

    const at = this.blockagePoint();
    if (at) anchorVectors.blockage.copy(at).add(new THREE.Vector3(0.5, 0.42, 0.8));

    // The parenchyma label goes on a kidney that is behind the blockage, which
    // is the only kidney whose parenchyma this model has changed.
    const behind = solved.sidesBehind[0] ?? 'left';
    anchorVectors.parenchyma.set(
      PLACES[behind].x + (behind === 'left' ? -0.95 : 0.95),
      PLACES[behind].y - 0.3,
      0.7
    );

    const spared = solved.sparedSide;
    if (spared) {
      anchorVectors.spared.set(
        PLACES[spared].x + (spared === 'left' ? -0.95 : 0.95),
        PLACES[spared].y - 0.3,
        0.6
      );
    }
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    tract: Object.freeze({
      target: new THREE.Vector3(0, -1.02, 0),
      distance: 10,
      direction: new THREE.Vector3(0.2, 0.05, 10).normalize(),
    }),
    kidney: Object.freeze({
      target: new THREE.Vector3(-1.45, 0.7, 0),
      distance: 4.4,
      direction: new THREE.Vector3(-0.3, -0.1, 4.4).normalize(),
    }),
    both: Object.freeze({
      target: new THREE.Vector3(0, 0.55, 0),
      distance: 6.6,
      direction: new THREE.Vector3(0, 0.05, 6.6).normalize(),
    }),
    bladder: Object.freeze({
      target: new THREE.Vector3(0, -1.3, 0.15),
      distance: 4.4,
      direction: new THREE.Vector3(0.1, -0.15, 4.4).normalize(),
    }),
    // Two framings aimed below what they are for. The explanation panel takes
    // the lower third of the screen, so a label level with the camera's target
    // lands behind it: these look up at the blockage rather than at it.
    transition: Object.freeze({
      target: new THREE.Vector3(-0.3, 0.46, 0),
      distance: 6.4,
      direction: new THREE.Vector3(0.1, -0.35, 6.4).normalize(),
    }),
    outlet: Object.freeze({
      target: new THREE.Vector3(0, -1.1, 0.15),
      distance: 9.6,
      direction: new THREE.Vector3(0.1, 0.05, 9.6).normalize(),
    }),
  });

  getGuideFramings() {
    return UrinaryObstructionScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = {
      blockage: () => this.solved.blocked,
      spared: () => this.solved.sparedSide !== null,
      parenchyma: () => this.solved.sidesBehind.length > 0,
    };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const behind = solved.sidesBehind[0];
    const state = behind ? solved.kidneys[behind] : null;
    const value = {
      kidneys: solved.kidneysBehind === 0 ? 'none' : String(solved.kidneysBehind),
      parenchyma: state ? Math.round(state.parenchymaRatio * 100) : 100,
      pelvis: state ? state.pelvisRatio.toFixed(2) : '1.00',
      capsule: state ? state.capsuleRatio.toFixed(2) : '1.00',
      tract: Math.round(solved.distendedShare * 100),
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.markerGeometry?.dispose();
    this.markerMaterial?.dispose();
    for (const side of ['left', 'right']) {
      this.ureters?.[side]?.dispose();
      this.kidneys?.[side]?.dispose?.();
    }
    disposeObject(this.root);
  }
}

/** Every stretch the model names, for tests that want to walk them. */
export const TRACT_STRETCHES = STRETCHES;
