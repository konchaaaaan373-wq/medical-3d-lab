/** Copy for the endocrine prototype scenes. All PROTOTYPE-grade. */

export const THYROID_HORMONE = {
  id: 'thyroid-hormone',
  status: 'prototype',
  title: 'Thyroid hormone release',
  titleJa: '甲状腺ホルモンの放出',
  subtitle: 'Follicles releasing into the blood as stimulation rises · prototype',
  subtitleJa: '刺激に応じて濾胞から血中へ ｜ プロトタイプ',

  palette: {
    gland: '#b4565f',
    follicle: '#ffd9a0',
    trachea: '#7f8b9e',
    hormone: '#ffb066',
  },

  legend: [
    { key: 'gland', label: 'Thyroid', labelJa: '甲状腺' },
    { key: 'follicle', label: 'Follicle', labelJa: '濾胞' },
    { key: 'trachea', label: 'Trachea', labelJa: '気管' },
    { key: 'hormone', label: 'Hormone into blood', labelJa: '血中へのホルモン' },
  ],

  stages: [
    {
      id: 'baseline',
      name: 'Baseline',
      nameJa: '基礎分泌',
      at: 0,
      summary:
        'The thyroid stores its product outside the cells, in follicles — unusual among glands, and the reason it can keep releasing for a long time.',
      summaryJa:
        '甲状腺はホルモンを細胞外の濾胞内に貯蔵します。内分泌腺としては珍しい仕組みで、長期間放出を続けられる理由でもあります。',
    },
    {
      id: 'stimulated',
      name: 'Stimulated',
      nameJa: '刺激時',
      at: 0.45,
      summary:
        'Stimulation increases release from the stored pool into the surrounding capillaries; the follicles give up their contents rather than making them on demand.',
      summaryJa:
        '刺激により、貯蔵されたホルモンが周囲の毛細血管へ放出されます。その場で新規に作るのではなく、蓄えを放出する形です。',
    },
    {
      id: 'sustained',
      name: 'Sustained release',
      nameJa: '持続的な放出',
      at: 0.78,
      summary:
        'Because the store is large, output can stay high for a long time — which is also why the effects of too much of it come on slowly.',
      summaryJa:
        '貯蔵量が大きいため、高い放出を長く維持できます。過剰状態の影響がゆっくり現れる理由でもあります。',
    },
  ],

  range: { start: 'Low', startJa: '低', end: 'High', endJa: '高' },
  progressLabel: { label: 'Stimulation', labelJa: '刺激の強さ' },

  annotations: [
    { id: 'right-lobe', text: 'Right lobe', sub: '右葉', anchor: 'rightLobe', range: [0, 1] },
    { id: 'left-lobe', text: 'Left lobe', sub: '左葉', anchor: 'leftLobe', range: [0, 1], compact: false },
    { id: 'isthmus', text: 'Isthmus', sub: '峡部', anchor: 'isthmus', range: [0, 1] },
    { id: 'follicle', text: 'Follicle', sub: '濾胞', anchor: 'follicle', range: [0.3, 1] },
    { id: 'trachea', text: 'Trachea', sub: '気管', anchor: 'trachea', range: [0, 0.5], compact: false },
  ],
};

export const ADRENAL_RESPONSE = {
  id: 'adrenal-response',
  status: 'prototype',
  title: 'Adrenal response',
  titleJa: '副腎の反応',
  subtitle: 'Two glands in one capsule, on two different clocks · prototype',
  subtitleJa: '1 つの被膜に入った 2 つの腺と、その時間差 ｜ プロトタイプ',

  palette: {
    cortex: '#e8c88a',
    medulla: '#9c6bd8',
    kidney: '#a0555c',
    fast: '#c08cff',
    slow: '#ffd08a',
  },

  legend: [
    { key: 'cortex', label: 'Cortex', labelJa: '皮質' },
    { key: 'medulla', label: 'Medulla', labelJa: '髄質' },
    { key: 'fast', label: 'Immediate release', labelJa: '即時の分泌' },
    { key: 'slow', label: 'Slower release', labelJa: '遅れて立ち上がる分泌' },
  ],

  stages: [
    {
      id: 'baseline',
      name: 'Baseline',
      nameJa: '安静時',
      at: 0,
      summary:
        'At rest both parts of the gland release a little. They sit inside one capsule but they are not one gland.',
      summaryJa:
        '安静時にも皮質・髄質ともに少量を分泌しています。1 つの被膜に収まっていますが、機能的には別の腺です。',
    },
    {
      id: 'immediate',
      name: 'Immediate response',
      nameJa: '即時反応',
      at: 0.35,
      summary:
        'The medulla responds within seconds, directly along a nerve supply — the fast half of the response.',
      summaryJa:
        '髄質は神経支配を介して数秒で反応します。反応のうち速い側を担います。',
    },
    {
      id: 'sustained',
      name: 'Sustained response',
      nameJa: '持続反応',
      at: 0.7,
      summary:
        'The cortex answers more slowly, through a hormonal route, and keeps going long after the immediate response has faded.',
      summaryJa:
        '皮質はホルモンを介してより遅れて応答し、即時反応が収まったあとも長く持続します。',
    },
  ],

  range: { start: 'Rest', startJa: '安静', end: 'Stress', endJa: 'ストレス' },
  progressLabel: { label: 'Stress response', labelJa: 'ストレス反応' },

  annotations: [
    { id: 'cortex', text: 'Cortex', sub: '皮質', anchor: 'cortex', range: [0, 1] },
    { id: 'medulla', text: 'Medulla', sub: '髄質', anchor: 'medulla', range: [0, 1] },
    { id: 'kidney', text: 'Kidney', sub: '腎臓', anchor: 'kidney', range: [0, 0.6], compact: false },
    { id: 'vein', text: 'To the bloodstream', sub: '血中へ', anchor: 'vein', range: [0.3, 1], compact: false },
  ],
};
