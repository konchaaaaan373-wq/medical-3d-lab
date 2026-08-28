/** Copy for the reproductive prototype scenes. All PROTOTYPE-grade. */

export const UTERINE_CYCLE = {
  id: 'uterine-cycle',
  status: 'prototype',
  title: 'Endometrial cycle',
  titleJa: '子宮内膜の周期',
  subtitle: 'The lining across one cycle, seen in section · prototype',
  subtitleJa: '1 周期にわたる子宮内膜の変化（断面）｜ プロトタイプ',

  palette: {
    // Deliberately far apart: the whole scene is "which layer is changing", and
    // two similar pinks made the section read as one translucent pear.
    myometrium: '#8f4a55',
    endometrium: '#f2a3ac',
    ovary: '#d9b06a',
    tube: '#c99aa0',
  },

  legend: [
    { key: 'myometrium', label: 'Myometrium', labelJa: '子宮筋層' },
    { key: 'endometrium', label: 'Endometrium', labelJa: '子宮内膜' },
    { key: 'tube', label: 'Uterine tube', labelJa: '卵管' },
    { key: 'ovary', label: 'Ovary', labelJa: '卵巣' },
  ],

  stages: [
    {
      id: 'menstrual',
      name: 'Menstrual',
      nameJa: '月経期',
      at: 0,
      summary:
        'The lining has just been shed and is at its thinnest. The muscular wall around it does not change through the cycle.',
      summaryJa:
        '内膜が脱落した直後で、最も薄い時期です。その外側の筋層は周期を通じてほとんど変化しません。',
    },
    {
      id: 'proliferative',
      name: 'Proliferative',
      nameJa: '増殖期',
      at: 0.22,
      summary:
        'The lining rebuilds from its base. The cycle is not a series of separate events — this is one continuous rebuilding.',
      summaryJa:
        '基底層から内膜が再生していきます。周期は個別の出来事の連続ではなく、この再生が連続して進みます。',
    },
    {
      id: 'secretory',
      name: 'Secretory',
      nameJa: '分泌期',
      at: 0.58,
      summary:
        'After ovulation the lining stops thickening much further and changes character instead, becoming glandular and richly supplied.',
      summaryJa:
        '排卵後は厚みの増加が緩やかになり、腺と血管に富む組織へと性状が変化します。',
    },
    {
      id: 'late',
      name: 'Late secretory',
      nameJa: '分泌期後期',
      at: 0.85,
      summary:
        'Without a pregnancy the support for the lining is withdrawn, and the cycle returns to where it started.',
      summaryJa:
        '妊娠が成立しなければ内膜を維持する支持が失われ、周期は最初の状態に戻ります。',
    },
  ],

  range: { start: 'Day 1', startJa: '1 日目', end: 'End of cycle', endJa: '周期の終わり' },
  progressLabel: { label: 'Position in the cycle', labelJa: '周期上の位置' },

  annotations: [
    { id: 'fundus', text: 'Fundus', sub: '子宮底', anchor: 'fundus', range: [0, 1], compact: false },
    { id: 'myometrium', text: 'Myometrium', sub: '筋層', anchor: 'myometrium', range: [0, 1] },
    { id: 'endometrium', text: 'Endometrium', sub: '内膜', anchor: 'endometrium', range: [0, 1] },
    { id: 'cervix', text: 'Cervix', sub: '子宮頸部', anchor: 'cervix', range: [0, 0.5], compact: false },
    { id: 'ovary', text: 'Ovary', sub: '卵巣', anchor: 'ovary', range: [0.3, 0.8], compact: false },
  ],
};

export const PROSTATE_OUTFLOW = {
  id: 'prostate-outflow',
  status: 'prototype',
  title: 'Prostate & outflow',
  titleJa: '前立腺と尿流',
  subtitle: 'Gland volume against the calibre of the urethra inside it · prototype',
  subtitleJa: '前立腺の体積と、その中を通る尿道の内径 ｜ プロトタイプ',

  palette: {
    gland: '#c08a7a',
    urethra: '#8fd6c4',
    bladder: '#c8a6b8',
    urine: '#e8d75f',
  },

  legend: [
    { key: 'gland', label: 'Prostate', labelJa: '前立腺' },
    { key: 'urethra', label: 'Urethra', labelJa: '尿道' },
    { key: 'bladder', label: 'Bladder', labelJa: '膀胱' },
    { key: 'urine', label: 'Flow', labelJa: '尿流' },
  ],

  stages: [
    {
      id: 'normal',
      name: 'Unobstructed',
      nameJa: '閉塞なし',
      at: 0,
      summary:
        'The gland surrounds the urethra. At this size it does not narrow it, and the stream is limited by nothing here.',
      summaryJa:
        '前立腺は尿道を取り囲んでいます。この大きさでは尿道は狭くならず、流れは制限されません。',
    },
    {
      id: 'enlarged',
      name: 'Enlarged gland',
      nameJa: '腺の腫大',
      at: 0.4,
      summary:
        'Growth is inwards as well as outwards. The same enlargement that can be felt from outside is squeezing the channel through the middle.',
      summaryJa:
        '腺の増大は外側だけでなく内側にも進みます。外から触れる腫大と同じ変化が、中を通る尿道を圧迫します。',
    },
    {
      id: 'obstructed',
      name: 'Obstructed outflow',
      nameJa: '排出障害',
      at: 0.75,
      summary:
        'Flow falls off far faster than the calibre does — a small further narrowing costs a great deal of stream. Gland size alone does not predict this.',
      summaryJa:
        '流量は内径よりもはるかに急激に低下します。わずかな狭小化が大きな流量低下につながるためで、腺の大きさだけでは症状を予測できません。',
    },
  ],

  range: { start: 'Normal size', startJa: '正常サイズ', end: 'Enlarged', endJa: '腫大' },
  progressLabel: { label: 'Prostatic enlargement', labelJa: '前立腺の腫大' },

  annotations: [
    { id: 'gland', text: 'Prostate', sub: '前立腺', anchor: 'gland', range: [0, 1] },
    { id: 'urethra', text: 'Prostatic urethra', sub: '前立腺部尿道', anchor: 'urethra', range: [0, 1] },
    { id: 'bladder', text: 'Bladder', sub: '膀胱', anchor: 'bladderNeck', range: [0, 1], compact: false },
    { id: 'apex', text: 'Apex', sub: '尖部', anchor: 'apex', range: [0.5, 1], compact: false },
  ],
};
