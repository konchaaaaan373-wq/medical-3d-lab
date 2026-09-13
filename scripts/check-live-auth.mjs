#!/usr/bin/env node
/**
 * Asks the *deployed* site which sign-up flow its Supabase project is on.
 *
 *   npm run verify:live-auth -- https://med-3d-lab.necofindjob.com
 *
 * ## Why this exists
 *
 * `signUp` can answer two ways, and which one is live is a project setting
 * this repository cannot see. With email confirmation off, the response
 * carries a session and the person is signed in. With it on, the response
 * carries no session, and the product says a confirmation was sent, returns to
 * sign-in with the address kept, and offers to send it again.
 *
 * Both branches are implemented and both are driven by `npm run verify:auth`.
 * What was left (`F-98`) was not a behaviour to build but a fact to record —
 * and the standing plan for recording it was "sign up on production with an
 * address nobody has used and watch what happens". That needs a person, a
 * throwaway address, and a mailbox, and it leaves a real account behind.
 *
 * It does not need any of that. Supabase publishes the answer: GoTrue's
 * `/auth/v1/settings` is a public, read-only endpoint that states whether
 * addresses are auto-confirmed. This reads the deployed bundle for the origin
 * and publishable key the site actually ships with — not a value from a repo
 * that may not match production — and asks.
 *
 * ## What it will not do
 *
 * It never posts. No sign-up, no password-reset request, no account created,
 * and no mail sent to anybody. Asking a live auth service to send mail is a
 * side effect on real people's inboxes, so the only verb here is GET.
 *
 * That is also why this cannot close `F-20`: whether the reset mail actually
 * arrives is the one thing that needs a mailbox. This narrows what is left of
 * it — a project that auto-confirms does not send a confirmation mail at all,
 * which tells you which mail to go looking for.
 *
 * Exits non-zero if the site cannot be read, if it ships no auth configuration,
 * or if Supabase refuses the key. It does **not** fail on either answer: both
 * are legitimate configurations, and the job here is to report which is live.
 */

const args = process.argv.slice(2);
let supabaseOverride = '';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--supabase') supabaseOverride = args[(i += 1)] ?? '';
  else if (args[i].startsWith('--supabase=')) supabaseOverride = args[i].slice('--supabase='.length);
}
const supplied = args.find((arg) => !arg.startsWith('-') && arg !== supabaseOverride)
  || process.env.VITE_SITE_URL || '';
if (!supplied) {
  console.error('Usage: npm run verify:live-auth -- https://med-3d-lab.necofindjob.com');
  process.exit(2);
}

let origin;
try {
  origin = new URL(supplied).origin;
} catch {
  console.error(`"${supplied}" is not a URL. It needs a scheme.`);
  process.exit(2);
}

const get = async (url, what) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'medical-3d-lab verify:live-auth' } });
  if (!response.ok) throw new Error(`${what} — ${url} answered ${response.status}`);
  return response;
};

/**
 * The Supabase origin and publishable key the deployed bundle carries.
 *
 * Read out of what is served rather than out of this checkout: a build made
 * with different environment variables is exactly the situation worth
 * catching, and a value from the repo would hide it.
 */
async function deployedAuthConfig() {
  const html = await (await get(`${origin}/`, 'the site root')).text();
  const fromHtml = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((match) => match[1]);
  if (!fromHtml.length) throw new Error('the served page references no JavaScript, so it cannot be the app');

  // The config is not in the entry chunk. The account layer is loaded with a
  // dynamic `import()`, which is the whole point — a visitor who never opens
  // the dialog never downloads it — so the key lives in a lazy chunk that
  // `index.html` does not mention. Those chunks *are* named in the entry, as
  // the strings the dynamic import resolves, so one level out from the page
  // reaches them. Bounded, because this is somebody's live site.
  const queue = fromHtml.map((path) => new URL(path.replace(/^\.\//, '/'), origin).href);
  const seen = new Set();
  const LIMIT = 60;

  for (let i = 0; i < queue.length && seen.size < LIMIT; i += 1) {
    const url = queue[i];
    if (seen.has(url)) continue;
    seen.add(url);
    const source = await (await get(url, 'a script')).text();

    if (seen.size < LIMIT) {
      // Vite writes these as `"./install-<hash>.js"` — relative to the chunk
      // that names them, not to the site root — so they resolve against this
      // script's own URL. Resolving them against the origin was why an earlier
      // version of this check reported "no auth configuration" for a site that
      // plainly had some.
      for (const match of source.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9._/-]+\.js)["'`]/g)) {
        let next;
        try {
          next = new URL(match[1], url).href;
        } catch {
          continue;
        }
        if (!next.startsWith(origin)) continue;
        if (!seen.has(next) && !queue.includes(next)) queue.push(next);
      }
    }
    // Either key shape: the legacy anon JWT, or a newer publishable key.
    const key = source.match(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0]
      ?? source.match(/\bsb_publishable_[A-Za-z0-9_-]{10,}/)?.[0];
    if (!key) continue;

    // Hosted Supabase first, because that is what this project uses and the
    // host is unmistakable. A project on its own domain is not guessable from
    // a minified bundle, so that case asks rather than picks wrong: silently
    // probing some other origin found in the bundle would be worse than saying
    // it does not know.
    const hosted = source.match(/https:\/\/[a-z0-9-]+\.supabase\.(?:co|in)/)?.[0];
    const supabaseUrl = supabaseOverride || hosted;
    if (supabaseUrl) return { supabaseUrl, key, foundIn: url, guessed: !supabaseOverride };
    return { supabaseUrl: null, key, foundIn: url, guessed: false };
  }
  return null;
}

let config;
try {
  config = await deployedAuthConfig();
} catch (error) {
  console.error(`Could not read the deployed site: ${error.message}`);
  process.exit(1);
}

if (!config) {
  console.log(`Auth configuration — ${origin}`);
  console.log('  the deployed bundle carries no auth configuration');
  console.log('  so the account dialog shows its "not configured on this deployment" surface,');
  console.log('  and no sign-up flow is live to report on.');
  process.exit(0);
}

if (!config.supabaseUrl) {
  console.log(`Auth configuration — ${origin}`);
  console.log('  the bundle carries a publishable key, but its auth origin is not a');
  console.log('  recognisable hosted Supabase host, so this will not guess at it.');
  console.log(`  Re-run naming it:  npm run verify:live-auth -- ${origin} --supabase https://<host>`);
  process.exit(1);
}

let settings;
try {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) {
    console.error(`Supabase refused the site's own publishable key: ${response.status}`);
    console.error(`  ${config.supabaseUrl}/auth/v1/settings`);
    console.error('  The deployed key may have been rotated without a redeploy.');
    process.exit(1);
  }
  settings = await response.json();
} catch (error) {
  console.error(`Could not reach ${config.supabaseUrl}: ${error.message}`);
  process.exit(1);
}

// GoTrue has spelled this `mailer_autoconfirm` and, later, nested it under
// `mailer`. Read both rather than reporting "unknown" on a version bump.
const autoconfirm = settings.mailer_autoconfirm ?? settings.mailer?.autoconfirm ?? null;
const signupDisabled = settings.disable_signup ?? false;

console.log(`Auth configuration — ${origin}`);
console.log(`  project           ${config.supabaseUrl}`);
console.log(`  sign-up           ${signupDisabled ? 'DISABLED for this project' : 'open'}`);

if (autoconfirm === null) {
  console.log('  email confirmation  not stated by this GoTrue version');
  console.log('\n  Could not tell which sign-up branch is live. Both are implemented and');
  console.log('  both are driven by `npm run verify:auth`, so the product is correct either');
  console.log('  way — this run simply did not learn which.');
  process.exit(0);
}

if (autoconfirm === true) {
  console.log('  email confirmation  OFF (addresses are auto-confirmed)');
  console.log('\n  So: a sign-up returns a session and signs the person straight in.');
  console.log('  The "confirmation email sent" branch and its resend affordance are');
  console.log('  implemented and correct, but never reached on this project.');
  console.log('  No confirmation mail is sent, so there is none to go looking for.');
} else {
  console.log('  email confirmation  ON (a confirmation email is sent)');
  console.log('\n  So: a sign-up returns no session. The dialog says a confirmation was');
  console.log('  sent, returns to sign-in keeping the address, and offers to resend —');
  console.log('  which is the branch that needed the resend affordance to exist.');
}
console.log('\n  Record this in docs/follow-ups.md (F-98). Nothing was posted, no account');
console.log('  was created, and no mail was sent by this check.');
