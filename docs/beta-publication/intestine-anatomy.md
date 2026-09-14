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
| **Scene revision** | model card revision **9**, source digest `7db4ec7e25cc5140` |

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
