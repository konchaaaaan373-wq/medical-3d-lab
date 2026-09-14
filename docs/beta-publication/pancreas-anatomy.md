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
| **Scene revision** | model card revision **8**, source digest `6524d4694ca94e96` |

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
