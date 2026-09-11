/**
 * Model profiles — the release profile of the medical claim each scene makes.
 *
 * A scene manifest entry says a scene exists and how mature its implementation
 * is. A model card says what the model answers and where it can mislead. A
 * clinical review signs a commit. None of those says, in a form a test can
 * read, *what kind of thing* the model is: whether its geometry is drawn or
 * measured, whether its numbers are computed or illustrated, whether it stands
 * for anybody in particular, and who it is for.
 *
 * That gap is what this registry closes, and it closes it with a closed
 * vocabulary on purpose. Four axes are kept apart because collapsing them is
 * how a product starts over-claiming: a `production` scene is not a validated
 * one, a solved circulation is not a calibrated one, and a model a patient
 * looks at is not a model of that patient.
 *
 * What a profile is **not**: a copy of the model card, the evidence dossier or
 * the review record. It carries no medical text and no numbers. It names the
 * claim's shape, and the tests in `tests/model-profiles.test.js` hold the
 * public product to it. The reasoning behind the axes is in
 * `docs/architecture/intended-use-and-model-provenance.md`.
 *
 * Pure data and pure functions. No `three`, no DOM, no scene import, no
 * filesystem: whether a referenced record exists is answered by a resolver the
 * caller injects.
 */
import { ASSET_KIND, ASSET_SOURCE_TYPE, assetReleaseProblems, isRepositoryPath } from './assetManifest.js';

export const MODEL_PROFILE_SCHEMA_VERSION = 1;

/**
 * Where the shape on screen comes from. This is provenance, not file format:
 * a procedurally generated organ stays `procedural` when it is stored as a
 * GLB, and an atlas mesh stays `reference-atlas` however it is compressed.
 */
export const GEOMETRY_BASIS = Object.freeze({
  /** Built in code, or generated from parameters and reproducible from them. Claims no atlas provenance. */
  PROCEDURAL: 'procedural',
  /** Derived from a normal reference atlas or curated mesh whose provenance the asset manifest fixes. */
  REFERENCE_ATLAS: 'reference-atlas',
  /** Segmented from CT/MRI. One subject's shape is neither a population normal nor a prediction. */
  IMAGING_DERIVED: 'imaging-derived',
  /** A deliberate combination of procedural geometry with atlas-, image- or structure-derived assets. */
  HYBRID: 'hybrid',
  /** From structural data (PDB and the like) or an explicitly stated molecular representation rule. */
  MOLECULAR: 'molecular',
});

/**
 * How much the numbers and motion can carry.
 *
 * `none` is not in the strategy vocabulary and was added here for one reason:
 * an anatomy atlas makes no mechanism claim at all, and filing it as
 * `illustrative` would say it illustrates a mechanism it does not have.
 */
export const MECHANISM_LEVEL = Object.freeze({
  /** Structure only. No state, no causal computation. */
  NONE: 'none',
  /** Constructed states or animation to show a concept. No causal computation or calibration claimed. */
  ILLUSTRATIVE: 'illustrative',
  /** Physiological causation implemented as equations, rules or transitions, with internal consistency tested. */
  MECHANISTIC: 'mechanistic',
  /** Mechanistic, and parameters or outputs are calibrated to a citable literature or dataset range, with a test holding them there. */
  LITERATURE_CALIBRATED: 'literature-calibrated',
  /** A version-pinned model evaluated against independent data under pre-registered criteria, with the record on file. */
  EXTERNALLY_VALIDATED: 'externally-validated',
});

/** Whom the model stands for. */
export const PERSONALIZATION = Object.freeze({
  /** A representative teaching case. Represents and predicts nobody. */
  REPRESENTATIVE: 'representative',
  /** Parameter or shape distributions from a population dataset. Still no individual prediction. */
  COHORT_DERIVED: 'cohort-derived',
  /** Geometry from one patient's imaging. Shape alone claims nothing about that patient's physiology or outcome. */
  PATIENT_DERIVED_GEOMETRY: 'patient-derived-geometry',
  /** Predicts an individual's state, outcome or response from their own inputs. Clinical R&D onward only. */
  PATIENT_PREDICTIVE: 'patient-predictive',
});

/**
 * Who the model is for. This is the axis that must never be confused with the
 * delivery layers (SNS / Interactive / Educational), which are ways of reaching
 * a reader, not claims about what the model may be used for — and it is not
 * the billing axis either: a paid `patient` capability *requires* the use to
 * be declared, but a free scene may declare it too.
 */
export const INTENDED_USE = Object.freeze({
  GENERAL_EDUCATION: 'general-education',
  /**
   * An explanation of the representative model that a patient or family can
   * look at, whether or not a clinician is present. Takes no patient data,
   * personalises nothing, and neither diagnoses nor predicts.
   */
  PATIENT_EXPLANATION: 'patient-explanation',
  MEDICAL_EDUCATION: 'medical-education',
  /** A separate validation, quality and regulatory track. Not offered by the current product. */
  CLINICAL_RESEARCH: 'clinical-research',
  /** Out of scope until an intended-use statement and a regulatory determination exist. */
  CLINICAL_CARE: 'clinical-care',
});

/**
 * What a model must not be used for. The first three are the strategy's
 * minimum for every profile in this schema. `prognosis` and
 * `procedure-planning` are added because the clinical-review registry already
 * records them as limitations (the patient-guide policy forbids prognosis; the
 * brain atlas must not be used for lesion localisation, operative planning or
 * navigation), and a prohibition the registry states in prose should be one a
 * test can read.
 */
export const PROHIBITED_USE = Object.freeze({
  DIAGNOSIS: 'diagnosis',
  TREATMENT_SELECTION: 'treatment-selection',
  DOSE_SELECTION: 'dose-selection',
  PROGNOSIS: 'prognosis',
  PROCEDURE_PLANNING: 'procedure-planning',
});

/**
 * Every profile in schema 1 must prohibit at least these — a clinical-research
 * profile included. Omission is never read as permission; a future
 * clinical-care surface gets its own schema and an explicit permission model.
 */
export const CORE_PROHIBITED_USES = Object.freeze([
  PROHIBITED_USE.DIAGNOSIS,
  PROHIBITED_USE.TREATMENT_SELECTION,
  PROHIBITED_USE.DOSE_SELECTION,
]);

/** Intended uses the current public product does not offer and has no release surface for. */
export const CLINICAL_INTENDED_USES = Object.freeze([
  INTENDED_USE.CLINICAL_RESEARCH,
  INTENDED_USE.CLINICAL_CARE,
]);

/** Personalization levels that would mean patient data or patient geometry, which the product does not take. */
export const PATIENT_SPECIFIC_PERSONALIZATION = Object.freeze([
  PERSONALIZATION.PATIENT_DERIVED_GEOMETRY,
  PERSONALIZATION.PATIENT_PREDICTIVE,
]);

/** Geometry bases that must point at a mesh asset whose provenance the asset manifest records. */
export const ASSET_BACKED_GEOMETRY = Object.freeze([
  GEOMETRY_BASIS.REFERENCE_ATLAS,
  GEOMETRY_BASIS.IMAGING_DERIVED,
  GEOMETRY_BASIS.HYBRID,
  GEOMETRY_BASIS.MOLECULAR,
]);

/** For each single-provenance geometry basis, the one asset source type its mesh assets may have. */
const MESH_SOURCE_FOR_BASIS = Object.freeze({
  [GEOMETRY_BASIS.PROCEDURAL]: ASSET_SOURCE_TYPE.PROCEDURAL,
  [GEOMETRY_BASIS.REFERENCE_ATLAS]: ASSET_SOURCE_TYPE.REFERENCE_ATLAS,
  [GEOMETRY_BASIS.IMAGING_DERIVED]: ASSET_SOURCE_TYPE.IMAGING_DERIVED,
  [GEOMETRY_BASIS.MOLECULAR]: ASSET_SOURCE_TYPE.MOLECULAR,
});

/** An asset with this organ is systemic context and may be drawn by a scene of any organ. */
export const SYSTEMIC_CONTEXT_ORGAN = 'whole-body';

const values = (enumeration) => Object.freeze(Object.values(enumeration));
export const GEOMETRY_BASIS_IDS = values(GEOMETRY_BASIS);
export const MECHANISM_LEVEL_IDS = values(MECHANISM_LEVEL);
export const PERSONALIZATION_IDS = values(PERSONALIZATION);
export const INTENDED_USE_IDS = values(INTENDED_USE);
export const PROHIBITED_USE_IDS = values(PROHIBITED_USE);

/**
 * @typedef {object} ModelProfile
 * @property {string} profileId stable, kebab-case. A scene manifest entry references it as `modelProfile`.
 * @property {number} schemaVersion
 * @property {string} geometryBasis one of GEOMETRY_BASIS
 * @property {string} mechanismLevel one of MECHANISM_LEVEL
 * @property {string} personalization one of PERSONALIZATION
 * @property {string[]} intendedUses non-empty, from INTENDED_USE
 * @property {string[]} prohibitedUses non-empty, from PROHIBITED_USE, always including CORE_PROHIBITED_USES
 * @property {string[]} assets asset ids from `assetManifest.js`
 * @property {string[]} [candidateAssets] ids from `devAssets.js` — files a scene under development
 *   loads that have **not** been through the asset pipeline. A record of what is being examined, never
 *   a release: a profile that names one cannot pass the release gate, and `production` refuses it.
 * @property {string[]} validationRecords repository-relative paths of the records that back any claim in
 *   `profileNeedsEvidence`. Each must exist in the repository. Never invented; today every profile has none.
 * @property {string} basis one sentence on why this classification, pointing at the card or dossier
 */

/**
 * The profiles of every non-prototype scene, classified from the model card,
 * the evidence dossier and the clinical-review record rather than from the
 * scene's ambitions. Where the evidence was ambiguous the lower claim was
 * taken. In particular no scene is `literature-calibrated`: the evidence
 * registry files its calibrations as textbook targets the repository chose,
 * not as a cited dataset range a test holds the model inside, and the
 * dossiers state that the build environment could not reach the literature.
 *
 * @type {readonly ModelProfile[]}
 */
export const MODEL_PROFILES = Object.freeze([
  {
    profileId: 'brain-anatomy-reference-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: ['brain-atlas-glb'],
    validationRecords: [],
    basis:
      'A gross-anatomy atlas redistributed unchanged from a curated mesh (Z-Anatomy / BodyParts3D via Brain Project). ' +
      'It has no state and no mechanism; deep structures are atlas-registered approximations, not one person. ' +
      'The review registry forbids diagnosis, lesion localisation, operative planning and navigation.',
  },
  {
    profileId: 'lung-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code from a declared division scheme — two pleural surfaces carved by the oblique and horizontal '+
      'fissures, the eighteen bronchopulmonary segments as the lung nearest each segmental bronchus — not traced from a '+
      'specimen and not registered to an atlas. It has no state and no mechanism. Calibres, branch angles and the '+
      'right-to-left main bronchus ratio are drawn to read clearly rather than measured, so the ordering is the claim '+
      'and the magnitudes are not; operative and procedural planning are prohibited for that reason.',
  },
  {
    profileId: 'liver-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting one procedurally shaped liver on the planes Couinaud’s scheme names, with the hepatic '+
      'veins drawn on those same planes and the portal pedicles inside the parts. The divisions are the claim; the outer '+
      'form is a warped ellipsoid with a liver’s proportions and carries no porta hepatis notch, no bare area and no bile '+
      'ducts. No state and no mechanism, and no resection or donor planning of any kind.',
  },
  {
    profileId: 'kidney-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code: the cortex as one shell between the capsule and a scaled corticomedullary junction, the inside '+
      'partitioned into seven pyramids and the cortical columns between them, and a collecting system drawn out from each '+
      'papilla. Schematic where the model card says so — the sinus is not carved out, the pyramids are one coronal row '+
      'rather than two, and no renal artery is drawn. No state and no mechanism.',
  },
  {
    profileId: 'stomach-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting one procedural tube — the stomach\u2019s own path along the greater curvature and the '+
      'calibre profile that already names fundus, body, incisura, antrum and pyloric canal \u2014 into those named lengths, '+
      'with the cardia found from where the oesophagus ends. No state and no mechanism. The parts are rings of the tube, '+
      'so the cardia is drawn as a collar and the incisura angularis only as the narrowing that goes with it; there are no '+
      'wall layers, no rugae and no volumes.',
  },
  {
    profileId: 'intestine-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting the colon\u2019s own frame at its own corners, measured along the path rather than assumed '+
      'from control-point spacing. No state and no mechanism. Lengths, loop counts and positions are illustrative; the '+
      'small bowel is one structure because nothing in the model marks where jejunum becomes ileum; and there is no '+
      'appendix, rectum, anal canal, mesentery, taenia coli or wall layer.',
  },
  {
    profileId: 'spleen-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting the spleen\u2019s own shape at a transverse plane through the hilum into the two territories the splenic artery\u2019s terminal branches supply, with those vessels drawn meeting the organ at the hilum it declares. No state and no mechanism. The plane is flat and real segment boundaries are neither flat nor identical between people; two segments is the usual number rather than the only one. Red and white pulp are histology and are not drawn.',
  },
  {
    profileId: 'bladder-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting the same bladder shape the urinary-tract scene draws into apex, body, fundus and neck, with the trigone drawn as a flat patch of lining between the two ureteric orifices and the internal urethral orifice. No state and no mechanism. The bladder is drawn at one fixed degree of filling, the trigone has no thickness, mucosal folds and sphincters are not drawn, and the ureters\u2019 oblique intramural course is described but not modelled.',
  },
  {
    profileId: 'biliary-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code: the gallbladder as one tube of falling calibre cut into fundus, body and neck, and the ducts as tubes joining in the order anatomy gives them \u2014 hepatic ducts to common hepatic, cystic to common bile, common bile and pancreatic to one papilla. No state and no mechanism. Calibres, lengths and angles are drawn to be legible and none is a measurement; what is claimed is the order of the junctions. The liver is not drawn, the common bile duct runs in front of the duodenum and pancreas rather than behind and through them, and the well-known variations in cystic and hepatic duct anatomy are drawn one way only.',
  },
  {
    profileId: 'esophagus-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code: one tube on a path, cut into cervical, thoracic and abdominal parts, with three narrowings in its calibre profile and a ring marking each at the profile\u2019s own minimum. The structures that make each narrowing \u2014 trachea, aortic arch, left main bronchus, diaphragmatic hiatus \u2014 are drawn beside them. No state and no mechanism. Lengths, calibres and angles are drawn to be legible and none is a measurement; no distance from the incisors is given or implied. Muscle layers, the sphincters, the crura, the vagus nerves and the venous plexus are not drawn.',
  },
  {
    profileId: 'adrenal-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting each gland into four concentric shells \u2014 three cortical zones and the medulla \u2014 with the right gland pyramidal and the left crescentic, each on its own kidney. No state and no mechanism. **The zone thicknesses are drawn so that three zones can be told apart, not to scale**: in life the cortex is about nine tenths of the gland and the glomerulosa is a thin rim inside its capsule. No capsule, vessel or nerve is drawn.',
  },
  {
    profileId: 'uterus-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting a pear-shaped warp into fundus, body, isthmus and cervix, with the cavity drawn as a flat triangular patch between the two tubal ostia and the internal os, a tube of changing calibre on each side and an ovary near but not joined to each. No state and no mechanism. The organ is drawn upright rather than anteverted and anteflexed; the cavity has no thickness; endometrium, myometrium and perimetrium are not separated; follicles, ligaments, fornices, the transformation zone and the vessels are not drawn.',
  },
  {
    profileId: 'prostate-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting one chestnut-shaped warp into McNeal\u2019s four zones: a coronal plane takes the anterior fibromuscular stroma off the front, a scaled copy of the gland\u2019s own surface separates the inner gland from the peripheral zone (which is therefore a shell rather than a wedge), and an oblique plane through the verumontanum divides that inner gland into transition and central. The urethra, both ejaculatory ducts, both seminal vesicles and vasa, the bladder neck and the rectum are drawn around them. No state and no mechanism. **The zone proportions are drawn so four zones can be told apart and are not the real ones**; zone boundaries are surfaces of revolution and planes where real ones are neither; no volume may be read off the model, and the capsule, neurovascular bundles, sphincters, prostatic utricle and Denonvilliers\u2019 fascia are not drawn.',
  },
  {
    profileId: 'male-tract-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code as one chain: each segment\u2019s curve begins where the last one ends, read from the curve rather than typed twice, so testis \u2192 epididymis \u2192 vas \u2192 ejaculatory duct \u2192 prostatic, membranous and spongy urethra cannot come apart. No state and no mechanism. Lengths and calibres are drawn to be legible and none is a measurement \u2014 the vas is far shorter and straighter than it is, and the epididymal duct inside the epididymis is not modelled. One side of a paired route is drawn. The scrotum, the spermatic cord\u2019s coverings and vessels, the seminiferous tubules, the sphincters, the bulbourethral glands and the erectile mechanism are not drawn.',
  },
  {
    profileId: 'thyroid-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code: two lobe warps hollowed against a drawn trachea, an isthmus and a pyramidal lobe, with four '+
      'parathyroid glands behind the gland and a recurrent laryngeal nerve on each side in the tracheo-oesophageal '+
      'groove. No state and no mechanism. What is claimed is arrangement, not dimension \u2014 no measurement is made, '+
      'parathyroid positions are plausible rather than fixed, the pyramidal lobe is drawn although it is present in '+
      'roughly half of people, and the nerves\u2019 course below the neck is not modelled.',
  },
  {
    profileId: 'pancreas-anatomy-procedural-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'Built in code by cutting the pancreas\u2019s own axis, at the calibre profile that names head, neck, body and tail, '+
      'into those four, with the main duct along the same axis. No state and no mechanism. The islets are placed '+
      'pseudo-randomly from a fixed seed and claim only that endocrine tissue is scattered through the exocrine \u2014 '+
      'neither their number nor their size is a measurement. No uncinate process, accessory duct, bile duct or papilla '+
      'is modelled.',
  },
  {
    profileId: 'amyloid-beta-aggregation-illustration',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.ILLUSTRATIVE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [
      INTENDED_USE.GENERAL_EDUCATION,
      INTENDED_USE.PATIENT_EXPLANATION,
      INTENDED_USE.MEDICAL_EDUCATION,
    ],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'A deterministic teaching layout of particle states, not a kinetic or molecular-dynamics model; the card says ' +
      'particle counts, scale and thresholds are illustrative. Particles are drawn procedurally, not from PDB data, ' +
      'so the geometry basis is procedural rather than molecular.',
  },
  {
    profileId: 'heart-anatomy-reference-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    // Both files the scene loads, because credit has to cover everything drawn:
    // listing only the heart left the vasculature geometry uncredited.
    candidateAssets: ['hubmap-vh-m-heart', 'hubmap-vh-m-blood-vasculature'],
    validationRecords: [],
    basis:
      'A gross-anatomy reference organ (HuBMAP CCF VH_M_Heart, segmented from the Visible Human Male) shown ' +
      'unchanged: fourteen named parts, no state and no mechanism. The file is a candidate under examination, ' +
      'not a shipped asset — it is recorded in devAssets.js rather than the asset manifest, and the release ' +
      'gate refuses the scene for that reason alone, before the missing great vessels are even counted.',
  },
  {
    profileId: 'heart-failure-elastance-loop',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [
      INTENDED_USE.GENERAL_EDUCATION,
      INTENDED_USE.PATIENT_EXPLANATION,
      INTENDED_USE.MEDICAL_EDUCATION,
    ],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'A closed-loop time-varying-elastance circulation solved to a stable beat, with external-physiology directions ' +
      'tested. Reference parameters are calibration targets in broadly physiological ranges, not a cited dataset ' +
      'range, so the level stays mechanistic. One illustrative HFrEF path, not a natural history.',
  },
  {
    profileId: 'circulation-steady-state-lumped',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'MAP and calculated global oxygen delivery follow from flow, resistance and a fixed arterial oxygen content, ' +
      'and those relations are tested. The three states are one constructed case with illustrative response ' +
      'magnitudes; the controls are states, not doses, and nothing here is a fluid challenge or dose-response model.',
  },
  {
    profileId: 'copd-time-constant-units',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [
      INTENDED_USE.GENERAL_EDUCATION,
      INTENDED_USE.PATIENT_EXPLANATION,
      INTENDED_USE.MEDICAL_EDUCATION,
    ],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'Twelve parallel units with their own resistance and compliance under a demanded ventilation, expiratory flow ' +
      'capped at the equal-pressure-point limit. The reference lung is tuned to textbook central values, which the ' +
      'evidence registry files as calibration rather than measurement.',
  },
  {
    profileId: 'asthma-airway-network',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [
      INTENDED_USE.GENERAL_EDUCATION,
      INTENDED_USE.PATIENT_EXPLANATION,
      INTENDED_USE.MEDICAL_EDUCATION,
    ],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'An eight-generation resistive airway tree solved by damped fixed-point iteration for the tethering feedback. ' +
      'Every output is a ratio to the reference tree; constrictibility weights and response steepness are ' +
      'illustrative, so nothing is calibrated to a literature range.',
  },
  {
    profileId: 'myocardial-ischemia-supply-demand',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS, PROHIBITED_USE.PROCEDURE_PLANNING],
    assets: [],
    validationRecords: [],
    basis:
      'A per-territory oxygen supply/demand balance whose deficit integrates into a burden that drives contractility ' +
      'into the shared time-varying-elastance solver. The card says it is not a stenosis-to-flow calculation, not ' +
      'infarction, not a clock and not anyone\'s coronary anatomy — one right-dominant specimen — so which artery to ' +
      'open is outside it as well as which drug.',
  },
  {
    profileId: 'pneumonia-consolidation-shunt',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'A deterministic twelve-region V/Q model in which perfusion continues through a non-aerated share that hypoxic ' +
      'vasoconstriction only partly diverts. The consolidated fraction is a teaching axis, not severity, elapsed time ' +
      'or an imaging score, and the vasoconstriction strength is an illustrative constant.',
  },
  {
    profileId: 'achalasia-swallow-transport',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'One swallow delivered against a sphincter whose relaxation and a wave whose propagation both fail, run swallow ' +
      'after swallow until what leaves matches what arrives. The retained column supplies pressure of its own, so the ' +
      'balance is found rather than stated — and past a point no balance exists inside the organ, which the model ' +
      'reports instead of a height it has no room for. The card says it is not manometry, identifies no cause, and ' +
      'carries no regurgitation, aspiration, pain, nutrition, risk or treatment; the conductance and the column ' +
      'cross-section are calibration constants and no figure is a threshold.',
  },
  {
    profileId: 'biliary-obstruction-site',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'Four resistances in series from the liver to the duodenum with a secretion that falls against back-pressure ' +
      'and stops at a ceiling, plus a pancreatic path sharing only the sphincter and a gallbladder as a compliant ' +
      'dead end. What a blockage does is decided by the resistance still downstream of each node, so the answer is ' +
      'the site rather than the severity. The card says it carries no bilirubin, no stone, no inflammation, no ' +
      'diagnosis and no time course; the resistances are calibration constants and no figure is a threshold.',
  },
  {
    profileId: 'pulmonary-embolism-dead-space',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'Twelve equal pulmonary vascular territories in parallel at one fixed driving pressure: obstruction removes ' +
      'distal perfusion while the paired ventilation stays, so dead space rises and conductance falls. The card says ' +
      'it is not a vascular tree, a clot-burden model, an RV model, a risk score or a treatment-response model.',
  },
  {
    profileId: 'pulmonary-edema-starling-buffers',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'One Starling equation across the pulmonary capillary with three buffers and two-compartment accumulation, ' +
      'integrated at a fixed step. The card states it is not validated against measured data and its ' +
      'constants are calibrations and inventions of this repository.',
  },
  {
    profileId: 'portal-hypertension-resistance-network',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [
      INTENDED_USE.GENERAL_EDUCATION,
      INTENDED_USE.PATIENT_EXPLANATION,
      INTENDED_USE.MEDICAL_EDUCATION,
    ],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'A flow-conserving resistive network of the portal circulation with a presinusoidal / sinusoidal split. ' +
      'Reference resistances are calibration constants chosen so a healthy liver lands at a textbook gradient ' +
      'and flow; the dossier says no such measurement exists for a person.',
  },
  {
    profileId: 'hepatorenal-two-organ-circulation',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'The portal model, two systemic beds and a glomerular Starling balance solved together for one arterial ' +
      'pressure. Isolates the haemodynamic and neurohumoral component of HRS-AKI by construction, with no ' +
      'kidney injury, no ascites and no time; gains are illustrative.',
  },
  {
    profileId: 'renal-filtration-starling-mass-balance',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
    mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
    personalization: PERSONALIZATION.REPRESENTATIVE,
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES, PROHIBITED_USE.PROGNOSIS],
    assets: [],
    validationRecords: [],
    basis:
      'The Starling balance across one glomerular capillary scaled by working nephrons, and the tubular mass ' +
      'balance below it, solved together; FENa, urea-to-creatinine ratio, urine sodium and osmolality are ' +
      'readings of that one solve. A teaching kidney, not a population or a person.',
  },
]);

const BY_ID = new Map(MODEL_PROFILES.map((profile) => [profile.profileId, profile]));

/** @param {string} id */
export const modelProfileById = (id, profiles = MODEL_PROFILES) =>
  (profiles === MODEL_PROFILES ? BY_ID.get(id) : profiles.find((p) => p?.profileId === id)) ?? null;

/** The profile a scene manifest entry references, or null. */
export const modelProfileForScene = (scene, profiles = MODEL_PROFILES) =>
  typeof scene?.modelProfile === 'string' ? modelProfileById(scene.modelProfile, profiles) : null;

const list = (value) => (Array.isArray(value) ? value : []);

/**
 * Claims that must be backed by a record on file. This is the structural line:
 * a profile making one of these without a `validationRecords` entry is
 * malformed, whatever product it is in.
 */
export const profileNeedsEvidence = (profile) =>
  [MECHANISM_LEVEL.LITERATURE_CALIBRATED, MECHANISM_LEVEL.EXTERNALLY_VALIDATED].includes(profile?.mechanismLevel) ||
  [PERSONALIZATION.COHORT_DERIVED, ...PATIENT_SPECIFIC_PERSONALIZATION].includes(profile?.personalization) ||
  list(profile?.intendedUses).some((use) => CLINICAL_INTENDED_USES.includes(use));

/** The claims the current public product has no release surface for, records or not. */
export const profileMakesHighClaim = (profile) =>
  profile?.mechanismLevel === MECHANISM_LEVEL.EXTERNALLY_VALIDATED ||
  PATIENT_SPECIFIC_PERSONALIZATION.includes(profile?.personalization) ||
  list(profile?.intendedUses).some((use) => CLINICAL_INTENDED_USES.includes(use));

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());

function checkList(problems, where, name, value, allowed) {
  if (!isStringList(value)) {
    problems.push(`${where}: ${name} must be an array of non-empty strings`);
    return false;
  }
  if (new Set(value).size !== value.length) problems.push(`${where}: ${name} has duplicates`);
  if (allowed) {
    for (const item of value) {
      if (!allowed.includes(item)) problems.push(`${where}: ${name} contains "${item}", which is not in the closed vocabulary`);
    }
  }
  return true;
}

/**
 * Everything structurally wrong with a set of profiles, on their own.
 *
 * Returned rather than thrown, in the shape `validateCatalog` uses, and it
 * must never throw on malformed input — a profile whose `intendedUses` is a
 * string gets a line saying so, not a TypeError. Not wired into
 * `validateCatalog` itself: nothing in the browser reads profiles, and
 * importing them there put 8 kB into the eager entry chunk for a check only
 * the test suite runs. Cross-checks against scenes and assets are
 * `modelProfileProblems`, below.
 *
 * @param {readonly ModelProfile[]} profiles
 */
export function validateModelProfiles(profiles = MODEL_PROFILES, { candidateAssetById = null } = {}) {
  const problems = [];
  const seen = new Set();
  if (!Array.isArray(profiles)) return ['the profile registry is not an array'];

  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      problems.push('a profile is not an object');
      continue;
    }
    const where = `profile "${typeof profile.profileId === 'string' && profile.profileId ? profile.profileId : '(no id)'}"`;
    if (typeof profile.profileId !== 'string' || !ID_PATTERN.test(profile.profileId)) {
      problems.push(`${where}: profileId must be a kebab-case string`);
    } else if (seen.has(profile.profileId)) {
      problems.push(`${where}: duplicate profileId`);
    } else {
      seen.add(profile.profileId);
    }

    if (profile.schemaVersion !== MODEL_PROFILE_SCHEMA_VERSION) {
      problems.push(`${where}: schemaVersion must be ${MODEL_PROFILE_SCHEMA_VERSION}`);
    }
    if (!GEOMETRY_BASIS_IDS.includes(profile.geometryBasis)) {
      problems.push(`${where}: unknown geometryBasis "${profile.geometryBasis}"`);
    }
    if (!MECHANISM_LEVEL_IDS.includes(profile.mechanismLevel)) {
      problems.push(`${where}: unknown mechanismLevel "${profile.mechanismLevel}"`);
    }
    if (!PERSONALIZATION_IDS.includes(profile.personalization)) {
      problems.push(`${where}: unknown personalization "${profile.personalization}"`);
    }

    if (checkList(problems, where, 'intendedUses', profile.intendedUses, INTENDED_USE_IDS)) {
      if (profile.intendedUses.length === 0) problems.push(`${where}: intendedUses is empty`);
    }
    if (checkList(problems, where, 'prohibitedUses', profile.prohibitedUses, PROHIBITED_USE_IDS)) {
      for (const required of CORE_PROHIBITED_USES) {
        if (!profile.prohibitedUses.includes(required)) {
          problems.push(`${where}: schema ${MODEL_PROFILE_SCHEMA_VERSION} requires every profile to prohibit "${required}"`);
        }
      }
    } else {
      problems.push(`${where}: cannot confirm the required prohibitions without a prohibitedUses list`);
    }
    const candidates = profile.candidateAssets;
    let candidateCount = 0;
    if (candidates !== undefined) {
      if (checkList(problems, where, 'candidateAssets', candidates)) {
        candidateCount = candidates.length;
        // Resolved through an injected lookup rather than by importing the
        // candidate registry: `release.js` pulls this module into the eager
        // browser chunk, and a list of development-only download URLs has no
        // business being shipped. The test suite passes `devAssetById`.
        if (candidateAssetById) {
          for (const candidateId of candidates) {
            if (!candidateAssetById(candidateId)) {
              problems.push(`${where}: candidate asset "${candidateId}" is not registered in devAssets.js`);
            }
          }
        }
      }
    }
    if (checkList(problems, where, 'assets', profile.assets)) {
      // A candidate satisfies "this geometry comes from a file", because it does
      // — what it does not satisfy is the release gate, and that is checked
      // where release is decided rather than by pretending the file is absent.
      if (ASSET_BACKED_GEOMETRY.includes(profile.geometryBasis) && profile.assets.length + candidateCount === 0) {
        problems.push(`${where}: ${profile.geometryBasis} geometry must name at least one asset`);
      }
    }
    if (checkList(problems, where, 'validationRecords', profile.validationRecords)) {
      for (const record of profile.validationRecords) {
        if (!isRepositoryPath(record)) {
          problems.push(`${where}: validationRecords entry "${record}" is not a repository-relative path`);
        }
      }
      if (profileNeedsEvidence(profile) && profile.validationRecords.length === 0) {
        problems.push(
          `${where}: literature-calibrated, externally-validated, cohort-derived, patient-specific and clinical claims require validationRecords`
        );
      }
    } else if (profileNeedsEvidence(profile)) {
      problems.push(`${where}: a claim that needs evidence has no usable validationRecords`);
    }
    if (typeof profile.basis !== 'string' || !profile.basis.trim()) {
      problems.push(`${where}: basis must say why this classification was made`);
    }
  }

  return problems;
}

/**
 * Whether an asset is in scope for a scene's organs.
 *
 * The rule is a subset: every organ the asset covers must be one the scene
 * declares in `organs`. The one structured exception is a systemic-context
 * asset — one whose organs include `whole-body` — which any scene may draw as
 * surroundings. There is no free-text override.
 */
export function assetOrganProblems(scene, asset) {
  const problems = [];
  const assetOrgans = list(asset?.organs);
  if (assetOrgans.includes(SYSTEMIC_CONTEXT_ORGAN)) return problems;
  const sceneOrgans = new Set(list(scene?.organs).length ? scene.organs : [scene?.organ]);
  for (const organ of assetOrgans) {
    if (!sceneOrgans.has(organ)) problems.push(`asset "${asset.assetId}" covers "${organ}", which scene "${scene?.id}" does not draw`);
  }
  return problems;
}

/**
 * The candidate assets a profile names — files under examination, not shipped.
 *
 * Exported because two different callers need the same answer and neither
 * should re-derive it: the release gate refuses a scene that rests on one, and
 * the profile cross-checks refuse `production` for the same reason. An empty
 * list is the ordinary case.
 *
 * @param {ModelProfile|null|undefined} profile
 * @returns {string[]}
 */
export function profileCandidateAssets(profile) {
  return list(profile?.candidateAssets);
}

/**
 * Whether the assets a profile names agree with its geometry basis.
 *
 * Provenance, not format: a GLB of a procedural organ is still procedural.
 * Material assets (textures and the like) are allowed under any basis; the
 * rule is about mesh assets.
 */
export function geometryBasisProblems(profile, assets) {
  const problems = [];
  const where = `profile "${profile?.profileId}"`;
  const meshes = assets.filter((asset) => asset?.kind === ASSET_KIND.MESH);
  const basis = profile?.geometryBasis;
  if (basis === GEOMETRY_BASIS.HYBRID) {
    if (!meshes.some((asset) => asset.sourceType !== ASSET_SOURCE_TYPE.PROCEDURAL)) {
      problems.push(`${where}: hybrid geometry must name at least one atlas-, imaging- or structure-derived mesh asset`);
    }
    return problems;
  }
  const expected = MESH_SOURCE_FOR_BASIS[basis];
  if (!expected) return problems;
  for (const asset of meshes) {
    if (asset.sourceType !== expected) {
      problems.push(
        `${where}: ${basis} geometry cannot use mesh asset "${asset.assetId}" of source type "${asset.sourceType}" — ` +
          (basis === GEOMETRY_BASIS.PROCEDURAL ? 'reclassify as hybrid' : `only ${expected} meshes fit this basis`)
      );
    }
  }
  if (ASSET_BACKED_GEOMETRY.includes(basis) && meshes.length === 0 && assets.length > 0) {
    problems.push(`${where}: ${basis} geometry names only material assets and no mesh`);
  }
  return problems;
}

/**
 * Cross-checks between profiles, the scene manifest and the asset manifest.
 *
 * These are the policy lines: which scenes need a profile, what the public
 * product may not claim, that a paid patient surface declares its use, that
 * evidence records exist, and that every asset a public scene draws has
 * passed the release gate for that scene's maturity.
 *
 * @param {object} options
 * @param {readonly object[]} options.scenes scene manifest entries
 * @param {readonly ModelProfile[]} [options.profiles]
 * @param {(id: string) => object | null} [options.assetById] resolver into the asset manifest
 * @param {(scene: object) => string | null} [options.modelCardFor] how a scene's model card is found
 * @param {(path: string) => boolean} [options.fileExists] whether a repository path exists; omitted skips existence checks
 */
export function modelProfileProblems({
  scenes,
  profiles = MODEL_PROFILES,
  assetById = null,
  modelCardFor = (scene) => scene.modelCard ?? null,
  fileExists = null,
}) {
  const problems = [];
  if (!Array.isArray(scenes)) return ['scenes is not an array'];

  for (const scene of scenes) {
    if (!scene || typeof scene !== 'object') {
      problems.push('a scene entry is not an object');
      continue;
    }
    const where = `scene "${scene.id ?? '(no id)'}"`;
    const isPrototype = scene.status === 'prototype';

    if (scene.modelProfile == null) {
      if (!isPrototype) problems.push(`${where}: a ${scene.status} scene must reference a modelProfile`);
      continue;
    }
    if (typeof scene.modelProfile !== 'string') {
      problems.push(`${where}: modelProfile must be a profile id`);
      continue;
    }
    const profile = modelProfileById(scene.modelProfile, profiles);
    if (!profile) {
      problems.push(`${where}: modelProfile "${scene.modelProfile}" is not a registered profile`);
      continue;
    }
    const intendedUses = list(profile.intendedUses);

    // There is no clinical release surface, no patient-data path and no
    // external-validation record anywhere in this product. A registered scene
    // — public or Lab — therefore cannot carry one of these claims, whatever
    // its status and whatever records it names. Lifting this needs the
    // separate programme described in
    // docs/architecture/intended-use-and-model-provenance.md, not a test edit.
    for (const use of intendedUses) {
      if (CLINICAL_INTENDED_USES.includes(use)) {
        problems.push(`${where}: the public app has no release surface for intended use "${use}"`);
      }
    }
    if (PATIENT_SPECIFIC_PERSONALIZATION.includes(profile.personalization)) {
      problems.push(`${where}: the public app takes no patient data, so personalization cannot be "${profile.personalization}"`);
    }
    if (profile.mechanismLevel === MECHANISM_LEVEL.EXTERNALLY_VALIDATED) {
      problems.push(`${where}: no external-validation record exists in this repository, so mechanismLevel cannot be "${profile.mechanismLevel}"`);
    }

    // Evidence must be on file, not merely named.
    if (fileExists) {
      for (const record of list(profile.validationRecords)) {
        if (isRepositoryPath(record) && !fileExists(record)) {
          problems.push(`${where}: validation record "${record}" does not exist in the repository`);
        }
      }
    }

    if (isPrototype) {
      if (![MECHANISM_LEVEL.NONE, MECHANISM_LEVEL.ILLUSTRATIVE].includes(profile.mechanismLevel)) {
        problems.push(`${where}: a prototype publishes no numbers, so its profile cannot claim "${profile.mechanismLevel}"`);
      }
    } else if (!modelCardFor(scene)) {
      problems.push(`${where}: a profiled ${scene.status} scene must have a model card`);
    }

    // A paid `patient` capability *is* a patient-explanation surface, so the
    // use must be declared. The reverse is not required: intended use and
    // billing are separate axes, and a free scene may be one a patient can
    // look at.
    if (scene.access?.patient === true && !intendedUses.includes(INTENDED_USE.PATIENT_EXPLANATION)) {
      problems.push(`${where}: has a patient capability but its profile does not declare "patient-explanation"`);
    }

    // A candidate asset has not been through the asset pipeline: no licence
    // decision, no obligations discharged, no QA gates. A scene may rest on one
    // while it is being built, and may not call itself finished on one.
    const candidateAssets = profileCandidateAssets(profile);
    if (candidateAssets.length && scene.status === 'production') {
      problems.push(
        `${where}: a production scene cannot rest on candidate assets (${candidateAssets.join(', ')}); ` +
          'they are not in the asset manifest and have passed no release gate'
      );
    }

    if (assetById) {
      const assets = [];
      for (const assetId of list(profile.assets)) {
        const asset = assetById(assetId);
        if (!asset) {
          problems.push(`${where}: profile asset "${assetId}" is not in the asset manifest`);
          continue;
        }
        assets.push(asset);
        problems.push(...assetOrganProblems(scene, asset).map((line) => `${where}: ${line}`));
        if (!isPrototype) {
          problems.push(
            ...assetReleaseProblems(asset, { sceneStatus: scene.status, fileExists: fileExists ?? undefined }).map(
              (line) => `${where}: ${line}`
            )
          );
        }
      }
      problems.push(...geometryBasisProblems(profile, assets));
    }
  }

  return problems;
}
