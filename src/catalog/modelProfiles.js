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
 * one, a solved circulation is not a calibrated one, and a model a clinician
 * shows a patient is not a model of that patient.
 *
 * What a profile is **not**: a copy of the model card, the evidence dossier or
 * the review record. It carries no medical text and no numbers. It names the
 * claim's shape, and the tests in `tests/model-profiles.test.js` hold the
 * public product to it. The reasoning behind the axes is in
 * `docs/architecture/intended-use-and-model-provenance.md`.
 *
 * Pure data and pure functions. No `three`, no DOM, no scene import.
 */

export const MODEL_PROFILE_SCHEMA_VERSION = 1;

/** Where the shape on screen comes from. */
export const GEOMETRY_BASIS = Object.freeze({
  /** Built in code from primitives, curves and particles for teaching. Claims no atlas provenance. */
  PROCEDURAL: 'procedural',
  /** Derived from a normal reference atlas or curated mesh whose provenance the asset manifest fixes. */
  REFERENCE_ATLAS: 'reference-atlas',
  /** Segmented from CT/MRI. One subject's shape is neither a population normal nor a prediction. */
  IMAGING_DERIVED: 'imaging-derived',
  /** A deliberate combination of procedural geometry with atlas- or image-derived assets. */
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
 * a reader, not claims about what the model may be used for.
 */
export const INTENDED_USE = Object.freeze({
  GENERAL_EDUCATION: 'general-education',
  /** Shown *by* a clinician *to* a patient, as the general model. Takes no patient data. */
  PATIENT_EXPLANATION: 'patient-explanation',
  MEDICAL_EDUCATION: 'medical-education',
  /** A separate validation, quality and regulatory track. Not offered by the current product. */
  CLINICAL_RESEARCH: 'clinical-research',
  /** Out of scope until an intended-use statement and a regulatory determination exist. */
  CLINICAL_CARE: 'clinical-care',
});

/**
 * What a model must not be used for. The first three are the strategy's
 * minimum for every current scene. `prognosis` and `procedure-planning` are
 * added because the clinical-review registry already records them as
 * limitations (the patient-guide policy forbids prognosis; the brain atlas
 * must not be used for lesion localisation, operative planning or navigation),
 * and a prohibition the registry states in prose should be one a test can read.
 */
export const PROHIBITED_USE = Object.freeze({
  DIAGNOSIS: 'diagnosis',
  TREATMENT_SELECTION: 'treatment-selection',
  DOSE_SELECTION: 'dose-selection',
  PROGNOSIS: 'prognosis',
  PROCEDURE_PLANNING: 'procedure-planning',
});

/** Every current-product profile must prohibit at least these. */
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

/** Geometry bases that must point at an asset whose provenance the asset manifest records. */
export const ASSET_BACKED_GEOMETRY = Object.freeze([
  GEOMETRY_BASIS.REFERENCE_ATLAS,
  GEOMETRY_BASIS.IMAGING_DERIVED,
  GEOMETRY_BASIS.HYBRID,
  GEOMETRY_BASIS.MOLECULAR,
]);

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
 * @property {string[]} prohibitedUses non-empty, from PROHIBITED_USE
 * @property {string[]} assets asset ids from `assetManifest.js`; empty for procedural geometry
 * @property {string[]} validationRecords repository-relative paths. Required, non-empty, for any claim
 *   above the current product's ceiling (see `profileMakesHighClaim`). Never invented; today every profile has none.
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
  (profiles === MODEL_PROFILES ? BY_ID.get(id) : profiles.find((p) => p.profileId === id)) ?? null;

/** The profile a scene manifest entry references, or null. */
export const modelProfileForScene = (scene, profiles = MODEL_PROFILES) =>
  scene?.modelProfile ? modelProfileById(scene.modelProfile, profiles) : null;

/** The claims that would take a profile past what the current public product may publish. */
export const profileMakesHighClaim = (profile) =>
  profile.mechanismLevel === MECHANISM_LEVEL.EXTERNALLY_VALIDATED ||
  PATIENT_SPECIFIC_PERSONALIZATION.includes(profile.personalization) ||
  (profile.intendedUses ?? []).some((use) => CLINICAL_INTENDED_USES.includes(use));

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());

function checkList(problems, where, name, list, allowed) {
  if (!isStringList(list)) {
    problems.push(`${where}: ${name} must be an array of non-empty strings`);
    return false;
  }
  if (new Set(list).size !== list.length) problems.push(`${where}: ${name} has duplicates`);
  if (allowed) {
    for (const item of list) {
      if (!allowed.includes(item)) problems.push(`${where}: ${name} contains "${item}", which is not in the closed vocabulary`);
    }
  }
  return true;
}

/**
 * Everything structurally wrong with a set of profiles, on their own.
 *
 * Returned rather than thrown, in the shape `validateCatalog` uses. Not wired
 * into `validateCatalog` itself: nothing in the browser reads profiles, and
 * importing them there put 8 kB into the eager entry chunk for a check only
 * the test suite runs. Cross-checks against scenes and assets are
 * `modelProfileProblems`, below.
 *
 * @param {readonly ModelProfile[]} profiles
 */
export function validateModelProfiles(profiles = MODEL_PROFILES) {
  const problems = [];
  const seen = new Set();

  for (const profile of profiles) {
    const where = `profile "${profile?.profileId ?? '(no id)'}"`;
    if (!profile || typeof profile !== 'object') {
      problems.push('a profile is not an object');
      continue;
    }
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
      if (profile.prohibitedUses.length === 0) problems.push(`${where}: prohibitedUses is empty`);
      const clinical = (profile.intendedUses ?? []).some((use) => CLINICAL_INTENDED_USES.includes(use));
      if (!clinical) {
        for (const required of CORE_PROHIBITED_USES) {
          if (!profile.prohibitedUses.includes(required)) {
            problems.push(`${where}: a non-clinical profile must prohibit "${required}"`);
          }
        }
      }
    }
    checkList(problems, where, 'assets', profile.assets);
    if (Array.isArray(profile.assets)) {
      if (profile.geometryBasis === GEOMETRY_BASIS.PROCEDURAL && profile.assets.length > 0) {
        problems.push(`${where}: procedural geometry lists assets — reclassify as hybrid or drop the assets`);
      }
      if (ASSET_BACKED_GEOMETRY.includes(profile.geometryBasis) && profile.assets.length === 0) {
        problems.push(`${where}: ${profile.geometryBasis} geometry must name at least one asset`);
      }
    }
    if (checkList(problems, where, 'validationRecords', profile.validationRecords)) {
      if (profileMakesHighClaim(profile) && profile.validationRecords.length === 0) {
        problems.push(
          `${where}: externally-validated, patient-specific or clinical claims require validationRecords`
        );
      }
    }
    if (typeof profile.basis !== 'string' || !profile.basis.trim()) {
      problems.push(`${where}: basis must say why this classification was made`);
    }
  }

  return problems;
}

/**
 * Cross-checks between profiles, the scene manifest and the asset manifest.
 *
 * These are the policy lines: which scenes need a profile, what the public
 * product may not claim, and that a paid patient surface is declared as an
 * intended use in both directions.
 *
 * @param {object} options
 * @param {readonly object[]} options.scenes scene manifest entries
 * @param {readonly ModelProfile[]} [options.profiles]
 * @param {(id: string) => object | null} [options.assetById] resolver into the asset manifest
 * @param {(scene: object) => string | null} [options.modelCardFor] how a scene's model card is found
 */
export function modelProfileProblems({
  scenes,
  profiles = MODEL_PROFILES,
  assetById = null,
  modelCardFor = (scene) => scene.modelCard ?? null,
}) {
  const problems = [];

  for (const scene of scenes) {
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

    // There is no clinical release surface, no patient-data path and no
    // external-validation record anywhere in this product. A registered scene
    // — public or Lab — therefore cannot carry one of these claims, whatever
    // its status. Lifting this needs the separate programme described in
    // docs/architecture/intended-use-and-model-provenance.md, not a test edit.
    for (const use of profile.intendedUses ?? []) {
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

    if (isPrototype) {
      if (![MECHANISM_LEVEL.NONE, MECHANISM_LEVEL.ILLUSTRATIVE].includes(profile.mechanismLevel)) {
        problems.push(`${where}: a prototype publishes no numbers, so its profile cannot claim "${profile.mechanismLevel}"`);
      }
    } else if (!modelCardFor(scene)) {
      problems.push(`${where}: a profiled ${scene.status} scene must have a model card`);
    }

    // The `patient` capability *is* the patient-explanation surface. Having
    // one without declaring the use hides a claim; declaring the use without
    // the surface claims a use the product does not offer.
    const hasPatientSurface = scene.access?.patient === true;
    const declaresPatientUse = (profile.intendedUses ?? []).includes(INTENDED_USE.PATIENT_EXPLANATION);
    if (hasPatientSurface && !declaresPatientUse) {
      problems.push(`${where}: has a patient capability but its profile does not declare "patient-explanation"`);
    }
    if (declaresPatientUse && !hasPatientSurface) {
      problems.push(`${where}: declares "patient-explanation" but offers no patient capability`);
    }

    if (assetById) {
      for (const assetId of profile.assets ?? []) {
        if (!assetById(assetId)) problems.push(`${where}: profile asset "${assetId}" is not in the asset manifest`);
      }
    }
  }

  return problems;
}
