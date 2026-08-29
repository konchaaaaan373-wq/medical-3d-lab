import { el } from '../utils/dom.js';

/**
 * A causal walk-through, advanced by the learner.
 *
 * The heart-failure scene has a guided sequence that plays: it is a *timeline*,
 * and it works because the thing it is narrating is a beat. The scenes that
 * came after are narrating a chain of causes — flow limitation, so incomplete
 * emptying, so a higher resting volume, so less room to breathe in — and a
 * chain of causes has no clock. It has an order, and the reader sets the pace.
 *
 * So this steps. Each step states one link, sets the model to the conditions
 * that make that link visible, and names the numbers to watch while it does.
 * Nothing advances on its own.
 *
 * The panel has **no private path into the model**. It moves the same controls
 * the sliders move and reads the same metrics the read-out reads, which is what
 * makes "raise the resistance and the resting volume climbs" a thing the model
 * does rather than a thing this text asserts.
 *
 * ### Story shape
 * ```
 * { id, title, titleJa,
 *   steps: [{ id,
 *             heading, headingJa,
 *             body, bodyJa,
 *             because?: { text, textJa },   // the link to the step before
 *             controls?: { [controlId]: number },
 *             progress?: number,
 *             watch?: string[],             // metric ids
 *             chart?: string }] }           // chart id to bring forward
 * ```
 *
 * @param {{ story: object,
 *           setProgress: (value: number) => void,
 *           setControl: (id: string, value: number) => void,
 *           onStep: (step: object, index: number) => void,
 *           onExit: () => void }} options
 */
export function createCausalStoryPanel({ story, setProgress, setControl, onStep, onExit }) {
  const steps = story.steps ?? [];
  let index = 0;

  const counter = el('span', { class: 'story-counter' });
  const heading = el('h3', { class: 'story-heading' }, [
    el('span', { class: 'lang-en' }),
    el('span', { class: 'lang-ja' }),
  ]);
  const because = el('p', { class: 'story-because' }, [
    el('span', { class: 'lang-en' }),
    el('span', { class: 'lang-ja' }),
  ]);
  const body = el('p', { class: 'story-body' }, [
    el('span', { class: 'lang-en' }),
    el('span', { class: 'lang-ja' }),
  ]);

  // One dot per step, and they are clickable: someone who wants to go back to
  // the step where the resistance changed should not have to walk there.
  const dots = steps.map((step, at) =>
    el('button', {
      class: 'story-dot',
      type: 'button',
      'aria-label': step.heading,
      on: { click: () => show(at) },
    })
  );

  const back = button('Back', '戻る', 'story-back', () => show(index - 1));
  const next = button('Next', '次へ', 'story-next', () => show(index + 1));
  const exit = button('Close', '閉じる', 'story-exit', () => onExit());

  const element = el('div', { class: 'panel causal-story' }, [
    el('div', { class: 'story-top' }, [
      el('span', { class: 'story-title' }, [
        el('span', { class: 'lang-en', text: story.title }),
        el('span', { class: 'lang-ja', text: story.titleJa }),
      ]),
      counter,
      exit,
    ]),
    el('div', { class: 'story-dots' }, dots),
    heading,
    because,
    body,
    el('div', { class: 'story-actions' }, [back, next]),
  ]);

  /**
   * Puts the model into the state this step is about, then says what to look
   * at. Order matters: the text describes what the reader will already be
   * looking at by the time they read it.
   */
  function show(at) {
    if (at < 0 || at >= steps.length) return;
    index = at;
    const step = steps[at];

    if (step.controls) for (const [id, value] of Object.entries(step.controls)) setControl(id, value);
    if (step.progress != null) setProgress(step.progress);

    counter.textContent = `${at + 1} / ${steps.length}`;
    write(heading, step.heading, step.headingJa);
    write(because, step.because?.text, step.because?.textJa);
    because.hidden = !step.because;
    write(body, step.body, step.bodyJa);

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-current', dotIndex === at);
      dot.classList.toggle('is-seen', dotIndex < at);
    });
    back.disabled = at === 0;
    next.disabled = at === steps.length - 1;

    onStep(step, at);
  }

  return {
    element,
    get step() {
      return steps[index];
    },
    get index() {
      return index;
    },
    /** Runs the first step. Called when the panel is opened, not when built. */
    start() {
      show(0);
    },
    /** Advance from a keyboard shortcut or a click elsewhere. */
    advance(direction) {
      show(index + direction);
    },
  };
}

function write(node, en, ja) {
  node.children[0].textContent = en ?? '';
  node.children[1].textContent = ja ?? en ?? '';
}

function button(label, labelJa, className, onClick) {
  return el('button', { class: `story-button ${className}`, type: 'button', on: { click: onClick } }, [
    el('span', { class: 'lang-en', text: label }),
    el('span', { class: 'lang-ja', text: labelJa }),
  ]);
}
