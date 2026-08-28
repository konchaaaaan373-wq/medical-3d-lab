/** Copy for the whole-body overview. PROTOTYPE-grade. */

export const BODY_OVERVIEW = {
  id: 'body-overview',
  status: 'prototype',
  title: 'Human body overview',
  titleJa: '全身の概観',
  subtitle: 'Where the organ scenes sit, and roughly where they are · prototype',
  subtitleJa: '各臓器シーンの位置関係 ｜ プロトタイプ',

  palette: {
    nervous: '#c8b3d8',
    cardiovascular: '#b8444c',
    respiratory: '#d98d95',
    digestive: '#d99a7c',
    renal: '#a0555c',
  },

  legend: [
    { key: 'nervous', label: 'Nervous', labelJa: '神経', activeFrom: 0 },
    { key: 'cardiovascular', label: 'Cardiovascular', labelJa: '循環器', activeFrom: 0.18 },
    { key: 'respiratory', label: 'Respiratory', labelJa: '呼吸器', activeFrom: 0.36 },
    { key: 'digestive', label: 'Digestive', labelJa: '消化器', activeFrom: 0.56 },
    { key: 'renal', label: 'Renal & urinary', labelJa: '腎・泌尿器', activeFrom: 0.78 },
  ],

  /**
   * The progression assembles the body one system at a time. It is a tour of
   * the catalogue, not a physiological or developmental sequence — the systems
   * are all there at once in a real body, and the order below is the order they
   * are easiest to place.
   */
  stages: [
    {
      id: 'nervous',
      name: 'Nervous system',
      nameJa: '神経系',
      at: 0,
      summary:
        'Every scene in this project sits somewhere in one body. Starting at the top: the brain, and the amyloid-β scene that looks inside it.',
      summaryJa:
        'このプロジェクトのすべてのシーンは、1 つの身体のどこかにあります。まず頭部 — 脳と、その中を見るアミロイドβのシーンです。',
    },
    {
      id: 'cardiovascular',
      name: 'Cardiovascular',
      nameJa: '循環器',
      at: 0.18,
      summary:
        'The heart, slightly left of the midline and tilted, with its apex pointing down and forwards. The heart-failure scene lives here.',
      summaryJa:
        '心臓は正中よりやや左に、心尖を左下前方に向けて位置します。心不全シーンはここにあります。',
    },
    {
      id: 'respiratory',
      name: 'Respiratory',
      nameJa: '呼吸器',
      at: 0.36,
      summary:
        'The lungs occupy most of the chest around the heart — which is why the left lung is notched and the right is not.',
      summaryJa:
        '肺は心臓を囲むように胸腔の大半を占めます。左肺に心切痕があり右肺にはないのはこのためです。',
    },
    {
      id: 'digestive',
      name: 'Digestive',
      nameJa: '消化器',
      at: 0.56,
      summary:
        'Liver, stomach and bowel fill the abdomen. Everything absorbed here reaches the liver before it reaches anywhere else.',
      summaryJa:
        '肝臓・胃・腸管が腹腔を満たします。ここで吸収されたものは、どこよりも先に肝臓へ到達します。',
    },
    {
      id: 'renal',
      name: 'Renal & urinary',
      nameJa: '腎・泌尿器',
      at: 0.78,
      summary:
        'The kidneys sit behind everything else, against the back wall, with the route down to the bladder in front of the spine.',
      summaryJa:
        '腎臓は他の臓器より後方、後腹壁側にあります。そこから膀胱へ向かう経路が脊柱の前を下行します。',
    },
  ],

  range: { start: 'Head', startJa: '頭部', end: 'Pelvis', endJa: '骨盤' },
  progressLabel: { label: 'Systems shown', labelJa: '表示中の系統' },

  annotations: [
    { id: 'brain', text: 'Brain', sub: '脳', anchor: 'brain', range: [0, 1] },
    { id: 'heart', text: 'Heart', sub: '心臓', anchor: 'heart', range: [0.18, 1] },
    { id: 'lungs', text: 'Lungs', sub: '肺', anchor: 'lungs', range: [0.36, 1] },
    { id: 'liver', text: 'Liver', sub: '肝臓', anchor: 'liver', range: [0.56, 1] },
    { id: 'stomach', text: 'Stomach', sub: '胃', anchor: 'stomach', range: [0.56, 1], compact: false },
    { id: 'intestine', text: 'Intestine', sub: '腸管', anchor: 'intestine', range: [0.56, 1], compact: false },
    { id: 'kidney', text: 'Kidneys', sub: '腎臓', anchor: 'kidney', range: [0.78, 1] },
    { id: 'bladder', text: 'Bladder', sub: '膀胱', anchor: 'bladder', range: [0.78, 1], compact: false },
  ],
};
