#!/usr/bin/env node
/**
 * Netlify-only browser QA wrapper.
 *
 * `BROWSER_AUDIT_SET=candidates` drives the five publication candidates.
 * `BROWSER_AUDIT_SET=representatives` drives one deliberately chosen scene
 * from every system not already covered by those five. Both paths use the same
 * real Chromium interaction harness; only the target list changes.
 *
 * The preview still deploys if QA itself cannot start, so browser diagnostics
 * are not trapped in a private build log. Production is unaffected.
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
const auditSet = process.env.BROWSER_AUDIT_SET === 'representatives' ? 'representatives' : 'candidates';
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
    stages.push({ name, ok: false, started, finished: new Date().toISOString(), exit: error?.status ?? null });
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

run('tests', 'npm', ['test']);
run('playwright-core-install', 'npm', ['install', '--no-save', '--package-lock=false', 'playwright-core']);
if (!process.env.CHROME_PATH) run('chromium-fallback-install', 'npx', ['playwright-core', 'install', 'chromium']);

const sourcePath = join('scripts', 'audit-release-candidates.mjs');
const runtimePath = join('scripts', '.netlify-audit-release-candidates.mjs');
let source = readFileSync(sourcePath, 'utf8');
source = source.replace(
  'chromium.launch({ headless: !headed })',
  "chromium.launch({ headless: !headed, executablePath: process.env.CHROME_PATH || undefined })"
);

if (auditSet === 'representatives') {
  // One scene from each system the initial five did not cover. Selection is
  // intentional rather than "first in the manifest": it mixes anatomy,
  // pathophysiology, rich model controls, a reviewed patient-capable scene,
  // and the whole-body prototype so shared shell defects are more likely to
  // surface than with eleven near-identical atlases.
  const representativeTargets = `const TARGETS = Object.freeze([
    { id: 'bowel-obstruction', slug: 'bowel-obstruction' },
    { id: 'portal-hypertension', slug: 'portal-hypertension' },
    { id: 'renal-filtration', slug: 'renal-filtration' },
    { id: 'thyroid-anatomy', slug: 'thyroid-anatomy' },
    { id: 'lymphatic-drainage', slug: 'lymphatic-drainage' },
    { id: 'hip-osteoarthritis', slug: 'hip-osteoarthritis' },
    { id: 'uterine-fibroid', slug: 'uterine-fibroid' },
    { id: 'retinal-detachment', slug: 'retinal-detachment' },
    { id: 'pressure-injury', slug: 'pressure-injury' },
    { id: 'thorax-anatomy', slug: 'thorax-anatomy' },
    { id: 'body-overview', slug: 'body-overview' },
  ]);`;
  source = source.replace(/const TARGETS = Object\.freeze\(\[[\s\S]*?\]\);/, representativeTargets);
}

// Tighten phone usability without duplicating the browser harness here.
source = source.replace(
  "      navTriggerVisible: visible('.global-nav-trigger'),\n      canvasHit,",
  `      navTriggerVisible: visible('.global-nav-trigger'),\n      disclaimerVisible: visible('.disclaimer'),\n      anatomyPanelVisible: visible('.anatomy-panel'),\n      buttonRow: (() => {\n        const node = document.querySelector('.button-row');\n        if (!node) return null;\n        return { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, overflow: Math.max(0, node.scrollWidth - node.clientWidth) };\n      })(),\n      canvasHit,`
);

const medicalNoticeIds = new Set([
  'amyloid-beta',
  'heart-failure',
  'copd-hyperinflation',
  'myocardial-ischemia',
  'bowel-obstruction',
  'portal-hypertension',
  'renal-filtration',
  'hip-osteoarthritis',
  'uterine-fibroid',
  'retinal-detachment',
  'pressure-injury',
]);
const medicalNoticeArray = JSON.stringify([...medicalNoticeIds]);
source = source.replace(
  "      if (proGeometry.canvasHit === false) issues.push('rendered canvas is not reachable at its visual center');",
  `      if (proGeometry.canvasHit === false) issues.push('rendered canvas is not reachable at its visual center');\n      if ((proGeometry.buttonRow?.overflow ?? 0) > 1) issues.push(\`button row hides controls by \${Math.round(proGeometry.buttonRow.overflow)}px\`);\n      const needsMedicalNotice = ${medicalNoticeArray}.includes(target.id);\n      if (device.id === 'phone' && needsMedicalNotice && (proGeometry.console?.height ?? 0) > device.height * 0.28) issues.push(\`console takes \${Math.round((proGeometry.console.height / device.height) * 100)}% of phone height\`);\n      if (device.id === 'phone' && needsMedicalNotice && !proGeometry.disclaimerVisible) issues.push('medical model-limit notice is not visible on phone');`
);
writeFileSync(runtimePath, source);

const auditOk = run('audit', 'node', [runtimePath, '--dist', 'dist', '--out', outDir], {
  env: { CHROMIUM_PATH: process.env.CHROME_PATH ?? '' },
});
rmSync(runtimePath, { force: true });

if (!existsSync(join(outDir, 'index.html'))) {
  const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const rows = stages.map((stage) => `<li><strong>${esc(stage.name)}</strong>: ${stage.ok ? 'OK' : `FAILED${stage.exit == null ? '' : ` (exit ${stage.exit})`}`} — <a href="./${encodeURIComponent(stage.name)}.log">log</a></li>`).join('');
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Medical 3D Lab browser audit diagnostics</title><style>body{font:15px/1.55 system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#111;color:#eee}a{color:#8ecbff}li{margin:10px 0}</style><body><h1>Browser audit diagnostics</h1><p>The product build deployed. Browser QA ${auditOk ? 'completed' : 'did not complete'}; the stage logs below explain why.</p><ul>${rows}</ul></body></html>`
  );
}

writeFileSync(join(outDir, 'bootstrap.json'), `${JSON.stringify({ auditOk, auditSet, chromePath: process.env.CHROME_PATH || null, stages }, null, 2)}\n`);

const functionsDir = join('netlify', 'functions');
mkdirSync(functionsDir, { recursive: true });
const marker = (name) => {
  const safe = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 62);
  writeFileSync(join(functionsDir, `${safe}.mjs`), `export default async () => new Response('preview QA marker');\n`);
};

marker(`qa-set-${auditSet}`);
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

console.log(`browser-audit wrapper completed; set=${auditSet}; auditOk=${auditOk}`);
