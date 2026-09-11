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

**この 1 件だけが「承認待ち」です。** ただし承認だけでは足りません——
`formatValidation` gate は errors 0・warnings 0 でしか通らず、候補 2 本は 408 件と 33 件の
縮退頂点法線を持ちます。**法線を再計算した派生ファイル（新 hash）を作る判断**が要ります。

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

## D. 開発中

残り 41 シーン（alpha 26・prototype 14・reviewed 1）。preview では全部動きます
（`npm run dev` は無条件、build は `?preview=1`）。
Claude② が正常臓器を、Claude③ が病態を増やし続けている先です。

---

## 公開までの距離（近い順）

**「作りたい順」ではなく、blocker の数と重さで並べています。**

| | scene | 残っているもの | 重さ |
| --- | --- | --- | --- |
| 1 | **`amyloid-beta`** | policy 判断＋レビューを現行基準で取り直す。**外部 asset なし・certainty 表示済み・7 段完成** | 軽 |
| 2 | **`heart-failure`** | policy 判断＋レビューを現行基準で。reference implementation で最も作り込まれている | 軽 |
| 3 | **`copd`** | policy 判断＋**再レビュー**（`stale`）。8 段・frame/focus 完備 | 中 |
| 4 | **`asthma`** | policy 判断＋再レビュー。375 のみ確認済み、844 未確認 | 中 |
| 5 | **`myocardial-ischemia`** | policy 判断＋**レビュー未実施**（`pending`）。色の誤認可否が未判断 | 中 |
| 6 | **`heart-anatomy`** | **承認 2 件＋派生ファイル作成**。外部 asset・ライセンス・NLM 条件・validator 失敗 | **重** |

**いちばん近いのは心臓の解剖ではありません。** 心臓解剖は外部 asset を抱えており、
法務・派生ファイル・2 種類の承認が要ります。一方 1〜5 は procedural で、
**必要なのは release policy の判断と医学レビューだけ**です。

policy を「解剖のみ」から「解剖＋レビュー済み病態」へ広げる判断が下りれば、
**`amyloid-beta` と `heart-failure` は実装作業なしで公開へ進めます。**

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
