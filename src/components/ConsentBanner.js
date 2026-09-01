import { el } from '../utils/dom.js';

/**
 * The consent question.
 *
 * Deliberately not a "cookie banner": it does not block the product, it does
 * not have a pre-ticked box, and refusing is the same size and shape as
 * accepting. Nothing has been transmitted at the moment this appears — the
 * queue is in memory, and refusing destroys it — so the copy can say exactly
 * that without hedging.
 *
 * It appears once, on the first visit, and never again after either answer.
 *
 * @param {{ telemetry: object, onAnswer?: (state: string) => void }} options
 */
export function createConsentBanner({ telemetry, onAnswer = () => {} }) {
  if (telemetry.consent !== 'unset') return null;

  const answer = (state) => {
    telemetry.setConsent(state);
    element.remove();
    onAnswer(state);
  };

  const button = (state, en, ja, primary) =>
    el(
      'button',
      {
        class: `consent-button${primary ? ' primary' : ''}`,
        type: 'button',
        on: { click: () => answer(state) },
      },
      [el('span', { class: 'lang-en', text: en }), el('span', { class: 'lang-ja', text: ja })]
    );

  const element = el(
    'aside',
    {
      class: 'consent-banner',
      role: 'region',
      'aria-label': 'Usage data / 利用データ',
    },
    [
      el('div', { class: 'consent-copy' }, [
        el('p', { class: 'consent-title' }, [
          el('span', { class: 'lang-en', text: 'May we count how this is used?' }),
          el('span', { class: 'lang-ja', text: '利用状況の記録を許可しますか？' }),
        ]),
        el('p', { class: 'consent-detail' }, [
          el('span', {
            class: 'lang-en',
            text:
              'Which models are opened, whether a scene finished loading, and errors — with tokens, ' +
              'addresses and identifiers stripped before anything is sent. No advertising, no profile, ' +
              'and no identifier that outlives the page. Nothing has been sent yet.',
          }),
          el('span', {
            class: 'lang-ja',
            text:
              '開かれたモデル、読み込みの成否、エラーの記録です。トークン・メールアドレス・識別子は送信前に除去されます。' +
              '広告目的の利用はなく、プロフィールも作らず、ページを越えて残る識別子も持ちません。この時点ではまだ何も送信していません。',
          }),
        ]),
      ]),
      el('div', { class: 'consent-actions' }, [
        button('denied', 'No thanks', '許可しない', false),
        button('granted', 'Allow', '許可する', true),
      ]),
    ]
  );

  return { element, answer };
}
