import * as THREE from 'three';

import {
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
  wallMotionAmplitude,
} from '../../../../models/myocardialIschemia.js';
import { myocardialVolumeFor, ventricleShape, cavityVolumeAt, beatPhaseAt, advanceCardiacPhase } from '../../../../models/cardiacMechanics.js';
import { circulationParameters } from '../heartFailure/hemodynamics.js';
import { ANATOMY } from '../heartFailure/anatomy.js';
import {
  buildVentricleGeometry,
  updateVentricleGeometry,
  epicardialSurfacePoint,
  VENTRICLE_SHAPING,
} from '../heartFailure/geometry/ventricleGeometry.js';
import { buildCoronaryArteries } from '../../organs/coronaryArteries.js';
import { TERRITORY_MASS_FRACTION, territoryWeightsAt } from '../../organs/coronaryAnatomy.js';

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
  static cameraPose = {
    position: new THREE.Vector3(-2.4, 1.0, 19.5),
    target: new THREE.Vector3(0, -2.2, 0),
  };

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

    this.restPositions = Float32Array.from(this.geometry.attributes.position.array);

    this.coronaries = buildCoronaryArteries({
      surfacePoint: epicardialSurfacePoint,
      shape: this.restShape,
      root: { centre: new THREE.Vector3(-1.13, 1.56, 0.32), radius: 0.95 },
      color: VESSEL_COLORS.open,
    });
    this.root.add(this.coronaries.object);

    this.solve();
    this.applyModelToScene();
    return this.root;
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

  /** Where the episode currently is, as a supply factor and a progress. */
  controlsNow() {
    let supply = 1;
    for (const stage of STAGES) {
      if (this.progress >= stage.at) supply = stage.supply;
    }
    return { supplyFactor: { lad: supply }, progress: this.progress };
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
    this.myocardialState = myocardium;

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
    this.shape = this.shapeFor(myocardium);

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

    for (let v = 0; v < position.count; v++) {
      const base = v * TERRITORIES.length;
      let held = 0;
      let burden = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < TERRITORIES.length; i++) {
        const weight = this.vertexTerritory[base + i];
        const territory = TERRITORIES[i];
        held += weight * (1 - wallMotionAmplitude(this.myocardialState, territory));
        burden += weight * this.myocardialState.ischemicBurden[territory];
        r += weight * territoryTint[i].r;
        g += weight * territoryTint[i].g;
        b += weight * territoryTint[i].b;
      }

      const p = v * 3;
      // `held` is the fraction of this vertex's excursion that ischemia has
      // taken away, so it is blended back toward the end-diastolic position.
      array[p] += (rest[p] - array[p]) * held;
      array[p + 1] += (rest[p + 1] - array[p + 1]) * held;
      array[p + 2] += (rest[p + 2] - array[p + 2]) * held;

      // Colour reads burden, never supply — the rule the model exists to keep.
      tint.copy(supplied).lerp(ischemic, Math.min(1, burden));
      // A trace of the territory's own hue, so which artery owns which wall is
      // legible even at rest, when no wall is ischemic and every one is the
      // same colour.
      // The territory's own hue fades out as burden rises, so at rest the map
      // is legible and under ischemia the burden is what the eye reads. Holding
      // the hue at a fixed share instead kept a third of the signal fighting
      // the other two thirds.
      const hue = 0.16 * (1 - Math.min(1, burden));
      colors[p] = tint.r * (1 - hue) + r * hue;
      colors[p + 1] = tint.g * (1 - hue) + g * hue;
      colors[p + 2] = tint.b * (1 - hue) + b * hue;
    }
    position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeVertexNormals();

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

    const chart = CHARTS[0];
    return {
      [chart.id]: {
        label: chart.label,
        labelJa: chart.labelJa,
        caption: chart.caption,
        captionJa: chart.captionJa,
        xLabel: chart.xLabel,
        xLabelJa: chart.xLabelJa,
        yLabel: chart.yLabel,
        domain: { x: [0, 1], y: [0, 1] },
        marker: { x: this.progress },
        series,
      },
    };
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

  getLearningModules() {
    return [
      {
        id: 'where-it-shows',
        title: 'Where does a narrowed artery show?',
        titleJa: '細くなった血管は、どこに現れるか',
        question: {
          text: 'The anterior descending artery narrows. Which part of the heart stops moving?',
          textJa: '左前下行枝が細くなりました。心臓のどこが動かなくなりますか。',
          options: [
            { id: 'a', text: 'The artery itself', textJa: '血管そのもの' },
            { id: 'b', text: 'The anterior wall and the septum', textJa: '前壁と中隔' },
            { id: 'c', text: 'The inferior wall', textJa: '下壁' },
            { id: 'd', text: 'The whole ventricle, evenly', textJa: '心室全体が均等に' },
          ],
          answer: 'b',
        },
        setup: 'Start at the beginning of the episode, with every territory supplied.',
        setupJa: '経過の最初、すべての支配域が灌流されている状態から始めます。',
        manipulation: {
          control: 'progress',
          to: 0.68,
          seconds: 6,
          action: 'Advance to where the debt shows, then rotate to the back of the heart.',
          actionJa: '負債が現れるところまで進め、心臓の裏側へ回してください。',
        },
        observation:
          'The discoloured muscle is on the front and the septum, and the inferior wall behind is untouched. The narrowing is in a groove on the front; what fails is everything downstream of it.',
        observationJa:
          '色の変わった筋肉は前壁と中隔にあり、裏の下壁は無傷です。狭窄は前面の溝にあり、破綻するのはその下流すべてです。',
        explanation:
          'A coronary artery does not supply the place it runs through — it supplies everything downstream. That is why territories are worth drawing, and why an anterior lesion and an inferior lesion look nothing alike.',
        explanationJa:
          '冠動脈は、自分が走っている場所を養うのではなく、下流のすべてを養います。だから支配域を描く価値があり、前壁病変と下壁病変はまったく違って見えます。',
      },
      {
        id: 'stunning',
        title: 'The artery is open. Is the heart working?',
        titleJa: '血管は開いた。心臓は働いているか',
        question: {
          text: 'Flow down the anterior descending is restored. What happens to the anterior wall?',
          textJa: '左前下行枝の血流が回復しました。前壁はどうなりますか。',
          options: [
            { id: 'a', text: 'It starts moving normally again immediately', textJa: 'すぐに正常に動き出す' },
            { id: 'b', text: 'It stays hypokinetic well after flow returns', textJa: '血流が戻ったあともしばらく低収縮のまま' },
            { id: 'c', text: 'It never recovers', textJa: '二度と回復しない' },
            { id: 'd', text: 'It contracts harder than normal to catch up', textJa: '遅れを取り戻そうと普段より強く収縮する' },
          ],
          answer: 'b',
        },
        setup: 'Run the episode to the point where the anterior wall has clearly stopped keeping up.',
        setupJa: '前壁が明らかに追いつかなくなるところまで経過を進めます。',
        manipulation: {
          control: 'progress',
          to: 1,
          seconds: 8,
          action: 'Advance into reperfusion and watch the supply read-out and the wall separately.',
          actionJa: '再灌流まで進め、供給の数値と壁の動きを別々に見てください。',
        },
        observation:
          'Supply returns to normal within a beat. The burden falls slowly, and the wall follows the burden rather than the supply — it is still visibly hypokinetic at the end.',
        observationJa:
          '供給は一拍で正常に戻ります。負荷はゆっくり下がり、壁は供給ではなく負荷に従います——最後まで目に見えて低収縮のままです。',
        explanation:
          'This is myocardial stunning. It is why "the artery is open" and "the heart is working" are two different statements, and why a wall that is not moving is not proof that the muscle is dead.',
        explanationJa:
          'これが心筋 stunning です。「血管が開いた」と「心臓が働いている」が別の主張である理由であり、動かない壁が「心筋が死んでいる」証拠にならない理由です。',
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
