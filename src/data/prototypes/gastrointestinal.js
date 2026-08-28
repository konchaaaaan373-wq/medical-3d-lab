/** Copy for the gastrointestinal prototype scenes. All PROTOTYPE-grade. */

export const UPPER_GI = {
  id: 'upper-gi-peristalsis',
  status: 'prototype',
  title: 'Swallow & gastric mixing',
  titleJa: '嚥下と胃の蠕動',
  subtitle: 'A constriction wave down the oesophagus and around the stomach · prototype',
  subtitleJa: '食道から胃へ伝わる収縮波 ｜ プロトタイプ',

  palette: {
    esophagus: '#c9a2a6',
    stomach: '#d08a86',
    mucosa: '#f0b9ae',
    content: '#ffd166',
  },

  legend: [
    { key: 'esophagus', label: 'Oesophagus', labelJa: '食道' },
    { key: 'stomach', label: 'Stomach', labelJa: '胃' },
    { key: 'mucosa', label: 'Pylorus', labelJa: '幽門' },
    { key: 'content', label: 'Gastric contents', labelJa: '胃内容物' },
  ],

  stages: [
    {
      id: 'swallow',
      name: 'Swallow',
      nameJa: '嚥下',
      at: 0,
      summary:
        'A single ring of contraction travels down the oesophagus behind the bolus. It moves in one direction and does not depend on gravity.',
      summaryJa:
        '食塊の後ろを、1 本の収縮輪が食道を下行します。方向は一方向で、重力に依存しません。',
    },
    {
      id: 'mixing',
      name: 'Gastric mixing',
      nameJa: '胃での攪拌',
      at: 0.38,
      summary:
        'In the stomach the waves become repetitive and shallow over the body, mixing rather than propelling.',
      summaryJa:
        '胃では収縮波が反復的かつ浅くなり、胃体部では推進よりも攪拌としてはたらきます。',
    },
    {
      id: 'emptying',
      name: 'Antral pump & emptying',
      nameJa: '幽門前庭のポンプと排出',
      at: 0.72,
      summary:
        'Waves deepen towards the antrum. Most of what they push meets a closed pylorus and is driven back — only a little passes each time.',
      summaryJa:
        '収縮波は前庭部に向かうほど深くなります。押し出された内容の多くは閉じた幽門に当たって戻され、通過するのは 1 回ごとに少量です。',
    },
  ],

  range: { start: 'Resting', startJa: '安静', end: 'Emptying', endJa: '排出' },
  progressLabel: { label: 'Motility', labelJa: '運動の強さ' },

  annotations: [
    { id: 'esophagus', text: 'Oesophagus', sub: '食道', anchor: 'esophagus', range: [0, 1] },
    { id: 'cardia', text: 'Cardia', sub: '噴門', anchor: 'cardia', range: [0, 0.6], compact: false },
    { id: 'fundus', text: 'Fundus', sub: '胃底', anchor: 'fundus', range: [0.2, 1] },
    { id: 'antrum', text: 'Antrum', sub: '前庭部', anchor: 'antrum', range: [0.5, 1] },
    { id: 'pylorus', text: 'Pylorus', sub: '幽門', anchor: 'pylorus', range: [0.6, 1] },
  ],
};

export const INTESTINAL_TRANSIT = {
  id: 'intestinal-transit',
  status: 'prototype',
  title: 'Intestinal transit',
  titleJa: '腸管の輸送',
  subtitle: 'Segmentation and propulsion along small bowel and colon · prototype',
  subtitleJa: '小腸の分節運動と大腸への推進 ｜ プロトタイプ',

  palette: {
    small: '#d99a7c',
    colon: '#c58a72',
    haustra: '#e3b79b',
    content: '#ffd166',
  },

  legend: [
    { key: 'small', label: 'Small intestine', labelJa: '小腸' },
    { key: 'colon', label: 'Colon', labelJa: '大腸' },
    { key: 'haustra', label: 'Haustra', labelJa: 'ハウストラ' },
    { key: 'content', label: 'Luminal contents', labelJa: '腸管内容' },
  ],

  stages: [
    {
      id: 'segmentation',
      name: 'Segmentation',
      nameJa: '分節運動',
      at: 0,
      summary:
        'Repeated local contractions divide and re-divide the contents. They mix far more than they move: transit is slow while this dominates.',
      summaryJa:
        '局所の収縮が繰り返し内容を分割・再分割します。移動よりも混和が主で、この間の輸送はゆっくりです。',
    },
    {
      id: 'propulsion',
      name: 'Propulsive peristalsis',
      nameJa: '推進性蠕動',
      at: 0.45,
      summary:
        'Contractions organise into waves that travel in one direction, and the contents begin to move as a column rather than in place.',
      summaryJa:
        '収縮が一方向に伝わる波としてまとまり、内容は「その場で混ざる」から「列として進む」へ変わります。',
    },
    {
      id: 'colon',
      name: 'Colonic transit',
      nameJa: '大腸の輸送',
      at: 0.78,
      summary:
        'In the colon the same machinery runs slowly and in bursts, between long quiet periods, while water is absorbed.',
      summaryJa:
        '大腸では同じ仕組みがゆっくり、かつ間欠的に働きます。その間に水分が吸収されます。',
    },
  ],

  range: { start: 'Mixing', startJa: '混和', end: 'Propulsion', endJa: '推進' },
  progressLabel: { label: 'Motor pattern', labelJa: '運動パターン' },

  annotations: [
    { id: 'small', text: 'Small intestine', sub: '小腸', anchor: 'small', range: [0, 1] },
    { id: 'ileocecal', text: 'Ileocaecal junction', sub: '回盲部', anchor: 'ileocecal', range: [0.5, 1], compact: false },
    { id: 'ascending', text: 'Ascending colon', sub: '上行結腸', anchor: 'ascending', range: [0.65, 1] },
    { id: 'transverse', text: 'Transverse colon', sub: '横行結腸', anchor: 'transverse', range: [0.65, 1], compact: false },
    { id: 'sigmoid', text: 'Sigmoid', sub: 'S状結腸', anchor: 'sigmoid', range: [0.65, 1] },
  ],
};
