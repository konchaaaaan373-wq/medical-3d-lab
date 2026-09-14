import test from 'node:test';
import assert from 'node:assert/strict';
import { Playback } from '../src/utils/Playback.js';
import { beginGuideSession, captureGuideSession, restoreGuideSession } from '../src/access/guideSession.js';

test('paid guide session: opening pauses a moving model without losing its state', () => {
  const playback = new Playback();
  playback.set(0.42);
  playback.play();

  const snapshot = beginGuideSession(playback);

  assert.deepEqual(snapshot, { progress: 0.42, playing: true });
  assert.equal(playback.value, 0.42);
  assert.equal(playback.playing, false, 'the guide caption cannot drift away from a playing model');

  restoreGuideSession(snapshot, playback);
  assert.equal(playback.value, 0.42);
  assert.equal(playback.playing, true, 'closing without taking a step restores the clinician state');
});

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

test('paid guide session: opening a mode and closing it again changes nothing', () => {
  // The clinician looked at the patient explanation, decided against it, and
  // closed it. The model has to be exactly where they left it.
  const playback = new Playback();
  playback.set(0.63);
  const snapshot = captureGuideSession(playback);

  restoreGuideSession(snapshot, playback, { movedByGuide: false });

  assert.equal(playback.value, 0.63);
});

test('paid guide session: where the explanation walked to is kept, not rolled back', () => {
  // The other case, and the one that was wrong. A patient has just been walked
  // from a normal ventricle to a failing one; closing the guide put the model
  // back where the clinician had been standing before the conversation, so the
  // pressure-volume loop they then opened was for the wrong state.
  const playback = new Playback();
  playback.set(0);
  const snapshot = captureGuideSession(playback);

  playback.set(0.64); // the guide's last step
  restoreGuideSession(snapshot, playback, { movedByGuide: true });

  assert.equal(playback.value, 0.64, 'the state the explanation arrived at survives');
});

test('paid guide session: a guide that moved the model does not resume playback either', () => {
  // Restoring is all-or-nothing: the play state belongs to the same snapshot as
  // the position, and half of it would be a state nobody was ever in.
  const playback = new Playback();
  playback.set(0.2);
  playback.play();
  const snapshot = captureGuideSession(playback);

  playback.pause();
  playback.set(0.8);
  restoreGuideSession(snapshot, playback, { movedByGuide: true });

  assert.equal(playback.value, 0.8);
  assert.equal(playback.playing, false, 'the guide left it paused, and it stays paused');
});
