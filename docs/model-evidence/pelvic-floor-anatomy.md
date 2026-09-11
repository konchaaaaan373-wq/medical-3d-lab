# Model evidence — Interactive pelvic floor anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the levator ani: a sheet arising from the back of
  the **pubis**, from the **tendinous arch** on the obturator internus, and from
  the **ischial spine**, inserting into the perineal body, the anococcygeal
  raphe and the coccyx — conventionally named in parts front to back
  (pubococcygeus, iliococcygeus) with the **coccygeus** completing the floor
  behind.
- That the two sides **do not meet anteriorly**: the gap between them is the
  **urogenital hiatus**, which transmits the urethra and the vagina.
- That the **puborectalis** is a sling passing **behind** the anorectal
  junction, and that the forward angulation it produces is the principal
  mechanism of faecal continence — more so than the external sphincter below it.
- That the **perineal body** lies between the vagina in front and the anal canal
  behind and is the point of convergence of the perineal structures.
- That the **perineal membrane** is a separate sheet below the levator across
  the anterior half of the outlet.
- That the anal canal passes through the floor **behind** the urogenital hiatus,
  through its own gap.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. One sheet, named in three

| | |
| --- | --- |
| **Claim** | The named parts of the levator are slices of one sheet stretched between one origin line and one insertion line. |
| **Source** | Standard gross anatomy; the divisions are conventional names for regions of a continuous muscle. |
| **Implementation** | `levatorOrigin(t)` and `levatorInsertion(t)` are those two lines, and every slice — and the tendinous arch — is built from them (`docs/architecture-rules.md` rule 1). |
| **Assumption** | Smooth slices at one thickness with a sag; the subdivisions within pubococcygeus are not separated, and **nothing contracts**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three slices run front to back in order without overlapping, and the tendinous arch lies along the origin line all three hang from. |

### 2. The gap is real

| | |
| --- | --- |
| **Claim** | The two sides of the sheet stop short of the midline in front; the urethra and the vagina pass through the gap; the bowel does not. |
| **Source** | Standard gross anatomy. It is the structural fact the whole region's vulnerability follows from. |
| **Implementation** | `levatorInsertion` keeps the medial edge off the midline until `HIATUS_BACK_T`, and the hiatus is drawn as the space between those two edges. The urethra and vagina are placed inside it; the anal canal is placed behind it. |
| **Assumption** | A real gap, not a display one. Its shape is smooth where a real hiatus is bounded by the fascia and the muscle edges together, and the fascia is not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the urethra and the vagina lie inside the hiatus in both width and depth, the anal canal lies wholly behind it, and the sheet's two sides are separated in front and meet behind. |

### 3. A sling, not a ring

| | |
| --- | --- |
| **Claim** | The puborectalis passes behind the anorectal junction, and the angle it makes is what holds. |
| **Source** | Standard gross anatomy and the standard account of continence: the sling above does more than the sphincter below. |
| **Implementation** | One strap from the back of one pubis, round behind `SITES.anorectalJunction`, and back to the other. The anal canal is angled forwards where it passes. |
| **Assumption** | **The angle is drawn at one fixed value and is not a measurement**, because nothing here contracts. Stated on the structure, in the model card and in the disclaimer. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the sling's most posterior point is behind the anal canal, it reaches the pubis on both sides, and it lies above the external sphincter. |

### 4. A knot between the two

| | |
| --- | --- |
| **Claim** | The perineal body lies between the vagina in front and the anal canal behind. |
| **Source** | Standard gross anatomy; it is why a tear there is described the way it is. |
| **Implementation** | Placed at `SITES.perinealBody`, between the two. |
| **Assumption** | One small mass; what attaches to it is described and not drawn as attachments. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — it lies behind the vagina and in front of the anal canal, and below the floor. |

### 5. The bones are a frame

| | |
| --- | --- |
| **Claim** | *Not* a claim about bones. They are drawn as the ring the floor spans. |
| **Source** | This project's rule: say what the model is and is not. A pelvis drawn to support a floor is not a pelvis drawn to be a pelvis. |
| **Implementation** | The brim and the rami as tubes, merged into one structure; the sacrum and coccyx as smooth wedges. |
| **Assumption** | Stated on the structure, in the model card and in the disclaimer: **no wing, no acetabulum, no obturator foramen**, and no bone dimension is a measurement. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the ring surrounds the floor, and the floor's origin line lies inside it. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ. |
| **Implementation** | The slider fades the bone, which is what a reader is looking through; the viewpoints go above and below the floor rather than opening it; and the close views hide the sheet by tag to show the sling behind it. |
| **Assumption** | A reader who touches nothing sees the floor inside its ring, which is correct and is where the subject is. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
