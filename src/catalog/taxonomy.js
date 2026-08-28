/**
 * The body, as this project navigates it: system → organ → scene.
 *
 * Two levels above the scene, because scenes differ at two levels. "Amyloid-β"
 * and "Heart failure" side by side read as two things of the same kind and they
 * are not; neither do "Lungs" and "Kidney". Which system, then which organ, is
 * the split that survives a catalogue of a hundred scenes.
 *
 * Nothing here knows how anything is drawn. This file is the map, not the
 * territory — `src/catalog/scenes.js` is what says a scene exists.
 */

/**
 * Ordered roughly head to toe, with the whole-body view last.
 * `id` appears in URLs and in the explorer; treat it as public.
 */
export const SYSTEMS = [
  { id: 'nervous', label: 'Nervous', labelJa: '神経' },
  { id: 'cardiovascular', label: 'Cardiovascular', labelJa: '循環器' },
  { id: 'respiratory', label: 'Respiratory', labelJa: '呼吸器' },
  { id: 'gastrointestinal', label: 'Gastrointestinal', labelJa: '消化管' },
  // 肝胆膵: the pancreas sits with the liver and biliary tree the way the
  // clinical specialty does, rather than in a system of its own.
  { id: 'hepatobiliary', label: 'Hepatobiliary & pancreatic', labelJa: '肝胆膵' },
  { id: 'renal', label: 'Renal & urinary', labelJa: '腎・泌尿器' },
  { id: 'endocrine', label: 'Endocrine', labelJa: '内分泌' },
  { id: 'hematologic', label: 'Hematologic & lymphatic', labelJa: '血液・リンパ' },
  { id: 'musculoskeletal', label: 'Musculoskeletal', labelJa: '筋骨格' },
  { id: 'reproductive', label: 'Reproductive', labelJa: '生殖器' },
  { id: 'systemic', label: 'Whole body', labelJa: '全身' },
];

/**
 * Organs, each belonging to exactly one system.
 *
 * An organ may be listed here before any scene covers it — the explorer draws
 * it as "not covered yet", which is honest and is also the backlog.
 */
export const ORGANS = [
  { id: 'brain', system: 'nervous', label: 'Brain', labelJa: '脳' },
  { id: 'heart', system: 'cardiovascular', label: 'Heart', labelJa: '心臓' },
  { id: 'airway', system: 'respiratory', label: 'Trachea & bronchi', labelJa: '気管・気管支' },
  { id: 'lungs', system: 'respiratory', label: 'Lungs', labelJa: '肺' },
  { id: 'esophagus', system: 'gastrointestinal', label: 'Esophagus', labelJa: '食道' },
  { id: 'stomach', system: 'gastrointestinal', label: 'Stomach', labelJa: '胃' },
  { id: 'small-intestine', system: 'gastrointestinal', label: 'Small intestine', labelJa: '小腸' },
  { id: 'colon', system: 'gastrointestinal', label: 'Colon', labelJa: '大腸' },
  { id: 'liver', system: 'hepatobiliary', label: 'Liver', labelJa: '肝臓' },
  { id: 'gallbladder', system: 'hepatobiliary', label: 'Gallbladder', labelJa: '胆嚢' },
  { id: 'pancreas', system: 'hepatobiliary', label: 'Pancreas', labelJa: '膵臓' },
  { id: 'kidney', system: 'renal', label: 'Kidneys', labelJa: '腎臓' },
  { id: 'ureter', system: 'renal', label: 'Ureters', labelJa: '尿管' },
  { id: 'bladder', system: 'renal', label: 'Bladder', labelJa: '膀胱' },
  { id: 'thyroid', system: 'endocrine', label: 'Thyroid', labelJa: '甲状腺' },
  { id: 'adrenal', system: 'endocrine', label: 'Adrenal glands', labelJa: '副腎' },
  { id: 'spleen', system: 'hematologic', label: 'Spleen', labelJa: '脾臓' },
  { id: 'bone', system: 'musculoskeletal', label: 'Bone', labelJa: '骨' },
  { id: 'skeletal-muscle', system: 'musculoskeletal', label: 'Skeletal muscle', labelJa: '骨格筋' },
  { id: 'uterus', system: 'reproductive', label: 'Uterus', labelJa: '子宮' },
  { id: 'prostate', system: 'reproductive', label: 'Prostate', labelJa: '前立腺' },
  { id: 'whole-body', system: 'systemic', label: 'Whole body', labelJa: '全身' },
];

/**
 * How far a scene has been taken. This is a claim about *trust*, not about how
 * much code is in it: a prototype says "the shape is a sketch and the numbers
 * are not validated", and the UI says so where the viewer can see it.
 *
 * Ordered weakest first; `docs/adding-a-scene.md` holds the promotion criteria.
 */
export const STATUSES = [
  {
    id: 'prototype',
    label: 'Prototype',
    labelJa: 'プロトタイプ',
    badge: true,
    note: 'Stylised shape, not anatomically validated. Placeholder motion.',
    noteJa: '形状は簡略化されたスタイライズドモデルで、解剖学的な検証は受けていません。',
  },
  {
    id: 'alpha',
    label: 'Alpha',
    labelJa: 'アルファ',
    badge: true,
    note: 'A real model drives the scene, but the medical review is not done.',
    noteJa: '医学モデルは実装済みですが、医学的レビューは未了です。',
  },
  {
    id: 'reviewed',
    label: 'Reviewed',
    labelJa: 'レビュー済み',
    badge: true,
    note: 'Medically reviewed; simplifications are documented.',
    noteJa: '医学的レビュー済み。簡略化は docs/medical-notes.md に記載されています。',
  },
  {
    id: 'production',
    label: 'Production',
    labelJa: '公開',
    badge: false,
    note: 'Reviewed, tested, and used as a reference implementation.',
    noteJa: 'レビュー・テスト済みで、他シーンの基準となる実装です。',
  },
];

export const STATUS_IDS = STATUSES.map((status) => status.id);

/** @param {string} id */
export const systemById = (id) => SYSTEMS.find((system) => system.id === id) ?? null;
/** @param {string} id */
export const organById = (id) => ORGANS.find((organ) => organ.id === id) ?? null;
/** @param {string} id */
export const statusById = (id) => STATUSES.find((status) => status.id === id) ?? null;

/** Organs of one system, in registration order. */
export const organsOfSystem = (systemId) => ORGANS.filter((organ) => organ.system === systemId);
