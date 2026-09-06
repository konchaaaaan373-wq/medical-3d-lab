# Evidence — pneumonia: consolidation and shunt

Model: [`src/models/pneumonia.js`](../../src/models/pneumonia.js).
Boundary and failure modes: [`../model-cards/pneumonia.md`](../model-cards/pneumonia.md).
Machine-readable registry: `PNEUMONIA_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports only the qualitative textbook mechanism the model
represents. It does not validate a patient simulator or a quantitative
oxygenation model. **No source below supports twelve equal units, their
ordering, the HPV gain, the 60% teaching range, or any displayed percentage as
a clinical value.** Where a row rests on a general account rather than on a
specific study it is marked **thin**.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `shunt-definition` — perfusion of a non-ventilated lung fraction is intrapulmonary shunt; ventilation of an underperfused fraction is dead space | Slobod et al., *Annals of Intensive Care* 2022, [open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9855693/); West. Definition, not primary data | `shuntFraction = Σ(perfusion_i × consolidation_i)`; consolidated subfractions receive no ventilation | Each regional unit is an aerated and a consolidated subfraction with uniform perfusion within it | `physiology: perfusing lung that receives no ventilation is shunt, and hypoxic vasoconstriction reduces it without abolishing it` |
| `consolidation-removes-ventilation` — increasing alveolar consolidation removes regional ventilation while perfusion may persist | Slobod et al. 2022, above; standard descriptions of lobar and bronchopneumonic consolidation. **thin** — textbook, not a measured V/Q distribution | `ventilation_i = 1 − consolidation_i`; conductance remains positive | Compliance, airway closure, collateral ventilation and respiratory drive are omitted | `physiology: consolidation removes ventilation without removing perfusion, so the shunt grows with the consolidated share` |
| `hpv-partial-diversion` — hypoxic pulmonary vasoconstriction diverts flow away from poorly ventilated lung but is not complete protection | Slobod et al. 2022, above. **thin** — the direction is textbook; the magnitude in pneumonia is variable and not claimed | `conductance_i = 1 − 0.72 × HPV × consolidation_i` | One whole-lung HPV scalar; no inflammatory blunting | `physiology: perfusing lung that receives no ventilation is shunt, and hypoxic vasoconstriction reduces it without abolishing it` |

## 2. What this repository chose

These are not findings. Each is a value invented or chosen so the mechanism is
legible, and each says so in the registry.

| Id | Where | What it is not |
| --- | --- | --- |
| `twelve-equal-units` | `PNEUMONIA_UNIT_COUNT` = 12, at `buildLungs().regions` | Not acini, not the eighteen named segments the organ builder carries, not a radiographic distribution |
| `consolidation-order` | `PNEUMONIA_CONSOLIDATION_ORDER` | Not lobar, bronchopneumonic or multifocal natural history; a clustered order for legibility |
| `hpv-gain` | The gain `0.72` and the default HPV strength `0.55` | Not a measured vascular response |
| `teaching-range` | `PNEUMONIA_TEACHING_MAX_CONSOLIDATION` = 0.6, applied by the scene's `setProgress()` | Not a severity threshold. The solver domain stays 0–1 and `1` is a boundary check only |

## 3. What the model does not have

| Id | Absent | Why it matters |
| --- | --- | --- |
| `uniform-perfusion-within-unit` | Any redistribution of flow *within* a region | The shunt expression reads the consolidated share as receiving flow in proportion to its size; the model claims direction, not size |
| `no-oxygenation` | Gas content, mixed venous saturation, a dissociation curve, PaO₂, SpO₂ | The shunt fraction shown is a fraction of model perfusion, not a clinical shunt or an oxygen tension |
| `no-mechanics-or-time` | Pathogen, immune response, secretions, compliance, work of breathing, time course | The slider is a spatial teaching axis, not days of illness; the symptoms pneumonia presents with cannot be produced |

The ATS/IDSA [adult community-acquired pneumonia guideline](https://www.idsociety.org/practice-guideline/community-acquired-pneumonia-cap-in-adults/)
is used only to set the clinical boundary — diagnosis and treatment require
findings outside this model — never to calibrate it.

## 4. How to check it

```bash
npm test                                          # everything
node --test tests/respiratory-physiology.test.js  # the claims in §1
node --test tests/pneumonia-model.test.js         # reference state, monotonicity, bounds, input safety
node --test tests/pneumonia-scene.test.js         # the scene reads the solve; the slider stops at the teaching range
```

## 5. Review status

**Not clinically reviewed.** The scene is `alpha`: it has a model layer, this
dossier, a model card and a scope panel, and no clinician has signed it. The
public review state is `pending`.

## Access record

The V/Q review was read as open full text. The ATS/IDSA source was read on the
official guideline page and is used only to set the clinical boundary, not to
calibrate the model.
