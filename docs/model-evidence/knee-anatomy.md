# Model evidence — Interactive knee anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the knee: the femoral condyles articulating with the
  tibial plateaus, the **intercondylar notch** between the condyles, and the
  **fibula** articulating with the lateral side of the tibia below the joint
  line and carrying no weight from the femur.
- That the **anterior cruciate ligament** runs from the medial wall of the
  *lateral* femoral condyle, anteriorly and distally, to the anterior
  intercondylar area of the tibia, and resists anterior tibial translation; and
  that the **posterior cruciate ligament** runs from the lateral wall of the
  *medial* femoral condyle, posteriorly and distally, to the posterior
  intercondylar area, resisting posterior translation, the two crossing inside
  the notch.
- That the **medial collateral ligament** runs from the medial femoral epicondyle
  to the medial tibia well below the joint line and is attached to the medial
  meniscus, while the **lateral collateral ligament** runs from the lateral
  femoral epicondyle to the **head of the fibula**, stands clear of the capsule,
  and is not attached to the lateral meniscus.
- That both **menisci** are wedges of fibrocartilage, thick at the periphery and
  thin at the free edge, deepening the tibial surface; the medial a wider, more
  open C and relatively fixed, the lateral more nearly a closed ring and more
  mobile.
- That **articular cartilage** covers the femoral condyles, the tibial plateaus
  and the posterior surface of the patella, so that the opposing bones do not
  contact each other.
- That the **patella** is the largest sesamoid bone, lies within the extensor
  mechanism between the quadriceps and patellar tendons, and increases the
  quadriceps' moment arm for knee extension.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The cruciates cross, and they cross inside the notch

| | |
| --- | --- |
| **Claim** | Both cruciates run in the gap between the two femoral condyles, and they run in opposite anteroposterior directions — which is what "cruciate" means. |
| **Source** | Standard gross anatomy. The notch is where they are, and a notch too narrow is a thing that matters for that reason. |
| **Implementation** | The two condyles are separate solids and the notch is the gap between them — not drawn as a structure, because it is not one. Each cruciate is drawn between two named entries in `ATTACHMENTS`, ACL from the lateral condyle's inner wall forward and down, PCL from the medial condyle's inner wall backward and down. |
| **Assumption** | Each is one band. The separate bundles that tighten at different angles of flexion are not modelled, and neither is the meniscofemoral ligament. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — both cruciates lie between the two condyles in `x`, and the ACL runs anteriorly while the PCL runs posteriorly as each descends. |

### 2. The collaterals are outside, and only one of them ends on the fibula

| | |
| --- | --- |
| **Claim** | Each collateral lies on the outside of its own side of the joint, and the lateral one ends on the head of the fibula rather than on the tibia. |
| **Source** | Standard gross anatomy. It is why the lateral meniscus is the mobile one: the LCL stands clear of it, and the MCL does not. |
| **Implementation** | Both are drawn between named attachments derived from one `MEDIAL` constant. The LCL's tibial-side attachment is placed on the fibula's own axis; the MCL's is on the tibia, well below the joint line. |
| **Assumption** | The MCL is drawn as a cord; it is really a flat band with a deep layer continuous with the capsule, and the two layers are not separated. The attachment of the MCL to the medial meniscus is stated in the copy but not drawn as a join. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each collateral is lateral to both condyles on its own side, the LCL's lower end is within a fibular radius of the fibula's axis, and the MCL's is not. |

### 3. Each meniscus is between its own condyle and its own plateau

| | |
| --- | --- |
| **Claim** | The menisci are between the two bones, one on each side, and each is a wedge thick at the rim and thin at the free edge. |
| **Source** | Standard gross anatomy. It is what turns a flat plateau into a socket for a round condyle. |
| **Implementation** | Each is an arc swept about its own plateau's centre, with a radius function that thins it towards the middle of the arc. The medial is the wider, more open C; the lateral the nearly closed ring. |
| **Assumption** | The anterior and posterior horns and their tibial attachments are not drawn as separate structures. Neither meniscus changes shape or position, because nothing in this scene moves. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each meniscus lies below its own femoral condyle and above its own tibial plateau, and on the same side as both. |

### 4. The two bones never touch

| | |
| --- | --- |
| **Claim** | Every surface that meets another is covered, so that bone does not contact bone. |
| **Source** | Standard gross anatomy, and the reason a normal joint is silent. |
| **Implementation** | One structure drawn as four slightly enlarged translucent copies of the bone surfaces — the two condyles and the two plateaus — rather than as a modelled layer of a stated thickness. |
| **Assumption** | **The thickness is drawn to be visible and is not a measurement.** The patellar articular surface is not separately drawn. Declaring it as one structure with four meshes is the claim that it is one tissue in four places. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the cartilage layer's bounds enclose each bone surface it covers; `tests/organ-anatomy-scenes.test.js` — one structure, more meshes than structures in the scene. |

### 5. The extensor mechanism is one chain with a bone in it

| | |
| --- | --- |
| **Claim** | Quadriceps tendon to patella to patellar tendon to tibial tuberosity is one continuous pull, and the patella is in the middle of it. |
| **Source** | Standard gross anatomy. It is why the patella is described as a sesamoid and why it increases the quadriceps' leverage. |
| **Implementation** | Both tendons are drawn between named attachments, and the patella's own site is between `patellaTop` and `patellaBottom`. The chain is read from the same table rather than typed twice. |
| **Assumption** | One cord stands for four muscles and their layered tendon. The patella is drawn in the position it takes in extension and is not shown tracking, because nothing here moves. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the quadriceps tendon ends above the patella, the patellar tendon begins below it and ends at the tibial tuberosity, and the chain descends monotonically. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. Every structure is drawn where it belongs, and the ones behind bone are reached by changing what is drawn, not where. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The slider fades the bones; a "Ligaments and menisci only" viewpoint hides every bone, tendon and the cartilage that has their shape, by tag; the plateau view *cuts* the femur away at the joint line rather than lifting it off; isolation from the list takes one structure out of seventeen. |
| **Assumption** | A reader who never touches the slider or the viewpoints sees an intact knee from outside, which is correct and is also not what the scene is about — hence the opening oblique. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
