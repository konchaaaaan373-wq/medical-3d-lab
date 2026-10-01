import { SCENES } from '../catalog/index.js';
import { RELEASED_SCENES } from '../catalog/release.js';
import { betaUnlocked, routeOpen } from './releaseGate.js';
import { resolveRoute, hashWithView } from './router.js';
import { resolveSceneId, sceneById, systemsWithScenes } from './sceneRegistry.js';
import { installDeparture } from './departure.js';
import { openingMessage } from './destinationName.js';
import { keepFrameForHandover } from './sceneHandover.js';
import { hashWithPurpose } from './purpose.js';
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
 * ## The figure is drawn by the page
 *
 * The lesson's figure is SVG (`lesson.figure`), laid out in the room between
 * the question and the bottom panel. The viewer's canvas stays behind the page
 * as its background and is painted only when its size changes
 * (`viewer.drawEveryFrame = false`); the frame loop still runs, because it is
 * the clock the explanation, the beat and a recording are stepped by.
 *
 * @param {{ viewer: object, scene: object, SceneClass: Function, meta: object, entry: object, ui: HTMLElement }} options
 */
export function mountLessonShell({ viewer, scene, meta, entry, ui }) {
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

  // Nothing in 3D to turn, and nothing to repaint every frame.
  viewer.controls.enabled = false;
  viewer.controls.autoRotate = false;
  viewer.drawEveryFrame = false;

  function stateForPanel() {
    return {
      mode,
      guide: mode === 'explaining' ? null : lesson.guide({ stopped }),
      manual: lesson.controls(),
      caption: mode === 'explaining' && explained ? { ...explained.caption, index: explained.index, total: timeline.length } : null,
      player: { playing, atEnd: t >= lesson.duration },
    };
  }

  viewer.onFrame((dt) => {
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

  viewer.start();

  installDeparture({
    shownHash: window.location.hash,
    language: ui.dataset.lang === 'en' ? 'en' : 'ja',
    describe: (hash) => openingMessage(hash, ui.dataset.lang === 'en' ? 'en' : 'ja', { open: routeOpen(resolveRoute(hash)) }),
    onDepart: () => {
      if (!viewer?.running) return undefined;
      try {
        viewer.snapshot();
        keepFrameForHandover({ canvas: viewer.renderer?.domElement, toHash: window.location.hash, fromSceneId: entry?.id ?? meta?.id ?? null });
      } catch (error) {
        console.warn('[handover] the outgoing frame could not be carried', error);
      }
      viewer.stop();
      return () => viewer.start();
    },
  });

  window.__app = {
    viewer,
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
