import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

/**
 * L-45: a `node_modules` symlink made for a worktree was committed, because
 * `.gitignore` said `node_modules/` (a directory) and a symlink is a file.
 * Checking that commit out replaced the real directory with a link to itself.
 * Nothing under the tracked tree may be a dependency directory or a symlink
 * that leaves the repository.
 */
test('the tracked tree carries no node_modules and no symlink out of the repo', () => {
  const out = execFileSync('git', ['ls-files', '-s'], { encoding: 'utf8' });
  const offenders = [];
  for (const line of out.split('\n')) {
    if (!line) continue;
    const [meta, path] = line.split('\t');
    const mode = meta.split(' ')[0];
    if (/(^|\/)node_modules(\/|$)/.test(path)) offenders.push(`${path}: dependency directory is tracked`);
    if (mode === '120000') offenders.push(`${path}: symlinks are not tracked in this repository`);
  }
  assert.deepEqual(offenders, []);
});
