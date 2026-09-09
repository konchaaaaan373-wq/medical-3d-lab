#!/usr/bin/env node
/**
 * Run the Khronos glTF Validator over the candidate assets.
 *
 *   npm i --no-save gltf-validator
 *   npm run assets:dev
 *   node scripts/validate-candidate-gltf.mjs
 *
 * The validator is deliberately not a dependency: `npm test` stays a plain
 * `node --test` run, and these files are candidates that are not committed.
 * The output belongs in docs/asset-qa/measurements/gltf-validator.txt.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import validator from 'gltf-validator';

for (const path of ['dev-assets/heart/VH_M_Heart.glb', 'dev-assets/heart/VH_M_Blood_Vasculature.glb']) {
  const bytes = await readFile(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const report = await validator.validateBytes(new Uint8Array(bytes), {
    uri: path,
    externalResourceFunction: () => Promise.reject(new Error('no external resources are expected')),
  });
  const i = report.issues;
  console.log(JSON.stringify({
    path,
    sha256,
    validatorVersion: report.validatorVersion,
    validatedAt: report.validatedAt,
    errors: i.numErrors,
    warnings: i.numWarnings,
    infos: i.numInfos,
    hints: i.numHints,
    byCode: i.messages.reduce((all, m) => { all[m.code] = (all[m.code] ?? 0) + 1; return all; }, {}),
    byMesh: Object.entries(i.messages.filter((m) => m.code === 'ACCESSOR_VECTOR3_NON_UNIT').reduce((all, m) => {
      const mesh = (m.pointer ?? '').match(/\/meshes\/(\d+)\//)?.[1];
      if (mesh != null) all[mesh] = (all[mesh] ?? 0) + 1;
      return all;
    }, {})).sort((a, b) => b[1] - a[1]),
    meshNames: null,
    generator: report.info?.generator,
    extensionsUsed: report.info?.extensionsUsed ?? [],
    drawCallCount: report.info?.drawCallCount,
    totalTriangleCount: report.info?.totalTriangleCount,
    totalVertexCount: report.info?.totalVertexCount,
    maxUVTileCount: report.info?.maxUVTileCount,
  }, null, 1));
}
