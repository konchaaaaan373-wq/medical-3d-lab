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
  const partLabel = el('span', { class: 'story-part' });
  const beatLabel = el('span', { class: 'story-beat' });
  const dots = el('div', { class: 'story-dots' });

  const element = el('div', { class: 'story-bar' }, [
    el('div', { class: 'story-line' }, [
      partLabel,
      el('span', { class: 'story-caption' }, [captionEn, captionJa]),
      beatLabel,
    ]),
    el('div', { class: 'story-foot' }, [
      dots,
      el('button', {
        class: 'story-exit',
        type: 'button',
        title: 'Leave the sequence (Escape)',
        text: '✕',
        on: { click: () => exit() },
      }),
    ]),
  ]);

  const stepDots = story.steps.map((step) =>
    el('button', {
      class: 'story-dot',
      type: 'button',
      title: step.caption,
      // Steps are addressable: someone who wants to see the residual moment
      // again should not have to sit through the remodelling first.
      on: { click: () => timeline.seek(step.at + 0.01) },
    })
  );
  dots.append(...stepDots);

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
      // Hold on the last frame rather than snapping away — the final state is
      // the conclusion, and jumping out of it would undo the point.
      timeline.stop();
    },
  });

  /** Seeking is not part of the base Timeline, so it is added here. */
  timeline.seek = (t) => {
    timeline.elapsed = Math.min(story.duration, Math.max(0, t));
    timeline.currentCue = null;
    timeline.tick(0);
  };

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
    element.style.setProperty('--story-caption-opacity', caption.opacity.toFixed(3));
    partLabel.textContent = caption.part === 'beat' ? 'One beat' : 'Remodeling';
    element.dataset.part = caption.part;

    // The beat phase is worth naming only while the beat is the subject — not
    // for the whole of Part B, where the later steps are about what follows it.
    const named = story.beatNamedAt(t) ? scene.getBeatPhase?.() : null;
    beatLabel.textContent = named ? named.label : '';
    beatLabel.dataset.ja = named ? named.labelJa : '';

    const index = story.steps.indexOf(step);
    stepDots.forEach((dot, i) => {
      dot.classList.toggle('is-current', i === index);
      dot.classList.toggle('is-done', i < index);
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
    toggle: () => (active ? exit() : enter()),
    /**
     * Jump to a moment. Used by the step dots, and by the tests to reach a step
     * without waiting for it.
     *
     * @param {number} t seconds
     */
    seek: (t) => timeline.seek(t),
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
