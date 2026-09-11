# B4 closeout — 3 点の修正と、その検証

**base**: `4e806869609f9f6035516941e834f6e440acb65b`
**HEAD・コミット数**: 同梱 `MANIFEST.json` の `head` と `bundle.commits` が正です
**branch**: `claude/medical-3d-lab-b3-1-brain-view`

> **この 2 つをここに書き写さないのは、必ず古くなるからです。** 初版はここに
> 「コミット数: 3」と書いてありましたが、この文書自身のコミットと、その後の
> 修正コミットが後から乗るため、梱包時の実体は **5** でした（レビュー側の指摘、
> 対象 `587d15f92703e632e5be02044041edb44df3d807`）。数を持つ場所は生成される
> `MANIFEST.json` 1 か所に寄せてあります。
>
> 同じ理由で、**この文書に出てくる数値はすべて「どの SHA で測ったか」と対で
> 読んでください。** 下の自己検証表は `587d15f` 時点の実測です。

push・PR 操作・merge・本番/新規 preview 公開・課金変更は 0 件。
**GitHub Actions の起動・再実行も 0 回**です。公開ゲートは閉じたままです。

この文書はリポジトリ内 `docs/b4-closeout-report.md` が原本で、納品 ZIP の
`00-REPORT.md` は同じ内容です。復元すればソース・テスト・ブラウザドライバ・
機械可読ログ・画像・Work 向け資料はすべて追跡対象として辿れます。

---

## 1. G1 の撤回を、実際に返る説明へ届かせた（`abce0bc`）

**指摘は正しく、こちらの前回報告が不正確でした。** 「撤回した」「画面はすでに確認中」と
書きましたが、それが本当だったのは血管の説明で、**四腔は別の表に旧主張が残っていました**。
`heartStructureInfo()` は `this is the chamber, not the muscle around it` /
「これは心腔であって周囲の筋ではありません」を返し続けていました。
利用者に渡る文字列が変わっていない撤回は、撤回ではありません。

| 直した場所 | 前 | 後 |
| --- | --- | --- |
| `DESCRIPTION.chamber` | 「心腔の空間を囲む面。出典に心筋自由壁が無いので、これは心腔であって周囲の筋ではない」 | 「出典がこの心腔の名前で収録した表面モデル。心腔の空間と周囲の壁のどちらを表すかは**確認中**」 |
| `DESCRIPTION.septum` | 「ファイル中で**唯一**、心腔の空間ではなく壁そのもの」 | 一般的な解剖説明（筋性の壁）と実測 28.1 mL は維持。**排他的な部分だけ削除** |
| `HEART_RECIPES.note` | 「切るべき心筋壁はありません」 | 「四腔の部位を丸ごと非表示にする。面を切ったり壁を作ったりしない」＝**実装仕様** |
| `HEART_MISSING` 心筋自由壁 | 「14 部位に心筋や壁として収録されたものはない」 | 「**自由壁として独立に同定された部位が無い**」（中隔も乳頭筋も名前はあります——前の記述は誤りでした） |
| model card §3 | 「the chambers are not walls」「容積が心腔か心筋込みかを確定する」 | **現行本文を書き換え**。注記の追加ではありません |
| `tests/heart-anatomy.test.js` | 旧主張を要求 | 新文言を要求し**旧文言を拒否**。加えて scene が返す全文字列を掃く回帰テストを追加 |

日英とも直しています。**「確認中」と書いた内容を別の場所で確定していないこと**を、
新しい回帰テストが固定します（説明・recipe note・欠落説明を日英まとめて走査）。

同じ差分で、現在の方針と矛盾する短い記述も直しました。`mesh-metrics.mjs` の
weld 例が撤回済みの 286/39 を現在値として書いていたので、分離後も生きている
左冠動脈の 285/138 へ。`transversalCrossings` の "Read it with the genus." も削除。

`volumeMeaningful` → **`volumePrecondition`**。もう "yes" とは言いません。
閉・多様体・1 成分は検査していますが、囲む体積には**向きの整合性と自己交差の不在**も
必要で、どちらも検査していないためです。TSV は実 GLB から再生成し、
**測定値は 1 つも変わっていません**（この列だけ）。

新しい壁厚推定器や幾何判定器は作っていません。機能・形状・配色・表示 recipe・
出典名・部位分類・G1 の合成 fixture は取り下げていません。

## 2. 全履歴 restore を非破壊にした（`b9f097c`）

`cloneSteps()` の `rm -rf "$TARGET"` です。**修正前に、同梱の診断コードで再現しました**
（`observed_full_history_data_loss: true`）。修正後、同じ診断コードが
sentinel 保持・再実行時の作業メモ保持・`existing_target_restore: 1` を返します。

- 既存 target を検出したら**停止**し、何も削除しません。**`--force` は作りません**
- 相対 target は**呼び出し元の cwd 基準**で解決します
- 削除するのは `mktemp` で確保した `$WORK` だけです
- **packer 自身も空でない出力先を拒否**します。古いファイルは上書きされない代わりに
  `SHA256SUMS.txt` に載って、この納品の一部として保証されて出て行くためです

`tests/pack-handoff.test.js` が人工 repo で 7 ケースを固定します（新規 target・
既存 target・再実行・相対 path・破損 hash・増分 base 欠落・既存 dirty clone）。
assert は「終了コードが非 0」ではなく**「そこにあったファイルがまだそこにある」**です。
**旧 packer に対して 4 件が落ち、新 packer で通ります**——記述ではなく回帰テストです。

今回提出の増分 restore の正常動作は保持しています（テスト 6・8 が固定）。

## 3. N2 のブラウザ検証ドライバを追跡した（`48054ff`）

`.n2-verify.mjs` → `scripts/check-heart-recipe-report.mjs`
（`npm run verify:recipe-report`）。**ignore 全体は緩めていません。**
秘密値・環境固有の絶対パスはありません。

**単なる移設ではありません。旧版には assert がありませんでした。**

- **17 assert**。DOM と camera 状態を見ます。両側を確認します——recipe 自身の
  カメラ移動では**消えないこと**と、ズームボタン・`+` キー・「寄る」・視点ボタン・
  ドラッグで**消えること**、再実行で**同じ測定値に戻ること**
- **selector が 0 件なら失敗**。旧版は zoom の selector が外れると「camera 行の
  3 番目」へ黙って fallback していました——**押していない経路を押したことにする**
  書き方で、実際に外れていました
- **終了コード 3 種**：0 合格 / 1 不合格 / **2 実行不能**。実行不能を合格にしません
- **撮影は既定で行いません**（`--shots`）。画像は「レポートが消えた」ことを立証しません
- ローカル build を一時 static server で配信。本番・deploy preview・`verify:live` は不使用

`src/components/ControlPanel.js` のボタンに `data-control` を追加しました（共有ファイル）。
title は scene が改題し（「Zoom in — fill the frame with the chamber (+)」）、
行の順序は scene が要求した control で変わるためです。Work 向け資料に契約として記載。

---

## 実装者（Claude）の自己検証

| 何を | 結果 |
| --- | --- |
| `npm test`（`587d15f`） | **1782 pass / 0 fail** |
| `npm run build` → `npm run verify:site` | 通過。**heart-anatomy の chunk は production build に入りません** |
| 公開ゲート | `RELEASED_SCENES` は `brain-anatomy` の 1 件。heart-anatomy は candidate asset と publication decision の 2 理由で拒否 |
| `npm run assets:validate` | **exit 1**（心臓 408 errors / 血管 33 errors）。不合格のまま維持 |
| `npm run verify:recipe-report` | **17 assert / 0 fail / exit 0**（実 GLB・preview build・1280×800） |
| その検査が検査であることの確認 | `zoomBy()` 末尾の `noteDisplayChanged()` を 1 か所外して build し直すと、**それを共有する 2 手順だけが落ちて exit 1**、他は通過。戻して 17/17 に復帰 |
| packer 回帰テスト | 10 件通過。うち 4 件は**旧 packer で落ちる**ことを確認済み |
| レビュー同梱の診断コード | `inspect-current-copy.mjs`：残る 2 件は**過去と明示した撤回履歴**のみ。`check-packer-safety.py`：`observed_full_history_data_loss: false` |
| 納品物 | 別ディレクトリへ復元して HEAD 一致を確認。**既存ディレクトリを破壊しないことも確認** |

## 今回こちらで確認していないこと

- **解剖レビュー・臨床レビュー・法務判断。** 技術テストの合格は医学的承認ではありません
- **実 GLB の Validator error 408/33 の再調査。** exit code の挙動を確認しただけです
- **実機（実端末）・実 GPU。** headless SwiftShader の 1 環境です
- **844×390 / 375×667 でのレポート失効挙動。** 1280×800 のみです。
  B4-R の回で別目的（名称留保・compact レイアウト）に撮った分は別件です
- **描画の見た目・タイミング。** この環境の headless は概ね毎秒 1 フレームで、
  「消えている」は観測できても「どれだけ速く」は測っていません
- **Netlify / CI の実挙動。** Actions は 0 回のままです

## Work との境界

- **統合待ちです。Work からの部品・接続差分案は、この時点でも未着です。**
  統合済みの箇所はありません
- Work 担当（外枠 UI・公開画面・読み込み体験・Neco 導線・Landing の見た目）は
  再実装していません
- 共有ファイルへの依頼は 2 点だけです：camera を動かす新しい入口を作ったら
  `noteDisplayChanged()` を呼ぶこと、console のボタンを作り直すときに
  `data-control` を残すこと。詳細は `docs/work-integration-handoff.md`
