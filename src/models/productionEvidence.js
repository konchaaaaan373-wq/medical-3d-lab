import { CONFIDENCE, LAYER, defineEvidence } from './evidence.js';

/**
 * Evidence contracts for the two original production scenes.
 *
 * These lived before the repository adopted versioned clinical-review dossiers.
 * Keeping them in a separate module makes the migration explicit: the claims are
 * now machine-checkable, but neither scene becomes `reviewed` until a current
 * clinical reviewer signs a specific commit in docs/clinical-reviews/registry.json.
 */

export const HEART_FAILURE_EVIDENCE = defineEvidence('heart-failure', [
  {
    id: 'frank-starling',
    claim: 'Within the preload reserve, greater ventricular filling raises end-diastolic volume and increases stroke volume.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Frank-Starling physiology; PMID 1478214 and standard cardiac physiology.',
    validation: 'physiology: raising preload raises end-diastolic volume and stroke volume',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'afterload-mismatch',
    claim: 'At fixed contractility, a higher afterload impairs ventricular emptying, increasing end-systolic volume and reducing stroke volume.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Afterload-mismatch physiology; PMID 1278221 and PMID 6220896.',
    validation: 'physiology: raising afterload reduces stroke volume at fixed contractility',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'contractility-ejection',
    claim: 'Reduced ventricular contractility shifts end-systolic behaviour toward poorer emptying, with higher end-systolic volume and lower ejection fraction.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Time-varying elastance / ESPVR literature; PMID 2271404, PMID 16150150.',
    validation: 'physiology: reducing contractility lowers ejection fraction and raises end-systolic volume',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'left-filling-pressure-backup',
    claim: 'When left-sided filling pressure rises, left atrial and pulmonary venous pressures rise together, providing the haemodynamic route to pulmonary congestion.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Standard left-heart and pulmonary venous haemodynamics; heart-failure physiology.',
    validation: 'physiology: greater left-sided filling raises both atrial and pulmonary venous pressure',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'time-varying-elastance',
    claim: 'The ventricle is represented by a time-varying elastance chamber coupled to a lumped closed circulation.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'Suga-Sagawa elastance is established as a cardiac mechanics framework; the seven-compartment implementation is this repository’s simplification.',
    note: 'An approximation of a whole circulation, not a patient-specific pressure-volume model and not a distributed vascular-wave model.',
  },
  {
    id: 'ideal-valves',
    claim: 'All four cardiac valves are represented as ideal one-way resistances with no leaflet mechanics, stenosis or regurgitation.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'A lumped-circulation modelling choice rather than a claim that real valves behave as ideal diodes.',
    note: 'Useful for enforcing forward flow; unsuitable for teaching valve disease or valve energetics.',
  },
  {
    id: 'illustrative-remodelling-axis',
    claim: 'The slider follows one chosen path from a reference ventricle through concentric hypertrophy, dilation and reduced systolic function.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source establishes this sequence as a universal natural history; it was chosen as one teachable HFrEF pattern.',
    note: 'Illustrative ordering only. Patients need not pass through these states, and HFpEF follows a different phenotype space.',
  },
  {
    id: 'congestion-rendering-map',
    claim: 'Pulmonary venous pressure is mapped to a 0–1 congestion overlay and an interstitial-fluid overlay over chosen pressure bands.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'Clinical filling-pressure landmarks informed the range, but the displayed mapping itself was chosen for teaching visibility.',
    note: 'Illustrative rendering, not a threshold law, lung-water measurement, or prediction of when an individual develops oedema.',
  },
  {
    id: 'reference-circulation',
    claim: 'The reference chamber and vascular parameters are tuned so the solved baseline lands in broadly physiological resting ranges.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Textbook haemodynamic ranges used as calibration targets.',
    note: 'Calibration values are not measurements of a person; they only anchor this educational reference case.',
  },
  {
    id: 'atrial-passive-curve',
    claim: 'A single exponential passive pressure-volume term is used to keep the left atrium and pulmonary venous compartment coupled in a plausible range.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Chosen so the lumped atrial compartment reproduces a plausible pressure relationship; no claim of measured atrial compliance.',
    note: 'Calibration of one lumped compartment, not a clinical atrial compliance measurement or a viscoelastic wall model.',
  },
  {
    id: 'resting-output-trajectory',
    claim: 'Along the chosen slider path, resting cardiac output remains relatively preserved for part of the trajectory before falling modestly.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'Some HFrEF patients preserve resting output, but the exact trajectory here follows co-varying invented/chosen loads and is not a clinical invariant.',
    note: 'Known limitation: the shape of this trajectory must never be presented as the natural history or expected output of an individual patient.',
  },
  {
    id: 'missing-heart-failure-phenotypes',
    claim: 'HFpEF, primary right-heart failure, valvular disease, pulmonary hypertension and explicit neurohumoral regulation are absent from this model.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A stated modelling boundary; these mechanisms and phenotypes are central to real heart failure but outside this scene.',
    note: 'The model answers one HFrEF mechanics question. Extrapolation to omitted phenotypes can point in the wrong direction and is not supported.',
  },
]);

export const AMYLOID_BETA_EVIDENCE = defineEvidence('amyloid-beta', [
  {
    id: 'physiological-abeta-production',
    claim: 'Amyloid-β is a normal soluble product of cellular metabolism and is present under physiological conditions rather than appearing only in Alzheimer disease.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Selkoe, Trends Neurosci 1993; PMID 7504355; modern Aβ production/clearance reviews.',
    validation: 'physiology: soluble amyloid beta is present before aggregated species appear',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'species-coexist',
    claim: 'Soluble monomeric and oligomeric Aβ and fibrillar/plaque-associated assemblies can coexist; a high-aggregation state is not a complete replacement of one species by the next.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Aβ assembly and oligomer reviews, including PMID 20148964; the literature describes heterogeneous soluble and fibrillar populations.',
    validation: 'physiology: multiple amyloid beta assembly states coexist rather than replacing one another',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'extracellular-plaque',
    claim: 'Senile amyloid plaques are extracellular deposits containing fibrillar amyloid-β.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Neuropathology of Alzheimer disease; PMID 27258414 and PMID 20148964.',
    validation: 'physiology: plaque deposits are represented outside the neuronal soma',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'single-aggregation-axis',
    claim: 'A single scalar axis orders monomer, oligomer, fibril and plaque prominence for teaching.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'The named assembly states are biologically grounded, but real aggregation is branched, heterogeneous and dynamically interconverting rather than one scalar coordinate.',
    note: 'Approximation for navigation only; it is not elapsed disease time, a kinetic reaction coordinate, clinical stage or symptom severity.',
  },
  {
    id: 'particle-scale',
    claim: 'Particles, fibrils, plaques and the neuron are drawn at deliberately non-molecular relative scales.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for the displayed scale; sizes were chosen so all assembly states remain visible in one 3D teaching scene.',
    note: 'Illustrative geometry only. No distance, particle diameter or plaque size can be measured from the scene.',
  },
  {
    id: 'species-fractions',
    claim: 'The high-aggregation frame retains visible fractions of monomer, oligomer and fibril alongside plaque.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for the displayed fractions; they were chosen to make coexistence visible rather than to reproduce tissue concentrations.',
    note: 'Illustrative fractions. The model asserts coexistence, not the percentage allocated to each assembly state.',
  },
  {
    id: 'particle-thresholds',
    claim: 'Each particle is assigned ordered progression thresholds that decide when it is drawn as oligomer, fibril or plaque.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No biological source for per-particle thresholds; they are deterministic visual scheduling values.',
    note: 'An invented rendering mechanism, not molecular kinetics or a measured aggregation probability.',
  },
  {
    id: 'one-way-visual-particles',
    claim: 'While the slider moves right, each rendered particle only advances and never visibly returns to an earlier assembly state.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'Real Aβ assemblies can interconvert and disassemble; strict one-way particle motion is a presentation simplification.',
    note: 'Known one-sided error. The population can show coexistence, but individual particles do not reproduce reversible molecular exchange.',
  },
  {
    id: 'no-clinical-cognition',
    claim: 'The model contains no cognition, symptoms, clinical staging or patient-level relationship between plaque burden and impairment.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A deliberate boundary; plaque burden is not interchangeable with clinical severity, and synaptic pathology correlates with cognition differently (e.g. PMID 8239314).',
    note: 'Any attempt to infer MMSE, dementia severity, prognosis or an individual diagnosis from the slider would be unsupported.',
  },
  {
    id: 'no-tau-or-neuroinflammation',
    claim: 'Tau pathology, microglial and astrocytic responses, APP processing, ApoE effects and Aβ40/Aβ42 distinctions are absent.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A stated modelling boundary; Alzheimer disease biology is not reducible to the Aβ aggregation states shown here.',
    note: 'The scene is an Aβ aggregation explainer, not a complete Alzheimer disease model. Omitted pathways can materially alter interpretation.',
  },
]);
