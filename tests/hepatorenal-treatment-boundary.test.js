import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_CONTROLS, MODEL_SCOPE } from '../src/data/hepatorenal.js';

test('HRS treatment control stays a generic splanchnic vasoconstrictor, not a full terlipressin model', () => {
  const control = MODEL_CONTROLS.find((entry) => entry.id === 'terlipressin');
  assert.ok(control);
  assert.equal(control.label, 'Splanchnic vasoconstrictor');
  assert.equal(control.labelJa, '内臓血管収縮薬');
  assert.doesNotMatch(`${control.label} ${control.labelJa}`, /terlipressin|テルリプレシン/i);
});

test('HRS scope keeps treatment response and adverse effects outside the model', () => {
  const cautions = (MODEL_SCOPE.cautions ?? [])
    .flatMap((entry) => [entry.text, entry.textJa])
    .filter(Boolean)
    .join(' ');
  assert.match(cautions, /not a guaranteed clinical response/i);
  assert.match(cautions, /no adverse effects/i);
  assert.match(cautions, /虚血性合併症/);

  const exclusions = (MODEL_SCOPE.excludes ?? [])
    .flatMap((entry) => [entry.text, entry.textJa])
    .filter(Boolean)
    .join(' ');
  assert.match(exclusions, /pulmonary oedema/i);
  assert.match(exclusions, /肺水腫/);
});
