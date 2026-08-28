import { statusById } from '../../catalog/taxonomy.js';

/**
 * The standing disclaimer for a prototype scene.
 *
 * A prototype is a sketch of a shape and a placeholder for a motion. The most
 * dangerous failure mode of a teaching model is being believed further than it
 * has been built, so every prototype says what it is, in both languages, in the
 * same place every other scene puts its disclaimer.
 */
export const PROTOTYPE_DISCLAIMER = {
  en:
    'PROTOTYPE — NOT ANATOMICALLY VALIDATED. A stylised educational shape with placeholder motion: ' +
    'proportions, positions and rates are illustrative and must not be used for diagnosis or measurement.',
  ja:
    'PROTOTYPE — 解剖学的検証を受けていません。教育目的のスタイライズドモデルであり、' +
    '形状・位置・動きの速さはいずれも説明のための概略です。診断・計測には使用できません。',
  short: 'Prototype — stylised shape, not anatomically validated.',
  shortJa: 'プロトタイプ｜簡略化した形状。解剖学的検証は未了です。',
};

/**
 * Builds the `meta` object the UI reads, from a scene's copy module.
 *
 * The copy lives in `src/data/prototypes/`; this only assembles it and fills in
 * the parts every prototype shares. Keeping the assembly here means a new organ
 * scene declares content and nothing else.
 *
 * @param {object} copy
 */
export function prototypeMeta(copy) {
  const status = copy.status ?? 'prototype';
  if (!statusById(status)) throw new Error(`prototypeMeta: unknown status "${status}" for scene "${copy.id}"`);

  return {
    id: copy.id,
    status,
    title: copy.title,
    titleJa: copy.titleJa,
    subtitle: copy.subtitle,
    subtitleJa: copy.subtitleJa,
    stages: copy.stages,
    legend: copy.legend,
    palette: copy.palette,
    range: copy.range,
    progressLabel: copy.progressLabel,
    disclaimer: copy.disclaimer ?? PROTOTYPE_DISCLAIMER.en,
    disclaimerJa: copy.disclaimerJa ?? PROTOTYPE_DISCLAIMER.ja,
    disclaimerShort: copy.disclaimerShort ?? PROTOTYPE_DISCLAIMER.short,
    disclaimerShortJa: copy.disclaimerShortJa ?? PROTOTYPE_DISCLAIMER.shortJa,
  };
}
