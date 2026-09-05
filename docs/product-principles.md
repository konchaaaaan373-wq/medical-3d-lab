# Product principles

> **Make invisible mechanisms of health and disease visible, interactive, and understandable.**

このプロジェクトの設計判断の基準となる文書です。新しいテーマ・新しい機能・
新しい表現を追加するかどうかは、最終的にここに書かれた原則で決めます。

長い解説ではなく、**開発中に開いて判断に使う**ことを想定しています。
医学表現そのものの方針は [`medical-notes.md`](medical-notes.md)、
実装手順は [`adding-a-scene.md`](adding-a-scene.md)、
層の依存関係は [`architecture/product-architecture.md`](architecture/product-architecture.md)。

## Decision checklist

何かを追加・変更する前に、この 6 問。1 つでも詰まったら本文へ。

| # | 問い | 詳細 |
| --- | --- | --- |
| 1 | 2D の静止画より理解が明確に改善するか？ | [§2](#2-why-3d--3d-は目的ではなく手段) |
| 2 | どの層（SNS / Interactive / Educational）の価値を上げるのか？ | [§3](#3-three-layer-model) |
| 3 | 絵・数値・グラフは同じ 1 つの state から出ているか？ | [§4](#4-single-source-of-truth) |
| 4 | 見やすくするために臨床パラメータを動かしていないか？ | [§5](#5-clinical-variables-と-visualization-variables-を分ける) |
| 5 | モデル以上の主張をしていないか？ 単純化を明示したか？ | [§7](#7-medical-accuracy-philosophy) |
| 6 | 中心にある「問い」を 1 文で言えるか？ | [§8](#8-content-selection--何を作るか) |

---

## 1. Mission

**Make invisible mechanisms of health and disease visible, interactive, and understandable.**

ここでの physiology は広く読みます。圧・流量・容積のような生理学だけでなく、
リモデリングのような形態変化、Aβ 凝集のような分子・病理過程も含みます。
共通しているのは「**見えない**」「**時間とともに動く**」という 2 点です。

日本語で言えば:

> 見えない病態生理を、3D で動かし、触って理解する。

### medical-3d-lab ではないもの

| ❌ | なぜ違うか |
| --- | --- |
| 臓器の 3D モデルを作るプロジェクト | モデルは手段。回せる心臓は既存の anatomy viewer にある |
| 医学的にリアルな CG を作るプロジェクト | リアルさ自体は目的ではない。理解が改善しなければ意味がない |
| 3D モデルのコレクション | 数は指標にしない（→ §9） |

英語表現として `Interactive 3D models for understanding dynamic physiology and
disease` も検討しましたが、**「モデルの集合」に読める**ため採用していません。
中核はモデルではなく、モデルを触って理解する体験のほうです。

---

## 2. Why 3D — 3D は目的ではなく手段

3D・アニメーション・操作性を使うのは、それが理解を改善するときだけです。

**採用判断のたった 1 つの基準:**

> 3D・アニメーション・操作によって、**2D の静止画より理解が明確に改善するか？**

改善しないテーマは、このプロジェクトで扱う必要がありません。表や模式図で
十分理解できるものを無理に 3D 化しないでください。

### 3D が効くのはこういう概念

- 時間とともに変化する
- 空間的な関係が理解の鍵になる
- 圧・流量・容積・形態など**複数の変数が連動する**
- 静止画では因果関係が追えない
- 正常と病態を**並べて比較する**と理解が大きく改善する
- **ユーザー自身がパラメータを動かす**ことで理解が深まる

「3D にすると格好いいから」は理由になりません。

---

## 3. Three-layer model

すべてのコンテンツを 3 層で考えます。**役割が違うので、混ぜないでください。**

### Layer 1 — SNS：興味を持たせる

15〜30 秒。**理解を完成させる場所ではありません。**

見せるもの: 正常 vs 病態 / Before・After / 意外な動き / 数値と形態の差 /
病態の進行 / 「なぜ？」と思わせる現象。

```text
Attention  →  Curiosity  →  Interactive Web
```

**原則: SNS で全部説明しない。** 詰め込むと入口の役割を果たせません。

**SNS は Educational Module を 15 秒に縮めたものではありません。** 目的が違います。
Educational Module は理解させる場所、SNS は「知りたい」「触ってみたい」と
思わせる場所です。詳細な理解は Interactive Web へ送ってください。

構成:

| 位置 | 役割 |
| --- | --- |
| 最初の 2 秒 | 問いを出す |
| 中央 | 最も視覚的に面白い変化を見せる |
| 最後 | take-home message を **1 つだけ** |

例: 「EF 58% と 29% では、心臓の動きはどう違う？」
／「Aβ はどうやって小さな分子からプラークになる？」

### Layer 2 — Interactive Web：触って理解する ★中核

**ここが medical-3d-lab の中核プロダクトです。**
SNS 動画のための素材置き場ではありません。

ユーザーが回す・ズームする・再生する・止める・比較する・スライダーを動かす・
パラメータを変更することで、病態生理を**自分で確認できる**場所です。

設計上の要求:

- 好きに触っても壊れない — sensible parameter ranges / reset / Normal reference /
  Compare / labels / metric synchronization
- ただし**最初から大量のボタンとスライダーを出さない**。基本表示はシンプルに保ち、
  advanced controls は必要に応じて開く

### Layer 3 — Educational Module：理解を定着させる

Interactive Web の上に Guided Learning / Question / Prediction / Explanation /
Clinical context / Mini case / Before・After challenge を載せます。

**最初から教科書のような大量テキストを載せないこと。** 受動的な「読む教材」では
なく active learning が基本思想です（→ §6）。

### 3 層を別プロジェクトとして作らない

```text
                Shared Medical Model
                        │
                        ▼
                Interactive Web
                  /          \
                 ▼            ▼
               SNS        Educational
            short form   guided learning
```

**SNS 用だから別の EF 値を使う、Educational 用だから別の heart geometry を作る、
は原則禁止です。**

---

## 4. Single source of truth

最重要の技術原則:

> **One medical state, multiple representations.**

1 つの医学 state から、3D geometry / animation / metrics / graph / waveform /
labels / SNS representation / educational explanation がすべて派生します。

Heart Failure が実例です。壁の厚さ・内腔の大きさ・拍動・EF・PV ループ・圧波形・
うっ血オーバーレイは、**すべて 1 つの循環モデルの解**から出ています。だから
「絵と数字が食い違う」という教材として最悪の状態が、構造的に起きません。

グラフ用に別の近似を書く、SNS 用に数値を上書きする、といったことをした瞬間に
この保証は失われます。

---

## 5. Clinical variables と visualization variables を分ける

```js
// medical / physiological state — モデルが決める
edvMl, esvMl, heartRate, meanLaPressure, preload, afterload

// visualization only — 見た目だけ
glowIntensity, particleOpacity, cameraDistance, bloomStrength, labelOffset
```

**原則: SNS 映えのために clinical / physiological variable を変更しない。**

見えにくいときに調整してよいのは lighting / camera / color / opacity /
annotation / animation timing です。

この分離は命名にも反映します。臨床的な意味を持つ値は臨床的な名前と単位で
(`edvMl`, `wallMm`, `endDiastolicPressureMmHg`)、演出値はそれと分かる名前で
(`congestionGlowIntensity`, `presentationEmphasis`)。混ざると、後から読む人が
演出値を計測値だと思い込みます。

---

## 6. Learning philosophy

基本学習ループ:

```text
見る → 予測する → 動かす → 結果を見る → 理由を理解する
```

Educational Module の基本 UX:

| Step | 内容 | 例 |
| --- | --- | --- |
| 1. Question | 予測させる | 「Afterload を上げると SV はどうなる？ ↑ / → / ↓」 |
| 2. Manipulation | ユーザーが操作 | Afterload スライダーを動かす |
| 3. Visualization | 同時に変化 | 収縮・PV ループ・圧波形・SV |
| 4. Explanation | 理由を説明 | 「同じ収縮力では駆出しにくくなり、ESV が増えて SV が下がる」 |
| 5. Transfer | 次の問いへ | 「HFrEF では同じ変化がどうなる？」 |

つまり **Prediction → Manipulation → Observation → Explanation** です。

---

## 7. Medical accuracy philosophy

medical-3d-lab は **educational conceptual model** です。患者個別のシミュレーター
でも、研究用数値シミュレーターでもありません。

| 必要 | 必要ない |
| --- | --- |
| 明らかな医学的誤りを避ける | CFD レベルの血流計算 |
| 因果を逆にしない | 分子動力学 |
| 血流方向を間違えない | 患者個別予測 |
| 数値と描画を矛盾させない | 研究レベルの数値モデル検証 |
| モデル以上の主張をしない | 全病態を 1 つのモデルに詰め込む |
| 単純化した部分を明示する | |

### 正確さと分かりやすさの優先順位

> **医学的に誤ってはいけない。しかし、医学的に完全である必要はない。**

複雑さをすべて描くと理解が悪くなる場合は、意図的に単純化します。ただし
**何を単純化したかをコードと docs 側で把握可能にしてください**
（[`medical-notes.md`](medical-notes.md) の「表現していないこと」）。
UI 上は `Simplified educational model` / `教育用模式図` 程度に留めます。

### モデル以上の主張をしない

- モデルの精度を超える桁数を UI に出さない
- 較正パラメータを臨床計測値と同一視しない
- 一例にすぎない経過を「一般則」として書かない
  （例: 「この simulated HFrEF state では」と書き、「HFrEF では」と書かない）

### 三つの利用文脈を混同しない

同じ概念モデルを、患者説明・医学教育・臨床ケース学習の三つの入口で使うことは
できます。ただし、安全境界は用途ごとに明示します。

- **患者説明**: 平易な一般説明。患者個別値の入力や個別予測はしない
- **医学教育**: 予測・操作・比較・説明を一つの state から導く
- **臨床ケース学習**: 症例を題材に機序を確認するところまで。治療推奨や
  DOB などの患者別用量調整はしない

患者別用量調整・治療推奨・意思決定支援を実装する場合は、現行 UI の追加機能
ではなく、根拠・適応範囲・検証・変更管理・臨床レビューを備えた別製品として
判断します。

---

## 8. Content selection — 何を作るか

テーマ候補は 5 軸で評価します。

| 軸 | 問い |
| --- | --- |
| **A. Understanding Gain** ★最重要 | 3D 化で理解がどれだけ改善するか |
| **B. Dynamic Nature** | 時間変化や因果関係があるか |
| **C. Interactivity Value** | ユーザーが操作する意味があるか |
| **D. SNS Potential** | 数秒見ただけで興味を惹けるか |
| **E. Educational Value** | 医学生・研修医・医療者教育に展開できるか |

向いている領域（ロードマップとして固定はしません）:

- **Hemodynamics** — preload / afterload / contractility / heart failure /
  valvular disease / shock / pulmonary circulation
- **Neurology** — amyloid aggregation / tau propagation / cerebral infarction /
  cerebral blood flow / Parkinson disease pathways
- **Respiratory** — ventilation / perfusion / COPD / pulmonary edema / pneumothorax
- **Vascular** — atherosclerosis / aneurysm / thrombosis / embolism
- **Renal / endocrine** — filtration / fluid balance / RAAS

共通するのは **動き・流れ・空間・時間が重要**であることです。

### コンテンツの単位は「疾患」より「問い」

`Heart Failure` という大きなテーマではなく、**一つの理解すべき問い**を単位に
します。

| ❌ テーマ | ✅ 問い |
| --- | --- |
| Heart Failure | 「後負荷を上げると SV はなぜ下がる？」<br>「EF 58% と 29% では何が違う？」<br>「左房圧が上がるとなぜ肺うっ血する？」 |
| Alzheimer disease | 「Aβ はどう凝集する？」<br>「monomer / oligomer / fibril / plaque は何が違う？」 |

---

## 9. What we do not build

| 作らない | 理由 |
| --- | --- |
| **ただ回せる臓器** | 360° 回転できるだけの心臓・脳。既存の 3D anatomy viewer と差別化がない |
| **リアル CG 自体が目的のもの** | 「リアルな心臓を作る」ことは目的ではない |
| **2D で十分なもの** | 表や模式図で理解できるテーマを無理に 3D 化しない |
| **医学的精密性だけの追求** | CFD や分子動力学の研究プロジェクトに変えない |
| **疾患数を増やすこと自体** | KPI にしない（下記） |

> **10 疾患の浅い 3D より、1 テーマで SNS → Interactive → Educational が
> 成立しているほうを高く評価します。**

---

## 10. Architecture implications

```text
medical model
     ↓
   state
     ↓
─────────────────────────────
  3D      charts     metrics
─────────────────────────────
     ↓
presentation layer
   /            \
Reel         Learning
```

- **Reel や Educational Module が、医学モデルそのものへ特殊処理を書き込まない。**
  必要なのは presentation layer 側の調整です。
- 詳細は [`architecture/product-architecture.md`](architecture/product-architecture.md)。

### Scene interface の将来像

すぐ大規模リファクタリングする必要はありません。ただし各 Scene が概念的に
以下を持てる構造を意識してください。

```js
getState()            // その瞬間の医学 state
getMetrics()          // 読み取りパネル          … 実装済み
getStageView()        // ステージ別カメラ        … 実装済み
getReel()             // SNS シーケンス          … 実装済み
getLearningModules()  // Educational Module      … 実装済み
```

現在の実装済みフック一覧は [`adding-a-scene.md`](adding-a-scene.md) にあります。

---

## 11. Success metrics

**3D モデル数では測りません。**

| 層 | 問い |
| --- | --- |
| SNS | 「止まって見たくなるか」 |
| Interactive | 「触ったことで理解が深まるか」 |
| Educational | 「予測 → 操作 → 説明で概念を理解できるか」 |

教材については、もう 1 つ機械的に確かめられる指標があります:
**その教材の答えは、モデルから再導出できるか？** できないなら、それは
モデルについての教材ではなく、モデルの横に置かれた別の主張です。

> **この機能はどの層の、どのユーザー価値を改善するのか？**
> に答えられない機能は、原則として追加しません。

---

## 12. Current reference scenes

2 つのシーンは、**異なる 2 種類のモデルパターン**の参照実装です。将来の scene
architecture は、この 2 種類が共存できる設計を維持してください。

### Heart Failure — physiology / hemodynamics

**reference implementation** として扱います。

到達点: Three.js heart / remodeling / synchronized Normal vs HFrEF comparison /
closed-loop hemodynamic model / PV loop / LV・LA・Ao pressure waveform /
preload・afterload / pulmonary congestion overlay / Reel mode。

単なる 3D heart viewer ではなく **interactive cardiovascular physiology
simulator** に近い構造です。**この方向性を今後の基準としてください。**

```text
SNS          ✓  15 秒 Reel
Interactive  ✓  循環モデル / PV ループ / 圧波形 / 前負荷・後負荷
Educational  ✓  「後負荷を上げると SV はどう変わる？」
```

**3 層すべてが実物として揃った最初のコンテンツです。**

Educational Module は 1 本だけです。これは意図的で、**1 モジュール = 1 つの
因果関係**という原則の適用です。PV ループの読み方全部や圧波形の解説を最初から
教え込むのではなく、`後負荷 ↑ → ESV ↑ → SV ↓` という 1 本の鎖だけを、
予測 → 操作 → 観察 → 説明 → 応用 で辿らせます。

教材が主張することは**モデルから再導出してテストします**
（`tests/learning.test.js`）。「SV は減る」という保存された答えも、
「HFrEF のほうが影響が大きい」という応用問題の答えも、CI がモデルに問い直します。
物理が変わって教材が成り立たなくなったら、静かに嘘を教えるのではなく
ビルドが落ちます。**これが Educational 層がモデルを fork しないということの
実装上の意味です。**

### Amyloid-β — time-dependent molecular / pathological process

循環モデルとは異なるタイプの reference scene です。連続的な進行度から粒子の
状態遷移が派生する構造で、Heart Failure の「連立方程式を解く」型とは別系統の
モデルパターンを代表しています。

---

## 13. Open questions — 収益化

**未決定です。** いま決める必要はありませんが、検討した内容を残しておきます。
後から「なぜあの形にしなかったか」を思い出せるようにするためのものです。

### 現状

無料。静的サイトなのでホスティング費用も実質ゼロ。アカウントも決済も
バックエンドもありません。

### 検討した案と、その問題点

**「無料 = 閲覧のみ / 有料 = 操作できる」という切り方は採らない。**

理由が 2 つあります。

1. **[§9](#9-what-we-do-not-build) と正面衝突する。** 「ただ回せる臓器は作らない」と
   決めているのに、無料版がまさにそれになります。多くの人が最初に触れるのは
   無料版なので、**プロジェクトの第一印象が「作らないと決めたもの」**になります。
2. **[§3](#3-three-layer-model) の導線が壊れる。** `SNS → Interactive → Educational`
   は、Interactive が誰でも触れることを前提にした設計です。触れないものに
   人は流れてきません。SNS が入口として機能しなくなります。

無料枠を区切るなら、**機能ではなくコンテンツの本数**で区切るほうが設計と
整合します。

### 「患者個別の説明用」は tier ではなく別プロダクト

患者説明という**利用文脈**自体は、一般的な機序を平易に示す範囲で現行モデルに
持てます。一方、患者個別値を入力する説明製品は要件が根本的に違います。

| | 現状（医療者向け） | 患者説明 |
| --- | --- | --- |
| 言葉 | EF / EDV / LVEDP / ESPVR | 専門用語なし |
| 時間 | 数分〜自由探索 | 30 秒〜2 分 |
| 操作者 | 学習者本人 | 医師（患者は見る側） |
| 数値 | 模式的な一例 | **その患者の値を入れたくなる** |

最後の行が決定的です。患者説明の文脈では必ず「この患者さんの EF は 32%」と
入れたくなりますが、それは

> **患者個別のシミュレーターではない**（[§7](#7-medical-accuracy-philosophy)）

を破ります。また、患者に見せる目的で個別の値を入力させるものは、規制上の
位置づけ（医療機器該当性）も現状とは変わります。

**やるなら「有料 tier を足す」ではなく、独立した製品判断として。**
現行の免責文言・UI・モデルの前提をそのまま流用することはできません。

### 「教育用が有料」は、実際には「教育機関向け機能が有料」

医学教育で実際に課金対象になるのはコンテンツそのものより運用機能です。

- 施設ライセンス（大学・病院が学生全員分）
- 進捗管理・成績・修了証
- 講義で使える形（オフライン、投影モード、書き出し）
- 自分で教材を作れる（authoring）

いずれも**アカウント・DB・決済**を要求します。現在の「サーバー不要の静的
サイト」という構成からは大きな飛躍で、運用コストと責任範囲が一段変わります。

### 判断の順番

課金設計より先に、**誰が何に金を払うかの証拠**が要ります。

```text
1. 無料のまま Heart Failure の 3 層を厚くする（教材 2〜3 本）
2. SNS に出して反応を見る — 誰が来るか、どこで止まるか
3. その結果を見てから課金を設計する
```

現時点の見立てとしては、個人課金より **施設ライセンス（B2B）が最初の現実的な
収益源**になる可能性が高い領域です。ただしこれは仮説であって、2 の結果で
覆る前提で扱ってください。

### どの案を採るにせよ守ること

- 無料層に Interactive を残す（導線を殺さない）
- 患者向けは別判断として扱う（§7 を静かに破らない）
- 課金のために医学モデルを分岐させない（[§4](#4-single-source-of-truth) は
  料金プランより上位）

---

## Final principle

> medical-3d-lab は、3D を作るプロジェクトではない。
> **医学的に理解しづらい動的な現象を、見える・動く・触れる形に変換する
> プロジェクトである。**
>
> そして、SNS で興味を生み、Interactive Web で理解させ、
> Educational Module で定着させる。
