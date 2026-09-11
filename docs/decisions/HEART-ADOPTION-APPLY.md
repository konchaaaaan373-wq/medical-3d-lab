# 承認後に適用する手順 — `heart-anatomy`

**承認前に gate は開けません。** ここにあるのは、承認が出たら何をするかだけです。
**承認済みの値を仮入力してテストを緑にすることはしていません。**

このページは 2 つの判断が済んでから使います
（[`HEART-ASSET-ADOPTION.md`](HEART-ASSET-ADOPTION.md) /
[`HEART-PUBLICATION-DECISION.md`](HEART-PUBLICATION-DECISION.md)）。

---

## 先に：現状のままでは到達できません

`formatValidation` gate は **errors 0 かつ warnings 0** でしか通りません
（`assetReleaseProblems`）。候補 2 ファイルは 408 件と 33 件の
`ACCESSOR_VECTOR3_NON_UNIT` を持っています。

**つまり adopt だけでは公開に届きません。** 派生ファイル（法線再計算）を作る判断が要り、
それは**新しい hash の新しい asset**になります。下の手順はその前提で書いてあります。

---

## Step 0 — 派生ファイルを作る（offline、runtime 依存を足さない）

`docs/asset-pipeline.md` の工程に従い、**元ファイルは読むだけ**で派生を作ります。

```
入力 : VH_M_Heart.glb            sha256 b1237e7e…
       VH_M_Blood_Vasculature.glb sha256 a31ebed6…
処理 : 縮退した頂点法線のみ再計算（幾何は動かさない）
出力 : 新しい GLB 2 本 → 新しい sha256 を記録
検証 : npm run assets:validate が exit 0（errors 0 / warnings 0）
```

**確認事項**：三角形数・頂点数・境界箱・パーツ名・ontology id が入力と一致すること。
一致しなければ法線以外も動いており、それは別の判断になります。

## Step 1 — `devAssets` → `assetManifest`

`src/catalog/devAssets.js` の 2 件を消さずに、`src/catalog/assetManifest.js` へ
released な entry を足します（記録は残す）。gate が読む必須項目——

| 項目 | 値 |
| --- | --- |
| `source.name` / `url` / `revision` | HuBMAP CCF v1.2、commit `b036a91a…` |
| `license.spdx` | `CC-BY-4.0` |
| `license.redistribution` / `commercialUse` | どちらも `allowed`（**承認の根拠が要る**） |
| `license.assessment` | `engineering`（法務レビューを受けたなら `legal`） |
| `license.decisionRecord` | `HEART-ASSET-ADOPTION.md` の記入済み版を指す |
| `license.obligations[]` | `attribution` と、必要なら NLM の `acknowledgment`。**それぞれ `status: satisfied` と、実在する `satisfiedBy` が要ります** |
| `output.sha256` | **Step 0 の派生ファイルの hash** |
| `sources[].sha256` | 元ファイル 2 本の hash |
| `qa.formatValidation` | `passed` / `errors: 0` / `warnings: 0` / `assetSha256` は output と一致 |
| `qa.semanticIntegrity` / `qa.visualReview` | `passed` と、hash を結びつけた記録 |
| `qa.anatomyExpertReview` / `qa.clinicianReview` | scene が alpha の間は `pending` で通ります |
| `release.status` | `released` |

## Step 2 — attribution の実体を置く

`public/assets/heart/ATTRIBUTION.md` を作ります（脳の
`public/assets/brain/ATTRIBUTION.md` が形の見本）。

- HuBMAP・作者（Kristen Browne）・DOI・CC BY 4.0
- **派生であること**（CC BY は改変の表示を求めます）
- **NLM Visible Human の courtesy 表記**

`attributionForScene` が自動で拾います。`record` はリポジトリ上のパス、
`recordUrl` が配信 URL（`public/` はルート配信）です。

## Step 3 — model profile の参照を移す

`src/catalog/modelProfiles.js` の `heart-anatomy-reference-atlas`：
`candidateAssets` の 2 件を `assets` へ移します。

## Step 4 — シーンの読み込み先を派生へ

`HeartAnatomyScene.js` の `devAssetUrl(...)` を manifest 側の URL に変えます。
**これは pinned model source なので、カード改訂が要ります**——
`docs/model-cards/heart-anatomy.md` を実際に書き直してから
`npm run revisions:adopt`（先に adopt しない）。

## Step 5 — 公開判断記録を足す

`src/catalog/release.js` の `BETA_PUBLICATION_DECISIONS` に 1 件。
gate が検証する項目は——

```js
{
  sceneId: 'heart-anatomy',
  decidedAt: '<YYYY-MM-DD>',                  // ISO 日付
  decidedBy: { name: '<氏名>', role: '<engineering|anatomy-expert|clinical>' },
  record: 'docs/beta-publication/heart-anatomy.md',   // 実在が要る
  assetRevisions: { '<assetId>': '<output sha256>' }, // Step 0 の hash
  sceneRevision: { cardRevision: <Step 4 後>, modelDigest: '<Step 4 後>' },
  scope: { structures: [...], views: [...], interactions: [...] },  // 空不可
  evidence: ['docs/asset-qa/…', 'tests/heart-anatomy.test.js', …],  // 実在が要る
  unverified: ['…'],  // **空配列でも「無い」ことを書く。項目ごと欠かすと落ちます**
}
```

`role: 'clinical'` は、レビュー registry に現行レビューが無いと gate が拒否します
（判断が自分を sign-off に昇格させないため）。

## Step 6 — 確認

```bash
npm test
npm run revisions:check
npm run assets:validate          # exit 0
npx vite build                   # production
npm run verify:site              # publishes が 1 → 2 になる
node -e "import('./src/catalog/release.js').then(m=>console.log(m.betaPublicationProblems('heart-anatomy')))"   # [] になる
```

`verify:site` の「publishes 1」が **2** に変わったら公開状態です。
**hero・カタログ・クロール面の編集は不要**——公開一覧は `publicManifest.js` 1 本から出ます。

---

## この順序を崩せない箇所

- **Step 0 が先。** hash が決まらないと Step 1・5 の値が書けません
- **Step 4 は Step 5 より先。** 公開判断は scene revision に結びつくので、
  後からシーンを触ると判断が stale になって gate が閉じます（脳で実際に起きました）
- **`revisions:adopt` はカードを実際に書き直した後。** 先に adopt すると、
  実在しない改訂の digest を記録します（一度やって戻しました）
