import * as THREE from 'three';

import {
  CONTROLS,
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
  STAGES,
  STORY_LABEL,
  situation,
} from '../../../../data/pulmonaryEdema.js';
import {
  BASELINE_INTERSTITIAL_VOLUME_ML,
  DEFAULT_CONTROLS,
  INTERSTITIUM,
  MAXIMUM_LUNG_WATER_ML,
  createPulmonaryEdemaModel,
  floodingThresholdMmHg,
  solveSteadyState,
} from '../../../../models/pulmonaryEdema.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { doubleSidedOpacity, ghostMaterial, tissueMaterial } from '../../../shared/materials.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { buildLungs } from '../../organs/lungs.js';
import { clamp, lerp } from '../../../../utils/math.js';

/**
 * Where the water goes when the left atrium fills.
 *
 * The lungs are the organ builder `breathing-lungs` already uses — the same
 * geometry, at a different question, which is what
 * `docs/grand-design.md` §5.4 means by a prototype supplying its organ to a
 * disease scene. Nothing about lungs is modelled twice.
 *
 * Everything that changes on screen is a reading of
 * `src/models/pulmonaryEdema.js`:
 *
 * - the **interstitial sheath** grows and thickens with interstitial water;
 * - the **alveolar units** fill with the flooded fraction;
 * - the **filtration stream** runs at the filtration rate and the **lymphatic
 *   stream** at the clearance, so a lung in balance shows two streams of equal
 *   weight and a lung that is losing shows one outrunning the other.
 *
 * **The lungs do not breathe here.** They could, and it would look better; the
 * model has no ventilation in it at all, and a scene that drew a breath would
 * be asserting something no equation behind it can support. The motion in this
 * scene is water moving, because water moving is the subject.
 */
export class PulmonaryEdemaScene {
  static meta = {
    id: 'pulmonary-edema',
    status: 'alpha',
    title: 'Where the water goes',
    titleJa: '水は、どこへ行くのか',
    subtitle:
      'One Starling equation and three buffers · the pressure at which a lung floods is searched for, never stored',
    subtitleJa:
      '1 つの Starling 式と 3 つの緩衝機構 ｜ 肺が浸水する圧は、どこにも書かれておらず、解いて探しています',
    stages: STAGES,
    legend: LEGEND,
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

  static cameraPose = {
    // Both lungs in frame and slightly from the front, because the subject is a
    // comparison between two spaces inside one organ rather than a silhouette.
    position: new THREE.Vector3(0.5, 0.7, 8.6),
    target: new THREE.Vector3(0, 0.35, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = PulmonaryEdemaScene.meta.id;
    this.progress = 0;
    /** The progression walks from a normal lung towards this situation's endpoint. */
    this.situationId = 'risingPressure';
    /** Controls the reader has moved by hand, on top of the situation. */
    this.overrides = {};
    this.model = createPulmonaryEdemaModel({ controls: this.controlsNow() });
    this.state = this.model.getState();
  }

  build() {
    const object = new THREE.Group();

    this.lungs = buildLungs({ color: PALETTE.lung, opacity: 0.42, detail: 8 });
    object.add(this.lungs.object);

    // The interstitium, as a sheath on each lung.
    //
    // A child of the lung mesh rather than a sibling, so it inherits whatever
    // the lung does — playbook failure mode G, where an overlay that does not
    // follow its subject reads as cellophane wrapped round it.
    // One per lobe, now that a lung is five closed lobes rather than one
    // surface. Reading `.geometry` off what is now a Group gave `undefined`,
    // and three.js answers that with an empty default geometry rather than an
    // error — so the sheath went on being added, drew nothing, and no test
    // noticed. Built from each lobe's own geometry it wraps what is there.
    this.sheaths = [];
    for (const lobe of this.lungs.lobes) {
      const material = ghostMaterial({ color: PALETTE.interstitial, opacity: 0 });
      const sheath = new THREE.Mesh(lobe.geometry, material);
      sheath.name = `${lobe.id}-interstitium`;
      lobe.mesh.add(sheath);
      this.sheaths.push({ mesh: sheath, material });
    }

    // The alveolar units: the organ's own region mounts, which are already
    // inside the lungs and already parented to them. A scene that placed its
    // own points would be re-deriving the shape of the lung from outside it.
    const unitGeometry = new THREE.SphereGeometry(0.22, 14, 10);
    this.units = this.lungs.regions.map((region) => {
      const material = tissueMaterial({
        color: PALETTE.alveolar,
        roughness: 0.3,
        emissiveIntensity: 0.1,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(unitGeometry, material);
      mesh.name = `alveolar-unit-${region.side}-${region.index}`;
      region.object.add(mesh);
      return { material, mesh };
    });
    this.unitGeometry = unitGeometry;

    // The pulmonary capillary bed, drawn as vessels running from each hilum
    // into the regions. Their course comes from the organ's own landmarks —
    // the hilum it declares and the region mounts it owns — rather than from
    // coordinates typed here, so the vessels follow the lung (architecture
    // rule 1).
    const { curves, surfaces } = this.buildVessels();
    this.vesselSurfaces = surfaces;

    // Both streams are additively blended, so they add up where they overlap and
    // the total light goes with the *density* rather than with the rate —
    // failure mode C. Run at the counts a long vessel would want, on six short
    // ones, the two streams piled into bright spheres that read as structures:
    // six pale balls per lung that nothing in the scene graph accounted for.
    // Fewer, smaller, dimmer particles, and the lymph on its own route.
    this.filtration = createFlowStream({
      curves,
      count: 54,
      color: PALETTE.capillary,
      size: 3.0,
      speed: 0.3,
      spread: 0.05,
      seed: 61,
      opacity: 0.4,
    });
    this.lymph = createFlowStream({
      // Back towards the hilum, which is the way lymph leaves — but offset
      // behind the vessels rather than laid exactly on them, so that two
      // streams the reader is meant to compare do not composite into one.
      curves: curves.map((curve) => returnRoute(curve)),
      count: 40,
      color: PALETTE.lymph,
      size: 2.8,
      speed: 0.22,
      spread: 0.05,
      seed: 62,
      opacity: 0.36,
    });
    object.add(this.filtration.object, this.lymph.object);

    this.root.add(createStudioLights(), object);
    this.body = object;
    this.setProgress(0);
    return this.root;
  }

  /**
   * Vessels from each hilum out to the region mounts inside the lung.
   *
   * @returns {{ curves: THREE.Curve[], surfaces: TubeSurface[] }}
   */
  buildVessels() {
    const curves = [];
    const surfaces = [];
    const material = tissueMaterial({ color: PALETTE.capillary, roughness: 0.4, opacity: 0.85 });
    const hilum = new THREE.Vector3();

    this.lungs.object.updateMatrixWorld(true);
    for (const side of ['right', 'left']) {
      const lung = this.lungs.object.getObjectByName(`${side}-lung`);
      // The mediastinal aspect of each lung, in the group's coordinates: the
      // vessels enter where the organ says its hilum is.
      hilum.copy(this.lungs.anchors.hilum);
      if (side === 'left') hilum.x = -hilum.x;

      for (const region of this.lungs.regions.filter((entry) => entry.side === side).slice(0, 3)) {
        const target = region.object.position.clone().applyMatrix4(lung.matrix);
        const middle = hilum.clone().lerp(target, 0.55).add(new THREE.Vector3(0, 0.12, 0.05));
        const curve = smoothCurve([
          [hilum.x, hilum.y, hilum.z],
          [middle.x, middle.y, middle.z],
          [target.x, target.y, target.z],
        ]);
        curves.push(curve);
        const surface = new TubeSurface(curve, { radius: (u) => 0.075 - 0.035 * u, steps: 26, radial: 10 });
        surfaces.push(surface);
        this.lungs.object.add(new THREE.Mesh(surface.geometry, material));
      }
    }
    return { curves, surfaces };
  }

  // --- the one medical state ------------------------------------------------

  /**
   * The controls the model is solved at.
   *
   * `progress` interpolates from a normal lung towards the selected
   * situation's own settings; anything the reader has moved by hand is applied
   * on top. A control the situation does not mention keeps its reference
   * value — an injured barrier is not also hypoalbuminaemic.
   */
  controlsNow() {
    const target = situation(this.situationId).controls;
    const blended = { ...DEFAULT_CONTROLS };
    for (const [key, value] of Object.entries(target)) {
      blended[key] = lerp(DEFAULT_CONTROLS[key], value, this.progress);
    }
    return { ...blended, ...this.overrides };
  }

  /**
   * Re-solves and jumps to the equilibrium.
   *
   * Every control change settles rather than starting an accumulation from
   * wherever the lung happened to be: the read-out is meant to answer "what
   * does this lung end up at", and a number taken part-way there is a
   * transient reported as a result.
   */
  solve() {
    this.model.setControls(this.controlsNow());
    this.state = this.model.settle();
    this.applyModelToScene();
  }

  /** @param {number} value 0..1 */
  setProgress(value) {
    this.progress = clamp(value, 0, 1);
    this.solve();
  }

  settleModel() {
    this.state = this.model.settle();
    this.applyModelToScene();
  }

  update(dt) {
    // The streams run at the model's own rates. A lung in balance shows two
    // equal streams; one that is filling shows filtration outrunning lymph,
    // which is the whole of the mechanism in one picture.
    const reference = 60;
    this.filtration?.setRate(clamp(this.state.filtrationMlPerHour / reference, 0.05, 4));
    this.lymph?.setRate(clamp(this.state.lymphaticClearanceMlPerHour / reference, 0.05, 4));
    this.filtration?.update(dt);
    this.lymph?.update(dt);
  }

  /**
   * Everything the drawing reads from the solved state.
   *
   * One place decides each drawn property, so no two code paths can disagree
   * about how wet the lung looks (architecture rule 3).
   */
  applyModelToScene() {
    if (!this.sheaths) return;
    const state = this.state;

    // Interstitial water, as how present the sheath is. `interstitialFraction`
    // is a presentation name for a presentation quantity; the millilitres it
    // came from are in the read-out.
    const interstitialFraction = clamp(
      (state.interstitialWaterMl - BASELINE_INTERSTITIAL_VOLUME_ML) /
        (INTERSTITIUM.floodThresholdMl - BASELINE_INTERSTITIAL_VOLUME_ML),
      0,
      1
    );
    for (const sheath of this.sheaths) {
      // `ghostMaterial` draws both sides, so a ray crosses the shell twice and
      // the value written here is not the value seen — failure mode B. Written
      // straight through at 0.32 the sheath composited to 0.54 and read as the
      // organ rather than as water around it: the lung underneath disappeared.
      // The number below is the single-layer appearance wanted.
      sheath.material.opacity = doubleSidedOpacity(0.2 * interstitialFraction);
      sheath.material.visible = interstitialFraction > 0.01;
      // Standing off the lung by a little more as it fills, so the sheath reads
      // as a space with water in it rather than as a tint on the surface.
      const swell = 1 + 0.05 * interstitialFraction;
      sheath.mesh.scale.setScalar(swell);
    }

    // Alveolar flooding. The units fill in a fixed order rather than all at
    // once — flooding is a count of alveoli, so a partly flooded lung has some
    // full units and some empty ones, not twelve half-full ones.
    const flooded = state.floodedFraction;
    this.units.forEach((unit, index) => {
      const share = clamp(flooded * this.units.length - index, 0, 1);
      unit.material.opacity = 0.9 * share;
      unit.material.visible = share > 0.01;
      unit.mesh.scale.setScalar(lerp(0.6, 1, share));
    });
  }

  // --- what the app reads ---------------------------------------------------

  getState() {
    return this.state;
  }

  getMetrics() {
    return METRICS.map((metric) => {
      const raw = this.state[metric.key];
      const value = raw * (metric.scale ?? 1);
      return {
        id: metric.id,
        label: metric.label,
        labelJa: metric.labelJa,
        unit: metric.unit,
        value: Number.isFinite(value) ? value.toFixed(metric.digits) : '—',
        emphasis: Boolean(metric.emphasis),
      };
    });
  }

  getAnnotations() {
    const anchors = this.lungs?.anchors ?? {};
    return [
      {
        id: 'interstitium',
        text: 'Interstitium',
        sub: '間質',
        position: anchors.rightLung ?? new THREE.Vector3(-1.9, 0.9, 0.7),
        range: [0, 1],
      },
      {
        id: 'alveoli',
        text: 'Alveoli',
        sub: '肺胞',
        position: anchors.leftLung ?? new THREE.Vector3(1.9, 0.9, 0.7),
        range: [0.6, 1],
        compact: false,
      },
      {
        id: 'hilum',
        text: 'Pulmonary capillary',
        sub: '肺毛細血管',
        position: anchors.hilum ?? new THREE.Vector3(-0.62, 0.45, -0.2),
        range: [0, 1],
        compact: false,
      },
    ];
  }

  /**
   * The chart: the two flows that decide everything, against atrial pressure.
   *
   * It is the model's working shown, not a picture of the model: where the two
   * curves cross is where the lung stops being able to keep up, and that is the
   * threshold the read-out reports.
   */
  getCharts() {
    const controls = this.controlsNow();
    const filtration = [];
    const clearance = [];
    for (let pressure = 4; pressure <= 40; pressure += 1) {
      const solved = solveSteadyState({ ...controls, leftAtrialPressureMmHg: pressure });
      filtration.push({ x: pressure, y: solved.filtrationMlPerHour });
      clearance.push({ x: pressure, y: solved.lymphaticClearanceMlPerHour });
    }
    return [
      {
        id: 'balance',
        title: 'Filtration against clearance',
        titleJa: '濾過とリンパ排出',
        xLabel: 'Left atrial pressure (mmHg)',
        xLabelJa: '左房圧（mmHg）',
        yLabel: 'mL/h',
        yLabelJa: 'mL/h',
        series: [
          { id: 'filtration', label: 'Filtration', labelJa: '濾過', color: PALETTE.capillary, points: filtration },
          { id: 'lymph', label: 'Lymphatic clearance', labelJa: 'リンパ排出', color: PALETTE.lymph, points: clearance },
        ],
        marker: { x: controls.leftAtrialPressureMmHg },
      },
    ];
  }

  getModelControls() {
    const controls = this.controlsNow();
    return CONTROLS.map((control) =>
      control.kind === 'choice'
        ? { ...control, value: this.situationId }
        : { ...control, value: controls[control.id] }
    );
  }

  /**
   * @param {string} id
   * @param {number|string} value
   */
  setModelControl(id, value) {
    if (id === 'situation') {
      this.situationId = String(value);
      // A new situation replaces the reader's hand-set controls rather than
      // layering on them: carrying a permeability over into a question about
      // atrial pressure would silently make it a different question.
      this.overrides = {};
      this.solve();
      return;
    }
    this.overrides[id] = Number(value);
    this.solve();
  }

  resetModelControls() {
    this.overrides = {};
    this.solve();
  }

  getCausalStory() {
    const entry = situation(this.situationId);
    const threshold = floodingThresholdMmHg(this.controlsNow());
    return {
      id: entry.id,
      title: entry.labelEn,
      titleJa: entry.labelJa,
      question: entry.questionEn,
      questionJa: entry.questionJa,
      steps: [
        {
          id: 'capillary',
          text: `The capillary sits at ${this.state.capillaryPressureMmHg.toFixed(1)} mmHg — above the atrium, because a resistance lies between them.`,
          textJa: `毛細血管圧は ${this.state.capillaryPressureMmHg.toFixed(1)} mmHg。左房との間に抵抗があるため、常に左房圧より高くなります。`,
        },
        {
          id: 'starling',
          because: 'the hydrostatic push now exceeds the oncotic pull by more than it did',
          becauseJa: '静水圧の押しが、膠質浸透圧の引きを以前より大きく上回るため',
          text: `Filtration is ${this.state.filtrationMlPerHour.toFixed(0)} mL/h against a clearance of ${this.state.lymphaticClearanceMlPerHour.toFixed(0)} mL/h.`,
          textJa: `濾過は ${this.state.filtrationMlPerHour.toFixed(0)} mL/h、リンパ排出は ${this.state.lymphaticClearanceMlPerHour.toFixed(0)} mL/h です。`,
        },
        {
          id: 'accumulation',
          because: 'what is filtered and not cleared has to go somewhere',
          becauseJa: '濾過されて運び去られなかった分は、どこかに溜まるほかないため',
          text: `The lung holds ${this.state.lungWaterMl.toFixed(0)} mL, of which ${this.state.alveolarWaterMl.toFixed(0)} mL has reached alveoli.`,
          textJa: `肺は ${this.state.lungWaterMl.toFixed(0)} mL を保持し、うち ${this.state.alveolarWaterMl.toFixed(0)} mL が肺胞に達しています。`,
        },
        {
          id: 'gas',
          because: 'a flooded alveolus is perfused and not ventilated, which is a shunt',
          becauseJa: '満ちた肺胞は灌流されていて換気されていない、すなわちシャントであるため',
          text: `Shunt ${(this.state.shuntFraction * 100).toFixed(0)} %, PaO₂ ${this.state.arterialOxygenMmHg.toFixed(0)} mmHg, A–a ${this.state.alveolarArterialDifferenceMmHg.toFixed(0)} mmHg.`,
          textJa: `シャント ${(this.state.shuntFraction * 100).toFixed(0)} %、PaO₂ ${this.state.arterialOxygenMmHg.toFixed(0)} mmHg、A-a 較差 ${this.state.alveolarArterialDifferenceMmHg.toFixed(0)} mmHg。`,
        },
        {
          id: 'threshold',
          because: 'the pressure at which the buffers run out is a property of this lung, not a constant',
          becauseJa: '緩衝が尽きる圧は定数ではなく、この肺の性質だから',
          text:
            threshold === null
              ? 'This lung has no flooding threshold in range: it is either already wet at every pressure or dry at all of them.'
              : `This lung floods above ${threshold.toFixed(1)} mmHg. Change the albumin, the barrier or the lymphatics and the number moves.`,
          textJa:
            threshold === null
              ? 'この肺には範囲内に閾値がありません。あらゆる圧で既に湿っているか、あるいはどの圧でも乾いています。'
              : `この肺は ${threshold.toFixed(1)} mmHg を超えると浸水します。アルブミン・血管壁・リンパを変えれば、この数値は動きます。`,
        },
      ],
    };
  }

  getLearningModules() {
    return [
      {
        id: 'oxygen-and-shunt',
        title: 'Will oxygen fix it?',
        titleJa: '酸素で戻せるのか',
        question:
          'A lung with a third of its alveoli flooded is breathing air. You turn the inspired oxygen up to 100 %. What happens to the alveolar-to-arterial difference?',
        questionJa:
          '肺胞の 1/3 が水没した肺が空気を吸っています。吸入酸素濃度を 100 % に上げました。A-a 較差はどうなるか。',
        options: [
          { id: 'closes', label: 'It closes — the blood is oxygenated', labelJa: '縮まる（血液に酸素が入るため）' },
          { id: 'unchanged', label: 'It does not move', labelJa: '変わらない' },
          { id: 'widens', label: 'It widens, a great deal', labelJa: '大きく広がる' },
        ],
        answer: 'widens',
        explanation:
          'Blood that never met an alveolus cannot be improved by what is in the alveolus. The alveolar tension rises by hundreds of mmHg; the arterial tension rises by a fraction of that, because the shunted third still arrives mixed venous. The difference between them is what widens — which is why a shunt is recognised by giving oxygen and watching the gap, not the saturation.',
        explanationJa:
          '肺胞に一度も触れていない血液は、肺胞の中身では改善しません。肺胞側の酸素分圧は数百 mmHg 上がりますが、動脈側はそのごく一部しか上がりません。シャントした 1/3 は混合静脈血のまま到達するからです。広がるのはその差であり、シャントを見分けるときに飽和度ではなく較差を見るのはこのためです。',
        setup: { situation: 'risingPressure', progress: 1, controls: { inspiredOxygenFraction: 0.21 } },
        manipulation: { controls: { inspiredOxygenFraction: 1 } },
        watch: ['aa', 'pao2'],
      },
      {
        id: 'same-pressure-two-lungs',
        title: 'Two lungs, one pressure',
        titleJa: '同じ圧、2 つの肺',
        question:
          'Two patients have a left atrial pressure of 30 mmHg. One has had it for years; the other since this morning. Which lung has water in its alveoli?',
        questionJa:
          '2 人の左房圧はどちらも 30 mmHg。一方は何年もこの圧で、他方は今朝からです。肺胞に水があるのはどちらか。',
        options: [
          { id: 'both', label: 'Both — the pressure is the same', labelJa: '両方（圧が同じだから）' },
          { id: 'acute', label: 'Only the one that rose this morning', labelJa: '今朝上がったほうだけ' },
          { id: 'chronic', label: 'Only the long-standing one', labelJa: '長く続いているほうだけ' },
        ],
        answer: 'acute',
        explanation:
          'The threshold is not a property of the pressure. Lymphatic drainage adapts over months, so the chronically loaded lung clears far more water per hour and stays on the dry side of a pressure that floods an unadapted one. It is the reason a wedge pressure has to be read against how long it has been there.',
        explanationJa:
          '閾値は圧の性質ではありません。リンパ排出は数か月かけて適応するため、慢性的に負荷のかかった肺は毎時はるかに多くの水を運び去り、適応していない肺なら浸水する圧でも乾いた側に留まります。楔入圧を「いつからその値なのか」と併せて読む必要があるのはこのためです。',
        setup: { situation: 'risingPressure', progress: 1 },
        manipulation: { situation: 'chronicAdaptation', progress: 1 },
        watch: ['alveolar', 'water'],
      },
    ];
  }

  dispose() {
    this.filtration?.dispose?.();
    this.lymph?.dispose?.();
    for (const surface of this.vesselSurfaces ?? []) surface.dispose();
    this.unitGeometry?.dispose();
    for (const sheath of this.sheaths ?? []) sheath.material.dispose();
    for (const unit of this.units ?? []) unit.material.dispose();
  }
}

/**
 * The same route back to the hilum, standing off behind the vessel.
 *
 * The offset is presentation and nothing else: lymphatics do run alongside the
 * vessels, and two particle streams drawn on one curve add up into a third
 * thing that is neither of them.
 */
function returnRoute(curve) {
  const points = curve
    .getSpacedPoints(8)
    .map((point) => [point.x, point.y - 0.06, point.z - 0.16]);
  return smoothCurve(points.reverse());
}

/** How wet a lung has to be before the sheath is worth drawing at all. */
export const VISIBLE_INTERSTITIAL_WATER_ML = BASELINE_INTERSTITIAL_VOLUME_ML + 10;
/** The ceiling the scene's own scaling is written against. */
export const SCENE_MAXIMUM_WATER_ML = MAXIMUM_LUNG_WATER_ML;

export default PulmonaryEdemaScene;
