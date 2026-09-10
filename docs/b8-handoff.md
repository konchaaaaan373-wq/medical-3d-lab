# B8 — 他 agent が取り込む接続点

**branch**: `claude/heart-anatomy-b7`（remote 共有済み）。
共有条件の記録は [`docs/share-conditions.md`](share-conditions.md)。

---

## Work へ — 3 つだけです

### 1. 浅い病態導線（データは用意済み、置き場所は Work）

**リンク情報を書き写さないでください。** 正本は `meta.modelScope.next` / `nextNote` で、
**公開ゲートで閉じたシーンは除外済みの配列**がアプリ API に出ています。

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

---

## Claude② へ — 再利用できる契約は 4 つ、実装例が正本です

**新しい仕様書は作りません。**下は全部、**心不全と心筋虚血の 2 病態で実際に動いているもの**です。
3 つ目の病態を足すときは、テストに 1 行足すだけで同じ約束を守らせられます
（`tests/guide-contract.test.js` の `GUIDES` 配列）。

| 契約 | 何を返す／宣言する | 実装例（正本） |
| --- | --- | --- |
| **guide step** | `stage`（シーンの stage id）／`progress`（**その stage の `at` と一致**）／任意の `frame`・`focus`／`educationalOnly`／3 拍の文章（`title`・`body`・`look` × 日英）。規則は `src/data/guideContract.js` にあり、`guideProblems(guide, { stages, framings })` が全部返します | `PATIENT_GUIDES['heart-failure']` と `['myocardial-ischemia']` |
| **guide framing** | `scene.getGuideFramings()` が `{ id: { target, distance, direction } }`。**カメラとラベルだけ**動きます——進行度も solver も触りません。App 側は `app.guideView.apply(id \| null, { focus })` | `HeartFailureScene`（肺側）／`MyocardialIschemiaScene`（壁） |
| **bounds / coverage** | `getSubjectBounds()` が `{ centre, corners, coverage? }`。省略時は共有既定 0.78。**縦長では被写体の形が先に効く**ので、横に広い臓器は縦長のとき上げる | `HeartAnatomyScene`、`HEART_SUBJECT_COVERAGE` / `_PORTRAIT` |
| **モード切替と状態** | 表示の切替は状態を変えません。構築時に `setProgress` を呼ばない／`reset({ progress })` でいまの位置から開く／閉じるときは `restoreGuideSession(snapshot, playback, { movedByGuide })` | `PatientGuidePanel.reset`、`installAccess.js`、`tests/guide-session.test.js` |

**行き先**は `meta.related = { scenes: [{ slug, label, labelJa, why, whyJa }], note, noteJa }` に
1 度だけ書きます。App が公開ゲートで絞って、scope パネルと `app.related` の両方へ同じものを渡します。
**別モデルであることを言う一文（`note`）は必須**です。

### 最小コード例

```js
// src/data/<disease>.js
export const RELATED = Object.freeze({
  scenes: [{ slug: 'lung-anatomy', label: '…', labelJa: '…', why: '**A different model**…', whyJa: '**別のモデル**…' }],
  note: '**These are separate models.** …', noteJa: '**それぞれ別のモデルです。** …',
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
