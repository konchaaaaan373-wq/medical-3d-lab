# 判断用パケット — `heart-anatomy` を β で公開するか

**承認欄は空のままにしてあります。** 代筆していません。
このページだけで可否を判断できるよう、gate が実際に見る項目と、いま分かっていることを並べてあります。

**先に `HEART-ASSET-ADOPTION.md` の判断が要ります。** asset を採用しない場合、
この判断は成立しません（公開判断は asset の hash に結びつくため）。

**技術面とライセンス面は解決しました。** 派生 GLB は validator 0 errors / 0 warnings、
2 ファイルの CC BY 4.0 provenance は上流 record で個別に確認済み、NLM の license 申請は不要です。
**このページに残るのは、解剖レビューと公開判断だけです。**

---

## 対象

| | |
| --- | --- |
| **scene** | `heart-anatomy`（`#/heart-anatomy`） |
| **scene revision** | `cardRevision: 19` / `modelDigest: e70530f01379d8e2` |
| **model sources** | `src/data/heartAnatomy.js`、`src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js` |
| **asset revision（心臓）** | `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70` |
| **asset revision（大血管）** | `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d` |

**この判断はこの 3 つの値に結びつきます。** どれかが動けば判断は stale になり、
gate が自動で閉じます（脳で実際にそうなりました）。

---

## 今回こちらで確認済みの技術範囲

- **14 の名前付き構造**が個別に選択でき、両言語で名前が出る（心房 2・心室 2・心室中隔・弁 4・乳頭筋 5）
- 大血管ファイルから**心臓の血管サブツリー 37 メッシュ**を表示。残る 67 は読み込むが表示せず、数を画面に出す
- **2 ファイルが同一座標系を共有していることを実測**（仮定ではない）
- 部位ツリー・検索・isolate / show-all・8 視点・2 配色モードが動作
- 代表 journey（解剖 → 心不全 → 患者説明 → 専門家 → 解剖）を **1280×720 と 844×390 の実ブラウザ**で通過
- attribution が HuBMAP の 2 ファイルを指し、**候補であることを画面に出す**（ライセンス名は名乗らない）

## 解剖レビュー状況

❌ **未実施。** `docs/clinical-reviews/registry.json` は `reviewStatus: "pending"`、
`reviewerRole: "no completed clinical sign-off recorded"`。
**解剖学者も臨床医も、この形状・ラベル・日本語術語を見ていません。**

## 臨床レビュー状況

❌ **未実施**（上と同じ記録）。

なお gate は「**臨床の役割を名乗る判断は、レビュー記録が無ければ通さない**」規則を持ちます
——判断が自分を sign-off に昇格させられないようにするためです。

## 既知の限界（レビュー記録に載っているもの）

※ 下の 5 と 7 は解決済みです（5：provenance 確認済み・7：派生ファイルで validator 通過）。
レビュー registry の文面は、adopt 後に更新します。

1. 解剖学者・臨床医のレビューが無い
2. **大血管が元ファイルに無い**ため、心臓の完全な肉眼解剖ではない（大血管は別ファイルで補っている）
3. 腔のメッシュは腔の空間を囲むもので、**心筋自由壁が無い**——壁厚・心内膜面・内部視点は提供も示唆もしない
4. 記録している容積は**1 体の固定標本の性質**であって、心腔容積でも EDV でも臨床計測値でもない
5. 元ファイルは**検討中の候補**。ライセンス（HuBMAP CC BY 4.0／NLM Visible Human 条件）は**記録済みで未履行**
6. 診断・治療選択・用量選択・予後・手技計画に使ってはならない
7. **glTF validator が両ファイルとも失敗**（縮退頂点法線 441 件、詳細は adoption packet）

## 公開 scope（このまま公開する場合に主張する範囲）

- **肉眼解剖の教育用モデル。** 名前で指せる 14 構造＋心臓血管 37 本
- **1 体の代表標本**であり、個人の心臓ではない
- **機構は無い**（拍動・血流・圧を一切主張しない。model profile の mechanism level は `none`）
- 現行 β は解剖層のみを公開する ADR に従う

---

## 判断欄（記入してください）

| | |
| --- | --- |
| **判断者（氏名）** | リポジトリ所有者の承認（2026-09-15、「推奨で進めてください」）。実装 Claude Opus 5 |
| **role** | `engineering` — ソフトウェアの挙動についての受け入れであって、解剖学的・臨床的判断ではありません |
| **日付**（YYYY-MM-DD） | 2026-09-15 |

- [x] **approve** — 上記 scope で公開する
- [ ] **reject** — 理由：
- [ ] **hold** — 追加で要るもの：

**公開するのは派生ファイル**（`46d375e3…` / `b971eec1…`）であって、上の
「未確認」欄 7 が指す元ファイルではありません。同欄 5 の「未履行」も
attribution を置くことで解消します。どちらも下の 3 問の答えに含まれます。

### 一緒に決めた 3 件（2026-09-15）

1. **解剖レビュー無しで公開してよいか** → **よい。脳と同じ基準を心臓にも当てます。**
   `anatomyExpertReview` は scene が `alpha` の間 `pending` で gate を通り、
   脳はいまその状態で公開されています。心臓だけ別扱いにする理由がありません。
   **これは「解剖学者が見た」という意味ではありません**——バッジは Prototype のまま、
   model card と scope panel が未レビューであることを述べ続けます。
   `production` へ上げる条件としては残ります。
2. **validator の失敗をどう扱うか** → **(a) 派生ファイルを作る。** 元ファイルのままでは
   `formatValidation` gate（errors 0 かつ warnings 0）に構造的に届きません。
   派生は 2 本とも 0/0 で、再現性は `assets:repair:verify` が確認しています。
3. **NLM の条件を誰がいつ読むか** → adoption packet の「NLM terms」節に記録しました。
   二次情報は「2019 年 7 月以降ライセンス契約は不要」で一致しますが、
   **この環境から一次情報には到達できません**（`nlm.nih.gov` は egress ブロック）。
   よって `license.assessment` は `engineering` のままとし、
   **謝辞義務は「無い」と結論せず、あるものとして果たします**。

---

承認後の適用手順は [`HEART-ADOPTION-APPLY.md`](HEART-ADOPTION-APPLY.md) にあります。
**仮の承認値を入れてテストを緑にすることはしていません**——
`betaPublicationProblems('heart-anatomy')` はいまも 3 件を返します。
