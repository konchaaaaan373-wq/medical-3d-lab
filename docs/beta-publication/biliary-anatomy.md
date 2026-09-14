# Beta publication decision — `biliary-anatomy`

**This is an engineering acceptance, not a medical sign-off.** The clinical
review of this model is **pending** and every surface says so.
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B2) |
| **Decided by** | Claude Opus 5, acting as B2 implementer |
| **Role** | `engineering` |
| **Assets** | none. Procedural |
| **Scene revision** | model card revision **8**, source digest `ea7cf6f5cca8686c` |

## What was checked

**The interaction contract, in a browser.** The four measured click points
resolved to the **right hepatic duct**, the **left hepatic duct**, the
**cystic duct** and the **body of the gallbladder**. The part tree's **12
rows** and the model agree in both directions.

**Every viewpoint, rendered and looked at**, in both colour modes: anterior,
the ducts alone, the confluence and cystic junction, the papilla from behind,
from the patient's right, and the coronal section. The duct system reads
clearly — each named duct is a distinct colour and the junctions are where the
scene says they are.

**The cut opens the ducts** lengthwise rather than facing them, which is what
a cut duct shows. The pancreatic head is the solid organ in the picture and is
declared as one, so it keeps its face.

## What was not checked

- **No anatomist has looked at any of it**, including the junction heights,
  which the tests hold only as an order.
- 8 of the 12 selectable structures were not individually opened.
- **The coronal section removes the gallbladder**: it sits in front of the
  plane, so that viewpoint shows the duct system without it. That is what a
  coronal cut through these ducts leaves, and it means the view is about the
  ducts rather than about the gallbladder.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
- No calibre or length is claimed.
