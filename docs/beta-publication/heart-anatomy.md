# Beta publication decision — `heart-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against the files actually being
served, by whom, on what date, and what was *not* checked. **No anatomist and no
clinician has judged this geometry or these labels**, and every surface says so
— see [`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).

| | |
| --- | --- |
| **Decided at** | 2026-09-15 |
| **Decided by** | Repository owner's approval of 2026-09-15; implemented by Claude Opus 5 |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Asset revisions** | `hubmap-vh-m-heart` @ `sha256:46d375e36d8181c161b70e1f0b8f0d778364f0a8414eebce4e4fda1cea73eb3d`<br>`hubmap-vh-m-blood-vasculature` @ `sha256:a95ff0825431953d8fff210cf29d9e65aeed5da55f623717ab613864a9435502` |
| **Scene revision** | model card revision **22**, source digest `7128d8f57c861bfc` |
| **Scene sources under that digest** | [`src/data/heartAnatomy.js`](../../src/data/heartAnatomy.js), [`src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js`](../../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js) |
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
