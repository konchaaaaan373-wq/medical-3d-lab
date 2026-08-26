import * as THREE from 'three';
import { el } from '../utils/dom.js';
import { clamp, smoothstep } from '../utils/math.js';

const FADE = 0.06;

/**
 * Minimum spacing between two labels, in px. Roughly a label's own height plus
 * a little air; anything closer and the two boxes overlap and neither reads.
 */
const STACK_GAP = 34;
/** How far apart horizontally two labels have to be before they can share a row. */
const COLUMN_GAP = 150;

/**
 * Nudge a label down until it is clear of the ones already placed.
 *
 * Anchors move with the camera and two of them can end up in the same few
 * pixels — most easily when the sequence points at a chain of structures that
 * are genuinely close together. Losing one of the two labels to an overlap is
 * worse than pointing a few pixels off, so the later one steps down instead.
 */
function separate(placed, x, y) {
  let result = y;
  // One settling pass per already-placed label is enough: they were themselves
  // placed top-down, so a single sweep leaves everything clear.
  for (const other of placed) {
    if (Math.abs(other.x - x) > COLUMN_GAP) continue;
    if (Math.abs(other.y - result) < STACK_GAP) result = other.y + STACK_GAP;
  }
  return result;
}

/**
 * HTML labels pinned to 3D anchor points.
 *
 * Done with plain DOM + `Vector3.project` rather than CSS2DRenderer: it is a few
 * lines, keeps the text crisp at any pixel ratio, and lets the labels use the
 * same styling as the rest of the UI.
 *
 * @param {{ viewer: import('../app/Viewer.js').Viewer, annotations: any[] }} options
 */
export function createLabelLayer({ viewer, annotations }) {
  const element = el('div', { class: 'label-layer' });

  // Small screens cannot carry six floating labels without becoming noise.
  // Annotations may opt out with `compact: false`; everything else is kept.
  const compact = window.innerWidth < 720;
  const shown = compact ? annotations.filter((a) => a.compact !== false) : annotations;

  let comparing = false;
  /**
   * Ids the current step wants pointed out, or null for "whatever the
   * progression window says".
   *
   * Labels explain the visualization; they must not become the visualization.
   * Six of them at once hid the subject they were pointing at, so learning view
   * and the guided sequence name what matters right now and everything else
   * steps back. `null` restores the old progression-window behaviour, which is
   * what Data view and the comparison still use.
   */
  let focus = null;

  const items = shown.map((annotation) => {
    const node = el('div', { class: 'label3d' }, [
      el('span', { class: 'label-dot' }),
      el('span', { class: 'label-body' }, [
        el('span', { class: 'label-en lang-en', text: annotation.text }),
        el('span', { class: 'label-ja lang-ja', text: annotation.sub }),
      ]),
    ]);
    element.append(node);
    return { annotation, node, opacity: 0 };
  });

  const projected = new THREE.Vector3();

  return {
    element,

    /**
     * Comparison mode moves the subject apart, so the ordinary annotations would
     * point at empty space. Each mode shows only its own labels.
     */
    setComparison(enabled) {
      comparing = enabled;
    },

    /**
     * @param {string[]|null} ids annotation ids to show, or null for all the
     *   ones whose progression window is open
     */
    setFocus(ids) {
      focus = ids;
    },

    /** Visibility follows the progression window each annotation declares. */
    update(progress) {
      for (const item of items) {
        if (Boolean(item.annotation.comparisonOnly) !== comparing) {
          item.opacity = 0;
          continue;
        }
        const [from, to] = item.annotation.range;
        // A window that opens at 0 is visible immediately — no fade-in from nothing.
        const fadeIn = from <= 0 ? 1 : smoothstep(from, from + FADE, progress);
        const fadeOut = to >= 1 ? 1 : 1 - smoothstep(to - FADE, to, progress);
        const inWindow = clamp(fadeIn * fadeOut);
        // A focused label still has to be in its own window — the sequence can
        // ask for a label that does not apply yet, and it should stay quiet
        // rather than point at something that is not there.
        item.opacity = focus ? (focus.includes(item.annotation.id) ? inWindow : 0) : inWindow;
      }
    },

    /** Called every frame — cheap enough for a handful of labels. */
    render() {
      const width = viewer.container.clientWidth;
      const height = viewer.container.clientHeight;
      const placed = [];
      for (const item of items) {
        if (item.opacity < 0.01) {
          item.node.style.opacity = '0';
          item.node.style.visibility = 'hidden';
          continue;
        }
        projected.copy(item.annotation.position).project(viewer.camera);
        // z > 1 means the anchor is behind the camera.
        const offscreen = projected.z > 1 || Math.abs(projected.x) > 1.15 || Math.abs(projected.y) > 1.15;
        item.node.style.visibility = offscreen ? 'hidden' : 'visible';
        if (offscreen) continue;
        // Keep labels inside the frame. The small clamp costs a few pixels of
        // pointing accuracy but stops annotations being cut off at the edges.
        const x = clamp((projected.x * 0.5 + 0.5) * width, 70, Math.max(70, width - 70));
        // The lower third of the screen belongs to the console, so labels are
        // kept above it rather than being clamped underneath the panel. On a
        // narrow frame the top belongs to the title card and the scene switcher,
        // which stack down the left instead of sitting beside each other.
        const top = compact ? 150 : 34;
        const y = separate(placed, x, clamp((-projected.y * 0.5 + 0.5) * height, top, Math.max(top, height * 0.68)));
        placed.push({ x, y });
        item.node.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        item.node.style.opacity = item.opacity.toFixed(3);
      }
    },
  };
}
