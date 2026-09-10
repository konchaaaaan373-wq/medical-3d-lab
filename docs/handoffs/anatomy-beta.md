# Handoff — 解剖β（B0 → B1 / B2）

Last updated: 2026-09-08。現状だけ。詳細はリンク先。

```text
契約固定 SHA:  837505a   ← 現行。ここから始めてください
旧契約点:      eecd21b / 1a02bd0   ← ここから新規開始しないこと
Base SHA:      bc2c09b (main)   Branch: claude/medical-3d-lab-b0-dv85dl   PR: #48 (Draft)
後続:          PR #50（B2-1・解剖パネル）がこのブランチを base に積まれています
```

すでに古い SHA から切ったブランチがある場合は、**差分を捨てず**現行 SHA へ
rebase / merge して取り込んでください。

## 決めたこと

**解剖モデルは単独で利用価値と品質基準を持つ製品層。病態モデルはその上の別層。**
公開βは解剖層だけを公開します。心臓解剖が未完成でも病態で代用しません。
→ [ADR](../architecture/adr-2026-09-08-anatomy-only-beta.md)、[beta-release.md](../beta-release.md)

## 公開対象

| sceneId | organ | 状態 |
| --- | --- | --- |
| `brain-anatomy` | brain | **公開中**（1 件） |
| `heart-anatomy` | heart | **未登録** — B4 の成果物。代用しません |

理由つきの答え: `node -e "import('./src/catalog/release.js').then(m=>console.log(m.BETA_CANDIDATE_STATUS))"`

## UI 契約（`1a02bd0` から後方互換。追加のみ）

```js
// src/catalog/publicManifest.js — 唯一の公開一覧。UI は公開判定を再実装しない
PUBLIC_MANIFEST  // { schemaVersion, revision, channel, models, organs, count }
PUBLIC_MODELS, publicModelById, publicModelsForOrgan, organIsPublished, MODEL_INFO_ROUTE
// models[] = sceneId, organId, organLabelJa, titleJa, titleEn, route,
//            posterPath, posterKind, modelInfoRoute, modelCard
```

`ready:false` の仮データなし（開けないモデルは行が無い）。`posterKind:'link-preview-card'`
は OG カードで**モデルのレンダリングではない**（F-28）。形は
`tests/public-manifest.test.js` が固定。`release.js` は `sceneReleaseProblems` /
`RELEASE_POLICIES` / `publicationDecisionProblems` が増えました（既存 export は不変）。

## 所有ファイル

- **B0 所有（変更提案は引き継ぎに）** — `src/catalog/*`、`src/app/releaseGate.js`、
  `vite.config.js`、`scripts/*`、`tests/{beta-release,public-manifest,asset-delivery}.test.js`、
  `docs/{beta-release.md,architecture/adr-*,beta-publication/}`
- **B1（UI）が触ってよい** — `src/app/{Landing,Explorer,landingOrganHero}.js`、
  `src/data/{landingHero,landing}.js`、`src/styles/{landing,explorer}.css`

## モデル / asset の版

モデル層・ジオメトリ・医学パラメータ・asset はいずれも変更なし
（`brain-atlas-glb` = `sha256:76a49ea4…c5453`）。`brain-anatomy` の model card revision のみ
3 → **4**（`BrainAnatomyScene.js` を対象に追加、`modelDigest a4e246e1208c5785`）。
公開判断は asset hash と scene revision の**両方**に紐づき、どちらかが動けば公開が閉じます。
非公開 4 件の OG カードは削除（`npm run cards` で再生成可）。

## 検証

`npm test` **1642 pass / 0 fail**、build、`verify:site`（asset 配信・判断記録の実在を含む）、
`revisions:check`、`cards:check`、`budget`、`verify:ui`、`verify:anatomy` すべて緑。
未登録 GLB を 2 か所（新フォルダ・decoder フォルダ）に実際に置いてビルドし、
`verify:site` が両方を報告することを確認しています。
実施内容と未確認事項 → [`docs/beta-publication/brain-anatomy.md`](../beta-publication/brain-anatomy.md)
**未実行**: Safari / Firefox 実機、スクリーンリーダー、タッチ、本番デプロイと `verify:live`。

## 残る P1 / blocker

- **F-27（B1）** 索引がカード 1 枚になる。その情報設計は UI 担当の判断
- **B4** `heart-anatomy` 未実装。βの目標 2 本のうち 1 本が未達
- **F-29（P2）** preview デプロイのアクセス保護は未設定。ホスト側の設定で、
  **権限が無いので「保護済み」とは報告しません**
- **人が必要**: `brain-anatomy` の臨床レビュー（`pending`）、ライセンスの法務判断（未変更）

## 使用量

**計測不可**（上限・実消費を取得する手段がなく、推測しません）。
測れたビルド指標のみ: production JS チャンク 85 → 39、dist ファイル 101 → 50、
公開ページ 5 → 1、カード 6 → 2。

## 次の 1 手

1. **B1（UI）** — 現行 SHA から別ブランチ。パック `02` の範囲と F-27 だけ
2. **B2-1（Claude）** — 共通 viewer の最小範囲。現行 SHA から
3. **B4（Claude）** — `heart-anatomy`
