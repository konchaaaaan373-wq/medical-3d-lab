# Architecture rules

これは様式の好みではありません。どの規則も、**テストが全部通ったまま画面が
壊れていた**実際のバグから来ています。それぞれ「何が起きたか」を添えます。

これらは heart-failure だけの規則ではなく、3D-model-lab を他の臓器へ広げる
ための基盤です。新しい臓器モデルも同じ形で書いてください。

---

## Rule 1 — Semantic geometry

> Geometry consumers must reference anatomical meaning, not normalized path
> coordinates.

血管や管腔は 1 本の曲線で描かれます。そこに付くもの——geometry の膨らみ、
粒子の到達点、ラベルの anchor、カメラの注視点——が「曲線の 11% 地点」の
ように位置を指すと、その数字は**意味を持たない**まま生き残ります。

**起きたこと**: 大動脈に下行大動脈の制御点を足したところ、弧長が 10.6 →
24.9 に伸びました。`t` は弧長比なので、3 か所の利用側がすべて別の血管を
指すようになりました。

| 参照 | 意図 | 実際に指していた場所 |
|---|---|---|
| `t = 0.11` | Valsalva 洞 | 上行大動脈の中央 |
| `t ∈ [0.36, 0.99]` | 上行大動脈〜弓部 | 下行大動脈（心尖の 10 単位下、画面外） |
| `t = 0.42` | 上行大動脈 | 遠位弓部（うっ血ラベルの隣） |

エラーは出ず、129 件のテストは全部通りました。

**やること**: `geometry/segmentedPath.js` の `buildSegmentedPath()` で
名前付き segment から path を組み、landmark を宣言する。利用側は
`AORTA_LANDMARKS.ascendingAortaMid` のように**名前で**参照する。
弧長座標 (`pathT`) は形状から毎回計算される内部情報で、利用側の語彙ではない。

```js
// NG
curve.getPointAt(0.05)

// OK
AORTA_LANDMARKS.ascendingAortaMid.position
AORTA_SEGMENTS.arch.endT            // 描画側が曲線を sample するときだけ
```

### 例: 名前の無い 0.42 がまた書かれた（2026-09-29）

心拍出量の入門教材は、1 本の動脈（`lessonCirculation.js` の `ARTERY`）に
「送り出した血液」のタグの点を `ARTERY.getPointAt(0.42)` で、1 拍の血液の始点を
`0.03` で、心腔の血液が流れ出る範囲を `[0.02, 0.28]` で書いていました。上の表と
同じ `0.42` です。弓の頂点は 0.57 で、0.42 は「心臓の真ん中の上」——名前を付けようと
して初めて、それが頂点ではないと分かりました。コードレビューで見つかり、
テストはどれも赤くなっていません。

**やったこと**: 曲線のそばに `ON_ARTERY`（`root` / `outflow` / `overTheHeart` /
`end`）を置き、利用側は名前で引く。`tests/cardiac-output-lesson-scene.test.js` の
「the places named on the artery are where their names say」が、`root` は大動脈弁の
すぐ先、`overTheHeart` は心臓の中央の上、`end` は右の細い血管の入口にあることを
測ります（値を 0.72 や 0.2 にすると赤）。1 モジュールに閉じた短い曲線なので
`buildSegmentedPath()` までは使っていません。**名前が意味を持つのは、テストがその
意味を測っているときだけ**です。

**2026-10-01 追記**: 所有者のレビューで、入門教材は 3D の心臓をやめて循環回路の
模式図（SVG）になり、`lessonCirculation.js` とこのガードのテストは消えました。
図には曲線の座標がもう無く、部品は `lessonFigureGeometry.js` の名前付きの定数
（`PIPES`・`HEART`・`BED`・`DIAL`・`TUBE`）で、利用側（`LessonFigure.js`）はその名前で
引きます。`tests/cardiac-output-lesson-figure.test.js` の「one size, fixed places」が、
部品が帯の中にあり血圧計が細い血管と離れていることを測ります。

---

## Rule 2 — Local coordinates

> Substructure geometry is defined in local anatomical coordinates.

Valsalva 洞は**大動脈基部の**構造です。「大動脈全長の 2.8%」と書くと、
弓部を伸ばした瞬間に洞が上行大動脈へ移動します。「基部の 55%」と書けば、
弓部に何をしても洞は基部に留まります。

```js
// NG
const AORTA_SINUS_T = 0.028;              // 全長比

// OK
const SINUS_ROOT_U = 0.55;                // 基部ローカル
sinusOfValsalva: { segment: 'root', u: SINUS_ROOT_U }
```

---

## Rule 3 — Single state ownership

> Renderable properties must have one clear owner, and one explicit
> composition formula.

**起きたこと**: 大動脈の material は constructor で `opacity: 0.82` に
設定され、更新経路 `_applyOpacity()` が毎フレーム
`lerp(0.3, 0.44, emphasis)` で**上書き**していました。1 フレーム目で
0.82 は消え、大動脈はずっと 0.3 で描かれていました。エラーなし、テスト全通過。

**やること**: 最終値を決める関数を 1 つに。合成は「どれが最後に勝つか」
ではなく明示的な式で書く（`Vessels._resolveMaterials` と `VESSEL_OPACITY`）。
constructor の値は resolver が合成する **base** であって、出荷される値ではない。
所有者の一覧は `Vessels.js` の ownership matrix コメントを参照。

**差分量には特に注意**: 壁厚のように「2 つの大きな値の差」で決まる量は、
それぞれに別の係数を掛けると差では大きな相対誤差になります。内外面に
別々の正規化定数（小数第 3 位の違い）を掛けたところ、描画壁厚が 25% ずれました。
対になる面には同一の係数を、しかも**メッシュが対を作っているキー**で掛けてください
（インデックスで対を作っているなら高さではなくインデックスで）。

**2 例目（2026-09-17、脳の選択ラベル）**: 構造ごとに一度計算して保持する
候補点の配列から、`_visibleAnchorFor` が**配列の要素そのもの**を返し、
`getStructureAnnotation` がそれをラベルの `position` にし、`reanchor()` が
`point.copy(next)` で**その場で書き換えて**いました。ラベルを 1 回動かすと、
キャッシュの最上位候補が 2 番目の座標で上書きされ、以後その構造を選ぶたびに
劣化した候補から始まります。テストは全緑、監査で見つかりました。
**寿命の違うものを同じオブジェクトで持たない**——シーンの寿命を持つ
ジオメトリの性質（候補点）と、ラベル 1 つの寿命を持つ状態（いまの支点）は、
片方が動く前提なら `clone()` で切る。
`tests/brain-anatomy-selection-label.test.js` が reanchor 後のキャッシュを固定します。

**3 例目（2026-09-21、書き出しの pixel ratio）**: `EffectComposer` は
**pixel ratio の写しを自分で持ちます**——constructor で renderer から読んだきり、
`setPixelRatio()` を呼ばない限り動きません。動画書き出しは宣言どおりの画素数で
録るために `renderer.setPixelRatio(1)` してから `composer.setSize(1080, 1920)` を
呼んでいましたが、composer 側は写しを掛けるので、2× の画面では
**passes が 2160×3840 を描いていました**。絵は正しく見えます（最後の pass が
canvas に合わせて縮めるので）。壊れたのは**その隣で測っていた探針**で、
4 倍の画素を計時して「この機械は宣言サイズを保てない」と報告していました。
レビューで指摘され、実測ではなく読解で見つかっています。
**同じ量を 2 つのオブジェクトが持っているなら、片方だけに書くのは上書きと同じ**です。
`tests/viewer-performance.test.js` が、保持中は両方が 1 であること、
解放時は両方が**その時点の** frame budget の値に戻ること（録画中に tier が落ちても
古い比率を戻さないこと）を固定します。

**4 例目（2026-09-22、カメラの所有者）**: 帯（パネルが空けている領域）が
動いたときにカメラを撮り直す watcher が、**「読者がカメラを触ったか」を
最後に置いた場所からの距離で推定**していました。2 度実装して 2 度とも
失敗しています——厳密比較は `controls.update()` が damping で毎フレーム残す
**0.00125** を「触った」と読み、**計算した構図を毎回捨てます**（脳が 6.90 で
開き、落ち着いた配置は 6.06 を要求）。許容値を置くと今度は
**zoom の最初の数フレーム**——まだ直前の shot の 0.5% 以内——を
「触っていない」と読み、読者の zoom ごとカメラを吸着します（390x844 で 20px）。
**この量は両方の場合で小さく、分ける閾値はありません。**
いまは所有を**起きた場所で記録**します: `readerOwnsCamera` を
drag / pinch / wheel（controls の `start`）・zoom ボタンと +/- キー（`zoomBy`）・
「これへ」（`focusOnStructure`）が立て、`resetView()` だけが下ろします。
**状態の所有者は、状態から推定できません**——Rule 3 が「最終値を決める場所は
1 つ」と言うのと同じ理由で、**「いま誰のものか」も 1 か所が書き留める**もので、
値を眺めて当てるものではない。ガードは
`scripts/check-anatomy-interaction.mjs` の手順 0（開いた構図と reset 後の構図）と
zoom のアンカー 4 件で、**両方を同時に緑にしないと意味がありません**
——片方だけなら、上の 2 つの失敗はどちらもその片方を通っています。

---

### 例: 状態について言った文は、その状態の鍵を持つ（2026-09-28）

心拍出量のシーンは、読者が入力を変えると「収縮後に残る血液↑ 49→75 mL」のような
短い文をモデルのそばに出します。最初の版は、読者の操作とリセットのときにだけ
文を出し直し・消していました。レッスン・ステップ解説・リールからの復帰は操作欄を
通らずにモデルを動かすので、**文は古い条件の数値を言ったまま残りました**。

**やること**: 状態について何かを言う表示は、言ったときの状態の鍵
（`CardiacOutputScene.getModelStateKey`）を覚え、鍵が変わったら消えるか言い直す。
「誰が書いたら消す」を呼び出し側に数えさせない（L-133 と同じ形）。
`scripts/check-disease-interaction.mjs` が、操作欄を通らずにモデルを動かして
文が消えることを確かめます。

### 例: 1 フレームの中で 2 人が向きを書き、後に書いた方が勝っていた（2026-09-29）

入門教材の 2 つの循環は、`_faceCamera` が毎フレームカメラへ向け、`setArrangement`
（並べ方の切替）が位置と向きを初期化します。シェルは同じフレームの中で
`scene.update()`（向ける）→ `refit()`（→ `setArrangement`、向きを消す）の順に呼んで
いたので、**C が現れたフレームだけ、2 つとも向きを失ったまま描かれて**いました。
コマ送りの録画はそのフレームを残します。コードレビューで見つかりました。

同じレビューで、**1 つの事実を 2 か所が別々に言っていた**ことも見つかっています。
「1回に送り出す量↓」のタグは 1 回拍出量を 1 mL 単位で、その下の説明文は心拍出量を
0.1 L/分単位で比べて向きを決めていました。今の値では両方「減った」ですが、
1 mL 減って 3.5 L/分のまま、のような条件ではタグが「↓」、説明文が「ほとんど
変わらない」になります。

**やること**: 描画の最終値（ここでは向き）を書く場所は、1 フレームの中でも 1 か所に
なるようにする——`setArrangement` は置いたその場で向け、シェルは refit を update の
前に呼ぶ。画面上で同じ事実を言う文は、同じ比較を同じ精度で 1 回だけ行って派生させる
（タグも説明文も `outputDirection`）。ガードは
`tests/cardiac-output-lesson-scene.test.js` の「a new arrangement is drawn facing the
camera from its first frame」と、`tests/cardiac-output-lesson.test.js` の
「tags: … and as the caption says it」（1 mL 減・3.5 L/分の合成例）。どちらも
修正を戻すと赤。

**2026-10-01 追記**: 3D の教材は SVG の模式図になり（上の例を参照）、向きも
タグも無くなりました。残った規則は同じ形で守っています: 図の属性を書くのは
`LessonFigure.js` の `render` 1 か所、出力の向きは図の矢印も説明文も
`directionOf(…, 0.1)`（`outputDirection`）の 1 回の比較から。ガードは
`tests/cardiac-output-lesson.test.js` の「figure data: B alone carries A as cream
"start" marks, with the solved directions」（図の矢印の向き＝説明文の向き）。

## Rule 4 — Physiology vs presentation

> Physiological state must be separate from Story reveal / emphasis state.

Story は**見せ方**であって、生理状態ではありません。reveal が解剖の
サイズに触れてはいけません。

**起きたこと**: 左房圧 sheath は `congestionLevel × storyReveal` で
拡大し、左房本体は `congestionLevel` で拡大していました。reveal が 1 未満の
ビートでは sheath が本体より小さくなり、不透明・depth 書き込みの左房の
**内側に埋まって**見えなくなりました——それを説明するためのビートで。

**やること**: 入力を分けて持ち、どちらがどの出力に触れてよいかを
**関数の分割で**強制する。

```js
this.physiology  = { congestionLevel };  // サイズを変えてよいのはこちらだけ
this.presentation = { emphasis };        // opacity / visibility のみ

_resolveGeometry()   // physiology のみ
_resolveMaterials()  // physiology + presentation
```

---

## Rule 5 — Anatomical coordinate system

> Scene anatomical axes must be documented in code.

**起きたこと（2 件）**:

1. 「大きい方が右肺」のつもりで `side < 0` を大きい肺に割り当てていました。
   コメントは自分自身と一致し、2 ファイル離れた左房と矛盾していました。
2. より深刻な方。**心室と血管系が座標規約について食い違っていました。**
   心室は正しく組まれており（中隔と右室ローブが `-x`、自由壁が `+x`）、
   血管・弁・左房は鏡像でした。各構造は**隣接構造との関係だけは正しい**ので、
   近くで見るかぎり何も間違って見えません。誤りはフレーム全体としてしか
   現れず、心臓全体が鏡像になっていました。

**やること**: 軸を 1 か所に定義し、左右の判定をそこから引く
(`ANATOMICAL_AXES`, `anatomicalSide()`)。カメラから見てどちら側に見えるかまで
書く。そして**軸そのものが自己整合かをテストする**——上が `+y`・前が `+z` なら、
被験者の左は `+x` でなければなりません。シーンの各部（心室の中隔、左房）が
その軸に同意していることも併せてテストします。

**同じシーン内の他ファイルも確認すること**: この規則を心臓に適用した後、
全身表示の心臓ビルダーの大動脈弓だけが逆側へ弧を描いていました。臓器の配置
（肝臓が正中の右、胃が左）も、同じビルダー 3 行上の心尖偏位も +x を左としていて、
弓だけが矛盾していました。軸は 1 か所に書きますが、**従っているかの確認は
それを使うすべての場所で**必要です。

## Rule 6 — Visual regression

> Passing unit tests alone is not sufficient for 3D scene completion.

上の 4 件はすべて、テストが全部通った状態で出荷されました。数値テストは
「値が正しいか」を見ますが、**その値が正しい対象に付いているか**は見ません。

**やること**: Definition of Done に実レンダリングの確認を含める。
`artifacts/visual-qa/` に同一カメラの before / after を残す。最低限の
visual assertions:

- 大動脈が心筋より明るすぎない / 半透明の管に戻っていない
- Valsalva 洞が基部にある
- 大動脈ラベルが遠位弓部へ飛んでいない
- 駆出粒子が画面外へ消えない
- 左房 sheath が左房内部に埋まらない
- 右肺 > 左肺
- chapter ラベルが重ならない
- 日本語テキストが secondary style になっていない

さらに、DOM 順序に依存する CSS selector（`:first-child` / `:nth-child`）を
重要な UI に使わない。位置は JS の data から渡す（`data-anchor`）。
レスポンシブの非表示は「詳細度の勝負」にせず、ファイル末尾の
Responsive visibility policy ブロックに置く。

**そして、原因を推測しないこと。** 「なぜ CG に見えるのか」の実例と、
機械的な切り分けの手順は [`organ-3d-playbook.md`](organ-3d-playbook.md) に
まとめてあります。この規則群が生まれた不具合のうち 4 件は、もっともらしい仮説を
立てて修正しレンダリングする、を繰り返した末に、オブジェクトを 1 つずつ隠して
初めて正体が分かりました。

### 例: 2 つ目の shell は、1 つ目が負っていた義務を黙って落とす（2026-10-01）

入門教材は `App.js` を通らず、自分の shell（`LessonShell.js`）で画面を作ります。
`App.js` が全シーンにしていることのうち、教材の shell が**黙って落としていた**ものが、
コードレビュー（2026-10-01）で 3 つ見つかりました。どれもテストは緑でした。

- **免責の文**: シーンの `meta.disclaimerShort` は `App.js` のコンソールが画面に出す
  ので、教材も宣言していましたが、教材の shell はそれを描きません。「患者の反応を
  予測しない」は「このモデルについて」の中にしかなく、開かない読者は読みません。
  → 画面に常にある注意書き（`LESSON_NOTE`）に入れ、`lesson-drive` の `checkNote` が
  全場面で読む
- **レンダラーを先に作る順序**: `App.js` は `new Viewer(stage)` をシーンの種類を
  知る前に作っていたので、3D を何も描かない教材でも WebGL が要り、作れない端末では
  教材ではなくレンダラー失敗のページが出ていました。→ 種類（`meta.layout`）を先に決め、
  教材はレンダラーを作らない（`requestAnimationFrame` の時計だけ）。`lesson-drive` が
  WebGL を拒むページで教材が開くことを確かめる（`App.js` の順序を戻すと赤）
- **主張の点検を計算するだけ**: `LessonSession.problems` は solver の結果が教材の文を
  支えるかを毎回計算していましたが、誰も読んでいませんでした。→ 空でなければ
  シーンを作らない（`CardiacOutputLessonScene` の constructor。
  `tests/cardiac-output-lesson-figure.test.js` の「fail closed」）

**やること**: `App.js` 以外の道で画面を作るときは、`App.js` が全シーンにしている
こと（免責・失敗時の道・言語・「このモデルについて」）を数え、引き継がないものは
理由を書く。計算した点検は、読む場所まで作る。

### 例: シーンの上に置く DOM は、モデルの大きさを決めている（2026-09-30）

カメラの枠取り（`App.js` の `safeAreaInsets`）は、ヘッダー・タイトルカード・レール・
コンソールの**実際の矩形**を測って、モデルをその残りに収めます。だから
**タイトルカードに 1 行足すことは、モデルを小さくすることと同じです。**

BYOKI MOTION のリブランディングで、病態モデルのタイトルに「病態モデル / 循環」と
「心臓の解剖を確認」を足しました。デスクトップでは問題なく、スマホではタイトル
カードが 44 → 72〜88 px に伸び、XY パッドを使っている間の心室が下限を割りました
（`verify:disease`: 430×932 で 141 px、下限 150 px）。unit test は全部緑でした。
直し方は「スマホでは 1 行に戻す」——系統名は隠し、解剖へのリンクは
「このモデルについて」のシートの中へ——です。「このモデルについて」の本文も同じ理由で
**流れの外**（PC はパネル、スマホは下シート）に置いています。流れに入れると、
開いた瞬間に心臓が寄り直します。

**やること**: シーンの上の DOM（タイトルカード・レール・コンソール）に何かを足したら、
`npm run verify:disease`（病態）か `npm run verify:anatomy`（解剖）で**モデルの描画
サイズ**を測る。読む物は流れの外に置き、枠取りに数えさせない。

**もう 1 つの形——枠取りに数えられない DOM は、モデルを縮めずに覆う。**
タイトルカードは左上の角にあり、画面の中央を横切らないので、枠取りの帯としては
数えられません（`safeAreaInsets` の `band()`）。だから**それが伸びても、モデルは
避けてくれません。上に重なります。** 同じリブランディングで解剖シーンの
タイトルにも「解剖 / 脳」を足したところ、1280×800 でカードが 28 px 伸び
（下端 235 → 263）、脳の前上の角に乗りました。unit test も `verify:ui` も緑で、
捕まえたのは `verify:anatomy` の tour です——下前頭溝の点をクリックすると、
カードに当たって前の選択（上頭頂小葉）のままになり、「4 点で 3 構造」と報告しました。
解剖シーンのヘッダーは臓器の帯で現在地を言っているので、trail は病態モデルだけに
付けています（`modelLocation`、`tests/model-shell.test.js` が固定）。

**やること（追加）**: 描画サイズが変わらなくても安心しない。
`verify:anatomy` の tour（クリックが名前の付いた構造に届くか）が、
**覆われた**ことを言える検査です。

**3 つ目の形——`position: fixed` は、すべての箱から抜け出すわけではない。**
fixed の要素は `overflow` の切り抜きからは抜けますが、祖先に `mask-image`・`filter`・
`backdrop-filter`・`transform`・`contain` があると、**その祖先に閉じ込められるか、
切り抜かれます**。「このモデルについて」のスマホの下シートは、スクロールのフェードに
mask を持つ `.top-left` の中にあり、開いても 1 px も描かれていませんでした
（`docs/verification-lessons.md` L-158）。いまは fold が開いている間、列にフェードを
外させています（`is-reading-about`）。

**やること**: 画面に固定するもの（シート・パネル・トースト）をシーンの上の DOM の
**中に**作るなら、祖先のどれかが mask / filter / transform を持っていないか、
開いた状態で `elementFromPoint` で確かめる。「open になった」は「描かれた」ではありません。

**表示の持ち主は 1 つ（規則 3 の CSS 版）。** 埋め込んだ scope は、fold の開閉と
学習ビューの `display: none` の 2 か所から表示を決められ、後者が勝って空の fold を
出していました。fold の中の scope は fold が持つ、と規則で言い切っています
（`#ui[data-view] .title-about .model-scope.is-embedded`）。
