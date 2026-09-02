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
    'MAP is 70. What happened to flow and calculated oxygen delivery?',
    'MAP 70。血流と計算上の酸素運搬は、どうなっているか。',
    ['MAP', 'CO', 'DO₂'],
    ['血圧', '血流', '酸素運搬']
  ),
  'heart-failure': presentation(
    'How do loading, the PV loop and congestion move together?',
    '負荷、PVループ、うっ血は、どう連動するか。',
    ['LOADING', 'PV LOOP', 'CONGESTION'],
    ['負荷', '圧−容積', 'うっ血']
  ),
  'brain-anatomy': presentation(
    'Where are the insula and deep nuclei beneath the cortical surface?',
    '皮質の奥にある島皮質と深部核は、どこにあるか。',
    ['CORTEX', 'INSULA', 'DEEP NUCLEI'],
    ['皮質', '島皮質', '深部核']
  ),
  'amyloid-beta': presentation(
    'How can soluble and aggregated Aβ species coexist?',
    '可溶性Aβと凝集したAβは、どう共存するか。',
    ['SOLUBLE', 'ASSEMBLIES', 'DEPOSITS'],
    ['可溶性種', '凝集体', '沈着']
  ),
  'renal-filtration': presentation(
    'Which mechanism makes the bedside urine indices invert?',
    'どの機序で、尿指標の向きが入れ替わるか。',
    ['STARLING', 'FILTRATION', 'TUBULE'],
    ['Starling', '濾過', '尿細管']
  ),
  'copd-hyperinflation': presentation(
    'Why can harder expiration stop producing more flow?',
    'なぜ呼気努力を強めても、流量が増えなくなるのか。',
    ['TIME CONSTANT', 'TRAPPING', 'FLOW LIMIT'],
    ['時定数', 'air trapping', '流量制限']
  ),
  'asthma-heterogeneity': presentation(
    'Why can one uniform stimulus create patchy ventilation?',
    'なぜ均一な刺激から、まだらな換気低下が生じるのか。',
    ['AIRWAY R', 'NETWORK', 'VENTILATION'],
    ['気道抵抗', 'ネットワーク', '換気']
  ),
  'portal-hypertension': presentation(
    'Why can portal pressure persist after collaterals open?',
    '側副血行路が開いても、なぜ門脈圧は残るのか。',
    ['HEPATIC R', 'COLLATERAL', 'PORTAL P'],
    ['肝抵抗', '側副路', '門脈圧']
  ),
  'hepatorenal-syndrome': presentation(
    'How far can circulatory change alone reduce filtration?',
    '循環の変化だけで、濾過はどこまで落ちるのか。',
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
