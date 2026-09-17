import test from 'node:test';
import assert from 'node:assert/strict';

import { rulesOf } from '../scripts/lib/css.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CONSOLE_REACH_FALLBACK_PX,
  CONSOLE_REACH_PROPERTY,
  watchConsoleReach,
} from '../src/app/consoleReach.js';
import { FakeElement } from './helpers/fake-dom.js';

/**
 * The bar's height, measured instead of copied.
 *
 * Anything sitting above the control bar needs to know how tall it is, and CSS
 * cannot ask. So the gesture hint's `bottom` was a px constant per media query
 * — "the console is 100 tall and stands 14 off the bottom" — and it went stale
 * twice: once printing across the slider, once when the bar grew a line because
 * the clinical-use notice stopped being dropped on phones. `verify:ui` caught
 * both in a browser; nothing prevented either, and each repair copied a new
 * number into three places.
 */

/** A document stand-in with one bar of a given height, at a given offset. */
function page({ barHeight = 100, standoff = 14, viewportHeight = 844, resizeObserver = true } = {}) {
  const ui = new FakeElement('div');
  const bar = new FakeElement('div');
  bar.className = 'console';
  bar.getBoundingClientRect = () => ({
    height: barHeight,
    top: viewportHeight - standoff - barHeight,
    bottom: viewportHeight - standoff,
    left: 0,
    right: 390,
    width: 390,
  });

  const listeners = new Map();
  let present = barHeight > 0;
  const observed = new Set();
  let notify = null;

  const windowRef = {
    innerHeight: viewportHeight,
    addEventListener(type, fn) { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    fire(type) { for (const fn of listeners.get(type) ?? []) fn(); },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  };
  if (resizeObserver) {
    windowRef.ResizeObserver = class {
      constructor(callback) { notify = callback; }
      observe(node) { observed.add(node); }
      unobserve(node) { observed.delete(node); }
      disconnect() { observed.clear(); notify = null; }
    };
  }

  const doc = { querySelector: (selector) => (present && selector === '.console' ? bar : null) };

  return {
    ui,
    bar,
    doc,
    windowRef,
    observed,
    /** The bar changes size, and the observer says so. */
    resizeBarTo(height) {
      const top = viewportHeight - standoff - height;
      bar.getBoundingClientRect = () => ({ height, top, bottom: top + height, left: 0, right: 390, width: 390 });
      notify?.();
    },
    remove() { present = false; },
    reach: () => ui.style.getPropertyValue(CONSOLE_REACH_PROPERTY),
  };
}

const watch = (fixture) =>
  watchConsoleReach({ ui: fixture.ui, doc: fixture.doc, windowRef: fixture.windowRef });

test('the property is the distance from the bottom of the viewport to the top of the bar', () => {
  // Height *and* standoff in one number, because everything above the bar cares
  // about where its top edge is and nothing above it cares which of the two
  // moved.
  const fixture = page({ barHeight: 128, standoff: 12, viewportHeight: 844 });
  const watcher = watch(fixture);
  assert.equal(fixture.reach(), '140px');
  watcher.destroy();
});

test('a bar that grows takes the property with it', () => {
  const fixture = page({ barHeight: 100, standoff: 14 });
  const watcher = watch(fixture);
  assert.equal(fixture.reach(), '114px');

  // This is the defect, in one line: the bar grew a row of copy and every
  // hand-written constant above it was suddenly too small.
  fixture.resizeBarTo(128);
  assert.equal(fixture.reach(), '142px');

  fixture.resizeBarTo(100);
  assert.equal(fixture.reach(), '114px', 'and back down again');
  watcher.destroy();
});

test('a viewport that changes without the bar changing is measured too', () => {
  // A phone rotating changes both at once; a desktop window resize can change
  // only the viewport, and `ResizeObserver` on the bar sees nothing.
  const fixture = page({ barHeight: 100, standoff: 14, viewportHeight: 844 });
  const watcher = watch(fixture);
  assert.equal(fixture.reach(), '114px');

  fixture.windowRef.innerHeight = 390;
  fixture.bar.getBoundingClientRect = () => ({ height: 96, top: 390 - 14 - 96, bottom: 390 - 14, left: 0, right: 844, width: 844 });
  fixture.windowRef.fire('resize');
  assert.equal(fixture.reach(), '110px');
  watcher.destroy();
});

test('no bar means the stylesheet fallback, not a measurement of nothing', () => {
  // Zero is a true measurement and the wrong answer: it would read as "the bar
  // reaches nowhere" and send the hint to the bottom of the screen, on top of a
  // bar that is merely not laid out yet.
  const fixture = page({ barHeight: 100 });
  const watcher = watch(fixture);
  assert.equal(fixture.reach(), '114px');

  fixture.remove();
  fixture.windowRef.fire('resize');
  assert.equal(fixture.reach(), '', 'the property is cleared so `var(..., 132px)` applies');
  watcher.destroy();
});

test('a document with no ResizeObserver still measures, just less often', () => {
  const fixture = page({ barHeight: 100, standoff: 14, resizeObserver: false });
  const watcher = watch(fixture);
  assert.equal(fixture.reach(), '114px', 'the first measurement does not need an observer');
  watcher.destroy();
});

test('destroy stops listening and takes the property back off', () => {
  const fixture = page({ barHeight: 100 });
  const watcher = watch(fixture);
  assert.equal(fixture.observed.size, 1, 'the bar is observed');
  watcher.destroy();
  assert.equal(fixture.reach(), '');
  assert.equal(fixture.observed.size, 0);
  assert.equal(fixture.windowRef.listenerCount('resize'), 0);
  assert.equal(fixture.windowRef.listenerCount('orientationchange'), 0);
});

test('nothing above the bar hard-codes how tall the bar is', () => {
  // F-116's completion: no px constant for the hint's `bottom`, anywhere.
  const dir = fileURLToPath(new URL('../src/styles/', import.meta.url));
  const offenders = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.css'))) {
    for (const { selectors, body } of rulesOf(readFileSync(`${dir}${name}`, 'utf8'))) {
      if (!/\.anatomy-shell-gesture-hint(?![\w-])/.test(selectors)) continue;
      for (const [, value] of body.matchAll(/bottom:\s*([^;]+);/g)) {
        if (value.includes('--console-reach')) continue;
        offenders.push(`${name} — ${selectors} { bottom: ${value.trim()} }`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'the hint sits above the bar; derive it from --console-reach rather than retyping the bar\'s height:\n  '
      + offenders.join('\n  ')
  );
});

test('the fallback in the stylesheet and the one in the module are the same number', () => {
  // Two places state it, so they have to agree: the module documents it and the
  // stylesheet is what actually applies before the first measurement.
  const shell = readFileSync(new URL('../src/styles/product-shell-b6.css', import.meta.url), 'utf8');
  const declared = shell.match(/var\(--console-reach,\s*(\d+)px\)/)?.[1];
  assert.ok(declared, 'the stylesheet reads the property with a fallback');
  assert.equal(Number(declared), CONSOLE_REACH_FALLBACK_PX);
});

test('the shell installs the watcher and tears it down with everything else', () => {
  const shell = readFileSync(new URL('../src/app/anatomyShellPresentation.js', import.meta.url), 'utf8');
  assert.match(shell, /watchConsoleReach\(\{ ui \}\)/);
  // In `destroy`, or the property outlives the shell that owns it and a later
  // surface inherits a measurement of a bar that is no longer there.
  const destroy = shell.slice(shell.indexOf('destroy() {'));
  assert.match(destroy, /consoleReach\.destroy\(\)/);
});
