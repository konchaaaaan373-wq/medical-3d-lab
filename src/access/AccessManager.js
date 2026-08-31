import { el } from '../utils/dom.js';
import {
  authConfigured,
  authenticatedFetch,
  getSession,
  signIn,
  signOut,
  signUp,
} from './auth.js';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  canAccess,
  ENTITLEMENT,
  ENTITLEMENT_COPY,
  PLAN,
  PLAN_GRANTS,
} from './policy.js';

const FREE = new Set([ENTITLEMENT.FREE]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Account + entitlement state for the browser.
 *
 * Failing billing infrastructure must never make the free medical model fail to
 * load. Every network call therefore degrades to the implicit `free` grant.
 */
export function createAccessManager({ ui }) {
  const state = {
    user: null,
    grants: new Set(FREE),
    subscriptions: [],
    billingConfigured: false,
    loading: false,
    error: '',
    notice: '',
  };
  const listeners = new Set();
  let required = null;
  let returnFocus = null;

  const accountButton = el('button', {
    class: 'account-trigger',
    type: 'button',
    title: 'Account and access',
    on: { click: () => open() },
  });

  const modal = buildModal();
  ui.append(modal);
  render();

  const api = {
    accountButton,
    async init() {
      await Promise.all([refresh(), refreshBillingStatus()]);
      const params = new URLSearchParams(window.location.search);
      if (params.get('billing') === 'success') {
        const plan = params.get('billing_plan');
        const expected = PLAN_GRANTS[plan] ?? [];

        // Stripe redirects immediately; the signed subscription webhook can
        // arrive a moment later. Re-read server truth for a few seconds instead
        // of telling a paying user their new button is still locked. The URL's
        // plan is only the thing to wait for — it never grants access itself.
        for (let attempt = 0; attempt < 6 && !expected.every((grant) => state.grants.has(grant)); attempt++) {
          if (attempt) await sleep(350 * attempt);
          await refresh();
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

  async function refresh() {
    state.loading = true;
    state.error = '';
    notify();
    try {
      const session = await getSession();
      state.user = session?.user ?? null;
      state.grants = new Set(FREE);
      state.subscriptions = [];
      if (session) {
        const response = await authenticatedFetch('/.netlify/functions/entitlements');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load access.');
        state.grants = new Set(data.entitlements ?? [ENTITLEMENT.FREE]);
        state.subscriptions = data.subscriptions ?? [];
        state.user = data.user ?? state.user;
      }
    } catch (error) {
      // Free access is deliberately resilient to billing/auth outages.
      state.error = error.message || 'Could not check access.';
      state.grants = new Set(FREE);
    } finally {
      state.loading = false;
      notify();
    }
  }

  function open(entitlement = null) {
    required = entitlement;
    state.notice = '';
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
    render();
    requestAnimationFrame(() => {
      if (focusTarget?.isConnected) focusTarget.focus();
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
    dialog.replaceChildren(...dialogContent());
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
    accountButton.setAttribute('aria-label', state.user ? `Account and access — ${access?.en ?? 'free'}` : 'Sign in');
    accountButton.title = state.user ? `Account and access — ${access?.en ?? 'Free'}` : 'Sign in';
  }

  function dialogContent() {
    const closeButton = el('button', {
      class: 'access-close',
      type: 'button',
      'aria-label': 'Close',
      text: '×',
      on: { click: close },
    });
    const head = el('header', { class: 'access-head' }, [
      el('div', {}, [
        el('div', { class: 'access-kicker lang-en', text: required ? 'Unlock this mode' : 'Medical 3D Lab account' }),
        el('div', { class: 'access-kicker lang-ja', text: required ? 'このモードを利用する' : 'Medical 3D Lab アカウント' }),
        el('h2', { id: 'access-title', class: 'access-title lang-en', text: required ? ENTITLEMENT_COPY[required]?.label ?? 'Access' : 'Access & billing' }),
        el('h2', { class: 'access-title lang-ja', text: required ? ENTITLEMENT_COPY[required]?.labelJa ?? '利用権' : '利用権・お支払い' }),
      ]),
      closeButton,
    ]);

    if (!authConfigured()) {
      return [
        head,
        el('p', { class: 'access-copy lang-en', text: 'The paywall UI is installed, but account access has not been configured on this deployment yet. Free models remain available.' }),
        el('p', { class: 'access-copy lang-ja', text: '課金UIは実装済みですが、このデプロイにはアカウント認証がまだ設定されていません。無料モデルはそのまま利用できます。' }),
        planGrid(),
      ];
    }

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
              state.user = null;
              state.grants = new Set(FREE);
              state.subscriptions = [];
              state.error = '';
              state.notice = '';
              notify();
            },
          },
        }),
      ]),
      currentAccess(),
      !state.billingConfigured
        ? el('div', { class: 'access-billing-unavailable' }, [
            el('p', { class: 'access-copy lang-en', text: 'Paid checkout is not enabled on this deployment yet. Your account and all free models remain available.' }),
            el('p', { class: 'access-copy lang-ja', text: 'このデプロイでは有料プランの購入はまだ有効化されていません。アカウントと無料モデルはそのまま利用できます。' }),
          ])
        : null,
      planGrid(),
      hasActiveSubscription() && state.billingConfigured
        ? el('button', {
            class: 'access-manage',
            type: 'button',
            text: 'Change plan / manage billing　プラン変更・契約管理',
            on: { click: openPortal },
          })
        : null,
      state.notice ? el('p', { class: 'access-form-message', text: state.notice }) : null,
      state.error ? el('p', { class: 'access-error', text: state.error }) : null,
    ].filter(Boolean);
  }

  function authForm() {
    const email = el('input', { class: 'access-input', type: 'email', autocomplete: 'email', placeholder: 'email@example.com', required: '' });
    const password = el('input', { class: 'access-input', type: 'password', autocomplete: 'current-password', placeholder: 'Password (8+ characters)', minlength: '8', required: '' });
    const submit = async (mode) => {
      state.notice = '';
      state.error = '';
      if (!email.value || password.value.length < 8) {
        state.notice = 'メールアドレスと8文字以上のパスワードを入力してください。';
        notify();
        return;
      }
      try {
        state.loading = true;
        notify();
        if (mode === 'signup') {
          const result = await signUp(email.value.trim(), password.value);
          if (!result.session) {
            state.notice = '確認メールを送信しました。確認後にログインしてください。';
            return;
          }
        } else {
          await signIn(email.value.trim(), password.value);
        }
        await refresh();
      } catch (error) {
        state.error = error.message || 'ログインできませんでした。';
      } finally {
        state.loading = false;
        notify();
      }
    };

    return el('div', { class: 'access-auth' }, [
      el('p', { class: 'access-copy lang-en', text: 'Create one account to keep purchases on every device. Free models do not require an account.' }),
      el('p', { class: 'access-copy lang-ja', text: '購入した利用権を端末間で共有するためのアカウントです。無料モデルはログイン不要です。' }),
      email,
      password,
      el('div', { class: 'access-auth-actions' }, [
        el('button', { class: 'access-primary', type: 'button', disabled: state.loading ? '' : null, text: 'Sign in / ログイン', on: { click: () => submit('signin') } }),
        el('button', { class: 'access-secondary', type: 'button', disabled: state.loading ? '' : null, text: 'Create account / 新規登録', on: { click: () => submit('signup') } }),
      ]),
      state.notice ? el('p', { class: 'access-form-message', text: state.notice }) : null,
      state.error ? el('p', { class: 'access-error', text: state.error }) : null,
    ].filter(Boolean));
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
    const configured = authConfigured() && state.billingConfigured;
    const existing = hasActiveSubscription();
    const disabled = unlocked || state.loading || !configured;
    const cta = !configured
      ? 'Setup required / 設定待ち'
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

  async function checkout(plan) {
    if (!state.billingConfigured) {
      state.error = 'Paid checkout is not enabled on this deployment yet.';
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
      window.location.assign(data.url);
    } catch (error) {
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
