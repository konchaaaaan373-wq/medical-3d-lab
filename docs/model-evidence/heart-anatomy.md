# Evidence — Interactive heart anatomy

Companion to [`docs/model-cards/heart-anatomy.md`](../model-cards/heart-anatomy.md).
Every claim the scene makes, where it came from, how it is implemented, what is
assumed, and what actually checks it.

This scene makes **no physiological claim**, so there is no external-physiology
layer here. Every claim below is either a claim about the source file — settled
by measuring the file — or a presentation choice, which is settled by saying it
is one.

## Sources consulted

* HuBMAP Human Reference Atlas, CCF release v1.2,
  `models/VH_M_Heart.glb`, at commit `b036a91aaf7234f462b1249d4a5f4fb0e982f412`.
  Node names, labels and ontology ids are read from the file's own `extras`.
* The same release's `VH_M_Blood_Vasculature.glb`, at the same commit, fetched
  and hash-verified. The subtree the source groups as
  `VH_M_blood_vasculature_of_heart` — 37 meshes of 104 — is used;
  `docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md` records the inspection.
* U.S. National Library of Medicine, Visible Human Project — the imaging the
  reference organ was segmented from. Terms recorded, not discharged.
* Measurements made here: `docs/asset-qa/heart-hubmap-vh-m-heart.md`.
* **For the aorta and its branches (2026-09-29): the standard adult pattern as
  the major gross-anatomy texts describe it** — Gray's Anatomy (Standring, ed.),
  Moore's *Clinically Oriented Anatomy*, Netter's *Atlas of Human Anatomy*. **Said
  plainly: these were applied from the implementer's knowledge of them and were
  not re-read page by page for this change**; the open references that could
  have been cited (en.wikipedia.org, teachmeanatomy.info) were refused by this
  environment's network policy when tried. What was taken from them is only the
  order, side and direction of each branch and where the brachiocephalic trunk
  and the aorta divide — every *position* is the source file's own, measured
  (`docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md`, "Re-derived
  2026-09-29"). Variants are not covered: this is one specimen with the usual
  three-branch arch.
* **For the descriptions of the aorta and its branches (2026-09-30): the same
  texts, on the same footing** — applied from knowledge, not re-read page by
  page, and with no web source reachable to check against. What they supply is
  wider this time and is said so: each vessel's typical vertebral level, the
  lengths of the ascending aorta, brachiocephalic trunk and common iliac
  arteries, the territories of the three ventral branches (foregut, midgut,
  hindgut), the course relations (the right renal artery behind the inferior
  vena cava, the superior mesenteric artery in front of the left renal vein and
  the third part of the duodenum), and two variants named without a
  prevalence (a shared trunk at the arch; more than one renal artery). **These
  are the typical account, not this specimen's**, and nothing in them is
  measured here (claim 20). Japanese terms follow the site's own abdomen scene
  (腹部大動脈), with the anatomical terms 胸大動脈・腹大動脈 given once.

## Claim → Source → Implementation → Assumption → Validation

### 1. Fourteen named parts, each selectable by its own identity

| | |
| --- | --- |
| **Claim** | The scene exposes exactly the fourteen parts the source file names, keyed by the source's own node name, and never invents or merges one. |
| **Source** | The GLB's node names and `extras` ontology ids. |
| **Implementation** | `HEART_PARTS` in `src/data/heartAnatomy.js` is one row per node name; `attachModel` looks each mesh up and **hides and counts** any mesh the table does not know rather than giving it a made-up identity. |
| **Assumption** | The identity the source assigned to a mesh is trusted. The geometric boundary is not independently validated. |
| **Validation** | `tests/heart-anatomy.test.js` — the table's ids and ontology ids are unique, a fixture with an unknown mesh is counted rather than adopted, and selection round-trips through the id. |

### 2. An ontology id is a vocabulary, not a mesh identifier

| | |
| --- | --- |
| **Claim** | Two parts may in principle carry the same UBERON or FMA term; the id the scene selects by is the node name. |
| **Source** | UBERON and FMA are terminologies, not per-object identifiers. |
| **Implementation** | `heartPartById` keys on the node name. `ontologyId` is carried alongside as a cross-reference and is never used to look a structure up. |
| **Assumption** | None beyond the terminologies being what they are. |
| **Validation** | `tests/heart-anatomy.test.js` — the five papillary muscles stay five structures and the two atria stay two. |

### 3. The anatomical axes are measured, not assumed

| | |
| --- | --- |
| **Claim** | +x is the patient's left, +y superior, +z anterior, in this model's own coordinates. |
| **Source** | Three relationships that cannot be reversed in a normal heart: the left atrium is left of the right atrium; the apex is below the valve plane; the right ventricle is anterior to the left atrium. |
| **Implementation** | `HEART_AXES` in the adapter records them; `getAnatomyAxes()` reports them; the six named viewpoints and `revealStructure`'s choice of face are derived from them. |
| **Assumption** | The specimen is a normal heart in normal position — which is what a *reference* organ is. Applying this to a dextrocardia would be wrong, and the scene makes no such claim. |
| **Validation** | `tests/heart-anatomy.test.js` — the axes are re-derived from a fixture's part centroids and must agree with the declared ones. Architecture rule 5. |

### 4. The chambers are cavity casts, so no interior view is offered

| | |
| --- | --- |
| **Claim** | Each chamber mesh is a closed surface around the chamber's space; the file contains no myocardial free wall, so the scene offers no cut and no interior. |
| **Source** | Enclosed volume by the divergence theorem over each closed mesh: left ventricle 121.6 mL, right ventricle 74.0, left atrium 31.3, right atrium 27.7, interventricular septum 28.1 as a separate solid. A wall-plus-cavity mesh would not enclose a chamber-sized volume with no second surface. |
| **Implementation** | No cutaway, no section plane and no "inside" viewpoint exists in `VIEW_SPECS`. Hiding a chamber is what exposes the valves and papillary muscles inside it: `revealStructure` casts a ray from the viewpoint it is turning to, hides whichever whole structure is in the way, and lists what it hid so the display can be put back. Nothing is cut, thinned or sectioned. |
| **Assumption** | The volumes are properties of one fixed specimen and are recorded for this decision only. They are **not** clinical chamber volumes and are never displayed as any. |
| **Validation** | `tests/heart-anatomy.test.js` — no viewpoint claims an interior; a part enclosed by a fixture chamber is reported obscured, and revealing it hides the enclosing chamber by name and restores it. |

### 5. Five of the fourteen surfaces are open, and the scene says so

| | |
| --- | --- |
| **Claim** | The aortic valve, three papillary muscles and the right atrium are open surfaces in the source file. |
| **Source** | Boundary-edge counts over welded vertices: 72, 42, 26, 21 and 3 respectively; the other nine parts have none. |
| **Implementation** | `closed` on each row; the information card carries a note in both languages for an open part; the material is `THREE.DoubleSide` so an open surface reads as a surface from either side. |
| **Assumption** | Double-sided drawing is a rendering decision, not a claim that the surface is closed. |
| **Validation** | `tests/heart-anatomy.test.js` — every part the table marks open carries the note, and every part it marks closed does not. |

### 6. Colour encodes identity and nothing physiological

| | |
| --- | --- |
| **Claim** | Neither colour mode encodes oxygenation, pressure or flow. |
| **Source** | Interface design requirement, not a biological source. |
| **Implementation** | `heartColor` varies hue by group and a stable hash of the id; natural mode varies only lightness within the source's own material. |
| **Assumption** | A reader may still read red as arterial. The card states the mode is identity-only; the chambers are not coloured by the blood they would carry. |
| **Validation** | `tests/heart-anatomy.test.js` — the two modes give the same part different colours and neither maps chamber to a blood-side palette. |

### 7. The model is placed by one transform

| | |
| --- | --- |
| **Claim** | The heart is centred and scaled by a single transform on one root, so a second model from the same release can be added beside it without either being re-centred. |
| **Source** | The file is in whole-body coordinates: the heart sits where a heart sits in a body, not about its own origin. |
| **Implementation** | `modelRoot` carries the scale; the loaded scene carries the offset; nothing else moves. |
| **Assumption** | That the vasculature file shares the release's coordinate frame is **not** assumed — it will be verified by placing the two together before anything is extracted. |
| **Validation** | `tests/heart-anatomy.test.js` — a second object added under `modelRoot` keeps its position relative to the heart. |

## What is not established

* No anatomist and no clinician has reviewed this geometry or these labels.
* The Japanese names are deliberate and unreviewed.
* The licences (HuBMAP CC BY 4.0; NLM Visible Human terms) are recorded and
  **not** discharged: no attribution surface, no acknowledgment text, no legal
  reading. The file is a candidate, not an adopted asset.
* **Whether each vessel surface is a lumen or a vessel wall has not been
  measured, and the scene no longer says either.** (B4-R2.) This bullet used to
  add that "the chambers were measured and are cavity casts", from which the
  vessel file could not borrow an answer. **The chamber half is withdrawn too**
  (B4-G1): nothing measured it. Genus does not settle it — a cup has a wall and
  genus 0 — and the enclosed volume does not either, since a normal left
  ventricular myocardial volume is of the same order as a normal cavity volume.
  Space or wall is unchecked for the chambers as well as for the vessels.
* **No junction has been evaluated as a junction.** What is measured is
  `nearestSampledVertexMm`: the smallest distance between a de-duplicated vertex
  of one mesh and a vertex of the other. That is a diagnostic that the two files
  share a frame. It is **not** a distance between the surfaces, so it settles
  nothing about whether a vessel and a chamber are joined, continuous or
  watertight — two meshes can interpenetrate without sharing a vertex. The
  vessels meet the heart where the two files put them.
* No mesh in the file is named "circumflex", and this repository does not decide
  which of the named left-coronary meshes carries that course.

### 8. The two files are combined without either being moved

| | |
| --- | --- |
| **Claim** | The heart and the vessels keep the relative positions the source gave them, and one display transform is applied to the pair. |
| **Source** | Both files are in the same whole-body frame: measured relationships in `docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md` — ascending aorta 20 mm above the aortic valve at the same depth; pulmonary trunk above the pulmonary valve; superior vena cava above and lateral to the right atrium, inferior vena cava below it; the four pulmonary veins behind the left atrium with the left pair on the +x side. |
| **Implementation** | Both scenes go under one `modelRoot`. The vessel subtree is reparented with its world matrix applied, so its position in the body survives rather than its position under a node that is not kept. The offset and uniform scale are set on `modelRoot` itself and nowhere else. |
| **Assumption** | The frames agree because those relationships come out of the files unaltered. **This is not a claim of sub-millimetre registration.** The one figure taken across the two files is `nearestSampledVertexMm`, a sampled-vertex distance and a frame diagnostic; no surface-to-surface distance is computed, and nothing asserts that a vessel's cut end and a chamber are joined, continuous or watertight. Neither file is warped, non-uniformly scaled or bent to fit the other. |
| **Validation** | `tests/heart-anatomy.test.js` — adding the vessels does not move the heart; the ascending aorta is above the aortic valve and the inferior vena cava below the right atrium after the shared transform; the transform is uniform and its scale is the one the heart alone would get. |

### 9. The subtree the source calls the vessels of the heart is taken, and five aortic branches by name

| | |
| --- | --- |
| **Claim** | 37 meshes of the vasculature file's 104 are adopted, chosen by the source's own grouping rather than by a box round the heart — and, since 2026-09-29, the five arteries leaving the abdominal aorta, by node name (claim 15). |
| **Source** | The file's node hierarchy: `VH_M_blood_vasculature_of_heart` with `VH_M_arteries_of_heart` and `VH_M_veins_of_heart` under it; the five branches under the liver, kidney and large-intestine groups. |
| **Implementation** | `VESSEL_SUBTREE` and `VESSEL_NODES_OUTSIDE_SUBTREE` in the scene name them; nothing else is reparented, and the count left behind is reported in the status (`vesselsNotTaken`). |
| **Assumption** | The publisher's grouping is trusted as the answer to "which vessels belong to the heart". The five branches are added because the aorta in that grouping has an opening for each of them, not because of a different reading of the boundary. |
| **Validation** | `tests/heart-anatomy.test.js` — a fixture with a mesh outside the subtree is not adopted and is counted. |

### 10. Where the source contradicts itself, both readings are kept

| | |
| --- | --- |
| **Claim** | `VH_M_left_anterior_descending_artery` carries a node name and a label/ontology id that disagree, and the scene reports the disagreement instead of choosing. |
| **Source** | The node's own `extras`: `label: "Anterior descending branch of left pulmonary artery"`, `ontologyid: FMA:8636`, under `VH_M_arteries_of_heart/VH_M_cardiac_artery`. |
| **Implementation** | The structure's card shows the node-derived name, keeps `sourceLabel` and `ontologyId` beside it, and carries a note in both languages stating the conflict and where the mesh sits. |
| **Assumption** | None resolved. Where the mesh is — anterior ventricular surface, below the valve plane — is reported as a position, not as a ruling on which record is right. |
| **Validation** | `tests/heart-anatomy.test.js` — the note is present, says "neither is corrected", and is the only such note in the table. |

### 11. Vessel colour reports the source, and says what it is not

| | |
| --- | --- |
| **Claim** | Natural mode uses the source's own artery/vein material assignment, and that is a vessel-type map rather than an oxygenation map. |
| **Source** | The vasculature file ships `artery_mat7` (pure red, 39 meshes + 9 on `phong7`) and `vein_mat8` (pure blue, 56 meshes) and assigns every mesh to one. |
| **Implementation** | `VESSEL_HUE` in the adapter, softened in saturation and lightness so the two are readable beside the tissue colours. Parts mode is a separate identity map with a hue band per group and no red in the chamber band. |
| **Assumption** | Reporting the source's assignment is not endorsing red-equals-oxygenated. The model contains the counterexample and the card names it. |
| **Validation** | `tests/heart-anatomy.test.js` — the pulmonary trunk is red and the pulmonary veins blue, and the card is required to say what that does and does not mean. |

### 12. A shared group is not a shared meaning

| | |
| --- | --- |
| **Claim** | Where a structure is filed for navigation says nothing about what it is, and the description is what says what it is. |
| **Source** | The interventricular septum arrives as a separate closed solid enclosing 28.1 mL — the one part of the heart file that is a wall rather than a chamber cavity. The left and right brachiocephalic veins unite to form the superior vena cava; they run beside the aortic arch and are not its branches. |
| **Implementation** | `descriptionKey` on a row overrides its group's description. The septum keeps the chamber group (that is where a reader looks) and carries its own text. The brachiocephalic veins moved out of `archBranch` into `cavalTributary`, which has its own name, its own colour band and its own description. The chamber description no longer opens with "a closed surface", because five of the fourteen heart parts are open and the row's own `closed` flag is what answers that. |
| **Assumption** | That the septum is a wall and that the brachiocephalic veins form the superior vena cava are ordinary gross anatomy, not findings of ours; the geometry (a separate closed solid; two veins converging superior to the heart) is consistent with both, and no measurement here establishes either. |
| **Validation** | `tests/heart-anatomy.test.js` — the septum does not carry the chambers' sentence, the veins do not carry the arch's, and no structure's description contradicts its own `closed` flag. (B4-R1.) |

### 13. "Visible" is three answers, and one of them is "could not tell"

| | |
| --- | --- |
| **Claim** | What the scene reports is whether **one anchor point** is unobstructed along a ray from a **stated eye position** — and it distinguishes a prediction about a named viewpoint from an answer about the camera as it stands. |
| **Source** | Not a source claim; a statement about what the code measures. |
| **Implementation** | `_anchorClearFrom(id, eye)` returns `true`, `false` or `null`. `_anchorClearFromView` asks it from a named viewpoint — a prediction, because the caller applies the view afterwards. `isAnchorClearNow` asks it from the live camera. `isStructureObscured` prefers the live camera and treats an unmeasurable answer as *not* an obstruction, so a button is never offered on a non-answer. `applyDisplayRecipe` returns `anchorsClear`, `anchorsBlocked` and `anchorsUnmeasured` as three separate lists. |
| **Assumption** | **One anchor does not speak for a whole structure** — the brain has the same limit recorded as F-40 — and nothing here knows the view frustum, the zoom, or which part of the canvas a panel covers. So this is never "the structure is visible on screen". |
| **Validation** | `tests/heart-anatomy.test.js` — an unknown viewpoint answers `null` rather than `true`; the live-camera answer and the viewpoint prediction are taken separately and neither rewrites the other; the recipe's three lists partition the structures it names. The panel's wording is checked against the same terms. (B4-R4.) |

### 14. A name the source is not consistent about is marked where it is shown

| | |
| --- | --- |
| **Claim** | For `VH_M_left_anterior_descending_artery`, the reader is told at the point of naming that the source's own records disagree. |
| **Source** | The node's own `extras`, unchanged: node name vs `label` + `ontologyid`. |
| **Implementation** | `identity: 'source-conflict'` travels with the structure. The panel marks the pinned heading, a search result row carries it, and the 3D label gets a short second line — "name unverified" / 「名称要確認」 — never the paragraph, which stays in the detail tab. The node name, `sourceLabel` and `ontologyId` are untouched and searching by the source's own wording still finds it. |
| **Assumption** | **Nothing here decides which record is right.** The mark says the question is open; it does not answer it. |
| **Validation** | `tests/heart-anatomy.test.js` — the original three fields are unchanged, the mark is present and short, every other structure is explicitly settled, and the label carries the mark rather than the explanation. (B4-R5.) |

### 15. The aorta is drawn with the branches the source gives it, where the source puts them

| | |
| --- | --- |
| **Claim** | With the aorta shown, the arch gives off the brachiocephalic trunk, the left common carotid and the left subclavian, and the abdominal aorta gives off the coeliac trunk, the superior mesenteric artery, both renal arteries and the inferior mesenteric artery — each from the opening the source's own aorta has for it, in the standard order from above. |
| **Source** | `VH_M_Blood_Vasculature.glb`: the five abdominal branches are separate meshes the publisher filed under the liver, the kidney and the large intestine. Boundary loops, measured in the source's millimetres: the descending aorta's openings for the SMA (12.5, 317.7, 10.7; r 6.9), the IMA (15.2, 198.8, 27.9; r 5.0) and one renal artery (21.2, 300.1, 6.0; r 4.1) are the same rings as those branches' own; the coeliac trunk's (12.5, 331.7) and the other renal artery's (3.2, 302.9) sit on openings 1–2 mm away. Origins top to bottom: coeliac 332, SMA 318, renal 303 and 300, IMA 199, aortic end 187 mm. |
| **Implementation** | `scripts/repair-candidate-gltf.mjs` keeps them (`keepAlso`), with their ancestor groups, names and extras; `HEART_VESSELS` names them; `HEART_VESSEL_NODES_OUTSIDE_SUBTREE` is what the scene takes beside the heart subtree. |
| **Assumption** | The publisher's segmentation of each branch, and its identity, is trusted — except where its own geometry contradicts its name (claim 16). The specimen's inferior mesenteric artery arises about 1.2 cm above the end of its aorta, where 3–4 cm is usual; left as it is. |
| **Validation** | `tests/heart-anatomy.test.js` — the order of origins, the forward course of the gut arteries and the outward-and-backward course of the renal arteries, and the right renal artery longer than the left; `npm run assets:repair:verify` (positions of every kept mesh byte-identical to the publisher's); renders from the front, back and both sides. |

### 16. The renal arteries are named by where they go

| | |
| --- | --- |
| **Claim** | The mesh the source calls `VH_M_left_renal_artery` is the **right** renal artery, and `VH_M_right_renal_artery` the left. |
| **Source** | The file's own axes (+x is the patient's left: its left atrium, left ophthalmic veins and left renal vein are all at +x). The mesh called left leaves the aorta's −x side at (3.2, 302.9, 9.2) and ends at (−50.6, 313.1, −10.2), beside the right renal vein (x −62…−33) and behind the inferior vena cava; the one called right leaves at (21.2, 300.1, 6.0) and ends at x +53…+55. |
| **Implementation** | `HEART_VESSELS` keeps the node names as ids (an id is opaque) and names the structures by position; `sideSwapped` puts "named by position" / 「位置で命名」 beside the name and a note with the source's own label and term on the card (`sourceLabel`, `sourceOntologyId`). |
| **Assumption** | That the file's axes hold throughout the file — which three independent left/right pairs in it support. |
| **Validation** | `tests/heart-anatomy.test.js` — each renal artery runs to the side it is named for, in `HEART_AXES`, and keeps the source's label. |

### 17. Four arterial segments are schematic, and say so

| | |
| --- | --- |
| **Claim** | The start of the right common carotid, the right subclavian and both common iliac arteries is drawn **schematically**: where it starts is measured, how it runs is not. |
| **Source** | The source has none of the four. Its brachiocephalic trunk ends in a rounded tip at (−27.0, 606.8, 25.0), at the level where the trunk divides; its aorta ends at y 187 with two openings, (5.2, 190.8, 25.0; r 3.6) on the right and (14.9, 188.0, 23.1; r 2.6) on the left, and its pelvic vessels are veins only. Direction and course from the standard pattern (Sources consulted). |
| **Implementation** | `HEART_SCHEMATIC`: a centreline starting on the parent's measured centreline, inside it, calibre from the opening (iliac) or from the source's left carotid and subclavian at the same height, routed clear of the source's vessels — measured clearances: right common carotid 8.1 mm from the right brachiocephalic vein, right subclavian 3.0 mm (passing behind it), right common iliac 0.49 mm from the inferior vena cava at the aorta's own opening, left common iliac 2.6 mm from the inferior mesenteric artery. Built only when the parent is where the table says (`buildSchematicVessels`). |
| **Assumption** | **Their length, angle and course are not this specimen's.** No ontology id is quoted for them. |
| **Validation** | `tests/heart-anatomy.test.js` — each is drawn only beside its parent, is selectable and labelled, says "schematic" / 「模式」 on its card, carries no ontology id, starts inside its parent and tapers and fades before its own end. |

### 18. A branch fades at the end of its display range, and the fade is one rule

| | |
| --- | --- |
| **Claim** | Every branch shown for its first centimetres fades out rather than ending; with only the heart shown the roots do the same just outside the heart; and a faded part takes no click, carries no label and does not stretch the camera's frame. |
| **Source** | A presentation choice, not a source claim. |
| **Implementation** | `displayRange.js`: `displayRangeAlpha` (JavaScript) and the shader chunk are the same arithmetic; `_firstDrawnHit`, `_anchorFor` and `getSubjectBounds` all ask it. |
| **Assumption** | "Drawn" at a point means at least half drawn there (`RANGE_DRAWN`). |
| **Validation** | `tests/heart-display-range.test.js` evaluates the shader's formula on the **uniform values the renderer is handed** and holds it to the JavaScript for every combination of reach and trim — written after the two disagreed on screen (`docs/verification-lessons.md`). `tests/heart-anatomy.test.js` — a ray through the trimmed end of the vena cava selects nothing there. |

### 19. The heart on its own keeps the heart's own vessels and the roots, and nothing beyond

| | |
| --- | --- |
| **Claim** | Switching the aorta off keeps the heart, its coronary arteries and cardiac veins, and the roots of the great vessels; it takes the aorta beyond its root, every aortic branch and the brachiocephalic veins; it clears a selection or isolation on what it takes; and the camera turns about the heart. |
| **Source** | A presentation choice; the extents are listed per structure (`extent` in the adapter). |
| **Implementation** | `setDisplayScope` / `getDisplayScope` / `onDisplayScope`; the panel's switch; `reframeForSubject` in `App.js`, which keeps the reader's direction and refits to `getSubjectBounds`. |
| **Assumption** | None about anatomy. The trim margin is a composition (`HEART_ONLY_TRIM`). |
| **Validation** | `tests/heart-anatomy.test.js` (extents, clearing, click-through while fading, no drift of the subject), `tests/anatomy-scope-switch.test.js` (the switch), and `npm run verify:anatomy` in a browser at 1280×800 and 390×844 (selection cleared, heart filling the frame and turning about itself, the same two frames after repeated switching, the reader's direction kept, "Reset display" returning the aorta). |

### 20. The aorta and its branches are described in textbook anatomy, first

| | |
| --- | --- |
| **Claim** | The ascending aorta, the arch, the descending aorta and the twelve branches each open their description with standard anatomy — where the vessel leaves its parent, its typical level, how the sides differ, what it supplies, its commonest variant — before the account of what this model does with it. |
| **Source** | Gray's Anatomy; Moore, *Clinically Oriented Anatomy*; Netter, *Atlas of Human Anatomy* — applied from knowledge (Sources consulted, 2026-09-30). **Not this specimen**: no level, length or territory is measured from the Visible Human. |
| **Implementation** | `ANATOMY` / `heartAnatomyNote` in `src/data/heartAnatomy.js`, prepended by `heartStructureInfo` as its own paragraph; the scope panel's caution that these are the typical account; two more entries in `HEART_MISSING` (the aorta's smaller branches, the ligamentum arteriosum), both checked absent from the source's node names. |
| **Assumption** | A level is written "typically" / 「典型的には」 wherever one is given. The renal paragraphs follow the names given by position (claim 16), not the source's. |
| **Validation** | `tests/heart-anatomy.test.js` — all fifteen have both languages, the anatomy comes first and the model's account is kept whole after it, every vertebral level is said to be typical, the renal paragraphs name the kidney each one goes to, and the two absences are listed. Removing the paragraph from `heartStructureInfo` turns it red. **No anatomist has read these paragraphs.** |
