# Model evidence — Interactive elbow anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the elbow as **three articulations inside one
  capsule**: humero-ulnar, humero-radial and proximal radio-ulnar.
- That the **trochlea** is a pulley with a flange at each end and a groove
  between them, that its medial flange projects further than its lateral one,
  and that the ulna running in that groove is therefore capable of flexion and
  extension only.
- That the **capitellum** is a rounded eminence lateral to the trochlea on the
  same axis, that it faces forward and downward, and that it has no articular
  surface posteriorly.
- That the **trochlear notch** of the ulna wraps the trochlea through
  approximately 180–190°, so that the humero-ulnar joint is stable by bone.
- That the **flexion axis** passes through the centre of the trochlea and the
  centre of the capitellum, and that **both collateral ligaments arise at or
  very near that axis** — which is why they remain tensioned throughout the
  range rather than slackening in mid-flexion.
- That the **ulnar collateral ligament** has an anterior band to the coronoid
  and a posterior band to the olecranon, and that the anterior band is the
  principal restraint to valgus and the structure injured by repeated throwing.
- That the **radial collateral ligament** arises from the lateral epicondyle
  and **inserts into the annular ligament rather than into the radius**, which
  is what allows the radial head to rotate without the ligament following it.
- That the **annular ligament** is attached to the anterior and posterior
  margins of the radial notch of the **ulna**, encircles the radial head, and is
  attached to the radius nowhere.
- That the **biceps** inserts on the radial tuberosity, on the aspect of the
  radius away from the thumb, and is therefore a powerful supinator as well as a
  flexor; and that the **triceps** is the sole extensor, inserting on the
  olecranon.
- That the **common flexor origin** is the medial epicondyle and the **common
  extensor origin** the lateral epicondyle.
- That the **ulnar nerve** passes in a groove behind the medial epicondyle,
  covered by little more than skin, and then between the two heads of flexor
  carpi ulnaris; and that it may sublux anteriorly over the epicondyle in
  flexion in a minority of people.
- That in the **cubital fossa** the contents lie, from lateral to medial, as
  biceps tendon, brachial artery, median nerve.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The trochlea is a spool, and a deeper one on the inside

- **Claim.** Two flanges with a waist between them, the medial flange deeper.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `trochleaRadiusAt(x)` returns the distance from the hinge
  axis at each point along it: a Gaussian waist between two flanges, with the
  outer radius growing slightly towards the medial end. The trochlea is a true
  surface of revolution lathed about the axis from that function.
- **Assumption.** The trochlea's real surface is slightly helical, which is part
  of why the carrying angle changes through flexion. **That is not drawn**, and
  no radius here is a measurement.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the radius at the middle
  is smaller than at either flange by a margin, and the medial flange is the
  larger of the two.

### 2. The notch grips the spool, and grips more than half of it

- **Claim.** The humero-ulnar joint is held by bone shape rather than by
  ligament.
- **Source.** Standard gross anatomy; the notch wraps roughly 180–190°.
- **Implementation.** The proximal ulna is built as a hook swept about the axis
  from the olecranon tip, round the back of the spool, under it and up in front
  to the coronoid, and then **every vertex is pushed out of the trochlea** by
  `clearTrochlea`, which reads the same `trochleaRadiusAt` the spool is lathed
  from (`docs/architecture-rules.md` rule 1).
- **Assumption.** One clearance stands for the cartilage and the joint space.
  The ridge that divides the notch, and the bare area across the middle of it,
  are not drawn.
- **Validation.** `tests/organ-parts-anatomy.test.js` — no ulnar vertex lies
  inside the trochlea; the nearest is within a small distance of it; and the
  angular spread of the vertices that touch it exceeds π.

### 3. Both collateral ligaments start on the axis

- **Claim.** Neither ligament changes length as the elbow bends.
- **Source.** Standard gross anatomy; it follows from the origins lying on or
  very near the axis of rotation.
- **Implementation.** `collateralOrigin(side)` returns a point derived from
  `HINGE` — at the medial end of the trochlea on one side and at the lateral
  edge of the capitellum on the other — and both ligaments are drawn from it.
  The origin is not written as a coordinate anywhere else.
- **Assumption.** Real origins are areas, slightly anterior and inferior to the
  axis, which is part of why bands tighten differentially; **the model draws one
  point** and the claim it supports is qualitative, not quantitative. **No
  footprint here is a measurement.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — each origin lies within
  a small distance of the axis and on its own side, and each drawn ligament
  contains that origin.

### 4. The ring holds the head and grips it nowhere

- **Claim.** The annular ligament is attached to the ulna at both ends and to
  the radius at neither, and the radial collateral ligament ends on the ring.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** The ligament is drawn as an **open** ring round the radial
  neck whose two ends reach towards the ulna, and the radial collateral ligament
  is drawn ending on it.
- **Assumption.** Its funnel shape — narrower below than above, which is part of
  what retains the head — is drawn only slightly. **Nothing here may be used to
  judge or perform a reduction.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — the ring's bounds meet
  the ulna's and reach past the radial head towards it; the radial collateral
  ligament meets the ring and does not meet the radius.

### 5. The nerve goes behind the bump

- **Claim.** The ulnar nerve passes posterior to the medial epicondyle.
- **Source.** Standard gross anatomy; it is why the elbow is the commonest site
  of ulnar neuropathy and why the bone can be knocked into the nerve.
- **Implementation.** The nerve is drawn as one cord through
  `SITES.cubitalTunnel`, which is behind and medial to the epicondyle.
- **Assumption.** One representative course. In life it branches, and in a
  minority of people it slips forward over the epicondyle in flexion; **neither
  is drawn, and the nerve does not move.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — over the epicondyle's
  own height range, every point of the nerve lies behind the epicondyle's
  posterior face.

### 6. The order in the hollow at the front

- **Claim.** Biceps tendon, brachial artery, median nerve, from the thumb side
  inwards.
- **Source.** Standard gross anatomy; it is the same in everybody, which is what
  makes it worth learning.
- **Implementation.** The three are drawn as separate cords at three medial
  offsets in front of the joint.
- **Assumption.** Depth and spacing are drawn to be seen, not measured. The
  veins in front of them, the bicipital aponeurosis over them and the division
  of the artery below them are not drawn, and **nothing here may be used to plan
  a puncture or a line.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — at one height the three
  are ordered as claimed on the medial axis.

### 7. Nothing here moves, and nothing here is a measurement

- **Claim.** The scene shows an arrangement, not a mechanism and not a size.
- **Implementation.** There is no state in the builder: the same geometry is
  produced every time, with the joint extended. The cartilage's thickness is the
  one deliberate exaggeration and is named in the model card, the structure note
  and the scene disclaimer.
- **Validation.** `tests/organ-anatomy-scenes.test.js` — the scene declares its
  structures, names them in both languages and carries a disclaimer;
  `tests/model-profiles.test.js` — its model profile declares a mechanism level
  of `none`, which is what a scene with no state is allowed to claim.
