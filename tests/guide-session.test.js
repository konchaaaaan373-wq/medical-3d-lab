import test from 'node:test';
import assert from 'node:assert/strict';
import { Playback } from '../src/utils/Playback.js';
import { captureGuideSession, restoreGuideSession } from '../src/access/guideSession.js';

test('paid guide session: a paused model returns to the exact progression it had', () => {
  const playback = new Playback();
  playback.set(0.63);
  const snapshot = captureGuideSession(playback);

  playback.set(0.1);
  restoreGuideSession(snapshot, playback);

  assert.equal(playback.value, 0.63);
  assert.equal(playback.playing, false);
});

test('paid guide session: a model that was playing resumes from the saved point', () => {
  const playback = new Playback();
  playback.set(0.42);
  playback.play();
  const snapshot = captureGuideSession(playback);

  playback.pause();
  playback.set(0.9);
  restoreGuideSession(snapshot, playback);

  assert.equal(playback.value, 0.42);
  assert.equal(playback.playing, true);
});

test('paid guide session: snapshot is a value, not a live reference', () => {
  const playback = new Playback();
  playback.set(0.27);
  const snapshot = captureGuideSession(playback);
  playback.set(0.81);

  assert.deepEqual(snapshot, { progress: 0.27, playing: false });
});
