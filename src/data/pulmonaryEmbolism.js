export const PALETTE = Object.freeze({
  lung: '#d88e98',
  air: '#79d8e6',
  perfusion: '#cc5262',
  underperfused: '#74818d',
  embolus: '#e0a049',
});

export const LEGEND = Object.freeze([
  { key: 'air', label: 'Ventilation continues', labelJa: '保たれる換気' },
  { key: 'perfusion', label: 'Pulmonary perfusion', labelJa: '肺灌流' },
  { key: 'embolus', label: 'Vascular obstruction', labelJa: '血管閉塞' },
]);

export const STAGES = Object.freeze([
  {
    id: 'matched',
    name: 'Matched ventilation and perfusion',
    nameJa: '換気と灌流が対応',
    at: 0,
    summary: 'Every modelled territory receives both ventilation and pulmonary blood flow.',
    summaryJa: 'すべてのモデル領域に換気と肺血流があります。',
  },
  {
    id: 'segmental',
    name: 'Pulmonary vascular obstruction',
    nameJa: '肺血管の閉塞',
    at: 0.25,
    summary: 'Ventilation continues beyond an obstructed vessel while perfusion falls: alveolar dead space appears.',
    summaryJa: '閉塞血管の先でも換気は続きますが灌流は低下し、肺胞死腔が生じます。',
  },
  {
    id: 'redistribution',
    name: 'More underperfused ventilation',
    nameJa: '無効換気の増加',
    at: 0.52,
    summary: 'A larger share of inspired gas reaches territories with little blood flow and cannot exchange gas there.',
    summaryJa: '吸気のより大きな割合が血流の乏しい領域へ届き、その場ではガス交換に使われません。',
  },
  {
    id: 'afterload',
    name: 'Pulmonary vascular load rises',
    nameJa: '肺血管負荷の上昇',
    at: 0.82,
    summary: 'Removing parallel vascular pathways raises relative pulmonary vascular resistance and therefore RV afterload.',
    summaryJa: '並列の肺血管経路が失われると相対的な肺血管抵抗が上昇し、右室後負荷が増えます。',
  },
]);

export const RANGE = Object.freeze({ min: 0, max: 1, step: 0.01 });
export const PROGRESS_LABEL = Object.freeze({
  label: 'Obstructed vascular territory in this teaching lung',
  labelJa: 'この概念肺での閉塞血管領域',
});

export const MODEL_SCOPE = Object.freeze({
  question:
    'Why can ventilation continue beyond an obstructed pulmonary vessel, and why does vascular load rise?',
  questionJa:
    '肺血管が閉塞してもその先の換気が続くのはなぜか。また肺血管負荷はなぜ上がるのか。',
  answers: [
    {
      text: 'Vascular obstruction removes distal perfusion without mechanically stopping ventilation in the paired model territory.',
      textJa: '血管閉塞は、そのモデル領域の換気を機械的に止めずに末梢灌流を失わせます。',
    },
    {
      text: 'Removing parallel vascular conductance raises relative pulmonary vascular resistance and therefore RV afterload.',
      textJa: '並列血管のコンダクタンスが失われると相対肺血管抵抗が上がり、右室後負荷が増えます。',
    },
  ],
  excludes: [
    {
      text: 'Pulmonary artery pressure, changing cardiac output, RV geometry or function, RV–pulmonary artery coupling and shock.',
      textJa: '肺動脈圧、心拍出量の変化、右室形態・機能、右室–肺動脈カップリング、ショック。',
    },
    {
      text: 'Clinical VD/VT, oxygenation, imaging clot burden, risk category, diagnosis and anticoagulation or reperfusion selection.',
      textJa: '臨床的VD/VT、酸素化、画像上の血栓量、リスク分類、診断、抗凝固・再灌流治療の選択。',
    },
  ],
  cautions: [
    {
      text: '**Relative PVR is the inverse conductance of this fixed-pressure teaching network, not measured PVR.**',
      textJa: '**相対PVRは固定圧の概念ネットワークの逆コンダクタンスであり、実測PVRではありません。**',
    },
    {
      text: 'Twelve equal parallel territories are not a pulmonary arterial tree and cannot be read as CT clot burden.',
      textJa: '12本の等しい並列領域は肺動脈樹ではなく、CT上の血栓量として読めません。',
    },
  ],
  sources: [
    {
      text: 'ESC/ERS pulmonary embolism guidance for obstruction, pulmonary vascular resistance and RV afterload.',
      textJa: 'ESC/ERS肺塞栓症ガイドライン。閉塞、肺血管抵抗、右室後負荷。',
      kind: 'guideline',
    },
    {
      text: 'Goldhaber and Elliott (Circulation, 2003) and Robertson (European Respiratory Journal, 2015) for ventilated underperfused units and dead space.',
      textJa: 'Goldhaber & Elliott（Circulation、2003）およびRobertson（European Respiratory Journal、2015）。換気される低灌流領域と死腔。',
      kind: 'review',
    },
  ],
  evidence: 'docs/model-evidence/pulmonary-embolism.md',
});

export const DISCLAIMER =
  'Educational parallel-vessel model of pulmonary embolic obstruction. Its indices are not VD/VT, pulmonary artery pressure, RV function, clot burden on imaging, a risk category, or a treatment recommendation.';
export const DISCLAIMER_JA =
  '肺塞栓による血管閉塞を並列血管で表した教育用モデルです。表示する指標はVD/VT、肺動脈圧、右室機能、画像上の血栓量、リスク分類、治療推奨ではありません。';
export const DISCLAIMER_SHORT = 'Conceptual perfusion model — not diagnosis, risk scoring or treatment guidance.';
export const DISCLAIMER_SHORT_JA = '灌流の概念モデルであり、診断・重症度判定・治療支援ではありません。';
