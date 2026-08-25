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

## 1. フォルダを作る

```text
src/scenes/heartFailure/
├─ HeartFailureScene.js   シーン本体
├─ index.js               再エクスポート
└─ ...                    そのテーマ専用の部品
```

`src/data/heartFailure.js` にステージ定義・配色・解説文をまとめます。
描画コードに文章を書かないでください（文言の修正が楽になります）。

## 2. シーンクラスを実装する

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

## 3. レジストリに登録する

`src/app/sceneRegistry.js` に追記します。動的 import なので、
表示していないテーマのコードはダウンロードされません。

```js
{ id: 'heart-failure', label: 'Heart failure', load: () => import('../scenes/heartFailure/index.js') },
```

`http://localhost:5173/#/heart-failure` で開けるようになります。

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
