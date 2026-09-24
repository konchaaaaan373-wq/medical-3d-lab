# Model card — Interactive heart anatomy

| | |
| --- | --- |
| **Scene** | `heart-anatomy` |
| **Geometry** | [`public/assets/heart/VH_M_Heart.glb`](../../public/assets/heart/VH_M_Heart.glb) and [`public/assets/heart/VH_M_Blood_Vasculature.glb`](../../public/assets/heart/VH_M_Blood_Vasculature.glb) — **derivatives** of the HuBMAP files, adopted 2026-09-15, Draco-compressed 2026-09-24 |
| **Asset provenance and QA** | [`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js) |
| **Asset notice** | [`public/assets/heart/ATTRIBUTION.md`](../../public/assets/heart/ATTRIBUTION.md) |
| **Adoption decision** | [`docs/decisions/HEART-ASSET-ADOPTION.md`](../decisions/HEART-ASSET-ADOPTION.md) |
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

**What ships is a derivative, and that is not a detail.** The publisher's own
files fail glTF validation — 408 degenerate vertex normals in one mesh of the
heart, 33 across two meshes of the vasculature, and nothing else — and this
repository's format gate takes zero errors and zero warnings at every scene
status. So adopting the publisher's bytes could never have opened the release
gate, however carefully the failure was recorded. The two honest routes were a
derived file or no heart in the beta.

The derivative replaces those normals and **nothing else**. A degenerate normal
has zero length and carries no direction, so there is nothing in it to preserve;
zero-area triangles were removed first because a vertex whose only neighbours
are degenerate triangles has no face to average, and **a zero-area triangle
draws nothing**, so removing one cannot change the rendered surface. 820 of them
went from the heart (0.50% of its triangles) and 26 from the vasculature
(0.007%). Vertex positions, vertex counts, node names, hierarchy, ontology ids
and materials are identical on both sides, and the triangle count falls by
exactly what was removed — measured, in
[`docs/asset-qa/measurements/normal-repair.json`](../asset-qa/measurements/normal-repair.json),
not asserted. `npm run assets:repair:verify` rebuilds these exact hashes from the
pinned sources and reports the validator clean.

**A structure can be reached without a pointer.** `selectAtCanvasPoint()` names
whatever is drawn at one point of the canvas, which is how a keyboard asks —
there being no pointer to put anywhere, the landing hero asks it of the middle
of the frame on Enter. It answers with the same structure a click at that point
would give, through the same ray and the same visibility rules, so the two ways
in cannot come to disagree about what is there. Until 2026-09-15 this scene was
the only anatomy scene without it, and the hero's call is optional — so on the
day the hero showed the heart, Enter did nothing and said nothing.

**No geometry was re-shaped and no anatomical judgement was made.** The sources
stay pinned in [`src/catalog/devAssets.js`](../../src/catalog/devAssets.js):
adopting a derivative does not delete the record of what was examined.


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

The scope panel says so on screen and offers the way there: under **What is
shown elsewhere** it links to `heart-failure` and `myocardial-ischemia`, each
with one line on what that scene shows, and both of those scenes link back here.
The list is declared once on the scene's own metadata (`meta.related`) and
filtered by the release gate before any surface sees it, so the panel and any
shallower entry point in the shell cannot disagree. **The sentence beside those links is
part of the claim**, not decoration — neither scene is this heart at a later
date. Each is a separate schematic model with its own geometry, built to show a
mechanism rather than a specimen; nothing is deformed, cut or joined to make one
resemble the other, and no measurement crosses between them. A scene the release
has not opened is dropped from the list rather than linked to a placeholder, so
what a reader is offered depends on the gate and not on this card.

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

**There is no interior view, and what a chamber mesh represents is still open.**
Each chamber mesh is a surface the source recorded under that chamber's name;
the left ventricle's is closed and encloses 121.6 mL, measured by the divergence
theorem over the mesh. **Whether such a surface stands for the chamber's space
or for the wall around it is not established** — see §5, where two attempts to
settle it were withdrawn — and no part of the source is separately identified as
the myocardial free wall, so there is nothing in the file to select as one.
Sectioning is therefore not offered: not because there is provably nothing to
cut, but because cutting would have to assert the very thing that is undecided.
What the scene offers instead is what the file supports without deciding it:
hide a chamber whole and the valves and papillary muscles inside it are there to
be seen. "Show it" does exactly that and nothing more — it casts a ray from the
viewpoint it is turning to, hides whichever whole structure is in the way, and
lists what it hid so "Back to how it was" can put every one of them back. It
never opens, sections or thins a surface.

**The enclosed volumes are not clinical measurements.** They are properties of
one fixed cadaveric specimen at whatever state it was fixed in. They are
recorded as measurements of the meshes and nothing more: an earlier version of
this card said they settle whether a "chamber" mesh is a cavity or a cavity plus
its muscle, and **that is withdrawn** — a normal left ventricular myocardial
volume is of the same order as a normal cavity volume, so 121.6 mL does not
choose between them. They are not end-diastolic volumes and are not shown as any.

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
  sub-millimetre registration.**
* **Where the vessels sit relative to the parts they meet, as a sampled-vertex
  distance.** The quantity is `nearestSampledVertexMm`: the smallest distance
  between a de-duplicated **vertex** of one mesh and a vertex of the other, with
  neither file moved and vertices welded at 10 µm. Ascending aorta to aortic
  valve **0.00 mm**, pulmonary trunk to pulmonary valve 0.08, both venae cavae
  to the right atrium 0.05–0.09, all four pulmonary veins to the left atrium
  0.05–0.07, both coronary ostia to the aortic valve 0.11–0.14, coronary sinus
  to the right atrium 0.16. Twelve of thirteen under 0.2 mm.

  **What that is, and what it is not.** It is a diagnostic that the two files
  are in one frame: values this small do not arise between meshes that were
  never in register. It is **not a distance between the surfaces** — two meshes
  can interpenetrate without sharing a vertex, and two surfaces meeting along a
  face can have their nearest vertices far apart — so **0.00 mm means two
  sampled vertices coincide to the weld tolerance and nothing more.** Whether a
  vessel and a chamber are joined, continuous or watertight is **not evaluated
  anywhere**, and neither is whether any of it is anatomically where it should
  be. An earlier version of this card put this bullet under "the two files touch
  where they should" and called it a nearest-point distance; both are withdrawn,
  because a vertex sample cannot establish either.
* **Both files fail glTF validation, and by a known amount.** 408 errors in the
  heart file — all degenerate vertex normals, all in the right atrium's mesh,
  1.7% of its vertices — and 33 in the vasculature file, in the superior vena
  cava and the left coronary artery. The publisher's data; not corrected here;
  recorded as a failed gate rather than an unrun one.
* **The files that ship are Draco-compressed, so vertices are quantized.**
  Since 2026-09-24 both files are the repaired derivatives compressed by
  `scripts/compress-heart-assets.mjs` (6.9 MB → 0.85 MB). Positions are stored
  at 14 bits per mesh: **no vertex is more than 5.1 µm (heart) or 12.2 µm
  (vessels) from where the repair left it**, normals agree to 0.19° at p99, no
  enclosed volume moves by a printed 0.1 mL (the left ventricle is 121.604 mL
  before and after), no surface changes between closed and open, and node
  names, hierarchy, extras and materials are unchanged. Rendered at all six
  viewpoints in both colour modes, the frames differ by 60–160 pixels of
  921,600, under the renderer's own frame-to-frame jitter
  (`docs/asset-qa/measurements/draco-compression.json`,
  `docs/asset-qa/heart-hubmap-vh-m-heart.md`). The 2026-09-15 adoption rested
  on "no geometry was reshaped", and **that sentence is no longer true of what
  ships**; it is replaced by these bounds. The sampled-vertex distances in the
  bullet above were measured on the uncompressed files; in the shipped files
  each can differ by up to the two files' combined quantization, about
  0.02 mm — two in the last printed digit.
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
* **Nine of the fourteen surfaces are closed and manifold**; five are not. The
  aortic valve has 72 boundary edges, three papillary muscles 42, 26 and 21, and
  the right atrium is a different problem — 3 boundary edges but **134
  non-manifold edges, 1,554 degenerate triangles and three components**. An
  earlier note in this card gave the right atrium 286/39 boundary edges; that
  was a metric adding boundary edges, non-manifold edges and the edges of
  degenerate triangles together, and it is corrected. The adapter records which
  parts are open, the information card says so, and the material draws both
  sides so an open surface does not vanish from one side.
* **What the vessel surfaces are is still open, and three answers have been
  withdrawn.** They were first described as lumen surfaces, which nobody had
  measured. They were then described as single surfaces with no modelled wall
  thickness — measured, but with an instrument that cannot tell those apart: a
  ray cast outward from *inside* a shape crosses one surface if the shape is
  solid and two if it is a shell, so "a mode of two, never four" is exactly what
  a thick shell gives as well. The third was that the surface's **genus** settles
  it, which fails in both directions: a cup has a wall and genus 0, a loop of
  solid rod has no wall and genus 1. **All three are withdrawn.** The scene says
  the question is being checked rather than answering it, and nothing in this
  repository measures wall thickness. §5 records what the topology does say,
  which is how complicated each surface is.
* **The source caps ten of the vessels.** The pulmonary trunk, both pulmonary
  arteries, all four pulmonary veins, both brachiocephalic veins and the small
  cardiac vein have no boundary edges, so their cut ends are closed by the
  source. That is the file's own choice, recorded rather than made here, and
  nothing in this scene caps a vessel.
* **The left ventricle's surface is described, and not interpreted.** It is
  closed, manifold, a single component and **genus 0**, enclosing 121.60 mL. The
  left atrium reads genus 4 and the right ventricle genus 26. An earlier version
  of this card read genus 0 as "a cavity rather than a wall's worth of muscle";
  **that is withdrawn.** Genus counts handles in a surface, not walls — a cup
  has a wall and genus 0 — and 121.6 mL is of the same order as both a normal
  left ventricular cavity and a normal left ventricular myocardial volume, so it
  does not choose between them either. **Whether these meshes are cavity casts,
  walls, or something in between is not established here.** No interior view is
  offered, because there is nothing measured to base one on.
* **The axes.** +x is the patient's left (the left atrium is left of the right
  atrium), +y superior (the apex is below the valve plane), +z anterior (the
  right ventricle is in front of the left atrium). Three relationships that
  cannot be the other way round in a normal heart. Note this is *not* the brain
  atlas's convention, which is why each scene declares its own.

What has not been established: no anatomist and no clinician has looked at this
geometry or these labels; the boundaries the source drew are trusted as drawn;
the Japanese names are deliberate but unreviewed.

## 6. Presentation choices

* **The legend follows the mode** (2026-09-21). It returned the Parts hue
  bands whatever was on screen, which nobody saw while Parts was the only mode
  anybody started in. Opening in Natural made it a cyan "Chambers" swatch
  beside a dark red heart. Natural's swatches are now asked of the same
  function that colours the meshes.
* **The scene opens in Natural** (2026-09-21). It used to open in **Parts**,
  and Parts is the reason this changed: the chamber band is teal by design, so
  the heart on the landing page was a teal bulb with ochre vessels. A reader
  said it did not look like an organ. Parts is one press away, its legend is
  unchanged, and the caveat below still holds — Natural reproduces the
  sources' own materials and is not a claim about the colour of living tissue.
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
* **Four fixed ways of looking, each made of the same moves the reader has.**
  Nothing in them cuts, thins or builds anything; each is a set of hides and a
  viewpoint, and a reader could reach any of them by hand.

  | | What it does |
  | --- | --- |
  | **The heart and its vessels** | Everything the scene draws, from the front. This is the display the scene opens with and the one the way back returns to. **It is not called "the whole heart"**, because it is not one: there is no myocardial free wall as a named part, no chordae, no pericardium and no conduction system (§3), and this view keeps the arch branches and the brachiocephalic veins out of the way. |
  | **The great vessels** | Takes the coronary vessels off the surface so the trunks read clearly. The chambers stay: the vessels are shown where they meet the heart. |
  | **The coronary vessels** | Takes the great vessels out of the front so the arteries and veins on the heart's own surface can be followed. |
  | **Inside the chambers** | Hides the four chamber surfaces, leaving the four valves, the five papillary muscles and the septum. |

  **Each is a destination, not a further step.** Choosing one starts from the
  scene's own display rather than adding to whatever was hidden before, so
  pressing "the coronary vessels" after "inside the chambers" gives the coronary
  view and not the union of the two. A structure the reader had hidden by hand
  is therefore shown again by a view that says it shows it — and "Back to how it
  was" still returns them to their own hide.

  **"Inside the chambers" is not a section.** It hides the four chamber parts
  whole. That is a statement about what the code does, not a claim that the
  source has no wall to cut — which is exactly what is still being checked.

  Before one runs it reports which structures it will hide and which it means to
  show; after it runs, the panel reports how many of those are actually
  unobstructed from the viewpoint it turned to — measured, not promised.

  **Every structure named by a view is one the source contains and this scene
  draws.** No view invents a vessel or a wall to make itself tidier, and
  `tests/heart-anatomy.test.js` holds all four to the part table.
* **Changing what is drawn says so completely.** A hide that ends an isolation
  announces the isolation as over, not only the hidden set as changed — they are
  two events and the tree learns about isolation from one of them alone. And any
  hide or show the reader makes themselves discards the snapshot behind "Back to
  how it was", because that snapshot restores the whole hidden set: offering it
  afterwards would undo *their* change under a label that promises to undo the
  fixed view's. Both were true of hiding one part before groups existed.
* **A branch of the Parts tree comes off in one press.** The tree's branches
  are this file's own eight groups — *Chambers and septum*, *Heart valves*,
  *Papillary muscles*, *Great vessels*, *Coronary arteries*, *Cardiac veins*,
  *Branches of the aortic arch*, *Tributaries of the superior vena cava* — and
  each now carries its own control that hides or shows everything beneath it.
  Note what that means for the first one: *Chambers and septum* takes the
  septum with the four chamber surfaces, because that is the group the file
  has. A reader who wants the chambers off and the septum left standing hides
  the four by hand, as before. It is the same hide a single part's "Hide" performs,
  applied to the set in one pass over the model — not a section, not a cut, and
  not a fourth fixed view. The difference from "Inside the chambers" is who
  chooses the set: the fixed view is one authored destination, this is the
  reader taking off whatever they want to see behind. A branch showing some of
  its parts and hiding others says so with its own mark rather than rounding to
  one of the two, and `V` on a focused branch does what pressing the control
  does. **A group is not a part**: it has no ontology id, it cannot be selected,
  searched for or labelled, and hiding one asserts nothing about the anatomy.
* **What the camera frames is the organ, and it is a composition.** The scene
  reports the fourteen parts of the heart file as its subject, not everything it
  draws: the vessels reach past the chest — the inferior vena cava runs to the
  renal level — and framing all of it answers "show me the heart" with a heart a
  fifth of the frame high. The organ is then given a fixed share of the part of
  the frame no panel is covering, chosen from the pictures so that the roots of
  the great vessels have room to read as roots before they leave. **None of this
  is anatomy.** It changes no size, no position and no relation; it decides how
  far away the camera stands, and a reader can leave it at any time by orbiting
  or zooming. The share is measured from pictures and is expected to be
  re-measured when the organ or the vessel subtree changes.

  **The two numbers standing in the code today are not measurements.** The
  shared fit stopped approximating a perspective camera with an orthographic
  sum on 2026-09-14, which had been over-filling the band by about an eighth on
  a subject as deep as this one; the shares were scaled by that much so the
  composition the pictures were measured at survives the correction. They are
  the first thing to check against pictures the next time this scene is
  rendered — which is when its candidate assets pass the asset release gate.

  There are two of them, and the second one says why. On a frame taller than it
  is wide there is no panel down the side, so what runs out first is the
  subject's own shape — this heart is wider than it is tall. Measured at
  375x667, the wide-frame share left the organ across 74% of the width and 35%
  of the height, with empty bands above and below it; the portrait share puts it
  across about 88% and 43%, with nothing cut. Neither number is anatomy, and
  neither has been measured on a real handset.
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
no chordae tendineae, no pericardium, no conduction system and no separately
identified myocardial free wall; whether its vessel surfaces are lumens or walls
has not been measured; and **no junction has been evaluated as a junction** —
§5 reports a sampled-vertex distance, which is not a surface distance and settles
nothing about whether a vessel and a chamber are joined, continuous or
watertight. It is not a patient's heart and not a surgical reference.

## 8. Review status

**Catalog status:** `alpha`

**Publication:** open, as of 2026-09-15. The two candidate files went through
the asset pipeline — manifest record, licence decision, discharged obligations,
the QA gates — and a publication decision was taken against the repaired
derivatives named in
[`docs/decisions/HEART-ASSET-ADOPTION.md`](../decisions/HEART-ASSET-ADOPTION.md);
the record is [`docs/beta-publication/heart-anatomy.md`](../beta-publication/heart-anatomy.md)
and the scope it was taken over is in `src/catalog/publicationScopes.js`.
**What is open is the anatomy scene and nothing more.** No clinical review and
no anatomist review exists, and none is implied by this card — the registry
records both as pending, which is the same footing the brain is published on.
