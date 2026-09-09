# Model card — Interactive heart anatomy

| | |
| --- | --- |
| **Scene** | `heart-anatomy` |
| **Geometry** | `dev-assets/heart/VH_M_Heart.glb` — a **candidate**, pinned in [`src/catalog/devAssets.js`](../../src/catalog/devAssets.js), fetched by `npm run assets:dev`, **not committed and not shipped** |
| **Metadata adapter** | [`src/data/heartAnatomy.js`](../../src/data/heartAnatomy.js) |
| **Selection behaviour** | [`src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js`](../../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js) |
| **Tests** | [`tests/heart-anatomy.test.js`](../../tests/heart-anatomy.test.js) |
| **Evidence** | [`docs/model-evidence/heart-anatomy.md`](../model-evidence/heart-anatomy.md) |
| **Asset inspection** | [`docs/asset-qa/heart-hubmap-vh-m-heart.md`](../asset-qa/heart-hubmap-vh-m-heart.md) |

## 1. What question this model answers

**Where is a named part of the heart — a chamber, the septum, a valve, a
papillary muscle — relative to the rest of the heart, and what is it called in
English and Japanese?**

## 2. What it is

Fourteen meshes from one sourced reference organ, each of them a part the source
named and gave an ontology id (UBERON or FMA). The scene exposes all fourteen as
selectable structures: four chambers, the interventricular septum, four valves
and five papillary-muscle bodies. There is one mesh per structure in this file,
but the scene keys on structure ids rather than meshes, so a later file that
splits one part into several does not silently become several structures.

Two files decide what a reader is told, as in the brain scene: the adapter
decides which mesh is which named part and what it is called, and the scene
decides what a click selects, what isolation hides and what a colour mode
changes. The shape both are held to is
[`src/app/anatomyContract.js`](../../src/app/anatomyContract.js).

The reader can: point to preview a name, click to pin it, search for it by name
in either language, go to it, show it on its own, hide it, and put the display
back. Six named viewpoints — anterior, posterior, left lateral, right lateral,
base, apex — are derived from the model's **measured** axes rather than assumed
from `+x`.

## 3. What it is not

**It is not a beating heart, and it carries no physiology.** No pressure, no
flow, no ejection fraction, no conduction. The heart-failure and ischaemia
scenes are the pathophysiology layer and are separate scenes with separate
models.

**It has no great vessels.** The aorta, the pulmonary trunk, the venae cavae and
the pulmonary veins are absent from this file entirely
(`HEART_MISSING` in the adapter lists them, and the scene can show that list).
A heart that ends at the valve plane is not a complete gross anatomy of the
heart, and no note in a corner is offered as a substitute for the vessels: the
vessels are being sourced separately.

**There is no interior view, and the chambers are not walls.** Each chamber mesh
is a closed surface around the chamber's *space* — the left ventricle encloses
121.6 mL, measured by the divergence theorem over the mesh — and the file
contains no myocardial free wall between chambers. A "cut through the heart"
would therefore cut through nothing, and the inside of a chamber's surface is
the back of a shell rather than an endocardial surface. What the scene offers
instead is what the file supports: hide a chamber and the valves and papillary
muscles that sit within it are there to be seen. "Show it" does exactly that
and nothing more — it casts a ray from the viewpoint it is turning to, hides
whichever whole structure is in the way, and lists what it hid so "Back to how
it was" can put every one of them back. It never opens, sections or thins a
surface.

**The enclosed volumes are not clinical measurements.** They are properties of
one fixed cadaveric specimen at whatever state it was fixed in, recorded because
they are what settles whether a "chamber" mesh is a cavity or a cavity plus its
muscle. They are not end-diastolic volumes and are not shown as any.

## 4. Sources and licence

The geometry is `VH_M_Heart.glb` from the HuBMAP Human Reference Atlas CCF
release v1.2, pinned at commit `b036a91aaf7234f462b1249d4a5f4fb0e982f412`,
segmented from the **Visible Human Male** dataset of the U.S. National Library
of Medicine. The upstream release states CC BY 4.0; the NLM Visible Human data
carry their own terms.

**Neither licence has been discharged here, and neither has been read by a
lawyer.** The file is recorded in `devAssets.js` as a candidate under
examination — it is deliberately *not* in
[`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js), which is
the record of what may ship. Adopting it means a manifest record with the
licence decision, the component-level obligations (attribution, the NLM
courtesy line, no implication of endorsement), the hashes, the coordinate and
unit record and the five QA gates — none of which exists yet.

## 5. Accuracy and uncertainty

What was measured in this repository, and is therefore a fact about the file:

* **Fourteen meshes, fourteen distinct ontology ids.** Every part the adapter
  names is present under the node name it is keyed by.
* **Nine of fourteen surfaces are closed**; five are open (aortic valve 72
  boundary edges, anterior papillary 42, medial papillary 26, posterior
  papillary 21, right atrium 3). The adapter records which, the information card
  says so, and the material draws both sides so an open surface does not vanish
  from one side.
* **The axes.** +x is the patient's left (the left atrium is left of the right
  atrium), +y superior (the apex is below the valve plane), +z anterior (the
  right ventricle is in front of the left atrium). Three relationships that
  cannot be the other way round in a normal heart. Note this is *not* the brain
  atlas's convention, which is why each scene declares its own.

What has not been established: no anatomist and no clinician has looked at this
geometry or these labels; the boundaries the source drew are trusted as drawn;
the Japanese names are deliberate but unreviewed.

## 6. Presentation choices

* **Parts** colours give each group its own hue family, varied by a stable hash
  of the part id so adjacent parts stay apart and the same part is the same
  colour every run. **Natural** uses the source's own single material varied
  only in lightness. **Neither encodes anything functional** — not oxygenation,
  not pressure, not flow. Colouring chambers by the blood they would carry would
  be a physiological claim made in a colour, and it is not made.
* One transform, on one root, centres and scales the model. The file arrives in
  whole-body coordinates; keeping the transform in one place is what will let
  the vasculature from the same release be placed beside it without either being
  re-centred, which would destroy the relative position that makes them
  combinable.
* Labels are anchored on a part's outermost vertex and drawn only when that
  point is the first drawn thing along the ray — the same occlusion rule as the
  brain, for the same reason: a name drawn over whatever is in front of it is a
  name attached to the wrong thing. The ray aims at a second point a little way
  inside the same surface rather than at the vertex itself, because a ray aimed
  at the shared corner of two triangles misses as often as it hits, and a label
  that flickers is worse than one that is simply placed.
* The panel asks two different questions before it offers "Show it": whether the
  settings are drawing a structure, and whether anything is in front of it.
  A papillary muscle inside a ventricle is drawn and cannot be seen, and only
  the second question notices. The scene answers it by measurement
  (`isStructureObscured`); a scene whose parts are all on the surface does not
  answer it at all, and the panel behaves as it did before.

## 7. What it must never be used for

Diagnosis, treatment selection, dose selection, prognosis, or procedure
planning. It is a still teaching model of one specimen with its great vessels
missing; it is not a patient's heart and not a surgical reference.

## 8. Review status

**Catalog status:** `alpha`

**Publication:** closed, and closed twice over. The scene rests on a candidate
asset that has passed no asset release gate, and the great vessels the beta
requires are not in the file. `betaPublicationProblems('heart-anatomy')` reports
both. No clinical review, no anatomist review and no publication decision
exists, and none is implied by this card.
