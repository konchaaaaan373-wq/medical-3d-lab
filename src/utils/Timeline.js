/**
 * Elapsed-time cue runner for cinematic sequences.
 *
 * Deliberately time-based rather than frame-based: a recording made on a slow
 * machine must land on the same beats as one made on a fast machine, so every
 * value the sequence produces is a pure function of seconds since it started.
 *
 * Scene-agnostic — the storyboard supplies the cues and the per-frame work.
 */
export class Timeline {
  /**
   * @param {{
   *   duration: number,
   *   cues: {id: string, at: number, until: number}[],
   *   onFrame?: (t: number, cueId: string) => void,
   *   onCue?: (cueId: string, previousCueId: string|null) => void,
   *   onEnd?: () => void,
   * }} options
   */
  constructor({ duration, cues, onFrame, onCue, onEnd }) {
    this.duration = duration;
    this.cues = cues;
    this.onFrame = onFrame ?? (() => {});
    this.onCue = onCue ?? (() => {});
    this.onEnd = onEnd ?? (() => {});
    this.elapsed = 0;
    this.running = false;
    this.currentCue = null;
  }

  start() {
    this.elapsed = 0;
    this.currentCue = null;
    this.running = true;
    this.tick(0);
  }

  stop() {
    this.running = false;
  }

  /**
   * Jump to a moment and render it.
   *
   * Deliberately not routed through `tick`: a sequence that has reached its end
   * is stopped, and that is exactly when someone is most likely to want to go
   * back to a step. Rendering has to work whether or not the clock is running.
   *
   * @param {number} t seconds
   */
  seek(t) {
    this.elapsed = Math.min(this.duration, Math.max(0, t));
    const cueId = cueIdAt(this.cues, this.elapsed);
    if (cueId !== this.currentCue) {
      const previous = this.currentCue;
      this.currentCue = cueId;
      this.onCue(cueId, previous);
    }
    this.onFrame(this.elapsed, cueId);
  }

  /** @param {number} dt seconds since the previous frame */
  tick(dt) {
    if (!this.running) return;
    this.elapsed = Math.min(this.duration, this.elapsed + dt);

    const cueId = cueIdAt(this.cues, this.elapsed);
    if (cueId !== this.currentCue) {
      const previous = this.currentCue;
      this.currentCue = cueId;
      this.onCue(cueId, previous);
    }
    this.onFrame(this.elapsed, cueId);

    if (this.elapsed >= this.duration) {
      this.running = false;
      this.onEnd();
    }
  }
}

/** The cue covering `t`, or the last cue once the sequence has run out. */
export function cueIdAt(cues, t) {
  for (const cue of cues) {
    if (t >= cue.at && t < cue.until) return cue.id;
  }
  return cues[cues.length - 1]?.id ?? null;
}

/**
 * Opacity for an element that lives between `from` and `to`, with symmetric
 * fades. Used by storyboards to drive text without any transition library.
 */
export function cueOpacity(t, from, to, fade = 0.35) {
  if (t <= from || t >= to) return 0;
  const rise = fade > 0 ? Math.min(1, (t - from) / fade) : 1;
  const fall = fade > 0 ? Math.min(1, (to - t) / fade) : 1;
  const value = Math.min(rise, fall);
  return value * value * (3 - 2 * value); // smoothstep
}

/** Interpolates a numeric track of `{ t, value }` keyframes with smoothstep. */
export function sampleTrack(track, t) {
  if (t <= track[0].t) return track[0].value;
  const last = track[track.length - 1];
  if (t >= last.t) return last.value;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    if (t >= a.t && t <= b.t) {
      const raw = (t - a.t) / (b.t - a.t);
      const eased = raw * raw * (3 - 2 * raw);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}
