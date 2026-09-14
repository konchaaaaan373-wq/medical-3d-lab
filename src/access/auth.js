/**
 * Tiny Supabase Auth client using the public REST API directly.
 *
 * The lab deliberately does not add an auth framework to a Three.js app. The
 * browser only ever sees the publishable Supabase URL/key; server secrets and
 * Stripe secrets live in Netlify Functions.
 */

import { ADOPTABLE_REDIRECTS, authRedirectFromHash } from './authRedirect.js';

const STORAGE_KEY = 'medical3dlab.auth.v1';
let volatileSession = null;
let refreshInFlight = null;
let sessionGeneration = 0;

export const AUTH_CONFIG = Object.freeze({
  url: (import.meta.env?.VITE_SUPABASE_URL ?? '').replace(/\/$/, ''),
  publishableKey:
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env?.VITE_SUPABASE_ANON_KEY ??
    '',
});

export const authConfigured = () => Boolean(AUTH_CONFIG.url && AUTH_CONFIG.publishableKey);

function headers(token) {
  return {
    apikey: AUTH_CONFIG.publishableKey,
    Authorization: token ? `Bearer ${token}` : `Bearer ${AUTH_CONFIG.publishableKey}`,
    'Content-Type': 'application/json',
  };
}

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return stored ?? volatileSession;
  } catch {
    // Storage can be denied in private/embedded contexts. Keep the signed-in
    // session usable for this page lifetime rather than turning a valid login
    // response into an application error.
    return volatileSession;
  }
}

function store(session) {
  // Invalidates any token rotation that started from an older stored session.
  // In particular, signOut stores null before the network logout and an older
  // refresh response must not be allowed to sign the browser back in.
  sessionGeneration += 1;
  volatileSession = session ?? null;
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory fallback above is enough for the current page. A browser
    // that refuses persistent storage may require sign-in again after reload;
    // it must never prevent free models from running.
  }
}

async function json(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error_description || body.msg || body.message || 'Authentication failed');
    error.status = response.status;
    // Kept so callers can branch on *why* rather than on the wording of a
    // message Supabase is free to change. See `isUnconfirmedEmail`.
    error.code = body.error_code ?? body.code ?? null;
    throw error;
  }
  return body;
}

function normaliseSession(data) {
  if (!data?.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    user: data.user ?? null,
  };
}

export async function signIn(email, password) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const session = normaliseSession(await json(response));
  store(session);
  return session;
}

export async function signUp(email, password) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/signup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const data = await json(response);
  const session = normaliseSession(data);
  if (session) store(session);
  return { session, user: data.user ?? null };
}

/**
 * Was this sign-in refused because the address was never confirmed?
 *
 * It matters because the way out is not a better password — it is the
 * confirmation mail, which may never have arrived. Somebody in this state who
 * is only told "Email not confirmed" has nowhere to go but to register the
 * same address a second time, which is the gap the resend exists to close.
 *
 * Checks the code first and the message only as a fallback: `error_code` is
 * the contract, the wording is not.
 */
export function isUnconfirmedEmail(error) {
  if (!error) return false;
  if (error.code === 'email_not_confirmed') return true;
  return /email not confirmed|confirm your email/i.test(String(error.message ?? ''));
}

/**
 * Ask Supabase to send the sign-up confirmation email again.
 *
 * Only ever reached from a sign-up this browser just performed that came back
 * without a session — which is to say, only when the project has email
 * confirmation switched on. That is what makes it safe to offer: the address is
 * one the person in front of it just typed, so there is nothing here to
 * enumerate. Without it, somebody whose mail went missing has no route back
 * except registering the same address again.
 *
 * Supabase rate-limits this endpoint; a refusal arrives as a normal error and
 * is shown as one.
 */
export async function resendSignUpConfirmation(email, redirectTo) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const url = new URL(`${AUTH_CONFIG.url}/auth/v1/resend`);
  if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ type: 'signup', email }),
  });
  await json(response);
}

/**
 * Ask Supabase to send its standard recovery email.
 *
 * Supabase intentionally does not reveal whether the address exists, so the UI
 * must always show the same neutral confirmation after a successful request.
 */
export async function requestPasswordReset(email, redirectTo) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const url = new URL(`${AUTH_CONFIG.url}/auth/v1/recover`);
  if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  await json(response);
}

/**
 * Consume a Supabase redirect before the app treats the URL fragment as a
 * Medical 3D Lab scene route. Tokens are persisted and removed from the address
 * bar immediately so they cannot linger in screenshots or copied links.
 *
 * Returns the redirect's type — `recovery`, `signup`, `email_change`, … — or
 * null when the fragment was an ordinary route. The caller decides what each
 * one means; this only guarantees that none of them reaches the router with
 * credentials still attached.
 *
 * Unrecognised types are still consumed. A type this app has no opinion about
 * is not a reason to leave a live token in the address bar.
 */
/**
 * Ask Supabase who the stored token belongs to, and remember the answer.
 *
 * A session parsed out of a redirect fragment has no `user` — the fragment
 * carries tokens and nothing else. Left that way it is a session that cannot
 * say whose it is, which shows up twice: the dialog reports "your address is
 * confirmed" above a signed-out form, and `onExternalSessionChange` in another
 * tab reads the missing id as a *different* account and tears down whatever
 * was open. Both stop once the identity is filled in.
 *
 * Best effort on purpose. Failing to resolve the name leaves the token working
 * and the entitlement lookup will supply the identity a moment later; it is not
 * a reason to refuse a session Supabase has just issued.
 */
export async function loadUser() {
  // `getSession()` is inside the try because it can rotate the token, and that
  // rotation is a network call which rejects on a dropped connection. Outside,
  // a blip here rejected out of `AccessManager.init()` and took the rest of the
  // account layer's startup with it: no entitlement read, no cross-tab
  // listener, and no confirmation for somebody who had just confirmed their
  // address. "Best effort" has to mean it.
  try {
    const session = await getSession();
    if (!session?.access_token) return null;
    // Read *after* `getSession()`, which may have rotated the token and bumped
    // this itself. Captured before, the guard fired on the manager's own
    // refresh and threw away the identity it had just fetched — leaving the
    // session with no user, which is the state this function exists to repair.
    const generation = sessionGeneration;
    const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/user`, {
      headers: headers(session.access_token),
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user?.id) return null;
    // The guard `refresh()` carries, for the same reason: a sign-out during the
    // round-trip must not be undone by writing the captured token back after.
    if (generation !== sessionGeneration) return null;
    store({ ...session, user });
    return user;
  } catch {
    return null;
  }
}

export function consumeAuthRedirect({ location, history } = {}) {
  const currentLocation = location ?? globalThis.location;
  const currentHistory = history ?? globalThis.history;
  if (!currentLocation) return null;

  const redirect = authRedirectFromHash(currentLocation.hash);
  if (!redirect) return null;

  // Scrubbing is unconditional — that is the whole point, and a type nobody
  // here recognises is not a reason to leave a live token in the address bar.
  // *Adopting* it is a different question: signing somebody in, possibly over
  // a session they already had, on the strength of a link this app has no
  // handling for is not something to do silently. Those land signed out, which
  // is recoverable by signing in; the alternative is not.
  if (ADOPTABLE_REDIRECTS.has(redirect.type)) store(redirect.session);

  if (currentHistory?.replaceState) {
    const clean = new URL(currentLocation.href);
    clean.hash = '#/';
    currentHistory.replaceState(null, '', `${clean.pathname}${clean.search}${clean.hash}`);
  }
  return redirect.type;
}

/**
 * Is this page load a password recovery?
 *
 * Two signals, and either one is enough. The hash carries the tokens and can
 * only be read once — `consumeAuthRedirect` scrubs it immediately so
 * the tokens cannot linger in a screenshot or a copied URL. `?account=recovery`
 * is what is left in the address bar after that, and is therefore the only
 * signal a reload has.
 *
 * Written out as a function because inlining it went wrong in the way inlined
 * boolean logic does: `if (consumed || requested) recoveryMode = consumed` reads
 * as though it honours both and honours neither but the first — anybody who
 * reloaded mid-recovery got the ordinary sign-in dialog while holding a valid
 * recovery session.
 *
 * Answering true is not permission to change a password. It decides which
 * dialog opens; `updatePassword` still requires a live recovery session.
 *
 * @param {{ consumedRecoveryHash: boolean, search?: string }} signals
 */
export function isPasswordRecovery({ consumedRecoveryHash, search = '' }) {
  if (consumedRecoveryHash) return true;
  return new URLSearchParams(search).get('account') === 'recovery';
}

/** Update the password for a signed-in/recovery session. */
export async function updatePassword(password) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const session = await getSession();
  if (!session?.access_token) throw new Error('Password recovery session has expired. Please request a new email.');

  const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/user`, {
    method: 'PUT',
    headers: headers(session.access_token),
    body: JSON.stringify({ password }),
  });
  const data = await json(response);
  if (data?.user) store({ ...session, user: data.user });
  return data?.user ?? null;
}

/**
 * Change the password of a signed-in account, proving the current one first.
 *
 * Supabase will change a password on nothing but a live session, which is not
 * enough: a session left open on a shared machine would let anybody lock its
 * owner out of their own account. So the current password is proved the only
 * way a browser can prove it — by exchanging it for a token — and the new one
 * is set on the session that comes back.
 *
 * Re-authenticating also rotates the session, which is the right outcome
 * anyway: the credentials just changed.
 */
async function reauthenticate(email, currentPassword) {
  try {
    await signIn(email, currentPassword);
  } catch (error) {
    // Only a refusal means the password was wrong. A rate limit, a 5xx or a
    // dropped connection says nothing about what was typed, and reporting
    // those as "that is not your password" sends somebody who typed it
    // correctly off to recover an account that was never in trouble.
    const refused = error?.status === 400 || error?.status === 401;
    if (!refused) throw error;
    const failure = new Error('現在のパスワードが違います。 / That is not the current password.');
    failure.cause = error;
    failure.currentPasswordRejected = true;
    throw failure;
  }
}

export async function changePassword(email, currentPassword, newPassword) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  await reauthenticate(email, currentPassword);
  return updatePassword(newPassword);
}

/**
 * Ask Supabase to move the account to a new address.
 *
 * Nothing changes when this resolves. Supabase emails the new address and the
 * move happens when that link is opened, so the UI must say "check your mail"
 * rather than "done" — reporting success here would leave somebody believing
 * they had changed an address they had not.
 */
export async function changeEmail(email, currentPassword, newEmail, redirectTo) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  // Proved for the same reason `changePassword` proves it, and with more
  // reason: whoever controls the address controls password recovery, so moving
  // it is the stronger way to take an account over. A live session alone —
  // which is all Supabase asks for — would let anyone at an unattended browser
  // walk off with the account.
  await reauthenticate(email, currentPassword);
  const session = await getSession();
  if (!session?.access_token) throw new Error('Please sign in first.');

  const url = new URL(`${AUTH_CONFIG.url}/auth/v1/user`);
  if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(session.access_token),
    body: JSON.stringify({ email: newEmail }),
  });
  await json(response);
}

/**
 * Notice a sign-in or sign-out that happened in another tab.
 *
 * `storage` fires only in the tabs that did *not* make the change, which is
 * exactly the set that needs telling. Without this, signing out in one tab
 * left every other tab signed in: `readStored` falls back to the in-memory
 * `volatileSession` when storage reads empty — deliberately, so a browser that
 * refuses persistent storage still works — and that fallback cannot tell
 * "storage was denied" from "another tab just cleared it".
 *
 * Returns an unsubscribe function.
 */
export function onExternalSessionChange(listener) {
  const target = globalThis.window;
  if (!target?.addEventListener) return () => {};
  const onStorage = (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    // `key: null` is a whole-storage clear, which counts too.
    let next = null;
    try {
      next = JSON.parse(event.newValue ?? 'null');
    } catch {
      next = null;
    }
    // Adopt the other tab's answer either way: this is the one case where an
    // empty read is authoritative rather than a fallback.
    const before = volatileSession?.user?.id ?? null;
    volatileSession = next;

    // But only *report* a change of account. Tabs rotate their tokens on their
    // own schedule, and every rotation writes this key — telling the product
    // about those would tear down an open paid guide and empty a half-typed
    // account form roughly hourly, for nothing. The identity is what the
    // product cares about; the token is bookkeeping.
    const after = next?.user?.id ?? null;
    if (before === after) return;

    sessionGeneration += 1;
    listener(next);
  };
  target.addEventListener('storage', onStorage);
  return () => target.removeEventListener?.('storage', onStorage);
}

export function signOut() {
  const session = readStored();
  store(null);
  if (session?.access_token && authConfigured()) {
    fetch(`${AUTH_CONFIG.url}/auth/v1/logout`, {
      method: 'POST',
      headers: headers(session.access_token),
    }).catch(() => {});
  }
}

async function refresh(session) {
  if (!session?.refresh_token || !authConfigured()) return null;

  // Supabase can rotate refresh tokens. If two product calls notice an expired
  // access token together, serialise them through one refresh rather than
  // racing the same refresh token and making one of the two calls log out.
  if (refreshInFlight) return refreshInFlight;
  const generation = sessionGeneration;
  refreshInFlight = (async () => {
    const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!response.ok) {
      if (generation === sessionGeneration) store(null);
      return null;
    }
    const next = normaliseSession(await response.json());
    if (generation !== sessionGeneration) return null;
    store(next);
    return next;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function getSession() {
  const session = readStored();
  if (!session?.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if ((session.expires_at ?? 0) - now > 60) return session;
  return refresh(session);
}

export async function authenticatedFetch(url, options = {}) {
  let session = await getSession();
  if (!session) throw new Error('Please sign in first.');

  const send = (current) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${current.access_token}`,
      },
    });

  let response = await send(session);
  if (response.status !== 401) return response;

  // A token can be invalidated server-side before its local expiry timestamp.
  // Force one refresh and retry once. A genuine authorization failure remains
  // a 401 after the retry; there is deliberately no retry loop.
  session = await refresh(readStored() ?? session);
  if (!session) return response;
  response = await send(session);
  return response;
}
