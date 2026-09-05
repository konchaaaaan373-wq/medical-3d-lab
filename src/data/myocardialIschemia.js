/**
 * What the myocardial ischemia scene says, and the numbers it says it about.
 *
 * Prose and staging only. Every clinical quantity on screen is solved by
 * `src/models/myocardialIschemia.js` and `src/models/cardiacMechanics.js`; if a
 * number appears here it is a *control setting*, not a result.
 */

/**
 * The episode, as four things that happen in order.
 *
 * `supply` is the fraction of normal flow down the anterior descending, and
 * `at` is where on a normalized episode the stage begins. Neither is a
 * measurement: the first is the scene's one lever, and the second is the axis
 * the model is honest about not being able to put seconds on.
 *
 * **Every stage needs a span, not just a start.** Reperfusion was written to
 * begin at 1, which is the end — so the restored supply never ran for any of
 * the episode, and the scene finished showing an artery that was open in the
 * caption and shut in every number. It begins at 0.80 now, leaving the last fifth
 * of the episode for the recovery the stage is about.
 */
export const STAGES = [
  {
    id: 'baseline',
    at: 0,
    supply: 1,
    label: 'Supplied',
    labelJa: '灌流されている',
    body:
      'Every territory is getting more oxygen than it is using. That margin is why a narrowing can exist for years and be silent: the heart notices nothing until the reserve is gone.',
    bodyJa:
      'どの領域も、使う量より多くの酸素を受け取っています。この余裕があるからこそ、狭窄は何年も無症状でいられます——予備能が尽きるまで、心臓は何も気づきません。',
  },
  {
    id: 'onset',
    at: 0.22,
    supply: 0.35,
    label: 'Supply falls short',
    labelJa: '供給が足りなくなる',
    body:
      'Flow down the anterior descending drops. Its territory is now using more oxygen than it receives — and nothing has changed on screen yet, because a debt has to be run up before it shows.',
    bodyJa:
      '左前下行枝の血流が落ちます。その支配域はいま、受け取る以上の酸素を使っています——そして画面はまだ変わりません。負債は、溜まらなければ現れないからです。',
  },
  {
    id: 'burden',
    at: 0.45,
    supply: 0.35,
    label: 'The debt shows',
    labelJa: '負債が現れる',
    body:
      'The anterior wall and the septum stop keeping up. What discoloured is not where the artery is narrowed — it is the muscle that artery feeds, and the difference is the whole reason territories are worth drawing.',
    bodyJa:
      '前壁と中隔が追いつかなくなります。色が変わったのは血管が細くなった場所ではなく、**その血管が養う筋肉**です。この違いこそ、支配域を描く価値そのものです。',
  },
  {
    id: 'reperfusion',
    at: 0.8,
    supply: 1,
    label: 'Flow returns, the wall does not',
    labelJa: '血流は戻り、壁は戻らない',
    body:
      'The artery is open again and the supply is normal within a beat. The wall is not. Muscle that has been ischemic stays hypokinetic long after its blood supply is restored — this is stunning, and it is why "the artery is open" and "the heart is working" are two different statements.',
    bodyJa:
      '血管は再び開き、供給は一拍で正常に戻ります。壁は戻りません。虚血にさらされた心筋は、血流が回復したあとも長く低収縮のままです——これが **stunning** であり、「血管が開いた」と「心臓が働いている」が別の主張である理由です。',
  },
];

/** How the three territories are coloured, and what each colour means. */
export const TERRITORY_COLORS = Object.freeze({
  lad: '#e08a3c',
  rca: '#5a9fd4',
  lcx: '#7cb87a',
});

/**
 * Healthy myocardium, and myocardium at full ischemic burden.
 *
 * The distance between these two is **presentation**, and it is a real choice
 * rather than a default: ischemic muscle does not turn this colour, and the
 * model card says so. The first pair were close enough in value that the
 * anterior wall's shift was measurable in the vertex buffer and invisible on
 * the screen — a difference the reader cannot see is not a difference the scene
 * is making.
 *
 * They differ in hue and in value, not only in saturation, so the change
 * survives being lit from one side and reads for a viewer who cannot separate
 * red from green.
 */
export const WALL_COLORS = Object.freeze({
  supplied: '#b45c62',
  ischemic: '#3f4a63',
});

/** The vessel, and the vessel when its flow is cut. */
export const VESSEL_COLORS = Object.freeze({
  open: '#c0424b',
  restricted: '#6f4a55',
});

/** The read-outs, in the order they are shown. */
export const METRICS = [
  {
    id: 'lad-supply-demand',
    key: 'ladSupplyDemand',
    label: 'LAD supply / demand',
    labelJa: '左前下行枝 供給／需要',
    unit: '',
    digits: 2,
    emphasis: true,
  },
  {
    id: 'lad-burden',
    key: 'ladBurden',
    label: 'Ischemic burden (LAD)',
    labelJa: '虚血負荷（左前下行枝）',
    unit: '',
    digits: 2,
    emphasis: true,
  },
  {
    id: 'lad-wall-motion',
    key: 'ladWallMotion',
    label: 'Anterior wall motion',
    labelJa: '前壁の壁運動',
    unit: '% of normal',
    unitJa: '正常比 %',
    scale: 100,
    digits: 0,
  },
  {
    id: 'ejection-fraction',
    key: 'ejectionFraction',
    label: 'Ejection fraction',
    labelJa: '駆出率',
    unit: '%',
    scale: 100,
    digits: 0,
    emphasis: true,
  },
  {
    id: 'stroke-volume',
    key: 'strokeVolumeMl',
    label: 'Stroke volume',
    labelJa: '一回拍出量',
    unit: 'mL',
    digits: 0,
  },
  {
    id: 'cardiac-output',
    key: 'cardiacOutputLMin',
    label: 'Cardiac output',
    labelJa: '心拍出量',
    unit: 'L/min',
    digits: 1,
  },
];

/**
 * The charts, by the id each panel is keyed on.
 *
 * The shape here is the one `components/ChartPanel.js` documents — `title`,
 * `x`, `y`, `key` — and it has to be, because nothing checks it at import time.
 * Written first with `label`, `xLabel` and `yLabel`, the panel drew the series
 * against an auto-scaled axis, never drew the progress marker at all, and threw
 * a `TypeError` reading `spec.x.invert` the moment it tried to draw the axes.
 * The scene looked fine; the chart beside it was dead. That is the same failure
 * the pulmonary oedema scene shipped, one component along.
 *
 * Both axes are fixed at 0-1 rather than scaled to the data. Burden runs to
 * about 0.73 over this episode and an auto-scaled axis would stretch that to
 * fill the panel, which is precisely the misreading a burden chart exists to
 * prevent: it would show a territory at three-quarters of its capacity as one
 * at the top of the scale.
 */
export const CHARTS = [
  {
    id: 'burden-over-episode',
    title: 'Ischemic burden through the episode',
    titleJa: '経過中の虚血負荷',
    // Appended to the title in whichever language is showing, so it has to read
    // in both. English prose here produced "経過中の虚血負荷 · 0 – 1 against
    // episode progress" on the Japanese surface.
    unitLabel: '0 – 1',
    height: 116,
    x: {
      label: 'Episode progress',
      labelJa: '経過（正規化）',
      min: 0,
      max: 1,
      ticks: [0, 0.5, 1],
    },
    y: { label: 'Ischemic burden', labelJa: '虚血負荷', min: 0, max: 1, ticks: [0, 0.5, 1] },
    key: [
      { id: 'lad', label: 'Anterior descending', labelJa: '左前下行枝', color: TERRITORY_COLORS.lad },
      { id: 'rca', label: 'Right coronary', labelJa: '右冠動脈', color: TERRITORY_COLORS.rca },
      { id: 'lcx', label: 'Circumflex', labelJa: '左回旋枝', color: TERRITORY_COLORS.lcx },
    ],
  },
];

/** What the scene does not model, shown beside it rather than buried. */
export const SCOPE = {
  answers: [
    { en: 'Which myocardium a narrowed artery starves, and where that shows.', ja: '細くなった血管がどの心筋を飢えさせ、それがどこに現れるか。' },
    { en: 'Why the wall stops moving after the flow drops rather than with it.', ja: 'なぜ壁は血流と同時ではなく、遅れて動かなくなるのか。' },
    { en: 'Why restoring flow does not restore contraction.', ja: 'なぜ血流を戻しても収縮は戻らないのか。' },
    { en: 'What a regional problem costs the whole circulation.', ja: '局所の問題が循環全体に何を払わせるか。' },
  ],
  refuses: [
    { en: 'Whether a person is having a heart attack. There is no infarction here — no necrosis, no scar, no infarct expansion.', ja: '心筋梗塞かどうか。ここに梗塞はありません——壊死も瘢痕も梗塞拡大もありません。' },
    { en: 'How tight a stenosis is. Supply is a scale factor on a territory, not a lumen; there is no flow calculation.', ja: '狭窄の程度。供給は支配域にかかる倍率であって内腔径ではなく、流量計算はありません。' },
    { en: 'How long any of this takes. The axis is normalized episode progress, not minutes.', ja: '所要時間。時間軸は正規化された経過であって、分ではありません。' },
    { en: 'Any individual’s coronary anatomy. One right-dominant specimen, and a territory map that measurement disagrees with in places.', ja: '個人の冠動脈解剖。右冠動脈優位の標本 1 体で、支配域マップは実測と一部食い違います。' },
    { en: 'ECG, chest pain, troponin or prognosis. None are modelled.', ja: '心電図・胸痛・トロポニン・予後。いずれも扱っていません。' },
  ],
};

/** The colours the legend names, and what each stands for. */
export const PALETTE = Object.freeze({
  supplied: WALL_COLORS.supplied,
  ischemic: WALL_COLORS.ischemic,
  lad: TERRITORY_COLORS.lad,
  rca: TERRITORY_COLORS.rca,
  lcx: TERRITORY_COLORS.lcx,
  vessel: VESSEL_COLORS.open,
});

export const LEGEND = [
  { key: 'vessel', label: 'Coronary artery', labelJa: '冠動脈' },
  { key: 'lad', label: 'Anterior descending territory', labelJa: '左前下行枝の支配域' },
  { key: 'rca', label: 'Right coronary territory', labelJa: '右冠動脈の支配域' },
  { key: 'lcx', label: 'Circumflex territory', labelJa: '左回旋枝の支配域' },
  { key: 'ischemic', label: 'Ischemic burden', labelJa: '虚血負荷' },
];

export const RANGE = { min: 0, max: 1, step: 0.01 };

export const PROGRESS_LABEL = {
  label: 'Episode progress',
  labelJa: '経過',
  start: 'supplied',
  startJa: '灌流',
  end: 'reperfused',
  endJa: '再灌流',
};

export const MODEL_SCOPE = {
  question: 'A coronary artery narrows here. Which muscle stops moving, and when?',
  questionJa: '冠動脈がここで細くなる。どの筋肉が、いつ動かなくなるのか。',
  answers: SCOPE.answers.map((entry) => ({ text: entry.en, textJa: entry.ja })),
  limits: SCOPE.refuses.map((entry) => ({ text: entry.en, textJa: entry.ja })),
  sources: [
    'docs/model-cards/myocardial-ischemia.md',
    'docs/model-evidence/myocardial-ischemia.md',
    'src/models/myocardialIschemia.js',
  ],
};

export const MODEL_CONTROLS_COPY = {
  title: 'How tight, and against how much work?',
  titleJa: 'どれだけ細く、どれだけの仕事に対してか',
  subtitle: 'Flow past the narrowing is a fraction of normal, not a stenosis diameter',
  subtitleJa: '狭窄部を通る血流は「正常比」であって、内腔径ではありません',
  placement: 'console',
  reset: true,
};

export const STORY_LABEL = { en: 'Walk through it', ja: '順に見る' };
export const LEARNING_LABEL = { en: 'Predict it', ja: '予測してみる' };

export const DISCLAIMER =
  'Educational conceptual model. Reversible ischemia over one right-dominant reference heart, with a fixed ' +
  'coronary territory map that measurement disagrees with in places. There is no infarction, no stenosis ' +
  'calculation and no clock — the time axis is normalized episode progress, not minutes. Not for diagnosis, ' +
  'measurement or any decision about a person.';
export const DISCLAIMER_JA =
  '教育目的の概念モデルです。右冠動脈優位の基準心 1 体における可逆的虚血を、固定の支配域マップ（実測とは一部' +
  '食い違います）の上で解いています。梗塞も狭窄の流量計算もなく、時間軸は分ではなく正規化された経過です。' +
  '診断・計測・個人に関する判断には使用できません。';
export const DISCLAIMER_SHORT =
  'Conceptual model — reversible ischemia only, and the time axis is episode progress, not minutes.';
export const DISCLAIMER_SHORT_JA =
  '概念モデル｜可逆的虚血のみ。時間軸は分ではなく経過です。';
