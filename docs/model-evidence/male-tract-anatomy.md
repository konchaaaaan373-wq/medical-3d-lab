# Model evidence — The male genital tract, end to end

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross-anatomy accounts of the male genital tract: testis, epididymis
  (head, body, tail) on its posterior border, vas deferens through the inguinal
  canal and behind the bladder, joining the seminal vesicle to form the
  ejaculatory duct, which opens on the verumontanum in the prostatic urethra.
- That the urethra is described in three parts — prostatic, membranous, spongy —
  and that the membranous part is the shortest, narrowest and least mobile.
- That the spongy urethra runs within the corpus spongiosum, and that the two
  corpora cavernosa carry no urethra.
- That the vas is the only part of the route reachable through the scrotal skin.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. It is one continuous route, in one order

| | |
| --- | --- |
| **Claim** | Testis → epididymis → vas → ejaculatory duct → prostatic → membranous → spongy urethra. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Each segment's curve begins at the point the previous one ends, read from that curve. Nothing in the chain is a coordinate typed twice, so a segment cannot be moved without moving what joins it. |
| **Assumption** | Drawn as a route rather than as organs that happen to be near each other; the seminal vesicle joins it from the side rather than in line. |
| **Validation** | `tests/organ-parts-anatomy.test.js` walks `route` and checks every consecutive pair meets. |

### 2. The epididymis is on the back of the testis

| | |
| --- | --- |
| **Claim** | Head at the upper pole, body down the posterior border, tail at the lower pole where it becomes the vas. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Its path is placed from `TESTIS_SITE` rather than beside it, so the two move together. |
| **Assumption** | **One tube of three named lengths.** Inside it is a single coiled duct several metres long, which is not modelled; head, body and tail are not separately selectable, and the copy says so. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the epididymis lies posterior to the testis and spans it. |

### 3. The vas is long, and it is drawn short

| | |
| --- | --- |
| **Claim** | *Not* made. The vas here is far shorter and straighter than a real one. |
| **Source** | A real vas is about 45 cm, most of it out of any diagram's frame. |
| **Implementation** | A curve with the shape of the course — up from the scrotum, over the pubic bone, down behind the bladder — and none of its length. |
| **Assumption** | Recorded on the structure in both languages, in the model card and in the disclaimer. What is claimed is the course, not the length. |
| **Validation** | The note is held in both languages by `tests/organ-anatomy-scenes.test.js`. |

### 4. The two routes meet inside a gland

| | |
| --- | --- |
| **Claim** | The ejaculatory duct opens inside the prostate, so everything downstream of that point is shared with the urinary route. |
| **Source** | Standard gross anatomy. |
| **Implementation** | The ejaculatory duct's curve ends at the verumontanum, inside the prostate mesh; the prostate is drawn translucent and fades further on the slider, so the meeting can be seen without moving either. |
| **Assumption** | The prostate here is one undivided gland. Its zones are `prostate-anatomy`. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the ejaculatory duct's end lies inside the prostate's bounds, and the prostatic urethra begins above it and ends below it. |

### 5. The membranous urethra is the narrow one

| | |
| --- | --- |
| **Claim** | The shortest and narrowest of the three lengths, and the least mobile. |
| **Source** | Standard gross anatomy; the reason a catheter meets resistance there and the part that tears in a pelvic fracture. |
| **Implementation** | Drawn with the smallest calibre and the shortest run of the three. |
| **Assumption** | The external sphincter around it is not drawn, so "least mobile" is stated rather than shown. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — it is the shortest of the three urethral segments. |
