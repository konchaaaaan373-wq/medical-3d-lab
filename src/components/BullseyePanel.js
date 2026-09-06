import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';

/**
 * The AHA 17-segment plot — a heart's short axis flattened onto a disc.
 *
 * ## Why this exists beside a 3D heart
 *
 * The scene's claim is spatial: *which* muscle a narrowed artery starves. A
 * territory map answers that, and on the 3D heart it cannot be seen all at
 * once — 73% of the wall facing the opening camera belongs to one artery, and
 * the other two territories are round the back. A reader who does not think to
 * rotate sees one region and no map.
 *
 * This is not a decorative second view. Flattening the short axis is how the
 * question is asked and answered clinically, and it is the one projection where
 * all seventeen segments and all three territories are visible together. The
 * 3D says *where on a heart*; this says *how much of the heart*, and neither
 * substitutes for the other. `docs/product-principles.md` is explicit that 3D
 * is a means: where 2D answers a question better, it is the honest choice.
 *
 * ## Why it cannot disagree with the heart beside it
 *
 * Every wedge's angle is the segment's own `phi`, out of the same
 * `AHA_SEGMENTS` table the 3D reads. On the ventricle a point at azimuth `phi`
 * sits at `(r·sin φ, ·, r·cos φ)`; here it sits at `(r·sin φ, −r·cos φ)`. Those
 * are the same two numbers, which is why this is the ventricle seen down its
 * own long axis and not a second drawing of the same idea. Rotate the segment
 * ring in the anatomy and this rotates with it.
 *
 * The convention that falls out of that is the standard one: anterior at the
 * top, the septum at nine o'clock, the lateral wall at three — the heart seen
 * from the apex.
 *
 * ### Spec (static)
 * ```
 * { id, title, titleJa,
 *   rings: [{ level, segments: [{ id, number, phi, span, territory, label, labelJa }] }],
 *   colors: { [territory]: css }, ischemic: css }
 * ```
 *
 * ### Data (per frame)
 * ```
 * { burden: { [segmentId]: 0..1 }, focus?: string[] }
 * ```
 */

/** Ring radii as fractions of the plot's own radius, outermost first. */
const RING_RADII = Object.freeze({
  basal: [0.72, 1],
  mid: [0.44, 0.72],
  apical: [0.18, 0.44],
  apex: [0, 0.18],
});

/** How dark the line between two *territories* is, against the one between two segments. */
const TERRITORY_EDGE = 'rgba(8, 10, 16, 0.92)';
const SEGMENT_EDGE = 'rgba(255, 255, 255, 0.16)';

/** Mix two CSS hex colours in sRGB, `t` of the second. */
function mixHex(a, b, t) {
  const parse = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const at = (x, y) => Math.round(x + (y - x) * Math.min(1, Math.max(0, t)));
  return `rgb(${at(ar, br)}, ${at(ag, bg)}, ${at(ab, bb)})`;
}

export function createBullseyePanel(spec) {
  const canvas = el('canvas', { class: 'chart-canvas bullseye-canvas' });
  if (spec.height) canvas.style.height = `${spec.height}px`;
  const context = canvas.getContext('2d');

  const element = el('div', { class: 'panel chart bullseye', 'data-bullseye': spec.id }, [
    el('div', { class: 'chart-head' }, [
      el('span', { class: 'lang-en', text: spec.title }),
      el('span', { class: 'lang-ja', text: spec.titleJa }),
    ]),
    canvas,
    el('div', { class: 'chart-key' }, [
      el('span', { class: 'lang-en', text: spec.caption }),
      el('span', { class: 'lang-ja', text: spec.captionJa }),
    ]),
  ]);

  let data = null;
  let cssWidth = 0;
  let cssHeight = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /** Where a segment sits: `phi` is the anatomy's azimuth, straight through. */
  function wedge(cx, cy, radius, segment, ring) {
    const [inner, outer] = RING_RADII[ring];
    // Canvas angles run clockwise from +x; the plot's 12 o'clock is anterior,
    // which is `phi` 0, so the offset is a quarter turn back.
    const from = segment.phi - segment.span / 2 - Math.PI / 2;
    const to = segment.phi + segment.span / 2 - Math.PI / 2;
    context.beginPath();
    if (inner === 0) {
      context.arc(cx, cy, radius * outer, 0, Math.PI * 2);
    } else {
      context.arc(cx, cy, radius * inner, from, to);
      context.arc(cx, cy, radius * outer, to, from, true);
      context.closePath();
    }
  }

  function draw() {
    if (!data) return;
    if (!cssWidth && !resize()) return;

    context.clearRect(0, 0, cssWidth, cssHeight);
    const cx = cssWidth / 2;
    const cy = cssHeight / 2 + 4;
    const radius = Math.min(cssWidth, cssHeight - 18) / 2 - 2;
    if (radius <= 0) return;

    for (const ring of spec.rings) {
      for (const segment of ring.segments) {
        const burden = Math.min(1, Math.max(0, data.burden?.[segment.id] ?? 0));
        wedge(cx, cy, radius, segment, ring.level);
        context.fillStyle = mixHex(spec.colors[segment.territory], spec.ischemic, burden);
        context.fill();
        context.strokeStyle = SEGMENT_EDGE;
        context.lineWidth = 1;
        context.stroke();
      }
    }

    // The territory boundaries, drawn over everything: the reason the panel is
    // here is that the three territories are three regions, and a grid of
    // seventeen wedges does not say that on its own.
    context.strokeStyle = TERRITORY_EDGE;
    context.lineWidth = 2;
    for (const ring of spec.rings) {
      for (const segment of ring.segments) {
        const [inner, outer] = RING_RADII[ring.level];
        if (inner === 0) continue;
        const neighbours = ring.segments;
        for (const edge of [-1, 1]) {
          const at = segment.phi + (edge * segment.span) / 2;
          const next = neighbours.find(
            (other) =>
              other !== segment &&
              Math.abs(Math.atan2(Math.sin(other.phi - at), Math.cos(other.phi - at))) <
                other.span / 2 + 1e-6
          );
          if (!next || next.territory === segment.territory) continue;
          const angle = at - Math.PI / 2;
          context.beginPath();
          context.moveTo(cx + Math.cos(angle) * radius * inner, cy + Math.sin(angle) * radius * inner);
          context.lineTo(cx + Math.cos(angle) * radius * outer, cy + Math.sin(angle) * radius * outer);
          context.stroke();
        }
        // And the ring boundary, where the territory changes with depth.
        const below = spec.rings.find((r) => r.level === ring.below);
        const under = below?.segments.find(
          (other) =>
            Math.abs(Math.atan2(Math.sin(other.phi - segment.phi), Math.cos(other.phi - segment.phi))) <
            other.span / 2
        );
        if (under && under.territory !== segment.territory) {
          context.beginPath();
          context.arc(cx, cy, radius * inner, segment.phi - segment.span / 2 - Math.PI / 2, segment.phi + segment.span / 2 - Math.PI / 2);
          context.stroke();
        }
      }
    }

    // Segment numbers, small: the plot is read by region, and the numbers are
    // there for a reader who wants to name what they are looking at.
    context.font = '600 9px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(255, 255, 255, 0.62)';
    for (const ring of spec.rings) {
      for (const segment of ring.segments) {
        const [inner, outer] = RING_RADII[ring.level];
        const at = ((inner + outer) / 2) * radius;
        const angle = segment.phi - Math.PI / 2;
        context.fillText(String(segment.number), cx + Math.cos(angle) * at, cy + Math.sin(angle) * at);
      }
    }

    // Which way the reader is looking. Without it a bullseye is a disc of
    // wedges and the septum could be either side.
    context.font = '600 8px system-ui, sans-serif';
    context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const edge = radius + 9;
    for (const [text, angle] of [
      [inLanguage(spec.orientation.anterior, spec.orientation.anteriorJa), -Math.PI / 2],
      [inLanguage(spec.orientation.lateral, spec.orientation.lateralJa), 0],
      [inLanguage(spec.orientation.inferior, spec.orientation.inferiorJa), Math.PI / 2],
      [inLanguage(spec.orientation.septal, spec.orientation.septalJa), Math.PI],
    ]) {
      context.fillText(text, cx + Math.cos(angle) * edge, cy + Math.sin(angle) * edge);
    }
  }

  return {
    element,
    id: spec.id,
    /** @param {object} next per-frame burden by segment id */
    update(next) {
      data = next;
      draw();
    },
    resize() {
      resize();
      draw();
    },
    setFocused(focused) {
      element.classList.toggle('is-focused', Boolean(focused));
    },
  };
}
