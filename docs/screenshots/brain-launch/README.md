# 脳特化ローンチ — 変更前後の画面（2026-11-25 撮影）

headless Chromium（SwiftShader）で production ビルドを撮ったものです。
**絵は証拠ではなく参考です**——とくに MRI の左右は、対称な標準脳では絵から判定できません
（[`../../verification-lessons.md`](../../verification-lessons.md) L-185）。左右と連動は
`npm run verify:mri` がページから数で読んでいます。

## ブランド

| | |
| --- | --- |
| アイコン 4 案の比較（16〜256 px、明暗） | [`brand-candidates.png`](brand-candidates.png) — A 案を採用（ADR §1.2） |

## 変更前 → 変更後

| 画面 | 変更前（BYOKI MOTION、main `201635d`） | 変更後（3Dモデルラボ） |
| --- | --- | --- |
| トップ 1280 | [`before-home-1280.png`](before-home-1280.png) | [`after-home-1280.png`](after-home-1280.png) |
| トップ 390 | [`before-home-390.png`](before-home-390.png) | [`after-home-390.png`](after-home-390.png) |
| 脳解剖 1280 | [`before-brain-anatomy-1280.png`](before-brain-anatomy-1280.png) | [`after-brain-anatomy-1280.png`](after-brain-anatomy-1280.png)（ヘッダーに「脳 MRI アトラス」への切替） |
| 解剖の棚 | [`before-anatomy-1280.png`](before-anatomy-1280.png)（4 臓器の選択） | 脳のみ。ヘッダーからは外しました |

## 新しい画面

| 画面 | |
| --- | --- |
| 高次脳機能の入口 `#/functions` | [`after-functions-1280.png`](after-functions-1280.png) — 機能モデルは未公開と言葉で伝える |
| MRI アトラス・連動（左海馬を選択） | [`after-mri-linked-1440.png`](after-mri-linked-1440.png) |
| MRI アトラス・3D のみ（右視床、皮質を透かす、前から） | [`after-mri-3d-inside-1440.png`](after-mri-3d-inside-1440.png) — 前から見るので被験者の右は画面の左 |
| MRI アトラス・MRI のみ（T2、左被殻） | [`after-mri-planes-t2-1440.png`](after-mri-planes-t2-1440.png) |
| MRI アトラス・スマホ 390 | [`after-mri-phone-390.png`](after-mri-phone-390.png) |
| 公開範囲外の直接 URL（`#/heart-anatomy`） | [`after-locked-heart-1280.png`](after-locked-heart-1280.png) |
