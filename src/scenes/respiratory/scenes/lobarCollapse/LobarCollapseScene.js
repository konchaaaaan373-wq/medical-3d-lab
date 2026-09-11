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
} from '../../../../data/lobarCollapse.js';
import { DEFAULT_CONTROLS, solveLobarCollapse } from '../../../../models/lobarCollapse.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { buildLungs } from '../../organs/lungs.js';

/**
 * Lobar collapse, told as **where the volume went**.
 *
 * ### What changes on screen is size
 *
 * Every other way of drawing a collapsed lobe is a way of drawing density —
 * darker, denser, more opaque — and every one of them draws the same picture
 * consolidation draws. This scene changes **scale** and nothing else about the
 * lobe: it is smaller, the lobes beside it are larger, and their colours say
 * which is which rather than how airless anything is.
 *
 * A lobe is scaled about its own centre, so its volume follows the cube of the
 * scale and the model's volume ratio is what the scale is the cube root of. The
 * atlas's lobes are closed meshes cut from one lung, so scaling one leaves a gap
 * at its fissures; the lobes that expand close most of it, which is the claim
 * arriving rather than an artefact being tidied away.
 *
 * ### Two midlines, because one is not a measurement
 *
 * The hemithorax's share of the vacated room comes out as a distance of about a
 * third of a unit, and a third of a unit is a few dozen pixels of something a
 * reader has no reference for. So the scene draws the midline **twice**: one
 * bar stays where it began and one moves, and the claim is the gap between
 * them. That is the same answer the hip and the shoulder arrived at — when the
 * model's answer is a displacement, draw the space it opened, not the thing
 * that moved.
 */
export class LobarCollapseScene {
  static meta = {
    id: 'lobar-collapse',
    status: 'alpha',
    title: 'Lobar collapse: where the volume went',
    titleJa: '肺葉性無気肺：容積はどこへ行ったのか',
    subtitle: 'A collapsed lobe is smaller, not denser — and the room it left is taken by the rest of that side',
    subtitleJa: '虚脱した肺葉は濃くなるのではなく小さくなり、空いた場所は同じ側が引き受けます',
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
    position: new THREE.Vector3(0.2, -0.35, 9.6),
    target: new THREE.Vector3(0, -0.35, 0),
  };

  /**
   * How solid each lobe is drawn, once something has collapsed.
   *
   * **The one that is solid is the collapsed one**, which is the inverse of the
   * convention a reader arrives with. A lower lobe sits behind the lobes above
   * it and gets further behind them as it shrinks, so without this the subject
   * of the scene is invisible from the only view that shows both lungs — and
   * fading it instead would have been drawing density, the one thing this scene
   * is about not drawing. Opacity here is **visibility and never airlessness**.
   */
  static SOLIDITY = Object.freeze({ collapsed: 1, sameSide: 0.4, otherSide: 0.3 });

  /** The two bars that stand for the middle, and how tall they are drawn. */
  static MIDLINE = Object.freeze({ height: 3.4, width: 0.05, depth: 0.05, z: 1.05 });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = LobarCollapseScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveLobarCollapse(this.progress, this.controls);
    this.anchorVectors = {
      rightLung: new THREE.Vector3(),
      leftLung: new THREE.Vector3(),
      blockage: new THREE.Vector3(),
      collapsed: new THREE.Vector3(),
      expanded: new THREE.Vector3(),
      midline: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());

    this.lungs = buildLungs({ bronchi: true, vessels: false, excursion: 0, detail: 12 });
    this.root.add(this.lungs.object);

    this.lobeById = new Map();
    for (const lobe of this.lungs.lobes) {
      lobe.mesh.material.transparent = true;
      this.lobeById.set(lobe.id, lobe);
    }

    // The middle, drawn twice: one bar where it began and one where the model
    // put it. The gap between them is the claim, and a single bar would have
    // asked the reader to remember a position instead of reading one.
    const { height, width, depth, z } = LobarCollapseScene.MIDLINE;
    this.midlineGeometry = new THREE.BoxGeometry(width, height, depth);
    this.restingMidlineMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.midline,
      transparent: true,
      opacity: 0.32,
      depthTest: false,
    });
    this.midlineMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.midline,
      transparent: true,
      depthTest: false,
    });
    this.restingMidline = new THREE.Mesh(this.midlineGeometry, this.restingMidlineMaterial);
    this.midline = new THREE.Mesh(this.midlineGeometry, this.midlineMaterial);
    for (const bar of [this.restingMidline, this.midline]) {
      bar.position.set(0, 0.1, z);
      bar.renderOrder = 14;
      this.root.add(bar);
    }
    this.restingMidline.name = 'midline-at-rest';
    this.midline.name = 'midline';

    // The blockage. In front of everything, because it sits on a bronchus that
    // is inside a lung.
    this.markerGeometry = new THREE.TorusGeometry(0.18, 0.04, 8, 24);
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

  /** @param {number} value 0 = the lobe is full of air, 1 = as airless as it goes */
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
    this.solved = solveLobarCollapse(this.progress, this.controls);
    this.applyModelToScene();
  }

  update() {}

  // --- the model on screen --------------------------------------------------

  applyModelToScene() {
    const solved = this.solved;

    for (const state of solved.lobes) {
      const lobe = this.lobeById?.get(state.id);
      if (!lobe) continue;
      // Volume goes as the cube of the scale, so the scale is the cube root of
      // the ratio and the drawn volume is the model's, not a likeness of it.
      const scale = Math.cbrt(state.volumeRatio);
      lobe.mesh.scale.setScalar(scale);
      // Scaled about the lobe's own centre rather than about the mesh origin,
      // so a lobe that is losing volume stays where it is instead of sliding
      // towards the middle of the lung as it shrinks.
      lobe.mesh.position.copy(lobe.centre).multiplyScalar(1 - scale);

      const colour = state.collapsed
        ? PALETTE.collapsed
        : state.expanded
          ? PALETTE.expanded
          : state.onTheSide
            ? PALETTE.lung
            : solved.blocked
              ? PALETTE.spared
              : PALETTE.lung;
      lobe.mesh.material.color.set(colour);

      // Ghosted so the collapsed lobe can be seen behind the ones that grew
      // over it. Faded in with the axis, so nothing jumps when the first air
      // goes, and the collapsed lobe itself never fades at all.
      const { collapsed, sameSide, otherSide } = LobarCollapseScene.SOLIDITY;
      const target = state.collapsed ? collapsed : state.onTheSide ? sameSide : otherSide;
      lobe.mesh.material.opacity = solved.blocked ? 1 + (target - 1) * solved.absorbed : 1;
      lobe.mesh.material.depthWrite = lobe.mesh.material.opacity >= 1;
    }

    // The middle. One bar holds still and the other carries the model's
    // distance, towards the side the collapse is on.
    const towards = solved.shiftTowards === 'right' ? -1 : solved.shiftTowards === 'left' ? 1 : 0;
    if (this.midline) this.midline.position.x = towards * solved.shift;

    this.updateAnchors();

    const at = this.blockagePoint();
    if (this.marker) {
      this.marker.visible = Boolean(at) && solved.blocked;
      if (at) this.marker.position.copy(at);
    }
  }

  /**
   * Where the blockage is drawn: at the collapsed lobe's own centre, which is
   * where the bronchus reaching it ends.
   *
   * **The marker has no size and is not a thing.** It marks which way in is
   * shut, and this scene has no bronchial tree fine enough to put it on a named
   * lobar bronchus — so it goes at the lobe the model named.
   */
  blockagePoint() {
    const lobe = this.solved.blockedAt ? this.lobeById?.get(this.solved.blockedAt) : null;
    if (!lobe) return null;
    return lobe.mesh.localToWorld(lobe.centre.clone()).sub(this.root.position);
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    anchorVectors.rightLung.set(-2.15, 1.0, 0.7);
    anchorVectors.leftLung.set(2.15, 1.0, 0.7);
    // Beside the bars rather than below them: below is where the explanation
    // panel is, and a label for the gap has to sit where the gap is.
    anchorVectors.midline.set(0.95, 0.55, 1.1);

    const at = this.blockagePoint();
    if (at) anchorVectors.blockage.copy(at).add(new THREE.Vector3(0, 0.5, 1.2));

    const collapsed = solved.blockedAt ? this.lobeById?.get(solved.blockedAt) : null;
    if (collapsed) {
      const out = collapsed.side === 'right' ? -1.15 : 1.15;
      anchorVectors.collapsed.copy(collapsed.centre).add(new THREE.Vector3(out, -0.3, 1.0));
    }

    // The label for the room's destination goes on the largest of the lobes
    // that took it, because that is where the change is easiest to see.
    const expanded = solved.lobes
      .filter((lobe) => lobe.expanded)
      .sort((a, b) => b.restingShare - a.restingShare)[0];
    const mesh = expanded ? this.lobeById?.get(expanded.id) : null;
    if (mesh) {
      const out = expanded.side === 'right' ? -1.15 : 1.15;
      anchorVectors.expanded.copy(mesh.centre).add(new THREE.Vector3(out, 0.45, 1.0));
    }
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    chest: Object.freeze({
      target: new THREE.Vector3(0, -0.35, 0),
      distance: 9.6,
      direction: new THREE.Vector3(0.2, 0.05, 9.6).normalize(),
    }),
    // A posterolateral oblique, because the lower lobes are behind the lobes
    // above them: from the anterior view that shows both lungs at once, the
    // subject of this scene is not visible at all when it is a lower lobe.
    lobe: Object.freeze({
      target: new THREE.Vector3(-0.75, -0.45, 0),
      distance: 8.8,
      direction: new THREE.Vector3(-0.85, 0.12, -0.95).normalize(),
    }),
    middle: Object.freeze({
      target: new THREE.Vector3(0, -0.5, 0),
      distance: 7.4,
      direction: new THREE.Vector3(0.05, 0.05, 7.4).normalize(),
    }),
  });

  getGuideFramings() {
    return LobarCollapseScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const drawn = {
      blockage: () => this.solved.blocked,
      collapsed: () => this.solved.blocked,
      expanded: () => this.solved.restExpanded,
    };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const collapsed = solved.blockedAt ? solved.lobe(solved.blockedAt) : null;
    const expanded = solved.lobes.filter((lobe) => lobe.onTheSide && lobe.id !== solved.blockedAt);
    const share = (value) => (solved.vacated > 0 ? Math.round((value / solved.vacated) * 100) : 0);
    const value = {
      lobe: collapsed ? Math.round(collapsed.volumeRatio * 100) : 100,
      where: solved.blocked
        ? `${share(solved.takenByTheRest)}% to the rest of that lung, ${share(solved.takenByTheHemithorax)}% to the side itself`
        : 'nothing has been vacated',
      rest: expanded.length > 0 ? (expanded[0].volumeRatio).toFixed(2) : '1.00',
      shift: solved.shift.toFixed(2),
      otherSide: solved.sparedSide ? 'unchanged by this model' : '—',
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.midlineGeometry?.dispose();
    this.midlineMaterial?.dispose();
    this.restingMidlineMaterial?.dispose();
    this.markerGeometry?.dispose();
    this.markerMaterial?.dispose();
    this.lungs?.dispose?.();
    disposeObject(this.root);
  }
}
