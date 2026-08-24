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
 * The five teaching stages.
 *
 * `at` is the progression value (0..1) where the stage label takes over.
 * The 3D transitions are continuous and deliberately overlap the boundaries —
 * aggregation in vivo is a gradient, not a set of discrete switches.
 */
export const STAGES = [
  {
    id: 'normal',
    name: 'Normal',
    nameJa: '正常に近い状態',
    at: 0.0,
    summary:
      'Aβ is produced and cleared continuously. Only small amounts of soluble monomer are present in the extracellular space.',
    summaryJa:
      'Aβ は日常的に産生され、同じくらいの速度で排出されます。細胞外にあるのは少量の可溶性モノマーだけです。',
  },
  {
    id: 'monomer',
    name: 'Monomer increase',
    nameJa: 'モノマーの増加',
    at: 0.16,
    summary:
      'When production outpaces clearance, soluble Aβ monomers accumulate around neurons and synapses.',
    summaryJa:
      '産生と排出のバランスが崩れると、可溶性 Aβ モノマーが神経細胞やシナプス周囲に溜まっていきます。',
  },
  {
    id: 'oligomer',
    name: 'Oligomer formation',
    nameJa: 'オリゴマー形成',
    at: 0.4,
    summary:
      'Monomers associate into small soluble oligomers. These are widely regarded as an important species for synaptic dysfunction.',
    summaryJa:
      'モノマー同士が集まり、小さな可溶性オリゴマーを形成します。シナプス機能障害に関与する重要な分子種と考えられています。',
  },
  {
    id: 'fibril',
    name: 'Fibril formation',
    nameJa: '線維（フィブリル）形成',
    at: 0.62,
    summary:
      'Oligomers extend into ordered β-sheet fibrils, which grow by adding further Aβ at their ends.',
    summaryJa:
      'オリゴマーが規則的な β シート構造の線維へと伸長し、末端に Aβ を付加しながら成長していきます。',
  },
  {
    id: 'plaque',
    name: 'Plaque formation',
    nameJa: 'プラーク（老人斑）形成',
    at: 0.84,
    summary:
      'Fibrils pack into dense extracellular deposits — senile plaques — one of the neuropathological hallmarks of Alzheimer’s disease.',
    summaryJa:
      '線維が密に集まり、細胞外に老人斑（プラーク）を形成します。アルツハイマー病の神経病理学的特徴のひとつです。',
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
  start: 'Normal',
  startJa: '正常',
  end: 'Plaque',
  endJa: 'プラーク',
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
  'Simplified educational model — not a molecular simulation. Shapes, counts and timing are illustrative.';
export const DISCLAIMER_JA =
  '教育目的の簡易モデルです。分子シミュレーションではなく、形・数・時間経過はイメージ図として描いています。';
