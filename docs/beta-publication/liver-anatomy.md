# Beta publication decision — `liver-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against what the build actually
serves, by whom, on what date, and what was *not* checked. **No anatomist and no
clinician has judged this geometry or these labels**, and every surface says so
— see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).

| | |
| --- | --- |
| **Decided at** | 2026-09-16 |
| **Decided by** | Repository owner's decision of 2026-09-16; implemented by Claude Opus 5 |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | none. The geometry is **procedural**, so there is no external file, no licence obligation and no hash to pin |
| **Scene revision** | model card revision **12**, source digest `bd72a3cc7f8d1479` |

The decision is pinned to that scene revision in
[`src/catalog/release.js`](../../src/catalog/release.js). Change what a part
means or what a click selects and `npm run revisions:check` fails until the card
is revised, which moves the revision and closes this record until it is taken
again.

## The claim this scene makes, and the one it does not

**Its parts can be pointed at by name.** 27 structures are individually
selectable, each with an English name, a Japanese name and a place in the
hierarchy, and a click on the model and a click in the part tree agree about
which one is meant.

**Its shape is not a measurement.** This model is *procedural*: the geometry is
authored to be recognisable and correctly arranged, not reconstructed from a
specimen or a scan. That is a weaker claim than the two scenes published before
it — `brain-anatomy` comes from a distributed atlas and `heart-anatomy` from
Visible Human Male meshes. **Nothing here should be read as a dimension.**

## What was checked

Driven in a real browser (Chromium, 1280×800) by
[`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs)
— `npm run verify:anatomy -- --scene liver-anatomy`. Re-running it is how this record
is re-verified, which is why the evidence is a script rather than a stored image.

**Four clicks, at four recorded points, name four different structures.** The
points are authored in `SCENE_POINTS` **with the structure each one must name**,
so the drive is held to this table: a run fails if a point names something else,
hits nothing, or if the four together name fewer than four distinct structures.

| point | English | Japanese | hierarchy |
| --- | --- | --- | --- |
| (0.35, 0.40) | Segment VIII — Right anterior superior | VIII区域（右前上区域） | Right liver › Right anterior sector › Couinaud segment |
| (0.66, 0.45) | Segment III — Left lateral inferior | III区域（左外側下区域） | Left liver › Left lateral sector › Couinaud segment |
| (0.45, 0.62) | Segment V — Right anterior inferior | V区域（右前下区域） | Right liver › Right anterior sector › Couinaud segment |
| (0.42, 0.75) | Gallbladder | 胆嚢 | Biliary › Gallbladder › Gallbladder |

That the tour is *named* is not incidental. Before this record was taken, these
points carried bare coordinates, and the run reported only that four clicks
named *something*. Measured, all four points already named four different structures — this scene was the one of four examined that needed no repair, and now it is held to that. `brain-anatomy` spent a week with a
publication record describing structures its clicks had stopped naming, for
exactly this reason — see [`brain-anatomy.md`](brain-anatomy.md).

- The tour crosses **both livers and the biliary system**: two right-sector
  segments, one left-lateral segment, and the gallbladder beneath them.

- The part tree lists 27 rows, one per structure, and selection agrees in
  both directions.
- A drag is not a click, including a drag that ends where it began.
- A branch of the tree is hidden and shown again in one press, and isolation
  wins over both a hide and a viewpoint.
- Both colour modes were entered, and neither moves the selection.
- No uncaught errors and no unexpected failed requests during the run.

## Not checked

- **No anatomist has judged this geometry, its labels or their Japanese
  terminology.** `anatomyExpertReview` is `pending` — the same footing the brain
  and the heart are published on. It is not a claim that anyone has looked.
- **No clinician has reviewed this scene.** The registry records it as pending.
- **The geometry is procedural.** No dimension, proportion or surface contour
  here is measured from anything.
- **No label was drawn on the model from the drive's angle**, so a selected
  structure is named in the panel rather than on the mesh. This is F-40: one
  anchor point decides for the whole structure, and from some angles that point
  is not visible. The brain shows labels on the mesh; this scene did not.
- 23 of the 27 structures were not individually opened.
- One browser engine, desktop only: no touch, no Safari, no Firefox, no screen
  reader.
- **A Couinaud segment is a vascular territory, not a visible surface.** The
  divisions this model draws are a teaching convention. A real liver shows no
  such lines, and the boundaries here carry no measured accuracy.
