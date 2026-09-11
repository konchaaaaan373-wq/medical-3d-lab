# β 候補 matrix

現状 1 枚です。**同じ情報を他の handoff へ写さないでください。**
値は実装から取っています（`SCENE_MANIFEST.status` / `PATIENT_GUIDES` /
`attributionForScene` / `betaPublicationProblems` / `clinical-reviews/registry.json`）。

**3 つを混同しないための表です** ——「現 β で公開」「次期 β 候補」「開発中」。
`production` 公開は **`brain-anatomy` の 1 件のみ**で、この表はそれを変えていません。

---

## A. 現 β で公開しているもの

| scene | 状態 | asset | 残り |
| --- | --- | --- | --- |
| 脳の解剖 `brain-anatomy` | **公開中** | released（CC BY-SA 4.0、attribution 実体あり） | 解剖・臨床レビューは `pending` のまま公開している（既定の判断） |

## B. 現 β の公開候補 — 判断待ちはここだけ

| scene | 解剖 | 病態 | 患者説明 | 実機確認 | asset / license | blocker |
| --- | --- | --- | --- | --- | --- | --- |
| 心臓の解剖 `heart-anatomy` | ✅ 14 構造＋血管 37 | — | — | 1280 / 844 | **候補 2 本・未採用** | ①asset が release gate 未通過 ②公開判断記録なし — **どちらも承認**（→ `docs/decisions/`） |

**この 1 件だけが現 β の「承認待ち」です。** 技術とライセンスは**どちらも解決済み**——
派生ファイルで **0 errors / 0 warnings**（見た目・部位数とも不変）、
2 ファイルの CC BY 4.0 provenance は上流 record で個別に確認、NLM の license 申請は不要。
残るのは **asset 採用判断・解剖レビュー・公開判断記録の 3 つ、すべて判断**です
（[`HEART-ASSET-ADOPTION.md`](decisions/HEART-ASSET-ADOPTION.md)）。

## C. 次期 β 候補 — 技術的には統合済み

Deep Research 後の製品戦略では、Medical 3D Lab の差別化は**病態＋professional/patient**にあります。
下の 5 件は**実装が揃っており、現 release policy（anatomy-only）の対象外であるだけ**です。
**「失敗している」のではありません。**

| scene | model profile | patient guide | pro/patient 往復 | 解剖への行き先 | mobile | 臨床レビュー | blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 心不全 `heart-failure` | ✅ mechanistic | ✅ 6 段 | ✅ | ✅ 解剖・虚血 | 1280 / 844 | ⚠️ `legacy-unversioned` | **現 policy 対象外**＋レビューを現行基準で取り直す |
| 心筋虚血 `myocardial-ischemia` | ✅ mechanistic | ✅ 6 段 | ✅ | ✅ 解剖・心不全 | 1280 / 375 / 844 | ❌ `pending` | **現 policy 対象外**＋レビュー未実施 |
| アミロイドβ `amyloid-beta` | ✅ illustrative | ✅ 7 段（certainty 付） | ✅ | ✅ 脳解剖（別スケール明示） | 1280 / 375 / 844 | ⚠️ `legacy-unversioned` | **現 policy 対象外**＋レビューを現行基準で |
| COPD `copd` | ✅ mechanistic | ✅ 8 段 | ✅ | ✅ 肺解剖 | 1280 / 375 / 844 | ⚠️ **`stale`（再レビュー必要）** | **現 policy 対象外**＋再レビュー |
| 喘息 `asthma` | ✅ mechanistic | ✅ 8 段 | ✅ | ✅ 肺解剖・COPD | 1280 / 375 | ⚠️ **`stale`** | **現 policy 対象外**＋再レビュー |

**5 件とも asset は procedural**です——外部 asset のライセンス問題も、adoption 判断も、
attribution 義務も**ありません**。心臓解剖を止めているものが、この 5 件には存在しません。

**次期 β の release policy は実装済みです**（`src/catalog/release.js` の
`nextBetaPublicationProblems`、channel `next-beta`）。明示的 allowlist で、
「`reviewed` なら自動公開」にはしていません。**現在 `RELEASE_CHANNEL` は `beta` のままで、
登録しただけでは何も公開されません。** 適用手順は
[`NEXT-BETA-APPLY.md`](decisions/NEXT-BETA-APPLY.md)。

## D. 開発中

残り 41 シーン（alpha 26・prototype 14・reviewed 1）。preview では全部動きます
（`npm run dev` は無条件、build は `?preview=1`）。
Claude② が正常臓器を、Claude③ が病態を増やし続けている先です。

---

## 公開までの距離

**blocker の種類を混ぜていません。** 4 つは性質が違い、必要な人も時間も違います。

- **実装不足** — Claude① / ② / ③ が書けば終わるもの
- **review 待ち** — 医学レビュアーの判断
- **policy 対象外** — release policy の判断（近藤さん）
- **asset / legal 待ち** — 外部データ・法務

### Published

| scene | |
| --- | --- |
| `brain-anatomy` | 現 β で公開中。臨床レビューは `pending` のまま公開しています（既定の判断） |

### Next release candidates

| # | scene | 実装不足 | review 待ち | policy | asset / legal | 距離 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **`amyloid-beta`** | なし | ⚠️ `legacy-unversioned` → 現行基準で取り直す | 次期 β へ切替 | なし | **最短** |
| 2 | **`heart-failure`** | なし | ⚠️ `legacy-unversioned` → 同上 | 次期 β へ切替 | なし | **最短** |
| 3 | **`copd`** | なし | ⚠️ **`stale`** → 再レビュー | 次期 β へ切替 | なし | 短 |
| 4 | **`myocardial-ischemia`** | なし | ❌ `pending`（未実施）＋**色の誤認可否**が未判断 | 候補に登録済み | なし | 中 |
| 5 | **`heart-anatomy`** | **派生 asset の採用作業**（技術は解決済み） | 解剖レビュー未実施 | 現 β の候補 | ✅ 解決（CC BY 4.0 確認済み・NLM 申請不要） | 中〜長 |

**1〜3 に実装作業はありません。** `NEXT_BETA_CANDIDATE_STATUS` が返す blocker は各 2 件
（臨床レビューと公開判断記録）だけで、どちらも記録です。

**4 も候補一覧に登録済みです**（`NEXT_BETA_CANDIDATES`）。5 件とも fail-closed のままで、
レビューと公開判断記録が揃った順に開きます。`asthma` は実装は同等ですが未登録——
レビューが返れば 1 行で候補になります。

**いま何が止めているかは、いつでも 1 コマンドで見られます**：

```
$ npm run verify:next-beta
brain-anatomy        BLOCKED: clinical review (pending), publication decision
amyloid-beta         BLOCKED: clinical review (legacy-unversioned), publication decision
heart-failure        BLOCKED: clinical review (legacy-unversioned), publication decision
copd-hyperinflation  BLOCKED: stale review, publication decision
myocardial-ischemia  BLOCKED: clinical review (pending), publication decision
```

**registry も判断記録も書き換えません**——読むだけです。

**5 だけが性質の違う待ちです。** 外部データ・ライセンス・法務が絡み、
これらは Medical 3D Lab の中では解決できません。

### 順位が動いた理由

`heart-anatomy` は 2 段階で縮みました。validator は派生 asset で解決し、
**ライセンスも解決しました**——2 ファイルそれぞれの上流 record を確認し、どちらも CC BY 4.0、
NLM の license 申請は 2019 年以降不要です。最長ではなくなり、残るのは判断 3 件です。

**それでも 1〜3 が先です。** あちらは procedural で外部データを含まず、
必要なのはレビューと記録だけ——心臓は加えて **asset 採用判断と解剖レビュー**が要ります。

---

## 各 agent へ返すもの

**Work — 行き先が 2 つの surface から出ています。** 同じルートを、タイトルカードの
pairing（`TitleCard.js` + `entry.relatedScenes`）と行き先パネル
（`RelatedScenesPanel` + `meta.related`）の両方が出しています。

| | 件数 | scene |
| --- | --- | --- |
| 両方が宣言 | 3 | `lung-anatomy` `liver-anatomy` `kidney-anatomy` |
| pairing のみ | 9 | `copd` `portal-hypertension` `renal-filtration` ほか |
| パネルのみ | 1 | `brain-anatomy` |

**どちらを正本にするかは外枠 UI の判断**なので Claude① では消していません。
パネル側は「別のモデルです」の一文と scale 種別を運びます——統合するなら**その一文を落とさない側**を。

**Work — F-81（横 clip 検出）。** 844×390 で `.related-scenes` が 2px に潰れ、
32px の toggle が clip されて console の下に描かれ、誰も押せませんでした（`flex: none` で解決）。
`npm test` も `verify:ui` も `verify:anatomy` も**前後どちらも緑**です。
再現条件は [`b8-handoff.md`](b8-handoff.md)。

**Claude② / Claude③ へ返す重大問題はありません。** 今回の追加取り込み（膝・肩・股関節）も
衝突は `revisions.json` の 1 件のみでした。
