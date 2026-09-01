export const BRAIN_REGIONS = {
  'left-frontal': region('Frontal lobe', '前頭葉', 'left', 'Planning, voluntary movement, language production and executive control.', '計画、随意運動、発語、遂行機能に関わります。'),
  'right-frontal': region('Frontal lobe', '前頭葉', 'right', 'Planning, voluntary movement, social cognition and executive control.', '計画、随意運動、社会的認知、遂行機能に関わります。'),
  'left-parietal': region('Parietal lobe', '頭頂葉', 'left', 'Integrates somatic sensation and supports learned skilled actions and symbolic processing.', '体性感覚を統合し、習熟動作や記号処理を支えます。'),
  'right-parietal': region('Parietal lobe', '頭頂葉', 'right', 'Integrates somatic sensation and is central to spatial attention.', '体性感覚を統合し、空間性注意の中核を担います。'),
  'left-temporal': region('Temporal lobe', '側頭葉', 'left', 'Supports auditory processing, language comprehension and declarative memory.', '聴覚処理、言語理解、陳述記憶を支えます。'),
  'right-temporal': region('Temporal lobe', '側頭葉', 'right', 'Supports auditory processing, face recognition and non-verbal memory.', '聴覚処理、顔認知、非言語性記憶を支えます。'),
  'left-occipital': region('Occipital lobe', '後頭葉', 'left', 'Contains the primary and associative visual cortices.', '一次視覚野と視覚連合野を含みます。'),
  'right-occipital': region('Occipital lobe', '後頭葉', 'right', 'Contains the primary and associative visual cortices.', '一次視覚野と視覚連合野を含みます。'),
  'left-insula': region('Insular cortex', '島皮質', 'left', 'Integrates interoception, taste, autonomic state, salience and emotion.', '内受容感覚、味覚、自律神経状態、顕著性、情動を統合します。'),
  'right-insula': region('Insular cortex', '島皮質', 'right', 'Integrates interoception, taste, autonomic state, salience and emotion.', '内受容感覚、味覚、自律神経状態、顕著性、情動を統合します。'),
  'left-hippocampus': region('Hippocampus', '海馬', 'left', 'Forms and consolidates episodic memories and supports spatial representation.', 'エピソード記憶の形成・固定と空間表象を支えます。'),
  'right-hippocampus': region('Hippocampus', '海馬', 'right', 'Forms and consolidates episodic memories and supports spatial representation.', 'エピソード記憶の形成・固定と空間表象を支えます。'),
  'left-amygdala': region('Amygdala', '扁桃体', 'left', 'Assigns emotional significance and helps coordinate threat and reward responses.', '情動的な意味づけを行い、脅威・報酬反応を調整します。'),
  'right-amygdala': region('Amygdala', '扁桃体', 'right', 'Assigns emotional significance and helps coordinate threat and reward responses.', '情動的な意味づけを行い、脅威・報酬反応を調整します。'),
  thalamus: { name: 'Thalamus', nameJa: '視床', side: 'midline pair', sideJa: '左右一対', description: 'Relays and coordinates most sensory and motor information between cortex and subcortical systems.', descriptionJa: '大部分の感覚・運動情報を皮質と皮質下系の間で中継・調整します。' },
  cerebellum: { name: 'Cerebellum', nameJa: '小脳', side: 'posterior fossa', sideJa: '後頭蓋窩', description: 'Calibrates movement, balance and motor learning; it also contributes to cognition.', descriptionJa: '運動、平衡、運動学習を調整し、認知機能にも関与します。' },
  brainstem: { name: 'Brainstem', nameJa: '脳幹', side: 'midline', sideJa: '正中', description: 'Connects cerebrum, cerebellum and spinal cord and contains vital autonomic and cranial-nerve systems.', descriptionJa: '大脳・小脳・脊髄を結び、生命維持に関わる自律神経系と脳神経系を含みます。' },
};

function region(name, nameJa, side, description, descriptionJa) {
  return { name, nameJa, side, sideJa: side === 'left' ? '左' : '右', description, descriptionJa };
}

export const BRAIN_ANATOMY_META = {
  id: 'brain-anatomy',
  status: 'prototype',
  title: 'Interactive brain anatomy',
  titleJa: '触れて学ぶ脳の解剖',
  subtitle: 'Select a region · rotate · open the hemispheres',
  subtitleJa: '部位を選択・回転・左右へ展開',
  palette: {
    frontal: '#d98c72', parietal: '#d9b66f', temporal: '#a97fbd', occipital: '#6f9fc5',
    deep: '#65b8a6', cerebellum: '#bd7f91', brainstem: '#9a806d',
  },
  legend: [
    { key: 'frontal', label: 'Frontal lobe', labelJa: '前頭葉' },
    { key: 'parietal', label: 'Parietal lobe', labelJa: '頭頂葉' },
    { key: 'temporal', label: 'Temporal lobe', labelJa: '側頭葉' },
    { key: 'occipital', label: 'Occipital lobe', labelJa: '後頭葉' },
    { key: 'deep', label: 'Deep structures', labelJa: '深部構造' },
    { key: 'cerebellum', label: 'Cerebellum', labelJa: '小脳' },
    { key: 'brainstem', label: 'Brainstem', labelJa: '脳幹' },
  ],
  stages: [
    { id: 'surface', name: 'Cortical surface', nameJa: '大脳皮質表面', at: 0, focus: ['frontal', 'temporal'], summary: 'Rotate the brain and select a coloured lobe. The borders are teaching approximations projected onto a continuous folded cortex.', summaryJa: '脳を回転し、色分けされた葉を選択します。葉の境界は連続した脳回表面に投影した学習用の近似です。' },
    { id: 'separated', name: 'Hemispheres separated', nameJa: '左右半球を展開', at: 0.38, focus: ['insula'], summary: 'The hemispheres move apart, exposing the insular cortex deep to the lateral sulcus.', summaryJa: '左右半球を離し、外側溝の深部にある島皮質を見えるようにします。' },
    { id: 'deep', name: 'Deep structures', nameJa: '深部構造', at: 0.72, focus: ['thalamus'], summary: 'Cortex becomes translucent so the thalamus, hippocampi and amygdalae can be selected.', summaryJa: '皮質を半透明化し、視床、海馬、扁桃体を選択できるようにします。' },
  ],
  range: { start: 'Surface', startJa: '表面', end: 'Deep view', endJa: '深部' },
  progressLabel: { label: 'Anatomical dissection', labelJa: '解剖展開' },
  annotations: [
    { id: 'frontal', text: 'Frontal lobe', sub: '前頭葉', anchor: 'frontal', range: [0, 0.42], lead: [-85, -35] },
    { id: 'temporal', text: 'Temporal lobe', sub: '側頭葉', anchor: 'temporal', range: [0, 0.42], lead: [95, 15] },
    { id: 'insula', text: 'Insular cortex', sub: '島皮質', anchor: 'insula', range: [0.32, 0.78], lead: [110, -5] },
    { id: 'thalamus', text: 'Thalamus', sub: '視床', anchor: 'thalamus', range: [0.68, 1], lead: [105, -40] },
  ],
  disclaimer: 'EDUCATIONAL 3D MODEL — Regional boundaries and relative geometry are simplified and are not suitable for diagnosis, navigation or measurement.',
  disclaimerJa: '教育用3Dモデル：領域境界と相対形状は簡略化しており、診断・手術ナビゲーション・計測には使用できません。',
  disclaimerShort: 'Educational anatomy — simplified geometry',
  disclaimerShortJa: '教育用解剖 — 形状を簡略化',
};
