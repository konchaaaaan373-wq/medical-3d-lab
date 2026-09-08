# ADR 2026-09-08 — 公開βは「脳と心臓の解剖」だけにする

Status: Accepted（実装済み・B0）
所有: 公開範囲の判断。実装は [`../../src/catalog/release.js`](../../src/catalog/release.js)、
現在の状態は [`../beta-release.md`](../beta-release.md)。

## Context

2026-09-08 時点のリリースルールは「脳・心臓に属する非 prototype シーンを公開する」
（`organ ∈ {brain, heart}` かつ `status !== 'prototype'`）でした。
その結果、公開 5 件のうち 4 件が病態モデル——心不全・低心拍出・心筋虚血・
アミロイドβ——で、EF・CO・圧などの数値を出していました。

`release.js` のコメント自身がその理由を書いていました：
「これは *anatomy only* ではない。カタログに解剖水準の心臓シーンが 1 つも無いので、
心臓を開くとは心不全・低心拍出・心筋虚血を、数値ごと開くということだ」。

つまり **心臓の解剖モデルが無いことが、病態モデルを公開する理由になっていました。**

## Decision

**公開βの中心を「脳・心臓の 3D 解剖モデル」に置きます。解剖閲覧そのものを
独立した製品価値とし、病態モデルは開発を続けたうえで、このβには出しません。**

1. **未完成の解剖を病態で代用しない。** `heart-anatomy` が存在しない／
   合格していないあいだ、βは合格済みの 1 本だけを開き、存在しない
   「心臓を見る」を表示しません。件数のために品質・権利・レビュー条件を
   弱めることもしません。
2. **名前が候補一覧にあることは公開ではない。** `organ` フィルタと `status`
   だけで開く判定をやめ、`betaPublicationProblems()` の 5 条件
   （登録・解剖の主張のみ・asset release gate・レビューが stale でない・
   asset revision に結びついた公開判断記録）がすべて空のときだけ開きます。
   未知 status・profile 欠落・ライセンス不明・hash 不一致は閉じます。
3. **公開判断記録と医学レビューを分ける。** `BETA_PUBLICATION_DECISIONS` は
   「配信しているファイル（hash 指定）に対して、指す構造を確認した」記録で、
   medical sign-off ではありません。`brain-anatomy` の医学レビューは
   `pending` のままで、UI もそう表示します。
4. **配信境界を判定に合わせる。** production ビルドでは `?preview=1` も
   保存済み `m3l.beta-preview` も効かず（アンロックはビルド時 capability）、
   非公開シーンの dynamic import はバンドルから落ちます。
   `npm run verify:site` が dist の残存を検査します。
5. **公開の情報設計から外す。** 未公開モデルを「準備中」のカード・行として
   大量に残すのをやめ、Landing と Explorer は公開中のモデルだけを並べます。
6. **UI 契約を固定する。** 公開一覧は `src/catalog/publicManifest.js` の 1 本。
   `ready: false` の仮データを作らず、UI は公開判定を再実装しません。

## What this overrides

| 上書きしたもの | どこにあったか |
| --- | --- |
| 「β は脳・心臓の非 prototype シーン（5 件）を公開する」 | `release.js`、`CLAUDE.md`、`beta-release.md` |
| 「心臓解剖が無いので病態を公開するのは意図した判断」 | `release.js` の doc comment、`beta-release.md` §1 |
| 「Landing / Explorer は未公開モデルを準備中として一覧する」 | `Landing.js`、`Explorer.js`、`beta-release.md` |
| hero の心臓が `heart-failure` を開き、冠動脈ジオメトリを載せる | `src/data/landingHero.js` |
| `DEFAULT_SCENE_ID = 'amyloid-beta'`（誤タイプの着地先が非公開モデルになる） | `src/catalog/index.js` |
| 「`?preview=1` は deployed build を無条件でアンロックする」 | `release.js`、`releaseGate.js`、`beta-release.md` §2 |
| HRA 心臓は「production に接続しない技術検証」だけで良い | `asset-pipeline.md`「Next, in this order」 |

## What this deliberately keeps

- **Model Profile / Asset Manifest / clinical review / model card の厳しさ。**
  どれも緩めていません。新しい判定はこれらを**読む**だけで、
  似た意味の `qualityLevel` / `accuracyScore` / `clinicalReady` を新設していません
- **長期の病態構想。** `grand-design.md` §5 の depth ladder と pathology coverage、
  `disease-candidates.md`、既存の病態シーンのコードは残ります。削除していません
- **「全身を扱う」「全臓器が A2 水準の解剖モデルを持つ」という製品要件**
  （`grand-design.md` §4.5）。βの範囲はその一部であって、置き換えではありません
- **「眺めるだけの anatomy atlas を作ること自体が目的ではない」**（`CLAUDE.md`）。
  解剖は病態が指す先としての土台であり続けます。今回変えたのは
  「土台を、それ自体として先に公開する」という**公開順序**であって、
  製品の North star ではありません
- **`prototype` を公開しないこと**、`reviewed` / `production` の昇格条件、
  臨床レビューの要求
- **既存顧客のアカウント管理導線。** 課金ゲート・webhook・照合・監査ログ・
  Supabase RLS には触れていません

## Consequences

- 公開モデルは 5 件から **1 件**になりました。クロール面も 5 ページから 1 ページ、
  リンクプレビューカードも 6 枚から 2 枚になり、非公開分の PNG は削除しました
  （`npm run cards` で再生成できます）
- Explorer と Landing は 1 件だけを並べる状態になります。
  **その情報設計（1 モデルの索引をどう読ませるか）は B1 の担当です**
- production バンドルの JS チャンクは 85 本から 39 本になりました
- `heart-anatomy` は B4 の成果物です。ID は `release.js` と
  `landingHero.js` に予約済みで、合格すれば**どちらも編集せずに**公開に入ります

## Not decided here

将来の収益モデル（医療者向け Pro / チーム / 研究・臨床計算）は
設計メモに留め、料金表・請求プラン・研究用バックエンドは実装していません。
臨床計算は別開発系統で、Pro の上位ボタンにはしません。
