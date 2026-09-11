# B4-R1〜R5 の修正を、実ブラウザで確認した記録

| | |
| --- | --- |
| 撮影時のコミット | `ec4835667730ef352434ae929fa7a9e7a320c75f` |
| 作業ツリー | clean（撮影時） |
| ブラウザ | Chromium 141（Playwright chromium-1194、headless、SwiftShader WebGL2） |
| 配信 | Vite dev server（候補 GLB は dev でしか配信されないため。production build では scene ごとバンドルに入りません） |
| 素材 | `VH_M_Heart.glb` sha256 `b1237e7e…` / `VH_M_Blood_Vasculature.glb` sha256 `a31ebed6…` |
| console error | 3 画面とも 0 件 |

**これは実装者（Claude）自身の検証です。第三者の独立検証ではありません。**

| 画像 | 何を確かめたか |
| --- | --- |
| `01-descriptions-1280.png`, `07-descriptions-detail-1280.png` | B4-R1 / R2。心室中隔・腕頭静脈・右心房・大血管・冠動脈の説明を、詳細タブの実 DOM から読み出した |
| `02-name-unverified-1280.png` | B4-R5。**3 箇所同時**——選択見出し「心臓 › 冠動脈 · 名称要確認（出典内で不一致）」、検索結果行「血管・冠動脈・名称要確認」、3D ラベル「左前下行枝 / 名称要確認」 |
| `03-recipe-status-1280.png` | B4-R3 / R4。四腔を手動非表示 → 前面 → 僧帽弁を単独表示 → 「心腔の中を見る」。非表示 0 件・視点変更なし・単独表示だけ解除、それでも「元の表示へ」が出る |
| `04-restored-1280.png` | B4-R3。復元後、単独表示が僧帽弁へ戻っている |
| `05-status-cleared-1280.png` | B4-R4。canvas を実際にドラッグしたあと、計測レポートが消えている |
| `06-844x390.png`, `06-375x667.png` | 3 画面すべてで名称未確定の表示が出ること、横向きだけ compact になること |

## 実測値（ログから）

- **B4-R3**：recipe 前 `{hidden: 四腔, isolated: 僧帽弁, view: anterior, canRestore: false}` →
  recipe 後 `{hidden: 四腔, isolated: null, view: anterior, canRestore: true}` →
  復元後 `{isolated: 僧帽弁, canRestore: false}`
- **B4-R4**：表示文言は「0 件を非表示にしました。前面の視点では、対象 10 のうち 8 件のアンカーが遮られていません。」
  recipe 直後は表示され、実ドラッグ後は消える（`true` → `false`）
- **B4-R5**：3 画面とも `data-selection-identity="source-conflict"`。
  見出しの `::after` の実描画内容と `.label-flag` の実テキストを DOM から取得して確認

## 測れていないこと

- **消失までの時間は測っていません。** この環境の headless レンダラは約 1 fps で、
  1 フレームが猶予（140ms）より長いためです。「消える」ことは確認できます。
  これは検証環境の制約であって、実機性能の値ではありません。
- 実端末（実機）での確認はしていません。
- 単一アンカーの ray は、部位全体が画面内で観察できることを保証しません（脳の F-40 と同じ制限）。
- 解剖学的な妥当性の判断はしていません。
