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
| **Scene revision** | model card revision **7**, source digest `b28ac8cf2ae32465` |

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
resolve to the **epidermis**, the **dermis** and the **subcutaneous tissue**
(twice) — three distinct structures, not four — each named in both languages,
with no point needing to be re-aimed. The part tree's **10 rows** and the model
agree in both directions: selecting in 3D highlights the row and opens the
branch it is in, and selecting a row selects that structure.
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
  inside the band as well (F-125).
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
- The four measured click points resolve to three distinct structures, all of
  them layers: the block presents its cut face to most of the frame, so no
  measured point lands on an appendage or a vessel. The arteriole was reached
  from the part tree instead.
- 7 of the 10 structures were not individually opened.
- The sweat gland's coil is a displaced blob rather than a coil that reads as
  one, and the sebaceous gland is a single lobe.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
- No dimension is claimed.
