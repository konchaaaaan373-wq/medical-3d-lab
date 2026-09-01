/**
 * A deliberately small circulation-and-oxygen-delivery model.
 *
 * The one question it answers is: **can MAP look acceptable while systemic
 * oxygen delivery is still low?** The reference case is constructed to do
 * exactly that: low cardiac output is partly masked by high systemic vascular
 * resistance, so MAP rounds to 70 mmHg.
 *
 * This is not a treatment-response predictor. The fluid arm explicitly assumes
 * preload responsiveness, and the sizes of both intervention effects are
 * illustrative saturating functions. They exist so the learner can feel the
 * direction of the chain without being offered a fake dosing calculator.
 *
 * Definitions used by the model:
 *
 *   CO   = HR × SV / 1000
 *   MAP  = CVP + CO × SVR / 80
 *   CaO2 = 1.34 × Hb × SaO2 + 0.003 × PaO2
 *   DO2  = CO × 10 × CaO2
 *
 * The factor 80 converts Wood units to dyn·s·cm⁻⁵, and the factor 10 converts
 * litres of blood to decilitres. Claim-by-claim sources, access limits and the
 * boundary between published directions and illustrative calibration are kept
 * in docs/model-evidence/circulation.md. In particular, the DOB step is not a
 * dose and the fluid arm is an explicit responsive-case assumption.
 */

export const MAX_INTERVENTION_STEPS = 3;

export const BASELINE_CIRCULATION = Object.freeze({
  heartRatePerMin: 96,
  strokeVolumeMl: 38,
  centralVenousPressureMmHg: 6,
  hemoglobinGdl: 10.5,
  arterialOxygenSaturation: 0.97,
  arterialOxygenPressureMmHg: 85,
  targetMeanArterialPressureMmHg: 70,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** @param {number} steps */
const saturatingResponse = (steps, rate) => 1 - Math.exp(-rate * clamp(steps, 0, MAX_INTERVENTION_STEPS));

/** Cardiac output in L/min. */
export function cardiacOutput({ heartRatePerMin, strokeVolumeMl }) {
  return (heartRatePerMin * strokeVolumeMl) / 1000;
}

/** Arterial oxygen content in mL O2/dL. */
export function arterialOxygenContent({ hemoglobinGdl, arterialOxygenSaturation, arterialOxygenPressureMmHg }) {
  return 1.34 * hemoglobinGdl * arterialOxygenSaturation + 0.003 * arterialOxygenPressureMmHg;
}

/** Whole-body oxygen delivery in mL O2/min. */
export function oxygenDelivery({ cardiacOutputLMin, arterialOxygenContentMlDl }) {
  return cardiacOutputLMin * 10 * arterialOxygenContentMlDl;
}

const BASELINE_CARDIAC_OUTPUT = cardiacOutput(BASELINE_CIRCULATION);
const BASELINE_SYSTEMIC_RESISTANCE =
  ((BASELINE_CIRCULATION.targetMeanArterialPressureMmHg - BASELINE_CIRCULATION.centralVenousPressureMmHg) * 80) /
  BASELINE_CARDIAC_OUTPUT;

/**
 * Solves the single teaching case after zero to three steps of either action.
 * Continuous values are accepted so session restoration and future UI variants
 * remain well behaved, although the tactile UI advances in whole steps.
 *
 * @param {{ fluidSteps?: number, dobutamineSteps?: number }} [interventions]
 */
export function solveCirculation({ fluidSteps = 0, dobutamineSteps = 0 } = {}) {
  const fluid = clamp(fluidSteps, 0, MAX_INTERVENTION_STEPS);
  const dobutamine = clamp(dobutamineSteps, 0, MAX_INTERVENTION_STEPS);
  const fluidResponse = saturatingResponse(fluid, 0.65);
  const dobutamineResponse = saturatingResponse(dobutamine, 0.55);

  // The case is preload responsive. Fluid raises SV with diminishing returns.
  // Dobutamine raises contractile output and heart rate modestly. The sizes are
  // illustrative calibration values; the model claims directions, not doses.
  const strokeVolumeMl =
    BASELINE_CIRCULATION.strokeVolumeMl * (1 + 0.33 * fluidResponse + 0.46 * dobutamineResponse);
  const heartRatePerMin = BASELINE_CIRCULATION.heartRatePerMin * (1 + 0.05 * dobutamineResponse);

  // Flow-mediated/autonomic compensation is collapsed into a resistance term.
  // In particular dobutamine lowers SVR in this case, so CO and DO2 can improve
  // much more than MAP — the teaching point the interaction is built around.
  const systemicVascularResistanceDynSCm5 =
    BASELINE_SYSTEMIC_RESISTANCE * (1 - 0.18 * fluidResponse) * (1 - 0.35 * dobutamineResponse);

  const cardiacOutputLMin = cardiacOutput({ heartRatePerMin, strokeVolumeMl });
  const meanArterialPressureMmHg =
    BASELINE_CIRCULATION.centralVenousPressureMmHg +
    (cardiacOutputLMin * systemicVascularResistanceDynSCm5) / 80;
  const arterialOxygenContentMlDl = arterialOxygenContent(BASELINE_CIRCULATION);
  const oxygenDeliveryMlMin = oxygenDelivery({ cardiacOutputLMin, arterialOxygenContentMlDl });

  return {
    fluidSteps: fluid,
    dobutamineSteps: dobutamine,
    heartRatePerMin,
    strokeVolumeMl,
    cardiacOutputLMin,
    centralVenousPressureMmHg: BASELINE_CIRCULATION.centralVenousPressureMmHg,
    systemicVascularResistanceDynSCm5,
    meanArterialPressureMmHg,
    hemoglobinGdl: BASELINE_CIRCULATION.hemoglobinGdl,
    arterialOxygenSaturation: BASELINE_CIRCULATION.arterialOxygenSaturation,
    arterialOxygenContentMlDl,
    oxygenDeliveryMlMin,
  };
}
