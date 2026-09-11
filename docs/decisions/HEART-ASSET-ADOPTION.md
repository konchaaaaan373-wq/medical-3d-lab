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
| **未確認の法務事項** | ⚠️ **Visible Human Male 自体の NLM 利用条件を読んでいません**（下の確認項目一覧）。CC BY 4.0 の解釈は出版元の記載に基づく **engineering assessment** であり、法務レビューではありません | QA doc が明記 |

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

- **(A)** offline 工程で**派生ファイル**を作る。**別 asset・別 hash**になり、
  CC BY の「改変あり」表示義務が発生します。**→ 実際にやってみました。下を読んでください**
- **(B)** 採用しない（＝心臓は β に出さない）

### (A) は成立します — 実測済み

`node scripts/repair-candidate-gltf.mjs`（source は read-only、出力は
`dev-assets/derived/`）。**Khronos validator が両ファイルとも 0 errors / 0 warnings** になりました。

最初に法線の再計算だけを試したところ、**408 件中 200 件しか直りませんでした**——
残りは面積ゼロの三角形に載っていて、平均する面が無かったためです。内訳は：

| | 心臓 | 大血管 | 対処 |
| --- | --- | --- | --- |
| 隣接面の面積加重平均で再計算できた | 200 | 9 | 通常の法線再計算 |
| 隣接面がすべて面積ゼロ（頂点座標が重複） | 167 | 13 | **面積ゼロの三角形を削除** |
| 隣接面に面積はあるが、ちょうど打ち消し合う（面が折り返している） | 40 | 10 | **最大面の法線を採用**（折り目に正解は無いので決定的に選ぶ） |
| その他の面積ゼロ | 1 | 1 | 同上 |

**面積ゼロの三角形は何も描きません**——だから削除しても見た目は変わりません。
これが「形を作り直していない」と言える根拠です。削除した数：

| | 面積ゼロ三角形 | 重複面 | 全三角形に対する割合 |
| --- | --- | --- | --- |
| 心臓 | **820**（すべて右心房） | 4 | 0.50% |
| 大血管 | **26** | 5 | 0.007% |

**動かしていないことを数値で確認しています**（スクリプトが前後で測ります）——
頂点座標のハッシュ・頂点数・ノード名・階層・ontology id（`extras`）・マテリアル数は
**すべて一致**。三角形数の減少は、削除した数とちょうど一致します。

**派生ファイルの hash**（manifest が pin すべき値）:

| asset | derived sha256 |
| --- | --- |
| `hubmap-vh-m-heart` | `46d375e36d8181c161b70e1f0b8f0d778364f0a8414eebce4e4fda1cea73eb3d` |
| `hubmap-vh-m-blood-vasculature` | `b971eec1fc0d0d6a0fe080c634584c84ab3517239818ca091efc7a0bd0ec13fb` |

**見た目の比較**：`docs/screenshots/b15-repair/` に source / derived の実レンダリングがあります。
選択可能な部位は**どちらも 46 件**、画面は見分けがつきません。

記録：[`docs/asset-qa/measurements/normal-repair.json`](../asset-qa/measurements/normal-repair.json)、
手順：[`scripts/repair-candidate-gltf.mjs`](../../scripts/repair-candidate-gltf.mjs)

**まだ passed にはしていません。** derived が manifest に入り、この hash に結びついた
QA 記録が書かれるまでは、gate は候補のままです。

### 判断していただきたいこと（技術面はここまでで解決）

- 面積ゼロ三角形 820 本の削除を**改変として受け入れるか**（見た目は不変、CC BY の改変表示は必要）
- 折り返し 50 頂点で**最大面の法線を採る**という決め方でよいか
- **右心房に 820 本の退化三角形がある**こと自体を、出版元へ報告するか

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


---

## provenance chain — 2 ファイルを 1 対 1 で追跡

**出典記録を上流から取り直して確認しました**（pin した commit の、各オブジェクト自身の
metadata ファイル）。写しは [`docs/asset-qa/upstream/`](../asset-qa/upstream/) にあります。

| | 心臓 | 大血管 |
| --- | --- | --- |
| **元ファイル名** | `VH_M_Heart.glb` | `VH_M_Blood_Vasculature.glb` |
| **source repository** | `hubmapconsortium/ccf-releases` | 同左 |
| **commit（pin）** | `b036a91aaf7234f462b1249d4a5f4fb0e982f412` | 同左 |
| **source URL** | `…/$COMMIT/v1.2/models/VH_M_Heart.glb` | `…/$COMMIT/v1.2/models/VH_M_Blood_Vasculature.glb` |
| **HRA object / version** | **3D Reference Organ for Heart, Male v1.2** | **3D Reference Organ for Blood Vasculature, Male v1.2** |
| **HuBMAP ID** | `HBM373.VSTV.568` | `HBM686.LBDQ.998` |
| **DOI** | `10.48539/HBM373.VSTV.568` | `10.48539/HBM686.LBDQ.998` |
| **creator(s)** | Kristen Browne（ORCID 0000-0003-4066-7531） | Kristen Browne ＋ **Heidi Schlehlein**（0000-0002-3333-5646） |
| **reviewer(s)** | Shin Lin | Marc Halushka ＋ Shin Lin |
| **publisher / funder** | HuBMAP / NIH OT2OD026671 | 同左 |
| **license（各オブジェクト自身の record に明記）** | **CC BY 4.0** | **CC BY 4.0** |
| **元データ** | **Visible Human Male**（NLM） | **Visible Human Male**（NLM） |
| **download 時点** | 2026-09-09（`raw.githubusercontent.com`） | 2026-09-09（同） |
| **source hash（sha256）** | `b1237e7e…8244c70` | `a31ebed6…4309d0d` |
| **derived hash（sha256）** | `46d375e3…a73eb3d` | `b971eec1…d0ec13fb` |
| **記録の出どころ** | `v1.3/markdown/ref-organs/heart-male.md` | `v1.3/markdown/ref-organs/blood-vasculature-male.md` |

**2 ファイルは別 record で、それぞれが自分の DOI と自分の license 記載を持ちます。**
片方から他方を推定してはいません——2 つとも上流で個別に確認し、**どちらも CC BY 4.0** でした。

### ⚠️ 頂いた公式情報と、実際に使っているファイルは別オブジェクトです

Astra 側で確認されたのは **Heart Female v1.1 / Visible Human Female** の record と伺いました。
**このリポジトリが使っているのは Male v1.2 の 2 本**（`VH_M_*`、元データは Visible Human **Male**）です。

女性版の record は、男性版ファイルの条件を証明しません——これは「vasculature を heart から
推定しない」のと同じ理由です。**ただし結論は変わりません**：上で男性版 2 本それぞれの
record を直接確認し、どちらも CC BY 4.0・Visible Human Male・publisher HuBMAP でした。
結論が同じでも、**根拠は別々に取っています。**

なお attribution では **Male** と書く必要があります（Female ではありません）。

### 上流 record 内の小さな不整合（記録のみ）

心臓の record は `Creator(s): Kristen Browne` の一方で、`How to Cite This 3D Data` は
**「Kristen Browne; Heidi Schlehlein」**と 2 名を挙げています。**修正せず記録します。**
引用文は出版元が「こう引いてほしい」と書いたものなので、**attribution は How to Cite に従う**
のが安全です。

---

## 法務論点 — 公式情報で解決したもの／残るもの

### ✅ 解決（根拠つき）

| 論点 | 回答 | 根拠 |
| --- | --- | --- |
| **NLM の license 申請は要るか** | **不要。** 2019 年以降、VHP dataset の利用に license 契約は不要 | NLM 公式（Astra 確認） |
| **NLM の attribution は要るか** | **必要。** “Courtesy of the U.S. National Library of Medicine” 等、明確かつ目立つ形で source を明示 | NLM Terms and Conditions |
| **商用 Web 配信してよいか** | **可。** HuBMAP CCF 3D Reference Object Library は teaching / research / **commercial applications** での利用可と公式 FAQ に記載。加えて CC BY 4.0 自体が商用利用を許可 | HuBMAP 公式 FAQ ＋ 各 record の license 記載 |
| **HuBMAP の attribution は要るか** | **必要。** CC BY 4.0 の要件。各 record が「How to Cite」を明示 | 上流 record（写し同梱） |
| **derived work（改変）は可か** | **可。ただし改変した旨の表示が必要。** CC BY 4.0 は改変を許可し、attribution に modification indication を含めることを求めます | CC BY 4.0 |
| **第三者（HuBMAP）経由の再配布は可か** | **可。** CC BY 4.0 は再配布を許可。HuBMAP 自身が VHP 由来として公開しています | 各 record |
| **2 ファイルは同じ license 根拠か** | **それぞれ独立に CC BY 4.0。** 推定ではなく、2 つの record を個別に確認 | 上の provenance 表 |
| **asset 自体が壊れていて公開不能か** | **解消。** 派生 GLB 2 本とも validator 0 errors / 0 warnings | 本ページ上部 |

### ⚠️ 残る論点 — 1 問だけです

> **NLM Terms の「republish / redistribute するなら最新版を維持するか、
> 使用データが最新でない可能性と使用 version を明示する」を、どう満たすか。**

これは**法的な不明点ではなく、運用の決めごと**です。私たちは v1.2 を hash で pin しており、
上流には v1.3 系の記述が既に存在します。取り得る形は 2 つ——

- **(ア)** 画面に使用 version を明示する（例：「HuBMAP HRA v1.2 を使用。より新しい版が
  存在する場合があります」）。pin を維持したまま条件を満たせます
- **(イ)** 最新版に追従する運用にする。pin の意味が薄れ、hash に結びついた公開判断を
  毎回取り直すことになります

**(ア) を推奨します**——このリポジトリは hash pin と公開判断の結合を設計の中心に据えており、
(イ) はそれを壊します。表示文は下の attribution 設計に入れてあります。

**最終的な法的判断は代筆しません。** 上の表は公式文書の読みであって、法務レビューではありません。

---

## adopt した場合に表示する attribution（実装済みのデータ）

`src/catalog/assetManifest.js` に入れる形の文面です。**repo の実際の provenance に一致させています。**

> **Heart, Male v1.2** and **Blood Vasculature, Male v1.2** from the HuBMAP CCF
> 3D Reference Object Library. Kristen Browne; Heidi Schlehlein. 2022.
> DOI [10.48539/HBM373.VSTV.568](https://doi.org/10.48539/HBM373.VSTV.568) and
> [10.48539/HBM686.LBDQ.998](https://doi.org/10.48539/HBM686.LBDQ.998).
> Licensed **CC BY 4.0**. Created using data from the **Visible Human Male**,
> courtesy of the **U.S. National Library of Medicine**.
> **Modified by Medical 3D Lab**: degenerate vertex normals recomputed and
> zero-area triangles removed; no geometry was reshaped.
> This build uses **HRA release v1.2**; a more recent release may exist.
> *The NLM does not endorse Medical 3D Lab or this product.*

- **NLM が推奨や後援をしていると読める文言は入れていません**——最後の 1 行で明示的に否定します
- **改変の表示**（normal repair・zero-area triangle 削除）を含みます
- **使用 version の明示**で NLM Terms の republish 条件（ア）を満たします


---

## 配信方式 — 既存の方針をそのまま使います

**新しいインフラは作りません。** このリポジトリには既に 2 段構えの方針があり、
心臓はまだ 1 段目にいるだけです。

| | 置き場所 | git | 用途 |
| --- | --- | --- | --- |
| **検討中の候補** | `dev-assets/`（`derived/` も） | **追跡しない** | 審査中。`npm run assets:dev` が取得、`npm run assets:repair` が派生を作る |
| **採用済みの公開 asset** | `public/assets/<organ>/` | **コミットする** | 配信対象。脳が既にこの形（`public/assets/brain/brain.glb`、4.6 MB） |

**採用が決まった時点で、派生 GLB 2 本を `public/assets/heart/` へコミットします**
（方式 A）。脳と同じ扱いで、新しい仕組みはゼロです。

| | |
| --- | --- |
| source provenance が追えるか | ✅ `assetManifest` の `sources[]` が元 2 ファイルの hash を持ち、`upstream/` に record の写しがある |
| derived hash が固定されるか | ✅ コミットしたバイト列そのもの。`output.sha256` がそれを pin する |
| clean clone から再現できるか | ✅ **clone した時点でファイルがある。** ネットワーク不要 |
| Netlify の build 環境で使えるか | ✅ `public/` は Vite がそのままコピーする。脳で実証済み |
| untracked な local file に依存しないか | ✅ 依存しません |
| 公開判断が exact hash を pin できるか | ✅ |

**方式 B（build 前に毎回 repair）を採らない理由**：build 環境にソース GLB を取得する必要が生じ、
**ネットワークが使えないと release できなく**なります。方式 C（object storage）は
新しいインフラで、脳が既に成立している以上、増やす理由がありません。

`npm run assets:repair` は**採用判断のための道具**として残ります——
「そのバイト列がこのソースから出ることの証明」であって、build の一部ではありません。

### 再現性は検証済み

```
$ npm run assets:repair:verify
  hubmap-vh-m-heart:             46d375e36d8181c1… — 0 errors, 0 warnings
  hubmap-vh-m-blood-vasculature: b971eec1fc0d0d6a… — 0 errors, 0 warnings
reproducible: same sources in, same derived hashes out, sources untouched, validator clean.
```

確認しているのは 4 点です——①ディスク上のソースが pin されたファイルと一致する
②**2 回走らせても同じ hash**（決定的）③**ソースが書き換わっていない**
④validator が 0 errors / 0 warnings。

**サイズについて記録**：派生 2 本で約 11.5 MB（脳は 4.6 MB）。大血管ファイルは 104 メッシュ中
37 しか使いませんが、**未使用部分の削除はさらなる改変**になるため、いまは行いません。
必要になれば別途判断してください。

---

## 残っている blocker（再分類）

### Technical — すべて解決

| | |
| --- | --- |
| deterministic repair | ✅ `npm run assets:repair:verify` が 2 回実行で同一 hash を確認 |
| validator | ✅ 派生 2 本とも **0 errors / 0 warnings** |
| geometry integrity | ✅ 頂点座標・頂点数が一致。三角形の減少は削除数と一致 |
| structure integrity | ✅ ノード名・階層・ontology id・マテリアルが一致。**選択可能な部位 46 件**で不変 |
| production asset delivery | ✅ 方式決定（`public/assets/heart/`）。**脳で実証済みの経路**で、clean clone・ネットワーク不要 |
| attribution resolver | ✅ 2 ファイルとも返し、候補であることを画面に出す |

### Asset / legal — すべて解決

| | |
| --- | --- |
| Heart, Male v1.2 provenance | ✅ 上流 record を個別に確認（DOI `HBM373.VSTV.568`） |
| Blood Vasculature, Male v1.2 provenance | ✅ 同（DOI `HBM686.LBDQ.998`）。**推定していません** |
| CC BY 4.0 | ✅ 2 record とも明記 |
| NLM terms | ✅ license 申請不要。attribution・非 endorsement・version 明示で対応 |

### Decision — 残り 3 件

- [ ] **derived asset adoption** — 面積ゼロ三角形 820 本の削除を改変として受け入れるか
- [ ] **anatomy review** — 解剖学者が形状・ラベル・日本語術語を見ていません
- [ ] **publication decision** — この release の公開判断記録

**技術と法務の blocker は 1 件も残っていません。**

### 運用上の 1 問（判断欄）

> **NLM Terms の republish 条件を、最新版追従ではなく「使用 version の明示」で満たす方式でよいか。**

**version pin 方式を推奨します。** 理由は 4 つ——①再現性（同じソースから同じバイト列）
②hash pin（公開判断が exact hash に結びつく）③公開判断との対応（上流が動いても判断が生き続ける）
④**上流の更新でシーンが勝手に変わらない**。

- [ ] version pin 方式でよい（推奨）
- [ ] 最新版に追従する
- [ ] 別案：

UI 側は、使用 version・出典・改変内容を表示できるデータを保持しています（上の attribution 文面）。
