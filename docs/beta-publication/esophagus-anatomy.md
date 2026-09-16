# Beta publication decision — `esophagus-anatomy`

**This is an engineering acceptance, not a medical sign-off.** The clinical
review of this model is **pending** and every surface says so.
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B2) |
| **Decided by** | Claude Opus 5, acting as B2 implementer |
| **Role** | `engineering` |
| **Assets** | none. Procedural |
| **Scene revision** | model card revision **7**, source digest `e1dc531c3dd675b8` |

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

**The interaction contract, in a browser.** The four measured click points
resolved to the **cricopharyngeal constriction**, the **thoracic part**, the
**aortic and bronchial constriction** and the **abdominal part**. The part
tree's **11 rows** and the model agree in both directions; drag, isolate,
colour mode and viewpoint all behave.

**Every viewpoint, rendered and looked at**, in both colour modes: anterior,
from the patient's left, where the arch and the bronchus cross, through the
diaphragm, and the coronal section.

**Two of those viewpoints are named after structures that are not there at
rest**, and that is how this batch learned to shoot them. The aortic arch, the
left main bronchus, the diaphragm and the gastric cardia arrive at a quarter
of the way along the anatomical-layer slider, so a set shot at the opening
state showed "where the arch and bronchus cross" with neither in the picture.
`npm run shots:anatomy` takes a `--layer` now; at 0.6 the arch crosses behind
the oesophagus and the bronchus in front, which is what the viewpoint says.

**The cut opens the tube** rather than facing it — a wall with no thickness
faced over would draw the lumen as solid tissue. The arch and the diaphragm
are declared solid and keep their faces.

## What was not checked

- **No anatomist has looked at any of it**, including whether the three
  constrictions sit where they sit in a person.
- 7 of the 11 selectable structures were not individually opened.
- The trachea is drawn as context in front of the cervical oesophagus and
  covers part of it in the opening view; it fades as the slider moves.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
- No length or diameter is claimed.
