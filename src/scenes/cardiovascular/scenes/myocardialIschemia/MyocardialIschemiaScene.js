import * as THREE from 'three';

import {
  RELATED,
  BULLSEYE,
  CHARTS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEARNING_LABEL,
  LEGEND,
  METRICS,
  MODEL_CONTROLS_COPY,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  SCOPE,
  STAGES,
  STORY_LABEL,
  TERRITORY_COLORS,
  VESSEL_COLORS,
  WALL_COLORS,
} from '../../../../data/myocardialIschemia.js';
import { TERRITORIES, TERRITORY_LABELS } from '../../../../models/coronaryTerritories.js';
import {
  episodeAt,
  restingMyocardium,
  solveIschemicCirculation,
  supplyDemandRatios,
  wallMotionAmplitude,
} from '../../../../models/myocardialIschemia.js';
import { myocardialVolumeFor, ventricleShape, cavityVolumeAt, advanceCardiacPhase } from '../../../../models/cardiacMechanics.js';
import { circulationParameters } from '../heartFailure/hemodynamics.js';
import { ANATOMY } from '../heartFailure/anatomy.js';
import {
  buildVentricleGeometry,
  updateVentricleGeometry,
  epicardialSurfacePoint,
  weldLatheSeam,
  VENTRICLE_SHAPING,
} from '../heartFailure/geometry/ventricleGeometry.js';
import { buildCoronaryArteries } from '../../organs/coronaryArteries.js';
import { ROOT_PROPORTIONS, buildAorticRoot } from '../../organs/aorticRoot.js';
import { AHA_RINGS, TERRITORY_MASS_FRACTION, territoryWeightsAt } from '../../organs/coronaryAnatomy.js';

/**
 * The bullseye's static half: the seventeen segments, in rings, with the
 * colours the 3D paints them.
 *
 * Assembled here rather than in `src/data/` because it joins two things neither
 * of those owns — the anatomy's segment table and the scene's palette — and
 * assembled from `AHA_RINGS` rather than listed, so a plot cannot put a segment
 * in a territory the anatomy does not.
 */
function bullseyeSpec() {
  return {
    ...BULLSEYE,
    colors: { ...TERRITORY_COLORS },
    ischemic: WALL_COLORS.ischemic,
    rings: AHA_RINGS.map((ring) => ({
      level: ring.level,
      below: ring.below,
      segments: ring.segments.map((segment) => ({
        id: segment.id,
        number: segment.number,
        phi: segment.phi,
        span: segment.span,
        territory: segment.territory,
        label: segment.label,
        labelJa: segment.labelJa,
      })),
    })),
  };
}

/**
 * How strongly the territory's own hue is mixed into the wall at rest.
 *
 * Presentation, and fitted to a stated criterion rather than to taste: **at
 * rest, each pair of territories must separate in chromaticity by more than the
 * chromaticity varies inside a single territory**, so a reader can see three
 * regions without being told they are there. The legend names three territory
 * colours; if they are not findable on the model, the legend is lying.
 *
 * The confound is not what it first looks like. Painting *one flat colour* on
 * every vertex and measuring the visible surface, chromaticity still scatters
 * by **0.0447** — the lighting in this scene is not grey, so which way a patch
 * faces shifts its hue by about as much as a weak tint does. That number is the
 * floor a painted map has to clear, and it is measured rather than assumed.
 *
 * Against it, at 0.16 with the weights unsharpened, the six territory pairs
 * separated by 0.034-0.053: **0.76-1.19x the floor.** The legend named three
 * colours that were not on the model.
 *
 * Fitted upward only as far as the criterion needs, because every step spends
 * tissue realism: at 0.22 the weakest pair is still under the floor (0.96x), at
 * 0.34 the heart reads as a terracotta pot in the render. 0.26 gives
 * 1.12-2.29x, and the one pair near the bottom of that range is the anterior
 * descending against the circumflex *seen from behind*, which is a nine-vertex
 * apical sliver rather than a boundary a reader is asked to find.
 */
const MAP_TINT = 0.26;

/**
 * How hard the map's boundaries are, as an exponent on the territory weights.
 *
 * The model's weights are deliberately smooth: a coronary watershed is not a
 * line, and `territoryWeightsAt` refuses to claim one. But a *map* drawn from
 * smooth weights has no edge anywhere, and most of the scatter inside a
 * "territory" above was blend from its neighbours rather than lighting. So the
 * drawing sharpens a copy — `w^MAP_EDGE`, renormalized — while `burden` and
 * `held`, which are physics, keep reading the weights exactly as the model
 * produced them.
 *
 * This is a presentation choice about how a boundary is drawn, not a claim that
 * the boundary is sharp. The scope panel and the model card both say the
 * territory map is a convention.
 */
const MAP_EDGE = 3;

/**
 * The territory boundary, drawn as a line rather than left to the fill.
 *
 * A fill cannot carry a map on this surface. The lighting is not grey, so a
 * patch's hue moves with which way it faces — 0.0447 of chromaticity scatter
 * for a single flat colour — and from the opening camera nearly the whole
 * visible wall is one territory anyway, so a reader who does not rotate sees a
 * region and not a map of three. A *line* is local contrast, and local contrast
 * survives both.
 *
 * Drawn in the fragment shader, not in the vertex colours, because the mesh is
 * 48 columns around: one vertex of boundary is about half a scene unit, which
 * lands as a 25 px band rather than a line, and making the mesh dense enough to
 * draw a line with vertices would quadruple a per-frame cost that is already
 * 4 ms. Scaling the threshold by `fwidth` instead gives a boundary the same
 * couple of pixels wide wherever it is and however far away.
 *
 * It does not fade with burden the way the territory hue does. Watching one
 * territory go ischemic, the question a reader is checking is whether the
 * discoloured patch *is* the territory — which needs the boundary still drawn.
 */
const BOUNDARY_WIDTH_PX = 2.4;
const BOUNDARY_DARKEN = 0.45;

/**
 * Myocardial ischemia: which muscle a narrowed artery starves.
 *
 * The scene exists for one relation that a picture makes obvious and a
 * description does not: **the discoloured wall is nowhere near the narrowing.**
 * A lesion in the anterior descending is a lesion in a groove on the front of
 * the heart, and what stops moving is the anterior wall and the septum — the
 * muscle that artery feeds. Drawn in 2D that is a diagram with an arrow.
 * Drawn in 3D and rotated, it is a fact about where things are.
 *
 * ## Everything on screen is one solve
 *
 * The colour of the wall, how far the wall moves, the pressure-volume loop, the
 * ejection fraction and every number in the panel come from a single call to
 * `solveIschemicCirculation`. That is the repository's rule and it is load
 * bearing here: a scene that computed the wall colour from supply and the
 * ejection fraction from a solve would show a wall going red before the numbers
 * moved, and the mismatch would look like physiology.
 *
 * ## How much of each territory's myocardium
 *
 * From `TERRITORY_MASS_FRACTION`, which the organ layer derives from the
 * segment table — so editing which segments a territory holds moves the
 * weighting the global solve uses, and the two cannot come apart.
 *
 * Measuring it off this mesh was tried and is wrong twice over: the lathe's
 * vertices are uniform in its own parameters rather than in area, and the mesh
 * carries a right ventricle as a context lobe while the AHA model describes the
 * left one. Both attempts gave the right coronary the largest share of the left
 * ventricle. `coronaryAnatomy.js` records it where the constant is.
 */

/**
 * How much flow the narrowed artery still carries, by default.
 *
 * The severe end of the three lesions the specification's severity-ordering
 * criterion is written about. The control runs from here up to an open artery,
 * so a reader can watch the same episode with a lesion that barely matters.
 */
const DEFAULT_LESION_SUPPLY = 0.35;

export class MyocardialIschemiaScene {
  /**
   * Everything the shell needs before the scene is built.
   *
   * These are **statics**, read off the class rather than an instance, and that
   * is worth stating because it is how the first version of this scene shipped
   * broken: the class had none, the App read `SceneClass.cameraPose` while
   * framing the camera, and the whole surface fell back to "3D renderer
   * unavailable". A scene test that only called instance methods saw nothing
   * wrong — which is the same shape of miss the pulmonary oedema scene taught,
   * one level up.
   */
  static meta = {
    bullseye: bullseyeSpec(),
    id: 'myocardial-ischemia',
    status: 'alpha',
    title: 'Which muscle a narrowed artery starves',
    titleJa: '細くなった血管は、どの筋肉を飢えさせるか',
    subtitle:
      'The narrowing is in a groove on the front · what stops moving is everything downstream of it',
    subtitleJa:
      '狭窄は前面の溝にある ｜ 動かなくなるのは、その下流のすべて',
    stages: STAGES,
    legend: LEGEND,
    charts: CHARTS,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    modelScope: MODEL_SCOPE,
    related: RELATED,
    modelControls: MODEL_CONTROLS_COPY,
    story: STORY_LABEL,
    learning: LEARNING_LABEL,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  /**
   * Slightly from the front and the patient's left, because the subject is
   * *where* a thing is: the anterior descending has to be visible in its groove
   * at the same time as the wall it feeds, or the scene's one relation is a
   * caption rather than a picture.
   */
  /**
   * Where the scene opens from.
   *
   * Anterior and a little toward the patient's right, because that is the side
   * the anterior descending's territory faces — placed toward the patient's
   * left it was looking at circumflex territory while the story talked about
   * the anterior wall.
   *
   * The target rides above the subject's centre because the console covers the
   * bottom of the frame, and `framing.js` only accounts for that bottom inset —
   * the header along the top is the scene's own to clear. Raised from −2.2 when
   * the aortic root was drawn: the subject grew 1.2 units taller at the base
   * and the top of the root was passing behind the header.
   */
  static cameraPose = {
    position: new THREE.Vector3(-2.4, 1.6, 20.4),
    target: new THREE.Vector3(0, -1.35, 0),
  };

  /**
   * Framings a guided explanation may ask for by name.
   *
   * The opening shot holds the whole heart and its three arteries, which is
   * what the first two steps are about — an artery, and the region beyond it.
   * The steps after that are about the muscle: which region changed, where its
   * border with the next region runs, and how it moves. From the opening
   * distance that is a small patch of a small heart, so `wall` comes in on the
   * anterior wall, along the same line of sight so nothing has to be re-learned.
   *
   * **Camera only.** No supply, no burden, no progress. The target is the
   * anterior wall's own label anchor rather than a coordinate typed twice: the
   * scene already decided where that wall is.
   */
  static guideFramings = Object.freeze({
    wall: Object.freeze({
      // Close enough that the wall is the subject, far enough that the *next*
      // territory is still in frame: three of these steps are about a border —
      // this artery's muscle changed and the one beside it did not — and a
      // framing that fills the screen with one wall has cropped the comparison
      // the sentence is making. Measured from the pictures at 1280x720.
      target: new THREE.Vector3(0, -1.9, 0.6),
      distance: 16.5,
      direction: new THREE.Vector3(-2.4, 1.6, 20.4)
        .sub(new THREE.Vector3(0, -1.35, 0))
        .normalize(),
    }),
  });

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = 'myocardial-ischemia';
    this.progress = 0;
    this.phase = 0;
    this.loading = { preload: 1, afterload: 1 };
    /** How much flow the anterior descending still carries where it is narrowed. */
    this.lesionSupply = DEFAULT_LESION_SUPPLY;
    this.disposables = [];
    this.state = null;
  }

  build() {
    const baseline = restingMyocardium();
    this.baseParameters = circulationParameters(0);

    // The heart at end diastole, which is the shape everything is measured
    // against: wall motion is how far it moves *from* here.
    this.restShape = this.shapeFor(baseline);

    // Closed, not cut away. `ANATOMY.cutAngle` opens a 99° wedge so the
    // heart-failure scene can show the chamber filling and emptying — there the
    // cavity *is* the subject. Here the subject is the outside: which patch of
    // epicardium a coronary artery feeds, and where the arteries run over it. A
    // heart with a third of its wall removed reads as broken, and the wedge
    // took away most of the anterior wall, which is the one this scene is
    // about.
    //
    // Zero rather than nearly-zero. At 0.001 the lathe still generates the two
    // cap faces that close the wedge, and a sliver of end-on geometry down the
    // middle of the anterior wall catches the key light as a bright stripe —
    // the double-composited-shell failure the playbook records, arriving as a
    // seam rather than as an error.
    this.kit = buildVentricleGeometry({ cutAngle: 0, contextLobe: true });
    updateVentricleGeometry(this.kit, this.restShape, {});
    this.geometry = this.kit.geometry;
    this.keepOnlyEpicardium();
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(this.geometry.attributes.position.count * 3), 3)
    );
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.68,
      metalness: 0.02,
      vertexColors: true,
    });

    this.myocardium = new THREE.Mesh(this.geometry, this.material);
    this.myocardium.name = 'myocardium';
    this.root.add(this.myocardium);
    this.disposables.push(this.geometry, this.material);

    // Which territory each vertex belongs to, and how far it is up the
    // ventricle. Computed once: the territory map is anatomy and does not move,
    // and asking seventeen segments per vertex per frame would be the whole
    // frame budget.
    this.vertexTerritory = this.mapVerticesToTerritories();
    this.massFraction = TERRITORY_MASS_FRACTION;
    // The same weights the map is painted from, handed to the shader so the
    // boundary between territories can be drawn as a line the mesh is far too
    // coarse to carry in its vertices.
    this.geometry.setAttribute(
      'territory',
      new THREE.BufferAttribute(this.vertexTerritory, TERRITORIES.length)
    );
    this.drawTerritoryBoundaries(this.material);

    this.restPositions = Float32Array.from(this.geometry.attributes.position.array);

    // The aortic root, and the arteries from the *same* descriptor.
    //
    // Its centre was a typed triple, `(-1.13, 1.56, 0.32)`, which put the
    // sinotubular junction at y 1.56 — below the ventricle's own shoulder at
    // 2.08, so had anything drawn the root it would have been buried in
    // myocardium. Nothing did draw it, which is why that went unnoticed and why
    // both coronary trunks began in mid-air in every render.
    //
    // Derived now: the annulus sits on the valve plane and the junction a root
    // above it, so the root rises out of the base wherever the base is.
    const rootRadius = 0.95;
    const aorticRoot = {
      centre: new THREE.Vector3(
        -1.13,
        ANATOMY.baseY + ROOT_PROPORTIONS.height * rootRadius,
        0.32
      ),
      radius: rootRadius,
    };
    this.aorticRoot = buildAorticRoot({ ...aorticRoot, color: VESSEL_COLORS.root });
    this.root.add(this.aorticRoot.object);
    this.disposables.push(this.aorticRoot);

    this.coronaries = buildCoronaryArteries({
      surfacePoint: epicardialSurfacePoint,
      shape: this.restShape,
      root: aorticRoot,
      color: VESSEL_COLORS.open,
    });
    this.root.add(this.coronaries.object);

    this.solve();
    this.applyModelToScene();
    return this.root;
  }

  /**
   * Put a line on the watershed between two territories.
   *
   * `territoryWeightsAt` is smooth on purpose, so "the boundary" is where the
   * top two weights meet. `fwidth` turns that into a fixed number of pixels
   * rather than a fixed number of scene units, which is what makes it a
   * boundary rather than a band that grows as the reader zooms in.
   *
   * Injected into the standard material rather than replacing it: the wall
   * still has to be lit like tissue, and every other scene property — the
   * vertex colours, the roughness, the shadowing — stays exactly as it was.
   *
   * @param {THREE.Material} material
   */
  drawTerritoryBoundaries(material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.boundaryWidth = { value: BOUNDARY_WIDTH_PX };
      shader.uniforms.boundaryDarken = { value: BOUNDARY_DARKEN };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 territory;\nvarying vec3 vTerritory;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerritory = territory;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vTerritory;\nuniform float boundaryWidth;\nuniform float boundaryDarken;'
        )
        .replace(
          '#include <color_fragment>',
          [
            '#include <color_fragment>',
            'float topWeight = max(vTerritory.x, max(vTerritory.y, vTerritory.z));',
            'float lowWeight = min(vTerritory.x, min(vTerritory.y, vTerritory.z));',
            '// The runner-up, exactly: the sum less the largest and smallest.',
            '// Written first as "the sum of the other two", which is the same',
            '// on a two-territory boundary and wrong wherever all three are',
            '// live — it would have drawn a line round the triple point.',
            'float runnerUp = vTerritory.x + vTerritory.y + vTerritory.z - topWeight - lowWeight;',
            '// Zero where two territories are level, growing away from the',
            '// watershed in both directions.',
            'float gap = topWeight - runnerUp;',
            'float band = fwidth(gap) * boundaryWidth;',
            'float onLine = 1.0 - smoothstep(0.0, max(band, 1e-5), gap);',
            'diffuseColor.rgb *= mix(1.0, boundaryDarken, onLine);',
          ].join('\n')
        );
      // Kept so a test can see the injection happened at all: a chunk name that
      // stops matching in a future three.js leaves the material compiling
      // perfectly and drawing no line.
      this.boundaryShader = shader;
    };
    material.needsUpdate = true;
  }

  /**
   * Draw the outside of the heart and nothing else.
   *
   * The lathe builds four material groups — epicardium, annulus, endocardium
   * and the two faces that cap the cutaway wedge — because the heart-failure
   * scene looks *into* the chamber. This scene looks at the outside, and the
   * other three groups are then either invisible or actively wrong: with the
   * wedge closed, the cap faces sit exactly on the anterior wall and catch the
   * key light as a bright stripe straight down the middle of it. Closing the
   * wedge to nothing did not help, because the caps are built either way.
   *
   * So the index is trimmed to the epicardial group once, at build. Positions
   * are rewritten every frame and indices are not, so this holds.
   */
  keepOnlyEpicardium() {
    const epicardium = this.geometry.groups.find((group) => group.materialIndex === 0);
    if (!epicardium) throw new Error('the ventricle has no epicardial group to draw');
    const index = this.geometry.index.array;
    this.geometry.setIndex(
      Array.from(index.slice(epicardium.start, epicardium.start + epicardium.count))
    );
    this.geometry.clearGroups();
  }

  /** The chamber geometry a myocardial state implies, at end diastole. */
  shapeFor(state) {
    const { solution } = solveIschemicCirculation(state, {
      parameters: this.baseParameters,
      massFraction: TERRITORY_MASS_FRACTION,
    });
    const shape = ventricleShape({
      cavityVolumeMl: solution.cycle.edv,
      myocardialVolumeMl: myocardialVolumeFor({
        edvMl: solution.cycle.edv,
        wallMm: this.baseParameters.wallMm,
        longToShortAxisRatio: this.baseParameters.longToShortAxisRatio,
      }),
      longToShortAxisRatio: this.baseParameters.longToShortAxisRatio,
    });
    shape.baseY = ANATOMY.baseY;
    return shape;
  }

  /**
   * Which territory supplies each vertex.
   *
   * The lathe's own grid gives `(t, phi)` exactly, so this asks the territory
   * map at the vertex's real place on the ventricle rather than inverting a
   * position back into one.
   */
  mapVerticesToTerritories() {
    const { N, S, profileCount, basePhi } = this.kit;
    const count = this.geometry.attributes.position.count;
    const weights = new Float32Array(count * TERRITORIES.length);
    for (let column = 0; column <= S; column++) {
      const phi = basePhi[column];
      for (let row = 0; row < profileCount; row++) {
        // Rows past N are the endocardial run, walked back from the rim, so a
        // vertex's height is the same either way round.
        const t = row < N ? row / (N - 1) : (profileCount - 1 - row) / (N - 1);
        const w = territoryWeightsAt(Math.min(t, VENTRICLE_SHAPING.shoulderStartT), phi);
        const index = (column * profileCount + row) * TERRITORIES.length;
        TERRITORIES.forEach((territory, i) => {
          weights[index + i] = w[territory];
        });
      }
    }
    return weights;
  }

  /**
   * The one solve everything reads.
   *
   * The episode is replayed from rest each time rather than stepped, because a
   * story slider can move backwards and an integral that only ever moved
   * forwards would make the scene's past depend on the route taken to it.
   */
  solve() {
    let myocardium = restingMyocardium();
    let last = 0;
    for (const stage of STAGES) {
      const until = Math.min(this.progress, stage.at === 0 ? 0 : stage.at);
      if (until > last) {
        myocardium = episodeAt({
          supplyFactor: { lad: this.supplyAt(last) },
          progress: until - last,
          from: myocardium,
        });
        last = until;
      }
      if (this.progress <= stage.at) break;
    }
    if (this.progress > last) {
      myocardium = episodeAt({
        supplyFactor: { lad: this.supplyAt(last) },
        progress: this.progress - last,
        from: myocardium,
      });
    }
    // At a progress exactly on a stage's start — 0.22, 0.45 and 0.80 are all
    // slider stops — no time has yet elapsed under that stage, so the ratio
    // still carried the *previous* stage's supply while the caption named the
    // new one. The read-out is "supply / demand", and at the moment supply
    // falls it has to say so; the burden it drives is an integral and rightly
    // still zero.
    this.myocardialState = {
      ...myocardium,
      supplyDemandRatio: supplyDemandRatios({ supplyFactor: { lad: this.supplyAt(this.progress) } }),
    };

    const parameters = {
      ...this.baseParameters,
      circulatingVolume: this.baseParameters.circulatingVolume * this.loading.preload,
      systemicResistance: this.baseParameters.systemicResistance * this.loading.afterload,
    };
    const solved = solveIschemicCirculation(myocardium, {
      parameters,
      massFraction: this.massFraction,
    });
    this.solution = solved.solution;

    const cycle = solved.solution.cycle;
    this.state = {
      ladSupplyDemand: myocardium.supplyDemandRatio.lad,
      ladBurden: myocardium.ischemicBurden.lad,
      ladWallMotion: wallMotionAmplitude(myocardium, 'lad'),
      ejectionFraction: cycle.ejectionFraction,
      strokeVolumeMl: cycle.strokeVolume,
      cardiacOutputLMin: cycle.cardiacOutput,
      edvMl: cycle.edv,
      esvMl: cycle.esv,
      heartRate: cycle.heartRate,
      contractility: solved.contractility,
      ejectionStartPhase: cycle.ejectionStartPhase,
      ejectionEndPhase: cycle.ejectionEndPhase,
    };
  }

  /**
   * The supply factor in force at a point on the story.
   *
   * The stages say **when** the artery is narrowed; the control says **how
   * badly**. Written first as the control multiplying whatever the stage set,
   * which reads sensibly and is useless: the control's default is 1, so at the
   * stages that matter it changed nothing, and the only thing a reader could do
   * with it was make the lesion worse. Severity is the interesting axis — the
   * three lesions the spec's ordering criterion is written about are severities
   * — so that is what the control is.
   */
  supplyAt(progress) {
    let narrowed = false;
    for (const stage of STAGES) {
      if (progress >= stage.at) narrowed = stage.supply < 1;
    }
    return narrowed ? this.lesionSupply : 1;
  }

  /** @param {number} value 0..1 */
  setProgress(value) {
    this.progress = THREE.MathUtils.clamp(value, 0, 1);
    this.solve();
    this.applyModelToScene();
  }

  update(dt) {
    if (!this.state) return;
    this.phase = advanceCardiacPhase(this.phase, dt, this.state.heartRate);
    this.applyModelToScene();
  }

  /**
   * Draw the solved state.
   *
   * Two things move, and both read the same solve. The wall's *shape* follows
   * the cavity volume the circulation model settled into; how far each part of
   * it travels from end diastole is scaled by that territory's contractility.
   * A territory that has lost half its contraction moves half as far, which is
   * regional wall motion, and it is the same multiplier the ejection fraction
   * fell by.
   */
  applyModelToScene() {
    if (!this.state) return;

    const volume = cavityVolumeAt(this.phase, { cycle: this.solution.cycle });
    const beating = ventricleShape({
      cavityVolumeMl: volume,
      myocardialVolumeMl: myocardialVolumeFor({
        edvMl: this.state.edvMl,
        wallMm: this.baseParameters.wallMm,
        longToShortAxisRatio: this.baseParameters.longToShortAxisRatio,
      }),
      longToShortAxisRatio: this.baseParameters.longToShortAxisRatio,
    });
    beating.baseY = ANATOMY.baseY;
    updateVentricleGeometry(this.kit, beating, {});
    /** The wall as it is drawn this frame, for anything that has to sit on it. */
    this.beatingShape = beating;

    // Regional wall motion: pull each vertex back toward where it sits at end
    // diastole, in proportion to how much contraction its territory has lost.
    const position = this.geometry.attributes.position;
    const array = position.array;
    const rest = this.restPositions;
    const colors = this.geometry.attributes.color.array;
    const supplied = new THREE.Color(WALL_COLORS.supplied);
    const ischemic = new THREE.Color(WALL_COLORS.ischemic);
    const tint = new THREE.Color();
    const territoryTint = TERRITORIES.map((territory) => new THREE.Color(TERRITORY_COLORS[territory]));

    const sharp = new Float32Array(TERRITORIES.length);

    for (let v = 0; v < position.count; v++) {
      const base = v * TERRITORIES.length;
      let held = 0;
      let burden = 0;
      let sharpTotal = 0;
      for (let i = 0; i < TERRITORIES.length; i++) {
        const weight = this.vertexTerritory[base + i];
        const territory = TERRITORIES[i];
        // Physics reads the weights as the model produced them.
        held += weight * (1 - wallMotionAmplitude(this.myocardialState, territory));
        burden += weight * this.myocardialState.ischemicBurden[territory];
        // The *map* reads a sharpened copy. See MAP_EDGE.
        sharp[i] = weight ** MAP_EDGE;
        sharpTotal += sharp[i];
      }
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < TERRITORIES.length; i++) {
        const share = sharp[i] / sharpTotal;
        r += share * territoryTint[i].r;
        g += share * territoryTint[i].g;
        b += share * territoryTint[i].b;
      }

      const p = v * 3;
      // `held` is the fraction of this vertex's excursion that ischemia has
      // taken away, so it is blended back toward the end-diastolic position.
      array[p] += (rest[p] - array[p]) * held;
      array[p + 1] += (rest[p + 1] - array[p + 1]) * held;
      array[p + 2] += (rest[p + 2] - array[p + 2]) * held;

      // Colour reads burden, never supply — the rule the model exists to keep.
      tint.copy(supplied).lerp(ischemic, Math.min(1, burden));
      // The territory's own hue fades out as burden rises, so at rest the map
      // is legible and under ischemia the burden is what the eye reads. Holding
      // the hue at a fixed share instead kept a third of the signal fighting
      // the other two thirds.
      const hue = MAP_TINT * (1 - Math.min(1, burden));
      colors[p] = tint.r * (1 - hue) + r * hue;
      colors[p + 1] = tint.g * (1 - hue) + g * hue;
      colors[p + 2] = tint.b * (1 - hue) + b * hue;
    }
    position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeVertexNormals();
    // Regional wall motion moved the vertices after `updateVentricleGeometry`
    // welded the seam, and recomputing the normals threw that weld away — so
    // the closed lathe this scene draws had a shading crease down the anterior
    // wall every frame, in exactly the place the weld exists to remove. The
    // rule lives in the geometry; the scene has to ask for it again because it
    // is the one that invalidated it.
    weldLatheSeam(this.kit, this.beatingShape.outerSemiLength);

    // The arteries lie on the wall, so they move with it — both parts of it.
    // The beat is the obvious part: built once and left alone, the vessels sat
    // where the end-diastolic epicardium had been, and by mid-systole the two
    // descending arteries had left the silhouette and were hanging in space
    // below the apex. The regional part matters more for what this scene
    // teaches: an artery over myocardium that has stopped contracting travels
    // as far as that myocardium does and no further, which is the same
    // `held` the wall itself is blended back by.
    const atRest = new THREE.Vector3();
    const atNow = new THREE.Vector3();
    this.coronaries.layOn(beating, {
      displace: (point, where) => {
        let held = 0;
        for (const territory of TERRITORIES) {
          held += where.weights[territory] * (1 - wallMotionAmplitude(this.myocardialState, territory));
        }
        if (held <= 0) return;
        epicardialSurfacePoint(this.restShape, where.t, where.phi, atRest);
        epicardialSurfacePoint(beating, where.t, where.phi, atNow);
        point.addScaledVector(atRest.sub(atNow), held);
      },
    });

    // The narrowed artery darkens — the vessel, not the muscle it feeds.
    const lad = this.coronaries.branchById('lad');
    if (lad) {
      const open = new THREE.Color(VESSEL_COLORS.open);
      const shut = new THREE.Color(VESSEL_COLORS.restricted);
      const restriction = 1 - Math.min(1, this.supplyAt(this.progress));
      lad.material.color.copy(open).lerp(shut, restriction);
    }
  }

  getState() {
    return this.state;
  }

  getMetrics() {
    return METRICS.map((metric) => {
      const raw = this.state?.[metric.key];
      const value = raw * (metric.scale ?? 1);
      return {
        id: metric.id,
        label: metric.label,
        labelJa: metric.labelJa,
        unit: metric.unit,
        unitJa: metric.unitJa,
        value: Number.isFinite(value) ? value.toFixed(metric.digits) : '—',
        emphasis: Boolean(metric.emphasis),
      };
    });
  }

  /** Framings a guided explanation may ask for. Presentation only. */
  getGuideFramings() {
    return MyocardialIschemiaScene.guideFramings;
  }

  getAnnotations() {
    return [
      {
        id: 'lad',
        text: 'Anterior descending',
        sub: '左前下行枝',
        position: new THREE.Vector3(-1.3, -1.2, 3.4),
        range: [0, 1],
      },
      {
        id: 'anterior-wall',
        text: 'Anterior wall — what it feeds',
        sub: '前壁 — その血管が養う筋肉',
        position: new THREE.Vector3(0.6, -2.4, 3.2),
        range: [0.34, 1],
        compact: false,
      },
      {
        id: 'inferior-wall',
        text: 'Inferior wall — a different artery',
        sub: '下壁 — 別の血管',
        position: new THREE.Vector3(-0.9, -2.6, -3.2),
        range: [0.5, 1],
        compact: false,
      },
    ];
  }

  /**
   * The chart: burden against episode progress, per territory.
   *
   * The model's working shown. Burden is an integral and the chart is what an
   * integral looks like — it lags the supply going down and lags it coming back
   * up, and the gap after reperfusion is the thing the scene is about.
   */
  getCharts() {
    // Re-walking the whole episode is ~540 integration steps, and the curve
    // only moves when the lesion's severity does — not with the beat, and not
    // with where the reader is on the story. Cached on the one input it
    // depends on rather than recomputed sixty times a second.
    if (this.chartCache?.lesionSupply !== this.lesionSupply) {
      this.chartCache = { lesionSupply: this.lesionSupply, series: this.burdenSeries() };
    }
    const chart = CHARTS[0];
    const series = this.chartCache.series;
    const here = series.find((entry) => entry.id === 'lad').points[Math.round(this.progress * 60)];
    return {
      [chart.id]: {
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1 },
        series,
        markers: [{ x: here.x, y: here.y, color: TERRITORY_COLORS.lad, radius: 3 }],
        rules: STAGES.filter((stage) => stage.at > 0).map((stage) => ({
          axis: 'x',
          at: stage.at,
          color: 'rgba(255, 255, 255, 0.18)',
          dash: [2, 4],
        })),
      },
    };
  }

  /** The burden curve of a whole episode, at the severity now selected. */
  burdenSeries() {
    const series = TERRITORIES.map((territory) => ({
      id: territory,
      label: TERRITORY_LABELS[territory].label,
      labelJa: TERRITORY_LABELS[territory].labelJa,
      color: TERRITORY_COLORS[territory],
      points: [],
    }));

    let walk = restingMyocardium();
    let last = 0;
    for (let i = 0; i <= 60; i++) {
      const progress = i / 60;
      if (progress > last) {
        walk = episodeAt({
          supplyFactor: { lad: this.supplyAt(last) },
          progress: progress - last,
          from: walk,
        });
        last = progress;
      }
      series.forEach((entry, index) => {
        entry.points.push({ x: progress, y: walk.ischemicBurden[TERRITORIES[index]] });
      });
    }

    return series;
  }

  /**
   * The bullseye's per-frame half: how much burden each segment carries.
   *
   * A segment's burden is its territory's burden — the model does not resolve
   * finer than a territory, and a plot that varied segment by segment would be
   * claiming a resolution nothing solved.
   */
  getBullseye() {
    const burden = {};
    for (const ring of AHA_RINGS) {
      for (const segment of ring.segments) {
        burden[segment.id] = this.myocardialState.ischemicBurden[segment.territory];
      }
    }
    return { [BULLSEYE.id]: { burden } };
  }

  getModelControls() {
    return [
      {
        id: 'supply',
        label: 'Flow past the narrowing',
        labelJa: '狭窄部を通る血流',
        min: 0.35,
        max: 1,
        step: 0.05,
        value: this.lesionSupply,
        format: (value) => (value >= 0.99 ? 'open' : `×${value.toFixed(2)}`),
      },
      {
        id: 'afterload',
        label: 'Afterload (systemic resistance)',
        labelJa: '後負荷（体血管抵抗）',
        min: 0.7,
        max: 1.4,
        step: 0.01,
        value: this.loading.afterload,
        format: (value) => `×${value.toFixed(2)}`,
      },
    ];
  }

  /** @param {'supply'|'afterload'} id @param {number} value */
  setModelControl(id, value) {
    if (id === 'supply') this.lesionSupply = value;
    else if (id === 'afterload') this.loading.afterload = value;
    this.solve();
    this.applyModelToScene();
  }

  resetModelControls() {
    this.lesionSupply = DEFAULT_LESION_SUPPLY;
    this.loading = { preload: 1, afterload: 1 };
    this.solve();
    this.applyModelToScene();
  }

  getCausalStory() {
    const stage = [...STAGES].reverse().find((entry) => this.progress >= entry.at) ?? STAGES[0];
    return {
      heading: stage.label,
      headingJa: stage.labelJa,
      body: stage.body,
      bodyJa: stage.bodyJa,
      because: {
        text:
          'because oxygen debt has to accumulate before muscle stops contracting, and has to be repaid before it starts again',
        textJa:
          '心筋が収縮をやめるには酸素負債が溜まる必要があり、再び動き出すにはそれが返済される必要があるからです',
      },
    };
  }

  /**
   * The two lessons, in the shape `components/LearningPanel.js` reads.
   *
   * Every field here is the panel's, checked against what it actually
   * dereferences rather than against a shape that reads sensibly. The first
   * version of this file got almost all of them wrong — options carried `text`
   * where the panel renders `label`, so every answer button said `undefined`;
   * `setup` was a sentence where the panel expects `{ progress, ...controls }`,
   * so `setProgress(setup.progress)` set NaN and `Object.entries` on the string
   * fired `setControl` once per character; `observation` and `explanation` were
   * strings where the panel reads `.text`; there was no `watch` array at all,
   * so `snapshot()` threw; and the manipulation named `progress`, which
   * `setModelControl` does not handle, so it moved nothing.
   *
   * None of that was visible from the scene: it needs the panel. The test that
   * was meant to cover it asserted a contract this file invented, which is the
   * same miss as the chart's and is why the suite was green throughout.
   */
  getLearningModules() {
    return [
      {
        id: 'where-it-shows',
        title: 'Where does a narrowed artery show?',
        titleJa: '細くなった血管は、どこに現れるか',
        short: 'Where',
        shortJa: 'どこに',
        // Part-way through the episode, with the lesion at its default
        // severity: far enough in that the debt is accumulating, before the
        // wall has given up its excursion.
        setup: { progress: 0.3, supply: DEFAULT_LESION_SUPPLY, afterload: 1 },
        question: {
          text: 'Flow down the anterior descending falls. Which part of the heart stops moving?',
          textJa: '左前下行枝の血流が落ちます。心臓のどこが動かなくなりますか。',
          options: [
            { id: 'artery', label: 'The artery itself', labelJa: '血管そのもの' },
            { id: 'anterior', label: 'The anterior wall and the septum', labelJa: '前壁と中隔' },
            { id: 'inferior', label: 'The inferior wall', labelJa: '下壁' },
            { id: 'whole', label: 'The whole ventricle, evenly', labelJa: '心室全体が均等に' },
          ],
          answer: 'anterior',
        },
        manipulation: {
          control: 'supply',
          to: 0.15,
          seconds: 4,
          action: 'Tighten the narrowing',
          actionJa: '狭窄を強くする',
          text: 'Cut the flow past the narrowing to 15% of normal. Nothing else moves.',
          textJa: '狭窄部を通る血流を正常の 15% まで落とします。ほかは何も動かしません。',
          hint: 'Watch the supply/demand ratio first, then the burden, then how far the anterior wall still travels.',
          hintJa: 'まず供給／需要比、次に虚血負荷、最後に前壁がまだどれだけ動いているかを見てください。',
        },
        watch: ['lad-supply-demand', 'lad-burden', 'lad-wall-motion', 'ejection-fraction'],
        observation: {
          text: 'The ratio fell first, the burden climbed after it, and the wall gave up its excursion after that. On the model, the discoloured muscle is the anterior wall and the septum — rotate to the back and the inferior wall is untouched.',
          textJa: '先に比が落ち、遅れて負荷が上がり、そのあとで壁が動きを失いました。モデル上で色が変わるのは前壁と中隔です——裏へ回すと下壁は無傷のままです。',
        },
        explanation: {
          text: 'A coronary artery does not supply the place it runs through — it supplies everything downstream. The narrowing is in a groove on the front of the heart; what fails is the muscle that groove feeds. That is the whole reason territories are worth drawing, and why an anterior lesion and an inferior one look nothing alike.',
          textJa: '冠動脈は自分が走っている場所を養うのではなく、下流のすべてを養います。狭窄は心臓前面の溝にあり、破綻するのはその溝が養う筋肉です。支配域を描く価値も、前壁病変と下壁病変がまるで違って見える理由も、そこにあります。',
          footnote:
            'The territory map is a fixed convention that measurement disagrees with in places — segment 3 above all. The model card says where.',
          footnoteJa:
            '支配域マップは固定の慣習であり、実測とは一部食い違います（とくにセグメント 3）。どこが食い違うかはモデルカードにあります。',
        },
      },
      {
        id: 'stunning',
        title: 'The artery is open. Is the heart working?',
        titleJa: '血管は開いた。心臓は働いているか',
        short: 'Stunning',
        shortJa: 'スタニング',
        // Deep into the episode, where a debt has been run up and there is
        // something for reopening the artery to fail to undo.
        setup: { progress: 0.78, supply: DEFAULT_LESION_SUPPLY, afterload: 1 },
        question: {
          text: 'The narrowing is opened and flow is normal within a beat. What happens to the anterior wall?',
          textJa: '狭窄が開き、血流は一拍で正常に戻ります。前壁はどうなりますか。',
          options: [
            { id: 'at-once', label: 'It moves normally again at once', labelJa: 'すぐに正常に動き出す' },
            { id: 'lags', label: 'It stays hypokinetic well after flow returns', labelJa: '血流が戻ったあともしばらく低収縮のまま' },
            { id: 'never', label: 'It never recovers', labelJa: '二度と回復しない' },
            { id: 'harder', label: 'It contracts harder than normal to catch up', labelJa: '遅れを取り戻そうと普段より強く収縮する' },
          ],
          answer: 'lags',
        },
        manipulation: {
          control: 'supply',
          to: 1,
          seconds: 4,
          action: 'Open the artery',
          actionJa: '血管を開く',
          text: 'Restore flow past the narrowing to normal.',
          textJa: '狭窄部を通る血流を正常に戻します。',
          hint: 'The supply/demand ratio answers immediately. Watch how long the burden and the wall take.',
          hintJa: '供給／需要比はすぐに応じます。負荷と壁がどれだけ時間を要するかを見てください。',
        },
        watch: ['lad-supply-demand', 'lad-burden', 'lad-wall-motion', 'ejection-fraction'],
        observation: {
          text: 'Supply came back in one step. The burden is still being paid off, and the wall is still moving less than it should — the ejection fraction with it.',
          textJa: '供給は一手で戻りました。負荷はまだ返済の途中で、壁はまだ本来より動いていません——駆出率もそれに従います。',
        },
        explanation: {
          text: 'Muscle that has been ischemic stays hypokinetic long after its blood supply is restored. That is stunning, and it is why "the artery is open" and "the heart is working" are two different statements — the kind of gap that makes a procedure look successful while the patient is not yet better.',
          textJa: '虚血にさらされた心筋は、血流が回復したあとも長く低収縮のままです。これが stunning であり、「血管が開いた」と「心臓が働いている」が別の主張である理由です。手技は成功したように見えて、患者はまだ良くなっていない——その隔たりです。',
          footnote:
            'How long is not modelled. The axis is normalized episode progress, and real recovery depends on how deep and how long the ischemia was.',
          footnoteJa:
            '所要時間はモデル化していません。時間軸は正規化された経過であり、実際の回復は虚血の深さと長さに依存します。',
        },
      },
    ];
  }

  /** What this scene answers and refuses, shown beside it. */
  getScope() {
    return SCOPE;
  }

  dispose() {
    this.coronaries?.dispose?.();
    for (const item of this.disposables) item.dispose?.();
    this.root.clear();
  }
}

export default MyocardialIschemiaScene;
