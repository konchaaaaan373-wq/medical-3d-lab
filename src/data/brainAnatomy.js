/**
 * Copy, colours and metadata adapters for the specimen-derived brain atlas.
 *
 * The GLB carries one metadata record on every named mesh. Keep interpretation
 * here rather than in the renderer so selection copy can be tested without a
 * browser or a WebGL context.
 */

export const BRAIN_PALETTE = {
  frontal: '#d9826b',
  parietal: '#d8b35f',
  temporal: '#9b78c8',
  occipital: '#5f93c8',
  limbic: '#d56f8f',
  insula: '#54b6a4',
  telencephalon: '#b9957d',
  deep: '#58bca8',
  whiteMatter: '#d9ceb9',
  ventricles: '#4ab8d2',
  cerebellum: '#b9788d',
  brainstem: '#9c7b65',
};

const REGION_KEY = {
  'Frontal lobe': 'frontal',
  'Parietal lobe': 'parietal',
  'Temporal lobe': 'temporal',
  'Occipital lobe': 'occipital',
  'Limbic lobe': 'limbic',
  Insula: 'insula',
  Telencephalon: 'telencephalon',
};

const CATEGORY_KEY = {
  cortex: 'telencephalon',
  deep_grey: 'deep',
  diencephalon: 'deep',
  white_matter: 'whiteMatter',
  ventricles: 'ventricles',
  cerebellum: 'cerebellum',
  brainstem: 'brainstem',
};

export const BRAIN_CATEGORY_NAMES = {
  cortex: ['Cerebral cortex', '大脳皮質'],
  deep_grey: ['Deep grey matter', '深部灰白質'],
  diencephalon: ['Diencephalon', '間脳'],
  white_matter: ['White matter', '白質'],
  ventricles: ['Ventricular system', '脳室系'],
  cerebellum: ['Cerebellum', '小脳'],
  brainstem: ['Brainstem', '脳幹'],
};

const REGION_NAMES = {
  'Frontal lobe': ['Frontal lobe', '前頭葉'],
  'Parietal lobe': ['Parietal lobe', '頭頂葉'],
  'Temporal lobe': ['Temporal lobe', '側頭葉'],
  'Occipital lobe': ['Occipital lobe', '後頭葉'],
  'Limbic lobe': ['Limbic lobe', '辺縁葉'],
  Insula: ['Insula', '島皮質'],
  Telencephalon: ['Telencephalon', '終脳'],
  Diencephalon: ['Diencephalon', '間脳'],
  Mesencephalon: ['Midbrain', '中脳'],
  Brainstem: ['Brainstem', '脳幹'],
  Cerebellum: ['Cerebellum', '小脳'],
};

/** Expand three abbreviated source labels without changing their atlas ids. */
const DISPLAY_LABELS = {
  'Lat Fis-ant-Horizont': 'Anterior horizontal ramus of lateral sulcus',
  'Lat Fis-ant-Vertical': 'Anterior ascending ramus of lateral sulcus',
  'Lat Fis-post': 'Posterior ramus of lateral sulcus',
};

/** Japanese labels for the structures most likely to be selected while learning. */
const STRUCTURE_JA = {
  'Angular gyrus': '角回',
  'Anterior commissure': '前交連',
  'Anterior nuclei of thalamus': '視床前核群',
  'Aqueduct of midbrain': '中脳水道',
  'Basolateral complex': '扁桃体基底外側核群',
  'Calcarine sulcus': '鳥距溝',
  'Caudate nucleus': '尾状核',
  'Central sulcus': '中心溝',
  'Choroid plexus': '脈絡叢',
  'Cingulate gyrus (Posteroventral part)': '帯状回（後腹側部）',
  'Circular sulcus of insula': '島輪状溝',
  'Corpus callosum': '脳梁',
  Cuneus: '楔部',
  'Fourth ventricle': '第四脳室',
  Fornix: '脳弓',
  'Globus pallidus external': '淡蒼球外節',
  'Globus pallidus internal': '淡蒼球内節',
  Habenula: '手綱',
  Hippocampus: '海馬',
  'Inferior frontal sulcus': '下前頭溝',
  'Inferior temporal gyrus': '下側頭回',
  'Inferior temporal sulcus': '下側頭溝',
  'Insula (Subcentral gyrus and ant. and post. sulci)': '島皮質',
  'Intraparietal sulcus': '頭頂間溝',
  'Lat Fis-ant-Horizont': '外側溝前水平枝',
  'Lat Fis-ant-Vertical': '外側溝前上行枝',
  'Lat Fis-post': '外側溝後枝',
  'Lateral geniculate body': '外側膝状体',
  'Lateral occipital gyrus (Middle occipital gyrus)': '外側後頭回（中後頭回）',
  'Lateral ventricle': '側脳室',
  'Lingual gyrus': '舌状回',
  'Mamillary body': '乳頭体',
  'Medial geniculate body': '内側膝状体',
  'Medial occipitotemporal gyrus (Parahippocampal)': '内側後頭側頭回（海馬傍回）',
  'Mediodorsal nucleus': '視床背内側核',
  'Medulla oblongata': '延髄',
  Midbrain: '中脳',
  'Middle frontal gyrus': '中前頭回',
  'Middle temporal gyrus': '中側頭回',
  'Nucleus accumbens': '側坐核',
  'Occipital pole': '後頭極',
  'Olfactory sulcus': '嗅溝',
  'Opercular part of inferior frontal gyrus': '下前頭回弁蓋部',
  'Optic chiasm': '視交叉',
  'Optic tract': '視索',
  'Paracentral gyrus and sulcus': '中心傍回・中心傍溝',
  'Parieto-occipital sulcus': '頭頂後頭溝',
  'Pineal gland': '松果体',
  Pons: '橋',
  'Postcentral gyrus': '中心後回',
  'Postcentral sulcus': '中心後溝',
  'Precentral gyrus': '中心前回',
  Precuneus: '楔前部',
  Pulvinar: '視床枕',
  Putamen: '被殻',
  'Red nucleus': '赤核',
  'Septum pellucidum': '透明中隔',
  'Straight gyrus (Gyrus rectus)': '直回',
  'Stria terminalis': '分界条',
  'Substantia nigra': '黒質',
  'Subthalamic nucleus': '視床下核',
  'Superior frontal gyrus': '上前頭回',
  'Superior frontal sulcus': '上前頭溝',
  'Superior occipital gyri': '上後頭回',
  'Superior parietal lobule': '上頭頂小葉',
  'Superior temporal gyrus (Lateral part)': '上側頭回（外側部）',
  'Superior temporal sulcus': '上側頭溝',
  'Supramarginal gyrus': '縁上回',
  'Temporal plane': '側頭平面',
  'Temporal pole': '側頭極',
  'Third ventricle': '第三脳室',
  'Transverse temporal gyri': '横側頭回',
  'Triangular part of inferior frontal gyrus': '下前頭回三角部',
  'White matter of telencephalon': '終脳白質',
};

const STRUCTURE_COPY = {
  'Central sulcus': copy(
    'Separates the frontal and parietal lobes; the primary motor and somatosensory cortices lie on its two banks.',
    '前頭葉と頭頂葉の境界で、両側に一次運動野と一次体性感覚野があります。'
  ),
  'Precentral gyrus': copy(
    'Contains the primary motor cortex, organised as a body map for voluntary movement.',
    '随意運動を担う一次運動野を含み、身体部位に対応した配列を持ちます。'
  ),
  'Postcentral gyrus': copy(
    'Contains the primary somatosensory cortex for touch, proprioception and related body sensation.',
    '触覚や固有感覚などを受け取る一次体性感覚野を含みます。'
  ),
  'Middle temporal gyrus': copy(
    'A lateral temporal gyrus involved in distributed language, semantic and audiovisual processing networks.',
    '言語・意味処理・視聴覚統合に関わる分散ネットワークの一部です。'
  ),
  'Superior temporal gyrus (Lateral part)': copy(
    'Includes auditory association cortex and participates in speech and social-signal processing.',
    '聴覚連合野を含み、音声や社会的信号の処理に関わります。'
  ),
  Hippocampus: copy(
    'Supports the formation and consolidation of episodic memories and spatial representations.',
    'エピソード記憶の形成・固定と空間表象を支えます。'
  ),
  'Insula (Subcentral gyrus and ant. and post. sulci)': copy(
    'Cortex buried in the lateral sulcus that integrates interoception, taste, salience and autonomic state.',
    '外側溝の深部にあり、内受容感覚、味覚、顕著性、自律神経状態を統合します。'
  ),
  'Calcarine sulcus': copy(
    'The primary visual cortex lies along the banks of this medial occipital sulcus.',
    '後頭葉内側の脳溝で、両岸に一次視覚野があります。'
  ),
  'Angular gyrus': copy(
    'A multimodal association area involved in language, reading, number and semantic processing.',
    '言語、読字、数、意味処理に関わる多感覚連合野です。'
  ),
  'Supramarginal gyrus': copy(
    'A parietal association area involved in phonological, somatosensory and action-related integration.',
    '音韻、体性感覚、行為に関わる情報統合を担う頭頂連合野です。'
  ),
  'Corpus callosum': copy(
    'The largest commissural white-matter bundle connecting the two cerebral hemispheres.',
    '左右の大脳半球を結ぶ最大の交連性白質線維束です。'
  ),
  'Caudate nucleus': copy(
    'Part of the basal ganglia, contributing to action selection, learning and cognitive control loops.',
    '大脳基底核の一部で、行動選択、学習、認知制御の回路に関わります。'
  ),
  Putamen: copy(
    'A basal-ganglia nucleus central to motor, habit and reinforcement-learning circuits.',
    '運動、習慣、強化学習の回路に関わる大脳基底核です。'
  ),
  'Globus pallidus internal': copy(
    'A principal output nucleus of the basal ganglia to thalamic and brainstem targets.',
    '大脳基底核から視床・脳幹へ出力する主要な核の一つです。'
  ),
  'Lateral ventricle': copy(
    'A cerebrospinal-fluid space within a cerebral hemisphere, continuous with the third ventricle.',
    '大脳半球内の脳脊髄液腔で、第三脳室へ連続します。'
  ),
  Pons: copy(
    'A brainstem division linking cortex, cerebellum and lower brainstem and containing cranial-nerve systems.',
    '大脳、小脳、下位脳幹を結び、複数の脳神経系を含む脳幹の一部です。'
  ),
  'Medulla oblongata': copy(
    'The caudal brainstem, continuous with the spinal cord and containing vital autonomic pathways and nuclei.',
    '脊髄へ連続する尾側脳幹で、生命維持に関わる自律神経路と核を含みます。'
  ),
};

const REGION_COPY = {
  'Frontal lobe': copy(
    'A named cortical structure in the frontal lobe, which contains motor, language and executive-control networks.',
    '運動、言語、遂行制御のネットワークを含む前頭葉の構造です。'
  ),
  'Parietal lobe': copy(
    'A named cortical structure in the parietal lobe, which integrates body sensation, action and spatial attention.',
    '身体感覚、行為、空間性注意を統合する頭頂葉の構造です。'
  ),
  'Temporal lobe': copy(
    'A named cortical structure in the temporal lobe, which supports auditory, language, visual-recognition and memory networks.',
    '聴覚、言語、視覚認知、記憶のネットワークを含む側頭葉の構造です。'
  ),
  'Occipital lobe': copy(
    'A named cortical structure in the occipital lobe, the main cortical territory for visual processing.',
    '視覚処理の主要な皮質領域である後頭葉の構造です。'
  ),
  'Limbic lobe': copy(
    'A named structure in medial temporal or cingulate cortex, within networks for memory, motivation and emotion.',
    '記憶、動機づけ、情動のネットワークに関わる辺縁葉の構造です。'
  ),
  Insula: copy(
    'A named part of the insular cortex, buried beneath the frontal, parietal and temporal opercula.',
    '前頭・頭頂・側頭弁蓋の深部にある島皮質の構造です。'
  ),
};

const CATEGORY_COPY = {
  deep_grey: copy(
    'An individually segmented deep-grey structure. Its function depends on the circuit and connections in which it participates.',
    '個別に分割された深部灰白質です。役割は、それが参加する回路と結合により異なります。'
  ),
  diencephalon: copy(
    'An individually segmented diencephalic structure involved in relay, homeostatic or neuroendocrine systems.',
    '中継、恒常性、神経内分泌系に関わる間脳の構造です。'
  ),
  white_matter: copy(
    'An individually segmented white-matter or commissural structure connecting neural territories.',
    '神経領域を結ぶ、個別に分割された白質または交連構造です。'
  ),
  ventricles: copy(
    'Part of the connected cerebrospinal-fluid spaces within the brain.',
    '脳内で連続する脳脊髄液腔の一部です。'
  ),
  cerebellum: copy(
    'A named cerebellar structure within circuits for coordination, balance, motor learning and cognition.',
    '協調運動、平衡、運動学習、認知に関わる小脳回路の構造です。'
  ),
  brainstem: copy(
    'A named brainstem structure within pathways linking cerebrum, cerebellum, spinal cord and cranial-nerve systems.',
    '大脳、小脳、脊髄、脳神経系を結ぶ脳幹の構造です。'
  ),
};

/** The colour key used for a mesh's lobe or anatomical subsystem. */
export function brainColorKey(metadata = {}) {
  if (metadata.bx_cat === 'cortex') return REGION_KEY[metadata.bx_region] ?? 'telencephalon';
  return CATEGORY_KEY[metadata.bx_cat] ?? 'deep';
}

export function brainColor(metadata = {}) {
  return BRAIN_PALETTE[brainColorKey(metadata)];
}

/**
 * Turns metadata baked into one GLB mesh into the bilingual object consumed by
 * the information panel. No anatomical identity is guessed from a mesh name.
 */
export function brainStructureInfo(metadata = {}) {
  const atlasLabel = metadata.bx_label || 'Unnamed structure';
  const label = DISPLAY_LABELS[atlasLabel] ?? atlasLabel;
  const category = metadata.bx_cat || 'cortex';
  const region = metadata.bx_region || BRAIN_CATEGORY_NAMES[category]?.[0] || 'Brain';
  const side = metadata.bx_side || 'median';
  const regionNames = REGION_NAMES[region] ?? [region, BRAIN_CATEGORY_NAMES[category]?.[1] ?? '脳'];
  const categoryNames = BRAIN_CATEGORY_NAMES[category] ?? [category, '脳構造'];
  const exactCopy = STRUCTURE_COPY[atlasLabel] ?? STRUCTURE_COPY[label];
  const description = exactCopy ?? REGION_COPY[region] ?? CATEGORY_COPY[category] ?? copy(
    'An individually selectable structure in this gross-anatomy atlas.',
    'この肉眼解剖アトラスで個別に選択できる構造です。'
  );
  const translated = STRUCTURE_JA[atlasLabel] ?? STRUCTURE_JA[label];

  return {
    id: metadata.bx_id,
    name: label,
    atlasName: atlasLabel,
    nameJa: translated ?? `${regionNames[1]}（${label}）`,
    side: side === 'left' ? 'Left' : side === 'right' ? 'Right' : 'Midline',
    sideJa: side === 'left' ? '左' : side === 'right' ? '右' : '正中',
    region: regionNames[0],
    regionJa: regionNames[1],
    category,
    categoryName: categoryNames[0],
    categoryNameJa: categoryNames[1],
    description: description.en,
    descriptionJa: description.ja,
    source: metadata.bx_source || 'Z-Anatomy / BodyParts3D',
  };
}

function copy(en, ja) {
  return { en, ja };
}

/**
 * Compatibility aliases for links and tests that selected the original coarse
 * procedural regions. Each alias now resolves to a real atlas structure.
 */
export const BRAIN_REGIONS = {
  'left-frontal': { label: 'Middle frontal gyrus', side: 'left' },
  'right-frontal': { label: 'Middle frontal gyrus', side: 'right' },
  'left-parietal': { label: 'Superior parietal lobule', side: 'left' },
  'right-parietal': { label: 'Superior parietal lobule', side: 'right' },
  'left-temporal': { label: 'Middle temporal gyrus', side: 'left' },
  'right-temporal': { label: 'Middle temporal gyrus', side: 'right' },
  'left-occipital': { label: 'Lateral occipital gyrus (Middle occipital gyrus)', side: 'left' },
  'right-occipital': { label: 'Lateral occipital gyrus (Middle occipital gyrus)', side: 'right' },
  'left-insula': { label: 'Insula (Subcentral gyrus and ant. and post. sulci)', side: 'left' },
  'right-insula': { label: 'Insula (Subcentral gyrus and ant. and post. sulci)', side: 'right' },
  'left-hippocampus': { label: 'Hippocampus', side: 'left' },
  'right-hippocampus': { label: 'Hippocampus', side: 'right' },
  thalamus: { label: 'Mediodorsal nucleus', side: 'left' },
  cerebellum: { category: 'cerebellum' },
  brainstem: { label: 'Pons', side: 'left' },
};

export const BRAIN_ANATOMY_META = {
  id: 'brain-anatomy',
  status: 'alpha',
  title: 'Interactive brain anatomy',
  titleJa: '触れて学ぶ脳の解剖',
  subtitle: 'Select any gyrus, sulcus or deep structure',
  subtitleJa: '脳回・脳溝・深部構造を一つずつ選択',
  palette: BRAIN_PALETTE,
  legend: [
    { key: 'frontal', label: 'Frontal lobe', labelJa: '前頭葉' },
    { key: 'parietal', label: 'Parietal lobe', labelJa: '頭頂葉' },
    { key: 'temporal', label: 'Temporal lobe', labelJa: '側頭葉' },
    { key: 'occipital', label: 'Occipital lobe', labelJa: '後頭葉' },
    { key: 'insula', label: 'Insula', labelJa: '島皮質', activeFrom: 0.18 },
    { key: 'deep', label: 'Deep structures', labelJa: '深部構造', activeFrom: 0.55 },
    { key: 'whiteMatter', label: 'White matter', labelJa: '白質', activeFrom: 0.55 },
    { key: 'ventricles', label: 'Ventricles', labelJa: '脳室', activeFrom: 0.55 },
    { key: 'cerebellum', label: 'Cerebellum', labelJa: '小脳' },
    { key: 'brainstem', label: 'Brainstem', labelJa: '脳幹' },
  ],
  stages: [
    {
      id: 'surface', name: 'Folded cortical surface', nameJa: '脳回・脳溝と大脳葉', at: 0,
      focus: ['temporal', 'central-sulcus'],
      summary: 'Each gyrus and sulcus is a separate selectable mesh; colour groups the continuous folded surface by lobe.',
      summaryJa: '脳回・脳溝を個別に選択できます。連続した皮質表面を大脳葉ごとに色分けしています。',
    },
    {
      id: 'hemisphere', name: 'Left hemisphere and insula', nameJa: '左半球・島皮質', at: 0.36,
      focus: ['insula'],
      summary: 'The right hemisphere is hidden and the left opercula fade, exposing the insula without pulling anatomy apart.',
      summaryJa: '右半球を非表示にし、左の弁蓋部を薄くして、構造を引き離さず島皮質を露出します。',
    },
    {
      id: 'deep', name: 'Deep anatomy', nameJa: '深部構造', at: 0.72,
      focus: ['basal-ganglia'],
      summary: 'The cortex becomes a faint spatial reference while basal ganglia, diencephalon, white matter and ventricles appear in place.',
      summaryJa: '皮質を位置の手掛かりとして薄く残し、大脳基底核、間脳、白質、脳室を本来の位置に表示します。',
    },
  ],
  range: { start: 'Cortical surface', startJa: '皮質表面', end: 'Deep anatomy', endJa: '深部構造' },
  progressLabel: { label: 'Anatomical layers', labelJa: '解剖レイヤー' },
  annotations: [
    { id: 'temporal', text: 'Middle temporal gyrus', sub: '中側頭回', anchor: 'temporal', range: [0, 0.46], lead: [-104, 22] },
    { id: 'central-sulcus', text: 'Central sulcus', sub: '中心溝', anchor: 'centralSulcus', range: [0, 0.46], lead: [-60, -72] },
    { id: 'insula', text: 'Insular cortex', sub: '島皮質', anchor: 'insula', range: [0.32, 0.76], lead: [-108, 10] },
    { id: 'basal-ganglia', text: 'Putamen', sub: '被殻', anchor: 'putamen', range: [0.68, 1], lead: [-100, -45] },
  ],
  disclaimer: 'EDUCATIONAL GROSS-ANATOMY ATLAS — Deep registered structures are approximate and are not suitable for diagnosis, navigation or measurement.',
  disclaimerJa: '教育用肉眼解剖アトラス：登録された深部構造は近似で、診断・手術ナビゲーション・計測には使用できません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
};
