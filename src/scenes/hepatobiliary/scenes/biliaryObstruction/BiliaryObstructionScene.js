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
} from '../../../../data/biliaryObstruction.js';
import { DEFAULT_CONTROLS, solveBiliaryObstruction } from '../../../../models/biliaryObstruction.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { smoothCurve } from '../../../shared/geometry/tube.js';
import { buildBiliaryTree } from '../../organs/biliaryTree.js';

/**
 * Where a blockage sits in the biliary tree, and what that decides.
 *
 * ### The geometry is not this scene's
 *
 * `buildBiliaryTree` belongs to the biliary **atlas** and is used here exactly
 * as it stands. That is deliberate and it is the whole reason this scene can
 * say anything: the atlas already decided which mesh is the cystic duct and
 * which is the common bile duct, and the model's segment names are those same
 * names. A second biliary tree drawn for a disease would have been a second
 * chance to get the order wrong, and the order *is* the subject.
 *
 * ### The one axis, and the thing that is not on it
 *
 * `setProgress` is **how complete the blockage is**. Where it is lives on the
 * model controls, because the four sites are four alternatives and an axis
 * would say one becomes the next. A reader comparing them is comparing
 * mechanisms.
 *
 * ### What is drawn from what
 *
 * Every drawn property is written in `applyModelToScene` and nowhere else. A
 * segment swells when *the model says its pressure has risen above its
 * unobstructed value* — read from `solved.behind`, which the model derives from
 * the pressures rather than from a list of sites. The exaggeration is a drawing
 * decision and `src/data/biliaryObstruction.js` declares it as one: this model
 * has a resistance and a pressure, and no lumen at all.
 */
export class BiliaryObstructionScene {
  static meta = {
    id: 'biliary-obstruction',
    status: 'alpha',
    title: 'Biliary obstruction: where the blockage is decides what it does',
    titleJa: '胆道閉塞：どこで詰まるかが、何が起きるかを決める',
    subtitle: 'Four sites, one duct model · the same stone means different things in different places',
    subtitleJa: '4 つの部位・1 つの胆管モデル ｜ 同じ石でも、詰まる場所が違えば意味が違います',
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
    position: new THREE.Vector3(0.9, 0.7, 7.4),
    target: new THREE.Vector3(-0.15, 0.0, 0),
  };

  /**
   * Which meshes each model segment owns.
   *
   * The gallbladder is three meshes and one model compartment; everything else
   * is one of each. Written here rather than in the model because it is a fact
   * about the drawing, and the model must not know how many meshes a thing is.
   */
  static SEGMENT_MESHES = Object.freeze({
    'right-hepatic-duct': ['right-hepatic-duct'],
    'left-hepatic-duct': ['left-hepatic-duct'],
    'common-hepatic-duct': ['common-hepatic-duct'],
    'common-bile-duct': ['common-bile-duct'],
    'pancreatic-duct': ['pancreatic-duct'],
    gallbladder: ['gallbladder-fundus', 'gallbladder-body', 'gallbladder-neck'],
  });

  /** Which mesh the reader's chosen site marks. `none` marks nothing. */
  static SITE_MESHES = Object.freeze({
    none: [],
    'cystic-duct': ['cystic-duct'],
    'common-bile-duct': ['common-bile-duct'],
    ampulla: ['major-duodenal-papilla'],
  });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = BiliaryObstructionScene.meta.id;
    this.progress = 0;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveBiliaryObstruction(this.controls);
  }

  build() {
    this.tree = buildBiliaryTree({ colors: { gallbladder: PALETTE.gallbladder }, opacity: 0.95 });

    /**
     * The two streams, on the two paths the model actually solves.
     *
     * Bile runs from the hepatic ducts to the papilla; pancreatic juice runs
     * from the pancreatic duct to the same papilla. They are separate streams
     * because the model gives them separate flows, and an ampullary blockage is
     * the only thing that stops both — which is a thing to *see*, not to read.
     */
    const { junctions } = this.tree;
    this.bileStream = createFlowStream({
      curves: [
        smoothCurve([
          [-1.25, 1.52, 0.18],
          [-0.62, 1.18, 0.08],
          junctions.confluence.toArray(),
          [-0.08, 0.5, 0],
          junctions.cystic.toArray(),
          [-0.02, -0.5, -0.06],
          [0.16, -0.88, -0.16],
          junctions.papilla.toArray(),
        ]),
      ],
      count: 90,
      color: PALETTE.bile,
      size: 5.2,
      speed: 0.16,
      spread: 0.035,
      seed: 17,
      opacity: 0.85,
    });
    this.pancreaticStream = createFlowStream({
      curves: [
        smoothCurve([
          [1.35, -1.28, -0.28],
          [0.82, -1.16, -0.24],
          junctions.papilla.toArray(),
        ]),
      ],
      count: 44,
      color: PALETTE.pancreaticDuct,
      size: 4.6,
      speed: 0.2,
      spread: 0.03,
      seed: 23,
      opacity: 0.8,
    });

    /**
     * The cystic duct's own stream, and why it is its own.
     *
     * The gallbladder is a dead end: nothing runs *through* it. What this shows
     * is whether it is still exchanging with the duct beside it at all, so it
     * runs at the rate the model's time constant allows and stops dead when the
     * model says the gallbladder has stopped keeping up. That stopping is the
     * entire visible content of a cystic-duct blockage, because the flow to the
     * gut does not change by so much as a drop.
     */
    const neckEnd = this.tree.gallbladderCurve.getPointAt(1);
    this.cysticStream = createFlowStream({
      curves: [smoothCurve([neckEnd.toArray(), [-0.46, 0.16, 0.13], junctions.cystic.toArray()])],
      count: 26,
      color: PALETTE.bile,
      size: 4.4,
      speed: 0.12,
      spread: 0.03,
      seed: 29,
      opacity: 0.75,
    });

    // The marker that says which resistance the reader raised. A ring rather
    // than a lump, because a lump would be a stone and there is no stone here.
    this.markerGeometry = new THREE.TorusGeometry(0.17, 0.035, 10, 26);
    this.markerMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.blocked,
      emissive: PALETTE.blocked,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0,
      roughness: 0.35,
    });
    this.marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
    this.marker.name = 'blockage-marker';

    // Every mesh's authored scale, so distension is applied to it rather than
    // accumulated on top of whatever the last frame left.
    this.restScale = new Map();
    for (const [id, mesh] of this.tree.index) this.restScale.set(id, mesh.scale.clone());

    this.root.add(
      createStudioLights(),
      this.tree.object,
      this.bileStream.object,
      this.pancreaticStream.object,
      this.cysticStream.object,
      this.marker
    );
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = open, 1 = blocked */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.completeness = this.progress;
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
    this.controls = { ...DEFAULT_CONTROLS, completeness: this.progress };
    this.solve();
  }

  solve() {
    this.solved = solveBiliaryObstruction(this.controls);
    this.applyModelToScene();
  }

  update(dt) {
    this.bileStream?.update(dt);
    this.pancreaticStream?.update(dt);
    this.cysticStream?.update(dt);
  }

  /**
   * Every drawn property, in one place. Nothing else in this file writes a
   * colour, a scale or an opacity.
   */
  applyModelToScene() {
    if (!this.tree) return;
    const solved = this.solved;

    // Distension: the segments the model says are behind the blockage. The
    // amount is a drawing decision and is declared as one; what is the model's
    // is *which* segments and the ordering between them.
    for (const [segment, meshes] of Object.entries(BiliaryObstructionScene.SEGMENT_MESHES)) {
      // Each segment against **its own** unobstructed pressure, which the model
      // hands out. One shared number would have swelled the pancreatic duct on
      // every frame, because it sits higher than the bile duct when everything
      // is open.
      const resting = solved.restingPressure[segment];
      const pressure = segment === 'gallbladder'
        ? solved.gallbladderPressureCmH2O
        : solved.pressure[segment] ?? resting;
      const raised = clamp((pressure - resting) / 18);
      // Enough that the change reads across the frame, and no more. It is an
      // emphasis on a pressure, not a calibre, and a duct drawn at twice its
      // width invites exactly the reading the visual mapping forbids.
      const swell = segment === 'gallbladder' ? 1 + 0.3 * raised : 1 + 0.45 * raised;
      for (const id of meshes) {
        const mesh = this.tree.mesh(id);
        const rest = this.restScale.get(id);
        if (!mesh || !rest) continue;
        mesh.scale.copy(rest).multiplyScalar(swell);
        // A segment behind the blockage takes the pressure colour; the rest
        // keep the colour the atlas gave them.
        mesh.material.emissive?.set(solved.behind[segment] ? PALETTE.pressure : '#000000');
        if (mesh.material.emissive) mesh.material.emissiveIntensity = solved.behind[segment] ? 0.18 + 0.5 * raised : 0;
      }
    }

    // The streams run at the fraction of normal the model solves, so a stream
    // that has stopped is a flow the model put at zero.
    this.bileStream?.setRate(0.15 + 2.2 * solved.bileDeliveredFraction);
    this.bileStream?.setOpacity(0.12 + 0.7 * solved.bileDeliveredFraction);
    this.pancreaticStream?.setRate(0.15 + 2.2 * solved.pancreaticDeliveredFraction);
    this.pancreaticStream?.setOpacity(0.12 + 0.68 * solved.pancreaticDeliveredFraction);
    // The gallbladder's exchange with the duct, at the rate its time constant
    // allows. A model that says it has stopped keeping up stops this dead.
    const keepingUp = solved.gallbladderConnected
      ? clamp(9 / Math.max(1, solved.gallbladderTimeConstantMin))
      : 0;
    this.cysticStream?.setRate(2.0 * keepingUp);
    this.cysticStream?.setOpacity(0.08 + 0.7 * keepingUp);

    // Where the reader put the blockage, once it is more than nominal.
    const marked = BiliaryObstructionScene.SITE_MESHES[this.controls.site] ?? [];
    const shown = marked.length && this.progress > 0.08;
    this.markerMaterial.opacity = shown ? 0.55 + 0.4 * this.progress : 0;
    if (shown) {
      const mesh = this.tree.mesh(marked[0]);
      if (mesh) {
        // The centre of what is drawn, not the mesh's origin. These tubes are
        // built with their vertices already in the tree's coordinates, so every
        // one of their transforms is the identity and asking the mesh where it
        // is puts the marker at the root for all of them.
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        mesh.geometry.boundingBox.getCenter(this.marker.position);
        mesh.localToWorld(this.marker.position);
        this.marker.lookAt(this.marker.position.clone().add(new THREE.Vector3(0, 1, 0)));
      }
    }
  }

  // --- what the interface reads --------------------------------------------

  /**
   * Framings a guided explanation may ask for. Presentation only.
   *
   * Two, because the tree is tall and the two things worth looking closely at
   * are at opposite ends of it: the gallbladder hanging off the duct near the
   * top, and the papilla where the two ducts meet at the bottom. Both keep the
   * scene's own line of sight.
   */
  static guideFramings = Object.freeze({
    // The whole tree, for the step that asks the reader to follow it from the
    // liver to the gut. Further back than the scene's own shot because the
    // console and the nav each take a band and the papilla's label sits at the
    // bottom of the run — measured by `scripts/check-patient-explanation.mjs`.
    whole: Object.freeze({
      target: new THREE.Vector3(-0.1, -0.46, 0),
      distance: 10.2,
      direction: new THREE.Vector3(1.05, 0.7, 7.4).normalize(),
    }),
    // Two shots that lean towards one end of the tree **without losing the
    // other**, which is what they are for: every step here is about a
    // relationship between two places, so a close-up of one of them has cropped
    // the sentence. They were six units and then nine before they were ten: at
    // six the common bile duct filled the frame and the gallbladder was a slab
    // off the corner; at nine the hepatic ducts the step points at ran off the
    // top. Measured each time.
    upper: Object.freeze({
      target: new THREE.Vector3(-0.45, -0.42, 0),
      distance: 10.0,
      direction: new THREE.Vector3(1.05, 0.7, 7.4).normalize(),
    }),
    lower: Object.freeze({
      target: new THREE.Vector3(0.15, -0.55, 0),
      distance: 10.4,
      direction: new THREE.Vector3(1.05, 0.7, 7.4).normalize(),
    }),
  });

  getGuideFramings() {
    return BiliaryObstructionScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    const { junctions, anchors } = this.tree ?? {};
    if (!anchors) return [];
    const blockage = BiliaryObstructionScene.SITE_MESHES[this.controls.site]?.[0];
    const blockageAt = blockage ? this.tree.mesh(blockage)?.getWorldPosition(new THREE.Vector3()) : null;
    const positions = {
      gallbladder: anchors.gallbladder.clone(),
      cystic: junctions.cystic.clone().add(new THREE.Vector3(-1.15, 0.55, 0.5)),
      commonBile: junctions.cystic.clone().add(new THREE.Vector3(1.15, -0.5, 0.4)),
      pancreaticDuct: new THREE.Vector3(1.95, -1.45, 0.2),
      papilla: anchors.papilla.clone(),
      blockage: blockageAt ? blockageAt.add(new THREE.Vector3(-1.0, -0.35, 0.5)) : null,
    };
    return ANNOTATIONS.flatMap((annotation) => {
      const position = positions[annotation.anchor];
      return position ? [{ ...annotation, position: position.clone() }] : [];
    });
  }

  getMetrics() {
    const solved = this.solved;
    const behind = Object.entries(solved.behind)
      .filter(([, value]) => value)
      .map(([id]) => id);
    const value = {
      bile: Math.round(solved.bileDeliveredFraction * 100),
      pancreatic: Math.round(solved.pancreaticDeliveredFraction * 100),
      cbd: solved.pressure['common-bile-duct'].toFixed(1),
      chd: solved.pressure['common-hepatic-duct'].toFixed(1),
      pancreaticPressure: solved.pressure['pancreatic-duct'].toFixed(1),
      gallbladderVolume: Math.round(solved.gallbladderVolumeMl),
      gallbladderTau: Math.round(solved.gallbladderTimeConstantMin),
      connected: solved.gallbladderConnected ? 'yes' : 'no',
      behind: behind.length ? String(behind.length) : 'none',
    };
    const valueJa = {
      connected: solved.gallbladderConnected ? 'できる' : 'できない',
      behind: behind.length ? String(behind.length) : 'なし',
    };
    return METRICS.map((metric) => ({
      ...metric,
      value: value[metric.id],
      ...(valueJa[metric.id] != null ? { valueJa: valueJa[metric.id] } : {}),
    }));
  }

  dispose() {
    this.bileStream?.dispose();
    this.pancreaticStream?.dispose();
    this.cysticStream?.dispose();
    this.tree?.dispose();
    this.markerGeometry?.dispose();
    this.markerMaterial?.dispose();
    disposeObject(this.root);
  }
}
