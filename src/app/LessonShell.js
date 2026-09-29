import * as THREE from 'three';
import { SCENES } from '../catalog/index.js';
import { RELEASED_SCENES } from '../catalog/release.js';
import { betaUnlocked, routeOpen } from './releaseGate.js';
import { resolveRoute, hashWithView } from './router.js';
import { resolveSceneId, sceneById, systemsWithScenes } from './sceneRegistry.js';
import { installDeparture } from './departure.js';
import { openingMessage } from './destinationName.js';
import { keepFrameForHandover } from './sceneHandover.js';
import { fitPoseToSafeArea, orbitLimitsForSubject } from './framing.js';
import { hashWithPurpose } from './purpose.js';
import { patientExplanationAvailable } from '../access/patientPurpose.js';
import { createSceneSwitcher } from '../components/SceneSwitcher.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createModelScopePanel } from '../components/ModelScopePanel.js';
import { createLessonPanel } from '../components/LessonPanel.js';
import { damp } from '../utils/math.js';
import { prefersReducedMotion } from '../utils/motion.js';
import '../styles/lesson-layout.css';

/**
 * The shell for a lesson: one question, the model, the results, two ways in.
 *
 * `App.js` hands a scene here when it declares `layout: 'lesson'`. Everything
 * the experiment shell builds around a model — the console, the read-out rail,
 * the data view, the pressure-volume plots, the first-visit modal — is left
 * out, because the lesson's whole point is that a first-time reader can tell
 * what the screen is for (Issue #166). What every scene shares is kept: the
 * site header, the title card with its maturity and clinical-review marks, and
 * the way out (`installDeparture`).
 *
 * This file knows nothing about circulations. What the lesson says and does is
 * the scene's (`scene.getLesson()`); this owns the page, the explanation's
 * clock, the camera and the tags' placement.
 *
 * ## Three modes, one model
 *
 * - `idle` — the question, the starting condition on the model, two ways in.
 * - `explaining` — the explanation plays on the model, its words under it and
 *   a player beside them: pause, back, forward, from the start.
 * - `manual` — the reader's buttons.
 *
 * All three drive the scene's one state, so the explanation and the buttons
 * show the same solved conditions. Moving to the buttons during the
 * explanation stops it and **hands the state over**: the reader keeps what was
 * on screen, and the line under the question says what that is and what it is
 * compared with.
 *
 * ## The camera
 *
 * Authored, and the reader does not turn it: the lesson compares two
 * circulations from one angle, and a reader who had orbited would be comparing
 * a different view of one with the other. The subject is fitted into the band
 * the panels leave (`fitPoseToSafeArea`); nothing but short tags stands on it.
 *
 * @param {{ viewer: object, scene: object, SceneClass: Function, meta: object, entry: object, ui: HTMLElement }} options
 */
export function mountLessonShell({ viewer, scene, SceneClass, meta, entry, ui }) {
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
  // The lesson's own sources and limits, inside the one quiet "根拠と限界" line.
  const scopePanel = meta.modelScope ? createModelScopePanel(meta.modelScope) : null;
  const trustFold = titleCard.querySelector('.title-trust-fold');
  if (scopePanel && trustFold) trustFold.append(scopePanel.element);

  const detailHref = hashWithView(`#/${entry?.slug ?? meta.id}`, 'detail');

  // --- the lesson's state ----------------------------------------------------
  let mode = 'idle';
  let t = 0;
  let playing = false;
  /** Set when the reader left the explanation for the buttons, until they press one. */
  let stopped = false;
  let explained = null;
  const timeline = lesson.timeline;

  const panel = createLessonPanel({
    titleCard,
    copy: lesson.copy,
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
      reset: () => {
        stopped = false;
        lesson.reset();
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

  /** The buttons, from wherever the reader is — see "Three modes" above. */
  function startManual() {
    if (mode === 'explaining') {
      stopped = true;
      lesson.handOver();
    } else {
      stopped = false;
      lesson.reset();
    }
    mode = 'manual';
    playing = false;
    requestAnimationFrame(() => panel.focusFirst('manual'));
  }

  // --- the page ---------------------------------------------------------------
  ui.append(...[sceneSwitcher?.element, panel.top, panel.bottom, panel.tags].filter(Boolean));
  languageToggle.init();
  ui.dataset.view = 'lesson';

  // The reader does not move the camera (see above); zoom and turn are off.
  viewer.controls.enabled = false;
  viewer.controls.autoRotate = false;

  // --- framing ------------------------------------------------------------------
  const band = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
  /**
   * The rectangle the panels leave. Under the question, and either above the
   * results (a phone, a narrow window) or left of them (a wide one, where they
   * stand in a column on the right and the model gets the full height).
   */
  const measureBand = () => {
    const width = viewer.container.clientWidth;
    const height = viewer.container.clientHeight;
    const top = panel.top.getBoundingClientRect();
    const bottom = panel.bottom.getBoundingClientRect();
    const beside = bottom.left > width * 0.5;
    band.top = top.bottom + 4;
    band.bottom = beside ? height - 12 : bottom.top - 4;
    band.left = 0;
    band.right = beside ? bottom.left - 8 : width;
    band.width = width;
    band.height = height;
  };

  /**
   * Side by side or one above the other: whichever draws two subjects larger
   * in this band, from the scene's own subject sizes.
   */
  const arrangementFor = () => {
    const w = band.right - band.left;
    const h = Math.max(1, band.bottom - band.top);
    const { row, column } = scene.pairExtents?.() ?? { row: [2, 1], column: [1, 2] };
    const inRow = Math.min(w / row[0], h / row[1]);
    const inColumn = Math.min(w / column[0], h / column[1]);
    return inColumn > inRow * 1.08 ? 'column' : 'row';
  };

  const shot = { position: viewer.camera.position.clone(), target: viewer.controls.target.clone() };
  let framedFor = null;
  const frameKey = () => `${lesson.comparing()}|${scene.arrangement}`;
  function refit({ immediate = false } = {}) {
    measureBand();
    scene.setArrangement?.(arrangementFor());
    const bounds = scene.getSubjectBounds();
    Object.assign(viewer.controls, orbitLimitsForSubject(bounds, viewer.controls));
    const height = band.height || 1;
    const width = band.width || 1;
    const insets = {
      top: band.top / height,
      bottom: Math.max(0, (height - band.bottom) / height),
      left: 0.015,
      right: Math.max(0.015, (width - band.right) / width),
    };
    const pose = fitPoseToSafeArea(
      { position: SceneClass.cameraPose.position.clone(), target: SceneClass.cameraPose.target.clone() },
      { bounds, aspect: viewer.camera.aspect, fovDegrees: viewer.camera.fov, insets, coverage: bounds.coverage, minimumBand: 0.02 }
    );
    shot.position.copy(pose.position);
    shot.target.copy(pose.target);
    framedFor = frameKey();
    if (immediate || prefersReducedMotion()) {
      viewer.camera.position.copy(shot.position);
      viewer.controls.target.copy(shot.target);
    }
  }

  const tween = (dt) => {
    const camera = viewer.camera.position;
    const target = viewer.controls.target;
    if (camera.distanceToSquared(shot.position) < 1e-5 && target.distanceToSquared(shot.target) < 1e-5) return;
    for (const axis of ['x', 'y', 'z']) {
      camera[axis] = damp(camera[axis], shot.position[axis], 4.5, dt);
      target[axis] = damp(target[axis], shot.target[axis], 4.5, dt);
    }
  };

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => refit()) : null;
  observer?.observe(panel.top);
  observer?.observe(panel.bottom);
  viewer.onResize?.(() => refit({ immediate: true }));

  // --- per frame ------------------------------------------------------------------
  const projected = new THREE.Vector3();
  const project = (point) => {
    if (!point) return null;
    projected.copy(point).project(viewer.camera);
    if (projected.z > 1) return null;
    return {
      x: (projected.x * 0.5 + 0.5) * viewer.container.clientWidth,
      y: (-projected.y * 0.5 + 0.5) * viewer.container.clientHeight,
    };
  };
  const withPoints = (items) => items.map((item) => ({ ...item, points: [scene.getLessonAnchor(item.unit, item.part)] }));

  function stateForPanel() {
    return {
      mode,
      guide: mode === 'explaining' ? null : lesson.guide({ mode, stopped }),
      readout: lesson.readout(),
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
      if (mode === 'manual') lesson.manualFrame();
    }
    scene.update(dt);
    if (framedFor !== frameKey()) refit();
    tween(dt);
    panel.render(stateForPanel());
    // With one circulation on a narrow screen its row in the results names
    // it, and the room over the model goes to the words about its parts.
    const chips = !lesson.comparing() && band.right - band.left < 560 ? [] : lesson.chips();
    panel.place({ tags: withPoints(explained ? explained.tags : lesson.tags()), chips: withPoints(chips) }, project, band);
  });

  refit({ immediate: true });
  // Once the page has laid out, measure again.
  requestAnimationFrame(() => refit({ immediate: true }));
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
     * The lesson, for a check: its mode and clock, and the band the model is
     * framed into. The actions are the buttons'; nothing here reaches the
     * model except through the scene's lesson.
     */
    lesson: {
      state: () => ({
        mode,
        t,
        playing,
        stopped,
        step: explained ? timeline[explained.index].id : null,
        tags: panel.tagKeys,
        ...lesson.state(),
      }),
      band: () => ({ ...band }),
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
      mode = 'idle';
      playing = false;
      stopped = false;
      lesson.reset();
      return moved;
    },
  };
  return window.__app;
}
