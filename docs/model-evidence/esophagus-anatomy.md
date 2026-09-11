# Model evidence — Interactive oesophageal anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the oesophagus: cervical, thoracic and
  abdominal parts, behind the trachea and then behind the heart, through the
  diaphragm to the cardia.
- The three (or four) **physiological constrictions**: at the cricopharyngeus,
  where the aortic arch and the left main bronchus cross it, and at the
  diaphragmatic hiatus.
- That the abdominal part is short, and that the cervical part is the only
  stretch reachable from the neck.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Three parts, in order, covering one tube

| | |
| --- | --- |
| **Claim** | Cervical, thoracic and abdominal are stretches of one continuous tube. |
| **Source** | Standard gross anatomy. |
| **Implementation** | `tubeParts` over one path, so the parts are cut from the organ rather than drawn as three organs. |
| **Assumption** | Where one stops and the next starts is sharper than the transition is. Lengths are drawn to be legible. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three partition the tube, in order, from end to end. |

### 2. The narrowings are in the calibre, and the rings are on the narrowings

| | |
| --- | --- |
| **Claim** | The tube is narrow in three places, and those places are where objects lodge. |
| **Source** | Standard gross anatomy and clinical teaching. |
| **Implementation** | The calibre profile carries three dips; each ring is placed at its own dip's centre and sized from `calibre(at)`. Neither the dip nor the ring is a number typed beside the other. |
| **Assumption** | **How narrow is not a claim.** The depth of each dip is chosen so three narrowings are visible; no lumen diameter may be read off this. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the calibre at each named constriction is lower than the calibre between them, and each ring sits on the curve at its own fraction. |

### 3. Each one is narrow for a different reason

| | |
| --- | --- |
| **Claim** | A muscle ring at the top; the aortic arch and the left main bronchus in the chest; the diaphragmatic hiatus at the bottom. |
| **Source** | Standard gross anatomy. |
| **Implementation** | The arch is drawn behind and to the patient's left, the bronchus in front, the diaphragm as a ring around the lowest narrowing — so "why is it narrow here" is something to look at. The cricopharyngeus itself is *not* drawn, and the copy says the narrowing there is in the calibre only. |
| **Assumption** | The middle narrowing is drawn as one although it is often counted as two. Both structures that make it are separately selectable. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — at the middle constriction the arch is posterior and the bronchus anterior; the diaphragm ring surrounds the lowest one. |

### 4. No distance from the incisors

| | |
| --- | --- |
| **Claim** | *Not* made, deliberately. |
| **Source** | The figures an endoscopist uses are measurements this model cannot support. |
| **Implementation** | No length appears anywhere in the copy, the legend or the disclaimer, and the disclaimer says so explicitly in both languages. |
| **Assumption** | A reader who wants a distance will have to get it somewhere this model does not pretend to be. |
| **Validation** | The scene's disclaimer and the model card both state it; the prohibited-use list includes planning endoscopy. |
