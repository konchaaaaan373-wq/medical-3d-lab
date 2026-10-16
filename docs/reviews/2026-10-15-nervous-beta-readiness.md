# 中枢神経 3 シーンの公開準備レビュー — 2026-10-15

| | |
| --- | --- |
| 作成 | 2026-10-15 |
| 対象 commit | `05ce657`（`main` 相当、branch `claude/epic-cori-mh24xt`） |
| 対象 | `brain-anatomy`（公開中）・`amyloid-beta`・`higher-brain-function` |
| 目的 | **公開にまだ足りないものを、1 件ずつ別 PR で処理できる粒度に分ける。** この文書自体は何も変えていません |
| 読み方 | 各項目は「何が足りないか → どこを触るか → 完了の定義」。番号（B-/H-/A-/C-）を PR 名に使ってください。F- 番号は [`../follow-ups.md`](../follow-ups.md) の既存項目です。着手した項目は、その PR で台帳へ移してください |

## 0. この日に測ったもの

| 検査 | 結果 |
| --- | --- |
| `npm test` | 3165 件中 3163 pass。唯一の赤は `asset-provenance` で、**shallow clone が原因**（`git fetch --unshallow` 後に pass）。CI では `fetch-depth: 0` が要る、とテスト自身が言っています（C-5） |
| `npm run verify:site` | `publishes 5`（解剖 4 ＋ `cardiac-output`）。隠したものはビルドに入っていない |
| `npm run verify:next-beta` | `amyloid-beta` は **BLOCKED: clinical review (legacy-unversioned), publication decision**。revision pin は ✅ |
| `npm run lessons` / `follow-ups` / `revisions:check` / `cards:check` / `posters -- --check` | すべて ok（台帳 217 件・revision 71 件・カード 6 枚・poster 1/1） |
| `betaPublicationProblems('brain-anatomy')` | `[]`（開いている） |
| `mechanismClaimProblems(higher-brain-function)` | `[]` — **主張の規則は通る**。残りは名指しと判断記録だけ |
| `mechanismClaimProblems(amyloid-beta)` | `its clinical review is "legacy-unversioned", and it explains a mechanism to a patient` — **患者向けの規則で止まる** |
| `assetReleaseProblems(brain-atlas-glb)` | `[]`（ただし H-1 を参照——QA の visualReview は線維束を描かない画面に対する記録） |
| 実ブラウザ（1 本ずつ、headless Chromium・software GL） | §5。**赤 3 系統**: 脳の phone 幅の拡大支点（既知 F-197）、アミロイドβの用途切替で視点が動く（新規）、`shots:phone` と `verify:patient` が全シーンで落ちる（計器が古い、新規） |

## 1. 3 本の距離（ゲートの言葉で）

ゲートは [`src/catalog/release.js`](../../src/catalog/release.js) の 1 か所です。機序シーンを β に足す前例は `cardiac-output`
（[ADR 2026-09-22](../architecture/adr-2026-09-22-mechanism-scene-in-beta.md)）で、**その ADR は一般許可ではなく、1 本足すごとに
その 1 本についての判断と記録を要求**しています。

| シーン | status | 臨床レビュー | profile の用途 | どの一覧に載っているか | ゲートが要求する残り |
| --- | --- | --- | --- | --- | --- |
| `brain-anatomy` | alpha | pending（AI 照合 4 回で approve、人の署名なし） | general / medical education | `BETA_ANATOMY_CANDIDATES`（公開中） | なし。**保つ**ための課題が §2 |
| `higher-brain-function` | alpha | pending | general / medical education（患者向けなし） | **どこにも載っていない** | `BETA_MECHANISM_CANDIDATES` への名指し ＋ 公開判断記録（asset hash と scene revision に固定）＋ ADR。`cardiac-output` と同じ足場 |
| `amyloid-beta` | **production** | **legacy-unversioned** | general / **patient-explanation** / medical education | `NEXT_BETA_DISEASE_CANDIDATES`（次期 β の疾患候補。channel 切替が要る別経路） | **現行の臨床レビュー**（人）。これが無い限り、β の機序一覧に載せても次期 β でも開かない |

**要点**: 高次脳機能は「見ていないものを見て、記録を書けば開く」位置にいます。アミロイドβは「人のレビューが無ければ開かない」位置にいます。
脳解剖は開いていますが、人の署名が無いまま公開している状態が続いており、phone 幅の拡大支点で `verify:anatomy` が赤のままです。

## 2. `brain-anatomy` — 公開を保つために足りないもの

### B-1 人間の臨床医・解剖学者の署名 — P1（F-139）

- **足りないもの**: 登録簿が `pending`。AI 照合（4 回、`5205c6b` / revision 23 で approve）は人の署名ではないと、記録自身が言っています。
- **渡す一式はもう揃っている**: 4 回分の記録・`npm run review:brain-labels` の出力・`docs/asset-provenance/brain-merged-parcels.md`・公開判断記録。
- **Claude 側でできること**: 一式を 1 つの依頼文書（`docs/reviews/` に、cardiac-output の依頼文書と同じ形式）にまとめ、署名者が答えるべき問いを列挙する。H-1 の線維束も同梱する。署名そのものは人。
- **完了の定義**: `registry.json` の `brain-anatomy` が `reviewed`・`reviewedCommit` 付きになり、`tests/clinical-reviews.test.js` が通る。

### B-2 phone 幅でホイール拡大が被写体を 18〜21px ずらす — P1（F-197、公開中のシーンで `verify:anatomy` が赤）

- **今日の実測**（§5）: `390x844: zooming on the subject moved it 21px / zooming out again left the model 18px`。1280×800 は 0px。台帳 F-197 が 2026-09-22 に切り分けた内容と一致し、**そのまま残っています**。
- **分かっていること**（F-197 より）: rescue・被写体の箱・canvas・カメラの回転・pan・tween はすべて除外済み。残る事実は「カメラが `_dollyDirection` から 7.96° ずれた向きへ動く」で、OrbitControls 0.169 の `update()` に経路が見つかっていない。
- **やること**: F-197 の案（自前の厳密なアンカー付き dolly をホイールにも使う）を実装し、`tests/zoom-anchor.test.js` に phone の構図（被写体が画面中心より下）で再現するケースを足して赤→緑を見る。
- **完了の定義**: `npm run verify:anatomy -- --scene brain-anatomy` が 390×844 で 0px を返し、台帳の F-197 を Resolved へ。

### B-3 延髄が左側だけ — 原因未確定 — P2（F-141）

- **足りないもの**: `brain.glb` の延髄は左のみ（`bx_id 196`）。上流 `itayinbarr/brainproject` の生成コードと突き合わせて原因（片側性が正常か、抽出漏れか）を決めていない。`knownDefects` には記録済み。鏡像複製は禁止。
- **完了の定義**: 原因を `docs/asset-provenance/` に記録し、(a) 正常なら表示上の注記で終わり、(b) 欠落なら上流で補った asset を新 hash で取り直し（＝公開判断の再取得）。

### B-4 統合区画の元ラベル対応 — 残り 3 点 — P2（F-142）

- **足りないもの**: (1) 原アトラス論文の LUT との突き合わせ、(2) この対応表が実際に配信中の `brain.glb` を生成したスクリプトと一致する個別記録、(3) 入力ボリュームのハッシュ再確認。`brain-merged-parcels.md` §5 に列挙済み。
- **完了の定義**: 3 点が同文書に記録され、情報カードから参照できる。

### B-5 公開判断の「確認していないこと」を減らす — P2

公開判断記録（`BETA_PUBLICATION_DECISIONS` の `unverified`）が自分で列挙している未確認:
271 構造のうち 267 を個別に開いていない／深部構造のスライダーを操作していない／1 エンジン・デスクトップのみ（タッチ・Safari・Firefox・スクリーンリーダー無し）／小脳の folia（F-38）／後面・下面の視点は技師が読んだだけ／色覚多様性の実読者なし。

- **Claude 側でできること**: 267 構造の個別選択と深部スライダーは `verify:anatomy` の拡張（`SCENE_POINTS` の全構造掃引）で機械に移せる。残り（実機・実読者・解剖学者）は人。
- **完了の定義**: 機械に移せるものを移し、`unverified` の行を減らして判断記録を取り直す（revision pin は動かないので記録の差し替えだけ）。

### B-6 アトラスのローダが 2 本 — 期限付きの重複 — P3（F-160）

- `brainAtlasSource.js`（高次脳機能用）が `BrainAnatomyScene` の読み込みを複製している。寄せると digest が動き、**公開中のシーンの判断が stale になって閉じる**。
- **やるなら**: 高次脳機能を公開する PR と**別**に、カード改訂＋公開判断の再取得を同じ PR で行う。「重複だから」だけでは触らない。

### B-7 「触れた部位が担う機能」を公開中のアトラスに出すか — **判断が先に要る** — P2（F-166）

- 高次脳機能が公開された瞬間、`providesStructureFunctions` によって**脳解剖シーンの選択パネルに機能局在の読みが自動で出ます**（フラグ付け替え不要）。
- つまり **H-9 の公開判断は、脳解剖側の公開面も変える判断**です。脳アトラスの臨床レビュー記録は「病巣同定に使ってはならない」と述べており、機能局在はその隣接領域。
- **決めること**: (a) 高次脳機能の公開と同時に出す（両方の公開判断記録に明記）、(b) 読みだけ別のレビュー単位として後回し（表示側を別ゲートにする）、(c) 脳解剖の model card に明示的に含めて一緒にレビューを受ける。
- **完了の定義**: 所有者の判断を ADR か公開判断記録に書き、`tests/public-manifest.test.js` 相当でその通りに固定する。

## 3. `higher-brain-function` — 学習者向け機序として公開する（`cardiac-output` と同じ道）

ゲートの主張規則は通っています。足りないのは**見ていないもの**と**記録**です。順序は H-1 → H-8 のあとに H-9。

### H-1 線維束 54 本を誰も見ていない — P1（F-159）

- **足りないもの**: このシーンが repo で初めて描く `bx_cat: 'tracts'` のメッシュ（弓状束・上縦束 I–III・下縦束・鉤状束・視放線ほか 54 本）について、形が妥当かの visual review が無い。asset QA の `visualReview` は **`scene: 'brain-anatomy'`**、つまり線維束が 1 本も写っていない画面の記録。
- **今日の絵**（§5）: 390×844 の初期画面で、弓状束らしい束が皮質の内側に細い線として見えるだけ。
- **先に決めること**: 束が皮質の内側に隠れて実質見えていないなら「描いた」と言えるのか。
- **やること**: 線維束を出した状態の実レンダリング（`shots:anatomy` 相当を preview で、半球を透かした視点を含む）を撮り、`assetManifest.js` の QA に `scene: 'higher-brain-function'` の visualReview を**別記録**として足す。解剖学的妥当性は人（B-1 の署名者に同梱）。
- **完了の定義**: QA に 2 本目の visualReview があり、`docs/asset-qa/brain-atlas-glb.md` に束の絵が載る。

### H-2 連絡（connection）に左右が無い — P2（F-165）

- **足りないもの**: ノードは左右を持つが連絡は 1 本ずつ。`thalamus-to-dlpfc` を切ると両側が切れ、視床皮質離断が**実際より重く**出る。カードには明記済み。
- **決めること**: 公開前に直す（connection に side を持たせ、脳梁のように正中 1 本が正しいものと区別する設計）か、「既知の近似」として `unverified` に載せて公開するか。
- **完了の定義**: どちらかを選び、直すなら `tests/higher-brain-function-model.test.js` に片側病変で対側が残るケースを足す。カード改訂（revision が動く）は H-9 の前に済ませる。

### H-3 左半球が画面の左に見えるか、測っていない — P2（F-163）

- **足りないもの**: 側は `bx_side` から解決しており座標は見ていない。既定視点で優位半球の下前頭回病変が外側面に見えることは、絵で 1 回見ただけ。
- **やること**: `verify:anatomy` の「既定視点で特定構造が見えるか」を病態シーンにも使えるようにし、このシーンで走らせる。
- **完了の定義**: スクリプトが既定視点で優位半球側の病変メッシュの可視を測り、赤くなることを 1 回確かめる（反転して赤→戻して緑）。

### H-4 `verify:ui` がこのシーンを見られない — P2（F-162）

- **足りないもの**: `src/app/viewports.js` の `SURFACES` は scene 面を `#/brain-anatomy` 1 本で代表。非公開シーンは locked ページとして測られる。今日の `verify:ui` は宣言した全 surface で緑ですが、**このシーンは見ていません**（H-7 のはみ出しは絵でしか分からない）。
- **やること**: preview ビルドを渡したときだけ非公開 scene も surface に含める。
- **完了の定義**: `npm run verify:ui -- --dist dist-preview --preview` で `#/higher-brain-function` の overflow・44px・tab 巡回が測られ、H-7 が赤として出る。

### H-5 学習モジュールが無い／台帳が一部古い — P3（F-164）

- `getReel()` は**実装済み**（`reelStoryboard.js`、`tests/higher-brain-function-reel.test.js`）なのに F-164 は「Reel を持っていない」と書いたまま。台帳を直す。
- `getLearningModules()` は無い。「弓状束だけ切ると復唱は？」は予測→操作→説明に向く主題。公開の必須条件ではない（`alpha` で公開できる）。
- **完了の定義**: 台帳の訂正。教材を書くなら `tests/learning.test.js` がモデルから正解を再導出する形で。

### H-6 公開面に出すための実データ — P2

公開すると `tests/model-showcase.test.js` が「公開された病態モデルは写真と問いを持つ」を要求します。
- `src/data/modelShowcase.js` に `higher-brain-function` の問い（モデルの出力と突き合わせたもの。F-250 の轍を踏まない）
- `npm run posters` で写真（公開ビルドから撮るので、H-9 と同じ PR か直後）
- `npm run cards` でリンクプレビュー（`cards:check` は `CRAWLABLE_SCENES + 1` 枚を要求）
- `LANDING_MODEL_ORDER` の位置を公開分の先頭群へ移す（`cardiac-output` の前例どおり）

### H-7 phone（390×844）でタイトルカードが切れ、操作列が 2 段に折れる — P2

- **今日の絵**（§5、`shots:phone --preview`）: 左上のタイトルカードが右列（凡例・「操作パネルを隠す」）と幅を取り合い、**「高次脳機能と、それ」「このモデルについて アルフ」で文字が切れる**。モデルの上半分がカードの下に入る。操作列は 9 ボタンで、カメラが 2 段目に落ちる。
- **やること**: 病態シーンの phone レイアウト（`cardiac-output` が同じ shell で通っている形）に合わせる。直したあと H-4 で機械に測らせる。
- **完了の定義**: タイトル・「このモデルについて」が切れず、操作列が 1 段（または意図した折り方）になる絵と、`verify:ui`（H-4 後）の緑。

### H-8 model card の「既知の失敗」を公開判断の `unverified` に写す — P2

カード §10 が列挙する**モデル自身の限界**（脳梁に膨大部が無い／中心前回に体部位局在が無い／読字と視覚性呼称が 1 経路／Gerstmann は最も根拠の弱い主張で dossier が `uncertain`／線維束は未レビュー）は、`cardiac-output` の前例と同じく公開判断記録の `unverified` に 1 行ずつ写す。**臨床レビュー無しで公開する**ことも ADR に明記する（cardiac-output の ADR §「What this knowingly accepts」と同じ形）。

### H-9 名指し・公開判断記録・ADR・テストの固定 — P1（H-1〜H-8 のあと）

1. `docs/architecture/adr-2026-MM-DD-higher-brain-function-in-beta.md`——1 本についての判断。受け入れるもの（臨床レビュー無し・線維束の解剖学的妥当性未確認・連絡の側性）と、担保（`alpha` バッジ・`医学レビュー：未完了` チップ・scope panel の禁止用途）。**B-7 の判断を含める**
2. `docs/beta-publication/higher-brain-function.md`——何を確認したか／していないか／どの版か
3. `src/catalog/release.js`: `BETA_MECHANISM_CANDIDATES` に追加、`BETA_PUBLICATION_DECISIONS` に 1 件（`assetRevisions: { 'brain-atlas-glb': <manifest の sha256> }`、`sceneRevision` は `npm run verify:next-beta -- --pins` と同じ要領で**製品から読んだ値**。いまは card revision 1 / digest `7f810397a9925074` だが H-2・H-8 でカードを改訂すれば動く）
4. `tests/beta-release.test.js`（`:61` の一覧 pin、`:113` / `:392` の公開一覧）と `tests/public-manifest.test.js` を更新
5. `npm run build && npm run verify:site` で `publishes 6`、`npm run verify:anatomy -- --scene brain-anatomy` を**再実行**（共有コードを触ったら必ず）、`shots:anatomy` で脳解剖の選択パネルに機能の読みが出ることを目視
6. `CHANGELOG.md` Unreleased に 1 項目、`docs/follow-ups.md` に未確認の件数と番号

## 4. `amyloid-beta` — 患者向けを含むので、人のレビューが先

### A-1 現行基準の臨床レビュー — P1（F-40・NEXT-BETA-REVIEW §1）

- **足りないもの**: 登録簿が `legacy-unversioned`。profile が `patient-explanation` を宣言し `access.patient: true` なので、β の機序一覧に載せても次期 β でも**現行レビュー無しでは開かない**（設計どおり）。
- **渡す一式はある**: `docs/clinical-reviews/packets/amyloid-beta.md`（`npm run review:packets` が生成、7 段 × 確からしさ）、`amyloid-beta-patient-7-steps.md`（段ごとの根拠と「確認してほしい点」）、model card・dossier。
- **レビューで最重要の 3 点**（既存記録より）: 段 3 の「関連」と「原因」の分離、段 6 の「量から個人は分からない」の強さ、段 7 の中立性。
- **完了の定義**: `registry.json` が `reviewed`・`reviewedCommit` 付き。手順は [`../decisions/NEXT-BETA-APPLY.md`](../decisions/NEXT-BETA-APPLY.md) Step 1。
- **代替案（学習者向けだけ先に開く）**: profile から `patient-explanation` を外し `access.patient` / `uses.patient` も外せば、H-9 と同じ道で臨床レビュー無しに開けます。ただし患者ガイドは `PATIENT_GUIDE_SCENE_IDS` に残り、次期 β のゲートはそれも患者向けの根拠に読むので、**「患者向けをやめる」のではなく「患者向けはレビュー後」という宣言の仕方**を決めてからにしてください。所有者の判断。

### A-2 `production` なのに、`alpha` 以上の 4 点セットが揃っていない — P2

- CLAUDE.md は `alpha` 以上に **モデル層・evidence dossier・model card・scope panel** を要求し、`production` には臨床レビューを含めています（`adding-a-scene.md` §「なぜ production まで上げないのか」）。
- アミロイドβは: カード ✅・dossier ✅・**scope panel ✗**（`static meta` に `modelScope` が無い。高次脳機能にはある）・**モデル層 ✗**（`aggregationLayout.js` が `src/scenes/` にあり `src/models/` に無い。`three` を import しないなら移せる）・**臨床レビュー ✗**。
- **決めること**: status を `alpha` に下げる（Prototype バッジではなく alpha の扱い。ゲートは `alpha` を通す）か、`production` のまま 4 点を揃えるか。ドキュメントと現物の矛盾を残さない。
- **やること**: `modelScope` を足す（禁止用途: diagnosis / biomarker interpretation / staging / prognosis / treatment）。`aggregationLayout.js` を `src/models/amyloidBeta.js` に移すなら `revisions.json` の `modelSources` も動く（カード改訂）。
- **完了の定義**: scope panel が画面に出て `tests/model-profiles.test.js` 相当で固定される。

### A-3 catalog に `modelCard` が無い — P3

- `SCENE_MANIFEST` の `amyloid-beta` に `modelCard` フィールドが無い（`revisions.json` と docs にはある）。他の alpha 以上のシーンは持っている。追加して整合させる。

### A-4 showcase の問いと写真 — P2（F-250）

- `modelShowcase.js` の問い「分子は、どのように老人斑へ変わるのか」は依頼文の例で、**モデルの出力と突き合わせていない**。`tests/model-showcase.test.js` に cardiac-output と同じ形の照合を足す。
- poster は無い（公開されたら `npm run posters`）。

### A-5 患者向け文言の版 — P3（F-232 の注記）

- `amyloid-beta-patient-7-steps.md` の引用文は旧版で、現行は packet 側。レビュー依頼時に packet を渡す（混ぜない）。

### A-6 `legacy-unversioned` の表示 — P3

- Trust の文言は「過去のレビュアーや確認済みバージョンの記録はありません」で正確。公開後もこのまま見せるのではなく、A-1 で `reviewed` に変わる前提。

### A-7 用途の切替（医療者向け ⇄ 患者向け）で視点が動く — P1（新規、`verify:purpose` が赤）

- **今日の実測**（§5）: `#/patient → amyloid-beta` は 3 幅とも患者説明で開くが、**切替で視点が変わる**——距離 36% / 55% / 54%、仰角 約 21°。同じ検査を `heart-failure` に当てると 0.0% / 2°で緑なので、**このシーン固有**。
- CHANGELOG は「同じモデルの同じ状態を、再読み込みせず視点も動かさずに切り替える」を約束しています。契約は [`../pathology-explanation-handoff.md`](../pathology-explanation-handoff.md)。
- **疑うところ**: 患者説明の開始時に `getStageView()` / `cameraPose` を当て直している経路（`AmyloidBetaScene.getStageView`）か、患者ガイドの最初の段が `progress` と視点を同時に書いている。心不全が何をしないかを基準に切り分ける。
- **完了の定義**: `npm run verify:purpose -- --dist dist-preview --preview --scene amyloid-beta` が 3 幅で `kept the view`。

### A-8 phone（390×844）で用途の切替ボタンが wordmark に重なる — P2（新規、絵で確認）

- **今日の絵**（§5）: 患者説明を持つシーンでヘッダーに「医療者向け | 患者向け」が出ると、**`BYOKI MOTION` の wordmark の上に切替が被さり `MOTION` が隠れる**。公開版には患者説明を持つモデルがまだ無いので今は出ない（F-248）が、A-1 が通った瞬間に公開面の不具合になる。
- **やること**: ヘッダーの 390px レイアウトで wordmark と切替の幅を分ける。`verify:ui` の `SURFACES` に「患者説明を持つシーンのヘッダー」を preview で加えて測る（H-4 と同じ穴）。
- **完了の定義**: 重ならない絵と、`verify:ui` の overlap 0。

### A-9 `verify:disease` は通るが、測っているのは進行スライダーだけ — P3

- `amyloid-beta: 0 control(s), baseline → disease → reset all observed` で緑。このシーンは `setProgress` の 1 軸だけで `getModelControls` を持たないので、検査は「スライダーを動かして戻す」以上を測っていない。動画書き出しは「この環境の Chromium は canvas を encode できない」で未計測（CI の `final-browser-validation` が持つ）。公開前に CI 側で 1 回走らせる。

## 5. 実ブラウザ検証（2026-10-15、headless Chromium・software GL・1 本ずつ）

| 検査 | 対象 | 結果 |
| --- | --- | --- |
| `verify:anatomy -- --scene brain-anatomy`（公開ビルド） | 脳 | 271 構造、クリックで 4 構造命名、8 視点、2 配色、群の一括非表示、再試行 3 系統、1280×800 の拡大支点 0px。**赤 2 件**: `[390x844] zooming on the subject moved it 21px`／`zooming out again left the model 18px`（= F-197、B-2） |
| `verify:disease -- --dist dist-preview … amyloid-beta` | アミロイドβ | 緑。`0 control(s), baseline → disease → reset all observed`。書き出しは未計測（A-9） |
| `verify:purpose -- --dist dist-preview --preview --scene amyloid-beta` | アミロイドβ | **赤 3 件**: 3 幅とも `switching purpose changed the viewpoint`（A-7）。比較対象の `heart-failure` は緑 |
| `verify:patient -- --scene amyloid-beta --dist dist-preview --preview` | アミロイドβ | **計器が古くて落ちる**（C-6）。`.patient-mode-button` を押そうとするが、`#ui[data-purpose] .button-row .patient-mode-button { display: none }`（`purpose.css`）で隠れている。用途切替はヘッダーへ移った（F-248）ので、この検査は `verify:purpose` に置き換わっている |
| `shots:phone -- --scene <slug> --dist dist-preview --preview` | 高次脳機能・アミロイドβ・**脳（公開ビルド）** | 1〜4 枚目は撮れる。**5 枚目で 3 本とも落ちる**（C-6）: `.account-trigger`（ログイン）が phone で不可視。リデザイン（#168）後にこの計器を誰も走らせていない |
| `verify:ui`（公開ビルド） | 宣言された全 surface | 緑（`Every declared viewport and surface met the declared rules`）。ただし高次脳機能と「患者説明を持つシーンのヘッダー」は surface に無い（H-4・A-8） |
| `verify:gated`（公開ビルド） | 有料面 | 3 件「no control to open it, in a preview build」で赤。**公開ビルドに当てたので想定どおり**（CI は `--dist dist-preview` で走らせる）。3 シーンとは無関係 |
| 絵（`shots/hbf-phone`, `shots/amyloid-phone`, 390×844） | 高次脳機能 | タイトルカードの文字切れ・操作列 2 段（H-7）。線維束は皮質の内側に細い線（H-1） |
| 絵 | アミロイドβ | 用途切替が wordmark に重なる（A-8）。注意書きが日英 2 行で操作列の下に出る（設計どおりか要確認） |

絵は `/tmp` 側に置いたので repo には入れていません。必要なら上のコマンドで撮り直せます（`shots/` は `.gitignore` 済み）。

## 6. 横断・周辺で見つけたもの

### C-1 `lung-anatomy` の model profile の `basis` が膵臓の説明になっている — P2

- `src/catalog/modelProfiles.js` の `lung-anatomy-procedural-atlas` の `basis` が「Built in code by cutting the pancreas's own axis …」。**公開中のシーン**の出典記述が別臓器のコピペ。`basis` は現在どの UI にも描画されていないので読者には出ていないが、記録として誤り。
- **完了の定義**: 肺の記述に直し、`tests/model-profiles.test.js` に「`basis` が自分の臓器名を含み、他の臓器名を含まない」程度のガードを足す（壊して赤を見る）。

### C-2 `mechanismClaimProblems` の `scene.patient` は catalog が設定しない欄 — P3

- ゲートは `profile.intendedUses` に `patient-explanation` があるか **または `scene.patient === true`** を見るが、catalog は `access.patient` に持っており `scene.patient` は常に `undefined`。profile 側の検査で実害は無い（`tests/model-profiles.test.js` が `patient: true` → `patient-explanation` 宣言を強制）。`scene.access?.patient` に揃えるか、欄を消す。

### C-3 `verify:ui` の scene 面が 1 本 — P2（F-162、H-4・A-8 と同じ）

### C-4 実機未確認 — P2（F-251）

- iPhone Safari / Android Chrome で未確認のまま BYOKI MOTION になった。3 シーンとも対象。人。

### C-5 CI が shallow clone でこのテストを落とす — P2

- `tests/asset-provenance.test.js` は shallow clone で赤。CI の checkout に `fetch-depth: 0` が入っているか確かめる（入っていなければ恒常的に赤＝壊れた計器）。

### C-6 リデザイン後に古くなった計器が 2 本（`shots:phone`・`verify:patient`） — P1（壊れた計器は直す）

- `shots:phone` は全シーンで 5 枚目（`.account-trigger`）で落ちる。`verify:patient` は隠れたボタンを押そうとする。CLAUDE.md の道具表に載っている計器が、公開中のシーンでも落ちる状態。
- **やること**: `shots:phone` はログインの撮影をヘッダーメニュー経由に直すか、その 1 枚を外す。`verify:patient` は `verify:purpose` に統合して表から消すか、`verify:purpose` を呼ぶ薄い別名にする。どちらも [`../verification-lessons.md`](../verification-lessons.md) に 1 項目（「リデザインで DOM が変わったとき、計器は赤くならず timeout で死んだ」）。
- **完了の定義**: `npm run shots:phone -- --scene brain-anatomy` が最後まで通り、`verify:patient` が存在しないか通る。

## 7. 推奨する順序（1 件 1 PR）

公開面を動かす仕事を先に。人が要るもの（B-1・A-1）は依頼文書を先に出して並行させる。壊れた計器（C-6・B-2）は他の全部の信号を殺すので、最初に。

1. **C-6** 計器を直す（`shots:phone`・`verify:patient`）
2. **B-2** phone 幅の拡大支点（F-197、公開中の脳で赤）
3. **B-7** 判断（高次脳機能の公開が脳解剖の表示を変えることを、所有者が決める）
4. **H-1** 線維束の visual review 記録（見えていないなら、描くかどうかの判断）
5. **H-2** 連絡の側性（直すか、既知の近似として受け入れるか）
6. **H-7 → H-4 / H-3** phone レイアウトを直してから、`verify:ui` と可視性の計測を preview の病態シーンへ
7. **H-5 / H-6** 台帳訂正・showcase の問いと写真
8. **H-8 → H-9** 公開判断記録・ADR・名指し・テスト固定・`verify:anatomy` 再実行 → **公開**
9. **A-7 / A-8** 用途切替の視点ずれ・ヘッダーの重なり（レビュー対象の版を固める前に）
10. **A-2 / A-3 / A-4** scope panel・モデル層・catalog の整合・showcase の問いの照合
11. **A-1** 依頼文書を出す（人）→ 返ってきたら NEXT-BETA-APPLY Step 1〜3 → 名指し → **公開**
12. **B-1** 署名依頼（人、H-1 の線維束を同梱）、**B-3 / B-4** 上流の突き合わせ
13. **C-1 / C-2 / C-5** 周辺の整合
