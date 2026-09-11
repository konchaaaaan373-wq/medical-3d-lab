# Model evidence — Where lymph drains

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard anatomy of lymphatic drainage: the **thoracic duct** arising from the
  cisterna chyli in the abdomen, ascending posterior to the thorax, crossing to
  the left and emptying at the junction of the left subclavian and internal
  jugular veins; and the **right lymphatic duct**, short, emptying at the
  corresponding point on the right.
- That the thoracic duct drains the whole body **except** the right upper limb,
  the right side of the head and neck and the right side of the thorax, which
  drain through the right lymphatic duct.
- That the **cervical**, **axillary** and **inguinal** groups are the superficial
  groups that can be examined, draining head and neck, upper limb and breast,
  and lower limb and perineum respectively.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The asymmetry

| | |
| --- | --- |
| **Claim** | One short duct takes a quarter of the body and one long duct takes the rest. |
| **Source** | Standard anatomy; it decides where anything travelling in lymph turns up. |
| **Implementation** | The thoracic duct is drawn from an abdominal sac to the left venous angle; the right duct is drawn short, on the right, in the upper body. Two representative routes are drawn so the imbalance can be seen rather than only read. |
| **Assumption** | The course varies between people in ways not represented, and the lymphatics drawn are a handful of a dense network. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the thoracic duct's vertical span is more than four times the right duct's, it starts in the abdomen and ends on the left, the right duct stays right and above the waist, and both end at about the same height. |

### 2. The sac at the bottom

| | |
| --- | --- |
| **Claim** | The thoracic duct begins at a sac in the abdomen where drainage from both legs and the gut arrives. |
| **Source** | Standard anatomy. |
| **Implementation** | `SITES.cisternaChyli` is both the sac's position and the duct curve's first point, so the two cannot drift apart. |
| **Assumption** | The lumbar and intestinal trunks that feed it are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the sac is within a small distance of the duct's lower end. |

### 3. Three groups, three heights, both sides

| | |
| --- | --- |
| **Claim** | Neck, armpit and groin, paired about the midline, in that order from top to bottom. |
| **Source** | Standard anatomy: the three superficial groups that are examined. |
| **Implementation** | Each group is built twice, once per side, and registered as one structure with all its beads. |
| **Assumption** | **Each group is a marker, not a model of a node** (`NODE_DISPLAY_SIZE`), stated on each group, in the card and in the disclaimer. The groups anatomy actually names within each region are not distinguished. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each group has beads on both sides of the midline, and the three centres descend in the right order with the axillary groups furthest out. |

### 4. Scale is honest by being split

| | |
| --- | --- |
| **Claim** | *Not* made: this scene says nothing about what is inside a node. |
| **Source** | A node is millimetres; this scene is a person. |
| **Implementation** | Two scenes, each at its own scale, each naming the other. |
| **Assumption** | Told in words rather than shown as a transition between scales. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — each scene answers the anatomy contract on its own. |
