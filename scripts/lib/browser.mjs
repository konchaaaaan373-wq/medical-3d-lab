/**
 * Which Chromium these scripts drive.
 *
 * Playwright looks for the exact build its own version pins. That is the right
 * default, and it is wrong in one situation this repository actually meets: a
 * machine — a container image, a CI runner — that ships a Chromium under
 * `PLAYWRIGHT_BROWSERS_PATH` and a Playwright package resolved to a different
 * version. Playwright then reports "Executable doesn't exist" and tells you to
 * download a browser you already have.
 *
 * So: use Playwright's own choice when it exists, and otherwise fall back to
 * whatever Chromium is actually installed, newest build first. `CHROMIUM_PATH`
 * overrides both, for the case where somebody knows better.
 *
 * Returning `undefined` rather than a guess is deliberate — that is the value
 * `launch()` needs in order to do its normal thing.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.PLAYWRIGHT_BROWSERS_PATH || '';

/** Candidate executables under an installed browsers directory, newest first. */
function installed() {
  if (!ROOT || !existsSync(ROOT)) return [];
  let entries = [];
  try {
    entries = readdirSync(ROOT).filter((name) => name.startsWith('chromium'));
  } catch {
    return [];
  }
  // `chromium-1194` before `chromium-1043`; a plain `chromium` has no number and
  // sorts last, because a numbered build is the more specific answer.
  entries.sort((a, b) => Number(b.split('-')[1] ?? 0) - Number(a.split('-')[1] ?? 0));
  return entries.flatMap((name) => [
    join(ROOT, name, 'chrome-linux', 'chrome'),
    join(ROOT, name, 'chrome-linux', 'headless_shell'),
  ]);
}

/**
 * @param {{ executablePath?: () => string }} [engine] the Playwright engine, if
 *   it can be asked where it would look
 * @returns {string | undefined} an executable to pass to `launch`, or undefined
 */
export function chromiumExecutable(engine) {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    const preferred = engine?.executablePath?.();
    if (preferred && existsSync(preferred)) return undefined;
  } catch {
    // Playwright throws when its pinned build is absent. That is the case this
    // function exists for, so it is not an error here.
  }
  return installed().find((path) => existsSync(path));
}
