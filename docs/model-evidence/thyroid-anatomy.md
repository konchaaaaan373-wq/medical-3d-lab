# Model evidence — Interactive thyroid anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the thyroid: two lobes joined across the
  front of the trachea by an isthmus, clasping the upper trachea, reaching up
  along the larynx.
- That four parathyroid glands usually lie on the posterior surface of the
  thyroid, two superior and two inferior, and that their position — especially
  the inferior pair's — is highly variable.
- That the recurrent laryngeal nerve ascends in the tracheo-oesophageal groove,
  deep to the gland, to supply the intrinsic laryngeal muscles.
- That a pyramidal lobe, a remnant of the thyroglossal tract, is present in
  roughly half of people.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The gland is clasped around the trachea

| | |
| --- | --- |
| **Claim** | The thyroid's shape is the shape of something wrapped around a tube: two lobes hollowed on their medial faces, joined in front by an isthmus. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Each lobe is a warp of the unit sphere whose medial face is pushed in by a Gaussian centred on the trachea's level; the isthmus is a tube across the front. The trachea itself is drawn, so the hollow is a hollow *around something* rather than a dent. |
| **Assumption** | The trachea is a plain tube — no cartilage rings, no larynx above it. The gland's extent along it is schematic. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the gland is anterior to the trachea and the two lobes are on opposite sides of it. |

### 2. The parathyroids are behind the gland, and where they are varies

| | |
| --- | --- |
| **Claim** | Four small glands sit on the posterior surface of the thyroid, two superior and two inferior. They are not thyroid tissue and they control calcium. |
| **Source** | Standard gross anatomy; the reason a total thyroidectomy risks hypocalcaemia rather than a thyroid problem. |
| **Implementation** | Four small spheres placed behind the lobes, the superior pair high and the inferior pair low, each its own named structure. |
| **Assumption** | **Position is the weakest claim in this model and the copy says so on every one of the four.** Four is the usual number; between two and six occur, and the inferior pair in particular can lie anywhere from the carotid sheath to the mediastinum. These are four plausible places, not four addresses. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — all four are posterior to the gland, and the superior pair is above the inferior pair on each side. |

### 3. The recurrent laryngeal nerve runs in the groove, behind the gland

| | |
| --- | --- |
| **Claim** | On each side the nerve ascends between the trachea and the oesophagus, deep to the thyroid, and injuring it changes the voice. |
| **Source** | Standard gross anatomy; the structure thyroid surgery is most careful about. |
| **Implementation** | A thin tube on each side, lateral to the trachea's midline and medial to its own lobe, at the depth of the groove — which is expressible only because the oesophagus is drawn behind the trachea. |
| **Assumption** | Drawn as a smooth cord. Its course below the neck is not modelled, which is exactly the difference (subclavian artery on the right, aortic arch on the left) that makes the two sides not mirror images in life. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each nerve is behind the gland, on its own side, and between the trachea and the oesophagus in depth. |

### 4. The pyramidal lobe is drawn, and it is not universal

| | |
| --- | --- |
| **Claim** | A finger of thyroid tissue often runs up from the isthmus, usually a little to the patient's left. |
| **Source** | Standard gross anatomy; a remnant of the thyroglossal duct. |
| **Implementation** | A tapering tube rising from the isthmus, offset slightly to +x (the patient's left). |
| **Assumption** | Present in roughly half of people, and this model always draws it. Recorded on the structure itself and in the model card, because a model that always draws a variant is claiming it is not a variant. |
| **Validation** | The note is held in both languages by `tests/organ-anatomy-scenes.test.js`. |
