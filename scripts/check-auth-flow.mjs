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
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { PUBLIC_MODELS } from '../src/catalog/publicManifest.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const DIST = resolve(value('--dist', 'dist'));
const SCENE = value('--scene', PUBLIC_MODELS[0]?.sceneId ?? 'brain-anatomy');


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

// The shared static server, so the containment rule and the media types are
// one thing rather than eight. This file's own copy served an extensionless
// path as the shell and everything else verbatim; `serveDist` falls back to the
// shell for anything that is not a file in the build, which is the same answer
// for every request this check makes.
const { base, close: closeServer } = await serveDist(DIST);

const browser = await chromium.launch({
  executablePath: chromiumExecutable(),
  headless: !flag('--headed'),
});

/**
 * A Supabase session, shaped the way `normaliseSession` reads one.
 *
 * @param {string} email
 */
const sessionBody = (email) => JSON.stringify({
  access_token: 'stub-access-token',
  refresh_token: 'stub-refresh-token',
  expires_in: 3600,
  user: { id: '00000000-0000-4000-8000-000000000000', email },
});

/**
 * Open a page with Supabase stubbed, recording what the form asked for.
 *
 * `auth` decides what a given endpoint answers, so one run can be driven down
 * the confirmation-required branch and another down the session-returned one.
 * Returning nothing falls through to a 400, which is what keeps the dialog on
 * screen to be measured instead of navigating away.
 *
 * @param {{width:number,height:number}} viewport
 * @param {{ auth?: (path: string, request: import('playwright').Request) => object|null }} [options]
 */
async function openPage(viewport, { auth } = {}) {
  const page = await browser.newPage({ viewport });
  const calls = [];
  const errors = [];
  // Any host: the build decides which.
  await page.route('**/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = `${url.pathname}${url.search}`;
    calls.push(path);
    const reply = auth?.(path, route.request()) ?? null;
    await route.fulfill(reply ?? {
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
    // ---- Sign-up, both ways the project can be configured ----------------
    //
    // Which of these is live depends on whether the Supabase project confirms
    // addresses by email, which this cannot know. Both are driven here so the
    // branch that is not live is still known to work when it becomes live.
    step = 'signing up where the project confirms addresses';
    {
      const { page, calls } = await openPage({ width: 1280, height: 900 }, {
        auth: (path) => (path.includes('/auth/v1/signup')
          // Supabase answers a confirmation-required sign-up with the user and
          // no token at all, which is what `normaliseSession` reads as "no
          // session yet".
          ? { status: 200, contentType: 'application/json',
              body: JSON.stringify({ id: 'stub', email: 'waiting@example.test' }) }
          : null),
      });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.click('.account-trigger');
      await page.waitForSelector('.access-credentials');
      await page.click('.access-switch-mode');
      await page.waitForSelector('.access-credentials.is-signup');
      await page.fill('.access-credentials input[name=email]', 'waiting@example.test');
      await page.fill('.access-credentials input[name=password]', 'a-long-enough-one');
      await page.press('.access-credentials input[name=password]', 'Enter');
      await page.waitForTimeout(800);

      const text = await page.locator('.access-dialog').textContent();
      check('a sign-up awaiting confirmation says so', /確認メール|confirmation/i.test(text), text.slice(0, 90));
      check('and returns to sign-in, which is what happens next',
        (await page.locator('.access-credentials.is-signin').count()) === 1);
      check('and keeps the address that was signed up with',
        (await page.inputValue('.access-credentials input[name=email]')) === 'waiting@example.test');

      // The gap this closes: without it, a confirmation mail that went missing
      // leaves registering the same address again as the only way forward.
      const resend = page.locator('.access-resend-confirmation');
      check('and offers to send the confirmation again', (await resend.count()) === 1);
      if (await resend.count()) {
        const before = calls.length;
        await resend.click();
        await page.waitForTimeout(600);
        check('resending asks Supabase to resend',
          calls.slice(before).some((u) => u.includes('/auth/v1/resend')), calls.slice(before).join(', '));
      }
      await page.close();
    }

    step = 'signing up where the project returns a session';
    {
      const { page, errors } = await openPage({ width: 1280, height: 900 }, {
        auth: (path) => (path.includes('/auth/v1/signup')
          ? { status: 200, contentType: 'application/json', body: sessionBody('instant@example.test') }
          : null),
      });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.click('.account-trigger');
      await page.waitForSelector('.access-credentials');
      await page.click('.access-switch-mode');
      await page.waitForSelector('.access-credentials.is-signup');
      await page.fill('.access-credentials input[name=email]', 'instant@example.test');
      await page.fill('.access-credentials input[name=password]', 'a-long-enough-one');
      await page.press('.access-credentials input[name=password]', 'Enter');
      await page.waitForTimeout(1200);

      check('a sign-up that returns a session signs in',
        (await page.locator('.access-user-email').count()) === 1);
      check('and the credential form gives way to the account',
        (await page.locator('.access-credentials').count()) === 0);
      check('and no resend is offered, because nothing is pending',
        (await page.locator('.access-resend-confirmation').count()) === 0);
      // The signed-in branch of the dialog is the one no test that cannot sign
      // in ever reaches, and it threw for the life of the product on a
      // `const` declared after `return api`. Watch it explicitly.
      check('the signed-in account view renders without throwing',
        errors.length === 0, errors.join(' | '));
      await page.close();
    }

    // ---- Password recovery, everything up to the inbox -------------------
    //
    // The mail itself needs a real inbox (F-20). What the link lands on does
    // not, and that is the half with the moving parts: Supabase returns the
    // tokens in the URL fragment, which this app has to read before its own
    // router sees it as a scene name, and scrub before it can be screenshotted.
    step = 'landing on a recovery link';
    {
      const updates = [];
      const { page, calls } = await openPage({ width: 1280, height: 900 }, {
        auth: (path, request) => {
          if (path.includes('/auth/v1/user') && request.method() === 'PUT') {
            updates.push(path);
            return { status: 200, contentType: 'application/json',
                     body: JSON.stringify({ id: 'stub', email: 'reset@example.test' }) };
          }
          return null;
        },
      });
      await page.goto(
        `${base}#access_token=stub-recovery-token&refresh_token=stub-r&expires_in=3600&type=recovery`,
        { waitUntil: 'networkidle' },
      );
      await page.waitForSelector('.access-recovery', { timeout: 15000 });
      check('a recovery link opens the choose-a-password form', true);
      check('the tokens are scrubbed from the address bar',
        !page.url().includes('stub-recovery-token'), page.url());

      step = 'submitting a new password with Enter';
      const fields = page.locator('.access-recovery input[type=password]');
      await fields.nth(0).fill('a-brand-new-password');
      await fields.nth(1).fill('a-brand-new-password');
      await fields.nth(1).press('Enter');
      await page.waitForTimeout(900);
      check('Enter submits the new password', updates.length > 0, calls.join(', '));
      await page.close();
    }

    step = 'reloading in the middle of a recovery';
    {
      const { page } = await openPage({ width: 1280, height: 900 });
      // What is left in the address bar once the fragment has been scrubbed —
      // and therefore all a reload has to go on.
      await page.goto(`${base}?account=recovery`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      check('a reload mid-recovery still gets the password form, not a sign-in',
        (await page.locator('.access-recovery').count()) === 1);
      await page.close();
    }

    // ---- Managing an account that already exists -------------------------
    step = 'managing a signed-in account';
    {
      const signedIn = (path, request) => {
        if (path.includes('/auth/v1/token')) {
          return { status: 200, contentType: 'application/json', body: sessionBody('holder@example.test') };
        }
        if (path.includes('/auth/v1/user') && request.method() === 'PUT') {
          return { status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'stub', email: 'holder@example.test' }) };
        }
        return null;
      };
      const { page, calls } = await openPage({ width: 1100, height: 950 }, { auth: signedIn });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.click('.account-trigger');
      await page.waitForSelector('.access-credentials');

      // Agreeing belongs to registering, so it appears there and only there.
      check('sign-in is not asked to agree to anything', (await page.locator('.access-legal-consent').count()) === 0);
      await page.click('.access-switch-mode');
      await page.waitForSelector('.access-credentials.is-signup');
      check('creating an account presents the terms', (await page.locator('.access-legal-consent').count()) === 1);
      const legal = await page.locator('.access-legal-consent a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      check('and links to both documents',
        legal.includes('#/terms') && legal.includes('#/privacy'), legal.join(', '));

      await page.click('.access-switch-mode');
      await page.waitForSelector('.access-credentials.is-signin');
      await page.fill('.access-credentials input[name=email]', 'holder@example.test');
      await page.fill('.access-credentials input[name=password]', 'the-old-password');
      await page.press('.access-credentials input[name=password]', 'Enter');
      await page.waitForSelector('.access-user-email', { timeout: 15000 });

      step = 'changing a password from the account';
      await page.click('.access-change-password');
      await page.waitForSelector('.access-change-form');
      await page.fill('input[name=current-password]', 'the-old-password');
      await page.fill('input[name=new-password]', 'a-brand-new-one');
      await page.fill('input[name=confirm-password]', 'DIFFERENT-one');
      const beforeMismatch = calls.length;
      await page.press('input[name=confirm-password]', 'Enter');
      await page.waitForTimeout(400);
      check('mismatched passwords never reach the network', calls.length === beforeMismatch);
      // The regression this exists for: reporting the mismatch through
      // `state.notice` rebuilt the form and emptied every field, so being told
      // about the one mistake cost everything that was already right.
      check('and the fields already filled in survive being told',
        (await page.inputValue('input[name=current-password]')) === 'the-old-password'
        && (await page.inputValue('input[name=new-password]')) === 'a-brand-new-one');

      const beforeChange = calls.length;
      await page.fill('input[name=confirm-password]', 'a-brand-new-one');
      await page.press('input[name=confirm-password]', 'Enter');
      await page.waitForSelector('.access-user-email', { timeout: 15000 });
      const changed = calls.slice(beforeChange).join(' | ');
      // The current password is proved before the new one is set, so a session
      // left open cannot be used to lock its owner out of their own account.
      check('the current password is proved before the new one is set',
        /\/auth\/v1\/token/.test(changed) && /\/auth\/v1\/user/.test(changed), changed);

      step = 'changing the address on the account';
      await page.click('.access-change-email');
      await page.waitForSelector('.access-change-form');
      const beforeEmail = calls.length;
      await page.fill('input[name=new-email]', 'moved@example.test');
      await page.press('input[name=new-email]', 'Enter');
      await page.waitForSelector('.access-user-email', { timeout: 15000 });
      check('the move is requested of Supabase',
        calls.slice(beforeEmail).some((u) => u.includes('/auth/v1/user')), calls.slice(beforeEmail).join(' | '));
      // Nothing has moved until the link in the new address is opened. Saying
      // "changed" here would leave somebody believing an address had moved
      // when it had not, which is how an account becomes unreachable.
      const emailNotice = (await page.locator('.access-form-message').allTextContents()).join('');
      check('and is reported as sent, not as done',
        /確認メール|Confirmation sent/.test(emailNotice) && !/変更しました/.test(emailNotice), emailNotice.slice(0, 60));

      step = 'signing out in another tab';
      await page.evaluate(() => {
        localStorage.removeItem('medical3dlab.auth.v1');
        // `storage` is what a real other tab would raise; it never fires in the
        // tab that made the change, which is why this has to be synthesised.
        window.dispatchEvent(new StorageEvent('storage', { key: 'medical3dlab.auth.v1', newValue: null }));
      });
      await page.waitForSelector('.access-credentials', { timeout: 15000 });
      check('another tab signing out signs this one out too',
        (await page.locator('.access-user-email').count()) === 0);
      await page.close();
    }

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

      // A device pass on an iPhone read this dialog as an English form in a
      // Japanese product, with text that sank into the background and a close
      // button too small to hit. Each of those is measurable, and none of them
      // was measured.
      const dialog = await page.evaluate(() => {
        const root = document.querySelector('.access-dialog');
        const modal = root?.getBoundingClientRect();
        const close = document.querySelector('.access-close')?.getBoundingClientRect();
        const visibleText = (node) => {
          const out = [];
          for (const element of node.querySelectorAll('*')) {
            if (getComputedStyle(element).display === 'none') continue;
            for (const child of element.childNodes) {
              if (child.nodeType === 3 && child.textContent.trim()) out.push(child.textContent.trim());
            }
          }
          return out;
        };
        const relativeLuminance = (colour) => {
          const [r, g, b] = colour.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
          const channel = (value) => {
            const v = value / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
        };
        const dialogLuminance = relativeLuminance(getComputedStyle(root).backgroundColor);
        const contrastOf = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const ink = relativeLuminance(getComputedStyle(element).color);
          const [light, dark] = ink > dialogLuminance ? [ink, dialogLuminance] : [dialogLuminance, ink];
          return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
        };
        return {
          lang: document.getElementById('ui')?.dataset.lang ?? null,
          text: visibleText(root),
          placeholders: [...root.querySelectorAll('input')].map((input) => input.placeholder),
          modalInside: modal
            ? modal.left >= -1 && modal.top >= -1 &&
              modal.right <= window.innerWidth + 1 && modal.bottom <= window.innerHeight + 1
            : null,
          closeSize: close ? [Math.round(close.width), Math.round(close.height)] : null,
          bodyOverflow: getComputedStyle(document.body).overflow,
          contrast: {
            copy: contrastOf('.access-copy.lang-ja'),
            link: contrastOf('.access-text-button'),
            close: contrastOf('.access-close'),
          },
        };
      });

      // The interface is Japanese unless somebody switched it, and so is this.
      const bilingual = dialog.text.filter((line) => /[A-Za-z][^/]* \/ [ぁ-んァ-ヶ一-龠]/.test(line));
      check(`${label}: no label carries both languages joined by a slash`,
        bilingual.length === 0, bilingual.slice(0, 3).join(' | '));
      const english = dialog.text.filter((line) => /^[\x20-\x7E]+$/.test(line) && /[A-Za-z]{4}/.test(line));
      check(`${label}: the Japanese dialog is in Japanese`,
        dialog.lang !== 'ja' || english.length === 0, english.slice(0, 4).join(' | '));
      const asciiPlaceholders = dialog.placeholders.filter((value) => /^[\x20-\x7E]+$/.test(value ?? ''));
      check(`${label}: the fields are labelled in the language on screen`,
        dialog.lang !== 'ja' || asciiPlaceholders.length === 0, asciiPlaceholders.join(' | '));

      check(`${label}: the dialog is inside the viewport`, dialog.modalInside === true);
      check(`${label}: the close button is a target a finger can hit`,
        Boolean(dialog.closeSize) && Math.min(...dialog.closeSize) >= 44, JSON.stringify(dialog.closeSize));
      check(`${label}: the page behind the dialog does not scroll`,
        dialog.bodyOverflow === 'hidden', dialog.bodyOverflow);
      for (const [what, ratio] of Object.entries(dialog.contrast)) {
        if (ratio == null) continue;
        check(`${label}: the ${what} is readable (AA 4.5:1)`, ratio >= 4.5, `${ratio}:1`);
      }
      await page.close();
    }
  }
} catch (error) {
  problems.push(`the drive stopped while ${step}: ${error.message.split('\n')[0]}`);
  console.error(`\nwhile ${step}:\n${error.message}`);
} finally {
  await browser.close();
  closeServer();
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
