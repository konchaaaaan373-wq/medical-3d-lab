# 承認後に適用する手順 — 次期 β（病態）

**承認前に gate は開けません。** ここにあるのは、レビューが返ってきたら何をするかだけです。
**仮のレビュー承認値や署名を入れてテストを通すことはしていません。**

対象は `src/catalog/release.js` の `NEXT_BETA_CANDIDATES`：
`brain-anatomy` / `amyloid-beta` / `heart-failure` / `copd-hyperinflation`。

いま各候補が返す blocker は**ちょうど 2 つ**です——

```
$ node -e "import('./src/catalog/release.js').then(m=>console.log(m.NEXT_BETA_CANDIDATE_STATUS))"
amyloid-beta        : 臨床レビューが "legacy-unversioned"／公開判断記録なし
heart-failure       : 臨床レビューが "legacy-unversioned"／公開判断記録なし
copd-hyperinflation : 臨床レビューが "stale"／公開判断記録なし
brain-anatomy       : 臨床レビューが "pending"／公開判断記録なし
```

**実装の不足は 1 件もありません。** 残っているのは記録だけです。

---

## Step 1 — 臨床レビュー registry を更新する

`docs/clinical-reviews/registry.json` の該当エントリ。**レビュアーが返した値だけを入れます。**

```json
{
  "sceneId": "amyloid-beta",
  "reviewStatus": "reviewed",
  "reviewerRole": "<レビュアーの立場>",
  "reviewedAt": "<YYYY-MM-DD>",
  "reviewedCommit": "<レビュー対象の commit SHA>",
  "scope": ["<何を見たか>"],
  "sources": ["docs/clinical-reviews/packets/amyloid-beta.md", …],
  "unresolvedLimitations": ["<レビュー後も残る限界>"]
}
```

`reviewedCommit` は**レビュー時点の commit** です。これが動くと registry が `stale` を返し、
gate が自動で閉じます——**それが仕組みで、回避しません**。

確認：

```bash
node -e "import('./src/catalog/clinicalReview.js').then(m=>console.log(m.hasCurrentClinicalReview({id:'amyloid-beta'})))"
```

## Step 2 — revision pin を確認する（変更ではなく確認）

```bash
npm run revisions:check        # 34 entries, ok
node -e "import('./src/catalog/modelRevisions.js').then(m=>console.log(m.sceneRevisionPin({id:'amyloid-beta'})))"
```

出た `cardRevision` と `modelDigest` を Step 3 に**そのまま**書きます。
**Step 3 の後にシーンを触らないでください**——触ると判断が stale になり gate が閉じます。

## Step 3 — 公開判断記録を足す

`src/catalog/release.js` の `NEXT_BETA_PUBLICATION_DECISIONS`（いま空配列）へ 1 件ずつ。

```js
{
  sceneId: 'amyloid-beta',
  decidedAt: '<YYYY-MM-DD>',
  decidedBy: { name: '<氏名>', role: 'engineering' | 'anatomy-expert' | 'clinical' },
  record: 'docs/beta-publication/amyloid-beta.md',   // 実在が要る
  assetRevisions: {},                                 // procedural なので空
  sceneRevision: { cardRevision: <Step 2>, modelDigest: '<Step 2>' },
  scope: { structures: [...], views: [...], interactions: [...] },   // 3 つとも空不可
  evidence: ['docs/clinical-reviews/packets/amyloid-beta.md', 'docs/model-cards/amyloid-beta.md'],
  unverified: ['<確認していないこと>'],   // **空配列でも項目自体は必須**
}
```

`role: 'clinical'` は Step 1 が終わっていないと gate が拒否します
（判断が自分を sign-off に昇格させられないため）。

## Step 4 — チャンネルを切り替える（これが公開そのもの）

ここまでは何も公開されません。`src/catalog/release.js`：

```js
export const RELEASE_CHANNEL = 'beta';   →   'next-beta'
```

**1 行で、1 か所です。** `RELEASE_POLICIES` に `next-beta` は登録済みなので、
この行を変えた瞬間に `NEXT_BETA_CANDIDATES` のうち gate を通ったものが公開されます。

**これは別承認です。** Step 1〜3 が済んでいても、この行は判断なしに変えません。

## Step 5 — 確認

```bash
npm test
node -e "import('./src/catalog/release.js').then(m=>console.log(m.NEXT_BETA_CANDIDATE_STATUS))"   # problems が [] に
npx vite build
npm run verify:site        # publishes が 1 → 4 になる
```

hero・カタログ・クロール面の編集は**不要**です——公開一覧は `publicManifest.js` 1 本から出ます。

---

## 順序を崩せない箇所

- **Step 1 が先。** レビューが current でないと、Step 3 の `clinical` role が拒否されます
- **Step 3 は Step 2 の値を使い、その後シーンを触らない。** 触れば判断が stale になります
- **Step 4 は最後。** 先に切り替えると、まだ判断のないシーンが候補一覧に載ったまま gate に当たります
  （fail-closed なので公開はされませんが、順序として意味がありません）

## 候補を増やすとき

`NEXT_BETA_CANDIDATES` に id を足します。**`reviewed` なら自動で入る仕組みにはしていません**——
status は誰かが公開を決めた証拠ではないからです。`myocardial-ischemia` と `asthma` は
実装が揃っているので、レビューが返れば 1 行足すだけで候補になります。
