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
Colour-map shades are deterministic from anatomical metadata, use the same
colour for left/right homologues, and vary hue, saturation and lightness inside
the parent lobe family. Natural-anatomy shades use a constrained low-saturation
range with small deterministic lightness differences between named meshes. The
same selector also updates the legend swatches; neither mode changes anatomical
identity or geometry.

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
was tried, not papered over.

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

**The structure a reader picks is named on the model, not only in the panel.**
The selection and the hover get a label on the same terms as the four authored
landmarks: the structure's own names, an anchor on its own outside, and the same
occlusion test, so a label disappears when its structure does rather than
floating over whatever is in front. When more labels apply than a frame can
carry — six on a wide screen, three on a narrow one — the ones that give way are
the ones the reader did not ask for: selection outranks hover, hover outranks
the landmarks, and nothing is stacked into a spare corner to make it fit.
Appearing is immediate; disappearing waits a moment, so a label does not blink
along an occlusion edge as the model turns. **That wait is for occlusion and for
nothing else**: a structure the settings are not drawing — hidden by the reader,
isolated away — is not an edge flickering, it is a thing that is not there, and
its label goes on the same frame. A name left over it for even a moment is a
name over whatever is behind it. Hiding a label never changes what the panel
says is pinned.

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
