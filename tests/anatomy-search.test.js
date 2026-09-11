import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATCH_RANK,
  buildSearchIndex,
  normalizeSearchText,
  searchStructures,
} from '../src/app/anatomySearch.js';

/**
 * A slice of the shape the scene's inventory has: paired structures with
 * separate ids, a midline one, and a hierarchy whose upper levels are names a
 * reader might well type.
 */
const INVENTORY = [
  {
    id: 212, name: 'Middle temporal gyrus', atlasName: 'Middle temporal gyrus', nameJa: '中側頭回',
    side: 'Left', sideJa: '左',
    hierarchy: ['Left cerebral hemisphere', 'Temporal lobe', 'Cerebral gyri'],
    hierarchyJa: ['左大脳半球', '側頭葉', '大脳回'],
  },
  {
    id: 213, name: 'Middle temporal gyrus', atlasName: 'Middle temporal gyrus', nameJa: '中側頭回',
    side: 'Right', sideJa: '右',
    hierarchy: ['Right cerebral hemisphere', 'Temporal lobe', 'Cerebral gyri'],
    hierarchyJa: ['右大脳半球', '側頭葉', '大脳回'],
  },
  {
    id: 122, name: 'Hippocampus', atlasName: 'Hippocampus', nameJa: '海馬',
    side: 'Left', sideJa: '左',
    hierarchy: ['Left cerebral hemisphere', 'Limbic lobe', 'Hippocampal formation'],
    hierarchyJa: ['左大脳半球', '辺縁葉', '海馬体'],
  },
  {
    id: 74, name: 'Corpus callosum', atlasName: 'Corpus callosum', nameJa: '脳梁',
    side: 'Midline', sideJa: '正中',
    hierarchy: ['Telencephalon', 'White matter', 'Commissural fibres'],
    hierarchyJa: ['終脳', '白質', '交連線維'],
  },
  {
    id: 208, name: 'Middle frontal gyrus', atlasName: 'Middle frontal gyrus', nameJa: '中前頭回',
    side: 'Left', sideJa: '左',
    hierarchy: ['Left cerebral hemisphere', 'Frontal lobe', 'Cerebral gyri'],
    hierarchyJa: ['左大脳半球', '前頭葉', '大脳回'],
  },
];
const INDEX = buildSearchIndex(INVENTORY);
const idsFor = (query) => searchStructures(INDEX, query).map((hit) => hit.id);

test('anatomy search: the same structure is found in either language and either width', () => {
  // English, Japanese, and the full-width Latin an IME produces, all reaching
  // the same pair of structures.
  for (const query of ['Middle temporal gyrus', '中側頭回', 'Ｍｉｄｄｌｅ ｔｅｍｐｏｒａｌ ｇｙｒｕｓ', '  middle TEMPORAL gyrus ']) {
    assert.deepEqual(idsFor(query), [212, 213], `"${query}" finds both middle temporal gyri`);
  }
});

test('anatomy search: left and right stay two results, never collapsed onto one', () => {
  const hits = searchStructures(INDEX, '中側頭回');
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((hit) => hit.structure.sideJa).sort(), ['右', '左']);
  // Each carries its own id, so choosing one is choosing a side rather than
  // whichever the sort happened to put first.
  assert.notEqual(hits[0].id, hits[1].id);
});

test('anatomy search: a whole name outranks a name it merely appears inside', () => {
  const hits = searchStructures(INDEX, 'hippocampus');
  assert.equal(hits[0].id, 122);
  assert.equal(hits[0].rank, MATCH_RANK.EXACT);
  // "Hippocampal formation" is a level above, so it matches at the weakest rank
  // and cannot come first.
  const byFamily = searchStructures(INDEX, 'hippocampal');
  assert.equal(byFamily[0].rank, MATCH_RANK.ANCESTOR);
  assert.equal(byFamily[0].id, 122);
});

test('anatomy search: a name from the hierarchy finds what is under it', () => {
  // 側頭葉 is not a selectable structure. Typing it finds the structures inside
  // it, at the rank that says so — the lobe does not become a result itself.
  const hits = searchStructures(INDEX, '側頭葉');
  assert.deepEqual(hits.map((hit) => hit.id), [212, 213]);
  assert.ok(hits.every((hit) => hit.rank === MATCH_RANK.ANCESTOR));
});

test('anatomy search: a prefix beats a substring, and the order never wobbles', () => {
  const hits = searchStructures(INDEX, 'middle');
  assert.ok(hits.every((hit) => hit.rank === MATCH_RANK.PREFIX));
  // Two runs of the same query give the same order, ties included.
  assert.deepEqual(hits.map((hit) => hit.id), searchStructures(INDEX, 'middle').map((hit) => hit.id));
  assert.deepEqual(hits.map((hit) => hit.structure.name), [
    'Middle frontal gyrus', 'Middle temporal gyrus', 'Middle temporal gyrus',
  ]);

  const inside = searchStructures(INDEX, 'gyrus');
  assert.ok(inside.every((hit) => hit.rank === MATCH_RANK.CONTAINS));
});

test('anatomy search: no query is not the same answer as no match', () => {
  // An empty box returning the whole atlas is a list that looks like a result.
  for (const query of ['', '   ', null, undefined]) {
    assert.deepEqual(searchStructures(INDEX, query), []);
  }
  assert.deepEqual(searchStructures(INDEX, 'ventricle of the moon'), []);
});

test('anatomy search: ids are carried through, never normalised', () => {
  const index = buildSearchIndex([
    { id: 'ID-Left_01', name: 'Insula', nameJa: '島', hierarchy: [], hierarchyJa: [] },
  ]);
  assert.equal(searchStructures(index, 'insula')[0].id, 'ID-Left_01');
  // The text is folded; the id is not.
  assert.equal(normalizeSearchText('ID-Left_01'), 'id-left_01');
});

test('anatomy search: a structure with no usable names is simply not in the index', () => {
  const index = buildSearchIndex([
    { id: 1, name: '  ', nameJa: '', hierarchy: [], hierarchyJa: [] },
    null,
    { name: 'no id here' },
  ]);
  assert.equal(index.length, 1, 'the one with an id is kept');
  assert.deepEqual(searchStructures(index, 'no id here'), []);
});

test('anatomy search: every match comes back, and the count is the number that matched', () => {
  // The atlas has 271 structures; a word from the hierarchy matches well over a
  // hundred of them. A quiet cap at sixty answers a different question than the
  // one asked, and leaves the rest with no way to be reached.
  const many = Array.from({ length: 125 }, (_, index) => ({
    id: 1000 + index,
    name: `Left structure ${index}`,
    nameJa: `左の構造${index}`,
    hierarchy: ['Left cerebral hemisphere'],
    hierarchyJa: ['左大脳半球'],
  }));
  const index = buildSearchIndex(many);
  assert.equal(searchStructures(index, 'left structure').length, 125);
  assert.equal(searchStructures(index, '左大脳半球').length, 125, 'including matches from a level above');
  // The order is still stable and still ranked.
  const hits = searchStructures(index, 'left structure 1');
  assert.ok(hits.every((hit) => hit.rank >= MATCH_RANK.PREFIX));
});
