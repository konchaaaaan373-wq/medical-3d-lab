export * from './evidence.js';
export { AMYLOID_BETA_EVIDENCE, HEART_FAILURE_EVIDENCE } from './productionEvidence.js';

import { EVIDENCE_REGISTRIES as REVIEWED_MODEL_REGISTRIES } from './evidence.js';
import { AMYLOID_BETA_EVIDENCE, HEART_FAILURE_EVIDENCE } from './productionEvidence.js';

/**
 * Complete evidence registry, including the two original production scenes that
 * pre-date the current versioned clinical-review standard.
 */
export const ALL_EVIDENCE_REGISTRIES = [
  HEART_FAILURE_EVIDENCE,
  AMYLOID_BETA_EVIDENCE,
  ...REVIEWED_MODEL_REGISTRIES,
];
