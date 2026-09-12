# Model evidence — Interactive abdominal anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the abdomen as a **peritoneal cavity and a
  retroperitoneum**, with the peritoneum as a closed sac (incompletely closed in
  the female) whose parietal layer lines the wall and whose visceral layer
  covers the organs suspended in it.
- That **intraperitoneal** organs — stomach, spleen, liver, jejunum and ileum,
  transverse colon and sigmoid colon — are suspended on folds and mobile, while
  **retroperitoneal** structures — kidneys, adrenals, ureters, aorta, inferior
  vena cava, most of the pancreas, most of the duodenum, and the ascending and
  descending colon — lie behind the sac against the posterior wall.
- That the **pancreas is retroperitoneal except its tail**, which lies in the
  splenorenal ligament, and the **duodenum is retroperitoneal except its first
  part**.
- That the **transpyloric plane** (L1) is the level of the pylorus, the neck of
  the pancreas, both renal hila, the origin of the superior mesenteric artery
  and the termination of the spinal cord.
- That the **three ventral branches of the abdominal aorta** leave at three
  descending levels — coeliac trunk, superior mesenteric artery, inferior
  mesenteric artery — supplying the derivatives of the foregut, midgut and
  hindgut respectively.
- That the **superior mesenteric artery crosses anterior to the third part of
  the duodenum**, and that the **left renal vein crosses anterior to the aorta**
  and posterior to that artery to reach the cava, while the **right renal artery
  passes posterior to the cava**.
- That the **aorta lies slightly to the left of the midline and the inferior
  vena cava to the right**, and that the aorta divides at the level of the
  umbilicus (L4).
- That the **right kidney lies lower than the left** because of the liver above
  it, that both lie on psoas, and that the **ureters descend on the front of
  psoas** and cross the pelvic brim over the iliac vessels.
- That the **adrenal glands cap the kidneys** but are developmentally and
  functionally independent of them, with their own blood supply.
- That the **greater omentum** hangs from the greater curvature of the stomach
  over the small bowel and is the first structure seen on opening the abdomen,
  and that the **mesentery** has a short posterior root and a long free border
  carrying the superior mesenteric vessels.
- That the **abdominal wall between the ribs and the pelvis contains no bone**,
  and that the midline between the two rectus muscles is the one plane through
  which it can be opened without dividing muscle.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. There is a line, and it is one line

- **Claim.** The back of the peritoneal cavity and the front of the
  retroperitoneum are the same surface.
- **Source.** They are two names for one membrane.
- **Implementation.** `peritoneumBackAt(y)` returns that depth at each height,
  and **both structures are built from it** — the cavity's back and the
  retroperitoneum's front (`docs/architecture-rules.md` rule 1). Written twice
  they would part company the first time either moved, and every claim below
  would become undecidable.
- **Assumption.** One representative depth profile, deepest where the kidneys
  are. **No depth here is a measurement.**
- **Validation.** `tests/organ-parts-anatomy.test.js` — a point just behind the
  returned depth is retroperitoneal and a point just in front of it is not, at
  four different levels.

### 2. Every organ is on one side of it, and the model says which

- **Claim.** What the copy says about each organ is true of the geometry.
- **Implementation.** Every organ is held on its side by `keepSideOfPeritoneum`
  as it is placed, so the claim is a property of the model rather than a label.
- **Assumption.** "Wholly" is 96% of the surface; the missing few per cent are
  tube walls and spline overshoot, and the straddling organs are at 45–90%, an
  order of magnitude away.
- **Validation.** `tests/organ-parts-anatomy.test.js` — liver, stomach, spleen
  and small bowel test wholly in front; kidneys, adrenals, ureters, aorta and
  cava wholly behind.

### 3. Two organs straddle it, and the colon shows it best

- **Claim.** The pancreas is retroperitoneal except its tail, the duodenum
  except its first part, and two of the colon's four lengths are fixed while two
  hang.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** The pancreas is drawn as one run whose last fifth crosses
  to the front; the duodenum's first part is written in front of the line and
  its other three behind; the colon is four separate lengths, two placed behind
  and two in front.
- **Assumption.** One representative position for each. The pancreas has no
  duct, the duodenum no papilla, and the colon no caecum, appendix or rectum.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the pancreas measures
  81% behind and the duodenum 68%, both inside a 45–90% band; of the colon's
  four lengths, exactly two are more than 90% behind and exactly two less than
  10%.

### 4. Where the vessels are, and what leaves them

- **Claim.** The cava is to the right of the aorta; three ventral branches leave
  at three descending levels; the superior mesenteric artery crosses in front of
  the third part of the duodenum.
- **Source.** Standard gross anatomy, as above.
- **Implementation.** `aortaAt(y)` places the aorta, and **all three ventral
  branches and both renal arteries are written to start from it**, so none can
  begin off its own vessel. The superior mesenteric artery's middle control
  point is placed in front of `peritoneumBackAt` at the duodenum's own level.
- **Assumption.** **No artery here has any branch.** The jejunal, ileal and
  colic branches — which are what make a mesentery a fan — are not drawn, and
  accessory renal arteries are not drawn.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the aorta is left of the
  midline and the cava right; the three levels descend in order; each branch's
  bounding box reaches the aorta's own point at its level; and at the third part
  of the duodenum the artery is anterior to the gut.

### 5. The kidneys are not symmetrical, and they lie on something

- **Claim.** The right is lower than the left, and both lie on psoas.
- **Source.** Standard gross anatomy; the liver is the reason for the first.
- **Implementation.** `KIDNEYS` holds the two heights and `psoasAt(y, side)` the
  shelf, placed deep enough that both the kidney and the ureter lie on its front
  surface rather than level with it.
- **Assumption.** No cortex, medulla, calyx or pelvis; **`kidney-anatomy` is the
  kidney.** The ureter is one cord at one calibre with none of its narrowings.
- **Validation.** `tests/organ-parts-anatomy.test.js` — the right kidney's
  centre is more than 0.5 cm below the left's, and each kidney is lateral to and
  in front of psoas at its own level.

### 6. Nothing here moves, and nothing here is a measurement

- **Claim.** The scene shows an arrangement, not a mechanism and not a size.
- **Implementation.** There is no state in the builder: the same geometry every
  time. No pressure, volume or compliance exists in the model, and the one scale
  factor (`WORLD_SCALE`) is a viewer constraint declared in the file.
- **Validation.** `tests/organ-anatomy-scenes.test.js` — the scene declares its
  structures, names them in both languages and carries a disclaimer;
  `tests/model-profiles.test.js` — its model profile declares a mechanism level
  of `none`.
