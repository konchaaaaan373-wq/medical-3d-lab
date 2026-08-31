# Model evidence — Hepatorenal syndrome

Implementation: [`src/models/hepatorenal.js`](../../src/models/hepatorenal.js)
Boundary of the claim: [`docs/model-cards/hepatorenal-syndrome.md`](../model-cards/hepatorenal-syndrome.md)
Tests: [`tests/hepatorenal-physiology.test.js`](../../tests/hepatorenal-physiology.test.js) (external),
[`tests/hepatorenal.test.js`](../../tests/hepatorenal.test.js) (integrity),
[`tests/calibration.test.js`](../../tests/calibration.test.js) (calibration)

## What this model is, and what it is not — read this first

**This model deliberately isolates the haemodynamic and neurohumoral component
of HRS-AKI. Structural kidney injury is not represented in this model; that is a
modelling boundary, not a claim that real HRS-AKI never contains kidney injury.**

The 2024 ADQI–ICA joint consensus (Nadim MK et al., *J Hepatol* 2024;81:163–183,
PMID 38527522, DOI 10.1016/j.jhep.2024.03.031) is the source of truth for what
HRS-AKI is here. It describes an AKI **phenotype** specific to advanced cirrhosis
with ascites, and — this is the part an earlier version of this dossier got
wrong — it can be present alongside **tubular injury, proteinuria and
pre-existing chronic kidney disease**, and alongside **other mechanisms of AKI**
in the same patient. The current criteria are:

- cirrhosis with ascites;
- meeting AKI criteria;
- no improvement within 24 hours of adequate volume resuscitation, **where
  resuscitation is clinically indicated**;
- no strong alternative explanation as the primary cause.

Forty-eight hours of systematic albumin administration is **not** a required
diagnostic step, and the absence of structural kidney disease is **not** an
absolute condition. The first version of this scene stated both as if they were,
and both are gone.

The question this model can answer is narrower than the syndrome:

> **How far can circulatory and neurohumoral changes alone take glomerular
> filtration, in a kidney this model gives no injury to?**

There is no ascites in this model either, so the defining clinical context of the
phenotype is also absent. It is a mechanism model, not a diagnostic one.

## How these sources were consulted

**This repository's network cannot reach PubMed, PMC, the Journal of
Hepatology, the EASL or AASLD guideline documents, or the International Club of
Ascites materials.** Nothing in this file was extracted from a figure, a table
or an algorithm, and nothing has been reproduced. The sources named below are
cited for **propositions** — a causal order, a mechanism, a direction, a
definition, the existence of a treatment effect — and never for a digit.

**Primary sources for the current definition and pathophysiology:**

1. **Nadim MK et al.** Acute kidney injury in patients with cirrhosis: ADQI and
   ICA joint multidisciplinary consensus meeting. *J Hepatol.*
   2024;81:163–183. PMID 38527522, DOI 10.1016/j.jhep.2024.03.031.
2. **Khemichian S, Nadim MK, Terrault NA.** Update on Hepatorenal Syndrome:
   From Pathophysiology to Treatment. *Annu Rev Med.* 2025;76:373–387.
   DOI 10.1146/annurev-med-050223-112947.
3. **Ruiz-del-Arbol L et al.** Circulatory function and hepatorenal syndrome in
   cirrhosis. *Hepatology.* 2005. PMID 15977202.

Earlier reviews are still cited below where they carry a mechanism, but **where
the definition is concerned the 2024 consensus takes precedence over all of
them.**

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

## What moved out of the external layer, and why

A second audit applied this file's own definition strictly. The test that
decides the layer is not "does this assertion contain a repository constant as a
literal" — it is:

> **If this assertion failed, could I honestly say the medicine was wrong?**

Several tests cleared the first bar and failed the second. Two came out of the
external layer entirely and five were narrowed. **The external layer went from
fourteen tests to twelve, and that is the point: a small pure layer is worth
more than a large mixed one.**

| Was external | What it was really asserting | Now |
| --- | --- | --- |
| the model carries no structural injury term, and says so | a contract between the model, the scope panel and the scene | `integrity: the model has no structural injury term and the scene says so in both languages` |
| removing the vasoconstrictor signal restores renal perfusion at any severity | a counterfactual **this repository invented**, walked along a path **this repository chose** | external keeps `physiology: raising vasoconstrictor tone lowers renal perfusion`; the semantics are `integrity: the counterfactual changes the activation and nothing else`; the path is `calibration: the counterfactual improves perfusion at every step, and filtration only past a later crossover` |
| the model can reach renal failure with a falling cardiac output | a **capability of a parameterisation** — "the model can" is never a fact about people | external keeps `physiology: an impaired cardiac response deepens the underfilling and lowers filtration`; the capability is `calibration: the reserve control can drive a low-output path into the failing renal phase` |
| blocking the afferent shield worsens filtration **without touching the circulation** | half medicine, half a model isolation — and the second half is false of real NSAIDs | external keeps `physiology: inhibiting the afferent prostaglandin shield lowers renal perfusion and filtration`; the isolation is `integrity: prostaglandin inhibition acts only on the kidney` |
| a splanchnic vasoconstrictor improves filtration by way of the circulation | strict monotonicity across a whole slider, including a strictly falling cardiac output — not a clinical invariant | external keeps `physiology: a splanchnic vasoconstrictor can raise arterial pressure and improve filtration`; the wiring is `integrity: the treatment control acts through the circulation rather than editing the kidney`; the monotonicity is `calibration: the treatment slider improves pressure and filtration monotonically across its range` |
| arterial underfilling activates the vasoconstrictor systems | strict monotonicity along the **chosen severity axis** | external perturbs the activation function directly; the axis is `calibration: underfilling and activation rise at every step of the chosen axis` |
| a fall in systemic resistance the heart does not fully offset lowers arterial pressure | the arithmetic is external, but it was walked along the chosen axis | external asserts the arithmetic alone; the axis is `calibration: pressure falls at every step of the chosen progression axis` |

The other calibration entries that came out of this pass are
`low-output-capability`, `activation-along-the-axis`, `counterfactual-along-the-axis`,
`treatment-monotonicity` and `pressure-along-the-axis`; the integrity ones are
`counterfactual-semantics`, `prostaglandin-no-systemic-action` and
`treatment-acts-through-the-circulation`.

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

The scene exists for one question: **how far can circulatory and neurohumoral
changes alone take glomerular filtration, in a kidney this model gives no injury
to?** Everything else in the model is there to make that question answerable.

**There is no structural injury variable.** Renal haemodynamics change through
the afferent and efferent arteriolar resistances and through a reversible,
activation-dependent reduction in the effective ultrafiltration coefficient
(mesangial contraction). `BOWMAN_PRESSURE` and `PLASMA_ONCOTIC_PRESSURE` are
constants and `KF` is a constant the activation scales; nothing is damaged.

An earlier version of this paragraph said "the only things that move are two
arteriolar resistances", which was untrue of the code — `filtrationCoefficient`
moves too — and is corrected above.

`kidneyWithoutTheSignal` re-solves the same kidney at the same arterial pressure
with the activation set to zero. In that counterfactual:

- **renal perfusion improves at every severity**, because both resistances are
  monotonic in the activation;
- **glomerular filtration improves only past a crossover that lies some way
  *beyond* the failure of autoregulation** — the two positions are distinct,
  and an earlier version of this dossier treated them as one;
- **before that crossover it does not**, because efferent constriction is
  supporting filtration while the afferent arteriole is still shielded, and
  removing the signal takes that support away.

An earlier version said "set that signal to zero at any disease severity and
filtration returns". The tests contradicted it and it is gone.

What the counterfactual measures is **how much of the fall this model's
circulation is responsible for**. It is not a measure of how much of a patient's
fall is reversible, because this model was given no irreversible part to weigh
it against.

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
| **Claim** | The systemic beds are in parallel. **Holding the conductances of the other beds constant**, raising the conductance of one of them lowers total systemic vascular resistance. |
| **Source** | Conductances in parallel add. Arithmetic applied to standard anatomy. |
| **Implementation** | The splanchnic conductance comes from the portal model's solved inflow; everything else is one lumped conductance, defined as whatever is left once the healthy splanchnic circulation has taken its share of the reference output. |
| **Assumption** | Two beds, both linear, no pulsatility, no regional autoregulation outside the kidney. |
| **Validation** | `physiology: with the other beds held fixed, opening one of them lowers total resistance` — the law with its qualifier, plus the converse: if the other beds constrict hard enough, total resistance *rises* even though one bed has opened. |
| **Confidence** | `parallel-beds` (established, external). |

**The qualifier was missing and the claim was false without it.** The first
version said "whatever the others do", and asserted the fall through the full
coupled model — where the other beds are actively constricting and whether the
total still falls depends on `SYSTEMIC_CONSTRICTION_GAIN`, a number this
repository chose. That outcome has moved to the calibration layer:

| | |
| --- | --- |
| **Claim** | In this model the compensatory constriction is not strong enough to reverse the fall, so total resistance still falls as the splanchnic bed opens. |
| **Source** | A consequence of two chosen gains. |
| **Validation** | `calibration: the constriction gain leaves the resistance fall intact` — which also checks that the compensation is doing *something*, so the test is not vacuous. |
| **Confidence** | `net-resistance-fall` (calibration). |

A test containing no repository constant as a literal is **not** thereby an
external test. What decides the layer is whether the *result* depends on
repository-selected gains, and this one did.

### 3. The hyperdynamic circulation, and what is *not* a law about it

The first version of this section asserted, as a single external invariant along
the whole trajectory, that *worsening cirrhosis raises cardiac output and still
lowers arterial pressure*. That overstated it. **Ruiz-del-Arbol et al.**
(*Hepatology* 2005, PMID 15977202) found cardiac output **falling** at the onset
of hepatorenal syndrome; cardiac reserve failing is itself a route into the
syndrome. The claim is now three, in two layers.

| | |
| --- | --- |
| **Claim** | Mean arterial pressure is cardiac output times systemic vascular resistance. A fall in resistance the heart does not fully offset lowers arterial pressure. |
| **Source** | ΔP = Q·R. Arithmetic. |
| **Validation** | `physiology: a fall in systemic resistance the heart does not fully offset lowers arterial pressure` — the identity asserted on every solved state, then the direction. |
| **Confidence** | `incomplete-compensation` (established, external). |

| | |
| --- | --- |
| **Claim** | Cirrhosis is characterised by a hyperdynamic circulation — reduced systemic resistance with increased cardiac output — and the increase does not restore arterial pressure. **It is not established that cardiac output goes on rising into HRS-AKI**; at its onset, output has been observed to fall. |
| **Source** | Ruiz-del-Arbol 2005 (PMID 15977202); Khemichian 2025 (DOI 10.1146/annurev-med-050223-112947); earlier reviews (PMC5904971, PMC6182055, PMC3959227). |
| **Implementation** | `CO = CO_ref · (SVR_ref / SVR)^exponent`, `0 < exponent < 1`. `cardiacReserve` scales the exponent, and at its floor produces the low-output path. |
| **Assumption** | There is no heart in this model. No Starling curve, no contractility, no chamber, no rate. |
| **Validation** | `physiology: the model can reach renal failure with a falling cardiac output, not only a rising one` — that the other path exists and ends in worse renal function. |
| **Confidence** | `hyperdynamic-circulation` (supported, external). |

| | |
| --- | --- |
| **Claim** | With cardiac reserve intact, **this model's** progression axis raises cardiac output at every step. |
| **Source** | No source. A consequence of the invented compensation exponent. |
| **Validation** | `calibration: the default path raises cardiac output and the reserve control can reverse it`; the exponent's own magnitude is in `calibration: the cardiac compensation exponent sets how far pressure falls for a given dilation`. |
| **Confidence** | `rising-output-path` (illustrative, calibration) and `cardiac-compensation-exponent` (illustrative, calibration). |

The scene's own copy says the same thing: the rising-output path is the model's
default, not a rule, and lowering the cardiac reserve reaches the same renal
failure with the output falling.

### 4. Arterial underfilling activates the vasoconstrictor systems

| | |
| --- | --- |
| **Claim** | The reduction in effective arterial blood volume that follows arterial vasodilation activates the renin-angiotensin-aldosterone system, the sympathetic nervous system and vasopressin. |
| **Source** | Schrier's peripheral arterial vasodilation hypothesis, and the reviews above. |
| **Implementation** | One dimensionless index between 0 and 1, a saturating function of the shortfall in arterial perfusion pressure. The dilation that causes the shortfall is reported separately as `arterialUnderfilling`, so cause and consequence are both visible. |
| **Assumption** | One index for five hormones and a nerve supply. It is not a renin activity, not a noradrenaline level, has no units, and must never be displayed as a concentration. **Effective arterial blood volume is not a single measurable quantity, so this model does not compute one: the arterial pressure deficit is used as the observable proxy driving the aggregate neurohumoral activation signal, and systemic vasodilation is the upstream cause of that deficit.** An earlier version of the model header said the driver was the fall in systemic resistance while the code read the pressure deficit; the code was right and the prose is now aligned to it. |
| **Validation** | `physiology: arterial underfilling activates the vasoconstrictor systems` — that both rise together, and that a normal circulation activates nothing. The shape of the curve is in `calibration: the activation curve is a saturating function of the pressure deficit`. |
| **Confidence** | `arterial-underfilling` (supported, external) and `activation-curve` (illustrative, calibration). |

### 5. The reversible vasoconstrictor component — and the boundary around it

| | |
| --- | --- |
| **Claim** | A substantial part of the renal failure in HRS-AKI is **reversible renal vasoconstriction rather than fixed injury**: it improves when the circulation is treated, and it resolves after liver transplantation. |
| **Source** | Khemichian 2025 (DOI 10.1146/annurev-med-050223-112947); Nadim 2024 (PMID 38527522). |
| **Implementation** | `solveKidney` is a pure function of an arterial pressure and the signal. Nothing about the liver reaches it. `kidneyWithoutTheSignal` re-solves it with the signal set to zero. |
| **Assumption** | This model has **no** injury term, so it isolates the reversible component and can say nothing about the rest, nor weigh one against the other. |
| **Validation** | `physiology: raising vasoconstrictor tone lowers renal perfusion` — the direction, perturbed on the kidney at a fixed arterial pressure. The counterfactual's semantics are `integrity: the counterfactual changes the activation and nothing else`; what it produces along the chosen axis is `calibration: the counterfactual improves perfusion at every step, and filtration only past a later crossover`. |
| **Confidence** | `reversible-vasoconstrictor-component` (supported, external). |

**This claim used to be much stronger and it was wrong.** It read: *hepatorenal
syndrome is functional renal vasoconstriction in a structurally near-normal
kidney.* The 2024 consensus does not support that generalisation — tubular
injury, proteinuria and pre-existing CKD may all be present, and other
mechanisms of AKI may coexist. What survives is the narrower claim above.

| | |
| --- | --- |
| **Claim** | The absence of structural kidney injury here is a **boundary of the model**. Real HRS-AKI may occur with tubular injury, proteinuria or pre-existing CKD, and alongside other mechanisms of AKI. |
| **Source** | Nadim 2024 (PMID 38527522). |
| **Implementation** | Nothing — that is the point. The claim is enforced on the *copy*: the title, subtitle, disclaimer and scope panel each say it, in both languages. |
| **Validation** | `physiology: the model carries no structural injury term, and says so rather than implying there is none to carry`. |
| **Confidence** | `modelling-boundary-not-a-claim` (supported, external). |

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

### 9. The prostaglandin shield — and what this model does *not* claim about NSAIDs

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
| **Claim** | A splanchnic vasoconstrictor with albumin raises arterial pressure, reduces vasoconstrictor activation and **can** improve renal function. It acts on the circulation rather than on the kidney. **It does not work in everyone: reported resolution is of the order of 40–50%.** |
| **Source** | Khemichian 2025 (DOI 10.1146/annurev-med-050223-112947); Nadim 2024 (PMID 38527522). |
| **Implementation** | `terlipressin` subtracts from the splanchnic vasodilation — the same variable the disease works through — and nothing else. `albumin` raises cardiac output at a given resistance. |
| **Assumption** | Effect sizes are invented, and **every dose works here, every time**. There are no non-responders. The scene's copy says the arm demonstrates the direction the model predicts and not a guaranteed clinical response. No dose, duration, response probability, mortality benefit or adverse effect may be read off this — terlipressin's ischaemic complications have no representation at all. Albumin is preload here and not oncotic pressure, so hypoalbuminaemia does not affect filtration in this model, which is a real omission. |
| **Validation** | `physiology: a splanchnic vasoconstrictor improves filtration by way of the circulation` — pressure up, activation down, filtration up, the hyperdynamic circulation settling back rather than being driven harder, and the kidney reproduced exactly by `solveKidney` on the new pressure and signal. |
| **Confidence** | `splanchnic-vasoconstrictor-treatment` (supported, external), `treatment-acts-through-the-circulation` (established, integrity), `treatment-monotonicity` (illustrative, calibration) and `treatment-effect-sizes` (illustrative, calibration). |

The external assertion is that the treatment **can** raise arterial pressure and
improve filtration, checked between an untreated state and a treated one. That
it acts *through the circulation* — never writing a renal resistance, a
filtration coefficient or a filtration rate — is integrity. That every step of
the slider moves every read-out in one direction is calibration: strict
monotonicity across a whole slider is not a clinical invariant, and an earlier
version of this repository asserted it as one.

### 10a. The splanchnic bed does not stop responding — it stays disproportionately dilated

The first version of this dossier and of the model header said the vasoconstrictor
systems "constrict every bed that will listen — and the splanchnic bed will
not". That is too strong, and it sits oddly beside a treatment arm that
constricts the splanchnic bed on purpose. What the literature describes is that
**the splanchnic circulation remains disproportionately vasodilated despite
endogenous vasoconstrictor activation.**

**Model simplification:** the endogenous activation is not fed back into the
splanchnic resistance at all. The disproportion is therefore built in rather
than emergent, and the model cannot show it being overcome by endogenous tone.

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

### 15. The chosen path, and what depends on it

Five entries exist only to hold what this repository's own axis and sliders do,
so that none of it can be mistaken for a finding: `pressure-along-the-axis`,
`activation-along-the-axis`, `counterfactual-along-the-axis`,
`low-output-capability` and `treatment-monotonicity`.

The counterfactual entry carries a correction worth stating plainly. The
**knee** — where the afferent arteriole runs out of dilating room — and the
**crossover** — where removing the vasoconstrictor signal stops *lowering*
filtration and starts raising it — are two different positions on the axis, and
the crossover is the later of the two. Two earlier versions of this dossier
conflated them, and the calibration test now asserts the ordering rather than an
identity.

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
