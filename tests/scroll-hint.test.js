import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markScrollable, publishHeight } from '../src/utils/scrollHint.js';

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
  // Scoped to the cue: `publishHeight` next door does write a property, which
  // is the whole point of it — it publishes a measurement, not a look.
  const cue = source.slice(source.indexOf('export function markScrollable'), source.indexOf('export function publishHeight'));
  assert.ok(cue.length, 'markScrollable is there to read');
  assert.doesNotMatch(cue, /\.style\./, 'the hint sets a class; the stylesheet owns the look');
  const controls = readFileSync(new URL('../src/styles/ui.css', import.meta.url), 'utf8');
  assert.match(controls, /\.rail\.has-more[\s\S]{0,80}mask-image/);
});


test('publishHeight reports a live measurement the stylesheet can use', () => {
  const written = [];
  const target = { style: { setProperty: (name, value) => written.push([name, value]) } };
  const element = { getBoundingClientRect: () => ({ height: 152.4, bottom: 290.6 }) };

  const stop = publishHeight(element, target, '--console-height');
  assert.deepEqual(written.at(-1), ['--console-height', '152px'], 'height by default, rounded');

  publishHeight(element, target, '--chrome-bottom', (box) => box.bottom);
  assert.deepEqual(written.at(-1), ['--chrome-bottom', '291px'], 'or whichever edge is asked for');

  assert.doesNotThrow(() => stop());
  assert.doesNotThrow(() => publishHeight(null, target, '--x')());
});
