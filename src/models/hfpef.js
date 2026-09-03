/**
 * Heart failure with preserved ejection fraction — pressure-volume teaching model.
 *
 * The single question this model answers is:
 *
 *   **How can left-ventricular filling pressure become high while ejection
 *   fraction remains preserved?**
 *
 * It deliberately isolates one established HFpEF mechanism: an upward/leftward
 * shift of the LV end-diastolic pressure-volume relation as passive chamber
 * stiffness rises. This is not a complete HFpEF model. It contains no atrium,
 * pulmonary circulation, pericardium, arterial-ventricular coupling, coronary
 * reserve, skeletal muscle, chronotropic reserve, obesity/inflammation pathway,
 * kidney, or treatment response.
 *
 * The model is algebraic and deterministic:
 *
 *   ESPVR: Pes = Ees · (ESV - V0)
 *   EDPVR: Ped = A · [exp(B · (V - V0)) - 1]
 *   SV    = EDV - ESV
 *   EF    = SV / EDV
 *   CO    = HR · SV
 *
 * The viewer changes `stiffness` and `filling`. `filling` is an illustrative
 * end-diastolic filling-volume condition, not a fluid dose or a patient blood
 * volume. Exact parameter magnitudes are calibration choices; the external
 * claims are the directions of the pressure-volume relationships.
 */

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value)));
const lerp = (a, b, t) => a + (b - a) * t;

export const HFPEF_REFERENCE = Object.freeze({
  endDiastolicVolumeMl: 120,
  heartRatePerMin: 70,
  endSystolicPressureMmHg: 100,
  endSystolicElastanceMmHgMl: 2.6,
  unstressedVolumeMl: 10,
  edpvrAmmHg: 0.4,
  edpvrBPerMl: 0.0277,
  wallThicknessMm: 9,
});

export const HFPEF_LIMITS = Object.freeze({
  stiffness: Object.freeze({ min: 0, max: 1 }),
  filling: Object.freeze({ min: 0.9, max: 1.1 }),
});

/**
 * Mechanical parameters at one point on the teaching stiffness axis.
 *
 * Contractility and end-systolic pressure are deliberately held fixed. That is
 * the clean experiment: if EDV, ESV, SV and EF are unchanged while LVEDP rises,
 * the pressure rise cannot be smuggled in through systolic failure. Only the
 * passive EDPVR curvature changes. Wall thickness is carried for the 3D drawing
 * as a structural cue and does not enter the pressure equation.
 */
export function hfpefParameters(stiffness = 0) {
  const s = clamp(stiffness);
  return Object.freeze({
    stiffness: s,
    endSystolicElastanceMmHgMl: HFPEF_REFERENCE.endSystolicElastanceMmHgMl,
    unstressedVolumeMl: HFPEF_REFERENCE.unstressedVolumeMl,
    edpvrAmmHg: HFPEF_REFERENCE.edpvrAmmHg,
    edpvrBPerMl: lerp(HFPEF_REFERENCE.edpvrBPerMl, 0.0355, s),
    wallThicknessMm: lerp(HFPEF_REFERENCE.wallThicknessMm, 13, s),
    heartRatePerMin: HFPEF_REFERENCE.heartRatePerMin,
    endSystolicPressureMmHg: HFPEF_REFERENCE.endSystolicPressureMmHg,
  });
}

/** Passive LV pressure at a specified chamber volume. */
export function diastolicPressureAtVolume(volumeMl, stiffness = 0) {
  const p = hfpefParameters(stiffness);
  const stretchedMl = Math.max(0, Number(volumeMl) - p.unstressedVolumeMl);
  return p.edpvrAmmHg * (Math.exp(p.edpvrBPerMl * stretchedMl) - 1);
}

/** End-systolic volume where the fixed end-systolic pressure meets the ESPVR. */
export function endSystolicVolume(stiffness = 0) {
  const p = hfpefParameters(stiffness);
  return p.unstressedVolumeMl + p.endSystolicPressureMmHg / p.endSystolicElastanceMmHgMl;
}

/**
 * Solve one pressure-volume state.
 *
 * @param {{ stiffness?: number, filling?: number }} [inputs]
 */
export function solveHfpef({ stiffness = 0, filling = 1 } = {}) {
  const s = clamp(stiffness);
  const f = clamp(filling, HFPEF_LIMITS.filling.min, HFPEF_LIMITS.filling.max);
  const parameters = hfpefParameters(s);

  // Filling is deliberately a chamber-volume condition, not a fluid dose. This
  // lets the viewer ask the pressure-volume question directly: "what pressure
  // does the same filling require after the chamber gets stiffer?"
  const endDiastolicVolumeMl = HFPEF_REFERENCE.endDiastolicVolumeMl * f;
  const endSystolicVolumeMl = endSystolicVolume(s);
  const strokeVolumeMl = endDiastolicVolumeMl - endSystolicVolumeMl;
  if (!(strokeVolumeMl > 0)) throw new RangeError('HFpEF calibration produced a non-positive stroke volume');

  const ejectionFraction = strokeVolumeMl / endDiastolicVolumeMl;
  const endDiastolicPressureMmHg = diastolicPressureAtVolume(endDiastolicVolumeMl, s);
  const cardiacOutputLMin = (strokeVolumeMl * parameters.heartRatePerMin) / 1000;

  return Object.freeze({
    stiffness: s,
    filling: f,
    endDiastolicVolumeMl,
    endSystolicVolumeMl,
    strokeVolumeMl,
    ejectionFraction,
    cardiacOutputLMin,
    endDiastolicPressureMmHg,
    wallThicknessMm: parameters.wallThicknessMm,
    endSystolicElastanceMmHgMl: parameters.endSystolicElastanceMmHgMl,
    edpvrBPerMl: parameters.edpvrBPerMl,
    heartRatePerMin: parameters.heartRatePerMin,
    endSystolicPressureMmHg: parameters.endSystolicPressureMmHg,
  });
}

/**
 * Pressure-volume curves and a schematic loop generated from the same state.
 *
 * The EDPVR and ESPVR are the model equations. The path between the four loop
 * corners is a teaching interpolation — there is no valve timing or distributed
 * circulation here — and the model card says so explicitly.
 */
export function hfpefPressureVolume(stiffness = 0, filling = 1) {
  const state = solveHfpef({ stiffness, filling });
  const parameters = hfpefParameters(stiffness);
  const minVolume = parameters.unstressedVolumeMl;
  const maxVolume = Math.max(150, state.endDiastolicVolumeMl * 1.12);
  const samples = 64;
  const endDiastolic = [];
  const endSystolic = [];

  for (let i = 0; i <= samples; i++) {
    const volume = minVolume + ((maxVolume - minVolume) * i) / samples;
    endDiastolic.push({ volume, pressure: diastolicPressureAtVolume(volume, stiffness) });
    endSystolic.push({
      volume,
      pressure: Math.max(0, parameters.endSystolicElastanceMmHgMl * (volume - parameters.unstressedVolumeMl)),
    });
  }

  const loop = [];
  const segment = (count, fromV, toV, pressureAt, phaseFrom, phaseTo) => {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 1 : i / (count - 1);
      const volume = lerp(fromV, toV, t);
      loop.push({ phase: lerp(phaseFrom, phaseTo, t), volume, pressure: pressureAt(t, volume) });
    }
  };

  const esPassive = diastolicPressureAtVolume(state.endSystolicVolumeMl, stiffness);
  const edPressure = state.endDiastolicPressureMmHg;
  const peakPressure = Math.max(118, state.endSystolicPressureMmHg + 18);

  // Filling along the real EDPVR.
  segment(24, state.endSystolicVolumeMl, state.endDiastolicVolumeMl,
    (_t, volume) => diastolicPressureAtVolume(volume, stiffness), 0, 0.42);
  // Isovolumic contraction.
  segment(10, state.endDiastolicVolumeMl, state.endDiastolicVolumeMl,
    (t) => lerp(edPressure, peakPressure, t), 0.42, 0.53);
  // Ejection. The arch is illustrative; the end-systolic corner is on ESPVR.
  segment(24, state.endDiastolicVolumeMl, state.endSystolicVolumeMl,
    (t) => lerp(peakPressure, state.endSystolicPressureMmHg, t) + 4 * Math.sin(Math.PI * t), 0.53, 0.82);
  // Isovolumic relaxation.
  segment(10, state.endSystolicVolumeMl, state.endSystolicVolumeMl,
    (t) => lerp(state.endSystolicPressureMmHg, esPassive, t), 0.82, 1);

  return Object.freeze({
    loop,
    endDiastolic,
    endSystolic,
    markers: {
      endDiastole: { volume: state.endDiastolicVolumeMl, pressure: state.endDiastolicPressureMmHg },
      endSystole: { volume: state.endSystolicVolumeMl, pressure: state.endSystolicPressureMmHg },
    },
    contractilityEes: parameters.endSystolicElastanceMmHgMl,
    unstressedVolumeMl: parameters.unstressedVolumeMl,
  });
}
