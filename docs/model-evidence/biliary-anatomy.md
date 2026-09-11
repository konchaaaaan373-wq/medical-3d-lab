# Model evidence — Interactive biliary anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the extrahepatic biliary tree: right and
  left hepatic ducts joining at the porta hepatis to form the common hepatic
  duct; the cystic duct joining it to form the common bile duct; the common bile
  duct descending to the second part of the duodenum and opening, with the main
  pancreatic duct, at the major duodenal papilla.
- That the gallbladder's fundus projects beyond the inferior border of the
  liver, and that its neck is its narrowest part.
- That the cystic duct is the gallbladder's only way in and out.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The order of the junctions

| | |
| --- | --- |
| **Claim** | Hepatic ducts → common hepatic duct → (cystic duct joins) → common bile duct → papilla. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Three points are named once — the confluence, the cystic junction and the papilla — and every duct's curve begins or ends at one of them. A duct cannot join in the wrong order without moving a point two ducts share. |
| **Assumption** | Calibres, lengths and angles are chosen to be legible; none is a measurement. The well-known variations in where the cystic duct inserts, and in how the hepatic ducts join, are drawn one way only. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each duct reaches the junction it is supposed to, and the downstream ducts are below the upstream ones. |

### 2. What that order means clinically

| | |
| --- | --- |
| **Claim** | An obstruction in the cystic duct blocks the gallbladder alone; one in the common bile duct blocks the liver as well. |
| **Source** | Standard clinical teaching, and a direct consequence of the geometry above. |
| **Implementation** | Stated in the copy on the two ducts, in both languages, with no threshold, no treatment and no named disease beyond the mechanism. |
| **Assumption** | Nothing is obstructed in this model and nothing flows. The scene says what the arrangement implies; it does not simulate it. |
| **Validation** | `tests/disease-explanations.test.js`'s register rules do not cover this scene (it is not a disease scene); the model card and the scene disclaimer carry the limit instead. |

### 3. The common bile duct is drawn in front of what it passes behind

| | |
| --- | --- |
| **Claim** | *Not* made. In life the duct passes behind the first part of the duodenum and through the head of the pancreas. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Here it runs in front of both, because a duct hidden inside another organ cannot be pointed at — and being able to point at it is what this scene is. |
| **Assumption** | This is the largest single departure in the model. It is recorded in the model card, in the scene's disclaimer and on the structure itself, in both languages. |
| **Validation** | The note is held in both languages by `tests/organ-anatomy-scenes.test.js`. |

### 4. Both ducts open at one papilla

| | |
| --- | --- |
| **Claim** | The common bile duct and the main pancreatic duct arrive at the same opening into the duodenum. |
| **Source** | Standard gross anatomy; the reason a stone at that opening can inflame a pancreas. |
| **Implementation** | Both curves end at the single `PAPILLA` point, and the shared duodenal loop is *placed from* that point — offset by the loop's own radius so the marker lands on the wall rather than in the lumen. |
| **Assumption** | The common channel, the sphincter of Oddi and the several patterns in which the two ducts join are not modelled. The minor papilla is not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — both ducts end at the papilla, and the papilla is on the surface of the duodenum rather than inside it. |
