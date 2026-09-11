# Handoff — 正常解剖から病態へ（Claude② → Claude③）

Last updated: 2026-09-11。対象は 2026-09 に追加した 12 シーンです——
前立腺・男性生殖路・膝・肩・股、そして眼・耳・皮膚・リンパ節・全身リンパ路・
乳房・脊柱。既存の臓器シーンは同じ契約に載っていますが、ここには**新しく足した
分だけ**を書きます。

このファイルは **足場の目録** です。病態ロジックはここには一切ありません。
Claude② は病態を実装しません——病態が触ってよいものと、触ると嘘になるものを
決めて渡すところまでが Claude② の仕事です。

---

## 共通の契約

どのシーンも `OrganAnatomyScene` を継承し、`buildOrgan()` が
`{ object, structures, dispose }` を返します。`structures[]` の 1 要素が
**読者が指せる 1 構造**で、`id` が安定した識別子です。

```js
{ id, name, nameJa, hierarchy, hierarchyJa, description, descriptionJa,
  note, noteJa, tags, colors: { regions, natural }, legendKey, meshes,
  ghostAt?, ghostOpacity?, revealAt?, preferredView?, doubleSided? }
```

- **`id` は契約です。** 病態シーンが指す先はこの文字列で、名前でも mesh でもありません
- **`meshes` は「その構造がどう描かれているか」**で、1 構造が複数 mesh を持ちます
  （例：`articular-cartilage` は膝で 4 mesh、肩・股で 2 mesh）。
  構造単位で選択・isolate・着色してください
- **`tags` は表示の単位**です。`hideTags` を持つ viewpoint がこれで構造を伏せます
- **リセット**は `OrganAnatomyScene` が持ちます。viewpoint は自分が変えたものを
  必ず戻し、`表示をリセット` で色・断面・非表示・isolation がすべて初期状態に戻ります。
  病態側で別のリセット経路を作らないでください
- **幾何は差し替え可能な位置に置いてあります。** `structureId` / 用語 / geometry /
  presentation を分けてあるので、将来 HRA・Zygote 等の mesh に入れ替えるときに
  変わるのは builder だけです。病態側が builder の内部座標に依存しないでください

### 病態側が守るべき境界（全シーン共通）

- **解剖学的位置関係を反転・前後変更しない。** 見えないものは opacity / hide /
  isolate / view / section で見せます。構造を「見える場所へ動かす」のは不可です
  （`CLAUDE.md`、`docs/architecture-rules.md`）
- **寸法を主張しない。** どのシーンにも実測値はありません。病態側が数値を出すなら、
  その数値はモデル層（`src/models/`）から来るべきで、ジオメトリから測ってはいけません
- **presentation 値を解剖値として扱わない。** 下に挙げた「表示のために誇張した値」は
  section / layer view 上の visual emphasis であって、解剖形状の寸法ではありません

---

## `prostate-anatomy`

| | |
| --- | --- |
| 構造 | 14 |
| tags | `zone` `lumen` `tract` `neighbour` |
| views | `oblique` `anterior` `rectal` `sagittal` `vesicles` `transverse-section` |
| bounds | 1.65 × 2.41 × 1.17（`neighbour` を除いた subject） |

```
peripheral-zone  anterior-fibromuscular-stroma  transition-zone  central-zone
prostatic-urethra  verumontanum
right-ejaculatory-duct  left-ejaculatory-duct
right-seminal-vesicle  left-seminal-vesicle  right-vas-deferens  left-vas-deferens
bladder-neck  rectum
```

**anchors** — `buildProstateZones()` の戻り値 `anchorPoints`:
`verumontanum` / `bladderNeck` / `apex` / `rectalSurface`、および `urethraCurve`
（尿道の走行そのもの。`getPointAt(u)` で任意点が取れます）。

**病態候補**: 前立腺肥大（BPH）、前立腺癌、前立腺炎、尿閉。

**動かしてよいもの**: `transition-zone` の大きさ（BPH はここが増大します）、
`prostatic-urethra` の内径、`peripheral-zone` 内の病変表示。

**変えてはいけない関係**:
- 末梢域は外側（殻）、移行域・中心域は内側。**この内外は疾患で入れ替わりません**
- 尿道は腺の**中**を通ります。腺が大きくなったときに尿道を腺の外へ逃がさないこと
- 射精管は精丘に開口し、中心域の内部を走ります
- 直腸は背側、膀胱頸部は上。末梢域が直腸に接する面であること
- `INNER_GLAND_FRACTION` は**表示値**です。4 領域を見分けるための比であって、
  実際の領域比ではありません。ここから容積・比率を計算しないでください

---

## `male-tract-anatomy`

| | |
| --- | --- |
| 構造 | 14 |
| tags | `route` `around` |
| views | `route` `testis` `junction` `anterior` `sagittal-section` |
| bounds | 0.98 × 3.94 × 2.94 |

```
testis  epididymis  vas-deferens  ejaculatory-duct
prostatic-urethra  membranous-urethra  spongy-urethra  external-urethral-orifice
seminal-vesicle  prostate  corpus-spongiosum
right-corpus-cavernosum  left-corpus-cavernosum  bladder
```

**anchors**: `anchorPoints` = `testis` / `epididymisTail` / `verumontanum` /
`bladderNeck` / `apex` / `meatus`。加えて `route` 配列が**経路の順序**そのものです。

**病態候補**: 精管結紮、閉塞性無精子症、精巣上体炎、尿道狭窄、停留精巣。

**動かしてよいもの**: 経路上の 1 点を「断つ／詰まる／狭める」表現、各区間の内径。

**変えてはいけない関係**:
- **経路は連続した 1 本**です。各区間の曲線は前の区間の終点から始まっており
  （`tests/organ-parts-anatomy.test.js` が固定）、順序を入れ替えないこと
- 精巣上体は精巣の**背側**、尿道海綿体は尿道を**内包**します
- 膜様部は 3 区間のうち最短です

---

## `knee-anatomy`

| | |
| --- | --- |
| 構造 | 17 |
| tags | `bone` `cushion` `cartilage` `ligament` `tendon` |
| views | `anterior-oblique` `anterior` `medial` `lateral` `posterior` `ligaments-only` `plateau-from-above` |
| bounds | 1.97 × 5.14 × 1.70 |

```
femoral-shaft  medial-femoral-condyle  lateral-femoral-condyle
medial-tibial-plateau  lateral-tibial-plateau  tibial-shaft  fibula  patella
articular-cartilage（1 構造 = 4 mesh）  medial-meniscus  lateral-meniscus
anterior-cruciate-ligament  posterior-cruciate-ligament
medial-collateral-ligament  lateral-collateral-ligament
quadriceps-tendon  patellar-tendon
```

**anchors** — `buildKneeJoint()` の `attachmentPoints`（`ATTACHMENTS` と同じ鍵）:
`aclFemoral` `aclTibial` `pclFemoral` `pclTibial` `mclFemoral` `mclTibial`
`lclFemoral` `lclTibial` `quadriceps` `patellaTop` `patellaBottom`
`tibialTuberosity`。左右は `MEDIAL` 定数 1 本から導いてください（右膝、内側が +x）。

**病態候補**: ACL 損傷、半月板損傷、変形性膝関節症、膝蓋腱症、MCL 損傷。

**動かしてよいもの**: 各靱帯・半月板の**表示**（断裂の描き分け）、
`articular-cartilage` の厚み表現、関節裂隙の幅。

**変えてはいけない関係**:
- 十字靱帯は**顆間窩の中**で交叉します。ACL は外側顆の内壁から前下方、
  PCL は内側顆の内壁から後下方
- 大腿骨顆は**前方では連続**していて、そこが膝蓋骨の滑る面（滑車）です。
  後方だけが分かれていて、そこが顆間窩です
- 外側側副靱帯は**腓骨頭**に終わり、内側側副靱帯は脛骨に終わります
- 軟骨の厚みは**見えるように描いた表示値**です。狭小化の程度を読み取らないこと
- **このシーンでは何も動きません。** 屈伸・転がり・滑り・screw-home は未実装で、
  病態側がそれを必要とするなら、まず解剖側に運動を足す話になります

---

## `shoulder-anatomy`

| | |
| --- | --- |
| 構造 | 20 |
| tags | `bone` `humerus` `socket` `cartilage` `cuff` `ligament` |
| views | `anterolateral` `anterior` `posterior` `arch` `socket` `cuff-only` |
| bounds | 2.99 × 3.96 × 1.96 |

```
scapula  acromion  coracoid-process  clavicle
humeral-head  humeral-shaft  greater-tubercle  lesser-tubercle
glenoid  glenoid-labrum  articular-cartilage（1 構造 = 2 mesh）
supraspinatus-tendon  infraspinatus-tendon  teres-minor-tendon
subscapularis-tendon  long-head-of-biceps-tendon
coracoacromial-ligament  acromioclavicular-ligament
coracoclavicular-ligament  inferior-glenohumeral-ligament
```

**anchors** — `buildShoulderJoint()` の `anchorPoints`（`SITES` と同じ鍵）:
`glenoid` `humeralHead` `greaterTubercle` `lesserTubercle` `bicipitalGroove`
`coracoidTip` `acromionUnder` `acromioclavicular`。

**病態候補**: 腱板断裂、肩峰下インピンジメント、肩関節脱臼（前方）、
凍結肩、上腕二頭筋長頭腱炎、SLAP 病変、肩鎖関節損傷。

**動かしてよいもの**: 各腱の連続性（断裂）、`glenoid-labrum` の連続性、
`humeral-head` と `glenoid` の相対位置（脱臼は**関係そのものが病態**なので、
これは唯一「動かすことが主張である」例です——ただし**別の表示モードとして明示**し、
通常の解剖表示を書き換えないでください）。

**変えてはいけない関係**:
- 棘上筋腱は**肩峰の下**を通ります。上を通したらインピンジメントが成立しません
- 腱板 4 筋のうち 3 つは大結節、肩甲下筋だけが小結節に停止します
- 上腕二頭筋長頭腱は**関節内**（関節窩の縁）から始まり、結節間溝を下ります
- **`SUBACROMIAL_DISPLAY_GAP` は表示値です。** 肩峰下の間隙は、下を通る腱が
  見えるように実際より広く描いてあります。**ここから clearance を読み取らない**
  でください。狭小化を描くなら、その基準は解剖モデルではなくモデル層が持つべきです

---

## `hip-anatomy`

| | |
| --- | --- |
| 構造 | 15 |
| tags | `bone` `femur` `socket` `cartilage` `ligament` `tendon` |
| views | `anterior-oblique` `anterior` `posterior` `coronal-section` `socket` `ligaments-only` |
| bounds | 2.85 × 3.53 × 1.89 |

```
hip-bone  acetabulum  acetabular-labrum  articular-cartilage（1 構造 = 2 mesh）
femoral-head  femoral-neck  greater-trochanter  lesser-trochanter  femoral-shaft
ligament-of-the-head
iliofemoral-ligament  pubofemoral-ligament  ischiofemoral-ligament
gluteus-medius-tendon  iliopsoas-tendon
```

**anchors** — `buildHipJoint()` の `anchorPoints`（`SITES` と同じ鍵）:
`acetabulum` `femoralHead`（**同一点**）、`greaterTrochanter` `lesserTrochanter`
`iliacSpine` `intertrochantericLine`。

**病態候補**: 大腿骨頸部骨折、変形性股関節症、大腿骨頭壊死、
寛骨臼形成不全、FAI（大腿骨寛骨臼インピンジメント）、後方脱臼。

**動かしてよいもの**: `femoral-neck` の連続性（骨折）、`articular-cartilage` の
厚み表現、`acetabular-labrum` の連続性、`femoral-head` の内部表示（壊死）。

**変えてはいけない関係**:
- **臼蓋の縁は骨頭の最大径より先まで達します。** 皿ではなく受け皿です。
  これを浅くすると、この関節がなぜ安定なのかが消えます
- 骨頭と臼蓋は**同一点**を中心に描かれています（`SITES` の 2 つは同じ座標）。
  脱臼を描くなら、肩と同じく**別の明示的な表示モード**にしてください
- 骨頭は頸部によって骨幹の**側方**に支えられています。荷重が骨幹の軸を
  まっすぐ下りる形に描き換えないこと
- 中殿筋は大転子、腸腰筋は小転子。入れ替えないこと
- **頸体角は見やすさのために描いた角度で、実測値ではありません。** coxa vara /
  valga を角度で主張しないでください

---

---

## `eye-anatomy`

| | |
| --- | --- |
| 構造 | 17 |
| tags | `coat` `anterior` `media` `fundus` `muscle` |
| views | `oblique` `anterior` `sagittal-section` `fundus` `posterior` `muscles` |
| bounds | 2.01 × 2.00 × 3.59 |

```
sclera  choroid  retina
cornea  iris  pupil  lens  ciliary-body
anterior-chamber  vitreous-body
optic-disc  macula  optic-nerve
superior-rectus  inferior-rectus  medial-rectus  lateral-rectus
```

**anchors** — `buildEyeball()` の `anchorPoints`（`SITES` と同じ鍵）:
`pupil` `lens` `iridocornealAngle` `posteriorPole` `opticDisc` `fovea`。
房水経路（毛様体 → 後房 → 瞳孔 → 前房 → 隅角）は **copy には書いてありますが
ジオメトリにはありません**。`iridocornealAngle` がその出口の anchor です。

**病態候補**: 緑内障、白内障、網膜剥離、加齢黄斑変性、糖尿病網膜症、視神経炎。

**動かしてよいもの**: `lens` の透明度と形（白内障・調節）、`pupil` の径、
`retina` の連続性（剥離）、`optic-disc` の陥凹、`macula` の表示。

**変えてはいけない関係**:
- **3層の順序**（外から強膜・脈絡膜・網膜）。厚みは `COAT_DISPLAY_THICKNESS` で、
  **表示値**です。菲薄化・肥厚を「厚さ」として主張しないでください
- 水晶体は虹彩の**後ろ**。前方脱臼を描くなら別の表示モードにしてください
- **視神経乳頭は鼻側、黄斑は耳側。** これが左右どちらの眼かを決めています
- 眼圧はモデルにありません。緑内障を描くなら圧はモデル層が持つべきです

---

## `ear-anatomy`

| | |
| --- | --- |
| 構造 | 12 |
| tags | `outer` `middle` `inner` |
| views | `whole` `outer-ear` `middle-ear` `inner-ear` `ossicles` `from-behind` |
| bounds | 5.17 × 2.91 × 2.39 |

```
auricle  external-auditory-canal
tympanic-membrane  middle-ear-cavity  malleus  incus  stapes  eustachian-tube
cochlea  vestibule  semicircular-canals  vestibulocochlear-nerve
```

**anchors** — `SITES`: `meatus` `umbo` `ovalWindow` `roundWindow`
`eustachianOrigin` `cochlea` `vestibule`。

**病態候補**: 中耳炎、鼓膜穿孔、耳管機能不全、伝音難聴、耳硬化症、
BPPV、感音難聴、メニエール病。

**動かしてよいもの**: `middle-ear-cavity` の内容（貯留液）、
`tympanic-membrane` の連続性と位置（穿孔・陥凹）、耳小骨連鎖の連続性、
`eustachian-tube` の開通。

**変えてはいけない関係**:
- **経路の順序**（耳介 → 外耳道 → 鼓膜 → 鼓室 → 前庭 → 神経）
- ツチ骨は鼓膜に付着、**アブミ骨だけが前庭窓**にはまります
- 耳管は鼓室から**前下内方**へ。これが咽頭と中耳をつなぐ理由です
- **`DEEP_EAR_VISUAL_SCALE` は表示値です。** 鼓膜より内側は実際より大きく
  描いてあります。鼓膜をまたぐ大きさの比を使わないでください

---

## `skin-anatomy`

| | |
| --- | --- |
| 構造 | 10 |
| tags | `layer` `appendage` `supply` |
| views | `block` `cut-face` `surface` `follicle` `contents` |
| bounds | 3.20 × 3.12 × 3.20 |

```
epidermis  dermis  subcutaneous-tissue  adipose-tissue
hair-follicle  sebaceous-gland  sweat-gland
arteriole  venule  sensory-nerve
```

**anchors** — `SITES`: `follicleMouth` `follicleBulb` `sweatCoil` `sweatPore`。
層の境界は `LAYER_DISPLAY_THICKNESS` と、境界面そのものを返す
`reteWave(x,z)` / `dermisFloorWave(x,z)` が export されています。
**深さを扱う病態は、メッシュを測らずにこの 2 関数を使ってください。**

**病態候補**: 褥瘡（深達度）、蜂窩織炎、熱傷（深度）、皮膚炎、創傷治癒、
毛包炎・ざ瘡。

**動かしてよいもの**: 各層の連続性（欠損の深さ）、`arteriole` / `venule` の
表示（充血・虚血）、付属器の表示。

**変えてはいけない関係**:
- **表皮に血管はありません。** 血管・神経は真皮境界より上に入れないでください
- **表皮と真皮の境界は平坦ではありません。** 水疱はこの面での剥離です
- 脂腺は**毛包に**、汗腺は**体表に**開口します。この 2 経路を混ぜないこと
- **層の厚みは実際の比率ではありません**（表皮は実際には真皮の約 1/20、
  ここでは約 1/4）。深達度を mm で主張しないでください

---

## `lymph-node-anatomy` と `lymphatic-drainage`

**2 シーンに分けてあります。縮尺が違うためです。** 片方のスケールで
もう片方を語らないでください。

### `lymph-node-anatomy`（節の縮尺）

| | |
| --- | --- |
| 構造 | 7 |
| tags | `region` `vessel` |
| views | `whole` `flow` `section` `hilum` |
| bounds | 3.94 × 1.82 × 1.64 |

```
capsule  cortex  medulla  lymphoid-follicle
afferent-vessels  efferent-vessel  hilum
```

**anchors** — `SITES`: `hilum` `convexPole`。

**病態候補**: リンパ節腫脹、転移、リンパ腫、結核性リンパ節炎。

**動かしてよいもの**: `cortex` と `lymphoid-follicle` の大きさ（腫脹はまず
ここです）、`capsule` の連続性（節外浸潤）、節内の病変表示。

**変えてはいけない関係**:
- **多数が入り、1 本が出る。** 輸入・輸出の数と向きを入れ替えないこと
- 輸出リンパ管は**門から**。他の場所から出さないでください
- 皮質は外、髄質は内。順序は疾患で入れ替わりません

### `lymphatic-drainage`（全身の縮尺）

| | |
| --- | --- |
| 構造 | 9（`body-silhouette` を含む） |
| tags | `duct` `nodes` `route` `silhouette` |
| views | `front` `left-side` `right-side` `venous-angles` `routes-only` |
| bounds | 3.03 × 6.04 × 1.11 |

```
thoracic-duct  right-lymphatic-duct  cisterna-chyli
cervical-nodes  axillary-nodes  inguinal-nodes
left-drainage-route  right-drainage-route  body-silhouette
```

**anchors** — `SITES`: `cisternaChyli` `leftVenousAngle` `rightVenousAngle`。

**病態候補**: リンパ浮腫、リンパ行性転移、乳び胸。

**動かしてよいもの**: 各 node group の表示（腫大）、経路の表示（閉塞部位）。

**変えてはいけない関係**:
- **左右差。** 右リンパ本幹は右上半身のみ、胸管はそれ以外すべて。
  ここを対称にすると、このシーンの存在理由が消えます
- **`NODE_DISPLAY_SIZE` は表示値です。** マーカーであって節のモデルではありません。
  節の大きさ・個数を使いたいときは `lymph-node-anatomy` 側で扱ってください
- `body-silhouette` は縮尺の目安です。身体のモデルとして使わないでください

---

## `breast-anatomy`

| | |
| --- | --- |
| 構造 | 10 |
| tags | `surface` `gland` `filler` `ductal` `lobular` `support` `chest-wall` `axillary` |
| views | `oblique` `anterior` `lateral` `ducts` `axilla` |
| bounds | 4.34 × 4.00 × 2.49 |

```
skin  nipple  areola
lactiferous-ducts  lobules  adipose-tissue  cooper-ligaments
pectoralis-major  axillary-tail  axillary-nodes
```

**anchors** — `SITES`: `nipple` `chestWall` `axillaryTail` `axilla`。
**`ductal` / `lobular` / `axillary` / `chest-wall` は tag として安定させてあります。**
病態側はこの 4 語で対象を選べます。

**病態候補**: 乳癌（浸潤性乳管癌・浸潤性小葉癌）、乳管内乳頭腫、乳腺炎、
線維腺腫、腋窩リンパ節転移。

**動かしてよいもの**: 腺内の病変表示、`skin` の表示（陥凹・発赤）、
`cooper-ligaments` の牽引表現、`axillary-nodes` の腫大、
`lactiferous-ducts` の内腔。

**変えてはいけない関係**:
- **すべての乳管は乳頭に収束します。** 小葉は乳管の**末端**にあります。
  ductal と lobular の区別はこの位置関係そのものです
- 乳腺は大胸筋の**前**にあり、筋の中には入りません
- クーパー靱帯は**皮膚に達します**。だから牽引が体表に現れます
- 腋窩尾部は乳腺の一部で、腋窩リンパ節は腋窩の構造です
- 描いてある乳管・小葉・靱帯の数は **`DISPLAY_COUNTS`（表示用の数）** です

---

## `spine-anatomy`

| | |
| --- | --- |
| 構造 | 15 |
| tags | `region` `segment` `disc` `neural` |
| views | `column` `lateral` `posterior` `segment` `arch` `canal` |
| bounds | 1.41 × 8.14 × 1.83 |

```
cervical-spine  thoracic-spine  lumbar-spine  sacrum
vertebral-body  pedicle  lamina  facet-joint  spinous-process
annulus-fibrosus  nucleus-pulposus
spinal-canal  spinal-cord  cauda-equina  nerve-root
```

**anchors** — `buildSpine()` の `anchorPoints`:
`detailedBody` `detailedDisc` `canalAtLevel` `conusMedullaris`。
加えて `spineAt(y)`（その高さの前方偏位）、`bodySizeAt(y)`、
`levelHeight(region, i)`、`CORD_ENDS_AT`、`DETAILED_LEVEL` が export されています。
**高さから位置を出すときは、メッシュを測らずにこれらを使ってください。**

**病態候補**: 椎間板ヘルニア、脊柱管狭窄症、圧迫骨折、すべり症、
馬尾症候群、脊髄損傷。

**動かしてよいもの**: `nucleus-pulposus` の位置と形（膨隆・脱出）、
`annulus-fibrosus` の連続性、`spinal-canal` の径、`vertebral-body` の高さ
（圧迫骨折）、`nerve-root` の表示。

**変えてはいけない関係**:
- **髄核は線維輪の中にあります。** 脱出を描くときは「線維輪を破って出た」
  という形にしてください。最初から外に置かないこと
- 椎間板は椎体の**下**。椎体の中に入れないでください
- **脊髄は `CORD_ENDS_AT` で終わり、その下は馬尾です。** 腰椎レベルに脊髄を
  描かないでください
- 神経根は椎弓根の**下**を外側へ出ます
- 弯曲は `spineAt` が 1 本で持っています。部位ごとに別々の曲げ方をしないこと
- 詳細に描いた 1 椎間は**拡大していません**。他と同じ縮尺で、脊柱内の本来の
  位置にあります

---

## `nose-anatomy`

| | |
| --- | --- |
| 構造 | 19 |
| tags | `midline` `outer` `wall` `turbinate` `space` `sinus` `opening` |
| views | `whole` `lateral-wall` `turbinates` `sinuses` `drainage` `coronal` `airway` |
| bounds | 2.68 × 2.39 × 4.43 |

```
external-nose  nasal-vestibule
nasal-septum  lateral-nasal-wall  hard-palate
inferior-turbinate  middle-turbinate  superior-turbinate
inferior-meatus  middle-meatus  superior-meatus  nasopharynx
maxillary-sinus  maxillary-ostium  frontal-sinus  ethmoid-air-cells  sphenoid-sinus
nasolacrimal-duct  olfactory-region
```

**anchors** — `SITES`: `nostril` `tip` `maxillaryOstium` `maxillaryFloor`
`middleMeatus` `nasolacrimalOpening` `olfactoryRoof` `choana`。
面としては `CAVITY`（`septum` `lateralWall` `floor` `roof` `nostril` `choana`）、
`TURBINATES`（3 段の `attachY` `reach` `curl` `thickness` `zFront` `zBack`）、
`turbinateSurface(level, x)`、`turbinateEdge(level)`、`septumTop(z)`、
`septumBottom(z)`、`lateralWallTop(z)`、`NOSE_PROFILE`、`noseHalfWidth(y)`。

**病態候補**: アレルギー性鼻炎、副鼻腔炎（急性・慢性）、鼻茸、
鼻中隔弯曲症、鼻出血、鼻涙管閉塞、嗅覚障害、上顎洞真菌症。

**動かしてよいもの**: 鼻甲介粘膜の厚み（`TURBINATES[*].thickness` と
`curl`）、`maxillary-ostium` の口径、各 meatus の断面、
`maxillary-sinus` の内容（貯留・鏡面像）、`nasal-septum` の正中からの
ずれ、`olfactory-region` の面積。

**変えてはいけない関係**:
- **各鼻道は、同じ名前の鼻甲介の下**にあります。`turbinateSurface` が
  その 1 本の面で、棚とその上下の空間の両方がここから出ています。
  鼻道だけを動かすと棚の中に空間が入ります
- **上顎洞の自然孔は洞の天井側**にあり、中鼻道へ開きます。
  ここを下げるとこのシーンの主張が消えます
- **鼻涙管は下鼻道に開口し、副鼻腔はどれも下鼻道に開きません**
- 嗅部は**すべての鼻甲介より上**の天井にあります
- 描いてあるのは**右側だけ**です。左の鼻腔・鼻甲介・副鼻腔はありません
- 中鼻道の内部構造（鉤状突起・篩骨胞・半月裂孔）は**描いていません**。
  osteomeatal complex の細部を主張する病態シーンは、まずこれを足す
  必要があります

---

## `larynx-anatomy`

| | |
| --- | --- |
| 構造 | 19 |
| tags | `pharynx` `above` `skeleton` `inlet` `glottis` `below` `nerve` |
| views | `whole` `from-behind` `crossing` `skeleton` `from-above` `front-of-neck` `sagittal` |
| bounds | 2.09 × 7.90 × 2.57 |

```
nasopharynx  oropharynx  laryngopharynx  piriform-sinus  soft-palate  palatine-tonsil
epiglottis  hyoid-bone  thyroid-cartilage  cricoid-cartilage
arytenoid-cartilage  cricothyroid-membrane
vestibular-fold  laryngeal-ventricle  vocal-fold  subglottic-space
trachea  oesophagus  recurrent-laryngeal-nerve
```

**anchors** — `SITES`: `epiglottisTip` `inlet` `glottis` `prominence`
`cricothyroid` `piriform` `oesophagusMouth`。
高さは `LEVELS`（`skullBase` `softPalate` `laryngealInlet` `vestibularFold`
`ventricle` `vocalFold` `subglottis` `cricoidBase` `floor`）、
面としては `pharynxSection(y)`・`pharynxFrontAt(y, across)`・
`laryngealWallAt(z)`・`LARYNX_INNER_RADIUS`・`GLOTTIS_DISPLAY_GAP`。

**病態候補**: 喉頭浮腫、クループ（声門下）、急性喉頭蓋炎、声帯麻痺（反回神経）、
声帯ポリープ・結節、喉頭癌・下咽頭癌、扁桃炎・扁桃肥大、
睡眠時無呼吸（上気道の虚脱）、誤嚥。

**動かしてよいもの**: `vocal-fold` の内外転（`GLOTTIS_DISPLAY_GAP`）と厚み、
`vestibular-fold` の厚み、`subglottic-space` の口径、`epiglottis` の傾き、
`palatine-tonsil` の大きさ、各 pharynx 区間の断面
（`pharynxSection` の `halfWidth` / `halfDepth`）。

**変えてはいけない関係**:
- **上から下へ**：仮声帯 → 喉頭室 → 声帯 → 声門下。`LEVELS` がこの順序を
  持っています。喉頭室を挟まずに 2 対のひだを並べないでください
- **声門は V です。** 前方で左右が正中で合わさり（前交連）、後方へ開きます。
  前方の合わさりは表示値ではありません
- **輪状軟骨は完全な輪**です。後方に切れ目を入れないでください
- **梨状陥凹は喉頭の外側**を前方へ回り、下咽頭本体は喉頭の後方に留まります。
  この関係が「嚥下物は気道を迂回する」という主張そのものです
- **食道は気管の後方**、反回神経はその間の溝を**下から**上行します
- `GLOTTIS_DISPLAY_GAP` は表示値です。ここから気道の太さを出さないでください
- 輪状甲状膜は**指標としてのみ**描いています。到達経路・深さ・角度を
  このモデルから導かないでください

---

## `oral-anatomy`

| | |
| --- | --- |
| 構造 | 19 |
| tags | `roof` `bone` `tongue` `floor` `gland` |
| views | `whole` `from-the-side` `tongue` `underneath` `glands` `sagittal` |
| bounds | 4.84 × 4.44 × 6.82 |

```
lips  upper-teeth  lower-teeth  mandible
hard-palate  soft-palate  palatoglossal-arch  palatine-tonsil
tongue-oral-part  tongue-root  vallate-papillae  lingual-tonsil
floor-of-mouth  lingual-frenulum
sublingual-gland  submandibular-gland  submandibular-duct  parotid-gland  parotid-duct
```

**anchors** — `SITES`: `tongueTip` `sulcus` `fauces` `caruncle`
`parotidOpening` `tonsil` `vallecula`。
高さは `LEVELS`（`palate` `upperTeeth` `lowerTeeth` `tongueSurface` `floor`
`jawBase`）、面としては `archHalfWidth(z)`・`SULCUS_Z`・
`JAW_DISPLAY_OPENING`（表示値）。

**病態候補**: 口内炎・アフタ、口腔癌（舌・口腔底）、扁桃炎・扁桃周囲膿瘍、
唾石症（顎下腺）、耳下腺炎（流行性耳下腺炎）、シェーグレン症候群、
舌小帯短縮症、口蓋裂、舌痛症・味覚障害。

**動かしてよいもの**: `palatine-tonsil` と `lingual-tonsil` の大きさ、
`tongue-oral-part` / `tongue-root` の表面（潰瘍・腫瘤）、
各腺の大きさ、各導管の口径と内容（唾石）、`soft-palate` の左右差、
`lingual-frenulum` の付着位置。

**変えてはいけない関係**:
- **舌は `SULCUS_Z` で 2 つに分かれます。** 有郭乳頭列はその線の上にあり、
  表面でこの境界を示す唯一の目印です。乳頭列だけを動かさないでください
- **導管の開口部は腺の位置ではありません。** 耳下腺管は上顎歯列の高さへ、
  顎下腺管は舌小帯の脇へ開きます。ここが崩れるとシーンの主張が消えます
- 口蓋扁桃は**口蓋舌弓の後方**のくぼみにあります
- 歯列・下顎骨・口腔底はすべて `archHalfWidth(z)` の 1 本の弓に従います
- **`JAW_DISPLAY_OPENING` は表示値です。** 開口量・咬合関係を
  このモデルから出さないでください。歯列は帯であって歯ではありません

---

## 検証

- `npm test` — カタログ整合性、model profile、各シーンの構造配置
- `npm run verify:anatomy -- --scene <slug> --preview` — 実ブラウザで
  クリック選択・isolate・全表示復帰・viewpoint・色モードを確認します
  （production build には非公開シーンが入らないため `--preview` が要ります）
- 新しいシーンを足すときは `tests/organ-anatomy-scenes.test.js` の `SCENES` と
  `scripts/check-anatomy-interaction.mjs` の `SCENE_POINTS` に 1 行ずつ足してください
