# Beta publication decision — `pancreas-anatomy`

**This is an engineering acceptance, not a medical sign-off.** The clinical
review of this model is **pending** and every surface says so.
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B2) |
| **Decided by** | Claude Opus 5, acting as B2 implementer |
| **Role** | `engineering` |
| **Assets** | none. Procedural |
| **Scene revision** | model card revision **9**, source digest `fa36ee8538a13a3e` |

## Re-taken on 2026-09-15

**The model changed, so the decision was taken again.** Two shared changes,
neither of them to this organ's geometry:

- **The scene now opens at the framing it was going to settle on** (F-127).
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
it resets to, so F-127 cannot come back quietly. **No anatomist has looked at
this model, and nothing below has changed about that.**

## What was checked

**The interaction contract, in a browser.** The four measured click points
resolved to the **body**, the **tail** and the **head** (twice) — three
distinct structures, not four. The part tree's **7 rows** and the model agree
in both directions.

**Every viewpoint, rendered and looked at**, in both colour modes: anterior,
from above, head and duodenum, posterior, and the transverse section. This is
the scene F-44 was reported against, and the fix is visible in
`docs/screenshots/pub-b1/panel-1440x900/pancreas-anatomy--before.png` and
`--after.png`: the tail used to run underneath the parts panel.

**The cut is faced**, because a pancreas is solid, and the face shows the
pancreatic duct and a vessel in cross-section inside the gland — which is the
thing a transverse section of this organ is for.

## What was not checked

- **No anatomist has looked at any of it.** The gland's shape is schematic and
  the duct is one channel standing for the main duct.
- 4 of the 7 selectable structures were not individually opened.
- The duodenum around the head is context and crops at the frame edge in some
  viewpoints.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
- No dimension is claimed.
