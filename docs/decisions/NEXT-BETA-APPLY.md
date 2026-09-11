# 承認後に適用する手順 — 次期 β（病態）

**承認前に gate は開けません。** ここにあるのは、レビューが返ってきたら何をするかだけです。
**仮のレビュー承認値や署名を入れてテストを通すことはしていません。**

## 次期 β は現行 β の**上位集合**です

`brain-anatomy` は**再承認しません**。現行 β の gate と公開判断をそのまま継承します——
channel を切り替えても**いま公開しているものは消えません**。
`heart-anatomy` も、現行 β の asset / publication gate を通れば自動的に継承されます。

新しい判断が要るのは病態だけです（`NEXT_BETA_DISEASE_CANDIDATES`）：
`amyloid-beta` / `heart-failure` / `copd-hyperinflation` / `myocardial-ischemia`。

```
$ npm run verify:next-beta
  brain-anatomy        READY   (inherited from the current beta — not re-decided)
  amyloid-beta         BLOCKED: clinical review (legacy-unversioned), publication decision
                         review ❌  decision ❌  revision pin ✅
  heart-failure        BLOCKED: clinical review (legacy-unversioned), publication decision
                         review ❌  decision ❌  revision pin ✅
  copd-hyperinflation  BLOCKED: stale clinical review, publication decision
                         review ❌  decision ❌  revision pin ✅
  myocardial-ischemia  BLOCKED: clinical review (pending), publication decision
                         review ❌  decision ❌  revision pin ✅
```

**実装の不足は 1 件もありません。** 残っているのは記録だけで、
どの scene に何が足りないかはこの 1 行（`review / decision / revision pin`）で読めます。

**候補は 1 件ずつ開きます。** amyloid-beta と heart-failure が承認されれば、
COPD の再レビューや心筋虚血の初回レビューを待たずに、その 2 つで次期 β を成立させられます。
未承認の候補は閉じたままです。

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
npm run revisions:check                  # ok
npm run verify:next-beta -- --pins       # 4 候補ぶんの pin をまとめて出す
```

`--pins` は、Step 1 の `reviewedCommit`（いまの HEAD）と Step 3 の `sceneRevision` /
`assetRevisions` / `evidence` を、**製品から読んだ値のまま**並べて出します。
**手で書き写さないでください**——digest を 1 文字打ち間違えると、
存在しないシーンに判断を固定したことになり、gate は静かに閉じたままになります。

`--pins` が出さないのは、レビュアーの氏名・立場・日付・可否です。
**スクリプトはそれを知らないので、作りません。**

**Step 3 の後にシーンを触らないでください**——触ると判断が stale になり gate が閉じます。

## Step 3 — 公開判断記録を足す

`src/catalog/release.js` の `NEXT_BETA_PUBLICATION_DECISIONS`（いま空配列）へ 1 件ずつ。
**継承される scene（brain-anatomy）はここに書きません**——既存の判断を持っています。

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

`record` の文書そのものは**先に用意していません。** gate はそのファイルの存在しか見ないので、
空のテンプレートを置けば「記録がある」という条件だけが先に満たされてしまうからです。
書き方は [`docs/beta-publication/brain-anatomy.md`](../beta-publication/brain-anatomy.md) が前例です——
何を確認したか、**何を確認していないか**、どの版に対する判断かが書いてあります。

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
npm run verify:site        # publishes が 1 → 承認した数だけ増える
```

hero・カタログ・クロール面の編集は**不要**です——公開一覧は `publicManifest.js` 1 本から出ます。

---

## 順序を崩せない箇所

- **Step 1 が先。** レビューが current でないと、Step 3 の `clinical` role が拒否されます
- **Step 3 は Step 2 の値を使い、その後シーンを触らない。** 触れば判断が stale になります
- **Step 4 は最後。** 先に切り替えると、まだ判断のないシーンが候補一覧に載ったまま gate に当たります
  （fail-closed なので公開はされませんが、順序として意味がありません）

## 候補を増やすとき

`NEXT_BETA_DISEASE_CANDIDATES` に id を足します。**`reviewed` なら自動で入る仕組みにはしていません**——
status は誰かが公開を決めた証拠ではないからです。`myocardial-ischemia` と `asthma` は
実装が揃っているので、レビューが返れば 1 行足すだけで候補になります。
