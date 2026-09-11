# Model evidence — Interactive splenic anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the spleen: an elongated organ convex
  against the diaphragm and concave on its visceral surface, with the hilum on
  that concave face and notches on the superior border.
- That the splenic artery divides into **superior and inferior terminal
  branches** before reaching the hilum, and that those branches supply
  territories with little collateral crossing between them — the basis of
  partial splenectomy and of segmental splenic infarction.
- That the splenic vein leaves the hilum and joins the superior mesenteric vein
  to form the portal vein.
- That the tail of the pancreas reaches the splenic hilum.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The organ is two arterial territories

| | |
| --- | --- |
| **Claim** | The parenchyma divides into a superior and an inferior segment, each supplied by one terminal branch, with little crossing between them. |
| **Source** | Standard gross and surgical anatomy; the reason partial splenectomy is possible. |
| **Implementation** | `spleenParts.js` cuts the spleen's own shape — read from `spleen.js` rather than approximated a second time — at a transverse plane through the hilum. |
| **Assumption** | **The plane is flat and a real one is not**, and it is not in the same place in two people. Two segments is the usual number; three and four occur. The copy says all of this on the structures themselves. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the two segments partition the organ, and the superior one is above the inferior one. |

### 2. The artery divides before the hilum

| | |
| --- | --- |
| **Claim** | The division that makes the segments happens outside the organ, so each branch enters the hilum as its own vessel. |
| **Source** | Standard gross anatomy; it is what makes the territories separable at all. |
| **Implementation** | The artery's curve ends at a division point placed lateral to the hilum the spleen declares; two branches run from there, one to each segment's half of the organ. |
| **Assumption** | The artery is drawn without its characteristic tortuosity, and its short gastric and left gastroepiploic branches are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the division point is outside the parenchyma, and each branch ends inside the segment it is named for. |

### 3. The hilum is on the visceral (medial) surface

| | |
| --- | --- |
| **Claim** | The vessels meet the organ on the concave face that looks towards the stomach and the left kidney, not on the diaphragmatic surface. |
| **Source** | Standard gross anatomy. Drawn the other way round, the organ presents its hilum to the ribs. |
| **Implementation** | `spleen.js` exports `SPLEEN_HILUM`, derived from its own medial axis, and this builder places every vessel from it rather than from a second copy of the position. |
| **Assumption** | The hilum is a groove rather than a set of separate vascular foramina. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — every vessel meets the organ on the medial side. |

### 4. The pancreatic tail reaches the hilum

| | |
| --- | --- |
| **Claim** | The tail of the pancreas comes up to the splenic hilum, which is why a splenectomy can injure a pancreas. |
| **Source** | Standard gross anatomy; a recognised complication. |
| **Implementation** | A short tapering tube ending near the hilum, tagged as context and excluded from the scene's framing subject. |
| **Assumption** | Only the tail is drawn. The gland it belongs to is `pancreas-anatomy`, and the two are not placed in one body here. |
| **Validation** | Tagged `neighbour`; `tests/organ-anatomy-scenes.test.js` checks that the scene's subject bounds exclude it. |
