# Beta publication decision — `brain-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against the files that are
actually being served, by whom, on what date, and what was *not* checked.
The clinical review of this model is **pending** and every surface says so —
see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
It is also not the anatomy/CG quality pass (B3). Part of B3 has now happened —
the scene was rendered at all six of its fixed viewpoints in both colour modes
and one defect was found and fixed (see below) — but that is an engineer looking
at pictures. **No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-17 (re-taken five times: a branch of the tree gained a way to be hidden whole, what a hide announces was corrected, a selected structure's label was made to survive its own anchor being occluded, then a review of that fix found three ways it still failed its own stated behaviour and they were closed, then an audit of the result found three more and a per-frame cost, also closed, then the four-round terminology review branch landed on top of it) |
| **Decided by** | Claude Code (AI engineering agent), landing the four-round terminology review (PR #125) after the selection-label fix (PR #132) |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Asset revision** | `brain-atlas-glb` @ `sha256:76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` |
| **Scene revision** | model card revision **24**, source digest `decebbf91111e0e4` |
| **Scene sources under that digest** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js), [`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js), [`src/scenes/shared/anatomy/tapGesture.js`](../../src/scenes/shared/anatomy/tapGesture.js) |

The decision is pinned to **both** revisions in
[`src/catalog/release.js`](../../src/catalog/release.js). Re-export the mesh and
the asset hash moves; change the part correspondence or the selection behaviour
and `npm run revisions:check` fails until the card is revised, which moves the
card revision. Either one closes the beta until this record is taken again —
which is the point: a decision about one version of a model is not a decision
about a different one.

## Why this was re-taken

**Revision 4 → 5.** B2-1 changed what a click selects — a structure drawn from
several meshes is now one structure rather than whichever piece the atlas
registered last — and added a part tree and an isolate control.

**Revision 5 → 6.** Replacing the atlas cleared the scene's selection silently.
The getters were right and the panels were not: the card went on naming a
structure from the discarded model and a row stayed marked selected, because a
surface that repaints on an event was never sent one. The reset is announced now.

**Revision 6 → 7.** B3-1 changed what a medial view draws. Rendered at its own
fixed viewpoints for the first time, a medial view turned out to be a hollow
cortical shell: the corpus callosum, the thalamus and the white matter behind
them were all held at zero opacity by the layer slider, so the middle of the
view was empty and the page background showed through the far wall. The midline
block is present for a medial view now, and ghosts back out as depth is asked
for. Nothing moved, nothing was recoloured, no structure id changed — but what
the reader is shown for two of the six viewpoints did, so this record is taken
again against the new revision.

**Revision 7 → 8.** F-37: the annotation labels are HTML over the canvas and
were not depth-tested, so a left-hemisphere name was drawn on the right
hemisphere's surface in the right lateral view. A label is now shown only when
the structure it names is the first thing drawn along the ray to its anchor —
the same ray a click uses — so it agrees with the layer, the medial views and
isolation without a rule about sides. Label visibility is not selection: a
pinned structure keeps its id and its summary either way.

**Revisions 8 → 13** were taken during B3-1 and X1–X2 and are not itemised here;
what they changed is in the "What was checked" list below, which is the list
that was actually exercised rather than a summary of it.

**Revision 13 → 14.** The label layer waits a moment before a label disappears,
so that a name does not blink along an occlusion edge as the model turns. That
wait was being applied to a structure the reader had *hidden* as well, which is
a different thing: a hide does not flicker, and a name held over a structure
that is no longer drawn is a name over whatever is behind it. The scene now
answers two questions instead of one — "can this be seen from here" and "is it
drawn at all" — and only the first is worth waiting out.

**What that means for this record.** Nothing a reader selects, sees named or can
find changed; what changed is how quickly one label goes when they take its
structure off the screen. It still closes the gate, because the pin is not a
judgement of how big a change is — it is a statement that this decision was
taken about *this* version.

**Revision 14 → 15.** What counts as a click changed, and this one a reader
does feel. The release was measured against the press by distance alone, so a
press that went out and came back had gone nowhere and was read as a click on
whatever had rotated under the pointer in between. That is the ordinary way to
turn the model on a touch screen — swipe across it, swipe back — and it was
found by driving the landing hero with emulated touch (iPhone 13 / Pixel 5 /
iPad Mini viewports, Chromium with `hasTouch` and real touch events): turning
the brain and letting go pinned the pons, which nobody had chosen. A press is
now a click only if it ends where it began **and** the pointer did not travel
far in between, in one rule both anatomy scenes share
([`src/scenes/shared/anatomy/tapGesture.js`](../../src/scenes/shared/anatomy/tapGesture.js),
fixed by [`tests/tap-gesture.test.js`](../../tests/tap-gesture.test.js)). The
looser bound on travel is deliberate: a finger is never perfectly still, and a
tap thrown away is the worse failure of the two.

**No physical phone has run this.** Emulated touch is the same event path on
desktop hardware; it is not a device pass (F-101).

**Revision 15 → 16.** Review of revision 15 found that the first reading of
"did not travel far" was the *length of the path*, which grows with how long a
press lasts rather than how far it went: a contact patch rolls a fraction of a
pixel per event, so a deliberate press on a small structure at 120 Hz totalled
tens of pixels without the finger leaving a two-pixel neighbourhood, and the tap
was thrown away. It is the greatest distance from the press point now, which
does not accumulate. The same review found the brain scene never listened for
`pointercancel`, so a press the browser took away — a pinch, a swipe the page
claims — stayed open in the tracker; it is wired, on both scenes. So is
`pointerleave`, which is the same hole by the other door: a drag that wanders
off the canvas is released where the canvas never hears it, and the press it
left open would be what the *next* release was measured against. Nothing is
lost by closing it, because a tap does not leave the canvas.

**Revision 17 → 18.** Naming a structure was something only a mouse or a
finger could do: every route into the selection went through a pointer event, so
a reader with a keyboard could turn the model and never be told what they were
looking at. `selectAtCanvasPoint()` asks the same question of the same ray from
a point rather than from an event, and the landing hero asks it of the middle of
the frame on Enter, clearing on Escape. Nothing about *what* is at a point
changed — this is a second door into the same room — but the scene's surface
did, so the record is taken again.

**And the rule itself is now declared as a model source.** Lifting it into
`tapGesture.js` had moved what a click selects *outside* the digest this record
is pinned to, so a later change to it would not have closed this gate — the one
thing the pin exists to do. All 31 anatomy entries in
[`revisions.json`](../model-cards/revisions.json) declare the shared file, and
`tests/tap-gesture.test.js` fails if one of them stops.

**Revision 18 → 19.** Hiding was one structure at a time. A reader who wanted
to see the midline block, or the ventricular system without the hemisphere
around it, had to press Hide seventy-seven times — which is to say they did not
do it, and the interior of the model was reachable in principle and not in
practice. Every branch of the Parts tree now carries its own visibility control
and answers `V` when focused, writing to the **same hidden set** a single
structure's Hide writes to: one pass over the model and one report for the whole
branch, so Unhide all still brings everything back and an isolation still
overrides it while it lasts. Nothing about the atlas changed — no id, no label,
no geometry, no colour — but what a reader can take off the screen did, and the
scene's visibility surface is exactly what this record is a decision about.

**Revision 19 → 20.** Review of revision 19 found two things a hide had never
said, both older than the group control and inherited by it. Hiding the isolated
structure drops the isolation, but only the visibility event was sent — and the
part tree learns about isolation from `onAnatomyIsolation` and nowhere else, so
it went on drawing a row as isolated after the scene had stopped isolating it.
And `restoreDisplay()` puts back the *whole* hidden set from the snapshot a
reveal left, so a hide or show the reader made afterwards was silently undone by
a control that says it undoes the reveal. Both are now one place:
`_visibilityChanged()` applies the pass, announces the hidden set, announces an
isolation it ended, and throws the stale snapshot away.
`tests/brain-anatomy.test.js` fails on the old behaviour for both.

**Revision 20 → 22.** A reader who tapped a cortical structure on a phone
could see the panel name it while the model itself went on showing only the
authored landmark that happened to be in view (中側頭回) — the selected
structure's label had gone missing. Root cause: the selection label used the
same fixed anchor a landmark uses — one outward vertex, chosen once at load,
independent of the camera — and for a sulcus that vertex can sit behind the
gyri folded over it (F-40); it was already known to fail for the central
sulcus and had simply not been observed for a selection before. Fixed by
giving a selection its own anchor: the exact point a tap hit (visible by
construction, since the same ray selected the structure), or, for a selection
made without a pick point, the first of several ranked candidate points the
live camera can actually see. A selection is also now exempt from the
on-screen label cap, and an authored landmark is drawn visibly muted and
steps aside when a selection pins the structure it names, so a landmark no
longer reads as an answer to "what did I just tap" — see
[`docs/verification-lessons.md`](../verification-lessons.md) L-46.
`npm run verify:anatomy` now asserts, after a selection, that a label for the
selected structure is on screen and reads what the panel reads; it did not
before, which is why this shipped unnoticed. A related gap found while fixing
this: the recorded tap point survived `clearSelection()`, so a later selection
of the same structure made a different way (keyboard, a tour) could silently
reuse a stale tap; `clearSelection()` now drops it. Nothing about which
structure a tap selects, what the panel names, or the atlas itself changed.

**Revision 22 → 23.** Code review of revision 22's fix found three ways it
still failed the behaviour it claimed. First, a re-tap on the structure that
was already selected recorded a new hit point (`_lastPick`) and re-emitted
the selection, but `LabelLayer.setStructureLabel` compared only the
annotation id — `structure:<id>`, unchanged by where the tap landed — so the
second tap's point was silently discarded and the label stayed on the first
one. It now compares the anchor as well as the id. Second, the selection was
excluded from the drawn count as well as from eviction, so all six (or three,
on a phone) landmarks kept their slots *and* the selection was added on top —
one more label than the documented cap. The selection is still exempt from
eviction — it is never the one dropped — but it now counts, so the
lowest-priority landmark steps aside for it as any other label would. Third,
a selection made without a tap — the parts tree, the keyboard — had its
anchor chosen once, against whatever the camera saw at that moment; rotating
away from it could hide the label even though another candidate on the same
structure was still in view, because nothing asked again. The annotation
`getStructureAnnotation` returns now carries a `reanchor()` method that tries
a fresh candidate against the live camera, called by the label layer only
once the current point has already failed its own occlusion test — never a
per-frame search on a point that still holds. A tap's own point is unaffected
by this: `_visibleAnchorFor` already prefers it unconditionally, so
`reanchor()` is a no-op for it. All three were guarded before being fixed
(`tests/label-layer.test.js`, `tests/brain-anatomy-selection-label.test.js`):
each guard was reverted, confirmed to fail, then restored and confirmed to
pass. Nothing about which structure a tap selects, what the panel names, or
the atlas itself changed.

**Revision 23 → 24.** An independent audit of revision 23, with the code and
not the description in hand, found three more ways the fix fell short and one
cost. First, `_visibleAnchorFor` returned the cached candidate object itself,
and `reanchor()` moved the label by writing into it — so one reanchor
overwrote the structure's best-ranked candidate in the cache with the second,
for every later selection of that structure in the session (a Rule 3 failure:
the structure's geometry and one label's anchor had become the same object).
The label now owns a clone. Second, a tap's own point was preferred
unconditionally, which made `reanchor()` a permanent no-op for tapped
selections — the revision 23 text above records that as deliberate, and it was
the wrong trade: a tap is visible by construction only at the moment it lands,
and it is the way most readers select. The tap point is now used verbatim
while the camera can see it, the ranked candidates stand in once it cannot,
and the tap point is taken back as soon as it is visible again. Third, a
pointer resting on the structure already selected fires the hover with the
same annotation, and only a *landmark* naming the selected structure merged
into the selection — a hover did not, so a desktop reader who clicked a
structure and then read its label got two chips on one point. A hover now
merges too. Fourth, a structure with nothing visible on it (the far hemisphere
on a medial view) was searched again every frame it stayed selected; the
search now runs once per camera pose. Each of the four was guarded before
being fixed (`tests/brain-anatomy-selection-label.test.js`,
`tests/label-layer.test.js`), confirmed to fail on revision 23, then confirmed
to pass. Nothing about which structure a tap selects, what the panel names, or
the atlas itself changed.

**Revision 24 → 25.** The four-round AI terminology review branch (PR #125)
lands after the selection-label fix. That branch counted its own revisions
from 20 (the review records cite them: 21 = `880eded`, 22 = `852b691`, 23 =
`5205c6b`), so its three substantive steps land here as one, and its two
ledger-renumbering-only steps carry nothing a reader sees. What changed, in
the branch's own words:

**(a) Branch revision 20 → 21.** The 2026-09-16 AI-assisted terminology/hierarchy/copy
check (not a clinical attestation; see
[`docs/clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16.md`](../clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16.md))
drove label, hierarchy and copy corrections in `src/data/brainAnatomy.js`. No
geometry, no mesh selection and no atlas ids changed. Category placement moved
for one label — `Base of peduncle`, from the cerebellum to the brainstem,
because Terminologia Anatomica's *basis pedunculi* is a midbrain structure and
the upstream metadata filed it under the cerebellum — so its colour family
moves from cerebellum to brainstem. Keeping all 147 named structures
perceptually distinct after that move required a new detail-palette seed
(`palette-v2930` → `palette-v38601`), and the seed is part of every hash, so
**every colour-map shade changed**, not only that label's (147/147 labels).
**Natural-anatomy shades are not seeded and did not need re-finding, but they
are not exempt from the category move either**: `brainColorKey()` feeds both
modes, and for `Base of peduncle` the category/region correction changes which
colour family (cerebellum → brainstem) the natural-anatomy calculation looks
up too. So natural-anatomy shades changed for the one corrected label (2
structures, left and right); the other 146 labels are unchanged in that mode.
Colour aids identification and grouping; it does not show real tissue colour,
functional localisation, vascular territory, exact boundaries or positional
accuracy (model card §6). Earlier colour-map screenshots under
`docs/screenshots/` therefore no longer match the shipped shades. Other
corrections: a hierarchy regex bug that put "Collateral sulcus" and "Posterior
transverse collateral sulcus" under 外側溝 instead of 大脳溝; plural "sulci"
labels and the two cortical poles now have their own families instead of the
generic cortex/gyri fallback; the aqueduct of midbrain, septum pellucidum and
choroid plexus are filed under ventricular-system families without describing
the septum or plexus as CSF spaces; several Japanese names and provenance notes
were corrected (VA/VLD/VLV thalamic nuclei, the basolateral amygdala complex,
the paracentral lobule, the insula mesh's name, and the Najdenovska/Neudorfer
atlas-sourced parcels). This record is taken again because what a reader is
told about several structures changed, even though nothing about what is drawn
or selectable did.

**(b) Branch revision 21 → 22.** A 2026-09-16 re-review of revision 21 (`880eded`,
verdict revise) found 16 of its 24 original findings resolved and 8
unresolved or partly addressed. This revision addresses most of the
remainder — no geometry, no atlas ids and no colour changed:

- The natural-anatomy colour claim in the "Revision 20 → 21" paragraph above
  is corrected: `Base of peduncle` (2 structures) changed in natural-anatomy
  mode too, not only in colour-map mode; the other 146 labels did not, and
  the model-card §6 colour wording is replaced with the re-review's own
  sentence about what colour does and does not encode.
- `public/assets/brain/ATTRIBUTION.md`'s "about 7 mm" generalisation for
  every registered deep structure is retracted, matching model card §5.
- Merged-parcel source label ids (amygdala, hypothalamus, thalamus) were
  recovered from the pinned upstream generator script and recorded in
  [`docs/asset-provenance/brain-merged-parcels.md`](../asset-provenance/brain-merged-parcels.md);
  the five hypothalamic notes no longer claim uniformly that all are
  "integrated parcels" — three of five are single-source-label parcels per
  side.
- The CL–LP–PuM thalamic label spells out CL as the central lateral nucleus.
- A **display-only** `regionNames` override on two label pairs (the
  paracentral lobule's two meshes; the lateral occipitotemporal gyrus and
  sulcus) makes their breadcrumb show both lobes their own description
  already names, without changing `region`, `brainColorKey()` or colour.
- Habenula and Septal nuclei carry a note that their midline display is the
  source data's single-mesh storage unit, not a guaranteed anatomical
  midline structure.
- **View-bound notices.** `VIEW_SPECS` carries an optional `notice`/
  `noticeJa` per viewpoint. Left and right medial views now state, from the
  viewpoint itself rather than only from a hidden layer-stage description,
  that the contralateral hemisphere is hidden and this is not a midsagittal
  section; right medial and inferior additionally state that this model has
  no right medulla oblongata mesh (F-141), so a reader looking at either
  view cannot mistake the gap for a normal asymmetry. `InspectionPanel.js`
  renders the active view's notice as one line under the viewpoint buttons.
- The label-export script's per-structure table is renamed "271 選択可能
  構造一覧" (`structures.md`, replacing the stale `meshes.md`) and gains
  `description_key`/`has_note` columns.

**(c) Branch revision 22 → 23.** The third AI review (of `852b691`, verdict revise)
accepted the insula naming, the view notices and the colour record, and
found one regression this record's previous revision introduced: the
two-lobe breadcrumb meant for the paracentral *lobule* had also been applied
to the lone paracentral *sulcus* (bx_id 307/308), which is the lobule's
anterior boundary and a frontal-lobe sulcus. It is back under 前頭葉 ›
大脳溝 with its own description; the lobule (261/262) keeps 前頭葉・頭頂葉. The
provenance note calling the mamillary body a single nucleus is corrected.
Nothing drawn, selectable, coloured or announced in a view changed, but what
the panel says about two structures did, so this record is taken again.


Each time the gate closed and the production build stopped shipping the scene
until this record was taken again — the mechanism working. An earlier decision
was about a model that behaved differently, and it is not carried forward.

## What was checked

Driven in a real browser (Chromium, 1280×800, production build) by
[`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs)
— `npm run verify:anatomy`. Re-running it is how this record is re-verified;
that is why the evidence is a script rather than a stored image.

Since revision 15 a second drive checks the same model **under the inputs that
are not a mouse** — [`scripts/check-hero-input.mjs`](../../scripts/check-hero-input.mjs),
`npm run verify:hero-input`: a finger at the iPhone 13, Pixel 5 and iPad Mini
viewports with touch emulation, and a keyboard on the desktop viewport. It is
where the out-and-back press was found. It drives the landing hero, which is
this atlas in a smaller frame. The touch half is **not** a device pass —
emulated touch on desktop Chromium, no iOS Safari, no hardware; the keyboard
half is a real keyboard in a real browser.

**Structures** — the scene reports **271 selectable structures** drawn from 397
meshes. Four clicks on the rendered mesh each resolved to a named structure
carrying an English name, a Japanese name and a place in the hierarchy:

| clicked | English | Japanese | hierarchy |
| --- | --- | --- | --- |
| (0.40, 0.34) | Supramarginal gyrus | 縁上回 | Left cerebral hemisphere › Parietal lobe › Cerebral gyri |
| (0.30, 0.45) | Circular sulcus of insula | 島輪状溝 | Left cerebral hemisphere › Telencephalon › Insular cortex |
| (0.50, 0.50) | Middle temporal gyrus | 中側頭回 | Left cerebral hemisphere › Temporal lobe › Cerebral gyri |
| (0.50, 0.42) | Angular gyrus | 角回 | Left cerebral hemisphere › Parietal lobe › Cerebral gyri |

**This table was wrong for a week, and that is worth stating plainly.** Until
2026-09-15 it read *Opercular part of inferior frontal gyrus*, *Supramarginal
gyrus*, *Middle temporal gyrus* and *Superior temporal sulcus* — measured from a
run on 2026-09-08 and carried forward unchanged when this decision was re-taken.
Re-measured on the current build, in production and again under preview, one of
those four was still right; one click had come off the model entirely and named
**nothing**, so the sentence above it — that four clicks each resolved — was
false.

Nothing had changed in this scene. The points are fractions of the canvas, and
the layout moved under them (the control bar's height, two type floors, three
panel changes), none of which touches this scene's sources — so the
model-revision digest could not notice and `npm run revisions:check` stayed
green throughout. The reason it went unseen for a week is narrower still: the
entry for this scene in `SCENE_POINTS` was bare coordinates, so the drive
asserted that four clicks named *something*, never which. `heart-anatomy` had
carried expected names since F-118; the published reference scene had not.

The points above are now **named in `SCENE_POINTS`, and the drive is held to
them** — a run fails if any point names a different structure, hits nothing, or
if the four points name fewer than four distinct structures. The dead point is
replaced by one the drive itself measured to be over the model. So this table is
re-verified by `npm run verify:anatomy` rather than by anyone re-reading it.

**Part tree** — 271 rows, one per structure, checked to have no two rows with
the same name under the same branch. Selecting in 3D highlights the matching
row and opens the branch holding it; clicking a row puts that structure on the
card. Both directions were driven.

**Viewpoints** — eight are offered and one was applied by the drive: Left
lateral / Left medial / Right lateral / Right medial / Anterior / Posterior /
Superior / Inferior. The six that existed before this work were also **rendered**
in both colour modes, at one camera per viewpoint, before and after the B3-1
change — [`docs/screenshots/b3-1/`](../screenshots/b3-1/), and the
reading of them is [`docs/anatomy-review.md`](../anatomy-review.md) §3.1. That is
a rendering check, not an anatomical one.

**Interactions**

- A click on the model pins a structure and the panel names it.
- **A route can open on a structure**: `#/brain-anatomy?structure=<id>` selects
  that structure and brings it into view, which is how the landing hero hands a
  reader over to the full model already looking at the part they found. It
  deliberately does not *reveal* it — a link may say where to look, not
  rearrange the model on arrival — and an id this atlas does not have opens the
  model normally with nothing selected.
- **So does a keyboard, with no pointer anywhere**: Tab reaches the 3D
  viewport, the focused viewport draws the spot Enter will ask about, Enter
  names the structure drawn there, Escape lets go of it, and turning the model
  with the arrows and asking again names a different one. Driven in
  `check-hero-input.mjs`, which was watched failing with the keys removed.
- **A pointer crossing the model does not rewrite the pinned summary** or the
  controls beside it; hover previews only while nothing is pinned.
- The tree answers the keyboard: one tab stop, arrows move focus without
  selecting, Enter commits, Home/End reach the ends, and none of those keys
  reaches the scene's own shortcuts underneath.
- Every branch announces the expanded state it is drawn in, including one opened
  because a structure was selected in 3D.
- On a 375×667 phone the parts sheet opens from the summary, takes focus, makes
  the background inert, closes on Escape, returns focus to the button that
  opened it, and keeps the selection, the open branches and the scroll position.
- Replacing the atlas clears the panels rather than leaving the old model named
  in them.
- A click on empty space clears the selection rather than leaving a stale card,
  and a structure can be selected again afterwards.
- **A drag is not a click**: orbiting from one structure and releasing over
  another leaves the pinned selection unchanged — and so does orbiting away and
  back, which releases on the spot it started from. Both are measured now: how
  far the release is from the press, and how far the pointer ever got from it
  while it was down.
- Switching colour mode (Colour map ↔ Natural anatomy) does not change which
  structure is selected.
- Applying a named viewpoint does not change it either, and neither leaves more
  than one row marked selected in the tree.
- **Isolate** shows one structure alone; a click where a hidden structure used
  to be does not select it; **Show all** restores the model and the structures
  that were on screen before are clickable again.
- **A hide says everything it changed.** Isolating a structure and then hiding
  it leaves the scene reporting no isolation and the tree agreeing, because the
  isolation event is sent as well as the visibility one; a hide that ends
  nothing stays quiet. After any hide or show of the reader's own, "Back to how
  it was" is withdrawn rather than left pointing at a snapshot that would undo
  their change.
- **A branch comes off in one press.** The drive finds the branch with the most
  structures under it — on this atlas, *Left cerebral hemisphere*, 77 — presses
  its visibility control, and reads the scene's own hidden set: 77 structures
  hidden by one press, and back to none when it is pressed again. `V` on the
  focused branch does the same thing and undoes it. It presses the **largest**
  branch deliberately: the first branch on some scenes holds one structure, and
  hiding one structure would pass a check that exists for seventy.
- No uncaught errors and no unexpected failed requests during the run.
- **A hidden structure's label goes with it.** Selecting a structure draws its
  name on the model; hiding it removes the name, and unhiding brings it back.
  `tests/brain-anatomy.test.js` fixes the scene's half of this — a hidden or
  isolated-away structure answers "not drawn" — and a source-text assertion in
  `tests/heart-anatomy.test.js` fixes the layer's half, that "not drawn" is part
  of the hide decision and resets the grace timer rather than refreshing it.
  **The browser run cannot time this**: the headless renderer here paints at
  roughly one frame a second, which is longer than the 140 ms grace, so what it
  confirms is that the label goes — not that it goes *sooner* than it did
  before. That distinction is established by the tests, not by the render.

**Rights** — the licence obligations for the mesh are recorded as discharged in
[`../../public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md),
and the asset release gate passes against the file on disk.

## Evidence

- [`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs) — the drive above, re-runnable
- [`tests/anatomy-contract.test.js`](../../tests/anatomy-contract.test.js) — the same claims, headless, against a fixture atlas
- [`src/app/anatomyContract.js`](../../src/app/anatomyContract.js) — the shape the scene and the panels are held to
- [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js), [`tests/anatomy-colour-ui.test.js`](../../tests/anatomy-colour-ui.test.js)
- [`docs/asset-qa/brain-atlas-glb.md`](../asset-qa/brain-atlas-glb.md) — format and semantic QA of the mesh
- [`docs/anatomy-review.md`](../anatomy-review.md) — the engineering anatomy review, including its open judgement calls
- [`docs/screenshots/b3-1/README.md`](../screenshots/b3-1/README.md) — the fixed-view renders, before and after, and how to reproduce them
- [`docs/screenshots/f37/README.md`](../screenshots/f37/README.md) — the annotation-label pair, labels on, at the view that showed the defect and at the control
- [`public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md)

## Not checked

- **267 of the 271 structures were not individually opened.** Four were, plus
  one selected from the tree.
- The part tree's grouping follows the atlas's own hierarchy, which is uneven:
  the top level mixes "Left cerebral hemisphere" with "Left side of brainstem".
  Nothing was done about that here; it is an anatomy question for B3.
- **No label was verified against a reference atlas.** That is an anatomy
  expert's judgement; this decision does not make it.
- Deep structures behind the anatomical-layer slider were not exercised — the
  drive stays at layer 0, the cortical surface. What a medial view now shows at
  the midline was rendered and looked at; it was not clicked through structure by
  structure.
- The posterior and inferior viewpoints were added here, rendered, and read by
  an engineer. **No anatomist has confirmed what they show.**
- Whether the cerebellum should show folia is unsettled — a question about the
  source mesh rather than about this renderer (F-38).
- Annotation anchors are now the outermost vertex of the structure's own mesh.
  That is a geometric choice, not a landmark from a source: **no anatomist has
  confirmed that it is where the name should point.**
- Touch, Safari and Firefox were not driven; one engine, on a desktop.
- No screen-reader pass over the selection card.
- **No clinical review.** The registry records this scene as `pending` and the
  UI shows "医学レビュー：未完了".
- The anatomy/CG quality bar for the beta (B3) has not been measured.
- Real hardware. One engine, desktop, synthetic viewports: no touch, no
  rotation, no software keyboard, and no screen reader actually reading the
  tree — `aria-expanded`, `role="tree"` and the roving tab stop are checked as
  markup and behaviour, which is not the same as being usable with VoiceOver.
- The part tree's top level mixes axes ("Left cerebral hemisphere" beside
  "Left side of brainstem") because it follows the atlas's own hierarchy. F-32,
  and an anatomy question rather than a layout one.
