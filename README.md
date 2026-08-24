# medical-3d-lab

医療教育向けの、ブラウザで動くインタラクティブ 3D コンテンツ集です。
最初のテーマとして **アルツハイマー病におけるアミロイドβ（Aβ）の蓄積過程** を実装しています。

Interactive 3D visualisations of disease mechanisms, built for medical education,
social posts and short explainer videos. First theme: **amyloid-β accumulation**.

---

## 概要 / Overview

進行度スライダーを 0 → 100% に動かすと、細胞外スペースの Aβ が
**モノマー増加 → オリゴマー形成 → 線維（フィブリル）形成 → プラーク（老人斑）形成**
と連続的に変化していきます。

- 3D ビューは回転・ズーム可能（OrbitControls）
- 5 段階のステージ表示と解説テキスト（日英併記 / 日本語 / English を切替）
- 再生 / 一時停止 / リセット / 視点リセット
- **ストーリーモード**：各ステージで自動的に一時停止し、その部位にカメラが寄る
- **PNG 書き出し**（現在の画面 / 4:5 / 1:1 / 16:9 を実サイズでレンダリング）と
  **UI 非表示モード** — SNS 投稿・動画素材づくり向け
- PC / スマートフォン 両対応。フレームレートが落ちる端末では
  bloom → 解像度 の順に自動で品質を下げます

外部の 3D モデルやテクスチャは一切使っていません。Three.js の primitive・particle・
line・custom shader だけで構成しているため、追加のアセット取得なしで動きます。

> ⚠️ **これは教育目的の簡易モデルです。** 分子シミュレーションではなく、
> 形・数・大きさ・時間経過はすべて理解を助けるためのイメージ図です。
> 詳細は [`docs/medical-notes.md`](docs/medical-notes.md) を参照してください。

---

## 起動方法 / Getting started

必要なもの: Node.js 20.19+ / 22.12+

```bash
npm install     # 依存関係のインストール（three + vite のみ）
npm run dev     # 開発サーバー起動 → http://localhost:5173
```

その他のコマンド:

```bash
npm run build   # dist/ に静的ファイルを出力
npm run preview # ビルド結果をローカルで確認
```

`vite.config.js` の `base: './'` により、`dist/` はそのまま GitHub Pages や
Netlify などの静的ホスティングに置けます（すべて無料枠で運用できます）。

### 操作方法 / Controls

| 操作 | 内容 |
| --- | --- |
| ドラッグ / スワイプ | 視点の回転 |
| ホイール / ピンチ | ズーム |
| スライダー | 病態の進行度（0〜100%） |
| ステージ名クリック | そのステージへジャンプ |
| `Space` | 再生 / 一時停止 |
| `←` `→` | 進行度を微調整（`Shift` で大きく） |
| `R` | リセット |
| `H` | UI の表示 / 非表示（キャプチャ用） |
| Story ボタン | ストーリーモード（各ステージで一時停止＋カメラ移動） |
| PNG ボタン | 書き出しサイズを選んで画像として保存 |
| 言語ボタン（右上） | 日英併記 / 日本語 / English を切替（設定は保存されます） |

---

## ディレクトリ構成 / Project structure

```text
medical-3d-lab/
├─ index.html                  エントリ HTML（UI は JS 側で生成）
├─ vite.config.js
├─ public/                     静的ファイル置き場（現状は空）
├─ docs/
│  ├─ adding-a-scene.md        新しいテーマを追加する手順
│  └─ medical-notes.md         医学的な表現の方針と注意
└─ src/
   ├─ main.js                  起動処理とローディング表示
   ├─ app/
   │  ├─ App.js                シーンと UI の接続（状態は進行度ひとつだけ）
   │  ├─ Viewer.js             renderer / camera / bloom / アニメーションループ
   │  └─ sceneRegistry.js      テーマの一覧と遅延ロード
   ├─ scenes/
   │  └─ amyloidBeta/          ★ 今回のテーマ
   │     ├─ AmyloidBetaScene.js   シーン本体（共通インターフェース実装）
   │     ├─ aggregationLayout.js  粒子の配置と閾値を決定論的に生成
   │     ├─ AggregationField.js   Aβ 粒子フィールド（THREE.Points + shader）
   │     ├─ FibrilRibbons.js      線維の描画（drawRange で伸長）
   │     ├─ PlaqueCores.js        プラークの塊とフレネル光輪
   │     ├─ Neuron.js             神経細胞の簡易構造
   │     └─ shaders/particles.js  粒子用 GLSL
   ├─ components/              UI パーツ（素の DOM、フレームワーク非依存）
   ├─ controls/                OrbitControls の設定
   ├─ data/                    ステージ定義・配色・文言（コンテンツはここに集約）
   ├─ styles/                  base.css（トークン）/ ui.css（レイアウト）
   └─ utils/                   数学・DOM・再生制御・破棄処理
```

---

## 設計の考え方 / Design notes

**状態はひとつだけ。** アプリが持つ状態は「進行度（0〜1）」だけです。
`Playback` がその値を持ち、シーンと UI コンポーネントに配るだけの構造にしています。
再生・スライダー・ステージジャンプはすべて同じ入口を通ります。

**進行はすべて GPU 上で計算。** 粒子は 1 つの `THREE.Points` で表現され、
各粒子が「いつ出現するか」「いつオリゴマーに参加するか」「いつ線維になるか」
「いつプラークに取り込まれるか」という自分の閾値を attribute として持ちます。
`uProgress` を渡すだけで、集団が少しずつ状態遷移していきます。
段階が一斉に切り替わらないので、実際の凝集過程に近い「グラデーション」になります。

**移動の一貫性。** 各粒子は「自由 → 特定のオリゴマー → その線維の特定区間 → その線維が
属するプラーク」という一連の系譜を持ちます。空間的に連続した経路なので、
画面の端から端へワープするのではなく、その場で集まって伸びて固まる動きに見えます。

**配置は決定論的。** 疑似乱数はシード固定（`createRandom`）なので、
リロードしても同じ絵になります。SNS 用に撮り直すときに構図が変わりません。

**言語切替は CSS だけ。** 日英どちらのテキストも最初から DOM に置き、
`#ui[data-lang]` で表示を切り替えています。再描画が発生しないので、
言語を変えてもアニメーションが途切れません。短い UI ラベル（ボタン等）は
併記モードでも片方だけを出す、という使い分けをしています。

**色は寒色 → 暖色。** モノマー（シアン）→ オリゴマー（琥珀）→ 線維（橙）→ プラーク（赤）と
進むので、色を見ただけで進行方向が直感的に分かります。

---

## 今後の拡張方針 / Roadmap

新しいテーマ（`heart-failure` など）は `src/scenes/<theme>/` を追加し、
`src/app/sceneRegistry.js` に 1 行足すだけで動きます。
`App.js` や `Viewer.js` を変更する必要はありません。
手順の詳細は [`docs/adding-a-scene.md`](docs/adding-a-scene.md) にあります。

想定しているテーマ:

```text
src/scenes/
├─ amyloidBeta/          ✅ 実装済み
├─ heartFailure/         心不全（前負荷・後負荷とリモデリング）
├─ atrialFibrillation/   心房細動（興奮伝播と血栓形成）
└─ cerebralInfarction/   脳梗塞（灌流低下とペナンブラ）
```

URL のハッシュ（例: `#/amyloid-beta`）でテーマを切り替えられる仕組みは
すでに入っています。テーマが 2 つ以上になった時点で、UI にセレクタを追加してください。

---

## ライセンスと利用について

教育・啓発目的での利用を想定しています。
臨床判断の根拠として使用しないでください。
