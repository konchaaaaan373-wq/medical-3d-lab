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
  'pulmonary-edema',
  'myocardial-ischemia',
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

export const LANDING_MODEL_TITLES = Object.freeze({
  circulation: Object.freeze({ en: 'Circulation & oxygen delivery', ja: '循環・酸素運搬' }),
  'heart-failure': Object.freeze({ en: 'Heart failure', ja: '心不全' }),
  'brain-anatomy': Object.freeze({ en: '3D brain anatomy', ja: '脳の3D解剖' }),
  'amyloid-beta': Object.freeze({ en: 'Amyloid-β', ja: 'アミロイドβ' }),
  'renal-filtration': Object.freeze({ en: 'Renal filtration', ja: '腎濾過' }),
  'pulmonary-edema': Object.freeze({ en: 'Pulmonary oedema', ja: '肺水腫' }),
  'myocardial-ischemia': Object.freeze({ en: 'Myocardial ischemia', ja: '心筋虚血' }),
  'copd-hyperinflation': Object.freeze({ en: 'COPD', ja: 'COPD' }),
  'asthma-heterogeneity': Object.freeze({ en: 'Asthma', ja: '喘息' }),
  'portal-hypertension': Object.freeze({ en: 'Portal hypertension', ja: '門脈圧亢進症' }),
  'hepatorenal-syndrome': Object.freeze({ en: 'Hepatorenal syndrome', ja: '肝腎症候群' }),
});

export const LANDING_MODEL_PRESENTATION = Object.freeze({
  circulation: presentation(
    'Compare MAP, cardiac output and global DO₂ across baseline, fluid response and dobutamine.',
    'MAP・心拍出量・全身DO₂を、基準／輸液反応／DOBで比較。',
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
    '脳回・脳溝、島皮質、深部核の位置関係を3Dで確認。',
    ['CORTEX', 'INSULA', 'DEEP NUCLEI'],
    ['皮質', '島皮質', '深部核']
  ),
  'amyloid-beta': presentation(
    'Move through one aggregation state from Aβ monomer to plaque.',
    'Aβモノマーからプラーク形成までを段階表示。',
    ['SOLUBLE', 'ASSEMBLIES', 'DEPOSITS'],
    ['可溶性種', '凝集体', '沈着']
  ),
  'renal-filtration': presentation(
    'Change glomerular Starling forces and tubular handling in the same solve.',
    '糸球体濾過圧と尿細管輸送を同じモデルで操作。',
    ['STARLING', 'FILTRATION', 'TUBULE'],
    ['Starling', '濾過', '尿細管']
  ),
  'myocardial-ischemia': presentation(
    'The artery narrows here. Rotate the heart: the wall that stops moving is somewhere else.',
    '血管が細くなるのはここ。心臓を回すと、動かなくなる壁は別の場所にあります。',
    ['TERRITORY', 'BURDEN', 'STUNNING'],
    ['支配域', '虚血負荷', 'stunning']
  ),
  'pulmonary-edema': presentation(
    'The atrium is at 27. Why is one lung wet and the other flooded?',
    '左房圧はどちらも 27。なぜ一方は湿るだけで、他方は水没するのか。',
    ['STARLING', 'LYMPHATICS', 'SHUNT'],
    ['Starling', 'リンパ', 'シャント']
  ),
  'copd-hyperinflation': presentation(
    'Compare time constants, air trapping and expiratory flow limitation across 12 lung units.',
    '12の肺単位で、時定数・エアトラッピング・呼気流量制限を比較。',
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
  const entry = LANDING_MODEL_PRESENTATION[scene.id] ?? presentation(
    scene.description ?? '',
    scene.descriptionJa ?? '',
    (scene.tags ?? []).slice(0, 3),
    (scene.tags ?? []).slice(0, 3)
  );
  const title = LANDING_MODEL_TITLES[scene.id] ?? { en: scene.titleEn, ja: scene.titleJa };
  return Object.freeze({ ...entry, title: title.en, titleJa: title.ja });
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
    const title = LANDING_MODEL_TITLES[scene.id];
    if (!entry) problems.push(`${scene.id}: no landing presentation`);
    else {
      if (!entry.question || !entry.questionJa) problems.push(`${scene.id}: the landing question is not bilingual`);
      if (entry.signals.length !== 3 || entry.signalsJa.length !== 3) {
        problems.push(`${scene.id}: the landing mechanism needs three bilingual signals`);
      }
    }
    if (!title?.en || !title?.ja) problems.push(`${scene.id}: the landing title is not bilingual`);
    if (!orderedIds.has(scene.id)) problems.push(`${scene.id}: missing from LANDING_MODEL_ORDER`);
  }

  for (const id of LANDING_MODEL_ORDER) {
    if (!publicIds.has(id)) problems.push(`${id}: ordered on the landing but not public`);
  }
  if (orderedIds.size !== LANDING_MODEL_ORDER.length) problems.push('LANDING_MODEL_ORDER contains a duplicate');
  return problems;
}
