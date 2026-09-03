import { createStepper } from './integrate.js';

/**
 * Where the water goes when the left atrial pressure rises.
 *
 * The question this model exists to answer: **above what pressure does water
 * start to cross into the lung, which space does it fill first, and why does
 * the same pressure flood one lung and not another?**
 *
 * The answer is one equation and three buffers, and the model is built so that
 * all of it is a consequence rather than an assertion. In particular there is
 * **no threshold constant anywhere in this file.** The pressure at which a lung
 * floods is found by the solver, which is the whole point: a threshold that was
 * typed in could not then move when the albumin falls or the lymphatics adapt,
 * and that movement is the thing worth teaching.
 *
 * 1. **The capillary is not the atrium.** Pulmonary capillary hydrostatic
 *    pressure sits a little above left atrial pressure, and the gap grows with
 *    flow, because it is a resistance times a flow. So exercise floods a lung
 *    that was dry at rest without anything about the heart having changed —
 *    and a wedge pressure measured at rest does not tell you what the capillary
 *    saw an hour ago.
 * 2. **Starling decides the direction.** Filtration is
 *    `Kf · [(Pc − Pi) − σ(πc − πi)]`. Normally the hydrostatic difference wins
 *    by a few mmHg, so a healthy lung filters continuously — a small, steady
 *    leak, not a sealed compartment. That is not a defect; it is what feeds the
 *    lymphatics.
 * 3. **Three buffers absorb the first insult, and each one is spent in turn.**
 *    This is the reason a lung tolerates far more pressure than the bare
 *    Starling arithmetic suggests, and the reason the tolerance is not fixed:
 *
 *    - **Lymphatic flow rises.** Baseline clearance runs at the baseline
 *      filtration rate and can climb many times over. Chronically it climbs
 *      much further, which is why a long-standing mitral stenosis can sit at a
 *      pressure that would drown a previously normal lung in an hour.
 *    - **Interstitial pressure rises.** The space starts markedly subatmospheric,
 *      so the first water that arrives has to lift that pressure before it can
 *      do anything else, and lifting it subtracts directly from the driving
 *      gradient.
 *    - **Interstitial protein is washed out.** More water crossing dilutes the
 *      protein already in the interstitium, so πi falls and the oncotic term
 *      that opposes filtration gets *stronger*. The lung defends itself with
 *      the same equation that is flooding it.
 * 4. **The interstitium fills before the alveolus does.** Water collects first
 *    in the loose peribronchovascular connective tissue, where it costs gas
 *    exchange nothing. Only when that space is full does fluid appear in
 *    alveoli — and a flooded alveolus is perfused and not ventilated, which is
 *    the definition of a shunt. That ordering is why breathlessness precedes
 *    hypoxaemia, and why the chest radiograph changes before the saturation
 *    does.
 *
 * ## Cardiogenic and non-cardiogenic are the same equation
 *
 * Nothing here has a mode switch. Raising `leftAtrialPressureMmHg` floods the
 * lung through the hydrostatic term; raising `permeability` floods it through
 * `Kf` and `σ` at a normal pressure. The clinically important consequence falls
 * out on its own: when σ collapses, the oncotic term is multiplied by nearly
 * zero, so plasma protein stops holding water back and giving albumin stops
 * helping. That is a result of the model, not a rule written into it.
 *
 * ## Units
 *
 * Pressure in mmHg, volume in mL, flux in mL/h — the units this physiology is
 * quoted in. `Kf` is therefore mL/h/mmHg. Time is handled in seconds by
 * [`integrate.js`](integrate.js) and converted at the one boundary where the
 * accumulation is applied.
 *
 * ## What this is not
 *
 * An educational conceptual model. Not a patient simulator, not a research
 * solver. It has **no ventilation in it**: there is no tidal volume, no
 * respiratory rate, no work of breathing and no CO₂, so nothing here can say
 * how hard someone is breathing or whether they are tiring. It has no
 * regional gravity dependence, so it cannot draw the basal distribution a
 * radiograph shows. The full boundary is in
 * `docs/model-cards/pulmonary-edema.md`; the sources for the constants are in
 * `docs/model-evidence/pulmonary-edema.md`.
 */

/**
 * The reference lung and the reference plasma. Textbook central values for an
 * adult, not measurements from a person, and the model card says so.
 */
export const REFERENCE = {
  /**
   * Filtration coefficient of the whole pulmonary microvasculature,
   * mL/h/mmHg. Chosen with the pressures below so that the baseline net
   * filtration comes out at the lymph flow the lung is observed to carry;
   * it is a calibration, and §9 of the model card says so.
   */
  filtrationCoefficient: 20,
  /**
   * Reflection coefficient of the pulmonary capillary to protein.
   *
   * High, but not 1: the healthy pulmonary endothelium is more protein-leaky
   * than the systemic one, which is exactly why the lung interstitium carries
   * so much protein and why the oncotic term is worth less here than the raw
   * plasma value suggests.
   */
  reflectionCoefficient: 0.9,
  /** Plasma colloid osmotic pressure, mmHg, at a normal albumin. */
  plasmaOncoticPressureMmHg: 28,
  /**
   * Interstitial colloid osmotic pressure, mmHg, at baseline filtration.
   *
   * High — over half the plasma value — because the lung's interstitium is
   * protein-rich. It is the reason the oncotic term opposing filtration is
   * only about 9 mmHg rather than the 22 a naive reading of the plasma value
   * would give, and therefore the reason a healthy lung filters at all.
   */
  interstitialOncoticPressureMmHg: 12,
  /**
   * Interstitial hydrostatic pressure of a dry lung, mmHg.
   *
   * Markedly subatmospheric. This is a buffer as well as a starting point:
   * water arriving in the interstitium has to lift this pressure towards zero
   * before it can go anywhere else, and every mmHg it lifts comes straight off
   * the driving gradient.
   */
  dryInterstitialPressureMmHg: -8,
  /** Left atrial pressure of a normal resting adult, mmHg. */
  leftAtrialPressureMmHg: 6,
  /** Pulmonary blood flow — the cardiac output — L/min, at rest. */
  pulmonaryFlowLPerMin: 5,
  /** Haemoglobin, g/dL. */
  haemoglobinGDl: 14,
};

/**
 * Pressure lost across the pulmonary venules at the reference flow, mmHg.
 *
 * The capillary lies upstream of this drop, so its hydrostatic pressure is the
 * left atrial pressure plus it. Modelling it as a resistance rather than a
 * fixed offset is what makes flow a lever of its own: a lung that is dry at
 * rest can flood on exertion with the atrium no worse than it was.
 */
export const VENOUS_PRESSURE_DROP_MMHG = 1.4;

/**
 * The interstitial space, as a compliance curve.
 *
 * `kneeVolumeMl` is how much water lifts the interstitial pressure from its dry
 * subatmospheric value to zero. Past that the space is very compliant — it
 * accepts a great deal of water for very little further pressure — which is the
 * behaviour that lets a lung hold a surprising volume before anything reaches
 * an alveolus, and also the behaviour that makes the last part of the buffer
 * almost silent.
 */
export const INTERSTITIUM = {
  kneeVolumeMl: 120,
  /** How far above zero the pressure creeps once the space is full, mmHg. */
  plateauPressureMmHg: 3,
  /** How much water the interstitium holds before alveoli begin to fill, mL. */
  floodThresholdMl: 700,
};

/**
 * Lymphatic clearance.
 *
 * Flow is driven by how full the interstitium is, not by how much is being
 * filtered — the lymphatics cannot know the filtration rate, only the space
 * they drain. It saturates, and the ceiling is the single most important number
 * in this model for explaining why the same pressure is survivable in one
 * patient and lethal in another.
 */
export const LYMPHATICS = {
  /** Clearance at the baseline interstitial volume, mL/h. */
  baselineFlowMlPerHour: 20,
  /** How hard flow responds to a filling interstitium, mL/h per mL. */
  gainPerMl: 1.2,
  /**
   * Ceiling on an unadapted lung, as a multiple of baseline.
   *
   * A previously normal lung can raise lymph flow several-fold within hours.
   * It cannot do more than that quickly, and that limit is what "flash"
   * pulmonary oedema means.
   */
  acuteCapacityMultiple: 4.6,
  /**
   * Ceiling on a lung that has lived at a raised pressure for months, as a
   * multiple of baseline. Lymphatic channels enlarge and recruit; this is why
   * chronic mitral stenosis tolerates a pressure that would drown an
   * unadapted lung, and why the same wedge pressure means two different things.
   */
  chronicCapacityMultiple: 19,
};

/**
 * How alveolar flooding follows a full interstitium.
 *
 * `perMlFlooded` is the fraction of alveoli that fill per mL of water past the
 * interstitial threshold. Flooding is all-or-none in a single alveolus — it is
 * either full of foam or it is not — so the fraction is a count of alveoli,
 * and the fraction of the lung it represents is what the shunt reads.
 */
export const ALVEOLAR = {
  perMlFlooded: 0.00125,
  /**
   * How much of the flow to a flooded region hypoxic pulmonary
   * vasoconstriction diverts away.
   *
   * Real, partial, and the reason a large flooded fraction does not produce
   * quite as large a shunt. It is also the reflex that vasodilators blunt.
   */
  hypoxicDiversion: 0.32,
  /**
   * The shunt a normal lung already has, as a fraction of the cardiac output.
   *
   * Bronchial and Thebesian venous blood reaches the left side without passing
   * a ventilated alveolus. It is small and it is why a healthy person breathing
   * air has an alveolar-to-arterial difference of about 10 mmHg rather than
   * none. Without it this model claimed a normal lung oxygenates perfectly,
   * which would have made every A–a difference it reports too small by that
   * much and the normal case unrecognisable.
   */
  anatomicalShunt: 0.025,
};

/** Blood-gas constants. */
export const BLOOD = {
  /** mL of O₂ carried per gram of fully saturated haemoglobin. */
  oxygenPerGramHaemoglobin: 1.34,
  /** mL of O₂ dissolved per dL of plasma per mmHg. */
  dissolvedPerMmHg: 0.003,
  /** Arteriovenous oxygen content difference, mL/dL, at a normal output. */
  arteriovenousDifferenceMlDl: 4.5,
  /** Barometric pressure less water vapour, mmHg — the dry inspired pressure. */
  dryInspiredPressureMmHg: 713,
  /** Arterial CO₂, mmHg, and the respiratory quotient, for the alveolar gas equation. */
  arterialCarbonDioxideMmHg: 40,
  respiratoryQuotient: 0.8,
};

export const DEFAULT_CONTROLS = {
  /**
   * Left atrial pressure, mmHg. The axis the central question is asked along,
   * and the one a wedge pressure estimates.
   */
  leftAtrialPressureMmHg: REFERENCE.leftAtrialPressureMmHg,
  /**
   * Plasma colloid osmotic pressure, mmHg. Falls with albumin — in liver
   * disease, in nephrotic syndrome, in sepsis, after large volumes of
   * crystalloid.
   */
  plasmaOncoticPressureMmHg: REFERENCE.plasmaOncoticPressureMmHg,
  /**
   * Capillary permeability, as a multiple of normal.
   *
   * 1 is an intact barrier. Above 1 it raises `Kf` and drops `σ` together,
   * because they are two readings of the same injured endothelium — a barrier
   * that leaks more water also stops reflecting protein. Separating them would
   * have allowed a lung that leaks water but still holds protein back, which
   * does not exist.
   */
  permeability: 1,
  /**
   * How adapted the lymphatics are, 0 (a previously normal lung) to 1 (months
   * at a raised pressure). Not a disease severity — an adaptation, and it
   * protects.
   */
  chronicity: 0,
  /** Pulmonary blood flow, L/min. Rest is 5; exertion several times that. */
  pulmonaryFlowLPerMin: REFERENCE.pulmonaryFlowLPerMin,
  /** Inspired oxygen fraction, 0.21 on room air. */
  inspiredOxygenFraction: 0.21,
};

/**
 * Extravascular lung water in a dry lung, mL.
 *
 * Quoted at the scale a clinician measures it at — total extravascular lung
 * water, around 5–7 mL/kg in a healthy adult — rather than at some internal
 * scale of this file's own, so that the number the scene reports is the number
 * a thermodilution monitor would report and can be recognised as too high or
 * too low. Oedema is conventionally called present above about 10 mL/kg, and
 * `INTERSTITIUM.floodThresholdMl` sits there.
 */
export const BASELINE_INTERSTITIAL_VOLUME_ML = 400;

/**
 * The most water this lung can hold, mL.
 *
 * Not a numerical guard: it is the point at which every alveolus is full and
 * there is nowhere further for water to go. A lung that reaches it is reported
 * as `balanced: false`, which is the honest answer — decompensated pulmonary
 * oedema does not settle at some wetter equilibrium, it fills, and that is why
 * it is an emergency rather than a state.
 */
export const MAXIMUM_LUNG_WATER_ML = 1500;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/**
 * Pulmonary capillary hydrostatic pressure, mmHg.
 *
 * The pressure the Starling equation actually sees. It is never the left atrial
 * pressure, and the difference is a flow times a resistance.
 *
 * @param {number} leftAtrialPressureMmHg
 * @param {number} pulmonaryFlowLPerMin
 */
export function capillaryPressure(leftAtrialPressureMmHg, pulmonaryFlowLPerMin) {
  const flowRatio = pulmonaryFlowLPerMin / REFERENCE.pulmonaryFlowLPerMin;
  return leftAtrialPressureMmHg + VENOUS_PRESSURE_DROP_MMHG * flowRatio;
}

/**
 * Interstitial hydrostatic pressure at a given water content, mmHg.
 *
 * Steep from the dry subatmospheric value up to zero, then nearly flat. The
 * flat part is the lung's largest single buffer and also its quietest: a great
 * deal of water arrives during it for almost no change in any pressure that
 * could be measured.
 *
 * @param {number} volumeMl total interstitial water
 */
export function interstitialPressure(volumeMl) {
  const excess = Math.max(0, volumeMl - BASELINE_INTERSTITIAL_VOLUME_ML);
  const dry = REFERENCE.dryInterstitialPressureMmHg;
  const rise = -dry + INTERSTITIUM.plateauPressureMmHg;
  // Saturating rather than linear: the space stiffens as it is emptied and
  // slackens as it fills, so a straight line would make the first millilitre
  // and the hundredth cost the same, which is the opposite of what it does.
  return dry + rise * (1 - Math.exp(-excess / INTERSTITIUM.kneeVolumeMl));
}

/**
 * Interstitial colloid osmotic pressure of a lung filtering at baseline, mmHg.
 *
 * **It tracks the plasma.** Protein crosses the pulmonary capillary freely
 * enough that lowering plasma albumin lowers the interstitial protein with it,
 * and what the Starling equation reads is the *difference*. Holding πi fixed
 * while πc fell — which an earlier version of this file did — said that
 * hypoalbuminaemia on its own floods a lung at a nearly normal filling
 * pressure. It does not, and the reason it does not is exactly this: most of
 * the oncotic gradient survives, because both ends of it fall together.
 *
 * @param {number} plasmaOncoticPressureMmHg
 */
export function baselineInterstitialOncoticPressure(plasmaOncoticPressureMmHg) {
  const ratio = REFERENCE.interstitialOncoticPressureMmHg / REFERENCE.plasmaOncoticPressureMmHg;
  return plasmaOncoticPressureMmHg * ratio;
}

/**
 * The floor protein washout can dilute the interstitium to, mmHg.
 *
 * A floor rather than zero: washout dilutes the interstitium, it does not
 * sluice it clean, and a πi of zero would claim the lung's interstitium can be
 * made protein-free by filtration alone.
 */
export const WASHOUT_FLOOR_MMHG = 6;

/**
 * Interstitial colloid osmotic pressure, mmHg, at a given filtration rate.
 *
 * Protein washout: the lymph leaves at the interstitial protein concentration,
 * so raising the water flux through the space without raising the protein flux
 * dilutes what is there. The oncotic term opposing filtration therefore grows
 * as filtration rises — a negative feedback, and one of the three buffers.
 *
 * @param {number} filtrationMlPerHour
 * @param {number} plasmaOncoticPressureMmHg
 */
export function interstitialOncoticPressure(filtrationMlPerHour, plasmaOncoticPressureMmHg) {
  const baseline = LYMPHATICS.baselineFlowMlPerHour;
  const ratio = baseline / Math.max(baseline, filtrationMlPerHour);
  const dry = baselineInterstitialOncoticPressure(plasmaOncoticPressureMmHg);
  const floor = Math.min(WASHOUT_FLOOR_MMHG, dry);
  return floor + (dry - floor) * ratio;
}

/**
 * The filtration rate that is consistent with the washout it causes, mL/h.
 *
 * πi depends on the flux and the flux depends on πi, so this is a fixed point.
 * It is solved in closed form rather than iterated: substituting the washout
 * law into the Starling equation gives `J = A + B/J`, a quadratic with one
 * positive root. Three passes of naive iteration were tried first and
 * **oscillated** — the feedback is as large as the driving pressure it acts on
 * — which made the solved lung water fall as the atrial pressure rose between
 * 20 and 22 mmHg. Nothing about that was visible in the equations; it showed up
 * as a lung that got better when it should have got worse.
 *
 * @param {{ drivingPressureMmHg: number, filtrationCoefficient: number,
 *           reflectionCoefficient: number, plasmaOncoticPressureMmHg: number }} terms
 *   `drivingPressureMmHg` is the hydrostatic difference Pc − Pi.
 */
export function solveFiltration(terms) {
  const { drivingPressureMmHg, filtrationCoefficient, reflectionCoefficient, plasmaOncoticPressureMmHg } = terms;
  const dry = baselineInterstitialOncoticPressure(plasmaOncoticPressureMmHg);
  const floor = Math.min(WASHOUT_FLOOR_MMHG, dry);
  const base = LYMPHATICS.baselineFlowMlPerHour;

  // Below the baseline flux there is no washout to solve for: πi is still dry.
  const unwashed =
    filtrationCoefficient * (drivingPressureMmHg - reflectionCoefficient * (plasmaOncoticPressureMmHg - dry));
  if (unwashed <= base) return unwashed;

  // J² − A·J − B = 0, with A the flux at full washout and B the part of the
  // opposing oncotic pressure that the washout gives back.
  const a =
    filtrationCoefficient * (drivingPressureMmHg - reflectionCoefficient * (plasmaOncoticPressureMmHg - floor));
  const b = filtrationCoefficient * reflectionCoefficient * (dry - floor) * base;
  return (a + Math.sqrt(a * a + 4 * b)) / 2;
}

/**
 * The barrier, as the two numbers the Starling equation needs.
 *
 * One control moves both, because one injury causes both.
 *
 * @param {number} permeability 1 = intact
 */
export function barrier(permeability) {
  const injury = Math.max(1, permeability);
  return {
    filtrationCoefficient: REFERENCE.filtrationCoefficient * injury,
    // Towards zero as the barrier fails, so that at high permeability the
    // oncotic term is multiplied by almost nothing and plasma protein stops
    // protecting the lung. Nothing switches here; the consequence is the shape
    // of this curve.
    reflectionCoefficient: REFERENCE.reflectionCoefficient / injury,
  };
}

/**
 * Net transvascular filtration, mL/h.
 *
 * The Starling equation, and the only place in this model where water is
 * decided to move.
 *
 * @param {{ capillaryPressureMmHg: number, interstitialPressureMmHg: number,
 *           plasmaOncoticPressureMmHg: number, interstitialOncoticPressureMmHg: number,
 *           filtrationCoefficient: number, reflectionCoefficient: number }} terms
 */
export function starlingFlux(terms) {
  const hydrostatic = terms.capillaryPressureMmHg - terms.interstitialPressureMmHg;
  const oncotic =
    terms.reflectionCoefficient * (terms.plasmaOncoticPressureMmHg - terms.interstitialOncoticPressureMmHg);
  return terms.filtrationCoefficient * (hydrostatic - oncotic);
}

/**
 * Lymphatic clearance, mL/h, at a given interstitial volume.
 *
 * @param {number} volumeMl
 * @param {number} chronicity 0 = unadapted, 1 = months of adaptation
 */
export function lymphaticClearance(volumeMl, chronicity) {
  const adapted = clamp(chronicity, 0, 1);
  const capacity =
    LYMPHATICS.baselineFlowMlPerHour *
    (LYMPHATICS.acuteCapacityMultiple +
      (LYMPHATICS.chronicCapacityMultiple - LYMPHATICS.acuteCapacityMultiple) * adapted);
  const driven =
    LYMPHATICS.baselineFlowMlPerHour +
    LYMPHATICS.gainPerMl * Math.max(0, volumeMl - BASELINE_INTERSTITIAL_VOLUME_ML);
  return Math.min(capacity, driven);
}

/**
 * What fraction of alveoli are flooded at a given interstitial volume.
 *
 * Zero until the interstitium is full. That ordering is a claim of this model
 * and is fixed by a test: water reaches an alveolus only after the space
 * around it has no room left.
 *
 * @param {number} volumeMl
 */
export function floodedFraction(volumeMl) {
  const past = Math.max(0, volumeMl - INTERSTITIUM.floodThresholdMl);
  return clamp(past * ALVEOLAR.perMlFlooded, 0, 1);
}

/**
 * Haemoglobin saturation at a given oxygen tension, 0–1.
 *
 * Severinghaus's dissociation curve. It is here rather than a straight line
 * because the whole reason a shunt resists oxygen lives in its shape: above
 * about 100 mmHg the curve is flat, so the extra tension that a high inspired
 * fraction buys adds almost no bound oxygen, and the only thing that rises is
 * the small dissolved fraction.
 *
 * @param {number} oxygenTensionMmHg
 */
export function oxygenSaturation(oxygenTensionMmHg) {
  const po2 = Math.max(0, oxygenTensionMmHg);
  if (po2 === 0) return 0;
  return 1 / (23400 / (po2 ** 3 + 150 * po2) + 1);
}

/**
 * Oxygen content of blood at a given tension, mL/dL — bound plus dissolved.
 *
 * @param {number} oxygenTensionMmHg
 * @param {number} haemoglobinGDl
 */
export function oxygenContent(oxygenTensionMmHg, haemoglobinGDl) {
  return (
    BLOOD.oxygenPerGramHaemoglobin * haemoglobinGDl * oxygenSaturation(oxygenTensionMmHg) +
    BLOOD.dissolvedPerMmHg * Math.max(0, oxygenTensionMmHg)
  );
}

/**
 * The tension that carries a given content, mmHg — the dissociation curve run
 * backwards.
 *
 * Bisected rather than inverted algebraically: content is strictly increasing
 * in tension, so the bisection is exact to the tolerance and, unlike the
 * published inverse approximations, cannot disagree with the forward curve
 * this same file uses.
 *
 * @param {number} contentMlDl
 * @param {number} haemoglobinGDl
 */
export function oxygenTensionForContent(contentMlDl, haemoglobinGDl) {
  let low = 0;
  let high = BLOOD.dryInspiredPressureMmHg;
  if (contentMlDl <= 0) return 0;
  if (contentMlDl >= oxygenContent(high, haemoglobinGDl)) return high;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (oxygenContent(mid, haemoglobinGDl) < contentMlDl) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Oxygenation, from the flooded fraction.
 *
 * A flooded alveolus is perfused and unventilated, so the flooded fraction is a
 * shunt, less what hypoxic vasoconstriction diverts. Everything below is the
 * standard shunt arithmetic; the model card says what it leaves out, which is
 * most of gas exchange.
 *
 * @param {{ shuntFraction: number, inspiredOxygenFraction: number, haemoglobinGDl?: number }} inputs
 */
export function oxygenation({ shuntFraction, inspiredOxygenFraction, haemoglobinGDl = REFERENCE.haemoglobinGDl }) {
  // Alveolar gas equation. Blood leaving a ventilated alveolus equilibrates
  // with it, so this tension — through the curve above — is what the
  // unshunted fraction of the cardiac output carries.
  const alveolarOxygenMmHg =
    inspiredOxygenFraction * BLOOD.dryInspiredPressureMmHg -
    BLOOD.arterialCarbonDioxideMmHg / BLOOD.respiratoryQuotient;
  const capacity = BLOOD.oxygenPerGramHaemoglobin * haemoglobinGDl;
  const endCapillaryContent = oxygenContent(alveolarOxygenMmHg, haemoglobinGDl);

  // Ca = (1−s)·Cc + s·Cv with Cv = Ca − C(a−v), solved for Ca. Clamped short of
  // 1 because a complete shunt has no arterial content to solve for and the
  // expression diverges rather than describing anything.
  const shunt = clamp(shuntFraction, 0, 0.85);
  const arterialContent = Math.max(
    0,
    endCapillaryContent - (shunt * BLOOD.arteriovenousDifferenceMlDl) / (1 - shunt)
  );
  const arterialOxygenMmHg = oxygenTensionForContent(arterialContent, haemoglobinGDl);

  return {
    alveolarOxygenMmHg,
    endCapillaryOxygenContentMlDl: endCapillaryContent,
    arterialOxygenContentMlDl: arterialContent,
    arterialOxygenMmHg,
    arterialSaturation: oxygenSaturation(arterialOxygenMmHg),
    /**
     * Alveolar-to-arterial oxygen difference, mmHg — the gap a shunt opens and
     * a low inspired fraction does not. It widens dramatically on oxygen while
     * the saturation barely moves, which is the shape of the problem.
     */
    alveolarArterialDifferenceMmHg: Math.max(0, alveolarOxygenMmHg - arterialOxygenMmHg),
    oxygenCapacityMlDl: capacity,
  };
}

/**
 * Everything the model knows, at one interstitial water content.
 *
 * Split out from the integrator so that a steady state and a moment during
 * accumulation are read the same way, and so the scene never has two routes to
 * the same number.
 *
 * @param {number} waterMl
 * @param {object} controls
 */
export function stateAt(waterMl, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const { filtrationCoefficient, reflectionCoefficient } = barrier(settings.permeability);
  const capillaryPressureMmHg = capillaryPressure(
    settings.leftAtrialPressureMmHg,
    settings.pulmonaryFlowLPerMin
  );
  const interstitialPressureMmHg = interstitialPressure(waterMl);
  const clearanceMlPerHour = lymphaticClearance(waterMl, settings.chronicity);

  const filtrationMlPerHour = solveFiltration({
    drivingPressureMmHg: capillaryPressureMmHg - interstitialPressureMmHg,
    filtrationCoefficient,
    reflectionCoefficient,
    plasmaOncoticPressureMmHg: settings.plasmaOncoticPressureMmHg,
  });
  const interstitialOncoticPressureMmHg = interstitialOncoticPressure(
    Math.max(0, filtrationMlPerHour),
    settings.plasmaOncoticPressureMmHg
  );

  const flooded = floodedFraction(waterMl);
  // The flooded regions, less what hypoxic vasoconstriction turns away, on top
  // of the shunt every lung has.
  const shuntFraction =
    ALVEOLAR.anatomicalShunt + flooded * (1 - ALVEOLAR.hypoxicDiversion) * (1 - ALVEOLAR.anatomicalShunt);
  const gas = oxygenation({
    shuntFraction,
    inspiredOxygenFraction: settings.inspiredOxygenFraction,
  });

  return {
    controls: settings,
    capillaryPressureMmHg,
    interstitialPressureMmHg,
    interstitialOncoticPressureMmHg,
    filtrationCoefficient,
    reflectionCoefficient,
    filtrationMlPerHour,
    lymphaticClearanceMlPerHour: clearanceMlPerHour,
    /** Positive means the lung is gaining water. */
    netAccumulationMlPerHour: filtrationMlPerHour - clearanceMlPerHour,
    lungWaterMl: waterMl,
    interstitialWaterMl: Math.min(waterMl, INTERSTITIUM.floodThresholdMl),
    alveolarWaterMl: Math.max(0, waterMl - INTERSTITIUM.floodThresholdMl),
    floodedFraction: flooded,
    shuntFraction,
    ...gas,
  };
}

/**
 * How much water the lung settles at, mL, for a fixed set of controls.
 *
 * Filtration falls as the interstitium fills — the pressure rises and the
 * protein washes out — and clearance rises, so the two meet. Found by
 * bisection because both sides are monotone in water content, which is a
 * property of the equations above rather than an assumption made here.
 *
 * Returns the ceiling when the controls describe a lung that never balances:
 * that is not a failure to converge, it is a lung that keeps filling, and the
 * caller is told so.
 *
 * @param {object} controls
 * @param {{ maxWaterMl?: number }} [options]
 */
export function solveSteadyState(controls = {}, { maxWaterMl = MAXIMUM_LUNG_WATER_ML } = {}) {
  const net = (waterMl) => stateAt(waterMl, controls).netAccumulationMlPerHour;

  if (net(BASELINE_INTERSTITIAL_VOLUME_ML) <= 0) {
    return { ...stateAt(BASELINE_INTERSTITIAL_VOLUME_ML, controls), balanced: true };
  }
  if (net(maxWaterMl) > 0) {
    return { ...stateAt(maxWaterMl, controls), balanced: false };
  }

  let low = BASELINE_INTERSTITIAL_VOLUME_ML;
  let high = maxWaterMl;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (net(mid) > 0) low = mid;
    else high = mid;
  }
  return { ...stateAt((low + high) / 2, controls), balanced: true };
}

/**
 * The lowest left atrial pressure at which this lung ends up with water in its
 * alveoli, mmHg — the answer to the question the scene asks.
 *
 * It is searched for rather than stored, so it moves when the albumin, the
 * lymphatics, the barrier or the cardiac output move. Returns `null` when the
 * lung floods at every pressure in range, which is what a badly injured
 * barrier does.
 *
 * @param {object} controls the controls to hold fixed, less the atrial pressure
 * @param {{ maxPressureMmHg?: number }} [options]
 */
export function floodingThresholdMmHg(controls = {}, { maxPressureMmHg = 60 } = {}) {
  const floods = (leftAtrialPressureMmHg) =>
    solveSteadyState({ ...controls, leftAtrialPressureMmHg }).floodedFraction > 0;

  if (floods(0)) return null;
  if (!floods(maxPressureMmHg)) return null;

  let dry = 0;
  let wet = maxPressureMmHg;
  for (let i = 0; i < 40; i++) {
    const mid = (dry + wet) / 2;
    if (floods(mid)) wet = mid;
    else dry = mid;
  }
  return (dry + wet) / 2;
}

/**
 * The lung as something that fills over time.
 *
 * The steady state above says where it ends up; this says how fast it gets
 * there, and the two are different clinical stories. A lung that will settle
 * with wet alveoli in six hours and one that will do it in twenty minutes have
 * the same steady state.
 *
 * @param {{ controls?: object, hz?: number }} [options]
 */
export function createPulmonaryEdemaModel({ controls = {}, hz = 60 } = {}) {
  let settings = { ...DEFAULT_CONTROLS, ...controls };
  const stepper = createStepper({ hz, maxCatchUp: 0.3 });
  let waterMl = BASELINE_INTERSTITIAL_VOLUME_ML;
  let state = stateAt(waterMl, settings);

  /**
   * How many minutes of physiology pass per second of wall clock.
   *
   * **A presentation value with a presentation name**, and the only one in this
   * file. Lung water moves over tens of minutes to hours; a scene running at
   * real time would be a still picture. It scales the clock, never a pressure
   * or a flux, so every number the model reports is the number that belongs to
   * the physiological time that has passed.
   */
  const minutesPerSecond = 12;

  return {
    get stepSeconds() {
      return stepper.stepSeconds;
    },
    /** @param {object} next */
    setControls(next) {
      settings = { ...settings, ...next };
      state = stateAt(waterMl, settings);
    },
    getControls: () => ({ ...settings }),
    getState: () => state,
    /** Physiological minutes per second of wall clock. Presentation. */
    minutesPerSecond,
    /**
     * Advances by `dt` seconds of wall clock.
     *
     * @param {number} dt
     * @returns {number} steps taken
     */
    advance(dt) {
      const steps = stepper.advance(dt, (h) => {
        const hours = (h * minutesPerSecond) / 60;
        // Held between a dry lung and a full one. Without the ceiling the
        // integrator ran a decompensating lung to sixty litres of water in
        // twelve hours — a number with no meaning, produced because nothing
        // stopped it rather than because anything filled.
        waterMl = clamp(
          waterMl + stateAt(waterMl, settings).netAccumulationMlPerHour * hours,
          BASELINE_INTERSTITIAL_VOLUME_ML,
          MAXIMUM_LUNG_WATER_ML
        );
      });
      if (steps > 0) state = stateAt(waterMl, settings);
      return steps;
    },
    /**
     * Jumps to the equilibrium these controls imply.
     *
     * The scene calls this when a reading is wanted rather than a story:
     * measuring three seconds after a slider moved reports a transient as if it
     * were a result.
     */
    settle() {
      const solved = solveSteadyState(settings);
      waterMl = solved.lungWaterMl;
      state = stateAt(waterMl, settings);
      return state;
    },
    reset() {
      waterMl = BASELINE_INTERSTITIAL_VOLUME_ML;
      state = stateAt(waterMl, settings);
    },
  };
}

/**
 * The situations this one model covers.
 *
 * They are **settings of the same equations**, not separate models, which is
 * the point worth making: cardiogenic and non-cardiogenic oedema are told apart
 * here by which term is abnormal, not by which branch of code runs.
 */
export const SITUATIONS = {
  normal: {},
  /** A failing left ventricle, acutely: the atrium is high and nothing has adapted. */
  acuteCardiogenic: { leftAtrialPressureMmHg: 27, chronicity: 0 },
  /** The same pressure in a lung that has lived with it. */
  chronicCardiogenic: { leftAtrialPressureMmHg: 27, chronicity: 1 },
  /** An intact barrier, a normal atrium, and not enough protein to hold water in. */
  hypoalbuminaemic: { plasmaOncoticPressureMmHg: 14 },
  /** A leaking barrier at a normal filling pressure. */
  permeabilityInjury: { permeability: 3.2 },
  /** A lung that is dry at rest and asked for three times the flow. */
  exertion: { leftAtrialPressureMmHg: 20, pulmonaryFlowLPerMin: 15 },
};

export const SITUATION_IDS = Object.keys(SITUATIONS);

/** @param {string} id */
export const situationState = (id) => solveSteadyState(SITUATIONS[id] ?? {});
