# Model card — pulmonary embolism: dead space and vascular load

| | |
| --- | --- |
| **Scene ID** | `pulmonary-embolism` |
| **Route** | `#/pulmonary-embolism` |
| **Model** | [`src/models/pulmonaryEmbolism.js`](../../src/models/pulmonaryEmbolism.js) |
| **Evidence** | [`../model-evidence/pulmonary-embolism.md`](../model-evidence/pulmonary-embolism.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

Why can ventilation continue beyond an obstructed pulmonary vessel, and why
does removing vascular pathways increase right-ventricular afterload?

## 2. Model type

A deterministic network of twelve equal pulmonary vascular territories in
parallel, evaluated at one fixed model driving pressure. Vascular obstruction
removes distal perfusion while paired ventilation remains present.

## 3. What it is not

It is not a pulmonary arterial tree, CT clot-burden model, RV model, oxygenation
model, risk score or treatment-response model.

## 4. Input

| Input | Range | Meaning |
| --- | --- | --- |
| `obstruction` | 0–1 | Position on a teaching axis that involves at most 65% of the model territories |

The input is not clinical severity, elapsed time or a radiographic score.

## 5. Outputs

- Per-territory occlusion, fixed ventilation and perfusion at the fixed model pressure
- Total pulmonary vascular conductance relative to baseline
- Underperfused-ventilation fraction
- Relative pulmonary vascular resistance (`1 / relative conductance`)

No clinical pressure, VD/VT, RV function or risk category is emitted.

## 6. State variables

None over time. `solvePulmonaryEmbolism()` is a pure mapping from obstruction
to the twelve paths. Breathing and marker phase are presentation only.

## 7. Governing relations

```text
territory involved = 0.65 · obstruction
occlusion_i        = bounded allocation across the twelve territories
ventilation_i      = 1
conductance_i      = perfusion at fixed pressure = 1 − occlusion_i
relative PVR       = 1 / mean(conductance_i)
underperfused ventilation fraction = mean(ventilation_i · occlusion_i)
```

## 8. Constants and calibration

Twelve equal paths, the obstruction order and the 65% maximum are illustrative.
No magnitude is fitted to patient haemodynamics or imaging.

## 9. Visual mapping

- Cyan expansion shows ventilation continuing
- Red branch opacity/colour and marker motion read distal perfusion
- Orange objects mark vascular obstruction

Branch calibre, clot shape, marker speed and lung motion are presentation
values. The read-out and geometry use the same network solve.

## 10. Known failure modes

- Fixed driving pressure omits falling cardiac output and pressure in severe PE.
- Parallel equal paths omit pulmonary arterial anatomy, recruitment and baseline heterogeneity.
- No RV–pulmonary artery coupling means RV failure and shock cannot emerge.
- No CO2 or gas-content model means clinical dead-space or oxygenation values cannot be inferred.

## 11. Where it could mislead

The obstruction percentage can look like CT clot burden, and relative PVR can
look like a measured resistance. They are model indices. The twelve branches
are not named segmental arteries.

## 12. Safety boundary

Never use the model to diagnose or exclude PE, grade severity, infer clot
burden, estimate haemodynamics, select anticoagulation/reperfusion/support, or
predict an individual response.

## 13. Uncertainty

Real PE includes redistribution, vascular recruitment, vasoactive responses,
changing cardiac output, RV coupling, infarction and treatment effects. The
scene claims only ventilation-without-perfusion and rising relative vascular
load as obstruction removes parallel conductance.

## 14. Evidence and review

The evidence dossier records ESC/ERS guidance and peer-reviewed dead-space
reviews. Independent clinical sign-off has not been recorded; the public review
state remains `pending`.

## 15. Verification

```bash
node --test tests/pulmonary-embolism-model.test.js
```

The tests fix the reference state, persistent ventilation, monotonic loss of
conductance, rising relative resistance, complete obstruction of individual
paths, the sub-total-lung cap and absence of clinical outputs.

## 16. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/pulmonaryEmbolism.js` and `src/data/pulmonaryEmbolism.js`. A change
to either must revise this card before its digest is adopted.
