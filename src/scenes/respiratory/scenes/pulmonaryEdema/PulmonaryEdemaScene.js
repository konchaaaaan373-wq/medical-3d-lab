import * as THREE from 'three';

import {
  CHARTS,
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
import { disposeObject } from '../../../../utils/dispose.js';
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

    this.lungs = buildLungs({ color: PALETTE.lung, opacity: 0.42, detail: 14, bronchi: true, vessels: true });
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
    let top = 0;
    for (let pressure = 4; pressure <= 40; pressure += 1) {
      const solved = solveSteadyState({ ...controls, leftAtrialPressureMmHg: pressure });
      filtration.push({ x: pressure, y: solved.filtrationMlPerHour });
      clearance.push({ x: pressure, y: solved.lymphaticClearanceMlPerHour });
      top = Math.max(top, solved.filtrationMlPerHour, solved.lymphaticClearanceMlPerHour);
    }
    // Keyed by the ids `meta.charts` declares. The App reads one object per
    // refresh and hands each entry to the panel of the same id; returning an
    // array meant nothing was ever found, and declaring no charts meant nothing
    // ever asked — so this whole method used to run for no one.
    return {
      'filtration-balance': {
        x: { min: 4, max: 40 },
        y: { min: 0, max: top * 1.08 },
        series: [
          { id: 'filtration', color: PALETTE.capillary, width: 1.8, points: filtration },
          { id: 'lymph', color: PALETTE.lymph, width: 1.8, points: clearance },
        ],
        markers: [
          {
            x: controls.leftAtrialPressureMmHg,
            y: this.state.filtrationMlPerHour,
            color: PALETTE.alveolar,
          },
        ],
        rules: [
          {
            axis: 'x',
            at: controls.leftAtrialPressureMmHg,
            color: 'rgba(255, 255, 255, 0.28)',
            label: 'now',
            labelJa: '現在',
          },
        ],
      },
    };
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

  /**
   * The chain, in the shape `CausalStoryPanel` reads: `heading`/`body`, and a
   * `because` that is an object because it is bilingual like everything else.
   *
   * Written with `text`/`textJa` and a bare string `because`, all five steps
   * rendered blank — the panel wrote `undefined` into every element and hid
   * nothing, because `step.because` was truthy either way.
   */
  getCausalStory() {
    const entry = situation(this.situationId);
    const threshold = floodingThresholdMmHg(this.controlsNow());
    const state = this.state;
    return {
      id: entry.id,
      title: entry.labelEn,
      titleJa: entry.labelJa,
      question: entry.questionEn,
      questionJa: entry.questionJa,
      steps: [
        {
          id: 'capillary',
          heading: 'The capillary is above the atrium',
          headingJa: '毛細血管圧は左房圧より高い',
          body: `It sits at ${state.capillaryPressureMmHg.toFixed(1)} mmHg against an atrium at ${this.controlsNow().leftAtrialPressureMmHg.toFixed(0)} mmHg, because a venous resistance lies between them. The pressure that filters is the capillary's, not the one a catheter reads.`,
          bodyJa: `毛細血管圧は ${state.capillaryPressureMmHg.toFixed(1)} mmHg、左房圧は ${this.controlsNow().leftAtrialPressureMmHg.toFixed(0)} mmHg。間に静脈側の抵抗があるためです。濾過を決めるのは毛細血管の圧であって、カテーテルが読む値ではありません。`,
        },
        {
          id: 'starling',
          heading: 'Filtration outruns clearance',
          headingJa: '濾過がリンパ排出を上回る',
          because: {
            text: 'the hydrostatic push now exceeds the oncotic pull by more than it did',
            textJa: '静水圧の押しが、膠質浸透圧の引きを以前より大きく上回るため',
          },
          body: `Filtration is ${state.filtrationMlPerHour.toFixed(0)} mL/h against a clearance of ${state.lymphaticClearanceMlPerHour.toFixed(0)} mL/h.`,
          bodyJa: `濾過は ${state.filtrationMlPerHour.toFixed(0)} mL/h、リンパ排出は ${state.lymphaticClearanceMlPerHour.toFixed(0)} mL/h です。`,
        },
        {
          id: 'accumulation',
          heading: 'The difference has to go somewhere',
          headingJa: '差分はどこかに溜まる',
          because: {
            text: 'what is filtered and not cleared stays in the lung',
            textJa: '濾過されて運び去られなかった分は、肺に残るほかないため',
          },
          body: `The lung holds ${state.lungWaterMl.toFixed(0)} mL, of which ${state.alveolarWaterMl.toFixed(0)} mL has reached alveoli. The interstitium takes it first, and takes it cheaply until its pressure comes up off the floor.`,
          bodyJa: `肺は ${state.lungWaterMl.toFixed(0)} mL を保持し、うち ${state.alveolarWaterMl.toFixed(0)} mL が肺胞に達しています。まず間質が受け取り、間質圧が下限から上がってくるまでは安いコストで受け取り続けます。`,
        },
        {
          id: 'gas',
          heading: 'A flooded alveolus is a shunt',
          headingJa: '水没した肺胞はシャントである',
          because: {
            text: 'it is perfused and not ventilated, so its blood arrives as it left',
            textJa: '灌流されていて換気されていない、すなわち血液がそのまま戻るため',
          },
          body: `Shunt ${(state.shuntFraction * 100).toFixed(0)} %, PaO₂ ${state.arterialOxygenMmHg.toFixed(0)} mmHg, A–a ${state.alveolarArterialDifferenceMmHg.toFixed(0)} mmHg. This is the point at which oxygen stops being an answer.`,
          bodyJa: `シャント ${(state.shuntFraction * 100).toFixed(0)} %、PaO₂ ${state.arterialOxygenMmHg.toFixed(0)} mmHg、A-a 較差 ${state.alveolarArterialDifferenceMmHg.toFixed(0)} mmHg。ここから先、酸素は答えでなくなります。`,
        },
        {
          id: 'threshold',
          heading: 'The pressure that does this belongs to the lung',
          headingJa: 'その圧はこの肺のものである',
          because: {
            text: 'the buffers that decide it are properties of this lung, not constants',
            textJa: 'それを決める緩衝機構は定数ではなく、この肺の性質だから',
          },
          body:
            threshold === null
              ? 'This lung has no flooding threshold in range: it is either already wet at every pressure in the model, or dry at all of them.'
              : `This lung floods above ${threshold.toFixed(1)} mmHg. Change the albumin, the barrier or the lymphatics and the number moves — which is why it is searched for here and stored nowhere.`,
          bodyJa:
            threshold === null
              ? 'この肺には範囲内に閾値がありません。モデルの全ての圧で既に湿っているか、あるいはどの圧でも乾いています。'
              : `この肺は ${threshold.toFixed(1)} mmHg を超えると浸水します。アルブミン・血管壁・リンパを変えればこの数値は動きます。だからこそ、この値はどこにも保存されず毎回探されています。`,
        },
      ],
    };
  }

  /**
   * Two lessons, in the shape `LearningPanel` drives: predict → manipulate →
   * observe → explain.
   *
   * These were written to a shape of my own invention — a string `question`,
   * options at the top level, controls nested under `setup.controls` — which
   * the panel reads as `question.options` and answers with a `TypeError` on the
   * first click. Nothing caught it: this scene had no scene test, and the panel
   * is only built when somebody opens "Predict it".
   */
  getLearningModules() {
    return [
      {
        id: 'oxygen-and-shunt',
        title: 'Will oxygen fix it?',
        titleJa: '酸素で戻せるのか',
        short: 'Shunt',
        shortJa: 'シャント',
        // Flat, and in the units the controls are in: `setup` is read as
        // `{progress, ...controlValues}` and applied one control at a time.
        // The pressure is named here rather than inherited from wherever the
        // slider was left: a lesson that begins 'this lung has water in its
        // alveoli' has to be given a lung that does.
        setup: {
          progress: 1,
          leftAtrialPressureMmHg: 28,
          inspiredOxygenFraction: 0.21,
          permeability: 1,
          chronicity: 0,
        },
        question: {
          text: 'This lung has water in its alveoli and is breathing air. You turn the inspired oxygen up to 100 %. What happens to the difference between the alveolar and the arterial oxygen tension?',
          textJa:
            '肺胞に水が入った肺が、空気を吸っています。吸入酸素濃度を 100 % に上げます。肺胞と動脈の酸素分圧の差はどうなりますか。',
          options: [
            { id: 'closes', label: 'It closes — the blood is oxygenated', labelJa: '縮まる（血液に酸素が入るため）' },
            { id: 'unchanged', label: 'It does not move', labelJa: '変わらない' },
            { id: 'widens', label: 'It widens, a great deal', labelJa: '大きく広がる' },
          ],
          answer: 'widens',
        },
        manipulation: {
          control: 'inspiredOxygenFraction',
          to: 1,
          seconds: 3,
          action: 'Give 100 % oxygen',
          actionJa: '酸素 100 % にする',
          text: 'Raise the inspired oxygen from air to 100 %. Nothing else moves — the same water is in the same alveoli.',
          textJa:
            '吸入酸素を空気から 100 % まで上げます。ほかは何も動かしません。同じ水が同じ肺胞に入ったままです。',
          hint: 'Watch the A–a difference, not the arterial tension on its own.',
          hintJa: '動脈血の酸素分圧そのものではなく、A-a 較差を見てください。',
        },
        watch: ['shunt', 'pao2', 'aa'],
        observation: {
          text: 'The arterial tension rose a little. The difference between alveolar and arterial rose enormously. The shunt fraction did not move at all.',
          textJa:
            '動脈血の酸素分圧は少し上がりました。肺胞と動脈の較差は大きく広がりました。シャント率はまったく動いていません。',
        },
        explanation: {
          text: 'Blood that never met an alveolus cannot be improved by what is in the alveolus. The alveolar tension rises by hundreds of mmHg; the arterial tension rises by a fraction of that, because the shunted blood still arrives mixed venous and is added back in. What widens is the difference between them — which is why a shunt is recognised by giving oxygen and watching the gap rather than the saturation, and why oxygen is a holding measure in pulmonary oedema and not a treatment for it.',
          textJa:
            '肺胞に一度も触れていない血液は、肺胞の中身では改善しません。肺胞側の酸素分圧は数百 mmHg 上がりますが、動脈側はそのごく一部しか上がりません。シャントした血液は混合静脈血のまま合流するからです。広がるのは両者の差であり、シャントを見分けるときに飽和度ではなく較差を見るのは、そして肺水腫で酸素が治療ではなく時間稼ぎであるのは、このためです。',
          footnote:
            'The model has no ventilation in it, so it cannot show the work of breathing that decides when this stops being survivable. The gas exchange is the part it can answer.',
          footnoteJa:
            'このモデルには換気がないため、いつ耐えられなくなるかを決める呼吸仕事量は示せません。答えられるのはガス交換の側だけです。',
        },
      },
      {
        id: 'two-lungs-one-pressure',
        title: 'Two lungs, one pressure',
        titleJa: '同じ圧、2 つの肺',
        short: 'Adaptation',
        shortJa: '適応',
        setup: {
          progress: 1,
          leftAtrialPressureMmHg: 28,
          chronicity: 0,
          permeability: 1,
          inspiredOxygenFraction: 0.21,
        },
        question: {
          text: 'Two people have the same left atrial pressure. One has had it for years; the other since this morning. Give the lymphatics of this lung the months the first one has had. What happens to the water in its alveoli?',
          textJa:
            '2 人の左房圧は同じです。一方は何年もこの圧で、他方は今朝からです。この肺のリンパに、前者と同じだけの月日を与えます。肺胞内の水はどうなりますか。',
          options: [
            { id: 'same', label: 'Nothing — the pressure is what floods a lung', labelJa: '変わらない（浸水させるのは圧だから）' },
            { id: 'clears', label: 'It clears', labelJa: 'なくなる' },
            { id: 'worse', label: 'It gets worse', labelJa: '悪化する' },
          ],
          answer: 'clears',
        },
        manipulation: {
          control: 'chronicity',
          to: 1,
          seconds: 3,
          action: 'Give the lymphatics months',
          actionJa: 'リンパに月日を与える',
          text: 'Adapt the lymphatics fully, at the same left atrial pressure, the same barrier and the same albumin.',
          textJa: '左房圧・血管壁・アルブミンをすべて同じにしたまま、リンパだけを完全に適応させます。',
          hint: 'Watch the clearance first, then the water, then the alveoli.',
          hintJa: 'まずリンパ排出、次に肺水分量、最後に肺胞内の水を見てください。',
        },
        watch: ['lymph', 'water', 'alveolar', 'shunt'],
        observation: {
          text: 'Clearance rose several-fold and the lung water fell behind it. The alveoli emptied, at a pressure that had flooded them a moment earlier.',
          textJa:
            'リンパ排出は数倍になり、肺水分量はそれに従って下がりました。少し前まで水没していたのと同じ圧で、肺胞から水が引きました。',
        },
        explanation: {
          text: 'The pressure at which a lung floods is not a property of the pressure. Lymphatic drainage adapts over months to something like an order of magnitude above its resting flow, so a chronically loaded lung stays on the dry side of a pressure that drowns an unadapted one. It is why a wedge pressure has to be read against how long it has been there, why mitral stenosis of long standing is tolerated at numbers that would be an emergency after a myocardial infarction, and why "the pressure at which a lung floods" is searched for here rather than stored.',
          textJa:
            '肺が浸水する圧は、圧の性質ではありません。リンパ排出は数か月かけて安静時の 1 桁上まで適応するため、慢性的に負荷のかかった肺は、適応していない肺なら溺れる圧でも乾いた側に留まります。楔入圧を「いつからその値なのか」と併せて読む理由であり、長く経過した僧帽弁狭窄が心筋梗塞直後なら緊急事態の数値でも耐えられる理由であり、このモデルが「肺が浸水する圧」をどこにも保存せず毎回探している理由です。',
          footnote:
            'The adaptation factor here is invented, not measured: the direction and the rough scale are what the model asserts. Evidence dossier §2.',
          footnoteJa:
            'ここでの適応の倍率は測定値ではなく、こちらで決めた値です。モデルが主張しているのは方向とおおよその大きさです。evidence dossier §2。',
        },
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
    // The organ owns its own geometries and materials — five lobes, every tube
    // of the tree — and hands back a `dispose` for them. Then the subtree, the
    // way every other class scene ends: without these two the lobes, the tube
    // surfaces and the vessel material stayed allocated on every teardown.
    this.lungs?.dispose?.();
    disposeObject(this.root);
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
