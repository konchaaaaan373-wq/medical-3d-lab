# Grand design — アプリ全体の設計図

Last updated: 2026-09-06（現在地の数値は §3 参照）

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
| 全モデル共通の表示・定型視点・背景・リセット境界 | [`architecture/spatial-inspection.md`](architecture/spatial-inspection.md) |
| シーンの追加手順・suitability check・昇格条件 | [`adding-a-scene.md`](adding-a-scene.md) |
| アーキテクチャ規則 6 か条（semantic geometry など） | [`architecture-rules.md`](architecture-rules.md) |
| 3D 実装の失敗モードと切り分け手順・完成チェックリスト | [`organ-3d-playbook.md`](organ-3d-playbook.md) |
| 医学的単純化の記録（シーンごと） | [`medical-notes.md`](medical-notes.md) |
| 各モデルの主張の根拠（Claim → Source → …） | [`model-evidence/`](model-evidence/) |
| 各モデルが答える問い・答えない問い | [`model-cards/`](model-cards/) |
| モデルカードの改訂とレビューの陳腐化検知 | [`model-cards/README.md`](model-cards/README.md) |
| **いま何が公開されていて、何がロックされているか** | [`beta-release.md`](beta-release.md) |
| 公開βを「解剖だけ」にした判断と、それが何を上書きし何を維持したか | [`architecture/adr-2026-09-08-anatomy-only-beta.md`](architecture/adr-2026-09-08-anatomy-only-beta.md) |
| その「解剖だけ」を外した判断と、外さなかったもの | [`architecture/adr-2026-09-22-mechanism-scene-in-beta.md`](architecture/adr-2026-09-22-mechanism-scene-in-beta.md) |
| UI が読む「いま公開しているモデル」の一覧と契約 | [`../src/catalog/publicManifest.js`](../src/catalog/publicManifest.js)（コードが契約） |
| 公開までのゲートと実装順（進捗台帳） | [`public-release-roadmap.md`](public-release-roadmap.md) |
| マージ済みだが未確認・未決定・先送りの個別事項（残課題台帳） | [`follow-ups.md`](follow-ups.md) |
| リリース手順・ロールバック・障害対応 | [`release-runbook.md`](release-runbook.md) |
| 性能予算・計測・エラー報告・フィードバック | [`observability.md`](observability.md) |
| クロール可能なページ・OGP・sitemap | [`discoverability.md`](discoverability.md) |
| 規約・プライバシー・特商法表記・販売可否の判定 | [`../src/data/legal.js`](../src/data/legal.js) と [`access-and-billing.md`](access-and-billing.md) |
| キーボード・フォーカス・コントラスト・ズーム | [`accessibility.md`](accessibility.md) |
| 病態モデルの操作原則と入力契約（全病態共通） | [`pathology-interaction-principles.md`](pathology-interaction-principles.md) |
| 疾患候補の臓器別トリアージ（検討プール） | [`disease-candidates.md`](disease-candidates.md) |
| 解剖・アートレビューの記録（実測と残課題） | [`anatomy-review.md`](anatomy-review.md) |
| 臓器別の精密正確性モデル仕様（目標 A レベル・固定する解剖関係） | [`anatomy-specs.md`](anatomy-specs.md) |
| 配信レイヤーと intended use の区別・Patient explanation と patient-specific の境界・Model Profile / Asset Manifest の所有関係 | [`architecture/intended-use-and-model-provenance.md`](architecture/intended-use-and-model-provenance.md) |
| 外部 3D asset の製作工程・停止条件・出典記録 | [`asset-pipeline.md`](asset-pipeline.md) と [`../src/catalog/assetManifest.js`](../src/catalog/assetManifest.js)（記録） |
| 各シーンの主張の種類（geometry / mechanism / personalization / intended・prohibited use） | [`../src/catalog/modelProfiles.js`](../src/catalog/modelProfiles.js)（コードが登録簿） |
| 各臓器の解剖モデルがどこまで到達しているか（A レベルと根拠） | [`../src/catalog/anatomy.js`](../src/catalog/anatomy.js)（コードが登録簿） |
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
- ただし Explorer が臓器ごとの入口として機能するため、主要臓器はまず
  **教科書的な中核病態を 5 問程度**そろえることを coverage floor とする。
  これは品質ゲートを緩める本数目標ではなく、珍しい病態や創作的な機序を
  先に置かないための選定規則

詳細と判断チェックリストは [`product-principles.md`](product-principles.md)。

---

## 3. 現在地（2026-09 時点）

| 指標 | 値 |
| --- | --- |
| シーン数 | 27（production 2 / reviewed 3 / alpha 8 / prototype 14） |
| カタログ | 11 系統・22 臓器（未カバー臓器は explorer 上で backlog として可視） |
| 公開モデル | **件数はここに書きません**——この欄は長く「β 公開は 1 件（`brain-anatomy`）」と書いており、間違っていました。数えるのは `npm run verify:site`（`publishes N`）、公開一覧は [`src/catalog/publicManifest.js`](../src/catalog/publicManifest.js) です。公開しているのは解剖シーンと、名指しで加えた機序シーン（[ADR 2026-09-08](architecture/adr-2026-09-08-anatomy-only-beta.md)／[ADR 2026-09-22](architecture/adr-2026-09-22-mechanism-scene-in-beta.md)）。カタログ上「公開可能な水準にある」ことは、公開状態とは別の軸です |
| 医学モデル層（`src/models/`） | asthma / cardiacMechanics / circulation / copd / coronaryTerritories / hepatorenal / myocardialIschemia / pneumonia / portalHypertension / pulmonaryEdema / pulmonaryEmbolism / renalFiltration の 12 本 + 共通ユーティリティ |
| 主張の種類（model profile） | 非 prototype のシーンすべてが `src/catalog/modelProfiles.js` に登録済み（`tests/model-profiles.test.js` が数を固定）。全シーンが representative で、診断・治療選択・用量選択を禁止用途に明示 |
| コード規模 | src 配下およそ 160 ファイル・3.2 万行。依存は `three` のみ |
| テスト | カタログ整合性・モデル整合性・**教材の答えのモデルからの再導出**・**臓器レイヤーの解剖学的整合性**（左右・内外側・ラベルの指す先・入れ子・状態の往復）・性能予算・計測の匿名性（`node --test`） |
| 計測 | 性能予算と launch metrics を宣言済み。送信は consent ゲート付きで、endpoint 未設定なら何も送らない（[`observability.md`](observability.md)） |

### 強み（すでに資産になっているもの）

- **アーキテクチャ**: single source of truth、カタログ駆動ルーティング、
  医学モデル層の分離、教材主張の CI 検証。ここは完成形でもこのまま使う
- **reference implementation**: Heart Failure は 3 層すべてが実物として揃った
  唯一のテーマ。Amyloid-β は別系統（分子過程）の参照実装
- **信頼の 4 点セット**の運用実績: reviewed / alpha の 8 シーンがモデル層・evidence・
  model card・scope panel を揃えている

### ギャップ（「完成の 1/10」の中身）

体感の 1/10 は**シーン数の不足ではなく**、次の 4 軸で読むべきです。

1. **深さ** — 3 層の機構（Reel + Learning）自体は Heart Failure と reviewed
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
4. **解剖** — 心臓・脳に加え、肺（5葉・18区域・区域気管支血管）と肝臓
   （Couinaud区域）が名前つきの部分と実測テストを持つ。残る18臓器は
   A0–A1の模式が中心で、区画・脈管を「指せる」水準にない（§4.5）。
   なお、臓器が区域を持つことと、病態モデルの機能単位を区域に対応付けることは
   別の主張であり、対応がないまま区域名を付けない

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
  getLearningModules`（+ scope panel）。表示面は全シーン共通で、解剖学的な
  固有視点だけ `getInspectionViews / getInspectionView / setInspectionView` を
  任意実装する。新しい横断機能（例: compare）は
  シーン専用分岐ではなく**汎用フックの追加**として設計する
  （[`product-architecture.md`](architecture/product-architecture.md)）

### 4.2.1 三つの利用文脈と安全境界

同じ医学モデルを使っても、入口と表現は用途ごとに分けます。

| 用途 | 現行で提供する範囲 | 現行では提供しないもの |
| --- | --- | --- |
| **患者説明**（Patient explanation） | 平易な言葉と絞った操作で、一般的な機序を会話に使う。版を固定した医学レビューが完了したモデルにのみ表示する | 患者データ入力、個別予測。レビュー未完了モデルでの患者説明バッジ |
| **医学教育**（Medical education） | 予測 → 操作 → 観察 → 説明、比較、教材 | モデルの範囲を超える一般化 |
| **臨床ケース学習**（Clinical case learning） | 症例ベースの機序確認まで | ドブタミン（DOB）などの患者別用量調整、治療推奨、診断、重症度判定、意思決定支援 |

製品内の用途名はこの 3 つに固定します（「臨床応用」は現時点の機能名として
使いません）。患者別の用量調整や治療推奨、臨床意思決定支援は、根拠・適応範囲・
検証・変更管理・臨床レビューを備えた**別途検証された製品**として判断する。
Explorer の用途バッジは「今そのモデルで使える用途」だけを表示し、患者説明は
`features.js` の有料モードと同じ条件（reviewed 以上 + 現行系統の医学レビュー完了）
で fail closed する。

### 4.3 完成形で増えるもの（現状に存在しない構造物）

| 構造物 | 置き場所（想定） | 対応ゲート |
| --- | --- | --- |
| 臨床レビュー登録簿（versioned） | `docs/clinical-reviews/` | Gate 0A |
| PR CI（test + build）と main 保護 | `.github/workflows/` | Gate 0B |
| WebGL 非依存の product shell / landing | `src/app/` | Gate 0B |
| 公開カタログと Lab（prototype 隔離）の分割 | `src/catalog/` の status 駆動 | Gate 0B |
| Heart Failure / Amyloid-β のモデル層移設 | `src/models/` へ | Gate 0A |
| per-scene メタデータ・social card・sitemap | ビルド時生成（実装済み。social card の raster のみ未） | Gate 3 |
| Model profile（用途・出典の契約）と Asset manifest | `src/catalog/modelProfiles.js` / `assetManifest.js`（実装済み、§4.6） | Phase 0（roadmap「Model platform foundation」） |

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
| 経血管の Starling 平衡 + 緩衝つき貯留 | `models/pulmonaryEdema.js`（肺の Starling 式・3 つの緩衝・2 コンパートメント貯留・シャント） | 脳浮腫・腹水・全身の毛細血管漏出 |
| 濾過・尿細管の物質収支 | `models/renalFiltration.js`（Starling 平衡 + Na/尿素/水/アルブミンの収支） | CKD / AKI / ネフローゼは同一モデルの situation として実装済み。K・酸塩基への拡張 |
| 領域コンパートメントの V/Q 不均衡 | `models/pneumonia.js`（コンソリデーションで換気低下、灌流残存） | 無気肺・ARDS の機序比較 |
| 並列肺血管領域の閉塞 | `models/pulmonaryEmbolism.js`（灌流低下、換気残存、相対 PVR） | 肺血管障害・右室後負荷モデルへの接続 |

共通基盤は `models/integrate.js`・`units.js`・`evidence.js`・`random.js`。
パターンを跨いで使う数値手法はここに集約します。

1 つのシーンが複数パターンを組み合わせることは正常です（例: 肺水腫は
エラスタンス閉ループの左房圧側とコンパートメントの肺側を連立する）。
その場合もモデルは 1 つの state を解くこと——パターンごとに独立した
近似を並べたら single source of truth が壊れます。

### 4.5 Anatomy foundation — 全臓器に、脳と同じ精度の解剖モデルを

**要件（2026-09 改訂）: すべての臓器が解剖モデルを持ちます。到達点は
`brain-anatomy` と同じ水準（A2 = 名前で指せる部分に分かれている）です。**
疾患の各論に入る前に臓器自体の正確性を上げる、という順序はそのままです。

**これは方針転換です。** 旧方針は *pull 型* — 予定している疾患シーンが
その構造を要求したときだけ臓器を上げ、残りは輪郭のまま凍結する——でした。
結果として、4 臓器が作り込まれ 18 臓器がスケッチという台帳になりました。
pull はいま**順番**（どの臓器から着手するか、A2 の先へどこまで行くか）を
決めるものであり、**その臓器が本物の解剖モデルを持つかどうか**は決めません。

台帳は文章ではなく**コードが持ちます** —
[`../src/catalog/anatomy.js`](../src/catalog/anatomy.js) に全臓器 1 行ずつ、
到達 A レベルと**その根拠になっているテスト**が入っており、
`tests/anatomy-ledger.test.js` が「臓器を足したのに解剖モデルを決めていない」
状態で落ちます。現在地と残りの本数はそこを読んでください（本書に数を
書き写さない）。

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
2. **A2 は全臓器の要件、A3 は pull 型**。「名前で指せる部分に分かれている」
   ところまでは、疾患が要求するかどうかに関わらず全臓器が到達します——
   それが疾患シーンの土台であり、いまは公開している製品そのものだからです。
   その先（病態が指す脈管・管腔・組織層）を足す理由は、
   [`disease-candidates.md`](disease-candidates.md) のどれかがその構造を
   **指す必要がある**こと。どの候補も指さない血管網は、どれほど正確でも
   足しません。この pull 型は **A3 以上の装飾**にだけかかります:
   **A2 は全臓器ぶん作る。その先の装飾は pull があるものだけ。**
   A2 の品質（分離・視認性・操作性）の改善に pull は要りません——解剖層は
   それ自体が製品層であり、病態が要求していないことは後回しの理由に
   なりません（[ADR](architecture/adr-2026-09-08-anatomy-only-beta.md)）
3. **測って固定する** — 解剖学的な主張は目視ではなくランドマークの実測で
   検証し、`tests/semantic-anatomy.test.js` に落とす。手本は心臓
   （[`anatomy-review.md`](anatomy-review.md) §1 の 11 関係）。受け入れた
   単純化は model card / medical-notes に書く
4. **視認性は正確性と同格の受け入れ条件**。読めない正確さは、この製品では
   正確ではありません。解剖 upgrade の完了条件は
   「A レベルに達した」だけでなく、**実レンダリングで**
   [`organ-3d-playbook.md`](organ-3d-playbook.md) 末尾のチェックリストを
   測って通ること（architecture-rules 規則 6）。とくに繰り返し出る失敗は
   収束する先端の UV 極、両面シェルの二重合成、飽和が自分の修正を隠すこと、
   シルエットのテーパー対傾斜、壁から生える構造の根の 5 つです。
   **名前で指せる部分に分けたなら、その境界が画面で見分けられること**まで
   が A2 の達成条件で、分かれているがどこが境界か見えないものは A2 では
   ありません
5. 解剖そのものを主題にするシーン（brain-anatomy が実例）は、
   「触って理解が改善するか」の suitability check を通る場合に限り正当。
   ただ回せるだけの臓器ビューは作らない（principles §9）

**現在の A 台帳** — [`../src/catalog/anatomy.js`](../src/catalog/anatomy.js)
が所有します。ここに転記しません（2 か所に書けば必ずずれます）。読み方:

```
node -e "import('./src/catalog/anatomy.js').then(m=>console.log(
  m.anatomyGap().map(e=>e.organ+' '+e.level+' → '+e.next).join('\n')))"
```

各行は到達 A レベルと、それを支えているテストを名指しします。A レベルは
「見た目が良くなったから」上げません——上げるのは実測が通ったときだけです。

臓器ごとの具体的な仕様（目標 A レベル・名前で指せるべき単位・実測で
固定する解剖関係・受け入れる単純化・upgrade の優先順位）は
[`anatomy-specs.md`](anatomy-specs.md) が所有します。

**肺の anatomy upgrade はパイロットとして完了済みです。** ただし肺炎・
肺塞栓の現行 alpha が解く12機能領域は、18の名前つき肺区域とは別で、対応を
捏造しません。次の解剖課題は気胸が要求する臓側・壁側胸膜と胸膜腔です。

### 4.6 Model provenance — 用途と出典は status とも A とも別の軸

**方針（2026-09 追加）: 1 つの「正確さ」バッジを作らない。** シーンが公開する
主張の種類は 4 軸に分けて機械可読に持ち、CI で境界を守ります。

| 軸 | 語彙 | 所有 |
| --- | --- | --- |
| geometryBasis（形の出典） | procedural / reference-atlas / imaging-derived / hybrid / molecular | model profile |
| mechanismLevel（数値の重さ） | none / illustrative / mechanistic / literature-calibrated / externally-validated | model profile |
| personalization（誰を表すか） | representative / cohort-derived / patient-derived-geometry / patient-predictive | model profile |
| intendedUses / prohibitedUses（用途） | general-education / patient-explanation / medical-education（現行）; clinical-research / clinical-care（別系統） | model profile |

status（実装成熟度）・臨床レビュー（署名）・A スケール（臓器の解剖）はこれと
直交したまま、それぞれの既存 owner に残ります。**現行 public product は
clinical-research / clinical-care / patient-derived-geometry /
patient-predictive を一切含まず**、`tests/model-profiles.test.js` がそれを
固定します。患者説明モード（`patient` entitlement）は一般モデルの見せ方で、
patient-specific ではありません。外部 mesh は
[`asset-pipeline.md`](asset-pipeline.md) を通って asset manifest に記録され、
license obligation と QA（format / semantic integrity / anatomy expert /
visual / clinician）を通ったものだけが public scene から参照でき、
procedural の臓器ビルダーはそのまま残ります。GLB は transport format であって
provenance ではありません。
判断の全文は
[`architecture/intended-use-and-model-provenance.md`](architecture/intended-use-and-model-provenance.md)。

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

主要臓器の「教科書的な中核病態 5 問」は Explorer の coverage floor として
使います。ただし各問は suitability check と 4 点セットを個別に通し、5 本を
埋めるためだけの病態や、臨床値に見える架空の出力は作りません。

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

**現在の深さ台帳（2026-09）**

| 臓器 | status | Reel | Learning | 横断・治療・経過 |
| --- | --- | --- | --- | --- |
| heart | production（心不全）+ alpha ×2（循環・心筋虚血） | ✓ | ✓ | — |
| brain | production（Aβ）+ alpha（脳解剖アトラス） | ✗ | ✗ | 経過（進行度）が主題そのもの |
| lungs / airway | reviewed ×2（COPD・喘息）+ alpha ×3（肺水腫・肺炎・肺塞栓） | ✓ | ✓ | 肺水腫が心不全の左房圧側、肺塞栓が右室後負荷側と接続可能 |
| liver / spleen | reviewed（門脈圧亢進） | ✓ | ✓ | HRS に参加 |
| kidney | alpha ×2（HRS・濾過） | ✓（HRS） | ✓（濾過） | 2 臓器 1 循環 + 治療機序 |
| 残り 15 臓器 | prototype | — | — | — |

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
| 炎症・感染 | 肺炎・肝炎 | 浸出とガス交換への波及 | **肺炎を実装済み**（`pneumonia`、alpha）。コンソリデーションによる換気低下と灌流残存を扱う |
| 肺血管閉塞・V/Q 不均衡 | 肺塞栓症 | 並列血管領域 + 換気残存 | **実装済み**（`pulmonary-embolism`、alpha）。死腔機序と相対 PVR を扱う |
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

**名前のある解剖を主張する前に anatomy upgrade（§4.5）が入ります。** ある臓器の疾患群に
着手する前に、それらが指す構造までその臓器の A レベルを上げるのが先です。
肺パイロットは A2 + 部分 A3 まで完了しました。現行の肺炎・肺塞栓は
名前のない12機能領域に限定し、肺区域との1対1対応を主張しません。気胸は
残る胸膜・胸膜腔の upgrade 後に扱います。

**外部 asset の順序（roadmap「Model platform foundation」と同じ）**:
① HRA 正常心臓 — asset pipeline の技術検証（Phase 1）。Lab で既存の procedural
心臓・モデル駆動の心腔と比較し、production には接続しない。
② 肺 — 最初の production-facing anatomy upgrade。①で検証した工程で、
review を含む全 gate を通す。この順を変えるときは理由を書き残す。

**2026-09-08 の変更**: 公開βが「脳と心臓の解剖」になったので、①は技術検証
であると同時に**βが欠いている臓器**になりました。順序は変えませんが、
`heart-anatomy` は独立したシーンとして必要で、①の asset が gate を通らなければ
procedural で作ります。①が決めるのはジオメトリの出どころであって、
シーンを作るかどうかではありません。gate はどれも緩めません
（[ADR](architecture/adr-2026-09-08-anatomy-only-beta.md)）。

#### Tier A — 既存パターンの再利用で成立し、既存シーンと連結するもの

| 問い | 再利用するパターン | つながる既存シーン |
| --- | --- | --- |
| ~~左房圧が上がると、なぜ・どこから肺に水が出るのか（肺水腫）~~ | ~~時変エラスタンス + コンパートメント~~ | **実装済み** — `pulmonary-edema`。左房圧を境界条件として受け取り、肺側（Starling + 3 つの緩衝 + シャント）を解きます。エラスタンス閉ループとの連立は、心不全モデルの `src/models/` 移設後の課題 |
| 弁が狭い／漏れると PV ループはどう歪むか（弁膜症） | 時変エラスタンスに弁抵抗・逆流を追加 | Heart Failure |
| ~~濾過はどの段階でどう落ちるか（AKI / CKD / ネフローゼ）~~ | ~~濾過・尿細管の物質収支（新パターン）~~ | **実装済み** — `renal-filtration`。HRS の腎側と同じ臓器を共有します |

#### Tier B — パターンの新展開

脳梗塞（灌流ネットワーク + ペナンブラの時間依存）、心筋虚血（供給と需要）、
不整脈（興奮伝播 — §5.2 の新カテゴリ）。肺炎（V/Q 不均衡）と肺塞栓は
機能領域モデルとして実装済みで、次は臨床レビューと区域対応を必要とするかの判断が課題。
いずれも「時間とともに動く・複数変数が連動する」を満たす。

#### Tier C — 分子・病理過程の系譜

タウ伝播・α-シヌクレイン・血栓形成。Amyloid-β 系のパターンを継ぐ。

### 5.4 既存 prototype 14 本の扱い

**prototype シーンを全部 alpha に引き上げようとしないでください。**
prototype は臓器ジオメトリと動きの下書きとしての価値が主で、シーンとしての
進路は 2 つだけです。

1. Tier A/B の疾患シーンに**臓器ビルダーを供出**して土台になる（例:
   肺水腫が `breathingLungs` の肺を使う）
2. 当面主題化しないものは **Lab / Experimental**（Gate 0B の分割）に置き、
   公開カタログから外す

「prototype シーンを磨くこと」自体を作業単位にしない——磨くなら、
どの問いの土台になるかを先に決めます。

**これは臓器の解剖 upgrade を止める規則ではありません。** §4.5 のとおり、
その臓器の **anatomy model を A2 へ上げることは、それ自体が正当な作業単位**
です（全臓器が対象で、pull を待ちません）。区別は「シーンを昇格させる」のか
「臓器ビルダーを正確にする」のかで、後者は
[`../src/catalog/anatomy.js`](../src/catalog/anatomy.js) の `next` が
作業内容を持っています。臓器が A2 に達したからといって、それを使う
prototype シーンが自動的に alpha になるわけではありません——シーンの昇格は
[`adding-a-scene.md`](adding-a-scene.md) の別のゲートです。

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
9. **用途と出典を混ぜない** — 配信レイヤー（SNS / Interactive / Educational）は
   intended use ではない。現行 product に clinical-research / clinical-care /
   patient-specific を入れない。外部 asset は asset manifest なしに参照しない（§4.6）

### 変更の種類ごとの作法

| 変更 | 必ずやること |
| --- | --- |
| 医学的な値・式 | `npm test` を通す + [`medical-notes.md`](medical-notes.md) / evidence を更新 |
| シーン追加 | [`adding-a-scene.md`](adding-a-scene.md) の手順（suitability check → proposal → 実装 → カタログ登録） |
| 臓器の形状完成 | [`organ-3d-playbook.md`](organ-3d-playbook.md) 末尾のチェックリストを測る |
| 臓器の解剖 upgrade（A スケール） | pull 型の理由（どの疾患候補がその構造を指すか）を明記 + ランドマーク実測を `tests/semantic-anatomy.test.js` に固定 + [`anatomy-review.md`](anatomy-review.md) に記録 |
| alpha 以上への昇格 | 4 点セット + 昇格条件（adding-a-scene §8）+ `src/catalog/modelProfiles.js` への model profile 登録。臨床レビューなしで reviewed 以上にしない |
| 外部 3D asset の追加 | [`asset-pipeline.md`](asset-pipeline.md) の工程を通し、`src/catalog/assetManifest.js` に記録してから scene / profile から参照する。production の置換は Lab 比較の後 |
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
- **患者個別（patient-specific）モデルと臨床支援** — 患者説明モードは実装済み
  （`patient` entitlement、一般モデルの見せ方で患者データは扱わない）。
  患者個別値の入力・診断・治療・用量の提案は、intended-use statement・
  hazard analysis・検証データ・規制該当性を持つ別の Clinical R&D 系統の
  開始判断なしに現行 product へ入れない
  （[`architecture/intended-use-and-model-provenance.md`](architecture/intended-use-and-model-provenance.md)）
- **SSO / LTI・施設機能** — 具体的な顧客が要求するまで作らない（Gate 4）

---

## 10. 本書の更新ルール

- §3（現在地）は、状態が変わる merge（status 昇格・ゲート完了・
  モデルパターン追加）ごとに更新する
- §4–6（完成形）を変えるのは設計判断。理由を書き残す
  （所有文書側に ADR / 節を足し、本書は参照に留める）
- 所有文書と矛盾したら**本書が負け**。見つけた人が直す
