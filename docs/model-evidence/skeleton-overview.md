# Model evidence — The skeleton, whole

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- The standard division of the skeleton into an **axial** part — skull,
  vertebral column, ribs and sternum — and an **appendicular** part: the limbs
  and the two girdles that attach them.
- That the **sternoclavicular joint is the only articulation between the upper
  limb and the axial skeleton**, and that the scapula articulates with the
  clavicle alone, being otherwise held against the thoracic wall by muscle.
- That the **pelvic girdle is attached to the axial skeleton at the sacroiliac
  joints**, which are strong, nearly immobile and continuous with the column,
  and closed in front at the pubic symphysis.
- That there are **twelve pairs of ribs**, of which the upper seven reach the
  sternum directly, the next three through cartilage, and the last two not at
  all.
- The conventional segment counts: seven cervical, twelve thoracic and five
  lumbar vertebrae; twenty-seven bones in a hand and twenty-six in a foot; about
  two hundred and six in an adult skeleton.
- Standard adult body proportions for the relative heights of the shoulder,
  elbow, wrist, hip, knee and ankle.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. One continuous column

| | |
| --- | --- |
| **Claim** | Skull, cervical, thoracic and lumbar spine and sacrum run continuously from top to bottom, with the ribs and sternum built on the middle of it. |
| **Source** | Standard gross anatomy; the axial skeleton is one structure named in parts. |
| **Implementation** | `spineAt(y)` is the curve of the column and the three named lengths, the sacrum and every rib are placed against it (`docs/architecture-rules.md` rule 1). |
| **Assumption** | The vertebrae are not drawn individually at all — the column is three smooth cords. A vertebra is `spine-anatomy`'s subject, not this scene's. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the four lengths stack in order from the skull to the sacrum, each meeting the next within a small tolerance and none overlapping. |

### 2. An arm is attached at one small joint

| | |
| --- | --- |
| **Claim** | The clavicle reaches the sternum; the scapula touches no other bone. |
| **Source** | Standard gross anatomy. It is the reason the shoulder has the range it has and fails the way it does. |
| **Implementation** | `STERNOCLAVICULAR` is written down as a point and the clavicle is built from it out to the shoulder; the scapula is placed on the back of the cage, clear of the ribs and the clavicle both. |
| **Assumption** | The joints at each end of the clavicle are not drawn, and the muscle that holds the scapula is not drawn — the claim is the absence of a bony contact, which is checked as an absence. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the clavicle reaches the sternum, and the scapula's bounding box intersects no other structure's. |

### 3. A leg is locked into the spine

| | |
| --- | --- |
| **Claim** | The hip bone reaches the sacrum on both sides, and the sacrum is part of the column. |
| **Source** | Standard gross anatomy; the contrast with the shoulder is the point. |
| **Implementation** | Each hip bone is placed so that its medial edge reaches the sacrum, which is itself built on `spineAt`. |
| **Assumption** | The sacroiliac joint is not drawn as a joint, and the hip bone is one blade with no acetabulum and no obturator foramen. `pelvic-floor-anatomy` and `hip-anatomy` are where a pelvis is looked at. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — both hip bones reach the sacrum, and the sacrum is continuous with the lumbar spine. |

### 4. A cage that is open below

| | |
| --- | --- |
| **Claim** | Twelve pairs of ribs from the thoracic spine forward; the upper ones reach the sternum and the lower ones do not. |
| **Source** | Standard gross anatomy; it is why a chest can change shape. |
| **Implementation** | Twelve curves a side, generated from the same spine curve, with the front end pulled back on the lower ones. |
| **Assumption** | Plain hoops: no heads, necks, angles or costal cartilages, and the distinction between true, false and floating ribs is described in the copy rather than drawn as three kinds. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — there are twelve a side, all start at the column, the topmost reaches the sternum and the lowest stops well short of it. |

### 5. It says what it is not

| | |
| --- | --- |
| **Claim** | *Not* an anatomical claim. Every structure's note says this is an overview and names the scene that models that region. |
| **Source** | This project's rule that a model may not claim more than it is. A skeleton drawn as cylinders looks authoritative about bones, and it is not. |
| **Implementation** | The copy's `overview()` helper writes the same sentence into every structure, with the scene to go to instead. |
| **Assumption** | None — this is the assumption, stated. |
| **Validation** | `tests/model-profiles.test.js` and the catalogue tests keep the scene's declared mechanism level at `none`; the disclaimer and the model card say the same thing. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ. |
| **Implementation** | The slider fades the limbs rather than detaching them; the two girdles fade last because they are the join; and the close views hide the other limb by tag rather than pulling a girdle away from the trunk. |
| **Assumption** | A reader who touches nothing sees a whole skeleton standing, which is correct and is the frame the scene's question is asked in. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
