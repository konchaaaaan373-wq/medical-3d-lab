# Model card — Heart failure

| | |
| --- | --- |
| **Scene** | `heart-failure` |
| **Model** | closed-loop time-varying-elastance circulation |
| **Primary implementation** | `src/models/cardiacMechanics.js` (the solver, shared) + `src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js` (this disease's stages) |
| **Content / parameters** | `src/data/heartFailure.js` |
| **External physiology tests** | `tests/heart-failure-physiology.test.js` |
| **Evidence dossier** | `docs/model-evidence/heart-failure.md` |

## 1. What question this model answers

**How do preload, afterload and ventricular contractility alter one solved cardiac beat, and how can one illustrative HFrEF remodelling pattern connect chamber geometry, the pressure-volume loop, arterial pressure and pulmonary venous pressure?**

## 2. Model structure

The circulation is a seven-compartment closed loop: LV → systemic arteries → systemic veins → RV → pulmonary arteries → pulmonary venous/capillary compartment → LA → LV. Cardiac chambers use time-varying elastance and nonlinear passive pressure-volume relationships. Valves are ideal one-way resistances. Vascular beds are lumped resistances/compliances.

The scene does **not** prescribe EDV, ESV, EF, stroke volume, cardiac output or filling pressure. It prescribes mechanical/load parameters and solves the circulation until a stable beat is reached. The 3D geometry, pressure-volume loop, pressure waveform and numerical read-outs all consume that same solved state.

## 3. External physiology the model is required to preserve

- Frank-Starling direction: within preload reserve, greater filling raises EDV and stroke volume.
- Afterload direction: at fixed contractility, greater afterload impairs emptying and reduces stroke volume.
- Contractility direction: lower end-systolic elastance produces poorer emptying and lower EF.
- Left-sided filling-pressure coupling: higher left atrial pressure is accompanied by higher pulmonary venous/capillary pressure.

These are checked separately in `tests/heart-failure-physiology.test.js`. Exact effect sizes are **not** external claims.

## 4. The remodelling slider is not a natural history

The scene uses one continuous teaching path through:

`reference → concentric hypertrophy → LV dilation → reduced systolic function (HFrEF)`

This is an **illustrative trajectory**, not a universal sequence. A patient does not have to pass through all states; HFpEF is not represented; the slider is not disease duration, NYHA class or prognosis. Pulmonary congestion is deliberately a separate haemodynamic overlay derived from the solved pulmonary venous/capillary pressure, not a fifth structural stage.

## 5. Calibrations and approximations

- Baseline chamber, vascular and blood-volume parameters are calibrated to place a reference resting circulation in broadly physiological ranges.
- The left atrium is one exponential passive compartment, not a measured atrial compliance.
- The pulmonary venous compartment lumps capillary and venous pressure into one downstream compartment.
- Valves are ideal one-way resistances with no leaflet mechanics, stenosis or regurgitation.
- The congestion overlay maps pressure onto visible extent using teaching bands. It is not a lung-water equation or a patient-specific oedema threshold.
- The ventricular shape is a teaching geometry, not a segmentation-derived patient ventricle.

## 6. What is not modelled

HFpEF, primary right-heart failure, valvular disease, pulmonary hypertension as an independent disease process, coronary perfusion/ischaemia, autonomic and renin-angiotensin-aldosterone dynamics, renal sodium handling, pericardial constraint, interventricular interaction, arrhythmia, distributed arterial wave mechanics and patient-specific treatment response.

## 7. What could be misread

Raised by the Gate 1 anatomy/art review ([`anatomy-review.md`](../anatomy-review.md)),
which measured the geometry as correct but flagged two pictures a reader may
take further than they are meant to. Neither is a claim the scene makes in
words; both are open questions for the clinical reviewer.

- **Vessel colour is not an oxygenation code, and looks like one.** The
  pulmonary veins and the left atrium are drawn in the scene's dusky venous
  tint, the aorta in an arterial red-brown. The tint is named for the tissue —
  it darkens as the vein walls engorge, which is what the congestion stage is
  about — but the pulmonary veins are the veins that carry oxygenated blood,
  and the left atrium holds the most oxygenated blood in the body. A reader who
  reads red-against-purple the way an atlas uses it will read this scene's
  pulmonary side backwards. The legend claims no oxygenation code, so nothing
  false is stated; the picture may still mislead.
- **The descending aorta drifts laterally** rather than staying about
  2–2.5 cm left of the midline and moving medially as it descends. It is out of
  frame at the default framing and carries nothing the scene teaches.

## 8. Intended use

Mechanism teaching, model exploration and general explanation. It must not be used to estimate a patient's haemodynamics, infer treatment response, classify heart-failure severity, select therapy or substitute for echocardiography/invasive haemodynamics.

## 9. Review state

**Catalog status:** `production`  
**Clinical Review registry:** `legacy-unversioned`

The scene predates the current versioned Clinical Review standard. This model card, evidence dossier and external physiology layer migrate the evidence boundary into the current format, but **do not retroactively create a clinical sign-off**. Promotion from `legacy-unversioned` requires an independent clinical reviewer to sign a specific commit in `docs/clinical-reviews/registry.json`.

## 10. Revision history

### Revision 2 — the solver moved out of the scene

**No claim in this card changed.** The time-varying elastance model and the
seven-compartment circulation it drives moved from
`src/scenes/cardiovascular/scenes/heartFailure/circulation.js` to
`src/models/cardiacMechanics.js`, and the chamber-geometry and beat-phase
helpers moved with them out of `hemodynamics.js`. What remains in the scene is
the part that is specific to *this* disease: the keyframe interpolation that
turns a position on the progression into mechanical parameters.

The reason is a second scene. Myocardial ischemia has to solve the same cardiac
cycle under the same loading state, and a second implementation of a beat is
how two scenes start disagreeing about one heart. Ownership now sits in the
model layer and both scenes read it.

**The move was verified as a move.** Every authored stage, each public input at
its minimum, default and maximum one factor at a time, and five points in the
cardiac cycle were captured before the change and again after: parameters,
solved state, pressure-volume curves, chamber shape, flows, traces and
per-phase pressures. The two captures are **byte-identical** — not within the
1e-9 / 1e-8 tolerance the extraction was held to, exactly equal.
`tests/cardiac-mechanics.test.js` pins that against
`tests/fixtures/cardiac-mechanics.json`, and a 1e-7 relative perturbation to
one line of the solver fails it.

**One thing worth flagging for a future revision.** `beatPhaseAt` carries
English and Japanese labels, and it now lives in `src/models/`, where rule 2
says presentation values do not belong. It was moved unchanged because the
requirement here was equivalence, and rewriting it would have made the
verification above meaningless. Splitting the naming from the partition is a
separate change with its own reason to happen.
