# Beta publication decision — `skin-anatomy`

**This is an engineering acceptance, not a medical sign-off.** The clinical
review of this model is **pending** and every surface says so.
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B3) |
| **Decided by** | Claude Opus 5, acting as B3 implementer |
| **Role** | `engineering` |
| **Assets** | none. Procedural |
| **Scene revision** | model card revision **6**, source digest `a5928ea51c1db190` |

## What was checked

**The interaction contract, in a browser.** The measured click points resolve
to the structure the panel then names, in both languages. The part tree's **10
rows** and the model agree in both directions: selecting in 3D highlights the
row and opens the branch it is in, and selecting a row selects that structure.
A drag that ends over a different structure is not read as a click. Isolate
shows one structure and Show all restores the model. Neither colour mode nor
viewpoint moves the selection, and a pointer crossing the model does not
rewrite what is pinned.

**Every viewpoint, rendered and looked at**, in both colour modes: the block,
the cut face, the surface, follicle and glands, and what goes through it.
Three of the five were changed because of what the pictures showed, and the
before and after of each is in `docs/screenshots/pub-b3/`:

- **"The cut face" was cutting the block in half.** The whole subcutaneous
  layer sat below the bottom edge of a frame the fit had reported as fitting.
  The fit was orthographic; it solves the projection now, and the correction
  put ten viewpoints across eight of the nine already-published scenes back
  inside the band as well (F-108).
- **The arteriole could not be seen.** It was drawn directly behind the
  venule — one named structure hidden by another for the whole of its length,
  from every viewpoint this scene offers. They run apart across the block now,
  the venous side deeper.
- **"Follicle and sebaceous gland" showed neither.** Both are inside three
  opaque slabs. It shows the appendages with the layers and the vessels out of
  the way, and is called "Follicle and glands".

**The block is solid and its sides are cut by construction**, so the section
is what the model is rather than a viewpoint on it: there is no clipping plane
in this scene and nothing to face.

## What was not checked

- **No anatomist has looked at any of it.** The layers are deliberately not to
  scale — the epidermis is drawn at about a quarter of the dermis where in life
  it is nearer a twentieth — and **no thickness, ratio or distance may be read
  off this model**, the gap between the two vessels included.
- The four measured click points resolve to fewer than four distinct
  structures: the block presents its epidermis to most of the frame.
- 7 of the 10 structures were not individually opened.
- The sweat gland's coil is a displaced blob rather than a coil that reads as
  one, and the sebaceous gland is a single lobe.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
- No dimension is claimed.
