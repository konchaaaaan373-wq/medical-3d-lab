# 新しいテーマを追加する / Adding a scene

このプロジェクトは「1 テーマ = 1 シーンモジュール」で構成されています。
`App.js` はシーンの中身を知りません。決められたインターフェースさえ満たせば、
どんなテーマでも同じ UI に載ります。

---

## 0. Scene suitability check — 実装を始める前に

**コードを 1 行も書く前に、この 7 問に答えてください。**
答えられない項目があるなら、そのテーマはまだ実装の段階にありません。
判断基準の背景は [`product-principles.md`](product-principles.md)。

| # | 問い | 落ちる例 |
| --- | --- | --- |
| 1 | **Why does this need 3D?** 2D の静止画や図表より理解が明確に改善するか？ | 「回せると格好いいから」 |
| 2 | **What changes over time?** 時間とともに何が変化するか？ | 何も動かない構造模型 |
| 3 | **What can the user manipulate?** ユーザーが動かせるものは何か？ | 眺めるだけ |
| 4 | **What is the central question?** 中心にある「理解すべき一つの問い」は？ | 「心臓について」のような疾患名だけ |
| 5 | **What is the SNS hook?** 15 秒で伝わるものは何か？ | 説明を読まないと何も分からない |
| 6 | **What could become a Learning Module?** 予測 → 操作 → 説明にできるか？ | 予測しようのない事実の列挙 |
| 7 | **What is the medical source of truth?** 絵と数値を両方生む単一のモデルは何か？ | 絵は絵、数値は別の表 |

**1 に「改善する」と答えられないテーマは、このプロジェクトで扱う必要が
ありません。** 表や模式図で十分なものを無理に 3D 化しないでください。

答えがそろったら、次節のテンプレートに書き出してから実装に入ります。

---

## 0.5. Scene proposal template

新しい Scene は、この形で提案してから作ります
（PR 本文、`docs/proposals/<scene-id>.md`、あるいは issue のいずれでも）。

```markdown
# Scene Proposal

## Central Question

What should the learner understand?

## Why 3D?

Why is 3D better than a diagram or video?

## Medical Model

What variables actually drive the scene?

## Interactive Element

What can the user manipulate?

## Visual Outputs

- 3D
- metrics
- graphs
- labels

## SNS Hook

What can be understood in 15 seconds?

## Educational Module

What can the learner predict and test?

## Accepted Simplifications

What are we intentionally not modeling?

## Validation

What must remain medically true?
```

### 記入例（Heart Failure を後から書き起こしたもの）

| 項目 | 内容 |
| --- | --- |
| Central Question | 後負荷を上げると SV はなぜ下がる？ EF 58% と 29% では何が違う？ |
| Why 3D? | 壁厚・内腔・拍動・圧が同時に連動する。静止画では因果が追えない |
| Medical Model | time-varying elastance の閉ループ循環（Ees, V0, EDPVR, Rsys, 循環血液量, HR） |
| Interactive Element | 進行度スライダー / preload / afterload / Compare / 再生・停止 |
| Visual Outputs | 3D 心室 + 血液粒子 / PV ループ / 圧波形 / 10 行の read-out / 3D ラベル |
| SNS Hook | EF 58% vs 29% を同期拍動で並べ、ED → ES の残血量の差を見せる |
| Educational Module | 「Afterload を上げると SV は？」→ スライダー操作 → PV ループの変化 → 説明 |
| Accepted Simplifications | 弁は理想的一方向抵抗 / 集中定数（慣性・波動伝播なし）/ 神経体液性調節なし |
| Validation | 血液が弁を逆行しない / SV = EDV − ESV / 圧の大小関係 / うっ血は圧のオーバーレイであって血液の逆流ではない |

---

## 1. どこに置くか

構成は **system → organ → scene** の 3 段です。

```text
src/catalog/
├─ taxonomy.js            どんな system / organ / status があるか
├─ scenes.js              どんな scene があるか（= 唯一の登録先）
└─ index.js               カタログへの問い合わせと検証

src/scenes/
├─ shared/                全臓器シーンが載る土台
│  ├─ PrototypeScene.js   scene interface の実装（camera / lights / labels）
│  ├─ prototypeMeta.js    meta の組み立てと PROTOTYPE の注記
│  ├─ materials.js        tissue / wall / mucosa / mineral / ghost / particle
│  ├─ lighting.js         共通のスタジオライト
│  ├─ geometry/           shapedSphere / latheFromProfile / TubeSurface / coilCurve
│  └─ motion/             flow particles / breathCycle / travellingWave
├─ respiratory/
│  ├─ organs/lungs.js     肺のジオメトリ（疾患シーン間で再利用する）
│  ├─ organs/airway.js
│  └─ scenes/breathingLungs/index.js
└─ cardiovascular/
   ├─ organs/heart.js     概観用の心臓
   └─ scenes/heartFailure/   reference implementation（独自 UI を持つ）

src/data/
├─ heartFailure.js        深く作り込んだシーンの文言
└─ prototypes/<system>.js prototype シーンの文言（1 system に 1 ファイル）
```

**`organs/` と `scenes/` を混ぜないでください。** `organs/lungs.js` は
「肺とはどういう形か」だけを知っていて、呼吸・喘息・肺水腫のことは知りません。
その分離があるから、`asthma` シーンは同じ `buildLungs()` を別パラメータで
呼ぶだけで済みます。臓器ジオメトリに疾患名が出てきたら、設計を間違えています。

臓器ビルダーは `{ object, anchors, ... }` を返します。`object` が描画物、
`anchors` はラベルを吊るす座標、あとはその臓器を動かす関数
（`setInflation` / `setWave` / `setFill` / `setContraction` …）です。

---

## 2. まず既存の臓器を探す

新しいシーンで必要な臓器の多くは、もう誰かが作っています。
system をまたいで import して構いません——むしろそれが狙いです。

| 臓器 | ビルダー |
| --- | --- |
| 肺・気管・気管支 | `respiratory/organs/lungs.js`, `airway.js` |
| 食道・胃 | `gastrointestinal/organs/stomach.js` |
| 小腸・大腸・十二指腸 | `gastrointestinal/organs/intestine.js` |
| 肝臓・胆嚢 | `hepatobiliary/organs/liver.js` |
| 膵臓 | `hepatobiliary/organs/pancreas.js` |
| 腎臓・尿管・膀胱 | `renal/organs/kidney.js` |
| 甲状腺 | `endocrine/organs/thyroid.js` |
| 副腎 | `endocrine/organs/adrenal.js` |
| 脾臓 | `hematologic/organs/spleen.js` |
| 骨・骨格筋 | `musculoskeletal/organs/bone.js`, `muscle.js` |
| 子宮・前立腺 | `reproductive/organs/uterus.js`, `prostate.js` |
| 脳（概観用） | `nervous/organs/brain.js` |
| 心臓（概観用） | `cardiovascular/organs/heart.js` |
| 人体のシルエット | `systemic/organs/bodyShell.js` |

`systemic/scenes/bodyOverview/` はこれらを 9 個 import しているだけです。
全身像を作り直してはいません。

ないものを新しく作るときは `src/scenes/shared/geometry/` の道具を使います。

- `shapedSphere({ detail, scale, warp })` — 球を臓器の形に押し込む。
  `warp` は単位球上の 1 頂点を受け取って動かす関数で、
  「内側面を平らにする」「底をえぐる」といった解剖の言葉で書けます
- `latheFromProfile(profile, { arc })` — 回転体。`arc` を 2π 未満にすると
  断面が開くので、子宮や長管骨の cutaway はこれで作ります
- `TubeSurface(curve, { radius })` — **半径を毎フレーム書き換えられる管**。
  蠕動・収縮・拡張はすべてこれです（`refresh(modifier)`）
- `coilCurve(...)` — 折り畳まれた管（小腸）

---

## 3. Prototype シーンを作る

`definePrototypeScene()` が scene interface（`meta` / `cameraPose` / `build` /
`setProgress` / `update` / `getAnnotations` / `dispose`）を実装します。
新しい臓器シーンが書くのは**モデルだけ**です。

```js
// src/scenes/respiratory/scenes/breathingLungs/index.js
export default definePrototypeScene({
  copy: BREATHING_LUNGS,                 // src/data/prototypes/respiratory.js
  cameraPose: { position: [1.6, 1.4, 11.8], target: [0, 0.35, 0] },
  createModel,                           // () => model
});
```

`createModel()` が返すもの:

| キー | 役割 |
| --- | --- |
| `object` | 描画する `THREE.Object3D`（必須） |
| `setProgress(value)` | 0..1。UI が動かす唯一の状態 |
| `update(dt, elapsed)` | 毎フレームの動き |
| `anchors` | `{ name: Vector3 }`。`copy.annotations[].anchor` から引かれます |
| `stageViews` | `{ stageId: { position, target } }`。ストーリーモードの寄り |
| `dispose()` | `object` の外で確保したもの（particle stream など） |

**カメラの距離は書かなくて構いません。** `cameraPose` は「どちらから見るか」
だけを決め、距離と注視点は build 時に**実際に組み上がったモデルの外接球から**
計算されます（`fitPose`）。手で詰めた距離は、ジオメトリを変えるたびに
壊れて被写体が見切れます。

文言（`copy`）は `src/data/prototypes/<system>.js` に置きます。
`id` / `title` / `titleJa` / `subtitle` / `subtitleJa` / `palette` / `legend` /
`stages` / `range` / `progressLabel` / `annotations` が必要で、
不足はテストが落とします。disclaimer は共通の PROTOTYPE 文が自動で入ります。

**進行度スライダーが何を動かすのかを 1 つに決めてください。** 呼吸の深さ、
運動パターン、刺激の強さ、周期上の位置——「重症度」ではありません。

---

## 4. 深く作り込むシーンを実装する

```js
export class HeartFailureScene {
  /** UI が読む情報。STAGES は 5 段階でなくても構いません。 */
  static meta = {
    id: 'heart-failure',
    title: 'Heart Failure',
    titleJa: '心不全',
    subtitle: '...',
    subtitleJa: '...',
    stages: STAGES,       // [{ id, name, nameJa, at, summary, summaryJa }]
    legend: LEGEND,       // [{ key, label, labelJa }]
    palette: PALETTE,     // { key: '#rrggbb' }
    disclaimer: '...',
    disclaimerJa: '...',
  };

  /** 初期表示と「View」ボタンで戻る構図。縦画面向けの引きは App が自動調整します。 */
  static cameraPose = {
    position: new THREE.Vector3(12, 5, 17),
    target: new THREE.Vector3(0, 0, 0),
  };

  constructor({ viewer }) { /* renderer / camera への参照を保持 */ }

  /** オブジェクトを作って root を返す。App が scene に add します。 */
  build() { return this.root; }

  /** 0..1。UI が動かす唯一の状態。 */
  setProgress(value) {}

  /** 毎フレーム。dt は 0.1 秒で頭打ちされています。 */
  update(dt, elapsed) {}

  /** 3D 空間に浮かぶラベル。range の区間だけ表示されます。 */
  getAnnotations() {
    return [{ id, text, sub, position: new THREE.Vector3(), range: [0.2, 0.8] }];
  }

  /** GPU リソースの解放。utils/dispose.js の disposeObject が使えます。 */
  dispose() {}
}
```

### 任意で実装できるフック

| メソッド / プロパティ | 効果 |
| --- | --- |
| `getStageView(stageId)` | ストーリーモードで、そのステージのカメラ位置に寄ります。`null` を返すと establishing shot のままです |
| `getMetrics()` | 数値の読み取りパネルが 3D ビュー横に表示されます（`heart-failure` の EF / EDV など） |
| `meta.range` | 進行度スライダー両端のラベル（`{ start, startJa, end, endJa }`） |
| `meta.progressLabel` | パーセント表示が「何の進行度か」を示すラベル |
| `setComparison(enabled)` | 正常な状態と並べる比較モード。実装したシーンだけ `Compare` ボタンが出ます |
| `getComparisonView()` | 比較モードのカメラ（両方が画面に収まる構図） |
| `getReel()` | 15 秒の SNS シーケンス。実装したシーンだけ `Reel` ボタンが出ます |
| `getPressureVolume()` | 圧-容積ループのパネルが出ます（後述） |
| `getModelControls()` / `setModelControl(id, value)` / `resetModelControls()` | モデルの入力を動かすスライダー群。3 つ揃って実装します |
| `getLearningModules()` | ガイド付き教材。実装したシーンだけ `Learn` ボタンが出ます（後述） |
| `LEGEND[].activeFrom` | その分子種・要素が登場する進行度。それまで凡例は減光表示になります |

`getMetrics()` は次の形式の配列を返します。

```js
[{ id: 'ef', label: 'Ejection fraction', labelJa: '駆出率 (EF)',
   value: 58, unit: '%', emphasis: true }]
```

`emphasis: true` の項目は大きく表示され、スマホではこの項目だけが残ります。
比較モード中は `reference` を付けると「正常値 → 現在値」の形式で表示されます。

比較モードを実装する場合、**比較対象は必ず同じモデルから導いてください**。
`heart-failure` では正常な左室を `sampleHemodynamics(0)` で評価して描いています。
別途チューニングした「正常っぽい絵」を置くと、いつか本体のモデルと食い違います。

### モデルの入力を触らせるとき

`getModelControls()` はスライダーの定義を返し、`setModelControl(id, value)` が
呼ばれたらモデルを**解き直します**。出力を後から補正するのではなく、
入力を変えて全部を再計算するのが要点です。そうしないと、数値パネルと 3D と
グラフが少しずつ違うことを言い始めます。

```js
getModelControls() {
  return [{ id: 'preload', label: 'Preload', labelJa: '前負荷',
            min: 0.85, max: 1.15, step: 0.01, value: this.loading.preload,
            format: (v) => `×${v.toFixed(2)}` }];
}
```

設定した値は `sessionState.js` がスナップショットに含めるので、Reel モードに
入って戻ってきても viewer の設定は失われません。Reel 中は
`resetModelControls()` が呼ばれ、動画は常にモデルどおりの状態を写します。

### ガイド付き教材（Educational Module）

`getLearningModules()` は教材の定義を**データとして**返します。パネル
（`components/LearningPanel.js`）は生理学を一切知らず、渡された定義に従って
予測 → 操作 → 観察 → 説明 → 応用 を進めるだけです。

**教材はモデルへの近道を持ちません。**

- 操作はスライダーと同じ `setModelControl()` / `setProgress()` を通す
- 数値は同じ `getMetrics()` から読む。教材専用の計算をしない
- 「どちらが大きいか」のような比較は、その場でモデルを解いて**測る**

そして **教材が保存している「正解」は、テストがモデルから再導出して照合します**
（`tests/learning.test.js`）。教材はモデルについての主張なので、その主張は CI で
検証できなければなりません。物理を変えて教材が成り立たなくなったら、
静かに誤ったことを教えるのではなくビルドが落ちます。

**1 モジュール = 1 つの因果関係。** グラフの読み方を全部教えようとしないでください。
教材が実行中は、数値パネルも `watch` に挙げた行だけに絞られます。

### 圧-容積ループなどのグラフ

`getPressureVolume()` は `{ current, reference, phase }` を返します。
`current` / `reference` は `{ loop, endSystolic, endDiastolic, markers, waveform }` で、
`loop` と 2 本の関係式は `{ volume, pressure }` の配列、`waveform` は
`{ phase, ventricular, arterial, atrial, cycleLengthSeconds, ejection }` です。
1 回の呼び出しでループと圧波形の両方のパネルが更新されるので、
2 つのグラフが違う拍を描くことは起きません。

**曲線は必ずモデルが使っている式から生成してください。**
グラフ用に別の近似を書くと、そこから食い違いが始まります。同じ理由で、
`ejection` の区間は「2 本の線が交わって見える場所」ではなく
**解かれた流量から**求めています。

`index.js` は 1 行です。

```js
export { HeartFailureScene as default, HeartFailureScene } from './HeartFailureScene.js';
```

## 5. カタログに登録する

`src/catalog/scenes.js` に 1 エントリ追加します。動的 import なので、
表示していないシーンのコードはダウンロードされません（**import 先は必ず
リテラルで書いてください**。変数にすると Vite が分割できず、全臓器が
1 つのバンドルに入ります）。

```js
{
  id: 'breathing-lungs',        // URL（#/<slug>）。公開後は変えない
  slug: 'breathing-lungs',
  titleEn: 'Breathing lungs',
  titleJa: '呼吸と肺',
  system: 'respiratory',
  organ: 'lungs',               // どこに分類されるか
  organs: ['lungs', 'airway'],  // 実際に描いている臓器すべて（省略時は [organ]）
  disease: null,                // 正常生理なら null、疾患シーンなら疾患 id
  status: 'prototype',
  description: '...',           // Organ Explorer のカード（英）
  descriptionJa: '...',         //                        （日）
  tags: ['ventilation', 'cycle'],
  load: () => import('../scenes/respiratory/scenes/breathingLungs/index.js'),
}
```

これだけで **routing・シーン切替タブ・Organ Explorer・テスト**が同時に増えます。
`src/app/` にも `src/components/` にも手を入れません。手作業で route を
足している自分に気づいたら、それは設計が壊れた合図です。

登録し忘れ・重複・参照切れは `npm test`（`tests/catalog.test.js` と
`tests/prototype-scenes.test.js`）が落とします。

### 新しい system を足す

`src/catalog/taxonomy.js` の `SYSTEMS` に 1 行（英名と日本語名）。
順番は head to toe です。ディレクトリ `src/scenes/<system>/{organs,scenes}/`
を作ります。scene が 1 つも無い system はナビゲーションに出ません。

### 新しい organ を足す

`ORGANS` に 1 行（`id` / `system` / 英名 / 日本語名）。
**シーンが無い臓器を登録しても構いません。** Organ Explorer は
「シーン未実装」として表示します。空白は情報であり、backlog そのものです。

---

## 6. 疾患シーンを足す

このアーキテクチャが存在する理由です。手順は上と同じで、違うのは 2 点だけ。

1. **臓器ジオメトリを作り直さない。** `organs/` の既存ビルダーを、
   疾患に対応するパラメータで呼びます。無ければ**パラメータを足します**
   （例: `buildLungs({ airTrapping })`）。疾患シーン側でジオメトリを
   コピーした瞬間、正常と疾患が別々に劣化していきます
2. `disease` に疾患 id を入れ、`organ` は同じままにします。
   Organ Explorer では同じ臓器の下に正常シーンと並びます

```text
src/scenes/respiratory/
├─ organs/lungs.js                  ← 1 つだけ
└─ scenes/
   ├─ breathingLungs/               normal physiology
   ├─ asthma/                       disease: 'asthma'
   └─ pulmonaryEdema/               disease: 'pulmonary-edema'
```

まだ実装していない疾患シーンは `src/catalog/scenes.js` の `PLANNED_SCENES`
に書いておけます。Organ Explorer が「予定」として薄く表示します。
実装したら `SCENE_MANIFEST` に移すだけです。

**疾患シーンは正常シーンの色違いではありません。** 「何が変わると、何が
起きるのか」を 1 つ選び、それが見えるように作ってください。答えられないなら、
それはまだ scene ではなく organ です。

---

## 7. Prototype visual acceptance criteria

**prototype を追加したら、ブラウザで開いて 8 項目を自分で確認してください。**
コードを読んで判断しないこと。以下はすべて、実際に描画して初めて分かった問題から
作った基準です（2026-08 の全身プロトタイプ監査）。

| # | 基準 | 落ちている状態（実例） |
| --- | --- | --- |
| 1 | **Silhouette recognizability**<br>説明文を読まずに、その臓器だと分かる | 肝臓が「きのこの傘」に見える／膵臓が半透明の板に見える／膀胱が皿に見える。球や円柱の寄せ集めに見えるなら、特徴的な輪郭（腎門・心切痕・ハウストラ・骨幹端）を 1〜2 個足す |
| 2 | **Basic anatomical orientation**<br>正面から見て左右・上下・前後が正しい | 正面図なので **患者の右は画面の左**。肝臓は画面左、胃は画面右。心臓はやや画面右（患者の左）。腎臓は他臓器より後方 |
| 3 | **Structures actually connect**<br>つながっているものがつながって見える | 気管支が肺に届かず宙で終わる／食道が胃の手前で切れる／幽門から内容物が空中へ流れ出す。接続部は「重ねる」だけでなく、片方を相手の奥へ差し込む |
| 4 | **Meaningful motion**<br>動きが「何の動きか」を語る | 蠕動が伝わる向きが分かるか／吸気と呼気が区別できるか／粒子が方向と勢い以上のことを主張していないか。**意味のない粒子は消す。** 動きが小さすぎて静止画に見えるなら、演出値として誇張してよい（誇張したことをコメントと medical-notes に書く） |
| 5 | **Camera framing**<br>被写体が下部コンソールと重ならず、フレームに収まる | 距離は `fitPose` が計算する。臓器より大きい文脈（血管・隣接臓器）を描くときは `focus` でフレーム対象を絞り、寄りすぎるなら `framing.headroom` で引く |
| 6 | **Labels sit on what they name**<br>ラベルが対象の上にある | **臓器ビルダーの `anchors` はそのビルダーの座標系。** シーン側で臓器を動かしたら、ラベルも同じだけ動かすか、シーン側で world 座標として書き直す |
| 7 | **Mobile usability**<br>390×844 で主題が見え、操作できる | 被写体が上部パネルやコンソールに隠れていないか。シーン切替は横スクロールになる。ラベルは `compact: false` で間引く |
| 8 | **No major physiological misconception**<br>明らかな誤学習を生まない | 流れの向き・臓器の位置関係・「どの層が変化しているか」。精度は不要だが、**誤りは不可** |
| 9 | **Stable rendering**<br>コンソールにエラーが出ない、NaN が出ない | `tests/prototype-scenes.test.js` が 0→1 を 21 点で走らせる。加えて、実ブラウザで進行度を端から端まで動かす |
| 10 | **Prototype badge**<br>status が `prototype` で登録され、バッジと注記が出る | バッジが出ていないなら、カタログの status が `production` になっている |

チェックの記録は `artifacts/prototype-audit/` にスクリーンショットとして残します。

**深く作り込む段階に入ったら**、上の 10 項目では足りません。「なぜ CG に見えるのか」の
失敗モード（収束する先端の UV 極、両面シェルの二重合成、飽和が自分の修正を隠すこと、
シルエットのテーパー対傾斜、壁から生える構造の根）と、原因を推測せず切り分ける手順は
[`organ-3d-playbook.md`](organ-3d-playbook.md) にあります。末尾に、形を作り終えた
あとに**測る**チェックリストが付いています。

### よくある描画上の落とし穴

- **piecewise な半径関数は管に筋を作ります。** 折れ点ごとに輪状の折り目が出るので、
  `smoothProfile([[u, r], ...])` を使ってください
- **加算合成の粒子は簡単に白く飽和します。** bloom と重なると被写体より明るくなるので、
  opacity は 0.3〜0.6 程度に抑える
- **断面は「奥半分を残す」。** 手前半分を残すと閉じた臓器に見えます
  （`latheFromProfile` の `arcStart`）
- **半透明は中を見せるためだけに使う。** 全部を半透明にすると立体感が消えます
- **同じ折り返しの繰り返しは「積み重ね」に見えます。** 平行に並んだ列は前後関係が
  生まれないので、管を折り畳むときは互いに重なる向き（放射状のループなど）にする

### コードレビューで見つかった規則（テストが強制します）

- **アニメーションの位相は自分で積算する。`elapsed` から計算しない。**
  `phase += dt * rate` と書きます。`f(elapsed * rate)` は rate が進行度で変わる
  瞬間に位相が飛び、肺が満気から空へ 1 フレームで切り替わりました。
  `tests/prototype-motion.test.js` が「同じ 10 フレームを別の絶対時刻で与えても
  同じ結果になること」を検査します
- **curve を公開する臓器ビルダーは、mesh ではなく curve を動かす**
  （`placeCurve`）。mesh だけ動かすと、curve を読む粒子経路やラベルが
  「描かれていない場所」を指します。密に折り畳まれた臓器では静止画で気づけません
- **言語で消える要素の中に、言語非依存の情報を入れない。** status バッジを
  `.lang-en` の見出しに入れていたため、日本語表示のときだけバッジが消えていました

---

## 8. status を上げる条件

| status | 意味 | 上げる条件 |
| --- | --- | --- |
| `prototype` | 形は概略、動きは仮 | 初期状態 |
| `alpha` | 医学モデルが動かしている | ① 形と動きが**式かデータ**から出ている（手打ちのアニメーションではない）② 医学的に意味のある入力を触れる ③ その入力と出力の関係がテストで固定されている |
| `reviewed` | 医学的レビュー済み | ④ 臨床の目でレビューを受けた ⑤ 簡略化した点が `docs/medical-notes.md` に列挙されている ⑥ 臨床的な値と演出値が名前で区別されている |
| `production` | 他シーンの基準 | ⑦ 数値・グラフ・3D が同じ 1 つのモデルから出ている ⑧ Learn / Reel など SNS・Educational 層まで揃っている ⑨ そのモデルについての主張がテストで再導出・照合されている |

`production` になれば **Prototype バッジが消えます**。
バッジが消えるということは「ここに書いてある数字は信じてよい」と言うことなので、
④ を飛ばして上げないでください。

status は `src/catalog/scenes.js` の 1 か所だけで管理します。
シーン側に書き写さないでください（UI はカタログの値を表示します）。

---

## 押さえておきたい点

- **進行度は連続値です。** ステージは表示上の区切りであって、内部的には
  `smoothstep` で滑らかにブレンドしてください。段階が一斉に切り替わると
  「模式図」に見えてしまい、現象の理解を助けません。
- **乱数はシード固定で。** `utils/math.js` の `createRandom(seed)` を使えば、
  リロードしても同じ構図になります。
- **粒子は 1 つの `THREE.Points` にまとめる。** 状態遷移は attribute + uniform で
  シェーダー側に持たせると、数千個でも滑らかに動きます。
  `AggregationField.js` がその実装例です。
- **スマホを忘れない。** `window.innerWidth < 720` で粒子数を減らす、
  ラベルを間引くなどの分岐を入れてください。
- **キャプチャ映えを意識する。** `cameraPose` は「静止画として成立する構図」に
  してください。UI 非表示（`H` キー）と PNG 書き出しは共通機能として使えます。
  縦長画面や 4:5 書き出し向けのカメラ距離はアプリ側が自動調整します。
- **医学的な値と演出値の名前を分ける。** 臨床的な意味を持つ値は臨床的な名前と単位で
  （`edvMl`, `wallMm`）、見た目だけの値はそれと分かる名前で
  （`congestionGlowIntensity`）。混ざると、あとから読む人が演出値を計測値だと
  思い込みます。
- **モデルの精度を超える桁数を UI に出さない。** 近似で作った形状から出した値を
  `194.2 g` のように書くと、計測値のように読まれます。
- **医学的な数値を変えたら `npm test` を通す。** `tests/` に算術整合性
  （`SV = EDV − ESV` など）と全補間範囲の不変条件を書いてあります。
- **`docs/medical-notes.md` に「表現していないこと」を必ず書く。**
  教材として一番危ないのは、描いていないものを描いていると思われることです。
- **数値を出すなら、絵と同じモデルから出す。** `heart-failure` では、壁の厚さ・
  内腔の大きさ・拍動・パネルの EF がすべて 1 つの血行動態モデル
  （`hemodynamics.js`）から導かれています。こうすると「絵と数字が食い違う」
  という、教材として一番まずい状態が構造的に起きません。

---

判断に迷ったら [`product-principles.md`](product-principles.md) に戻ってください。
とくに「3D は目的ではなく手段」「one medical state, multiple representations」
「SNS 映えのために臨床パラメータを変えない」の 3 つが、この文書のほとんどの
ルールの理由になっています。

### 全身に広げたあとで効いてくる点

- **臓器の左右は画面の左右と逆です。** 正面から見た図なので、患者の右肺は
  画面の左に来ます。既存の臓器ビルダーはすべてこの向きで作ってあります。
- **中を見せたい断面は、カメラ側ではなく反対側を残します。** 手前半分を
  残すと「閉じた臓器」に見えます（`uterus.js` の `arcStart` 参照）。
- **半透明は演出値です。** 肝臓や膵臓を透かしているのは中の流れを見せるため
  であって、臓器の性質ではありません。コメントにそう書いてください。
- **粒子は流れの「向きと勢い」の表現であって、流量ではありません。**
  `speed` / `rate` は presentation 値の名前です。臨床的な名前を付けないこと。
- **prototype でも NaN は許しません。** `tests/prototype-scenes.test.js` が
  全シーンを 0→1 まで 21 点で走らせ、geometry・transform・opacity・uniform を
  すべて検査します。ゼロ除算や `Math.pow` の負値はここで落ちます。
- **モバイルを忘れない。** シーン切替は 720px 以下で横スクロールになります。
  ラベルは `compact: false` で間引けます。
