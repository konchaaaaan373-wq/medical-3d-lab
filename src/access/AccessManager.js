import { el, focusBack } from '../utils/dom.js';
import {
  authConfigured,
  authenticatedFetch,
  consumeAuthRedirect,
  loadUser,
  changeEmail,
  changePassword,
  isPasswordRecovery,
  isUnconfirmedEmail,
  onExternalSessionChange,
  getSession,
  requestPasswordReset,
  resendSignUpConfirmation,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from './auth.js';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  canAccess,
  ENTITLEMENT,
  ENTITLEMENT_COPY,
  PLAN,
  PLAN_GRANTS,
} from './policy.js';
import {
  CREDENTIAL_MODE,
  MIN_PASSWORD_LENGTH,
  credentialForm,
  credentialModePolicy,
} from './credentialForm.js';
import { pricePresentation } from './pricing.js';
import { canSell, saleBlockedNotice } from './legalReadiness.js';
import { subscriptionPresentation } from './subscriptionView.js';
import { withPreviewGrants } from './previewGrants.js';
import { emitAppEvent } from '../app/appEvents.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';

const FREE = new Set([ENTITLEMENT.FREE]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A fresh grant set, with the reviewer's grants folded in.
 *
 * Every path that decides access rebuilds this from scratch — startup, sign-in,
 * sign-out, a successful entitlement lookup and two different failures — and a
 * preview build has to survive all of them, so the fold happens at the
 * assignment rather than once at startup. Written as one function because five
 * bare `new Set(...)` assignments are five chances to add a sixth and forget;
 * `tests/preview-grants.test.js` fails if one appears.
 *
 * In a production bundle `withPreviewGrants` adds nothing and Vite has already
 * compiled the branch inside it to dead code.
 *
 * @param {Iterable<string>} [from]
 */
const grantSet = (from = FREE) => withPreviewGrants(new Set(from));

/**
 * Account + entitlement state for the browser.
 *
 * Failing billing infrastructure must never make the free medical model fail to
 * load. Every network call therefore degrades to the implicit `free` grant.
 */
export function createAccessManager({ ui }) {
  const state = {
    user: null,
    // Through `grantSet` like every later assignment. Missed here first, and
    // the surfaces stayed locked in a preview build until `init()` happened to
    // rebuild them — which it does not do when billing is not configured.
    grants: grantSet(),
    subscriptions: [],
    billingConfigured: false,
    planCatalog: {},
    loading: false,
    recoveryMode: false,
    deletionMode: false,
    // Which of the two people the credential form is currently talking to.
    // Returning visitors are the common case, so that is what it opens on.
    credentialMode: CREDENTIAL_MODE.SIGN_IN,
    // The address as typed. `render()` rebuilds the dialog from scratch, so
    // without this, switching mode — or any refresh landing mid-typing —
    // empties a field the person had already filled in.
    credentialEmail: '',
    // The address a sign-up is waiting on confirmation for, or null. Set only
    // when Supabase answered a sign-up without a session, which is the only
    // situation where resending is a thing that exists.
    pendingConfirmationEmail: null,
    // Which account-management form is open, if any: 'password' | 'email'.
    // Kept as one field because they are alternatives, never both at once.
    accountEdit: null,
    error: '',
    // Kept apart from `error`: whether a failed entitlement lookup is worth
    // reporting depends on whether there was anything to look up. See
    // `visibleAccessError`.
    entitlementsError: '',
    notice: '',
  };
  const listeners = new Set();
  let required = null;
  let returnFocus = null;
  let lifecycleRefreshInstalled = false;
  let refreshGeneration = 0;

  const accountButton = el('button', {
    class: 'account-trigger',
    type: 'button',
    // Replaced on the first `renderAccountButton()`, in the language on screen.
    title: inLanguage('Account and access', 'アカウントと利用権'),
    on: { click: () => open() },
  });

  const modal = buildModal();
  ui.append(modal);
  render();

  const api = {
    accountButton,
    async init() {
      // Supabase's client-side recovery flow returns credentials in the hash.
      // Consume it before anything can interpret that fragment as a scene name,
      // persist the temporary recovery session, and scrub the tokens from the
      // visible URL immediately. Which signals count as recovery, and why there
      // are two, is `isPasswordRecovery`.
      // Consumed for every type, not just recovery: a confirmation link is what
      // a brand-new account follows, and leaving its tokens in the fragment put
      // them in the address bar of a scene page — and so into history, into any
      // screenshot, and into the URL somebody copies to share the model.
      const redirect = consumeAuthRedirect();
      // A failed link is not a recovery session. Reset mails are sent with
      // `?account=recovery` in `redirect_to`, so an *expired* one lands on
      // `/?account=recovery#error=otp_expired` — and the query half of
      // `isPasswordRecovery` said yes to it. That opened "choose a new
      // password" with "that link has expired" underneath, and submitting it
      // failed with "your recovery session has expired": the same
      // contradiction this notice table was written to remove, in reverse.
      //
      // Only a request, at this point. Whether it becomes `state.recoveryMode`
      // is settled below, once there is an answer about the session — see
      // `recoveryLapsed`. `authConfigured()` because a deployment with no
      // account backend has no recovery to be in the middle of.
      //
      // A fragment of any other type wins outright, rather than only `error`
      // doing so. Both signals are read here, and the fragment is the newer
      // and the more specific of the two: a stale `?account=recovery` left by
      // an abandoned reset would otherwise make a confirmation link open
      // "choose a new password", with "your email address is confirmed"
      // printed underneath it.
      const recoveryRequested = (!redirect || redirect === 'recovery')
        && authConfigured()
        && isPasswordRecovery({
          consumedRecoveryHash: redirect === 'recovery',
          search: window.location.search,
        });
      // The other types need no dialog of their own: Supabase has already done
      // the thing the link was for, and the session it handed back is stored.
      // What is left is to say so — which matters most for `signup`, where the
      // alternative is arriving on a 3D model with no sign that the address was
      // ever confirmed. Held until after `open()`, which clears `state.notice`
      // on the way in.
      // Looked up rather than chained, because the chain had a catch-all at the
      // end and `recovery` fell into it: a valid password-reset link told the
      // person the link could not be used, directly under the form inviting
      // them to choose a new password. A table makes an unhandled type a
      // missing row rather than the wrong row.
      //
      // `recovery` maps to nothing on purpose — the dialog it opens says what
      // happened in its own words, and a second sentence would only compete.
      const REDIRECT_NOTICE = {
        recovery: '',
        signup: 'メールアドレスを確認しました。 / Your email address is confirmed.',
        email_change: 'メールアドレスを変更しました。 / Your email address has been changed.',
        // Expired, already used, or refused — the commonest ending for an
        // emailed link. Deliberately says nothing about what to do next beyond
        // asking again, because the reason is Supabase's and the remedy
        // depends on which link it was.
        error: 'このリンクは期限切れか、すでに使用済みです。もう一度お試しください。 / That link has expired or was already used — please request a new one.',
      };
      // Not "sign in again": an unadoptable type leaves an existing session
      // untouched, so telling somebody signed in to sign in is an instruction
      // they cannot act on and implies a session was destroyed when it was not.
      const UNHANDLED_REDIRECT = 'このリンクは利用できませんでした。 / That link could not be used.';
      // `Object.hasOwn`, because the key is a `type` taken straight from the
      // URL: plain property access reads inherited ones, so `type=constructor`
      // put `function Object() { [native code] }` on screen as the notice, and
      // `type=__proto__` put `[object Object]`. `??` never fires on those —
      // they are not nullish.
      const redirectNotice = redirect
        ? (Object.hasOwn(REDIRECT_NOTICE, redirect) ? REDIRECT_NOTICE[redirect] : UNHANDLED_REDIRECT)
        : '';

      // `refresh()` waits for the identity, because a fragment carries tokens
      // only and the entitlement lookup and first render both need to know
      // whose session this is. The billing and catalogue reads do not, so they
      // overlap it rather than queue behind a round-trip they never use.
      const identified = redirect ? loadUser() : Promise.resolve();
      await Promise.all([
        identified.then(() => refresh()),
        refreshBillingStatus(),
        refreshPlanCatalog(),
      ]);
      installLifecycleRefresh();
      // Signing out in one tab used to leave every other tab signed in: the
      // in-memory fallback that keeps the session usable where storage is
      // denied cannot tell an empty read from another tab having just cleared
      // it. On a shared machine that made "log out" a promise the product did
      // not keep.
      onExternalSessionChange(() => {
        invalidateSessionState();
        refresh();
      });
      const params = new URLSearchParams(window.location.search);
      if (params.get('billing') === 'success') {
        const plan = params.get('billing_plan');
        const expected = PLAN_GRANTS[plan] ?? [];
        // The other end of the funnel: Stripe has sent the browser back. The
        // entitlement itself is still only granted by the signed webhook below.
        emitAppEvent('conversion:step', { step: 'checkout_complete', plan: planForEntitlement(plan) });

        // Stripe redirects immediately; the signed subscription webhook can
        // arrive a moment later. Re-read server truth for a few seconds instead
        // of telling a paying user their new button is still locked. The URL's
        // plan is only the thing to wait for — it never grants access itself.
        for (let attempt = 0; attempt < 6 && !expected.every((grant) => state.grants.has(grant)); attempt++) {
          if (attempt) await sleep(350 * attempt);
          await refresh({ reconcile: attempt === 0 });
        }
        if (expected.length && !expected.every((grant) => state.grants.has(grant))) {
          state.notice = '決済は完了しました。利用権の反映に少し時間がかかっています。アカウントから再確認できます。';
          notify();
        }

        const clean = new URL(window.location.href);
        clean.searchParams.delete('billing');
        clean.searchParams.delete('billing_plan');
        clean.searchParams.delete('session_id');
        history.replaceState(null, '', `${clean.pathname}${clean.search}${clean.hash}`);
      } else if (params.get('billing') === 'portal') {
        // Portal can change plan, cancellation and payment method. Reconcile
        // directly from Stripe once on return instead of waiting for webhook
        // propagation before showing the current access state.
        const result = await refresh({ reconcile: true });
        state.notice = result.reconciliationSucceeded
          ? '契約情報を最新の状態に更新しました。'
          : '契約情報の最新状態を確認できませんでした。現在の表示は前回確認時の内容です。';
        notify();
        const clean = new URL(window.location.href);
        clean.searchParams.delete('billing');
        history.replaceState(null, '', `${clean.pathname}${clean.search}${clean.hash}`);
      }

      // Recovery needs the dialog to set a password. The other two open it only
      // so the notice above is read rather than written to a panel nobody has
      // asked for — a confirmation that arrives invisibly is not a confirmation.
      // Never a pricing view. Somebody who forgot their password is no more
      // expressing interest in the plans than somebody confirming an address;
      // the first version of this fix exempted only one of them.
      //
      // `recoveryMode` is settled only now, because a form offering to choose
      // a new password is a promise that there is an account to change it on.
      // The query flag outlives the session that minted it — it survives in a
      // bookmark, in a restored tab, and in an hour-old link, and anybody at
      // all can simply visit `/?account=recovery`. Every one of those got the
      // form, and every one of them could only be told afterwards that the
      // recovery session had expired.
      //
      // The session, not `state.user`: `updatePassword` needs the access token
      // and nothing else, and `loadUser` is best-effort by design — one failed
      // `GET /auth/v1/user` would otherwise turn a perfectly good reset link
      // into "no longer valid", with the flag cleared so a reload could not
      // even retry.
      const recoverySession = recoveryRequested ? await getSession() : null;
      state.recoveryMode = Boolean(recoverySession?.access_token);
      const recoveryLapsed = recoveryRequested && !state.recoveryMode;
      // The flag has to go with it, or the next reload asks the same question
      // and gets the same answer.
      //
      // Not only when it lapsed: *any* fragment that outvoted the flag above
      // has to take it out of the query too, or the outvoting lasts exactly
      // one page load. A confirmation link arriving on a stale
      // `?account=recovery` showed the right thing and left the flag in the
      // address bar — so the very next reload had nothing but the flag to
      // read, and put the password form back with a real session behind it,
      // which is the one combination the session gate cannot catch.
      if ((redirect && redirect !== 'recovery') || recoveryLapsed) cleanRecoveryQuery();
      const notice = redirectNotice
        || (recoveryLapsed ? 'パスワード再設定の有効期限が切れています。もう一度お試しください。 / That password reset is no longer valid — please request a new link.' : '');
      if (state.recoveryMode || notice) open(null, { asPricingView: false });
      if (notice) {
        state.notice = notice;
        notify();
      }
      return api;
    },
    has(entitlement) {
      return canAccess(state.grants, entitlement);
    },
    guard(entitlement, action) {
      return (...args) => {
        if (api.has(entitlement)) return action(...args);
        open(entitlement);
        return undefined;
      };
    },
    open,
    close,
    refresh,
    reportError(message) {
      state.error = String(message || 'Paid content could not be loaded.');
      open();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    snapshot,
  };

  return api;

  function snapshot() {
    return Object.freeze({
      user: state.user,
      grants: Object.freeze([...state.grants]),
      subscriptions: Object.freeze([...state.subscriptions]),
      configured: authConfigured(),
      billingConfigured: state.billingConfigured,
      planCatalog: Object.freeze({ ...state.planCatalog }),
      loading: state.loading,
      error: state.error,
      notice: state.notice,
    });
  }

  function notify() {
    render();
    const value = snapshot();
    for (const listener of listeners) listener(value);
  }

  /**
   * What this dialog is, right now.
   *
   * Written out rather than nested inline because it is six cases deep, and
   * the one that was missing is the ordinary one: signed in, on a deployment
   * with no billing. Heading that "Access & billing" told somebody who had
   * just logged in that they had arrived at a payment screen, which is what
   * made signing in feel like being handed a bill. With nothing to sell, this
   * panel is the account — so it says so.
   *
   * @param {{ recovery: boolean, deleting: boolean, credentials: object|null }} state
   */
  function dialogTitle({ recovery, deleting, credentials }) {
    if (recovery) return { en: 'Choose a new password', ja: '新しいパスワードを設定' };
    if (deleting) return { en: 'Delete account', ja: 'アカウントを削除' };
    if (state.accountEdit === 'password') return { en: 'Change password', ja: 'パスワードを変更' };
    if (state.accountEdit === 'email') return { en: 'Change email', ja: 'メールアドレスを変更' };
    // Reaching for a specific locked mode: naming it answers the more useful
    // question, which is why they are being asked for anything at all.
    if (required) {
      return {
        en: ENTITLEMENT_COPY[required]?.label ?? 'Access',
        ja: ENTITLEMENT_COPY[required]?.labelJa ?? '利用権',
      };
    }
    if (credentials?.mode === CREDENTIAL_MODE.SIGN_UP) return { en: 'Create an account', ja: '新規登録' };
    if (credentials) return { en: 'Sign in', ja: 'ログイン' };
    if (state.user && !purchasable()) return { en: 'Account', ja: 'アカウント' };
    return { en: 'Access & billing', ja: '利用権・お支払い' };
  }

  /**
   * A failed entitlement lookup, when it is worth putting on screen.
   *
   * With no billing on this deployment there are no subscriptions to load, so
   * the endpoint answering 500 is the expected outcome rather than news.
   * Reporting it anyway put "Could not load access." directly under the notice
   * explaining that purchases are not enabled yet — two alarming sentences for
   * one ordinary state, on the first screen a person sees after signing in.
   *
   * Where billing *is* configured a failed lookup may mean a paid entitlement
   * is missing, and that is still said.
   */
  function visibleAccessError() {
    return state.billingConfigured ? state.entitlementsError : '';
  }

  /**
   * Whether anything can actually be bought here.
   *
   * Deliberately narrower than `canSell`: a deployment blocked only by an
   * incomplete commercial disclosure still describes its plans and says why
   * the button does not take money, which is `legalReadiness.js`'s decision
   * and stands. This is the case where there is no billing infrastructure at
   * all, so every card would read "Setup required" and no price exists to put
   * on one.
   */
  function purchasable() {
    return authConfigured() && state.billingConfigured;
  }

  function invalidateSessionState() {
    // Any getSession/entitlements response already in flight belongs to the
    // previous browser session and must never restore its paid grants.
    refreshGeneration += 1;
    state.user = null;
    state.grants = grantSet();
    state.subscriptions = [];
    state.loading = false;
    state.deletionMode = false;
    // A pending recovery is over too. Every caller of this means the same
    // thing — signed out here, signed out in another tab, account deleted,
    // recovery cancelled — and there is no session left to set a password on.
    // Leaving the flag set kept "choose a new password" on screen for somebody
    // with no identity, where submitting it could only fail; leaving the query
    // behind put the same form back on the next reload.
    state.recoveryMode = false;
    cleanRecoveryQuery();
    state.credentialMode = CREDENTIAL_MODE.SIGN_IN;
    state.credentialEmail = '';
    state.pendingConfirmationEmail = null;
    state.accountEdit = null;
    state.error = '';
    state.notice = '';
  }

  function installLifecycleRefresh() {
    if (lifecycleRefreshInstalled) return;
    lifecycleRefreshInstalled = true;
    const refreshVisibleAccount = () => {
      if (!state.user || document.visibilityState === 'hidden') return;
      // Not while an account form is open. `refresh()` notifies, `notify()`
      // rebuilds the dialog, and these forms hold their values nowhere but in
      // their own inputs — deliberately, since two of the three are passwords.
      // Without this, alt-tabbing to a password manager and back emptied every
      // field, and so did the five-minute timer. Entitlements can wait the
      // minute it takes to fill in a form; they are re-read on close anyway.
      // `!modal.hidden`, because this is about a form being on screen, not
      // about a flag being set. `recoveryMode` outlives the dialog on purpose —
      // an interrupted recovery is still pending — and without this the first
      // reset link of the page's life switched the refresh off for good.
      if (!modal.hidden && (state.accountEdit || state.deletionMode || state.recoveryMode)) return;
      void refresh();
    };
    window.addEventListener('focus', refreshVisibleAccount);
    document.addEventListener('visibilitychange', refreshVisibleAccount);
    window.setInterval(refreshVisibleAccount, 5 * 60 * 1000);
  }

  async function refreshBillingStatus() {
    try {
      const response = await fetch('/.netlify/functions/billing-status', {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      state.billingConfigured = Boolean(response.ok && data.billingConfigured);
    } catch {
      state.billingConfigured = false;
    }
    notify();
  }

  async function refreshPlanCatalog() {
    try {
      const response = await fetch('/.netlify/functions/plan-catalog', {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      state.planCatalog = response.ok && data.billingConfigured && data.plans ? data.plans : {};
    } catch {
      state.planCatalog = {};
    }
    notify();
  }

  async function refresh({ reconcile = false } = {}) {
    const generation = ++refreshGeneration;
    state.loading = true;
    state.error = '';
    state.entitlementsError = '';
    notify();
    let reconciliationSucceeded = reconcile ? false : null;
    try {
      const session = await getSession();
      if (generation !== refreshGeneration) return { reconciliationSucceeded: false, stale: true };
      state.user = session?.user ?? null;
      state.grants = grantSet();
      state.subscriptions = [];
      if (session) {
        const endpoint = reconcile
          ? '/.netlify/functions/entitlements?reconcile=1'
          : '/.netlify/functions/entitlements';
        // Caught here rather than by the outer handler so that "the paid
        // entitlements could not be read" stays distinguishable from "the
        // session could not be established". Only the first of those is
        // routine on a deployment that sells nothing.
        try {
          const response = await authenticatedFetch(endpoint);
          const data = await response.json().catch(() => ({}));
          if (generation !== refreshGeneration) return { reconciliationSucceeded: false, stale: true };
          if (!response.ok) throw new Error(data.error || 'Could not load access.');
          state.grants = grantSet(data.entitlements ?? [ENTITLEMENT.FREE]);
          state.subscriptions = data.subscriptions ?? [];
          state.user = data.user ?? state.user;
          if (reconcile) reconciliationSucceeded = data.reconciliation === 'succeeded';
          state.entitlementsError = '';
        } catch (error) {
          // Free access is deliberately resilient to a billing outage: the
          // grant is already `free` and no model depends on this call.
          state.entitlementsError = error.message || 'Could not check access.';
          state.grants = grantSet();
        }
      }
    } catch (error) {
      if (generation !== refreshGeneration) return { reconciliationSucceeded: false, stale: true };
      // Free access is deliberately resilient to billing/auth outages.
      state.error = error.message || 'Could not check access.';
      state.grants = grantSet();
    } finally {
      if (generation === refreshGeneration) {
        state.loading = false;
        notify();
      }
    }
    return { reconciliationSucceeded };
  }

  function open(entitlement = null, { asPricingView = true } = {}) {
    required = entitlement;
    state.notice = '';
    // Where the purchase conversation starts. Which capability was being
    // reached for is the interesting part; who reached for it is not recorded.
    //
    // Not every opening is that conversation. The dialog is also how an email
    // confirmation is acknowledged, and counting those would put the whole of
    // registration into the denominator of a funnel measuring interest in the
    // plans — a number that then answers a different question than it claims.
    if (asPricingView) {
      emitAppEvent('conversion:step', { step: 'pricing_view', plan: planForEntitlement(entitlement) });
    }
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : accountButton;
    modal.hidden = false;
    modal.classList.add('is-open');
    document.documentElement.classList.add('has-access-modal');
    render();
    requestAnimationFrame(() => modal.querySelector('input, button:not([disabled])')?.focus());
  }

  function close() {
    const focusTarget = returnFocus;
    returnFocus = null;
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.documentElement.classList.remove('has-access-modal');
    required = null;
    state.notice = '';
    state.deletionMode = false;
    // Reopening the dialog starts the conversation again, on the sign-in side.
    state.credentialMode = CREDENTIAL_MODE.SIGN_IN;
    state.credentialEmail = '';
    state.pendingConfirmationEmail = null;
    state.accountEdit = null;
    render();
    requestAnimationFrame(() => {
      // `focusBack`, because the account button may be inside the site menu,
      // which closed when this dialog opened.
      if (focusTarget?.isConnected) focusBack(focusTarget);
    });
  }

  function buildModal() {
    const backdrop = el('div', { class: 'access-backdrop', 'aria-hidden': 'true' });
    const dialog = el('section', {
      class: 'access-dialog panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'access-title',
    });
    const root = el('div', { class: 'access-modal', hidden: '' }, [backdrop, dialog]);
    backdrop.addEventListener('click', close);
    root.addEventListener('keydown', (event) => {
      // The app has global Space/R/H/C/arrow shortcuts. While account/billing is
      // open, all keyboard intent belongs to the modal and must not leak through
      // to the 3D scene behind it.
      event.stopPropagation();

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...root.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((node) => node instanceof HTMLElement && !node.closest('[hidden]') && node.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    return root;
  }

  function render() {
    renderAccountButton();
    if (modal.hidden) return;
    const dialog = modal.querySelector('.access-dialog');

    // Rebuilding the dialog destroys whatever had focus, and left alone focus
    // falls to <body> — outside the modal. Everything the modal gets from
    // holding focus then stops: its own keydown handler never fires, so Escape
    // no longer closes it and Tab is no longer trapped, and because that
    // handler is also what calls `stopPropagation`, the scene's window-level
    // shortcuts start acting on the model *behind* the open dialog (Space
    // plays it, H hides the UI under it).
    //
    // This belongs here rather than in each handler that calls `notify()`:
    // every rebuild loses focus, not just the ones somebody remembered to
    // patch up afterwards.
    const hadFocus = dialog.contains(document.activeElement);
    const key = hadFocus ? focusKey(document.activeElement) : null;
    dialog.replaceChildren(...dialogContent());
    if (hadFocus) restoreFocus(dialog, key);
  }

  /**
   * A selector for the focused control that still means something once the
   * dialog has been rebuilt from scratch.
   *
   * A named field is its own answer. Otherwise the *last* `access-` class: these
   * controls are written base-then-modifier (`access-text-button
   * access-switch-mode`), so the last one is the specific one — the first would
   * match `access-forgot` just as happily and move focus to the wrong button.
   */
  function focusKey(node) {
    if (!(node instanceof HTMLElement)) return null;
    const escape = globalThis.CSS?.escape ?? ((value) => value);
    const name = node.getAttribute('name');
    if (name) return `[name="${escape(name)}"]`;
    const marker = [...node.classList].filter((token) => token.startsWith('access-')).pop();
    return marker ? `.${escape(marker)}` : null;
  }

  /**
   * Put focus back where it was — or, if that control is gone or now disabled,
   * anywhere still inside the dialog. Landing on the close button is a poor
   * result; landing on `<body>` is a broken one.
   */
  function restoreFocus(dialog, key) {
    const target =
      (key ? dialog.querySelector(`${key}:not([disabled])`) : null) ??
      dialog.querySelector('input:not([disabled]), button:not([disabled]), a[href]');
    target?.focus({ preventScroll: true });
  }

  function paidAccessLabel() {
    const patient = state.grants.has(ENTITLEMENT.PATIENT);
    const education = state.grants.has(ENTITLEMENT.EDUCATION);
    if (patient && education) return { en: 'Complete', ja: '両方' };
    if (patient) return { en: 'Patient', ja: '患者説明' };
    if (education) return { en: 'Education', ja: '医学教育' };
    return null;
  }

  function renderAccountButton() {
    const access = paidAccessLabel();
    const paid = Boolean(access);
    const en = state.user ? access?.en ?? 'Account' : 'Sign in';
    const ja = state.user ? access?.ja ?? 'アカウント' : 'ログイン';
    accountButton.replaceChildren(
      el('span', { class: 'account-icon', 'aria-hidden': 'true', text: state.user ? '●' : '○' }),
      el('span', { class: 'account-label lang-en', text: en }),
      el('span', { class: 'account-label lang-ja', text: ja })
    );
    accountButton.classList.toggle('has-paid-access', paid);
    // Both languages are in the DOM for the *visible* label, and CSS hides one.
    // An attribute cannot hold two, so it holds the one on screen. Without this
    // the Japanese interface announced its login button as "Sign in" to a
    // screen reader and showed "Sign in" in the tooltip, under a button reading
    // ログイン.
    const label = state.user
      ? inLanguage(`Account and access — ${access?.en ?? 'free'}`, `アカウントと利用権 — ${access?.ja ?? '無料'}`)
      : inLanguage('Sign in', 'ログイン');
    accountButton.setAttribute('aria-label', label);
    accountButton.title = label;
  }

  // `aria-label` and `title` hold one language, so they are repainted when the
  // interface flips rather than asking each of the seven surfaces that write
  // `#ui[data-lang]` to remember one more call.
  onLanguageChange(() => renderAccountButton());

  function dialogContent() {
    const recovery = state.recoveryMode;
    const closeButton = el('button', {
      class: 'access-close',
      type: 'button',
      // One language, the one on screen: a screen reader announcing "Close" in
      // a Japanese interface is the same defect as an English label in it.
      'aria-label': inLanguage('Close', '閉じる'),
      text: '×',
      on: { click: close },
    });
    const deleting = state.deletionMode;
    const kickerEn = recovery
      ? 'Password recovery'
      : deleting
        ? 'Permanent account deletion'
        : required
          ? 'Unlock this mode'
          : 'Medical 3D Lab account';
    const kickerJa = recovery
      ? 'パスワード再設定'
      : deleting
        ? 'アカウントの完全削除'
        : required
          ? 'このモードを利用する'
          : 'Medical 3D Lab アカウント';
    // Signed out with no particular mode being reached for, the dialog *is* the
    // credential form, so its heading says which of the two is on screen —
    // "Access & billing" over a password field does not tell anybody where they
    // are. When `required` is set the entitlement name stays: that answers the
    // more useful question, which is why they are being asked at all.
    // `authConfigured()` first: the early return below replaces the whole body
    // with "account access is not configured on this deployment", and a dialog
    // headed "Sign in" over that text describes a form that is not there.
    const credentials = authConfigured() && !state.user && !recovery && !deleting && !required
      ? credentialModePolicy(state.credentialMode)
      : null;
    const { en: titleEn, ja: titleJa } = dialogTitle({ recovery, deleting, credentials });
    const head = el('header', { class: 'access-head' }, [
      el('div', {}, [
        el('div', { class: 'access-kicker lang-en', text: kickerEn }),
        el('div', { class: 'access-kicker lang-ja', text: kickerJa }),
        el('h2', { id: 'access-title', class: 'access-title lang-en', text: titleEn }),
        el('h2', { class: 'access-title lang-ja', text: titleJa }),
      ]),
      closeButton,
    ]);

    if (!authConfigured()) {
      // Visitor-facing, not implementation status: this used to read "the
      // paywall UI is installed, but account access has not been configured
      // on this deployment yet" — true, and none of a reader's business. What
      // they need is only what changes for them: no sign-up yet, and the
      // published models are not behind it.
      return [
        head,
        el('p', { class: 'access-copy lang-en', text: 'Accounts are not available on this site yet, so neither sign-in nor sign-up works here. Published models remain available without signing in.' }),
        el('p', { class: 'access-copy lang-ja', text: 'このサイトではまだアカウント機能（ログイン・登録）を提供していません。公開中のモデルはログインなしでご覧いただけます。' }),
      ];
    }

    if (recovery) return [head, passwordRecoveryForm()];
    if (state.deletionMode) return [head, accountDeletionForm()];
    if (state.user && state.accountEdit === 'password') return [head, passwordChangeForm()];
    if (state.user && state.accountEdit === 'email') return [head, emailChangeForm()];
    if (!state.user) return [head, authForm()];

    return [
      head,
      el('div', { class: 'access-user' }, [
        el('span', { class: 'access-user-email', text: state.user.email ?? 'Signed in' }),
        el('button', {
          class: 'access-text-button',
          type: 'button',
          text: 'Sign out / ログアウト',
          on: {
            click: () => {
              signOut();
              invalidateSessionState();
              notify();
            },
          },
        }),
      ]),
      currentAccess(),
      subscriptionStatusCard(),
      // One notice, two reasons: billing may not be configured, or the seller
      // may not yet have published the disclosure it is required to publish.
      // Saying which one it is beats a single vague sentence for both.
      billingNotice()
        ? el('div', { class: 'access-billing-unavailable' }, [
            el('p', { class: 'access-copy lang-en', text: billingNotice().en }),
            el('p', { class: 'access-copy lang-ja', text: billingNotice().ja }),
            // New tab, for the same reason the consent links are: following a
            // hash link reloads the app, which closes this dialog. Reading why
            // purchases are unavailable should not cost somebody their place
            // in their own account panel. Left same-tab when the consent links
            // were changed, which was an oversight rather than a decision.
            el('a', { class: 'access-legal-link', href: '#/commerce', target: '_blank', rel: 'noopener' }, [
              el('span', { class: 'lang-en', text: 'Commercial disclosure →' }),
              el('span', { class: 'lang-ja', text: '特定商取引法に基づく表記 →' }),
            ]),
          ])
        : null,
      // Three cards all reading "Setup required" are not a price list, and on
      // a deployment that sells nothing they are the bulk of what somebody
      // sees the moment they finish signing in. The sentence above already
      // says purchases are not enabled yet; the cards only repeat it three
      // times in a form that looks like a shop.
      purchasable() ? planGrid() : null,
      hasActiveSubscription() && state.billingConfigured
        ? el('button', {
            class: 'access-manage',
            type: 'button',
            text: 'Change plan / manage billing　プラン変更・契約管理',
            on: { click: openPortal },
          })
        : null,
      el('div', { class: 'access-account-actions' }, [
        el('button', {
          class: 'access-text-button access-change-password',
          type: 'button',
          text: 'Change password / パスワードを変更',
          on: { click: () => openAccountEdit('password') },
        }),
        el('button', {
          class: 'access-text-button access-change-email',
          type: 'button',
          text: 'Change email / メールアドレスを変更',
          on: { click: () => openAccountEdit('email') },
        }),
      ]),
      el('button', {
        class: 'access-delete-account',
        type: 'button',
        disabled: state.loading ? '' : null,
        text: 'Delete account / アカウント削除',
        on: {
          click: () => {
            state.deletionMode = true;
            state.notice = '';
            state.error = '';
            notify();
          },
        },
      }),
      state.notice ? el('p', { class: 'access-form-message', text: state.notice }) : null,
      (state.error || visibleAccessError())
        ? el('p', { class: 'access-error', text: state.error || visibleAccessError() })
        : null,
    ].filter(Boolean);
  }

  /**
   * Refuse a field without re-rendering.
   *
   * Reporting these through `state.notice` looked right and was not: `notify()`
   * rebuilds the dialog, so saying "the passwords do not match" emptied every
   * field the person had just filled in, including the two that were fine.
   * They then had to retype all of it to find out whether they had fixed the
   * one thing that was wrong.
   *
   * The browser already has a way to say this in place. Using it also keeps
   * passwords out of `state` — nothing here is worth remembering across a
   * render, and a plaintext password is the last thing that should be.
   */
  function refuseField(field, message, group = [field]) {
    field.setCustomValidity?.(message);
    field.reportValidity?.();
    // Cleared by editing *any* field involved, not only the one flagged: a
    // mismatch is as easily fixed by correcting the first password as the
    // second, and clearing only on the flagged field left it permanently
    // invalid — native validation then blocked the submit and re-showed "they
    // do not match" on two fields that now matched.
    for (const member of group) {
      member.addEventListener('input', () => field.setCustomValidity?.(''));
    }
  }

  function openAccountEdit(mode) {
    state.accountEdit = mode;
    state.notice = '';
    state.error = '';
    notify();
  }

  function closeAccountEdit({ notice = '' } = {}) {
    state.accountEdit = null;
    state.notice = notice;
    state.error = '';
    notify();
  }

  /** Cancel, shared by both account-management forms. */
  function cancelEditButton() {
    return el('button', {
      class: 'access-secondary',
      type: 'button',
      disabled: state.loading ? '' : null,
      text: 'Cancel / 戻る',
      on: { click: () => closeAccountEdit() },
    });
  }

  /**
   * Change the password of a signed-in account.
   *
   * Reachable only from here. Before this the only way to change a password
   * was to sign out and use the recovery mail, which is a strange thing to ask
   * of somebody who is signed in and knows their password.
   *
   * The current one is required: `changePassword` proves it before setting the
   * new one, so a session left open cannot be used to lock its owner out.
   */
  function passwordChangeForm() {
    const current = el('input', {
      class: 'access-input', type: 'password', name: 'current-password',
      autocomplete: 'current-password', placeholder: 'Current password',
      'aria-label': 'Current password / 現在のパスワード', required: '',
    });
    const next = el('input', {
      class: 'access-input', type: 'password', name: 'new-password',
      autocomplete: 'new-password', placeholder: `New password (${MIN_PASSWORD_LENGTH}+ characters)`,
      'aria-label': 'New password / 新しいパスワード',
      minlength: String(MIN_PASSWORD_LENGTH), required: '',
    });
    const confirm = el('input', {
      class: 'access-input', type: 'password', name: 'confirm-password',
      autocomplete: 'new-password', placeholder: 'Confirm new password',
      'aria-label': 'Confirm new password / 新しいパスワード（確認）',
      minlength: String(MIN_PASSWORD_LENGTH), required: '',
    });

    const submit = async (event) => {
      event?.preventDefault?.();
      if (state.loading) return;
      state.notice = '';
      state.error = '';
      if (next.value.length < MIN_PASSWORD_LENGTH) {
        refuseField(next, `${MIN_PASSWORD_LENGTH}文字以上にしてください。`);
        return;
      }
      if (next.value !== confirm.value) {
        refuseField(confirm, '入力したパスワードが一致しません。', [next, confirm]);
        return;
      }
      try {
        state.loading = true;
        notify();
        await changePassword(state.user?.email, current.value, next.value);
        await refresh();
        closeAccountEdit({ notice: 'Password changed. / パスワードを変更しました。' });
        return;
      } catch (error) {
        state.error = error.message || 'パスワードを変更できませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    return el('form', {
      class: 'access-auth access-change-form',
      method: 'post',
      'aria-label': 'Change password / パスワードを変更',
      on: { submit },
    }, [
      el('p', { class: 'access-copy lang-en', text: 'Enter your current password, then choose a new one.' }),
      el('p', { class: 'access-copy lang-ja', text: '現在のパスワードを入力してから、新しいパスワードを設定してください。' }),
      current,
      next,
      confirm,
      el('div', { class: 'access-auth-actions' }, [
        cancelEditButton(),
        el('button', {
          class: 'access-primary', type: 'submit',
          disabled: state.loading ? '' : null,
          text: state.loading ? 'Saving… / 変更中…' : 'Change password / 変更する',
        }),
      ]),
      state.notice ? el('p', { class: 'access-form-message', role: 'status', text: state.notice }) : null,
      state.error ? el('p', { class: 'access-error', role: 'alert', text: state.error }) : null,
    ].filter(Boolean));
  }

  /**
   * Move the account to a different address.
   *
   * Nothing has changed when this succeeds — Supabase mails the new address
   * and the move completes when that link is opened. So the wording is "check
   * your mail", never "done": telling somebody their address had changed when
   * it had not is how an account becomes unreachable.
   */
  function emailChangeForm() {
    const current = el('input', {
      class: 'access-input', type: 'password', name: 'current-password',
      autocomplete: 'current-password', placeholder: 'Current password',
      'aria-label': 'Current password / 現在のパスワード', required: '',
    });
    const address = el('input', {
      class: 'access-input', type: 'email', name: 'new-email',
      autocomplete: 'email', autocapitalize: 'none', spellcheck: 'false',
      placeholder: 'new@example.com',
      'aria-label': 'New email address / 新しいメールアドレス', required: '',
    });

    const submit = async (event) => {
      event?.preventDefault?.();
      if (state.loading) return;
      state.notice = '';
      state.error = '';
      const wanted = String(address.value ?? '').trim();
      // In place, for the same reason as the password forms: routing these
      // through `state.notice` rebuilds the dialog and erases the address that
      // was just typed, which is the regression `refuseField` exists to stop.
      if (!wanted) {
        refuseField(address, '新しいメールアドレスを入力してください。');
        return;
      }
      if (wanted === state.user?.email) {
        refuseField(address, 'すでにそのアドレスです。');
        return;
      }
      try {
        state.loading = true;
        notify();
        await changeEmail(state.user?.email, current.value, wanted, confirmationRedirect());
        closeAccountEdit({
          notice: `${wanted} に確認メールを送信しました。リンクを開くと変更が完了します。 / Confirmation sent — the change completes when you open the link.`,
        });
        return;
      } catch (error) {
        state.error = error.message || 'メールアドレスを変更できませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    return el('form', {
      class: 'access-auth access-change-form',
      method: 'post',
      'aria-label': 'Change email / メールアドレスを変更',
      on: { submit },
    }, [
      el('p', { class: 'access-copy lang-en', text: `Signed in as ${state.user?.email ?? ''}. The change takes effect when you open the link sent to the new address.` }),
      el('p', { class: 'access-copy lang-ja', text: `現在のアドレスは ${state.user?.email ?? ''} です。新しいアドレスに届くリンクを開いた時点で変更が完了します。` }),
      current,
      address,
      el('div', { class: 'access-auth-actions' }, [
        cancelEditButton(),
        el('button', {
          class: 'access-primary', type: 'submit',
          disabled: state.loading ? '' : null,
          text: state.loading ? 'Sending… / 送信中…' : 'Send confirmation / 確認メールを送信',
        }),
      ]),
      state.notice ? el('p', { class: 'access-form-message', role: 'status', text: state.notice }) : null,
      state.error ? el('p', { class: 'access-error', role: 'alert', text: state.error }) : null,
    ].filter(Boolean));
  }

  function accountDeletionForm() {
    const password = el('input', {
      class: 'access-input',
      type: 'password',
      autocomplete: 'current-password',
      placeholder: 'Current password / 現在のパスワード',
      required: '',
    });

    const deleteAccount = async (event) => {
      event?.preventDefault();
      state.notice = '';
      state.error = '';
      const currentPassword = password.value;
      if (!currentPassword) {
        state.notice = '現在のパスワードを入力してください。';
        notify();
        return;
      }

      try {
        state.loading = true;
        notify();
        const response = await authenticatedFetch('/.netlify/functions/delete-account', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: currentPassword }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.deleted !== true) {
          throw new Error(data.error || 'Account could not be deleted safely.');
        }

        // Clear browser credentials and invalidate every in-flight entitlement
        // read after the server has confirmed Stripe closure and Auth deletion.
        signOut();
        invalidateSessionState();
        state.notice = 'Account and subscription deleted. / アカウントと契約を削除しました。';
      } catch (error) {
        state.error = error.message || 'アカウントを安全に削除できませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    return el('form', {
      class: 'access-auth access-delete-confirmation',
      on: { submit: deleteAccount },
    }, [
      el('p', {
        class: 'access-copy lang-en',
        text: 'This permanently cancels the subscription, deletes the account and removes saved progress. Enter your current password to continue.',
      }),
      el('p', {
        class: 'access-copy lang-ja',
        text: '契約を解約し、アカウントと保存済みの進捗を完全に削除します。続行するには現在のパスワードを入力してください。',
      }),
      password,
      el('div', { class: 'access-auth-actions' }, [
        el('button', {
          class: 'access-secondary',
          type: 'button',
          disabled: state.loading ? '' : null,
          text: 'Cancel / 戻る',
          on: {
            click: () => {
              state.deletionMode = false;
              state.notice = '';
              state.error = '';
              notify();
            },
          },
        }),
        el('button', {
          class: 'access-danger',
          type: 'submit',
          disabled: state.loading ? '' : null,
          text: state.loading ? 'Deleting… / 削除中…' : 'Delete permanently / 完全に削除',
        }),
      ]),
      state.notice ? el('p', { class: 'access-form-message', text: state.notice }) : null,
      state.error ? el('p', { class: 'access-error', text: state.error }) : null,
    ].filter(Boolean));
  }

  /**
   * Sign in, or create an account.
   *
   * The form itself lives in `credentialForm.js` and is a pure view; this is
   * the half that talks to Supabase and owns the state. What the two modes
   * differ in — password `autocomplete`, the verb in a failure message,
   * whether `Forgot password?` applies — is `credentialModePolicy`.
   */
  function authForm() {
    const submitCredentials = async ({ mode, email, password }) => {
      const policy = credentialModePolicy(mode);
      state.notice = '';
      state.error = '';
      state.credentialEmail = email;

      // A browser enforces `required` / `minlength` before it will fire submit,
      // so this is the backstop rather than the first line — but it is the one
      // that answers in both languages, and the one that still holds if the
      // form is ever submitted programmatically.
      if (!email || password.length < MIN_PASSWORD_LENGTH) {
        state.notice = policy.incomplete;
        notify();
        return;
      }

      try {
        state.loading = true;
        notify();
        if (mode === CREDENTIAL_MODE.SIGN_UP) {
          const result = await signUp(email, password);
          if (!result.session) {
            // Confirmation is on: there is no session to refresh yet. The next
            // thing this person does, after the mail, is sign in — so leave the
            // dialog on that side rather than on the form they have finished
            // with, and keep the address they just typed.
            state.notice = '確認メールを送信しました。確認後にログインしてください。';
            state.credentialMode = CREDENTIAL_MODE.SIGN_IN;
            // Remembering the address is what makes resending offerable at all,
            // and it is the same address the form is already showing.
            state.pendingConfirmationEmail = email;
            return;
          }
        } else {
          await signIn(email, password);
        }
        state.credentialEmail = '';
        state.pendingConfirmationEmail = null;
        await refresh();
      } catch (error) {
        // Refused because the address was never confirmed. The way out is the
        // confirmation mail, not another attempt at the password — so say that
        // in both languages rather than passing Supabase's English through,
        // and put the resend back within reach. Until this, the resend existed
        // only in the same session as the sign-up: somebody who closed the tab
        // and came back to a mail that never arrived had no route at all,
        // which is exactly the situation it was built for.
        if (isUnconfirmedEmail(error)) {
          state.error = 'メールアドレスの確認が完了していません。確認メールのリンクを開いてください。 / This address has not been confirmed yet — open the link in the confirmation email.';
          state.pendingConfirmationEmail = email;
        } else {
          state.error = error.message || policy.failure;
        }
      } finally {
        state.loading = false;
        notify();
      }
    };

    const forgotPassword = async (address) => {
      state.notice = '';
      state.error = '';
      state.credentialEmail = address;
      if (!address) {
        state.notice = 'パスワード再設定メールを送るメールアドレスを入力してください。';
        notify();
        // `notify()` has just rebuilt the dialog, so the input to focus is the
        // new one, not the one the click came from.
        modal.querySelector?.('.access-credentials input[name="email"]')?.focus();
        return;
      }
      try {
        state.loading = true;
        notify();
        const redirect = new URL(confirmationRedirect());
        // `?account=recovery` is what a *reload* mid-recovery has to go on: the
        // tokens arrive in the fragment and are scrubbed the moment they are
        // read. `isPasswordRecovery` is the other half of that pair.
        redirect.searchParams.set('account', 'recovery');
        await requestPasswordReset(address, redirect.href);
        // Deliberately neutral: Supabase does not disclose whether an account
        // exists for the address, which prevents account enumeration.
        state.notice = 'If an account exists, a password-reset email has been sent. / アカウントが存在する場合、再設定メールを送信しました。';
      } catch (error) {
        state.error = error.message || 'パスワード再設定メールを送信できませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    const resendConfirmation = async (address) => {
      state.notice = '';
      state.error = '';
      try {
        state.loading = true;
        notify();
        await resendSignUpConfirmation(address, confirmationRedirect());
        state.notice = '確認メールを再送しました。/ Confirmation email sent again.';
      } catch (error) {
        // Supabase rate-limits this; "too many requests" is the message that
        // actually helps, so it is shown rather than flattened into a generic.
        state.error = error.message || '確認メールを再送できませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    return credentialForm({
      mode: state.credentialMode,
      email: state.credentialEmail,
      pendingConfirmation: state.pendingConfirmationEmail,
      onResendConfirmation: resendConfirmation,
      loading: state.loading,
      notice: state.notice,
      error: state.error,
      onSubmit: submitCredentials,
      onSwitchMode: (mode) => {
        state.credentialMode = mode;
        state.notice = '';
        state.error = '';
        notify();
      },
      onForgotPassword: forgotPassword,
      // Recorded without re-rendering: a render on every keystroke would
      // replace the input the person is typing into.
      onEmailInput: (value) => {
        state.credentialEmail = value;
      },
    });
  }

  function passwordRecoveryForm() {
    const password = el('input', {
      class: 'access-input',
      type: 'password',
      autocomplete: 'new-password',
      placeholder: `New password (${MIN_PASSWORD_LENGTH}+ characters)`,
      minlength: String(MIN_PASSWORD_LENGTH),
      required: '',
    });
    const confirm = el('input', {
      class: 'access-input',
      type: 'password',
      autocomplete: 'new-password',
      placeholder: 'Confirm new password',
      minlength: String(MIN_PASSWORD_LENGTH),
      required: '',
    });

    const finishRecovery = async (event) => {
      event?.preventDefault?.();
      if (state.loading) return;
      state.notice = '';
      state.error = '';
      // Refused in place rather than through `state.notice`: a rebuild here
      // emptied both fields, so being told they did not match cost the person
      // everything they had typed.
      if (password.value.length < MIN_PASSWORD_LENGTH) {
        refuseField(password, `${MIN_PASSWORD_LENGTH}文字以上にしてください。`);
        return;
      }
      if (password.value !== confirm.value) {
        refuseField(confirm, '入力したパスワードが一致しません。', [password, confirm]);
        return;
      }

      try {
        state.loading = true;
        notify();
        await updatePassword(password.value);
        state.recoveryMode = false;
        cleanRecoveryQuery();
        await refresh();
        state.notice = 'Password updated. / パスワードを更新しました。';
      } catch (error) {
        state.error = error.message || 'パスワードを更新できませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    const cancelRecovery = () => {
      signOut();
      // Clearing the flag and the query is `invalidateSessionState`'s job now,
      // so that the three other ways a session ends do it as well.
      invalidateSessionState();
      notify();
    };

    // A real `<form>`, for the same reason as the credential form: this is a
    // password field, and Enter is how a password field gets submitted.
    return el('form', {
      class: 'access-auth access-recovery',
      method: 'post',
      'aria-label': 'Choose a new password / 新しいパスワードを設定',
      on: { submit: finishRecovery },
    }, [
      el('p', { class: 'access-copy lang-en', text: 'The recovery link has signed you in temporarily. Choose a new password to finish recovering this account.' }),
      el('p', { class: 'access-copy lang-ja', text: '再設定リンクによる一時的な認証が完了しています。新しいパスワードを設定してください。' }),
      password,
      confirm,
      el('div', { class: 'access-auth-actions' }, [
        el('button', {
          class: 'access-primary',
          type: 'submit',
          disabled: state.loading ? '' : null,
          text: 'Update password / パスワードを更新',
        }),
        el('button', {
          class: 'access-secondary',
          type: 'button',
          disabled: state.loading ? '' : null,
          text: 'Cancel / キャンセル',
          on: { click: cancelRecovery },
        }),
      ]),
      state.notice ? el('p', { class: 'access-form-message', text: state.notice }) : null,
      state.error ? el('p', { class: 'access-error', text: state.error }) : null,
    ].filter(Boolean));
  }

  /** Where Supabase should send the browser back to after an emailed link. */
  function confirmationRedirect() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function cleanRecoveryQuery() {
    const clean = new URL(window.location.href);
    // Called from every path that ends a session, most of which never had the
    // flag. Rewriting the URL anyway would drop `history.state` on each of
    // them for no reason.
    if (!clean.searchParams.has('account')) return;
    clean.searchParams.delete('account');
    history.replaceState(null, '', `${clean.pathname}${clean.search}${clean.hash}`);
  }

  function currentAccess() {
    const rows = [ENTITLEMENT.PATIENT, ENTITLEMENT.EDUCATION].map((entitlement) => {
      const unlocked = state.grants.has(entitlement);
      const copy = ENTITLEMENT_COPY[entitlement];
      return el('div', { class: `access-grant${unlocked ? ' is-unlocked' : ''}` }, [
        el('span', { class: 'access-grant-mark', 'aria-hidden': 'true', text: unlocked ? '✓' : '🔒' }),
        el('span', { class: 'access-grant-name lang-en', text: copy.label }),
        el('span', { class: 'access-grant-name lang-ja', text: copy.labelJa }),
      ]);
    });
    return el('div', { class: 'access-current' }, rows);
  }

  function subscriptionStatusCard() {
    const view = subscriptionPresentation(state.subscriptions);
    if (!view) return null;

    return el('section', {
      class: `access-subscription is-${view.status.tone}`,
      'aria-label': 'Current subscription status',
    }, [
      el('div', { class: 'access-subscription-main' }, [
        el('div', { class: 'access-subscription-eyebrow' }, [
          el('span', { class: 'lang-en', text: 'Current plan' }),
          el('span', { class: 'lang-ja', text: '現在のプラン' }),
        ]),
        el('div', { class: 'access-subscription-plan' }, [
          el('span', { class: 'lang-en', text: view.plan.en }),
          el('span', { class: 'lang-ja', text: view.plan.ja }),
        ]),
      ]),
      el('div', { class: 'access-subscription-state' }, [
        el('div', { class: 'access-subscription-status' }, [
          el('span', { class: 'access-subscription-dot', 'aria-hidden': 'true' }),
          el('span', { class: 'lang-en', text: view.status.en }),
          el('span', { class: 'lang-ja', text: view.status.ja }),
        ]),
        view.detail
          ? el('div', { class: 'access-subscription-detail' }, [
              el('span', { class: 'lang-en', text: view.detail.en }),
              el('span', { class: 'lang-ja', text: view.detail.ja }),
            ])
          : null,
      ]),
    ].filter(Boolean));
  }

  function hasActiveSubscription() {
    return state.subscriptions.some((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));
  }

  function planGrid() {
    return el('div', { class: 'access-plans' }, [
      planCard(PLAN.PATIENT, ENTITLEMENT.PATIENT, 'Patient explanation', '患者説明用', 'For consultation-room explanation and patient-facing guided views.', '診察室などで患者さんへ病態を説明するためのガイド表示。'),
      planCard(PLAN.EDUCATION, ENTITLEMENT.EDUCATION, 'Medical education', '医学教育用', 'Challenges, prediction and structured teaching modules.', '予測・チャレンジ・体系的な学習モジュール。'),
      planCard(PLAN.COMPLETE, null, 'Complete', '両方', 'Patient explanation + medical education in one subscription.', '患者説明用と医学教育用をまとめて利用。'),
    ]);
  }

  function planCard(plan, entitlement, title, titleJa, description, descriptionJa) {
    const unlocked = entitlement
      ? state.grants.has(entitlement)
      : state.grants.has(ENTITLEMENT.PATIENT) && state.grants.has(ENTITLEMENT.EDUCATION);
    const highlighted = required && (entitlement === required || plan === PLAN.COMPLETE);
    const price = pricePresentation(state.planCatalog[plan]);
    // Billing being configured is not sufficient: a seller must have published
    // its identity and terms before it may take money. See legalReadiness.js.
    const configured =
      authConfigured() && canSell({ billingConfigured: state.billingConfigured }) && Boolean(price);
    const existing = hasActiveSubscription();
    const disabled = unlocked || state.loading || !configured;
    const cta = !authConfigured() || !state.billingConfigured
      ? 'Setup required / 設定待ち'
      : !price
        ? 'Price unavailable / 価格確認待ち'
        : unlocked
          ? 'Unlocked / 利用中'
          : existing
            ? 'Change in Billing Portal / 契約プランを変更'
            : state.user
              ? 'Continue to checkout / 購入へ'
              : 'Sign in to purchase / ログインして購入';

    return el('article', { class: `access-plan${highlighted ? ' is-highlighted' : ''}` }, [
      el('div', { class: 'access-plan-title lang-en', text: title }),
      el('div', { class: 'access-plan-title lang-ja', text: titleJa }),
      price
        ? el('div', { class: 'access-plan-price' }, [
            el('span', { class: 'access-plan-amount', text: price.amount }),
            el('span', { class: 'access-plan-interval lang-en', text: price.interval.en }),
            el('span', { class: 'access-plan-interval lang-ja', text: price.interval.ja }),
          ])
        : el('div', { class: 'access-plan-price is-unavailable' }, [
            el('span', { class: 'lang-en', text: 'Price not available' }),
            el('span', { class: 'lang-ja', text: '価格未設定' }),
          ]),
      el('p', { class: 'access-plan-copy lang-en', text: description }),
      el('p', { class: 'access-plan-copy lang-ja', text: descriptionJa }),
      el('button', {
        class: 'access-plan-cta',
        type: 'button',
        disabled: disabled ? '' : null,
        text: cta,
        on: {
          click: () => {
            if (!state.user) return modal.querySelector('.access-input')?.focus();
            return existing ? openPortal() : checkout(plan);
          },
        },
      }),
    ]);
  }

  /**
   * Why paid plans cannot be bought here, or null when they can.
   *
   * A function declaration, not a `const` arrow, and that is load-bearing:
   * everything in this tail sits after `return api`, so only hoisted
   * declarations ever come into existence. As a `const` this stayed in the
   * temporal dead zone for the life of the manager, and `dialogContent` calls
   * it on the signed-in branch — so opening the account dialog while signed in
   * threw `ReferenceError: billingNotice is not defined` and rendered nothing.
   */
  function billingNotice() {
    return saleBlockedNotice({ billingConfigured: state.billingConfigured });
  }

  async function checkout(plan) {
    const blocked = saleBlockedNotice({ billingConfigured: state.billingConfigured });
    if (blocked || !pricePresentation(state.planCatalog[plan])) {
      state.error = blocked?.en ?? 'Paid checkout is not ready on this deployment yet.';
      notify();
      return;
    }
    try {
      state.loading = true;
      state.error = '';
      state.notice = '';
      notify();
      const response = await authenticatedFetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, returnHash: window.location.hash || '#/' }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 && data.usePortal) {
        state.loading = false;
        notify();
        return openPortal();
      }
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.');
      emitAppEvent('conversion:step', { step: 'checkout_start', plan: planForEntitlement(plan) });
      window.location.assign(data.url);
    } catch (error) {
      emitAppEvent('conversion:step', { step: 'cancelled', plan: planForEntitlement(plan) });
      state.error = error.message || 'Checkout could not be started.';
      state.loading = false;
      notify();
    }
  }

  async function openPortal() {
    if (!state.billingConfigured) {
      state.error = 'Billing portal is not enabled on this deployment yet.';
      notify();
      return;
    }
    try {
      state.loading = true;
      state.error = '';
      state.notice = '';
      notify();
      const response = await authenticatedFetch('/.netlify/functions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnHash: window.location.hash || '#/' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Billing portal could not be opened.');
      window.location.assign(data.url);
    } catch (error) {
      state.error = error.message || 'Billing portal could not be opened.';
      state.loading = false;
      notify();
    }
  }
}

/**
 * The plan name a conversion metric may carry.
 *
 * Entitlements and plans are close but not identical, and the metric
 * vocabulary only accepts the three plan names. Anything it cannot map is
 * reported as no plan at all rather than guessed at.
 *
 * @param {string|null} value an entitlement id or a plan id
 */
function planForEntitlement(value) {
  return ['patient', 'education', 'complete'].includes(value) ? value : null;
}
