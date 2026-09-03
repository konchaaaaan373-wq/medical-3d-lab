export * from './evidence.js';
export { AMYLOID_BETA_EVIDENCE, HEART_FAILURE_EVIDENCE } from './productionEvidence.js';
export { HFPEF_EVIDENCE } from './hfpefEvidence.js';

import { EVIDENCE_REGISTRIES as REVIEWED_MODEL_REGISTRIES } from './evidence.js';
import { AMYLOID_BETA_EVIDENCE, HEART_FAILURE_EVIDENCE } from './productionEvidence.js';
import { HFPEF_EVIDENCE } from './hfpefEvidence.js';

/**
 * Complete evidence registry, including production, reviewed, pending and
 * legacy models. Presence here means the claim boundary is machine-readable;
 * it does not itself imply current Clinical Review sign-off.
 */
export const ALL_EVIDENCE_REGISTRIES = [
  HEART_FAILURE_EVIDENCE,
  AMYLOID_BETA_EVIDENCE,
  HFPEF_EVIDENCE,
  ...REVIEWED_MODEL_REGISTRIES,
];
