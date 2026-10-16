# Opus への指示 — 中枢神経 3 シーンの公開準備を 1 件ずつ進める

> 1 セッション＝ 1 項目です。下の本文をそのまま最初のメッセージに貼り、
> `<項目番号>` だけ差し替えてください（例: `C-6`）。順序は §7 のとおり。

---

あなたはこの repository（BYOKI MOTION、`CLAUDE.md` を最初に読むこと）で、
`docs/reviews/2026-10-15-nervous-beta-readiness.md` の **項目 `<項目番号>` を 1 件だけ**処理します。
対象は中枢神経の 3 シーン（`brain-anatomy` / `amyloid-beta` / `higher-brain-function`）を
公開βに載せるための作業で、他のシーン・他の項目には手を出しません。

## 最初にすること

1. `CLAUDE.md` を読む。特に「着手する前に、それが誰の何を良くするのか言う」
   「同じ車輪を二度作らない」「自己改善ループは 5 手」「マージは小さく、頻繁に」。
2. レビュー文書の該当項目（`<項目番号>`）と、そこに書かれた F- 番号の
   `docs/follow-ups.md` の本文を読む。項目には「何が足りないか → どこを触るか → 完了の定義」がある。
3. 着手前に 1 文で「これは誰の何を良くするのか」を書く。言えなければ止まって報告する。
4. `npm ci && npm test` を通してから始める（shallow clone なら
   `git fetch --unshallow` してから。`tests/asset-provenance.test.js` はそれで緑になる）。

## 守ること

- **1 件直したら 1 本の PR。** 項目の「完了の定義」を満たしたら止める。隣の項目を
  同じ PR に積まない。見つけた別の不具合は `docs/follow-ups.md` に 1 項目書いて次へ渡す。
- **ガードは 5 手で書く。** ガードを書く → 壊す → 赤を確認 → 戻して緑 →
  台帳に 1 項目。**3 手目（壊して赤を見る）を飛ばさない。** 赤くならないガードは存在していない。
- **測る前に、測る道具を探す。** `CLAUDE.md` の道具表（`verify:ui` / `verify:anatomy` /
  `verify:disease` / `verify:purpose` / `shots:phone` / `shots:anatomy` ほか）を先に使う。
  使い捨てスクリプトで測って捨てない。測って意味のあったものは既存の道具に足す。
- **実ブラウザ検証は 1 本ずつ。** 並行させない。`playwright` が無ければ
  `npm i --no-save playwright`（Chromium は `/opt/pw-browsers` に入っている。
  `playwright install` はしない）。非公開シーンは `npm run build:preview` した
  `dist-preview` に `--dist dist-preview --preview` で当てる。
- **固定時間で待たない。** 状態を待つ（`scripts/lib/camera.mjs`）。
- **公開中のシーン（脳・心臓・肺・肝・心拍出量）の pinned model source を触ったら**、
  `npm run revisions:check` が赤になり公開判断が stale になって**そのシーンが閉じる**。
  触る必要があるなら、モデルカード改訂と公開判断の再取得を同じ PR で行う
  （`docs/beta-publication/*.md` と `src/catalog/release.js` の `BETA_PUBLICATION_DECISIONS`）。
  それが項目の範囲を超えるなら止まって報告する。
- **医学的な主張を足さない・強めない。** 文言・閾値・色の意味を変えるときは
  `docs/medical-notes.md` に単純化を書き、精度を超える主張をしない。
  臨床レビューの承認・署名・`reviewed` の値を**代筆しない**。
- **公開シーンの一覧や件数を文書に書き写さない。** 数えるときは `npm run verify:site`。
- **所有者の判断が要る項目は、判断を代行しない。** B-7（機能局在の読みを公開中のアトラスに出すか）、
  H-2 の「直すか受け入れるか」、A-1 の代替案（学習者向けだけ先に開くか）は、
  選択肢と根拠を 1 つのメッセージにまとめて聞き、答えが出るまでその部分は進めない。
  それ以外の判断は自分で下して進める。
- 教訓は md に書く。検証が嘘をついたなら `docs/verification-lessons.md`、
  3D の構造なら `docs/architecture-rules.md`、レンダリングなら `docs/organ-3d-playbook.md`、
  医学的単純化なら `docs/medical-notes.md`、未確認・未決定なら `docs/follow-ups.md`。
  **直す PR の中で書く。** 「あとで書く」は書かれない。
- commit メッセージ・PR 本文・コード・文書にモデル名を書かない。

## 終わるときにすること

1. `npm test` が全件緑。項目が実ブラウザに関わるなら、該当する verify を 1 本走らせて
   その出力を PR 本文に貼る（赤が残るなら、その赤が何で、なぜこの PR の範囲外かを書く）。
2. 共有コード（`src/scenes/shared/`, `src/app/`, `src/components/`, `src/styles/`）を触ったら、
   `npm run build && npm run verify:site` と `npm run verify:anatomy -- --scene brain-anatomy` を再実行する。
3. `docs/follow-ups.md` に、この PR で**未確認のまま残したもの**を件数と番号で書く。
   解決した F- 項目は Resolved へ移す。番号は台帳の採番ルールに従い、`npm run follow-ups` を通す。
4. `docs/reviews/2026-10-15-nervous-beta-readiness.md` の該当項目に
   「→ 対応済み（PR #番号）」か「→ 一部（残り: …）」を 1 行足す。
5. 1 件につき 1 本の PR を `main` へ出す。本文は: 誰の何を良くしたか／何を変えたか／
   何を測って何が出たか／確認していないこと。
6. 最後の報告は、見た人がログを読まなくても分かるように: 結果 → 測った値 → 残したもの。

## 項目ごとの補足（該当するものだけ読む）

- **C-6（計器）**: `shots:phone` の 5 枚目は `.account-trigger` を押す。リデザイン（#168）で
  ヘッダーのメニューに入ったので、メニュー経由にするか、その 1 枚を外す。`verify:patient` は
  `.patient-mode-button`（`purpose.css` で `display:none`）を押しており、役目は `verify:purpose` に
  移っている。`package.json` の script と `CLAUDE.md` の道具表を一致させる。
  **直したあと、公開中の `brain-anatomy` で最後まで通ることを確認。**
- **B-2（F-197）**: 台帳 F-197 が切り分けを全部済ませている。残る事実（カメラが
  `_dollyDirection` から 7.96° ずれて動く）から始め、案は「自前の厳密なアンカー付き dolly を
  ホイールにも使う」。`tests/zoom-anchor.test.js` に phone の構図で再現するケースを足す。
  `BrainAnatomyScene.js` は pinned model source なので、修正は共有の camera / controls 側に置く。
- **H-1（F-159）**: まず線維束が実際に見えているかを絵で確かめる（半球を透かした視点を含む）。
  見えていないなら「描いた」と言えるかを所有者に聞く。見えているなら `assetManifest.js` の
  `brain-atlas-glb` の QA に `scene: 'higher-brain-function'` の visualReview を**別記録**で足し、
  `docs/asset-qa/brain-atlas-glb.md` に絵を載せる。解剖学的妥当性は判断しない（pending のまま）。
- **H-7**: 390×844 でタイトルカードが切れ、操作列が 2 段。`cardiac-output` が同じ shell で
  通っている形に合わせる。直したら `shots:phone -- --scene higher-brain-function --dist dist-preview --preview` で絵を撮る。
- **H-4 / A-8**: `src/app/viewports.js` の `SURFACES` に preview ビルドのときだけ非公開シーン
  （`#/higher-brain-function`、患者説明を持つシーンのヘッダー）を足す。足した surface が
  H-7 / A-8 の状態で**赤になること**を先に確かめてから直す。
- **H-9（公開）**: H-1〜H-8 が終わっていること、B-7 の判断が出ていることが前提。
  `docs/architecture/adr-2026-09-22-mechanism-scene-in-beta.md` と
  `docs/beta-publication/cardiac-output.md` を前例にして、ADR・公開判断記録・
  `BETA_MECHANISM_CANDIDATES`・`BETA_PUBLICATION_DECISIONS`・`tests/beta-release.test.js`・
  `tests/public-manifest.test.js`・`modelShowcase.js`・`npm run posters`・`npm run cards`・
  `CHANGELOG.md` をひとつの PR で。pin の値は `npm run verify:next-beta -- --pins` の要領で
  製品から読み、手で写さない。マージ前に `verify:site` が `publishes` を 1 増やすことと、
  `verify:anatomy -- --scene brain-anatomy` が公開中の脳で変わらないことを確認。
- **A-7**: `verify:purpose -- --dist dist-preview --preview --scene amyloid-beta` で再現し、
  `heart-failure` が緑である差分から切り分ける。疑う先は `AmyloidBetaScene.getStageView` と
  患者ガイド開始時の視点の当て直し。生理（進行値）は変えない。
- **A-2**: `modelScope` を `static meta` に足す（禁止用途: diagnosis / biomarker interpretation /
  staging / prognosis / treatment selection）。`aggregationLayout.js` を `src/models/` に移すなら
  `docs/model-cards/revisions.json` の `modelSources` とカードの改訂履歴を同じ PR で更新する。
  status を `alpha` に下げるかは所有者に聞く（下げてもゲートは通る）。
- **A-1 / B-1（人のレビュー）**: 依頼文書を `docs/reviews/` に作るところまで。
  `docs/reviews/cardiac-output-external-review-request.md` の形式（ただし現行の主張で）。
  `registry.json` は触らない。
- **C-1**: `lung-anatomy-procedural-atlas` の `basis` を肺の記述に直し、
  `tests/model-profiles.test.js` に「`basis` が他臓器名を含まない」ガードを足して赤→緑を見る。

---

レビュー文書: `docs/reviews/2026-10-15-nervous-beta-readiness.md`
処理する項目: **`<項目番号>`**
