import { el } from '../utils/dom.js';

/**
 * Patient-facing walk-through over the same scene/model.
 *
 * This is deliberately simpler than the medical-learning modules: no quiz,
 * no patient-specific claims, no treatment advice. Each step only moves the
 * public scene progression so the 3D remains the same source of truth.
 *
 * @param {{
 *   guide: {title:string,titleJa:string,steps:any[]},
 *   setProgress:(value:number)=>void,
 *   onExit:()=>void,
 * }} options
 */
export function createPatientGuidePanel({ guide, setProgress, onExit }) {
  let index = 0;

  const title = el('div', { class: 'patient-guide-title' }, [
    el('span', { class: 'lang-en', text: guide.title }),
    el('span', { class: 'lang-ja', text: guide.titleJa }),
  ]);
  const counter = el('span', { class: 'patient-guide-counter' });
  const heading = el('h3', { class: 'patient-guide-heading' });
  const body = el('p', { class: 'patient-guide-copy' });
  const dots = el('div', { class: 'patient-guide-dots' });

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

  const element = el('section', { class: 'patient-guide', 'aria-label': 'Patient explanation' }, [
    el('div', { class: 'patient-guide-head' }, [title, counter, close]),
    dots,
    heading,
    body,
    el('p', { class: 'patient-guide-boundary' }, [
      el('span', { class: 'lang-en', text: 'General explanation only — not a diagnosis or a prediction for an individual.' }),
      el('span', { class: 'lang-ja', text: '一般的な病態説明です。個別の診断・予後予測を行うものではありません。' }),
    ]),
    el('div', { class: 'patient-guide-actions' }, [previous, next]),
  ]);

  function setIndex(nextIndex) {
    index = Math.max(0, Math.min(guide.steps.length - 1, nextIndex));
    const step = guide.steps[index];
    setProgress(step.progress ?? 0);
    render();
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
        el('span', { class: `patient-guide-dot${dotIndex <= index ? ' is-active' : ''}`, 'aria-hidden': 'true' })
      )
    );
    previous.disabled = index === 0;
    next.replaceChildren(
      el('span', { class: 'lang-en', text: index === guide.steps.length - 1 ? 'Finish' : 'Next' }),
      el('span', { class: 'lang-ja', text: index === guide.steps.length - 1 ? '終了' : '次へ' })
    );
  }

  setIndex(0);

  return {
    element,
    reset() {
      setIndex(0);
    },
  };
}
