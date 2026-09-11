# Model evidence — Interactive bladder anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the urinary bladder: apex pointing towards
  the pubic symphysis, body between apex and neck, fundus (base) facing
  backwards and down, neck funnelling into the urethra.
- That the **trigone** is a triangular area of the internal surface of the base,
  bounded by the two ureteric orifices and the internal urethral orifice, which
  stays smooth while the rest of the lining folds because it is adherent to the
  muscle beneath it, and that it differs in embryological origin from the rest
  of the lining.
- That the ureters pass obliquely through the bladder wall, and that this
  obliquity is what prevents reflux when the bladder contracts.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Four named stretches of one wall

| | |
| --- | --- |
| **Claim** | Apex, body, fundus and neck are parts of one continuous wall, and the base is the posterior one. |
| **Source** | Standard gross anatomy. |
| **Implementation** | `bladderParts.js` cuts the bladder shape `kidney.js` exports — the same one the urinary-tract scene draws — with horizontal planes for apex and neck and a coronal plane separating body from fundus. |
| **Assumption** | The divisions are sharper than any real transition, and the neck's funnel is gentler here than in life. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the four partition the organ, apex above body above neck, and the fundus behind the body. |

### 2. The trigone is bounded by the three openings

| | |
| --- | --- |
| **Claim** | The trigone's two upper corners are the ureteric orifices and its lower corner is the internal urethral orifice. |
| **Source** | Standard gross anatomy; it is how a cystoscopist orients inside the bladder. |
| **Implementation** | `TRIGONE_CORNERS` names the three points once. The patch is the triangle between them, and each orifice marker and each tube that arrives or leaves is placed from the same three values — so an orifice cannot drift away from the corner it is. |
| **Assumption** | **The patch has no thickness.** It is a region of lining, not a solid, and the mucosal folds it is smooth by contrast with are not drawn either. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each orifice is at a corner of the patch, on the inner surface of the base, and each ureter ends at its own orifice. |

### 3. The trigone cannot be seen from outside

| | |
| --- | --- |
| **Claim** | Nothing about the outside of a bladder tells you where the trigone is. |
| **Source** | It is an internal surface. |
| **Implementation** | The scene opens on an anterior view that deliberately does not look at it; the slider fades the wall, and every structure on the inside names the posterior viewpoint as the one it prefers. |
| **Assumption** | Fading is the whole mechanism — the wall is never removed, because a trigone floating without the base it is on says nothing. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the anatomy contract, including that hidden meshes leave the pick candidates. |

### 4. The ureters enter obliquely, and that is described rather than drawn

| | |
| --- | --- |
| **Claim** | The last of each ureter's course runs obliquely through the wall, and that obliquity is what stops reflux. |
| **Source** | Standard gross anatomy; the mechanism behind vesicoureteric reflux. |
| **Implementation** | Not modelled. Each ureter meets the wall at its orifice and stops. |
| **Assumption** | Stated in the copy on both ureteric orifices, in both languages, as something described and not shown. |
| **Validation** | The note is held in both languages by `tests/organ-anatomy-scenes.test.js`. |
