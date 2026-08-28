/** Copy for the renal / urinary prototype scene. PROTOTYPE-grade. */

export const URINARY_FILTRATION = {
  id: 'urinary-filtration',
  status: 'prototype',
  title: 'Filtration to bladder',
  titleJa: '濾過から膀胱まで',
  subtitle: 'Kidneys, ureters and bladder as one continuous route · prototype',
  subtitleJa: '腎臓・尿管・膀胱を 1 本の経路として ｜ プロトタイプ',

  palette: {
    kidney: '#a0555c',
    medulla: '#c9757c',
    tract: '#8fd6c4',
    urine: '#e8d75f',
  },

  legend: [
    { key: 'kidney', label: 'Renal cortex', labelJa: '腎皮質' },
    { key: 'medulla', label: 'Medulla', labelJa: '腎髄質' },
    { key: 'tract', label: 'Collecting system & ureters', labelJa: '腎盂・尿管' },
    { key: 'urine', label: 'Filtrate / urine', labelJa: '濾液・尿' },
  ],

  stages: [
    {
      id: 'filtration',
      name: 'Filtration',
      nameJa: '濾過',
      at: 0,
      summary:
        'Filtrate forms continuously at the outside of the kidney and drains inwards towards the renal pelvis. The kidneys do not fill and empty — they work all the time.',
      summaryJa:
        '濾液は腎の外側で絶えず作られ、内側の腎盂に向かって集まります。腎臓自体は「たまって出す」臓器ではなく、常時働いています。',
    },
    {
      id: 'transport',
      name: 'Ureteric transport',
      nameJa: '尿管での輸送',
      at: 0.35,
      summary:
        'Urine is moved down the ureters by peristalsis. It is pushed, not dropped — which is why the route works lying down.',
      summaryJa:
        '尿は尿管の蠕動によって運ばれます。落ちるのではなく押し出されるため、横になっていても輸送されます。',
    },
    {
      id: 'storage',
      name: 'Bladder filling',
      nameJa: '膀胱への貯留',
      at: 0.68,
      summary:
        'Storage happens at the end of the route. The bladder becomes round before it becomes large, and pressure inside it stays low for most of that.',
      summaryJa:
        '貯留は経路の最後で起こります。膀胱はまず球状になってから拡大し、その間の内圧は低く保たれます。',
    },
  ],

  range: { start: 'Empty', startJa: '空虚', end: 'Full', endJa: '充満' },
  progressLabel: { label: 'Bladder filling', labelJa: '膀胱の充満' },

  annotations: [
    { id: 'cortex', text: 'Cortex', sub: '皮質', anchor: 'rightCortex', range: [0, 1] },
    { id: 'hilum', text: 'Hilum', sub: '腎門', anchor: 'rightHilum', range: [0, 0.7], compact: false },
    { id: 'left-kidney', text: 'Left kidney', sub: '左腎', anchor: 'leftCortex', range: [0, 1], compact: false },
    { id: 'ureter', text: 'Ureter', sub: '尿管', anchor: 'ureter', range: [0.25, 1] },
    { id: 'bladder', text: 'Bladder', sub: '膀胱', anchor: 'bladder', range: [0.4, 1] },
  ],
};
