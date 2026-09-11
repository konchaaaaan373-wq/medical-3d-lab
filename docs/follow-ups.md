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

### F-42 胃の噴門部は「襟」であって領域ではない — P3（臓器解剖 6 シーン）

`stomach-anatomy` の各部位は 1 本の管の輪切りなので、小弯側の領域である噴門部が
全周のカラーになっています。角切痕も、それに伴う狭窄としてしか存在しません。
シーン内の説明と model card には両方明記済みですが、モデル自体は直していません。

2026-09-10: **襟の「幅」だけ詰めました**（食道が入る位置の前後 2.5〜3% まで）。
全周であることは変わっていないので、この項目は開いたままです。管の輪切りで
「領域」を表現できない、という制約そのものが残っています。

- 決めること: 小弯・大弯の非対称を表現するには管の輪切りでは足りません。
  A3 の壁層構造と一緒にやるか、部位分割だけ先に非対称化するか。
- 完了の定義: `src/catalog/anatomy.js` の胃の `next` から該当行が消えること。

### F-47 「臓器の数」は 3 つの別々の数である — 記録のみ（解剖シーン）

進捗報告で「既存 6 ＋新 7、全 11 臓器」と書きましたが、6 ＋ 7 は 13 です。
足し算の誤りに加えて、**数えているものが 1 つではありません**。以下は別々の数で、
どれか 1 つを「臓器数」と呼ぶと必ずずれます（2026-09-11 時点、`brain-anatomy` を含む）。

| 数えるもの | 値 | 出どころ |
| --- | --- | --- |
| anatomy scene 数 | 17 | `SCENE_MANIFEST` のうち id が `-anatomy` で終わるもの |
| primary organ 数 | 16 | それらの `organ`（`liver-anatomy` と `biliary-anatomy` は別シーンだが、`organ` は `liver` と `gallbladder` で別） |
| 含まれる organ 数 | 20 | それらの `organs`（周囲構造として描いている臓器を含む） |

- 決めること: ありません。**報告のたびにどれを数えたかを書く**、というだけです。
- 完了の定義: なし（記録として残します）。数が要るときは
  `SCENE_MANIFEST` から数えてください——手で数えた値を文書に書き写さないこと。

### F-48 シーン下部の注意書きで `**` がそのまま出ていた — 解決（UI）

`ControlPanel` の disclaimer は `text` で設定していたため、
文中の `**…**` がマークアップとして解釈されず、アスタリスクのまま表示されていました。
**最も読まれるべき 1 文が、記号をまとった状態で出ていた**ことになります
（「このモデルから容積を読み取らないでください」「このシーンでは何も動きません」など）。
disclaimer 文字列は model card（markdown）と同じものを使うので、
片方だけ書き換えるのは選択肢ではありません。

2026-09-11: `emphasised()` を足し、`**` で分割して text node と `<strong>` を組み立てる
形にしました。**パースはしていません**——`innerHTML` を使わないので、
将来 disclaimer にマークアップらしき文字列が入っても注入にはなりません。
`**` を含む全シーン（前立腺・子宮・副腎・膝・肩・股ほか）が同時に直っています。

### F-49 subject が横に長いシーンは phone 幅で極端に小さくなる — P2（Claude① / framing）

**再現条件.** `minHorizontalAspect` が 1 を超えるシーンを 375×667 で開くと、
対象が frame の 1/3 以下になります。実測（2026-09-11、`?preview=1`）:

| scene | reserve | phone での対象の見かけ幅 |
| --- | --- | --- |
| `eye-anatomy` | 1.6 → 1.15 に下げた | 375px 中およそ 120px |
| `ear-anatomy` | 1.4 | 375px 中およそ 130px |
| `nose-anatomy` | 1.15 | 375px 中およそ 190px |
| `knee-anatomy` | 0.45 | frame をほぼ満たす（問題なし） |

reserve は「その距離で subject が frame の幅を満たす aspect」なので、
narrow viewport では定義どおり引きます。問題は、**奥行きが幅を決めている
subject**（眼球：視神経と外眼筋が後方へ伸びる）でも同じ扱いになることです。
軸に平行な bounds／bounding sphere では、正面から見て奥行きでしかないものが
「幅」として効きます。

- Claude② 側でやったこと: 眼の視神経と直筋を短くし、`posterior` view を
  reserve の測定対象から外して 1.6 → 1.15。耳は形状上これ以上詰められません
- `nose-anatomy`（2026-09-11 追加）で分かった 2 つめの症状: reserve 1.15 を
  aspect 0.56 の phone で開くと 1.875 倍引きますが、対象は frame 幅の約半分
  にしかならず、**縦は 667px 中およそ 110px しか使っていません**。幅を満たす
  ところまで引くだけなら対象は frame 幅いっぱいになるはずで、引きすぎです。
  縦に余っている空間を使わないのは、幅の reserve を距離に掛ける段階で
  二重に効いているように見えます（`src/app/framing.js` の `widthReserve`）
- **最小要求（Claude① へ）**: framing が subject の幅を測るとき、
  **その view の視線方向に投影した幅**を使えれば、奥行きの長いシーンが
  narrow viewport で不当に縮みません。共通機能なので Claude② 側では
  実装していません
- 完了の定義: `ear-anatomy` が phone 幅で frame の半分以上を占めること

### F-45 患者向け説明の「画面のどこを見るか」を UI が出していない — P2（代表病態）

`src/data/patientGuides.js` の各 step は `title`（どこが変わるか）・
`body`（何が起こるか）・`look` / `lookJa`（画面のどこを見るか）の 3 部構成で、
COPD・門脈圧亢進症・腎機能障害の 3 つに揃っています。内容は
`tests/disease-explanations.test.js` が「その scene が実際に描いている読み値の
名前であること」まで確かめています。**ところが `PatientGuidePanel` は
`title` と `body` しか描いていないので、3 つ目が画面に出ません。**

- これは **Work 宛**です。患者モード UI は Work の所有なので、こちらからは
  描画側に手を入れていません。
- やること: `src/components/PatientGuidePanel.js` で `body` の下に
  `step.look` / `step.lookJa` を 1 行足すだけです（`lang-en` / `lang-ja` の
  組は同じファイル内の既存の書き方に合わせられます）。データ側の追加は不要です。
- 完了の定義: 患者モードで 3 病態のどの step でも「どこを見るか」が読めること。

### F-46 `verify:anatomy` の「0 hit」は 2 つの別の原因だった — 解決（テスト）

`scripts/check-anatomy-interaction.mjs` が「only 0 click(s) resolved to a
structure」を出し、再実行では通ることがありました。**再実行が通ったことを根拠に
「問題なし」とはせず、何を待っているのかを測りました。**原因は 2 つで、
どちらも scene 側ではなくスクリプト側です。

1. **同意バナーがモデルの上に立ったままだった。** バナーを閉じる操作を
   `goto` の直後に 5 秒 timeout で試していました。臓器の carve は同期処理で、
   肺では**約 17 秒**メインスレッドを専有します（その間フレームは 10 枚前後しか
   進みません）。5 秒では click が actionable にならず、`catch` が黙って握り潰し、
   バナーは画面下中央——**これから click する場所**——を覆ったままでした。
   ウォームな再実行ではビルドが速く、click が間に合うので通ります。
   直し方は「待ちを伸ばす」ではなく、**ページが答えられる時点で聞く**ことです。
   準備完了（部位ツリーに行が出る）を待ってから閉じるようにしました。
2. **既定のクリック位置が「中央の塊」向けだった。** 肺は縦隔、腎は脊柱、胃は
   J 字の内側と、**真ん中が空いている**臓器では 4 点とも背景に落ちます。
   スクリプト冒頭に `SCENE_POINTS`（各シーンの実レンダリングから読んだ 4 点、
   それぞれ何の上かを併記）を置きました。

ついでに、この症状を読みにくくしていた 2 つも直しました。

- 最後の click が外れると**選択が解除される**のに、スクリプトは「最後に当たった
  構造」を pinned として持ち続けていたので、次の drag テストが
  「drag が選択を消した」と報告していました。実際のパネルの状態を読むようにし、
  空なら当たった点を 1 つ押し直します。
- 1 つも当たらなかったとき `pinned.en` で TypeError になり、**その直前に出した
  説明文を埋めていました**。当たらなかったことを finding として投げます。

現在、**6 臓器すべてが `--preview` 付きで通ります**（肺・肝・腎・胃・腸・膵）。

**残っている本当の弱さ**: 準備完了の判定は今も「`.anatomy-tree-leaf` が 1 行以上
ある」だけで、**カメラが framing 後の位置に入ったか**、**canvas が最終サイズで
1 枚描かれたか**は含みません。picking はどちらにも依存します。上の 2 つとは
別の話で、今回の 0 hit の原因ではありませんでしたが、**同じ形の flake を将来
生みうる箇所として残ります**。アプリ側に「操作できる状態になった」印を置く形が
本筋で、App / Viewer は Claude① の所有なので入れる場所は相談が要ります。
（`readPixels` で「モデルがそこにあるか」を確かめる道は使えません。
`preserveDrawingBuffer: false` なので合成後は 0,0,0,0 が返ります。）

### F-44 パネルが隠す右 1/4 を framing が考慮していない — P2（臓器解剖 6 シーン）

**Claude① 宛の引き継ぎです。`framing.js` / `App.js` / `Viewer` は Claude① の所有
なので、こちらからは触っていません。**

`framePose()` はコンソール（下端）の分だけカメラをずらしますが、部位パネルが覆う
**右側**は考慮しません。パネルは canvas の上に重なるオーバーレイで、
**幅の割合はアスペクトによらずほぼ一定**です（`.rail`、1440×900 で右から約 350px、
つまり約 24%）。したがってこれは「narrow window で切れる」問題とは別物で、
`minHorizontalAspect`（アスペクトが足りないときだけ引く予備）では表せません。

臓器解剖 6 シーンはかつて各自の初期ポーズの `target.x` を右へずらして回避して
いましたが、**それは 6 か所に同じ補正を書き写した状態だったので外しました。**
いまはどのシーンも臓器の中心を指しています。

- 再現条件: `?preview=1#/pancreas-anatomy` を 1440×900 で開く。膵尾部が右の
  部位パネルの下に入ります。`#/liver-anatomy` `#/kidney-anatomy` でも余白が
  左右非対称になります。
- 各シーンが渡せるもの: `OrganAnatomyScene#getSubjectBounds()` が
  **主対象の world bounds**（`static contextTags` に挙げた文脈構造を除いたもの）
  を返します。実測値は `tests/organ-anatomy-scenes.test.js` の
  「the width a scene reserves is the width its subject actually needs」が
  測っているとおりで、主対象が枠の幅いっぱいになるアスペクトは
  肺 0.72 / 肝 0.87 / 腎 0.96 / 胃 0.57 / 腸 0.81 / 膵 1.09 です。
- 決めること: `framePose()` に横方向の inset（`bottomInset` と同じく**測った値**）
  を入れるか、`Viewer` 側で canvas の可視領域そのものを狭めるか。
- 完了の定義: 補正が 1 か所になり、`#/pancreas-anatomy` の膵尾部が
  1440×900 でパネルに入らないこと。各シーンのポーズは動かさないこと。


---

## Resolved

（解決した項目を `F-xx — 日付 — 何で閉じたか` の 1 行で移す）

- F-40 — 2026-09-10 — 肝臓の外形。`liverWarp` を書き直し（右葉を厚く、左葉を
  一点収束の刃から短い薄板へ、下縁を平らに、胆嚢窩を実測位置へ）、
  `liverAnatomy.js` の 6 つの切断面オフセットをその形に合わせ直しました。
  区域体積比は動かしていません（合わせ直したのは形に対して当てた実装値の方で、
  出典のある体積比の側ではありません）。共有する 4 シーンを実レンダリングで確認。
- F-41 — 2026-09-10 — 肺区域の「面」。`organs/lungSegments.js` を追加し、葉メッシュを
  三角形単位で 18 の区域面に分けました。葉 → 区域面 → 区域気管支の 3 層で、
  **区域を選ぶことと、その区域を換気する気管支を選ぶことは別の構造**です。

- F-43 — 2026-09-10 — 結腸の長さの比。枠は変えず、横行結腸の下垂と S 状結腸の
  ループで**長さの順序**（横行 > S 状 > 下行 > 上行 > 盲腸）を実物に合わせました。
  比そのものは図式のままで、`tests/organ-parts-anatomy.test.js` が順序を、
  model card と `src/catalog/anatomy.js` が「比は主張しない」ことを持ちます。

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
