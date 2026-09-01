# Evidence dossier — Amyloid-β

This dossier distinguishes established Aβ biology from visual conventions in the scene. The machine-readable contract is `AMYLOID_BETA_EVIDENCE` in `src/models/productionEvidence.js`.

## External biology

### `physiological-abeta-production`
Aβ is continuously produced as a normal soluble cellular product. Selkoe's review of physiological Aβ production (PMID 7504355) is the historical anchor; contemporary production/clearance reviews retain the same boundary. Verification: `physiology: soluble amyloid beta is present before aggregated species appear`.

### `species-coexist`
Soluble oligomeric and fibrillar/plaque-associated Aβ populations are heterogeneous and can coexist. A high-aggregation state therefore must not become "everything is plaque". Source boundary: Aβ oligomer/assembly reviews including PMID 20148964. Verification: `physiology: multiple amyloid beta assembly states coexist rather than replacing one another`.

### `extracellular-plaque`
Senile plaques are extracellular deposits containing fibrillar Aβ. Source boundary: Alzheimer neuropathology and Aβ assembly reviews (PMID 27258414; PMID 20148964). Verification: `physiology: plaque deposits are represented outside the neuronal soma`.

## Approximation

### `single-aggregation-axis`
The named assembly states are real, but mapping their prominence onto one scalar coordinate is a teaching approximation. Real aggregation is branched, heterogeneous and dynamically interconverting.

## Illustrative choices

### `particle-scale`
Relative sizes are chosen for visibility, not molecular scale.

### `species-fractions`
The displayed high-aggregation fractions are chosen to preserve visible coexistence; they are not tissue concentrations.

### `particle-thresholds`
Each particle's transition thresholds are deterministic rendering values with no kinetic interpretation.

## Known weaknesses / boundaries

### `one-way-visual-particles`
Individual rendered particles do not reverse as the slider moves right. Real assemblies can interconvert and disassemble. This is a known directional error in the visual scheduler, deliberately documented rather than described as irreversible biology.

### `no-clinical-cognition`
There is no patient cognition or clinical stage in the model. Plaque burden and clinical impairment are not interchangeable; classic clinico-pathological work also shows that synaptic loss can correlate with dementia differently from plaque burden (PMID 8239314).

### `no-tau-or-neuroinflammation`
Tau, glia, neuroinflammation, APP processing, ApoE and Aβ40/Aβ42 distinctions are outside the scene. It is an Aβ aggregation explainer, not a complete Alzheimer disease model.

## Review implication

Building this dossier does not constitute a new clinical review. The scene remains `legacy-unversioned` until a reviewer signs a specific commit in `docs/clinical-reviews/registry.json`.
