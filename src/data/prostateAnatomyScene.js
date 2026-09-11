/**
 * What the prostate anatomy scene says, in both languages.
 *
 * The geometry is `scenes/reproductive/organs/prostateAnatomy.js`. One idea
 * carries the copy and it is repeated where a reader is looking at either half
 * of it: **the zones are what prostate disease is about.** Cancer arises mostly
 * in the peripheral zone, which is the one a finger reaches; benign enlargement
 * arises in the transition zone, which is the one wrapped round the urethra.
 * Nothing about the outside of the gland tells the two apart.
 *
 * The copy states where each zone is and what runs through it, and stops. It
 * names no threshold, no score, no treatment and no test result. Disease is
 * somebody else's scene.
 */

export const PROSTATE_SCENE_COLORS = Object.freeze({
  'peripheral-zone': '#c76b6f',
  'transition-zone': '#e0a14e',
  'central-zone': '#8f6bbd',
  'anterior-fibromuscular-stroma': '#c9b6a8',
  'prostatic-urethra': '#8fd6c4',
  verumontanum: '#d8703f',
  'right-ejaculatory-duct': '#b05a8f',
  'left-ejaculatory-duct': '#b05a8f',
  'right-seminal-vesicle': '#b58ac4',
  'left-seminal-vesicle': '#b58ac4',
  'right-vas-deferens': '#9c6aa8',
  'left-vas-deferens': '#9c6aa8',
  'bladder-neck': '#c8a6b8',
  rectum: '#c68f72',
});

export const PROSTATE_NATURAL_COLORS = Object.freeze({
  'peripheral-zone': '#c08a7a',
  'transition-zone': '#c08a7a',
  'central-zone': '#b8867c',
  'anterior-fibromuscular-stroma': '#c8b2a4',
  'prostatic-urethra': '#b7c8c1',
  verumontanum: '#c08878',
  'right-ejaculatory-duct': '#b09098',
  'left-ejaculatory-duct': '#b09098',
  'right-seminal-vesicle': '#b8a0ba',
  'left-seminal-vesicle': '#b8a0ba',
  'right-vas-deferens': '#ab949e',
  'left-vas-deferens': '#ab949e',
  'bladder-neck': '#c8a6b8',
  rectum: '#c08a72',
});

export const PROSTATE_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Zones', labelJa: '領域別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const ZONE_NOTE = {
  note: 'The zone boundaries are surfaces of revolution and planes; real ones are neither, and the proportions here are drawn so four zones can be told apart. In life the peripheral zone is about seventy per cent of the glandular tissue and the transition zone about five. **No volume may be read off this model.**',
  noteJa:
    '領域の境界は回転面と平面で描いていますが、実際の境界はそのどちらでもありません。各領域の比も、4つを見分けられるように描いたものです。実際には末梢域が腺組織の約70%、移行域が約5%を占めます。**このモデルから容積を読み取らないでください。**',
};

export function prostateStructureCopy() {
  const zone = (id, name, nameJa, description, descriptionJa) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Prostate', 'Zones', name],
      hierarchyJa: ['前立腺', '領域', nameJa],
      description,
      descriptionJa,
      ...ZONE_NOTE,
      colorKey: id,
      legendKey: 'zone',
      tags: ['zone'],
    },
  ];

  const inside = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Prostate', 'What runs through it', name],
      hierarchyJa: ['前立腺', '内部を走るもの', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'lumen',
      tags: ['lumen'],
    },
  ];

  const duct = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Male genital tract', name, name],
      hierarchyJa: ['男性生殖路', nameJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'tract',
      tags: ['tract'],
    },
  ];

  const neighbour = (id, name, nameJa, description, descriptionJa, note, noteJa) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Neighbours', name, name],
      hierarchyJa: ['周囲の構造', nameJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'neighbour',
      tags: ['neighbour'],
    },
  ];

  return new Map([
    zone(
      'peripheral-zone',
      'Peripheral zone',
      '末梢域',
      'The outside of the gland, behind and below — a shell rather than a wedge. It is most of the glandular tissue, it is the part a finger reaches through the rectum, and it is where most prostate cancer arises.',
      '腺の外側、背側から下方を占める部分で、くさび形ではなく殻状の領域です。腺組織の大部分を占め、直腸から触知できるのはここであり、前立腺癌の多くもここから発生します。'
    ),
    zone(
      'transition-zone',
      'Transition zone',
      '移行域',
      'The inner gland wrapped round the urethra above the verumontanum. It is the smallest zone in a young man and the one that enlarges with age — which is why enlargement obstructs the urethra rather than pressing on the rectum.',
      '精丘より上で尿道を取り巻く内腺の部分です。若年では最も小さい領域ですが、加齢とともに増大するのはここです。前立腺肥大が直腸ではなく尿道を圧迫するのは、この位置関係によります。'
    ),
    zone(
      'central-zone',
      'Central zone',
      '中心域',
      'The inner gland behind and above the transition zone: the cone the ejaculatory ducts run down from the base to the verumontanum. Disease arises here least often of the three.',
      '移行域の背側上方にある内腺で、射精管が腺底部から精丘へ下行する円錐状の領域です。3つの腺領域のなかでは疾患の発生が最も少ない部分です。'
    ),
    zone(
      'anterior-fibromuscular-stroma',
      'Anterior fibromuscular stroma',
      '前線維筋性間質',
      'The front of the gland, and **not glandular at all** — muscle and fibrous tissue. It is why the front of the prostate behaves differently from the rest of it and why a biopsy aimed there finds nothing.',
      '腺の前面を占める部分で、**腺組織ではありません**——筋組織と線維組織です。前立腺の前面が他と異なる性質を示すのも、ここを狙った生検で腺組織が得られないのも、このためです。'
    ),
    inside(
      'prostatic-urethra',
      'Prostatic urethra',
      '前立腺部尿道',
      'Runs from the bladder neck to the apex, through the gland rather than beside it — so gland and urethra are not independent. It bends forward at the verumontanum, which divides it into a proximal and a distal half.',
      '膀胱頸部から尖部まで、腺の脇ではなく腺の中を貫いて走ります。したがって腺の大きさと尿道は無関係ではありません。精丘の高さで前方に屈曲し、これによって近位部と遠位部に分かれます。',
      'One tube of constant calibre. The urethral crest, the sinuses and the sphincters are not drawn, and no calibre here is a measurement.',
      '口径一定の1本の管として描いています。尿道稜・前立腺洞・括約筋は描いておらず、口径も実測値ではありません。'
    ),
    inside(
      'verumontanum',
      'Verumontanum',
      '精丘',
      'The ridge on the back wall of the urethra where the two ejaculatory ducts open. It is the landmark everything inside the gland is placed from — above it the transition zone, behind and above it the central zone.',
      '尿道後壁の隆起で、左右の射精管がここに開口します。腺内部の位置関係の基準となる構造で、これより上に移行域、背側上方に中心域があります。',
      'Drawn as a small marker, not as a ridge with openings in it. The prostatic utricle that opens on it is not modelled.',
      '開口部を持つ隆起ではなく、小さなマーカーとして描いています。ここに開口する前立腺小室も表現していません。'
    ),
    duct(
      'right-ejaculatory-duct',
      'Right ejaculatory duct',
      '右射精管',
      'Formed where the vas deferens and the seminal vesicle join, it enters the base of the prostate and runs down **inside** the gland to open on the verumontanum. Its whole course through the prostate is what gives the central zone its shape.',
      '精管と精嚢が合流してできた管で、前立腺底部から入り、腺の**内部**を下行して精丘に開口します。中心域の形は、この腺内の走行によって決まっています。'
    ),
    duct(
      'left-ejaculatory-duct',
      'Left ejaculatory duct',
      '左射精管',
      'The same on the patient’s left.',
      '患者左側の同じ管です。'
    ),
    duct(
      'right-seminal-vesicle',
      'Right seminal vesicle',
      '右精嚢',
      'A coiled tube in a lobulated sac, behind the bladder and above the prostate. It makes most of the volume of semen and it does **not** store sperm.',
      '膀胱の背側、前立腺の上方にある、分葉した袋の中の屈曲した管です。精液の容量の大半を産生しますが、精子を貯蔵する場所では**ありません**。',
      'Drawn as one lobulated sac. The single coiled tube inside it is not modelled.',
      '分葉した1つの袋として描いています。内部の1本の屈曲した管は表現していません。'
    ),
    duct(
      'left-seminal-vesicle',
      'Left seminal vesicle',
      '左精嚢',
      'The same on the patient’s left.',
      '患者左側の同じ精嚢です。'
    ),
    duct(
      'right-vas-deferens',
      'Right vas deferens (ampulla)',
      '右精管（膨大部）',
      'Arrives from the testis, widens into its ampulla behind the bladder, and joins the seminal vesicle to become the ejaculatory duct. Only the last stretch is here.',
      '精巣から上行し、膀胱背側で膨大部として太くなり、精嚢と合流して射精管になります。ここに描いているのは最後の部分だけです。',
      'The rest of its course — through the inguinal canal and down to the testis — is not in this scene.',
      '鼠径管を通って精巣に至る残りの走行は、このシーンには含まれていません。'
    ),
    duct(
      'left-vas-deferens',
      'Left vas deferens (ampulla)',
      '左精管（膨大部）',
      'The same on the patient’s left.',
      '患者左側の同じ精管です。'
    ),
    neighbour(
      'bladder-neck',
      'Bladder neck',
      '膀胱頸部',
      'Sits directly on top of the gland, and the urethra continues straight out of it. The prostate is between the bladder and the outside, which is the whole of why it can obstruct.',
      '前立腺の直上に位置し、尿道はここからそのまま続きます。前立腺は膀胱と体外の間にあり、閉塞を起こしうるのはこの位置関係のためです。',
      'Context only: the bladder itself is `bladder-anatomy`, and its internal sphincter is not drawn.',
      '位置関係を示すためだけの表示です。膀胱そのものは `bladder-anatomy` にあり、内尿道括約筋も描いていません。'
    ),
    neighbour(
      'rectum',
      'Rectum',
      '直腸',
      'Immediately behind the gland, separated from it by a thin layer. The peripheral zone is the surface against it — which is what makes a rectal examination examine a prostate at all.',
      '腺のすぐ背側にあり、薄い層で隔てられています。直腸に接しているのは末梢域で、直腸診が前立腺の診察になるのはこのためです。',
      'Context only: a plain tube. Denonvilliers’ fascia between the two is not drawn.',
      '位置関係を示すためだけの表示です。単純な管として描いており、両者の間のデノンビリエ筋膜は表現していません。'
    ),
  ]);
}

export const PROSTATE_ANATOMY_META = Object.freeze({
  id: 'prostate-anatomy',
  status: 'alpha',
  title: 'Interactive prostatic anatomy',
  titleJa: '触れて学ぶ前立腺の解剖',
  subtitle: 'Point to identify; click or tap to pin a zone, the urethra or a duct',
  subtitleJa: '触れて部位を確認・クリック／タップで各領域・尿道・各管を固定',
  inspection: { background: 'studio' },
  palette: {
    zone: PROSTATE_SCENE_COLORS['peripheral-zone'],
    lumen: PROSTATE_SCENE_COLORS['prostatic-urethra'],
    tract: PROSTATE_SCENE_COLORS['right-seminal-vesicle'],
    neighbour: PROSTATE_SCENE_COLORS.rectum,
  },
  legend: [
    { key: 'zone', label: 'Four zones', labelJa: '4つの領域' },
    { key: 'lumen', label: 'Urethra and verumontanum', labelJa: '尿道・精丘', activeFrom: 0.35 },
    { key: 'tract', label: 'Ducts and seminal vesicles', labelJa: '射精管・精嚢・精管' },
    { key: 'neighbour', label: 'Bladder neck and rectum', labelJa: '膀胱頸部・直腸' },
  ],
  stages: [
    {
      id: 'zones',
      name: 'Four zones',
      nameJa: '4つの領域',
      at: 0,
      summary:
        'Peripheral zone outside, transition and central zones inside, and a front that is not glandular at all.',
      summaryJa:
        '外側の末梢域、内側の移行域と中心域、そして腺組織ではない前面の間質です。',
    },
    {
      id: 'inside',
      name: 'What runs through them',
      nameJa: '内部を走るもの',
      at: 1,
      summary:
        'The zones fade: the urethra through the gland, the two ejaculatory ducts down inside the central zone, and the verumontanum where all three meet.',
      summaryJa:
        '各領域を薄くすると、腺を貫く尿道、中心域の内部を下行する左右の射精管、そしてそれらが出会う精丘が見えます。',
    },
  ],
  range: { start: 'Zones', startJa: '領域', end: 'What runs through', endJa: '内部の構造' },
  progressLabel: { label: 'Zone transparency', labelJa: '各領域の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Shape is schematic and no dimension is measured. **The zone proportions are drawn so four zones can be told apart and are not the real ones**: no volume may be read off this model. Zone boundaries are surfaces of revolution and planes; real ones are neither. The capsule, the neurovascular bundles, the sphincters, the prostatic utricle and Denonvilliers’ fascia are not drawn, and nothing here is anyone’s prostate.',
  disclaimerJa:
    '教育用肉眼解剖モデル：形状は模式的で、いずれの寸法も実測値ではありません。**各領域の比は4つを見分けられるように描いたもので、実際の比ではありません**——このモデルから容積を読み取らないでください。領域の境界は回転面と平面で描いており、実際の境界はそのどちらでもありません。被膜・神経血管束・括約筋・前立腺小室・デノンビリエ筋膜は描いておらず、特定の個人の前立腺でもありません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
