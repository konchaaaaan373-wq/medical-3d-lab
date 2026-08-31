import test from 'node:test';
import assert from 'node:assert/strict';
import { CopdScene } from '../src/scenes/respiratory/scenes/copd/CopdScene.js';
import {
  REEL_CUES,
  REEL_DURATION,
  cameraAt,
  demandAt,
  overlayAt,
} from '../src/scenes/respiratory/scenes/copd/reelStoryboard.js';
import { REEL_COPY } from '../src/data/copd.js';

/**
 * **Layer 2 — model integrity.** The social sequence has to agree with the
 * scene it is a video of.
 *
 * This one carries more weight than the other two reel suites, because this is
 * the only sequence driving a model that *integrates*. Reproducibility is not
 * free here, and the test that matters is the one asserting a replay gives the
 * same lung.
 */

const scene = () => {
  const built = new CopdScene({});
  built.build();
  built.setComparison(true);
  return built;
};

const METRICS = {
  normal: { ic: '3.77', eelv: '2.23', tauCount: '2.4' },
  copd: { ic: '1.77', eelv: '4.88', tauCount: '0.5' },
};
const context = (metrics = METRICS) => ({ language: 'en', metrics });

test('the cues tile the whole sequence with no gap and no overlap', () => {
  assert.equal(REEL_CUES[0].at, 0);
  assert.equal(REEL_CUES[REEL_CUES.length - 1].until, REEL_DURATION);
  for (let i = 1; i < REEL_CUES.length; i++) {
    assert.equal(REEL_CUES[i].at, REEL_CUES[i - 1].until, `gap before cue ${REEL_CUES[i].id}`);
  }
});

test('the workload is a pure function of elapsed seconds, and never goes backwards', () => {
  let previous = -Infinity;
  for (let t = 0; t <= REEL_DURATION; t += 0.05) {
    const demand = demandAt(t);
    assert.ok(demand >= 0 && demand <= 1, `demand ${demand} out of range at ${t}`);
    assert.ok(demand >= previous - 1e-9, `the workload went backwards at ${t}`);
    previous = demand;
  }
  const base = { distance: 18, targetX: 0, targetY: 0, targetZ: 0 };
  for (let t = 0; t <= REEL_DURATION; t += 0.37) {
    assert.deepEqual(cameraAt(t, base), cameraAt(t, base));
  }
});

test('replaying the sequence gives the same lung, second for second', () => {
  // The test this suite exists for. This model integrates, so "the same
  // fifteen seconds on any machine" is a property that has to be built rather
  // than assumed — and a screen recording is worthless without it.
  const built = scene();
  const at = (seconds) => {
    built.renderAtSeconds(seconds, demandAt);
    return {
      copd: built.model.state.endExpiratoryVolumeL,
      normal: built.referenceModel.state.endExpiratoryVolumeL,
    };
  };
  const forward = [1, 4, 8, 12, 15].map(at);
  built.renderAtSeconds(0, demandAt);
  const replayed = [1, 4, 8, 12, 15].map(at);
  assert.deepEqual(replayed, forward, 'a rewind and replay must reproduce the run exactly');
});

test('the workload stops before the sequence does, so the climb is the lung and not the ask', () => {
  // The point of the long hold: the demand is flat for the last third, and the
  // resting volume is still rising. What is on screen there is gas that was
  // not given back, not a workload still increasing.
  const stacking = REEL_CUES.find((cue) => cue.id === 'stacking');
  assert.equal(demandAt(stacking.at), demandAt(REEL_DURATION), 'the workload has to be held from here on');

  const built = scene();
  built.renderAtSeconds(stacking.at, demandAt);
  const atHoldStart = built.model.state.endExpiratoryVolumeL;
  built.renderAtSeconds(REEL_DURATION, demandAt);
  assert.ok(
    built.model.state.endExpiratoryVolumeL > atHoldStart,
    'the obstructed lung has to keep climbing after the workload stops rising'
  );
});

test('the two lungs go opposite ways, which is what the video claims', () => {
  const built = scene();
  built.renderAtSeconds(0, demandAt);
  const start = {
    copd: built.model.state.endExpiratoryVolumeL,
    normal: built.referenceModel.state.endExpiratoryVolumeL,
  };
  built.renderAtSeconds(REEL_DURATION, demandAt);
  const end = {
    copd: built.model.state.endExpiratoryVolumeL,
    normal: built.referenceModel.state.endExpiratoryVolumeL,
  };
  assert.ok(end.copd > start.copd, 'the obstructed lung has to end higher than it started');
  assert.ok(end.normal < start.normal, 'and the healthy one lower');
  assert.ok(
    built.model.state.inspiratoryCapacityL < built.referenceModel.state.inspiratoryCapacityL,
    'so the room left to breathe in differs, which is the headline on the cards'
  );
});

test('the reel reads both lungs from the models the scene is drawing', () => {
  const built = scene();
  const reel = built.getReel();
  reel.driveAt(12.0, built);
  const read = reel.readMetrics(built);
  assert.equal(read.copd.ic, built.model.state.inspiratoryCapacityL.toFixed(2));
  assert.equal(read.normal.ic, built.referenceModel.state.inspiratoryCapacityL.toFixed(2));
  assert.ok(Number(read.copd.ic) < Number(read.normal.ic));
  assert.ok(Number(read.copd.tauCount) < Number(read.normal.tauCount));
});

test('every number on screen comes from the scene, not from the copy', () => {
  const frame = overlayAt(12.0, context());
  const [normal, copd] = frame.cards.items;
  assert.equal(normal.headline, METRICS.normal.ic);
  assert.equal(copd.headline, METRICS.copd.ic);
  assert.ok(copd.rows.some((row) => row.includes('4.88')));
  assert.ok(normal.rows.some((row) => row.includes('2.4')));

  const copy = JSON.stringify(REEL_COPY);
  assert.doesNotMatch(copy, /%/, 'copy must not carry a percentage');
  assert.doesNotMatch(copy, /\d{2,}/, 'copy must not carry a multi-digit figure');
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

test('the note says there is no gas exchange, because that is the easiest thing to assume', () => {
  assert.match(REEL_COPY.note.text, /no gas exchange/i);
  assert.match(REEL_COPY.note.textJa, /ガス交換/);
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
