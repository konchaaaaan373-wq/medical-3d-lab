/**
 * Copy and presentation metadata for the HFpEF pressure-volume scene.
 * Physiology lives in `src/models/hfpef.js`.
 */

export const PALETTE = {
  reference: '#78a9ad',
  current: '#b86b73',
  cavity: '#9e4352',
  pressure: '#9bb4d8',
};

export const STAGES = [
  {
    id: 'compliant',
    name: 'Compliant LV',
    nameJa: '柔らかい左室',
    at: 0,
    focus: ['current-lv'],
    summary:
      'At the same filling volume, a compliant ventricle reaches end-diastole at a relatively low pressure. Ejection fraction is a ratio of ejected volume to filled volume; it does not describe this diastolic pressure.',
    summaryJa:
      '同じ充満量でも、柔らかい左室は比較的低い圧で拡張末期に到達します。EF は「満たされた量のうち何割を駆出したか」という比率であり、この拡張期圧そのものを表しません。',
  },
  {
    id: 'stiffening',
    name: 'EDPVR shifts upward',
    nameJa: 'EDPVR が上方へ移る',
    at: 0.3,
    focus: ['current-lv'],
    summary:
      'As passive chamber stiffness increases, the end-diastolic pressure-volume relationship becomes steeper. The same cavity volume now requires more pressure.',
    summaryJa:
      '受動的な左室スティフネスが高くなると、拡張末期圧‐容積関係（EDPVR）が急になります。同じ内腔容積を受け入れるために、より高い圧が必要になります。',
  },
  {
    id: 'high-pressure',
    name: 'Pressure rises before EF falls',
    nameJa: 'EF が保たれたまま圧が上がる',
    at: 0.65,
    focus: ['pulmonary-pressure', 'current-lv'],
    summary:
      'The model keeps systolic emptying preserved while passive filling pressure rises. This is the central distinction: a preserved EF does not imply a normal filling pressure.',
    summaryJa:
      'このモデルでは収縮期の駆出を保ったまま、受動的な充満圧だけが上昇します。ここが中心です。EF が保たれていても、充満圧が正常とは限りません。',
  },
  {
    id: 'hfpef-mechanics',
    name: 'HFpEF-like filling mechanics',
    nameJa: 'HFpEF にみられる充満力学',
    at: 0.9,
    focus: ['pulmonary-pressure'],
    summary:
      'A filling challenge now carries a much larger pressure cost than it does in the compliant reference. Real HFpEF is a heterogeneous syndrome with many additional mechanisms; this scene isolates only this pressure-volume component.',
    summaryJa:
      '充満量を少し増やしたときの「圧の代償」が、柔らかい左室より大きくなります。実際の HFpEF は多様な機序からなる症候群で、このシーンはそのうち圧‐容積関係だけを分離して示しています。',
  },
];

export const LEGEND = [
  { key: 'reference', label: 'Compliant reference', labelJa: '柔らかい基準左室' },
  { key: 'current', label: 'Current LV', labelJa: '現在の左室' },
  { key: 'pressure', label: 'Filling-pressure cue', labelJa: '充満圧の視覚表現' },
];

export const RANGE = {
  start: 'Compliant',
  startJa: '柔らかい',
  end: 'Stiff',
  endJa: '硬い',
};

export const PROGRESS_LABEL = {
  label: 'LV passive stiffness — mechanics axis, not disease time',
  labelJa: '左室の受動的スティフネス（病期や時間ではなく力学軸）',
};

export const ANNOTATIONS = [
  { id: 'reference-lv', text: 'Compliant reference', sub: '柔らかい基準左室', anchor: 'reference', range: [0, 1], compact: false },
  { id: 'current-lv', text: 'Current LV', sub: '現在の左室', anchor: 'current', range: [0, 1] },
  { id: 'pulmonary-pressure', text: 'Filling pressure backs up', sub: '充満圧の上昇', anchor: 'pulmonary', range: [0.38, 1], compact: false },
];

export const MODEL_CONTROLS = {
  title: 'Filling challenge',
  titleJa: '充満量を変える',
  subtitle: 'Change filling volume without changing the stiffness axis.',
  subtitleJa: 'スティフネスとは別に、拡張末期の充満量を変えます。',
  placement: 'console',
};

export const PRESSURE_VOLUME = {
  label: 'Pressure-volume loop & EDPVR',
  labelJa: '圧‐容積ループと EDPVR',
};

export const MODEL_SCOPE = {
  question:
    'How can LV filling pressure become high while ejection fraction remains preserved, and why does a small increase in filling cost more pressure in a stiff ventricle?',
  questionJa:
    'EF が保たれているのに左室充満圧が高くなり得るのはなぜか。また、硬い左室では少しの充満増加がなぜ大きな圧上昇になるのか。',
  answers: [
    {
      text: 'A steeper LV end-diastolic pressure-volume relationship means **the same chamber volume requires more diastolic pressure**.',
      textJa: '左室 EDPVR が急になると、**同じ心腔容積を受け入れるのにより高い拡張期圧が必要**になります。',
    },
    {
      text: 'Ejection fraction can remain above 50% because EF describes fractional systolic emptying, not the pressure required to fill the ventricle.',
      textJa: 'EF は収縮期に何割を駆出したかを表す比率であり、充満に必要な圧ではないため、充満圧が高くても 50% 以上を保ち得ます。',
    },
  ],
  excludes: [
    {
      text: 'A complete HFpEF syndrome. There is no atrial myopathy, pulmonary vascular disease, pericardial restraint, chronotropic incompetence, vascular/endothelial dysfunction, obesity/inflammation pathway, kidney, skeletal muscle or exercise gas exchange.',
      textJa: 'HFpEF 症候群全体。心房筋症、肺血管病変、心膜制約、変時性不全、血管・内皮機能障害、肥満・炎症経路、腎、骨格筋、運動時ガス交換は含みません。',
    },
    {
      text: 'Diagnosis or clinical thresholds. The stiffness slider is not H2FPEF/HFA-PEFF score, NYHA class, exercise time, PCWP, prognosis or treatment response.',
      textJa: '診断や臨床閾値。スティフネススライダーは H2FPEF/HFA-PEFF スコア、NYHA、運動時間、PCWP、予後、治療反応を表しません。',
    },
  ],
  cautions: [
    {
      text: 'The loop path between its four corners is a teaching interpolation. The EDPVR/ESPVR equations and corner volumes/pressures are the model; valve timing is not.',
      textJa: 'PV ループの四隅の間の軌跡は説明用補間です。モデルが主張するのは EDPVR/ESPVR と四隅の容積・圧であり、弁タイミングではありません。',
    },
    {
      text: 'The filling control is an illustrative chamber-volume condition, **not a fluid dose or a blood-volume prescription**.',
      textJa: '充満量コントロールは説明用の心腔容積条件であり、**輸液量や循環血液量の処方ではありません**。',
    },
  ],
  sources: [
    {
      text: 'Zile MR, Baicu CF, Gaasch WH. N Engl J Med. 2004;350:1953-1959. PMID 15128895 — abnormal relaxation and increased passive stiffness with an upward/leftward diastolic pressure-volume relation in heart failure with normal EF.',
      textJa: 'Zile MR, Baicu CF, Gaasch WH. N Engl J Med. 2004;350:1953-1959. PMID 15128895 ― 正常EFの心不全における弛緩障害・受動的スティフネス上昇・拡張期圧容積関係の上方/左方偏位。',
    },
    {
      text: 'Omote K, Hsu S, Borlaug BA. Cardiol Clin. 2022;40:459-472. PMID 36210131 — HFpEF as inability to perfuse without pathological filling-pressure rise at rest or exertion.',
      textJa: 'Omote K, Hsu S, Borlaug BA. Cardiol Clin. 2022;40:459-472. PMID 36210131 ― 安静時または運動時の病的な充満圧上昇を伴う HFpEF の血行動態。',
    },
    {
      text: 'Andersen MJ, Borlaug BA. Circ Heart Fail. 2015;8:41-48. PMID 25342738 — exercise and saline loading reveal larger filling-pressure responses in HFpEF.',
      textJa: 'Andersen MJ, Borlaug BA. Circ Heart Fail. 2015;8:41-48. PMID 25342738 ― 運動・生理食塩水負荷で顕在化する HFpEF の充満圧応答。',
    },
  ],
  evidence: 'docs/model-evidence/hfpef.md',
};

export const DISCLAIMER =
  'ALPHA educational model isolating one HFpEF mechanism: increased passive LV stiffness and the pressure cost of filling. HFpEF is a heterogeneous clinical syndrome. Not for diagnosis, patient haemodynamics or treatment decisions.';
export const DISCLAIMER_JA =
  'ALPHA 教育モデルです。HFpEF の一機序である左室受動的スティフネス上昇と、充満に必要な圧の増加だけを分離して示します。HFpEF は多様な病態からなる症候群であり、診断・患者血行動態の推定・治療判断には使用できません。';

export const DISCLAIMER_SHORT = 'Alpha HFpEF mechanics model — preserved EF does not imply normal filling pressure.';
export const DISCLAIMER_SHORT_JA = 'Alpha HFpEF力学モデル｜EFが保たれていても充満圧が正常とは限りません。';
