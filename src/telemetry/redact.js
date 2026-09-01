/**
 * Redaction — the layer that makes error reporting safe to switch on.
 *
 * Everything that leaves the browser passes through here first. The rules are
 * written for what this product can plausibly touch:
 *
 *   - an authentication or password-recovery token, which arrives *in the URL
 *     hash* on this app and would otherwise be the single most damaging string
 *     an error report could carry;
 *   - a billing identifier or key from the payment provider;
 *   - an email address, which is the only personal datum the account layer
 *     holds at all;
 *   - a long digit run, because a medical product is exactly the place where
 *     somebody eventually pastes a record number into a field;
 *   - a developer's absolute file path, which is not personal data about a
 *     user but is personal data about whoever built it.
 *
 * Pure functions, no DOM, no network: `node --test` can prove the redaction
 * without ever making a request.
 */

/** Replacement tokens, exported so tests assert on names rather than literals. */
export const REDACTED = {
  email: '[email]',
  token: '[token]',
  key: '[key]',
  uuid: '[uuid]',
  hex: '[hex]',
  ip: '[ip]',
  digits: '[digits]',
  path: '[path]',
  query: '[query]',
  hash: '[hash]',
};

/**
 * Ordered, and the order is the policy: the most specific pattern must claim a
 * string before a broader one can turn it into something unrecognisable. A JWT
 * matched as three base64 runs is more useful in a report than the same JWT
 * mangled into three separate `[hex]`.
 */
const RULES = [
  // Provider keys and webhook secrets, before any generic alphanumeric rule.
  { pattern: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/g, with: REDACTED.key },
  { pattern: /\bwhsec_[A-Za-z0-9]{8,}/g, with: REDACTED.key },
  { pattern: /\b(?:cus|sub|pi|seti|price|prod|in|evt)_[A-Za-z0-9]{10,}/g, with: REDACTED.key },
  // JSON Web Tokens — Supabase access/refresh tokens arrive in the URL hash.
  { pattern: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g, with: REDACTED.token },
  // Explicitly named credentials in any `key=value` shape.
  {
    pattern: /\b(access_token|refresh_token|id_token|api[_-]?key|password|secret|authorization)=[^&\s"']+/gi,
    with: (match) => `${match.split('=')[0]}=${REDACTED.token}`,
  },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi, with: `Bearer ${REDACTED.token}` },
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g, with: REDACTED.email },
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    with: REDACTED.uuid,
  },
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, with: REDACTED.ip },
  { pattern: /\b[0-9a-f]{24,}\b/gi, with: REDACTED.hex },
  // A record number, a phone number, a card. Nine digits is above anything the
  // product itself produces and below a millisecond timestamp, which is 13.
  { pattern: /\b\d{9,12}\b/g, with: REDACTED.digits },
];

/**
 * Absolute paths, replaced by their last two segments.
 *
 * A stack frame is useless without a file name and dangerous with a home
 * directory in it. `/Users/someone/dev/app/src/app/Viewer.js` becomes
 * `[path]/app/Viewer.js`, which still points at the line that failed.
 */
const PATH_RULES = [
  { pattern: /(?:file:\/\/)?\/(?:Users|home|root)\/[^\s):'"]+/g },
  { pattern: /[A-Za-z]:\\Users\\[^\s):'"]+/g },
];

const shortenPath = (match) => {
  const parts = match.split(/[\\/]/).filter(Boolean);
  return `${REDACTED.path}/${parts.slice(-2).join('/')}`;
};

/**
 * Redact any free text — an error message, a stack line, a label.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function redactText(value) {
  if (value == null) return '';
  let text = typeof value === 'string' ? value : String(value);
  for (const rule of PATH_RULES) text = text.replace(rule.pattern, shortenPath);
  for (const rule of RULES) {
    text = text.replace(rule.pattern, typeof rule.with === 'function' ? rule.with : () => rule.with);
  }
  return text;
}

/**
 * A URL slug that is safe to keep: a scene route or a product-shell route.
 *
 * The app addresses everything through the hash, so throwing the whole hash
 * away would leave every report saying only "something failed somewhere". This
 * keeps the part that is a route and discards the part that could be a token.
 */
const SAFE_HASH = /^#\/?[a-z0-9-]{0,64}$/;

/** `decodeURIComponent` throws on a malformed escape; a bad URL must not throw here. */
function decodeSafely(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Reduce a URL to origin + path, plus a route hash when the hash is only a route.
 *
 * The query string is always dropped: this app puts `?account=recovery` and
 * provider callbacks there, and nothing in it is worth the risk of keeping.
 *
 * @param {unknown} value
 */
export function redactUrl(value) {
  if (typeof value !== 'string' || value === '') return '';
  let url;
  try {
    url = new URL(value, 'https://placeholder.invalid');
  } catch {
    return redactText(value);
  }
  // The path is redacted too: a relative URL that was never a URL at all lands
  // here as a pathname, and a real path can carry an identifier in a segment.
  const path = redactText(decodeSafely(url.pathname));
  const base = url.origin === 'https://placeholder.invalid' ? path : `${url.origin}${path}`;
  const query = url.search ? REDACTED.query : '';
  const hash = url.hash ? (SAFE_HASH.test(url.hash) ? url.hash : REDACTED.hash) : '';
  return `${base}${query}${hash}`;
}

/**
 * Redact a stack trace and keep only the frames worth reading.
 *
 * @param {unknown} stack
 * @param {{ frames?: number }} [options]
 */
export function redactStack(stack, { frames = 8 } = {}) {
  if (typeof stack !== 'string' || stack === '') return [];
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, frames)
    .map((line) => redactText(line.replace(/https?:\/\/[^\s):'"]+/g, (url) => redactUrl(url))));
}

/**
 * FNV-1a, 32-bit. Small, dependency-free and stable across runs — which is all
 * a fingerprint needs to be, since it groups reports rather than securing them.
 *
 * @param {string} text
 */
export function stableHash(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * A stable identity for "this is the same failure again".
 *
 * Built from the redacted text on purpose: two users hitting the same bug with
 * different tokens in the message must produce the same fingerprint, or
 * deduplication silently stops working exactly when a problem is widespread.
 *
 * @param {{ name?: string, message?: string, frames?: string[] }} report
 */
export function fingerprint({ name = 'Error', message = '', frames = [] } = {}) {
  const shape = [
    name,
    // Numbers inside a message are usually the instance, not the bug.
    redactText(message).replace(/\d+/g, '#'),
    ...frames.slice(0, 3),
  ].join('|');
  return stableHash(shape);
}

/**
 * True when a string still looks like it carries something personal.
 *
 * Used by the tests as an independent check on `redactText` — a second opinion
 * rather than the same regular expressions asserting on themselves.
 *
 * @param {string} text
 */
export function looksSensitive(text) {
  if (typeof text !== 'string') return false;
  return (
    /[\w.+-]+@[\w-]+\.[\w.-]{2,}/.test(text) ||
    /\beyJ[A-Za-z0-9_-]{6,}\./.test(text) ||
    /\b(?:sk|pk|rk)_(?:live|test)_/.test(text) ||
    /\/(?:Users|home|root)\//.test(text) ||
    /\b[0-9a-f]{24,}\b/i.test(text)
  );
}
