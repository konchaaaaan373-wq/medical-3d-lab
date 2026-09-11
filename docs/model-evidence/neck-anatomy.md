# Model evidence — Interactive neck anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the neck as a region: the **visceral column** in the
  midline — larynx and trachea in front, pharynx and oesophagus behind — with
  the **carotid sheath** on either side and the **cervical vertebrae** behind
  everything.
- That the **thyroid gland** consists of two lobes joined by an **isthmus**
  lying across the **second to fourth tracheal rings**, that the gland is
  attached to the airway, and that it therefore **moves on swallowing** — the
  sign that separates a thyroid swelling from every other neck swelling.
- That the **parathyroid glands**, usually four, lie on the posterior aspect of
  the thyroid lobes; that they are about **6 × 4 × 2 mm**; that their function
  (calcium homeostasis) is unrelated to the gland they are attached to; and that
  **their number and position both vary**, an inferior gland in particular
  ranging from the angle of the jaw to the mediastinum.
- That the **carotid sheath** contains the common carotid artery **medially**,
  the internal jugular vein **laterally**, and the **vagus nerve behind and
  between** them.
- That the **common carotid arteries differ at their origins**: the right from
  the brachiocephalic trunk in the root of the neck, the left directly from the
  arch of the aorta.
- That the common carotid divides at about the **upper border of the thyroid
  cartilage**, that the **internal** carotid runs posterolateral and gives **no
  branch in the neck**, and that the **external** carotid runs anteromedial and
  branches at once.
- That the **recurrent laryngeal nerves** reach the larynx from below, ascending
  in the **tracheo-oesophageal groove**, and that the two sides get there by
  different courses: the **right** turns round the **subclavian artery** at the
  root of the neck, the **left** descends into the thorax and turns round the
  **arch of the aorta**. Hence hoarseness may be a sign of disease in the neck
  or in the chest.
- That the recurrent nerve's course is variable — it branches before entering
  the larynx, may pass anterior or posterior to the inferior thyroid artery,
  and on the right may be **non-recurrent** in a small proportion of people.
- That the **oesophagus** lies immediately behind the trachea, is collapsed at
  rest, and **deviates slightly to the left** in the neck, which is why the
  cervical oesophagus is approached from the left.
- That the **deep cervical lymph nodes** form a chain along the internal jugular
  vein and that head-and-neck drainage follows an order which the level
  classification (I–VI) formalises.
- That the **sternocleidomastoid** divides the neck into an anterior and a
  posterior triangle; that the **infrahyoid (strap) muscles** overlie the
  thyroid and the front of the airway; and that the **scalene gap** is where the
  subclavian artery and the brachial plexus leave the neck.
- That the **hyoid** articulates with no other bone and the larynx is suspended
  from it; that the **cricoid** is the only complete ring in the airway and
  marks the **C6** level at which pharynx becomes oesophagus and larynx becomes
  trachea.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The airway and the gullet are stacked in the midline, gullet behind

- **Claim.** The oesophagus lies directly behind the trachea and leans to the
  patient's left as it descends.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `airwayAt(y)` gives the air column's centre and radius;
  `oesophagusAt(y)` places the gullet at `AIRWAY_Z − 1.5`, flattened front to
  back, with a leftward shift that grows downwards.
- **Assumption.** One representative depth and one representative shift. **No
  distance here is a measurement**, and the degree of deviation is drawn to be
  seen rather than measured.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the gullet's centre is
  behind the airway's at every level tested, its lower end is to the patient's
  left of its upper end, and the two do not intersect.

### 2. The thyroid is moulded onto the airway

- **Claim.** Each lobe's medial surface is the shape it is because the trachea
  is there.
- **Source.** Standard gross anatomy; the swallowing sign follows from the
  attachment.
- **Implementation.** Each lobe is built as a simple tapered body and then every
  vertex is pushed out of the air column by `clearAirway`, which reads the same
  `airwayAt` the trachea is built from. The hollow in the lobe therefore **is**
  the trachea's surface (`docs/architecture-rules.md` rule 1).
- **Assumption.** A clearance of 0.03 cm stands for the plane between them.
  Capsule, vessels and follicles are not drawn.
- **Validation.** `tests/organ-parts-anatomy.test.js` — no lobe vertex lies
  inside the air column, and the nearest lobe vertex on each side is within a
  small distance of the airway's surface, so the lobes neither enter the airway
  nor float off it.

### 3. Inside the sheath: artery medial, vein lateral, vagus behind

- **Claim.** The three contents hold that arrangement on both sides.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `SHEATH.contents` holds one table of offsets written
  medial-first; `sheathContentAt(y, side, key)` multiplies the lateral component
  by the side. The sheath itself and all three contents are placed from
  `sheathAt`, so the relationship is stated once.
- **Assumption.** One fixed arrangement at every level. In life the vein's
  relationship to the artery varies with level, posture and respiration.
- **Validation.** `tests/organ-parts-anatomy.test.js` — on both sides the artery
  is nearer the midline than the vein, the vein's radius is the larger, and the
  vagus lies behind both.

### 4. The external carotid runs in front of the internal

- **Claim.** Above the division, the external is anteromedial and the internal
  posterolateral.
- **Source.** Standard gross anatomy; it is how the two are told apart.
- **Implementation.** Both begin at the same bifurcation point and are offset
  from the same `sheathContentAt(…, 'artery')` run, the external forward and
  medial, the internal back and lateral.
- **Assumption.** A straight run with **no branches at all**; the superior
  thyroid artery, which this scene would most want, is not drawn.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the two arteries share a
  starting point, and above it the external is anterior and medial to the
  internal on both sides.

### 5. The two recurrent laryngeal nerves turn at different heights

- **Claim.** Both end in the tracheo-oesophageal groove at the cricoid, but the
  right turns at the root of the neck and the left in the chest.
- **Source.** Standard gross anatomy; the embryological reason (the sixth aortic
  arch) is stated in words and not drawn.
- **Implementation.** The two nerves are **written separately, not mirrored**.
  The right leaves the right vagus at `LEVELS.subclavian` and loops round the
  right subclavian artery; the left leaves the left vagus at `LEVELS.aorticArch`
  and loops round the arch. Both then follow `grooveAt(y, side)`, which is
  derived from the airway and the gullet that form the groove, to the same level
  at the cricoid.
- **Assumption.** One representative course each. **In life the course varies,
  the nerve branches before it enters, it may pass either side of the inferior
  thyroid artery, and on the right it may not recur at all.** The nerves are
  drawn thicker than life (`DISPLAY.recurrentRadius`; about 2 mm in life).
- **Validation.** `tests/organ-parts-anatomy.test.js` — both nerves end within
  the groove at the level of the cricoid; the lowest point of the left nerve is
  well below the lowest point of the right; and each nerve passes beneath the
  vessel it is said to turn round.

### 6. The thyroid's four small neighbours are on its back

- **Claim.** The parathyroid glands lie on the posterior surface of the lobes.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** Four beads placed behind the air column at the level of
  the cricoid and near the lower poles, on the lobes' posterior aspect.
- **Assumption.** **Drawn larger than life** (`DISPLAY.parathyroidRadius`) so
  they can be seen and clicked; a parathyroid is about 6 × 4 × 2 mm and **no
  size may be read off them**. Four in the usual place; in life both the number
  and the position vary.
- **Validation.** `tests/organ-parts-anatomy.test.js` — all four lie behind the
  air column and behind the centre of the lobe on their own side, and each is
  within the height range of its lobe.

### 7. Nothing here moves, and nothing here is a measurement

- **Claim.** The scene shows an arrangement, not a mechanism and not a size.
- **Implementation.** There is no state in the builder: the same geometry is
  produced every time. Every display enlargement is declared in one `DISPLAY`
  object and named in the model card, the structure notes and the scene
  disclaimer.
- **Validation.** `tests/organ-anatomy-scenes.test.js` — the scene declares its
  structures, names them in both languages, and carries a disclaimer;
  `tests/model-profiles.test.js` — its model profile declares a mechanism level
  of `none`, which is what a scene with no state is allowed to claim.
