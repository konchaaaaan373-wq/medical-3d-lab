#!/usr/bin/env node
/**
 * Netlify-only review harness wrapper.
 *
 * The deploy preview must still publish when the QA browser cannot start;
 * otherwise the only useful information is trapped in a private Netlify build
 * log. This wrapper turns every stage into an artifact under dist/browser-audit
 * and deliberately exits zero. The product build itself is still allowed to
 * fail before this wrapper is called.
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const outDir = join('dist', 'browser-audit');
mkdirSync(outDir, { recursive: true });

const stages = [];
const run = (name, command, args, options = {}) => {
  const started = new Date().toISOString();
  try {
    const output = execFileSync(command, args, {
      encoding: 'utf8',
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
    writeFileSync(join(outDir, `${name}.log`), output ?? '');
    stages.push({ name, ok: true, started, finished: new Date().toISOString() });
    return true;
  } catch (error) {
    const stdout = error?.stdout ?? '';
    const stderr = error?.stderr ?? '';
    writeFileSync(
      join(outDir, `${name}.log`),
      `${stdout}${stdout && stderr ? '\n' : ''}${stderr}\n\n[exit ${error?.status ?? 'unknown'}]\n${error?.stack ?? error}\n`
    );
    stages.push({
      name,
      ok: false,
      started,
      finished: new Date().toISOString(),
      exit: error?.status ?? null,
    });
    return false;
  }
};

// Tests are a post-change safety net. They are captured, not allowed to hide the
// browser evidence by preventing the preview from deploying.
run('tests', 'npm', ['test']);

// Playwright-core is only the automation API. Prefer Netlify's CHROME_PATH; if
// the Chromium integration did not produce one, try Playwright's browser-only
// install as a fallback and record the exact result.
run('playwright-core-install', 'npm', [
  'install',
  '--no-save',
  '--package-lock=false',
  'playwright-core',
]);

if (!process.env.CHROME_PATH) {
  run('chromium-fallback-install', 'npx', ['playwright-core', 'install', 'chromium']);
}

const sourcePath = join('scripts', 'audit-release-candidates.mjs');
const runtimePath = join('scripts', '.netlify-audit-release-candidates.mjs');
let source = readFileSync(sourcePath, 'utf8');
source = source.replace(
  'chromium.launch({ headless: !headed })',
  "chromium.launch({ headless: !headed, executablePath: process.env.CHROME_PATH || undefined })"
);
writeFileSync(runtimePath, source);

const auditOk = run(
  'audit',
  'node',
  [runtimePath, '--dist', 'dist', '--out', outDir],
  { env: { CHROMIUM_PATH: process.env.CHROME_PATH ?? '' } }
);
rmSync(runtimePath, { force: true });

// The audit script creates its richer index when Chromium completes the run.
// If it failed before that point, publish a diagnostic landing page instead.
if (!existsSync(join(outDir, 'index.html'))) {
  const esc = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const rows = stages
    .map(
      (stage) =>
        `<li><strong>${esc(stage.name)}</strong>: ${stage.ok ? 'OK' : `FAILED${stage.exit == null ? '' : ` (exit ${stage.exit})`}`} — <a href="./${encodeURIComponent(stage.name)}.log">log</a></li>`
    )
    .join('');
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Medical 3D Lab browser audit diagnostics</title><style>body{font:15px/1.55 system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#111;color:#eee}a{color:#8ecbff}li{margin:10px 0}</style><body><h1>Browser audit diagnostics</h1><p>The product build deployed. Browser QA ${auditOk ? 'completed' : 'did not complete'}; the stage logs below explain why.</p><ul>${rows}</ul></body></html>`
  );
}

writeFileSync(join(outDir, 'bootstrap.json'), `${JSON.stringify({ auditOk, chromePath: process.env.CHROME_PATH || null, stages }, null, 2)}\n`);
console.log(`browser-audit wrapper completed; auditOk=${auditOk}`);
// Intentionally no process.exit(1): diagnostics must be deployed for inspection.
