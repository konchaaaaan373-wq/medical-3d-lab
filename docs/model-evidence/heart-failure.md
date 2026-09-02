# Evidence dossier — Heart failure

This dossier separates claims about cardiovascular physiology from properties of this repository's chosen HFrEF teaching trajectory. The machine-readable contract is `HEART_FAILURE_EVIDENCE` in `src/models/productionEvidence.js`.

## External physiology

### `frank-starling`
Within preload reserve, greater filling raises end-diastolic volume and stroke volume. Source boundary: Frank-Starling physiology (PMID 1478214). Verification: `physiology: raising preload raises end-diastolic volume and stroke volume`.

### `afterload-mismatch`
At fixed contractility, higher afterload impairs emptying, raises end-systolic volume and lowers stroke volume. Source boundary: afterload-mismatch literature (PMID 1278221; PMID 6220896). Verification: `physiology: raising afterload reduces stroke volume at fixed contractility`.

### `contractility-ejection`
Reduced contractility shifts end-systolic behaviour toward poorer emptying and lower EF. Source boundary: Suga/Sagawa ESPVR and time-varying-elastance literature (PMID 2271404; PMID 16150150). Verification: `physiology: reducing contractility lowers ejection fraction and raises end-systolic volume`.

### `left-filling-pressure-backup`
Higher left-sided filling is transmitted to the left atrial and pulmonary venous/capillary compartments. Verification: `physiology: greater left-sided filling raises both atrial and pulmonary venous pressure`. This supports the **direction** of the congestion mechanism, not a universal pressure threshold for pulmonary oedema.

## Approximations

### `time-varying-elastance`
Time-varying elastance is a well-established conceptual framework, but this seven-compartment implementation is a lumped approximation. It has no distributed wave mechanics or patient-specific ventricular geometry.

### `ideal-valves`
The four valves are ideal one-way resistances. This is appropriate for conserving direction of flow and inappropriate for valve disease.

## Illustrative choices and calibration

### `illustrative-remodelling-axis`
The sequence from reference through concentric hypertrophy, dilation and reduced systolic function is one authored HFrEF teaching path. It is not a natural-history claim.

### `congestion-rendering-map`
Clinical filling-pressure landmarks informed the display range, but mapping pulmonary venous pressure onto visible congestion/fluid intensity is illustrative. It is not a lung-water measurement.

### `reference-circulation`
Reference parameters were calibrated so the solved resting circulation lands in broadly physiological ranges. These are calibration targets, not measurements.

### `atrial-passive-curve`
The left atrial passive exponential was calibrated so the lumped atrium and pulmonary venous compartment remain coupled in a plausible pressure range. Its slope must not be read as measured atrial compliance.

## Known weaknesses / boundaries

### `resting-output-trajectory`
The relatively preserved resting cardiac-output segment is produced by several co-varying authored inputs. Some patients with HFrEF preserve resting output, but this exact curve is not an expected patient trajectory.

### `missing-heart-failure-phenotypes`
HFpEF, right-heart failure, valve disease, independent pulmonary hypertension and explicit neurohumoral dynamics are absent. The model therefore cannot be generalized to heart failure as a whole.

## Review implication

Building this dossier does not itself constitute clinical sign-off. The scene remains `legacy-unversioned` until a reviewer signs a specific commit in the Clinical Review registry.
