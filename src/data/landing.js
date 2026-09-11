/**
 * Landing-page presentation copy.
 *
 * These are concise entry questions and mechanism labels, not a second medical
 * model. The scene catalogue remains the source for titles/descriptions and
 * each scene's model card/evidence dossier owns the claims behind the words.
 */

/**
 * The order the landing lists models in.
 *
 * The models the beta opens come first — its anatomy models — because they are
 * what a visitor arriving from a link can actually open. The rest keeps its
 * place in the order for when the release widens; the page no longer draws it.
 * This is a stable ordering of the whole catalogue, not a publication decision:
 * `catalog/release.js` makes that one, and `Landing.js` filters on it.
 */
export const LANDING_MODEL_ORDER = Object.freeze([
  'brain-anatomy',
  'lung-anatomy',
  'liver-anatomy',
  'kidney-anatomy',
  'stomach-anatomy',
  'intestine-anatomy',
  'pancreas-anatomy',
  'thyroid-anatomy',
  'spleen-anatomy',
  'bladder-anatomy',
  'biliary-anatomy',
  'esophagus-anatomy',
  'adrenal-anatomy',
  'uterus-anatomy',
  'prostate-anatomy',
  'male-tract-anatomy',
  'knee-anatomy',
  'shoulder-anatomy',
  'hip-anatomy',
  'eye-anatomy',
  'ear-anatomy',
  'skin-anatomy',
  'lymph-node-anatomy',
  'lymphatic-drainage',
  'breast-anatomy',
  'spine-anatomy',
  'nose-anatomy',
  'larynx-anatomy',
  'oral-anatomy',
  'heart-failure',
  'circulation',
  'myocardial-ischemia',
  'amyloid-beta',
  'renal-filtration',
  'pulmonary-edema',
  'pneumonia-consolidation',
  'pulmonary-embolism',
  'copd-hyperinflation',
  'asthma-heterogeneity',
  'portal-hypertension',
  'hepatorenal-syndrome',
  'breathing-lungs',
  'body-overview',
  'liver-portal-flow',
  'urinary-filtration',
  'upper-gi-peristalsis',
  'intestinal-transit',
  'pancreatic-secretion',
  'thyroid-hormone',
  'adrenal-response',
  'spleen-filtration',
  'bone-remodeling',
  'muscle-contraction',
  'uterine-cycle',
  'prostate-outflow',
]);

const presentation = (question, questionJa, signals, signalsJa) =>
  Object.freeze({
    question,
    questionJa,
    signals: Object.freeze([...signals]),
    signalsJa: Object.freeze([...signalsJa]),
  });


export const LANDING_MODEL_PRESENTATION = Object.freeze({
  'body-overview': presentation(
    'See where every organ model sits relative to the others.',
    '各臓器モデルが体のどこにあるかを一望。',
    ['ORIENTATION', 'ORGANS', 'SCALE'],
    ['位置関係', '臓器', 'スケール']
  ),
  'breathing-lungs': presentation(
    'Trachea, main bronchi and both lungs through one breathing cycle.',
    '気管・主気管支・両肺の、1呼吸ぶんの動き。',
    ['AIRWAY', 'LOBES', 'CYCLE'],
    ['気道', '肺葉', '呼吸周期']
  ),
  'upper-gi-peristalsis': presentation(
    'Follow one constriction wave down the esophagus and around the stomach.',
    '食道を下り、胃体部を回る収縮波を追う。',
    ['SWALLOW', 'WAVE', 'STOMACH'],
    ['嚥下', '収縮波', '胃']
  ),
  'intestinal-transit': presentation(
    'Segmentation giving way to propulsive peristalsis along the bowel.',
    '分節運動から推進性蠕動へ移る腸管の動き。',
    ['SEGMENTATION', 'PROPULSION', 'TRANSIT'],
    ['分節運動', '推進', '輸送']
  ),
  'liver-portal-flow': presentation(
    'Portal inflow crossing the lobes, and the gallbladder emptying.',
    '肝葉を通る門脈血流と、胆嚢の収縮。',
    ['PORTAL', 'LOBES', 'BILE'],
    ['門脈', '肝葉', '胆汁']
  ),
  'pancreatic-secretion': presentation(
    'One gland, two outputs: enzymes to the duct, insulin to the blood.',
    '1つの腺がもつ2つの分泌 — 膵管へ、血中へ。',
    ['EXOCRINE', 'ENDOCRINE', 'DUCT'],
    ['外分泌', '内分泌', '膵管']
  ),
  'urinary-filtration': presentation(
    'Filtrate leaving the kidneys, down the ureters, into the bladder.',
    '腎から尿管を下り、膀胱へ至る流れ。',
    ['KIDNEY', 'URETER', 'BLADDER'],
    ['腎', '尿管', '膀胱']
  ),
  'thyroid-hormone': presentation(
    'Follicles releasing hormone into the capillaries around them.',
    '濾胞から周囲の毛細血管へ放出されるホルモン。',
    ['FOLLICLE', 'RELEASE', 'CAPILLARY'],
    ['濾胞', '放出', '毛細血管']
  ),
  'adrenal-response': presentation(
    'Cortex and medulla: two layers with two release time-courses.',
    '皮質と髄質 — 2つの層、2つの時間経過。',
    ['CORTEX', 'MEDULLA', 'TIME COURSE'],
    ['皮質', '髄質', '時間経過']
  ),
  'spleen-filtration': presentation(
    'Red cells crossing the red pulp; the aged ones stay behind.',
    '赤脾髄を通る赤血球と、そこで捕捉される老化赤血球。',
    ['RED PULP', 'TRANSIT', 'RETENTION'],
    ['赤脾髄', '通過', '捕捉']
  ),
  'bone-remodeling': presentation(
    'Resorption, reversal, formation — at staggered sites, over time.',
    '吸収・反転期・形成が、部位ごとにずれて進む。',
    ['RESORPTION', 'REVERSAL', 'FORMATION'],
    ['吸収', '反転期', '形成']
  ),
  'muscle-contraction': presentation(
    'A muscle belly shortening and thickening between its tendons.',
    '腱の間で短縮し、太くなる筋腹。',
    ['RECRUITMENT', 'SHORTENING', 'TENDON'],
    ['動員', '短縮', '腱']
  ),
  'uterine-cycle': presentation(
    'Endometrial thickness across one cycle, in section.',
    '1周期を通じた子宮内膜の厚さを、断面で。',
    ['CYCLE', 'ENDOMETRIUM', 'SECTION'],
    ['周期', '内膜', '断面']
  ),
  'knee-anatomy': presentation(
    'Point at a ligament and see what it runs between, with the bones faded out of the way.',
    '骨を薄くして、どの靱帯がどこからどこへ走るのかを確認。',
    ['LIGAMENTS', 'MENISCI', 'JOINT'],
    ['靱帯', '半月板', '関節']
  ),
  'shoulder-anatomy': presentation(
    'See how little socket there is, and which four tendons make up for it.',
    '関節窩の浅さと、それを補う腱板4筋の走行。',
    ['CUFF', 'SOCKET', 'ARCH'],
    ['腱板', '関節窩', 'アーチ']
  ),
  'hip-anatomy': presentation(
    'See the rim reach past the widest part of the head — in section.',
    '断面で、臼蓋の縁が骨頭の最大径を越えていることを確認。',
    ['SOCKET', 'NECK', 'SECTION'],
    ['臼蓋', '頸部', '断面']
  ),
  'eye-anatomy': presentation(
    'Look into an eye: the coats, the lens behind the iris, and the fundus.',
    '眼の中を見る。3つの膜、虹彩の奥の水晶体、そして眼底。',
    ['RETINA', 'LENS', 'FUNDUS'],
    ['網膜', '水晶体', '眼底']
  ),
  'ear-anatomy': presentation(
    'Follow one sound in: air to a drum, bone across a gap, then fluid.',
    '音の通り道をたどる。空気から鼓膜へ、骨で渡り、そして液体へ。',
    ['OSSICLES', 'COCHLEA', 'CHAIN'],
    ['耳小骨', '蝸牛', '伝達経路']
  ),
  'skin-anatomy': presentation(
    'Cut a block out of skin: three layers, and two different ways out to the surface.',
    '皮膚を1ブロック切り出す。3つの層と、体表へ出る2つの経路。',
    ['LAYERS', 'FOLLICLE', 'DEPTH'],
    ['層', '毛包', '深さ']
  ),
  'lymph-node-anatomy': presentation(
    'Count the vessels: several arrive, one leaves, and lymph has no way round.',
    '管を数える。入るのは多数、出るのは1本。リンパに迂回路はありません。',
    ['CORTEX', 'HILUM', 'ONE OUT'],
    ['皮質', '門', '1本の出口']
  ),
  'lymphatic-drainage': presentation(
    'See which way a place drains — and why the two sides are not the same.',
    'どの部位がどちらへ流れるか。左右が同じではない理由。',
    ['DUCTS', 'GROUPS', 'ASYMMETRY'],
    ['本幹', '節群', '左右差']
  ),
  'breast-anatomy': presentation(
    'Which tissue, how deep, and which way does it drain.',
    'どの組織か、どの深さか、どちらへ流れるか。',
    ['DUCTS', 'LOBULES', 'AXILLA'],
    ['乳管', '小葉', '腋窩']
  ),
  'spine-anatomy': presentation(
    'Four regions and three curves — then one segment, close enough to name its parts.',
    '4つの部位と3つの弯曲。そして1椎間を、部位の名前が分かる近さで。',
    ['REGIONS', 'DISC', 'CANAL'],
    ['部位', '椎間板', '脊柱管']
  ),
  'nose-anatomy': presentation(
    'Where does each sinus actually let go of what is in it?',
    'それぞれの副鼻腔は、どこへ開口しているのか。',
    ['TURBINATES', 'MEATUS', 'OSTIUM'],
    ['鼻甲介', '鼻道', '自然孔']
  ),
  'larynx-anatomy': presentation(
    'Where do air and food share a space, and what keeps them apart again?',
    '空気と食物はどこで同じ空間を通り、どうやって再び分かれるのか。',
    ['CROSSING', 'GLOTTIS', 'PIRIFORM'],
    ['交差', '声門', '梨状陥凹']
  ),
  'oral-anatomy': presentation(
    'Why is a tongue two organs, and where does saliva actually come out?',
    '舌はなぜ2つの部分に分かれるのか。唾液は実際どこから出てくるのか。',
    ['SULCUS', 'PAPILLAE', 'DUCTS'],
    ['分界溝', '有郭乳頭', '導管']
  ),
  'prostate-outflow': presentation(
    'Prostatic volume against the calibre of the urethra running through it.',
    '前立腺の体積と、その中を通る尿道の内径。',
    ['VOLUME', 'URETHRA', 'CALIBRE'],
    ['体積', '尿道', '内径']
  ),
  circulation: presentation(
    'Compare MAP, cardiac output and global DO₂ across baseline, fluid response and dobutamine.',
    'MAP・心拍出量・全身DO₂を、基準／輸液反応／ドブタミン（DOB）で比較。',
    ['MAP', 'CO', 'DO₂'],
    ['血圧', '血流', '酸素運搬']
  ),
  'heart-failure': presentation(
    'Change preload, afterload and contractility; watch the PV loop and congestion move with them.',
    '前負荷・後負荷・収縮性を変え、PVループと肺うっ血を確認。',
    ['LOADING', 'PV LOOP', 'CONGESTION'],
    ['負荷', '圧−容積', 'うっ血']
  ),
  'stomach-anatomy': presentation(
    'Pick the antrum, then fade the wall to the sphincter it empties through.',
    '前庭部を選び、壁を透かして、その先の幽門括約筋を見る。',
    ['FUNDUS', 'BODY', 'PYLORUS'],
    ['胃底部', '胃体部', '幽門']
  ),
  'intestine-anatomy': presentation(
    'Fade the small bowel and the colon is left as the frame it is.',
    '小腸を薄くすると、結腸が枠として残る。',
    ['CAECUM', 'FLEXURES', 'SIGMOID'],
    ['盲腸', '結腸曲', 'S状結腸']
  ),
  'pancreas-anatomy': presentation(
    'Head, neck, body, tail — then one duct running the length of all four.',
    '頭部・頸部・体部・尾部、そして4つを貫く1本の膵管。',
    ['PARTS', 'DUCT', 'ISLETS'],
    ['部位', '膵管', '膵島']
  ),
  'thyroid-anatomy': presentation(
    'Fade the gland and find the four parathyroids and the two nerves behind it.',
    '甲状腺を薄くして、その背面の副甲状腺4つと左右の反回神経を見つける。',
    ['LOBES', 'PARATHYROID', 'NERVE'],
    ['葉', '副甲状腺', '反回神経']
  ),
  'spleen-anatomy': presentation(
    'Two territories, and the artery that divides before it reaches the hilum.',
    '2つの支配領域と、脾門の手前で分かれる脾動脈。',
    ['SEGMENTS', 'ARTERY', 'VEIN'],
    ['区域', '動脈', '静脈']
  ),
  'bladder-anatomy': presentation(
    'Fade the wall and find the trigone, with an opening at each of its corners.',
    '壁を薄くして、3つの角に開口部をもつ膀胱三角を見つける。',
    ['WALL', 'TRIGONE', 'ORIFICES'],
    ['膀胱壁', '膀胱三角', '開口部']
  ),
  'biliary-anatomy': presentation(
    'Follow bile from two hepatic ducts to one papilla, past the gallbladder on the way.',
    '左右の肝管から1つの乳頭まで、胆嚢を経由して胆汁の道をたどる。',
    ['GALLBLADDER', 'DUCTS', 'PAPILLA'],
    ['胆嚢', '胆管', '乳頭']
  ),
  'esophagus-anatomy': presentation(
    'Three places the tube is narrow, and what makes each one narrow.',
    '食道が狭くなる3か所と、それぞれを狭くしている構造。',
    ['PARTS', 'CONSTRICTIONS', 'NEIGHBOURS'],
    ['部位', '狭窄部', '周囲の構造']
  ),
  'adrenal-anatomy': presentation(
    'Three layers of cortex, and inside them a piece of nervous system.',
    '3層の皮質と、その内側にある神経系の組織。',
    ['ZONES', 'MEDULLA', 'KIDNEY'],
    ['皮質3層', '髄質', '腎臓']
  ),
  'uterus-anatomy': presentation(
    'Fade the wall: the cavity is a flattened triangle, not a bag.',
    '子宮壁を薄くすると、内腔は袋ではなく扁平な三角形。',
    ['PARTS', 'CAVITY', 'ADNEXA'],
    ['部位', '内腔', '付属器']
  ),
  'prostate-anatomy': presentation(
    'Which zone: the outside a finger reaches, or the inside round the urethra.',
    'どの領域か——指が届く外側か、尿道を取り巻く内側か。',
    ['ZONES', 'URETHRA', 'DUCTS'],
    ['領域', '尿道', '射精管']
  ),
  'male-tract-anatomy': presentation(
    'One continuous channel from testis to outside, with a gland part way along it.',
    '精巣から外尿道口まで、途中に腺を挟んだ1本の管。',
    ['ROUTE', 'DUCTS', 'URETHRA'],
    ['経路', '導管', '尿道']
  ),
  'lung-anatomy': presentation(
    'Pick a lobe, then fade it and pick the segmental bronchus that ventilates it.',
    '肺葉を選び、実質を薄くして、その区域を換気する区域気管支を選ぶ。',
    ['LOBES', 'SEGMENTS', 'VESSELS'],
    ['肺葉', '肺区域', '血管']
  ),
  'liver-anatomy': presentation(
    'Couinaud’s eight segments, IV split in two: the veins run between them, the portal branches inside them.',
    'Couinaudの8区域（IVは2つに分割）。肝静脈は区域の「間」を、門脈枝は「内部」を走る。',
    ['SEGMENTS', 'OUTFLOW', 'INFLOW']  ,
    ['区域', '流出', '流入']
  ),
  'kidney-anatomy': presentation(
    'Fade the cortex to the pyramids, then follow one papilla out to the ureter.',
    '皮質を薄くして錐体を見て、1つの腎乳頭から尿管までをたどる。',
    ['CORTEX', 'PYRAMIDS', 'CALYCES'],
    ['皮質', '錐体', '腎杯']
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
  'pneumonia-consolidation': presentation(
    'Add clustered alveolar consolidation; watch ventilation fall while perfusion persists.',
    '肺胞性コンソリデーションを広げ、換気が低下しても灌流が残る過程を確認。',
    ['CONSOLIDATION', 'VENTILATION', 'SHUNT'],
    ['コンソリデーション', '換気', 'シャント']
  ),
  'pulmonary-embolism': presentation(
    'Obstruct parallel pulmonary vessels; watch perfusion fall while ventilation persists and relative PVR rises.',
    '並列肺血管を閉塞し、換気が残る一方で灌流が低下し、相対PVRが上がる過程を確認。',
    ['PERFUSION', 'DEAD SPACE', 'RELATIVE PVR'],
    ['灌流', '死腔機序', '相対PVR']
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
  // The catalogue's textbook title is the only name a model has. The landing
  // adds a question and three signals, never a second title.
  return Object.freeze({ ...entry, title: scene.titleEn, titleJa: scene.titleJa });
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

/**
 * The landing cannot silently lose a model or show an empty question.
 *
 * Pass the set the landing actually renders — during the beta that is the whole
 * catalogue, because the locked models are listed as "to be updated" rather
 * than dropped.
 */
export function validateLandingPresentation(scenes) {
  const problems = [];
  const listedIds = new Set(scenes.map((scene) => scene.id));
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
    if (!scene.titleEn || !scene.titleJa) problems.push(`${scene.id}: the catalogue title is not bilingual`);
    if (!orderedIds.has(scene.id)) problems.push(`${scene.id}: missing from LANDING_MODEL_ORDER`);
  }

  for (const id of LANDING_MODEL_ORDER) {
    if (!listedIds.has(id)) problems.push(`${id}: ordered on the landing but not in the catalogue`);
  }
  if (orderedIds.size !== LANDING_MODEL_ORDER.length) problems.push('LANDING_MODEL_ORDER contains a duplicate');
  return problems;
}
