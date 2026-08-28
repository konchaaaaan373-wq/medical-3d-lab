/** Copy for the haematologic / lymphatic prototype scene. PROTOTYPE-grade. */

export const SPLEEN_FILTRATION = {
  id: 'spleen-filtration',
  status: 'prototype',
  title: 'Splenic filtration',
  titleJa: '脾臓での血球処理',
  subtitle: 'Red cells crossing the pulp — most pass, some are retained · prototype',
  subtitleJa: '脾髄を通る赤血球 — 多くは通過し、一部は捕捉される ｜ プロトタイプ',

  palette: {
    spleen: '#7c3f52',
    artery: '#e0575f',
    vein: '#6f7fd6',
    retained: '#ffb066',
  },

  legend: [
    { key: 'spleen', label: 'Spleen', labelJa: '脾臓' },
    { key: 'artery', label: 'Inflow', labelJa: '流入（脾動脈）' },
    { key: 'vein', label: 'Outflow', labelJa: '流出（脾静脈）' },
    { key: 'retained', label: 'Retained cells', labelJa: '捕捉される血球', activeFrom: 0.3 },
  ],

  stages: [
    {
      id: 'transit',
      name: 'Transit',
      nameJa: '通過',
      at: 0,
      summary:
        'Blood entering the spleen has to squeeze through the pulp before it can leave. Healthy, flexible red cells make the crossing and rejoin the circulation.',
      summaryJa:
        '脾臓に入った血液は、脾髄を通り抜けなければ出ていけません。柔軟な正常赤血球はここを通過して循環に戻ります。',
    },
    {
      id: 'retention',
      name: 'Retention',
      nameJa: '捕捉',
      at: 0.4,
      summary:
        'Cells that have lost that flexibility do not get through. The spleen filters by making the exit difficult rather than by inspecting anything.',
      summaryJa:
        '柔軟性を失った赤血球は通り抜けられません。脾臓は「調べて選ぶ」のではなく、出口を狭くすることで選別しています。',
    },
    {
      id: 'load',
      name: 'Increased load',
      nameJa: '負荷の増大',
      at: 0.75,
      summary:
        'When more cells are abnormal, more are held back — and the organ that has to hold them enlarges.',
      summaryJa:
        '異常な血球が増えるほど捕捉される量も増え、それを担う脾臓自体が腫大していきます。',
    },
  ],

  range: { start: 'Few', startJa: '少', end: 'Many', endJa: '多' },
  progressLabel: { label: 'Proportion of stiffened cells', labelJa: '変形能を失った血球の割合' },

  annotations: [
    { id: 'spleen', text: 'Spleen', sub: '脾臓', anchor: 'spleen', range: [0, 1] },
    { id: 'hilum', text: 'Hilum', sub: '脾門', anchor: 'hilum', range: [0, 1], compact: false },
    { id: 'pulp', text: 'Red pulp', sub: '赤脾髄', anchor: 'pulp', range: [0.3, 1] },
  ],
};
