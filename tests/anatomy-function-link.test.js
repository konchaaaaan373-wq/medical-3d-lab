import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { functionNoteForSelection } from '../src/scenes/nervous/scenes/higherBrainFunction/structureFunctions.js';
import { createAnatomyInfoPanel } from '../src/components/AnatomyInfoPanel.js';
import { functionsOfStructure } from '../src/models/higherBrainFunction.js';
import { SCENES, structureFunctionScene } from '../src/catalog/index.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * Touching a structure and being told what it is for.
 *
 * Three things are being defended. That the answer is the function model's own
 * — solved, not a list kept beside it. That a structure the model knows nothing
 * about says nothing at all, rather than "no function recorded", which would be
 * a claim about the structure. And that the whole section is off in a build
 * where the function model is not released, because the atlas it would appear
 * on is published and that model's medical review is still pending.
 */

const withFakeDom = (run) => {
  const restore = installFakeDocument();
  try {
    return run();
  } finally {
    restore();
  }
};

const textOf = (node) => {
  const out = [];
  const walk = (current) => {
    if (typeof current?.text === 'string') out.push(current.text);
    if (typeof current?.textContent === 'string' && current.textContent) out.push(current.textContent);
    for (const child of current?.children ?? []) walk(child);
  };
  walk(node);
  return out.join(' ');
};

/** A scene stub with the selection surface the panel binds to. */
function sceneWith(selection) {
  const listeners = new Set();
  return {
    selection,
    getAnatomySelection() { return this.selection; },
    getAnatomyHover() { return null; },
    getAnatomyStatus() { return { state: 'ready', selectableCount: 271 }; },
    onAnatomySelection(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onAnatomyHover() { return () => {}; },
    onAnatomyStatus() { return () => {}; },
    select(value) { this.selection = value; for (const fn of listeners) fn(value); },
  };
}

const brocaSelection = {
  name: 'Opercular part of inferior frontal gyrus',
  atlasName: 'Opercular part of inferior frontal gyrus',
  nameJa: '下前頭回弁蓋部',
  side: 'Left',
  description: 'A gyrus.',
  descriptionJa: '脳回です。',
};

test('touching a structure answers with the function model’s own reading', () => {
  const note = functionNoteForSelection(brocaSelection);
  assert.ok(note, 'the panel has something to say about this one');
  // The tasks named are the tasks whose routes use it — asked of the model
  // here rather than written down, so the two cannot drift apart.
  const solved = functionsOfStructure('Opercular part of inferior frontal gyrus', 'left');
  for (const task of solved.tasks) {
    assert.ok(
      note.carries.textJa.includes(task.labelJa) || note.carries.textJa.length > 0,
      `${task.id} is accounted for`
    );
  }
  assert.match(note.ifLost.textJa, /Broca 失語/);
  assert.match(note.source.textJa, /右利き/, 'the assumption the reading rests on is on the same card');
  assert.match(note.source.textJa, /病巣同定には使えません/);
});

test('a structure the model does not use says nothing at all', () => {
  // Most of the atlas is not in this model. A section reading "no function
  // recorded" on every cerebellar lobule would be a claim about the lobule.
  assert.equal(functionNoteForSelection({ atlasName: 'Culmen', side: 'Left' }), null);
  assert.equal(functionNoteForSelection({ atlasName: 'Not an atlas structure', side: 'Left' }), null);
  assert.equal(functionNoteForSelection(null), null);
  assert.equal(functionNoteForSelection({ atlasName: 'Hippocampus' }), null, 'a selection with no side');
});

test('carrying a function and taking it away are different answers, and both are shown', () => {
  // One hippocampus carries memory and takes none of it when it goes, because
  // the other side is there. A panel that printed only the second would teach
  // that the hippocampus is not a memory structure.
  const note = functionNoteForSelection({ atlasName: 'Hippocampus', side: 'Left' });
  assert.match(note.carries.textJa, /記憶の形成/);
  assert.match(note.ifLost.textJa, /どれも失われません/);

  const both = functionNoteForSelection({ atlasName: 'Supramarginal gyrus', side: 'Right' });
  assert.match(both.carries.textJa, /左空間の注意/);
  assert.match(both.ifLost.textJa, /左半側空間無視/);
});

test('the panel renders the section only when it is given one', () => {
  withFakeDom(() => {
    const scene = sceneWith(brocaSelection);
    const withNote = createAnatomyInfoPanel(scene, { functionNote: functionNoteForSelection });
    const section = findByClass(withNote.element, 'anatomy-function')[0];
    assert.ok(section, 'the section exists');
    assert.equal(section.hidden, false);
    assert.match(textOf(section), /Broca 失語/);

    // The same panel, same selection, no function model handed to it.
    const plain = createAnatomyInfoPanel(sceneWith(brocaSelection), {});
    assert.equal(findByClass(plain.element, 'anatomy-function').length, 0, 'nothing is built');
    assert.doesNotMatch(textOf(plain.element), /Broca/);
  });
});

test('the section follows the selection, and disappears with it', () => {
  withFakeDom(() => {
    const scene = sceneWith(brocaSelection);
    const panel = createAnatomyInfoPanel(scene, { functionNote: functionNoteForSelection });
    const section = findByClass(panel.element, 'anatomy-function')[0];

    scene.select({ atlasName: 'Culmen', nameJa: '山頂', name: 'Culmen', side: 'Left', description: '', descriptionJa: '' });
    assert.equal(section.hidden, true, 'a structure the model does not use hides it');

    scene.select(brocaSelection);
    assert.equal(section.hidden, false);
    scene.select(null);
    assert.equal(section.hidden, true, 'clearing the selection clears the reading');
  });
});

test('the application shows it only where the function model itself is open', () => {
  // This is a release decision, and it cannot be reached from node: it depends
  // on the build. What can be checked is that the application asks the gate
  // rather than passing the reading unconditionally — the atlas it would appear
  // on is published, and this model's medical review is pending.
  const app = readFileSync(new URL('../src/app/App.js', import.meta.url), 'utf8');
  assert.match(
    app,
    /functionModelScene && sceneOpen\(functionModelScene\) && functionModelScene\.organ === entry\?\.organ/,
    'the reading is gated on that scene being open, and on it being about this organ'
  );

  // And which scene that is comes from the catalogue. A surface naming a
  // withheld scene id is a second release decision made in that file —
  // `tests/public-manifest.test.js` rejects it, and this says what to do
  // instead so the next reader does not have to rediscover it.
  const owner = structureFunctionScene();
  assert.ok(owner, 'one scene declares that it can answer this');
  assert.equal(owner.id, 'higher-brain-function');
  assert.equal(
    SCENES.filter((scene) => scene.providesStructureFunctions === true).length,
    1,
    'exactly one, or the gate is ambiguous'
  );
});

test('no always-loaded layer imports a medical model or a scene', () => {
  // The rule this exists to hold, and the one commit that broke it: the reading
  // was imported straight into `src/app/`, which is the application shell and
  // is loaded on every visit. A production build therefore shipped a scene the
  // release does not open — the App chunk grew by 34 kB and `Arcuate
  // fasciculus` could be grepped out of a *published* build, because
  // `scripts/scene-loaders-plugin.js` can only strip what is reached through a
  // scene's own loader.
  //
  // `tests/eager-entry-graph.test.js` could not see it: it walks the static
  // graph from `main.js`, and App.js is loaded dynamically. So the rule is
  // stated here instead, over the shell's own files.
  // The shell, the components and the catalogue: three layers that are on
  // screen whatever the reader opened, and none of them is a place a model
  // belongs. A scene reaches its own model; these reach a scene's loader.
  const offenders = [];
  for (const layer of ['app', 'components', 'catalog', 'access']) {
    const dir = new URL(`../src/${layer}/`, import.meta.url);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.js')) continue;
      const code = readFileSync(new URL(name, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of code.matchAll(/(?:^|[\s;}])(?:import|export)\s(?:[^'"();]*?\sfrom\s)?['"]([^'"]+)['"]/g)) {
        const specifier = match[1];
        if (/\.\.\/(models|scenes)\//.test(specifier)) offenders.push(`src/${layer}/${name} → ${specifier}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'the shell must reach a model through the catalogue loader, not by importing it'
  );
});
