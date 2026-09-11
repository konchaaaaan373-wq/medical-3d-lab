# Model evidence — Interactive kidney anatomy

Where each claim this scene makes comes from, and what holds it up. The
geometry predates the scene; what is new is the naming and the tract.

## Sources consulted

- Standard gross-anatomy accounts of the renal cortex, medullary pyramids,
  renal columns and the collecting system, as stated in `kidneyAnatomy.js`.
- The conventional three-major-calyx arrangement (superior, middle, inferior)
  and the seven-lobe layout the builder fans out from the sinus.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The cortex is a shell; the pyramids and columns are what is inside it

| | |
| --- | --- |
| **Claim** | Cortex lies between the capsule and the corticomedullary junction and also reaches inwards between the pyramids as the renal columns; a column is cortex, not medulla. |
| **Source** | Standard renal anatomy. |
| **Implementation** | The cortex is carved as the shell between two fields; the inner solid is partitioned into seven pyramids and the columns between them, and the columns take the cortex's colour because they are the cortex's tissue. |
| **Assumption** | The corticomedullary junction is the capsule field scaled, not a surface of its own. |
| **Validation** | `tests/kidney-anatomy.test.js` — the shell, and the partition of what is inside it. |

### 2. Seven pyramids, one coronal row

| | |
| --- | --- |
| **Claim** | Each pyramid has its base at the junction and its papilla at the sinus. |
| **Source** | Standard renal anatomy. |
| **Implementation** | Each lobe's axis is measured on the inner solid by bisection rather than by a fixed-point iteration, because the field and the ray do not share a parameterisation. |
| **Assumption** | **Schematic:** a kidney's pyramids form an anterior and a posterior row; these seven are one row in the coronal plane. The number varies between kidneys and seven is a common arrangement, not a constant. |
| **Validation** | `tests/kidney-anatomy.test.js`; the schematic limits are recorded in `src/catalog/anatomy.js` and in the model card. |

### 3. Urine leaves by a route, not by a point

| | |
| --- | --- |
| **Claim** | A minor calyx cups each papilla; minor calyces join a major calyx; the major calyces open into one pelvis, which leaves at the hilum as the ureter. |
| **Source** | Standard renal anatomy. A major calyx and an infundibulum are one structure under two names. |
| **Implementation** | Each minor calyx is drawn as the cast of its lumen from past the papilla to its major calyx; the three trunks run to the pelvis; the pelvis is sized to the sinus it sits in rather than to the organ. |
| **Assumption** | Two major calyces also occur and are not modelled. The ureter's calibre and course are illustrative and the three normal narrowings are absent. |
| **Validation** | `tests/kidney-anatomy.test.js` — a calyx per papilla, three gathering trunks, one pelvis. |

### 4. The landmark side is never given part names

| | |
| --- | --- |
| **Claim** | The right kidney in this scene is a whole-organ shape, and the scene says so. |
| **Source** | Not a claim about anatomy — a claim about what this model contains. |
| **Implementation** | The unopened kidney is declared as one structure whose meshes are its shell, its inner mass and a stand-in pelvis, carrying a note that it is not partitioned. No part name resolves to it. |
| **Assumption** | The two kidneys have the same parts, so opening one is not a loss of information; it is a saving of about a second of blocked page. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — every part name belongs to the opened side, and the landmark structure carries its note in both languages. |

### 5. Selection, the tree and the card name one thing

| | |
| --- | --- |
| **Claim** | The structure under the pointer, the highlighted row and the name on the card are the same structure. |
| **Source** | `src/app/anatomyContract.js`. |
| **Implementation** | One id per structure; hidden and faded meshes are removed from the pick candidates, and a section plane removes what is on its discarded side from the ray as well as from the render. |
| **Assumption** | None beyond the contract. |
| **Validation** | `tests/organ-anatomy-scenes.test.js`; `npm run verify:anatomy -- --scene kidney-anatomy` in a browser. |
