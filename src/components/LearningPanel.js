import { el } from '../utils/dom.js';

/**
 * A guided lesson: predict, then test the prediction against the model.
 *
 * The panel knows nothing about physiology. It is handed a module — the
 * question, what to move, what to watch — and a small set of callbacks back
 * into the app. Every figure it shows comes from `readMetrics()`, the same call
 * the read-out panel uses, so a lesson and the rest of the UI cannot disagree.
 *
 * The steps are the project's learning loop:
 * predict → manipulate → observe → explain, and then → transfer for a lesson
 * that has somewhere to carry the result to. Transfer is the strongest of the
 * five and also the most expensive to write honestly — it has to re-run the
 * same manipulation somewhere else and *measure* both — so a lesson that has no
 * second place to run it simply ends at explain rather than asserting one.
 *
 * A scene may ship several lessons. They are one relationship each, on purpose;
 * the picker in the head is how a reader gets to the others.
 *
 * @param {{
 *   modules: any[],
 *   setProgress: (value: number) => void,
 *   setControl: (id: string, value: number) => void,
 *   readMetrics: () => any[],
 *   readControls: () => any[],
 *   onExit: () => void,
 * }} options
 */
export function createLearningPanel({ modules, setProgress, setControl, readMetrics, readControls, onExit }) {
  const body = el('div', { class: 'learn-body' });
  const dots = el('div', { class: 'learn-dots' });
  const title = el('span', { class: 'learn-title' }, [
    el('span', { class: 'lang-en' }),
    el('span', { class: 'lang-ja' }),
  ]);

  let module = modules[0];

  // One chip per lesson, shown only when there is a choice to make. Each is one
  // relationship, so the row doubles as a list of what this scene claims.
  const picker =
    modules.length > 1
      ? el(
          'div',
          { class: 'learn-picker' },
          modules.map((entry) =>
            el('button', {
              class: 'learn-pick',
              type: 'button',
              'data-module': entry.id,
              on: { click: () => select(entry.id) },
            }, [
              el('span', { class: 'lang-en', text: entry.short ?? entry.title }),
              el('span', { class: 'lang-ja', text: entry.shortJa ?? entry.titleJa }),
            ])
          )
        )
      : null;

  const element = el('div', { class: 'panel learn' }, [
    el('div', { class: 'learn-head' }, [
      title,
      dots,
      el('button', {
        class: 'learn-close',
        type: 'button',
        title: 'Leave the lesson (Escape)',
        text: '✕',
        on: { click: () => onExit() },
      }),
    ]),
    picker,
    body,
  ]);

  /** Answers and readings collected as the learner goes. */
  const session = {
    prediction: null,
    transferPrediction: null,
    before: null,
    after: null,
    transferComparison: null,
  };
  /**
   * Runs the afterload change over about a second, so the 3D, the plots and the
   * numbers all move together and the change is something you watch happen.
   *
   * Timed on the wall clock rather than on the render delta, for the same reason
   * the reel is: the viewer clamps `dt` so a backgrounded tab cannot
   * fast-forward, which would otherwise stretch this ramp on a slow machine.
   */
  let tween = null;
  let step = 0;

  /** Transfer is only offered by a lesson that ships one. */
  const stepsFor = (entry) =>
    entry.transfer
      ? [predictStep, manipulateStep, observeStep, explainStep, transferStep]
      : [predictStep, manipulateStep, observeStep, explainStep];
  let STEPS = stepsFor(module);

  function render() {
    title.children[0].textContent = module.title;
    title.children[1].textContent = module.titleJa;
    for (const chip of picker?.children ?? []) {
      chip.classList.toggle('is-current', chip.dataset.module === module.id);
    }
    dots.replaceChildren(
      ...STEPS.map((_, i) =>
        el('span', { class: `learn-dot${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}` })
      )
    );
    body.replaceChildren(STEPS[step]());
  }

  function go(next) {
    step = Math.max(0, Math.min(STEPS.length - 1, next));
    render();
  }

  /** Switches lesson. Starts the new one from the top rather than mid-step. */
  function select(id) {
    const found = modules.find((entry) => entry.id === id);
    if (!found || found === module) return;
    module = found;
    STEPS = stepsFor(module);
    tween = null;
    start();
  }

  // --- steps ---------------------------------------------------------------

  function predictStep() {
    const { question } = module;
    return section({
      kicker: ['Predict', '予測'],
      prompt: [question.text, question.textJa],
      children: [
        choices(question.options, (id) => {
          session.prediction = id;
          // The model is put back to the state the lesson starts from only now,
          // so the learner cannot peek at the answer before committing to one.
          setProgress(module.setup.progress);
          // Whatever the lesson's starting state names, by id. Naming the two
          // heart-failure controls here would have made every later scene's
          // lesson start from a state nobody set.
          for (const [id, value] of Object.entries(module.setup)) {
            if (id !== 'progress') setControl(id, value);
          }
          session.before = snapshot();
          go(1);
        }),
      ],
    });
  }

  function manipulateStep() {
    const { manipulation } = module;
    const apply = el('button', {
      class: 'learn-action',
      type: 'button',
      on: {
        click: () => {
          tween = { from: currentControl(manipulation.control), to: manipulation.to, startedAt: now() };
          apply.disabled = true;
        },
      },
    }, [
      el('span', { class: 'lang-en', text: manipulation.action }),
      el('span', { class: 'lang-ja', text: manipulation.actionJa }),
    ]);

    return section({
      kicker: ['Manipulate', '操作'],
      prompt: [manipulation.text, manipulation.textJa],
      children: [
        el('div', { class: 'learn-actions' }, [apply]),
        el('p', { class: 'learn-hint' }, [
          el('span', { class: 'lang-en', text: manipulation.hint }),
          el('span', { class: 'lang-ja', text: manipulation.hintJa }),
        ]),
      ],
      back: () => go(0),
    });
  }

  function observeStep() {
    session.after = snapshot();
    return section({
      kicker: ['Observe', '観察'],
      prompt: [module.observation.text, module.observation.textJa],
      children: [changeTable(session.before, session.after)],
      next: () => go(3),
      back: () => go(1),
    });
  }

  function explainStep() {
    const { question, explanation } = module;
    const chosen = question.options.find((option) => option.id === session.prediction);
    const right = session.prediction === question.answer;
    return section({
      kicker: ['Explain', '説明'],
      children: [
        el('p', { class: `learn-verdict ${right ? 'is-right' : 'is-wrong'}` }, [
          el('span', { class: 'lang-en', text: `Your prediction: ${chosen.label} — ${right ? 'correct' : 'not what the model does'}` }),
          el('span', { class: 'lang-ja', text: `あなたの予測: ${chosen.labelJa} — ${right ? '正解' : 'モデルの挙動とは違いました'}` }),
        ]),
        paragraph(explanation.text, explanation.textJa),
        el('p', { class: 'learn-hint' }, [
          el('span', { class: 'lang-en', text: explanation.footnote }),
          el('span', { class: 'lang-ja', text: explanation.footnoteJa }),
        ]),
      ],
      next: () => go(4),
      back: () => go(2),
    });
  }

  function transferStep() {
    const { transfer } = module;
    if (session.transferPrediction === null) {
      return section({
        kicker: ['Transfer', '応用'],
        prompt: [transfer.text, transfer.textJa],
        children: [
          choices(transfer.options, (id) => {
            session.transferPrediction = id;
            runTransfer();
            render();
          }),
        ],
        back: () => go(3),
      });
    }

    const chosen = transfer.options.find((option) => option.id === session.transferPrediction);
    const right = session.transferPrediction === transfer.answer;
    return section({
      kicker: ['Transfer', '応用'],
      children: [
        el('p', { class: `learn-verdict ${right ? 'is-right' : 'is-wrong'}` }, [
          el('span', { class: 'lang-en', text: `Your prediction: ${chosen.label} — ${right ? 'correct' : 'not what the model does'}` }),
          el('span', { class: 'lang-ja', text: `あなたの予測: ${chosen.labelJa} — ${right ? '正解' : 'モデルの挙動とは違いました'}` }),
        ]),
        // The comparison is measured, not asserted: both drops are read off the
        // model, in the state the learner is looking at.
        comparisonTable(session.transferComparison),
        paragraph(transfer.explanation.text, transfer.explanation.textJa),
        paragraph(module.outro.text, module.outro.textJa, 'learn-hint'),
      ],
      done: () => onExit(),
    });
  }

  // --- model reads ---------------------------------------------------------

  /** The watched metrics as they stand right now. */
  function snapshot() {
    const rows = new Map(readMetrics().map((row) => [row.id, row]));
    return module.watch.map((id) => {
      const row = rows.get(id);
      return { id, label: row.label, labelJa: row.labelJa, unit: row.unit, value: Number(row.value) };
    });
  }

  function currentControl(id) {
    const control = readControls().find((entry) => entry.id === id);
    return control ? control.value : 1;
  }

  /**
   * Runs the same manipulation on the failing state and measures both losses.
   *
   * The learner is told which is larger by the model, not by the copy — if the
   * model ever stopped producing this, the lesson would say so. A test keeps the
   * stored answer honest against it.
   */
  function runTransfer() {
    const { transfer, manipulation, setup } = module;
    const measure = (progress) => {
      setProgress(progress);
      setControl(manipulation.control, setup[manipulation.control]);
      const base = readMetric(transfer.metric);
      setControl(manipulation.control, manipulation.to);
      const loaded = readMetric(transfer.metric);
      return { base, loaded, dropPercent: ((base - loaded) / base) * 100 };
    };
    const normal = measure(setup.progress);
    const failing = measure(transfer.progress);
    session.transferComparison = { normal, failing };
    // Leave the learner looking at the failing state with the load applied.
  }

  /** One row of the same read-out the panel beside the view is showing. */
  function readMetric(id) {
    return Number(readMetrics().find((row) => row.id === id).value);
  }

  function start() {
    step = 0;
    session.prediction = null;
    session.transferPrediction = null;
    render();
  }

  return {
    element,
    /** Drives the control change so the 3D, the plots and the numbers move together. */
    tick() {
      if (!tween) return;
      const t = Math.min(1, (now() - tween.startedAt) / (module.manipulation.seconds * 1000));
      const eased = t * t * (3 - 2 * t);
      setControl(module.manipulation.control, tween.from + (tween.to - tween.from) * eased);
      if (t >= 1) {
        tween = null;
        go(2);
      }
    },
    /** Metric ids the read-out should highlight while the lesson runs. */
    get watched() {
      return step >= 1 ? module.watch : [];
    },
    start,
    /** Which lesson is open, for a test or a screenshot that needs to say. */
    get moduleId() {
      return module.id;
    },
    select,
  };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// --- small building blocks -------------------------------------------------

function section({ kicker, prompt, children = [], next, back, done }) {
  return el('div', { class: 'learn-step' }, [
    el('span', { class: 'learn-kicker' }, [
      el('span', { class: 'lang-en', text: kicker[0] }),
      el('span', { class: 'lang-ja', text: kicker[1] }),
    ]),
    prompt ? paragraph(prompt[0], prompt[1], 'learn-prompt') : null,
    ...children,
    back || next || done
      ? el('div', { class: 'learn-nav' }, [
          back ? navButton(['Back', '戻る'], back, '') : null,
          next ? navButton(['Next', '次へ'], next, 'primary') : null,
          done ? navButton(['Done', '終わる'], done, 'primary') : null,
        ])
      : null,
  ]);
}

function paragraph(text, textJa, className = 'learn-text') {
  return el('p', { class: className }, [
    el('span', { class: 'lang-en', text }),
    el('span', { class: 'lang-ja', text: textJa }),
  ]);
}

function choices(options, onPick) {
  return el(
    'div',
    { class: 'learn-choices' },
    options.map((option) =>
      el('button', { class: 'learn-choice', type: 'button', on: { click: () => onPick(option.id) } }, [
        el('span', { class: 'lang-en', text: option.label }),
        el('span', { class: 'lang-ja', text: option.labelJa }),
      ])
    )
  );
}

function navButton(labels, onClick, variant) {
  return el('button', { class: `learn-nav-btn ${variant}`.trim(), type: 'button', on: { click: onClick } }, [
    el('span', { class: 'lang-en', text: labels[0] }),
    el('span', { class: 'lang-ja', text: labels[1] }),
  ]);
}

/** Before → after for the watched metrics, with the direction called out. */
function changeTable(before, after) {
  return el(
    'div',
    { class: 'learn-table' },
    before.map((row, i) => {
      const to = after[i];
      const delta = to.value - row.value;
      const direction = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
      return el('div', { class: `learn-row is-${direction}` }, [
        el('span', { class: 'learn-row-label' }, [
          el('span', { class: 'lang-en', text: row.label }),
          el('span', { class: 'lang-ja', text: row.labelJa }),
        ]),
        el('span', { class: 'learn-row-figure' }, [
          el('span', { class: 'learn-was', text: String(row.value) }),
          el('span', { class: 'learn-arrow', text: direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→' }),
          el('span', { class: 'learn-now', text: String(to.value) }),
          el('span', { class: 'learn-unit', text: to.unit }),
        ]),
      ]);
    })
  );
}

/** How much stroke volume each state lost, measured on the model just now. */
function comparisonTable(comparison) {
  if (!comparison) return null;
  const row = (labels, result) =>
    el('div', { class: 'learn-row' }, [
      el('span', { class: 'learn-row-label' }, [
        el('span', { class: 'lang-en', text: labels[0] }),
        el('span', { class: 'lang-ja', text: labels[1] }),
      ]),
      el('span', { class: 'learn-row-figure' }, [
        el('span', { class: 'learn-was', text: `${Math.round(result.base)} → ${Math.round(result.loaded)}` }),
        el('span', { class: 'learn-unit', text: 'mL' }),
        el('span', { class: 'learn-drop', text: `−${result.dropPercent.toFixed(0)} %` }),
      ]),
    ]);
  return el('div', { class: 'learn-table' }, [
    row(['Normal', '正常'], comparison.normal),
    row(['HFrEF', 'HFrEF'], comparison.failing),
  ]);
}
