/**
 * Which language a string that can only hold one is written in.
 *
 * The DOM carries both languages and CSS hides one, so almost nothing in this
 * product has to choose. What does have to choose is everything an attribute
 * holds — `aria-label`, `title`, `placeholder` — and anything drawn into a
 * canvas, which has no CSS at all.
 *
 * The defect these pin down was reported from a phone: a Japanese interface
 * whose login button announced itself to a screen reader as "Sign in", and
 * whose tooltip said the same under a button reading ログイン. Two halves to
 * it — asking for the wrong language, and asking once and never again.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { currentLanguage, inLanguage, onLanguageChange } from '../src/utils/language.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** A document stand-in whose `#ui` carries a language and can change it. */
function withUi(lang) {
  const previous = globalThis.document;
  const previousObserver = globalThis.MutationObserver;
  const ui = { dataset: { lang } };
  /** @type {Array<() => void>} */
  const callbacks = [];
  globalThis.document = { getElementById: (id) => (id === 'ui' ? ui : null) };
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      callbacks.push(() => this.callback());
    }
  };
  return {
    ui,
    /** Flip the language the way a surface does, then let the observers run. */
    setLanguage: (next) => {
      ui.dataset.lang = next;
      for (const fire of callbacks) fire();
    },
    restore: () => {
      if (previous === undefined) delete globalThis.document;
      else globalThis.document = previous;
      if (previousObserver === undefined) delete globalThis.MutationObserver;
      else globalThis.MutationObserver = previousObserver;
    },
  };
}

test('language: with no document at all, the answer is Japanese and nothing throws', () => {
  const previous = globalThis.document;
  delete globalThis.document;
  try {
    // This is the `node --test` case. A missing language lookup must never be
    // the thing that decides whether a component can be built.
    assert.equal(currentLanguage(), 'ja');
    assert.equal(inLanguage('Close', '閉じる'), '閉じる');
  } finally {
    if (previous !== undefined) globalThis.document = previous;
  }
});

test('language: `inLanguage` answers with the language on screen', () => {
  const ui = withUi('en');
  try {
    assert.equal(inLanguage('Sign in', 'ログイン'), 'Sign in');
    ui.ui.dataset.lang = 'ja';
    assert.equal(inLanguage('Sign in', 'ログイン'), 'ログイン');
  } finally {
    ui.restore();
  }
});

test('language: a string with no Japanese falls back rather than rendering nothing', () => {
  const ui = withUi('ja');
  try {
    assert.equal(inLanguage('PNG'), 'PNG');
  } finally {
    ui.restore();
  }
});

test('language: `onLanguageChange` paints once immediately', () => {
  const ui = withUi('ja');
  try {
    let painted = 0;
    const stop = onLanguageChange(() => {
      painted += 1;
    });
    // Callers use this *instead of* their own first paint, so a hook that only
    // fired on a later change would leave every label empty until somebody
    // touched the toggle.
    assert.equal(painted, 1);
    stop();
  } finally {
    ui.restore();
  }
});

test('language: a repaint happens when a surface flips the language', () => {
  const ui = withUi('ja');
  try {
    const seen = [];
    const stop = onLanguageChange(() => seen.push(inLanguage('Sign in', 'ログイン')));
    ui.setLanguage('en');
    assert.deepEqual(seen, ['ログイン', 'Sign in']);
    stop();
  } finally {
    ui.restore();
  }
});

test('language: one painter throwing does not stop the others', () => {
  const ui = withUi('ja');
  try {
    const seen = [];
    const stopBroken = onLanguageChange(() => {
      if (seen.length) throw new Error('this painter is broken');
    });
    const stop = onLanguageChange(() => seen.push(currentLanguage()));
    ui.setLanguage('en');
    // The second painter ran even though the first threw: a label that cannot
    // repaint is a stale label, not a dead interface.
    assert.deepEqual(seen, ['ja', 'en']);
    stopBroken();
    stop();
  } finally {
    ui.restore();
  }
});

test('language: unsubscribing stops the repaints', () => {
  const ui = withUi('ja');
  try {
    let painted = 0;
    const stop = onLanguageChange(() => {
      painted += 1;
    });
    stop();
    ui.setLanguage('en');
    assert.equal(painted, 1, 'a painter kept repainting after it said it was done');
  } finally {
    ui.restore();
  }
});

test('language: the account button asks for the language rather than assuming English', () => {
  // `AccessManager` reads `import.meta.env` at module load and so cannot be
  // built here; the source is the assertable thing. What is being pinned is the
  // absence of the literal that shipped: an `aria-label` fixed to "Sign in".
  const source = read('src/access/AccessManager.js');
  assert.ok(
    !/'aria-label',\s*state\.user\s*\?[^)]*:\s*'Sign in'/.test(source),
    'the account button labels itself in English regardless of the interface language',
  );
  assert.match(source, /onLanguageChange\(\(\) => renderAccountButton\(\)\)/);
});

test('language: the scene chrome has no label that exists in only one language', () => {
  // The interface-hiding button shipped with Japanese text and an English
  // title — both halves of the same mistake, in opposite directions.
  const source = read('src/app/App.js');
  assert.ok(
    !source.includes("text: 'UIを隠す'"),
    'the hide-interface button carries one language as plain text',
  );
  assert.match(source, /class: 'lang-en', text: hidden \? 'Show interface' : 'Hide interface'/);
  assert.match(source, /class: 'lang-ja', text: hidden \? 'UIを表示' : 'UIを隠す'/);
});
