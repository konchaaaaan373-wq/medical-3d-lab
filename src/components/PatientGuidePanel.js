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
 *   setFraming?:(framing:string|null, focus:string[]|null)=>void,
 *   onExit:()=>void,
 *   onPresentationChange?:(enabled:boolean)=>void,
 * }} options
 */
/**
 * What each certainty mark says on screen, in the reader's own words.
 *
 * Not the field's vocabulary — "associated" is a word a researcher reads as a
 * warning and a patient reads as a synonym for "causes". So each one says what
 * it means, and the two that are not settled say that they are not settled.
 */
const CERTAINTY_COPY = Object.freeze({
  established: Object.freeze({
    en: 'Established — the field agrees this happens.',
    ja: '確立していること — この点は広く一致しています。',
  }),
  associated: Object.freeze({
    en: 'Seen together — this is found alongside the change above. That is not the same as causing it.',
    ja: '一緒に見られること — 上の変化と並んで見つかります。原因であるという意味ではありません。',
  }),
  hypothesised: Object.freeze({
    en: 'A proposal — this is one explanation researchers have put forward, and it is not settled.',
    ja: '提案されている説明 — 研究者が挙げている説明の一つで、決着はついていません。',
  }),
  uncertain: Object.freeze({
    en: 'Not known — the evidence does not settle this, and studies disagree.',
    ja: '分かっていないこと — 研究のあいだで結果が分かれており、決着していません。',
  }),
});

export function createPatientGuidePanel({ guide, setProgress, setFraming, onExit, onPresentationChange }) {
  let index = 0;
  let presenting = false;
  let ownsFullscreen = false;

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

  const fullscreenAvailable = Boolean(
    typeof document !== 'undefined' &&
      document.fullscreenEnabled !== false &&
      document.documentElement?.requestFullscreen &&
      document.exitFullscreen
  );
  const fullscreen = el('button', {
    class: 'patient-guide-fullscreen',
    type: 'button',
    hidden: fullscreenAvailable ? null : '',
    'aria-pressed': 'false',
    'aria-label': 'Full-screen patient presentation',
    on: { click: toggleFullscreen },
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
    on: { click: () => (index === guide.steps.length - 1 ? closePanel() : setIndex(index + 1)) },
  });

  const close = el('button', {
    class: 'patient-guide-close',
    type: 'button',
    'aria-label': 'Close patient explanation',
    text: '×',
    on: { click: closePanel },
  });

  /**
   * Where to look, kept apart from what is happening.
   *
   * A person beside a monitor is being shown a rotating model and told a
   * mechanism, and the two are not the same sentence: one says what changes,
   * the other says which part of the picture shows it. Running them together
   * produced a paragraph that did neither. It is its own line, and a step that
   * has nothing to point at simply does not draw it.
   */
  const look = el('p', { class: 'patient-guide-look' });

  /**
   * The line that says this step is not the model talking.
   *
   * Every other step points at something the scene draws from its own solved
   * state. A step about what a person feels does not — the model solves
   * pressures and volumes, not symptoms — and a reader has no way to tell those
   * apart by looking. So the step that is a general explanation says so, in the
   * same place, every time it is shown.
   */
  const educational = el('p', { class: 'patient-guide-educational' }, [
    el('span', { class: 'lang-en', text: 'General explanation — this part is not drawn from the model on screen.' }),
    el('span', { class: 'lang-ja', text: '一般的な説明です。この部分は画面のモデルが計算したものではありません。' }),
  ]);

  /**
   * How sure the field is about this step, where the guide says so.
   *
   * Steps in a row read as a chain whether or not one exists. Where a guide
   * marks its steps — the amyloid one does — this says which of them the field
   * agrees on, which are things seen together, and which are proposals nobody
   * has settled. A guide that marks nothing draws nothing here.
   */
  const certainty = el('p', { class: 'patient-guide-certainty' });

  const copy = el('div', { class: 'patient-guide-step', 'aria-live': 'polite', 'aria-atomic': 'true' }, [
    heading,
    certainty,
    body,
    look,
    educational,
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
    el('div', { class: 'patient-guide-head' }, [title, presentation, fullscreen, handoutButton, counter, close]),
    dots,
    copy,
    /**
     * Two sentences, and the second one is the one a walk-through needs.
     *
     * Six steps in a fixed order read as "this is what happens next", and the
     * model behind them is explicitly not making that claim: its own evidence
     * dossier calls the sequence one authored teaching path and not a
     * natural-history claim (`illustrative-remodelling-axis`). The scene says so
     * under the console; the person being walked through it is looking at this
     * panel, so it says so here too.
     */
    el('p', { class: 'patient-guide-boundary' }, [
      el('span', { class: 'lang-en', text: 'General explanation only — not a diagnosis or a prediction for an individual. It is one teaching path through the changes, and not everyone goes through them in this order.' }),
      el('span', { class: 'lang-ja', text: '一般的な病態説明です。個別の診断・予後予測を行うものではありません。この教材が説明する変化と観察の順序であって、すべての人が同じ順に進むわけではありません。' }),
    ]),
    el('div', { class: 'patient-guide-actions' }, [previous, next]),
    handout,
  ]);

  const onFullscreenChange = () => {
    if (!document.fullscreenElement) ownsFullscreen = false;
    renderFullscreenButton();
  };
  if (fullscreenAvailable) document.addEventListener('fullscreenchange', onFullscreenChange);

  element.addEventListener('keydown', (event) => {
    // Keep the application's Space/R/H/C/arrow shortcuts from acting behind a
    // patient explanation while the presenter is using its controls.
    event.stopPropagation();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closePanel();
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
      case 'f':
      case 'F':
        if (!event.metaKey && !event.ctrlKey && !event.altKey && fullscreenAvailable) {
          event.preventDefault();
          void toggleFullscreen();
        }
        break;
      default:
        break;
    }
  });

  function setIndex(nextIndex) {
    index = Math.max(0, Math.min(guide.steps.length - 1, nextIndex));
    const step = guide.steps[index];
    setProgress(step.progress ?? 0);
    pointAt(step);
    render();
  }

  /**
   * Point the camera and the labels at what this step is about.
   *
   * A step that names no framing gets the scene's own, so walking back from the
   * pulmonary step returns to the view the heart steps are read from. Kept
   * apart from `setProgress` because it changes nothing about the model — a
   * step can move the camera, the model, both or neither.
   */
  function pointAt(step) {
    setFraming?.(step?.frame ?? null, step?.focus ?? null);
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

  function renderFullscreenButton() {
    if (!fullscreenAvailable) return;
    const active = ownsFullscreen && Boolean(document.fullscreenElement);
    fullscreen.setAttribute('aria-pressed', String(active));
    fullscreen.classList.toggle('is-on', active);
    fullscreen.replaceChildren(
      el('span', { class: 'lang-en', text: active ? 'Exit full screen' : 'Full screen' }),
      el('span', { class: 'lang-ja', text: active ? '全画面を終了' : '全画面' })
    );
  }

  async function toggleFullscreen() {
    if (!fullscreenAvailable) return;
    try {
      if (ownsFullscreen && document.fullscreenElement) {
        ownsFullscreen = false;
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        ownsFullscreen = document.fullscreenElement === document.documentElement;
      }
    } catch {
      // Fullscreen can be denied by iframe/browser policy. The large-text
      // presentation mode remains available and the medical model is unchanged.
      ownsFullscreen = false;
    }
    renderFullscreenButton();
  }

  async function exitOwnedFullscreen() {
    if (!fullscreenAvailable || !ownsFullscreen || !document.fullscreenElement) {
      ownsFullscreen = false;
      renderFullscreenButton();
      return;
    }
    ownsFullscreen = false;
    try {
      await document.exitFullscreen();
    } catch {
      // Browser chrome state is non-medical presentation state. Never let a
      // failed exit prevent the guide itself from closing/restoring its model.
    }
    renderFullscreenButton();
  }

  function closePanel() {
    void exitOwnedFullscreen();
    onExit();
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
    certainty.hidden = !step.certainty;
    certainty.dataset.certainty = step.certainty ?? '';
    certainty.replaceChildren(
      ...(step.certainty
        ? [
            el('span', { class: 'lang-en', text: CERTAINTY_COPY[step.certainty].en }),
            el('span', { class: 'lang-ja', text: CERTAINTY_COPY[step.certainty].ja }),
          ]
        : [])
    );
    educational.hidden = !step.educationalOnly;
    look.hidden = !step.look;
    look.replaceChildren(
      ...(step.look
        ? [
            el('span', { class: 'patient-guide-look-label lang-en', text: 'Where to look' }),
            el('span', { class: 'patient-guide-look-label lang-ja', text: '画面のどこを見るか' }),
            el('span', { class: 'patient-guide-look-text lang-en', text: step.look }),
            el('span', { class: 'patient-guide-look-text lang-ja', text: step.lookJa ?? step.look }),
          ]
        : [])
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
    renderFullscreenButton();
  }

  // Draw the first step, and **do not move the model to it**. Building the
  // panel is not opening it: the panel is constructed the first time the button
  // is pressed, so a `setIndex` here set the progression to zero before anyone
  // had decided to explain anything — and the position that `reset` then opened
  // at was the one this had just overwritten. Rendering is enough; `reset` puts
  // the reader on the right step.
  index = 0;
  render();

  return {
    element,
    handout,
    /**
     * Open the explanation without moving the model.
     *
     * `reset()` used to mean "go to step one", and step one sets the model to
     * the start of the progression — so opening the patient view on a dilated
     * ventricle silently put it back to a normal one. Switching how something
     * is explained is not a change to what is being explained.
     *
     * Given where the model already is, this opens at the step that describes
     * it: the last step at or before that position. The reader can still step
     * forward and back from there, and every one of those *is* a change,
     * because they asked for it.
     *
     * @param {{ progress?: number }} [where] the model's current position
     */
    reset(where = {}) {
      setPresentation(false);
      const progress = where.progress;
      if (!Number.isFinite(progress)) {
        setIndex(0);
        return;
      }
      let at = 0;
      for (const [index, step] of guide.steps.entries()) {
        if ((step.progress ?? 0) <= progress + 1e-6) at = index;
      }
      // Show that step without driving the model back to its exact position:
      // the reader is somewhere between two steps and the explanation should
      // describe where they are, not snap them to the nearest caption.
      index = at;
      pointAt(guide.steps[index]);
      render();
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
          // The printed sheet is read away from the screen, so "where to look"
          // becomes "what you were shown". Same words either way — the handout
          // never says something the panel did not.
          step.educationalOnly
            ? el('p', { class: 'patient-handout-educational' }, [
                el('span', { class: 'lang-en', text: 'General explanation — not drawn from the model.' }),
                el('span', { class: 'lang-ja', text: '一般的な説明です。モデルの計算ではありません。' }),
              ])
            : null,
          step.look
            ? el('p', { class: 'patient-handout-look' }, [
                el('span', { class: 'lang-en', text: step.look }),
                el('span', { class: 'lang-ja', text: step.lookJa ?? step.look }),
              ])
            : null,
        ].filter(Boolean))
      )
    ),
    el('footer', { class: 'patient-handout-boundary' }, [
      el('strong', { class: 'lang-en', text: 'Important' }),
      el('strong', { class: 'lang-ja', text: '重要' }),
      el('span', { class: 'lang-en', text: 'This handout is general education only. It does not diagnose, predict prognosis, or select treatment for an individual.' }),
      el('span', { class: 'lang-ja', text: 'この資料は一般的な教育目的の説明です。個別の診断・予後予測・治療選択を行うものではありません。' }),
      // The printed sheet leaves the room, so the sentence about order goes
      // with it: a numbered list on paper reads as a course of events even more
      // readily than the panel does.
      el('span', { class: 'lang-en', text: 'The steps are one teaching path through the changes; not everyone goes through them in this order.' }),
      el('span', { class: 'lang-ja', text: '各段階はこの教材が説明する変化と観察の順序であり、すべての人が同じ順に進むわけではありません。' }),
    ]),
  ]);
}
