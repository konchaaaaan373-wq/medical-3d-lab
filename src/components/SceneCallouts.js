import * as THREE from 'three';
import { el } from '../utils/dom.js';

/**
 * Short tags beside the model, pinned to the parts they are about, said one
 * after another: 「収縮力↓」 at the heart muscle, then 「収縮後に残る血液↑」 at
 * the blood that stayed, then 「1回に送り出す量↓」 where it leaves (owner's
 * review, 2026-09-27: 操作中は右パネルだけで説明しない).
 *
 * This owns placement and timing and nothing else. What a tag says and where
 * it hangs come from the scene (`getCalloutSequence`, `getCalloutAnchor`);
 * what the shell does while a tag is current — point at the part, hold the
 * beat — is `onStep`. A tag is a screen-space box with a dot on its 3D point,
 * placed to the side of the point away from the model's centre so it never
 * covers the part it names, and kept inside the band the panels leave.
 *
 * Tags are presentation: `aria-hidden`, because the same chain is written out
 * in the console (`EffectChain`) where a screen reader reads it in order. A
 * second copy announced over the first would be the same sentence twice.
 *
 * @param {{
 *   viewer: { camera: THREE.Camera, container: HTMLElement },
 *   getAnchor: (id: string) => THREE.Vector3 | null,
 *   getInsets?: () => ({ top: number, bottom: number, left: number, right: number } | null),
 *   onStep?: (step: object | null, index: number) => void,
 *   stepMs?: number,
 * }} options
 */
export function createSceneCallouts({ viewer, getAnchor, getInsets = () => null, onStep = () => {}, stepMs = 1400 }) {
  const element = el('div', { class: 'scene-callouts', 'aria-hidden': 'true' });
  /** @type {{ step: object, node: HTMLElement, state: 'waiting'|'current'|'said' }[]} */
  let items = [];
  /** Captions that stay put — the gauge's two column names. */
  let fixed = [];
  let clock = 0;
  let playing = false;
  let current = -1;
  const projected = new THREE.Vector3();

  const pair = (text) => [
    el('span', { class: 'lang-en', text: text?.en ?? '' }),
    el('span', { class: 'lang-ja', text: text?.ja ?? '' }),
  ];

  function build(step, kind) {
    const node = el('div', { class: `scene-callout is-${kind}`, dataset: { callout: step.id, direction: step.direction ?? '' } }, [
      el('span', { class: 'scene-callout-dot' }),
      el('span', { class: 'scene-callout-line' }),
      el('span', { class: 'scene-callout-box' }, [
        el('span', { class: 'scene-callout-title' }, pair(step.title)),
        step.detail ? el('span', { class: 'scene-callout-detail' }, pair(step.detail)) : null,
        // A shorter line for a narrow band, where the stylesheet shows it instead.
        step.brief ? el('span', { class: 'scene-callout-brief' }, pair(step.brief)) : null,
      ]),
    ]);
    element.append(node);
    return node;
  }

  function clear() {
    for (const item of items) item.node.remove();
    items = [];
    playing = false;
    current = -1;
    element.dataset.state = 'idle';
  }

  function advance(index) {
    current = index;
    items.forEach((item, i) => {
      item.state = i < index ? 'said' : i === index ? 'current' : 'waiting';
      item.node.dataset.state = item.state;
    });
    onStep(items[index]?.step ?? null, index);
  }

  /**
   * Where each tag goes this frame. Tags are placed in order; a later one
   * that would land on an earlier one steps down clear of it.
   */
  function place() {
    const width = viewer.container.clientWidth;
    const height = viewer.container.clientHeight;
    if (!width || !height) return;
    const insets = getInsets() ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const band = {
      left: insets.left * width + 8,
      right: width - insets.right * width - 8,
      top: insets.top * height + 8,
      bottom: height - insets.bottom * height - 8,
    };
    const centreX = (band.left + band.right) / 2;
    const placed = [];
    const put = (item) => {
      const anchor = getAnchor(item.step.anchor);
      if (!anchor) {
        item.node.hidden = true;
        return;
      }
      projected.copy(anchor).project(viewer.camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      const inFront = projected.z < 1;
      const visible = item.state !== 'waiting' && inFront;
      item.node.hidden = !visible;
      if (!visible) return;
      const box = item.node.lastElementChild;
      const w = box.offsetWidth || 120;
      const h = box.offsetHeight || 34;
      // Away from the middle of the model, so the box never sits on the part.
      const side = item.step.side ?? (x < centreX ? 'left' : 'right');
      // 'center': under the point, for a name beneath something. Otherwise
      // the preferred side first, then the other, each pushed down clear of
      // the tags already placed; the first that fits in the band without
      // touching one wins. A tag that fits nowhere keeps its preferred place
      // and is marked, so a check can count it rather than it hiding a part.
      const candidates = side === 'center' ? ['center'] : [side, side === 'left' ? 'right' : 'left'];
      let left = 0;
      let top = 0;
      let chosen = candidates[0];
      let clear = false;
      for (const candidate of candidates) {
        let l = candidate === 'center' ? x - w / 2 : candidate === 'left' ? x - 14 - w : x + 14;
        let t = candidate === 'center' ? y : y - h / 2;
        l = Math.min(Math.max(l, band.left), band.right - w);
        for (const other of placed) {
          const overlapX = l < other.left + other.w && l + w > other.left;
          const overlapY = t < other.top + other.h + 4 && t + h + 4 > other.top;
          if (overlapX && overlapY) t = other.top + other.h + 6;
        }
        t = Math.min(Math.max(t, band.top), band.bottom - h);
        const hits = placed.some((other) => l < other.left + other.w && l + w > other.left && t < other.top + other.h && t + h > other.top);
        if (candidate === candidates[0] || !hits) {
          left = l;
          top = t;
          chosen = candidate;
        }
        if (!hits) {
          clear = true;
          break;
        }
      }
      item.node.dataset.crowded = clear ? 'false' : 'true';
      placed.push({ left, top, w, h });
      item.node.style.setProperty('--dot-x', `${x}px`);
      item.node.style.setProperty('--dot-y', `${y}px`);
      box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      // A leader from the dot to the near edge of the box.
      const endX = chosen === 'left' ? left + w : chosen === 'center' ? left + w / 2 : left;
      const endY = Math.min(Math.max(y, top + 6), top + h - 6);
      const line = item.node.children[1];
      const length = Math.hypot(endX - x, endY - y);
      line.style.width = `${Math.round(length)}px`;
      line.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) rotate(${Math.atan2(endY - y, endX - x)}rad)`;
      item.node.dataset.side = chosen;
    };
    // The tag being said is placed first, so it gets its own side of the
    // part; then the names that stay; then what was said, latest first.
    for (const item of items) if (item.state === 'current') put(item);
    for (const item of fixed) put(item);
    for (const item of [...items].reverse()) if (item.state !== 'current') put(item);
  }

  return {
    element,

    /**
     * Say these, one after another, from the first. Replaces whatever was
     * being said.
     *
     * @param {object[]} steps `{ id, anchor, title, detail?, direction?, side? }`
     */
    play(steps) {
      clear();
      items = steps.map((step) => ({ step, node: build(step, 'step'), state: 'waiting' }));
      if (!items.length) {
        onStep(null, -1);
        return;
      }
      element.dataset.state = 'playing';
      playing = true;
      clock = 0;
      advance(0);
      place();
    },

    /** Show one sentence on its own, now (the explanation's caption). */
    say(step) {
      clear();
      if (!step) return;
      items = [{ step, node: build(step, 'caption'), state: 'current' }];
      items[0].node.dataset.state = 'current';
      element.dataset.state = 'caption';
      place();
    },

    /** Captions that stay while the scene is on screen, e.g. names under a gauge. */
    setFixed(labels) {
      for (const item of fixed) item.node.remove();
      fixed = labels.map((step) => {
        const node = build(step, 'fixed');
        node.dataset.state = 'said';
        return { step, node, state: 'said' };
      });
    },

    clear() {
      const had = items.length > 0;
      clear();
      if (had) onStep(null, -1);
    },

    /** Advance the sequence and follow the camera. Call every frame. */
    update(dt) {
      if (playing) {
        clock += dt * 1000;
        const index = Math.min(items.length, Math.floor(clock / stepMs));
        if (index !== current) {
          if (index >= items.length) {
            playing = false;
            element.dataset.state = 'said';
            items.forEach((item) => {
              item.state = 'said';
              item.node.dataset.state = 'said';
            });
            current = items.length;
            onStep(null, items.length);
          } else {
            advance(index);
          }
        }
      }
      if (items.length || fixed.length) place();
    },

    get playing() {
      return playing;
    },
    get currentStep() {
      return items[current]?.step ?? null;
    },
    get count() {
      return items.length;
    },
  };
}
