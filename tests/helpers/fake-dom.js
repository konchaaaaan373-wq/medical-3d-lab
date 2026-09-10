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

  replaceChildren(...children) {
    for (const child of this.children) {
      if (child instanceof FakeElement && child.parentElement === this) child.parentElement = null;
    }
    this.children = [];
    this.textContent = '';
    this.append(...children);
  }

  remove() {
    const siblings = this.parentElement?.children;
    if (!siblings) return;
    const at = siblings.indexOf(this);
    if (at >= 0) siblings.splice(at, 1);
    this.parentElement = null;
  }

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

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child instanceof FakeElement && child.contains(node));
  }

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

  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener({ currentTarget: this, target: this, ...event });
    }
    return true;
  }
}

export function installFakeDocument() {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
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
