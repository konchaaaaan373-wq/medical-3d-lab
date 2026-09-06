# Scene proposal — pneumonia

## Central question

Why does alveolar consolidation cause hypoxaemia even though blood is still
flowing through the involved lung?

## Why 3D?

The mechanism is regional: air movement disappears from a clustered part of
the lung while perfusion remains in the same space. Seeing those two processes
co-located makes shunt easier to distinguish from dead space.

## Medical model

Twelve parallel regional units. Consolidation reduces ventilation in a unit;
hypoxic pulmonary vasoconstriction diverts part, but never all, of its
perfusion. The output is the fraction of model perfusion reaching consolidated
units. No gas tension or saturation is calculated.

## Interactive element

The slider changes the fraction of this teaching lung occupied by
consolidation. It is not illness severity, elapsed time or a radiographic score.

## Visual outputs

- Cyan expansion: regional ventilation
- Amber fill: alveolar consolidation
- Red orbit: perfusion
- Model indices: consolidated fraction, ventilated fraction, shunt fraction

## Accepted simplifications

The twelve units are not acini or CT segments. Distribution is deterministic
and clustered only for legibility. Pathogen, immune response, compliance,
secretions, respiratory drive, PaO2, SpO2, imaging and treatment are absent.

## Validation

More consolidation must reduce ventilation; perfusion of consolidated units
must remain above zero; hypoxic vasoconstriction may reduce but not abolish the
model shunt; every visual channel must read the same regional solve.
