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
} from '../../../../data/benignProstaticEnlargement.js';
import {
  DEFAULT_CONTROLS,
  solveProstaticEnlargement,
} from '../../../../models/prostaticEnlargement.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { TubeSurface } from '../../../shared/geometry/tube.js';
import { mucosaMaterial } from '../../../shared/materials.js';
import { buildProstateZones } from '../../organs/prostateAnatomy.js';

/**
 * Benign prostatic enlargement, told as a statement about which zone.
 *
 * ### The geometry is not this scene's
 *
 * `buildProstateZones` belongs to the prostate **atlas** and is used here as it
 * stands. That is what makes the scene possible: the atlas already decided
 * which mesh is the transition zone and which is the peripheral zone, and the
 * whole claim here is about the difference between them. A second prostate
 * drawn for a disease would have been a second chance to get the zones wrong.
 *
 * ### Three layers, and this scene is the clearest case of the difference
 *
 * - **The disease state** is that the transition zone has grown. That is all
 *   the reader sets.
 * - **The model output** is the arithmetic that follows: the inner gland's
 *   radius, the outer gland's radius with the peripheral zone's tissue
 *   conserved, the rim that is left, and the fraction of the channel.
 * - **The exaggeration** is what this file does on top so a channel a few
 *   hundredths of a unit across can be seen: it is drawn several times wider
 *   than the model's proportions would make it, and
 *   `src/data/benignProstaticEnlargement.js` says so in as many words.
 *
 * Nothing on this screen is a millilitre, a millimetre or a flow rate.
 */
export class BenignProstaticEnlargementScene {
  static meta = {
    id: 'benign-prostatic-enlargement',
    status: 'alpha',
    title: 'Benign prostatic enlargement: which zone is growing',
    titleJa: '前立腺肥大：大きくなっているのはどの領域か',
    subtitle: 'The transition zone grows; the gland grows far less, and the outside is pushed into a rim',
    subtitleJa: '大きくなるのは移行域です。腺全体の変化はずっと小さく、外側は縁へと押しやられます',
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
    position: new THREE.Vector3(1.6, 0.55, 4.2),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  /** Which meshes move with the inner gland, and which with the outside. */
  static INNER_MESHES = Object.freeze(['transition-zone', 'central-zone']);
  static OUTER_MESHES = Object.freeze(['peripheral-zone', 'anterior-fibromuscular-stroma']);

  /** The axis, mapped onto the one thing the reader is setting. */
  static MAX_GROWTH = 14;

  /**
   * How wide the channel is drawn when nothing is narrowing it.
   *
   * **Several times the model's own proportion**, and the clearest exaggeration
   * in this scene. At the atlas's scale the prostatic urethra is a hairline,
   * and a hairline is not something a reader can watch narrow. The *fraction*
   * is the model's; this number is presentation, and
   * `src/data/benignProstaticEnlargement.js` declares it as one.
   */
  static DRAWN_LUMEN_RADIUS = 0.085;

  /**
   * How visible each surface is, and **the only place that decides it**.
   *
   * The atlas draws every one of these to be pointed at, which is right for an
   * atlas and wrong here: the anterior stroma is a lid directly between this
   * camera and the subject, and at the atlas's opacity the first step of the
   * explanation says "the small one in the middle" over a picture in which the
   * middle cannot be seen at all.
   *
   * So the stroma becomes a film, the neighbours become context, and the
   * peripheral zone is translucent enough to see the inner gland grow inside
   * it — which is the claim. The peripheral zone is the one entry not fixed
   * here, because the model decides it; `applyModelToScene` reads this table
   * and then settles that one. **Nothing else in this file writes an opacity.**
   */
  static SURFACE_OPACITY = Object.freeze({
    'anterior-fibromuscular-stroma': 0.13,
    'transition-zone': 0.62,
    'central-zone': 0.82,
    verumontanum: 0.9,
    'right-ejaculatory-duct': 0.55,
    'left-ejaculatory-duct': 0.55,
    'bladder-neck': 0.4,
    rectum: 0.18,
    'right-seminal-vesicle': 0.3,
    'left-seminal-vesicle': 0.3,
    'right-vas-deferens': 0.3,
    'left-vas-deferens': 0.3,
  });

  /** How see-through the outside is, at rest and once it is a rim. */
  static PERIPHERAL_OPACITY = Object.freeze({ rest: 0.5, compressed: 0.22 });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = BenignProstaticEnlargementScene.meta.id;
    this.progress = 0;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveProstaticEnlargement(this.controls);
    // Replaced in `build()` by the gland's own extent; here so that the first
    // pass over the channel, which happens while the tube is being made, has a
    // window to read.
    this.glandExtentY = { top: 0.58, bottom: -0.58 };
    this.channelWindow = { neckU: 0.12, apexU: 0.88 };
    /** The points the labels hang from, as objects rather than as values. */
    this.anchorVectors = {
      transition: new THREE.Vector3(),
      peripheral: new THREE.Vector3(),
      central: new THREE.Vector3(),
      urethra: new THREE.Vector3(),
      bladderNeck: new THREE.Vector3(),
    };
  }

  build() {
    this.zones = buildProstateZones({
      colors: {
        'transition-zone': PALETTE.transition,
        'central-zone': PALETTE.central,
        'peripheral-zone': PALETTE.peripheral,
        'anterior-fibromuscular-stroma': PALETTE.stroma,
      },
      opacity: 0.9,
    });

    // The atlas's own urethra is a fixed tube. This scene's subject is what
    // happens to the channel, so it draws its own on the atlas's curve and
    // hides the fixed one — the same arrangement the achalasia scene uses, and
    // for the same reason: a disease may not redraw an atlas.
    const fixed = this.zones.mesh('prostatic-urethra');
    if (fixed) fixed.visible = false;
    this.curve = this.zones.urethraCurve;
    this.lumen = new TubeSurface(this.curve, { radius: (u) => this.lumenRadiusAt(u), steps: 120, radial: 16 });
    // Opaque, and the only opaque surface here: it is seen through the zone
    // that grew around it, and a translucent thread behind a translucent shell
    // is not something a reader can watch narrow.
    this.lumenMaterial = mucosaMaterial({ color: '#ffffff', opacity: 1 });
    // The channel's colour varies along it, so the material carries none of its
    // own: `paintLumen` writes it per vertex and this multiplies through.
    this.lumenMaterial.vertexColors = true;
    this.lumenMesh = new THREE.Mesh(this.lumen.geometry, this.lumenMaterial);
    this.lumenMesh.name = 'prostatic-urethra-lumen';

    this.restScale = new Map();
    for (const [id, mesh] of this.zones.index) this.restScale.set(id, mesh.scale.clone());

    // Where the gland itself begins and ends, read off the atlas's own mesh.
    // The channel is drawn longer than the organ — it comes out of the bladder
    // above and continues below the apex — and the narrowing belongs to the
    // stretch inside the gland, which is what the copy says. Typing two numbers
    // for that would have been two numbers to keep in step with a shape.
    const outer = this.zones.mesh('peripheral-zone');
    outer.geometry.computeBoundingBox();
    this.glandExtentY = { top: outer.geometry.boundingBox.max.y, bottom: outer.geometry.boundingBox.min.y };


    this.root.add(createStudioLights(), this.zones.object, this.lumenMesh);
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = at rest, 1 = the transition zone at its largest here */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.transitionGrowth = lerp(1, BenignProstaticEnlargementScene.MAX_GROWTH, this.progress);
    this.solve();
  }

  setModelControl(id, value) {
    this.controls[id] = value;
    // The axis owns the growth, so a reader who moves it by hand moves the
    // axis too rather than leaving the two saying different things.
    if (id === 'transitionGrowth') {
      this.progress = clamp((value - 1) / (BenignProstaticEnlargementScene.MAX_GROWTH - 1));
    }
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
    this.solved = solveProstaticEnlargement(this.controls);
    this.applyModelToScene();
  }

  update() {}

  /**
   * The channel's radius along its own curve.
   *
   * **Drawn several times wider than the model's proportions.** At the atlas's
   * scale the prostatic urethra is a few hundredths of a unit across, which is
   * a hairline the reader cannot see narrow. The *fraction* is the model's; the
   * width it is drawn at is this file's, and the visual mapping declaration
   * names it as an exaggeration.
   */
  lumenRadiusAt(u) {
    return BenignProstaticEnlargementScene.DRAWN_LUMEN_RADIUS * Math.sqrt(this.lumenFractionAt(u));
  }

  /**
   * Where the gland starts and stops along the channel, now.
   *
   * Both move as the gland grows, because the gland is scaled about its own
   * centre and the channel is not. Read from the mesh's extent rather than
   * from a pair of constants, so a change to the atlas's shape carries.
   */
  updateChannelWindow() {
    const ratio = this.solved.outerRadiusRatio;
    this.channelWindow = {
      neckU: this.channelUAtHeight(this.glandExtentY.top * ratio),
      apexU: this.channelUAtHeight(this.glandExtentY.bottom * ratio),
    };
  }

  /** The channel runs top to bottom, so its height is monotone and a scan finds it. */
  channelUAtHeight(y) {
    const samples = 160;
    for (let step = 0; step <= samples; step += 1) {
      const u = step / samples;
      if (this.curve.getPointAt(u).y <= y) return u;
    }
    return 1;
  }

  /**
   * How much of this place on the channel is inside the gland, 0–1.
   *
   * The narrowing applies to the stretch the gland surrounds, and to a little
   * above its base, because that is where a median lobe acts. Outside it the
   * channel keeps the calibre it was drawn with: nothing in this model narrows
   * a urethra the prostate is not around.
   */
  insideGlandAt(u) {
    const { neckU, apexU } = this.channelWindow;
    const feather = 0.06;
    const from = neckU - feather;
    return clamp((u - (from - feather)) / feather) * clamp((apexU + feather - u) / feather);
  }

  /**
   * What the model leaves of the channel at one place along it.
   *
   * A median lobe acts where the channel leaves the bladder and lateral lobes
   * along the stretch below it, so the model's two fractions are applied where
   * it says each one acts — and the width and the colour both come from here,
   * so the marked stretch is the narrowed stretch by construction rather than
   * by agreement.
   */
  lumenFractionAt(u) {
    const solved = this.solved ?? solveProstaticEnlargement(this.controls);
    const atNeck = Math.exp(-Math.pow((u - this.channelWindow.neckU) / 0.14, 2));
    const narrowed = lerp(solved.urethralLumenFraction, solved.bladderNeckLumenFraction, atNeck);
    return lerp(1, narrowed, this.insideGlandAt(u));
  }

  /**
   * Paint the channel along its own length.
   *
   * One colour for the whole tube was wrong in exactly the case the scene
   * exists to show: with the growth arranged as a median lobe the length is
   * untouched and only the exit is narrowed, and a uniformly marked tube said
   * the opposite of the step standing beside it.
   *
   * The wall vertices carry `u` in their first UV coordinate, so the mark can
   * follow the same function the width does. The two end caps have no `u` of
   * their own and take the ends'.
   */
  paintLumen() {
    const geometry = this.lumen.geometry;
    const uv = geometry.attributes.uv;
    let colours = geometry.attributes.color;
    if (!colours) {
      colours = new THREE.BufferAttribute(new Float32Array(uv.count * 3), 3);
      geometry.setAttribute('color', colours);
    }
    const open = new THREE.Color(PALETTE.urethra);
    const tight = new THREE.Color(PALETTE.emphasis);
    const capRing = this.lumen.capStart >= 0 ? (uv.count - this.lumen.capStart) / 2 : 0;
    const shade = new THREE.Color();
    for (let index = 0; index < uv.count; index += 1) {
      const u =
        index < this.lumen.capStart
          ? uv.getX(index)
          : index < this.lumen.capStart + capRing
            ? 0
            : 1;
      shade.copy(open).lerp(tight, clamp((1 - this.lumenFractionAt(u)) * 1.4));
      colours.setXYZ(index, shade.r, shade.g, shade.b);
    }
    colours.needsUpdate = true;
  }

  /**
   * One surface's opacity.
   *
   * Nothing translucent here writes depth. This scene is five nested shells
   * seen from the front, and a shell that writes depth culls everything it is
   * in front of: with it on, the stroma turned the gland into a cream ellipse
   * and the transition zone swallowed the channel running through it — the
   * step that says "the narrowed stretch has changed colour" over a picture
   * with no channel in it.
   */
  setOpacity(id, opacity) {
    const material = this.zones?.mesh(id)?.material;
    if (!material) return;
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.depthWrite = opacity >= 1;
  }

  applyModelToScene() {
    if (!this.zones) return;
    const solved = this.solved;
    this.updateChannelWindow();

    for (const id of BenignProstaticEnlargementScene.INNER_MESHES) {
      const mesh = this.zones.mesh(id);
      const rest = this.restScale.get(id);
      if (mesh && rest) mesh.scale.copy(rest).multiplyScalar(solved.innerRadiusRatio);
    }
    for (const id of BenignProstaticEnlargementScene.OUTER_MESHES) {
      const mesh = this.zones.mesh(id);
      const rest = this.restScale.get(id);
      if (mesh && rest) mesh.scale.copy(rest).multiplyScalar(solved.outerRadiusRatio);
    }

    // Every surface's final opacity, decided here and nowhere else. The fixed
    // ones are context; the peripheral zone is the one the model settles,
    // because a shell that thins is a shell you have to be able to see past.
    const { SURFACE_OPACITY, PERIPHERAL_OPACITY } = BenignProstaticEnlargementScene;
    for (const [id, opacity] of Object.entries(SURFACE_OPACITY)) this.setOpacity(id, opacity);
    this.setOpacity(
      'peripheral-zone',
      lerp(PERIPHERAL_OPACITY.rest, PERIPHERAL_OPACITY.compressed, clamp(1 - solved.peripheralRimRatio))
    );

    this.lumen.refresh((u) => this.lumenRadiusAt(u));
    this.paintLumen();
    this.updateAnchors();
  }

  // --- what the interface reads --------------------------------------------

  /**
   * Framings a guided explanation may ask for. Presentation only.
   *
   * `channel` comes in on the gland with the bladder neck at the top of frame,
   * because two steps are about what happens along the channel and at the neck,
   * and at the opening distance the channel is a thread. Both keep the scene's
   * own line of sight.
   */
  static guideFramings = Object.freeze({
    gland: Object.freeze({
      target: new THREE.Vector3(0, -0.12, 0),
      distance: 4.6,
      direction: new THREE.Vector3(1.6, 0.6, 4.2).normalize(),
    }),
    channel: Object.freeze({
      target: new THREE.Vector3(0, 0.1, 0),
      distance: 3.6,
      direction: new THREE.Vector3(1.6, 0.6, 4.2).normalize(),
    }),
  });

  getGuideFramings() {
    return BenignProstaticEnlargementScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  /**
   * Where every label hangs, written into the vectors the layer is holding.
   *
   * The label layer takes each annotation's `position` once and reads that same
   * vector every frame, so an anchor that moves has to be moved rather than
   * re-returned. Only one here does — the peripheral zone's, which rides out on
   * the gland as it grows — and handing it over as a copy left its label inside
   * the organ it names.
   */
  updateAnchors() {
    const anchors = this.zones?.anchorPoints;
    if (!anchors) return;
    const { anchorVectors } = this;
    anchorVectors.transition.set(-0.85, 0.45, 0.6);
    anchorVectors.peripheral.set(1.2 * this.solved.outerRadiusRatio, -0.35, -0.55);
    anchorVectors.central.set(-1.05, 0.85, -0.5);
    // Beside the middle of the channel rather than below the gland: at the
    // framing the channel steps use, a label hung under the organ lands behind
    // the console and the step points at something off screen.
    anchorVectors.urethra.set(-1.0, -0.05, 0.6);
    anchorVectors.bladderNeck.copy(anchors.bladderNeck).add(new THREE.Vector3(-1.05, 0.5, 0.4));
  }

  getAnnotations() {
    if (!this.zones) return [];
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const value = {
      transitionRatio: solved.transitionVolumeRatio.toFixed(2),
      glandRatio: solved.glandVolumeRatio.toFixed(2),
      rim: Math.round(solved.peripheralRimRatio * 100),
      lumen: Math.round(solved.urethralLumenFraction * 100),
      neck: Math.round(solved.bladderNeckLumenFraction * 100),
      shareTransition: Math.round(solved.zoneShares.transition * 100),
      sharePeripheral: Math.round(solved.zoneShares.peripheral * 100),
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.lumen?.dispose();
    this.lumenMaterial?.dispose();
    this.zones?.dispose();
    disposeObject(this.root);
  }
}
