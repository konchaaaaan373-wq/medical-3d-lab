# B6 — main への同期と、画面内の再試行

**base**: `4df70e9c4cbe92cb5423879bb01bfc13fc65e32e`（レビュー側が復元済み）
**取り込んだ main**: `dae2acc7a622475454b4a73362d7177225d1ab87`
**HEAD・コミット数**: 同梱 `MANIFEST.json` の `head` / `bundle.commits` が正です
**branch**: `claude/main-integration-b6`（**新しいローカル統合単位**。
`claude/medical-3d-lab-b3-1-brain-view` は `4df70e9` のまま残してあります）

push・PR 操作・GitHub merge・本番/外部 preview デプロイ・課金変更は 0 件。
**このセッションからの Actions 起動・再実行も 0 回**です（既存 main の push で動いた CI の
履歴とは別の話です）。心臓の公開ゲートは閉じたままです。

---

## まず訂正します

**「Work B5 未着」は、プロジェクト全体の話としては誤りでした。** main を読んで確認したところ、
`src/main.js` に Work B5 の presentation mount・shortcut guard・public diagnostic copy control が
接続済みです。未着だったのは**この branch の入力**であって、そう書き分けていませんでした。
`docs/work-integration-handoff.md` の冒頭表にも訂正を入れています。

## 利用者が新しくできること

**読み込みに失敗したモデルから、画面内のボタンを押して戻れます。**
これまでは失敗したことは分かっても、できることがありませんでした。

「再読み込みして再試行 / Reload and try again」——押すと何が起きるかを名乗るボタンです。
route（hash）と言語（`localStorage`）は保持されるので、**同じモデルに同じ言語で**戻ります。
**観察していた視点は復元しません**し、そう主張もしていません。

## 実際に接続済みの範囲

| どこ | 何を | 担当 |
| --- | --- | --- |
| `src/app/App.js` | `createApp({ stage, ui, onRetryModel })`。任意 callback を panel へ渡すだけ | Claude |
| `src/components/AnatomyPanel.js` | `.anatomy-panel-retry`（`data-action="retry"`）。**`error` かつ callback がある**ときだけ描画 | Claude |
| `src/main.js` | `onRetryModel: () => window.location.reload()` | **Work のファイル**。契約上 Work の担当ですが、**実ボタンを検証するには注入が要る**ため最小形で入れました。置き換えても panel 側は無改修です |
| `src/styles/anatomy-panel.css` | ボタンの見た目（既存の失敗色を流用） | Claude |

**注入が無ければ要素ごと作りません。** 「有効に見えて何も起きない」を出さないためです。

## main との統合で判断したこと

main は squash merge なので**共通祖先に旧 SHA が残りません**（merge-base `837505a`、
main 側 31 / 自 branch 側 39 コミット）。**15 件の conflict をすべて内容で判断**しました。
旧 stack の一括上書きはしていません。

- **`src/main.js` は main と 1 バイトも違いません**（上記 `onRetryModel` の 1 箇所を除く）
- **`tests/helpers/fake-dom.js` は union。** main の `removeAttribute`（hidden/disabled）と
  **guard 付き detach を採用**しました——自 branch の 1 行版は `indexOf` が −1 のときに
  最後の子を削ってしまいます
- main 側が同じ作業の**古い形**だったファイル（AnatomyPanel・BrainAnatomyScene・App・
  anatomy-panel.css・check-anatomy-interaction）は、**main にしか無い行が無いことを 1 行ずつ確認**
  してから superset を採用しました。白質・深部灰白質の不透明度規則など、main の geometry 側の
  中身はすべて残っています
- 公開判断は**新しい方**（2026-09-09 / card revision 14）を採用、心臓の revision 行を追加

## 自己検証（すべて現行 HEAD）

| 何を | 結果 |
| --- | --- |
| `npm test` | **1824 pass / 0 fail**（merge 直後は 1817。main の 33 件と自 branch のものが 1 ツリーで、そこへ retry と failure-recovery のテストを追加） |
| `npm run build` → `npm run verify:site` | 通過。**heart-anatomy の chunk は production build に入りません** |
| 公開ゲート | 公開は `brain-anatomy` の 1 件。heart-anatomy は 2 理由で拒否 |
| `npm run assets:validate` | **exit 1** 維持（既知 error を合格に変えていません） |
| **`npm run verify:anatomy`（公開脳・production build）** | **通過。** atlas を abort → 既定の「部位」タブのまま error 文 → **click / Enter / Space で実ボタン**を操作 → 271 構造へ復帰 → 部位を選択。844×390 / 375×667 でもボタンが**画面内かつ非被覆** |
| **その検査がボタンに依存していることの確認** | `main.js` の注入を外して build し直すと**5 件落ちて exit 1**、戻して全通過。`page.reload()` で製品を助けていません |
| 開発者向け文字列の漏れ | `npm run` / `Error:` / `TypeError` が画面に出ないことを assert |

契約の受入項目との対応：1・2・3・4・6・7 は上記で確認済み。5（WebGL 生成自体の失敗）は
`tests/failure-recovery.test.js` を追加しました——fallback 側の retry は 1 つだけで押すと
reload し、**そのページには解剖パネルが無いので 2 つの retry が同時に出ることはありません**。
開発者向け文字列が出ないことも assert しています。ただし**この経路は実ブラウザで
再実行していません**（下記）。

## 統合待ち（具体的に）

- **Work B6 の `src/main.js` 差分と外枠 UI/CSS。** 未着です。今回入れた `onRetryModel` の注入は
  Work が置き換える前提の最小形で、`docs/work-integration-handoff.md` に契約として記載しました
- **失敗表示の見た目・導線。** `.anatomy-panel-retry` と `.anatomy-panel-status` の
  scoped CSS は Work 側で寄せてください。panel 側の API は変わりません
- **診断コピーとの関係。** main の `createPublicDiagnosticCopyControl` は
  `SceneFailureFallback`（WebGL 失敗）側に付いています。asset 失敗側へ同じものを出すかは
  Work の判断で、こちらでは足していません

## 今回こちらで確認していないこと

- **解剖・臨床・法務レビュー、asset ライセンス。** すべて pending のままです
- **WebGL 生成自体の失敗からの復帰**を実ブラウザで再実行していません（既存 fallback は無改修）
- **実機・実 GPU。** headless SwiftShader の 1 環境です
- **main の実ブラウザ全体**を独立に再検証したわけではありません。読んだのはソースと接続点です
- **心臓 driver の 3 viewport 連続実行**は、この環境で timeout します。
  **各 viewport を単独で実行するとすべて通ります**（1280×800 / 844×390 / 375×667）。
  切り分けた結果、失敗の形は 2 つでした：

  1. **sheet 遷移中の click**。Work の presentation は sheet を遷移させるので、
     `data-sheet` が `closed` になった後もしばらく panel が上に描かれています。
     位置で掴んでいた click（Parts ボタン・sheet の閉じる・視点ボタン・部位行・
     scope toggle）が `press()` の到達性ゲートを通っていませんでした。**修正済み**
     （`pressLocator()` に集約）
  2. **3 つ目の scene が 180 秒以内に `ready` にならない**。47 MB の候補 GLB と
     血管ファイルをソフトウェアレンダラで 3 回続けて読むと、この容器では間に合いません。
     **これは製品の所見ではないので、`exit 1`（不合格）ではなく `exit 2`（実行不能）**
     として報告するようにしました

  **心臓はローカル preview 専用**で、公開脳の受入（`verify:anatomy`）には影響しません。
