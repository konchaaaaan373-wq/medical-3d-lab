const SAFE_STATES = new Set([
  'idle',
  'deferred',
  'loading',
  'ready',
  'error',
  'unavailable',
  'disposed',
  'unknown',
]);

const clean = (value, max = 160) => String(value ?? '')
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .slice(0, max);

export function browserFamilyMajor(userAgent = globalThis.navigator?.userAgent ?? '') {
  const ua = String(userAgent);
  const candidates = [
    ['Edge', /Edg\/(\d+)/],
    ['Firefox', /Firefox\/(\d+)/],
    ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
    ['Safari', /Version\/(\d+)(?:\.\d+)*.*Safari\//],
  ];
  for (const [family, pattern] of candidates) {
    const match = ua.match(pattern);
    if (match) return `${family} ${match[1]}`;
  }
  return 'Unknown';
}

export function normalizeDiagnosticState(value) {
  const state = clean(value, 32).toLowerCase();
  return SAFE_STATES.has(state) ? state : 'unknown';
}

/**
 * Build diagnostic text that is safe to show before an explicit copy action.
 *
 * Intentionally excluded: URL/query/hash, tokens, cookies, storage,
 * account/user identifiers, navigation or anatomy-selection history,
 * request headers, raw errors/stacks, and high-entropy device fingerprinting.
 */
export function buildPublicDiagnosticText({
  modelId,
  build,
  revision,
  language,
  state,
  browser = browserFamilyMajor(),
  steps = '',
} = {}) {
  const lines = ['Medical 3D Lab diagnostic'];
  const add = (label, value, max) => {
    const safe = clean(value, max);
    if (safe) lines.push(`${label}: ${safe}`);
  };

  add('model', modelId, 80);
  add('build', build, 80);
  add('revision', revision, 80);
  add('language', language, 16);
  add('browser', browser, 40);
  lines.push(`state: ${normalizeDiagnosticState(state)}`);
  lines.push('', 'Steps / 再現手順:');
  const safeSteps = String(steps ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 1200);
  if (safeSteps) lines.push(safeSteps);
  return lines.join('\n');
}

export async function copyPublicDiagnostic(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) throw new Error('clipboard-unavailable');
  await clipboard.writeText(String(text));
  return true;
}

export const PUBLIC_DIAGNOSTIC_ALLOWED_FIELDS = Object.freeze([
  'modelId',
  'build',
  'revision',
  'language',
  'state',
  'browser',
  'steps',
]);
