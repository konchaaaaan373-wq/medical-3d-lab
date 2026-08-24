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
 * The structural / functional axis: how the ventricle itself changes.
 *
 * Pulmonary congestion is deliberately NOT one of these. Congestion is a
 * haemodynamic state that follows raised left-sided filling pressure, not the
 * structural stage that comes after HFrEF — and it is not specific to HFrEF
 * either. It is carried by `congestionLevel` below and drawn as an overlay.
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
    // Named for what the model actually does: myocardial volume rises ~77 %
    // while the cavity does not enlarge and relative wall thickness climbs.
    // Increased RWT *with* increased mass is hypertrophy, not remodelling.
    id: 'concentric-hypertrophy',
    name: 'Concentric hypertrophy',
    nameJa: '求心性肥大',
    at: 0.18,
    summary:
      'Under a sustained pressure load the wall thickens and muscle mass increases while the cavity does not enlarge, so relative wall thickness rises.',
    summaryJa:
      '持続する圧負荷に対して壁が厚くなり、心筋量が増加します。内腔は拡大しないため、相対的壁厚（RWT）が上昇します。',
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
      'Ejection fraction falls and the ventricle empties less completely. Resting cardiac output may stay close to normal for a time. Filling pressure rises alongside — pulmonary congestion is drawn as a separate haemodynamic overlay, not as a later structural stage.',
    summaryJa:
      '駆出率が低下し、心室は完全には空になりません。安静時の心拍出量はしばらく正常近くに保たれることがあります。並行して充満圧が上昇しますが、肺うっ血は「次の構造的ステージ」ではなく、独立した血行動態のオーバーレイとして描いています。',
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
  // Deliberately structural: the right-hand end of this axis is a dilated,
  // poorly emptying ventricle — not "congestion", which is an overlay.
  end: 'Dilated, low EF',
  endJa: '拡大・EF低下',
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

/**
 * Shown only in comparison mode, where the two hearts are moved apart and the
 * ordinary annotations would point at empty space between them.
 */
export const COMPARISON_ANNOTATIONS = [
  {
    id: 'reference-heart',
    text: 'Normal',
    sub: '正常（比較用）',
    anchor: 'comparisonReference',
    range: [0.0, 1.0],
    comparisonOnly: true,
  },
  {
    id: 'remodelled-heart',
    text: 'Remodeled LV',
    sub: 'リモデリング後の左室',
    anchor: 'comparisonDisease',
    range: [0.0, 1.0],
    comparisonOnly: true,
  },
];

/** Caption for the social sequence button. */
export const REEL_LABEL = {
  label: 'Reel',
  labelJa: 'リール',
  hint: '15-second social sequence — press Escape to leave',
  hintJa: '15秒のSNS用シーケンス（Escape で終了）',
};

/** Caption for the compare toggle. */
export const COMPARISON_LABEL = {
  label: 'Compare',
  labelJa: '比較',
  hint: 'Side by side with a normal ventricle — two states, not two points on one path',
  hintJa: '正常な左室と並べて表示します。順番ではなく、別の状態として比べるためのものです',
};

/**
 * Copy for the 15-second social sequence.
 *
 * `{normalEf}` / `{hfrefEf}` and the volume placeholders are filled from the
 * scene's own state at runtime — never hard-coded — so the video follows the
 * model if the model ever changes.
 *
 * One message per screen: social viewers read very little, and the medical
 * detail belongs in the interactive UI and the docs, not on a Reel.
 */
export const REEL_COPY = {
  hook: {
    title: 'EF {normalEf}% vs {hfrefEf}%',
    titleJa: 'EF {normalEf}% と {hfrefEf}%',
    subtitle: 'What changes inside the heart?',
    subtitleJa: '心臓の動きはどう違う？',
  },
  cards: {
    normal: { label: 'Normal', labelJa: '正常' },
    hfref: { label: 'HFrEF', labelJa: 'HFrEF' },
  },
  residual: {
    label: 'Blood remaining after contraction',
    labelJa: '収縮後に残る血液',
  },
  beat: {
    caption: 'One beat, slowed down',
    captionJa: 'ゆっくり 1 拍',
    endDiastole: { tag: 'ED', label: 'End-diastole', labelJa: '拡張末期' },
    endSystole: { tag: 'ES', label: 'End-systole', labelJa: '収縮末期' },
  },
  ejectionFraction: {
    caption: 'EF = the fraction of ventricular blood ejected per beat',
    captionJa: 'EF ＝ 1 回の拍動で送り出された血液の割合',
  },
  congestion: {
    caption: 'Elevated filling pressure → pulmonary congestion',
    captionJa: '充満圧の上昇 → 肺うっ血',
    note: 'Schematic · simplified educational model',
    noteJa: '模式的表現 ・ 教育用模式図',
  },
  takeHome: {
    title: 'A lower EF means a smaller fraction is ejected per beat.',
    titleJa: 'EF が低下すると、1 回で駆出される割合が低下する。',
  },
  note: {
    text: 'Simplified educational model',
    textJa: '教育用模式図',
  },
};

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
 * Plausible textbook-style values for one illustrative course, chosen so that
 * the direction of change is right. They are not measurements, no patient is
 * described, and they are not a universal HFrEF trajectory — other courses,
 * including ones where stroke volume or cardiac output behave differently, are
 * entirely possible.
 *
 * Properties of *this dataset*, checked by tests/hemodynamics.test.js:
 *   - stroke volume does not rise above the healthy value as remodelling
 *     advances (an earlier version of these numbers had the failing ventricle
 *     out-pumping the healthy one);
 *   - resting cardiac output stays in a plausible band (~5.0 -> 4.5 L/min) and
 *     never becomes supranormal;
 *   - relative wall thickness rises with concentric hypertrophy and falls once
 *     the chamber dilates;
 *   - myocardial volume stays elevated once remodelling has occurred.
 *
 * `wallMm` is the *end-diastolic* wall thickness. Systolic thickening is not
 * listed here: it is derived (see hemodynamics.js).
 *
 * `congestionLevel` is a separate axis: a 0..1 index of left-sided filling
 * pressure driving the congestion overlay. It rides along the same slider for
 * simplicity, but it is not a structural stage and is not specific to HFrEF.
 */
export const HEMODYNAMICS = [
  {
    at: 0.0,
    edvMl: 120,
    esvMl: 50,
    wallMm: 9.0,
    hr: 70,
    congestionLevel: 0.0,
    longToShortAxisRatio: 1.9,
  },
  {
    at: 0.18,
    edvMl: 112,
    esvMl: 45,
    wallMm: 14.0,
    hr: 74,
    congestionLevel: 0.06,
    longToShortAxisRatio: 1.86,
  },
  {
    at: 0.42,
    edvMl: 170,
    esvMl: 104,
    wallMm: 11.6,
    hr: 76,
    congestionLevel: 0.24,
    longToShortAxisRatio: 1.6,
  },
  {
    at: 0.64,
    edvMl: 205,
    esvMl: 145,
    wallMm: 10.4,
    hr: 82,
    congestionLevel: 0.52,
    longToShortAxisRatio: 1.45,
  },
  {
    at: 0.85,
    edvMl: 235,
    esvMl: 182,
    wallMm: 9.8,
    hr: 88,
    congestionLevel: 0.88,
    longToShortAxisRatio: 1.35,
  },
  {
    at: 1.0,
    edvMl: 248,
    esvMl: 197,
    wallMm: 9.4,
    hr: 89,
    congestionLevel: 1.0,
    longToShortAxisRatio: 1.32,
  },
];
