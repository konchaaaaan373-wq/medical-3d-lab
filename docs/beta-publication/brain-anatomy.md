# Beta publication decision — `brain-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against the files that are
actually being served, by whom, on what date, and what was *not* checked.
The clinical review of this model is **pending** and every surface says so —
see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
It is also not the anatomy/CG quality pass (B3), which has not happened.

| | |
| --- | --- |
| **Decided at** | 2026-09-08 |
| **Decided by** | Claude Opus 5, acting as B0 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Asset revision** | `brain-atlas-glb` @ `sha256:76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` |
| **Scene revision** | model card revision **4**, source digest `a4e246e1208c5785` |
| **Scene sources under that digest** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js), [`src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js) |

The decision is pinned to **both** revisions in
[`src/catalog/release.js`](../../src/catalog/release.js). Re-export the mesh and
the asset hash moves; change the part correspondence or the selection behaviour
and `npm run revisions:check` fails until the card is revised, which moves the
card revision. Either one closes the beta until this record is taken again —
which is the point: a decision about one version of a model is not a decision
about a different one.

## What was checked

Driven in a real browser (Chromium, 1280×800, production build) by
[`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs)
— `npm run verify:anatomy`. Re-running it is how this record is re-verified;
that is why the evidence is a script rather than a stored image.

**Structures** — four clicks on the rendered mesh each resolved to a named
structure carrying an English name, a Japanese name and a place in the
hierarchy:

| clicked | English | Japanese | hierarchy |
| --- | --- | --- | --- |
| upper left | Opercular part of inferior frontal gyrus | 下前頭回弁蓋部 | Left cerebral hemisphere › Frontal lobe › Inferior frontal gyrus |
| upper right | Supramarginal gyrus | 縁上回 | Left cerebral hemisphere › Parietal lobe › Cerebral gyri |
| centre | Middle temporal gyrus | 中側頭回 | Left cerebral hemisphere › Temporal lobe › Cerebral gyri |
| upper centre | Superior temporal sulcus | 上側頭溝 | Left cerebral hemisphere › Temporal lobe › Cerebral sulci |

The scene reports **397 selectable structures**.

**Viewpoints** — six are offered and one was applied: Left lateral / Left
medial / Right lateral / Right medial / Anterior / Superior.

**Interactions**

- A click on the model pins a structure and the panel names it.
- A click on empty space clears the selection rather than leaving a stale card,
  and a structure can be selected again afterwards.
- **A drag is not a click**: orbiting from one structure and releasing over
  another leaves the pinned selection unchanged.
- Switching colour mode (Colour map ↔ Natural anatomy) does not change which
  structure is selected.
- Applying a named viewpoint does not change it either.
- No uncaught errors and no unexpected failed requests during the run.

**Rights** — the licence obligations for the mesh are recorded as discharged in
[`../../public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md),
and the asset release gate passes against the file on disk.

## Evidence

- [`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs) — the drive above, re-runnable
- [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js), [`tests/anatomy-colour-ui.test.js`](../../tests/anatomy-colour-ui.test.js)
- [`docs/asset-qa/brain-atlas-glb.md`](../asset-qa/brain-atlas-glb.md) — format and semantic QA of the mesh
- [`docs/anatomy-review.md`](../anatomy-review.md) — the engineering anatomy review, including its open judgement calls
- [`public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md)

## Not checked

- **393 of the 397 structures were not individually opened.** Four were.
- **No label was verified against a reference atlas.** That is an anatomy
  expert's judgement; this decision does not make it.
- Deep structures behind the anatomical-layer slider were not exercised — the
  drive stays at layer 0, the cortical surface.
- Touch, Safari and Firefox were not driven; one engine, on a desktop.
- No screen-reader pass over the selection card.
- **No clinical review.** The registry records this scene as `pending` and the
  UI shows "医学レビュー：未完了".
- The anatomy/CG quality bar for the beta (B3) has not been measured.
