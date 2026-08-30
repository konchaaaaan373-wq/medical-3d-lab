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
    { key: 'resorption', label: 'Resorption (first)', labelJa: '骨吸収（先行）' },
    { key: 'formation', label: 'Formation (follows)', labelJa: '骨形成（後続）' },
  ],

  stages: [
    {
      id: 'balanced',
      name: 'Balanced turnover',
      nameJa: '均衡した代謝回転',
      at: 0,
      summary:
        'At each site the sequence is fixed: resorption first, a reversal pause, then formation into the space that was made. Sites run out of step with one another, so the bone is always busy while its shape holds.',
      summaryJa:
        '各部位で順序は決まっています。まず吸収、次に反転期、そして掘られた空間へ形成が続きます。部位ごとに位相がずれているため、形が保たれたまま常にどこかで代謝回転が起きています。',
    },
    {
      id: 'tilted',
      name: 'Resorption ahead',
      nameJa: '吸収優位',
      at: 0.45,
      summary:
        'When each cycle puts back less than it took, the deficit accumulates. What you see is the sum of years of cycles, not the bone moved by the ones on screen — the loss shows up first on the inner surface.',
      summaryJa:
        '1 回の回転で戻す量が取った量を下回ると、不足が蓄積します。画面に見えているのは数年分の累積であって、いま動いている数回転の量ではありません。変化はまず内側の面に現れます。',
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

  range: { start: 'Balanced', startJa: '均衡', end: 'Negative balance', endJa: '負の均衡' },
  progressLabel: { label: 'Remodelling balance (accumulated)', labelJa: 'リモデリング均衡（累積）' },

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
  subtitle: 'Twitch to fused tetanus as stimulation frequency rises · prototype',
  subtitleJa: '刺激頻度の上昇にともなう単収縮から強縮まで ｜ プロトタイプ',

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
    { key: 'twitch', label: 'Stimulus at the motor point', labelJa: '刺激（運動点）', activeFrom: 0.02 },
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
      name: 'Single twitches',
      nameJa: '単収縮',
      at: 0.24,
      summary:
        'Widely spaced stimuli produce separate twitches. Each one relaxes completely before the next arrives.',
      summaryJa:
        '刺激の間隔が広いうちは、単収縮が個別に現れます。次の刺激が来る前に完全に弛緩します。',
    },
    {
      id: 'summation',
      name: 'Summation',
      nameJa: '加重',
      at: 0.46,
      summary:
        'Stimuli arrive before relaxation is complete, so each contraction starts from a shortened state and adds to the last.',
      summaryJa:
        '弛緩が完了する前に次の刺激が届くため、短縮した状態から次の収縮が加わります（加重）。',
    },
    {
      id: 'incomplete-tetanus',
      name: 'Incomplete tetanus',
      nameJa: '不完全強縮',
      at: 0.66,
      summary:
        'The contractions merge but still ripple: the muscle no longer returns to rest between stimuli.',
      summaryJa:
        '収縮は融合しつつも波打ちが残ります。刺激の間に安静長へ戻らなくなります。',
    },
    {
      id: 'fused-tetanus',
      name: 'Fused tetanus',
      nameJa: '完全強縮',
      at: 0.84,
      summary:
        'At high frequency the ripple disappears and the shortening is smooth and sustained. This is a concentric shortening with nothing to pull against — no load, no joint, and no force is being represented.',
      summaryJa:
        '高頻度では波打ちが消え、滑らかで持続的な短縮になります。ここでは負荷も関節もない求心性短縮として描いており、張力そのものは表していません。',
    },
  ],

  range: { start: 'Low', startJa: '低頻度', end: 'High', endJa: '高頻度' },
  progressLabel: { label: 'Stimulation frequency', labelJa: '刺激頻度' },

  annotations: [
    { id: 'belly', text: 'Muscle belly', sub: '筋腹', anchor: 'belly', range: [0, 1] },
    { id: 'tendon', text: 'Tendon', sub: '腱', anchor: 'tendon', range: [0, 1] },
    { id: 'fascicle', text: 'Fascicle', sub: '筋束', anchor: 'fascicle', range: [0.25, 1], compact: false },
  ],
};
