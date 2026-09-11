export const PALETTE = Object.freeze({
  lung: '#d88e98',
  air: '#79d8e6',
  perfusion: '#d9505c',
  consolidation: '#d7a344',
});

export const LEGEND = Object.freeze([
  { key: 'air', label: 'Regional ventilation', labelJa: '局所換気' },
  { key: 'perfusion', label: 'Perfusion that persists', labelJa: '残る灌流' },
  { key: 'consolidation', label: 'Alveolar consolidation', labelJa: '肺胞性コンソリデーション' },
]);

export const STAGES = Object.freeze([
  {
    id: 'aerated',
    name: 'Aerated lung',
    nameJa: '含気のある肺',
    at: 0,
    summary: 'Ventilation and perfusion meet in every modelled region.',
    summaryJa: 'すべてのモデル領域で換気と灌流が対応しています。',
  },
  {
    id: 'focal',
    name: 'Focal consolidation',
    nameJa: '限局性コンソリデーション',
    at: 0.22,
    summary: 'Alveolar air is replaced by inflammatory fluid and cells in a focal region, so ventilation falls there.',
    summaryJa: '限局した肺胞で空気が炎症性の液体・細胞に置き換わり、その領域の換気が低下します。',
  },
  {
    id: 'shunt',
    name: 'Perfused but not ventilated',
    nameJa: '灌流はあるが換気されない',
    at: 0.5,
    summary: 'Blood still crosses consolidated units. That perfused, poorly ventilated fraction is the shunt mechanism shown here.',
    summaryJa: 'コンソリデーション領域にも血流は残ります。この「灌流はあるが換気されない」割合が、ここで示すシャント機序です。',
  },
  {
    id: 'multifocal',
    name: 'Larger involved fraction',
    nameJa: '病変範囲の拡大',
    at: 0.82,
    summary: 'More regional perfusion reaches non-aerated units, while hypoxic vasoconstriction can only partly divert it. The axis stops at 60% of this lung; total consolidation is a solver boundary, not a stage.',
    summaryJa: '含気を失った領域へ流れる血液の割合が増え、低酸素性肺血管収縮による血流転換だけでは補い切れません。教材軸はこの概念肺の60%で止まり、全肺コンソリデーションは病期ではなくソルバーの境界です。',
  },
]);

export const RANGE = Object.freeze({ min: 0, max: 1, step: 0.01 });
export const PROGRESS_LABEL = Object.freeze({
  label: 'Teaching axis · full travel consolidates 60% of this conceptual lung',
  labelJa: '教材軸 ｜ 右端でこの概念肺の60%がコンソリデーション',
});

export const MODEL_SCOPE = Object.freeze({
  question:
    'Why does alveolar consolidation impair gas exchange when pulmonary perfusion continues?',
  questionJa:
    '肺胞性コンソリデーションがあり、肺灌流が残ると、なぜガス交換が障害されるのか。',
  answers: [
    {
      text: 'The consolidated share of a regional unit is not ventilated, while its perfusion is only partly diverted.',
      textJa: '領域内のコンソリデーション部分は換気されず、そこへの灌流は一部しか転換されません。',
    },
    {
      text: 'Perfusion through that non-ventilated share is the intrapulmonary-shunt mechanism represented here.',
      textJa: 'その非換気部分を通過する灌流が、このモデルで表す肺内シャント機序です。',
    },
  ],
  excludes: [
    {
      text: 'Pathogen, immune response, airway secretions, compliance, respiratory drive and time course.',
      textJa: '起因菌、免疫反応、気道分泌物、コンプライアンス、呼吸ドライブ、時間経過。',
    },
    {
      text: 'PaO2, SpO2, imaging, diagnosis, antimicrobial choice and respiratory-support selection.',
      textJa: 'PaO₂、SpO₂、画像、診断、抗菌薬選択、呼吸管理の選択。',
    },
  ],
  cautions: [
    {
      text: '**The percentages are fractions of twelve illustrative model units, not patient measurements or thresholds.**',
      textJa: '**表示する割合は12個の模式的モデル領域内の値で、患者の測定値や閾値ではありません。**',
    },
    {
      text: 'The spatial order is chosen for legibility and is not a lobar, segmental or radiographic distribution.',
      textJa: '空間的な並びは見やすさのためで、肺葉・肺区域・画像上の分布を表しません。',
    },
    {
      text: 'The slider is a teaching axis whose full travel consolidates 60% of this conceptual lung. The solver accepts 0–100%, and 100% is a boundary check (no ventilation, perfusion retained), not a stage of pneumonia.',
      textJa: 'スライダーは教材軸で、右端でこの概念肺の60%がコンソリデーションになります。ソルバー自体は0〜100%を受け付けますが、100%は「換気ゼロ・灌流残存」を確かめる境界条件であり、肺炎の病期ではありません。',
    },
  ],
  sources: [
    {
      text: 'Slobod et al., Annals of Intensive Care (2022), for the distinction between shunt and dead-space mechanisms in regional V/Q mismatch.',
      textJa: 'Slobodら、Annals of Intensive Care（2022）。局所V/Q不均衡におけるシャントと死腔の区別。',
      kind: 'review',
    },
    {
      text: 'ATS/IDSA adult community-acquired pneumonia guideline for the clinical diagnosis and treatment boundary.',
      textJa: 'ATS/IDSA成人市中肺炎ガイドライン。臨床診断・治療との境界。',
      kind: 'guideline',
    },
  ],
  evidence: 'docs/model-evidence/pneumonia.md',
});

export const DISCLAIMER =
  'Educational regional V/Q model of alveolar consolidation. It does not identify a pathogen, reproduce an image, calculate PaO2 or SpO2, predict a patient course, or recommend antimicrobial or respiratory treatment.';
export const DISCLAIMER_JA =
  '肺胞性コンソリデーションを扱う教育用の局所V/Qモデルです。起因菌の同定、画像所見の再現、PaO2・SpO2の算出、患者経過の予測、抗菌薬・呼吸管理の推奨は行いません。';
export const DISCLAIMER_SHORT = 'Conceptual V/Q model — not diagnosis or treatment guidance.';
export const DISCLAIMER_SHORT_JA = 'V/Qの概念モデルであり、診断・治療支援ではありません。';

/**
 * The neighbours, and the sentence that has to travel with them.
 *
 * The embolism scene is the mirror of this one and is the most useful thing to
 * read next: both are about air and blood failing to meet, and they fail in
 * opposite directions. The oedema scene fills the same air spaces with
 * something else and does solve the blood values this one does not — which is
 * exactly why they must not be read as one model.
 */
export const RELATED = {
  scenes: [
    {
      slug: 'pulmonary-embolism',
      label: 'Embolism: the opposite mismatch',
      labelJa: '肺塞栓：逆向きの不一致',
      why: 'Air arriving where blood cannot, rather than blood arriving where air cannot.',
      whyJa: '血液の来ない場所に空気が届く状態です。こことは向きが逆です。',
    },
    {
      slug: 'pulmonary-edema',
      label: 'Oedema: the same sacs, filled with water',
      labelJa: '肺水腫：同じ袋が水で満たされる',
      why: 'A different thing filling the air spaces — and a model that does solve the blood values this one leaves out.',
      whyJa: '空気の場所を満たすものが異なります。こちらが扱わない血液の値を、あちらのモデルは解きます。',
    },
  ],
  note: 'These are separate models, not stages of one lung. Nothing computed here is carried into them, and nothing they show is carried back.',
  noteJa: 'いずれも別々のモデルであり、1 つの肺の段階ではありません。ここで計算した値は持ち込まれず、向こうの値もここへは入りません。',
};
