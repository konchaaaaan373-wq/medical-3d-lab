# Model card — pneumonia: consolidation and shunt

| | |
| --- | --- |
| **Scene ID** | `pneumonia-consolidation` |
| **Route** | `#/pneumonia` |
| **Model** | [`src/models/pneumonia.js`](../../src/models/pneumonia.js) |
| **Evidence** | [`../model-evidence/pneumonia.md`](../model-evidence/pneumonia.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When alveolar air is replaced by inflammatory fluid and cells, what happens if
pulmonary perfusion continues through that non-ventilated fraction?

## 2. Model type

A deterministic twelve-region V/Q teaching model. Every region is divided
conceptually into an aerated share and a consolidated, non-aerated share.
Hypoxic pulmonary vasoconstriction diverts some perfusion away from the latter
without abolishing it.

## 3. What it is not

It is not a pathogen, immune, imaging, respiratory-mechanics, oxygenation or
treatment model. It does not simulate pneumonia over time or represent a
specific lobar/segmental distribution.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `consolidatedFraction` | 0–1 (solver domain) | Non-aerated fraction of this teaching lung |
| `hypoxicVasoconstriction` | 0–1; default 0.55 | Relative strength of perfusion diversion; fixed in the current UI |

**Solver domain and teaching range are different things.** The solver accepts
the whole interval and `1` is kept as a boundary condition: a fully
consolidated lung proves that ventilation reaches zero while perfusion does
not. The public scene's progression axis maps `0–1` onto
`consolidatedFraction = progress × PNEUMONIA_TEACHING_MAX_CONSOLIDATION`
(0.6), so a reader is never walked into a lung with no aerated share as if it
were a stage of pneumonia. Neither input is clinical severity, elapsed time or
an imaging score.

## 5. Outputs

- Per-region consolidation, ventilation, relative perfusion conductance and
  normalised perfusion share
- Whole-model consolidated fraction and ventilated fraction
- Perfusion reaching consolidated subfractions (`shuntFraction`)

All outputs are dimensionless model fractions.

## 6. State variables

None over time. `solvePneumonia()` is a pure equilibrium mapping from the two
inputs to twelve regional outputs. The breathing phase belongs to presentation.

## 7. Governing relations

```text
consolidation_i = clustered fraction selected by the teaching axis
ventilation_i   = 1 − consolidation_i
conductance_i   = 1 − 0.72 · HPV · consolidation_i
perfusion_i     = conductance_i / Σ conductance
model shunt     = Σ(perfusion_i · consolidation_i)
```

The shunt expression reads each region as aerated and consolidated
subfractions; it does not call the whole partially consolidated region a shunt.

## 8. Constants and calibration

Twelve units, their ordering and the gain `0.72` are illustrative. They are not
fitted to a cohort, scan or patient. No clinical threshold is encoded.

## 9. Visual mapping

- Cyan expansion/opacity reads regional ventilation
- Amber opacity/size reads consolidation
- Red orbit brightness and marker motion read relative perfusion

Sphere size, orbit radius and animation rate are presentation values. The
read-out and the geometry consume the same solve.

## 10. Known failure modes

- Equal regional units hide real lobar, segmental and gravitational variation.
- One scalar HPV response cannot reproduce heterogeneous vascular responses.
- No compliance or airway model means work of breathing cannot be inferred.
- The model shunt fraction is not a clinically measured shunt fraction.

## 11. Where it could mislead

The slider can look like disease progression, and the percentages can look like
measurements. They are neither. Full travel of the slider consolidates 60% of
this conceptual lung; that is the end of the teaching axis, not a severity. Clustered spheres do not reproduce radiographs,
CT, acini or named bronchopulmonary segments.

## 12. Safety boundary

Never use the model to diagnose pneumonia, infer an organism, estimate PaO2 or
SpO2, interpret imaging, select antimicrobials or respiratory support, or
predict an individual response.

## 13. Uncertainty

Real pneumonia can be lobar, bronchopneumonic, multifocal or diffuse. Regional
ventilation, perfusion, recruitment and HPV vary. This model claims the sign of
one textbook mechanism only.

## 14. Evidence and review

The evidence dossier records an open V/Q review and the ATS/IDSA adult CAP
guideline boundary. Independent clinical sign-off has not been recorded; the
public review state remains `pending`.

## 15. Verification

```bash
node --test tests/pneumonia-model.test.js
```

The tests fix the reference state, monotonic ventilation loss and shunt rise,
persisting perfusion, bounded HPV diversion, finite 0–1 outputs for any input
(including `NaN` and `±Infinity`), the solver boundary at total consolidation,
and — in `tests/pneumonia-scene.test.js` — that the scene's slider never drives
the solver past the 60% teaching range.

## 16. Who it is said to, and where it stops

There is now a patient-facing explanation of this scene
(`src/data/patientGuides.js`, id `pneumonia-consolidation`). It walks the same
four stages this card describes and it stops where this model stops.

**Six steps, and the last two are marked.** Steps one to four say what the model
solves: every region getting both air and blood, one region's air spaces filling,
blood continuing past that region, and diversion that is partial. Step five says
that how much oxygen reaches a person is *not* something this screen works out —
because section 12 of this card says it must not be — and step six, about cough,
fever and effortful breathing, is marked `associated` rather than told as a
consequence. Both marked steps say on screen that they are not drawn from the
model.

**No step names an organism, an antibiotic or an image**, and no step gives a
percentage: the fractions this model produces are fractions of twelve
illustrative units, and section 11 is clear about how easily those read as
measurements.

**Onward scenes are declared, with the sentence that has to travel with them.**
`RELATED` in `src/data/pneumonia.js` points at the embolism scene — the same
mismatch in the opposite direction — and at the oedema scene, which fills the
same air spaces with something else and *does* solve the blood values this
model excludes. The note carried with both links says they are separate models
and that no value passes between them.

`tests/respiratory-guides.test.js` holds the pairing, the marks and the copy
limits; `scripts/check-patient-explanation.mjs` drives the walk in a browser and
fails when a step points at something the reader cannot see.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to `src/models/pneumonia.js`
and `src/data/pneumonia.js`. A change to either must revise this card before its
digest is adopted.
