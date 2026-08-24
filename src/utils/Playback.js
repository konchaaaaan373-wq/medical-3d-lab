import { clamp } from './math.js';

/**
 * Drives the 0..1 progression value.
 *
 * Deliberately tiny and UI-agnostic: the scene reads `value`, the control panel
 * writes it, and `onChange` keeps everything else in sync.
 */
export class Playback {
  /** @param {{ duration?: number, onChange?: (value: number, playing: boolean) => void }} options */
  constructor({ duration = 26, onChange } = {}) {
    this.duration = duration; // seconds for a full 0 -> 1 sweep
    this.value = 0;
    this.playing = false;
    this.onChange = onChange ?? (() => {});
  }

  update(dt) {
    if (!this.playing) return;
    const next = this.value + dt / this.duration;
    if (next >= 1) {
      this.set(1);
      this.pause(); // stop at the end rather than looping — better for narration
    } else {
      this.set(next);
    }
  }

  set(value, { notify = true } = {}) {
    this.value = clamp(value);
    if (notify) this.onChange(this.value, this.playing);
  }

  play() {
    // Restart from the beginning when the user hits play at the very end.
    if (this.value >= 1) this.value = 0;
    this.playing = true;
    this.onChange(this.value, this.playing);
  }

  pause() {
    this.playing = false;
    this.onChange(this.value, this.playing);
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  reset() {
    this.playing = false;
    this.set(0);
  }
}
