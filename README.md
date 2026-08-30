# medical-3d-lab

> **Make invisible mechanisms of health and disease visible, interactive, and understandable.**
>
> 見えない病態生理を、3D で動かし、触って理解する。

**3D モデルを集めたサイトではありません。** 中核は、医学モデルを 1 つ持ち、
それを**触って確かめられる** interactive web です。心臓の形も、EF も、
PV ループも、圧波形も、すべて同じモデルの解から出ています。

3D は目的ではなく手段です。時間とともに変化し、複数の変数が連動し、静止画では
因果関係が追えない——そういう概念にだけ使います。

設計思想の全体は **[`docs/product-principles.md`](docs/product-principles.md)**
にまとめてあります。新しいテーマや機能を追加する前に、まずそちらを読んでください。

対象は心臓と脳だけではなく **人体全体** です。現在 11 の系統・22 の臓器を
カタログに登録し、20 シーンを実装しています。全身の一覧は
**`#/organs`**（Organ Explorer）から。

**深く作り込んだシーン（production）**

| テーマ | 中心にある問い | URL |
| --- | --- | --- |
| **心不全** | 後負荷を上げると SV はなぜ下がる？ EF 58% と 29% では何が違う？ | `#/heart-failure` |
| **アミロイドβの蓄積** | Aβ はどうやって小さな分子からプラークになる？ | `#/amyloid-beta` |

**モデル層を分離したシーン（reviewed / alpha）** — 純粋な JS の医学モデルを
`src/models/` に持ち、evidence dossier・model card・scope panel をセットで
備えたシーンです。数値を出す資格があるのはこの 4 つと production の 2 つだけです。

| テーマ | 中心にある問い | URL | status |
| --- | --- | --- | --- |
| **COPD と動的過膨張** | 息を吐ききる前に次の吸気が来ると、肺の中で何が起きる？ | `#/copd` | reviewed |
| **喘息の不均一性** | 同じ刺激で、なぜ気道樹の一部だけが閉じる？ | `#/asthma` | reviewed |
| **肝硬変と門脈圧亢進症** | 側副血行路が開いても、なぜ圧は下がりきらない？ HVPG は何を測っている？ | `#/portal-hypertension` | reviewed |
| **肝腎症候群** | 構造的に正常な腎臓が、なぜ濾過をやめる？ | `#/hepatorenal-syndrome` | alpha |

`reviewed` と `alpha` の差は**臨床レビューを受けたかどうか**です。どちらも
`production` ではなく、UI に **Prototype** バッジが出ます。

**全身プロトタイプ（prototype）** — 呼吸と肺 / 嚥下と胃の蠕動 / 腸管の輸送 /
門脈血流と胆汁 / 膵臓の分泌 / 濾過から膀胱まで / 甲状腺ホルモンの放出 /
副腎の反応 / 脾臓での血球処理 / 骨のリモデリング / 骨格筋の収縮 /
子宮内膜の周期 / 前立腺と尿流 / 全身の概観。

prototype は **「形は概略、動きは仮」** という約束です。画面上に
`PROTOTYPE — NOT ANATOMICALLY VALIDATED` と表示され、数値は一切出しません。
何を表現していないかは [`docs/medical-notes.md`](docs/medical-notes.md) に
シーンごとに列挙してあります。昇格の条件は
[`docs/adding-a-scene.md`](docs/adding-a-scene.md) にあります。

心不全は **reference implementation** です。閉ループの循環モデル・PV ループ・
圧波形・前負荷/後負荷スライダーまで実装されており、単なる 3D heart viewer では
なく interactive cardiovascular physiology simulator に近い構造になっています。
`Learn` ボタンから、**「後負荷を上げると SV はどう変わる？」** を予測して
自分で確かめるガイド付き教材も 1 本試せます。

コンテンツは 3 層で考えます。**SNS** で興味を持たせ（15 秒・入口）、
**Interactive Web** で理解させ（中核）、**Educational Module** で定着させる
（予測 → 操作 → 観察 → 説明 → 応用）。3 層は同じ医学モデルを共有し、層ごとに別の
数値を持つことはありません。心不全では 3 層すべてが揃っています。

---

## 概要 / Overview

どのテーマも共通で、**進行度スライダー（0 → 100%）ひとつ**で病態が連続的に変化します。

**アミロイドβ** — 細胞外スペースの Aβ が
**モノマー増加 → オリゴマー形成 → 線維（フィブリル）形成 → プラーク（老人斑）形成**
と連続的に変化していきます。

**心不全** — 左室を切り欠いた模式図で、
**求心性肥大 → 左室の拡大 → 収縮機能の低下（HFrEF）**
という構造・機能の変化のパターンのひとつを表示します。
**肺うっ血は「その次のステージ」ではなく**、左心系充満圧の上昇に伴う
血行動態のオーバーレイとして別軸で描いています。

心臓の動きと数値は、**閉じた循環の常微分方程式を解いた結果**です
（time-varying elastance、`circulation.js`）。スライダーが動かすのは
収縮末期エラスタンス・無負荷容積・拡張末期の硬さ・体血管抵抗・循環血液量・
心拍数という**力学パラメータだけ**で、
EF / EDV / ESV / SV / CO / 左室拡張末期圧 / 肺静脈圧 / 動脈圧は
そこから**計算結果として出てきます**。壁の厚さ・内腔の大きさ・拍動・
圧-容積ループ・圧波形・数値パネルはすべて同じ解を見ているので、
絵と数値が食い違いません。
心筋は「1 心拍の中では」非圧縮として扱うので、収縮期の壁の肥厚は
モデルから自動的に出てきます（病態ステージ間では心筋量そのものが変化します）。

`Loading conditions` の前負荷・後負荷スライダーはモデルの**入力**を変えます。
前負荷を上げれば EDV と 1回拍出量が増え（Frank–Starling 機構）、充満圧も上がります。
後負荷を上げれば 1回拍出量が減り、その減り方は不全心のほうが大きくなります。
どれも書き込んだ挙動ではなく、方程式から出てくる帰結です。

肺うっ血は **血液の逆流としては描いていません**。血流は生理的な向きにしか動かず、
うっ血は充満圧の上昇として、左房 → 肺静脈 → 肺血管床 へ広がる圧のフロントと、
血管の外側に現れる間質の水分として表現しています。

- 3D ビューは回転・ズーム可能（OrbitControls）
- 5 段階のステージ表示と解説テキスト（日英併記 / 日本語 / English を切替）
- 再生 / 一時停止 / リセット / 視点リセット
- **ストーリーモード**：各ステージで自動的に一時停止し、その部位にカメラが寄る
- **比較モード**（心不全）：正常な左室を横に並べ、数値も「正常値 → 現在値」で表示。
  圧-容積ループも 2 本並びます。
  病態を「順番」ではなく「別の状態」として示すための機能です
- **圧-容積ループ**（心不全）：解かれた 1 拍を P–V 平面に描き、ESPVR / EDPVR を重ねます
- **圧波形**（心不全）：同じ 1 拍の左室圧・大動脈圧・左房圧。弁が開く瞬間と
  等容性収縮期の長さが目で追えます
- **前負荷 / 後負荷スライダー**（心不全）：循環を解き直し、数値もループも同時に動きます
- **ガイド付き教材**（心不全）：予測 → 操作 → 観察 → 説明 → 応用。
  1 モジュール = 1 つの因果関係。答えはモデルから計算されます
- **SNS / Reel モード**（心不全）：15秒の自動再生。そのまま画面録画すれば投稿できます
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
npm test        # モデルの整合性テスト（追加の依存なし / node:test）
```

その他のコマンド:

```bash
npm run build   # dist/ に静的ファイルを出力
npm run preview # ビルド結果をローカルで確認
```

`npm test` は、EF / EDV / ESV / SV / CO の算術整合性、スライダー全域での
幾何の妥当性、Aβ 各凝集種の共存などを検証します（`tests/`）。
医学的な数値やステージを変更したら、必ず通してください。

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
| Compare ボタン / `C` | 正常な状態と並べて比較（対応シーンのみ表示） |
| Reel ボタン / `Esc` で終了 | SNS / Reel モード（対応シーンのみ表示） |
| PNG ボタン | 書き出しサイズを選んで画像として保存 |
| 前負荷 / 後負荷スライダー | 循環モデルの負荷条件を変更（対応シーンのみ表示） |
| Learn ボタン / `Esc` で終了 | ガイド付き教材（対応シーンのみ表示） |
| 言語ボタン（右上） | 日英併記 / 日本語 / English を切替（設定は保存されます） |

---

## SNS / Reel モード

心不全シーンには、そのまま SNS 投稿にできる **15秒の自動再生モード**があります。

1. **Heart failure** シーンを開く
2. 下部の **Reel** ボタンを押す
3. 15秒の自動再生が始まります（`↻` で再生し直し、`Escape` または Exit で終了）

内容は「EF 58% と 29% ── 心臓の動きはどう違う？」を軸に、
正常と HFrEF の左室を**同じ拍動タイミングで**並べ、拡張末期（ED）→ 収縮末期（ES）を
ゆっくり見せてから、EF の意味・肺うっ血・まとめへ進みます。
画面の数値はすべてモデルの state から取得しているため、モデルを変えれば表示も追従します。

- **9:16（1080×1920）を主対応**。画面下のチップで 4:5 / 1:1 / 16:9 に切り替えられます
- 表示言語は UI の言語設定に従い、**動画内は日英どちらか一方のみ**表示します
  （併記モードの場合は日本語）
- 再生中は通常の UI を消し、必要な文字だけを残します
- Instagram / TikTok の UI が重なる上下端を避けた **セーフエリア**内に文字を配置しています

### 画面録画のしかた

動画書き出し機能は入れていません。3D キャンバスだけを録画すると
**文字レイヤーが入らない**ため、通常の画面収録のほうが確実だからです。

- **macOS**: `⇧⌘5` →「選択部分を収録」で中央のフレームを指定
- **Windows**: Xbox Game Bar（`⊞ Win + G`）または任意の画面収録ソフト
- **iOS / Android**: OS 標準の画面収録

録画するのは**中央のフレーム内側だけ**です。
アスペクト切替や Exit ボタンはフレームの外（黒帯の上）に置いてあるため、
録画には映りません。

---

## ディレクトリ構成 / Project structure

```text
medical-3d-lab/
├─ index.html                  エントリ HTML（UI は JS 側で生成）
├─ vite.config.js
├─ public/                     静的ファイル置き場（現状は空）
├─ tests/                      モデル整合性テスト（node --test）
├─ docs/
│  ├─ product-principles.md    ★ 設計思想（source of truth）
│  ├─ adding-a-scene.md        シーン・臓器・疾患を追加する手順 + 採否チェック
│  ├─ medical-notes.md         医学的な表現の方針と注意
│  ├─ medical-audit-2026-08-24.md  医学監査の記録
│  └─ architecture/
│     └─ product-architecture.md  層の依存関係
└─ src/
   ├─ main.js                  起動処理とルート分岐（scene / explorer）
   ├─ catalog/                 ★ どんな system / organ / scene があるか
   │  ├─ taxonomy.js           11 系統・22 臓器・status の定義
   │  ├─ scenes.js             シーンの manifest（唯一の登録先）+ 予定の疾患シーン
   │  └─ index.js              カタログへの問い合わせと整合性検証
   ├─ app/
   │  ├─ App.js                シーンと UI の接続（状態は進行度ひとつだけ）
   │  ├─ router.js             `#/<slug>` と `#/organs` の解決
   │  ├─ Explorer.js           全身の Organ Explorer（3D を一切ロードしない）
   │  ├─ ReelMode.js           SNS シーケンスの実行（フレーム整形・クリーン表示）
   │  ├─ framing.js            アスペクトに応じたカメラ距離の計算
   │  ├─ Viewer.js             renderer / camera / bloom / アニメーションループ
   │  └─ sceneRegistry.js      カタログを UI の形に合わせるアダプタ
   ├─ scenes/
   │  ├─ shared/               ★ 全臓器シーンが載る土台
   │  │  ├─ PrototypeScene.js     scene interface の実装 + 被写体に合わせた構図
   │  │  ├─ materials.js          組織・管腔・粘膜・骨・半透明・粒子のマテリアル
   │  │  ├─ lighting.js           共通のスタジオライト
   │  │  ├─ geometry/shapes.js    球を臓器の形に押し込む / 回転体・断面
   │  │  ├─ geometry/tube.js      半径を毎フレーム書き換えられる管（蠕動・収縮）
   │  │  └─ motion/               粒子の流れ・呼吸周期・伝わる波
   │  ├─ cardiovascular/
   │  │  ├─ organs/heart.js       概観用の心臓
   │  │  └─ scenes/heartFailure/  ★ 心不全（血行動態モデル・reference implementation）
   │  │     ├─ HeartFailureScene.js  シーン本体（共通インターフェース実装）
   │  │     ├─ circulation.js        閉ループ循環モデル（time-varying elastance / RK4）
   │  │     ├─ hemodynamics.js       病態 → 力学パラメータ → 解、のブリッジ
   │  │     ├─ Chamber.js            変形する心腔のジオメトリ
   │  │     ├─ BloodField.js         左室内の血液粒子（生理的な向きのみ）
   │  │     ├─ CongestionOverlay.js  圧のフロントと間質の水分（血流とは別言語）
   │  │     ├─ ReferenceHeart.js     比較用の正常心（同じモデルの progress = 0）
   │  │     └─ reelStoryboard.js     15秒シーケンスの台本
   │  ├─ nervous/
   │  │  ├─ organs/brain.js       概観用の脳
   │  │  └─ scenes/amyloidBeta/   ★ 最初のテーマ
   │  │     ├─ AmyloidBetaScene.js   シーン本体（共通インターフェース実装）
   │  │     ├─ aggregationLayout.js  粒子の配置と閾値を決定論的に生成
   │  │     ├─ AggregationField.js   Aβ 粒子フィールド（THREE.Points + shader）
   │  │     ├─ FibrilRibbons.js      線維の描画（drawRange で伸長）
   │  │     ├─ PlaqueCores.js        プラークの塊とフレネル光輪
   │  │     ├─ Neuron.js             神経細胞の簡易構造
   │  │     └─ shaders/particles.js  粒子用 GLSL
   │  ├─ respiratory/ gastrointestinal/ hepatobiliary/ renal/
   │  ├─ endocrine/ hematologic/ musculoskeletal/ reproductive/ systemic/
   │  │     各系統は organs/（臓器ジオメトリ）と scenes/（シーン）に分かれます
   ├─ components/              UI パーツ（素の DOM、フレームワーク非依存）
   ├─ controls/                OrbitControls の設定
   ├─ data/                    ステージ定義・配色・文言（コンテンツはここに集約）
   │  └─ prototypes/           全身プロトタイプの文言（1 系統に 1 ファイル）
   ├─ styles/                  base.css / ui.css / reel.css / explorer.css
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

**医学パラメータと演出パラメータを分ける。** 臨床的な意味を持つ値は臨床的な名前と
単位で（`edvMl`, `wallMm`, `hr`, `endDiastolicPressureMmHg`）、見た目だけの値は
それと分かる名前で（`longToShortAxisRatio`, `congestionLevel`）書いています。
モデルの精度を超える桁数は UI に出しません（左室心筋重量は内部計算のみ、
圧は 1 mmHg 刻み）。

**数値は「表」ではなく「結果」。** 心不全シーンの血行動態は、かつては手で置いた
キーフレーム表でした。現在は力学パラメータだけを補間し、循環モデルを解いて
EF・充満圧・圧波形を得ています。表を編集して数値を変えることはできません
——変えられるのは力学のほうだけで、その帰結が画面に出ます。
医学レビューが確認した数値の範囲は `tests/hemodynamics.test.js` が守っています。

**色は寒色 → 暖色。** モノマー（シアン）→ オリゴマー（琥珀）→ 線維（橙）→ プラーク（赤）と
進むので、色を見ただけで進行方向が直感的に分かります。

---

## 今後の拡張方針 / Roadmap

**テーマ数は指標にしません。** 10 疾患の浅い 3D より、1 テーマで
SNS → Interactive → Educational が成立しているほうを高く評価します
（[`docs/product-principles.md`](docs/product-principles.md) §9, §11）。

次の一手は、新テーマを増やすことではなく **Heart Failure に Educational
Module を足して 3 層を一度完成させること**です。

```text
Heart Failure    SNS ✓   Interactive ✓   Educational ✓
Amyloid-β        SNS —   Interactive ✓   Educational —
```

心不全で 3 層が実物として揃いました。次は教材を増やすか、新テーマに移るかの
判断になります。

新しいテーマを検討するときは、まず
[`docs/adding-a-scene.md`](docs/adding-a-scene.md) の
**Scene suitability check**（7 問）と **Scene proposal template** に答えてください。
「3D にすると理解が明確に改善するか」に答えられないテーマは扱いません。

技術的には、`src/scenes/<system>/scenes/<scene>/` を追加して
`src/catalog/scenes.js` に 1 エントリ足すだけで動きます。
routing・シーン切替タブ・Organ Explorer・テストはそこから生成されるので、
`App.js` や `Viewer.js` を変更する必要はありません。
シーンの切り替えは画面左上のセレクタ、`#/organs` の Organ Explorer、
または URL のハッシュ（例: `#/heart-failure`）で行えます。
表示していないシーンのコードはダウンロードされません（動的 import）。

臓器のジオメトリは `src/scenes/<system>/organs/` にあり、シーンから独立して
います。`normal-lung` と `asthma` は同じ肺を別パラメータで呼ぶ 2 つのシーンで、
肺を 2 回モデリングしたものではありません。

シーンが任意で実装できる共通フック（ステージ別カメラ、数値パネル、
圧-容積ループ、負荷条件スライダー、SNS シーケンス）は
[`docs/adding-a-scene.md`](docs/adding-a-scene.md) にまとめています。

---

## ライセンスと利用について

教育・啓発目的での利用を想定しています。
臨床判断の根拠として使用しないでください。
