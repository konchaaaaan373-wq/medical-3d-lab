# Evidence — biliary obstruction: where the blockage is

Model: [`src/models/biliaryObstruction.js`](../../src/models/biliaryObstruction.js).
Boundary and failure modes: [`../model-cards/biliary-obstruction.md`](../model-cards/biliary-obstruction.md).
Machine-readable registry: `BILIARY_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

**Almost nothing in this model is a measurement, and it does not need to be.**
What the scene asserts is an ordering — which segments are upstream of which —
and two pieces of physiology on top of it. Everything else is arithmetic once
the order is accepted. So the order is the claim with a real external source,
and the numbers are declared as the calibration they are.

This dossier supports a qualitative account of biliary outflow. **No source
below supports any pressure this model reports as a clinical value, any duct
calibre on screen as a measurement, or any threshold whatsoever.** No row here
rests on a paper this repository could open: the build environment cannot reach
the medical publishers, so nothing was extracted from a figure or a table by its
author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `segment-order` — right and left hepatic ducts join to the common hepatic duct; the cystic duct joins that to form the common bile duct; the common bile duct meets the main pancreatic duct at the papilla; the gallbladder is a dead end off the tree | Standard surgical and radiological anatomy of the extrahepatic biliary tree | `BILE_PATH` contains neither the cystic duct nor the pancreatic duct; the gallbladder is solved as a compliant dead end | The tree is symmetric enough that both hepatic ducts can share one resistance | `physiology: a blockage off the bile path does not reduce what reaches the gut` |
| `pressure-is-downstream-resistance` — at steady flow the pressure at a point is the flow times the resistance still downstream of it | Hydraulics: ΔP = Q·R along a path in series | `pressure[id] = flow × Σ(resistances below id)` | One-dimensional steady flow; no inertia, no pulsatility, no compliance in the ducts themselves | `physiology: a blockage on the bile path raises the pressure above it and not below it` |
| `shared-sphincter` — the sphincter at the papilla is the only resistance the biliary and pancreatic paths have in common | Standard anatomy of the hepatopancreatic ampulla | The two paths are summed separately and share only `resistance.sphincter` | A common channel exists; see `common-channel-assumption` | `physiology: only a blockage at the shared sphincter reaches the pancreatic duct` |
| `secretory-pressure-ceiling` — hepatic bile secretion falls as duct pressure rises and ceases at a maximum secretory pressure of a few tens of centimetres of water | Standard biliary physiology. **thin** — the direction and the existence of a ceiling are textbook; the value used is a calibration | `Q = Qmax·(1 − P/Pmax)` solved against `P = Q·R` | One whole-liver secretion; no bile-salt dependence, no ductular secretion, no vagal or hormonal control | `physiology: secretion gives way against pressure, so a complete blockage is bounded` |
| `gallbladder-time-constant` — whether a gallbladder keeps up with the duct beside it is τ = R·C against the time a meal takes, not an equilibrium | The time constant of a compliant reservoir behind a resistance. The same relation the obstructed-lung model rests on | `τ = resistance.cystic × compliance`; `gallbladderConnected` compares it with a one-hour window | A linear compliance; no active emptying, no cholecystokinin, no filling cycle | `physiology: a gallbladder keeps up with the duct on a time constant, not on an equilibrium` |

## 2. What this repository chose

These are not findings. Each is a value invented or chosen so the mechanism is
legible, and each says so in the registry.

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `duct-resistances` | The four resistances from liver to duodenum, with nearly all of the normal resistance in the sphincter | Calibrated so that an unobstructed common bile duct lands near ten centimetres of water at an ordinary bile flow. No such measurement exists for a person, and no pressure this model reports is a threshold |
| `occlusion-resistance` | What a complete blockage adds to the resistance it sits in | Chosen so that a complete blockage delivers almost nothing. Added rather than multiplied so that "complete" means the same thing at every site. It is not a stone, a stricture or a degree of stenosis |
| `schematic-tree` | The geometry the scene is drawn on | The biliary atlas's own builder, whose header says PROTOTYPE — NOT ANATOMICALLY VALIDATED. Calibres, lengths and angles are drawn to be legible; a dilated segment on screen is a pressure the model solved, not a calibre it computed |

## 3. What this model is known to get wrong

| Id | The direction | What follows |
| --- | --- | --- |
| `common-channel-assumption` | The model gives the two ducts a shared channel at the papilla. That is one of several described arrangements, and where they open separately the ampullary case does not behave as shown | The ampullary step of the guided explanation, and the whole "only this site reaches the pancreatic duct" claim, are conditional on a common channel. The model has no way to be told which arrangement it is looking at, and the model card says so |

## 4. What is outside the model entirely

Not limitations to be improved — subjects this model does not contain.

- **No bilirubin and no jaundice.** The model carries pressures and flows, and
  no pigment. Nothing in it becomes a yellow sclera, a pale stool or a dark
  urine, and nothing in the scene should be read as predicting one.
- **No stone.** There is no object anywhere in this model. A blockage is a
  resistance that rose at a named place.
- **No inflammation and no infection.** Cholecystitis, cholangitis and
  pancreatitis are named nowhere in the model, and a raised pressure here is not
  any of them.
- **No time.** Every state is an equilibrium. The model cannot show a duct
  dilating over days or a gallbladder filling over hours; its only time is the
  cystic duct's time constant, which is a ratio rather than a course.
- **No treatment**, and no consequence of one.

## 5. How to check it

```bash
node --test tests/biliary-physiology.test.js       # Layer 1: the physiology
node --test tests/biliary-obstruction-model.test.js # model integrity, and the geometry pairing
node --test tests/calibration.test.js               # the numbers this repository chose
```
