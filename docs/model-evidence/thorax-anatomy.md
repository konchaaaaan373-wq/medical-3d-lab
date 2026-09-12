# Model evidence — Interactive chest anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the thorax as **two pleural cavities and the
  mediastinum between them**, bounded by the thoracic inlet above, the
  diaphragm below, the sternum in front and the vertebral column behind.
- That there are **twelve pairs of ribs**, that each slopes downwards as it
  passes forward, and that the anterior end of a rib therefore lies at a lower
  level than its posterior end.
- That the upper seven costal cartilages reach the sternum, the **eighth, ninth
  and tenth do not** and instead join the cartilage above to form the costal
  margin, and the eleventh and twelfth have no anterior attachment.
- That the **sternal angle** marks the level of the second costal cartilage,
  the T4/5 disc, the bifurcation of the trachea, both ends of the arch of the
  aorta, and the plane dividing superior from inferior mediastinum.
- That the **intercostal vein, artery and nerve** lie in that order downwards in
  the costal groove under the lower border of each rib, and that the bundle is
  less protected posteriorly and has collateral branches along the lower border
  of the space.
- That the **diaphragm is a dome**, higher on the right than the left, and that
  its three principal openings are at different levels — the caval opening
  highest, the oesophageal next, and the aortic lowest, the aorta passing
  **behind** the diaphragm rather than through it.
- That each **pleural cavity is separate** and does not communicate with the
  other, and that the **costodiaphragmatic recess** is the part of each cavity
  that the lung does not occupy even in full inspiration.
- That the **right lung has three lobes and the left two**, and that the left
  lung carries a **cardiac notch** on its anterior border because the heart
  occupies that space.
- That the **right main bronchus is wider, shorter and more vertical** than the
  left, and that inhaled material therefore tends to enter it.
- That roughly **two-thirds of the heart lies to the left of the midline**, that
  it rests on the diaphragm, and that its apex points down, forward and to the
  left.
- That the **pericardium is fibrous and does not distend acutely**, so that a
  small volume accumulating rapidly may embarrass filling where a larger volume
  accumulating slowly may not.
- That the **oesophagus** runs the whole length of the mediastinum behind the
  trachea and then behind the heart, leaving through the diaphragm with a vagus
  nerve on either side of it.
- That the **phrenic nerve passes anterior to the root of the lung** and the
  **vagus posterior to it**, and that the phrenic arises in the neck, which is
  why a lesion there paralyses a hemidiaphragm.
- That the **superior vena cava** runs the height of the superior mediastinum
  while the **inferior** is intrathoracic for barely a centimetre.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Every rib slopes downwards as it comes forward

- **Claim.** A space counted in front is not level with the same space counted
  behind.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `chestSection(y)` is the outline of the chest at each
  height; `ribPath(index, t, side)` sweeps round it from the column to the
  anterior end while `RIB_LEVELS[index].drop` lowers it. A rib is therefore a
  run round a surface, not a written curve, and the slope is one number per
  level (`docs/architecture-rules.md` rule 1).
- **Assumption.** One representative outline and one drop per level. **No rib
  spacing, length or angle is a measurement**, and no rib here is that rib —
  head, neck, tubercle and angle are not separated.
- **Validation.** `tests/organ-parts-anatomy.test.js` — for all twelve on both
  sides, the anterior end is lower than the posterior, further forward, and the
  middle of the run is further from the midline than either end.

### 2. The bundle is under the rib, not in the middle of the space

- **Claim.** Anything entering a chest is aimed at the top of a space.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** The bundle is drawn along the same `ribPath` as its own
  rib, offset downwards by a fixed amount, so it cannot drift off the rib it
  belongs to.
- **Assumption.** **One cord for all three structures**, in the usual place.
  Order, posterior exposure and collateral branches are described and not drawn.
  **Nothing here may be used to plan or perform a puncture or a drain.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — the bundle lies below
  its own rib and above the next rib down, at the middle of the run.

### 3. The left lung's notch is the mediastinum

- **Claim.** The notch is not a feature of the lung; it is what is left where
  the heart is.
- **Source.** Standard gross anatomy; the cardiac impression and notch follow
  from the heart's position.
- **Implementation.** `mediastinumSection(y)` is the slab between the cavities,
  displaced towards the patient's left where the heart is. Both lungs are built
  filling their side of the chest and then **pressed out of that slab** by
  `clearMediastinum`, each to its own side.
- **Assumption.** One representative slab. The lobes and fissures are named and
  not separated, and no lung volume may be read off the model.
- **Validation.** `tests/organ-parts-anatomy.test.js` — no vertex of either
  lung lies inside the slab at the slab's own depth, and at the heart's level
  the left lung's medial edge is more than 1.5 cm further from the midline than
  the right's.

### 4. The lung does not fill the cavity

- **Claim.** The costodiaphragmatic recess is the part no lung reaches.
- **Source.** Standard gross anatomy; it is why fluid is looked for at the
  bottom and behind.
- **Implementation.** `diaphragmAt(x, z)` is the height of the dome. The
  diaphragm is built from it, each lung's base is raised to sit on it, and the
  recess is drawn as the space between it and the wall, below where the lung
  stops.
- **Assumption.** **One size, and in life the depth changes with every breath**
  — nothing in this scene breathes. The size drawn is not a capacity.
- **Validation.** `tests/organ-parts-anatomy.test.js` — each lung's base stops
  above the floor of the cavity, and the recess extends below where the lung
  stops.

### 5. The two main bronchi are not alike

- **Claim.** The right is wider, shorter and more upright.
- **Source.** Standard gross anatomy; it is why inhaled material goes right.
- **Implementation.** One table, `AIRWAY`, with three numbers per side, read by
  `bronchusPath`.
- **Assumption.** Nothing below the main bronchi is drawn; the bronchial tree is
  `lung-anatomy`. No calibre is a measurement.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the table itself is
  asserted on all three counts, so the difference cannot be lost by editing one
  side.

### 6. Two nerves, one root, opposite faces

- **Claim.** The phrenic passes in front of the root of the lung and the vagus
  behind it.
- **Source.** Standard gross anatomy; everything each nerve reaches follows from
  it.
- **Implementation.** Both are placed from the same `bronchusPath(side, 1)`
  hilum point, one offset forward and one back, so the relationship is stated
  once rather than twice.
- **Assumption.** One cord each on the usual course. **The plexus the two vagi
  form on the oesophagus is not drawn**, nor is the left recurrent laryngeal
  nerve turning under the arch — that is in `neck-anatomy`, which is where this
  chest's nerves are picked up from. The phrenic's origin in the neck and its
  sensory territory are described and not drawn.
- **Validation.** `tests/organ-parts-anatomy.test.js` — at each hilum, the
  nearest point of the phrenic on that side is anterior to it and the nearest
  point of the vagus is posterior.

### 7. Nothing here moves, and nothing here is a measurement

- **Claim.** The scene shows an arrangement, not a mechanism and not a size.
- **Implementation.** There is no state in the builder: the same geometry is
  produced every time, with the chest at rest. There is no pressure, volume or
  compliance anywhere in the model, and the one scale factor in it
  (`WORLD_SCALE`) is a viewer constraint declared in the file.
- **Validation.** `tests/organ-anatomy-scenes.test.js` — the scene declares its
  structures, names them in both languages and carries a disclaimer;
  `tests/model-profiles.test.js` — its model profile declares a mechanism level
  of `none`, which is what a scene with no state is allowed to claim.
