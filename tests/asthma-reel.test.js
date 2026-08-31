import test from 'node:test';
import assert from 'node:assert/strict';
import { AsthmaScene } from '../src/scenes/respiratory/scenes/asthma/AsthmaScene.js';
import {
  REEL_CUES,
  REEL_DURATION,
  cameraAt,
  overlayAt,
  stimulusAt,
} from '../src/scenes/respiratory/scenes/asthma/reelStoryboard.js';
import { REEL_COPY } from '../src/data/asthma.js';
import { solveAsthma } from '../src/models/asthma.js';

/**
 * **Layer 2 — model integrity.** The social sequence has to agree with the
 * scene it is a video of.
 *
 * Nothing here is a claim about asthma; the physiology lives in
 * `respiratory-physiology.test.js`. What is checked is that the sequence is
 * reproducible, that its cues tile the fifteen seconds, and — the one that
 * matters — that every figure it puts on screen comes from the model rather
 * than from a caption someone typed.
 */

const scene = () => {
  const built = new AsthmaScene({});
  built.build();
  return built;
};

const context = (metrics) => ({ language: 'en', metrics });

test('the sequence is a pure function of elapsed seconds', () => {
  // What makes a screen recording reproducible: the same second gives the same
  // dose and the same camera however the frames fell on the way there.
  for (let t = 0; t <= REEL_DURATION; t += 0.37) {
    assert.equal(stimulusAt(t), stimulusAt(t), `dose drifted at ${t}`);
    const base = { distance: 20, targetX: 0, targetY: 0, targetZ: 0 };
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

test('the dose never leaves the axis, and never goes backwards', () => {
  let previous = -Infinity;
  for (let t = 0; t <= REEL_DURATION; t += 0.05) {
    const dose = stimulusAt(t);
    assert.ok(dose >= 0 && dose <= 1, `dose ${dose} out of range at ${t}`);
    assert.ok(dose >= previous - 1e-9, `the dose went backwards at ${t}`);
    previous = dose;
  }
});

test('the sequence pauses where exactly one tree has tipped', () => {
  // The whole video. During the hold, the asthmatic tree has ventilation
  // defects and the normal one has none — at a dose that is identical for both.
  const hold = REEL_CUES.find((cue) => cue.id === 'knee');
  const dose = stimulusAt((hold.at + hold.until) / 2);
  assert.equal(stimulusAt(hold.at), stimulusAt(hold.until), 'the dose has to be held, not still climbing');

  const built = scene();
  built.setProgress(dose);
  assert.ok(built.solved.defectFraction > 0, 'the asthmatic tree has to have tipped by the hold');
  assert.equal(built.referenceSolve().defectFraction, 0, 'and the normal one must not have');
});

test('the sequence ends where both trees have tipped, which is the honest half', () => {
  // A video that stopped at the hold would leave the viewer believing a normal
  // lung never responds. It does, given enough — and the last beat shows it.
  const built = scene();
  built.setProgress(stimulusAt(REEL_DURATION));
  assert.ok(built.referenceSolve().defectFraction > 0, 'the normal tree has to tip by the end');
  assert.ok(
    built.solved.defectFraction > 0,
    'and the asthmatic one is of course still tipped'
  );
});

test('every number on screen comes from the scene, not from the copy', () => {
  // Nothing may be hard-coded: feeding different metrics has to change the
  // video, and the copy itself must contain no figures at all.
  const metrics = {
    normal: { defects: 3, resistance: '1.4', ventilation: 71 },
    asthma: { defects: 44, resistance: '3.8', ventilation: 29 },
  };
  const frame = overlayAt(7.0, context(metrics));
  const [normal, asthma] = frame.cards.items;
  assert.equal(normal.headline, 3);
  assert.equal(asthma.headline, 44);
  assert.ok(normal.rows.some((row) => row.includes('1.4')));
  assert.ok(asthma.rows.some((row) => row.includes('29')));

  // The copy must carry no model figure: no percentage, no multiplier, and no
  // multi-digit number. ("2 本の気道樹" is a count of the model's own structure,
  // which is a fact about the design rather than an output of it.)
  const copy = JSON.stringify(REEL_COPY);
  assert.doesNotMatch(copy, /%/, 'copy must not carry a percentage');
  assert.doesNotMatch(copy, /[×x]\s*\d/, 'copy must not carry a multiplier');
  assert.doesNotMatch(copy, /\d{2,}/, 'copy must not carry a multi-digit figure');
});

test('the reel reads both trees from the same model the panel reads', () => {
  // The cards claim to be the normal tree and the asthmatic one. Checked
  // against a fresh solve rather than against the scene's cached answer, so a
  // stale cache would show up here.
  const built = scene();
  built.setProgress(0.62);
  const read = built.getReel().readMetrics(built);

  const asthmatic = solveAsthma(built.controls, { maxIterations: 320, tolerance: 1e-3 });
  assert.equal(read.asthma.defects, Math.round(asthmatic.defectFraction * 100));
  assert.equal(read.normal.defects, Math.round(built.referenceSolve().defectFraction * 100));
  assert.ok(read.asthma.defects >= read.normal.defects, 'the asthmatic tree cannot be the healthier one');
});

test('the reel drives the scene and nothing else', () => {
  // `driveAt` sets the dose. It must not reach for anything else about the
  // lung, or the video would be showing a lung the reader could not reproduce
  // with the sliders.
  const built = scene();
  const reel = built.getReel();
  const before = { ...built.controls };
  reel.driveAt(7.0, built);
  for (const [id, value] of Object.entries(built.controls)) {
    if (id === 'stimulus') continue;
    assert.equal(value, before[id], `the sequence moved "${id}", which it must not`);
  }
  assert.equal(built.controls.stimulus, stimulusAt(7.0));
});

test('the sequence is bilingual, and says what it is at every moment', () => {
  const metrics = {
    normal: { defects: 0, resistance: '1.2', ventilation: 83 },
    asthma: { defects: 12, resistance: '2.0', ventilation: 51 },
  };
  // From a second in — the first frames deliberately fade up from nothing.
  for (let t = 1.0; t <= REEL_DURATION; t += 0.25) {
    for (const language of ['en', 'ja']) {
      const frame = overlayAt(t, { language, metrics });
      assert.ok(frame.note.opacity > 0, `the disclaimer must be up at ${t}`);
      assert.ok(frame.note.text.length > 0);
      for (const slot of [frame.title, frame.subtitle, frame.caption, frame.badge]) {
        assert.ok(slot.opacity >= 0 && slot.opacity <= 1, `opacity out of range at ${t}`);
      }
    }
  }
  // And the two languages are genuinely different text, not one fallback.
  const en = overlayAt(13.5, { language: 'en', metrics }).title.text;
  const ja = overlayAt(13.5, { language: 'ja', metrics }).title.text;
  assert.notEqual(en, ja);
});

test('the last frame holds the take-home rather than fading to nothing', () => {
  const metrics = {
    normal: { defects: 0, resistance: '1.2', ventilation: 83 },
    asthma: { defects: 12, resistance: '2.0', ventilation: 51 },
  };
  const final = overlayAt(REEL_DURATION, context(metrics));
  assert.ok(final.title.opacity > 0.9, 'a recording held on the last frame has to show the take-home');
  assert.equal(final.title.variant, 'take-home');
  assert.equal(final.title.text, REEL_COPY.takeHome.title);
});

test('the scene declares a reel the app can run', () => {
  const built = scene();
  const reel = built.getReel();
  assert.equal(reel.durationSeconds, REEL_DURATION);
  assert.equal(reel.cues, REEL_CUES);
  assert.ok(reel.viewDirection.length() > 0.99, 'the view direction has to be a unit vector');
  assert.ok(reel.framing.halfWidth > 0 && reel.framing.halfHeight > 0);
  assert.equal(typeof reel.cameraAt, 'function');
  assert.equal(typeof reel.overlayAt, 'function');
});

test('a held stimulus costs no solves, and a moving one costs one tree each', () => {
  // The sequence holds at a constant stimulus for most of its fifteen seconds
  // and drives the scene on every rendered frame. Each of those frames used to
  // re-solve the asthmatic tree and the healthy one twice over — once for the
  // drawing and once for the read-out — to arrive at the picture already on
  // screen. Near the tipping point the iteration is heavily damped and a solve
  // is not cheap, which is how a fifteen-second recording drops frames.
  const built = scene();
  built.setComparison(true);
  const reel = built.getReel();

  let solves = 0;
  const countSolve = (fn) => {
    const before = solves;
    fn();
    return solves - before;
  };
  // Counted by watching the objects the scene replaces: a solve produces a new
  // one, so identity is the cheapest honest probe.
  const seen = new Set();
  const tally = () => {
    for (const solved of [built.solved, built.referenceSolved]) {
      if (solved && !seen.has(solved)) {
        seen.add(solved);
        solves += 1;
      }
    }
  };

  reel.driveAt(1.0, built);
  reel.readMetrics(built);
  tally();

  // A frame at the same instant: nothing on screen changes, so nothing should
  // be solved.
  const held = countSolve(() => {
    reel.driveAt(1.0, built);
    reel.readMetrics(built);
    tally();
  });
  assert.equal(held, 0, `a held frame solved ${held} tree(s)`);

  // A frame that actually moves: one tree each, not two apiece.
  const moved = countSolve(() => {
    reel.driveAt(5.0, built);
    reel.readMetrics(built);
    tally();
  });
  assert.ok(moved <= 2, `a moving frame solved ${moved} trees`);

  // And the read-out still agrees with what is drawn.
  assert.equal(built.referenceSolve(), built.referenceSolved);
});

test('the healthy tree is re-solved whenever the lung changes', () => {
  // The cache is only safe if every path that moves a control clears it.
  const built = scene();
  built.setProgress(0.5);
  const first = built.referenceSolve();
  built.setModelControl('hyperresponsiveness', 0.9);
  assert.notEqual(built.referenceSolve(), first, 'the healthy tree was served from a stale cache');

  const second = built.referenceSolve();
  built.setProgress(0.9);
  assert.notEqual(built.referenceSolve(), second);
});

test('the sequence asks the model a bounded number of times, however fast the display runs', () => {
  // Solving one airway tree near the tipping point costs tens of milliseconds
  // and the comparison solves two, so a sequence that drove a fresh value on
  // every rendered frame could not be recorded without dropping frames. The
  // ramps step instead of sliding, which caps the distinct values over the
  // whole sequence regardless of frame rate.
  const distinct = (frames) => {
    const seen = new Set();
    for (let f = 0; f < frames; f += 1) seen.add(stimulusAt((f / frames) * REEL_DURATION));
    return seen.size;
  };

  const at60 = distinct(900);
  const at120 = distinct(1800);
  assert.ok(at60 <= 160, `${at60} distinct values at 60fps`);
  assert.equal(at120, at60, 'a faster display asked the model more often');

  // And the steps are fine enough that nothing on screen shows them: below one
  // per cent of the axis, and below the precision the overlay prints.
  const steps = [...new Set([...Array(900)].map((_, f) => stimulusAt((f / 900) * REEL_DURATION)))]
    .sort((a, b) => a - b);
  const widest = Math.max(...steps.slice(1).map((v, i) => v - steps[i]));
  assert.ok(widest <= 0.01, `the axis steps by ${widest}`);
});
