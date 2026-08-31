import { createEducationGuidePanel } from '../components/EducationGuidePanel.js';
import { createPatientGuidePanel } from '../components/PatientGuidePanel.js';
import { educationGuideFor } from '../data/educationGuides.js';
import { patientGuideFor } from '../data/patientGuides.js';
import { el } from '../utils/dom.js';
import { featuresForScene } from './features.js';
import { ENTITLEMENT } from './policy.js';

const EDUCATION_GUIDE_MODULE = 'guided-teaching';
const LESSON_MODULE_PREFIX = 'lesson.';
const LESSON_ID = /^[A-Za-z0-9._~-]{1,70}$/;

/**
 * Adds paid use-case modes around an already-created scene without changing the
 * medical scene/model itself.
 *
 * Capability is explicit by scene. A prototype does not acquire a paid surface
 * merely because a similarly named method happens to be added later.
 *
 * @param {{ app:any, access:any, ui:HTMLElement, sceneId:string }} options
 */
export function installAccess({ app, access, ui, sceneId }) {
  mountAccountButton(access, ui);
  const features = featuresForScene(sceneId);
  const coordinator = createModeCoordinator();

  if (features.patient) {
    const guide = patientGuideFor(sceneId);
    if (guide) {
      coordinator.register(
        'patient',
        installPatientGuide({
          app,
          access,
          ui,
          guide,
          activate: () => coordinator.activate('patient'),
        })
      );
    }
  }

  if (features.education) {
    const guide = educationGuideFor(sceneId);
    if (guide) {
      coordinator.register(
        'education-guide',
        installEducationGuide({
          app,
          access,
          ui,
          guide,
          sceneId,
          activate: () => coordinator.activate('education-guide'),
        })
      );
    }
    installEducationGate({
      app,
      access,
      ui,
      sceneId,
      activateLesson: () => coordinator.activate('lesson'),
    });
  }
}

function createModeCoordinator() {
  const closers = new Map();
  return {
    register(name, close) {
      if (typeof close === 'function') closers.set(name, close);
    },
    activate(name) {
      for (const [other, close] of closers) {
        if (other !== name) close();
      }
    },
  };
}

function mountAccountButton(access, ui) {
  const nav = ui.querySelector('.global-scene-nav');
  const trigger = nav?.querySelector('.global-nav-trigger');
  if (!nav || !trigger || access.accountButton.isConnected) return;
  nav.insertBefore(access.accountButton, trigger);
}

function installPatientGuide({ app, access, ui, guide, activate }) {
  const row = ui.querySelector('.button-row');
  const consolePanel = ui.querySelector('.console');
  if (!row || !consolePanel) return null;

  let open = false;
  const guidePanel = createPatientGuidePanel({
    guide,
    setProgress: (value) => {
      app.playback.pause();
      app.playback.set(value);
    },
    onExit: closeGuide,
    onPresentationChange: (enabled) => {
      ui.classList.toggle('is-patient-presentation', enabled && open);
    },
  });
  consolePanel.append(guidePanel.element);

  const lock = el('span', { class: 'feature-lock', 'aria-hidden': 'true', text: '🔒' });
  const button = el('button', {
    class: 'btn secondary paid-mode-button patient-mode-button',
    type: 'button',
    'data-paid-mode': 'patient',
  }, [
    el('span', { class: 'btn-icon patient-mode-icon', 'aria-hidden': 'true', text: '◉' }),
    el('span', { class: 'btn-label lang-en', text: 'Patient' }),
    el('span', { class: 'btn-label lang-ja', text: '患者説明' }),
    lock,
  ]);
  button.title = 'Patient explanation mode';
  button.addEventListener('click', () => {
    if (!access.has(ENTITLEMENT.PATIENT)) {
      access.open(ENTITLEMENT.PATIENT);
      return;
    }
    open ? closeGuide() : openGuide();
  });

  row.prepend(button);

  access.subscribe(({ grants }) => {
    const unlocked = grants.includes(ENTITLEMENT.PATIENT);
    button.classList.toggle('is-locked', !unlocked);
    lock.hidden = unlocked;
    button.setAttribute('aria-label', unlocked ? 'Patient explanation' : 'Patient explanation — locked');
    if (!unlocked) closeGuide();
  });

  function openGuide() {
    activate?.();
    app.learning?.set(false);
    app.causalStory?.set(false);
    if (app.story?.active && typeof app.story.exit === 'function') app.story.exit();
    open = true;
    guidePanel.reset();
    ui.classList.add('is-patient-guide');
    button.classList.add('is-on');
    button.setAttribute('aria-pressed', 'true');
  }

  function closeGuide() {
    if (!open) return;
    open = false;
    guidePanel.setPresentation(false);
    ui.classList.remove('is-patient-guide', 'is-patient-presentation');
    button.classList.remove('is-on');
    button.setAttribute('aria-pressed', 'false');
  }

  return closeGuide;
}

function installEducationGuide({ app, access, ui, guide, sceneId, activate }) {
  const row = ui.querySelector('.button-row');
  const consolePanel = ui.querySelector('.console');
  if (!row || !consolePanel) return null;

  let open = false;
  const progressMark = el('span', {
    class: 'education-progress-mark',
    'aria-hidden': 'true',
    text: '✓',
    hidden: '',
  });

  const saveProgress = (stepIndex, completed = false) =>
    access.saveEducationProgress({
      sceneId,
      moduleId: EDUCATION_GUIDE_MODULE,
      stepIndex,
      completed,
    });

  const guidePanel = createEducationGuidePanel({
    guide,
    setProgress: (value) => {
      app.playback.pause();
      app.playback.set(value);
    },
    onExit: closeGuide,
    onStepChange: (stepIndex) => {
      void saveProgress(stepIndex, false);
    },
    onComplete: (stepIndex) => {
      progressMark.hidden = false;
      button.classList.add('is-completed');
      void saveProgress(stepIndex, true);
    },
  });
  consolePanel.append(guidePanel.element);

  const lock = el('span', { class: 'feature-lock', 'aria-hidden': 'true', text: '🔒' });
  const button = el('button', {
    class: 'btn secondary paid-mode-button education-mode-button',
    type: 'button',
    'data-paid-mode': 'education-guide',
  }, [
    el('span', { class: 'btn-icon education-mode-icon', 'aria-hidden': 'true', text: '◇' }),
    el('span', { class: 'btn-label lang-en', text: 'Teach' }),
    el('span', { class: 'btn-label lang-ja', text: '教育ガイド' }),
    progressMark,
    lock,
  ]);
  button.title = 'Medical education teaching guide';
  button.addEventListener('click', () => {
    if (!access.has(ENTITLEMENT.EDUCATION)) {
      access.open(ENTITLEMENT.EDUCATION);
      return;
    }
    if (open) closeGuide();
    else void openGuide();
  });

  const patientButton = row.querySelector('.patient-mode-button');
  if (patientButton) patientButton.after(button);
  else row.prepend(button);

  access.subscribe(({ user, grants, educationProgress }) => {
    const unlocked = grants.includes(ENTITLEMENT.EDUCATION);
    button.classList.toggle('is-locked', !unlocked);
    lock.hidden = unlocked;
    button.setAttribute('aria-label', unlocked ? 'Medical education teaching guide' : 'Medical education teaching guide — locked');

    if (!unlocked || !user?.id) {
      progressMark.hidden = true;
      button.classList.remove('is-completed');
      closeGuide();
      return;
    }

    syncProgressMark(educationProgress);
  });

  function savedProgress(rows = access.snapshot().educationProgress) {
    return (rows ?? []).find(
      (entry) => entry.sceneId === sceneId && entry.moduleId === EDUCATION_GUIDE_MODULE
    ) ?? null;
  }

  function syncProgressMark(rows) {
    const saved = savedProgress(rows);
    const completed = Boolean(saved?.completed);
    progressMark.hidden = !completed;
    button.classList.toggle('is-completed', completed);
    button.title = completed
      ? 'Medical education teaching guide — completed'
      : 'Medical education teaching guide';
  }

  async function openGuide() {
    activate?.();
    app.learning?.set(false);
    app.causalStory?.set(false);
    if (app.story?.active && typeof app.story.exit === 'function') app.story.exit();

    await access.refreshEducationProgress();
    const saved = access.educationProgress(sceneId, EDUCATION_GUIDE_MODULE);
    guidePanel.resume(saved && !saved.completed ? saved.stepIndex : 0);
    syncProgressMark();

    open = true;
    ui.classList.add('is-education-guide');
    button.classList.add('is-on');
    button.setAttribute('aria-pressed', 'true');
  }

  function closeGuide() {
    if (!open) return;
    open = false;
    ui.classList.remove('is-education-guide');
    button.classList.remove('is-on');
    button.setAttribute('aria-pressed', 'false');
  }

  return closeGuide;
}

function lessonStorageId(moduleId) {
  return LESSON_ID.test(moduleId ?? '') ? `${LESSON_MODULE_PREFIX}${moduleId}` : null;
}

function completedLessonIds(rows, sceneId) {
  return (rows ?? [])
    .filter(
      (entry) =>
        entry.sceneId === sceneId &&
        entry.completed &&
        typeof entry.moduleId === 'string' &&
        entry.moduleId.startsWith(LESSON_MODULE_PREFIX)
    )
    .map((entry) => entry.moduleId.slice(LESSON_MODULE_PREFIX.length));
}

function installEducationGate({ app, access, ui, sceneId, activateLesson }) {
  if (!app.learning) return;
  const meta = app.scene?.constructor?.meta ?? {};
  const expectedLabel = meta.learning?.label ?? 'Lesson';
  const learnButton = [...ui.querySelectorAll('.button-row .btn')].find(
    (button) => button.querySelector('.btn-label.lang-en')?.textContent === expectedLabel
  );
  if (!learnButton) return;

  const lock = el('span', { class: 'feature-lock', 'aria-hidden': 'true', text: '🔒' });
  learnButton.append(lock);

  app.learning.panel.element.addEventListener('learning:complete', (event) => {
    const moduleId = lessonStorageId(event.detail?.moduleId);
    if (!moduleId || !access.has(ENTITLEMENT.EDUCATION)) return;
    void access.saveEducationProgress({
      sceneId,
      moduleId,
      stepIndex: 0,
      completed: true,
    });
  });

  learnButton.addEventListener(
    'click',
    (event) => {
      if (!access.has(ENTITLEMENT.EDUCATION)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        access.open(ENTITLEMENT.EDUCATION);
        return;
      }
      activateLesson?.();
    },
    true
  );

  access.subscribe(({ grants, educationProgress }) => {
    const unlocked = grants.includes(ENTITLEMENT.EDUCATION);
    learnButton.classList.toggle('is-locked', !unlocked);
    lock.hidden = unlocked;
    learnButton.setAttribute('aria-label', unlocked ? expectedLabel : `${expectedLabel} — locked`);
    app.learning.panel.setCompletedModules?.(unlocked ? completedLessonIds(educationProgress, sceneId) : []);
    if (!unlocked) app.learning.set(false);
  });
}
