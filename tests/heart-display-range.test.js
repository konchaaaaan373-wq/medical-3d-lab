import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  createDisplayRange,
  displayRangeAlpha,
  installDisplayRange,
  setReach,
  setTrim,
} from '../src/scenes/cardiovascular/scenes/heartAnatomy/displayRange.js';

/**
 * The shader's arithmetic, evaluated on **the uniform values the renderer is
 * handed** — not on the range object the JavaScript mirror reads.
 *
 * The two are written apart and encode "off" apart: the mirror asks whether
 * `range.trim` is null, the shader asks whether `uTrimCentre.w > 0`. They
 * disagreed once, silently: the uniforms for an absent trim were
 * `new THREE.Vector4()`, whose `w` is **1**, so on the GPU every branch without
 * a trim was trimmed to a one-unit sphere round the heart — the carotids faded
 * a centimetre above the arch and the schematic segments were not drawn at
 * all — while every JavaScript measurement said they were fully drawn. This
 * reads what the GPU reads.
 */
function alphaFromUniforms(uniforms, point) {
  const smoothstep = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const from = uniforms.uReachFrom.value;
  const axis = uniforms.uReachAxis.value;
  const centre = uniforms.uTrimCentre.value;
  const half = uniforms.uTrimHalf.value;
  let alpha = 1;
  if (from.w > 0.5) {
    const along = (point.x - from.x) * axis.x + (point.y - from.y) * axis.y + (point.z - from.z) * axis.z;
    alpha *= 1 - smoothstep(axis.w - uniforms.uReachFade.value, axis.w, along);
  }
  if (centre.w > 0) {
    const q = [point.x - centre.x, point.y - centre.y, point.z - centre.z].map((d, i) =>
      Math.max(Math.abs(d) - [half.x, half.y, half.z][i], 0)
    );
    const kept = 1 - smoothstep(half.w, half.w + uniforms.uTrimFade.value, Math.hypot(...q));
    alpha *= 1 + (kept - 1) * centre.w;
  }
  return alpha;
}

/** The uniforms a material ends up with, taken the way the renderer takes them. */
function uniformsOf(range) {
  const material = new THREE.MeshStandardMaterial();
  installDisplayRange(material, range);
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>', fragmentShader: '#include <common>\n#include <alphatest_fragment>' };
  material.onBeforeCompile(shader);
  return shader.uniforms;
}

const reach = () => ({ from: new THREE.Vector3(0.2, 1.3, -0.3), axis: new THREE.Vector3(0.2, 1, 0.1), visible: 0.9, fade: 0.2 });
const trim = (strength) => ({
  centre: new THREE.Vector3(0.1, 0, 0.05),
  half: new THREE.Vector3(0.8, 0.7, 0.7),
  margin: 0.06,
  fade: 0.14,
  strength,
});

test('display range: the GPU and the mirror agree for every combination of reach and trim', () => {
  const cases = {
    'neither': createDisplayRange(),
    'reach only': (() => { const range = createDisplayRange(); setReach(range, reach()); return range; })(),
    'trim only, off': (() => { const range = createDisplayRange(); setTrim(range, trim(0)); return range; })(),
    'trim only, half way': (() => { const range = createDisplayRange(); setTrim(range, trim(0.5)); return range; })(),
    'trim only, on': (() => { const range = createDisplayRange(); setTrim(range, trim(1)); return range; })(),
    'both': (() => { const range = createDisplayRange(); setReach(range, reach()); setTrim(range, trim(1)); return range; })(),
  };
  // A deterministic spread of points, from inside the heart to well outside it.
  const points = [];
  for (let i = 0; i < 400; i += 1) {
    const t = i / 400;
    points.push(new THREE.Vector3(Math.sin(i * 1.7) * 3 * t, Math.cos(i * 0.9) * 4 * t, Math.sin(i * 2.3) * 2 * t));
  }
  for (const [name, range] of Object.entries(cases)) {
    const uniforms = uniformsOf(range);
    for (const point of points) {
      const gpu = alphaFromUniforms(uniforms, point);
      const mirror = displayRangeAlpha(range, point);
      assert.ok(Math.abs(gpu - mirror) < 1e-9, `${name}: at ${point.toArray().map((v) => v.toFixed(2))} the GPU draws ${gpu.toFixed(3)}, the mirror says ${mirror.toFixed(3)}`);
    }
  }
});

test('display range: a range with nothing in it draws everything, everywhere', () => {
  const uniforms = uniformsOf(createDisplayRange());
  for (const point of [new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, -4, 1), new THREE.Vector3(0, 9, 0)]) {
    assert.equal(alphaFromUniforms(uniforms, point), 1);
  }
});

test('display range: a change to the range reaches the uniforms without recompiling', () => {
  const range = createDisplayRange();
  setTrim(range, trim(0));
  const uniforms = uniformsOf(range);
  const far = new THREE.Vector3(0.1, 2.5, 0.05);
  assert.equal(alphaFromUniforms(uniforms, far), 1, 'untrimmed');
  range.trim.strength = 1;
  assert.equal(alphaFromUniforms(uniforms, far), 0, 'trimmed, read through the same uniforms');
});
