# Prototype audit — 2026-08

全身プロトタイプ 14 シーンを、コードではなく**実際のブラウザ描画**で監査したときの
記録です。撮影は `vite preview` + Chromium（SwiftShader）、desktop 1280×800 /
mobile 390×844。

| ファイル | 内容 |
| --- | --- |
| `organ-explorer.jpg` | `#/organs` — 系統・臓器・シーンの一覧 |
| `organ-explorer-mobile.jpg` | 同上、390×844 |
| `body-overview.jpg` | 全身の概観（腎・泌尿器まで表示した状態） |
| `lungs.jpg` | 呼吸と肺 |
| `kidney.jpg` | 濾過から膀胱まで |
| `liver.jpg` | 門脈血流と胆汁 |
| `gastrointestinal.jpg` | 腸管の輸送 |
| `musculoskeletal.jpg` | 骨のリモデリング |

**これは監査後の状態です。** 監査で見つかった問題（気管支が肺に届かない、
食道が胃の手前で切れる、肝臓がきのこ型、膵臓が板、膀胱が皿、副腎が隅、
甲状腺より気管が目立つ、ラベルが対象からずれる、シーン切替が被写体を覆う、など）は
同じコミットで修正しています。判定基準は
[`docs/adding-a-scene.md`](../../docs/adding-a-scene.md) の
**Prototype visual acceptance criteria**。
