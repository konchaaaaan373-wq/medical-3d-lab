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

  const items = annotations.map((annotation) => {
    const node = el('div', { class: 'label3d' }, [
      el('span', { class: 'label-dot' }),
      el('span', { class: 'label-body' }, [
        el('span', { class: 'label-en', text: annotation.text }),
        el('span', { class: 'label-ja', text: annotation.sub }),
      ]),
    ]);
    element.append(node);
    return { annotation, node, opacity: 0 };
  });

  const projected = new THREE.Vector3();

  return {
    element,

    /** Visibility follows the progression window each annotation declares. */
    update(progress) {
      for (const item of items) {
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
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        item.node.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        item.node.style.opacity = item.opacity.toFixed(3);
      }
    },
  };
}
