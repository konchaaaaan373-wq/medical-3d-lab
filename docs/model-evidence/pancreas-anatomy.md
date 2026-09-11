# Model evidence — Interactive pancreatic anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the pancreas: head inside the duodenal C,
  neck at the waist in front of the superior mesenteric and portal veins, body
  crossing to the left, tail reaching the splenic hilum.
- The main pancreatic duct running the length of the gland to the head.
- That the islets are of the order of a million, and one to two per cent of the
  gland's mass.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Four named parts of one gland

| | |
| --- | --- |
| **Claim** | Head, neck, body and tail are parts of one gland, and the head is the bulkiest. |
| **Source** | Standard gross anatomy; the calibre profile in `pancreas.js`, written with those parts named against it. |
| **Implementation** | `pancreasParts.js` cuts the same axis at the same calibre. The head reaches to where the calibre has finished falling, the neck spans the waist, the body the bulge, the tail the thinning. |
| **Assumption** | The divisions are sharper than any real transition. Taking plain midpoints between the profile's named stops gave the head a sixth of the gland, which is not what "bulkiest" means. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the anatomy contract against the real builder. |

### 2. The head sits inside the duodenal C

| | |
| --- | --- |
| **Claim** | The pancreatic head lies within the curve of the duodenum. |
| **Source** | Standard gross anatomy; the reason a mass in the head obstructs the bile duct and the duodenum. |
| **Implementation** | The scene draws the shared `buildDuodenum` loop at its own coordinates, which is the same loop the neighbouring hepatobiliary scenes place the head inside. |
| **Assumption** | No common bile duct is drawn through the head, so the obstruction the copy describes cannot be shown, only stated. |
| **Validation** | `tests/organ-anatomy.test.js` covers the shared duodenal placement the two scenes rely on. |

### 3. One duct, running the whole length

| | |
| --- | --- |
| **Claim** | Everything the exocrine gland makes leaves down one duct towards the head. |
| **Source** | Standard gross anatomy. |
| **Implementation** | A thin tube along the same axis the gland is built on, so it is inside the gland by construction rather than by a coordinate that has to be kept in step. |
| **Assumption** | Constant calibre, no side branches, no accessory duct, no ampulla. |
| **Validation** | Shared axis: both the gland's parts and the duct are built from `pancreasPath()`. |

### 4. The islets are an arrangement, not a count

| | |
| --- | --- |
| **Claim** | Endocrine tissue is scattered through the exocrine gland, and what it makes leaves in the blood rather than down the duct. |
| **Source** | Standard histology, stated at the level this model can support. |
| **Implementation** | Fourteen spheres placed pseudo-randomly along the gland from a fixed seed — the same seed and rule `buildPancreas` uses, so the two builders scatter them identically. They are one structure, not fourteen. |
| **Assumption** | Number and size are chosen so they can be seen. A million islets at their real size would be invisible, and this scene says so in both languages on the structure itself. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — one structure, with its note in both languages. |
