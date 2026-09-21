# Beta publication decision — `lung-anatomy`

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
| **Scene revision** | model card revision **14**, source digest `4fc91f9aa37cecc7` |

The decision is pinned to that scene revision in
[`src/catalog/release.js`](../../src/catalog/release.js). Change what a part
means or what a click selects and `npm run revisions:check` fails until the card
is revised, which moves the revision and closes this record until it is taken
again.

## The claim this scene makes, and the one it does not

**Its parts can be pointed at by name.** 83 structures are individually
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
now `natural` instead of `lobes`. A reader looking at the landing page
said the heart did not look like an organ, and it did not — `parts` puts the
chambers in a teal band on purpose, so that the colour is never read as an
oxygenation map.

**Nothing in "What was checked" below was re-checked, and nothing in it
changed.** Which structures exist, which name each one carries, what a click
selects, and what the legend says are all untouched; `Lobes` is still there,
one press away, with the same palette. The claim this record makes about the
scene is the same claim, about a scene that now opens in tissue colour.

What a reader should not take from that colour: **it is not a measurement.**
The model card's §6 holds the wording — Natural reproduces the source files'
own materials, which is not a claim about the colour of living tissue and not a
map of oxygenation.

## What was checked

Driven in a real browser (Chromium, 1280×800) by
[`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs)
— `npm run verify:anatomy -- --scene lung-anatomy`. Re-running it is how this record
is re-verified, which is why the evidence is a script rather than a stored image.

**Four clicks, at four recorded points, name four different structures.** The
points are authored in `SCENE_POINTS` **with the structure each one must name**,
so the drive is held to this table: a run fails if a point names something else,
hits nothing, or if the four together name fewer than four distinct structures.

| point | English | Japanese | hierarchy |
| --- | --- | --- | --- |
| (0.37, 0.30) | Trachea | 気管 | Airways › Trachea and main bronchi › Airway |
| (0.25, 0.42) | Right upper lobe | 右上葉 | Right lung › Lobes › Lobe |
| (0.49, 0.56) | Left upper lobe | 左上葉 | Left lung › Lobes › Lobe |
| (0.25, 0.68) | Right middle lobe | 右中葉 | Right lung › Lobes › Lobe |

**These four replaced an earlier four on 2026-09-16.** The originals were
measured against a safe-area fit that approximated a perspective camera with an
orthographic sum. Solving each corner exactly moved every model, and re-run
against the corrected fit **all four were wrong and three hit nothing** — the
run reported `only 1 of 4 click(s) resolved`.

They were then re-measured **with the drive rather than with the sweep**, and
that distinction is the other thing this scene taught. `points:anatomy` reads a
scene at the framing it opens at; the drive runs its tour after the framing
check, which resets the display. This scene opens spanning 0.22..0.50 of the
frame and rests at 0.20..0.52, so a tour measured by the sweep failed in the
drive on points the sweep had just confirmed. Every value above is read from
`--points` output in the frame the tour is held to, including the Japanese
terms and the hierarchy paths.

The fourth structure is still an airway rather than a fourth lobe, for the
reason the original four were chosen. At this framing the reachable airway is
the trachea rather than the left main bronchus.

That the tour is *named* is not incidental. Before this record was taken, these
points carried bare coordinates, and the run reported only that four clicks
named *something*. Measured, the fourth point sat off the model and **hit nothing**, which is why this scene used to report three structures from four clicks. It was replaced by a measured one — and then the whole tour had to be measured again when the framing was corrected, which the run reported immediately. Twice now, on this scene, the names are the only reason anybody knew. `brain-anatomy` spent a week with a
publication record describing structures its clicks had stopped naming, for
exactly this reason — see [`brain-anatomy.md`](brain-anatomy.md).

- **Six authored viewpoints** — anterior, posterior, right and left lateral, the
  right lung from its mediastinal surface, and a coronal section — one of which
  the drive applied.
- **A 34-structure branch goes in one press**: hiding *Pulmonary vessels / 肺血管*
  clears 34 structures together, which is what makes the lung interior visible
  at all.
- **A keyboard names a structure on the hero at the first press.** That is not a
  formality here: until 2026-09-16 the first Enter on this organ named
  *nothing*, because the centre of the hero frame falls in the gap between the
  two lungs, and this scene was held back from publication for it (F-129). Enter
  now walks outward from the centre when the centre is empty.

- The part tree lists 83 rows, one per structure, and selection agrees in
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
- 79 of the 83 structures were not individually opened.
- One browser engine, desktop only: no touch, no Safari, no Firefox, no screen
  reader.
- **The lobar and segmental divisions are drawn as separable volumes**, which a
  real lung does not show as lines on its surface. The fissures between lobes
  are real; the segment boundaries within a lobe are a teaching convention here,
  and carry no measured accuracy.
