# Model evidence — Interactive skin anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross and microscopic anatomy of skin: an **epidermis** of stratified
  squamous epithelium, avascular and renewed from below; a **dermis** of
  connective tissue carrying the vessels, nerves, glands and hair roots; and a
  **subcutaneous** layer of fat in lobules beneath it, which is not part of the
  skin proper.
- That the **dermo-epidermal junction** is not planar — it interdigitates as rete
  ridges and dermal papillae — and that separation at that plane is what a
  blister is.
- That the epidermis contains **no blood vessels** and is nourished by diffusion
  from the papillary dermis.
- That a **hair follicle** is a downgrowth of epidermis reaching into the dermis
  or subcutis, and that a **sebaceous gland** discharges into the follicle
  rather than onto the skin surface.
- That an **eccrine sweat gland** is a deep coil whose duct opens directly on the
  skin surface, independently of any hair.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Three layers, sharing their boundaries

| | |
| --- | --- |
| **Claim** | Each layer's floor is the next one's roof: there are no gaps and no overlaps between them. |
| **Source** | Standard histology. |
| **Implementation** | One `reteWave` function is both the underside of the epidermis and the top of the dermis, and one `dermisFloorWave` is both the underside of the dermis and the top of the subcutis. The surfaces are the same surface by construction, not by two functions that happen to agree (`docs/architecture-rules.md` rule 1). |
| **Assumption** | **The thicknesses are display values** (`LAYER_DISPLAY_THICKNESS`) and deliberately not to scale, stated on every layer, in the card and in the disclaimer. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three stack in order and each pair's boxes meet. |

### 2. The junction interlocks

| | |
| --- | --- |
| **Claim** | The join between epidermis and dermis is a ridged surface, not a plane. |
| **Source** | Standard histology; it is why skin resists shear, and why a split exactly there is a blister. |
| **Implementation** | `reteWave` is a sum of two sine products, exported so a test can measure it rather than measure a mesh. |
| **Assumption** | A regular wave stands for an irregular biological pattern, and the ridge depth is not a measurement. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — sampled over the block, the junction's height varies by more than a set amount. |

### 3. Nothing that carries blood is in the epidermis

| | |
| --- | --- |
| **Claim** | Arteriole, venule and nerve all stop below the junction. |
| **Source** | Standard histology; the epidermis is avascular and fed across the junction. |
| **Implementation** | The vessel paths were lowered until their tops cleared the epidermal floor — a vessel drawn a little too high says the opposite of the fact the model exists to state. |
| **Assumption** | One vessel of each kind stands for a plexus; the superficial and deep networks are not separately drawn. **The gap between the arteriole and the venule is a display value.** They were drawn on one course with the venule displaced 0.12, which is a fair description of a companion pair and left the artery invisible behind the vein from every viewpoint the scene offers; they are set apart across the block now, the venous side deeper. That the two run together is the claim; the distance is not. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — both vessels and the nerve stay below `epidermisFloor`. |

### 4. Two routes to the surface, and they are different

| | |
| --- | --- |
| **Claim** | The sebaceous gland opens into the follicle; the sweat gland opens on the surface, away from any hair. |
| **Source** | Standard histology. Confusing the two is the commonest mistake made about skin. |
| **Implementation** | The sebaceous blob is placed against the follicle's curve; the sweat duct spirals from a deep coil to `SITES.sweatPore`, which is a different point from `SITES.follicleMouth`. |
| **Assumption** | The sebaceous duct itself is not drawn; eccrine and apocrine glands are not distinguished. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the gland touches the follicle and never reaches the surface; the duct reaches the surface and its pore is far from the hair's mouth. |

### 5. The compartment and what fills it are two things

| | |
| --- | --- |
| **Claim** | The subcutaneous layer is a compartment; the fat in lobules is its contents. |
| **Source** | Standard anatomy: subcutaneous tissue is not part of the skin proper, and fat is what occupies it. |
| **Implementation** | Fourteen lobules are drawn inside the slab as one structure with many meshes, positioned clear of the cut sides and the floor. |
| **Assumption** | The fibrous septa that divide the lobules are not drawn, and the amount of fat is not a claim about anybody. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — every lobule is inside the subcutaneous slab's bounds, and there is more than one of them. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. The block is already open at the sides. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The specimen has cut sides, so no clipping plane is needed; the slider fades the layers, and "what goes through it" hides them by tag. |
| **Assumption** | A reader who touches nothing sees a block from outside, with a hair and a pore on top, which is what skin looks like. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
