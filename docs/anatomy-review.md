# Anatomy and art review — flagship scenes, and the organ layer

Gate 1 in [`public-release-roadmap.md`](public-release-roadmap.md) asks for an
anatomy/art review of the flagship scenes, beginning with the heart and great
vessels and the brain atlas interaction. This is the record of it: what was
looked at, what was measured, what was changed, and what is being left for a
clinician rather than decided here. §5 extends the same method to the organ
layer every scene is built from.

**Reviewer:** engineering, not clinical. Nothing below is a clinical sign-off,
and the two scenes' review state in `#/trust` is unchanged by it. What an
engineering review can settle is whether the geometry says what the code claims
it says; what it cannot settle is whether a simplification teaches the right
thing, and those are listed in §4 for the clinician who eventually signs.

**Method.** Both scenes were built and rendered in a real browser
(Chromium via `npm run verify:ui`'s harness) rather than reasoned about from
the source, because [`architecture-rules.md`](architecture-rules.md) rule 6
says a 3D scene is not finished on passing unit tests, and because the two
defects found in §2 were both invisible in the code. Landmark relationships
were then measured from `anatomy.js` directly rather than eyeballed from a
screenshot, per the checklist in
[`organ-3d-playbook.md`](organ-3d-playbook.md) §4 — *目視では通ります*.

---

## 1. Heart and great vessels — measured, and correct

Every relationship below was measured from the scene's own landmarks and now
has a test in `tests/semantic-anatomy.test.js` under the heading *the
relationships an anatomy review checks*. They are facts about hearts, so they
belong in that layer: they would still be true if the scene were rebuilt at a
different scale.

| Relationship | Measured | Verdict |
| --- | --- | --- |
| Aortic valve right of, and anterior to, the mitral valve | x −1.15 vs +1.20; z +0.35 vs +0.20 | correct |
| Both valves in one annular plane | y 1.60 for both | correct |
| Left atrium above and behind the valve plane | y 2.86 > 1.60; z −1.15 < +0.20 | correct |
| Mitral inflow descends and moves forward | y falls, z rises along the curve | correct |
| Ascending aorta on the right | x −1.73 at mid-ascending | correct |
| Arch crosses the midline to the left | apex x −0.03, end x +3.10 | correct |
| Arch runs posteriorly throughout | z +0.35 → −0.85 → −1.31 → −2.40, monotonic | correct |
| Arch clears the top of the left atrium | apex y 6.40 > 2.86 + 1.10 | correct |
| Four vein ostia on the posterior aspect of the atrium | all z ≈ −1.6 to −1.7, atrium centre z −1.15 | correct |
| Superior ostium above inferior, each side | 3.36 > 2.50 and 3.30 > 2.44 | correct |
| Right-lung veins enter medial to the left-lung veins | x 0.66/0.55 vs 2.28/2.40 | correct |

The last one is worth a sentence because it looks wrong and is not. All four
ostia have positive x, which `anatomicalSide()` calls *left* — correct, because
the left atrium is a left-sided chamber. The "right" in *right superior
pulmonary vein* names the lung it drains, not the side of the body its ostium
is on; those veins cross the midline behind the heart to reach the atrium's
right-hand aspect. The test states this explicitly so that a later reader does
not "fix" it.

The mirrored-vessels bug that `anatomy.js` documents at length was checked for
again and has not returned.

## 2. What the render showed that the code did not

Two defects, neither visible in the source, both fixed.

### The consent banner was sitting on the scene console

On a first visit the analytics consent question is pinned to the bottom of the
viewport — which is exactly where every scene pins its console: the stage
steps, Story/Compare/Data, the progression and camera controls. Measured:

| Viewport | Controls covered |
| --- | --- |
| 1440 × 900 | 8 |
| 1280 × 800 | 8 |
| 820 × 1180 | 8 |
| 390 × 844 | the console entirely, all four stage buttons included |

A first-time visitor could not touch the product until they had answered a
question about analytics. It is also the reason this section exists: the
viewport matrix measured overflow, reflow, target sizes and the focus ring, and
had no notion of one thing sitting on top of another, so it passed.

The fix is layout rather than arithmetic. `#ui` is already a flex column with
`justify-content: space-between`; the banner joins that column between the
title bar and the console, so the console cannot be covered at any size. The
first attempt was a `top` and a `max-height` tuned against an 844 px-tall
phone, and it still covered the stage buttons at 320 × 568 — and then, once it
was allowed to be tall, pushed the console off the bottom of the screen
instead. `min-height: 0` is what lets it yield. Both wrong versions were caught
by measuring, not by looking.

`npm run verify:ui` now measures occlusion, and
`TRANSIENT_OVERLAYS` in `src/app/viewports.js` declares the only two elements
allowed to paint over the page — the consent question and the loading veil —
each with the reason it may and the thing it still may not cover.

### The loading veil was being measured instead of the scene

A smaller finding from the same run: the harness waited a fixed 1200 ms before
measuring a scene, which on a narrow viewport was sometimes still the veil. It
now waits for the veil to go.

## 3. Brain atlas — no defects found

Rendered at 1440 × 900 in the default *left lateral* view. Frontal pole at the
viewer's left, occipital at the right, cerebellum below and behind, brainstem
descending: correct for the view the control claims to be showing. The greyed
legend entries are the ones that belong to deeper layers, and the two visible
annotations (central sulcus, middle temporal gyrus) sit on the structures they
name.

**The scene has changed since, and this section has not been redone.** The
fine-anatomy work merged after this review replaced the six flat lobe colours
with a per-gyrus palette across 397 structures, added a natural-anatomy colour
mode and six named viewpoints. Re-rendered after that merge, the left lateral
view is still correct in every relationship checked above, and the consent-banner
fix in §2 holds on it. What has *not* been reviewed is the new colour scheme
itself — each lobe now carries a family of hues around its legend swatch rather
than the swatch's own colour, and whether that reads as one code or two is a
question for whoever reviews that work, not something to settle here.

The framing is markedly better than the heart's — the subject is centred and
fills the frame — which is not an accident: this scene's camera has one subject
and the heart's has to hold a ventricle and an aortic arch at once.

Structure identity is already defended by `tests/brain-anatomy.test.js`, which
checks that labels come from the atlas rather than from prose, so nothing was
added here.

## 4. Left for the clinical reviewer

These are judgement calls about what a picture teaches. An engineering review
should raise them, not settle them.

1. **The pulmonary veins and the left atrium are drawn in the scene's venous
   tint** (`#8d6476`, a dusky red-purple) while the aorta is drawn in an
   arterial red-brown. Anatomically the material is named for the *vessel*, and
   the code is explicit that the dusk is engorged venous *tissue*. But the
   pulmonary veins are the one set of veins carrying oxygenated blood, and the
   left atrium holds the most oxygenated blood in the body. A reader who takes
   red-vs-purple to mean oxygenated-vs-not — which is the convention almost
   every atlas uses — will read this scene backwards, in the one scene whose
   subject is the pulmonary side. The legend does not claim an oxygenation
   code, so this is not a false claim; it may still be a misleading picture.
2. **The proximal pulmonary vasculature reads as claws.** The branching fans
   standing for the vessels beyond the veins have two primaries and two
   secondaries each, of similar length and thickness, ending bluntly. At the
   default framing they read as small hands rather than as a vascular tree.
   Schematic is fine and is declared; this particular schematic may be
   distracting.
3. **The descending aorta drifts laterally** as it leaves the frame — x +3.10
   at the arch end to +5.20 at the bottom of the curve. The real descending
   thoracic aorta stays roughly 2–2.5 cm left of the midline and moves
   *medially* as it descends. It is out of frame in the default view and
   affects nothing the scene teaches, so it was recorded rather than changed:
   moving it alters the silhouette on the right of the frame, and that is a
   composition decision.

Items 1 and 3 are recorded in the heart-failure model card under *what could be
misread*. When a clinical reviewer signs this scene, these are the three
questions to put to them.

## 5. The organ layer

§1–4 review two scenes. This section reviews the layer underneath them:
`src/scenes/<system>/organs/`, where twenty-odd organ builders live and from
which every scene borrows its geometry. It was added because the flagship
review kept finding the same shape of defect — a coordinate that stayed valid
while its meaning moved — and nothing had ever asked the organ builders the
same questions.

**Method.** As above: measured, not looked at. Every builder was constructed
head-less, its label anchors resolved against the actual mesh vertices, its
sides checked against `ANATOMICAL_AXES`, its setters walked through their range
and back, and its nested structures tested for containment at every step. The
three defects in §5.1 were then confirmed in a browser render before and after
the fix.

**Maturity.** The builders fall into two grades, and the difference is real
rather than cosmetic:

| Grade | Builders | What they do that the others do not |
| --- | --- | --- |
| Named structure | `nephron`, `glomerulus`, `airwayTree`, `portalVasculature`, `diaphragm` | Expose landmarks by anatomical name, keep physiology and presentation in separately named values, and are consumed by `alpha`+ scenes that read those landmarks rather than retyping them |
| Named parts | `lungs`, `liver` | The grade above: the organ is **divided into the parts anatomy names**, as separate closed meshes whose union is the organ, each addressable, hideable and measurable on its own — five lobes, eighteen segments, a bronchial tree and the vessels that run with it (§5.4) |
| Sketch | the remaining sixteen | A recognisable silhouette and a shape setter. Correct as far as they go, and explicitly not more |

That split is the intended one — `grand-design.md` §5.4 says not to promote
every prototype — so the finding is not "sixteen organs are behind". It is that
**the sketch grade had no check on its anatomy at all**, and three of them were
wrong.

### 5.1 Three defects, all fixed

**The spleen presented its hilum laterally.** The spleen is a left-sided organ,
so the concave visceral surface — the one the builder's own comment says faces
the stomach and the kidney — has to look medially, at −x. It faced +x. Alone in
the `spleen-filtration` frame that is invisible; in `portal-hypertension`,
which places the liver right of the midline and the spleen left of it, the organ
turned its notch towards the ribs and the splenic vein began 0.53 units away on
the opposite surface. The vein's origin was a literal typed in one file beside
a spleen position typed in another, with nothing holding them together —
architecture rule 1. The builder now derives every face from a declared
`MEDIAL` axis, `portalVasculature` exposes its inflow origins by name, and the
scene places the spleen *by its hilum*: the gap is now 0.000.

**The heart's aorta label sat on the right atrium.** `heart.js` documents at
length that its arch once ran over the patient's right and was corrected to
sweep left. The label anchor was not corrected with it and stayed at x −1.15 —
on the far side of the midline from the vessel it names, nearest surface an
atrium, 0.95 away. Failure mode K. The anchor is now derived from the arch
curve, so the two cannot separate again. The atria were also unnamed, which is
why nothing downstream could have noticed what the label was actually on; they
are now named from the axes.

**Hollow organs rendered at nearly double their declared opacity.** Failure
mode B, in the one place it had not been fixed. `wallMaterial` is double-sided
by definition — that is what it is for — so a ray crosses a closed tube twice
and two layers of `a` transmit `(1 − a)²`. Every GI organ used it, and every
scene that draws one puts a flow stream *inside* it:

| Organ | Asked for | Rendered at | Contents visible |
| --- | --- | --- | --- |
| Stomach | 0.84 | 0.97 | 2.6% where 16% was intended |
| Small bowel, colon | 0.96 | 0.998 | 0.16% where 4% was intended |
| Duodenum, oesophagus | 0.90 | 0.99 | 1% where 10% was intended |

`wallMaterial` now inverts the composite, so its argument means the appearance
wanted. Measured on a real render at 1440×900: `intestinal-transit` went from
137 to 1938 pixels of visible contents, and the brightest contents pixel in
`upper-gi-peristalsis` went from 41 to 84 on a yellowness scale. The mean over
the whole organ barely moves in the stomach, which is worth recording — the
first metric tried said "no change" because it had been tuned on the bowel's
tan wall and did not fire over the stomach's pink one. A proxy again.

### 5.2 Checked and correct

Measured, and right: the right lung is the larger and each lung is on its own
side; the right main bronchus leaves the carina at 54° against the left's 66°;
the thyroid lobes, the liver's lobar wedge, the stomach's fundus-to-pylorus
run, and the colon's ascending/descending sides all sit where they are named;
both kidneys turn their hila medially and every filtration path arrives at the
collecting system; the adrenal and renal medullae stay inside their cortices,
and the bladder's contents and the endometrium stay inside their walls across
the whole range of their setters; all nine shape setters return the organ to
where it started.

`tests/organ-anatomy.test.js` holds all of it. It is deliberately written the
way `semantic-anatomy.test.js` is — assertions about bodies, not about this
repository's numbers, with sides taken from `ANATOMICAL_AXES` rather than from
the sign of x written out by hand.

### 5.4 The lung, rebuilt from a silhouette into an organ

The audit above put `lungs.js` in the *named structure* grade. That was
generous. Its fissures were `v.multiplyScalar(1 - 0.1 * exp(...))` — shallow
grooves scratched into one surface — so the lung **looked** lobed and had no
lobes in it: nothing to hide, nothing to colour, nothing whose volume could be
asked for. It has been rebuilt.

**What it has now**, each fixed by a test in `tests/lung-anatomy.test.js`:

| | |
| --- | --- |
| Lobes | Five closed meshes whose union is the parenchyma — three right, two left, cut by an oblique fissure on both sides and a horizontal fissure on the right only |
| Volumes | RUL 36% / RML 12% / RLL 52% of the right lung; 50/50 on the left. The fissure positions were **calibrated** to the shares volumetry reports and nothing else |
| Partition | Every point in the lung falls in exactly one lobe — sampled, not asserted |
| Segments | Eighteen, named in both languages: ten right, eight left (no left S7, apicoposterior fused, lingula in the left upper lobe). Each placed where its own name says it is, and the placement is what the test checks |
| Airways | trachea → main → lobar → segmental, with the right main bronchus wider, shorter and steeper than the left |
| Vessels | An artery with every bronchus — the bronchoarterial pair — and veins running **between** segments, which is the fact a segmentectomy plane is found by |
| Hilum | RALS: the artery anterior to the bronchus on the right, superior on the left, with both veins below |

**Method.** The lobes are carved rather than modelled: a lung built by warping
a sphere is star-shaped about an interior point — measured, not assumed — so a
lobe is the lung intersected with half-spaces, and that intersection can be
built by asking each direction which comes first, the surface or the cut. The
machinery is `src/scenes/shared/geometry/carve.js` and it is organ-agnostic;
the liver and the kidney satisfy the same precondition.

**Four defects were found by measuring, and each is in the playbook now** (§2.5):
a plane normal carried into an anisotropic frame like a point, which made the
five lobes sum to 214% of the lung; a hand-written lobe centre that sat outside
its own lobe, which made the right middle lobe four times its size; a
fixed-point iteration that converged only when the part's centre was near the
organ's and silently did not otherwise; and a radial field sampled on a grid
32× finer than the surface feeding it, which rounded the cardiac notch away.
None of them was visible in the code and none would have failed a unit test
that only asked whether the geometry was finite.

**Still schematic.** The outer shape is unchanged and is still not from a scan.
The fissures are flat where real ones are curved and frequently incomplete. The
segment boundaries are a distance rule — the lung nearer this segmental bronchus
than any other — which is a model of the *definition* of a segment rather than a
tracing of a specimen. The lobar volume fractions are a target this repository
hit, not a measurement it made.

### 5.5 The liver, divided the way surgery divides it

Same method, applied to the organ whose division matters most surgically. The
liver's fissure was a groove too — the falciform ligament, scratched into the
surface — and, worse, nothing in the file distinguished it from the plane that
actually divides the right liver from the left. It does now.

| | |
| --- | --- |
| Segments | Nine closed meshes whose union is the parenchyma: the eight Couinaud segments, with IV carried as its superior and inferior halves |
| Sectors | Five, grouped as a resection is planned: caudate, left lateral, left medial, right anterior, right posterior |
| Volumes | 2 / 16 / 17 / 33 / 32 per cent — **calibrated** to the shares the literature reports, and the only fitted numbers here |
| Partition | Every point in the liver falls in exactly one segment — sampled, not asserted |
| Cantlie's line | The plane of the middle hepatic vein divides right liver from left. **The falciform ligament does not**, and the test holds them apart by a real distance |
| Hepatic veins | Drawn **on** the planes that separate the segments, projected onto them rather than positioned near them |
| Portal pedicles | Drawn **inside** the segments they supply, and each one is checked to end in its own segment |
| Caudate | Belongs to neither the right liver nor the left, takes a pedicle from both portal branches, and drains straight into the cava by its own veins |

**Two defects, both found by measuring.** Segments VI and VII carried no
Cantlie bound, so they reached across the midline and overlapped segment IV —
0.67% of the liver was in two segments at once. And the middle hepatic vein,
positioned by a typed coordinate, started a quarter of the organ off the
oblique plane it *is*; it is projected onto its plane now, because being on the
boundary is the fact about a hepatic vein.

**The largest simplification is the caudate.** A box describes it and a box
cannot be cut from half-spaces — the complement of one is a union, not an
intersection — so bounding it sideways left slivers behind segments II and VII
belonging to no segment at all. Taken as a posterior slab it partitions
cleanly, at the cost of calling a thin posterior shaving of its neighbours
"caudate". That is recorded in `liverAnatomy.js` where the plane is defined.

### 5.3 Recorded, not changed

- **The whole-body view's kidney label points into a region where nothing is
  visible.** The kidneys are drawn behind the bowel, which is the retroperitoneal
  point, and the file already says an organ nobody can see teaches nothing. It
  is a composition decision for that scene, not an anatomy defect.
- **`brain.js` is a landmark blob and the brain atlas is a specimen mesh.**
  That is the same intentional split the heart has, but the builder's comment
  sent readers to the amyloid-β scene as the place the nervous system is looked
  at properly. The specimen-derived atlas arrived afterwards and the pointer was
  not moved; it now names the atlas. No geometry changed.

## 6. Not covered by this review

- The remaining scenes. The gate names the flagships; the rest are reviewed
  when they are promoted past `prototype`.
- Whether the physiology is right. That is the evidence dossier's job, and it
  is unchanged by this.
- Colour perception. Every distinction this scene carries in hue is also
  carried by a label or a shape, but that has not been checked against a
  simulation of the common deficiencies, and it belongs with the accessibility
  work in [`accessibility.md`](accessibility.md) §3.
