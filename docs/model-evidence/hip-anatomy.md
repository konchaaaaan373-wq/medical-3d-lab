# Model evidence — Interactive hip anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the hip: a **deep acetabulum** formed where ilium,
  pubis and ischium meet, enclosing more than a hemisphere of the femoral head,
  with the **acetabular labrum** deepening it further — so that the joint is
  stable in a way the glenohumeral joint is not.
- That the **neck of the femur** carries the head medially, superiorly and
  anteriorly away from the shaft, so load is transmitted across it rather than
  along the shaft's axis.
- That **gluteus medius** inserts on the greater trochanter and acts to keep the
  pelvis level in single-leg stance, and that **iliopsoas** inserts on the
  lesser trochanter and flexes the hip.
- That the capsule is reinforced by three named ligaments — the **iliofemoral**
  anteriorly, described as the strongest ligament in the body and tightening in
  extension; the **pubofemoral** anteroinferiorly; and the **ischiofemoral**
  posteriorly, the weakest of the three.
- That the **ligament of the head of the femur** runs from the acetabular fossa
  to the fovea of the head, carries a small artery, and is not a stabiliser.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The socket is a cup, and the rim grips past the equator

| | |
| --- | --- |
| **Claim** | The acetabular rim reaches past the widest part of the head, so the head cannot leave without being levered out or the rim breaking. |
| **Source** | Standard gross anatomy: the acetabulum encloses more than a hemisphere, and the labrum extends that further. |
| **Implementation** | The socket is not a warped sphere — a warped sphere has no rim and no inside. It is a **lathed shell swept to 116°**, so it passes the equator by construction, with a wall of its own; the labral ring is placed from that same sweep rather than from a number that happens to match. |
| **Assumption** | The depth is not a measured one, and the acetabular notch in the lower rim, with the transverse ligament across it, is not drawn — so the rim here is continuous where a real one is not. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the labral rim reaches further out than the centre of the head, but not so far as to swallow the head the neck comes out of, and it is a ring lying in the plane of the socket's mouth. |

### 2. Ball and cup share a centre

| | |
| --- | --- |
| **Claim** | The hip turns in every direction about one point. |
| **Source** | Standard gross anatomy: a congruent ball-and-socket joint. |
| **Implementation** | `SITES.acetabulum` and `SITES.femoralHead` are the same coordinates, written once each and named separately because the two structures are separate. |
| **Assumption** | Perfect congruence; the real joint is not perfectly spherical, and nothing here moves, so no axis of rotation is demonstrated. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the two anchor points are the same point. |

### 3. The head is held out on a neck

| | |
| --- | --- |
| **Claim** | Load comes down the pelvis into a head held out to the side of the shaft carrying it, so the neck is loaded across its axis. |
| **Source** | Standard gross anatomy; it is the fact everything about the neck of the femur follows from. |
| **Implementation** | The neck is its own tube between the head and the greater trochanter, so it can be pointed at and named, and the head sits above and medial to the shaft. |
| **Assumption** | **The neck–shaft angle is drawn to read and is not measured**, and is stated as such on the structure itself, in the model card and in the disclaimer. Femoral anteversion is not represented, and the vessels running up the neck are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — head, neck and greater trochanter lie in that order going outwards, the head is above the shaft, and the neck meets both the head and the trochanter. |

### 4. Two trochanters, two tendons, not interchangeable

| | |
| --- | --- |
| **Claim** | Gluteus medius ends on the greater trochanter and iliopsoas on the lesser. |
| **Source** | Standard gross anatomy. It is why one keeps the pelvis level and the other lifts the thigh. |
| **Implementation** | Each tendon is a strap drawn to a named site, and the lesser trochanter is placed below and behind the greater. |
| **Assumption** | One strap per muscle; the bellies are outside the scene and the footprints are not measured. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — gluteus medius reaches the greater trochanter and not the lesser, iliopsoas reaches the lesser, and the lesser trochanter is lower and further back than the greater. |

### 5. Three ligaments, three sides

| | |
| --- | --- |
| **Claim** | The iliofemoral and pubofemoral ligaments cross the front of the joint and the ischiofemoral crosses the back, each running from the hip bone to the femur. |
| **Source** | Standard gross anatomy; the arrangement is why an extended hip hangs on the iliofemoral ligament and why a dislocating hip usually goes backwards. |
| **Implementation** | Three bands from three named regions of the hip bone to the femoral neck and intertrochanteric line, flattened across their run so each reads as a thickening rather than a rope. |
| **Assumption** | **The capsule itself is not drawn** — a bag round the joint hides everything the scene exists to show — so three thickenings of one sheet are drawn as three separate bands. The iliofemoral ligament is drawn as one band where in life it has two limbs. Both are stated in the copy. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each band spans from medial of the head's centre to lateral of it; the two anterior ones lie in front of the head and the posterior one behind; and the pubofemoral lies below the iliofemoral. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. Everything is drawn where it belongs, including a ligament that lives inside the socket. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The coronal section **cuts** the joint rather than lifting the femur out of it; "the socket, with the femur put away" hides the femur and its glaze by tag; the slider fades bone so the ligament of the head appears where it is. |
| **Assumption** | A reader who touches nothing sees an intact hip from an anterior oblique — which is correct, and which is exactly why the section exists. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
