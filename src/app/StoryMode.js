import * as THREE from 'three';
import { Timeline } from '../utils/Timeline.js';
import { el } from '../utils/dom.js';

/**
 * Runs a scene's guided sequence.
 *
 * Generic machinery only: the scene supplies the storyboard, this drives it and
 * owns nothing medical. Where the reel produces a fixed 15-second recording,
 * this is something the viewer sits inside — it can be left at any moment, and
 * it hands the session back exactly as it found it.
 *
 * It drives the model through the same setters the sliders use. Nothing here
 * has a private path into the physiology; what it does own is presentation —
 * the camera, which label is pointed at, how much of the congestion overlay is
 * drawn, and the caption.
 *
 * @param {{
 *   viewer: any,
 *   scene: any,
 *   ui: HTMLElement,
 *   story: any,
 *   setProgress: (value: number) => void,
 *   setLabelFocus: (ids: string[]|null) => void,
 *   captureState: () => any,
 *   restoreState: (state: any) => void,
 * }} options
 */
export function createStoryMode({ viewer, scene, ui, story, setProgress, setLabelFocus, captureState, restoreState }) {
  const captionEn = el('span', { class: 'story-caption-text lang-en' });
  const captionJa = el('span', { class: 'story-caption-text lang-ja' });
  // A one-line premise under the opening caption: what course this model
  // draws, said before it is drawn rather than in a modal nobody reads.
  const noteEn = el('span', { class: 'story-note lang-en' });
  const noteJa = el('span', { class: 'story-note lang-ja' });
  // Both languages, always in the DOM, hidden by the same single CSS rule that
  // governs every other pair of strings in the interface. This used to be one
  // span written by JS from a mutable table, which meant it was the one piece
  // of story text with its own copy of the language state — and switching
  // language while the timeline was stopped left the previous language's word
  // beside a caption in the new one. Text that never holds language state
  // cannot go stale.
  const partJa = el('span', { class: 'story-part lang-ja' });
  const partEn = el('span', { class: 'story-part lang-en' });
  const beatJa = el('span', { class: 'story-beat lang-ja' });
  const beatEn = el('span', { class: 'story-beat lang-en' });

  // --- one continuous timeline -------------------------------------------
  // A single track that fills with real story time — no segmented bars, no
  // resets at step boundaries. Chapters sit on it as the few markers a viewer
  // navigates by; individual steps are only small ticks.
  const fill = el('div', { class: 'story-fill' });
  const track = el('div', {
    class: 'story-track',
    role: 'progressbar',
    'aria-label': '解説の進行',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    on: {
      click: (event) => {
        const rect = track.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        seek(frac * story.duration);
      },
    },
  });
  track.append(fill);
  for (const step of story.steps) {
    if (step.at === 0) continue;
    track.append(
      el('span', { class: 'story-tick', style: `left:${((step.at / story.duration) * 100).toFixed(2)}%` })
    );
  }
  // Each chapter carries its own identity and its own edge anchoring, decided
  // here from the data rather than by a CSS selector counting DOM position.
  // `:first-child` never matched a chapter — the track's first child is the
  // fill bar — and the label it was supposed to pull in had been overhanging
  // the track's edge unnoticed, because the overhang was hiding a collision
  // with the chapter after it.
  const chapters = story.chapters ?? [];
  const chapterButtons = chapters.map((chapter, index) => {
    const percent = (chapter.at / story.duration) * 100;
    return el('button', {
      class: 'story-chapter',
      type: 'button',
      'data-chapter': chapter.id,
      'data-anchor': chapterAnchor(chapters, index, story.duration),
      style: `left:${percent.toFixed(2)}%`,
      'aria-label': `${chapter.labelJa}（${chapter.label}）へ移動`,
      on: { click: (event) => (event.stopPropagation(), seek(chapter.at + 0.01)) },
    }, [
      el('span', { class: 'story-chapter-dot' }),
      el('span', { class: 'story-chapter-name' }, [
        el('span', { class: 'lang-ja chapter-wide', text: chapter.labelJa }),
        el('span', { class: 'lang-ja chapter-narrow', text: chapter.labelJaShort ?? chapter.labelJa }),
        el('span', { class: 'lang-en', text: chapter.label }),
      ]),
    ]);
  });
  track.append(...chapterButtons);
  const counter = el('span', { class: 'story-count', 'aria-hidden': 'true' });

  // --- completion state ---------------------------------------------------
  // After the last scene the sequence does not just stop on a tiny ✕: it says
  // it is done and offers the two things a viewer actually does next.
  const completion = el('div', { class: 'story-complete', role: 'group', 'aria-label': '解説の終了' }, [
    el('span', { class: 'story-complete-text' }, [
      el('span', { class: 'lang-ja', text: '解説は以上です。' }),
      el('span', { class: 'lang-en', text: "That's the end of the guided tour." }),
    ]),
    el('div', { class: 'story-complete-actions' }, [
      el('button', {
        class: 'story-cta story-cta-primary',
        type: 'button',
        'aria-label': '自由操作に戻る',
        on: { click: () => exit() },
      }, [
        el('span', { class: 'lang-ja', text: '自由操作に戻る' }),
        el('span', { class: 'lang-en', text: 'Back to exploring' }),
      ]),
      el('button', {
        class: 'story-cta',
        type: 'button',
        'aria-label': 'もう一度見る',
        on: { click: () => replay() },
      }, [
        el('span', { class: 'lang-ja', text: 'もう一度見る' }),
        el('span', { class: 'lang-en', text: 'Watch again' }),
      ]),
    ]),
  ]);

  const element = el('div', { class: 'story-bar' }, [
    el('div', { class: 'story-line' }, [
      partJa,
      partEn,
      el('span', { class: 'story-caption' }, [captionEn, captionJa, noteEn, noteJa]),
      beatJa,
      beatEn,
    ]),
    el('div', { class: 'story-foot' }, [
      track,
      counter,
      el('button', {
        class: 'story-leave',
        type: 'button',
        title: '解説を終了する（Esc）',
        'aria-label': '自由操作に戻る',
        on: { click: () => exit() },
      }, [
        el('span', { class: 'lang-ja', text: '← 自由操作に戻る' }),
        el('span', { class: 'lang-en', text: '← Back to exploring' }),
      ]),
    ]),
    completion,
  ]);

  // The kicker beside the caption is one short word, so it is picked rather
  // than stacked; it follows the language the rest of the bar is in.
  // The kicker beside the caption is one short word, so it is picked rather
  // than stacked. Both languages are written every time; CSS shows one.
  const PART_NAMES = {
    beat: { ja: '1 拍', en: 'One beat' },
    remodeling: { ja: 'リモデリング', en: 'Remodeling' },
  };

  let active = false;
  let snapshot = null;
  let lastTimestamp = null;
  /** Where the camera should be right now, in the scene's own coordinates. */
  const pose = { target: new THREE.Vector3(), position: new THREE.Vector3() };

  const timeline = new Timeline({
    duration: story.duration,
    cues: story.cues,
    onFrame: (t, cueId) => renderAt(t, cueId),
    onEnd: () => {
      // Hold on the last frame — the final state is the conclusion — and
      // switch the bar into its completion state, which says so and offers
      // the next actions instead of leaving only a tiny ✕.
      timeline.stop();
      element.classList.add('is-complete');
      completion.querySelector('.story-cta-primary')?.focus?.({ preventScroll: true });
    },
  });

  /**
   * Jump to a moment and carry on from there.
   *
   * The sequence stops itself on its last frame, so this also restarts the
   * clock when the destination is not the end — otherwise picking a chapter
   * after the sequence had finished would paint that step and then sit there.
   *
   * @param {number} t seconds
   */
  function seek(t) {
    element.classList.remove('is-complete');
    timeline.seek(t);
    if (active && timeline.elapsed < story.duration) {
      timeline.running = true;
      lastTimestamp = null;
    }
  }

  /** Restart from the beginning — the completion state's second action. */
  function replay() {
    seek(0);
  }

  function renderAt(t) {
    const { step } = story.stepAt(t);

    // --- model: one progression value per step, held for the whole step
    setProgress(step.progress);

    // --- heartbeat: Part A runs at its own rate, Part B is driven
    const driven = story.beatDrivenAt(t);
    scene.setCardiacPhaseDriven?.(driven);
    if (driven) scene.setCardiacPhase?.(story.cardiacPhaseAt(t));

    // --- presentation
    scene.setBeatEmphasis?.(story.emphasisAt(t));
    scene.setCongestionReveal?.(story.revealAt(t));
    scene.setOutline?.(story.outlineAt?.(t) ?? 0);
    scene.setCongestionEmphasis?.(story.contextAt?.(t) ?? 0);
    setLabelFocus(step.focus);

    // --- camera
    const shot = story.cameraAt(t);
    pose.target.copy(shot.target);
    // The storyboard may swing the view round for a step whose subject is
    // elsewhere in the anatomy; it falls back to the scene's own direction.
    pose.position.copy(shot.target).addScaledVector(shot.view ?? story.viewDirection, shot.distance);

    // --- caption
    const caption = story.captionAt(t);
    captionEn.textContent = caption.text;
    captionJa.textContent = caption.textJa;
    noteEn.textContent = caption.note ?? '';
    noteJa.textContent = caption.noteJa ?? '';
    element.style.setProperty('--story-caption-opacity', caption.opacity.toFixed(3));
    const part = PART_NAMES[caption.part] ?? PART_NAMES.remodeling;
    partJa.textContent = part.ja;
    partEn.textContent = part.en;
    element.dataset.part = caption.part;

    // The beat phase is worth naming only while the beat is the subject — not
    // for the whole of Part B, where the later steps are about what follows it.
    const named = story.beatNamedAt(t) ? scene.getBeatPhase?.() : null;
    // Both languages, as spans, for the same reason as the kicker: this used to
    // write English into textContent and Japanese into a data attribute that no
    // stylesheet read, so the beat phase stayed English in Japanese mode.
    beatEn.textContent = named ? named.label : '';
    beatJa.textContent = named ? named.labelJa ?? named.label : '';

    // --- continuous progress: real story time, never a step count
    const frac = Math.min(1, t / story.duration);
    fill.style.width = `${(frac * 100).toFixed(2)}%`;
    track.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
    const index = story.steps.indexOf(step);
    counter.textContent = `${index + 1} / ${story.steps.length}`;
    const chapters = story.chapters ?? [];
    chapterButtons.forEach((button, i) => {
      const from = chapters[i].at;
      const to = chapters[i + 1]?.at ?? story.duration;
      button.classList.toggle('is-current', t >= from && t < to);
      button.classList.toggle('is-done', t >= to);
    });
  }

  function enter() {
    if (active) return;
    active = true;
    snapshot = captureState?.() ?? null;
    ui.classList.add('is-story');
    if (!element.isConnected) ui.append(element);
    viewer.controls.autoRotate = false;
    lastTimestamp = null;
    timeline.start();
  }

  function exit() {
    if (!active) return;
    active = false;
    timeline.stop();
    element.classList.remove('is-complete');
    ui.classList.remove('is-story');
    // Taken out of the DOM, not just faded: it sits over the console, and a
    // leftover caption bar would swallow the clicks meant for the buttons
    // underneath it.
    element.remove();

    scene.setCardiacPhaseDriven?.(false);
    scene.setBeatEmphasis?.({ ejection: 0, residual: 0 });
    scene.setCongestionReveal?.({ front: 1, fluid: 1 });
    scene.setOutline?.(0);
    scene.setCongestionEmphasis?.(0);
    setLabelFocus(null);
    if (snapshot) restoreState?.(snapshot);
    snapshot = null;
  }

  return {
    element,
    get active() {
      return active;
    },
    /** Where the camera should be this frame, for the app's own tween to follow. */
    get pose() {
      return pose;
    },
    enter,
    exit,
    /** @param {string} mode 'ja' | 'en' */
    toggle: () => (active ? exit() : enter()),
    /**
     * Jump to a moment. Used by the step dots, and by the tests to reach a step
     * without waiting for it.
     *
     * @param {number} t seconds
     */
    seek,
    /** @returns {number} seconds elapsed */
    get elapsed() {
      return timeline.elapsed;
    },
    /**
     * Advance the sequence. Wall-clock, for the same reason the reel is: a
     * dropped frame must not stretch the beat the viewer is being asked to read.
     */
    tick() {
      if (!active) return;
      const now = performance.now();
      const wall = lastTimestamp === null ? 0 : (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      timeline.tick(Math.min(wall, 0.25));
    },
  };
}

/**
 * How a chapter label should sit relative to its mark on the track: centred
 * normally, but anchored inward near the ends so it stays inside the track,
 * and anchored the same way when its neighbour is close enough to collide.
 *
 * Decided from where the mark actually is, as a fraction of the *track*. An
 * earlier version took the ends from array position instead, which is not the
 * same question: the last chapter starts at 33s of a 42s story, three quarters
 * of the way along, and pulling its label a full width left of its own dot
 * detached the label from the mark it names.
 *
 * @param {{at: number}[]} chapters in order
 * @param {number} index
 * @param {number} duration seconds of story the track represents
 * @returns {'start' | 'end' | 'centre'}
 */
function chapterAnchor(chapters, index, duration) {
  const position = chapters[index].at / duration;
  if (position <= CHAPTER_EDGE_MARGIN) return 'start';
  if (position >= 1 - CHAPTER_EDGE_MARGIN) return 'end';
  // Close behind a chapter that is pinned to the left edge and so cannot move
  // out of the way: anchor this one to its mark too.
  const previous = chapters[index - 1];
  const previousPinned = previous.at / duration <= CHAPTER_EDGE_MARGIN;
  const gap = (chapters[index].at - previous.at) / duration;
  return previousPinned && gap < CHAPTER_CROWDING_GAP ? 'start' : 'centre';
}

/**
 * Within this fraction of either end of the track, a centred label would hang
 * off the edge, so it is anchored to its mark instead.
 */
const CHAPTER_EDGE_MARGIN = 0.06;

/**
 * Below this fraction of the track, two chapter marks are close enough that
 * their labels would overlap if both were centred.
 */
const CHAPTER_CROWDING_GAP = 0.2;
