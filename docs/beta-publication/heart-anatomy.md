# Beta publication decision — `heart-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against the files actually being
served, by whom, on what date, and what was *not* checked. **No anatomist and no
clinician has judged this geometry or these labels**, and every surface says so
— see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).

| | |
| --- | --- |
| **Decided at** | 2026-09-30 (re-taken: the aorta's branches, the heart-only switch and the re-derived vessel file on 2026-09-29, and the real-screen review that followed on 2026-09-30) |
| **Decided by** | Claude Code (AI engineering agent), at the owner's direction, re-pinning after the vessel file was re-derived and the scene gained its two ways of looking; the 2026-09-15 acceptance of what this scene names still stands for everything it named then |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Asset revisions** | `hubmap-vh-m-heart` @ `sha256:994a86380bd30bc9744c08edd9812825ab22b340339665a422be6ba545fbbf8a`<br>`hubmap-vh-m-blood-vasculature` @ `sha256:f03a50620a66c3d7b6987806b9025eb12742ca57377b243f8cea6f2bcfbb231a` |
| **Scene revision** | model card revision **28**, source digest `6aeab16590d0e13a` |
| **Scene sources under that digest** | [`src/data/heartAnatomy.js`](../../src/data/heartAnatomy.js), [`src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js`](../../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js), [`src/scenes/cardiovascular/scenes/heartAnatomy/displayRange.js`](../../src/scenes/cardiovascular/scenes/heartAnatomy/displayRange.js) |
| **Adoption decision** | [`../decisions/HEART-ASSET-ADOPTION.md`](../decisions/HEART-ASSET-ADOPTION.md) |

The decision is pinned to **both** revisions in
[`src/catalog/release.js`](../../src/catalog/release.js). Re-export either mesh
and its hash moves; change what a part means or what a click selects and
`npm run revisions:check` fails until the card is revised, which moves the card
revision. Either closes the beta until this record is taken again.

## What is published, and what it is a derivative of

**The files served are not the publisher's bytes.** Both HuBMAP sources fail
glTF validation — 408 degenerate vertex normals in `VH_M_right_cardiac_atrium`,
33 across two meshes of the vasculature, and no other error — and the format
gate takes zero errors and zero warnings at every scene status. Adopting the
sources could never have opened this gate. The derivative replaces those normals
and removes the zero-area triangles that left some of them with no adjacent face
to average, and **nothing else**: positions, vertex counts, node names,
hierarchy, ontology ids and materials are identical, and the triangle count falls
by exactly what was removed.

That is the one thing this record most wants a later reader to know: a claim was
not smuggled in with a repair. `npm run assets:repair:verify` rebuilds the exact
hashes above from the pinned sources and reports the validator clean.

## Re-taken on 2026-09-29 — the aorta and its branches, and the heart on its own

**This record was re-taken in the branch that made the change, and the owner
should confirm it before that branch merges.** The gate closed on all three of
its conditions at once, which is the mechanism working: the vessel file's hash
moved, the scene's sources moved, and the model card was revised.

**Why.** The owner asked for the heart model to show the aorta with the major
branches it has in the range it is drawn, and for one switch to the heart on
its own, larger and turning about itself.

**What changed in the file.** The derived vessel file keeps five more of the
publisher's meshes — the coeliac trunk, the superior and inferior mesenteric
and both renal arteries — each with its own name, id and group, because the
descending aorta already in the file has an opening for each. Nothing already
in the file moved (`heldUnchanged.vertexPositions`), the validator is clean,
and both pipeline steps reproduce the new hash twice.

**What changed in the scene.** It opens on the heart and its aorta (the arch
branches and the descending aorta no longer start hidden); four arterial
segments the source lacks are drawn schematically and marked so; every branch
fades out at the end of its display range; the renal arteries are named by
where they go, against the source's own names, and say so; and one switch shows
the heart on its own. The model card's §2 has the whole account and the
evidence dossier's claims 15–19 the sources.

**What was re-checked, on these files.**

- `npm run verify:anatomy -- --scene heart-anatomy` on a preview build, the
  full drive, with the new section 11b for the switch at 1280×800 and 390×844
  — result below.
- The branches, the arch division and the bifurcation rendered close up from
  the front, back, both sides and above/below; the heart on its own from all
  six viewpoints (`docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md`,
  "Re-derived 2026-09-29"; `docs/screenshots/heart/17-*.png`).
- `npm test`, `npm run assets:repair:verify`, `npm run assets:compress:verify`.

**Not re-checked:** the landing hero's keyboard pass (`verify:hero-input`) —
the hero draws its own light model and hands a structure to this scene by id,
which is unchanged for every structure it can name; and any phone other than
desktop Chromium with touch emulation.

**2026-09-30 — the review that followed, and why the digest moved again.** The
owner asked for a strict look at the real screens as an anatomy study site. What
changed in the scene's sources: the aorta and its fifteen structures open their
description with a paragraph of textbook anatomy (model card §2, evidence
claim 20), the parts tree reads in anatomical order, the great-vessels view is
framed on the heart and the arch, the scope panel's source lines no longer call
the files unadopted candidates, and two absences are listed by name. **What a
structure is and what a click selects did not change**; the tour points and the
55 structures are the same. Outside the digest: the phone Detail tab now shows
a structure's description at all (it showed none, for every anatomy scene), and
`verify:anatomy` reads it. What the review found and did not fix is in
`docs/follow-ups.md` F-237, items 6–11.

## Re-taken on 2026-09-24 — both files are Draco-compressed

The gate closed twice over, which is the mechanism working: both asset hashes
moved, and the scene's loader changed (it now needs the Draco decoder), which
moved the source digest.

**Why.** A reader waited about nine seconds on a 4G link for 6.9 MB of
uncompressed geometry (`docs/follow-ups.md` F-210). The owner chose to ship the
compressed files after seeing what compression costs.

**What changed in the files.** Positions are quantized: no vertex is more than
12.2 µm from where the repair left it, normals agree to 0.19° at p99, and
names, hierarchy, extras, materials, triangle counts, closedness and each
enclosed volume to 0.1 mL are unchanged (`docs/asset-qa/measurements/draco-compression.json`).
**The earlier sentence "nothing else" in the section below is true of the
repair, and no longer of what is served.**

**What was re-checked, on the compressed files.**

- `npm run verify:anatomy -- --scene heart-anatomy`, the full drive: the same
  46 structures in the tree; the four tour points name the same four structures
  (superior vena cava, arch of the aorta, ascending aorta, left atrium); drag is
  not click; isolation hides and restores; the six viewpoints and both colour
  modes leave the selection where it was; opening framing equals reset framing.
- Six viewpoints × two colour modes rendered before and after on the same build:
  60–160 differing pixels per frame, under the renderer's own jitter
  (`docs/asset-qa/heart-hubmap-vh-m-heart.md`).
- `npm run assets:compress:verify`: the same hashes twice from the repair's
  output, validator 0 errors / 0 warnings.

**Not re-checked:** the landing hero's keyboard pass (`verify:hero-input`) — the
hero draws its own light model, not these files; and the interior views of
2026-09-15, which the position and closedness bounds stand in for.

## Re-taken on 2026-09-21 — the scene opens in Natural

The gate closed because the scene's sources changed, which is the mechanism
working: a digest cannot tell a colour default from a re-labelled structure, so
it stops and asks. **What changed is one line**: the mode the scene opens in is
now `natural` instead of `parts`. A reader looking at the landing page
said the heart did not look like an organ, and it did not — `parts` puts the
chambers in a teal band on purpose, so that the colour is never read as an
oxygenation map.

**Nothing in "What was checked" below was re-checked, and nothing in it
changed.** Which structures exist, which name each one carries, what a click
selects, and what the legend says are all untouched; `Parts` is still there,
one press away, with the same palette. The claim this record makes about the
scene is the same claim, about a scene that now opens in tissue colour.

What a reader should not take from that colour: **it is not a measurement.**
The model card's §6 holds the wording — Natural reproduces the source files'
own materials, which is not a claim about the colour of living tissue and not a
map of oxygenation.

## What was checked

Driven in a real browser (Chromium, 1280×800, preview build) by
[`scripts/check-anatomy-interaction.mjs`](../../scripts/check-anatomy-interaction.mjs)
— `npm run verify:anatomy -- --scene heart-anatomy`. Re-running it is how this
record is re-verified, which is why the evidence is a script rather than a stored
image.

- **46 selectable structures** from 51 meshes across the two files, each with an
  English name, a Japanese name and a place in the hierarchy. The part tree
  lists 46 rows and selection agrees in both directions.
- **Four clicks, at four recorded points, name four different structures** —
  *Right atrium / 右心房*, *Right ventricle / 右心室*, *Left anterior descending
  artery / 左前下行枝*, *Ascending aorta / 上行大動脈*. The points are authored in
  `SCENE_POINTS` rather than measured afresh each run, so this list is a claim a
  later reader can check rather than whichever structures the drive happened to
  land on. They also cross both files: the chambers come from `VH_M_Heart`, the
  artery and the aorta from `VH_M_Blood_Vasculature`, so one run shows each
  adopted asset is drawn and named.
- **Six authored viewpoints** — anterior, posterior, left and right lateral, from
  the base, from the apex — and two colour modes, neither of which changes the
  selection.
- **A branch of the part tree is hidden and shown again in one press**, and by
  `V` on the focused branch. The scene opens with six structures already hidden
  (the arch branches and the brachiocephalic veins, which stand in front of the
  organ); showing a branch shows those too, as "Unhide all" does.
- **Isolation wins over a hide and over a viewpoint**, so isolating a structure
  something else was already hiding shows that structure rather than blanking
  the model.
- A drag is not a click, including a drag that ends where it began.
- **The scene implements `selectAtCanvasPoint`**, the pointerless way in that
  the landing hero binds Enter to, answering for a point through the same ray a
  click uses. It was published without it on 2026-09-15 and joined the hero
  rotation the same day, so until the revision this record is pinned to, Enter
  on the heart's day did nothing and said nothing.

  `npm run verify:hero-input` drives this in a browser, once per published
  organ rather than once for whichever organ the hero happens to open on
  (F-121). On the heart it reports: Tab reaches the model, Enter named
  "右心室 心臓 › 心腔・心室中隔", Escape cleared it, after turning Enter named
  "左心室", and the card's link opened the full model on that structure.
  The instrument was checked against the bug it exists for: with the method
  renamed away and the bundle rebuilt, the heart's two Enter presses both went
  red, and only the heart's — the brain stayed green.
- The two files were measured to share one whole-body coordinate frame; one
  offset and one uniform scale are applied to the pair.
- No uncaught errors and no unexpected failed requests during the run.

## Rights

Both objects state CC BY 4.0 in their own upstream records, checked separately
rather than inferred from one another. The obligations — attribution, the
statement that changes were made, and the NLM Visible Human Male acknowledgment
— are discharged in
[`../../public/assets/heart/ATTRIBUTION.md`](../../public/assets/heart/ATTRIBUTION.md),
and the asset release gate passes against the files on disk.

## Not checked

- **No anatomist has judged this geometry, its labels or their Japanese
  terminology.** `anatomyExpertReview` is `pending`, which is the same footing
  the brain atlas is published on. It is not a claim that anyone has looked.
- **No clinician has reviewed this scene.** The registry records it as pending.
- 42 of the 46 structures were not individually opened.
- One browser engine, desktop only: no touch, Safari, Firefox or screen reader.
- **The underlying Visible Human Male terms were read through secondary sources
  only.** NLM replaced its data licence with Terms and Conditions in July 2019
  and no licence agreement is required, but nlm.nih.gov was unreachable from the
  environment this was assessed in, so the acknowledgment is given rather than
  reasoned away and the licence assessment stays `engineering`.
- **The source has no myocardial free wall as a named part**, so this scene
  cannot say how thick a wall is, and does not.
- Whether a chamber surface stands for the cavity or for the wall around it is
  not established by the file, and is not asserted.
- One vasculature node disagrees with itself — `VH_M_left_anterior_descending_artery`
  carries `FMA:8636`, which names a pulmonary branch. It is surfaced to the
  reader in both languages rather than silently relabelled.
