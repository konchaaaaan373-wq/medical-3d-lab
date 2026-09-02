/**
 * A deliberately small circulation-and-oxygen-delivery model.
 *
 * The one question it answers is: **can MAP look almost unchanged while
 * cardiac output and calculated global oxygen delivery rise?** The reference
 * case is constructed so a high systemic vascular resistance supports MAP 70
 * mmHg despite a low unindexed cardiac output.
 *
 * This is not a dose-response model. It exposes exactly three mutually
 * exclusive states: the baseline, one illustrative fluid-responsive state and
 * one illustrative dobutamine-responsive state. There is no combined arm.
 *
 * Definitions used by the model:
 *
 *   CO   = HR x SV / 1000
 *   MAP  = CVP + CO x SVR / 80
 *   CaO2 = 1.34 x Hb x SaO2 + 0.003 x PaO2
 *   DO2  = CO x 10 x CaO2
 *
 * The factor 80 converts Wood units to dyn*s*cm^-5, and the factor 10 converts
 * litres of blood to decilitres. Claim-by-claim sources, access limits and the
 * boundary between published directions and illustrative calibration are kept
 * in docs/model-evidence/circulation.md.
 */

export const CIRCULATION_INTERVENTIONS = Object.freeze({
  BASELINE: 'baseline',
  FLUID: 'fluid',
  DOBUTAMINE: 'dobutamine',
});

export const BASELINE_CIRCULATION = Object.freeze({
  heartRatePerMin: 96,
  strokeVolumeMl: 38,
  centralVenousPressureMmHg: 6,
  hemoglobinGdl: 10.5,
  arterialOxygenSaturation: 0.97,
  arterialOxygenPressureMmHg: 85,
  targetMeanArterialPressureMmHg: 70,
});

/**
 * The two response sizes are calibrations for a teaching contrast, not doses.
 *
 * Fluid changes preload/SV only. The earlier prototype also lowered SVR in the
 * fluid arm without saying so in the interface; that hidden change created the
 * MAP/CO dissociation it was trying to teach. The fixed fluid state now leaves
 * SVR alone. Dobutamine raises SV while lowering SVR, matching the direction
 * described for the cited low-output heart-failure cohort. HR is left fixed:
 * the cited study reported no HR change over its studied dose range.
 */
export const ILLUSTRATIVE_RESPONSES = Object.freeze({
  [CIRCULATION_INTERVENTIONS.BASELINE]: Object.freeze({
    strokeVolumeMultiplier: 1,
    systemicVascularResistanceMultiplier: 1,
  }),
  [CIRCULATION_INTERVENTIONS.FLUID]: Object.freeze({
    strokeVolumeMultiplier: 1.22,
    systemicVascularResistanceMultiplier: 1,
  }),
  [CIRCULATION_INTERVENTIONS.DOBUTAMINE]: Object.freeze({
    strokeVolumeMultiplier: 1.4,
    systemicVascularResistanceMultiplier: 0.72,
  }),
});

/** Cardiac output in L/min. */
export function cardiacOutput({ heartRatePerMin, strokeVolumeMl }) {
  return (heartRatePerMin * strokeVolumeMl) / 1000;
}

/** Arterial oxygen content in mL O2/dL. */
export function arterialOxygenContent({ hemoglobinGdl, arterialOxygenSaturation, arterialOxygenPressureMmHg }) {
  return 1.34 * hemoglobinGdl * arterialOxygenSaturation + 0.003 * arterialOxygenPressureMmHg;
}

/** Calculated whole-body oxygen delivery in mL O2/min. */
export function oxygenDelivery({ cardiacOutputLMin, arterialOxygenContentMlDl }) {
  return cardiacOutputLMin * 10 * arterialOxygenContentMlDl;
}

const BASELINE_CARDIAC_OUTPUT = cardiacOutput(BASELINE_CIRCULATION);
const BASELINE_SYSTEMIC_RESISTANCE =
  ((BASELINE_CIRCULATION.targetMeanArterialPressureMmHg - BASELINE_CIRCULATION.centralVenousPressureMmHg) * 80) /
  BASELINE_CARDIAC_OUTPUT;

/** @param {unknown} intervention */
function validIntervention(intervention) {
  return Object.values(CIRCULATION_INTERVENTIONS).includes(intervention)
    ? intervention
    : CIRCULATION_INTERVENTIONS.BASELINE;
}

/**
 * Solves one of three mutually exclusive teaching states.
 *
 * @param {{ intervention?: 'baseline'|'fluid'|'dobutamine' }} [options]
 */
export function solveCirculation({ intervention = CIRCULATION_INTERVENTIONS.BASELINE } = {}) {
  const selectedIntervention = validIntervention(intervention);
  const response = ILLUSTRATIVE_RESPONSES[selectedIntervention];
  const heartRatePerMin = BASELINE_CIRCULATION.heartRatePerMin;
  const strokeVolumeMl = BASELINE_CIRCULATION.strokeVolumeMl * response.strokeVolumeMultiplier;
  const systemicVascularResistanceDynSCm5 =
    BASELINE_SYSTEMIC_RESISTANCE * response.systemicVascularResistanceMultiplier;
  const cardiacOutputLMin = cardiacOutput({ heartRatePerMin, strokeVolumeMl });
  const meanArterialPressureMmHg =
    BASELINE_CIRCULATION.centralVenousPressureMmHg +
    (cardiacOutputLMin * systemicVascularResistanceDynSCm5) / 80;
  const arterialOxygenContentMlDl = arterialOxygenContent(BASELINE_CIRCULATION);
  const oxygenDeliveryMlMin = oxygenDelivery({ cardiacOutputLMin, arterialOxygenContentMlDl });

  return {
    intervention: selectedIntervention,
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
