/** Copy for the hepatobiliary and pancreatic prototype scenes. All PROTOTYPE-grade. */

export const LIVER_PORTAL_FLOW = {
  id: 'liver-portal-flow',
  status: 'prototype',
  title: 'Portal flow & bile',
  titleJa: '門脈血流と胆汁',
  subtitle: 'Blood crossing the liver, and the gallbladder emptying · prototype',
  subtitleJa: '肝臓を通過する血流と胆嚢の収縮 ｜ プロトタイプ',

  palette: {
    liver: '#a8484c',
    portal: '#6f7fd6',
    hepatic: '#e0575f',
    bile: '#d8c63f',
  },

  legend: [
    { key: 'liver', label: 'Liver', labelJa: '肝臓' },
    { key: 'portal', label: 'Portal inflow', labelJa: '門脈血流' },
    { key: 'hepatic', label: 'Hepatic vein outflow', labelJa: '肝静脈への流出' },
    { key: 'bile', label: 'Bile', labelJa: '胆汁', activeFrom: 0.45 },
  ],

  stages: [
    {
      id: 'fasting',
      name: 'Fasting',
      nameJa: '空腹時',
      at: 0,
      summary:
        'Blood from the gut reaches the liver through the portal vein before it reaches the rest of the body. Between meals the gallbladder fills and holds bile.',
      summaryJa:
        '腸から戻る血液は、全身に回る前にまず門脈を通って肝臓に入ります。食間には胆嚢が胆汁をためて保持します。',
    },
    {
      id: 'postprandial',
      name: 'After a meal',
      nameJa: '食後',
      at: 0.45,
      summary:
        'Portal flow rises with digestion, and the gallbladder contracts, sending bile down the duct to the duodenum.',
      summaryJa:
        '消化にともない門脈血流が増加し、胆嚢が収縮して胆汁が胆管を通り十二指腸へ送られます。',
    },
    {
      id: 'peak',
      name: 'Peak digestion',
      nameJa: '消化のピーク',
      at: 0.78,
      summary:
        'Everything absorbed passes through the liver on its way out — which is why the liver sees it before the circulation does.',
      summaryJa:
        '吸収されたものはすべて肝臓を経由してから循環に入ります。肝臓が「最初に受け取る臓器」である理由です。',
    },
  ],

  range: { start: 'Fasting', startJa: '空腹時', end: 'Digesting', endJa: '消化中' },
  progressLabel: { label: 'Digestive state', labelJa: '消化の状態' },

  annotations: [
    { id: 'right-lobe', text: 'Right lobe', sub: '右葉', anchor: 'rightLobe', range: [0, 1] },
    { id: 'left-lobe', text: 'Left lobe', sub: '左葉', anchor: 'leftLobe', range: [0, 1], compact: false },
    { id: 'porta', text: 'Porta hepatis', sub: '肝門部', anchor: 'porta', range: [0, 1] },
    { id: 'gallbladder', text: 'Gallbladder', sub: '胆嚢', anchor: 'gallbladder', range: [0, 1] },
    { id: 'duodenum', text: 'Duodenum', sub: '十二指腸', anchor: 'duodenum', range: [0.45, 1], compact: false },
  ],
};

export const PANCREATIC_SECRETION = {
  id: 'pancreatic-secretion',
  status: 'prototype',
  title: 'Pancreatic secretion',
  titleJa: '膵臓の分泌',
  subtitle: 'One gland, two outputs: duct and bloodstream · prototype',
  subtitleJa: '1 つの臓器がもつ 2 つの分泌経路 ｜ プロトタイプ',

  palette: {
    gland: '#e0b088',
    duct: '#8fd6c4',
    enzyme: '#7fe3c0',
    islet: '#7fb2ff',
  },

  legend: [
    { key: 'gland', label: 'Pancreas', labelJa: '膵臓' },
    { key: 'duct', label: 'Pancreatic duct', labelJa: '膵管' },
    { key: 'enzyme', label: 'Exocrine — enzymes', labelJa: '外分泌（消化酵素）' },
    { key: 'islet', label: 'Endocrine — islets', labelJa: '内分泌（膵島）' },
  ],

  stages: [
    {
      id: 'fasting',
      name: 'Fasting',
      nameJa: '空腹時',
      at: 0,
      summary:
        'Both outputs tick over at a low rate. The gland is one organ but the two routes out of it are entirely separate.',
      summaryJa:
        '外分泌・内分泌ともに低い水準で推移します。1 つの臓器ですが、2 つの分泌経路はまったく別です。',
    },
    {
      id: 'exocrine',
      name: 'Enzymes to the duct',
      nameJa: '膵管への外分泌',
      at: 0.35,
      summary:
        'Most of the gland is exocrine: enzymes are secreted into the duct system and leave through the head into the duodenum.',
      summaryJa:
        '膵臓の大部分は外分泌組織です。消化酵素は膵管に分泌され、膵頭部から十二指腸へ出ていきます。',
    },
    {
      id: 'endocrine',
      name: 'Islets to the blood',
      nameJa: '膵島から血中へ',
      at: 0.7,
      summary:
        'The islets are a small fraction of the gland and secrete the other way — directly into the blood, not into the duct.',
      summaryJa:
        '膵島は膵臓のごく一部で、分泌先が逆です。膵管ではなく血中へ直接分泌します。',
    },
  ],

  range: { start: 'Fasting', startJa: '空腹時', end: 'After a meal', endJa: '食後' },
  progressLabel: { label: 'Secretory drive', labelJa: '分泌の亢進' },

  annotations: [
    { id: 'head', text: 'Head', sub: '膵頭部', anchor: 'head', range: [0, 1] },
    { id: 'body', text: 'Body', sub: '膵体部', anchor: 'body', range: [0, 1], compact: false },
    { id: 'tail', text: 'Tail', sub: '膵尾部', anchor: 'tail', range: [0, 1] },
    { id: 'islet', text: 'Islet', sub: '膵島', anchor: 'islet', range: [0.6, 1] },
    { id: 'duodenum', text: 'Duodenum', sub: '十二指腸', anchor: 'duodenum', range: [0.3, 1], compact: false },
  ],
};
