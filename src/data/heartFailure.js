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
/** Heading for the pressure-volume panel. */
export const PRESSURE_VOLUME_LABEL = {
  label: 'Pressure-volume loop',
  labelJa: '圧-容積ループ',
};

/** Heading for the pressure waveform panel. */
export const PRESSURE_WAVE_LABEL = {
  label: 'Pressure over one beat',
  labelJa: '1 拍の圧波形',
};

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
 * Fixed properties of the circulation that the disease state does not change.
 *
 * These are the compartments the left ventricle works against. They are held
 * constant so that what the slider moves is unambiguous: the mechanics of the
 * left ventricle, its afterload, and the volume it is asked to carry.
 *
 * The right ventricle is here because the loop has to close. It is never drawn,
 * but without it blood could not back up into the pulmonary veins when the left
 * ventricle fails — which is the mechanism the congestion overlay depends on.
 */
export const CIRCULATION_CONSTANTS = {
  rightVentricle: { ees: 0.85, v0: 15, edpvrA: 0.35, edpvrB: 0.02 },
  /**
   * The atrium's passive stiffness matters more than its contractility.
   *
   * With a very compliant atrium almost all of its pressure comes from the
   * contraction term, which gives an a-wave and essentially no v-wave, holds
   * mean atrial pressure well below left ventricular end-diastolic pressure,
   * and — the reason it mattered here — decouples the pulmonary side from the
   * ventricle it is supposed to be backing up behind. These values put the
   * passive compliance in the 10-20 mL/mmHg range instead, which brings mean
   * atrial pressure up alongside end-diastolic pressure (the relationship that
   * makes a wedge pressure a useful proxy at all) and makes the v-wave the
   * larger of the two, as it is in the left atrium.
   */
  leftAtrium: { ees: 0.25, v0: 15, edpvrA: 2.0, edpvrB: 0.035 },
  /** Scale factor of the LV end-diastolic pressure-volume relationship. */
  lvEdpvrA: 0.4,
  systemicArterialCompliance: 1.1,
  systemicVenousCompliance: 120,
  pulmonaryArterialCompliance: 4.0,
  /**
   * The downstream pulmonary compartment lumps the capillary bed together with
   * the veins, so its pressure is the hydrostatic pressure that drives fluid
   * into the interstitium — which is what the congestion overlay reads. That is
   * why it carries a real resistance down to the atrium rather than a token
   * one: a few mmHg of capillary-to-atrium gradient is right, and it also keeps
   * the reservoir exchange between veins and atrium during atrial contraction
   * to the size of a physiological wave instead of a lumped-model artefact.
   */
  pulmonaryVenousCompliance: 5.0,
  pulmonaryResistance: 0.08,
  pulmonaryVenousResistance: 0.03,
  mitralResistance: 0.008,
  aorticResistance: 0.012,
  tricuspidResistance: 0.008,
  pulmonicResistance: 0.012,
};

/**
 * What the progression slider actually changes.
 *
 * Every entry is a *mechanical* property of the ventricle or its load. Nothing
 * haemodynamic is listed, because nothing haemodynamic is chosen any more:
 * end-diastolic volume, ejection fraction, stroke volume, cardiac output,
 * filling pressure and pulmonary venous pressure are all solved for by
 * circulation.js and can only be read out, never set.
 *
 *   ees                  end-systolic elastance, mmHg/mL — contractility
 *   v0                   unstressed volume, mL — how far the chamber has
 *                        remodelled outward (a rightward shift of the whole
 *                        pressure-volume relationship)
 *   edpvrB               curvature of the end-diastolic pressure-volume
 *                        relationship, 1/mL — chamber stiffness
 *   systemicResistance   afterload, mmHg·s/mL
 *   circulatingVolume    stressed volume, mL — volume status / fluid retention
 *   hr                   beats per minute
 *
 *   wallMm               end-diastolic wall thickness, mm — a structural
 *                        property of the drawing, not of the circulation
 *   longToShortAxisRatio cavity shape parameter (see hemodynamics.js)
 *
 * The values were chosen so that the emergent haemodynamics land on the same
 * illustrative course reviewed in docs/medical-audit-2026-08-24.md, and a test
 * fails if they drift away from it. They remain one plausible course, not a
 * universal trajectory.
 */
export const CIRCULATION_KEYFRAMES = [
  {
    at: 0.0,
    ees: 2.74,
    v0: 10,
    edpvrB: 0.0277,
    systemicResistance: 1.1,
    circulatingVolume: 710,
    hr: 70,
    wallMm: 9.0,
    longToShortAxisRatio: 1.9,
  },
  {
    // Pressure overload: afterload up, muscle stronger and stiffer, cavity not
    // enlarged. Ejection fraction is preserved at this point.
    at: 0.18,
    ees: 3.35,
    v0: 8,
    edpvrB: 0.0345,
    systemicResistance: 1.28,
    circulatingVolume: 790,
    hr: 74,
    wallMm: 14.0,
    longToShortAxisRatio: 1.86,
  },
  {
    // Eccentric remodelling: contractility falls and the whole relationship
    // shifts right, which is what "the chamber dilates" means mechanically.
    at: 0.42,
    ees: 1.64,
    v0: 34,
    edpvrB: 0.0284,
    systemicResistance: 1.18,
    circulatingVolume: 912,
    hr: 76,
    wallMm: 11.6,
    longToShortAxisRatio: 1.6,
  },
  {
    at: 0.64,
    ees: 1.22,
    v0: 54,
    edpvrB: 0.0272,
    systemicResistance: 1.22,
    circulatingVolume: 1020,
    hr: 82,
    wallMm: 10.4,
    longToShortAxisRatio: 1.45,
  },
  {
    // Neurohormonal activation: vasoconstriction and fluid retention both rise.
    at: 0.85,
    ees: 0.97,
    v0: 66,
    edpvrB: 0.0252,
    systemicResistance: 1.3,
    circulatingVolume: 1102,
    hr: 88,
    wallMm: 9.8,
    longToShortAxisRatio: 1.35,
  },
  {
    at: 1.0,
    ees: 0.89,
    v0: 72,
    edpvrB: 0.0246,
    systemicResistance: 1.34,
    circulatingVolume: 1154,
    hr: 89,
    wallMm: 9.4,
    longToShortAxisRatio: 1.32,
  },
];

/**
 * Mean pulmonary capillary/venous pressure, in mmHg, mapped to how far the
 * congestion overlay has spread and whether interstitial fluid appears.
 *
 * Anchored to the usual clinical landmarks rather than to an invented index: a
 * normal wedge pressure sits around 6-12 mmHg, interstitial oedema is
 * conventionally described above roughly 18-20 mmHg, and frank alveolar oedema
 * above roughly 25. The pressure itself comes out of the circulation model, so
 * these four numbers are the only judgement left in the overlay — everything
 * else about it is a consequence of the mechanics.
 *
 * They are a rendering map, not a physiological threshold, and emphatically not
 * a quantification of lung water: real patients vary widely in the pressure at
 * which congestion becomes apparent, chronic heart failure tolerates pressures
 * that would cause oedema acutely, and how much fluid actually crosses into the
 * interstitium depends on capillary permeability, oncotic pressure and lymphatic
 * clearance — none of which this model has. What the mapping is for is that the
 * overlay rises and falls *with* a pressure the model solved, rather than with a
 * number someone typed next to a stage.
 */
export const CONGESTION_PRESSURE = {
  frontFrom: 12,
  frontTo: 30,
  interstitialFluidFrom: 22,
  interstitialFluidTo: 32,
};
