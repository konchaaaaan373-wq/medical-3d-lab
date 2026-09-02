import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/Viewer.js', import.meta.url), 'utf8');

test('viewer: normal animation never preserves every WebGL drawing buffer', () => {
  assert.match(source, /preserveDrawingBuffer:\s*false/);
  assert.ok(!/preserveDrawingBuffer:\s*true/.test(source));
});

test('viewer: PNG capture explicitly renders immediately before readback', () => {
  const snapshot = source.slice(source.indexOf('snapshot(size)'));
  assert.match(snapshot, /this\.composer\.render\(\);\s*return this\.renderer\.domElement\.toDataURL\('image\/png'\)/);
  assert.match(snapshot, /this\.composer\.render\(\);\s*const url = this\.renderer\.domElement\.toDataURL\('image\/png'\)/);
});

test('viewer: phones retain a stricter pixel-ratio ceiling and can degrade to 1x', () => {
  assert.match(source, /window\.innerWidth < 720 \? 1\.5 : 2/);
  assert.match(source, /this\.renderer\.setPixelRatio\(1\)/);
});
