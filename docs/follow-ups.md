# Follow-ups — 残課題台帳

Last updated: 2026-09-08

マージ済みの変更が**まだ確かめていないこと・決めていないこと・先送りしたこと**を、
別のセッションや別の人がそのまま拾えるように 1 か所に置く台帳です。
[`public-release-roadmap.md`](public-release-roadmap.md) は公開ゲートの台帳で、
ここは**個別の未解決事項**の台帳です。ゲートに昇格すべきものは roadmap へ移し、
ここからは消します。

**書き方の約束**

- 1 項目 = 1 見出し。`F-<番号>` は再採番しません（会話や PR から参照できるように）
- 各項目は「何が未解決か」「どう確かめるか / どう決めるか」「完了の定義」を持つ
- 解決したら削除ではなく、末尾の **Resolved** に 1 行で移す（何を根拠に閉じたかを残す）
- 優先度は **P1**（公開前に潰す）/ **P2**（次の PR 群で）/ **P3**（機会があれば）

出所の略記: `#42` = PR #42（Organ Explorer 再構築・呼吸器 5 病態、
squash `81fea92`）のレビューと修正。`#40` = 冠動脈解剖・心筋虚血。

---

## A. マージ後にまだ確認していないこと

### F-01 `main` の post-merge CI と本番デプロイの確認 — P1（`#42`）

`#42` の CI は PR 上で全緑（Chromium / Firefox / WebKit）でしたが、squash 後の
`main` での実行と Netlify 本番反映は見ていません。

- **配信面は確認済み（2026-09-06）。** `verify:live` を Actions から実行し、
  robots.txt・sitemap・トップ・公開 13 シーンページ・`social/site.png` がすべて 200、
  canonical / og:url / sitemap がすべて `https://med-3d-lab.necofindjob.com` を
  指すことを確認しました（`#/pneumonia`・`#/pulmonary-embolism`・
  `#/myocardial-ischemia` の各シーンページを含む）。以後は毎日 07:20 JST に自動実行。
- **残っているのはブラウザ側だけです。** 上の確認は HTTP と HTML であって、
  レンダリングではありません。実ブラウザで `#/organs` を開き、Explorer の臓器
  プレビューが同時 2 枚まで描画されること、4 ルートが実際に表示されることは未確認。
- 完了の定義: 実ブラウザで 4 ルートが表示され、Explorer のプレビューが上限 2 枚で
  描画される（F-02 と同じ端末確認で兼ねられます）。

### F-02 実機での WebGL コンテキスト管理 — P1（`#42`）

`src/app/organPreview.js` は同時最大 2 コンテキスト・画面外 1.5 s で解放・
再表示で再構築・`webglcontextlost` で `lost` 状態、を **fake 依存の単体テスト**
（`tests/organ-preview.test.js`）と **SwiftShader 上の Playwright** でしか
確かめていません。実 GPU・実ブラウザでの挙動は未確認です。

- 確かめ方（各端末で）: iOS Safari、Android Chrome、デスクトップ Firefox / Safari。
  `#/organs` を末尾までゆっくりスクロールし、DevTools か
  `document.querySelectorAll('.explorer-organ-preview canvas').length` が常に ≤ 2、
  戻ったときに再構築されること。10 分放置して発熱・メモリ増加が
  ないこと（Safari は Web Inspector の Timelines → Memory）。
  コンテキスト喪失は Chrome の `chrome://gpucrash` か WebGL Insight で誘発し、
  `data-preview-state='lost'` → 復帰 or 1.5 s 後の再構築を確認。
- 決めること: 上限 2 と猶予 1.5 s（`DEFAULT_MAX_ACTIVE_PREVIEWS`、
  `OFFSCREEN_RELEASE_DELAY_MS`）が実機で妥当か。低スペック端末では 1 に落とす
  条件（`navigator.hardwareConcurrency` や `deviceMemory`）を入れるか。
- 完了の定義: 上記 4 環境の結果を [`accessibility.md`](accessibility.md) か本項に記録し、
  定数を確定する。

### F-03 reduced-motion とタッチ端末でのプレビュー挙動 — P2（`#42`）

キャプションは `prefers-reduced-motion` と `pointer: coarse` で出し分けますが、
OS 設定を切り替えた実機で「静止画のまま」「触れている間だけ停止」が
実際にそう見えるかは未確認です。

- 確かめ方: iOS「視差効果を減らす」/ Android「アニメーションを削除」を ON にして
  `#/organs` を開く。静止画 1 枚が描かれ回転しないこと。OFF に戻して
  タップ中のみ停止すること。
- 完了の定義: 2 端末で確認し、本項を Resolved へ。

### F-04 Explorer 新配色のコントラスト実測 — P2（`#42`）

用途バッジ（`.explorer-use-badge`）、臨床レーン（`#98621c` / `#79551f`）、
プレビューキャプション（`--explorer-faint`）、story 行は目視のみで、
WCAG AA の数値測定をしていません。

- 確かめ方: [`accessibility.md`](accessibility.md) の手順（axe / Chrome Lighthouse）で
  `#/organs` を 1280 px と 390 px で測る。
- 完了の定義: 4.5:1 未満の組み合わせが 0 件、または例外として記録。

### F-05 Deploy Preview（Netlify）でのルート・ヘッダ確認 — P3（`#42`）

レビュー時、このリポジトリの実行環境からは Deploy Preview に到達できず
（proxy の CONNECT 403）、ローカルビルドで代替しました。Netlify 側の
リダイレクト・ヘッダ設定が新ルートで壊れていないかは未確認です。

- 確かめ方: 次の PR の Deploy Preview で `#/pneumonia` などを直接開く。
  `curl -I` で `Content-Security-Policy` と `Cache-Control` を確認。

---

### F-20 パスワード再設定の実地確認 — P1（ドメイン切替）

Supabase の Site URL / Redirect URLs は新 origin
（`https://med-3d-lab.necofindjob.com`、`/**` 付き）に更新済みで、再デプロイ後に
認証 UI が出ることも確認しました。**ただしメールを受け取る往復は未実施です。**
ここは自動チェックが構造的に届かない唯一の箇所で（受信箱が要る）、
壊れていても誰も報告してくれません。

- 確かめ方: ログアウト状態（シークレットウィンドウが早い）でナビ右上の
  `○ ログイン` → メールアドレスを入力 → `Forgot password? / パスワードを忘れた`。
  届いたリンクが `https://med-3d-lab.necofindjob.com/?account=recovery` に着地し、
  「新しいパスワードを設定」フォームが出ること。
- 完了の定義: 上記が通り、実際に新しいパスワードでログインできる。

### F-21 旧ドメインからのリダイレクト未確認 — P2（ドメイン切替）

`verify:live` には `--redirects-from` があり旧 origin → 新 origin の
リダイレクトを検証できますが、**旧ドメイン名がこのセッションで確定していない**ため
渡していません。共有済みリンクは、共有元のドメインより長生きします。

- 確かめ方: Netlify の Domain management で旧ドメインが alias として残っていることを
  確認し、Actions → Verify the deployed site → `redirects_from` に旧 origin を入れて実行。
- 完了の定義: 旧 origin が 3xx で新 origin に向いていることを 1 回記録する。

### F-22 Search Console への sitemap 再送信 — P3（ドメイン切替）

新 origin のプロパティ追加と `sitemap.xml` の送信が未実施です。放置でも数週間で
追随しますが、その間は旧 URL が結果に残ります。

- 完了の定義: 新プロパティで sitemap が「成功」になり、旧プロパティは
  リダイレクトが認識されるまで残す。

### F-23 本番の課金は未設定のまま — P2（ドメイン切替で判明）

Netlify の Production には Stripe の 4 変数（`STRIPE_SECRET_KEY`、価格 3 種）と
`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SECRET_KEY` が入っておらず、値は Deploy Previews
のみにあります。[`deploy-preview-billing-test.md`](deploy-preview-billing-test.md) の
運用（プレビューで test キー）と一致しており、事故ではありません。本番は
`billingConfigured: false` で、アカウントと無料モデルだけが動く状態です。

- 決めること: 本番で有料アクセスをいつ開くか。開くなら live キー一式、live モードの
  webhook エンドポイントとその署名シークレットが要ります（プレビューの値は
  `stripeDeploymentSafety` が拒否するのでコピー不可）。手順は
  [`release-runbook.md`](release-runbook.md#changing-the-primary-domain) と
  [`access-and-billing.md`](access-and-billing.md)。
- 完了の定義: 開く場合は `npm run billing:check` が 3 行とも ok。開かない場合は
  その決定を roadmap の Gate に書く。

---

## B. 医学レビュー・モデルの判断

### F-06 肺炎・肺塞栓症の臨床レビュー — P1（`#42`）

両モデルは `alpha` / 医学レビュー `pending` です。レビュー登録は
`docs/clinical-reviews/registry.json` にあり、レビューアが確かめるべき問いは
model card の **§11 Where it could mislead** と evidence dossier の §3 です。

- レビューで決めること:
  - 肺炎: HPV ゲイン `0.72`・既定強度 `0.55`（`src/models/pneumonia.js`）を
    「見えるがシャントは残る」以上の意味で読まれないか。教材上限 60%
    （`PNEUMONIA_TEACHING_MAX_CONSOLIDATION`）が「重症度」に見えないか。
  - 肺塞栓症: 「相対 PVR ↑ = 右室後負荷 ↑」という段階文言が、右室のないモデルで
    許容できるか（evidence `rv-afterload-not-modelled`）。上限 65%
    （`MAX_MODELLED_OBSTRUCTED_TERRITORY`）。
  - 両方: 12 機能領域が 18 区域と対応しないことをレビューアが了承するか。
- 完了の定義: `reviewStatus: reviewed` と `reviewedCommit` が登録され、
  `tests/clinical-reviews.test.js` が通る。

### F-07 `uses.patient` を宣言してよい条件の明文化 — P2（`#42`）

カタログ（`src/catalog/scenes.js`）には alpha でも `uses: ['patient', …]` が
宣言されていますが、表示・フィルタは `src/access/features.js` の
`patientUseEnabled()` で fail closed（reviewed 以上 + 現行系統の医学レビュー完了）
です。「宣言してよい条件」と「有効化される条件」が別であることは
[`adding-a-scene.md`](adding-a-scene.md) に書きましたが、**どの alpha が
`patient` を宣言してよいか**の基準はありません（肺水腫は宣言、循環と腎濾過は
未宣言、根拠は書かれていない）。

- 決めること: 宣言基準（例: 患者向けガイドの草稿がある / 平易な段階説明がある）。
- 完了の定義: `adding-a-scene.md` §5 に基準を書き、現行の宣言をそれに合わせる。

### F-08 肺炎の HPV を操作可能にするか — P3（`#42`）

`hypoxicVasoconstriction` は solver の入力ですが UI では固定（0.55）です。
「HPV を弱めるとシャントが増える」は教育価値がありますが、値に意味を
持たせすぎる危険もあります。

- 決めること: `getModelControls()` として出すか、出すなら 0–1 の無次元表示のみか。
- 完了の定義: 決定を model card §4 に反映。出す場合は
  `tests/pneumonia-scene.test.js` に control の往復テストを追加。

### F-09 12 機能領域と 18 区域の対応づけ — P3（`#42`、`grand-design.md` §4.5）

肺炎・肺塞栓症の 12 領域は `buildLungs().regions` のサンプル位置で、名前つき
区域ではありません。区域対応を**主張しない**方針は文書化済みです。

- 決めること: 区域対応を将来つけるか（つけるなら病態ごとの分布根拠が必要）。
- 完了の定義: `disease-candidates.md` か `anatomy-specs.md` に判断を記録。

---

## C. 製品・UI の判断

### F-10 シーンヘッダをカタログ名に統一した影響 — P2（`#42`）

`src/app/App.js` がシーンヘッダと `document.title` をカタログの
`titleEn/titleJa` から導出するようになり、既存シーンの見出しも短い教科書名に
なりました（例: COPD の見出しは「COPD」+ 既存サブタイトル。以前は
「COPD: flow limitation and hyperinflation」）。Scene クラスの `meta.title` は
フォールバックとして残っています。

- 確かめ方: 全公開シーンを開き、見出し + サブタイトルで主題が伝わるか。
- 決めること: 伝わらないシーンは `meta.title` の内容をサブタイトルへ移すか、
  カタログに `storyTitle` として持たせる。
- 完了の定義: 13 シーンを見て記録。`meta.title` が使われない状態が続くなら
  scene クラスから削除する（テスト `hepatorenal-scene.test.js:624` などが参照）。

### F-11 「患者説明」フィルタが 0 件になるときの UI — P2（`#42`）

現状、医学レビュー完了のモデルがないため患者説明フィルタは 0 件で
「該当するシーンがありません」が出ます。理由（レビュー完了後に有効化）は
レーン 01 の説明にしかありません。

- 決めること: 空結果メッセージに「患者説明は版固定の医学レビュー完了後に
  有効化されます」を出すか、フィルタ自体を disabled にするか。
- 完了の定義: `src/app/Explorer.js` の `noResults` にフィルタ別の説明を追加し、
  `tests/explorer-search.test.js` で文言を固定。

### F-12 Landing カードでの story title の扱い — P3（`#42`）

Explorer カードは名前の下に story title（「水は、どこへ行くのか」）を
添え書きしますが、Landing は `LANDING_MODEL_PRESENTATION` の問いを出し、
story title は使っていません。二つの「問い」が並立しています。

- 決めること: Landing の問いを `storyTitle` に統合するか、別物として残すか。

### F-13 検索の同義語辞書 — P3（`#42`）

短い英字（3 文字以下）は単語一致、それ以外は部分一致です。同義語は
カタログの `conditions` に手で並べています（PE / CAP / AKI / 肺血栓塞栓症 …）。

- 決めること: 病名の同義語・略語を `src/catalog/` に辞書として持つか。
- 完了の定義: 主要 13 モデルについて「教科書的病名・一般的略称・日本語表記」で
  検索できることを `tests/explorer-search.test.js` の表で固定（現在は
  表示名と代表略語のみ）。

### F-14 プレビュー定数のチューニング — P3（`#42`、F-02 の後）

`DEFAULT_MAX_ACTIVE_PREVIEWS = 2`、`OFFSCREEN_RELEASE_DELAY_MS = 1500`、
`CONTEXT_LOSS_RECOVERY_DELAY_MS = 1500`、肺プレビューの
`detail 10 / referenceSamples 12000` は SwiftShader と Node の計測で決めました。
F-02 の実機結果で見直します。

---

## D. テスト・CI

### F-15 プレビューの e2e を CI に — P2（`#42`）

CI の viewport matrix（`scripts/check-viewports.mjs`）は `#/organs` の
レイアウトだけを見ます。canvas 数の上限・画面外解放・再構築・検索・
患者フィルタは、レビュー時に使い捨ての Playwright スクリプトで確かめました。

- やること: `scripts/check-explorer.mjs`（仮）として、
  (1) スクロール中の `canvas` 数 ≤ 2、(2) 先頭に戻ったときの再構築、
  (3) 表示名検索がその 1 件を返す、(4) 患者フィルタが fail closed、
  を Chromium で確認し CI に載せる。
- 完了の定義: `.github/workflows/ci.yml` にジョブ追加。

### F-16 social card の再生成手順 — P2

`npm run cards` はローカルに Playwright が必要で、リポジトリの依存には
含めていません（意図的）。`#42` では global の Playwright を
`node_modules` に symlink して生成しました。タイトル変更のたびに
`cards:check` が落ちるので、手順を [`release-runbook.md`](release-runbook.md) に書くか、
CI で生成して artifact 化するかを決める。

**β のカード集合変更でもう一度踏みました（2026-09-06）。** `npm i --no-save
playwright` の後、期待する headless shell が無かったので
`PLAYWRIGHT_BROWSERS_PATH` に既存 chromium への symlink を張って生成しています。
このとき既存 5 枚がバイト単位で一致したので、フォントは同一と確認できました
——再生成のたびにこれを確かめる手順が要る、というのがこの項目の本体です。
**公開範囲を広げたら再生成が必須**です（サイトカードが公開件数を出すため）。

### F-24 腎臓 A2 の残り — 乳頭・腎杯と継ぎ目 — P2（β 臓器 A2 化）

`buildKidney({ parts: true })` は A2 に到達し
（[`../src/catalog/anatomy.js`](../src/catalog/anatomy.js)）、レンダリングでも
皮質・錐体・腎柱が読めますが、次の 3 つは概略のままです。

- **乳頭が 1 点に収束**していて、小腎杯に個別に入っていない。腎杯は各乳頭の
  位置に描かれるだけで、受け皿になっていない
- **腎洞を刳り抜いていない**。空洞は半空間の交わりでは作れないため
  （肝臓の尾状葉と同じ理由）
- **錐体の切断面は detail 18 でようやくギザギザが収まる**。皮質はシェルなので
  切断面が無く、外から見るぶんには 10 でも足りる
- 完了の定義: 乳頭ごとに腎杯が受け皿になり、detail 12 程度で錐体の縁が
  破綻しないこと。`docs/anatomy-specs.md` §3 に残作業として記載済み

### F-25 A2 未達 15 臓器の着手順 — P2（全臓器解剖モデル）

「すべての臓器が脳と同じ A2 水準の解剖モデルを持つ」は要件になりました
（[`grand-design.md`](grand-design.md) §4.5）。到達は 6 臓器、未達 15 臓器で、
各行の `next` に「A2 にするとは何を作ることか」が 1 行入っています。

- 決めていないのは**順番**です。`anatomy-specs.md` の優先順位表は pull 元
  （疾患シーン）で並んでいますが、β で見えるのは脳と心臓だけなので、
  当面どの臓器を上げても β の見た目は変わりません
- 完了の定義: 次の 3 臓器を決めて `anatomy-specs.md` に節を書く

### F-26 β 終了時に戻すもの — P1（β 公開）

`src/catalog/release.js` の `RELEASE_CHANNEL` を変えるだけでロックは外れますが、
同時に見直すものがあります。

- **`npm run cards` の再実行が必須**。カード集合が広がり、サイトカードの
  「公開モデル N 件」も変わるため、`cards:check` は実行するまで落ちます。
  2026-09-08 の解剖β化で非公開分の PNG（amyloid-beta / circulation /
  heart-failure / myocardial-ischemia）は削除済みなので、**再生成が必要です**
- Explorer は β の間だけ公開集合を描き、それ以外では `PUBLIC_SCENES` に戻ります
- Lab へのリンクは β の間だけ隠されています（`SceneSwitcher` / Landing / fallback）
- production ビルドのチャンク絞り込み（`scripts/scene-loaders-plugin.js`）は
  `RELEASED_SCENES` を読むので、チャンネル変更で自動的に全シーンが戻ります
- 完了の定義: チャンネル変更後に `npm test` / `verify:site` / `cards:check` /
  `verify:live` がすべて緑

### F-27 解剖β：1 モデルだけの索引をどう読ませるか — P1（B0 / UI は B1）

公開が `brain-anatomy` 1 件になったので、Landing の「3D モデル一覧」も
Explorer（`#/organs`）も**カード 1 枚**になります。B0 は公開判定と情報設計の
境界（未公開モデルを準備中として大量に並べない）だけを変えました。
1 枚の索引が製品として読めるかは**未確認で、UI 担当 B1 の担当範囲**です。

- どう決めるか: 実ブラウザで `#/` と `#/organs` を 320〜1280 px で開き、
  1 枚のグリッド・セクション見出し・hero の臓器チューザー非表示が
  破綻していないか見る。必要なら B1 がレイアウトを変える
- 触ってよいファイル: `src/app/Landing.js`、`src/app/Explorer.js`、
  `src/styles/landing.css`、`src/styles/explorer.css`、コピー
- 触らないもの: `src/catalog/release.js`、`src/catalog/publicManifest.js`、
  `vite.config.js`、`scripts/`、課金
- 完了の定義: 6 viewport で `npm run verify:ui` が緑、スクリーンショットあり

### F-32 部位ツリーの階層が atlas 由来で不揃い — P2（B3）

ツリーの grouping は atlas 自身の hierarchy をそのまま使っています
（`brainStructureInfo().hierarchy`）。そのため最上位に
「左大脳半球」と「脳幹左側」と「右側」が混在します。ツリーの実装ではなく
**解剖側の命名の問題**なので、B3 の解剖品質の範囲です。

- 完了の定義: 最上位が一貫した軸（側 or 大区分）で揃っている
- 触る先: `src/data/brainAnatomy.js` の `sideHierarchy` / `structureFamily`。
  **変更すると model card revision が動き、公開判断の取り直しが要ります**

### F-40 溝のラベルが左外側ビューで出ない — P2（B3、2 手試して保留）

F-37 の遮蔽判定を入れてから、既定の 2 つの注釈のうち「中心溝」が左外側ビューで
出ません。**試したこと 2 つ**、どちらも解決していません。

1. アンカーを bounding box 中心のまま遮蔽判定 → 溝の底なので当然隠れる。
   隠すこと自体は正しい（修正前のドットは**中心前回の表面**に乗っていました）。
2. アンカーを構造自身の**最も外側の頂点**へ変更 → 「中側頭回」は回の見えている面へ
   移動して正しく表示されるようになりましたが、**中心溝は依然として隠れます**。

**原因の仮説**: 溝の mesh は折り目の**内側**の面で、外側から見ると両側の回が
覆いかぶさっています。モデル中心から見た最外点を選んでも、それは回の稜線より
下にあり、外側カメラからの ray は先に回に当たります。つまり「1 点が見えるか」
では溝は判定できません。

**2 例目（2026-09-09）**: 選択した構造にもモデル上のラベルが出るようになった結果、
同じ限界が別の形で出ました。`縁上回` は 1280×800 ではラベルが出て、375×667 では
出ません（カメラが違い、最外点が隣の回に隠れる）。**同じ端末で `中側頭回` を選ぶと
ラベルは出る**ので、端末やパネルの問題ではなく「1 点で構造全体を判定している」
ことの帰結だと確認できました。安全側（出さない）に倒れるので放置可能ですが、
解決は下の (a)(b) のままです。

- 次に決めること（実装前に決める）: **(a)** 構造の複数点をサンプルして
  「どこか 1 点でも見えるならラベルを出す」——ただしドットは見えている点へ
  置く必要があります（見えない点に置けば F-37 の再発）。**(b)** そもそも溝の
  ラベルは外側面から出すべきか、という解剖側の判断。これは engineering では
  決められません
- 触る先: `BrainAnatomyScene.isAnnotationVisible` / `outwardSurfacePoint`
- 完了の定義: 左外側ビューで中心溝のドットが**中心溝の見えている線上**に乗るか、
  あるいは「この視点では出さない」ことが解剖側の判断として記録されている

### F-43 ラベルのアンカーは頂点そのもの — ray が角を外す — P2（B4 / 脳）

心臓 scene で顕在化しました。`outwardSurfacePoint` が返すのは**構造の最外頂点**で、
そこへ真っすぐ ray を飛ばすと「2 つの三角形が共有する角」を狙うことになり、
浮動小数点で当たったり外れたりします。fixture の箱では**必ず外れ**、
「見えているのに見えていない」と判定されました。

- 心臓側の対処: 表示位置（最外頂点）と**視線判定用の点**を分け、判定は同じ面の
  ほんの少し内側（centre へ 4%）を狙う。`HeartAnatomyScene._anchorFor`
- **脳側は未対応**。実 mesh は三角形が細かく、隣接三角形のどれかが拾うため
  現状は動いていますが、同じ弱点を持っています。F-40 のアンカー問題と併せて
  触るときに、同じ「表示点と判定点を分ける」形へ寄せるのが自然です
- 完了の定義: `BrainAnatomyScene` でも判定点が面の内側に取られ、
  `tests/brain-anatomy.test.js` の遮蔽テストが判定点で通ること

### F-41 心臓：大血管は同じリリースの 2 本目のファイルにあった — 解決（B4 / X3）

**入手の関門は解けました。** レビューが渡した固定候補（HuBMAP `ccf-releases`
@ `b036a91…` の `v1.2/models/VH_M_Heart.glb`）は許可された経路
（`raw.githubusercontent.com`）で取得でき、git blob SHA-1 が候補記録と一致します。
実ファイルを読んだ結果は [`asset-qa/heart-hubmap-vh-m-heart.md`](asset-qa/heart-hubmap-vh-m-heart.md)
にあります（SHA-256、ライセンス、14 部位と出典由来の ontology id、三角形数、単位、
座標系）。

**残る課題は素材の中身です。** 四腔・心室中隔・4 弁・乳頭筋は**出典が与える id 付きで
揃っています**が、**大動脈・肺動脈幹・上下大静脈・肺静脈が 1 つも入っていません**。
これらは pack 05 §2 が β 必須に挙げているものです。冠動脈もありません。

- **やらないこと**: 無い血管を作って「収録されている」ことにする。これは
  最後までしていません
- **方針は (a)**（2026-09-09、レビュー指示）。同じリリース・同じ commit の
  `VH_M_Blood_Vasculature.glb` を取得し、**出典自身が
  `VH_M_blood_vasculature_of_heart` としてまとめている 37 mesh**（全 104 中）を
  採りました。box crop ではなく出典の意味づけです。記録は
  [`asset-qa/heart-hubmap-vh-m-blood-vasculature.md`](asset-qa/heart-hubmap-vh-m-blood-vasculature.md)
- **必須の 5 つは揃いました**: 上行大動脈・大動脈弓・下行大動脈、肺動脈幹と左右
  肺動脈、上大静脈、下大静脈、肺静脈 4 本。加えて冠動脈（optional だった分）と
  心臓静脈も入っています。合計 46 構造 / 51 mesh
- **座標は壊していません**。どちらのファイルも中央移動していません。上行大動脈が
  大動脈弁の 20 mm 上・同じ深さ、肺動脈幹が肺動脈弁の上、上大静脈が右房の上外側、
  下大静脈がその下、肺静脈 4 本が左房の後ろ——これらは**変換なしで出てくる関係**で、
  それが frame が一致している根拠です。**mm 精度の位置合わせは主張しません**
- **公開ゲートは閉じたままです**。必須部位が揃ったことは合格理由ではありません:
  2 ファイルとも候補 asset（`devAssets.js`。asset manifest ではない）で、
  asset pipeline を 1 つも通っておらず、公開判断も存在しません。
  `betaPublicationProblems('heart-anatomy')` が候補 asset を名指しで返します
- **残っているもの**: 腱索・心膜・刺激伝導系・心筋自由壁、そして「回旋枝」という
  名の mesh。`HEART_MISSING` が理由つきで持っています

### F-44 出典の 1 mesh で node 名と label/ontology id が食い違う — P2（B4 / 心臓）

`VH_M_left_anterior_descending_artery` の label は
`Anterior descending branch of left pulmonary artery`、ontology id は `FMA:8636` です。
node 名は冠動脈、label と id は肺動脈の枝を指しています。

- **こちらでは直していません。** 両方をそのまま記録し、構造カードに日英で
  「出典の記載が一致していない」と出しています
- 実測できたのは位置だけです: (0.043, 0.466, 0.055)——弁の高さより下、心室の前面。
  出典自身の group も `VH_M_arteries_of_heart/VH_M_cardiac_artery`。
  これは**位置の報告であって、どちらの記載が正しいかの判定ではありません**
- 決めるのは解剖側。engineering では決められません
- 併せて: 「回旋枝」という名の mesh はありません（左冠動脈・前下行枝・対角枝 2 本・
  左縁枝はあります）。どれが回旋枝の走行かも、こちらでは判断しません

### F-60 読み込み失敗から、画面内のボタンで復帰できるようにした — 対応済み（B6 / 共有 App）

F-58 で「失敗が画面に出る」ところまで直しましたが、**復帰手段は依然としてページ再読み込みだけ**でした。
`01-RECOVERY-CONTRACT.md` に沿って、**画面内の実ボタン**を接続しました。

| 担当 | 何を |
| --- | --- |
| Claude | `createApp({ onRetryModel })` の任意 callback、AnatomyPanel の summary 内ボタン（`data-action="retry"`） |
| Work（`src/main.js`） | callback の注入。既存 fallback と同じ `window.location.reload()` |

- **注入が無ければボタンは描画されません。** 「有効に見えて何も起きない」を作らないためです
- 名前は「再読み込みして再試行 / Reload and try again」。**実際の挙動を名乗ります**
- 押下中は disabled。ただし **callback が throw したら戻します**——「再読み込みしています…」で固着させません
- `ready` / `loading` で失効。**復帰後に前の失敗の痕跡を残しません**
- callback は**引数を取りません**。raw Error も `npm run assets:dev` のような開発者向け hint も読者に渡しません
- 単純 reload が最初の完成形です。route は hash、言語は `localStorage` なので**同じモデル・同じ言語**に戻ります。
  **観察していた視点は復元しません**し、そう主張もしません

**受入は公開脳の production build で実施しました**（`npm run verify:anatomy`）：
atlas を abort → 既定の「部位」タブのまま error 文が出る → **click / Enter / Space それぞれで実ボタンを操作** →
271 構造へ復帰 → 部位を選択、まで。844×390 と 375×667 でも**ボタンが覆われず画面内**にあることを確認
（同意カード応答前の重なりは note として別記録）。

**検査がボタンに依存していることを確認しました**：`main.js` の注入を外して build し直すと
5 件が落ちて exit 1、戻して全通過。`page.reload()` で製品を助けていません。

Work の shortcut guard（bubbling / `stopPropagation` のみ）は Enter・Space の既定動作を壊していません。

### F-61 心臓 driver の連続実行が落ちる件を切り分けた — 一部対応（B6 / 検証）

3 viewport を続けて回すと落ちる件を切り分けました。**原因は 5 つ**あり、症状が 1 つだったので
混ざっていました。**うち 4 件は driver 側の欠陥で修正済み、1 件（下の 3）は原因未確定・未完了**です。
**製品側の不具合として確認できたものはありません**——ただし「無い」と断定するには
3 の裏付けが要ります。

最初に「容器の資源」と報告しましたが、**それが当たっていたのは 5 つのうち 1 つだけ**でした。

1. **sheet 遷移中の click**（製品ではなく driver の穴）。Work の presentation adapter は
   sheet を遷移させるため、`data-sheet` が `closed` になった後もしばらく panel が上に描かれます。
   `press()` は「本当に最前面か」を待ってから click しますが、**位置で掴んでいた click は
   そのゲートを通っていませんでした**——Parts ボタン、sheet の閉じる、視点ボタン（`nth(1)`）、
   部位行、scope toggle。`pressLocator()` に集約して**全経路を同じゲート**へ通しました。
   ゲートは緩めていません（覆われたままなら、覆っている要素を名指しして失敗します）
2. **同意カードが sheet の下**（driver）。`isVisible()` は「CSS 上は見えるが完全に覆われている」
   ボタンにも true を返します。parts sheet を開いた状態では同意カードはその下なので、
   **30 秒かけて panel の下のボタンを押そうとしていました**。到達可能なときだけ押し、
   届かないなら黙って戻るようにしました（同意は最初に、何も被っていないときに答えます）
3. **3 つ目の scene が 180 秒以内に `ready` にならない — 原因未確定・未完了**。
   容器の資源だろうと書きましたが、**「180 秒で ready にならない」だけでは環境原因と断定できません。**
   裏付け（メモリ・GPU・ロード時間の実測）を取っていないので、**未確定のまま残します**。
   `exit 2`（実行不能）に変えたのは**報告の分類を直しただけ**で、
   **解消でも合格でもありません**。この 1 件は open のままです
4. **読み込みヴェールがまだ被っている**（driver）。`ready` は **scene の答えであって shell の答えでは
   ありません**。`src/main.js` はヴェールを `observe()` と `reportSceneStart()` の解決後＋500ms で
   外すため、`ready` 直後は `.loading` が全面を覆っています。375×667 で
   **50 点すべてが `DIV.loading`** でした。`ready()` でヴェールの消失を待つようにしました
   （`check-anatomy-interaction` は元からそうしていました）
5. **sheet を閉じた直後に canvas を 1 回だけ探していた**（driver）。Work の遷移中は panel が
   まだ描かれています。落ち着いた状態で測ると **375×667 でも 50 点中 30 点が canvas** なので、
   **モデルは回せます**——検査がアニメーションと競争していただけです。到達するまで待つようにしました

**Work へ 1 件申し送り（こちらでは直しません）**：ヴェールの除去が telemetry の完了に
連動しているため、その endpoint が遅い/届かない環境では、**すでに読み込み済みのモデルの上に
「building model」が残り続けます**。`src/main.js` は Work のファイルで、読み込みの見せ方も
Work の担当なので、記録だけしています。

**心臓はローカル preview 専用**で、公開脳の受入（`verify:anatomy`）には影響しません。

### F-62 心臓が小さく映っていた原因は 2 つで、どちらもカメラ側だった — 対応済み（B7 / 共有 App）

**臓器が見えるようになりました。** 原因は形でも構図の好みでもなく、**カメラが 2 か所で
上書きされていたこと**です。実測は 1280×720・パネル固定（`docs/screenshots/b6-heart/`）。

1. **共有の orbit 下限 5 world unit**（`src/controls/createControls.js`）。
   これは心不全シーンの心室の大きさに合わせた値で、**`OrbitControls.update()` が毎フレーム
   適用する**ため、framing が出した距離より後に効きます。心臓の 14 部位は高さ約 1.5 world unit
   なので、パネルが空けた帯に収める距離は約 2.5——**5 に押し戻されていました**。
   「この動脈へ寄る」が動脈まで寄らなかったのも同じ原因です。
   `orbitLimitsForSubject()`（`src/app/framing.js`）で、**自分が何を描いているか言えるシーンにだけ**
   被写体から測った下限を渡します。**緩める方向にしか動かしません**——被写体が大きいシーンは
   共有の値のままです。`tests/heart-anatomy.test.js` が、実シーンの bounds から
   「fit が求める距離 < 5」と「新しい下限 < その距離」を測っています
2. **帯が固まる前に framing していた**。App は `#ui` にシェルの印が付く前に自分を framing します。
   印（`data-anatomy-shell`）が付くと CSS が下部コンソールを全幅カードから隅の小さなカードへ
   解放するので、**コンソールが占めていた画面高の約 2 割の帯が消えます**。
   誰もカメラに知らせないので、**存在しない帯に合わせた framing のまま**でした
   （測定値：開いた直後 4.37、落ち着いた版が求めるのは 3.43）。**決まった見せ方を押すまで直らず、
   押すと跳ねます**——押さない読者は、シーンが意図した framing を一度も見ません。
   帯そのものを見張り、**実際に変わったときだけ**framing し直します。
   **読者がカメラに触れたら見張りを止めます**（`controls` の `start` で 1 回だけ）——
   以後は元からある resize listener の担当で、使用中のカメラを動かすものを増やしません

**これは Work との境界の問題でもあります。** シェルが `#ui` に印を付けるのは `createApp` が
返った後で、その時点で帯が変わります。`src/main.js` は触っていません（Work のファイル）。

**心臓の被写体占有率（`HEART_SUBJECT_COVERAGE = 0.62`）は演出値です。** 共有既定の 0.78 では
上行大動脈がヘッダに、上下大静脈が下端に、フレームと面一で切れていました。
**1280×720 の絵から測った構図**であって、解剖の定数ではありません。
**844×390・375×667 では測り直していません**——ここは未確認です。

### F-63 脳の受入 driver が「どの部位に当たったか」で結果を変えていた — 対応済み（B7 / 検証）

F-62 でカメラの位置が変わると、`verify:anatomy` が**製品ではなく driver の理由で落ちました**。
**基準を緩めてはいません**——2 か所とも、検査が見るつもりだったものを見るようにしただけです。

1. **部位ツリーの行を位置で選んでいた**。`.anatomy-tree-leaf` は畳まれた枝の中の行も数えます。
   どの枝が開いているかは何が選択されているかで決まるので、**カメラが変わって別の回に当たった
   とたん、3 番目の行が非表示の行になりました**（`element is not visible` で 30 秒）。
   確かめたい主張は「行を選ぶとその部位が選ばれる」なので、**画面にある行**を選びます
2. **視点・配色の一覧を、表示タブが開いている前提で読んでいた**。直前の手順がタブを戻すかどうかは
   「当たった部位がその角度でラベルを持つか」で決まります。**8 つ視点があるシーンについて
   「名前付き視点が無い」と報告していました**。読む前にタブを開きます

**落ちた場所が分からない問題も直しました。** 失敗は `locator.click: Timeout 30000ms exceeded` の
1 行だけで、どの click かは分かりませんでした。手順に名前を付け、
`the drive stopped while selecting a structure from the part tree: …` と出るようにし、
Playwright の call log も stderr に出します。

### F-64 `shots:anatomy` は心臓を一度も撮れていなかった — 対応済み（B7 / 検証）

候補 GLB は build に入りません（入れてはいけません）。scene は `/dev-assets/` に取りに行き、
dev server はリポジトリ直下から返しますが、**撮影スクリプトの静的サーバはその規則を持って
いませんでした**。心臓を撮ると毎フレーム「アトラスを読み込めませんでした」——
**404 の写真**です。`check-heart-recipe-report.mjs` と同じ 1 行を足しました。

### F-65 小画面の心臓を対象確認した — 対応済み（B7 / 解剖）

375×667 と 844×390 で、**sheet を開いて閉じる読者の実経路**を通しました
（全体→大血管→冠血管→心腔の中→全体へ戻る）。

| | 開いた直後の距離 | 臓器が占める高さ | 切れ | canvas に届く点 |
| --- | --- | --- | --- | --- |
| 375×667（修正前） | 4.67 | 0.35 | 無し | 35/63 |
| **375×667（修正後）** | **3.91** | **0.43** | 無し | 35/63 |
| 844×390 | 3.73 | 0.64 | 無し | 42/63 |

**縦長では被写体の形が先に効きます。** 横にパネルが無いので幅を取っているのは
被写体自身で、この心臓は縦より横に広い。そこで**縦長のときだけ占有率を上げます**
（`HEART_SUBJECT_COVERAGE_PORTRAIT`）。**すべての血管を収めるために心臓を小さくは
していません**——被写体は 14 部位のままで、血管はこれまでどおり画面外へ出ます。

**自動 framing が読者の操作を後から打ち消さないことも確認しました。** ドラッグ後に
パネルを開閉しても、カメラは**読者が回した向きへ慣性で進むだけ**で、再 framing・
スナップ・tween はいずれも **0 回**（実アプリ内で回数を数えて確認）。
明示的な視点変更と全体復帰は、これまでどおり操作として成立します。

**「心臓全体」という名前をやめました。** このモデルには心筋自由壁も腱索も心膜も
刺激伝導系も無く、この見せ方は大動脈弓の分枝と腕頭静脈を出しません。
**「心臓と血管」**に改めました。

### F-66 解剖から病態への行き先を、パネルの中に置いた — 対応済み（B7 / 解剖・病態）

「生理は一切扱いません」は正しく、そこで読者は行き止まりでした。
**model scope パネルの「表現していないこと」の直後**に**「この先はどこで見られるか」**を
足し、`heart-failure` と `myocardial-ischemia` へ 1 行の理由付きで繋げます。

- **リンクの隣の一文が主張の一部です。** どちらも**この心臓のその後ではありません**——
  それぞれ独自形状の別の模式モデルで、片方をもう片方に似せる変形・切断・接合はせず、
  計測値もまたぎません。`nextNote` と各項目の両方に書いてあります
- **公開ゲートで閉じているシーンは一覧から落とします**（「準備中」への死んだリンクを
  出しません）。判定は `sceneOpen` の 1 か所で、パネルは知りません
- 実ブラウザで通しました：解剖 → scope パネル → 心不全へ移動 →
  **正常 → HFrEF → 正常へ戻る**。`tests/model-scope-next.test.js`

**心不全の学習の流れは作り直していません。** ステージ 4 段、ストーリー、比較、
モデル初期化はすでにあり、基準→変化→基準は既存の操作で成立しています。

### F-67 心不全の説明を、専門家向けと患者・家族向けで対にした — 対応済み（B7 / 患者説明）

`PATIENT_GUIDES['heart-failure']` を **1 ステップ 3 拍**に組み直しました——
**どこが変わるか → 何が起こるか → 画面のどこを見るか**。3 つ目が欠けていて、
モニタの横に立つ人に「どこを見るか」を誰も言っていませんでした。

- 各ステップは対応する **scene stage の id** を名乗り、`progress` は**その stage の
  `at` と一致していなければテストが落ちます**。専門家向けと患者向けが、
  構造上**同じ solved state** を指します（`tests/patient-guide-pairing.test.js`）
- 用量・薬剤・診断・予後・個人の予測は**テストで禁止**しています。文字数上限も
  テストにあります（短い文ほど紛れ込みやすいため）
- パネル側は「画面のどこを見るか」を**独立した行**として描き、印刷用ハンドアウトにも
  同じ文言が載ります。**新しい LLM 呼び出しも自動翻訳もありません**

**未接続：患者説明モードは有料 entitlement の内側です。** 中身と対の検証は済んで
いますが、**実ブラウザでの患者モード表示は未確認**です（この環境に権限がありません）。

### F-68 患者説明を実ブラウザで表示・操作した — 対応済み（B8 / 患者説明）

**止めていたのは有料 entitlement ではありませんでした。** 患者モードは 2 重に閉じており、
効いていたのは **臨床レビューのゲート**のほうです——`docs/clinical-reviews/registry.json` に
`reviewed` のシーンは **1 つもありません**（`pending` / `stale` / `legacy-unversioned` のみ）。
つまり患者説明は**どのシーンでも一度も開けたことがありません**でした。

- **公開の判定は緩めていません。** カタログのカード・バッジ・用途フィルタは引き続き
  `featuresForScene`（レビュー必須）を読みます
- 追加したのは `authoredFeaturesForScene`：**レビュー要件だけを外した同じ宣言**で、
  **`installAccess` だけが**、**`betaUnlocked()` のときだけ**尋ねます。
  production build にこの capability はありません（未公開シーンを開くのと同じ仕組み）
- **抜け道ではありません。** preview build でも、署名済み session と entitlement を返す
  サーバの両方が要ります。テストでは **driver 側だけ**でそれを用意しました——
  storage に session を仕込み、`entitlements` と `paid-content` の応答を Playwright で
  差し替えるだけで、`src/` は無変更です

**実ブラウザで確認したこと**（1280×720 と 375×667、preview build）：

| | 結果 |
| --- | --- |
| 患者ボタン → 患者表示が開く | 開く。**モデルは動かない**（LV dilation のまま） |
| 開いた位置 | **いまのモデルの状態を説明する段**（6 段中 3 段目）から開く |
| モード切替だけ（開いて閉じる） | **stage も EF も変わらない** |
| Home → 順に進む | 正常 → 求心性肥大 → 左室拡大 → HFrEF → 肺へ → 症状 |
| 閉じる | **説明が到達した状態（HFrEF）を保持**。基準へは戻さない |
| 数値 | 患者表示では出さない。専門家表示へ戻して「データ」を押すと **その状態の値**（EF 28 / EDV 203） |

### F-69 モード切替が状態を初期化していた — 対応済み（B8 / 患者説明）

**2 つの欠陥がありました。どちらも「表示の切替」が「状態の変更」になっていたものです。**

1. **パネルの構築が進行度を 0 にしていた。** パネルはボタン初回押下時に構築され、
   その中で `setIndex(0)` が進行度を設定していました。**拡大した心室で患者説明を開くと、
   正常な心室に戻っていました**。構築は描画だけにしました
2. **閉じると説明が到達した状態を巻き戻していた。** 患者を HFrEF まで説明したあと閉じると、
   会話の前に立っていた位置へ戻るので、**そこで開いた PV ループは別の状態のもの**でした。
   `restoreGuideSession` に `movedByGuide` を足し、
   **モードを開閉しただけなら元に戻す／ガイドが動かしたならその状態を残す**に分けました
   （`tests/guide-session.test.js`）。教育ガイドも同じ規則です

**患者表示では専門操作を隠します。** これまでは opacity 0.28 で並んでいて、
説明される人の前に**押せないボタンの壁**が残っていました。閉じるのはパネルの × と Escape です。

### F-70 心不全の説明を、心臓の外まで伸ばした — 対応済み（B8 / 病態）

患者説明を 4 段から **6 段**にしました。追加した 2 段は同じ stage・同じ位置で、
**モデルは動かさず、注意を移すだけ**です。

- **5 段目「圧は肺のほうへ伝わる」は、このシーンが実際に描いているものを指します。**
  `meanPulmonaryVenousPressure` は**同じ閉ループの解**から出て、うっ血オーバーレイは
  その圧から描かれます。**肺水腫モデルの数値を接ぎ木してはいません**
- **6 段目「息が苦しく感じられる理由」はモデルの出力ではありません。** モデルが解くのは
  圧と容積で、症状ではない。**`educationalOnly` を付け、画面に毎回その旨を出します**
  （「一般的な説明です。この部分は画面のモデルが計算したものではありません。」）。
  `tests/patient-guide-pairing.test.js` が、印の無い段は必ずシーンが描くものに対応することを固定します
- **新しい生理学的連成計算は実装していません。** ラベルの絞り込みは既存の stage `focus` が
  そのまま効いており、HFrEF では「収縮末期の残存血液」「充満圧の上昇」が残ります

**未解決：肺側の広がりは既定の framing では画面上端に寄ります。** この段だけカメラを
引く仕組みは入れていません（心不全シーンは `getSubjectBounds()` を持たないため、
共通の framing の対象外です）。

### F-71 「肺を見て」と書いてある段で肺が見づらかった — 対応済み（B9 / 患者説明）

**文章が指す対象が、実際に見えるようになりました。** 直したのは 3 つです。

1. **カメラが心臓の正面のままでした。** 開いた視点からは肺静脈がほぼ真っ直ぐ奥へ伸びるので、
   「肺へ向かう血管のまわりを見て」と書いてある段で、その対象が画面上端に貼り付いていました。
   **既存の仕組みを使いました**——ガイドシーケンスが同じ理由で持っていた `PULMONARY_VIEW` と
   左房の framing を `GUIDE_FRAMINGS` として名前付きで公開し、説明ステップが
   任意の `frame` / `focus` で指名します。**カメラとラベルだけが動きます**——
   進行度も solver も reveal も触りません（`app.guideView.apply`）。
   明示的な「次へ」による視点移動であって、読者の操作を後から打ち消す自動 framing とは別物です
2. **844×390 でパネルが画面のほぼ全部でした**（高さ 390 のうち 275）。
   短く横長のときだけ、余白・文字・不要なボタン（大きく表示・全画面・印刷）を落とし、
   本文はスクロールにしました。**戻る・次へ・閉じるは残します**
3. **モデルのラベルが本文の上に描かれていました。** 既存のルール
   （「レッスンや解説が開いているときは console が上の層」）に**患者説明と教育ガイドが
   入っていなかっただけ**でした。1 行足しました

**対象確認**（PC 1280×720 / 375×667 / 844×390、変更した段と出口）：3 サイズとも問題 0 件。
モード切替だけでは状態が変わらないこと、ガイドが変えた状態が専門家表示へ戻っても残ることも
同時に確認しています。

### F-72 6 段が「全員がこの順に進む」と読めないように — 対応済み（B9 / 患者説明）

**新しい注意書きは増やしていません。** パネル下部に毎回出ている 1 文に、既存の根拠
（`illustrative-remodelling-axis`：**この教材が選んだ 1 本の教育経路であり、自然経過の主張ではない**）
の内容を足しました。印刷資料にも同じ文が入ります——番号付きの一覧は紙の上でこそ経過に見えるためです。

**症状の段も既存の根拠に対応付けました。** `left-filling-pressure-backup`（圧が肺側へ伝わる
方向まで）＋そこから先は一般的な教育内容、と明示しています。台帳に症状の主張はありません。

### F-73 レビュー用の 6 段一覧を作った — 対応済み（B9 / レビュー）

[`docs/clinical-reviews/heart-failure-patient-6-steps.md`](clinical-reviews/heart-failure-patient-6-steps.md)。
各段について **患者に出る文章／画面で示すもの／モデル出力か一般説明か／既存の根拠 id／
医師に確認してほしい具体的な点** を 1 行ずつ。代表画像は `docs/screenshots/b8-patient*/`。

**承認の代筆はしていません。** registry の `heart-failure` は `legacy-unversioned` のまま、
公開・課金・レビューのゲートは何も変更していません。

### F-74 preview 限定の患者表示に、負例テストを付けた — 対応済み（B9 / ゲート）

`tests/preview-product-modes.test.js`：

- production build では **query・保存値・大文字小文字違いのどれでも開かない**
- カタログのカード・バッジ・用途フィルタは**引き続きレビュー必須の判定**を読む
- **`authoredFeaturesForScene` を呼ぶのは `installAccess` の 1 か所だけ**（他所からの
  import を負例で禁止）で、`betaUnlocked()` で守られている
- **entitlement は preview でも必須**（`authenticatedFetch` と grant の再確認が残っている）

**テスト権限での UI 確認と、実サーバの認証・課金連携の確認は別です。** 後者は未実施です。

### F-75 心筋虚血を、心不全と同じ形の完成した病態体験にした — 対応済み（B10 / 病態）

**作り直していません。** 既存の supply/demand solver・支配域マップ・ステージ・注釈を
そのまま使い、足りなかった接続だけを実装しました。

- **患者説明 6 段**（`PATIENT_GUIDES['myocardial-ischemia']`）。4 stage に対応し、
  3・4 段目は同じ `burden`、5・6 段目は同じ `reperfusion` で、**カメラとラベルだけ**が動きます
- **`getGuideFramings()`** に `wall` を 1 つ。**境目が入る距離**に引いてあります——
  3 段のうち 3 つが「この血管の筋肉は変わり、隣は変わらない」という**比較**の話なので、
  片方の壁で画面を埋める framing はその比較を切り落とします
- **モデルが出していないものを出していません。** このシーンの scope は
  「心電図・胸痛・トロポニン・予後は扱わない」と自分で宣言しています。
  6 段目（胸の症状）は `educationalOnly` で、画面に毎回その旨が出ます。
  **梗塞は一切ありません**——壊死も瘢痕もモデルにありません
- 実ブラウザで通しました（1280×720）：開く → いまの状態から患者表示 →
  0 → 0.22 → 0.45 → 0.45 → 0.80 → 0.80 → 専門家表示へ戻ると **0.80 のまま**
- レビュー用一覧：[`docs/clinical-reviews/myocardial-ischemia-patient-6-steps.md`](clinical-reviews/myocardial-ischemia-patient-6-steps.md)

### F-76 共通化は最小限だけ — 対応済み（B10 / 共通）

**2 病態で実際に重複していたものだけ**を `src/data/guideContract.js` に出しました。
新しい framework・workflow engine・state machine・DSL は作っていません。

- `guideStepProblems` / `guideProblems` が、stage 対応・3 拍・文字数上限・
  患者向け禁止表現・framing の実在・stage の網羅・順序を**まとめて返します**
- 心不全のテストからは重複した 5 件を削除し、**その病態に固有のもの**（文言が臨床側と
  矛盾しないか、肺の段がこのシーンの描くものを指しているか、パネルの挙動）だけ残しました
- 3 つ目の病態は `tests/guide-contract.test.js` の `GUIDES` に **1 行**足すだけです
- **契約が実際に落ちること**も負例で確認しています（存在しない stage・位置ずれ・
  文字数超過・禁止表現・未宣言 framing・stage 抜け・逆行）

**preview で見られる条件を「書かれているか」に変えました。** `access.patient` は
product claim で、カタログの規則どおり `alpha` では宣言できません。しかし preview で
知りたいのは「患者説明が**書かれているか**」なので、`authoredFeaturesForScene` は
manifest ではなく **guide 自体**に尋ねます。production の判定は無変更です。

### F-77 解剖 ⇄ 病態を双方向にした — 対応済み（B10 / 接続）

**行き先の正本を 1 つに寄せました。** `meta.related = { scenes, note, noteJa }` が唯一の宣言で、
App が公開ゲートで絞って **scope パネルと `app.related` の両方へ同じもの**を渡します
（以前は `modelScope.next` に置いていて、scope パネルを持たない心不全からは宣言できませんでした）。

- `heart-anatomy` → 心不全・心筋虚血
- `heart-failure` → 解剖・心筋虚血
- `myocardial-ischemia` → 解剖・心不全

**別モデルであることを言う一文は 3 つとも必須で持っています**——固定標本と、解いた心室と、
支配域を描いた心筋は、互いの「その後」ではありません。

### F-78 アルツハイマー：確定した因果の物語にしない — 対応済み（B10 / 脳）

**この教材だけ、段ごとに「どこまで分かっているか」を出します。** 他の 2 病態と違い、
ここには確定した因果の連鎖がありません——確立しているのは産生・排出と細胞外沈着、
**関連**が報告されているのはオリゴマーとシナプス障害、**仮説で決着していない**のが
「この蓄積が症状を起こす」です。7 段続けて読めば「だから」と読めてしまいます。

- 契約に `certainty`（`established` / `associated` / `hypothesised` / `uncertain`）を追加。
  **1 段でも印を落とすとテストが落ちます**——印の無い段は、印のある段のなかで最も安全な
  ものとして読まれるためです
- 画面には研究者の語ではなく**読者の言葉**で出します——「一緒に見られること — 上の変化と
  並んで見つかります。**原因であるという意味ではありません。**」
- **最後の 2 段は逃げ口上ではなく内容です**：量からその人のことは分からない（`uncertain`）、
  この流れが原因かは議論中（`hypothesised`）。どちらも `educationalOnly`
- 「アルツハイマー病を引き起こす」と読める文が**1 つも無いこと**をテストで固定
- 既存テスト 1 件は**文言一致から性質の検査へ**書き換えました（言い回しではなく、
  「絵と人を切り離す段がある」ことを確かめます）
- レビュー用一覧：[`docs/clinical-reviews/amyloid-beta-patient-7-steps.md`](clinical-reviews/amyloid-beta-patient-7-steps.md)

実ブラウザで通しました：いまの状態（オリゴマー）から開き、モード切替では動かず、
7 段を歩き、閉じてもプラークのまま。`brain-anatomy` への行き先も足しました
（**縮尺が無いモデル**であることを一文で明示）。

### F-59 main（dae2acc）へ内容で同期した — 対応済み（B6 / 統合）

**「Work B5 未着」は自 branch の入力についてであって、プロジェクト全体の話ではありませんでした。**
main を読んで確認したところ、`src/main.js` に presentation mount・shortcut guard・
public diagnostic copy control が接続済みでした。前回報告の書き方を訂正します。

main は squash merge なので**共通祖先に旧 SHA が残りません**（merge-base は `837505a`、
main 側 31 / 自 branch 側 39 コミット）。**15 件の conflict をすべて内容で判断**しました。

- **`src/main.js` は main と 1 バイトも違いません。** Work のファイルには触っていません
  （今回の `onRetryModel` 注入を除く。契約上 Work の担当なので、置き換え可能な最小形として入れました）
- **`tests/helpers/fake-dom.js` は union。** main の `removeAttribute`（hidden/disabled）と
  **guard 付き detach を採用**しました——自 branch の 1 行版は `indexOf` が −1 のとき
  最後の子を削ってしまいます
- main のファイルが同じ作業の**古い形**だったもの（AnatomyPanel・BrainAnatomyScene・App・
  anatomy-panel.css・check-anatomy-interaction）は、**main 側にしか無い行が無いことを 1 行ずつ確認**してから
  superset を採用しました
- 公開判断は**新しい方**（2026-09-09 / card revision 14）を採用し、心臓の revision 行を追加

`npm test` は **1817 pass / 0 fail**（main の 33 件と自 branch のものが 1 つのツリーで）。

### F-58 小さな画面で実際に押せるかを見て、3 件見つけて直した — 対応済み（B4-integration / 共有 App）

driver を 1280×800 固定から `--viewport` 受け取りに変え、canvas の実位置と重なりから
操作点を選ぶようにした結果、**単体テストでも 1280×800 でも見えない不具合が 3 件**出ました。
いずれも同じ差分で修正し、同じ run で再確認しています（**81 assert / 3 viewport / exit 0**）。

| どこ | 何が起きていたか | 直し方 |
| --- | --- | --- |
| **全解剖シーン・全サイズ** | **読み込み失敗が画面のどこにも出ませんでした。** 文言は詳細タブの footer にありましたが、タブ本体は `body.replaceChildren(tab.content)` で**開いているタブの内容しか DOM に入りません**。既定は「部位」タブなので、失敗時に読者が見るのは**空の canvas と普段どおりの枠**だけでした | 読み込み状態を**常に載っている summary** へ。**`ready` のときは非表示**なので、正常なシーンの見た目は変わりません |
| **375×667** | **「決まった見せ方」のボタンが押せませんでした。** `.inspection-panel` は 560px 以下で fixed のボトムシートになります——rail に単独で載る場合には正しく、解剖パネルの表示タブに**埋め込まれた同じ要素**では flow から浮き、その footer が「心腔の中を見る」を覆っていました | 規則を `.rail > .inspection-panel` へ限定。**その規則自身のコメントが説明している状況**に一致させました |
| **375×667** | **「モデルの範囲と出典」が切れていました。** `.model-scope` が `width: 236px` 固定で、幅 146px・`overflow-x: hidden` の列に入っていました | `width: min(236px, 100%)`。余裕がある場所では変わりません |

**心臓シーンには scope panel がありませんでした。** `alpha` はモデル層・dossier・model card と
セットで持つ約束です（`CLAUDE.md`）。model card と dossier の現行本文から書き起こして追加し、
**そこに無い主張は 1 つも足していません**（心腔の意味・血管の内腔/壁・接合は「確認中」のまま）。

**失敗→手動再試行**も実モデルで確認しました。候補 GLB を abort させて scene 自身の
missing-candidate 分岐を通し、error 状態・hint・**画面表示（上記の修正後）**・
再読み込みでの復帰（46 構造）を確認。**この状態向けの製品内 retry ボタンは現時点でありません**
——`SceneFailureFallback` の「3Dを再試行」は別経路です。失敗表示と再試行の見せ方は Work の設計なので、
**assert せず観測として記録**しています。

driver 自身の穴も 2 つ出ました。sheet を開いたまま sheet の外（scope panel）を掴もうとしていたこと
（**製品が正しくモーダルだった**）と、同意カードを 1 回しか答えていなかったことです。
どちらも「押せないものを迂回して成功にしない」設計だから見つかりました。
production build（心臓が入らない）を掴んだときに 3 分 timeout して失敗扱いにしていた件も、
**exit 2（実行不能）**として区別するようにしました。

### F-57 接続距離の表現を、実際の計算に揃えた — 対応済み（B4-integration / 心臓）

`nearestSampledVertexMm` は**採用頂点間**の距離です。スクリプト側はそう書いてありましたが、
文書側が両方向にずれていました。

- model card §5 が `The two files touch where they should` / `Nearest-point distance` と記載。
  **頂点の標本では、どちらも言えません**（貫入しても共有頂点が無いことがあり、面で接していても
  最近傍頂点は遠いことがあります）
- 同 §7・evidence dossier の Assumption 行・asset QA が「接合は未測定」と、**数値を載せている文書の中で**記載

**量の名前**と**それが決めないこと**（接合・連続・水密・解剖学的正しさ）を分けました。撤回した読み方は
削除ではなく撤回として残しています。数値の再測定・新しい距離アルゴリズム・壁厚推定器はありません。

テストを書く過程で、レビューの一覧に無かった 4 件目が出ました：**evidence dossier に
「心腔は測定済みで cavity cast」が残っていました**（B4-G1 の主張が唯一生き残っていた場所）。
`src/data/heartAnatomy.js` の `enclosedMl` コメントにも同じ主張が残っていたので、両方撤回しました。

### F-56 増分 restore が base の在り処を決めつけていた — 対応済み（B4-integration / 納品手順）

生成される案内が「base は公開 default branch の祖先だから `git fetch origin`」と書いていました。
**確認していませんし、この一連の納品では成り立ちません**——base はいずれも remote に無い
ローカル HEAD です（レビュー側が復元した bundle 内の origin/main の祖先でもありませんでした）。

「**その base を含む repository が必要**（多くはこの一連の前回納品）」へ改めました。
自動 fetch は足していませんし、新しい復元モードもありません。`tests/pack-handoff.test.js` が
旧案内の再発を拒否します。

### F-55 N2 の実ブラウザ検証を追跡対象にした — 対応済み（B4-closeout / 共有 App）

`.n2-verify.mjs` は `.gitignore` の `.*.mjs` に一致し、**記録は残って、それを作った
コードは残っていませんでした**。[`scripts/check-heart-recipe-report.mjs`](../scripts/check-heart-recipe-report.mjs)
（`npm run verify:recipe-report`）へ移しました。ignore 全体は緩めていません。

**単なる移設ではありません。** 旧版は観測を print するだけで、assert がありませんでした。

- 全 17 手順が DOM と camera 状態を assert します。**撮影は既定で行いません**（`--shots`）
- **selector が 0 件なら失敗**です。旧版は zoom ボタンの selector が外れると
  「camera 行の 3 番目」へ黙って fallback していました——**押していない経路を
  押したことにする**書き方です。実際に外れていました（`[data-control="zoomIn"]` は
  当時存在せず、`[title="Zoom in"]` もシーンが改題するため一致しません）
- 終了コードは 3 つ：0 合格 / 1 不合格 / **2 実行不能**（build 無し・playwright 無し・
  候補 asset 無し）。実行不能を合格にしません
- ローカル build を一時 static server で配信します。本番・deploy preview・
  `verify:live` は使いません
- `docs/screenshots/b4-next/recipe-report-run.json` に機械可読の結果を残します

**検査が検査であることを確認しました**：`zoomBy()` 末尾の `noteDisplayChanged()` を
1 か所だけ外して build し直すと、それを共有する 2 手順（ズームボタンと `+` キー）だけが
落ちて exit 1、他は通りました。戻して 17/17 に復帰。

`src/components/ControlPanel.js` のボタンに `data-control` を付けました（共有ファイル）。
title は scene が改題し、行の順序は scene が要求した control で変わるため、
**prose や位置で掴む検査は別のボタンを黙って押しうる**からです。

console error 3 件はすべて `/.netlify/functions/*`（static server に function が無い）で、
除外せず件数と内訳を log に記録しています。

### F-54 全履歴 restore が既存ディレクトリを削除していた — 対応済み（B4-closeout / 納品手順）

`pack-handoff.mjs` の `cloneSteps()` が clone 前に `rm -rf "$TARGET"` を実行していました。
**今回納品した増分版にこの行はなく、そちらの復元は正常**でした。問題は同じ梱包器の
全履歴モードです。レビュー側が人工 repo で、既存 canary の消失と再実行時の作業メモ消失を
再現しています。こちらでも同梱の診断コードで修正前に再現しました
（`observed_full_history_data_loss: true`）。

- 全履歴 restore は**既存 target を検出したら停止**し、何も削除しません。
  **`--force` は作りません**——消したいなら本人が消せばよく、そのとき初めて
  「復元の副作用」ではなく「本人の削除」になります
- 相対 target は**呼び出し元の cwd 基準**で解決します
- 削除するのは `mktemp` で確保した `$WORK` だけです
- **packer 自身も、空でない出力先を拒否**します。古いファイルは上書きされない代わりに
  `SHA256SUMS.txt` に載って**この納品の一部として保証されて出て行く**ためです

[`tests/pack-handoff.test.js`](../tests/pack-handoff.test.js) が人工 repo で 7 ケース
（新規 target・既存 target・再実行・相対 path・破損 hash・増分 base 欠落・
既存 dirty clone）を固定します。assert は「終了コードが非 0」ではなく
**「そこにあったファイルがまだそこにある」**です。旧 packer に対して 4 件が落ち、
新 packer で通ることを確認済みで、修正後の診断コードは
`observed_full_history_data_loss: false` を返します。

### F-53 G1 の撤回が、実際に返る説明へ届いていなかった — 対応済み（B4-closeout / 心臓）

F-52 で撤回を書いたのは血管の説明と各文書で、**四腔の説明はそのままでした**。
`heartStructureInfo()` は `this is the chamber, not the muscle around it` /
「これは心腔であって周囲の筋ではありません」を返し続けていました。
**利用者に渡る文字列が変わっていない撤回は、撤回ではありません。**

| どこ | 直した内容 |
| --- | --- |
| `DESCRIPTION.chamber` | 「出典がこの心腔の名前で収録した表面モデル。心腔の空間と周囲の壁のどちらかは**確認中**」へ |
| `DESCRIPTION.septum` | 一般的な解剖説明（心室中隔＝筋性の壁）と実測 28.1 mL は維持。**「ファイル中で唯一」を削除**——他の面の意味まで確定していました |
| `HEART_RECIPES.note` | 「切るべき心筋壁はありません」→「四腔を丸ごと非表示にする。面を切ったり壁を作ったりしない」。**実装仕様であって、出典に壁が無いという主張ではありません** |
| `HEART_MISSING` 心筋自由壁 | 「14 部位に心筋や壁として収録されたものはない」は**誤り**でした（中隔も乳頭筋も名前があります）。「**自由壁として独立に同定された部位が無い**」へ |
| `docs/model-cards/heart-anatomy.md` §3 | 注記追加ではなく**現行本文を書き換え**。「容積が心腔か心筋込みかを確定する」も撤回（正常左室の心筋容積は心腔容積と同じ桁です） |
| `tests/heart-anatomy.test.js` | 旧主張を要求するテストを、**新しい文言を要求し旧文言を拒否する**テストへ。加えて、scene が返す全文字列（説明・recipe note・欠落説明・日英）を掃く回帰テストを追加 |

`volumeMeaningful` は `volumePrecondition` へ改名し、**"yes" とは言わなくなりました**。
閉・多様体・1 成分はこのスクリプトが検査する部分ですが、囲む体積には
**向きの整合性と自己交差の不在**も要り、どちらも検査していないためです。
TSV は実 GLB から再生成し、**測定値は 1 つも変わっていません**（この列だけ）。

### F-52 genus でも壁厚は決まらなかった — 撤回（B4-G1 / 心臓）

F-49 で ray 判定を撤回したあと、**代わりに genus で壁厚を判定しました。それも撤回します。**
レビューの反例（底付きカップ）をこちらでも `scripts/lib/mesh-metrics.mjs` に当てて再現しました：
外形 4×4×4、内側 2×2、内床 z=0.5、側壁 1・床 0.5。結果は
**V 16・E 42・F 28・χ 2・genus 0**、boundary 0・非多様体 0・退化 0・1 成分、体積 50（=64−14）。
**壁も床もあるのに genus 0** です。

genus は面の「取っ手」の数であって、壁の有無ではありません。**両方向に外れます**：

- **壁があって genus 0**：カップ（外へ 1 つの口で通じる空洞）は位相的に球
- **壁が無くて genus 1**：中実の棒を輪にしたもの（吻合・血管網の閉回路）は中身が詰まったまま genus 1

`tests/mesh-metrics.test.js` に両方の形状を fixture として入れ、
3 度目が起きないように回帰テストで固定しました（`squareCup` / `solidLoop`）。

**撤回した記述**：

| どこ | 撤回した内容 |
| --- | --- |
| `scripts/lib/mesh-metrics.mjs` | 「genus が ray 判定の答えられなかった問いに答える」 |
| `tests/mesh-metrics.test.js` | 同名のテスト。記述指標のテストへ書き換え |
| `docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md` | 「**確定 1 本・未確定 36 本**」→ **37 本すべて未確定** |
| `docs/asset-qa/heart-hubmap-vh-m-heart.md` | 左室 genus 0＝「環状の壁ではなく中実」。あわせて「121.6 mL は心腔サイズであって壁の筋肉量ではない」も撤回——正常左室の心筋容積は心腔容積と同じ桁で、この数字では選べません |
| `docs/model-cards/heart-anatomy.md` | 同上 |
| `docs/follow-ups.md` F-49 | genus 置き換えの節 |

**新しい壁厚推定器は作っていません。** 記述指標（閉・多様体・成分数・genus・
signed volume・boundary/非多様体/退化）はそのまま残し、**壁厚は「未確定」として分離**しました。
画面の文言は F-49 時点から変えていません（「確認中」のまま）ので、読者側の表示に撤回の影響はありません。

### F-51 納品のチェックサムが自分自身を含んでいた — 対応済み（B4-N4 / 納品手順）

前回の `SHA256SUMS.txt` は 67 項目のうち 1 項目が**自分自身**でした。ハッシュを書き込むと
ファイルが変わるので、この 1 行は原理的に一致しません。加えて
`full.bundle (parts 00+01 を結合したもの)` という**説明文をファイル名欄に**書いており、
機械照合できませんでした。受領側に `cat` と目視比較も頼んでいました。

[`scripts/pack-handoff.mjs`](../scripts/pack-handoff.mjs) が次回から生成します。

- `SHA256SUMS.txt` は**自分自身を除く全ファイル**を、`sha256sum -c` がそのまま読める
  相対パス形式で列挙。ファイル名欄に説明文を入れません
- 容量超過時のみ分割し、**分割片も同じ一覧に普通のファイルとして**載ります
- `restore.sh` が 1 コマンドで：一覧照合 → 結合 → 結合後 hash 照合 →
  `git bundle verify` → clone → branch checkout → **HEAD 一致確認**。
  どこかで食い違えば非 0 終了。**受領側の手作業はありません**
- `MANIFEST.json` に HEAD・branch・分割片の順序・結合後 hash を機械可読で

**実行して検証しました。読むだけでは見つからなかった不具合が 2 件出ました**：

1. **`git bundle verify` は repository の外では動きません**（"need a repository to verify
   a bundle"）。受領側は repository の外で実行するので、**全受領者で 5 手順中の 3 手順目が
   失敗していました**。`$WORK` 配下に空の scratch repository を作ってその中で実行し、
   `$WORK` ごと破棄するようにしました
2. **`restore.sh` が、生成されない `ASSETS.md` を案内していました。** packer が生成するように
   しました（第三者 GLB を bundle に入れない理由と、`src/catalog/devAssets.js` の pin に対して
   取得する 2 コマンド）

実行による確認（読んだだけの確認ではありません）：

- 5 ファイル＋2 分割 bundle を生成。`SHA256SUMS.txt` は 5 件を列挙し、**自身を除外**
- `/tmp` から `restore.sh` を実行して **exit 0**、復元 HEAD が記録値と一致
- 復元ツリーは、git 管理外のファイルを除いて**現作業ツリーと同一**
- bundle 片の**1 バイトを書き換えると exit 1** になり、その片を名指しします
  （チェックサムが実際に効いていることの確認）

### F-50 レポートの失効が、読者のカメラ操作 3 経路から漏れていた — 対応済み（B4-N2 / 共有 App）

`change` ではなく `start` を見るようにした方向は維持しつつ、**ズームボタン・`+`/`-` キー・
「寄る」**が漏れていました。いずれも controls を経由せず camera を直接動かすためです。
レビュー側が限定ハーネスで再現し、こちらで実アプリでも確認しました。

- 通知点を**読者の操作入口**へ足しました：`zoomBy`（ボタンとキーの共通経路）、
  `focusOnStructure`（寄る）、`resetView`（View）、`applyInspectionView`（視点ボタン）
- **recipe 自身の視点適用では消えません**。`applyInspectionView(id, { byReader: false })` を
  panel の `applyRecipe` から渡します。無条件の `change` リスナーへは戻していません
- 新しい camera store は作っていません。既存の `noteDisplayChanged()` だけです
- 回帰テストは**振る舞い**で固定しました（[`tests/anatomy-recipe-report.test.js`](../tests/anatomy-recipe-report.test.js)）。
  実 `createAnatomyPanel` を偽 DOM で動かし、recipe→表示、変化→消去、
  `noteDisplayChanged()`→消去、再実行→再測定を確認。App 側は**関数ごとに**
  呼び出しの有無を検査します（`start` の文字列を探すだけのテストでは、
  今回の 3 経路が漏れたまま合格していました）
- **実アプリ（実 GLB・1280×800）で確認**：recipe 直後は表示、ズームボタン・`+` キー・
  「寄る」・視点ボタン・ドラッグのそれぞれで消去、再実行で復帰。console error 0

### F-49 測定器を先に検証してから測り直した — 対応済み（B4-N1 / 心臓）

**撤回**：「37 血管すべて壁厚なし」。使った ray 判定が「外から貫く」ときの数え方で、
実際は mesh の内側から外向きに飛ばしていました。内側からは立方体 1 回・厚い中空シェル 2 回で、
「最頻 2、4 は皆無」は厚いシェルでも成立します。レビュー側が合成形状で反例を再現。

**やったこと**：測定を純粋モジュール
[`scripts/lib/mesh-metrics.mjs`](../scripts/lib/mesh-metrics.mjs) へ分離し、
[`tests/mesh-metrics.test.js`](../tests/mesh-metrics.test.js) で**答えの分かっている形状**
——立方体・中空シェル・中実の角棒・壁のある角パイプ・開いた面・面を重複させた四面体——
に当ててから、固定 GLB へ適用し直しました。

**指標名を実際の計算に合わせました**：

| 旧 | 新 | 理由 |
| --- | --- | --- |
| openEdges | boundary / nonManifold / degenerateTris を分離 | 「出現回数 ≠ 2」を全部 boundary と呼んでいた。閉じた四面体＋重複面は boundary 0・非多様体 3 |
| enclosedMl | signedVolumeMl ＋ volumePrecondition | 開いた面では平行移動で値が変わる（三角形 1 枚：原点 0、+z へ 1 移動して 1/6） |
| 最小距離 | nearestSampledVertexMm ＋ weld ＋ 標本数 | 面どうしではなく**標本頂点間**。入れ子の箱では 0 ではなく 6.7 になる |

**このとき壁厚の判定を genus へ置き換えましたが、それも撤回しました**（→ F-52）。

**訂正の訂正**：右心房の境界辺を「3 → 286/39 が正しい」と書きましたが、**元の 3 が正しい**でした。
286 は boundary＋非多様体＋退化三角形を足した数です。分離すると boundary 3・非多様体 134・
退化三角形 1,554（48,186 中）・**3 成分**。左冠動脈も「境界辺 2,609」ではなく
**6 成分・boundary 285(1µm)/138(10µm)・非多様体 84・退化三角形 2,924** でした。

### F-48 レビュー B4-R1〜R5 — 4 件を修正、対応表 — 対応済み（B4 / 心臓）

2026-09-09 のレビュー（B4-R1〜R5）を現行 HEAD `a96586e` で再現確認し、**5 件すべて残存**していたため修正しました。レビュー側は旧 source object の限定検証で、実ブラウザ・実 GLB・全テストは未実行との但し書きがあり、こちらで再現から行いました。

| ID | 内容 | 現行 HEAD での状態 | 対応 |
| --- | --- | --- | --- |
| B4-R1 | 分類の共用で意味が変わる | 残存（3 件とも再現） | 心室中隔に専用説明（`descriptionKey`）、腕頭静脈を `cavalTributary` へ分離、心腔説明から「閉じた」を除去 |
| B4-R2 | 未測定の内腔を断定 | 残存 | 血管の説明を「内腔と血管壁のどちらを表すかは未確認」へ |
| B4-R3 | 単独表示解除だけの経路で復元不可 | 残存 | 解除も変更として snapshot 保存。連続実行・一部非表示・単独表示・無変更の回帰テスト追加 |
| B4-R4 | 「見えている」が実画面と不一致 | 残存 | 3 値化（clear / blocked / **測定不能**）。定型視点の**予測**と現 camera の**判定**を分離。表示文言を「アンカーが遮られない」へ。orbit / zoom / resize / 表示変更で古い数字を消去 |
| B4-R5 | 名称不一致の留保が弱い | 残存 | `identity: 'source-conflict'` を選択見出し・検索結果・3D ラベルに短く表示。原本 node 名 / sourceLabel / ontologyId は無改変 |

**既存 F 番号との対応**（付け替えはしていません）:

- **F-44** = B4-R5 の対象そのもの。F-44 は「出典が矛盾している」という事実の記録で、B4-R5 は「その事実を利用者へどう伝えるか」。F-44 の記載は維持し、伝え方の実装をここに追記
- **F-45** = B4-R2 の背景。「内腔か壁か未測定」は F-45 の未了項目で、B4-R2 はそれが利用者向け説明で断定に化けていた点。測定自体は未了のまま
- **F-47** は独立（ラベルの消失待ち）。B4-R4 と混同しないこと——F-47 は「描かれていない構造のラベル」、B4-R4 は「見えていることの意味」

**まだやっていないこと**: 一つのアンカーで部位全体の見え方を保証しない、という制限自体は残ります（脳の F-40 と同じ）。画面内判定（frustum・パネルの被り）は実装していません。

### F-47 ラベルの「消失待ち」が非表示にも掛かっていた — 対応済み（B4 / 脳・心臓）

レビューの確認事項でした。結果は**指摘のとおり**で、直しました。

- 140 ms の猶予は、モデルを回したときに遮蔽の境界でラベルが点滅するのを
  抑えるためのものです。**非表示・単独表示・固定 recipe による退避は点滅しません。**
  それらにも猶予が掛かっていたため、読者が画面から消した構造の名前が一瞬残り、
  その名前は「その裏にあるもの」を指していました
- scene に質問を 2 つ持たせました: 「ここから見えるか」(`isVisible`) と
  「そもそも描かれているか」(`isDrawn`)。猶予は前者だけに掛かります
- 固定は unit test 側です。`tests/brain-anatomy.test.js` が scene 側
  （非表示・単独表示で `isDrawn()` が false）、`tests/heart-anatomy.test.js` が
  layer 側（`undrawn` が hide 判定に入り、猶予の起点を*更新*ではなく*リセット*する）
- **実ブラウザでは時間差を測れません**。ここの headless は約 1 fps で、
  1 フレームが 140 ms より長いためです。実機確認で言えるのは「消える」ことまでで、
  「以前より早く消える」ことではありません。区別は test が持っています
- 脳の scene ファイルが動いたので、公開判断を revision 14 で取り直しました
  （engineering acceptance。医学レビューは pending のまま）

### F-46 横向き（844×390）の解剖画面を、モデルを縮めずに詰めた — 対応済み（B4 / UI）

ヘッダ・タイトルカード・コンソール・同意カードが、それぞれ妥当な高さのまま
重なって画面をほぼ埋め、モデルが帯になっていました。

- **減らしたのは操作領域だけ**です。タイトルカードの大見出しは真上のヘッダに
  同じものがあり、コンソールの stage 見出しはパネルに同じものがあります。
  長い説明は詳細タブへ。**動くものは 1 つも減らしていません**——名前のない
  アイコン列への置き換えもしていません
- 残したもの: alpha / 医学レビュー未完了の badge（ヘッダに無いため）、
  ズーム・全画面・画像、免責の短文、脳の進行スライダーと再生・リセット
- 適用条件は `data-anatomy`（解剖 contract を満たす scene）かつ
  高さ 460px 以下・アスペクト 1.6 以上。**縦向きの端末と病態 scene には届きません**。
  実測は [`screenshots/heart-compact/`](screenshots/heart-compact/)
- ついでに、脳だけを名指ししていた 24 本の CSS 規則（`data-scene='brain-anatomy'`）を
  `data-anatomy` に変えました。密なコンソールは臓器の性質ではなく scene の性質です

### F-45 心臓の候補 asset は pipeline を 1 つも通っていない — P1（B4 / asset）

2 ファイルとも `devAssets.js` の候補で、`assetManifest.js` にはありません。
実装と実レンダリングは済んでいますが、**asset として通していないもの**が残ります。

- ~~glTF Validator を回していない~~ → **実施済み、そして不合格。CLI も落ちるようにしました**（B4-N3）。
  `npm run assets:validate` は error が 1 件でもあれば **exit 1**（clean は 0、実行不能は 2）。
  warning は終了コードを変えません。生の JSON レポート・入力 hash・validator version を保存し、
  出典 GLB は読み取り専用で開きます（自動修理はしません）。心臓 408 errors（すべて `ACCESSOR_VECTOR3_NON_UNIT`＝
  法線の縮退、全部 `VH_M_right_cardiac_atrium` の 24,068 頂点中 408 = 1.7%）、
  血管 33 errors（上大静脈 21・左冠動脈 12）。**出典側のデータで、こちらでは直していません。**
  「未実施」ではなく「不合格」として記録。修理するか、既知欠陥として受容するか、
  別 source にするかの判断は未了
- ライセンスは**記録まで進めました**（判断はしていません）:
  [`asset-provenance/heart-candidates.md`](asset-provenance/heart-candidates.md)。
  HuBMAP の CC BY 4.0 と NLM Visible Human の Terms を別々に、義務ごとに
  satisfied/pending で表にし、`Courtesy of the U.S. National Library of Medicine`、
  改変内容（範囲抽出と共通変換と材質置換のみ／形状は無改変）、推薦の誤認防止、
  固定版である旨を含む**表示文の草案**を置いてあります。**どこにも表示していません**
- data.gov の machine-readable license 欄が ODbL を指す件は、適用範囲未確定として
  そのまま保持しています。提供元への確認はしていませんし、この記録が承認もしません
- 残るのは legal 判断・attribution 面の実装・validator・解剖/臨床レビュー
- 血管の面が内腔か壁か：**未確定のままです。いったん「壁厚なし」と書いたのを撤回しました**（B4-N1）。
  使った ray 判定は「1 枚の面なら 2 回、厚い壁なら 4 回」という**外から全体を貫く**ときの数え方で、
  実際には **mesh の内側から外向きに**飛ばしていました。内側からだと立方体 1 回・厚い中空シェル 2 回で、
  「最頻 2、4 は皆無」は厚いシェルでも成立します。有限方向の最頻値で内面の不在も証明できません。
  レビュー側が合成形状で反例を再現しています。器具の妥当性を先に固定してから測り直しました（F-49）。
  **その測り直しで採った genus による判定も撤回しました**（F-52）。カップは壁があって genus 0、
  中実の輪は壁が無くて genus 1 で、両方向に外れます。**37 本すべて未確定**で、
  壁厚を測る手段はこのリポジトリにありません
- ~~接続部の距離を測っていない~~ → **測りました**（`npm run assets:measure junctions`）。
  どちらのファイルも動かさない状態で、上行大動脈↔大動脈弁 **0.00 mm**、
  肺動脈幹↔肺動脈弁 0.08、上下大静脈↔右房 0.05–0.09、肺静脈 4 本↔左房 0.05–0.07、
  左右冠動脈↔大動脈弁 0.11–0.14、冠状静脈洞↔右房 0.16。13 組中 12 組が 0.2 mm 未満。
  **これは 2 ファイルが同じ frame にあることの傍証であって、解剖学的な正しさの証明ではありません。**
  mm 精度の主張はどこにもしていません
- 追加で分かったこと: 肺動脈左右・肺静脈 4 本・腕頭静脈左右・小心臓静脈は境界辺 0——
  **出典側が切断端を塞いでいます**。こちらで cap はしていません。
  `VH_M_left_coronary_artery` は境界辺 2,609 と突出して粗い mesh です（記録のみ）
- 解剖専門家・臨床レビューはどちらも未実施
- これらが済むまで公開ゲートは閉じたままです。`public/` への配置も
  asset manifest への登録もしていません

### F-38 小脳が滑らかで小葉の襞（folia）が無い — P2（B3 / asset）

小脳は滑らかな塊として描かれ、皮質のような細かい起伏がありません。内側ビューでは
小葉が分離した「花」のように見えます。これは**レンダリングではなく元 mesh の
忠実度の問題**の可能性が高く、照明や材質で隠すべきものではありません。

- どう決めるか: 上流 asset の小脳 mesh の三角形密度と法線を実測し、
  「元データにそもそも襞が無い」のか「LOD で失われた」のかを分ける。
  前者なら**この atlas の受け入れた単純化として記録**し、
  `assetManifest` の `acceptedSimplifications` に足す
- 触らないもの: 推測で襞を彫らない（受入条件の禁止事項）
- 完了の定義: どちらであるかが記録され、必要なら asset 側の課題として登録

### F-28 poster が「モデルの写真」ではない — P2（B0）

`publicManifest.js` の `posterPath` が指すのは `npm run cards` が
**カタログの文字から描いた 1200x630 のカード**で、モデルの 3D レンダリングでは
ありません。`posterKind: 'link-preview-card'` でそう明示していますが、
「同じ asset から作った poster」——実際にそのメッシュを描いた静止画——は
まだありません。

- どう決めるか: hero の viewport から 1 枚書き出す工程を作るか、
  OG カードに実レンダリングを合成するか。B3（脳の解剖品質）で
  実レンダリングを触るときに一緒に決めるのが自然
- 完了の定義: `posterKind` に 2 つ目の種類が入り、UI がそれを区別して使う

### F-29 preview デプロイのアクセス保護は未設定 — P2（B0）

production ビルドはアンロックできなくなりました（`VITE_ALLOW_PREVIEW`）。
一方、**`VITE_ALLOW_PREVIEW=1` で作ったビルドを誰でも見られる URL に置けば、
非公開モデルは誰でも見られます。** それを防ぐのはホスト側の保護機能であって、
アプリのコードではありません。

- どう決めるか: Netlify の password protection / role-based access を使う。
  自作のパスワード保存やフロントだけの認証は作らない
- **設定権限が無いあいだ「保護済み」と報告しない。** 現在は未設定
- 完了の定義: preview 用サイトに保護がかかっていることをホストの設定画面で確認

### F-17 grand-design §3 の数値の自動化 — P3

`docs/grand-design.md` §3「現在地」のシーン数・モデル層本数は手で更新して
おり、`#40` と `#42` の連続マージで一度ずれました（本 PR で修正）。
`tests/` でカタログの実数と照合するか、表を生成にする。

---

## E. その他

### F-25 「Lab をモデル中心のカタログへ」（旧 PR #28）の意図 — P3

PR #28 は Lab の一覧を「シーン一覧」から「モデル一覧」へ組み替える提案でしたが、
`#42` の Explorer 全面刷新と `src/app/Explorer.js`・`src/styles/explorer.css` で
正面衝突し、機械的なマージでは解決できません。**PR は閉じました**が、
問いは残ります: Lab の一覧は「シーン」と「モデル」のどちらを単位にすべきか。

- 判断材料: 現在の Explorer は臓器プレビュー付きのシーン一覧です。1 つのモデルが
  複数シーンに現れる関係（同じ肺を asthma と normal-lung が使う）を一覧で表すべきか、
  それはカタログではなく `docs/grand-design.md` の地図が持つべきか。
- やるなら: 現行 Explorer の上に作り直す。ブランチ `fix/lab-model-catalogue` は
  参照用に残っており、`git log --follow` で読めます。
- 完了の定義: 単位を決めて `docs/product-principles.md` に 1 行で書く。UI を変える
  かどうかはその後の判断。



### F-18 ブランチ `feat/organ-explorer-v2` の削除 — P3

squash マージ済み。リモートに残っているので、参照が不要になったら削除。

### F-19 PR #42 本文の検証欄は古い — P3

PR 本文の「`npm test` — 1390/1390」は初版時点の数値です（最終 1501）。
履歴として残すだけで、CHANGELOG の Unreleased が正です。

---

## Resolved

（解決した項目を `F-xx — 日付 — 何で閉じたか` の 1 行で移す）

- F-36 — 2026-09-08 — 構図が canvas 基準で、header に切られたり docked panel に
  重なったりしていた件。解剖シーンが**いま描いているものの箱**を返し、app が
  header・console・panel の実測から「覆われていない帯」を出して、その帯に合わせて
  **距離と pan だけ**を決めます（視線方向と角度は不変）。panel は窓によって右帯にも
  上帯にもなるので、要素の種類ではなく**画面中央を跨ぐか**で判定します。
  帯が狭すぎる場合は動かしません。`tests/framing-subject.test.js` が、実カメラで
  8 隅を投影して帯の中に収まることと、被写体中心が帯の中心に来ることを固定します。
- F-39 — 2026-09-08 — 固定ビューに後面・下面が無かった件。`VIEW_SPECS` を 8 視点へ
  拡張（左右外側・左右内側・前面・後面・上面・下面）。下面は真下ではなく正中面内で
  前へ倒しています——真下だとカメラの up ベクトルと視線が平行で roll が決まらず、
  正中が任意の角度で画面に出るためです。UI は視点一覧をシーンから読むので変更不要。
- F-37 — 2026-09-08 — 注釈ラベルが深度を無視し、左半球の構造名が**右外側ビューで
  右半球の表面に重なって**出ていた件（左右の取り違えを招く）。ラベルは HTML の
  オーバーレイなので深度テストが効かないため、シーン側に「そのアンカーがいま
  見えているか」を**クリックと同じ ray で**訊くようにしました。判定は左右の名前
  ではなく**実際に描かれているもの**に従うので、解剖レイヤー・内側ビュー・
  単独表示・透明度と自動的に一致します。隠れたラベルは**その場で隠す**——空いた
  画面端へは動かしません。選択 ID と概要はラベルの可視性と無関係に保持します。
  `tests/brain-anatomy.test.js` が、遮蔽で隠れること・遮蔽物を消すと同じ視点で
  また見えること・レイヤーに従うこと・選択が保たれることを固定します。
  残りはアンカーの取り方（F-40）。
- F-34 — 2026-09-08 — 初回に group しか開かず、部位名が 1 件も見えなかった件。
  最初の枝だけを構造が出るまで開くようにしました（全 271 の一括展開はせず、
  部位を勝手に選択もせず、読者が閉じた枝を後から開き直しません）。
- F-35 — 2026-09-08 — 未選択時の案内が hover 前提だった件。
  「モデルまたは一覧から部位を選択してください。」の 1 文に統一し、
  同じ画面での重複表示も解消。
- F-31 — 2026-09-08 — rail に選択カード・部位ツリー・表示コントロールを積んでいた構成。
  上部（選択概要と主要操作）を一覧と別のレイアウト領域にし、本文を
  「部位／表示／詳細」のタブ 1 領域だけがスクロールする形へ。sticky も
  二重スクローラも使っていません（どちらも試して、前者は一覧への被り、
  後者はクリップ境界跨ぎを作りました）。低い画面・スマホでは本文をシート化し、
  背景 inert・Esc・フォーカスの移動と復帰つき。高さ 520px 未満でツリーを
  消す応急処置は撤去。`verify:anatomy` が開閉・選択保持・展開状態・
  スクロール位置の保持まで実ブラウザで確認します。
- F-33 — 2026-09-08 — 脳アトラスの `bx_id` が mesh 一意だという前提。実際には
  271 構造が 397 mesh に分かれており（124 構造が複数 mesh）、`meshByAtlasId` が
  1:1 の Map だったため後勝ちし、**分割された構造の片方をクリックするともう
  片方がハイライトされて**いました。構造 = id、mesh = その描かれ方に改め、
  選択・hover・isolation が構造単位で効くように修正。読者に見せる部位数も
  397（mesh 数）から 271（構造数）へ。`tests/anatomy-contract.test.js` が
  分割構造の fixture で回帰を止めます。
- F-30 — 2026-09-08 — 「公開βは脳・心臓の非 prototype シーン（5 件）」という
  旧方針。心臓解剖が無いことを理由に病態モデルを公開していた判定を、解剖のみの
  公開判定（`betaPublicationProblems()` の 5 条件）に置き換え、
  [ADR](architecture/adr-2026-09-08-anatomy-only-beta.md) に何を上書きし何を
  維持したかを記録。`tests/beta-release.test.js` が旧ルールの復活で落ちます。
- F-24 — 2026-09-06 — WebKit 固有でも読み込み失敗でもなく、**ページ遷移で中断された
  fetch の報告漏れ**でした。Chromium で再現（`TypeError: Failed to fetch`、WebKit の
  `Load failed` と同一事象）。`BrainAnatomyScene` の抑制ガードが `disposed`
  ——アプリ内の破棄——しか見ておらず、別ドキュメントへのリンクを踏む経路は
  素通りしていました。`pagehide` を見る `pageLeaving` を足して閉じ、
  `tests/brain-anatomy.test.js` に回帰テストを追加。
