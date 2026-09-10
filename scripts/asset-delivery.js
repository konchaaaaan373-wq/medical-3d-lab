/**
 * What the build is allowed to ship from `public/`, derived from the asset manifest.
 *
 * `check-site-output.js` already proved that no withheld *page*, *card* or
 * *scene chunk* reached `dist/`. It could not see the thing this file is for:
 * everything under `public/` is copied into the build verbatim, so a mesh or a
 * texture for a model the release is holding back ships with the site and no
 * check notices. "Nobody noticed" is not a delivery boundary.
 *
 * ## What is being checked, and against what
 *
 * The subject is **the files `public/` copies into the build** — not "the files
 * near a registered asset", which is what this checked first and is a rule with
 * an obvious way past it: the way to ship an unregistered mesh was never to
 * hide it among the accounted files, it was to put it anywhere else.
 * `public/models/heart.glb` was in no asset directory and so was invisible.
 *
 * So `publicFiles` is the set, and it is judged in full. Vite's own output is
 * the *other* set and is deliberately kept apart: a hashed chunk in `assets/`
 * is not a medical asset somebody forgot to register, and reading it as one
 * would make this fail on every build, which is how a check gets muted.
 *
 * ## Two rules, because one is not enough
 *
 * **Accounting.** Every file in `public/` is one of four things:
 *
 *  1. **A published model's asset.** Registered, required, must be present.
 *  2. **A withheld model's asset.** Registered, not required, must be absent.
 *  3. **A declared exception** — the licence notice the manifest itself points
 *     at, a shared runtime file, or a site surface with its own check. Each is
 *     named below with the reason it is allowed.
 *  4. **Anything else — unaccounted.** It ships to everyone and nothing in the
 *     repository says what it is.
 *
 * **Format.** A file in a 3D model format must correspond to a manifest entry,
 * *wherever it is* and whichever set it came from. This is the rule that
 * survives a new folder, a decoder directory, and an import through the
 * bundler. It keys on the file's format — what kind of thing it is — and never
 * on what it is called: "flag anything whose name contains a disease" would
 * pass `heart.glb`, fail `portal.png` for the wrong reason, and teach whoever
 * hit it to rename the file.
 *
 * Neither rule alone is enough. Accounting misses a mesh dropped into a
 * directory that is already excused; format misses a stray file that is not a
 * mesh. Together they leave no place to put an unregistered model.
 *
 * Pure: it takes a file list and the registries, and returns readable lines.
 * `tests/asset-delivery.test.js` drives it with synthetic builds, because the
 * failures worth having a check for are ones a correct build never produces.
 */

/**
 * Formats that are 3D geometry, whatever they are called or where they sit.
 *
 * A format is not an impression. This is the list of things that, if one ships,
 * a reader is being shown an anatomical shape — and the repository has to be
 * able to say where that shape came from and what may be done with it.
 */
export const MODEL_ASSET_EXTENSIONS = Object.freeze([
  '.glb', '.gltf', '.bin', '.drc', '.ktx2', '.basis',
  '.usdz', '.fbx', '.obj', '.ply', '.stl', '.dae', '.3mf', '.vrm',
]);

/**
 * Shared runtime code that ships beside an asset and is not a medical asset.
 *
 * The Draco decoder is a vendored code dependency of the glTF loader with its
 * own upstream notice; `docs/asset-pipeline.md` states that it is deliberately
 * not in the asset manifest.
 *
 * **Files, not a directory.** It was a directory prefix, and a prefix is a
 * standing permission: anything dropped beside the decoder inherited the excuse
 * written for the decoder. A mesh is not a decoder. Listing the files means a
 * version bump is an edit somebody makes, which is the whole point of writing
 * the reason down — a decoder that stopped being needed should have to be
 * removed from a list a person can read.
 *
 * Paths are build-relative, as emitted into `dist/`.
 */
export const SHARED_RUNTIME_FILES = Object.freeze([
  Object.freeze({
    path: 'assets/brain/draco/draco_decoder.wasm',
    reason:
      'Draco decoder for the glTF loader — a code dependency with its own upstream notice, not a medical asset ' +
      '(docs/asset-pipeline.md). Shipped for every scene that loads a compressed mesh.',
  }),
  Object.freeze({
    path: 'assets/brain/draco/draco_wasm_wrapper.js',
    reason: 'The JavaScript wrapper the Draco decoder is loaded through. Same dependency, same notice.',
  }),
]);

/**
 * Parts of `public/` that are not model assets and have their own checks.
 *
 * Prefixes are safe here in a way they were not for the decoder, because the
 * format rule still applies inside them: a `.glb` in `social/` is caught even
 * though `social/` is excused. What these say is "this content is somebody
 * else's question", and they name whose.
 */
export const SITE_SURFACE_PATHS = Object.freeze([
  Object.freeze({
    path: 'social/',
    reason:
      'Link-preview cards and the record of what each one says. Owned by scripts/check-social-cards.js, which ' +
      'fails when the committed set does not match what the release publishes.',
  }),
  Object.freeze({
    path: '_headers',
    reason: 'Deploy header configuration for the static host. Checked by tests/security-headers.test.js.',
  }),
  Object.freeze({
    path: '.gitkeep',
    reason:
      'Keeps public/ in git when it would otherwise be empty. Zero bytes, and it ships — which is how this ' +
      'check found it: nothing else in the repository had ever said what it was.',
  }),
]);

/** `public/assets/brain/brain.glb` → `assets/brain/brain.glb`, as `dist/` sees it. */
export const deliveryPathOf = (repositoryPath) =>
  typeof repositoryPath === 'string' && repositoryPath.startsWith('public/')
    ? repositoryPath.slice('public/'.length)
    : null;

const underAny = (file, prefixes) => prefixes.some((prefix) => file.startsWith(prefix));

/** Whether a path is in one of the 3D formats above. */
export const isModelFile = (file) =>
  MODEL_ASSET_EXTENSIONS.some((extension) => file.toLowerCase().endsWith(extension));

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
export function assetDeliveryProblems({
  emitted,
  publicFiles = [],
  assets,
  requiredAssetIds,
  sharedRuntimeFiles = SHARED_RUNTIME_FILES,
  siteSurfacePaths = SITE_SURFACE_PATHS,
}) {
  const problems = [];
  const required = new Set(requiredAssetIds);
  const shipped = new Set(emitted);
  const fromPublic = new Set(publicFiles);

  /** Every path a registered asset accounts for: the file, and its licence notice. */
  const accounted = new Map();

  for (const asset of assets) {
    const delivery = deliveryPathOf(asset?.output?.path);
    if (!delivery) continue; // Not delivered from `public/` at all; nothing to inspect.
    accounted.set(delivery, asset);

    // The licence decision record travels with the file it licenses. It is
    // taken from the manifest rather than matched by name, so a project that
    // renames its notice does not silently start shipping an unaccounted file.
    const notice = deliveryPathOf(asset.license?.decisionRecord);
    if (notice) accounted.set(notice, asset);

    const present = shipped.has(delivery);
    if (required.has(asset.assetId) && !present) {
      problems.push(`${asset.assetId}: a published model needs ${delivery}, and the build did not emit it`);
    }
    if (!required.has(asset.assetId) && present) {
      problems.push(`${asset.assetId}: no published model uses it, but ${delivery} shipped`);
    }
  }

  const sharedPaths = new Set(sharedRuntimeFiles.map((entry) => entry.path));
  const surfacePrefixes = siteSurfacePaths.map((entry) => entry.path);

  // Rule 1 — accounting. Every file `public/` copies into the build is a
  // registered asset, a notice, a declared shared file, or a declared surface.
  for (const file of fromPublic) {
    if (accounted.has(file) || sharedPaths.has(file) || underAny(file, surfacePrefixes)) continue;
    problems.push(
      `${file}: is in no manifest entry and is not a declared exception — register it in ` +
        'src/catalog/assetManifest.js, declare it in scripts/asset-delivery.js with a reason, or take it out of public/'
    );
  }

  // Rule 2 — format. A 3D model has to be a registered asset wherever it is,
  // which is what survives a new directory, an excused directory, and a mesh
  // pulled in through the bundler.
  for (const file of new Set([...fromPublic, ...shipped])) {
    if (!isModelFile(file) || accounted.has(file)) continue;
    problems.push(
      `${file}: is a model file that no manifest entry claims. Geometry ships with a recorded source and ` +
        'licence or it does not ship — see docs/asset-pipeline.md.'
    );
  }

  // `public/` is copied verbatim, so a file that is in it and not in the build
  // means the copy did not happen — worth saying rather than assuming.
  for (const file of fromPublic) {
    if (!shipped.has(file)) problems.push(`${file}: is in public/ and did not reach the build`);
  }

  // A declared shared dependency that is not there is worth saying too: it
  // means either the list is stale, or a mesh will fail to decode in the browser.
  for (const entry of sharedRuntimeFiles) {
    if (!shipped.has(entry.path)) problems.push(`shared runtime "${entry.path}" is declared but did not ship`);
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
