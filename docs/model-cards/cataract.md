# Model card — lens opacity: in the way, or beside it

| | |
| --- | --- |
| **Scene ID** | `cataract` |
| **Route** | `#/cataract` |
| **Model** | [`src/models/cataract.js`](../../src/models/cataract.js) |
| **Evidence** | [`../model-evidence/cataract.md`](../model-evidence/cataract.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When part of the lens clouds, what decides whether it is in the way?

## 2. Model type

A geometric model, solved in closed form: two concentric discs on the eye
atlas's own lens. A chosen kind of opacity occupies a named band; a chosen
aperture is a disc over it; and the model reports their intersection as a share
of the aperture.

Both controls are **scenarios and not severities**: three places and two
apertures, and nothing here says one becomes another.

## 3. What it is not

**There is no vision in this model.** No acuity, no contrast sensitivity, no
glare, no colour and no refraction, and nothing converts the share it reports
into any of those. **There is no indication for treatment**: nothing says when a
lens should be replaced, treated or left alone. There is no light physics at all
— nothing is scattered, refracted or absorbed, and a ray either crosses the
clouded area or does not. There is no time, no progression and no cause.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `kind` | one of four | Where the cloudiness is, or nowhere |
| `pupil` | narrow or wide | How open the aperture is |
| `density` | 0–1 | How opaque the clouded part is |

## 5. Outputs

- How much of the lens's own face the opacity covers
- **How much of the open aperture it stands in** — the model's one real output
- That share weighted by the density
- The band it occupies, and the aperture's radius
- An explicit `vision: null`

## 6. State variables

None. `solveCataract()` is a pure function of the axis and two controls.

## 7. Governing relations

```text
inPath  = (min(to, aperture)² − min(from, aperture)²) / aperture²
blocked = inPath · density
```

The band is fixed and the aperture disc grows, which is the whole of the
reversal: a band outside the aperture contributes nothing at any density, and a
band inside it contributes all of itself.

## 8. Constants and calibration

Two kinds, neither a measurement. The lens's radius and the pupil the atlas
draws are the eye atlas's own, re-measured by a calibration test. The three
bands and the two apertures were chosen so that one aperture contains the middle
alone and the other most of the lens — and what they have to deliver is **the
reversal**, which is what the test fixes rather than the values.

## 9. Visual mapping

- The lens is drawn **face-on**, and the cloud, the aperture and their overlap
  are three flat rings on one plane in front of it. An intersection of two rings
  cannot be judged by eye from an oblique view of a lens inside an eyeball.
- The overlap is **its own shape**, built at the radii where the two meet —
  which means the coloured area on screen *is* the number in the read-out, and a
  test checks that its area over the aperture's equals the reported share.
- The axis moves **how solidly the cloud is drawn and nothing else**: no
  geometry moves with the density.
- Both shares are printed side by side with equal weight, because the scene's
  point is that the first does not give you the second.

## 10. Known failure modes

- An even band at a single depth, and the depth is used for drawing only.
- Three places standing for a range of them; two apertures for a continuum.
- Circles about one axis: no astigmatism of the opacity, no off-axis rays.
- No light: a ray crosses the clouded area or it does not.

## 11. Where it will mislead

**A percentage beside a clouded lens reads as a percentage of light.** It is a
percentage of a hole. Nothing here is transmitted, scattered or absorbed.

**A share rising towards a hundred per cent invites a decision.** That decision
rests on things this model has none of: what somebody needs to do, what they can
see, and what they want.

**A wide pupil reads as darkness.** This model has no light in it, so it cannot
have a response to light in it either.

## 12. Safety boundary

Never use the model to estimate an opacity, an area or any dimension, to infer
acuity, contrast, glare or any visual measure, to decide whether or when a lens
should be treated or replaced, to grade a cataract, or to infer its cause.

## 13. Uncertainty

The pupil as the aperture, the three named locations, and the geometry of two
concentric discs are standard. What this model cannot support is any magnitude,
any optical consequence and any decision: how opaque a given lens is, what it
does to light, and what anybody should do about it.

## 14. Evidence and review

The dossier records the aperture deciding what is in the path, the three places
as locations rather than degrees, the independence of the two shares, and the
reversal with aperture size as the externally supported claims, and declares the
atlas's lens and pupil and the bands and apertures as things this repository
chose. Independent clinical sign-off has not been recorded; the public review
state is `pending`.

## 15. Verification

```bash
node --test tests/cataract-physiology.test.js
node --test tests/cataract-model.test.js
node --test tests/calibration.test.js
```

One model test checks that the coloured overlap's own area, over the aperture's,
equals the share the read-out prints — so the picture cannot drift from the
number it is illustrating. A calibration test fixes the reversal rather than the
constants that produce it.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `cataract`). It walks the same three stages and stops where §12 does. No step
names a test, an operation or a risk, no step says anything about sight, and the
step about what a person might notice is marked `associated` and says on screen
that it is not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to `src/models/cataract.js`.
A change to it must revise this card before its digest is adopted.
