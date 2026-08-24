import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { captureSessionState, restoreSessionState } from '../src/app/sessionState.js';
import { Playback } from '../src/utils/Playback.js';

/** Minimal stand-ins with the same surface the app uses. */
function createHarness() {
  const playback = new Playback({ duration: 26 });
  const viewer = {
    camera: { position: new THREE.Vector3() },
    controls: {
      target: new THREE.Vector3(),
      autoRotate: true,
      enabled: true,
      updates: 0,
      update() {
        this.updates += 1;
      },
    },
  };
  let comparing = false;
  let cardiacPhase = 0;
  const scene = {
    getCardiacPhase: () => cardiacPhase,
    setCardiacPhase: (value) => {
      cardiacPhase = value;
    },
  };
  const context = {
    playback,
    viewer,
    scene,
    setComparison: (value) => {
      comparing = value;
      // The real app re-frames the camera whenever comparison changes; the
      // restore has to survive that.
      viewer.camera.position.set(99, 99, 99);
      viewer.controls.target.set(9, 9, 9);
    },
  };
  return {
    playback,
    viewer,
    scene,
    context,
    get comparing() {
      return comparing;
    },
    setComparing: (value) => {
      comparing = value;
    },
    setPhase: (value) => {
      cardiacPhase = value;
    },
    capture: () => captureSessionState({ playback, viewer, scene, comparing }),
    restore: (state) => restoreSessionState(state, context),
  };
}

/** How the reel leaves things while it is running. */
function enterReelLike(harness) {
  harness.context.setComparison(true);
  harness.playback.pause();
  harness.playback.set(0.64);
  harness.setPhase(0.41);
  harness.viewer.camera.position.set(-3, 12, 40);
  harness.viewer.controls.target.set(2.4, 1.1, 0.3);
  harness.viewer.controls.enabled = false;
  harness.viewer.controls.autoRotate = false;
}

test('a snapshot captures everything the reel changes', () => {
  const h = createHarness();
  h.setComparing(true);
  h.playback.holdsEnabled = true;
  h.playback.set(0.31);
  h.setPhase(0.77);
  h.viewer.camera.position.set(1, 2, 3);
  h.viewer.controls.target.set(4, 5, 6);
  h.viewer.controls.autoRotate = false;

  const state = h.capture();
  assert.equal(state.comparing, true);
  assert.equal(state.storyHolds, true);
  assert.equal(state.progress, 0.31);
  assert.equal(state.playing, false);
  assert.equal(state.cardiacPhase, 0.77);
  assert.deepEqual(state.cameraPosition, [1, 2, 3]);
  assert.deepEqual(state.controlsTarget, [4, 5, 6]);
  assert.equal(state.autoRotate, false);
  assert.equal(state.controlsEnabled, true);
});

test('leaving the reel restores the session exactly', () => {
  const h = createHarness();
  h.playback.set(0.28);
  h.playback.holdsEnabled = true;
  h.setPhase(0.62);
  h.viewer.camera.position.set(12.4, 5.2, 16.8);
  h.viewer.controls.target.set(0.4, -0.3, 0.1);
  h.viewer.controls.autoRotate = true;

  const before = h.capture();
  enterReelLike(h);
  h.restore(before);

  assert.deepEqual(h.capture(), before);
  // And specifically: the camera survived setComparison's re-framing.
  assert.deepEqual(h.viewer.camera.position.toArray(), [12.4, 5.2, 16.8]);
  assert.equal(h.viewer.controls.enabled, true);
});

test('repeated entries and exits never drift', () => {
  const h = createHarness();
  h.setComparing(true);
  h.playback.holdsEnabled = true;
  h.playback.set(0.42);
  h.setPhase(0.19);
  h.viewer.camera.position.set(-7.5, 3.25, 21);
  h.viewer.controls.target.set(0, -1.4, 0.3);
  h.viewer.controls.autoRotate = false;

  const original = h.capture();
  for (let cycle = 0; cycle < 12; cycle += 1) {
    const snapshot = h.capture();
    enterReelLike(h);
    h.restore(snapshot);
    assert.deepEqual(h.capture(), original, `state drifted on cycle ${cycle}`);
  }
});

test('a session that was playing is still playing afterwards, at the same point', () => {
  const h = createHarness();
  h.playback.set(0.2);
  h.playback.play();
  const before = h.capture();
  assert.equal(before.playing, true);

  enterReelLike(h);
  h.restore(before);

  assert.equal(h.playback.playing, true);
  assert.equal(h.playback.value, 0.2);
});

test('a session parked at the end is not rewound by the restore', () => {
  // Playback.play() deliberately rewinds a finished run, so "playing at 1" is
  // not a state that exists. What must survive is a paused session at the end.
  const h = createHarness();
  h.playback.set(1);
  h.playback.pause();
  const before = h.capture();
  assert.equal(before.progress, 1);

  enterReelLike(h);
  h.restore(before);

  assert.equal(h.playback.value, 1, 'the restore must not rewind a finished session');
  assert.equal(h.playback.playing, false);
});

test('a session playing near the end resumes at the same point', () => {
  const h = createHarness();
  h.playback.set(0.98);
  h.playback.play();
  const before = h.capture();

  enterReelLike(h);
  h.restore(before);

  assert.equal(h.playback.value, 0.98);
  assert.equal(h.playback.playing, true);
});

test('comparison state round-trips in both directions', () => {
  for (const comparing of [false, true]) {
    const h = createHarness();
    h.setComparing(comparing);
    h.viewer.camera.position.set(1, 1, 1);
    h.viewer.controls.target.set(0, 0, 0);
    const before = h.capture();
    enterReelLike(h);
    h.restore(before);
    assert.equal(h.comparing, comparing);
    assert.deepEqual(h.capture(), before);
  }
});

test('the restore works when the scene exposes no cardiac phase', () => {
  // Other scenes may not have a heartbeat; the helper must not require one.
  const h = createHarness();
  delete h.scene.getCardiacPhase;
  delete h.scene.setCardiacPhase;
  h.viewer.camera.position.set(2, 3, 4);
  h.viewer.controls.target.set(0, 1, 0);
  const before = h.capture();
  assert.equal(before.cardiacPhase, 0);
  enterReelLike(h);
  h.restore(before);
  assert.deepEqual(h.viewer.camera.position.toArray(), [2, 3, 4]);
});
