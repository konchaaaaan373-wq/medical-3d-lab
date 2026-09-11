# β 候補 matrix

β 代表デモの候補の現状表です。**同じ情報を他の handoff へ写さないでください**——ここが 1 枚の現状です。
全 45 シーンのうち、代表 journey A〜F が通る 13 件を載せます。

値は実装から生成しています（`SCENE_MANIFEST.status` / `PATIENT_GUIDES` / `attributionForScene` /
`betaPublicationProblems`）。**production 公開は `brain-anatomy` の 1 件のみ**で、この表のどの行もそれを変えていません。

| scene | 解剖 | 病態 | 患者説明 | 実機確認 | 臨床レビュー | asset / license | production gate | blocker（gate の言い分） |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **心臓** 心臓の解剖 `heart-anatomy` | ✅ | — | — | 1280 / 844 | 未 | **候補（未採用）** | 閉 | 候補 asset 2 本が release gate 未通過；公開判断記録なし（承認） |
| 心不全 `heart-failure` | — | ✅ | ✅ | 1280 / 844 | 済 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| 心筋虚血 `myocardial-ischemia` | — | ✅ | ✅ | 1280 / 375 / 844 | 未 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| **脳** 脳の解剖 `brain-anatomy` | ✅ | — | — | 1280 / 375 / 844 | 未 | released | **公開中** | —（公開中） |
| アミロイドβ `amyloid-beta` | — | ✅ | ✅ | 1280 / 375 / 844 | 済 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| **肺** 肺の解剖 `lung-anatomy` | ✅ | — | — | 1280 / 375 / 844 | 未 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| COPD `copd` | — | ✅ | ✅ | 1280 / 375 / 844 | 済 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| 喘息 `asthma` | — | ✅ | ✅ | 1280 / 375 | 済 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| **肝・腎** 肝臓の解剖 `liver-anatomy` | ✅ | — | — | 1280 / 375 | 未 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| 門脈圧亢進症 `portal-hypertension` | — | ✅ | ✅ | 1280 / 375 | 済 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| 肝腎症候群 `hepatorenal-syndrome` | — | ✅ | ✅ | 1280 / 375 | 未 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| 腎臓の解剖 `kidney-anatomy` | ✅ | — | — | — | 未 | procedural | 閉 | β の対象外（anatomy-only ADR） |
| 腎濾過 `renal-filtration` | — | ✅ | ✅ | — | 未 | procedural | 閉 | β の対象外（anatomy-only ADR） |

- **患者説明** — contract 準拠のガイドがあるか。13 件すべて `tests/guide-contract.test.js` が測ります
- **実機確認** — その journey を実ブラウザで通した viewport。`—` は未実施であって、失敗ではありません
- **臨床レビュー** — `status` が `reviewed` / `production` か。**署名は代筆していません**
- **production gate** — `betaPublicationProblems()` の結果そのもの

## gate が閉じている理由は 2 種類しかありません

**ほとんどは「β の対象外」です。** 現行 β は解剖のみを公開する ADR
（`docs/architecture/adr-2026-09-08-anatomy-only-beta.md`）なので、病態シーンと、
`BETA_ANATOMY_CANDIDATES` に入っていない解剖シーンは**落ちているのではなく対象外**です。
これは実装の残件ではありません。

**実際に判断待ちなのは `heart-anatomy` の 1 件だけです**——候補 asset 2 本が asset release gate を
通っておらず、この release の公開判断記録がありません。どちらも承認であって実装ではありません。

## この表に出てこないもの

残り 32 シーン（prototype 14・alpha 18）は代表 journey に含めていません。preview では全部見えます
（`npm run dev` は無条件、build は `?preview=1`）。

## 各 agent へ返すもの

統合で見つかったもののうち、Claude① の担当外のものだけです。

**Work — 行き先が 2 つの surface から出ています。** 同じルートを、タイトルカードの
pairing（`TitleCard.js` + `entry.relatedScenes`）と、行き先パネル
（`RelatedScenesPanel` + `meta.related`）の両方が出しています。宣言が 2 本あるので、
片方だけを直すと画面が食い違います。

| | 件数 | scene |
| --- | --- | --- |
| 両方が宣言 | 3 | `lung-anatomy` `liver-anatomy` `kidney-anatomy` |
| pairing のみ | 9 | `copd` `portal-hypertension` `renal-filtration` `stomach-anatomy` ほか |
| パネルのみ | 1 | `brain-anatomy` |

**どちらを正本にするかは外枠 UI の判断**なので、Claude① では消していません。
パネル側は「別のモデルです」という一文と scale 種別（`transitionType` /
`scaleRelationship`）を運びます——pairing はルートだけです。統合するなら、
**その一文を落とさない側**を残してください。

**Work — F-81（`verify:ui` が横方向 clip を見ていない）は今回もう 1 件出しました。**
844×390 で `.related-scenes` が 2px に潰れ、32px の toggle が clip されて
console の下に描かれ、誰も押せませんでした（`flex: none` で解決）。
`npm test` も `verify:ui` も `verify:anatomy` も**前後どちらも緑**です。
再現条件と期待条件は [`b8-handoff.md`](b8-handoff.md) の Work セクションにあります。

**Claude② / Claude③ へ返す重大問題は、今回ありません。** geometry も solver も
guide data もそのまま動きました。`biliaryTree.js` は両 branch が書いていて
Claude② 版が superset だったのでそちらを採り、`buildBiliaryTree` の part id は
両消費者とも同じです。COPD / 喘息が指していた `breathing-lungs` の行は、
Claude③ 自身が「名前付き肺アトラスが来たら差し替える」と書いていたので
`lung-anatomy` に差し替えました。
