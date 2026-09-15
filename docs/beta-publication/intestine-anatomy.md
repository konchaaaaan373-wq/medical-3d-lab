# Beta publication decision — `intestine-anatomy`

**This is an engineering acceptance, not a medical sign-off.** The clinical
review of this model is **pending** and every surface says so.
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B2) |
| **Decided by** | Claude Opus 5, acting as B2 implementer |
| **Role** | `engineering` |
| **Assets** | none. Procedural |
| **Scene revision** | model card revision **10**, source digest `061cc72802f5fe5e` |

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

**The interaction contract, in a browser.** The four measured click points
resolved to the **small intestine** (twice, at two points on the coil), the
**transverse colon** and the **sigmoid colon** — three distinct structures,
not four. The part tree's **9 rows** and the model agree in both directions.

**Every viewpoint, rendered and looked at**, in both colour modes: anterior,
posterior, colon alone, from the patient's right, and the coronal section.
The colon frames the small bowel, the haustra read as haustra, and the four
named lengths of colon are distinguishable by colour.

**The cut opens the bowel** rather than facing it. Bowel is a tube; a face
over a cut loop would draw the abdomen as packed with solid cords.

## What was not checked

- **No anatomist has looked at any of it.** The lengths and the coil are
  schematic: the small bowel is one structure standing for jejunum and ileum
  together, and the model card says so.
- 5 of the 9 selectable structures were not individually opened.
- The small-bowel coil self-intersects where it folds most tightly (F-88); it
  is drawn translucent in the disease scene for that reason, and nothing here
  measures it.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
