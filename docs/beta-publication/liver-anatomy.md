# Beta publication decision — `liver-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against what the build actually
serves, by whom, on what date, and what was *not* checked. **No anatomist and no
clinician has judged this geometry or these labels**, and every surface says so
— see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).

| | |
| --- | --- |
| **Decided at** | 2026-09-21 (re-taken: the scene now opens in Natural) |
| **Decided by** | Claude Code (AI engineering agent), re-pinning after a presentation-only change; the 2026-09-15 acceptance of what this scene names still stands |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | none. The geometry is **procedural**, so there is no external file, no licence obligation and no hash to pin |
| **Scene revision** | model card revision **14**, source digest `23d963c1a0bc641a` |

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

## Re-taken on 2026-09-21 — the scene opens in Natural

The gate closed because the scene's sources changed, which is the mechanism
working: a digest cannot tell a colour default from a re-labelled structure, so
it stops and asks. **What changed is one line**: the mode the scene opens in is
now `natural` instead of `segments`. A reader looking at the landing page
said the heart did not look like an organ, and it did not — `parts` puts the
chambers in a teal band on purpose, so that the colour is never read as an
oxygenation map.

**Nothing in "What was checked" below was re-checked, and nothing in it
changed.** Which structures exist, which name each one carries, what a click
selects, and what the legend says are all untouched; `Segments` is still there,
one press away, with the same palette. The claim this record makes about the
scene is the same claim, about a scene that now opens in tissue colour.

What a reader should not take from that colour: **it is not a measurement.**
The model card's §6 holds the wording — Natural reproduces the source files'
own materials, which is not a claim about the colour of living tissue and not a
map of oxygenation.

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
| (0.29, 0.227) | Segment VIII — Right anterior superior | VIII区域（右前上区域） | Right liver › Right anterior sector › Couinaud segment |
| (0.215, 0.323) | Segment VII — Right posterior superior | VII区域（右後上区域） | Right liver › Right posterior sector › Couinaud segment |
| (0.477, 0.323) | Segment II — Left lateral superior | II区域（左外側上区域） | Left liver › Left lateral sector › Couinaud segment |
| (0.44, 0.417) | Segment IVa — Left medial superior | IVa区域（左内側上区域） | Left liver › Left medial sector › Couinaud segment |

**These four replaced an earlier four on 2026-09-16, and the tour changed shape
rather than moving.** The originals — segments VIII, III and V with the
gallbladder beneath them — were measured against a safe-area fit that
approximated a perspective camera with an orthographic sum. Solving each corner
exactly moved every model, and re-run against the corrected fit two of those
four hit nothing while a third named its neighbour. A sweep at the new framing
reaches four Couinaud segments and does not reach the gallbladder, so **this
record no longer claims the biliary system**; the row above that said so is
gone rather than re-pointed. Every value in this table is read from the run's
own output, including the Japanese terms and the hierarchy paths.

That the tour is *named* is not incidental. Before this record was taken, these
points carried bare coordinates, and the run reported only that four clicks
named *something*. Measured, all four points already named four different structures — this scene was the one of four examined that needed no repair. It needed one later all the same, when the framing moved under it, and the run said so on the first pass because the table above is asserted rather than described. `brain-anatomy` spent a week with a
publication record describing structures its clicks had stopped naming, for
exactly this reason — see [`brain-anatomy.md`](brain-anatomy.md).

- The tour crosses **both livers**: two right-sector segments (VIII anterior
  superior, VII posterior superior) and two left (II lateral superior, IVa
  medial superior). It does not reach the gallbladder at this framing.

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
