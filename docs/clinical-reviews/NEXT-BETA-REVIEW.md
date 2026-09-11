# 次期 β — 医学レビューの入口

**ここは目次です。実文は packet 側にあります**（写していません）。
上から順に開いて判断していただければ、それで公開準備は終わります。

最初に出す単位は **`brain-anatomy` ＋ 1〜2** です。**4 件そろうのを待ちません**——
amyloid-beta と heart-failure が承認された時点で、その 2 つだけで次期 β が成立します。

いまの状態は 1 コマンドで見られます：`npm run verify:next-beta`

---

## 1. アミロイドβ（アルツハイマー病） — 最優先

[packet を開く →](packets/amyloid-beta.md)

| | |
| --- | --- |
| 段数 | **7 段**（確からしさの区分つき） |
| いまの状態 | 臨床レビュー `legacy-unversioned` — **現行基準で取り直しが必要** |
| 特記 | 確定した因果がない主題です。`established` / `associated` / `hypothesised` / `uncertain` を段ごとに出しており、**そこが最重要の確認点**です |

- [ ] approve　- [ ] revise　- [ ] hold

## 2. 心不全 — 最優先

[packet を開く →](packets/heart-failure.md)

| | |
| --- | --- |
| 段数 | **6 段** |
| いまの状態 | 臨床レビュー `legacy-unversioned` — 現行基準で取り直しが必要 |
| 特記 | reference implementation。心臓 → 肺 → 症状まで 1 つのモデルで説明します |

- [ ] approve　- [ ] revise　- [ ] hold

## 3. COPD — 次

[packet を開く →](packets/copd.md)

| | |
| --- | --- |
| 段数 | **8 段** |
| いまの状態 | 臨床レビュー **`stale`** — 再レビュー待ち（実装は完了しています） |
| 特記 | モデル出力・教育的な表示への写像・患者説明の**3 層を分けた表**が packet にあります |

- [ ] approve　- [ ] revise　- [ ] hold

## 4. 心筋虚血 — その次

[packet を開く →](packets/myocardial-ischemia.md)

| | |
| --- | --- |
| 段数 | **6 段** |
| いまの状態 | 臨床レビュー `pending` — 未実施 |
| 特記 | **虚血の色が「壊死・梗塞」と誤認されないか**が最重要の確認点です |

- [ ] approve　- [ ] revise　- [ ] hold

---

## 承認のあとに起きること

`docs/decisions/NEXT-BETA-APPLY.md` の 5 手順だけです——
registry 更新 → revision pin 確認 → 公開判断記録 → channel 切替（別承認）→ 確認。
**追加の実装はありません。**

**このページに ✓ を入れても、それだけでは何も公開されません。** registry と
公開判断記録が揃って初めて gate が開きます。承認の代筆はしていません。
