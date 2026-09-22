/**
 * Just enough DOM to run this repository's own components under `node --test`.
 *
 * ## What this is, and what it is not
 *
 * It is a host environment, not a stand-in for the thing under test. The
 * component a test drives is the real `src/components/…` module, importing the
 * real `src/utils/dom.js`; only `document` is supplied from here. Nothing in
 * this file reimplements a panel, and a test that asserted against a copy of
 * one would be proving something about the copy.
 *
 * It is **not** a DOM. There is no layout, no CSS, no cascade, no computed
 * style, no event bubbling beyond what a panel's own handlers need, and
 * `querySelector` understands one class selector and refuses everything else
 * rather than quietly answering `null`. Anything that depends on any of that —
 * whether a row is *visible*, whether a control is big enough to press, whether
 * a hidden row still has text in the page — is not answerable here and is
 * checked in a browser by `scripts/check-disease-interaction.mjs`.
 *
 * ## Why a fixture rather than a dependency
 *
 * `package.json` carries one runtime dependency and one dev dependency on
 * purpose. A DOM implementation would be a third, to run assertions that the
 * browser checks already run against the real thing. The trade is that this
 * file can be wrong — so the behaviours the node tests assert here are asserted
 * again in the browser, and a disagreement between the two is a finding about
 * this file.
 *
 * `selfTest()` is the other half of that: it exercises the operations the
 * components use, so a fixture that stops behaving like a DOM fails on its own
 * terms rather than by making a component look broken.
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

class MiniText {
  constructor(data) {
    this.nodeType = TEXT_NODE;
    this.data = String(data);
    this.parentNode = null;
  }

  get textContent() {
    return this.data;
  }

  set textContent(value) {
    this.data = String(value);
  }
}

class MiniElement {
  constructor(tag) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = String(tag).toUpperCase();
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    /** Mirrors the property the components set, and the attribute it reflects. */
    this._hidden = false;
  }

  // --- attributes ----------------------------------------------------------

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  hasAttribute(name) {
    return this.attributes.has(String(name));
  }

  get className() {
    return this.getAttribute('class') ?? '';
  }

  set className(value) {
    this.setAttribute('class', String(value));
  }

  get classList() {
    const names = () => this.className.split(/\s+/).filter(Boolean);
    const write = (list) => { this.className = list.join(' '); };
    return {
      contains: (name) => names().includes(name),
      add: (...add) => write([...new Set([...names(), ...add])]),
      remove: (...drop) => write(names().filter((name) => !drop.includes(name))),
      toggle: (name, force) => {
        const on = force === undefined ? !names().includes(name) : Boolean(force);
        if (on) write([...new Set([...names(), name])]);
        else write(names().filter((candidate) => candidate !== name));
        return on;
      },
    };
  }

  /** The property the components write, reflected to the attribute as a browser does. */
  get hidden() {
    return this._hidden;
  }

  set hidden(value) {
    this._hidden = Boolean(value);
    if (this._hidden) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  get title() {
    return this.getAttribute('title') ?? '';
  }

  set title(value) {
    this.setAttribute('title', value);
  }

  // --- children ------------------------------------------------------------

  get children() {
    return this.childNodes.filter((node) => node.nodeType === ELEMENT_NODE);
  }

  append(...nodes) {
    for (const node of nodes.flat()) {
      if (node == null) continue;
      const child = typeof node === 'string' ? new MiniText(node) : node;
      child.parentNode?.removeChild?.(child);
      child.parentNode = this;
      this.childNodes.push(child);
    }
  }

  removeChild(child) {
    const at = this.childNodes.indexOf(child);
    if (at >= 0) this.childNodes.splice(at, 1);
    if (child.parentNode === this) child.parentNode = null;
    return child;
  }

  insertBefore(node, reference) {
    node.parentNode?.removeChild?.(node);
    const at = reference ? this.childNodes.indexOf(reference) : -1;
    if (at < 0) this.childNodes.push(node);
    else this.childNodes.splice(at, 0, node);
    node.parentNode = this;
    return node;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  replaceChildren(...nodes) {
    for (const child of [...this.childNodes]) child.parentNode = null;
    this.childNodes = [];
    this.append(...nodes);
  }

  get textContent() {
    return this.childNodes.map((node) => node.textContent).join('');
  }

  set textContent(value) {
    this.replaceChildren();
    if (value !== '' && value != null) this.append(new MiniText(value));
  }

  set innerHTML(value) {
    // No parser here. A component that needs one is out of this fixture's
    // range, and saying so is better than half-parsing a string.
    if (String(value).includes('<')) {
      throw new Error('miniDom: innerHTML with markup is not supported — test this in a browser');
    }
    this.textContent = value;
  }

  // --- selectors -----------------------------------------------------------

  /** One class selector, and a refusal for anything else. */
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const match = /^\.([A-Za-z0-9_-]+)$/.exec(String(selector).trim());
    if (!match) {
      throw new Error(
        `miniDom: only a single class selector is supported, got ${JSON.stringify(selector)}. `
        + 'Anything finer is a question for a browser.'
      );
    }
    const wanted = match[1];
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.className.split(/\s+/).includes(wanted)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }

  // --- events --------------------------------------------------------------

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    const at = list.indexOf(fn);
    if (at >= 0) list.splice(at, 1);
  }

  /** No bubbling: a panel's handlers are on the element that was pressed. */
  dispatchEvent(event) {
    for (const fn of this.listeners.get(event.type) ?? []) fn.call(this, event);
    return true;
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }
}

/** Install a document for the components to build into. Returns a teardown. */
export function installMiniDom() {
  const document = {
    createElement: (tag) => new MiniElement(tag),
    createTextNode: (data) => new MiniText(data),
    body: new MiniElement('body'),
  };
  const previous = globalThis.document;
  globalThis.document = document;
  return () => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  };
}

/** Walk the whole tree, elements only, in document order. */
export function descendants(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

/** The chain of class names from a node up to the root it sits in. */
export function ancestry(node) {
  const out = [];
  for (let at = node.parentNode; at; at = at.parentNode) out.push(at.className);
  return out;
}

/**
 * The fixture's own guard.
 *
 * Every operation here is one the components under test perform. A fixture that
 * quietly stops behaving like a DOM would otherwise show up as a component bug,
 * which is the most expensive kind of wrong test to read.
 */
export function selfTest(assert) {
  const teardown = installMiniDom();
  try {
    const root = document.createElement('div');
    const a = document.createElement('span');
    const b = document.createElement('span');
    a.className = 'one lang-en';
    root.append(a, b);
    assert.deepEqual(root.children, [a, b], 'append keeps order');
    assert.equal(a.parentNode, root);

    // Appending somewhere else moves the node rather than duplicating it.
    const other = document.createElement('div');
    other.append(a);
    assert.deepEqual(root.children, [b], 'a moved child leaves its old parent');
    assert.deepEqual(other.children, [a]);
    assert.equal(a.parentNode, other);

    // classList and className are the same storage.
    a.classList.add('two');
    assert.equal(a.className, 'one lang-en two');
    a.classList.toggle('one', false);
    assert.equal(a.classList.contains('one'), false);
    assert.equal(a.classList.contains('two'), true);

    // `hidden` reflects to the attribute, as a browser does.
    b.hidden = true;
    assert.equal(b.getAttribute('hidden'), '');
    b.hidden = false;
    assert.equal(b.hasAttribute('hidden'), false);

    // textContent replaces, and reads through descendants.
    a.textContent = 'x';
    assert.equal(a.textContent, 'x');
    const wrap = document.createElement('p');
    wrap.append(a, b);
    b.textContent = 'y';
    assert.equal(wrap.textContent, 'xy');

    // One class selector works; anything else is refused rather than null.
    assert.equal(wrap.querySelector('.lang-en'), a);
    assert.throws(() => wrap.querySelector('div > span'), /only a single class selector/);

    // Events fire on the element they were bound to.
    let clicked = 0;
    b.addEventListener('click', () => { clicked += 1; });
    b.click();
    assert.equal(clicked, 1);

    // dataset is a plain object, including delete.
    b.dataset.change = 'up';
    assert.equal(b.dataset.change, 'up');
    delete b.dataset.change;
    assert.equal(b.dataset.change, undefined);

    // replaceChildren detaches what it replaced.
    wrap.replaceChildren();
    assert.deepEqual(wrap.children, []);
    assert.equal(a.parentNode, null);
  } finally {
    teardown();
  }
}
