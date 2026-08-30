# Model evidence — Hepatorenal syndrome

Implementation: [`src/models/hepatorenal.js`](../../src/models/hepatorenal.js)
Boundary of the claim: [`docs/model-cards/hepatorenal-syndrome.md`](../model-cards/hepatorenal-syndrome.md)
Tests: [`tests/hepatorenal-physiology.test.js`](../../tests/hepatorenal-physiology.test.js) (external),
[`tests/hepatorenal.test.js`](../../tests/hepatorenal.test.js) (integrity),
[`tests/calibration.test.js`](../../tests/calibration.test.js) (calibration)

## How these sources were consulted — read this first

**This repository's network cannot reach PubMed, PMC, the Journal of
Hepatology, the EASL or AASLD guideline documents, or the International Club of
Ascites materials.** Nothing in this file was extracted from a figure, a table
or an algorithm, and nothing has been reproduced. The sources named below are
cited for **propositions** — a causal order, a mechanism, a direction, the
existence of a treatment effect — and never for a digit.

Every number in the model is one of two things, and the registry says which for
each: a **reference value** from standard physiology used as a target the model
was calibrated to hit (renal blood flow 1100 mL/min, GFR 120 mL/min, glomerular
pressure 50 mmHg, mean arterial pressure 90 mmHg, cardiac output 5 L/min), or
an **invented constant** that the model needed and for which no measurement
exists (every gain, every effect size, the width of the autoregulatory band).
There is no third category. In particular there is no measured intrarenal
arteriolar resistance here, because there is no such measurement for a person.

The confidence behind each claim is machine-readable in
[`src/models/evidence.js`](../../src/models/evidence.js) as one of
`established` / `supported` / `approximation` / `calibration` / `illustrative` /
`uncertain`, together with the **layer** that checks it. The `Confidence` row in
each table below gives the registry id.

## The three layers, and what a failure in each means

This scene is built under the taxonomy in [`tests/README.md`](../../tests/README.md).

- **External physiology** (`tests/hepatorenal-physiology.test.js`) — what the
  literature requires independently of this repository. Not one assertion in
  that file contains a constant this repository chose. **A failure there, and
  only there, means the medical model has broken a constraint the physiology
  imposes.**
- **Model integrity** (`tests/hepatorenal.test.js`) — that it solves, conserves,
  and gives the same answer twice. A failure means the implementation is
  broken.
- **Calibration** (`tests/calibration.test.js`) — that the parameterisation this
  repository deliberately chose still behaves as designed. **A failure there
  does not mean the medicine is wrong.** It means somebody re-tuned something.

## What this model was built around

The scene exists for one question: *if the kidney in hepatorenal syndrome is
structurally near-normal, what is stopping it from filtering?* Everything else
in the model is there to make that question answerable.

The answer is delivered structurally rather than numerically. The renal part of
the model has no damage term in it at all — `KF`, `BOWMAN_PRESSURE` and
`PLASMA_ONCOTIC_PRESSURE` are constants, and the only things that move are two
arteriolar resistances driven by a signal that arrives from outside the kidney.
`kidneyWithoutTheSignal` re-solves the same kidney at the same arterial pressure
with the signal removed, and an external test asserts that this restores renal
perfusion at every severity. It cannot fail without the model having been
rewritten, and that is the intended property.

---

## Claim → Source → Implementation → Assumption → Validation

### 1. Filtration is ultrafiltration

| | |
| --- | --- |
| **Claim** | GFR = Kf · (P_glomerular − P_Bowman − π_plasma). Filtration stops when the net pressure reaches zero, however much blood is arriving. |
| **Source** | The Starling relation applied to the glomerulus; standard renal physiology. |
| **Implementation** | `solveKidney` computes the net pressure from the solved glomerular pressure and two constants, and multiplies. Nothing is written down as a filtration rate anywhere. |
| **Assumption** | A single mean oncotic pressure in place of one that rises along the capillary, so filtration pressure equilibrium cannot occur — see claim 9. |
| **Validation** | `physiology: glomerular filtration follows the net filtration pressure`, which also drives the glomerular pressure below the opposing pressures and checks that filtration stops with blood still flowing. |
| **Confidence** | `starling-filtration` (established, external) and `mean-oncotic-pressure` (approximation, calibration), whose validation `calibration: the oncotic pressure is a constant and filtration equilibrium is not modelled` asserts that the opposing pressures are the same constant in every state. |

### 2. The systemic beds are in parallel

| | |
| --- | --- |
| **Claim** | Dilating one vascular bed lowers total systemic vascular resistance whatever the others do. |
| **Source** | Conductances in parallel add. Arithmetic applied to standard anatomy. |
| **Implementation** | The splanchnic conductance comes from the portal model's solved inflow; everything else is one lumped conductance, defined as whatever is left once the healthy splanchnic circulation has taken its share of the reference output. |
| **Assumption** | Two beds, both linear, no pulsatility, no regional autoregulation outside the kidney. |
| **Validation** | `physiology: dilating one bed lowers the resistance of the whole circulation` — asserted while the other beds are actively constricting, which limits the fall without reversing it. |
| **Confidence** | `parallel-beds` (established, external). |

### 3. The hyperdynamic circulation

| | |
| --- | --- |
| **Claim** | Advanced cirrhosis raises cardiac output, lowers systemic vascular resistance, and lowers arterial pressure anyway: the compensation is real and incomplete. |
| **Source** | Reviews of the circulatory abnormalities of cirrhosis and of hepatorenal syndrome (PMC5904971, PMC6182055, PMC3959227); EASL and AASLD guidance on decompensated cirrhosis. |
| **Implementation** | `CO = CO_ref · (SVR_ref / SVR)^exponent` with the exponent strictly between 0 and 1, so arterial pressure goes as the resistance ratio to the power of one minus the exponent. |
| **Assumption** | There is no heart in this model. No Starling curve, no contractility, no chamber, no rate. The exponent is an invented functional form standing in for all of it. |
| **Validation** | `physiology: worsening cirrhosis raises cardiac output and still lowers arterial pressure` — direction only. The magnitudes are in `calibration: the cardiac compensation exponent sets how far pressure falls for a given dilation`. |
| **Confidence** | `hyperdynamic-circulation` (supported, external) and `cardiac-compensation-exponent` (illustrative, calibration). |

### 4. Arterial underfilling activates the vasoconstrictor systems

| | |
| --- | --- |
| **Claim** | The reduction in effective arterial blood volume that follows arterial vasodilation activates the renin-angiotensin-aldosterone system, the sympathetic nervous system and vasopressin. |
| **Source** | Schrier's peripheral arterial vasodilation hypothesis, and the reviews above. |
| **Implementation** | One dimensionless index between 0 and 1, a saturating function of the shortfall in arterial perfusion pressure. The dilation that causes the shortfall is reported separately as `arterialUnderfilling`, so cause and consequence are both visible. |
| **Assumption** | One index for five hormones and a nerve supply. It is not a renin activity, not a noradrenaline level, has no units, and must never be displayed as a concentration. Driving it from pressure rather than from volume is a modelling decision: a baroreceptor senses pressure, and in this model pressure falls precisely because the bed has dilated faster than the heart can fill it. |
| **Validation** | `physiology: arterial underfilling activates the vasoconstrictor systems` — that both rise together, and that a normal circulation activates nothing. The shape of the curve is in `calibration: the activation curve is a saturating function of the pressure deficit`. |
| **Confidence** | `arterial-underfilling` (supported, external) and `activation-curve` (illustrative, calibration). |

### 5. The kidney is functionally, not structurally, affected

| | |
| --- | --- |
| **Claim** | Hepatorenal syndrome is functional renal vasoconstriction in a structurally near-normal kidney. Renal function recovers after liver transplantation, and a kidney from a donor with the syndrome functions normally in a recipient without it. |
| **Source** | The hepatorenal syndrome reviews above and the transplantation observations they cite; International Club of Ascites criteria. |
| **Implementation** | `solveKidney` is a pure function of an arterial pressure and the signal. Nothing about the liver reaches it. `kidneyWithoutTheSignal` re-solves it with the signal set to zero. |
| **Assumption** | The model cannot represent structural kidney disease, so it cannot represent the differential diagnosis either. It asserts the functional case by construction rather than discovering it. |
| **Validation** | `physiology: removing the vasoconstrictor signal restores renal perfusion at any severity` — perfusion at every severity, the pure-function property as a deep equality, and filtration at the severities past the failure of autoregulation. |
| **Confidence** | `functional-not-structural` (supported, external). |

### 6. The two arterioles do different jobs

| | |
| --- | --- |
| **Claim** | Angiotensin II constricts the efferent arteriole preferentially, so filtration is defended while renal blood flow is already falling and the filtration fraction rises. |
| **Source** | Standard renal physiology of angiotensin II; the pathophysiology reviews above. |
| **Implementation** | Two resistances. The efferent one rises with the signal from the start; the afferent band is shielded from it until the shield is used up. |
| **Assumption** | The efferent resistance lumps the peritubular circulation into it — adequate for setting the glomerular pressure, useless for anything about peritubular uptake, which the model does not have. |
| **Validation** | `physiology: efferent-predominant constriction defends filtration and raises the filtration fraction` — asserted over the phase before the afferent floor binds, direction only. |
| **Confidence** | `efferent-predominance` (supported, external) and `lumped-efferent` (approximation, calibration). |

### 7. Angiotensin II lowers the ultrafiltration coefficient

| | |
| --- | --- |
| **Claim** | Angiotensin II contracts glomerular mesangial cells and reduces the ultrafiltration coefficient, opposing the rise in glomerular pressure it causes. |
| **Source** | Standard renal physiology of angiotensin II. |
| **Implementation** | `Kf` is scaled down linearly with the activation index. |
| **Assumption** | The size of the reduction is invented. Without this term the model would answer that early vasoconstrictor activation raises filtration far above normal, which it does not — see claim 12 for what is left of that. |
| **Validation** | `physiology: the vasoconstrictor signal lowers the ultrafiltration coefficient`. |
| **Confidence** | `mesangial-kf` (supported, external). |

### 8. Autoregulation, and how it fails

| | |
| --- | --- |
| **Claim** | Renal blood flow is autoregulated over a range of perfusion pressures and becomes pressure-dependent below the lower limit. Vasoconstrictor activation reduces the afferent arteriole's capacity to dilate, so the circulation becomes pressure-dependent at a pressure it would otherwise have autoregulated around. |
| **Source** | Standard renal physiology; the hepatorenal syndrome reviews, in which the renal circulation in the syndrome is described as pressure-dependent. |
| **Implementation** | The afferent arteriole takes whatever resistance holds renal blood flow at its reference, clamped into a band. The signal shifts the whole band upward, so the floor binds at a higher pressure. |
| **Assumption** | Autoregulation is a permitted range, not a mechanism. There is no myogenic response and no tubuloglomerular feedback — the model has no tubule. The width of the band is invented, and the lower limit of autoregulation is a consequence of the width rather than a value taken from anywhere. |
| **Validation** | `physiology: renal blood flow is held steady within the autoregulatory range and follows pressure below it` and `physiology: vasoconstrictor tone raises the pressure at which autoregulation fails` — both direction and ordering only. The width is in `calibration: autoregulation is a permitted resistance band with a chosen width`. |
| **Confidence** | `autoregulation-range` (established, external), `vasoconstrictors-exhaust-autoregulation` (supported, external), `autoregulation-as-a-band` (approximation, calibration). |

### 9. The prostaglandin shield

| | |
| --- | --- |
| **Claim** | Locally produced renal prostaglandins oppose vasoconstrictor tone in the afferent arteriole. Inhibiting their synthesis can precipitate renal failure in a patient whose vasoconstrictor systems are already activated, without changing anything systemic. |
| **Source** | Standard renal pharmacology of non-steroidal anti-inflammatory drugs; guidance on avoiding them in decompensated cirrhosis. |
| **Implementation** | The afferent band responds only to the activation above a threshold; `prostaglandinInhibition` lowers the threshold to zero. |
| **Assumption** | The size of the shield is invented. That there is one, and that blocking prostaglandin synthesis removes it, is not. Nothing about a drug, a dose or a duration is in the model. |
| **Validation** | `physiology: blocking the afferent shield worsens filtration without touching the circulation` — asserted as an exact equality on every systemic quantity together with a strict fall in filtration, and as a no-op on a circulation that is not activated. |
| **Confidence** | `prostaglandin-shield` (supported, external). |

### 10. Treatment works through the circulation

| | |
| --- | --- |
| **Claim** | A splanchnic vasoconstrictor raises arterial pressure, reduces vasoconstrictor activation and improves renal function. It treats the circulation, not the kidney. |
| **Source** | Trials of terlipressin with albumin in HRS-AKI; EASL and AASLD guidance. |
| **Implementation** | `terlipressin` subtracts from the splanchnic vasodilation — the same variable the disease works through — and nothing else. `albumin` raises cardiac output at a given resistance. |
| **Assumption** | Effect sizes are invented. No dose, duration, response rate or number needed to treat may be read off this. Albumin is preload here and not oncotic pressure, so hypoalbuminaemia does not affect filtration in this model, which is a real omission. |
| **Validation** | `physiology: a splanchnic vasoconstrictor improves filtration by way of the circulation` — pressure up, activation down, filtration up, the hyperdynamic circulation settling back rather than being driven harder, and the kidney reproduced exactly by `solveKidney` on the new pressure and signal. |
| **Confidence** | `splanchnic-vasoconstrictor-treatment` (supported, external) and `treatment-effect-sizes` (illustrative, calibration). |

### 11. Cardiac reserve

| | |
| --- | --- |
| **Claim** | An impaired cardiac response to arterial vasodilation deepens the arterial underfilling and worsens renal perfusion. |
| **Source** | Reviews of cirrhotic cardiomyopathy and its association with hepatorenal syndrome. |
| **Implementation** | `cardiacReserve` scales the compensation exponent between a floor and its full value. |
| **Assumption** | There is no heart. This is a single scalar standing in for systolic and diastolic dysfunction, chronotropic incompetence and electrophysiological abnormality at once. |
| **Validation** | `physiology: a weaker cardiac response deepens the underfilling and lowers filtration`. |
| **Confidence** | `cardiac-reserve` (supported, external). |

### 12. Calibration, and the numbers that are not findings

| | |
| --- | --- |
| **Claim** | The arteriolar resistances, the ultrafiltration coefficient and the systemic resistance are derived from reference targets, not measured. |
| **Source** | Textbook reference values used as targets. No measurement of a human arteriolar resistance exists. |
| **Implementation** | `REFERENCE_AFFERENT_RESISTANCE`, `REFERENCE_EFFERENT_RESISTANCE`, `KF` and `REFERENCE_SVR` are each computed from the reference state rather than written down. |
| **Assumption** | The healthy case is exact by construction. That says nothing about how far from it any particular patient sits. |
| **Validation** | `calibration: the healthy kidney reproduces its reference flows and a filtration fraction near a fifth`, `calibration: a healthy liver solves to the reference circulation it was anchored at`, `calibration: the efferent resistance is the whole path from glomerulus to renal vein`. All in the calibration layer, where a failure means a constant moved. |
| **Confidence** | `renal-reference-anchor` and `systemic-reference-anchor` (calibration). |

### 13. The split of the vasodilation, and the constrictor gains

| | |
| --- | --- |
| **Claim** | The non-splanchnic beds dilate alongside the splanchnic ones; and how far the signal shifts the afferent band, constricts the efferent arteriole and lowers the ultrafiltration coefficient are fixed gains. |
| **Source** | That the vasodilation is not confined to the splanchnic bed is supported — the hyperdynamic circulation is measured as a fall in *systemic* resistance. How it divides between the beds is invented, and so are the four gains. |
| **Implementation** | One conductance multiplier for the systemic limb; four constants for the renal response. |
| **Assumption** | The severity at which the knee falls is a consequence of these numbers and is not a prediction about anybody. The *ordering* they encode — efferent before afferent, afferent shielded until late — is the supported part and is tested externally in claims 6, 8 and 9. |
| **Validation** | `calibration: the systemic limb of the vasodilation sets how far resistance can fall` and `calibration: the four constrictor gains produce a defended phase and then a failing one`. |
| **Confidence** | `vasodilation-split` and `constrictor-gains` (illustrative, calibration). |

### 14. Integrity

| | |
| --- | --- |
| **Claim** | Every flow the model reports equals the pressure drop across the path it names divided by that path's resistance, and the coupled solve reaches a consistent arterial pressure. |
| **Source** | ΔP = Q·R. Arithmetic. |
| **Implementation** | One unknown — the arterial pressure — solved to a fixed point with the splanchnic inflow, the systemic resistance and the vasoconstrictor response all inside the loop. |
| **Assumption** | Steady state. There is no time in this model at all. |
| **Validation** | `integrity: every reported flow equals the drop across its own path`, over a grid of severities, treatments and cardiac reserves. |
| **Confidence** | `pressure-flow-consistency` (established, integrity). |

---

## Known weaknesses, recorded rather than hidden

- **`early-hyperfiltration`** — at low activation the model raises filtration
  slightly above normal before it falls, because efferent constriction acts
  while the afferent arteriole is still shielded. Glomerular hyperfiltration is
  described in compensated cirrhosis, but the model was not calibrated to it and
  the size here is not a prediction. It is reported rather than tuned away,
  because tuning it away would have meant weakening one of the two mechanisms
  that make the later trajectory right. It is also why the external test asserts
  restored *perfusion* at every severity and restored *filtration* only past the
  failure of autoregulation.
- **`no-volume-ceiling`** — volume expansion has no ceiling. Enough albumin
  drives cardiac output and arterial pressure above normal, and the model will
  cheerfully show that improving renal function. In a patient it causes
  pulmonary oedema. Nothing about dose may be read from this.
- **`no-tubule`** — no sodium handling, no urine output, no ascites, no
  dilutional hyponatraemia, and no way to distinguish hepatorenal syndrome from
  prerenal azotaemia or acute tubular necrosis. The differential diagnosis is
  most of what makes the syndrome hard at the bedside and this model cannot help
  with any of it.
