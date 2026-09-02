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
    if (key === 'class') {
      node.className = value;
      applyLanguage(node, value);
    }
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

/**
 * The product renders both languages and hides one with CSS, which is what
 * makes switching free. A screen reader, though, reads what is in the DOM: an
 * unmarked Japanese string inside an English document is announced with English
 * phonemes, and vice versa — unintelligible in either direction.
 *
 * The class already says which language a span holds, so the attribute is
 * derived from it here rather than repeated at several hundred call sites,
 * where it would inevitably be forgotten on the next one.
 *
 * @param {HTMLElement} node
 * @param {string} className
 */
function applyLanguage(node, className) {
  const classes = String(className).split(/\s+/);
  if (classes.includes('lang-ja')) node.setAttribute('lang', 'ja');
  else if (classes.includes('lang-en')) node.setAttribute('lang', 'en');
}

/**
 * A skip link, for surfaces that put navigation before their content.
 *
 * Visible only when focused. It keeps `href` so it is a real link to assistive
 * technology and to a reader with JavaScript off, but **it moves focus itself
 * and prevents the default**, so the hash never changes.
 *
 * That is not tidiness. This product routes on the hash, and `#content` is not
 * `#/content`: it resolved to a scene, so following the skip link reloaded the
 * page into the default 3D model. An accessibility affordance that throws the
 * reader out of the page they were reading is worse than not having one.
 * `router.isInPageAnchor` is the other half of that fix.
 *
 * Moving focus is what a skip link is *for* in any case — scrolling alone
 * leaves the next Tab back at the top of the navigation it just skipped.
 *
 * @param {string} targetId an id on the page, on the first element of content
 */
export const skipLink = (targetId = 'content') =>
  el(
    'a',
    {
      class: 'skip-link',
      href: `#${targetId}`,
      on: {
        click: (event) => {
          const target = document.getElementById(targetId);
          if (!target) return;
          event.preventDefault();
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: 'start' });
        },
      },
    },
    [
      el('span', { class: 'lang-en', text: 'Skip to content' }),
      el('span', { class: 'lang-ja', text: '本文へ移動' }),
    ]
  );

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
  story: icon(
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5zM13 3h4.5A2.5 2.5 0 0 1 20 5.5v16A2.5 2.5 0 0 0 17.5 19H13z"/>'
  ),
  compare: icon(
    '<path d="M11 3h2v18h-2zM3 6h6v2H3zm0 4h6v2H3zm0 4h6v2H3zM15 6h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>'
  ),
  reel: icon(
    '<path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4.5 3.5v9l7-4.5z"/>'
  ),
  // Stacked bars: the numbers behind the picture.
  data: icon('<path d="M4 19h16v2H4zM6 10h3v7H6zM10.5 5h3v12h-3zM15 12h3v5h-3z"/>'),
  // A lightbulb: predict, then find out.
  learn: icon(
    '<path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2zM9.5 19h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zm.5 2h4a2 2 0 0 1-4 0z"/>'
  ),
  eye: icon(
    '<path d="M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>'
  ),
  // A magnifier rather than a bare +/-: on its own a plus reads as "add".
  // Stroked rather than filled — at 18px a filled ring closes up and the sign
  // inside it disappears, which is exactly the detail that carries the meaning.
  zoomIn: icon(
    '<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="10.3" cy="10.3" r="6.4"/><path d="M15.2 15.2 20.6 20.6"/><path d="M10.3 7.4v5.8M7.4 10.3h5.8"/></g>'
  ),
  zoomOut: icon(
    '<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="10.3" cy="10.3" r="6.4"/><path d="M15.2 15.2 20.6 20.6"/><path d="M7.4 10.3h5.8"/></g>'
  ),
};
