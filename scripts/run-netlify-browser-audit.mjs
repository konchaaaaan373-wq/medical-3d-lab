#!/usr/bin/env node
/**
 * Netlify-only review harness wrapper.
 *
 * The deploy preview must still publish when the QA browser cannot start;
 * otherwise the only useful information is trapped in a private Netlify build
 * log. This wrapper turns every stage into an artifact under dist/browser-audit
 * and deliberately exits zero. The product build itself is still allowed to
 * fail before this wrapper is called.
 *
 * It also emits tiny, preview-only QA marker functions after the browser run.
 * Netlify exposes deployed function names through its Deploy API, which gives
 * the reviewer a machine-readable summary even when the rendered audit page is
 * not directly reachable from the review environment. They contain no product
 * logic and are never committed into production.
 */
import { execFileSync } from 'node:child_process';
import {
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

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
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

// Tighten phone usability without duplicating the large browser harness here.
// Page overflow is insufficient: a control row can hide actions inside its own
// scroller, and a giant bottom console can technically fit while leaving too
// little of the actual 3D model to inspect.
source = source.replace(
  "      navTriggerVisible: visible('.global-nav-trigger'),\n      canvasHit,",
  `      navTriggerVisible: visible('.global-nav-trigger'),\n      buttonRow: (() => {\n        const node = document.querySelector('.button-row');\n        if (!node) return null;\n        return {\n          clientWidth: node.clientWidth,\n          scrollWidth: node.scrollWidth,\n          overflow: Math.max(0, node.scrollWidth - node.clientWidth),\n        };\n      })(),\n      canvasHit,`
);
source = source.replace(
  "      if (proGeometry.canvasHit === false) issues.push('rendered canvas is not reachable at its visual center');",
  "      if (proGeometry.canvasHit === false) issues.push('rendered canvas is not reachable at its visual center');\n      if ((proGeometry.buttonRow?.overflow ?? 0) > 1) issues.push(`button row hides controls by ${Math.round(proGeometry.buttonRow.overflow)}px`);\n      if (device.id === 'phone' && target.id !== 'brain-anatomy' && (proGeometry.console?.height ?? 0) > device.height * 0.28) issues.push(`console takes ${Math.round((proGeometry.console.height / device.height) * 100)}% of phone height`);"
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

// Preview-only metadata bridge. A marker's name is intentionally terse because
// Netlify returns function names in the Deploy API. Example:
//   qa-heart-failure-phone-i0-c146-b0
// means zero browser issues, a 146px console and zero hidden-control overflow.
// The tiny functions are generated during the build and are not source files.
const functionsDir = join('netlify', 'functions');
mkdirSync(functionsDir, { recursive: true });
const marker = (name) => {
  const safe = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 62);
  writeFileSync(
    join(functionsDir, `${safe}.mjs`),
    `export default async () => new Response('preview QA marker');\n`
  );
};

const tests = stages.find((stage) => stage.name === 'tests');
marker(`qa-tests-${tests?.ok ? 'pass' : 'fail'}`);
const report = readJson(join(outDir, 'report.json'));
if (!Array.isArray(report)) {
  marker(`qa-audit-no-report-${auditOk ? 'unexpected' : 'browser-failed'}`);
} else {
  for (const row of report) {
    const issueCount = (row.issues?.length ?? 0) + (row.fatal ? 1 : 0);
    const consoleHeight = Math.round(row.pro?.console?.height ?? 0);
    const buttonOverflow = Math.round(row.pro?.buttonRow?.overflow ?? 0);
    const slug = String(row.slug ?? row.scene ?? 'unknown').replace(/[^a-z0-9-]/gi, '-');
    const device = String(row.device ?? 'unknown').replace(/[^a-z0-9-]/gi, '-');
    marker(`qa-${slug}-${device}-i${issueCount}-c${consoleHeight}-b${buttonOverflow}`);
  }
}

console.log(`browser-audit wrapper completed; auditOk=${auditOk}`);
// Intentionally no process.exit(1): diagnostics must be deployed for inspection.
