# 判断用パケット — 心臓アトラスの候補 asset を採用するか

**これは承認書ではありません。** 判断に要る事実を 1 か所へ集めたものです。
値はすべて repo 内の正本から集めており、**推測で足した事実はありません**。
各項目の出どころを右端に置いてあるので、疑わしいものはそこを読んでください。

対象は 2 ファイルです。`heart-anatomy` はこの 2 つを同時に読み込みます——
**片方だけの採用は選択肢になりません**（心臓ファイルに大血管が無く、
大血管ファイルが補うという関係のため）。

---

## 1. `hubmap-vh-m-heart`

| | | 出どころ |
| --- | --- | --- |
| **asset ID** | `hubmap-vh-m-heart` | `src/catalog/devAssets.js` |
| **出典** | HuBMAP *3D Reference Organ for Heart, Male v1.2* | QA doc |
| **作者** | Kristen Browne（ORCID 0000-0003-4066-7531） | publisher の metadata |
| **レビュアー（出版元側）** | Shin Lin（ORCID 0000-0003-0118-0413） | 同上 |
| **発行者 / 資金** | HuBMAP / NIH award OT2OD026671 | 同上 |
| **元データ** | Visible Human Male（U.S. National Library of Medicine） | 同上 |
| **DOI** | `10.48539/HBM373.VSTV.568` | 同上 |
| **元 URL** | `raw.githubusercontent.com/hubmapconsortium/ccf-releases` @ `b036a91a…` / `v1.2/models/VH_M_Heart.glb` | `devAssets.js` |
| **license（出版元の記載）** | **CC BY 4.0** | publisher metadata |
| **必要 attribution** | 作者・出版元・ライセンス・改変の有無。加えて **NLM（Visible Human Male）の courtesy 表記**が未整備 | QA doc |
| **hash（SHA-256）** | `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70` | `devAssets.js`・QA で再取得して一致 |
| **バイト数** | 4,071,500（記録と一致） | QA doc |
| **利用している構造** | 14 パーツすべて（心房 2・心室 2・心室中隔・弁 4・乳頭筋 5）。UBERON / FMA の id 付き | QA doc の表 |
| **glTF validator 結果** | ❌ **失敗。408 errors / 0 warnings / 3 hints。** 全件 `ACCESSOR_VECTOR3_NON_UNIT`（縮退した頂点法線）で、**すべて `VH_M_right_cardiac_atrium` の 24,068 頂点中 408（1.7%）に集中**。他メッシュは無傷 | `npm run assets:validate`、報告 JSON を同梱 |
| **既知の geometry 問題** | **大血管が無い**（大動脈・肺動脈幹・上下大静脈・肺静脈すべて）。**冠動脈が無い。** 心膜・刺激伝導系・腱索が無い。**心筋壁が独立していない**——各腔のメッシュが壁シェルなのか内腔面なのかは**未判定** | QA doc |
| **改変内容** | **ファイルは一切改変していません**（read-only で読むだけ）。実行時に `modelRoot` へ**オフセットと一様スケールを 1 回**かけるだけで、これは表示上の変換です | `HeartAnatomyScene.js` |
| **配信時に必要な義務** | ① 全構成要素への attribution ② CC BY の改変表示 ③ **NLM courtesy 表記**（現在どこにも出ていない） | QA doc |
| **未確認の法務事項** | ⚠️ **Visible Human Male 自体の NLM 利用条件を読んでいません。** CC BY 4.0 の解釈は出版元の記載に基づく **engineering assessment** であり、法務レビューではありません | QA doc が明記 |

### 判断欄

- [ ] **adopt**  — asset manifest へ移し、release gate の審査に進める
- [ ] **do not adopt** — 理由：
- [ ] **hold** — 追加で要るもの：

---

## 2. `hubmap-vh-m-blood-vasculature`

| | | 出どころ |
| --- | --- | --- |
| **asset ID** | `hubmap-vh-m-blood-vasculature` | `devAssets.js` |
| **出典** | HuBMAP *Blood Vasculature, Male v1.2*（同一 release・同一 commit） | QA doc |
| **DOI** | `10.48539/HBM686.LBDQ.998` | QA doc |
| **元 URL** | 同 commit の `v1.2/models/VH_M_Blood_Vasculature.glb` | `devAssets.js` |
| **license（出版元の記載）** | **CC BY 4.0**、元データは Visible Human Male | QA doc |
| **hash（SHA-256）** | `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d` | `devAssets.js` |
| **バイト数** | 7,436,204 | `devAssets.js` |
| **利用している構造** | **`VH_M_blood_vasculature_of_heart` の 37 メッシュだけ**（ファイル全 104 メッシュ中）。**出版元自身の意味的な区切りであって、こちらが箱で囲ったものではありません。** 残る 67（眼・腹部・骨盤）は読み込まれるが表示せず、数をシーンが報告します | QA doc・`HeartAnatomyScene.js` |
| **glTF validator 結果** | ❌ **失敗。33 errors / 0 warnings / 3 hints。** 全件 `ACCESSOR_VECTOR3_NON_UNIT`。上大静脈の 5,636 頂点中 21、左冠動脈の 6,306 頂点中 12 に限局 | `npm run assets:validate` |
| **既知の geometry 問題** | ⚠️ **1 ノードが自分と矛盾**：`VH_M_left_anterior_descending_artery` の label と id（`FMA:8636`）は**肺動脈の枝**を指し、ノード名は冠動脈。**未修正で、両言語でその不一致を構造カードに出しています**。「circumflex」という名のメッシュは無い。2 メッシュが `FMA:3860` を共有（語彙の重複であって構造の重複ではない）。**37 面すべてについて、内腔面か外表面か・壁厚の有無が未判定**（過去 2 度の結論を撤回済み） | QA doc |
| **改変内容** | **ファイル無改変。** サブツリーを world matrix 適用のまま親付け替えするのみ（体内での位置を保つため）。スケールは**心臓側から取り**、この 2 つを分離する正規化はしていません | `HeartAnatomyScene.js` |
| **座標系** | 2 ファイルが**同一の全身座標系を共有していることを実測**（仮定ではなく） | QA doc |
| **配信時に必要な義務** | 心臓ファイルと同じ 3 点。**現時点で attribution surface は存在しません** | QA doc |
| **未確認の法務事項** | ⚠️ 心臓ファイルと同じ。**NLM の条件は未読、法務レビューなし** | QA doc |

### 判断欄

- [ ] **adopt**
- [ ] **do not adopt** — 理由：
- [ ] **hold** — 追加で要るもの：

---

## この 2 件について、判断の前に知っておいていただきたいこと

**1. validator の失敗は「保留」ではなく「失敗」です。** 441 件すべてが縮退した頂点法線で、
出版元のデータ側の問題です。**こちらでは修正していません**（第三者データを書き換えないため）。
実害は「一部の頂点に使える陰影法線が無い」ことで、描画は落ちません。
ただし asset release gate に `formatValidation: passed` と**記録できません**。

**そしてこれは、そのままでは公開できないという意味です。** gate のコードを読んで確かめました
（`assetReleaseProblems`, `src/catalog/assetManifest.js`）——`formatValidation` は
**errors が 0 かつ warnings が 0 のときだけ** passed になり、それ以外は
`failed` と記録しても `passed` と記録しても同じように弾かれます。

> `if (gate === FORMAT_VALIDATION && (entry.errors !== 0 || entry.warnings !== 0))`

**「失敗を把握したうえで許容する」という逃げ道は、この gate にはありません。**
したがって選択肢は実質 2 つです——

- **(A)** offline 工程で法線を再計算した**派生ファイル**を作る。
  **別 asset・別 hash**になり、CC BY の「改変あり」表示義務が発生します。
  現状これが**公開に到達できる唯一の道**です
- **(B)** 採用しない（＝心臓は β に出さない）

※ `anatomyExpertReview` と `clinicianReview` の 2 gate は、scene が alpha の間は
`pending` のままでも通せます。**`formatValidation` は通せません。**

**2. 解剖学的な判断は誰もしていません。** ラベルは出版元のものです。
この形状が正常心の妥当な表現かは解剖学者の判断で、**まだ行われていません**。

**3. 法務は未着手です。** CC BY 4.0 の読みは出版元の記載に基づく engineering assessment、
**Visible Human Male 自体の NLM 条件は未読**です。ここだけは repo の中に答えがありません。

---

## 承認後に何が起きるか

`docs/decisions/HEART-ADOPTION-APPLY.md` に手順があります。**承認値を仮入力して
テストを緑にすることはしていません**——`betaPublicationProblems('heart-anatomy')` は
いまも 3 件を返します。
