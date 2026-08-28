import test from 'node:test';
import assert from 'node:assert/strict';
import { Object3D, Vector3 } from 'three';
import { SCENES } from '../src/catalog/index.js';
import { PROTOTYPE_DISCLAIMER } from '../src/scenes/shared/prototypeMeta.js';

/**
 * Every prototype scene, built head-less and driven through its whole
 * progression.
 *
 * The scenes are constructed for real here — geometry, materials, particle
 * buffers — which is why a broken import, a missing label anchor or a division
 * that produces NaN fails the build rather than showing up as an invisible
 * organ in the browser. Only the renderer is absent, and nothing a scene does
 * at build time is allowed to need one.
 */
const PROTOTYPES = SCENES.filter((scene) => scene.status === 'prototype');

/** A viewer stub: prototype scenes must not reach for the renderer. */
const viewer = {
  onResize: () => () => {},
  onFrame: () => () => {},
};

/** Walks every number a scene has put into the graph. */
function everythingFinite(root) {
  const problems = [];
  root.traverse((object) => {
    for (const [name, vector] of [
      ['position', object.position],
      ['scale', object.scale],
    ]) {
      if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
        problems.push(`${object.name || object.type}.${name} is not finite`);
      }
    }
    if (object.scale.x === 0 || object.scale.y === 0 || object.scale.z === 0) {
      problems.push(`${object.name || object.type} has a zero scale`);
    }
    const geometry = object.geometry;
    if (geometry) {
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        for (let i = 0; i < attribute.array.length; i++) {
          if (!Number.isFinite(attribute.array[i])) {
            problems.push(`${object.name || object.type}.geometry.${name}[${i}] is not finite`);
            break;
          }
        }
      }
    }
    for (const material of object.material ? [object.material].flat() : []) {
      if (!Number.isFinite(material.opacity) || material.opacity < 0 || material.opacity > 1) {
        problems.push(`${object.name || object.type} material opacity is ${material.opacity}`);
      }
      for (const [name, uniform] of Object.entries(material.uniforms ?? {})) {
        if (typeof uniform.value === 'number' && !Number.isFinite(uniform.value)) {
          problems.push(`${object.name || object.type} uniform ${name} is not finite`);
        }
      }
    }
  });
  return problems;
}

test('there are prototype scenes to check', () => {
  assert.ok(PROTOTYPES.length >= 10, `expected the body to be covered, found ${PROTOTYPES.length} prototypes`);
});

for (const entry of PROTOTYPES) {
  test(`${entry.id}: loads, builds, animates and disposes`, async () => {
    const module = await entry.load();
    const SceneClass = module.default;
    assert.equal(typeof SceneClass, 'function', 'the module default-exports a scene class');

    const meta = SceneClass.meta;
    assert.equal(meta.id, entry.id, 'the scene and the catalogue agree on the id');
    assert.equal(meta.status, entry.status, 'and on how far it has been taken');

    assert.ok(SceneClass.cameraPose.position instanceof Vector3);
    assert.ok(SceneClass.cameraPose.target instanceof Vector3);
    assert.ok(
      SceneClass.cameraPose.position.distanceTo(SceneClass.cameraPose.target) > 0.5,
      'the camera is not inside the subject'
    );

    const scene = new SceneClass({ viewer });
    const root = scene.build();
    assert.ok(root instanceof Object3D, 'build() returns something the app can add');
    assert.ok(root.children.length > 0, 'and it contains something');

    // The whole progression, not just the ends: a wave function or a division
    // that misbehaves in the middle is exactly what this is here to catch.
    for (let step = 0; step <= 20; step++) {
      const value = step / 20;
      scene.setProgress(value);
      scene.update(1 / 60, step * 0.37);
      const problems = everythingFinite(root);
      assert.deepEqual(problems, [], `at progress ${value.toFixed(2)}: ${problems.join('; ')}`);
    }

    // Out-of-range input is the app's job to prevent, but a scene must not
    // produce NaN if it ever arrives.
    for (const value of [-1, 2]) {
      scene.setProgress(value);
      scene.update(1 / 60, 1);
      assert.deepEqual(everythingFinite(root), [], `progress ${value} is clamped, not propagated`);
    }

    scene.dispose();
  });

  test(`${entry.id}: labels are anchored to the model, not typed twice`, async () => {
    const SceneClass = (await entry.load()).default;
    const scene = new SceneClass({ viewer });
    scene.build();

    const warnings = [];
    const original = console.warn;
    console.warn = (message) => warnings.push(message);
    let annotations;
    try {
      annotations = scene.getAnnotations();
    } finally {
      console.warn = original;
    }

    assert.deepEqual(warnings, [], 'every annotation found its anchor');
    assert.ok(annotations.length > 0, 'the scene labels something');
    for (const annotation of annotations) {
      assert.ok(annotation.position instanceof Vector3, `${annotation.id} has a 3D position`);
      assert.ok(
        Number.isFinite(annotation.position.x) &&
          Number.isFinite(annotation.position.y) &&
          Number.isFinite(annotation.position.z),
        `${annotation.id} is somewhere real`
      );
      assert.ok(annotation.text && annotation.sub, `${annotation.id} is named in both languages`);
      const [from, to] = annotation.range;
      assert.ok(from >= 0 && to <= 1 && from < to, `${annotation.id} has a sane visibility window`);
    }
    scene.dispose();
  });

  test(`${entry.id}: the copy the UI reads is complete`, async () => {
    const meta = (await entry.load()).default.meta;

    assert.ok(meta.title && meta.titleJa, 'titled in both languages');
    assert.ok(meta.subtitle && meta.subtitleJa, 'subtitled in both languages');
    assert.ok(meta.progressLabel?.label && meta.progressLabel?.labelJa, 'the slider says what it moves along');
    assert.ok(meta.range?.start && meta.range?.end, 'and what its ends mean');

    assert.ok(meta.stages.length >= 2, 'a scene with one stage has nothing to step through');
    assert.equal(meta.stages[0].at, 0, 'the first stage starts at the beginning');
    for (let i = 1; i < meta.stages.length; i++) {
      assert.ok(meta.stages[i].at > meta.stages[i - 1].at, 'stages are in order');
      assert.ok(meta.stages[i].at < 1, 'and all of them are reachable');
    }
    for (const stage of meta.stages) {
      assert.ok(stage.id && stage.name && stage.nameJa, `${stage.id} is named in both languages`);
      assert.ok(stage.summary && stage.summaryJa, `${stage.id} is explained in both languages`);
    }

    assert.ok(meta.legend.length > 0, 'the colours are explained');
    for (const item of meta.legend) {
      assert.ok(meta.palette[item.key], `legend entry "${item.key}" has a colour in the palette`);
      assert.ok(item.label && item.labelJa, `legend entry "${item.key}" is named in both languages`);
    }

    // A prototype must say so where the viewer reads, in both languages.
    assert.match(meta.disclaimer, /PROTOTYPE/);
    assert.equal(meta.disclaimer, PROTOTYPE_DISCLAIMER.en);
    assert.equal(meta.disclaimerJa, PROTOTYPE_DISCLAIMER.ja);
    assert.ok(meta.disclaimerShort && meta.disclaimerShortJa);
  });
}

test('two prototype scenes never share a palette object or a stage array', async () => {
  // Copy modules are plain objects; two scenes importing the same one would
  // make an edit to one silently change the other.
  const seen = new Map();
  for (const entry of PROTOTYPES) {
    const meta = (await entry.load()).default.meta;
    for (const [name, value] of [
      ['palette', meta.palette],
      ['stages', meta.stages],
      ['legend', meta.legend],
    ]) {
      const key = `${name}:${seen.has(value) ? seen.get(value) : entry.id}`;
      assert.ok(!seen.has(value), `${entry.id} shares its ${name} with ${seen.get(value)} (${key})`);
      seen.set(value, entry.id);
    }
  }
});
