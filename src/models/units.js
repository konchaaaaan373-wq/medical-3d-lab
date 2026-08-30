/**
 * Units used across the medical layer, and the conversions between them.
 *
 * Every quantity in `src/models/` carries its unit in its name. That is not
 * decoration: the same physical quantity is quoted in different units by
 * different specialties — airway pressure in cmH₂O, vascular pressure in mmHg,
 * both of them "pressure" — and a solver that mixes them silently produces
 * plausible, wrong numbers. Naming the unit at every boundary is the cheapest
 * defence there is.
 *
 * Where a scene needs the other unit, it converts here rather than carrying a
 * second copy of the value.
 */

/** 1 cmH₂O in mmHg. */
export const MMHG_PER_CMH2O = 0.735559;

/** 1 mmHg in cmH₂O. */
export const CMH2O_PER_MMHG = 1 / MMHG_PER_CMH2O;

/** 1 cmH₂O in kPa. */
export const KPA_PER_CMH2O = 0.0980665;

/** @param {number} cmH2O */
export const cmH2OToMmHg = (cmH2O) => cmH2O * MMHG_PER_CMH2O;

/** @param {number} mmHg */
export const mmHgToCmH2O = (mmHg) => mmHg * CMH2O_PER_MMHG;

/**
 * The units the respiratory models work in.
 *
 * Volume in litres, flow in L/s, pressure in cmH₂O — the combination
 * respiratory physiology is written in, so resistance is cmH₂O·s/L and
 * compliance is L/cmH₂O, and their product is a time in seconds with no
 * conversion factor hiding in it. That τ = R·C falls out in seconds without a
 * fudge is the check that the units are right.
 */
export const RESPIRATORY_UNITS = {
  volume: 'L',
  flow: 'L/s',
  pressure: 'cmH2O',
  resistance: 'cmH2O·s/L',
  compliance: 'L/cmH2O',
  time: 's',
};

/**
 * The units the vascular models work in.
 *
 * Pressure in mmHg and flow in mL/s, so resistance is mmHg·s/mL. Hepatic and
 * portal flows are quoted clinically in mL/min; the models hold mL/s and
 * convert at the edge, because ΔP = Q·R with a per-minute flow silently
 * changes what R means.
 */
export const VASCULAR_UNITS = {
  pressure: 'mmHg',
  flow: 'mL/s',
  resistance: 'mmHg·s/mL',
  volume: 'mL',
};

/** @param {number} perMinute */
export const perMinuteToPerSecond = (perMinute) => perMinute / 60;

/** @param {number} perSecond */
export const perSecondToPerMinute = (perSecond) => perSecond * 60;
