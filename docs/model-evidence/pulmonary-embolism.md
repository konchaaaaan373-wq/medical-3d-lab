# Evidence — pulmonary embolism: dead space and vascular load

Model: [`src/models/pulmonaryEmbolism.js`](../../src/models/pulmonaryEmbolism.js).
Boundary and failure modes: [`../model-cards/pulmonary-embolism.md`](../model-cards/pulmonary-embolism.md).
Machine-readable registry: `PULMONARY_EMBOLISM_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports the qualitative directions in the model. The scene is
not a haemodynamic, imaging or risk-stratification model. **The sources
support direction and mechanism only.** They do not validate twelve equal
vessels, a fixed driving pressure, the 65% cap, the obstruction order, or the
magnitude of the displayed relative PVR. Where a row rests on a general
account it is marked **thin**.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `dead-space-definition` — ventilation of lung that receives no perfusion is alveolar dead space, the opposite end of V/Q mismatch from shunt | Robertson, *European Respiratory Journal* 2015, [dead-space review](https://publications.ersnet.org/content/erj/45/6/1704); West. Definition, not primary data | `ventilation_i = 1`; `underperfusedVentilationFraction = mean(ventilation_i × occlusion_i)` | Ventilation is held constant in every territory | `physiology: obstructing a pulmonary vessel leaves the ventilation it served in place, which is dead space rather than shunt` |
| `obstruction-spares-ventilation` — vascular obstruction removes distal perfusion while ventilation may continue | Goldhaber & Elliott, *Circulation* 2003, [review](https://www.ahajournals.org/doi/10.1161/01.CIR.0000097829.89204.0C); Robertson 2015, above. **thin** — reflex bronchoconstriction, redistribution and CO₂ feedback are described and omitted | `perfusionAtFixedPressure_i = 1 − occlusion_i` | No bronchoconstriction, no redistribution | `physiology: obstructing a pulmonary vessel leaves the ventilation it served in place, which is dead space rather than shunt` |
| `parallel-conductance-raises-resistance` — removing parallel paths raises total resistance as the reciprocal of the remaining conductance | Resistances in parallel; ESC/ERS, [2019 acute pulmonary embolism guideline](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-pulmonary-embolism/), for loss of cross-sectional area raising PVR and RV afterload | `relativePVR = 1 / mean(conductance_i)` | Twelve equal paths at one fixed driving pressure | `physiology: removing parallel vascular conductance raises resistance, and faster than the share removed` |

## 2. What this repository chose

| Id | Where | What it is not |
| --- | --- | --- |
| `twelve-equal-territories` | `PE_UNIT_COUNT` = 12, one per `buildLungs().regions` site, drawn by `buildVascularTerritory()` | Not a pulmonary arterial tree, not the named segmental arteries, not CT clot burden |
| `obstruction-order` | `PE_OBSTRUCTION_ORDER` | Not which lobes emboli favour; a stable visual ordering |
| `obstruction-cap` | `MAX_MODELLED_OBSTRUCTED_TERRITORY` = 0.65 | Not a survivable clot burden or a severity threshold; where the slider stops. Individual paths may still occlude completely |

## 3. What the model does not have

| Id | Absent | Why it matters |
| --- | --- | --- |
| `fixed-driving-pressure` | A pressure that rises, a cardiac output that falls, recruitment and distension of open territories | The relative PVR shown is the inverse conductance of a fixed-pressure network, not a measured PVR |
| `rv-afterload-not-modelled` | A right ventricle | The scene reads rising relative PVR as rising RV afterload; what the ventricle does with it — dilatation, uncoupling, shock — cannot emerge here |
| `no-haemodynamics` | Pulmonary artery pressure, cardiac output, vasoactive response | Every percentage and the relative PVR are network indices, not pressures, flows or a risk category |
| `no-gas-content` | Carbon dioxide, gas content | The underperfused-ventilation index is not a clinical VD/VT, which is measured from expired against arterial CO₂ |

## 4. How to check it

```bash
npm test                                            # everything
node --test tests/respiratory-physiology.test.js    # the claims in §1
node --test tests/pulmonary-embolism-model.test.js  # reference state, monotonicity, the cap, no clinical outputs, input safety
node --test tests/pulmonary-embolism-scene.test.js  # the scene reads the solve; anchors and territories
```

## 5. Review status

**Not clinically reviewed.** The scene is `alpha`: it has a model layer, this
dossier, a model card and a scope panel, and no clinician has signed it. The
public review state is `pending`.

## Access record

The ESC/ERS guideline page and the linked peer-reviewed reviews were consulted.
No inaccessible full text is represented here as having been read.
