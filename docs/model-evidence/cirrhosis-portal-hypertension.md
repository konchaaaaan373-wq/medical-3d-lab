# Model evidence — Cirrhosis and portal hypertension

Implementation: [`src/models/portalHypertension.js`](../../src/models/portalHypertension.js)
Boundary of the claim: [`docs/model-cards/cirrhosis-portal-hypertension.md`](../model-cards/cirrhosis-portal-hypertension.md)
Tests: [`tests/portal-hypertension-model.test.js`](../../tests/portal-hypertension-model.test.js), [`tests/portal-hypertension-scene.test.js`](../../tests/portal-hypertension-scene.test.js)

## How these sources were consulted — read this first

This section has been rewritten, and the change matters.

**The model and the teaching text in this scene were corrected against an
external, full-text clinical review.** That review named its sources — Baveno
VII (PMC11090185) and pathophysiology reviews of portal hypertension
(PMC2999290, PMC3971388, PMC3000670) — and it found five real errors, recorded
below and in the model card.

**What has not changed is this repository's own access.** The network this code
is built and tested on still cannot reach PubMed, PMC, the Journal of
Hepatology, Wiley or the Baveno materials. Nothing here was extracted from a
figure, a table or an algorithm by the author of this file, and none has been
reproduced. Where a claim below cites full text, it is citing the external
review's reading of it, and it is doing so for a *proposition* — a causal
order, an interpretation of a measurement, the scope of a threshold — never for
a digit lifted out of a paper.

**Reading a source in full does not turn a calibration into a measurement.**
The three reference resistances, the collateral and shunt resistances, and the
width of the collateral sigmoid were chosen before the review and are still
chosen after it. No measurement of an intrahepatic resistance exists for a
person, and the model does not pretend otherwise.

The confidence behind each claim is machine-readable in
[`src/models/evidence.js`](../../src/models/evidence.js), one of
`established` / `supported` / `calibration` / `illustrative` / `uncertain`, and
`tests/evidence.test.js` checks that every asserted claim names a test that
exists. The `Confidence` row in each table below gives the registry id.

## What the review corrected

**1. The causal order was inverted.** The walk-through said the hyperdynamic
splanchnic circulation "is not a consequence to be noted afterwards, it is a
cause running in parallel". That is wrong. Increased intrahepatic vascular
resistance is the **initiating** mechanism; chronic portal hypertension then
induces splanchnic vasodilation and a hyperdynamic circulation, and the
resulting increase in portal inflow **perpetuates** and worsens the pressure. A
secondary feed-forward loop, not a parallel cause. The walk-through is now
eleven steps in that order and names the two roles explicitly, and it says
plainly that the model is an equilibrium with no time in it, so the order is
supplied by the sequence rather than produced by the solver.

**2. The collateral explanation was over-simplified.** "A collateral is a long,
tortuous, high-resistance channel" was offered as the reason portal
hypertension persists. Some spontaneous portosystemic shunts are wide and carry
very large flows, and those patients still have portal hypertension. The reason
it persists is that the underlying intrahepatic resistance remains high, the
portal inflow remains increased, and a collateral network removes neither.
`COLLATERAL_RESISTANCE_OPEN` is now labelled a calibration constant and
explicitly not evidence for a general property of collaterals.

**3. Collateral development was reading as an instantaneous, pressure-triggered
opening.** It is a chronic process: dilatation of pre-existing embryonic
channels, vascular remodelling and angiogenesis, over months to years. 10 mmHg
is the *clinical* threshold for clinically significant portal hypertension and
for the appearance of varices — not a valve-opening pressure. The function is
renamed `establishedCollateralFraction`, documented as an **illustrative
equilibrium mapping**, and a test asserts that the walk-through step describing
it names the timescale and does not describe an opening event.

**4. The HVPG wording claimed too much.** "The wedged catheter reads sinusoidal
pressure" is now "HVPG = WHVP − FHVP, and in sinusoidal portal hypertension
WHVP *approximates* sinusoidal pressure". It is not a direct measurement of
sinusoidal pressure and it is not a measurement of portal pressure at all.

**5. Portal vein thrombosis was listed as a presinusoidal cause.** It is
**prehepatic** — outside the liver entirely. Presinusoidal intrahepatic causes
are schistosomiasis, porto-sinusoidal vascular disease and the presinusoidal
component of some cholestatic disorders. The two share the consequence for the
measurement, not the anatomy, and the scene now says so rather than listing
them together. Only the presinusoidal intrahepatic pattern is modelled.

Two further changes followed from the same review. The **thresholds** now
follow Baveno VII: above 5 mmHg is portal hypertension, at or above 10 mmHg is
clinically significant portal hypertension, and **12 mmHg is no longer used as
a general decompensation threshold** — it is confined to the classic
association with variceal bleeding and to the post-TIPS haemodynamic target,
and there is no band boundary there at all. And the arbitrary
`presinusoidalShare >= 0.15` cut-off, which dressed an implementation
convenience as a medical criterion, is gone: applicability is now decided by an
explicit named `haemodynamicPattern` — sinusoidal, mixed, or presinusoidal —
each of which declares for itself whether the thresholds apply. The number 0.15
appears nowhere, in the code or in the interface.

---

## Claim → Source → Implementation → Assumption → Validation

### 1. Portal pressure is a network problem, not a number

| | |
| --- | --- |
| **Claim** | Portal hypertension is determined by two factors, vascular resistance and blood flow — `ΔP = Q · R` — with about 90% of cases arising from cirrhotic states. |
| **Source** | Standard hepatology; StatPearls and the Merck Manual's portal hypertension chapters, through summaries. |
| **Implementation** | The portal vein is a node with one inflow (the splanchnic arterioles) and up to three outflows (the liver, collaterals, a shunt). Its pressure is whatever value makes what arrives equal what leaves; every path is `ΔP/R`. |
| **Assumption** | Steady flow, linear resistances, one lumped splanchnic bed, no pulsatility, no cardiac output. The hepatic artery is not modelled at all, so neither is the hepatic arterial buffer response. |
| **Validation** | `flow is conserved at the portal vein, in every configuration` — the check without which every pressure would be meaningless; `every pressure drop is a flow times a resistance`. |
| **Confidence** | `network-law` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 2. Normal portal haemodynamics

| | |
| --- | --- |
| **Claim** | The normal hepatic venous pressure gradient is 1–5 mmHg. Portal venous flow is of the order of a litre a minute. |
| **Source** | HVPG measurement literature (normal 1–5 mmHg is quoted consistently); standard physiology for portal flow. |
| **Implementation** | `REFERENCE` resistances are **calibration constants** chosen so that a healthy liver produces a gradient of about 3 mmHg at about 1000 mL/min. They are not measurements — no such measurement exists for a person — and the code says so. |
| **Assumption** | Mean arterial pressure fixed at 90 mmHg and hepatic vein pressure at 4 mmHg. Both are held constant in every configuration; in a real decompensated patient neither is. |
| **Validation** | `a healthy liver sits where the textbooks put it`, which asserts the gradient is 1–5 mmHg, portal flow 800–1300 mL/min and shunting under 3%. |
| **Confidence** | `reference-resistances` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 3. One mechanism initiates portal hypertension and another perpetuates it

| | |
| --- | --- |
| **Claim** | Increased intrahepatic vascular resistance is the **initiating** event: fibrosis, regenerative nodules and sinusoidal remodelling, plus a dynamic component, raise the resistance to portal outflow and the pressure rises. Chronic portal hypertension then induces splanchnic arteriolar vasodilation and a hyperdynamic circulation; the resulting increase in portal venous inflow **maintains and worsens** the pressure. A secondary feed-forward loop, not two parallel causes. |
| **Source** | Pathophysiology reviews of portal hypertension (PMC2999290, PMC3971388, PMC3000670) through the external review; Baveno VII. |
| **Implementation** | Two independent controls: `structuralResistance` (the scene's main axis) and `splanchnicVasodilation` (a control of its own, which lowers the aorta-to-portal resistance by up to 45%). The model answers the two questions **separately** — what does more resistance do on its own, and what does more inflow do at a fixed resistance — and the walk-through supplies the order over the top of that. |
| **Assumption** | The 45% is illustrative. In the model, splanchnic vasodilation is a control rather than a consequence of the portal pressure; in a person it is a *response* to it. Making it emergent would have needed a nitric-oxide-and-bacterial-translocation loop and a time axis, and the model has neither — so the walk-through states the order explicitly and says that it is doing so. An earlier version of the walk-through instead called the vasodilation "a cause running in parallel", which inverted the sequence, and that is the error this row now exists to prevent recurring. |
| **Validation** | `haemodynamics: raising intrahepatic resistance raises the portal pressure gradient` (with the splanchnic bed normal and no collaterals, so the initiating mechanism acts alone); `haemodynamics: increased inflow at a fixed hepatic resistance raises the gradient too` (asserting the liver does not change); `haemodynamics: the two mechanisms act by different routes` — resistance *lowers* inflow while vasodilation raises it; and `the walk-through puts the initiating mechanism before the perpetuating one`. |
| **Confidence** | `initiating-mechanism` and `perpetuating-mechanism` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 4. Roughly a fifth to a third of the raised intrahepatic resistance is reversible

| | |
| --- | --- |
| **Claim** | The increased intrahepatic resistance in cirrhosis has a structural component (fibrosis, regenerative nodules, sinusoidal remodelling) and a *dynamic* component — activated hepatic stellate cell contraction, reduced intrahepatic nitric oxide, increased endothelin — classically quoted as 20–30% of the total. The dynamic part is why a drug can lower portal pressure at all. |
| **Source** | The pathophysiology reviews above, in which the 20–30% figure is repeated. Marked `supported` rather than thin: the review confirmed the proposition and the range, and the model's way of *expressing* it — as a share of the structural resistance — remains a modelling choice of its own. |
| **Implementation** | `DYNAMIC_SHARE_AT_FULL_TONE = 0.3`, applied as a multiplier on whatever the structure already costs. |
| **Assumption** | Expressing it as a *share of the structural resistance* rather than as a fixed addition is a modelling choice, and it has a consequence worth stating: it makes the dynamic component worth more in a badly scarred liver than in a healthy one. That is the right direction, but the model does not have a source for the size. |
| **Validation** | `the dynamic component is a share of what the structure already costs`, which asserts both the ratio and the consequence. |
| **Confidence** | `dynamic-share` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 5. Collaterals redistribute portal flow and do not remove what is driving the pressure

| | |
| --- | --- |
| **Claim** | Sustained portal hypertension leads to a portosystemic collateral network which carries part of the portal flow to the systemic circulation, bypassing the liver. It may decrease the portal pressure and does not normalise it — because the underlying intrahepatic resistance is still high, the portal inflow is still increased, and a bypass removes neither. **Not** because collaterals are necessarily high-resistance: some spontaneous shunts are wide and carry very large flows. The network develops over months to years by dilatation of pre-existing channels, vascular remodelling and angiogenesis. |
| **Source** | Portosystemic collateral literature (MDCT review of collateral pathways; StatPearls) and the pathophysiology reviews above, through the external review. |
| **Implementation** | A parallel path whose conductance is mapped from the gradient by `establishedCollateralFraction`, a sigmoid centred on 10 mmHg. That makes the system circular (the pressure sets the conductance and the conductance sets the pressure) and is solved by damped iteration. The function's own documentation says at length what the sigmoid is and is not. |
| **Assumption** | Two things are being assumed and they are different. The collateral resistance is a **calibration** constant, chosen so that an established-cirrhosis configuration lands in the reported HVPG range with a large share of the flow diverted; it is not evidence that collaterals are high-resistance in general. The sigmoid is an **illustrative equilibrium mapping**: it says how much collateral conductance a liver that has sat at a given gradient has typically ended up with. Its centre is a *clinical* threshold borrowed as a plausible midpoint, and its width has no source at all. **Nothing opens at a pressure**, and no part of the model or the scene may describe it as doing so. |
| **Validation** | `haemodynamics: collaterals redistribute a great deal of flow and leave the gradient abnormal`; `haemodynamics: the reason the pressure stays up is that nothing generating it has moved`, which asserts that the intrahepatic resistance and the inflow are both untouched; `haemodynamics: ten mmHg is not coded as a law that opens collaterals`, which walks the mapping and rejects any step in it; and `nothing in the walk-through describes collaterals opening at a pressure`. |
| **Confidence** | `collaterals-do-not-decompress`, `collateral-conductance-mapping` and `collateral-and-shunt-resistance` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 6. HVPG approximates the sinusoidal component, and therefore under-reads what lies upstream of it

| | |
| --- | --- |
| **Claim** | HVPG = WHVP − FHVP. In **sinusoidal** portal hypertension the wedged pressure *approximates* sinusoidal pressure: occluding a hepatic vein branch stops flow in it and the static column equilibrates with the sinusoids feeding it. It is therefore not a direct measurement of sinusoidal pressure and not a measurement of portal pressure at all. HVPG is highly sensitive to sinusoidal resistance and relatively insensitive to resistance upstream of the sinusoids, so it systematically under-reads the portal gradient where a substantial part of the resistance sits there. |
| **Source** | HVPG measurement literature, including a 2025 in-vitro study on the asymmetric sensitivity of HVPG to portal versus sinusoidal resistance; Baveno VII, for HVPG as the gold standard in viral and alcohol-related cirrhosis and for the caution against extrapolating the thresholds to predominantly presinusoidal disorders. **Two anatomies are involved and they are not the same.** *Presinusoidal intrahepatic*: schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders including primary biliary cholangitis. *Prehepatic*: portal vein thrombosis, outside the liver altogether. An earlier version of this row listed them together, which was the error. |
| **Implementation** | The intrahepatic resistance is split into a presinusoidal and a sinusoidal segment, in a proportion the named `haemodynamicPattern` declares. The model reports **both** gradients: `portalPressureGradientMmHg` across the whole pathway, and `hepaticVenousPressureGradientMmHg` across the sinusoidal segment alone. Changing the pattern does not change the total resistance, only where it sits. Only the presinusoidal intrahepatic pattern is represented; there is no extrahepatic portal obstruction in the model. |
| **Assumption** | That wedged pressure equals sinusoidal pressure exactly. In reality the equilibration depends on sinusoidal communication, which is itself altered by disease, so WHVP approximates rather than equals it. The model's version is the idealised one, and the scene's prose says "approximates" everywhere the model says "equals". |
| **Validation** | The suite's most important pair: `haemodynamics: HVPG tracks the sinusoidal component and not the presinusoidal one`, and `moving the resistance upstream does not change how much of it there is`. Plus `haemodynamics: the presinusoidal drop sits upstream of the sinusoid in the pressure profile`, which states it on the chart the reader actually looks at, and `haemodynamics: presinusoidal intrahepatic and prehepatic are named as different things`. |
| **Confidence** | `hvpg-approximation` and `presinusoidal-vs-prehepatic` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 7. The clinical thresholds, and where they apply

| | |
| --- | --- |
| **Claim** | Following Baveno VII: an HVPG above 5 mmHg is portal hypertension; ≥ 10 mmHg is **clinically significant portal hypertension**, from which varices, decompensation and hepatocellular carcinoma become substantially more likely, with HVPG the gold standard above all in viral and alcohol-related cirrhosis. **12 mmHg is not a general decompensation threshold.** It belongs to two specific contexts: the classic association between an HVPG of 12 mmHg or more and variceal bleeding, and the post-TIPS target of a portosystemic gradient below 12 mmHg for a shunt placed to treat variceal bleeding. All of these are defined on HVPG and were established in compensated advanced chronic liver disease of sinusoidal aetiology. |
| **Source** | Baveno VII (PMC11090185) through the external review; the TIPS literature for the post-shunt target. |
| **Implementation** | `HVPG_THRESHOLDS` carries 5 and 10; `VARICEAL_CONTEXT` carries 12 with a note confining it. `bandFor()` produces **three** bands — normal, portal hypertension, clinically significant — with no boundary at 12. `clinicalThresholdReading()` reads them **on HVPG only**, and returns `band: null` unless the declared `haemodynamicPattern` says the thresholds apply. The scene then displays "not applicable here" rather than a category. |
| **Assumption** | **This row previously described a 0.15 cut-off on the presinusoidal share, and it has been removed.** There is no such number in the literature; there is a qualitative caution, and expressing it as a numerical comparison put an invented constant one step away from being read as a medical criterion. Applicability is now a property of an explicit named state: each entry in `HAEMODYNAMIC_PATTERNS` declares its own `thresholdsApply`, and the interface shows the pattern's name and never a percentage. The remaining assumption is the honest one — that "mixed" is enough to withhold a reading — and it is a scope decision rather than a threshold. |
| **Validation** | `haemodynamics: the thresholds are Baveno VII's, read on HVPG, and 12 mmHg is not among them`; `haemodynamics: the thresholds are withheld outside sinusoidal portal hypertension`; `there is no band boundary at 12 mmHg, because there is no such general threshold`, which sweeps the whole progression and asserts that only three bands are ever produced; `the haemodynamic pattern is a named state, and each one says for itself whether the thresholds apply`. |
| **Confidence** | `baveno-thresholds` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 8. TIPS

| | |
| --- | --- |
| **Claim** | A TIPS reduces the portosystemic gradient. For a shunt placed to treat variceal bleeding, a post-TIPS gradient below 12 mmHg is the haemodynamic target, and the stent is dilated until the gradient falls below it. This — together with the classic HVPG ≥ 12 mmHg association with variceal bleeding — is the whole of where 12 mmHg belongs. |
| **Source** | TIPS literature, through the external review. |
| **Implementation** | A parallel path with a resistance far below the diseased liver's and below any collateral's — though not below a healthy liver's, because no shunt is. Calibrated so that a fully dilated shunt takes the established-cirrhosis gradient below 12. |
| **Assumption** | The resistance is a calibration constant. The model has no stent diameter, no shunt dysfunction and no time. |
| **Validation** | `haemodynamics: more shunt conductance lowers the gradient, monotonically`; `haemodynamics: a fully dilated shunt reaches the post-TIPS target, and costs hepatic perfusion`, which asserts the gradient falls below 12 **and** that hepatic portal perfusion at least halves. |
| **Confidence** | `twelve-mmhg-context` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

---

## What was deliberately not modelled

Each of these is a place where a plausible number could have been produced and
would have been wrong:

- **Ascites.** It does not follow from portal pressure alone: hepatic lymph
  production and drainage, sinusoidal permeability, hypoalbuminaemia and renal
  sodium handling are all necessary and none of them is here. Generating
  ascites from a pressure is the single most tempting and most wrong thing this
  model could do, and a test asserts it produces no such key.
- **Varices as structures, bleeding risk, and encephalopathy.** The model has
  flows, not consequences. In particular the fall in hepatic perfusion after a
  shunt is reported *as a flow*; what follows from it is not claimed.
- **Liver function of any kind** — no Child-Pugh, no MELD, no albumin, no
  bilirubin, no synthetic function.
- **Cardiac output and systemic haemodynamics.** Mean arterial pressure and
  hepatic vein pressure are held fixed, which in decompensated cirrhosis they
  are not.
- **The hepatic artery** and its buffer response, which is a real compensation
  for falling portal flow.
- **Time.** Every state is an equilibrium. Nothing here takes years, or
  minutes.

## A known direction the model gets one-sided

**Two different questions, and the model answers them differently on purpose.**

Along this scene's own axis — progressive intrahepatic scarring — hepatic
portal perfusion **falls**, which is the clinical direction, and
`haemodynamics: hepatic portal perfusion falls as the liver scars` asserts it at
every step of the progression. That matters because portal flow through the
liver is a headline read-out, and a known-wrong direction must never be the
number a reader is watching while they drag the main slider.

Raise **splanchnic vasodilation on its own**, holding the hepatic resistance
fixed, and hepatic portal perfusion rises instead. That is not a bug: a larger
gradient across an unchanged resistance is more flow, and there is no version of
`ΔP = Q·R` in which it is not. What the model does not carry is what makes
perfusion fall in a real cirrhotic liver *despite* the hyperdynamic
circulation — progressive obliteration of the intrahepatic vascular bed, and
collaterals growing faster than the inflow.

The distinction is recorded here, in the model card, in the scene's scope
panel and in the confidence registry as `perfusion-under-isolated-vasodilation`,
rather than left for a reader to trip over.
