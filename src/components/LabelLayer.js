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

  /**
   * How many labels the frame will carry, and in what order they give way.
   *
   * Labels explain the model; six of them crowding it is the model explained
   * into invisibility, and a phone has room for fewer. When there are more than
   * fit, the ones that go are the ones the reader did not ask for: the
   * structure they pinned outranks the one under their pointer, which outranks
   * the authored landmarks. Nothing is stacked into a spare corner to make it
   * fit — a label somewhere the structure is not is worse than no label.
   *
   * Both numbers are a starting composition rather than a measured limit.
   */
  const LABEL_LIMIT = compact ? 3 : 6;
  const PRIORITY = { selection: 3, hover: 2, landmark: 1 };

  /**
   * How long a label stays after its structure goes behind something.
   *
   * Occlusion flips on and off along an edge while the model turns, and a label
   * that blinks with it is unreadable. Appearing is immediate; disappearing
   * waits this long, which is short enough that a label never lingers over
   * something it is not on.
   *
   * **It applies to occlusion only.** A structure the settings are not drawing
   * is not flickering, and its label goes at once — see `isDrawn` below.
   */
  const OCCLUSION_GRACE_MS = 140;

  const makeItem = (annotation, priority) => {
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
    return { annotation, node, body, leader, lead, opacity: 0, priority, seenAt: 0 };
  };

  const items = shown.map((annotation) => makeItem(annotation, PRIORITY.landmark));
  /** The pinned selection and the hover, when the scene offers labels for them. */
  const dynamic = new Map();

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

    /**
     * The label for what the reader has picked, or is pointing at.
     *
     * `kind` is `selection` or `hover`; `annotation` is one the scene built for
     * that structure, or `null` for none. Replacing it rebuilds the one node
     * rather than the layer, so the landmarks are untouched by a click.
     */
    setStructureLabel(kind, annotation) {
      const existing = dynamic.get(kind);
      if (existing?.annotation.id === annotation?.id) return;
      if (existing) {
        existing.node.remove();
        dynamic.delete(kind);
      }
      if (!annotation) return;
      // A led label would need a lead direction nobody authored for an
      // arbitrary structure; anchored placement puts it on the structure.
      const item = makeItem(annotation, PRIORITY[kind] ?? PRIORITY.landmark);
      // Shown from the moment it exists. The landmarks get their opacity from
      // the progression window on the next `update`, and a label the reader
      // just asked for cannot wait for a stage change that may never come —
      // which is exactly how the first version of this stayed invisible.
      item.opacity = 1;
      dynamic.set(kind, item);
    },

    /** Visibility follows the progression window each annotation declares. */
    update(progress) {
      // A label the reader asked for has no progression window: it is shown
      // because they chose it, not because the sequence reached a stage.
      for (const item of dynamic.values()) item.opacity = 1;
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
      const now = typeof performance === 'object' ? performance.now() : Date.now();
      let drawn = 0;
      // Highest priority first, so the cap takes from the bottom.
      const order = [...dynamic.values(), ...items].sort((a, b) => b.priority - a.priority);
      for (const item of order) {
        if (item.opacity < 0.01) {
          item.node.style.opacity = '0';
          item.node.style.visibility = 'hidden';
          continue;
        }
        projected.copy(item.annotation.position).project(viewer.camera);
        // z > 1 means the anchor is behind the camera.
        const offscreen = projected.z > 1 || Math.abs(projected.x) > 1.15 || Math.abs(projected.y) > 1.15;
        // Nothing here is depth-tested — these are HTML boxes over the canvas —
        // so a scene that knows what is in front of its own anchors is asked.
        // A label for a structure the reader cannot see is a label pointing at
        // whatever happens to be drawn there instead, which for a left/right
        // pair is a mistake with a name attached. It is hidden **where it is**:
        // it must not be pushed to a clearer part of the screen, because a
        // leader line to a place the structure is not says the same thing.
        // Seen means seen now; unseen has to hold for a moment before the
        // label goes, or it blinks along every occlusion edge the model turns
        // through.
        //
        // **The grace is for occlusion and for nothing else.** A structure the
        // settings are not drawing — hidden by the reader, isolated away, taken
        // out of the way by a display recipe — is gone now, not in 140 ms: that
        // is not an edge flickering, it is a thing that is not there, and a name
        // left over it for even a moment names whatever is behind it. Scenes
        // that cannot answer the question are unchanged.
        const undrawn = item.annotation.isDrawn?.() === false;
        if (undrawn) item.seenAt = 0;
        else if (item.annotation.isVisible?.(viewer.camera) !== false) item.seenAt = now;
        const unseen = item.seenAt > 0 && now - item.seenAt > OCCLUSION_GRACE_MS;
        const never = item.seenAt === 0 && item.annotation.isVisible?.(viewer.camera) === false;
        const over = drawn >= LABEL_LIMIT;
        const hide = offscreen || undrawn || unseen || never || over;
        item.node.style.visibility = hide ? 'hidden' : 'visible';
        if (hide) continue;
        drawn += 1;
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
