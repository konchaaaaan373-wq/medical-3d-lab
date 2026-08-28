/** Copy for the musculoskeletal prototype scenes. All PROTOTYPE-grade. */

export const BONE_REMODELING = {
  id: 'bone-remodeling',
  status: 'prototype',
  title: 'Bone remodelling',
  titleJa: '骨のリモデリング',
  subtitle: 'Resorption and formation, and what happens when they stop matching · prototype',
  subtitleJa: '骨吸収と骨形成、そのバランスが崩れるとき ｜ プロトタイプ',

  palette: {
    cortex: '#ece7d8',
    marrow: '#c26b6b',
    resorption: '#ff8a5c',
    formation: '#7fd6ff',
  },

  legend: [
    { key: 'cortex', label: 'Cortical bone', labelJa: '皮質骨' },
    { key: 'marrow', label: 'Marrow cavity', labelJa: '骨髄腔' },
    { key: 'resorption', label: 'Resorption', labelJa: '骨吸収' },
    { key: 'formation', label: 'Formation', labelJa: '骨形成' },
  ],

  stages: [
    {
      id: 'balanced',
      name: 'Balanced turnover',
      nameJa: '均衡した代謝回転',
      at: 0,
      summary:
        'Bone is not inert. It is continuously removed and replaced, and while the two match, the shape stays the same.',
      summaryJa:
        '骨は不活性な構造ではなく、絶えず吸収と形成を繰り返しています。両者が釣り合っている限り、形は変わりません。',
    },
    {
      id: 'tilted',
      name: 'Resorption ahead',
      nameJa: '吸収優位',
      at: 0.45,
      summary:
        'When removal runs ahead of replacement, the loss shows up first on the inner surface: the marrow cavity widens and the cortex thins.',
      summaryJa:
        '吸収が形成を上回ると、まず内側の面に変化が現れます。骨髄腔が広がり、皮質骨が薄くなります。',
    },
    {
      id: 'thinned',
      name: 'Thinned cortex',
      nameJa: '皮質の菲薄化',
      at: 0.78,
      summary:
        'The outside can even grow a little while this happens, so a bone may be no narrower and still much weaker.',
      summaryJa:
        'この間に外径はむしろわずかに増えることがあります。外から見た太さが変わらないまま強度だけが落ちるのはこのためです。',
    },
  ],

  range: { start: 'Balanced', startJa: '均衡', end: 'Resorption ahead', endJa: '吸収優位' },
  progressLabel: { label: 'Remodelling balance', labelJa: 'リモデリングの均衡' },

  annotations: [
    { id: 'cortex', text: 'Cortical bone', sub: '皮質骨', anchor: 'cortex', range: [0, 1] },
    { id: 'marrow', text: 'Marrow cavity', sub: '骨髄腔', anchor: 'marrow', range: [0, 1] },
    { id: 'metaphysis', text: 'Metaphysis', sub: '骨幹端', anchor: 'metaphysis', range: [0, 0.5], compact: false },
  ],
};

export const MUSCLE_CONTRACTION = {
  id: 'muscle-contraction',
  status: 'prototype',
  title: 'Muscle contraction',
  titleJa: '骨格筋の収縮',
  subtitle: 'A belly shortening between tendons as recruitment rises · prototype',
  subtitleJa: '動員の増加とともに腱の間で短縮する筋腹 ｜ プロトタイプ',

  palette: {
    muscle: '#b3454a',
    fascicle: '#d9737a',
    tendon: '#e6e0d2',
    twitch: '#ffd166',
  },

  legend: [
    { key: 'muscle', label: 'Muscle belly', labelJa: '筋腹' },
    { key: 'fascicle', label: 'Fascicles', labelJa: '筋束' },
    { key: 'tendon', label: 'Tendon', labelJa: '腱' },
    { key: 'twitch', label: 'Activation', labelJa: '活動' },
  ],

  stages: [
    {
      id: 'rest',
      name: 'At rest',
      nameJa: '安静',
      at: 0,
      summary:
        'The muscle is at its resting length. Tendons transmit whatever the belly does; they are not what shortens.',
      summaryJa:
        '筋は安静長にあります。腱は筋腹の発生した力を伝えるだけで、短縮するのは腱ではありません。',
    },
    {
      id: 'twitch',
      name: 'Individual twitches',
      nameJa: '単収縮',
      at: 0.3,
      summary:
        'Low activation produces separate twitches, with visible relaxation between them.',
      summaryJa:
        '活動が弱いうちは個々の単収縮が分離しており、その間に弛緩が見えます。',
    },
    {
      id: 'tetanus',
      name: 'Fused contraction',
      nameJa: '強縮',
      at: 0.68,
      summary:
        'As activation rises the twitches merge into a smooth, sustained shortening — the belly gets shorter and thicker, while its volume barely changes.',
      summaryJa:
        '活動が強まると単収縮が融合し、滑らかで持続的な短縮になります。筋腹は短く太くなり、体積はほとんど変わりません。',
    },
  ],

  range: { start: 'Rest', startJa: '安静', end: 'Maximal', endJa: '最大' },
  progressLabel: { label: 'Activation', labelJa: '活動の強さ' },

  annotations: [
    { id: 'belly', text: 'Muscle belly', sub: '筋腹', anchor: 'belly', range: [0, 1] },
    { id: 'tendon', text: 'Tendon', sub: '腱', anchor: 'tendon', range: [0, 1] },
    { id: 'fascicle', text: 'Fascicle', sub: '筋束', anchor: 'fascicle', range: [0.25, 1], compact: false },
  ],
};
