/**
 * Content + tuning data for the "Amyloid-β accumulation" scene.
 *
 * Everything that a non-programmer might want to reword or re-colour lives here,
 * so the rendering code stays free of copy. Each future theme gets its own file
 * in `src/data/`.
 */

/** Palette. Cool -> warm as the pathology progresses, so the direction reads instantly. */
export const PALETTE = {
  monomer: '#38e1ef', // Aβ monomer      : cyan
  oligomer: '#ffd166', // soluble oligomer : amber
  fibril: '#ff8a3d', // fibril           : orange
  plaque: '#ff4d6d', // plaque           : red / magenta
  neuron: '#8fb0e8', // neuron membrane  : desaturated blue
  neurite: '#5f7bb5', // dendrites / axon
};

/**
 * Five teaching stages describing the *aggregation state* of Aβ.
 *
 * These are NOT clinical stages of Alzheimer's disease and they are not a
 * severity scale. `at` is the progression value (0..1) where the stage label
 * takes over; the 3D transitions are continuous and deliberately overlap the
 * boundaries, because the different Aβ species coexist and interconvert rather
 * than converting cleanly one into the next.
 */
export const STAGES = [
  {
    id: 'normal',
    name: 'Normal',
    nameJa: '正常に近い状態',
    at: 0.0,
    summary:
      'Aβ is produced and cleared continuously in the healthy brain, so soluble monomer is normally present in small amounts.',
    summaryJa:
      'Aβ は健常な脳でも日常的に産生・排出されています。細胞外に少量の可溶性モノマーが存在するのは正常なことです。',
  },
  {
    id: 'monomer',
    name: 'Monomer increase',
    nameJa: 'モノマーの増加',
    at: 0.16,
    summary:
      'What matters is the balance: when production outpaces clearance, soluble Aβ accumulates in the extracellular space.',
    summaryJa:
      '問題になるのは「存在すること」ではなくバランスです。産生が排出を上回ると、可溶性 Aβ が細胞外に蓄積していきます。',
  },
  {
    id: 'oligomer',
    name: 'Oligomer formation',
    nameJa: 'オリゴマー形成',
    at: 0.4,
    summary:
      'Monomers associate into small soluble oligomers. These species are considered biologically important and have been associated with synaptic dysfunction.',
    summaryJa:
      'モノマー同士が集まり、小さな可溶性オリゴマーを形成します。生物学的に重要な分子種と考えられ、シナプス機能障害との関連が報告されています。',
  },
  {
    id: 'fibril',
    name: 'Fibril formation',
    nameJa: '線維（フィブリル）形成',
    at: 0.62,
    summary:
      'Some aggregates extend into ordered β-sheet fibrils, which grow by adding further Aβ at their ends.',
    summaryJa:
      '一部の凝集体が規則的な β シート構造の線維へと伸長し、末端に Aβ を付加しながら成長します。すべてが線維になるわけではありません。',
  },
  {
    id: 'plaque',
    name: 'Plaque formation',
    nameJa: 'プラーク（老人斑）形成',
    at: 0.84,
    summary:
      'Fibrils pack into dense extracellular deposits — plaques — one of the neuropathological hallmarks of Alzheimer’s disease. Monomers and soluble aggregates remain present alongside them.',
    summaryJa:
      '線維が密に集まり、細胞外に老人斑（プラーク）を形成します。アルツハイマー病の神経病理学的特徴のひとつですが、この状態でもモノマーや可溶性凝集体は併存しています。',
  },
];

/** Legend entries shown under the 3D view. */
export const LEGEND = [
  // `activeFrom` is the progression at which the species becomes present; the
  // legend entry stays dimmed until then.
  { key: 'monomer', label: 'Aβ monomer', labelJa: 'モノマー', activeFrom: 0 },
  { key: 'oligomer', label: 'Oligomer', labelJa: 'オリゴマー', activeFrom: 0.34 },
  { key: 'fibril', label: 'Fibril', labelJa: '線維', activeFrom: 0.56 },
  { key: 'plaque', label: 'Plaque', labelJa: 'プラーク', activeFrom: 0.78 },
];

/** Captions at each end of the progression slider. */
export const RANGE = {
  start: 'Low aggregation',
  startJa: '凝集 少',
  end: 'High aggregation',
  endJa: '凝集 多',
};

/** What the slider actually moves along — deliberately not "disease severity". */
export const PROGRESS_LABEL = {
  label: 'Aggregation state',
  labelJa: '凝集の状態',
};

/**
 * Floating 3D labels. `range` is the progression window in which the label is visible,
 * so the annotation always matches what is actually on screen.
 */
export const ANNOTATIONS = [
  {
    id: 'neuron',
    text: 'Neuron',
    sub: '神経細胞',
    anchor: 'soma',
    range: [0.0, 1.0],
  },
  {
    id: 'space',
    text: 'Extracellular space',
    sub: '細胞外スペース',
    anchor: 'space',
    range: [0.06, 0.44],
    compact: false,
  },
  {
    id: 'oligomer',
    text: 'Oligomers',
    sub: '可溶性オリゴマー',
    anchor: 'oligomer',
    range: [0.36, 0.7],
  },
  {
    id: 'fibril',
    text: 'Fibrils',
    sub: 'β シート線維',
    anchor: 'fibril',
    range: [0.58, 0.9],
  },
  {
    id: 'plaque',
    text: 'Plaque',
    sub: '老人斑',
    anchor: 'plaque',
    range: [0.8, 1.0],
  },
];

/** Shown permanently, small, under the controls. */
export const DISCLAIMER =
  'Simplified educational model of Aβ aggregation — not a molecular simulation. Aβ species coexist and interconvert; this does not represent clinical disease stages or symptom severity.';
export const DISCLAIMER_JA =
  '教育目的の簡易モデルです。分子シミュレーションではありません。各凝集種は共存・相互変換し得るため、臨床病期や症状の重さを表すものではありません。';

/** Shown instead of the full notice on narrow screens, where space is scarce. */
export const DISCLAIMER_SHORT = 'Educational model of Aβ aggregation — not clinical disease stages.';
export const DISCLAIMER_SHORT_JA = '教育用の簡易モデルです。臨床病期や症状の重さを表すものではありません。';
