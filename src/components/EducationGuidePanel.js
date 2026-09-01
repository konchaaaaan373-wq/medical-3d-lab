import { el } from '../utils/dom.js';

const KIND_COPY = Object.freeze({
  predict: ['Predict', '予測'],
  observe: ['Observe', '観察'],
  explain: ['Explain', '説明'],
  scope: ['Scope', '限界'],
});

/**
 * A compact instructor guide layered over the same public scene progression.
 *
 * Unlike `LearningPanel`, this does not invent a second measurement path and it
 * does not need scene-specific controls. It is a teaching script: park the scene
 * at an authored state, ask a question, then reveal the mechanism/scope statement.
 * Existing model-backed Lesson/Challenge modules remain the deeper manipulate →
 * measure experience where a scene has them.
 *
 * @param {{
 *   guide: {title:string,titleJa:string,steps:any[]},
 *   setProgress:(value:number)=>void,
 *   onExit:()=>void,
 *   onStepChange?:(index:number)=>void,
 *   onComplete?:()=>void,
 * }} options
 */
export function createEducationGuidePanel({ guide, setProgress, onExit, onStepChange, onComplete }) {
  let index = 0;
  let revealed = false;

  const title = el('div', { class: 'education-guide-title' }, [
    el('span', { class: 'lang-en', text: guide.title }),
    el('span', { class: 'lang-ja', text: guide.titleJa }),
  ]);
  const counter = el('span', { class: 'education-guide-counter', 'aria-live': 'polite' });
  const kind = el('div', { class: 'education-guide-kind' });
  const heading = el('h3', { class: 'education-guide-heading' });
  const prompt = el('p', { class: 'education-guide-prompt' });
  const reasoning = el('div', { class: 'education-guide-reasoning', hidden: '', 'aria-live': 'polite' });
  const dots = el('div', { class: 'education-guide-dots', 'aria-label': 'Teaching guide steps' });

  const reveal = el('button', {
    class: 'education-guide-reveal',
    type: 'button',
    on: { click: revealReasoning },
  }, [
    el('span', { class: 'lang-en', text: 'Reveal reasoning' }),
    el('span', { class: 'lang-ja', text: '考え方を表示' }),
  ]);

  const previous = el('button', {
    class: 'education-guide-nav',
    type: 'button',
    on: { click: () => setIndex(index - 1) },
  }, [el('span', { class: 'lang-en', text: 'Back' }), el('span', { class: 'lang-ja', text: '戻る' })]);

  const next = el('button', {
    class: 'education-guide-nav primary',
    type: 'button',
    on: { click: advance },
  });

  const close = el('button', {
    class: 'education-guide-close',
    type: 'button',
    'aria-label': 'Close medical teaching guide',
    text: '×',
    on: { click: onExit },
  });

  const element = el('section', {
    class: 'education-guide',
    'aria-label': 'Medical education teaching guide',
    tabindex: '-1',
  }, [
    el('div', { class: 'education-guide-head' }, [title, counter, close]),
    dots,
    kind,
    heading,
    prompt,
    reveal,
    reasoning,
    el('p', { class: 'education-guide-boundary' }, [
      el('span', { class: 'lang-en', text: 'Teaching guidance follows the model and its stated limits; it is not a patient-specific decision tool.' }),
      el('span', { class: 'lang-ja', text: 'モデルとその限界に沿った教育用ガイドです。個別患者の意思決定ツールではありません。' }),
    ]),
    el('div', { class: 'education-guide-actions' }, [previous, next]),
  ]);

  element.addEventListener('keydown', (event) => {
    // A focused teaching guide owns navigation. Do not let the global 3D
    // shortcuts also seek or reset the underlying scene.
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
        if (!revealed) revealReasoning();
        else if (index < guide.steps.length - 1) setIndex(index + 1);
        else finish();
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

  function revealReasoning() {
    if (revealed) return;
    revealed = true;
    render();
  }

  function finish() {
    onComplete?.();
    onExit();
  }

  function advance() {
    if (index === guide.steps.length - 1) finish();
    else setIndex(index + 1);
  }

  function setIndex(nextIndex, { notify = true } = {}) {
    index = Math.max(0, Math.min(guide.steps.length - 1, nextIndex));
    revealed = false;
    const step = guide.steps[index];
    setProgress(step.progress ?? 0);
    if (notify) onStepChange?.(index);
    render();
  }

  function render() {
    const step = guide.steps[index];
    const kindCopy = KIND_COPY[step.kind] ?? ['Teaching point', '教育ポイント'];
    counter.textContent = `${index + 1} / ${guide.steps.length}`;
    kind.replaceChildren(
      el('span', { class: 'lang-en', text: kindCopy[0] }),
      el('span', { class: 'lang-ja', text: kindCopy[1] })
    );
    kind.dataset.kind = step.kind ?? 'teaching';
    heading.replaceChildren(
      el('span', { class: 'lang-en', text: step.title }),
      el('span', { class: 'lang-ja', text: step.titleJa })
    );
    prompt.replaceChildren(
      el('span', { class: 'lang-en', text: step.prompt }),
      el('span', { class: 'lang-ja', text: step.promptJa })
    );
    reasoning.hidden = !revealed;
    reasoning.replaceChildren(
      el('div', { class: 'education-guide-reasoning-label' }, [
        el('span', { class: 'lang-en', text: step.kind === 'scope' ? 'Boundary' : 'Reasoning' }),
        el('span', { class: 'lang-ja', text: step.kind === 'scope' ? 'モデルの境界' : '考え方' }),
      ]),
      el('p', { class: 'education-guide-answer' }, [
        el('span', { class: 'lang-en', text: step.answer }),
        el('span', { class: 'lang-ja', text: step.answerJa }),
      ])
    );
    reveal.hidden = revealed;
    previous.disabled = index === 0;
    next.replaceChildren(
      el('span', { class: 'lang-en', text: index === guide.steps.length - 1 ? 'Finish' : 'Next' }),
      el('span', { class: 'lang-ja', text: index === guide.steps.length - 1 ? '終了' : '次へ' })
    );
    dots.replaceChildren(
      ...guide.steps.map((_, dotIndex) =>
        el('button', {
          class: `education-guide-dot${dotIndex <= index ? ' is-active' : ''}${dotIndex === index ? ' is-current' : ''}`,
          type: 'button',
          'aria-label': `Teaching step ${dotIndex + 1} of ${guide.steps.length}`,
          'aria-current': dotIndex === index ? 'step' : null,
          on: { click: () => setIndex(dotIndex) },
        })
      )
    );
  }

  // Build the initial view without recording progress merely because the paid
  // component was mounted in the background.
  setIndex(0, { notify: false });

  return {
    element,
    reset(startIndex = 0) {
      setIndex(startIndex);
    },
    focus() {
      element.focus({ preventScroll: true });
    },
    currentIndex: () => index,
    isRevealed: () => revealed,
  };
}
