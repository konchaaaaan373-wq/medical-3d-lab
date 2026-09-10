# Model card — Interactive heart anatomy

| | |
| --- | --- |
| **Scene** | `heart-anatomy` |
| **Geometry** | `dev-assets/heart/VH_M_Heart.glb` and `dev-assets/heart/VH_M_Blood_Vasculature.glb` — **candidates**, pinned in [`src/catalog/devAssets.js`](../../src/catalog/devAssets.js), fetched by `npm run assets:dev`, **not committed and not shipped** |
| **Metadata adapter** | [`src/data/heartAnatomy.js`](../../src/data/heartAnatomy.js) |
| **Selection behaviour** | [`src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js`](../../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js) |
| **Tests** | [`tests/heart-anatomy.test.js`](../../tests/heart-anatomy.test.js) |
| **Evidence** | [`docs/model-evidence/heart-anatomy.md`](../model-evidence/heart-anatomy.md) |
| **Asset inspection** | [`docs/asset-qa/heart-hubmap-vh-m-heart.md`](../asset-qa/heart-hubmap-vh-m-heart.md), [`docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md`](../asset-qa/heart-hubmap-vh-m-blood-vasculature.md) |
| **Real renders** | [`docs/screenshots/heart/`](../screenshots/heart/) |

## 1. What question this model answers

**Where is a named part of the heart — a chamber, the septum, a valve, a
papillary muscle, a great vessel, a coronary artery, a cardiac vein — relative
to the rest of the heart, and what is it called in English and Japanese?**

## 2. What it is

**Forty-six structures from fifty-one meshes, out of two files of one reference
release.** Fourteen are the heart itself: four chambers, the interventricular
septum, four valves and five papillary-muscle bodies. Thirty-two are vessels:
the great vessels, the coronary arteries, the cardiac veins and the branches of
the aortic arch. Every one is a mesh the source named and gave an ontology id
(UBERON or FMA).

**A structure is not a mesh.** Five vessels arrive split in two — the descending
aorta, the inferior vena cava, the brachiocephalic artery, the left common
carotid and the left subclavian — and each is one structure drawn from two
meshes, so selecting either piece selects the vessel. Two different diagonal
branches carry the same FMA term and stay two structures, because a term is a
vocabulary and not an identifier.

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

**It is not a complete gross anatomy of the heart.** What is still absent, and
why, is `HEART_MISSING` in the adapter, which the scene can show: no chordae
tendineae, no pericardium, no conduction system, no myocardial free wall, and no
mesh named "circumflex" in the left coronary system. Nothing on that list is
invented to fill the gap.

**The vessels are a second file, not a second opinion.** They come from
`VH_M_Blood_Vasculature.glb` of the same release, and specifically from the
subtree the source itself groups as `VH_M_blood_vasculature_of_heart` — 37
meshes of that file's 104. That is the source's own answer to "which vessels
belong to the heart", not a box drawn round the heart here. The other 67 meshes
are the eye, the abdomen and the pelvis; the scene counts them and leaves them
in the file.

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

The geometry is `VH_M_Heart.glb` and `VH_M_Blood_Vasculature.glb` from the
HuBMAP Human Reference Atlas CCF release v1.2, both pinned at commit
`b036a91aaf7234f462b1249d4a5f4fb0e982f412`, both segmented from the **Visible
Human Male** dataset of the U.S. National Library of Medicine. The upstream
release states CC BY 4.0. The DOIs the release's own reference documents record
are `10.48539/HBM373.VSTV.568` for the heart and `10.48539/HBM686.LBDQ.998` for
the vasculature; the NLM Visible Human data carry their own terms. What each
source says, what it obliges, and what is still unresolved is
[`docs/asset-provenance/heart-candidates.md`](../asset-provenance/heart-candidates.md).

**Neither licence has been discharged here, and neither has been read by a
lawyer.** The file is recorded in `devAssets.js` as a candidate under
examination — it is deliberately *not* in
[`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js), which is
the record of what may ship. Adopting it means a manifest record with the
licence decision, the component-level obligations (attribution, the NLM
courtesy line, no implication of endorsement), the hashes, the coordinate and
unit record and the five QA gates — none of which exists yet.

## 5. Accuracy and uncertainty

What was measured in this repository, and is therefore a fact about the files:

* **The two files share a frame, and that was checked rather than assumed.**
  Neither is re-centred. In the source's own metres the ascending aorta sits
  20 mm above the aortic valve at the same depth; the pulmonary trunk above the
  pulmonary valve; the superior vena cava above and lateral to the right atrium
  and the inferior vena cava below it; the left pulmonary veins on the +x side
  of the left atrium and the right pair on the −x side. Those are the
  relationships a normal heart has, and none was produced by a transform of
  ours. **That is evidence the frames agree; it is not a claim of
  sub-millimetre registration, and no distance between a vessel's cut end and a
  chamber is measured or asserted anywhere.**
* **The two files touch where they should.** Nearest-point distance between
  each vessel and the heart part it meets, with neither file moved: ascending
  aorta to aortic valve **0.00 mm**, pulmonary trunk to pulmonary valve 0.08,
  both venae cavae to the right atrium 0.05–0.09, all four pulmonary veins to
  the left atrium 0.05–0.07, both coronary ostia to the aortic valve 0.11–0.14,
  coronary sinus to the right atrium 0.16. Twelve of thirteen under 0.2 mm.
  **This is a diagnostic**: it says the two files agree with each other, not
  that either agrees with a heart, and **no millimetre-level anatomical
  accuracy is claimed from it**.
* **Both files fail glTF validation, and by a known amount.** 408 errors in the
  heart file — all degenerate vertex normals, all in the right atrium's mesh,
  1.7% of its vertices — and 33 in the vasculature file, in the superior vena
  cava and the left coronary artery. The publisher's data; not corrected here;
  recorded as a failed gate rather than an unrun one.
* **One display transform, applied once to the pair.** The offset and uniform
  scale live on the single model root, so they cannot separate the two files.
  The scale is taken from the heart, because the vessel subtree is half a metre
  tall against the heart's ten centimetres and fitting the pair would put the
  heart in a fifth of the frame. The far-reaching vessels — the descending
  aorta, the arch branches, the brachiocephalic veins — start hidden for the
  same reason, through the same hidden set the reader's own "Hide" writes to, so
  "Unhide all" brings them back and nothing is removed.
* **The source disagrees with itself about one mesh.**
  `VH_M_left_anterior_descending_artery` is labelled "anterior descending branch
  of left pulmonary artery" with FMA:8636 on the same node. Both are kept, the
  structure's card states the disagreement in both languages, and neither is
  corrected here. Where the mesh actually sits — anterior ventricular surface,
  below the valve plane, in the file's own "arteries of the heart" group — is
  reported as a position, not as a ruling.

* **Fourteen meshes, fourteen distinct ontology ids.** Every part the adapter
  names is present under the node name it is keyed by.
* **Nine of fourteen surfaces are closed**; five are open. Boundary edges,
  counted with vertices welded at 1 µm and again at 10 µm: aortic valve 72/72,
  anterior papillary 42/42, medial papillary 26/26, posterior papillary 21/21,
  right atrium 286/39. **The right atrium's count is tolerance-dependent and an
  earlier record of "3" was not reproducible** — it is open at every tolerance
  measured, and how open depends on how near-coincident vertices are welded.
  The adapter records which parts are open, the information card says so, and
  the material draws both sides so an open surface does not vanish from one
  side.
* **What the vessel surfaces are is still open, and two answers have been
  withdrawn.** They were first described as lumen surfaces, which nobody had
  measured. They were then described as single surfaces with no modelled wall
  thickness — measured, but with an instrument that cannot tell those apart: a
  ray cast outward from *inside* a shape crosses one surface if the shape is
  solid and two if it is a shell, so "a mode of two, never four" is exactly what
  a thick shell gives as well. **Both claims are withdrawn**, and the scene says
  the question is being checked rather than answering it. What has replaced the
  ray count is in §5 below.
* **The source caps some cut vessels.** The pulmonary arteries, all four
  pulmonary veins, both brachiocephalic veins and the small cardiac vein have no
  boundary edges at all, so their cut ends are closed by the source. That is the
  file's own choice, recorded rather than made here, and nothing in this scene
  caps a vessel.
* **The axes.** +x is the patient's left (the left atrium is left of the right
  atrium), +y superior (the apex is below the valve plane), +z anterior (the
  right ventricle is in front of the left atrium). Three relationships that
  cannot be the other way round in a normal heart. Note this is *not* the brain
  atlas's convention, which is why each scene declares its own.

What has not been established: no anatomist and no clinician has looked at this
geometry or these labels; the boundaries the source drew are trusted as drawn;
the Japanese names are deliberate but unreviewed.

## 6. Presentation choices

* **Parts** colours give each group its own hue band — chambers teal, valves
  amber, papillary muscles violet, great vessels ochre, coronary arteries red,
  cardiac veins indigo, arch branches green, brachiocephalic veins cyan —
  spread evenly inside the band by position so that all forty-six are distinct. Reds are deliberately left out of
  the chamber band: a red chamber beside a blue one is an oxygenation map, and
  this mode does not draw one.
* **Natural** reproduces **the sources' own materials**, and that is all the
  word claims. The heart file ships one tissue red; the vasculature file ships
  `artery_mat7` (pure red) and `vein_mat8` (pure blue) and assigns every vessel
  to one. This mode uses that assignment, softened to be readable. **It is not a
  claim about the colour of living tissue** — nobody measured that, and a fixed
  cadaveric specimen would not settle it — and **it is not an oxygenation map**:
  the model carries the counterexample, since the pulmonary arteries are red and
  carry deoxygenated blood while the pulmonary veins are blue and carry
  oxygenated blood. Nothing here encodes pressure or flow.
* One transform, on one root, centres and scales **both** files together. They
  arrive in whole-body coordinates; keeping the transform in one place is what
  lets the vasculature sit beside the heart without either being re-centred,
  which would destroy the relative position that makes them combinable.
* Labels are anchored on a part's outermost vertex and drawn only when that
  point is the first drawn thing along the ray — the same occlusion rule as the
  brain, for the same reason: a name drawn over whatever is in front of it is a
  name attached to the wrong thing. The ray aims at a second point a little way
  inside the same surface rather than at the vertex itself, because a ray aimed
  at the shared corner of two triangles misses as often as it hits, and a label
  that flickers is worse than one that is simply placed. A label whose structure
  is hidden, isolated away or taken out of the way by the fixed view goes on the
  same frame: the short wait that stops labels blinking along an occlusion edge
  is for occlusion and does not apply to a structure that is not being drawn.
* **One fixed way of looking, and it is made of the same moves the reader has.**
  "Inside the chambers" hides the four chamber surfaces and turns to the front,
  leaving the four valves, the five papillary muscles and the septum. **It is
  not a section**: the chambers are closed surfaces around the chambers' spaces
  and there is no myocardial wall to cut, so hiding them is all that happens.
  Before it runs, it reports which structures it will hide and which it means to
  show; after it runs, the panel reports how many of those are actually visible
  from the viewpoint it turned to — measured, not promised — and "Back to how it
  was" undoes it.
* **"Visible" is never claimed loosely.** What the scene can measure is whether
  **one anchor point** on a structure is unobstructed along a ray from a stated
  eye position, and it keeps two of those apart: a prediction from a named
  viewpoint (used before the camera has moved there) and an answer from the
  camera as it stands. A check it cannot make answers "unknown" and is never
  counted as a success. One anchor does not speak for a whole structure, and
  nothing here knows the frustum, the zoom, or what a panel is covering — so
  the fixed view's report says how many anchors are unobstructed from that
  viewpoint, not how much of the model is on screen, and it is cleared as soon
  as the reader orbits, zooms, resizes or changes the display.
* **A name the source is not consistent about says so where it is named** — in
  the pinned heading, in a search result and on the 3D label, as two words. The
  explanation stays in the detail tab. The source's node name, label and
  ontology id are all kept unchanged, and nothing here decides which is right.
* The panel asks two different questions before it offers "Show it": whether the
  settings are drawing a structure, and whether anything is in front of it.
  A papillary muscle inside a ventricle is drawn and cannot be seen, and only
  the second question notices. The scene answers it by measurement
  (`isStructureObscured`); a scene whose parts are all on the surface does not
  answer it at all, and the panel behaves as it did before.

## 7. What it must never be used for

Diagnosis, treatment selection, dose selection, prognosis, or procedure
planning. It is a still teaching model of one fixed cadaveric specimen. It has
no chordae tendineae, no pericardium, no conduction system and no myocardial
free wall; whether its vessel surfaces are lumens or walls has not been
measured, and no junction between a vessel and a chamber has been measured
either. It is not a patient's heart and not a surgical reference.

## 8. Review status

**Catalog status:** `alpha`

**Publication:** closed. The great vessels the beta's list asks for are now in
the model, and **that is not what opens the gate**: the scene rests on candidate
assets that have been through no asset pipeline — no manifest record, no licence
decision, no discharged obligations, none of the five QA gates — and no
publication decision exists. `betaPublicationProblems('heart-anatomy')` reports
the candidate by name. No clinical review and no anatomist review exists, and
none is implied by this card.
