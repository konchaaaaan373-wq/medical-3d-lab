# Model evidence — Interactive breast anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the breast: fifteen to twenty **lobes**, each drained
  by a **lactiferous duct** opening at the nipple, with **terminal duct lobular
  units** at the periphery of each duct system.
- That the breast lies on the pectoral fascia over **pectoralis major**, separated
  from it by a retromammary plane, and that it is suspended by the **suspensory
  (Cooper's) ligaments** running from the deep fascia through the gland to the
  dermis.
- That the gland extends superolaterally as the **axillary tail**.
- That the majority of lymph from the breast drains to the **axillary nodes**,
  with a smaller share to the internal mammary chain.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Every duct ends at one place

| | |
| --- | --- |
| **Claim** | All the duct systems converge on the nipple; the lobules are at the far end of them. |
| **Source** | Standard anatomy. It is why a nipple discharge is a duct's news, and it is half of the ductal/lobular division the subject is built on. |
| **Implementation** | Each duct's curve begins at the nipple site and runs outward; each lobule is placed from that duct's far tip, so the tree cannot be assembled the other way round. |
| **Assumption** | **Eight systems and two lobules each are display counts** (`DISPLAY_COUNTS`), stated on both structures, in the card and in the disclaimer. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — every duct mesh is within a small distance of the nipple, every lobule is far from it, and the lobules sit deeper than the ducts' near ends. |

### 2. It sits on the muscle, not in it

| | |
| --- | --- |
| **Claim** | Skin outside, fat under it, gland in the fat, muscle behind all of it — and nothing glandular inside the muscle. |
| **Source** | Standard anatomy; it is what "does it move with the chest wall" is asking about. |
| **Implementation** | The dome's back is flattened rather than left spherical: a spherical dome reached through the pectoral sheet behind it, which would have made that question unanswerable. |
| **Assumption** | The retromammary space itself is not drawn, and the ribs and deeper muscles are outside the scene. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — skin outside fat, lobules inside fat, the muscle behind the gland, and the lobules in front of the muscle. |

### 3. The ligaments reach the skin

| | |
| --- | --- |
| **Claim** | Cooper's ligaments run from the chest-wall side, through the gland, to the skin. |
| **Source** | Standard anatomy; it is why tethering one dimples the surface. |
| **Implementation** | Each strand's curve starts behind the gland and ends at the skin's radius. |
| **Assumption** | Seven strands stand for a network, and the copy says so. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — their combined bounds reach out to the skin and back past the origin plane. |

### 4. Most of it drains to the armpit

| | |
| --- | --- |
| **Claim** | The gland runs out as a tail towards the axilla, and the node group is beyond it. |
| **Source** | Standard anatomy; it is why the axilla is examined whenever a breast is. |
| **Implementation** | The tail is warped out of the same dome as the rest of the gland rather than added beside it, so it is breast tissue in the axilla and not a lump next to one. The node markers sit beyond its far end. |
| **Assumption** | The internal mammary route is not drawn, and the node markers are markers — `lymph-node-anatomy` is the node at its own scale. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the tail's centre is on the lateral side and its top is above the midline of the gland, and the nodes lie beyond it and above the gland's centre. |

### 5. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The slider fades skin and fat; the ducts view hides the surface and the ligaments by tag; the lateral view is a viewpoint, not a rearrangement. |
| **Assumption** | A reader who touches nothing sees a breast from outside, which is correct and is not what the scene is about. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
