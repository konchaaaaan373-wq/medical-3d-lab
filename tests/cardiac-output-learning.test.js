import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_MODULES, REEL_COPY } from '../src/data/cardiacOutput.js';
import {
  CONTROL_DOMAIN,
  PRESET_IDS,
  presetInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import {
  REEL_CUES,
  REEL_DURATION,
  cameraAt,
  cardiacPhaseAt,
  overlayAt,
  residualEmphasisAt,
  resistanceAt,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/reelStoryboard.js';

/**
 * The lesson and the sequence are content that makes claims about the model.
 *
 * These tests are what stop the two drifting apart: every stored answer is
 * re-derived from the circulation here, so a change to the physics that
 * invalidated the lesson fails the build rather than quietly teaching something
 * false. The same goes for the sequence — its captions assert a direction, and
 * a caption asserting a direction is a claim.
 */

const module_ = () => LEARNING_MODULES[0];
const at = (overrides) =>
  solveCardiacOutput({ ...presetInput(PRESET_IDS.REFERENCE), ...overrides });

test('the lesson is structurally complete and bilingual', () => {
  const module = module_();
  for (const [en, ja, where] of [
    [module.title, module.titleJa, 'title'],
    [module.question.text, module.question.textJa, 'question'],
    [module.manipulation.text, module.manipulation.textJa, 'manipulation'],
    [module.manipulation.action, module.manipulation.actionJa, 'manipulation action'],
    [module.manipulation.hint, module.manipulation.hintJa, 'manipulation hint'],
    [module.observation.text, module.observation.textJa, 'observation'],
    [module.explanation.text, module.explanation.textJa, 'explanation'],
    [module.explanation.footnote, module.explanation.footnoteJa, 'explanation footnote'],
    [module.transfer.text, module.transfer.textJa, 'transfer'],
    [module.transfer.explanation.text, module.transfer.explanation.textJa, 'transfer explanation'],
    [module.outro.text, module.outro.textJa, 'outro'],
  ]) {
    assert.ok(en?.length > 0, `missing English ${where}`);
    assert.ok(ja?.length > 0, `missing Japanese ${where}`);
  }
  for (const [label, options, answer] of [
    ['question', module.question.options, module.question.answer],
    ['transfer', module.transfer.options, module.transfer.answer],
  ]) {
    assert.ok(options.length >= 2, `${label} needs choices`);
    assert.ok(options.some((option) => option.id === answer), `${label} answer is not a choice`);
    for (const option of options) {
      assert.ok(option.label && option.labelJa, `${label} option ${option.id} is not bilingual`);
    }
  }
});

test('the lesson only points at things the scene actually has', async () => {
  // A watched row that does not exist highlights nothing and reads `undefined`
  // into the before/after table; a control the scene does not have does nothing
  // at all. Both fail silently in a browser.
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  const scene = new CardiacOutputScene({ viewer: {} });
  const metricIds = new Set(scene.getMetrics().map((row) => row.id));
  const controls = new Map(scene.getModelControls().map((control) => [control.id, control]));

  const module = module_();
  for (const id of module.watch) {
    assert.ok(metricIds.has(id), `watches "${id}", which is not a metric`);
  }
  const control = controls.get(module.manipulation.control);
  assert.ok(control, `moves "${module.manipulation.control}", which is not a control`);
  assert.ok(
    module.manipulation.to >= control.min && module.manipulation.to <= control.max,
    `moves the control somewhere the reader could not drag it to`
  );
  // The panel replays `setup` in `Object.entries` order, and selecting a preset
  // resets the four sliders — so a preset listed *after* a slider would wipe the
  // value being set. It works today because of the order the literal happens to
  // be written in, which is not a reason for it to keep working.
  const setupOrder = Object.keys(module.setup).filter((id) => id !== 'progress');
  const presetAt = setupOrder.indexOf('preset');
  if (presetAt >= 0) {
    assert.equal(presetAt, 0, 'the preset has to be set before anything it would reset');
  }
  for (const [id, value] of Object.entries(module.setup)) {
    if (id === 'progress') continue;
    const setupControl = controls.get(id);
    assert.ok(setupControl, `setup sets "${id}", which is not a control`);
    if (setupControl.kind === 'choice') {
      assert.ok(
        setupControl.options.some((option) => option.value === value),
        `setup puts ${id} on an option that does not exist`
      );
    } else {
      assert.ok(value >= setupControl.min && value <= setupControl.max, `setup puts ${id} out of range`);
    }
  }
  for (const [id, value] of Object.entries(module.transfer.controls ?? {})) {
    const transferControl = controls.get(id);
    assert.ok(transferControl, `transfer sets "${id}", which is not a control`);
    assert.ok(
      transferControl.options?.some((option) => option.value === value),
      `transfer puts ${id} on an option that does not exist`
    );
  }
});

test('the transfer question is answered by the model, not by the copy', () => {
  const module = module_();
  const lost = (presetId) => {
    const base = presetInput(presetId);
    const before = solveCardiacOutput({
      ...base,
      systemicResistanceMmHgSPerMl: module.setup.systemicResistanceMmHgSPerMl,
    });
    const after = solveCardiacOutput({ ...base, systemicResistanceMmHgSPerMl: module.manipulation.to });
    return (
      (before.metrics.strokeVolumeMl - after.metrics.strokeVolumeMl) / before.metrics.strokeVolumeMl
    );
  };
  const normal = lost(PRESET_IDS.REFERENCE);
  const failing = lost(module.transfer.atPreset);

  const verdict = failing > normal * 1.1 ? 'larger' : failing < normal * 0.9 ? 'smaller' : 'same';
  assert.equal(verdict, module.transfer.answer, 'the transfer answer disagrees with the model');

  // The panel shows both losses as whole percents. They have to differ once
  // rounded, or the learner is told "more" while looking at two equal numbers.
  assert.notEqual(Math.round(failing * 100), Math.round(normal * 100));
});

test('the lesson leaves the model where it found it', async () => {
  // It drives the model through the same setters the sliders use, so running it
  // and putting the controls back must land exactly where it started.
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  const scene = new CardiacOutputScene({ viewer: {} });
  const module = module_();

  scene.setModelControl('fillingVolumeMl', 840);
  scene.setModelControl('heartRatePerMin', 88);
  const explored = scene.getMetrics().find((row) => row.id === 'co').value;

  for (const [id, value] of Object.entries(module.setup)) {
    if (id !== 'progress') scene.setModelControl(id, value);
  }
  scene.setModelControl(module.manipulation.control, module.manipulation.to);
  for (const [id, value] of Object.entries(module.transfer.controls)) scene.setModelControl(id, value);
  assert.notEqual(scene.getMetrics().find((row) => row.id === 'co').value, explored);

  // What the app's session restore does on the way out: replay the controls in
  // the order `getModelControls()` returned them.
  for (const { id, value } of [
    { id: 'preset', value: PRESET_IDS.REFERENCE },
    { id: 'fillingVolumeMl', value: 840 },
    { id: 'heartRatePerMin', value: 88 },
  ]) {
    scene.setModelControl(id, value);
  }
  assert.equal(scene.getMetrics().find((row) => row.id === 'co').value, explored);
});

// ---------------------------------------------------------------------------
// The sequence
// ---------------------------------------------------------------------------

test('the sequence is contiguous and ends where it says it does', () => {
  assert.equal(REEL_CUES[0].at, 0);
  for (let i = 0; i < REEL_CUES.length - 1; i++) {
    assert.equal(REEL_CUES[i].until, REEL_CUES[i + 1].at, `a gap after "${REEL_CUES[i].id}"`);
  }
  assert.equal(REEL_CUES[REEL_CUES.length - 1].until, REEL_DURATION);
});

test('the sequence quotes no number of its own', () => {
  // Every figure on a card comes from the scene's read-out. A number written
  // into the copy would be a second source of truth with no test behind it, and
  // it would still be there after the model moved.
  // Written as "a digit carrying a unit" rather than "a digit": the copy is
  // allowed to say「変えるのは 1 つだけ」, which counts controls. What it may
  // never carry is a measurement, because that is the thing that would go stale
  // silently.
  const words = JSON.stringify(REEL_COPY);
  const measurement = words.match(/\d[\d.,]*\s*(mmHg|L\/min|mL|%|\/min|mmHg·s\/mL)/);
  assert.equal(measurement, null, `the sequence copy quotes a measurement: ${measurement?.[0]}`);

  // And the overlay renders the read-out's own strings, untouched.
  const metrics = {
    map: { before: 89, now: 116 },
    co: { before: '4.7', now: '4.3' },
    sv: { before: 68, now: 61 },
  };
  const frame = overlayAt(6.0, { language: 'en', metrics });
  assert.equal(frame.cards.items[0].headline, 89);
  assert.equal(frame.cards.items[1].headline, 116);
  assert.ok(frame.cards.items[1].rows.join(' ').includes('4.3'));
  assert.ok(frame.cards.opacity > 0, 'and they are on screen at that moment');
});

test('the sequence only visits conditions a reader could reach themselves', () => {
  const { min, max, step } = CONTROL_DOMAIN.systemicResistanceMmHgSPerMl;
  const visited = new Set();
  for (let t = 0; t <= REEL_DURATION; t += 1 / 60) {
    const r = resistanceAt(t);
    assert.ok(r >= min && r <= max, `the sequence drives resistance to ${r}, outside the control`);
    // On the control's own grid, so the condition recorded is one the slider can
    // be dragged to — not a state the interactive page cannot reproduce.
    assert.ok(Math.abs(Math.round(r / step) * step - r) < 1e-9, `${r} is off the control's grid`);
    visited.add(r.toFixed(3));
  }
  // Coarse enough that the cache answers most frames, fine enough to read as a
  // movement rather than a jump.
  assert.ok(visited.size >= 4 && visited.size <= 20, `${visited.size} distinct conditions`);
});

test('the sequence starts at the reference condition and puts it back', () => {
  const { default: start } = CONTROL_DOMAIN.systemicResistanceMmHgSPerMl;
  assert.equal(resistanceAt(0), start, 'it opens where the preset opens');
  assert.equal(resistanceAt(REEL_DURATION), start, 'and it hands the condition back');
  const raised = resistanceAt(7.0);
  assert.ok(raised > start, 'having raised it in between');
  assert.equal(raised, module_().manipulation.to, 'to the same condition the lesson uses');
});

test('the beat is a pure function of time, and the emphasis is presentation only', () => {
  for (const t of [0, 1.3, 5.5, 9.4, 11.6, 14.9]) {
    assert.equal(cardiacPhaseAt(t), cardiacPhaseAt(t), 'deterministic');
    const phase = cardiacPhaseAt(t);
    assert.ok(phase >= 0 && phase < 1, `phase ${phase} at ${t}`);
  }
  // The slow beat really is slower: fewer cycles per second through it.
  const during = cardiacPhaseAt(10.5) - cardiacPhaseAt(10.0);
  const outside = cardiacPhaseAt(5.5) - cardiacPhaseAt(5.0);
  assert.ok(Math.abs(during) < Math.abs(outside), 'the slowed beat is slower');

  // And it decelerates rather than restarting. A reviewer found the seam: the
  // slow segment began at phase 0 while the beat had reached 0.81, so every
  // playback and every exported file skipped late diastole and snapped the
  // chamber, the valves and the blood — a step forty times an ordinary one, at
  // exactly the moment the close-up begins. "Slower" was asserted; continuous
  // was not.
  const STEP = 1 / 240;
  const ordinary = 1.15 * STEP;
  let worst = 0;
  let worstAt = 0;
  let previous = cardiacPhaseAt(0);
  for (let t = STEP; t <= REEL_DURATION; t += STEP) {
    const now = cardiacPhaseAt(t);
    let delta = now - previous;
    if (delta < -0.5) delta += 1; // an ordinary wrap through end of cycle
    if (Math.abs(delta) > worst) {
      worst = Math.abs(delta);
      worstAt = t;
    }
    previous = now;
  }
  assert.ok(
    worst <= ordinary * 1.5,
    `the beat jumps ${worst.toFixed(4)} at t=${worstAt.toFixed(2)}s, against an ordinary step of ${ordinary.toFixed(4)}`
  );

  for (const t of [0, 5, 9.5, 10.5, 11.7, 15]) {
    const value = residualEmphasisAt(t);
    assert.ok(value >= 0 && value <= 1, `emphasis ${value} at ${t}`);
  }
  assert.equal(residualEmphasisAt(0), 0, 'and it is off outside its own window');
  assert.equal(residualEmphasisAt(15), 0);
  assert.ok(residualEmphasisAt(10.5) > 0.5, 'and on inside it');
});

test('the last frame is held rather than caught mid-fade', () => {
  // A recording stopped at the final second should show the take-home, not
  // something halfway through disappearing.
  const frame = overlayAt(REEL_DURATION, {
    language: 'en',
    metrics: { map: { before: 1, now: 2 }, co: { before: 1, now: 2 }, sv: { before: 1, now: 2 } },
  });
  assert.equal(frame.title.variant, 'take-home');
  assert.ok(frame.title.opacity > 0.9, `the take-home is at ${frame.title.opacity}`);
  assert.ok(frame.note.opacity > 0.9, 'and so is the note that says what this is');
  assert.ok(frame.cards.opacity > 0.9, 'and the numbers are still readable');
});

test('every frame carries the note that says what the sequence is', () => {
  // "Two settled conditions, not a treatment over time" has to be on screen
  // throughout, because a screenshot of any one second of it will travel alone.
  for (let t = 0; t <= REEL_DURATION; t += 0.25) {
    const frame = overlayAt(t, { language: 'ja', metrics: null });
    assert.ok(frame.note.opacity > 0.9, `the note is at ${frame.note.opacity.toFixed(2)} at ${t.toFixed(2)}s`);
    assert.ok(frame.note.text.length > 0);
  }
});

test('the camera returns the description the shell reads, not a pose', () => {
  // `ReelMode` hands in `{ distance, targetX, targetY, targetZ }` and reads the
  // same four fields back, because it owns the view direction and the controls'
  // target and has to keep them in step. Returning `{ position, target }`
  // instead threw on every frame of the sequence — and surfaced as a recording
  // that never finished, not as anything a reader or a test would call an error.
  const base = { distance: 24, targetX: 0, targetY: -1.8, targetZ: 0.2 };
  for (const t of [0, 3.2, 7.5, 11, REEL_DURATION]) {
    const shot = cameraAt(t, base);
    for (const key of ['distance', 'targetX', 'targetY', 'targetZ']) {
      assert.ok(Number.isFinite(shot[key]), `${key} is a number at ${t}s`);
    }
    assert.equal(shot.targetX, base.targetX, 'the sequence does not pan');
    assert.ok(shot.distance > 0);
  }
  // A dolly, not a zoom stunt: it never doubles or halves.
  const distances = [];
  for (let t = 0; t <= REEL_DURATION; t += 0.5) distances.push(cameraAt(t, base).distance);
  assert.ok(Math.max(...distances) / Math.min(...distances) < 1.5, 'the dolly stays gentle');
});
