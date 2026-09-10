/**
 * What the liver anatomy scene says, in both languages.
 *
 * The geometry is `src/scenes/hepatobiliary/organs/liver.js`, which carves the
 * nine Couinaud parts out of one liver and draws the two vascular trees through
 * them. This file names them.
 *
 * One distinction is worth stating here because the scene stands or falls on
 * it: **a Couinaud segment is a functional division, not a surface one.** The
 * fissure a reader can see on the outside — the falciform ligament — is *not*
 * the boundary between the right and left liver; Cantlie's line is, and it runs
 * through the middle hepatic vein where nothing marks it. Keeping those two
 * apart is the whole point of a segmental scene, and the copy below says so
 * where a reader is looking at either one.
 */
import { HEPATIC_VEINS, SECTORS, SEGMENTS } from '../scenes/hepatobiliary/organs/liverAnatomy.js';

/**
 * Nine parts a reader has to tell apart by eye.
 *
 * The builder's own `SEGMENT_COLORS` are nine shades of liver, which is right
 * for a scene where the liver is the background to something else and wrong
 * here: at that separation the boundary between VII and VIII is not visible in
 * a real render, and a division nobody can see is not a division the scene has
 * shown. These are presentation values — a colour is not a claim about tissue —
 * and the natural palette below is the other reading of the same meshes.
 */
export const LIVER_SEGMENT_COLORS = Object.freeze({
  I: '#c8a24a',
  II: '#5f95c4',
  III: '#7fb4d8',
  IVa: '#6fb49c',
  IVb: '#8fc9b4',
  V: '#d08a6a',
  VI: '#b0709c',
  VII: '#c98fb8',
  VIII: '#e0a583',
});

export const LIVER_VESSEL_COLORS = Object.freeze({
  hepaticVein: '#6f8fc4',
  cava: '#5a76a8',
  portal: '#5f7fd6',
  gallbladder: '#c9b23c',
});

export const LIVER_NATURAL_COLORS = Object.freeze({
  parenchyma: '#8f3f43',
  hepaticVein: '#7a8ba8',
  cava: '#6b7c99',
  portal: '#7285ad',
  gallbladder: '#b0a05a',
});

export const LIVER_COLOR_MODES = Object.freeze([
  { id: 'segments', label: 'Couinaud segments', labelJa: '区域別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const SEGMENT_COPY = {
  I: {
    en: 'The caudate lobe. It takes portal blood from both the right and the left branch and drains straight into the cava by its own short veins, which is why it can survive — and enlarge — when the rest of the liver does not.',
    ja: '尾状葉です。門脈は左右両方の枝から受け、肝静脈を経ずに短い静脈で直接下大静脈へ注ぎます。他の区域が障害されても保たれ、しばしば代償性に腫大する理由です。',
  },
  II: { en: 'The superior part of the left lateral sector, above the left portal vein’s plane and to the left of the falciform ligament.', ja: '左外側区域の上側です。左門脈枝の面より上、肝鎌状間膜より左側にあたります。' },
  III: { en: 'The inferior part of the left lateral sector. With II it makes the left lateral sector — the graft taken in a paediatric living-donor transplant.', ja: '左外側区域の下側です。IIとあわせて左外側区域を構成し、小児生体肝移植で用いられる部分にあたります。' },
  IVa: { en: 'The superior part of the left medial sector, between the falciform ligament and Cantlie’s line.', ja: '左内側区域の上側です。肝鎌状間膜とCantlie線の間にあたります。' },
  IVb: { en: 'The inferior part of the left medial sector, reaching down towards the gallbladder fossa.', ja: '左内側区域の下側です。胆嚢窩に向かって下方に広がります。' },
  V: { en: 'The inferior part of the right anterior sector, immediately to the right of the gallbladder fossa.', ja: '右前区域の下側です。胆嚢窩のすぐ右側にあたります。' },
  VI: { en: 'The inferior part of the right posterior sector, at the back and to the right.', ja: '右後区域の下側で、右後方に位置します。' },
  VII: { en: 'The superior part of the right posterior sector, behind the right hepatic vein and high under the diaphragm.', ja: '右後区域の上側です。右肝静脈の背側、横隔膜直下の高い位置にあります。' },
  VIII: { en: 'The superior part of the right anterior sector, in front of the right hepatic vein and under the dome.', ja: '右前区域の上側です。右肝静脈の腹側、肝上面のドームの下にあります。' },
};

const SECTOR_JA = Object.fromEntries(SECTORS.map((sector) => [sector.id, sector]));

const LIVER_SIDE = {
  right: { en: 'Right liver', ja: '右葉（右肝）' },
  left: { en: 'Left liver', ja: '左葉（左肝）' },
  independent: { en: 'Caudate', ja: '尾状葉' },
};

const VEIN_COPY = {
  'right-hepatic-vein': {
    en: 'Runs in the plane between the right anterior and right posterior sectors. A hepatic vein lies *between* segments, which is why a surgeon finds a resection plane by following one.',
    ja: '右前区域と右後区域の境界面を走ります。肝静脈は区域と区域の「間」にあり、外科医が肝静脈をたどって切離面を決めるのはこのためです。',
  },
  'middle-hepatic-vein': {
    en: 'Runs in Cantlie’s line — the plane between the right and left liver. It is the functional midline, and it is not where the falciform ligament is.',
    ja: 'Cantlie線、すなわち右肝と左肝の境界面を走ります。機能的な正中であり、外から見える肝鎌状間膜の位置とは一致しません。',
  },
  'left-hepatic-vein': {
    en: 'Runs in the plane of the falciform ligament, between the left lateral and left medial sectors.',
    ja: '肝鎌状間膜の面、すなわち左外側区域と左内側区域の境界を走ります。',
  },
};

/** Every named part of the liver, as the anatomy scene declares it. */
export function liverStructureCopy() {
  const entries = new Map();

  for (const segment of SEGMENTS) {
    const sector = SECTOR_JA[segment.sector];
    const side = LIVER_SIDE[sector.liver];
    entries.set(`segment:${segment.id}`, {
      name: `Segment ${segment.number} — ${segment.label}`,
      nameJa: `${segment.number}区域（${segment.labelJa}）`,
      hierarchy: [side.en, `${sector.label} sector`, 'Couinaud segment'],
      hierarchyJa: [side.ja, `${sector.labelJa}`, 'Couinaud区域'],
      description: SEGMENT_COPY[segment.id].en,
      descriptionJa: SEGMENT_COPY[segment.id].ja,
      note: segment.note ?? null,
      noteJa: segment.noteJa ?? null,
      color: LIVER_SEGMENT_COLORS[segment.id],
      naturalColor: LIVER_NATURAL_COLORS.parenchyma,
      legendKey: 'parenchyma',
      tags: ['parenchyma', sector.liver],
    });
  }

  for (const vein of HEPATIC_VEINS) {
    entries.set(`vein:${vein.id}`, {
      name: vein.label,
      nameJa: vein.labelJa,
      hierarchy: ['Vessels', 'Hepatic veins', 'Hepatic vein'],
      hierarchyJa: ['脈管', '肝静脈', '肝静脈'],
      description: VEIN_COPY[vein.id].en,
      descriptionJa: VEIN_COPY[vein.id].ja,
      color: LIVER_VESSEL_COLORS.hepaticVein,
      naturalColor: LIVER_NATURAL_COLORS.hepaticVein,
      legendKey: 'hepaticVein',
      tags: ['vessel', 'outflow'],
    });
  }

  entries.set('vein:inferior-vena-cava', {
    name: 'Inferior vena cava',
    nameJa: '下大静脈',
    hierarchy: ['Vessels', 'Hepatic veins', 'Cava'],
    hierarchyJa: ['脈管', '肝静脈', '大静脈'],
    description: 'Runs up behind the liver in its own groove. All three hepatic veins, and the caudate’s own short veins, open into it.',
    descriptionJa: '肝臓の背側の溝を上行します。3本の肝静脈と、尾状葉の短い静脈がここに開口します。',
    color: LIVER_VESSEL_COLORS.cava,
    naturalColor: LIVER_NATURAL_COLORS.cava,
    legendKey: 'cava',
    tags: ['vessel', 'outflow'],
  });

  entries.set('vein:caudate-veins', {
    name: 'Caudate veins',
    nameJa: '尾状葉静脈',
    hierarchy: ['Vessels', 'Hepatic veins', 'Hepatic vein'],
    hierarchyJa: ['脈管', '肝静脈', '肝静脈'],
    description: 'Short veins draining segment I straight into the cava without joining any of the three hepatic veins.',
    descriptionJa: 'I区域（尾状葉）から、3本の肝静脈を経ずに直接下大静脈へ注ぐ短い静脈です。',
    color: LIVER_VESSEL_COLORS.hepaticVein,
    naturalColor: LIVER_NATURAL_COLORS.hepaticVein,
    legendKey: 'hepaticVein',
    tags: ['vessel', 'outflow'],
  });

  entries.set('portal:portal-vein', {
    name: 'Portal vein',
    nameJa: '門脈',
    hierarchy: ['Vessels', 'Portal tree', 'Portal vein'],
    hierarchyJa: ['脈管', '門脈系', '門脈'],
    description: 'Brings blood from the gut and spleen into the liver at the porta hepatis — about three quarters of the liver’s blood supply, and all of what it is there to process.',
    descriptionJa: '腸管と脾臓からの血液を肝門部から肝臓へ運びます。肝血流の約3/4を占め、肝臓が処理する物質はここから入ります。',
    color: LIVER_VESSEL_COLORS.portal,
    naturalColor: LIVER_NATURAL_COLORS.portal,
    legendKey: 'portal',
    tags: ['vessel', 'inflow'],
  });

  for (const side of ['right', 'left']) {
    entries.set(`portal:${side}-portal-branch`, {
      name: `${side === 'right' ? 'Right' : 'Left'} portal branch`,
      nameJa: `門脈${side === 'right' ? '右' : '左'}枝`,
      hierarchy: ['Vessels', 'Portal tree', 'Portal branch'],
      hierarchyJa: ['脈管', '門脈系', '門脈枝'],
      description: `Supplies the ${side} liver. The division of the portal vein, not the falciform ligament, is what the right and left liver are defined by.`,
      descriptionJa: `${side === 'right' ? '右肝' : '左肝'}を灌流します。右肝・左肝の定義は門脈の分岐によるもので、肝鎌状間膜の位置ではありません。`,
      color: LIVER_VESSEL_COLORS.portal,
      naturalColor: LIVER_NATURAL_COLORS.portal,
      legendKey: 'portal',
      tags: ['vessel', 'inflow'],
    });
  }

  for (const segment of SEGMENTS) {
    entries.set(`portal:pedicle-${segment.id}`, {
      name: `Portal pedicle — segment ${segment.number}`,
      nameJa: `${segment.number}区域の門脈枝（グリソン鞘）`,
      hierarchy: ['Vessels', 'Portal tree', 'Segmental pedicles', 'Portal pedicle'],
      hierarchyJa: ['脈管', '門脈系', '区域枝', '門脈区域枝'],
      description: `Runs *inside* segment ${segment.number} to the middle of its territory. Portal pedicles run within segments and hepatic veins between them — the difference that makes a segment resectable without cutting anything belonging to its neighbours.`,
      descriptionJa: `${segment.number}区域の「内部」を走り、その中心へ向かいます。門脈枝は区域の内部を、肝静脈は区域の境界を走ります。この違いが、隣接区域を傷つけずに1区域を切除できる理由です。`,
      color: LIVER_VESSEL_COLORS.portal,
      naturalColor: LIVER_NATURAL_COLORS.portal,
      legendKey: 'portal',
      tags: ['vessel', 'inflow'],
    });
  }

  entries.set('biliary:gallbladder', {
    name: 'Gallbladder',
    nameJa: '胆嚢',
    hierarchy: ['Biliary', 'Gallbladder', 'Gallbladder'],
    hierarchyJa: ['胆道', '胆嚢', '胆嚢'],
    description: 'Hangs from the underside of the liver in the gallbladder fossa, between segments IVb and V. It stores and concentrates bile between meals.',
    descriptionJa: '肝臓下面の胆嚢窩に付着し、IVb区域とV区域の間に位置します。食間に胆汁を貯留・濃縮します。',
    note: 'Shape only. This model has no bile duct system and no volume in millilitres.',
    noteJa: '形態のみのモデルです。胆管系は描いておらず、容量（mL）も表していません。',
    color: LIVER_VESSEL_COLORS.gallbladder,
    naturalColor: LIVER_NATURAL_COLORS.gallbladder,
    legendKey: 'gallbladder',
    tags: ['biliary'],
  });

  return entries;
}

export const LIVER_ANATOMY_META = Object.freeze({
  id: 'liver-anatomy',
  status: 'alpha',
  title: 'Interactive liver anatomy',
  titleJa: '触れて学ぶ肝臓の解剖',
  subtitle: 'Point to identify; click or tap to pin a Couinaud segment or a vessel',
  subtitleJa: '触れて部位を確認・クリック／タップでCouinaud区域・脈管を固定',
  inspection: { background: 'studio' },
  palette: {
    parenchyma: LIVER_SEGMENT_COLORS.V,
    hepaticVein: LIVER_VESSEL_COLORS.hepaticVein,
    cava: LIVER_VESSEL_COLORS.cava,
    portal: LIVER_VESSEL_COLORS.portal,
    gallbladder: LIVER_VESSEL_COLORS.gallbladder,
  },
  legend: [
    { key: 'parenchyma', label: 'Couinaud segments', labelJa: 'Couinaud区域' },
    { key: 'portal', label: 'Portal tree (inflow)', labelJa: '門脈系（流入）', activeFrom: 0.4 },
    { key: 'hepaticVein', label: 'Hepatic veins (outflow)', labelJa: '肝静脈（流出）', activeFrom: 0.4 },
    { key: 'cava', label: 'Inferior vena cava', labelJa: '下大静脈', activeFrom: 0.4 },
    { key: 'gallbladder', label: 'Gallbladder', labelJa: '胆嚢' },
  ],
  stages: [
    {
      id: 'segments',
      name: 'Couinaud segments',
      nameJa: 'Couinaud区域',
      at: 0,
      focus: ['liver'],
      summary: 'Nine parts whose union is the liver. Pick one to read where its boundaries come from.',
      summaryJa: '合わせて肝臓全体になる9つの部分です。区域を選ぶと、その境界が何で決まるかを読めます。',
    },
    {
      id: 'outflow',
      name: 'Hepatic veins and the cava',
      nameJa: '肝静脈と下大静脈',
      at: 0.55,
      focus: ['cava'],
      summary: 'The parenchyma fades and the three hepatic veins appear on the very planes that divide the segments.',
      summaryJa: '肝実質を薄くすると、区域を分ける面そのものを走る3本の肝静脈が現れます。',
    },
    {
      id: 'inflow',
      name: 'Portal tree',
      nameJa: '門脈系',
      at: 1,
      focus: ['porta'],
      summary: 'The portal vein divides at the porta hepatis and sends a pedicle into the middle of each segment — inside them, where the veins were between them.',
      summaryJa: '門脈は肝門部で分岐し、各区域の中心へ枝を送ります。肝静脈が区域の「間」を走るのに対し、門脈枝は区域の「内部」を走ります。',
    },
  ],
  range: { start: 'Segments', startJa: '区域', end: 'Portal tree', endJa: '門脈系' },
  progressLabel: { label: 'Anatomical layers', labelJa: '解剖レイヤー' },
});
