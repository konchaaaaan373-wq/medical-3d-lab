import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_ID,
  backgroundPresetById,
  standardInspectionViews,
} from '../src/app/inspection.js';
import { createInspectionPanel } from '../src/components/InspectionPanel.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

test('inspection backgrounds are a small calibrated set with a safe fallback', () => {
  assert.deepEqual(BACKGROUND_PRESETS.map(({ id }) => id), ['graphite', 'studio', 'paper']);
  assert.equal(DEFAULT_BACKGROUND_ID, 'graphite');
  assert.equal(backgroundPresetById('studio').tone, 'light');
  assert.equal(backgroundPresetById('not-a-preset').id, DEFAULT_BACKGROUND_ID);

  for (const preset of BACKGROUND_PRESETS) {
    assert.match(preset.swatch, /^#[0-9a-f]{6}$/i);
    assert.ok(preset.fogDensity >= 0);
    assert.ok(preset.environmentIntensity > 0);
    assert.ok(preset.exposure > 0);
    assert.ok(preset.bloomStrength >= 0);
    assert.ok(preset.backdrop.halo >= 0);
  }
});

test('generated views are reproducible camera moves, not invented anatomy', () => {
  const pose = {
    position: new THREE.Vector3(8, 4, 12),
    target: new THREE.Vector3(1, -0.5, 2),
  };
  const views = standardInspectionViews(pose);
  const distance = pose.position.distanceTo(pose.target);

  assert.deepEqual(
    views.map(({ id }) => id),
    ['home', 'turn-left', 'turn-right', 'opposite', 'above', 'below']
  );
  assert.equal(new Set(views.map(({ id }) => id)).size, views.length);
  assert.ok(views[0].position.equals(pose.position));
  assert.ok(views[0].target.equals(pose.target));
  for (const view of views) {
    assert.equal(view.kind, 'model-relative');
    assert.ok(view.target.equals(pose.target));
    assert.ok(Math.abs(view.position.distanceTo(view.target) - distance) < 1e-10);
    assert.ok(view.position.toArray().every(Number.isFinite));
  }

  const home = views[0].position.clone().sub(pose.target).setY(0).normalize();
  const turnLeft = views[1].position.clone().sub(pose.target).setY(0).normalize();
  const opposite = views[3].position.clone().sub(pose.target).setY(0).normalize();
  assert.ok(home.dot(turnLeft) > 0.5, 'generic turn stays oblique so shallow causal models remain legible');
  assert.ok(home.dot(turnLeft) < 0.9, 'generic turn still reveals meaningful depth');
  assert.ok(home.dot(opposite) < -0.999, 'opposite really crosses the target');
  assert.ok(views[4].position.y > pose.target.y);
  assert.ok(views[5].position.y < pose.target.y);
});

test('the panel exposes view, background, labels and reset as display-only callbacks', () => {
  const restoreDocument = installFakeDocument();
  try {
    const calls = [];
    const views = standardInspectionViews({
      position: new THREE.Vector3(0, 1, 10),
      target: new THREE.Vector3(),
    });
    const panel = createInspectionPanel({
      views,
      activeView: 'home',
      activeBackground: 'graphite',
      labelsVisible: true,
      onView: (id) => calls.push(['view', id]),
      onBackground: (id) => calls.push(['background', id]),
      onLabels: (enabled) => calls.push(['labels', enabled]),
      onReset: () => calls.push(['reset']),
    });

    assert.equal(panel.element.hidden, true, 'advanced controls stay closed by default');
    panel.setOpen(true);
    assert.equal(panel.element.hidden, false);
    findByClass(panel.element, 'inspection-view')[1].click();
    findByClass(panel.element, 'inspection-background')[2].click();
    findByClass(panel.element, 'inspection-label-toggle')[0].click();
    findByClass(panel.element, 'inspection-reset')[0].click();

    assert.deepEqual(calls, [
      ['view', 'turn-left'],
      ['background', 'paper'],
      ['labels', false],
      ['reset'],
    ]);
  } finally {
    restoreDocument();
  }
});

test('the app mounts inspection for every scene without a path into medical setters', () => {
  const source = readFileSync(new URL('../src/app/App.js', import.meta.url), 'utf8');
  assert.match(source, /inspectionPanel = createInspectionPanel\(\{/);
  assert.match(source, /onInspectionToggle: \(enabled\) => setInspectionOpen\(enabled\)/);

  const start = source.indexOf('function inspectionPoseFor');
  const end = source.indexOf('function resetMedicalState', start);
  const inspectionCallbacks = source.slice(start, end);
  assert.doesNotMatch(inspectionCallbacks, /setProgress|setModelControl|playback\./);
  assert.match(inspectionCallbacks, /viewer\.setBackgroundPreset/);
  assert.match(inspectionCallbacks, /labels\.element\.hidden/);

  const controls = source.slice(source.indexOf('const controlPanel = createControlPanel'), source.indexOf('// One switch'));
  assert.match(controls, /onReset: resetMedicalState,\s*onResetView: resetView/);
});

test('the viewer changes the complete rendering calibration for a background', () => {
  const source = readFileSync(new URL('../src/app/Viewer.js', import.meta.url), 'utf8');
  const method = source.slice(source.indexOf('setBackgroundPreset(id)'), source.indexOf('snapshot(size)'));
  for (const property of [
    'uTop', 'uBottom', 'uAccent', 'uHalo', 'fog.density',
    'environmentIntensity', 'toneMappingExposure', 'bloomPass.strength',
  ]) {
    assert.ok(method.includes(property), `${property} is part of the preset calibration`);
  }
});

test('fixed dark instruments retain their own contrast on pale renderer backgrounds', () => {
  const navigation = readFileSync(new URL('../src/styles/navigation.css', import.meta.url), 'utf8');
  const controls = readFileSync(new URL('../src/styles/ui.css', import.meta.url), 'utf8');
  const navigationTokens = navigation.slice(
    navigation.indexOf('.global-scene-nav {'),
    navigation.indexOf('.global-nav-brand,')
  );
  const tactileTokens = controls.slice(
    controls.indexOf('.model-controls.is-tactile {'),
    controls.indexOf('.model-controls.is-tactile .model-controls-title')
  );
  for (const block of [navigationTokens, tactileTokens]) {
    assert.match(block, /--ink:\s*#eaf2ff/);
    assert.match(block, /--ink-dim:\s*#a7b6ce/);
    assert.match(block, /--accent:\s*#38e1ef/);
  }
});
