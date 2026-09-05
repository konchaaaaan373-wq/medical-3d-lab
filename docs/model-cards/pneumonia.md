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
| `consolidatedFraction` | 0–1 | Non-aerated fraction of this teaching lung; exposed as the progression axis |
| `hypoxicVasoconstriction` | 0–1; default 0.55 | Relative strength of perfusion diversion; fixed in the current UI |

Neither input is clinical severity, elapsed time or an imaging score.

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
measurements. They are neither. Clustered spheres do not reproduce radiographs,
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
persisting perfusion, bounded HPV diversion and finite 0–1 outputs.

## 16. Revision identity

`docs/model-cards/revisions.json` binds this card to `src/models/pneumonia.js`
and `src/data/pneumonia.js`. A change to either must revise this card before its
digest is adopted.
