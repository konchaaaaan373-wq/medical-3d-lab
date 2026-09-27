import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { sceneById } from '../catalog/index.js';
import { PATIENT_ROUTE } from '../catalog/index.js';
import { patientExplanationAvailable } from '../access/patientPurpose.js';
import { PURPOSE, hashWithPurpose, purposeById, requestedPurpose, resolvePurpose } from './purpose.js';

/**
 * Puts a model into the purpose its address asks for, and keeps it there.
 *
 * ## One model, two ways of explaining it
 *
 * Patient explanation and medical education are two purposes over **one**
 * scene and one solved state. Nothing here builds a second model or computes
 * anything: what changes is the language (the patient explanation's own
 * copy), what is on screen first, which controls are offered, and the header's
 * account of where the reader is (`SceneSwitcher.setPurpose`).
 *
 * | | medical education | patient explanation |
 * | --- | --- | --- |
 * | location | 医学教育 › system › organ › model | 患者説明 › the question |
 * | first on screen | the model, its stages, every control, data on request | the model, and the explanation beside it |
 * | controls | all of them | play, view and zoom — the ones a conversation needs |
 * | guide | the teaching guide / lesson (paid) | the step-by-step explanation (paid) |
 *
 * ## The address is the state
 *
 * The switch writes `?purpose=` and this answers `hashchange`, so a switch, a
 * shared link, a reload and Back are one path, not four. The scene route is
 * unchanged (`sameRoute` ignores the query), so the model is not reloaded and
 * the viewpoint stays where the reader left it.
 *
 * ## What is not carried across
 *
 * Going from medical education to patient explanation, the settings only
 * education offers — the model's own controls moved off where the model opens,
 * a comparison model on screen, data view, a lesson or teaching guide — would
 * leave a patient looking at a heart nobody chose for them, with nothing on
 * screen saying why. So they go back to the model's starting state, and a
 * notice says that they did. The position on the progression axis stays: it is
 * the stage both purposes are talking about.
 *
 * ## Gates
 *
 * `patientExplanationAvailable` decides whether this model has the purpose at
 * all — release, versioned clinical review, declaration and written content.
 * A link asking for patient explanation on a model without it opens medical
 * education, says so, and has its address corrected, so a reload does not ask
 * again. Whether the explanation itself opens is the entitlement's decision,
 * asked in one place (`installAccess.requestOpen`): without it the purchase
 * surface opens, and the purpose shows a lock rather than a blank.
 *
 * @param {{
 *   app: any,
 *   ui: HTMLElement,
 *   sceneId: string,
 *   modes: {patient: any, educationGuide: any, exitSceneModes: () => void},
 *   win?: Window,
 * }} options
 */
export async function installPurpose({ app, ui, sceneId, modes, win = window }) {
  const scene = sceneById(sceneId);
  const patient = modes?.patient ?? null;
  const available = Boolean(patient) && patientExplanationAvailable(scene);
  const notice = createNotice(ui);

  const readHash = () => win.location.hash ?? '';
  /** Correct the address without a history entry, and without `hashchange`. */
  const replaceHash = (hash) => {
    try {
      win.history.replaceState(win.history.state, '', hash || '#/');
    } catch {
      /* the screen is already right; only the address is stale */
    }
  };

  if (!available) {
    // A model with one purpose. It still answers a link that asked for the
    // other one — by saying it cannot, rather than by ignoring it.
    const refuse = () => {
      if (requestedPurpose(readHash()) !== PURPOSE.PATIENT) return;
      notice.show(
        'This model has no patient explanation. It is open for medical education.',
        'このモデルには患者説明がありません。医学教育の表示で開いています。'
      );
      replaceHash(hashWithPurpose(readHash(), PURPOSE.EDUCATION));
    };
    refuse();
    win.addEventListener('hashchange', refuse);
    return { purpose: () => PURPOSE.EDUCATION, available: false };
  }

  // The question the explanation answers, from its own title. The index is
  // already loaded with the console's paid modes; this is not new content.
  const { patientGuideFor } = await import('../data/patientGuides.js');
  const guide = patientGuideFor(sceneId);
  const question = guide ? { en: guide.title, ja: guide.titleJa } : null;

  const titleBlock = createTitlePurpose(question);
  app.titleCard?.prepend(titleBlock);

  const bar = createPatientBar({
    onOpen: () => void patient.open(),
    entitled: patient.entitled(),
  });
  ui.querySelector('.console')?.prepend(bar.element);
  patient.onEntitlement((entitled) => bar.setEntitled(entitled));
  // The explanation closed — by its ×, by the entitlement going, by a purpose
  // change. In patient explanation the way back into it is the bar.
  patient.onClose(() => {
    if (current === PURPOSE.PATIENT) requestAnimationFrame(() => bar.focus());
  });

  let current = null;

  /**
   * @param {'patient'|'education'} next
   * @param {{initial?: boolean}} [options]
   */
  function apply(next, { initial = false } = {}) {
    if (next === current) return;
    const previous = current;
    current = next;
    ui.dataset.purpose = next;
    app.header?.setPurpose?.({ current: next, question });

    if (next === PURPOSE.PATIENT) {
      // What only education offers does not come along.
      modes.educationGuide?.close?.();
      modes.exitSceneModes?.();
      if (app.isDataView?.()) app.setDataView?.(false);
      const changed = app.resetModelControls?.() ?? false;
      if (changed && !initial) {
        notice.show(
          'The conditions changed in medical education are back where the model starts, so the explanation shows the model it describes.',
          '医学教育で変えた条件を、モデルの開始時の状態に戻しました。説明はこの状態について話します。'
        );
      }
      // Opened for the reader who may; for anyone else the bar says what it
      // takes, and `open` shows them how.
      if (patient.entitled()) void patient.open();
    } else if (previous === PURPOSE.PATIENT) {
      patient.close({ keepView: true });
    }
  }

  function applyFromHash({ initial = false } = {}) {
    const { purpose, refused } = resolvePurpose({
      requested: requestedPurpose(readHash()),
      patientAvailable: available,
    });
    apply(purpose, { initial });
    if (refused) replaceHash(hashWithPurpose(readHash(), PURPOSE.EDUCATION));
  }

  applyFromHash({ initial: true });
  win.addEventListener('hashchange', () => applyFromHash());

  return { purpose: () => current, available: true };
}

/**
 * The patient explanation's own heading on the title card: which purpose, the
 * way back to its list, and the question. The model's name stays below it.
 *
 * @param {{en: string, ja: string}|null} question
 */
function createTitlePurpose(question) {
  const purpose = purposeById(PURPOSE.PATIENT);
  return el('div', { class: 'title-purpose is-patient' }, [
    el('nav', { class: 'title-trail', 'aria-label': inLanguage('Breadcrumb', '現在地') }, [
      el('a', { class: 'title-trail-parent', href: PATIENT_ROUTE }, [
        el('span', { class: 'lang-en', text: purpose.en }),
        el('span', { class: 'lang-ja', text: purpose.ja }),
      ]),
      el('span', { class: 'title-trail-separator', 'aria-hidden': 'true', text: '›' }),
    ]),
    question
      ? el('p', { class: 'title-question' }, [
          el('span', { class: 'lang-en', text: question.en }),
          el('span', { class: 'lang-ja', text: question.ja }),
        ])
      : null,
  ]);
}

/**
 * The patient purpose's way into the explanation, on the console.
 *
 * It is the one primary action in this purpose. With the entitlement it opens
 * the explanation; without it, it says what the explanation needs and opens
 * the plan — the lock is on the button, not a surprise after pressing it.
 */
function createPatientBar({ onOpen, entitled }) {
  const lock = el('span', { class: 'feature-lock', 'aria-hidden': 'true', text: '🔒' });
  const button = el(
    'button',
    {
      class: 'btn primary purpose-patient-open',
      type: 'button',
      on: { click: onOpen },
    },
    [
      el('span', { class: 'btn-label lang-en', text: 'Explain step by step' }),
      el('span', { class: 'btn-label lang-ja', text: '順を追って説明する' }),
      lock,
    ]
  );
  const note = el('p', { class: 'purpose-patient-note' }, [
    el('span', {
      class: 'lang-en',
      text: 'The step-by-step explanation needs the patient-explanation plan. The model itself is free.',
    }),
    el('span', {
      class: 'lang-ja',
      text: '順を追った説明には「患者説明」プランが必要です。モデルは無料で見られます。',
    }),
  ]);
  const element = el('div', { class: 'purpose-patient-bar' }, [button, note]);
  function setEntitled(value) {
    lock.hidden = value;
    note.hidden = value;
    // Not `is-locked`: that class dims a console button to say "not yet", and
    // on the one primary action here it read as disabled. The lock and the
    // sentence beside it say what it takes; the button stays pressable.
    button.classList.toggle('needs-plan', !value);
    button.setAttribute(
      'aria-label',
      value
        ? inLanguage('Explain step by step', '順を追って説明する')
        : inLanguage('Explain step by step — needs the patient-explanation plan', '順を追って説明する — 患者説明プランが必要です')
    );
  }
  setEntitled(entitled);
  return { element, setEntitled, focus: () => button.focus() };
}

/**
 * One line, said once, that something changed without the reader pressing it.
 *
 * A live region, so it is read as well as seen; it goes by itself, and can be
 * dismissed sooner.
 */
function createNotice(ui) {
  const text = el('span', { class: 'purpose-notice-text' });
  const close = el('button', {
    class: 'purpose-notice-close',
    type: 'button',
    'aria-label': inLanguage('Dismiss', '閉じる'),
    text: '×',
  });
  const element = el('div', { class: 'purpose-notice', role: 'status', hidden: '' }, [text, close]);
  let timer = 0;
  const hide = () => {
    element.hidden = true;
    clearTimeout(timer);
  };
  close.addEventListener('click', hide);
  ui.append(element);
  return {
    element,
    show(en, ja) {
      text.replaceChildren(el('span', { class: 'lang-en', text: en }), el('span', { class: 'lang-ja', text: ja }));
      element.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(hide, 9000);
    },
  };
}
