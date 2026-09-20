import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FUNCTION_EDGES,
  FUNCTION_NODES,
  LESION_SITES,
  dominanceFor,
  resolveSide,
  solveHigherBrainFunction,
} from '../src/models/higherBrainFunction.js';
import { brainStructureInfo } from '../src/data/brainAnatomy.js';
import { STRUCTURE_NAMES_JA } from '../src/data/higherBrainFunction.js';
import { HigherBrainFunctionScene } from '../src/scenes/nervous/scenes/higherBrainFunction/HigherBrainFunctionScene.js';
import { ATLAS_CATEGORIES } from '../src/scenes/nervous/organs/brainAtlasSource.js';

/**
 * The agreement this file exists to hold: **every higher function this model
 * localises points at a structure the atlas can actually show, on the side the
 * model means.**
 *
 * Without it the model is a diagram with anatomical words in it. A node could
 * name "Broca's area", a tract could name the arcuate fasciculus, and nothing
 * in the repository would notice that the brain on screen has no such mesh to
 * light up. So the claims are read straight out of the distributed GLB — the
 * same file the scene loads — rather than from a list kept beside them.
 */
const ATLAS = (() => {
  const bytes = readFileSync(new URL('../public/assets/brain/brain.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  return gltf.nodes.filter((node) => node.extras?.bx_id != null).map((node) => node.extras);
})();

/**
 * The categories the scene actually draws, taken from the scene itself.
 *
 * Asked of the scene rather than copied, so that a structure the model names
 * and the scene has stopped drawing is a failure here rather than a mesh that
 * is silently never lit.
 */
const DRAWN = new Set([...HigherBrainFunctionScene.CONTEXT_CATEGORIES, ATLAS_CATEGORIES.TRACTS]);

function atlasMesh(label, side) {
  return ATLAS.find((extras) => extras.bx_label === label && extras.bx_side === side) ?? null;
}

/** Every structure the model names, with the side resolved for a right-hander. */
function declaredStructures() {
  const dominance = dominanceFor('right');
  const claims = [];
  for (const node of FUNCTION_NODES) {
    for (const structure of node.structures) {
      claims.push({ owner: `node ${node.id}`, label: structure.label, side: resolveSide(structure.side, dominance) });
    }
  }
  for (const edge of FUNCTION_EDGES) {
    for (const structure of edge.within) {
      claims.push({ owner: `connection ${edge.id}`, label: structure.label, side: resolveSide(structure.side, dominance) });
    }
  }
  for (const site of LESION_SITES) {
    for (const structure of site.structures) {
      claims.push({ owner: `lesion ${site.id}`, label: structure.label, side: resolveSide(structure.side, dominance) });
    }
  }
  return claims;
}

test('every structure the model names exists in the distributed atlas, on the side it means', () => {
  const claims = declaredStructures();
  assert.ok(claims.length > 50, 'the network is pinned to anatomy, not to two landmarks');
  for (const claim of claims) {
    const mesh = atlasMesh(claim.label, claim.side);
    assert.ok(mesh, `${claim.owner}: the atlas carries a ${claim.side} "${claim.label}"`);
    assert.ok(
      DRAWN.has(mesh.bx_cat),
      `${claim.owner}: ${claim.side} ${claim.label} is a structure the scene draws (${mesh.bx_cat})`
    );
  }
});

test('laterality is read from the atlas metadata, never guessed from a coordinate', () => {
  // Both sides of every paired structure the model uses must exist under the
  // atlas's own `bx_side`, so that resolving `dominant` never falls back to a
  // sign convention (architecture rule 5).
  const paired = new Set(
    declaredStructures().filter((claim) => claim.side !== 'median').map((claim) => claim.label)
  );
  for (const label of paired) {
    assert.ok(atlasMesh(label, 'left'), `${label} has a left mesh`);
    assert.ok(atlasMesh(label, 'right'), `${label} has a right mesh`);
  }
  // And the one median structure the model leans on is median in the atlas too.
  assert.equal(atlasMesh('Corpus callosum', 'median')?.bx_cat, 'white_matter');
  assert.equal(atlasMesh('Corpus callosum', 'left'), null, 'the callosum is one mesh, not a pair');
});

test('every structure the model names can be labelled in both languages', () => {
  // Two sources, because the atlas adapter names only what the anatomy scene
  // can select, and the tract meshes were never among them. A structure named
  // by neither would reach a Japanese reader as an English string.
  for (const claim of declaredStructures()) {
    const mesh = atlasMesh(claim.label, claim.side);
    const fromScene = STRUCTURE_NAMES_JA[claim.label];
    const fromAtlas = brainStructureInfo({ ...mesh, bx_label: claim.label, bx_side: claim.side })?.nameJa;
    const named = fromScene ?? (fromAtlas && !fromAtlas.includes(claim.label) ? fromAtlas : null);
    assert.ok(named, `${claim.owner}: ${claim.label} has a Japanese name`);
    assert.notEqual(named, claim.label, `${claim.label} is translated, not echoed`);
    assert.equal(
      HigherBrainFunctionScene.structureNameJa(claim.label, claim.side), named,
      `${claim.label}: the scene resolves the same name the registry holds`
    );
  }
});

test('a solved lesion hands the view atlas meshes it can find, with a side', () => {
  const state = solveHigherBrainFunction({ lesions: [LESION_SITES[0]] });
  assert.ok(state.affectedStructures.length > 0);
  for (const structure of state.affectedStructures) {
    assert.ok(atlasMesh(structure.label, structure.side), `${structure.side} ${structure.label} is in the atlas`);
    assert.ok(structure.damage > 0 && structure.damage <= 1);
  }
  // Solved nodes carry resolved sides too — a view must never have to resolve
  // `dominant` a second time and risk disagreeing with the model.
  for (const node of state.nodes) {
    for (const structure of node.structures) {
      assert.ok(['left', 'right', 'median'].includes(structure.side), `${node.id} resolved its sides`);
      assert.ok(atlasMesh(structure.label, structure.side));
    }
  }
  for (const edge of state.edges) {
    for (const structure of edge.within) {
      assert.ok(atlasMesh(structure.label, structure.side), `${edge.id} is anchored in a mesh that exists`);
    }
  }
});

test('a connection points at the real tract where the atlas has one', () => {
  // The distributed atlas carries fifty-four tract meshes that no scene in this
  // repository had ever drawn. Anchoring the dorsal language route in "the
  // white matter that contains the arcuate fasciculus" while the arcuate itself
  // is in the file would be approximating something we already have.
  const tracts = ATLAS.filter((extras) => extras.bx_cat === 'tracts');
  assert.ok(tracts.length >= 50, 'the atlas still carries its tract meshes');

  const named = new Map(FUNCTION_EDGES.map((edge) => [edge.id, edge.within.map((w) => w.label)]));
  assert.deepEqual(named.get('dorsal-phonological'), ['Arcuate fasciculus']);
  assert.deepEqual(named.get('initiation-to-output'), ['Frontal aslant tract']);
  assert.deepEqual(named.get('semantic-to-initiation'), ['Inferior fronto-occipital fasciculus']);
  assert.deepEqual(named.get('dlpfc-to-striatum'), ['Corticostriatal tract (anterior)', 'Corticostriatal tract (anterior)']);
  assert.deepEqual(named.get('thalamus-to-dlpfc'), ['Anterior thalamic radiation', 'Anterior thalamic radiation']);
  assert.deepEqual(named.get('praxis-to-premotor'), ['Superior longitudinal fasciculus III']);

  // And the ones anchored in bulk white matter are only the ones the atlas
  // genuinely has no bundle for: short association fibres, and the crossings
  // through a corpus callosum the atlas does not divide into splenium, body and
  // genu. Re-anchoring a named tract back to bulk white matter fails here.
  const bulk = FUNCTION_EDGES
    .filter((edge) => edge.within.some((w) => w.label === 'White matter of telencephalon'))
    .map((edge) => edge.id)
    .sort();
  assert.deepEqual(bulk, [
    // Short association fibres between neighbouring cortex, and the fibres
    // between the deep grey structures of the frontal--subcortical circuits.
    // The atlas draws neither as a bundle of its own.
    'auditory-to-phonological',
    'dorsal-striatum-to-pallidum',
    'form-to-integration',
    'output-to-motor',
    'pallidum-to-thalamus',
    'premotor-to-hand-dominant',
    'premotor-to-hand-nondominant',
    'ventral-striatum-to-pallidum',
  ]);

  const labels = new Set(ATLAS.map((extras) => extras.bx_label));
  for (const missing of ['Splenium of corpus callosum', 'Body of corpus callosum', 'Genu of corpus callosum']) {
    assert.equal(labels.has(missing), false, `${missing} is not in the atlas`);
  }
  for (const edge of FUNCTION_EDGES.filter((candidate) => candidate.id.startsWith('callosal-'))) {
    assert.deepEqual(edge.within.map((structure) => structure.label), ['Corpus callosum']);
  }
});
