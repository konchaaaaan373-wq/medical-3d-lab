# Model evidence — Cirrhosis and portal hypertension

Implementation: [`src/models/portalHypertension.js`](../../src/models/portalHypertension.js)
Boundary of the claim: [`docs/model-cards/cirrhosis-portal-hypertension.md`](../model-cards/cirrhosis-portal-hypertension.md)
Tests: [`tests/portal-hypertension-model.test.js`](../../tests/portal-hypertension-model.test.js), [`tests/portal-hypertension-scene.test.js`](../../tests/portal-hypertension-scene.test.js)

## How these sources were consulted

**Read this first.** The network this repository was built on blocks the
medical publishers — PubMed, PMC, Journal of Hepatology, Wiley and the rest are
unreachable from here. Every source below was reached through **search-result
summaries and abstracts, not full text.** Baveno VII itself was not read; the
thresholds used are the ones stated in ordinary prose in many secondary
sources.

**No guideline figure, table or algorithm has been reproduced.** What is used
is a small number of numerical thresholds that appear as plain statements in
many places, plus standard physiology. That is a deliberate limit and it is
also why the scene withholds a threshold reading rather than extending one.

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

### 2. Normal portal haemodynamics

| | |
| --- | --- |
| **Claim** | The normal hepatic venous pressure gradient is 1–5 mmHg. Portal venous flow is of the order of a litre a minute. |
| **Source** | HVPG measurement literature (normal 1–5 mmHg is quoted consistently); standard physiology for portal flow. |
| **Implementation** | `REFERENCE` resistances are **calibration constants** chosen so that a healthy liver produces a gradient of about 3 mmHg at about 1000 mL/min. They are not measurements — no such measurement exists for a person — and the code says so. |
| **Assumption** | Mean arterial pressure fixed at 90 mmHg and hepatic vein pressure at 4 mmHg. Both are held constant in every configuration; in a real decompensated patient neither is. |
| **Validation** | `a healthy liver sits where the textbooks put it`, which asserts the gradient is 1–5 mmHg, portal flow 800–1300 mL/min and shunting under 3%. |

### 3. Portal hypertension has two causes, and they add

| | |
| --- | --- |
| **Claim** | Raised intrahepatic resistance is the initiating factor; splanchnic arteriolar vasodilation and the resulting increase in portal venous inflow maintain and worsen it. Both are needed to explain the pressures measured. |
| **Source** | Standard hepatology, through summaries. |
| **Implementation** | Two independent controls: `structuralResistance` (the scene's main axis) and `splanchnicVasodilation` (a control of its own, which lowers the aorta-to-portal resistance by up to 45%). |
| **Assumption** | The 45% is illustrative. In the model, splanchnic vasodilation is a control rather than a consequence of the portal pressure; in a person it is largely a *response* to it. Making it emergent would have needed a bacterial-translocation-and-nitric-oxide loop the model does not have. |
| **Validation** | `both halves raise the pressure: more resistance, and more flow arriving`, which also asserts that the two act by different routes — resistance *lowers* inflow while vasodilation raises it. |

### 4. Roughly a fifth to a third of the raised intrahepatic resistance is reversible

| | |
| --- | --- |
| **Claim** | The increased intrahepatic resistance in cirrhosis has a structural component (fibrosis, regenerative nodules, sinusoidal remodelling) and a *dynamic* component — activated hepatic stellate cell contraction, reduced intrahepatic nitric oxide, increased endothelin — classically quoted as 20–30% of the total. The dynamic part is why a drug can lower portal pressure at all. |
| **Source** | Standard hepatology, through summaries. **Thin** — the 20–30% figure is widely repeated but no primary source was reachable. |
| **Implementation** | `DYNAMIC_SHARE_AT_FULL_TONE = 0.3`, applied as a multiplier on whatever the structure already costs. |
| **Assumption** | Expressing it as a *share of the structural resistance* rather than as a fixed addition is a modelling choice, and it has a consequence worth stating: it makes the dynamic component worth more in a badly scarred liver than in a healthy one. That is the right direction, but the model does not have a source for the size. |
| **Validation** | `the dynamic component is a share of what the structure already costs`, which asserts both the ratio and the consequence. |

### 5. Collaterals divert a great deal of blood and do not decompress the portal system

| | |
| --- | --- |
| **Claim** | Increased portal pressure leads to portosystemic collaterals which shunt part of the portal flow to the systemic circulation, bypassing the liver; they may slightly decrease portal pressure but do not normalise it. |
| **Source** | Portosystemic collateral literature (MDCT review of collateral pathways; StatPearls), through summaries. |
| **Implementation** | A parallel path whose resistance when fully open is **larger than the healthy liver's** — collaterals are long, tortuous and high-resistance. They open as a sigmoid in the gradient around a threshold of 10 mmHg, which makes the system circular (the pressure opens the collaterals and the collaterals set the pressure) and is solved by damped iteration. |
| **Assumption** | The collateral resistance and the sharpness of the opening are calibration constants, chosen so that the established-cirrhosis state lands in the reported HVPG range with more than half the flow diverted. The threshold of 10 mmHg comes from the clinical literature; the sigmoid's width does not. |
| **Validation** | `collaterals open above a gradient of about ten, not below`; `collaterals carry a great deal of flow and still do not decompress the portal vein`, which asserts both halves — that they take a real bite out of the pressure *and* leave it clearly abnormal. |

### 6. HVPG measures sinusoidal pressure, and therefore under-reads presinusoidal disease

| | |
| --- | --- |
| **Claim** | HVPG is wedged minus free hepatic venous pressure. WHVP reflects hepatic **sinusoidal** pressure and not portal pressure itself; HVPG is highly sensitive to sinusoidal resistance and relatively insensitive to portal venous resistance, so it systematically under-estimates presinusoidal portal hypertension. |
| **Source** | HVPG measurement literature, including a 2025 in-vitro study explicitly on the asymmetric sensitivity of HVPG to portal versus sinusoidal resistance; the standard caution that the Baveno thresholds should not be extrapolated to predominantly presinusoidal disorders such as portal vein thrombosis, schistosomiasis or porto-sinusoidal vascular disease. |
| **Implementation** | The intrahepatic resistance is split into a presinusoidal and a sinusoidal segment by the `presinusoidalShare` control. The model reports **both** gradients: `portalPressureGradientMmHg` across the whole pathway, and `hepaticVenousPressureGradientMmHg` across the sinusoidal segment alone. Moving the share does not change the total resistance, only where it sits. |
| **Assumption** | That wedged pressure equals sinusoidal pressure exactly. In reality wedging measures a static column whose relationship to sinusoidal pressure depends on sinusoidal communication, which is itself altered by disease. The model's version is the idealised one. |
| **Validation** | The suite's most important pair: `in a presinusoidal liver, HVPG under-reads the gradient badly — and the gradient is unchanged`, and `moving the resistance upstream does not change how much of it there is`. |

### 7. The clinical thresholds, and where they apply

| | |
| --- | --- |
| **Claim** | HVPG ≥ 10 mmHg is clinically significant portal hypertension and predicts complications; ≥ 12 mmHg is associated with decompensating events including variceal bleeding. These are defined on HVPG and were established in compensated advanced chronic liver disease of sinusoidal aetiology. |
| **Source** | HVPG and Baveno VII literature, through summaries. |
| **Implementation** | `clinicalThresholdReading()` reads the thresholds **on HVPG only**, and returns `band: null` when `presinusoidalShare ≥ 0.15`. The scene then displays "not applicable here" rather than a category. |
| **Assumption** | The 0.15 cut-off for "presinusoidal enough to withhold the reading" is arbitrary and conservative. There is no such number in the literature; there is a qualitative caution, and this is a way of honouring it. |
| **Validation** | `the clinical thresholds are refused outside what they were established in`; `the thresholds are read on HVPG, never on the model's own gradient`. |

### 8. TIPS

| | |
| --- | --- |
| **Claim** | A TIPS reduces the portosystemic gradient; a post-TIPS gradient below 12 mmHg is the threshold most consistently associated with protection from variceal bleeding and ascites. The stent is dilated until the gradient falls below it. |
| **Source** | TIPS literature, through summaries. |
| **Implementation** | A parallel path with a resistance far below the diseased liver's and below any collateral's — though not below a healthy liver's, because no shunt is. Calibrated so that a fully dilated shunt takes the established-cirrhosis gradient below 12. |
| **Assumption** | The resistance is a calibration constant. The model has no stent diameter, no shunt dysfunction and no time. |
| **Validation** | `a shunt does what collaterals cannot, and the price is in the flows`, which asserts the gradient falls below 12 **and** that hepatic portal perfusion at least halves. |

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

## A known direction the model gets wrong

Hepatic portal perfusion in this model **rises** with splanchnic vasodilation,
because a higher gradient across a fixed resistance drives more flow. In a real
cirrhotic liver portal perfusion usually falls. What would make it fall —
progressive intrahepatic vascular obliteration, and the diversion of flow into
collaterals growing faster than the inflow — is only partly represented here.
This is stated in the scene's scope panel rather than left for a reader to
notice.
