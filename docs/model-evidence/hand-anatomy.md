# Model evidence — Interactive hand and wrist anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the carpus: **eight bones in two rows** —
  proximal row scaphoid, lunate, triquetrum and pisiform; distal row trapezium,
  trapezoid, capitate and hamate — named from the radial side in each row.
- That the **pisiform is a sesamoid lying on the palmar surface of the
  triquetrum** rather than a fourth bone of the row in the same plane as the
  others.
- That the carpal bones form an **arch concave towards the palm**, whose radial
  pillar is the scaphoid tubercle and trapezium and whose ulnar pillar is the
  pisiform and the hook of the hamate; that the **flexor retinaculum** spans the
  two; and that the space between arch and retinaculum is the **carpal tunnel**.
- That the tunnel transmits **nine flexor tendons and the median nerve**, and
  that the nerve lies most superficially — directly under the retinaculum.
- That the **extensor tendons** cross the back of the wrist with no tunnel of
  this kind over them.
- That there are **five metacarpals** and **fourteen phalanges**: three in each
  finger and **two in the thumb**, which has no middle phalanx.
- That the thumb's metacarpal is shorter than the others and set at an angle to
  them, and that its joint with the trapezium is a saddle.
- That most of the thenar muscles are supplied by the median nerve.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Eight bones, two rows, in order

| | |
| --- | --- |
| **Claim** | The carpus is two rows of four, each named from the thumb side, with the pisiform palmar to the triquetrum rather than beside it. |
| **Source** | Standard gross anatomy; being able to say which one is the whole value of this part of the scene. |
| **Implementation** | `CARPALS` is a table of positions and sizes, one entry per bone, with the pisiform's `z` well palmar of the triquetrum's. |
| **Assumption** | Smooth blocks at one size each. Their facets, their joint surfaces and everything that makes one distinguishable from another by shape are not drawn — **only position tells them apart**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the distal row is distal to the proximal row, each row runs radial to ulnar in the stated order, and the pisiform is palmar to the triquetrum rather than lateral to it. |

### 2. An arch with a lid

| | |
| --- | --- |
| **Claim** | The retinaculum spans the two pillars of the carpal arch, and the tunnel is the space between the band and the arch. |
| **Source** | Standard gross anatomy. It is the reason the space has a name and the reason it cannot give. |
| **Implementation** | `TUNNEL.radialPillar` and `TUNNEL.ulnarPillar` are the two corners; the band is built across them and the tunnel's roof is the same pair of points, with its floor falling away between them (`docs/architecture-rules.md` rule 1). |
| **Assumption** | One smooth band; its layers and attachments are not drawn, and **no dimension, area or pressure is represented**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the band reaches both pillars, the tunnel lies under it, and the tunnel's floor is palmar to the bodies of the carpal bones it arches over. |

### 3. The nerve is the most palmar thing in it

| | |
| --- | --- |
| **Claim** | The median nerve lies against the underside of the retinaculum, with the flexor tendons deep to it. |
| **Source** | Standard gross anatomy; it is why the nerve is the structure that suffers when the space is reduced. |
| **Implementation** | The nerve's curve is placed at a greater `z` than any flexor tendon through the whole length of the tunnel. |
| **Assumption** | Plain cords. Seven stand for nine tendons and which is which is not represented; the nerve's branches and fascicles are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the nerve is palmar to every flexor tendon at the level of the tunnel, and both are inside the tunnel. |

### 4. Five rays, and one of them is a thumb

| | |
| --- | --- |
| **Claim** | Five metacarpals, five proximal phalanges, **four** middle phalanges and five distal phalanges; the thumb shorter and angled away from the rest. |
| **Source** | Standard gross anatomy. Two bones where every other digit has three is the plainest structural difference between a thumb and a finger. |
| **Implementation** | `RAYS` is one table of five entries; `raySegment(ray, bone)` walks it. The thumb's `middle` is `null`, so the row simply has one fewer member. |
| **Assumption** | Smooth shafts without their ends; joint gaps stand for cartilage and capsule, and **no bone length is a measurement**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the four rows have 5, 5, 4 and 5 members, each ray's bones run in order along one line, and the thumb's tip is further from the middle finger's than any other ray's is. |

### 5. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. The carpal bones are small and stay small. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The slider fades the bones; the carpus view brings the camera close rather than enlarging anything; and the tunnel views hide the rays or the carpus by tag rather than moving the tunnel out of the wrist. |
| **Assumption** | A reader who touches nothing sees a hand from the back, which is correct and is the side of a hand everyone has looked at. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
