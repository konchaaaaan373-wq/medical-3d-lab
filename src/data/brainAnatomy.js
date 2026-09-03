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

/** Two deliberately different readings of the same, unmoved geometry. */
export const BRAIN_COLOR_MODES = [
  { id: 'detail', label: 'Colour map', labelJa: 'カラー' },
  { id: 'anatomical', label: 'Natural anatomy', labelJa: '通常解剖色' },
];

const DETAIL_COLOR_FAMILY = {
  frontal: { hue: 14, hueSpan: 80, saturation: 66, saturationSpan: 38, lightness: 59, lightnessSpan: 34 },
  parietal: { hue: 44, hueSpan: 75, saturation: 68, saturationSpan: 38, lightness: 58, lightnessSpan: 34 },
  temporal: { hue: 272, hueSpan: 85, saturation: 60, saturationSpan: 38, lightness: 60, lightnessSpan: 34 },
  occipital: { hue: 210, hueSpan: 80, saturation: 65, saturationSpan: 38, lightness: 58, lightnessSpan: 34 },
  limbic: { hue: 337, hueSpan: 75, saturation: 65, saturationSpan: 38, lightness: 59, lightnessSpan: 34 },
  insula: { hue: 164, hueSpan: 55, saturation: 60, saturationSpan: 32, lightness: 55, lightnessSpan: 30 },
  telencephalon: { hue: 24, hueSpan: 90, saturation: 58, saturationSpan: 36, lightness: 58, lightnessSpan: 34 },
  deep: { hue: 151, hueSpan: 130, saturation: 62, saturationSpan: 40, lightness: 55, lightnessSpan: 36 },
  whiteMatter: { hue: 41, hueSpan: 35, saturation: 31, saturationSpan: 18, lightness: 75, lightnessSpan: 18 },
  ventricles: { hue: 190, hueSpan: 65, saturation: 68, saturationSpan: 34, lightness: 55, lightnessSpan: 30 },
  cerebellum: { hue: 329, hueSpan: 130, saturation: 56, saturationSpan: 40, lightness: 57, lightnessSpan: 36 },
  brainstem: { hue: 26, hueSpan: 110, saturation: 50, saturationSpan: 36, lightness: 53, lightnessSpan: 34 },
};

/**
 * A low-saturation gross-anatomy palette. Small, deterministic lightness
 * changes keep adjacent atlas meshes legible without turning this mode into a
 * second categorical colour map.
 */
const ANATOMICAL_COLOR_FAMILY = {
  frontal: { hue: 12, hueSpan: 8, saturation: 23, saturationSpan: 8, lightness: 68, lightnessSpan: 12 },
  parietal: { hue: 19, hueSpan: 8, saturation: 21, saturationSpan: 8, lightness: 70, lightnessSpan: 12 },
  temporal: { hue: 8, hueSpan: 8, saturation: 22, saturationSpan: 8, lightness: 65, lightnessSpan: 12 },
  occipital: { hue: 15, hueSpan: 8, saturation: 17, saturationSpan: 8, lightness: 67, lightnessSpan: 12 },
  limbic: { hue: 352, hueSpan: 10, saturation: 20, saturationSpan: 8, lightness: 59, lightnessSpan: 12 },
  insula: { hue: 18, hueSpan: 8, saturation: 16, saturationSpan: 8, lightness: 61, lightnessSpan: 12 },
  telencephalon: { hue: 12, hueSpan: 8, saturation: 21, saturationSpan: 8, lightness: 67, lightnessSpan: 12 },
  deep: { hue: 350, hueSpan: 12, saturation: 17, saturationSpan: 8, lightness: 48, lightnessSpan: 12 },
  whiteMatter: { hue: 43, hueSpan: 8, saturation: 31, saturationSpan: 10, lightness: 79, lightnessSpan: 10 },
  ventricles: { hue: 191, hueSpan: 10, saturation: 34, saturationSpan: 10, lightness: 66, lightnessSpan: 10 },
  cerebellum: { hue: 7, hueSpan: 10, saturation: 29, saturationSpan: 10, lightness: 61, lightnessSpan: 12 },
  brainstem: { hue: 24, hueSpan: 10, saturation: 25, saturationSpan: 10, lightness: 56, lightnessSpan: 12 },
};

/** Representative swatches used by the legend in natural-anatomy mode. */
export const BRAIN_ANATOMICAL_PALETTE = Object.fromEntries(
  Object.entries(ANATOMICAL_COLOR_FAMILY).map(([key, family]) => [
    key,
    hslToHex(family.hue, family.saturation, family.lightness),
  ])
);

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

/** Japanese labels for every selectable structure in the distributed atlas. */
const STRUCTURE_JA = {
  'Accessory nucleus of oculomotor nerve': '動眼神経副核',
  Adenohypophysis: '下垂体前葉',
  'Angular gyrus': '角回',
  'Anterior commissure': '前交連',
  'Anterior hypothalamus': '視床下部前部',
  'Anterior nuclei of thalamus': '視床前核群',
  'Anterior occipital sulcus': '前後頭溝',
  'Anterior quadrangular lobule': '前四角小葉',
  'Aqueduct of midbrain': '中脳水道',
  'Base of peduncle': '小脳脚基部',
  'Basolateral complex': '扁桃体基底外側核群',
  'Biventral lobule': '二腹小葉',
  'Calcarine sulcus': '鳥距溝',
  'Caudate nucleus': '尾状核',
  'Central lobule': '中心小葉',
  'Central nucleus': '扁桃体中心核',
  'Central sulcus': '中心溝',
  'Choroid plexus': '脈絡叢',
  'Cingulate gyrus (Posteroventral part)': '帯状回（後腹側部）',
  'Cingulate gyrus and sulcus (Middle anterior part)': '帯状回・帯状溝（前中部／aMCC）',
  'Cingulate gyrus and sulcus (Middle posterior part)': '帯状回・帯状溝（後中部／pMCC）',
  'Cingulate gyrus and sulcus (Posterior dorsal part)': '帯状回・帯状溝（後背側部）',
  'Cingulate sulcus (Marginal part)': '帯状溝（辺縁枝）',
  'Circular sulcus of insula': '島輪状溝',
  'Collateral sulcus': '側副溝',
  'Corpus callosum': '脳梁',
  'Corticomedial group': '扁桃体皮質内側核群',
  Culmen: '山頂',
  Cuneus: '楔部',
  Declive: '山腹',
  Flocculus: '片葉',
  'Folium of vermis': '虫部葉',
  'Fourth ventricle': '第四脳室',
  Fornix: '脳弓',
  'Globus pallidus external': '淡蒼球外節',
  'Globus pallidus internal': '淡蒼球内節',
  'Gracile lobule': '薄小葉',
  Habenula: '手綱',
  Hippocampus: '海馬',
  'Hippocampal commissure': '海馬交連',
  'Inferior frontal sulcus': '下前頭溝',
  'Inferior occipital gyrus and sulcus': '下後頭回・下後頭溝',
  'Inferior colliculus': '下丘',
  'Inferior semilunar lobule': '下半月小葉',
  'Inferior temporal gyrus': '下側頭回',
  'Inferior temporal sulcus': '下側頭溝',
  'Insula (Subcentral gyrus and ant. and post. sulci)': '島皮質（中心下回・前後溝）',
  'Interpeduncular fossa': '脚間窩',
  'Intraparietal sulcus': '頭頂間溝',
  'Intralaminar and lateral posterior nuclei': '視床髄板内核群・外側後核',
  'Lat Fis-ant-Horizont': '外側溝前水平枝',
  'Lat Fis-ant-Vertical': '外側溝前上行枝',
  'Lat Fis-post': '外側溝後枝',
  'Lateral geniculate body': '外側膝状体',
  'Lateral hypothalamus': '視床下部外側部',
  'Lateral nucleus': '扁桃体外側核',
  'Lateral occipital gyrus (Middle occipital gyrus)': '外側後頭回（中後頭回）',
  'Lateral occipitotemporal gyrus': '外側後頭側頭回',
  'Lateral ventricle': '側脳室',
  'Lingula of cerebellum': '小脳小舌',
  'Lingual gyrus': '舌状回',
  'Lunate sulcus': '月状溝',
  'Mamillary body': '乳頭体',
  'Medial geniculate body': '内側膝状体',
  'Medial occipitotemporal gyrus (Parahippocampal)': '内側後頭側頭回（海馬傍回）',
  'Mediodorsal nucleus': '視床背内側核',
  'Medulla oblongata': '延髄',
  Midbrain: '中脳',
  'Middle frontal gyrus': '中前頭回',
  'Middle temporal gyrus': '中側頭回',
  'Motor nucleus of facial nerve': '顔面神経運動核',
  Neurohypophysis: '下垂体後葉',
  'Nodule of vermis': '虫部小節',
  'Nucleus of abducens nerve': '外転神経核',
  'Nucleus of oculomotor nerve': '動眼神経核',
  'Nucleus accumbens': '側坐核',
  'Occipital pole': '後頭極',
  'Occipitotemporal sulcus (Lateral part)': '後頭側頭溝（外側部）',
  Olive: 'オリーブ',
  'Olfactory sulcus': '嗅溝',
  'Opercular part of inferior frontal gyrus': '下前頭回弁蓋部',
  'Optic chiasm': '視交叉',
  'Optic tract': '視索',
  'Orbital gyri': '眼窩回',
  'Orbital gyri (Frontomarginal gyrus and sulcus)': '眼窩回（前頭縁回・前頭縁溝）',
  'Orbital part of inferior frontal gyrus': '下前頭回眼窩部',
  'Orbital sulci (H-shaped orbital sulci)': '眼窩溝（H字状）',
  'Orbital sulci (Lateral Orbital sulcus)': '眼窩溝（外側眼窩溝）',
  'Paracentral gyrus and sulcus': '中心傍回・中心傍溝',
  'Paracentral sulcus': '中心傍溝',
  'Parieto-occipital sulcus': '頭頂後頭溝',
  'Peduncle of flocculus': '片葉脚',
  'Pineal gland': '松果体',
  Pons: '橋',
  'Postcentral gyrus': '中心後回',
  'Postcentral sulcus': '中心後溝',
  'Posterior commissure': '後交連',
  'Posterior hypothalamus': '視床下部後部',
  'Posterior quadrangular lobule': '後四角小葉',
  'Posterior transverse collateral sulcus': '後横側副溝',
  'Precentral gyrus': '中心前回',
  'Precentral sulcus (Superior part)': '中心前溝（上部）',
  'Precentral sulcus (inferior part)': '中心前溝（下部）',
  'Preoptic hypothalamus': '視索前部',
  Precuneus: '楔前部',
  Pulvinar: '視床枕',
  Putamen: '被殻',
  'Pyramid of medulla oblongata': '延髄錐体',
  'Pyramis of vermis': '虫部錐体',
  'Red nucleus': '赤核',
  'Septum pellucidum': '透明中隔',
  'Septal nuclei': '中隔核群',
  'Straight gyrus (Gyrus rectus)': '直回',
  'Stria medullaris thalami': '視床髄条',
  'Stria terminalis': '分界条',
  'Subparietal sulcus': '頭頂下溝',
  'Substantia nigra': '黒質',
  'Subthalamic nucleus': '視床下核',
  'Sulcus interm prim-Jensen': 'ジェンセン中間溝',
  'Superior cerebellar peduncle': '上小脳脚',
  'Superior colliculus': '上丘',
  'Superior frontal gyrus': '上前頭回',
  'Superior frontal sulcus': '上前頭溝',
  'Superior occipital gyri': '上後頭回',
  'Superior parietal lobule': '上頭頂小葉',
  'Superior salivatory nucleus': '上唾液核',
  'Superior semilunar lobule': '上半月小葉',
  'Superior temporal gyrus (Lateral part)': '上側頭回（外側部）',
  'Superior temporal sulcus': '上側頭溝',
  'Supramarginal gyrus': '縁上回',
  'Temporal plane': '側頭平面',
  'Temporal pole': '側頭極',
  'Third ventricle': '第三脳室',
  'Tonsil of cerebellum': '小脳扁桃',
  'Transverse frontopolar gyrus and sulcus': '横前頭極回・横前頭極溝',
  'Transverse occipital sulcus': '横後頭溝',
  'Transverse temporal gyri': '横側頭回',
  'Triangular part of inferior frontal gyrus': '下前頭回三角部',
  'Tuber of vermis': '虫部隆起',
  'Tuberal hypothalamus': '視床下部隆起部',
  'Uvula of vermis': '虫部垂',
  'Ventral anterior nucleus': '視床腹側前核',
  'Ventral laterodorsal nucleus': '視床腹外側背側核',
  'Ventral lateroventral nucleus': '視床腹外側腹側核',
  'Vestibular nuclei': '前庭神経核群',
  'White matter of telencephalon': '終脳白質',
  'Wing of central lobule': '中心小葉翼',
};

const STRUCTURE_NOTE = {
  'Cingulate gyrus and sulcus (Middle anterior part)': copy(
    'Atlas boundary: this mesh is the anterior midcingulate territory (aMCC), not the anterior cingulate cortex (ACC). The current source model has no separate ACC mesh.',
    'アトラス上の区別：この形状は前中部帯状皮質（aMCC）で、前部帯状皮質（ACC）ではありません。現行の元モデルにはACCの独立形状がありません。'
  ),
};

const AMYGDALA_LABELS = new Set([
  'Basolateral complex',
  'Central nucleus',
  'Corticomedial group',
  'Lateral nucleus',
]);

const BASAL_GANGLIA_LABELS = new Set([
  'Caudate nucleus',
  'Globus pallidus external',
  'Globus pallidus internal',
  'Nucleus accumbens',
  'Putamen',
  'Substantia nigra',
  'Subthalamic nucleus',
]);

const THALAMUS_LABELS = new Set([
  'Anterior nuclei of thalamus',
  'Intralaminar and lateral posterior nuclei',
  'Mediodorsal nucleus',
  'Pulvinar',
  'Ventral anterior nucleus',
  'Ventral laterodorsal nucleus',
  'Ventral lateroventral nucleus',
]);

const EPITHALAMUS_LABELS = new Set([
  'Habenula',
  'Pineal gland',
  'Posterior commissure',
  'Stria medullaris thalami',
]);

const GENICULATE_LABELS = new Set([
  'Lateral geniculate body',
  'Medial geniculate body',
]);

const HYPOTHALAMUS_LABELS = new Set([
  'Anterior hypothalamus',
  'Lateral hypothalamus',
  'Mamillary body',
  'Posterior hypothalamus',
  'Preoptic hypothalamus',
  'Tuberal hypothalamus',
]);

const CEREBELLAR_VERMIS_LABELS = new Set([
  'Central lobule',
  'Culmen',
  'Declive',
  'Folium of vermis',
  'Lingula of cerebellum',
  'Nodule of vermis',
  'Pyramis of vermis',
  'Tuber of vermis',
  'Uvula of vermis',
]);

const STRUCTURE_COPY = {
  'Cingulate gyrus and sulcus (Middle anterior part)': copy(
    'The source atlas labels this medial cingulate parcel as the middle anterior part, corresponding in modern cingulate terminology to anterior midcingulate territory (aMCC).',
    '内側面の帯状皮質で、元アトラスでは「中部前方」と区分されています。現代的な帯状皮質区分では前中部帯状皮質（aMCC）に相当する領域です。'
  ),
  'Cingulate gyrus and sulcus (Middle posterior part)': copy(
    'A medial cingulate parcel posterior to aMCC, corresponding to posterior midcingulate territory (pMCC) in modern terminology.',
    'aMCCより後方にある内側面の帯状皮質で、現代的区分では後中部帯状皮質（pMCC）に相当する領域です。'
  ),
  'Cingulate gyrus and sulcus (Posterior dorsal part)': copy(
    'The dorsal portion of posterior cingulate cortex on the medial surface of the cerebral hemisphere.',
    '大脳半球内側面にある後部帯状皮質の背側部です。'
  ),
  'Cingulate gyrus (Posteroventral part)': copy(
    'The posteroventral portion of the cingulate gyrus, inferior to the dorsal posterior cingulate territory.',
    '帯状回の後腹側部で、後部帯状皮質の背側領域より下方にあります。'
  ),
  'Cingulate sulcus (Marginal part)': copy(
    'The marginal ramus of the cingulate sulcus, ascending toward the superior margin of the medial hemisphere.',
    '帯状溝から大脳半球内側面の上縁へ向かう辺縁枝です。'
  ),
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

export function brainColor(metadata = {}, mode = 'detail') {
  const key = brainColorKey(metadata);
  // Retain the old direct-call behaviour for consumers outside the UI. The
  // exposed selector itself contains only Colour map and Natural anatomy.
  if (mode === 'overview') return BRAIN_PALETTE[key];
  const families = mode === 'anatomical' ? ANATOMICAL_COLOR_FAMILY : DETAIL_COLOR_FAMILY;
  const family = families[key] ?? families.deep;
  const label = metadata.bx_label ?? metadata.bx_cat ?? 'brain';
  const natural = mode === 'anatomical';
  // Natural tones occupy a deliberately narrow range, so use independent
  // deterministic hash streams. This avoids two named structures collapsing
  // to the same rounded RGB value without introducing conspicuous colour jumps.
  // Keep the detail palette versioned: its seed is locked by the all-label
  // perceptual-distance audit so nearby atlas structures remain distinguishable.
  const hash = stableHash(
    natural ? `anatomical:h:${key}:${label}` : `${key}:palette-v2930:${label}`
  );
  const saturationHash = natural
    ? stableHash(`anatomical:s:${key}:${label}`)
    : Math.imul(hash ^ 0x85ebca6b, 0xc2b2ae35) >>> 0;
  const lightnessHash = natural
    ? stableHash(`anatomical:l:${key}:${label}`)
    : Math.imul(hash ^ 0x27d4eb2f, 0x165667b1) >>> 0;
  const hueUnit = (hash & 0xffff) / 0xffff - 0.5;
  const saturationUnit = (saturationHash & 0xffff) / 0xffff - 0.5;
  const lightnessUnit = (lightnessHash & 0xffff) / 0xffff - 0.5;
  return hslToHex(
    family.hue + hueUnit * family.hueSpan,
    family.saturation + saturationUnit * family.saturationSpan,
    family.lightness + lightnessUnit * family.lightnessSpan
  );
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
  const note = STRUCTURE_NOTE[atlasLabel] ?? STRUCTURE_NOTE[label];
  const description = exactCopy ?? REGION_COPY[region] ?? CATEGORY_COPY[category] ?? copy(
    'An individually selectable structure in this gross-anatomy atlas.',
    'この肉眼解剖アトラスで個別に選択できる構造です。'
  );
  const translated = STRUCTURE_JA[atlasLabel] ?? STRUCTURE_JA[label];
  const sideNames = sideHierarchy(side, category, region);
  const familyNames = structureFamily(atlasLabel, category);
  const hierarchy = uniqueHierarchy([sideNames, regionNames, familyNames]);

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
    preferredView: /Cingulate/.test(atlasLabel) && (side === 'left' || side === 'right')
      ? `${side}-medial`
      : null,
    hierarchy: hierarchy.map((item) => item[0]),
    hierarchyJa: hierarchy.map((item) => item[1]),
    breadcrumb: hierarchy.map((item) => item[0]).join(' › '),
    breadcrumbJa: hierarchy.map((item) => item[1]).join(' › '),
    description: description.en,
    descriptionJa: description.ja,
    note: note?.en ?? null,
    noteJa: note?.ja ?? null,
    source: metadata.bx_source || 'Z-Anatomy / BodyParts3D',
  };
}

function copy(en, ja) {
  return { en, ja };
}

function structureFamily(label, category) {
  if (/Cingulate/.test(label)) return ['Cingulate cortex', '帯状皮質'];
  if (/insula/i.test(label)) return ['Insular cortex', '島皮質'];
  if (label === 'Hippocampus') return ['Hippocampal formation', '海馬体'];
  if (AMYGDALA_LABELS.has(label)) return ['Amygdala', '扁桃体'];
  if (BASAL_GANGLIA_LABELS.has(label)) return ['Basal ganglia', '大脳基底核'];
  if (THALAMUS_LABELS.has(label)) return ['Thalamus', '視床'];
  if (EPITHALAMUS_LABELS.has(label)) return ['Epithalamus', '視床上部'];
  if (GENICULATE_LABELS.has(label)) return ['Geniculate bodies', '膝状体'];
  if (HYPOTHALAMUS_LABELS.has(label)) return ['Hypothalamus', '視床下部'];
  if (label === 'Adenohypophysis' || label === 'Neurohypophysis') {
    return ['Pituitary gland', '下垂体'];
  }
  if (label === 'Optic chiasm' || label === 'Optic tract') return ['Visual pathways', '視覚路'];
  if (category === 'diencephalon') return ['Diencephalic structures', '間脳構造'];
  if (/inferior frontal gyrus/i.test(label)) return ['Inferior frontal gyrus', '下前頭回'];
  if (/Lat Fis|lateral sulcus/i.test(label)) return ['Lateral sulcus', '外側溝'];
  if (category === 'cortex' && /gyrus.*sulcus|gyri.*sulci|gyrus and sulcus/i.test(label)) {
    return ['Cerebral gyri and sulci', '大脳回・大脳溝'];
  }
  if (category === 'cortex' && /sulcus/i.test(label)) return ['Cerebral sulci', '大脳溝'];
  if (category === 'cortex' && /gyrus|gyri|lobule|pole|Cuneus|Precuneus/i.test(label)) {
    return ['Cerebral gyri', '大脳回'];
  }
  if (category === 'ventricles') return ['Ventricular system', '脳室系'];
  if (category === 'white_matter') return ['Cerebral white matter', '大脳白質'];
  if (category === 'cerebellum' && CEREBELLAR_VERMIS_LABELS.has(label)) {
    return ['Cerebellar vermis', '小脳虫部'];
  }
  if (category === 'cerebellum' && /peduncle/i.test(label)) return ['Cerebellar peduncles', '小脳脚'];
  if (category === 'cerebellum') return ['Cerebellar hemisphere', '小脳半球'];
  if (category === 'brainstem' && /nucleus|nuclei/i.test(label)) return ['Brainstem nuclei', '脳幹神経核'];
  if (category === 'brainstem') return ['Brainstem surface anatomy', '脳幹表面解剖'];
  return BRAIN_CATEGORY_NAMES[category] ?? ['Brain structure', '脳構造'];
}

function sideHierarchy(side, category, region) {
  if (side !== 'left' && side !== 'right') return ['Midline', '正中'];
  const prefix = side === 'left' ? ['Left', '左'] : ['Right', '右'];
  if (category === 'cerebellum') return [`${prefix[0]} cerebellar hemisphere`, `${prefix[1]}小脳半球`];
  if (region === 'Diencephalon') return [`${prefix[0]} diencephalon`, `${prefix[1]}間脳`];
  if (region === 'Mesencephalon') return [`${prefix[0]} midbrain`, `${prefix[1]}中脳`];
  if (category === 'brainstem') return [`${prefix[0]} side of brainstem`, `脳幹${prefix[1]}側`];
  if (category === 'cortex' || region === 'Telencephalon') {
    return [`${prefix[0]} cerebral hemisphere`, `${prefix[1]}大脳半球`];
  }
  return [`${prefix[0]} side`, `${prefix[1]}側`];
}

function uniqueHierarchy(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const key = `${item[0]}:${item[1]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hslToHex(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] = section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
      : section < 3 ? [0, chroma, x]
        : section < 4 ? [0, x, chroma]
          : section < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
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
  subtitle: 'Point to identify; click or tap to pin any named structure',
  subtitleJa: '触れて部位を確認・クリック／タップで固定',
  // A pale calibrated field makes fine sulcal relief and low-saturation tissue
  // readable. Other dynamic scenes keep the graphite renderer default.
  inspection: { background: 'studio' },
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
      summary: 'Each named mesh is selectable. Switch between a labelled colour map and low-saturation natural anatomy.',
      summaryJa: '各部位を個別に選択できます。部位別カラーと、形態を見やすくした通常解剖色を切り替えられます。',
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
