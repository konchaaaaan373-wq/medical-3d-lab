import * as THREE from 'three';
import { LessonSession } from './lessonSession.js';
import { createLessonFigure } from './LessonFigure.js';
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

/** How long both tubes take to fill "in the same minute" when the reader brings C in. */
export const MANUAL_REFILL_SECONDS = 2.2;

/** How long the results the action changed stay lit after the reader's walk reaches B. */
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
 * ## A diagram, not a heart
 *
 * The lesson is about how three things relate — what the heart sends out per
 * minute, how hard it is for blood to get through the small vessels, and the
 * average pressure — and the first version drew them on a 3D heart, where a
 * reader had to be told which red length was the output and that the yellow
 * fan was the vessels (owner's review, 2026-10-01). So the figure is a circuit
 * diagram (`LessonFigure`, `lessonFigureGeometry.js`) in which each of the
 * three is one part a reader can name on sight: a tube that fills, channels
 * that narrow, a needle. Nothing is drawn in 3D; the viewer's canvas only
 * paints the page's background once (`viewer.drawEveryFrame = false`).
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

  /** Where the viewer's camera rests; nothing is drawn in front of it. */
  static cameraPose = {
    position: new THREE.Vector3(0, 0, 20),
    target: new THREE.Vector3(0, 0, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = 'cardiac-output-lesson';
    this.session = new LessonSession();
    this.phase = 0;
    this.highlight = [];
    this.refill = 1;
    this._manualRefill = null;
    this._attention = 0;
    this._wasAtB = false;
    this._wasComparing = false;
    this.figure = null;
  }

  /** Nothing in 3D: the figure is drawn by the page (`LessonFigure`). */
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
      refill: this.refill,
      squeeze: squeezeAt(this.phase),
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
    this.figure ??= createLessonFigure({ reducedMotion: prefersReducedMotion });
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
      },

      /** The explanation at `t`: the session is set to the scene's condition. */
      explainAt: (t) => {
        const shown = presentationAt(t, session.lastRung);
        session.setRung(shown.rung);
        session.setShowOther(shown.showOther);
        this.highlight = shown.highlight;
        this.refill = shown.refill;
        this._manualRefill = null;
        return { index: shown.index, caption: captionFor(shown.step.id, solved) };
      },

      /**
       * The reader's buttons, a frame at a time: the vessels are lit while they
       * narrow, the two results the action changed for a moment when it
       * arrives, and the two tubes fill together when C comes in.
       */
      manualFrame: (dt) => {
        const atB = session.primaryId === 'B' && !session.showOther;
        if (atB && !this._wasAtB) this._attention = ATTENTION_SECONDS;
        this._wasAtB = atB;
        this._attention = Math.max(0, this._attention - dt);
        // C coming in is the next thing to look at: the tubes, filling.
        if (session.showOther && !this._wasComparing) {
          this._manualRefill = 0;
          this._attention = 0;
        }
        this._wasComparing = session.showOther;
        if (this._manualRefill != null) {
          this._manualRefill = Math.min(MANUAL_REFILL_SECONDS, this._manualRefill + dt);
          this.refill = this._manualRefill / MANUAL_REFILL_SECONDS;
          if (this._manualRefill >= MANUAL_REFILL_SECONDS) this._manualRefill = null;
        } else {
          this.refill = 1;
        }
        this.highlight = session.walking ? ['bed'] : this._attention > 0 ? ['dial', 'tube'] : this._manualRefill != null ? ['tube'] : [];
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
        this.refill = 1;
        this._manualRefill = null;
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
        this._manualRefill = null;
        this.refill = 1;
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
        refill: this.refill,
        problems: session.problems,
      }),
    };
  }

  dispose() {
    this.figure?.element.remove();
  }
}
