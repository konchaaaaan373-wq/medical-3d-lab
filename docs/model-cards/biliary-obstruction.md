# Model card — biliary obstruction: where the blockage is

| | |
| --- | --- |
| **Scene ID** | `biliary-obstruction` |
| **Route** | `#/biliary-obstruction` |
| **Model** | [`src/models/biliaryObstruction.js`](../../src/models/biliaryObstruction.js) |
| **Evidence** | [`../model-evidence/biliary-obstruction.md`](../model-evidence/biliary-obstruction.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

Given a blockage at one place in the biliary tree, which parts of the tree are
behind it — and which are not?

Not "how bad is it". The question is about topology, which is why biliary
obstruction is taught by site: a stone in the cystic duct and a stone in the
common bile duct are not a mild and a severe version of one thing.

## 2. Model type

A deterministic four-resistance duct model at steady state. Bile leaves the
liver against a back-pressure and its secretion falls as that pressure rises,
stopping at a ceiling. The pancreatic duct is a second path of the same shape
sharing only the sphincter at the papilla. The gallbladder is a compliant dead
end reached through the cystic duct.

**It is a scenario model, not a severity model.** The site is a choice and the
axis is how complete the blockage is — the same shape the renal scene uses.
Selecting one site after another is a reader comparing mechanisms.

## 3. What it is not

It is not a bilirubin, jaundice, pain, inflammation, infection, stone,
enzyme, imaging or treatment model. It contains no diagnosis: nothing in it
becomes cholecystitis, cholangitis or pancreatitis. It has no time in it, so it
cannot show a duct dilating over days or a gallbladder filling over hours.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `site` | `none`, `cystic-duct`, `common-bile-duct`, `ampulla` | Which resistance the blockage sits in. Four alternatives, not four stages |
| `completeness` | 0–1 | How complete that blockage is. Quadratic, so most of the change is near the end |
| `hepaticSecretion` | ×0.5–1.6 | Bile the liver would secrete at zero back-pressure |
| `pancreaticSecretion` | ×1–4 | Pancreatic juice, rest to a meal |

`occlusionResistance` is what a complete blockage **adds** to the resistance it
sits in. It is added rather than multiplied so that "complete" means the same
thing wherever the blockage is — a stone is the same stone wherever it lodges.

## 5. Outputs

- Pressure in each named duct segment, and in the gallbladder
- Which segments are behind the blockage, **read from those pressures** rather
  than from a table of sites
- Bile and pancreatic juice reaching the duodenum, absolute and as fractions
- Gallbladder volume, and the cystic duct's time constant (τ = R·C)
- Whether the gallbladder is keeping up with the duct over the time a meal takes

## 6. State variables

None over time. `solveBiliaryObstruction()` is a pure equilibrium mapping. The
one time in the model is the gallbladder's time constant, which is a ratio of
two of its own parameters and not a course.

## 7. Governing relations

```text
Q      = Qmax · (1 − P/Pmax),  P = Q·R   ⇒  Q = Qmax / (1 + Qmax·R/Pmax)
P(node)= Q · Σ(resistances still downstream of that node)
R(site)= R₀ + occlusionResistance · completeness²      (that site only)
τ(gb)  = R(cystic) · C(gallbladder)
```

The duodenum is the zero of pressure. Both paths are solved separately and share
only `R(sphincter)`.

## 8. Constants and calibration

The four resistances are the numbers that put an unobstructed common bile duct
near ten centimetres of water at an ordinary bile flow, with nearly all of the
normal resistance in the sphincter. The maximum secretory pressure is a textbook
central value. **None is measured, none is fitted, and no figure the model
reports is a threshold for anything.**

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/biliaryObstruction.js`) and handed out by
`getVisualMapping()`, per channel, with what it must not be read as:

- A segment is drawn **wider** when the model says its pressure has risen above
  its own unobstructed value. **The drawn calibre is not a duct diameter** —
  this model has a resistance and a pressure and no lumen at all, and nothing
  here is a threshold for dilatation.
- The gallbladder is drawn larger as the volume the model solves rises, and
  stays put when the model says it is cut off. Read millilitres from the
  read-out, not from the screen.
- The streams run on the paths the model actually solves, at rates read from the
  flows. Speed and density are presentation.
- The marker shows **which resistance the reader raised**. It is not a stone, and
  nothing here located anything.

## 10. Known failure modes

- One resistance stands for both hepatic ducts, so the model cannot represent a
  blockage of one of them.
- A linear gallbladder compliance, with no active emptying and no filling cycle.
- No ductular secretion, no bile-salt dependence, no hormonal or vagal control
  of either secretion.
- The common channel at the papilla is assumed. See §13.

## 11. Where it will mislead

**Ducts swell on this screen and the model has no diameter in it.** That is the
single most likely misreading, and the visual mapping declaration exists for it.

The four sites can look like a course of events if they are stepped through in
order. They are alternatives. A reader who moves from the cystic duct to the
common bile duct has changed the question, not advanced a disease.

And a raised pressure here is a raised pressure. It is not jaundice, not pain
and not infection, none of which this model contains.

## 12. Safety boundary

Never use the model to diagnose biliary obstruction, locate a blockage in a
person, infer bilirubin or liver tests, interpret imaging, predict
cholecystitis, cholangitis or pancreatitis, or choose or time any intervention.

## 13. Uncertainty

The model gives the common bile duct and the main pancreatic duct a shared
channel at the papilla, which is what makes an ampullary blockage obstruct both.
That arrangement is one of several described, and where the two open separately
the ampullary case does not behave as shown. **The model has no way to be told
which arrangement it is looking at**, and its ampullary claim is conditional on
the one it assumes.

## 14. Evidence and review

The dossier records the ordering as the claim with a real external source, and
declares the resistances, the occlusion resistance and the geometry as things
this repository chose. Independent clinical sign-off has not been recorded; the
public review state is `pending`.

## 15. Verification

```bash
node --test tests/biliary-physiology.test.js
node --test tests/biliary-obstruction-model.test.js
node --test tests/calibration.test.js
```

The physiology tests fix the propositions the scene exists to teach: a blockage
off the bile path costs the gut nothing, a blockage on it pressurises everything
above and nothing below, only the shared sphincter reaches the pancreatic duct,
secretion gives way so a complete blockage is bounded, and the gallbladder keeps
up on a time constant rather than an equilibrium. The integrity tests hold the
model's segment names to the structures the biliary atlas actually draws.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene
(`src/data/patientGuides.js`, id `biliary-obstruction`). It walks the same
sites, and it is written as a set of alternatives rather than a sequence — the
axis stands still whenever the site changes, which
`tests/pathology-guides.test.js` holds directly.

It stops where §12 does. No step names a stone, a diagnosis, an operation or a
test, and the steps about what a person might notice are marked `associated` and
say on screen that they are not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/biliaryObstruction.js`. A change to it must revise this card before
its digest is adopted.
