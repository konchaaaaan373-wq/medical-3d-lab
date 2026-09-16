# Beta publication decision — `lung-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against what is actually being
served, by whom, on what date, and what was *not* checked. The clinical review
of this model is **pending** and every surface says so — see
[`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B1, with the liver and the kidney) |
| **Decided by** | Claude Opus 5, acting as B1 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | none. The lung is procedural: there is no file to hash, and `sceneRevision` is the whole pin |
| **Scene revision** | model card revision **10**, source digest `a57d5fa1cd8ee730` |
| **Scene sources under that digest** | [`src/data/lungAnatomyScene.js`](../../src/data/lungAnatomyScene.js), [`src/scenes/respiratory/scenes/lungAnatomy/LungAnatomyScene.js`](../../src/scenes/respiratory/scenes/lungAnatomy/LungAnatomyScene.js), [`src/scenes/shared/anatomy/OrganAnatomyScene.js`](../../src/scenes/shared/anatomy/OrganAnatomyScene.js) |

Change any of those three files and `npm run revisions:check` fails until the
card is revised, the revision moves, and this decision stops applying. The
shared scene is in the list on purpose: it decides what a click selects and
what a cut draws, which is as much a part of what the model *is* as the
geometry of the lung itself.

## Re-taken on 2026-09-15

**The model changed, so the decision was taken again.** Two shared changes,
neither of them to this organ's geometry:

- **The scene now opens at the framing it was going to settle on** (F-129).
  The camera used to rest where a band the shell had not finished laying out
  put it, and the re-framing that should have corrected that was being
  discarded by a guard that could not tell a reader apart from a thousandth of
  a world unit of damping. The model is larger on the opening frame and clears
  the console. Every viewpoint of this scene was rendered again and looked at.
- **Isolating a structure now shows it solid.** It used to be shown at the
  opacity it has in place, which is an empty frame for a see-through part —
  and a part you cannot see in place is the one a reader isolates.

`npm run verify:anatomy` passes on this scene, and on all thirty-eight, with
step 0 added: the framing a scene opens at is now measured against the framing
it resets to, so F-129 cannot come back quietly. **No anatomist has looked at
this model, and nothing below has changed about that.**

## What was checked

**The interaction contract, in a browser** (`npm run verify:anatomy -- --scene
lung-anatomy`). The click points are the ones recorded in `SCENE_POINTS`, each
measured off a render of the opening view: they resolved to the **trachea**,
the **right upper lobe**, the **left upper lobe** and the **right middle
lobe**, and the panel named each in both languages. The run also checked that
the part tree's **83 rows** and the model agree in both directions, that a drag
ending over another structure is not read as a click, that isolating shows one
structure and Show all restores the model, and that changing colour mode or
viewpoint does not move the selection.

**Every viewpoint, rendered and looked at.** Anterior, posterior, right
lateral, left lateral, the right lung's mediastinal surface and the coronal
section, in both colour modes (lobes and vessels, natural tissue), at 1280×720
with the interface hidden — `docs/screenshots/pub-b1/`. Also at 1440×900 with
the interface visible, which is the only way to see what the docked parts panel
covers.

**Three defects were found this way, after every automated check had passed,
and all three are fixed** (F-44, F-101, F-102 in
[`../follow-ups.md`](../follow-ups.md)):

- the model was never fitted to the part of the window nothing covers, so the
  left lung sat under the parts panel;
- the coronal section drew open shells — a cut with no face — with the vessels
  as stubs floating in the gap;
- and the scene's teardown was not exercised anywhere (that one was the
  kidney's, and the test that found it now covers all forty scenes).

## What was not checked

- **No anatomist has looked at any of it.** Not the lobe proportions, not the
  fissure planes, not the bronchial branching, not one label.
- 79 of the 83 selectable structures were not individually opened.
- One browser engine, desktop, headless, one device pixel ratio: no touch, no
  Safari, no Firefox, no screen reader. The phone layout of this scene was not
  driven.
- The segmental anatomy is schematic. The model card says which parts of it are
  named after a real division and which are a plausible arrangement, and this
  decision does not add to that.
- The cut face is the geometry the plane happens to cross. It is not a
  radiological section and nothing here says it matches one.
