import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneById } from '../src/catalog/index.js';

test('bone remodelling catalogue copy preserves resorption → reversal → formation order', () => {
  const bone = sceneById('bone-remodeling');
  assert.ok(bone);
  assert.match(bone.description, /resorption.*reversal.*formation/i);
  assert.match(bone.descriptionJa, /吸収.*反転.*形成/);
  assert.doesNotMatch(bone.description, /opposing particle streams/i);
  assert.doesNotMatch(bone.descriptionJa, /拮抗する.*流れ/);
});
