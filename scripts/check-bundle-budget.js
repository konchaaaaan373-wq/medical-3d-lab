#!/usr/bin/env node
/**
 * Measures the built bundle against the declared ship-weight budget.
 *
 * A budget nobody measures is a wish, so this runs in CI right after
 * `npm run build`. It reads the same `BUNDLE_BUDGET_KB` the unit tests assert
 * on, which is the point: there is one number, and both the policy test and
 * the real artefact are checked against it.
 *
 * Sizes are gzipped, because that is what a visitor actually downloads.
 *
 *   node scripts/check-bundle-budget.js [dist-dir]
 *
 * Exits non-zero when a budget is exceeded. `--report` prints the table and
 * always exits zero, for looking at the numbers without failing a build.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

import { BUNDLE_BUDGET_KB } from '../src/app/performanceBudget.js';

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const distDir = args.find((arg) => !arg.startsWith('--')) ?? 'dist';

const KB = 1024;
const kb = (bytes) => Number((bytes / KB).toFixed(1));

/** Every file under a directory, recursively, as absolute paths. */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/**
 * The entry chunk is the one the HTML loads directly. Vite hashes its name, so
 * it is identified by being referenced from `index.html` rather than by a
 * filename pattern that would silently stop matching after a Vite upgrade.
 */
function entryChunks(distPath, files) {
  const html = readFileSync(join(distPath, 'index.html'), 'utf8');
  return files.filter((file) => {
    const href = `/${relative(distPath, file).split(/[\\/]/).join('/')}`;
    return html.includes(href);
  });
}

function measure(distPath) {
  if (!existsSync(distPath)) {
    throw new Error(`No build found at "${distPath}" — run \`npm run build\` first.`);
  }
  const assetsDir = join(distPath, 'assets');
  const files = existsSync(assetsDir) ? walk(assetsDir) : [];
  const sized = files.map((file) => ({
    file,
    name: relative(distPath, file),
    ext: extname(file),
    gzip: gzipSync(readFileSync(file)).length,
  }));

  const js = sized.filter((item) => item.ext === '.js');
  const css = sized.filter((item) => item.ext === '.css');
  // Anything the bundler did not emit as code is specimen media: geometry,
  // decoders, attribution. It is budgeted separately because it is fetched by
  // one scene rather than by every visitor.
  const media = sized.filter((item) => item.ext !== '.js' && item.ext !== '.css');
  const entries = entryChunks(distPath, files);
  const entryBytes = sized
    .filter((item) => entries.includes(item.file) && item.ext === '.js')
    .reduce((sum, item) => sum + item.gzip, 0);
  const largest = js.reduce((worst, item) => (item.gzip > (worst?.gzip ?? 0) ? item : worst), null);
  const sum = (items) => items.reduce((total, item) => total + item.gzip, 0);

  return {
    entryKb: kb(entryBytes),
    largestChunkKb: kb(largest?.gzip ?? 0),
    largestChunkName: largest?.name ?? '(none)',
    cssKb: kb(sum(css)),
    codeKb: kb(sum(js) + sum(css)),
    mediaKb: kb(sum(media)),
    fileCount: sized.length,
  };
}

/** @returns {{line:string, over:boolean}[]} */
export function compare(measured, budget = BUNDLE_BUDGET_KB) {
  const rows = [
    ['entry (eager JS)', measured.entryKb, budget.entry],
    ['largest chunk', measured.largestChunkKb, budget.largestChunk],
    ['css', measured.cssKb, budget.css],
    ['code (JS + CSS)', measured.codeKb, budget.code],
    ['specimen media', measured.mediaKb, budget.media],
  ];
  return rows.map(([label, actual, allowed]) => ({
    label,
    actual,
    allowed,
    over: actual > allowed,
    line: `${actual > allowed ? 'OVER ' : 'ok   '} ${label.padEnd(18)} ${String(actual).padStart(8)} kB / ${allowed} kB`,
  }));
}

const measured = measure(distDir);
const rows = compare(measured);

console.log(`Bundle budget (gzipped) — ${measured.fileCount} files in ${distDir}/assets`);
for (const row of rows) console.log(`  ${row.line}`);
console.log(`  largest chunk is ${measured.largestChunkName}`);

const exceeded = rows.filter((row) => row.over);
if (exceeded.length && !reportOnly) {
  console.error(
    `\nShip-weight budget exceeded by ${exceeded.length} measure(s). Either make it smaller, or ` +
      `change BUNDLE_BUDGET_KB in src/app/performanceBudget.js and say in the pull request why the ` +
      `product is now allowed to cost more.`
  );
  process.exit(1);
}
