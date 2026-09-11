# Model evidence — Interactive eye anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the eye: three coats — a tough outer **sclera**, a
  vascular **choroid**, and an inner **retina** lining the posterior portion of
  the globe — with the transparent **cornea** set into the sclera at the limbus
  and more steeply curved than it, providing the greater part of the eye's
  refractive power.
- That the **lens** lies immediately behind the iris, suspended from the
  **ciliary body**, and changes shape in accommodation.
- That **aqueous humour** is secreted by the ciliary body into the posterior
  chamber, passes through the pupil into the **anterior chamber**, and drains at
  the iridocorneal angle.
- That the **vitreous body** occupies the space behind the lens and that the
  retina is firmly attached only at the optic disc and the ora serrata.
- That the **optic disc** lies nasal to the posterior pole and contains no
  photoreceptors, and that the **macula**, with the fovea at its centre, lies at
  the posterior pole temporal to the disc.
- That the four **recti** arise from a common ring at the orbital apex and
  insert on the sclera anterior to the equator.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Three coats, and each has an inside

| | |
| --- | --- |
| **Claim** | Sclera, choroid and retina are layers, and a section through the eye shows three of them. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Each coat is a `shellOfRevolution` — a swept shell with a wall — rather than a nested ball, and each stops short of the next so that no two surfaces sit in the same place. |
| **Assumption** | **The thicknesses are display values** (`COAT_DISPLAY_THICKNESS`): in life all three together are a fraction of a millimetre. The retina's layers are not modelled. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each coat contains the next, with a gap between sclera and choroid and between choroid and retina. |

### 2. The cornea is a steeper curve, not a bigger one

| | |
| --- | --- |
| **Claim** | The cornea bulges in front of the globe *and* is narrower than it, because it belongs to a smaller sphere whose centre is further forward. |
| **Source** | Standard gross anatomy; it is why the cornea does most of the refracting. |
| **Implementation** | Its own radius and its own centre are named constants, and the sweep is the angle at which that sphere reaches the limbus. |
| **Assumption** | One even wall; the five corneal layers are not drawn, and it has no vessels or nerves here. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the cornea stands proud of the sclera, is narrower than it, and intersects it at the limbus. |

### 3. The order along the axis

| | |
| --- | --- |
| **Claim** | Cornea, anterior chamber, iris and pupil, lens, vitreous — in that order, and the lens never through the iris. |
| **Source** | Standard gross anatomy. |
| **Implementation** | Each is placed from a named site on the axis, and the lens's z extent was pulled back until it cleared the iris rather than being left to overlap. |
| **Assumption** | The posterior chamber between iris and lens is not drawn as a body of its own; the copy describes the route rather than the model showing it. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the chamber is in front of the iris and behind the front of the cornea, the lens is behind the iris, wider than the pupil and inside the ciliary ring, and the vitreous is behind the lens and inside the retina. |

### 4. Nasal disc, temporal macula

| | |
| --- | --- |
| **Claim** | The optic disc is nasal to the macula, and the macula is the one at the posterior pole. |
| **Source** | Standard gross anatomy; it is the relation a fundus is read by, and the one that says which eye is being looked at. |
| **Implementation** | Both are placed from `SITES`, with their sides derived from one `NASAL` constant. |
| **Assumption** | The disc is a flat patch without its cup; the macula is a patch with a dimple and no layers. Neither carries vessels. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the disc is nasal to the macula, the macula is nearer the axis and at the posterior pole, and the nerve leaves at the disc and runs back and nasally. |

### 5. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. Everything is drawn where it belongs, inside a globe. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The slider fades the coats; the section cuts the temporal half so the nasal disc survives it; "the fundus" hides the front of the eye by tag, which is what an ophthalmoscope does with light. |
| **Assumption** | A reader who touches nothing sees an intact eye from outside, which is correct and is not what the scene is about. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
