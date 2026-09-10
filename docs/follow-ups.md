# Follow-ups — 残課題台帳

Last updated: 2026-09-10

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

### F-40 肝臓の外形が肝臓の形をしていない — P2（臓器解剖 6 シーン）

`organs/liver.js` の `liverWarp` は、左葉側が刃のように一点へ収束する涙滴形です。
`liver-anatomy` を実レンダリングで見ると、9 区域の分割自体は読めるのに、
**輪郭が肝臓に見えません**。playbook §「シルエットのテーパー対傾斜」そのものです。

- 直せなかった理由: この warp は `portal-hypertension`・`hepatorenal-syndrome`・
  `liver-portal-flow`・`liver-anatomy` の 4 シーンが共有していて、形を変えると
  `tests/liver-anatomy.test.js` が固定している **区域体積比**が動きます。比率は
  参照値に対する許容幅で書かれているので、warp を触るなら比率の再測定と、
  4 シーンの実レンダリング確認までが 1 セットです。
- 確かめ方: 先に `tests/liver-anatomy.test.js` の体積比が warp のどのパラメータに
  どれだけ効くかを測る。左葉外側の先端だけを鈍らせて比率が許容内に収まるかを見る。
- 完了の定義: 前面・下面で肝臓として読める輪郭になり、9 区域の体積比が参照値の
  許容内に留まり、上記 4 シーンを実レンダリングで確認した記録が残ること。

### F-41 肺の解剖シーンは肺区域を「面」として選べない — P3（臓器解剖 6 シーン）

`lung-anatomy` では 18 の肺区域を**区域気管支と区域動脈として**選べます。
実質そのものは 5 葉のメッシュで、区域は葉メッシュの頂点色として塗られているだけなので、
「S3 の実質をクリックする」ことはできません。

- 決めること: 葉メッシュを区域ごとに三角形単位で分割して 18 の面を作るか
  （`segmentAt()` があるので導出はできる）、頂点色のまま「表示モード」に留めるか。
  前者は葉と区域で 2 つのレイヤーを持つことになり、どちらを既定にするかも決めます。
- 完了の定義: どちらかに決め、決めた理由を model card に書く。

### F-42 胃の噴門部は「襟」であって領域ではない — P3（臓器解剖 6 シーン）

`stomach-anatomy` の各部位は 1 本の管の輪切りなので、小弯側の領域である噴門部が
全周のカラーになっています。角切痕も、それに伴う狭窄としてしか存在しません。
シーン内の説明と model card には両方明記済みですが、モデル自体は直していません。

- 決めること: 小弯・大弯の非対称を表現するには管の輪切りでは足りません。
  A3 の壁層構造と一緒にやるか、部位分割だけ先に非対称化するか。
- 完了の定義: `src/catalog/anatomy.js` の胃の `next` から該当行が消えること。

### F-43 結腸の各部の長さの比が実物と違う — P3（臓器解剖 6 シーン）

横行結腸は実際には下行結腸の約 2 倍ですが、このモデルでは下行結腸の方がわずかに
長くなっています。腹部を「横切る」距離より「落ちる」距離の方が長い枠だからです。
model card は長さが図式的であることを明記していて、
`tests/organ-parts-anatomy.test.js` は長さではなく**幅**（横切る距離）を測っています。

- 決めること: 枠の縦横比を変えて実物の比率に寄せるか、図式のままとするか。
  変えると `intestinal-transit` の見た目も動きます。
- 完了の定義: どちらかに決め、`src/catalog/anatomy.js` の結腸の `next` を更新する。

### F-44 パネルが隠す右 1/4 を framing が考慮していない — P2（臓器解剖 6 シーン）

`framePose()` はコンソール（下端）の分だけカメラをずらしますが、部位パネルが覆う
**右側 4 分の 1** は考慮しません。臓器解剖 6 シーンは各自の初期ポーズの target を
右へずらして回避していますが、これは各シーンが同じ補正を書き写している状態です。

- 決めること: `framing.js` に横方向の inset を入れるか（App/Viewer は Claude① の
  所有なので、こちらから触っていません）。入れるなら 6 シーンのポーズを戻します。
- 完了の定義: 補正が 1 か所になり、各シーンのポーズが臓器の中心を指すようになること。


---

## Resolved

（解決した項目を `F-xx — 日付 — 何で閉じたか` の 1 行で移す）

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
