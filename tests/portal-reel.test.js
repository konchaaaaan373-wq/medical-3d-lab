import test from 'node:test';
import assert from 'node:assert/strict';
import { PortalHypertensionScene } from '../src/scenes/hepatobiliary/scenes/portalHypertension/PortalHypertensionScene.js';
import {
  REEL_CUES,
  REEL_DURATION,
  cameraAt,
  overlayAt,
  progressAt,
} from '../src/scenes/hepatobiliary/scenes/portalHypertension/reelStoryboard.js';
import { REEL_COPY } from '../src/data/portalHypertension.js';

/**
 * **Layer 2 — model integrity.** The social sequence has to agree with the
 * scene it is a video of. The haemodynamics live in
 * `portal-haemodynamics.test.js`; nothing here is a claim about a liver.
 */

const scene = () => {
  const built = new PortalHypertensionScene({});
  built.build();
  return built;
};

const METRICS = {
  healthy: { ppg: '3.0', liverFlow: 1010, shunt: 1 },
  cirrhotic: { ppg: '12.6', liverFlow: 419, shunt: 53 },
};
const context = (metrics = METRICS) => ({ language: 'en', metrics });

test('the sequence is a pure function of elapsed seconds', () => {
  for (let t = 0; t <= REEL_DURATION; t += 0.37) {
    assert.equal(progressAt(t), progressAt(t), `progress drifted at ${t}`);
    const base = { distance: 14, targetX: 0, targetY: 0, targetZ: 0 };
    assert.deepEqual(cameraAt(t, base), cameraAt(t, base), `camera drifted at ${t}`);
  }
});

test('the cues tile the whole sequence with no gap and no overlap', () => {
  assert.equal(REEL_CUES[0].at, 0);
  assert.equal(REEL_CUES[REEL_CUES.length - 1].until, REEL_DURATION);
  for (let i = 1; i < REEL_CUES.length; i++) {
    assert.equal(REEL_CUES[i].at, REEL_CUES[i - 1].until, `gap before cue ${REEL_CUES[i].id}`);
  }
});

test('the axis never leaves its range, and never goes backwards', () => {
  let previous = -Infinity;
  for (let t = 0; t <= REEL_DURATION; t += 0.05) {
    const p = progressAt(t);
    assert.ok(p >= 0 && p <= 1, `progress ${p} out of range at ${t}`);
    assert.ok(p >= previous - 1e-9, `the axis went backwards at ${t}`);
    previous = p;
  }
});

test('the sequence holds where the collaterals are carrying most of the blood', () => {
  // The argument. During the hold, a large share of the portal flow is
  // bypassing the liver and the gradient is still clearly abnormal — which is
  // the thing that is hard to believe from a number.
  const hold = REEL_CUES.find((cue) => cue.id === 'collaterals');
  assert.equal(progressAt(hold.at), progressAt(hold.until), 'the axis has to be held, not still climbing');

  const built = scene();
  built.setProgress(progressAt((hold.at + hold.until) / 2));
  assert.ok(built.solved.shuntFraction > 0.4, 'most of the blood has to be bypassing the liver');
  assert.ok(
    built.solved.portalPressureGradientMmHg > scene().solved.portalPressureGradientMmHg * 3,
    'and the gradient has to be nowhere near a healthy one'
  );
});

test('the reel reads both livers from the same solve the panel reads', () => {
  const built = scene();
  built.setProgress(0.82);
  const read = built.getReel().readMetrics(built);
  assert.equal(read.cirrhotic.ppg, built.solved.portalPressureGradientMmHg.toFixed(1));
  assert.equal(read.cirrhotic.shunt, Math.round(built.solved.shuntFraction * 100));
  // The healthy card is the same liver at a resistance of one, not a stored
  // picture: it moves with any other control the reader has touched.
  assert.ok(Number(read.healthy.ppg) < Number(read.cirrhotic.ppg));
  assert.ok(read.healthy.liverFlow > read.cirrhotic.liverFlow);
});

test('the reel drives the scene along its own axis and nothing else', () => {
  const built = scene();
  const reel = built.getReel();
  const before = { ...built.controls };
  reel.driveAt(8.0, built);
  for (const [id, value] of Object.entries(built.controls)) {
    if (id === 'structuralResistance') continue;
    assert.equal(value, before[id], `the sequence moved "${id}", which it must not`);
  }
});

test('the sequence asks for one liver, not two', () => {
  // This scene's contrast is between a healthy liver and this one over time,
  // carried by the cards. A second organ on screen would be a different video.
  assert.equal(scene().getReel().comparison, false);
});

test('every number on screen comes from the scene, not from the copy', () => {
  const frame = overlayAt(8.0, context());
  const [healthy, cirrhotic] = frame.cards.items;
  assert.equal(healthy.headline, METRICS.healthy.ppg);
  assert.equal(cirrhotic.headline, METRICS.cirrhotic.ppg);
  assert.ok(cirrhotic.rows.some((row) => row.includes('419')));
  assert.ok(cirrhotic.rows.some((row) => row.includes('53')));

  const copy = JSON.stringify(REEL_COPY);
  assert.doesNotMatch(copy, /\d/, 'the copy must carry no figure at all');
  assert.doesNotMatch(copy, /HVPG が|HVPG is/, 'and must not restate a measurement claim in a caption');
});

test('the note says which gradient this is, in both languages', () => {
  // The scene computes a portal pressure gradient and not an HVPG, and that
  // distinction is the whole point of the scene. A video that dropped it would
  // be the one place the confusion could get out.
  assert.match(REEL_COPY.note.text, /portal pressure gradient/i);
  assert.match(REEL_COPY.note.text, /not an HVPG/i);
  assert.match(REEL_COPY.note.textJa, /門脈圧較差/);
  assert.match(REEL_COPY.note.textJa, /HVPG/);
});

test('the sequence is bilingual and legible at every moment', () => {
  for (let t = 1.0; t <= REEL_DURATION; t += 0.25) {
    for (const language of ['en', 'ja']) {
      const frame = overlayAt(t, { language, metrics: METRICS });
      assert.ok(frame.note.opacity > 0, `the disclaimer must be up at ${t}`);
      for (const slot of [frame.title, frame.subtitle, frame.caption, frame.badge]) {
        assert.ok(slot.opacity >= 0 && slot.opacity <= 1, `opacity out of range at ${t}`);
      }
    }
  }
  const en = overlayAt(13.5, { language: 'en', metrics: METRICS }).title.text;
  const ja = overlayAt(13.5, { language: 'ja', metrics: METRICS }).title.text;
  assert.notEqual(en, ja);
});

test('the last frame holds the take-home rather than fading to nothing', () => {
  const final = overlayAt(REEL_DURATION, context());
  assert.ok(final.title.opacity > 0.9);
  assert.equal(final.title.variant, 'take-home');
  assert.equal(final.title.text, REEL_COPY.takeHome.title);
});

test('the scene declares a reel the app can run', () => {
  const reel = scene().getReel();
  assert.equal(reel.durationSeconds, REEL_DURATION);
  assert.ok(reel.viewDirection.length() > 0.99);
  assert.ok(reel.framing.halfWidth > 0 && reel.framing.halfHeight > 0);
  assert.equal(typeof reel.cameraAt, 'function');
  assert.equal(typeof reel.overlayAt, 'function');
});
