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
  endDiastolicMark: '#9fe4ff', // where the cavity wall was at end-diastole (NOT tissue)
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
    /** Annotation ids learning view points at while this stage is current. */
    focus: ['lv'],
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
    focus: ['wall'],
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
    focus: ['lv'],
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
    focus: ['residual', 'pressure'],
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
  { key: 'fluid', label: 'Interstitial fluid', labelJa: '間質の水分', activeFrom: 0.7 },
  {
    // Not a species — a measurement mark, so it is drawn as a ring rather than
    // a filled swatch. Only appears where a stroke is being compared.
    key: 'endDiastolicMark',
    label: 'End-diastolic outline',
    labelJa: '拡張末期の輪郭',
    activeFrom: 0,
    outline: true,
  },
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
    // The window follows what the model actually produces: interstitial fluid
    // is already ~0.2 of full here and climbing, so the label appears with the
    // thing it names rather than long after it. Still last in the ladder —
    // residual (0.55) -> filling pressure (0.62) -> fluid — because that is the
    // order the chain runs in.
    text: 'Interstitial fluid',
    sub: '間質への水分移動',
    anchor: 'fluid',
    range: [0.7, 1.0],
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

/** Button that opens the guided lessons. */
export const LEARNING_LABEL = {
  // "Learn" would collide with the learning-vs-data view split; this button is
  // one specific guided lesson, so it says so.
  label: 'Lesson',
  labelJa: 'レッスン',
  hint: 'Guided lesson — predict, then test it on the model',
};

/**
 * Guided lessons.
 *
 * **One module teaches one causal relationship.** Not the whole pressure-volume
 * loop, not how to read a pressure waveform — one chain of cause and effect that
 * the learner predicts first and then tests against the model.
 *
 * The copy lives here; the numbers do not. Every figure a lesson shows is read
 * from the circulation model at the moment it runs, and `answer` is checked
 * against the model in the test suite — so a lesson cannot drift away from the
 * thing it is teaching about.
 */
export const LEARNING_MODULES = [
  {
    id: 'afterload-and-stroke-volume',
    title: 'Afterload and stroke volume',
    titleJa: '後負荷と 1 回拍出量',
    /** Where the model starts. Restored to the viewer's own state on exit. */
    setup: { progress: 0, preload: 1, afterload: 1 },

    question: {
      text: 'If afterload rises, what happens to stroke volume?',
      textJa: 'Afterload（後負荷）を上げると、Stroke Volume はどうなりますか？',
      options: [
        { id: 'up', label: '↑  Increases', labelJa: '↑  増える' },
        { id: 'same', label: '→  Unchanged', labelJa: '→  変わらない' },
        { id: 'down', label: '↓  Decreases', labelJa: '↓  減る' },
      ],
      answer: 'down',
    },

    manipulation: {
      control: 'afterload',
      to: 1.3,
      seconds: 1.4,
      text: 'Raise afterload by 30 % and watch everything move together.',
      textJa: 'Afterload を +30 % にして、同時に何が動くかを見てください。',
      action: 'Raise afterload +30 %',
      actionJa: 'Afterload を +30 % にする',
      hint: 'You can also drag the afterload slider yourself.',
      hintJa: '左の Afterload スライダーを自分で動かしても構いません。',
    },

    /** Metric ids to show before and after, and to highlight in the read-out. */
    watch: ['esv', 'sv', 'lvp'],
    observation: {
      text: 'Three things changed.',
      textJa: '変化したのは次の 3 つです。',
    },

    explanation: {
      text:
        'A higher afterload means the ventricle must generate a higher pressure before ' +
        'the aortic valve opens. With contractility unchanged, it cannot empty as far — ' +
        'more blood stays behind at end-systole, and stroke volume falls.',
      textJa:
        '後負荷が上がると、大動脈弁が開くまでに心室が発生しなければならない圧が高くなります。' +
        '収縮性が同じままなら、そこまで小さくなれません。収縮末期に残る血液（ESV）が増え、' +
        '1 回拍出量（SV）が減ります。',
      footnote:
        'Stroke volume falls by less than end-systolic volume gains, because ' +
        'end-diastolic volume rises a little at the same time.',
      footnoteJa:
        'SV の減少は ESV の増加より小さくなります。同時に EDV もわずかに増えるためです。',
    },

    transfer: {
      /** Same manipulation, run on the HFrEF state. */
      atStage: 'systolic-dysfunction',
      text: 'In HFrEF, is the effect of the same rise in afterload larger or smaller?',
      textJa: 'HFrEF では、同じ afterload 上昇の影響は Normal より大きい？ 小さい？',
      options: [
        { id: 'larger', label: 'Larger', labelJa: '大きい' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'smaller', label: 'Smaller', labelJa: '小さい' },
      ],
      answer: 'larger',
      explanation: {
        text:
          'The weaker the ventricle, the more of its stroke volume the same rise in ' +
          'afterload costs. Nothing in the model encodes this — it follows from a ' +
          'lower end-systolic elastance.',
        textJa:
          '収縮性（Ees）が低い心室ほど、同じ後負荷上昇で失う 1 回拍出量の割合が大きくなります。' +
          'これはモデルに書き込まれた挙動ではなく、Ees が低いことから出てくる帰結です。',
      },
    },

    /** Shown when the lesson ends, to send the learner back to exploring. */
    outro: {
      text: 'Try the preload slider next, and watch which way filling pressure goes.',
      textJa: '次は Preload スライダーを動かして、充満圧がどちらに動くか見てみてください。',
    },
  },
];

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
   * The atrium's passive term matters more than its contractility.
   *
   * `edpvrA` used to be 0.35, which over the volume the atrium actually operates
   * across left the passive term worth only 1-3 mmHg. Almost all of the
   * atrium's pressure then came from its contraction: the v-wave barely
   * registered, and mean atrial pressure sat several mmHg under the ventricle's
   * end-diastolic pressure, which decoupled the pulmonary side from the
   * ventricle it is supposed to be backing up behind. At 2.0 the passive term
   * is worth roughly 4-12 mmHg over the same range.
   *
   * These are calibration parameters of this lumped model, not measurements.
   * The local slope of the relationship is not a clinical atrial compliance and
   * should not be read against one — it is one exponential fitted so that one
   * compartment of a seven-compartment loop lands in a plausible pressure
   * range, with no wall mechanics or viscoelasticity behind it.
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
