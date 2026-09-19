/**
 * Which build is this, and is it the site?
 *
 * A reader reported "hide the controls leaves no way back" against a URL that
 * had been fixed two days earlier. Both were true: the address was
 * `deploy-preview-72--…`, a preview frozen at a merged pull request, and a
 * merged PR's preview never rebuilds. Nothing on the page said so, so the same
 * screen was reported twice and answered twice from the wrong build
 * (`docs/verification-lessons.md` L-51).
 *
 * Netlify names every build in the environment it runs in — `CONTEXT` is
 * `production`, `deploy-preview` or `branch-deploy`, `REVIEW_ID` is the pull
 * request number, `COMMIT_REF` the commit. Vite replaces the three constants
 * below at build time, so the answer travels *inside the bundle* rather than
 * being asked of the host it happens to be served from: a preview copied to
 * another address still says what it is.
 *
 * Unset (a local `npm run build`, or a host that is not Netlify) reads as
 * `local`, which is not production either — the marker shows, which is the
 * safe direction for a value nobody set.
 */

/* global __BUILD_CONTEXT__, __BUILD_COMMIT__, __BUILD_REVIEW__ */
const read = (value, fallback = '') => {
  try {
    return typeof value === 'string' && value ? value : fallback;
  } catch {
    // Not replaced at all — a bundler other than this one, or a test importing
    // the module directly. `local` is the honest answer to "which deploy?".
    return fallback;
  }
};

export const BUILD_CONTEXT = read(typeof __BUILD_CONTEXT__ === 'undefined' ? '' : __BUILD_CONTEXT__, 'local');
export const BUILD_COMMIT = read(typeof __BUILD_COMMIT__ === 'undefined' ? '' : __BUILD_COMMIT__, '');
export const BUILD_REVIEW = read(typeof __BUILD_REVIEW__ === 'undefined' ? '' : __BUILD_REVIEW__, '');

/** The published site, and nothing else. */
export const isProductionBuild = () => BUILD_CONTEXT === 'production';

/**
 * One line naming this build, for a reader who needs to know what they are
 * looking at before they report what it does.
 *
 * Short on purpose: it sits on screen, and the detail that matters is which
 * *kind* of build it is, then which pull request, then the commit for anyone
 * who wants to check it out.
 */
export function buildLabel(en = false) {
  const kind = {
    'deploy-preview': en ? 'Preview' : 'プレビュー版',
    'branch-deploy': en ? 'Branch build' : 'ブランチ版',
    local: en ? 'Local build' : 'ローカル版',
  };
  const parts = [kind[BUILD_CONTEXT] ?? BUILD_CONTEXT];
  if (BUILD_REVIEW) parts.push(`PR #${BUILD_REVIEW}`);
  if (BUILD_COMMIT) parts.push(BUILD_COMMIT.slice(0, 7));
  return parts.join(' · ');
}
