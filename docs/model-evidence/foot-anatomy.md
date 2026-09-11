# Model evidence — Interactive foot and ankle anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the ankle: the **talus held in a mortise** formed by
  the distal tibia above and the medial and lateral malleoli on either side,
  with the **lateral malleolus extending further distally** than the medial one;
  and the **subtalar joint** beneath the talus, at which inversion and eversion
  occur rather than at the ankle above it.
- That **no muscle attaches to the talus**.
- That the **medial longitudinal arch** is the high one — talus, navicular,
  medial cuneiform, first metatarsal — while the lateral border of the foot,
  through the cuboid, lies close to the ground.
- That the **plantar fascia** runs from the medial tuberosity of the calcaneus
  forward to the heads of the metatarsals and is the principal static restraint
  on the arch, and that **extension of the toes tightens it and raises the
  arch** (the windlass mechanism).
- That the **spring ligament** runs from the sustentaculum tali to the navicular
  and supports the head of the talus directly.
- That the **tibialis posterior** is the principal dynamic support of the arch,
  passing behind the medial malleolus to the navicular.
- That the **deltoid ligament** is one strong sheet on the medial side, while
  the lateral side is **three separate bands**, and that lateral sprains are
  correspondingly common.
- That the great toe has **two phalanges** where the other toes have three.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. A foot is an arch, and only on one side

| | |
| --- | --- |
| **Claim** | The navicular rides high on the inside while the cuboid sits low on the outside; that height difference is the arch. |
| **Source** | Standard gross anatomy. It is why a footprint is not a foot's outline and why the arch is looked at from the inside. |
| **Implementation** | `TARSALS` is a table of positions; the `y` values are the arch and are written there rather than derived, because they are the claim. |
| **Assumption** | Smooth blocks at one size each; joint surfaces are not drawn and **no arch height is a measurement**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the navicular's centre is higher than the cuboid's, and the summit of the arch is higher than both ends of the band under it. |

### 2. The bowstring

| | |
| --- | --- |
| **Claim** | The plantar fascia runs from the heel to the heads of the metatarsals, under the whole arch. |
| **Source** | Standard gross anatomy; the bones make the arch but nothing about them stops it spreading. |
| **Implementation** | `ARCH.heel` and `ARCH.forefoot` are the two ends and the band is built between them as a chord; `ARCH.summit` is the top of the arch it passes under. |
| **Assumption** | One flat band; its parts, its attachments into the toes and the fat pad are not drawn, and **no tension or load is represented** — so the windlass mechanism is stated in the copy and not shown. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the band spans from behind the heel bone to the metatarsal heads and lies below the summit of the arch along its whole length. |

### 3. A bone in a socket, with a second joint under it

| | |
| --- | --- |
| **Claim** | The talus lies between the leg above and the calcaneus below, with a joint space at each boundary, and the lateral malleolus reaches lower than the medial one. |
| **Source** | Standard gross anatomy; turning the sole in and out happens at the lower of the two joints, and the asymmetry of the two malleoli is why it turns in more easily. |
| **Implementation** | The stack is written in `TARSALS` and in the two malleolar warps; the two joints are drawn as the spaces between the bones. |
| **Assumption** | **No range of movement is represented** and nothing bends. The dome of the talus, the three subtalar facets and the mortise itself are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the talus is above the calcaneus and below the tibia, the ankle joint lies between talus and leg and the subtalar joint between talus and heel, and the fibula reaches lower than the tibia. |

### 4. One sheet inside, three bands outside

| | |
| --- | --- |
| **Claim** | The deltoid ligament is a single sheet; the lateral ligaments are three separate bands. |
| **Source** | Standard gross anatomy, and the reason lateral sprains are the common ones. |
| **Implementation** | The deltoid is one warped sheet on the medial side; the lateral ligaments are three separate cords, kept as three meshes in one structure. |
| **Assumption** | Which lateral band is which is described and not labelled in the model, and **no strength or order of failure is represented**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the deltoid is one mesh on the medial side, the lateral ligaments are three meshes on the lateral side, and each lies on the side its name says. |

### 5. Five rays, and one of them is a great toe

| | |
| --- | --- |
| **Claim** | Five metatarsals, five proximal phalanges, **four** middle phalanges and five distal phalanges. |
| **Source** | Standard gross anatomy; the same arrangement as the hand's thumb. |
| **Implementation** | `RAYS` is one table of five entries with the great toe's `middle` absent, walked by `raySegment`. |
| **Assumption** | Smooth shafts without their ends; the sesamoids under the first metatarsal head are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the four rows have 5, 5, 4 and 5 members, and each ray's bones run in order forwards along one line. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ. |
| **Implementation** | The scene opens on the side the arch is on; the slider fades the bones, which are what the band is behind; and the close views hide the rays or the leg by tag rather than lifting anything out of the foot. |
| **Assumption** | A reader who touches nothing sees a foot from the inside, which is correct and is where the subject is. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
