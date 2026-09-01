# Model card — Amyloid-β

| | |
| --- | --- |
| **Scene** | `amyloid-beta` |
| **Model** | deterministic conceptual aggregation layout |
| **Primary implementation** | `src/scenes/nervous/scenes/amyloidBeta/aggregationLayout.js` |
| **Content / terminology** | `src/data/amyloidBeta.js` |
| **External biology tests** | `tests/amyloid-physiology.test.js` |
| **Evidence dossier** | `docs/model-evidence/amyloid-beta.md` |

## 1. What question this model answers

**What do the major teaching labels monomer, soluble oligomer, fibril and extracellular plaque mean, and how can they coexist as Aβ aggregation increases?**

## 2. What the model is

A deterministic 3D teaching layout. Each particle has positions for soluble, oligomeric, fibrillar and plaque-associated presentation states. A single 0–1 control changes which presentation state is shown. Multiple species remain visible together at high aggregation.

This is not a molecular-dynamics simulation, kinetic reaction model, neuropathology quantification or Alzheimer disease progression model.

## 3. External biology the scene must preserve

- Aβ is a normal soluble product of cellular metabolism and is not absent from healthy physiology.
- Multiple Aβ assembly states can coexist rather than replacing one another cleanly.
- Senile amyloid plaques are extracellular deposits containing fibrillar Aβ.

Those boundaries are checked in `tests/amyloid-physiology.test.js`. The tests intentionally do **not** validate the exact particle fractions, thresholds or visual scale.

## 4. The aggregation control is not clinical time or severity

The 0–1 control is a teaching coordinate. It is not years of disease, Braak/Thal staging, amyloid PET Centiloids, CSF Aβ concentration, MMSE, dementia severity or prognosis. A high slider position must never be interpreted as worse cognition in an individual.

## 5. Important approximation: individual particles only move forward

The population is designed to preserve coexistence, but each rendered particle advances monotonically as the slider moves right. Real Aβ assemblies can interconvert, disassemble and follow branched pathways. The one-way particle rule is therefore a **known presentation simplification**, not a biological law.

## 6. Illustrative choices

- Relative molecular/neuron/plaque scale is deliberately wrong for visibility.
- Particle count is a rendering budget, not molecule count.
- Per-particle appearance/assembly thresholds are invented deterministic scheduling values.
- The displayed monomer/oligomer/fibril/plaque proportions are chosen to show coexistence; they are not tissue concentrations.
- Intermediate species such as protofibrils are not separate displayed states.

## 7. What is not modelled

Aβ40 versus Aβ42, APP cleavage, secretases, ApoE, clearance pathways, intracellular Aβ biology, tau, microglia/astrocytes, neuroinflammation, synapse network dynamics, neuronal death, regional brain vulnerability, biomarker thresholds and patient cognition.

## 8. Intended use

General explanation of Aβ assembly vocabulary and coexistence. It must not be used for diagnosis, biomarker interpretation, staging, prognosis, treatment decisions or estimating an individual's cognition from amyloid burden.

## 9. Review state

**Catalog status:** `production`  
**Clinical Review registry:** `legacy-unversioned`

The scene predates the current versioned Clinical Review standard. This package makes its evidence boundary explicit but does **not** invent a historical reviewer identity or retroactive sign-off. A current reviewer must sign a specific commit before the registry can become `reviewed`.
