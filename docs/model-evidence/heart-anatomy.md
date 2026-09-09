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
| **Implementation** | No cutaway, no section plane and no "inside" viewpoint exists in `VIEW_SPECS`. Hiding a chamber is what exposes the valves and papillary muscles inside it, and `revealStructure` reports `occluded` rather than pretending to cut. |
| **Assumption** | The volumes are properties of one fixed specimen and are recorded for this decision only. They are **not** clinical chamber volumes and are never displayed as any. |
| **Validation** | `tests/heart-anatomy.test.js` — no viewpoint claims an interior, and `revealStructure` on a part enclosed by a fixture chamber reports it as occluded instead of returning success. |

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
* Whether each vessel surface is a lumen cast or a wall shell has not been
  measured. The chambers were measured and are cavity casts; the vessels are
  described the same way as a description, not as a measurement.
* No junction between a vessel and a chamber has been measured. The vessels meet
  the heart where the two files put them.
* No mesh in the file is named "circumflex", and this repository does not decide
  which of the named left-coronary meshes carries that course.

### 8. The two files are combined without either being moved

| | |
| --- | --- |
| **Claim** | The heart and the vessels keep the relative positions the source gave them, and one display transform is applied to the pair. |
| **Source** | Both files are in the same whole-body frame: measured relationships in `docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md` — ascending aorta 20 mm above the aortic valve at the same depth; pulmonary trunk above the pulmonary valve; superior vena cava above and lateral to the right atrium, inferior vena cava below it; the four pulmonary veins behind the left atrium with the left pair on the +x side. |
| **Implementation** | Both scenes go under one `modelRoot`. The vessel subtree is reparented with its world matrix applied, so its position in the body survives rather than its position under a node that is not kept. The offset and uniform scale are set on `modelRoot` itself and nowhere else. |
| **Assumption** | The frames agree because those relationships come out of the files unaltered. **This is not a claim of sub-millimetre registration**, and no distance between a vessel's cut end and a chamber is measured or asserted. Neither file is warped, non-uniformly scaled or bent to fit the other. |
| **Validation** | `tests/heart-anatomy.test.js` — adding the vessels does not move the heart; the ascending aorta is above the aortic valve and the inferior vena cava below the right atrium after the shared transform; the transform is uniform and its scale is the one the heart alone would get. |

### 9. Only the subtree the source calls the vessels of the heart is taken

| | |
| --- | --- |
| **Claim** | 37 meshes of the vasculature file's 104 are adopted, chosen by the source's own grouping rather than by a box round the heart. |
| **Source** | The file's node hierarchy: `VH_M_blood_vasculature_of_heart` with `VH_M_arteries_of_heart` and `VH_M_veins_of_heart` under it. |
| **Implementation** | `VESSEL_SUBTREE` in the scene names that node; nothing outside it is reparented, and the count left behind is reported in the status (`vesselsNotTaken`). |
| **Assumption** | The publisher's grouping is trusted as the answer to "which vessels belong to the heart". A different reading of that boundary would be an anatomical judgement, and none is made here. |
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
