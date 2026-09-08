# Handoff — 解剖β（B0 → B1 / B2）

Last updated: 2026-09-08。現状だけを書きます。長い検証資料はリンク先へ。

```text
Base SHA:  bc2c09bab79956e7aebeacc3e4b4c97b6f63155e (main)
HEAD SHA:  下の「契約固定 SHA」を参照（このファイルは PR に含まれます）
Branch:    claude/medical-3d-lab-b0-dv85dl
PR:        Draft（マージ・本番公開はしていません）
担当バッチ: B0 — 公開βの境界修正、旧方針との整合、回帰テスト、UI 契約の固定
```

## 決めたこと

**公開βは「脳と心臓の 3D 解剖」だけです。** 心臓解剖が未完成だから病態を
公開する、という旧方針は破棄しました。判断と、何を上書きし何を維持したかは
[`../architecture/adr-2026-09-08-anatomy-only-beta.md`](../architecture/adr-2026-09-08-anatomy-only-beta.md)。

## 公開対象の実際の一覧

| sceneId | organ | 状態 |
| --- | --- | --- |
| `brain-anatomy` | brain | **公開中** |
| `heart-anatomy` | heart | **未登録**（B4 の成果物。代用しません） |

公開は **1 件**。クロール面 1 ページ、リンクプレビューカード 2 枚（site 込み）。
`node -e "import('./src/catalog/release.js').then(m=>console.log(JSON.stringify(m.BETA_CANDIDATE_STATUS,null,1)))"`
が理由つきで答えます。

## 次担当が使う契約・export 名

**UI が読むのはこれだけです。公開判定を再実装しないでください。**

```js
// src/catalog/publicManifest.js  ← 契約（tests/public-manifest.test.js が形を固定）
PUBLIC_MANIFEST        // { schemaVersion:1, revision, channel, models, organs, count }
PUBLIC_MODELS          // 上の models と同じ配列
publicModelById(id)    // 1 件、無ければ null
publicModelsForOrgan(organId)
organIsPublished(organId)   // 「心臓を出してよいか」の唯一の判定
MODEL_INFO_ROUTE       // '#/trust'
```

`models[]` の行の形（フィールド名は固定。増やすのは自由、改名・削除はテストが落ちます）:

```
sceneId, organId, organLabelJa, titleJa, titleEn, route,
posterPath, posterKind, modelInfoRoute, modelCard
```

- **`ready: false` の仮データは作りません。** 開けないモデルは行がありません
- `posterKind` は `'link-preview-card'`。**カタログの文字から描いた OG カードで、
  モデルの 3D レンダリングではありません**（→ F-28）
- 「なぜ心臓が無いのか」は `BETA_CANDIDATE_STATUS`（`release.js`）が答えます
- `PUBLIC_MANIFEST.revision` は公開集合が変わると変わる 8 桁 hex

## 所有ファイル

**B0（Claude 責任者）が所有 — UI 担当は変更提案を引き継ぎに残してください:**

```
src/catalog/release.js            公開判定・公開判断記録・preview unlock
src/catalog/publicManifest.js     UI 契約
src/catalog/index.js              DEFAULT_SCENE_ID
src/app/releaseGate.js            ブラウザ側の判定
vite.config.js                    ビルド設定
scripts/scene-loaders-plugin.js   非公開シーンをバンドルから外す
scripts/check-site-output.js      dist 残存検査
tests/beta-release.test.js        回帰テスト
tests/public-manifest.test.js     契約テスト
docs/beta-release.md  docs/architecture/adr-2026-09-08-anatomy-only-beta.md
```

**B1（UI 担当）が触ってよい — B0 は最小限しか触っていません:**

```
src/app/Landing.js          公開集合を読む形にし、準備中の一覧を外しただけ
src/app/Explorer.js         beta の scope を公開集合にし、β の文言を直しただけ
src/app/landingOrganHero.js 1 臓器のときチューザーを出さないようにしただけ
src/data/landingHero.js     HERO_ORGANS（目標）/ HERO_ROTATION（実際に見せる分）
src/data/landing.js         並び順
src/styles/landing.css  src/styles/explorer.css
```

**未着手のまま残した UI 課題（F-27）: 索引がカード 1 枚になります。**
1 枚のグリッド・セクション見出し・hero が読めるかは B1 の判断です。
レイアウトを変えるのは自由ですが、`publicManifest` 以外から公開一覧を
作らないでください。

## 変更したモデル / asset のバージョン・hash

- **モデル層・ジオメトリ・医学パラメータは 1 行も変えていません。**
- asset も変えていません。`brain-atlas-glb` は
  `sha256:76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` のまま。
  この hash が `BETA_PUBLICATION_DECISIONS` に記録され、変われば公開が閉じます
- 削除: `public/social/{amyloid-beta,circulation,heart-failure,myocardial-ischemia}.png`
  （非公開モデルの OG カード。`npm run cards` で再生成できます）
- 再生成: `public/social/site.png` と `cards.json`（公開件数が 5→1 になったため）

## 実行した検証

| | 結果 |
| --- | --- |
| `npm test` | **1629 pass / 0 fail**（+14 件。うち `beta-release` 19・`public-manifest` 5） |
| `npm run build` | 緑。JS チャンク **85 → 39 本**（非公開シーンのコードが出ない） |
| `VITE_ALLOW_PREVIEW=1 npm run build` | 緑。88 本（全シーンが残る＝レビュー用は従来どおり） |
| `npm run verify:site` | 緑。dist に非公開のページ・カード・チャンク・source map・SW なし |
| `npm run cards:check` | 緑 |
| `npm run budget` | 緑（最大チャンク 166.2/260 kB、code 385.3/700 kB） |
| `npm run verify:ui`（Chromium 実ブラウザ・6 viewport × 10 surface） | 「Every declared viewport and surface met the declared rules」 |
| 実ブラウザのスクリーンショット | `#/`・`#/organs`（1280 / 375）・`#/copd` を確認。console error なし |
| production バンドルの実測 | `previewBuild()` / `devBuild()` が `false` にインライン化され、アンロック経路が死んでいる |

## 未実行の検証

- **Safari / Firefox の実機**、スクリーンリーダー、タッチ操作（従来どおり CI と人手の分担）
- **本番デプロイでの確認**。デプロイしていません
- `verify:live`（本番 URL に対する検査）。デプロイ後の担当
- 1 モデルだけの索引が製品として読めるか（F-27、B1）

## 残る P0 / P1、blocker

- **P0 はありません。**
- **P1 F-27** 1 モデルだけの索引の情報設計 — B1
- **P1（B4）** `heart-anatomy` が存在しません。βの目標 2 本のうち 1 本が未達です。
  ID は `release.js` と `landingHero.js` に予約済みで、ゲートを通れば
  **どちらも編集せずに**公開・hero・クロール面・カードに入ります
- **P2 F-29 素材・権利ではなく運用の blocker**: preview デプロイに
  アクセス保護がありません。ホスト側の設定であり、**設定権限が無いので
  「保護済み」とは報告しません**
- **医学レビュー**: `brain-anatomy` の臨床レビューは `pending` のままです。
  今回入れた公開判断記録は engineering acceptance であって sign-off ではなく、
  UI も「医学レビュー：未完了」と出します。これは人が必要な項目です
- **ライセンス**: `brain-atlas-glb` の判断は engineering assessment（法務レビュー
  ではない）という既存の記録のままで、変えていません

## 使用量

**計測不可。** このセッションからトークン上限・実消費を取得する手段が無く、
推測しません。計測できたのは次のビルド指標だけです。

| 指標 | 変更前 | 変更後 |
| --- | --- | --- |
| production の JS チャンク | 85 | 39 |
| dist のファイル総数 | 101 | 50 |
| code (JS + CSS) | — | 385.3 kB / 700 kB 予算 |
| 公開シーンページ | 5 | 1 |
| リンクプレビューカード | 6 | 2 |

## 次の 1 手

1. **B1（UI）** — この PR の HEAD SHA を起点に別ブランチ。`02` の範囲だけ。
   上の「触ってよい」ファイルと F-27 から。新しい Controller 契約（B2）は未固定なので、
   トップと既存 UI の改善を先行し、架空の API を前提にしたパネルを作らないこと
2. **B2（Claude）** — 選択・表示・断面・ロードの共通基盤。この PR の契約固定 SHA から積む
3. **B4（Claude）** — `heart-anatomy`。βの目標を満たす唯一の残り

## 契約固定 SHA

このファイルを含むコミットの SHA が契約固定点です。PR の HEAD をそのまま使ってください。
`main` にマージせずとも、このブランチを base にして検証できます。
