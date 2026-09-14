/**
 * Serving a built site to a browser the checks drive.
 *
 * Every browser check needs the same thing — a static server over `dist/` that
 * falls back to `index.html`, because the product routes on the hash and a deep
 * link is still one document. That block was copied into each of them, which
 * means the path-traversal guard and the media types exist in as many versions
 * as there are checks, and a new asset type has to be remembered in all of them.
 *
 * Deliberately tiny and deliberately local-only: it binds 127.0.0.1 on a port
 * the kernel picks, serves with `cache-control: no-store` so a check never
 * measures a stale build, and is closed by the caller. It is not a preview
 * server and must not grow into one — `npm run preview` is Vite's.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

/** What a built site can contain. Anything else is served as a download. */
const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
});

/**
 * Start a server over one built site.
 *
 * `mounts` maps a URL prefix to a directory outside the build. It exists for
 * one real case and should stay that narrow: candidate 3D assets live in the
 * repository and are deliberately **not** copied into a build, so a check that
 * drives them has to serve them from where they are. Each mount is contained
 * the same way the build is.
 *
 * @param {string} distDir
 * @param {{mounts?: Record<string, string>}} [options]
 * @returns {Promise<{base: string, close: () => void}>} `base` ends in `/`
 */
export async function serveDist(distDir, { mounts = {} } = {}) {
  const root = resolve(distDir);
  if (!existsSync(root)) throw new Error(`No build at "${distDir}"`);
  const mounted = Object.entries(mounts).map(([prefix, dir]) => [prefix, resolve(dir)]);

  /** The file a URL names, or null when it escapes what is being served. */
  const fileFor = (urlPath) => {
    const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    const mount = mounted.find(([prefix]) => decoded.startsWith(prefix));
    const base = mount ? mount[1] : root;
    const candidate = resolve(base, `.${normalize(decoded)}`);
    // `startsWith(base + sep)`, not `startsWith(base)`: a sibling directory
    // whose name begins with the served one's is not inside it.
    if (candidate !== base && !candidate.startsWith(base + sep)) return null;
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      const index = join(candidate, 'index.html');
      return existsSync(index) ? index : null;
    }
    return existsSync(candidate) ? candidate : null;
  };

  const server = createServer((request, response) => {
    const file = fileFor(request.url ?? '/') ?? join(root, 'index.html');
    response.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    base: `http://127.0.0.1:${server.address().port}/`,
    close: () => server.close(),
  };
}
