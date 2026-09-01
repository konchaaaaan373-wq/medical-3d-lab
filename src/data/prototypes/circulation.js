/** Copy for the minimal circulation check. Prototype-grade. */

export const CIRCULATION = {
  id: 'circulation',
  status: 'prototype',
  title: 'Is circulation maintained?',
  titleJa: '循環、保たれてる？',
  subtitle: 'MAP 70 is not the whole answer · one low-output teaching case',
  subtitleJa: 'MAP 70だけでは答えにならない ｜ 低拍出の単一概念症例',

  // This scene has one clinical state and two interventions, not a trajectory.
  // Removing the progression axis is a deliberate reduction in parameters.
  progression: { enabled: false },
  modelControls: {
    primary: true,
    placement: 'console',
    title: 'Try one intervention',
    titleJa: '介入を1つ試す',
    subtitle: 'Each press advances one illustrative step. Reset to compare again.',
    subtitleJa: '1回押すごとに1段階。戻して比べられます。',
  },

  palette: {
    output: '#ff6f86',
    pressure: '#58d9f2',
    delivery: '#ffd166',
  },

  legend: [
    { key: 'output', label: 'Flow / cardiac output', labelJa: '血流・心拍出量', activeFrom: 0 },
    { key: 'pressure', label: 'Arterial pressure', labelJa: '動脈圧', activeFrom: 0 },
    { key: 'delivery', label: 'Oxygen reaching tissue', labelJa: '末梢へ届く酸素', activeFrom: 0 },
  ],

  stages: [
    {
      id: 'map-trap',
      name: 'MAP 70 — enough?',
      nameJa: 'MAP 70。それで十分？',
      at: 0,
      summary:
        'MAP is 70 mmHg, yet cardiac output is only 3.6 L/min in this constructed case. Press fluid or DOB and watch whether oxygen delivery moves with MAP or with flow. Fluid responsiveness is assumed; effect sizes are illustrative, not treatment predictions.',
      summaryJa:
        'MAPは70 mmHgですが、この概念症例の心拍出量は3.6 L/minです。輸液かDOBを押し、末梢への酸素供給がMAPと血流のどちらに強く連動するかを見ます。輸液反応性ありの設定で、効果量は例示です。治療予測には使えません。',
    },
  ],

  annotations: [
    { id: 'co', text: 'Cardiac output', sub: '心拍出量 CO', anchor: 'co', range: [0, 1], lead: [-25, -88] },
    { id: 'map', text: 'Arterial pressure', sub: '平均血圧 MAP', anchor: 'map', range: [0, 1], lead: [10, -78] },
    { id: 'do2', text: 'Oxygen delivery', sub: '酸素供給 DO₂', anchor: 'do2', range: [0, 1], lead: [52, -72] },
  ],
};

