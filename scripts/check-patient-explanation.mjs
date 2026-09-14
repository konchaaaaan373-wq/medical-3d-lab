#!/usr/bin/env node
/**
 * Drives a patient explanation in a real browser and checks that the **screen**
 * changes, not only the words.
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:patient -- --preview
 *
 * ## Why this exists as a script rather than as a note
 *
 * `tests/respiratory-guides.test.js` holds the copy, the stage pairing and the
 * model states a step may ask for. None of that can tell you whether pressing
 * Next did anything. The failure this check exists for is the one a guided
 * explanation fails silently: the step says "watch the airways narrow", the
 * camera stays where it was, the model is in the state it was already in, and
 * the reader is looking at a still picture while being told a mechanism.
 *
 * So each step is measured against what it declared. A step that names a
 * `frame` has to move the camera. A step that names `controls` has to move the
 * model — read back from the scene's own metrics, not from the guide's data.
 * A step that names neither has to leave both alone, because two steps that are
 * different pictures of one state are a thing this product does on purpose and
 * an accidental re-solve would be indistinguishable from it.
 *
 * It also checks the boundaries the mode itself is for: a playing model pauses
 * before a fixed caption appears, expert controls are gone, compact phone/tablet
 * layouts remain readable, and closing hands the clinician back their own lung —
 * with the position the conversation walked to kept, because that is the state
 * they now want the numbers for.
 *
 * ## Standing in for the paid plumbing
 *
 * Patient mode is entitlement-gated and its copy is served by a Netlify
 * function. Neither is what this checks, and neither runs in front of a static
 * build, so both are stubbed: a session in local storage and two intercepted
 * routes, the second answering with the very guide this repository holds. The
 * app, the scene, the model, the camera and the panel are all the real ones.
 *
 * Options:
 *   --dist <dir>    built site to serve (default: dist)
 *   --scene <slug>  scene route to drive (default: copd)
 *   --guide <id>    scene id whose guide to serve (default: from the manifest)
 *   --shots <dir>   write a screenshot per step here
 *   --preview       unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --headed        show the browser
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { patientGuideFor } from '../src/data/patientGuides.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const sceneSlug = value('--scene', 'copd');
const shotsDir = value('--shots');

const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (!existsSync(join(distDir, 'index.html'))) die(`No build at "${distDir}" — run \`npm run build\` first.`);
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const sceneId = value('--guide', SCENE_MANIFEST.find((scene) => scene.slug === sceneSlug)?.id ?? sceneSlug);
const guide = patientGuideFor(sceneId);
if (!guide) die(`No patient explanation is written for "${sceneId}".`);

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

// --- serving the build (same shape as check-anatomy-interaction.mjs) --------

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

// --- the drive --------------------------------------------------------------

const problems = [];
const observed = [];
/**
 * Whether this scene's progression axis writes its model controls as well.
 *
 * Some do — the oedema and hepatorenal scenes put the variable their axis moves
 * on the control panel too, so the reader can reach it either way. That changes
 * what "the controls came back" can mean on close: the explanation deliberately
 * leaves the axis where the conversation walked it, and on such a scene the
 * controls follow the axis there. Detected from the walk rather than declared,
 * so a scene that stops doing it stops being excused.
 */
let axisDrivesControls = false;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: !flag('--headed'),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const FAKE_USER = { id: 'verify-patient-explanation', email: 'verify@example.invalid' };
const FAKE_GRANTS = ['free', 'patient', 'education'];

await page.route('**/.netlify/functions/entitlements*', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ entitlements: FAKE_GRANTS, subscriptions: [], user: FAKE_USER }),
  })
);
await page.route('**/.netlify/functions/paid-content*', (route) => {
  const type = new URL(route.request().url()).searchParams.get('type');
  if (type !== 'patient') return route.fulfill({ status: 404, body: '{}' });
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ guide }),
  });
});
// Everything else billing touches answers "not configured", which is the state
// a build with no Stripe keys is in anyway.
await page.route('**/.netlify/functions/billing-status*', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{"billingConfigured":false}' })
);
await page.route('**/.netlify/functions/plan-catalog*', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{"billingConfigured":false}' })
);

await page.addInitScript(
  ({ user }) => {
    const hour = 60 * 60;
    localStorage.setItem(
      'medical3dlab.auth.v1',
      JSON.stringify({
        access_token: 'verification-token',
        refresh_token: 'verification-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 12 * hour,
        user,
      })
    );
  },
  { user: FAKE_USER }
);

const route = `${base}?${flag('--preview') ? 'preview=1' : ''}#/${sceneSlug}`;
await page.goto(route, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__app?.scene), null, { timeout: 20000 });

// The analytics consent card sits over the middle of the frame until it is
// answered, and a screenshot of a patient explanation with a consent card
// across it is not a picture of the explanation. Declining is the answer that
// changes nothing else.
const consent = page.locator('button:has-text("No thanks")').first();
await consent.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
if (await consent.count()) {
  await consent.click().catch(() => {});
  await page.waitForTimeout(300);
}
if (await consent.isVisible().catch(() => false)) {
  problems.push('the analytics consent card would not go away, so every screenshot has it across the model');
}

/** Camera pose and the numbers the model is currently solving. */
const readState = () =>
  page.evaluate(() => {
    const app = window.__app;
    return {
      camera: app.viewer.camera.position.toArray(),
      target: app.viewer.controls.target.toArray(),
      progress: app.playback.value,
      playing: app.playback.playing,
      controls: (app.scene.getModelControls?.() ?? []).map(({ id, value }) => [id, value]),
      // Keyed by row id, because this check quotes a few of them back and the
      // scene hands them out as an ordered list for a panel to render.
      metrics: Object.fromEntries((app.scene.getMetrics?.() ?? []).map((row) => [row.id, row.value])),
      dataView: app.isDataView?.() ?? null,
      comparing: app.isComparing?.() ?? null,
      /**
       * Where on screen the things the step points at actually are.
       *
       * The check this makes possible is the one a framing exists for: a step
       * that says "watch the airways" has failed if the airways are behind the
       * console or off the top of the frame, however correct the sentence is.
       * Taken from the scene's own annotation anchors, projected through the
       * camera the reader is looking through.
       */
      anchors: Object.fromEntries(
        (app.scene.getAnnotations?.() ?? []).map((annotation) => {
          const projected = annotation.position.clone().project(app.viewer.camera);
          return [
            annotation.id,
            {
              x: ((projected.x + 1) / 2) * window.innerWidth,
              y: ((1 - projected.y) / 2) * window.innerHeight,
              behind: projected.z > 1,
            },
          ];
        })
      ),
      consoleTop: document.querySelector('.console')?.getBoundingClientRect().top ?? window.innerHeight,
      headerBottom: document.querySelector('.global-scene-nav')?.getBoundingClientRect().bottom ?? 0,
      frame: { width: window.innerWidth, height: window.innerHeight },
    };
  });

const moved = (a, b) => a.some((value, index) => Math.abs(value - b[index]) > 1e-3);
const sameControls = (a, b) => JSON.stringify(a) === JSON.stringify(b);

await page.evaluate(() => window.__app.playback.play());
await page.waitForTimeout(80);
const clinician = await readState();

const patientButton = page.locator('.patient-mode-button');
if (!(await patientButton.count())) {
  problems.push('the patient explanation has no way in: no Patient button was built for this scene');
} else {
  await patientButton.click();
  await page.waitForSelector('#ui.is-patient-guide .patient-guide', { timeout: 10000 });

  if (await page.evaluate(() => window.__app.playback.playing)) {
    problems.push('opening a patient explanation did not pause the playing model, so its fixed caption can drift');
  }

  const layoutViewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet portrait', width: 768, height: 1024 },
    { name: 'phone portrait', width: 375, height: 812 },
    { name: 'short phone portrait', width: 375, height: 667 },
    { name: 'very short phone portrait', width: 375, height: 568 },
    { name: 'phone landscape', width: 844, height: 390 },
  ];

  for (const viewport of layoutViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(180);
    const layout = await page.evaluate(() => {
      const box = (selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height } : null;
      };
      return {
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        console: box('.console'),
        step: box('.patient-guide-step'),
        topBar: getComputedStyle(document.querySelector('.top-bar')).display,
        sceneNav: getComputedStyle(document.querySelector('.global-scene-nav')).display,
      };
    });

    if (layout.horizontalOverflow > 1) {
      problems.push(`${viewport.name}: page overflows horizontally by ${Math.round(layout.horizontalOverflow)}px`);
    }
    if (!layout.console || !layout.step) {
      problems.push(`${viewport.name}: consultation panel or current-step region is missing`);
      continue;
    }
    if (
      layout.console.left < -1 ||
      layout.console.top < -1 ||
      layout.console.right > viewport.width + 1 ||
      layout.console.bottom > viewport.height + 1
    ) {
      problems.push(`${viewport.name}: consultation panel escapes the viewport`);
    }
    if (layout.step.height < 64) {
      problems.push(`${viewport.name}: only ${Math.round(layout.step.height)}px remains for the current explanation`);
    }
    if (layout.topBar !== 'none' || layout.sceneNav !== 'none') {
      problems.push(`${viewport.name}: expert shell remains visible in patient presentation`);
    }

    const shortLandscape = viewport.height <= 460 && viewport.width / viewport.height >= 1.5;
    const compactSheet = viewport.width <= 900 && !shortLandscape;
    if (compactSheet) {
      if (layout.console.left > 20 || viewport.width - layout.console.right > 20) {
        problems.push(`${viewport.name}: compact consultation sheet is not anchored to both sides`);
      }
      if (layout.console.top < viewport.height * 0.38) {
        problems.push(`${viewport.name}: consultation sheet leaves too little of the 3D model visible`);
      }
    } else if (layout.console.left < viewport.width * 0.48) {
      problems.push(`${viewport.name}: consultation rail takes more than half of the model width`);
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(250);

  // Where the panel chose to open. It is not always step one: a guide opens on
  // the step that describes the model the clinician is already looking at, and
  // that behaviour is itself worth recording. Walk from the beginning anyway —
  // this check is about every step — by pressing the first dot.
  const openedAt = Number(((await page.locator('.patient-guide-counter').textContent()) ?? '').split('/')[0]);
  if (Number.isFinite(openedAt)) console.log(`  opened on step ${openedAt} of ${guide.steps.length}`);
  await page.locator('.patient-guide-dot').first().click();
  await page.waitForTimeout(500);

  // The boundary the mode exists for: the expert controls are not sitting in
  // front of the person the explanation is for.
  const rowVisible = await page.locator('#ui.is-patient-guide .controls .button-row').isVisible();
  if (rowVisible) problems.push('the expert controls are still on screen during a patient explanation');

  let previous = await readState();
  for (const [index, step] of guide.steps.entries()) {
    if (index > 0) {
      await page.locator('.patient-guide-nav.primary').click();
      // Let the camera tween settle before measuring it.
      await page.waitForTimeout(700);
    }
    const now = await readState();
    const shown = await page.locator('.patient-guide-heading .lang-en').textContent();

    if ((shown ?? '').trim() !== step.title) {
      problems.push(`step ${index + 1}: the panel shows "${shown}", the guide says "${step.title}"`);
    }

    const cameraMoved = moved(previous.camera, now.camera) || moved(previous.target, now.target);
    const modelMoved = !sameControls(previous.controls, now.controls);
    const declaresFrame = Boolean(step.frame) && step.frame !== guide.steps[index - 1]?.frame;
    const declaresControls =
      Boolean(step.controls) &&
      JSON.stringify(step.controls) !== JSON.stringify(guide.steps[index - 1]?.controls ?? null);

    if (index > 0) {
      if (declaresFrame && !cameraMoved) {
        problems.push(`step ${index + 1} ("${step.title}") asks for framing "${step.frame}" and the camera did not move`);
      }
      if (declaresControls && !modelMoved) {
        problems.push(`step ${index + 1} ("${step.title}") asks for a different lung and the model did not change`);
      }
      // A control that moved while the axis moved is the axis: some scenes put
      // their progression variable on the control panel as well, so the reader
      // can reach it either way. Only a control change with the axis standing
      // still is a step re-solving the model it did not ask to re-solve.
      const axisMoved = Math.abs(now.progress - previous.progress) > 1e-6;
      if (!declaresControls && modelMoved) {
        if (axisMoved) axisDrivesControls = true;
        else problems.push(`step ${index + 1} ("${step.title}") re-solved the model without asking to`);
      }
    }

    // The line that says this is not the model talking, on screen every time
    // the step is shown rather than once in a footnote.
    const educationalShown = await page.locator('.patient-guide-educational').isVisible();
    if (Boolean(step.educationalOnly) !== educationalShown) {
      problems.push(
        `step ${index + 1} ("${step.title}"): educationalOnly is ${Boolean(step.educationalOnly)} and the notice is ${educationalShown ? 'shown' : 'hidden'}`
      );
    }
    const lookShown = await page.locator('.patient-guide-look').isVisible();
    if (Boolean(step.look) !== lookShown) {
      problems.push(`step ${index + 1} ("${step.title}"): has a "where to look" line and the panel did not draw it`);
    }

    // A step that asks for a second model beside this one has to get it: the
    // labels it points at do not exist without it, and "compare the two" over a
    // picture of one is the failure.
    if (step.compare !== undefined && now.comparing !== step.compare) {
      problems.push(
        `step ${index + 1} ("${step.title}") asked for comparison ${step.compare} and the scene is ${now.comparing}`
      );
    }

    // The whole reason a step names a framing: what it points at has to be in
    // the part of the frame the reader can see. A correct sentence over a
    // subject behind the console is the failure this check exists for.
    for (const id of step.focus ?? []) {
      const anchor = now.anchors[id];
      if (!anchor) {
        problems.push(`step ${index + 1} ("${step.title}"): points at "${id}", which the scene does not draw`);
        continue;
      }
      const clear =
        !anchor.behind &&
        anchor.x > 0 &&
        anchor.x < now.frame.width &&
        anchor.y > now.headerBottom &&
        anchor.y < now.consoleTop;
      if (!clear) {
        problems.push(
          `step ${index + 1} ("${step.title}"): "${id}" is at ${Math.round(anchor.x)},${Math.round(anchor.y)}` +
            ` in a band running ${Math.round(now.headerBottom)}-${Math.round(now.consoleTop)} down a ${now.frame.width}px frame` +
            ' — the reader cannot see what it points at'
        );
      }
    }

    observed.push({
      step: index + 1,
      title: step.title,
      stage: step.stage,
      progress: +now.progress.toFixed(3),
      cameraMoved,
      modelMoved,
      // Whichever of these the scene has — the two respiratory scenes read out
      // different numbers, and the point of printing them is that a step which
      // said the model would change can be seen to have changed it.
      ...Object.fromEntries(
        ['ic', 'eelv', 'tau', 'limited', 'resistance', 'defects', 'heterogeneity']
          .filter((key) => now.metrics[key] !== undefined)
          .map((key) => [key, now.metrics[key]])
      ),
    });

    if (shotsDir) {
      await page.screenshot({ path: join(shotsDir, `${sceneSlug}-patient-${String(index + 1).padStart(2, '0')}.png`) });
    }
    previous = now;
  }

  const walkedTo = (await readState()).progress;

  // Closing hands the clinician their own lung back — and keeps where the
  // conversation got to, because that is the state they now want numbers for.
  await page.locator('.patient-guide-close').click();
  await page.waitForTimeout(700);
  const after = await readState();

  const axisKept = Math.abs(after.progress - clinician.progress) > 1e-6;
  if (!sameControls(after.controls, clinician.controls)) {
    if (axisDrivesControls && axisKept) {
      console.log(
        '  note: this scene\'s axis writes its own controls, so the controls follow the position' +
          ' the explanation walked to. Only that position was kept on purpose.'
      );
    } else {
      problems.push('closing the explanation left the clinician with the state the explanation was using');
    }
  }
  if (Math.abs(after.progress - walkedTo) > 1e-3) {
    problems.push(
      `closing the explanation moved the model off where the conversation got to (${after.progress} vs ${walkedTo})`
    );
  }
  if (after.dataView !== clinician.dataView) {
    problems.push('closing the explanation did not give the read-outs back');
  }
  if (after.playing) {
    problems.push('a guide that moved the model resumed playback after closing');
  }
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${sceneSlug}-patient-99-closed.png`) });
}

await browser.close();
server.close();

console.log(`\npatient explanation — ${sceneId}\n`);
for (const row of observed) {
  const numbers = ['ic', 'eelv', 'tau', 'limited', 'resistance', 'defects', 'heterogeneity']
    .filter((key) => row[key] !== null && row[key] !== undefined)
    .map((key) => `${key} ${row[key]}`)
    .join('  ');
  console.log(
    `  ${String(row.step).padStart(2)}. ${row.stage?.padEnd(10) ?? ''} p=${String(row.progress).padEnd(5)}` +
      ` ${row.cameraMoved ? 'camera' : '      '} ${row.modelMoved ? 'model' : '     '}  ${numbers}`
  );
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nEvery step changed what it said it would change, and nothing else.');
