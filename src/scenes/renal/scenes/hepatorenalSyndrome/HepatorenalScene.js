import * as THREE from 'three';
import { createStudioLights } from '../../../shared/lighting.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { buildKidney } from '../../organs/kidney.js';
import { buildGlomerulus } from '../../organs/glomerulus.js';
import { buildLiver } from '../../../hepatobiliary/organs/liver.js';
import { buildSystemicCirculation } from './circulation.js';
import {
  DEFAULT_CONTROLS,
  REFERENCE_AFFERENT_RESISTANCE,
  REFERENCE_EFFERENT_RESISTANCE,
  REFERENCE_SVR,
  RENAL_REFERENCE,
  SYSTEMIC_REFERENCE,
  kidneyWithoutTheSignal,
  solveHepatorenal,
} from '../../../../models/hepatorenal.js';
import {
  ANNOTATIONS,
  CHARTS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEARNING_LABEL,
  LEGEND,
  METRICS,
  MODEL_CONTROLS,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  STAGES,
  STORY_LABEL,
} from '../../../../data/hepatorenal.js';
import { REEL_CUES, REEL_DURATION, cameraAt, comparisonAt, overlayAt, progressAt } from './reelStoryboard.js';

/**
 * Scene: hepatorenal syndrome — a normal kidney that has stopped filtering.
 *
 * Every number, every vessel calibre and the rate of every particle stream is
 * a reading of [`src/models/hepatorenal.js`](../../../../models/hepatorenal.js),
 * which in turn imports the portal circulation model rather than restating it.
 * The scene draws two organs and the circulation between them; the model
 * solves for the one pressure that makes them consistent.
 *
 * ### The distinction the scene exists to make
 *
 * The read-out shows **two** filtration rates side by side and always has: this
 * kidney's, and the same kidney's at the same arterial pressure with the
 * vasoconstrictor signal removed. The second is the model's own control
 * experiment — `kidneyWithoutTheSignal` — and it is the scene's answer to why
 * a kidney taken from a donor with the syndrome works in somebody else. Showing
 * only the first would leave the reader to infer that something in the kidney
 * had been damaged, which is the misconception the scene is against.
 *
 * ### What is presentation
 *
 * The **calibre of every vessel** follows the flow it is carrying, and the two
 * glomerular arterioles follow their resistances — but a resistance is not a
 * radius, and the conversion between them lives in the glomerulus builder and
 * is named there as a presentation mapping. Particle rate follows flow.
 * Nothing about a *pressure* is drawn as a shape; pressure is a number and a
 * plot, because there is no honest way to draw it.
 *
 * The vasoconstrictor signal is drawn as colour on the vessels it acts on and
 * nowhere else — in particular it is never drawn on the splanchnic bed, since
 * the whole point is that the splanchnic bed does not respond to it.
 */
export class HepatorenalScene {
  static meta = {
    id: 'hepatorenal-syndrome',
    title: 'Hepatorenal syndrome: a normal kidney that has stopped filtering',
    titleJa: '肝腎症候群：正常な腎臓が濾過をやめるとき',
    subtitle: 'Two organs, one circulation · the compensation that defends the pressure is what strangles the kidney',
    subtitleJa: '2 つの臓器と 1 つの循環 ｜ 血圧を守る代償そのものが、腎臓を締め上げます',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    charts: CHARTS,
    modelScope: MODEL_SCOPE,
    story: STORY_LABEL,
    learning: LEARNING_LABEL,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    // Far enough back to hold the liver, the aorta, the kidney and the
    // magnified glomerulus above it at once — the point is that they are one
    // circulation, and a camera that can only see one of them says otherwise.
    position: new THREE.Vector3(0.2, 0.4, 17.2),
    target: new THREE.Vector3(0, -0.1, 0),
  };

  /** The structural intrahepatic resistance the main axis reaches at its top. */
  static MAX_STRUCTURAL_RESISTANCE = 12;

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = HepatorenalScene.meta.id;
    this.progress = 0;
    this.comparing = false;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveHepatorenal(this.controls);
  }

  build() {
    const object = new THREE.Group();

    this.liver = buildLiver({ color: PALETTE.liver, opacity: 0.6 });
    // Placed so that the portal vein arrives at its underside and the hepatic
    // veins leave its top: the vessels and the organ are one pathway, and a
    // gap between them would be drawing a circulation that is not connected.
    this.liver.object.position.set(-3.55, 1.35, 0.05);
    this.liver.object.scale.setScalar(0.62);

    this.circulation = buildSystemicCirculation({
      artery: PALETTE.artery,
      portal: PALETTE.portal,
      vein: PALETTE.vein,
      splanchnic: PALETTE.splanchnic,
      renal: PALETTE.renal,
    });

    this.renalUnit = this.buildRenalUnit();

    // One stream per pathway, so "where the blood goes" is something the reader
    // watches rather than reads. Every rate below is a flow the model solved.
    this.streams = {
      splanchnic: createFlowStream({
        curves: this.circulation.paths.splanchnic,
        count: 100,
        color: PALETTE.splanchnic,
        size: 4,
        speed: 0.4,
        spread: 0.05,
        seed: 71,
        opacity: 0.5,
      }),
      throughLiver: createFlowStream({
        curves: this.circulation.paths.throughLiver,
        count: 70,
        color: PALETTE.vein,
        size: 4,
        speed: 0.36,
        spread: 0.05,
        seed: 72,
        opacity: 0.45,
      }),
      renal: createFlowStream({
        curves: this.circulation.paths.renal,
        count: 90,
        color: PALETTE.renal,
        size: 4,
        speed: 0.44,
        spread: 0.04,
        seed: 73,
        opacity: 0.5,
      }),
      systemic: createFlowStream({
        curves: this.circulation.paths.systemic,
        count: 60,
        color: PALETTE.artery,
        size: 3,
        speed: 0.4,
        spread: 0.05,
        seed: 74,
        opacity: 0.3,
      }),
    };

    // The circulation and the liver are one group, because the comparison hides
    // them together: what the comparison is about is two kidneys at the *same*
    // arterial pressure, and drawing one circulation beside only one of them
    // would suggest the other had a different one.
    this.circulationGroup = new THREE.Group();
    this.circulationGroup.add(
      this.liver.object,
      this.circulation.object,
      ...Object.values(this.streams).map((stream) => stream.object)
    );

    object.add(this.circulationGroup, this.renalUnit.object);
    this.root.add(createStudioLights(), object);
    this.body = object;

    this.applyModelToScene();
    return this.root;
  }

  /**
   * A kidney and the magnified glomerulus that goes with it.
   *
   * Built as a unit and by one function because the comparison draws a second
   * one: what the two views differ in has to be the model's answer, and a
   * second builder would let a difference in the *mesh* pass for one.
   */
  buildRenalUnit() {
    const object = new THREE.Group();

    const kidney = buildKidney({
      side: 'left',
      color: PALETTE.kidney,
      medullaColor: PALETTE.medulla,
      opacity: 0.78,
    });
    // Hilum towards the aorta, where the renal artery arrives.
    kidney.object.position.set(3.45, -1.15, 0);
    kidney.object.scale.setScalar(0.95);

    // The glomerulus is drawn far larger than a glomerulus, above the kidney it
    // belongs to. It is a magnification and not a second structure — there is
    // one renal circulation in the model and this is a close-up of it.
    const glomerulus = buildGlomerulus({
      afferent: PALETTE.afferent,
      efferent: PALETTE.efferent,
      capillary: PALETTE.afferent,
      capsule: PALETTE.capsule,
      filtrate: PALETTE.filtrate,
    });
    glomerulus.object.position.copy(GLOMERULUS_ORIGIN);
    glomerulus.object.scale.setScalar(GLOMERULUS_SCALE);

    const filtrate = createFlowStream({
      curves: glomerulus.paths.filtrate,
      count: 44,
      color: PALETTE.filtrate,
      size: 4,
      speed: 0.34,
      spread: 0.03,
      seed: 75,
      opacity: 0.5,
    });
    filtrate.object.position.copy(glomerulus.object.position);
    filtrate.object.scale.copy(glomerulus.object.scale);

    object.add(kidney.object, glomerulus.object, filtrate.object);
    return { object, kidney, glomerulus, filtrate };
  }

  // --- the one axis ---------------------------------------------------------

  /**
   * @param {number} value 0 = compensated cirrhosis, 1 = decompensated
   *
   * The axis moves the intrahepatic resistance and the arterial vasodilation
   * together, because that is the course the scene is about. They are
   * separable — `splanchnicVasodilation` is a control of its own — and the
   * model card says that moving them together is a simplification of the
   * course rather than a claim about it.
   */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.structuralResistance =
      1 + (HepatorenalScene.MAX_STRUCTURAL_RESISTANCE - 1) * this.progress;
    this.controls.splanchnicVasodilation = this.progress;
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
    for (const control of MODEL_CONTROLS) this.controls[control.id] = DEFAULT_CONTROLS[control.id];
    this.setProgress(this.progress);
  }

  solve() {
    this.solved = solveHepatorenal(this.controls);
    this.released = kidneyWithoutTheSignal(this.solved);
    this.applyModelToScene();
  }

  update(dt) {
    for (const stream of Object.values(this.streams)) stream.update(dt);
    this.renalUnit?.filtrate.update(dt);
    this.reference?.filtrate.update(dt);
  }

  // --- normal beside the diseased -------------------------------------------

  /**
   * The comparison is the model's own control experiment.
   *
   * Not a healthy person beside a sick one: **the same kidney, at the same
   * arterial pressure, with the vasoconstrictor signal removed.** That is the
   * comparison the scene's claim rests on, and it is the one a second healthy
   * body could not make — a healthy body would differ in its pressure too, and
   * the reader could not tell which difference did the work.
   */
  setComparison(enabled) {
    this.comparing = enabled;

    if (enabled && !this.reference) {
      this.reference = this.buildRenalUnit();
      this.body.add(this.reference.object);
    }
    if (this.reference) {
      this.reference.object.visible = enabled;
      this.reference.object.position.x = COMPARISON_CENTRE - COMPARISON_SPREAD;
    }
    // The two kidneys move to the middle of the frame and the circulation
    // stands down, so that the only difference on screen is the one the model
    // says there is.
    this.renalUnit.object.position.x = enabled ? COMPARISON_CENTRE + COMPARISON_SPREAD : 0;
    this.circulationGroup.visible = !enabled;
    this.applyModelToScene();
  }

  /** Where the camera goes when both kidneys are on screen. */
  getComparisonView() {
    return {
      position: new THREE.Vector3(0, 0.7, 13.6),
      target: new THREE.Vector3(0, 0.3, 0),
    };
  }

  // --- reading the model into the scene -------------------------------------

  /** Every drawn property, in one place. */
  applyModelToScene() {
    const state = this.solved;
    const released = this.released ?? kidneyWithoutTheSignal(state);

    // A vessel carrying more blood is a wider vessel. Presentation curve: the
    // fourth root of the flow ratio, so a fourfold flow is a 1.4× calibre.
    const calibre = (flow, reference) => (Math.max(0, flow) / reference) ** 0.25;
    this.circulation.setCalibre(
      'splanchnicArtery',
      calibre(state.systemic.splanchnicFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW)
    );
    this.circulation.setCalibre(
      'portalVein',
      calibre(state.systemic.splanchnicFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW)
    );
    this.circulation.setCalibre(
      'hepaticVein',
      calibre(state.portal.portalLiverFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW)
    );
    this.circulation.setCalibre(
      'renalArtery',
      calibre(state.kidney.renalBloodFlowMlPerMin, RENAL_REFERENCE.renalBloodFlowMlPerMin)
    );
    this.circulation.setCalibre(
      'renalVein',
      calibre(state.kidney.renalBloodFlowMlPerMin, RENAL_REFERENCE.renalBloodFlowMlPerMin)
    );

    // The liver's colour follows how scarred it is. Presentation.
    const scarring = clamp((this.controls.structuralResistance - 1) / 9);
    this.liver.object.material.color.copy(HEALTHY_LIVER).lerp(SCARRED_LIVER, scarring);

    // The signal, drawn as colour on the vessels that respond to it — and
    // never on the splanchnic bed, because the whole point is that it does not.
    const activation = state.neurohumoral.activation;
    for (const name of ['renalArtery', 'systemic']) {
      const vessel = this.circulation.vessels[name];
      vessel.material.color.copy(RELAXED_VESSEL).lerp(CONSTRICTED_VESSEL, activation);
    }

    this.drawRenalUnit(this.renalUnit, state.kidney);
    if (this.reference) this.drawRenalUnit(this.reference, released);

    // Streams: rate and brightness follow the flows, so the picture and the
    // read-out cannot disagree about where the blood is going.
    const rate = (flow, reference) => 0.14 + (2.4 * flow) / reference;
    const shown = (flow, reference) => Math.min(1, flow / (reference * 0.55));
    this.streams.splanchnic.setRate(rate(state.systemic.splanchnicFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW));
    this.streams.splanchnic.setOpacity(
      0.12 + 0.42 * shown(state.systemic.splanchnicFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW)
    );
    this.streams.throughLiver.setRate(rate(state.portal.portalLiverFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW));
    this.streams.throughLiver.setOpacity(
      0.1 + 0.4 * shown(state.portal.portalLiverFlowMlPerMin, HEALTHY_SPLANCHNIC_FLOW)
    );
    this.streams.renal.setRate(
      rate(state.kidney.renalBloodFlowMlPerMin, RENAL_REFERENCE.renalBloodFlowMlPerMin)
    );
    this.streams.renal.setOpacity(
      0.1 + 0.45 * shown(state.kidney.renalBloodFlowMlPerMin, RENAL_REFERENCE.renalBloodFlowMlPerMin)
    );
    const elsewhere =
      state.systemic.cardiacOutputMlPerMin -
      state.systemic.splanchnicFlowMlPerMin -
      state.kidney.renalBloodFlowMlPerMin;
    this.streams.systemic.setRate(rate(Math.max(0, elsewhere), SYSTEMIC_REFERENCE.cardiacOutputMlPerMin));
    this.streams.systemic.setOpacity(0.24);
  }

  /**
   * One renal unit, drawn from one solved kidney.
   *
   * Both the primary and the comparison go through here, so the two views on
   * screen differ by exactly what the model says they differ by.
   *
   * @param {ReturnType<HepatorenalScene['buildRenalUnit']>} unit
   * @param {ReturnType<import('../../../../models/hepatorenal.js').solveKidney>} kidney
   */
  drawRenalUnit(unit, kidney) {
    unit.glomerulus.setResistance('afferent', kidney.afferentResistance / REFERENCE_AFFERENT_RESISTANCE);
    unit.glomerulus.setResistance('efferent', kidney.efferentResistance / REFERENCE_EFFERENT_RESISTANCE);

    const filtering = kidney.glomerularFiltrationRateMlPerMin / RENAL_REFERENCE.glomerularFiltrationRateMlPerMin;
    unit.glomerulus.setFiltration(filtering);
    unit.filtrate.setRate(0.08 + 1.9 * filtering);
    unit.filtrate.setOpacity(0.06 + 0.5 * Math.min(1, filtering));

    // A kidney that is being perfused less is a paler kidney. Presentation, and
    // the only thing on the kidney mesh that moves at all — nothing here is
    // drawing damage, because there is none in the model.
    const perfusion = clamp(kidney.renalBloodFlowMlPerMin / RENAL_REFERENCE.renalBloodFlowMlPerMin);
    unit.kidney.object.traverse((child) => {
      if (child.isMesh && child.material?.color && child.userData.baseColor === undefined) {
        child.userData.baseColor = child.material.color.clone();
      }
      if (child.isMesh && child.userData.baseColor) {
        child.material.color.copy(PALE_KIDNEY).lerp(child.userData.baseColor, 0.35 + 0.65 * perfusion);
      }
    });
  }

  // --- what the interface reads --------------------------------------------

  getAnnotations() {
    /** A point in the magnified glomerulus, in the world. */
    const inGlomerulus = (point, unit) =>
      point.clone().multiplyScalar(GLOMERULUS_SCALE).add(GLOMERULUS_ORIGIN).add(unit.object.position);

    const anchors = {
      ...this.circulation.anchors,
      ...Object.fromEntries(
        Object.entries(this.renalUnit.glomerulus.anchors).map(([id, point]) => [
          id,
          inGlomerulus(point, this.renalUnit),
        ])
      ),
      // The two comparison labels sit above the glomerulus each one belongs to.
      // Their anchors are the *comparison* positions rather than wherever the
      // units currently are, for two reasons: these labels are only ever drawn
      // while the comparison is on, and the app reads this list once, before
      // the second kidney has been built.
      thisKidney: comparisonAnchor(COMPARISON_CENTRE + COMPARISON_SPREAD),
      releasedKidney: comparisonAnchor(COMPARISON_CENTRE - COMPARISON_SPREAD),
    };
    return ANNOTATIONS.flatMap((annotation) => {
      const anchor = anchors[annotation.anchor];
      return anchor ? [{ ...annotation, position: anchor.clone() }] : [];
    });
  }

  getMetrics() {
    const state = this.solved;
    const released = this.released ?? kidneyWithoutTheSignal(state);
    const value = {
      gfr: Math.round(state.kidney.glomerularFiltrationRateMlPerMin),
      renalFlow: Math.round(state.kidney.renalBloodFlowMlPerMin),
      filtrationFraction: (state.kidney.filtrationFraction * 100).toFixed(1),
      netPressure: state.kidney.netFiltrationPressureMmHg.toFixed(1),
      glomerularPressure: state.kidney.glomerularPressureMmHg.toFixed(1),
      map: state.systemic.meanArterialPressureMmHg.toFixed(0),
      output: Math.round(state.systemic.cardiacOutputMlPerMin),
      resistanceFall: Math.round((state.systemic.systemicVascularResistance / REFERENCE_SVR) * 100),
      activation: state.neurohumoral.activation.toFixed(2),
      autoregulation: state.kidney.autoregulating ? 'holding' : 'exhausted',
      released: Math.round(released.glomerularFiltrationRateMlPerMin),
    };
    const valueJa = {
      autoregulation: state.kidney.autoregulating ? '保たれている' : '尽きている',
    };
    return METRICS.map((metric) => ({
      ...metric,
      value: value[metric.id],
      ...(valueJa[metric.id] != null ? { valueJa: valueJa[metric.id] } : {}),
    }));
  }

  getCharts() {
    // Both plots are drawn along the scene's own axis, re-solved rather than
    // recorded, so that the curve and the read-out are the same model. The
    // marker is where the reader currently is.
    const curve = this.progressionCurve();
    const percent = (value, reference) => (value / reference) * 100;

    const series = (id, color, read) => ({
      id,
      color,
      width: 2,
      points: curve.map((point) => ({ x: point.at, y: read(point.state) })),
    });

    const here = this.solved;
    return {
      'renal-response': {
        x: { min: 0, max: 1 },
        y: { min: 0, max: 160 },
        series: [
          series('flow', '#d2564f', (s) =>
            percent(s.kidney.renalBloodFlowMlPerMin, RENAL_REFERENCE.renalBloodFlowMlPerMin)
          ),
          series('gfr', '#e8d75f', (s) =>
            percent(
              s.kidney.glomerularFiltrationRateMlPerMin,
              RENAL_REFERENCE.glomerularFiltrationRateMlPerMin
            )
          ),
          series('fraction', '#8fd8ff', (s) => percent(s.kidney.filtrationFraction, 0.2)),
        ],
        markers: [
          {
            x: this.progress,
            y: percent(
              here.kidney.glomerularFiltrationRateMlPerMin,
              RENAL_REFERENCE.glomerularFiltrationRateMlPerMin
            ),
            color: '#e8d75f',
            radius: 4,
          },
        ],
        rules: [
          { axis: 'y', at: 100, color: 'rgba(255,255,255,0.2)', label: 'healthy', labelJa: '健常' },
        ],
        note: here.kidney.autoregulating
          ? { text: 'autoregulation holding', textJa: '自己調節は保たれています' }
          : { text: 'autoregulation exhausted', textJa: '自己調節能は尽きています' },
      },
      circulation: {
        x: { min: 0, max: 1 },
        y: { min: 0, max: 160 },
        series: [
          series('map', '#c8524b', (s) =>
            percent(s.systemic.meanArterialPressureMmHg, SYSTEMIC_REFERENCE.meanArterialPressureMmHg)
          ),
          series('output', '#7ee0a8', (s) =>
            percent(s.systemic.cardiacOutputMlPerMin, SYSTEMIC_REFERENCE.cardiacOutputMlPerMin)
          ),
          series('activation', '#e0a13c', (s) => s.neurohumoral.activation * 100),
        ],
        markers: [
          {
            x: this.progress,
            y: percent(
              here.systemic.meanArterialPressureMmHg,
              SYSTEMIC_REFERENCE.meanArterialPressureMmHg
            ),
            color: '#c8524b',
            radius: 4,
          },
        ],
        rules: [
          { axis: 'y', at: 100, color: 'rgba(255,255,255,0.2)', label: 'healthy', labelJa: '健常' },
        ],
      },
    };
  }

  /**
   * The scene's axis, re-solved at a fixed number of points.
   *
   * The treatment and drug controls are carried along unchanged, so switching
   * on a vasoconstrictor moves the whole curve rather than just the marker —
   * which is what makes "the treatment works on the circulation" visible
   * rather than asserted.
   */
  progressionCurve(samples = 26) {
    const points = [];
    for (let i = 0; i < samples; i += 1) {
      const at = i / (samples - 1);
      points.push({
        at,
        state: solveHepatorenal({
          ...this.controls,
          structuralResistance: 1 + (HepatorenalScene.MAX_STRUCTURAL_RESISTANCE - 1) * at,
          splanchnicVasodilation: at,
        }),
      });
    }
    return points;
  }

  /**
   * The fifteen-second social sequence.
   *
   * Everything specific to it lives in `reelStoryboard.js`. The comparison
   * comes on part-way through rather than at the start: the first three beats
   * are about the circulation and need it on screen, and the last two are the
   * two kidneys side by side, which is what the whole thing has been arguing
   * towards.
   */
  getReel() {
    return {
      durationSeconds: REEL_DURATION,
      cues: REEL_CUES,
      progress: 0,
      comparisonAt,
      viewDirection: new THREE.Vector3(0.06, 0.03, 1).normalize(),
      framing: {
        halfWidth: 6.2,
        halfHeight: 3.9,
        minimumDistance: 16,
        target: new THREE.Vector3(0.1, 0.1, 0),
      },
      cameraAt,
      overlayAt,

      /**
       * Where on the scene's axis the sequence sits at this instant.
       *
       * The model is a stateless equilibrium solve, so setting the axis is the
       * whole of driving it: the same second always gives the same circulation,
       * which is what makes the sequence reproducible.
       */
      driveAt(t, scene) {
        scene.setProgress(progressAt(t));
      },

      /**
       * This kidney's figures, and the same kidney's without the signal.
       *
       * Both read through the same solve the read-out panel reads, so a card
       * cannot show a number the panel would not.
       */
      readMetrics(scene) {
        const rows = (kidney) => ({
          gfr: Math.round(kidney.glomerularFiltrationRateMlPerMin),
          flow: Math.round(kidney.renalBloodFlowMlPerMin),
          fraction: (kidney.filtrationFraction * 100).toFixed(0),
        });
        return {
          kidney: rows(scene.solved.kidney),
          released: rows(kidneyWithoutTheSignal(scene.solved)),
          map: scene.solved.systemic.meanArterialPressureMmHg.toFixed(0),
          activation: scene.solved.neurohumoral.activation.toFixed(2),
        };
      },
    };
  }

  dispose() {
    for (const stream of Object.values(this.streams ?? {})) stream.dispose();
    this.renalUnit?.filtrate.dispose();
    this.renalUnit?.glomerulus.dispose();
    this.reference?.filtrate.dispose();
    this.reference?.glomerulus.dispose();
    this.circulation?.dispose();
    disposeObject(this.root);
  }
}

/**
 * Where the pair of kidneys sits when both are on screen, and how far apart.
 *
 * `CENTRE` is the shift that brings a renal unit — built at the right of a
 * layout that also holds a liver and an aorta — onto the middle of the frame.
 * `SPREAD` is then half the gap between the two.
 */
const COMPARISON_CENTRE = -3.45;
const COMPARISON_SPREAD = 2.3;

/** Where a comparison label sits, in the magnified glomerulus's own frame. */
const COMPARISON_LABEL_ANCHOR = new THREE.Vector3(0, 1.5, 0.3);

/** That point in the world, for a renal unit standing at `x`. */
function comparisonAnchor(x) {
  return COMPARISON_LABEL_ANCHOR.clone()
    .multiplyScalar(GLOMERULUS_SCALE)
    .add(GLOMERULUS_ORIGIN)
    .add(new THREE.Vector3(x, 0, 0));
}

/** Where the magnified glomerulus sits inside a renal unit, and how large. */
const GLOMERULUS_ORIGIN = new THREE.Vector3(3.5, 1.45, 0.25);
const GLOMERULUS_SCALE = 0.72;

/**
 * Splanchnic flow in a healthy person, mL/min — the reference the drawn
 * splanchnic calibres are relative to.
 *
 * Not a constant of the model: it is what the model solves for a healthy liver,
 * and it is written here only so that a calibre has something to be a ratio of.
 */
const HEALTHY_SPLANCHNIC_FLOW = solveHepatorenal({ structuralResistance: 1 }).systemic
  .splanchnicFlowMlPerMin;

const HEALTHY_LIVER = new THREE.Color(PALETTE.liver);
const SCARRED_LIVER = new THREE.Color(PALETTE.scarred);
const RELAXED_VESSEL = new THREE.Color(PALETTE.renal);
const CONSTRICTED_VESSEL = new THREE.Color(PALETTE.signal);
const PALE_KIDNEY = new THREE.Color('#8a7a80');
