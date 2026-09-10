/**
 * Vite plugin: keep the scenes the release does not open out of the bundle.
 *
 * The release gate decides what the product *offers*. This decides what the
 * product *ships* — and they are different questions. Filtering an array at
 * run time still downloads every scene's chunk with the site, so "not offered"
 * and "not delivered" had been the same word for two different things.
 *
 * ## How
 *
 * `src/catalog/scenes.js` declares one `id: '<scene>'` and one
 * `load: () => import('<literal>')` per entry, and the literal is what Rollup
 * follows to emit a chunk. For a scene the release does not open, that thunk is
 * replaced here, before Rollup reads the module, with one that rejects. No
 * import, no chunk, no code.
 *
 * The entries are read out of the file's own text and then **checked against
 * the manifest**: the ids found, in order, have to be exactly the ids the
 * catalogue declares, in order. If they are not — a `load` written across two
 * lines, a computed specifier, an entry the reader missed — the build fails
 * loudly rather than shipping a scene it meant to strip or stripping one it
 * meant to keep. That check is why this is safe to run over a file it does not
 * own.
 *
 * Reading the text rather than `String(scene.load)` is deliberate: Vite bundles
 * `vite.config.js` and its imports before running it, so by the time the
 * manifest reaches this plugin its arrow functions have already been rewritten
 * and no longer match the file on disk.
 *
 * ## What it does not claim
 *
 * This is not access control. The bundle is smaller and a locked scene's code
 * is absent from it; the repository is public and unchanged, and anybody may
 * read, build and run the whole catalogue. See `docs/beta-release.md`.
 *
 * A preview build (`VITE_ALLOW_PREVIEW=1`) skips this entirely — an internal
 * reviewer has to be able to open the work in progress, which is the whole
 * point of a preview build.
 */

/** The catalogue module this rewrites, matched at the end of a resolved id. */
const SCENES_MODULE = 'src/catalog/scenes.js';

/** `id: 'x'` or `load: () => import('y')`, whichever comes next, in order. */
const ENTRY_PATTERN = /\bid:\s*'([a-z0-9-]+)'|\bload:\s*\(\)\s*=>\s*import\('([^']+)'\)/g;

/**
 * The `(id, loader source)` pairs the file declares, in file order.
 *
 * One pass, so an id without a loader after it — or a loader with no id before
 * it — comes out as a length or order mismatch at the call site rather than as
 * a silently skipped entry.
 *
 * @param {string} code
 * @returns {{id:string, source:string}[]}
 */
function readEntries(code) {
  const entries = [];
  let pendingId = null;
  for (const match of code.matchAll(ENTRY_PATTERN)) {
    if (match[1] != null) {
      pendingId = match[1];
      continue;
    }
    if (pendingId == null) continue;
    entries.push({ id: pendingId, source: match[0] });
    pendingId = null;
  }
  return entries;
}

/**
 * @param {{scenes: object[], released: object[], enabled?: boolean}} options
 *   `scenes` every catalogue entry, `released` the ones to keep.
 */
export function publicSceneLoadersPlugin({ scenes, released, enabled = true } = {}) {
  const keep = new Set(released.map((scene) => scene.id));
  const strip = scenes.filter((scene) => !keep.has(scene.id));

  return {
    name: 'medical-3d-lab:public-scene-loaders',
    apply: 'build',
    enforce: 'pre',

    transform(code, id) {
      if (!enabled) return null;
      if (!id.split('?')[0].replace(/\\/g, '/').endsWith(SCENES_MODULE)) return null;

      const entries = readEntries(code);
      const found = entries.map((entry) => entry.id).join(',');
      const declared = scenes.map((scene) => scene.id).join(',');
      if (found !== declared) {
        this.error(
          `${SCENES_MODULE}: read ${entries.length} scene loader(s) [${found}] but the catalogue declares ` +
            `${scenes.length} [${declared}]. Keep each entry's \`id\` and its single-line ` +
            '`load: () => import(\'…\')` in the shape the manifest documents, or this build cannot tell ' +
            'which scenes it is shipping.'
        );
      }

      let out = code;
      for (const entry of entries) {
        if (keep.has(entry.id)) continue;
        out = out.replace(
          entry.source,
          `load: () => Promise.reject(new Error('scene \"${entry.id}\" is not part of this build'))`
        );
      }

      const stripped = entries.length - keep.size;
      if (stripped > 0) {
        this.info(
          `${stripped} scene(s) the release does not open were left out of the bundle; ${keep.size} shipped.`
        );
      }
      return { code: out, map: null };
    },
  };
}
