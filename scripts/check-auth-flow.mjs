#!/usr/bin/env node
/**
 * Drives the sign-in / create-account dialog in a real browser.
 *
 *   VITE_SUPABASE_URL=https://stub.invalid \
 *   VITE_SUPABASE_PUBLISHABLE_KEY=stub npm run build
 *   npm run verify:auth
 *
 * ## Why this exists as a script rather than as a note
 *
 * Everything this checks is invisible to `node --test`, and the account dialog
 * is the part of the product where that gap bites hardest: `AccessManager`
 * reads `import.meta.env` at module load, so under the unit tests it is
 * permanently "not configured" and never builds a credential form at all.
 * `tests/credential-flow.test.js` covers the form as a pure view; everything
 * below needs a browser to be true or false.
 *
 * The three failures it was written for had all shipped, and none of them is
 * visible in a diff:
 *
 *   - the form was a `<div>` of `type="button"` buttons, so Enter — the
 *     ordinary way a login is submitted — did nothing at all, and `required`
 *     was inert because nothing it hangs off ever submitted;
 *   - rebuilding the dialog dropped focus to `<body>`, outside the modal, so
 *     Escape stopped closing it and the scene's window-level shortcuts started
 *     acting on the model behind it;
 *   - the credential heading outranked the "not configured" body, so a
 *     deployment with no Supabase env vars announced a form it did not render.
 *
 * ## The keyboard-containment check has a control, and needs one
 *
 * "The dialog swallowed the keystroke" and "nothing was listening anyway" look
 * identical from the outside. An earlier version of this check ran on the
 * landing page, where no scene is mounted and `bindKeyboard` is never called —
 * so it passed whether or not the dialog contained anything, and proved
 * nothing.
 *
 * So it runs on a real scene route, and presses `h` twice with the dialog shut
 * first. That must toggle `#ui.is-hidden`, which is what establishes the probe
 * can see the shortcut fire at all. Only then is the same key pressed with the
 * dialog open, where it must do nothing.
 *
 * ## What it does not check
 *
 * One engine, headless, on a desktop machine. It cannot see a Safari-only
 * layout bug or a software keyboard eating the viewport — `verify:ui` owns the
 * viewport matrix and `docs/accessibility.md` owns the manual half. It also
 * never reaches a real Supabase: requests are stubbed, so it proves which
 * endpoint the form asked for, never that the credentials were right. The
 * password-reset email round-trip needs an inbox and is `F-20`.
 *
 * Options:
 *   --dist <dir>     built site to serve (default: dist)
 *   --scene <slug>   scene route for the keyboard-containment control
 *                    (default: the first model in the public manifest)
 *   --headed         show the browser
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { chromiumExecutable } from './lib/browser.mjs';
import { PUBLIC_MODELS } from '../src/catalog/publicManifest.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const DIST = resolve(value('--dist', 'dist'));
const SCENE = value('--scene', PUBLIC_MODELS[0]?.sceneId ?? 'brain-anatomy');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary', '.txt': 'text/plain', '.xml': 'application/xml',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`No build at ${DIST}. Run \`npm run build\` first.`);
  process.exit(1);
}

const problems = [];
const notes = [];
let checked = 0;
/** @param {string} name @param {boolean} ok @param {string} [detail] */
const check = (name, ok, detail = '') => {
  checked += 1;
  if (!ok) problems.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  // Contain the served path to DIST: this serves whatever is asked for.
  const wanted = normalize(join(DIST, decodeURIComponent(url.pathname)));
  const inside = wanted === DIST || wanted.startsWith(`${DIST}${sep}`);
  const file = inside && existsSync(wanted) && extname(wanted) ? wanted : join(DIST, 'index.html');
  try {
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});
await new Promise((ready) => server.listen(0, ready));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: chromiumExecutable(),
  headless: !flag('--headed'),
});

/** Open a page with Supabase stubbed, recording what the form asked for. */
async function openPage(viewport) {
  const page = await browser.newPage({ viewport });
  const calls = [];
  const errors = [];
  // Any host: the build decides which, and a failing response is what keeps the
  // UI on screen to be measured rather than navigating away.
  await page.route('**/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    calls.push(`${url.pathname}${url.search}`);
    await route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ msg: 'stubbed by verify:auth' }),
    });
  });
  page.on('pageerror', (error) => errors.push(`uncaught: ${error}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // This script fails every auth request on purpose, and the browser logs a
    // "Failed to load resource" for each one. Counting those as findings would
    // make the check fail by design and train everybody to ignore it. An
    // uncaught exception is the signal worth keeping; a request this script
    // itself refused is not.
    if (/Failed to load resource/i.test(message.text())) return;
    errors.push(message.text());
  });
  return { page, calls, errors };
}

const dialogOpen = (page) => page.locator('.access-dialog').isVisible();
let configured = false;
let step = 'starting';

try {
  // ---- Is this build wired to a Supabase at all? -------------------------
  step = 'opening the account dialog';
  {
    const { page } = await openPage({ width: 1280, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.click('.account-trigger');
    await page.waitForSelector('.access-dialog');
    await page.waitForTimeout(250);
    configured = (await page.locator('.access-credentials').count()) > 0;

    if (!configured) {
      // Not a failure: it is the other surface, and it has its own claims.
      const text = await page.locator('.access-dialog').textContent();
      check('unconfigured build keeps the neutral heading',
        text.includes('Access & billing') && text.includes('利用権・お支払い'), text.slice(0, 80));
      check('unconfigured build is not headed like a form',
        !/Sign in|Create an account/.test(text.slice(0, 120)), text.slice(0, 120));
      check('unconfigured build says why', /not been configured|設定されていません/.test(text));
      notes.push('build has no VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');
      notes.push('credential checks need a configured build — see the header of this script');
    }
    await page.close();
  }

  if (configured) {
    // ---- The credential flow ---------------------------------------------
    step = 'driving the credential form';
    const { page, calls, errors } = await openPage({ width: 1280, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.click('.account-trigger');
    await page.waitForSelector('.access-credentials');

    check('the credential form is a real form',
      (await page.evaluate(() => document.querySelector('.access-credentials').tagName)) === 'FORM');
    check('it opens on sign-in, asking for the existing password',
      (await page.getAttribute('.access-credentials input[name=password]', 'autocomplete')) === 'current-password');

    step = 'submitting sign-in with Enter';
    await page.fill('.access-credentials input[name=email]', 'reader@example.test');
    await page.fill('.access-credentials input[name=password]', 'correct-horse-battery');
    await page.press('.access-credentials input[name=password]', 'Enter');
    await page.waitForTimeout(700);
    check('Enter submits sign-in', calls.some((u) => u.includes('grant_type=password')), calls.join(', '));
    check('submitting does not navigate the page', page.url().startsWith(base), page.url());

    step = 'switching to create-account';
    await page.click('.access-switch-mode');
    await page.waitForSelector('.access-credentials.is-signup', { timeout: 5000 });
    check('sign-up asks the browser for a new password',
      (await page.getAttribute('.access-credentials input[name=password]', 'autocomplete')) === 'new-password');
    check('the typed address survives the switch',
      (await page.inputValue('.access-credentials input[name=email]')) === 'reader@example.test');
    check('sign-up offers no password recovery', (await page.locator('.access-forgot').count()) === 0);

    step = 'submitting sign-up with Enter';
    const beforeSignUp = calls.length;
    await page.fill('.access-credentials input[name=password]', 'a-brand-new-one');
    await page.press('.access-credentials input[name=password]', 'Enter');
    await page.waitForTimeout(700);
    check('Enter submits sign-up, and to /signup',
      calls.slice(beforeSignUp).some((u) => u.includes('/auth/v1/signup')), calls.slice(beforeSignUp).join(', '));
    check('focus survives a failed submit, on the password field',
      (await page.evaluate(() => document.activeElement?.getAttribute?.('name'))) === 'password');

    step = 'checking that an empty submit is refused';
    await page.click('.access-switch-mode');
    await page.waitForSelector('.access-credentials.is-signin');
    await page.fill('.access-credentials input[name=email]', '');
    const beforeEmpty = calls.length;
    await page.press('.access-credentials input[name=email]', 'Enter');
    await page.waitForTimeout(400);
    check('an empty submit never reaches the network', calls.length === beforeEmpty);
    check('no console errors while driving the form', errors.length === 0, errors.join(' | '));
    await page.close();
  }

  if (configured) {
    // ---- Keyboard containment, on a route where shortcuts are live --------
    step = `mounting ${SCENE} for the keyboard control`;
    const { page } = await openPage({ width: 1280, height: 900 });
    await page.goto(`${base}#/${SCENE}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.account-trigger', { timeout: 20000 });
    await page.waitForTimeout(1200);
    const uiHidden = () => page.evaluate(() =>
      document.getElementById('ui')?.classList.contains('is-hidden') ?? null);

    // The control. Without this, "the dialog swallowed it" and "nothing was
    // listening" are the same observation.
    step = 'establishing that the scene shortcut is live';
    await page.keyboard.press('h');
    await page.waitForTimeout(200);
    const reacted = await uiHidden();
    await page.keyboard.press('h');
    await page.waitForTimeout(200);
    const restored = await uiHidden();
    check('control: "h" reaches the scene when no dialog is open', reacted === true, `is-hidden=${reacted}`);
    check('control: the scene UI comes back', restored === false, `is-hidden=${restored}`);

    if (reacted !== true) {
      // Say so loudly rather than letting the real check pass by default.
      notes.push(`the "h" shortcut was not live on #/${SCENE}; the containment check below proves nothing`);
    }

    step = 'checking the dialog contains the keyboard across a rebuild';
    await page.click('.account-trigger');
    await page.waitForSelector('.access-credentials');
    await page.click('.access-switch-mode');          // the rebuild that used to lose focus
    await page.waitForSelector('.access-credentials.is-signup');

    const focus = await page.evaluate(() => ({
      inside: document.querySelector('.access-dialog').contains(document.activeElement),
      on: document.activeElement?.className ?? document.activeElement?.tagName,
    }));
    check('focus stays inside the dialog across a rebuild', focus.inside, String(focus.on));
    check('focus returns to the control that was clicked',
      String(focus.on).includes('access-switch-mode'), String(focus.on));

    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    check('"h" does not reach the scene behind the open dialog',
      (await uiHidden()) === false, `is-hidden=${await uiHidden()}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check('Escape still closes the dialog after a rebuild', !(await dialogOpen(page)));
    await page.close();
  }

  if (configured) {
    // ---- Layout, at the two ends of the matrix ----------------------------
    for (const [label, viewport] of [
      ['desktop', { width: 1280, height: 900 }],
      ['phone', { width: 390, height: 844 }],
    ]) {
      step = `measuring the dialog at ${label}`;
      const { page, errors } = await openPage(viewport);
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.click('.account-trigger');
      await page.waitForSelector('.access-credentials');
      const box = await page.evaluate(() => {
        const submit = document.querySelector('.access-credentials-submit').getBoundingClientRect();
        const modeSwitch = document.querySelector('.access-switch-mode').getBoundingClientRect();
        return {
          submitW: submit.width, submitH: submit.height,
          switchW: modeSwitch.width, switchH: modeSwitch.height,
          scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
        };
      });
      check(`${label}: the dialog does not scroll sideways`,
        box.scrollWidth <= box.innerWidth + 1, `${box.scrollWidth} > ${box.innerWidth}`);
      check(`${label}: the submit button is a real target`,
        box.submitH >= 40 && box.submitW > 150, JSON.stringify(box));
      check(`${label}: the mode switch is reachable`,
        box.switchW > 40 && box.switchH >= 20, JSON.stringify(box));
      check(`${label}: no console errors`, errors.length === 0, errors.join(' | '));
      await page.close();
    }
  }
} catch (error) {
  problems.push(`the drive stopped while ${step}: ${error.message.split('\n')[0]}`);
  console.error(`\nwhile ${step}:\n${error.message}`);
} finally {
  await browser.close();
  server.close();
}

console.log(`Auth flow — ${configured ? 'configured build' : 'unconfigured build'}, ${checked} checks`);
if (configured) console.log(`  keyboard containment measured on #/${SCENE}`);
for (const note of notes) console.log(`  note: ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  configured
    ? '  ok    Enter submits both modes; the browser is asked for the right password; ' +
      'the dialog keeps the keyboard across a rebuild; the layout holds at 390px'
    : '  ok    the unconfigured surface describes itself and renders no form'
);
