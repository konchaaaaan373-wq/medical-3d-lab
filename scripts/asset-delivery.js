/**
 * What the build is allowed to ship from `public/`, derived from the asset manifest.
 *
 * `check-site-output.js` already proved that no withheld *page*, *card* or
 * *scene chunk* reached `dist/`. It could not see the thing this file is for:
 * everything under `public/` is copied into the build verbatim, so a mesh or a
 * texture for a model the release is holding back ships with the site and no
 * check notices. "Nobody noticed" is not a delivery boundary.
 *
 * ## How an answer is derived rather than guessed
 *
 * The question is answered from the registries that already exist. A published
 * model names a model profile; the profile names its assets; the manifest says
 * where each asset's file lives. Everything else that turns up beside those
 * files has to be accounted for — and it is accounted for **by role**, never by
 * what it is called. A rule like "flag anything whose name contains a disease"
 * would pass `heart.glb`, fail `portal.png` for the wrong reason, and teach
 * whoever hits it to rename the file.
 *
 * So each file inside an asset directory is one of four things:
 *
 *  1. **A published model's asset.** Registered, required, must be present.
 *  2. **A withheld model's asset.** Registered, not required, must be absent.
 *  3. **A support file that belongs beside it.** The licence notice the manifest
 *     itself points at, or a shared runtime dependency declared below.
 *  4. **Anything else — unregistered.** A mesh, a texture or a binary that no
 *     manifest entry claims. That is the case worth failing on: it ships, and
 *     nothing in the repository says where it came from or what may be done
 *     with it.
 *
 * Files outside every asset directory — the link-preview cards, `_headers`,
 * `robots.txt`, the generated pages, the build's own hashed chunks — are not
 * this file's question. Their own checks own them.
 *
 * Pure: it takes a file list and the registries, and returns readable lines.
 * `tests/asset-delivery.test.js` drives it with synthetic builds, because the
 * failures worth having a check for are ones a correct build never produces.
 */

/**
 * Shared runtime code that ships beside an asset and is not a medical asset.
 *
 * The Draco decoder is a vendored code dependency of the glTF loader with its
 * own upstream notice; `docs/asset-pipeline.md` states that it is deliberately
 * not in the asset manifest. It is declared here, with that reason, rather than
 * being silently tolerated by a file-extension rule — a decoder that stopped
 * being needed should have to be removed from a list somebody can read.
 *
 * Paths are build-relative (as emitted into `dist/`), and a trailing `/` means
 * "this directory and everything under it".
 */
export const SHARED_RUNTIME_PATHS = Object.freeze([
  Object.freeze({
    path: 'assets/brain/draco/',
    reason:
      'Draco decoder for the glTF loader — a code dependency with its own upstream notice, not a medical asset ' +
      '(docs/asset-pipeline.md). Shipped for every scene that loads a compressed mesh.',
  }),
]);

/** `public/assets/brain/brain.glb` → `assets/brain/brain.glb`, as `dist/` sees it. */
export const deliveryPathOf = (repositoryPath) =>
  typeof repositoryPath === 'string' && repositoryPath.startsWith('public/')
    ? repositoryPath.slice('public/'.length)
    : null;

/** The directory an asset is delivered from: `assets/brain/brain.glb` → `assets/brain/`. */
const directoryOf = (deliveryPath) => deliveryPath.slice(0, deliveryPath.lastIndexOf('/') + 1);

const underAny = (file, prefixes) => prefixes.some((prefix) => file.startsWith(prefix));

/**
 * Everything wrong with what the build delivered from `public/`.
 *
 * @param {object} input
 * @param {string[]} input.emitted every file in the build, `dist/`-relative, `/`-separated
 * @param {ReadonlyArray<object>} input.assets the whole asset manifest
 * @param {Set<string>|string[]} input.requiredAssetIds assets the published models need
 * @param {ReadonlyArray<{path:string}>} [input.sharedRuntimePaths]
 * @returns {string[]}
 */
export function assetDeliveryProblems({ emitted, assets, requiredAssetIds, sharedRuntimePaths = SHARED_RUNTIME_PATHS }) {
  const problems = [];
  const required = new Set(requiredAssetIds);
  const files = new Set(emitted);

  /** Every path a registered asset accounts for: the file, and its licence notice. */
  const accounted = new Map();
  /** The directories the asset manifest delivers into. */
  const assetDirectories = new Set();

  for (const asset of assets) {
    const delivery = deliveryPathOf(asset?.output?.path);
    if (!delivery) continue; // Not delivered from `public/` at all; nothing to inspect.
    assetDirectories.add(directoryOf(delivery));
    accounted.set(delivery, asset);

    // The licence decision record travels with the file it licenses. It is
    // taken from the manifest rather than matched by name, so a project that
    // renames its notice does not silently start shipping an unaccounted file.
    const notice = deliveryPathOf(asset.license?.decisionRecord);
    if (notice) accounted.set(notice, asset);

    const shipped = files.has(delivery);
    if (required.has(asset.assetId) && !shipped) {
      problems.push(`${asset.assetId}: a published model needs ${delivery}, and the build did not emit it`);
    }
    if (!required.has(asset.assetId) && shipped) {
      problems.push(`${asset.assetId}: no published model uses it, but ${delivery} shipped`);
    }
  }

  const sharedPrefixes = sharedRuntimePaths.map((entry) => entry.path);

  // Anything else living in an asset directory. This is the case the manifest
  // cannot see: a file nobody registered, shipping under a licence nobody
  // recorded, beside assets that are properly accounted for.
  for (const file of emitted) {
    if (!underAny(file, [...assetDirectories])) continue;
    if (accounted.has(file)) continue;
    if (underAny(file, sharedPrefixes)) continue;
    problems.push(
      `${file}: shipped from an asset directory and is in no manifest entry — register it in ` +
        'src/catalog/assetManifest.js or take it out of public/'
    );
  }

  // A declared shared dependency that is not there is worth saying: it means
  // either the list is stale, or a mesh will fail to decode in the browser.
  for (const entry of sharedRuntimePaths) {
    const present = entry.path.endsWith('/')
      ? emitted.some((file) => file.startsWith(entry.path))
      : files.has(entry.path);
    if (!present) problems.push(`shared runtime "${entry.path}" is declared but did not ship`);
  }

  return problems;
}

/**
 * The asset ids the published models actually need.
 *
 * Derived through the model profiles, which is where a scene says what geometry
 * it is made of, so nothing has to be listed twice.
 *
 * @param {ReadonlyArray<object>} scenes released scenes
 * @param {(scene:object) => object|null} profileFor
 */
export const requiredAssetIdsFor = (scenes, profileFor) =>
  new Set(scenes.flatMap((scene) => profileFor(scene)?.assets ?? []));
