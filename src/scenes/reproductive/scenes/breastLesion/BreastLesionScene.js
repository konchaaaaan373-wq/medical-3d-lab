import * as THREE from 'three';

import {
  ANNOTATIONS, DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, METRICS, MODEL_CONTROLS, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, VISUAL_MAPPING,
} from '../../../../data/breastLesion.js';
import {
  COURSES, DEFAULT_CONTROLS, NIPPLE, ROUTE, solveBreastLesion,
} from '../../../../models/breastLesion.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { MEDIAL, SITES, buildBreast } from '../../organs/breast.js';

/**
 * A place in a breast, drawn as a point on a course and a distance to a route.
 *
 * ### The marker never grows
 *
 * The obvious animation for this subject is a lesion that gets bigger as the
 * axis moves, and it is the wrong one twice over: the model has no size in it,
 * and a marker that grew while sliding towards the axilla would tell the whole
 * "it grows and then it spreads" story without a word of it being computed. So
 * the marker is one size at every position on every course, and the visual
 * mapping says that the fixed size is the claim.
 *
 * ### The route does not react
 *
 * The drainage route and the node group beyond it are drawn identically
 * whatever the marker is doing. Nothing lights up, thickens or fills, because
 * nothing in this model travels along it.
 *
 * ### The distance is beads, not a cord
 *
 * What does change is a row of beads from the marker to the nearest point on
 * the route — the thing the scene exists to let a reader watch shorten on one
 * course and lengthen on another. Beads rather than a line on purpose: a solid
 * cord joining a place to a drainage route reads as a conduit, which is the
 * very thing this model says is not there.
 */
/** Whether a read-out value is a number, and so whether its unit belongs beside it. */
const reads = (value) => String(value).trim() !== '' && Number.isFinite(Number(value));

export class BreastLesionScene {
  static meta = {
    id: 'breast-lesion',
    status: 'alpha',
    title: 'A place in a breast: further out is not nearer',
    titleJa: '乳腺内の場所：外側へ進むことは近づくことではありません',
    subtitle: 'Every duct system leaves the nipple outwards, and only some of them run towards the corner the gland drains from',
    subtitleJa: 'どの乳管系も乳頭から外へ向かいますが、乳腺が流れ出る角へ向かうのはその一部だけです',
    stages: STAGES, related: RELATED, visualMapping: VISUAL_MAPPING, legend: LEGEND,
    range: RANGE, progressLabel: PROGRESS_LABEL, palette: PALETTE,
    modelScope: MODEL_SCOPE, modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER, disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT, disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  /**
   * Far enough back that the node group the route reaches is still on screen at
   * phone width: it sits two units outside the gland, and a portrait frame
   * shows far less across than down.
   */
  static cameraPose = {
    position: new THREE.Vector3(-2.03, 2.49, 9.38),
    target: new THREE.Vector3(-MEDIAL * 0.37, 0.2, 0.1),
  };

  /**
   * How big the marker is drawn.
   *
   * **One size, at every position and on every course**, because this model has
   * no size in it. See the visual mapping.
   */
  static MARKER_SIZE = 0.15;

  /** How dim the structures that are not this scene's subject are drawn. */
  static ASIDE_OPACITY = 0.1;

  /**
   * How dim the seven duct systems the place is *not* on are drawn.
   *
   * Higher than `ASIDE_OPACITY`: they are not the backdrop but the rest of the
   * family the lit one belongs to, and the claim is about which of them a place
   * is on — which a reader cannot judge against ducts they cannot see.
   */
  static IDLE_DUCT_OPACITY = 0.32;

  /** How many beads the distance to the route is drawn as. */
  static BEADS = 10;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = BreastLesionScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveBreastLesion(this.progress, this.controls);
    this.anchorVectors = {
      marker: new THREE.Vector3(), duct: new THREE.Vector3(),
      route: new THREE.Vector3(), nipple: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());
    this.breast = buildBreast({
      colors: {
        'lactiferous-ducts': PALETTE.duct,
        lobules: PALETTE.lobule,
        'axillary-nodes': PALETTE.nodes,
        // The muscle behind and the tissue around are context, and the atlas
        // draws them in colours meant to carry their own weight. Here they are
        // what the arrangement sits in, so they are dimmed twice over: once by
        // opacity and once by being given a colour that recedes.
        'pectoralis-major': PALETTE.backdrop,
        'adipose-tissue': PALETTE.backdrop,
        skin: PALETTE.backdrop,
      },
    });
    this.root.add(this.breast.object);

    // The gland's outline is where the arrangement is, not the subject. Kept
    // see-through so a point inside it can be seen from outside it.
    for (const mesh of this.breast.object.children) {
      if (!mesh?.material) continue;
      const keep = mesh.name.startsWith('lactiferous-duct') || mesh.name.startsWith('lobule')
        || mesh.name.startsWith('axillary-node') || mesh.name === 'axillary-tail' || mesh.name === 'nipple';
      if (keep) continue;
      mesh.material.transparent = true;
      mesh.material.opacity = BreastLesionScene.ASIDE_OPACITY;
      mesh.material.depthWrite = false;
    }
    // Each duct gets a material of its own, because one of the eight is lit.
    this.ductMaterials = new Map();
    for (const mesh of this.breast.ductMeshes ?? []) {
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      this.ductMaterials.set(mesh.name, mesh.material);
    }

    // The route the gland drains by is the tail the atlas already draws, given
    // a colour of its own rather than a second cord laid inside it: the model's
    // own route is sampled off this very mesh, and drawing a line through the
    // middle of it would have been a route inside a route.
    this.route = this.breast.mesh('axillary-tail');
    this.route.material = this.route.material.clone();
    this.routeMaterial = this.route.material;
    this.routeMaterial.color.set(PALETTE.route);

    this.markerGeometry = new THREE.SphereGeometry(BreastLesionScene.MARKER_SIZE, 20, 14);
    this.markerMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.marker, depthTest: false });
    this.marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
    this.marker.renderOrder = 20;
    this.marker.name = 'place-in-question';
    this.root.add(this.marker);

    // The distance, as a row of beads between two points.
    //
    // Beads rather than a cord on purpose: a solid line joining a place to a
    // drainage route reads as a conduit — the very thing this model says is not
    // there. A dotted measure has no direction and carries nothing.
    this.reachGeometry = new THREE.SphereGeometry(0.055, 10, 8);
    this.reachMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.marker, depthTest: false });
    this.reach = new THREE.Group();
    this.reach.name = 'distance-to-the-route';
    this.beads = [];
    for (let i = 0; i < BreastLesionScene.BEADS; i += 1) {
      const bead = new THREE.Mesh(this.reachGeometry, this.reachMaterial);
      bead.renderOrder = 19;
      this.beads.push(bead);
      this.reach.add(bead);
    }
    this.root.add(this.reach);

    this.applyModelToScene();
    return this.root;
  }

  setProgress(value) { this.progress = clamp(value); this.solve(); }
  setModelControl(id, value) { this.controls[id] = value; this.solve(); }
  getModelControls() { return MODEL_CONTROLS.map((c) => ({ ...c, value: this.controls[c.id] })); }
  resetModelControls() { this.controls = { ...DEFAULT_CONTROLS }; this.solve(); }
  solve() { this.solved = solveBreastLesion(this.progress, this.controls); this.applyModelToScene(); }
  update() {}

  // --- the model on screen --------------------------------------------------

  /** The nearest place on the drainage route to a point, the way the model measures it. */
  nearestOnRoute(point) {
    let best = new THREE.Vector3(...ROUTE[0]);
    let least = Infinity;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let i = 0; i < ROUTE.length - 1; i += 1) {
      a.set(...ROUTE[i]);
      b.set(...ROUTE[i + 1]);
      const span = b.clone().sub(a);
      const length = span.lengthSq();
      const t = length > 0 ? clamp(point.clone().sub(a).dot(span) / length, 0, 1) : 0;
      const on = a.clone().addScaledVector(span, t);
      const distance = on.distanceTo(point);
      if (distance < least) { least = distance; best = on; }
    }
    return best;
  }

  applyModelToScene() {
    const solved = this.solved;
    const at = new THREE.Vector3(...solved.at);
    if (this.marker) this.marker.position.copy(at);

    // The duct in question is lit and the others dimmed. Lit means "this is the
    // one the place is on" — not diseased, involved or anything else.
    for (const [name, material] of this.ductMaterials ?? []) {
      const lit = solved.duct !== null && name === `lactiferous-duct-${solved.duct}`;
      material.color.set(lit ? PALETTE.duct : PALETTE.idle);
      material.opacity = lit ? 1 : BreastLesionScene.IDLE_DUCT_OPACITY;
      material.depthWrite = lit;
    }

    // The distance to the route. Beads between two points, never an arrow.
    if (this.reach) {
      const near = this.nearestOnRoute(at);
      for (const [i, bead] of this.beads.entries()) {
        // The ends are the marker and the route, so the beads sit between them.
        const t = (i + 1) / (BreastLesionScene.BEADS + 1);
        bead.position.copy(at).lerp(near, t);
      }
      this.reach.visible = !solved.onTheRoute;
      this.nearOnRoute = near;
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    const at = new THREE.Vector3(...solved.at);
    // Above the marker: the explanation panel takes the lower third, and a
    // label under its subject is a label a reader cannot read.
    anchorVectors.marker.copy(at).add(new THREE.Vector3(0, 0.3, 0.3));
    anchorVectors.nipple.set(NIPPLE[0], NIPPLE[1] + 0.34, NIPPLE[2] + 0.2);

    // A quarter of the way along rather than at the middle: at the middle of
    // the axis this label and the marker's land on the same pixel.
    const course = COURSES.find((entry) => entry.id === solved.site) ?? COURSES[0];
    const quarter = new THREE.Vector3(...course.points[2]);
    anchorVectors.duct.copy(quarter).add(new THREE.Vector3(0, 0.62, 0.45));
    anchorVectors.route.set(SITES.axillaryTail[0], SITES.axillaryTail[1] + 0.42, SITES.axillaryTail[2] + 0.35);
  }

  // --- what the interface reads --------------------------------------------

  /**
   * The three framings, set so the labels land in the band the explanation
   * panel leaves it: it takes the lower third, and the subject runs from the
   * nipple to a node group two units outside the gland.
   */
  static guideFramings = Object.freeze({
    gland: Object.freeze({ target: new THREE.Vector3(-MEDIAL * 0.35, 0.15, 0.1), distance: 8.2, direction: new THREE.Vector3(-0.45, 0.6, 2.4).normalize() }),
    course: Object.freeze({ target: new THREE.Vector3(-MEDIAL * 0.2, 0.05, 0.25), distance: 6.6, direction: new THREE.Vector3(-0.2, 0.5, 2.2).normalize() }),
    axilla: Object.freeze({ target: new THREE.Vector3(-MEDIAL * 1.05, 0.55, 0.05), distance: 7.4, direction: new THREE.Vector3(-0.7, 0.6, 2.4).normalize() }),
  });

  getGuideFramings() { return BreastLesionScene.guideFramings; }
  getVisualMapping() { return VISUAL_MAPPING; }

  getAnnotations() {
    const onADuct = () => this.solved.duct !== null;
    return ANNOTATIONS.map((a) => ({ ...a, position: this.anchorVectors[a.anchor], isDrawn: a.id === 'duct' ? onADuct : undefined }));
  }

  getMetrics() {
    const solved = this.solved;
    const part = {
      'large-duct': 'the large duct near the nipple',
      'terminal-duct': 'the narrower far part of it',
      'lobular-end': 'the end, where the lobules are',
      'axillary-tail-gland': 'the axillary tail itself',
    };
    const value = {
      part: part[solved.inTissue] ?? solved.inTissue,
      route: solved.onTheRoute ? 'on it' : solved.routeShare.toFixed(2),
      nearer: solved.nearer === null ? '—' : solved.nearer ? 'yes' : 'no — further',
      site: solved.site,
      // Printed rather than omitted: the absence is the claim.
      spread: 'nothing spreads in this model',
    };
    // A unit belongs to a number. On the tail this row reads "on it" rather
    // than a share, and a multiplication sign after those words is nonsense.
    return METRICS.map((m) => ({ ...m, value: value[m.id], unit: reads(value[m.id]) ? m.unit : '' }));
  }

  dispose() {
    this.markerGeometry?.dispose();
    this.markerMaterial?.dispose();
    this.routeMaterial?.dispose();
    this.reachGeometry?.dispose();
    this.reachMaterial?.dispose();
    for (const material of this.ductMaterials?.values() ?? []) material.dispose();
    this.breast?.dispose?.();
    disposeObject(this.root);
  }
}
