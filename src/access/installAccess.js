import { createEducationGuidePanel } from '../components/EducationGuidePanel.js';
import { createPatientGuidePanel } from '../components/PatientGuidePanel.js';
import { educationGuideFor } from '../data/educationGuides.js';
import { patientGuideFor } from '../data/patientGuides.js';
import { el } from '../utils/dom.js';
import { featuresForScene } from './features.js';
import { captureGuideSession, restoreGuideSession } from './guideSession.js';
import { ENTITLEMENT } from './policy.js';

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
          activate: () => coordinator.activate('education-guide'),
        })
      );
    }
    installEducationGate({
      app,
      access,
      ui,
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
  let sessionSnapshot = null;
  let previousDataView = false;
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

  // Patient explanation is a primary use case, so keep it before utilities and
  // close to Story rather than burying it beside PNG/export controls.
  row.prepend(button);

  access.subscribe(({ grants }) => {
    const unlocked = grants.includes(ENTITLEMENT.PATIENT);
    button.classList.toggle('is-locked', !unlocked);
    lock.hidden = unlocked;
    button.setAttribute('aria-label', unlocked ? 'Patient explanation' : 'Patient explanation — locked');
    if (!unlocked && open) closeGuide();
  });

  function openGuide() {
    activate?.();
    app.learning?.set(false);
    app.causalStory?.set(false);
    if (app.story?.active && typeof app.story.exit === 'function') app.story.exit();

    // The paid patient layer temporarily owns only the public progression axis
    // and presentation density. The clinician's exact model position/play state
    // and whether they had asked for Data view are both restored on exit.
    sessionSnapshot = captureGuideSession(app.playback);
    previousDataView = Boolean(app.isDataView?.());

    // Patient mode is intentionally the same 3D/model in the app's simpler
    // Learning view. That hides PV/waveform/chart/metric/model-control panels
    // without inventing a second physiology or a second set of read-outs.
    app.setDataView?.(false);

    open = true;
    guidePanel.reset();
    ui.classList.add('is-patient-guide');
    button.classList.add('is-on');
    button.setAttribute('aria-pressed', 'true');
    requestAnimationFrame(() => guidePanel.focus());
  }

  function closeGuide() {
    if (!open) return;
    open = false;
    guidePanel.setPresentation(false);
    ui.classList.remove('is-patient-guide', 'is-patient-presentation');
    button.classList.remove('is-on');
    button.setAttribute('aria-pressed', 'false');

    const snapshot = sessionSnapshot;
    sessionSnapshot = null;
    restoreGuideSession(snapshot, app.playback);
    app.setDataView?.(previousDataView);
    previousDataView = false;
    requestAnimationFrame(() => button.focus());
  }

  return closeGuide;
}

function installEducationGuide({ app, access, ui, guide, activate }) {
  const row = ui.querySelector('.button-row');
  const consolePanel = ui.querySelector('.console');
  if (!row || !consolePanel) return null;

  let open = false;
  let sessionSnapshot = null;
  const guidePanel = createEducationGuidePanel({
    guide,
    setProgress: (value) => {
      app.playback.pause();
      app.playback.set(value);
    },
    onExit: closeGuide,
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
    lock,
  ]);
  button.title = 'Medical education teaching guide';
  button.addEventListener('click', () => {
    if (!access.has(ENTITLEMENT.EDUCATION)) {
      access.open(ENTITLEMENT.EDUCATION);
      return;
    }
    open ? closeGuide() : openGuide();
  });

  const patientButton = row.querySelector('.patient-mode-button');
  if (patientButton) patientButton.after(button);
  else row.prepend(button);

  access.subscribe(({ grants }) => {
    const unlocked = grants.includes(ENTITLEMENT.EDUCATION);
    button.classList.toggle('is-locked', !unlocked);
    lock.hidden = unlocked;
    button.setAttribute('aria-label', unlocked ? 'Medical education teaching guide' : 'Medical education teaching guide — locked');
    if (!unlocked && open) closeGuide();
  });

  function openGuide() {
    activate?.();
    app.learning?.set(false);
    app.causalStory?.set(false);
    if (app.story?.active && typeof app.story.exit === 'function') app.story.exit();

    sessionSnapshot = captureGuideSession(app.playback);
    open = true;
    guidePanel.reset();
    ui.classList.add('is-education-guide');
    button.classList.add('is-on');
    button.setAttribute('aria-pressed', 'true');
    requestAnimationFrame(() => guidePanel.focus?.());
  }

  function closeGuide() {
    if (!open) return;
    open = false;
    ui.classList.remove('is-education-guide');
    button.classList.remove('is-on');
    button.setAttribute('aria-pressed', 'false');

    const snapshot = sessionSnapshot;
    sessionSnapshot = null;
    restoreGuideSession(snapshot, app.playback);
    requestAnimationFrame(() => button.focus());
  }

  return closeGuide;
}

function installEducationGate({ app, access, ui, activateLesson }) {
  if (!app.learning) return;
  const meta = app.scene?.constructor?.meta ?? {};
  const expectedLabel = meta.learning?.label ?? 'Lesson';
  const learnButton = [...ui.querySelectorAll('.button-row .btn')].find(
    (button) => button.querySelector('.btn-label.lang-en')?.textContent === expectedLabel
  );
  if (!learnButton) return;

  const lock = el('span', { class: 'feature-lock', 'aria-hidden': 'true', text: '🔒' });
  learnButton.append(lock);

  // Capture runs before ControlPanel's click handler. A locked click therefore
  // opens the purchase surface instead of briefly opening the lesson behind it.
  // An unlocked click also closes any paid guide panel before LearningPanel owns
  // the console, so two teaching modes cannot remain logically active together.
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

  access.subscribe(({ grants }) => {
    const unlocked = grants.includes(ENTITLEMENT.EDUCATION);
    learnButton.classList.toggle('is-locked', !unlocked);
    lock.hidden = unlocked;
    learnButton.setAttribute('aria-label', unlocked ? expectedLabel : `${expectedLabel} — locked`);
  });
}
