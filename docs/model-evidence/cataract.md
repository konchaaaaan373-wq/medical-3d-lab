# Evidence — lens opacity: in the way, or beside it

Model: [`src/models/cataract.js`](../../src/models/cataract.js).
Boundary and failure modes: [`../model-cards/cataract.md`](../model-cards/cataract.md).
Machine-readable registry: `CATARACT_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of two concentric discs. **Nothing
here is a measurement, a transmission, a sight or an indication**, and in
particular the share reported is **an area inside a drawn hole**. No row rests
on a paper this repository could open: the build environment cannot reach the
medical publishers.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `only-what-is-behind-the-opening` — light reaches the back of the eye through the pupil, so only the lens behind that opening is in the way | Standard descriptions of the pupil as the aperture | The intersection is taken against the aperture disc, and a band outside it contributes nothing | Circles about one axis | `physiology: only the part of the lens behind the opening is in the way of anything` |
| `three-places-in-the-lens` — nuclear, cortical and posterior subcapsular are three locations, not three degrees | Standard descriptions of the three as distinct sites | Three named bands, one of which begins outside where another ends | Three places standing for a range of them | `physiology: a clear lens is clear, and three places are not three stages` |
| `area-in-the-lens-is-not-area-in-the-path` — the first number does not give the second | The geometry of two concentric discs over the atlas's own lens and pupil | Both shares are computed and both are reported | An even band | `physiology: how much of the lens has clouded does not say how much is in the way` |
| `the-aperture-decides-which-matters` — opening the pupil reverses which of two opacities is in the way, without either changing | A consequence of the same geometry | The band is fixed and the disc grows | Two apertures standing for a continuum | `physiology: opening the pupil reverses which one is in the way` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-lens-and-pupil` | The lens's radius across the light's way and the pupil the atlas draws | Illustrative, measured off `buildEyeball()`. Both shares are shares of drawn circles |
| `the-bands-and-the-two-apertures` | The radii of each named opacity, and the two pupil sizes | Calibrated so one aperture contains the middle alone and the other most of the lens. **What they have to deliver is the reversal**, and that is what the test fixes rather than the values |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `the-share-is-not-a-transmission` | A percentage beside a clouded lens reads as a percentage of light | It is a percentage of a hole. There is no light physics here: nothing is scattered, refracted or absorbed |
| `no-vision-is-produced-or-implied` | A clouded lens reads as a person who cannot see | No acuity, contrast, glare, colour or refraction. The read-out prints "not in this model" where sight would go |
| `no-indication-for-anything` | A share rising towards a hundred per cent invites a decision | The decision rests on things this model has none of: what somebody needs to do, what they can see, and what they want |
| `two-apertures-are-not-two-light-levels` | A wide pupil reads as darkness | This model has no light, so it cannot have a response to light either |
| `an-even-band-at-one-depth` | A tidy ring reads as a shape somebody has | A real opacity is neither even nor confined to a band. The depth is carried for the drawing alone |
| `no-time-and-no-cause` | Three places in a list read as three stages | Nothing connects them, and there is no age, steroid, diabetes or trauma here |

## 4. What is outside the model entirely

- **All vision**, and **every indication for treatment**.
- All light physics: scattering, refraction, absorption.
- Time, progression and cause.

## 5. How to check it

```bash
node --test tests/cataract-physiology.test.js  # Layer 1: the four propositions
node --test tests/cataract-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js          # the two things this repository chose
```
