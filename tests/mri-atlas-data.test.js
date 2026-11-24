import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ANATOMY_ATLAS_LINKS,
  MODEL_SCOPE,
  MRI_ATLAS_COPY,
  MRI_GROUPS,
  MRI_STRUCTURE_ENTRIES,
  describeStructures,
  mriStructureColour,
} from '../src/data/mriAtlas.js';
import { FUNCTION_THEMES } from '../src/data/brainFunctionThemes.js';
import { FUNCTION_TASKS } from '../src/models/higherBrainFunction.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const atlas = JSON.parse(read('public/assets/mri/atlas.json').toString('utf8'));
const structures = describeStructures(atlas.structures);

test('mri data: every structure in the asset has a name here, and nothing here names one it lacks', () => {
  const inAsset = new Set(atlas.structures.map((structure) => structure.name));
  assert.deepEqual([...inAsset].filter((name) => !MRI_STRUCTURE_ENTRIES[name]), [], 'in the asset, unnamed here');
  assert.deepEqual(Object.keys(MRI_STRUCTURE_ENTRIES).filter((name) => !inAsset.has(name)), [], 'named here, not in the asset');
  assert.equal(structures.length, 102);
  assert.equal(new Set(structures.map((structure) => structure.id)).size, 102, 'ids are unique, so a link names one structure');
  for (const structure of structures) {
    assert.match(structure.id, /^[a-z0-9-]+-[lr]$/);
    assert.ok(structure.nameJa && /[぀-ヿ一-鿿]/.test(structure.nameJa), `${structure.name} has no Japanese name`);
    assert.ok(MRI_GROUPS.some((group) => group.id === structure.group));
    assert.ok(structure.fullNameJa.startsWith(structure.hemi === 'L' ? '左' : '右') || structure.midline, structure.fullNameJa);
  }
});

test('mri data: a midline structure the atlas splits is named as a half, not as a paired organ', () => {
  const half = structures.find((structure) => structure.id === 'third-ventricle-l');
  assert.equal(half.fullNameJa, '第三脳室（左半分）');
  assert.equal(half.fullNameEn, 'Third Ventricle (left half)');
  assert.equal(structures.find((structure) => structure.id === 'hippocampus-r').fullNameJa, '右 海馬');
  // There is no left or right chiasm: the parcel the atlas divides is named as a half.
  const chiasm = structures.find((structure) => structure.id === 'optic-chiasm-l');
  assert.equal(chiasm.midline, true);
  assert.doesNotMatch(chiasm.fullNameJa, /^左 /);
  assert.match(chiasm.note.ja, /視神経/);
});

test('mri data: left and right share a colour, neighbours do not, and no structure is brand pink', () => {
  const hue = (hex) => {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return null;
    const d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const seen = new Map();
  for (const structure of structures) {
    assert.equal(structure.colour, mriStructureColour(structure.name));
    const other = seen.get(structure.colour);
    assert.ok(!other || other === structure.name, `${structure.name} and ${other} share ${structure.colour}`);
    seen.set(structure.colour, structure.name);
    // Brand pink is #E879A6, hue ≈ 336°. Pink on this screen is the selection.
    const h = hue(structure.colour);
    assert.ok(h === null || h < 300 || h > 352, `${structure.name} is drawn in a pink (${structure.colour}, hue ${h?.toFixed(0)})`);
  }
});

test('mri data: every link to the anatomy atlas names a structure that atlas really has, on that side', () => {
  const glb = read('public/assets/brain/brain.glb');
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const byId = new Map(json.nodes.filter((node) => node.extras?.bx_id != null).map((node) => [node.extras.bx_id, node.extras]));
  const bases = new Set(structures.map((structure) => structure.baseId));
  for (const [baseId, link] of Object.entries(ANATOMY_ATLAS_LINKS)) {
    assert.ok(bases.has(baseId), `${baseId} is not an MRI structure`);
    for (const [hemi, side] of [['L', 'left'], ['R', 'right']]) {
      const extras = byId.get(link[hemi]);
      assert.ok(extras, `${baseId}: the anatomy atlas has no structure ${link[hemi]}`);
      assert.equal(extras.bx_label, link.atlasLabel, `${baseId} ${hemi}`);
      assert.equal(extras.bx_side, side, `${baseId} ${hemi} points at the ${extras.bx_side} side`);
    }
    // One whole structure on each side — not one nucleus of several.
    const sameLabel = [...byId.values()].filter((extras) => extras.bx_label === link.atlasLabel);
    assert.equal(new Set(sameLabel.map((extras) => extras.bx_id)).size, 2, `${link.atlasLabel} is not exactly one structure per side`);
  }
  assert.match(MRI_ATLAS_COPY.linkByName.ja, /名称による対応/);
});

test('mri data: the scope says what it is — a standard brain, anatomy only, not for diagnosis', () => {
  const text = JSON.stringify([MODEL_SCOPE, MRI_ATLAS_COPY]);
  assert.match(text, /152/);
  assert.match(text, /診断/);
  assert.match(text, /機能の局在は示しません/);
  assert.match(text, /白質には名前を付けていません/);
  assert.match(text, /基準値ではありません/);
  for (const list of [MODEL_SCOPE.answers, MODEL_SCOPE.excludes, MODEL_SCOPE.cautions, MODEL_SCOPE.sources]) {
    for (const item of list) assert.ok(item.text && item.textJa);
  }
});

test('function themes: questions only — and every task id is one the model has', () => {
  const tasks = new Set(FUNCTION_TASKS.map((task) => task.id));
  // Names of structures and syndromes the themes must not assert while the
  // model that would justify them is unpublished.
  const CLAIMS = /Broca|Wernicke|ブローカ|ウェルニッケ|前頭|側頭|頭頂|後頭|帯状|海馬|扁桃|視床|基底核|線条体|小脳|脳幹|脳梁|脳弓|弓状束|皮質|[^小]葉|脳回|[上中下]..回|束|野|hippocamp|amygdal|thalam|striat|callos|fornix|fascicul|arcuate|angular|gyrus|cortex|cortical|lobe|frontal|parietal|temporal|occipital|cingul|cerebell/i;
  for (const theme of FUNCTION_THEMES) {
    for (const id of theme.tasks) assert.ok(tasks.has(id), `${theme.id}: the model has no task "${id}"`);
    for (const copy of [theme.questionEn, theme.questionJa]) {
      assert.doesNotMatch(copy, CLAIMS, `${theme.id} states which structure does what`);
    }
    assert.match(theme.questionJa, /か。$/, `${theme.id} is not phrased as a question`);
    assert.match(theme.questionEn, /\?$/, `${theme.id} is not phrased as a question in English`);
  }
  assert.deepEqual(FUNCTION_THEMES.filter((theme) => theme.priority).map((theme) => theme.id), ['language', 'memory', 'attention', 'executive']);
});
