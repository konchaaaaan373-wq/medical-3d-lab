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

---

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
