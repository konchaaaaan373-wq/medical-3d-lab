# Model evidence — Interactive uterine anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the uterus: fundus above the entry of the
  tubes, body, isthmus, cervix projecting into the vagina.
- That the uterine cavity is a **flattened triangular** space, its upper angles
  at the tubal ostia and its lower angle at the internal os — the shape a
  hysterosalpingogram outlines and an intrauterine device sits in.
- That the fallopian tube is narrow at its uterine end, widest in the ampulla,
  and open at the infundibulum; and that fertilisation and ectopic implantation
  occur in the wide part.
- That the ovary is not continuous with the tube: the ovum crosses a peritoneal
  gap to enter it.
- That the isthmus becomes the lower uterine segment in pregnancy.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Four named stretches of one wall

| | |
| --- | --- |
| **Claim** | Fundus, body, isthmus and cervix are parts of one organ, in that order from the top. |
| **Source** | Standard gross anatomy. |
| **Implementation** | `carveNamedParts` cuts one pear-shaped warp with horizontal planes, so the parts are cut from the organ rather than drawn as four organs. |
| **Assumption** | The divisions are sharper than the transitions are. The waist above the cervix is exaggerated so the isthmus is visible at all. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the four run in order top to bottom, and the cervix is the narrowest. |

### 2. The cavity is a triangle with three named corners

| | |
| --- | --- |
| **Claim** | Two upper corners are the tubal ostia; the lower corner is the internal os. |
| **Source** | Standard gross anatomy; the shape every intrauterine procedure is read against. |
| **Implementation** | `CAVITY_CORNERS` names the three points once. The patch is the triangle between them, each tube begins at its own corner, and the cervical canal begins at the third — so a tube cannot open somewhere other than a corner of the cavity. |
| **Assumption** | **The patch has no thickness.** It is a region, not a solid, and the endometrium lining it is not drawn as tissue. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each corner is on the wall, each tube starts at its own corner, and the canal starts at the lower one. |

### 3. The tube is narrow, then wide, then open

| | |
| --- | --- |
| **Claim** | The calibre is not constant, and the wide part is where fertilisation and ectopic implantation happen. |
| **Source** | Standard gross anatomy and clinical teaching. |
| **Implementation** | One calibre function per tube: a narrow base, a Gaussian bulge in the middle, and a flare at the far end. |
| **Assumption** | Drawn as one structure. The four named lengths and the fimbriae are not separately selectable, and the copy says so. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each tube is widest between its ends. |

### 4. The ovary is not joined to the tube

| | |
| --- | --- |
| **Claim** | There is a gap, and the gap is why an egg can end up outside the tube. |
| **Source** | Standard gross anatomy. |
| **Implementation** | The ovary is placed beyond the tube's open end, and the two meshes do not touch. Drawing them joined would be the easier picture and the wrong one. |
| **Assumption** | The fimbriae that partly close that gap in life are not drawn, so the gap here is wider than it reads in an atlas. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each ovary's bounding box is clear of its tube's. |

### 5. Drawn upright

| | |
| --- | --- |
| **Claim** | *Not* made. A uterus normally lies anteverted and anteflexed. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Drawn straight up, because a tilted organ makes "above" and "below" ambiguous and this scene is about which part is which. |
| **Assumption** | Recorded in the model card and in the scene's disclaimer, in both languages. |
| **Validation** | The scene's disclaimer carries it; the prohibited-use list includes planning any procedure. |
