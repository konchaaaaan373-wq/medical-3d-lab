#!/usr/bin/env node
/**
 * Drives an anatomy scene in a real browser and checks that selection behaves.
 *
 *   npm run build
 *   npm run verify:anatomy
 *
 * ## Why this exists as a script rather than as a note
 *
 * Everything this checks is invisible to `node --test`: whether a click on the
 * rendered mesh resolves to the structure a reader is then told about, whether
 * a drag that ends over a different structure is read as a click, whether
 * recolouring the model changes what is selected. Those are the failures a unit
 * test cannot see and a screenshot cannot prove, and they are exactly the
 * behaviour the beta's publication decision is about — so the evidence for that
 * decision is this, runnable, rather than an image somebody once looked at.
 *
 * It also checks the part tree against the model, which is the pair this
 * product most needs to agree: selecting a row must select the same structure
 * in 3D, and selecting in 3D must highlight the same row. Two surfaces naming
 * one thing is the claim; a browser is the only place it can be observed.
 *
 * ## What it does not check
 *
 * It drives one engine on a desktop machine, clicks a handful of points, and
 * reads the labels the product itself renders. It cannot tell you the label is
 * anatomically *correct* — that is an anatomy expert's judgement and is
 * recorded separately — only that the pipeline from mesh to panel is coherent
 * and stable under interaction.
 *
 * ## Driving a scene the release has not opened
 *
 * A production build does not contain a scene the release is holding back, so
 * there is nothing here to drive. That is the case every time this check is
 * used as evidence for a *new* publication decision — the decision has not been
 * taken yet, so the gate is closed, so the scene is not in the build. Build a
 * preview and pass `--preview`:
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:anatomy -- --preview
 *
 * Once the decision is recorded, the production build carries the scene again
 * and the check runs against it with no flag, which is the run that matters.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --scene <slug>  scene route to drive (default: brain-anatomy)
 *   --shots <dir>   write screenshots here
 *   --preview       unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --headed        show the browser
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const sceneSlug = value('--scene', 'brain-anatomy');
const shotsDir = value('--shots');

const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (!existsSync(join(distDir, 'index.html'))) die(`No build at "${distDir}" — run \`npm run build\` first.`);
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

let chromium = null;
for (const pkg of ['playwright', 'playwright-core']) {
  try {
    ({ chromium } = await import(pkg));
    break;
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
}
if (!chromium) {
  die(
    'Playwright is not installed, so nothing was driven.\n\n' +
      '  npm i --no-save playwright\n  npx playwright install --with-deps chromium\n\n' +
      'It is deliberately not a dependency: `npm test` must stay a plain `node --test` run.'
  );
}

// --- serving the build (same shape as check-viewports.mjs) -----------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const root = resolve(distDir);
function fileFor(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = resolve(root, `.${normalize(decoded)}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return existsSync(candidate) ? candidate : null;
}

const server = createServer((request, response) => {
  const file = fileFor(request.url ?? '/') ?? join(root, 'index.html');
  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;

// --- the drive -------------------------------------------------------------

const problems = [];
const notes = [];
const observed = { structures: [], views: [], colorModes: [], selectableCount: null, treeRows: null };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: !flag('--headed'),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

/**
 * Requests this harness cannot serve, and which are not the scene's failure.
 *
 * The billing functions belong to the deploy host, not to the static build, and
 * a webfont is a network fetch the sandbox refuses. Listing them by name is the
 * point: anything else that fails is reported.
 */
const EXPECTED_FAILURES = [/\/\.netlify\/functions\//, /^https:\/\/fonts\.(googleapis|gstatic)\.com\//];
const unexpected = (url) => !EXPECTED_FAILURES.some((pattern) => pattern.test(url));

/**
 * A cancelled request is not a failed one.
 *
 * The same distinction `BrainAnatomyScene` had to learn the hard way: a fetch
 * the browser abandons — a superseded loader request, anything still in flight
 * when the page goes away — reports as a failure and is not one. Reporting it
 * would make this check fail on a different file every run, which is how a
 * check stops being read.
 */
const CANCELLED = 'net::ERR_ABORTED';

page.on('pageerror', (error) => problems.push(`uncaught error: ${error}`));
page.on('requestfailed', (request) => {
  const reason = request.failure()?.errorText ?? 'unknown';
  if (reason === CANCELLED) return;
  if (unexpected(request.url())) problems.push(`request failed: ${request.url()} (${reason})`);
});
page.on('response', (response) => {
  if (response.status() >= 400 && unexpected(response.url())) {
    problems.push(`http ${response.status()}: ${response.url()}`);
  }
});

const shot = async (name) => {
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) });
};

try {
  const url = flag('--preview') ? `${base}?preview=1#/${sceneSlug}` : `${base}#/${sceneSlug}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  // The consent question is a one-time overlay and would sit over the canvas.
  await page.locator('.consent-banner button').last().click({ timeout: 5000 }).catch(() => {});

  // A locked route answers with the plain "to be updated" page, which has no
  // canvas and never will. Saying so beats a thirty-second timeout that reads
  // like the scene is broken when the release simply has not opened it.
  if (await page.locator('.locked-copy').count()) {
    die(
      `The build does not open ${sceneSlug}: it answered with the "to be updated" page.\n\n` +
        '  VITE_ALLOW_PREVIEW=1 npm run build\n  npm run verify:anatomy -- --preview\n\n' +
        'That is the expected state while a publication decision is being taken — the gate is ' +
        'closed until it is recorded, so the scene is not in a production build.'
    );
  }

  await page.waitForFunction(
    () => /selectable structures/.test(document.querySelector('.anatomy-count.lang-en')?.textContent ?? ''),
    { timeout: 90000 }
  );
  const status = (await page.locator('.anatomy-count.lang-en').textContent()).trim();
  observed.selectableCount = Number(status.match(/^(\d+)/)?.[1] ?? 0);
  if (!observed.selectableCount) problems.push(`the scene reports no selectable structures ("${status}")`);

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) die('the scene rendered no canvas');

  /** The pinned selection, read after moving the pointer off the model. */
  const read = async () => {
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.waitForTimeout(250);
    return {
      en: (await page.locator('.anatomy-name.lang-en').textContent()).trim(),
      ja: (await page.locator('.anatomy-name.lang-ja').textContent()).trim(),
      where: (await page.locator('.anatomy-location.lang-en').textContent()).trim(),
    };
  };
  const EMPTY = 'Select a structure';
  const clickAt = async (fx, fy) => {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(350);
    return read();
  };

  // 1. A click on the model names a structure, in both languages, with a path.
  for (const [fx, fy] of [[0.40, 0.34], [0.60, 0.32], [0.50, 0.50], [0.50, 0.42]]) {
    const hit = await clickAt(fx, fy);
    if (hit.en === EMPTY) continue;
    observed.structures.push(hit);
    if (!hit.ja || hit.ja === '部位を選択してください') problems.push(`"${hit.en}" has no Japanese name`);
    if (!hit.where.includes('›')) problems.push(`"${hit.en}" is named without a place in the hierarchy`);
  }
  if (observed.structures.length < 3) {
    problems.push(`only ${observed.structures.length} click(s) resolved to a structure; the picking may be broken`);
  }
  await shot('brain-selection');

  const pinned = observed.structures.at(-1);

  // 2. A drag is not a click. Orbiting away from the pinned structure and
  //    releasing over another one must not reselect.
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5, { steps: 20 });
  await page.mouse.up();
  const afterDrag = await read();
  if (afterDrag.en !== pinned.en) {
    problems.push(`a drag changed the selection from "${pinned.en}" to "${afterDrag.en}"`);
  }

  // 3. Clicking the background clears rather than keeping a stale card.
  const afterEmpty = await clickAt(0.04, 0.94);
  if (afterEmpty.en !== EMPTY) problems.push(`a click on empty space left "${afterEmpty.en}" selected`);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.42);
  await page.waitForTimeout(350);
  const reselected = await read();
  if (reselected.en === EMPTY) problems.push('a structure could not be selected again after clearing');

  // 4. The part tree and the model are two readings of one selection.
  const leaves = page.locator('.anatomy-tree-leaf');
  observed.treeRows = await leaves.count();
  if (!observed.treeRows) {
    problems.push('the part tree rendered no structures');
  } else {
    // Selecting in 3D highlights the matching row — including opening the
    // branch it sits in, or the panel silently disagrees with the model.
    const selectedRows = page.locator('.anatomy-tree-leaf[aria-selected="true"]');
    if ((await selectedRows.count()) !== 1) {
      problems.push(`${await selectedRows.count()} tree rows are marked selected after a 3D click; expected 1`);
    } else {
      const rowName = (await selectedRows.first().locator('.lang-en').first().textContent()).trim();
      if (rowName !== reselected.en) {
        problems.push(`the model says "${reselected.en}" and the tree highlights "${rowName}"`);
      }
      if (!(await selectedRows.first().isVisible())) {
        problems.push('the selected row is inside a collapsed branch, so the tree does not show the selection');
      }
    }

    // And the other direction: selecting a row selects that structure.
    const row = leaves.nth(Math.min(2, observed.treeRows - 1));
    const rowName = (await row.locator('.lang-en').first().textContent()).trim();
    await row.click();
    await page.waitForTimeout(350);
    const fromTree = await read();
    if (fromTree.en !== rowName) {
      problems.push(`clicking the tree row "${rowName}" put "${fromTree.en}" on the card`);
    }
    if ((await page.locator('.anatomy-tree-leaf[aria-selected="true"]').count()) !== 1) {
      problems.push('selecting from the tree left more than one row marked selected');
    }
    await shot('brain-tree');

    // 5. Isolate shows one structure, and Show all puts the model back.
    const isolate = page.locator('.anatomy-tree-isolate');
    await isolate.click();
    await page.waitForTimeout(500);
    if ((await isolate.getAttribute('aria-pressed')) !== 'true') problems.push('isolating did not take');
    const whileIsolated = await read();
    if (whileIsolated.en !== fromTree.en) {
      problems.push(`isolating changed the selection from "${fromTree.en}" to "${whileIsolated.en}"`);
    }
    // Nothing else is clickable while one structure is isolated.
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await page.waitForTimeout(350);
    const afterStrayClick = await read();
    if (afterStrayClick.en !== EMPTY && afterStrayClick.en !== fromTree.en) {
      problems.push(`a click on a hidden structure selected "${afterStrayClick.en}" while isolated`);
    }
    await shot('brain-isolated');

    await page.locator('.anatomy-tree-showall').click();
    await page.waitForTimeout(600);
    if ((await page.locator('.anatomy-tree-isolate').getAttribute('aria-pressed')) !== 'false') {
      problems.push('Show all did not clear the isolation');
    }
    // Back to a whole model: the structures that were on screen before are
    // clickable again.
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.42);
    await page.waitForTimeout(400);
    const afterRestore = await read();
    if (afterRestore.en === EMPTY) {
      problems.push('after Show all, clicking the model selected nothing — it did not come back');
    }
  }

  // The shared inspection surface holds the viewpoints and the colour modes.
  await page.locator('[aria-controls="spatial-inspection-panel"]').click();
  await page.waitForTimeout(400);

  // 4. Recolouring is a display choice: it must not change what is selected.
  observed.colorModes = (await page.locator('.inspection-choice.inspection-mode').allTextContents()).map((t) =>
    t.replace(/\s+/g, ' ').trim()
  );
  let settled = null;
  if (observed.colorModes.length > 1) {
    const beforeMode = await read();
    await page.locator('.inspection-choice.inspection-mode').nth(1).click();
    await page.waitForTimeout(600);
    const afterMode = await read();
    if (afterMode.en !== beforeMode.en) {
      problems.push(`switching colour mode changed the selection from "${beforeMode.en}" to "${afterMode.en}"`);
    }
    const stillOne = await page.locator('.anatomy-tree-leaf[aria-selected="true"]').count();
    if (observed.treeRows && stillOne !== 1) {
      problems.push(`recolouring left ${stillOne} rows marked selected in the tree`);
    }
    settled = afterMode;
    await shot('brain-colour-mode');
  } else {
    notes.push('only one colour mode was offered, so the recolouring check did not run.');
  }

  // 5. Moving the camera to a named viewpoint must not change it either.
  observed.views = (await page.locator('.inspection-choice.inspection-view').allTextContents()).map((t) =>
    t.replace(/\s+/g, ' ').trim()
  );
  if (observed.views.length) {
    const beforeView = settled ?? (await read());
    await page.locator('.inspection-choice.inspection-view').first().click();
    await page.waitForTimeout(900);
    const afterView = await read();
    if (afterView.en !== beforeView.en) {
      problems.push(`applying a viewpoint changed the selection from "${beforeView.en}" to "${afterView.en}"`);
    }
    await shot('brain-view');
  } else {
    problems.push('the scene offers no named viewpoints');
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`Anatomy interaction — ${sceneSlug}, ${observed.selectableCount} selectable structures`);
console.log(`  structures named by click: ${observed.structures.map((s) => `${s.en} / ${s.ja}`).join('; ') || 'none'}`);
console.log(`  viewpoints: ${observed.views.join(', ') || 'none'}`);
console.log(`  colour modes: ${observed.colorModes.join(', ') || 'none'}`);
console.log(`  part tree rows: ${observed.treeRows ?? 'none'}`);
for (const note of notes) console.log(`  note: ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  '  ok    the model and the tree name one structure; drag is not click; isolate hides and restores; ' +
    'display choices do not move the selection'
);
