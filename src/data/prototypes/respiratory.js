/**
 * Copy for the respiratory prototype scenes.
 *
 * Text lives here rather than in the drawing code, so wording can be fixed
 * without touching geometry. Everything in this file describes a PROTOTYPE:
 * the shapes are stylised and the rates are illustrative.
 */

export const BREATHING_LUNGS = {
  id: 'breathing-lungs',
  status: 'prototype',
  title: 'Breathing lungs',
  titleJa: '呼吸と肺',
  subtitle: 'Trachea, bronchi and lungs through the breathing cycle · prototype',
  subtitleJa: '気管・気管支・肺と呼吸周期 ｜ プロトタイプ',

  palette: {
    lung: '#d98d95',
    airway: '#b9c6db',
    cartilage: '#e6ecf5',
    air: '#7fe3ff',
  },

  legend: [
    { key: 'lung', label: 'Lung', labelJa: '肺' },
    { key: 'airway', label: 'Trachea & bronchi', labelJa: '気管・気管支' },
    { key: 'cartilage', label: 'Cartilage rings', labelJa: '気管軟骨' },
    { key: 'air', label: 'Air movement', labelJa: '空気の流れ' },
  ],

  /**
   * The progression is depth of breathing, not disease. Quiet breathing moves a
   * small fraction of what the lungs can hold; the point of the axis is that
   * the same cycle simply gets bigger.
   */
  stages: [
    {
      id: 'quiet',
      name: 'Quiet breathing',
      nameJa: '安静呼吸',
      at: 0,
      summary:
        'At rest the chest moves a small, regular tidal volume. Inspiration is active and shorter; expiration is largely passive recoil and takes longer.',
      summaryJa:
        '安静時は小さな一回換気量が規則的に出入りします。吸気は能動的で短く、呼気は主に受動的な弾性収縮によるため長くなります。',
    },
    {
      id: 'deeper',
      name: 'Increased tidal volume',
      nameJa: '一回換気量の増加',
      at: 0.4,
      summary:
        'With demand the same cycle grows: more of the lung is recruited on each breath and the flow through the airways rises.',
      summaryJa:
        '需要が増すと同じ周期のまま換気量が大きくなり、1 回ごとに動く肺の範囲と気道を通る流量が増えます。',
    },
    {
      id: 'deep',
      name: 'Deep breath',
      nameJa: '深呼吸',
      at: 0.75,
      summary:
        'A deep breath expands the lung bases furthest — the diaphragm, not drawn here, does most of that work.',
      summaryJa:
        '深呼吸では肺底部が最も大きく広がります。その主役である横隔膜は、このプロトタイプでは描いていません。',
    },
  ],

  range: { start: 'Quiet', startJa: '安静', end: 'Deep', endJa: '深呼吸' },
  progressLabel: { label: 'Depth of breathing', labelJa: '呼吸の深さ' },

  annotations: [
    { id: 'trachea', text: 'Trachea', sub: '気管', anchor: 'trachea', range: [0, 1] },
    { id: 'carina', text: 'Carina', sub: '気管分岐部', anchor: 'carina', range: [0, 1], compact: false },
    { id: 'right-lung', text: 'Right lung', sub: '右肺', anchor: 'rightLung', range: [0, 1] },
    { id: 'left-lung', text: 'Left lung', sub: '左肺', anchor: 'leftLung', range: [0, 1] },
    { id: 'base', text: 'Lung base', sub: '肺底', anchor: 'base', range: [0.6, 1], compact: false },
  ],
};
