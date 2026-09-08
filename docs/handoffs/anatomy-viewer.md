# Handoff — B2-1 共通 viewer（最小範囲）

Last updated: 2026-09-08。詳細はリンク先。

```text
Branch: claude/medical-3d-lab-b2-1-viewer   base: fdf7d3f（B0 契約固定点を含む PR #48 の HEAD）
```

B0 の PR #48 はまだ Draft です。このブランチはその上に積んでいます。

## 何を固定したか

**[`src/app/anatomyContract.js`](../../src/app/anatomyContract.js)** — 解剖シーンと
それを読む UI の契約。`anatomyContractProblems(scene)` が実際のシーンを検査し、
[`tests/anatomy-contract.test.js`](../../tests/anatomy-contract.test.js) が脳で回します。

```js
// 必須。UI はこれ以外からシーンの状態を推測しない
getAnatomySelection() / onAnatomySelection(fn) / selectStructure(id) / clearSelection()
getAnatomyStatus()    / onAnatomyStatus(fn)
getAnatomyTree()      // 部位ツリー。leaf.structureId が上の id と同じ値
isolateStructure(id)  / clearIsolation() / getAnatomyIsolation() / onAnatomyIsolation(fn)
// 任意（あれば形を検査する）
getAnatomyHover / onAnatomyHover / getAnatomyViews / setAnatomyView
getAnatomyColorModes / setAnatomyColorMode
```

- **部位 ID は 1 種類。** シーンの atlas が付けた値（脳は `bx_id`）で、外部は
  解釈も生成もしません。group node は `group:` 前置で、`selectStructure` に
  渡すと**近い何かを選ばずに false を返します**
- **表示と同一性を分ける。** 配色・視点・解剖レイヤー・単独表示はすべて表示で、
  選択中の ID を動かしません
- `SELECTION_FIELDS` = `id, name, nameJa, breadcrumb, breadcrumbJa`

## 受入条件の実測（Chromium・production ビルド）

`npm run verify:anatomy`（新規スクリプト。`--preview` で未公開シーンも駆動）

| 条件 | 結果 |
| --- | --- |
| 3D 選択・部位ツリー・詳細表示が同じ部位 ID | 271 行のツリーと 3D が双方向で一致 |
| 非表示の部位を 3D クリックで拾わない | 単独表示中の誤選択なし。解剖レイヤーでも同様（unit） |
| ドラッグ終了をクリック選択と誤認しない | 別部位の上で離しても選択は動かない |
| 単独表示から全体表示へ戻せる | レイヤー・視点ごと元に戻る（unit で opacity 全一致） |
| 標準色／色分けで選択 ID が変わらない | 両モード・6 視点で不変 |
| 遷移後にイベント・選択状態が重複しない | 再 attach で選択も isolation も残らない。dispose で listener 0 |

## 直した既存バグ（F-33）

**脳の `bx_id` は mesh 一意ではありません。** 271 構造が 397 mesh に分かれており
（124 構造が複数 mesh）、`meshByAtlasId` が 1:1 の Map だったため後勝ちし、
**分割された構造の片方をクリックするともう片方がハイライトされて**いました。
構造 = ID、mesh = その描かれ方に改めました。読者に見せる部位数も 397 → **271**
（model card が元から書いていた数）。

## モデル / 公開判断への影響

`BrainAnatomyScene.js` は model card revision の対象なので、**この変更で公開判断が
失効し、production ビルドから脳シーンが消えました**（設計どおり）。
card revision 4 → **5**（digest `30ef4c5381b41f55`）、
公開判断を [`docs/beta-publication/brain-anatomy.md`](../beta-publication/brain-anatomy.md) で
取り直し、production ビルドで再度緑を確認済みです。

## 検証

`npm test` **1648 pass / 0 fail**、build、`verify:site`、`revisions:check`、
`cards:check`、`budget`、`verify:ui`（実ブラウザ 6 viewport）、`verify:anatomy` すべて緑。

## 残る P1

- **F-31** rail が満杯で、ツリーをスクロールすると選択カードが画面外に出ます。
  sticky と二重スクローラは試して却下（どちらも occlusion / クリップ跨ぎを作る）。
  情報設計の判断が要ります。高さ 520px 未満ではツリーを非表示にする応急処置つき
- **F-32** ツリーの最上位が atlas の命名で不揃い（B3・解剖側）

## やっていないこと

汎用断面エンジン、心臓制作、病態改変、UI 担当所有ファイル
（`Landing.js` / `Explorer.js` / `landingOrganHero.js` / `landingHero.js` /
`landing.js` / `landing.css` / `explorer.css`）の編集。B3・B4 の作業。

## 使用量

**計測不可**（取得手段がなく、推測しません）。
