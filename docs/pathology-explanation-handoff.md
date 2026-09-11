# 病態説明の引き渡し — 何を提供していて、何を提供していないか

*2026-09-11。ブランチ `claude/pathology-expansion`。*

7 つの病態シーンが、同じ 1 つの契約の上で「臨床家向け」と「患者向け」の両方を
持つようになりました。この文書は **境界** のためにあります: UI を作る側
（Work）と、正常解剖を作る側（Claude②）が、ここから何を読めばよくて、何を
自分で決めなくてよいのか。

## 提供しているもの

| ほしいもの | どこから読むか |
| --- | --- |
| 患者向けの段階説明 | `PATIENT_GUIDES[sceneId]`（`src/data/patientGuides.js`） |
| 1 step の形 | `src/data/guideContract.js` — `guideProblems()` が全部の規則を持ちます |
| step がモデルを動かすときの規則 | `src/data/guideModelState.js` |
| カメラの寄り先（名前つき） | `scene.getGuideFramings()` |
| カメラを動かす | `app.guideView.apply(framingId \| null, { focus })` |
| モデルを動かす | `app.guideState.apply({ controls, compare })` |
| 状態を保存・復帰する | `app.guideState.capture()` / `.restore(state)` |
| 次に見るべきシーン | `app.related`（`{ scenes, note, noteJa }`、公開ゲート適用済み） |
| 3D が数値をどう描いているか | `scene.getVisualMapping()`（COPD・喘息） |
| その宣言の形 | `src/data/visualMapping.js` |
| レビュー状態 | `clinicalReviewForScene(sceneId)`（既存） |

## Work へ — 外枠は触っていません

`main.js`・ルーティング・ローディング・リトライ・ナビゲーション・Neco 導線は
1 行も変えていません。変えたのは `src/app/App.js` に 3 つ足しただけです:

- `app.guideView` — カメラとラベル。**モデルは動きません。**
- `app.guideState` — モデル制御と比較表示。**カメラは動きません。**
- `app.related` — 公開ゲートを通ったリンク一覧。

**この 2 つを分けてあるのが要点です。** step は「同じ状態の別の絵」にも
「別の状態の同じ絵」にもなれて、外から見てどちらなのか分かります。

患者モードの見た目で 1 つだけ CSS を持ち込みました（Claude① の branch から
そのまま）: `#ui.is-patient-guide .controls .button-row { display: none }`。
薄くして残すと、説明を受けている人の前に使えないボタンの壁が並びます。
**逃げ道はパネル自身の × と Escape で、どちらもパネル上にあります。**

**リンク一覧をどこかに書き写さないでください。** `app.related` が唯一の
供給元で、リリースが閉じているシーンは `App.js` が落とします。2 つ目のコピーは
「TO BE UPDATED」へのリンクになります。

## Claude② へ — 正常解剖の使い方

病態側から正常解剖を指しています。いまは `breathing-lungs` を指しています
（このビルドに存在する正常肺だから）が、**名前で指せる肺のアトラスが来たら、
差し替えるのは 1 ファイルの 1 行です** — `src/data/copd.js` と
`src/data/asthma.js` の `RELATED.scenes[].slug`。`App.js` がゲートを見て
自動で落とすので、公開前に足しても壊れません。

**病態のジオメトリと正常解剖は別物として扱っています。** リンクに必ず付く
注記が「いずれも別々のモデルであり、1 つの肺の段階ではありません。ここで
計算した値は持ち込まれず、向こうの値もここへは入りません」で、
`tests/pathology-guides.test.js` がこの注記の存在を確かめます。同じ患者の肺が
変形したようには見せない、という約束です。

**臓器ジオメトリ自体は変えていません。** COPD の 12 単位肺も喘息の 255 枝も
そのままです。触ったのはカメラの寄り先（`getGuideFramings`）と、その
シーンが自分の描画について宣言する文章（`getVisualMapping`）だけです。

## Claude① へ — 契約はそのまま使いました

`guideContract.js`・`guideSession.js`・`PatientGuidePanel.js`・`features.js`・
`ModelScopePanel.js`・`access.css` は branch `claude/heart-anatomy-b7` から
**そのまま**取りました（`git show` で写しただけで、1 文字も変えていません）。
`App.js` と `installAccess.js` は該当箇所だけ移植です。マージのとき、これらの
多くは同じ内容どうしで衝突しません。

`framing.js` の `fitPoseToSafeArea` / `orbitLimitsForSubject` は**持ってきて、
戻しました**。ここでは 1 度も走らないからです——効くのは
`scene.getSubjectBounds()` を持つシーンだけで、このブランチにはそれを持つ
シーンがありません。コンソールの帯の問題は、寄り先を実測して解きました
（下）。そちらが解剖シーンと一緒に持ってくるのが筋です。

**衝突する見込みがあるのは 3 か所です:**

1. `src/data/patientGuides.js` — そちらは heart / ischaemia / amyloid を、
   こちらは呼吸器・肝・腎を編集しています。**同じオブジェクトリテラルの
   別の場所**なので、たいてい自動でつきます。
2. `src/components/PatientGuidePanel.js` — こちらが 2 つ足しました:
   `setModelState` コールバックと、`reset({progress, controls})`。後者が
   振る舞いの変更です（下）。
3. `src/access/installAccess.js` — `stateSnapshot` と `movedByGuide` の扱い。

**`reset()` の振る舞いを 1 つ変えました。** そちらの規則は「モデルがいまいる
位置を説明している step で開く」で、位置は進行軸だけで決まっていました。
呼吸器では **同じ軸位置にいる 2 つの step が別々の肺について語る**（正常な肺と、
気道を狭くした同じ肺）ので、軸だけでは後に書いたほうが選ばれます。そこで
制御も渡すようにしました: 画面の肺を説明している step があればそれを開き、
なければその軸位置の最初の step を開いて、**モデルをその step が言う状態に
します**。心臓のシーンは制御を渡さないので、これまでどおり動きます。

## 検証 — 実ブラウザで歩かせています

```bash
VITE_ALLOW_PREVIEW=1 npm run build
npm i --no-save playwright        # 依存には入れていません
npm run verify:patient -- --preview --scene copd --shots shots/
```

各 step を実際に押し、宣言どおりに**カメラが動いたか / モデルが動いたか /
動かないはずのものが動いていないか**を測り、その step が指している構造が
ヘッダとコンソールのあいだの帯に入っているかをアンカーの射影で確かめます。

**この工程だけで 10 件の欠陥が出ました。** 横隔膜・換気単位・コンソリデーション
領域・側副血行路・輸入細動脈のラベルがコンソールやヘッダの裏にあり、
「腎臓を 2 つ見比べてください」と言いながら 1 つしか描いていませんでした。
`npm test` には原理的に見えないものです。CI 化は F-43。

## 公開していません

7 シーンとも患者モードは閉じています。`featuresForScene()` が
reviewed + 現行系統の医学レビュー完了を要求し、いまの状態は COPD・喘息が
`stale`、残り 5 つが `pending` です。preview ビルドでだけ
`authoredFeaturesForScene()` が開き、production バンドルには入りません。
**レビューゲートには触っていません。** 開ける条件は F-40 に書きました。
