import { el } from '../../../../utils/dom.js';
import { extractSlice, slicePlane, sliceViewport } from '../../../../models/mriAtlas.js';

/**
 * One plane of the MRI: a canvas, its edge letters, and its pointer.
 *
 * It owns no state. The workbench hands it everything on `draw()` — the
 * volumes, the crosshair voxel, the window, the overlay — and it reports what
 * the reader did through callbacks. That is architecture rule 3 (one owner of
 * state): three planes each remembering "the current slice" is how they come
 * to disagree.
 *
 * ## How a frame is drawn
 *
 * The slice is composed at the volume's own resolution into an `ImageData`
 * (grey through the window table, then the label colour blended over it), put
 * on an offscreen canvas, and drawn scaled into the visible one. Everything
 * geometric — which voxel a pixel is, where the crosshair lands, which letter
 * goes on which edge — comes from `slicePlane` and `sliceViewport` in the model
 * layer, so the picture and the pointer share one transform.
 *
 * The crosshair is drawn with a gap at its centre: the point of a crosshair is
 * to show a place, and a line through that place hides it.
 */

const CROSSHAIR = 'rgba(255, 214, 102, 0.9)';
const SELECTED_OUTLINE = [255, 255, 255];

const hexToRgb = (hex) => {
  const value = parseInt(String(hex).replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export function createSliceView({ plane: planeName, label, onPick, onStep, onZoom, onHover }) {
  const canvas = el('canvas', {
    class: 'mri-slice-canvas',
    tabindex: '0',
    role: 'img',
    'data-plane': planeName,
  });
  const context = canvas.getContext('2d');
  const letters = Object.fromEntries(['left', 'right', 'top', 'bottom'].map((edge) =>
    [edge, el('span', { class: `mri-slice-edge is-${edge}`, 'aria-hidden': 'true' })]));
  const position = el('span', { class: 'mri-slice-position' });
  const element = el('figure', { class: `mri-slice is-${planeName}`, 'data-plane': planeName }, [
    el('figcaption', { class: 'mri-slice-caption' }, [
      el('span', { class: 'mri-slice-name' }, [
        el('span', { class: 'lang-en', text: label.en }),
        el('span', { class: 'lang-ja', text: label.ja }),
      ]),
      position,
    ]),
    el('div', { class: 'mri-slice-frame' }, [canvas, ...Object.values(letters)]),
  ]);

  const buffer = document.createElement('canvas');
  const bufferContext = buffer.getContext('2d');
  let image = null;
  let grey = null;
  let ids = null;
  /** What the last `draw` was given — the pointer reads the geometry from it. */
  let last = null;
  let dragging = false;

  function geometry(frame) {
    const plane = slicePlane(planeName, frame.grid, frame.convention);
    const rect = canvas.getBoundingClientRect();
    const located = plane.fromVoxel(frame.voxel);
    const viewport = sliceViewport(plane, rect.width, rect.height, { zoom: frame.zoom, focus: located });
    return { plane, rect, located, viewport };
  }

  function draw(frame) {
    last = frame;
    const { plane, rect, located, viewport } = geometry(frame);
    if (rect.width < 2 || rect.height < 2) return;
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (!image || image.width !== plane.width || image.height !== plane.height) {
      buffer.width = plane.width;
      buffer.height = plane.height;
      image = bufferContext.createImageData(plane.width, plane.height);
      grey = new Uint8Array(plane.width * plane.height);
      ids = new Uint8Array(plane.width * plane.height);
    }
    extractSlice(frame.intensity, plane, frame.grid, located.slice, grey);
    extractSlice(frame.labels, plane, frame.grid, located.slice, ids);

    const { lut, colours, overlay, overlayOpacity, selectedLabel } = frame;
    const data = image.data;
    const rowWidth = plane.width;
    for (let index = 0; index < grey.length; index += 1) {
      const base = lut[grey[index]];
      const id = ids[index];
      let r = base;
      let g = base;
      let b = base;
      const selected = id !== 0 && id === selectedLabel;
      // The selection is drawn even with the overlay switched off: turning the
      // colours off is "show me the anatomy unpainted", not "forget what I chose".
      if (id !== 0 && (overlay || selected)) {
        const colour = colours[id];
        const alpha = selected ? Math.max(0.55, overlayOpacity) : overlayOpacity;
        r = base + (colour[0] - base) * alpha;
        g = base + (colour[1] - base) * alpha;
        b = base + (colour[2] - base) * alpha;
        if (selected) {
          // A one-pixel edge where the selected label meets anything else.
          const u = index % rowWidth;
          const edge =
            (u > 0 && ids[index - 1] !== id) ||
            (u < rowWidth - 1 && ids[index + 1] !== id) ||
            (index >= rowWidth && ids[index - rowWidth] !== id) ||
            (index + rowWidth < ids.length && ids[index + rowWidth] !== id);
          if (edge) [r, g, b] = SELECTED_OUTLINE;
        }
      }
      const at = index * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
    }
    bufferContext.putImageData(image, 0, 0);

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#000';
    context.fillRect(0, 0, rect.width, rect.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      buffer,
      viewport.offsetX,
      viewport.offsetY,
      plane.width * viewport.scaleX,
      plane.height * viewport.scaleY
    );

    const cross = viewport.toBox(located.u, located.v);
    const gap = 9;
    context.strokeStyle = CROSSHAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, Math.round(cross.y) + 0.5);
    context.lineTo(cross.x - gap, Math.round(cross.y) + 0.5);
    context.moveTo(cross.x + gap, Math.round(cross.y) + 0.5);
    context.lineTo(rect.width, Math.round(cross.y) + 0.5);
    context.moveTo(Math.round(cross.x) + 0.5, 0);
    context.lineTo(Math.round(cross.x) + 0.5, cross.y - gap);
    context.moveTo(Math.round(cross.x) + 0.5, cross.y + gap);
    context.lineTo(Math.round(cross.x) + 0.5, rect.height);
    context.stroke();

    for (const [edge, node] of Object.entries(letters)) node.textContent = plane.edges[edge];
    const axisLetter = ['x', 'y', 'z'][plane.throughAxis];
    const mm = frame.voxel[plane.throughAxis] * frame.grid.spacingMm[plane.throughAxis] + frame.grid.originMm[plane.throughAxis];
    position.textContent = `${axisLetter} = ${mm > 0 ? '+' : ''}${mm} mm`;
    canvas.dataset.slice = String(located.slice);
    canvas.dataset.edges = `${plane.edges.left}${plane.edges.right}${plane.edges.top}${plane.edges.bottom}`;
    canvas.setAttribute('aria-label', frame.describe(planeName, mm));
  }

  function voxelAt(event) {
    if (!last) return null;
    const { plane, rect, located, viewport } = geometry(last);
    const pixel = viewport.toPixel(event.clientX - rect.left, event.clientY - rect.top);
    return pixel ? plane.toVoxel(pixel.u, pixel.v, located.slice) : null;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const voxel = voxelAt(event);
    if (!voxel) return;
    dragging = true;
    canvas.setPointerCapture?.(event.pointerId);
    onPick(voxel, { final: false });
  });
  canvas.addEventListener('pointermove', (event) => {
    const voxel = voxelAt(event);
    if (dragging && voxel) onPick(voxel, { final: false });
    else if (!dragging) onHover?.(voxel, event);
  });
  const finish = (event) => {
    if (!dragging) return;
    dragging = false;
    const voxel = voxelAt(event);
    onPick(voxel ?? last.voxel, { final: true });
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });
  canvas.addEventListener('pointerleave', () => onHover?.(null));
  // Not passive: the wheel moves through slices, and the page must not scroll
  // under it. Ctrl/⌘ + wheel (which is also what a trackpad pinch sends) zooms.
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    if (event.ctrlKey || event.metaKey) onZoom(direction);
    else onStep(planeName, direction);
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    if (!last) return;
    const plane = slicePlane(planeName, last.grid, last.convention);
    const located = plane.fromVoxel(last.voxel);
    const move = (du, dv) => {
      const u = Math.min(plane.width - 1, Math.max(0, located.u + du));
      const v = Math.min(plane.height - 1, Math.max(0, located.v + dv));
      onPick(plane.toVoxel(u, v, located.slice), { final: true });
    };
    const big = event.shiftKey ? 10 : 1;
    const keys = {
      ArrowLeft: () => move(-big, 0),
      ArrowRight: () => move(big, 0),
      ArrowUp: () => move(0, -big),
      ArrowDown: () => move(0, big),
      PageUp: () => onStep(planeName, big),
      PageDown: () => onStep(planeName, -big),
      '+': () => onZoom(1),
      '=': () => onZoom(1),
      '-': () => onZoom(-1),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  return { element, canvas, draw, plane: planeName };
}

export { hexToRgb };
