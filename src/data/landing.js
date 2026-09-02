/**
 * Landing-page presentation copy.
 *
 * These are concise entry questions and mechanism labels, not a second medical
 * model. The scene catalogue remains the source for titles/descriptions and
 * each scene's model card/evidence dossier owns the claims behind the words.
 */

export const LANDING_MODEL_ORDER = Object.freeze([
  'circulation',
  'heart-failure',
  'brain-anatomy',
  'amyloid-beta',
  'renal-filtration',
  'copd-hyperinflation',
  'asthma-heterogeneity',
  'portal-hypertension',
  'hepatorenal-syndrome',
]);

const presentation = (question, questionJa, signals, signalsJa) =>
  Object.freeze({
    question,
    questionJa,
    signals: Object.freeze([...signals]),
    signalsJa: Object.freeze([...signalsJa]),
  });

export const LANDING_MODEL_PRESENTATION = Object.freeze({
  circulation: presentation(
    'Compare MAP, cardiac output and global DO₂ across baseline, fluid response and dobutamine.',
    '基準・輸液反応・DOBで、MAP・心拍出量・全身DO₂を比較。',
    ['MAP', 'CO', 'DO₂'],
    ['血圧', '血流', '酸素運搬']
  ),
  'heart-failure': presentation(
    'Change preload, afterload and contractility; watch the PV loop and congestion move with them.',
    '前負荷・後負荷・収縮性を変え、PVループと肺うっ血を確認。',
    ['LOADING', 'PV LOOP', 'CONGESTION'],
    ['負荷', '圧−容積', 'うっ血']
  ),
  'brain-anatomy': presentation(
    'Select gyri and sulci, then reveal the insula and deep nuclei in place.',
    '脳回・脳溝を選び、島皮質と深部核を位置関係のまま表示。',
    ['CORTEX', 'INSULA', 'DEEP NUCLEI'],
    ['皮質', '島皮質', '深部核']
  ),
  'amyloid-beta': presentation(
    'Move through one aggregation state from Aβ monomer to plaque.',
    'Aβがモノマーからプラークへ凝集する過程を操作。',
    ['SOLUBLE', 'ASSEMBLIES', 'DEPOSITS'],
    ['可溶性種', '凝集体', '沈着']
  ),
  'renal-filtration': presentation(
    'Change glomerular Starling forces and tubular handling in the same solve.',
    '糸球体のStarling平衡と尿細管輸送を、同じ計算で操作。',
    ['STARLING', 'FILTRATION', 'TUBULE'],
    ['Starling', '濾過', '尿細管']
  ),
  'copd-hyperinflation': presentation(
    'Compare time constants, air trapping and expiratory flow limitation across 12 lung units.',
    '12の肺単位で、時定数・air trapping・呼気流量制限を比較。',
    ['TIME CONSTANT', 'TRAPPING', 'FLOW LIMIT'],
    ['時定数', 'air trapping', '流量制限']
  ),
  'asthma-heterogeneity': presentation(
    'Apply one bronchoconstrictor stimulus and inspect the resulting patchy ventilation.',
    '分岐気道の抵抗を変え、換気の偏りが生じる過程を表示。',
    ['AIRWAY R', 'NETWORK', 'VENTILATION'],
    ['気道抵抗', 'ネットワーク', '換気']
  ),
  'portal-hypertension': presentation(
    'Change hepatic resistance and collateral flow; follow portal pressure.',
    '肝抵抗と側副血行路を変え、門脈圧の変化を確認。',
    ['HEPATIC R', 'COLLATERAL', 'PORTAL P'],
    ['肝抵抗', '側副路', '門脈圧']
  ),
  'hepatorenal-syndrome': presentation(
    'Follow circulatory change through renal vascular tone to GFR.',
    '肝循環の変化から、腎血管緊張とGFR低下までを表示。',
    ['EFFECTIVE VOLUME', 'RENAL TONE', 'GFR'],
    ['有効循環血液量', '腎血管緊張', 'GFR']
  ),
});

/** @param {{id:string,description?:string,descriptionJa?:string,tags?:string[]}} scene */
export function landingPresentationFor(scene) {
  return LANDING_MODEL_PRESENTATION[scene.id] ?? presentation(
    scene.description ?? '',
    scene.descriptionJa ?? '',
    (scene.tags ?? []).slice(0, 3),
    (scene.tags ?? []).slice(0, 3)
  );
}

/** Curated order, with any future public scene still included at the end. */
export function orderLandingScenes(scenes) {
  const rank = new Map(LANDING_MODEL_ORDER.map((id, index) => [id, index]));
  return [...scenes].sort((a, b) => {
    const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

/** The landing cannot silently lose a public model or show an empty question. */
export function validateLandingPresentation(scenes) {
  const problems = [];
  const publicIds = new Set(scenes.map((scene) => scene.id));
  const orderedIds = new Set(LANDING_MODEL_ORDER);

  for (const scene of scenes) {
    const entry = LANDING_MODEL_PRESENTATION[scene.id];
    if (!entry) problems.push(`${scene.id}: no landing presentation`);
    else {
      if (!entry.question || !entry.questionJa) problems.push(`${scene.id}: the landing question is not bilingual`);
      if (entry.signals.length !== 3 || entry.signalsJa.length !== 3) {
        problems.push(`${scene.id}: the landing mechanism needs three bilingual signals`);
      }
    }
    if (!orderedIds.has(scene.id)) problems.push(`${scene.id}: missing from LANDING_MODEL_ORDER`);
  }

  for (const id of LANDING_MODEL_ORDER) {
    if (!publicIds.has(id)) problems.push(`${id}: ordered on the landing but not public`);
  }
  if (orderedIds.size !== LANDING_MODEL_ORDER.length) problems.push('LANDING_MODEL_ORDER contains a duplicate');
  return problems;
}
