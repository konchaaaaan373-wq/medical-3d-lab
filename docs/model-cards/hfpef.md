# Model card — HFpEF pressure-volume mechanics

| | |
| --- | --- |
| **Scene** | `hfpef` |
| **Catalog status** | `alpha` |
| **Model** | algebraic LV pressure-volume model |
| **Primary implementation** | `src/models/hfpef.js` |
| **Scene** | `src/scenes/cardiovascular/scenes/hfpef/index.js` |
| **External physiology tests** | `tests/hfpef-physiology.test.js` |
| **Model integrity tests** | `tests/hfpef-model.test.js` |
| **Evidence dossier** | `docs/model-evidence/hfpef.md` |

## 1. What question this model answers

**How can left-ventricular filling pressure become high while ejection fraction remains preserved?**

The model isolates one mechanism: a steeper LV end-diastolic pressure-volume relationship (EDPVR). At a fixed end-diastolic volume, fixed end-systolic elastance and fixed end-systolic pressure, increasing passive stiffness raises LV end-diastolic pressure while EDV, ESV, SV and EF remain unchanged.

A separate `filling` control moves EDV up or down at the same stiffness. Because the EDPVR is exponential, the pressure cost of the same increase in filling is larger when the ventricle is stiff.

## 2. Equations

End-systolic relation:

`Pes = Ees × (ESV − V0)`

End-diastolic relation:

`Ped = A × [exp(B × (V − V0)) − 1]`

Derived quantities:

`SV = EDV − ESV`

`EF = SV / EDV`

`CO = HR × SV`

The stiffness axis changes `B`. It does **not** lower Ees. The scene therefore cannot create HFrEF by moving the HFpEF slider.

## 3. External physiology the model is required to preserve

- Increasing passive LV stiffness shifts the diastolic pressure-volume relationship upward: the same LV volume requires more diastolic pressure.
- High filling pressure can coexist with an EF above 50%; preserved EF does not imply normal filling pressure.
- A filling/volume challenge produces a larger rise in filling pressure when the passive chamber is stiffer.

These are tested in `tests/hfpef-physiology.test.js` without reading scene copy or authored answers.

## 4. What is calibration rather than measurement

- Reference EDV, HR, end-systolic pressure, Ees, V0, EDPVR A/B and wall thickness are an educational reference calibration.
- The maximum stiffness value is chosen to place the stiff state in a visibly elevated filling-pressure range. It is not a measured patient stiffness.
- The `filling` control is a multiplier on EDV. It is not a fluid dose, intravascular volume, preload pressure or prescription.
- Wall thickness is a structural visual cue and does not cause the pressure rise in the equation.

## 5. Pressure-volume plot boundary

The EDPVR and ESPVR curves are model equations. EDV, ESV and their corner pressures are model outputs.

The connecting path drawn as a PV loop is a teaching interpolation between those corners. This model has no valves, time-varying elastance, atrium or closed circulation, so the interpolated loop path must not be used to infer valve timing, isovolumic duration, stroke work or detailed waveform morphology.

## 6. What is not modelled

HFpEF is not one disease mechanism. This scene does not contain:

- active relaxation / lusitropy as a separate dynamic process
- left atrial compliance or atrial myopathy
- pulmonary vascular disease or right-heart coupling
- pericardial restraint / ventricular interaction
- arterial stiffening and ventricular-arterial coupling
- chronotropic incompetence
- coronary reserve
- obesity, inflammation or endothelial dysfunction
- kidney, skeletal muscle or exercise gas exchange
- rhythm disease
- treatment response

## 7. Intended use

Mechanism teaching and conceptual comparison of pressure-volume relationships. It must not be used to diagnose HFpEF, estimate PCWP/LVEDP in a patient, calculate an H2FPEF/HFA-PEFF score, stage symptoms, predict prognosis or select therapy.

## 8. Review state

**Catalog status:** `alpha`  
**Clinical Review registry:** `pending`

The model and evidence package are prepared for review, but no current versioned clinical sign-off exists yet. No Patient/Education paid access is attached to this scene.
