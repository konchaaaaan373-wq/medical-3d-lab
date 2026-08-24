# 新しいテーマを追加する / Adding a scene

このプロジェクトは「1 テーマ = 1 シーンモジュール」で構成されています。
`App.js` はシーンの中身を知りません。決められたインターフェースさえ満たせば、
どんなテーマでも同じ UI に載ります。

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
