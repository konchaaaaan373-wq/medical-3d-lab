import { clamp } from '../utils/math.js';

export const PE_UNIT_COUNT = 12;
export const MAX_MODELLED_OBSTRUCTED_TERRITORY = 0.65;

// Starts centrally on the right, then involves further bilateral territories.
// It is a stable visual ordering, not a claim about embolus frequency by lobe.
export const PE_OBSTRUCTION_ORDER = Object.freeze([0, 1, 2, 3, 6, 7, 8, 4, 9, 5, 10, 11]);

/**
 * Parallel pulmonary vascular territories at one fixed driving pressure.
 *
 * Ventilation is held constant while vascular conductance is removed. The
 * reciprocal of summed conductance is a relative PVR/load index, and the
 * ventilation facing lost perfusion is an underperfused-ventilation index.
 * Neither output is a clinical VD/VT, pulmonary pressure, RV function, or risk
 * score; those require measurements and physiology outside this small model.
 */
export function solvePulmonaryEmbolism({ obstruction = 0 } = {}) {
  const progress = clamp(obstruction);
  const obstructedTerritory = progress * MAX_MODELLED_OBSTRUCTED_TERRITORY;
  const rankByUnit = new Map(PE_OBSTRUCTION_ORDER.map((unit, rank) => [unit, rank]));

  const units = Array.from({ length: PE_UNIT_COUNT }, (_, id) => {
    const rank = rankByUnit.get(id);
    const occlusion = clamp(obstructedTerritory * PE_UNIT_COUNT - rank);
    const perfusionAtFixedPressure = 1 - occlusion;
    return {
      id,
      ventilation: 1,
      occlusion,
      perfusionAtFixedPressure,
    };
  });

  const totalConductanceFraction =
    units.reduce((sum, unit) => sum + unit.perfusionAtFixedPressure, 0) / PE_UNIT_COUNT;
  const underperfusedVentilationFraction =
    units.reduce((sum, unit) => sum + unit.ventilation * unit.occlusion, 0) / PE_UNIT_COUNT;
  const relativePulmonaryVascularResistance = 1 / totalConductanceFraction;

  return {
    controls: { obstruction: progress },
    units,
    obstructedTerritory,
    totalConductanceFraction,
    underperfusedVentilationFraction,
    relativePulmonaryVascularResistance,
  };
}
