class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }

  removeProperty(name) {
    const value = this.values.get(name) ?? '';
    this.values.delete(name);
    return value;
  }

  getPropertyValue(name) {
    return this.values.get(name) ?? '';
  }
}

class FakeClassList {
  constructor(element) {
    this.element = element;
  }

  tokens() {
    return new Set(this.element.className.split(/\s+/).filter(Boolean));
  }

  write(tokens) {
    this.element.className = [...tokens].join(' ');
  }

  add(...names) {
    const tokens = this.tokens();
    names.forEach((name) => tokens.add(name));
    this.write(tokens);
  }

  remove(...names) {
    const tokens = this.tokens();
    names.forEach((name) => tokens.delete(name));
    this.write(tokens);
  }

  contains(name) {
    return this.tokens().has(name);
  }

  toggle(name, force) {
    const tokens = this.tokens();
    const enabled = force === undefined ? !tokens.has(name) : Boolean(force);
    if (enabled) tokens.add(name);
    else tokens.delete(name);
    this.write(tokens);
    return enabled;
  }
}

export class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.classList = new FakeClassList(this);
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.style = new FakeStyle();
    this.hidden = false;
    this.disabled = false;
    // Real form controls always have one, and code that reads `.value` before
    // anybody has typed is normal rather than defensive. Leaving it `undefined`
    // made a `value.trim()` throw inside a component that works in a browser,
    // which is the fake disagreeing with the DOM rather than a bug being found.
    this.value = '';
    this.textContent = '';
    this.parentElement = null;
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === 'class') this.className = stringValue;
    if (name === 'hidden') this.hidden = true;
    if (name === 'disabled') this.disabled = true;
    if (name === 'style') {
      for (const declaration of stringValue.split(';')) {
        const separator = declaration.indexOf(':');
        if (separator < 0) continue;
        this.style.setProperty(
          declaration.slice(0, separator).trim(),
          declaration.slice(separator + 1).trim()
        );
      }
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'class') this.className = '';
    if (name === 'hidden') this.hidden = false;
    if (name === 'disabled') this.disabled = false;
  }

  append(...children) {
    for (const child of children) {
      if (child instanceof FakeElement) {
        if (child.parentElement) {
          const siblings = child.parentElement.children;
          const at = siblings.indexOf(child);
          if (at >= 0) siblings.splice(at, 1);
        }
        child.parentElement = this;
      }
      this.children.push(child);
    }
  }

  /**
   * `append`, at the front.
   *
   * Absent until a component that uses it could not be tested: production code
   * writes `node.prepend?.(child)` so that it degrades rather than throws, and
   * against a fake without this the call was a **silent no-op** — the move it
   * performs was asserted nowhere and would have passed with the feature
   * removed. A fake missing a method does not fail; it agrees with whatever
   * you expected.
   */
  prepend(...children) {
    for (const child of [...children].reverse()) {
      if (child instanceof FakeElement) {
        if (child.parentElement) {
          const siblings = child.parentElement.children;
          const at = siblings.indexOf(child);
          if (at >= 0) siblings.splice(at, 1);
        }
        child.parentElement = this;
      }
      this.children.unshift(child);
    }
  }

  /** Whether this node is, or contains, the given one. */
  contains(node) {
    for (let at = node; at; at = at.parentElement) {
      if (at === this) return true;
    }
    return false;
  }

  replaceChildren(...children) {
    for (const child of this.children) {
      if (child instanceof FakeElement && child.parentElement === this) child.parentElement = null;
    }
    this.children = [];
    this.textContent = '';
    this.append(...children);
  }

  /** Detach from wherever this is, the way `Element.remove()` does. */
  remove() {
    const siblings = this.parentElement?.children;
    if (!siblings) return;
    const at = siblings.indexOf(this);
    if (at >= 0) siblings.splice(at, 1);
    this.parentElement = null;
  }

  /**
   * The nearest ancestor (or self) matching a simple selector.
   *
   * `#id` and `.class` only — which is all the product's components ask for,
   * and pretending to support more would invite a test that passes here and
   * fails in a browser.
   */
  closest(selector) {
    const matches = (node) =>
      selector.startsWith('#')
        ? node.id === selector.slice(1)
        : selector.startsWith('.')
          ? node.classList.contains(selector.slice(1))
          : node.tagName === selector.toUpperCase();
    for (let node = this; node; node = node.parentElement) {
      if (matches(node)) return node;
    }
    return null;
  }

  /**
   * The first descendant matching a simple selector, or null.
   *
   * `#id`, `.class`, `.class.class` and a tag name — the same grammar
   * `closest` accepts, for the same reason: the product's components ask for
   * nothing more, and pretending to support more would invite a test that
   * passes here and fails in a browser.
   */
  querySelector(selector) {
    const [found] = this.querySelectorAll(selector);
    return found ?? null;
  }

  /** Every descendant matching a simple selector, in document order. */
  querySelectorAll(selector) {
    const wanted = String(selector).trim();
    const matches = (node) => {
      if (wanted.startsWith('#')) return node.id === wanted.slice(1);
      if (wanted.startsWith('.')) {
        return wanted.slice(1).split('.').every((name) => node.classList.contains(name));
      }
      return node.tagName === wanted.toUpperCase();
    };
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (!(child instanceof FakeElement)) continue;
        if (matches(child)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  /** This element, or anything under it. */
  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child instanceof FakeElement && child.contains(node));
  }

  /**
   * Take focus.
   *
   * `document.activeElement` is what a component reads to decide where to send
   * focus back to, so the fake document has to have one for that to be testable
   * at all.
   */
  focus() {
    if (globalThis.document) globalThis.document.activeElement = this;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  click() {
    for (const listener of this.listeners.get('click') ?? []) {
      listener({ type: 'click', target: this, currentTarget: this });
    }
  }

  /**
   * Deliver an event to this element's own listeners.
   *
   * No capture and no bubbling: a component that binds one handler on its root
   * and reads `event.target` is testable with this, and one that relies on the
   * event travelling is relying on something this cannot promise — better that
   * it says so by not working than by half-working.
   */
  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener({ currentTarget: this, target: this, ...event });
    }
    return true;
  }
}

/**
 * A stand-in `document`.
 *
 * `elements` registers ids for `getElementById`, which components use to reach
 * the one element they did not build (the `#ui` shell). Document-level event
 * listeners are collected rather than dispatched: a component that closes its
 * own dialog on a document `keydown` has to be able to *register* that without
 * the test needing a real event loop.
 */
export function installFakeDocument({ elements = {} } = {}) {
  const previous = globalThis.document;
  const byId = new Map(Object.entries(elements));
  const listeners = new Map();
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: (id) => byId.get(id) ?? null,
    listeners,
    addEventListener(type, listener) {
      const forType = listeners.get(type) ?? new Set();
      forType.add(listener);
      listeners.set(type, forType);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    /**
     * A text node, as far as anything here needs one.
     *
     * `ModelScopePanel` builds `**emphasis**` out of `<strong>` elements and
     * text nodes rather than assigning HTML, so a fake document without this
     * cannot render the one panel whose whole job is careful wording. It is a
     * plain object, not a `FakeElement`: `findByClass` walks elements and must
     * not be handed something claiming to be one.
     */
    createTextNode: (text) => ({ nodeType: 3, text: String(text), textContent: String(text) }),
    activeElement: null,
  };
  return () => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  };
}

export function findByClass(root, className) {
  const matches = [];
  const visit = (node) => {
    if (!(node instanceof FakeElement)) return;
    if (node.classList.contains(className)) matches.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return matches;
}
