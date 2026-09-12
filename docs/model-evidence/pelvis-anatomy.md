# Model evidence — Interactive pelvic anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the pelvis as a **bony ring** — two hip bones and
  the sacrum, closed anteriorly at the pubic symphysis — divided by the pelvic
  brim into a false pelvis above and a true pelvis below.
- That the outlet is closed by the **levator ani**, a funnel-shaped muscular
  sling, and that this sheet is the boundary between the pelvis above and the
  perineum below, the two differing in nerve supply and lymphatic drainage.
- That the sling has **one gap**, the levator (urogenital) hiatus, through which
  the urethra and the anal canal pass in both sexes and the vagina additionally
  in the female, and that the pelvic organs otherwise rest on the sheet.
- That the **peritoneum does not reach the pelvic floor**: it drapes over the
  tops of the pelvic organs, so the lower bladder, the lower rectum and the
  presacral space lie outside the peritoneal cavity.
- That the deepest peritoneal recess — the **rectouterine pouch** in the female
  and the **rectovesical pouch** in the male — is the **lowest point of the
  whole peritoneal cavity**, and is therefore where free fluid collects and the
  point at which the cavity can be reached from below.
- That the **ureter passes inferior to the uterine artery** in the female
  ("water under the bridge") and **inferior to the vas deferens** in the male,
  in both cases close to the lateral fornix / bladder base, and that this is the
  commonest mechanism of ureteric injury in pelvic surgery.
- That the ureter crosses the **bifurcation of the common iliac artery** at the
  pelvic brim, which is the one reliable place to identify it.
- That the **internal iliac artery** supplies the pelvis while the **external
  iliac** passes through it to become the femoral vessels and supplies nothing
  in the pelvis.
- That the **uterus is normally anteverted and anteflexed**, lying forward over
  the bladder, which is why the peritoneal dip lies behind it.
- That the **uterine tube opens freely into the peritoneal cavity** beside the
  ovary, so that the cavity is not a closed sac in the female.
- That the **prostate lies on the pelvic floor beneath the bladder with the
  urethra passing through it**, immediately anterior to the rectum.
- That an **empty bladder lies below the pelvic brim** and a full one rises out
  of the pelvis anterior to the peritoneum, so it can be reached suprapubically
  without entering the peritoneal cavity.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. One crossing, two names

- **Claim.** The ureter passes under the uterine artery in one set of organs and
  under the vas deferens in the other, at the same place.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `bridgeAt(side)` returns that point. The ureter is written
  to pass `UNDER_THE_BRIDGE` below it, and **both** crossing structures are
  written through it (`docs/architecture-rules.md` rule 1). The model therefore
  cannot state the relationship for one set and lose it for the other.
- **Assumption.** One representative point, on the usual course. **No distance
  here is a measurement**, and the variation that makes the crossing dangerous
  in practice is not represented. **Nothing here may be used to plan or perform
  an operation.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — on both sides the
  nearest point of the ureter is below the bridge, and the nearest point of each
  crossing structure is within a small distance of the bridge and above the
  ureter.

### 2. One gap, and what goes through it

- **Claim.** The urethra, the anal canal and (in one set) the vagina pass
  through the hiatus; everything else in the true pelvis rests on the sheet.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `floorAt(x, z)` is the height of the sling and `HIATUS`
  the gap in it. The floor is built as a ring starting where each ray leaves the
  gap, and every organ in the true pelvis is held above the sheet by
  `keepAboveFloor`.
- **Assumption.** One representative gap at one size. **Its size is not a
  measurement**, its shape at rest is not represented, and **it does not
  change** — which is the whole of what a continence or a prolapse scene would
  need.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the lowest point of each
  passage is inside the gap; no vertex of bladder, prostate or uterus lies below
  the sling outside it; and on 24 rays the sheet begins outside the gap, so the
  hole is an opening rather than a dimple.

### 3. The pouch is the lowest point

- **Claim.** The peritoneal dip behind the bladder is the lowest the cavity
  reaches, and lies between bladder and rectum.
- **Source.** Standard gross anatomy; it is why free fluid collects there.
- **Implementation.** The peritoneum is drawn as a sheet with a dip behind the
  bladder and the pouch as a body at that dip's lowest point.
- **Assumption.** One dip, the same for both sets, since it is the same recess
  with two names. **The size drawn is not a capacity**, and how far it dips
  depends on what is in front of it, which this scene does not vary.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the pouch's lowest point
  is at or below the peritoneum's, the bladder is in front of it and the rectum
  behind it.

### 4. Two sets, and nobody has both

- **Claim.** Everything except the midline reproductive organs is the same, and
  the two sets occupy the same space.
- **Source.** They are alternatives, not neighbours.
- **Implementation.** Both are drawn, in the positions each would occupy on its
  own, and `FEMALE_SET` / `MALE_SET` name them so the scene's viewpoints can
  show one at a time. **Nothing is displaced to make them coexist.**
- **Assumption.** This is a **display arrangement**, declared in the builder's
  header, the model card and the scene disclaimer. The scene opens on the shared
  parts rather than on either set.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the uterus's bounds and
  the prostate-and-vesicles' bounds **intersect**, which is the geometric form
  of the claim, and every member of both sets is drawn.

### 5. Nothing here moves, and nothing here is a measurement

- **Claim.** The scene shows an arrangement, not a mechanism and not a size.
- **Implementation.** There is no state in the builder: the same geometry every
  time, with the bladder empty and the floor at rest. No pressure, volume or
  compliance exists in the model, and the one scale factor (`WORLD_SCALE`) is a
  viewer constraint declared in the file.
- **Validation.** `tests/organ-anatomy-scenes.test.js` — the scene declares its
  structures, names them in both languages and carries a disclaimer;
  `tests/model-profiles.test.js` — its model profile declares a mechanism level
  of `none`.
