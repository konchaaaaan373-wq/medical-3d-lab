# B8 — 他 agent が取り込む接続点

**branch**: `claude/heart-anatomy-b7`（remote 共有済み）。
共有条件の記録は [`docs/share-conditions.md`](share-conditions.md)。

---

## Work へ — 4 つだけです

### 1. 浅い病態導線（データは用意済み、置き場所は Work）

**リンク情報を書き写さないでください。** 正本は `meta.related`（脳だけカタログ側の
エントリ、理由は F-79）で、**公開ゲートで閉じたシーンは除外済みの配列**が
アプリ API に出ています。

```js
const app = await createApp({ stage, ui, onRetryModel });
app.related.scenes;  // [{ slug, label, labelJa, why, whyJa }] — 開いているものだけ
app.related.note;    // 「どちらもこの心臓のその後ではありません」の一文（en）
app.related.noteJa;  // 同（ja）
```

- 空配列なら**入口を出さないでください**（宣言が無いか、ゲートが全部閉じています）
- リンク先は `#/<slug>`。ルーティングはハッシュ 1 本のままです
- **`note` は入口と一緒に出してください。** 別のモデルであって同一標本の変化ではない、
  という一文が主張の一部です。出典・限界の詳細は既存の scope パネルに残します
- 製品内の描画は [`RelatedScenesPanel`](../src/components/RelatedScenesPanel.js) が
  1 か所で持っています（scope パネルからは外しました）。**別の入口を作るなら、
  この 1 本を置き換える形にしてください**——2 か所から同じ行き先を描かないこと
- 判定を複製しないでください。`sceneOpen` を呼び直す必要はありません

### 2. 患者表示の外枠

scene 側は済んでいます（`.patient-guide` とその中身、`is-patient-guide` の CSS）。

- **患者表示中は `#ui.is-patient-guide .controls .button-row` を `display: none` にしました。**
  以前は opacity 0.28 で、説明される人の前に押せないボタンが並んでいました。
  出口はパネルの × と Escape です
- 新しいクラス：`.patient-guide-look`（「画面のどこを見るか」）、
  `.patient-guide-educational`（モデル出力ではない段の注記）。
  presentation モードでは前者が大きくなります（`patient-presentation.css`）
- **患者モードは preview build でのみ開きます。** production はこれまでどおり
  臨床レビュー必須です（下の「レビューゲート」）

### 3. loading veil の非 blocking 化（継続）

`src/main.js` は触っていません。ヴェールの除去が `observe()` / `reportSceneStart()` に
連動しているため、telemetry が遅い環境では読み込み済みモデルの上に
「building model」が残ります。**Work の課題として維持**します。

### 4. `verify:ui` が横方向の clip を見ていない（F-81）

**新しい UI 監査 framework は作っていません。** 再現条件と期待条件だけ渡します。
Claude① 側の実装は脳・心臓の scene state と共有 Viewer に留めます。

**再現**（修正前の版で。修正は `.model-scope` / `.related-scenes` の `max-width`）

| | |
| --- | --- |
| viewport | 1280×720 |
| route | `#/brain-anatomy` |
| clip している祖先 | `div.rail.is-anatomy.is-anatomy-docked`（`overflow: hidden`） |
| clip された要素 | `section.panel.anatomy-panel`（`width: min(340px, 46vw)`） |

```
rail   left 1048  right 1266  width  219
panel  left  926  right 1266  width  340   → 左へ 122px はみ出して切り落とし
input  left  927  right 1265                → 部位検索欄の先頭が rail の外
```

見えていたのは「モデルまたは一覧から部位を選択してください。」の先頭欠けと、
検索欄・部位ツリー全体の消失です。**原因は `.top-left` 側**で、1252px の
`.top-bar` のうち **1022px を確保したまま 236px しか描いて**いませんでした
（`min(236px, 100%)` は列の測定中は不定幅なので、列がパネルの max-content を要求する）。

**修正後**: `.top-left` 236 / rail 926..1266 (340) / panel 926..1266 / 切り落とし 0px。

**期待条件（Work 側で入れてほしい判定）**

> 操作可能な要素の bounding rect が、`overflow: hidden` を持つ**すべてのスクロール祖先**の
> rect の内側にあること。いまは縦方向（「スクロールの外に出た」）だけ見ていて、
> **横方向が抜けています**。

- 完了の定義: `.model-scope` / `.related-scenes` の `max-width: 236px` を revert すると、
  `npm run verify:ui` が `desktop-1280 · brain-anatomy` で落ちること
- いまは落ちません。**修正前後どちらも緑**でした（`verify:anatomy` も同じ——
  部位ツリーを DOM 経由で操作するので、画面外にあっても 271 件数えられます）

---

## Claude②／③ へ — 再利用できる契約は 6 つ、実装例が正本です

**新しい仕様書は作りません。**下は全部、**心不全・心筋虚血・アミロイドβの 3 病態で
実際に動いているもの**です。4 つ目の病態を足すときは、テストに 1 行足すだけで
同じ約束を守らせられます（`tests/guide-contract.test.js` の `GUIDES` 配列）。

**`guideContract.js` はここで固定です。** 4 つ目の病態が実際に要求するまで広げません。
framework・DSL・state machine へは発展させないでください——いま必要なのは、
この 3 つと同じ形をもう一度書けることであって、書き方を抽象化することではありません。

| 契約 | 何を返す／宣言する | 実装例（正本） |
| --- | --- | --- |
| **guide step** | `stage`（シーンの stage id）／`progress`（**その stage の `at` と一致**）／任意の `frame`・`focus`／`educationalOnly`／3 拍の文章（`title`・`body`・`look` × 日英）。規則は `src/data/guideContract.js` にあり、`guideProblems(guide, { stages, framings })` が全部返します | `PATIENT_GUIDES['heart-failure']` と `['myocardial-ischemia']` |
| **guide framing** | `scene.getGuideFramings()` が `{ id: { target, distance, direction } }`。**カメラとラベルだけ**動きます——進行度も solver も触りません。App 側は `app.guideView.apply(id \| null, { focus })` | `HeartFailureScene`（肺側）／`MyocardialIschemiaScene`（壁） |
| **bounds / coverage** | `getSubjectBounds()` が `{ centre, corners, coverage? }`。省略時は共有既定 0.78。**縦長では被写体の形が先に効く**ので、横に広い臓器は縦長のとき上げる | `HeartAnatomyScene`、`HEART_SUBJECT_COVERAGE` / `_PORTRAIT` |
| **モード切替と状態** | 表示の切替は状態を変えません。構築時に `setProgress` を呼ばない／`reset({ progress })` でいまの位置から開く／閉じるときは `restoreGuideSession(snapshot, playback, { movedByGuide })`。`movedByGuide` が「読者が動かしたのか、ガイドが動かしたのか」を分けます | `PatientGuidePanel.reset`、`installAccess.js`、`tests/guide-session.test.js` |
| **certainty**（分かっている度合い） | `established` / `associated` / `hypothesised` / `uncertain`。**1 段でも印を落とすとテストが落ちます**——印の無い段は、印のある段のなかで最も安全なものとして読まれるためです。確定した因果が無い主題でだけ使い、あるなら付けません | `PATIENT_GUIDES['amyloid-beta']`、`guideContract.js` の `GUIDE_CERTAINTY` |
| **別スケールへの行き先** | `related.scenes[]` に `transitionType: 'scale-change'` と `scaleRelationship: 'magnified-detail' \| 'schematic'`。**kidney → nephron と lung → alveolus は `magnified-detail`**（その臓器の実在する一部の拡大）、脳 → Aβ は `schematic`（解剖学的縮尺を持たない模式図）。宣言しないと同一スケール扱いです | `src/data/relatedContract.js`、`relatedProblems()` |

**行き先**は `meta.related = { scenes: [{ slug, label, labelJa, why, whyJa, transitionType?, scaleRelationship? }], note, noteJa }` に
1 度だけ書きます。App が公開ゲートで絞って、`RelatedScenesPanel` と `app.related` の
両方へ同じものを渡します。**別モデルであることを言う一文（`note`）は必須**です。

**公開中のシーンでは、宣言先に気をつけてください。** `src/data/brainAnatomy.js` のような
**pinned model source** に 1 行足すとカードの revision が上がり、asset の hash に
結び付いた公開判断記録が stale になって、そのシーンが**非公開に戻ります**。
その場合は `src/catalog/scenes.js` のエントリ側に置いてください（脳がそれです）。

### 最小コード例

```js
// src/data/<disease>.js
export const RELATED = Object.freeze({
  scenes: [{ slug: 'lung-anatomy', label: '…', labelJa: '…', why: '**A different model**…', whyJa: '**別のモデル**…' }],
  note: '**These are separate models.** …', noteJa: '**それぞれ別のモデルです。** …',
});

// 別スケールへ渡すときだけ、2 つ足します。肺 → 肺胞は「実在する一部の拡大」:
export const ALVEOLUS_RELATED = Object.freeze({
  scenes: [{
    slug: 'alveolus', transitionType: 'scale-change', scaleRelationship: 'magnified-detail',
    label: '…', labelJa: '…', why: '…', whyJa: '…',
  }],
  note: '…', noteJa: '…',
});

// scene meta
static meta = { …, stages: STAGES, related: RELATED };
getGuideFramings() { return { airway: { target, distance, direction } }; }

// src/data/patientGuides.js
'copd-hyperinflation': Object.freeze({ title, titleJa, steps: Object.freeze([
  { progress: 0, stage: 'baseline', focus: ['airway'],
    title, titleJa, body, bodyJa, look, lookJa },
  { progress: 0.6, stage: 'trapping', frame: 'airway', focus: ['alveoli'], … },
  { progress: 0.6, stage: 'trapping', educationalOnly: true, … },  // 症状など
])}),

// tests/guide-contract.test.js の GUIDES に 1 行
{ id: 'copd-hyperinflation', stages: COPD_STAGES, framings: Object.keys(new CopdScene({}).getGuideFramings()) },
```

### physiology output と表示は分けてください

将来 COPD／喘息で validated な生理出力（Pulse など）を使う場合も、

**physiology output（solver が出した量） → educational visual mapping（見せ方への写像） → 3D presentation**

の 3 段を混ぜないでください。心不全のうっ血オーバーレイがその形です——
`meanPulmonaryVenousPressure` は解、そこから「にじみ」への写像は
`congestion-rendering-map` として**表示上の写像であり測定ではない**と台帳に書いてあります。
**Claude① 側で Pulse を統合する必要はありません。**

この 3 段は、患者表示と専門家表示の分かれ目でもあります。**同じ 1 段目**（solver の解）から
両方が出ます——患者側は数と操作を減らした presentation であって、別の近似ではありません。
モデルが計算していないもの（症状など）を出す段は `educationalOnly` を立て、
**「このモデルが胸痛を計算した」と読めない**ようにします。

### 外部 asset に載るシーンを作るなら

クレジットは書き写さないでください。`modelProfiles.js` の `assets` /
`candidateAssets` と `assetManifest.js` / `devAssets.js` が正本で、
`attributionForScene(sceneId)`（`src/catalog/attribution.js`）がそれを解いて返します。
選択カードの脚注はそれを描くだけです。

- **候補 asset は `released: false`** で返り、ライセンス名を名乗りません——
  記録は読んでいても、release gate は何も評価していないからです
- `record` は**リポジトリ上のパス**、`recordUrl` が**配信 URL**です。`public/` は
  ルートで配信されるので、記録パスをそのまま href にすると 404 になります

---

## レビューゲートについて（読んでから触ってください）

患者・教育モードは **2 重**に閉じています。`access.patient === true` の宣言と、
**現行系統の臨床レビュー**（`docs/clinical-reviews/registry.json` が `reviewed`）。
**いま `reviewed` のシーンは 1 つもありません。**

- カタログのカード・バッジ・用途フィルタは引き続き `featuresForScene`（レビュー必須）
- `authoredFeaturesForScene` は**レビュー要件だけを外した同じ宣言**で、
  **`installAccess` が `betaUnlocked()` のときだけ**尋ねます。production には capability がありません
- **これは抜け道ではありません。** preview build でも署名済み session と
  entitlement を返すサーバの両方が必要です
