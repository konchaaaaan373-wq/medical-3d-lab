import { createStepper } from './integrate.js';
import { scatter } from './random.js';

/**
 * Expiratory flow limitation and dynamic hyperinflation.
 *
 * The question this model exists to answer: **why does someone with obstructed
 * airways end up breathing at a higher lung volume, and why does it get worse
 * the harder they work?**
 *
 * The answer has three parts and the model is built so that all three are
 * consequences rather than assertions.
 *
 * 1. **A lung empties with a time constant.** Each unit here empties
 *    passively against its own elastic recoil through its own resistance, so
 *    its volume decays with τ = R·C. Nothing writes τ down; it is what the
 *    equation does.
 * 2. **Expiration is given a limited amount of time.** Breathing faster
 *    shortens expiratory time before it shortens anything else. When the time
 *    available falls below roughly three time constants, the unit does not
 *    finish emptying, and the volume it did not give back is there at the
 *    start of the next breath. Do that every breath and the resting volume
 *    climbs until the extra recoil at the higher volume is enough to empty the
 *    tidal volume in the time left. That equilibrium is dynamic
 *    hyperinflation, and here it is found by the model rather than set.
 * 3. **Pushing harder does not help.** Expiratory flow out of each unit is
 *    capped at the flow its own elastic recoil can drive through the
 *    collapsible segment upstream of the equal pressure point — a ceiling that
 *    contains no term for effort at all. That is what expiratory flow
 *    limitation *is*, and it is why the model's expiratory muscle pressure can
 *    be raised to no effect in an obstructed lung and to great effect in a
 *    normal one.
 *
 * ## Units
 *
 * Litres, seconds, cmH₂O — so resistance is cmH₂O·s/L, compliance is L/cmH₂O,
 * and their product is a time in seconds with no conversion factor hiding in
 * it. See [`units.js`](units.js).
 *
 * ## What this is not
 *
 * An educational conceptual model. It is not a patient simulator and not a
 * research solver. In particular it has **no gas exchange in it at all** — no
 * oxygen, no carbon dioxide, no saturation — because none of those can be
 * derived from lung volumes, and a scene that produced them from this model
 * would be inventing them. The full boundary is in
 * `docs/model-cards/copd.md`; the sources for the constants are in
 * `docs/model-evidence/copd.md`.
 */

/**
 * How many parallel units the lung is divided into.
 *
 * Enough that the spread of time constants is visible as a *distribution*
 * rather than as two or three cases, and few enough that each one can be a
 * region on screen the reader can point at. Every unit is a whole lung in
 * miniature: its own resistance, its own compliance, its own volume.
 */
export const UNIT_COUNT = 12;

/**
 * The reference lung. All of these are textbook central values for an adult,
 * not measurements from a person, and the model card says so.
 */
export const REFERENCE = {
  /** Respiratory-system resistance during expiration, cmH₂O·s/L. */
  expiratoryResistance: 5,
  /**
   * Resistance of the collapsible segment upstream of the equal pressure
   * point, cmH₂O·s/L. It is this — not the total resistance — that sets the
   * maximal expiratory flow, and it is the number emphysema wrecks: without
   * the alveolar attachments tethering them open, small airways narrow during
   * expiration and the equal pressure point moves out towards them.
   *
   * In a normal lung it is small enough that the ceiling it implies sits far
   * above any flow tidal breathing asks for, which is why a normal lung is
   * never flow-limited at rest.
   */
  upstreamResistance: 2.2,
  /** Respiratory-system compliance, L/cmH₂O. */
  compliance: 0.11,
  /**
   * The **lung's own** compliance, L/cmH₂O — the lung without the chest wall.
   *
   * Two compliances, because two different questions need two different
   * recoils. What drives passive expiration is the recoil of the whole
   * respiratory system relative to *its* relaxation volume, which is zero at
   * FRC. What sets the maximal expiratory flow is the recoil of the **lung**,
   * which at FRC is about +5 cmH₂O — the pressure the chest wall's outward
   * pull is holding it against — and is emphatically not zero. Using the
   * system's recoil for both would have said that a lung at FRC cannot produce
   * any flow at all, which is false and would have made the flow ceiling
   * meaningless exactly where this scene lives.
   *
   * 0.24 is what puts lung recoil at 5 cmH₂O at the reference FRC, and it is
   * also the textbook figure. Treated as linear between RV and TLC; the real
   * curve flattens near TLC, so the envelope this produces understates flow at
   * high volumes.
   */
  lungCompliance: 0.24,
  /** The volume below which the lung does not empty, L. */
  residualVolume: 1.2,
  /** Total lung capacity, L. */
  totalLungCapacity: 6,
  /**
   * The outward recoil of the chest wall, as the pressure that holds the
   * relaxed system above residual volume — so that relaxation volume is
   * `RV + C · this`, and a lung that has lost recoil (higher C) relaxes at a
   * higher volume without anything else changing. Calibrated to put the
   * reference FRC at 2.4 L; a lumped stand-in for the chest wall's own
   * pressure-volume curve, which this model does not carry separately.
   */
  chestWallRecoil: 10.9,
};

/**
 * How much residual volume rises per unit of extra compliance, L per L/cmH₂O.
 *
 * Losing elastic recoil does two separate things to the volume axis: it raises
 * the volume the relaxed system sits at, and it raises the volume below which
 * the lung will not empty, because airways without tethering close earlier in
 * expiration. The first falls straight out of `RV + C · chestWallRecoil`; this
 * constant is the second. Calibrated so that halving the recoil roughly
 * doubles residual volume, which is the direction and rough size the
 * literature reports; it is not fitted.
 */
const CLOSING_VOLUME_GAIN = 13.3;

/**
 * How much total lung capacity rises per unit of extra compliance,
 * L per L/cmH₂O. TLC moves far less than RV and FRC do, which is why the
 * textbook summary of COPD is "TLC near normal, RV and FRC raised".
 */
const CAPACITY_GAIN = 8.9;

/**
 * How steeply the flow ceiling falls as elastic recoil is lost.
 *
 * The collapsible segment is held open in expiration by the pull of the
 * alveolar attachments around it. Take those away and it narrows under the
 * same pleural pressure, the equal pressure point moves out towards the
 * periphery, and the resistance upstream of it — the resistance that sets
 * maximal flow — rises much faster than the resistance of the airway at rest
 * does. That asymmetry is why emphysema limits flow so much more than its
 * resting airway calibre suggests, and why a bronchodilator cannot undo it.
 *
 * Modelled as `Rus ∝ recoil^-2.5`. The exponent is illustrative — it puts a
 * lung with two thirds of normal recoil at about two and a half times the
 * upstream resistance, which is the order the mid-expiratory flows imply — and
 * it is not fitted to measurements.
 */
const TETHERING_EXPONENT = 2.5;

/**
 * How much of a rise in airway resistance is felt by the collapsible segment.
 *
 * Less than all of it: the segment upstream of the equal pressure point is a
 * short length of one airway, while the resistance a whole lung shows at rest
 * is the sum along every path. Square root is a stand-in for "some but not
 * all", not a derivation.
 */
const CEILING_SHARE_OF_RESISTANCE = 0.5;

/**
 * How different one unit is from the next.
 *
 * Real lungs are not uniform, and a uniform model cannot show what
 * heterogeneity does — that the worst units trap most of the gas while the
 * best ones carry most of the ventilation. The half-width is illustrative: the
 * model claims that the spread exists and what it causes, not how wide it is
 * in a person.
 */
const UNIT_SPREAD = 0.45;
const RESISTANCE_SEED = 20260829;
const COMPLIANCE_SEED = 611;

/**
 * The breathing pattern at a given ventilatory demand, 0 (rest) to 1 (heavy).
 *
 * Demand is deliberately *one* axis that moves several things at once, because
 * that is what exercise does: the rate rises, the drive rises, expiratory
 * muscles come into play, and the fraction of the cycle spent inspiring
 * lengthens a little. What matters for this scene is that **expiratory time
 * shortens faster than anything else lengthens** — which is why the numbers
 * below are worth reading in that order.
 *
 * @param {number} demand 0..1
 */
export function breathingPattern(demand) {
  const d = Math.min(1, Math.max(0, demand));
  /** Breaths per minute. Rest to the rate of hard exercise. */
  const rate = 14 + 20 * d;
  const period = 60 / rate;
  /**
   * Inspiratory duty cycle. Rises modestly with exercise — it does not, and
   * cannot, rise enough to stop expiratory time falling.
   */
  const duty = 0.33 + 0.07 * d;
  /**
   * The minute ventilation the body is asking for, L/min. Rest to hard
   * exercise.
   *
   * This — not a muscle pressure — is what demand sets, because it is the
   * quantity the chemoreflexes actually defend. How much pressure it takes to
   * produce is a property of the lung, and in an obstructed one it may not be
   * producible at all. Prescribing the pressure instead would have made the
   * obstructed lung simply hypoventilate, quietly, with nothing on screen
   * saying that it was failing to keep up.
   */
  const targetVentilation = 6.5 + 38.5 * d;

  return {
    demand: d,
    ratePerMin: rate,
    periodS: period,
    inspiratoryTimeS: period * duty,
    expiratoryTimeS: period * (1 - duty),
    targetVentilationLPerMin: targetVentilation,
  };
}

/**
 * The most inspiratory muscle pressure the model will sustain, cmH₂O.
 *
 * A ceiling has to exist or the lung would meet any demand by pulling harder,
 * and a person cannot. Set at the order of a sustainable fraction of maximal
 * inspiratory pressure rather than at a measured value; what matters is that
 * there *is* a ceiling and that a hyperinflated lung reaches it sooner,
 * because it is breathing on the flat part of its pressure-volume curve with a
 * flattened diaphragm.
 */
export const MAX_INSPIRATORY_PRESSURE_CMH2O = 32;

/**
 * Expiratory muscle pressure that goes with a given inspiratory drive, cmH₂O.
 *
 * Quiet expiration is passive; the abdominal muscles are recruited only once
 * the drive is well up. Whether recruiting them achieves anything is the
 * question the flow ceiling answers, and the answer differs between the two
 * lungs — which is the point of having this at all.
 */
const expiratoryDrive = (inspiratoryPressure) => Math.max(0, (inspiratoryPressure - 9) * 0.75);

/**
 * The lung's mechanical properties under a given set of controls.
 *
 * Split out from the simulator because everything here is a *statement about
 * the lung* rather than about a breath: the volumes it sits between, the
 * resistance and compliance of each unit, and the time constants those imply.
 * A test can check them without running a breath, and the scene can draw the
 * maximal flow-volume envelope from them without stepping the model.
 *
 * @param {{ airwayResistance?: number, elasticRecoil?: number, bronchodilation?: number }} controls
 *   `airwayResistance` multiplies the reference resistance; `elasticRecoil` is
 *   a fraction of the reference recoil, so 0.6 means a lung with 60% of normal
 *   recoil and therefore 1/0.6 times normal compliance; `bronchodilation` is
 *   0 (none) to 1 (a full response).
 */
export function lungMechanics({ airwayResistance = 1, elasticRecoil = 1, bronchodilation = 0 } = {}) {
  const dilation = Math.min(1, Math.max(0, bronchodilation));
  /**
   * A bronchodilator relaxes airway smooth muscle. That is most of the total
   * resistance and only some of the collapsible segment, because what holds
   * those airways open in expiration is the elastic tethering of the
   * surrounding parenchyma — and no drug puts destroyed alveolar attachments
   * back. This asymmetry is the reason bronchodilators improve hyperinflation
   * and exercise capacity in COPD more convincingly than they improve flow.
   */
  const resistanceRelief = 1 - 0.28 * dilation;
  const ceilingRelief = 1 - 0.1 * dilation;

  const compliance = REFERENCE.compliance / Math.max(0.2, elasticRecoil);
  const lungCompliance = REFERENCE.lungCompliance / Math.max(0.2, elasticRecoil);
  const extraCompliance = Math.max(0, compliance - REFERENCE.compliance);
  const residualVolumeL = REFERENCE.residualVolume + CLOSING_VOLUME_GAIN * extraCompliance;
  const totalLungCapacityL = REFERENCE.totalLungCapacity + CAPACITY_GAIN * extraCompliance;
  const relaxedVolumeL = residualVolumeL + compliance * REFERENCE.chestWallRecoil;

  const recoil = Math.max(0.2, elasticRecoil);
  const resistance = REFERENCE.expiratoryResistance * airwayResistance * resistanceRelief;
  const upstream =
    REFERENCE.upstreamResistance *
    airwayResistance ** CEILING_SHARE_OF_RESISTANCE *
    ceilingRelief *
    recoil ** -TETHERING_EXPONENT;

  // In parallel: the units' compliances add and their conductances add, so
  // each unit carries 1/N of the compliance and N times the resistance — and
  // a uniform lung then has exactly the τ of the whole. Adding heterogeneity
  // must not change that, which is why `scatter` holds its mean at 1.
  const resistanceScatter = scatter({ count: UNIT_COUNT, spread: UNIT_SPREAD, seed: RESISTANCE_SEED });
  const complianceScatter = scatter({ count: UNIT_COUNT, spread: UNIT_SPREAD * 0.6, seed: COMPLIANCE_SEED });

  const units = resistanceScatter.map((rFactor, i) => {
    const unitCompliance = (compliance / UNIT_COUNT) * complianceScatter[i];
    const unitResistance = resistance * UNIT_COUNT * rFactor;
    return {
      index: i,
      resistance: unitResistance,
      lungCompliance: (lungCompliance / UNIT_COUNT) * complianceScatter[i],
      // A region with narrow airways has narrow airways in both segments.
      upstreamResistance: upstream * UNIT_COUNT * rFactor,
      compliance: unitCompliance,
      timeConstantS: unitResistance * unitCompliance,
      /**
       * How far below relaxation volume this unit may go, L. Negative: the
       * floor is residual volume, which is below where the relaxed lung sits.
       */
      floorVolumeL: (residualVolumeL - relaxedVolumeL) / UNIT_COUNT,
      ceilingVolumeL: (totalLungCapacityL - relaxedVolumeL) / UNIT_COUNT,
    };
  });

  const timeConstants = units.map((unit) => unit.timeConstantS);

  return {
    compliance,
    lungCompliance,
    resistance,
    upstreamResistance: upstream,
    residualVolumeL,
    totalLungCapacityL,
    relaxedVolumeL,
    /** The whole lung's time constant — the mean of the units', by construction. */
    timeConstantS: resistance * compliance,
    fastestTimeConstantS: Math.min(...timeConstants),
    slowestTimeConstantS: Math.max(...timeConstants),
    units,
  };
}

/**
 * The maximal expiratory flow the lung can produce at each volume.
 *
 * This is the envelope a flow-volume loop is read against, and it is the
 * clearest single statement the model makes: at every volume there is a flow
 * that cannot be exceeded, it is set by elastic recoil and by the resistance
 * of the collapsible segment, and **effort appears nowhere in it**.
 *
 * @param {ReturnType<typeof lungMechanics>} mechanics
 * @param {number} [samples]
 * @returns {{ volumeL: number, flowLPerS: number }[]} from TLC down to RV
 */
export function maximalFlowVolume(mechanics, samples = 48) {
  const points = [];
  for (let i = 0; i <= samples; i++) {
    const volumeL =
      mechanics.totalLungCapacityL -
      ((mechanics.totalLungCapacityL - mechanics.residualVolumeL) * i) / samples;
    // Lung recoil, not system recoil: see `REFERENCE.lungCompliance`. It is
    // zero at residual volume — where, by definition, nothing more comes out.
    const recoil = (volumeL - mechanics.residualVolumeL) / mechanics.lungCompliance;
    points.push({ volumeL, flowLPerS: Math.max(0, recoil / mechanics.upstreamResistance) });
  }
  return points;
}

/** Where the controls sit when nothing has been moved: a moderately obstructed lung. */
export const DEFAULT_CONTROLS = {
  airwayResistance: 3,
  elasticRecoil: 0.6,
  bronchodilation: 0,
  /**
   * A multiplier on the expiratory muscle pressure the drive implies. It is
   * here so that "try harder" can be *done* rather than described: in a lung
   * that is not flow-limited, turning it up moves gas; in one that is, it
   * moves nothing at all, and that difference is the single most useful thing
   * this model has to say.
   */
  expiratoryEffort: 1,
  demand: 0,
};

/**
 * The simulator: a set of parallel lung units breathing on a fixed timestep.
 *
 * @param {{ controls?: object, hz?: number }} [options]
 */
export function createRespiratoryModel({ controls = {}, hz = 400 } = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const stepper = createStepper({ hz, maxCatchUp: 0.3 });

  let mechanics = lungMechanics(settings);
  let pattern = breathingPattern(settings.demand);
  /**
   * Inspiratory muscle pressure, cmH₂O. **State, not a setting.** The drive
   * rises breath by breath until the ventilation it produces meets what demand
   * is asking for, and stops rising at the ceiling — so an obstructed lung
   * that cannot meet the demand is visibly pulling as hard as it can and still
   * falling short, rather than quietly under-ventilating.
   */
  let drivePressure = 6;
  /** Volume of each unit above the lung's relaxation volume, L. */
  let volumes = new Array(UNIT_COUNT).fill(0);
  /** Where in the breath cycle we are, seconds since the start of inspiration. */
  let cycleTimeS = 0;
  /** Instantaneous flow out of each unit, L/s, positive inwards. */
  let flows = new Array(UNIT_COUNT).fill(0);

  // Measured over the breath just finished, so the read-out is a breath rather
  // than an instant. Seeded with the first solved breath at construction.
  let breath = emptyBreath();
  let inProgress = emptyBreath();
  /** One breath of (volume, flow), rebuilt as it is traced. */
  let trace = [];
  let traceInProgress = [];

  function emptyBreath() {
    return {
      endExpiratoryVolumeL: 0,
      endInspiratoryVolumeL: 0,
      tidalVolumeL: 0,
      peakExpiratoryFlowLPerS: 0,
      /**
       * Measured as volume rather than as time. Near the end of expiration the
       * recoil is nearly gone, so the ceiling is nearly zero and *any* effort
       * meets it — true, but almost no gas moves there, and counting seconds
       * made a normal lung look flow-limited for three quarters of every
       * breath. What matters is how much of the breath came out against the
       * ceiling.
       */
      limitedVolumeL: 0,
      expiredVolumeL: 0,
    };
  }

  /** Total lung volume right now, L. */
  const totalVolumeL = () => mechanics.relaxedVolumeL + volumes.reduce((sum, v) => sum + v, 0);

  /**
   * Muscle pressure at a point in the cycle, cmH₂O. Positive inflates.
   *
   * Inspiration is a half-sine, which is the usual first approximation to what
   * the inspiratory muscles do. Expiration at rest is nothing at all — quiet
   * expiration is the lung giving back what it stored — and under load it is a
   * pressure that rises through expiration as the abdominal muscles come in.
   */
  function musclePressure(t) {
    const { inspiratoryTimeS, expiratoryTimeS } = pattern;
    if (t < inspiratoryTimeS) {
      return drivePressure * Math.sin((Math.PI * t) / inspiratoryTimeS);
    }
    const into = (t - inspiratoryTimeS) / expiratoryTimeS;
    return -expiratoryDrive(drivePressure) * settings.expiratoryEffort * Math.sin(Math.PI * Math.min(1, into));
  }

  function step(h) {
    const pressure = musclePressure(cycleTimeS);
    let outflow = 0;
    let limitedOutflow = 0;

    for (let i = 0; i < UNIT_COUNT; i++) {
      const unit = mechanics.units[i];
      // Elastic recoil stored in this unit, cmH₂O. Above relaxation volume it
      // pushes gas out; below it (which effort can reach) it pulls gas in.
      const recoil = volumes[i] / unit.compliance;
      let flow = (pressure - recoil) / unit.resistance;

      if (flow < 0) {
        // Expiring. The ceiling is what this unit's own *lung* recoil can
        // drive through its collapsible segment. There is no `pressure` in it:
        // that is the whole content of "expiratory flow limitation".
        const lungRecoil = (volumes[i] - unit.floorVolumeL) / unit.lungCompliance;
        const ceiling = Math.max(0, lungRecoil / unit.upstreamResistance);
        if (-flow > ceiling) {
          flow = -ceiling;
          limitedOutflow += ceiling;
        }
        outflow -= flow;
      }

      let next = volumes[i] + flow * h;
      if (next < unit.floorVolumeL) next = unit.floorVolumeL;
      else if (next > unit.ceilingVolumeL) next = unit.ceilingVolumeL;
      flows[i] = (next - volumes[i]) / h;
      volumes[i] = next;
    }

    const expiring = cycleTimeS >= pattern.inspiratoryTimeS;
    if (expiring) {
      inProgress.expiredVolumeL += outflow * h;
      inProgress.limitedVolumeL += limitedOutflow * h;
      inProgress.peakExpiratoryFlowLPerS = Math.max(inProgress.peakExpiratoryFlowLPerS, outflow);
    } else {
      inProgress.endInspiratoryVolumeL = Math.max(inProgress.endInspiratoryVolumeL, totalVolumeL());
    }

    // Sampled sparsely: a loop needs a shape, not four hundred points a second.
    if (traceInProgress.length === 0 || cycleTimeS - traceInProgress[traceInProgress.length - 1].t >= 0.01) {
      traceInProgress.push({
        t: cycleTimeS,
        volumeL: totalVolumeL(),
        flowLPerS: flows.reduce((sum, f) => sum + f, 0),
      });
    }

    cycleTimeS += h;
    if (cycleTimeS >= pattern.periodS) {
      cycleTimeS -= pattern.periodS;
      inProgress.endExpiratoryVolumeL = totalVolumeL();
      inProgress.tidalVolumeL = inProgress.endInspiratoryVolumeL - inProgress.endExpiratoryVolumeL;
      breath = inProgress;
      // One drive adjustment per breath, because ventilation is only defined
      // over a breath. Gently: the chemoreflexes take many breaths to settle,
      // and a controller that corrected in one would hide the climb this scene
      // is about.
      const achieved = breath.tidalVolumeL * pattern.ratePerMin;
      const error = pattern.targetVentilationLPerMin - achieved;
      drivePressure = Math.min(
        MAX_INSPIRATORY_PRESSURE_CMH2O,
        Math.max(2, drivePressure + 0.35 * error)
      );
      inProgress = emptyBreath();
      inProgress.endInspiratoryVolumeL = totalVolumeL();
      trace = traceInProgress;
      traceInProgress = [];
    }
  }

  /**
   * Runs the model until the breath-to-breath volume stops moving.
   *
   * Dynamic hyperinflation is an equilibrium between what goes in and what
   * comes back out, and finding it takes many breaths. Anything asking this
   * model a question — a test, a read-out, a chart — wants the settled answer,
   * not the third breath after a slider moved.
   *
   * @param {{ maxBreaths?: number, toleranceL?: number }} [options]
   */
  function settle({ maxBreaths = 120, toleranceL = 0.001 } = {}) {
    const h = 1 / hz;
    let previousVolume = Infinity;
    let previousDrive = Infinity;
    for (let n = 0; n < maxBreaths; n++) {
      const steps = Math.round(pattern.periodS / h);
      for (let i = 0; i < steps; i++) step(h);
      // Both have to have stopped moving: the volume can look settled for a
      // few breaths while the drive is still climbing towards the ventilation
      // it has been asked for, and the answer then changes underneath.
      const restedAt = breath.endExpiratoryVolumeL;
      if (
        Math.abs(restedAt - previousVolume) < toleranceL &&
        Math.abs(drivePressure - previousDrive) < 0.02
      ) {
        return { breaths: n + 1, settled: true };
      }
      previousVolume = restedAt;
      previousDrive = drivePressure;
    }
    return { breaths: maxBreaths, settled: false };
  }

  function reset() {
    drivePressure = 6;
    volumes = new Array(UNIT_COUNT).fill(0);
    flows = new Array(UNIT_COUNT).fill(0);
    cycleTimeS = 0;
    breath = emptyBreath();
    inProgress = emptyBreath();
    trace = [];
    traceInProgress = [];
    stepper.reset();
    settle();
  }

  reset();

  return {
    /** @param {string} id @param {number} value */
    setControl(id, value) {
      if (!(id in settings)) throw new Error(`copd model: unknown control "${id}"`);
      settings[id] = value;
      mechanics = lungMechanics(settings);
      pattern = breathingPattern(settings.demand);
      // Volumes are kept: a slider moving is a change to the lung, and the
      // lung it changes is the one that was breathing a moment ago. Watching
      // it climb to its new equilibrium over the next several breaths is the
      // subject, not a transient to be skipped.
      cycleTimeS = Math.min(cycleTimeS, pattern.periodS);
    },
    get controls() {
      return { ...settings };
    },
    get mechanics() {
      return mechanics;
    },
    get pattern() {
      return pattern;
    },
    /** Volume of each unit above its own relaxation volume, L. For the 3D. */
    get unitVolumesL() {
      return volumes.slice();
    },
    get cycleTimeS() {
      return cycleTimeS;
    },
    /** Where in the breath we are, 0..1, and whether it is an inspiration. */
    get phase() {
      return {
        fraction: cycleTimeS / pattern.periodS,
        inspiring: cycleTimeS < pattern.inspiratoryTimeS,
      };
    },
    /** The last completed breath, as (volume, flow) samples. */
    get trace() {
      return trace;
    },
    /** Everything a read-out, a chart or a lesson is allowed to quote. */
    get state() {
      const volume = totalVolumeL();
      const endExpiratory = breath.endExpiratoryVolumeL || volume;
      return {
        volumeL: volume,
        endExpiratoryVolumeL: endExpiratory,
        endInspiratoryVolumeL: breath.endInspiratoryVolumeL,
        tidalVolumeL: breath.tidalVolumeL,
        /**
         * Inspiratory capacity: how much is left to breathe in with. The
         * clinical measure of dynamic hyperinflation, because it is what a
         * person can actually do rather than a volume nobody can feel.
         */
        inspiratoryCapacityL: mechanics.totalLungCapacityL - endExpiratory,
        /** How far above the relaxed resting volume the lung is sitting. */
        trappedVolumeL: endExpiratory - mechanics.relaxedVolumeL,
        residualVolumeL: mechanics.residualVolumeL,
        relaxedVolumeL: mechanics.relaxedVolumeL,
        totalLungCapacityL: mechanics.totalLungCapacityL,
        expiratoryTimeS: pattern.expiratoryTimeS,
        timeConstantS: mechanics.timeConstantS,
        /**
         * Expiratory time in time constants. Below about three, a unit has not
         * finished emptying when the next breath starts — which is the whole
         * mechanism in one number.
         */
        timeConstantsAvailable: pattern.expiratoryTimeS / mechanics.timeConstantS,
        ratePerMin: pattern.ratePerMin,
        minuteVentilationLPerMin: breath.tidalVolumeL * pattern.ratePerMin,
        peakExpiratoryFlowLPerS: breath.peakExpiratoryFlowLPerS,
        /** Fraction of the last breath's expired volume that came out at the ceiling. */
        flowLimitedFraction: breath.expiredVolumeL ? breath.limitedVolumeL / breath.expiredVolumeL : 0,
        inspiratoryPressureCmH2O: drivePressure,
        expiratoryPressureCmH2O: expiratoryDrive(drivePressure) * settings.expiratoryEffort,
        targetVentilationLPerMin: pattern.targetVentilationLPerMin,
        /**
         * True when the drive has reached its ceiling and the ventilation
         * asked for is still not being produced. This is the model's statement
         * of ventilatory limitation, and it is an outcome — nothing sets it.
         */
        ventilatoryLimited:
          drivePressure >= MAX_INSPIRATORY_PRESSURE_CMH2O - 0.01 &&
          breath.tidalVolumeL * pattern.ratePerMin < pattern.targetVentilationLPerMin * 0.97,
      };
    },
    /** Advances by real time, on a fixed internal step. */
    advance(dt) {
      return stepper.advance(dt, step);
    },
    settle,
    reset,
  };
}
