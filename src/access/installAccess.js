import { createPatientGuidePanel } from '../components/PatientGuidePanel.js';
import { patientGuideFor } from '../data/patientGuides.js';
import { el } from '../utils/dom.js';
import { ENTITLEMENT } from './policy.js';

/**
 * Adds paid use-case modes around an already-created scene without changing the
 * medical scene/model itself.
 *
 * @param {{ app:any, access:any, ui:HTMLElement, sceneId:string }} options
 */
export function installAccess({ app, access, ui, sceneId }) {
  mountAccountButton(access, ui);
  const guide = patientGuideFor(sceneId);
  if (guide) installPatientGuide({ app, access, ui, guide });
  installEducationGate({ app, access, ui });
}

function mountAccountButton(access, ui) {
  const nav = ui.querySelector('.global-scene-nav');
  const trigger = nav?.querySelector('.global-nav-trigger');
  if (!nav || !trigger || access.accountButton.isConnected) return;
  nav.insertBefore(access.accountButton, trigger);
}

function installPatientGuide({ app, access, ui, guide }) {
  const row = ui.querySelector('.button-row');
  const consolePanel = ui.querySelector('.console');
  if (!row || !consolePanel) return;

  let open = false;
  const guidePanel = createPatientGuidePanel({
    guide,
    setProgress: (value) => {
      app.playback.pause();
      app.playback.set(value);
    },
    onExit: closeGuide,
  });
  consolePanel.append(guidePanel.element);

  const lock = el('span', { class: 'feature-lock', 'aria-hidden': 'true', text: '🔒' });
  const button = el('button', { class: 'btn secondary paid-mode-button', type: 'button' }, [
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
  });

  function openGuide() {
    app.learning?.set(false);
    app.causalStory?.set(false);
    if (app.story?.active && typeof app.story.exit === 'function') app.story.exit();
    guidePanel.reset();
    open = true;
    ui.classList.add('is-patient-guide');
    button.classList.add('is-on');
    button.setAttribute('aria-pressed', 'true');
  }

  function closeGuide() {
    if (!open) return;
    open = false;
    ui.classList.remove('is-patient-guide');
    button.classList.remove('is-on');
    button.setAttribute('aria-pressed', 'false');
  }
}

function installEducationGate({ app, access, ui }) {
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
  learnButton.addEventListener(
    'click',
    (event) => {
      if (access.has(ENTITLEMENT.EDUCATION)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      access.open(ENTITLEMENT.EDUCATION);
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
