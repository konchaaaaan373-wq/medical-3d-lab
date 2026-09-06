import { clampFinite } from '../utils/math.js';

/** Twelve regional units: six in each lung, matching `buildLungs().regions`. */
export const PNEUMONIA_UNIT_COUNT = 12;

/**
 * How far the public teaching axis is allowed to consolidate this lung.
 *
 * The solver's domain is the whole interval `0–1`, and `1` is kept because a
 * fully consolidated lung is the boundary that proves ventilation reaches zero
 * while perfusion does not. It is not a state a reader should be walked into
 * as "more pneumonia": a lung with no aerated share is not a pneumonia stage,
 * and the scene's slider stops here instead. The public scene maps its
 * progression `0–1` onto `consolidatedFraction = progress × this`.
 */
export const PNEUMONIA_TEACHING_MAX_CONSOLIDATION = 0.6;

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
  // The domain is 0–1 for both inputs. Anything that is not a finite number
  // (NaN, undefined, a string that does not parse) takes the default, and
  // ±Infinity lands on the nearer bound rather than propagating into every sum.
  const consolidatedFraction = clampFinite(
    controls.consolidatedFraction,
    DEFAULT_PNEUMONIA_CONTROLS.consolidatedFraction
  );
  const hypoxicVasoconstriction = clampFinite(
    controls.hypoxicVasoconstriction,
    DEFAULT_PNEUMONIA_CONTROLS.hypoxicVasoconstriction
  );
  const rankByUnit = new Map(PNEUMONIA_CONSOLIDATION_ORDER.map((unit, rank) => [unit, rank]));

  const units = Array.from({ length: PNEUMONIA_UNIT_COUNT }, (_, id) => {
    const rank = rankByUnit.get(id);
    const consolidation = clampFinite(consolidatedFraction * PNEUMONIA_UNIT_COUNT - rank, 0);
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
