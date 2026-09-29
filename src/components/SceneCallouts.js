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
 *   getObstacle?: () => THREE.Vector3[] | null,  // world points of what a tag must not cover
 *   onStep?: (step: object | null, index: number) => void,
 *   stepMs?: number,
 * }} options
 */
export function createSceneCallouts({ viewer, getAnchor, getInsets = () => null, getObstacle = () => null, onStep = () => {}, stepMs = 1400 }) {
  const element = el('div', { class: 'scene-callouts', 'aria-hidden': 'true' });
  /** @type {{ step: object, node: HTMLElement, state: 'waiting'|'current'|'said' }[]} */
  let items = [];
  /** Captions that stay put — the gauge's two column names. */
  let fixed = [];
  let clock = 0;
  let playing = false;
  let current = -1;
  const projected = new THREE.Vector3();
  /** Bumped whenever what is on the layer changes, so placement knows to run. */
  let version = 0;
  let placedKey = null;
  /** The band the panels leave, re-read at most this often (it costs layout reads). */
  const INSETS_EVERY_MS = 300;
  let insets = null;
  let insetsAt = -Infinity;
  /** What the model was when the tags on screen were played. */
  let playedKey = null;

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
    version += 1;
  }

  /** A tag's state; its box is measured again the next time it is placed. */
  function setItemState(item, state) {
    item.state = state;
    item.node.dataset.state = state;
    item.size = null;
    version += 1;
  }

  function advance(index) {
    current = index;
    items.forEach((item, i) => setItemState(item, i < index ? 'said' : i === index ? 'current' : 'waiting'));
    onStep(items[index]?.step ?? null, index);
  }

  /** Screen rectangle of what the tags must not cover, or null. */
  function obstacleRect(width, height) {
    const points = getObstacle();
    if (!points?.length) return null;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const point of points) {
      projected.copy(point).project(viewer.camera);
      if (projected.z > 1) continue;
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    if (!Number.isFinite(left)) return null;
    return { left: left - 4, top: top - 4, w: right - left + 8, h: bottom - top + 8 };
  }

  /**
   * Where each tag goes this frame. Tags are placed in order; a later one
   * that would land on an earlier one steps down clear of it.
   */
  function place(now = performance.now()) {
    const width = viewer.container.clientWidth;
    const height = viewer.container.clientHeight;
    if (!width || !height) return;
    if (!insets || now - insetsAt > INSETS_EVERY_MS) {
      insets = getInsets() ?? { top: 0, bottom: 0, left: 0, right: 0 };
      insetsAt = now;
    }
    // Nothing moved — the camera, the window, the band, what is shown, the
    // language — so every tag is where it was. Placement reads sizes and the
    // camera every frame otherwise, for as long as a tag is on the model.
    const lang = globalThis.document?.getElementById?.('ui')?.dataset?.lang ?? '';
    viewer.camera.updateMatrixWorld?.();
    const camera = viewer.camera.matrixWorld.elements.map((v) => v.toFixed(3)).join(',');
    const key = `${version}|${width}x${height}|${insets.top},${insets.bottom},${insets.left},${insets.right}|${lang}|${camera}`;
    if (key === placedKey) return;
    placedKey = key;
    const band = {
      left: insets.left * width + 8,
      right: width - insets.right * width - 8,
      top: insets.top * height + 8,
      bottom: height - insets.bottom * height - 8,
    };
    const centreX = (band.left + band.right) / 2;
    const model = obstacleRect(width, height);
    const placed = [];
    const overlaps = (l, t, w, h, other) => l < other.left + other.w && l + w > other.left && t < other.top + other.h && t + h > other.top;
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
      if (item.node.hidden === visible) {
        item.node.hidden = !visible;
        item.size = null;
      }
      if (!visible) return;
      const box = item.node.children[2];
      // Measured once per state (and per language, through the key), not
      // every frame: reading a size between two writes forces a layout.
      if (!item.size || item.size.lang !== lang) item.size = { w: box.offsetWidth || 120, h: box.offsetHeight || 34, lang };
      const { w, h } = item.size;
      // Away from the middle of the model, so the box never sits on the part.
      const side = item.step.side ?? (x < centreX ? 'left' : 'right');
      // 'center': under the point, for a name beneath something. Otherwise
      // the preferred side, the other side, then above and below the model;
      // the first that fits in the band clear of the tags already placed and
      // of the model itself wins. A tag that fits nowhere keeps its preferred
      // place and is marked, so a check can count it.
      const candidates = side === 'center' ? ['center'] : [side, side === 'left' ? 'right' : 'left', 'above', 'below'];
      const obstacles = item.step.side ? placed : model ? [...placed, model] : placed;
      let left = 0;
      let top = 0;
      let chosen = candidates[0];
      let clear = false;
      for (const candidate of candidates) {
        let l;
        let t;
        if (candidate === 'center') {
          l = x - w / 2;
          t = y;
        } else if (candidate === 'above' || candidate === 'below') {
          if (!model) continue;
          l = x - w / 2;
          t = candidate === 'above' ? model.top - h - 6 : model.top + model.h + 6;
        } else {
          l = candidate === 'left' ? x - 14 - w : x + 14;
          // Beside the model, not beside the point, when the point is on it.
          if (model && !item.step.side) l = candidate === 'left' ? Math.min(l, model.left - 6 - w) : Math.max(l, model.left + model.w + 6);
          t = y - h / 2;
        }
        l = Math.min(Math.max(l, band.left), band.right - w);
        for (const other of placed) {
          const overlapX = l < other.left + other.w && l + w > other.left;
          const overlapY = t < other.top + other.h + 4 && t + h + 4 > other.top;
          if (overlapX && overlapY) t = other.top + other.h + 6;
        }
        t = Math.min(Math.max(t, band.top), band.bottom - h);
        const hits = obstacles.some((other) => overlaps(l, t, w, h, other));
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
      // A leader from the dot to the nearest point of the box.
      const endX = Math.min(Math.max(x, left), left + w);
      const endY = Math.min(Math.max(y, top), top + h);
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
    play(steps, key = null) {
      clear();
      playedKey = key;
      items = steps.map((step) => ({ step, node: build(step, 'step'), state: 'waiting', size: null }));
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
      playedKey = null;
      items = [{ step, node: build(step, 'caption'), state: 'current', size: null }];
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
        return { step, node, state: 'said', size: null };
      });
      version += 1;
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
            items.forEach((item) => setItemState(item, 'said'));
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
    /** The model's key the tags were played for (`play(steps, key)`), or null. */
    get playedKey() {
      return items.length && items[0].node.classList.contains('is-step') ? playedKey : null;
    },
  };
}
