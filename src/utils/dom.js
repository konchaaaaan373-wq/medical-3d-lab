/** Minimal DOM helpers — enough structure to keep the UI code declarative,
 *  without pulling in a framework for what is essentially one panel. */

/**
 * @param {string} tag
 * @param {Record<string, any>} [props] `class`, `text`, `html`, `on` (event map) or any attribute
 * @param {(Node|string|null|undefined)[]} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'on') for (const [type, fn] of Object.entries(value)) node.addEventListener(type, fn);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child);
  }
  return node;
}

export const icon = (paths, { size = 18 } = {}) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="currentColor">${paths}</svg>`;

export const ICONS = {
  play: icon('<path d="M8 5.5v13l11-6.5z"/>'),
  pause: icon('<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>'),
  reset: icon(
    '<path d="M12 5V2L7.5 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"/>'
  ),
  camera: icon(
    '<path d="M9 4h6l1.2 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.8zM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>'
  ),
  frame: icon(
    '<path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/>'
  ),
  eye: icon(
    '<path d="M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>'
  ),
};
