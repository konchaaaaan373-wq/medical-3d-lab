/**
 * Start fetching a scene's model files the moment the route is known, and say
 * how far along they are.
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
 * And while all of that happened the reader looked at one sentence and a bar
 * sweeping back and forth — for nine seconds on the heart, with nothing to say
 * whether it was moving or stuck (with reduced motion the bar did not even
 * sweep: it sat at 40 % the whole time). The byte count is the only honest
 * progress this page has, so the veil shows it.
 *
 * ## How
 *
 * `main.js` fetches the files itself, reads each body as it arrives (reading
 * is what keeps the download going: an unread body is throttled by the
 * browser), and counts. Then it answers the scene's own request for the same
 * URL with the bytes it already has, **once**, and steps aside.
 *
 * That last part is a narrow wrapper around `window.fetch`, and it is the
 * whole reason the scene modules are not touched: they are pinned model
 * sources of their published model cards (`docs/model-cards/revisions.json`),
 * and a change to them — even to pass an `onProgress` — would close the scene.
 * The wrapper matches a GET for exactly one of the prefetched URLs, hands over
 * that file and forgets it; everything else, including a retry of the same
 * file, goes to the network untouched. When every file has been handed over,
 * the original `fetch` is put back.
 *
 * `<link rel="preload">` was the first version (same day). It started the
 * download just as early, but a preload has no progress to read.
 *
 * `verify:anatomy` checks the two ways this can go wrong without anything
 * failing: a file downloaded twice (the hand-over did not match), and a file
 * requested only after the loader code arrived (the prefetch did not happen).
 *
 * ## What decides which files
 *
 * The build, from the catalogue: the released scenes' model profiles name
 * their assets, and the asset manifest says where each one ships and how big
 * it is. So only a scene the release opens is prefetched, and only files that
 * are in the build. See `vite.config.js`.
 */

/** Where a manifest's `output.path` is served from, relative to the base URL. */
const PUBLIC_PREFIX = 'public/';

/**
 * Scene id → the model files it loads, relative to the base URL, with their
 * size from the asset manifest — and, when `decoderFor` says an asset needs
 * one, the decoder files that must arrive before it can be read (once per
 * scene however many assets need them).
 *
 * The size is the manifest's, not the response's `Content-Length`: a response
 * compressed on the wire declares its compressed length while its body yields
 * the decoded bytes, and the manifest's number is the one the body adds up to.
 *
 * @param {object[]} scenes the scenes to cover — the released ones in a build
 * @param {(scene: object) => ({ assets?: string[] } | null)} profileFor
 * @param {(id: string) => ({ output?: { path?: string, bytes?: number } } | null)} assetFor
 * @param {{ decoderFor?: (asset: object) => { url: string, bytes: number }[] }} [options]
 * @returns {Record<string, { url: string, bytes: number }[]>}
 */
export function sceneAssetUrls(scenes, profileFor, assetFor, { decoderFor = () => [] } = {}) {
  const table = {};
  for (const scene of scenes) {
    const assets = (profileFor(scene)?.assets ?? [])
      .map((id) => assetFor(id))
      .filter((asset) => typeof asset?.output?.path === 'string' && asset.output.path.startsWith(PUBLIC_PREFIX));
    const files = assets.map((asset) => ({
      url: asset.output.path.slice(PUBLIC_PREFIX.length),
      bytes: Number(asset.output.bytes) || 0,
    }));
    for (const decoder of assets.flatMap((asset) => decoderFor(asset))) {
      if (!files.some((file) => file.url === decoder.url)) files.push(decoder);
    }
    if (files.length) table[scene.id] = files;
  }
  return table;
}

/** Read a body to the end, reporting each chunk's size. */
async function readCounting(response, onBytes) {
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength);
    return [buffer];
  }
  const reader = response.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return chunks;
    chunks.push(value);
    onBytes(value.byteLength);
  }
}

/**
 * Fetch a scene's model files now, and serve them to whoever asks next.
 *
 * @param {{ files?: { url: string, bytes: number }[], baseUrl?: string, win?: any }} options
 * @returns {null | {
 *   state: () => { loaded: number, total: number, done: boolean, failed: boolean },
 *   subscribe: (listener: (state: { loaded: number, total: number, done: boolean, failed: boolean }) => void) => () => void,
 * }} null when there is nothing to fetch
 */
export function prefetchSceneAssets({ files, baseUrl = './', win = globalThis } = {}) {
  if (!files?.length || typeof win?.fetch !== 'function') return null;

  const original = win.fetch;
  const pending = new Map();
  const listeners = new Set();
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  let loaded = 0;
  let finished = 0;
  let failed = false;

  const state = () => ({ loaded: Math.min(loaded, total), total, done: finished === files.length, failed });
  const notify = () => {
    const now = state();
    for (const listener of listeners) listener(now);
  };

  for (const file of files) {
    const href = new URL(`${baseUrl}${file.url}`, win.location.href).href;
    let counted = 0;
    const body = original
      .call(win, href, { credentials: 'same-origin' })
      .then(async (response) => {
        const chunks = await readCounting(response, (bytes) => {
          counted += bytes;
          loaded += bytes;
          notify();
        });
        return {
          chunks,
          init: {
            status: response.status,
            statusText: response.statusText,
            headers: { 'content-type': response.headers.get('content-type') ?? 'application/octet-stream' },
          },
        };
      })
      .catch((error) => {
        failed = true;
        throw error;
      })
      .finally(() => {
        // The file counts as its manifest size once it is in, whatever the
        // body added up to, so the bar ends at the end.
        loaded += file.bytes - counted;
        finished += 1;
        notify();
      });
    // Nobody may ask for it (a scene that fails before loading); an unobserved
    // rejection here is not an error of its own — the scene reports its own.
    body.catch(() => {});
    pending.set(href, body);
  }

  win.fetch = function prefetchedFetch(input, init) {
    const href = typeof input === 'string' || input instanceof URL
      ? new URL(String(input), win.location.href).href
      : input?.url;
    const method = String(init?.method ?? input?.method ?? 'GET').toUpperCase();
    const body = method === 'GET' ? pending.get(href) : undefined;
    if (!body) return original.call(win, input, init);
    pending.delete(href);
    if (!pending.size && win.fetch === prefetchedFetch) win.fetch = original;
    return body.then(({ chunks, init: responseInit }) => new win.Response(new win.Blob(chunks), responseInit));
  };

  return {
    state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state());
      return () => listeners.delete(listener);
    },
  };
}

/**
 * The line under the veil's sentence.
 *
 * Megabytes to one decimal: the number is there to show movement, and a
 * reader on a slow link sees it change every second or so at that precision.
 *
 * @param {{ loaded: number, total: number, done: boolean, failed: boolean }} progress
 * @param {'ja' | 'en'} language
 */
export function describeAssetProgress({ loaded, total, done, failed }, language = 'ja') {
  const ja = language !== 'en';
  if (failed) return '';
  if (done) return ja ? '表示を準備しています' : 'Preparing the model';
  const mb = (bytes) => (bytes / 1e6).toFixed(1);
  return `${mb(loaded)} / ${mb(total)} MB`;
}
