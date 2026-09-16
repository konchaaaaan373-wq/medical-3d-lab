import * as THREE from 'three';

import {
  ANNOTATIONS, DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, METRICS, MODEL_CONTROLS, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, VISUAL_MAPPING,
} from '../../../../data/pressureInjury.js';
import {
  DEFAULT_CONTROLS, DEPTHS, LAYERS, solvePressureInjury,
} from '../../../../models/pressureInjury.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { BLOCK, buildSkinBlock } from '../../organs/skinBlock.js';

/**
 * Tissue under a load, drawn as a profile rather than as a surface.
 *
 * ### The bars are the subject, and the block is where they are
 *
 * The claim is about **which depth takes the most of it**, and that is a
 * comparison between four places. A comparison cannot be drawn by colouring one
 * of them: a reader looking at a red patch sees damage, and this model has none.
 * So the answer is drawn beside the block as a bar per named depth, each as long
 * as that depth's share of the profile's own peak, and the colour only says
 * which bar is the longest.
 *
 * ### The prominence is drawn, and declared
 *
 * `buildSkinBlock()` is a specimen of skin with no skeleton in it, so the bone
 * under the load is a structure this scene adds. Its apex sits at the block's
 * own floor, which is the depth the model decays its second term from, so the
 * thing drawn and the thing computed are the same thing. The visual mapping
 * says the scene added it.
 *
 * ### Nothing here moves the skin
 *
 * A load pressing a surface in visibly would be the obvious animation and the
 * wrong one: it would make depth a matter of how far the surface has gone, and
 * a reader would read the dent as the injury. The block is still, the load
 * descends to meet it, and what changes is the profile.
 */
/** Whether a read-out value is a number, and so whether its unit belongs beside it. */
const reads = (value) => String(value).trim() !== '' && Number.isFinite(Number(value));

export class PressureInjuryScene {
  static meta = {
    id: 'pressure-injury',
    status: 'alpha',
    title: 'Tissue under a load: the worst of it is not always at the skin',
    titleJa: '荷重下の組織：最も強く圧迫される場所は皮膚とは限らない',
    subtitle: 'Tissue caught between a load and a bone is squeezed hardest at that interface, which is deep',
    subtitleJa: '荷重と骨に挟まれた組織が最も強く圧迫されるのは、その境界、すなわち深部です',
    stages: STAGES, related: RELATED, visualMapping: VISUAL_MAPPING, legend: LEGEND,
    range: RANGE, progressLabel: PROGRESS_LABEL, palette: PALETTE,
    modelScope: MODEL_SCOPE, modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER, disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT, disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  /**
   * Far enough back that the bars beside the block are still on screen at phone
   * width: the subject is some five units wide and only about four tall, and a
   * portrait frame shows far less of the first than of the second.
   */
  static cameraPose = {
    position: new THREE.Vector3(-2.45, 3.4, 10.9),
    target: new THREE.Vector3(1.0, -0.1, 0),
  };

  /**
   * Where the bars are drawn, in the block's own units.
   *
   * `z` puts them on the block's own front plane rather than through its middle:
   * a bar at the middle is behind the front face for most of its length from
   * every viewpoint that shows the section, and a read-out a reader cannot see
   * is not a read-out.
   */
  static BAR = Object.freeze({
    /** The side of the block they run out from. */
    x: BLOCK.width / 2 + 0.22,
    z: BLOCK.depth / 2,
    /**
     * How long a bar at the profile's peak is drawn.
     *
     * Bounded by the narrowest frame the scene has to work in: a portrait phone
     * shows about three units either side of the subject, and a read-out whose
     * longest bar runs off the edge is a read-out with no peak in it.
     */
    max: 1.4,
    height: 0.3,
    depth: 0.3,
  });

  /** How far above the surface the load sits when nothing is pressing. */
  static LOAD_LIFT = 0.62;

  /** How dim the structures that are not this scene's subject are drawn. */
  static ASIDE_OPACITY = 0.16;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = PressureInjuryScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solvePressureInjury(this.progress, this.controls);
    this.anchorVectors = {
      load: new THREE.Vector3(), bone: new THREE.Vector3(),
      squeezed: new THREE.Vector3(), skin: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());

    this.block = buildSkinBlock({
      colors: {
        epidermis: PALETTE.epidermis,
        dermis: PALETTE.dermis,
        'subcutaneous-tissue': PALETTE.subcutis,
      },
    });
    this.root.add(this.block.object);

    // The three layers are what the profile is about; everything that runs
    // through them belongs to the anatomy scene, not to this one. Walked over
    // the object rather than over the index, because the index holds one mesh
    // per named structure and some structures are drawn as several — a hair is
    // a follicle and a shaft, and the shaft is the most conspicuous thing in
    // the block if it is left alone.
    const subject = new Set(['epidermis', 'dermis', 'subcutaneous-tissue']);
    for (const mesh of this.block.object.children) {
      if (subject.has(mesh.name) || !mesh?.material) continue;
      mesh.material.transparent = true;
      mesh.material.opacity = PressureInjuryScene.ASIDE_OPACITY;
      mesh.material.depthWrite = false;
    }

    // What is pressing. A body above the surface rather than a force arrow: the
    // reader has to be able to see that the tissue is between two things.
    this.loadGeometry = new THREE.BoxGeometry(BLOCK.width * 0.78, 0.36, BLOCK.depth * 0.78);
    this.loadMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.load, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 0.9,
    });
    this.load = new THREE.Mesh(this.loadGeometry, this.loadMaterial);
    this.load.name = 'load';
    this.root.add(this.load);

    // What is underneath, when there is anything. A dome whose apex sits at the
    // block's own floor, which is the depth the model measures from.
    this.boneGeometry = new THREE.SphereGeometry(1, 40, 24);
    this.boneMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.bone, roughness: 0.45 });
    this.bone = new THREE.Mesh(this.boneGeometry, this.boneMaterial);
    this.bone.name = 'bony-prominence';
    this.bone.scale.set(1.15, 0.72, 1.0);
    this.bone.position.set(0, DEPTHS.bone - 0.72, 0);
    this.root.add(this.bone);

    // A bar per named depth, beside the block. The answer is a shape.
    const { BAR } = PressureInjuryScene;
    this.barGeometry = new THREE.BoxGeometry(1, BAR.height, BAR.depth);
    this.barMaterials = new Map();
    this.bars = new Map();
    for (const layer of LAYERS) {
      const material = new THREE.MeshStandardMaterial({ color: PALETTE.easy, roughness: 0.5 });
      const mesh = new THREE.Mesh(this.barGeometry, material);
      mesh.name = `depth-${layer.id}`;
      this.root.add(mesh);
      this.bars.set(layer.id, mesh);
      this.barMaterials.set(layer.id, material);
    }

    this.applyModelToScene();
    return this.root;
  }

  setProgress(value) { this.progress = clamp(value); this.solve(); }
  setModelControl(id, value) { this.controls[id] = value; this.solve(); }
  getModelControls() { return MODEL_CONTROLS.map((c) => ({ ...c, value: this.controls[c.id] })); }
  resetModelControls() { this.controls = { ...DEFAULT_CONTROLS }; this.solve(); }
  solve() { this.solved = solvePressureInjury(this.progress, this.controls); this.applyModelToScene(); }
  update() {}

  // --- the model on screen --------------------------------------------------

  /** Where a bar of a given share ends up, so the test and the draw agree. */
  barPlacement(share) {
    const { BAR } = PressureInjuryScene;
    const length = Math.max(0.001, share) * BAR.max;
    return { length, centre: BAR.x + length / 2 };
  }

  applyModelToScene() {
    const solved = this.solved;
    const { BAR } = PressureInjuryScene;

    // The load comes down to meet the surface. The surface does not move: a
    // dent would be read as the injury, and there is no injury in this model.
    if (this.load) {
      // Read off the solved ground rather than the raw control: the model is
      // what resolves an unknown value to "nothing is pressing", and a drawing
      // property whose final value is decided in two places is rule 3.
      this.load.visible = solved.ground !== 'none';
      const lift = PressureInjuryScene.LOAD_LIFT * (1 - solved.load);
      this.load.position.set(0, DEPTHS.surface + 0.18 + lift, 0);
      this.loadMaterial.opacity = solved.loaded ? 0.92 : 0.35;
    }

    if (this.bone) this.bone.visible = solved.overBone;

    for (const layer of solved.layers) {
      const mesh = this.bars.get(layer.id);
      const material = this.barMaterials.get(layer.id);
      if (!mesh || !material) continue;
      const share = solved.loaded ? layer.share : 0;
      const { length, centre } = this.barPlacement(share);
      mesh.scale.set(length, 1, 1);
      mesh.position.set(centre, layer.at, BAR.z);
      mesh.visible = solved.loaded;
      // Colour says only which bar is the longest. It is not a state of tissue.
      material.color.set(solved.worstLayers.includes(layer.id) ? PALETTE.squeezed : PALETTE.easy);
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    const { BAR } = PressureInjuryScene;

    anchorVectors.load.set(0, this.load.position.y + 0.42, BLOCK.depth * 0.3);

    // Just above the prominence's own apex, on the near side: the explanation
    // panel takes the lower third and the bone is the lowest thing drawn, so
    // the label has to sit over the dome rather than under it — and any higher
    // than this and it points at fat instead of at the bone.
    anchorVectors.bone.set(-BLOCK.width * 0.3, DEPTHS.bone + 0.06, BLOCK.depth * 0.48);

    const worst = solved.layers.find((l) => l.id === solved.worstAt) ?? solved.layers[0];
    const { centre } = this.barPlacement(solved.loaded ? worst.share : 0);
    anchorVectors.squeezed.set(centre, worst.at + 0.34, BAR.z + 0.2);

    // With nothing pressing there are no bars, so the label for the skin has to
    // point at the skin itself rather than at where its bar would have been.
    const skin = solved.layers[0];
    if (solved.loaded) {
      // At the bar's near end rather than its middle: over soft tissue the skin
      // *is* the worst-off depth, and two labels on one bar's centre land on
      // top of each other.
      anchorVectors.skin.set(BAR.x + 0.18, skin.at + 0.3, BAR.z + 0.2);
    } else {
      anchorVectors.skin.set(BLOCK.width * 0.22, DEPTHS.surface + 0.24, BLOCK.depth * 0.42);
    }
  }

  // --- what the interface reads --------------------------------------------

  /**
   * The three framings, each set so the labels land in the band the explanation
   * panel leaves: it takes the lower third, and this scene is tall — a load
   * above the block and a prominence below it — so a shot that fills the frame
   * puts half its own labels behind the panel or off the top.
   */
  static guideFramings = Object.freeze({
    block: Object.freeze({ target: new THREE.Vector3(1.0, 0.05, 0), distance: 9.2, direction: new THREE.Vector3(-1.4, 1.5, 5.4).normalize() }),
    profile: Object.freeze({ target: new THREE.Vector3(1.1, -0.38, 0), distance: 9.5, direction: new THREE.Vector3(-0.55, 0.5, 1).normalize() }),
    under: Object.freeze({ target: new THREE.Vector3(0, -1.15, 0), distance: 11.0, direction: new THREE.Vector3(-0.9, 0.45, 2.4).normalize() }),
  });

  getGuideFramings() { return PressureInjuryScene.guideFramings; }
  getVisualMapping() { return VISUAL_MAPPING; }

  getAnnotations() {
    const loaded = () => Boolean(this.solved.loaded);
    const drawn = { squeezed: loaded, bone: () => Boolean(this.solved.overBone) };
    return ANNOTATIONS.map((a) => ({ ...a, position: this.anchorVectors[a.anchor], isDrawn: drawn[a.id] }));
  }

  getMetrics() {
    const solved = this.solved;
    const named = {
      epidermis: 'the epidermis', dermis: 'the dermis',
      subcutis: 'the fat beneath', 'deep-interface': 'the deep interface',
    };
    const skin = solved.layers[0];
    const value = {
      worst: solved.loaded ? named[solved.worstAt] ?? solved.worstAt : 'nothing is pressing',
      ratio: solved.loaded ? solved.againstTheSurface.toFixed(2) : '—',
      skin: solved.loaded ? Math.round(skin.share * 100) : 0,
      ground: solved.overBone ? 'bone, close underneath' : solved.loaded ? 'more soft tissue' : 'nothing is pressing',
      // Printed rather than omitted: the absence is the claim.
      stage: 'not in this model',
    };
    // A unit belongs to a number. With nothing pressing this row is "—", and a
    // multiplication sign beside a dash reads as a measurement of the dash.
    return METRICS.map((m) => ({ ...m, value: value[m.id], unit: reads(value[m.id]) ? m.unit : '' }));
  }

  dispose() {
    this.loadGeometry?.dispose();
    this.loadMaterial?.dispose();
    this.boneGeometry?.dispose();
    this.boneMaterial?.dispose();
    this.barGeometry?.dispose();
    for (const material of this.barMaterials?.values() ?? []) material.dispose();
    this.block?.dispose?.();
    disposeObject(this.root);
  }
}
