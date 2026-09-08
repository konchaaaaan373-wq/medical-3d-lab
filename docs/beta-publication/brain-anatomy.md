# Beta publication decision — `brain-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against the files that are
actually being served, by whom, on what date, and what was *not* checked.
The clinical review of this model is **pending** and every surface says so —
see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
It is also not the anatomy/CG quality pass (B3), which has not happened.

| | |
| --- | --- |
| **Decided at** | 2026-09-08 (re-taken after B2-1 changed the selection behaviour) |
| **Decided by** | Claude Opus 5, acting as B0 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Asset revision** | `brain-atlas-glb` @ `sha256:76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` |
| **Scene revision** | model card revision **6**, source digest `584cdfefac8a7464` |
| **Scene sources under that digest** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js), [`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js) |

The decision is pinned to **both** revisions in
[`src/catalog/release.js`](../../src/catalog/release.js). Re-export the mesh and
the asset hash moves; change the part correspondence or the selection behaviour
and `npm run revisions:check` fails until the card is revised, which moves the
card revision. Either one closes the beta until this record is taken again —
which is the point: a decision about one version of a model is not a decision
about a different one.

## Why this was re-taken, twice

**Revision 4 → 5.** B2-1 changed what a click selects — a structure drawn from
several meshes is now one structure rather than whichever piece the atlas
registered last — and added a part tree and an isolate control.

**Revision 5 → 6.** Replacing the atlas cleared the scene's selection silently.
The getters were right and the panels were not: the card went on naming a
structure from the discarded model and a row stayed marked selected, because a
surface that repaints on an event was never sent one. The reset is announced now.

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

**Viewpoints** — six are offered and one was applied: Left lateral / Left
medial / Right lateral / Right medial / Anterior / Superior.

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
  drive stays at layer 0, the cortical surface.
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
