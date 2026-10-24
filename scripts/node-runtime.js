/**
 * Which Node built the site, and which Node its functions will run on.
 *
 * `.nvmrc` says what it should be (R-2026-10-22-01). Whether Netlify obeyed
 * could only be read in its dashboard, which nothing in this repository can
 * reach (F-277). So the build says it itself: two meta tags beside
 * `build-context` and `build-commit` (`site-metadata.js`), read back from the
 * live origin by `verify:live`.
 *
 * The functions' runtime is not a guess. `@netlify/build` (37.6.1,
 * `plugins_core/functions/zisi.js`, `getLambdaNodeVersion`) hands the
 * function bundler `AWS_LAMBDA_JS_RUNTIME` when the build environment has
 * one, and the build's own Node version otherwise; and it runs the build
 * command with that same environment (`env: childEnv, extendEnv: false`) on
 * that same Node (`execPath: nodePath`). So what `vite build` sees here is
 * what decided the runtime of every function, `scheduled-billing-reconcile`
 * included.
 *
 * Only a major version leaves the build. The repository is public and
 * `.nvmrc` already says it; a patch version would say more than that.
 */

/**
 * The major a `.nvmrc`'s text names, as a string (`'24'`), or `''` if it names
 * none. Takes the text rather than reading the file, so `site-metadata.js` can
 * import this module and stay what it says it is: string building, no `fs`.
 */
export const nvmrcMajor = (text = '') => String(text).trim().match(/^(\d+)/)?.[1] ?? '';

/** The major of the Node running this build. */
export const buildNodeMajor = (versions = process.versions) => String(versions.node ?? '').split('.')[0];

/**
 * The major the function bundler will be given — `AWS_LAMBDA_JS_RUNTIME` when
 * the build environment sets it (`nodejs22.x` → `'22'`), else the build's own.
 * An override that names no version is reported as `'unparsed'`, not dropped:
 * it still wins over the build's Node, so silence would be the wrong answer.
 */
export function functionsNodeMajor(env = process.env, buildMajor = buildNodeMajor()) {
  const override = env.AWS_LAMBDA_JS_RUNTIME;
  if (!override) return buildMajor;
  return override.match(/\d+/)?.[0] ?? 'unparsed';
}

/**
 * What is wrong with a served build's Node stamp, as sentences. Empty when
 * the build and its functions both ran on the major `.nvmrc` names.
 *
 * @param {{buildNode:string, functionsNode:string, expected:string}} stamp
 */
export function nodeStampProblems({ buildNode, functionsNode, expected }) {
  if (!expected) return ['.nvmrc names no Node major, so there is nothing to hold the deploy to'];
  if (!buildNode) {
    return [
      'the served page carries no build-node meta tag — either this origin is running a build ' +
        'from before the build stamped its Node, or it is not this site at all',
    ];
  }
  const problems = [];
  if (buildNode !== expected) {
    problems.push(
      `the served build was made on Node ${buildNode}, but .nvmrc says ${expected} — ` +
        'Netlify did not build from .nvmrc (look for NODE_VERSION in the site configuration)',
    );
  }
  if (functionsNode !== expected) {
    problems.push(
      `the served build gave its functions Node ${functionsNode || 'nothing'}, but .nvmrc says ${expected}` +
        (functionsNode && functionsNode !== buildNode
          ? ' — AWS_LAMBDA_JS_RUNTIME in the Netlify site configuration overrides the build\'s Node; remove it'
          : ''),
    );
  }
  return problems;
}
