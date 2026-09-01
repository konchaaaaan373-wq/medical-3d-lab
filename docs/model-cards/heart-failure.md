# Model card — Heart failure

| | |
| --- | --- |
| **Scene** | `heart-failure` |
| **Model** | closed-loop time-varying-elastance circulation |
| **Primary implementation** | `src/scenes/cardiovascular/scenes/heartFailure/circulation.js` + `hemodynamics.js` |
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

## 7. Intended use

Mechanism teaching, model exploration and general explanation. It must not be used to estimate a patient's haemodynamics, infer treatment response, classify heart-failure severity, select therapy or substitute for echocardiography/invasive haemodynamics.

## 8. Review state

**Catalog status:** `production`  
**Clinical Review registry:** `legacy-unversioned`

The scene predates the current versioned Clinical Review standard. This model card, evidence dossier and external physiology layer migrate the evidence boundary into the current format, but **do not retroactively create a clinical sign-off**. Promotion from `legacy-unversioned` requires an independent clinical reviewer to sign a specific commit in `docs/clinical-reviews/registry.json`.
