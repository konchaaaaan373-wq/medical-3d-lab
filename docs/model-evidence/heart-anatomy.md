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
* **OpenStax, *Anatomy and Physiology 2e* (Rice University; CC BY-NC-SA 4.0), read
  from the publisher's own source repository `openstax/osbooks-anatomy-physiology`
  at commit `5ae32b3f4bc24ed003e91dc38bf47dba80751044`, 2026-09-30.** Chapter 20,
  §20.5 "Circulatory Pathways" (module `m46646`) for the aorta and its branches;
  §19.1 "Heart Anatomy" (`m46676`) for the heart's apex; §20.6 "Development of
  Blood Vessels and Fetal Circulation" (`m46610`) for the ductus arteriosus. **This
  is the only anatomy text that was actually opened for this scene.** What each
  claim was checked against, and what could not be, is the table under
  "Reference check" at the end of this file.
* **Not consulted, and not a source for anything here:** Gray's Anatomy, Moore's
  *Clinically Oriented Anatomy* and Netter's *Atlas*. An earlier draft of this
  dossier (2026-09-29) named them as the basis of the branch order and of the
  vessel descriptions; they had been recalled, not opened, and that entry is
  withdrawn. Every statement that rested only on them was either checked against
  OpenStax or removed. These hosts were tried and refused by this environment's
  network policy on 2026-09-29/30: en.wikipedia.org, teachmeanatomy.info,
  www.ncbi.nlm.nih.gov (StatPearls), openstax.org, radiopaedia.org,
  www.kenhub.com, en.wikisource.org, www.gutenberg.org, archive.org.
* **No Japanese anatomical-terminology source was opened.** The Japanese names
  follow the ones this site already uses (e.g. 腹部大動脈 in the abdomen scene);
  they have not been checked against 解剖学用語.

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
| **Assumption** | The publisher's segmentation of each branch, and its identity, is trusted — except where its own geometry contradicts its name (claim 16). In the source's geometry the inferior mesenteric artery leaves just above the aorta's end: 8.0 and 10.8 mm (file units × 1000) along the file's vertical axis from the centre of its opening to the centres of the two iliac openings, 11.4 mm to the aorta's lowest vertex. **That is a distance in the model, not a measurement of the Visible Human specimen**: the file is in metres only by the glTF convention, nothing calibrates this reference-atlas model to the specimen, and whether the reference model reproduces the specimen at this point is not established. It is not called a variant. OpenStax places the IMA about 5 cm above the common iliac arteries; the reader is told the two differ, and which is which. |
| **Validation** | `tests/heart-anatomy.test.js` — the order of origins, the forward course of the gut arteries and the outward-and-backward course of the renal arteries, and the right renal artery longer than the left; `npm run assets:repair:verify` (positions of every kept mesh byte-identical to the publisher's); renders from the front, back and both sides. |

### 16. The renal arteries are shown under the names their position gives them

| | |
| --- | --- |
| **Claim** | The mesh the source file records as `VH_M_left_renal_artery` (label "left renal artery", UBERON:0001186) is shown as the **right** renal artery, and `VH_M_right_renal_artery` as the left, because the file's own geometry puts each on the other side — and the geometry, not the two labels, is what the rest of the file agrees with. |
| **Source** | Measured on the pinned source (`dev-assets/heart/VH_M_Blood_Vasculature.glb`), 2026-09-30, `+x`/`+y`/`+z` in file units × 1000. **(a) Nothing in the file moves or mirrors anything**: none of its 153 nodes carries a translation, rotation, scale or matrix, and every mesh's world matrix has determinant +1; the heart file's 18 nodes likewise. **(b) The scene applies a translation and one positive uniform scale** to both files together (`HeartAnatomyScene`, `modelRoot.position` / `scale.setScalar(TARGET_RADIUS / radius)`) — no rotation, no reflection — and `GLTFLoader` keeps glTF's axes. **(c) +x is the body's left by every independent marker in the file**, each agreeing with the textbook (OpenStax §19.1, §20.5): the heart's apex deviates to the left — left ventricle x +45.4 against right atrium −21.4; the arch arcs to the left — thoracic descending aorta x +12.2 against ascending −3.2; the venae cavae are on the right of the aorta — superior −26.2, inferior −19.0 against aorta +11.5 at y 300; the liver's right hepatic vein is at −84.4 and the spleen's artery and vein at +58.6 and +79.0; and the vein the file labels *left* renal vein is the long one (x −7.0 … +60.9) and crosses in front of the aorta (z 18.1 against the aorta's 8.0), as the textbook's longer left renal vein does. **(d) The file's own left/right labels agree with that** for every other paired structure measured: superior ophthalmic veins, brachiocephalic veins, common and external iliac veins, renal veins and pulmonary arteries all have `_L` at +x. **(e) The two renal arteries are the exception**: the one labelled *left* runs from the aorta to −x, 62.6 mm, ends at x −51.1 beside the file's *right* renal vein (x −62.1 … −32.6), and passes behind the inferior vena cava (z −0.3 against 6.5); the one labelled *right* runs to +x, 44.3 mm. The textbook's longer renal artery is the right (OpenStax §20.5); here the longer one is the one labelled left. |
| **Implementation** | `HEART_VESSELS` keeps the node names as ids (an id is opaque) and shows the structures under the names by position. **The reader is not told the source is wrong**: the name shown is the standard one with no mark beside it, and the detail tab says what the file records it as and that this model shows it by position, with the source's label and term kept (`sourceLabel`, `sourceOntologyId`). Until 2026-09-30 the summary line read 「位置で命名（出典は左右逆の表記）」; that was withdrawn as a statement stronger than a reader could check. |
| **Assumption** | That a mirrored or rotated file is ruled out by (a)–(d), and that a mislabelled pair is the remaining explanation of (e). **No anatomist has confirmed it**, and nothing here says why the publisher's labels differ. That the right renal artery passes behind the inferior vena cava is consistent with (e) but was not found in the opened text, so it is not counted as evidence. |
| **Validation** | `tests/heart-anatomy.test.js` — each renal artery runs to the side it is shown as, in `HEART_AXES`, keeps the source's label, carries no mark beside its name and has a detail note that does not call the file wrong. The measurements in (a)–(e) are a script run once on the pinned source, recorded here; they are not re-run by a test, because the source file is not in the repository. |

### 17. Four arterial segments are schematic, and say so

| | |
| --- | --- |
| **Claim** | The start of the right common carotid, the right subclavian and both common iliac arteries is drawn **schematically**: where it starts is measured, how it runs is not. |
| **Source** | The source has none of the four. Its brachiocephalic trunk ends in a rounded tip at (−27.0, 606.8, 25.0), at the level where the trunk divides; its aorta ends at y 187 with two openings, (5.2, 190.8, 25.0; r 3.6) on the right and (14.9, 188.0, 23.1; r 2.6) on the left, and its pelvic vessels are veins only. **What was checked**: that the right common carotid and right subclavian arteries arise from the brachiocephalic trunk, and that the abdominal aorta divides into the two common iliac arteries (OpenStax §20.5). **What was not**: their direction, angle and length, which follow the drawing, not a source. |
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
| **Assumption** | None about anatomy. Which roots are trimmed and how far is a composition (`HEART_ONLY_TRIM`, `heartOnlyFloorMm`): only the two venae cavae, because every other root ends in the source within 15 mm of the heart (measured) and trimming them showed holes through them in renders from behind and the side. Judged from renders of all six sides of the heart on its own, 2026-09-30. |
| **Validation** | `tests/heart-anatomy.test.js` (extents, clearing, click-through while fading, no drift of the subject), `tests/anatomy-scope-switch.test.js` (the switch), and `npm run verify:anatomy` in a browser at 1280×800 and 390×844 (selection cleared, heart filling the frame and turning about itself, the same two frames after repeated switching, the reader's direction kept, "Reset display" returning the aorta). |

### 20. The aorta and its branches are described in textbook anatomy, first — only what was checked

| | |
| --- | --- |
| **Claim** | The ascending aorta, the arch, the descending aorta and the twelve branches each open their description with general anatomy — where the vessel arises, the few levels the opened textbook gives, how the two sides differ and what it supplies — before the account of what this model does with it. |
| **Source** | OpenStax, *Anatomy and Physiology 2e*, §20.5, §19.1, §20.6 (Sources consulted). Every sentence is in the "Reference check" table. **Not this specimen**: no level, length or territory is measured from the Visible Human. |
| **Implementation** | `ANATOMY` / `heartAnatomyNote` in `src/data/heartAnatomy.js`, prepended by `heartStructureInfo` as its own paragraph; the scope panel says the text is the textbook's general account, kept to what could be checked, and not reviewed by an anatomist; `HEART_MISSING` lists the aorta's smaller branches (as OpenStax names them, each checked absent from the source's node names) and the ligamentum arteriosum. **Removed on 2026-09-30** because the opened source does not support them: the vertebral levels of the aortic hiatus, coeliac trunk, SMA, renal arteries and IMA; the lengths of the brachiocephalic trunk and the common iliac arteries; the brachiocephalic trunk's division behind the sternoclavicular joint; the subclavian arteries crossing the first rib; the relations to the trachea, the inferior vena cava, the left renal vein and the duodenum; the fore/mid/hindgut territories; the variants; and the distances between branches. Two of those distances were **contradicted** by the source (SMA "about 1 cm" below the coeliac trunk where OpenStax says about 2.5 cm; IMA "3–4 cm" above the bifurcation where it says about 5 cm). |
| **Assumption** | A level is written "typically" / 「典型的には」 wherever one is given. One textbook is one account: where texts differ, only what this one says is written, and the inter-branch distances it gives are not shown at all. The renal paragraphs follow the names given by position (claim 16). |
| **Validation** | `tests/heart-anatomy.test.js` — all fifteen have both languages, the anatomy comes first and the model's account is kept whole after it, every vertebral level is said to be typical, the renal paragraphs name the kidney each one goes to, and the two absences are listed. Removing the paragraph from `heartStructureInfo` turns it red. **No anatomist has read these paragraphs.** |

## Reference check — the aorta and its branches (2026-09-30)

資料: OpenStax, *Anatomy and Physiology 2e*（出版元のソース `openstax/osbooks-anatomy-physiology`
commit `5ae32b3`）。§19.1 = module `m46676`、§20.5 = `m46646`、§20.6 = `m46610`。
**実際に開いて読んだのはこの 1 冊だけ**です。引用は原文の英語のまま短く載せます。
「モデル」の数値は出典ファイルの座標（ファイル単位 × 1000）で、標本の実寸ではありません。

| 確認対象 | 閲覧した資料の該当箇所 | 確認結果 | 未確認点・処理 |
| --- | --- | --- | --- |
| 弓部の分枝は 3 本 | §20.5 "Aortic Arch Branches": "There are three major branches of the aortic arch: the brachiocephalic artery, the left common carotid artery, and the left subclavian" | 一致。モデルの弓部にも開口が 3 つ | 変異（共通幹など）は資料に無い → 説明文から削除 |
| 弓部分枝の順序 | §20.5 表 "Aortic Arch Branches and Brain Circulation": 腕頭動脈は "the first vessel branching from the aortic arch" | 一致。モデルの起始は右（−x）から腕頭 −4.5、左総頸 +8.3、左鎖骨下 +14.5 | 左総頸 → 左鎖骨下の順は列挙順からの読み取り（明示は「腕頭が最初」のみ） |
| 腕頭動脈は右だけで、右鎖骨下と右総頸に分かれる | §20.5: "located only on the right side of the body" / "branches into the right subclavian artery and the right common carotid artery" | 一致。模式の 2 区間はこの分岐に従う | 分岐の高さ（胸鎖関節の後ろ）、長さ 4〜5 cm、最も太いこと → 資料に無く削除 |
| 左総頸・左鎖骨下は弓から直接 | §20.5: "arise independently from the aortic arch"; 表 "the left common carotid artery arises from the aortic arch" | 一致 | 気管との位置関係、左鎖骨下が左総頸の後ろ左から出ること → 削除 |
| 鎖骨下動脈の枝と続き | §20.5 表: "gives rise to the internal thoracic, vertebral, and thyrocervical arteries"; 本文: the left subclavian "becomes the axillary artery" | 一致（その枝は出典ファイルに無いことをノード名で確認） | 第 1 肋骨を越えること → 削除 |
| 総頸動脈の分岐と栄養域 | §20.5 表: "each gives rise to the external and internal carotid arteries; supplies the respective sides of the head and neck" | 一致 | — |
| 上行大動脈 | §20.5: "moves in a superior direction for approximately 5 cm and ends at the sternal angle"; 冠動脈は "arise from two of the three sinuses in the ascending aorta just superior to the aortic semilunar valve" | 一致 | 「右上方へ」の向き → 削除。5 cm をモデル寸法と照合はしていない |
| 大動脈弓の走行と終わり | §20.5: "a graceful arc to the left" / "ends at the level of the intervertebral disk between the fourth and fifth thoracic vertebrae" | 一致。モデルでも胸部下行大動脈（x +12.2）は上行（−3.2）より左 | モデルに椎骨は無く、高さの一致は確認できない（説明文は「典型的には」付きの教科書の記載） |
| 胸部・腹部大動脈の区分 | §20.5: "Superior to the diaphragm, the aorta is called the thoracic aorta, and inferior to the diaphragm, it is called the abdominal aorta" | 一致 | 大動脈裂孔の高さ（第 12 胸椎）は資料に無い → 削除。モデルに横隔膜は無い |
| 腹部大動脈は脊柱の左 | §20.5: "remains to the left of the vertebral column" | 一致。モデルの大動脈 x +9.6〜+12.9、下大静脈 −3.3〜−23.5 | モデルに脊柱は無い（下大静脈との左右で代替） |
| 分岐部の高さ | §20.5: "bifurcates into the two common iliac arteries at the level of the fourth lumbar vertebra" | 記載として一致 | モデルに椎骨は無く、高さの一致は確認できない |
| 腹部主要分枝の順序（上から） | §20.5: SMA "arises approximately 2.5 cm after the celiac trunk"; renal "approximately 2.5 cm inferior to the superior mesenteric"; IMA "approximately 5 cm superior to the common iliac arteries" | **順序は一致**。モデルの開口 y: 腹腔 332.4、上腸間膜 317.7、腎 302.9 / 300.1、下腸間膜 198.8、総腸骨 190.8 / 188.0 | **距離は一致しない**（モデル 14.7、15〜17、8〜11）。旧記述「上腸間膜は腹腔の約 1 cm 下」「下腸間膜は分岐部の 3〜4 cm 上」は資料と矛盾 → 削除。距離は表示しない。下腸間膜だけは不一致を説明文に明記 |
| 不対か対か | §20.5: "A single celiac trunk"; "Two additional single vessels ... the superior and inferior mesenteric arteries"; "several significant paired arteries ... the renal arteries" | 一致 | — |
| 起始の方向 | §20.5 の本文・表に記載なし | **未確認**。モデルでは腹腔 3°・上腸間膜 1°（真前）、腎 −80° / +104°（左右）、下腸間膜 60°（前左）（真前 = 0°、左 = +） | 教科書での方向は確認できず、説明文に書かない |
| 右腎動脈が長い | §20.5: "The right renal artery is longer than the left since the aorta lies to the left of the vertebral column" | 一致（位置で名付けた右 62.6 mm、左 44.3 mm） | — |
| 腎動脈の左右の判定材料 | §19.1: "The slight deviation of the apex to the left"; §20.5: 弓は "arc to the left"; "Since the inferior vena cava lies primarily to the right of the vertebral column and aorta, the left renal vein is longer" | 判定の根拠として使用（claim 16） | 右腎動脈が下大静脈の後ろを通ることは資料で未確認 → 根拠に数えない。解剖学者の確認なし |
| 各枝の栄養域 | §20.5: 腹腔 → "stomach and esophagus / spleen / liver / stomach / gall bladder / duodenum / pancreas"; 表: SMA "small intestine (duodenum, jejunum, and ileum), the pancreas, and a majority of the large intestine"; IMA "distal segment of the large intestine and rectum"; renal "supplies each kidney" | 一致 | 前腸・中腸・後腸の区分、横行結腸の 2/3 の境界 → 削除 |
| 総腸骨動脈の先 | §20.5: "They split into external and internal iliac arteries approximately at the level of the lumbar-sacral articulation" | 一致 | 旧記述「仙腸関節の前で分かれる」は資料と異なる → 訂正。長さ約 4 cm → 削除 |
| 模式区間の接続（右総頸・右鎖骨下は腕頭から、総腸骨は大動脈の終わりから） | 上の各行 | 接続先は一致 | **方向・角度・長さ・周囲との位置関係（右鎖骨下が右腕頭静脈の後ろ、右総腸骨が下大静脈の前）は資料で未確認**。模式の描画上の選択として扱う |
| 動脈管索 | §20.6: "The ductus arteriosus is a short, muscular vessel that connects the pulmonary trunk to the aorta"; §19.1: "ligamentum arteriosum, the remnant of the fetal shunt called the ductus arteriosus" | 旧記述「大動脈弓と左肺動脈を結ぶ」を資料に合わせて訂正 | — |
| 大動脈の細い分枝 | §20.5: 胸部 — bronchial, pericardial, esophageal, mediastinal, intercostal, superior phrenic; 腹部 — inferior phrenic, adrenal, gonadal, lumbar; "continues as a small vessel, the median sacral artery" | 一致。いずれも出典ファイルのノード名に無いことを確認（正中仙骨は静脈のみ） | — |
| 日本語の用語 | 開いた資料なし | **未確認** | 解剖学用語との照合をしていない |

**この表が言っていないこと**: 1 冊の教科書と一致したことは、解剖学者の確認ではありません。
教科書どうしで値が違う項目（分枝間の距離など）は、この 1 冊の値を正とはせず、表示しない側に倒しています。
