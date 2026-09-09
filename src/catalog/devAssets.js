/**
 * Candidate assets a scene under development loads, and where they come from.
 *
 * These are **not** shipped assets. A file listed here is a candidate being
 * examined: it has not passed the asset release gate, it is not in
 * `assetManifest.js`, and no scene that uses one may be opened by the release.
 * `src/catalog/assetManifest.js` is still the only record of what ships.
 *
 * They are also deliberately **not committed**. A third-party binary does not
 * belong in this repository (CLAUDE.md), and a 4 MB candidate that may never be
 * adopted belongs there least of all. What is committed is this record — the
 * pinned commit, the path, the size and the git blob SHA-1 — which is enough for
 * `npm run assets:dev` to fetch exactly the same bytes on any machine and refuse
 * anything else.
 *
 * A git blob SHA-1 identifies the file *in that repository*; the SHA-256 the
 * fetch records identifies the bytes anywhere. Both are kept because they answer
 * different questions.
 */

/** Where a candidate is fetched to. Git-ignored; served in dev and preview only. */
export const DEV_ASSET_ROOT = 'dev-assets';

/**
 * @typedef {object} DevAsset
 * @property {string} id
 * @property {string} url the pinned raw URL — a commit, never a branch
 * @property {string} file where it lands under `DEV_ASSET_ROOT`
 * @property {number} bytes the size the source repository records
 * @property {string} gitBlobSha1 what git calls this file at that commit
 * @property {string} sha256 the digest of the bytes, once fetched and recorded
 * @property {string} note what it is and what has not been decided about it
 */

/** @type {readonly DevAsset[]} */
export const DEV_ASSETS = Object.freeze([
  Object.freeze({
    id: 'hubmap-vh-m-heart',
    url:
      'https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/' +
      'b036a91aaf7234f462b1249d4a5f4fb0e982f412/v1.2/models/VH_M_Heart.glb',
    file: 'heart/VH_M_Heart.glb',
    bytes: 4071500,
    gitBlobSha1: '7efc2cf858b4434249a48c6f104842e1662c9043',
    sha256: 'b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70',
    note:
      'HuBMAP 3D Reference Organ for Heart, Male v1.2 (CC BY 4.0, Visible Human Male). ' +
      'Fourteen named parts with UBERON/FMA ids; no great vessels, no coronary arteries. ' +
      'Inspected in docs/asset-qa/heart-hubmap-vh-m-heart.md. Not adopted, not shipped.',
  }),
  Object.freeze({
    id: 'hubmap-vh-m-blood-vasculature',
    url:
      'https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/' +
      'b036a91aaf7234f462b1249d4a5f4fb0e982f412/v1.2/models/VH_M_Blood_Vasculature.glb',
    file: 'heart/VH_M_Blood_Vasculature.glb',
    bytes: 7436204,
    gitBlobSha1: '90016b0b5f8028ad0afa9d39672352ffce625498',
    sha256: 'a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d',
    note:
      'The same release\'s whole-body vasculature, being examined for the great vessels the ' +
      'heart file does not contain. Same source declaration is not the same transform or the ' +
      'same coverage, and neither is assumed.',
  }),
]);

/** @param {string} id */
export const devAssetById = (id) => DEV_ASSETS.find((asset) => asset.id === id) ?? null;

/** Where the browser asks for a candidate. Served only in dev and preview builds. */
export const devAssetUrl = (id, base = '/') => {
  const asset = devAssetById(id);
  return asset ? `${base}${DEV_ASSET_ROOT}/${asset.file}` : null;
};
