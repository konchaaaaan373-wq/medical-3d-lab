/**
 * One parameter of a route's query, written or removed, and every other part
 * kept **as written**: re-serialising through `URLSearchParams` would turn
 * `left%20atrium` into `left+atrium` and a bare flag into `flag=`, and write
 * the changed link into history.
 *
 * Shared by `hashWithView` (`router.js`) and `hashWithPurpose` (`purpose.js`),
 * which had each written it out — and each called `decodeURIComponent` on every
 * key, which throws on a malformed escape. A link carrying `&%E0=1` then threw
 * while the screen was being built, and the model never opened. A key that
 * does not decode is not the one being written, so it is kept as written.
 *
 * @param {string} hash e.g. `#/cardiac-output?structure=left%20atrium`
 * @param {string} key
 * @param {string|null} value written as `key=value`, or null to remove it
 * @returns {string}
 */
export function hashWithParam(hash, key, value) {
  const text = String(hash ?? '');
  const at = text.indexOf('?');
  const route = at < 0 ? text : text.slice(0, at);
  const query = at < 0 ? '' : text.slice(at + 1);
  const kept = query.split('&').filter((part) => part && keyOf(part) !== key);
  if (value != null && value !== '') kept.push(`${key}=${encodeURIComponent(value)}`);
  return kept.length ? `${route}?${kept.join('&')}` : route;
}

function keyOf(part) {
  const raw = part.split('=')[0].replace(/\+/g, ' ');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
