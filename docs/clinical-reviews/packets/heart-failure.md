# 医学レビュー packet — 心不全

**このファイルは生成物です**（`node scripts/build-review-packet.mjs heart-failure`）。
患者向けの文・専門家向けの文・限界は、すべて製品が実際に持っている値から読んでいます——
**手で書き写していないので、画面と食い違いません。**

| | |
| --- | --- |
| scene | `heart-failure`（`#/heart-failure`） |
| status | `production` |
| model profile | `heart-failure-elastance-loop` — mechanism level **mechanistic** |
| 臨床レビューの現状 | **legacy-unversioned**（historical review role not recorded under the current registry standard） |
| 患者説明 | 6 段 |
| 実画面 | `docs/screenshots/b8-patient/` |
| 詳細シート | [heart-failure-patient-6-steps.md](../heart-failure-patient-6-steps.md) — 段ごとの根拠はこちら |

---

## 患者向けの説明（画面に出る実文）

**区分の読み方** — `モデル出力`：この画面の数値・形はモデルが解いた結果です。
`educationalOnly`：**モデルは計算していません**。一般的な説明として出しており、
画面にもその旨が毎回出ます。

### 1. 正常なポンプ

> 心臓は血液を受け取り、1 回ごとの拍動で前へ送り出します。ここで示すのは、心室が広がって収縮する力が弱くなる心不全（HFrEF）の一例です。心不全のすべての型を表すものではありません。

- **画面のどこを見るか**：中央の部屋を見てください。血液がたまると広がり、送り出すと縮みます。
- **区分**：モデル出力
- **モデルの状態**：`normal`（progress 0）
- **専門家表示の同じ段**：**正常な左室** — 左室は拡張期に血液で満たされ、収縮期にその半分強を駆出します。壁の厚さと内腔の大きさのバランスが保たれています。

### 2. 壁が厚くなる

> 高い圧の負担が長く続く病態では、心筋が厚くなることがあります。中の広さはあまり変わりません。すべての心不全がここから始まるわけではありません。

- **画面のどこを見るか**：部屋の中ではなく、そのまわりの筋肉を見てください。ここで変わっているのは壁の厚さです。
- **区分**：モデル出力
- **モデルの状態**：`concentric-hypertrophy`（progress 0.18）
- **専門家表示の同じ段**：**求心性肥大** — 持続する圧負荷に対して壁が厚くなり、心筋量が増加します。内腔は拡大しないため、相対的壁厚（RWT）が上昇します。

### 3. 部屋が広がる

> このモデルで示す経過では、心室が広がって丸みを帯び、その大きさに対して壁が相対的に薄くなっていきます。厚くなった心臓が必ずこうなるわけではありません。

- **画面のどこを見るか**：部屋の輪郭を見てください。最初より広く、丸くなっています。
- **区分**：モデル出力
- **モデルの状態**：`dilation`（progress 0.42）
- **専門家表示の同じ段**：**左室の拡大（遠心性）** — この経過では次に内腔が拡大し、細長い形から丸みを帯びた形へ変わります。大きくなった心腔に対して壁は相対的に薄くなります。

### 4. 1 回に送り出せる割合が減る

> 心室が広がり、収縮する力が弱くなった状態では、中に入った血液のうち送り出せる割合が減り、収縮後にもより多くの血液が残ります。

- **画面のどこを見るか**：縮み終わったときに中に残っているものを見てください。それが送り出せなかった血液です。
- **区分**：モデル出力
- **モデルの状態**：`systolic-dysfunction`（progress 0.64）
- **専門家表示の同じ段**：**収縮機能の低下（HFrEF）** — 駆出率が低下し、心室は完全には空になりません。安静時の心拍出量はしばらく正常近くに保たれることがあります。並行して充満圧が上昇しますが、肺うっ血は「次の構造的ステージ」ではなく、独立した血行動態のオーバーレイとして描いています。

### 5. 圧は肺のほうへ伝わる

> 左心室を満たすのに要る圧が上がると、その圧は左心房を通じて、肺から心臓へ血液が戻ってくる側の血管へ伝わります。

- **画面のどこを見るか**：心臓の上、肺から戻ってくる側の血管のまわりを見てください。にじむように広がっているのが、圧が届いている範囲です。
- **区分**：モデル出力
- **モデルの状態**：`systolic-dysfunction`（progress 0.64） ／ 視点 `pulmonary` ／ 注目 `pressure`, `pulmonary-bed`
- **専門家表示の同じ段**：**収縮機能の低下（HFrEF）** — 駆出率が低下し、心室は完全には空になりません。安静時の心拍出量はしばらく正常近くに保たれることがあります。並行して充満圧が上昇しますが、肺うっ血は「次の構造的ステージ」ではなく、独立した血行動態のオーバーレイとして描いています。

### 6. 息が苦しく感じられる理由

> 肺の細い血管の圧が高くなると、肺の間質へ水分が移りやすくなります。肺が広がりにくくなり、息苦しさにつながることがあります。横になったときに強く感じられることもあります。

- **画面のどこを見るか**：この段階で新しく描かれるものはありません。画面に出ている広がりが、人にとってどういうことかの説明です。
- **区分**：**educationalOnly（モデル出力ではありません）**
- **モデルの状態**：`systolic-dysfunction`（progress 0.64） ／ 視点 `pulmonary` ／ 注目 `pressure`, `pulmonary-bed`
- **専門家表示の同じ段**：**収縮機能の低下（HFrEF）** — 駆出率が低下し、心室は完全には空になりません。安静時の心拍出量はしばらく正常近くに保たれることがあります。並行して充満圧が上昇しますが、肺うっ血は「次の構造的ステージ」ではなく、独立した血行動態のオーバーレイとして描いています。

---

## このモデルが自分で宣言している限界

- No versioned clinical attestation exists under the current review standard.
- The scene represents one illustrative HFrEF remodelling pattern and is not a universal natural history of heart failure.
- HFpEF, valvular disease, right-heart failure, pulmonary hypertension, neurohumoral regulation and distributed vascular wave mechanics are outside the model.
- The valves are ideal one-way resistances and several pressure-volume parameters are calibrated educational values rather than patient measurements.
- The visible congestion map is a teaching transform of solved pressure rather than a lung-water model or individual oedema threshold.

**禁止用途**（model profile）：diagnosis / treatment-selection / dose-selection / prognosis

## 既存の根拠

- [`docs/model-cards/heart-failure.md`](../../docs/model-cards/heart-failure.md)
- [`docs/model-evidence/heart-failure.md`](../../docs/model-evidence/heart-failure.md)
- model profile `heart-failure-elastance-loop` — `src/catalog/modelProfiles.js`
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
