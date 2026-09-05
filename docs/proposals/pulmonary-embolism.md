# Scene proposal — pulmonary embolism

## Central question

Why does pulmonary embolism create ventilated but underperfused lung, and why
does removing vascular pathways increase right-ventricular afterload?

## Why 3D?

The clot, the blocked vascular branch and the still-moving distal air unit can
be viewed together. That spatial mismatch is the distinction from pneumonia.

## Medical model

Twelve parallel vascular territories at a fixed model driving pressure.
Obstruction removes conductance while ventilation is held constant. Summed
conductance yields a relative pulmonary vascular resistance; the ventilation
paired with lost perfusion yields an underperfused-ventilation index.

## Interactive element

The slider increases obstructed vascular territory within a bounded teaching
range. It is not CT clot burden, clinical severity or a mortality-risk score.

## Visual outputs

- Cyan expansion: ventilation that continues
- Red branches and moving markers: perfusion
- Orange objects: vascular obstruction
- Model indices: territory involved, underperfused ventilation, relative PVR

## Accepted simplifications

The vasculature is twelve parallel pathways, not a pulmonary arterial tree.
Vasoconstrictors, recruitment, cardiac output adaptation, RV geometry,
oxygenation, carbon dioxide, infarction and treatment are absent.

## Validation

Ventilation must not fall merely because perfusion is blocked; conductance must
fall monotonically; relative PVR and underperfused ventilation must rise; no
output may be labelled as a measured pressure, VD/VT or RV function.
