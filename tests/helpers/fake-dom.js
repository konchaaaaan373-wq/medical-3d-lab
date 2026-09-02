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
    this.textContent = '';
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === 'class') this.className = stringValue;
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

  append(...children) {
    this.children.push(...children);
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
}

export function installFakeDocument() {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
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
