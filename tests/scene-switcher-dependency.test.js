import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const ENTRY = resolve(SRC, 'components/SceneSwitcher.js');

const MUST_STAY_OUT = new Set([
  'data/patientGuides.js',
  'data/educationGuides.js',
  'data/copdTeaching.js',
  'data/asthmaTeaching.js',
]);

function staticImports(file) {
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const imports = [];
  const pattern = /(?:^|[\s;}])(?:import|export)\s(?:[^'"();]*?\sfrom\s)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) imports.push(match[1]);
  return imports;
}

function graphFrom(entry) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const specifier of staticImports(file)) {
      if (!specifier.startsWith('.')) continue;
      const target = resolve(dirname(file), specifier);
      if (!target.endsWith('.js') || !existsSync(target)) continue;
      walk(target);
    }
  };
  walk(entry);
  return new Set([...seen].map((file) => relative(SRC, file).split(/[\\/]/).join('/')));
}

test('scene navigator does not pull authored guide payloads into model start-up', () => {
  const graph = graphFrom(ENTRY);
  const leaked = [...MUST_STAY_OUT].filter((module) => graph.has(module));
  assert.deepEqual(
    leaked,
    [],
    `SceneSwitcher must decide visible uses from lightweight catalogue/review metadata, not guide bodies: ${leaked.join(', ')}`
  );
  assert.ok(graph.has('access/sceneUses.js'), 'navigator uses the lightweight use gate');
  assert.equal(graph.has('access/features.js'), false, 'navigator must not import the guide-owning feature module');
});
