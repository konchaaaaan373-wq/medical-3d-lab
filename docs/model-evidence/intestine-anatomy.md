# Model evidence — Interactive intestinal anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the large bowel: caecum, ascending colon,
  right colic (hepatic) flexure, transverse colon, left colic (splenic)
  flexure, descending colon, sigmoid colon — and the relations that make the
  splenic flexure higher and sharper than the hepatic.
- The reason the transverse and sigmoid colon are the mobile parts: each has a
  mesentery of its own.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Seven named parts of one frame

| | |
| --- | --- |
| **Claim** | The colon divides into the parts above, in that order, around the abdomen. |
| **Source** | Standard gross anatomy; the control points of `COLON_PATH`, each of which is a named place. |
| **Implementation** | `colonParts.js` measures where each landmark falls along the path and cuts there. A flexure takes a short span about its corner; the parts either side run up to it. |
| **Assumption** | A flexure is a bend rather than a segment, and is offered as selectable so a reader can point at it. Splitting at the midpoints between landmarks instead gave the splenic flexure a sixth of the colon. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the anatomy contract against the real builder. `tests/organ-anatomy.test.js` holds ascending-on-the-right and descending-on-the-left. |

### 2. Landmarks are measured, not assumed

| | |
| --- | --- |
| **Claim** | Each named corner is at the fraction of the path this scene says it is. |
| **Source** | Not anatomy — arithmetic, and the reason it is written down. |
| **Implementation** | `nearestU()` searches the curve for the point closest to each control point. |
| **Assumption** | None. A Catmull-Rom curve does not place its control points at even fractions of its own arc length, so index over count is not a position. |
| **Validation** | The measured fractions are what the parts are built from; a wrong one shows as a part covering the wrong stretch, which the contract test and the browser check both surface. |

### 3. The small bowel is one structure

| | |
| --- | --- |
| **Claim** | This model has no boundary between jejunum and ileum to select. |
| **Source** | The anatomy: the two differ gradually in wall, calibre and mesentery, and no line separates them. |
| **Implementation** | One coil, one structure, with a note in both languages saying why. |
| **Assumption** | Loop count, length and arrangement are illustrative. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` checks that every structure carries its description in both languages, and the intestinal part names all sit under the colon. |

### 4. What is absent is said to be absent

| | |
| --- | --- |
| **Claim** | There is no appendix, ileocaecal valve, rectum, anal canal, mesentery or taenia coli in this model. |
| **Source** | The model itself. |
| **Implementation** | Nothing is drawn for them and nothing is named for them. Where the caecum ends is marked as schematic on the structure, because no ileum is drawn arriving to measure the junction from. |
| **Assumption** | None. |
| **Validation** | The absences are in the model card and in the scene's own copy; the copy is checked for both languages by the contract test. |
