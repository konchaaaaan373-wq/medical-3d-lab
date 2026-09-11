# B4 integration — 記録の整合 3 点と、実際に押せるかの検証

**base**: `587d15f92703e632e5be02044041edb44df3d807`（レビュー側が復元済みの HEAD）
**HEAD・コミット数**: 同梱 `MANIFEST.json` の `head` と `bundle.commits` が正です
**branch**: `claude/medical-3d-lab-b3-1-brain-view`

> 前回の報告が「コミット数 3」と書いて実体が 5 だった件を受けて、**HEAD と件数を
> 文書に書き写すのをやめました。** 生成される `MANIFEST.json` 1 か所が持ちます。
> この文書の数値はすべて「どの SHA で測ったか」と対で読んでください。

push・PR 操作・merge・本番/新規 preview のデプロイ・課金変更は 0 件。
**GitHub Actions の起動・再実行も 0 回。** 心臓の公開ゲートは閉じたままです。
`VITE_ALLOW_PREVIEW=1` はローカル build にのみ使っており、外部への preview デプロイは
していません。

---

## 利用者が新しくできること

**この 2 つは、これまで実際にはできませんでした。**

1. **モデルの読み込みに失敗したとき、画面がそう言います。**
   これまでは文言が「詳細」タブの footer にしかなく、タブ本体は開いているタブの内容しか
   DOM に入らないため、既定の「部位」タブでは**どこにも出ていませんでした**。
   利用者が見るのは、普段どおりの枠と空の canvas だけでした。**公開中の脳シーンも同じ**でした。
2. **375×667（縦向きスマートフォン）で「決まった見せ方」のボタンが押せます。**
   `.inspection-panel` が 560px 以下で fixed のボトムシートになり、解剖パネルの表示タブに
   埋め込まれた状態でも flow から浮いて、その footer が「心腔の中を見る」を覆っていました。
   同じサイズで「モデルの範囲と出典」も幅 236px 固定のまま 146px の列に入って切れていました。

加えて、**心臓シーンに scope panel（モデルの範囲と出典）が付きました。** `alpha` は
モデル層・evidence dossier・model card とセットで持つ約束で、これだけ欠けていました。
本文は model card と dossier の現行記述から起こしており、**そこに無い主張は足していません**
——心腔の面が空間か壁か、血管が内腔か壁か、接合はどうか、はすべて「確認中」のままです。

## 実際に接続済みの範囲

| | |
| --- | --- |
| 共有 `App.js` / `AnatomyPanel.js` / `ControlPanel.js` | `noteDisplayChanged()` の 4 経路、recipe 自身だけの `byReader: false`、`data-control`、名称要確認・未レビュー表示は**すべて保持**。今回足したのは summary の `.anatomy-panel-status` 1 行だけです |
| `src/styles/ui.css` | 2 つの phone 規則を `.rail > .inspection-panel` へ限定。`.model-scope` の幅を `min(236px, 100%)` へ |
| `src/data/heartAnatomy.js` | `HEART_MODEL_SCOPE` を追加し `meta.modelScope` から参照 |
| 検証 driver | `--viewport` 対応、canvas の実位置と重なりから操作点を決定、production build を掴んだら exit 2 |

**Work B5 の UI は 1 行も統合していません**（下記）。

## 統合待ち

**Work B5 の成果物は、この時点でも未着です。** 添付パックにも Work の manifest・base・
HEAD・差分・接続案は含まれていませんでした。したがって**統合済みの箇所はありません**。
仮接続を統合済みとして報告していません。

Work の担当（外枠 UI・公開画面・読み込み/失敗/再試行の見せ方・ヘルプ・Neco 導線・
Landing の見た目）は再実装していません。今回の `.anatomy-panel-status` は
**「どこにも出ない」を「常に載っている場所に出る」へ直した最小修正**であって、
失敗表示のデザインを確定させたものではありません。
**この状態向けの製品内 retry ボタンは今もありません**——現状の復帰手段はページ再読み込みで、
`SceneFailureFallback` の「3Dを再試行」は WebGL 自体が失敗した別経路です。
これは assert せず、run の記録として残しています。

共有ファイルへの依頼は 3 点です（詳細は `docs/work-integration-handoff.md`）：
camera を動かす新しい入口では `noteDisplayChanged()` を呼ぶ、console のボタンでは
`data-control` を残す、埋め込み側の inspection panel を fixed にしない。

## 記録の整合 3 点（今回依頼分）

| | 何を直したか |
| --- | --- |
| **A. 接続距離** | `nearestSampledVertexMm` は**採用頂点間**の距離です。model card §5 が `The two files touch where they should` / `Nearest-point distance` と書き、§7 と evidence dossier と asset QA が「接合は未測定」と書いていました——**数値を載せている文書の中で**。量の名前と、それが決めないこと（接合・連続・水密・解剖学的正しさ）を分けました。**数値は再測定していません** |
| **B. 増分 restore の案内** | 「base は公開 default branch の祖先だから `git fetch origin`」を撤回。`--since` は任意コミットを取り、この一連の base は remote に無いローカル HEAD です。「**その base を含む repository が必要**」へ。自動 fetch も新しい復元モードも足していません |
| **C. 報告の同期** | HEAD とコミット数を `MANIFEST.json` へ一元化。`1741`/`1771` は `256e613`/`4e80686` と、独立 40 テストは `587d15f` とラベル付けして保存しました |

A のテストを書く過程で、**レビューの一覧に無かった 4 件目**が出ました。evidence dossier に
「心腔は測定済みで cavity cast」が、`enclosedMl` のコメントに「122 mL なら心腔であって
心筋込みではない」が残っていました——B4-G1 で撤回した主張の生き残りです。両方撤回しました。

---

## 実装者（Claude）の自己検証 — すべて現行 HEAD

| 何を | 結果 |
| --- | --- |
| `npm test` | **1784 pass / 0 fail** |
| `npm run build` → `npm run verify:site` | 通過。**heart-anatomy の chunk は production build に入りません** |
| 公開ゲート | `RELEASED_SCENES` は `brain-anatomy` の 1 件。heart-anatomy は 2 理由で拒否 |
| `npm run assets:validate` | **exit 1**（心臓 408 / 血管 33 errors）。不合格のまま維持 |
| `npm run verify:recipe-report`（3 viewport） | **81 assert / 0 fail / exit 0**。1280×800・844×390・375×667、実 GLB・preview build |
| 失敗→手動再試行 | 候補 GLB を abort して scene の missing-candidate 分岐を通し、error・hint・画面表示・再読み込みでの復帰（46 構造）を確認 |
| 修正前の再現 | 3 件とも**修正前に driver で落ちること**を確認してから直しています |
| 実行ログ | `docs/screenshots/b4-next/recipe-report-run.json` に完全 SHA・dirty・viewport・build 条件・全 assert・**pageerror と console error の区別**・候補 asset の pin を記録 |

**レビュー側の診断コードをこちらで再実行したものは、自己検証です。** 独立検証が
増えたことにはなりません。

## 今回の独立検証（レビュー側、対象 `587d15f`）

対象 40 テスト（metrics 15 / recipe report 7 / packer 10 / validator CLI 8）、
四腔の日英 description の返り値、非破壊復元、driver の追跡と `node --check`、公開判定。
**全 1784 テスト・実 GLB・実ブラウザの 81 手順・production build は含みません。**
レビュー環境では依存取得が DNS で失敗し、driver は exit 2（実行不能）でした——
これは合格ではありません。

## 未確認

- **解剖レビュー・臨床レビュー・法務判断。** 技術テストの合格は医学的承認ではありません
- **実 GLB の Validator error 408/33 の再調査。** exit code の挙動を確認しただけです
- **実機・実 GPU。** headless SwiftShader の 1 環境です
- **描画のタイミングと原寸の見やすさの主観面。** 「消えている」は観測できても
  「どれだけ速く」「読みやすいか」は測っていません
- **他シーンへの影響は 1 件だけ実測しました。** `.rail > .inspection-panel` への限定が
  病態シーン（rail 単独配置）を変えていないことは、`heart-failure` を 375×667 で開いて
  確認済みです——`inRail: true` / `position: fixed` / `z-index: 12` / 幅 347px で、
  限定前と同じです。**他の病態シーンと 844×390 では実測していません。**
  なお `npm run verify:ui` は全 viewport・全 surface で通っていますが、
  これが駆動する scene は解剖シーンです
- **Netlify / CI の実挙動。** Actions は 0 回のままです
