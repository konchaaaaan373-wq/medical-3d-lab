# 医学レビュー packet — 細くなった血管は、どの筋肉を飢えさせるか

**このファイルは生成物です**（`node scripts/build-review-packet.mjs myocardial-ischemia`）。
患者向けの文・専門家向けの文・限界は、すべて製品が実際に持っている値から読んでいます——
**手で書き写していないので、画面と食い違いません。**

| | |
| --- | --- |
| scene | `myocardial-ischemia`（`#/myocardial-ischemia`） |
| status | `alpha` |
| model profile | `myocardial-ischemia-supply-demand` — mechanism level **mechanistic** |
| 臨床レビューの現状 | **pending**（no completed clinical sign-off recorded） |
| 患者説明 | 6 段 |
| 患者説明のタイトル | 「細くなった血管が、心臓の一部を動かなくする仕組み」 |
| 実画面 | `docs/screenshots/b10-ischemia/` |
| 詳細シート | [myocardial-ischemia-patient-6-steps.md](../myocardial-ischemia-patient-6-steps.md) — 段ごとの根拠はこちら |

---

## 患者向けの説明（画面に出る実文）

**区分の読み方** — `モデル出力`：この画面の数値・形はモデルが解いた結果です。
`educationalOnly`：**モデルは計算していません**。一般的な説明として出しており、
画面にもその旨が毎回出ます。

### 1. 血管はそれぞれ、担当する場所を養う

> 心臓の表面を走る血管は、それぞれ決まった場所の筋肉へ血液を運びます。安静時はどの場所も、使う量より多くの酸素を受け取っています。

- **画面のどこを見るか**：心臓の前面を下る血管を目で追い、その下の筋肉を見てください。そこがその血管の担当する場所です。
- **区分**：モデル出力
- **モデルの状態**：`baseline`（progress 0） ／ 注目 `lad`
- **専門家表示の同じ段**：**undefined** — （要約なし）

### 2. そこを通る血流が減る

> その血管が細くなると、先の場所へ届く血液が減ります。しばらく画面は変わりません——足りていないぶんが積み重なるまで、現れないからです。

- **画面のどこを見るか**：筋肉ではなく血管を見てください。いま変わったのは、そこを通る量です。
- **区分**：モデル出力
- **モデルの状態**：`onset`（progress 0.22） ／ 注目 `lad`
- **専門家表示の同じ段**：**undefined** — （要約なし）

### 3. 養われている筋肉に現れる

> 不足が積み重なり、その血管が養う場所の色が変わります。隣の、別の血管が養う筋肉は変わりません。色は「酸素が足りない」という意味で、壊死ではありません。

- **画面のどこを見るか**：二つの場所を見比べてください。その境目が、担当する血管の切り替わるところです。
- **区分**：モデル出力
- **モデルの状態**：`burden`（progress 0.45） ／ 視点 `wall` ／ 注目 `anterior-wall`, `inferior-wall`
- **専門家表示の同じ段**：**undefined** — （要約なし）

### 4. その場所が縮まなくなる

> 酸素の足りない筋肉は、縮む力が落ちます。他の部分は働き続けるので、心臓全体としては 1 回に送り出す量が減ります。

- **画面のどこを見るか**：その場所と隣の筋肉の動きを見比べてください。片方は縮み、もう片方はほとんど動きません。
- **区分**：モデル出力
- **モデルの状態**：`burden`（progress 0.45） ／ 視点 `wall` ／ 注目 `anterior-wall`
- **専門家表示の同じ段**：**undefined** — （要約なし）

### 5. 血流が戻っても、動きはすぐ戻らない

> 血管が開けば血液はほぼすぐに戻ります。筋肉は戻りません——また十分に養われるようになっても、しばらく動きは悪いままです。

- **画面のどこを見るか**：まず色が戻ります。そのあとも動きを見ていてください。遅れているのはそちらです。
- **区分**：モデル出力
- **モデルの状態**：`reperfusion`（progress 0.8） ／ 視点 `wall` ／ 注目 `anterior-wall`
- **専門家表示の同じ段**：**undefined** — （要約なし）

### 6. 胸に感じられることがある理由

> 酸素が足りないまま働いている筋肉は、感覚として現れることがあります。胸の圧迫感や締めつけとして、腕・あご・背中に広がることもあり、体を動かしたときに出やすいことが知られています。

- **画面のどこを見るか**：この段階で新しく描かれるものはありません。画面の不足が、人にとってどういうことかの説明です。
- **区分**：**educationalOnly（モデル出力ではありません）**
- **モデルの状態**：`reperfusion`（progress 0.8） ／ 視点 `wall` ／ 注目 `anterior-wall`
- **専門家表示の同じ段**：**undefined** — （要約なし）

---

## このモデルが自分で宣言している限界

- Independent medical review of the ischemia calibration and of the teaching text is not recorded.
- The coronary territory map is the AHA fixed assignment, which measurement disagrees with in places — segment 3 is charted to the right coronary and measures as anterior-descending territory, and five further segments overlap two arteries between people.
- One right-dominant specimen. Left-dominant and balanced circulations are not modelled.
- Supply is a scale factor on a territory and not a stenosis: there is no flow calculation and no relationship here between a lumen and a flow reserve.
- The time axis is normalized episode progress and not minutes. No claim is made about how long ischemia takes to develop or to recover.
- Reversible ischemia only. No infarction, necrosis, scar or infarct expansion; no ECG, chest pain, troponin or prognosis.
- The scene must not be used to assess a person's coronary anatomy, to judge whether someone is having a heart attack, or to infer treatment.

**禁止用途**（model profile）：diagnosis / treatment-selection / dose-selection / prognosis / procedure-planning

## 既存の根拠

- [`docs/model-cards/myocardial-ischemia.md`](../../model-cards/myocardial-ischemia.md)
- [`docs/model-evidence/myocardial-ischemia.md`](../../model-evidence/myocardial-ischemia.md)
- model profile `myocardial-ischemia-supply-demand` — `src/catalog/modelProfiles.js`
- 患者向けの文：`src/data/patientGuides.js`

---

## 確認していただきたいこと

1. **患者向けの各段の文が、医学的に誤っていないか。** 言い過ぎ・言い足りないところ
2. **専門家表示と患者表示が、同じ状態の説明になっているか**（上の各段で並べています）
3. **`educationalOnly` の段が、モデルの計算結果と誤解されないか**
4. **上の「限界」の一覧に、足すべきものがあるか**
5. **一般公開して差し支えないか**（患者・家族が医療者の同席なしに見ます）

---

## 判断欄

| | |
| --- | --- |
| レビュアー（氏名） | |
| role | |
| 日付（YYYY-MM-DD） | |

- [ ] **approve** — この内容で公開してよい
- [ ] **revise** — 直すべき段と内容：
- [ ] **hold** — 追加で要るもの：

承認後の反映手順は [`NEXT-BETA-APPLY.md`](../../decisions/NEXT-BETA-APPLY.md) にあります。
**このファイルに承認を書き込んでも、それだけでは何も公開されません**——
registry と公開判断記録を更新して初めて gate が動きます。
