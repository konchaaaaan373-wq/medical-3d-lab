# Model evidence — Interactive spine anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the vertebral column: **seven cervical**, **twelve
  thoracic** and **five lumbar** vertebrae above a **sacrum** of five fused
  segments, with a cervical lordosis, a thoracic kyphosis and a lumbar lordosis.
- That a typical vertebra has a **body** in front and a **vertebral arch**
  behind, the arch made of paired **pedicles** and **laminae** meeting at the
  **spinous process**, with paired **facet joints** between adjacent levels.
- That the **intervertebral disc** is an outer **annulus fibrosus** of layered
  fibres around a soft **nucleus pulposus**.
- That the **spinal cord** ends around the first or second lumbar level, below
  which the canal contains the **cauda equina**.
- That paired **nerve roots** leave the canal at each level, passing beneath the
  pedicle of their vertebra.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. One column, three curves

| | |
| --- | --- |
| **Claim** | Neck forward, chest back, low back forward — and it is one curve, not three that happen to line up. |
| **Source** | Standard anatomy. |
| **Implementation** | A single `spineAt(y)` function returns how far forward a level sits, and every vertebra, the sacrum, the canal and the cord are placed from it (`docs/architecture-rules.md` rule 1). |
| **Assumption** | **The degree of each curve is drawn to read and is not measured.** |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the function is sampled at three heights and alternates in sign, and the four regions stack in order with the right counts. |

### 2. One level drawn in full, in its place

| | |
| --- | --- |
| **Claim** | A vertebra has a body in front, two pedicles back to an arch, two laminae closing it, facets on the sides and a spinous process behind. |
| **Source** | Standard anatomy. |
| **Implementation** | Every part of the detailed level is placed from `SEGMENT`, which is derived from that level's own height and size — so the level is where the column puts it, at the size the column gives it. It is **not enlarged and not lifted out**; that level is simply left out of its region's blocks so there is only one of it. |
| **Assumption** | One level stands for all of them; the individual vertebrae of a region are not separately selectable, and the foramina are gaps rather than modelled openings. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — pedicles run back from the body, laminae close the arch behind them, the spinous process is behind those. |

### 3. The disc is two tissues

| | |
| --- | --- |
| **Claim** | A soft nucleus inside a tough ring, sitting below the body rather than inside it. |
| **Source** | Standard anatomy; the difference between the two tissues is the difference between a bulge and a rupture. |
| **Implementation** | Two structures, the nucleus placed inside the annulus, and the disc's height computed from the body's half-height plus the disc's own — its first placement put it inside the body it belongs below. |
| **Assumption** | The layered fibre directions of the annulus are not drawn, and the disc does not change shape. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the annulus's top is at or below the body's bottom, and it contains the nucleus. |

### 4. The cord stops before the column does

| | |
| --- | --- |
| **Claim** | The cord ends partway down and the cauda equina fills the canal below it. |
| **Source** | Standard anatomy; it is why a needle low down is a different proposition from a needle high up. |
| **Implementation** | `CORD_ENDS_AT` is a named height; the cord's points are the canal's points above it and the cauda's are the ones below, so the two cannot overlap or leave a gap. |
| **Assumption** | The exact level varies between people and is not claimed; the filum terminale, the dura and the epidural contents are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the cord stops well above the bottom of the canal, the cauda continues below it and begins where the cord ends, and it is drawn as several strands rather than one. |

### 5. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The detailed level is reached by a viewpoint rather than by enlargement; the canal is see-through at rest; the slider fades bone; "what is in the canal" hides the bone by tag. |
| **Assumption** | A reader who touches nothing sees a whole column, which is correct and is half of what the scene is about. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
