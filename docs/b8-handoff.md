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

## Claude② へ — 再利用できる契約は 3 つ、実装例が正本です

新しい仕様書は作りません。下の 3 つは臓器に依存しません。

| 契約 | 何を返す／宣言する | 実装例（正本） |
| --- | --- | --- |
| **bounds / coverage** | `getSubjectBounds()` が `{ centre, corners, coverage? }`。`coverage` は「パネルが空けた帯のうち被写体が占める割合」。省略時は共有既定 0.78。**縦長では被写体の形が先に効く**ので、横に広い臓器は縦長のとき上げる | `HeartAnatomyScene.getSubjectBounds()`、`HEART_SUBJECT_COVERAGE` / `_PORTRAIT` |
| **stage 対応** | 患者ガイドの各ステップが `stage`（シーンの stage id）を名乗り、`progress` は**その stage の `at` と一致**。1 ステップ 3 拍（どこが変わる／何が起こる／画面のどこを見る）。モデルが出さない段は `educationalOnly: true` を付け、画面に注記が出ます | `PATIENT_GUIDES['heart-failure']`、`tests/patient-guide-pairing.test.js` |
| **モード切替と状態** | 表示の切替は状態を変えません。パネルの構築で `setProgress` を呼ばない、`reset({ progress })` でいまの位置から開く、閉じるときは `restoreGuideSession(snapshot, playback, { movedByGuide })` | `PatientGuidePanel.reset`、`installAccess.js`、`tests/guide-session.test.js` |

**病態への行き先**を足すときは `modelScope.next` / `nextNote` に書けば、
scope パネルにも `app.related` にも同時に出ます（閉じたシーンは自動で落ちます）。

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
