# ADR 2026-09-30 — BYOKI MOTION: 病態モデルを主役にする製品の器

Status: Accepted（Phase 1–6 を `claude/ecstatic-faraday-keuiqd` で実装、main へは未マージ）
所有: 製品名・トップレベルの情報設計・公開面の見た目。
**シーンの公開判断（`src/catalog/release.js` の候補一覧・ゲート）は 1 行も変えていません**（変えたのは、文書ルート `about` を開いているルートの種類に足した 1 語だけ）。

## Context

製品は「3D 解剖モデルを閲覧するサイト」に見えていました。トップの見出しは
「人体の3D解剖モデル」、hero は日替わりの臓器、ヘッダーの中段は `脳 心臓 肺 肝臓`。
公開中の病態（機序）モデルは `cardiac-output` 1 本で、トップからは臓器 chip の
2 段目に「病態モデル 心拍出量」と出るだけでした。

一方、`CLAUDE.md` の Product definition はずっと
**Make invisible physiology visible, interactive, and understandable** であり、
`cardiac-output` は「入力 → 状態の変化 → 数値 → 理由」を 1 画面に持つ、
この製品で最も製品定義に近いシーンです。

所有者は 2026-09-30、製品を **BYOKI MOTION** に改名し、
**病態生理の因果関係を、操作と動きによって理解するインタラクティブ医学モデル集**
として作り直す判断を出しました。技術基盤（Viewer・シーン・アセット・公開ゲート・
Evidence・レスポンシブ）は捨てず、その上の「何を主役として見せるか・どう入るか・
どう理解させるか」を再設計します。

## Decision

### 1. 名前と表示

| | |
| --- | --- |
| サービス名 | **BYOKI MOTION**（wordmark のみ。臓器・ECG・十字のアイコンは使わない） |
| タグライン | 病態を、動かして理解する。 |
| 英語説明 | Interactive models for understanding pathophysiology. |
| 運営 | About と Footer に `Operated by Neco Inc.` だけ。主表示に Neco を出さない |

文字列は [`src/data/brand.js`](../../src/data/brand.js) の 1 か所だけが持ちます。
HTML title・meta・OGP・JSON-LD（`scripts/site-metadata.js`）、ヘッダー、フッター、
失敗画面、診断文、フィードバックの件名、患者向け配布物の見出しはすべてそこから読みます。
`tests/brand.test.js` が、公開面のソースに旧名が残っていないことを守ります。

**変えないもの**: `localStorage` のキー（`medical-3d-lab:*`）・パッケージ名・
リポジトリ名・`docs/` の過去の記述。保存済みの設定を消さないため、また履歴を
書き換えないためです。

### 2. トップレベルの情報設計

機能単位（Anatomy / Explorer / Viewer / Trust）から、**Models / About /
Medical | Patient** の 3 つに減らします。

| route | 以前 | いま |
| --- | --- | --- |
| `#/` | 人体の3D解剖モデル（臓器 hero） | BYOKI MOTION（hero → 公開病態モデル → 考え方 → 読み手 → footer） |
| `#/models` | —（新設） | モデル一覧。病態モデルが主、解剖は「解剖を確認する」として従 |
| `#/pathology` | 病態モデル一覧 | `#/models` の別名（リンク切れにしない） |
| `#/about` | —（新設） | BYOKI MOTION とは・モデル採用ルール・運営 |
| `#/anatomy` | —（新設） | `#/organs` の別名。β では臓器 hero つきの解剖の選択画面 |
| `#/organs` / `#/explore` | β では `#/` へ転送 | 解剖の選択画面（トップと中身が違うので転送をやめた） |
| `#/trust` / `#/evidence` | 公開とレビューの台帳 | そのまま。footer の Evidence から |
| `#/patient` | 患者説明の入口 | そのまま |
| `#/<slug>` | シーン | そのまま |

**既存の公開 URL は 1 本も消していません。** 転送をやめたのは `#/organs` だけで、
それも「開くと別のページが出る」から「解剖の選択画面が出る」への変更です。

### 3. 解剖は補助

解剖アセット・ルート・シーンは 1 つも消していません。変えたのは導線です。

- トップの hero から臓器を外しました（日替わりの臓器 hero は `#/anatomy` に移動）
- シーンのヘッダーの臓器 chip 列は**解剖シーンにだけ**出します。病態モデルの
  ヘッダーは wordmark とサイトの操作だけ
- 病態モデルからは、タイトル下の **「解剖を確認」** で同じ臓器の公開解剖モデルへ
  （`src/catalog/anatomyLinks.js`。公開ゲートを通ったものだけ）
- メニューの公開モデルは「病態モデル → 解剖」の 2 段（`SiteMenu.modelShelfList`）。
  以前は臓器が先で、唯一の病態モデルは「心臓」の 2 行目でした
- `#/anatomy` の臓器選択ページは、β では `#/organs` がトップへ転送されていたため
  **一度も描かれていませんでした**。共有ヘッダーが grid の空きセルに入っていたのを直し、
  `verify:ui` の行列に入れています

`CLAUDE.md` の「hero に出せない臓器は公開しません」は**そのまま**です。
hero は `#/anatomy` の臓器選択に移りましたが、そこに出せない臓器は選べない、
という理由は残るからです。規則自体を見直すかは F-247 に置きました。

### 4. モデル画面の器

`cardiac-output` が既に持つ構成——中央のモデル、右の指標、閉じた 2 枚のカード
（操作する／アニメーション）、変化の連鎖、再生中に触ると止まってその状態から
操作が続く説明アニメーション——を**基準実装**として、名前と配置だけを揃えます。
作り直しはしていません。

足したのは 2 つです。

- **「今、何が起きた？」**（`src/components/ChangeExplanation.js`）——
  モデルが解いた状態の**向き**（どの入力が動き、SV・CO・MAP がどちらへ動いたか）を
  規則に照らして、短い説明を 1 つ返します。規則はシーンのデータ
  （`src/data/cardiacOutputExplanations.js`）が持ち、**Medical と Patient の 2 本の
  文言**を持てる形です。どの規則にも当たらないときは何も言いません
  （連鎖と数値は出ている）。規則はモデルの実出力で向きを確かめてから書き、
  `tests/change-explanation.test.js` が全単独入力の両方向をモデルに解かせて固定します
- **「このモデルについて」**（旧「根拠と限界」）——示すこと・示さないこと・
  誤解しやすいところ（単純化）・根拠と出典・医学レビュー・版を 1 つの折り畳みに。
  中身は既存の `ModelScopePanel` と臨床レビュー記録で、新しい主張は足していません。
  本文は流れの外に置きます（PC は見出しから下がるパネル、スマホは下シート）。
  カメラの枠取りはタイトルカードの下端を測っており、中身を流れに入れると
  開いた瞬間に心臓が大きく寄り直したためです

### 5. Medical | Patient

**別モデルを作りません。** state・描画・アニメーションは共有し、変えるのは
用語・説明・注記・情報量です。仕組みは既存の purpose（`?purpose=patient`、
`src/app/purpose.js`）で、表示名だけを「Medical | Patient（医療者向け | 患者向け）」に
しました。説明コンポーネントは `src/app/audience.js` を購読して文言を切り替えます。

**公開ゲートは緩めていません。** 患者向けの表示は、いまも
`patientExplanationAvailable`（公開・現行の医学レビュー・宣言・文言）を通った
モデルでしか出ません。公開版にはまだそのモデルが無いので、**公開版のヘッダーに
切替は出ません**。トップの「読み手」節は、その事実をそのまま書いています。
（F-248）

### 6. 見た目

off-white・charcoal・warm gray と、意味のある場所（操作・選択・介入・変化）だけの
orange。トークンは `src/styles/brand.css` が持ち、既存の `--accent` などを
上書きする形で**最後の層**として読み込みます（タッチ床の `phone-touch-targets.css` の
直前）。3D の舞台は暗い charcoal のまま——光源・材質は暗い背景で調整されており、
紙色の背景に置くと全シーンの見え方が変わるためです（臨床値ではなく presentation の
判断）。

### 6.1 トップの動線

CTA「モデルを見る」は同じページのモデル節へ移動します（href は `#/models` のまま、
新しいタブ・スクリプトなしではそちらへ）。公開病態モデルが 1 本の現状で、
トップ → 一覧 → モデル と 1 段遠回りさせないためです。カードそのものがモデルへの
リンクなので、到着からモデルまでは「押す 1 回とカード 1 枚」です。

### 7. 新しいモデルを作る条件

`#/about` と [`../adding-a-scene.md`](../adding-a-scene.md) の Scene suitability check に
同じ 1 問を置きます: **操作または時間変化によって、静止画や文章より理解が明確に
深まるか。** NO なら interactive model にしない。単純な解剖確認だけのモデルを
主力にしない。

## 変えていないこと

- `src/catalog/release.js`・`publicManifest.js` の公開判定（`verify:site` の
  `publishes N` は前後で同じ）
- 患者向け表示の臨床レビュー要件
- Viewer・シーン・アセット・アニメーション基盤・テスト基盤

## 検証

`npm test`、`npm run build`、`npm run verify:site`、`npm run verify:ui`
（`#/models`・`#/about`・`#/organs`・`#/cardiac-output` を行列に追加）、
`npm run shots:surfaces`（この PR で追加。任意の route を 1280 / 390 で撮る）。
結果は PR 本文と `docs/follow-ups.md` の F-247〜F-256。検証の嘘は
`docs/verification-lessons.md` の L-152〜L-155。
