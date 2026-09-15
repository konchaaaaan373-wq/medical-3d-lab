# Beta publication decision — `kidney-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against what is actually being
served, by whom, on what date, and what was *not* checked. The clinical review
of this model is **pending** and every surface says so — see
[`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B1, with the lung and the liver) |
| **Decided by** | Claude Opus 5, acting as B1 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | none. The kidney is procedural: there is no file to hash, and `sceneRevision` is the whole pin |
| **Scene revision** | model card revision **10**, source digest `6339df29bd2bd36d` |
| **Scene sources under that digest** | [`src/data/kidneyAnatomyScene.js`](../../src/data/kidneyAnatomyScene.js), [`src/scenes/renal/scenes/kidneyAnatomy/KidneyAnatomyScene.js`](../../src/scenes/renal/scenes/kidneyAnatomy/KidneyAnatomyScene.js), [`src/scenes/shared/anatomy/OrganAnatomyScene.js`](../../src/scenes/shared/anatomy/OrganAnatomyScene.js) |

## Re-taken on 2026-09-15

**The model changed, so the decision was taken again.** Two shared changes,
neither of them to this organ's geometry:

- **The scene now opens at the framing it was going to settle on** (F-110).
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
it resets to, so F-110 cannot come back quietly. **No anatomist has looked at
this model, and nothing below has changed about that.**

## What was checked

**The interaction contract, in a browser** (`npm run verify:anatomy -- --scene
kidney-anatomy`). The four recorded click points resolved to the **renal
cortex** (twice, at two points on the opened kidney), the **right kidney**
(which is one landmark structure, and says so when selected) and the **left
ureter** — three distinct structures, not four. The point that was placed on a
medullary pyramid resolves to the cortex in front of it, which is what the
opening view has there. The part tree's
**32 rows** and the model agree in both directions; a drag is not a click;
isolate hides and Show all restores; changing colour mode or viewpoint does not
move the selection.

**Every viewpoint, rendered and looked at.** Both kidneys, the urinary tract,
the left kidney from the front, the left kidney from the hilum, posterior and
the coronal section, in both colour modes — `docs/screenshots/pub-b1/`.

**Two defects were found in the renders and fixed.** The coronal section was
framed against the uncut pair, so the two cut faces sat at the edges of the
frame with the middle empty (F-44); and leaving the scene threw before a single
geometry was released, because its teardown called `dispose()` on a builder
that has none (F-102). The second was invisible from the product — the reader
has already navigated away — and no test covered it, because the dispose test
covered one scene of forty. It covers all of them now.

## What was not checked

- **No anatomist has looked at any of it.** Seven pyramids is a common
  arrangement rather than a constant, the two kidneys are placed by eye rather
  than against the ribs or the vertebrae, and nobody qualified has confirmed a
  single label.
- 29 of the 32 selectable structures were not individually opened — the four
  recorded clicks land on three.
- **Only one kidney is modelled in parts.** The other is a landmark shape, and
  the scene says so where a reader selects it. This decision does not make it
  more than that.
- One browser engine, desktop, headless: no touch, no Safari, no Firefox, no
  screen reader, and the phone layout of this scene was not driven.
- The cut face is where the plane falls through this geometry — pyramids,
  columns and the collecting system as the model defines them. It is not a
  radiological section.
