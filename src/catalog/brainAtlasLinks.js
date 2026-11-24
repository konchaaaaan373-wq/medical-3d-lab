/**
 * Which structures the two brain atlases both name — the bridge between the
 * anatomy scene and the MRI atlas, in both directions.
 *
 * It lives in the catalogue, not in either scene's data, because both the MRI
 * workbench and the application shell read it (the anatomy panel offers
 * 「MRI で見る」 for these structures), and the shell must not pull a scene's
 * data module into the bundle of every page.
 */

/**
 * Structures the existing anatomy atlas (`brain.glb`) also names — a link **by
 * name**, and said to be one.
 *
 * That atlas is a composite of several sources and is not in MNI space, so
 * nothing here is a coordinate correspondence: selecting the hippocampus there
 * and here shows the same *named* structure drawn from two different atlases
 * with two different parcellation protocols. The list is deliberately short —
 * only structures both atlases draw as one whole, with the same name and the
 * same sides. A structure the other atlas splits into nuclei (thalamus,
 * amygdala) or into gyrus-and-sulcus parcels has no single counterpart and is
 * left out rather than approximated. `tests/mri-atlas-data.test.js` checks each
 * id against the GLB's own metadata.
 *
 * `atlasLabel` is the GLB's `bx_label`; ids are its `bx_id` per side.
 */
export const ANATOMY_ATLAS_LINKS = Object.freeze({
  hippocampus: { atlasLabel: 'Hippocampus', L: 122, R: 123 },
  caudate: { atlasLabel: 'Caudate nucleus', L: 49, R: 50 },
  putamen: { atlasLabel: 'Putamen', L: 325, R: 326 },
  'lateral-ventricle': { atlasLabel: 'Lateral ventricle', L: 173, R: 174 },
  precentral: { atlasLabel: 'Precentral gyrus', L: 284, R: 285 },
  postcentral: { atlasLabel: 'Postcentral gyrus', L: 269, R: 270 },
  supramarginal: { atlasLabel: 'Supramarginal gyrus', L: 386, R: 387 },
  'pars-opercularis': { atlasLabel: 'Opercular part of inferior frontal gyrus', L: 305, R: 306 },
  'pars-triangularis': { atlasLabel: 'Triangular part of inferior frontal gyrus', L: 407, R: 408 },
});

const HEMI_SUFFIX = { L: 'l', R: 'r' };

/** The MRI atlas structure id (`hippocampus-l`) for an anatomy-atlas structure id, or null. */
export function mriStructureIdForAnatomyId(anatomyId) {
  const id = Number(anatomyId);
  for (const [baseId, link] of Object.entries(ANATOMY_ATLAS_LINKS)) {
    for (const hemi of ['L', 'R']) if (link[hemi] === id) return `${baseId}-${HEMI_SUFFIX[hemi]}`;
  }
  return null;
}
