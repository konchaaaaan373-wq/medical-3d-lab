# Handoff — 正常解剖から病態へ（Claude② → Claude③）

Last updated: 2026-09-11。対象は 2026-09 に追加した 5 シーンです
（前立腺・男性生殖路・膝・肩・股）。既存の臓器シーンは同じ契約に載っていますが、
ここには**新しく足した分だけ**を書きます。

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

## 検証

- `npm test` — カタログ整合性、model profile、各シーンの構造配置
- `npm run verify:anatomy -- --scene <slug> --preview` — 実ブラウザで
  クリック選択・isolate・全表示復帰・viewpoint・色モードを確認します
  （production build には非公開シーンが入らないため `--preview` が要ります）
- 新しいシーンを足すときは `tests/organ-anatomy-scenes.test.js` の `SCENES` と
  `scripts/check-anatomy-interaction.mjs` の `SCENE_POINTS` に 1 行ずつ足してください
