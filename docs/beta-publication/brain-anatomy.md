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
| **Decided at** | 2026-09-08 (re-taken after B3-1 changed what a medial view draws and when an annotation is drawn) |
| **Decided by** | Claude Opus 5, acting as B3-1 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Asset revision** | `brain-atlas-glb` @ `sha256:76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` |
| **Scene revision** | model card revision **12**, source digest `952def05f14594af` |
| **Scene sources under that digest** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js), [`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js) |

The decision is pinned to **both** revisions in
[`src/catalog/release.js`](../../src/catalog/release.js). Re-export the mesh and
the asset hash moves; change the part correspondence or the selection behaviour
and `npm run revisions:check` fails until the card is revised, which moves the
card revision. Either one closes the beta until this record is taken again —
which is the point: a decision about one version of a model is not a decision
about a different one.

## Why this was re-taken, four times

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

Each time the gate closed and the production build stopped shipping the scene
until this record was taken again — the mechanism working. An earlier decision
was about a model that behaved differently, and it is not carried forward.

## What was checked

Driven in a real browser (Chromium, 1280×800, production build) by
[`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs)
— `npm run verify:anatomy`. Re-running it is how this record is re-verified;
that is why the evidence is a script rather than a stored image.

**Structures** — the scene reports **271 selectable structures** drawn from 397
meshes. Four clicks on the rendered mesh each resolved to a named structure
carrying an English name, a Japanese name and a place in the hierarchy:

| clicked | English | Japanese | hierarchy |
| --- | --- | --- | --- |
| upper left | Opercular part of inferior frontal gyrus | 下前頭回弁蓋部 | Left cerebral hemisphere › Frontal lobe › Inferior frontal gyrus |
| upper right | Supramarginal gyrus | 縁上回 | Left cerebral hemisphere › Parietal lobe › Cerebral gyri |
| centre | Middle temporal gyrus | 中側頭回 | Left cerebral hemisphere › Temporal lobe › Cerebral gyri |
| upper centre | Superior temporal sulcus | 上側頭溝 | Left cerebral hemisphere › Temporal lobe › Cerebral sulci |

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
  another leaves the pinned selection unchanged.
- Switching colour mode (Colour map ↔ Natural anatomy) does not change which
  structure is selected.
- Applying a named viewpoint does not change it either, and neither leaves more
  than one row marked selected in the tree.
- **Isolate** shows one structure alone; a click where a hidden structure used
  to be does not select it; **Show all** restores the model and the structures
  that were on screen before are clickable again.
- No uncaught errors and no unexpected failed requests during the run.

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
