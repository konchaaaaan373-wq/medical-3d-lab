import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markScrollable } from '../src/utils/scrollHint.js';

/** The parts of an element the hint actually reads. */
function fakeRegion({ scrollHeight, clientHeight, scrollTop = 0 }) {
  const classes = new Set();
  const listeners = [];
  return {
    scrollHeight,
    clientHeight,
    scrollTop,
    children: [],
    classList: {
      toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    addEventListener: (type, handler) => listeners.push([type, handler]),
    removeEventListener: (type, handler) => {
      const at = listeners.findIndex(([t, h]) => t === type && h === handler);
      if (at >= 0) listeners.splice(at, 1);
    },
    fire: (type) => listeners.filter(([t]) => t === type).forEach(([, h]) => h()),
    listenerCount: () => listeners.length,
  };
}

test('a region that fits says nothing', () => {
  const region = fakeRegion({ scrollHeight: 200, clientHeight: 200 });
  markScrollable(region);
  assert.equal(region.classList.contains('has-more'), false);
});

test('a clipped region says there is more, until it is scrolled to the end', () => {
  const region = fakeRegion({ scrollHeight: 420, clientHeight: 208 });
  markScrollable(region);
  assert.equal(region.classList.contains('has-more'), true, 'content below the fold');

  region.scrollTop = 212;
  region.fire('scroll');
  assert.equal(region.classList.contains('has-more'), false, 'nothing left below');

  region.scrollTop = 40;
  region.fire('scroll');
  assert.equal(region.classList.contains('has-more'), true, 'and again on the way back');
});

test('the hint stops observing when it is torn down', () => {
  const region = fakeRegion({ scrollHeight: 420, clientHeight: 208 });
  const stop = markScrollable(region);
  assert.ok(region.listenerCount() > 0);
  stop();
  assert.equal(region.listenerCount(), 0);
});

test('a missing region is not an error', () => {
  assert.doesNotThrow(() => markScrollable(null)());
});

test('the cue is styled where the panels are, not written inline', () => {
  const source = readFileSync(new URL('../src/utils/scrollHint.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.style\./, 'the hint sets a class; the stylesheet owns the look');
  const controls = readFileSync(new URL('../src/styles/ui.css', import.meta.url), 'utf8');
  assert.match(controls, /\.rail\.has-more[\s\S]{0,80}mask-image/);
});
