/**
 * The introductory lesson's words: the question, the names of the three
 * circulations, the buttons, the five scenes of the explanation, the short
 * tags on the model and the lesson's own "sources & limits".
 *
 * No figure is written here. Every number a sentence carries is a placeholder
 * (`{mapA}`, `{coB}` …) filled from the solved beats at the moment it is shown
 * (`lessonStoryboard.js`), and which way the output moved from A to B is read
 * from the solution, not assumed — so there is a sentence for each direction.
 *
 * Two comparisons, two vocabularies. A → B is "before / after the
 * intervention" (介入前・介入後); B ↔ C is "a different circulation"
 * (別の循環). No sentence uses one vocabulary for the other.
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
 * The three circulations. `role` is what it is to the others; `name` says what
 * it is. `tone` is the colour family the chip, the read-out card and the tag
 * share, so a reader can match them without reading.
 */
export const LESSON_CONDITION_COPY = {
  A: {
    letter: 'A',
    tone: 'start',
    role: { en: 'Start', ja: '開始状態' },
    name: { en: 'A heart that sends out little', ja: '心臓から送り出す量が少ない循環' },
  },
  B: {
    letter: 'B',
    tone: 'after',
    role: { en: 'After the intervention', ja: '介入後' },
    name: { en: 'A + the vasoconstrictor action', ja: 'A＋血管収縮作用' },
  },
  C: {
    letter: 'C',
    tone: 'other',
    role: { en: 'A different circulation', ja: '別の循環' },
    name: {
      en: 'Not B after treatment — a different circulation from the start',
      ja: 'B の治療後ではない、はじめから別の循環',
    },
  },
};

/** The "before" marks drawn while B is shown alone: they are A. */
export const BEFORE_MARK = { en: 'Before (A)', ja: '介入前（A）' };

/** The two results, named for a reader first and by abbreviation second. */
export const LESSON_READOUT = {
  map: { label: { en: 'Mean blood pressure', ja: '平均血圧' }, abbr: 'MAP', unit: { en: 'mmHg', ja: 'mmHg' } },
  co: { label: { en: 'Cardiac output', ja: '心拍出量' }, abbr: 'CO', unit: { en: 'L/min', ja: 'L/分' } },
  changing: { en: 'changing…', ja: '変化中…' },
  group: { en: 'Results', ja: '計算結果' },
  // Under the results whenever the vasoconstrictor action is on — from the
  // first step of the walk to A's return, in the explanation and under the
  // reader's buttons alike — because a reader who only presses the button sees
  // the output fall and nothing else. {factor} is the intervention's own
  // multiplier, read from the model, not written here (owner's review,
  // 2026-09-30).
  caveat: {
    en: 'A schematic experiment: only the vascular resistance, ×{factor}. A real vasopressor’s whole action is not reproduced.',
    ja: '血管抵抗だけを {factor} 倍にした模式実験。実際の昇圧薬の全作用は再現しません。',
  },
};

export const LESSON_ACTIONS = {
  play: { en: '▶ Play the explanation', ja: '▶ 説明を再生' },
  replay: { en: '↺ Play again', ja: '↺ もう一度再生' },
  tryIt: { en: 'Try it yourself', ja: '自分で試す' },
  constrict: { en: 'Add the vasoconstrictor action', ja: '昇圧薬の血管収縮作用を加える' },
  release: { en: 'Take the vasoconstrictor action away', ja: '血管収縮作用を戻す' },
  showOther: { en: 'Compare with circulation C', ja: '別の循環 C と比べる' },
  hideOther: { en: 'Hide C', ja: 'C を隠す' },
  reset: { en: 'Start over', ja: '最初に戻す' },
  detail: { en: 'Full model — four conditions, all figures, sources →', ja: '詳しいモデルへ（4つの条件・数表・根拠と限界）→' },
  player: {
    group: { en: 'Explanation player', ja: '説明の再生' },
    restart: { en: 'From the start', ja: '最初から' },
    previous: { en: 'Previous scene', ja: '前の場面' },
    pause: { en: 'Pause', ja: '一時停止' },
    resume: { en: 'Play', ja: '再生' },
    next: { en: 'Next scene', ja: '次の場面' },
  },
};

/**
 * The one short line under the question that says what to do next.
 * `{…}` are filled from the solved state (`lessonGuide` in the storyboard).
 */
export const LESSON_GUIDE = {
  idle: {
    en: 'Play the explanation, or add the drug’s vasoconstrictor action yourself.',
    ja: '説明を再生するか、自分で昇圧薬の血管収縮作用を加えてみましょう。',
  },
  manualStart: {
    en: 'Press “Add the vasoconstrictor action” and watch the small vessels on the right.',
    ja: '「血管収縮作用を加える」を押して、右側の細い血管を見てください。',
  },
  changing: { en: 'Adding the vasoconstrictor action…', ja: '血管収縮作用を加えています…' },
  releasing: { en: 'Taking the vasoconstrictor action away…', ja: '血管収縮作用を戻しています…' },
  // Said as a direction in this model, never as a size: "a little" carried a
  // clinical judgement of 3.75 → 3.13 L/min that this lesson does not make
  // (owner's review, 2026-09-30). `tests/cardiac-output-lesson.test.js`
  // holds these words to that.
  afterDown: {
    en: 'Pressure went up; in this model, the output went down. Next, compare with C.',
    ja: '血圧は上がり、送り出す量はこのモデルでは減りました。次は C と比べてみましょう。',
  },
  afterSame: {
    en: 'Pressure went up; in this model, the output barely changed. Next, compare with C.',
    ja: '血圧は上がり、送り出す量はこのモデルではほとんど変わりません。次は C と比べてみましょう。',
  },
  afterUp: {
    en: 'Pressure went up; in this model, the output went up too. Next, compare with C.',
    ja: '血圧は上がり、送り出す量もこのモデルでは増えました。次は C と比べてみましょう。',
  },
  pairBC: {
    en: 'B and C: about the same pressure — C sends out clearly more.',
    ja: 'B と C は血圧がほぼ同じ。送り出す量は C の方がはっきり多い。',
  },
  pairAC: {
    en: 'A and C differ in both. Add the vasoconstrictor action to A and compare again.',
    ja: 'A と C は血圧も送り出す量も違います。A に血管収縮作用を加えて、もう一度比べましょう。',
  },
  /** After the explanation is stopped: what is on screen, and what it is compared with. */
  stoppedAlone: {
    en: 'Explanation stopped. Now: {now}. Compared with: before (A).',
    ja: '説明を止めました。いま：{now}。比較元：介入前の A。',
  },
  stoppedStart: {
    en: 'Explanation stopped. Now: {now}. Nothing is being compared.',
    ja: '説明を止めました。いま：{now}。比べている相手はありません。',
  },
  stoppedPair: {
    en: 'Explanation stopped. {now} and C — a different circulation — side by side.',
    ja: '説明を止めました。{now} と、別の循環 C を並べています。',
  },
};

/**
 * The five scenes of the explanation. One sentence-pair each, said while the
 * model shows it: `heading` is what the scene is, `text` what to see.
 *
 * `result` has one text per direction the output can take from A to B, and
 * the storyboard picks the one the solver's answer calls for.
 */
export const LESSON_STEPS = {
  start: {
    heading: { en: 'A: a heart that sends out little', ja: 'A：心臓から送り出す量が少ない循環' },
    text: {
      en: 'An imaginary circulation whose heart contracts weakly. Each beat sends out only a little blood (the bright red length): {coA} L a minute, at a mean pressure of {mapA} mmHg.',
      ja: '心臓の縮む力が弱い、仮想の循環です。1回に送り出す血液（明るい赤の長さ）が少なく、1分間で {coA} L。平均血圧は {mapA} mmHg。',
    },
  },
  constrict: {
    heading: { en: 'Add the vasoconstrictor action of a vasopressor', ja: '昇圧薬の血管収縮作用を加える' },
    text: {
      en: 'What changes is not the heart but the small vessels of the whole body: they all narrow together, and blood flows through them less easily (vascular resistance ↑).',
      ja: '変えるのは心臓ではなく、全身の細い血管です。すべてが一斉に細くなり、血液が流れにくくなります（血管抵抗↑）。',
    },
    note: {
      en: 'Not one vessel narrowing in one place.',
      ja: '1本の血管の一か所が狭くなるのとは違います。',
    },
  },
  result: {
    heading: { en: 'B: the pressure went up. And the output?', ja: 'B：血圧は上がった。送り出す量は？' },
    text: {
      down: {
        en: 'Mean pressure {mapA} → {mapB} mmHg. Cardiac output did not rise; in this model it went down, {coA} → {coB} L/min — against narrower vessels this heart sends out less per beat.',
        ja: '平均血圧は {mapA} → {mapB} mmHg。心拍出量は増えず、このモデルでは {coA} → {coB} L/分に減りました。細くなった血管へは、この心臓は押し出しにくくなります。',
      },
      same: {
        en: 'Mean pressure {mapA} → {mapB} mmHg. In this model cardiac output barely moved: {coA} → {coB} L/min.',
        ja: '平均血圧は {mapA} → {mapB} mmHg。心拍出量はこのモデルでは {coA} → {coB} L/分で、ほとんど変わりません。',
      },
      up: {
        en: 'Mean pressure {mapA} → {mapB} mmHg, and in this model cardiac output rose too: {coA} → {coB} L/min.',
        ja: '平均血圧は {mapA} → {mapB} mmHg に上がり、心拍出量もこのモデルでは {coA} → {coB} L/分に増えました。',
      },
    },
    note: {
      en: 'This model’s result under this condition — not a rule for every vasopressor.',
      ja: 'このモデルのこの条件での結果で、どの昇圧薬にも当てはまる決まりではありません。',
    },
  },
  other: {
    heading: { en: 'C: a different circulation', ja: 'C：B とは別の循環' },
    text: {
      en: 'C is not B after treatment, and not another action of the drug. It is a different circulation from the start: a heart that contracts normally, vessels that are not narrowed.',
      ja: 'C は B の治療後でも、薬の別の作用でもありません。心臓の縮む力が保たれ、血管も細くない、はじめから別の循環です。',
    },
    note: {
      en: 'Both are stopped at the same moment of the beat, and share one heart rate ({hr}/min).',
      ja: '2つを拍動の同じ瞬間で止めています。心拍数はどちらも {hr} 回/分。',
    },
  },
  conclusion: {
    heading: { en: 'About the same pressure, different output', ja: '同じ程度の血圧でも、送り出す量は違う' },
    text: {
      en: 'Mean pressure B {mapB}, C {mapC} mmHg; cardiac output B {coB}, C {coC} L/min. The pressure alone cannot tell you whether the circulation is keeping up.',
      ja: '平均血圧は B {mapB}・C {mapC} mmHg とほぼ同じなのに、心拍出量は B {coB}・C {coC} L/分。血圧の数字だけでは、循環が保たれているかを判断できません。',
    },
    // What the caveat under the results does not already say. It said "only
    // the vasoconstrictor action, not noradrenaline's whole action" too, which
    // the results now carry at every B moment (owner's review, 2026-09-30).
    note: {
      en: 'Doses and organ blood flow are not computed either.',
      ja: '投与量や臓器の血流も、このモデルは計算していません。',
    },
  },
};

/** Short tags on the model, beside the part they name. */
export const LESSON_TAGS = {
  // Two lines, like the vessels' tag below: on one, it is wider than the room
  // left of the heart on a phone and stood over the heart's wall.
  heart: { en: 'Heart\n(left ventricle)', ja: '心臓\n（左心室）' },
  ejected: { en: 'Blood sent out this beat', ja: '1回に送り出された血液' },
  bed: { en: 'Small vessels of the whole body', ja: '全身の細い血管' },
  // Two lines on purpose: on one, it is wider than the room right of the
  // vessels at 1440×900 beside the side column, and was pushed back over the
  // very point it names (lesson-drive's "covers the point it names").
  bedNarrowing: { en: 'All narrow together\n→ resistance ↑', ja: '一斉に細くなる\n＝血管抵抗↑' },
  gauge: { en: 'Mean blood pressure', ja: '平均血圧' },
  gaugeUp: { en: 'Pressure ↑', ja: '血圧↑' },
  ejectedLess: { en: 'Sent out per beat ↓', ja: '1回に送り出す量↓' },
  ejectedSame: { en: 'Sent out per beat: about the same', ja: '1回に送り出す量：ほぼ同じ' },
  ejectedMore: { en: 'Sent out per beat ↑', ja: '1回に送り出す量↑' },
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
      text: 'A and C are imaginary teaching circulations, not patients. B is A with one input changed: the systemic resistance, ×1.5, standing for a vasopressor’s vasoconstrictor action. Every figure is computed by the same circulation model the full model uses.',
      textJa: 'A と C は教材用の仮想の循環で、患者ではありません。B は A の入力を 1 つだけ変えたもの——昇圧薬の血管収縮作用として体血管抵抗を 1.5 倍——です。表示する数値はすべて、詳しいモデルと同じ循環モデルの計算結果です。',
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
      text: '**That the output fell from A to B is this model’s result under this condition.** A vasopressor does not always lower cardiac output: depending on the starting condition and the drug’s other actions it may leave it unchanged or raise it.',
      textJa: '**A → B で心拍出量が減ったのは、このモデルのこの条件での結果です。** 昇圧薬で心拍出量が必ず下がるわけではありません。開始条件や薬の他の作用によって、変わらないことも増えることもあります。',
    },
    {
      text: '**The drawing is to a drawing scale.** The vessels’ width, the length of the blood sent out and the gauge’s needle show computed values on scales chosen for the picture. The steps between A and B are solved conditions shown in order — not the time a drug takes to act.',
      textJa: '**描画は描画用の尺度です。** 血管の太さ・送り出された血液の長さ・血圧計の針は、計算値を絵のための尺度で示しています。A と B の間の段階は計算した条件を順に並べたもので、薬が効くまでの時間経過ではありません。',
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
  en: 'Schematic teaching model — only the vasoconstrictor action, no reflexes.',
  ja: '模式的な教育用モデルです（血管収縮作用のみ・反射なし）。',
};
