# 作業ブランチへ push してよい条件と、その確認記録

**このファイルは判断の記録です。** 「たぶん大丈夫」を毎回作り直さないために、
何を読んで何が言えたのかを書いてあります。次に確認するときは、
**同じものを同じ方法で読み直して**、この表を更新してください。

## 条件

専用作業ブランチ（**PR が付いていない新しいブランチ**）への push は、次の 3 つが
確認できているときに限り行います。

1. push で **GitHub Actions が起動しない**
2. push で **外部の自動デプロイが起きない**
3. push 先が **既存 PR に連動していない**

PR の作成・更新、main へのマージ、Actions の起動・再実行、本番／外部 preview 公開、
課金変更は、**この記録があっても別承認**です。

## 確認記録

| 確認日 | 対象 | 読んだもの | 言えること |
| --- | --- | --- | --- |
| 2026-09-10 | GitHub Actions | `.github/workflows/` の 4 本すべての `on:` | `ci.yml` は `pull_request` と `push: branches: [main]` のみ。他の 3 本は `workflow_dispatch`（`verify-live.yml` は加えて毎日 22:20 UTC の `schedule`——push とは無関係）。**PR の付かないブランチへの push では 1 本も起動しません** |
| 2026-09-10 | 同上（実測） | push 後の `list_workflow_runs` | `claude/heart-anatomy-b7` への push 2 回で **新しい run は 0 件**。最新 run は当日 06:47 の main への push のまま |
| 2026-09-10 | 外部ビルドの反応（GitHub 上） | 直近 PR #52（head `a511302`）の commit status と check run | status は **0 件**、check run は自リポジトリの `test-and-build` **1 件のみ**。Netlify を含む**第三者 App の status も check も 1 件もありません**。**言えるのはここまで**——GitHub 上で外部ビルドの反応を観測していない、というだけです。Netlify 側の設定は下の「確認できていないこと」を参照 |
| 2026-09-10 | PR 連動 | `list_pull_requests`（state=all, 直近 5 件） | `claude/medical-3d-lab-b0-dv85dl` は **closed PR #48 の head**、`claude/medical-3d-lab-b2-1-viewer` は **closed PR #50 の head**。**どちらも共有先に使いません。** 新しいブランチを切ります |

## 確認できていないこと

- **Netlify 側の site 設定そのもの、および外部公開の有無は未確認です。** 上の 2 行目は
  「**GitHub 上では外部ビルドの反応を観測していない**」という観測にとどまります。
  **これだけを「自動デプロイが起きない」の確認済み条件としては扱いません。**
  この環境に Netlify の接続・API・管理画面はありません（利用できる connector は
  Canva / Figma / Gmail / Google Calendar / Google Drive / Slack / GitHub のみ）。
  読み取れる接続ができたときに、対象サイト・branch 設定・確認日をここへ 1 度だけ足してください
- **設定は何も変更していません。**
