# Evidence — pulmonary embolism: dead space and vascular load

This dossier supports the qualitative directions in
`src/models/pulmonaryEmbolism.js`. The scene is not a haemodynamic, imaging or
risk-stratification model.

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| Pulmonary vascular obstruction reduces distal perfusion while ventilation may continue, producing ventilated underperfused lung and a dead-space mechanism. | Goldhaber & Elliott, *Circulation* 2003, [review](https://www.ahajournals.org/doi/10.1161/01.CIR.0000097829.89204.0C); Robertson, *European Respiratory Journal* 2015, [dead-space review](https://publications.ersnet.org/content/erj/45/6/1704) | `ventilation_i = 1`; `perfusionAtFixedPressure_i = 1 − occlusion_i` | Ventilation is deliberately held constant; bronchoconstriction, redistribution and CO2 feedback are omitted | `obstruction leaves distal ventilation present`; `vascular conductance falls...monotonically` |
| Loss of pulmonary vascular cross-sectional area raises pulmonary vascular resistance and therefore RV afterload. | ESC/ERS, [2019 acute pulmonary embolism guideline](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-pulmonary-embolism/) | `relativePVR = 1 / mean(conductance_i)` | Twelve equal parallel paths at fixed model driving pressure; no changing cardiac output, vascular recruitment or RV coupling | `vascular conductance falls and relative resistance rises monotonically` |
| A bounded subset may be completely obstructed while other parallel paths remain open. | Network construction; no clinical calibration claimed | Unit occlusion reaches 1, but the teaching axis caps total involved territory at 0.65 | The cap and obstruction order are illustrative and are not CT clot burden | `the teaching axis is bounded below total-lung obstruction` |
| Clinical severity, haemodynamic status and treatment choice require variables absent here. | ESC/ERS guideline, above | No pressure, RV function, oxygenation, risk score, anticoagulation or reperfusion output exists | The model stops at mechanism and relative load | `the solver emits no clinical pressure, gas or risk score` |

## Quantitative evidence status

**Thin / illustrative.** The sources support direction and mechanism only. They
do not validate twelve equal vessels, a fixed driving pressure, the 65% cap,
the obstruction order, or the magnitude of the displayed relative PVR. The
inverse-conductance output is a model index, not measured PVR.

## Access record

The ESC/ERS guideline page and the linked peer-reviewed reviews were consulted.
No inaccessible full text is represented here as having been read.
