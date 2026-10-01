import { SCENES } from '../catalog/index.js';
import { RELEASED_SCENES } from '../catalog/release.js';
import { betaUnlocked, routeOpen } from './releaseGate.js';
import { resolveRoute, hashWithView } from './router.js';
import { resolveSceneId, sceneById, systemsWithScenes } from './sceneRegistry.js';
import { installDeparture } from './departure.js';
import { openingMessage } from './destinationName.js';
import { hashWithPurpose } from './purpose.js';
import { DEFAULT_BACKGROUND_ID, backgroundPresetById } from './inspection.js';
import { patientExplanationAvailable } from '../access/patientPurpose.js';
import { createSceneSwitcher } from '../components/SceneSwitcher.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createModelScopePanel } from '../components/ModelScopePanel.js';
import { createLessonPanel } from '../components/LessonPanel.js';
import '../styles/lesson-layout.css';

/**
 * The shell for a lesson: one question, the scene's figure, and what to do.
 *
 * `App.js` hands a scene here when it declares `layout: 'lesson'`. Everything
 * the experiment shell builds around a model — the console, the read-out rail,
 * the data view, the pressure-volume plots, the first-visit modal — is left
 * out, because the lesson's whole point is that a first-time reader can tell
 * what the screen is for (Issue #166). What every scene shares is kept: the
 * site header, the title card with its maturity and clinical-review marks, and
 * the way out (`installDeparture`).
 *
 * This file knows nothing about circulations. What the lesson says, draws and
 * does is the scene's (`scene.getLesson()`); this owns the page and the
 * explanation's clock.
 *
 * ## Two modes, one model
 *
 * - `manual` — where the lesson opens: the reader's buttons, and ▶ beside
 *   them. The first screen *is* the experiment, waiting for its first press.
 * - `explaining` — the explanation plays on the figure, its words under it
 *   and a player beside them: pause, back, forward, from the start.
 *
 * Both drive the scene's one state, so the explanation and the buttons show
 * the same solved conditions. Moving to the buttons during the explanation
 * stops it and **hands the state over**: the reader keeps what was on screen,
 * and the line under the figure says what that is and what it is compared
 * with.
 *
 * ## The figure is drawn by the page — no renderer
 *
 * The lesson's figure is SVG (`lesson.figure`), laid out in the room between
 * the question and the bottom panel. Nothing is drawn in 3D, so the shell makes
 * no WebGL context at all (`App.js` decides on the layout before the renderer):
 * a browser that cannot make one still opens the lesson. Its clock is one
 * `requestAnimationFrame` loop (`createFrameClock`) — what the explanation, the
 * beat and a recording are stepped by.
 *
 * @param {{ scene: object, SceneClass: Function, meta: object, entry: object, ui: HTMLElement }} options
 */
export function mountLessonShell({ scene, meta, entry, ui }) {
  const lesson = scene.getLesson();

  // --- what every scene shares ---------------------------------------------
  const sceneSwitcher = createSceneSwitcher({
    groups: systemsWithScenes(betaUnlocked() ? SCENES : RELEASED_SCENES),
    currentId: resolveSceneId(),
    showLab: betaUnlocked(),
    purpose: {
      available: patientExplanationAvailable(sceneById(resolveSceneId())),
      onChange: (purpose) => {
        const next = hashWithPurpose(window.location.hash, purpose);
        if (next !== window.location.hash) window.location.hash = next;
      },
    },
  });
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  // In the header, where every other scene has it.
  sceneSwitcher?.dock?.('language', languageToggle.element);
  const titleCard = createTitleCard(meta);
  // The lesson's own sources and limits, inside the one quiet 「このモデルについて」
  // line — placed as every other scene places it (`App.js`): part of what the
  // fold opens, with the review row after it.
  const scopePanel = meta.modelScope ? createModelScopePanel(meta.modelScope) : null;
  const trustFold = titleCard.querySelector('.title-trust-fold');
  if (scopePanel && trustFold) {
    const host = trustFold.querySelector('.title-about-body') ?? trustFold;
    const badges = host.querySelector('.title-trust-badges');
    const close = host.querySelector('.title-about-close');
    const anatomy = host.querySelector('.title-about-anatomy');
    scopePanel.embedIn(trustFold, host);
    if (anatomy) host.append(anatomy);
    if (badges) host.append(badges);
    if (close) host.append(close);
  }

  const detailHref = hashWithView(`#/${entry?.slug ?? meta.id}`, 'detail');

  // --- the lesson's state ----------------------------------------------------
  let mode = 'manual';
  let t = 0;
  let playing = false;
  /** Set when the reader left the explanation for the buttons, until they press one. */
  let stopped = false;
  let explained = null;
  const timeline = lesson.timeline;

  const panel = createLessonPanel({
    titleCard,
    copy: lesson.copy,
    figure: lesson.figure.element,
    detailHref,
    on: {
      play: () => startExplanation(),
      tryIt: () => startManual(),
      toggleConstrict: () => {
        stopped = false;
        lesson.toggleConstrict();
      },
      toggleOther: () => {
        stopped = false;
        lesson.toggleOther();
      },
      togglePlay: () => {
        if (!playing && t >= lesson.duration) t = 0;
        playing = !playing;
      },
      restart: () => {
        t = 0;
        playing = true;
      },
      previous: () => {
        const index = lesson.stepIndexAt(t);
        const into = t - timeline[index].at;
        t = into > 1.5 || index === 0 ? timeline[index].at : timeline[index - 1].at;
      },
      next: () => {
        const index = lesson.stepIndexAt(t);
        if (index >= timeline.length - 1) {
          t = lesson.duration;
          playing = false;
        } else {
          t = timeline[index + 1].at;
        }
      },
    },
  });

  function startExplanation() {
    mode = 'explaining';
    stopped = false;
    t = 0;
    playing = true;
    lesson.reset();
    requestAnimationFrame(() => panel.focusFirst('explaining'));
  }

  /** The buttons, from the explanation — see "Two modes" above. */
  function startManual() {
    if (mode === 'explaining') {
      stopped = true;
      lesson.handOver();
    }
    mode = 'manual';
    playing = false;
    requestAnimationFrame(() => panel.focusFirst('manual'));
  }

  // --- the page ---------------------------------------------------------------
  ui.append(...[sceneSwitcher?.element, panel.top, panel.figure, panel.bottom].filter(Boolean));
  languageToggle.init();
  ui.dataset.view = 'lesson';

  const clock = createFrameClock();
  // No canvas paints a background behind the page, so the page is its own
  // ground: the default preset's colour, as every scene paints it under its
  // canvas (`paintPageGround` in `App.js`).
  document.documentElement.style.setProperty('--page-ground', backgroundPresetById(DEFAULT_BACKGROUND_ID).backdrop.bottom);

  function stateForPanel() {
    return {
      mode,
      guide: mode === 'explaining' ? null : lesson.guide({ stopped }),
      manual: lesson.controls(),
      caption: mode === 'explaining' && explained ? { ...explained.caption, index: explained.index, total: timeline.length } : null,
      player: { playing, atEnd: t >= lesson.duration },
    };
  }

  clock.onFrame((dt) => {
    if (mode === 'explaining') {
      if (playing) {
        t = Math.min(lesson.duration, t + dt);
        if (t >= lesson.duration) playing = false;
      }
      explained = lesson.explainAt(t);
    } else {
      explained = null;
      lesson.manualFrame(dt);
    }
    scene.update(dt);
    lesson.figure.render(dt);
    panel.render(stateForPanel());
  });

  clock.start();

  installDeparture({
    shownHash: window.location.hash,
    language: ui.dataset.lang === 'en' ? 'en' : 'ja',
    describe: (hash) => openingMessage(hash, ui.dataset.lang === 'en' ? 'en' : 'ja', { open: routeOpen(resolveRoute(hash)) }),
    // No frame is carried to the next document: there is no canvas, and a
    // picture of the page's background was all the old renderer could give.
    onDepart: () => {
      if (!clock.running) return undefined;
      clock.stop();
      return () => clock.start();
    },
  });

  window.__app = {
    scene,
    meta,
    header: sceneSwitcher,
    titleCard,
    /**
     * The lesson, for a check: its mode and clock. The actions are the
     * buttons'; nothing here reaches the model except through the scene's
     * lesson.
     */
    lesson: {
      state: () => ({
        mode,
        t,
        playing,
        stopped,
        step: explained ? timeline[explained.index].id : null,
        ...lesson.state(),
      }),
      seek: (seconds) => {
        t = Math.min(lesson.duration, Math.max(0, seconds));
      },
      /** The clock, for a recording that steps it a fixed time per frame. */
      clock,
      pause: () => {
        playing = false;
      },
      duration: lesson.duration,
      timeline,
    },
    /** Put the model back where the lesson opens. */
    resetModelControls: () => {
      const moved = lesson.moved();
      mode = 'manual';
      playing = false;
      stopped = false;
      lesson.reset();
      return moved;
    },
  };
  return window.__app;
}

/**
 * The lesson's clock: one `requestAnimationFrame` loop handing each listener
 * the seconds since the last frame, at most 0.1 (as the viewer's was, so a tab
 * coming back from the background does not jump the explanation to its end).
 * `step(dt)` runs one frame by hand, for a recording on a fixed clock.
 */
function createFrameClock() {
  const listeners = [];
  let handle = null;
  let last = null;
  const run = (dt) => {
    for (const listener of listeners) listener(dt);
  };
  const tick = (now) => {
    handle = requestAnimationFrame(tick);
    const dt = last == null ? 0 : Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    run(dt);
  };
  return {
    onFrame: (listener) => listeners.push(listener),
    start() {
      if (handle != null) return;
      last = null;
      handle = requestAnimationFrame(tick);
    },
    stop() {
      if (handle != null) cancelAnimationFrame(handle);
      handle = null;
    },
    step: (dt) => run(dt),
    get running() {
      return handle != null;
    },
  };
}
