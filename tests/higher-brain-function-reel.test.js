import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import HigherBrainFunctionScene from '../src/scenes/nervous/scenes/higherBrainFunction/index.js';
import {
  REEL_CUES, REEL_DURATION, REEL_SEGMENTS, cameraAt, extentAt, overlayAt, runTimeAt, segmentAt,
} from '../src/scenes/nervous/scenes/higherBrainFunction/reelStoryboard.js';
import { REEL_COPY } from '../src/data/higherBrainFunction.js';
import { lesionSiteById } from '../src/models/higherBrainFunction.js';

/**
 * The fifteen-second sequence has to agree with the scene it is a video of.
 *
 * The subject is one claim — *the name is where it stopped* — and it is only a
 * claim if the four runs really stop in four different places. So what these
 * check is that each beat cuts its own bundle, that the word gets a different
 * distance in each, that the rows which stay intact differ between them, and
 * that every word on screen is read from the solved state rather than written
 * into the storyboard.
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

/** The middle of a beat, where its lesion is fully arrived and the run is mid-flight. */
const midOf = (id) => {
  const segment = REEL_SEGMENTS.find((candidate) => candidate.id === id);
  return (segment.at + segment.until) / 2;
};

test('the cues tile the whole sequence with no gap and no overlap', () => {
  assert.equal(REEL_CUES[0].at, 0);
  assert.equal(REEL_CUES.at(-1).until, REEL_DURATION);
  for (let i = 1; i < REEL_CUES.length; i += 1) {
    assert.equal(REEL_CUES[i].at, REEL_CUES[i - 1].until, `gap before cue ${REEL_CUES[i].id}`);
  }
});

test('each beat opens on the brain it is about to cut, and the camera is a pure function of time', () => {
  // Not one lesion growing across the fifteen seconds: four separate runs. So
  // the thing that must hold is per beat — the cut arrives *inside* its own
  // beat, after the viewer has been shown where it is.
  for (const segment of REEL_SEGMENTS) {
    if (!segment.lesion) {
      for (let t = segment.at; t < segment.until; t += 0.1) {
        assert.equal(extentAt(t), 0, `the intact beat stays intact at ${t}`);
      }
      continue;
    }
    if (segment.at !== REEL_SEGMENTS.find((s) => s.lesion === segment.lesion).at) continue;
    assert.equal(extentAt(segment.at), 0, `${segment.id} opens before its cut`);
    assert.ok(extentAt(segment.at + 0.3) > 0 && extentAt(segment.at + 0.3) < 1, `${segment.id} arrives, rather than appearing`);
    for (let t = segment.at + 0.6; t < segment.until; t += 0.1) {
      assert.ok(extentAt(t) > 1 - 1e-9, `${segment.id} holds its cut at ${t}`);
    }
  }
  assert.equal(extentAt(REEL_DURATION), 1, 'the closing frame still shows the last lesion');

  const base = { distance: 6, targetX: 0, targetY: -0.35, targetZ: 0 };
  for (let t = 0; t <= REEL_DURATION; t += 0.37) {
    assert.deepEqual(cameraAt(t, base), cameraAt(t, base));
  }
});

test('every beat plays one whole run of the examination, at the same pace', () => {
  // The lesions are compared by *where* the word stopped, which only reads as a
  // comparison if each of them is asked the same question from the beginning.
  // A run that is a slice of one long sweep would show the back cut mid-word.
  const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
  for (const segment of REEL_SEGMENTS) {
    assert.equal(runTimeAt(segment.at, cycle), 0, `${segment.id} starts its run at the beginning`);
    const last = runTimeAt(segment.until - 1e-6, cycle);
    assert.ok(last > cycle * 0.99, `${segment.id} gets to the end of its run (${last})`);
    let previous = -Infinity;
    for (let t = segment.at; t < segment.until; t += 0.05) {
      const now = runTimeAt(t, cycle);
      assert.ok(now >= previous - 1e-9, `${segment.id} ran backwards at ${t}`);
      assert.ok(now <= cycle, `${segment.id} ran past its own run at ${t}`);
      previous = now;
    }
  }
});

test('the four runs stop in four different places', () => {
  const scene = build();
  const reel = scene.getReel();

  // Nothing in the way: the word goes all the way through and an answer returns.
  reel.driveAt(midOf('intact'));
  assert.equal(scene.tracedTask().state, 'high');
  assert.equal(scene.answerStrength(), 1);
  assert.equal(scene.blockedFraction(), 1, 'nothing stops it yet');

  // Then the same word, three times, against three cuts. What is being claimed
  // is that the stopping place moves — so it is the set of them that is checked,
  // not three separate facts that could all be the same one.
  const stops = new Map();
  for (const id of ['broca', 'wernicke', 'conduction']) {
    const t = midOf(id);
    reel.driveAt(t);
    assert.equal(scene.controls.lesion, segmentAt(t).lesion, `${id} cuts its own site`);
    assert.equal(scene.tracedTask().state, 'low', `the word does not arrive in ${id}`);
    assert.equal(scene.answerStrength(), 0);
    assert.ok(scene.blockedFraction() < 1, `${id} stops short of the end`);
    stops.set(id, { at: scene.blockingStep().id, reach: scene.blockedFraction() });
  }
  assert.equal(stops.get('broca').at, 'phonological-output');
  assert.equal(stops.get('wernicke').at, 'phonological-analysis');
  assert.equal(stops.get('conduction').at, 'dorsal-phonological');
  assert.equal(new Set([...stops.values()].map((stop) => stop.at)).size, 3, 'three cuts, three places');

  // And the word visibly gets further in one than in another: the back cut
  // stops it before the front cut does.
  assert.ok(
    stops.get('wernicke').reach < stops.get('broca').reach,
    'the word reaches further against the front cut than against the back one'
  );
  scene.dispose();
});

test('what survives each cut differs, so the rows are read and not printed', () => {
  const scene = build();
  const reel = scene.getReel();
  const rowsAt = (id) => {
    reel.driveAt(midOf(id));
    const rows = reel.readMetrics();
    return {
      comprehension: rows['auditory-comprehension'].ja,
      initiation: rows['speech-initiation-route'].ja,
      repetition: rows['repetition-nonword'].ja,
    };
  };

  assert.deepEqual(rowsAt('intact'), { comprehension: '経路は概ね通る', initiation: '経路は概ね通る', repetition: '経路は概ね通る' });
  // Understood and never spoken.
  assert.deepEqual(rowsAt('broca'), { comprehension: '経路は概ね通る', initiation: '経路はほとんど通らない', repetition: '経路はほとんど通らない' });
  // Heard, never understood, and speech still flows.
  assert.deepEqual(rowsAt('wernicke'), { comprehension: '経路はほとんど通らない', initiation: '経路は概ね通る', repetition: '経路はほとんど通らない' });
  // Both of those intact, and still not repeatable — the finding of the reel.
  assert.deepEqual(rowsAt('conduction'), { comprehension: '経路は概ね通る', initiation: '経路は概ね通る', repetition: '経路はほとんど通らない' });
  scene.dispose();
});

test('every word on screen is the solved state, not a sentence written into the storyboard', () => {
  const scene = build();
  const reel = scene.getReel();
  const cardsAt = (id) => {
    const t = midOf(id);
    reel.driveAt(t);
    const frame = overlayAt(t, { language: 'ja', metrics: reel.readMetrics() });
    return frame.cards.items;
  };

  const conduction = cardsAt('conduction');
  assert.equal(conduction[0].label, lesionSiteById('dominant-arcuate').labelJa, 'the card names the cut it is showing');
  assert.match(conduction.flatMap((item) => item.rows).join(' / '), /非語の復唱: 経路はほとんど通らない/);
  assert.match(conduction.flatMap((item) => item.rows).join(' / '), /聞いた語 → 意味: 経路は概ね通る/);
  assert.match(conduction.flatMap((item) => item.rows).join(' / '), /話し始める経路: 経路は概ね通る/);

  // A different beat of the same sequence says the opposite about the same two
  // rows, so the card is reading something rather than printing a constant.
  const wernicke = cardsAt('wernicke');
  assert.equal(wernicke[0].label, lesionSiteById('dominant-posterior-superior-temporal').labelJa);
  assert.match(wernicke.flatMap((item) => item.rows).join(' / '), /聞いた語 → 意味: 経路はほとんど通らない/);

  const broca = cardsAt('broca');
  assert.match(broca.flatMap((item) => item.rows).join(' / '), /話し始める経路: 経路はほとんど通らない/);

  // And the opening beat, which cuts nothing, does not name a lesion at all.
  const intact = cardsAt('intact');
  assert.equal(intact[0].label, REEL_COPY.cards.task.labelJa);
  assert.match(intact.flatMap((item) => item.rows).join(' / '), /非語の復唱: 経路は概ね通る/);
  scene.dispose();
});

test('the sequence takes the reader to the name last, and says what the seconds are not', () => {
  const metrics = {
    'repetition-nonword': { en: 'Route barely available', ja: '経路はほとんど通らない' },
    'auditory-comprehension': { en: 'Route available', ja: '経路は概ね通る' },
    'speech-initiation-route': { en: 'Route available', ja: '経路は概ね通る' },
  };
  const opening = overlayAt(1.0, { language: 'ja', metrics });
  assert.equal(opening.title.text, REEL_COPY.hook.titleJa);
  assert.equal(opening.title.variant, 'hook');
  assert.ok(opening.title.opacity > 0);

  const ending = overlayAt(13.5, { language: 'ja', metrics });
  assert.equal(ending.title.text, REEL_COPY.takeHome.titleJa);
  assert.equal(ending.title.variant, 'take-home');

  // The name arrives after all three cuts, never before them.
  for (const t of [1, 4, 7, 10, 12]) {
    assert.notEqual(overlayAt(t, { language: 'ja', metrics }).title.text, REEL_COPY.takeHome.titleJa, `at ${t}s`);
  }

  // Each beat says what it is cutting while it is on screen, and one beat's
  // caption never runs under another's.
  for (const segment of REEL_SEGMENTS) {
    const middle = (segment.at + segment.until) / 2;
    const frame = overlayAt(middle, { language: 'ja', metrics });
    if (!segment.copy) {
      assert.equal(frame.caption.opacity, 0, 'the closing beat carries no caption');
      continue;
    }
    assert.equal(frame.caption.text, REEL_COPY.segments[segment.copy].captionJa, `caption of ${segment.id}`);
    assert.ok(frame.caption.opacity > 0, `the caption of ${segment.id} is up`);
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
  reel.driveAt(5.0);
  assert.equal(scene.controls.task, 'repetition-nonword', 'the sequence asks for its own task');
  assert.equal(scene.controls.lesion, 'dominant-inferior-frontal');

  const first = scene.pulse.position.clone();
  // Away, through two other lesions, and back to the same second.
  reel.driveAt(0.5);
  reel.driveAt(11.0);
  reel.driveAt(5.0);
  assert.ok(scene.pulse.position.distanceTo(first) < 1e-9, 'the same second renders the same');
  scene.dispose();
});

test('nothing in the sequence’s words is written as markdown', () => {
  // The overlay assigns `textContent`, so an emphasis mark reaches the screen
  // as two asterisks. It did, on the closing frame — the one frame of the
  // fifteen that a viewer is most likely to screenshot.
  const walk = (value, path) => {
    if (typeof value === 'string') {
      assert.doesNotMatch(value, /\*\*|__/, `${path} is rendered as plain text`);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
    }
  };
  walk(REEL_COPY, 'REEL_COPY');
});
