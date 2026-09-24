/**
 * Start fetching a scene's model files the moment the route is known.
 *
 * ## Why this exists
 *
 * A scene asks for its GLB from inside its own `build()`, which runs only after
 * the entry chunk, `App`, `three`, the scene chunk and `GLTFLoader` have all
 * arrived and the scene has been constructed. Measured on a 9 Mbps / 60 ms
 * link with a 4× CPU slowdown (2026-09-24), the brain atlas request went out at
 * **3.7 s** and the heart at **3.8 s** — the network sat idle for that long
 * while the largest thing on the page waited its turn. The heart then fetched
 * its vasculature only after the heart itself had finished, so its two files
 * crossed the wire one after the other.
 *
 * ## How
 *
 * A `<link rel="preload" as="fetch" crossorigin="anonymous">` per file, added
 * as soon as `main.js` has resolved the route. The loader's own `fetch` is then
 * answered from the preload cache instead of the network: `crossorigin=
 * "anonymous"` is what makes the preload's mode (`cors`) and credentials
 * (`same-origin`) match the `Request` that three's `FileLoader` builds, and a
 * preload that does not match is not a no-op — the file is downloaded twice.
 * `verify:anatomy` counts the requests per model file for that reason.
 *
 * The scene modules are not touched. They are pinned model sources of their
 * published model cards (`docs/model-cards/revisions.json`), and the preload
 * needs nothing from them: the same URL, requested earlier.
 *
 * ## What decides which files
 *
 * The build, from the catalogue: the released scenes' model profiles name
 * their assets, and the asset manifest says where each one ships. So only a
 * scene the release opens gets a preload, and only for files that are in the
 * build — a withheld scene's asset is not in `dist/`, and preloading it would
 * be a 404 on every visit. See `vite.config.js`.
 *
 * Pure except for `preloadSceneAssets`, which is handed the document.
 */

/** Where a manifest's `output.path` is served from, relative to the base URL. */
const PUBLIC_PREFIX = 'public/';

/**
 * Scene id → the URLs (relative to the base URL) of the model files it loads.
 *
 * @param {object[]} scenes the scenes to cover — the released ones in a build
 * @param {(scene: object) => ({ assets?: string[] } | null)} profileFor
 * @param {(id: string) => ({ output?: { path?: string } } | null)} assetFor
 * @returns {Record<string, string[]>}
 */
export function sceneAssetUrls(scenes, profileFor, assetFor) {
  const table = {};
  for (const scene of scenes) {
    const urls = (profileFor(scene)?.assets ?? [])
      .map((id) => assetFor(id)?.output?.path)
      .filter((path) => typeof path === 'string' && path.startsWith(PUBLIC_PREFIX))
      .map((path) => path.slice(PUBLIC_PREFIX.length));
    if (urls.length) table[scene.id] = urls;
  }
  return table;
}

/**
 * Ask the browser for a scene's model files now.
 *
 * @param {Document} doc
 * @param {string[]} urls relative to the base URL
 * @param {string} [baseUrl]
 * @returns {number} how many preloads were added
 */
export function preloadSceneAssets(doc, urls, baseUrl = './') {
  let added = 0;
  for (const url of urls ?? []) {
    const link = doc.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
    link.href = `${baseUrl}${url}`;
    doc.head.append(link);
    added += 1;
  }
  return added;
}
