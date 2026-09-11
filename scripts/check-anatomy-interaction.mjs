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
 * ## What it checks that `verify:ui` cannot
 *
 * The viewport matrix measures a surface at rest. This drives the states a
 * reader puts it into: the parts sheet open on a phone, the keyboard walking a
 * tree, a pointer crossing the model while a structure is pinned. A modal is
 * the clearest case — with the sheet open the background is deliberately inert
 * and covered, which a check with no concept of a modal can only read as a
 * defect, so the modal's own obligations (focus in, Escape, focus back, the
 * background unreachable, a close control that does not need scrolling to) are
 * checked here instead.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --scene <slug>  scene route to drive (default: brain-anatomy)
 *   --points <list> where to click, as "fx,fy fx,fy …" in canvas fractions.
 *                   The default four are placed for a solid mass filling the
 *                   frame. An organ with a real gap down the middle — two lungs
 *                   with a mediastinum between them — needs its own four, and
 *                   moving the model to satisfy a fixed grid would be the
 *                   check deciding the anatomy.
 *   --empty <fx,fy> a point that is background, for the check that a click on
 *                   nothing clears the card. The default is at the left edge,
 *                   clear of the title card above it and of the console along
 *                   the bottom: the bottom-left corner this used to use is
 *                   *behind* the console, so the click never reached the canvas
 *                   and the check could only pass when the card was already
 *                   empty — which it was, until a scene came along whose clicks
 *                   all landed on something.
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
const DEFAULT_POINTS = [[0.40, 0.34], [0.60, 0.32], [0.50, 0.50], [0.50, 0.42]];

/**
 * Where to click on each organ, when the caller does not say.
 *
 * `DEFAULT_POINTS` is a cluster around the middle of the frame, which is right
 * for a brain and wrong for most organs: two lungs have a mediastinum between
 * them, two kidneys have the spine, a stomach is a J with its own hole in it.
 * On those, all four default clicks land on background and the run reports
 * "the picking may be broken" — about a scene whose picking is fine.
 *
 * These are read off a render of each scene's opening view at this script's own
 * viewport, and each one is named for what it is on. They are re-measured when
 * a scene's opening pose or its geometry moves; a point that stops hitting is a
 * question about the render, not a number to nudge.
 */
const SCENE_POINTS = {
  // Two lungs and the airway between them, not one mass.
  'lung-anatomy': [[0.34, 0.40], [0.36, 0.72], [0.68, 0.55], [0.50, 0.44]],
  // Right lobe, left lobe, the inferior third, and the gallbladder below it.
  'liver-anatomy': [[0.35, 0.40], [0.66, 0.45], [0.45, 0.62], [0.42, 0.75]],
  // One kidney, the other, and twice on the opened one.
  'kidney-anatomy': [[0.30, 0.45], [0.70, 0.45], [0.31, 0.58], [0.68, 0.36]],
  // Fundus, body, antrum, and the duodenum it empties into.
  'stomach-anatomy': [[0.62, 0.33], [0.59, 0.45], [0.53, 0.62], [0.40, 0.82]],
  // The colon frame, clockwise from the ascending limb.
  'intestine-anatomy': [[0.35, 0.44], [0.49, 0.24], [0.69, 0.50], [0.52, 0.76]],
  // Head, neck, body, tail — the gland runs across the frame.
  'pancreas-anatomy': [[0.34, 0.52], [0.45, 0.48], [0.56, 0.45], [0.66, 0.40]],
  // Two lobes clasping a trachea, with the isthmus across the front of it.
  'thyroid-anatomy': [[0.44, 0.48], [0.57, 0.48], [0.50, 0.56], [0.50, 0.25]],
  // The two segments, and the pancreatic tail off to the medial side.
  'spleen-anatomy': [[0.54, 0.29], [0.54, 0.69], [0.60, 0.20], [0.32, 0.57]],
  // Apex, body, neck, and a ureter arriving behind.
  'bladder-anatomy': [[0.50, 0.37], [0.50, 0.51], [0.50, 0.63], [0.42, 0.20]],
  // Gallbladder, common bile duct, a hepatic duct, and the bowel it opens into.
  'biliary-anatomy': [[0.30, 0.58], [0.50, 0.36], [0.45, 0.66], [0.60, 0.74]],
  // The tube runs down the middle; the trachea is half-transparent in front of
  // its upper end, so a click there lands on the trachea.
  'esophagus-anatomy': [[0.48, 0.60], [0.49, 0.80], [0.48, 0.25], [0.487, 0.45]],
  // A gland and its kidney, on each side.
  'adrenal-anatomy': [[0.365, 0.36], [0.635, 0.36], [0.35, 0.62], [0.645, 0.62]],
  // Fundus, body, cervix, and a tube on its way to an ovary.
  'uterus-anatomy': [[0.50, 0.33], [0.50, 0.50], [0.50, 0.66], [0.33, 0.36]],
  // The gland, a seminal vesicle above it, and the rectum behind.
  'prostate-anatomy': [[0.47, 0.52], [0.40, 0.55], [0.57, 0.30], [0.50, 0.74]],
  // The route runs bottom-left to middle and then forward.
  'male-tract-anatomy': [[0.28, 0.78], [0.34, 0.68], [0.49, 0.47], [0.62, 0.56]],
  // A femoral condyle, the other one, the patella between them, and a plateau.
  'knee-anatomy': [[0.45, 0.37], [0.56, 0.37], [0.52, 0.44], [0.46, 0.56]],
  // The head, the scapula behind it, the arch above, and the shaft below.
  'shoulder-anatomy': [[0.44, 0.46], [0.60, 0.45], [0.48, 0.36], [0.45, 0.62]],
  // The pelvis, the socket, the head in it, and the femur below.
  'hip-anatomy': [[0.58, 0.34], [0.50, 0.44], [0.45, 0.45], [0.42, 0.66]],
  // Down the column: neck, chest, low back and sacrum.
  'spine-anatomy': [[0.5, 0.22], [0.5, 0.4], [0.5, 0.58], [0.5, 0.76]],
  // The dome, the nipple on it, the axilla up to the left and the chest wall behind.
  'breast-anatomy': [[0.52, 0.5], [0.52, 0.44], [0.36, 0.3], [0.66, 0.62]],
  // Neck, axilla, the duct up the middle, and the groin.
  'lymphatic-drainage': [[0.5, 0.28], [0.42, 0.38], [0.52, 0.46], [0.46, 0.72]],
  // The node itself, its inside, an afferent vessel on the left and the efferent on the right.
  'lymph-node-anatomy': [[0.5, 0.47], [0.5, 0.42], [0.34, 0.4], [0.63, 0.52]],
  // Down the cut face: epidermis, dermis, subcutis — and the hair off to the side.
  'skin-anatomy': [[0.5, 0.36], [0.5, 0.48], [0.5, 0.62], [0.36, 0.33]],
  // The auricle, the canal, the middle ear and the inner ear, left to right.
  'ear-anatomy': [[0.3, 0.45], [0.44, 0.47], [0.57, 0.44], [0.66, 0.52]],
  // Not the middle of the eye: the cornea is a real structure in front of the
  // iris, so every click there selects the cornea and the check learns nothing.
  // The sclera around it, and further out, the muscles and the nerve behind.
  'eye-anatomy': [[0.36, 0.35], [0.62, 0.66], [0.33, 0.52], [0.4, 0.3]],
};

const clickPoints = (() => {
  const raw = value('--points');
  if (!raw) return SCENE_POINTS[sceneSlug] ?? DEFAULT_POINTS;
  const points = raw
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
  if (!points.length || points.some((point) => point.length !== 2 || point.some((n) => !(n >= 0 && n <= 1)))) {
    console.error('--points takes "fx,fy fx,fy …" with each fraction between 0 and 1');
    process.exit(1);
  }
  return points;
})();
const emptyPoint = (() => {
  const raw = value('--empty');
  if (!raw) return [0.03, 0.45];
  const point = raw.split(',').map(Number);
  if (point.length !== 2 || point.some((n) => !(n >= 0 && n <= 1))) {
    console.error('--empty takes "fx,fy" with each fraction between 0 and 1');
    process.exit(1);
  }
  return point;
})();

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

  // Ready when the part tree has rows. It is the surface that only exists once
  // the atlas has loaded and been read, so waiting on it waits for both.
  await page.waitForFunction(() => document.querySelectorAll('.anatomy-tree-leaf').length > 0, {
    timeout: 90000,
  });
  observed.selectableCount = await page.locator('.anatomy-tree-leaf').count();
  if (!observed.selectableCount) problems.push('the part tree reports no selectable structures');

  // The consent question is a one-time overlay and it sits over the canvas —
  // over the lower middle of it, which is where the clicks below go.
  //
  // It is dismissed *here*, after the scene is ready, and not right after
  // `goto`. Carving an organ is synchronous: the lung holds the main thread for
  // about seventeen seconds, during which the page paints ten frames and no
  // click is actionable. A five-second attempt before that timed out, was
  // swallowed by its own `catch`, and left the banner standing over the model —
  // so the run reported "the picking may be broken" about a banner. It looked
  // like a flake because a warm re-run builds fast enough to get the click in.
  // The fix is to ask at a moment the page can answer, not to wait longer.
  const consent = page.locator('.consent-banner button').last();
  if (await consent.count()) {
    await consent.click({ timeout: 15000 }).catch(() => {
      problems.push('the consent banner would not close, and it covers the part of the canvas clicked below');
    });
    await page.waitForTimeout(300);
  }

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) die('the scene rendered no canvas');

  /**
   * The panel's summary, read without moving the pointer off the model.
   *
   * It used to move the pointer away first, because the card showed whatever
   * was under it. The summary is about the *pinned* structure now, so not
   * moving is the point: if a hover could rewrite it, this would catch it.
   */
  const read = async () => ({
    en: (await page.locator('.anatomy-panel-name.lang-en').textContent()).trim(),
    ja: (await page.locator('.anatomy-panel-name.lang-ja').textContent()).trim(),
    where: (await page.locator('.anatomy-panel-where.lang-en').textContent()).trim(),
  });
  /** Park the pointer off the model, for the checks that are about a click. */
  const restPointer = async () => {
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.waitForTimeout(250);
  };
  const EMPTY = 'Select a structure on the model or in the list.';
  const clickAt = async (fx, fy) => {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(350);
    await restPointer();
    return read();
  };

  // 1. A click on the model names a structure, in both languages, with a path.
  //    The last point that *hit* is remembered, because a point that misses
  //    clears the selection: with a miss last, everything below was testing
  //    what happens to a selection that is not there, and reporting it as the
  //    scene losing one.
  let lastHitPoint = null;
  for (const [fx, fy] of clickPoints) {
    const hit = await clickAt(fx, fy);
    if (hit.en === EMPTY) continue;
    lastHitPoint = [fx, fy];
    observed.structures.push(hit);
    if (!hit.ja || hit.ja === '部位を選択してください') problems.push(`"${hit.en}" has no Japanese name`);
    if (!hit.where.includes('›')) problems.push(`"${hit.en}" is named without a place in the hierarchy`);
  }
  if (observed.structures.length < 3) {
    problems.push(
      `only ${observed.structures.length} of ${clickPoints.length} click(s) resolved to a structure. ` +
        'Either the picking is broken or the points are not on this organ — look at the screenshot ' +
        'before believing the first one, and see SCENE_POINTS at the top of this file.'
    );
  }
  await shot('brain-selection');

  // Everything below pins a structure and watches what happens to it. With
  // nothing pinned there is nothing to watch, and going on used to produce a
  // TypeError that buried the sentence above it. Thrown rather than returned,
  // because the catch below is already the place that turns "this step could
  // not run" into a finding without discarding the ones already collected.
  if (!lastHitPoint) throw new Error('no structure was ever selected, so nothing below could be checked');
  if ((await read()).en === EMPTY) await clickAt(lastHitPoint[0], lastHitPoint[1]);
  const pinned = await read();

  // 2. A drag is not a click. Orbiting away from the pinned structure and
  //    releasing over another one must not reselect.
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5, { steps: 20 });
  await page.mouse.up();
  await restPointer();
  const afterDrag = await read();
  if (afterDrag.en !== pinned.en) {
    problems.push(`a drag changed the selection from "${pinned.en}" to "${afterDrag.en}"`);
  }

  // 3. Clicking the background clears rather than keeping a stale card.
  const afterEmpty = await clickAt(emptyPoint[0], emptyPoint[1]);
  if (afterEmpty.en !== EMPTY) problems.push(`a click on empty space left "${afterEmpty.en}" selected`);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.42);
  await page.waitForTimeout(350);
  await restPointer();
  const reselected = await read();
  if (reselected.en === EMPTY) problems.push('a structure could not be selected again after clearing');

  // 3b. A pinned structure is not rewritten by a pointer crossing the model.
  //     This is what `hovered ?? selected` got wrong: moving the mouse replaced
  //     the name — and the controls beside it — with whatever it passed over.
  await page.mouse.move(box.x + box.width * 0.40, box.y + box.height * 0.34);
  await page.waitForTimeout(400);
  const whileHovering = await read();
  if (whileHovering.en !== reselected.en) {
    problems.push(`hovering rewrote the pinned summary from "${reselected.en}" to "${whileHovering.en}"`);
  }
  await restPointer();

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
    //
    // A *visible* row. The tree opens the branch the selection is in and
    // leaves the rest closed, so on an organ with more branches than the brain
    // the third leaf in the DOM is inside a collapsed one — and clicking a row
    // nobody can see is not the interaction being checked.
    const openLeaves = page.locator('.anatomy-tree-leaf:visible');
    const openCount = await openLeaves.count();
    if (!openCount) problems.push('every row of the part tree is inside a collapsed branch');
    const row = openLeaves.nth(Math.min(2, openCount - 1));
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
    const isolate = page.locator('.anatomy-panel-action').first();
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

    await page.locator('.anatomy-panel-action.is-restore').click();
    await page.waitForTimeout(600);
    if ((await isolate.getAttribute('aria-pressed')) !== 'false') {
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

  // 6. The tree is a tree to the keyboard, not a list of buttons.
  const treeState = async () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.anatomy-tree-group, .anatomy-tree-leaf')];
    const branches = [...document.querySelectorAll('.anatomy-tree-branch')];
    return {
      tabbable: rows.filter((row) => row.tabIndex === 0).length,
      focused: document.activeElement?.className ?? null,
      focusedText: document.activeElement?.textContent?.trim().slice(0, 40) ?? null,
      selected: document.querySelectorAll('.anatomy-tree-leaf[aria-selected="true"]').length,
      // The state a reader sees, the state the component holds and the state it
      // announces have to be one answer.
      mismatched: branches.filter((branch) => {
        const toggle = branch.firstElementChild;
        const children = branch.lastElementChild;
        const announced = branch.getAttribute('aria-expanded');
        return announced !== toggle.getAttribute('aria-expanded') || announced !== String(!children.hidden);
      }).length,
    };
  });

  const before = await treeState();
  if (before.tabbable !== 1) {
    problems.push(`${before.tabbable} tree rows are in the tab ring; a tree has one entry point`);
  }
  if (before.mismatched) {
    problems.push(`${before.mismatched} branch(es) announce an expanded state that does not match what is drawn`);
  }

  await page.locator('.anatomy-tree-group, .anatomy-tree-leaf').first().focus();
  const walk = async (key) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
    return treeState();
  };

  const down = await walk('ArrowDown');
  if (down.focusedText === before.focusedText) problems.push('ArrowDown did not move focus in the tree');
  // Moving focus is not selecting: arrowing through four hundred structures
  // while each one repaints the model would make the keyboard unusable.
  if (down.selected !== before.selected) problems.push('moving focus with the keyboard changed the selection');
  const seekedAway = await page.evaluate(() => document.querySelector('.stage-name')?.textContent ?? '');

  const right = await walk('ArrowRight');
  if (right.mismatched) problems.push('ArrowRight left a branch announcing the wrong expanded state');
  const left = await walk('ArrowLeft');
  if (left.mismatched) problems.push('ArrowLeft left a branch announcing the wrong expanded state');
  const end = await walk('End');
  if (end.focusedText === left.focusedText) problems.push('End did not move focus to the last visible row');
  const home = await walk('Home');
  if (home.focusedText === end.focusedText) problems.push('Home did not move focus to the first row');

  // Enter commits, and only then.
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);
  const committed = await walk('Enter');
  if (committed.mismatched) problems.push('Enter left a branch announcing the wrong expanded state');
  if (await page.evaluate(() => document.querySelector('.stage-name')?.textContent ?? '') !== seekedAway) {
    problems.push('the tree keys reached the scene: the model was seeked while arrowing through the list');
  }
  if ((await treeState()).tabbable !== 1) problems.push('the tab ring lost its single entry point after keyboard use');

  // The display controls live in the panel's own Display tab.
  const tab = (ja) => page.locator('.anatomy-panel-tab', { hasText: ja });
  await tab('表示').click();
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
    // Back to Parts to see what the tree says about it.
    await tab('部位').click();
    await page.waitForTimeout(300);
    const stillOne = await page.locator('.anatomy-tree-leaf[aria-selected="true"]').count();
    if (observed.treeRows && stillOne !== 1) {
      problems.push(`recolouring left ${stillOne} rows marked selected in the tree`);
    }
    await tab('表示').click();
    await page.waitForTimeout(300);
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
  // 6b. The tabs are reachable and operable without a mouse.
  await tab('部位').click();
  await page.waitForTimeout(200);
  await page.locator('.anatomy-panel-tab[aria-selected="true"]').focus();
  const openTabId = () => page.evaluate(() =>
    document.querySelector('.anatomy-panel-tab[aria-selected="true"]')?.id ?? null
  );
  const focusedTabId = () => page.evaluate(() => document.activeElement?.id ?? null);
  if ((await focusedTabId()) !== 'anatomy-tab-parts') problems.push('the open tab is not the one the tab ring lands on');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  if ((await focusedTabId()) !== 'anatomy-tab-display') problems.push('ArrowRight did not move focus along the tabs');
  if ((await openTabId()) !== 'anatomy-tab-parts') problems.push('moving focus along the tabs opened one');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await openTabId()) !== 'anatomy-tab-display') problems.push('Enter did not open the focused tab');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await openTabId()) !== 'anatomy-tab-detail') problems.push('End then Enter did not reach the last tab');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await openTabId()) !== 'anatomy-tab-parts') problems.push('Home then Enter did not return to the first tab');
  // And Tab from the tab list reaches the body it controls.
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  if (!(await page.evaluate(() => document.querySelector('.anatomy-panel-body').contains(document.activeElement)))) {
    problems.push('Tab from the tab list did not reach the panel body');
  }

  // 7. On a phone the body is a sheet, and a sheet has obligations.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(400);
  const layout = await page.getAttribute('.anatomy-panel', 'data-layout');
  if (layout !== 'sheet') {
    problems.push(`at 375x667 the panel is "${layout}"; the body should become a sheet`);
  } else {
    const pinnedBefore = await read();
    const openButton = page.locator('.anatomy-panel-open');
    if (!(await openButton.isVisible())) problems.push('there is no Parts button to open the sheet with');

    await openButton.focus();
    await openButton.click();
    await page.waitForTimeout(400);

    // Whether anything outside the dialog is still live, asked *first*. It is
    // the check most likely to be the reason a later step cannot click what it
    // means to: a background left reachable is a background still on top, and a
    // timeout is a worse way to learn that than a sentence.
    const outsideReachable = await page.evaluate(() => {
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const live = (node) => {
        for (let at = node; at; at = at.parentElement) if (at.inert) return false;
        return true;
      };
      return [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((node) => !sheet.contains(node) && node.getClientRects().length > 0 && live(node))
        .map((node) => `${node.tagName.toLowerCase()}.${node.className}`.slice(0, 60));
    });
    if (outsideReachable.length) {
      problems.push(
        `the sheet is open and ${outsideReachable.length} control(s) outside it are still live: ` +
          outsideReachable.slice(0, 4).join('; ')
      );
    }

    // The sheet opens on whichever tab was last shown; the parts are what this
    // section is about.
    await tab('部位').click();
    await page.waitForTimeout(300);

    const opened = await page.evaluate(() => {
      const panel = document.querySelector('.anatomy-panel');
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const summary = document.querySelector('.anatomy-panel-summary');
      const body = document.querySelector('.anatomy-panel-body');
      const close = document.querySelector('.anatomy-panel-close');
      /** Whether a point on an element is actually that element. */
      const usable = (node) => {
        const box = node.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) return false;
        if (box.top < 0 || box.bottom > window.innerHeight) return false;
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return Boolean(hit && (node === hit || node.contains(hit)));
      };
      return {
        open: panel.dataset.sheet,
        modal: sheet.getAttribute('aria-modal'),
        focusInside: sheet.contains(document.activeElement),
        // The summary is part of the dialog, not something left behind it.
        summaryInDialog: sheet.contains(summary),
        summaryOutsideBody: !body.contains(summary),
        // Both the summary and the isolate control are on screen and are what
        // is painted where they are — the check the previous version computed
        // and then did not use.
        summaryUsable: usable(summary),
        isolateUsable: [...document.querySelectorAll('.anatomy-panel-action')]
          .filter((node) => !node.hidden)
          .every(usable),
        // The close control is above the scrolling body, so a reader four
        // hundred rows down does not have to scroll back to leave.
        closeAboveBody: close.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + 1,
      };
    });
    if (opened.open !== 'open') problems.push('the Parts button did not open the sheet');
    if (opened.modal !== 'true') problems.push('the sheet does not announce itself as a modal');
    if (!opened.focusInside) problems.push('opening the sheet left focus outside it');
    if (!opened.summaryInDialog) problems.push('the selection summary is outside the dialog it belongs to');
    if (!opened.summaryOutsideBody) problems.push('the selection summary is inside the scrolling body');
    if (!opened.summaryUsable) problems.push('the selection summary is off screen or covered while the sheet is open');
    if (!opened.isolateUsable) problems.push('a main action is off screen or covered while the sheet is open');
    if (!opened.closeAboveBody) problems.push('the close control is inside the scrolling list rather than above it');

    // And the ring does not run off the end. Tab from the last stop and
    // Shift+Tab from the first both have to come back inside.
    //
    // Note what this can and cannot separate: with the background fully inert
    // there is nothing else in the document for focus to land on, so this
    // passes whether the wrap comes from the trap or from there being nowhere
    // else to go. It checks the outcome a reader gets, not which mechanism
    // produced it — the trap stays because inert is not the only thing between
    // a reader and the browser's own chrome.
    const inDialog = () => page.evaluate(() =>
      document.querySelector('.anatomy-panel-sheet').contains(document.activeElement)
    );
    await page.evaluate(() => {
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const stops = [...sheet.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.hidden && node.getClientRects().length > 0);
      stops[stops.length - 1]?.focus();
    });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    if (!(await inDialog())) problems.push('Tab from the last control left the dialog');
    await page.evaluate(() => {
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const stops = [...sheet.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.hidden && node.getClientRects().length > 0);
      stops[0]?.focus();
    });
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(120);
    if (!(await inDialog())) problems.push('Shift+Tab from the first control left the dialog');

    // Select from the list while it is open, scrolled well down — the case
    // F-31 was about: the answer must not be somewhere the reader cannot see.
    const rows = page.locator('.anatomy-tree-leaf:visible');
    const count = await rows.count();
    const deep = rows.nth(Math.min(20, count - 1));
    await deep.scrollIntoViewIfNeeded();
    const deepName = (await deep.locator('.lang-en').first().textContent()).trim();
    await deep.click();
    await page.waitForTimeout(300);

    // The point of the whole layout: the answer stays visible and usable while
    // the list is scrolled. Both halves are asserted — on screen, and what is
    // actually painted there.
    const summaryReadable = await page.evaluate(() => {
      const summary = document.querySelector('.anatomy-panel-summary');
      const box = summary.getBoundingClientRect();
      const point = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        onScreen: box.top >= 0 && box.bottom <= window.innerHeight,
        own: Boolean(point && (summary === point || summary.contains(point))),
      };
    });
    if (!summaryReadable.onScreen) {
      problems.push('after selecting a row well down the list, the summary is off screen');
    }
    if (!summaryReadable.own) {
      problems.push('after selecting a row well down the list, something else is painted over the summary');
    }

    // What the reader is holding, before it is put away.
    const remembered = await page.evaluate(() => ({
      expanded: document.querySelectorAll('.anatomy-tree-branch[aria-expanded="true"]').length,
      scroll: document.querySelector('.anatomy-panel-body').scrollTop,
    }));

    // Escape closes, and focus comes back to the control that opened it.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => {
      const panel = document.querySelector('.anatomy-panel');
      const summary = panel.querySelector('.anatomy-panel-summary');
      const anyInert = [...document.querySelectorAll('#ui *')].some((node) => node.inert);
      return {
        open: panel.dataset.sheet,
        focusReturned: document.activeElement?.classList.contains('anatomy-panel-open') ?? false,
        backgroundLive: !anyInert,
        // Back in its dock, and still one of it.
        summaryVisible: summary.getBoundingClientRect().height > 0,
        summaryDocked: Boolean(summary.closest('.anatomy-panel-dock')),
        summaryCount: document.querySelectorAll('.anatomy-panel-summary').length,
      };
    });
    if (closed.open !== 'closed') problems.push('Escape did not close the sheet');
    if (!closed.focusReturned) problems.push('closing the sheet did not return focus to the button that opened it');
    if (!closed.backgroundLive) problems.push('closing the sheet left the background inert');
    if (!closed.summaryVisible) problems.push('the summary is not on screen once the sheet is closed');
    if (!closed.summaryDocked) problems.push('closing the sheet did not put the summary back in the panel');
    if (closed.summaryCount !== 1) problems.push(`there are ${closed.summaryCount} selection summaries on the page`);

    // And the background genuinely works again: a control outside the panel
    // takes focus, which `inert` would refuse.
    const backgroundWorks = await page.evaluate(() => {
      const outside = [...document.querySelectorAll('button')].find(
        (node) => !node.closest('.anatomy-panel') && node.getClientRects().length > 0
      );
      if (!outside) return null;
      outside.focus();
      return document.activeElement === outside;
    });
    if (backgroundWorks === false) problems.push('after closing, a control outside the panel still cannot take focus');
    if (backgroundWorks === null) notes.push('no control outside the panel was on screen to re-test the background with.');

    // The selection made in the sheet survives closing it, and the summary says so.
    const afterClose = await read();
    if (afterClose.en !== deepName) {
      problems.push(`the summary says "${afterClose.en}" after selecting "${deepName}" in the sheet`);
    }
    if (afterClose.en === pinnedBefore.en) {
      notes.push('the deep row happened to be the structure already selected, so the change was not observed.');
    }

    // Reopening keeps where the reader was: same tab, same expanded branches,
    // same scroll position. Rebuilding the list would lose all three.
    await page.locator('.anatomy-panel-open').click();
    await page.waitForTimeout(400);
    const reopened = await page.evaluate(() => ({
      expanded: document.querySelectorAll('.anatomy-tree-branch[aria-expanded="true"]').length,
      scroll: document.querySelector('.anatomy-panel-body').scrollTop,
      selected: document.querySelectorAll('.anatomy-tree-leaf[aria-selected="true"]').length,
    }));
    if (reopened.expanded !== remembered.expanded) {
      problems.push(`reopening the sheet changed the expanded branches (${remembered.expanded} → ${reopened.expanded})`);
    }
    if (Math.abs(reopened.scroll - remembered.scroll) > 2) {
      problems.push(`reopening the sheet moved the list (${remembered.scroll} → ${reopened.scroll})`);
    }
    if (reopened.selected !== 1) problems.push('reopening the sheet lost the selection');
    await shot('brain-sheet');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await shot('brain-phone');
  }
} catch (error) {
  // A step that cannot complete is a finding, not a reason to throw away the
  // findings collected before it. Breaking the modal boundary made a later
  // click time out, and the timeout discarded the sentence that said why — so
  // the run reported a stack trace where it had already worked out the cause.
  problems.push(`the drive stopped: ${error.message.split('\n')[0]}`);
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
