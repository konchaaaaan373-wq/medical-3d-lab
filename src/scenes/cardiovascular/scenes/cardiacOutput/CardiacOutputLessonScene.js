import * as THREE from 'three';
import { LessonCirculation, LESSON_VIEW_DIRECTION, UNIT_BOX, UNIT_HULL, DWELL } from './lessonCirculation.js';
import { LessonSession } from './lessonSession.js';
import { REFERENCE_GEOMETRY } from '../../../../models/cardiacOutput.js';
import { advanceCardiacPhase, myocardialVolumeFor } from '../../../../models/cardiacMechanics.js';
import {
  BEFORE_MARK,
  LESSON_ACTIONS,
  LESSON_CONDITION_COPY,
  LESSON_DISCLAIMER_SHORT,
  LESSON_QUESTION,
  LESSON_READOUT,
  LESSON_SCOPE,
  LESSON_VIEW_NAMES,
} from '../../../../data/cardiacOutputLesson.js';
import {
  LESSON_DURATION,
  LESSON_TIMELINE,
  captionFor,
  guideFor,
  presentationAt,
  readoutFor,
  stepIndexAt,
  tagWords,
} from './lessonStoryboard.js';
import { DISCLAIMER, DISCLAIMER_JA } from '../../../../data/cardiacOutput.js';
import { disposeObject } from '../../../../utils/dispose.js';

/** The middle of a unit's drawing, in its own frame: what it is turned about and placed by. */
const UNIT_CENTRE = UNIT_BOX.min.clone().add(UNIT_BOX.max).multiplyScalar(0.5);

/** The screen's right and up, for a camera looking along `LESSON_VIEW_DIRECTION`. */
const SCREEN_FORWARD = LESSON_VIEW_DIRECTION.clone().negate();
const SCREEN_RIGHT = SCREEN_FORWARD.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
const SCREEN_UP = SCREEN_RIGHT.clone().cross(SCREEN_FORWARD).normalize();

/**
 * The introductory lesson on the cardiac-output model: "blood pressure went
 * up — did the heart send out more?"
 *
 * It is the first thing `#/cardiac-output` shows. The full model — four
 * inputs, every figure, the pressure-volume loop, its own explanation — is
 * unchanged, one link away at `#/cardiac-output?view=detail`
 * (`CardiacOutputScene`). The two share the solver and the heart; they do not
 * share a screen, because putting a free experiment, a comparison, an
 * explanation and labels on one screen is what left a first-time reader not
 * knowing what the screen was for (Issue #166).
 *
 * ## What is drawn
 *
 * One circulation (`LessonCirculation`) for A or B, and a second beside it
 * for C when the lesson compares them. Both are drawn from `LessonSession`,
 * the state the explanation and the reader's buttons drive alike, and both
 * beat on one clock: A, B and C share a heart rate (the lesson's claims check
 * holds that), so the two hearts are always at the same moment of the beat.
 *
 * ## The same view of both
 *
 * Two circulations side by side under one perspective camera are seen from
 * slightly different angles — the left one from its right, the right one from
 * its left — and a reader comparing them would be comparing that too. So each
 * unit is turned, every frame, until the camera sees it from exactly
 * `LESSON_VIEW_DIRECTION` in its own frame. What differs between the two is
 * then only what the model solved.
 *
 * ## Myocardial volume
 *
 * Computed once from the reference condition and held for all three, as the
 * full model does: every difference here is acute, and a muscle volume
 * recomputed from each condition's filling would grow myocardium out of a
 * resistance change.
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

  /** The lesson's view is authored: the reader does not turn it (see `LessonShell`). */
  static allowAutoRotate = false;

  static cameraPose = {
    position: new THREE.Vector3(1.2, -1.1, 0.3).addScaledVector(LESSON_VIEW_DIRECTION, 32),
    target: new THREE.Vector3(1.2, -1.1, 0.3),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = 'cardiac-output-lesson';
    this.session = new LessonSession();
    this.phase = 0;
    this.clock = 0;
    this.arrangement = 'row';
    this._hold = false;
    this._holding = false;
    this._drawnKey = null;
    this.myocardialVolumeMl = myocardialVolumeFor({
      edvMl: this.session.other.metrics.edvMl,
      wallMm: REFERENCE_GEOMETRY.wallMm,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
  }

  build() {
    const compact = window.innerWidth < 720 || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.primary = new LessonCirculation({ name: 'circulation-primary', compact, myocardialVolumeMl: this.myocardialVolumeMl });
    this.other = new LessonCirculation({ name: 'circulation-other', compact, myocardialVolumeMl: this.myocardialVolumeMl });
    this.other.visible = false;
    this.root.add(this._createLights(), this.primary, this.other);
    this._offResize = this.viewer?.onResize?.((camera, renderer) => {
      this.primary.syncViewport(camera, renderer);
      this.other.syncViewport(camera, renderer);
    });
    this.setArrangement(this.arrangement);
    this._applySession();
    this.primary.update({ phase: this.phase, dt: 0, clock: 0, frozen: true });
    return this.root;
  }

  /** The full model's three-point light: the same muscle under the same camera. */
  _createLights() {
    const group = new THREE.Group();
    group.name = 'lights';
    group.add(new THREE.HemisphereLight(0xffe3de, 0x18202e, 0.45));
    const key = new THREE.DirectionalLight(0xfff1e4, 2.3);
    key.position.set(7, 10, 12);
    const rim = new THREE.DirectionalLight(0x9bc2ff, 0.28);
    rim.position.set(-10, 4, -9);
    const fill = new THREE.PointLight(0xffc5c0, 60, 60, 2);
    fill.position.set(-5, -5, 9);
    group.add(key, rim, fill);
    return group;
  }

  /** This scene has one state, not a progression axis. */
  setProgress() {}

  /**
   * Side by side ('row') or one above the other ('column') — the shell picks
   * whichever gives two circulations more room in the band it has.
   *
   * @param {'row'|'column'} arrangement
   */
  setArrangement(arrangement) {
    this.arrangement = arrangement === 'column' ? 'column' : 'row';
    const size = UNIT_BOX.max.clone().sub(UNIT_BOX.min);
    // Along the screen's own axes, not the world's: the camera looks from the
    // right and a little above, so two units set out along world x stand at
    // different distances from it, and the nearer one is drawn larger and
    // lower — a difference the reader would take for the model's.
    const offset =
      this.arrangement === 'row'
        ? SCREEN_RIGHT.clone().multiplyScalar((size.x + 1.2) / 2)
        : SCREEN_UP.clone().multiplyScalar((size.y + 1.4) / 2);
    // Primary on the left or on top; C on the right or below. A slot is where
    // the unit's box centre stands; `_faceCamera` turns the unit about it.
    this.primary.userData.slot = this.arrangement === 'row' ? offset.clone().negate() : offset.clone();
    this.other.userData.slot = this.arrangement === 'row' ? offset.clone() : offset.clone().negate();
    for (const unit of [this.primary, this.other]) {
      unit.quaternion.identity();
      unit.position.copy(unit.userData.slot).sub(UNIT_CENTRE);
    }
  }

  /**
   * How much room two circulations need side by side and one above the
   * other, in world units — for the shell to pick the arrangement that draws
   * them larger in the band it has.
   */
  pairExtents() {
    const size = UNIT_BOX.max.clone().sub(UNIT_BOX.min);
    return { row: [size.x * 2 + 1.2, size.y], column: [size.x, size.y * 2 + 1.4] };
  }

  /** Pushes the session's state into the drawing, when it has changed. */
  _applySession() {
    const key = this.session.key();
    if (key === this._drawnKey) return false;
    this._drawnKey = key;
    this.primary.setSolved(this.session.primary, this.session.reference);
    this.other.visible = this.session.showOther;
    if (this.session.showOther) this.other.setSolved(this.session.other, null);
    return true;
  }

  /**
   * Presentation only: which parts are pointed at, and whether the beat is
   * held at the moment of comparison. No value of the model changes.
   *
   * @param {{ primary?: string[], other?: string[], hold?: boolean }} presentation
   */
  setPresentation({ primary = [], other = [], hold = false } = {}) {
    this.primary.setHighlight(primary);
    this.other.setHighlight(other);
    this._hold = Boolean(hold);
    if (!this._hold) this._holding = false;
  }

  /**
   * The moment two circulations are compared at: just after the end of
   * ejection, while every stroke on screen is whole and still at its valve.
   */
  comparisonPhase() {
    const shown = [this.session.primary, this.session.reference, this.session.showOther ? this.session.other : null].filter(Boolean);
    const end = Math.max(...shown.map((result) => result.metrics.ejectionEndPhase));
    return (end + DWELL * 0.25) % 1;
  }

  /** Whether the beat is standing still at the moment of comparison. */
  get holding() {
    return this._holding;
  }

  update(dt) {
    this.session.tick(dt);
    this._applySession();
    this._advancePhase(dt);
    if (!this._holding) this.clock += dt;
    this._faceCamera(this.primary);
    if (this.other.visible) this._faceCamera(this.other);
    const frame = { phase: this.phase, dt: this._holding ? 0 : dt, clock: this.clock, frozen: this._holding };
    this.primary.update(frame);
    if (this.other.visible) this.other.update(frame);
  }

  /**
   * The beat's clock, at the solved rate. While a hold is asked for it runs on
   * until it reaches the moment of comparison and stops there — it never jumps.
   */
  _advancePhase(dt) {
    const rate = this.session.primary.metrics.heartRatePerMin;
    const next = advanceCardiacPhase(this.phase, dt, rate);
    if (!this._hold) {
      this.phase = next;
      this._holding = false;
      return;
    }
    const target = this.comparisonPhase();
    const toTarget = (target - this.phase + 1) % 1;
    const step = (next - this.phase + 1) % 1;
    if (this._holding || toTarget <= step) {
      this.phase = target;
      this._holding = true;
    } else {
      this.phase = next;
    }
  }

  /** Turn a unit about its slot so the camera sees it along `LESSON_VIEW_DIRECTION` in its own frame. */
  _faceCamera(unit) {
    const camera = this.viewer?.camera;
    const slot = unit.userData.slot;
    if (!camera || !slot) return;
    const toCamera = camera.position.clone().sub(slot);
    if (toCamera.lengthSq() < 1e-6) return;
    unit.quaternion.setFromUnitVectors(LESSON_VIEW_DIRECTION, toCamera.normalize());
    unit.position.copy(slot).sub(UNIT_CENTRE.clone().applyQuaternion(unit.quaternion));
  }

  /**
   * A named point, in world space, for a tag or a chip.
   *
   * @param {'primary'|'other'} unit
   * @param {'heart'|'ejected'|'bed'|'bedTip'|'gauge'|'chip'} part
   */
  getLessonAnchor(unit, part) {
    const target = unit === 'other' ? this.other : this.primary;
    if (unit === 'other' && !this.other.visible) return null;
    return target.anchor(part);
  }

  /**
   * The box the shell frames: the circulations on screen. Declared per unit
   * rather than measured from the meshes, so the camera does not breathe with
   * the beat, and fixed per arrangement, so nothing refits when a value moves.
   */
  getSubjectBounds() {
    const units = [this.primary, ...(this.session.showOther ? [this.other] : [])];
    const corners = [];
    for (const unit of units) {
      const slot = unit.userData.slot ?? UNIT_CENTRE;
      for (const point of UNIT_HULL) corners.push(slot.clone().add(point).sub(UNIT_CENTRE));
    }
    const box = new THREE.Box3().setFromPoints(corners);
    return { centre: box.getCenter(new THREE.Vector3()), corners, coverage: 0.97 };
  }

  /**
   * The lesson, for `LessonShell`: its words, its explanation and the two
   * things a reader may do. The shell owns the clock, the page and the camera;
   * everything about circulations is here, and every change goes through the
   * one `LessonSession` — the explanation and the buttons alike.
   */
  getLesson() {
    const session = this.session;
    /**
     * Where each part's words may stand, best first: beside the part on the
     * side away from the rest of the drawing — and, where that side runs out of
     * screen (right of the vessels, on a phone), below the part's lower end,
     * rather than pushed back over the part it names.
     */
    const PLACES = {
      heart: [{ part: 'heart', side: 'left' }],
      ejected: [{ part: 'ejected', side: 'up' }],
      bed: [
        { part: 'bed', side: 'right' },
        { part: 'bedTip', side: 'down' },
      ],
      gauge: [{ part: 'gauge', side: 'up' }],
    };
    const tag = (key, unit, part, words) => {
      const places = PLACES[part] ?? [{ part, side: 'up' }];
      return { key, unit, part, side: places[0].side, places, text: tagWords(words, session.solved) };
    };
    const chip = (key, id, unit) => {
      const copy = LESSON_CONDITION_COPY[id];
      return {
        key,
        unit,
        part: 'chip',
        letter: copy?.letter ?? '…',
        text: copy?.role ?? LESSON_READOUT.changing,
        tone: copy?.tone ?? 'changing',
      };
    };
    return {
      copy: {
        question: LESSON_QUESTION,
        actions: LESSON_ACTIONS,
        readout: LESSON_READOUT,
        conditions: LESSON_CONDITION_COPY,
        before: BEFORE_MARK,
      },
      duration: LESSON_DURATION,
      timeline: LESSON_TIMELINE.map(({ id, at, until }) => ({ id, at, until })),
      stepIndexAt,

      /**
       * The explanation at `t`: the model is set to the scene's condition and
       * the drawing to its pointers and hold. Returns what to say and where.
       */
      explainAt: (t) => {
        const shown = presentationAt(t, session.lastRung);
        session.setRung(shown.rung);
        session.setShowOther(shown.showOther);
        this.setPresentation({ primary: shown.highlight, other: shown.showOther ? shown.highlight : [], hold: shown.hold });
        return {
          index: shown.index,
          caption: captionFor(shown.step.id, session.solved),
          tags: shown.tags.map((spec) => tag(`${shown.step.id}-${spec.id}`, spec.unit, spec.part, spec.words)),
        };
      },

      /** The reader's buttons: the pointer follows a walk, and the beat runs. */
      manualFrame: () => {
        this.setPresentation({ primary: session.walking ? ['bed'] : [] });
      },

      /** The words on the model outside the explanation. */
      tags: () => {
        if (session.primaryId === 'A' && !session.showOther && !session.walking) {
          return [
            tag('id-heart', 'primary', 'heart', 'heart'),
            tag('id-ejected', 'primary', 'ejected', 'ejected'),
            tag('id-bed', 'primary', 'bed', 'bed'),
            tag('id-gauge', 'primary', 'gauge', 'gauge'),
          ];
        }
        if (session.walking) return [tag('walk-bed', 'primary', 'bed', 'bedNarrowing')];
        if (session.primaryId === 'B' && !session.showOther) {
          return [tag('b-gauge', 'primary', 'gauge', 'gaugeUp'), tag('b-ejected', 'primary', 'ejected', 'ejectedChange')];
        }
        return [];
      },

      /** A chip over each circulation: which one it is. */
      chips: () => {
        const chips = [chip(`chip-primary-${session.primaryId ?? '…'}`, session.primaryId, 'primary')];
        if (session.showOther) chips.push(chip('chip-other', 'C', 'other'));
        return chips;
      },
      comparing: () => session.showOther,

      guide: ({ mode, stopped }) =>
        guideFor({ mode, primaryId: session.primaryId, targetId: session.targetId, showOther: session.showOther, solved: session.solved, stopped }),
      readout: () => readoutFor(session),
      controls: () => ({ targetId: session.targetId, showOther: session.showOther }),

      /** Back to A, alone, nothing pointed at. */
      reset: () => {
        session.reset();
        this.setPresentation({});
      },
      toggleConstrict: () => session.setPrimary(session.targetId === 'B' ? 'A' : 'B'),
      toggleOther: () => session.setShowOther(!session.showOther),
      /**
       * The explanation hands the model to the reader. The buttons know A and
       * B, not the rungs between, so a walk that was on its way to B finishes
       * there — and the guide says so.
       */
      handOver: () => {
        if (session.primaryId === null) session.setPrimary('B');
        this.setPresentation({});
      },
      moved: () => session.rung !== 0 || session.showOther,
      state: () => ({
        primaryId: session.primaryId,
        showOther: session.showOther,
        holding: this.holding,
        arrangement: this.arrangement,
        problems: session.problems,
      }),
    };
  }

  /** The drawing quantities of both units, for a test. */
  presentationState() {
    return {
      primary: this.primary.presentationState(),
      other: this.other.visible ? this.other.presentationState() : null,
      phase: this.phase,
      holding: this._holding,
    };
  }

  dispose() {
    this._offResize?.();
    this.primary?.dispose();
    this.other?.dispose();
    disposeObject(this.root);
  }
}
