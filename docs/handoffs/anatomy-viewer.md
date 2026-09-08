# Handoff — B2-1 共通 viewer（最小範囲）

Last updated: 2026-09-08。詳細はリンク先。

```text
Branch: claude/medical-3d-lab-b2-1-viewer   base: PR #48（claude/medical-3d-lab-b0-dv85dl）
```

#48 は未マージなので、この PR の base も `main` ではなく #48 のブランチです。

## 固定した契約

**[`src/app/anatomyContract.js`](../../src/app/anatomyContract.js)** —
`anatomyContractProblems(scene)` が実シーンを検査し、
[`tests/anatomy-contract.test.js`](../../tests/anatomy-contract.test.js) が脳で回します。

```js
getAnatomySelection() / onAnatomySelection(fn) / selectStructure(id) / clearSelection()
getAnatomyStatus()    / onAnatomyStatus(fn)
getAnatomyTree()      // leaf.structureId は上の id と同じ値
isolateStructure(id)  / clearIsolation() / getAnatomyIsolation() / onAnatomyIsolation(fn)
```

**部位 ID は 1 種類**（脳は atlas の `bx_id`）。group node は `group:` 前置で、
`selectStructure` に渡すと近い何かを選ばず false。**表示（配色・視点・解剖レイヤー・
単独表示）は選択 ID を動かしません。**

## 画面構成（F-31 の答え）

`AnatomyPanel` が 1 枚。上部＝**選択概要**（固定選択の部位名／所属／この部位だけ／
全体に戻す）で、これは本文の flex 兄弟であってオーバーレイではありません。
本文＝**部位／表示／詳細**のタブで、**縦スクロールするのは表示中の本文 1 領域だけ**。

- sticky も二重スクローラも使っていません。**どちらも試して却下**：sticky は一覧への
  被り、二重スクローラはクリップ境界跨ぎ（どちらも `verify:ui` が検出）
- 表示タブは既存 `InspectionPanel` と既存 legend をそのまま入れています（`embedded: true`
  で閉じるボタンだけ外す）。**同じパネルを二重生成していません**
- 高さ 520px 未満でツリーを消す応急処置は**撤去**
- スマホ・低い画面（`max-width:820px` または `max-height:560px`）では本文がシート化。
  背景 inert／Esc／フォーカス移動と復帰／閉じるボタンは本文の外。開閉・回転で
  選択 ID・展開状態・スクロール位置は保持（DOM を作り直しません）
- **コンソールの「観察」ボタンは解剖シーンでは出しません** — 表示コントロールは
  パネルのタブが入口で、入口は 1 つ。病態シーンのコンソールは無変更

## 直した既存バグ

- **hover が固定選択を書き換えていた**（`hovered ?? selected`）。固定があるとき概要と
  主要操作は selected 対象。未選択時の hover 案内は残しています
- **ツリーの `aria-expanded` が treeitem 側で false のまま**だった。開閉は 1 か所
  （`setExpanded`）が DOM・内部状態・announce を同時に書きます
- **再 attach 時にシーンが通知せず**、カードとツリーに旧モデルの部位が残っていた。
  リセットを通知するようにし、DOM まで検査するテストを追加
- ツリーのキー操作: 1 tab stop（roving tabindex）／上下で移動／左右で開閉・親子移動／
  Home・End／Enter で確定。**フォーカス移動は選択しません**。扱うキーは
  `stopPropagation` するので、モデルの seek / 再生ショートカットが誤作動しません

## モデル / 公開判断

`BrainAnatomyScene.js` は model card revision の対象なので、**この PR で 2 回失効**しました
（構造 ID の分離で 4→5、再 attach 通知で 5→6）。いずれも card を直して
`revisions:adopt`、[公開判断](../beta-publication/brain-anatomy.md)を取り直し、
production ビルドで再確認済み。現在 revision **6** / digest `584cdfefac8a7464`。
医学モデル・形状・配色の設計は変更していません。

## 検証（Chromium 141.0.7390.37 / production ビルド）

`npm test` **1656 pass / 0 fail**、build、`verify:site`、`revisions:check`、`cards:check`、
`budget`、`verify:ui`（6 viewport、全緑）、`verify:anatomy`（拡張：hover 分離・キーボード・
`aria-expanded` 一致・シートの開閉と状態保持）すべて緑。

画像は 1280×720 / 375×667 / 844×390 / 320×568。対象 SHA・ブラウザ・状態は PR 本文に記載。

## 残る課題

- **F-34（P2）** 初期表示で leaf が 1 件も見えない（最上位 group だけ開く）
- **F-35（P3）** 未選択時の案内が hover 前提の文言
- **F-32（P2・B3）** ツリー最上位が atlas の命名で不揃い
- **未実施**: 実機タッチ・回転・スクリーンリーダー（`role="tree"` と `aria-expanded` は
  マークアップと挙動として検証済みで、VoiceOver で読めることの確認ではありません）

## 触っていないもの

UI 担当所有（`Landing.js` / `Explorer.js` / `landingOrganHero.js` / `landingHero.js` /
`landing.js` / `landing.css` / `explorer.css`）、`scripts/check-viewports.mjs`、
`.github/workflows/ci.yml`、課金・顧客管理導線、病態シーンのレイアウト。

## 使用量

**計測不可**（取得手段がなく、推測しません）。
