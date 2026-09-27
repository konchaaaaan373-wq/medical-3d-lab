import { el } from '../utils/dom.js';

/**
 * The explanation animation's player: play, pause, play from the start, the
 * stages in order with the one playing marked, and the stage's sentence.
 *
 * It owns time and nothing else. What the model does at each moment is the
 * scene's (`explainer.driveAt`), what the stage says is the scene's
 * (`explainer.caption`, with the solved numbers of that moment), and where the
 * camera goes is the shell's (`onStage`). The shell calls `tick(dt)` every
 * frame; while paused, time stands still and nothing is driven.
 *
 * ## If the reader changes an input while it plays
 *
 * It stops, and says so: the condition on screen is the reader's from there
 * (`interrupt`). It does not resume on its own, and it does not put back what
 * the reader changed — a player that fought the reader for the model would be
 * the two things this surface separates, mixed again. "Play from the start"
 * begins again from the starting heart.
 *
 * @param {{
 *   explainer: { copy: object, duration: number, stages: object[], stageAt: (t: number) => object,
 *     driveAt: (t: number, op: string) => void, caption: (stageId: string) => {heading: object, text: object},
 *     end?: () => void },
 *   onBegin: () => void,        // put the model at the start (the shell syncs its read-outs)
 *   onStage: (stage: object) => void,
 *   onFrame: () => void,        // after each drive: the shell refreshes what reads the model
 *   onStateChange?: (state: string) => void,
 * }} options
 */
export function createExplainerPlayer({ explainer, onBegin, onStage, onFrame, onStateChange = () => {} }) {
  const { copy } = explainer;
  const pairOf = (en, ja) => [
    el('span', { class: 'lang-en', text: en ?? '' }),
    el('span', { class: 'lang-ja', text: ja ?? '' }),
  ];
  const dual = (en, ja, className = '') => el('span', { class: className }, pairOf(en, ja));

  let t = 0;
  /** 'idle' | 'playing' | 'paused' | 'interrupted' | 'ended' */
  let state = 'idle';
  let stageId = null;
  let op = null;
  let playbackCount = 0;

  const playLabel = el('span', { class: 'explainer-play-label' });
  const playButton = el('button', {
    type: 'button',
    class: 'explainer-play',
    dataset: { control: 'explainer-play' },
    on: { click: () => (state === 'playing' ? pause() : state === 'paused' ? resume() : restart()) },
  }, [el('span', { class: 'explainer-play-icon', 'aria-hidden': 'true' }), playLabel]);
  const replayButton = el('button', {
    type: 'button',
    class: 'explainer-replay',
    dataset: { control: 'explainer-replay' },
    on: { click: () => restart() },
  }, [el('span', { class: 'explainer-replay-icon', 'aria-hidden': 'true', text: '↺' }), dual(copy.replay, copy.replayJa)]);

  const stageItems = new Map();
  const stageList = el('ol', { class: 'explainer-stages' }, explainer.stages.map((stage) => {
    const words = copy.stages[stage.id];
    const item = el('li', { class: 'explainer-stage', dataset: { stage: stage.id } }, [dual(words.heading, words.headingJa)]);
    stageItems.set(stage.id, item);
    return item;
  }));
  const progressFill = el('span', { class: 'explainer-progress-fill' });
  const progress = el('span', {
    class: 'explainer-progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': String(explainer.duration),
    'aria-valuenow': '0',
  }, [progressFill]);
  const captionHeading = el('strong', { class: 'explainer-caption-heading' });
  const captionText = el('span', { class: 'explainer-caption-text' });
  const caption = el('p', { class: 'explainer-caption', 'aria-live': 'polite' }, [captionHeading, captionText]);
  const status = el('p', { class: 'explainer-status', role: 'status' });

  const element = el('div', { class: 'explainer', dataset: { state } }, [
    el('p', { class: 'explainer-title' }, [dual(copy.title, copy.titleJa)]),
    el('p', { class: 'explainer-summary' }, [dual(copy.summary, copy.summaryJa)]),
    el('div', { class: 'explainer-controls' }, [playButton, replayButton]),
    progress,
    stageList,
    caption,
    status,
    el('p', { class: 'explainer-note' }, [dual(copy.note, copy.noteJa)]),
  ]);

  function setState(next) {
    state = next;
    element.dataset.state = state;
    const [en, ja] = state === 'playing' ? [copy.pause, copy.pauseJa] : state === 'paused' ? [copy.resume, copy.resumeJa] : [copy.play, copy.playJa];
    playLabel.replaceChildren(...pairOf(en, ja));
    playButton.setAttribute('aria-pressed', String(state === 'playing'));
    replayButton.hidden = state === 'idle';
    const message = state === 'interrupted' ? [copy.interrupted, copy.interruptedJa] : state === 'ended' ? [copy.ended, copy.endedJa] : null;
    status.replaceChildren(...(message ? pairOf(message[0], message[1]) : []));
    onStateChange(state);
  }

  function paintStage(stage) {
    let passed = true;
    for (const candidate of explainer.stages) {
      const item = stageItems.get(candidate.id);
      if (candidate.id === stage.id) {
        passed = false;
        item.dataset.state = 'current';
        item.setAttribute('aria-current', 'step');
      } else {
        item.dataset.state = passed ? 'done' : 'next';
        item.removeAttribute('aria-current');
      }
    }
  }

  function paintCaption() {
    if (!stageId) return;
    const words = explainer.caption(stageId);
    captionHeading.replaceChildren(...pairOf(words.heading.en, words.heading.ja));
    captionText.replaceChildren(...pairOf(words.text.en, words.text.ja));
  }

  function drive() {
    explainer.driveAt(t, op);
    const stage = explainer.stageAt(t);
    if (stage.id !== stageId) {
      stageId = stage.id;
      paintStage(stage);
      onStage(stage);
    }
    onFrame();
    paintCaption();
    progressFill.style.width = `${Math.min(100, (t / explainer.duration) * 100)}%`;
    progress.setAttribute('aria-valuenow', String(Math.round(t)));
  }

  function restart() {
    t = 0;
    stageId = null;
    playbackCount += 1;
    op = `explainer-${playbackCount}`;
    onBegin();
    setState('playing');
    drive();
  }

  function pause() {
    if (state !== 'playing') return;
    setState('paused');
  }

  function resume() {
    if (state !== 'paused') return;
    setState('playing');
  }

  setState('idle');

  return {
    element,
    /** Advance by `dt` seconds, if playing. */
    tick(dt) {
      if (state !== 'playing') return;
      t = Math.min(explainer.duration, t + dt);
      drive();
      if (t >= explainer.duration) {
        explainer.end?.();
        setState('ended');
      }
    },
    /** The reader changed an input: stop, say so, leave the model as it is. */
    interrupt() {
      if (state !== 'playing' && state !== 'paused') return;
      explainer.end?.();
      setState('interrupted');
    },
    play: restart,
    pause,
    resume,
    get state() {
      return state;
    },
    get time() {
      return t;
    },
    get stageId() {
      return stageId;
    },
  };
}
