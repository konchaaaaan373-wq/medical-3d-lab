/**
 * The introductory lesson's words: the question, the names of the three
 * circulations and of the three things the figure shows, the buttons, the five
 * scenes of the explanation, the line that says what to do next, and the
 * lesson's own "sources & limits".
 *
 * No figure is written here. Every number a sentence carries is a placeholder
 * (`{mapA}`, `{coB}` …) filled from the solved beats at the moment it is shown
 * (`lessonStoryboard.js`), and which way the output moved from A to B is read
 * from the solution, not assumed — so there is a sentence for each direction.
 *
 * ## Words a first-time reader knows come first
 *
 * The owner's rule (2026-10-01): a plain phrase first, the technical term after
 * it in brackets — 「心臓が1分間に送り出す量（心拍出量）」「血液の通りにくさ
 * （血管抵抗）」「血圧の平均（平均血圧）」 — and the three circulations are
 * never only a letter: 「開始時」「血管を縮めた後」「別の循環」 stand beside A, B
 * and C wherever they are named.
 *
 * ## Two comparisons, two vocabularies
 *
 * A → B is "before / after the action" (開始時・血管を縮めた後). B ↔ C is "a
 * different circulation" (別の循環). No sentence uses one vocabulary for the
 * other, and C is said not to be B after treatment wherever it is introduced.
 *
 * ## What is never said
 *
 * Nothing here says a drug was given (「ノルアドレナリンを投与する」), that
 * a vasopressor always lowers the output, or that anything the model does not
 * compute — tissue or organ blood flow — got better or worse.
 * `tests/cardiac-output-lesson.test.js` holds these words to that.
 */

/** What the screen asks. The whole lesson answers this and nothing else. */
export const LESSON_QUESTION = {
  en: 'Blood pressure went up. Did the heart send out more blood too?',
  ja: '血圧が上がった。心臓から出る量も増えた？',
};

/** How the two views of this model name themselves to each other. */
export const LESSON_VIEW_NAMES = {
  lesson: { en: 'Introduction', ja: '入門' },
  detail: { en: 'Full model', ja: '詳しいモデル' },
};

/**
 * The three circulations. `role` is the short name that always stands beside
 * the letter; `note` is what has to be said with it where it is introduced.
 * `tone` is the colour family its name tag and its row in the figure share.
 */
export const LESSON_CONDITION_COPY = {
  A: {
    letter: 'A',
    tone: 'start',
    role: { en: 'Start', ja: '開始時' },
    note: null,
  },
  B: {
    letter: 'B',
    tone: 'after',
    role: { en: 'After narrowing', ja: '血管を縮めた後' },
    note: null,
  },
  C: {
    letter: 'C',
    tone: 'other',
    role: { en: 'A different circulation', ja: '別の循環' },
    note: { en: 'not after any drug', ja: '薬を加えた後ではありません' },
  },
};

/** While the vessels are narrowing or widening, between A and B. */
export const LESSON_CHANGING = { letter: '…', tone: 'changing', role: { en: 'Changing', ja: '変化中' } };

/**
 * The three things the figure shows, named for a reader first and by the
 * technical term second. `short` is what fits beside the part in the figure;
 * `full` is how a sentence names it.
 */
export const LESSON_TERMS = {
  output: {
    short: { en: 'Output/min', ja: '1分間に送り出す量' },
    full: {
      en: 'blood the heart sends out per minute (cardiac output)',
      ja: '心臓が1分間に送り出す量（心拍出量）',
    },
    unit: { en: 'L', ja: 'L' },
  },
  pressure: {
    short: { en: 'Avg. pressure', ja: '血圧の平均' },
    // Beside the dial there is room for a short term only; the full one is in
    // the figure's legend and every sentence.
    term: { en: '(MAP)', ja: '（平均血圧）' },
    full: { en: 'average blood pressure (mean arterial pressure)', ja: '血圧の平均（平均血圧）' },
    unit: { en: 'mmHg', ja: 'mmHg' },
  },
  resistance: {
    full: {
      en: 'how hard it is for blood to get through (vascular resistance)',
      ja: '血液の通りにくさ（血管抵抗）',
    },
  },
  heart: { en: 'Heart', ja: '心臓' },
  /**
   * How to read the figure: in its lower half while one circulation is shown.
   * One row per part, the plain words first and the term after them — what
   * a first-time reader could not tell from the 3D version without a caption
   * (owner's review, 2026-10-01).
   */
  legend: {
    title: { en: 'Reading the figure', ja: '図の読み方' },
    bed: {
      main: { en: 'Vessel width = how easily blood passes', ja: '細い血管の太さ ＝ 血液の通りやすさ' },
      sub: {
        en: 'narrower: higher vascular resistance',
        ja: '細いほど、血液の通りにくさ（血管抵抗）が大きい',
      },
    },
    dial: { main: { en: 'Needle = average blood pressure (MAP)', ja: '針 ＝ 血圧の平均（平均血圧）' } },
    tube: {
      main: { en: 'Filled length = blood sent out per minute', ja: '管の満ちた長さ ＝ 心臓が1分間に送り出す量' },
      sub: { en: '(cardiac output), 0–6 L', ja: '（心拍出量）、0〜6 L の目盛り' },
    },
  },
  bed: { en: 'Small vessels of the body', ja: '全身の細い血管' },
  bedNarrowed: { en: 'Small vessels: harder to pass', ja: '全身の細い血管が通りにくい' },
  /** The cream marks on B's gauge and tube while B stands alone: they are A. */
  before: { en: 'Start', ja: '開始時' },
};

/**
 * The note under the figure, on screen from the first moment, in the
 * explanation and under the reader's buttons alike: what the one action is and
 * is not (owner's reviews, 2026-09-30 and 2026-10-01). A reader who only
 * presses the button and a reader who only watches both read it beside the
 * results and beside the button.
 */
export const LESSON_NOTE = {
  en: 'Schematic: only the vessel-narrowing part of a vasopressor’s action — not its whole action, nor any patient’s response.',
  // Two lines at 375 px (28 characters each): the figure above has no height
  // to give a third. It says what the full model's on-screen disclaimer says
  // about patients, which the lesson had only inside 「このモデルについて」
  // (code review, 2026-10-01).
  ja: '昇圧薬の働きの一部（血管を縮める作用）だけを取り出した模式実験です。全作用も、患者の反応も再現しません。',
};

export const LESSON_ACTIONS = {
  play: { en: '▶ Play the explanation', ja: '▶ 説明を再生' },
  replay: { en: '↺ Play again', ja: '↺ もう一度再生' },
  tryIt: { en: 'Try it', ja: '自分で試す' },
  constrict: { en: 'Add the vessel-narrowing action', ja: '血管を縮める作用を加える' },
  release: { en: 'Take the action away', ja: '作用を戻す' },
  showOther: { en: 'Compare with a different circulation', ja: '別の循環と比べる' },
  hideOther: { en: 'Hide the other circulation', ja: '別の循環を隠す' },
  detail: { en: 'Full model (four conditions, all figures) →', ja: '詳しいモデルへ（4つの条件・数表）→' },
  player: {
    group: { en: 'Explanation player', ja: '説明の再生' },
    restart: { en: 'From the start', ja: '最初から' },
    previous: { en: 'Previous scene', ja: '前の場面' },
    pause: { en: 'Pause', ja: '一時停止' },
    resume: { en: 'Play', ja: '再生' },
    next: { en: 'Next scene', ja: '次の場面' },
  },
  controls: { en: 'Try it yourself', ja: '自分で試す' },
};

/**
 * The line under the figure that says what to do next, from the state the
 * reader is in. `{…}` are filled from the solved state (`guideFor`).
 */
export const LESSON_GUIDE = {
  start: {
    en: 'Press “Add the vessel-narrowing action”, or ▶ to play.',
    ja: '「血管を縮める作用を加える」を押すか、▶ で説明を再生できます。',
  },
  changing: { en: 'The small vessels of the whole body are narrowing…', ja: '全身の細い血管を縮めています…' },
  releasing: { en: 'Taking the action away…', ja: '作用を戻しています…' },
  // Said as a direction in this model, never as a size: "a little" carried a
  // clinical judgement of 3.75 → 3.13 L/min that this lesson does not make
  // (owner's review, 2026-09-30).
  afterDown: {
    en: 'Pressure up; in this model, the output went down. Next: compare with another circulation.',
    ja: '血圧は上がり、送り出す量はこのモデルでは減りました。次は別の循環と比べましょう。',
  },
  afterSame: {
    en: 'Pressure up; in this model, the output barely changed. Next: compare with another circulation.',
    ja: '血圧は上がり、送り出す量はこのモデルではほとんど変わりません。次は別の循環と比べましょう。',
  },
  afterUp: {
    en: 'Pressure up; in this model, the output went up too. Next: compare with another circulation.',
    ja: '血圧は上がり、送り出す量もこのモデルでは増えました。次は別の循環と比べましょう。',
  },
  pair: {
    en: 'About the same average pressure — yet C sends out more in the same minute.',
    ja: '血圧の平均はほぼ同じ。でも同じ1分間に送り出す量は C の方が多い。',
  },
  /** After the explanation is stopped: what is on screen, and what it is compared with. */
  stoppedAlone: {
    en: 'Explanation stopped. Now: {now}. The cream marks are the start (A).',
    ja: '説明を止めました。いま：{now}。クリーム色の印は開始時（A）です。',
  },
  stoppedStart: {
    en: 'Explanation stopped. Now: {now}. Press “Add the vessel-narrowing action”.',
    ja: '説明を止めました。いま：{now}。「血管を縮める作用を加える」を押してみましょう。',
  },
  stoppedPair: {
    en: 'Explanation stopped. {now} and C — a different circulation — side by side.',
    ja: '説明を止めました。{now} と、別の循環（C）を並べています。',
  },
};

/**
 * The five scenes of the explanation. One thing each: `heading` is what the
 * scene is, `text` one short line on what to see **in the model** — the words
 * point at the 3D, they do not carry the lesson (owner's review, 2026-10-02:
 * "numbers and sentences only confirm what the 3D shows").
 *
 * `result` has one text per direction the output can take from A to B, and the
 * storyboard picks the one the solver's answer calls for.
 */
export const LESSON_STEPS = {
  start: {
    heading: { en: 'The heart sends blood out (A, start)', ja: '心臓が血液を送り出す（A 開始時）' },
    text: {
      en: 'Each squeeze sends blood out through the small vessels and back.',
      ja: '縮むたびに血液が送り出され、細い血管を通って戻ります。',
    },
    note: null,
  },
  constrict: {
    heading: { en: 'Narrow the small vessels of the body', ja: '全身の細い血管を縮める' },
    text: {
      en: 'Every small vessel narrows at once (vascular resistance ×{factor}). Nothing is done to the heart.',
      ja: 'すべての細い血管が細くなり、血液の通りにくさ（血管抵抗）が {factor} 倍に。心臓には何もしていません。',
    },
    note: null,
  },
  result: {
    heading: { en: 'After narrowing (B)', ja: '血管を縮めた後（B）' },
    text: {
      down: {
        en: 'Needle up, {mapA} → {mapB} mmHg; jug down, {coA} → {coB} L — in this model.',
        ja: '針は {mapA}→{mapB} mmHg に上がり、容器は {coA}→{coB} L に下がりました（このモデルでは）。',
      },
      same: {
        en: 'Needle up, {mapA} → {mapB} mmHg; jug about the same, {coA} → {coB} L — in this model.',
        ja: '針は {mapA}→{mapB} mmHg に上がり、容器は {coA}→{coB} L でほとんど変わりません（このモデルでは）。',
      },
      up: {
        en: 'Needle up, {mapA} → {mapB} mmHg; jug up too, {coA} → {coB} L — in this model.',
        ja: '針は {mapA}→{mapB} mmHg に上がり、容器も {coA}→{coB} L に上がりました（このモデルでは）。',
      },
    },
    // The answer to "would a real vasopressor always do this?".
    note: {
      en: 'A real vasopressor does not always do this.',
      ja: '実際の昇圧薬で必ずこうなるとは限りません。',
    },
  },
  other: {
    heading: { en: 'A different circulation (C)', ja: '別の循環（C）' },
    text: {
      en: 'Not after any drug: different from the start — vessels not narrowed, a heart that pushes harder.',
      ja: '薬を加えた後ではなく、はじめから別の循環です。血管は細くなく、心臓の押し出す力が強い。',
    },
    note: null,
  },
  conclusion: {
    heading: { en: 'About the same pressure, different output', ja: '血圧はほぼ同じ。送り出す量は違う' },
    text: {
      en: 'Same minute, same heart rate ({hr}/min): {coB} L and {coC} L. Pressure alone cannot tell.',
      ja: '同じ1分間・同じ心拍数（{hr}回/分）で {coB} L と {coC} L。血圧だけでは判断できません。',
    },
    note: null,
  },
};

/**
 * The lesson's own "sources & limits": short, and specific to what this screen
 * shows. The full model's limits are one link away on the full model.
 */
export const LESSON_SCOPE = {
  question:
    'If the blood pressure rises, has the heart’s output risen too? — shown with one schematic experiment and one comparison.',
  questionJa:
    '血圧が上がれば、心臓から送り出す量も増えたと言えるか。——1つの模式実験と1つの比較で示します。',
  answers: [
    {
      text: 'A and C are imaginary teaching circulations, not patients. B is A with one input changed: the systemic resistance, ×1.5, standing for the vessel-narrowing part of a vasopressor’s action. Every figure is computed by the same circulation model the full model uses.',
      textJa: 'A と C は教材用の仮想の循環で、患者ではありません。B は A の入力を 1 つだけ変えたもの——昇圧薬の働きのうち血管を縮める作用として、体血管抵抗を 1.5 倍——です。表示する数値はすべて、詳しいモデルと同じ循環モデルの計算結果です。',
    },
    {
      text: 'C is a separate circulation shown for comparison. It is not B after treatment and not another effect of the drug.',
      textJa: 'C は比較のための別の循環です。B の治療後でも、薬の別の作用でもありません。',
    },
  ],
  excludes: [
    {
      text: 'The whole action of any real vasopressor — noradrenaline also acts on the heart and on the veins — its dose, how it responds at each dose, reflex changes in heart rate, and any individual patient’s response.',
      textJa: '実際の昇圧薬の全作用（ノルアドレナリンは心臓や静脈にも作用します）・投与量・用量ごとの反応・反射による心拍数の変化・患者ごとの反応。',
    },
    {
      text: 'Tissue and organ blood flow, oxygen delivery, lactate and capillary refill time. None of them is computed, and the picture does not show any of them improving or worsening.',
      textJa: '組織・臓器の血流、酸素供給、乳酸、毛細血管再充満時間（CRT）。どれも計算しておらず、画面はこれらが改善・悪化したことを示していません。',
    },
  ],
  cautions: [
    {
      // Says no direction: which way A → B went is the solver's to say, and the
      // captions read it (`outputDirection`); a sentence here that named one
      // would contradict them the day the solver answered otherwise (code
      // review, 2026-10-01; `tests/cardiac-output-lesson.test.js`).
      text: '**How the output changes from A to B is this model’s result under this condition.** A vasopressor does not always lower cardiac output: depending on the starting condition and the drug’s other actions it may leave it unchanged or raise it.',
      textJa: '**A → B で心拍出量がどう変わるかは、このモデルのこの条件での結果です。** 昇圧薬で心拍出量が必ず下がるわけではありません。開始条件や薬の他の作用によって、変わらないことも増えることもあります。',
    },
    {
      text: '**The figure is a model of one circulation, drawn to drawing scales — not an anatomical model.** How deep the heart squeezes is in proportion to what it sends out each beat, and the red cells move faster the more it sends out per minute; the width of the small vessels shows how easily blood gets through them, not how much their diameter changes, and their number is the drawing’s; the needle shows the average pressure on a 0–150 mmHg dial; the level in the jug shows the litres sent out per minute on a 0–6 L scale (where the browser cannot draw in 3D, the filled length of a tube). The jug is a scale, not blood collected anywhere. The steps between A and B are solved conditions shown in order — not the time a drug takes to act.',
      textJa: '**図は 1 つの循環の模型で、描画用の尺度で描いています（解剖の模型ではありません）。** 心臓の縮む深さは1回に送り出す量に、赤い粒の速さは1分間に送り出す量に比例させています。細い血管の太さは血液の通りやすさを表し、血管の直径がどれだけ変わるかではありません。本数も描画のためのものです。針は 0〜150 mmHg の目盛りで血圧の平均を、容器の液面は 0〜6 L の目盛りで1分間に送り出す量を示します（3D を描けない端末では管の満ちた長さ）。容器は目盛りで、血液がどこかに溜まることではありません。A と B の間の段階は計算した条件を順に並べたもので、薬が効くまでの時間経過ではありません。',
    },
    {
      text: 'The conclusion is only this: the pressure alone cannot tell you whether the circulation is keeping up. Nothing here says which treatment to choose.',
      textJa: '結論は「血圧だけでは循環を判断できない」までです。どの治療を選ぶべきかは何も示しません。',
    },
  ],
  sources: [
    {
      text: 'The same closed-loop circulation (time-varying elastance, seven compartments) and the same verified input range as the full model. The ×1.5 is chosen for this lesson and is not fitted to any study or dose.',
      textJa: '詳しいモデルと同じ閉ループ循環（時変エラスタンス・7 区画）と、同じ検証済みの入力範囲です。1.5 倍はこの教材のために選んだ値で、研究や用量に合わせたものではありません。',
      kind: 'framework',
    },
  ],
  evidence: 'docs/model-evidence/cardiac-output.md',
};

export const LESSON_DISCLAIMER_SHORT = {
  en: 'Schematic teaching model — only the vessel-narrowing action, no reflexes.',
  ja: '模式的な教育用モデルです（血管を縮める作用のみ・反射なし）。',
};
