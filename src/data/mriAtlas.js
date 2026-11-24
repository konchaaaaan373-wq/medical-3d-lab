/**
 * The MRI atlas's words and colours: what each CerebrA label is called, which
 * group it is listed under, the copy of the workbench, and the model's scope.
 *
 * The geometry — which voxel is which label, where each structure is — is in
 * `public/assets/mri/atlas.json`, written by `scripts/build-mri-atlas.mjs` from
 * the label volume. This file adds only what a volume cannot carry: a Japanese
 * name, a place in a list, and a colour. `tests/mri-atlas-data.test.js` holds
 * the join: every structure in the asset has an entry here, and nothing here
 * names a structure the asset does not have.
 *
 * ## The names are the atlas's parcels, not a claim about borders
 *
 * CerebrA carries the Desikan–Killiany–Tourville cortical protocol and the
 * usual subcortical labels onto the ICBM 152 template. Its parcels are
 * **labelling conventions**: "inferior parietal" is a DKT region, not the
 * inferior parietal lobule of a given textbook, and where the Japanese
 * anatomical term covers a different extent the entry says so in `note`
 * instead of borrowing the more familiar word.
 *
 * ## Colour
 *
 * One hue family per group and a lightness step within it, so neighbouring
 * parcels separate and a group still reads as one. The left and right halves
 * of a structure share a colour — side is said by position and by name, and a
 * colour difference would suggest a difference in kind. **No group is pink**:
 * pink is the product's own colour (`src/styles/lab.css`), and on this screen
 * it marks the selection.
 */

/** @type {ReadonlyArray<{id:string, en:string, ja:string, hue:number, chroma:number}>} */
export const MRI_GROUPS = Object.freeze([
  { id: 'frontal', en: 'Frontal lobe', ja: '前頭葉', hue: 218, chroma: 62 },
  { id: 'parietal', en: 'Parietal lobe', ja: '頭頂葉', hue: 150, chroma: 52 },
  { id: 'temporal', en: 'Temporal lobe', ja: '側頭葉', hue: 34, chroma: 78 },
  { id: 'occipital', en: 'Occipital lobe', ja: '後頭葉', hue: 272, chroma: 52 },
  { id: 'limbic', en: 'Cingulate and medial temporal', ja: '帯状回・内側側頭葉', hue: 184, chroma: 58 },
  { id: 'insula', en: 'Insula', ja: '島', hue: 54, chroma: 74 },
  { id: 'deep', en: 'Basal ganglia and diencephalon', ja: '大脳基底核・間脳', hue: 8, chroma: 68 },
  { id: 'ventricle', en: 'Ventricles', ja: '脳室', hue: 202, chroma: 30 },
  { id: 'hindbrain', en: 'Cerebellum and brainstem', ja: '小脳・脳幹', hue: 88, chroma: 42 },
].map(Object.freeze));

/**
 * Keyed by the English name exactly as `atlas.json` (and CerebrA's own label
 * table) spells it. `id` is the stable, hemisphere-free identifier the route
 * uses: `#/mri-atlas?structure=hippocampus-l`.
 */
const ENTRIES = {
  // ---------------------------------------------------------------- frontal
  'Superior Frontal': { id: 'superior-frontal', ja: '上前頭回', group: 'frontal' },
  'Rostral Middle Frontal': { id: 'rostral-middle-frontal', ja: '中前頭回（吻側部）', group: 'frontal' },
  'Caudal Middle Frontal': { id: 'caudal-middle-frontal', ja: '中前頭回（尾側部）', group: 'frontal' },
  'Pars Opercularis': { id: 'pars-opercularis', ja: '下前頭回 弁蓋部', group: 'frontal' },
  'Pars Triangularis': { id: 'pars-triangularis', ja: '下前頭回 三角部', group: 'frontal' },
  'Pars Orbitalis': { id: 'pars-orbitalis', ja: '下前頭回 眼窩部', group: 'frontal' },
  'Lateral Orbitofrontal': { id: 'lateral-orbitofrontal', ja: '外側眼窩前頭皮質', group: 'frontal' },
  'Medial Orbitofrontal': { id: 'medial-orbitofrontal', ja: '内側眼窩前頭皮質', group: 'frontal' },
  Precentral: { id: 'precentral', ja: '中心前回', group: 'frontal' },
  Paracentral: { id: 'paracentral', ja: '中心傍小葉', group: 'frontal',
    note: { en: 'Spans the frontal and parietal lobes on the medial surface; listed here by convention.', ja: '内側面で前頭葉と頭頂葉にまたがります。ここでは慣例で前頭葉に並べています。' } },
  // --------------------------------------------------------------- parietal
  Postcentral: { id: 'postcentral', ja: '中心後回', group: 'parietal' },
  'Superior Parietal': { id: 'superior-parietal', ja: '上頭頂小葉', group: 'parietal' },
  'Inferior Parietal': { id: 'inferior-parietal', ja: '下頭頂皮質（DKT 区画）', group: 'parietal',
    note: { en: 'The DKT "inferior parietal" parcel: chiefly the angular gyrus. The supramarginal gyrus is a separate parcel here.', ja: 'DKT の「inferior parietal」区画で、主に角回にあたります。縁上回はこのアトラスでは別の区画です。' } },
  Supramarginal: { id: 'supramarginal', ja: '縁上回', group: 'parietal' },
  Precuneus: { id: 'precuneus', ja: '楔前部', group: 'parietal' },
  // --------------------------------------------------------------- temporal
  'Superior Temporal': { id: 'superior-temporal', ja: '上側頭回', group: 'temporal' },
  'Middle Temporal': { id: 'middle-temporal', ja: '中側頭回', group: 'temporal' },
  'Inferior temporal': { id: 'inferior-temporal', ja: '下側頭回', group: 'temporal' },
  'Transverse Temporal': { id: 'transverse-temporal', ja: '横側頭回（Heschl 回）', group: 'temporal' },
  Fusiform: { id: 'fusiform', ja: '紡錘状回', group: 'temporal' },
  // -------------------------------------------------------------- occipital
  'Lateral Occipital': { id: 'lateral-occipital', ja: '外側後頭皮質', group: 'occipital' },
  Lingual: { id: 'lingual', ja: '舌状回', group: 'occipital' },
  Cuneus: { id: 'cuneus', ja: '楔部', group: 'occipital' },
  Pericalcarine: { id: 'pericalcarine', ja: '鳥距溝周囲皮質', group: 'occipital' },
  // ----------------------------------------------------------------- limbic
  'Rostral Anterior Cingulate': { id: 'rostral-anterior-cingulate', ja: '前帯状皮質（吻側部）', group: 'limbic' },
  'Caudal Anterior Cingulate': { id: 'caudal-anterior-cingulate', ja: '前帯状皮質（尾側部）', group: 'limbic' },
  'Posterior Cingulate': { id: 'posterior-cingulate', ja: '後帯状皮質', group: 'limbic' },
  'Isthmus Cingulate': { id: 'isthmus-cingulate', ja: '帯状回峡', group: 'limbic' },
  Parahippocampal: { id: 'parahippocampal', ja: '海馬傍回', group: 'limbic' },
  Entorhinal: { id: 'entorhinal', ja: '嗅内皮質', group: 'limbic' },
  Hippocampus: { id: 'hippocampus', ja: '海馬', group: 'limbic' },
  Amygdala: { id: 'amygdala', ja: '扁桃体', group: 'limbic' },
  // ----------------------------------------------------------------- insula
  Insula: { id: 'insula', ja: '島皮質', group: 'insula' },
  // ------------------------------------------------------------------- deep
  Thalamus: { id: 'thalamus', ja: '視床', group: 'deep' },
  Caudate: { id: 'caudate', ja: '尾状核', group: 'deep' },
  Putamen: { id: 'putamen', ja: '被殻', group: 'deep' },
  Pallidum: { id: 'pallidum', ja: '淡蒼球', group: 'deep' },
  'Accumbens Area': { id: 'accumbens', ja: '側坐核', group: 'deep' },
  'Basal Forebrain': { id: 'basal-forebrain', ja: '前脳基底部', group: 'deep' },
  'Ventral Diencephalon': { id: 'ventral-diencephalon', ja: '腹側間脳（区画）', group: 'deep',
    note: { en: 'A labelling parcel, not one structure: it gathers the hypothalamus, subthalamic region and neighbouring nuclei that a T1 image does not separate.', ja: '単一の構造ではなく区画です。T1 強調像では分けられない視床下部・視床下域と周囲の核をまとめています。' } },
  'Optic Chiasm': { id: 'optic-chiasm', ja: '視交叉', group: 'deep',
    note: { en: 'Very small at 1 mm; its outline here is approximate.', ja: '1 mm の解像度ではごく小さく、ここでの輪郭は概略です。' } },
  // -------------------------------------------------------------- ventricle
  'Lateral Ventricle': { id: 'lateral-ventricle', ja: '側脳室', group: 'ventricle' },
  'Inferior Lateral Ventricle': { id: 'inferior-lateral-ventricle', ja: '側脳室下角', group: 'ventricle',
    note: { en: 'A thin slit in a healthy young brain; only a few voxels at 1 mm.', ja: '健常な若年の脳では細い隙間で、1 mm の解像度では数ボクセルしかありません。' } },
  'Third Ventricle': { id: 'third-ventricle', ja: '第三脳室', group: 'ventricle', midline: true },
  'Fourth Ventricle': { id: 'fourth-ventricle', ja: '第四脳室', group: 'ventricle', midline: true },
  // -------------------------------------------------------------- hindbrain
  Brainstem: { id: 'brainstem', ja: '脳幹', group: 'hindbrain', midline: true },
  'Cerebellum Gray Matter': { id: 'cerebellar-cortex', ja: '小脳皮質', group: 'hindbrain' },
  'Cerebellum White Matter': { id: 'cerebellar-white-matter', ja: '小脳白質', group: 'hindbrain' },
  'Vermal lobules I-V': { id: 'vermis-1-5', ja: '小脳虫部（第 I–V 小葉）', group: 'hindbrain', midline: true },
  'Vermal lobules VI-VII': { id: 'vermis-6-7', ja: '小脳虫部（第 VI–VII 小葉）', group: 'hindbrain', midline: true },
  'Vermal lobules VIII-X': { id: 'vermis-8-10', ja: '小脳虫部（第 VIII–X 小葉）', group: 'hindbrain', midline: true },
};

export const MRI_STRUCTURE_ENTRIES = Object.freeze(
  Object.fromEntries(Object.entries(ENTRIES).map(([name, entry]) => [name, Object.freeze({ ...entry, en: displayNameEn(name) })]))
);

/** CerebrA's own spelling, tidied for display ("Inferior temporal" → "Inferior temporal gyrus" is *not* done: no words are added). */
function displayNameEn(name) {
  return name.replace(/\bGray\b/, 'grey');
}

/** HSL → hex, so a colour is data a test can read without a browser. */
export function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const k = (n) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const value = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * value).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const GROUP_BY_ID = new Map(MRI_GROUPS.map((group) => [group.id, group]));
const ORDER_IN_GROUP = new Map();
for (const [name, entry] of Object.entries(ENTRIES)) {
  const list = ORDER_IN_GROUP.get(entry.group) ?? [];
  list.push(name);
  ORDER_IN_GROUP.set(entry.group, list);
}

/** The colour a structure is painted, on the slices and in 3D alike. */
export function mriStructureColour(name) {
  const entry = ENTRIES[name];
  if (!entry) return '#9aa0ad';
  const group = GROUP_BY_ID.get(entry.group);
  const siblings = ORDER_IN_GROUP.get(entry.group);
  const index = siblings.indexOf(name);
  // Alternate light and dark around a mid lightness, with a small hue walk, so
  // neighbours in the list — which are usually neighbours in the brain — differ.
  const step = siblings.length > 1 ? index / (siblings.length - 1) : 0.5;
  const lightness = 46 + (index % 2 === 0 ? 1 : -1) * 6 + step * 16;
  const hue = (group.hue + (step - 0.5) * 26 + 360) % 360;
  return hslToHex(hue, group.chroma, Math.min(74, Math.max(38, lightness)));
}

const HEMI_SUFFIX = { L: 'l', R: 'r' };
const HEMI_NAME = {
  L: { en: 'left', ja: '左' },
  R: { en: 'right', ja: '右' },
};

/**
 * Join the asset's structures with this file's names.
 *
 * @param {Array<{label:number, name:string, hemi:'L'|'R'}>} structures from atlas.json
 * @returns {Array<object>} one row per label, in list order (group, then name, right before left… no: left before right, as a list is read)
 */
export function describeStructures(structures) {
  const groupIndex = new Map(MRI_GROUPS.map((group, index) => [group.id, index]));
  const nameIndex = new Map(Object.keys(ENTRIES).map((name, index) => [name, index]));
  return structures
    .map((structure) => {
      const entry = MRI_STRUCTURE_ENTRIES[structure.name];
      if (!entry) throw new Error(`mri atlas: the asset has a structure this product has no name for: "${structure.name}"`);
      const hemi = HEMI_NAME[structure.hemi];
      return Object.freeze({
        ...structure,
        id: `${entry.id}-${HEMI_SUFFIX[structure.hemi]}`,
        baseId: entry.id,
        group: entry.group,
        nameEn: entry.en,
        nameJa: entry.ja,
        // A midline structure that CerebrA divides down the middle is still one
        // structure; the half is named as a half, not as a paired organ.
        fullNameEn: entry.midline ? `${entry.en} (${hemi.en} half)` : `${hemi.en[0].toUpperCase()}${hemi.en.slice(1)} ${entry.en[0].toLowerCase()}${entry.en.slice(1)}`,
        fullNameJa: entry.midline ? `${entry.ja}（${hemi.ja}半）` : `${hemi.ja} ${entry.ja}`,
        midline: Boolean(entry.midline),
        note: entry.note ?? null,
        colour: mriStructureColour(structure.name),
      });
    })
    .sort((a, b) =>
      groupIndex.get(a.group) - groupIndex.get(b.group)
      || nameIndex.get(a.name) - nameIndex.get(b.name)
      || (a.hemi === b.hemi ? 0 : a.hemi === 'L' ? -1 : 1));
}

export { ANATOMY_ATLAS_LINKS } from '../catalog/brainAtlasLinks.js';

export const MRI_ATLAS_COPY = Object.freeze({
  planes: {
    axial: { en: 'Axial', ja: '軸位断' },
    coronal: { en: 'Coronal', ja: '冠状断' },
    sagittal: { en: 'Sagittal', ja: '矢状断' },
  },
  conventions: {
    radiological: { en: 'Radiological (patient’s left on the right)', ja: '放射線学的表示（患者の左が画面の右）' },
    neurological: { en: 'Neurological (left on the left)', ja: '神経学的表示（左が画面の左）' },
  },
  nothingSelected: {
    en: 'Choose a structure — on the 3D model, on a slice, or from the list.',
    ja: '構造を選んでください。3D モデル・断面・一覧のどれからでも選べます。',
  },
  standardBrain: {
    en: 'Standard brain (average of 152 young adults) — not an individual, not for diagnosis.',
    ja: '標準脳（若年成人 152 人の平均）です。個人の脳ではなく、診断には使えません。',
  },
  linkByName: {
    en: 'Same name in the anatomy atlas. A link by name: the two atlases draw their borders differently.',
    ja: '解剖アトラスの同名の構造へ。名称による対応です（区画の引き方はアトラスごとに異なります）。',
  },
});

export const MODEL_SCOPE = {
  question: 'Where is this structure on an MRI — and how do the three planes fit the shape I know in 3D?',
  questionJa: 'この構造は MRI のどこに写るのか。三断面は、3D で知っている形とどう対応するのか。',
  answers: [
    { text: 'Where a named structure lies on axial, coronal and sagittal MRI, and how the three planes relate to one another and to the 3D shape.',
      textJa: '名前の付いた構造が、軸位・冠状・矢状の MRI のどこにあるか。三断面どうしと 3D の形がどう対応するか。' },
    { text: 'Which side of an image is the patient’s left, in both display conventions.',
      textJa: '画像のどちら側が患者の左か（放射線学的表示と神経学的表示の両方で）。' },
    { text: 'How T1- and T2-weighted contrast differ on the same anatomy.',
      textJa: '同じ解剖で、T1 強調と T2 強調のコントラストがどう違うか。' },
  ],
  excludes: [
    { text: 'It is not a patient’s scan and cannot be compared with one: an average of 152 brains has no individual variation, no pathology, and smoother cortex than any single person.',
      textJa: '患者の画像ではなく、患者の画像と見比べる基準にもなりません。152 人の平均には個人差も病変もなく、皮質は誰の脳よりも滑らかです。' },
    { text: 'It does not localise function. A coloured region is an anatomical label; nothing on this screen says what it does.',
      textJa: '機能の局在は示しません。色の付いた領域は解剖学的なラベルで、この画面はその働きについて何も述べません。' },
    { text: 'It does not show white-matter tracts or functional areas: an ordinary structural MRI cannot.',
      textJa: '白質線維や機能領域は表示しません。通常の構造 MRI では直接識別できないためです。' },
    { text: 'Intensities are display values, not a calibrated measurement.',
      textJa: '信号値は表示用の値で、較正された計測値ではありません。' },
  ],
  cautions: [
    { text: 'Labels are the CerebrA atlas’s parcels (the DKT protocol), manually corrected on this template by its authors. A parcel border is a convention and differs between atlases.',
      textJa: 'ラベルは CerebrA アトラスの区画（DKT プロトコル）で、作者がこのテンプレート上で手修正したものです。区画の境界は約束事で、アトラスによって異なります。' },
    { text: 'Not for diagnosis, lesion localisation or treatment decisions.',
      textJa: '診断・病変局在の判定・治療判断には使えません。' },
  ],
  sources: [
    { kind: 'geometry', text: 'Fonov V, et al. Unbiased average age-appropriate atlases for pediatric studies. NeuroImage 2011;54(1):313–327 (MNI ICBM 152 2009c nonlinear symmetric).',
      textJa: 'Fonov V, et al. Unbiased average age-appropriate atlases for pediatric studies. NeuroImage 2011;54(1):313–327（MNI ICBM 152 2009c 非線形対称テンプレート）。' },
    { kind: 'geometry', text: 'Manera AL, Dadar M, Fonov V, Collins DL. CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template. Sci Data 2020;7:237.',
      textJa: 'Manera AL, Dadar M, Fonov V, Collins DL. CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template. Sci Data 2020;7:237.' },
  ],
  evidence: 'docs/model-evidence/mri-atlas.md',
};

export const DISCLAIMER = 'Standard-brain MRI for learning anatomy — not a patient image, not for diagnosis.';
export const DISCLAIMER_JA = '解剖学習用の標準脳 MRI です。患者の画像ではなく、診断には使えません。';
