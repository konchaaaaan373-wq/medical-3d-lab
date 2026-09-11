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
} from '../../../../data/bowelObstruction.js';
import { DEFAULT_CONTROLS, SITES, solveBowelObstruction } from '../../../../models/bowelObstruction.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp, smoothstep } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { buildColonParts } from '../../organs/colonParts.js';
import { buildDuodenum, buildSmallIntestine } from '../../organs/intestine.js';

/**
 * Bowel obstruction, told as a statement about where.
 *
 * ### The gut is not this scene's
 *
 * `buildSmallIntestine`, `buildDuodenum` and `buildColonParts` are the atlas's,
 * used as they stand — and `intestinalTransit` places the colon behind the
 * small-bowel coil with the same offset, so the two scenes are one abdomen.
 * The colon arriving already cut into its named parts is what makes this scene
 * possible at all: a blockage in the transverse colon and one in the sigmoid
 * are different pictures only if those are different meshes.
 *
 * ### Three layers
 *
 * - **The disease state** is a place on the path and how completely it is shut.
 *   That is all the reader sets.
 * - **The model output** is what is above it, what is below it, how far each
 *   distends, and which wall carries the most.
 * - **The drawing** multiplies the atlas's own calibre by the model's ratio and
 *   drains the colour out of what receives nothing. The calibre it multiplies
 *   is a drawn one, and `src/data/bowelObstruction.js` says so.
 *
 * Nothing on this screen is a centimetre, a millimetre of mercury or an hour.
 */
export class BowelObstructionScene {
  static meta = {
    id: 'bowel-obstruction',
    status: 'alpha',
    title: 'Bowel obstruction: what the place of it decides',
    titleJa: '腸閉塞：場所が何を決めるのか',
    subtitle: 'Above it fills and below it empties — and the wall that carries the most is at neither',
    subtitleJa: '上流は溜まり、下流は空になります。そして壁の負担が最大になるのは、そのどちらでもありません',
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
    position: new THREE.Vector3(0.3, 0.1, 10.8),
    target: new THREE.Vector3(0, -0.25, 0),
  };

  /** Where the colon sits relative to the coil, as `intestinalTransit` places it. */
  static COLON_OFFSET = Object.freeze([0, 0, -0.55]);

  /** Where along the small-bowel coil one model segment becomes the next. */
  static SMALL_BOWEL_SPLIT = 0.4;

  /** Which model segment each colon mesh is. The ids are already the same. */
  static COLON_SEGMENTS = Object.freeze([
    'caecum',
    'ascending-colon',
    'right-colic-flexure',
    'transverse-colon',
    'left-colic-flexure',
    'descending-colon',
    'sigmoid-colon',
  ]);

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = BowelObstructionScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveBowelObstruction(this.controls);
    /**
     * The points the labels hang from, as objects rather than as values.
     *
     * The label layer takes each annotation's `position` **once** and reads
     * that same vector every frame, so a scene whose anchors move has to move
     * these rather than return new ones: the blockage is somewhere different
     * for every site, and a label handed over as a copy stays where the first
     * site put it and names whatever is there now.
     */
    this.anchorVectors = {
      smallBowel: new THREE.Vector3(),
      colon: new THREE.Vector3(),
      caecum: new THREE.Vector3(),
      valve: new THREE.Vector3(),
      transition: new THREE.Vector3(),
      tension: new THREE.Vector3(),
    };
    this.litPartId = null;
  }

  build() {
    this.small = buildSmallIntestine({ color: '#ffffff' });
    this.duodenum = buildDuodenum({ color: PALETTE.duodenum });
    this.colon = buildColonParts({
      colors: Object.fromEntries(BowelObstructionScene.COLON_SEGMENTS.map((id) => [id, PALETTE.colon])),
      // Opaque, unlike the atlas's own default. Each named part is a solid with
      // its own flat ends, so two neighbours' ends coincide — and composited at
      // 0.96 that seam paints twice and reads as a bright scar across the
      // colon. At 1 the two caps are simply the same surface.
      opacity: 1,
      offset: BowelObstructionScene.COLON_OFFSET,
    });

    // The coil is one mesh carrying two model segments, so its colour varies
    // along it. The same technique the prostate scene uses on its channel.
    this.small.object.material.vertexColors = true;
    // Left at the atlas's own opacity, unlike the colon. Drawn opaque the coil
    // shows hard sawtooth seams: its sharpest turns have a radius of curvature
    // well under the calibre it is drawn at, so the tube surface folds through
    // itself there, and the loops interpenetrate besides. Neither is this
    // scene's to fix — it is the same coil the transit and anatomy scenes use —
    // and the atlas's translucency is what keeps both readable.

    // The blockage, drawn as a ring across the tube at the place the model put
    // it. Its size is a drawing decision and it has none of its own.
    this.markerGeometry = new THREE.TorusGeometry(0.34, 0.1, 10, 26);
    this.markerMaterial = tissueMaterial({ color: PALETTE.transition, roughness: 0.3, emissiveIntensity: 0.75 });
    // Drawn over everything. The blockage lands wherever the reader puts it,
    // and inside a coil of small bowel that is behind three loops — a marker a
    // step says to look at, and cannot be seen. It is a marker rather than a
    // structure, so drawing it in front costs nothing and is the only way the
    // sentence beside it is true.
    this.markerMaterial.depthTest = false;
    // And in the transparent pass, which is drawn after the opaque one: an
    // opaque marker is drawn *before* the bowel and painted over by every loop
    // in front of it, which is the same invisibility by a different route.
    this.markerMaterial.transparent = true;
    this.marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
    this.marker.renderOrder = 10;
    this.marker.name = 'transition-point';

    this.root.add(
      createStudioLights(),
      this.small.object,
      this.duodenum.object,
      this.colon.object,
      this.marker
    );
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = a path from end to end, 1 = nothing crosses it */
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
    this.solved = solveBowelObstruction(this.controls);
    this.applyModelToScene();
  }

  update() {}

  // --- where the model's places are on the geometry -------------------------

  /**
   * Where along the coil each of its two model segments is.
   *
   * The split is a position on one tube rather than a boundary between two
   * structures, because the atlas says in as many words that nothing in the
   * coil marks where the jejunum becomes the ileum. An obstruction is a point,
   * and a point on a tube is something the atlas can carry.
   */
  smallBowelRatioAt(u) {
    const split = BowelObstructionScene.SMALL_BOWEL_SPLIT;
    const proximal = this.solved.segment('proximal-small-bowel');
    const distal = this.solved.segment('distal-small-bowel');
    return lerp(proximal.radiusRatio, distal.radiusRatio, smoothstep(split - 0.04, split + 0.04, u));
  }

  /** The same split, for the colour. */
  smallBowelColourAt(u, into = new THREE.Color()) {
    const split = BowelObstructionScene.SMALL_BOWEL_SPLIT;
    const proximal = this.colourFor(this.solved.segment('proximal-small-bowel'), PALETTE.smallBowel);
    const distal = this.colourFor(this.solved.segment('distal-small-bowel'), PALETTE.smallBowel);
    return into.copy(proximal).lerp(distal, smoothstep(split - 0.04, split + 0.04, u));
  }

  /**
   * What a stretch is drawn as, from what the model says about it.
   *
   * Three states and they are three colours: at rest, distended, or receiving
   * nothing. The third is the one the picture is really about — a blockage is
   * legible because the two sides of it look different.
   */
  colourFor(segment, base) {
    const colour = new THREE.Color(base);
    if (!segment) return colour;
    if (segment.empty) return colour.lerp(new THREE.Color(PALETTE.empty), 0.78);
    return colour.lerp(new THREE.Color(PALETTE.distended), clamp((segment.radiusRatio - 1) * 2.2));
  }

  /**
   * The calibre a named stretch of colon is actually drawn at.
   *
   * Read back through the tube's own modifier rather than recomputed, so that
   * "the read-out and the drawing are the same solve" is a fact about the mesh
   * and not a restatement of the arithmetic that fed it.
   */
  colonRadiusAt(id, u = 0.5) {
    const surface = this.colon.part(id)?.surface;
    if (!surface) return 0;
    const base = surface.baseRadius(u);
    return surface.modifier ? surface.modifier(u, base) : base;
  }

  /** Where the blockage sits, in the scene's own coordinates. */
  transitionPoint() {
    const { transitionAt } = this.solved;
    if (!transitionAt) return null;
    if (transitionAt === 'proximal-small-bowel') {
      return this.small.curve.getPointAt(BowelObstructionScene.SMALL_BOWEL_SPLIT);
    }
    if (transitionAt === 'distal-small-bowel') return this.small.curve.getPointAt(0.985);
    const part = this.colon.part(transitionAt);
    return part ? this.colon.curve.getPointAt(Math.min(1, part.to)) : null;
  }

  /** The ileocaecal valve: where the coil ends and the caecum begins. */
  valvePoint() {
    return this.small.curve
      .getPointAt(1)
      .clone()
      .lerp(this.colon.curve.getPointAt(0.02), 0.5);
  }

  applyModelToScene() {
    if (!this.colon) return;
    const solved = this.solved;

    // Calibre. Every distended stretch is the atlas's own calibre multiplied by
    // the ratio the model solved for that stretch, and nothing else writes it.
    this.small.surface.refresh((u, base) => base * this.smallBowelRatioAt(u));
    const duodenum = solved.segment('duodenum');
    this.duodenum.surface.refresh((u, base) => base * duodenum.radiusRatio);
    for (const id of BowelObstructionScene.COLON_SEGMENTS) {
      const part = this.colon.part(id);
      const segment = solved.segment(id);
      if (part && segment) part.surface.refresh((u, base) => base * segment.radiusRatio);
    }

    // Colour.
    this.paintSmallBowel();
    this.duodenum.object.material.color.copy(this.colourFor(duodenum, PALETTE.duodenum));
    const lit = solved.tensionStandsOut ? solved.highestTension?.id : null;
    for (const id of BowelObstructionScene.COLON_SEGMENTS) {
      const part = this.colon.part(id);
      const segment = solved.segment(id);
      if (!part || !segment) continue;
      part.mesh.material.color.copy(this.colourFor(segment, PALETTE.colon));
      // Lit is "this wall carries the most in this picture", and the data file
      // says in as many words that it is not "this one is at risk".
      const highlighted = id === lit;
      part.mesh.material.emissive.set(highlighted ? PALETTE.tension : '#000000');
      part.mesh.material.emissiveIntensity = highlighted ? 0.55 : 0;
    }

    // The blockage.
    const at = this.transitionPoint();
    this.marker.visible = Boolean(at) && solved.blocked;
    this.updateAnchors();
    if (at) {
      this.marker.position.copy(at);
      const onColon = solved.transitionAt?.includes('colon') || solved.transitionAt === 'caecum';
      const curve = onColon ? this.colon.curve : this.small.curve;
      const u = onColon
        ? Math.min(0.999, this.colon.part(solved.transitionAt)?.to ?? 1)
        : solved.transitionAt === 'proximal-small-bowel'
          ? BowelObstructionScene.SMALL_BOWEL_SPLIT
          : 0.985;
      this.marker.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        curve.getTangentAt(u).normalize()
      );
    }
  }

  /** The coil's colour along its own length, from the same two segments. */
  paintSmallBowel() {
    const geometry = this.small.surface.geometry;
    const uv = geometry.attributes.uv;
    let colours = geometry.attributes.color;
    if (!colours) {
      colours = new THREE.BufferAttribute(new Float32Array(uv.count * 3), 3);
      geometry.setAttribute('color', colours);
    }
    const shade = new THREE.Color();
    const capStart = this.small.surface.capStart ?? uv.count;
    const capRing = (uv.count - capStart) / 2;
    for (let index = 0; index < uv.count; index += 1) {
      const u =
        index < capStart ? uv.getX(index) : index < capStart + capRing ? 0 : 1;
      this.smallBowelColourAt(u, shade);
      colours.setXYZ(index, shade.r, shade.g, shade.b);
    }
    colours.needsUpdate = true;
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    whole: Object.freeze({
      target: new THREE.Vector3(0, -0.25, 0),
      distance: 10.8,
      direction: new THREE.Vector3(0.3, 0.1, 10.8).normalize(),
    }),
    'small-bowel': Object.freeze({
      target: new THREE.Vector3(0, -0.2, 0),
      distance: 9.5,
      direction: new THREE.Vector3(0.2, 0.15, 9).normalize(),
    }),
    // The colon is the largest thing in the scene — it is the frame the coil
    // sits inside — so its own framing stands further back than the opening
    // one, not closer. Drawn from the default pose it lost both flexures.
    colon: Object.freeze({
      target: new THREE.Vector3(0, -0.4, -0.4),
      distance: 12.2,
      direction: new THREE.Vector3(-0.1, 0.1, 9).normalize(),
    }),
    // Pulled back far enough to keep the blockage in shot as well. The step
    // that uses it says the lit stretch is *not* the one next to the blockage,
    // and a frame with only the caecum in it cannot make that comparison.
    caecum: Object.freeze({
      target: new THREE.Vector3(-0.8, -1.0, -0.3),
      distance: 12.2,
      direction: new THREE.Vector3(-0.2, 0.2, 9).normalize(),
    }),
  });

  getGuideFramings() {
    return BowelObstructionScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  /** Where every label hangs, written into the vectors the layer is holding. */
  updateAnchors() {
    const lit = this.solved.tensionStandsOut ? this.solved.highestTension?.id : null;
    const litPart = lit ? this.colon.part(lit) : null;
    this.litPartId = litPart ? lit : null;

    const { anchorVectors } = this;
    anchorVectors.smallBowel.set(2.0, 0.55, 1.4);
    anchorVectors.colon.copy(this.colon.part('transverse-colon').centre).add(new THREE.Vector3(0, 0.95, 0.6));
    anchorVectors.caecum.copy(this.colon.part('caecum').centre).add(new THREE.Vector3(-1.25, 0.75, 0.7));
    anchorVectors.valve.copy(this.valvePoint()).add(new THREE.Vector3(-1.4, 0.45, 0.8));

    const at = this.labelAbove(this.transitionPoint(), new THREE.Vector3(1.35, 0.5, 0.8));
    if (at) anchorVectors.transition.copy(at);
    if (litPart) anchorVectors.tension.copy(litPart.centre).add(new THREE.Vector3(-1.25, -0.15, 0.8));
  }

  getAnnotations() {
    // Every annotation is handed over every time, because the layer decides
    // once which labels exist. The two that are not always true of the picture
    // say so through `isDrawn`, which the layer asks each frame.
    const drawn = {
      transition: () => this.solved.blocked,
      tension: () => this.litPartId !== null,
    };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
      isDrawn: drawn[annotation.id],
    }));
  }

  /**
   * A label beside a point, but never below the bottom of the frame.
   *
   * The blockage moves the length of the abdomen, and at the sigmoid a label
   * hung beside it lands behind the console — the step then points at something
   * the reader cannot see. The floor is in the scene's own units, measured
   * against the camera target the framings share.
   */
  labelAbove(point, offset, floor = -1.15) {
    if (!point) return null;
    const placed = point.clone().add(offset);
    if (placed.y < floor) placed.setY(floor);
    return placed;
  }

  getMetrics() {
    const solved = this.solved;
    const named = (id) =>
      MODEL_CONTROLS[0].options.find((option) => option.value === id)?.label ??
      id?.replace(/-/g, ' ') ??
      '—';
    const value = {
      distended: Math.round(solved.distendedLengthShare * 100),
      empty: Math.round(solved.emptyLengthShare * 100),
      widening: solved.radiusRatio.toFixed(2),
      tensionSpread: solved.tensionSpread.toFixed(2),
      worst: solved.tensionStandsOut
        ? named(solved.highestTension.id)
        : solved.blocked
          ? 'no one part stands out'
          : '—',
      loop: solved.closedLoop ? 'yes — the valve holds above it' : 'no',
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.markerGeometry?.dispose();
    this.markerMaterial?.dispose();
    this.small?.dispose();
    this.duodenum?.dispose();
    this.colon?.dispose();
    disposeObject(this.root);
  }
}

/** The sites the scene offers, for anything that needs to enumerate them. */
export const BOWEL_OBSTRUCTION_SITES = SITES.map((site) => site.id);
