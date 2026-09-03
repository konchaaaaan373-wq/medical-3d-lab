# Grand design — アプリ全体の設計図

Last updated: 2026-09-03（現在地の数値は §3 参照）

このプロジェクトの**完成形（1.0 の姿）**と**現在地**、その差分を埋める
**優先順位**を 1 枚に固定した文書です。人間と複数の AI エージェント
（Claude Code / Codex など）が同じ絵を見て開発するための共通参照点として
使ってください。

**この文書は地図であって、詳細の所有者ではありません。** 各領域の詳細は
§1 の所有文書が source of truth です。本書と所有文書が矛盾したら
**所有文書が勝ち、本書を直します**。詳細をここに複製しないでください——
複製した瞬間から乖離が始まります。

---

## 1. Document map — 何がどこに書いてあるか

作業を始める前に、この表で該当する所有文書を引いてください。
エージェントの読む順は **`CLAUDE.md` → 本書 → 該当する所有文書** です。

| 知りたいこと | 所有文書 |
| --- | --- |
| なぜ作るか・何を作らないか・3 層モデル | [`product-principles.md`](product-principles.md) |
| 層の依存規則（model → state → 表現、一方向） | [`architecture/product-architecture.md`](architecture/product-architecture.md) |
| 3D-first view と data の配置の決定 | [`architecture/learning-first-view.md`](architecture/learning-first-view.md) |
| シーンの追加手順・suitability check・昇格条件 | [`adding-a-scene.md`](adding-a-scene.md) |
| アーキテクチャ規則 6 か条（semantic geometry など） | [`architecture-rules.md`](architecture-rules.md) |
| 3D 実装の失敗モードと切り分け手順・完成チェックリスト | [`organ-3d-playbook.md`](organ-3d-playbook.md) |
| 医学的単純化の記録（シーンごと） | [`medical-notes.md`](medical-notes.md) |
| 各モデルの主張の根拠（Claim → Source → …） | [`model-evidence/`](model-evidence/) |
| 各モデルが答える問い・答えない問い | [`model-cards/`](model-cards/) |
| モデルカードの改訂とレビューの陳腐化検知 | [`model-cards/README.md`](model-cards/README.md) |
| 公開までのゲートと実装順（進捗台帳） | [`public-release-roadmap.md`](public-release-roadmap.md) |
| リリース手順・ロールバック・障害対応 | [`release-runbook.md`](release-runbook.md) |
| 性能予算・計測・エラー報告・フィードバック | [`observability.md`](observability.md) |
| クロール可能なページ・OGP・sitemap | [`discoverability.md`](discoverability.md) |
| 規約・プライバシー・特商法表記・販売可否の判定 | [`../src/data/legal.js`](../src/data/legal.js) と [`access-and-billing.md`](access-and-billing.md) |
| キーボード・フォーカス・コントラスト・ズーム | [`accessibility.md`](accessibility.md) |
| 疾患候補の臓器別トリアージ（検討プール） | [`disease-candidates.md`](disease-candidates.md) |
| 解剖・アートレビューの記録（実測と残課題） | [`anatomy-review.md`](anatomy-review.md) |
| 臓器別の精密正確性モデル仕様（目標 A レベル・固定する解剖関係） | [`anatomy-specs.md`](anatomy-specs.md) |
| 医学モデル層の書き方（純 JS・three/DOM 禁止） | [`../src/models/README.md`](../src/models/README.md) |
| どんな system / organ / scene が**存在するか** | [`../src/catalog/`](../src/catalog/)（コードが登録簿） |
| 完成形・現在地・優先順位・共同開発の作法 | **本書** |

---

## 2. North star

> **Make invisible mechanisms of health and disease visible, interactive,
> and understandable.**
> 見えない病態生理を、3D で動かし、触って理解する。

- 3D は手段。2D の静止画より理解が明確に改善するテーマだけを扱う
- SNS（入口）→ Interactive Web（中核）→ Educational Module（定着）の 3 層。
  すべて **1 つの医学モデルの解**から派生する
- 疾患数を KPI にしない。**1 テーマで 3 層が成立しているほうが 10 疾患の浅い
  3D より価値が高い**

詳細と判断チェックリストは [`product-principles.md`](product-principles.md)。

---

## 3. 現在地（2026-09 時点）

| 指標 | 値 |
| --- | --- |
| シーン数 | 21（production 2 / alpha 5 / prototype 14） |
| カタログ | 11 系統・22 臓器（未カバー臓器は explorer 上で backlog として可視） |
| 医学モデル層（`src/models/`） | copd / asthma / portalHypertension / hepatorenal / renalFiltration の 5 本 + 共通ユーティリティ |
| コード規模 | src 配下およそ 160 ファイル・3.2 万行。依存は `three` のみ |
| テスト | カタログ整合性・モデル整合性・**教材の答えのモデルからの再導出**・性能予算・計測の匿名性（`node --test`） |
| 計測 | 性能予算と launch metrics を宣言済み。送信は consent ゲート付きで、endpoint 未設定なら何も送らない（[`observability.md`](observability.md)） |

### 強み（すでに資産になっているもの）

- **アーキテクチャ**: single source of truth、カタログ駆動ルーティング、
  医学モデル層の分離、教材主張の CI 検証。ここは完成形でもこのまま使う
- **reference implementation**: Heart Failure は 3 層すべてが実物として揃った
  唯一のテーマ。Amyloid-β は別系統（分子過程）の参照実装
- **信頼の 4 点セット**の運用実績: alpha 4 シーンがモデル層・evidence・
  model card・scope panel を揃えている

### ギャップ（「完成の 1/10」の中身）

体感の 1/10 は**シーン数の不足ではなく**、次の 4 軸で読むべきです。

1. **深さ** — 3 層の機構（Reel + Learning）自体は Heart Failure と alpha
   3 本（COPD・喘息・門脈圧亢進症）に実装済み。ただし**臨床レビューを通って
   3 層が信頼つきで成立しているのは Heart Failure の 1 テーマだけ**で、
   production の Amyloid-β には Reel も Learning もなく、HRS には Learning が
   ない。教材はどのテーマも 1 本止まり（現状の深さ台帳は §5.1）
2. **信頼** — 臨床レビュー登録簿・PR CI・公開 Trust 面は整備済み。
   モデルカードの改訂とレビュー陳腐化の検知も CI に入った
   （[`model-cards/README.md`](model-cards/README.md)）。残るのは main 保護
   （[`public-release-roadmap.md`](public-release-roadmap.md) Gate 0B）と、
   Heart Failure・Amyloid-β の臨床レビュー署名
3. **器** — landing・Lab 分割・WebGL 失敗時の fallback は実装済み。
   性能予算と計測・エラー報告・フィードバック導線も入った
   （[`observability.md`](observability.md)）。残るのは
   モバイル実機・アクセシビリティ・SEO の検証
4. **解剖** — 実測で正確性が固定された臓器は心臓（semantic-anatomy テスト +
   [`anatomy-review.md`](anatomy-review.md)）と脳（解剖アトラスシーン）のみ。
   他の臓器はスタイライズドな輪郭のままで、区画・脈管を「指せる」水準に
   ない（§4.5 の A スケール）。**病態の各論は正確な臓器の上にしか
   載せられない**ので、これは残り全臓器の疾患展開の前提負債

**この 4 軸のうちどれを縮めるかの順序は roadmap（Gate 0 → 1 → …）が所有**
しています。本書のコンテンツ計画（§5）はその順序を追い越しません。

---

## 4. 完成形（Target picture）

### 4.1 五本柱

1.0 と呼べる状態を、5 本柱で定義します。

| 柱 | 完成の定義 |
| --- | --- |
| **Content** | 主要な系統に「問い」単位のシーンが reviewed 以上で最低 1 本ずつあり、横断テーマ（HRS のような 2 臓器 1 循環）が複数ある。本数は KPI にしない |
| **Model library** | `src/models/` が疾患横断で再利用できる**モデルパターン集**になっている（§4.4）。新しい疾患の 8 割は既存パターンの拡張で書ける |
| **App shell** | landing（問いから入る）/ Organ Explorer / scene view（View・Story・Learn・Reel・Scope）/ Lab 隔離が製品として成立。WebGL なしでも案内・出典・範囲は読める |
| **Trust infrastructure** | 臨床レビュー登録簿（レビュアー・日付・対象コミット）、PR CI、main 保護、evidence とカタログ status の機械照合 |
| **Distribution** | シーンごとの Reel が SNS 出力として使え、教材が Learning で完結する。教育機関向け・課金は**証拠が出てから**（§9） |

### 4.2 レイヤー構造（変えないもの）

完成形でも層構造は現行のまま拡張します。矢印は一方向。

```text
src/models/          医学モデル（純 JS。three も DOM も知らない）
      ↓ getState()
src/scenes/          臓器ジオメトリ（organs/）と 1 問い 1 シーン（scenes/）
      ↓
src/app/ + components/   viewer / router / panels — シーンの中身を知らない
      ↓
Reel（SNS） / Learning（Educational）   presentation 層の調整のみ
```

- 登録先は `src/catalog/` の 1 か所。シーンを 100 本に増やしても
  routing・explorer・テストは手を入れない（現行設計のまま）
- Scene interface は `getState / getMetrics / getStageView / getReel /
  getLearningModules`（+ scope panel）。新しい横断機能（例: compare）は
  シーン専用分岐ではなく**汎用フックの追加**として設計する
  （[`product-architecture.md`](architecture/product-architecture.md)）

### 4.3 完成形で増えるもの（現状に存在しない構造物）

| 構造物 | 置き場所（想定） | 対応ゲート |
| --- | --- | --- |
| 臨床レビュー登録簿（versioned） | `docs/clinical-reviews/` | Gate 0A |
| PR CI（test + build）と main 保護 | `.github/workflows/` | Gate 0B |
| WebGL 非依存の product shell / landing | `src/app/` | Gate 0B |
| 公開カタログと Lab（prototype 隔離）の分割 | `src/catalog/` の status 駆動 | Gate 0B |
| Heart Failure / Amyloid-β のモデル層移設 | `src/models/` へ | Gate 0A |
| per-scene メタデータ・social card・sitemap | ビルド時生成（実装済み。social card の raster のみ未） | Gate 3 |

### 4.4 Model patterns library — 本当の資産

このプロジェクトの再利用単位はジオメトリよりも**モデルパターン**です。
新しい疾患シーンは、まず既存パターンの拡張として設計できないかを検討し、
できないときだけ新パターンを `src/models/` に足します。

| パターン | 実装（現在） | 再利用先の候補 |
| --- | --- | --- |
| 時変エラスタンス閉ループ循環 | heartFailure `circulation.js`（要 `src/models/` 移設） | 弁膜症・心筋虚血・ショック・肺水腫の左房圧側 |
| コンパートメント + 時定数 | `models/copd.js`（12 肺単位） | 肺炎の V/Q 不均衡・肺水腫のガス交換側 |
| 分岐ネットワークの不安定性 | `models/asthma.js`（気道樹） | 脳灌流（脳梗塞）・気道以外の分岐流 |
| 流量保存の抵抗ネットワーク | `models/portalHypertension.js` | 側副路一般・シャント・血管病変 |
| 2 臓器 1 循環（臓器横断） | `models/hepatorenal.js` | 心腎連関・肝肺症候群・敗血症性循環 |
| 連続進行度 → 粒子状態遷移 | amyloidBeta `aggregationLayout.js`（要移設） | タウ伝播・α-シヌクレイン・血栓形成 |
| 濾過・尿細管の物質収支 | `models/renalFiltration.js`（Starling 平衡 + Na/尿素/水/アルブミンの収支） | CKD / AKI / ネフローゼは同一モデルの situation として実装済み。K・酸塩基への拡張 |

共通基盤は `models/integrate.js`・`units.js`・`evidence.js`・`random.js`。
パターンを跨いで使う数値手法はここに集約します。

1 つのシーンが複数パターンを組み合わせることは正常です（例: 肺水腫は
エラスタンス閉ループの左房圧側とコンパートメントの肺側を連立する）。
その場合もモデルは 1 つの state を解くこと——パターンごとに独立した
近似を並べたら single source of truth が壊れます。

### 4.5 Anatomy foundation — 臓器の正確性が各論の前提

**方針（2026-09 追加）: 疾患の各論に入る前に、その臓器自体の解剖学的
正確性を上げる。病態は正確な臓器の上に載せる。**

なぜこの順序か:

- 病態は解剖学的な場所を**指す**。肺炎は肺区域を、肺塞栓は区域動脈を、
  気胸は胸膜腔を、脳梗塞は灌流領域を。臓器側にその構造が存在し、
  **名前で指せる**（architecture-rules の semantic geometry）ようになって
  いなければ、疾患シーンは主張のしようがない
- 逆に、疾患シーンごとに間に合わせの解剖を足すと、同じ臓器が疾患ごとに
  違う形を持ち始め、「Organ と Disease を混ぜない」が崩れる。解剖への
  投資は organ builder に対して行い、**その臓器の全シーンが同じ改善を
  受け取る**

**Anatomy fidelity scale（A スケール）** — status（信頼）や D（深さ）と
直交する、臓器ジオメトリ自体の到達度です。

| 段階 | 意味 | 例（肺の場合） |
| --- | --- | --- |
| **A0** | スタイライズドな輪郭 | 現在の prototype の肺 |
| **A1** | 外形・比率・隣接関係が正しく、**実測テストで固定**されている | 3 葉 / 2 葉の左右差、心切痕、肺尖と横隔膜面、心臓・気管との位置関係 |
| **A2** | 機能単位・内部区画を解剖学的な名前で指せる | 肺葉・肺区域（S1–S10）、葉気管支〜区域気管支 |
| **A3** | 病態が指す脈管・管腔・組織層まで持つ | 肺動静脈（区域レベル）、臓側・壁側胸膜、肺門 |

**規則**

1. **疾患が要求する A レベルが先** — alpha 以上の疾患シーンは、その疾患が
   主張に使う構造について臓器が該当 A レベルに達していることを前提にする。
   区域を語る肺炎は、区域を持つ肺の上にしか作れない
2. **Pull 型で上げる**（「anatomy atlas を作らない」原則と両立させる要）:
   解剖構造を足す理由は、[`disease-candidates.md`](disease-candidates.md) の
   どれかがその構造を**指す必要がある**こと。どの候補も指さない血管網は、
   どれほど正確でも足さない
3. **測って固定する** — 解剖学的な主張は目視ではなくランドマークの実測で
   検証し、`tests/semantic-anatomy.test.js` に落とす。手本は心臓
   （[`anatomy-review.md`](anatomy-review.md) §1 の 11 関係）。受け入れた
   単純化は model card / medical-notes に書く
4. **実レンダリングまで**（architecture-rules 規則 6）と
   [`organ-3d-playbook.md`](organ-3d-playbook.md) 末尾のチェックリストは
   解剖 upgrade にもそのまま適用する
5. 解剖そのものを主題にするシーン（brain-anatomy が実例）は、
   「触って理解が改善するか」の suitability check を通る場合に限り正当。
   ただ回せるだけの臓器ビューは作らない（principles §9）

**現在の A 台帳と、最初のパイロット**

| 臓器 | A レベル | 根拠 |
| --- | --- | --- |
| heart | A2 | 弁・大血管・肺静脈の 11 関係を実測しテストで固定済み |
| brain | A2 | 脳回・脳溝・深部構造を選択できる解剖アトラス（alpha） |
| 残り 20 臓器 | A0–A1（未実測） | スタイライズド。実測テストなし |

臓器ごとの具体的な仕様（目標 A レベル・名前で指せるべき単位・実測で
固定する解剖関係・受け入れる単純化・upgrade の優先順位）は
[`anatomy-specs.md`](anatomy-specs.md) が所有します。

**肺を次の anatomy upgrade のパイロットにします。** 理由は要求元が最も
具体的だから: planned に並ぶ気胸（胸膜腔・虚脱）、肺塞栓（区域動脈）、
肺炎（区域の浸潤）、および COPD・喘息（既に reviewed だが肺はスタイラ
イズドのまま）がそれぞれ指す構造が決まっている。到達目標は A2（肺葉と
S1–S10、気管支樹を区域まで）+ 要求分の A3（肺動脈の区域幹・胸膜）。
**この upgrade が呼吸器系の Tier A/B 疾患すべての前提**であり、着手順は
§5.3 に反映する。

---

## 5. 拡張戦略 — 臓器の深さ × 病態の広がり

コンテンツの拡張は 2 つの直交する軸で考えます。

- **深さ**: 1 つの臓器・テーマをどこまで掘るか（§5.1 の depth ladder）
- **広がり**: どの病態カテゴリを扱えるか（§5.2 の pathology coverage）

コンテンツの単位はどちらの軸でも疾患名ではなく**1 つの理解すべき問い**です
（[`product-principles.md`](product-principles.md) §8）。候補は 3 段階で
管理します: 臓器別の検討プールが
[`disease-candidates.md`](disease-candidates.md)、そこから昇格した
近い将来の方向が `src/catalog/scenes.js` の `PLANNED_SCENES`（explorer に
表示される）、実装の儀式は
[`adding-a-scene.md`](adding-a-scene.md)。本書は**考え方と着手順**だけを
決めます。

**前提: 新規シーンより Gate 0（信頼と公開安全性）が先**です。以下は
「次に作るならこの順」であり、roadmap を追い越す理由にはなりません。

### 5.1 臓器の深さ — depth ladder

臓器ごとの到達度を 5 段階で読みます。status（信頼の主張）と直交する
軸で、「その臓器で何ができるか」を測るものです。

| 段階 | 意味 | 条件 |
| --- | --- | --- |
| **D0** | 地図に載っている | `taxonomy.js` に登録のみ。explorer で「未カバー」表示 = backlog |
| **D1** | 形と動きがある | organ builder + prototype シーン。数値は出さない |
| **D2** | モデルと数値がある | 4 点セット（モデル層・evidence・model card・scope panel）= alpha 以上 |
| **D3** | 3 層が信頼つきで成立 | Reel + Learning（答えは CI が再導出）+ 臨床レビュー（reviewed 以上） |
| **D4** | 横断・治療・経過を扱う | 2 臓器 1 循環への参加 / 治療機序 / 疾患進行のいずれかで、複数の問いを持つ |

**深さの規則**

- D2 を飛ばして D3 の主張をしない（数値と教材は 4 点セットの上にだけ載る）。
  ただし D4 の性質（横断・治療）は D2 の時点で持ち始めてよい — HRS が実例
- **1 臓器に 2 本目のシーンを足す条件**: 新しい「問い」であること、かつ
  organ builder とモデルパターンの少なくとも一方を再利用できること。
  臓器を 2 回モデリングしない（CLAUDE.md「Organ と Disease を混ぜない」）
- **深さ > 広がり**（principles §9）。既存臓器を 1 段上げる仕事は、
  新しい臓器を D1 で増やす仕事に原則として優先する
- **A が D の前提**（§4.5）: D2 以上の疾患シーンは、その疾患が主張に使う
  構造について臓器が必要な A レベルに達していることを前提にする。
  臓器の正確化 → 病態の各論、の順を守る

**現在の深さ台帳（2026-08）**

| 臓器 | status | Reel | Learning | 横断・治療・経過 |
| --- | --- | --- | --- | --- |
| heart | production（心不全） | ✓ | ✓ | — |
| brain | production（Aβ） | ✗ | ✗ | 経過（進行度）が主題そのもの |
| lungs / airway | alpha ×2（COPD・喘息） | ✓ | ✓ | — |
| liver / spleen | alpha（門脈圧亢進） | ✓ | ✓ | HRS に参加 |
| kidney | alpha ×2（HRS・濾過） | ✓（HRS） | ✓（濾過） | 2 臓器 1 循環 + 治療機序 |
| 残り 17 臓器 | prototype | — | — | — |

この表から読める**深さの負債**: production の Amyloid-β が Reel と
Learning を持たず、HRS が Learning を持たない。新しい臓器へ広げる前に、
この 2 つを既存の水準に揃えるほうが安い。

### 5.2 病態の種類 — pathology coverage

CLAUDE.md の対象軸（anatomy / physiology / pathology / disease progression /
treatment mechanism）を病態カテゴリに落とすと、現状は次のとおりです。

| 病態カテゴリ | 例 | モデルパターン（§4.4） | 現状 |
| --- | --- | --- | --- |
| 血行動態（圧と流量） | 心不全・門脈圧亢進・HRS | エラスタンス閉ループ / 抵抗ネットワーク / 2 臓器 1 循環 | **最も厚い** |
| 閉塞・メカニクス | COPD・喘息・(前立腺と尿流) | 時定数コンパートメント / 分岐ネットワーク | 実装済み |
| 変性・蓄積（分子過程） | Aβ。次: タウ・α-シヌクレイン | 粒子状態遷移 | 1 系統のみ |
| 虚血・梗塞 | 脳梗塞・心筋虚血 | 供給と需要 + 灌流ネットワーク（既存の組合せ） | 未実装（Tier B） |
| 濾過・排泄の障害 | AKI / CKD / ネフローゼ | 濾過・尿細管の物質収支 | **実装済み**（`renal-filtration`、alpha） |
| 炎症・感染 | 肺炎・肝炎 | 浸出とガス交換への波及（新規。V/Q 不均衡は時定数系で部分表現可） | 未実装 |
| 電気生理 | 不整脈・伝導障害 | 興奮伝播（新規。ジオメトリ上を波が走る主題で、3D 適性は最上位） | パターンも `PLANNED_SCENES` 登録もなし。候補として起票する価値あり |
| 内分泌・フィードバック | RAAS・甲状腺軸 | 負帰還ループ（新規） | prototype（甲状腺・副腎）のみ。モデルなし |
| 腫瘍 | 増殖・浸潤・圧排 | 未定 | 保留 — suitability check（2D で足りないか）を先に通す |

**偏りの明文化**: 現在の資産は圧・流量系（血行動態 + メカニクス）に
強く偏っています。Heart Failure を基準に育てた以上これは意図的ですが、
「人体全体の病態生理」を名乗る 1.0 の完成条件には
**血行動態以外のカテゴリで最低 2 系統（例: 虚血系 + 濾過系）が D2 以上**
を含めます。

**treatment / progression の軸**: 治療機序を扱うのは HRS の 1 本、
疾患進行を主題にするのは Aβ の 1 本だけです。新しい疾患を増やすより先に、
既存シーンに D4 の問いを足すほうが安いことが多い——例:
心不全に「利尿薬はこの回路のどの項を動かすか」、COPD に
「気管支拡張薬は時定数のどちらの因子を変えるか」。

### 5.3 着手順

**Tier の前に anatomy upgrade（§4.5）が入ります。** ある臓器の疾患群に
着手する前に、それらが指す構造までその臓器の A レベルを上げるのが先です。
最初のパイロットは肺（→ A2 + 要求分の A3）で、これが Tier A の肺水腫と
Tier B の肺炎・肺塞栓・気胸の前提になります。

#### Tier A — 既存パターンの再利用で成立し、既存シーンと連結するもの

| 問い | 再利用するパターン | つながる既存シーン |
| --- | --- | --- |
| 左房圧が上がると、なぜ・どこから肺に水が出るのか（肺水腫） | 時変エラスタンス + コンパートメント | Heart Failure のうっ血表現の機序側・COPD の肺 |
| 弁が狭い／漏れると PV ループはどう歪むか（弁膜症） | 時変エラスタンスに弁抵抗・逆流を追加 | Heart Failure |
| ~~濾過はどの段階でどう落ちるか（AKI / CKD / ネフローゼ）~~ | ~~濾過・尿細管の物質収支（新パターン）~~ | **実装済み** — `renal-filtration`。HRS の腎側と同じ臓器を共有します |

#### Tier B — パターンの新展開

脳梗塞（灌流ネットワーク + ペナンブラの時間依存）、心筋虚血（供給と需要）、
肺炎（V/Q 不均衡）、不整脈（興奮伝播 — §5.2 の新カテゴリ）。
いずれも「時間とともに動く・複数変数が連動する」を満たす。

#### Tier C — 分子・病理過程の系譜

タウ伝播・α-シヌクレイン・血栓形成。Amyloid-β 系のパターンを継ぐ。

### 5.4 既存 prototype 14 本の扱い

**全部を alpha に引き上げようとしないでください。** prototype は臓器
ジオメトリと動きの下書きとしての価値が主で、進路は 2 つだけです。

1. Tier A/B の疾患シーンに**臓器ビルダーを供出**して土台になる（例:
   肺水腫が `breathingLungs` の肺を使う）
2. 当面主題化しないものは **Lab / Experimental**（Gate 0B の分割）に置き、
   公開カタログから外す

「prototype を磨くこと」自体を作業単位にしない——磨くなら、どの問いの
土台になるかを先に決めます。

---

## 6. App shell / UX target

ルーティングはハッシュ 1 本を維持し、`src/catalog/` から生成します。

| ルート | 役割 | 状態 |
| --- | --- | --- |
| `#/` | landing。**問いから入り、まず触る**入口。循環の実モデルをheroで操作でき、全公開モデルでは実装成熟度と医学レビュー状態を分けて表示 | 実装済み |
| `#/organs`（= `#/explore`） | Organ Explorer。全身の地図と backlog の可視化 | 実装済み |
| `#/<slug>` | 1 シーン。View / Story / Learn / Reel / Scope | 実装済み |
| `#/lab`（= `#/experimental`） | prototype の隔離。明示的に入る場所 | 実装済み |

シーン内の体験は [`learning-first-view.md`](architecture/learning-first-view.md)
の決定（3D-first、データは 1 クリック先）を全シーンの基準にします。
モバイル・キーボード・スクリーンリーダー・WebGL fallback は Gate 0B/1 の
完了条件であり、シーンごとの努力目標ではなく**外殻の仕事**です。

---

## 7. Trust & release infrastructure

所有は [`public-release-roadmap.md`](public-release-roadmap.md)。要約のみ:

- **Gate 0** 公開前ブロッカー: レビュー登録簿・HF / Aβ の evidence 水準統一・
  PR CI・main 保護・WebGL 非依存 shell・landing・Lab 分割
- **Gate 1** 限定無料ベータ: ブラウザ / 実機・アクセシビリティ・性能予算・
  エラー報告と分析
- **Gate 2** 有料ベータ: 収益化 ADR が先（§9）
- **Gate 3** 一般公開: SEO・リリース運用・モデルカードのバージョニング
- **Gate 4** 教育機関向け: 個人向けの検証後

---

## 8. Working agreements — 人間 + 複数エージェントの共同開発

Claude Code・Codex いずれも、このリポジトリで作業するときの共通規約です。

### 読む順

1. `CLAUDE.md`（規則の要約）
2. 本書 §1 の document map で、触る領域の所有文書を引く
3. 所有文書の該当節

### 不変条件 — どのタスクでも破らない

1. **One medical source of truth** — 絵・数値・グラフ・教材は同じ state から。
   グラフ用・SNS 用の別近似を書かない
2. **臨床変数と演出変数を混ぜない** — 命名で区別（`edvMl` vs `glowIntensity`）。
   見せ方の調整で臨床値を動かさない
3. **登録先は `src/catalog/` だけ** — routing・explorer・テストに手を入れない
4. **`src/models/` は純 JS** — `three` も DOM も import しない。
   `node --test` だけで検証できること
5. **教材の答えはモデルから再導出できること** — 保存された正解は CI が照合する
6. **prototype は数値を出さない** — 精度の主張は 4 点セット
   （モデル層・evidence・model card・scope panel）が揃ってから
7. **Organ と Disease を混ぜない** — 臓器ビルダーに疾患名を持ち込まない
8. **病態は正確な臓器の上に載せる** — 疾患が指す構造の A レベル（§4.5）を
   臓器が満たしていないまま、その構造についての主張をしない

### 変更の種類ごとの作法

| 変更 | 必ずやること |
| --- | --- |
| 医学的な値・式 | `npm test` を通す + [`medical-notes.md`](medical-notes.md) / evidence を更新 |
| シーン追加 | [`adding-a-scene.md`](adding-a-scene.md) の手順（suitability check → proposal → 実装 → カタログ登録） |
| 臓器の形状完成 | [`organ-3d-playbook.md`](organ-3d-playbook.md) 末尾のチェックリストを測る |
| 臓器の解剖 upgrade（A スケール） | pull 型の理由（どの疾患候補がその構造を指すか）を明記 + ランドマーク実測を `tests/semantic-anatomy.test.js` に固定 + [`anatomy-review.md`](anatomy-review.md) に記録 |
| alpha 以上への昇格 | 4 点セット + 昇格条件（adding-a-scene §8）。臨床レビューなしで reviewed 以上にしない |
| 3D シーンの変更 | unit test 合格だけで完成としない。実レンダリング確認まで（architecture-rules §6） |
| 本書の地図・現在地を古くする変更 | **同じ PR で本書を更新** |

### PR の粒度

roadmap の *Definition of done for every batch* に従います: 1 PR = 1 つの
明確なリスク低減またはユーザー価値。文書・コード・テストが一致していること。

---

## 9. 決めていないこと（意図的な凍結）

以下は**未決定のまま**が正しい状態です。実装で先取りしないでください。

- **収益化の形** — 検討済みの案と却下理由は
  [`product-principles.md`](product-principles.md) §13。決めるのは
  SNS → Interactive の導線で実データを見てから（Gate 2 の ADR）
- **患者説明用プロダクト** — tier ではなく別製品判断。患者個別値の入力は
  現行の前提（educational conceptual model）を破る
- **SSO / LTI・施設機能** — 具体的な顧客が要求するまで作らない（Gate 4）

---

## 10. 本書の更新ルール

- §3（現在地）は、状態が変わる merge（status 昇格・ゲート完了・
  モデルパターン追加）ごとに更新する
- §4–6（完成形）を変えるのは設計判断。理由を書き残す
  （所有文書側に ADR / 節を足し、本書は参照に留める）
- 所有文書と矛盾したら**本書が負け**。見つけた人が直す
