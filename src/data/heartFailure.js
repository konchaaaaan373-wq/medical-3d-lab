/**
 * Content + tuning data for the "Heart failure" scene.
 * Same shape as `amyloidBeta.js` — see docs/adding-a-scene.md.
 */

export const PALETTE = {
  myocardium: '#c85466', // heart muscle
  flow: '#ff6b7f', // blood taking part in ejection
  residual: '#a06ae0', // blood left in the ventricle after systole
  congestion: '#5b8dd6', // backed-up blood upstream of the failing ventricle
  vessel: '#8fa8c8',
};

/**
 * Five teaching stages. `at` is where the label takes over; the geometry and
 * the haemodynamic numbers move continuously between them.
 */
export const STAGES = [
  {
    id: 'normal',
    name: 'Normal',
    nameJa: '正常な左室',
    at: 0.0,
    summary:
      'The left ventricle fills, then ejects a little over half of its contents with each beat.',
    summaryJa:
      '左室は拡張期に血液で満たされ、収縮期にその半分強を駆出します。壁の厚さと内腔の大きさのバランスが保たれています。',
  },
  {
    id: 'hypertrophy',
    name: 'Compensated hypertrophy',
    nameJa: '代償性肥大',
    at: 0.18,
    summary:
      'Against a sustained load the wall thickens. Output is maintained for a time — this is the compensated phase.',
    summaryJa:
      '持続する負荷に対して心筋が厚くなります。しばらくは心拍出量が保たれる「代償期」です。',
  },
  {
    id: 'dilation',
    name: 'Chamber dilation',
    nameJa: '心腔の拡大',
    at: 0.42,
    summary:
      'The cavity enlarges and becomes more spherical, and the wall thins relative to the larger chamber.',
    summaryJa:
      '内腔が拡大して球形に近づき、大きくなった心腔に対して壁は相対的に薄くなります（リモデリング）。',
  },
  {
    id: 'reduced-ef',
    name: 'Reduced ejection fraction',
    nameJa: '駆出率の低下',
    at: 0.64,
    summary:
      'A larger volume stays behind after each beat, so the ejection fraction falls even as the chamber grows.',
    summaryJa:
      '1 回の収縮で駆出しきれない血液が増え、心腔が大きくなっても駆出率（EF）は低下していきます。',
  },
  {
    id: 'congestion',
    name: 'Congestion',
    nameJa: 'うっ血',
    at: 0.85,
    summary:
      'Blood backs up upstream of the ventricle, raising filling pressures — the picture behind congestive symptoms.',
    summaryJa:
      '駆出しきれない血液が上流に滞り、充満圧が上昇します。うっ血症状の背景にある状態です。',
  },
];

export const LEGEND = [
  { key: 'myocardium', label: 'Myocardium', labelJa: '心筋', activeFrom: 0 },
  { key: 'flow', label: 'Ejected blood', labelJa: '駆出される血液', activeFrom: 0 },
  { key: 'residual', label: 'Residual volume', labelJa: '残存血液', activeFrom: 0.46 },
  { key: 'congestion', label: 'Congestion', labelJa: 'うっ血', activeFrom: 0.72 },
];

/** Captions at each end of the progression slider. */
export const RANGE = {
  start: 'Normal',
  startJa: '正常',
  end: 'Congestion',
  endJa: 'うっ血',
};

export const ANNOTATIONS = [
  { id: 'lv', text: 'Left ventricle', sub: '左室', anchor: 'cavity', range: [0.0, 1.0] },
  { id: 'wall', text: 'Wall thickness', sub: '壁の厚さ', anchor: 'wall', range: [0.1, 0.6] },
  { id: 'aorta', text: 'Aorta', sub: '大動脈', anchor: 'aorta', range: [0.0, 0.5] },
  { id: 'residual', text: 'Residual volume', sub: '残存血液', anchor: 'residual', range: [0.55, 1.0] },
  { id: 'congestion', text: 'Congestion', sub: 'うっ血', anchor: 'congestion', range: [0.8, 1.0] },
];

export const DISCLAIMER =
  'Simplified educational model — a schematic left ventricle, not a patient measurement or a fluid simulation.';
export const DISCLAIMER_JA =
  '教育目的の簡易モデルです。左室を単純化した模式図で、実際の症例の計測値や流体シミュレーションではありません。';

/**
 * Haemodynamic keyframes, interpolated across the progression.
 *
 * Volumes are in mL and wall thickness in mm, chosen as plausible textbook-style
 * values for each stage — they illustrate the direction of change, they are not
 * measurements. Everything the scene draws is derived from these numbers, so the
 * picture and the read-out can never disagree.
 */
export const HEMODYNAMICS = [
  // `sphericity` is the long-axis to short-axis ratio of the cavity. A healthy
  // ventricle is distinctly elongated; a remodelled one becomes rounder, which
  // is a recognised marker of adverse remodelling.
  { at: 0.0, edv: 120, esv: 50, wall: 9.0, hr: 70, congestion: 0.0, sphericity: 1.9 },
  { at: 0.18, edv: 112, esv: 44, wall: 14.0, hr: 74, congestion: 0.04, sphericity: 1.86 },
  { at: 0.42, edv: 178, esv: 94, wall: 12.0, hr: 82, congestion: 0.22, sphericity: 1.62 },
  { at: 0.64, edv: 226, esv: 148, wall: 10.6, hr: 90, congestion: 0.5, sphericity: 1.45 },
  { at: 0.85, edv: 255, esv: 182, wall: 9.8, hr: 96, congestion: 0.88, sphericity: 1.35 },
  { at: 1.0, edv: 268, esv: 196, wall: 9.4, hr: 98, congestion: 1.0, sphericity: 1.32 },
];
