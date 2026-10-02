import * as THREE from 'three';
import { LessonSession } from './lessonSession.js';
import { createLessonFigure } from './LessonFigure.js';
import { createLessonStage3D } from './LessonStage3D.js';
import { squeezeAt } from './lessonFigureGeometry.js';
import { advanceCardiacPhase } from '../../../../models/cardiacMechanics.js';
import {
  LESSON_ACTIONS,
  LESSON_CONDITION_COPY,
  LESSON_DISCLAIMER_SHORT,
  LESSON_NOTE,
  LESSON_QUESTION,
  LESSON_SCOPE,
  LESSON_VIEW_NAMES,
} from '../../../../data/cardiacOutputLesson.js';
import {
  LESSON_DURATION,
  LESSON_TIMELINE,
  allGuides,
  captionFor,
  figureSummary,
  guideFor,
  presentationAt,
  stepIndexAt,
  stripsFor,
} from './lessonStoryboard.js';
import { DISCLAIMER, DISCLAIMER_JA } from '../../../../data/cardiacOutput.js';
import { prefersReducedMotion } from '../../../../utils/motion.js';

/** How long the results stay lit after the reader's walk reaches B, or after C comes in beside it. */
const ATTENTION_SECONDS = 2.6;

/**
 * The introductory lesson on the cardiac-output model: "blood pressure went
 * up — did the heart send out more?"
 *
 * It is the first thing `#/cardiac-output` shows. The full model — four
 * inputs, every figure, the pressure-volume loop, its own explanation — is
 * unchanged, one link away at `#/cardiac-output?view=detail`
 * (`CardiacOutputScene`). The two share the solver; they do not share a
 * screen, because putting a free experiment, a comparison, an explanation and
 * labels on one screen is what left a first-time reader not knowing what the
 * screen was for (Issue #166).
 *
 * ## A circulation in 3D, one camera
 *
 * The lesson is about how three things relate — what the heart sends out per
 * minute, how hard it is for blood to get through the small vessels, and the
 * average pressure — and the figure is the circulation itself, in 3D: a heart
 * that pumps, red cells that flow, a bundle of small vessels that narrows, a
 * dial and a jug (`LessonStage3D`, `lessonModel3D.js`). The owner asked for the
 * model to carry the lesson and the words only to confirm it (2026-10-02),
 * after a flat diagram had to be read to be understood.
 *
 * The stage makes its own small renderer in the figure's place on the page;
 * the shell makes no viewer for this scene (`App.js` decides on the layout
 * first), so `build()` and `cameraPose` stay only so the scene has the shape
 * every scene has. Where a browser cannot make a WebGL context the same
 * circulations are drawn flat (`LessonFigure`), and the lesson still opens.
 *
 * ## One state
 *
 * Everything drawn and every figure shown is read from `LessonSession`, the
 * state the explanation and the reader's buttons drive alike. A, B and C share
 * a heart rate (the lesson's claims check holds that), so one beat clock drives
 * every heart on screen and two circulations are always at the same moment of
 * the beat.
 */
export class CardiacOutputLessonScene {
  static meta = {
    id: 'cardiac-output',
    title: 'Cardiac output',
    titleJa: '心拍出量',
    subtitle: LESSON_QUESTION.en,
    subtitleJa: LESSON_QUESTION.ja,
    /** Declared, not detected: the shell mounts `LessonShell` for this. */
    layout: 'lesson',
    viewName: LESSON_VIEW_NAMES.lesson,
    progression: { enabled: false },
    titleCard: { foldTrust: true },
    stages: [{ id: 'lesson', at: 0, label: 'Introduction', labelJa: '入門', summary: '', summaryJa: '' }],
    legend: [],
    modelScope: LESSON_SCOPE,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: LESSON_DISCLAIMER_SHORT.en,
    disclaimerShortJa: LESSON_DISCLAIMER_SHORT.ja,
  };

  /** The lesson has no 3D to turn. */
  static allowAutoRotate = false;

  /** The shape every scene has; no camera looks at this one (no renderer is made). */
  static cameraPose = {
    position: new THREE.Vector3(0, 0, 20),
    target: new THREE.Vector3(0, 0, 0),
  };

  /**
   * @param {{ solve?: (input: object) => object }} [options] the solver, for a test
   */
  constructor({ solve } = {}) {
    this.root = new THREE.Group();
    this.root.name = 'cardiac-output-lesson';
    this.session = new LessonSession(solve ? { solve } : {});
    // Every sentence the lesson says is a claim about the solved beats ("about
    // the same pressure", "clearly different output"). If the solver no longer
    // supports them, or a step did not solve, the lesson is not shown at all —
    // the scene-failure page says so — rather than shown saying them anyway.
    // The tests hold the claims for today's solver; this holds them for the one
    // that ships (code review, 2026-10-01).
    if (this.session.problems.length) {
      throw new Error(`cardiac-output lesson: its claims do not hold — ${this.session.problems.join('; ')}`);
    }
    this.phase = 0;
    this.highlight = [];
    this._attention = 0;
    this._wasAtB = false;
    this._wasComparing = false;
    this.figure = null;
  }

  /** Nothing in the shell's scene: the figure draws itself in its own place on the page (`LessonStage3D`). */
  build() {
    return this.root;
  }

  /** This scene has one state, not a progression axis. */
  setProgress() {}

  /**
   * The beat's clock and the reader's walk. The explanation sets the session
   * from its own clock before this runs (`explainAt`).
   *
   * @param {number} dt seconds
   */
  update(dt) {
    this.session.tick(dt);
    this.phase = advanceCardiacPhase(this.phase, dt, this.session.primary.metrics.heartRatePerMin);
  }

  /** The figure for this frame, from the session. */
  _drawFigure(dt) {
    if (!this.figure) return;
    const strips = stripsFor(this.session);
    this.figure.render({
      strips,
      highlight: this.highlight,
      squeeze: squeezeAt(this.phase),
      phase: this.phase,
      summary: figureSummary(strips),
      dt,
    });
  }

  /**
   * The lesson, for `LessonShell`: its words, its explanation, its figure and
   * the things a reader may do. The shell owns the clock and the page;
   * everything about circulations is here, and every change goes through the
   * one `LessonSession` — the explanation and the buttons alike.
   */
  getLesson() {
    const session = this.session;
    // The circulations in 3D; where this browser cannot make a WebGL context,
    // the same circulations as a flat diagram (`LessonFigure`).
    this.figure ??= createLessonStage3D({ reducedMotion: prefersReducedMotion }) ?? createLessonFigure({ reducedMotion: prefersReducedMotion });
    const solved = session.solved;
    return {
      copy: {
        question: LESSON_QUESTION,
        actions: LESSON_ACTIONS,
        note: LESSON_NOTE,
        conditions: LESSON_CONDITION_COPY,
        // Every caption and every guide line, for the page to keep their place
        // as tall as the tallest: the figure above never changes size because
        // a sentence did.
        captions: LESSON_TIMELINE.map((step) => captionFor(step.id, solved)),
        guides: allGuides(solved),
      },
      duration: LESSON_DURATION,
      timeline: LESSON_TIMELINE.map(({ id, at, until }) => ({ id, at, until })),
      stepIndexAt,
      figure: {
        element: this.figure.element,
        render: (dt) => this._drawFigure(dt),
        /** The 3D figure as a reader sees it, for a check; null for the flat one. */
        probe: () => this.figure.probe?.() ?? null,
      },

      /** The explanation at `t`: the session is set to the scene's condition. */
      explainAt: (t) => {
        const shown = presentationAt(t, session.lastRung);
        session.setRung(shown.rung);
        session.setShowOther(shown.showOther);
        this.highlight = shown.highlight;
        return { index: shown.index, caption: captionFor(shown.step.id, solved) };
      },

      /**
       * The reader's buttons, a frame at a time: the vessels are lit while they
       * narrow; the two results for a moment when the walk arrives at B, and
       * again — on both circulations — when C comes in beside it. C arrives
       * as it is, flowing; nothing fills from empty.
       */
      manualFrame: (dt) => {
        const atB = session.primaryId === 'B' && !session.showOther;
        const cameIn = (atB && !this._wasAtB) || (session.showOther && !this._wasComparing);
        if (cameIn) this._attention = ATTENTION_SECONDS;
        this._wasAtB = atB;
        this._wasComparing = session.showOther;
        this._attention = Math.max(0, this._attention - dt);
        this.highlight = session.walking ? ['bed'] : this._attention > 0 ? ['dial', 'tube'] : [];
      },

      guide: ({ stopped }) =>
        guideFor({ primaryId: session.primaryId, targetId: session.targetId, showOther: session.showOther, solved, stopped }),
      controls: () => ({
        targetId: session.targetId,
        showOther: session.showOther,
        canShowOther: session.canShowOther,
        walking: session.walking,
      }),

      /** Back to A, alone, nothing lit. */
      reset: () => {
        session.reset();
        this.highlight = [];
        this._attention = 0;
        this._wasAtB = false;
        this._wasComparing = false;
      },
      toggleConstrict: () => session.setPrimary(session.targetId === 'B' ? 'A' : 'B'),
      /** Refused anywhere but at B (`LessonSession.canShowOther`). */
      toggleOther: () => session.setShowOther(!session.showOther),
      /**
       * The explanation hands the model to the reader. The buttons know A and
       * B, not the rungs between, so a walk that was on its way to B finishes
       * there — and the guide says so.
       */
      handOver: () => {
        if (session.primaryId === null) session.setPrimary('B');
        this._wasAtB = session.primaryId === 'B' && !session.showOther;
        this._wasComparing = session.showOther;
        this.highlight = [];
      },
      moved: () => session.rung !== 0 || session.showOther,
      state: () => ({
        primaryId: session.primaryId,
        showOther: session.showOther,
        canShowOther: session.canShowOther,
        walking: session.walking,
        rung: session.rung,
        lastRung: session.lastRung,
        problems: session.problems,
      }),
    };
  }

  dispose() {
    // The 3D stage holds a WebGL context of its own; the flat figure is only an element.
    if (this.figure?.dispose) this.figure.dispose();
    else this.figure?.element.remove();
  }
}
