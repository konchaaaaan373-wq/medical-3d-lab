import test from 'node:test';
import assert from 'node:assert/strict';

import { Vessels } from '../src/scenes/cardiovascular/scenes/heartFailure/Vessels.js';
import { CongestionOverlay } from '../src/scenes/cardiovascular/scenes/heartFailure/CongestionOverlay.js';
import { STORY_CHAPTERS } from '../src/scenes/cardiovascular/scenes/heartFailure/storyboard.js';

/**
 * Every bug these guard against had one shape: a value that was correct when it
 * was set and wrong a frame later, because something else owned it too. So none
 * of them check a constructor. They drive the object the way the scene does —
 * repeatedly, in several states, and back again — and check the value that
 * actually ends up on screen.
 */

/** Runs the component the way a frame loop would, several times over. */
function settle(vessels, frames = 8) {
  for (let i = 0; i < frames; i++) {
    vessels.setCongestionLevel(vessels.physiology.congestionLevel);
    vessels.setPresentationEmphasis(vessels.presentation.emphasis);
  }
}

test('the aorta stays opaque across repeated updates', () => {
  const vessels = new Vessels();
  const resting = vessels.arterialMaterial.opacity;
  assert.ok(
    resting > 0.7,
    `the aorta should read as an artery wall, not a window: ${resting.toFixed(2)}`
  );
  settle(vessels, 30);
  assert.equal(
    vessels.arterialMaterial.opacity,
    resting,
    'repeated updates must not walk the opacity away from its resting value'
  );
});

test('opacity is resolved, not assigned, in every combination of state', () => {
  const vessels = new Vessels();
  const states = [
    { name: 'normal', congestion: 0, emphasis: 0 },
    { name: 'emphasis', congestion: 0, emphasis: 1 },
    { name: 'congestion', congestion: 1, emphasis: 0 },
    { name: 'story', congestion: 0.6, emphasis: 0.8 },
  ];
  const seen = {};
  for (const state of states) {
    vessels.setCongestionLevel(state.congestion);
    vessels.setPresentationEmphasis(state.emphasis);
    settle(vessels);
    seen[state.name] = vessels.arterialMaterial.opacity;
    for (const material of [
      vessels.arterialMaterial,
      vessels.venousMaterial,
      vessels.atriumMaterial,
      vessels.valveMaterial,
      vessels.lungMaterial,
    ]) {
      assert.ok(
        material.opacity > 0 && material.opacity <= 1,
        `${state.name}: opacity out of range (${material.opacity})`
      );
    }
    // The aorta is arterial wall in every state the scene can be in.
    assert.ok(seen[state.name] > 0.7, `${state.name}: aorta went translucent`);
  }

  // And returning to rest returns the values, rather than leaving the last
  // state's numbers behind.
  vessels.setCongestionLevel(0);
  vessels.setPresentationEmphasis(0);
  settle(vessels);
  assert.equal(vessels.arterialMaterial.opacity, seen.normal, 'reset restores the resting value');
});

test('presentation emphasis never resizes anatomy', () => {
  const vessels = new Vessels();
  const rested = vessels.atriumDistension;
  vessels.setPresentationEmphasis(1);
  assert.equal(
    vessels.atriumDistension,
    rested,
    'how hard the story is pointing at the atrium is not how distended it is'
  );
  vessels.setCongestionLevel(1);
  const congested = vessels.atriumDistension;
  assert.ok(congested > rested, 'physiology does distend it');
  vessels.setPresentationEmphasis(0);
  assert.equal(vessels.atriumDistension, congested, 'and dropping emphasis does not shrink it');
});

test('the atrial pressure sheath tracks the atrium it labels', () => {
  const vessels = new Vessels();
  const overlay = new CongestionOverlay(24);
  const show = (congestionLevel, reveal) => {
    vessels.setCongestionLevel(congestionLevel);
    overlay.setCongestion(
      {
        pressureFront: congestionLevel,
        interstitialFluid: 0,
        atriumDistension: vessels.atriumDistension,
      },
      { front: reveal, fluid: reveal }
    );
    return overlay.atriumSheath.scale.x / vessels.atriumDistension;
  };

  // The failure this replaces: the sheath was sized from the story's reveal
  // fraction while the atrium was sized from congestion, so on a partly
  // revealed beat it lagged and vanished inside an opaque chamber.
  for (const reveal of [0.2, 0.35, 1]) {
    for (const level of [0.3, 0.9, 1]) {
      const ratio = show(level, reveal);
      assert.equal(
        ratio,
        1,
        `sheath must scale exactly with the atrium (level ${level}, reveal ${reveal})`
      );
    }
  }
});

test('story reveal fades the pressure field without moving anything', () => {
  const overlay = new CongestionOverlay(24);
  const physiology = { pressureFront: 1, interstitialFluid: 1, atriumDistension: 1.22 };
  overlay.setCongestion(physiology, { front: 1, fluid: 1 });
  const full = overlay.pressureMaterial.uniforms.uPressure.value;
  const size = overlay.atriumSheath.scale.x;

  overlay.setCongestion(physiology, { front: 0.3, fluid: 0.3 });
  assert.ok(overlay.pressureMaterial.uniforms.uPressure.value < full, 'reveal fades the field');
  assert.equal(overlay.atriumSheath.scale.x, size, 'reveal does not resize the chamber');
});

test('story chapter labels are anchored so they cannot overlap', () => {
  // The anchoring rule lives in StoryMode and is data-driven, so it is checked
  // here against the real chapter times rather than against a rendered page:
  // the opening chapter is pinned to the left edge and cannot move, so any
  // chapter close behind it must be pinned the same way instead of centred.
  const span = STORY_CHAPTERS[STORY_CHAPTERS.length - 1].at - STORY_CHAPTERS[0].at;
  assert.ok(span > 0, 'chapters span some time');
  for (let i = 1; i < STORY_CHAPTERS.length - 1; i++) {
    const gap = (STORY_CHAPTERS[i].at - STORY_CHAPTERS[i - 1].at) / span;
    if (gap >= 0.2) continue;
    // A crowded pair: both must be left-anchored, which the anchor rule does.
    assert.ok(i === 1, `unexpected crowded chapter pair at ${i}; the anchor rule only covers the opening pair`);
  }
});

test('every chapter carries a name in both languages', () => {
  for (const chapter of STORY_CHAPTERS) {
    assert.ok(chapter.id, 'a chapter needs a stable id for its data-chapter attribute');
    assert.ok(chapter.label, `${chapter.id} needs an English name`);
    assert.ok(chapter.labelJa, `${chapter.id} needs a Japanese name`);
    assert.ok(chapter.labelJaShort, `${chapter.id} needs a short Japanese name for narrow frames`);
  }
});
