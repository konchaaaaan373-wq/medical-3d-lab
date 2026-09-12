# Handoff — 正常解剖から病態へ（Claude② → Claude③）

Last updated: 2026-09-12。対象は 2026-09 に追加した 25 シーンです——
前立腺・男性生殖路・膝・肩・股、眼・耳・皮膚・リンパ節・全身リンパ路・乳房・
脊柱、鼻副鼻腔・喉頭咽頭・口腔舌・骨盤底・全身骨格・手・足、頸部と肘関節、そして胸部・腹部・骨盤。
既存の臓器シーンは同じ契約に載っていますが、ここには**新しく足した分だけ**を
書きます。

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

## `pelvic-floor-anatomy`

| | |
| --- | --- |
| 構造 | 17 |
| tags | `frame` `muscle` `space` `perineum` `viscus` |
| views | `whole` `from-above` `from-below` `the-sling` `the-gap` `sagittal` |
| bounds | 9.82 × 7.03 × 7.55 |

```
pelvic-ring  sacrum  coccyx  obturator-internus
tendinous-arch  pubococcygeus  iliococcygeus  coccygeus  puborectalis
urogenital-hiatus
perineal-body  perineal-membrane  external-anal-sphincter
urethra  vagina  rectum  anal-canal
```

**anchors** — `SITES`: `hiatus` `anorectalJunction` `perinealBody`
`urethraThroughFloor` `vaginaThroughFloor` `ischialSpine`。
面としては `levatorOrigin(t, side)` と `levatorInsertion(t, side)`（骨盤底の
シートを張る 2 本の線）、`HIATUS_BACK_T`、`FRAME`。

**病態候補**: 骨盤臓器脱（膀胱瘤・子宮脱・直腸瘤）、腹圧性尿失禁、
便失禁、会陰裂傷、分娩時の骨盤底損傷、恥骨直腸筋の奇異性収縮
（排便障害）、慢性骨盤痛。

**動かしてよいもの**: `levatorInsertion` の内側縁の位置（裂孔の広さ）、
各シートの厚みと `sag`、`puborectalis` のつくる角度、
`urethra` / `vagina` / `rectum` の位置と下垂、`perineal-body` の大きさ、
`external-anal-sphincter` の太さ。

**変えてはいけない関係**:
- **裂孔は実在する隙間です。** 左右のシートの内側縁（`levatorInsertion`）が
  その縁であり、表示上の隙間ではありません。ここを塞がないでください
- **尿道と腟は裂孔を通り、腸管は通りません。** 腸管は吊り輪の後方の
  自分自身の隙間を通ります。この非対称がシーンの主張です
- **恥骨直腸筋は腸管の後方**を回ります。前方を通したらシートになります
- 会陰体は**腟の後方・肛門管の前方**です
- 肛門挙筋の各部は 1 枚のシートの区画で、すべて `levatorOrigin` から
  吊り下がります。1 つだけ別の線に付け替えないでください
- **骨は枠であって骨のモデルではありません。** 腸骨翼・寛骨臼・閉鎖孔は
  ありません。骨の形を根拠にする病態を載せないでください
- **何も収縮せず、下垂もしません。** 直腸肛門角は 1 つの固定値です

---

## `hand-anatomy`

| | |
| --- | --- |
| 構造 | 21 |
| tags | `forearm` `carpus` `rays` `tunnel` `soft` |
| views | `whole` `palm` `carpus` `across-the-tunnel` `through-the-tunnel` `from-the-side` |
| bounds | 10.4 × 24.5 × 3.8 |

```
radius  ulna
scaphoid  lunate  triquetrum  pisiform  trapezium  trapezoid  capitate  hamate  hamate-hook
metacarpals  proximal-phalanges  middle-phalanges  distal-phalanges
flexor-retinaculum  carpal-tunnel
flexor-tendons  median-nerve  extensor-tendons  thenar-muscles
```

**anchors** — `SITES`: `tunnel` `scaphoid` `radialPulse` `thumbTip`
`middleTip` `knuckle`。
表としては `RAYS`（5 本の ray の起点・方向・各骨の長さ。母指の `middle` は
`null`）、`raySegment(ray, bone)`、`CARPALS`（8 個の位置と大きさ）、
`TUNNEL`（`radialPillar` / `ulnarPillar` / `from` / `to`）、`RADIAL`。

**病態候補**: 手根管症候群、舟状骨骨折・偽関節、月状骨脱臼、
橈骨遠位端骨折、有鉤骨鉤骨折、ばね指（屈筋腱）、
母指 CM 関節症、伸筋腱断裂。

**動かしてよいもの**: `carpal-tunnel` の断面（内容物の腫脹）、
`median-nerve` の太さと扁平化、`flexor-tendons` の太さ、
`flexor-retinaculum` の厚み、`thenar-muscles` の大きさ（萎縮）、
各骨の連続性（骨折線）、`lunate` の位置（脱臼）。

**変えてはいけない関係**:
- **正中神経は手根管内で最も掌側**、屈筋支帯の裏面に接します。
  腱より深部に置かないでください
- **豆状骨は三角骨の掌側に載って**います。列の 4 つ目として横に並べないでください
- 手根管の屋根は `TUNNEL` の 2 本の柱に固定されます。片方だけ動かすと
  アーチが成立しません
- **中節骨は 4 本です。** 母指には中節骨がなく、これは `RAYS` の
  `middle: null` として書かれています。5 本目を生やさないでください
- 伸筋腱は**すべての骨より背側**です。手背には管がありません
- **骨は骨幹とブロックです。** 関節面・靭帯・舟状骨の血行は描いていません。
  骨癒合や関節不安定性を形から主張しないでください

---

## `foot-anatomy`

| | |
| --- | --- |
| 構造 | 20 |
| tags | `leg` `tarsus` `rays` `arch` `soft` `joint` |
| views | `whole` `from-outside` `from-above` `the-arch` `the-ankle` `ligaments` |
| bounds | 7.9 × 13.9 × 27.8 |

```
tibia  fibula
talus  calcaneus  navicular  cuboid  cuneiforms
metatarsals  proximal-phalanges  middle-phalanges  distal-phalanges
plantar-fascia  spring-ligament
achilles-tendon  tibialis-posterior-tendon  peroneal-tendons
deltoid-ligament  lateral-ligaments
ankle-joint  subtalar-joint
```

**anchors** — `SITES`: `archSummit` `heelInsertion` `ankle` `subtalar`
`lateralMalleolus` `medialMalleolus` `halluxTip`。
表としては `RAYS`（5 本の ray。母趾の `middle` は `null`）、
`raySegment(ray, bone)`、`TARSALS`（足根骨の位置と大きさ。`y` がアーチそのもの）、
`ARCH`（`heel` / `forefoot` / `summit`）、`GROUND`、`MEDIAL`。

**病態候補**: 足底腱膜炎、外側靭帯損傷（足関節捻挫）、扁平足・
後脛骨筋腱機能不全、距骨骨折・距骨壊死、踵骨骨折、外反母趾、
アキレス腱断裂、変形性足関節症。

**動かしてよいもの**: `TARSALS` の `y`（アーチ高——扁平足）、
`plantar-fascia` の厚みと踵付着部、`lateral-ligaments` の連続性、
`tibialis-posterior-tendon` の太さと連続性、`achilles-tendon` の連続性、
各関節の隙間、`RAYS[0]` の方向（外反母趾）。

**変えてはいけない関係**:
- **舟状骨は立方骨より高い位置**にあります。この高さの差がアーチそのもので、
  揃えるとアーチが消えます
- **足底腱膜は `ARCH.summit` より下**を、踵から中足骨頭まで通ります。
  アーチの上に通したら弦ではなくなります
- 距骨は**下腿と踵骨の間**にあり、その上下に 1 つずつ関節があります。
  内返し・外返しは下の関節（距骨下関節）で起こります
- **外果は内果より下**まで達します。この非対称が外側捻挫の理由です
- **内側は 1 枚、外側は 3 本**です。外側を 1 枚にしないでください
- **中節骨は 4 本です**（母趾には中節骨がありません）
- **荷重も運動もありません。** windlass 機構・アーチ低下・歩行は
  このモデルからは主張できません。距骨の血行も描いていません

---

## `skeleton-overview`

| | |
| --- | --- |
| 構造 | 18 |
| tags | `axial` `appendicular` `shoulder` `arm` `pelvis-girdle` `leg` |
| views | `whole` `from-the-side` `from-behind` `the-column` `shoulder-join` `pelvic-join` |
| bounds | 5.8 × 24.0 × 3.1（world unit。1 cm = `WORLD_SCALE` = 0.14） |

```
skull  mandible  cervical-spine  thoracic-spine  lumbar-spine  sacrum-and-coccyx  ribs  sternum
clavicle  scapula  humerus  radius-and-ulna  hand-bones
pelvis  femur  patella  tibia-and-fibula  foot-bones
```

**anchors** — `SITES`: `sternoclavicular` `sacroiliac` `hip` `shoulder`
`crown`（`anchorPoints` は world unit、`SITES` は cm）。
表としては `LEVELS`（cm 単位の全身の高さ）、`SPAN`、`spineAt(y)`、
`STERNOCLAVICULAR`、`WORLD_SCALE`。

**このシーンに病態を載せないでください。** これは地図であって領域では
ありません。骨の形に依存する主張（骨折・変形・関節症）は、その部位を
実際にモデル化したシーン——`spine-anatomy` / `shoulder-anatomy` /
`hip-anatomy` / `knee-anatomy` / `hand-anatomy` / `foot-anatomy` /
`pelvic-floor-anatomy`——に属します。

**ここで使えるのは全身スケールの主題だけです**: 姿勢・側弯の全体像、
四肢の欠損・切断レベル、全身性の骨疾患の分布（骨転移・多発性骨髄腫など
「どこに起きるか」の地図）、成長と骨年齢の概観。

**変えてはいけない関係**:
- **体軸は連続した 1 本**です。頭蓋から仙骨まで途切れさせないでください
- **腕は鎖骨 1 本でしか体幹に接していません。** 肩甲骨は体軸のどの骨とも
  接しません（胸郭に「載る」のは接触であって関節ではありません）
- **脚は仙骨に固定**されています。この左右の対比がシーンの主張そのものです
- 上位肋骨は胸骨に届き、下位肋骨は届きません
- **どの骨も、その骨のモデルではありません。** 形を根拠にしないでください

---

## `neck-anatomy` — 頸部（局所解剖）

| | |
| --- | --- |
| 構造 | 23 |
| tags | `envelope` `muscle` `skeleton` `viscera` `gland` `sheath` `nerve` `thorax` |
| views | `whole` `contents` `recurrent-nerves` `thyroid-bed` `sheath` `from-behind` `sagittal` |
| bounds | 10.0 × 11.3 × 7.2（world unit。1 cm = `WORLD_SCALE` = 0.62） |

```
neck-surface  sternocleidomastoid  strap-muscles  scalene-muscles  posterior-neck-muscles
cervical-vertebrae  hyoid-bone  laryngeal-cartilage  trachea  oesophagus
thyroid-lobe  thyroid-isthmus  parathyroid-gland
carotid-sheath  common-carotid-artery  internal-carotid-artery  external-carotid-artery
internal-jugular-vein  deep-cervical-node
vagus-nerve  recurrent-laryngeal-nerve  subclavian-artery  aortic-arch
```

**anchors** — `SITES`: `prominence` `cricoid` `isthmus` `thyroidLobe`
`nerveEntry` `bifurcation` `aorticTurn` `subclavianTurn`
（`anchorPoints` は world unit、`SITES` は cm）。
関数としては `neckSection(y)`・`airwayAt(y)`・`oesophagusAt(y)`・
`grooveAt(y, side)`・`sheathAt(y, side)`・`sheathContentAt(y, side, key)`、
表としては `LEVELS`（cm 単位の高さ）・`SHEATH`・`DISPLAY`・`WORLD_SCALE`。

**このシーンが持っている病態の足場**:
- **甲状腺**: `thyroid-lobe` / `thyroid-isthmus` の体積（びまん性腫大・結節）。
  嚥下時挙上は**このシーンにはありません**——動きを主張するなら、
  まず気道と腺の連結を動かす仕組みが要ります
- **反回神経**: `recurrent-laryngeal-nerve` は左右が別々に書かれています。
  片側麻痺の「原因の高さ」（頸部 vs 胸部）を指せる唯一のシーンです。
  ただし**声帯そのものはここにありません**——結果（嗄声・声帯麻痺）は
  `larynx-anatomy` 側の構造です。2 シーンにまたがる主張になります
- **リンパ節**: `deep-cervical-node` は 1 本の鎖です。転移の「レベル」を
  主張するなら、**まずレベル I〜VI を構造として分ける必要があります**
- **頸動脈**: `common-carotid-artery` の分岐部（`SITES.bifurcation`）は
  プラーク・狭窄の定位置ですが、**内腔は描いていません**。狭窄率を主張するなら
  内腔が要ります
- **上皮小体**: `parathyroid-gland` は 4 個・典型位置・**実物より大きい**。
  腺腫の局在を主張してはいけません

**すでに載っている病態からの参照について（`multinodular-goitre`）**:
このシーンが main に入る前、甲状腺腫大シーンは「後方への腫大が反回神経と
上皮小体を追い越す」という主張の参照先を `larynx-anatomy`（神経の行き先）と
`thyroid-anatomy`（腺そのもの）に置いていました。**どちらも正しく、
置き換える必要はありません。** ただし `neck-anatomy` だけが答えられることが
1 つあります——**腺の外側に何があるか**（頸動脈鞘・気管・食道）と、
**左右の反回神経がなぜ違う高さから来るのか**です。参照を足すかどうかは
Claude③ の判断で、こちらからは足していません。

**変えてはいけない関係**:
- **食道は気道の後ろ**です。前に出さないでください
- **鞘の中の 3 つの順序**（動脈が内側・静脈が外側・迷走神経が後方）は
  `SHEATH.contents` 1 か所が決めています。個別に動かさないでください
- **左の反回神経は右より低いところで回ります。** これがこのシーンの主題です。
  左右を同じ形にした瞬間、シーンは何も言わなくなります
- **甲状腺葉の内側面は気管の表面そのもの**です（`clearAirway`）。
  葉を気管から離したり、気管の中へ入れたりしないでください
- **大動脈弓と鎖骨下動脈は文脈**です（`contextTags`）。縦隔を足さないでください
- `DISPLAY` の拡大（上皮小体・迷走神経・反回神経）は**寸法ではありません**。
  病態側で大きさを主張しないでください

---

## `elbow-anatomy` — 肘関節

| | |
| --- | --- |
| 構造 | 21 |
| tags | `humerus` `forearm` `articular` `cartilage` `capsule` `ligament` `tendon` `muscle` `nerve` `vessel` |
| views | `anteromedial` `anterior` `medial` `lateral` `posterior` `hinge` `cubital-fossa` `sagittal` |
| bounds | 2.8 × 5.6 × 2.0（world unit） |

```
humerus-shaft  trochlea  capitellum  medial-epicondyle  lateral-epicondyle
olecranon  ulna-shaft  radial-head  radius-shaft
articular-cartilage  joint-capsule
ulnar-collateral-ligament  radial-collateral-ligament  annular-ligament
biceps-tendon  triceps-tendon  common-flexor-origin  common-extensor-origin
ulnar-nerve  median-nerve  brachial-artery
```

**anchors** — `SITES`: `hinge` `capitellum` `medialEpicondyle`
`lateralEpicondyle` `olecranonTip` `cubitalTunnel` `cubitalFossa`
`radialTuberosity`。関数としては `trochleaRadiusAt(x)`・`collateralOrigin(side)`・
`humerusSection(y)`、表としては `HINGE`・`HUMERUS`・`FOREARM`。

**このシーンが持っている病態の足場**:
- **内側側副靱帯**: `ulnar-collateral-ligament` は前斜走束・後斜走束の 2 mesh です。
  外反ストレスと投球障害の定位置。ただし**動かないので「外反で開く」ことは
  主張できません**——それを言うには屈曲と外反を持つ機構が要ります
- **尺骨神経**: `ulnar-nerve` は内側上顆の背側を通ります。絞扼の局在は指せますが、
  **屈曲時の前方亜脱臼は描いていません**
- **橈骨頭と輪状靱帯**: `radial-head` / `annular-ligament`。肘内障（pulled elbow）の
  舞台ですが、**整復の主張はしてはいけません**（model card の禁止用途）
- **上顆**: `common-flexor-origin` / `common-extensor-origin` は上顆炎の
  「痛む場所」を指せます。炎症・変性・断裂は一切表現していません
- **肘頭と関節包**: `olecranon` / `joint-capsule`。関節液貯留は 1 つの袋の話として
  扱えますが、**脂肪体（fat pad sign の主体）は描いていません**

**変えてはいけない関係**:
- **軸は 1 本です。** 滑車・小頭・両側副靱帯の起始はすべて `HINGE` から
  派生しています。個別に動かすと、このシーンの主張が消えます
- **尺骨の切痕は滑車の表面そのもの**です（`clearTrochlea`）。離したり
  めり込ませたりしないでください。半円以上巻いていることが骨性安定性の根拠です
- **輪状靱帯は尺骨に付き、橈骨には付きません。** 外側側副靱帯は輪状靱帯に
  終わり、橈骨には届きません
- **尺骨神経は内側上顆の「後ろ」です。** 前に出した瞬間、シーンは嘘になります
- **肘窩は外側から腱・動脈・神経の順**です
- `articular-cartilage` の厚みは**実物より厚く**描いています。寸法として
  使わないでください

---

## `thorax-anatomy` — 胸部（局所解剖）

| | |
| --- | --- |
| 構造 | 23 |
| tags | `cage` `space` `floor` `pleura` `lung` `mediastinum` `heart` `airway` `vessel` `nerve` |
| views | `whole` `cage` `lungs-in-place` `mediastinum` `hilum` `recess` `from-behind` |
| bounds | 11.5 × 8.9 × 8.3（world unit。1 cm = `WORLD_SCALE` = 0.4） |

```
manubrium  sternal-body  xiphoid-process  ribs  costal-cartilages  thoracic-vertebrae
intercostal-space  intercostal-bundle  diaphragm
parietal-pleura  costodiaphragmatic-recess  right-lung  left-lung
mediastinum  heart  pericardium  trachea-and-bronchi  oesophagus
aorta  venae-cavae  pulmonary-arteries  phrenic-nerve  vagus-nerve
```

**anchors** — `SITES`: `sternalAngle` `jugularNotch` `carina` `hilumLeft`
`hilumRight` `apexBeat` `costophrenicAngle` `oesophagealHiatus` `aorticHiatus`
`cavalOpening`（`anchorPoints` は world unit、`SITES` は cm）。
関数としては `chestSection(y)`・`ribPath(i, t, side)`・`ribBoneFraction(i)`・
`mediastinumSection(y)`・`bronchusPath(side, t)`・`diaphragmAt(x, z)`、
表としては `LEVELS`・`RIB_LEVELS`・`AIRWAY`・`WORLD_SCALE`。

**このシーンが持っている病態の足場**:
- **気胸・胸水**: `parietal-pleura` と `costodiaphragmatic-recess` が
  「胸膜腔は左右別」「肺は洞に届かない」の 2 点を構造として持っています。
  ただし**呼吸も圧も存在しません**——虚脱や貯留を主張するなら、
  まず容積と圧を持つ仕組みが要ります
- **無気肺・区域の主張**: `right-lung` / `left-lung` はシルエットです。
  **葉も区域も分けていません。** 葉単位・区域単位の主張は `lung-anatomy` 側です
- **縦隔偏位**: `mediastinum` は空間として描かれており、「肺でないものが
  ここに収まる」ことは言えますが、**偏位は動きなので表現できません**
- **肋間穿刺・ドレーン**: `intercostal-space` と `intercostal-bundle` が
  「束は肋骨の下」を持っています。**手技の主張は model card が禁止しています**
- **横隔神経麻痺**: `phrenic-nerve` は左右あり、肺門の前を通ります。
  頸部由来であることは `neck-anatomy` 側と連続します
- **心タンポナーデ**: `pericardium` はありますが、**圧もコンプライアンスも
  ありません。** 「伸びない袋」という性質は説明にとどまっています

**変えてはいけない関係**:
- **肋骨は前へ行くほど下がります。** 12 本すべてで成り立ちます
- **左肺の心切痕は `mediastinumSection` そのもの**です（`clearMediastinum`）。
  切痕を「描いて」はいけません
- **肺は自分の側へ押し出します。** 縦隔の中心で振り分けると、左肺の一部が
  右胸腔に出ます（実際に一度そうなりました）
- **横隔神経は肺門の前、迷走神経は後ろ**です。入れ替えた瞬間、
  シーンは何も言わなくなります
- **食道は常に後ろ**です（気道の後ろ、心臓の後ろ）
- **大動脈弓・鎖骨下動脈は `neck-anatomy` 側にもあります。** 2 シーンで
  同じ血管を別に描いており、**どちらも「その血管のモデル」ではありません**

---

## `abdomen-anatomy` — 腹部（局所解剖）

| | |
| --- | --- |
| 構造 | 24 |
| tags | `wall` `cavity` `behind-the-bag` `in-the-bag` `gut` `organ` `vessel` `urinary` |
| views | `whole` `wall` `in-the-bag` `behind-the-bag` `transpyloric` `great-vessels` `from-behind` |
| bounds | 10.9 × 7.5 × 8.6（world unit。1 cm = `WORLD_SCALE` = 0.4） |

```
abdominal-wall  rectus-abdominis  lumbar-vertebrae  psoas-muscle
peritoneal-cavity  greater-omentum  mesentery  retroperitoneum
liver  stomach  spleen  small-bowel  colon
pancreas  duodenum  kidneys  adrenal-glands  ureters
aorta  inferior-vena-cava  coeliac-trunk  superior-mesenteric-vessels
inferior-mesenteric-artery  renal-vessels
```

**anchors** — `SITES`: `transpyloric` `coeliac` `sma` `duodenalCrossing`
`hilumLeft` `hilumRight` `bifurcation` `ureterCrossing`。関数としては
`abdomenSection(y)`・**`peritoneumBackAt(y)`**・`isRetroperitoneal(x, y, z)`・
`aortaAt(y)`・`cavaAt(y)`・`psoasAt(y, side)`・`kidneyAt(side)`、
表としては `LEVELS`・`GREAT_VESSELS`・`KIDNEYS`・`WORLD_SCALE`。

**`isRetroperitoneal` は病態側からも使えます。** 「この病変は袋の中か後ろか」は
このシーンが答えられる唯一の問いであり、同時に最も価値のある問いです。

**このシーンが持っている病態の足場**:
- **後腹膜出血・液体貯留**: `retroperitoneum` は空間として存在します。
  ただし**筋膜層を描いていません**——広がり方の主張はできません
- **腸閉塞**: `small-bowel` は1つの塊で、**内腔も壁もありません。** 拡張も
  蠕動も表現できません。腸管そのものの主張は消化管側のシーンへ
- **上腸間膜動脈**: `superior-mesenteric-vessels` は十二指腸第3部の前を通ります。
  SMA症候群の舞台ですが、**角度も距離も実測値ではありません**
- **腎・尿管**: `kidneys` / `ureters` / `psoas-muscle` が「腎は大腰筋の上、
  尿管はその前面」を持っています。結石の位置は指せますが、
  **3か所の生理的狭窄部は描いていません**
- **大動脈瘤**: `aorta` は後腹膜にあります。「破裂が腔ではなく空間へ広がる」
  という主張の足場はありますが、**径も壁もありません**

**変えてはいけない関係**:
- **`peritoneumBackAt` は 1 本です。** 腹膜腔の後壁と後腹膜の前壁は同じ面であり、
  別々に書いた瞬間、このシーンの主張はすべて判定不能になります
- **膵臓と十二指腸は境界をまたぎます。** 片側に寄せないでください
- **結腸は 4 区間のうち 2 つが後腹膜**です。これが体内で最も明快な例です
- **右腎は左腎より低い**です（上に肝臓があるため）
- **下大静脈は患者の右、大動脈は左**です
- **腎と尿管は大腰筋の「前」**です。大腰筋はそれより深い位置にあります

---

## `pelvis-anatomy` — 骨盤（局所解剖）

| | |
| --- | --- |
| 構造 | 22 |
| tags | `bone` `floor` `peritoneum` `urinary` `gut` `vessel` `female` `male` |
| views | `shared` `floor` `pouch` `female` `male` `bridge` `from-behind` |
| bounds | 9.5 × 6.7 × 5.3（world unit。1 cm = `WORLD_SCALE` = 0.42） |

```
pelvic-ring  pubic-symphysis  levator-ani  levator-hiatus
pelvic-peritoneum  peritoneal-pouch
bladder  ureters  urethra  rectum  anal-canal  sigmoid-colon
common-iliac-arteries  internal-iliac-artery  external-iliac-vessels
uterus  ovaries-and-tubes  vagina  uterine-artery
prostate  seminal-vesicles  vas-deferens
```

**anchors** — `SITES`: `promontory` `symphysis` `bridge` `hiatus` `pouch`
`bladderNeck`。関数としては `pelvisSection(y)`・**`floorAt(x, z)`**・
`inHiatus(x, z)`・`edgeOfHiatus(angle, at)`・**`bridgeAt(side)`**・
`ureterPath(side, t)`、表としては `LEVELS`・`HIATUS`・`FEMALE_SET`・`MALE_SET`・
`UNDER_THE_BRIDGE`・`WORLD_SCALE`。

**⚠ このシーンは男女両方の生殖器を含みます。** `FEMALE_SET` と `MALE_SET` が
その一覧で、**両方をもつ身体は存在しません。** 病態を載せるときは、
**必ずどちらか一方の tag を hide してください。** 共存させるために位置を
変えてはおらず、両者は実際に重なります（テストがそれを確認しています）。

**このシーンが持っている病態の足場**:
- **尿管損傷**: `bridgeAt` が「尿管は下、交差する構造は上」を 1 か所で決めています。
  骨盤内手術での尿管損傷の機序を指せますが、**走行のばらつきは表現していません**
- **骨盤臓器脱**: `levator-ani` と `levator-hiatus` があります。ただし
  **骨盤底は収縮せず、裂孔は変化しません。** 下垂を主張するには機構が要ります。
  挙筋の 3 部分は `pelvic-floor-anatomy` 側です
- **腹水・膿瘍・出血**: `peritoneal-pouch` が「腹腔の最低点」を持っています。
  `abdomen-anatomy` の腹膜腔と連続する主張として使えます
- **前立腺肥大**: `prostate` は輪郭のみで、**内部を貫く尿道も領域区分もありません。**
  肥大の種類を分けるのは `prostate-anatomy` 側です
- **膀胱**: `bladder` は**空虚な状態**です。充満による位置変化——恥骨上穿刺が
  腹腔を避けられる理由——は説明にとどまっています

**変えてはいけない関係**:
- **`bridgeAt` は 1 点です。** 子宮動脈と精管を別々の点から生成した瞬間、
  「同じ交差の 2 つの名前」という主張が消えます
- **裂孔は本物の穴**です（`edgeOfHiatus`）。中の頂点を下げて凹ませると、
  穴ではなく漏斗になります（実際に一度そうなりました）
- **腹膜は骨盤底に届きません。** 膀胱下部・直腸下部は袋の外です
- **陥凹は腹腔の最低点**で、膀胱の後ろ・直腸の前です
- **外腸骨動脈は骨盤内に何も供給しません。** 通過するだけです

---

## 検証

- `npm test` — カタログ整合性、model profile、各シーンの構造配置
- `npm run verify:anatomy -- --scene <slug> --preview` — 実ブラウザで
  クリック選択・isolate・全表示復帰・viewpoint・色モードを確認します
  （production build には非公開シーンが入らないため `--preview` が要ります）
- 新しいシーンを足すときは `tests/organ-anatomy-scenes.test.js` の `SCENES` と
  `scripts/check-anatomy-interaction.mjs` の `SCENE_POINTS` に 1 行ずつ足してください
