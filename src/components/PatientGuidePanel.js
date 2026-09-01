import { el } from '../utils/dom.js';

/**
 * Patient-facing walk-through over the same scene/model.
 *
 * This is deliberately simpler than the medical-learning modules: no quiz,
 * no patient-specific claims, no treatment advice. Each step only moves the
 * public scene progression so the 3D remains the same source of truth.
 *
 * The section itself is keyboard-focusable because consultation-room use often
 * means standing beside a monitor rather than using a mouse precisely. While
 * focus is inside the guide, navigation keys belong to the guide and are not
 * allowed to leak through to the app's global 3D shortcuts.
 *
 * @param {{
 *   guide: {title:string,titleJa:string,steps:any[]},
 *   setProgress:(value:number)=>void,
 *   onExit:()=>void,
 *   onPresentationChange?:(enabled:boolean)=>void,
 * }} options
 */
export function createPatientGuidePanel({ guide, setProgress, onExit, onPresentationChange }) {
  let index = 0;
  let presenting = false;

  const title = el('div', { class: 'patient-guide-title' }, [
    el('span', { class: 'lang-en', text: guide.title }),
    el('span', { class: 'lang-ja', text: guide.titleJa }),
  ]);
  const counter = el('span', { class: 'patient-guide-counter', 'aria-live': 'polite' });
  const heading = el('h3', { class: 'patient-guide-heading' });
  const body = el('p', { class: 'patient-guide-copy' });
  const dots = el('div', { class: 'patient-guide-dots', 'aria-label': 'Explanation steps' });

  const presentation = el('button', {
    class: 'patient-guide-presentation',
    type: 'button',
    'aria-pressed': 'false',
    on: { click: () => setPresentation(!presenting) },
  });

  const handoutButton = el('button', {
    class: 'patient-guide-handout-button',
    type: 'button',
    'aria-label': 'Print patient handout',
    on: { click: () => window.print() },
  }, [
    el('span', { class: 'lang-en', text: 'Handout' }),
    el('span', { class: 'lang-ja', text: '印刷' }),
  ]);

  const previous = el('button', {
    class: 'patient-guide-nav',
    type: 'button',
    on: { click: () => setIndex(index - 1) },
  }, [el('span', { class: 'lang-en', text: 'Back' }), el('span', { class: 'lang-ja', text: '戻る' })]);

  const next = el('button', {
    class: 'patient-guide-nav primary',
    type: 'button',
    on: { click: () => (index === guide.steps.length - 1 ? onExit() : setIndex(index + 1)) },
  });

  const close = el('button', {
    class: 'patient-guide-close',
    type: 'button',
    'aria-label': 'Close patient explanation',
    text: '×',
    on: { click: onExit },
  });

  const copy = el('div', { class: 'patient-guide-step', 'aria-live': 'polite', 'aria-atomic': 'true' }, [
    heading,
    body,
  ]);

  // Screen-hidden, print-only companion to the interactive guide. It contains
  // the same authored copy and no user/patient data, so printing cannot turn a
  // general educational model into a personalised medical record by accident.
  const handout = buildPatientHandout(guide);

  const element = el('section', {
    class: 'patient-guide',
    'aria-label': 'Patient explanation',
    tabindex: '-1',
  }, [
    el('div', { class: 'patient-guide-head' }, [title, presentation, handoutButton, counter, close]),
    dots,
    copy,
    el('p', { class: 'patient-guide-boundary' }, [
      el('span', { class: 'lang-en', text: 'General explanation only — not a diagnosis or a prediction for an individual.' }),
      el('span', { class: 'lang-ja', text: '一般的な病態説明です。個別の診断・予後予測を行うものではありません。' }),
    ]),
    el('div', { class: 'patient-guide-actions' }, [previous, next]),
    handout,
  ]);

  element.addEventListener('keydown', (event) => {
    // Keep the application's Space/R/H/C/arrow shortcuts from acting behind a
    // patient explanation while the presenter is using its controls.
    event.stopPropagation();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onExit();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        setIndex(index - 1);
        break;
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault();
        if (index < guide.steps.length - 1) setIndex(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        setIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setIndex(guide.steps.length - 1);
        break;
      default:
        break;
    }
  });

  function setIndex(nextIndex) {
    index = Math.max(0, Math.min(guide.steps.length - 1, nextIndex));
    const step = guide.steps[index];
    setProgress(step.progress ?? 0);
    render();
  }

  function setPresentation(enabled) {
    presenting = Boolean(enabled);
    presentation.setAttribute('aria-pressed', String(presenting));
    presentation.classList.toggle('is-on', presenting);
    onPresentationChange?.(presenting);
    renderPresentationButton();
  }

  function renderPresentationButton() {
    presentation.replaceChildren(
      el('span', { class: 'lang-en', text: presenting ? 'Standard view' : 'Present larger' }),
      el('span', { class: 'lang-ja', text: presenting ? '通常表示' : '大きく表示' })
    );
  }

  function render() {
    const step = guide.steps[index];
    counter.textContent = `${index + 1} / ${guide.steps.length}`;
    heading.replaceChildren(
      el('span', { class: 'lang-en', text: step.title }),
      el('span', { class: 'lang-ja', text: step.titleJa })
    );
    body.replaceChildren(
      el('span', { class: 'lang-en', text: step.body }),
      el('span', { class: 'lang-ja', text: step.bodyJa })
    );
    dots.replaceChildren(
      ...guide.steps.map((_, dotIndex) =>
        el('button', {
          class: `patient-guide-dot${dotIndex <= index ? ' is-active' : ''}${dotIndex === index ? ' is-current' : ''}`,
          type: 'button',
          'aria-label': `Step ${dotIndex + 1} of ${guide.steps.length}`,
          'aria-current': dotIndex === index ? 'step' : null,
          on: { click: () => setIndex(dotIndex) },
        })
      )
    );
    previous.disabled = index === 0;
    next.replaceChildren(
      el('span', { class: 'lang-en', text: index === guide.steps.length - 1 ? 'Finish' : 'Next' }),
      el('span', { class: 'lang-ja', text: index === guide.steps.length - 1 ? '終了' : '次へ' })
    );
    renderPresentationButton();
  }

  setIndex(0);

  return {
    element,
    handout,
    reset() {
      setPresentation(false);
      setIndex(0);
    },
    focus() {
      element.focus({ preventScroll: true });
    },
    setPresentation,
    isPresenting: () => presenting,
    currentIndex: () => index,
  };
}

function buildPatientHandout(guide) {
  return el('article', { class: 'patient-handout', 'aria-hidden': 'true' }, [
    el('header', { class: 'patient-handout-head' }, [
      el('div', { class: 'patient-handout-brand', text: 'Medical 3D Lab' }),
      el('h1', { class: 'patient-handout-title' }, [
        el('span', { class: 'lang-en', text: guide.title }),
        el('span', { class: 'lang-ja', text: guide.titleJa }),
      ]),
      el('p', { class: 'patient-handout-lead' }, [
        el('span', { class: 'lang-en', text: 'A general visual explanation of the mechanism shown in the 3D model.' }),
        el('span', { class: 'lang-ja', text: '3Dモデルで示した仕組みを、一般的な内容としてまとめた説明資料です。' }),
      ]),
    ]),
    el(
      'ol',
      { class: 'patient-handout-steps' },
      guide.steps.map((step) =>
        el('li', { class: 'patient-handout-step' }, [
          el('h2', {}, [
            el('span', { class: 'lang-en', text: step.title }),
            el('span', { class: 'lang-ja', text: step.titleJa }),
          ]),
          el('p', {}, [
            el('span', { class: 'lang-en', text: step.body }),
            el('span', { class: 'lang-ja', text: step.bodyJa }),
          ]),
        ])
      )
    ),
    el('footer', { class: 'patient-handout-boundary' }, [
      el('strong', { class: 'lang-en', text: 'Important' }),
      el('strong', { class: 'lang-ja', text: '重要' }),
      el('span', { class: 'lang-en', text: 'This handout is general education only. It does not diagnose, predict prognosis, or select treatment for an individual.' }),
      el('span', { class: 'lang-ja', text: 'この資料は一般的な教育目的の説明です。個別の診断・予後予測・治療選択を行うものではありません。' }),
    ]),
  ]);
}
