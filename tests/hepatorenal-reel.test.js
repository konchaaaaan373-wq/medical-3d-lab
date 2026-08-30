import test from 'node:test';
import assert from 'node:assert/strict';
import { HepatorenalScene } from '../src/scenes/renal/scenes/hepatorenalSyndrome/HepatorenalScene.js';
import {
  COMPARISON_FROM,
  REEL_CUES,
  REEL_DURATION,
  cameraAt,
  comparisonAt,
  overlayAt,
  progressAt,
} from '../src/scenes/renal/scenes/hepatorenalSyndrome/reelStoryboard.js';
import { REEL_COPY } from '../src/data/hepatorenal.js';
import { kidneyWithoutTheSignal } from '../src/models/hepatorenal.js';

/**
 * Layer 2 — that the fifteen-second sequence is reproducible and honest.
 *
 * Determinism is the practical requirement: a screen recording has to come out
 * the same on any machine. Honesty is the other one: every figure on screen has
 * to be a figure the scene's own read-out would show, and the copy must not
 * carry a number of its own.
 */

const scene = () => {
  const built = new HepatorenalScene({});
  built.build();
  return built;
};

const METRICS = {
  kidney: { gfr: 47, flow: 713, fraction: '12' },
  released: { gfr: 84, flow: 1032, fraction: '15' },
  map: '79',
  activation: '0.72',
};
const context = (metrics = METRICS) => ({ language: 'en', metrics });

const at = (t, step = 0.05) => {
  const frames = [];
  for (let time = 0; time <= t; time += step) frames.push(time);
  return frames;
};

test('the sequence is a pure function of elapsed seconds', () => {
  for (const t of at(REEL_DURATION, 0.25)) {
    assert.equal(progressAt(t), progressAt(t));
    assert.deepEqual(overlayAt(t, context()), overlayAt(t, context()));
    const base = { distance: 18, targetX: 0, targetY: 0.6, targetZ: 0 };
    assert.deepEqual(cameraAt(t, base), cameraAt(t, base));
  }
});

test('the cues tile the whole sequence with no gap and no overlap', () => {
  assert.equal(REEL_CUES[0].at, 0);
  assert.equal(REEL_CUES.at(-1).until, REEL_DURATION);
  for (let i = 1; i < REEL_CUES.length; i += 1) {
    assert.equal(REEL_CUES[i].at, REEL_CUES[i - 1].until, `a gap before ${REEL_CUES[i].id}`);
  }
});

test('the axis never leaves its range, and never goes backwards', () => {
  let previous = -Infinity;
  for (const t of at(REEL_DURATION)) {
    const value = progressAt(t);
    assert.ok(value >= 0 && value <= 1, `${value} at ${t}`);
    assert.ok(value >= previous - 1e-12, `the axis went backwards at ${t}`);
    previous = value;
  }
});

test('the sequence holds where filtration is still being defended', () => {
  // The beat the ending depends on. If the sequence runs straight past the
  // phase where blood flow is already falling and filtration is not, the
  // ending is a surprise with nothing behind it.
  const built = scene();
  built.setProgress(progressAt(7.5));
  assert.ok(
    built.solved.kidney.glomerularFiltrationRateMlPerMin >
      built.solved.kidney.renalBloodFlowMlPerMin / 10,
    'this is not the defended phase'
  );
  assert.ok(built.solved.neurohumoral.activation > 0.3, 'the signal is not on yet');
  assert.equal(progressAt(6.5), progressAt(8.2), 'the sequence does not hold here');
});

test('the last beat is past the failure of autoregulation', () => {
  const built = scene();
  built.setProgress(progressAt(13.5));
  assert.equal(built.solved.kidney.autoregulating, false);
});

test('the reel reads both kidneys from the same solve the panel reads', () => {
  const built = scene();
  built.setProgress(0.9);
  const reel = built.getReel();
  const metrics = reel.readMetrics(built);

  const rows = Object.fromEntries(built.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(metrics.kidney.gfr, rows.gfr);
  assert.equal(metrics.kidney.flow, rows.renalFlow);
  assert.equal(metrics.map, rows.map);
  assert.equal(metrics.activation, rows.activation);
  assert.equal(
    metrics.released.gfr,
    Math.round(kidneyWithoutTheSignal(built.solved).glomerularFiltrationRateMlPerMin)
  );
});

test('the reel drives the scene along its own axis and nothing else', () => {
  const built = scene();
  const reel = built.getReel();
  const before = { ...built.controls };
  reel.driveAt(9.0, built);
  for (const [id, value] of Object.entries(built.controls)) {
    if (id === 'structuralResistance' || id === 'splanchnicVasodilation') continue;
    assert.equal(value, before[id], `the reel changed ${id}`);
  }
  assert.equal(built.progress, progressAt(9.0));
});

test('the sequence shows the circulation first and the two kidneys last', () => {
  // The first beats narrate what the circulation does, so it has to be on
  // screen for them; the pay-off is the pair. A sequence that showed the pair
  // throughout would narrate three beats about something not being drawn.
  const reel = scene().getReel();
  assert.equal(typeof reel.comparisonAt, 'function');
  assert.equal(reel.comparisonAt(0), false);
  assert.equal(reel.comparisonAt(REEL_DURATION), true);
  assert.equal(comparisonAt(COMPARISON_FROM - 0.01), false);
  assert.equal(comparisonAt(COMPARISON_FROM), true);

  // Once on, it stays on: a picture that flickers between two layouts is not
  // a sequence anybody can record.
  let switches = 0;
  let previous = comparisonAt(0);
  for (const t of at(REEL_DURATION, 0.05)) {
    if (comparisonAt(t) !== previous) switches += 1;
    previous = comparisonAt(t);
  }
  assert.equal(switches, 1);

  assert.ok(reel.framing.halfWidth > 0 && reel.framing.minimumDistance > 0);
  assert.ok(reel.viewDirection.length() > 0.99);
});

test('the camera steps at the switch rather than easing across it', () => {
  // The two layouts are different sizes. Easing between them frames neither.
  const base = { distance: 18, targetX: 0, targetY: 0.1, targetZ: 0 };
  const before = cameraAt(COMPARISON_FROM - 0.01, base);
  const after = cameraAt(COMPARISON_FROM, base);
  assert.ok(Math.abs(after.targetX - before.targetX) > 1);
  assert.ok(after.distance < before.distance, 'the pair is narrower than the circulation');
});

test('every number on screen comes from the scene, not from the copy', () => {
  // The copy may name a quantity; it may never carry a value. A figure written
  // into the storyboard would be a number nothing checks.
  const text = JSON.stringify(REEL_COPY);
  assert.ok(!/\d+\s*(mL|mmHg|%)/.test(text), 'the reel copy carries a unit-bearing number');
  assert.ok(!/\d{2,}/.test(text), 'the reel copy carries a multi-digit number');

  const overlay = overlayAt(REEL_DURATION, context());
  assert.equal(overlay.cards.items[0].headline, METRICS.kidney.gfr);
  assert.equal(overlay.cards.items[1].headline, METRICS.released.gfr);
  assert.ok(overlayAt(8.0, context()).marker.text.includes(METRICS.map));
});

test('the note says what the activation is, in both languages', () => {
  for (const language of ['en', 'ja']) {
    const overlay = overlayAt(6.0, { language, metrics: METRICS });
    assert.ok(overlay.note.opacity > 0);
    assert.match(overlay.note.text, language === 'en' ? /index, not a concentration/i : /指標/);
    assert.match(overlay.note.text, language === 'en' ? /not for diagnosis/i : /診断/);
  }
});

test('the sequence is bilingual and legible at every moment', () => {
  for (const language of ['en', 'ja']) {
    for (const t of at(REEL_DURATION, 0.2)) {
      const overlay = overlayAt(t, { language, metrics: METRICS });
      for (const slot of ['title', 'subtitle', 'badge', 'caption', 'note', 'marker']) {
        const value = overlay[slot];
        if (!value || value.opacity <= 0) continue;
        assert.ok(value.text.length > 0, `${language}: an empty ${slot} is being drawn at ${t}`);
        assert.ok(value.opacity <= 1, `${language}: ${slot} opacity ${value.opacity} at ${t}`);
      }
    }
  }
});

test('the second card arrives with the second kidney, and not before', () => {
  // Early in the course the vasoconstrictor signal is holding filtration *up*,
  // so a pair of cards before the knee argues the opposite of what the
  // sequence is for. The comparison is only shown once it means what the
  // ending says it means — and it is shown exactly when the picture shows two
  // kidneys, so the cards and the 3D never disagree about how many there are.
  for (const t of at(REEL_DURATION, 0.1)) {
    const overlay = overlayAt(t, context());
    assert.equal(
      overlay.cards.items.length,
      comparisonAt(t) ? 2 : 1,
      `the card count and the picture disagree at ${t}`
    );
  }
  assert.equal(overlayAt(COMPARISON_FROM - 0.1, context()).cards.items.length, 1);
  assert.equal(overlayAt(COMPARISON_FROM, context()).cards.items.length, 2);
});

test('the last frame holds the take-home rather than fading to nothing', () => {
  const overlay = overlayAt(REEL_DURATION, context());
  assert.equal(overlay.title.variant, 'take-home');
  assert.ok(overlay.title.opacity > 0.9);
  assert.ok(overlay.cards.opacity > 0.9, 'the two kidneys have to still be on screen at the end');
});

test('the take-home is the claim the scene exists to make', () => {
  assert.match(REEL_COPY.takeHome.title, /nothing damaged the kidney/i);
  assert.ok(REEL_COPY.takeHome.titleJa.length > 0);
});

test('the scene declares a reel the app can run', () => {
  const reel = scene().getReel();
  for (const key of ['durationSeconds', 'cues', 'viewDirection', 'framing', 'cameraAt', 'overlayAt']) {
    assert.ok(reel[key] != null, `the reel has no ${key}`);
  }
  assert.equal(reel.durationSeconds, REEL_DURATION);
  assert.equal(typeof reel.driveAt, 'function');
  assert.equal(typeof reel.readMetrics, 'function');
});
