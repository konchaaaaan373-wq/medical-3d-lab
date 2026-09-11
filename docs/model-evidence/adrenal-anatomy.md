# Model evidence — Interactive adrenal anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard histology and gross anatomy of the adrenal gland: a cortex in three
  zones — glomerulosa, fasciculata, reticularis — from the capsule inwards, with
  a medulla inside them.
- That each zone makes a different class of hormone: mineralocorticoid,
  glucocorticoid, adrenal androgen; and that the medulla is **not cortex** but
  sympathetic nervous tissue releasing catecholamines into the blood.
- That the cortex makes up the great majority of the gland's mass, and the
  glomerulosa is a thin rim inside the capsule.
- That the right gland is pyramidal and caps the upper pole of its kidney, while
  the left is crescentic and lies along the medial border of its own.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Four layers, in one order, from the capsule inwards

| | |
| --- | --- |
| **Claim** | Glomerulosa outside fasciculata outside reticularis outside medulla. |
| **Source** | Standard histology. |
| **Implementation** | `carveLayers` builds four concentric shells from the gland's own radial field, so each encloses the next by construction rather than by three positions that have to be kept in step. |
| **Assumption** | The boundaries are sharp here and are gradual in life. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each layer encloses the next, and the medulla is inside all three zones. |

### 2. The thicknesses are not the proportions

| | |
| --- | --- |
| **Claim** | *Not* made. The relative thickness of the four layers here is a drawing decision. |
| **Source** | In life the cortex is about nine tenths of the gland and the glomerulosa is a thin rim. |
| **Implementation** | The four fractions are chosen so that three zones can be told apart on a screen. |
| **Assumption** | Recorded on **every one of the eight zone structures**, in both languages, in the model card and in the scene's disclaimer. A model that draws four even layers and says nothing is claiming four even layers. |
| **Validation** | The note is held in both languages by `tests/organ-anatomy-scenes.test.js`. |

### 3. The medulla is not cortex

| | |
| --- | --- |
| **Claim** | The inside of the gland is sympathetic nervous tissue, with a different origin, a different output and a different time course. |
| **Source** | Standard histology and physiology. |
| **Implementation** | Drawn as the one solid inside the three shells, in a colour that does not belong to the cortical series, and given its own legend key. |
| **Assumption** | Chromaffin cells and the preganglionic supply that drives them are not drawn. The two time courses are `adrenal-response`, not here. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the medulla's own hierarchy and note in both languages. |

### 4. The two glands are different shapes

| | |
| --- | --- |
| **Claim** | Right pyramidal and capping its kidney; left crescentic and along its kidney's medial border. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Two warps, not one mirrored: the left adds a scoop on its inferior surface. Both kidneys are drawn so the difference has something to be a difference *about*. |
| **Assumption** | The kidneys here are plain beans and are context only; the kidney at its own scale is `kidney-anatomy`. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the right gland sits above its kidney's upper pole and the left overlaps its kidney's medial border. |
