# Evidence — pneumonia: consolidation and shunt

This dossier supports only the qualitative textbook mechanism represented by
`src/models/pneumonia.js`. It does not validate a patient simulator or a
quantitative oxygenation model.

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| Perfusion of a non-ventilated lung fraction is an intrapulmonary-shunt mechanism; ventilation of an underperfused fraction is dead space. | Slobod et al., *Annals of Intensive Care* 2022, [open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9855693/) | `shuntFraction = Σ(perfusion_i × consolidation_i)`; consolidated subfractions receive no ventilation | Each regional unit is treated as an aerated and a consolidated subfraction with uniform perfusion within it | `pneumonia: consolidated units remain perfused, which is the shunt mechanism`; `a fully consolidated share has no ventilation` |
| Increasing alveolar consolidation removes regional ventilation while perfusion may persist. | Slobod et al. 2022, above | `ventilation_i = 1 − consolidation_i`; conductance remains positive | Compliance, airway closure, collateral ventilation and respiratory drive are omitted | `more consolidation monotonically removes ventilation and raises shunt` |
| Hypoxic pulmonary vasoconstriction can divert flow away from poorly ventilated lung but is not represented here as complete protection. | Slobod et al. 2022, above | `conductance_i = 1 − 0.72 × HPV × consolidation_i` | The gain `0.72` and the single whole-lung HPV control are illustrative, not fitted | `HPV diverts some flow without abolishing shunt` |
| Diagnosis and treatment of community-acquired pneumonia require clinical findings outside this model. | ATS/IDSA, [adult CAP guideline](https://www.idsociety.org/practice-guideline/community-acquired-pneumonia-cap-in-adults/) | No pathogen, diagnostic classifier, antimicrobial or respiratory-support output exists | The scene stops at one gas-exchange mechanism | Catalogue/model-scope checks and the explicit output set |

## Quantitative evidence status

**Thin / illustrative.** No source above supports twelve equal units, their
ordering, the HPV gain, or any displayed percentage as a clinical value. Those
choices make the direction and spatial mismatch inspectable. The model does not
calculate PaO2, SpO2, a radiographic score or treatment response.

## Access record

The V/Q review was read as open full text. The ATS/IDSA source was read on the
official guideline page and is used only to set the clinical boundary, not to
calibrate the model.
