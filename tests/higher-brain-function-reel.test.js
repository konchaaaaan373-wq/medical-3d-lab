import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import HigherBrainFunctionScene from '../src/scenes/nervous/scenes/higherBrainFunction/index.js';
import {
  REEL_CUES, REEL_DURATION, cameraAt, extentAt, overlayAt,
} from '../src/scenes/nervous/scenes/higherBrainFunction/reelStoryboard.js';
import { REEL_COPY } from '../src/data/higherBrainFunction.js';

/**
 * The fifteen-second sequence has to agree with the scene it is a video of.
 *
 * The subject is conduction aphasia, which is the one finding here a still
 * picture cannot carry: the word arrives, is understood, and stops on the way
 * out. So what these check is that the sequence really shows that — the run
 * getting through before the cut and not after it — and that every word on
 * screen is read from the solved state rather than written into the storyboard.
 */

function fixtureAtlas() {
  const bytes = readFileSync(new URL('../public/assets/brain/brain.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const atlas = new THREE.Group();
  for (const node of gltf.nodes) {
    const extras = node.extras;
    if (extras?.bx_id == null) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial());
    const id = Number(extras.bx_id);
    mesh.position.set(
      (extras.bx_side === 'left' ? 1 : extras.bx_side === 'right' ? -1 : 0) * 0.8,
      ((id % 17) - 8) * 0.12,
      ((id % 23) - 11) * 0.1
    );
    mesh.userData = { ...extras };
    atlas.add(mesh);
  }
  return atlas;
}

const ATLAS = fixtureAtlas();
const build = () => {
  const scene = new HigherBrainFunctionScene({ atlas: ATLAS.clone(true) });
  scene.build();
  return scene;
};

test('the cues tile the whole sequence with no gap and no overlap', () => {
  assert.equal(REEL_CUES[0].at, 0);
  assert.equal(REEL_CUES.at(-1).until, REEL_DURATION);
  for (let i = 1; i < REEL_CUES.length; i += 1) {
    assert.equal(REEL_CUES[i].at, REEL_CUES[i - 1].until, `gap before cue ${REEL_CUES[i].id}`);
  }
});

test('the lesion arrives once, never retreats, and the camera is a pure function of time', () => {
  let previous = -Infinity;
  for (let t = 0; t <= REEL_DURATION; t += 0.05) {
    const extent = extentAt(t);
    assert.ok(extent >= 0 && extent <= 1, `extent ${extent} out of range at ${t}`);
    assert.ok(extent >= previous - 1e-9, `the lesion went backwards at ${t}`);
    previous = extent;
  }
  assert.equal(extentAt(0), 0, 'it opens on an intact brain');
  assert.equal(extentAt(REEL_DURATION), 1);

  const base = { distance: 6, targetX: 0, targetY: -0.35, targetZ: 0 };
  for (let t = 0; t <= REEL_DURATION; t += 0.37) {
    assert.deepEqual(cameraAt(t, base), cameraAt(t, base));
  }
});

test('the sequence shows the word getting through, and then not', () => {
  const scene = build();
  const reel = scene.getReel();

  // Before the cut: the run reaches the end and an answer comes back.
  reel.driveAt(2.0);
  assert.equal(scene.tracedTask().status, 'intact');
  assert.equal(scene.answerStrength(), 1);
  assert.equal(scene.blockedFraction(), 1, 'nothing stops it yet');

  // After it: the run stops at the cut bundle, and nothing answers.
  reel.driveAt(8.0);
  assert.equal(scene.tracedTask().status, 'lost');
  assert.equal(scene.tracedTask().blockedAt.id, 'dorsal-phonological');
  assert.ok(scene.blockedFraction() < 1);
  assert.equal(scene.answerStrength(), 0);

  // And the two the sequence claims are untouched really are, at every instant.
  for (let t = 0; t <= REEL_DURATION; t += 0.5) {
    reel.driveAt(t);
    const rows = reel.readMetrics();
    assert.equal(rows['auditory-comprehension'].ja, '保たれる', `comprehension at ${t}`);
    assert.equal(rows['speech-fluency'].ja, '保たれる', `fluency at ${t}`);
  }
  scene.dispose();
});

test('every word on screen is the solved state, not a sentence written into the storyboard', () => {
  const scene = build();
  const reel = scene.getReel();
  reel.driveAt(9.0);
  const frame = overlayAt(9.0, { language: 'ja', metrics: reel.readMetrics() });
  const rows = frame.cards.items.flatMap((item) => item.rows).join(' / ');
  assert.match(rows, /復唱: 消失/);
  assert.match(rows, /聴覚的理解: 保たれる/);
  assert.match(rows, /流暢性: 保たれる/);

  // The same instant, before the cut, says the opposite about the same row —
  // so the card is reading something rather than printing a constant.
  reel.driveAt(1.0);
  const early = overlayAt(1.0, { language: 'ja', metrics: reel.readMetrics() });
  assert.match(early.cards.items[0].rows.join(''), /復唱: 保たれる/);
  scene.dispose();
});

test('the sequence takes the reader to the name last, and says what the seconds are not', () => {
  const metrics = {
    repetition: { en: 'Lost', ja: '消失' },
    'auditory-comprehension': { en: 'Intact', ja: '保たれる' },
    'speech-fluency': { en: 'Intact', ja: '保たれる' },
  };
  const opening = overlayAt(1.0, { language: 'ja', metrics });
  assert.equal(opening.title.text, REEL_COPY.hook.titleJa);
  assert.equal(opening.title.variant, 'hook');
  assert.ok(opening.title.opacity > 0);

  const ending = overlayAt(13.5, { language: 'ja', metrics });
  assert.equal(ending.title.text, REEL_COPY.takeHome.titleJa);
  assert.equal(ending.title.variant, 'take-home');

  // The name arrives after the finding, never before it.
  for (const t of [1, 4, 7, 10, 12]) {
    assert.notEqual(overlayAt(t, { language: 'ja', metrics }).title.text, REEL_COPY.takeHome.titleJa, `at ${t}s`);
  }

  // And the disclaimer that keeps the rhythm from reading as a latency is on
  // screen for the whole of it.
  for (const t of [1, 7, 14]) {
    const frame = overlayAt(t, { language: 'ja', metrics });
    assert.ok(frame.note.opacity > 0, `the note is up at ${t}s`);
    assert.match(frame.note.text, /潜時ではありません/);
  }
});

test('the sequence drives the scene from a reset, and a replay gives the same frame', () => {
  const scene = build();
  const reel = scene.getReel();
  // A sequence starts after the controls are reset, so it must set its own.
  scene.resetModelControls();
  scene.setModelControl('task', 'reading');
  reel.driveAt(6.0);
  assert.equal(scene.controls.task, 'repetition', 'the sequence asks for its own task');
  assert.equal(scene.controls.lesion, 'dominant-arcuate');

  const first = scene.pulse.position.clone();
  reel.driveAt(0.5);
  reel.driveAt(6.0);
  assert.ok(scene.pulse.position.distanceTo(first) < 1e-9, 'the same second renders the same');
  scene.dispose();
});
