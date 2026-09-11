# 判断用パケット — `heart-anatomy` を β で公開するか

**承認欄は空のままにしてあります。** 代筆していません。
このページだけで可否を判断できるよう、gate が実際に見る項目と、いま分かっていることを並べてあります。

**先に `HEART-ASSET-ADOPTION.md` の判断が要ります。** asset を採用しない場合、
この判断は成立しません（公開判断は asset の hash に結びつくため）。

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
| **判断者（氏名）** | |
| **role** | `engineering` / `anatomy-expert` / `clinical` のいずれか（gate が検証します）<br>※ `clinical` はレビュー記録が無いと gate が拒否します |
| **日付**（YYYY-MM-DD） | |

- [ ] **approve** — 上記 scope で公開する
- [ ] **reject** — 理由：
- [ ] **hold** — 追加で要るもの：

### 判断のときに一緒に決めていただきたいこと

1. **解剖レビュー無しで公開してよいか。** 脳も同じ状態（`pending`）で公開しています——
   同じ基準を心臓にも当てるのか、心臓は別扱いにするのか
2. **validator の失敗をどう扱うか**（adoption packet の (a)/(b)/(c)）
3. **NLM の条件**を誰がいつ読むか。**repo の中に答えがありません**

---

承認後の適用手順は [`HEART-ADOPTION-APPLY.md`](HEART-ADOPTION-APPLY.md) にあります。
**仮の承認値を入れてテストを緑にすることはしていません**——
`betaPublicationProblems('heart-anatomy')` はいまも 3 件を返します。
