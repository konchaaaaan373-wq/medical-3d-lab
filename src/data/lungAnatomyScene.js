/**
 * What the lung anatomy scene says, in both languages.
 *
 * Text, colour and the copy for every named part. No `three`, no geometry: the
 * shapes come from `src/scenes/respiratory/organs/lungs.js`, which already
 * carves five lobes and draws the bronchial and vascular trees. This file is
 * the other half — the names those meshes answer to, and the sentence a reader
 * gets when they pick one.
 *
 * The eighteen segmental bronchi are described from `lungAnatomy.js`'s own
 * segment table rather than written out one by one. A segmental bronchus is
 * *the bronchus of that segment* — that is the definition, not a shortcut — so
 * deriving the sentence from the segment keeps the two from ever disagreeing,
 * and keeps this file from claiming anything the geometry does not carry.
 */
import { LOBES, SEGMENTS, lobeById } from '../scenes/respiratory/organs/lungAnatomy.js';

/**
 * Muted enough to read as tissue, separable enough to tell five lobes apart.
 *
 * The builder's own `LOBE_COLORS` are five shades of one pink, which is what a
 * lung looks like and is the wrong answer here: rendered, the oblique fissure
 * between the left upper and lower lobes was not visible at all, and a division
 * nobody can see is not a division the scene has shown. These are presentation
 * values — a colour is not a claim about tissue — and `natural` below is the
 * other reading of the same meshes.
 */
export const LUNG_SCENE_PALETTE = Object.freeze({
  rightUpper: '#e2a48f',
  rightMiddle: '#d9b47e',
  rightLower: '#a86274',
  leftUpper: '#cf8079',
  leftLower: '#8e5f7e',
  // Cartilage rather than a second blue: the airway has to stay separable from
  // the pulmonary artery once the parenchyma has faded and those two are the
  // only things left to tell apart.
  airway: '#b7ada0',
  artery: '#6f8fc4',
  vein: '#c4566d',
});

/** One tissue colour per system, for reading form rather than divisions. */
export const LUNG_NATURAL_PALETTE = Object.freeze({
  parenchyma: '#cf9a9c',
  airway: '#c3c8cf',
  artery: '#9aa8bd',
  vein: '#bb8b90',
});

export const LUNG_COLOR_MODES = Object.freeze([
  { id: 'lobes', label: 'Lobes and vessels', labelJa: '肺葉・血管別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const LOBE_COPY = {
  'right-upper': {
    en: 'The uppermost of the three right lobes, above both the oblique and the horizontal fissure. It carries the apical, posterior and anterior segments.',
    ja: '右肺で斜裂・水平裂の両方より上にある葉です。肺尖区・後上葉区・前上葉区を含みます。',
  },
  'right-middle': {
    en: 'A small anterior wedge between the horizontal and oblique fissures — the only lobe bounded above as well as below, and the smallest of the five.',
    ja: '水平裂と斜裂の間にある前方のくさび形の葉です。上下ともに裂で区切られる唯一の葉で、5葉のうち最小です。',
  },
  'right-lower': {
    en: 'Everything below the oblique fissure on the right: the superior segment behind, and the four basal segments below it.',
    ja: '右の斜裂より下すべてです。後方の上-下葉区と、その下の4つの肺底区からなります。',
  },
  'left-upper': {
    en: 'The whole left lung above the oblique fissure. It carries the lingula, which is the left lung’s counterpart to a middle lobe rather than a lobe of its own.',
    ja: '左の斜裂より上の全体です。舌区を含みます。舌区は右の中葉に相当する部分で、独立した葉ではありません。',
  },
  'left-lower': {
    en: 'Everything below the oblique fissure on the left, with a superior segment behind and three basal segments below it.',
    ja: '左の斜裂より下すべてです。後方の上-下葉区と、3つの肺底区からなります。',
  },
};

const LOBE_COLORS = {
  'right-upper': 'rightUpper',
  'right-middle': 'rightMiddle',
  'right-lower': 'rightLower',
  'left-upper': 'leftUpper',
  'left-lower': 'leftLower',
};

const SIDE_WORDS = {
  right: { en: 'Right lung', ja: '右肺' },
  left: { en: 'Left lung', ja: '左肺' },
};

/** Every named part of the lung, as the anatomy scene declares it. */
export function lungStructureCopy() {
  const entries = new Map();

  for (const lobe of LOBES) {
    entries.set(`lobe:${lobe.id}`, {
      name: lobe.label,
      nameJa: lobe.labelJa,
      hierarchy: [SIDE_WORDS[lobe.side].en, 'Lobes', 'Lobe'],
      hierarchyJa: [SIDE_WORDS[lobe.side].ja, '肺葉', '葉'],
      description: LOBE_COPY[lobe.id].en,
      descriptionJa: LOBE_COPY[lobe.id].ja,
      paletteKey: LOBE_COLORS[lobe.id],
      naturalKey: 'parenchyma',
      tags: [lobe.side, 'parenchyma'],
    });
  }

  entries.set('airway:trachea', {
    name: 'Trachea',
    nameJa: '気管',
    hierarchy: ['Airways', 'Trachea and main bronchi', 'Airway'],
    hierarchyJa: ['気道', '気管・主気管支', '気道'],
    description:
      'The single airway from the larynx to the carina, sitting a little to the right of the midline where the aortic arch pushes it.',
    descriptionJa:
      '喉頭から気管分岐部までの1本の気道です。大動脈弓に押されて正中よりわずかに右寄りに位置します。',
    paletteKey: 'airway',
    naturalKey: 'airway',
    tags: ['midline', 'airway'],
  });

  for (const side of ['right', 'left']) {
    const wide = side === 'right';
    entries.set(`airway:${side}-main-bronchus`, {
      name: `${side === 'right' ? 'Right' : 'Left'} main bronchus`,
      nameJa: `${side === 'right' ? '右' : '左'}主気管支`,
      hierarchy: ['Airways', 'Trachea and main bronchi', 'Airway'],
      hierarchyJa: ['気道', '気管・主気管支', '気道'],
      description: wide
        ? 'Shorter, wider and more steeply set than the left — which is why an inhaled object, and aspiration, go right.'
        : 'Longer and set at a shallower angle than the right, passing under the aortic arch to the left hilum.',
      descriptionJa: wide
        ? '左より短く太く、走行が急峻です。誤嚥した異物や誤嚥性肺炎が右に多い理由です。'
        : '右より長く、傾斜が緩やかです。大動脈弓の下をくぐって左肺門に向かいます。',
      paletteKey: 'airway',
      naturalKey: 'airway',
      tags: [side, 'airway'],
    });

    entries.set(`artery:${side}-pulmonary-artery`, {
      name: `${side === 'right' ? 'Right' : 'Left'} pulmonary artery`,
      nameJa: `${side === 'right' ? '右' : '左'}肺動脈`,
      hierarchy: ['Pulmonary vessels', 'Arteries', 'Artery'],
      hierarchyJa: ['肺血管', '肺動脈', '動脈'],
      description:
        'Carries deoxygenated blood from the right ventricle to this lung, entering at the hilum beside the main bronchus.',
      descriptionJa:
        '右心室からの静脈血をこの肺へ運びます。肺門で主気管支に伴走して肺に入ります。',
      paletteKey: 'artery',
      naturalKey: 'artery',
      tags: [side, 'artery'],
    });

    for (const which of ['superior', 'inferior']) {
      entries.set(`vein:${side}-${which}-pulmonary-vein`, {
        name: `${side === 'right' ? 'Right' : 'Left'} ${which} pulmonary vein`,
        nameJa: `${side === 'right' ? '右' : '左'}${which === 'superior' ? '上' : '下'}肺静脈`,
        hierarchy: ['Pulmonary vessels', 'Veins', 'Vein'],
        hierarchyJa: ['肺血管', '肺静脈', '静脈'],
        description:
          'Returns oxygenated blood from this lung to the left atrium. Four pulmonary veins in the usual arrangement, two from each lung.',
        descriptionJa:
          'この肺から酸素化された血液を左心房へ返します。通常は左右2本ずつ、計4本です。',
        paletteKey: 'vein',
        naturalKey: 'vein',
        tags: [side, 'vein'],
      });
    }
  }

  for (const lobe of LOBES) {
    entries.set(`airway:${lobe.id}-lobar-bronchus`, {
      name: `${lobe.label} lobar bronchus`,
      nameJa: `${lobe.labelJa}気管支`,
      hierarchy: ['Airways', `${SIDE_WORDS[lobe.side].en} bronchial tree`, 'Lobar bronchi', 'Lobar bronchus'],
      hierarchyJa: ['気道', `${SIDE_WORDS[lobe.side].ja}の気管支樹`, '葉気管支', '葉気管支'],
      description: `The bronchus that ventilates the ${lobe.label.toLowerCase()}, arising from the ${lobe.side} main bronchus.`,
      descriptionJa: `${lobe.labelJa}を換気する気管支で、${SIDE_WORDS[lobe.side].ja.slice(0, 1)}主気管支から分岐します。`,
      paletteKey: 'airway',
      naturalKey: 'airway',
      tags: [lobe.side, 'airway'],
    });

    entries.set(`artery:${lobe.id}-lobar-artery`, {
      name: `${lobe.label} lobar artery`,
      nameJa: `${lobe.labelJa}動脈`,
      hierarchy: ['Pulmonary vessels', 'Arteries', `${SIDE_WORDS[lobe.side].en} lobar arteries`, 'Lobar artery'],
      hierarchyJa: ['肺血管', '肺動脈', `${SIDE_WORDS[lobe.side].ja}の葉動脈`, '葉動脈'],
      description: `The pulmonary arterial branch running with the ${lobe.label.toLowerCase()} bronchus. Artery and bronchus travel together; the veins do not.`,
      descriptionJa: `${lobe.labelJa}気管支に伴走する肺動脈枝です。動脈と気管支は並走し、静脈は別の経路をとります。`,
      paletteKey: 'artery',
      naturalKey: 'artery',
      tags: [lobe.side, 'artery'],
    });

    entries.set(`vein:${lobe.id}-intersegmental-veins`, {
      name: `Intersegmental veins, ${lobe.label.toLowerCase()}`,
      nameJa: `${lobe.labelJa}の区域間静脈`,
      hierarchy: ['Pulmonary vessels', 'Veins', `${SIDE_WORDS[lobe.side].en} tributaries`, 'Intersegmental veins'],
      hierarchyJa: ['肺血管', '肺静脈', `${SIDE_WORDS[lobe.side].ja}の枝`, '区域間静脈'],
      description:
        'Tributaries running in the planes *between* neighbouring segments rather than inside them — which is why a vein marks a segmental boundary and an artery marks a segment’s centre.',
      descriptionJa:
        '隣り合う区域の「間」の面を走る枝です。静脈が区域の境界を示し、動脈が区域の中心を示すのはこのためです。',
      paletteKey: 'vein',
      naturalKey: 'vein',
      tags: [lobe.side, 'vein'],
    });
  }

  for (const segment of SEGMENTS) {
    const lobe = lobeById(segment.lobe);
    const full = `${segment.label} segment (${segment.number})`;
    entries.set(`airway:${segment.id}-segmental-bronchus`, {
      name: `${full} bronchus`,
      nameJa: `${segment.labelJa}（${segment.number}）の区域気管支`,
      hierarchy: ['Airways', `${SIDE_WORDS[segment.side].en} bronchial tree`, lobe.label, 'Segmental bronchus'],
      hierarchyJa: ['気道', `${SIDE_WORDS[segment.side].ja}の気管支樹`, lobe.labelJa, '区域気管支'],
      description: `The segmental bronchus that ventilates the ${segment.label.toLowerCase()} segment (${segment.number}) of the ${lobe.label.toLowerCase()}. A bronchopulmonary segment is the lung one segmental bronchus ventilates — which is what makes it removable on its own.`,
      descriptionJa: `${lobe.labelJa}の${segment.labelJa}（${segment.number}）を換気する区域気管支です。肺区域とは「1本の区域気管支が換気する肺」であり、区域単位の切除が成り立つ理由です。`,
      paletteKey: 'airway',
      naturalKey: 'airway',
      tags: [segment.side, 'airway'],
    });

    entries.set(`artery:${segment.id}-segmental-artery`, {
      name: `${full} artery`,
      nameJa: `${segment.labelJa}（${segment.number}）の区域動脈`,
      hierarchy: ['Pulmonary vessels', 'Arteries', `${SIDE_WORDS[segment.side].en} segmental arteries`, 'Segmental artery'],
      hierarchyJa: ['肺血管', '肺動脈', `${SIDE_WORDS[segment.side].ja}の区域動脈`, '区域動脈'],
      description: `The pulmonary arterial branch to the ${segment.label.toLowerCase()} segment (${segment.number}), running with that segment’s bronchus to the middle of its territory.`,
      descriptionJa: `${segment.labelJa}（${segment.number}）へ向かう肺動脈枝です。その区域の気管支に伴走し、区域の中心へ向かいます。`,
      paletteKey: 'artery',
      naturalKey: 'artery',
      tags: [segment.side, 'artery'],
    });
  }

  return entries;
}

export const LUNG_ANATOMY_META = Object.freeze({
  id: 'lung-anatomy',
  status: 'alpha',
  title: 'Interactive lung anatomy',
  titleJa: '触れて学ぶ肺の解剖',
  subtitle: 'Point to identify; click or tap to pin a lobe, a bronchus or a vessel',
  subtitleJa: '触れて部位を確認・クリック／タップで肺葉・気管支・血管を固定',
  inspection: { background: 'studio' },
  palette: LUNG_SCENE_PALETTE,
  legend: [
    { key: 'rightUpper', label: 'Right upper lobe', labelJa: '右上葉' },
    { key: 'rightMiddle', label: 'Right middle lobe', labelJa: '右中葉' },
    { key: 'rightLower', label: 'Right lower lobe', labelJa: '右下葉' },
    { key: 'leftUpper', label: 'Left upper lobe', labelJa: '左上葉' },
    { key: 'leftLower', label: 'Left lower lobe', labelJa: '左下葉' },
    { key: 'airway', label: 'Airways', labelJa: '気道', activeFrom: 0.4 },
    { key: 'artery', label: 'Pulmonary arteries', labelJa: '肺動脈', activeFrom: 0.4 },
    { key: 'vein', label: 'Pulmonary veins', labelJa: '肺静脈', activeFrom: 0.4 },
  ],
  stages: [
    {
      id: 'lobes',
      name: 'Lobes and fissures',
      nameJa: '肺葉と葉間裂',
      at: 0,
      summary: 'Five lobes as five closed meshes. Pick one to read what separates it from its neighbours.',
      summaryJa: '5つの葉を、それぞれ閉じたメッシュとして表示します。葉を選ぶと、隣の葉との境界が何かを読めます。',
    },
    {
      id: 'hilum',
      name: 'Hilum and lobar branches',
      nameJa: '肺門と葉レベルの分岐',
      at: 0.55,
      summary: 'The parenchyma fades to a hint and the bronchial and vascular trees appear inside it, in place.',
      summaryJa: '肺実質を薄くし、その内側の気管支・血管を本来の位置のまま表示します。',
    },
    {
      id: 'segments',
      name: 'Segmental bronchi and arteries',
      nameJa: '区域気管支と区域動脈',
      at: 1,
      summary: 'Eighteen segmental bronchi, each with the artery that runs with it, and the veins that run between segments instead.',
      summaryJa: '18本の区域気管支と、それぞれに伴走する区域動脈。静脈は区域の「間」を走ります。',
    },
  ],
  range: { start: 'Lobes', startJa: '肺葉', end: 'Segmental level', endJa: '区域レベル' },
  progressLabel: { label: 'Anatomical layers', labelJa: '解剖レイヤー' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Airway calibres and branching are drawn to read clearly, not measured, and no dimension here is suitable for planning or measurement.',
  disclaimerJa:
    '教育用肉眼解剖モデル：気道の口径や分岐は見やすさのために描いたもので、実測値ではありません。計測や手技の計画には使用できません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
