import { el } from '../utils/dom.js';
import { consentComplete } from '../app/videoExport.js';
import { VIDEO_CONTENTS_COPY, VIDEO_EXPORT_COPY, clauseSentence } from '../data/videoExport.js';

/**
 * What a reader agrees to before a video file is written.
 *
 * ### Why a blocking dialog, on a product that does not block
 *
 * This product's other consent surface — usage recording — deliberately does
 * *not* prompt: it is an inline setting, because nothing is at stake if the
 * reader never opens it. This one is the opposite case. The file is about to
 * leave every surface that explains it, and the moment it does there is no way
 * to add the sentence that bounds it. A modal is the honest shape for "the
 * next click produces an artefact you will hand to somebody else".
 *
 * ### What it does not do
 *
 * It does not remember the answer. Consent here is not a preference, it is an
 * agreement about one file; a reader who downloads a second scene is agreeing
 * about a second model, whose prohibited uses and credits may differ. Nothing
 * is stored, nothing is sent, and closing the dialog writes nothing anywhere.
 *
 * The clauses come from `videoConsentTerms()` — assembled from the model
 * profile and the asset manifest — and their sentences from
 * `src/data/videoExport.js`. This component chooses no wording and no rule: it
 * asks `consentComplete()` the same question the tests ask.
 *
 * @param {object} options
 * @param {ReturnType<import('../app/videoExport.js').videoConsentTerms>} options.terms
 * @param {{ title: string, titleJa: string, caveat: string, caveatJa: string }} options.subject
 *   the model's name and the sentence that bounds it — the scene's own
 *   disclaimer, not a second one written for this dialog
 * @param {() => void} options.onAgree
 * @param {() => void} [options.onCancel]
 */
export function createVideoConsentDialog({ terms, subject, onAgree, onCancel = () => {} }) {
  const acknowledged = new Set();
  const copy = VIDEO_EXPORT_COPY;

  const bilingual = (en, ja, className = '') => [
    el('span', { class: `lang-en${className ? ` ${className}` : ''}`, text: en }),
    el('span', { class: `lang-ja${className ? ` ${className}` : ''}`, text: ja }),
  ];

  const agreeButton = el(
    'button',
    { class: 'video-consent-agree', type: 'button', disabled: 'true', 'aria-disabled': 'true' },
    bilingual(copy.agree.en, copy.agree.ja)
  );
  const cancelButton = el('button', { class: 'video-consent-cancel', type: 'button' }, bilingual(copy.cancel.en, copy.cancel.ja));

  const hint = el('p', { class: 'video-consent-hint', 'aria-live': 'polite' }, bilingual(copy.blocked.en, copy.blocked.ja));

  const termsLink = el('a', { class: 'video-consent-terms', href: '#/terms' }, [
    ...bilingual(copy.termsLink.en, copy.termsLink.ja),
    el('span', { 'aria-hidden': 'true', text: ' →' }),
  ]);

  const paint = () => {
    const ready = consentComplete(terms, acknowledged);
    if (ready) {
      agreeButton.removeAttribute('disabled');
      agreeButton.disabled = false;
    } else {
      agreeButton.setAttribute('disabled', 'true');
      agreeButton.disabled = true;
    }
    agreeButton.setAttribute('aria-disabled', String(!ready));
    hint.hidden = ready;
  };

  /** @type {any[]} */
  const clauseBoxes = [];
  const clauseRows = terms.clauses.map((clause) => {
    const box = el('input', {
      class: 'video-consent-box',
      type: 'checkbox',
      id: `video-consent-${clause.id}`,
      on: {
        change: (event) => {
          const checked = event?.target?.checked ?? !acknowledged.has(clause.id);
          if (checked) acknowledged.add(clause.id);
          else acknowledged.delete(clause.id);
          paint();
        },
      },
    });
    clauseBoxes.push(box);
    return el('li', { class: 'video-consent-clause' }, [
      box,
      el('label', { class: 'video-consent-clause-text', for: `video-consent-${clause.id}` }, [
        el('span', { class: 'lang-en', text: clauseSentence(clause, 'en') }),
        el('span', { class: 'lang-ja', text: clauseSentence(clause, 'ja') }),
      ]),
    ]);
  });

  const section = (heading, headingJa, children) =>
    el('section', { class: 'video-consent-section' }, [
      el('h3', { class: 'video-consent-section-title' }, bilingual(heading, headingJa)),
      ...children,
    ]);

  const panel = el(
    'div',
    {
      class: 'video-consent-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'video-consent-title',
      // Focus lands here, on the dialog itself, and not on a control.
      //
      // It used to go to Cancel, which is the first control in the row at the
      // bottom — and on a phone the panel scrolls, so the browser scrolled the
      // button into view and the screen opened **past its own title and
      // intro**. A consent screen whose first sentence a reader has to scroll
      // back up to find is one they will agree to without reading.
      tabindex: '-1',
    },
    [
      el('h2', { class: 'video-consent-title', id: 'video-consent-title' }, bilingual(copy.title.en, copy.title.ja)),
      el('p', { class: 'video-consent-intro' }, bilingual(copy.intro.en, copy.intro.ja)),
      // The model's own sentence, quoted rather than rewritten: the console
      // says this under every frame, and the file is about to carry it too.
      el('p', { class: 'video-consent-subject' }, [
        el('span', { class: 'lang-en', text: `${subject.title} — ${subject.caveat}` }),
        el('span', { class: 'lang-ja', text: `${subject.titleJa} — ${subject.caveatJa}` }),
      ]),
      section(copy.clausesHeading.en, copy.clausesHeading.ja, [
        el('ul', { class: 'video-consent-clauses' }, clauseRows),
      ]),
      section(copy.contentsHeading.en, copy.contentsHeading.ja, [
        el(
          'ul',
          { class: 'video-consent-contents' },
          VIDEO_CONTENTS_COPY.map((entry) => el('li', { class: 'video-consent-content' }, bilingual(entry.en, entry.ja)))
        ),
      ]),
      hint,
      el('div', { class: 'video-consent-actions' }, [cancelButton, agreeButton]),
      termsLink,
    ]
  );

  const element = el('div', { class: 'video-consent' }, [
    el('div', { class: 'video-consent-scrim', on: { click: () => close('cancel') } }),
    panel,
  ]);

  /**
   * Where Tab may go while this is open.
   *
   * Listed rather than queried. A `querySelectorAll` of focusable elements is
   * the usual way, and it is a selector this product's headless DOM cannot
   * answer — so the trap would be untested exactly where it matters. These are
   * every control the dialog has, in the order they are read.
   */
  const focusStops = () => [...clauseBoxes, cancelButton, agreeButton, termsLink].filter((node) => !node.disabled);

  function trapTab(event) {
    const stops = focusStops();
    if (!stops.length) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains?.(active))) {
      event.preventDefault?.();
      last.focus?.();
    } else if (!event.shiftKey && (active === last || !panel.contains?.(active))) {
      event.preventDefault?.();
      first.focus?.();
    }
  }

  /**
   * Everything behind the dialog stops answering the keyboard.
   *
   * `aria-modal` tells a screen reader; it does not stop Tab reaching the
   * console underneath, and a reader who tabs into a model control while
   * deciding whether to agree has left a decision half-made on screen.
   */
  const inertBefore = new Map();
  function makeBackgroundInert(host) {
    for (const sibling of host?.children ?? []) {
      if (sibling === element || !sibling || typeof sibling !== 'object') continue;
      if (!inertBefore.has(sibling)) inertBefore.set(sibling, Boolean(sibling.inert));
      sibling.inert = true;
    }
  }

  function restoreBackground() {
    for (const [node, was] of inertBefore) node.inert = was;
    inertBefore.clear();
  }

  let previousFocus = null;
  let settled = false;

  const onKeyDown = (event) => {
    if (event?.key === 'Tab') {
      trapTab(event);
      return;
    }
    if (event?.key === 'Escape') close('cancel');
  };

  function close(reason) {
    if (settled) return;
    settled = true;
    document.removeEventListener('keydown', onKeyDown);
    restoreBackground();
    element.remove?.();
    previousFocus?.focus?.();
    if (reason === 'agree') onAgree();
    else onCancel();
  }

  cancelButton.addEventListener('click', () => close('cancel'));
  agreeButton.addEventListener('click', () => {
    // Belt and braces: the button is disabled until every clause is ticked,
    // and the rule is asked again here so a stray click cannot answer for the
    // reader if the disabled attribute is ever lost to a style change.
    if (!consentComplete(terms, acknowledged)) return;
    close('agree');
  });

  paint();

  return {
    element,
    /** The clause ids ticked so far — for tests and for the recorded event. */
    get acknowledged() {
      return [...acknowledged];
    },
    /** Mounts into `host`, remembers where focus was, and takes it. */
    open(host) {
      previousFocus = document.activeElement ?? null;
      host.append(element);
      makeBackgroundInert(host);
      document.addEventListener('keydown', onKeyDown);
      // `preventScroll`, and then the top: the panel is the scroll container,
      // and it opens at the first word of the agreement.
      panel.focus?.({ preventScroll: true });
      panel.scrollTop = 0;
      return element;
    },
    close: () => close('cancel'),
  };
}
