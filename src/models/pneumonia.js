import { clamp } from '../utils/math.js';

/** Twelve regional units: six in each lung, matching `buildLungs().regions`. */
export const PNEUMONIA_UNIT_COUNT = 12;

// A deterministic focal-to-multifocal teaching pattern. The order is not a
// claim that pneumonia follows one natural history; it merely keeps adjacent
// lower-lung units together so spatial shunt is visible instead of random.
export const PNEUMONIA_CONSOLIDATION_ORDER = Object.freeze([
  5, 4, 3, 2, 11, 10, 1, 9, 0, 8, 7, 6,
]);

export const DEFAULT_PNEUMONIA_CONTROLS = Object.freeze({
  consolidatedFraction: 0,
  hypoxicVasoconstriction: 0.55,
});

/**
 * Regional ventilation/perfusion teaching model for alveolar consolidation.
 *
 * Consolidation removes ventilation from a unit while perfusion persists.
 * Hypoxic pulmonary vasoconstriction can divert some, but deliberately never
 * all, of that flow. Outputs are dimensionless model indices — this solver does
 * not produce PaO2, SpO2, a radiograph, a pathogen, or a treatment response.
 */
export function solvePneumonia(controls = {}) {
  const consolidatedFraction = clamp(
    controls.consolidatedFraction ?? DEFAULT_PNEUMONIA_CONTROLS.consolidatedFraction
  );
  const hypoxicVasoconstriction = clamp(
    controls.hypoxicVasoconstriction ?? DEFAULT_PNEUMONIA_CONTROLS.hypoxicVasoconstriction
  );
  const rankByUnit = new Map(PNEUMONIA_CONSOLIDATION_ORDER.map((unit, rank) => [unit, rank]));

  const units = Array.from({ length: PNEUMONIA_UNIT_COUNT }, (_, id) => {
    const rank = rankByUnit.get(id);
    const consolidation = clamp(consolidatedFraction * PNEUMONIA_UNIT_COUNT - rank);
    // `consolidation` is the non-aerated share inside this regional unit. Its
    // complementary share is ventilated; the consolidated share itself gets
    // no ventilation and is the portion that can contribute to shunt.
    const ventilation = 1 - consolidation;
    // HPV is represented only as relative diversion. Even at its strongest in
    // this model, a consolidated unit retains perfusion and therefore shunt.
    const perfusionConductance = 1 - 0.72 * hypoxicVasoconstriction * consolidation;
    return { id, consolidation, ventilation, perfusionConductance };
  });

  const conductanceTotal = units.reduce((sum, unit) => sum + unit.perfusionConductance, 0);
  for (const unit of units) unit.perfusion = unit.perfusionConductance / conductanceTotal;

  const ventilationFraction =
    units.reduce((sum, unit) => sum + unit.ventilation, 0) / PNEUMONIA_UNIT_COUNT;
  const shuntFraction = units.reduce(
    (sum, unit) => sum + unit.perfusion * unit.consolidation,
    0
  );
  const consolidatedPerfusionFraction = shuntFraction;
  const exchangeMatchedPerfusionFraction = 1 - shuntFraction;

  return {
    controls: { consolidatedFraction, hypoxicVasoconstriction },
    units,
    consolidatedFraction:
      units.reduce((sum, unit) => sum + unit.consolidation, 0) / PNEUMONIA_UNIT_COUNT,
    ventilationFraction,
    shuntFraction,
    consolidatedPerfusionFraction,
    exchangeMatchedPerfusionFraction,
  };
}
