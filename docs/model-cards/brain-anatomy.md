# Model card — Interactive brain anatomy

| | |
| --- | --- |
| **Scene** | `brain-anatomy` |
| **Geometry** | [`public/assets/brain/brain.glb`](../../public/assets/brain/brain.glb) |
| **Metadata adapter** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js) |
| **Selection behaviour** | [`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js) |
| **Tests** | [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js), [`tests/anatomy-colour-ui.test.js`](../../tests/anatomy-colour-ui.test.js) |
| **Evidence** | [`docs/model-evidence/brain-anatomy.md`](../model-evidence/brain-anatomy.md) |
| **Asset notice** | [`public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md) |
| **Asset provenance and QA** | [`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js), [`docs/asset-qa/brain-atlas-glb.md`](../asset-qa/brain-atlas-glb.md) |

## 1. What question this model answers

**Where is a named cortical or deep-brain structure relative to the rest of the
brain, and what is it called in English and Japanese?**

## 2. What it is

**Two files, not one, are what this card describes** — and that is why both are
in the revision registry. The metadata adapter decides which mesh is which
named structure and what it is called; the scene decides what a click selects,
what an isolated view hides and what a colour mode changes. The shape both are
held to is [`src/app/anatomyContract.js`](../../src/app/anatomyContract.js),
checked by [`tests/anatomy-contract.test.js`](../../tests/anatomy-contract.test.js)
and driven in a browser by `npm run verify:anatomy`. A reader who is
told "this is the left insula" is being told it by the pair. Change either and
the correspondence a reviewer checked may no longer hold, so
`npm run revisions:check` fails until this card has been looked at again — and
the beta's publication decision, which is pinned to this revision, closes with
it (see [`../beta-publication/brain-anatomy.md`](../beta-publication/brain-anatomy.md)).

An interactive gross-anatomy atlas made from a Draco-compressed GLB containing
437 separately named meshes. This scene exposes the cortex, deep grey matter,
diencephalon, white matter, ventricular system, cerebellum and brainstem as
**271 selectable structures**, drawn from 397 meshes. Every mesh carries its
own category, side, region, source and anatomical label in glTF metadata, and a
`bx_id` that identifies the *structure* rather than the mesh.

**A structure and a mesh are not the same thing.** 124 of these structures
arrive as more than one mesh — the middle temporal gyrus is two — and every
piece carries the structure's id. Selecting, hovering and isolating act on the
structure, so clicking any piece of a gyrus highlights the gyrus. Replacing the
atlas clears the selection, the hover and any isolation **and says so**, so a
surface that repaints on an event does not go on naming a structure from a
model that has been thrown away. Until
2026-09-08 the scene keyed one mesh per id, so the second piece replaced the
first and clicking the piece that lost highlighted the piece that won; the
count shown to a reader was 397, which was a count of meshes wearing the word
"structures".

The default **Colour map** gives every named structure a distinct teaching
colour inside a recognisable lobe colour family. A one-click **Natural anatomy**
mode uses low-saturation grey-pink cortex, ivory white matter and muted tissue
colours, with lower idle emission so lighting describes gyri and sulci more
clearly. Pointing at a mesh previews its exact name; clicking or tapping pins
it.

**A structure can also be reached without a pointer.** `selectAtCanvasPoint()`
names whatever is drawn at one point of the canvas, which is how a keyboard
asks — there being no pointer to put anywhere, the question is asked of the
middle of the frame. It answers with the same structure a click at that point
would give, through the same ray and the same visibility rules, so the two ways
in cannot come to disagree about what is there.

**Turning the model is not choosing a structure.** A release counts as a tap
only if it lands where the press began *and* the pointer never got far from
there while it was down. The second half is what a touch screen needs: the model is turned by
swiping across it, and a swipe out and back ends exactly where it started — so
measured by distance alone it stood still, and letting go named whatever had
rotated under the thumb. Until 2026-09-14 that is what happened, on this scene
and on every organ anatomy scene. The information card reports side, anatomical hierarchy, the exact English
atlas label, and a deliberate Japanese name for all 147 unique selectable
labels (271 left/right/midline meshes).

Left and right medial views hide the contralateral hemisphere at the midline so
medial structures can be inspected without moving anatomy. The layer sequence
can also expose the insula and registered deep structures by changing opacity,
never by separating or deforming meshes.
Selecting a cingulate mesh chooses the matching left/right medial view so the
named surface, rather than a label projected through the lateral shell, is put
in front of the learner.

## 3. What it is not

Not a patient-specific reconstruction, histology atlas, functional parcellation,
stereotactic planning tool or surgical-navigation system. It is not a FreeSurfer
Desikan–Killiany or Destrieux surface, and its mesh boundaries must not be
silently relabelled as those parcellations. The colours are teaching colours,
not tissue properties. The visibility slider and medial views are visibility
controls, not physical dissections or clinical scales.

## 4. Sources and licence

The GLB is redistributed unchanged from
[Brain Project](https://github.com/itayinbarr/brainproject), which derives its
gross-anatomy surfaces from Z-Anatomy and BodyParts3D / DBCLS. The model and
derived metadata are licensed CC BY-SA 4.0. The complete attribution and
redistribution notice travels beside the asset.

Several deep nuclei and white-matter structures were registered by the upstream
project from open MNI-space imaging atlases. Their source-atlas credits and
registration method are documented upstream.

Modern cingulate terminology is cross-checked against Destrieux et al. (2010)
and the FreeSurfer Destrieux terminology revision. Those sources distinguish
anterior cingulate cortex (ACC), anterior/posterior midcingulate cortex (aMCC /
pMCC), and dorsal/ventral posterior cingulate cortex. They guide wording only;
they do not convert the distributed geometry into a Destrieux atlas.

## 5. Accuracy and uncertainty

- Gross surface anatomy is illustration / gross-anatomy grade.
- Imaging-atlas-derived deep structures are a registration approximation
  across several population atlases, not a patient-specific reconstruction.
  The upstream project's frequently cited "about 7 mm" figure is the position
  difference of the red nucleus in a check that excluded the red nucleus from
  registration itself — it is not a boundary or maximum error figure for
  every registered structure, and this repository has not independently
  verified it against the distributed asset.
- The scene does not assert voxel-level boundaries, population variability or
  patient-specific dimensions.
- Every one of the 147 unique selectable source labels has an explicit Japanese
  name. This removes runtime fallback English but does not substitute for an
  independent review of Japanese anatomical terminology.
- The current source geometry has no independent anterior cingulate cortex
  (ACC) mesh. Its `Middle anterior part` mesh is labelled as anterior
  midcingulate territory (aMCC) and carries an explicit warning that it is not
  ACC. Adding ACC requires a new, source-attributed cortical geometry dataset;
  renaming the existing mesh would be anatomically false. **The absence of a
  selectable ACC label does not mean ACC tissue is absent from every mesh in
  this atlas** — only that no mesh here is presented as one. The aMCC naming
  correspondence itself is a terminology cross-reference and does not assert
  that the displayed geometry reproduces a cytoarchitectonic or functional
  boundary.
- Functional summaries are brief orientation notes. Functions arise from
  distributed networks and should not be read as one-to-one localisation.

## 6. Presentation choices

Geometry is never enlarged, separated or moved by hover, selection, camera
view, or the layer slider. Hover and selection change emissive emphasis only.
Colour-map shades are deterministic from anatomical metadata and use the same
colour for left/right homologues. Each large unit — a lobe, the ventricular
system, the cerebellum, the brainstem — owns one narrow hue band, and the
structures inside it are told apart by lightness and saturation within that
band, so a lobe reads as one family before its gyri read as individuals. The
legend swatch for a unit is the centre of its band rather than a separate
picked colour. Natural-anatomy shades use a constrained low-saturation
range with small deterministic lightness differences between named meshes. The
same selector also updates the legend swatches; neither mode changes anatomical
identity or geometry. **Colour aids identification and grouping; it does not
show real tissue colour, functional localisation, vascular territory, exact
boundaries or positional accuracy.**

**A viewpoint is fitted to the band nothing is covering.** The scene reports the
box around what it is currently drawing — not the whole atlas, since at layer 0
the deep structures are not drawn and on a medial view half the cortex is not —
and the app measures what the header, the console and the docked panel actually
cover. The camera then looks at that subject's own centre, sits at the distance
that fills the band, and pans so the band's centre is where the subject is.
The direction it looks and the angle on the anatomy are untouched: this changes
the composition, never the view. A band with no room left in it is left alone
rather than framed to an invented composition.

The atlas opts into the shared **Neutral studio** renderer preset so sulcal
relief and the low-saturation anatomical mode remain legible on a pale field.
Its eight viewpoints — left and right lateral, left and right medial, anterior,
posterior, superior and inferior — are authored anatomical views in the common
inspection panel, rather than directions inferred by the app. The inferior view
is tilted forward in the midline plane rather than placed directly below,
because a camera looking along its own up vector has no roll to derive and the
midline would land at an arbitrary angle; tilted, the midline stays vertical,
which is what makes left and right readable in that view. Background, viewpoint, label visibility and colour mode are user
inspection state only; resetting them does not change the layer progression or
any anatomical metadata.

The full hemispheric white-matter masses remain almost transparent in the deep
view; otherwise they would form a second enclosing shell and conceal the nuclei
the view is meant to teach. Named bundles such as the corpus callosum and fornix
remain visible.

**A medial view shows the midline block, and that is a display decision, not a
dissection.** Its name is **medial 3D view (contralateral hemisphere hidden,
not sectioned)**: nothing is cut, so it must not be read as a midsagittal
section such as an MRI slice. The contralateral hemisphere is hidden and the near hemisphere's
midline face — the corpus callosum, the fornix, the thalamus and hypothalamus,
and the white matter behind them — is present at full opacity, because that is
what a medial view of a hemisphere is a view *of*. Before this, the layer slider
held all of it at zero until depth was asked for, and a medial view at rest was
a cortical shell with a hole where the callosum belongs. Two things this does
not do: it does not cut anything (no plane, no clipping, no mesh moved — the
model is the same one the lateral views show, seen from the other side), and it
does not fill the ventricles, which are cavities rather than surfaces and stay
on the slider in every view. Dragging the layer in from a medial view ghosts the
enclosing white matter back out, so depth still means depth.

**An annotation is shown only when the structure it names can be seen.** The
labels are HTML over the canvas, so nothing about them is depth-tested: a label
for a left-hemisphere structure was drawn on the right hemisphere's surface in
the right lateral view, which reads as a claim about where that structure is.
The scene is now asked, with the same ray a click uses, whether the anchor is
the first drawn thing along it; if it is not, the label is hidden where it is
and never moved somewhere emptier. The rule is about what is on screen, not
about which side a name says — so it agrees with the anatomical layer, a medial
view, isolation and transparency without knowing about any of them. **Label
visibility is not selection**: a pinned structure keeps its id, its summary and
its highlight when the view turns away from it. **An anchor is a point on the outside of the
structure it names**, not the centre of its bounding box: for a sulcus that
centre is at the bottom of the sulcus, inside the gyri on either side, where
nothing can see it — which is why the central sulcus label used to be drawn over
the precentral gyrus instead. Each anchor is the outermost vertex of the
structure's own meshes along the direction from the model's centre out to it: a
point chosen from that geometry and fixed at load, carrying no anatomical claim
beyond "this is on the outside of this mesh", and never moved to suit the
screen. It is not enough for a sulcus: the surface of a fold lies under the
gyri on either side of it, so the central sulcus's label is absent from the
lateral view rather than misplaced on it. That is recorded as F-40 with what
was tried, not papered over — and it still applies to the four **authored**
landmarks, whose anchor is fixed at load, before any camera exists to ask.
**The reader's own selection is held to a stricter rule than that**, because a
label with nothing under it is worse exactly when the reader just asked for
one: see below.

**A structure can be found by name.** The scene publishes its inventory — one
record per structure, both names, its side and the hierarchy above it — and the
Parts tab indexes that and nothing else. There is no medical dictionary behind
the search box, no generated synonyms and no inference from a symptom to a
region: a name the atlas does not carry finds nothing, and says so. The query is
folded (NFKC, so full-width Latin and half-width kana are the same words; case
and spacing collapsed) while ids are carried through untouched. A whole name
outranks a partial one, and a name from a level above — a lobe, a hemisphere —
finds the structures under it without that level pretending to be selectable.
Left and right are two structures with two ids and stay two results. Searching
covers the tree rather than replacing it, so clearing returns the branches the
reader had open and the place they had scrolled to.

**Going to a structure, bringing it into view and hiding it are three actions,
because they are three requests.** *Go to it* moves the camera and changes no
display state. *Show it* changes the display — the anatomical layer, the
viewpoint, a hide the reader had set — and moves no anatomy; the recipe is read
off the structure's own category, region, side and preferred view, and where the
metadata says nothing the scene answers `{ok: false}` rather than a camera move
that pretends to have worked. *Hide it* takes one structure off screen and
leaves it selected, with the panel saying so.

Visibility has one order, in one place: isolation is a temporary override that
writes nothing down, a structure the reader hid stays hidden over what the layer
would otherwise show, and otherwise the layer and the medial side decide.
Clearing an isolation therefore returns the model the reader had — their hidden
structures and their layer — rather than a remembered snapshot that can be
wrong. A hidden structure leaves the picker and stops occluding a label by the
same rule, and hiding one survives a colour change, a viewpoint and a resize.
The anatomical layer stays owned by the console's slider: the scene reports the
layer a structure needs and the control that owns the value sets it, so the
model and the slider never give two answers.

**Changing what is drawn says so completely.** A hide that ends an isolation
announces the isolation as over, not only the hidden set as changed: the two are
separate events and the tree learns about isolation from one of them alone, so
for a while it went on marking a row isolated after the scene had stopped
isolating it. And any hide or show the reader makes themselves discards the
"back to how it was" snapshot a reveal left behind, because that snapshot
restores the whole hidden set: offering it after the reader has hidden something
of their own would undo *their* change under a label that promises to undo the
reveal's. Both were true of hiding one structure before groups existed, and both
are fixed for both.

**A branch of the tree comes off in one action, and that is still hiding.** The
Parts tree already groups structures by the hierarchy the atlas carries; every
group now carries its own control, so a hemisphere or the ventricular system
leaves the screen in one press rather than seventy-seven. It writes to the same
hidden set a single structure's "Hide" writes to, in one pass over the model and
one report rather than one of each per structure, so "Unhide all" still brings
everything back, an isolation still overrides it for as long as it lasts, and
nothing is removed, cut or thinned. The control states which of three things is
true of the branch — all shown, all hidden, some of each — by shape as well as
by colour, and answers `V` on a focused branch. **A group is not a structure**:
pressing it changes what is drawn and never what is named, and the selection,
the search index and the labels go on referring to structures only.

**The structure a reader picks is named on the model, not only in the panel —
and it is named whenever the structure is drawn, not only when the camera
happens to be looking at the one point a fixed anchor would use.** A tapped
structure's label sits on the exact point the tap hit, which is on the visible
surface by construction: the ray that selected the structure stopped there. A
selection made any other way — the keyboard, a guided tour, a test calling
`selectStructure` — has no such point, so several of the structure's own
outward vertices are ranked and tried against the live camera, and the first
one that camera can actually see is used. Only a structure with **no** visible
point at all — the far side of a medial view, say — goes unlabelled, which is
the case a label should disappear for. This is stricter than the rule the four
authored landmarks still use (F-40): their anchor is one point, fixed at load,
before any camera exists to ask, and a fold can still hide it. A selection is
the one label the reader asked for, so it is also **exempt from the on-screen
cap** — six labels on a wide screen, three on a narrow one — where the
landmarks are what step back to make room. And because a landmark reads as a
pick when nothing is picked, its chip is visibly muted; when a selection pins
the very structure a landmark names, the landmark steps aside rather than
showing the same name twice. Hover keeps the landmarks' terms: an anchor on
the structure's own outside and the same occlusion test, so its label
disappears when its structure does rather than floating over whatever is in
front. Appearing is immediate; disappearing waits a moment, so a label does not
blink along an occlusion edge as the model turns. **That wait is for occlusion
and for nothing else**: a structure the settings are not drawing — hidden by
the reader, isolated away — is not an edge flickering, it is a thing that is
not there, and its label goes on the same frame. A name left over it for even
a moment is a name over whatever is behind it. Hiding a label never changes
what the panel says is pinned.

**Searching answers with every match.** The count is the number that matched,
not the number drawn, and there is no quiet cap that would leave the rest
unreachable. The results are a listbox and behave like one: arrows, Home and End
move the keyboard through them without selecting, Enter or Space commits, and
the row marked selected is whichever result *is* the pinned structure — asked of
the scene each time it paints, so clicking the model marks the matching row and
a selection outside the results marks nothing rather than leaving the first row
looking chosen. The index follows the atlas: one built while the model was still
loading is rebuilt when it arrives, and the reader's query is answered again
rather than thrown away. Structure ids reach the scene in the scene's own type;
the string on the element is how the DOM had to store it.

## 7. What it must never be used for

Diagnosis, measurement, lesion localisation, stereotactic coordinates,
operative planning, navigation, estimating an individual's anatomy or making a
clinical claim about a person.

## 8. Review status

**Catalog status:** `alpha`

The real atlas, complete label-translation coverage, colour modes, hover/pin
interaction and medial visibility path are implemented and tested. Independent
medical review of the complete label set and Japanese terminology is not yet
recorded, and the source geometry still lacks a separately selectable ACC, so
this scene must not be marked reviewed or production.

An AI-assisted terminology/hierarchy/copy check was recorded on 2026-09-16
with verdict **hold** and 24 findings; it is not a clinical attestation and
does not change the review status above. See
[`docs/clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16.md`](../clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16.md).
A re-review of the resulting revision 21 (also 2026-09-16, against `880eded`)
found 16 of the original 24 findings resolved and 8 unresolved or partly
addressed, verdict **revise**; it is likewise not a clinical attestation. The
`Revision 21 → 22` entry below addresses most of that re-review's remaining
findings (#6, #8, #12, #15, #17, #18, #21, R2-25, R2-28, R2-29); it does not
close #2 (the insula/subcentral-gyrus boundary) or #12's LUT-name
cross-check, which need either a landmark-annotated image or independent
access to the original atlas lookup tables that this repository does not
have.
A third round (2026-09-16, against `852b691`, revision 22) accepted the insula
naming, the view-bound notices and the colour record and found two new items
(R3-30 the paracentral sulcus, R3-31 the mamillary body wording), verdict
**revise**; the `Revision 22 → 23` entry below closes them. The fourth round
(2026-09-17, against `5205c6b`, revision 23) returned **approve**, expressly
limited to that version, to general/medical education of gross anatomy and to
what the reviewer could see, with the constraints in the record; it is not a
clinical attestation and the registry stays `pending` (F-139). Records:
[`…-rereview-880eded.md`](../clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16-rereview-880eded.md),
[`…-review3-852b691.md`](../clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16-review3-852b691.md),
[`…-approve-5205c6b.md`](../clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-17-approve-5205c6b.md).

## 9. Revision history

**Revision 22 → 23 — the selection-label fix closed three defects a review
found in it.** Revision 22 gave a selection its own anchor instead of the
landmarks' fixed one; review of that change found three ways it still failed
its own stated behaviour, all now closed. A re-tap on the structure already
selected kept the annotation id `structure:<id>` and was discarded as a
no-op even though the tap landed on a new point — `LabelLayer.setStructureLabel`
now compares the anchor as well as the id. The selection was exempt from the
label cap *and* excluded from the count it takes, so a pinned structure could
put a fourth label on a three-label phone screen where the card promises
three — it is exempt from eviction, not from the count, so a landmark still
steps aside for it. And a selection made without a tap (the parts tree, the
keyboard) kept the one candidate anchor the camera could see at that moment;
rotating away from it could hide the label even with another candidate on the
same structure still on screen — the annotation now offers a fresh candidate
through `reanchor()`, tried only once the current one has already failed the
occlusion test, never on a point that still holds. No claim in this card
changed: what a selection is anchored to, and when it is shown, are unchanged
in kind — only made to hold in the cases these three did not.

**Revision 23 → 24 — an audit of revision 23 found three more, and one
cost.** The candidate points a structure offers a label are computed once and
kept for the life of the scene; `reanchor()` moved a label by writing into the
very object it had been handed, so one swap overwrote the structure's
best-ranked candidate for every later selection of it — the label now owns a
copy. A tap's own point was exempt from re-anchoring altogether, so the one
selection method most readers use was the one that could not recover once the
model turned the point behind a neighbour — it is now preferred only while the
camera can see it, tried again the moment it can be, and the ranked candidates
stand in between. A pointer resting on the structure already selected produced
a second label on the same point reading the same name (the hover), which now
merges into the selection as a landmark already did. And a structure with
nothing visible on it at all paid for a full candidate search every frame it
stayed selected; the search now runs once per camera pose. No claim in this
card changed.

**Revision 24 → 25 (2026-09-17) — the four-round terminology review lands
(PR #125).** This branch and the selection-label branch (PR #132, revisions
20 → 24 above) diverged from revision 20 and each counted its own revisions;
the review records cite the branch's numbers (revision 21 = `880eded`, 22 =
`852b691`, 23 = `5205c6b`). Merged after #132, everything the branch recorded
as 20 → 23 lands here as one step; its two later branch revisions (24 and 25)
were ledger renumbering only (F-120…F-124 → F-139…F-143 in the notes) and
carry nothing a reader sees. No geometry, id or mesh selection changed in any
of the three parts below.

**(a) Branch revision 20 → 21 (2026-09-16) — label, hierarchy and copy corrections.** Label, hierarchy and copy corrections driven
by that check, all in `src/data/brainAnatomy.js`; no geometry, no ids and no
mesh selection changed. `Base of peduncle` moves from the cerebellum to the
brainstem/midbrain (Terminologia Anatomica's *basis pedunculi* is a midbrain
structure) via a new `LABEL_PLACEMENT` override, with a note naming the
upstream cerebellum tag it corrects — this is the one label whose **colour**
family also changes, from cerebellum to brainstem, as a direct consequence of
the category correction. `Insula (Subcentral gyrus and ant. and post. sulci)`
is now named 島皮質: rendering confirmed the mesh is the insular cortex under
the opercula, not the lateral-surface subcentral gyrus the upstream label also
names. The `structureFamily()` regex that matched "lateral sulcus" no longer
matches the substring inside "Col**lateral sulcus**" or "Posterior transverse
collateral sulcus", both of which now read 大脳溝 instead of 外側溝. Plural
"sulci" labels (e.g. "Orbital sulci") and the two cortical poles now get their
own families instead of falling to the generic 大脳皮質/大脳回 fallback. The
aqueduct of midbrain, septum pellucidum and choroid plexus are filed under
ventricular-system families without describing the septum or plexus as CSF
spaces. The seven Najdenovska (2018) thalamic parcels, the `Corticomedial
group` and five Neudorfer (2020) hypothalamic parcels now carry a note citing
their source and stating they are not histological nuclear boundaries (F-142).
Several Japanese names were corrected for accuracy or to mark them explicitly
as atlas subdivisions rather than standard nuclei (VA/VLD/VLV thalamic nuclei,
the basolateral amygdala complex, the paracentral lobule spanning frontal and
parietal lobes, and others — see the check record for the full list). The
detail-colour palette seed also moved (`palette-v2930` → `palette-v38601`)
because the `Base of peduncle` colour-family change required re-finding a seed
that keeps all 147 named structures perceptually distinct; since the seed is
in every hash, every colour-map shade changed (147/147). Natural-anatomy
shades are not seeded, but `brainColorKey()` feeds both modes, so the same
category/region correction for `Base of peduncle` changes its natural-anatomy
shade too — 1 of 147 labels (2 structures, left and right); the other 146 are
unchanged in natural-anatomy mode. Colour aids identification and grouping; it
does not show real tissue colour, functional localisation, vascular territory,
exact boundaries or positional accuracy (§6).

**(b) Branch revision 21 → 22 (2026-09-16) — the re-review's remaining findings.** Driven by the 2026-09-16 re-review of
revision 21 (`880eded`, verdict revise, 8 unresolved/partial findings). No
geometry, no atlas ids and no colour changed in this revision — every change
is to copy, notes, a display-only breadcrumb override and per-view UI text.

- **#25/§R2-29 — colour wording corrected.** The claim that natural-anatomy
  shades were unaffected by the revision-21 palette move was wrong:
  `brainColorKey()` feeds both modes, so `Base of peduncle` (2 structures)
  also changed in natural-anatomy mode; the other 146 labels did not. "Colour
  encodes no anatomy" is replaced with the re-review's own wording: colour
  aids identification and grouping and does not show real tissue colour,
  functional localisation, vascular territory, exact boundaries or
  positional accuracy (§6, and `docs/beta-publication/brain-anatomy.md`).
- **#17 — the ATTRIBUTION.md "about 7 mm" generalisation is retracted**, in
  `public/assets/brain/ATTRIBUTION.md`, matching the wording already in §5
  above (registration approximation across several population atlases; the
  upstream ~7.2 mm figure is a red-nucleus position check, not a bound for
  every structure).
- **#12/F-142 — merged-parcel source label ids recovered from the pinned
  upstream generator script**, recorded in
  [`docs/asset-provenance/brain-merged-parcels.md`](../asset-provenance/brain-merged-parcels.md)
  (amygdala Lateral/Basolateral/Central/Corticomedial; hypothalamic
  preoptic/anterior/tuberal/lateral/posterior per-side label counts; thalamic
  volume order and the CL–LP–PuM left/right index). The five hypothalamic
  `STRUCTURE_NOTE` entries no longer share one "integrated parcel" wording:
  preoptic, lateral and posterior are single-source-label parcels per side;
  only anterior (6 labels) and tuberal (4 labels) actually combine several.
  Corticomedial group and Basolateral complex each cite their specific source
  ids. What is **not** verified is stated plainly in that document: original
  lookup-table names, regeneration from source volumes, and input-file
  hashes.
- **#8 — the CL–LP–PuM thalamic label now names CL explicitly**: "視床
  CL–LP–PuM 区画（外側中心核・後外側核・内側視床枕を含む）", with a note
  naming CL as the central lateral nucleus specifically (not the broader
  intralaminar group) and pointing at the provenance record above.
- **#6/#21 — a display-only `regionNames` override** on `LABEL_PLACEMENT`
  makes the breadcrumb for the paracentral lobule's two meshes read "Frontal
  and parietal lobes/前頭葉・頭頂葉" and for the lateral occipitotemporal
  gyrus/sulcus read "Temporal and occipital lobes/側頭葉・後頭葉", matching
  what their own description already said. This touches only the breadcrumb:
  `region`/`regionJa` and `brainColorKey()` still resolve from the unchanged
  upstream region, so colour is untouched (asserted in
  `tests/brain-anatomy.test.js`). Each also gets a note stating the upstream
  navigation region is the single lobe it was filed under.
- **#15 — Habenula and Septal nuclei** now carry a note stating the source
  data records each as one mesh that does not distinguish left and right, so
  the midline display is the data's storage unit, not a guaranteed
  anatomical midline structure.
- **#18/R2-26 — view-bound notices.** `VIEW_SPECS` in
  `BrainAnatomyScene.js` carries an optional `notice`/`noticeJa` per
  viewpoint, exposed through `getAnatomyViews()`/`getInspectionViews()` and
  rendered by `InspectionPanel.js` as one line under the viewpoint buttons
  whenever the active view declares one. Left and right medial views state
  that the contralateral hemisphere is hidden and this is not a midsagittal
  section; right medial and inferior additionally state that this model has
  no right medulla oblongata mesh (F-141) and that this is a data gap, not a
  normal left/right asymmetry. Lateral, anterior, posterior and superior
  views carry no notice.
- **R2-28 — export tooling.** `scripts/export-anatomy-labels.mjs` renames
  its per-structure table to "271 選択可能構造一覧" (`structures.md`,
  replacing the stale `meshes.md`) and adds `description_key` (which of
  structure/region/category/default resolved a row's description, via the
  new `brainCopySource()` helper in `src/data/brainAnatomy.js`) and
  `has_note` columns.

**(c) Branch revision 22 → 23 (2026-09-17) — the third review's two findings.** Driven by the third AI review (of
revision 22, `852b691`, verdict revise: 12 of 13 carried findings resolved,
R2-27 partly, two new). No geometry, ids, colour or view text changed.

- **R3-30 — the paracentral *sulcus* is no longer swept up by the lobule's
  override.** Revision 22 applied the "frontal and parietal lobes" breadcrumb
  and the lobule's note to the lone `Paracentral sulcus` label (bx_id
  307/308) as well as to `Paracentral gyrus and sulcus` (261/262). The sulcus
  is the anterior boundary of the lobule and a frontal-lobe sulcus, so it
  returns to 前頭葉 › 大脳溝 with its own one-sentence description; the
  lobule keeps the two-lobe breadcrumb. A regression test pins both.
- **R3-31 — mamillary body wording.** The provenance record and a code
  comment called the mamillary body "a classically named individual
  nucleus"; it contains medial and lateral mamillary nuclei, so both now say
  it is a separately named gross-anatomical structure that is not one of
  the five Neudorfer-sourced parcels. Display name, id and mesh unchanged.
- **R2-27 — capture records.** The evidence manifest sent with the third
  submission claimed hidden-structure ids were recorded; they were not read
  from the runtime, so those fields are now `null` with the reason stated
  rather than filled in afterwards.

Sources in scope: `src/data/brainAnatomy.js`,
`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`,
`src/components/InspectionPanel.js`. `src/components/InspectionPanel.js` is
shared UI, not a medical source, and is not part of the revision digest below
— see `docs/model-cards/revisions.json`.

**Revision 25 → 26 (2026-09-19) — the colour map groups by lobe.** A
presentation change only: no geometry, no atlas ids, no labels, no
hierarchy, no copy and no claim in this card changed, and natural-anatomy
mode is untouched. Each colour family in `DETAIL_COLOR_FAMILY`
(`src/data/brainAnatomy.js`) now holds a narrow hue band and separates its
members by lightness and saturation inside it, where before a family spanned
up to 130° of HSL hue — 155° of CIE Lab hue for the frontal lobe in the
render, magenta through to yellow within one lobe — which left the large
units with no visible identity of their own. The bands were also pushed
apart: the frontal and parietal lobes had overlapped, and the cerebellum now
sits clear of the temporal lobe and the limbic lobe. The palette is seeded
per family rather than once for the whole atlas, because the placement
inside a band is a deterministic hash and the seed that is even enough for
35 deep-grey nuclei is not the one that is even enough for 21 frontal gyri;
each seed is the outcome of a search against the same all-label perceptual
distance audit, whose closest pair improves from ΔE 4.31 to 4.65 across all
147 named structures. The cost is paid inside a family: the median
nearest-neighbour distance among the 21 frontal structures falls from ΔE 10.9
to 7.3, because hue is no longer available to separate them. That trade is
the change — the lobe is now a visible group and its gyri are separated by
value instead of by hue. Since the seeds and the bands are both in every hash,
every colour-map shade changed (147/147); all 147 remain distinct.
`BRAIN_PALETTE` — the legend swatches, and the colour-mode selector's own
preview — is now derived from the band centres instead of being a separate
hand-picked list, so a swatch cannot drift away from the meshes it stands
for. `tests/brain-anatomy.test.js` holds both halves of the new rule: the
hue spread inside each family, including its legend swatch, and the hue gap
between the cortical lobes. Colour still aids identification and grouping
and does not show real tissue colour, functional localisation, vascular
territory, exact boundaries or positional accuracy (§6).

Sources in scope: `src/data/brainAnatomy.js`,
`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`.
