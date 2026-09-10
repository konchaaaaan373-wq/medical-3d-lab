# Work への統合引き継ぎ — B4 continued（B4-N1〜N4）

前回渡した `WORK-INTEGRATION-HANDOFF.md`（対象 `256e613`）の**差分更新**です。
置き換えではなく、変わった箇所だけを書いています。

**この文書はリポジトリ内に置いてあります**（`docs/work-integration-handoff.md`）。
納品 ZIP へは同じ内容が入りますが、原本はここです。

---

## 0. 前回の記述で、いま成り立たないもの

| 前回の記述 | 現状 |
| --- | --- |
| 「レポートは**以後どんな変化でも消える**」 | **前回時点では成り立っていませんでした。** ズームボタン・`+`/`-` キー・「寄る」の 3 経路が漏れていました（B4-N2）。今回修正し、実アプリで確認済みです |
| 「Landing 例外差分の必要条件は `validateLandingPresentation` **だけ**」 | **不十分でした。** レビューの指摘どおり、公開件数（0/1/2）、共通 release 判定、production の route/card/chunk/asset 除外も維持する必要があります。心臓を公開カードへ増やさないことも条件です |
| 「血管は壁厚を持たない 1 枚の面」 | **撤回しました**（B4-N1）。測定法が solid と shell を区別できていませんでした |

---

## 1. 共有ファイルの接続点 — 今回増えた分だけ

### `src/app/App.js`

| 識別子 | 何をするか | Work が触るとき |
| --- | --- | --- |
| `zoomBy()` 末尾の `anatomyPanel?.noteDisplayChanged?.()` | ズームボタンと `+`/`-` キーは**どちらもこの関数を通ります**。新しいズーム UI を作るなら `onZoom` → `zoomBy` を呼んでください。直接 camera を動かすと失効通知が漏れます | 新しいズーム部品はここを経由 |
| `focusOnStructure()` の同上 | 「寄る」。controls を経由せず camera を動かすので、ここでしか気づけません | — |
| `resetView()` の同上 | 「View」 | — |
| `applyInspectionView(id, { byReader = true })` | **第 2 引数が新設です。** 読者が視点ボタンを押した＝`byReader: true`（既定）で失効。アプリが読者の代わりに視点を当てる＝`byReader: false` で失効しません | 視点を当てる新 UI は既定のままでよい |
| `viewer.controls.addEventListener('start', …)` | 変更なし。**`change` へは戻さないでください**——アプリ自身の tween でも発火し、当の recipe のレポートを消します | — |

### `src/components/AnatomyPanel.js`

| 識別子 | 何をするか |
| --- | --- |
| `noteDisplayChanged()` | 変更なし。**camera を動かす新しい入口を作ったら、ここを呼んでください。** これが唯一の入口です |
| `applyRecipe()` → `onViewChange(view, { byReader: false })` | recipe 自身の視点適用。レポートを書く直前なので、ここだけ失効させません |
| レポート文言 | 「この視点でアンカーが遮られない件数」。**「見えている」とは書きません**——1 アンカーの ray であり、frustum もパネルの被りも見ていないためです |

### `scripts/`（新規・共有ではないが Work も使えます）

| ファイル | |
| --- | --- |
| `lib/mesh-metrics.mjs` | 純粋な計測モジュール。`tests/mesh-metrics.test.js` が既知形状で検証します |
| `measure-candidate-surfaces.mjs` | 上を使って固定 GLB を計測。`npm run assets:measure [heart\|junctions]` |
| `validate-candidate-gltf.mjs` | glTF Validator。**error があれば exit 1**、実行不能は 2。`npm run assets:validate` |
| `pack-handoff.mjs` | 納品ディレクトリ生成（自己参照しない hash 一覧＋`restore.sh`） |

---

## 2. Landing の例外差分 — 条件を訂正します

3 ファイル・17 行のままで、内容は変わっていません。**維持すべき条件を訂正します**：

1. `validateLandingPresentation(SCENES)` が空
2. **公開件数が変わらないこと**（`PUBLIC_MANIFEST` の件数、`RELEASED_SCENES`）
3. **共通の release 判定を通ること**（`isSceneReleased` / `betaPublicationProblems`）
4. **production build から route・card・chunk・asset が除外されること**（`npm run verify:site`）
5. **非公開の心臓を公開カードへ増やさないこと**
6. PR #49 の受入済み HEAD を変更しないこと

差分の取り出し：

    git diff 17c5946..HEAD -- src/data/landing.js src/data/landingHero.js tests/landing.test.js

---

## 3. まだ接続していないもの

**Work からの部品・接続差分案はこの時点でも未着です。統合済みの箇所はありません。**

1. 統一 UI 仕様の横向きレイアウト（`#ui[data-anatomy-compact='landscape']` は暫定）
2. 読み込み・失敗・再試行・非同期破棄の見せ方。scene 側は
   `getAnatomyStatus()` に `{state, selectableCount, meshCount, unknownMeshes,
   vesselMeshes, vesselsInFile, vesselsNotTaken, vessels, missing}` を出し、
   候補 asset が無ければ `state:'error'` と `hint` を返します
3. Neco 導線・公開画面・Landing の見た目
4. 心臓の公開（ゲートは閉じたまま）

**新しい通知 API は増やしていません。** camera を動かす入口が増えたときに
`noteDisplayChanged()` を呼ぶ、という 1 点だけが Work 側への依頼です。

---

## 4. レビューが画像から挙げた UI 所見（Work 担当）

こちらでは**実装していません**。担当境界どおり Work の判断です。

- 375×667 で大きなタイトルカードと選択カードが並立し、下部に常設の大きな面がある
- 844×390 でも横長の下部カードと強い影が観察域を圧迫する
- 重複タイトルと制作説明の常設をやめ、モデル名・開発中/未レビュー状態・部位名・
  操作の階層を整理する。文字やモデルを小さくして押し込まない
- **未確定名称の短い留保（「名称要確認」）と未レビュー表示は、意味が読める形で残してください。**
  これは Claude 側が B4-R5 で入れたもので、消えると出典の不一致が伝わらなくなります
- 同意カードの前/許可後/拒否後、縦横、文字拡大、失敗/再試行を別々に確認する

---

## 5. 検証の区別

- **実装者（Claude）が自己検証したもの**：全テスト、実 GLB の計測と Validator、
  実アプリでの操作（1280×800）
- **第三者の独立検証**：レビュー側が `256e613` に対して行った範囲のみ
  （合成形状での反例再現、限定ハーネス、bundle 復元）。**実 GLB・全テスト・
  実アプリの再実行は含みません**
- **未確認**：解剖レビュー、臨床レビュー、法務判断、実機性能、Netlify/CI の実挙動
