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

    /** Story mode: pause briefly on each of these values while playing. */
    this.holdPoints = [];
    this.holdDuration = 2.4;
    this.holdsEnabled = false;
    this._holdTimer = 0;
    this._consumedHolds = new Set();
  }

  /** @param {number[]} points progression values to pause on (e.g. stage boundaries) */
  setHoldPoints(points) {
    this.holdPoints = [...points].sort((a, b) => a - b);
    this._consumedHolds.clear();
  }

  get holding() {
    return this._holdTimer > 0;
  }

  update(dt) {
    if (!this.playing) return;

    if (this._holdTimer > 0) {
      this._holdTimer -= dt;
      // Re-notify so the UI can show the hold counting down.
      if (this._holdTimer <= 0) this.onChange(this.value, this.playing);
      return;
    }

    const next = this.value + dt / this.duration;

    const hold = this.holdsEnabled ? this._nextHoldBetween(this.value, next) : null;
    if (hold != null) {
      this._consumedHolds.add(hold);
      this._holdTimer = this.holdDuration;
      this.set(hold);
      return;
    }

    if (next >= 1) {
      this.set(1);
      this.pause(); // stop at the end rather than looping — better for narration
    } else {
      this.set(next);
    }
  }

  /** The first not-yet-used hold point crossed by this step, if any. */
  _nextHoldBetween(from, to) {
    for (const point of this.holdPoints) {
      if (point > from && point <= to && !this._consumedHolds.has(point)) return point;
    }
    return null;
  }

  set(value, { notify = true } = {}) {
    // Seeking backwards re-arms the holds ahead of the new position.
    if (value < this.value) {
      for (const point of [...this._consumedHolds]) {
        if (point > value) this._consumedHolds.delete(point);
      }
    }
    this.value = clamp(value);
    if (notify) this.onChange(this.value, this.playing);
  }

  play() {
    // Restart from the beginning when the user hits play at the very end.
    if (this.value >= 1) {
      this.value = 0;
      this._consumedHolds.clear();
    }
    this._holdTimer = 0;
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
    this._holdTimer = 0;
    this._consumedHolds.clear();
    this.set(0);
  }
}
