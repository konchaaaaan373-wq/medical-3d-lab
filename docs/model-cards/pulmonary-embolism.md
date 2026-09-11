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

The slider's caption says so on screen: full travel obstructs 65% of the
modelled territories, and the territory read-out reports that fraction, not
the slider position. Non-finite input (`NaN`) falls back to the reference lung
and `±Infinity` lands on the nearer bound.

The input is not clinical severity, elapsed time or a radiographic score.

## 5. Outputs

- Per-territory occlusion, fixed ventilation and perfusion at the fixed model pressure
- Total pulmonary vascular conductance relative to baseline
- Underperfused-ventilation fraction
- Relative pulmonary vascular resistance (`1 / relative conductance`), shown
  to one decimal because an inverse conductance of twelve equal paths carries
  no more precision than that

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
paths, the sub-total-lung cap, absence of clinical outputs and safe handling
of non-finite input; `tests/pulmonary-embolism-scene.test.js` checks that the
scene's twelve territories, emboli and read-outs all come from the same solve.

## 16. Who it is said to, and where it stops

There is now a patient-facing explanation of this scene
(`src/data/patientGuides.js`, id `pulmonary-embolism`). It walks the same four
stages this card describes and it stops where this model stops.

**Six steps, deliberately the mirror of the pneumonia walk.** Both scenes are
about air and blood failing to meet and they fail in opposite directions; the
two explanations are written to be read one after the other, and `RELATED` in
`src/data/pulmonaryEmbolism.js` says so on screen.

**The load step is worded against this card's own scope.** This model solves the
conductance of a fixed twelve-territory network and explicitly does not solve
pulmonary artery pressure, cardiac output or right-ventricular function. So the
step says the routes that remain have to carry everything, and it names no
pressure, no heart chamber and no number. The step after it says, on screen,
that neither how hard a heart is pushing nor how much oxygen is arriving is
being calculated here. The last step, about sudden breathlessness and chest
discomfort, is marked `associated`.

`tests/respiratory-guides.test.js` holds the pairing, the marks and the copy
limits; `scripts/check-patient-explanation.mjs` drives the walk in a browser and
fails when a step points at something the reader cannot see.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/pulmonaryEmbolism.js` and `src/data/pulmonaryEmbolism.js`. A change
to either must revise this card before its digest is adopted.
