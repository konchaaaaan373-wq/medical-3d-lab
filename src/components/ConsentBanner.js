import { el } from '../utils/dom.js';

const STATE_COPY = Object.freeze({
  unset: Object.freeze({
    en: 'Not set',
    ja: '未設定',
    detailEn: 'Nothing sent',
    detailJa: '送信なし',
  }),
  denied: Object.freeze({
    en: 'Declined',
    ja: '拒否済み',
    detailEn: 'Nothing sent',
    detailJa: '送信なし',
  }),
  granted: Object.freeze({
    en: 'Allowed',
    ja: '許可済み',
    detailEn: 'Usage recording on',
    detailJa: '利用状況の記録オン',
  }),
});

/**
 * Inline usage-recording preference for an existing information/settings area.
 *
 * This deliberately does not prompt on first load and does not own consent
 * state. The telemetry object remains the one source of truth for unset,
 * granted and denied. Opening/closing this section writes nothing; only the two
 * explicit buttons call setConsent().
 *
 * @param {{ telemetry: object, onAnswer?: (state: string) => void }} options
 */
export function createConsentSettings({ telemetry, onAnswer = () => {} }) {
  const stateValueEn = el('span', { class: 'usage-recording-state-value lang-en' });
  const stateValueJa = el('span', { class: 'usage-recording-state-value lang-ja' });
  const stateDetailEn = el('span', { class: 'usage-recording-state-detail lang-en' });
  const stateDetailJa = el('span', { class: 'usage-recording-state-detail lang-ja' });

  let deniedButton = null;
  let grantedButton = null;

  const paint = (state = telemetry.consent) => {
    const copy = STATE_COPY[state] ?? STATE_COPY.unset;
    stateValueEn.textContent = copy.en;
    stateValueJa.textContent = copy.ja;
    stateDetailEn.textContent = copy.detailEn;
    stateDetailJa.textContent = copy.detailJa;
    deniedButton?.setAttribute('aria-pressed', String(state === 'denied'));
    grantedButton?.setAttribute('aria-pressed', String(state === 'granted'));
  };

  const answer = (state) => {
    telemetry.setConsent(state);
    paint(telemetry.consent);
    onAnswer(state);
  };

  const choice = (state, en, ja) =>
    el('button', {
      class: 'usage-recording-choice',
      type: 'button',
      'aria-pressed': 'false',
      on: { click: () => answer(state) },
    }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja }),
    ]);

  deniedButton = choice('denied', 'Do not allow', '許可しない');
  grantedButton = choice('granted', 'Allow', '許可する');

  const body = el('div', { class: 'usage-recording-body' }, [
    el('p', { class: 'usage-recording-summary' }, [
      el('span', {
        class: 'lang-en',
        text: 'We use opened models, 3D loading results and errors to improve the app. You can use the app without allowing this.',
      }),
      el('span', {
        class: 'lang-ja',
        text: '開いたモデル、3Dの読み込み結果、エラーを記録し、改善に使います。許可しなくてもアプリを利用できます。',
      }),
    ]),
    el('p', { class: 'usage-recording-detail' }, [
      el('span', {
        class: 'lang-en',
        text: 'Tokens, email addresses and other identifiers are removed before sending. We do not use this for advertising or profiles, and no identifier persists across pages. Nothing is sent until you allow it.',
      }),
      el('span', {
        class: 'lang-ja',
        text: 'トークンやメールアドレスなどの識別情報は送信前に除きます。広告やプロフィール作成には使わず、ページを越えて追跡する識別子も持ちません。許可するまで送信しません。',
      }),
    ]),
    el('div', { class: 'usage-recording-actions' }, [deniedButton, grantedButton]),
    el('a', { class: 'usage-recording-privacy', href: '#/privacy' }, [
      el('span', { class: 'lang-en', text: 'Privacy details' }),
      el('span', { class: 'lang-ja', text: 'プライバシーの詳細' }),
      el('span', { 'aria-hidden': 'true', text: ' →' }),
    ]),
  ]);

  const element = el('details', {
    class: 'usage-recording-settings',
    'aria-label': 'Usage recording settings / 利用状況の記録設定',
  }, [
    el('summary', { class: 'usage-recording-heading' }, [
      el('h3', { class: 'usage-recording-title' }, [
        el('span', { class: 'lang-en', text: 'Usage recording' }),
        el('span', { class: 'lang-ja', text: '利用状況の記録' }),
      ]),
      el('div', { class: 'usage-recording-state', 'aria-live': 'polite' }, [
        stateValueEn,
        stateValueJa,
        stateDetailEn,
        stateDetailJa,
      ]),
      el('span', { class: 'usage-recording-chevron', 'aria-hidden': 'true', text: '⌄' }),
    ]),
    body,
  ]);

  const unsubscribe = telemetry.onConsent?.((state) => paint(state));
  paint();

  return {
    element,
    answer,
    dispose() {
      unsubscribe?.();
      element.remove?.();
    },
  };
}

/**
 * Backwards-compatible export for callers/tests while the product moves from a
 * first-load banner to an inline setting. It returns the same non-blocking
 * settings surface; nothing is mounted automatically by this module.
 */
export const createConsentBanner = createConsentSettings;
