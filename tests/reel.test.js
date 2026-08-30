import test from 'node:test';
import assert from 'node:assert/strict';
import { Timeline, cueIdAt, cueOpacity, sampleTrack } from '../src/utils/Timeline.js';
import {
  REEL_DURATION,
  REEL_CUES,
  cardiacPhaseAt,
  cameraAt,
  congestionVisibleAt,
  overlayAt,
} from '../src/scenes/cardiovascular/scenes/heartFailure/reelStoryboard.js';
import { REEL_FORMATS } from '../src/app/ReelMode.js';
import { CAPTURE_PRESETS } from '../src/components/ControlPanel.js';
import { REEL_COPY, STAGES } from '../src/data/heartFailure.js';
import { sampleHemodynamics } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';

/** Stand-in for what the scene reports; deliberately not the real numbers. */
const METRICS = {
  ef: { normal: 61, hfref: 24 },
  edv: { normal: 118, hfref: 212 },
  esv: { normal: 46, hfref: 161 },
};
const context = (language = 'ja') => ({ language, metrics: METRICS });

test('the storyboard covers exactly 15 seconds with no gaps', () => {
  assert.ok(Math.abs(REEL_DURATION - 15) <= 1, 'the sequence should be about 15 seconds');
  assert.equal(REEL_CUES[0].at, 0, 'the sequence must start at zero');
  assert.equal(REEL_CUES[REEL_CUES.length - 1].until, REEL_DURATION);
  for (let i = 0; i < REEL_CUES.length - 1; i++) {
    assert.equal(REEL_CUES[i].until, REEL_CUES[i + 1].at, 'cues must be contiguous');
    assert.ok(REEL_CUES[i].until > REEL_CUES[i].at, 'cues must have positive length');
  }
});

test('cues run in the storyboard order', () => {
  const order = ['hook', 'compare', 'beat', 'ejection-fraction', 'congestion', 'take-home'];
  assert.deepEqual(REEL_CUES.map((c) => c.id), order);
  // Sampled mid-cue, each moment resolves to its own cue.
  for (const cue of REEL_CUES) {
    assert.equal(cueIdAt(REEL_CUES, (cue.at + cue.until) / 2), cue.id);
  }
  assert.equal(cueIdAt(REEL_CUES, 0), 'hook');
  assert.equal(cueIdAt(REEL_CUES, REEL_DURATION), 'take-home', 'the final frame holds on the take-home');
});

test('the timeline starts, advances on elapsed time and ends once', () => {
  const seen = [];
  let ended = 0;
  const timeline = new Timeline({
    duration: REEL_DURATION,
    cues: REEL_CUES,
    onCue: (id) => seen.push(id),
    onEnd: () => {
      ended += 1;
    },
  });
  timeline.start();
  assert.equal(timeline.elapsed, 0);
  assert.ok(timeline.running);

  // Deliberately uneven steps: the result must depend on elapsed time only.
  let guard = 0;
  while (timeline.running && guard++ < 10000) timeline.tick(guard % 3 === 0 ? 0.031 : 0.0166);
  assert.equal(timeline.elapsed, REEL_DURATION);
  assert.equal(ended, 1, 'the end callback must fire exactly once');
  assert.deepEqual(seen, REEL_CUES.map((c) => c.id), 'every cue must be entered, in order');

  timeline.tick(1); // stopped timelines ignore further ticks
  assert.equal(timeline.elapsed, REEL_DURATION);
});

test('the sequence is a pure function of elapsed time', () => {
  // Same instant, reached by any route, must render identically — otherwise a
  // recording would differ between a fast and a slow machine.
  for (const t of [0.4, 3.3, 6.0, 7.0, 9.9, 12.6, 14.8]) {
    assert.equal(cardiacPhaseAt(t), cardiacPhaseAt(t));
    assert.deepEqual(overlayAt(t, context()), overlayAt(t, context()));
    const base = { distance: 30, targetX: 0, targetY: -2.2, targetZ: 0.3 };
    assert.deepEqual(cameraAt(t, base), cameraAt(t, base));
  }
});

test('the slowed beat starts at end-diastole and reaches end-systole on screen', () => {
  const beat = REEL_CUES.find((c) => c.id === 'beat');
  assert.equal(cardiacPhaseAt(beat.at), 0, 'the slow beat must begin at end-diastole');
  // Where end-systole actually falls is solved, not assumed: the ventricle the
  // sequence shows takes longer to reach its smallest volume than a healthy one.
  const { endSystolePhase } = sampleHemodynamics(
    STAGES.find((stage) => stage.id === 'systolic-dysfunction').at
  );
  // End-systole arrives within the cue, not after it.
  let esTime = null;
  for (let t = beat.at; t < beat.until; t += 0.01) {
    if (Math.abs(cardiacPhaseAt(t) - endSystolePhase) < 0.005) {
      esTime = t;
      break;
    }
  }
  assert.ok(esTime !== null && esTime < beat.until, 'end-systole must be reached inside the beat cue');
  // And it is genuinely slower than the surrounding playback.
  const slowStep = cardiacPhaseAt(beat.at + 0.5) - cardiacPhaseAt(beat.at);
  const normalStep = cardiacPhaseAt(3.5) - cardiacPhaseAt(3.0);
  assert.ok(slowStep < Math.abs(normalStep), 'the featured beat should run slower than the rest');

  // The volume marker lights up around those moments and nowhere else, and it
  // names whichever of the two the beat is actually at. One slot rather than
  // two: the storyboard picks, the overlay lays out.
  const atEd = overlayAt(beat.at, context());
  assert.ok(atEd.marker.opacity > 0.3, 'the marker should be up at end-diastole');
  assert.equal(atEd.marker.text, REEL_COPY.beat.endDiastole.tag);
  const atEs = overlayAt(esTime, context());
  assert.ok(atEs.marker.opacity > 0.5, 'the marker should be up at end-systole');
  assert.equal(atEs.marker.text, REEL_COPY.beat.endSystole.tag);
  assert.equal(overlayAt(3.0, context()).marker.opacity, 0);
});

test('cardiac phase always stays in range', () => {
  for (let t = 0; t <= REEL_DURATION; t += 0.01) {
    const phase = cardiacPhaseAt(t);
    assert.ok(phase >= 0 && phase < 1, `phase out of range at ${t}`);
  }
});

test('every number on screen comes from the scene state', () => {
  // Nothing may be hard-coded: feeding different metrics must change the video.
  const frame = overlayAt(1.0, context());
  assert.ok(frame.title.text.includes('61') && frame.title.text.includes('24'));
  const compare = overlayAt(4.0, context());
  const [normal, hfref] = compare.cards.items;
  assert.equal(normal.headline, METRICS.ef.normal);
  assert.equal(hfref.headline, METRICS.ef.hfref);
  assert.ok(normal.rows.some((row) => row.includes(String(METRICS.edv.normal))));
  assert.ok(hfref.rows.some((row) => row.includes(String(METRICS.esv.hfref))));

  // And the copy itself must not contain baked-in figures.
  const copy = JSON.stringify(REEL_COPY);
  assert.doesNotMatch(copy, /\b58\b|\b29\b|\b205\b|\b145\b/, 'copy must not hard-code model values');
  assert.match(REEL_COPY.hook.title, /\{normalEf\}/);
});

test('the video shows one language at a time', () => {
  const ja = overlayAt(1.0, context('ja'));
  const en = overlayAt(1.0, context('en'));
  assert.equal(ja.subtitle.text, REEL_COPY.hook.subtitleJa);
  assert.equal(en.subtitle.text, REEL_COPY.hook.subtitle);
  assert.notEqual(ja.subtitle.text, en.subtitle.text);
  // Bilingual UI mode still resolves to a single language in the video.
  assert.equal(overlayAt(1.0, context('both')).subtitle.text, ja.subtitle.text);
});

test('the congestion overlay is cued to the congestion beat', () => {
  const cue = REEL_CUES.find((c) => c.id === 'congestion');
  assert.ok(congestionVisibleAt((cue.at + cue.until) / 2), 'the overlay must show during its beat');
  assert.ok(!congestionVisibleAt(4.0), 'and not during the comparison');
  assert.ok(!congestionVisibleAt(REEL_DURATION), 'and not on the closing frame');
  const frame = overlayAt((cue.at + cue.until) / 2, context());
  assert.equal(frame.caption.text, REEL_COPY.congestion.captionJa);
  // The congestion beat is explicitly marked as schematic.
  assert.equal(frame.note.text, REEL_COPY.congestion.noteJa);
});

test('the educational note is present for the whole sequence', () => {
  for (let t = 1; t <= REEL_DURATION; t += 0.5) {
    assert.ok(overlayAt(t, context()).note.opacity > 0.2, `no disclaimer at ${t}`);
  }
});

test('the closing frame is the take-home, and the hook is gone by then', () => {
  const end = overlayAt(REEL_DURATION - 0.2, context());
  assert.equal(end.title.variant, 'take-home');
  assert.equal(end.title.text, REEL_COPY.takeHome.titleJa);
  assert.ok(end.title.opacity > 0.5);
  assert.equal(end.subtitle.opacity, 0);
  const hook = overlayAt(1.0, context());
  assert.equal(hook.title.variant, 'hook');
});

test('the camera moves without ever inverting or collapsing', () => {
  const base = { distance: 30, targetX: 0, targetY: -2.2, targetZ: 0.3 };
  let previous = null;
  for (let t = 0; t <= REEL_DURATION; t += 0.05) {
    const shot = cameraAt(t, base);
    assert.ok(shot.distance > 5, `camera too close at ${t}`);
    assert.ok(shot.directionBlend >= 0 && shot.directionBlend <= 1);
    if (previous) {
      assert.ok(Math.abs(shot.distance - previous.distance) < 1.2, `camera jump at ${t}`);
      assert.ok(Math.abs(shot.targetX - previous.targetX) < 0.6, `camera pan jump at ${t}`);
    }
    previous = shot;
  }
  // Only the congestion beat leans off-centre; the comparisons stay symmetric.
  assert.equal(cameraAt(4.0, base).targetX, base.targetX);
  assert.equal(cameraAt(4.0, base).directionBlend, 0);
  assert.ok(cameraAt(12.6, base).targetX > base.targetX);
});

test('the sequence is parked on the HFrEF state', () => {
  // The reel holds one state for all 15 seconds so the EF never changes mid-video.
  const hfref = STAGES.find((s) => s.id === 'systolic-dysfunction');
  assert.ok(hfref, 'the HFrEF stage must exist for the reel to park on it');
});

test('social formats include a 9:16 frame and a matching export preset', () => {
  const reel = REEL_FORMATS.find((f) => f.id === 'reel');
  assert.ok(reel, 'a 9:16 format must exist');
  assert.equal(reel.width, 1080);
  assert.equal(reel.height, 1920);
  for (const format of REEL_FORMATS) {
    assert.ok(format.width > 0 && format.height > 0 && format.label);
  }
  // The still-export presets keep their existing entries and gain 1080x1920.
  const sizes = CAPTURE_PRESETS.filter((p) => p.size).map((p) => `${p.size.width}x${p.size.height}`);
  for (const expected of ['1080x1920', '1080x1350', '1080x1080', '1920x1080']) {
    assert.ok(sizes.includes(expected), `missing export preset ${expected}`);
  }
  assert.ok(CAPTURE_PRESETS.some((p) => p.size === null), 'the current-view export must survive');
});

test('timeline helpers behave', () => {
  assert.equal(cueOpacity(0, 0, 1), 0);
  assert.equal(cueOpacity(1, 0, 1), 0);
  assert.ok(cueOpacity(0.5, 0, 1, 0.2) > 0.99);
  assert.ok(cueOpacity(0.05, 0, 1, 0.2) < 0.5);
  const track = [{ t: 0, value: 10 }, { t: 1, value: 20 }];
  assert.equal(sampleTrack(track, -1), 10);
  assert.equal(sampleTrack(track, 2), 20);
  assert.equal(sampleTrack(track, 0.5), 15);
});
