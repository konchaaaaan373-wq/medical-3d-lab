/**
 * Content + model parameters for the "Heart failure" scene.
 *
 * Naming convention used throughout this project:
 *   - Clinical / state parameters carry clinical names and units (edvMl, hr, wallMm).
 *   - Visualization-only parameters are named so that they cannot be mistaken for
 *     measurements (longToShortAxisRatio, congestionGlowIntensity).
 *
 * See docs/medical-notes.md for what this scene does and does not claim.
 */

export const PALETTE = {
  myocardium: '#c85466', // heart muscle
  flow: '#ff6b7f', // blood taking part in ejection
  residual: '#a06ae0', // blood still in the ventricle at end-systole
  pressure: '#6f7ce8', // raised filling / pulmonary venous pressure (NOT blood)
  fluid: '#a8d8f0', // interstitial fluid (NOT blood)
  vessel: '#8fa8c8',
};

/**
 * Five illustrative stages.
 *
 * IMPORTANT: this is *one* pattern of remodelling seen in HFrEF, not a universal
 * natural history. Many patients never pass through all of these, and heart
 * failure with preserved ejection fraction (HFpEF) looks different again.
 * `at` is where the label takes over; geometry and numbers move continuously.
 */
export const STAGES = [
  {
    id: 'normal',
    name: 'Normal',
    nameJa: '正常な左室',
    at: 0.0,
    summary:
      'The left ventricle fills, then ejects a little over half of its contents with each beat.',
    summaryJa:
      '左室は拡張期に血液で満たされ、収縮期にその半分強を駆出します。壁の厚さと内腔の大きさのバランスが保たれています。',
  },
  {
    id: 'concentric-remodeling',
    name: 'Concentric remodeling',
    nameJa: '求心性リモデリング',
    at: 0.18,
    summary:
      'Under a sustained pressure load the wall thickens while the cavity does not enlarge, so relative wall thickness rises.',
    summaryJa:
      '持続する圧負荷に対して壁が厚くなり、内腔は拡大しません。相対的壁厚（RWT）が上昇した状態です。',
  },
  {
    id: 'dilation',
    name: 'LV dilation',
    nameJa: '左室の拡大（遠心性）',
    at: 0.42,
    summary:
      'In this pattern the cavity then enlarges and becomes less elongated, and wall thickness falls relative to the larger chamber.',
    summaryJa:
      'この経過では次に内腔が拡大し、細長い形から丸みを帯びた形へ変わります。大きくなった心腔に対して壁は相対的に薄くなります。',
  },
  {
    id: 'systolic-dysfunction',
    name: 'Systolic dysfunction (HFrEF)',
    nameJa: '収縮機能の低下（HFrEF）',
    at: 0.64,
    summary:
      'Ejection fraction falls. Stroke volume declines gradually; a faster rate keeps resting cardiac output close to normal for a time.',
    summaryJa:
      '駆出率が低下します。1回拍出量は徐々に減りますが、心拍数の増加などにより安静時の心拍出量はしばらく正常近くに保たれることがあります。',
  },
  {
    id: 'congestion',
    name: 'Pulmonary congestion',
    nameJa: '肺うっ血',
    at: 0.85,
    summary:
      'Raised LV filling pressure is transmitted back to the atrium and pulmonary veins, raising pulmonary capillary pressure and driving fluid into the interstitium.',
    summaryJa:
      '左室の充満圧の上昇が左房・肺静脈へ伝わり、肺毛細血管圧が上昇して間質へ水分が移動します（血液が肺へ逆流するわけではありません）。',
  },
];

export const LEGEND = [
  { key: 'myocardium', label: 'Myocardium', labelJa: '心筋', activeFrom: 0 },
  { key: 'flow', label: 'Ejected blood', labelJa: '駆出される血液', activeFrom: 0 },
  {
    key: 'residual',
    label: 'End-systolic residual',
    labelJa: '収縮末期の残存血液',
    activeFrom: 0.46,
  },
  { key: 'pressure', label: 'Raised pressure', labelJa: '充満圧の上昇', activeFrom: 0.6 },
  { key: 'fluid', label: 'Interstitial fluid', labelJa: '間質の水分', activeFrom: 0.82 },
];

/** Captions at each end of the progression slider. */
export const RANGE = {
  start: 'Normal',
  startJa: '正常',
  end: 'Congestion',
  endJa: '肺うっ血',
};

/** What the slider actually moves along — deliberately not "disease severity". */
export const PROGRESS_LABEL = {
  label: 'Remodeling (illustrative)',
  labelJa: 'リモデリングの進行（概念）',
};

export const ANNOTATIONS = [
  { id: 'lv', text: 'Left ventricle', sub: '左室', anchor: 'cavity', range: [0.0, 1.0] },
  { id: 'wall', text: 'Wall thickness', sub: '壁の厚さ', anchor: 'wall', range: [0.1, 0.6] },
  { id: 'aorta', text: 'Aorta', sub: '大動脈', anchor: 'aorta', range: [0.0, 0.5], compact: false },
  {
    id: 'residual',
    text: 'End-systolic residual',
    sub: '収縮末期の残存血液',
    anchor: 'residual',
    range: [0.55, 1.0],
  },
  {
    id: 'pressure',
    text: 'Raised filling pressure',
    sub: '充満圧の上昇',
    anchor: 'pressure',
    range: [0.62, 1.0],
  },
  {
    id: 'fluid',
    text: 'Interstitial fluid',
    sub: '間質への水分移動',
    anchor: 'fluid',
    range: [0.84, 1.0],
    compact: false,
  },
];

export const DISCLAIMER =
  'Simplified educational model of one pattern of LV remodeling and pulmonary congestion in HFrEF. Not all heart failure follows this course. Particle motion is not a fluid-dynamics simulation.';
export const DISCLAIMER_JA =
  '教育用の模式図です。HFrEFでみられる左室リモデリングと肺うっ血の一例を概念的に示しています。すべての心不全が同じ経過をたどるわけではありません。粒子表現は流体シミュレーションではありません。';

/** Shown instead of the full notice on narrow screens, where space is scarce. */
export const DISCLAIMER_SHORT = 'Educational model — one pattern of HFrEF remodeling, not a universal course.';
export const DISCLAIMER_SHORT_JA =
  '教育用の模式図です。HFrEFの一例であり、すべての心不全がこの経過をたどるわけではありません。';

/**
 * Haemodynamic keyframes, interpolated across the progression.
 *
 * Plausible textbook-style values for each pattern, chosen so that the direction
 * of change is right — they are not measurements, and no patient is described.
 *
 * Deliberate properties of this set, checked by tests/hemodynamics.test.js:
 *   - stroke volume falls monotonically (70 -> 51 mL);
 *   - resting cardiac output is broadly maintained early (~5.0 L/min) and then
 *     declines — in chronic HFrEF it is exercise reserve, not resting output,
 *     that fails first;
 *   - relative wall thickness rises with concentric remodelling and falls once
 *     the chamber dilates;
 *   - myocardial mass stays elevated once remodelling has occurred.
 *
 * `wallMm` is the *end-diastolic* wall thickness. Systolic thickening is not
 * listed here: it is derived (see hemodynamics.js).
 */
export const HEMODYNAMICS = [
  {
    at: 0.0,
    edvMl: 120,
    esvMl: 50,
    wallMm: 9.0,
    hr: 70,
    fillingPressureIndex: 0.0,
    longToShortAxisRatio: 1.9,
  },
  {
    at: 0.18,
    edvMl: 112,
    esvMl: 45,
    wallMm: 14.0,
    hr: 74,
    fillingPressureIndex: 0.06,
    longToShortAxisRatio: 1.86,
  },
  {
    at: 0.42,
    edvMl: 170,
    esvMl: 104,
    wallMm: 11.6,
    hr: 76,
    fillingPressureIndex: 0.24,
    longToShortAxisRatio: 1.6,
  },
  {
    at: 0.64,
    edvMl: 205,
    esvMl: 145,
    wallMm: 10.4,
    hr: 82,
    fillingPressureIndex: 0.52,
    longToShortAxisRatio: 1.45,
  },
  {
    at: 0.85,
    edvMl: 235,
    esvMl: 182,
    wallMm: 9.8,
    hr: 88,
    fillingPressureIndex: 0.88,
    longToShortAxisRatio: 1.35,
  },
  {
    at: 1.0,
    edvMl: 248,
    esvMl: 197,
    wallMm: 9.4,
    hr: 89,
    fillingPressureIndex: 1.0,
    longToShortAxisRatio: 1.32,
  },
];
