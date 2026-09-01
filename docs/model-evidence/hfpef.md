# Evidence dossier — HFpEF pressure-volume mechanics

This dossier separates established HFpEF pressure-volume physiology from values chosen to make one mechanism explorable. The scene is intentionally narrower than the clinical syndrome.

## External claim 1 — increased passive stiffness raises pressure at the same volume

### `stiff-edpvr`

**Claim.** A stiffer left ventricle has an upward/leftward-shifted end-diastolic pressure-volume relationship, so a given chamber volume is reached at a higher diastolic pressure.

**Source.** Zile MR, Baicu CF, Gaasch WH. *Diastolic heart failure — abnormalities in active relaxation and passive stiffness of the left ventricle.* N Engl J Med. 2004;350:1953–1959. PMID **15128895**, DOI 10.1056/NEJMoa032566. Patients with heart failure and normal EF had impaired relaxation, increased chamber stiffness, and an upward/leftward-shifted diastolic pressure-volume relation.

**Verification.** `physiology: increasing passive LV stiffness shifts the EDPVR upward at the same volume`

The test compares pressure at identical volumes. It does not compare two authored stage captions or two calibration targets.

## External claim 2 — preserved EF does not imply normal filling pressure

### `preserved-ef-high-filling-pressure`

**Claim.** HFpEF is compatible with pathological elevation of filling pressure despite preserved LV ejection fraction.

**Sources.**

- Omote K, Hsu S, Borlaug BA. *Hemodynamic Assessment in Heart Failure with Preserved Ejection Fraction.* Cardiol Clin. 2022;40:459–472. PMID **36210131**. The hemodynamic definition centers on inability to perfuse without pathological increases in filling pressure at rest or exertion.
- Borlaug BA et al. *Heart Failure With Preserved Ejection Fraction: JACC Scientific Statement.* J Am Coll Cardiol. 2023. PMID **37137592**, DOI 10.1016/j.jacc.2023.01.049.

**Verification.** `physiology: elevated filling pressure can coexist with preserved ejection fraction`

The model makes the isolation deliberately strong: systolic Ees, end-systolic pressure and EDV are held the same while only passive EDPVR stiffness changes. The purpose is mechanistic contrast, not patient phenotyping.

## External claim 3 — stress/filling reserve can reveal a disproportionate pressure rise

### `stress-pressure-reserve`

**Claim.** Increasing venous return/filling or exercise stress can reveal a larger rise in cardiac filling pressure in HFpEF than in controls.

**Source.** Andersen MJ, Olson TP, Melenovsky V, Kane GC, Borlaug BA. *Differential hemodynamic effects of exercise and volume expansion in people with and without heart failure.* Circ Heart Fail. 2015;8:41–48. PMID **25342738**, DOI 10.1161/CIRCHEARTFAILURE.114.001731. Exercise and saline loading increased filling pressures; the HFpEF response was abnormal.

Additional context: Reddy YNV et al. JACC Heart Fail. 2018; PMID **29803552** — invasive exercise hemodynamics in HFpEF.

**Verification.** `physiology: a filling challenge raises pressure more steeply in the stiff ventricle`

The model uses an EDV multiplier as the perturbation. That control is not a saline volume, exercise workload or dose-response model.

## Equations used

### ESPVR

`Pes = Ees × (ESV − V0)`

A linear end-systolic pressure-volume relation is a standard conceptual model of ventricular systolic mechanics. In this scene, Ees and Pes are held fixed specifically to prevent the HFpEF axis from silently turning into an HFrEF axis.

### EDPVR

`Ped = A × [exp(B × (V − V0)) − 1]`

The exponential form is a conventional educational description of passive chamber pressure rising nonlinearly with volume. The **direction** produced by raising the stiffness coefficient is the external claim. The exact A and B used here are calibration.

## Calibration choices

### `single-passive-mechanism`

The model deliberately changes only passive LV stiffness on the progression axis. Active relaxation, atrial, pulmonary, pericardial and vascular mechanisms are outside this isolation experiment.

### `reference-pv-calibration`

| Item | Model choice | Confidence / boundary |
| --- | --- | --- |
| Reference EDV | 120 mL | calibration; not a patient measurement |
| HR | 70/min | calibration |
| End-systolic pressure | 100 mmHg | calibration used to locate the ESPVR corner |
| Ees | 2.6 mmHg/mL | calibration, held constant across stiffness |
| V0 | 10 mL | calibration |
| EDPVR A | 0.4 mmHg | calibration |

### `stiffness-range`

EDPVR B moves from 0.0277 to 0.0355 /mL. This is an illustrative teaching range chosen to make the pressure contrast visible, not a clinical severity scale or a measured stiffness index.

### `filling-control`

The filling control moves EDV from 0.90 to 1.10 times the reference EDV. It is a chamber-volume perturbation, not a saline dose, intravascular volume, preload pressure or treatment prescription.

### `wall-thickness-cue`

Displayed wall thickness moves from 9 to 13 mm as a structural cue. It does not enter the EDPVR equation and the model does not assert a fixed clinical mapping from hypertrophy to passive stiffness.

No number in this section is to be interpreted as a diagnostic threshold or as the expected value for a person with HFpEF.

## Rendering boundary

The two 3D ventricles are not patient anatomy or an echocardiographic reconstruction. Their beat uses the same EDV/ESV state so the fractional emptying remains visually comparable.

### `pressure-cue-not-congestion-model`

The pulmonary-blue opacity is driven by LVEDP only as a **filling-pressure cue**; it is not lung water, PCWP, extravascular lung-water index or pulmonary edema severity.

### `pv-loop-interpolation`

The pressure-volume panel has a mixed epistemic boundary:

- **model equations:** EDPVR and ESPVR;
- **model outputs:** EDV, ESV, EF, LVEDP and corner points;
- **illustrative presentation:** the path connecting the four corners into a familiar loop shape.

There are no valves or time-varying elastance in this model, so the connecting path must not be read for valve timing, phase duration, waveform morphology or stroke work.

## Known limitations

### `hfpef-heterogeneity`

HFpEF is a heterogeneous clinical syndrome and cannot be reduced to passive LV stiffness alone. In particular:

1. Active relaxation is not modelled separately.
2. There is no atrium or pulmonary circulation, so LVEDP is not converted into PCWP by a haemodynamic model.
3. Pericardial restraint and ventricular interaction are absent.
4. Exercise physiology is not simulated; the filling control is only a chamber-volume perturbation.
5. Arterial stiffness, endothelial dysfunction, obesity/inflammation, kidney and skeletal-muscle mechanisms are absent.
6. The model contains no diagnostic score, symptoms, prognosis or treatment response.

## Review implication

This package is sufficient for a reviewer to inspect the claims, equations, calibrations and exclusions. It is **not** itself a clinical attestation. The catalogue remains `alpha` and the Clinical Review registry remains `pending` until a reviewer signs a specific commit.
