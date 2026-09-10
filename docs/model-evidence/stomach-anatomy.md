# Model evidence — Interactive stomach anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the gastric regions: the fundus as the
  dome above the level of the oesophageal opening, the body, the pyloric antrum
  and canal, and the pyloric sphincter at the outlet.
- The relationship the whole scene turns on: the cardia is where the oesophagus
  opens in, not a length of the greater curvature.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Five named regions, as five walls

| | |
| --- | --- |
| **Claim** | Fundus, cardia, body, pyloric antrum and pyloric canal are separate parts of one stomach. |
| **Source** | Standard gross anatomy; the calibre profile in `stomach.js`, which is written with those regions named against it. |
| **Implementation** | `stomachParts.js` cuts the same path at the same calibre into those lengths, so a part's extent and the calibre it is drawn at cannot come apart. |
| **Assumption** | The parts are full rings of a tube, and the divisions between them are sharper than any real transition. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the anatomy contract, applied to the real builder: every named part resolves to its own mesh and the tree and the model agree. |

### 2. The cardia is where the oesophagus arrives

| | |
| --- | --- |
| **Claim** | The cardia's position is a consequence of where the oesophagus ends, not an independent number. |
| **Source** | The definition of the cardia. |
| **Implementation** | `nearestU()` finds the fraction of the stomach's path closest to the oesophagus's last point, and the cardia is a short span about it. |
| **Assumption** | Drawn as a collar all the way round; the cardia is a region on the lesser-curvature side of the opening and this model cannot show that asymmetry. The copy says so on the structure itself. |
| **Validation** | The derivation is in `stomachParts.js` and is exercised every build; the note is checked as part of the bilingual copy audit in `tests/organ-anatomy-scenes.test.js`. |

### 3. The fundus is a dome above the opening

| | |
| --- | --- |
| **Claim** | The fundus is what lies above the level at which the oesophagus opens. |
| **Source** | Standard gross anatomy; the reason a plain film shows a gastric bubble in the upright position. |
| **Implementation** | The fundus is the stretch of path from the apex down to the cardia, so it stops where the cardia starts by construction. |
| **Assumption** | No gas, no contents and no volume are modelled. |
| **Validation** | `tests/organ-anatomy.test.js` holds the orientation the claim depends on: a fundus high on the patient's left, a pylorus to the right. |

### 4. The sphincter is drawn, not implied

| | |
| --- | --- |
| **Claim** | Gastric emptying is limited by a ring of muscle at the outlet. |
| **Source** | Standard gross anatomy. |
| **Implementation** | A torus at the position `stomach.js` puts it, oriented along the path's tangent there — the same position the peristalsis scene uses. |
| **Assumption** | Its calibre does not change in this scene and no emptying is modelled. |
| **Validation** | Shared position constant `PYLORIC_SPHINCTER_AT`; both builders read it. |
