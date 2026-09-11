# 医学レビュー packet — アミロイドβの蓄積

**このファイルは生成物です**（`node scripts/build-review-packet.mjs amyloid-beta`）。
患者向けの文・専門家向けの文・限界は、すべて製品が実際に持っている値から読んでいます——
**手で書き写していないので、画面と食い違いません。**

| | |
| --- | --- |
| scene | `amyloid-beta`（`#/amyloid-beta`） |
| status | `production` |
| model profile | `amyloid-beta-aggregation-illustration` — mechanism level **illustrative** |
| 臨床レビューの現状 | **legacy-unversioned**（historical review role not recorded under the current registry standard） |
| 患者説明 | 7 段 |
| 実画面 | `docs/screenshots/b10-amyloid/` |
| 詳細シート | [amyloid-beta-patient-7-steps.md](../amyloid-beta-patient-7-steps.md) — 段ごとの根拠はこちら |

---

## 患者向けの説明（画面に出る実文）

**区分の読み方** — `モデル出力`：この画面の数値・形はモデルが解いた結果です。
`educationalOnly`：**モデルは計算していません**。一般的な説明として出しており、
画面にもその旨が毎回出ます。

### 1. 健康な脳にもあります

> アミロイドβは、脳が日常的に作っては取り除いている小さなタンパク質の断片です。あること自体は正常です。

- **画面のどこを見るか**：小さくばらばらに散っている粒が、細胞のあいだにある分子ひとつひとつです。
- **区分**：モデル出力 ／ 確からしさ：**確立している**
- **モデルの状態**：`normal`（progress 0）
- **専門家表示の同じ段**：**正常に近い状態** — Aβ は健常な脳でも日常的に産生・排出されています。細胞外に少量の可溶性モノマーが存在するのは正常なことです。

### 2. 大事なのは差し引きです

> 作られる量が取り除かれる量を上回ると、その場所にたまっていきます。「あるかないか」だけの問題ではありません。

- **画面のどこを見るか**：同じ粒が増えています。形はまだ変わっていません。
- **区分**：モデル出力 ／ 確からしさ：**確立している**
- **モデルの状態**：`monomer`（progress 0.16）
- **専門家表示の同じ段**：**モノマーの増加** — 問題になるのは「存在すること」ではなくバランスです。産生が排出を上回ると、可溶性 Aβ が細胞外に蓄積していきます。

### 3. 一部が小さなかたまりになります

> 分子どうしが集まって小さなかたまりを作ることがあります。このかたまりは、神経細胞どうしのつなぎ目の傷みと並んで見つかることが報告されています。

- **画面のどこを見るか**：粒どうしがくっついて一緒に動くのを見てください。その小さなかたまりが、この段階の話です。
- **区分**：モデル出力 ／ 確からしさ：**関連が報告されている**
- **モデルの状態**：`oligomer`（progress 0.4）
- **専門家表示の同じ段**：**オリゴマー形成** — モノマー同士が集まり、小さな可溶性オリゴマーを形成します。生物学的に重要な分子種と考えられ、シナプス機能障害との関連が報告されています。

### 4. 一部が糸のように並びます

> かたまりの一部は、規則的に並んだ長い糸へと伸びていきます。端に付け足しながら伸びますが、すべてが糸になるわけではありません。

- **画面のどこを見るか**：細長い形が糸です。そのそばには、ばらばらの粒や小さなかたまりも残っています。
- **区分**：モデル出力 ／ 確からしさ：**確立している**
- **モデルの状態**：`fibril`（progress 0.62）
- **専門家表示の同じ段**：**線維（フィブリル）形成** — 一部の凝集体が規則的な β シート構造の線維へと伸長し、末端に Aβ を付加しながら成長します。すべてが線維になるわけではありません。

### 5. 糸が集まって、細胞の外に沈着します

> 糸が密に集まり、細胞の外に沈着してプラークを作ります。アルツハイマー病でみられる代表的な神経病理所見の一つですが、この所見だけでその人の症状が決まるわけではありません。

- **画面のどこを見るか**：細胞の外にある濃いかたまりが沈着です。前の段階のものが消えていないことにも注目してください。
- **区分**：モデル出力 ／ 確からしさ：**確立している**
- **モデルの状態**：`plaque`（progress 0.84）
- **専門家表示の同じ段**：**プラーク（老人斑）形成** — 線維が密に集まり、細胞外に老人斑（プラーク）を形成します。アルツハイマー病の神経病理学的特徴のひとつですが、この状態でもモノマーや可溶性凝集体は併存しています。

### 6. 量から、その人のことは分かりません

> 沈着が多くても記憶の問題がない人もいれば、少なくても困っている人もいます。この画面は、誰かの状態を測ったものではありません。

- **画面のどこを見るか**：この段階で新しく描かれるものはありません。この絵から分からないことについての説明です。
- **区分**：**educationalOnly（モデル出力ではありません）** ／ 確からしさ：**分かっていない**
- **モデルの状態**：`plaque`（progress 0.84）
- **専門家表示の同じ段**：**プラーク（老人斑）形成** — 線維が密に集まり、細胞外に老人斑（プラーク）を形成します。アルツハイマー病の神経病理学的特徴のひとつですが、この状態でもモノマーや可溶性凝集体は併存しています。

### 7. 症状につながる道筋は、まだすべて分かっていません

> アミロイドβの蓄積は、アルツハイマー病でみられる重要な脳の変化の一つです。ただし、この蓄積だけで一人ひとりの症状の強さや時期が決まるわけではなく、症状につながる道筋には、まだ分かっていない部分があります。

- **画面のどこを見るか**：この画面が示すのは形の移り変わりだけです。誰かが不調になった理由を示すものではありません。
- **区分**：**educationalOnly（モデル出力ではありません）** ／ 確からしさ：**分かっていない**
- **モデルの状態**：`plaque`（progress 0.84）
- **専門家表示の同じ段**：**プラーク（老人斑）形成** — 線維が密に集まり、細胞外に老人斑（プラーク）を形成します。アルツハイマー病の神経病理学的特徴のひとつですが、この状態でもモノマーや可溶性凝集体は併存しています。

---

## このモデルが自分で宣言している限界

- No versioned clinical attestation exists under the current review standard.
- The progression axis is a conceptual aggregation state, not clinical stage, symptom severity, or elapsed disease time.
- Aβ40 and Aβ42, tau pathology, neuroinflammation, APP processing, ApoE and patient-level cognition are outside the model.
- Particle counts, molecular scale and aggregation thresholds are illustrative rather than measured quantities.
- Individual rendered particles move only forward on the teaching slider even though real Aβ assemblies can interconvert and disassemble.

**禁止用途**（model profile）：diagnosis / treatment-selection / dose-selection / prognosis

## 既存の根拠

- [`docs/model-cards/amyloid-beta.md`](../../docs/model-cards/amyloid-beta.md)
- [`docs/model-evidence/amyloid-beta.md`](../../docs/model-evidence/amyloid-beta.md)
- model profile `amyloid-beta-aggregation-illustration` — `src/catalog/modelProfiles.js`
- 患者向けの文：`src/data/patientGuides.js`

---

## 確認していただきたいこと

1. **患者向けの各段の文が、医学的に誤っていないか。** 言い過ぎ・言い足りないところ
2. **専門家表示と患者表示が、同じ状態の説明になっているか**（上の各段で並べています）
3. **`educationalOnly` の段が、モデルの計算結果と誤解されないか**
4. **確からしさの区分**が妥当か（確立している／関連が報告されている／仮説／分かっていない）
5. **上の「限界」の一覧に、足すべきものがあるか**
6. **一般公開して差し支えないか**（患者・家族が医療者の同席なしに見ます）

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
