import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicDiagnosticCopyControl } from '../src/app/publicDiagnosticCopyControl.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.value = '';
    this.textContent = '';
    this.rows = 0;
    this.maxLength = 0;
    this.readOnly = false;
    this.disabled = false;
    this.focused = false;
    this.selected = false;
    this.removed = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; this.textContent = ''; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  remove() { this.removed = true; }
  async fire(type) {
    const listener = this.listeners.get(type);
    if (listener) await listener({ target: this });
  }
}

const fakeDocument = { createElement: (tag) => new FakeElement(tag) };
const byClass = (root, className) => root.children.find((node) => node.className === className);
const textOf = (node) => [node.textContent, ...node.children.map(textOf)].join('');

test('control previews before any copy and uses app language classes', async () => {
  const writes = [];
  const control = createPublicDiagnosticCopyControl({
    documentRef: fakeDocument,
    clipboard: { async writeText(value) { writes.push(value); } },
    getContext: () => ({ modelId: 'brain-anatomy', language: 'ja', state: 'ready', browser: 'Chrome 151' }),
  });
  const preview = byClass(control.element, 'public-diagnostic-copy__preview');
  const button = byClass(control.element, 'public-diagnostic-copy__button');
  assert.match(preview.value, /model: brain-anatomy/);
  assert.deepEqual(writes, []);
  assert.deepEqual(button.children.map((node) => node.className), ['lang-en', 'lang-ja']);
  await button.fire('click');
  assert.equal(writes.length, 1);
  assert.match(textOf(byClass(control.element, 'public-diagnostic-copy__status')), /Copied/);
});

test('clipboard refusal leaves a visible selectable fallback', async () => {
  const control = createPublicDiagnosticCopyControl({
    documentRef: fakeDocument,
    clipboard: { async writeText() { throw new Error('denied'); } },
    getContext: () => ({ modelId: 'brain-anatomy', state: 'error' }),
  });
  const preview = byClass(control.element, 'public-diagnostic-copy__preview');
  const button = byClass(control.element, 'public-diagnostic-copy__button');
  const status = byClass(control.element, 'public-diagnostic-copy__status');
  await button.fire('click');
  assert.equal(preview.focused, true);
  assert.equal(preview.selected, true);
  assert.match(textOf(status), /Clipboard unavailable/);
});

test('dispose removes only its own root', () => {
  const control = createPublicDiagnosticCopyControl({
    documentRef: fakeDocument,
    getContext: () => ({ state: 'unknown' }),
  });
  control.dispose();
  assert.equal(control.element.removed, true);
});
