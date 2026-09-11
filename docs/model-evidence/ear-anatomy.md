# Model evidence — Interactive ear anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the ear in three parts: an **outer ear** of auricle
  and external auditory canal ending at the tympanic membrane; a **middle ear**
  air space crossed by malleus, incus and stapes and ventilated by the
  Eustachian tube; and an **inner ear** of cochlea, vestibule and three
  semicircular canals, drained of signal by the vestibulocochlear nerve.
- That the external auditory canal is not straight, and that the tympanic
  membrane is drawn inwards at its centre — the **umbo** — by the handle of the
  malleus attached along it.
- That the ossicular chain runs malleus → incus → stapes, and that the
  **footplate of the stapes occupies the oval window**, so the middle ear works
  as a lever and an area ratio rather than by contact with fluid.
- That the **Eustachian tube** runs anteriorly, inferiorly and medially from the
  middle ear to the nasopharynx and is its only source of air.
- That the cochlea makes about **two and a half turns**, and that position along
  that spiral corresponds to frequency.
- That the three semicircular canals lie in **three approximately orthogonal
  planes**.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. It is one chain, in one order

| | |
| --- | --- |
| **Claim** | Auricle, canal, drum, air space, vestibule, nerve — each deeper than the last. |
| **Source** | Standard gross anatomy; it is what an ear *is*. |
| **Implementation** | Everything is placed along one axis, with each structure's side derived from a single `MEDIAL` constant. |
| **Assumption** | The route is drawn straight enough to read; the real course is not a straight line, and the temporal bone that contains all of it is not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the six steps of the route lie in order going inwards. |

### 2. The drum is pulled inwards, and the canal ends on it

| | |
| --- | --- |
| **Claim** | The tympanic membrane is a shallow cone whose apex is its most medial point, and the canal ends at its rim. |
| **Source** | Standard gross anatomy; the umbo is the landmark the rest of the drum is described from. |
| **Implementation** | The drum is a shell of revolution turned so that its closed pole faces medially, and `SITES.umbo` is that pole. |
| **Assumption** | One even cone: the layers, the pars tensa and flaccida, and the vessels on it are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the canal ends at the drum, and the umbo is within a small tolerance of the drum's most medial extent. |

### 3. Three bones, in order, and one window

| | |
| --- | --- |
| **Claim** | Malleus meets incus meets stapes; the malleus does not reach the stapes; and only the stapes is in the oval window. |
| **Source** | Standard gross anatomy. The chain is a lever, and a lever needs three links in order. |
| **Implementation** | Each ossicle is drawn between points on the previous one and the next, with the stapes ending at `SITES.ovalWindow`. |
| **Assumption** | **The whole middle ear is drawn far larger than life** (`DEEP_EAR_VISUAL_SCALE`), stated on every middle- and inner-ear structure, in the model card and in the disclaimer. The ossicular muscles and the joints between the bones are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three meet in order, the malleus does not reach the stapes, only the stapes reaches the window, and all three cross the air space. |

### 4. One tube, one supply of air

| | |
| --- | --- |
| **Claim** | The Eustachian tube leaves the cavity forwards, downwards and towards the midline. |
| **Source** | Standard gross anatomy; it is the whole of why a throat and an ear are connected. |
| **Implementation** | Its curve starts at `SITES.eustachianOrigin` and runs in all three of those directions at once. |
| **Assumption** | Only the part near the ear is drawn; its opening into the pharynx is outside the scene, and it neither opens nor closes. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the tube reaches below, in front of and medial to the cavity. |

### 5. A spiral, and three planes

| | |
| --- | --- |
| **Claim** | The cochlea is a coil rather than a tube, and the three canals lie in three different planes. |
| **Source** | Standard gross anatomy: about two and a half turns, and three approximately orthogonal canals. |
| **Implementation** | The cochlea is a tapering helix of 2.5 turns; each canal is a loop built about its own axis, and the three axes are the three coordinate axes. |
| **Assumption** | The turn count is a fact about cochleas; **the size is not**. The ampullae, the scalae and the organ of Corti are not drawn, and the canals are drawn orthogonal where real ones are only approximately so. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the cochlea's bounding box is a coil in two directions, and the three canal meshes are each thinnest along a different axis. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. The ossicles are small and stay small. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | Three viewpoints in the order sound takes, each hiding what is lateral to it by tag and bringing the camera closer; the drum and canal are part-transparent at rest so the chain can be followed through them. |
| **Assumption** | A reader who touches nothing sees a whole ear from outside, which is correct and is not what the scene is about. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
