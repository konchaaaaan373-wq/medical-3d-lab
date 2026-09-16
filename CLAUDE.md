# CLAUDE.md

Three.js + Vite. 依存は `three` のみ。素の JS + JSDoc、フレームワークなし。

```bash
npm run dev        # vite
npm test           # node --test "tests/*.test.js"
npm run build      # vite build
```

- `src/catalog/` — **どんな system / organ / scene が存在するか**。ここが唯一の登録先。
  `modelProfiles.js`（各シーンの主張の種類）と `assetManifest.js`（外部 asset の出典）もここ
- `src/models/` — **医学モデル層**。純粋な JS で、`three` も DOM も import しません。
  `node --test` だけで検証できることが条件です。詳細は
  [`src/models/README.md`](src/models/README.md)
- `src/app/` — シーンと UI の接続。`App.js` はシーンの中身を知らない
- `src/scenes/<system>/organs/<organ>.js` — 臓器のジオメトリ。疾患シーン間で再利用する
- `src/scenes/<system>/scenes/<scene>/` — 1 シーン = 1 モジュール
- `src/scenes/shared/` — 全臓器シーンが載る土台（shell / materials / geometry / motion）
- `src/data/<theme>.js`, `src/data/prototypes/<system>.js` — ステージ定義・配色・文言。
  描画コードに文章を書かない
- `src/components/` — 素の DOM の UI パーツ
- `tests/` — カタログ整合性と医学モデルの整合性テスト（`node --test`）
- `docs/model-evidence/<scene>.md` — その主張がどこから来たか
  （Claim → Source → Implementation → Assumption → Validation）
- `docs/model-cards/<scene>.md` — そのモデルが答える問い、答えない問い、
  誤解を生みうる場所
- `docs/architecture/intended-use-and-model-provenance.md` — 用途と出典の境界の所有文書。
  `docs/asset-pipeline.md` — 外部 3D asset の工程と停止条件
- `docs/pathology-explanation-handoff.md` — 病態シーンが臨床家向けと患者向けの
  両方を持つための契約と、その境界。`docs/pulse-engine-poc.md` — Pulse Physiology
  Engine を調べた結果と、なぜまだ何も繋いでいないか
- `docs/follow-ups.md` — **マージ済みだが未確認・未決定・先送りの残課題台帳**。
  一区切りの PR を出すときはここに書き足し、解決したら Resolved へ移す

### 着手する前に、それが誰の何を良くするのか言う

台帳を上から消化するのは作業であって、仕事ではありません。**着手前に
「これは誰の何を良くするのか」を 1 文で言えないなら、やらない。**

実例（2026-09-15、やってしまった側）: entry chunk の gzip を 89.7 → 65.9 kB に
削りました。正しい修正ではありましたが、**その直後に脳アトラスを 3.9 MB
ダウンロードします**。0.6% です。同じ時間で、β が公開しているシーンは
1 件のまま、`heart-anatomy` はゲートの前で止まったままでした。
CLAUDE.md が禁じる「中身のない網羅」の、インフラ版です。

区別の仕方:

- **壊れた計器は直す。** チェックが恒常的に赤い／原因を誤って報告しているのは、
  それ自体が他の全部の信号を殺すので本質的です（F-125 はこれ）
- **予算・重複・整理は、詰まっているときだけ。** 余裕があるうちは台帳に置く
- **公開面を動かす仕事が、ほぼ常に優先。** どの臓器が名前で指せるようになるか、
  どのシーンが公開に入るか

### 同じ車輪を二度作らない

**測る前に、それを測る道具がもうあるか探す。** この repo は検証用の実ブラウザ
基盤を既に持っています。使い捨てスクリプトを書く前にここを見てください。

| 何を測るか | 道具 |
| --- | --- |
| viewport × surface（overflow / 重なり / タッチ目標 / tab 巡回 / 属性の言語） | `npm run verify:ui` |
| 解剖シーンの操作（選択・drag is not click・シート・拡大の支点） | `npm run verify:anatomy` |
| hero のタッチとキーボード | `npm run verify:hero-input` |
| ログイン周り | `npm run verify:auth` |
| 静的サーバ（range・traversal ガード・mount） | `scripts/lib/serve-dist.mjs` |
| Chromium の実行ファイル解決 | `scripts/lib/browser.mjs` |
| 端末状態の撮影 | `npm run shots:phone` / `npm run shots:anatomy` |

**一度きりの調査で終わらせない。** 使い捨てで測って捨てると、次の人が同じものを
また書きます。測って意味のあったものは、上のどれかに足してください。

**実ブラウザ検証は 1 本ずつ走らせる。** software GL なので 1 本で 4 コアを
使い切り、`verify:anatomy` は脳アトラスで 10 分前後かかります。並行させると
全部が遅くなるだけでなく、`pkill` したあと `chrome` が PPID 1 の孤児として
残り、次の実行を飢えさせます。遅いと感じたら、まず
`ps -eo pid,ppid,time,comm --sort=-time | head` で孤児を疑ってください。

**待つときは、時間ではなく状態を待つ。** 固定の `waitForTimeout` で測った値は
嘘をつきます——実例: 拡大の支点を 600ms 後に測って「124px ずれている」と
報告しましたが、実際は同意カードを閉じた直後のフレーミング tween が
走っている最中でした。pose が止まるまで待つと 0px です。

**git の履歴を測る前に、その clone が shallow でないか確かめる。**
この環境の clone は既定で shallow です。`.git/shallow` に載っている境界 commit には
親が無いので、**`git show --diff-filter=A` はその tree の全ファイルを「追加」と報告し**、
`git merge-base --is-ancestor` は切れた履歴の向こう側に届きません。
実例（F-120）: 「脳の `introducedIn` は main から到達できない」という指摘を受け、
確かめたら確かに `NO` が返り、境界 commit が「brain.glb を追加している」ようにも
見えました。**両方とも truncation の作り出した嘘**で、
`git fetch --unshallow` して測り直すと元の記録が正しく、指摘に従っていれば
無関係な commit を provenance に書き込むところでした。
本当に誤っていたのは心臓の 1 件だけです。
`git rev-parse --is-shallow-repository` が `true` を返すなら、
その履歴からは何も結論しないでください。

### マージは小さく、頻繁に

**1 件直したら 1 本出す。** PR を寝かせて複数の主題を積まないでください。

これは好みではなく、実測された費用です。PR #72 は 5 つの独立した主題
（hero の部位名、タップ判定、モバイルレイアウト、44px タッチ床と属性の言語、
拡大の支点）を 1 本に抱えて 59 files / +5,265 まで育ち、その間に main が 2 回進んで
マージ 2 回と競合 1 回を余計に踏みました。さらに実機確認が deploy preview 依存に
なり、**古いバンドルを見ていたのか判別できない往復**が発生しています。
そして最後まで、main には **このブランチが直し終えている不具合が 12 件**
（`verify:ui` で main 18 件 / ブランチ 6 件）残ったままでした。

- **未確認は PR を止める理由になりません。** それが `docs/follow-ups.md` の役目です
  ——「マージ済みだが未確認」を持つのがこの台帳で、Draft で抱え続けることではない。
  未確認の項目は**件数と番号を台帳に書いてから**マージする
- **実機確認は production の 1 本の URL で行う。** preview のキャッシュ疑いを
  毎回切り分けるより安い
- マージを止めてよいのは、**ローカル検証が落ちている**ときと、
  **公開シーン一覧や公開判断が動く**とき（`betaPublicationProblems()` が
  空でなくなるとき）です。それ以外は出す

ルーティングはハッシュ 1 本です。`#/<slug>` が 1 シーン、`#/organs`
（別名 `#/explore`）が全身の Organ Explorer。ルートは `src/catalog/scenes.js`
から生成されるので、**シーンを増やしても routing に手を入れません**。

---

## 作業は Claude 側で完結させる

**人間に手順書を渡して終わりにしないでください。** 実行できるものは実行し、
結果を報告する。これが既定の進め方です。

- 検証コマンドを「手元で実行してください」と案内しない。CI から実行できるなら
  ワークフローにする（`verify:live` がその例：
  `.github/workflows/verify-live.yml`）。GitHub Actions は
  `mcp__github__actions_run_trigger` で起動でき、ログも読めます
- リポジトリの外にしか無い設定（Netlify / Stripe / Supabase のコンソール）は
  本当に人手が要る数少ない例外です。その場合も、**回数を最小にする**
  ——「変数を UI で毎回設定」ではなく `netlify.toml` に持たせる、のように、
  次回から人手が要らなくなる形に寄せる
- 人手が要る作業を頼むときは、**判断が要る点だけを一度にまとめて**聞く。
  1 手ずつ往復させない

---

## Product definition

> **Make invisible physiology visible, interactive, and understandable.**
> 見えない病態生理を、3D で動かし、触って理解する。

対象は心臓と脳だけではなく **人体全体** です。最終的に anatomy / physiology /
pathology / disease progression / treatment mechanism を臓器横断的に扱います。

**製品は 2 つの層でできています。**

1. **解剖層** — それ自体が利用価値と品質基準を持つ製品です。「名前で指せる」
   ことが提供する価値であって、病態モデルの前座ではありません。到達点は
   `brain-anatomy` と同じ A2 水準（名前で指せる部分に、閉じたメッシュとして
   分かれている）で、**すべての臓器が持ちます**
2. **病態層** — その解剖基盤の上に載る別の層。時間変化・因果・複数変数の連動を
   扱います。病態は解剖を指すので、指す先が無ければ何も主張できません

**この 2 層は独立して品質を上げます。** 解剖の精度・視認性・操作性の改善を
「病態が要求していないから」という理由で後回しにしないでください。
2026-09 の公開βは解剖層だけを公開しています
（[ADR](docs/architecture/adr-2026-09-08-anatomy-only-beta.md)）。

禁じているのは**中身のない網羅**です——出典も、名前で指せる分離も、
到達度の記録も無いまま臓器ビューを量産すること。「名前で指せる」を満たさない
「ただ回せるだけの臓器ビュー」は、解剖層の成果として数えません。
どの臓器がいまどこにいるかは [`src/catalog/anatomy.js`](src/catalog/anatomy.js)
が持ち、`tests/anatomy-ledger.test.js` が抜けを検出します。方針は
[`docs/grand-design.md`](docs/grand-design.md) §4.5、臓器ごとの仕様は
[`docs/anatomy-specs.md`](docs/anatomy-specs.md)。

設計判断の source of truth は
[`docs/product-principles.md`](docs/product-principles.md) です。
アプリ全体の完成形・現在地・優先順位と、**どの文書が何を所有しているかの地図**は
[`docs/grand-design.md`](docs/grand-design.md) にあります。触る領域の所有文書が
分からないときは、まずそこの document map を引いてください。
何かを追加・変更する前に、以下を前提にしてください。

- **3D is a means, not the goal.** 2D の静止画より理解が明確に改善しないなら
  3D にしない。「回せると格好いい」は理由にならない
- **Two layers, two quality bars.** 解剖層は「名前で指せること」で、病態層は
  「時間変化・因果・複数変数の連動」で評価します。**病態層の基準を解剖層に
  当てて、解剖の改善を却下しないでください。** 逆も同じです
- **Favor dynamic concepts（病態層の基準）.** 病態シーンは時間変化・因果・
  複数変数の連動があるものを選ぶ。解剖モデルは全臓器ぶん作りますが、
  それは「ただ回せるだけの臓器ビュー」を量産することではありません
- **Accuracy you cannot see is not accuracy.** 名前で指せる部分に分けたなら、
  その境界が実レンダリングで見分けられるところまでが完了条件です
  （[`docs/organ-3d-playbook.md`](docs/organ-3d-playbook.md) 末尾のチェックリスト）
- **One medical source of truth.** 1 つの医学 state から 3D・数値・グラフ・
  ラベル・SNS・教材がすべて派生する。グラフ用に別の近似を書かない
- **Never alter physiology for visual impact.** 見えにくいときに動かすのは
  lighting / camera / color / opacity / animation timing であって、
  臨床パラメータではない
- **Separate medical and visualization parameters.** 臨床的な値は臨床的な名前と
  単位で（`edvMl`, `endDiastolicPressureMmHg`）、演出値はそれと分かる名前で
  （`glowIntensity`, `presentationEmphasis`）
- **Every feature should serve SNS / Interactive / Educational value.**
  「この機能はどの層の、どのユーザー価値を改善するのか？」に答えられない機能は
  追加しない。Interactive Web が中核、SNS は入口、Educational は定着
- **Heart Failure is the reference implementation.** 深く作り込むときは
  `src/scenes/cardiovascular/scenes/heartFailure/` の構造を基準にする。
  モデル層を分離した新しい書き方は `src/models/copd.js` +
  `src/scenes/respiratory/scenes/copd/` を参照

### Organ と Disease を混ぜない

臓器のジオメトリは `src/scenes/<system>/organs/` に、
それを使う 1 つの主題は `src/scenes/<system>/scenes/<scene>/` に置きます。
`normal-lung` と `asthma` は**同じ肺のジオメトリをパラメータ違いで使う 2 つのシーン**
であって、肺を 2 回モデリングしたものではありません。
臓器ビルダーに疾患名を持ち込まないでください。

**このルールが禁じているのは「同じ縮尺・同じ目的で 2 回作ること」です。**
縮尺か目的が違うビルダーが 1 臓器に 2 本あるのは正常で、実際そうなっています——
`organs/heart.js`（全身ビュー用のランドマーク）と heartFailure の
`ventricleGeometry.js`（モデルが解いた壁厚と内腔から生成）、`organs/kidney.js`
（臓器レベル、4 シーンが使用）と `organs/nephron.js`（ネフロン 1 本）、
`organs/brain.js`（形だけ）と `scenes/brainAnatomy/`（標本由来アトラス）。
**片方を「重複」と見て消さないでください。** 各ファイルの冒頭が、自分が何であって
何ではないかを述べています。

系として、**臓器を α に進めてもスケッチは消えません。** これまで起きたのは
「スケッチがそのまま育って named-structure 級になる」（`lungs.js`）か、
「目的の違う 2 本目が増えてスケッチは全身ビュー担当として残る」（heart・腎・脳）の
どちらかで、置き換えは一度も起きていません。仮に本当に用済みになった版があっても、
`src/` に死んだコードとして残さないでください——git が版を持っており、
`git log --follow <path>` で読めます。

### いま公開しているのは「解剖」だけ（β）

現在は **β 公開中**で、公開しているのは **3D 解剖モデル**だけです。
病態・生理のモデルは開発を続けますが、β には出しません。
それ以外はルートもカタログのカードも「TO BE UPDATED / 準備中」で止めています。

範囲は臓器名では固定しません——**ゲートを通った解剖シーンから、1 バッチずつ**
開きます（[ADR 2026-09-14](docs/architecture/adr-2026-09-14-anatomy-beta-by-organ.md)）。
現在の公開は **10 件**（脳／肺・肝・腎／胃・食道・腸・胆道・膵／皮膚）。順番は
[`docs/public-release-roadmap.md`](docs/public-release-roadmap.md) §1Z が持ちます。

**バッチを小さく保つ理由は、ゲートが通ることと「見たこと」が別だからです。**
B1（肺・肝・腎）は `npm run verify:anatomy` が 3 件とも通ったあと、
全視点をレンダリングして初めて欠陥が 3 つ出ました。B2（胃ほか）でも同じで、
**中空の臓器の断面が「肉の塊」になっていた**ことは、絵を見るまで誰も気づいて
いませんでした。B3 は 3 件で始めて **1 件になりました**——眼と耳はゲートを
通りますが、眼は開始状態が白い球で、耳の蝸牛はコイルばねです（F-126）。
**3 バッチ続けて、共有コードの欠陥は絵でしか見つかっていません。**
**新しい臓器を公開するときは、必ず実レンダリングを見てください**
（`npm run shots:anatomy -- --scene <slug> --preview`）。

**心臓の解剖シーン（`heart-anatomy`）は存在しますが、まだ公開できません**
——候補 asset が asset release gate を通っておらず、公開判断記録もありません。
だからといって心臓の病態シーンを代わりに公開しません——
病態モデルはラベルを変えた解剖モデルではないからです。
心臓が公開に入るのは `heart-anatomy` が下のゲートを通った日で、
そのとき hero もカタログもクロール面も編集不要です。

判定は `src/catalog/release.js` の 1 か所だけが持ちます。
名前が候補一覧にあることは公開ではなく、`betaPublicationProblems()` が空
——登録済み・解剖の主張のみ（model profile の mechanism level が `none`）・
asset release gate 通過・レビュー記録が stale でない・**その asset の hash に
結びついた公開判断記録がある**——のときだけ開きます。
**公開シーンの一覧をどこかに書き写さないでください。**
UI が読む公開一覧は [`src/catalog/publicManifest.js`](src/catalog/publicManifest.js)
の 1 本で、`ready: false` のような仮データは作りません。

開発は止まりません。`npm run dev` は無条件で全部見えますし、
`VITE_ALLOW_PREVIEW=1 npm run build` で作ったビルドは `?preview=1` で
アンロックできます（`?preview=0` で解除）。
**production ビルドはアンロックできません**——`?preview=1` も保存済みの値も
効かず、非公開シーンのコードはそもそもバンドルに入りません。
詳細と β の終わらせ方は [`docs/beta-release.md`](docs/beta-release.md)。

トップページの hero は臓器を 1 つ実表示し、公開臓器が 2 つ以上あれば
**日替わりで入れ替わります**。順序と対応するシーンは `src/data/landingHero.js`
（`HERO_ORGANS` が目標、`HERO_ROTATION` が実際に見せる分）。

### Scene status

カタログの各シーンは `prototype → alpha → reviewed → production` のどれかです。
`production` 以外は UI に **Prototype** バッジが出ます。
昇格の条件は [`docs/adding-a-scene.md`](docs/adding-a-scene.md) にあります。

**prototype は「形は概略、動きは仮」という約束です。** prototype のまま
臨床的な数値を出したり、精度を主張したりしないでください。

**`alpha` 以上のシーンは、モデル層・evidence dossier・model card・
scope panel の 4 点をセットで持ちます。** どれか 1 つでも欠けていれば、
そのシーンは数値を出す資格がありません。バッジが外れる（`production`）
条件には**臨床レビュー**が含まれます。レビューを受けずに上げないでください。
加えて `src/catalog/modelProfiles.js` に **model profile** を登録し、
`SCENE_MANIFEST` の `modelProfile` から参照します（下の「用途と出典の契約」）。

### 医学表現

- educational conceptual model であって、患者個別シミュレーターでも研究用
  数値シミュレーターでもない。**誤ってはいけないが、完全である必要はない**
- モデル以上の主張をしない。精度を超える桁数を UI に出さない。較正パラメータを
  臨床計測値と同一視しない。一例を一般則として書かない
- 単純化したことは [`docs/medical-notes.md`](docs/medical-notes.md) に必ず書く
- 医学的な値を変えたら `npm test` を通す

### 用途と出典の契約

所有文書は [`docs/architecture/intended-use-and-model-provenance.md`](docs/architecture/intended-use-and-model-provenance.md)。
`tests/model-profiles.test.js` と `tests/asset-manifest.test.js` が守ります。

- **配信レイヤー（SNS / Interactive / Educational）は用途ではない。** 用途は
  general-education / patient-explanation / medical-education の 3 つ。
  clinical-research / clinical-care は別系統で、現行 product に route・entitlement・
  UI・API を足さない
- **Patient explanation は patient-specific ではない。** 患者・家族が医療者の同席の
  有無にかかわらず見られる代表モデルの説明であり、患者データを取らない・保存しない・
  個別化しない・診断や予後予測をしない。用途と課金権限は別軸: `patient: true` の
  シーンは `patient-explanation` を宣言しなければならないが、逆は要求しない
  （無料の患者説明シーンは許容する）
- **主張の種類は 1 つのバッジに潰さない。** geometryBasis / mechanismLevel /
  personalization / intendedUses・prohibitedUses は model profile が、
  `status` は catalog が、レビューは registry が、A スケールは anatomy-specs が持つ。
  `production` は実装成熟度であり、external validation ではない
- **根拠が曖昧なら低い区分へ。** `externally-validated` / `patient-predictive` /
  `clinical-care` を推測で付けない。`literature-calibrated` は、dossier が引用可能な
  範囲を示し、テストがその範囲を固定しているときだけ
- **すべての現行シーンは diagnosis / treatment-selection / dose-selection を
  禁止用途として明示する**
- **外部 3D asset は `src/catalog/assetManifest.js` に記録してから参照する。**
  source・license 判断・hash・座標と単位・変換工程・semantic parts・QA を失わない。
  license は component 単位で記録し、attribution / ShareAlike / acknowledgment の
  obligation を release gate が確認する。`unknown` / `restricted` は release gate 通過
  ではない。QA は formatValidation / semanticIntegrity / anatomyExpertReview /
  visualReview / clinicianReview を分け、確認していないものを passed にしない。
  GLB は transport format であって provenance ではない（procedural の GLB は procedural）。
  procedural のビルダーは消さない。Blender は offline 工程で runtime 依存にしない。
  MCP は操作窓口で記録ではない。raw DICOM・PHI・第三者 binary・token を repo に入れない

### アーキテクチャ規則

3D シーンで静かに壊れたバグの再発防止として、以下を守ってください。
詳細と実例は
[`docs/architecture-rules.md`](docs/architecture-rules.md)。

1. **Semantic geometry** — geometry の利用側は解剖学的な名前で位置を指す。
   曲線の正規化座標（`curve.getPointAt(0.11)`）を利用側に書かない
2. **Local coordinates** — 部分構造は、その部分自身のローカル座標で定義する。
   Valsalva 洞は「大動脈全長の 2.8%」ではなく「大動脈基部の 55%」
3. **Single state ownership** — 描画プロパティの最終値を決める場所は 1 つだけ。
   複数箇所から `material.opacity = ...` を書かない
4. **Physiology vs presentation** — 生理状態と Story の reveal / emphasis を
   分ける。Story は見せ方であり、解剖のサイズを変えてはならない
5. **Anatomical axes** — シーンの解剖軸をコード上に定義し、左右をそこから引く。
   `+x` / `-x` を各自が推測する状態にしない
6. **Visual regression** — 3D シーンは unit test の合格だけでは完成としない。
   実レンダリングの確認まで含めて Definition of Done とする

臓器を問わず繰り返し出てくる**レンダリング上の失敗モード**（収束する先端の UV 極、
両面シェルの二重合成、飽和が自分の修正を隠すこと、シルエットのテーパー対傾斜、
壁から生える構造の根）と、原因を推測せず切り分ける手順は
[`docs/organ-3d-playbook.md`](docs/organ-3d-playbook.md)。
**新しい臓器の形を作り終えたら、末尾のチェックリストを測ってください。**

### 新しいシーンを足すとき

[`docs/adding-a-scene.md`](docs/adding-a-scene.md) の
**Scene suitability check**（7 問）と **Scene proposal template** に先に答える。
prototype を 1 つ足すだけなら 7 問すべてに答える必要はありませんが、
**「何が時間とともに変化するのか」** には必ず答えてください。
動かないものを 3D にする理由はありません。
