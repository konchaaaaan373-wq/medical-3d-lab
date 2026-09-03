import { CONFIDENCE, LAYER, defineEvidence } from './evidence.js';

/** Claim-level evidence contract for the HFpEF pressure-volume alpha model. */
export const HFPEF_EVIDENCE = defineEvidence('hfpef', [
  {
    id: 'stiff-edpvr',
    claim:
      'Increasing passive LV chamber stiffness raises diastolic pressure at a given ventricular volume, shifting the end-diastolic pressure-volume relationship upward/leftward.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Zile MR, Baicu CF, Gaasch WH. N Engl J Med. 2004;350:1953–1959. PMID 15128895, DOI 10.1056/NEJMoa032566.',
    validation: 'physiology: increasing passive LV stiffness shifts the EDPVR upward at the same volume',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'preserved-ef-high-filling-pressure',
    claim:
      'Pathologically elevated cardiac filling pressure can coexist with preserved LV ejection fraction; preserved EF is not evidence that filling pressure is normal.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Omote K, Hsu S, Borlaug BA. Cardiol Clin. 2022;40:459–472. PMID 36210131; Borlaug BA et al. JACC Scientific Statement 2023. PMID 37137592.',
    validation: 'physiology: elevated filling pressure can coexist with preserved ejection fraction',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'stress-pressure-reserve',
    claim:
      'A filling or exercise challenge can expose a disproportionately large rise in cardiac filling pressure in HFpEF compared with control physiology.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Andersen MJ et al. Circ Heart Fail. 2015;8:41–48. PMID 25342738; Reddy YNV et al. JACC Heart Fail. 2018. PMID 29803552.',
    validation: 'physiology: a filling challenge raises pressure more steeply in the stiff ventricle',
    layer: LAYER.EXTERNAL,
    note:
      'The external claim is the direction of the pressure reserve abnormality. This model’s filling control is not exercise and is not a saline dose.',
  },
  {
    id: 'single-passive-mechanism',
    claim:
      'The scene treats passive LV EDPVR stiffness as the only disease-varying mechanical property while holding systolic Ees and end-systolic pressure fixed.',
    confidence: CONFIDENCE.APPROXIMATION,
    source:
      'A deliberate isolation experiment. Real HFpEF includes active relaxation, atrial, vascular, pericardial, right-heart and systemic mechanisms.',
    note:
      'Useful for showing why preserved EF does not guarantee low filling pressure; unsuitable as a complete HFpEF phenotype model.',
  },
  {
    id: 'reference-pv-calibration',
    claim:
      'Reference EDV, HR, Ees, V0, end-systolic pressure and EDPVR coefficients are chosen to produce a plausible preserved-EF resting reference.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Textbook-scale pressure-volume values used as an educational calibration target.',
    note:
      'These are not measurements of a person and no diagnostic threshold may be inferred from them.',
  },
  {
    id: 'stiffness-range',
    claim:
      'The stiffness coefficient B rises from 0.0277 to 0.0355 /mL across the slider.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source establishes this displayed range as a clinical severity scale.',
    note:
      'Chosen so the pressure contrast is visible while EF and systolic mechanics stay fixed. The slider is not a measured stiffness index.',
  },
  {
    id: 'filling-control',
    claim: 'The filling control moves EDV from 90% to 110% of the reference chamber volume.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A bounded perturbation chosen for tactile teaching.',
    note: 'Not a saline volume, preload pressure, intravascular volume or treatment dose.',
  },
  {
    id: 'wall-thickness-cue',
    claim: 'Displayed wall thickness increases from 9 to 13 mm across the stiffness axis.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for this coupling. It is a structural visual cue only.',
    note:
      'Wall thickness does not enter the EDPVR equation here and the scene does not claim a fixed mapping from hypertrophy to stiffness.',
  },
  {
    id: 'pv-loop-interpolation',
    claim: 'The displayed path between the four PV-loop corners is an authored interpolation.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'The model has no valves or time-varying elastance and therefore cannot generate real phase timing.',
    note:
      'EDPVR/ESPVR and the corner states are model-derived. The connecting path must not be read for valve timing, stroke work or waveform morphology.',
  },
  {
    id: 'pressure-cue-not-congestion-model',
    claim: 'Pulmonary-blue opacity is driven from LVEDP as a visual filling-pressure cue.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. The model contains no pulmonary circulation or lung-water equation.',
    note:
      'The cue is not PCWP, pulmonary edema severity, lung water or a patient-specific threshold.',
  },
  {
    id: 'hfpef-heterogeneity',
    claim:
      'HFpEF is a heterogeneous clinical syndrome and cannot be reduced to passive LV stiffness alone.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A boundary emphasized by contemporary HFpEF reviews and scientific statements, including PMID 37137592.',
    note:
      'The uncertainty label describes the model’s incompleteness, not uncertainty that other HFpEF mechanisms exist.',
  },
]);
