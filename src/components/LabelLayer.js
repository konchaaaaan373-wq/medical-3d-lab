import * as THREE from 'three';
import { el } from '../utils/dom.js';
import { clamp, smoothstep } from '../utils/math.js';

const FADE = 0.06;

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
        item.opacity = clamp(fadeIn * fadeOut);
      }
    },

    /** Called every frame — cheap enough for a handful of labels. */
    render() {
      const width = viewer.container.clientWidth;
      const height = viewer.container.clientHeight;
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
        // kept above it rather than being clamped underneath the panel.
        const y = clamp((-projected.y * 0.5 + 0.5) * height, 34, Math.max(34, height * 0.68));
        item.node.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        item.node.style.opacity = item.opacity.toFixed(3);
      }
    },
  };
}
