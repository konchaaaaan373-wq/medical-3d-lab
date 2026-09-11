# Model evidence — Interactive lung anatomy

Where each claim this scene makes comes from, and what holds it up.

The geometry predates the scene: `organs/lungs.js` and `organs/lungAnatomy.js`
were written for the five respiratory disease scenes and already carried the
divisions. What this scene adds is naming, so most of the evidence below is
about the correspondence between a mesh and a name rather than about the shape.

## Sources consulted

- Standard gross-anatomy accounts of the pulmonary lobes and the fissures that
  separate them.
- The Jackson–Huber numbering of the bronchopulmonary segments (ten right,
  eight left), as stated in `lungAnatomy.js`.
- The conventional RALS arrangement of the hilar structures.

No external asset, no imaging and no patient data are used. Nothing here is a
measurement of a specimen.

## Claim → Source → Implementation → Assumption → Validation

### 1. Five lobes whose union is the parenchyma

| | |
| --- | --- |
| **Claim** | The right lung has three lobes and the left two, cut by the oblique fissure on both sides and by the horizontal fissure on the right. |
| **Source** | Standard gross anatomy; the fissures are declared as planes in `FISSURES`. |
| **Implementation** | `buildLungs` carves each lobe out of one pleural surface with the declared cutting planes. The scene declares one structure per lobe mesh. |
| **Assumption** | A fissure is a plane. Real fissures are curved and frequently incomplete. |
| **Validation** | `tests/lung-anatomy.test.js` — the lobes partition the parenchyma and their volume shares sit in the expected proportions. |

### 2. Eighteen segments, addressable through their bronchi

| | |
| --- | --- |
| **Claim** | Each bronchopulmonary segment is the lung one segmental bronchus ventilates, inside one lobe, and each has one artery running with that bronchus. |
| **Source** | The definition of a segment; the segment table in `lungAnatomy.js`. |
| **Implementation** | The segment territory is the lung nearest that segment's bronchial tip within its lobe. The scene names the segmental bronchus and the segmental artery, which exist as meshes, rather than offering a segment solid that does not. |
| **Assumption** | Nearest-bronchus is the definition applied rather than a specimen traced, so boundaries are smooth where real ones are not. Segment positions are placed where their names say they are. |
| **Validation** | `tests/lung-anatomy.test.js` — eighteen segments, ten right and eight left, each inside its own lobe; `tests/organ-anatomy-scenes.test.js` — every named structure resolves to at least one mesh. |

### 3. The right main bronchus is the one an inhaled object goes down

| | |
| --- | --- |
| **Claim** | The right main bronchus is shorter, wider and more steeply set than the left. |
| **Source** | Standard gross anatomy; the fact behind right-sided aspiration. |
| **Implementation** | The carina sits right of the midline and the two main bronchi are drawn to the two hila from it. |
| **Assumption** | **The ordering is the claim; the magnitude is not.** The ratio comes out near 1 : 1.13 where life is nearer 1 : 2, because both lungs are placed symmetrically and no heart displaces the left hilum. |
| **Validation** | `tests/lung-anatomy.test.js` asserts the ordering. `docs/medical-notes.md` records the understatement. |

### 4. Veins run between segments; arteries run with the bronchi

| | |
| --- | --- |
| **Claim** | A pulmonary vein tributary marks a segmental boundary; a segmental artery marks a segment's centre. |
| **Source** | Standard gross anatomy, and the reason segmental resection is possible. |
| **Implementation** | Each tributary starts at the midpoint between two neighbouring segments and runs to the vein draining that part of the lung; each artery runs to a segment's own site. |
| **Assumption** | The tributaries have no individual names, so the scene groups a lobe's tributaries into one named structure rather than inventing names for them. |
| **Validation** | `tests/lung-anatomy.test.js`; the grouping is checked in `tests/organ-anatomy-scenes.test.js` by the tree-to-structure correspondence. |

### 5. Selection, the tree and the card name one thing

| | |
| --- | --- |
| **Claim** | The structure under the pointer, the highlighted row and the name on the card are the same structure. |
| **Source** | Interface requirement, stated in `src/app/anatomyContract.js`. |
| **Implementation** | One id per structure, opaque outside the scene; the tree is built from the same descriptors the selection is reported from. Hidden and faded meshes are removed from the pick candidates. |
| **Assumption** | None beyond the contract. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` runs `anatomyContractProblems()` against the real organ; `npm run verify:anatomy -- --scene lung-anatomy` drives it in a browser. |
