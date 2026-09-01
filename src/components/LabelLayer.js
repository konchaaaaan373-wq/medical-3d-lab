import * as THREE from 'three';
import { el } from '../utils/dom.js';
import { clamp, smoothstep } from '../utils/math.js';

const FADE = 0.06;

/**
 * Minimum spacing between two labels, in px. Roughly a label's own height plus
 * a little air; anything closer and the two boxes overlap and neither reads.
 */
export const STACK_GAP = 34;
/** How far apart horizontally two labels have to be before they can share a row. */
export const COLUMN_GAP = 150;

/**
 * Nudge a label down until it is clear of the ones already placed.
 *
 * Exported for the tests: it is pure geometry, and the property that matters —
 * that no two labels end up closer than `STACK_GAP` — is worth pinning.
 *
 * Anchors move with the camera and two of them can end up in the same few
 * pixels — most easily when the sequence points at a chain of structures that
 * are genuinely close together. Losing one of the two labels to an overlap is
 * worse than pointing a few pixels off, so the later one steps down instead.
 */
export function separate(placed, x, y) {
  // Sorted, because the sweep pushes downwards: checking a lower label before a
  // higher one can move this label onto a row the sweep has already passed.
  const column = placed
    .filter((other) => Math.abs(other.x - x) <= COLUMN_GAP)
    .sort((a, b) => a.y - b.y);
  let result = y;
  for (const other of column) {
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
    // `lead` pushes the text box away from the anchor (screen px) so the
    // label never sits on top of the structure it names; a leader line runs
    // from the anchor dot to the box. Labels without a lead keep the old
    // anchored placement.
    const lead = annotation.lead ? [...annotation.lead] : null;
    if (lead && compact) {
      lead[0] *= 0.55;
      lead[1] *= 0.55;
    }
    const leader = lead ? el('span', { class: 'label-leader' }) : null;
    const body = el('span', { class: 'label-body' }, [
      el('span', { class: 'label-en lang-en', text: annotation.text }),
      el('span', { class: 'label-ja lang-ja', text: annotation.sub }),
    ]);
    const node = el('div', { class: lead ? 'label3d label3d-led' : 'label3d' }, [
      el('span', { class: 'label-dot' }),
      ...(leader ? [leader] : []),
      body,
    ]);
    element.append(node);
    return { annotation, node, body, leader, lead, opacity: 0 };
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
        // An annotation with no window is visible throughout, which is what
        // "no window" means. Reading it unguarded took a whole scene down at
        // build time for a missing two-element array — see the same class of
        // failure in `ModelControls`. A label is chrome; it must never be able
        // to prevent the model being drawn.
        const [from, to] = item.annotation.range ?? [0, 1];
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
        const top = compact ? 150 : 34;
        const ax = (projected.x * 0.5 + 0.5) * width;
        const ay = (-projected.y * 0.5 + 0.5) * height;

        if (item.lead) {
          // The dot marks the anchor; the text box sits at the end of its
          // lead, kept on screen and clear of the other labels, with the
          // leader line redrawn between them.
          const bx = clamp(ax + item.lead[0], 70, Math.max(70, width - 70));
          const by = separate(placed, bx, clamp(ay + item.lead[1], top, Math.max(top, height * 0.72)));
          placed.push({ x: bx, y: by });
          item.node.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;
          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          item.leader.style.width = `${Math.max(0, len - 10).toFixed(1)}px`;
          item.leader.style.transform = `rotate(${angle.toFixed(4)}rad)`;
          item.body.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) translate(-50%, -50%)`;
          item.node.style.opacity = item.opacity.toFixed(3);
          continue;
        }

        // Anchored placement, for annotations that already sit off the organ.
        const x = clamp(ax, 70, Math.max(70, width - 70));
        const y = separate(placed, x, clamp(ay, top, Math.max(top, height * 0.68)));
        placed.push({ x, y });
        item.node.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        item.node.style.opacity = item.opacity.toFixed(3);
      }
    },
  };
}
