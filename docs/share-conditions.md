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
| 2026-09-10 | 外部自動デプロイ | 直近 PR #52（head `a511302`）の commit status と check run | status は **0 件**、check run は自リポジトリの `test-and-build` **1 件のみ**。Netlify を含む**第三者 App の status も check も 1 件もありません**。Deploy Preview が有効なら PR に出るはずのものが出ていないので、**この GitHub リポジトリのイベントで動く外部ビルドは無い**と読めます |
| 2026-09-10 | PR 連動 | `list_pull_requests`（state=all, 直近 5 件） | `claude/medical-3d-lab-b0-dv85dl` は **closed PR #48 の head**、`claude/medical-3d-lab-b2-1-viewer` は **closed PR #50 の head**。**どちらも共有先に使いません。** 新しいブランチを切ります |

## 確認できていないこと

- **Netlify 側の site 設定そのもの**は読んでいません。この環境に Netlify の接続・API・
  管理画面はありません（利用できる connector は Canva / Figma / Gmail / Google Calendar /
  Google Drive / Slack / GitHub のみ）。上の 2 行目は「**GitHub から見て外部ビルドの反応が
  無い**」という観測であって、Netlify の設定画面を読んだ記録ではありません。
  branch deploy の設定を直接確認できる人がいれば、その日付とともにこの表へ足してください
- **設定は何も変更していません。**
